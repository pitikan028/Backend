/**
 * รูปแบบราคาเพิ่มเติมของกิจกรรม
 *
 * - adults_only: รับเฉพาะผู้ใหญ่ (เช่น โหนสลิง) ฟอร์มจองไม่มีช่องเด็ก/ทารก และ API ไม่รับการจองที่มีเด็ก
 * - group_pricing: ราคาเหมาต่อกลุ่ม แทนราคาต่อคน เก็บเป็นข้อความ "จำนวนคนสูงสุด=ราคา" คั่นด้วย comma
 *   เช่น "3=1500,4=2000" = 1-3 คน 1,500 บาท, 4 คน 2,000 บาท (เช่น ล่องแพ 1 ลำ)
 *   เว้นว่าง = คิดราคาต่อคนตาม adult_price / child_price ตามเดิม
 *
 * พร้อมปรับราคากิจกรรมเดี่ยว 6 รายการเป็นราคาที่ปางช้างกำหนด (ต.ค. 2026)
 * เฉพาะแถวที่ยังเป็นราคาตั้งต้นของเวอร์ชันก่อน — ราคาที่แอดมินแก้เองจากหลังบ้านไม่ถูกแตะ
 */

// slug: [ราคาผู้ใหญ่เดิม, ราคาเด็กเดิม, ราคาผู้ใหญ่ใหม่, ราคาเด็กใหม่, คอลัมน์อื่นที่ตั้งพร้อมกัน]
const NEW_PRICES = {
  'elephant-jungle-trekking': [990, 690, 1000, 500, {}],
  'elephant-bathing': [1290, 990, 1000, 500, {}],
  'elephant-feeding': [1890, 1500, 500, 250, {}],
  'vitamin-making': [990, 690, 1000, 500, {}],
  'bamboo-rafting': [1290, 990, 1500, 1500, { group_pricing: '3=1500,4=2000' }],
  ziplining: [1890, 1500, 1200, 1200, { adults_only: true }],
};

export async function up(knex) {
  if (!(await knex.schema.hasColumn('activities', 'adults_only'))) {
    await knex.schema.alterTable('activities', (table) => {
      table.boolean('adults_only').notNullable().defaultTo(false);
      table.string('group_pricing', 200);
    });
  }

  for (const [slug, [oldAdult, oldChild, adult, child, extra]] of Object.entries(NEW_PRICES)) {
    await knex('activities')
      .where({ slug, adult_price: oldAdult, child_price: oldChild })
      .update({ adult_price: adult, child_price: child, ...extra });
  }
}

export async function down(knex) {
  await knex.schema.alterTable('activities', (table) => {
    table.dropColumn('group_pricing');
    table.dropColumn('adults_only');
  });
}
