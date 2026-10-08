import { api } from './api.js';
import { loadSettings, renderAuthNav } from './common.js';
import { lang, t } from './i18n.js';

/* ============================================================
   หน้าแรก — ฟอร์ม Send us Your Question → POST /api/inquiries
   หา element จากโครงสร้างของ section #contact เอง จึงไม่ต้องแก้ HTML ของหน้าแรก
   ============================================================ */
function initInquiryForm() {
  const section = document.getElementById('contact');
  const contactInput = section?.querySelector('input[type="text"]');
  const messageInput = section?.querySelector('textarea');
  const submit = messageInput?.parentElement.querySelector('button');
  if (!contactInput || !messageInput || !submit) return;

  const status = document.createElement('p');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  submit.after(status);

  const setStatus = (text, ok) => {
    status.textContent = text;
    status.className = `text-sm font-semibold ${ok ? 'text-forest' : 'text-red-600'}`;
  };

  submit.addEventListener('click', async (event) => {
    event.preventDefault();

    const contact = contactInput.value.trim();
    const message = messageInput.value.trim();

    if (!contact || !message) {
      setStatus(t('Please enter your contact details and your question.', 'กรุณากรอกช่องทางติดต่อและคำถามให้ครบ'), false);
      return;
    }

    submit.disabled = true;
    submit.classList.add('opacity-60');
    setStatus(t('Sending...', 'กำลังส่ง...'), true);

    try {
      const result = await api.sendInquiry({ contact, message });
      // ข้อความตอบรับจาก API เป็นภาษาไทย
      setStatus(t('Thank you! We have received your question and will reply within 24 hours.', result.message), true);
      contactInput.value = '';
      messageInput.value = '';
    } catch (error) {
      setStatus(error.message, false);
    } finally {
      submit.disabled = false;
      submit.classList.remove('opacity-60');
    }
  });
}

/* เติมค่าตั้งระบบจากหลังบ้าน (เช่น เวลาเปิดทำการ) ลงใน element ที่มี data-setting
   ไม่ใช้ initSite() ของ common.js เพราะเมนูมือถือของหน้านี้ผูกไว้ใน script.js แล้ว */
async function applySettings() {
  const settings = await loadSettings();
  for (const element of document.querySelectorAll('[data-setting]')) {
    const value = settings[element.dataset.setting];
    // หน้าอังกฤษตัดหน่วยเวลา "น." ที่แอดมินพิมพ์เป็นไทยออก
    if (value !== undefined && value !== '') element.textContent = lang === 'th' ? value : String(value).replace(/\s*น\.\s*$/, '');
  }
}

// module script ถูก defer อยู่แล้ว ตอนรันถึงตรงนี้ DOM พร้อมใช้งาน
renderAuthNav();
applySettings();
initInquiryForm();
