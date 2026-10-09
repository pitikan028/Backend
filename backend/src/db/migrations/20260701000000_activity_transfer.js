/**
 * includes_transfer: กิจกรรม/แพ็กเกจนี้รวมบริการรับ-ส่งหรือไม่
 * false = ลูกค้าเดินทางมาปางช้างเอง ฟอร์มจองจะไม่ถามจุดรับ
 * กิจกรรมเดิมทั้งหมดรวมรับ-ส่งอยู่แล้ว จึงตั้งค่าเริ่มต้นเป็น true
 */

export async function up(knex) {
  if (await knex.schema.hasColumn('activities', 'includes_transfer')) return;
  await knex.schema.alterTable('activities', (table) => {
    table.boolean('includes_transfer').notNullable().defaultTo(true);
  });
}

export async function down(knex) {
  await knex.schema.alterTable('activities', (table) => {
    table.dropColumn('includes_transfer');
  });
}
