import { z } from 'zod';

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

const categorySlug = z
  .string()
  .trim()
  .regex(/^[a-z0-9-]+$/, 'หมวดหมู่ต้องเป็นตัวพิมพ์เล็ก ตัวเลข หรือขีดกลางเท่านั้น')
  .max(40);

export const activityListQuery = z.object({
  q: z.string().trim().max(80).optional(),
  category: categorySlug.optional(),
  max_price: z.coerce.number().min(0).max(1_000_000).optional(),
  sort: z.enum(['recommended', 'price_asc', 'price_desc', 'duration']).optional(),
});

export const activityBodySchema = z.object({
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]+$/, 'slug ต้องเป็นตัวพิมพ์เล็ก ตัวเลข หรือขีดกลางเท่านั้น')
    .max(80),
  name: trimmed(160, 'ชื่อกิจกรรม (อังกฤษ)'),
  name_th: trimmed(160, 'ชื่อกิจกรรม (ไทย)'),
  description_th: z.string().trim().max(2000).optional(),
  highlights: z.string().trim().max(2000).optional(),
  category: categorySlug.default('elephant'),
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

// ตอนแก้ไขต้องไม่เติมค่า default ให้ฟิลด์ที่ไม่ได้ส่งมา ไม่งั้นแก้ราคาอย่างเดียวจะรีเซ็ตโควตาไปด้วย
export const activityUpdateSchema = z
  .object(
    Object.fromEntries(
      Object.entries(activityBodySchema.shape).map(([key, field]) => [
        key,
        (field instanceof z.ZodDefault ? field.removeDefault() : field).optional(),
      ]),
    ),
  )
  .refine((data) => Object.keys(data).length > 0, { message: 'ต้องระบุอย่างน้อยหนึ่งฟิลด์ที่จะแก้ไข' });

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
    contact_app: z.enum(['Line', 'WhatsApp', 'WeChat', 'Instagram']).default('Line'),
    // ไอดีของแอปที่เลือก เช่น LINE ID หรือชื่อบัญชี Instagram
    contact_id: z.string().trim().max(80).optional(),
    note: z.string().trim().max(1000).optional(),
    pickup_type: z
      .enum(['hotel', 'meeting_point', 'airbnb', 'undecided'])
      .default('undecided'),
    pickup_detail: z.string().trim().max(255).optional(),
    pickup_round: z.enum(['morning', 'afternoon']).default('morning'),
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

export const cancelBookingSchema = z.object({
  reason: z.string().trim().max(255).optional(),
});

// guest ต้องยืนยันตัวด้วยอีเมลที่ใช้จอง ส่วนสมาชิกที่ล็อกอินแล้วไม่ต้องส่ง
export const guestBookingActionSchema = cancelBookingSchema.extend({
  email: z.string().trim().email('ต้องระบุอีเมลที่ใช้ตอนจอง').max(160).optional(),
});

export const paymentTokenQuery = z.object({
  ref: z
    .string()
    .trim()
    .regex(/^CEC-[A-Z0-9]{4,12}$/i, 'รูปแบบรหัสการจองไม่ถูกต้อง'),
  token: z.string().trim().min(10).max(80),
});

// ลูกค้าแจ้งว่าโอนเงินผ่าน PromptPay แล้ว
export const transferNoticeSchema = paymentTokenQuery.extend({
  note: z.string().trim().max(90).optional(),
  // รูปสลิปแบบ data URL (data:image/jpeg;base64,...) — ตรวจชนิดไฟล์จริงอีกชั้นใน service
  slip: z
    .string()
    .max(5_600_000, 'ไฟล์สลิปใหญ่เกินไป')
    .regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/, 'สลิปต้องเป็นไฟล์รูป JPG, PNG หรือ WebP')
    .optional(),
});

export const bookingListQuery = z.object({
  ...pagination,
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed']).optional(),
  payment_status: z.enum(['unpaid', 'reviewing', 'paid', 'refunded']).optional(),
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

const password = z
  .string()
  .min(8, 'รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร')
  .max(200)
  .regex(/[A-Za-z]/, 'รหัสผ่านต้องมีตัวอักษรอย่างน้อย 1 ตัว')
  .regex(/[0-9]/, 'รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว');

const phone = trimmed(40, 'เบอร์โทร').regex(/^[+()0-9 -]{6,}$/, 'รูปแบบเบอร์โทรไม่ถูกต้อง');
const contactApp = z.enum(['Line', 'WhatsApp', 'WeChat', 'Instagram']);
const contactId = z.string().trim().max(80);

export const registerSchema = z.object({
  email: z.string().trim().email('รูปแบบอีเมลไม่ถูกต้อง').max(160),
  password,
  first_name: trimmed(100, 'ชื่อจริง'),
  last_name: trimmed(100, 'นามสกุล'),
  phone: phone.optional(),
  contact_app: contactApp.default('Line'),
  contact_id: contactId.optional(),
});

export const profileUpdateSchema = z
  .object({
    first_name: trimmed(100, 'ชื่อจริง').optional(),
    last_name: trimmed(100, 'นามสกุล').optional(),
    phone: phone.optional(),
    contact_app: contactApp.optional(),
    contact_id: contactId.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'ต้องระบุอย่างน้อยหนึ่งฟิลด์ที่จะแก้ไข' });

export const changePasswordSchema = z.object({
  current_password: z.string().min(1, 'ต้องกรอกรหัสผ่านปัจจุบัน').max(200),
  new_password: password,
});

/* ---------- admin: users / staff / settings / reports ---------- */

const booleanQuery = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true')
  .optional();

export const userListQuery = z.object({
  ...pagination,
  q: z.string().trim().max(120).optional(),
  is_active: booleanQuery,
});

export const userStatusSchema = z.object({ is_active: z.boolean({ required_error: 'ต้องระบุ is_active' }) });

const staffRole = z.enum(['admin', 'staff']);

export const createStaffSchema = z.object({
  email: z.string().trim().email('รูปแบบอีเมลไม่ถูกต้อง').max(160),
  password,
  name: trimmed(120, 'ชื่อ'),
  role: staffRole.default('staff'),
});

export const updateStaffSchema = z
  .object({
    name: trimmed(120, 'ชื่อ').optional(),
    role: staffRole.optional(),
    is_active: z.boolean().optional(),
    password: password.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'ต้องระบุอย่างน้อยหนึ่งฟิลด์ที่จะแก้ไข' });

export const settingsSchema = z
  .object({
    opening_hours: z.string().trim().max(120),
    contact_phone: z.string().trim().max(40),
    contact_line: z.string().trim().max(80),
    contact_email: z.string().trim().max(160),
    site_notice: z.string().trim().max(300),
    booking_min_lead_days: z.coerce.number().int().min(0).max(60),
    booking_max_advance_days: z.coerce.number().int().min(1).max(730),
    booking_max_guests: z.coerce.number().int().min(1).max(100),
    cancel_free_hours: z.coerce.number().int().min(0).max(720),
    pickup_time_morning: z.string().trim().min(1, 'ต้องระบุเวลารับรอบเช้า').max(60),
    pickup_time_afternoon: z.string().trim().min(1, 'ต้องระบุเวลารับรอบกลางวัน').max(60),
    payment_provider: z.enum(['mock', 'promptpay', 'stripe', 'none']),
    promptpay_id: z.string().trim().max(30),
    promptpay_name: z.string().trim().max(120),
    admin_notify_email: z.union([z.literal(''), z.string().trim().email('รูปแบบอีเมลไม่ถูกต้อง').max(160)]),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, { message: 'ต้องระบุอย่างน้อยหนึ่งค่าที่จะแก้ไข' });

export const reportQuery = z
  .object({ from: isoDate.optional(), to: isoDate.optional() })
  .refine((data) => !data.from || !data.to || data.from <= data.to, {
    message: 'วันที่เริ่มต้นต้องไม่เกินวันที่สิ้นสุด',
    path: ['from'],
  });

export const notificationListQuery = z.object({
  ...pagination,
  status: z.enum(['queued', 'sent', 'logged', 'failed']).optional(),
});

export const idParam = z.object({ id: z.coerce.number().int().positive() });
