# Frontend — Chokchai Elephant Camp

เว็บหน้าบ้าน ใช้ **Tailwind CSS (build เป็นไฟล์ `css/app.css`)** + JavaScript แบบ ES Modules
ตัวเว็บเป็นไฟล์ static ทั้งหมด ใช้ Node เฉพาะตอน build CSS ใหม่
ข้อมูลทั้งหมด (กิจกรรม ราคา รีวิว คำถามที่พบบ่อย การจอง) ดึงจาก REST API ไม่ได้ hardcode ไว้ในหน้าแล้ว

> วิธีรันทั้งระบบและเอกสาร API อยู่ใน [README ที่ root ของโปรเจกต์](../README.md)

## ไฟล์ในโฟลเดอร์นี้

| ไฟล์ | หน้าที่ |
| --- | --- |
| `index.html` | หน้าแรก — Hero, About, Blog, กิจกรรม, รีวิว, แผนที่, FAQ, ฟอร์มส่งคำถาม (ดีไซน์จาก repo `Chokchai_frontend` branch Donut + Gipsee) |
| `story.html`, `faq.html` | หน้า Our Story และหน้า FAQ (จาก repo `Chokchai_frontend` branch Gipsee) |
| `blog.html`, `blog-post.html`, `blog-data.js` | หน้า Blog และข้อมูลบทความ (branch Donut) |
| `reviews.js` | ข้อมูลรีวิวจาก Google Maps ที่แสดงในหน้าแรก (Gipsee) |
| `script.js` | เมนูมือถือ, carousel รีวิว/รูป, FAQ ของหน้า static ข้างบน |
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
| `js/inquiry.js` | ของหน้าแรก: ต่อฟอร์มส่งคำถามเข้ากับ API + เติมลิงก์บัญชีและค่าตั้งระบบ (`renderAuthNav`, `applySettings`) |
| `js/i18n.js` · `js/i18n-th.js` · `js/lang-boot.js` | สลับภาษาอังกฤษ / ไทย (ดูหัวข้อ "สองภาษา" ด้านล่าง) |
| `js/chat-widget.js` | ปุ่ม WhatsApp ลอยมุมขวาล่าง กดแล้วเปิดกล่องแชตก่อน แล้วปุ่ม Start Chat จึงพาไป WhatsApp |

หน้าแรกและหน้า static จาก `Chokchai_frontend` ยังใช้ Tailwind ผ่าน CDN และไม่ได้โหลด `js/app.js` (reviews/FAQ มาจาก `reviews.js` + `script.js`)
เวลาดึงงานใหม่จาก repo นั้นมาวางทับ `index.html` ให้คง `data-auth-nav`, `data-setting`, ลิงก์ `booking.html`/`account.html`, แท็ก `<script src="js/lang-boot.js">` ใน `<head>` และแท็ก `<script type="module" src="js/inquiry.js">` ท้ายไฟล์ไว้ และอย่าทับ `activities.html` (ใน repo นั้นยังเป็นเวอร์ชัน static)

## สองภาษา (อังกฤษ / ไทย)

ต้นฉบับของทุกหน้าเป็นภาษาอังกฤษ เวอร์ชันไทยได้จากการแปลตอนแสดงผล ผู้ใช้สลับด้วยปุ่มมุมขวาบนของ header (จอมือถืออยู่ท้ายเมนู)
ภาษาที่เลือกจำไว้ในเบราว์เซอร์ และบังคับผ่านลิงก์ได้ เช่น `index.html?lang=th` หรือ `index.html?lang=en` (ค่าเริ่มต้นคืออังกฤษ)
หลังบ้าน (`admin.html`) เป็นภาษาไทยอย่างเดียว

| ข้อความแบบไหน | แปลที่ไหน |
| --- | --- |
| ข้อความคงที่ ทั้งใน HTML และที่ JavaScript สร้าง | เพิ่มคู่ `'ข้อความอังกฤษ': 'คำแปล'` ใน `js/i18n-th.js` — ไม่ต้องแก้ HTML |
| ข้อความที่มีตัวแปรแทรก เช่น จำนวนที่ว่าง | ใช้ `t('English ...', 'ไทย ...')` จาก `js/i18n.js` ในโค้ด |
| ชื่อ / คำอธิบาย / จุดเด่น / ระยะเวลาของกิจกรรม | แก้ในหลังบ้าน → แท็บกิจกรรม (มีช่องไทยและอังกฤษแยกกัน) |

- คีย์ใน `js/i18n-th.js` ต้องตรงกับข้อความบนหน้าเว็บทั้งก้อน แก้คำในหน้าเว็บแล้วต้องแก้คีย์ให้ตรงด้วย
  ข้อความไหนไม่มีคำแปล หน้าไทยจะแสดงเป็นอังกฤษตามเดิม (ไม่พัง) — ข้อความที่มีแท็กแทรกกลาง เช่น `<strong>` ต้องใส่ทีละท่อน
- รีวิวจาก Google (`reviews.js`) แสดงตามต้นฉบับที่ลูกค้าเขียน ไม่แปล
- Blog: ชื่อเรื่อง คำโปรย และเนื้อหาของบทความแปลผ่าน `js/i18n-th.js` เหมือนข้อความอื่น เพิ่มบทความใหม่แล้วให้เพิ่มคำแปลด้วย
- ใส่ `data-no-i18n` ที่ element ไหน ข้อความข้างในจะไม่ถูกแปล

## ช่วงอายุของราคา

ผู้ใหญ่ / เด็ก / ทารก มีช่วงอายุกำกับในหน้ารายละเอียดกิจกรรมและหน้าต่างจอง กำหนดที่เดียวคือ `AGE_GROUPS` ใน `js/common.js`

## ปุ่มแชต WhatsApp

เบอร์ปลายทางอยู่ที่ `DEFAULT_NUMBER` ใน `js/chat-widget.js` (หน้าไหนมีลิงก์ `wa.me` ลอยของดีไซน์เดิม จะใช้เบอร์จากลิงก์นั้นและแทนที่ปุ่มเดิม)

## หน้าไหนเรียก API อะไร

| หน้า / ส่วน | Endpoint |
| --- | --- |
| การ์ดกิจกรรม รีวิว FAQ และ Blog ในหน้าแรก | ไม่เรียก API — เป็นข้อมูล static ใน `index.html`, `reviews.js`, `blog-data.js` |
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

- เขียวป่า (`forest`): `#21452A` · เข้ม (`forest-dark`): `#183420`
- เขียวเน้น (`gold` — ชื่อ class เดิมจากโทนเก่า คงไว้เพื่อไม่ต้องไล่แก้ทั้งเว็บ): `#2F7F55`
- เขียวอ่อนสำหรับข้อความบนพื้นเขียวเข้ม (`mint`): `#CFE8D0`
- ขาวอุ่น (`cream` — ชื่อ class เดิมเช่นกัน): `#FFFCF7`
- ส้มอิฐ (`brick`, `brick-dark`): `#BF4E2B` — ใช้กับปุ่มจองเท่านั้น
- ฟอนต์ตัวอักษร: Inter · ฟอนต์หัวข้อลายมือ: Caveat (Google Fonts)
- ค่าทั้งหมดกำหนดไว้ที่ `tailwind.config.js` และในบล็อก `tailwind.config` ต้นไฟล์ของหน้า static 5 หน้า (แก้สีต้องแก้ให้ตรงกันทุกที่)
