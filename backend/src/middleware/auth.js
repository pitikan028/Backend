import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import ApiError from '../utils/ApiError.js';
import { db } from '../db/knex.js';
import asyncHandler from './asyncHandler.js';

/** ตรวจ JWT จาก header `Authorization: Bearer <token>` แล้วแนบผู้ใช้ไว้ที่ req.user */
export const requireAuth = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization ?? '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw ApiError.unauthorized('ต้องส่ง token มาด้วย (Authorization: Bearer <token>)');
  }

  let payload;
  try {
    payload = jwt.verify(token, config.jwt.secret);
  } catch {
    throw ApiError.unauthorized('token ไม่ถูกต้องหรือหมดอายุแล้ว');
  }

  // token ของลูกค้า (typ = user) ใช้เข้าหลังบ้านไม่ได้ แม้ id จะบังเอิญตรงกับบัญชีทีมงาน
  if (payload.typ === 'user') throw ApiError.forbidden('บัญชีนี้ไม่มีสิทธิ์ใช้งานส่วนนี้');

  // ตรวจกับฐานข้อมูลทุกครั้ง เพื่อให้ปิดบัญชีแล้วมีผลทันทีโดยไม่ต้องรอ token หมดอายุ
  const user = await db('admin_users')
    .select('id', 'email', 'name', 'role', 'is_active')
    .where({ id: payload.sub })
    .first();

  if (!user || !(user.is_active === true || user.is_active === 1)) {
    throw ApiError.unauthorized('บัญชีนี้ถูกปิดการใช้งานแล้ว');
  }

  req.user = { id: user.id, email: user.email, name: user.name, role: user.role };
  next();
});

/** จำกัดให้เฉพาะ role ที่ระบุเท่านั้นที่เรียกได้ ต้องใช้ต่อจาก requireAuth */
export const requireRole =
  (...roles) =>
  (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden('บัญชีนี้ไม่มีสิทธิ์ใช้งานส่วนนี้'));
    }
    return next();
  };

/** อ่าน token ของลูกค้าจาก header คืน null ถ้าไม่มีหรือใช้ไม่ได้ */
async function loadCustomer(req) {
  const [scheme, token] = (req.headers.authorization ?? '').split(' ');
  if (scheme !== 'Bearer' || !token) return null;

  let payload;
  try {
    payload = jwt.verify(token, config.jwt.secret);
  } catch {
    return null;
  }
  if (payload.typ !== 'user') return null;

  const user = await db('users')
    .select('id', 'email', 'first_name', 'last_name', 'phone', 'contact_app', 'contact_id', 'is_active')
    .where({ id: payload.sub })
    .first();

  if (!user || !(user.is_active === true || user.is_active === 1)) return null;
  return user;
}

/** ต้องเป็นสมาชิกที่ล็อกอินแล้ว — แนบไว้ที่ req.customer */
export const requireUser = asyncHandler(async (req, _res, next) => {
  const customer = await loadCustomer(req);
  if (!customer) throw ApiError.unauthorized('กรุณาเข้าสู่ระบบก่อน');
  req.customer = customer;
  next();
});

/** ใช้กับ endpoint ที่ guest ก็เรียกได้ แต่ถ้าล็อกอินอยู่จะผูกข้อมูลกับบัญชีให้ */
export const optionalUser = asyncHandler(async (req, _res, next) => {
  req.customer = await loadCustomer(req);
  next();
});

export default { requireAuth, requireRole, requireUser, optionalUser };
