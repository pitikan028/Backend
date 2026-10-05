import { Router } from 'express';
import asyncHandler from '../middleware/asyncHandler.js';
import validate from '../middleware/validate.js';
import { db } from '../db/knex.js';
import ApiError from '../utils/ApiError.js';
import * as bookingService from '../services/booking.service.js';
import * as paymentService from '../services/payment.service.js';
import { paymentTokenQuery, transferNoticeSchema } from '../validators/schemas.js';

const router = Router();

/** หาการจองจากรหัส แล้วตรวจ token ของลิงก์ชำระเงิน (ใช้แทนการล็อกอิน) */
async function bookingFromToken({ ref, token }) {
  const row = await db('bookings').whereRaw('upper(booking_ref) = ?', [ref.toUpperCase()]).first();
  if (!row) throw ApiError.notFound('ไม่พบการจองนี้');

  const booking = await bookingService.getBookingById(row.id);
  paymentService.assertPaymentToken(booking, token);
  return booking;
}

// หน้า payment.html เรียกเพื่อแสดงยอดและผลการชำระเงิน
router.get(
  '/status',
  validate({ query: paymentTokenQuery }),
  asyncHandler(async (req, res) => {
    const booking = await bookingFromToken(req.validated.query);
    res.json({ data: await paymentService.paymentSummary(booking) });
  }),
);

// ปุ่ม "แจ้งโอนเงินแล้ว" หลังสแกน QR พร้อมเพย์ — การจองจะเข้าสถานะรอทีมงานตรวจสอบยอด
router.post(
  '/promptpay/notify',
  validate({ body: transferNoticeSchema }),
  asyncHandler(async (req, res) => {
    const booking = await bookingFromToken(req.body);
    const updated = await paymentService.reportPromptPayTransfer(booking, req.body);
    res.json({ data: await paymentService.paymentSummary(updated) });
  }),
);

// ปุ่ม "ชำระเงิน" ของหน้าจำลอง — ใช้ได้เฉพาะเมื่อ PAYMENT_PROVIDER=mock
router.post(
  '/mock/confirm',
  validate({ body: paymentTokenQuery }),
  asyncHandler(async (req, res) => {
    const booking = await bookingFromToken(req.body);
    await paymentService.confirmMockPayment(booking);
    res.json({ data: await paymentService.paymentSummary(await bookingService.getBookingById(booking.id)) });
  }),
);

// Stripe เรียกเข้ามาเองเมื่อลูกค้าจ่ายสำเร็จ — body ต้องเป็น raw (ดู app.js) เพื่อใช้ตรวจลายเซ็น
router.post(
  '/stripe/webhook',
  asyncHandler(async (req, res) => {
    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : '';
    const result = await paymentService.handleStripeWebhook(rawBody, req.headers['stripe-signature']);
    res.json({ received: true, ...result });
  }),
);

export default router;
