import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import config from './config/index.js';
import routes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  // รันหลัง nginx จึงต้องเชื่อ X-Forwarded-For เพื่อให้ rate limiter เห็น IP จริงของผู้ใช้
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        // ไม่มี origin = เรียกจาก curl / Postman / same-origin ผ่าน nginx proxy
        if (!origin || config.corsOrigins.includes(origin)) return callback(null, true);
        return callback(new Error(`CORS: ไม่อนุญาต origin ${origin}`));
      },
      credentials: true,
    }),
  );
  // webhook ของ Stripe ต้องได้ body ดิบ ๆ ไว้ตรวจลายเซ็น จึงต้องดักก่อน express.json()
  app.use('/api/payments/stripe/webhook', express.raw({ type: 'application/json', limit: '1mb' }));
  // การแจ้งโอนเงินพ่วงรูปสลิปมาด้วย จึงต้องรับ body ใหญ่กว่า endpoint อื่น
  app.use('/api/payments/promptpay/notify', express.json({ limit: '6mb' }));
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: true, limit: '100kb' }));

  if (!config.isProduction) app.use(morgan('dev'));
  else app.use(morgan('combined'));

  app.use('/api', routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export default createApp;
