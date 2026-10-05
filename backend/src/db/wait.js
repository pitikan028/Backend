import { db } from './knex.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * รอจนกว่าฐานข้อมูลจะพร้อมรับ connection
 * จำเป็นตอนรันบน Docker เพราะ container ของ API มักขึ้นก่อนที่ DB จะ init เสร็จ
 */
export async function waitForDatabase({ retries = 30, delayMs = 2000 } = {}) {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await db.raw('select 1');
      return;
    } catch (error) {
      if (attempt === retries) {
        throw new Error(`เชื่อมต่อฐานข้อมูลไม่สำเร็จหลังลอง ${retries} ครั้ง: ${error.message}`);
      }
      console.log(`รอฐานข้อมูลพร้อม... (ครั้งที่ ${attempt}/${retries})`);
      await sleep(delayMs);
    }
  }
}

export default waitForDatabase;
