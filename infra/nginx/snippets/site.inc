# ส่วนที่ใช้ร่วมกันระหว่าง default.conf (HTTP ตอน dev) และ https.conf (HTTPS ตอนขึ้นใช้งานจริง)

root /usr/share/nginx/html;
index index.html;

charset utf-8;
# รูปสลิปโอนเงินถูกส่งมาใน body ของ /api/payments/promptpay/notify (API จำกัดไว้ที่ 6 MB)
client_max_body_size 8m;

# gzip ช่วยให้ไฟล์ HTML/CSS/JS โหลดเร็วขึ้นพอสมควร
gzip on;
gzip_types text/plain text/css application/javascript application/json image/svg+xml;
gzip_min_length 1024;

include /etc/nginx/snippets/security-headers.inc;

# ส่งทุก request ที่ขึ้นต้นด้วย /api ไปให้ container ของ Node
# ทำให้ frontend เรียก /api/... ได้ตรง ๆ โดยไม่ต้องตั้งค่า CORS
location /api/ {
    proxy_pass http://api:3000;
    proxy_http_version 1.1;
    # $http_host คงพอร์ตไว้ด้วย (เช่น 192.168.1.5:8080) API ใช้เทียบกับ Origin ว่าเป็นเว็บเดียวกันหรือไม่
    proxy_set_header Host              $http_host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 30s;
    # header ชุดนี้ nginx ใส่ให้เองแล้ว (security-headers.inc) จึงตัดของ API ออกไม่ให้ซ้ำสองบรรทัด
    proxy_hide_header X-Content-Type-Options;
    proxy_hide_header X-Frame-Options;
    proxy_hide_header Referrer-Policy;
    proxy_hide_header Strict-Transport-Security;
}

# ไฟล์เครื่องมือ build ของ frontend (Tailwind) อยู่ในโฟลเดอร์เดียวกับหน้าเว็บ แต่ไม่ต้องเสิร์ฟออกไป
location ~ ^/(node_modules|src)/ { return 404; }
location ~ ^/(package(-lock)?\.json|tailwind\.config\.js|README\.md)$ { return 404; }

location / {
    try_files $uri $uri/ =404;
}

# รูปภาพไม่เปลี่ยนบ่อย แคชได้ยาว
location ~* \.(jpg|jpeg|png|webp|gif|svg|ico|woff2?)$ {
    expires 30d;
    add_header Cache-Control "public, immutable";
    include /etc/nginx/snippets/security-headers.inc;
}

# HTML/CSS/JS ต้องไม่แคช จะได้เห็นผลทันทีตอนแก้โค้ด
location ~* \.(html|css|js)$ {
    add_header Cache-Control "no-cache";
    include /etc/nginx/snippets/security-headers.inc;
}
