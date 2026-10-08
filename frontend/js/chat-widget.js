/**
 * ปุ่ม WhatsApp ลอยมุมขวาล่าง — กดแล้วเปิดกล่องแชตเล็ก ๆ ก่อน แล้วปุ่ม Start Chat จึงพาไป WhatsApp
 * ใช้ CSS ของตัวเอง (ไม่พึ่ง Tailwind) เพราะบางหน้าใช้ Tailwind จาก CDN บางหน้าใช้ไฟล์ที่ build ไว้
 */
import { t } from './i18n.js';

// เบอร์ WhatsApp ของปางช้าง รูปแบบสากลไม่มีเครื่องหมาย + (66 = ประเทศไทย)
// หน้าไหนมีปุ่ม wa.me เดิมของดีไซน์อยู่ จะใช้เบอร์จากปุ่มนั้นแทน
const DEFAULT_NUMBER = '66651234567';

const WHATSAPP_ICON =
  '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.04 2c-5.46 0-9.9 4.44-9.9 9.9 0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.9-4.44 9.9-9.9S17.5 2 12.04 2zm0 18.02c-1.5 0-2.97-.4-4.24-1.16l-.3-.18-3.12.82.83-3.04-.2-.31a8.15 8.15 0 01-1.25-4.35c0-4.51 3.67-8.18 8.18-8.18 2.18 0 4.23.85 5.78 2.4a8.12 8.12 0 012.4 5.79c0 4.51-3.67 8.21-8.18 8.21zm4.48-6.13c-.25-.12-1.45-.71-1.67-.8-.22-.08-.39-.12-.55.13-.16.24-.63.79-.78.96-.14.16-.29.18-.53.06-.25-.12-1.04-.38-1.98-1.22-.73-.65-1.23-1.46-1.37-1.71-.14-.24-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.14.16-.24.24-.4.08-.16.04-.31-.02-.43-.06-.12-.55-1.33-.76-1.82-.2-.48-.4-.42-.55-.42h-.47c-.16 0-.43.06-.65.31-.22.24-.86.84-.86 2.04 0 1.2.88 2.36 1 2.53.12.16 1.74 2.66 4.22 3.72.59.25 1.05.4 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.45-.59 1.65-1.16.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.47-.28z"/></svg>';

const CSS = `
.cw-root { position: fixed; right: 24px; bottom: 24px; z-index: 60; font-family: Inter, "Noto Sans Thai", system-ui, sans-serif; }
.cw-toggle { width: 64px; height: 64px; border: 0; border-radius: 9999px; background: #25D366; color: #fff; cursor: pointer;
  display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 25px rgba(0,0,0,.25); transition: transform .15s ease; }
.cw-toggle:hover { transform: scale(1.05); }
.cw-toggle:focus-visible, .cw-start:focus-visible, .cw-close:focus-visible { outline: 3px solid #183420; outline-offset: 3px; }
.cw-toggle svg { width: 32px; height: 32px; }
.cw-panel { position: absolute; right: 0; bottom: 80px; width: min(340px, calc(100vw - 32px)); background: #fff; border-radius: 16px;
  overflow: hidden; box-shadow: 0 20px 45px rgba(0,0,0,.28); transform-origin: bottom right; transition: opacity .18s ease, transform .18s ease; }
.cw-panel[hidden] { display: block; opacity: 0; transform: scale(.9) translateY(8px); pointer-events: none; visibility: hidden; }
.cw-head { background: #1EBE5A; color: #fff; padding: 18px 44px 18px 18px; display: flex; align-items: center; gap: 14px; position: relative; }
.cw-avatar { position: relative; flex: none; width: 52px; height: 52px; border-radius: 9999px; background: #fff; display: flex; align-items: center; justify-content: center; }
.cw-avatar img { width: 42px; height: 42px; object-fit: contain; border-radius: 9999px; }
.cw-avatar::after { content: ""; position: absolute; right: 1px; bottom: 1px; width: 12px; height: 12px; border-radius: 9999px; background: #4AD504; border: 2px solid #1EBE5A; }
.cw-name { font-weight: 700; font-size: 17px; line-height: 1.25; margin: 0; }
.cw-status { font-size: 13px; opacity: .95; margin: 3px 0 0; }
.cw-close { position: absolute; top: 10px; right: 10px; width: 28px; height: 28px; border: 0; border-radius: 9999px; background: rgba(255,255,255,.2);
  color: #fff; font-size: 18px; line-height: 1; cursor: pointer; }
.cw-close:hover { background: rgba(255,255,255,.35); }
.cw-body { background: #E6DDD4; padding: 22px 18px 26px; }
.cw-bubble { position: relative; background: #fff; border-radius: 0 10px 10px 10px; padding: 10px 14px 8px; max-width: 85%; color: #111;
  font-size: 15px; line-height: 1.45; box-shadow: 0 1px 1px rgba(0,0,0,.12); }
.cw-bubble::before { content: ""; position: absolute; left: -8px; top: 0; border-style: solid; border-width: 0 8px 10px 0; border-color: transparent #fff transparent transparent; }
.cw-time { display: block; text-align: right; font-size: 11px; color: #8a8a8a; margin-top: 4px; }
.cw-foot { background: #fff; padding: 14px 18px 18px; }
.cw-start { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; box-sizing: border-box; background: #1EBE5A; color: #fff;
  font-weight: 700; font-size: 16px; text-decoration: none; padding: 12px 16px; border-radius: 9999px; transition: background .15s ease; }
.cw-start:hover { background: #17a34c; }
.cw-start svg { width: 20px; height: 20px; }
@media (max-width: 480px) { .cw-root { right: 16px; bottom: 16px; } }
@media (prefers-reduced-motion: reduce) { .cw-panel, .cw-toggle { transition: none; } }
`;

let started = false;

export function initChatWidget() {
  if (started) return;
  started = true;

  // ปุ่ม wa.me แบบลิงก์ตรงของดีไซน์เดิม (หน้าแรก / FAQ / Our Story) ถูกแทนด้วยปุ่มนี้
  let number = DEFAULT_NUMBER;
  for (const link of document.querySelectorAll('a.fixed[href*="wa.me/"]')) {
    number = link.href.match(/wa\.me\/(\d+)/)?.[1] ?? number;
    link.remove();
  }

  const greeting = t('Hello, What can we help you with today?', 'สวัสดีครับ วันนี้มีอะไรให้เราช่วยไหมครับ?');
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.append(style);

  const root = document.createElement('div');
  root.className = 'cw-root';
  root.setAttribute('data-no-i18n', '');
  root.innerHTML = `
    <div class="cw-panel" id="cw-panel" role="dialog" aria-label="${t('Chat with us on WhatsApp', 'แชตกับเราทาง WhatsApp')}" hidden>
      <div class="cw-head">
        <span class="cw-avatar"><img src="images/Logo.webp" alt="" /></span>
        <div>
          <p class="cw-name">Chokchai Elephant Camp</p>
          <p class="cw-status">${t('Typically replies in a few hours', 'ปกติตอบกลับภายในไม่กี่ชั่วโมง')}</p>
        </div>
        <button type="button" class="cw-close" aria-label="${t('Close chat', 'ปิดหน้าต่างแชต')}">&times;</button>
      </div>
      <div class="cw-body">
        <div class="cw-bubble">${greeting}<span class="cw-time">${time}</span></div>
      </div>
      <div class="cw-foot">
        <a class="cw-start" target="_blank" rel="noopener"
           href="https://wa.me/${number}?text=${encodeURIComponent(t('Hello, I would like to ask about your activities.', 'สวัสดีครับ ขอสอบถามเกี่ยวกับกิจกรรมหน่อยครับ'))}">
          ${WHATSAPP_ICON}<span>${t('Start Chat', 'เริ่มแชต')}</span>
        </a>
      </div>
    </div>
    <button type="button" class="cw-toggle" aria-controls="cw-panel" aria-expanded="false"
            aria-label="${t('Chat with us on WhatsApp', 'แชตกับเราทาง WhatsApp')}">${WHATSAPP_ICON}</button>`;
  document.body.append(root);

  const panel = root.querySelector('.cw-panel');
  const toggle = root.querySelector('.cw-toggle');
  const setOpen = (open) => {
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
  };

  toggle.addEventListener('click', () => setOpen(panel.hidden));
  root.querySelector('.cw-close').addEventListener('click', () => {
    setOpen(false);
    toggle.focus();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !panel.hidden) setOpen(false);
  });
  // คลิกที่อื่นนอกกล่องเพื่อปิด
  document.addEventListener('click', (event) => {
    if (!panel.hidden && !root.contains(event.target)) setOpen(false);
  });
}
