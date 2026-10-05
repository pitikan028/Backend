import nodemailer from 'nodemailer';
import config from '../config/index.js';

let transporter;

export const isMailEnabled = () => Boolean(config.mail.host);

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.mail.host,
      port: config.mail.port,
      secure: config.mail.secure,
      auth: config.mail.user ? { user: config.mail.user, pass: config.mail.password } : undefined,
      // SMTP ล่มต้องไม่ทำให้ request ค้างนาน
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 15000,
    });
  }
  return transporter;
}

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

/** ห่อข้อความล้วนให้เป็น HTML หน้าตาเรียบ ๆ ตามสีของแบรนด์ */
function toHtml(subject, text) {
  const paragraphs = escapeHtml(text)
    .split(/\n{2,}/)
    .map((block) => `<p style="margin:0 0 14px;line-height:1.6">${block.replace(/\n/g, '<br>')}</p>`)
    .join('');

  return `<!doctype html><html lang="th"><body style="margin:0;background:#F9F8F2;font-family:Arial,Helvetica,sans-serif;color:#252520">
<div style="max-width:560px;margin:0 auto;padding:24px">
  <div style="background:#183420;color:#fff;padding:18px 24px;border-radius:12px 12px 0 0;font-weight:bold">Chokchai Elephant Camp</div>
  <div style="background:#fff;padding:24px;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px">
    <h1 style="font-size:18px;color:#21452A;margin:0 0 16px">${escapeHtml(subject)}</h1>
    ${paragraphs}
  </div>
</div></body></html>`;
}

/**
 * ส่งอีเมล 1 ฉบับ — ไม่โยน error ออกไป เพราะอีเมลส่งไม่ได้ต้องไม่ทำให้การจองล้มเหลว
 * คืน { status: 'sent' | 'logged' | 'failed', error? }
 */
export async function sendMail({ to, subject, text }) {
  if (!isMailEnabled()) {
    if (config.nodeEnv !== 'test') console.log(`[mail] (ไม่ได้ตั้งค่า SMTP) ถึง ${to}: ${subject}`);
    return { status: 'logged' };
  }

  try {
    await getTransporter().sendMail({ from: config.mail.from, to, subject, text, html: toHtml(subject, text) });
    return { status: 'sent' };
  } catch (error) {
    console.error(`[mail] ส่งถึง ${to} ไม่สำเร็จ:`, error.message);
    return { status: 'failed', error: error.message };
  }
}
