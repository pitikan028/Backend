/**
 * inquiries.user_id: ผูกคำถามกับบัญชีสมาชิก
 * เมื่อแอดมินตอบคำถาม ระบบจะส่งคำตอบเข้า Notifications ของสมาชิกคนนั้น (และอีเมลถ้าตั้งค่า SMTP ไว้)
 * เว้นว่าง = ผู้ส่งไม่ได้ล็อกอิน และช่องทางติดต่อไม่ตรงกับบัญชีใด
 */

export async function up(knex) {
  if (await knex.schema.hasColumn('inquiries', 'user_id')) return;
  await knex.schema.alterTable('inquiries', (table) => {
    table.integer('user_id').unsigned().references('id').inTable('users').onDelete('SET NULL');
    table.index(['user_id'], 'inquiries_user_idx');
  });
}

export async function down(knex) {
  await knex.schema.alterTable('inquiries', (table) => {
    table.dropIndex(['user_id'], 'inquiries_user_idx');
    table.dropForeign(['user_id']);
    table.dropColumn('user_id');
  });
}
