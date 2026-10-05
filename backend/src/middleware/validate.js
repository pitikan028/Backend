import ApiError from '../utils/ApiError.js';

/**
 * ตรวจสอบ req.body / req.query / req.params ด้วย zod schema
 * และแทนค่าเดิมด้วยค่าที่ parse แล้ว (มีการ coerce type และ trim ให้)
 *
 *   router.post('/', validate({ body: createBookingSchema }), controller.create)
 */
export const validate = (schemas) => (req, _res, next) => {
  for (const source of ['body', 'query', 'params']) {
    const schema = schemas[source];
    if (!schema) continue;

    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join('.') || source,
        message: issue.message,
      }));
      return next(ApiError.unprocessable('ข้อมูลที่ส่งมาไม่ถูกต้อง', details));
    }

    // req.query ของ Express 5 เป็น getter อย่างเดียว จึงเก็บผลลัพธ์ไว้ที่ req.validated ด้วย
    req.validated = { ...(req.validated ?? {}), [source]: result.data };
    try {
      req[source] = result.data;
    } catch {
      /* ใช้ req.validated[source] แทนได้ */
    }
  }
  return next();
};

export default validate;
