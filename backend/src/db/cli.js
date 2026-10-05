/**
 * เครื่องมือจัดการฐานข้อมูลแบบเรียกผ่าน Knex API ตรง ๆ
 * (ไม่ใช้ knex CLI เพราะโปรเจกต์นี้เป็น ESM และ CLI ยังต้องตั้งค่าเพิ่ม)
 *
 *   npm run db:migrate    รัน migration ที่ยังไม่ได้รัน
 *   npm run db:rollback   ย้อน migration ชุดล่าสุด
 *   npm run db:seed       ใส่ข้อมูลตั้งต้น
 *   npm run db:reset      ล้าง schema ทั้งหมดแล้ว migrate + seed ใหม่
 */
import { db, closeDb } from './knex.js';
import { waitForDatabase } from './wait.js';

const commands = {
  async migrate() {
    const [batch, files] = await db.migrate.latest();
    if (files.length === 0) {
      console.log('ฐานข้อมูลเป็นเวอร์ชันล่าสุดอยู่แล้ว ไม่มี migration ใหม่');
      return;
    }
    console.log(`รัน migration batch ${batch} สำเร็จ:`);
    files.forEach((file) => console.log(`  - ${file}`));
  },

  async rollback() {
    const [batch, files] = await db.migrate.rollback();
    if (files.length === 0) {
      console.log('ไม่มี migration ให้ย้อนกลับ');
      return;
    }
    console.log(`ย้อน migration batch ${batch} สำเร็จ:`);
    files.forEach((file) => console.log(`  - ${file}`));
  },

  async seed() {
    const [files] = await db.seed.run();
    console.log('รัน seed สำเร็จ:');
    files.forEach((file) => console.log(`  - ${file}`));
  },

  async reset() {
    await db.migrate.rollback(undefined, true);
    console.log('ย้อน migration ทั้งหมดแล้ว');
    await commands.migrate();
    await commands.seed();
  },
};

const command = process.argv[2];

if (!command || !commands[command]) {
  console.error(`ใช้งาน: node src/db/cli.js <${Object.keys(commands).join('|')}>`);
  process.exit(1);
}

try {
  await waitForDatabase();
  await commands[command]();
  await closeDb();
  process.exit(0);
} catch (error) {
  console.error(`คำสั่ง "${command}" ล้มเหลว:`, error.message);
  await closeDb().catch(() => {});
  process.exit(1);
}
