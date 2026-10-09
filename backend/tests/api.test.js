/**
 * Integration test — ยิงผ่าน HTTP จริงไปที่ฐานข้อมูลจริง
 *
 * ต้องมีฐานข้อมูลรันอยู่ก่อน (docker compose up -d postgres) แล้วสั่ง:
 *   npm test
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import dayjs from 'dayjs';
import { createApp } from '../src/app.js';
import { db, closeDb } from '../src/db/knex.js';
import config from '../src/config/index.js';
import crypto from 'node:crypto';
import ExcelJS from 'exceljs';
import { verifyStripeSignature } from '../src/services/payment.service.js';
import { buildPromptPayPayload } from '../src/utils/promptpay.js';
import { flushNotifications } from '../src/services/notification.service.js';

const app = createApp();
const bookingDate = dayjs().add(30, 'day').format('YYYY-MM-DD');

let token;
let createdRef;

// บัญชีและการจองที่เทสต์สร้างใช้อีเมลโดเมนนี้ทั้งหมด จะได้ล้างออกได้หมดโดยไม่แตะข้อมูลจริง
const TEST_DOMAIN = '@test.chokchai.local';
const memberEmail = `member${TEST_DOMAIN}`;
const staffEmail = `staff${TEST_DOMAIN}`;

async function cleanupTestData() {
  await db('bookings').where('email', 'like', `%${TEST_DOMAIN}`).del();
  await db('users').where('email', 'like', `%${TEST_DOMAIN}`).del();
  await db('admin_users').where('email', 'like', `%${TEST_DOMAIN}`).del();
  await db('notifications').where('recipient', 'like', `%${TEST_DOMAIN}`).del();
}

// ค่าตั้งระบบจริงของร้าน (เช่น เปิดรับ PromptPay ไว้) — เทสต์รันในโหมดชำระจำลอง แล้วคืนค่าเดิมให้ตอนจบ
let savedSettings = [];

// PNG ขนาด 1x1 จุด ต่อท้ายด้วยไบต์ว่างให้ยาวพอผ่านเกณฑ์ขนาดขั้นต่ำ
const TINY_PNG = Buffer.concat([
  Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64'),
  Buffer.alloc(120),
]);
const slipDataUrl = (buffer = TINY_PNG, type = 'image/png') => `data:${type};base64,${buffer.toString('base64')}`;

beforeAll(async () => {
  await db.migrate.latest();
  await db.seed.run();

  savedSettings = await db('settings').select('key', 'value');
  await db('settings').del();

  // ล้างการจองของวันที่ที่เทสต์ใช้ เพื่อให้รันซ้ำได้ผลเหมือนเดิม
  await db('bookings').where({ booking_date: bookingDate }).del();
  await cleanupTestData();
}, 60_000);

afterAll(async () => {
  await flushNotifications();
  await db('bookings').where({ booking_date: bookingDate }).del();
  await cleanupTestData();
  await db('settings').del();
  if (savedSettings.length) await db('settings').insert(savedSettings);
  await closeDb();
});

describe('health & catalog', () => {
  it('GET /api/health ตอบ ok', async () => {
    const res = await request(app).get('/api/health').expect(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /api/activities คืน 12 รายการที่ seed ไว้ (6 กิจกรรม + 6 แพ็กเกจ)', async () => {
    const res = await request(app).get('/api/activities').expect(200);
    expect(res.body.data).toHaveLength(12);
    expect(res.body.data[0]).toMatchObject({ slug: 'elephant-jungle-trekking', adult_price: 1000, child_price: 500 });
  });

  it('GET /api/activities/:slug ที่ไม่มีอยู่ คืน 404', async () => {
    await request(app).get('/api/activities/ไม่มีจริง-slug').expect(422); // slug ผิด pattern
    await request(app).get('/api/activities/no-such-activity').expect(404);
  });

  it('GET availability คืนที่ว่างตาม daily_capacity', async () => {
    const res = await request(app)
      .get('/api/activities/elephant-bathing/availability')
      .query({ date: bookingDate })
      .expect(200);

    expect(res.body.data).toMatchObject({ capacity: 30, booked: 0, remaining: 30, is_available: true });
  });
});

describe('POST /api/bookings', () => {
  const validBooking = {
    activity_slug: 'elephant-bathing',
    adults: 2,
    children: 1,
    infants: 0,
    first_name: 'สมชาย',
    last_name: 'ใจดี',
    phone: '081-234-5678',
    email: 'Somchai.Test@example.com',
    contact_app: 'Line',
    pickup_type: 'hotel',
    pickup_detail: 'Nimman Hotel',
    accept_terms: true,
  };

  it('สร้างการจองได้ และคำนวณยอดจากราคาในฐานข้อมูล', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .send({ ...validBooking, booking_date: bookingDate })
      .expect(201);

    // 2 ผู้ใหญ่ × 1000 + 1 เด็ก × 500 = 2500
    expect(res.body.data.total_amount).toBe(2500);
    expect(res.body.data.booking_ref).toMatch(/^CEC-[A-Z0-9]{6}$/);
    expect(res.body.data.status).toBe('pending');
    expect(res.body.data.email).toBe('somchai.test@example.com');

    createdRef = res.body.data.booking_ref;
  });

  it('ที่ว่างลดลงหลังจองสำเร็จ', async () => {
    const res = await request(app)
      .get('/api/activities/elephant-bathing/availability')
      .query({ date: bookingDate })
      .expect(200);

    expect(res.body.data).toMatchObject({ booked: 3, remaining: 27 });
  });

  it('ปฏิเสธเมื่อไม่ยอมรับเงื่อนไข', async () => {
    await request(app)
      .post('/api/bookings')
      .send({ ...validBooking, booking_date: bookingDate, accept_terms: false })
      .expect(422);
  });

  it('ปฏิเสธเมื่อไม่มีผู้ใหญ่และเด็กเลย', async () => {
    await request(app)
      .post('/api/bookings')
      .send({ ...validBooking, booking_date: bookingDate, adults: 0, children: 0, infants: 1 })
      .expect(422);
  });

  it('ปฏิเสธวันที่ย้อนหลัง', async () => {
    await request(app)
      .post('/api/bookings')
      .send({ ...validBooking, booking_date: dayjs().subtract(1, 'day').format('YYYY-MM-DD') })
      .expect(400);
  });

  it('ปฏิเสธอีเมลผิดรูปแบบ', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .send({ ...validBooking, booking_date: bookingDate, email: 'ไม่ใช่อีเมล' })
      .expect(422);

    expect(res.body.error.details.some((item) => item.field === 'email')).toBe(true);
  });

  it('ปฏิเสธเมื่อที่ว่างไม่พอ (409)', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .send({ ...validBooking, booking_date: bookingDate, adults: 100, children: 0 })
      .expect(422); // เกิน BOOKING_MAX_GUESTS ก่อน

    expect(res.body.error.message).toBeTruthy();

    // จองจนเต็มโควตา 30 ที่ (ใช้ไปแล้ว 3) แล้วจองเกินอีกครั้ง
    await request(app)
      .post('/api/bookings')
      .send({ ...validBooking, booking_date: bookingDate, adults: 27, children: 0 })
      .expect(201);

    const overflow = await request(app)
      .post('/api/bookings')
      .send({ ...validBooking, booking_date: bookingDate, adults: 1, children: 0 })
      .expect(409);

    expect(overflow.body.error.message).toContain('เต็มแล้ว');
  });
});

describe('GET /api/bookings/:ref', () => {
  it('ดูการจองได้เมื่ออีเมลตรง', async () => {
    const res = await request(app)
      .get(`/api/bookings/${createdRef}`)
      .query({ email: 'somchai.test@example.com' })
      .expect(200);

    expect(res.body.data.booking_ref).toBe(createdRef);
  });

  it('ไม่เปิดเผยข้อมูลเมื่ออีเมลไม่ตรง', async () => {
    await request(app)
      .get(`/api/bookings/${createdRef}`)
      .query({ email: 'someone.else@example.com' })
      .expect(404);
  });
});

describe('reviews / faqs / inquiries', () => {
  it('GET /api/reviews คืนเฉพาะรีวิวที่เผยแพร่แล้ว', async () => {
    const res = await request(app).get('/api/reviews').expect(200);
    expect(res.body.data.every((review) => review.is_published)).toBe(true);
    expect(res.body.meta.average_rating).toBeGreaterThan(0);
  });

  it('GET /api/faqs คืนรายการคำถาม', async () => {
    const res = await request(app).get('/api/faqs').expect(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('POST /api/inquiries บันทึกคำถามได้', async () => {
    const res = await request(app)
      .post('/api/inquiries')
      .send({ contact: 'test@example.com', message: 'มีรถรับส่งจากสนามบินไหมครับ' })
      .expect(201);

    expect(res.body.data.message).toContain('เรียบร้อย');
    await db('inquiries').where({ contact: 'test@example.com' }).del();
  });
});

describe('auth & admin', () => {
  it('ปฏิเสธรหัสผ่านผิด', async () => {
    await request(app)
      .post('/api/auth/login')
      .send({ email: config.seedAdmin.email, password: 'wrong-password' })
      .expect(401);
  });

  it('เข้าสู่ระบบสำเร็จแล้วได้ token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: config.seedAdmin.email, password: config.seedAdmin.password })
      .expect(200);

    expect(res.body.data.token).toBeTruthy();
    token = res.body.data.token;
  });

  it('เรียก /api/admin/* โดยไม่มี token ไม่ได้', async () => {
    await request(app).get('/api/admin/bookings').expect(401);
  });

  it('ดูรายการจองได้เมื่อมี token', async () => {
    const res = await request(app)
      .get('/api/admin/bookings')
      .query({ q: 'somchai.test' })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.meta.total).toBeGreaterThan(0);
  });

  it('เปลี่ยนสถานะการจองตามลำดับที่อนุญาตเท่านั้น', async () => {
    const booking = await db('bookings').where({ booking_ref: createdRef }).first();

    await request(app)
      .patch(`/api/admin/bookings/${booking.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'completed' })
      .expect(409); // pending → completed ข้ามขั้นไม่ได้

    await request(app)
      .patch(`/api/admin/bookings/${booking.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'confirmed' })
      .expect(200);

    const res = await request(app)
      .patch(`/api/admin/bookings/${booking.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'completed', payment_status: 'paid' })
      .expect(200);

    expect(res.body.data.status).toBe('completed');
    expect(res.body.data.payment_status).toBe('paid');
  });

  it('GET /api/admin/stats คืนตัวเลขสรุป', async () => {
    const res = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.data.bookings.total).toBeGreaterThan(0);
    expect(res.body.data).toHaveProperty('revenue_thb');
  });
});

describe('ค้นหาและกรองกิจกรรม', () => {
  it('ค้นด้วยคำค้นได้ทั้งชื่ออังกฤษและไทย', async () => {
    const english = await request(app).get('/api/activities').query({ q: 'bathing' }).expect(200);
    // แพ็กเกจรวมกิจกรรมที่พูดถึงการอาบน้ำช้างก็ถูกค้นเจอด้วย จึงเช็กแค่ว่ากิจกรรมหลักอยู่ในผลลัพธ์
    expect(english.body.data.map((item) => item.slug)).toContain('elephant-bathing');

    const thai = await request(app).get('/api/activities').query({ q: 'ล่องแพ' }).expect(200);
    expect(thai.body.data.map((item) => item.slug)).toContain('bamboo-rafting');
  });

  it('กรองตามหมวดหมู่ ราคาสูงสุด และเรียงตามราคา', async () => {
    const adventure = await request(app).get('/api/activities').query({ category: 'adventure' }).expect(200);
    expect(adventure.body.data.map((item) => item.slug).sort()).toEqual(['bamboo-rafting', 'ziplining']);
    expect(adventure.body.meta.categories).toEqual(['adventure', 'elephant', 'package', 'workshop']);

    const cheap = await request(app).get('/api/activities').query({ max_price: 1000 }).expect(200);
    expect(cheap.body.data.every((item) => item.adult_price <= 1000)).toBe(true);
    expect(cheap.body.data.length).toBeGreaterThan(0);

    const sorted = await request(app).get('/api/activities').query({ sort: 'price_desc' }).expect(200);
    expect(sorted.body.data[0].adult_price).toBe(1800);
  });

  it('GET /api/settings ไม่เปิดเผยค่าที่ใช้เฉพาะหลังบ้าน', async () => {
    const res = await request(app).get('/api/settings').expect(200);
    expect(res.body.data).toHaveProperty('opening_hours');
    expect(res.body.data).toHaveProperty('cancel_free_hours');
    expect(res.body.data).not.toHaveProperty('admin_notify_email');
  });
});

describe('สมาชิก: สมัคร / เข้าสู่ระบบ / โปรไฟล์', () => {
  const account = {
    email: memberEmail.toUpperCase(),
    password: 'Passw0rd!',
    first_name: 'มานี',
    last_name: 'ทดสอบ',
    phone: '089-000-1111',
  };
  let userToken;
  let memberRef;

  const memberBooking = (overrides = {}) => ({
    activity_slug: 'vitamin-making',
    booking_date: bookingDate,
    adults: 2,
    children: 0,
    infants: 0,
    first_name: 'มานี',
    last_name: 'ทดสอบ',
    phone: '089-000-1111',
    email: memberEmail,
    accept_terms: true,
    ...overrides,
  });

  it('ปฏิเสธรหัสผ่านที่อ่อนเกินไป', async () => {
    const res = await request(app)
      .post('/api/account/register')
      .send({ ...account, password: 'short' })
      .expect(422);
    expect(res.body.error.details.some((item) => item.field === 'password')).toBe(true);
  });

  it('สมัครสมาชิกได้ และได้ token กลับมา', async () => {
    const res = await request(app).post('/api/account/register').send(account).expect(201);

    expect(res.body.data.user.email).toBe(memberEmail);
    expect(res.body.data.user).not.toHaveProperty('password_hash');
    userToken = res.body.data.token;
  });

  it('สมัครซ้ำด้วยอีเมลเดิมไม่ได้', async () => {
    await request(app).post('/api/account/register').send(account).expect(409);
  });

  it('เข้าสู่ระบบได้ และรหัสผิดถูกปฏิเสธ', async () => {
    await request(app)
      .post('/api/account/login')
      .send({ email: memberEmail, password: 'wrong-password1' })
      .expect(401);

    const res = await request(app)
      .post('/api/account/login')
      .send({ email: memberEmail, password: account.password })
      .expect(200);
    expect(res.body.data.token).toBeTruthy();
  });

  it('เข้าสู่ระบบด้วยเบอร์โทรได้ ไม่ว่าจะพิมพ์รูปแบบไหน', async () => {
    for (const identifier of ['089-000-1111', '0890001111', '+66 89 000 1111']) {
      const res = await request(app)
        .post('/api/account/login')
        .send({ identifier, password: account.password })
        .expect(200);
      expect(res.body.data.user.email).toBe(memberEmail);
    }

    await request(app)
      .post('/api/account/login')
      .send({ identifier: '089-000-1111', password: 'wrong-password1' })
      .expect(401);
    await request(app)
      .post('/api/account/login')
      .send({ identifier: '080-000-0000', password: account.password })
      .expect(401);
    await request(app).post('/api/account/login').send({ password: account.password }).expect(422);
  });

  it('สมัครด้วยเบอร์โทรที่มีบัญชีอื่นใช้อยู่ไม่ได้', async () => {
    const res = await request(app)
      .post('/api/account/register')
      .send({ ...account, email: `other${TEST_DOMAIN}`, phone: '+66890001111' })
      .expect(409);
    expect(res.body.error.details.some((item) => item.field === 'phone')).toBe(true);
  });

  it('บันทึกแอปติดต่อ + ไอดี และรอบเวลารับของการจอง', async () => {
    const profile = await request(app)
      .patch('/api/account/me')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ contact_app: 'Instagram', contact_id: '@manee.travel' })
      .expect(200);
    expect(profile.body.data).toMatchObject({ contact_app: 'Instagram', contact_id: '@manee.travel' });

    const guestEmail = `contact${TEST_DOMAIN}`;
    const created = await request(app)
      .post('/api/bookings')
      .send(memberBooking({ email: guestEmail, contact_app: 'Line', contact_id: 'manee_line', pickup_round: 'afternoon' }))
      .expect(201);
    expect(created.body.data).toMatchObject({ contact_app: 'Line', contact_id: 'manee_line', pickup_round: 'afternoon' });

    // ไม่ส่งรอบมา = รอบเช้า และแอปที่ไม่รู้จักถูกปฏิเสธ
    const fallback = await request(app).post('/api/bookings').send(memberBooking({ email: guestEmail })).expect(201);
    expect(fallback.body.data.pickup_round).toBe('morning');
    await request(app).post('/api/bookings').send(memberBooking({ email: guestEmail, contact_app: 'Telegram' })).expect(422);
    await request(app).post('/api/bookings').send(memberBooking({ email: guestEmail, pickup_round: 'night' })).expect(422);

    await db('bookings').where({ email: guestEmail }).del();
  });

  it('token ของลูกค้าเข้าหลังบ้านไม่ได้ และ token แอดมินเข้าหน้าบัญชีไม่ได้', async () => {
    await request(app).get('/api/admin/bookings').set('Authorization', `Bearer ${userToken}`).expect(403);
    await request(app).get('/api/account/me').set('Authorization', `Bearer ${token}`).expect(401);
  });

  it('แก้ไขโปรไฟล์และเปลี่ยนรหัสผ่านได้', async () => {
    const res = await request(app)
      .patch('/api/account/me')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ phone: '089-999-2222', contact_app: 'WhatsApp' })
      .expect(200);
    expect(res.body.data).toMatchObject({ phone: '089-999-2222', contact_app: 'WhatsApp', first_name: 'มานี' });

    await request(app)
      .post('/api/account/password')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ current_password: 'not-the-password1', new_password: 'NewPassw0rd' })
      .expect(400);

    await request(app)
      .post('/api/account/password')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ current_password: account.password, new_password: 'NewPassw0rd' })
      .expect(200);

    await request(app).post('/api/account/login').send({ email: memberEmail, password: 'NewPassw0rd' }).expect(200);
  });

  it('การจองตอนล็อกอินอยู่เข้าไปอยู่ในประวัติของบัญชี พร้อมการแจ้งเตือน', async () => {
    const created = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${userToken}`)
      .send(memberBooking())
      .expect(201);

    memberRef = created.body.data.booking_ref;
    expect(created.body.data.payment.provider).toBe(config.payment.provider);

    const history = await request(app)
      .get('/api/account/bookings')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    expect(history.body.data.map((item) => item.booking_ref)).toContain(memberRef);
    expect(history.body.data[0].cancellation.can_cancel).toBe(true);

    const notifications = await request(app)
      .get('/api/account/notifications')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    expect(notifications.body.data.map((item) => item.type)).toEqual(
      expect.arrayContaining(['welcome', 'booking_created']),
    );
    expect(notifications.body.meta.unread).toBeGreaterThanOrEqual(2);

    await request(app)
      .post('/api/account/notifications/read')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(204);
    const after = await request(app)
      .get('/api/account/notifications')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    expect(after.body.meta.unread).toBe(0);
  });

  it('ดูการจองของคนอื่นผ่านหน้าบัญชีไม่ได้', async () => {
    await request(app)
      .get(`/api/account/bookings/${createdRef}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(404);
  });

  it('ชำระเงิน (จำลอง) แล้วการจองถูกยืนยันอัตโนมัติ', async () => {
    const checkout = await request(app)
      .post(`/api/account/bookings/${memberRef}/pay`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    const url = new URL(checkout.body.data.checkout_url);
    const paymentToken = url.searchParams.get('token');
    expect(url.pathname).toBe('/payment.html');

    // token ผิดต้องเปิดหน้าชำระเงินไม่ได้
    await request(app).get('/api/payments/status').query({ ref: memberRef, token: 'x'.repeat(40) }).expect(403);

    const before = await request(app)
      .get('/api/payments/status')
      .query({ ref: memberRef, token: paymentToken })
      .expect(200);
    expect(before.body.data).toMatchObject({ payment_status: 'unpaid', total_amount: 2000 });

    const paid = await request(app)
      .post('/api/payments/mock/confirm')
      .send({ ref: memberRef, token: paymentToken })
      .expect(200);
    expect(paid.body.data).toMatchObject({ payment_status: 'paid', status: 'confirmed', payment_method: 'mock' });

    // จ่ายซ้ำไม่ได้
    await request(app)
      .post(`/api/account/bookings/${memberRef}/pay`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(409);

    const [{ count }] = await db('notifications')
      .where({ recipient: memberEmail, type: 'payment_received' })
      .count({ count: '*' });
    expect(Number(count)).toBe(1);
  });

  it('ยกเลิกการจองเองได้ครั้งเดียว และที่นั่งถูกคืน', async () => {
    const res = await request(app)
      .post(`/api/account/bookings/${memberRef}/cancel`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ reason: 'เปลี่ยนแผนเดินทาง' })
      .expect(200);

    expect(res.body.data).toMatchObject({ status: 'cancelled', cancel_reason: 'เปลี่ยนแผนเดินทาง' });
    expect(res.body.data.cancellation.can_cancel).toBe(false);

    await request(app)
      .post(`/api/account/bookings/${memberRef}/cancel`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({})
      .expect(409);

    const availability = await request(app)
      .get('/api/activities/vitamin-making/availability')
      .query({ date: bookingDate })
      .expect(200);
    expect(availability.body.data.booked).toBe(0);
  });

  it('guest ยกเลิกได้ด้วยรหัส + อีเมล แต่ต้องอยู่ในกำหนดเวลา', async () => {
    const guestEmail = `guest${TEST_DOMAIN}`;
    const far = await request(app)
      .post('/api/bookings')
      .send(memberBooking({ email: guestEmail }))
      .expect(201);

    await request(app)
      .post(`/api/bookings/${far.body.data.booking_ref}/cancel`)
      .send({ email: `someone-else${TEST_DOMAIN}` })
      .expect(404);

    await request(app)
      .post(`/api/bookings/${far.body.data.booking_ref}/cancel`)
      .send({ email: guestEmail })
      .expect(200);

    // จองวันพรุ่งนี้ = เหลือไม่ถึง 72 ชั่วโมง ยกเลิกออนไลน์ไม่ได้แล้ว
    const soon = await request(app)
      .post('/api/bookings')
      .send(memberBooking({ email: guestEmail, booking_date: dayjs().add(1, 'day').format('YYYY-MM-DD') }))
      .expect(201);

    const late = await request(app)
      .post(`/api/bookings/${soon.body.data.booking_ref}/cancel`)
      .send({ email: guestEmail })
      .expect(409);
    expect(late.body.error.message).toContain('เลยกำหนด');
  });

  it('แอดมินระงับบัญชีแล้ว token เดิมใช้ไม่ได้ทันที', async () => {
    const list = await request(app)
      .get('/api/admin/users')
      .query({ q: 'member@test' })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const member = list.body.data.find((item) => item.email === memberEmail);
    expect(member.booking_count).toBe(1);

    await request(app)
      .patch(`/api/admin/users/${member.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ is_active: false })
      .expect(200);

    await request(app).get('/api/account/me').set('Authorization', `Bearer ${userToken}`).expect(401);
    await request(app).post('/api/account/login').send({ email: memberEmail, password: 'NewPassw0rd' }).expect(403);
  });
});

describe('หลังบ้าน: รายงาน / ตั้งค่า / ทีมงาน / กิจกรรม', () => {
  it('GET /api/admin/reports รวมยอดตามวันและตามกิจกรรม', async () => {
    const res = await request(app).get('/api/admin/reports').set('Authorization', `Bearer ${token}`).expect(200);

    expect(res.body.data.daily).toHaveLength(30);
    expect(res.body.data.totals.bookings).toBeGreaterThan(0);
    expect(res.body.data.by_activity.length).toBeGreaterThan(0);

    const today = res.body.data.daily.at(-1);
    expect(today.date).toBe(dayjs().format('YYYY-MM-DD'));
    expect(today.bookings).toBeGreaterThan(0);

    await request(app)
      .get('/api/admin/reports')
      .query({ from: '2026-02-10', to: '2026-02-01' })
      .set('Authorization', `Bearer ${token}`)
      .expect(422);
  });

  it('แก้ค่าตั้งระบบแล้วกติกาการจองเปลี่ยนตามทันที', async () => {
    const original = await request(app).get('/api/admin/settings').set('Authorization', `Bearer ${token}`).expect(200);

    try {
      const updated = await request(app)
        .put('/api/admin/settings')
        .set('Authorization', `Bearer ${token}`)
        .send({ booking_max_guests: 2, opening_hours: 'ทุกวัน 09:00 - 16:00' })
        .expect(200);
      expect(updated.body.data).toMatchObject({ booking_max_guests: 2, opening_hours: 'ทุกวัน 09:00 - 16:00' });

      const rejected = await request(app)
        .post('/api/bookings')
        .send({
          activity_slug: 'ziplining',
          booking_date: bookingDate,
          adults: 3,
          first_name: 'เกิน',
          last_name: 'โควตา',
          phone: '080-000-0000',
          email: `guest${TEST_DOMAIN}`,
          accept_terms: true,
        })
        .expect(422);
      expect(rejected.body.error.message).toContain('สูงสุด 2 คน');
    } finally {
      await request(app)
        .put('/api/admin/settings')
        .set('Authorization', `Bearer ${token}`)
        .send({
          booking_max_guests: original.body.data.booking_max_guests,
          opening_hours: original.body.data.opening_hours,
        })
        .expect(200);
    }
  });

  it('สร้างบัญชี staff ได้ และ staff แก้ค่าตั้งระบบไม่ได้', async () => {
    const created = await request(app)
      .post('/api/admin/staff')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: staffEmail, password: 'StaffPass1', name: 'พนักงานทดสอบ' })
      .expect(201);
    expect(created.body.data).toMatchObject({ email: staffEmail, role: 'staff' });

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: staffEmail, password: 'StaffPass1' })
      .expect(200);
    const staffToken = login.body.data.token;

    await request(app).get('/api/admin/bookings').set('Authorization', `Bearer ${staffToken}`).expect(200);
    await request(app)
      .put('/api/admin/settings')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ site_notice: 'x' })
      .expect(403);
    await request(app).get('/api/admin/staff').set('Authorization', `Bearer ${staffToken}`).expect(403);

    await request(app)
      .patch(`/api/admin/staff/${created.body.data.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ is_active: false })
      .expect(200);
    await request(app).get('/api/admin/bookings').set('Authorization', `Bearer ${staffToken}`).expect(401);
  });

  it('แอดมินปิดบัญชีตัวเองไม่ได้', async () => {
    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`).expect(200);
    await request(app)
      .patch(`/api/admin/staff/${me.body.data.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ is_active: false })
      .expect(409);
  });

  it('แก้กิจกรรมบางฟิลด์แล้วฟิลด์อื่นไม่ถูกรีเซ็ตเป็นค่าเริ่มต้น', async () => {
    const before = await db('activities').where({ slug: 'elephant-bathing' }).first();

    const res = await request(app)
      .patch(`/api/admin/activities/${before.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ description_th: before.description_th })
      .expect(200);

    expect(res.body.data).toMatchObject({
      daily_capacity: before.daily_capacity,
      sort_order: before.sort_order,
      category: before.category,
    });
  });

  it('กิจกรรมมีข้อความภาษาอังกฤษ และแอดมินแก้ได้', async () => {
    const before = await db('activities').where({ slug: 'elephant-bathing' }).first();
    const list = await request(app).get('/api/activities').expect(200);
    expect(list.body.data.find((item) => item.slug === 'elephant-bathing')).toHaveProperty('description_en');

    try {
      const res = await request(app)
        .patch(`/api/admin/activities/${before.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ duration_label_en: '90 minutes', highlights_en: '' })
        .expect(200);
      expect(res.body.data).toMatchObject({ duration_label_en: '90 minutes', highlights_en: '' });
    } finally {
      await db('activities')
        .where({ id: before.id })
        .update({ duration_label_en: before.duration_label_en, highlights_en: before.highlights_en });
    }
  });

  it('ล่องแพคิดราคาเหมาต่อแพ และโหนสลิงรับเฉพาะผู้ใหญ่', async () => {
    const guest = (overrides) => ({
      booking_date: bookingDate,
      children: 0,
      infants: 0,
      first_name: 'ราคา',
      last_name: 'เหมา',
      phone: '080-000-0000',
      email: `pricing${TEST_DOMAIN}`,
      accept_terms: true,
      ...overrides,
    });

    // 1-3 คน 1,500 / 4 คน 2,000 / 5 คน = แพ 4 คน + แพ 1 คน
    for (const [adults, children, total] of [
      [2, 0, 1500],
      [2, 1, 1500],
      [3, 1, 2000],
      [4, 1, 3500],
    ]) {
      const res = await request(app)
        .post('/api/bookings')
        .send(guest({ activity_slug: 'bamboo-rafting', adults, children }))
        .expect(201);
      expect(res.body.data.total_amount).toBe(total);
    }

    await request(app).post('/api/bookings').send(guest({ activity_slug: 'ziplining', adults: 1, children: 1 })).expect(422);
    const zip = await request(app).post('/api/bookings').send(guest({ activity_slug: 'ziplining', adults: 2 })).expect(201);
    expect(zip.body.data.total_amount).toBe(2400);
  });

  it('GET /api/admin/bookings/export ส่งไฟล์ Excel ตามตัวกรอง', async () => {
    await request(app).get('/api/admin/bookings/export').expect(401);

    const res = await request(app)
      .get('/api/admin/bookings/export')
      .query({ date_from: bookingDate, date_to: bookingDate })
      .set('Authorization', `Bearer ${token}`)
      .buffer(true)
      .parse((response, callback) => {
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => callback(null, Buffer.concat(chunks)));
      })
      .expect(200);

    expect(res.headers['content-type']).toContain('spreadsheetml');
    expect(res.headers['content-disposition']).toMatch(/filename="chokchai-bookings-.+\.xlsx"/);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(res.body);
    const sheet = workbook.getWorksheet('Bookings');
    const expected = await db('bookings').where({ booking_date: bookingDate }).count({ count: '*' });

    expect(sheet.getRow(1).getCell(1).value).toBe('รหัสการจอง');
    expect(sheet.rowCount - 1).toBe(Number(expected[0].count));
    expect(sheet.rowCount).toBeGreaterThan(1);
    expect(String(sheet.getRow(2).getCell(1).value)).toMatch(/^CEC-/);
  });
});

describe('PromptPay', () => {
  it('สร้าง payload ตรงตามมาตรฐาน (เทียบกับค่าอ้างอิงที่รู้คำตอบ)', () => {
    expect(buildPromptPayPayload('0899999999')).toBe(
      '00020101021129370016A000000677010111011300668999999995802TH53037646304FE29',
    );
    // มียอดเงิน = QR แบบใช้ครั้งเดียว (010212) และมีฟิลด์ 54 เป็นยอด 2 ตำแหน่งทศนิยม
    const withAmount = buildPromptPayPayload('089-999-9999', 1290);
    expect(withAmount).toContain('010212');
    expect(withAmount).toContain('54071290.00');
    expect(buildPromptPayPayload('1234567890123', 50.5)).toContain('02131234567890123');
    expect(() => buildPromptPayPayload('12345')).toThrow();
  });

  it('เปิด PromptPay ไม่ได้ถ้ายังไม่กรอกบัญชี และหมายเลขผิดรูปแบบถูกปฏิเสธ', async () => {
    const current = await request(app).get('/api/admin/settings').set('Authorization', `Bearer ${token}`).expect(200);
    if (!current.body.data.promptpay_id) {
      await request(app)
        .put('/api/admin/settings')
        .set('Authorization', `Bearer ${token}`)
        .send({ payment_provider: 'promptpay' })
        .expect(422);
    }
    await request(app)
      .put('/api/admin/settings')
      .set('Authorization', `Bearer ${token}`)
      .send({ promptpay_id: '12345' })
      .expect(422);
  });

  it('ลูกค้าสแกนจ่าย → แจ้งโอน → รอตรวจสอบ → แอดมินบันทึกรับเงิน', async () => {
    const original = await request(app).get('/api/admin/settings').set('Authorization', `Bearer ${token}`).expect(200);
    const guestEmail = `promptpay${TEST_DOMAIN}`;

    try {
      await request(app)
        .put('/api/admin/settings')
        .set('Authorization', `Bearer ${token}`)
        .send({ payment_provider: 'promptpay', promptpay_id: '089-999-9999', promptpay_name: 'ร้านทดสอบ' })
        .expect(200);

      const publicSettings = await request(app).get('/api/settings').expect(200);
      expect(publicSettings.body.data.payment_provider).toBe('promptpay');
      expect(publicSettings.body.data).not.toHaveProperty('promptpay_id');

      const created = await request(app)
        .post('/api/bookings')
        .send({
          activity_slug: 'elephant-feeding',
          booking_date: bookingDate,
          adults: 1,
          first_name: 'พร้อม',
          last_name: 'เพย์',
          phone: '080-111-2222',
          email: guestEmail,
          accept_terms: true,
        })
        .expect(201);
      const { booking_ref: ref, payment } = created.body.data;

      const checkout = await request(app).post(`/api/bookings/${ref}/pay`).send({ email: guestEmail }).expect(200);
      expect(checkout.body.data.checkout_url).toContain('mode=promptpay');

      const status = await request(app).get('/api/payments/status').query({ ref, token: payment.token }).expect(200);
      expect(status.body.data.promptpay.qr_image).toMatch(/^data:image\/png;base64,/);
      expect(status.body.data.promptpay).toMatchObject({ account_name: 'ร้านทดสอบ', account_id: '089-xxx-9999' });

      // โหมดจำลองต้องใช้ไม่ได้เมื่อเปิดรับเงินจริง
      await request(app).post('/api/payments/mock/confirm').send({ ref, token: payment.token }).expect(404);

      // ไฟล์ที่ไม่ใช่รูปจริงถูกปฏิเสธ แม้จะตั้งชื่อชนิดเป็นรูป
      const fake = await request(app)
        .post('/api/payments/promptpay/notify')
        .send({ ref, token: payment.token, slip: slipDataUrl(Buffer.from('<script>alert(1)</script>'.repeat(10)), 'image/png') })
        .expect(422);
      expect(fake.body.error.details[0].field).toBe('slip');
      await request(app)
        .post('/api/payments/promptpay/notify')
        .send({ ref, token: payment.token, slip: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=' })
        .expect(422);

      const notified = await request(app)
        .post('/api/payments/promptpay/notify')
        .send({ ref, token: payment.token, note: 'โอน 14:32 น.', slip: slipDataUrl() })
        .expect(200);
      expect(notified.body.data).toMatchObject({ payment_status: 'reviewing', status: 'pending', has_slip: true });
      expect(notified.body.data).not.toHaveProperty('promptpay');

      await request(app).post('/api/payments/promptpay/notify').send({ ref, token: payment.token }).expect(409);
      await request(app).post(`/api/bookings/${ref}/pay`).send({ email: guestEmail }).expect(409);

      const stats = await request(app).get('/api/admin/stats').set('Authorization', `Bearer ${token}`).expect(200);
      expect(stats.body.data.payments_to_review).toBeGreaterThanOrEqual(1);

      const list = await request(app)
        .get('/api/admin/bookings')
        .query({ payment_status: 'reviewing', q: guestEmail })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(list.body.data[0]).toMatchObject({ booking_ref: ref, payment_method: 'promptpay', payment_ref: 'โอน 14:32 น.' });
      expect(list.body.data[0].slip_uploaded_at).toBeTruthy();

      // สลิปเปิดดูได้เฉพาะหลังบ้าน และได้ไฟล์เดิมกลับมาทุกไบต์
      const slipUrl = `/api/admin/bookings/${list.body.data[0].id}/slip`;
      await request(app).get(slipUrl).expect(401);
      const slip = await request(app).get(slipUrl).set('Authorization', `Bearer ${token}`).buffer(true).expect(200);
      expect(slip.headers['content-type']).toBe('image/png');
      expect(slip.headers['cache-control']).toContain('no-store');
      expect(Buffer.compare(slip.body, TINY_PNG)).toBe(0);

      const noSlip = await db('bookings').where({ booking_ref: createdRef }).first();
      await request(app)
        .get(`/api/admin/bookings/${noSlip.id}/slip`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      const paid = await request(app)
        .patch(`/api/admin/bookings/${list.body.data[0].id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ payment_status: 'paid', status: 'confirmed' })
        .expect(200);
      expect(paid.body.data).toMatchObject({ payment_status: 'paid', payment_method: 'promptpay', status: 'confirmed' });
    } finally {
      await request(app)
        .put('/api/admin/settings')
        .set('Authorization', `Bearer ${token}`)
        .send({
          payment_provider: original.body.data.payment_provider === 'promptpay' ? 'mock' : original.body.data.payment_provider,
          promptpay_id: original.body.data.promptpay_id,
          promptpay_name: original.body.data.promptpay_name,
        })
        .expect(200);
      if (original.body.data.payment_provider === 'promptpay') {
        await request(app)
          .put('/api/admin/settings')
          .set('Authorization', `Bearer ${token}`)
          .send({ payment_provider: 'promptpay' })
          .expect(200);
      }
    }
  });
});

describe('Stripe webhook', () => {
  it('ตรวจลายเซ็นถูกต้อง และปฏิเสธลายเซ็นปลอมหรือหมดอายุ', () => {
    const secret = 'whsec_test';
    const body = JSON.stringify({ type: 'checkout.session.completed' });
    const sign = (timestamp) =>
      `t=${timestamp},v1=${crypto.createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex')}`;
    const now = Math.floor(Date.now() / 1000);

    expect(verifyStripeSignature(body, sign(now), secret)).toBe(true);
    expect(verifyStripeSignature(`${body} `, sign(now), secret)).toBe(false);
    expect(verifyStripeSignature(body, sign(now), 'whsec_other')).toBe(false);
    expect(verifyStripeSignature(body, sign(now - 3600), secret)).toBe(false);
    expect(verifyStripeSignature(body, undefined, secret)).toBe(false);
  });

  it('ปิดไว้เมื่อไม่ได้ใช้ Stripe เป็น provider', async () => {
    await request(app)
      .post('/api/payments/stripe/webhook')
      .set('Content-Type', 'application/json')
      .send('{}')
      .expect(config.payment.provider === 'stripe' ? 400 : 404);
  });
});
