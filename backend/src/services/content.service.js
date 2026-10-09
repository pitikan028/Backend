import { db } from '../db/knex.js';
import ApiError from '../utils/ApiError.js';
import { detectContactType, normalizePhone, toBoolean } from '../utils/helpers.js';
import { notifyInquiryAnswered } from './notification.service.js';

/* ---------- reviews ---------- */

const serializeReview = (row) => ({ ...row, is_published: toBoolean(row.is_published) });

export async function listReviews({ page, limit, source, min_rating, is_published }) {
  const applyFilters = (query) => {
    if (is_published !== undefined) query.where('is_published', is_published);
    if (source) query.where('source', source);
    if (min_rating) query.where('rating', '>=', min_rating);
    return query;
  };

  const [{ count }] = await applyFilters(db('reviews')).count({ count: '*' });
  const total = Number(count);

  const rows = await applyFilters(db('reviews'))
    .orderBy([
      { column: 'sort_order', order: 'asc' },
      { column: 'created_at', order: 'desc' },
    ])
    .limit(limit)
    .offset((page - 1) * limit);

  // คะแนนเฉลี่ยคิดจากรีวิวที่เผยแพร่แล้วเท่านั้น (ตัวเลข 4.9★ ในหน้า About)
  const [avgRow] = await db('reviews').where({ is_published: true }).avg({ avg: 'rating' });
  const average = avgRow?.avg ? Math.round(Number(avgRow.avg) * 10) / 10 : null;

  return {
    data: rows.map(serializeReview),
    meta: { page, limit, total, total_pages: Math.max(1, Math.ceil(total / limit)), average_rating: average },
  };
}

/** รีวิวที่ส่งจากหน้าเว็บจะยังไม่แสดงจนกว่าแอดมินจะอนุมัติ */
export async function createReview(data) {
  await db('reviews').insert({ ...data, is_published: false });
  return { message: 'ขอบคุณสำหรับรีวิว ทีมงานจะตรวจสอบก่อนเผยแพร่' };
}

export async function updateReview(id, data) {
  const existing = await db('reviews').where({ id }).first();
  if (!existing) throw ApiError.notFound(`ไม่พบรีวิว id ${id}`);

  await db('reviews')
    .where({ id })
    .update({ ...data, updated_at: db.fn.now() });

  return serializeReview(await db('reviews').where({ id }).first());
}

export async function deleteReview(id) {
  const deleted = await db('reviews').where({ id }).del();
  if (!deleted) throw ApiError.notFound(`ไม่พบรีวิว id ${id}`);
}

/* ---------- faqs ---------- */

export async function listFaqs() {
  const rows = await db('faqs')
    .where({ is_published: true })
    .orderBy([
      { column: 'sort_order', order: 'asc' },
      { column: 'id', order: 'asc' },
    ]);
  return rows.map((row) => ({ ...row, is_published: toBoolean(row.is_published) }));
}

/* ---------- inquiries ---------- */

/** หาสมาชิกที่เป็นเจ้าของคำถาม: ล็อกอินอยู่ใช้บัญชีนั้นเลย ไม่งั้นลองจับคู่จากอีเมล/เบอร์ที่กรอก */
async function findInquiryOwner(contact, contactType, customer) {
  if (customer?.id) return customer.id;
  if (contactType === 'email') {
    const user = await db('users').select('id').whereRaw('LOWER(email) = ?', [contact.toLowerCase()]).first();
    return user?.id ?? null;
  }
  if (contactType === 'phone') {
    const phone = normalizePhone(contact);
    if (!phone) return null;
    // เบอร์ซ้ำหลายบัญชีไม่เดา
    const rows = await db('users').select('id').where({ phone_normalized: phone }).limit(2);
    return rows.length === 1 ? rows[0].id : null;
  }
  return null;
}

export async function createInquiry({ contact, message }, customer = null) {
  const contactType = detectContactType(contact);
  await db('inquiries').insert({
    contact,
    contact_type: contactType,
    message,
    status: 'new',
    user_id: await findInquiryOwner(contact, contactType, customer),
  });
  return { message: 'ส่งคำถามเรียบร้อย ทีมงานจะติดต่อกลับภายใน 24 ชั่วโมง' };
}

export async function listInquiries({ page, limit, status }) {
  const applyFilters = (query) => (status ? query.where({ status }) : query);

  const [{ count }] = await applyFilters(db('inquiries')).count({ count: '*' });
  const total = Number(count);

  const rows = await applyFilters(db('inquiries'))
    .orderBy('created_at', 'desc')
    .limit(limit)
    .offset((page - 1) * limit);

  return {
    data: rows,
    meta: { page, limit, total, total_pages: Math.max(1, Math.ceil(total / limit)) },
  };
}

export async function updateInquiry(id, data) {
  const existing = await db('inquiries').where({ id }).first();
  if (!existing) throw ApiError.notFound(`ไม่พบคำถาม id ${id}`);

  const update = { ...data, updated_at: db.fn.now() };
  // ตอบคำถามแล้วให้ขยับสถานะเป็น answered ให้อัตโนมัติ ถ้าแอดมินไม่ได้ระบุเอง
  if (data.answer && !data.status) update.status = 'answered';
  if (update.status === 'answered') update.answered_at = db.fn.now();

  await db('inquiries').where({ id }).update(update);
  const updated = await db('inquiries').where({ id }).first();

  // ส่งคำตอบให้ลูกค้าเมื่อมีคำตอบใหม่หรือแก้คำตอบ (ปิดเรื่องเฉย ๆ ไม่ส่งซ้ำ)
  if (data.answer && data.answer !== existing.answer) await notifyInquiryAnswered(updated);

  return updated;
}
