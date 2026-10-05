import { db } from '../db/knex.js';
import config from '../config/index.js';
import ApiError from '../utils/ApiError.js';
import { isValidPromptPayId, normalizePromptPayId } from '../utils/promptpay.js';

/**
 * ค่าตั้งระบบทั้งหมดที่แอดมินแก้ได้ พร้อมค่าเริ่มต้น
 * public: true = ส่งให้หน้าเว็บได้ (GET /api/settings) ส่วนที่เหลือเห็นเฉพาะหลังบ้าน
 */
const DEFINITIONS = {
  opening_hours: { type: 'string', default: 'Daily 08:00 AM - 5:00 PM', public: true },
  contact_phone: { type: 'string', default: '095-447-2547', public: true },
  contact_line: { type: 'string', default: '@chokchaielephant', public: true },
  contact_email: { type: 'string', default: 'Chokchaielephantcampcnx@gmail.com', public: true },
  site_notice: { type: 'string', default: '', public: true },
  booking_min_lead_days: { type: 'int', default: config.booking.minLeadDays, public: true },
  booking_max_advance_days: { type: 'int', default: config.booking.maxAdvanceDays, public: true },
  booking_max_guests: { type: 'int', default: config.booking.maxGuestsPerBooking, public: true },
  cancel_free_hours: { type: 'int', default: 72, public: true },
  // เวลารับของแต่ละรอบ แสดงในขั้น "รับ-ส่ง" ของฟอร์มจอง
  pickup_time_morning: { type: 'string', default: '06:00 - 06:30 น.', public: true },
  pickup_time_afternoon: { type: 'string', default: '11:30 - 12:00 น.', public: true },
  // วิธีชำระเงินออนไลน์: mock / promptpay / stripe / none (ค่าเริ่มต้นมาจาก PAYMENT_PROVIDER ใน .env)
  payment_provider: { type: 'string', default: config.payment.provider, public: false },
  // บัญชีพร้อมเพย์ที่ใช้รับเงิน: เบอร์มือถือ 10 หลัก หรือเลข 13 หลัก และชื่อบัญชีที่ลูกค้าจะเห็นในแอปธนาคาร
  promptpay_id: { type: 'string', default: '', public: false },
  promptpay_name: { type: 'string', default: '', public: false },
  // อีเมลของทีมงานที่รับสำเนาแจ้งเตือนเมื่อมีการจองใหม่ / ยกเลิก (เว้นว่าง = ไม่ส่ง)
  admin_notify_email: { type: 'string', default: '', public: false },
};

export const SETTING_KEYS = Object.keys(DEFINITIONS);

const parse = (key, raw) => {
  const definition = DEFINITIONS[key];
  if (raw === null || raw === undefined) return definition.default;
  if (definition.type === 'int') {
    const value = Number.parseInt(raw, 10);
    return Number.isNaN(value) ? definition.default : value;
  }
  return String(raw);
};

export async function getSettings({ publicOnly = false } = {}) {
  const rows = await db('settings').select('key', 'value');
  const stored = Object.fromEntries(rows.map((row) => [row.key, row.value]));

  const settings = {};
  for (const key of SETTING_KEYS) {
    if (publicOnly && !DEFINITIONS[key].public) continue;
    settings[key] = parse(key, stored[key]);
  }
  return settings;
}

export async function updateSettings(input) {
  const changes = { ...input };
  if (changes.promptpay_id !== undefined) changes.promptpay_id = normalizePromptPayId(changes.promptpay_id);

  // ตรวจกับค่าหลังรวมการแก้ไขแล้ว กันเปิดวิธีชำระเงินที่ยังใช้ไม่ได้จริงจนลูกค้ากดจ่ายแล้วเจอ error
  const merged = { ...(await getSettings()), ...changes };
  if (merged.promptpay_id && !isValidPromptPayId(merged.promptpay_id)) {
    throw ApiError.unprocessable('หมายเลขพร้อมเพย์ต้องเป็นเบอร์มือถือ 10 หลัก หรือเลขประจำตัว 13 หลัก', [
      { field: 'promptpay_id', message: 'หมายเลขพร้อมเพย์ไม่ถูกต้อง' },
    ]);
  }
  if (merged.payment_provider === 'promptpay' && (!merged.promptpay_id || !merged.promptpay_name)) {
    throw ApiError.unprocessable('ต้องกรอกหมายเลขพร้อมเพย์และชื่อบัญชีก่อนเปิดรับชำระผ่าน PromptPay', [
      { field: 'promptpay_id', message: 'ต้องกรอกหมายเลขพร้อมเพย์และชื่อบัญชี' },
    ]);
  }
  if (merged.payment_provider === 'stripe' && !config.payment.stripeSecretKey) {
    throw ApiError.unprocessable('ยังไม่ได้ใส่ STRIPE_SECRET_KEY ในไฟล์ .env จึงเปิดใช้ Stripe ไม่ได้', [
      { field: 'payment_provider', message: 'ยังไม่ได้ตั้งค่าคีย์ของ Stripe' },
    ]);
  }

  await db.transaction(async (trx) => {
    for (const [key, value] of Object.entries(changes)) {
      if (!DEFINITIONS[key] || value === undefined) continue;
      const row = { key, value: String(value), updated_at: trx.fn.now() };
      // upsert แบบที่ใช้ได้ทั้ง PostgreSQL และ MySQL
      await trx('settings').insert(row).onConflict('key').merge();
    }
  });
  return getSettings();
}

/** กติกาการจองที่ใช้จริง = ค่าจากหน้าตั้งค่า ถ้าไม่เคยตั้งจะถอยไปใช้ค่าจาก .env */
export async function getBookingRules() {
  const settings = await getSettings();
  return {
    minLeadDays: settings.booking_min_lead_days,
    maxAdvanceDays: settings.booking_max_advance_days,
    maxGuests: settings.booking_max_guests,
    cancelFreeHours: settings.cancel_free_hours,
  };
}
