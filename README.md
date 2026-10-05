# Chokchai Elephant Camp — Website + Backend

ระบบเว็บไซต์และระบบจองกิจกรรมของปางช้างโชคชัย ประกอบด้วยเว็บหน้าบ้าน (Tailwind CSS + JavaScript),
REST API (Node.js + Express), ฐานข้อมูล PostgreSQL และระบบหลังบ้านสำหรับจัดการการจอง
ทุกส่วนรันด้วย Docker Compose คำสั่งเดียว

**สิ่งที่ระบบทำได้**

| ฝั่งลูกค้า | ฝั่งหลังบ้าน |
| --- | --- |
| ดูกิจกรรม ค้นหา กรองหมวดหมู่ เรียงตามราคา | เข้าสู่ระบบแบบแยกสิทธิ์ (ผู้ดูแลระบบ / พนักงาน) |
| หน้ารายละเอียดกิจกรรม + เช็กที่ว่างตามวันที่ | จัดการการจอง: ยืนยัน เสร็จสิ้น ยกเลิก บันทึกรับเงิน / คืนเงิน |
| จอง 4 ขั้นตอน เลือกรอบรับเช้า/กลางวัน (จองได้ทั้งแบบสมาชิกและไม่ล็อกอิน) | เพิ่ม / แก้ไข / ปิด / ลบกิจกรรม และกำหนดโควตาต่อวัน |
| สมัครสมาชิก เข้าสู่ระบบ แก้โปรไฟล์ เปลี่ยนรหัสผ่าน | จัดการบัญชีลูกค้าและบัญชีทีมงาน |
| ประวัติการจอง ยกเลิกการจองเองตามนโยบาย | รายงานยอดจองรายวัน / รายกิจกรรม + ดาวน์โหลด CSV |
| ชำระเงินออนไลน์ (PromptPay QR, Stripe หรือโหมดจำลอง) | ตั้งค่าระบบ: เวลาทำการ กติกาการจอง แถบประกาศ |
| อีเมลยืนยัน + การแจ้งเตือนในหน้าบัญชี | บันทึกอีเมลทุกฉบับที่ระบบส่ง ตอบคำถาม อนุมัติรีวิว |

---

## สถาปัตยกรรม

```
                    http://localhost:8080
                             │
                   ┌─────────▼─────────┐
                   │   web (nginx)     │   เสิร์ฟไฟล์ static + proxy /api
                   └─────────┬─────────┘
                             │  /api/*
                   ┌─────────▼─────────┐        ┌──────────────────────┐
                   │   api (Node.js)   │──SMTP─►│  mailpit             │  กล่องจดหมายทดสอบ
                   └─────────┬─────────┘        └──────────────────────┘  http://localhost:8025
                             │               Express + Knex + JWT  http://localhost:3000
                   ┌─────────▼─────────┐
                   │    postgres       │   localhost:5432 (เชื่อมจาก DBeaver)
                   └───────────────────┘
```

| ส่วน | เทคโนโลยี | พอร์ต |
| --- | --- | --- |
| Frontend | HTML + Tailwind CSS (build เป็นไฟล์ `css/app.css`) + JavaScript (ES Modules) | 8080 |
| API | Node.js 22, Express 4, Knex 3, JWT, Zod, Nodemailer | 3000 |
| อีเมล (dev) | Mailpit — ดักอีเมลทุกฉบับไว้ให้เปิดดู ไม่ส่งออกจริง | 8025 |
| Database | PostgreSQL 16 (รองรับ MySQL 8.4 ด้วย) | 5432 |
| Reverse proxy | nginx alpine | 8080 |

---

## เริ่มใช้งาน

**สิ่งที่ต้องมี:** Docker Desktop (เปิดไว้), Node.js 20+ (เฉพาะตอนพัฒนานอก Docker)

```bash
# 1. ตั้งค่า environment
copy .env.example .env

# 2. สร้าง JWT_SECRET แบบสุ่มแล้วนำไปใส่ใน .env
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# 3. รันทั้งระบบ
docker compose up -d --build
```

รอประมาณ 30 วินาที ระบบจะสร้างตาราง (migration) และใส่ข้อมูลตั้งต้น (seed) ให้อัตโนมัติ จากนั้นเปิด:

| หน้า | URL |
| --- | --- |
| เว็บไซต์ | http://localhost:8080 |
| หน้าจองกิจกรรม (ค้นหา / กรอง) | http://localhost:8080/activities.html |
| สมัครสมาชิก / เข้าสู่ระบบ | http://localhost:8080/register.html · http://localhost:8080/login.html |
| บัญชีของฉัน (ประวัติการจอง / แจ้งเตือน / โปรไฟล์) | http://localhost:8080/account.html |
| ตรวจสอบการจองด้วยรหัส + อีเมล | http://localhost:8080/booking.html |
| ระบบหลังบ้าน | http://localhost:8080/admin.html |
| กล่องอีเมลทดสอบ (Mailpit) | http://localhost:8025 |
| รายการ API ทั้งหมด | http://localhost:3000/api |

**บัญชีแอดมินเริ่มต้น:** `admin@chokchai.local` / `Admin@1234` — เปลี่ยนค่าใน `.env` ก่อนใช้งานจริง

ตรวจว่าทุกอย่างทำงานจริงด้วยคำสั่งเดียว

```powershell
.\scripts\smoke-test.ps1
```

ยิงคำขอจริง 45 รายการไล่ตั้งแต่หน้าเว็บ → API → สมาชิก → ชำระเงิน → อีเมล → ระบบหลังบ้าน แล้วสรุปผ่าน/ไม่ผ่าน
วิธีตรวจแบบละเอียดและคำอธิบายว่าข้อมูลเก็บที่ไหน อยู่ใน [docs/VERIFY.md](docs/VERIFY.md)

> เปิดโปรเจกต์ใน VS Code แล้วกด `Terminal → Run Task...` จะมีคำสั่งที่ใช้บ่อยให้เลือกกดได้เลย
> และเปิด [docs/api-playground.http](docs/api-playground.http) เพื่อยิง API ทดสอบทีละอัน
> (ต้องมี extension REST Client)

### คำสั่งที่ใช้บ่อย

```bash
docker compose ps                  # ดูสถานะ container
docker compose logs -f api         # ดู log ของ API แบบ real-time
docker compose restart api         # รีสตาร์ท API หลังแก้โค้ด backend
docker compose down                # หยุดทั้งหมด (ข้อมูลยังอยู่)
docker compose down -v             # หยุดและลบข้อมูลในฐานข้อมูลทิ้ง
```

ไฟล์ใน `frontend/` ถูก mount เข้า container โดยตรง แก้แล้วกด refresh เห็นผลทันที ไม่ต้อง rebuild container
(ยกเว้นเมื่อใช้ class ของ Tailwind ตัวใหม่ ต้อง build CSS ใหม่ — ดูหัวข้อ [Tailwind CSS](#tailwind-css))

---

## เชื่อมต่อฐานข้อมูลด้วย DBeaver

สร้าง connection ใหม่ → เลือก **PostgreSQL** → กรอกตามนี้

| ช่อง | ค่า |
| --- | --- |
| Host | `localhost` |
| Port | `5432` |
| Database | `chokchai` |
| Username | `chokchai` |
| Password | `chokchai` |

กด **Test Connection** (ครั้งแรก DBeaver จะขอดาวน์โหลด driver ให้กด Download) แล้วกด Finish

ตารางทั้งหมดอยู่ใต้ `chokchai` → `Schemas` → `public` → `Tables`
รายละเอียดเพิ่มเติมและวิธีแก้ปัญหาที่พบบ่อยอยู่ใน [docs/DBEAVER.md](docs/DBEAVER.md)

---

## โครงสร้างฐานข้อมูล

| ตาราง | เก็บอะไร |
| --- | --- |
| `activities` | 6 เซ็ทกิจกรรม ราคาผู้ใหญ่/เด็ก/ทารก ระยะเวลา และโควตาต่อวัน |
| `bookings` | การจองจาก Booking Modal 4 ขั้นตอน พร้อมรหัสอ้างอิงและสถานะ |
| `reviews` | รีวิวจาก Google / TripAdvisor / หน้าเว็บ (ต้องอนุมัติก่อนแสดง) |
| `faqs` | คำถามที่พบบ่อยในหน้า Contact |
| `inquiries` | คำถามที่ส่งผ่านฟอร์ม "Send us Your Question" |
| `admin_users` | บัญชีทีมงาน role `admin` / `staff` (รหัสผ่านเก็บเป็น bcrypt hash) |
| `users` | บัญชีลูกค้าที่สมัครสมาชิก |
| `settings` | ค่าตั้งระบบแบบ key-value ที่แก้ได้จากหน้าหลังบ้าน |
| `notifications` | การแจ้งเตือนทุกฉบับ พร้อมสถานะการส่งอีเมล |
| `payment_slips` | รูปสลิปโอนเงินที่ลูกค้าแนบ (การจองละ 1 ใบ) |

**จุดที่ออกแบบไว้เป็นพิเศษ**

- `bookings` เก็บ `unit_adult_price` / `unit_child_price` ไว้ด้วย เป็นราคา ณ เวลาที่จอง
  ทำให้ยอดเงินของการจองเดิมไม่เปลี่ยนเมื่อแอดมินแก้ราคากิจกรรมภายหลัง
- ยอดเงินคำนวณที่ฝั่งเซิร์ฟเวอร์เสมอ ไม่ได้รับราคาจากเบราว์เซอร์ ป้องกันการแก้ราคาผ่าน DevTools
- การสร้างการจองทำใน transaction เดียวและล็อกแถวกิจกรรมด้วย `SELECT ... FOR UPDATE`
  กันกรณีคนจองพร้อมกันหลายคนแล้วยอดเกินโควตาต่อวัน
- ทารกไม่นับเข้าโควตาที่นั่ง แต่ต้องมีผู้ใหญ่มาด้วยอย่างน้อย 1 คน
- `bookings.user_id` เป็น null ได้ เพราะจองแบบไม่ล็อกอินก็ได้ — เมื่อลูกค้าสมัครสมาชิกภายหลังด้วยอีเมลเดิม
  การจองเก่าจะถูกรวมเข้าบัญชีให้อัตโนมัติ
- กติกาการจอง (จองล่วงหน้ากี่วัน, สูงสุดกี่คน, ยกเลิกได้ก่อนกี่ชั่วโมง) อ่านจากตาราง `settings`
  ถ้าไม่เคยตั้งจะใช้ค่าจาก `.env`

ดู ER diagram และคำอธิบายทุกคอลัมน์ได้ที่ [docs/ERD.md](docs/ERD.md)

---

## REST API

เอกสารฉบับเต็มพร้อมตัวอย่าง request/response อยู่ที่ [docs/API.md](docs/API.md) สรุปย่อ:

**สาธารณะ** — ไม่ต้อง login

```
GET    /api/health                                  ตรวจสถานะระบบ
GET    /api/settings                                เวลาทำการ ช่องทางติดต่อ กติกาการจอง
GET    /api/activities?q=&category=&max_price=&sort=  รายการกิจกรรม (ค้นหา / กรอง / เรียง)
GET    /api/activities/:slug                        รายละเอียดกิจกรรม
GET    /api/activities/:slug/availability?date=...  ที่ว่างของวันนั้น
POST   /api/bookings                                สร้างการจอง (แนบ token สมาชิกได้)
GET    /api/bookings/:ref?email=...                 ค้นหาการจองของตัวเอง
POST   /api/bookings/:ref/cancel                    ยกเลิกการจอง (ยืนยันด้วยอีเมล)
POST   /api/bookings/:ref/pay                       ขอลิงก์ชำระเงิน
GET    /api/payments/status?ref=&token=             สถานะการชำระเงิน
POST   /api/payments/promptpay/notify               ลูกค้าแจ้งว่าโอนผ่าน PromptPay แล้ว
POST   /api/payments/mock/confirm                   ยืนยันการชำระจำลอง (เฉพาะโหมด mock)
POST   /api/payments/stripe/webhook                 Stripe แจ้งผลการชำระเงิน
GET    /api/reviews                                 รีวิวที่เผยแพร่แล้ว
POST   /api/reviews                                 ส่งรีวิว (รออนุมัติ)
GET    /api/faqs                                    คำถามที่พบบ่อย
POST   /api/inquiries                               ส่งคำถามถึงทีมงาน
```

**สมาชิก** — ต้องมี header `Authorization: Bearer <token ของลูกค้า>`

```
POST   /api/account/register                        สมัครสมาชิก รับ token
POST   /api/account/login                           เข้าสู่ระบบ รับ token
GET    /api/account/me                              ข้อมูลโปรไฟล์
PATCH  /api/account/me                              แก้ไขโปรไฟล์
POST   /api/account/password                        เปลี่ยนรหัสผ่าน
GET    /api/account/bookings                        ประวัติการจอง
GET    /api/account/bookings/:ref                   รายละเอียดการจอง
POST   /api/account/bookings/:ref/cancel            ยกเลิกการจอง
POST   /api/account/bookings/:ref/pay               ขอลิงก์ชำระเงิน
GET    /api/account/notifications                   การแจ้งเตือน
POST   /api/account/notifications/read              ทำเครื่องหมายว่าอ่านแล้วทั้งหมด
```

**แอดมิน** — ต้องมี header `Authorization: Bearer <token ของทีมงาน>`

```
POST   /api/auth/login                              เข้าสู่ระบบ รับ token
GET    /api/auth/me                                 ข้อมูลผู้ใช้ปัจจุบัน
GET    /api/admin/stats                             ตัวเลขสรุปสำหรับ dashboard
GET    /api/admin/reports?from=&to=                 รายงานยอดจองรายวัน / รายกิจกรรม
GET    /api/admin/bookings                          รายการจอง (กรอง/ค้นหา/แบ่งหน้า)
GET    /api/admin/bookings/:id/slip                 รูปสลิปโอนเงินของการจอง
PATCH  /api/admin/bookings/:id                      เปลี่ยนสถานะ / บันทึกรับเงิน / คืนเงิน
GET    /api/admin/activities                        รายการกิจกรรม (รวมที่ปิดอยู่)
POST   /api/admin/activities                        เพิ่มกิจกรรม
PATCH  /api/admin/activities/:id                    แก้ไขกิจกรรม
DELETE /api/admin/activities/:id                    ลบกิจกรรม (เฉพาะ role admin)
GET    /api/admin/reviews                           รีวิวทั้งหมด
PATCH  /api/admin/reviews/:id                       อนุมัติ / ซ่อนรีวิว
GET    /api/admin/inquiries                         คำถามจากลูกค้า
PATCH  /api/admin/inquiries/:id                     บันทึกคำตอบ / ปิดเรื่อง
GET    /api/admin/users                             รายชื่อลูกค้า
PATCH  /api/admin/users/:id                         ระงับ / เปิดใช้บัญชีลูกค้า
GET    /api/admin/staff                             รายชื่อทีมงาน (เฉพาะ role admin)
POST   /api/admin/staff                             เพิ่มทีมงาน (เฉพาะ role admin)
PATCH  /api/admin/staff/:id                         แก้ไขทีมงาน (เฉพาะ role admin)
GET    /api/admin/settings                          ค่าตั้งระบบ
PUT    /api/admin/settings                          บันทึกค่าตั้งระบบ (เฉพาะ role admin)
GET    /api/admin/notifications                     บันทึกอีเมลที่ระบบส่ง
```

สถานะการจองเปลี่ยนได้ตามลำดับนี้เท่านั้น — ข้ามขั้นจะได้ HTTP 409

```
pending ──► confirmed ──► completed
   │            │
   └────────────┴──────► cancelled
```

ลูกค้ายกเลิกเองได้เฉพาะการจองที่ยัง `pending` หรือ `confirmed` และต้องก่อนวันกิจกรรมอย่างน้อย
72 ชั่วโมง (ปรับได้ในหน้าตั้งค่าระบบ) หลังจากนั้นต้องติดต่อเจ้าหน้าที่ ซึ่งยกเลิกให้ได้จากหน้าหลังบ้าน

---

## การชำระเงิน

เลือกวิธีชำระเงินได้ที่หน้าหลังบ้าน → **ตั้งค่าระบบ** → **การชำระเงิน** มีผลทันทีโดยไม่ต้องรีสตาร์ท
(ค่าเริ่มต้นก่อนตั้งครั้งแรกมาจาก `PAYMENT_PROVIDER` ในไฟล์ `.env`)

| วิธี | พฤติกรรม |
| --- | --- |
| **PromptPay QR** | ลูกค้าสแกน QR ด้วยแอปธนาคารแล้วโอนเข้าบัญชีพร้อมเพย์ของร้าน **เป็นการรับเงินจริง** ไม่ต้องสมัครบริการรับชำระใด ๆ |
| Stripe | พาลูกค้าไปหน้า Stripe Checkout (บัตรเครดิต/เดบิต) แล้ว Stripe แจ้งผลกลับมาทาง webhook |
| ชำระจำลอง (`mock`) | กดปุ่มแล้วถือว่าจ่ายสำเร็จ **ไม่มีการรับเงินจริง** ใช้สำหรับพัฒนาและเดโมเท่านั้น |
| ปิด (`none`) | การจองค้างเป็น "ยังไม่ชำระ" ให้ทีมงานติดต่อกลับแล้วกด **บันทึกรับเงิน** ในหน้าหลังบ้าน |

**เปิดรับเงินจริงด้วย PromptPay**

1. หน้าหลังบ้าน → ตั้งค่าระบบ → เลือกวิธีชำระเงินเป็น **PromptPay QR**
2. กรอก **หมายเลขพร้อมเพย์ของร้าน** (เบอร์มือถือ 10 หลัก หรือเลขประจำตัว 13 หลัก) และ **ชื่อบัญชี** แล้วกดบันทึก
3. ทดลองจอง 1 รายการ แล้วสแกน QR ด้วยแอปธนาคาร — **ตรวจว่าชื่อผู้รับที่แอปแสดงเป็นบัญชีของร้านจริง** ก่อนเปิดให้ลูกค้าใช้

ขั้นตอนของลูกค้าและทีมงาน

```
ลูกค้าจอง → หน้า QR (ยอดเงินฝังอยู่ใน QR แก้ไม่ได้) → โอนในแอปธนาคาร → แนบสลิป → กด "แจ้งโอนเงินแล้ว"
        → สถานะ "แจ้งโอนแล้ว รอตรวจสอบ" + แท็บการจองในหลังบ้านขึ้นตัวเลขแจ้งเตือน
ทีมงานกด "ดูสลิป" เทียบกับยอดเข้าบัญชี → กด "ยืนยันรับเงิน" → การจองเป็น "ชำระแล้ว" + "ยืนยันแล้ว" และลูกค้าได้อีเมล
```

> ระบบ**ตรวจยอดเงินเข้าบัญชีธนาคารเองไม่ได้** (ต้องใช้บริการของธนาคารหรือ payment gateway) การกด "แจ้งโอนเงินแล้ว"
> ของลูกค้าจึงยังไม่ถือว่าได้รับเงิน — ทีมงานต้องเช็กยอดในแอปธนาคารก่อนกดยืนยันทุกครั้ง
> ถ้าต้องการให้ยืนยันอัตโนมัติ ให้ใช้ Stripe
>
> สลิปที่ลูกค้าแนบถูกย่อเป็น JPEG ที่เบราว์เซอร์ก่อนส่ง (ด้านยาวไม่เกิน 1600 px) แล้วเก็บในตาราง `payment_slips`
> ของฐานข้อมูล เปิดดูได้เฉพาะทีมงานที่ล็อกอินหลังบ้าน **สลิปปลอมแปลงได้ จึงใช้ประกอบการตรวจเท่านั้น ไม่ใช่หลักฐานว่าเงินเข้าแล้ว**

เมื่อบันทึกรับเงิน ระบบจะตั้ง `payment_status = paid` บันทึกเวลา ยืนยันการจองให้ (`pending → confirmed`) และส่งอีเมลแจ้งลูกค้า

**เปิดใช้ Stripe**

1. ใส่ค่าใน `.env` แล้ว `docker compose up -d` จากนั้นเลือก **Stripe** ในหน้าตั้งค่าระบบ
   ```
   STRIPE_SECRET_KEY=sk_live_...        # หรือ sk_test_... ตอนทดสอบ
   APP_URL=https://โดเมนของคุณ
   ```
2. ใน Stripe Dashboard → Developers → Webhooks เพิ่ม endpoint
   `https://โดเมนของคุณ/api/payments/stripe/webhook` เลือก event `checkout.session.completed`
3. คัดลอก Signing secret (`whsec_...`) มาใส่ `STRIPE_WEBHOOK_SECRET` แล้ว `docker compose up -d`

ระบบตรวจลายเซ็นของ webhook ทุกครั้ง และ webhook ที่ยิงซ้ำจะไม่ทำให้บันทึกรับเงินหรือส่งอีเมลซ้ำ

> ส่วนเชื่อม Stripe ถูกทดสอบแล้วในระดับโค้ด (การตรวจลายเซ็นและการบันทึกรับเงิน) แต่ยังไม่ได้ยิงกับบัญชี Stripe จริง
> เพราะต้องใช้คีย์ของร้าน — ก่อนเปิดรับเงินจริงให้ทดสอบด้วยคีย์ `sk_test_` และบัตรทดสอบ `4242 4242 4242 4242` หนึ่งรอบ
>
> ถ้าการจองที่จ่ายแล้วถูกยกเลิก ระบบ**ไม่**คืนเงินอัตโนมัติ — ทีมงานคืนเงินผ่าน Stripe Dashboard
> แล้วกด **บันทึกคืนเงินแล้ว** ในหน้าหลังบ้าน

---

## อีเมลและการแจ้งเตือน

ระบบส่งอีเมลให้ลูกค้าเมื่อ: สมัครสมาชิก, จองสำเร็จ, ชำระเงินสำเร็จ, ทีมงานยืนยัน / ปิดงาน / ยกเลิกการจอง
และลูกค้ายกเลิกเอง ทุกฉบับถูกบันทึกในตาราง `notifications` — ลูกค้าเห็นในแท็บ "การแจ้งเตือน" ของหน้าบัญชี
ส่วนทีมงานดูสถานะการส่งได้ในแท็บ "การแจ้งเตือน" ของหน้าหลังบ้าน

ถ้าต้องการให้ทีมงานได้รับอีเมลเมื่อมีการจองใหม่หรือลูกค้ายกเลิก ให้ใส่อีเมลในหน้า **ตั้งค่าระบบ**

| สภาพแวดล้อม | ตั้งค่า | ผล |
| --- | --- | --- |
| Docker (ค่าเริ่มต้น) | `SMTP_HOST=mailpit` | อีเมลทุกฉบับเข้า Mailpit เปิดดูที่ http://localhost:8025 **ไม่ถูกส่งออกไปหาลูกค้าจริง** |
| ใช้งานจริง | ใส่ SMTP ของผู้ให้บริการ | ส่งถึงลูกค้าจริง |
| ไม่ตั้ง `SMTP_HOST` | — | ไม่ส่งอีเมล แต่ยังบันทึกการแจ้งเตือนไว้ (สถานะ `logged`) |

ตัวอย่างค่า `.env` สำหรับ SendGrid (ผู้ให้บริการอื่นใช้รูปแบบเดียวกัน)

```
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=<API key>
MAIL_FROM=Chokchai Elephant Camp <booking@โดเมนของคุณ>
```

อีเมลส่งแบบเบื้องหลัง ถ้า SMTP ล่ม การจองยังสำเร็จตามปกติและแถวใน `notifications` จะมีสถานะ `failed` พร้อมสาเหตุ

---

## Tailwind CSS

หน้าเว็บใช้ไฟล์ CSS ที่ build แล้ว ([frontend/css/app.css](frontend/css/app.css), ประมาณ 22 KB) แทนการโหลด Tailwind จาก CDN
ไฟล์นี้ commit ไว้ใน repo แล้ว จึงรันเว็บได้เลยโดยไม่ต้องมี Node

ต้อง build ใหม่เฉพาะเมื่อแก้ HTML / JS แล้วใช้ class ของ Tailwind ที่ไม่เคยใช้มาก่อน

```bash
cd frontend
npm install        # ครั้งแรกครั้งเดียว
npm run build      # สร้าง css/app.css ใหม่
npm run dev        # หรือเปิดค้างไว้ให้ build เองทุกครั้งที่บันทึกไฟล์
```

สีและฟอนต์ของแบรนด์กำหนดไว้ที่ [frontend/tailwind.config.js](frontend/tailwind.config.js)

---

## HTTPS (ขึ้นใช้งานจริง)

ไฟล์ [docker-compose.https.yml](docker-compose.https.yml) เปลี่ยน nginx ไปใช้ [infra/nginx/https.conf](infra/nginx/https.conf)
ซึ่งเปิดพอร์ต 443, redirect HTTP → HTTPS และส่ง header `Strict-Transport-Security`

1. วาง certificate ของโดเมนไว้ที่ `infra/certs/fullchain.pem` และ `infra/certs/privkey.pem`
   (ชื่อไฟล์เดียวกับที่ Let's Encrypt / certbot สร้างให้ โฟลเดอร์นี้ไม่ถูก commit)
2. แก้ `.env`
   ```
   APP_URL=https://โดเมนของคุณ
   CORS_ORIGINS=https://โดเมนของคุณ
   JWT_SECRET=<ค่าสุ่มใหม่>
   SEED_ADMIN_PASSWORD=<รหัสผ่านใหม่>
   DB_PASSWORD=<รหัสผ่านใหม่>
   ```
3. รันพร้อมไฟล์เสริม
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.https.yml up -d --build
   ```

API ใน container รันด้วย `NODE_ENV=production` อยู่แล้ว (ไม่เปิดเผย stack trace และบังคับให้ต้องมี `JWT_SECRET`)

**ทดลองในเครื่องด้วย certificate แบบ self-signed**

```powershell
docker run --rm -v "${PWD}/infra/certs:/certs" alpine/openssl req -x509 -newkey rsa:2048 -nodes -days 365 `
  -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost,IP:127.0.0.1" `
  -keyout /certs/privkey.pem -out /certs/fullchain.pem

$env:HTTP_PORT = 8088; $env:HTTPS_PORT = 8443; $env:APP_URL = 'https://localhost:8443'
docker compose -f docker-compose.yml -f docker-compose.https.yml up -d
```

แล้วเปิด https://localhost:8443 (เบราว์เซอร์จะเตือนเพราะ certificate ออกเอง กดดำเนินการต่อได้)
กลับไปใช้ HTTP ปกติด้วย `docker compose up -d` ในหน้าต่าง terminal ใหม่

---

## พัฒนาแบบไม่ผ่าน Docker

รัน API บนเครื่องโดยตรง (โหลดใหม่อัตโนมัติเมื่อแก้โค้ด) แต่ยังใช้ฐานข้อมูลใน Docker

```bash
docker compose up -d postgres      # เปิดเฉพาะฐานข้อมูล

cd backend
copy .env.example .env
npm install
npm run db:migrate                 # สร้างตาราง
npm run db:seed                    # ใส่ข้อมูลตั้งต้น
npm run dev                        # API ที่ http://localhost:3000
```

เปิด `frontend/index.html` ด้วย Live Server (พอร์ต 5500) ได้เลย — `js/api.js` ตรวจพอร์ตแล้วชี้ไปที่
`http://localhost:3000` ให้เอง และ `CORS_ORIGINS` ใน `.env` อนุญาตพอร์ต 5500 ไว้แล้ว

### คำสั่งฐานข้อมูล

```bash
npm run db:migrate     # รัน migration ที่ยังไม่ได้รัน
npm run db:rollback    # ย้อน migration ชุดล่าสุด
npm run db:seed        # ใส่ข้อมูลตั้งต้น (รันซ้ำได้ ไม่สร้างข้อมูลซ้ำ)
npm run db:reset       # ล้างทั้งหมดแล้วสร้างใหม่
```

### เทสต์

```bash
docker compose up -d postgres
cd backend && npm test
```

ครอบคลุม 48 เคส ทั้งการคำนวณราคา, การกันจองเกินโควตา, การตรวจสอบข้อมูลนำเข้า, สิทธิ์การเข้าถึง,
ลำดับการเปลี่ยนสถานะ, สมาชิก, การยกเลิก, การชำระเงิน, การแจ้งเตือน, รายงาน และค่าตั้งระบบ

> เทสต์ยิงเข้าฐานข้อมูลตัวเดียวกับที่ระบบใช้อยู่ ข้อมูลที่เทสต์สร้างใช้อีเมลโดเมน `@test.chokchai.local`
> และถูกลบออกเมื่อจบ ไม่แตะข้อมูลจริง

---

## สลับไปใช้ MySQL

โค้ดทั้งหมดเขียนผ่าน Knex query builder จึงใช้ได้กับทั้ง PostgreSQL และ MySQL โดยไม่ต้องแก้ query

```bash
docker compose --profile mysql up -d mysql
```

แล้วแก้ service `api` ใน `docker-compose.yml` ให้เป็น `DB_CLIENT: mysql`, `DB_HOST: mysql`,
`DB_PORT: 3306` จากนั้น `docker compose up -d --force-recreate api`

ใน DBeaver เลือก driver **MySQL** แล้วต่อที่ `localhost:3306` ด้วย user/password ชุดเดียวกัน

> MySQL ไม่ได้เปิดโดยค่าเริ่มต้นเพื่อประหยัดพื้นที่ดิสก์ — PostgreSQL เพียงตัวเดียวเพียงพอสำหรับการใช้งานปกติ

---

## โครงสร้างไฟล์

```
Chokchai/
├─ docker-compose.yml          นิยาม service ทั้งหมด (postgres, api, web, mailpit)
├─ docker-compose.https.yml    ส่วนเสริมสำหรับขึ้นใช้งานจริงด้วย HTTPS
├─ .env.example                ตัวอย่างค่า environment (คัดลอกเป็น .env)
├─ docs/
│  ├─ VERIFY.md                วิธีตรวจสอบระบบ + ข้อมูลเก็บที่ไหน
│  ├─ API.md                   เอกสาร REST API ฉบับเต็ม
│  ├─ DBEAVER.md               วิธีเชื่อม DBeaver + query ตัวอย่าง
│  ├─ ERD.md                   ER diagram และคำอธิบายคอลัมน์
│  └─ api-playground.http      ยิง API ทดสอบจาก VS Code
├─ scripts/smoke-test.ps1      ตรวจระบบอัตโนมัติ 45 รายการ
├─ .vscode/tasks.json          คำสั่งที่ใช้บ่อย กดรันจาก VS Code ได้
├─ infra/
│  ├─ nginx/default.conf       nginx แบบ HTTP (dev)
│  ├─ nginx/https.conf         nginx แบบ HTTPS (production)
│  ├─ nginx/snippets/          ส่วนที่สอง config ใช้ร่วมกัน (proxy, cache, security headers)
│  └─ certs/                   ที่วาง certificate (ไม่ถูก commit)
├─ frontend/
│  ├─ index.html               หน้าแรก
│  ├─ activities.html          หน้าเลือกกิจกรรม ค้นหา/กรอง + Booking Modal
│  ├─ activity.html            หน้ารายละเอียดกิจกรรม
│  ├─ register.html            สมัครสมาชิก
│  ├─ login.html               เข้าสู่ระบบ (ลูกค้า)
│  ├─ account.html             บัญชีของฉัน: ประวัติการจอง แจ้งเตือน โปรไฟล์
│  ├─ booking.html             ตรวจสอบการจองด้วยรหัส + อีเมล
│  ├─ payment.html             หน้าชำระเงิน / ผลการชำระเงิน
│  ├─ admin.html               ระบบหลังบ้าน
│  ├─ css/app.css              Tailwind ที่ build แล้ว
│  ├─ src/tailwind.css         ต้นทางของ CSS
│  ├─ tailwind.config.js       สี / ฟอนต์ของแบรนด์
│  ├─ js/api.js                ตัวกลางเรียก REST API + เก็บ token
│  ├─ js/common.js             header/footer, ป้ายสถานะ, การ์ดการจอง ที่ใช้ร่วมกัน
│  ├─ js/app.js                logic ของหน้าแรกและหน้ากิจกรรม
│  ├─ js/pages.js              logic ของหน้าสมาชิก / ตรวจสอบการจอง / ชำระเงิน / รายละเอียด
│  ├─ js/admin.js              logic ของระบบหลังบ้าน
│  └─ images/                  โลโก้ รูป Hero และภาพประกอบกิจกรรม
└─ backend/
   ├─ Dockerfile
   ├─ knexfile.js              ตั้งค่าการเชื่อมต่อฐานข้อมูล
   ├─ tests/api.test.js
   └─ src/
      ├─ server.js             จุดเริ่มต้น + graceful shutdown
      ├─ app.js                ประกอบ Express app
      ├─ config/               อ่านและตรวจสอบค่า environment
      ├─ db/                   knex instance, migrations, seeds
      ├─ middleware/           auth (ทีมงาน / ลูกค้า), validation, error handling
      ├─ routes/               public, account, payment, auth, admin
      ├─ services/             business logic: booking, activity, user, payment,
      │                        notification, mail, settings, content, auth
      ├─ validators/           zod schema สำหรับตรวจข้อมูลนำเข้า
      └─ utils/
```

---

## ความปลอดภัยที่ทำไว้แล้ว

- รหัสผ่านของทีมงานและลูกค้าเก็บเป็น bcrypt hash ไม่เก็บ plaintext
  รหัสผ่านใหม่ต้องยาวอย่างน้อย 8 ตัวและมีทั้งตัวอักษรและตัวเลข
- token ของลูกค้ากับของทีมงานแยกชนิดกัน — token ลูกค้าเรียก `/api/admin/*` ไม่ได้ (HTTP 403)
- JWT ของทีมงานหมดอายุใน 8 ชั่วโมง ของลูกค้า 7 วัน และตรวจสถานะบัญชีกับฐานข้อมูลทุก request
  (ระงับบัญชีแล้วมีผลทันที)
- สิทธิ์ `staff` จัดการการจองและเนื้อหาได้ แต่ลบข้อมูล แก้ค่าตั้งระบบ และจัดการทีมงานไม่ได้
  และระบบไม่ยอมให้ปิดบัญชี admin คนสุดท้ายหรือปิดบัญชีตัวเอง
- จำกัดจำนวนครั้งการ login / สมัครสมาชิก และการส่งฟอร์มสาธารณะ (20 ครั้ง/15 นาที)
- ตรวจสอบข้อมูลนำเข้าทุก endpoint ด้วย Zod ก่อนแตะฐานข้อมูล
- Knex ใช้ parameterized query ทั้งหมด ไม่มีการต่อ SQL ด้วยสตริง
- ลูกค้าที่ไม่ล็อกอินดู / ยกเลิก / จ่ายเงินการจองได้ ต้องรู้ทั้งรหัสการจองและอีเมลที่ใช้จอง
  ส่วนสมาชิกเห็นเฉพาะการจองของบัญชีตัวเอง
- ลิงก์หน้าชำระเงินผูกกับ token แบบ HMAC ของการจองนั้น และ webhook ของ Stripe ถูกตรวจลายเซ็นทุกครั้ง
- ยอดเงินที่เรียกเก็บมาจากฐานข้อมูลเสมอ ไม่รับจากเบราว์เซอร์
- ใส่ security headers ที่ nginx และ helmet, จำกัด CORS เฉพาะ origin ที่กำหนด, มี config HTTPS + HSTS พร้อมใช้
- ข้อความ login ผิดไม่บอกว่าอีเมลมีอยู่ในระบบหรือไม่

## สิ่งที่ต้องทำเองก่อนเปิดใช้งานจริง

ทั้งหมดเป็นการ "ใส่ของจริง" ลงในช่องที่ระบบเตรียมไว้แล้ว ไม่ต้องแก้โค้ด

- **Certificate ของโดเมนจริง** — ดูหัวข้อ [HTTPS](#https-ขึ้นใช้งานจริง)
- **ค่าลับใน `.env`** — สุ่ม `JWT_SECRET` ใหม่ เปลี่ยน `DB_PASSWORD` และ `SEED_ADMIN_PASSWORD`
- **บัญชีรับเงิน** — กรอกหมายเลขพร้อมเพย์ของร้านในหน้าตั้งค่าระบบ (หรือใส่คีย์ Stripe) ดูหัวข้อ [การชำระเงิน](#การชำระเงิน)
  (ค่าเริ่มต้น `mock` เป็นการชำระจำลอง ห้ามใช้กับลูกค้าจริง)
- **เวลารับรอบกลางวัน** — ค่าเริ่มต้น `11:30 - 12:00 น.` เป็นเวลาสมมติ แก้ให้ตรงกับรอบจริงในหน้าตั้งค่าระบบ
- **SMTP ของผู้ให้บริการอีเมล** — ดูหัวข้อ [อีเมลและการแจ้งเตือน](#อีเมลและการแจ้งเตือน)
  (ค่าเริ่มต้นส่งเข้า Mailpit ไม่ถึงลูกค้า)
- **รูปถ่ายกิจกรรมจริง** — ตอนนี้ใช้ภาพประกอบแบบวาด (`frontend/images/activities/*.svg`)
  อัปโหลดรูปจริงลงโฟลเดอร์เดียวกัน แล้วแก้ "ที่อยู่รูปภาพ" ของแต่ละกิจกรรมในหน้าหลังบ้าน → แท็บกิจกรรม
