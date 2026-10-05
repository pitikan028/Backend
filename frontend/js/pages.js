/**
 * logic ของหน้าย่อย: register, login, account, booking (ตรวจสอบการจอง), payment, activity
 * เลือกทำงานตาม <body data-page="...">
 */
import { api, currentUser, formatTHB } from './api.js';
import {
  activityMedia,
  bindContactApp,
  bookingCard,
  contactIdLabel,
  categoryLabel,
  escapeHtml,
  formatDate,
  formatDateTime,
  imageFileToDataUrl,
  initSite,
  loadSettings,
  localDateString,
  nextPage,
  renderAuthNav,
  requireLogin,
  setMessage,
  withBusy,
} from './common.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(window.location.search);

const errorText = (error) => error.fullMessage ?? error.message;

/** ลิงก์สลับระหว่างหน้า login/register ต้องพก ?next= ไปด้วย จะได้กลับไปหน้าที่ตั้งใจไว้ */
function keepNextOnLinks() {
  const next = params.get('next');
  if (!next) return;
  for (const link of document.querySelectorAll('a[data-keep-next]')) {
    link.href = `${link.getAttribute('href')}?next=${encodeURIComponent(next)}`;
  }
}

/* ============================================================
   สมัครสมาชิก
   ============================================================ */
function initRegister() {
  if (currentUser.get()) {
    window.location.replace(nextPage());
    return;
  }
  keepNextOnLinks();

  const form = $('register-form');
  const message = $('form-message');
  bindContactApp(form.elements.contact_app, form.elements.contact_id, $('reg-contact-id-label'));

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const field = (name) => form.elements[name].value.trim();

    if (!field('first_name') || !field('last_name')) return setMessage(message, 'กรุณากรอกชื่อและนามสกุล');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field('email'))) return setMessage(message, 'รูปแบบอีเมลไม่ถูกต้อง');
    if (!field('contact_id')) {
      return setMessage(message, `กรุณากรอก ${contactIdLabel(form.elements.contact_app.value)}`);
    }
    if (form.elements.password.value !== form.elements.password_confirm.value) {
      return setMessage(message, 'รหัสผ่านทั้งสองช่องไม่ตรงกัน');
    }

    setMessage(message, '');
    await withBusy(form.querySelector('button[type="submit"]'), async () => {
      try {
        await api.register({
          first_name: field('first_name'),
          last_name: field('last_name'),
          email: field('email'),
          phone: field('phone') || undefined,
          contact_app: form.elements.contact_app.value,
          contact_id: field('contact_id'),
          password: form.elements.password.value,
        });
        window.location.href = nextPage();
      } catch (error) {
        setMessage(message, errorText(error));
      }
    });
    return undefined;
  });
}

/* ============================================================
   เข้าสู่ระบบ
   ============================================================ */
function initLogin() {
  if (currentUser.get()) {
    window.location.replace(nextPage());
    return;
  }
  keepNextOnLinks();

  const form = $('login-form');
  const message = $('form-message');
  if (params.get('expired')) setMessage(message, 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = form.elements.email.value.trim();
    const password = form.elements.password.value;
    if (!email || !password) return setMessage(message, 'กรุณากรอกอีเมลและรหัสผ่าน');

    setMessage(message, '');
    await withBusy(form.querySelector('button[type="submit"]'), async () => {
      try {
        await api.userLogin(email, password);
        window.location.href = nextPage();
      } catch (error) {
        setMessage(message, errorText(error));
      }
    });
    return undefined;
  });
}

/* ============================================================
   บัญชีของฉัน
   ============================================================ */
function initAccount() {
  if (!requireLogin()) return;

  let paymentProvider = 'none';
  const pageMessage = $('page-message');

  /** token หมดอายุหรือบัญชีถูกระงับ = ออกจากระบบแล้วกลับไปหน้า login */
  const handleError = (error, target = pageMessage) => {
    if (error.status === 401) {
      api.userLogout();
      window.location.replace('login.html?expired=1&next=account.html');
      return;
    }
    setMessage(target, errorText(error));
  };

  const panels = ['bookings', 'notifications', 'profile'];
  const profileForm = $('profile-form');
  const syncContactLabel = bindContactApp(
    profileForm.elements.contact_app,
    profileForm.elements.contact_id,
    $('profile-contact-id-label'),
  );

  function showTab(tab) {
    for (const name of panels) $(`panel-${name}`).classList.toggle('hidden', name !== tab);
    for (const button of document.querySelectorAll('[data-tab]')) {
      const active = button.dataset.tab === tab;
      button.classList.toggle('bg-forest', active);
      button.classList.toggle('text-white', active);
      button.classList.toggle('bg-white', !active);
      button.classList.toggle('text-gray-600', !active);
    }
    setMessage(pageMessage, '');
    if (tab === 'bookings') loadBookings();
    if (tab === 'notifications') loadNotifications();
  }

  async function loadBookings() {
    const panel = $('panel-bookings');
    panel.innerHTML = '<p class="text-center text-gray-400 text-sm py-10">กำลังโหลดการจอง...</p>';
    try {
      const bookings = await api.myBookings();
      panel.innerHTML = bookings.length
        ? bookings.map((booking) => bookingCard(booking, { paymentProvider })).join('')
        : `<div class="bg-white rounded-2xl border border-gray-200 p-10 text-center">
             <p class="text-gray-500">คุณยังไม่มีการจอง</p>
             <a href="activities.html" class="inline-block mt-4 bg-gold hover:bg-gold/90 text-white font-bold px-6 py-3 rounded-lg transition">เลือกกิจกรรม</a>
           </div>`;
    } catch (error) {
      panel.innerHTML = '';
      handleError(error);
    }
  }

  async function loadNotifications() {
    const panel = $('panel-notifications');
    panel.innerHTML = '<p class="text-center text-gray-400 text-sm py-10">กำลังโหลดการแจ้งเตือน...</p>';
    try {
      const { data } = await api.myNotifications();
      panel.innerHTML = data.length
        ? data
            .map(
              (item) => `
          <article class="bg-white rounded-xl border ${item.is_read ? 'border-gray-200' : 'border-gold'} p-5">
            <div class="flex flex-wrap items-baseline justify-between gap-2">
              <h3 class="font-bold">${item.is_read ? '' : '<span class="text-gold">● </span>'}${escapeHtml(item.subject)}</h3>
              <time class="text-xs text-gray-500">${formatDateTime(item.created_at)}</time>
            </div>
            <p class="text-sm text-gray-600 mt-2 whitespace-pre-line break-words">${escapeHtml(item.body)}</p>
          </article>`,
            )
            .join('')
        : '<p class="bg-white rounded-2xl border border-gray-200 p-10 text-center text-gray-500">ยังไม่มีการแจ้งเตือน</p>';

      // เปิดแท็บนี้แล้วถือว่าอ่านทั้งหมด
      if (data.some((item) => !item.is_read)) {
        await api.markNotificationsRead();
        $('unread-badge').textContent = '';
      }
    } catch (error) {
      panel.innerHTML = '';
      handleError(error);
    }
  }

  function fillProfile(user) {
    $('account-greeting').textContent = `สวัสดีคุณ ${user.first_name} ${user.last_name}`;
    $('profile-email').value = user.email;
    const form = $('profile-form');
    form.elements.first_name.value = user.first_name;
    form.elements.last_name.value = user.last_name;
    form.elements.phone.value = user.phone ?? '';
    form.elements.contact_app.value = user.contact_app;
    form.elements.contact_id.value = user.contact_id ?? '';
    syncContactLabel();
  }

  for (const button of document.querySelectorAll('[data-tab]')) {
    button.addEventListener('click', () => showTab(button.dataset.tab));
  }

  $('logout-button').addEventListener('click', () => {
    api.userLogout();
    window.location.href = 'index.html';
  });

  $('panel-bookings').addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const { action, ref } = button.dataset;

    await withBusy(button, async () => {
      try {
        if (action === 'pay') {
          const checkout = await api.payMyBooking(ref);
          window.location.href = checkout.checkout_url;
        } else if (action === 'cancel') {
          if (!window.confirm(`ยืนยันยกเลิกการจอง ${ref}?`)) return;
          await api.cancelMyBooking(ref);
          await loadBookings();
          setMessage(pageMessage, `ยกเลิกการจอง ${ref} เรียบร้อยแล้ว`, true);
        }
      } catch (error) {
        handleError(error);
      }
    });
  });

  $('profile-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.target;
    const message = $('profile-message');
    const phone = form.elements.phone.value.trim();
    const contactId = form.elements.contact_id.value.trim();

    if (!contactId) {
      setMessage(message, `กรุณากรอก ${contactIdLabel(form.elements.contact_app.value)}`);
      return;
    }

    await withBusy(form.querySelector('button[type="submit"]'), async () => {
      try {
        const user = await api.updateProfile({
          first_name: form.elements.first_name.value.trim(),
          last_name: form.elements.last_name.value.trim(),
          contact_app: form.elements.contact_app.value,
          contact_id: contactId,
          ...(phone ? { phone } : {}),
        });
        fillProfile(user);
        renderAuthNav();
        setMessage(message, 'บันทึกข้อมูลเรียบร้อยแล้ว', true);
      } catch (error) {
        handleError(error, message);
      }
    });
  });

  $('password-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.target;
    const message = $('password-message');

    if (form.elements.new_password.value !== form.elements.password_confirm.value) {
      setMessage(message, 'รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน');
      return;
    }

    await withBusy(form.querySelector('button[type="submit"]'), async () => {
      try {
        const result = await api.changePassword({
          current_password: form.elements.current_password.value,
          new_password: form.elements.new_password.value,
        });
        form.reset();
        setMessage(message, result.message, true);
      } catch (error) {
        handleError(error, message);
      }
    });
  });

  // โหลดข้อมูลเริ่มต้น
  (async () => {
    try {
      const [user, settings, notifications] = await Promise.all([
        api.profile(),
        loadSettings(),
        api.myNotifications(),
      ]);
      paymentProvider = settings.payment_provider ?? 'none';
      fillProfile(user);
      $('unread-badge').textContent = notifications.meta.unread || '';
      showTab(panels.includes(params.get('tab')) ? params.get('tab') : 'bookings');
    } catch (error) {
      handleError(error);
    }
  })();
}

/* ============================================================
   ตรวจสอบการจอง (ไม่ต้องล็อกอิน)
   ============================================================ */
function initBookingLookup() {
  const form = $('lookup-form');
  const message = $('page-message');
  const result = $('booking-result');
  let current = null; // { ref, email }

  async function lookup() {
    const ref = form.elements.ref.value.trim().toUpperCase();
    const email = form.elements.email.value.trim();
    if (!ref || !email) return setMessage(message, 'กรุณากรอกรหัสการจองและอีเมล');

    setMessage(message, '');
    result.innerHTML = '<p class="text-center text-gray-400 text-sm py-6">กำลังค้นหา...</p>';
    try {
      const booking = await api.lookupBooking(ref, email);
      current = { ref: booking.booking_ref, email };
      result.innerHTML = bookingCard(booking, { paymentProvider: booking.payment?.provider });
    } catch (error) {
      current = null;
      result.innerHTML = '';
      setMessage(message, errorText(error));
    }
    return undefined;
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    lookup();
  });

  result.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button || !current) return;

    await withBusy(button, async () => {
      try {
        if (button.dataset.action === 'pay') {
          const checkout = await api.payBooking(current.ref, current.email);
          window.location.href = checkout.checkout_url;
        } else if (button.dataset.action === 'cancel') {
          if (!window.confirm(`ยืนยันยกเลิกการจอง ${current.ref}?`)) return;
          await api.cancelBooking(current.ref, current.email);
          await lookup();
          setMessage(message, `ยกเลิกการจอง ${current.ref} เรียบร้อยแล้ว`, true);
        }
      } catch (error) {
        setMessage(message, errorText(error));
      }
    });
  });

  // เปิดจากลิงก์ในอีเมล (?ref=&email=) ให้ค้นให้เลย
  if (params.get('ref')) form.elements.ref.value = params.get('ref');
  if (params.get('email')) form.elements.email.value = params.get('email');
  if (params.get('ref') && params.get('email')) lookup();
}

/* ============================================================
   ชำระเงิน
   ============================================================ */
function initPayment() {
  const card = $('payment-card');
  const ref = params.get('ref');
  const token = params.get('token');

  const summaryRows = (payment) => `
    <dl class="rounded-lg border border-gray-200 divide-y divide-gray-200 text-sm">
      <div class="flex justify-between gap-4 px-4 py-3"><dt class="text-gray-500">รหัสการจอง</dt><dd class="font-mono font-bold text-forest">${escapeHtml(payment.booking_ref)}</dd></div>
      <div class="flex justify-between gap-4 px-4 py-3"><dt class="text-gray-500">กิจกรรม</dt><dd class="font-semibold text-right">${escapeHtml(payment.activity?.name_th ?? '')}</dd></div>
      <div class="flex justify-between gap-4 px-4 py-3"><dt class="text-gray-500">วันที่เข้าร่วม</dt><dd class="font-semibold">${formatDate(payment.booking_date)}</dd></div>
      <div class="flex justify-between gap-4 px-4 py-3"><dt class="text-gray-500">ยอดชำระ</dt><dd class="font-extrabold text-gold text-lg">${formatTHB(payment.total_amount)}</dd></div>
    </dl>`;

  const links = `
    <div class="flex flex-wrap justify-center gap-3">
      <a href="account.html" class="border border-forest text-forest font-bold px-6 py-3 rounded-lg">บัญชีของฉัน</a>
      <a href="index.html" class="bg-forest hover:bg-forest-dark text-white font-bold px-6 py-3 rounded-lg transition">กลับหน้าแรก</a>
    </div>`;

  function showError(text) {
    card.innerHTML = `
      <h1 class="text-xl font-extrabold text-red-700 text-center">เปิดหน้าชำระเงินไม่ได้</h1>
      <p class="text-sm text-gray-600 text-center">${escapeHtml(text)}</p>
      <a href="booking.html" class="mx-auto bg-forest text-white font-bold px-6 py-3 rounded-lg">ตรวจสอบการจอง</a>`;
  }

  function render(payment, { waiting = false } = {}) {
    if (payment.payment_status === 'paid') {
      card.innerHTML = `
        <p class="text-5xl text-center">✅</p>
        <h1 class="text-2xl font-extrabold text-forest text-center">ชำระเงินสำเร็จ</h1>
        <p class="text-sm text-gray-600 text-center">การจองของคุณได้รับการยืนยันแล้ว เราส่งรายละเอียดไปที่ ${escapeHtml(payment.email)}</p>
        ${summaryRows(payment)}
        ${links}`;
      return;
    }

    if (payment.status === 'cancelled') {
      card.innerHTML = `
        <h1 class="text-xl font-extrabold text-center">การจองนี้ถูกยกเลิกแล้ว</h1>
        ${summaryRows(payment)}
        ${links}`;
      return;
    }

    const lookupUrl = `booking.html?ref=${encodeURIComponent(payment.booking_ref)}&email=${encodeURIComponent(payment.email)}`;

    if (payment.payment_status === 'reviewing') {
      card.innerHTML = `
        <p class="text-5xl text-center">🕒</p>
        <h1 class="text-2xl font-extrabold text-forest text-center">ได้รับแจ้งการโอนเงินแล้ว</h1>
        <p class="text-sm text-gray-600 text-center">${payment.has_slip ? 'เราได้รับสลิปของคุณแล้ว ' : ''}ทีมงานจะตรวจสอบยอดเงินและยืนยันการจองให้ภายใน 24 ชั่วโมง เราจะส่งอีเมลแจ้งไปที่ ${escapeHtml(payment.email)}</p>
        ${summaryRows(payment)}
        ${links}`;
      return;
    }

    if (payment.provider === 'promptpay' && payment.promptpay) {
      card.innerHTML = `
        <h1 class="text-2xl font-extrabold text-forest text-center">สแกนจ่ายด้วย PromptPay</h1>
        <div class="flex flex-col items-center gap-3">
          <img src="${payment.promptpay.qr_image}" alt="QR พร้อมเพย์สำหรับชำระ ${formatTHB(payment.total_amount)}" width="260" height="260" class="border border-gray-200 rounded-xl" />
          <p class="text-3xl font-extrabold text-gold">${formatTHB(payment.total_amount)}</p>
          <p class="text-sm text-center">
            ชื่อบัญชีผู้รับ: <strong>${escapeHtml(payment.promptpay.account_name)}</strong><br>
            <span class="text-gray-500">พร้อมเพย์ ${escapeHtml(payment.promptpay.account_id)}</span>
          </p>
        </div>
        <ol class="text-sm text-gray-600 list-decimal pl-5 flex flex-col gap-1">
          <li>เปิดแอปธนาคารของคุณ แล้วเลือก "สแกน QR"</li>
          <li>ตรวจว่า<strong>ชื่อผู้รับและยอดเงิน</strong>ตรงกับด้านบน แล้วกดยืนยันการโอน</li>
          <li>บันทึกสลิป แล้วกลับมาที่หน้านี้เพื่อ<strong>แนบสลิป</strong>และกดปุ่ม "แจ้งโอนเงินแล้ว"</li>
        </ol>
        ${summaryRows(payment)}
        <div>
          <label for="transfer-slip" class="text-sm font-semibold block mb-2">แนบสลิปโอนเงิน *</label>
          <input id="transfer-slip" type="file" accept="image/jpeg,image/png,image/webp"
                 class="block w-full text-sm border border-gray-300 rounded-lg bg-cream file:mr-4 file:py-3 file:px-4 file:border-0 file:bg-forest file:text-white file:font-bold file:cursor-pointer" />
          <p class="text-xs text-gray-500 mt-1">ไฟล์รูป JPG หรือ PNG — ทีมงานใช้ตรวจสอบยอดเงินกับการจองนี้เท่านั้น</p>
          <img id="slip-preview" alt="ตัวอย่างสลิปที่แนบ" class="hidden mt-3 max-h-72 mx-auto rounded-lg border border-gray-200" />
        </div>
        <div>
          <label for="transfer-note" class="text-sm font-semibold block mb-2">เวลาที่โอน / หมายเหตุ (ถ้ามี)</label>
          <input id="transfer-note" type="text" maxlength="90" placeholder="เช่น โอนเวลา 14:32 น. จากธนาคารกสิกร"
                 class="w-full border border-gray-300 rounded-lg px-4 py-3 bg-cream" />
        </div>
        <p id="payment-message" class="hidden" role="alert"></p>
        <button id="transfer-notify" type="button" class="bg-gold hover:bg-gold/90 text-white font-bold py-3.5 rounded-lg transition">
          แจ้งโอนเงินแล้ว
        </button>
        <a href="${lookupUrl}" class="text-center text-sm text-gray-500 hover:text-forest">ชำระภายหลัง</a>`;

      // ย่อรูปทันทีที่เลือกไฟล์ จะได้เห็นตัวอย่างและรู้เลยถ้าไฟล์เปิดไม่ได้
      let slip = null;
      $('transfer-slip').addEventListener('change', async (event) => {
        const [file] = event.target.files;
        const preview = $('slip-preview');
        slip = null;
        preview.classList.add('hidden');
        setMessage($('payment-message'), '');
        if (!file) return;

        try {
          slip = await imageFileToDataUrl(file);
          preview.src = slip;
          preview.classList.remove('hidden');
        } catch (error) {
          event.target.value = '';
          setMessage($('payment-message'), error.message);
        }
      });

      $('transfer-notify').addEventListener('click', (event) => {
        if (!slip) {
          setMessage($('payment-message'), 'กรุณาแนบสลิปโอนเงินก่อนกดแจ้งโอน');
          return;
        }
        if (!window.confirm('ยืนยันว่าโอนเงินเรียบร้อยแล้ว?')) return;
        withBusy(event.currentTarget, async () => {
          try {
            render(await api.notifyTransfer(ref, token, { note: $('transfer-note').value.trim() || undefined, slip }));
          } catch (error) {
            setMessage($('payment-message'), errorText(error));
          }
        });
      });
      return;
    }

    if (payment.provider === 'mock') {
      card.innerHTML = `
        <h1 class="text-2xl font-extrabold text-forest text-center">ชำระเงิน</h1>
        <p class="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg px-4 py-3">
          <strong>โหมดทดสอบ</strong> — หน้านี้เป็นการชำระเงินจำลอง ไม่มีการตัดเงินจริง
          กดปุ่มด้านล่างเพื่อจำลองว่าชำระเงินสำเร็จ
        </p>
        ${summaryRows(payment)}
        <p id="payment-message" class="hidden" role="alert"></p>
        <button id="mock-pay" type="button" class="bg-gold hover:bg-gold/90 text-white font-bold py-3.5 rounded-lg transition">
          ชำระเงิน ${formatTHB(payment.total_amount)}
        </button>
        <a href="booking.html?ref=${encodeURIComponent(payment.booking_ref)}&email=${encodeURIComponent(payment.email)}" class="text-center text-sm text-gray-500 hover:text-forest">ชำระภายหลัง</a>`;

      $('mock-pay').addEventListener('click', (event) =>
        withBusy(event.currentTarget, async () => {
          try {
            render(await api.confirmMockPayment(ref, token));
          } catch (error) {
            setMessage($('payment-message'), errorText(error));
          }
        }),
      );
      return;
    }

    // Stripe: กลับมาจากหน้าชำระเงินแล้ว แต่ผลยืนยันมาทาง webhook ซึ่งอาจช้ากว่าเล็กน้อย
    card.innerHTML = `
      <h1 class="text-xl font-extrabold text-center">${waiting ? 'กำลังรอยืนยันการชำระเงิน...' : 'ยังไม่ได้ชำระเงิน'}</h1>
      <p class="text-sm text-gray-600 text-center">${
        waiting
          ? 'ระบบกำลังรอผลจากผู้ให้บริการชำระเงิน หน้านี้จะอัปเดตเองภายในไม่กี่วินาที'
          : 'รายการชำระเงินยังไม่สำเร็จ คุณกลับไปชำระใหม่ได้จากหน้าตรวจสอบการจอง'
      }</p>
      ${summaryRows(payment)}
      <a href="booking.html?ref=${encodeURIComponent(payment.booking_ref)}&email=${encodeURIComponent(payment.email)}" class="mx-auto bg-forest text-white font-bold px-6 py-3 rounded-lg">ไปหน้าตรวจสอบการจอง</a>`;
  }

  if (!ref || !token) {
    showError('ลิงก์ชำระเงินไม่ครบถ้วน');
    return;
  }

  (async () => {
    try {
      let payment = await api.paymentStatus(ref, token);
      const returnedFromGateway = params.get('paid') === '1';
      render(payment, { waiting: returnedFromGateway });

      // รอ webhook สูงสุดประมาณ 30 วินาที
      for (let attempt = 0; returnedFromGateway && payment.payment_status !== 'paid' && attempt < 10; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        payment = await api.paymentStatus(ref, token);
        render(payment, { waiting: attempt < 9 });
      }
    } catch (error) {
      showError(errorText(error));
    }
  })();
}

/* ============================================================
   รายละเอียดกิจกรรม
   ============================================================ */
function initActivityDetail() {
  const container = $('activity-detail');
  const slug = params.get('slug');

  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    container.innerHTML = '<p class="text-center text-red-600 py-16">ไม่พบกิจกรรมที่ต้องการ</p>';
    return;
  }

  (async () => {
    try {
      const [activity, settings] = await Promise.all([api.getActivity(slug), loadSettings()]);
      document.title = `${activity.name_th} | Chokchai Elephant Camp`;

      const highlights = (activity.highlights ?? '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

      const minDate = new Date();
      minDate.setDate(minDate.getDate() + (settings.booking_min_lead_days ?? 1));

      container.innerHTML = `
      <div class="grid lg:grid-cols-5 gap-10 items-start">
        <div class="lg:col-span-3 flex flex-col gap-6">
          <div class="rounded-2xl overflow-hidden border border-gray-200 bg-white">
            ${activityMedia(activity, 'h-72 lg:h-96')}
          </div>
          <div>
            <div class="flex flex-wrap gap-2 mb-3">
              <span class="bg-forest text-white text-xs font-bold px-3 py-1.5 rounded-full">${escapeHtml(categoryLabel(activity.category))}</span>
              <span class="bg-white border border-gray-200 text-xs font-bold px-3 py-1.5 rounded-full">⏱ ${escapeHtml(activity.duration_label)}</span>
            </div>
            <h1 class="text-3xl lg:text-4xl font-extrabold text-forest">${escapeHtml(activity.name)}</h1>
            <p class="text-lg text-gray-600 mt-1">${escapeHtml(activity.name_th)}</p>
          </div>
          <p class="text-gray-700 leading-relaxed">${escapeHtml(activity.description_th ?? '')}</p>
          ${
            highlights.length
              ? `<div>
                  <h2 class="font-extrabold text-lg mb-3">จุดเด่นของกิจกรรม</h2>
                  <ul class="grid sm:grid-cols-2 gap-3">
                    ${highlights.map((line) => `<li class="bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm flex gap-2"><span class="text-gold font-bold">✓</span><span>${escapeHtml(line)}</span></li>`).join('')}
                  </ul>
                </div>`
              : ''
          }
          <div class="bg-white border border-gray-200 rounded-2xl p-5 text-sm text-gray-600 leading-relaxed">
            <h2 class="font-extrabold text-base text-dark mb-2">ข้อมูลที่ควรทราบ</h2>
            <ul class="list-disc pl-5 flex flex-col gap-1">
              <li>รับได้สูงสุด ${activity.daily_capacity} ที่ต่อวัน (ทารกไม่นับที่นั่ง)</li>
              <li>ต้องจองล่วงหน้าอย่างน้อย ${settings.booking_min_lead_days ?? 1} วัน</li>
              <li>ยกเลิกฟรีก่อนวันกิจกรรมอย่างน้อย ${settings.cancel_free_hours ?? 72} ชั่วโมง</li>
              <li>บริการรับ-ส่งฟรีในรัศมี 5 กม. จากตัวเมืองเชียงใหม่</li>
            </ul>
          </div>
        </div>

        <aside class="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-md p-6 flex flex-col gap-5 lg:sticky lg:top-28">
          <h2 class="font-extrabold text-lg">ราคา</h2>
          <dl class="text-sm flex flex-col gap-2">
            <div class="flex justify-between"><dt>ผู้ใหญ่</dt><dd class="font-extrabold">${formatTHB(activity.adult_price)}</dd></div>
            <div class="flex justify-between"><dt>เด็ก</dt><dd class="font-extrabold">${formatTHB(activity.child_price)}</dd></div>
            <div class="flex justify-between"><dt>ทารก</dt><dd class="font-extrabold">${Number(activity.infant_price) === 0 ? 'ฟรี' : formatTHB(activity.infant_price)}</dd></div>
          </dl>
          <div>
            <label for="detail-date" class="text-sm font-semibold block mb-2">เช็กที่ว่างตามวันที่</label>
            <input id="detail-date" type="date" min="${localDateString(minDate)}" value="${localDateString(minDate)}"
                   class="w-full border border-gray-300 rounded-lg px-4 py-3 bg-cream" />
            <p id="detail-availability" class="text-sm mt-2" role="status" aria-live="polite"></p>
          </div>
          <a id="detail-book" href="activities.html?book=${encodeURIComponent(activity.slug)}"
             class="bg-gold hover:bg-gold/90 text-white font-bold text-center py-3.5 rounded-lg transition">จองกิจกรรมนี้</a>
        </aside>
      </div>`;

      const dateInput = $('detail-date');
      const label = $('detail-availability');
      const bookLink = $('detail-book');

      const check = async () => {
        if (!dateInput.value) return;
        bookLink.href = `activities.html?book=${encodeURIComponent(activity.slug)}&date=${dateInput.value}`;
        label.textContent = 'กำลังตรวจสอบที่ว่าง...';
        label.className = 'text-sm mt-2 text-gray-500';
        try {
          const availability = await api.getAvailability(activity.slug, dateInput.value);
          label.textContent =
            availability.remaining > 0
              ? `เหลือที่ว่าง ${availability.remaining} ที่ จากทั้งหมด ${availability.capacity} ที่`
              : 'วันนี้เต็มแล้ว กรุณาเลือกวันอื่น';
          label.className = `text-sm mt-2 font-semibold ${availability.remaining > 0 ? 'text-forest' : 'text-red-600'}`;
        } catch (error) {
          label.textContent = error.message;
          label.className = 'text-sm mt-2 text-red-600';
        }
      };

      dateInput.addEventListener('change', check);
      check();
    } catch (error) {
      container.innerHTML = `<p class="text-center text-red-600 py-16">${escapeHtml(error.message)}</p>`;
    }
  })();
}

/* ============================================================
   เริ่มทำงาน
   ============================================================ */
const PAGES = {
  register: initRegister,
  login: initLogin,
  account: initAccount,
  booking: initBookingLookup,
  payment: initPayment,
  activity: initActivityDetail,
};

document.addEventListener('DOMContentLoaded', () => {
  initSite();
  PAGES[document.body.dataset.page]?.();
});
