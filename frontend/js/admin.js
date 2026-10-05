import { api, auth, formatTHB } from './api.js';

const $ = (id) => document.getElementById(id);

const escapeHtml = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char],
  );

const BOOKING_STATUS = {
  pending: { label: 'รอยืนยัน', className: 'bg-amber-100 text-amber-800' },
  confirmed: { label: 'ยืนยันแล้ว', className: 'bg-emerald-100 text-emerald-800' },
  completed: { label: 'เสร็จสิ้น', className: 'bg-sky-100 text-sky-800' },
  cancelled: { label: 'ยกเลิก', className: 'bg-gray-200 text-gray-600' },
};

const PAYMENT_STATUS = {
  unpaid: 'ยังไม่ชำระ',
  paid: 'ชำระแล้ว',
  refunded: 'คืนเงินแล้ว',
};

// สถานะถัดไปที่เปลี่ยนได้ ต้องตรงกับ ALLOWED_TRANSITIONS ฝั่ง backend
const NEXT_STATUSES = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

const state = { tab: 'bookings', page: 1, filters: {} };

/* ============================================================
   เข้าสู่ระบบ
   ============================================================ */
function showLogin(message = '') {
  $('login-view').classList.remove('hidden');
  $('dashboard-view').classList.add('hidden');
  if (message) setLoginError(message);
}

function setLoginError(message) {
  const box = $('login-error');
  box.textContent = message;
  box.classList.toggle('hidden', !message);
}

async function showDashboard(user) {
  $('login-view').classList.add('hidden');
  $('dashboard-view').classList.remove('hidden');
  $('current-user').textContent = `${user.name} (${user.email})`;
  await Promise.all([loadStats(), loadTab()]);
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
  } catch (error) {
    console.error('โหลดสถิติไม่สำเร็จ', error);
  }
}

/* ============================================================
   แท็บ
   ============================================================ */
function initTabs() {
  for (const button of document.querySelectorAll('[data-tab]')) {
    button.addEventListener('click', () => {
      state.tab = button.dataset.tab;
      state.page = 1;
      for (const other of document.querySelectorAll('[data-tab]')) {
        const active = other.dataset.tab === state.tab;
        other.classList.toggle('bg-forest', active);
        other.classList.toggle('text-white', active);
        other.classList.toggle('text-gray-600', !active);
      }
      $('filter-bar').classList.toggle('hidden', state.tab !== 'bookings');
      loadTab();
    });
  }

  $('filter-status').addEventListener('change', () => {
    state.page = 1;
    loadTab();
  });

  $('filter-search').addEventListener('input', debounce(() => {
    state.page = 1;
    loadTab();
  }, 400));
}

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

async function loadTab() {
  const body = $('table-body');
  body.innerHTML = `<tr><td colspan="8" class="text-center py-10 text-gray-400">กำลังโหลด...</td></tr>`;

  try {
    if (state.tab === 'bookings') await renderBookings();
    if (state.tab === 'inquiries') await renderInquiries();
    if (state.tab === 'reviews') await renderReviews();
  } catch (error) {
    if (error.status === 401) {
      api.logout();
      showLogin('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');
      return;
    }
    body.innerHTML = `<tr><td colspan="8" class="text-center py-10 text-red-600">${escapeHtml(error.message)}</td></tr>`;
  }
}

function renderPagination(meta) {
  $('pagination-info').textContent =
    meta.total === 0 ? 'ไม่พบข้อมูล' : `หน้า ${meta.page} จาก ${meta.total_pages} · ทั้งหมด ${meta.total} รายการ`;
  $('page-prev').disabled = meta.page <= 1;
  $('page-next').disabled = meta.page >= meta.total_pages;
}

/* ============================================================
   ตารางการจอง
   ============================================================ */
async function renderBookings() {
  const { data, meta } = await api.adminBookings({
    page: state.page,
    limit: 20,
    status: $('filter-status').value || undefined,
    q: $('filter-search').value.trim() || undefined,
  });

  $('table-head').innerHTML = `
    <tr class="text-left text-xs uppercase tracking-wide text-gray-500 border-b">
      <th class="py-3 px-3">รหัส</th>
      <th class="py-3 px-3">กิจกรรม</th>
      <th class="py-3 px-3">วันที่</th>
      <th class="py-3 px-3">ผู้จอง</th>
      <th class="py-3 px-3">คน</th>
      <th class="py-3 px-3">ยอด</th>
      <th class="py-3 px-3">สถานะ</th>
      <th class="py-3 px-3">จัดการ</th>
    </tr>`;

  if (data.length === 0) {
    $('table-body').innerHTML = `<tr><td colspan="8" class="text-center py-10 text-gray-400">ไม่พบการจอง</td></tr>`;
    renderPagination(meta);
    return;
  }

  $('table-body').innerHTML = data
    .map((booking) => {
      const badge = BOOKING_STATUS[booking.status];
      const actions = NEXT_STATUSES[booking.status]
        .map(
          (next) =>
            `<button data-booking-id="${booking.id}" data-next-status="${next}"
               class="text-xs font-semibold px-2.5 py-1.5 rounded border border-forest text-forest hover:bg-forest hover:text-white transition">
               ${BOOKING_STATUS[next].label}
             </button>`,
        )
        .join(' ');

      const paymentToggle =
        booking.payment_status === 'unpaid' && booking.status !== 'cancelled'
          ? `<button data-booking-id="${booking.id}" data-payment="paid"
               class="text-xs font-semibold px-2.5 py-1.5 rounded border border-gold text-gold hover:bg-gold hover:text-white transition">
               บันทึกรับเงิน
             </button>`
          : '';

      return `
      <tr class="border-b last:border-0 hover:bg-cream/60">
        <td class="py-3 px-3 font-mono font-bold text-forest">${escapeHtml(booking.booking_ref)}</td>
        <td class="py-3 px-3">${escapeHtml(booking.activity?.name_th ?? '-')}</td>
        <td class="py-3 px-3 whitespace-nowrap">${escapeHtml(booking.booking_date)}</td>
        <td class="py-3 px-3">
          <div class="font-semibold">${escapeHtml(booking.first_name)} ${escapeHtml(booking.last_name)}</div>
          <div class="text-xs text-gray-500">${escapeHtml(booking.email)} · ${escapeHtml(booking.phone)}</div>
        </td>
        <td class="py-3 px-3 whitespace-nowrap text-xs">${booking.adults}ญ ${booking.children}ด ${booking.infants}ท</td>
        <td class="py-3 px-3 whitespace-nowrap">
          <div class="font-bold">${formatTHB(booking.total_amount)}</div>
          <div class="text-xs text-gray-500">${PAYMENT_STATUS[booking.payment_status]}</div>
        </td>
        <td class="py-3 px-3">
          <span class="${badge.className} text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap">${badge.label}</span>
        </td>
        <td class="py-3 px-3"><div class="flex flex-wrap gap-1.5">${actions} ${paymentToggle}</div></td>
      </tr>`;
    })
    .join('');

  renderPagination(meta);
}

/* ============================================================
   ตารางคำถาม
   ============================================================ */
async function renderInquiries() {
  const { data, meta } = await api.adminInquiries({ page: state.page, limit: 20 });

  $('table-head').innerHTML = `
    <tr class="text-left text-xs uppercase tracking-wide text-gray-500 border-b">
      <th class="py-3 px-3">ติดต่อ</th>
      <th class="py-3 px-3">คำถาม</th>
      <th class="py-3 px-3">ส่งเมื่อ</th>
      <th class="py-3 px-3">สถานะ</th>
      <th class="py-3 px-3">จัดการ</th>
    </tr>`;

  if (data.length === 0) {
    $('table-body').innerHTML = `<tr><td colspan="5" class="text-center py-10 text-gray-400">ยังไม่มีคำถามเข้ามา</td></tr>`;
    renderPagination(meta);
    return;
  }

  $('table-body').innerHTML = data
    .map(
      (inquiry) => `
      <tr class="border-b last:border-0 align-top hover:bg-cream/60">
        <td class="py-3 px-3 font-semibold whitespace-nowrap">${escapeHtml(inquiry.contact)}</td>
        <td class="py-3 px-3 max-w-md">
          <p>${escapeHtml(inquiry.message)}</p>
          ${inquiry.answer ? `<p class="text-xs text-forest mt-2">ตอบแล้ว: ${escapeHtml(inquiry.answer)}</p>` : ''}
        </td>
        <td class="py-3 px-3 text-xs text-gray-500 whitespace-nowrap">${new Date(inquiry.created_at).toLocaleString('th-TH')}</td>
        <td class="py-3 px-3 text-xs">${escapeHtml(inquiry.status)}</td>
        <td class="py-3 px-3">
          ${
            inquiry.status === 'new'
              ? `<button data-inquiry-id="${inquiry.id}"
                   class="text-xs font-semibold px-2.5 py-1.5 rounded border border-forest text-forest hover:bg-forest hover:text-white transition">
                   ตอบกลับ
                 </button>`
              : '<span class="text-xs text-gray-400">—</span>'
          }
        </td>
      </tr>`,
    )
    .join('');

  renderPagination(meta);
}

/* ============================================================
   ตารางรีวิว
   ============================================================ */
async function renderReviews() {
  const { data, meta } = await api.adminReviews({ page: state.page, limit: 20 });

  $('table-head').innerHTML = `
    <tr class="text-left text-xs uppercase tracking-wide text-gray-500 border-b">
      <th class="py-3 px-3">ผู้รีวิว</th>
      <th class="py-3 px-3">คะแนน</th>
      <th class="py-3 px-3">ข้อความ</th>
      <th class="py-3 px-3">แหล่ง</th>
      <th class="py-3 px-3">เผยแพร่</th>
    </tr>`;

  if (data.length === 0) {
    $('table-body').innerHTML = `<tr><td colspan="5" class="text-center py-10 text-gray-400">ยังไม่มีรีวิว</td></tr>`;
    renderPagination(meta);
    return;
  }

  $('table-body').innerHTML = data
    .map(
      (review) => `
      <tr class="border-b last:border-0 align-top hover:bg-cream/60">
        <td class="py-3 px-3 font-semibold whitespace-nowrap">${escapeHtml(review.author_name)}</td>
        <td class="py-3 px-3 text-[#F2B33D] whitespace-nowrap">${'★'.repeat(review.rating)}</td>
        <td class="py-3 px-3 max-w-md">${escapeHtml(review.comment)}</td>
        <td class="py-3 px-3 text-xs">${escapeHtml(review.source)}</td>
        <td class="py-3 px-3">
          <button data-review-id="${review.id}" data-publish="${review.is_published ? 'false' : 'true'}"
            class="text-xs font-semibold px-2.5 py-1.5 rounded border transition ${
              review.is_published
                ? 'border-gray-300 text-gray-600 hover:bg-gray-100'
                : 'border-forest text-forest hover:bg-forest hover:text-white'
            }">
            ${review.is_published ? 'ซ่อน' : 'อนุมัติ'}
          </button>
        </td>
      </tr>`,
    )
    .join('');

  renderPagination(meta);
}

/* ============================================================
   การกระทำในตาราง (ใช้ event delegation เพราะแถวถูกสร้างใหม่ตลอด)
   ============================================================ */
function initTableActions() {
  $('table-body').addEventListener('click', async (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    button.disabled = true;

    try {
      if (button.dataset.nextStatus) {
        const label = BOOKING_STATUS[button.dataset.nextStatus].label;
        if (button.dataset.nextStatus === 'cancelled' && !confirm('ยืนยันยกเลิกการจองนี้?')) return;
        await api.updateBooking(button.dataset.bookingId, { status: button.dataset.nextStatus });
        toast(`เปลี่ยนสถานะเป็น "${label}" แล้ว`);
      } else if (button.dataset.payment) {
        await api.updateBooking(button.dataset.bookingId, { payment_status: 'paid' });
        toast('บันทึกการรับเงินแล้ว');
      } else if (button.dataset.reviewId) {
        await api.updateReview(button.dataset.reviewId, {
          is_published: button.dataset.publish === 'true',
        });
        toast('อัปเดตรีวิวแล้ว');
      } else if (button.dataset.inquiryId) {
        const answer = prompt('พิมพ์คำตอบที่จะบันทึกไว้:');
        if (!answer) return;
        await api.updateInquiry(button.dataset.inquiryId, { answer, status: 'answered' });
        toast('บันทึกคำตอบแล้ว');
      } else {
        return;
      }

      await Promise.all([loadStats(), loadTab()]);
    } catch (error) {
      alert(error.message);
    } finally {
      button.disabled = false;
    }
  });

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
  initTabs();
  initTableActions();

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
