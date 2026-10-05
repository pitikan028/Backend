/**
 * Schema เริ่มต้นของ Chokchai Elephant Camp
 *
 * ตาราง:
 *   activities   - 6 เซ็ทกิจกรรม พร้อมราคาและโควตาต่อวัน
 *   bookings     - การจองจาก Booking Modal 4 ขั้นตอน
 *   reviews      - รีวิวจาก Google / TripAdvisor / หน้าเว็บ
 *   faqs         - คำถามที่พบบ่อยในหน้า Contact
 *   inquiries    - คำถามที่ผู้เข้าชมส่งผ่านฟอร์ม "Send us Your Question"
 *   admin_users  - บัญชีผู้ดูแลสำหรับหน้า admin
 */

/** timestamp ที่ใช้ได้ทั้ง PostgreSQL และ MySQL */
const withTimestamps = (knex, table) => {
  table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
};

export async function up(knex) {
  await knex.schema.createTable('activities', (table) => {
    table.increments('id').primary();
    table.string('slug', 80).notNullable().unique();
    table.string('name', 160).notNullable();
    table.string('name_th', 160).notNullable();
    table.text('description_th');
    table.string('duration_label', 60).notNullable();
    table.integer('duration_minutes');
    table.decimal('adult_price', 10, 2).notNullable();
    table.decimal('child_price', 10, 2).notNullable();
    table.decimal('infant_price', 10, 2).notNullable().defaultTo(0);
    table.string('image_url', 255);
    // จำนวนผู้เข้าร่วมสูงสุดต่อวันของกิจกรรมนี้ (ใช้คำนวณที่ว่าง)
    table.integer('daily_capacity').notNullable().defaultTo(40);
    table.integer('sort_order').notNullable().defaultTo(0);
    table.boolean('is_active').notNullable().defaultTo(true);
    withTimestamps(knex, table);
  });

  await knex.schema.createTable('bookings', (table) => {
    table.increments('id').primary();
    // รหัสอ้างอิงที่ลูกค้าใช้ค้นหาการจอง เช่น CEC-7QK4M2
    table.string('booking_ref', 20).notNullable().unique();
    table
      .integer('activity_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('activities')
      .onDelete('RESTRICT');
    table.date('booking_date').notNullable();

    table.integer('adults').notNullable().defaultTo(0);
    table.integer('children').notNullable().defaultTo(0);
    table.integer('infants').notNullable().defaultTo(0);

    // เก็บราคา ณ เวลาที่จอง เพื่อให้ยอดเดิมไม่เปลี่ยนเมื่อแอดมินแก้ราคากิจกรรมภายหลัง
    table.decimal('unit_adult_price', 10, 2).notNullable();
    table.decimal('unit_child_price', 10, 2).notNullable();
    table.decimal('unit_infant_price', 10, 2).notNullable().defaultTo(0);
    table.decimal('total_amount', 10, 2).notNullable();
    table.string('currency', 3).notNullable().defaultTo('THB');

    table.string('first_name', 100).notNullable();
    table.string('last_name', 100).notNullable();
    table.string('phone', 40).notNullable();
    table.string('email', 160).notNullable();
    table.string('contact_app', 20).notNullable().defaultTo('Line');
    table.text('note');

    table.string('pickup_type', 60).notNullable().defaultTo('undecided');
    table.string('pickup_detail', 255);

    table.string('status', 20).notNullable().defaultTo('pending');
    table.string('payment_status', 20).notNullable().defaultTo('unpaid');
    table.string('payment_ref', 100);
    table.timestamp('cancelled_at');

    withTimestamps(knex, table);

    // ใช้ตอนคำนวณที่ว่างของกิจกรรมในแต่ละวัน
    table.index(['activity_id', 'booking_date'], 'bookings_activity_date_idx');
    table.index(['status'], 'bookings_status_idx');
    table.index(['email'], 'bookings_email_idx');
  });

  await knex.schema.createTable('reviews', (table) => {
    table.increments('id').primary();
    table.string('author_name', 120).notNullable();
    table.integer('rating').notNullable().defaultTo(5);
    table.string('source', 30).notNullable().defaultTo('website');
    table.text('comment').notNullable();
    // รีวิวที่ส่งผ่านหน้าเว็บต้องให้แอดมินอนุมัติก่อนจึงจะแสดง
    table.boolean('is_published').notNullable().defaultTo(false);
    table.integer('sort_order').notNullable().defaultTo(0);
    withTimestamps(knex, table);

    table.index(['is_published'], 'reviews_published_idx');
  });

  await knex.schema.createTable('faqs', (table) => {
    table.increments('id').primary();
    table.string('question', 255).notNullable();
    table.text('answer').notNullable();
    table.integer('sort_order').notNullable().defaultTo(0);
    table.boolean('is_published').notNullable().defaultTo(true);
    withTimestamps(knex, table);
  });

  await knex.schema.createTable('inquiries', (table) => {
    table.increments('id').primary();
    // ฟอร์มหน้าเว็บรับ "อีเมลหรือเบอร์โทร" ในช่องเดียว จึงเก็บเป็น contact แล้วแยกชนิดไว้
    table.string('contact', 160).notNullable();
    table.string('contact_type', 20).notNullable().defaultTo('unknown');
    table.text('message').notNullable();
    table.string('status', 20).notNullable().defaultTo('new');
    table.text('answer');
    table.timestamp('answered_at');
    withTimestamps(knex, table);

    table.index(['status'], 'inquiries_status_idx');
  });

  await knex.schema.createTable('admin_users', (table) => {
    table.increments('id').primary();
    table.string('email', 160).notNullable().unique();
    table.string('password_hash', 255).notNullable();
    table.string('name', 120).notNullable();
    table.string('role', 20).notNullable().defaultTo('admin');
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('last_login_at');
    withTimestamps(knex, table);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('admin_users');
  await knex.schema.dropTableIfExists('inquiries');
  await knex.schema.dropTableIfExists('faqs');
  await knex.schema.dropTableIfExists('reviews');
  await knex.schema.dropTableIfExists('bookings');
  await knex.schema.dropTableIfExists('activities');
}
