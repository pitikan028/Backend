/**
 * - contact_id: ไอดีของแอปติดต่อที่ลูกค้าเลือก (LINE ID / Instagram / เบอร์ WhatsApp / WeChat ID)
 * - pickup_round: รอบเวลารับ (morning = รอบเช้า, afternoon = รอบกลางวัน)
 *
 * สถานะการชำระเงินมีค่าใหม่ "reviewing" (ลูกค้าแจ้งโอนผ่าน PromptPay แล้ว รอทีมงานตรวจสอบ)
 * คอลัมน์ payment_status เป็น string อยู่แล้วจึงไม่ต้องแก้ schema
 */

export async function up(knex) {
  await knex.schema.alterTable('bookings', (table) => {
    table.string('contact_id', 80);
    table.string('pickup_round', 20).notNullable().defaultTo('morning');
  });

  await knex.schema.alterTable('users', (table) => {
    table.string('contact_id', 80);
  });
}

export async function down(knex) {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('contact_id');
  });

  await knex.schema.alterTable('bookings', (table) => {
    table.dropColumn('pickup_round');
    table.dropColumn('contact_id');
  });
}
