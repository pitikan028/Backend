import knexFactory from 'knex';
import config from '../config/index.js';
import { knexConfig } from '../../knexfile.js';

export const db = knexFactory(knexConfig);

/** true เมื่อฐานข้อมูลปัจจุบันคือ PostgreSQL (ใช้เลือก syntax ที่ต่างกันเล็กน้อย เช่น RETURNING) */
export const isPostgres = config.db.isPostgres;

/**
 * insert แล้วคืน record ที่เพิ่งสร้าง
 * PostgreSQL ใช้ RETURNING ได้ตรง ๆ ส่วน MySQL ต้อง select ตาม insertId
 */
export async function insertReturning(trx, table, data) {
  const query = trx(table).insert(data);
  if (isPostgres) {
    const [row] = await query.returning('*');
    return row;
  }
  const [insertId] = await query;
  return trx(table).where({ id: insertId }).first();
}

/** ปิด connection pool (ใช้ตอน graceful shutdown และตอนจบเทสต์) */
export async function closeDb() {
  await db.destroy();
}

export default db;
