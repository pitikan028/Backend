/**
 * ของที่ทุกหน้าของเว็บหน้าบ้านใช้ร่วมกัน: header/footer, ลิงก์บัญชีผู้ใช้, ป้ายสถานะ, การ์ดการจอง
 */
import { api, currentUser, formatTHB } from './api.js';

export const escapeHtml = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char],
  );

/** วันที่แบบ YYYY-MM-DD ตามเวลาเครื่องผู้ใช้ (toISOString ใช้ UTC ทำให้วันเพี้ยนช่วงเช้ามืดของไทย) */
export function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const formatDate = (isoDate) =>
  new Date(`${isoDate}T00:00:00`).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });

export const formatDateTime = (value) =>
  new Date(value).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });

export const BOOKING_STATUS = {
  pending: { label: 'รอยืนยัน', className: 'bg-amber-100 text-amber-800' },
  confirmed: { label: 'ยืนยันแล้ว', className: 'bg-emerald-100 text-emerald-800' },
  completed: { label: 'เสร็จสิ้น', className: 'bg-sky-100 text-sky-800' },
  cancelled: { label: 'ยกเลิก', className: 'bg-gray-200 text-gray-600' },
};

export const PAYMENT_STATUS = {
  unpaid: { label: 'ยังไม่ชำระ', className: 'bg-red-50 text-red-700' },
  reviewing: { label: 'แจ้งโอนแล้ว รอตรวจสอบ', className: 'bg-amber-50 text-amber-700' },
  paid: { label: 'ชำระแล้ว', className: 'bg-emerald-50 text-emerald-700' },
  refunded: { label: 'คืนเงินแล้ว', className: 'bg-gray-100 text-gray-600' },
};

/** แอปติดต่อที่เลือกได้ พร้อมชื่อช่องกรอกไอดีของแต่ละแอป */
export const CONTACT_APPS = {
  Line: { idLabel: 'LINE ID', placeholder: 'เช่น somchai_cnx' },
  WhatsApp: { idLabel: 'เบอร์ WhatsApp', placeholder: 'เช่น +66 81 234 5678' },
  WeChat: { idLabel: 'WeChat ID', placeholder: 'เช่น somchai88' },
  Instagram: { idLabel: 'ชื่อบัญชี Instagram (IG)', placeholder: 'เช่น @somchai.travel' },
};

export const contactIdLabel = (app) => (CONTACT_APPS[app] ?? CONTACT_APPS.Line).idLabel;

/**
 * ผูกช่อง "แอปติดต่อ" กับช่องกรอกไอดี — เปลี่ยนแอปแล้วชื่อช่องและตัวอย่างเปลี่ยนตาม
 * คืนฟังก์ชันสำหรับเรียกซ้ำหลังตั้งค่า select ด้วยโค้ด (เช่น ตอนเติมข้อมูลจากบัญชี)
 */
export function bindContactApp(select, input, label) {
  const sync = () => {
    const app = CONTACT_APPS[select.value] ?? CONTACT_APPS.Line;
    label.textContent = `${app.idLabel} *`;
    input.placeholder = app.placeholder;
  };
  select.addEventListener('change', sync);
  sync();
  return sync;
}

export const PICKUP_ROUNDS = { morning: 'รอบเช้า', afternoon: 'รอบกลางวัน' };

export const CATEGORY_LABELS = {
  elephant: 'กิจกรรมกับช้าง',
  adventure: 'ผจญภัย',
  workshop: 'เวิร์กช็อป',
};

export const categoryLabel = (category) => CATEGORY_LABELS[category] ?? category;

/** รูปกิจกรรม ถ้าไม่มีไฟล์จริงให้ถอยกลับไปใช้ลายทแยง .img-placeholder */
export function activityMedia(activity, extraClasses = '') {
  if (!activity.image_url) {
    return `<div class="img-placeholder ${extraClasses}"></div>`;
  }
  return `<img src="${escapeHtml(activity.image_url)}" alt="${escapeHtml(activity.name_th)}"
    class="${extraClasses} object-cover w-full"
    onerror="this.classList.add('img-placeholder');this.removeAttribute('src');">`;
}

const badge = (info) =>
  `<span class="${info.className} text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap">${info.label}</span>`;

/* ============================================================
   Header / Footer ของหน้าย่อย (login, register, account, booking, payment, activity)
   ============================================================ */
const NAV_LINKS = [
  ['index.html', 'หน้าแรก'],
  ['activities.html', 'กิจกรรม'],
  ['index.html#reviews', 'รีวิว'],
  ['index.html#map', 'แผนที่'],
  ['index.html#contact', 'ติดต่อเรา'],
];

function renderChrome() {
  const header = document.getElementById('site-header');
  if (header) {
    header.innerHTML = `
    <header class="sticky top-0 z-40 bg-white border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-6 lg:px-10 h-20 flex items-center justify-between gap-4">
        <a href="index.html" class="text-xl font-extrabold text-forest">Chokchai Elephant Camp</a>
        <nav class="hidden md:flex items-center gap-8 text-sm font-semibold text-dark">
          ${NAV_LINKS.map(([href, label]) => `<a href="${href}" class="hover:text-forest">${label}</a>`).join('')}
        </nav>
        <div class="flex items-center gap-4">
          <div data-auth-nav class="hidden sm:flex items-center gap-4 text-sm font-semibold"></div>
          <a href="activities.html" class="hidden sm:inline-block bg-gold hover:bg-gold/90 text-white text-sm font-bold px-6 py-3 rounded-lg transition">จองเลย</a>
          <button id="nav-toggle" class="md:hidden p-2" aria-label="เปิดเมนู">
            <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
          </button>
        </div>
      </div>
      <div id="mobile-menu" class="hidden md:hidden border-t border-gray-100 px-6 py-4 flex flex-col gap-4 text-sm font-semibold">
        ${NAV_LINKS.map(([href, label]) => `<a href="${href}">${label}</a>`).join('')}
        <div data-auth-nav class="flex flex-col gap-4"></div>
      </div>
    </header>`;
  }

  const footer = document.getElementById('site-footer');
  if (footer) {
    footer.innerHTML = `
    <footer class="bg-forest-dark text-white mt-16">
      <div class="max-w-7xl mx-auto px-6 lg:px-10 py-12 grid md:grid-cols-3 gap-10">
        <div>
          <p class="text-xl font-extrabold">Chokchai Elephant Camp</p>
          <p class="text-white/60 text-sm mt-2">ปางช้างเชิงอนุรักษ์ จ.เชียงใหม่</p>
          <p class="text-white/60 text-sm mt-1" data-setting="opening_hours"></p>
        </div>
        <div>
          <p class="text-gold font-bold text-sm mb-3">เมนู</p>
          <ul class="text-white/70 text-sm flex flex-col gap-2">
            <li><a href="activities.html" class="hover:text-white">กิจกรรมทั้งหมด</a></li>
            <li><a href="booking.html" class="hover:text-white">ตรวจสอบการจอง</a></li>
            <li><a href="account.html" class="hover:text-white">บัญชีของฉัน</a></li>
          </ul>
        </div>
        <div>
          <p class="text-gold font-bold text-sm mb-3">ติดต่อ</p>
          <ul class="text-white/70 text-sm flex flex-col gap-2">
            <li>โทร: <span data-setting="contact_phone"></span></li>
            <li>Line: <span data-setting="contact_line"></span></li>
            <li><span data-setting="contact_email"></span></li>
          </ul>
        </div>
      </div>
      <div class="border-t border-white/10 py-6 text-center text-white/50 text-xs">
        © 2026 Chokchai Elephant Camp | สงวนลิขสิทธิ์
      </div>
    </footer>`;
  }
}

function initMobileNav() {
  const navToggle = document.getElementById('nav-toggle');
  const mobileMenu = document.getElementById('mobile-menu');
  if (!navToggle || !mobileMenu) return;
  navToggle.addEventListener('click', () => mobileMenu.classList.toggle('hidden'));
}

/** เติมลิงก์ "เข้าสู่ระบบ" หรือ "บัญชีของฉัน" ลงในทุกจุดที่มี data-auth-nav */
export function renderAuthNav() {
  const user = currentUser.get();
  const linkClass = 'hover:text-forest whitespace-nowrap';
  const html = user
    ? `<a href="account.html" class="${linkClass}">👤 ${escapeHtml(user.first_name)}</a>`
    : `<a href="booking.html" class="${linkClass}">ตรวจสอบการจอง</a>
       <a href="login.html" class="${linkClass}">เข้าสู่ระบบ</a>`;

  for (const slot of document.querySelectorAll('[data-auth-nav]')) slot.innerHTML = html;
}

let settingsPromise;

/** ค่าตั้งระบบจากหลังบ้าน โหลดครั้งเดียวต่อหน้า */
export function loadSettings() {
  settingsPromise ??= api.settings().catch(() => ({}));
  return settingsPromise;
}

/** เติมค่าตั้งระบบลงใน element ที่มี data-setting และแสดงแถบประกาศถ้าแอดมินตั้งไว้ */
async function applySettings() {
  const settings = await loadSettings();

  for (const element of document.querySelectorAll('[data-setting]')) {
    const value = settings[element.dataset.setting];
    if (value !== undefined && value !== '') element.textContent = value;
  }

  if (settings.site_notice) {
    const bar = document.createElement('div');
    bar.className = 'bg-gold text-white text-sm font-semibold text-center px-4 py-2 relative z-50';
    bar.setAttribute('role', 'status');
    bar.textContent = settings.site_notice;
    document.body.prepend(bar);
    // header ของหน้าแรกเป็นแบบ fixed จึงต้องดันลงมาให้พ้นแถบประกาศ
    const fixedHeader = document.querySelector('header.fixed');
    if (fixedHeader) fixedHeader.style.top = `${bar.offsetHeight}px`;
  }
}

/** เรียกครั้งเดียวตอนโหลดหน้า */
export function initSite() {
  renderChrome();
  initMobileNav();
  renderAuthNav();
  applySettings();
}

/** หน้าที่ต้องล็อกอิน — ถ้ายังไม่ล็อกอินให้เด้งไปหน้า login แล้วกลับมาหน้าเดิม */
export function requireLogin() {
  if (currentUser.get()) return true;
  const next = encodeURIComponent(window.location.pathname.split('/').pop() + window.location.search);
  window.location.replace(`login.html?next=${next}`);
  return false;
}

/** ปลายทางหลังล็อกอิน รับเฉพาะชื่อไฟล์ในเว็บนี้ กัน redirect ออกไปเว็บอื่น */
export function nextPage(fallback = 'account.html') {
  const next = new URLSearchParams(window.location.search).get('next');
  return next && /^[a-z-]+\.html(\?[^/\\]*)?$/i.test(next) ? next : fallback;
}

/** แสดงข้อความในกล่องแจ้งผล (สีแดง = ผิดพลาด, สีเขียว = สำเร็จ) */
export function setMessage(element, message, ok = false) {
  if (!element) return;
  element.textContent = message;
  element.className = message
    ? `text-sm rounded-lg px-4 py-3 border ${ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-700'}`
    : 'hidden';
}

/**
 * ย่อรูปที่ผู้ใช้เลือกให้ด้านยาวไม่เกิน maxSide แล้วแปลงเป็น JPEG แบบ data URL
 * รูปถ่ายจากมือถือมักใหญ่ 3-8 MB ย่อแล้วเหลือไม่กี่ร้อย KB อัปโหลดเร็วและยังอ่านตัวเลขในสลิปได้ชัด
 */
export async function imageFileToDataUrl(file, { maxSide = 1600, quality = 0.85 } = {}) {
  if (!file.type.startsWith('image/')) throw new Error('กรุณาเลือกไฟล์รูปภาพ (JPG หรือ PNG)');

  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('เปิดไฟล์รูปนี้ไม่ได้ ลองบันทึกสลิปเป็น JPG หรือ PNG แล้วเลือกใหม่'));
      element.src = url;
    });

    const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(image.naturalWidth * scale);
    canvas.height = Math.round(image.naturalHeight * scale);

    const context = canvas.getContext('2d');
    // สลิป PNG บางใบพื้นหลังโปร่งใส ถ้าไม่ถมขาวก่อนจะกลายเป็นพื้นดำตอนแปลงเป็น JPEG
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** ปิดปุ่มระหว่างรอ API แล้วเปิดคืนเสมอ */
export async function withBusy(button, task) {
  button.disabled = true;
  button.classList.add('opacity-60');
  try {
    return await task();
  } finally {
    button.disabled = false;
    button.classList.remove('opacity-60');
  }
}

/**
 * การ์ดแสดงการจอง 1 รายการ ใช้ทั้งหน้าบัญชีและหน้าตรวจสอบการจอง
 * ปุ่มมี data-action="pay" | "cancel" และ data-ref ให้หน้าที่เรียกไปผูก event เอง
 */
export function bookingCard(booking, { paymentProvider } = {}) {
  const canPay =
    booking.payment_status === 'unpaid' && booking.status !== 'cancelled' && paymentProvider && paymentProvider !== 'none';
  const canCancel = booking.cancellation?.can_cancel;
  const ref = escapeHtml(booking.booking_ref);

  const notes = [];
  if (booking.status === 'cancelled' && booking.payment_status === 'paid') {
    notes.push('การจองนี้ชำระเงินแล้ว ทีมงานจะติดต่อกลับเรื่องการคืนเงิน');
  }
  if (!canCancel && ['pending', 'confirmed'].includes(booking.status) && booking.cancellation?.reason) {
    notes.push(booking.cancellation.reason);
  }
  if (booking.payment_status === 'reviewing' && booking.status !== 'cancelled') {
    notes.push(
      `คุณแจ้งโอนเงิน${booking.slip_uploaded_at ? 'พร้อมแนบสลิป' : ''}แล้ว ทีมงานกำลังตรวจสอบยอดเงินและจะยืนยันการจองให้ภายใน 24 ชั่วโมง`,
    );
  }
  if (booking.payment_status === 'unpaid' && booking.status !== 'cancelled' && paymentProvider === 'none') {
    notes.push('ทีมงานจะติดต่อกลับพร้อมช่องทางชำระเงิน');
  }

  return `
  <article class="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col gap-4">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p class="font-mono font-extrabold text-forest tracking-wider">${ref}</p>
        <h3 class="font-extrabold text-lg mt-1">${escapeHtml(booking.activity?.name_th ?? '')}</h3>
        <p class="text-sm text-gray-500">${escapeHtml(booking.activity?.name ?? '')}</p>
      </div>
      <div class="flex flex-wrap gap-2">
        ${badge(BOOKING_STATUS[booking.status])}
        ${badge(PAYMENT_STATUS[booking.payment_status])}
      </div>
    </div>
    <dl class="grid sm:grid-cols-3 gap-3 text-sm">
      <div><dt class="text-gray-500">วันที่เข้าร่วม</dt><dd class="font-semibold">${formatDate(booking.booking_date)} · ${PICKUP_ROUNDS[booking.pickup_round] ?? PICKUP_ROUNDS.morning}</dd></div>
      <div><dt class="text-gray-500">จำนวน</dt><dd class="font-semibold">ผู้ใหญ่ ${booking.adults} · เด็ก ${booking.children} · ทารก ${booking.infants}</dd></div>
      <div><dt class="text-gray-500">ยอดรวม</dt><dd class="font-extrabold text-gold">${formatTHB(booking.total_amount)}</dd></div>
    </dl>
    ${notes.map((note) => `<p class="text-xs text-gray-500">${escapeHtml(note)}</p>`).join('')}
    ${
      canPay || canCancel
        ? `<div class="flex flex-wrap gap-3">
            ${canPay ? `<button type="button" data-action="pay" data-ref="${ref}" class="bg-gold hover:bg-gold/90 text-white text-sm font-bold px-5 py-2.5 rounded-lg transition">ชำระเงิน ${formatTHB(booking.total_amount)}</button>` : ''}
            ${canCancel ? `<button type="button" data-action="cancel" data-ref="${ref}" class="border border-red-300 text-red-700 hover:bg-red-50 text-sm font-bold px-5 py-2.5 rounded-lg transition">ยกเลิกการจอง</button>` : ''}
          </div>`
        : ''
    }
  </article>`;
}
