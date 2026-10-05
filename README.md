# Chokchai Elephant Camp — Website + Backend

ระบบเว็บไซต์และระบบจองกิจกรรมของปางช้างโชคชัย ประกอบด้วยเว็บหน้าบ้าน (Tailwind CSS + JavaScript),
REST API (Node.js + Express), ฐานข้อมูล PostgreSQL และระบบหลังบ้านสำหรับจัดการการจอง
ทุกส่วนรันด้วย Docker Compose คำสั่งเดียว

---

## สถาปัตยกรรม

```
                    http://localhost:8080
                             │
                   ┌─────────▼─────────┐
                   │   web (nginx)     │   เสิร์ฟไฟล์ static + proxy /api
                   └─────────┬─────────┘
                             │  /api/*
                   ┌─────────▼─────────┐
                   │   api (Node.js)   │   Express + Knex + JWT
                   └─────────┬─────────┘   http://localhost:3000
                             │
                   ┌─────────▼─────────┐
                   │    postgres       │   localhost:5432 (เชื่อมจาก DBeaver)
                   └───────────────────┘
```

| ส่วน | เทคโนโลยี | พอร์ต |
| --- | --- | --- |
| Frontend | HTML + Tailwind CSS (CDN) + JavaScript (ES Modules) | 8080 |
| API | Node.js 22, Express 4, Knex 3, JWT, Zod | 3000 |
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
| หน้าจองกิจกรรม | http://localhost:8080/activities.html |
| ระบบหลังบ้าน | http://localhost:8080/admin.html |
| รายการ API ทั้งหมด | http://localhost:3000/api |

**บัญชีแอดมินเริ่มต้น:** `admin@chokchai.local` / `Admin@1234` — เปลี่ยนค่าใน `.env` ก่อนใช้งานจริง

ตรวจว่าทุกอย่างทำงานจริงด้วยคำสั่งเดียว

```powershell
.\scripts\smoke-test.ps1
```

ยิงคำขอจริง 22 รายการไล่ตั้งแต่หน้าเว็บ → API → ฐานข้อมูล → ระบบหลังบ้าน แล้วสรุปผ่าน/ไม่ผ่าน
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

ไฟล์ใน `frontend/` ถูก mount เข้า container โดยตรง แก้แล้วกด refresh เห็นผลทันที ไม่ต้อง rebuild

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
| `admin_users` | บัญชีผู้ดูแล (รหัสผ่านเก็บเป็น bcrypt hash) |

**จุดที่ออกแบบไว้เป็นพิเศษ**

- `bookings` เก็บ `unit_adult_price` / `unit_child_price` ไว้ด้วย เป็นราคา ณ เวลาที่จอง
  ทำให้ยอดเงินของการจองเดิมไม่เปลี่ยนเมื่อแอดมินแก้ราคากิจกรรมภายหลัง
- ยอดเงินคำนวณที่ฝั่งเซิร์ฟเวอร์เสมอ ไม่ได้รับราคาจากเบราว์เซอร์ ป้องกันการแก้ราคาผ่าน DevTools
- การสร้างการจองทำใน transaction เดียวและล็อกแถวกิจกรรมด้วย `SELECT ... FOR UPDATE`
  กันกรณีคนจองพร้อมกันหลายคนแล้วยอดเกินโควตาต่อวัน
- ทารกไม่นับเข้าโควตาที่นั่ง แต่ต้องมีผู้ใหญ่มาด้วยอย่างน้อย 1 คน

ดู ER diagram และคำอธิบายทุกคอลัมน์ได้ที่ [docs/ERD.md](docs/ERD.md)

---

## REST API

เอกสารฉบับเต็มพร้อมตัวอย่าง request/response อยู่ที่ [docs/API.md](docs/API.md) สรุปย่อ:

**สาธารณะ** — ไม่ต้อง login

```
GET    /api/health                                  ตรวจสถานะระบบ
GET    /api/activities                              รายการกิจกรรมทั้งหมด
GET    /api/activities/:slug                        รายละเอียดกิจกรรม
GET    /api/activities/:slug/availability?date=...  ที่ว่างของวันนั้น
POST   /api/bookings                                สร้างการจอง
GET    /api/bookings/:ref?email=...                 ค้นหาการจองของตัวเอง
GET    /api/reviews                                 รีวิวที่เผยแพร่แล้ว
POST   /api/reviews                                 ส่งรีวิว (รออนุมัติ)
GET    /api/faqs                                    คำถามที่พบบ่อย
POST   /api/inquiries                               ส่งคำถามถึงทีมงาน
```

**แอดมิน** — ต้องมี header `Authorization: Bearer <token>`

```
POST   /api/auth/login                              เข้าสู่ระบบ รับ token
GET    /api/auth/me                                 ข้อมูลผู้ใช้ปัจจุบัน
GET    /api/admin/stats                             ตัวเลขสรุปสำหรับ dashboard
GET    /api/admin/bookings                          รายการจอง (กรอง/ค้นหา/แบ่งหน้า)
PATCH  /api/admin/bookings/:id                      เปลี่ยนสถานะ / บันทึกการชำระเงิน
GET    /api/admin/activities                        รายการกิจกรรม (รวมที่ปิดอยู่)
POST   /api/admin/activities                        เพิ่มกิจกรรม
PATCH  /api/admin/activities/:id                    แก้ไขกิจกรรม
DELETE /api/admin/activities/:id                    ลบกิจกรรม (เฉพาะ role admin)
GET    /api/admin/reviews                           รีวิวทั้งหมด
PATCH  /api/admin/reviews/:id                       อนุมัติ / ซ่อนรีวิว
GET    /api/admin/inquiries                         คำถามจากลูกค้า
PATCH  /api/admin/inquiries/:id                     บันทึกคำตอบ
```

สถานะการจองเปลี่ยนได้ตามลำดับนี้เท่านั้น — ข้ามขั้นจะได้ HTTP 409

```
pending ──► confirmed ──► completed
   │            │
   └────────────┴──────► cancelled
```

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

ครอบคลุม 22 เคส ทั้งการคำนวณราคา, การกันจองเกินโควตา, การตรวจสอบข้อมูลนำเข้า,
สิทธิ์การเข้าถึง และลำดับการเปลี่ยนสถานะ

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
├─ docker-compose.yml          นิยาม service ทั้งหมด
├─ .env.example                ตัวอย่างค่า environment (คัดลอกเป็น .env)
├─ docs/
│  ├─ VERIFY.md                วิธีตรวจสอบระบบ + ข้อมูลเก็บที่ไหน
│  ├─ API.md                   เอกสาร REST API ฉบับเต็ม
│  ├─ DBEAVER.md               วิธีเชื่อม DBeaver + query ตัวอย่าง
│  ├─ ERD.md                   ER diagram และคำอธิบายคอลัมน์
│  └─ api-playground.http      ยิง API ทดสอบจาก VS Code
├─ scripts/smoke-test.ps1      ตรวจระบบอัตโนมัติ 22 รายการ
├─ backup/                     ไฟล์สำรองฐานข้อมูล (.sql)
├─ .vscode/tasks.json          คำสั่งที่ใช้บ่อย กดรันจาก VS Code ได้
├─ infra/nginx/default.conf    config ของ nginx (static + proxy)
├─ frontend/
│  ├─ index.html               หน้าแรก
│  ├─ activities.html          หน้าเลือกกิจกรรม + Booking Modal
│  ├─ admin.html               ระบบหลังบ้าน
│  ├─ js/api.js                ตัวกลางเรียก REST API
│  ├─ js/app.js                logic ของเว็บหน้าบ้าน
│  ├─ js/admin.js              logic ของระบบหลังบ้าน
│  └─ images/
└─ backend/
   ├─ Dockerfile
   ├─ knexfile.js              ตั้งค่าการเชื่อมต่อฐานข้อมูล
   ├─ tests/api.test.js
   └─ src/
      ├─ server.js             จุดเริ่มต้น + graceful shutdown
      ├─ app.js                ประกอบ Express app
      ├─ config/               อ่านและตรวจสอบค่า environment
      ├─ db/                   knex instance, migrations, seeds
      ├─ middleware/           auth, validation, error handling
      ├─ routes/               นิยาม endpoint
      ├─ services/             business logic ทั้งหมด
      ├─ validators/           zod schema สำหรับตรวจข้อมูลนำเข้า
      └─ utils/
```

---

## ความปลอดภัยที่ทำไว้แล้ว

- รหัสผ่านแอดมินเก็บเป็น bcrypt hash ไม่เก็บ plaintext
- JWT หมดอายุใน 8 ชั่วโมง และตรวจสถานะบัญชีกับฐานข้อมูลทุก request (ปิดบัญชีแล้วมีผลทันที)
- จำกัดจำนวนครั้งการ login (10 ครั้ง/15 นาที) และการส่งฟอร์มสาธารณะ (20 ครั้ง/15 นาที)
- ตรวจสอบข้อมูลนำเข้าทุก endpoint ด้วย Zod ก่อนแตะฐานข้อมูล
- Knex ใช้ parameterized query ทั้งหมด ไม่มีการต่อ SQL ด้วยสตริง
- ลูกค้าดูการจองได้ต้องรู้ทั้งรหัสการจองและอีเมลที่ใช้จอง (เดารหัสอย่างเดียวไม่พอ)
- ใส่ security headers ผ่าน helmet และจำกัด CORS เฉพาะ origin ที่กำหนด
- ข้อความ login ผิดไม่บอกว่าอีเมลมีอยู่ในระบบหรือไม่

## สิ่งที่ควรทำต่อก่อนขึ้นใช้งานจริง

- **ระบบชำระเงิน** — ตอนนี้การจองบันทึกเป็น `unpaid` แล้วทีมงานติดต่อกลับ ถ้าต้องการรับเงินออนไลน์
  ให้ต่อ Stripe หรือ Omise แล้วอัปเดต `payment_status` ผ่าน webhook
- **ส่งอีเมลยืนยัน** — ยังไม่มีการส่งอีเมล ควรเพิ่ม Nodemailer หรือ SendGrid ตอนสร้างการจองสำเร็จ
- **รูปกิจกรรม** — คอลัมน์ `image_url` ชี้ไปที่ `images/activities/*.jpg` ซึ่งยังไม่มีไฟล์จริง
  ระบบจะแสดงลายทแยงแทนไปก่อน ใส่รูปจริงลงโฟลเดอร์นั้นได้เลย
- **Tailwind แบบ build** — ตอนนี้โหลดจาก CDN ถ้าขึ้นเว็บจริงควรติดตั้งแบบ build เพื่อลดขนาด CSS
- **HTTPS** — ใช้ certificate จริงที่ nginx และตั้ง `NODE_ENV=production` พร้อม `JWT_SECRET` ที่สุ่มใหม่
