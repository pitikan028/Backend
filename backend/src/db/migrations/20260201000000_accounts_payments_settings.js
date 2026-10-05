/**
 * ส่วนขยายสำหรับระบบสมาชิก การชำระเงิน การแจ้งเตือน และการตั้งค่าระบบ
 *
 * ตารางใหม่:
 *   users          - บัญชีลูกค้า (สมัครสมาชิก / เข้าสู่ระบบ / ดูประวัติการจอง)
 *   settings       - ค่าตั้งระบบแบบ key-value ที่แอดมินแก้ได้จากหน้าหลังบ้าน
 *   notifications  - บันทึกการแจ้งเตือนทุกฉบับ (อีเมล + แสดงในหน้าบัญชีของลูกค้า)
 *
 * คอลัมน์ใหม่:
 *   bookings.user_id / payment_method / paid_at / cancel_reason
 *   activities.category / highlights
 */

export async function up(knex) {
  await knex.schema.createTable('users', (table) => {
    table.increments('id').primary();
    table.string('email', 160).notNullable().unique();
    table.string('password_hash', 255).notNullable();
    table.string('first_name', 100).notNullable();
    table.string('last_name', 100).notNullable();
    table.string('phone', 40);
    table.string('contact_app', 20).notNullable().defaultTo('Line');
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('last_login_at');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.alterTable('bookings', (table) => {
    // การจองแบบไม่ล็อกอิน (guest) ยังทำได้ จึงปล่อยให้เป็น null
    table.integer('user_id').unsigned().references('id').inTable('users').onDelete('SET NULL');
    table.string('payment_method', 30);
    table.timestamp('paid_at');
    table.string('cancel_reason', 255);
    table.index(['user_id'], 'bookings_user_idx');
  });

  await knex.schema.alterTable('activities', (table) => {
    table.string('category', 40).notNullable().defaultTo('elephant');
    // จุดเด่นของกิจกรรม เก็บบรรทัดละ 1 ข้อ แสดงในหน้ารายละเอียด
    table.text('highlights');
  });

  await knex.schema.createTable('settings', (table) => {
    table.string('key', 60).primary();
    table.text('value');
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('notifications', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
    table.integer('booking_id').unsigned().references('id').inTable('bookings').onDelete('CASCADE');
    table.string('recipient', 160).notNullable();
    table.string('type', 40).notNullable();
    table.string('subject', 255).notNullable();
    table.text('body').notNullable();
    // queued = กำลังส่ง, sent = ส่งอีเมลแล้ว, logged = ไม่ได้ตั้งค่า SMTP จึงบันทึกไว้เฉย ๆ, failed = ส่งไม่สำเร็จ
    table.string('status', 20).notNullable().defaultTo('queued');
    table.text('error');
    table.boolean('is_read').notNullable().defaultTo(false);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.index(['user_id', 'is_read'], 'notifications_user_idx');
    table.index(['recipient'], 'notifications_recipient_idx');
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('notifications');
  await knex.schema.dropTableIfExists('settings');

  await knex.schema.alterTable('activities', (table) => {
    table.dropColumn('highlights');
    table.dropColumn('category');
  });

  await knex.schema.alterTable('bookings', (table) => {
    table.dropIndex(['user_id'], 'bookings_user_idx');
    table.dropForeign(['user_id']);
    table.dropColumn('cancel_reason');
    table.dropColumn('paid_at');
    table.dropColumn('payment_method');
    table.dropColumn('user_id');
  });

  await knex.schema.dropTableIfExists('users');
}
