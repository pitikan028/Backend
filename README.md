# Chokchai Elephant Camp — Website

โค้ดเว็บไซต์ ใช้ **Tailwind CSS (ผ่าน CDN)** + JavaScript ธรรมดา ไม่ต้องติดตั้งอะไรเพิ่ม เปิดใช้งานได้ทันที

## ไฟล์ในโปรเจกต์
- `index.html` — หน้าแรก (Header, Hero, About, Activities, Booking form, Reviews, Map, Inbox, Footer)
- `activities.html` — หน้าเลือกเซ็ทกิจกรรม 6 แบบ + Booking Modal 4 ขั้นตอน (แพ็กเกจ → ติดต่อ → รับ-ส่ง → ชำระเงิน)
- `script.js` — จัดการเมนูมือถือ และ logic ของ Booking Modal (คำนวณราคารวมแบบ real-time)

## วิธีเปิดดู
1. เปิดโฟลเดอร์นี้ใน VS Code
2. ติดตั้ง extension **"Live Server"** (ถ้ายังไม่มี)
3. คลิกขวาที่ `index.html` → **Open with Live Server**

หรือเปิดไฟล์ `index.html` ด้วยเบราว์เซอร์ตรงๆ ก็ได้เลย (ไม่ต้องมี server ก็ใช้งานได้ เพราะ Tailwind โหลดจาก CDN)

## สิ่งที่ควรทำต่อก่อนขึ้นเว็บจริง
- **รูปภาพ**: ตอนนี้ใช้ placeholder ลายทแยง (`.img-placeholder`) แทนรูปช้างจริง ให้แทนที่ด้วย `<img src="...">` หรือ `background-image` ของรูปจริง
- **ฟอร์ม**: ฟอร์มจอง/ติดต่อ/ชำระเงินยังไม่เชื่อมต่อ backend จริง ต้องต่อกับระบบเก็บข้อมูล (เช่น Node.js/Firebase) และระบบชำระเงินจริง (เช่น Stripe/Omise)
- **Google Maps**: ตอนนี้ใช้ embed แบบค้นหาทั่วไป ควรเปลี่ยนเป็นลิงก์ embed ของตำแหน่งจริงจาก Google Maps
- **เบอร์โทร/WhatsApp/อีเมล**: แก้เป็นข้อมูลติดต่อจริงของปางช้าง
- **Production Tailwind**: ตอนนี้ใช้ Tailwind CDN (สะดวกแต่ไฟล์ CSS โหลดทุกคลาส) ถ้าจะขึ้นเว็บจริงแนะนำติดตั้ง Tailwind แบบ build (`npm install -D tailwindcss`) เพื่อให้ไฟล์ CSS เล็กลงและโหลดเร็วขึ้น

## โทนสี / ฟอนต์ที่ใช้
- เขียวป่า (Forest): `#21452A`
- ทอง (Gold): `#BA9330`
- ครีม (Cream): `#F9F8F2`
- ฟอนต์ตัวอักษร: Inter
- ฟอนต์หัวข้อสไตล์ลายมือ: Caveat (โหลดจาก Google Fonts)
