import crypto from 'node:crypto';

// ตัดตัวอักษรที่สับสนกันง่าย (0/O, 1/I) ออก เพราะลูกค้าต้องอ่านรหัสนี้ทางโทรศัพท์
const REF_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/** สร้างรหัสอ้างอิงการจอง เช่น CEC-7QK4M2 */
export function generateBookingRef(length = 6) {
  const bytes = crypto.randomBytes(length);
  let code = '';
  for (let i = 0; i < length; i += 1) {
    code += REF_ALPHABET[bytes[i] % REF_ALPHABET.length];
  }
  return `CEC-${code}`;
}

/**
 * Knex คืนค่าคอลัมน์ decimal เป็น string บน PostgreSQL แต่เป็น number บน MySQL
 * แปลงให้เป็น number เสมอ เพื่อให้ JSON ที่ส่งออกหน้าตาเหมือนกันทั้งสองฐาน
 */
export function toNumber(value) {
  if (value === null || value === undefined) return value;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? value : parsed;
}

/** แปลงค่า boolean ของ MySQL (0/1) ให้เป็น true/false */
export function toBoolean(value) {
  return value === true || value === 1 || value === '1';
}

/** คืนวันที่รูปแบบ YYYY-MM-DD จาก Date หรือ string ที่ driver คืนมา */
export function toDateString(value) {
  if (!value) return null;
  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return String(value).slice(0, 10);
}

/** เดาว่าข้อความที่ผู้ใช้กรอกเป็นอีเมลหรือเบอร์โทร (ฟอร์มหน้าเว็บใช้ช่องเดียวรับทั้งสองแบบ) */
export function detectContactType(contact) {
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) return 'email';
  if (/^[+()\d\s-]{6,}$/.test(contact)) return 'phone';
  return 'unknown';
}

export default { generateBookingRef, toNumber, toBoolean, toDateString, detectContactType };
