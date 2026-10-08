// ===== Mobile nav toggle =====
document.addEventListener('DOMContentLoaded', () => {
  const navToggle = document.getElementById('nav-toggle');
  const mobileMenu = document.getElementById('mobile-menu');
  if (navToggle && mobileMenu) {
    navToggle.addEventListener('click', () => {
      mobileMenu.classList.toggle('hidden');
    });
  }
});

// ===== Booking Modal (4 steps: Package -> Contact -> Pick-Up -> Payment) =====
const bookingModal = {
  currentStep: 1,
  totalSteps: 4,
  activity: { name: '', nameTh: '', adultPrice: 0, childPrice: 0 },

  open(activity) {
    this.activity = activity;
    this.currentStep = 1;

    document.getElementById('modal-activity-name').textContent = activity.name;
    document.getElementById('modal-activity-subtitle').textContent = activity.nameTh;
    document.getElementById('input-adult-price').textContent = activity.adultPrice.toLocaleString() + ' ฿';
    document.getElementById('input-child-price').textContent = activity.childPrice.toLocaleString() + ' ฿';

    document.getElementById('qty-adult').value = 2;
    document.getElementById('qty-child').value = 0;
    document.getElementById('qty-infant').value = 0;

    this.updateTotal();
    this.renderStep();

    document.getElementById('booking-modal-overlay').classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
  },

  close() {
    document.getElementById('booking-modal-overlay').classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
  },

  next() {
    if (this.currentStep < this.totalSteps) {
      this.currentStep++;
      if (this.currentStep === 4) this.fillSummary();
      this.renderStep();
    }
  },

  back() {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.renderStep();
    }
  },

  renderStep() {
    for (let i = 1; i <= this.totalSteps; i++) {
      const panel = document.getElementById('step-panel-' + i);
      if (panel) panel.classList.toggle('hidden', i !== this.currentStep);

      const circle = document.getElementById('step-circle-' + i);
      const label = document.getElementById('step-label-' + i);
      const line = document.getElementById('step-line-' + i);
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

  updateTotal() {
    const adultQty = parseInt(document.getElementById('qty-adult').value) || 0;
    const childQty = parseInt(document.getElementById('qty-child').value) || 0;
    const total = adultQty * this.activity.adultPrice + childQty * this.activity.childPrice;
    document.getElementById('total-amount').textContent = total.toLocaleString() + ' ฿';
    document.getElementById('checkout-amount').textContent = total.toLocaleString() + ' ฿';
    const btnAmount = document.getElementById('checkout-amount-btn');
    if (btnAmount) btnAmount.textContent = total.toLocaleString() + ' ฿';
    return total;
  },

  fillSummary() {
    const adultQty = document.getElementById('qty-adult').value || 0;
    const childQty = document.getElementById('qty-child').value || 0;
    const infantQty = document.getElementById('qty-infant').value || 0;
    const date = document.getElementById('input-date').value || 'ยังไม่ระบุ';
    const firstName = document.getElementById('input-firstname').value || '-';
    const lastName = document.getElementById('input-lastname').value || '-';
    const phone = document.getElementById('input-phone').value || '-';
    const email = document.getElementById('input-email').value || '-';

    let pickup = 'ยังไม่ระบุ';
    const pickupChecked = document.querySelector('input[name="pickup"]:checked');
    if (pickupChecked) pickup = pickupChecked.value;

    document.getElementById('summary-visitors').textContent = `${adultQty} ผู้ใหญ่, ${childQty} เด็ก, ${infantQty} ทารก`;
    document.getElementById('summary-date').textContent = date;
    document.getElementById('summary-pickup').textContent = pickup;
    document.getElementById('summary-contact').textContent = `${firstName} ${lastName} · ${phone} · ${email}`;

    this.updateTotal();
  },

  checkout() {
    const total = document.getElementById('checkout-amount').textContent;
    alert('จำลองการชำระเงิน\n\nยอดชำระ: ' + total + '\n\n(เชื่อมต่อระบบชำระเงินจริง เช่น Stripe/Omise ที่นี่)');
    this.close();
  }
};

// Quantity stepper buttons
document.addEventListener('click', (e) => {
  if (e.target.matches('[data-qty-btn]')) {
    const targetId = e.target.getAttribute('data-target');
    const action = e.target.getAttribute('data-qty-btn');
    const input = document.getElementById(targetId);
    let val = parseInt(input.value) || 0;
    val = action === 'inc' ? val + 1 : Math.max(0, val - 1);
    input.value = val;
    bookingModal.updateTotal();
  }
});

// ===== Horizontal carousel: left/right arrows scroll one item at a time =====
function setupCarousel(grid, prev, next) {
  if (!grid || !prev || !next) return;

  const step = () => {
    const item = grid.firstElementChild;
    return item ? item.getBoundingClientRect().width + parseFloat(getComputedStyle(grid).columnGap || 0) : grid.clientWidth;
  };
  const updateArrows = () => {
    prev.disabled = grid.scrollLeft <= 4;
    next.disabled = grid.scrollLeft + grid.clientWidth >= grid.scrollWidth - 4;
  };
  prev.addEventListener('click', () => grid.scrollBy({ left: -step(), behavior: 'smooth' }));
  next.addEventListener('click', () => grid.scrollBy({ left: step(), behavior: 'smooth' }));
  grid.addEventListener('scroll', updateArrows, { passive: true });
  window.addEventListener('resize', updateArrows);
  updateArrows();
}

// ===== Google reviews (data in reviews.js) =====
document.addEventListener('DOMContentLoaded', () => {
  const grid = document.getElementById('reviews-grid');
  if (!grid || typeof googleReviews === 'undefined') return;

  const stars = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  const summary = document.getElementById('reviews-summary');
  summary.href = googleReviews.url;
  document.getElementById('reviews-rating').textContent = googleReviews.rating.toFixed(1);
  document.getElementById('reviews-stars').textContent = stars(Math.round(googleReviews.rating));
  document.getElementById('reviews-total').textContent = googleReviews.total.toLocaleString() + ' reviews on Google';
  summary.classList.replace('hidden', 'inline-flex');
  document.getElementById('reviews-more').href = googleReviews.url;

  googleReviews.reviews.filter((r) => r.rating >= 4).forEach((review) => {
    const card = el('div', 'bg-[#FFFFFF] rounded-2xl shadow-md px-6 py-6 flex flex-col gap-4 shrink-0 snap-start w-[85%] md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)]');

    const head = el('div', 'flex items-center justify-between gap-3');
    const who = el('a', 'flex items-center gap-3 min-w-0');
    who.href = review.profileUrl;
    who.target = '_blank';
    who.rel = 'noopener';

    const initial = el('span', 'h-11 w-11 shrink-0 rounded-full bg-forest text-white font-bold flex items-center justify-center', review.author.charAt(0));
    if (review.avatar) {
      const img = el('img', 'h-11 w-11 shrink-0 rounded-full object-cover');
      img.src = review.avatar;
      img.alt = review.author;
      img.loading = 'lazy';
      img.referrerPolicy = 'no-referrer';
      img.addEventListener('error', () => img.replaceWith(initial));
      who.appendChild(img);
    } else {
      who.appendChild(initial);
    }

    const meta = el('div', 'min-w-0');
    meta.appendChild(el('p', 'font-bold text-lg leading-tight truncate', review.author));
    const sub = el('p', 'text-sm');
    sub.appendChild(el('span', 'text-[#F2B33D] tracking-wider', stars(review.rating)));
    sub.appendChild(el('span', 'text-gray-500 ml-2', review.date));
    meta.appendChild(sub);
    who.appendChild(meta);

    head.appendChild(who);
    head.appendChild(el('span', 'bg-[#3B6FD8] text-white text-xs font-bold px-3 py-1 rounded-full', 'Google'));
    card.appendChild(head);

    const text = el('p', 'text-sm text-gray-600 leading-relaxed whitespace-pre-line line-clamp-6', review.text);
    card.appendChild(text);

    if (review.text.length > 280) {
      const toggle = el('button', 'text-forest-dark font-bold text-sm self-start hover:underline', 'Read more');
      toggle.type = 'button';
      toggle.addEventListener('click', () => {
        const collapsed = text.classList.toggle('line-clamp-6');
        toggle.textContent = collapsed ? 'Read more' : 'Show less';
      });
      card.appendChild(toggle);
    }

    grid.appendChild(card);
  });

  setupCarousel(grid, document.getElementById('reviews-prev'), document.getElementById('reviews-next'));
});

// ===== Story page: herd photo carousel =====
document.addEventListener('DOMContentLoaded', () => {
  setupCarousel(document.getElementById('herd-grid'), document.getElementById('herd-prev'), document.getElementById('herd-next'));
});

// ===== FAQ page: open the question linked from the home page (faq.html#faq-N) =====
document.addEventListener('DOMContentLoaded', () => {
  const openFromHash = () => {
    if (!location.hash) return;
    const target = document.getElementById(location.hash.slice(1));
    if (target && target.tagName === 'DETAILS') {
      target.open = true;
      target.scrollIntoView({ block: 'start' });
    }
  };
  openFromHash();
  window.addEventListener('hashchange', openFromHash);
});

// ===== Home FAQ box: arrow scrolls the question list to the bottom =====
document.addEventListener('DOMContentLoaded', () => {
  const faqList = document.getElementById('faq-list');
  const faqScrollDown = document.getElementById('faq-scroll-down');
  if (!faqList || !faqScrollDown) return;
  faqScrollDown.addEventListener('click', () => {
    faqList.scrollTo({ top: faqList.scrollHeight, behavior: 'smooth' });
  });
});
