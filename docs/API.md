# REST API — Chokchai Elephant Camp

**Base URL**

| สภาพแวดล้อม | URL |
| --- | --- |
| ผ่าน nginx (แนะนำ) | `http://localhost:8080/api` |
| เรียก API ตรง | `http://localhost:3000/api` |

ทุก request และ response เป็น JSON (`Content-Type: application/json`)

## รูปแบบคำตอบ

สำเร็จ — ข้อมูลอยู่ใน `data` เสมอ ส่วน endpoint ที่แบ่งหน้าจะมี `meta` เพิ่ม

```json
{ "data": { } }
{ "data": [ ], "meta": { "page": 1, "limit": 20, "total": 42, "total_pages": 3 } }
```

ผิดพลาด — ข้อความอยู่ใน `error.message` และถ้าเป็น validation จะมี `error.details` รายฟิลด์

```json
{
  "error": {
    "message": "ข้อมูลที่ส่งมาไม่ถูกต้อง",
    "details": [{ "field": "email", "message": "รูปแบบอีเมลไม่ถูกต้อง" }]
  }
}
```

| HTTP | ความหมาย |
| --- | --- |
| 400 | คำขอไม่ถูกต้อง เช่น วันที่จองย้อนหลัง |
| 401 | ไม่ได้ login หรือ token หมดอายุ |
| 403 | login แล้วแต่ไม่มีสิทธิ์ |
| 404 | ไม่พบข้อมูล |
| 409 | ขัดแย้งกับสถานะปัจจุบัน เช่น ที่นั่งเต็ม หรือเปลี่ยนสถานะข้ามขั้น |
| 422 | ข้อมูลนำเข้าไม่ผ่านการตรวจสอบ |
| 429 | ส่งคำขอถี่เกินกำหนด |

---

# Endpoint สาธารณะ

## `GET /api/health`

```json
{ "status": "ok", "database": "postgres", "uptime_seconds": 1284 }
```

ตอบ `503` พร้อม `"status": "degraded"` เมื่อเชื่อมฐานข้อมูลไม่ได้

## `GET /api/settings`

ค่าตั้งระบบที่หน้าเว็บใช้ แอดมินแก้ได้จากหน้าหลังบ้าน (ค่าที่ใช้เฉพาะหลังบ้านจะไม่ถูกส่งออกมา)

```json
{
  "data": {
    "opening_hours": "Daily 08:00 AM - 5:00 PM",
    "contact_phone": "095-447-2547",
    "contact_line": "@chokchaielephant",
    "contact_email": "Chokchaielephantcampcnx@gmail.com",
    "site_notice": "",
    "booking_min_lead_days": 1,
    "booking_max_advance_days": 365,
    "booking_max_guests": 30,
    "cancel_free_hours": 72,
    "pickup_time_morning": "06:00 - 06:30 น.",
    "pickup_time_afternoon": "11:30 - 12:00 น.",
    "payment_provider": "mock"
  }
}
```

`payment_provider` คือวิธีชำระเงินที่ใช้ได้จริงตอนนี้ (`mock` / `promptpay` / `stripe` / `none`) หน้าเว็บใช้ตัดสินว่าจะแสดงปุ่มชำระเงินหรือไม่
ถ้าแอดมินเลือก PromptPay แต่ยังไม่กรอกบัญชี ค่านี้จะเป็น `none` หมายเลขพร้อมเพย์ของร้านไม่ถูกส่งออกทาง endpoint นี้

## `GET /api/activities`

รายการกิจกรรมที่เปิดรับจอง เรียงตาม `sort_order` รองรับการค้นหาและกรองผ่าน query string

| พารามิเตอร์ | คำอธิบาย |
| --- | --- |
| `q` | ค้นจากชื่ออังกฤษ ชื่อไทย และคำอธิบาย (ไม่สนตัวพิมพ์เล็ก/ใหญ่) |
| `category` | กรองตามหมวดหมู่ เช่น `elephant`, `adventure`, `workshop` |
| `max_price` | ราคาผู้ใหญ่ไม่เกินค่านี้ |
| `sort` | `recommended` (ค่าเริ่มต้น) / `price_asc` / `price_desc` / `duration` |

คำตอบมี `meta.categories` เป็นรายการหมวดหมู่ทั้งหมดที่มีกิจกรรมเปิดอยู่ (ไม่ขึ้นกับตัวกรอง) ใช้สร้างตัวเลือกในหน้าเว็บ
และแต่ละกิจกรรมมีฟิลด์ `category` กับ `highlights` (จุดเด่น บรรทัดละ 1 ข้อ) เพิ่มจากตัวอย่างด้านล่าง

```json
{
  "data": [
    {
      "id": 1,
      "slug": "elephant-jungle-trekking",
      "name": "ELEPHANT JUNGLE TREKKING",
      "name_th": "เดินป่ากับช้าง",
      "description_th": "เดินป่าติดตามฝูงช้างในเส้นทางธรรมชาติ...",
      "duration_label": "1 ชั่วโมง",
      "duration_minutes": 60,
      "adult_price": 990,
      "child_price": 690,
      "infant_price": 0,
      "image_url": "images/activities/jungle-trekking.svg",
      "daily_capacity": 40,
      "sort_order": 1,
      "is_active": true
    }
  ],
  "meta": { "total": 6, "categories": ["adventure", "elephant", "workshop"] }
}
```

## `GET /api/activities/:slug`

รายละเอียดกิจกรรมเดียว — `404` ถ้าไม่พบหรือถูกปิดอยู่

## `GET /api/activities/:slug/availability?date=YYYY-MM-DD`

ที่ว่างของกิจกรรมในวันที่ระบุ ทารกไม่นับเข้าโควตา

```json
{
  "data": {
    "activity_slug": "elephant-bathing",
    "date": "2026-12-25",
    "capacity": 30,
    "booked": 6,
    "remaining": 24,
    "is_available": true
  }
}
```

## `POST /api/bookings`

สร้างการจอง — **ยอดเงินคำนวณจากราคาในฐานข้อมูล ไม่รับราคาที่ส่งมาจากเบราว์เซอร์**

| ฟิลด์ | ชนิด | บังคับ | หมายเหตุ |
| --- | --- | --- | --- |
| `activity_slug` | string | ✔︎* | ใช้ `activity_id` แทนได้ |
| `activity_id` | number | ✔︎* | ต้องมีอย่างใดอย่างหนึ่ง |
| `booking_date` | string | ✔︎ | `YYYY-MM-DD` ล่วงหน้าอย่างน้อย 1 วัน ไม่เกิน 365 วัน |
| `adults` | number | | ค่าเริ่มต้น 0 |
| `children` | number | | ค่าเริ่มต้น 0 |
| `infants` | number | | ค่าเริ่มต้น 0 ต้องมีผู้ใหญ่ด้วยอย่างน้อย 1 คน |
| `first_name` | string | ✔︎ | |
| `last_name` | string | ✔︎ | |
| `phone` | string | ✔︎ | |
| `email` | string | ✔︎ | ใช้คู่กับรหัสการจองเพื่อดูสถานะภายหลัง |
| `contact_app` | string | | `Line` (ค่าเริ่มต้น) / `WhatsApp` / `WeChat` |
| `note` | string | | ข้อจำกัดด้านอาหาร ฯลฯ |
| `pickup_type` | string | | `hotel` / `meeting_point` / `airbnb` / `undecided` |
| `pickup_detail` | string | | ชื่อโรงแรมหรือจุดรับ |
| `accept_terms` | boolean | ✔︎ | ต้องเป็น `true` |

ข้อกำหนด: `adults + children` ต้องมากกว่า 0 และรวมทุกประเภทไม่เกิน 30 คนต่อรายการ

```bash
curl -X POST http://localhost:8080/api/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "activity_slug": "elephant-bathing",
    "booking_date": "2026-12-25",
    "adults": 2, "children": 1, "infants": 0,
    "first_name": "สมชาย", "last_name": "ใจดี",
    "phone": "081-234-5678", "email": "somchai@example.com",
    "contact_app": "Line",
    "pickup_type": "hotel", "pickup_detail": "Nimman Hotel",
    "accept_terms": true
  }'
```

`201 Created`

```json
{
  "data": {
    "id": 12,
    "booking_ref": "CEC-7QK4M2",
    "activity_id": 2,
    "booking_date": "2026-12-25",
    "adults": 2, "children": 1, "infants": 0,
    "unit_adult_price": 1290,
    "unit_child_price": 990,
    "unit_infant_price": 0,
    "total_amount": 3570,
    "currency": "THB",
    "first_name": "สมชาย", "last_name": "ใจดี",
    "phone": "081-234-5678",
    "email": "somchai@example.com",
    "status": "pending",
    "payment_status": "unpaid",
    "activity": { "id": 2, "slug": "elephant-bathing", "name": "ELEPHANT BATHING", "name_th": "อาบน้ำช้าง" }
  }
}
```

`409` เมื่อที่ว่างไม่พอ — `details` บอกจำนวนที่เหลือเพื่อให้หน้าเว็บแสดงผลได้

```json
{
  "error": {
    "message": "วันที่ 2026-12-25 เหลือที่ว่างเพียง 2 ที่ แต่คุณจอง 5 ที่",
    "details": { "remaining": 2, "requested": 5 }
  }
}
```

จำกัด 20 ครั้งต่อ 15 นาทีต่อ IP

**ฟิลด์ที่เพิ่มในเวอร์ชันนี้**

| ฟิลด์ | หมายเหตุ |
| --- | --- |
| `contact_app` | `Line` (ค่าเริ่มต้น) / `WhatsApp` / `WeChat` / `Instagram` |
| `contact_id` | ไอดีของแอปที่เลือก เช่น LINE ID หรือชื่อบัญชี Instagram (ไม่เกิน 80 ตัว) — หน้าเว็บบังคับกรอก |
| `pickup_round` | รอบเวลารับ `morning` (ค่าเริ่มต้น) หรือ `afternoon` |

**เพิ่มเติม**

- ถ้าแนบ header `Authorization: Bearer <token ของลูกค้า>` มาด้วย การจองจะถูกผูกกับบัญชีนั้น (`user_id`) และไปแสดงในประวัติการจอง ไม่แนบก็จองได้ตามปกติ
- คำตอบมี `payment: { "provider": "...", "token": "..." }` — `token` ใช้กับ `/api/payments/*` ของการจองนี้
- ลูกค้าได้รับอีเมล "เราได้รับการจองของคุณแล้ว" ทันที
- กติกา (จองล่วงหน้ากี่วัน จำนวนคนสูงสุด) อ่านจากค่าตั้งระบบ ดู `GET /api/settings`

## `GET /api/bookings/:ref?email=...`

ลูกค้าดูการจองของตัวเอง ต้องระบุทั้งรหัสการจองและอีเมลที่ใช้ตอนจอง
ถ้าอีเมลไม่ตรงจะได้ `404` เหมือนกรณีไม่พบ เพื่อไม่ให้เดารหัสแล้วรู้ว่ามีการจองนี้อยู่จริง

```bash
curl "http://localhost:8080/api/bookings/CEC-7QK4M2?email=somchai@example.com"
```

คำตอบมี `cancellation` บอกว่าลูกค้ายกเลิกเองได้หรือไม่ และ `payment.provider`

```json
"cancellation": { "can_cancel": true, "deadline": "2026-12-21T17:00:00.000Z", "reason": null }
```

## `POST /api/bookings/:ref/cancel`

ลูกค้าที่ไม่ได้ล็อกอินยกเลิกการจองของตัวเอง ยืนยันตัวด้วยอีเมลที่ใช้จอง

```json
{ "email": "somchai@example.com", "reason": "เปลี่ยนแผนเดินทาง" }
```

- ยกเลิกได้เฉพาะสถานะ `pending` / `confirmed` และต้องก่อนวันกิจกรรมอย่างน้อย `cancel_free_hours` ชั่วโมง — ไม่เข้าเงื่อนไขได้ `409`
- อีเมลไม่ตรงได้ `404` (ไม่บอกว่ารหัสการจองมีอยู่จริงหรือไม่)
- ที่นั่งถูกคืนเข้าโควตาทันที และลูกค้าได้รับอีเมลยืนยันการยกเลิก
- ถ้าการจองชำระเงินแล้ว `payment_status` จะยังเป็น `paid` จนกว่าทีมงานจะคืนเงินและบันทึกเป็น `refunded`

## `POST /api/bookings/:ref/pay`

ขอลิงก์ไปหน้าชำระเงิน body: `{ "email": "somchai@example.com" }`

```json
{ "data": { "provider": "mock", "checkout_url": "http://localhost:8080/payment.html?ref=CEC-7QK4M2&token=...&mode=mock" } }
```

ได้ `409` ถ้าการจองชำระแล้ว ถูกยกเลิก หรือเซิร์ฟเวอร์ตั้ง `PAYMENT_PROVIDER=none`
เมื่อ provider เป็น `stripe` ค่า `checkout_url` จะเป็นหน้า Stripe Checkout

## `GET /api/payments/status?ref=...&token=...`

สถานะการชำระเงินของการจอง ใช้ `token` จากลิงก์ชำระเงินแทนการล็อกอิน (token ผิดได้ `403`)

```json
{
  "data": {
    "provider": "mock",
    "booking_ref": "CEC-7QK4M2",
    "activity": { "id": 2, "slug": "elephant-bathing", "name": "ELEPHANT BATHING", "name_th": "อาบน้ำช้าง" },
    "booking_date": "2026-12-25",
    "total_amount": 3570,
    "currency": "THB",
    "status": "confirmed",
    "payment_status": "paid",
    "payment_method": "mock",
    "paid_at": "2026-10-05T08:30:11.000Z",
    "email": "somchai@example.com"
  }
}
```

เมื่อ provider เป็น `promptpay` และการจองยังไม่ชำระ คำตอบจะมี `promptpay` เพิ่ม

```json
"promptpay": {
  "qr_image": "data:image/png;base64,...",
  "account_name": "ปางช้างโชคชัย",
  "account_id": "095-xxx-2547"
}
```

`qr_image` คือ QR พร้อมเพย์มาตรฐาน EMVCo ที่ฝังหมายเลขของร้านและยอดเงินของการจองนี้ไว้แล้ว

## `POST /api/payments/promptpay/notify`

ลูกค้าแจ้งว่าโอนเงินแล้ว พร้อมแนบสลิป

```json
{ "ref": "CEC-7QK4M2", "token": "...", "note": "โอน 14:32 น.", "slip": "data:image/jpeg;base64,/9j/4AAQ..." }
```

| ฟิลด์ | หมายเหตุ |
| --- | --- |
| `note` | ไม่บังคับ ไม่เกิน 90 ตัว |
| `slip` | รูปสลิปแบบ data URL ชนิด JPEG / PNG / WebP ไม่เกิน 4 MB — หน้าเว็บบังคับแนบ ส่วน API ไม่บังคับ |

เซิร์ฟเวอร์ตรวจชนิดไฟล์จากเนื้อไฟล์จริง ไฟล์ที่ไม่ใช่รูปได้ `422` และ body เกิน 6 MB ได้ `413`
คำตอบมี `has_slip: true` เมื่อบันทึกสลิปแล้ว

- `payment_status` เปลี่ยนเป็น `reviewing` — **ยังไม่ถือว่าได้รับเงิน** จนกว่าแอดมินจะตั้งเป็น `paid`
- ลูกค้าได้อีเมลยืนยันการแจ้งโอน และทีมงานได้อีเมลแจ้งให้ตรวจยอด (ถ้าตั้ง `admin_notify_email`)
- แจ้งซ้ำ หรือการจองถูกยกเลิก / ชำระแล้ว ได้ `409` · ไม่ได้เปิด PromptPay ได้ `404`

## `POST /api/payments/mock/confirm`

จำลองว่าชำระเงินสำเร็จ body: `{ "ref": "CEC-7QK4M2", "token": "..." }` — ใช้ได้เฉพาะเมื่อ `PAYMENT_PROVIDER=mock` (ค่าอื่นได้ `404`)

ผลคือ `payment_status = paid`, การจองที่ยัง `pending` ถูกเปลี่ยนเป็น `confirmed` และลูกค้าได้รับอีเมลแจ้งรับชำระ

## `POST /api/payments/stripe/webhook`

Stripe เรียกเข้ามาเองเมื่อเกิด event `checkout.session.completed` ไม่ได้ออกแบบให้หน้าเว็บเรียก
เซิร์ฟเวอร์ตรวจลายเซ็นใน header `Stripe-Signature` ด้วย `STRIPE_WEBHOOK_SECRET` — ไม่ผ่านได้ `400`
event เดิมที่ถูกส่งซ้ำจะไม่ทำให้บันทึกรับเงินหรือส่งอีเมลซ้ำ

## `GET /api/reviews`

รีวิวที่แอดมินอนุมัติแล้ว

พารามิเตอร์: `page`, `limit` (สูงสุด 100), `source` (`google` / `tripadvisor` / `website`), `min_rating` (1-5)

`meta.average_rating` คือคะแนนเฉลี่ยของรีวิวที่เผยแพร่ทั้งหมด (หน้าแรกเอาไปแสดงเป็น "4.9★")

## `POST /api/reviews`

ส่งรีวิวจากหน้าเว็บ — บันทึกเป็น `is_published: false` รอแอดมินอนุมัติ ตอบ `202 Accepted`

```json
{ "author_name": "Emily R.", "rating": 5, "comment": "Amazing experience!" }
```

## `GET /api/faqs`

คำถามที่พบบ่อยที่เผยแพร่อยู่ เรียงตาม `sort_order`

## `POST /api/inquiries`

ฟอร์ม "Send us Your Question" — `contact` รับได้ทั้งอีเมลและเบอร์โทร ระบบแยกชนิดให้เองใน `contact_type`

```json
{ "contact": "somchai@example.com", "message": "มีรถรับส่งจากสนามบินไหมครับ" }
```

---

# Endpoint สมาชิก (ลูกค้า)

token ของลูกค้าได้จากการสมัครหรือเข้าสู่ระบบ อายุ 7 วัน ส่งมาใน header เหมือนของแอดมิน

```
Authorization: Bearer <token ของลูกค้า>
```

token ของลูกค้าใช้เรียก `/api/admin/*` ไม่ได้ (`403`) และ token ของทีมงานใช้เรียก `/api/account/*` ไม่ได้ (`401`)

## `POST /api/account/register`

| ฟิลด์ | บังคับ | หมายเหตุ |
| --- | --- | --- |
| `email` | ✔︎ | ซ้ำกับบัญชีที่มีอยู่ได้ `409` |
| `password` | ✔︎ | อย่างน้อย 8 ตัว มีทั้งตัวอักษรและตัวเลข |
| `first_name`, `last_name` | ✔︎ | |
| `phone` | | |
| `contact_app` | | `Line` (ค่าเริ่มต้น) / `WhatsApp` / `WeChat` / `Instagram` |
| `contact_id` | | ไอดีของแอปที่เลือก — หน้าเว็บบังคับกรอก |

```json
{
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "expires_in": "7d",
    "user": { "id": 1, "email": "manee@example.com", "first_name": "มานี", "last_name": "ใจดี", "phone": "089-000-1111", "contact_app": "Line", "is_active": true }
  }
}
```

การจองที่เคยทำไว้แบบไม่ล็อกอินด้วยอีเมลเดียวกันจะถูกผูกเข้าบัญชีใหม่ให้อัตโนมัติ และระบบส่งอีเมลต้อนรับ

## `POST /api/account/login`

body: `{ "email": "...", "password": "..." }` — คำตอบรูปแบบเดียวกับ register
รหัสผิดได้ `401` บัญชีที่ถูกระงับได้ `403` จำกัด 20 ครั้งต่อ 15 นาที

## `GET /api/account/me` · `PATCH /api/account/me`

ดู / แก้ไขโปรไฟล์ ฟิลด์ที่แก้ได้: `first_name`, `last_name`, `phone`, `contact_app`, `contact_id` (อีเมลแก้ไม่ได้)

## `POST /api/account/password`

body: `{ "current_password": "...", "new_password": "..." }` — รหัสปัจจุบันผิดได้ `400`

## `GET /api/account/bookings`

ประวัติการจองทั้งหมดของบัญชี เรียงจากวันที่เข้าร่วมล่าสุด แต่ละรายการมี `cancellation` เหมือน `GET /api/bookings/:ref`

## `GET /api/account/bookings/:ref`

รายละเอียดการจองเดียว — การจองของคนอื่นได้ `404`

## `POST /api/account/bookings/:ref/cancel` · `POST /api/account/bookings/:ref/pay`

ทำงานเหมือน `POST /api/bookings/:ref/cancel` และ `/pay` แต่ไม่ต้องส่งอีเมล เพราะยืนยันตัวด้วย token แล้ว

## `GET /api/account/notifications`

การแจ้งเตือนล่าสุด 30 รายการของบัญชี (เนื้อหาเดียวกับอีเมลที่ส่ง)

```json
{
  "data": [
    { "id": 12, "type": "payment_received", "subject": "ได้รับการชำระเงินแล้ว (CEC-7QK4M2)", "body": "...", "booking_id": 8, "is_read": false, "created_at": "2026-10-05T08:30:11.000Z" }
  ],
  "meta": { "unread": 1 }
}
```

`type` ที่เป็นไปได้: `welcome`, `booking_created`, `payment_reviewing`, `payment_received`, `booking_confirmed`, `booking_completed`, `booking_cancelled`

## `POST /api/account/notifications/read`

ทำเครื่องหมายว่าอ่านแล้วทั้งหมด ตอบ `204`

---

# Authentication (ทีมงาน)

## `POST /api/auth/login`

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@chokchai.local","password":"Admin@1234"}'
```

```json
{
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "expires_in": "8h",
    "user": { "id": 1, "email": "admin@chokchai.local", "name": "ผู้ดูแลระบบ", "role": "admin" }
  }
}
```

จำกัด 10 ครั้งต่อ 15 นาทีต่อ IP (นับเฉพาะครั้งที่ล้มเหลว)

## `GET /api/auth/me`

ข้อมูลผู้ใช้ปัจจุบัน ต้องมี header `Authorization: Bearer <token>`

---

# Endpoint แอดมิน

ทุก endpoint ใต้ `/api/admin` ต้องมี header

```
Authorization: Bearer <token>
```

## `GET /api/admin/stats`

```json
{
  "data": {
    "bookings": {
      "total": 128,
      "by_status": { "pending": 12, "confirmed": 88, "completed": 24, "cancelled": 4 },
      "today": 3,
      "upcoming": 41
    },
    "revenue_thb": 452300,
    "pending_inquiries": 5,
    "unpublished_reviews": 2
  }
}
```

`revenue_thb` นับเฉพาะการจองสถานะ `confirmed` และ `completed`

## `GET /api/admin/bookings`

| พารามิเตอร์ | คำอธิบาย |
| --- | --- |
| `page`, `limit` | แบ่งหน้า (limit สูงสุด 100) |
| `status` | `pending` / `confirmed` / `cancelled` / `completed` |
| `payment_status` | `unpaid` / `reviewing` (ลูกค้าแจ้งโอนแล้ว รอตรวจ) / `paid` / `refunded` |
| `activity_id` | กรองตามกิจกรรม |
| `date_from`, `date_to` | ช่วงวันที่เข้าร่วมกิจกรรม |
| `q` | ค้นหาจากรหัสจอง / อีเมล / ชื่อ / นามสกุล / เบอร์โทร |

```bash
curl "http://localhost:8080/api/admin/bookings?status=pending&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

## `GET /api/admin/bookings/:id`

## `GET /api/admin/bookings/:id/slip`

รูปสลิปโอนเงินที่ลูกค้าแนบ ตอบกลับเป็น**ไฟล์รูป** (`Content-Type: image/jpeg` ฯลฯ) ไม่ใช่ JSON และห้ามแคช
การจองที่ไม่มีสลิปได้ `404` — ดูว่ามีสลิปหรือไม่ได้จากฟิลด์ `slip_uploaded_at` ของการจอง

## `PATCH /api/admin/bookings/:id`

ส่งอย่างน้อยหนึ่งฟิลด์: `status`, `payment_status`, `payment_ref`

- เปลี่ยน `status` แล้วลูกค้าจะได้รับอีเมลแจ้ง (ยืนยัน / เสร็จสิ้น / ยกเลิก)
- ตั้ง `payment_status` เป็น `paid` = บันทึกรับเงินนอกระบบ (`payment_method = manual`) ลูกค้าได้รับอีเมลแจ้งรับชำระ
- ตั้งเป็น `refunded` หลังคืนเงินให้ลูกค้าแล้ว

สถานะเปลี่ยนได้ตามลำดับนี้เท่านั้น ข้ามขั้นจะได้ `409`

```
pending ──► confirmed ──► completed
   │            │
   └────────────┴──────► cancelled
```

`completed` และ `cancelled` เป็นสถานะสุดท้าย เปลี่ยนต่อไม่ได้
การเปลี่ยนเป็น `cancelled` จะบันทึก `cancelled_at` ให้อัตโนมัติ และคืนที่ว่างให้วันนั้นทันที

```bash
curl -X PATCH http://localhost:8080/api/admin/bookings/12 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"confirmed","payment_status":"paid"}'
```

## `GET /api/admin/activities`

รายการกิจกรรมทั้งหมดรวมที่ `is_active: false`

## `POST /api/admin/activities`

ฟิลด์บังคับ: `slug`, `name`, `name_th`, `duration_label`, `adult_price`, `child_price`
`slug` ต้องเป็นตัวพิมพ์เล็ก ตัวเลข หรือขีดกลางเท่านั้น และห้ามซ้ำ (`409` ถ้าซ้ำ)

## `PATCH /api/admin/activities/:id`

ส่งเฉพาะฟิลด์ที่ต้องการแก้ การแก้ราคาไม่กระทบยอดของการจองเดิม
เพราะ `bookings` เก็บราคา ณ เวลาที่จองไว้แล้ว

## `DELETE /api/admin/activities/:id`

เฉพาะ role `admin` — ถ้ามีการจองอ้างอิงอยู่จะได้ `409` ให้ใช้ `PATCH` ตั้ง `is_active: false` แทน

## `GET /api/admin/reviews`

เพิ่มพารามิเตอร์ `is_published=true|false` จากของสาธารณะ

## `PATCH /api/admin/reviews/:id`

`is_published` (อนุมัติ/ซ่อน), `sort_order`, `comment`

## `DELETE /api/admin/reviews/:id`

เฉพาะ role `admin`

## `GET /api/admin/inquiries`

พารามิเตอร์: `page`, `limit`, `status` (`new` / `answered` / `closed`)

## `PATCH /api/admin/inquiries/:id`

ส่ง `answer` และ/หรือ `status` — ถ้าส่ง `answer` มาโดยไม่ระบุ `status`
ระบบจะตั้งเป็น `answered` และบันทึก `answered_at` ให้เอง

## `GET /api/admin/reports?from=YYYY-MM-DD&to=YYYY-MM-DD`

รายงานยอดจองตามวันที่ทำรายการ ไม่ส่งช่วงวันที่ = 30 วันล่าสุด (เลือกได้ไม่เกิน 1 ปี)

```json
{
  "data": {
    "from": "2026-09-06",
    "to": "2026-10-05",
    "totals": { "bookings": 42, "cancelled": 3, "guests": 118, "revenue": 152300, "paid": 140100 },
    "daily": [{ "date": "2026-09-06", "bookings": 2, "cancelled": 0, "guests": 5, "revenue": 6450, "paid": 6450 }],
    "by_activity": [{ "activity_id": 2, "name_th": "อาบน้ำช้าง", "bookings": 15, "cancelled": 1, "guests": 44, "revenue": 51200, "paid": 47630 }]
  }
}
```

- `guests` ไม่นับการจองที่ถูกยกเลิก
- `revenue` = ยอดของการจองสถานะ `confirmed` / `completed` (นิยามเดียวกับ `revenue_thb` ใน stats)
- `paid` = ยอดของการจองที่ `payment_status = paid`
- `daily` มีครบทุกวันในช่วง วันที่ไม่มีการจองจะเป็น 0

## `GET /api/admin/users` · `PATCH /api/admin/users/:id`

รายชื่อลูกค้าที่สมัครสมาชิก พารามิเตอร์: `page`, `limit`, `q` (ชื่อ / อีเมล / เบอร์โทร), `is_active` (`true` / `false`)
แต่ละรายการมี `booking_count`

`PATCH` รับ `{ "is_active": false }` เพื่อระงับบัญชี — ลูกค้าจะเข้าสู่ระบบไม่ได้และ token เดิมใช้ไม่ได้ทันที

## `GET /api/admin/staff` · `POST /api/admin/staff` · `PATCH /api/admin/staff/:id`

จัดการบัญชีทีมงาน **เฉพาะ role `admin`** (staff เรียกได้ `403`)

| ฟิลด์ | หมายเหตุ |
| --- | --- |
| `email` | เฉพาะตอนสร้าง |
| `name` | |
| `role` | `admin` หรือ `staff` |
| `password` | ตอนสร้างบังคับ ตอนแก้ไขส่งมาเมื่อต้องการตั้งรหัสใหม่ |
| `is_active` | เฉพาะตอนแก้ไข |

ระบบไม่ยอมให้ปิดบัญชีหรือลดสิทธิ์ของตัวเอง และต้องเหลือ admin ที่ใช้งานได้อย่างน้อย 1 บัญชีเสมอ (`409`)

| สิ่งที่ทำได้ | admin | staff |
| --- | --- | --- |
| ดูและจัดการการจอง คำถาม รีวิว ลูกค้า รายงาน | ✔︎ | ✔︎ |
| เพิ่ม / แก้ไขกิจกรรม | ✔︎ | ✔︎ |
| ลบกิจกรรม / ลบรีวิว | ✔︎ | |
| แก้ค่าตั้งระบบ | ✔︎ | ดูได้อย่างเดียว |
| จัดการบัญชีทีมงาน | ✔︎ | |

## `GET /api/admin/settings` · `PUT /api/admin/settings`

ค่าตั้งระบบทั้งหมด (รวม `admin_notify_email` ที่ไม่อยู่ใน `GET /api/settings`) `PUT` ส่งเฉพาะค่าที่ต้องการแก้ และทำได้เฉพาะ role `admin`

| key | ช่วงค่า | ผล |
| --- | --- | --- |
| `opening_hours`, `contact_phone`, `contact_line`, `contact_email` | ข้อความ | แสดงบนหน้าเว็บ |
| `site_notice` | ข้อความ ≤ 300 ตัว | แถบประกาศด้านบนทุกหน้า เว้นว่าง = ไม่แสดง |
| `booking_min_lead_days` | 0–60 | ต้องจองล่วงหน้าอย่างน้อยกี่วัน |
| `booking_max_advance_days` | 1–730 | จองล่วงหน้าได้ไกลสุดกี่วัน |
| `booking_max_guests` | 1–100 | จำนวนคนสูงสุดต่อ 1 การจอง |
| `cancel_free_hours` | 0–720 | ลูกค้ายกเลิกเองได้ก่อนวันกิจกรรมกี่ชั่วโมง |
| `pickup_time_morning`, `pickup_time_afternoon` | ข้อความ | เวลารับของรอบเช้า / รอบกลางวัน ที่แสดงในฟอร์มจอง |
| `payment_provider` | `mock` / `promptpay` / `stripe` / `none` | วิธีชำระเงินออนไลน์ |
| `promptpay_id` | เบอร์มือถือ 10 หลัก หรือเลข 13 หลัก | บัญชีพร้อมเพย์ที่ใช้รับเงิน (ใส่ขีดหรือเว้นวรรคได้) |
| `promptpay_name` | ข้อความ | ชื่อบัญชีที่แสดงให้ลูกค้าเทียบกับในแอปธนาคาร |
| `admin_notify_email` | อีเมลหรือว่าง | รับสำเนาเมื่อมีการจองใหม่ / ลูกค้ายกเลิก |

เลือก `promptpay` โดยยังไม่มีหมายเลขและชื่อบัญชี หรือเลือก `stripe` โดยเซิร์ฟเวอร์ไม่มี `STRIPE_SECRET_KEY` จะได้ `422`

ค่าที่ไม่เคยตั้งจะใช้ค่าเริ่มต้น (กติกาการจองใช้ค่าจาก `.env`) การแก้ไขมีผลทันทีโดยไม่ต้องรีสตาร์ท

## `GET /api/admin/notifications`

บันทึกการแจ้งเตือนทุกฉบับที่ระบบส่ง พารามิเตอร์: `page`, `limit`, `status`

| `status` | ความหมาย |
| --- | --- |
| `sent` | ส่งอีเมลสำเร็จ |
| `queued` | กำลังส่ง |
| `failed` | ส่งไม่สำเร็จ ดูสาเหตุในฟิลด์ `error` |
| `logged` | เซิร์ฟเวอร์ไม่ได้ตั้งค่า SMTP จึงบันทึกไว้เฉย ๆ |
