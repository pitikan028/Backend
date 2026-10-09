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

/**
 * แปลงข้อความราคาเหมาต่อกลุ่ม "3=1500,4=2000" เป็น [{ max_guests: 3, price: 1500 }, { max_guests: 4, price: 2000 }]
 * เรียงจากกลุ่มเล็กไปใหญ่ คืน [] ถ้าไม่ได้ตั้งไว้หรือรูปแบบไม่ถูก (= คิดราคาต่อคนตามปกติ)
 */
export function parsePriceTiers(value) {
  if (!value) return [];
  const tiers = String(value)
    .split(',')
    .map((part) => part.trim().split('='))
    .filter((pair) => pair.length === 2)
    .map(([guests, price]) => ({ max_guests: Number.parseInt(guests, 10), price: Number(price) }))
    .filter((tier) => tier.max_guests > 0 && tier.price >= 0);
  return tiers.sort((a, b) => a.max_guests - b.max_guests);
}

/**
 * ราคาเหมาสำหรับ guests คน: แบ่งเป็นกลุ่มขนาดใหญ่สุดก่อน ที่เหลือใช้ช่วงราคาที่เล็กที่สุดที่รับได้
 * เช่น ช่วง 1-3 คน 1,500 / 4 คน 2,000 → 5 คน = 2,000 + 1,500, 8 คน = 2 × 2,000
 */
export function groupPrice(tiers, guests) {
  if (!tiers.length || guests <= 0) return 0;
  const largest = tiers[tiers.length - 1];
  const fullGroups = Math.floor(guests / largest.max_guests);
  const rest = guests % largest.max_guests;
  const restTier = rest > 0 ? tiers.find((tier) => tier.max_guests >= rest) : null;
  return fullGroups * largest.price + (restTier ? restTier.price : 0);
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

/**
 * เบอร์โทรในรูปแบบเดียวสำหรับเทียบกัน — เหลือแต่ตัวเลข และแปลงรหัสประเทศไทย +66 เป็น 0 นำหน้า
 * เช่น "089-000-1111" และ "+66 89 000 1111" ได้ "0890001111" เหมือนกัน
 */
export function normalizePhone(phone) {
  const text = String(phone ?? '').trim();
  const digits = text.replace(/\D/g, '');
  if (!digits) return null;
  return text.startsWith('+66') ? `0${digits.slice(2).replace(/^0/, '')}` : digits;
}

export default { generateBookingRef, toNumber, toBoolean, toDateString, detectContactType, normalizePhone };
