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

## `GET /api/activities`

รายการกิจกรรมที่เปิดรับจอง เรียงตาม `sort_order`

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
      "image_url": "images/activities/jungle-trekking.jpg",
      "daily_capacity": 40,
      "sort_order": 1,
      "is_active": true
    }
  ]
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

## `GET /api/bookings/:ref?email=...`

ลูกค้าดูการจองของตัวเอง ต้องระบุทั้งรหัสการจองและอีเมลที่ใช้ตอนจอง
ถ้าอีเมลไม่ตรงจะได้ `404` เหมือนกรณีไม่พบ เพื่อไม่ให้เดารหัสแล้วรู้ว่ามีการจองนี้อยู่จริง

```bash
curl "http://localhost:8080/api/bookings/CEC-7QK4M2?email=somchai@example.com"
```

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

# Authentication

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
| `payment_status` | `unpaid` / `paid` / `refunded` |
| `activity_id` | กรองตามกิจกรรม |
| `date_from`, `date_to` | ช่วงวันที่เข้าร่วมกิจกรรม |
| `q` | ค้นหาจากรหัสจอง / อีเมล / ชื่อ / นามสกุล / เบอร์โทร |

```bash
curl "http://localhost:8080/api/admin/bookings?status=pending&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

## `GET /api/admin/bookings/:id`

## `PATCH /api/admin/bookings/:id`

ส่งอย่างน้อยหนึ่งฟิลด์: `status`, `payment_status`, `payment_ref`

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
