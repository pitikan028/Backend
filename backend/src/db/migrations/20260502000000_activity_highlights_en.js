/**
 * highlights_en: จุดเด่นของกิจกรรมภาษาอังกฤษ บรรทัดละ 1 ข้อ
 *
 * หมายเหตุ: คอลัมน์ชุดนี้ถูกเพิ่มโดย migration สองสาย (20260501000000_activity_english_phone_login ของ branch
 * feat/merge-frontend-ui และ 20260501-20260601 ของ branch polly) ทุกไฟล์จึงเช็กก่อนว่ามีคอลัมน์แล้วหรือยัง
 * เพื่อให้ฐานข้อมูลที่ผ่านสายไหนมาก่อนก็รันต่อได้โดยไม่ชนกัน
 */

/** เพิ่มคอลัมน์เฉพาะเมื่อยังไม่มี — ฐานข้อมูลของแต่ละเครื่องผ่าน migration มาคนละชุด (ดูหมายเหตุด้านบน) */
async function addColumnIfMissing(knex, table, column, build) {
  if (await knex.schema.hasColumn(table, column)) return false;
  await knex.schema.alterTable(table, (t) => build(t));
  return true;
}

export async function up(knex) {
  await addColumnIfMissing(knex, 'activities', 'highlights_en', (t) => t.text('highlights_en'));
}

// คอลัมน์นี้ถอนโดย 20260501000000_activity_english_phone_login.js
export async function down() {}
