import { Router } from 'express';
import asyncHandler from '../middleware/asyncHandler.js';
import validate from '../middleware/validate.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import * as activityService from '../services/activity.service.js';
import * as bookingService from '../services/booking.service.js';
import * as contentService from '../services/content.service.js';
import {
  activityBodySchema,
  activityUpdateSchema,
  adminReviewListQuery,
  bookingListQuery,
  bookingStatusSchema,
  idParam,
  inquiryListQuery,
  updateInquirySchema,
  updateReviewSchema,
} from '../validators/schemas.js';

const router = Router();

// ทุก endpoint ใต้ /api/admin ต้องผ่าน JWT
router.use(requireAuth);

/* ---------- dashboard ---------- */

router.get(
  '/stats',
  asyncHandler(async (_req, res) => {
    res.json({ data: await bookingService.getStats() });
  }),
);

/* ---------- bookings ---------- */

router.get(
  '/bookings',
  validate({ query: bookingListQuery }),
  asyncHandler(async (req, res) => {
    res.json(await bookingService.listBookings(req.validated.query));
  }),
);

router.get(
  '/bookings/:id',
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    res.json({ data: await bookingService.getBookingById(req.params.id) });
  }),
);

router.patch(
  '/bookings/:id',
  validate({ params: idParam, body: bookingStatusSchema }),
  asyncHandler(async (req, res) => {
    res.json({ data: await bookingService.updateBookingStatus(req.params.id, req.body) });
  }),
);

/* ---------- activities ---------- */

router.get(
  '/activities',
  asyncHandler(async (_req, res) => {
    res.json({ data: await activityService.listActivities({ includeInactive: true }) });
  }),
);

router.post(
  '/activities',
  validate({ body: activityBodySchema }),
  asyncHandler(async (req, res) => {
    res.status(201).json({ data: await activityService.createActivity(req.body) });
  }),
);

router.patch(
  '/activities/:id',
  validate({ params: idParam, body: activityUpdateSchema }),
  asyncHandler(async (req, res) => {
    res.json({ data: await activityService.updateActivity(req.params.id, req.body) });
  }),
);

// ลบกิจกรรมได้เฉพาะ admin เท่านั้น (staff แก้ไขได้แต่ลบไม่ได้)
router.delete(
  '/activities/:id',
  requireRole('admin'),
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    await activityService.deleteActivity(req.params.id);
    res.status(204).end();
  }),
);

/* ---------- reviews ---------- */

router.get(
  '/reviews',
  validate({ query: adminReviewListQuery }),
  asyncHandler(async (req, res) => {
    res.json(await contentService.listReviews(req.validated.query));
  }),
);

router.patch(
  '/reviews/:id',
  validate({ params: idParam, body: updateReviewSchema }),
  asyncHandler(async (req, res) => {
    res.json({ data: await contentService.updateReview(req.params.id, req.body) });
  }),
);

router.delete(
  '/reviews/:id',
  requireRole('admin'),
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    await contentService.deleteReview(req.params.id);
    res.status(204).end();
  }),
);

/* ---------- inquiries ---------- */

router.get(
  '/inquiries',
  validate({ query: inquiryListQuery }),
  asyncHandler(async (req, res) => {
    res.json(await contentService.listInquiries(req.validated.query));
  }),
);

router.patch(
  '/inquiries/:id',
  validate({ params: idParam, body: updateInquirySchema }),
  asyncHandler(async (req, res) => {
    res.json({ data: await contentService.updateInquiry(req.params.id, req.body) });
  }),
);

export default router;
