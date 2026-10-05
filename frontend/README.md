# Frontend — Chokchai Elephant Camp

เว็บหน้าบ้าน ใช้ **Tailwind CSS (ผ่าน CDN)** + JavaScript แบบ ES Modules ไม่ต้อง build
ข้อมูลทั้งหมด (กิจกรรม ราคา รีวิว คำถามที่พบบ่อย การจอง) ดึงจาก REST API ไม่ได้ hardcode ไว้ในหน้าแล้ว

> วิธีรันทั้งระบบและเอกสาร API อยู่ใน [README ที่ root ของโปรเจกต์](../README.md)

## ไฟล์ในโฟลเดอร์นี้

| ไฟล์ | หน้าที่ |
| --- | --- |
| `index.html` | หน้าแรก — Hero, About, กิจกรรม, รีวิว, แผนที่, FAQ, ฟอร์มส่งคำถาม |
| `activities.html` | หน้าเลือกกิจกรรม + Booking Modal 4 ขั้นตอน |
| `admin.html` | ระบบหลังบ้าน — ดูและจัดการการจอง คำถาม และรีวิว |
| `js/api.js` | ตัวกลางเรียก REST API และจัดการ token |
| `js/app.js` | logic ของหน้าแรกและหน้ากิจกรรม |
| `js/admin.js` | logic ของระบบหลังบ้าน |
| `images/` | โลโก้และรูป Hero |

## หน้าไหนเรียก API อะไร

| หน้า / ส่วน | Endpoint |
| --- | --- |
| การ์ดกิจกรรมหน้าแรก | `GET /api/activities` |
| คะแนนเฉลี่ยในส่วน About | `GET /api/reviews` → `meta.average_rating` |
| รีวิว | `GET /api/reviews` |
| FAQ | `GET /api/faqs` |
| ฟอร์ม Send us Your Question | `POST /api/inquiries` |
| การ์ดในหน้ากิจกรรม | `GET /api/activities` |
| ที่ว่างใน Booking Modal ขั้นที่ 1 | `GET /api/activities/:slug/availability?date=...` |
| ปุ่มยืนยันการจอง | `POST /api/bookings` |
| หน้าแอดมิน | `POST /api/auth/login`, `GET /api/admin/*` |

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

## รูปกิจกรรม

คอลัมน์ `image_url` ในตาราง `activities` ชี้ไปที่ `images/activities/*.jpg` ซึ่งยังไม่มีไฟล์จริง
ระหว่างนี้หน้าเว็บจะแสดงลายทแยง (`.img-placeholder`) แทนให้อัตโนมัติ
วางไฟล์รูปตามชื่อใน `image_url` แล้วรูปจะขึ้นเองโดยไม่ต้องแก้โค้ด

## โทนสี / ฟอนต์

- เขียวป่า (Forest): `#21452A` · เข้ม: `#183420`
- ทอง (Gold): `#BA9330`
- ครีม (Cream): `#F9F8F2`
- ฟอนต์ตัวอักษร: Inter · ฟอนต์หัวข้อลายมือ: Caveat (Google Fonts)
