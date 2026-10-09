import dayjs from 'dayjs';
import { db, insertReturning } from '../db/knex.js';
import config from '../config/index.js';
import ApiError from '../utils/ApiError.js';
import { generateBookingRef, groupPrice, parsePriceTiers, toBoolean, toDateString, toNumber } from '../utils/helpers.js';
import { getBookingRules } from './settings.service.js';

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
  // กิจกรรมราคาเหมาต่อกลุ่ม (เช่น ล่องแพ): คิดตามจำนวนผู้ใหญ่ + เด็ก ทารกไม่นับ
  const tiers = parsePriceTiers(activity.group_pricing);
  if (tiers.length) return Math.round(groupPrice(tiers, adults + children) * 100) / 100;

  const total =
    adults * Number(activity.adult_price) +
    children * Number(activity.child_price) +
    infants * Number(activity.infant_price);
  // ปัดเป็นทศนิยม 2 ตำแหน่ง กันปัญหา floating point
  return Math.round(total * 100) / 100;
}

/** ตรวจว่าวันที่จองอยู่ในช่วงที่รับจอง (ล่วงหน้าอย่างน้อย N วัน และไม่ไกลเกินกำหนด) */
export function assertBookableDate(bookingDate, rules = config.booking) {
  const date = dayjs(bookingDate, 'YYYY-MM-DD', true);
  if (!date.isValid()) throw ApiError.badRequest('วันที่จองไม่ถูกต้อง');

  const today = dayjs().startOf('day');
  const earliest = today.add(rules.minLeadDays, 'day');
  const latest = today.add(rules.maxAdvanceDays, 'day');

  if (date.isBefore(earliest)) {
    throw ApiError.badRequest(
      `ต้องจองล่วงหน้าอย่างน้อย ${rules.minLeadDays} วัน (จองได้ตั้งแต่ ${earliest.format('YYYY-MM-DD')} เป็นต้นไป)`,
    );
  }
  if (date.isAfter(latest)) {
    throw ApiError.badRequest(`จองล่วงหน้าได้ไม่เกิน ${rules.maxAdvanceDays} วัน`);
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
export async function createBooking(input, customer = null) {
  // กติกามาจากหน้าตั้งค่าระบบของแอดมิน (ถ้าไม่เคยตั้งจะใช้ค่าจาก .env)
  const rules = await getBookingRules();
  assertBookableDate(input.booking_date, rules);

  if (input.adults + input.children + input.infants > rules.maxGuests) {
    throw ApiError.unprocessable(
      `จองได้สูงสุด ${rules.maxGuests} คนต่อหนึ่งรายการ หากมากกว่านี้กรุณาติดต่อเจ้าหน้าที่`,
      [{ field: 'adults', message: `จองได้สูงสุด ${rules.maxGuests} คนต่อหนึ่งรายการ` }],
    );
  }

  return db.transaction(async (trx) => {
    const activityQuery = trx('activities').where('is_active', true);
    if (input.activity_id) activityQuery.andWhere({ id: input.activity_id });
    else activityQuery.andWhere({ slug: input.activity_slug });

    // MySQL และ PostgreSQL รองรับ SELECT ... FOR UPDATE เหมือนกัน
    const activity = await activityQuery.forUpdate().first();
    if (!activity) throw ApiError.notFound('ไม่พบกิจกรรมที่เลือก หรือกิจกรรมนี้ปิดรับจองอยู่');

    if (toBoolean(activity.adults_only) && input.children + input.infants > 0) {
      throw ApiError.unprocessable('กิจกรรมนี้รับเฉพาะผู้ใหญ่ ไม่สามารถจองสำหรับเด็กหรือทารกได้', [
        { field: 'children', message: 'กิจกรรมนี้รับเฉพาะผู้ใหญ่' },
      ]);
    }

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
      user_id: customer?.id ?? null,
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
      contact_id: input.contact_id ?? null,
      note: input.note ?? null,
      pickup_type: input.pickup_type,
      pickup_detail: input.pickup_detail ?? null,
      pickup_round: input.pickup_round ?? 'morning',
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
    .whereRaw('upper(bookings.booking_ref) = ?', [ref.toUpperCase()])
    .andWhere('bookings.email', email.toLowerCase())
    .first();

  if (!row) throw ApiError.notFound('ไม่พบการจองที่ตรงกับรหัสและอีเมลนี้');
  return serializeBooking(row);
}

/** การจองของสมาชิกที่ล็อกอินอยู่ — ค้นด้วยรหัสการจองแต่ต้องเป็นของบัญชีนั้นเท่านั้น */
export async function findBookingForUser(ref, userId) {
  const row = await withActivity(db('bookings'))
    .whereRaw('upper(bookings.booking_ref) = ?', [ref.toUpperCase()])
    .andWhere('bookings.user_id', userId)
    .first();

  if (!row) throw ApiError.notFound('ไม่พบการจองนี้ในบัญชีของคุณ');
  return serializeBooking(row);
}

/** ประวัติการจองของสมาชิก เรียงจากวันที่เข้าร่วมล่าสุดก่อน */
export async function listBookingsForUser(userId) {
  const rows = await withActivity(db('bookings'))
    .where('bookings.user_id', userId)
    .orderBy([
      { column: 'bookings.booking_date', order: 'desc' },
      { column: 'bookings.id', order: 'desc' },
    ]);
  return rows.map(serializeBooking);
}

/**
 * บอกว่าลูกค้ายกเลิกการจองนี้เองได้หรือไม่ ตามนโยบาย "ยกเลิกฟรีก่อนวันกิจกรรม N ชั่วโมง"
 * นับจากเวลา 00:00 ของวันที่เข้าร่วมกิจกรรม
 */
export function describeCancellation(booking, rules) {
  const deadline = dayjs(booking.booking_date).subtract(rules.cancelFreeHours, 'hour');

  if (!['pending', 'confirmed'].includes(booking.status)) {
    return { can_cancel: false, deadline: deadline.toISOString(), reason: 'การจองนี้อยู่ในสถานะที่ยกเลิกไม่ได้แล้ว' };
  }
  if (dayjs().isAfter(deadline)) {
    return {
      can_cancel: false,
      deadline: deadline.toISOString(),
      reason: `เลยกำหนดยกเลิกออนไลน์แล้ว (ต้องยกเลิกก่อนวันกิจกรรมอย่างน้อย ${rules.cancelFreeHours} ชั่วโมง) กรุณาติดต่อเจ้าหน้าที่`,
    };
  }
  return { can_cancel: true, deadline: deadline.toISOString(), reason: null };
}

/** แนบข้อมูลนโยบายยกเลิกไปกับการจอง ให้หน้าเว็บรู้ว่าจะแสดงปุ่มยกเลิกหรือไม่ */
export async function withCancellation(bookings) {
  const rules = await getBookingRules();
  const attach = (booking) => ({ ...booking, cancellation: describeCancellation(booking, rules) });
  return Array.isArray(bookings) ? bookings.map(attach) : attach(bookings);
}

/** ลูกค้ายกเลิกการจองเอง (ผ่านการตรวจความเป็นเจ้าของมาแล้วจาก route) */
export async function cancelByCustomer(booking, reason) {
  const rules = await getBookingRules();
  const { can_cancel: canCancel, reason: why } = describeCancellation(booking, rules);
  if (!canCancel) throw ApiError.conflict(why);

  await db('bookings')
    .where({ id: booking.id })
    .update({
      status: 'cancelled',
      cancelled_at: db.fn.now(),
      cancel_reason: reason ?? 'ลูกค้ายกเลิกผ่านหน้าเว็บ',
      updated_at: db.fn.now(),
    });

  return getBookingById(booking.id);
}

/**
 * บันทึกว่าได้รับเงินแล้ว (เรียกจาก payment provider)
 * การจองที่ยังรอยืนยันจะถูกยืนยันให้อัตโนมัติ คืน null ถ้าเคยบันทึกไปแล้ว เพื่อกัน webhook ยิงซ้ำ
 */
export async function markPaid(bookingId, { method, paymentRef }) {
  return db.transaction(async (trx) => {
    const row = await trx('bookings').where({ id: bookingId }).forUpdate().first();
    if (!row) throw ApiError.notFound(`ไม่พบการจอง id ${bookingId}`);
    if (row.payment_status === 'paid') return null;
    if (row.status === 'cancelled') throw ApiError.conflict('การจองนี้ถูกยกเลิกแล้ว ชำระเงินไม่ได้');

    await trx('bookings')
      .where({ id: bookingId })
      .update({
        payment_status: 'paid',
        payment_method: method,
        payment_ref: paymentRef ?? null,
        paid_at: trx.fn.now(),
        status: row.status === 'pending' ? 'confirmed' : row.status,
        updated_at: trx.fn.now(),
      });

    const updated = await withActivity(trx('bookings')).where('bookings.id', bookingId).first();
    return serializeBooking(updated);
  });
}

/** ตัวกรองของหน้ารายการจองหลังบ้าน ใช้ร่วมกันระหว่างรายการแบบแบ่งหน้าและไฟล์ส่งออก */
const bookingFilters =
  ({ status, payment_status, activity_id, date_from, date_to, q }) =>
  (query) => {
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

export async function listBookings(filters) {
  const { page, limit } = filters;
  const applyFilters = bookingFilters(filters);

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

// กันไฟล์ส่งออกใหญ่จนกินหน่วยความจำของ API — ถ้าเกินให้แอดมินกรองช่วงวันที่ให้แคบลง
export const EXPORT_MAX_ROWS = 20000;

/** ทุกการจองที่ตรงตัวกรอง เรียงตามวันที่เข้าร่วมกิจกรรม สำหรับส่งออกเป็นไฟล์ */
export async function listBookingsForExport(filters) {
  const rows = await bookingFilters(filters)(withActivity(db('bookings')))
    .orderBy([
      { column: 'bookings.booking_date', order: 'asc' },
      { column: 'bookings.id', order: 'asc' },
    ])
    .limit(EXPORT_MAX_ROWS + 1);

  if (rows.length > EXPORT_MAX_ROWS) {
    throw ApiError.unprocessable(
      `มีรายการเกิน ${EXPORT_MAX_ROWS} แถว กรุณากรองช่วงวันที่ให้แคบลงก่อนส่งออก`,
    );
  }
  return rows.map(serializeBooking);
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

  if (changes.payment_status && changes.payment_status !== current.payment_status) {
    update.payment_status = changes.payment_status;
    // แอดมินกด "บันทึกรับเงิน" เอง = รับเงินนอกระบบ (โอน/เงินสด)
    if (changes.payment_status === 'paid') {
      update.paid_at = db.fn.now();
      update.payment_method = current.payment_method ?? 'manual';
    }
  }
  if (changes.payment_ref !== undefined) update.payment_ref = changes.payment_ref;

  await db('bookings').where({ id }).update(update);
  return getBookingById(id);
}

/** ลูกค้าแจ้งว่าโอนเงินแล้ว — ยังไม่ถือว่าได้รับเงิน จนกว่าทีมงานจะตรวจยอดแล้วกดบันทึกรับเงิน */
export async function markTransferNotified(bookingId, { method, note, slip }) {
  await db.transaction(async (trx) => {
    if (slip) {
      // การจองหนึ่งรายการมีสลิปได้ใบเดียว ถ้าเคยมีให้แทนที่
      await trx('payment_slips').where({ booking_id: bookingId }).del();
      await trx('payment_slips').insert({
        booking_id: bookingId,
        mime_type: slip.mimeType,
        size_bytes: slip.data.length,
        data: slip.data,
      });
    }

    await trx('bookings')
      .where({ id: bookingId })
      .update({
        payment_status: 'reviewing',
        payment_method: method,
        payment_ref: note ?? null,
        ...(slip ? { slip_uploaded_at: trx.fn.now() } : {}),
        updated_at: trx.fn.now(),
      });
  });
  return getBookingById(bookingId);
}

/** สลิปโอนเงินของการจอง (เฉพาะหลังบ้านเรียกได้) */
export async function getPaymentSlip(bookingId) {
  const row = await db('payment_slips').where({ booking_id: bookingId }).first();
  if (!row) throw ApiError.notFound('การจองนี้ไม่มีสลิปแนบ');
  return { mimeType: row.mime_type, data: Buffer.from(row.data) };
}

/** ตัวเลขสรุปสำหรับหน้า dashboard ของแอดมิน */
export async function getStats() {
  const today = dayjs().format('YYYY-MM-DD');

  const [statusRows, revenueRow, todayRow, upcomingRow, inquiryRow, reviewRow, reviewingRow] = await Promise.all([
    db('bookings').select('status').count({ count: '*' }).groupBy('status'),
    db('bookings').whereIn('status', ['confirmed', 'completed']).sum({ revenue: 'total_amount' }),
    db('bookings').where({ booking_date: today }).whereIn('status', ACTIVE_STATUSES).count({ count: '*' }),
    db('bookings').where('booking_date', '>', today).whereIn('status', ACTIVE_STATUSES).count({ count: '*' }),
    db('inquiries').where({ status: 'new' }).count({ count: '*' }),
    db('reviews').where({ is_published: false }).count({ count: '*' }),
    db('bookings').where({ payment_status: 'reviewing' }).whereNot({ status: 'cancelled' }).count({ count: '*' }),
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
    // ลูกค้าแจ้งโอนเงินแล้ว รอทีมงานตรวจยอดเข้าบัญชี
    payments_to_review: Number(reviewingRow[0]?.count ?? 0),
  };
}

/**
 * รายงานยอดจองตามช่วงวันที่ทำรายการ
 * รวมข้อมูลฝั่ง JavaScript แทน GROUP BY date() เพื่อให้ผลเหมือนกันทั้ง PostgreSQL และ MySQL
 */
export async function getReport({ from, to }) {
  const rows = await db('bookings')
    .join('activities', 'activities.id', 'bookings.activity_id')
    .select(
      'bookings.created_at',
      'bookings.status',
      'bookings.payment_status',
      'bookings.total_amount',
      'bookings.adults',
      'bookings.children',
      'bookings.infants',
      'bookings.activity_id',
      'activities.name_th as activity_name_th',
    )
    .where('bookings.created_at', '>=', dayjs(from).startOf('day').toDate())
    .andWhere('bookings.created_at', '<=', dayjs(to).endOf('day').toDate());

  const blank = () => ({ bookings: 0, cancelled: 0, guests: 0, revenue: 0, paid: 0 });
  const add = (bucket, row) => {
    const amount = Number(row.total_amount);
    bucket.bookings += 1;
    if (row.status === 'cancelled') {
      bucket.cancelled += 1;
      return;
    }
    bucket.guests += row.adults + row.children + row.infants;
    // รายได้ = ยอดของการจองที่ยืนยันแล้วหรือเสร็จสิ้น (นิยามเดียวกับการ์ดสรุปบนแดชบอร์ด)
    if (row.status === 'confirmed' || row.status === 'completed') bucket.revenue += amount;
    if (row.payment_status === 'paid') bucket.paid += amount;
  };

  // ใส่ทุกวันในช่วงไว้ก่อน วันที่ไม่มีการจองจะได้แสดงเป็น 0 แทนที่จะหายไปจากกราฟ
  const daily = new Map();
  for (let day = dayjs(from); !day.isAfter(dayjs(to), 'day'); day = day.add(1, 'day')) {
    daily.set(day.format('YYYY-MM-DD'), blank());
  }

  const byActivity = new Map();
  const totals = blank();

  for (const row of rows) {
    const day = dayjs(row.created_at).format('YYYY-MM-DD');
    if (!daily.has(day)) daily.set(day, blank());
    add(daily.get(day), row);

    if (!byActivity.has(row.activity_id)) {
      byActivity.set(row.activity_id, { activity_id: row.activity_id, name_th: row.activity_name_th, ...blank() });
    }
    add(byActivity.get(row.activity_id), row);
    add(totals, row);
  }

  return {
    from,
    to,
    totals,
    daily: [...daily.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => ({ date, ...value })),
    by_activity: [...byActivity.values()].sort((a, b) => b.revenue - a.revenue || b.bookings - a.bookings),
  };
}
