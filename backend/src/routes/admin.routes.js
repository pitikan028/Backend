import { Router } from 'express';
import asyncHandler from '../middleware/asyncHandler.js';
import validate from '../middleware/validate.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import * as activityService from '../services/activity.service.js';
import * as bookingService from '../services/booking.service.js';
import * as contentService from '../services/content.service.js';
import * as exportService from '../services/export.service.js';
import * as notificationService from '../services/notification.service.js';
import * as settingsService from '../services/settings.service.js';
import * as userService from '../services/user.service.js';
import dayjs from 'dayjs';
import {
  activityBodySchema,
  activityUpdateSchema,
  adminReviewListQuery,
  bookingExportQuery,
  bookingListQuery,
  bookingStatusSchema,
  createStaffSchema,
  idParam,
  inquiryListQuery,
  notificationListQuery,
  reportQuery,
  settingsSchema,
  updateStaffSchema,
  userListQuery,
  userStatusSchema,
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

// รายงานยอดจองรายวันและรายกิจกรรม ค่าเริ่มต้นคือ 30 วันล่าสุด
router.get(
  '/reports',
  validate({ query: reportQuery }),
  asyncHandler(async (req, res) => {
    const to = req.validated.query.to ?? dayjs().format('YYYY-MM-DD');
    const from = req.validated.query.from ?? dayjs(to).subtract(29, 'day').format('YYYY-MM-DD');
    if (dayjs(to).diff(dayjs(from), 'day') > 366) {
      res.status(422).json({ error: { message: 'เลือกช่วงรายงานได้ไม่เกิน 1 ปี' } });
      return;
    }
    res.json({ data: await bookingService.getReport({ from, to }) });
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

// ไฟล์ Excel ของทุกรายการที่ตรงตัวกรอง — ต้องประกาศก่อน /bookings/:id ไม่งั้น "export" จะถูกมองเป็น id
router.get(
  '/bookings/export',
  validate({ query: bookingExportQuery }),
  asyncHandler(async (req, res) => {
    const bookings = await bookingService.listBookingsForExport(req.validated.query);
    const file = await exportService.buildBookingsWorkbook(bookings);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="chokchai-bookings-${dayjs().format('YYYYMMDD-HHmm')}.xlsx"`,
      'Content-Length': file.length,
      // มีข้อมูลส่วนตัวของลูกค้า ห้ามให้เบราว์เซอร์หรือ proxy เก็บแคชไว้
      'Cache-Control': 'private, no-store',
    });
    res.send(file);
  }),
);

router.get(
  '/bookings/:id',
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    res.json({ data: await bookingService.getBookingById(req.params.id) });
  }),
);

// รูปสลิปโอนเงินที่ลูกค้าแนบ — ส่งกลับเป็นไฟล์รูป ไม่ใช่ JSON
router.get(
  '/bookings/:id/slip',
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    const slip = await bookingService.getPaymentSlip(req.params.id);
    res.set({
      'Content-Type': slip.mimeType,
      'Content-Length': slip.data.length,
      // สลิปเป็นข้อมูลการเงินส่วนตัว ห้ามให้เบราว์เซอร์หรือ proxy เก็บแคชไว้
      'Cache-Control': 'private, no-store',
      'Content-Disposition': 'inline',
    });
    res.send(slip.data);
  }),
);

router.patch(
  '/bookings/:id',
  validate({ params: idParam, body: bookingStatusSchema }),
  asyncHandler(async (req, res) => {
    const before = await bookingService.getBookingById(req.params.id);
    const booking = await bookingService.updateBookingStatus(req.params.id, req.body);

    // แจ้งลูกค้าเฉพาะเมื่อมีอะไรเปลี่ยนจริง ไม่ส่งซ้ำถ้ากดบันทึกค่าเดิม
    if (booking.status !== before.status) await notificationService.notifyBookingStatus(booking);
    if (booking.payment_status === 'paid' && before.payment_status !== 'paid') {
      await notificationService.notifyPaymentReceived(booking);
    }
    res.json({ data: booking });
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

/* ---------- customers ---------- */

router.get(
  '/users',
  validate({ query: userListQuery }),
  asyncHandler(async (req, res) => {
    res.json(await userService.listUsers(req.validated.query));
  }),
);

// ระงับ / เปิดใช้บัญชีลูกค้า (บัญชีที่ถูกระงับจะล็อกอินไม่ได้และ token เดิมใช้ไม่ได้ทันที)
router.patch(
  '/users/:id',
  validate({ params: idParam, body: userStatusSchema }),
  asyncHandler(async (req, res) => {
    res.json({ data: await userService.setUserActive(req.params.id, req.body.is_active) });
  }),
);

/* ---------- staff accounts (เฉพาะ admin) ---------- */

router.get(
  '/staff',
  requireRole('admin'),
  asyncHandler(async (_req, res) => {
    res.json({ data: await userService.listStaff() });
  }),
);

router.post(
  '/staff',
  requireRole('admin'),
  validate({ body: createStaffSchema }),
  asyncHandler(async (req, res) => {
    res.status(201).json({ data: await userService.createStaff(req.body) });
  }),
);

router.patch(
  '/staff/:id',
  requireRole('admin'),
  validate({ params: idParam, body: updateStaffSchema }),
  asyncHandler(async (req, res) => {
    res.json({ data: await userService.updateStaff(req.params.id, req.body, req.user) });
  }),
);

/* ---------- system settings ---------- */

router.get(
  '/settings',
  asyncHandler(async (_req, res) => {
    res.json({ data: await settingsService.getSettings() });
  }),
);

router.put(
  '/settings',
  requireRole('admin'),
  validate({ body: settingsSchema }),
  asyncHandler(async (req, res) => {
    res.json({ data: await settingsService.updateSettings(req.body) });
  }),
);

/* ---------- notification log ---------- */

router.get(
  '/notifications',
  validate({ query: notificationListQuery }),
  asyncHandler(async (req, res) => {
    res.json(await notificationService.listAll(req.validated.query));
  }),
);

export default router;
