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
