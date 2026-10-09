import { api, auth, formatTHB } from './api.js';
import { BOOKING_STATUS, PAYMENT_STATUS, PICKUP_ROUNDS, categoryLabel, escapeHtml, formatDate, formatDateTime, localDateString } from './common.js';

const $ = (id) => document.getElementById(id);

// สถานะถัดไปที่เปลี่ยนได้ ต้องตรงกับ ALLOWED_TRANSITIONS ฝั่ง backend
const NEXT_STATUSES = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

const PAYMENT_METHODS = { mock: 'ชำระจำลอง', promptpay: 'PromptPay', stripe: 'Stripe', manual: 'รับเงินนอกระบบ' };
const INQUIRY_STATUS = { new: 'ใหม่', answered: 'ตอบแล้ว', closed: 'ปิดแล้ว' };
const MAIL_STATUS = {
  sent: { label: 'ส่งแล้ว', className: 'bg-emerald-100 text-emerald-800' },
  logged: { label: 'บันทึกไว้ (ไม่ได้ตั้งค่า SMTP)', className: 'bg-gray-200 text-gray-600' },
  queued: { label: 'กำลังส่ง', className: 'bg-amber-100 text-amber-800' },
  failed: { label: 'ส่งไม่สำเร็จ', className: 'bg-red-100 text-red-700' },
};
const ROLE_LABELS = { admin: 'ผู้ดูแลระบบ', staff: 'พนักงาน' };

const state = { tab: 'bookings', page: 1, user: null, rows: [] };

const isAdmin = () => state.user?.role === 'admin';

const pill = (info) =>
  `<span class="${info.className} text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap">${info.label}</span>`;

const actionButton = (label, attributes, tone = 'forest') => {
  const tones = {
    forest: 'border-forest text-forest hover:bg-forest hover:text-white',
    gold: 'border-gold text-gold hover:bg-gold hover:text-white',
    gray: 'border-gray-300 text-gray-600 hover:bg-gray-100',
    red: 'border-red-300 text-red-700 hover:bg-red-50',
  };
  return `<button type="button" ${attributes} class="text-xs font-semibold px-2.5 py-1.5 rounded border transition ${tones[tone]}">${label}</button>`;
};

const inputClass = 'border border-gray-300 rounded-lg px-4 py-2.5 bg-white text-sm';

/* ============================================================
   เข้าสู่ระบบ
   ============================================================ */
function showLogin(message = '') {
  $('login-view').classList.remove('hidden');
  $('dashboard-view').classList.add('hidden');
  setLoginError(message);
}

function setLoginError(message) {
  const box = $('login-error');
  box.textContent = message;
  box.classList.toggle('hidden', !message);
}

async function showDashboard(user) {
  state.user = user;
  $('login-view').classList.add('hidden');
  $('dashboard-view').classList.remove('hidden');
  $('current-user').textContent = `${user.name} · ${ROLE_LABELS[user.role] ?? user.role}`;

  for (const button of document.querySelectorAll('[data-admin-only]')) {
    button.classList.toggle('hidden', !isAdmin());
  }

  await Promise.all([loadStats(), selectTab('bookings')]);
}

function initLogin() {
  $('login-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = event.target.querySelector('button[type="submit"]');
    button.disabled = true;
    setLoginError('');

    try {
      const user = await api.login($('login-email').value.trim(), $('login-password').value);
      await showDashboard(user);
    } catch (error) {
      setLoginError(error.message);
    } finally {
      button.disabled = false;
    }
  });

  $('logout-button').addEventListener('click', () => {
    api.logout();
    showLogin();
  });
}

/** token หมดอายุระหว่างใช้งาน = กลับไปหน้า login */
function handleError(error) {
  if (error.status === 401) {
    api.logout();
    showLogin('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');
    return true;
  }
  return false;
}

/* ============================================================
   สถิติรวม
   ============================================================ */
async function loadStats() {
  try {
    const stats = await api.stats();
    $('stat-total').textContent = stats.bookings.total.toLocaleString('th-TH');
    $('stat-pending').textContent = stats.bookings.by_status.pending.toLocaleString('th-TH');
    $('stat-upcoming').textContent = stats.bookings.upcoming.toLocaleString('th-TH');
    $('stat-revenue').textContent = formatTHB(stats.revenue_thb);
    $('badge-inquiries').textContent = stats.pending_inquiries || '';
    $('badge-reviews').textContent = stats.unpublished_reviews || '';
    $('badge-payments').textContent = stats.payments_to_review || '';
  } catch (error) {
    console.error('โหลดสถิติไม่สำเร็จ', error);
  }
}

/* ============================================================
   หน้าต่างฟอร์มกลาง
   ============================================================ */
let dialogSubmit = null;

/**
 * เปิดฟอร์มในหน้าต่าง dialog
 * fields: [{ name, label, type, required, options, wide, help, readonly, placeholder, min, max, step }]
 * onSubmit ได้รับค่าที่แปลงชนิดแล้ว (number / checkbox) — ถ้าไม่ส่ง onSubmit จะเป็นหน้าต่างอ่านอย่างเดียว
 */
function openDialog({ title, fields = [], values = {}, html = '', submitLabel = 'บันทึก', onSubmit }) {
  $('dialog-title').textContent = title;
  $('dialog-error').classList.add('hidden');
  $('dialog-submit').textContent = submitLabel;
  $('dialog-submit').classList.toggle('hidden', !onSubmit);

  const control = (field) => {
    const value = values[field.name] ?? field.value ?? '';
    const common = `id="field-${field.name}" name="${field.name}" ${field.required ? 'required' : ''} ${field.readonly ? 'disabled' : ''}`;
    const className = 'w-full border border-gray-300 rounded-lg px-4 py-2.5 bg-cream text-sm disabled:bg-gray-100 disabled:text-gray-500';

    if (field.type === 'textarea') {
      return `<textarea ${common} rows="${field.rows ?? 3}" maxlength="${field.maxlength ?? 2000}" class="${className}">${escapeHtml(value)}</textarea>`;
    }
    if (field.type === 'select') {
      const options = field.options
        .map(([optionValue, label]) => `<option value="${escapeHtml(optionValue)}" ${String(optionValue) === String(value) ? 'selected' : ''}>${escapeHtml(label)}</option>`)
        .join('');
      return `<select ${common} class="${className}">${options}</select>`;
    }
    if (field.type === 'checkbox') {
      return `<label class="flex items-center gap-3 text-sm"><input type="checkbox" ${common} ${value ? 'checked' : ''} class="accent-gold w-5 h-5" /> ${escapeHtml(field.checkboxLabel ?? '')}</label>`;
    }
    const extra = ['min', 'max', 'step', 'maxlength', 'placeholder', 'list', 'autocomplete']
      .filter((key) => field[key] !== undefined)
      .map((key) => `${key}="${escapeHtml(field[key])}"`)
      .join(' ');
    return `<input type="${field.type ?? 'text'}" ${common} ${extra} value="${escapeHtml(value)}" class="${className}" />`;
  };

  $('dialog-fields').innerHTML =
    html +
    fields
      .map(
        (field) => `
      <div class="${field.wide ? 'sm:col-span-2' : ''}">
        <label for="field-${field.name}" class="text-sm font-semibold block mb-1.5">${escapeHtml(field.label)}${field.required ? ' *' : ''}</label>
        ${control(field)}
        ${field.help ? `<p class="text-xs text-gray-500 mt-1">${escapeHtml(field.help)}</p>` : ''}
      </div>`,
      )
      .join('');

  dialogSubmit = onSubmit
    ? async () => {
        const form = $('dialog-form');
        const result = {};
        for (const field of fields) {
          if (field.readonly) continue;
          const element = form.elements[field.name];
          if (field.type === 'checkbox') result[field.name] = element.checked;
          else if (field.type === 'number') {
            if (element.value === '') {
              if (field.required) throw new Error(`กรุณากรอก${field.label}`);
              continue;
            }
            result[field.name] = Number(element.value);
          } else {
            const text = element.value.trim();
            if (field.required && !text) throw new Error(`กรุณากรอก${field.label}`);
            if (text || field.keepEmpty) result[field.name] = text;
          }
        }
        await onSubmit(result);
      }
    : null;

  $('form-dialog').showModal();
}

function initDialog() {
  const dialog = $('form-dialog');
  const close = () => dialog.close();
  $('dialog-close').addEventListener('click', close);
  $('dialog-cancel').addEventListener('click', close);

  $('dialog-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!dialogSubmit) return;

    const button = $('dialog-submit');
    const errorBox = $('dialog-error');
    button.disabled = true;
    errorBox.classList.add('hidden');

    try {
      await dialogSubmit();
      dialog.close();
      await Promise.all([loadStats(), loadTab()]);
    } catch (error) {
      if (handleError(error)) {
        dialog.close();
        return;
      }
      errorBox.textContent = error.fullMessage ?? error.message;
      errorBox.classList.remove('hidden');
    } finally {
      button.disabled = false;
    }
  });
}

/* ============================================================
   โครงตาราง
   ============================================================ */
function setTable(headers, rowsHtml, emptyText) {
  $('table-head').innerHTML = `
    <tr class="text-left text-xs uppercase tracking-wide text-gray-500 border-b">
      ${headers.map((header) => `<th class="py-3 px-3">${header}</th>`).join('')}
    </tr>`;
  $('table-body').innerHTML = rowsHtml.length
    ? rowsHtml.join('')
    : `<tr><td colspan="${headers.length}" class="text-center py-10 text-gray-400">${emptyText}</td></tr>`;
}

function renderPagination(meta) {
  $('pagination').classList.toggle('hidden', !meta);
  if (!meta) return;
  $('pagination-info').textContent =
    meta.total === 0 ? 'ไม่พบข้อมูล' : `หน้า ${meta.page} จาก ${meta.total_pages} · ทั้งหมด ${meta.total} รายการ`;
  $('page-prev').disabled = meta.page <= 1;
  $('page-next').disabled = meta.page >= meta.total_pages;
}

const row = (cells, extra = '') =>
  `<tr class="border-b last:border-0 align-top hover:bg-cream/60 ${extra}">${cells.map((cell) => `<td class="py-3 px-3">${cell}</td>`).join('')}</tr>`;

/* ============================================================
   แท็บ: การจอง
   ============================================================ */
const bookingsTab = {
  toolbar: () => `
    <select id="filter-status" class="${inputClass}">
      <option value="">ทุกสถานะ</option>
      ${Object.entries(BOOKING_STATUS).map(([value, info]) => `<option value="${value}">${info.label}</option>`).join('')}
    </select>
    <select id="filter-payment" class="${inputClass}">
      <option value="">ทุกสถานะการชำระ</option>
      ${Object.entries(PAYMENT_STATUS).map(([value, info]) => `<option value="${value}">${info.label}</option>`).join('')}
    </select>
    <label class="text-xs text-gray-500 font-semibold flex flex-col gap-1">วันที่เข้าร่วม ตั้งแต่
      <input id="filter-from" type="date" class="${inputClass}" />
    </label>
    <label class="text-xs text-gray-500 font-semibold flex flex-col gap-1">ถึง
      <input id="filter-to" type="date" class="${inputClass}" />
    </label>
    <input id="filter-search" type="search" placeholder="ค้นหารหัสจอง / ชื่อ / อีเมล / เบอร์โทร" class="${inputClass} flex-1 min-w-[240px]" />
    <button type="button" data-action="booking-export" title="ดาวน์โหลดรายการจองตามตัวกรองที่เลือก เป็นไฟล์ Excel"
            class="border border-gray-300 bg-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-gray-50 transition">ดาวน์โหลด Excel</button>`,

  filters: () => ({
    status: $('filter-status').value,
    payment_status: $('filter-payment').value,
    date_from: $('filter-from').value,
    date_to: $('filter-to').value,
    q: $('filter-search').value.trim(),
  }),

  /** ส่งออกทุกรายการที่ตรงตัวกรองปัจจุบัน (ไม่ใช่แค่หน้าที่เห็นอยู่) เป็นไฟล์ .xlsx */
  async exportExcel() {
    const { blob, filename } = await api.exportBookings(this.filters());
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
    toast('ดาวน์โหลดไฟล์ Excel แล้ว');
  },

  async render() {
    const { data, meta } = await api.adminBookings({ page: state.page, limit: 20, ...this.filters() });
    state.rows = data;

    setTable(
      ['รหัส', 'กิจกรรม', 'วันที่', 'ผู้จอง', 'คน', 'ยอด', 'สถานะ', 'จัดการ'],
      data.map((booking) => {
        const actions = NEXT_STATUSES[booking.status].map((next) =>
          actionButton(BOOKING_STATUS[next].label, `data-action="booking-status" data-id="${booking.id}" data-value="${next}"`, next === 'cancelled' ? 'red' : 'forest'),
        );
        if (['unpaid', 'reviewing'].includes(booking.payment_status) && booking.status !== 'cancelled') {
          // reviewing = ลูกค้าแจ้งโอนผ่าน PromptPay แล้ว ต้องเช็กยอดเข้าบัญชีก่อนกด
          const label = booking.payment_status === 'reviewing' ? 'ยืนยันรับเงิน' : 'บันทึกรับเงิน';
          actions.push(actionButton(label, `data-action="booking-payment" data-id="${booking.id}" data-value="paid"`, 'gold'));
        }
        if (booking.payment_status === 'paid' && booking.status === 'cancelled') {
          actions.push(actionButton('บันทึกคืนเงินแล้ว', `data-action="booking-payment" data-id="${booking.id}" data-value="refunded"`, 'gold'));
        }
        if (booking.slip_uploaded_at) {
          actions.push(actionButton('ดูสลิป', `data-action="booking-slip" data-id="${booking.id}"`, 'forest'));
        }
        actions.push(actionButton('รายละเอียด', `data-action="booking-detail" data-id="${booking.id}"`, 'gray'));

        return row([
          `<span class="font-mono font-bold text-forest">${escapeHtml(booking.booking_ref)}</span>`,
          escapeHtml(booking.activity?.name_th ?? '-'),
          `<span class="whitespace-nowrap">${escapeHtml(booking.booking_date)}</span>`,
          `<div class="font-semibold">${escapeHtml(booking.first_name)} ${escapeHtml(booking.last_name)}</div>
           <div class="text-xs text-gray-500">${escapeHtml(booking.email)} · ${escapeHtml(booking.phone)}</div>`,
          `<span class="whitespace-nowrap text-xs">${booking.adults}ญ ${booking.children}ด ${booking.infants}ท</span>`,
          `<div class="font-bold whitespace-nowrap">${formatTHB(booking.total_amount)}</div>
           <div class="text-xs ${booking.payment_status === 'reviewing' ? 'text-amber-700 font-bold' : 'text-gray-500'}">${PAYMENT_STATUS[booking.payment_status].label}</div>
           ${booking.payment_status === 'reviewing' && booking.payment_ref ? `<div class="text-xs text-gray-500 max-w-[160px]">${escapeHtml(booking.payment_ref)}</div>` : ''}`,
          pill(BOOKING_STATUS[booking.status]),
          `<div class="flex flex-wrap gap-1.5">${actions.join('')}</div>`,
        ]);
      }),
      'ไม่พบการจอง',
    );
    renderPagination(meta);
  },

  /** เปิดรูปสลิปพร้อมยอดที่ต้องได้รับ ให้เทียบกับยอดเข้าบัญชีได้ในหน้าต่างเดียว */
  async slip(booking) {
    const url = await api.bookingSlipUrl(booking.id);
    openDialog({
      title: `สลิปโอนเงิน ${booking.booking_ref}`,
      html: `<div class="sm:col-span-2 flex flex-col gap-3">
        <p class="text-sm">ยอดที่ต้องได้รับ <strong class="text-gold text-lg">${formatTHB(booking.total_amount)}</strong>
          · ${escapeHtml(booking.first_name)} ${escapeHtml(booking.last_name)}
          ${booking.payment_ref ? `· <span class="text-gray-500">${escapeHtml(booking.payment_ref)}</span>` : ''}</p>
        <img id="slip-image" src="${url}" alt="สลิปโอนเงินของการจอง ${escapeHtml(booking.booking_ref)}" class="max-h-[70vh] w-auto mx-auto rounded-lg border border-gray-200" />
        <p class="text-xs text-gray-500">สลิปปลอมแปลงได้ — ตรวจยอดเข้าในแอปธนาคารของร้านก่อนกด "ยืนยันรับเงิน" ทุกครั้ง</p>
      </div>`,
    });
    // URL ชั่วคราวของรูปกินหน่วยความจำ คืนเมื่อปิดหน้าต่าง
    $('form-dialog').addEventListener('close', () => URL.revokeObjectURL(url), { once: true });
  },

  detail(booking) {
    const line = (label, value) =>
      `<div><dt class="text-xs text-gray-500">${label}</dt><dd class="text-sm font-semibold break-words">${escapeHtml(value ?? '-') || '-'}</dd></div>`;
    openDialog({
      title: `การจอง ${booking.booking_ref}`,
      html: `<dl class="sm:col-span-2 grid sm:grid-cols-2 gap-4">
        ${line('กิจกรรม', `${booking.activity?.name_th} (${booking.activity?.name})`)}
        ${line('วันที่เข้าร่วม', formatDate(booking.booking_date))}
        ${line('ผู้จอง', `${booking.first_name} ${booking.last_name}`)}
        ${line('ประเภทลูกค้า', booking.user_id ? 'สมาชิก' : 'ไม่ได้ล็อกอิน (guest)')}
        ${line('อีเมล', booking.email)}
        ${line('เบอร์โทร', booking.phone)}
        ${line(`ช่องทางติดต่อ (${booking.contact_app})`, booking.contact_id)}
        ${line('รอบเวลารับ', PICKUP_ROUNDS[booking.pickup_round] ?? PICKUP_ROUNDS.morning)}
        ${line('จำนวน', `ผู้ใหญ่ ${booking.adults} · เด็ก ${booking.children} · ทารก ${booking.infants}`)}
        ${line('ยอดรวม', formatTHB(booking.total_amount))}
        ${line('จุดรับ', `${booking.pickup_type}${booking.pickup_detail ? ` — ${booking.pickup_detail}` : ''}`)}
        ${line('หมายเหตุจากลูกค้า', booking.note)}
        ${line('สถานะ', BOOKING_STATUS[booking.status].label)}
        ${line('การชำระเงิน', `${PAYMENT_STATUS[booking.payment_status].label}${booking.payment_method ? ` · ${PAYMENT_METHODS[booking.payment_method] ?? booking.payment_method}` : ''}`)}
        ${line('เลขอ้างอิง / หมายเหตุการชำระ', booking.payment_ref)}
        ${line('สลิปโอนเงิน', booking.slip_uploaded_at ? `แนบเมื่อ ${formatDateTime(booking.slip_uploaded_at)} (กดปุ่ม "ดูสลิป" ในตาราง)` : 'ไม่ได้แนบ')}
        ${line('ชำระเมื่อ', booking.paid_at ? formatDateTime(booking.paid_at) : '-')}
        ${line('จองเมื่อ', formatDateTime(booking.created_at))}
        ${line('เหตุผลที่ยกเลิก', booking.cancel_reason)}
      </dl>`,
    });
  },
};

/* ============================================================
   แท็บ: กิจกรรม (CRUD)
   ============================================================ */
const activityFields = (isEdit) => [
  { name: 'name', label: 'ชื่อกิจกรรม (อังกฤษ)', required: true, maxlength: 160 },
  { name: 'name_th', label: 'ชื่อกิจกรรม (ไทย)', required: true, maxlength: 160 },
  { name: 'slug', label: 'slug (ใช้ใน URL)', required: true, maxlength: 80, placeholder: 'elephant-bathing', help: 'ตัวพิมพ์เล็ก ตัวเลข และขีดกลางเท่านั้น', readonly: isEdit },
  { name: 'category', label: 'หมวดหมู่', required: true, maxlength: 40, list: 'category-options', help: 'เช่น elephant, adventure, workshop, package' },
  { name: 'duration_label', label: 'ระยะเวลา (ข้อความที่แสดง)', required: true, maxlength: 60, placeholder: '1.5 ชั่วโมง' },
  { name: 'duration_label_en', label: 'ระยะเวลา (อังกฤษ)', maxlength: 60, placeholder: '1.5 hours', keepEmpty: true },
  { name: 'duration_minutes', label: 'ระยะเวลา (นาที)', type: 'number', min: 0, max: 1440 },
  { name: 'adult_price', label: 'ราคาผู้ใหญ่ (บาท)', type: 'number', required: true, min: 0, step: '0.01' },
  { name: 'child_price', label: 'ราคาเด็ก (บาท)', type: 'number', required: true, min: 0, step: '0.01' },
  { name: 'infant_price', label: 'ราคาทารก (บาท)', type: 'number', required: true, min: 0, step: '0.01' },
  { name: 'daily_capacity', label: 'รับได้สูงสุดต่อวัน (ที่)', type: 'number', required: true, min: 1, max: 10000, help: 'ใช้คำนวณที่ว่างของแต่ละวัน' },
  { name: 'sort_order', label: 'ลำดับการแสดง', type: 'number', required: true, min: 0 },
  { name: 'image_url', label: 'ที่อยู่รูปภาพ', maxlength: 255, placeholder: 'images/activities/bathing.jpg', keepEmpty: true },
  { name: 'description_th', label: 'คำอธิบาย', type: 'textarea', wide: true, keepEmpty: true },
  { name: 'description_en', label: 'คำอธิบาย (อังกฤษ — แสดงบนหน้าเลือกกิจกรรม)', type: 'textarea', wide: true, keepEmpty: true },
  { name: 'highlights', label: 'จุดเด่น (บรรทัดละ 1 ข้อ)', type: 'textarea', rows: 4, wide: true, keepEmpty: true },
  { name: 'highlights_en', label: 'จุดเด่น (อังกฤษ — บรรทัดละ 1 ข้อ)', type: 'textarea', rows: 4, wide: true, keepEmpty: true },
  { name: 'group_pricing', label: 'ราคาเหมาต่อกลุ่ม (เว้นว่าง = คิดราคาต่อคน)', maxlength: 200, placeholder: '3=1500,4=2000', keepEmpty: true, wide: true,
    help: 'รูปแบบ จำนวนคนสูงสุด=ราคา คั่นด้วย comma เช่น 3=1500,4=2000 คือ 1-3 คน 1,500 บาท และ 4 คน 2,000 บาท' },
  { name: 'adults_only', label: 'ผู้เข้าร่วม', type: 'checkbox', checkboxLabel: 'รับเฉพาะผู้ใหญ่ (ฟอร์มจองไม่มีช่องเด็ก/ทารก)', wide: true },
  { name: 'includes_transfer', label: 'รับ-ส่ง', type: 'checkbox', checkboxLabel: 'รวมบริการรับ-ส่ง (ถ้าไม่ติ๊ก ฟอร์มจองจะไม่ถามจุดรับ)', wide: true },
  { name: 'is_active', label: 'สถานะ', type: 'checkbox', checkboxLabel: 'เปิดรับจอง (แสดงบนหน้าเว็บ)', wide: true },
];

const activitiesTab = {
  toolbar: () => `
    <button type="button" data-action="activity-create" class="bg-forest hover:bg-forest-dark text-white text-sm font-bold px-5 py-2.5 rounded-lg transition">+ เพิ่มกิจกรรม</button>
    <datalist id="category-options"><option value="elephant"><option value="adventure"><option value="workshop"><option value="package"></datalist>`,

  async render() {
    const activities = await api.adminActivities();
    state.rows = activities;

    setTable(
      ['ลำดับ', 'กิจกรรม', 'หมวดหมู่', 'ระยะเวลา', 'ราคา ผู้ใหญ่ / เด็ก', 'โควตาต่อวัน', 'สถานะ', 'จัดการ'],
      activities.map((activity) =>
        row([
          activity.sort_order,
          `<div class="font-semibold">${escapeHtml(activity.name_th)}</div>
           <div class="text-xs text-gray-500">${escapeHtml(activity.name)} · ${escapeHtml(activity.slug)}</div>`,
          escapeHtml(categoryLabel(activity.category)),
          escapeHtml(activity.duration_label),
          `<span class="whitespace-nowrap">${formatTHB(activity.adult_price)} / ${formatTHB(activity.child_price)}</span>`,
          `${activity.daily_capacity} ที่`,
          pill(
            activity.is_active
              ? { label: 'เปิดรับจอง', className: 'bg-emerald-100 text-emerald-800' }
              : { label: 'ปิดอยู่', className: 'bg-gray-200 text-gray-600' },
          ),
          `<div class="flex flex-wrap gap-1.5">
            ${actionButton('แก้ไข', `data-action="activity-edit" data-id="${activity.id}"`)}
            ${actionButton(activity.is_active ? 'ปิดรับจอง' : 'เปิดรับจอง', `data-action="activity-toggle" data-id="${activity.id}"`, 'gray')}
            ${isAdmin() ? actionButton('ลบ', `data-action="activity-delete" data-id="${activity.id}"`, 'red') : ''}
          </div>`,
        ]),
      ),
      'ยังไม่มีกิจกรรม',
    );
    renderPagination(null);
  },

  create() {
    openDialog({
      title: 'เพิ่มกิจกรรม',
      fields: activityFields(false),
      values: { infant_price: 0, daily_capacity: 40, sort_order: state.rows.length + 1, is_active: true, category: 'elephant' },
      onSubmit: (values) => api.createActivity(values).then(() => toast('เพิ่มกิจกรรมแล้ว')),
    });
  },

  edit(activity) {
    openDialog({
      title: `แก้ไขกิจกรรม: ${activity.name_th}`,
      fields: activityFields(true),
      values: activity,
      onSubmit: (values) => api.updateActivity(activity.id, values).then(() => toast('บันทึกกิจกรรมแล้ว')),
    });
  },
};

/* ============================================================
   แท็บ: คำถามจากลูกค้า
   ============================================================ */
const inquiriesTab = {
  toolbar: () => `
    <select id="filter-status" class="${inputClass}">
      <option value="">ทุกสถานะ</option>
      ${Object.entries(INQUIRY_STATUS).map(([value, label]) => `<option value="${value}">${label}</option>`).join('')}
    </select>`,

  async render() {
    const { data, meta } = await api.adminInquiries({ page: state.page, limit: 20, status: $('filter-status').value });
    state.rows = data;

    setTable(
      ['ติดต่อ', 'คำถาม', 'ส่งเมื่อ', 'สถานะ', 'จัดการ'],
      data.map((inquiry) =>
        row([
          `<span class="font-semibold whitespace-nowrap">${escapeHtml(inquiry.contact)}</span>`,
          `<div class="max-w-md"><p>${escapeHtml(inquiry.message)}</p>
            ${inquiry.answer ? `<p class="text-xs text-forest mt-2">ตอบแล้ว: ${escapeHtml(inquiry.answer)}</p>` : ''}</div>`,
          `<span class="text-xs text-gray-500 whitespace-nowrap">${formatDateTime(inquiry.created_at)}</span>`,
          `<span class="text-xs">${INQUIRY_STATUS[inquiry.status] ?? escapeHtml(inquiry.status)}</span>`,
          `<div class="flex flex-wrap gap-1.5">
            ${inquiry.status !== 'closed' ? actionButton(inquiry.answer ? 'แก้คำตอบ' : 'ตอบกลับ', `data-action="inquiry-answer" data-id="${inquiry.id}"`) : ''}
            ${inquiry.status !== 'closed' ? actionButton('ปิดเรื่อง', `data-action="inquiry-close" data-id="${inquiry.id}"`, 'gray') : ''}
          </div>`,
        ]),
      ),
      'ยังไม่มีคำถามเข้ามา',
    );
    renderPagination(meta);
  },

  answer(inquiry) {
    openDialog({
      title: `ตอบคำถามของ ${inquiry.contact}`,
      html: `<p class="sm:col-span-2 bg-cream border border-gray-200 rounded-lg px-4 py-3 text-sm">${escapeHtml(inquiry.message)}</p>`,
      fields: [{ name: 'answer', label: 'คำตอบที่บันทึกไว้', type: 'textarea', rows: 5, wide: true, required: true }],
      values: inquiry,
      onSubmit: (values) =>
        api.updateInquiry(inquiry.id, { answer: values.answer, status: 'answered' }).then(() => toast('บันทึกคำตอบแล้ว')),
    });
  },
};

/* ============================================================
   แท็บ: รีวิว
   ============================================================ */
const reviewsTab = {
  toolbar: () => `
    <select id="filter-status" class="${inputClass}">
      <option value="">ทุกรีวิว</option>
      <option value="false">รออนุมัติ</option>
      <option value="true">เผยแพร่แล้ว</option>
    </select>`,

  async render() {
    const { data, meta } = await api.adminReviews({ page: state.page, limit: 20, is_published: $('filter-status').value });
    state.rows = data;

    setTable(
      ['ผู้รีวิว', 'คะแนน', 'ข้อความ', 'แหล่ง', 'เผยแพร่'],
      data.map((review) =>
        row([
          `<span class="font-semibold whitespace-nowrap">${escapeHtml(review.author_name)}</span>`,
          `<span class="text-[#F2B33D] whitespace-nowrap">${'★'.repeat(review.rating)}</span>`,
          `<div class="max-w-md">${escapeHtml(review.comment)}</div>`,
          `<span class="text-xs">${escapeHtml(review.source)}</span>`,
          actionButton(
            review.is_published ? 'ซ่อน' : 'อนุมัติ',
            `data-action="review-publish" data-id="${review.id}" data-value="${review.is_published ? 'false' : 'true'}"`,
            review.is_published ? 'gray' : 'forest',
          ),
        ]),
      ),
      'ยังไม่มีรีวิว',
    );
    renderPagination(meta);
  },
};

/* ============================================================
   แท็บ: ลูกค้า
   ============================================================ */
const usersTab = {
  toolbar: () => `
    <select id="filter-status" class="${inputClass}">
      <option value="">ทุกบัญชี</option>
      <option value="true">ใช้งานอยู่</option>
      <option value="false">ถูกระงับ</option>
    </select>
    <input id="filter-search" type="search" placeholder="ค้นหาชื่อ / อีเมล / เบอร์โทร" class="${inputClass} flex-1 min-w-[240px]" />`,

  async render() {
    const { data, meta } = await api.adminUsers({
      page: state.page,
      limit: 20,
      is_active: $('filter-status').value,
      q: $('filter-search').value.trim(),
    });
    state.rows = data;

    setTable(
      ['ลูกค้า', 'เบอร์โทร / แอปติดต่อ', 'จำนวนการจอง', 'สมัครเมื่อ', 'เข้าใช้ล่าสุด', 'สถานะ', 'จัดการ'],
      data.map((user) =>
        row([
          `<div class="font-semibold">${escapeHtml(user.first_name)} ${escapeHtml(user.last_name)}</div>
           <div class="text-xs text-gray-500">${escapeHtml(user.email)}</div>`,
          `${user.phone ? escapeHtml(user.phone) : '-'}
           <div class="text-xs text-gray-500">${escapeHtml(user.contact_app)}: ${escapeHtml(user.contact_id ?? '-')}</div>`,
          user.booking_count,
          `<span class="text-xs whitespace-nowrap">${formatDateTime(user.created_at)}</span>`,
          `<span class="text-xs whitespace-nowrap">${user.last_login_at ? formatDateTime(user.last_login_at) : '-'}</span>`,
          pill(
            user.is_active
              ? { label: 'ใช้งานอยู่', className: 'bg-emerald-100 text-emerald-800' }
              : { label: 'ถูกระงับ', className: 'bg-red-100 text-red-700' },
          ),
          `<div class="flex flex-wrap gap-1.5">
            ${actionButton('ดูการจอง', `data-action="user-bookings" data-id="${user.id}"`, 'gray')}
            ${actionButton(user.is_active ? 'ระงับบัญชี' : 'เปิดใช้บัญชี', `data-action="user-toggle" data-id="${user.id}"`, user.is_active ? 'red' : 'forest')}
          </div>`,
        ]),
      ),
      'ยังไม่มีลูกค้าสมัครสมาชิก',
    );
    renderPagination(meta);
  },
};

/* ============================================================
   แท็บ: ทีมงาน (เฉพาะ admin)
   ============================================================ */
const staffTab = {
  toolbar: () => `
    <button type="button" data-action="staff-create" class="bg-forest hover:bg-forest-dark text-white text-sm font-bold px-5 py-2.5 rounded-lg transition">+ เพิ่มทีมงาน</button>
    <p class="text-xs text-gray-500 self-center">ผู้ดูแลระบบทำได้ทุกอย่าง · พนักงานจัดการการจอง/เนื้อหาได้ แต่ลบข้อมูล แก้ค่าตั้งระบบ และจัดการทีมงานไม่ได้</p>`,

  async render() {
    const staff = await api.adminStaff();
    state.rows = staff;

    setTable(
      ['ชื่อ', 'อีเมล', 'สิทธิ์', 'เข้าใช้ล่าสุด', 'สถานะ', 'จัดการ'],
      staff.map((member) =>
        row([
          `<span class="font-semibold">${escapeHtml(member.name)}</span>${member.id === state.user.id ? ' <span class="text-xs text-gray-500">(คุณ)</span>' : ''}`,
          escapeHtml(member.email),
          ROLE_LABELS[member.role] ?? escapeHtml(member.role),
          `<span class="text-xs whitespace-nowrap">${member.last_login_at ? formatDateTime(member.last_login_at) : '-'}</span>`,
          pill(
            member.is_active
              ? { label: 'ใช้งานอยู่', className: 'bg-emerald-100 text-emerald-800' }
              : { label: 'ปิดอยู่', className: 'bg-gray-200 text-gray-600' },
          ),
          actionButton('แก้ไข', `data-action="staff-edit" data-id="${member.id}"`),
        ]),
      ),
      'ยังไม่มีทีมงาน',
    );
    renderPagination(null);
  },

  create() {
    openDialog({
      title: 'เพิ่มทีมงาน',
      fields: [
        { name: 'name', label: 'ชื่อ', required: true, maxlength: 120 },
        { name: 'email', label: 'อีเมล', type: 'email', required: true, maxlength: 160, autocomplete: 'off' },
        { name: 'role', label: 'สิทธิ์', type: 'select', options: Object.entries(ROLE_LABELS).reverse() },
        { name: 'password', label: 'รหัสผ่านเริ่มต้น', type: 'password', required: true, autocomplete: 'new-password', help: 'อย่างน้อย 8 ตัว มีทั้งตัวอักษรและตัวเลข' },
      ],
      values: { role: 'staff' },
      onSubmit: (values) => api.createStaff(values).then(() => toast('เพิ่มทีมงานแล้ว')),
    });
  },

  edit(member) {
    openDialog({
      title: `แก้ไขทีมงาน: ${member.name}`,
      fields: [
        { name: 'name', label: 'ชื่อ', required: true, maxlength: 120 },
        { name: 'email', label: 'อีเมล', readonly: true },
        { name: 'role', label: 'สิทธิ์', type: 'select', options: Object.entries(ROLE_LABELS).reverse() },
        { name: 'password', label: 'ตั้งรหัสผ่านใหม่', type: 'password', autocomplete: 'new-password', help: 'เว้นว่างถ้าไม่ต้องการเปลี่ยน' },
        { name: 'is_active', label: 'สถานะ', type: 'checkbox', checkboxLabel: 'เปิดใช้งานบัญชีนี้', wide: true },
      ],
      values: member,
      onSubmit: (values) => api.updateStaff(member.id, values).then(() => toast('บันทึกข้อมูลทีมงานแล้ว')),
    });
  },
};

/* ============================================================
   แท็บ: การแจ้งเตือน (บันทึกอีเมลที่ระบบส่ง)
   ============================================================ */
const notificationsTab = {
  toolbar: () => `
    <select id="filter-status" class="${inputClass}">
      <option value="">ทุกสถานะ</option>
      ${Object.entries(MAIL_STATUS).map(([value, info]) => `<option value="${value}">${info.label}</option>`).join('')}
    </select>`,

  async render() {
    const { data, meta } = await api.adminNotifications({ page: state.page, limit: 20, status: $('filter-status').value });
    state.rows = data;

    setTable(
      ['เวลา', 'ถึง', 'ประเภท', 'หัวข้อ', 'สถานะ'],
      data.map((item) =>
        row([
          `<span class="text-xs whitespace-nowrap">${formatDateTime(item.created_at)}</span>`,
          escapeHtml(item.recipient),
          `<span class="text-xs font-mono">${escapeHtml(item.type)}</span>`,
          `<details class="max-w-md"><summary class="cursor-pointer font-semibold">${escapeHtml(item.subject)}</summary>
             <p class="text-xs text-gray-600 mt-2 whitespace-pre-line break-words">${escapeHtml(item.body)}</p></details>`,
          `${pill(MAIL_STATUS[item.status] ?? { label: escapeHtml(item.status), className: 'bg-gray-200 text-gray-600' })}
           ${item.error ? `<p class="text-xs text-red-600 mt-1">${escapeHtml(item.error)}</p>` : ''}`,
        ]),
      ),
      'ยังไม่มีการแจ้งเตือน',
    );
    renderPagination(meta);
  },
};

/* ============================================================
   แท็บ: รายงาน
   ============================================================ */
let lastReport = null;

const reportsTab = {
  panel: true,

  toolbar: () => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 29);
    return `
    <label class="text-xs text-gray-500 font-semibold flex flex-col gap-1">ทำรายการตั้งแต่
      <input id="report-from" type="date" value="${localDateString(from)}" class="${inputClass}" />
    </label>
    <label class="text-xs text-gray-500 font-semibold flex flex-col gap-1">ถึง
      <input id="report-to" type="date" value="${localDateString(to)}" class="${inputClass}" />
    </label>
    <button type="button" data-action="report-export" class="border border-gray-300 bg-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-gray-50 transition">ดาวน์โหลด CSV</button>`;
  },

  async render() {
    const report = await api.report({ from: $('report-from').value, to: $('report-to').value });
    lastReport = report;

    const { totals } = report;
    const peak = Math.max(1, ...report.daily.map((day) => day.bookings));
    const card = (label, value, className = 'text-forest') =>
      `<div class="bg-white rounded-xl border border-gray-200 p-5">
        <p class="text-xs text-gray-500 font-semibold">${label}</p>
        <p class="text-2xl font-extrabold ${className} mt-1">${value}</p>
      </div>`;

    $('panel-view').innerHTML = `
    <div class="flex flex-col gap-6">
      <div class="grid grid-cols-2 lg:grid-cols-5 gap-4">
        ${card('การจองในช่วงนี้', totals.bookings.toLocaleString('th-TH'))}
        ${card('ผู้เข้าร่วม (ไม่รวมที่ยกเลิก)', totals.guests.toLocaleString('th-TH'), 'text-sky-700')}
        ${card('รายได้ (ยืนยันแล้ว)', formatTHB(totals.revenue), 'text-gold')}
        ${card('ชำระเงินแล้ว', formatTHB(totals.paid), 'text-emerald-700')}
        ${card('ยกเลิก', totals.cancelled.toLocaleString('th-TH'), 'text-gray-500')}
      </div>

      <div class="bg-white rounded-xl border border-gray-200 p-5">
        <h3 class="font-extrabold mb-4">จำนวนการจองต่อวัน</h3>
        <div class="flex items-end gap-1 h-48 overflow-x-auto" role="img" aria-label="กราฟแท่งจำนวนการจองต่อวัน">
          ${report.daily
            .map(
              (day) => `
            <div class="flex-1 min-w-[10px] h-full flex flex-col justify-end items-center gap-1" title="${day.date}: ${day.bookings} การจอง · ${formatTHB(day.revenue)}">
              <span class="text-[10px] text-gray-500">${day.bookings || ''}</span>
              <div class="w-full rounded-t ${day.bookings ? 'bg-forest' : 'bg-gray-200'}" style="height:${day.bookings ? Math.max(4, (day.bookings / peak) * 85) : 1}%"></div>
            </div>`,
            )
            .join('')}
        </div>
        <div class="flex justify-between text-xs text-gray-500 mt-2">
          <span>${escapeHtml(report.from)}</span><span>${escapeHtml(report.to)}</span>
        </div>
      </div>

      <div class="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <h3 class="font-extrabold px-5 pt-5">สรุปตามกิจกรรม</h3>
        <table class="w-full text-sm mt-3">
          <thead>
            <tr class="text-left text-xs uppercase tracking-wide text-gray-500 border-b">
              <th class="py-3 px-5">กิจกรรม</th><th class="py-3 px-3">การจอง</th><th class="py-3 px-3">ยกเลิก</th>
              <th class="py-3 px-3">ผู้เข้าร่วม</th><th class="py-3 px-3">รายได้</th><th class="py-3 px-3">ชำระแล้ว</th>
            </tr>
          </thead>
          <tbody>
            ${
              report.by_activity.length
                ? report.by_activity
                    .map(
                      (item) => `
              <tr class="border-b last:border-0">
                <td class="py-3 px-5 font-semibold">${escapeHtml(item.name_th)}</td>
                <td class="py-3 px-3">${item.bookings}</td>
                <td class="py-3 px-3">${item.cancelled}</td>
                <td class="py-3 px-3">${item.guests}</td>
                <td class="py-3 px-3 font-bold">${formatTHB(item.revenue)}</td>
                <td class="py-3 px-3">${formatTHB(item.paid)}</td>
              </tr>`,
                    )
                    .join('')
                : '<tr><td colspan="6" class="text-center py-10 text-gray-400">ไม่มีการจองในช่วงที่เลือก</td></tr>'
            }
          </tbody>
        </table>
      </div>
    </div>`;
  },

  exportCsv() {
    if (!lastReport) return;
    const lines = [
      ['date', 'bookings', 'cancelled', 'guests', 'revenue_thb', 'paid_thb'],
      ...lastReport.daily.map((day) => [day.date, day.bookings, day.cancelled, day.guests, day.revenue, day.paid]),
    ];
    // ใส่ BOM ให้ Excel เปิดเป็น UTF-8 ได้ถูก
    const blob = new Blob([`﻿${lines.map((line) => line.join(',')).join('\n')}`], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `chokchai-report-${lastReport.from}-to-${lastReport.to}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  },
};

/* ============================================================
   แท็บ: ตั้งค่าระบบ
   ============================================================ */
const SETTING_FIELDS = [
  ['ข้อมูลที่แสดงบนหน้าเว็บ', [
    { name: 'opening_hours', label: 'เวลาทำการ', maxlength: 120 },
    { name: 'contact_phone', label: 'เบอร์โทรติดต่อ', maxlength: 40 },
    { name: 'contact_line', label: 'Line', maxlength: 80 },
    { name: 'contact_email', label: 'อีเมลติดต่อ', maxlength: 160 },
    { name: 'site_notice', label: 'แถบประกาศด้านบนเว็บ (เว้นว่าง = ไม่แสดง)', maxlength: 300, wide: true },
  ]],
  ['กติกาการจอง', [
    { name: 'booking_min_lead_days', label: 'ต้องจองล่วงหน้าอย่างน้อย (วัน)', type: 'number', min: 0, max: 60 },
    { name: 'booking_max_advance_days', label: 'จองล่วงหน้าได้ไกลสุด (วัน)', type: 'number', min: 1, max: 730 },
    { name: 'booking_max_guests', label: 'จำนวนคนสูงสุดต่อ 1 การจอง', type: 'number', min: 1, max: 100 },
    { name: 'cancel_free_hours', label: 'ลูกค้ายกเลิกเองได้ก่อนวันกิจกรรม (ชั่วโมง)', type: 'number', min: 0, max: 720 },
  ]],
  ['เวลารับ-ส่ง (แสดงในฟอร์มจอง)', [
    { name: 'pickup_time_morning', label: 'เวลารับรอบเช้า', maxlength: 60 },
    { name: 'pickup_time_afternoon', label: 'เวลารับรอบกลางวัน', maxlength: 60 },
  ]],
  ['การชำระเงิน', [
    {
      name: 'payment_provider',
      label: 'วิธีชำระเงินออนไลน์',
      wide: true,
      options: [
        ['promptpay', 'PromptPay QR — ลูกค้าสแกนจ่ายเข้าบัญชีร้านจริง แล้วทีมงานตรวจยอดและยืนยัน'],
        ['stripe', 'Stripe — บัตรเครดิต/เดบิต (ต้องใส่คีย์ในไฟล์ .env ก่อน)'],
        ['mock', 'ชำระจำลอง — สำหรับทดสอบ/เดโมเท่านั้น ไม่มีการรับเงินจริง'],
        ['none', 'ปิดชำระออนไลน์ — ทีมงานติดต่อกลับแล้วบันทึกรับเงินเอง'],
      ],
    },
    { name: 'promptpay_id', label: 'หมายเลขพร้อมเพย์ของร้าน (เบอร์มือถือ 10 หลัก หรือเลข 13 หลัก)', maxlength: 30 },
    { name: 'promptpay_name', label: 'ชื่อบัญชีพร้อมเพย์ (ตามที่ลูกค้าจะเห็นในแอปธนาคาร)', maxlength: 120 },
  ]],
  ['การแจ้งเตือนทีมงาน', [
    { name: 'admin_notify_email', label: 'อีเมลรับแจ้งเตือนเมื่อมีการจองใหม่ / ลูกค้ายกเลิก (เว้นว่าง = ไม่ส่ง)', type: 'email', maxlength: 160, wide: true },
  ]],
];

const settingsTab = {
  panel: true,
  toolbar: () => '',

  async render() {
    const settings = await api.adminSettings();
    const disabled = isAdmin() ? '' : 'disabled';

    $('panel-view').innerHTML = `
    <form id="settings-form" class="bg-white rounded-xl border border-gray-200 p-6 flex flex-col gap-6" novalidate>
      ${isAdmin() ? '' : '<p class="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg px-4 py-3">บัญชีพนักงานดูค่าตั้งระบบได้ แต่แก้ไขได้เฉพาะผู้ดูแลระบบ</p>'}
      ${SETTING_FIELDS.map(
        ([heading, fields]) => `
        <fieldset class="flex flex-col gap-4">
          <legend class="font-extrabold text-forest mb-3">${heading}</legend>
          <div class="grid sm:grid-cols-2 gap-4">
            ${fields
              .map(
                (field) => `
              <div class="${field.wide ? 'sm:col-span-2' : ''}">
                <label for="setting-${field.name}" class="text-sm font-semibold block mb-1.5">${field.label}</label>
                ${
                  field.options
                    ? `<select id="setting-${field.name}" name="${field.name}" ${disabled}
                         class="w-full border border-gray-300 rounded-lg px-4 py-2.5 bg-cream text-sm disabled:bg-gray-100 disabled:text-gray-500">
                         ${field.options.map(([value, label]) => `<option value="${value}" ${settings[field.name] === value ? 'selected' : ''}>${escapeHtml(label)}</option>`).join('')}
                       </select>`
                    : `<input id="setting-${field.name}" name="${field.name}" type="${field.type ?? 'text'}" ${disabled}
                  ${field.min !== undefined ? `min="${field.min}"` : ''} ${field.max !== undefined ? `max="${field.max}"` : ''}
                  ${field.maxlength ? `maxlength="${field.maxlength}"` : ''}
                  value="${escapeHtml(settings[field.name])}"
                  class="w-full border border-gray-300 rounded-lg px-4 py-2.5 bg-cream text-sm disabled:bg-gray-100 disabled:text-gray-500" />`
                }
              </div>`,
              )
              .join('')}
          </div>
        </fieldset>`,
      ).join('')}
      <p id="settings-message" class="hidden text-sm font-semibold" role="status"></p>
      ${isAdmin() ? '<button type="submit" class="bg-forest hover:bg-forest-dark text-white font-bold px-7 py-3 rounded-lg transition w-fit disabled:opacity-60">บันทึกค่าตั้งระบบ</button>' : ''}
    </form>`;

    $('settings-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = event.target;
      const message = $('settings-message');
      const button = form.querySelector('button[type="submit"]');

      const payload = {};
      for (const [, fields] of SETTING_FIELDS) {
        for (const field of fields) {
          const { value } = form.elements[field.name];
          payload[field.name] = field.type === 'number' ? Number(value) : value.trim();
        }
      }

      button.disabled = true;
      try {
        await api.saveSettings(payload);
        message.textContent = 'บันทึกค่าตั้งระบบแล้ว มีผลกับหน้าเว็บทันที';
        message.className = 'text-sm font-semibold text-forest';
        toast('บันทึกค่าตั้งระบบแล้ว');
      } catch (error) {
        if (handleError(error)) return;
        message.textContent = error.fullMessage ?? error.message;
        message.className = 'text-sm font-semibold text-red-600';
      } finally {
        button.disabled = false;
      }
    });
  },
};

/* ============================================================
   สลับแท็บ / โหลดข้อมูล
   ============================================================ */
const TABS = {
  bookings: bookingsTab,
  activities: activitiesTab,
  inquiries: inquiriesTab,
  reviews: reviewsTab,
  users: usersTab,
  staff: staffTab,
  reports: reportsTab,
  notifications: notificationsTab,
  settings: settingsTab,
};

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

async function selectTab(tab, presets = {}) {
  state.tab = tab;
  state.page = 1;
  state.rows = [];

  for (const button of document.querySelectorAll('[data-tab]')) {
    const active = button.dataset.tab === tab;
    button.classList.toggle('bg-forest', active);
    button.classList.toggle('text-white', active);
    button.classList.toggle('bg-white', !active);
    button.classList.toggle('text-gray-600', !active);
  }

  const config = TABS[tab];
  $('toolbar').innerHTML = config.toolbar();
  $('toolbar').classList.toggle('hidden', !$('toolbar').innerHTML.trim());
  $('table-view').classList.toggle('hidden', Boolean(config.panel));
  $('panel-view').classList.toggle('hidden', !config.panel);

  // ค่าตัวกรองที่ส่งมาจากแท็บอื่น เช่น กด "ดูการจอง" ของลูกค้า
  for (const [id, value] of Object.entries(presets)) {
    if ($(id)) $(id).value = value;
  }

  await loadTab();
}

async function loadTab() {
  const config = TABS[state.tab];
  const loading = '<p class="text-center py-10 text-gray-400">กำลังโหลด...</p>';
  if (config.panel) $('panel-view').innerHTML = loading;
  else $('table-body').innerHTML = `<tr><td colspan="8">${loading}</td></tr>`;

  try {
    await config.render();
  } catch (error) {
    if (handleError(error)) return;
    const message = `<p class="text-center py-10 text-red-600">${escapeHtml(error.fullMessage ?? error.message)}</p>`;
    if (config.panel) $('panel-view').innerHTML = message;
    else $('table-body').innerHTML = `<tr><td colspan="8">${message}</td></tr>`;
  }
}

function initTabs() {
  for (const button of document.querySelectorAll('[data-tab]')) {
    button.addEventListener('click', () => selectTab(button.dataset.tab));
  }

  const reload = () => {
    state.page = 1;
    loadTab();
  };
  // ตัวกรองถูกสร้างใหม่ทุกครั้งที่สลับแท็บ จึงดักที่กล่อง toolbar แทน
  $('toolbar').addEventListener('change', (event) => {
    if (event.target.matches('select, input[type="date"]')) reload();
  });
  $('toolbar').addEventListener('input', debounce((event) => {
    if (event.target.matches('input[type="search"]')) reload();
  }, 400));

  $('page-prev').addEventListener('click', () => {
    if (state.page > 1) {
      state.page -= 1;
      loadTab();
    }
  });
  $('page-next').addEventListener('click', () => {
    state.page += 1;
    loadTab();
  });
}

/* ============================================================
   การกระทำจากปุ่ม (ใช้ event delegation เพราะแถวถูกสร้างใหม่ตลอด)
   ============================================================ */
const findRow = (id) => state.rows.find((item) => String(item.id) === String(id));

/** คืน true ถ้าทำรายการสำเร็จและต้องโหลดข้อมูลใหม่ */
async function runAction(action, id, value) {
  const item = findRow(id);

  switch (action) {
    case 'booking-status':
      if (value === 'cancelled' && !confirm('ยืนยันยกเลิกการจองนี้? ระบบจะส่งอีเมลแจ้งลูกค้า')) return false;
      await api.updateBooking(id, { status: value });
      toast(`เปลี่ยนสถานะเป็น "${BOOKING_STATUS[value].label}" แล้ว`);
      return true;
    case 'booking-payment':
      if (value === 'refunded' && !confirm('ยืนยันว่าคืนเงินให้ลูกค้าเรียบร้อยแล้ว?')) return false;
      if (value === 'paid' && item.payment_status === 'reviewing' && !confirm(`ตรวจแล้วว่ามียอด ${formatTHB(item.total_amount)} เข้าบัญชีจริง?`)) return false;
      // รับเงินแล้วถือว่ายืนยันการจองไปด้วย ไม่ต้องกดสองครั้ง
      await api.updateBooking(id, {
        payment_status: value,
        ...(value === 'paid' && item.status === 'pending' ? { status: 'confirmed' } : {}),
      });
      toast(value === 'paid' ? 'บันทึกการรับเงินและยืนยันการจองแล้ว' : 'บันทึกการคืนเงินแล้ว');
      return true;
    case 'booking-detail':
      bookingsTab.detail(item);
      return false;
    case 'booking-slip':
      await bookingsTab.slip(item);
      return false;

    case 'activity-create':
      activitiesTab.create();
      return false;
    case 'activity-edit':
      activitiesTab.edit(item);
      return false;
    case 'activity-toggle':
      await api.updateActivity(id, { is_active: !item.is_active });
      toast(item.is_active ? 'ปิดรับจองกิจกรรมนี้แล้ว' : 'เปิดรับจองกิจกรรมนี้แล้ว');
      return true;
    case 'activity-delete':
      if (!confirm(`ลบกิจกรรม "${item.name_th}" ถาวร?`)) return false;
      await api.deleteActivity(id);
      toast('ลบกิจกรรมแล้ว');
      return true;

    case 'inquiry-answer':
      inquiriesTab.answer(item);
      return false;
    case 'inquiry-close':
      await api.updateInquiry(id, { status: 'closed' });
      toast('ปิดเรื่องแล้ว');
      return true;

    case 'review-publish':
      await api.updateReview(id, { is_published: value === 'true' });
      toast('อัปเดตรีวิวแล้ว');
      return true;

    case 'user-toggle':
      if (item.is_active && !confirm(`ระงับบัญชีของ ${item.email}? ลูกค้าจะเข้าสู่ระบบไม่ได้`)) return false;
      await api.setUserActive(id, !item.is_active);
      toast(item.is_active ? 'ระงับบัญชีแล้ว' : 'เปิดใช้บัญชีแล้ว');
      return true;
    case 'user-bookings':
      await selectTab('bookings', { 'filter-search': item.email });
      return false;

    case 'staff-create':
      staffTab.create();
      return false;
    case 'staff-edit':
      staffTab.edit(item);
      return false;

    case 'report-export':
      reportsTab.exportCsv();
      return false;
    case 'booking-export':
      await bookingsTab.exportExcel();
      return false;

    default:
      return false;
  }
}

function initActions() {
  $('dashboard-view').addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    button.disabled = true;

    try {
      const changed = await runAction(button.dataset.action, button.dataset.id, button.dataset.value);
      if (changed) await Promise.all([loadStats(), loadTab()]);
    } catch (error) {
      if (!handleError(error)) alert(error.fullMessage ?? error.message);
    } finally {
      button.disabled = false;
    }
  });

  // ช่วงวันที่ของรายงานอยู่ใน toolbar เหมือนกัน แต่ต้องตรวจก่อนว่า from ไม่เกิน to
  $('toolbar').addEventListener('change', (event) => {
    if (!event.target.matches('#report-from, #report-to')) return;
    if ($('report-from').value && $('report-to').value && $('report-from').value > $('report-to').value) {
      event.stopImmediatePropagation();
      alert('วันที่เริ่มต้นต้องไม่เกินวันที่สิ้นสุด');
    }
  }, true);
}

function toast(message) {
  const box = $('toast');
  box.textContent = message;
  box.classList.remove('hidden');
  setTimeout(() => box.classList.add('hidden'), 3000);
}

/* ============================================================
   เริ่มทำงาน
   ============================================================ */
document.addEventListener('DOMContentLoaded', async () => {
  initLogin();
  initDialog();
  initActions();
  initTabs();

  // มี token ค้างอยู่ก็ลองใช้เลย ถ้าหมดอายุค่อยกลับไปหน้า login
  if (!auth.token) {
    showLogin();
    return;
  }

  try {
    await showDashboard(await api.me());
  } catch {
    api.logout();
    showLogin();
  }
});
