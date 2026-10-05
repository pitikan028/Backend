import config from './config/index.js';
import { createApp } from './app.js';
import { db, closeDb } from './db/knex.js';
import { waitForDatabase } from './db/wait.js';
import { flushNotifications } from './services/notification.service.js';

// ตอนรันบน Docker ให้ API รัน migration + seed เองตอนบูต จะได้ไม่ต้องสั่งมือหลัง compose up
const autoMigrate = process.env.AUTO_MIGRATE !== 'false';

async function bootstrap() {
  await waitForDatabase();

  if (autoMigrate) {
    const [, migrated] = await db.migrate.latest();
    if (migrated.length) console.log(`รัน migration ${migrated.length} ไฟล์เรียบร้อย`);

    if (process.env.AUTO_SEED !== 'false') {
      // seed ทุกไฟล์เขียนแบบ upsert จึงรันซ้ำตอนบูตได้โดยไม่สร้างข้อมูลซ้ำ
      await db.seed.run();
      console.log('ตรวจสอบข้อมูลตั้งต้นเรียบร้อย');
    }
  }

  const app = createApp();
  const server = app.listen(config.port, () => {
    console.log(`Chokchai API พร้อมใช้งานที่ http://localhost:${config.port}/api`);
    console.log(`ฐานข้อมูล: ${config.db.isPostgres ? 'PostgreSQL' : 'MySQL'} @ ${config.db.host}:${config.db.port}/${config.db.database}`);
  });

  const shutdown = async (signal) => {
    console.log(`\nได้รับสัญญาณ ${signal} กำลังปิดระบบ...`);
    server.close(async () => {
      // รอให้อีเมลที่กำลังส่งอยู่ไปให้ครบก่อนปิด connection ฐานข้อมูล
      await flushNotifications();
      await closeDb();
      process.exit(0);
    });
    // กันกรณี connection ค้างจนปิดไม่ลง
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch(async (error) => {
  console.error('เริ่มต้นเซิร์ฟเวอร์ไม่สำเร็จ:', error);
  await closeDb().catch(() => {});
  process.exit(1);
});
