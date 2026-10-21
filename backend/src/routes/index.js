import { Router } from 'express';
import { db } from '../db/knex.js';
import config from '../config/index.js';
import publicRoutes from './public.routes.js';
import authRoutes from './auth.routes.js';
import adminRoutes from './admin.routes.js';
import accountRoutes from './account.routes.js';
import paymentRoutes from './payment.routes.js';

import { storageService } from '../services/storage.service.js';

const router = Router();

/** health check ที่ตรวจความพร้อมของระบบและฐานข้อมูล */
router.get('/health', async (_req, res) => {
  try {
    await db.raw('select 1');
    res.json({
      status: 'ok',
      database: config.db.isPostgres ? 'postgres' : 'mysql',
      is_neon_cloud: Boolean(config.db.connectionString),
      uptime_seconds: Math.round(process.uptime()),
    });
  } catch (error) {
    res.status(503).json({ status: 'degraded', database: 'unreachable', message: error.message });
  }
});

/** ตรวจสอบสถานะการเชื่อมต่อบริการทั้งหมดบน Neon (Postgres, Auth, Storage, Functions) */
router.get('/neon/status', async (_req, res) => {
  const results = {
    branch: config.neon.branch,
    services: {
      postgres: { configured: Boolean(config.db.connectionString) },
      auth: { configured: Boolean(config.neon.authBaseUrl) },
      object_storage: { configured: storageService.isConfigured() },
      functions: { configured: Boolean(config.neon.functionHelloUrl) },
    },
  };

  // 1. Test Postgres
  try {
    const dbResult = await db.raw('select current_database() as db_name, current_user as db_user');
    results.services.postgres.status = 'ok';
    results.services.postgres.details = dbResult.rows ? dbResult.rows[0] : dbResult[0];
  } catch (err) {
    results.services.postgres.status = 'error';
    results.services.postgres.error = err.message;
  }

  // 2. Test Neon Object Storage (S3)
  try {
    const storageTest = await storageService.testConnection();
    results.services.object_storage.status = storageTest.ok ? 'ok' : 'error';
    results.services.object_storage.details = storageTest;
  } catch (err) {
    results.services.object_storage.status = 'error';
    results.services.object_storage.error = err.message;
  }

  // 3. Test Neon Functions
  if (config.neon.functionHelloUrl) {
    try {
      const resp = await fetch(config.neon.functionHelloUrl);
      const text = await resp.text();
      results.services.functions.status = resp.ok ? 'ok' : 'error';
      results.services.functions.details = { response: text.trim() };
    } catch (err) {
      results.services.functions.status = 'error';
      results.services.functions.error = err.message;
    }
  }

  // 4. Test Neon Auth (JWKS)
  if (config.neon.authJwksUrl) {
    try {
      const resp = await fetch(config.neon.authJwksUrl);
      const data = await resp.json();
      results.services.auth.status = resp.ok ? 'ok' : 'error';
      results.services.auth.details = { jwks_keys_count: data.keys?.length ?? 0 };
    } catch (err) {
      results.services.auth.status = 'error';
      results.services.auth.error = err.message;
    }
  }

  const allHealthy = Object.values(results.services).every((s) => s.status === 'ok');
  res.status(allHealthy ? 200 : 207).json(results);
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
        'POST   /api/account/password/forgot',
        'POST   /api/account/password/reset',
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
