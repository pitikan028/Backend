/**
 * ห่อ async route handler ให้ error ที่ reject ถูกส่งต่อไปยัง errorHandler
 * (Express 4 ไม่จับ rejected promise ให้เอง)
 */
export const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

export default asyncHandler;
