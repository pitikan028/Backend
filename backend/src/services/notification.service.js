import { db, insertReturning } from '../db/knex.js';
import config from '../config/index.js';
import { toBoolean } from '../utils/helpers.js';
import { isMailEnabled, sendMail } from './mail.service.js';
import { getSettings } from './settings.service.js';

// อีเมลที่กำลังส่งอยู่เบื้องหลัง — เก็บไว้ให้ตอนปิดระบบ/จบเทสต์รอให้ส่งเสร็จก่อนได้
const pending = new Set();

export const flushNotifications = () => Promise.allSettled([...pending]);

/**
 * บันทึกการแจ้งเตือน 1 รายการ แล้วส่งอีเมลตามไปเบื้องหลัง
 *
 * แถวในตาราง notifications ถูกสร้างทันที (ลูกค้าเห็นในหน้าบัญชีได้เลย)
 * ส่วนอีเมลส่งแบบไม่ต้องรอ เพื่อไม่ให้ SMTP ช้าทำให้การจองช้าตาม
 */
export async function notify({ type, recipient, subject, body, userId = null, bookingId = null }) {
  const row = await insertReturning(db, 'notifications', {
    user_id: userId,
    booking_id: bookingId,
    recipient,
    type,
    subject,
    body,
    status: isMailEnabled() ? 'queued' : 'logged',
  });

  if (isMailEnabled()) {
    const job = sendMail({ to: recipient, subject, text: body })
      .then((result) =>
        db('notifications')
          .where({ id: row.id })
          .update({ status: result.status, error: result.error ?? null }),
      )
      .catch((error) => console.error('[notify] อัปเดตสถานะอีเมลไม่สำเร็จ:', error.message))
      .finally(() => pending.delete(job));
    pending.add(job);
  } else {
    await sendMail({ to: recipient, subject, text: body });
  }

  return row;
}

/** การแจ้งเตือนต้องไม่ทำให้งานหลัก (จอง/ยกเลิก/ชำระเงิน) ล้มเหลว */
const safely = (fn) => async (...args) => {
  try {
    return await fn(...args);
  } catch (error) {
    console.error('[notify] สร้างการแจ้งเตือนไม่สำเร็จ:', error.message);
    return null;
  }
};

/* ---------- ข้อความ ---------- */

const money = (amount) => `${Number(amount).toLocaleString('th-TH')} บาท`;

const bookingLink = (booking) =>
  `${config.appUrl}/booking.html?ref=${encodeURIComponent(booking.booking_ref)}&email=${encodeURIComponent(booking.email)}`;

const PICKUP_ROUNDS = { morning: 'รอบเช้า', afternoon: 'รอบกลางวัน' };

const bookingSummary = (booking) =>
  [
    `รหัสการจอง: ${booking.booking_ref}`,
    `กิจกรรม: ${booking.activity?.name_th ?? ''} (${booking.activity?.name ?? ''})`,
    `วันที่เข้าร่วม: ${booking.booking_date}`,
    `รอบรับ: ${PICKUP_ROUNDS[booking.pickup_round] ?? PICKUP_ROUNDS.morning}`,
    `จำนวน: ผู้ใหญ่ ${booking.adults} เด็ก ${booking.children} ทารก ${booking.infants}`,
    `ยอดรวม: ${money(booking.total_amount)}`,
  ].join('\n');

const STATUS_TEXT = {
  confirmed: {
    subject: 'การจองของคุณได้รับการยืนยันแล้ว',
    intro: 'ทีมงานยืนยันการจองของคุณเรียบร้อยแล้ว แล้วพบกันที่ปางช้างนะคะ',
  },
  completed: {
    subject: 'ขอบคุณที่มาเยี่ยมปางช้างของเรา',
    intro: 'หวังว่าคุณจะได้รับประสบการณ์ที่ดี หากมีเวลาฝากรีวิวให้เราบนหน้าเว็บด้วยนะคะ',
  },
  cancelled: {
    subject: 'การจองของคุณถูกยกเลิกแล้ว',
    intro: 'การจองด้านล่างถูกยกเลิกเรียบร้อยแล้ว',
  },
};

async function notifyTeam(type, subject, body, bookingId) {
  const { admin_notify_email: teamEmail } = await getSettings();
  if (!teamEmail) return;
  await notify({ type, recipient: teamEmail, subject, body, bookingId });
}

export const notifyWelcome = safely((user) =>
  notify({
    type: 'welcome',
    recipient: user.email,
    userId: user.id,
    subject: 'ยินดีต้อนรับสู่ Chokchai Elephant Camp',
    body: `สวัสดีคุณ ${user.first_name}\n\nสมัครสมาชิกเรียบร้อยแล้ว คุณสามารถจองกิจกรรม ดูประวัติการจอง และยกเลิกการจองได้จากหน้าบัญชีของคุณ\n\n${config.appUrl}/account.html`,
  }),
);

export const notifyBookingCreated = safely(async (booking) => {
  await notify({
    type: 'booking_created',
    recipient: booking.email,
    userId: booking.user_id ?? null,
    bookingId: booking.id,
    subject: `เราได้รับการจองของคุณแล้ว (${booking.booking_ref})`,
    body: `สวัสดีคุณ ${booking.first_name}\n\nขอบคุณที่จองกิจกรรมกับเรา รายละเอียดการจองมีดังนี้\n\n${bookingSummary(booking)}\n\nสถานะตอนนี้: รอชำระเงิน / รอยืนยัน\nดูสถานะ ชำระเงิน หรือยกเลิกการจองได้ที่\n${bookingLink(booking)}`,
  });
  await notifyTeam(
    'team_booking_created',
    `มีการจองใหม่ ${booking.booking_ref}`,
    `${bookingSummary(booking)}\n\nผู้จอง: ${booking.first_name} ${booking.last_name} · ${booking.phone} · ${booking.email}\n${booking.contact_app}: ${booking.contact_id ?? '-'}`,
    booking.id,
  );
});

export const notifyBookingStatus = safely(async (booking, { byCustomer = false } = {}) => {
  const text = STATUS_TEXT[booking.status];
  if (!text) return;

  const refundNote =
    booking.status === 'cancelled' && booking.payment_status === 'paid'
      ? '\n\nการจองนี้ชำระเงินแล้ว ทีมงานจะติดต่อกลับเรื่องการคืนเงินภายใน 3 วันทำการ'
      : '';

  await notify({
    type: `booking_${booking.status}`,
    recipient: booking.email,
    userId: booking.user_id ?? null,
    bookingId: booking.id,
    subject: `${text.subject} (${booking.booking_ref})`,
    body: `สวัสดีคุณ ${booking.first_name}\n\n${text.intro}\n\n${bookingSummary(booking)}${refundNote}\n\n${bookingLink(booking)}`,
  });

  if (byCustomer && booking.status === 'cancelled') {
    await notifyTeam(
      'team_booking_cancelled',
      `ลูกค้ายกเลิกการจอง ${booking.booking_ref}`,
      `${bookingSummary(booking)}\n\nเหตุผล: ${booking.cancel_reason ?? '-'}\nสถานะการชำระเงิน: ${booking.payment_status}`,
      booking.id,
    );
  }
});

export const notifyPaymentReceived = safely((booking) =>
  notify({
    type: 'payment_received',
    recipient: booking.email,
    userId: booking.user_id ?? null,
    bookingId: booking.id,
    subject: `ได้รับการชำระเงินแล้ว (${booking.booking_ref})`,
    body: `สวัสดีคุณ ${booking.first_name}\n\nเราได้รับการชำระเงิน ${money(booking.total_amount)} เรียบร้อยแล้ว การจองของคุณได้รับการยืนยัน\n\n${bookingSummary(booking)}\n\n${bookingLink(booking)}`,
  }),
);

export const notifyTransferReported = safely(async (booking) => {
  await notify({
    type: 'payment_reviewing',
    recipient: booking.email,
    userId: booking.user_id ?? null,
    bookingId: booking.id,
    subject: `เราได้รับแจ้งการโอนเงินแล้ว (${booking.booking_ref})`,
    body: `สวัสดีคุณ ${booking.first_name}\n\nขอบคุณที่แจ้งการโอนเงิน ${money(booking.total_amount)} ทีมงานจะตรวจสอบยอดเงินและยืนยันการจองให้ภายใน 24 ชั่วโมง\n\n${bookingSummary(booking)}\n\n${bookingLink(booking)}`,
  });
  await notifyTeam(
    'team_payment_reviewing',
    `ลูกค้าแจ้งโอนเงิน ${booking.booking_ref} — ${money(booking.total_amount)}`,
    `${bookingSummary(booking)}\n\nผู้จอง: ${booking.first_name} ${booking.last_name} · ${booking.phone}\nรายละเอียดที่ลูกค้าแจ้ง: ${booking.payment_ref ?? '-'}\nสลิป: ${booking.slip_uploaded_at ? 'แนบมาแล้ว เปิดดูได้จากปุ่ม "ดูสลิป" ในหน้าหลังบ้าน' : 'ไม่ได้แนบ'}\n\nตรวจยอดเข้าบัญชีแล้วกด "บันทึกรับเงิน" ในหน้าหลังบ้าน`,
    booking.id,
  );
});

/* ---------- อ่านการแจ้งเตือน ---------- */

const serialize = (row) => ({ ...row, is_read: toBoolean(row.is_read) });

export async function listForUser(userId, { limit = 30 } = {}) {
  const rows = await db('notifications')
    .select('id', 'type', 'subject', 'body', 'booking_id', 'is_read', 'created_at')
    .where({ user_id: userId })
    .orderBy('id', 'desc')
    .limit(limit);

  const [{ count }] = await db('notifications').where({ user_id: userId, is_read: false }).count({ count: '*' });
  return { data: rows.map(serialize), meta: { unread: Number(count) } };
}

export async function markAllRead(userId) {
  await db('notifications').where({ user_id: userId, is_read: false }).update({ is_read: true });
}

/** บันทึกการส่งทั้งหมดสำหรับหน้าหลังบ้าน */
export async function listAll({ page, limit, status }) {
  const applyFilters = (query) => (status ? query.where({ status }) : query);

  const [{ count }] = await applyFilters(db('notifications')).count({ count: '*' });
  const total = Number(count);

  const rows = await applyFilters(db('notifications'))
    .orderBy('id', 'desc')
    .limit(limit)
    .offset((page - 1) * limit);

  return {
    data: rows.map(serialize),
    meta: { page, limit, total, total_pages: Math.max(1, Math.ceil(total / limit)) },
  };
}
