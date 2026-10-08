import { Router } from 'express';
import { db } from '../db/knex.js';
import config from '../config/index.js';
import publicRoutes from './public.routes.js';
import authRoutes from './auth.routes.js';
import adminRoutes from './admin.routes.js';
import accountRoutes from './account.routes.js';
import paymentRoutes from './payment.routes.js';

const router = Router();

/** health check ที่ Docker ใช้ตรวจว่า container พร้อมรับ traffic แล้ว */
router.get('/health', async (_req, res) => {
  try {
    await db.raw('select 1');
    res.json({
      status: 'ok',
      database: config.db.isPostgres ? 'postgres' : 'mysql',
      uptime_seconds: Math.round(process.uptime()),
    });
  } catch (error) {
    res.status(503).json({ status: 'degraded', database: 'unreachable', message: error.message });
  }
});

/** รายการ endpoint ทั้งหมด ไว้เปิดดูตอน dev */
router.get('/', (_req, res) => {
  res.json({
    name: 'Chokchai Elephant Camp API',
    version: '2.0.0',
    endpoints: {
      public: [
        'GET    /api/health',
        'GET    /api/settings',
        'GET    /api/activities?q=&category=&max_price=&sort=',
        'GET    /api/activities/:slug',
        'GET    /api/activities/:slug/availability?date=YYYY-MM-DD',
        'POST   /api/bookings',
        'GET    /api/bookings/:ref?email=...',
        'POST   /api/bookings/:ref/cancel',
        'POST   /api/bookings/:ref/pay',
        'GET    /api/reviews',
        'POST   /api/reviews',
        'GET    /api/faqs',
        'POST   /api/inquiries',
      ],
      account: [
        'POST   /api/account/register',
        'POST   /api/account/login',
        'GET    /api/account/me',
        'PATCH  /api/account/me',
        'POST   /api/account/password',
        'GET    /api/account/bookings',
        'GET    /api/account/bookings/:ref',
        'POST   /api/account/bookings/:ref/cancel',
        'POST   /api/account/bookings/:ref/pay',
        'GET    /api/account/notifications',
        'POST   /api/account/notifications/read',
      ],
      payments: [
        'GET    /api/payments/status?ref=&token=',
        'POST   /api/payments/mock/confirm',
        'POST   /api/payments/promptpay/notify',
        'POST   /api/payments/stripe/webhook',
      ],
      auth: ['POST /api/auth/login', 'GET /api/auth/me'],
      admin: [
        'GET    /api/admin/stats',
        'GET    /api/admin/reports?from=&to=',
        'GET    /api/admin/bookings',
        'GET    /api/admin/bookings/export',
        'GET    /api/admin/bookings/:id',
        'GET    /api/admin/bookings/:id/slip',
        'PATCH  /api/admin/bookings/:id',
        'GET    /api/admin/activities',
        'POST   /api/admin/activities',
        'PATCH  /api/admin/activities/:id',
        'DELETE /api/admin/activities/:id',
        'GET    /api/admin/reviews',
        'PATCH  /api/admin/reviews/:id',
        'DELETE /api/admin/reviews/:id',
        'GET    /api/admin/inquiries',
        'PATCH  /api/admin/inquiries/:id',
        'GET    /api/admin/users',
        'PATCH  /api/admin/users/:id',
        'GET    /api/admin/staff',
        'POST   /api/admin/staff',
        'PATCH  /api/admin/staff/:id',
        'GET    /api/admin/settings',
        'PUT    /api/admin/settings',
        'GET    /api/admin/notifications',
      ],
    },
  });
});

router.use('/', publicRoutes);
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/account', accountRoutes);
router.use('/payments', paymentRoutes);

export default router;
