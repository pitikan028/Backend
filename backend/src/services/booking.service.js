import dayjs from 'dayjs';
import { db, insertReturning, isPostgres } from '../db/knex.js';
import config from '../config/index.js';
import ApiError from '../utils/ApiError.js';
import { generateBookingRef, toDateString, toNumber } from '../utils/helpers.js';

// การจองที่ยังไม่ถูกยกเลิก = นับเป็นที่นั่งที่ถูกใช้ไปแล้ว
const ACTIVE_STATUSES = ['pending', 'confirmed', 'completed'];

export function serializeBooking(row) {
  if (!row) return null;
  const { activity_name, activity_name_th, activity_slug, ...booking } = row;
  return {
    ...booking,
    booking_date: toDateString(row.booking_date),
    unit_adult_price: toNumber(row.unit_adult_price),
    unit_child_price: toNumber(row.unit_child_price),
    unit_infant_price: toNumber(row.unit_infant_price),
    total_amount: toNumber(row.total_amount),
    ...(activity_slug
      ? {
          activity: {
            id: row.activity_id,
            slug: activity_slug,
            name: activity_name,
            name_th: activity_name_th,
          },
        }
      : {}),
  };
}

/** คำนวณยอดรวมจากราคาในฐานข้อมูล — ไม่ใช้ราคาที่ client ส่งมา */
export function calculateTotal(activity, { adults, children, infants }) {
  const total =
    adults * Number(activity.adult_price) +
    children * Number(activity.child_price) +
    infants * Number(activity.infant_price);
  // ปัดเป็นทศนิยม 2 ตำแหน่ง กันปัญหา floating point
  return Math.round(total * 100) / 100;
}

/** ตรวจว่าวันที่จองอยู่ในช่วงที่รับจอง (ล่วงหน้าอย่างน้อย N วัน และไม่ไกลเกินกำหนด) */
export function assertBookableDate(bookingDate) {
  const date = dayjs(bookingDate, 'YYYY-MM-DD', true);
  if (!date.isValid()) throw ApiError.badRequest('วันที่จองไม่ถูกต้อง');

  const today = dayjs().startOf('day');
  const earliest = today.add(config.booking.minLeadDays, 'day');
  const latest = today.add(config.booking.maxAdvanceDays, 'day');

  if (date.isBefore(earliest)) {
    throw ApiError.badRequest(
      `ต้องจองล่วงหน้าอย่างน้อย ${config.booking.minLeadDays} วัน (จองได้ตั้งแต่ ${earliest.format('YYYY-MM-DD')} เป็นต้นไป)`,
    );
  }
  if (date.isAfter(latest)) {
    throw ApiError.badRequest(`จองล่วงหน้าได้ไม่เกิน ${config.booking.maxAdvanceDays} วัน`);
  }
}

/**
 * นับที่นั่งที่ถูกจองไปแล้วของกิจกรรมในวันนั้น
 * ทารกไม่นับเข้าโควตา เพราะไม่ได้ใช้ที่นั่งแยก
 */
async function countBookedSeats(activityId, bookingDate, trx = db) {
  const [row] = await trx('bookings')
    .where({ activity_id: activityId, booking_date: bookingDate })
    .whereIn('status', ACTIVE_STATUSES)
    .sum({ booked: trx.raw('adults + children') });

  return Number(row?.booked ?? 0);
}

export async function getAvailability(activity, bookingDate) {
  const booked = await countBookedSeats(activity.id, bookingDate);
  const capacity = Number(activity.daily_capacity);
  const remaining = Math.max(0, capacity - booked);

  return {
    activity_slug: activity.slug,
    date: bookingDate,
    capacity,
    booked,
    remaining,
    is_available: remaining > 0,
  };
}

/**
 * สร้างการจองใหม่
 *
 * ทำทั้งหมดใน transaction เดียว และ "ล็อกแถวกิจกรรม" ก่อนนับที่นั่ง
 * เพื่อกันกรณีมีคนกดจองพร้อมกันแล้วทั้งคู่ผ่านการเช็คที่ว่างจนเกินโควตา
 */
export async function createBooking(input) {
  assertBookableDate(input.booking_date);

  return db.transaction(async (trx) => {
    const activityQuery = trx('activities').where('is_active', true);
    if (input.activity_id) activityQuery.andWhere({ id: input.activity_id });
    else activityQuery.andWhere({ slug: input.activity_slug });

    // MySQL และ PostgreSQL รองรับ SELECT ... FOR UPDATE เหมือนกัน
    const activity = await activityQuery.forUpdate().first();
    if (!activity) throw ApiError.notFound('ไม่พบกิจกรรมที่เลือก หรือกิจกรรมนี้ปิดรับจองอยู่');

    const seats = input.adults + input.children;
    const booked = await countBookedSeats(activity.id, input.booking_date, trx);
    const remaining = Number(activity.daily_capacity) - booked;

    if (seats > remaining) {
      throw ApiError.conflict(
        remaining > 0
          ? `วันที่ ${input.booking_date} เหลือที่ว่างเพียง ${remaining} ที่ แต่คุณจอง ${seats} ที่`
          : `วันที่ ${input.booking_date} เต็มแล้ว กรุณาเลือกวันอื่น`,
        { remaining, requested: seats },
      );
    }

    const total = calculateTotal(activity, input);

    const payload = {
      booking_ref: generateBookingRef(),
      activity_id: activity.id,
      booking_date: input.booking_date,
      adults: input.adults,
      children: input.children,
      infants: input.infants,
      unit_adult_price: activity.adult_price,
      unit_child_price: activity.child_price,
      unit_infant_price: activity.infant_price,
      total_amount: total,
      currency: 'THB',
      first_name: input.first_name,
      last_name: input.last_name,
      phone: input.phone,
      email: input.email.toLowerCase(),
      contact_app: input.contact_app,
      note: input.note ?? null,
      pickup_type: input.pickup_type,
      pickup_detail: input.pickup_detail ?? null,
      status: 'pending',
      payment_status: 'unpaid',
    };

    // โอกาสชน booking_ref ต่ำมาก (32^6) แต่ถ้าชนจริงให้สุ่มใหม่แทนที่จะโยน error ใส่ลูกค้า
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        const created = await insertReturning(trx, 'bookings', payload);
        return serializeBooking({
          ...created,
          activity_slug: activity.slug,
          activity_name: activity.name,
          activity_name_th: activity.name_th,
        });
      } catch (error) {
        const isDuplicateRef = error.code === '23505' || error.code === 'ER_DUP_ENTRY';
        if (!isDuplicateRef || attempt === 4) throw error;
        payload.booking_ref = generateBookingRef();
      }
    }

    throw new Error('สร้างรหัสการจองไม่สำเร็จ');
  });
}

const withActivity = (query) =>
  query
    .join('activities', 'activities.id', 'bookings.activity_id')
    .select(
      'bookings.*',
      'activities.slug as activity_slug',
      'activities.name as activity_name',
      'activities.name_th as activity_name_th',
    );

/**
 * ลูกค้าค้นหาการจองของตัวเอง — ต้องรู้ทั้งรหัสการจองและอีเมลที่ใช้จอง
 * เพื่อไม่ให้เดารหัสแล้วเห็นข้อมูลส่วนตัวของคนอื่นได้
 */
export async function findBookingByRef(ref, email) {
  const row = await withActivity(db('bookings'))
    .whereRaw(`${isPostgres ? 'upper(bookings.booking_ref)' : 'upper(bookings.booking_ref)'} = ?`, [
      ref.toUpperCase(),
    ])
    .andWhere('bookings.email', email.toLowerCase())
    .first();

  if (!row) throw ApiError.notFound('ไม่พบการจองที่ตรงกับรหัสและอีเมลนี้');
  return serializeBooking(row);
}

export async function listBookings(filters) {
  const { page, limit, status, payment_status, activity_id, date_from, date_to, q } = filters;

  const applyFilters = (query) => {
    if (status) query.where('bookings.status', status);
    if (payment_status) query.where('bookings.payment_status', payment_status);
    if (activity_id) query.where('bookings.activity_id', activity_id);
    if (date_from) query.where('bookings.booking_date', '>=', date_from);
    if (date_to) query.where('bookings.booking_date', '<=', date_to);
    if (q) {
      const like = `%${q.toLowerCase()}%`;
      query.where((builder) => {
        builder
          .whereRaw('lower(bookings.booking_ref) like ?', [like])
          .orWhereRaw('lower(bookings.email) like ?', [like])
          .orWhereRaw('lower(bookings.first_name) like ?', [like])
          .orWhereRaw('lower(bookings.last_name) like ?', [like])
          .orWhereRaw('lower(bookings.phone) like ?', [like]);
      });
    }
    return query;
  };

  const [{ count }] = await applyFilters(db('bookings')).count({ count: '*' });
  const total = Number(count);

  const rows = await applyFilters(withActivity(db('bookings')))
    .orderBy('bookings.created_at', 'desc')
    .limit(limit)
    .offset((page - 1) * limit);

  return {
    data: rows.map(serializeBooking),
    meta: { page, limit, total, total_pages: Math.max(1, Math.ceil(total / limit)) },
  };
}

export async function getBookingById(id) {
  const row = await withActivity(db('bookings')).where('bookings.id', id).first();
  if (!row) throw ApiError.notFound(`ไม่พบการจอง id ${id}`);
  return serializeBooking(row);
}

const ALLOWED_TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

export async function updateBookingStatus(id, changes) {
  const current = await getBookingById(id);
  const update = { updated_at: db.fn.now() };

  if (changes.status && changes.status !== current.status) {
    const allowed = ALLOWED_TRANSITIONS[current.status] ?? [];
    if (!allowed.includes(changes.status)) {
      throw ApiError.conflict(
        `เปลี่ยนสถานะจาก "${current.status}" เป็น "${changes.status}" ไม่ได้` +
          (allowed.length ? ` (เปลี่ยนได้เป็น: ${allowed.join(', ')})` : ' เพราะเป็นสถานะสุดท้ายแล้ว'),
      );
    }
    update.status = changes.status;
    if (changes.status === 'cancelled') update.cancelled_at = db.fn.now();
  }

  if (changes.payment_status) update.payment_status = changes.payment_status;
  if (changes.payment_ref !== undefined) update.payment_ref = changes.payment_ref;

  await db('bookings').where({ id }).update(update);
  return getBookingById(id);
}

/** ตัวเลขสรุปสำหรับหน้า dashboard ของแอดมิน */
export async function getStats() {
  const today = dayjs().format('YYYY-MM-DD');

  const [statusRows, revenueRow, todayRow, upcomingRow, inquiryRow, reviewRow] = await Promise.all([
    db('bookings').select('status').count({ count: '*' }).groupBy('status'),
    db('bookings').whereIn('status', ['confirmed', 'completed']).sum({ revenue: 'total_amount' }),
    db('bookings').where({ booking_date: today }).whereIn('status', ACTIVE_STATUSES).count({ count: '*' }),
    db('bookings').where('booking_date', '>', today).whereIn('status', ACTIVE_STATUSES).count({ count: '*' }),
    db('inquiries').where({ status: 'new' }).count({ count: '*' }),
    db('reviews').where({ is_published: false }).count({ count: '*' }),
  ]);

  const byStatus = Object.fromEntries(statusRows.map((row) => [row.status, Number(row.count)]));

  return {
    bookings: {
      total: Object.values(byStatus).reduce((sum, value) => sum + value, 0),
      by_status: {
        pending: byStatus.pending ?? 0,
        confirmed: byStatus.confirmed ?? 0,
        completed: byStatus.completed ?? 0,
        cancelled: byStatus.cancelled ?? 0,
      },
      today: Number(todayRow[0]?.count ?? 0),
      upcoming: Number(upcomingRow[0]?.count ?? 0),
    },
    revenue_thb: toNumber(revenueRow[0]?.revenue ?? 0) || 0,
    pending_inquiries: Number(inquiryRow[0]?.count ?? 0),
    unpublished_reviews: Number(reviewRow[0]?.count ?? 0),
  };
}
