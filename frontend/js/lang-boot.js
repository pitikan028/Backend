/**
 * โหลดใน <head> ของทุกหน้า (สคริปต์ธรรมดา ไม่ใช่ module) เพื่อรู้ภาษาที่เลือกก่อนหน้าเว็บถูกวาด
 *   - ตั้ง <html lang> ให้สคริปต์อื่นของหน้าใช้ (เช่น วันที่ของ Blog)
 *   - หน้าไทย: ซ่อนหน้าไว้ชั่วครู่จนกว่า js/i18n.js จะแปลเสร็จ ไม่ให้เห็นภาษาอังกฤษแวบขึ้นมาก่อน
 * หน้าไหนลืมใส่ไฟล์นี้ยังสลับภาษาได้ตามปกติ แค่จะเห็นข้อความอังกฤษแวบหนึ่งตอนโหลด
 */
(function () {
  var KEY = 'chokchai.lang';
  var lang = null;
  try {
    var fromUrl = new URLSearchParams(window.location.search).get('lang');
    if (fromUrl === 'th' || fromUrl === 'en') localStorage.setItem(KEY, fromUrl);
    lang = localStorage.getItem(KEY);
  } catch (error) {
    /* localStorage ใช้ไม่ได้ — ใช้ภาษาเริ่มต้น */
  }

  var root = document.documentElement;
  root.lang = lang === 'th' ? 'th' : 'en';
  if (root.lang !== 'th') return;

  var style = document.createElement('style');
  style.textContent = 'html.i18n-loading body { visibility: hidden; }';
  document.head.appendChild(style);
  root.classList.add('i18n-loading');
  // กันหน้าขาวค้าง ถ้าสคริปต์แปลภาษาโหลดไม่สำเร็จ
  setTimeout(function () {
    root.classList.remove('i18n-loading');
  }, 2500);
})();
