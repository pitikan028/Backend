/**
 * password_resets: รหัสยืนยัน 6 หลักสำหรับตั้งรหัสผ่านใหม่ (ลืมรหัสผ่าน)
 * เก็บเฉพาะค่า hash ของรหัส รหัสจริงอยู่ในอีเมลที่ส่งถึงลูกค้าเท่านั้น
 * 1 บัญชีมีรหัสที่ใช้ได้ครั้งละ 1 รหัส ขอใหม่ = รหัสเก่าถูกลบ
 */

export async function up(knex) {
  if (await knex.schema.hasTable('password_resets')) return;
  await knex.schema.createTable('password_resets', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('code_hash', 64).notNullable();
    table.integer('attempts').notNullable().defaultTo(0);
    table.timestamp('expires_at').notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.index(['user_id'], 'password_resets_user_idx');
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('password_resets');
}
