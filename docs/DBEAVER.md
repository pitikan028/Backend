# เชื่อมต่อฐานข้อมูลด้วย DBeaver

## 1. ตรวจว่าฐานข้อมูลรันอยู่

```bash
docker compose ps postgres
```

ต้องเห็นสถานะ `Up ... (healthy)` และพอร์ต `0.0.0.0:5432->5432/tcp`
ถ้ายังไม่ขึ้น ให้สั่ง `docker compose up -d postgres`

## 2. สร้าง connection

ใน DBeaver: **Database → New Database Connection → PostgreSQL → Next**

| ช่อง | ค่า |
| --- | --- |
| Host | `localhost` |
| Port | `5432` |
| Database | `chokchai` |
| Username | `chokchai` |
| Password | `chokchai` |
| Save password | ติ๊กไว้ |

> ค่าเหล่านี้ตรงกับ `DB_USER` / `DB_PASSWORD` / `DB_NAME` ในไฟล์ `.env` ถ้าแก้ใน `.env` ต้องแก้ตรงนี้ด้วย

กด **Test Connection** — ครั้งแรก DBeaver จะขอดาวน์โหลด PostgreSQL driver ให้กด **Download**
เมื่อขึ้น `Connected` แล้วกด **Finish**

## 3. ดูตาราง

ขยายตามลำดับ: `chokchai` → `Schemas` → `public` → `Tables`

| ตาราง | คำอธิบาย |
| --- | --- |
| `activities` | 6 เซ็ทกิจกรรม |
| `bookings` | การจองทั้งหมด |
| `reviews` | รีวิว |
| `faqs` | คำถามที่พบบ่อย |
| `inquiries` | คำถามจากฟอร์มติดต่อ |
| `admin_users` | บัญชีผู้ดูแล |
| `knex_migrations` | ประวัติการรัน migration (ระบบใช้เอง ไม่ต้องแก้) |

ดับเบิลคลิกที่ตาราง → แท็บ **Data** เพื่อดูข้อมูล, แท็บ **ER Diagram** เพื่อดูความสัมพันธ์

---

## Query ตัวอย่าง

เปิด SQL Editor ด้วย `Ctrl + ]` แล้วรันด้วย `Ctrl + Enter`

**การจองทั้งหมดพร้อมชื่อกิจกรรม**

```sql
SELECT b.booking_ref,
       a.name_th        AS กิจกรรม,
       b.booking_date   AS วันที่,
       b.first_name || ' ' || b.last_name AS ผู้จอง,
       b.adults, b.children, b.infants,
       b.total_amount   AS ยอดรวม,
       b.status, b.payment_status
FROM bookings b
JOIN activities a ON a.id = b.activity_id
ORDER BY b.created_at DESC;
```

**รายได้รวมแยกตามกิจกรรม (นับเฉพาะที่ยืนยันแล้ว)**

```sql
SELECT a.name_th                       AS กิจกรรม,
       COUNT(b.id)                     AS จำนวนการจอง,
       SUM(b.adults + b.children)      AS จำนวนคน,
       SUM(b.total_amount)             AS รายได้
FROM activities a
LEFT JOIN bookings b
       ON b.activity_id = a.id
      AND b.status IN ('confirmed', 'completed')
GROUP BY a.id, a.name_th, a.sort_order
ORDER BY a.sort_order;
```

**ที่ว่างคงเหลือของแต่ละกิจกรรมในวันที่กำหนด**

```sql
SELECT a.name_th,
       a.daily_capacity                                    AS โควตา,
       COALESCE(SUM(b.adults + b.children), 0)             AS จองแล้ว,
       a.daily_capacity - COALESCE(SUM(b.adults + b.children), 0) AS เหลือ
FROM activities a
LEFT JOIN bookings b
       ON b.activity_id = a.id
      AND b.booking_date = DATE '2026-12-25'
      AND b.status IN ('pending', 'confirmed', 'completed')
WHERE a.is_active = true
GROUP BY a.id, a.name_th, a.daily_capacity, a.sort_order
ORDER BY a.sort_order;
```

**ยอดจองรายเดือน**

```sql
SELECT TO_CHAR(booking_date, 'YYYY-MM') AS เดือน,
       COUNT(*)                          AS จำนวนการจอง,
       SUM(total_amount)                 AS ยอดรวม
FROM bookings
WHERE status <> 'cancelled'
GROUP BY 1
ORDER BY 1;
```

**คำถามจากลูกค้าที่ยังไม่ได้ตอบ**

```sql
SELECT contact, contact_type, message, created_at
FROM inquiries
WHERE status = 'new'
ORDER BY created_at;
```

---

## แก้ปัญหาที่พบบ่อย

**`Connection refused` / `Connection to localhost:5432 refused`**
container ยังไม่ขึ้น — สั่ง `docker compose up -d postgres` แล้วรอสถานะเป็น `healthy` ก่อน

**`password authentication failed for user "chokchai"`**
รหัสผ่านใน DBeaver ไม่ตรงกับ `DB_PASSWORD` ใน `.env`
ถ้าเคยแก้ `.env` หลังจากสร้าง container ไปแล้ว รหัสเดิมจะยังถูกใช้อยู่เพราะ PostgreSQL ตั้งรหัสผ่านตอน
สร้าง volume ครั้งแรกเท่านั้น ให้ล้างแล้วสร้างใหม่ (**ข้อมูลจะหายทั้งหมด**):

```bash
docker compose down -v
docker compose up -d
```

**`port 5432 is already allocated`**
มี PostgreSQL ตัวอื่นใช้พอร์ตนี้อยู่แล้ว แก้ `DB_PORT` ใน `.env` เป็นพอร์ตอื่น เช่น `5433`
แล้ว `docker compose up -d --force-recreate postgres` จากนั้นใน DBeaver ใช้พอร์ต `5433` แทน
(service `api` ยังต่อที่ `postgres:5432` ภายใน network ของ Docker ตามเดิม ไม่ต้องแก้)

**ตารางว่างเปล่า**
ยังไม่ได้ seed — สั่ง `docker compose restart api` (API จะ migrate + seed ให้ตอนบูต)
หรือ `cd backend && npm run db:seed`

**ภาษาไทยแสดงเป็น `???`**
ตรวจว่า connection ใช้ UTF-8: คลิกขวาที่ connection → Edit Connection → Connection settings →
Initialization → Auto-commit เปิดไว้ และดูที่ Driver properties ว่า `charSet` เป็น `UTF-8`
(ปกติ PostgreSQL ตั้ง UTF-8 ให้อยู่แล้วจึงมักไม่เจอปัญหานี้)

---

## กรณีใช้ MySQL แทน

เปิด container ก่อน:

```bash
docker compose --profile mysql up -d mysql
```

ใน DBeaver เลือก driver **MySQL** แล้วกรอก

| ช่อง | ค่า |
| --- | --- |
| Server Host | `localhost` |
| Port | `3306` |
| Database | `chokchai` |
| Username | `chokchai` |
| Password | `chokchai` |

Query ตัวอย่างข้างบนใช้ได้เหมือนกัน ยกเว้นสองจุด:
- ต่อสตริงใช้ `CONCAT(first_name, ' ', last_name)` แทน `||`
- แปลงวันที่เป็นเดือนใช้ `DATE_FORMAT(booking_date, '%Y-%m')` แทน `TO_CHAR(...)`
