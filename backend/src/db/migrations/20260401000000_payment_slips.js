/**
 * สลิปโอนเงินที่ลูกค้าแนบตอนแจ้งโอนผ่าน PromptPay
 *
 * เก็บไฟล์ไว้ในฐานข้อมูล (ไม่ใช่บนดิสก์ของ container) เพื่อให้สลิปไปกับไฟล์สำรองฐานข้อมูล
 * และไม่หายเมื่อ rebuild container — รูปถูกย่อขนาดที่เบราว์เซอร์ก่อนส่ง จึงมักไม่เกินไม่กี่ร้อย KB
 */

export async function up(knex) {
  await knex.schema.createTable('payment_slips', (table) => {
    table.increments('id').primary();
    table
      .integer('booking_id')
      .unsigned()
      .notNullable()
      .unique()
      .references('id')
      .inTable('bookings')
      .onDelete('CASCADE');
    table.string('mime_type', 40).notNullable();
    table.integer('size_bytes').notNullable();
    // ระบุความยาวเพื่อให้ MySQL ใช้ MEDIUMBLOB (BLOB ธรรมดาเก็บได้แค่ 64 KB) ส่วน PostgreSQL เป็น bytea
    table.binary('data', 8 * 1024 * 1024).notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.alterTable('bookings', (table) => {
    // มีค่า = การจองนี้มีสลิปแนบ ใช้แสดงปุ่ม "ดูสลิป" โดยไม่ต้อง join ตารางรูป
    table.timestamp('slip_uploaded_at');
  });
}

export async function down(knex) {
  await knex.schema.alterTable('bookings', (table) => {
    table.dropColumn('slip_uploaded_at');
  });
  await knex.schema.dropTableIfExists('payment_slips');
}
