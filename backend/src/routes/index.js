import { Router } from 'express';
import { db } from '../db/knex.js';
import config from '../config/index.js';
import publicRoutes from './public.routes.js';
import authRoutes from './auth.routes.js';
import adminRoutes from './admin.routes.js';

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
    version: '1.0.0',
    endpoints: {
      public: [
        'GET    /api/health',
        'GET    /api/activities',
        'GET    /api/activities/:slug',
        'GET    /api/activities/:slug/availability?date=YYYY-MM-DD',
        'POST   /api/bookings',
        'GET    /api/bookings/:ref?email=...',
        'GET    /api/reviews',
        'POST   /api/reviews',
        'GET    /api/faqs',
        'POST   /api/inquiries',
      ],
      auth: ['POST /api/auth/login', 'GET /api/auth/me'],
      admin: [
        'GET    /api/admin/stats',
        'GET    /api/admin/bookings',
        'GET    /api/admin/bookings/:id',
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
      ],
    },
  });
});

router.use('/', publicRoutes);
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);

export default router;
