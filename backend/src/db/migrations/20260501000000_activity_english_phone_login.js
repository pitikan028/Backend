/**
 * - activities: ข้อความภาษาอังกฤษของกิจกรรม (หน้าเว็บฝั่งลูกค้าเป็นภาษาอังกฤษ)
 *   ถ้าเว้นว่าง หน้าเว็บจะใช้ข้อความภาษาไทยเดิมแทน
 * - users.phone_normalized: เบอร์โทรที่เหลือแต่ตัวเลข ใช้เข้าสู่ระบบด้วยเบอร์โทรและกันเบอร์ซ้ำ
 *   (ลูกค้าพิมพ์เบอร์เดียวกันได้หลายแบบ เช่น 089-000-1111 กับ +66 89 000 1111)
 *
 * ไม่ตั้ง unique ที่ฐานข้อมูล เพราะบัญชีที่สมัครไว้ก่อนหน้านี้อาจใช้เบอร์ซ้ำกันอยู่ — กันซ้ำที่ service แทน
 */
import { normalizePhone } from '../../utils/helpers.js';

export async function up(knex) {
  await knex.schema.alterTable('activities', (table) => {
    table.string('duration_label_en', 60);
    table.text('description_en');
    table.text('highlights_en');
  });

  await knex.schema.alterTable('users', (table) => {
    table.string('phone_normalized', 40).index();
  });

  const users = await knex('users').select('id', 'phone').whereNotNull('phone');
  for (const user of users) {
    await knex('users')
      .where({ id: user.id })
      .update({ phone_normalized: normalizePhone(user.phone) });
  }
}

export async function down(knex) {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('phone_normalized');
  });

  await knex.schema.alterTable('activities', (table) => {
    table.dropColumn('highlights_en');
    table.dropColumn('description_en');
    table.dropColumn('duration_label_en');
  });
}
