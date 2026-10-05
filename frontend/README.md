# Frontend — Chokchai Elephant Camp

เว็บหน้าบ้าน ใช้ **Tailwind CSS (build เป็นไฟล์ `css/app.css`)** + JavaScript แบบ ES Modules
ตัวเว็บเป็นไฟล์ static ทั้งหมด ใช้ Node เฉพาะตอน build CSS ใหม่
ข้อมูลทั้งหมด (กิจกรรม ราคา รีวิว คำถามที่พบบ่อย การจอง) ดึงจาก REST API ไม่ได้ hardcode ไว้ในหน้าแล้ว

> วิธีรันทั้งระบบและเอกสาร API อยู่ใน [README ที่ root ของโปรเจกต์](../README.md)

## ไฟล์ในโฟลเดอร์นี้

| ไฟล์ | หน้าที่ |
| --- | --- |
| `index.html` | หน้าแรก — Hero, About, กิจกรรม, รีวิว, แผนที่, FAQ, ฟอร์มส่งคำถาม |
| `activities.html` | หน้าเลือกกิจกรรม ค้นหา / กรอง / เรียง + Booking Modal 4 ขั้นตอน |
| `activity.html` | รายละเอียดกิจกรรม (`?slug=...`) + เช็กที่ว่างตามวันที่ |
| `register.html` · `login.html` | สมัครสมาชิก / เข้าสู่ระบบของลูกค้า |
| `account.html` | บัญชีของฉัน — ประวัติการจอง ชำระเงิน ยกเลิก การแจ้งเตือน โปรไฟล์ รหัสผ่าน |
| `booking.html` | ตรวจสอบการจองด้วยรหัส + อีเมล (ไม่ต้องล็อกอิน) |
| `payment.html` | หน้าชำระเงินจำลอง / ผลการชำระเงิน |
| `admin.html` | ระบบหลังบ้าน — การจอง กิจกรรม คำถาม รีวิว ลูกค้า ทีมงาน รายงาน แจ้งเตือน ตั้งค่า |
| `js/api.js` | ตัวกลางเรียก REST API และเก็บ token (แยก key ระหว่างทีมงานกับลูกค้า) |
| `js/common.js` | ของที่ใช้ร่วมกัน: header/footer ของหน้าย่อย, ลิงก์บัญชี, ป้ายสถานะ, การ์ดการจอง |
| `js/app.js` | logic ของหน้าแรกและหน้ากิจกรรม |
| `js/pages.js` | logic ของหน้า register / login / account / booking / payment / activity |
| `js/admin.js` | logic ของระบบหลังบ้าน |
| `css/app.css` | Tailwind ที่ build แล้ว (สร้างจาก `src/tailwind.css`) |
| `images/` | โลโก้ รูป Hero และภาพประกอบกิจกรรม (`images/activities/*.svg`) |

## หน้าไหนเรียก API อะไร

| หน้า / ส่วน | Endpoint |
| --- | --- |
| การ์ดกิจกรรมหน้าแรก | `GET /api/activities` |
| คะแนนเฉลี่ยในส่วน About | `GET /api/reviews` → `meta.average_rating` |
| รีวิว | `GET /api/reviews` |
| FAQ | `GET /api/faqs` |
| ฟอร์ม Send us Your Question | `POST /api/inquiries` |
| การ์ด + ค้นหา/กรองในหน้ากิจกรรม | `GET /api/activities?q=&category=&sort=` |
| หน้ารายละเอียดกิจกรรม | `GET /api/activities/:slug`, `GET .../availability` |
| เวลาทำการ ช่องทางติดต่อ แถบประกาศ กติกาการจอง | `GET /api/settings` |
| ที่ว่างใน Booking Modal ขั้นที่ 1 | `GET /api/activities/:slug/availability?date=...` |
| ปุ่มยืนยันการจอง | `POST /api/bookings` (แนบ token สมาชิกถ้าล็อกอินอยู่) |
| ปุ่มชำระเงิน | `POST /api/bookings/:ref/pay` หรือ `POST /api/account/bookings/:ref/pay` |
| หน้าชำระเงิน | `GET /api/payments/status`, `POST /api/payments/mock/confirm` |
| สมัครสมาชิก / เข้าสู่ระบบ | `POST /api/account/register`, `POST /api/account/login` |
| บัญชีของฉัน | `GET/PATCH /api/account/me`, `/api/account/bookings`, `/api/account/notifications` |
| ตรวจสอบการจอง | `GET /api/bookings/:ref?email=`, `POST /api/bookings/:ref/cancel` |
| หน้าแอดมิน | `POST /api/auth/login`, `/api/admin/*` |

## การชี้ base URL ของ API

`js/api.js` เลือก base URL ให้เองตามที่เปิดหน้าเว็บ

| เปิดจาก | base URL ที่ใช้ |
| --- | --- |
| `http://localhost:8080` (nginx) | `/api` — โดเมนเดียวกัน ไม่ติด CORS |
| Live Server พอร์ตอื่น | `http://localhost:3000/api` |
| เปิดไฟล์ตรง ๆ (`file://`) | `http://localhost:3000/api` |

ถ้าต้องการบังคับปลายทางเอง ใส่ `data-api-base` ที่แท็ก `<html>`

```html
<html lang="th" data-api-base="https://api.chokchai.example.com/api">
```

## แก้ไขหน้าเว็บ

โฟลเดอร์นี้ถูก mount เข้า container ของ nginx โดยตรง แก้ไฟล์แล้วกด refresh เห็นผลทันที
ไม่ต้อง rebuild หรือ restart container

ถ้าใช้ class ของ Tailwind ที่ไม่เคยใช้มาก่อน ต้อง build CSS ใหม่ ไม่งั้น class นั้นจะไม่มีผล

```bash
npm install        # ครั้งแรกครั้งเดียว
npm run build      # สร้าง css/app.css ใหม่
npm run dev        # หรือเปิดค้างไว้ให้ build เองทุกครั้งที่บันทึกไฟล์
```

Tailwind สแกนหา class จากไฟล์ `*.html` และ `js/**/*.js` — class ที่ประกอบขึ้นใน JavaScript
ต้องเขียนเป็นชื่อเต็ม (เช่น `'bg-forest'`) ห้ามต่อสตริงขึ้นมา (เช่น `'bg-' + color`)

## รูปกิจกรรม

ตอนนี้แต่ละกิจกรรมใช้ภาพประกอบแบบวาด `images/activities/*.svg` (ไม่ใช่รูปถ่ายจริง)
เปลี่ยนเป็นรูปจริงได้โดยวางไฟล์ลงโฟลเดอร์เดียวกัน แล้วแก้ "ที่อยู่รูปภาพ" ของกิจกรรมนั้น
ในหน้าหลังบ้าน → แท็บกิจกรรม → แก้ไข ถ้าไฟล์รูปหายหรือพิมพ์ชื่อผิด หน้าเว็บจะแสดงลายทแยงแทน

## โทนสี / ฟอนต์

- เขียวป่า (Forest): `#21452A` · เข้ม: `#183420`
- ทอง (Gold): `#BA9330`
- ครีม (Cream): `#F9F8F2`
- ฟอนต์ตัวอักษร: Inter · ฟอนต์หัวข้อลายมือ: Caveat (Google Fonts)
- ค่าทั้งหมดกำหนดไว้ที่ `tailwind.config.js`
