import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import asyncHandler from '../middleware/asyncHandler.js';
import validate from '../middleware/validate.js';
import * as activityService from '../services/activity.service.js';
import * as bookingService from '../services/booking.service.js';
import * as contentService from '../services/content.service.js';
import {
  activitySlugParam,
  availabilityQuery,
  bookingLookupQuery,
  bookingRefParam,
  createBookingSchema,
  createInquirySchema,
  createReviewSchema,
  reviewListQuery,
} from '../validators/schemas.js';

const router = Router();

// จำกัดการยิงฟอร์มสาธารณะ กันสแปมและการจองซ้ำรัว ๆ
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { message: 'ส่งคำขอถี่เกินไป กรุณารอสักครู่แล้วลองใหม่' } },
});

/* ---------- activities ---------- */

router.get(
  '/activities',
  asyncHandler(async (_req, res) => {
    res.json({ data: await activityService.listActivities() });
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

router.post(
  '/bookings',
  writeLimiter,
  validate({ body: createBookingSchema }),
  asyncHandler(async (req, res) => {
    const booking = await bookingService.createBooking(req.body);
    res.status(201).json({ data: booking });
  }),
);

// ลูกค้าดูการจองของตัวเอง: ต้องมีทั้งรหัสการจองและอีเมลที่ใช้จอง
router.get(
  '/bookings/:ref',
  validate({ params: bookingRefParam, query: bookingLookupQuery }),
  asyncHandler(async (req, res) => {
    const { email } = req.validated.query;
    res.json({ data: await bookingService.findBookingByRef(req.params.ref, email) });
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
