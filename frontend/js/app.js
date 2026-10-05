import { api, currentUser, formatTHB } from './api.js';
import {
  activityMedia,
  bindContactApp,
  categoryLabel,
  contactIdLabel,
  escapeHtml,
  formatDate,
  initSite,
  loadSettings,
  localDateString,
} from './common.js';

const stars = (rating) => '★'.repeat(rating) + '☆'.repeat(Math.max(0, 5 - rating));

const SOURCE_BADGES = {
  google: { label: 'Google', className: 'bg-[#3B6FD8]' },
  tripadvisor: { label: 'TripAdvisor', className: 'bg-[#34835F]' },
  website: { label: 'หน้าเว็บ', className: 'bg-forest' },
};

/** แสดงข้อความแทนที่เนื้อหาในกล่อง เช่น ตอนกำลังโหลดหรือโหลดไม่สำเร็จ */
function showPlaceholder(container, message, tone = 'muted') {
  const color = tone === 'error' ? 'text-red-600' : 'text-gray-400';
  container.innerHTML = `<p class="${color} col-span-full text-center py-10 text-sm">${escapeHtml(message)}</p>`;
}

/* ============================================================
   หน้าแรก — การ์ดกิจกรรม
   ============================================================ */
async function renderHomeActivities() {
  const container = document.getElementById('activities-grid');
  if (!container) return;

  showPlaceholder(container, 'กำลังโหลดกิจกรรม...');

  try {
    const activities = await api.listActivities();
    const countLabel = document.getElementById('activities-count');
    if (countLabel) countLabel.textContent = `${activities.length} กิจกรรมสุดพิเศษ`;

    container.innerHTML = activities
      .map(
        (activity) => `
      <div class="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        ${activityMedia(activity, 'h-56 w-full')}
        <div class="p-6 flex flex-col gap-2">
          <h3 class="font-bold text-lg">
            <a href="activity.html?slug=${escapeHtml(activity.slug)}" class="hover:text-forest">${escapeHtml(activity.name)}</a>
          </h3>
          <p class="text-sm text-gray-500">${escapeHtml(activity.description_th ?? activity.name_th)}</p>
          <p class="text-xs font-semibold text-forest">${escapeHtml(activity.duration_label)}</p>
          <div class="flex items-center justify-between mt-2">
            <span class="font-extrabold text-lg">${formatTHB(activity.adult_price)} / คน</span>
            <a href="activities.html?book=${escapeHtml(activity.slug)}"
               class="bg-gold text-white text-sm font-bold px-5 py-2.5 rounded-lg">จอง</a>
          </div>
        </div>
      </div>`,
      )
      .join('');
  } catch (error) {
    showPlaceholder(container, `โหลดกิจกรรมไม่สำเร็จ: ${error.message}`, 'error');
  }
}

/* ============================================================
   หน้าแรก — รีวิว
   ============================================================ */
async function renderReviews() {
  const container = document.getElementById('reviews-grid');
  if (!container) return;

  showPlaceholder(container, 'กำลังโหลดรีวิว...');

  try {
    const { data: reviews, meta } = await api.listReviews({ limit: 6 });

    const ratingLabel = document.getElementById('average-rating');
    if (ratingLabel && meta.average_rating) ratingLabel.textContent = `${meta.average_rating}★`;

    if (reviews.length === 0) {
      showPlaceholder(container, 'ยังไม่มีรีวิวในขณะนี้');
      return;
    }

    container.innerHTML = reviews
      .map((review) => {
        const badge = SOURCE_BADGES[review.source] ?? SOURCE_BADGES.website;
        return `
      <div class="bg-[#F7F4EC] rounded-2xl shadow-md px-6 py-6 flex flex-col gap-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="font-bold text-lg leading-tight">${escapeHtml(review.author_name)}</p>
            <p class="text-[#F2B33D] text-sm tracking-wider">${stars(review.rating)}</p>
          </div>
          <span class="${badge.className} text-white text-xs font-bold px-3 py-1 rounded-full">${badge.label}</span>
        </div>
        <p class="text-sm text-gray-600 leading-relaxed">"${escapeHtml(review.comment)}"</p>
      </div>`;
      })
      .join('');
  } catch (error) {
    showPlaceholder(container, `โหลดรีวิวไม่สำเร็จ: ${error.message}`, 'error');
  }
}

/* ============================================================
   หน้าแรก — FAQ
   ============================================================ */
async function renderFaqs() {
  const container = document.getElementById('faq-list');
  if (!container) return;

  try {
    const faqs = await api.listFaqs();
    container.innerHTML = faqs
      .map(
        (faq) => `
      <div class="bg-white border border-gray-200 rounded-lg px-3.5 py-3 max-w-md">
        <p class="text-xs font-bold text-forest-dark">Visitor</p>
        <p class="text-sm">${escapeHtml(faq.question)}</p>
      </div>
      <div class="bg-[#F1F3EC] border border-gray-200 rounded-lg px-3.5 py-3 max-w-md ml-auto">
        <p class="text-xs font-bold text-forest-dark">Elephant Camp</p>
        <p class="text-sm">${escapeHtml(faq.answer)}</p>
      </div>`,
      )
      .join('');
  } catch (error) {
    showPlaceholder(container, `โหลดคำถามที่พบบ่อยไม่สำเร็จ: ${error.message}`, 'error');
  }
}

/* ============================================================
   หน้าแรก — ฟอร์มส่งคำถาม
   ============================================================ */
function initInquiryForm() {
  const form = document.getElementById('inquiry-form');
  if (!form) return;

  const status = document.getElementById('inquiry-status');
  const submit = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const contact = form.elements.contact.value.trim();
    const message = form.elements.message.value.trim();

    const setStatus = (text, ok) => {
      status.textContent = text;
      status.className = `text-sm font-semibold ${ok ? 'text-forest' : 'text-red-600'}`;
    };

    if (!contact || !message) {
      setStatus('กรุณากรอกช่องทางติดต่อและคำถามให้ครบ', false);
      return;
    }

    submit.disabled = true;
    submit.classList.add('opacity-60');
    setStatus('กำลังส่ง...', true);

    try {
      const result = await api.sendInquiry({ contact, message });
      setStatus(result.message, true);
      form.reset();
    } catch (error) {
      setStatus(error.message, false);
    } finally {
      submit.disabled = false;
      submit.classList.remove('opacity-60');
    }
  });
}

/* ============================================================
   หน้ากิจกรรม — การ์ด + ค้นหา/กรอง
   ============================================================ */
function activityFilters() {
  const form = document.getElementById('activity-filters');
  if (!form) return {};
  return {
    q: form.elements.q.value.trim() || undefined,
    category: form.elements.category.value || undefined,
    sort: form.elements.sort.value || undefined,
  };
}

async function renderActivityCards() {
  const container = document.getElementById('activity-cards');
  if (!container) return;

  showPlaceholder(container, 'กำลังโหลดกิจกรรม...');

  try {
    const { data: activities, meta } = await api.searchActivities(activityFilters());

    // เติมตัวเลือกหมวดหมู่ครั้งแรกจากข้อมูลจริงในฐานข้อมูล
    const categorySelect = document.getElementById('filter-category');
    if (categorySelect && categorySelect.options.length <= 1) {
      for (const category of meta.categories) {
        categorySelect.add(new Option(categoryLabel(category), category));
      }
    }

    const countLabel = document.getElementById('filter-count');
    if (countLabel) countLabel.textContent = `พบ ${activities.length} กิจกรรม`;

    if (activities.length === 0) {
      showPlaceholder(container, 'ไม่พบกิจกรรมที่ตรงกับเงื่อนไข ลองเปลี่ยนคำค้นหรือหมวดหมู่');
      return;
    }

    container.innerHTML = activities
      .map(
        (activity) => `
      <div id="${escapeHtml(activity.slug)}" class="bg-white rounded-2xl border border-gray-200 overflow-hidden flex flex-col scroll-mt-28">
        <a href="activity.html?slug=${escapeHtml(activity.slug)}" class="relative h-64 block">
          ${activityMedia(activity, 'h-64 w-full absolute inset-0')}
          <span class="absolute top-4 right-4 bg-white rounded-full px-3 py-1.5 font-bold text-forest text-xs">${escapeHtml(categoryLabel(activity.category))}</span>
          <span class="absolute top-4 left-4 bg-forest text-white text-xs font-bold px-3.5 py-1.5 rounded-full">${escapeHtml(activity.duration_label)}</span>
          <div class="absolute bottom-0 left-0 right-0 bg-black/45 px-5 py-3">
            <p class="text-white font-extrabold text-lg">${formatTHB(activity.adult_price)} / คน</p>
          </div>
        </a>
        <div class="p-6 flex flex-col gap-3 flex-1">
          <h3 class="font-extrabold">${escapeHtml(activity.name)}</h3>
          <p class="text-sm text-gray-500">${escapeHtml(activity.description_th ?? activity.name_th)}</p>
          <div class="mt-auto grid grid-cols-2 gap-3">
            <a href="activity.html?slug=${escapeHtml(activity.slug)}"
               class="border border-forest text-forest font-bold py-3 rounded-lg text-center hover:bg-forest hover:text-white transition">รายละเอียด</a>
            <button type="button" data-book-slug="${escapeHtml(activity.slug)}"
              class="bg-gold hover:bg-gold/90 text-white font-bold py-3 rounded-lg transition">
              BOOK NOW
            </button>
          </div>
        </div>
      </div>`,
      )
      .join('');
  } catch (error) {
    showPlaceholder(container, `โหลดกิจกรรมไม่สำเร็จ: ${error.message}`, 'error');
  }
}

function initActivityFilters() {
  const form = document.getElementById('activity-filters');
  if (!form) return;

  let timer;
  form.addEventListener('submit', (event) => event.preventDefault());
  form.elements.q.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(renderActivityCards, 300);
  });
  form.elements.category.addEventListener('change', renderActivityCards);
  form.elements.sort.addEventListener('change', renderActivityCards);
  form.addEventListener('reset', () => setTimeout(renderActivityCards, 0));
}

/** มาจากปุ่ม "จอง" ของหน้าอื่น (?book=slug&date=YYYY-MM-DD) ให้เปิดหน้าต่างจองทันที */
function openBookingFromQuery() {
  if (!document.getElementById('booking-modal-overlay')) return;

  const query = new URLSearchParams(window.location.search);
  const slug = query.get('book');
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) return;

  bookingModal.open(slug, query.get('date')).catch((error) => {
    alert(`เปิดหน้าจองไม่สำเร็จ: ${error.message}`);
  });
}

/* ============================================================
   Booking Modal — 4 ขั้นตอน + หน้าสรุปผล
   ============================================================ */
const bookingModal = {
  currentStep: 1,
  totalSteps: 4,
  activity: null,
  availability: null,
  settings: {},
  lastBooking: null,
  syncContactLabel: () => {},

  async open(slug, preferredDate) {
    [this.activity, this.settings] = await Promise.all([api.getActivity(slug), loadSettings()]);
    this.currentStep = 1;
    this.availability = null;
    this.lastBooking = null;

    document.getElementById('modal-activity-name').textContent = this.activity.name;
    document.getElementById('modal-activity-subtitle').textContent = this.activity.name_th;
    document.getElementById('input-adult-price').textContent = formatTHB(this.activity.adult_price);
    document.getElementById('input-child-price').textContent = formatTHB(this.activity.child_price);

    document.getElementById('booking-form').reset();
    document.getElementById('qty-adult').value = 2;
    document.getElementById('qty-child').value = 0;
    document.getElementById('qty-infant').value = 0;

    // วันแรกที่จองได้มาจากค่า "จองล่วงหน้าอย่างน้อยกี่วัน" ในหน้าตั้งค่าระบบ
    const dateInput = document.getElementById('input-date');
    const earliest = new Date();
    earliest.setDate(earliest.getDate() + (this.settings.booking_min_lead_days ?? 1));
    const latest = new Date();
    latest.setDate(latest.getDate() + (this.settings.booking_max_advance_days ?? 365));
    dateInput.min = localDateString(earliest);
    dateInput.max = localDateString(latest);
    const wanted = /^\d{4}-\d{2}-\d{2}$/.test(preferredDate ?? '') ? preferredDate : null;
    dateInput.value = wanted && wanted >= dateInput.min && wanted <= dateInput.max ? wanted : dateInput.min;

    // สมาชิกที่ล็อกอินอยู่ไม่ต้องกรอกข้อมูลติดต่อซ้ำ
    const user = currentUser.get();
    if (user) {
      const form = document.getElementById('booking-form');
      form.elements.first_name.value = user.first_name ?? '';
      form.elements.last_name.value = user.last_name ?? '';
      form.elements.phone.value = user.phone ?? '';
      form.elements.email.value = user.email ?? '';
      form.elements.contact_app.value = user.contact_app ?? 'Line';
      form.elements.contact_id.value = user.contact_id ?? '';
    }
    // form.reset() และการเติมค่าจากบัญชีไม่ยิง event change จึงต้องปรับชื่อช่องไอดีเอง
    this.syncContactLabel();

    const online = this.onlinePayment();
    document.getElementById('payment-note-online').classList.toggle('hidden', !online);
    document.getElementById('payment-note-offline').classList.toggle('hidden', online);
    document.getElementById('cancel-hours').textContent = this.settings.cancel_free_hours ?? 72;

    this.setError('');
    this.updateTotal();
    this.renderStep();
    this.checkAvailability();

    document.getElementById('booking-success').classList.add('hidden');
    document.getElementById('booking-form').classList.remove('hidden');
    document.getElementById('booking-modal-overlay').classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
  },

  /** true เมื่อหลังบ้านเปิดรับชำระเงินออนไลน์ (PAYMENT_PROVIDER ไม่ใช่ none) */
  onlinePayment() {
    return Boolean(this.settings.payment_provider) && this.settings.payment_provider !== 'none';
  },

  close() {
    document.getElementById('booking-modal-overlay').classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
  },

  setError(message) {
    const box = document.getElementById('booking-error');
    box.textContent = message;
    box.classList.toggle('hidden', !message);
  },

  /** ถามที่ว่างจาก API ทุกครั้งที่เปลี่ยนวันที่ */
  async checkAvailability() {
    const date = document.getElementById('input-date').value;
    const label = document.getElementById('availability-label');
    if (!date || !this.activity) {
      label.textContent = '';
      return;
    }

    label.textContent = 'กำลังตรวจสอบที่ว่าง...';
    label.className = 'text-sm text-gray-500';

    try {
      this.availability = await api.getAvailability(this.activity.slug, date);
      if (this.availability.remaining === 0) {
        label.textContent = `วันนี้เต็มแล้ว (รับได้ ${this.availability.capacity} ที่/วัน) กรุณาเลือกวันอื่น`;
        label.className = 'text-sm font-semibold text-red-600';
      } else {
        label.textContent = `เหลือที่ว่าง ${this.availability.remaining} ที่ จากทั้งหมด ${this.availability.capacity} ที่`;
        label.className = 'text-sm font-semibold text-forest';
      }
    } catch (error) {
      this.availability = null;
      label.textContent = `ตรวจสอบที่ว่างไม่ได้: ${error.message}`;
      label.className = 'text-sm text-red-600';
    }
  },

  counts() {
    const read = (id) => Math.max(0, Number.parseInt(document.getElementById(id).value, 10) || 0);
    return { adults: read('qty-adult'), children: read('qty-child'), infants: read('qty-infant') };
  },

  updateTotal() {
    if (!this.activity) return 0;
    const { adults, children, infants } = this.counts();
    const total =
      adults * this.activity.adult_price +
      children * this.activity.child_price +
      infants * this.activity.infant_price;

    for (const id of ['total-amount', 'checkout-amount', 'checkout-amount-btn']) {
      const element = document.getElementById(id);
      if (element) element.textContent = formatTHB(total);
    }
    return total;
  },

  /** ตรวจข้อมูลของขั้นตอนปัจจุบันก่อนไปขั้นถัดไป */
  validateStep() {
    const { adults, children, infants } = this.counts();

    if (this.currentStep === 1) {
      const date = document.getElementById('input-date').value;
      if (!date) return 'กรุณาเลือกวันที่เข้าร่วมกิจกรรม';
      if (adults + children === 0) return 'ต้องมีผู้ใหญ่หรือเด็กอย่างน้อย 1 คน';
      if (infants > 0 && adults === 0) return 'ทารกต้องมาพร้อมผู้ใหญ่อย่างน้อย 1 คน';
      const maxGuests = this.settings.booking_max_guests ?? 30;
      if (adults + children + infants > maxGuests) {
        return `จองได้สูงสุด ${maxGuests} คนต่อหนึ่งรายการ หากมากกว่านี้กรุณาติดต่อเจ้าหน้าที่`;
      }
      if (this.availability && adults + children > this.availability.remaining) {
        return `วันที่เลือกเหลือที่ว่างเพียง ${this.availability.remaining} ที่`;
      }
    }

    if (this.currentStep === 2) {
      const form = document.getElementById('booking-form');
      if (!form.elements.first_name.value.trim()) return 'กรุณากรอกชื่อจริง';
      if (!form.elements.last_name.value.trim()) return 'กรุณากรอกนามสกุล';
      if (!/^[+()\d\s-]{6,}$/.test(form.elements.phone.value.trim())) return 'รูปแบบเบอร์โทรไม่ถูกต้อง';
      if (!form.elements.contact_id.value.trim()) {
        return `กรุณากรอก ${contactIdLabel(form.elements.contact_app.value)} เพื่อให้ทีมงานติดต่อกลับได้`;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.elements.email.value.trim()))
        return 'รูปแบบอีเมลไม่ถูกต้อง';
    }

    return null;
  },

  next() {
    const error = this.validateStep();
    if (error) {
      this.setError(error);
      return;
    }
    this.setError('');

    if (this.currentStep < this.totalSteps) {
      this.currentStep += 1;
      if (this.currentStep === this.totalSteps) this.fillSummary();
      this.renderStep();
    }
  },

  back() {
    if (this.currentStep > 1) {
      this.currentStep -= 1;
      this.setError('');
      this.renderStep();
    }
  },

  renderStep() {
    for (let i = 1; i <= this.totalSteps; i += 1) {
      document.getElementById(`step-panel-${i}`)?.classList.toggle('hidden', i !== this.currentStep);

      const circle = document.getElementById(`step-circle-${i}`);
      const label = document.getElementById(`step-label-${i}`);
      const line = document.getElementById(`step-line-${i}`);
      const done = i <= this.currentStep;

      if (circle) {
        circle.classList.toggle('bg-gold', done);
        circle.classList.toggle('text-white', done);
        circle.classList.toggle('border-transparent', done);
        circle.classList.toggle('bg-white', !done);
        circle.classList.toggle('text-gray-400', !done);
        circle.classList.toggle('border-gray-300', !done);
      }
      if (label) {
        label.classList.toggle('text-gold', i === this.currentStep);
        label.classList.toggle('font-bold', i === this.currentStep);
        label.classList.toggle('text-dark', done && i !== this.currentStep);
        label.classList.toggle('text-gray-400', !done);
      }
      if (line) {
        line.classList.toggle('bg-gold', i < this.currentStep);
        line.classList.toggle('bg-gray-300', i >= this.currentStep);
      }
    }
  },

  fillSummary() {
    const form = document.getElementById('booking-form');
    const { adults, children, infants } = this.counts();
    const pickup = form.querySelector('input[name="pickup"]:checked');

    document.getElementById('summary-visitors').textContent =
      `${adults} ผู้ใหญ่, ${children} เด็ก, ${infants} ทารก`;
    const date = document.getElementById('input-date').value;
    document.getElementById('summary-date').textContent = date ? formatDate(date) : 'ยังไม่ระบุ';
    document.getElementById('summary-pickup').textContent =
      (pickup?.dataset.label ?? 'ยังไม่ระบุ') +
      (form.elements.pickup_detail.value.trim() ? ` — ${form.elements.pickup_detail.value.trim()}` : '');
    const round = form.querySelector('input[name="pickup_round"]:checked');
    const roundTime = this.settings[`pickup_time_${round?.value ?? 'morning'}`];
    document.getElementById('summary-round').textContent =
      `${round?.dataset.label ?? 'รอบเช้า'}${roundTime ? ` — เวลารับ ${roundTime}` : ''}`;
    document.getElementById('summary-contact').textContent =
      `${form.elements.first_name.value} ${form.elements.last_name.value} · ${form.elements.phone.value} · ${form.elements.email.value} · ${form.elements.contact_app.value}: ${form.elements.contact_id.value.trim()}`;

    this.updateTotal();
  },

  /** ส่งการจองจริงไปที่ API — ราคาสุดท้ายคำนวณฝั่งเซิร์ฟเวอร์ */
  async submit() {
    const form = document.getElementById('booking-form');
    const button = document.getElementById('checkout-button');

    if (!form.elements.accept_terms.checked) {
      this.setError('กรุณายอมรับเงื่อนไขการยกเลิกก่อนยืนยันการจอง');
      return;
    }

    const { adults, children, infants } = this.counts();
    const payload = {
      activity_slug: this.activity.slug,
      booking_date: document.getElementById('input-date').value,
      adults,
      children,
      infants,
      first_name: form.elements.first_name.value.trim(),
      last_name: form.elements.last_name.value.trim(),
      phone: form.elements.phone.value.trim(),
      email: form.elements.email.value.trim(),
      contact_app: form.elements.contact_app.value,
      contact_id: form.elements.contact_id.value.trim(),
      note: form.elements.note.value.trim() || undefined,
      pickup_type: form.querySelector('input[name="pickup"]:checked')?.value ?? 'undecided',
      pickup_detail: form.elements.pickup_detail.value.trim() || undefined,
      pickup_round: form.querySelector('input[name="pickup_round"]:checked')?.value ?? 'morning',
      accept_terms: true,
    };

    button.disabled = true;
    button.classList.add('opacity-60');
    this.setError('');

    try {
      const booking = await api.createBooking(payload);
      this.showSuccess(booking);
    } catch (error) {
      this.setError(error.fullMessage ?? error.message);
      // ที่นั่งอาจถูกจองไปแล้วระหว่างที่ลูกค้ากรอกฟอร์ม จึงรีเฟรชตัวเลขที่ว่างให้ด้วย
      if (error.status === 409) this.checkAvailability();
    } finally {
      button.disabled = false;
      button.classList.remove('opacity-60');
    }
  },

  showSuccess(booking) {
    document.getElementById('booking-form').classList.add('hidden');

    const panel = document.getElementById('booking-success');
    panel.classList.remove('hidden');
    document.getElementById('success-ref').textContent = booking.booking_ref;
    document.getElementById('success-detail').textContent =
      `${booking.activity.name} · ${formatDate(booking.booking_date)} · ${booking.adults} ผู้ใหญ่, ${booking.children} เด็ก, ${booking.infants} ทารก`;
    document.getElementById('success-total').textContent = formatTHB(booking.total_amount);
    document.getElementById('success-email').textContent = booking.email;

    this.lastBooking = booking;
    const online = this.onlinePayment();
    document.getElementById('success-pay').classList.toggle('hidden', !online);
    document.getElementById('success-note-online').classList.toggle('hidden', !online);
    document.getElementById('success-note-offline').classList.toggle('hidden', online);
    document.getElementById('success-pay-amount').textContent = formatTHB(booking.total_amount);
    document.getElementById('success-manage').href = currentUser.get()
      ? 'account.html'
      : `booking.html?ref=${encodeURIComponent(booking.booking_ref)}&email=${encodeURIComponent(booking.email)}`;
  },

  /** ไปหน้าชำระเงินของการจองที่เพิ่งสร้าง */
  async pay() {
    if (!this.lastBooking) return;
    const button = document.getElementById('success-pay');
    button.disabled = true;
    button.classList.add('opacity-60');
    try {
      const checkout = await api.payBooking(this.lastBooking.booking_ref, this.lastBooking.email);
      window.location.href = checkout.checkout_url;
    } catch (error) {
      alert(error.message);
      button.disabled = false;
      button.classList.remove('opacity-60');
    }
  },
};

/* ============================================================
   ผูก event ของหน้ากิจกรรม
   ============================================================ */
function initBookingModal() {
  const overlay = document.getElementById('booking-modal-overlay');
  if (!overlay) return;

  bookingModal.syncContactLabel = bindContactApp(
    document.getElementById('input-contact-app'),
    document.getElementById('input-contact-id'),
    document.getElementById('label-contact-id'),
  );

  // ปุ่ม BOOK NOW ถูกสร้างหลังโหลดข้อมูล จึงใช้ event delegation
  document.addEventListener('click', (event) => {
    const bookButton = event.target.closest('[data-book-slug]');
    if (bookButton) {
      bookingModal.open(bookButton.dataset.bookSlug).catch((error) => {
        alert(`เปิดหน้าจองไม่สำเร็จ: ${error.message}`);
      });
      return;
    }

    const action = event.target.closest('[data-modal-action]')?.dataset.modalAction;
    if (action === 'close') bookingModal.close();
    if (action === 'next') bookingModal.next();
    if (action === 'back') bookingModal.back();
    if (action === 'submit') bookingModal.submit();
    if (action === 'pay') bookingModal.pay();

    // ปุ่ม +/- ของช่องจำนวนคน
    const stepper = event.target.closest('[data-qty-btn]');
    if (stepper) {
      const input = document.getElementById(stepper.dataset.target);
      const delta = stepper.dataset.qtyBtn === 'inc' ? 1 : -1;
      input.value = Math.max(0, (Number.parseInt(input.value, 10) || 0) + delta);
      bookingModal.updateTotal();
    }
  });

  // คลิกพื้นหลังนอกกล่องเพื่อปิด
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) bookingModal.close();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !overlay.classList.contains('hidden')) bookingModal.close();
  });

  document.getElementById('input-date')?.addEventListener('change', () => {
    bookingModal.checkAvailability();
  });

  for (const id of ['qty-adult', 'qty-child', 'qty-infant']) {
    document.getElementById(id)?.addEventListener('input', () => bookingModal.updateTotal());
  }

  // ปล่อยให้ Enter ในฟอร์มไม่ submit หน้าไปเอง (เราคุมขั้นตอนเอง)
  document.getElementById('booking-form')?.addEventListener('submit', (event) => event.preventDefault());

  // พอผู้ใช้เริ่มแก้ข้อมูล ให้ซ่อนข้อความเตือนเดิม ไม่งั้นจะค้างอยู่ทั้งที่แก้แล้ว
  for (const type of ['input', 'change']) {
    document.getElementById('booking-form')?.addEventListener(type, () => bookingModal.setError(''));
  }
}

/* ============================================================
   เริ่มทำงาน
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  initSite();
  initBookingModal();
  initActivityFilters();
  openBookingFromQuery();

  renderHomeActivities();
  renderReviews();
  renderFaqs();
  initInquiryForm();
  renderActivityCards();
});

export { bookingModal };
