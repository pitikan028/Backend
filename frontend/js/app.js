import { api, ApiRequestError, formatTHB } from './api.js';

/* ============================================================
   เมนูมือถือ
   ============================================================ */
function initMobileNav() {
  const navToggle = document.getElementById('nav-toggle');
  const mobileMenu = document.getElementById('mobile-menu');
  if (!navToggle || !mobileMenu) return;

  navToggle.addEventListener('click', () => mobileMenu.classList.toggle('hidden'));
}

/* ============================================================
   ตัวช่วยเล็ก ๆ
   ============================================================ */
const escapeHtml = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char],
  );

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

/** รูปกิจกรรม ถ้าไม่มีไฟล์จริงให้ถอยกลับไปใช้ลายทแยง .img-placeholder เดิม */
function activityMedia(activity, extraClasses = '') {
  if (!activity.image_url) {
    return `<div class="img-placeholder ${extraClasses}"></div>`;
  }
  return `<img src="${escapeHtml(activity.image_url)}" alt="${escapeHtml(activity.name_th)}"
    class="${extraClasses} object-cover w-full"
    onerror="this.classList.add('img-placeholder');this.removeAttribute('src');">`;
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
          <h3 class="font-bold text-lg">${escapeHtml(activity.name)}</h3>
          <p class="text-sm text-gray-500">${escapeHtml(activity.description_th ?? activity.name_th)}</p>
          <p class="text-xs font-semibold text-forest">${escapeHtml(activity.duration_label)}</p>
          <div class="flex items-center justify-between mt-2">
            <span class="font-extrabold text-lg">${formatTHB(activity.adult_price)} / คน</span>
            <a href="activities.html#${escapeHtml(activity.slug)}"
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
   หน้ากิจกรรม — การ์ด 6 เซ็ท
   ============================================================ */
async function renderActivityCards() {
  const container = document.getElementById('activity-cards');
  if (!container) return;

  showPlaceholder(container, 'กำลังโหลดกิจกรรม...');

  try {
    const activities = await api.listActivities();
    bookingModal.activities = activities;

    container.innerHTML = activities
      .map(
        (activity, index) => `
      <div id="${escapeHtml(activity.slug)}" class="bg-white rounded-2xl border border-gray-200 overflow-hidden flex flex-col scroll-mt-28">
        <div class="relative h-64">
          ${activityMedia(activity, 'h-64 w-full absolute inset-0')}
          <span class="absolute top-4 right-4 w-9 h-9 bg-white rounded-full flex items-center justify-center font-extrabold text-forest text-sm">${index + 1}</span>
          <span class="absolute top-4 left-4 bg-forest text-white text-xs font-bold px-3.5 py-1.5 rounded-full">${escapeHtml(activity.duration_label)}</span>
          <div class="absolute bottom-0 left-0 right-0 bg-black/45 px-5 py-3">
            <p class="text-white font-extrabold text-lg">${formatTHB(activity.adult_price)} / คน</p>
          </div>
        </div>
        <div class="p-6 flex flex-col gap-3 flex-1">
          <h3 class="font-extrabold">${escapeHtml(activity.name)}</h3>
          <p class="text-sm text-gray-500">${escapeHtml(activity.description_th ?? activity.name_th)}</p>
          <button type="button" data-book-slug="${escapeHtml(activity.slug)}"
            class="mt-auto bg-gold hover:bg-gold/90 text-white font-bold py-3 rounded-lg transition">
            BOOK NOW
          </button>
        </div>
      </div>`,
      )
      .join('');

    // ถ้ามาจากลิงก์ #slug ให้เลื่อนไปที่การ์ดนั้น (การ์ดเพิ่งถูกสร้างหลังโหลดเสร็จ)
    if (window.location.hash.length > 1) {
      document.getElementById(window.location.hash.slice(1))?.scrollIntoView({ behavior: 'smooth' });
    }
  } catch (error) {
    showPlaceholder(container, `โหลดกิจกรรมไม่สำเร็จ: ${error.message}`, 'error');
  }
}

/* ============================================================
   Booking Modal — 4 ขั้นตอน + หน้าสรุปผล
   ============================================================ */
const bookingModal = {
  currentStep: 1,
  totalSteps: 4,
  activities: [],
  activity: null,
  availability: null,

  async open(slug) {
    this.activity = this.activities.find((item) => item.slug === slug) ?? (await api.getActivity(slug));
    this.currentStep = 1;
    this.availability = null;

    document.getElementById('modal-activity-name').textContent = this.activity.name;
    document.getElementById('modal-activity-subtitle').textContent = this.activity.name_th;
    document.getElementById('input-adult-price').textContent = formatTHB(this.activity.adult_price);
    document.getElementById('input-child-price').textContent = formatTHB(this.activity.child_price);

    document.getElementById('booking-form').reset();
    document.getElementById('qty-adult').value = 2;
    document.getElementById('qty-child').value = 0;
    document.getElementById('qty-infant').value = 0;

    // ค่าเริ่มต้นของวันที่ = พรุ่งนี้ และกันไม่ให้เลือกวันที่เลยไปแล้ว
    const dateInput = document.getElementById('input-date');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    dateInput.min = tomorrow.toISOString().slice(0, 10);
    dateInput.value = tomorrow.toISOString().slice(0, 10);

    this.setError('');
    this.updateTotal();
    this.renderStep();
    this.checkAvailability();

    document.getElementById('booking-success').classList.add('hidden');
    document.getElementById('booking-form').classList.remove('hidden');
    document.getElementById('booking-modal-overlay').classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
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
      if (this.availability && adults + children > this.availability.remaining) {
        return `วันที่เลือกเหลือที่ว่างเพียง ${this.availability.remaining} ที่`;
      }
    }

    if (this.currentStep === 2) {
      const form = document.getElementById('booking-form');
      if (!form.elements.first_name.value.trim()) return 'กรุณากรอกชื่อจริง';
      if (!form.elements.last_name.value.trim()) return 'กรุณากรอกนามสกุล';
      if (!/^[+()\d\s-]{6,}$/.test(form.elements.phone.value.trim())) return 'รูปแบบเบอร์โทรไม่ถูกต้อง';
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
    document.getElementById('summary-date').textContent =
      document.getElementById('input-date').value || 'ยังไม่ระบุ';
    document.getElementById('summary-pickup').textContent =
      (pickup?.dataset.label ?? 'ยังไม่ระบุ') +
      (form.elements.pickup_detail.value.trim() ? ` — ${form.elements.pickup_detail.value.trim()}` : '');
    document.getElementById('summary-contact').textContent =
      `${form.elements.first_name.value} ${form.elements.last_name.value} · ${form.elements.phone.value} · ${form.elements.email.value}`;

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
      note: form.elements.note.value.trim() || undefined,
      pickup_type: form.querySelector('input[name="pickup"]:checked')?.value ?? 'undecided',
      pickup_detail: form.elements.pickup_detail.value.trim() || undefined,
      accept_terms: true,
    };

    button.disabled = true;
    button.classList.add('opacity-60');
    this.setError('');

    try {
      const booking = await api.createBooking(payload);
      this.showSuccess(booking);
    } catch (error) {
      const detail =
        error instanceof ApiRequestError && error.details?.length
          ? ` (${error.details.map((item) => item.message).join(', ')})`
          : '';
      this.setError(error.message + detail);
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
      `${booking.activity.name} · ${booking.booking_date} · ${booking.adults} ผู้ใหญ่, ${booking.children} เด็ก, ${booking.infants} ทารก`;
    document.getElementById('success-total').textContent = formatTHB(booking.total_amount);
    document.getElementById('success-email').textContent = booking.email;
  },
};

/* ============================================================
   ผูก event ของหน้ากิจกรรม
   ============================================================ */
function initBookingModal() {
  const overlay = document.getElementById('booking-modal-overlay');
  if (!overlay) return;

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
}

/* ============================================================
   เริ่มทำงาน
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  initMobileNav();
  initBookingModal();

  renderHomeActivities();
  renderReviews();
  renderFaqs();
  initInquiryForm();
  renderActivityCards();
});

export { bookingModal };
