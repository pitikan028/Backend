/**
 * ของที่ทุกหน้าของเว็บหน้าบ้านใช้ร่วมกัน: header/footer, ลิงก์บัญชีผู้ใช้, ป้ายสถานะ, การ์ดการจอง
 */
import { api, currentUser, formatTHB } from './api.js';
import { initChatWidget } from './chat-widget.js';
import { initI18n, isThai, renderLangSwitch, t } from './i18n.js';

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

export const formatDate = (isoDate, locale = 'th-TH') =>
  new Date(`${isoDate}T00:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });

export const formatDateTime = (value, locale = 'th-TH') =>
  new Date(value).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' });

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

/* ข้อความภาษาอังกฤษของเว็บหน้าบ้าน — หน้าบ้านส่ง lang ปัจจุบันจาก js/i18n.js เข้ามา ส่วนหลังบ้านใช้ชุดภาษาไทยข้างบนเสมอ */
const EN = {
  locale: 'en-GB',
  bookingStatus: { pending: 'Pending', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled' },
  paymentStatus: {
    unpaid: 'Unpaid',
    reviewing: 'Transfer reported · under review',
    paid: 'Paid',
    refunded: 'Refunded',
  },
  pickupRounds: { morning: 'Morning round', afternoon: 'Afternoon round' },
  contactApps: {
    Line: { idLabel: 'LINE ID', placeholder: 'e.g. somchai_cnx' },
    WhatsApp: { idLabel: 'WhatsApp number', placeholder: 'e.g. +66 81 234 5678' },
    WeChat: { idLabel: 'WeChat ID', placeholder: 'e.g. somchai88' },
    Instagram: { idLabel: 'Instagram (IG) username', placeholder: 'e.g. @somchai.travel' },
  },
};

const contactApps = (lang) => (lang === 'en' ? EN.contactApps : CONTACT_APPS);

export const contactIdLabel = (app, lang = 'th') => (contactApps(lang)[app] ?? contactApps(lang).Line).idLabel;

/**
 * ผูกช่อง "แอปติดต่อ" กับช่องกรอกไอดี — เปลี่ยนแอปแล้วชื่อช่องและตัวอย่างเปลี่ยนตาม
 * คืนฟังก์ชันสำหรับเรียกซ้ำหลังตั้งค่า select ด้วยโค้ด (เช่น ตอนเติมข้อมูลจากบัญชี)
 */
export function bindContactApp(select, input, label, lang = 'th') {
  const sync = () => {
    const app = contactApps(lang)[select.value] ?? contactApps(lang).Line;
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
  package: 'แพ็กเกจ',
};

const CATEGORY_LABELS_EN = {
  elephant: 'Elephant activities',
  adventure: 'Adventure',
  workshop: 'Workshop',
  package: 'Package',
};

export const categoryLabel = (category, lang = 'th') =>
  (lang === 'en' ? CATEGORY_LABELS_EN : CATEGORY_LABELS)[category] ?? category;

/** ช่วงอายุของราคาแต่ละประเภท — แก้ที่นี่ที่เดียว ทุกหน้าที่แสดงราคาอ่านจากตรงนี้ */
export const AGE_GROUPS = {
  adult: { en: 'Age 10+', th: 'อายุ 10 ปีขึ้นไป' },
  child: { en: 'Age 4-9', th: 'อายุ 4-9 ปี' },
  infant: { en: 'Age 0-3', th: 'อายุ 0-3 ปี' },
};

export const ageLabel = (group) => t(AGE_GROUPS[group].en, AGE_GROUPS[group].th);

/** รูปกิจกรรม ถ้าไม่มีไฟล์จริงให้ถอยกลับไปใช้ลายทแยง .img-placeholder */
export function activityMedia(activity, extraClasses = '') {
  if (!activity.image_url) {
    return `<div class="img-placeholder ${extraClasses}"></div>`;
  }
  return `<img src="${escapeHtml(activity.image_url)}" alt="${escapeHtml(t(activity.name, activity.name_th))}"
    class="${extraClasses} object-cover w-full"
    onerror="this.classList.add('img-placeholder');this.removeAttribute('src');">`;
}

const badge = (info) =>
  `<span class="${info.className} text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap">${info.label}</span>`;

/* ============================================================
   Header / Footer ของหน้าย่อย (login, register, account, booking, payment, activity)
   ============================================================ */
// เมนูชุดเดียวกับหน้าแรก (index.html) — ถ้าแก้ที่นั่นให้แก้ที่นี่ด้วย
const NAV_LINKS = [
  ['index.html', 'Home'],
  ['index.html#blog', 'Blog'],
  ['index.html#activities', 'Activity'],
  ['index.html#reviews', 'Review'],
  ['index.html#map', 'Maps'],
  ['index.html#contact', 'Contact us'],
];

/* header / footer หน้าตาเดียวกับหน้าแรก: โลโก้ + ชื่อฟอนต์ script, แถบโปร่งแสง, footer สีเขียวเข้ม */
function renderChrome() {
  const header = document.getElementById('site-header');
  if (header) {
    // sticky ต้องอยู่ที่ตัว wrapper เพราะ <header> ข้างในสูงเท่า wrapper พอดี จะไม่มีระยะให้เกาะ
    header.className = 'sticky top-0 z-40';
    header.innerHTML = `
    <header class="bg-white/90 backdrop-blur border-b border-forest/10">
      <div class="mx-auto px-6 lg:px-10 h-20 flex items-center justify-between">
        <a href="index.html" class="flex items-center gap-3 lg:gap-5">
          <img src="images/Logo.webp" alt="โลโก้ปางช้างโชคชัย" class="h-12 lg:h-16 w-auto" />
          <span class="font-script text-2xl lg:text-3xl text-forest">Chokchai Elephant Camp</span>
        </a>
        <nav class="hidden md:flex items-center ml-auto gap-8 lg:gap-10 text-base lg:text-lg font-semibold text-dark">
          ${NAV_LINKS.map(([href, label]) => `<a href="${href}" class="hover:text-forest transition">${label}</a>`).join('')}
        </nav>
        <div class="flex items-center gap-2 sm:gap-3 md:ml-8">
          <div data-auth-nav class="flex items-center text-base font-semibold text-dark"></div>
          <button id="nav-toggle" class="md:hidden p-2 text-forest" aria-label="เปิดเมนู">
            <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
          </button>
        </div>
      </div>
      <div id="mobile-menu" class="hidden md:hidden bg-white/95 backdrop-blur-md border-t border-forest/10 px-6 py-4 flex flex-col gap-4 text-base font-semibold text-dark">
        ${NAV_LINKS.map(([href, label]) => `<a href="${href}">${label}</a>`).join('')}
      </div>
    </header>`;
  }

  const footer = document.getElementById('site-footer');
  if (footer) {
    // ค่าติดต่อใส่ค่าเริ่มต้นไว้ก่อน แล้ว applySettings() จะทับด้วยค่าจากหน้าตั้งค่าของแอดมิน
    // data-flush = หน้าที่ section สุดท้ายมีสีพื้นของตัวเอง footer ต้องชิดโดยไม่เว้นระยะ
    const gap = footer.dataset.flush === undefined ? 'mt-16' : '';
    footer.innerHTML = `
    <footer class="bg-forest-dark text-white ${gap}">
      <div class="max-w-7xl mx-auto px-6 lg:px-10 pt-14 pb-10 grid gap-10 md:grid-cols-[2fr_1fr_1.6fr_auto]">
        <div>
          <p class="font-script text-2xl leading-snug">
            Chokchai Elephant Camp Thailand<br />@Mae Taeng, Chiangmai, Thailand
          </p>
          <p class="text-white/80 text-sm mt-3 max-w-sm">
            Great things never come from comfort zones wander often, wonder always.
            Travel brings power and love back into your life.
          </p>
          <p class="text-white/80 text-sm mt-3" data-setting="opening_hours"></p>
        </div>
        <div>
          <p class="text-mint font-bold mb-3">Menu</p>
          <ul class="text-white/80 text-sm flex flex-col gap-2.5">
            <li><a href="index.html" class="hover:text-white">Home</a></li>
            <li><a href="activities.html" class="hover:text-white">Activities</a></li>
            <li><a href="blog.html" class="hover:text-white">Blog</a></li>
            <li><a href="index.html#reviews" class="hover:text-white">Reviews</a></li>
            <li><a href="activities.html" class="hover:text-white">Book Activity</a></li>
            <li><a href="booking.html" class="hover:text-white">Check My Booking</a></li>
            <li><a href="account.html" class="hover:text-white">My Account</a></li>
          </ul>
        </div>
        <div>
          <p class="text-mint font-bold mb-3">Contact us</p>
          <ul class="text-white/80 text-sm flex flex-col gap-2.5">
            <li>Tel: <span data-setting="contact_phone">095-447-2547</span></li>
            <li class="flex gap-1">
              <span>Line:</span>
              <a href="https://lin.ee/Nnilm4e" target="_blank" rel="noopener" class="underline hover:text-white">
                <span data-setting="contact_line">@chokchaielephant</span><br />https://lin.ee/Nnilm4e
              </a>
            </li>
            <li>E-mail: <span class="underline" data-setting="contact_email">Chokchaielephantcampcnx@gmail.com</span></li>
          </ul>
        </div>
        <div>
          <p class="text-mint font-bold mb-3">Follow us</p>
          <!-- ลิงก์ https ปกติ — บนมือถือที่ติดตั้งแอปไว้ ระบบจะเปิดในแอป Facebook / X / Instagram / TikTok ให้เอง -->
          <div class="flex gap-3">
            <a href="https://www.facebook.com/chokchaielephant" target="_blank" rel="noopener" aria-label="Facebook" title="Facebook" class="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-forest-dark shadow-sm hover:bg-mint transition">
              <svg width="18" height="18" viewBox="0 0 320 512" fill="currentColor" aria-hidden="true"><path d="M279.14 288l14.22-92.66h-88.91v-60.13c0-25.35 12.42-50.06 52.24-50.06h40.42V6.26S260.43 0 225.36 0c-73.22 0-121.08 44.38-121.08 124.72v70.62H22.89V288h81.39v224h100.17V288z"/></svg>
            </a>
            <a href="https://x.com/chokchai_camp" target="_blank" rel="noopener" aria-label="X (Twitter)" title="X (Twitter)" class="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-forest-dark shadow-sm hover:bg-mint transition">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M12.6.75h2.454l-5.36 6.142L16 15.25h-4.937l-3.867-5.07-4.425 5.07H.316l5.733-6.57L0 .75h5.063l3.495 4.633L12.601.75Zm-.86 13.028h1.36L4.323 2.145H2.865z"/></svg>
            </a>
            <a href="https://www.instagram.com/chokchaielephantcamp.official/" target="_blank" rel="noopener" aria-label="Instagram" title="Instagram" class="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-forest-dark shadow-sm hover:bg-mint transition">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
            </a>
            <a href="https://www.tiktok.com/@chokchai.elephantcamp" target="_blank" rel="noopener" aria-label="TikTok" title="TikTok" class="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-forest-dark shadow-sm hover:bg-mint transition">
              <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M9 0h1.98c.144.715.54 1.617 1.235 2.512C12.895 3.389 13.797 4 15 4v2c-1.753 0-3.07-.814-4-1.829V11a5 5 0 1 1-5-5v2a3 3 0 1 0 3 3z"/></svg>
            </a>
          </div>
        </div>
      </div>
      <div class="max-w-7xl mx-auto px-6 lg:px-10">
        <div class="border-t border-white/20 py-6 text-center text-white/70 text-xs">
          Copyright | All Rights Reserved | Powered by chokchai elephant camp thailand
        </div>
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

/**
 * ปุ่มบัญชีมุมขวาบนของ header (จุดที่มี data-auth-nav) ใช้ทั้งหน้าแรกและหน้าย่อย
 * ยังไม่ล็อกอิน: Log in — ล็อกอินแล้ว: ชื่อสมาชิก ลิงก์ไปหน้าบัญชี
 * จอมือถือเหลือแค่ไอคอนรูปคน (ข้อความซ่อนด้วย hidden sm:inline แต่ยังอยู่ใน aria-label)
 */
export function renderAuthNav() {
  const user = currentUser.get();
  const label = user ? escapeHtml(user.first_name) : 'Log in';
  const href = user ? 'account.html' : 'login.html';
  const html = `
    <a href="${href}" aria-label="${user ? `My account: ${label}` : 'Log in'}"
       class="inline-flex items-center gap-2 rounded-full border border-forest/30 bg-white text-forest p-2 sm:py-1.5 sm:pl-2 sm:pr-4 hover:bg-forest hover:text-white transition whitespace-nowrap">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
           stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" />
      </svg>
      <span class="hidden sm:inline max-w-[9rem] truncate">${label}</span>
    </a>`;

  for (const slot of document.querySelectorAll('[data-auth-nav]')) slot.innerHTML = html;

  // ทุกหน้าของเว็บหน้าบ้านเรียกฟังก์ชันนี้ตอนโหลด จึงใช้เป็นจุดเริ่มของสิ่งที่ต้องมีทุกหน้า (แต่ละตัวทำงานครั้งเดียว)
  renderLangSwitch();
  initI18n();
  initChatWidget();
}

/** ค่าตั้งระบบที่แอดมินพิมพ์เป็นไทย เช่น เวลารับ "06:00 - 06:30 น." — หน้าอังกฤษตัดหน่วย "น." ออก */
const settingText = (value) => (isThai ? value : String(value).replace(/\s*น\.\s*$/, ''));

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
    if (value !== undefined && value !== '') element.textContent = settingText(value);
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
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file (JPG or PNG).');

  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('This image could not be opened. Save the slip as JPG or PNG and try again.'));
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
export function bookingCard(booking, { paymentProvider, lang = 'th' } = {}) {
  const en = lang === 'en';
  const canPay =
    booking.payment_status === 'unpaid' && booking.status !== 'cancelled' && paymentProvider && paymentProvider !== 'none';
  const canCancel = booking.cancellation?.can_cancel;
  const ref = escapeHtml(booking.booking_ref);

  const notes = [];
  if (booking.status === 'cancelled' && booking.payment_status === 'paid') {
    notes.push(
      en
        ? 'This booking has been paid. Our team will contact you about the refund.'
        : 'การจองนี้ชำระเงินแล้ว ทีมงานจะติดต่อกลับเรื่องการคืนเงิน',
    );
  }
  if (!canCancel && ['pending', 'confirmed'].includes(booking.status) && booking.cancellation?.reason) {
    // เหตุผลจาก API เป็นภาษาไทย — การจองที่ยังรอ/ยืนยันแล้วแต่ยกเลิกไม่ได้ มีกรณีเดียวคือเลยกำหนดยกเลิกออนไลน์
    notes.push(
      en ? 'The online cancellation deadline has passed. Please contact our staff.' : booking.cancellation.reason,
    );
  }
  if (booking.payment_status === 'reviewing' && booking.status !== 'cancelled') {
    notes.push(
      en
        ? `You have reported your transfer${booking.slip_uploaded_at ? ' and attached a slip' : ''}. Our team is checking the payment and will confirm your booking within 24 hours.`
        : `คุณแจ้งโอนเงิน${booking.slip_uploaded_at ? 'พร้อมแนบสลิป' : ''}แล้ว ทีมงานกำลังตรวจสอบยอดเงินและจะยืนยันการจองให้ภายใน 24 ชั่วโมง`,
    );
  }
  if (booking.payment_status === 'unpaid' && booking.status !== 'cancelled' && paymentProvider === 'none') {
    notes.push(en ? 'Our team will contact you with payment details.' : 'ทีมงานจะติดต่อกลับพร้อมช่องทางชำระเงิน');
  }

  const statusBadge = (map, labels, key) => badge(en ? { ...map[key], label: labels[key] } : map[key]);
  const rounds = en ? EN.pickupRounds : PICKUP_ROUNDS;
  const date = formatDate(booking.booking_date, en ? EN.locale : undefined);
  const text = en
    ? {
        date: 'Activity date',
        guests: 'Guests',
        guestLine: `Adults ${booking.adults} · Children ${booking.children} · Infants ${booking.infants}`,
        total: 'Total',
        pay: 'Pay',
        cancel: 'Cancel booking',
      }
    : {
        date: 'วันที่เข้าร่วม',
        guests: 'จำนวน',
        guestLine: `ผู้ใหญ่ ${booking.adults} · เด็ก ${booking.children} · ทารก ${booking.infants}`,
        total: 'ยอดรวม',
        pay: 'ชำระเงิน',
        cancel: 'ยกเลิกการจอง',
      };
  const title = en ? booking.activity?.name : booking.activity?.name_th;
  const subtitle = en ? '' : booking.activity?.name;

  return `
  <article class="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col gap-4">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p class="font-mono font-extrabold text-forest tracking-wider">${ref}</p>
        <h3 class="font-extrabold text-lg mt-1">${escapeHtml(title ?? '')}</h3>
        ${subtitle ? `<p class="text-sm text-gray-500">${escapeHtml(subtitle)}</p>` : ''}
      </div>
      <div class="flex flex-wrap gap-2">
        ${statusBadge(BOOKING_STATUS, EN.bookingStatus, booking.status)}
        ${statusBadge(PAYMENT_STATUS, EN.paymentStatus, booking.payment_status)}
      </div>
    </div>
    <dl class="grid sm:grid-cols-3 gap-3 text-sm">
      <div><dt class="text-gray-500">${text.date}</dt><dd class="font-semibold">${date} · ${rounds[booking.pickup_round] ?? rounds.morning}</dd></div>
      <div><dt class="text-gray-500">${text.guests}</dt><dd class="font-semibold">${text.guestLine}</dd></div>
      <div><dt class="text-gray-500">${text.total}</dt><dd class="font-extrabold text-gold">${formatTHB(booking.total_amount)}</dd></div>
    </dl>
    ${notes.map((note) => `<p class="text-xs text-gray-500">${escapeHtml(note)}</p>`).join('')}
    ${
      canPay || canCancel
        ? `<div class="flex flex-wrap gap-3">
            ${canPay ? `<button type="button" data-action="pay" data-ref="${ref}" class="bg-forest hover:bg-forest-dark text-white text-sm font-bold px-5 py-2.5 rounded-lg transition">${text.pay} ${formatTHB(booking.total_amount)}</button>` : ''}
            ${canCancel ? `<button type="button" data-action="cancel" data-ref="${ref}" class="border border-red-300 text-red-700 hover:bg-red-50 text-sm font-bold px-5 py-2.5 rounded-lg transition">${text.cancel}</button>` : ''}
          </div>`
        : ''
    }
  </article>`;
}
