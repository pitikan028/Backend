import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import asyncHandler from '../middleware/asyncHandler.js';
import validate from '../middleware/validate.js';
import { requireUser } from '../middleware/auth.js';
import * as userService from '../services/user.service.js';
import * as bookingService from '../services/booking.service.js';
import * as paymentService from '../services/payment.service.js';
import * as notificationService from '../services/notification.service.js';
import {
  bookingRefParam,
  cancelBookingSchema,
  changePasswordSchema,
  loginSchema,
  profileUpdateSchema,
  registerSchema,
} from '../validators/schemas.js';

const router = Router();

// กันการเดารหัสผ่านและการสมัครสมาชิกรัว ๆ
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: { message: 'พยายามบ่อยเกินไป กรุณารอ 15 นาทีแล้วลองใหม่' } },
});

/* ---------- สมัครสมาชิก / เข้าสู่ระบบ ---------- */

router.post(
  '/register',
  authLimiter,
  validate({ body: registerSchema }),
  asyncHandler(async (req, res) => {
    const session = await userService.register(req.body);
    await notificationService.notifyWelcome(session.user);
    res.status(201).json({ data: session });
  }),
);

router.post(
  '/login',
  authLimiter,
  validate({ body: loginSchema }),
  asyncHandler(async (req, res) => {
    res.json({ data: await userService.login(req.body) });
  }),
);

// ทุก endpoint ต่อจากนี้ต้องล็อกอินแล้ว
router.use(requireUser);

/* ---------- โปรไฟล์ ---------- */

router.get(
  '/me',
  asyncHandler(async (req, res) => {
    res.json({ data: await userService.getUserById(req.customer.id) });
  }),
);

router.patch(
  '/me',
  validate({ body: profileUpdateSchema }),
  asyncHandler(async (req, res) => {
    res.json({ data: await userService.updateProfile(req.customer.id, req.body) });
  }),
);

router.post(
  '/password',
  validate({ body: changePasswordSchema }),
  asyncHandler(async (req, res) => {
    await userService.changePassword(req.customer.id, req.body);
    res.json({ data: { message: 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว' } });
  }),
);

/* ---------- ประวัติการจอง ---------- */

router.get(
  '/bookings',
  asyncHandler(async (req, res) => {
    const bookings = await bookingService.listBookingsForUser(req.customer.id);
    res.json({ data: await bookingService.withCancellation(bookings) });
  }),
);

router.get(
  '/bookings/:ref',
  validate({ params: bookingRefParam }),
  asyncHandler(async (req, res) => {
    const booking = await bookingService.findBookingForUser(req.params.ref, req.customer.id);
    res.json({ data: await bookingService.withCancellation(booking) });
  }),
);

router.post(
  '/bookings/:ref/cancel',
  validate({ params: bookingRefParam, body: cancelBookingSchema }),
  asyncHandler(async (req, res) => {
    const booking = await bookingService.findBookingForUser(req.params.ref, req.customer.id);
    const cancelled = await bookingService.cancelByCustomer(booking, req.body.reason);
    await notificationService.notifyBookingStatus(cancelled, { byCustomer: true });
    res.json({ data: await bookingService.withCancellation(cancelled) });
  }),
);

router.post(
  '/bookings/:ref/pay',
  validate({ params: bookingRefParam }),
  asyncHandler(async (req, res) => {
    const booking = await bookingService.findBookingForUser(req.params.ref, req.customer.id);
    res.json({ data: await paymentService.createCheckout(booking) });
  }),
);

/* ---------- การแจ้งเตือน ---------- */

router.get(
  '/notifications',
  asyncHandler(async (req, res) => {
    res.json(await notificationService.listForUser(req.customer.id));
  }),
);

router.post(
  '/notifications/read',
  asyncHandler(async (req, res) => {
    await notificationService.markAllRead(req.customer.id);
    res.status(204).end();
  }),
);

export default router;
