/**
 * users.phone_normalized สำหรับเข้าสู่ระบบด้วยเบอร์โทร
 *
 * หมายเหตุ: คอลัมน์ชุดนี้ถูกเพิ่มโดย migration สองสาย (20260501000000_activity_english_phone_login ของ branch
 * feat/merge-frontend-ui และ 20260501-20260601 ของ branch polly) ทุกไฟล์จึงเช็กก่อนว่ามีคอลัมน์แล้วหรือยัง
 * เพื่อให้ฐานข้อมูลที่ผ่านสายไหนมาก่อนก็รันต่อได้โดยไม่ชนกัน
 */
import { normalizePhone } from '../../utils/helpers.js';

/** เพิ่มคอลัมน์เฉพาะเมื่อยังไม่มี — ฐานข้อมูลของแต่ละเครื่องผ่าน migration มาคนละชุด (ดูหมายเหตุด้านบน) */
async function addColumnIfMissing(knex, table, column, build) {
  if (await knex.schema.hasColumn(table, column)) return false;
  await knex.schema.alterTable(table, (t) => build(t));
  return true;
}

export async function up(knex) {
  const added = await addColumnIfMissing(knex, 'users', 'phone_normalized', (t) =>
    t.string('phone_normalized', 40).index(),
  );
  if (!added) return;

  const rows = await knex('users').select('id', 'phone').whereNotNull('phone');
  for (const row of rows) {
    await knex('users').where({ id: row.id }).update({ phone_normalized: normalizePhone(row.phone) });
  }
}

// คอลัมน์นี้ถอนโดย 20260501000000_activity_english_phone_login.js
export async function down() {}
