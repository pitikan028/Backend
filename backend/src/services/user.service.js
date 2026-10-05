import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import { db, insertReturning } from '../db/knex.js';
import ApiError from '../utils/ApiError.js';
import { toBoolean } from '../utils/helpers.js';

const PUBLIC_COLUMNS = [
  'id',
  'email',
  'first_name',
  'last_name',
  'phone',
  'contact_app',
  'contact_id',
  'is_active',
  'last_login_at',
  'created_at',
];

export const serializeUser = (row) => (row ? { ...row, is_active: toBoolean(row.is_active) } : null);

/** token ของลูกค้ามี typ = 'user' เพื่อไม่ให้เอาไปเรียก /api/admin ได้ */
const signUserToken = (user) =>
  jwt.sign({ sub: user.id, typ: 'user' }, config.jwt.secret, { expiresIn: config.userJwtExpiresIn });

const session = (row) => {
  const user = serializeUser(Object.fromEntries(PUBLIC_COLUMNS.map((column) => [column, row[column]])));
  return { token: signUserToken(row), expires_in: config.userJwtExpiresIn, user };
};

/* ---------- ลูกค้า ---------- */

export async function register(input) {
  const email = input.email.toLowerCase();

  const existing = await db('users').where({ email }).first();
  if (existing) throw ApiError.conflict('อีเมลนี้สมัครสมาชิกไว้แล้ว กรุณาเข้าสู่ระบบ');

  const row = await insertReturning(db, 'users', {
    email,
    password_hash: await bcrypt.hash(input.password, 10),
    first_name: input.first_name,
    last_name: input.last_name,
    phone: input.phone ?? null,
    contact_app: input.contact_app ?? 'Line',
    contact_id: input.contact_id ?? null,
    last_login_at: db.fn.now(),
  });

  // การจองที่เคยทำไว้แบบไม่ล็อกอินด้วยอีเมลเดียวกัน ให้มาอยู่ในประวัติของบัญชีนี้ด้วย
  await db('bookings').where({ email }).whereNull('user_id').update({ user_id: row.id });

  return session(row);
}

export async function login({ email, password }) {
  const row = await db('users').where({ email: email.toLowerCase() }).first();
  const invalid = () => ApiError.unauthorized('อีเมลหรือรหัสผ่านไม่ถูกต้อง');

  if (!row) {
    await bcrypt.compare(password, '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva');
    throw invalid();
  }
  if (!toBoolean(row.is_active)) throw ApiError.forbidden('บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อเจ้าหน้าที่');
  if (!(await bcrypt.compare(password, row.password_hash))) throw invalid();

  await db('users').where({ id: row.id }).update({ last_login_at: db.fn.now() });
  return session(row);
}

export async function getUserById(id) {
  const row = await db('users').select(PUBLIC_COLUMNS).where({ id }).first();
  if (!row) throw ApiError.notFound('ไม่พบบัญชีผู้ใช้');
  return serializeUser(row);
}

export async function updateProfile(id, changes) {
  await db('users')
    .where({ id })
    .update({ ...changes, updated_at: db.fn.now() });
  return getUserById(id);
}

export async function changePassword(id, { current_password, new_password }) {
  const row = await db('users').where({ id }).first();
  if (!row || !(await bcrypt.compare(current_password, row.password_hash))) {
    throw ApiError.badRequest('รหัสผ่านปัจจุบันไม่ถูกต้อง');
  }
  await db('users')
    .where({ id })
    .update({ password_hash: await bcrypt.hash(new_password, 10), updated_at: db.fn.now() });
}

/* ---------- แอดมินจัดการบัญชีลูกค้า ---------- */

export async function listUsers({ page, limit, q, is_active }) {
  const applyFilters = (query) => {
    if (is_active !== undefined) query.where('users.is_active', is_active);
    if (q) {
      const like = `%${q.toLowerCase()}%`;
      query.where((builder) => {
        builder
          .whereRaw('lower(users.email) like ?', [like])
          .orWhereRaw('lower(users.first_name) like ?', [like])
          .orWhereRaw('lower(users.last_name) like ?', [like])
          .orWhereRaw('lower(users.phone) like ?', [like]);
      });
    }
    return query;
  };

  const [{ count }] = await applyFilters(db('users')).count({ count: '*' });
  const total = Number(count);

  const rows = await applyFilters(db('users'))
    .select(PUBLIC_COLUMNS.map((column) => `users.${column}`))
    .select(db('bookings').count('*').whereRaw('bookings.user_id = users.id').as('booking_count'))
    .orderBy('users.id', 'desc')
    .limit(limit)
    .offset((page - 1) * limit);

  return {
    data: rows.map((row) => ({ ...serializeUser(row), booking_count: Number(row.booking_count) })),
    meta: { page, limit, total, total_pages: Math.max(1, Math.ceil(total / limit)) },
  };
}

export async function setUserActive(id, isActive) {
  await getUserById(id);
  await db('users').where({ id }).update({ is_active: isActive, updated_at: db.fn.now() });
  return getUserById(id);
}

/* ---------- แอดมินจัดการบัญชีทีมงาน ---------- */

const STAFF_COLUMNS = ['id', 'email', 'name', 'role', 'is_active', 'last_login_at', 'created_at'];

export async function listStaff() {
  const rows = await db('admin_users').select(STAFF_COLUMNS).orderBy('id', 'asc');
  return rows.map(serializeUser);
}

export async function createStaff(input) {
  const email = input.email.toLowerCase();
  if (await db('admin_users').where({ email }).first()) {
    throw ApiError.conflict('มีบัญชีทีมงานที่ใช้อีเมลนี้อยู่แล้ว');
  }

  const row = await insertReturning(db, 'admin_users', {
    email,
    password_hash: await bcrypt.hash(input.password, 10),
    name: input.name,
    role: input.role,
  });
  return serializeUser(Object.fromEntries(STAFF_COLUMNS.map((column) => [column, row[column]])));
}

export async function updateStaff(id, changes, actingUser) {
  const row = await db('admin_users').where({ id }).first();
  if (!row) throw ApiError.notFound(`ไม่พบบัญชีทีมงาน id ${id}`);

  const removesAdmin =
    row.role === 'admin' &&
    toBoolean(row.is_active) &&
    (changes.is_active === false || (changes.role && changes.role !== 'admin'));

  if (removesAdmin) {
    if (Number(id) === actingUser.id) {
      throw ApiError.conflict('ปิดบัญชีหรือลดสิทธิ์ของตัวเองไม่ได้');
    }
    // ต้องเหลือ admin ที่ใช้งานได้อย่างน้อย 1 คนเสมอ ไม่งั้นจะไม่มีใครเข้าหน้าตั้งค่าได้อีก
    const [{ count }] = await db('admin_users')
      .where({ role: 'admin', is_active: true })
      .whereNot({ id })
      .count({ count: '*' });
    if (Number(count) === 0) throw ApiError.conflict('ต้องมีผู้ดูแลระบบที่ใช้งานได้อย่างน้อย 1 บัญชี');
  }

  const update = { updated_at: db.fn.now() };
  if (changes.name !== undefined) update.name = changes.name;
  if (changes.role !== undefined) update.role = changes.role;
  if (changes.is_active !== undefined) update.is_active = changes.is_active;
  if (changes.password) update.password_hash = await bcrypt.hash(changes.password, 10);

  await db('admin_users').where({ id }).update(update);
  return serializeUser(await db('admin_users').select(STAFF_COLUMNS).where({ id }).first());
}
