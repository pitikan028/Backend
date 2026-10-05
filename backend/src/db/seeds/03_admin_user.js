import bcrypt from 'bcryptjs';
import config from '../../config/index.js';

/**
 * สร้างบัญชีแอดมินเริ่มต้นจากค่าใน .env (SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD)
 * ถ้ามีบัญชีนั้นอยู่แล้วจะข้าม เพื่อไม่ให้รหัสผ่านที่ผู้ใช้เปลี่ยนเองถูกเขียนทับ
 */
export async function seed(knex) {
  const email = config.seedAdmin.email.toLowerCase();
  const existing = await knex('admin_users').where({ email }).first();
  if (existing) return;

  await knex('admin_users').insert({
    email,
    password_hash: await bcrypt.hash(config.seedAdmin.password, 10),
    name: config.seedAdmin.name,
    role: 'admin',
    is_active: true,
  });
}
