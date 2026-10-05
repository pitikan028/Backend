import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import asyncHandler from '../middleware/asyncHandler.js';
import validate from '../middleware/validate.js';
import { optionalUser } from '../middleware/auth.js';
import ApiError from '../utils/ApiError.js';
import config from '../config/index.js';
import * as activityService from '../services/activity.service.js';
import * as bookingService from '../services/booking.service.js';
import * as contentService from '../services/content.service.js';
import * as paymentService from '../services/payment.service.js';
import * as notificationService from '../services/notification.service.js';
import * as settingsService from '../services/settings.service.js';
import {
  activityListQuery,
  activitySlugParam,
  availabilityQuery,
  bookingLookupQuery,
  bookingRefParam,
  createBookingSchema,
  createInquirySchema,
  createReviewSchema,
  guestBookingActionSchema,
  reviewListQuery,
} from '../validators/schemas.js';

const router = Router();

// จำกัดการยิงฟอร์มสาธารณะ กันสแปมและการจองซ้ำรัว ๆ
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  // ชุดเทสต์ยิงฟอร์มจากเครื่องเดียวเกิน 20 ครั้ง จึงผ่อนให้เฉพาะตอนรันเทสต์
  limit: config.nodeEnv === 'test' ? 1000 : 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { message: 'ส่งคำขอถี่เกินไป กรุณารอสักครู่แล้วลองใหม่' } },
});

/* ---------- activities ---------- */

// รองรับค้นหา (?q=) กรองหมวดหมู่ (?category=) ราคาสูงสุด (?max_price=) และเรียงลำดับ (?sort=)
router.get(
  '/activities',
  validate({ query: activityListQuery }),
  asyncHandler(async (req, res) => {
    const [data, categories] = await Promise.all([
      activityService.listActivities(req.validated.query),
      activityService.listCategories(),
    ]);
    res.json({ data, meta: { total: data.length, categories } });
  }),
);

router.get(
  '/activities/:slug',
  validate({ params: activitySlugParam }),
  asyncHandler(async (req, res) => {
    res.json({ data: await activityService.getActivityBySlug(req.params.slug) });
  }),
);

router.get(
  '/activities/:slug/availability',
  validate({ params: activitySlugParam, query: availabilityQuery }),
  asyncHandler(async (req, res) => {
    const activity = await activityService.getActivityBySlug(req.params.slug);
    const { date } = req.validated.query;
    res.json({ data: await bookingService.getAvailability(activity, date) });
  }),
);

/* ---------- bookings ---------- */

// จองได้ทั้งแบบ guest และแบบสมาชิก — ถ้าส่ง token ของสมาชิกมาด้วย การจองจะเข้าไปอยู่ในประวัติของบัญชีนั้น
router.post(
  '/bookings',
  writeLimiter,
  optionalUser,
  validate({ body: createBookingSchema }),
  asyncHandler(async (req, res) => {
    const booking = await bookingService.createBooking(req.body, req.customer);
    await notificationService.notifyBookingCreated(booking);
    res.status(201).json({
      data: {
        ...booking,
        payment: { provider: await paymentService.getPaymentProvider(), token: paymentService.paymentToken(booking) },
      },
    });
  }),
);

// ลูกค้าดูการจองของตัวเอง: ต้องมีทั้งรหัสการจองและอีเมลที่ใช้จอง
router.get(
  '/bookings/:ref',
  validate({ params: bookingRefParam, query: bookingLookupQuery }),
  asyncHandler(async (req, res) => {
    const { email } = req.validated.query;
    const booking = await bookingService.findBookingByRef(req.params.ref, email);
    res.json({
      data: {
        ...(await bookingService.withCancellation(booking)),
        payment: { provider: await paymentService.getPaymentProvider() },
      },
    });
  }),
);

/** guest ยืนยันตัวด้วยรหัสการจอง + อีเมลที่ใช้จอง (เหมือนตอนค้นหาการจอง) */
async function guestBooking(req) {
  if (!req.body.email) throw ApiError.unprocessable('ต้องระบุอีเมลที่ใช้ตอนจอง', [{ field: 'email', message: 'ต้องระบุอีเมลที่ใช้ตอนจอง' }]);
  return bookingService.findBookingByRef(req.params.ref, req.body.email);
}

router.post(
  '/bookings/:ref/cancel',
  writeLimiter,
  validate({ params: bookingRefParam, body: guestBookingActionSchema }),
  asyncHandler(async (req, res) => {
    const booking = await guestBooking(req);
    const cancelled = await bookingService.cancelByCustomer(booking, req.body.reason);
    await notificationService.notifyBookingStatus(cancelled, { byCustomer: true });
    res.json({ data: await bookingService.withCancellation(cancelled) });
  }),
);

router.post(
  '/bookings/:ref/pay',
  writeLimiter,
  validate({ params: bookingRefParam, body: guestBookingActionSchema }),
  asyncHandler(async (req, res) => {
    const booking = await guestBooking(req);
    res.json({ data: await paymentService.createCheckout(booking) });
  }),
);

/* ---------- settings ---------- */

// ค่าตั้งระบบที่หน้าเว็บใช้ (เวลาทำการ ช่องทางติดต่อ กติกาการจอง) — ไม่รวมค่าที่เห็นได้เฉพาะหลังบ้าน
router.get(
  '/settings',
  asyncHandler(async (_req, res) => {
    const settings = await settingsService.getSettings({ publicOnly: true });
    // payment_provider ที่ส่งออกคือวิธีที่ "ใช้ได้จริงตอนนี้" (เลือกไว้แต่ตั้งค่าไม่ครบจะเป็น none)
    res.json({ data: { ...settings, payment_provider: await paymentService.getPaymentProvider() } });
  }),
);

/* ---------- reviews / faqs / inquiries ---------- */

router.get(
  '/reviews',
  validate({ query: reviewListQuery }),
  asyncHandler(async (req, res) => {
    const result = await contentService.listReviews({ ...req.validated.query, is_published: true });
    res.json(result);
  }),
);

router.post(
  '/reviews',
  writeLimiter,
  validate({ body: createReviewSchema }),
  asyncHandler(async (req, res) => {
    res.status(202).json({ data: await contentService.createReview(req.body) });
  }),
);

router.get(
  '/faqs',
  asyncHandler(async (_req, res) => {
    res.json({ data: await contentService.listFaqs() });
  }),
);

router.post(
  '/inquiries',
  writeLimiter,
  validate({ body: createInquirySchema }),
  asyncHandler(async (req, res) => {
    res.status(201).json({ data: await contentService.createInquiry(req.body) });
  }),
);

export default router;
