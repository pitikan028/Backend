import dotenv from 'dotenv';

dotenv.config();

const required = (key, fallback) => {
  const value = process.env[key] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const nodeEnv = process.env.NODE_ENV ?? 'development';
const isProduction = nodeEnv === 'production';

// DB_CLIENT เลือกได้ระหว่าง postgres (ค่าเริ่มต้น) กับ mysql
// โค้ดทุกส่วนเขียนผ่าน Knex query builder จึงใช้ได้กับทั้งสองฐานข้อมูลโดยไม่ต้องแก้ query
const dbClient = (process.env.DB_CLIENT ?? 'postgres').toLowerCase();
if (!['postgres', 'postgresql', 'pg', 'mysql', 'mysql2'].includes(dbClient)) {
  throw new Error(`Unsupported DB_CLIENT "${dbClient}" (use "postgres" or "mysql")`);
}
const isPostgres = dbClient.startsWith('p');

export const config = {
  nodeEnv,
  isProduction,
  port: toInt(process.env.PORT, 3000),
  // รายการ origin ที่อนุญาตให้เรียก API ข้ามโดเมน คั่นด้วย comma
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:8080,http://localhost:5500,http://127.0.0.1:5500')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  db: {
    client: isPostgres ? 'pg' : 'mysql2',
    isPostgres,
    host: process.env.DB_HOST ?? 'localhost',
    port: toInt(process.env.DB_PORT, isPostgres ? 5432 : 3306),
    user: process.env.DB_USER ?? 'chokchai',
    password: process.env.DB_PASSWORD ?? 'chokchai',
    database: process.env.DB_NAME ?? 'chokchai',
    poolMin: toInt(process.env.DB_POOL_MIN, 2),
    poolMax: toInt(process.env.DB_POOL_MAX, 10),
  },
  jwt: {
    // ใน production ต้องกำหนด JWT_SECRET เองเสมอ ห้ามใช้ค่า default
    secret: isProduction
      ? required('JWT_SECRET')
      : process.env.JWT_SECRET ?? 'dev-only-insecure-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
  },
  booking: {
    // จองล่วงหน้าอย่างน้อยกี่วัน และจองได้ไกลสุดกี่วัน
    minLeadDays: toInt(process.env.BOOKING_MIN_LEAD_DAYS, 1),
    maxAdvanceDays: toInt(process.env.BOOKING_MAX_ADVANCE_DAYS, 365),
    maxGuestsPerBooking: toInt(process.env.BOOKING_MAX_GUESTS, 30),
  },
  // URL ของหน้าเว็บที่ลูกค้าเปิด ใช้สร้างลิงก์ในอีเมลและ redirect หลังชำระเงิน
  appUrl: (process.env.APP_URL ?? 'http://localhost:8080').replace(/\/$/, ''),
  userJwtExpiresIn: process.env.USER_JWT_EXPIRES_IN ?? '7d',
  mail: {
    // ไม่ตั้ง SMTP_HOST = ไม่ส่งอีเมลจริง แต่ยังบันทึกลงตาราง notifications ให้ตรวจดูได้
    host: process.env.SMTP_HOST ?? '',
    port: toInt(process.env.SMTP_PORT, 587),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER ?? '',
    password: process.env.SMTP_PASSWORD ?? '',
    from: process.env.MAIL_FROM ?? 'Chokchai Elephant Camp <no-reply@chokchai.local>',
  },
  payment: {
    // ค่าเริ่มต้นของวิธีชำระเงิน (แอดมินเปลี่ยนได้ในหน้าตั้งค่าระบบ)
    // mock = หน้าชำระเงินจำลอง, promptpay = สแกน QR พร้อมเพย์, stripe = Stripe Checkout, none = ปิดการชำระออนไลน์
    provider: (process.env.PAYMENT_PROVIDER ?? 'mock').toLowerCase(),
    stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? '',
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
  },
  seedAdmin: {
    email: process.env.SEED_ADMIN_EMAIL ?? 'admin@chokchai.local',
    password: process.env.SEED_ADMIN_PASSWORD ?? 'Admin@1234',
    name: process.env.SEED_ADMIN_NAME ?? 'ผู้ดูแลระบบ',
  },
};

if (!['mock', 'promptpay', 'stripe', 'none'].includes(config.payment.provider)) {
  throw new Error(
    `Unsupported PAYMENT_PROVIDER "${config.payment.provider}" (use "mock", "promptpay", "stripe" or "none")`,
  );
}
if (config.payment.provider === 'stripe' && !config.payment.stripeSecretKey) {
  throw new Error('PAYMENT_PROVIDER=stripe ต้องกำหนด STRIPE_SECRET_KEY ด้วย');
}

export default config;
