/**
 * ตัวกลางเรียก REST API ของ Chokchai Elephant Camp
 *
 * ปกติ frontend เสิร์ฟผ่าน nginx ที่ proxy /api ไปให้ container ของ Node อยู่แล้ว
 * จึงใช้ path สัมพัทธ์ได้เลย แต่ถ้าเปิดไฟล์ผ่าน Live Server (พอร์ต 5500) หรือเปิดไฟล์ตรง ๆ
 * จะชี้ไปที่ http://localhost:3000 ให้อัตโนมัติ
 */
const API_BASE = (() => {
  const override = document.documentElement.dataset.apiBase;
  if (override) return override.replace(/\/$/, '');

  const { protocol, hostname, port } = window.location;
  if (protocol === 'file:') return 'http://localhost:3000/api';
  if (port && port !== '8080' && port !== '80') return `${protocol}//${hostname}:3000/api`;
  return '/api';
})();

const TOKEN_KEY = 'chokchai_admin_token';

export const auth = {
  get token() {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* โหมดไม่ระบุตัวตนอาจเขียน localStorage ไม่ได้ */
    }
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ไม่เป็นไร */
    }
  },
};

/** Error ที่พ่วง HTTP status และรายละเอียดรายฟิลด์จาก validation มาด้วย */
export class ApiRequestError extends Error {
  constructor(message, { status, details } = {}) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.details = details;
  }
}

async function request(path, { method = 'GET', body, query, authenticated = false } = {}) {
  let url = `${API_BASE}${path}`;

  if (query) {
    const params = new URLSearchParams(
      Object.entries(query).filter(([, value]) => value !== undefined && value !== '' && value !== null),
    );
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }

  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (authenticated && auth.token) headers.Authorization = `Bearer ${auth.token}`;

  let response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiRequestError('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่');
  }

  if (response.status === 204) return null;

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    /* บาง response ไม่มี body */
  }

  if (!response.ok) {
    const info = payload?.error ?? {};
    throw new ApiRequestError(info.message ?? `เกิดข้อผิดพลาด (HTTP ${response.status})`, {
      status: response.status,
      details: info.details,
    });
  }

  return payload;
}

export const api = {
  // ---------- สาธารณะ ----------
  listActivities: () => request('/activities').then((res) => res.data),
  getActivity: (slug) => request(`/activities/${slug}`).then((res) => res.data),
  getAvailability: (slug, date) =>
    request(`/activities/${slug}/availability`, { query: { date } }).then((res) => res.data),

  createBooking: (payload) => request('/bookings', { method: 'POST', body: payload }).then((res) => res.data),
  lookupBooking: (ref, email) => request(`/bookings/${ref}`, { query: { email } }).then((res) => res.data),

  listReviews: (params = {}) => request('/reviews', { query: params }),
  submitReview: (payload) => request('/reviews', { method: 'POST', body: payload }),
  listFaqs: () => request('/faqs').then((res) => res.data),
  sendInquiry: (payload) => request('/inquiries', { method: 'POST', body: payload }).then((res) => res.data),

  // ---------- แอดมิน ----------
  login: async (email, password) => {
    const { data } = await request('/auth/login', { method: 'POST', body: { email, password } });
    auth.set(data.token);
    return data.user;
  },
  me: () => request('/auth/me', { authenticated: true }).then((res) => res.data),
  logout: () => auth.clear(),

  stats: () => request('/admin/stats', { authenticated: true }).then((res) => res.data),
  adminBookings: (params = {}) => request('/admin/bookings', { query: params, authenticated: true }),
  updateBooking: (id, payload) =>
    request(`/admin/bookings/${id}`, { method: 'PATCH', body: payload, authenticated: true }).then(
      (res) => res.data,
    ),
  adminReviews: (params = {}) => request('/admin/reviews', { query: params, authenticated: true }),
  updateReview: (id, payload) =>
    request(`/admin/reviews/${id}`, { method: 'PATCH', body: payload, authenticated: true }).then(
      (res) => res.data,
    ),
  adminInquiries: (params = {}) => request('/admin/inquiries', { query: params, authenticated: true }),
  updateInquiry: (id, payload) =>
    request(`/admin/inquiries/${id}`, { method: 'PATCH', body: payload, authenticated: true }).then(
      (res) => res.data,
    ),
};

/** จัดรูปแบบราคาเป็นเลขไทยพร้อมสัญลักษณ์บาท */
export const formatTHB = (amount) => `${Number(amount).toLocaleString('th-TH')} ฿`;

export default api;
