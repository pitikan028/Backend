/**
 * logic ของหน้าย่อย: register, login, account, booking (ตรวจสอบการจอง), payment, activity
 * เลือกทำงานตาม <body data-page="...">
 */
import { api, currentUser, formatTHB } from './api.js';
import { lang, locale, t } from './i18n.js';
import {
  activityMedia,
  ageLabel,
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

const enterContactId = (app) => {
  const idLabel = contactIdLabel(app, lang);
  return t(`Please enter your ${idLabel}.`, `กรุณากรอก ${idLabel}`);
};

/** ราคา 1 ประเภท: ป้ายราคา + ชื่อ + ช่วงอายุ (ข้อความ label แปลโดยพจนานุกรมใน i18n-th.js) */
const priceRow = (price, label, group) => `
  <li class="flex items-center gap-3">
    <span class="bg-emerald-100 text-emerald-900 font-extrabold text-sm text-center rounded-md px-2.5 py-1 min-w-[4.75rem]">${price}</span>
    <span class="leading-tight">
      <span class="block font-bold">${label}</span>
      <span class="block text-xs text-gray-500">${ageLabel(group)}</span>
    </span>
  </li>`;

/** แถวราคาของกิจกรรม: ราคาเหมาต่อกลุ่ม / เฉพาะผู้ใหญ่ / ผู้ใหญ่-เด็ก-ทารก */
function priceRows(activity) {
  const tiers = activity.price_tiers ?? [];

  if (tiers.length) {
    const words = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
    const word = (count) => words[count] ?? String(count);
    return tiers
      .map((tier, index) => {
        const from = index === 0 ? 1 : tiers[index - 1].max_guests + 1;
        const label =
          from === tier.max_guests
            ? t(`${word(tier.max_guests)} People`, `${tier.max_guests} คน`)
            : t(`${word(from)} - ${word(tier.max_guests)} People`, `${from}-${tier.max_guests} คน`);
        return `
  <li class="flex items-center gap-3">
    <span class="bg-emerald-100 text-emerald-900 font-extrabold text-sm text-center rounded-md px-2.5 py-1 min-w-[4.75rem]">${formatTHB(tier.price)}</span>
    <span class="block font-bold leading-tight">${label}</span>
  </li>`;
      })
      .join('');
  }
  if (activity.adults_only) return priceRow(formatTHB(activity.adult_price), 'Adults', 'adult');
  return [
    priceRow(formatTHB(activity.adult_price), 'Adults', 'adult'),
    priceRow(formatTHB(activity.child_price), 'Children', 'child'),
    priceRow(Number(activity.infant_price) === 0 ? 'Free' : formatTHB(activity.infant_price), 'Infants', 'infant'),
  ].join('');
}

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
  bindContactApp(form.elements.contact_app, form.elements.contact_id, $('reg-contact-id-label'), lang);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const field = (name) => form.elements[name].value.trim();

    if (!field('first_name') || !field('last_name')) return setMessage(message, 'Please enter your first and last name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field('email'))) return setMessage(message, 'Please enter a valid email address.');
    // กติกาเดียวกับ registerSchema ฝั่ง API ตรวจที่นี่ก่อนเพื่อแจ้งเป็นภาษาอังกฤษ (ข้อความ validation จาก API เป็นไทย)
    if (field('phone') && !/^[+()0-9 -]{6,}$/.test(field('phone'))) {
      return setMessage(message, 'Please enter a valid phone number.');
    }
    if (!field('contact_id')) {
      return setMessage(message, enterContactId(form.elements.contact_app.value));
    }
    const password = form.elements.password.value;
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      return setMessage(message, 'Your password must be at least 8 characters and include both letters and numbers.');
    }
    if (password !== form.elements.password_confirm.value) {
      return setMessage(message, 'The passwords do not match.');
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
        const phoneTaken = error.status === 409 && error.details?.some((item) => item.field === 'phone');
        const text = {
          409: phoneTaken
            ? 'This phone number is already used by another account.'
            : 'This email is already registered. Please log in instead.',
          422: 'Please check your details and try again.',
          429: 'Too many attempts. Please wait a few minutes and try again.',
        }[error.status];
        setMessage(message, text ?? errorText(error));
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
  if (params.get('expired')) setMessage(message, 'Your session has expired. Please log in again.');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const identifier = form.elements.identifier.value.trim();
    const password = form.elements.password.value;
    if (!identifier || !password) {
      return setMessage(message, 'Please enter your email or phone number and your password.');
    }

    setMessage(message, '');
    await withBusy(form.querySelector('button[type="submit"]'), async () => {
      try {
        await api.userLogin(identifier, password);
        window.location.href = nextPage();
      } catch (error) {
        // ข้อความจาก API เป็นภาษาไทย หน้านี้แสดงเป็นอังกฤษจึงแปลงตามรหัสสถานะ
        const text = {
          401: 'Incorrect email, phone number or password.',
          403: 'This account has been suspended. Please contact our staff.',
          429: 'Too many login attempts. Please wait 15 minutes and try again.',
        }[error.status];
        setMessage(message, text ?? errorText(error));
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
    lang,
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
    panel.innerHTML = '<p class="text-center text-gray-400 text-sm py-10">Loading bookings...</p>';
    try {
      const bookings = await api.myBookings();
      panel.innerHTML = bookings.length
        ? bookings.map((booking) => bookingCard(booking, { paymentProvider, lang })).join('')
        : `<div class="bg-white rounded-2xl border border-gray-200 p-10 text-center">
             <p class="text-gray-500">You have no bookings yet</p>
             <a href="activities.html" class="inline-block mt-4 bg-forest hover:bg-forest-dark text-white font-bold px-6 py-3 rounded-lg transition">Browse activities</a>
           </div>`;
    } catch (error) {
      panel.innerHTML = '';
      handleError(error);
    }
  }

  async function loadNotifications() {
    const panel = $('panel-notifications');
    panel.innerHTML = '<p class="text-center text-gray-400 text-sm py-10">Loading notifications...</p>';
    try {
      const { data } = await api.myNotifications();
      panel.innerHTML = data.length
        ? data
            .map(
              (item) => `
          <article class="bg-white rounded-xl border ${item.is_read ? 'border-gray-200' : 'border-gold'} p-5">
            <div class="flex flex-wrap items-baseline justify-between gap-2">
              <h3 class="font-bold">${item.is_read ? '' : '<span class="text-gold">● </span>'}${escapeHtml(item.subject)}</h3>
              <time class="text-xs text-gray-500">${formatDateTime(item.created_at, locale)}</time>
            </div>
            <p class="text-sm text-gray-600 mt-2 whitespace-pre-line break-words">${escapeHtml(item.body)}</p>
          </article>`,
            )
            .join('')
        : '<p class="bg-white rounded-2xl border border-gray-200 p-10 text-center text-gray-500">No notifications yet</p>';

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
    $('account-greeting').textContent = t(
      `Hello, ${user.first_name} ${user.last_name}`,
      `สวัสดี คุณ${user.first_name} ${user.last_name}`,
    );
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
          if (!window.confirm(t(`Cancel booking ${ref}?`, `ยืนยันยกเลิกการจอง ${ref} ใช่ไหม?`))) return;
          await api.cancelMyBooking(ref);
          await loadBookings();
          setMessage(pageMessage, t(`Booking ${ref} has been cancelled.`, `ยกเลิกการจอง ${ref} เรียบร้อยแล้ว`), true);
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
      setMessage(message, enterContactId(form.elements.contact_app.value));
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
        setMessage(message, 'Your details have been saved.', true);
      } catch (error) {
        if (error.status === 409 && error.details?.some((item) => item.field === 'phone')) {
          setMessage(message, 'This phone number is already used by another account.');
        } else {
          handleError(error, message);
        }
      }
    });
  });

  $('password-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.target;
    const message = $('password-message');

    if (form.elements.new_password.value !== form.elements.password_confirm.value) {
      setMessage(message, 'The new passwords do not match.');
      return;
    }

    await withBusy(form.querySelector('button[type="submit"]'), async () => {
      try {
        await api.changePassword({
          current_password: form.elements.current_password.value,
          new_password: form.elements.new_password.value,
        });
        form.reset();
        setMessage(message, 'Your password has been changed.', true);
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
    if (!ref || !email) return setMessage(message, 'Please enter your booking reference and email.');

    setMessage(message, '');
    result.innerHTML = '<p class="text-center text-gray-400 text-sm py-6">Searching...</p>';
    try {
      const booking = await api.lookupBooking(ref, email);
      current = { ref: booking.booking_ref, email };
      result.innerHTML = bookingCard(booking, { paymentProvider: booking.payment?.provider, lang });
    } catch (error) {
      current = null;
      result.innerHTML = '';
      // ข้อความจาก API เป็นภาษาไทย — ไม่เจอการจอง (404) หรือรูปแบบรหัส/อีเมลผิด (422) แจ้งเป็นอังกฤษเอง
      const text = {
        404: 'We could not find a booking with that reference and email. Please check both and try again.',
        422: 'Please check the booking reference and email format.',
      }[error.status];
      setMessage(message, text ?? errorText(error));
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
          if (!window.confirm(t(`Cancel booking ${current.ref}?`, `ยืนยันยกเลิกการจอง ${current.ref} ใช่ไหม?`))) return;
          await api.cancelBooking(current.ref, current.email);
          await lookup();
          setMessage(message, t(`Booking ${current.ref} has been cancelled.`, `ยกเลิกการจอง ${current.ref} เรียบร้อยแล้ว`), true);
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
      <div class="flex justify-between gap-4 px-4 py-3"><dt class="text-gray-500">Booking reference</dt><dd class="font-mono font-bold text-forest">${escapeHtml(payment.booking_ref)}</dd></div>
      <div class="flex justify-between gap-4 px-4 py-3"><dt class="text-gray-500">Activity</dt><dd class="font-semibold text-right">${escapeHtml(t(payment.activity?.name, payment.activity?.name_th ?? payment.activity?.name) ?? '')}</dd></div>
      <div class="flex justify-between gap-4 px-4 py-3"><dt class="text-gray-500">Activity date</dt><dd class="font-semibold">${formatDate(payment.booking_date, locale)}</dd></div>
      <div class="flex justify-between gap-4 px-4 py-3"><dt class="text-gray-500">Amount due</dt><dd class="font-extrabold text-gold text-lg">${formatTHB(payment.total_amount)}</dd></div>
    </dl>`;

  const links = `
    <div class="flex flex-wrap justify-center gap-3">
      <a href="account.html" class="border border-forest text-forest font-bold px-6 py-3 rounded-lg">My Account</a>
      <a href="index.html" class="bg-forest hover:bg-forest-dark text-white font-bold px-6 py-3 rounded-lg transition">Back to home</a>
    </div>`;

  function showError(text) {
    card.innerHTML = `
      <h1 class="text-xl font-extrabold text-red-700 text-center">This payment page could not be opened</h1>
      <p class="text-sm text-gray-600 text-center">${escapeHtml(text)}</p>
      <a href="booking.html" class="mx-auto bg-forest text-white font-bold px-6 py-3 rounded-lg">Check my booking</a>`;
  }

  function render(payment, { waiting = false } = {}) {
    if (payment.payment_status === 'paid') {
      card.innerHTML = `
        <p class="text-5xl text-center">✅</p>
        <h1 class="font-script text-forest-dark text-4xl text-center">Payment successful</h1>
        <p class="text-sm text-gray-600 text-center">${t(`Your booking is confirmed. We have sent the details to ${escapeHtml(payment.email)}.`, `การจองของคุณได้รับการยืนยันแล้ว เราส่งรายละเอียดไปที่ ${escapeHtml(payment.email)} แล้ว`)}</p>
        ${summaryRows(payment)}
        ${links}`;
      return;
    }

    if (payment.status === 'cancelled') {
      card.innerHTML = `
        <h1 class="text-xl font-extrabold text-center">This booking has been cancelled</h1>
        ${summaryRows(payment)}
        ${links}`;
      return;
    }

    const lookupUrl = `booking.html?ref=${encodeURIComponent(payment.booking_ref)}&email=${encodeURIComponent(payment.email)}`;

    if (payment.payment_status === 'reviewing') {
      card.innerHTML = `
        <p class="text-5xl text-center">🕒</p>
        <h1 class="font-script text-forest-dark text-4xl text-center">Transfer notice received</h1>
        <p class="text-sm text-gray-600 text-center">${t(
          `${payment.has_slip ? 'We have received your slip. ' : ''}Our team will check the payment and confirm your booking within 24 hours. We will email you at ${escapeHtml(payment.email)}.`,
          `${payment.has_slip ? 'เราได้รับสลิปของคุณแล้ว ' : ''}ทีมงานจะตรวจสอบยอดเงินและยืนยันการจองภายใน 24 ชั่วโมง แล้วส่งอีเมลแจ้งที่ ${escapeHtml(payment.email)}`,
        )}</p>
        ${summaryRows(payment)}
        ${links}`;
      return;
    }

    if (payment.provider === 'promptpay' && payment.promptpay) {
      card.innerHTML = `
        <h1 class="font-script text-forest-dark text-4xl text-center">Scan to pay with PromptPay</h1>
        <div class="flex flex-col items-center gap-3">
          <img src="${payment.promptpay.qr_image}" alt="${t(`PromptPay QR code for ${formatTHB(payment.total_amount)}`, `คิวอาร์โค้ด PromptPay ยอด ${formatTHB(payment.total_amount)}`)}" width="260" height="260" class="border border-gray-200 rounded-xl" />
          <p class="text-3xl font-extrabold text-gold">${formatTHB(payment.total_amount)}</p>
          <p class="text-sm text-center">
            Account name: <strong>${escapeHtml(payment.promptpay.account_name)}</strong><br>
            <span class="text-gray-500">PromptPay ${escapeHtml(payment.promptpay.account_id)}</span>
          </p>
        </div>
        <ol class="text-sm text-gray-600 list-decimal pl-5 flex flex-col gap-1">
          <li>Open your banking app and choose "Scan QR".</li>
          <li>Check that the <strong>account name and amount</strong> match the details above, then confirm the transfer.</li>
          <li>Save the slip, then come back to this page to <strong>attach the slip</strong> and press "I have transferred".</li>
        </ol>
        ${summaryRows(payment)}
        <div>
          <p class="text-sm font-semibold mb-2">Attach transfer slip *</p>
          <label for="transfer-slip" class="flex items-center gap-4 w-full text-sm border border-gray-300 rounded-lg bg-cream overflow-hidden cursor-pointer focus-within:border-gold">
            <span class="bg-forest text-white font-bold py-3 px-4 shrink-0">Choose file</span>
            <span id="slip-filename" class="text-gray-500 truncate pr-4">No file chosen</span>
            <input id="transfer-slip" type="file" accept="image/jpeg,image/png,image/webp" class="sr-only" />
          </label>
          <p class="text-xs text-gray-500 mt-1">JPG or PNG image — used by our team only to match the payment to this booking.</p>
          <img id="slip-preview" alt="Preview of the attached slip" class="hidden mt-3 max-h-72 mx-auto rounded-lg border border-gray-200" />
        </div>
        <div>
          <label for="transfer-note" class="text-sm font-semibold block mb-2">Transfer time / note (optional)</label>
          <input id="transfer-note" type="text" maxlength="90" placeholder="e.g. Transferred at 14:32 from Kasikorn Bank"
                 class="w-full border border-gray-300 rounded-lg px-4 py-3 bg-cream" />
        </div>
        <p id="payment-message" class="hidden" role="alert"></p>
        <button id="transfer-notify" type="button" class="bg-forest hover:bg-forest-dark text-white font-bold py-3.5 rounded-lg transition">
          I have transferred
        </button>
        <a href="${lookupUrl}" class="text-center text-sm text-gray-500 hover:text-forest">Pay later</a>`;

      // ย่อรูปทันทีที่เลือกไฟล์ จะได้เห็นตัวอย่างและรู้เลยถ้าไฟล์เปิดไม่ได้
      let slip = null;
      $('transfer-slip').addEventListener('change', async (event) => {
        const [file] = event.target.files;
        const preview = $('slip-preview');
        slip = null;
        $('slip-filename').textContent = file ? file.name : 'No file chosen';
        preview.classList.add('hidden');
        setMessage($('payment-message'), '');
        if (!file) return;

        try {
          slip = await imageFileToDataUrl(file);
          preview.src = slip;
          preview.classList.remove('hidden');
        } catch (error) {
          event.target.value = '';
          $('slip-filename').textContent = 'No file chosen';
          setMessage($('payment-message'), error.message);
        }
      });

      $('transfer-notify').addEventListener('click', (event) => {
        if (!slip) {
          setMessage($('payment-message'), 'Please attach your transfer slip first.');
          return;
        }
        if (!window.confirm(t('Confirm that you have completed the transfer?', 'ยืนยันว่าคุณโอนเงินเรียบร้อยแล้วใช่ไหม?'))) return;
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
        <h1 class="font-script text-forest-dark text-4xl text-center">Payment</h1>
        <p class="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg px-4 py-3">
          <strong>Test mode</strong> — this is a simulated payment and no money will be charged.
          Press the button below to simulate a successful payment.
        </p>
        ${summaryRows(payment)}
        <p id="payment-message" class="hidden" role="alert"></p>
        <button id="mock-pay" type="button" class="bg-forest hover:bg-forest-dark text-white font-bold py-3.5 rounded-lg transition">
          ${t('Pay', 'ชำระเงิน')} ${formatTHB(payment.total_amount)}
        </button>
        <a href="booking.html?ref=${encodeURIComponent(payment.booking_ref)}&email=${encodeURIComponent(payment.email)}" class="text-center text-sm text-gray-500 hover:text-forest">Pay later</a>`;

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
      <h1 class="text-xl font-extrabold text-center">${waiting ? 'Waiting for payment confirmation...' : 'Payment not completed'}</h1>
      <p class="text-sm text-gray-600 text-center">${
        waiting
          ? 'We are waiting for the result from the payment provider. This page will update automatically in a few seconds.'
          : 'Your payment has not gone through. You can try again from the My Booking page.'
      }</p>
      ${summaryRows(payment)}
      <a href="booking.html?ref=${encodeURIComponent(payment.booking_ref)}&email=${encodeURIComponent(payment.email)}" class="mx-auto bg-forest text-white font-bold px-6 py-3 rounded-lg">Go to My Booking</a>`;
  }

  if (!ref || !token) {
    showError('This payment link is incomplete.');
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
    container.innerHTML = '<p class="text-center text-red-600 py-16">Activity not found</p>';
    return;
  }

  (async () => {
    try {
      const [activity, settings] = await Promise.all([api.getActivity(slug), loadSettings()]);
      const name = t(activity.name, activity.name_th);
      document.title = `${name} | Chokchai Elephant Camp`;

      const highlights = (t(activity.highlights_en || activity.highlights, activity.highlights) || '')
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
              <span class="bg-forest text-white text-xs font-bold px-3 py-1.5 rounded-full">${escapeHtml(categoryLabel(activity.category, lang))}</span>
              <span class="bg-white border border-gray-200 text-xs font-bold px-3 py-1.5 rounded-full">⏱ ${escapeHtml(t(activity.duration_label_en || activity.duration_label, activity.duration_label))}</span>
            </div>
            <h1 class="text-3xl lg:text-4xl font-extrabold text-forest">${escapeHtml(name)}</h1>
          </div>
          <p class="text-gray-700 leading-relaxed">${escapeHtml(t(activity.description_en || activity.description_th, activity.description_th) || '')}</p>
          ${
            highlights.length
              ? `<div>
                  <h2 class="font-script text-forest-dark text-3xl mb-3">Highlights</h2>
                  <ul class="grid sm:grid-cols-2 gap-3">
                    ${highlights.map((line) => `<li class="bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm flex gap-2"><span class="text-gold font-bold">✓</span><span>${escapeHtml(line)}</span></li>`).join('')}
                  </ul>
                </div>`
              : ''
          }
          <div class="bg-white border border-gray-200 rounded-2xl p-5 text-sm text-gray-600 leading-relaxed">
            <h2 class="font-script text-forest-dark text-2xl mb-2">Good to know</h2>
            <ul class="list-disc pl-5 flex flex-col gap-1">
              <li>${t(`Up to ${activity.daily_capacity} guests per day (infants do not take a seat)`, `รับได้สูงสุด ${activity.daily_capacity} คนต่อวัน (ทารกไม่นับที่นั่ง)`)}</li>
              <li>${t(`Book at least ${settings.booking_min_lead_days ?? 1} day(s) in advance`, `จองล่วงหน้าอย่างน้อย ${settings.booking_min_lead_days ?? 1} วัน`)}</li>
              <li>${t(`Free cancellation up to ${settings.cancel_free_hours ?? 72} hours before the activity date`, `ยกเลิกฟรีก่อนวันเข้าร่วมกิจกรรมอย่างน้อย ${settings.cancel_free_hours ?? 72} ชั่วโมง`)}</li>
              <li>Free pickup and drop-off within 5 km of Chiang Mai city</li>
            </ul>
          </div>
        </div>

        <aside class="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-md p-6 flex flex-col gap-5 lg:sticky lg:top-28">
          <h2 class="font-script text-forest-dark text-3xl">Price</h2>
          <ul class="flex flex-col gap-3">
            ${priceRows(activity)}
          </ul>
          <div>
            <label for="detail-date" class="text-sm font-semibold block mb-2">Check availability by date</label>
            <input id="detail-date" type="date" min="${localDateString(minDate)}" value="${localDateString(minDate)}"
                   class="w-full border border-gray-300 rounded-lg px-4 py-3 bg-cream" />
            <p id="detail-availability" class="text-sm mt-2" role="status" aria-live="polite"></p>
          </div>
          <a id="detail-book" href="activities.html?book=${encodeURIComponent(activity.slug)}"
             class="bg-brick hover:bg-brick-dark text-white font-bold text-center py-3.5 rounded-lg transition">Book this activity</a>
        </aside>
      </div>`;

      const dateInput = $('detail-date');
      const label = $('detail-availability');
      const bookLink = $('detail-book');

      const check = async () => {
        if (!dateInput.value) return;
        bookLink.href = `activities.html?book=${encodeURIComponent(activity.slug)}&date=${dateInput.value}`;
        label.textContent = 'Checking availability...';
        label.className = 'text-sm mt-2 text-gray-500';
        try {
          const availability = await api.getAvailability(activity.slug, dateInput.value);
          label.textContent =
            availability.remaining > 0
              ? t(
                  `${availability.remaining} of ${availability.capacity} spots available`,
                  `เหลือที่ว่าง ${availability.remaining} ที่ จากทั้งหมด ${availability.capacity} ที่`,
                )
              : 'Fully booked on this date. Please choose another day.';
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
