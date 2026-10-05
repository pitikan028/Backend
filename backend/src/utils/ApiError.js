/** Error ที่มี HTTP status ติดมาด้วย เพื่อให้ errorHandler ตอบกลับได้ตรงประเภท */
export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    if (details) this.details = details;
  }

  static badRequest(message = 'คำขอไม่ถูกต้อง', details) {
    return new ApiError(400, message, details);
  }

  static unauthorized(message = 'กรุณาเข้าสู่ระบบ') {
    return new ApiError(401, message);
  }

  static forbidden(message = 'ไม่มีสิทธิ์เข้าถึง') {
    return new ApiError(403, message);
  }

  static notFound(message = 'ไม่พบข้อมูลที่ต้องการ') {
    return new ApiError(404, message);
  }

  static conflict(message = 'ข้อมูลขัดแย้งกับสถานะปัจจุบัน', details) {
    return new ApiError(409, message, details);
  }

  static unprocessable(message = 'ข้อมูลไม่ผ่านการตรวจสอบ', details) {
    return new ApiError(422, message, details);
  }
}

export default ApiError;
