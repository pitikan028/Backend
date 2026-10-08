import { db } from '../db/knex.js';
import ApiError from '../utils/ApiError.js';
import { toBoolean, toNumber } from '../utils/helpers.js';

const COLUMNS = [
  'id',
  'slug',
  'name',
  'name_th',
  'description_th',
  'description_en',
  'highlights',
  'highlights_en',
  'category',
  'duration_label',
  'duration_label_en',
  'duration_minutes',
  'adult_price',
  'child_price',
  'infant_price',
  'image_url',
  'daily_capacity',
  'sort_order',
  'is_active',
  'created_at',
  'updated_at',
];

/** แปลงแถวจากฐานข้อมูลให้เป็นรูปแบบ JSON ที่ frontend ใช้ได้เลย */
export function serializeActivity(row) {
  if (!row) return null;
  return {
    ...row,
    adult_price: toNumber(row.adult_price),
    child_price: toNumber(row.child_price),
    infant_price: toNumber(row.infant_price),
    is_active: toBoolean(row.is_active),
  };
}

const SORTS = {
  recommended: [
    { column: 'sort_order', order: 'asc' },
    { column: 'id', order: 'asc' },
  ],
  price_asc: [
    { column: 'adult_price', order: 'asc' },
    { column: 'id', order: 'asc' },
  ],
  price_desc: [
    { column: 'adult_price', order: 'desc' },
    { column: 'id', order: 'asc' },
  ],
  duration: [
    { column: 'duration_minutes', order: 'asc' },
    { column: 'id', order: 'asc' },
  ],
};

export async function listActivities({ includeInactive = false, q, category, max_price, sort } = {}) {
  const query = db('activities').select(COLUMNS).orderBy(SORTS[sort] ?? SORTS.recommended);
  if (!includeInactive) query.where('is_active', true);
  if (category) query.where({ category });
  if (max_price !== undefined) query.where('adult_price', '<=', max_price);
  if (q) {
    const like = `%${q.toLowerCase()}%`;
    query.where((builder) => {
      builder
        .whereRaw('lower(name) like ?', [like])
        .orWhereRaw('lower(name_th) like ?', [like])
        .orWhereRaw('lower(description_th) like ?', [like])
        .orWhereRaw('lower(description_en) like ?', [like]);
    });
  }

  const rows = await query;
  return rows.map(serializeActivity);
}

/** หมวดหมู่ที่มีกิจกรรมเปิดให้จองอยู่จริง ใช้สร้างตัวเลือกในช่องกรองของหน้าเว็บ */
export async function listCategories() {
  const rows = await db('activities').distinct('category').where('is_active', true).orderBy('category', 'asc');
  return rows.map((row) => row.category);
}

export async function getActivityBySlug(slug, { includeInactive = false } = {}) {
  const query = db('activities').select(COLUMNS).where({ slug });
  if (!includeInactive) query.andWhere('is_active', true);

  const row = await query.first();
  if (!row) throw ApiError.notFound(`ไม่พบกิจกรรม "${slug}"`);
  return serializeActivity(row);
}

export async function getActivityById(id, { includeInactive = true } = {}) {
  const query = db('activities').select(COLUMNS).where({ id });
  if (!includeInactive) query.andWhere('is_active', true);

  const row = await query.first();
  if (!row) throw ApiError.notFound(`ไม่พบกิจกรรม id ${id}`);
  return serializeActivity(row);
}

export async function createActivity(data) {
  const existing = await db('activities').where({ slug: data.slug }).first();
  if (existing) throw ApiError.conflict(`มีกิจกรรม slug "${data.slug}" อยู่แล้ว`);

  await db('activities').insert(data);
  return getActivityBySlug(data.slug, { includeInactive: true });
}

export async function updateActivity(id, data) {
  const activity = await getActivityById(id);

  if (data.slug && data.slug !== activity.slug) {
    const clash = await db('activities').where({ slug: data.slug }).whereNot({ id }).first();
    if (clash) throw ApiError.conflict(`มีกิจกรรม slug "${data.slug}" อยู่แล้ว`);
  }

  await db('activities')
    .where({ id })
    .update({ ...data, updated_at: db.fn.now() });

  return getActivityById(id);
}

/**
 * ไม่ลบกิจกรรมที่มีการจองอยู่ เพราะจะทำให้ประวัติการจองอ้างอิงไม่ได้
 * กรณีนั้นให้ปิดการใช้งาน (is_active = false) แทน
 */
export async function deleteActivity(id) {
  await getActivityById(id);

  const [{ count }] = await db('bookings').where({ activity_id: id }).count({ count: '*' });
  if (Number(count) > 0) {
    throw ApiError.conflict(
      `ลบไม่ได้เพราะมีการจอง ${count} รายการอ้างอิงกิจกรรมนี้อยู่ — ให้ตั้ง is_active = false แทน`,
    );
  }

  await db('activities').where({ id }).del();
}
