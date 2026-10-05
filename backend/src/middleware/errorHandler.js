import config from '../config/index.js';
import ApiError from '../utils/ApiError.js';

/** route ที่ไม่ตรงกับอะไรเลย */
export function notFoundHandler(req, _res, next) {
  next(ApiError.notFound(`ไม่พบ endpoint ${req.method} ${req.originalUrl}`));
}

/**
 * ตัวจัดการ error กลาง — ตอบกลับเป็นรูปแบบเดียวกันเสมอ
 * { error: { message, details? } }
 */
export function errorHandler(err, _req, res, _next) {
  let status = err.status ?? err.statusCode ?? 500;
  let message = err.message ?? 'เกิดข้อผิดพลาดภายในระบบ';
  const details = err.details;

  // body-parser โยน error แบบนี้เมื่อ JSON ที่ส่งมาพัง
  if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'รูปแบบ JSON ที่ส่งมาไม่ถูกต้อง';
  }

  if (err.type === 'entity.too.large') {
    status = 413;
    message = 'ไฟล์ที่ส่งมามีขนาดใหญ่เกินไป';
  }

  // unique violation: 23505 = PostgreSQL, ER_DUP_ENTRY = MySQL
  if (err.code === '23505' || err.code === 'ER_DUP_ENTRY') {
    status = 409;
    message = 'ข้อมูลนี้มีอยู่ในระบบแล้ว';
  }

  // foreign key violation
  if (err.code === '23503' || err.code === 'ER_NO_REFERENCED_ROW_2') {
    status = 400;
    message = 'อ้างอิงข้อมูลที่ไม่มีอยู่จริง';
  }

  if (status >= 500) {
    console.error('[error]', err);
    if (config.isProduction) message = 'เกิดข้อผิดพลาดภายในระบบ';
  }

  res.status(status).json({
    error: {
      message,
      ...(details ? { details } : {}),
      ...(config.isProduction || status < 500 ? {} : { stack: err.stack }),
    },
  });
}

export default { notFoundHandler, errorHandler };
