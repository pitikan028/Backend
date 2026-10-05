# header ด้านความปลอดภัย — nginx ไม่สืบทอด add_header จาก server ลงมาที่ location ที่มี add_header ของตัวเอง
# จึงต้อง include ไฟล์นี้ซ้ำในทุก location ที่ตั้ง Cache-Control
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
# $hsts_header ว่างตอนรันแบบ HTTP (nginx จะไม่ส่ง header ที่ค่าว่าง) และมีค่าเมื่อใช้ https.conf
add_header Strict-Transport-Security $hsts_header always;
