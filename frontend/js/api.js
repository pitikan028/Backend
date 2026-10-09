/**
 * ตัวกลางเรียก REST API ของ Chokchai Elephant Camp
 *
 * ปกติ frontend เสิร์ฟผ่าน nginx ที่ proxy /api ไปให้ container ของ Node อยู่แล้ว
 * จึงใช้ path สัมพัทธ์ได้เลย (ไม่ว่า WEB_PORT จะตั้งเป็นพอร์ตไหน) แต่ถ้าเปิดไฟล์ผ่าน Live Server
 * (พอร์ต 5500/5501) หรือเปิดไฟล์ตรง ๆ จะชี้ไปที่ http://localhost:3000 ให้อัตโนมัติ
 */
const LIVE_SERVER_PORTS = ['5500', '5501'];

const API_BASE = (() => {
  const override = document.documentElement.dataset.apiBase;
  if (override) return override.replace(/\/$/, '');

  const { protocol, hostname, port } = window.location;
  if (protocol === 'file:') return 'http://localhost:3000/api';
  if (LIVE_SERVER_PORTS.includes(port)) return `${protocol}//${hostname}:3000/api`;
  return '/api';
})();

/** ที่เก็บ token ใน localStorage — แยก key ระหว่างทีมงานกับลูกค้า เพื่อให้ล็อกอินสองฝั่งพร้อมกันได้ */
function tokenStore(key) {
  return {
    get token() {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    set(token) {
      try {
        localStorage.setItem(key, token);
      } catch {
        /* โหมดไม่ระบุตัวตนอาจเขียน localStorage ไม่ได้ */
      }
    },
    clear() {
      try {
        localStorage.removeItem(key);
      } catch {
        /* ไม่เป็นไร */
      }
    },
  };
}

export const auth = tokenStore('chokchai_admin_token');
export const userAuth = tokenStore('chokchai_user_token');

const USER_CACHE_KEY = 'chokchai_user';

/** ข้อมูลสมาชิกที่ล็อกอินอยู่ (เก็บสำเนาไว้ให้ header แสดงชื่อได้โดยไม่ต้องเรียก API ทุกหน้า) */
export const currentUser = {
  get() {
    if (!userAuth.token) return null;
    try {
      return JSON.parse(localStorage.getItem(USER_CACHE_KEY));
    } catch {
      return null;
    }
  },
  set(user) {
    try {
      localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
    } catch {
      /* ไม่เป็นไร */
    }
  },
  clear() {
    userAuth.clear();
    try {
      localStorage.removeItem(USER_CACHE_KEY);
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

  /** ข้อความหลัก + รายละเอียดรายฟิลด์ (ถ้ามี) สำหรับแสดงให้ผู้ใช้ */
  get fullMessage() {
    if (!this.details?.length) return this.message;
    return `${this.message} (${this.details.map((item) => item.message).join(', ')})`;
  }
}

/**
 * as: 'admin' | 'user' | undefined — เลือกว่าจะแนบ token ของใครไปด้วย
 */
async function request(path, { method = 'GET', body, query, as } = {}) {
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
  const token = as === 'admin' ? auth.token : as === 'user' ? userAuth.token : null;
  if (token) headers.Authorization = `Bearer ${token}`;

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

const data = (promise) => promise.then((res) => res.data);
const admin = (path, options = {}) => request(path, { ...options, as: 'admin' });
const member = (path, options = {}) => request(path, { ...options, as: 'user' });

async function startSession(path, body) {
  const session = await data(request(path, { method: 'POST', body }));
  userAuth.set(session.token);
  currentUser.set(session.user);
  return session.user;
}

export const api = {
  // ---------- สาธารณะ ----------
  settings: () => data(request('/settings')),
  listActivities: (params = {}) => data(request('/activities', { query: params })),
  searchActivities: (params = {}) => request('/activities', { query: params }),
  getActivity: (slug) => data(request(`/activities/${slug}`)),
  getAvailability: (slug, date) => data(request(`/activities/${slug}/availability`, { query: { date } })),

  // ถ้าล็อกอินอยู่จะแนบ token ไปด้วย การจองจะเข้าไปอยู่ในประวัติของบัญชี
  createBooking: (payload) => data(request('/bookings', { method: 'POST', body: payload, as: 'user' })),
  lookupBooking: (ref, email) => data(request(`/bookings/${ref}`, { query: { email } })),
  cancelBooking: (ref, email, reason) =>
    data(request(`/bookings/${ref}/cancel`, { method: 'POST', body: { email, reason } })),
  payBooking: (ref, email) => data(request(`/bookings/${ref}/pay`, { method: 'POST', body: { email } })),

  paymentStatus: (ref, token) => data(request('/payments/status', { query: { ref, token } })),
  confirmMockPayment: (ref, token) =>
    data(request('/payments/mock/confirm', { method: 'POST', body: { ref, token } })),

  notifyTransfer: (ref, token, { note, slip } = {}) =>
    data(request('/payments/promptpay/notify', { method: 'POST', body: { ref, token, note, slip } })),

  listReviews: (params = {}) => request('/reviews', { query: params }),
  submitReview: (payload) => request('/reviews', { method: 'POST', body: payload }),
  listFaqs: () => data(request('/faqs')),
  sendInquiry: (payload) => data(request('/inquiries', { method: 'POST', body: payload })),

  // ---------- สมาชิก ----------
  register: (payload) => startSession('/account/register', payload),
  // identifier = อีเมลหรือเบอร์โทร
  userLogin: (identifier, password) => startSession('/account/login', { identifier, password }),
  userLogout: () => currentUser.clear(),
  profile: async () => {
    const user = await data(member('/account/me'));
    currentUser.set(user);
    return user;
  },
  updateProfile: async (payload) => {
    const user = await data(member('/account/me', { method: 'PATCH', body: payload }));
    currentUser.set(user);
    return user;
  },
  changePassword: (payload) => data(member('/account/password', { method: 'POST', body: payload })),
  myBookings: () => data(member('/account/bookings')),
  cancelMyBooking: (ref, reason) =>
    data(member(`/account/bookings/${ref}/cancel`, { method: 'POST', body: { reason } })),
  payMyBooking: (ref) => data(member(`/account/bookings/${ref}/pay`, { method: 'POST' })),
  myNotifications: () => member('/account/notifications'),
  markNotificationsRead: () => member('/account/notifications/read', { method: 'POST' }),

  // ---------- แอดมิน ----------
  login: async (email, password) => {
    const session = await data(request('/auth/login', { method: 'POST', body: { email, password } }));
    auth.set(session.token);
    return session.user;
  },
  me: () => data(admin('/auth/me')),
  logout: () => auth.clear(),

  stats: () => data(admin('/admin/stats')),
  report: (params = {}) => data(admin('/admin/reports', { query: params })),

  adminBookings: (params = {}) => admin('/admin/bookings', { query: params }),
  updateBooking: (id, payload) => data(admin(`/admin/bookings/${id}`, { method: 'PATCH', body: payload })),

  /** รูปสลิปต้องแนบ token ไปด้วย จึงโหลดเป็น blob แล้วคืน URL ชั่วคราวให้ใส่ใน <img> */
  bookingSlipUrl: async (id) => {
    const response = await fetch(`${API_BASE}/admin/bookings/${id}/slip`, {
      headers: { Authorization: `Bearer ${auth.token}` },
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new ApiRequestError(payload?.error?.message ?? 'โหลดสลิปไม่สำเร็จ', { status: response.status });
    }
    return URL.createObjectURL(await response.blob());
  },

  /** ไฟล์ Excel ของรายการจองตามตัวกรอง — ต้องแนบ token จึงโหลดเป็น blob แล้วให้หน้าเว็บสั่งดาวน์โหลดเอง */
  exportBookings: async (params = {}) => {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, value]) => value !== undefined && value !== '' && value !== null),
    ).toString();
    const response = await fetch(`${API_BASE}/admin/bookings/export${query ? `?${query}` : ''}`, {
      headers: { Authorization: `Bearer ${auth.token}` },
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new ApiRequestError(payload?.error?.message ?? 'ส่งออกไฟล์ไม่สำเร็จ', { status: response.status });
    }
    const filename = /filename="([^"]+)"/.exec(response.headers.get('Content-Disposition') ?? '')?.[1];
    return { blob: await response.blob(), filename: filename ?? 'chokchai-bookings.xlsx' };
  },

  adminActivities: () => data(admin('/admin/activities')),
  createActivity: (payload) => data(admin('/admin/activities', { method: 'POST', body: payload })),
  updateActivity: (id, payload) => data(admin(`/admin/activities/${id}`, { method: 'PATCH', body: payload })),
  deleteActivity: (id) => admin(`/admin/activities/${id}`, { method: 'DELETE' }),

  adminReviews: (params = {}) => admin('/admin/reviews', { query: params }),
  updateReview: (id, payload) => data(admin(`/admin/reviews/${id}`, { method: 'PATCH', body: payload })),
  adminInquiries: (params = {}) => admin('/admin/inquiries', { query: params }),
  updateInquiry: (id, payload) => data(admin(`/admin/inquiries/${id}`, { method: 'PATCH', body: payload })),

  adminUsers: (params = {}) => admin('/admin/users', { query: params }),
  setUserActive: (id, isActive) =>
    data(admin(`/admin/users/${id}`, { method: 'PATCH', body: { is_active: isActive } })),

  adminStaff: () => data(admin('/admin/staff')),
  createStaff: (payload) => data(admin('/admin/staff', { method: 'POST', body: payload })),
  updateStaff: (id, payload) => data(admin(`/admin/staff/${id}`, { method: 'PATCH', body: payload })),

  adminSettings: () => data(admin('/admin/settings')),
  saveSettings: (payload) => data(admin('/admin/settings', { method: 'PUT', body: payload })),

  adminNotifications: (params = {}) => admin('/admin/notifications', { query: params }),
};

/** จัดรูปแบบราคาเป็นเลขไทยพร้อมสัญลักษณ์บาท */
export const formatTHB = (amount) => `${Number(amount).toLocaleString('th-TH')} ฿`;

/**
 * ยอดรวมของการจอง — ต้องคิดแบบเดียวกับ calculateTotal() ฝั่ง API (ยอดจริงคำนวณที่เซิร์ฟเวอร์อีกครั้ง)
 * กิจกรรมราคาเหมาต่อกลุ่ม (price_tiers): แบ่งเป็นกลุ่มขนาดใหญ่สุดก่อน ที่เหลือใช้ช่วงราคาที่เล็กที่สุดที่รับได้
 */
export function bookingTotal(activity, { adults, children, infants }) {
  const tiers = activity.price_tiers ?? [];
  if (tiers.length) {
    const guests = adults + children;
    if (guests <= 0) return 0;
    const largest = tiers[tiers.length - 1];
    const rest = guests % largest.max_guests;
    const restTier = rest > 0 ? tiers.find((tier) => tier.max_guests >= rest) : null;
    return Math.floor(guests / largest.max_guests) * largest.price + (restTier ? restTier.price : 0);
  }
  return adults * activity.adult_price + children * activity.child_price + infants * activity.infant_price;
}

/**
 * ราคาบนการ์ดกิจกรรม: "500 - 1,000 ฿ / person", "1,200 ฿ / person" หรือ "1,500 - 2,000 ฿ / group"
 * units = คำว่า person / group ตามภาษาที่แสดง
 */
export function priceLabel(activity, units = { person: 'person', group: 'group' }) {
  const amount = (value) => Number(value).toLocaleString('th-TH');
  const range = (values, unit) => {
    const low = Math.min(...values);
    const high = Math.max(...values);
    return `${low === high ? amount(low) : `${amount(low)} - ${amount(high)}`} ฿ / ${unit}`;
  };
  const tiers = activity.price_tiers ?? [];
  if (tiers.length) return range(tiers.map((tier) => tier.price), units.group);
  if (activity.adults_only) return range([activity.adult_price], units.person);
  return range([activity.adult_price, activity.child_price], units.person);
}

export default api;
