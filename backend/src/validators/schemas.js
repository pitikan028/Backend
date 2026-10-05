import { z } from 'zod';
import config from '../config/index.js';

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'รูปแบบวันที่ต้องเป็น YYYY-MM-DD')
  .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)), 'วันที่ไม่ถูกต้อง');

const trimmed = (max, label) =>
  z
    .string({ required_error: `${label}ห้ามว่าง` })
    .trim()
    .min(1, `${label}ห้ามว่าง`)
    .max(max, `${label}ยาวเกิน ${max} ตัวอักษร`);

const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};

/* ---------- activities ---------- */

export const activitySlugParam = z.object({
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]+$/, 'slug ต้องเป็นตัวพิมพ์เล็ก ตัวเลข หรือขีดกลางเท่านั้น'),
});

export const availabilityQuery = z.object({ date: isoDate });

export const activityBodySchema = z.object({
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]+$/, 'slug ต้องเป็นตัวพิมพ์เล็ก ตัวเลข หรือขีดกลางเท่านั้น')
    .max(80),
  name: trimmed(160, 'ชื่อกิจกรรม (อังกฤษ)'),
  name_th: trimmed(160, 'ชื่อกิจกรรม (ไทย)'),
  description_th: z.string().trim().max(2000).optional(),
  duration_label: trimmed(60, 'ระยะเวลา'),
  duration_minutes: z.coerce.number().int().min(0).max(1440).optional(),
  adult_price: z.coerce.number().min(0).max(1_000_000),
  child_price: z.coerce.number().min(0).max(1_000_000),
  infant_price: z.coerce.number().min(0).max(1_000_000).default(0),
  image_url: z.string().trim().max(255).optional(),
  daily_capacity: z.coerce.number().int().min(1).max(10_000).default(40),
  sort_order: z.coerce.number().int().min(0).default(0),
  is_active: z.coerce.boolean().default(true),
});

export const activityUpdateSchema = activityBodySchema.partial();

/* ---------- bookings ---------- */

export const createBookingSchema = z
  .object({
    activity_slug: z.string().trim().min(1, 'ต้องระบุกิจกรรม').optional(),
    activity_id: z.coerce.number().int().positive().optional(),
    booking_date: isoDate,
    adults: z.coerce.number().int().min(0).max(100).default(0),
    children: z.coerce.number().int().min(0).max(100).default(0),
    infants: z.coerce.number().int().min(0).max(100).default(0),
    first_name: trimmed(100, 'ชื่อจริง'),
    last_name: trimmed(100, 'นามสกุล'),
    phone: trimmed(40, 'เบอร์โทร').regex(/^[+()\d\s-]{6,}$/, 'รูปแบบเบอร์โทรไม่ถูกต้อง'),
    email: z.string().trim().email('รูปแบบอีเมลไม่ถูกต้อง').max(160),
    contact_app: z.enum(['WhatsApp', 'Line', 'WeChat']).default('Line'),
    note: z.string().trim().max(1000).optional(),
    pickup_type: z
      .enum(['hotel', 'meeting_point', 'airbnb', 'undecided'])
      .default('undecided'),
    pickup_detail: z.string().trim().max(255).optional(),
    accept_terms: z.coerce.boolean().refine((v) => v === true, 'ต้องยอมรับเงื่อนไขการยกเลิกก่อนจอง'),
  })
  .refine((data) => data.activity_slug || data.activity_id, {
    message: 'ต้องระบุ activity_slug หรือ activity_id อย่างน้อยหนึ่งอย่าง',
    path: ['activity_slug'],
  })
  .refine((data) => data.adults + data.children > 0, {
    message: 'ต้องมีผู้ใหญ่หรือเด็กอย่างน้อย 1 คน (ทารกอย่างเดียวจองไม่ได้)',
    path: ['adults'],
  })
  .refine(
    (data) => data.adults + data.children + data.infants <= config.booking.maxGuestsPerBooking,
    {
      message: `จองได้สูงสุด ${config.booking.maxGuestsPerBooking} คนต่อหนึ่งรายการ หากมากกว่านี้กรุณาติดต่อเจ้าหน้าที่`,
      path: ['adults'],
    },
  )
  .refine((data) => data.infants === 0 || data.adults > 0, {
    message: 'ทารกต้องมาพร้อมผู้ใหญ่อย่างน้อย 1 คน',
    path: ['infants'],
  });

export const bookingLookupQuery = z.object({
  email: z.string().trim().email('ต้องระบุอีเมลที่ใช้ตอนจอง').max(160),
});

export const bookingRefParam = z.object({
  ref: z
    .string()
    .trim()
    .regex(/^CEC-[A-Z0-9]{4,12}$/i, 'รูปแบบรหัสการจองไม่ถูกต้อง'),
});

export const bookingListQuery = z.object({
  ...pagination,
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed']).optional(),
  payment_status: z.enum(['unpaid', 'paid', 'refunded']).optional(),
  activity_id: z.coerce.number().int().positive().optional(),
  date_from: isoDate.optional(),
  date_to: isoDate.optional(),
  q: z.string().trim().max(120).optional(),
});

export const bookingStatusSchema = z
  .object({
    status: z.enum(['pending', 'confirmed', 'cancelled', 'completed']).optional(),
    payment_status: z.enum(['unpaid', 'paid', 'refunded']).optional(),
    payment_ref: z.string().trim().max(100).optional(),
  })
  .refine((data) => data.status || data.payment_status || data.payment_ref, {
    message: 'ต้องระบุอย่างน้อยหนึ่งฟิลด์ที่จะแก้ไข',
  });

/* ---------- reviews ---------- */

export const reviewListQuery = z.object({
  ...pagination,
  source: z.enum(['google', 'tripadvisor', 'website']).optional(),
  min_rating: z.coerce.number().int().min(1).max(5).optional(),
});

export const adminReviewListQuery = reviewListQuery.extend({
  is_published: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
});

export const createReviewSchema = z.object({
  author_name: trimmed(120, 'ชื่อผู้รีวิว'),
  rating: z.coerce.number().int().min(1, 'ให้คะแนน 1-5').max(5, 'ให้คะแนน 1-5'),
  comment: trimmed(1000, 'ข้อความรีวิว'),
  source: z.enum(['google', 'tripadvisor', 'website']).default('website'),
});

export const updateReviewSchema = z.object({
  is_published: z.coerce.boolean().optional(),
  sort_order: z.coerce.number().int().min(0).optional(),
  comment: z.string().trim().max(1000).optional(),
});

/* ---------- inquiries ---------- */

export const createInquirySchema = z.object({
  contact: trimmed(160, 'อีเมลหรือเบอร์โทร'),
  message: trimmed(2000, 'คำถาม'),
});

export const inquiryListQuery = z.object({
  ...pagination,
  status: z.enum(['new', 'answered', 'closed']).optional(),
});

export const updateInquirySchema = z
  .object({
    status: z.enum(['new', 'answered', 'closed']).optional(),
    answer: z.string().trim().max(2000).optional(),
  })
  .refine((data) => data.status || data.answer, {
    message: 'ต้องระบุ status หรือ answer อย่างน้อยหนึ่งอย่าง',
  });

/* ---------- auth ---------- */

export const loginSchema = z.object({
  email: z.string().trim().email('รูปแบบอีเมลไม่ถูกต้อง').max(160),
  password: z.string().min(1, 'ต้องกรอกรหัสผ่าน').max(200),
});

export const idParam = z.object({ id: z.coerce.number().int().positive() });
