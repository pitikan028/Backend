/**
 * - activities: ข้อความภาษาอังกฤษของกิจกรรม (หน้าเว็บฝั่งลูกค้าเป็นภาษาอังกฤษ)
 *   ถ้าเว้นว่าง หน้าเว็บจะใช้ข้อความภาษาไทยเดิมแทน
 * - users.phone_normalized: เบอร์โทรที่เหลือแต่ตัวเลข ใช้เข้าสู่ระบบด้วยเบอร์โทรและกันเบอร์ซ้ำ
 *   (ลูกค้าพิมพ์เบอร์เดียวกันได้หลายแบบ เช่น 089-000-1111 กับ +66 89 000 1111)
 *
 * ไม่ตั้ง unique ที่ฐานข้อมูล เพราะบัญชีที่สมัครไว้ก่อนหน้านี้อาจใช้เบอร์ซ้ำกันอยู่ — กันซ้ำที่ service แทน
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
  await addColumnIfMissing(knex, 'activities', 'duration_label_en', (t) => t.string('duration_label_en', 60));
  await addColumnIfMissing(knex, 'activities', 'description_en', (t) => t.text('description_en'));
  await addColumnIfMissing(knex, 'activities', 'highlights_en', (t) => t.text('highlights_en'));

  const added = await addColumnIfMissing(knex, 'users', 'phone_normalized', (t) =>
    t.string('phone_normalized', 40).index(),
  );
  if (!added) return;

  const users = await knex('users').select('id', 'phone').whereNotNull('phone');
  for (const user of users) {
    await knex('users')
      .where({ id: user.id })
      .update({ phone_normalized: normalizePhone(user.phone) });
  }
}

export async function down(knex) {
  for (const [table, column] of [
    ['users', 'phone_normalized'],
    ['activities', 'highlights_en'],
    ['activities', 'description_en'],
    ['activities', 'duration_label_en'],
  ]) {
    if (await knex.schema.hasColumn(table, column)) {
      await knex.schema.alterTable(table, (t) => t.dropColumn(column));
    }
  }
}
