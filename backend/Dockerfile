FROM node:22-alpine

WORKDIR /app

# คัดลอก manifest ก่อน เพื่อให้ layer ของ npm install ถูก cache ไว้เมื่อโค้ดเปลี่ยนแต่ dependency เท่าเดิม
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

COPY . .

# รันด้วย user ที่ไม่ใช่ root (image ของ node มี user "node" มาให้อยู่แล้ว)
USER node

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "src/server.js"]
