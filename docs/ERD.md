# โครงสร้างฐานข้อมูล

## ER Diagram

```mermaid
erDiagram
    ACTIVITIES ||--o{ BOOKINGS : "มีการจอง"

    ACTIVITIES {
        int      id PK
        string   slug UK "ใช้ใน URL เช่น elephant-bathing"
        string   name "ชื่ออังกฤษ"
        string   name_th "ชื่อไทย"
        text     description_th
        string   duration_label "เช่น 1.5 ชั่วโมง"
        int      duration_minutes
        decimal  adult_price
        decimal  child_price
        decimal  infant_price
        string   image_url
        int      daily_capacity "โควตาคนต่อวัน"
        int      sort_order
        bool     is_active
    }

    BOOKINGS {
        int      id PK
        string   booking_ref UK "เช่น CEC-7QK4M2"
        int      activity_id FK
        date     booking_date
        int      adults
        int      children
        int      infants
        decimal  unit_adult_price "ราคา ณ เวลาที่จอง"
        decimal  unit_child_price
        decimal  unit_infant_price
        decimal  total_amount
        string   currency
        string   first_name
        string   last_name
        string   phone
        string   email
        string   contact_app
        text     note
        string   pickup_type
        string   pickup_detail
        string   status "pending/confirmed/completed/cancelled"
        string   payment_status "unpaid/paid/refunded"
        string   payment_ref
        timestamp cancelled_at
    }

    REVIEWS {
        int      id PK
        string   author_name
        int      rating "1-5"
        string   source "google/tripadvisor/website"
        text     comment
        bool     is_published "ต้องอนุมัติก่อนแสดง"
        int      sort_order
    }

    FAQS {
        int      id PK
        string   question
        text     answer
        int      sort_order
        bool     is_published
    }

    INQUIRIES {
        int      id PK
        string   contact "อีเมลหรือเบอร์โทร"
        string   contact_type "email/phone/unknown"
        text     message
        string   status "new/answered/closed"
        text     answer
        timestamp answered_at
    }

    ADMIN_USERS {
        int      id PK
        string   email UK
        string   password_hash "bcrypt"
        string   name
        string   role "admin/staff"
        bool     is_active
        timestamp last_login_at
    }
```

`REVIEWS`, `FAQS`, `INQUIRIES` และ `ADMIN_USERS` ไม่มีความสัมพันธ์กับตารางอื่น
เป็นตารางเนื้อหาและบัญชีผู้ใช้ที่อยู่ลำพัง ส่วน `BOOKINGS` เป็นตารางเดียวที่อ้างถึง `ACTIVITIES`

ทุกตารางมี `created_at` และ `updated_at` ที่ตั้งค่าเริ่มต้นเป็นเวลาปัจจุบัน

---

## เหตุผลเบื้องหลังการออกแบบ

### ทำไม `bookings` ถึงเก็บราคาซ้ำ

คอลัมน์ `unit_adult_price`, `unit_child_price`, `unit_infant_price` เก็บราคาที่คัดลอกมาจาก
`activities` ณ วินาทีที่ลูกค้ากดจอง แม้จะดูเหมือนข้อมูลซ้ำซ้อน แต่จำเป็น

ถ้าไม่เก็บไว้ แล้วแอดมินขึ้นราคา Elephant Bathing จาก 1,290 เป็น 1,490 บาทในเดือนหน้า
การจองเก่าทั้งหมดที่คำนวณย้อนหลังจะได้ยอดใหม่ทันที ซึ่งไม่ตรงกับเงินที่ลูกค้าจ่ายไปจริง
การเก็บ snapshot ไว้ทำให้ประวัติการจองและรายงานรายได้ยังถูกต้องเสมอ

### `total_amount` คำนวณที่ไหน

คำนวณฝั่งเซิร์ฟเวอร์เท่านั้น ใน `backend/src/services/booking.service.js`
หน้าเว็บคำนวณยอดแสดงผลด้วยแต่เป็นเพียงการแสดงตัวอย่าง — ค่าที่บันทึกลงฐานข้อมูล
มาจากราคาในตาราง `activities` เสมอ ทำให้แก้ราคาผ่าน DevTools แล้วจ่ายถูกลงไม่ได้

### การนับที่ว่าง

```sql
SELECT SUM(adults + children)
FROM bookings
WHERE activity_id = ?
  AND booking_date = ?
  AND status IN ('pending', 'confirmed', 'completed');
```

- **ทารกไม่นับ** เพราะไม่ได้ใช้ที่นั่งแยก แต่บังคับว่าต้องมีผู้ใหญ่มาด้วยอย่างน้อย 1 คน
- **`pending` นับด้วย** เพราะการจองที่รอชำระเงินก็กันที่นั่งไว้แล้ว ไม่งั้นจะขายเกิน
- **`cancelled` ไม่นับ** ที่นั่งจึงคืนกลับสู่ระบบทันทีที่แอดมินกดยกเลิก

มี index `bookings_activity_date_idx` บน `(activity_id, booking_date)` รองรับ query นี้โดยตรง

### การกันจองพร้อมกันจนเกินโควตา

ถ้าเช็คที่ว่างแล้วค่อย insert แบบแยกกัน สองคนที่กดจองพร้อมกันอาจผ่านการเช็คทั้งคู่
แล้วยอดรวมเกินโควตา ระบบจึงทำทั้งสองขั้นใน transaction เดียวและล็อกแถวกิจกรรมก่อน

```js
const activity = await trx('activities').where({ slug }).forUpdate().first();
// ตั้งแต่บรรทัดนี้ไป transaction อื่นที่จองกิจกรรมเดียวกันจะรอจนกว่าจะ commit
const booked = await countBookedSeats(activity.id, date, trx);
```

`SELECT ... FOR UPDATE` ใช้ได้ทั้ง PostgreSQL และ MySQL

### สถานะและลำดับการเปลี่ยน

```
pending ──► confirmed ──► completed
   │            │
   └────────────┴──────► cancelled
```

บังคับลำดับไว้ที่ `ALLOWED_TRANSITIONS` ใน `booking.service.js` การข้ามขั้น เช่น
`pending → completed` จะถูกปฏิเสธด้วย HTTP 409 ป้องกันการกดผิดในหน้าแอดมิน
ที่จะทำให้ตัวเลขรายได้เพี้ยน

`payment_status` แยกจาก `status` เพราะลูกค้าอาจจ่ายเงินแล้วแต่ยังไม่ได้มาร่วมกิจกรรม
หรือยกเลิกหลังจ่ายแล้วซึ่งต้องบันทึกเป็น `refunded`

### ทำไม `inquiries` ถึงมี `contact` ช่องเดียว

ฟอร์มในหน้าเว็บ ("Your email or phone number") รับทั้งสองแบบในช่องเดียว
ระบบจึงเก็บค่าดิบไว้ใน `contact` แล้วเดาชนิดใส่ `contact_type` ให้ (`email` / `phone` / `unknown`)
แทนที่จะบังคับให้ผู้ใช้เลือกชนิดเอง

### รหัสการจอง

รูปแบบ `CEC-XXXXXX` โดย `X` สุ่มจากชุดอักขระ 32 ตัวที่ตัด `0`, `O`, `1`, `I` ออก
เพราะลูกค้าต้องอ่านรหัสนี้ทางโทรศัพท์และตัวอักษรเหล่านี้สับสนกันง่าย
ให้ความเป็นไปได้ 32⁶ ≈ 1,073 ล้านค่า และถ้าสุ่มชนของเดิมจริง ระบบจะสุ่มใหม่ให้อัตโนมัติสูงสุด 5 ครั้ง

---

## การแก้ไข schema

อย่าแก้ตารางด้วยมือใน DBeaver เพราะจะทำให้ฐานข้อมูลของแต่ละคนในทีมไม่ตรงกัน
ให้สร้างไฟล์ migration ใหม่แทน

```js
// backend/src/db/migrations/20260315120000_add_guide_language.js
export async function up(knex) {
  await knex.schema.alterTable('bookings', (table) => {
    table.string('guide_language', 20).notNullable().defaultTo('th');
  });
}

export async function down(knex) {
  await knex.schema.alterTable('bookings', (table) => {
    table.dropColumn('guide_language');
  });
}
```

ตั้งชื่อไฟล์ขึ้นต้นด้วย timestamp เพื่อให้รันตามลำดับ แล้วสั่ง

```bash
cd backend && npm run db:migrate
```

ถ้ารันผ่าน Docker เพียง `docker compose restart api` ก็พอ เพราะ API รัน migration ให้ตอนบูต
