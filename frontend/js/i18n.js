/**
 * สลับภาษาอังกฤษ / ไทยของเว็บหน้าบ้าน
 *
 * ต้นฉบับของทุกหน้าเป็นภาษาอังกฤษ เวอร์ชันไทยได้จากการแปลตอนแสดงผล มีกติกา 2 ข้อ
 *   1. ข้อความคงที่ (ใน HTML หรือที่ JavaScript สร้าง) — เพิ่มคู่ "อังกฤษ: ไทย" ใน js/i18n-th.js
 *      ไม่ต้องแก้ HTML จึงวางไฟล์ดีไซน์ใหม่ทับได้เลย ข้อความไหนไม่มีในพจนานุกรมจะแสดงเป็นอังกฤษตามเดิม
 *   2. ข้อความที่มีตัวแปรแทรก — ใช้ t('English ' + n, 'ไทย ' + n) ในโค้ด
 *
 * ภาษาที่เลือกเก็บใน localStorage และบังคับผ่านลิงก์ได้ด้วย ?lang=th หรือ ?lang=en
 * หลังบ้าน (admin.html) ไม่ได้ใช้ไฟล์นี้ ยังเป็นภาษาไทยอย่างเดียว
 */
import { ATTRIBUTES_EN, HIDDEN_IN_BOTH, PATTERNS, TEXT } from './i18n-th.js';

const STORAGE_KEY = 'chokchai.lang';
const LANGS = ['en', 'th'];

function detectLang() {
  let stored = null;
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('lang');
    if (LANGS.includes(fromUrl)) localStorage.setItem(STORAGE_KEY, fromUrl);
    stored = localStorage.getItem(STORAGE_KEY);
  } catch {
    /* โหมดส่วนตัวของบางเบราว์เซอร์ปิด localStorage — ใช้ภาษาเริ่มต้น */
  }
  return LANGS.includes(stored) ? stored : 'en';
}

export const lang = detectLang();
export const isThai = lang === 'th';
/** locale สำหรับ toLocaleDateString / toLocaleString */
export const locale = isThai ? 'th-TH' : 'en-GB';

/** เลือกข้อความตามภาษาปัจจุบัน ใช้กับข้อความที่มีตัวแปรแทรก */
export const t = (en, th) => (isThai ? th : en);

const normalize = (text) => text.replace(/\s+/g, ' ').trim();

/** แปลข้อความคงที่ด้วยพจนานุกรม คืนค่าเดิมถ้าไม่มีคำแปล (หรือกำลังแสดงภาษาอังกฤษ) */
export function translate(text) {
  if (!isThai || text == null) return text;
  const key = normalize(String(text));
  if (!key) return text;
  if (Object.hasOwn(TEXT, key)) return TEXT[key];
  for (const [pattern, replacement] of PATTERNS) {
    if (pattern.test(key)) return key.replace(pattern, replacement);
  }
  return text;
}

export function setLang(next) {
  if (!LANGS.includes(next) || next === lang) return;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* เก็บไม่ได้ก็ยังสลับได้ด้วย ?lang= ด้านล่าง */
  }
  // ทั้งหน้าถูกสร้างตามภาษาตอนโหลด จึงโหลดใหม่แทนการไล่แก้ทีละจุด
  const url = new URL(window.location.href);
  url.searchParams.set('lang', next);
  window.location.replace(url);
}

/* ============================================================
   แปล DOM
   ============================================================ */
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'NOSCRIPT']);
const ATTRIBUTES = ['placeholder', 'title', 'aria-label', 'alt', 'data-label'];
const hiddenInBoth = new Set(HIDDEN_IN_BOTH);

const skipped = (node) => {
  for (let element = node.parentElement; element; element = element.parentElement) {
    if (SKIP_TAGS.has(element.tagName) || element.hasAttribute('data-no-i18n')) return true;
  }
  return false;
};

function translateTextNode(node) {
  const original = node.nodeValue;
  const key = normalize(original);
  if (!key || skipped(node)) return;

  // คำบรรยายภาษาไทยที่ดีไซน์วางคู่กับชื่ออังกฤษ (เช่น Dining Hall / โรงอาหาร) —
  // หน้าอังกฤษต้องเป็นอังกฤษล้วน ส่วนหน้าไทยชื่อหลักถูกแปลเป็นคำเดียวกันอยู่แล้ว จึงซ่อนทั้งสองภาษา
  if (hiddenInBoth.has(key) && node.parentElement.childNodes.length === 1) {
    node.parentElement.hidden = true;
    return;
  }

  const translated = translate(key);
  if (translated === key) return;
  // คงช่องว่างหน้า/หลังเดิมไว้ ข้อความที่อยู่ติดกับแท็กอื่นจะได้ไม่ชิดกัน
  const lead = original.match(/^\s*/)[0] ? ' ' : '';
  const trail = original.match(/\s*$/)[0] ? ' ' : '';
  node.nodeValue = lead + translated + trail;
}

function translateAttributes(element) {
  for (const name of ATTRIBUTES) {
    const value = element.getAttribute?.(name);
    if (!value) continue;
    const next = isThai ? translate(value) : (ATTRIBUTES_EN[normalize(value)] ?? value);
    if (next !== value) element.setAttribute(name, next);
  }
}

function translateTree(root) {
  if (root.nodeType === Node.TEXT_NODE) {
    translateTextNode(root);
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return;

  if (root.nodeType === Node.ELEMENT_NODE) translateAttributes(root);
  for (const element of root.querySelectorAll?.('*') ?? []) translateAttributes(element);

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(translateTextNode);
}

const THAI_FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Mali:wght@500;600;700&family=Noto+Sans+Thai:wght@400;500;600;700;800&display=swap';

/** Inter กับ Caveat ไม่มีตัวอักษรไทย — เติมฟอนต์ไทยที่หน้าตาเข้ากันเป็นตัวสำรอง */
function loadThaiFonts() {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = THAI_FONTS_URL;
  const style = document.createElement('style');
  style.textContent = `
    html[lang="th"] body { font-family: Inter, "Noto Sans Thai", ui-sans-serif, system-ui, sans-serif; }
    html[lang="th"] .font-script { font-family: Caveat, Mali, cursive; }
    html[lang="th"] [class*="Josefin_Sans"] { font-family: "Josefin Sans", "Noto Sans Thai", sans-serif; }`;
  document.head.append(link, style);
}

let started = false;

/** เรียกครั้งเดียวต่อหน้า (common.js เรียกให้ตอน renderAuthNav) */
export function initI18n() {
  if (started) return;
  started = true;

  document.documentElement.lang = lang;

  if (isThai) {
    loadThaiFonts();
    // ชื่อหน้าบางหน้าถูกตั้งจากข้อมูล เช่น "ชื่อบทความ | Chokchai Elephant Camp" จึงแปลทีละส่วน
    document.title = document.title.split(' | ').map(translate).join(' | ');
  } else if (ATTRIBUTES_EN[document.title]) {
    document.title = ATTRIBUTES_EN[document.title];
  }

  translateTree(document.body);

  // เนื้อหาที่ JavaScript เติมทีหลัง (การ์ด Blog, รีวิว, หน้าต่างรายละเอียด ฯลฯ) แปลตามตอนถูกใส่เข้ามา
  // ไม่วนซ้ำ: ข้อความที่แปลแล้วไม่มีในพจนานุกรม รอบถัดไปจึงไม่ถูกแก้อีก
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'characterData') translateTextNode(mutation.target);
      else mutation.addedNodes.forEach(translateTree);
    }
  }).observe(document.body, { childList: true, subtree: true, characterData: true });

  // js/lang-boot.js ซ่อนหน้าไว้ระหว่างรอแปล จะได้ไม่เห็นภาษาอังกฤษแวบขึ้นมาก่อน
  document.documentElement.classList.remove('i18n-loading');
}

/* ============================================================
   ปุ่มสลับภาษา
   ============================================================ */
const GLOBE_ICON = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
      <circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </svg>`;

function langButton(id, className, label) {
  const button = document.createElement('button');
  button.id = id;
  button.type = 'button';
  button.setAttribute('data-no-i18n', '');
  button.setAttribute('aria-label', isThai ? 'Switch to English' : 'เปลี่ยนเป็นภาษาไทย');
  button.className = className;
  button.innerHTML = `${GLOBE_ICON}<span>${label}</span>`;
  button.addEventListener('click', () => setLang(isThai ? 'en' : 'th'));
  return button;
}

/**
 * จอทั่วไป: ปุ่มอยู่มุมขวาบนของ header ถัดจากปุ่มบัญชี (จุดที่มี data-auth-nav)
 * จอมือถือ: header ไม่พอสำหรับชื่อเว็บ + ปุ่มสามปุ่ม จึงย้ายไปเป็นแถวสุดท้ายของเมนูมือถือแทน
 */
export function renderLangSwitch() {
  const slot = document.querySelector('header [data-auth-nav]');
  if (!slot || document.getElementById('lang-switch')) return;

  slot.before(
    langButton(
      'lang-switch',
      'hidden sm:inline-flex shrink-0 items-center gap-1.5 rounded-full border border-forest/30 bg-white px-3 py-2 text-sm font-bold text-forest hover:bg-forest hover:text-white transition',
      isThai ? 'EN' : 'ไทย',
    ),
  );
  document.getElementById('mobile-menu')?.append(
    langButton(
      'lang-switch-mobile',
      'sm:hidden inline-flex items-center gap-2 self-start rounded-full border border-forest/30 bg-white px-4 py-2 text-sm font-bold text-forest',
      isThai ? 'English' : 'ภาษาไทย',
    ),
  );
}
