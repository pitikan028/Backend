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

const app = createApp();
const bookingDate = dayjs().add(30, 'day').format('YYYY-MM-DD');

let token;
let createdRef;

beforeAll(async () => {
  await db.migrate.latest();
  await db.seed.run();

  // ล้างการจองของวันที่ที่เทสต์ใช้ เพื่อให้รันซ้ำได้ผลเหมือนเดิม
  await db('bookings').where({ booking_date: bookingDate }).del();
}, 60_000);

afterAll(async () => {
  await db('bookings').where({ booking_date: bookingDate }).del();
  await closeDb();
});

describe('health & catalog', () => {
  it('GET /api/health ตอบ ok', async () => {
    const res = await request(app).get('/api/health').expect(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /api/activities คืน 6 กิจกรรมที่ seed ไว้', async () => {
    const res = await request(app).get('/api/activities').expect(200);
    expect(res.body.data).toHaveLength(6);
    expect(res.body.data[0]).toMatchObject({ slug: 'elephant-jungle-trekking', adult_price: 990 });
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

    // 2 ผู้ใหญ่ × 1290 + 1 เด็ก × 990 = 3570
    expect(res.body.data.total_amount).toBe(3570);
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
