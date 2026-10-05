import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import { db } from '../db/knex.js';
import ApiError from '../utils/ApiError.js';

export async function login({ email, password }) {
  const user = await db('admin_users').where({ email: email.toLowerCase() }).first();

  // ตอบข้อความเดียวกันทั้งกรณีไม่มีบัญชีและรหัสผิด เพื่อไม่ให้เดาได้ว่ามีอีเมลนี้ในระบบหรือไม่
  const invalid = () => ApiError.unauthorized('อีเมลหรือรหัสผ่านไม่ถูกต้อง');

  if (!user) {
    // เทียบกับ hash หลอก ๆ ให้เวลาตอบสนองใกล้เคียงกรณีบัญชีมีอยู่จริง
    await bcrypt.compare(password, '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva');
    throw invalid();
  }
  if (!(user.is_active === true || user.is_active === 1)) {
    throw ApiError.forbidden('บัญชีนี้ถูกปิดการใช้งาน');
  }
  if (!(await bcrypt.compare(password, user.password_hash))) {
    throw invalid();
  }

  await db('admin_users').where({ id: user.id }).update({ last_login_at: db.fn.now() });

  const token = jwt.sign({ sub: user.id, role: user.role }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });

  return {
    token,
    expires_in: config.jwt.expiresIn,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  };
}
