import crypto from 'node:crypto';
import config from '../config/index.js';
import ApiError from '../utils/ApiError.js';
import QRCode from 'qrcode';
import { markPaid, markTransferNotified } from './booking.service.js';
import { notifyPaymentReceived, notifyTransferReported } from './notification.service.js';
import { getSettings } from './settings.service.js';
import { buildPromptPayPayload, maskPromptPayId } from '../utils/promptpay.js';
import { db } from '../db/knex.js';

/**
 * การชำระเงินออนไลน์ — แอดมินเลือกวิธีได้ในหน้าตั้งค่าระบบ (ค่าเริ่มต้นมาจาก PAYMENT_PROVIDER)
 *
 *   mock      - หน้าชำระเงินจำลอง ใช้ตอน dev / เดโม ไม่มีการตัดเงินจริง
 *   promptpay - ลูกค้าสแกน QR พร้อมเพย์แล้วโอนเข้าบัญชีของร้านจริง จากนั้นกดแจ้งโอน ทีมงานตรวจยอดแล้วยืนยัน
 *   stripe    - Stripe Checkout ของจริง ยืนยันผลผ่าน webhook checkout.session.completed
 *   none      - ปิดการชำระออนไลน์ ทีมงานติดต่อกลับแล้วบันทึกรับเงินเองในหน้าหลังบ้าน
 */
export async function getPaymentProvider() {
  const settings = await getSettings();
  const provider = settings.payment_provider;

  // เลือกไว้แต่ยังตั้งค่าไม่ครบ = ถือว่ายังไม่เปิด ดีกว่าให้ลูกค้ากดจ่ายแล้วเจอ error
  if (provider === 'promptpay' && !(settings.promptpay_id && settings.promptpay_name)) return 'none';
  if (provider === 'stripe' && !config.payment.stripeSecretKey) return 'none';
  return provider;
}

/**
 * token ที่ผูกกับรหัสการจอง + อีเมล ใช้แทนการล็อกอินในหน้าชำระเงิน
 * (ลูกค้าที่จองแบบ guest ก็ต้องเปิดหน้าชำระเงินและดูผลได้)
 */
export function paymentToken(booking) {
  return crypto
    .createHmac('sha256', config.jwt.secret)
    .update(`pay:${booking.booking_ref}:${booking.email}`)
    .digest('hex')
    .slice(0, 40);
}

export function assertPaymentToken(booking, token) {
  const expected = Buffer.from(paymentToken(booking));
  const given = Buffer.from(String(token ?? ''));
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) {
    throw ApiError.forbidden('ลิงก์ชำระเงินไม่ถูกต้อง');
  }
}

const resultUrl = (booking, extra = '') =>
  `${config.appUrl}/payment.html?ref=${booking.booking_ref}&token=${paymentToken(booking)}${extra}`;

/** สร้างลิงก์ไปหน้าชำระเงินของการจองนี้ */
export async function createCheckout(booking) {
  if (booking.status === 'cancelled') throw ApiError.conflict('การจองนี้ถูกยกเลิกแล้ว ชำระเงินไม่ได้');
  if (booking.payment_status === 'reviewing') {
    throw ApiError.conflict('คุณแจ้งโอนเงินแล้ว ทีมงานกำลังตรวจสอบยอดเงิน');
  }
  if (booking.payment_status !== 'unpaid') throw ApiError.conflict('การจองนี้ชำระเงินเรียบร้อยแล้ว');

  const provider = await getPaymentProvider();
  if (provider === 'none') {
    throw ApiError.conflict('ยังไม่เปิดรับชำระเงินออนไลน์ ทีมงานจะติดต่อกลับพร้อมช่องทางชำระเงิน');
  }

  if (provider === 'mock') {
    return { provider, checkout_url: resultUrl(booking, '&mode=mock') };
  }
  if (provider === 'promptpay') {
    return { provider, checkout_url: resultUrl(booking, '&mode=promptpay') };
  }

  const session = await createStripeSession(booking);
  return { provider, checkout_url: session.url };
}

/** QR พร้อมเพย์ของการจองนี้ — ยอดเงินฝังอยู่ใน QR ลูกค้าแก้ยอดในแอปธนาคารไม่ได้ */
async function promptPayDetails(booking) {
  const settings = await getSettings();
  const payload = buildPromptPayPayload(settings.promptpay_id, booking.total_amount);
  return {
    qr_image: await QRCode.toDataURL(payload, { width: 360, margin: 2, errorCorrectionLevel: 'M' }),
    account_name: settings.promptpay_name,
    account_id: maskPromptPayId(settings.promptpay_id),
  };
}

/** สถานะที่หน้า payment.html ใช้แสดงผล */
export async function paymentSummary(booking) {
  const provider = await getPaymentProvider();
  const awaitingTransfer =
    provider === 'promptpay' && booking.payment_status === 'unpaid' && booking.status !== 'cancelled';

  return {
    provider,
    ...(awaitingTransfer ? { promptpay: await promptPayDetails(booking) } : {}),
    booking_ref: booking.booking_ref,
    activity: booking.activity,
    booking_date: booking.booking_date,
    total_amount: booking.total_amount,
    currency: booking.currency,
    status: booking.status,
    payment_status: booking.payment_status,
    payment_method: booking.payment_method,
    paid_at: booking.paid_at,
    has_slip: Boolean(booking.slip_uploaded_at),
    email: booking.email,
  };
}

async function settle(bookingId, details) {
  const paid = await markPaid(bookingId, details);
  // null = เคยบันทึกไปแล้ว (เช่น webhook ยิงซ้ำ) ไม่ต้องส่งอีเมลอีกรอบ
  if (paid) await notifyPaymentReceived(paid);
  return paid;
}

/* ---------- mock ---------- */

export async function confirmMockPayment(booking) {
  if ((await getPaymentProvider()) !== 'mock') throw ApiError.notFound('ไม่ได้เปิดใช้การชำระเงินจำลอง');
  const reference = `MOCK-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
  await settle(booking.id, { method: 'mock', paymentRef: reference });
}

/* ---------- PromptPay ---------- */

const MAX_SLIP_BYTES = 4 * 1024 * 1024;

// ตรวจจากไบต์ต้นไฟล์จริง ไม่เชื่อชนิดไฟล์ที่เบราว์เซอร์บอกมา (กันส่งไฟล์อื่นมาในชื่อรูป)
const IMAGE_SIGNATURES = [
  { mimeType: 'image/jpeg', matches: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mimeType: 'image/png', matches: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  {
    mimeType: 'image/webp',
    matches: (b) => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP',
  },
];

/** แปลง data URL ของสลิปเป็นไฟล์ พร้อมตรวจว่าเป็นรูปจริงและขนาดไม่เกินกำหนด */
export function parseSlip(dataUrl) {
  const data = Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64');
  const invalid = (message) => ApiError.unprocessable(message, [{ field: 'slip', message }]);

  if (data.length < 100) throw invalid('ไฟล์สลิปไม่ถูกต้อง');
  if (data.length > MAX_SLIP_BYTES) throw invalid('ไฟล์สลิปต้องมีขนาดไม่เกิน 4 MB');

  const signature = IMAGE_SIGNATURES.find((item) => item.matches(data));
  if (!signature) throw invalid('สลิปต้องเป็นไฟล์รูป JPG, PNG หรือ WebP');

  return { mimeType: signature.mimeType, data };
}

/**
 * ลูกค้ากด "แจ้งโอนเงินแล้ว" หลังสแกนจ่าย
 * ระบบตรวจยอดเข้าบัญชีธนาคารเองไม่ได้ จึงตั้งสถานะเป็น "รอตรวจสอบ" ให้ทีมงานเช็กแล้วกดบันทึกรับเงิน
 */
export async function reportPromptPayTransfer(booking, { note, slip: slipDataUrl } = {}) {
  if ((await getPaymentProvider()) !== 'promptpay') throw ApiError.notFound('ไม่ได้เปิดรับชำระผ่าน PromptPay');
  if (booking.status === 'cancelled') throw ApiError.conflict('การจองนี้ถูกยกเลิกแล้ว');
  if (booking.payment_status !== 'unpaid') throw ApiError.conflict('การจองนี้แจ้งชำระเงินไปแล้ว');

  const slip = slipDataUrl ? parseSlip(slipDataUrl) : null;
  const updated = await markTransferNotified(booking.id, { method: 'promptpay', note, slip });
  await notifyTransferReported(updated);
  return updated;
}

/* ---------- Stripe ---------- */

async function createStripeSession(booking) {
  const form = new URLSearchParams({
    mode: 'payment',
    success_url: resultUrl(booking, '&paid=1'),
    cancel_url: resultUrl(booking, '&cancelled=1'),
    client_reference_id: booking.booking_ref,
    customer_email: booking.email,
    'metadata[booking_id]': String(booking.id),
    'metadata[booking_ref]': booking.booking_ref,
    'line_items[0][quantity]': '1',
    'line_items[0][price_data][currency]': booking.currency.toLowerCase(),
    // Stripe รับจำนวนเงินเป็นหน่วยย่อย (สตางค์)
    'line_items[0][price_data][unit_amount]': String(Math.round(booking.total_amount * 100)),
    'line_items[0][price_data][product_data][name]': `${booking.activity.name} — ${booking.booking_date} (${booking.booking_ref})`,
  });

  let response;
  try {
    response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.payment.stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        // กันสร้าง session ซ้ำถ้าลูกค้ากดปุ่มรัว ๆ
        'Idempotency-Key': `checkout-${booking.booking_ref}-${Math.floor(Date.now() / 60000)}`,
      },
      body: form,
      signal: AbortSignal.timeout(15000),
    });
  } catch (error) {
    console.error('[stripe] เรียก API ไม่สำเร็จ:', error.message);
    throw new ApiError(502, 'เชื่อมต่อระบบชำระเงินไม่ได้ กรุณาลองใหม่อีกครั้ง');
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.url) {
    console.error('[stripe] สร้าง checkout session ไม่สำเร็จ:', payload.error?.message ?? response.status);
    throw new ApiError(502, 'สร้างรายการชำระเงินไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
  }
  return payload;
}

/** ตรวจลายเซ็นของ webhook ตามสเปกของ Stripe (HMAC-SHA256 ของ "<timestamp>.<raw body>") */
export function verifyStripeSignature(rawBody, header, secret, toleranceSeconds = 300) {
  const parts = Object.fromEntries(
    String(header ?? '')
      .split(',')
      .map((item) => item.trim().split('='))
      .filter((pair) => pair.length === 2),
  );
  if (!parts.t || !parts.v1) return false;
  if (Math.abs(Date.now() / 1000 - Number(parts.t)) > toleranceSeconds) return false;

  const expected = crypto.createHmac('sha256', secret).update(`${parts.t}.${rawBody}`).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(parts.v1);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function handleStripeWebhook(rawBody, signatureHeader) {
  if ((await getPaymentProvider()) !== 'stripe') throw ApiError.notFound('ไม่ได้เปิดใช้ Stripe');
  if (!config.payment.stripeWebhookSecret) {
    throw new ApiError(500, 'ยังไม่ได้กำหนด STRIPE_WEBHOOK_SECRET');
  }
  if (!verifyStripeSignature(rawBody, signatureHeader, config.payment.stripeWebhookSecret)) {
    throw ApiError.badRequest('ลายเซ็นของ webhook ไม่ถูกต้อง');
  }

  const event = JSON.parse(rawBody);
  if (event.type !== 'checkout.session.completed') return { handled: false };

  const session = event.data.object;
  if (session.payment_status !== 'paid') return { handled: false };

  const bookingId = Number(session.metadata?.booking_id);
  const booking = await db('bookings').where({ id: bookingId, booking_ref: session.client_reference_id }).first();
  if (!booking) {
    console.error('[stripe] webhook อ้างถึงการจองที่ไม่มีอยู่:', session.client_reference_id);
    return { handled: false };
  }

  await settle(booking.id, { method: 'stripe', paymentRef: session.payment_intent ?? session.id });
  return { handled: true };
}
