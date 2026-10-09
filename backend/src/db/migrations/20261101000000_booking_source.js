/**
 * bookings.source / source_ref: ช่องทางที่มาของการจอง
 * - source: 'website' = จองผ่านหน้าเว็บ ค่าอื่นคือชื่อช่องทางที่แอดมินพิมพ์เองตอนเพิ่มการจองจากหลังบ้าน
 *   (เช่น Trip.com, Klook, Walk-in)
 * - source_ref: เลขที่การจองของช่องทางนั้น ใช้เทียบกับรายการในระบบของ OTA
 */

export async function up(knex) {
  if (await knex.schema.hasColumn('bookings', 'source')) return;
  await knex.schema.alterTable('bookings', (table) => {
    table.string('source', 40).notNullable().defaultTo('website');
    table.string('source_ref', 80);
  });
}

export async function down(knex) {
  await knex.schema.alterTable('bookings', (table) => {
    table.dropColumn('source_ref');
    table.dropColumn('source');
  });
}
