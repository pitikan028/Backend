/**
 * สร้างข้อความ (payload) ของ PromptPay QR ตามมาตรฐาน EMVCo ที่แอปธนาคารไทยทุกแอปอ่านได้
 *
 * โครงสร้างเป็นชุดของ "รหัส 2 หลัก + ความยาว 2 หลัก + ค่า" ต่อกัน แล้วปิดท้ายด้วย CRC16
 */

const field = (id, value) => `${id}${String(value.length).padStart(2, '0')}${value}`;

/** CRC16-CCITT (poly 0x1021, เริ่มที่ 0xFFFF) ตามที่มาตรฐาน EMVCo กำหนด */
export function crc16(text) {
  let crc = 0xffff;
  for (let i = 0; i < text.length; i += 1) {
    crc ^= text.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/** เหลือแต่ตัวเลข — ผู้ใช้อาจพิมพ์เบอร์แบบมีขีดหรือเว้นวรรค */
export const normalizePromptPayId = (value) => String(value ?? '').replace(/\D/g, '');

/** พร้อมเพย์ผูกได้กับเบอร์มือถือ (10 หลัก), เลขบัตรประชาชน/เลขผู้เสียภาษี (13 หลัก) หรือ e-Wallet (15 หลัก) */
export const isValidPromptPayId = (value) => [10, 13, 15].includes(normalizePromptPayId(value).length);

/**
 * @param {string} promptPayId เบอร์มือถือ / เลข 13 หลัก / e-Wallet ID
 * @param {number} [amount] ยอดเงินบาท ถ้าระบุ ลูกค้าจะแก้ยอดในแอปธนาคารไม่ได้
 */
export function buildPromptPayPayload(promptPayId, amount) {
  const id = normalizePromptPayId(promptPayId);
  if (!isValidPromptPayId(id)) throw new Error('หมายเลขพร้อมเพย์ต้องเป็นตัวเลข 10, 13 หรือ 15 หลัก');

  // เบอร์มือถือต้องแปลงเป็นรูปแบบสากล: ตัด 0 นำหน้า ใส่รหัสประเทศ 66 แล้วเติม 0 ให้ครบ 13 หลัก
  const target =
    id.length === 10 ? field('01', `66${id.slice(1)}`.padStart(13, '0')) : field(id.length === 13 ? '02' : '03', id);

  const hasAmount = Number(amount) > 0;
  const body = [
    field('00', '01'),
    // 12 = ใช้ได้ครั้งเดียวพร้อมยอดเงิน, 11 = ใช้ซ้ำได้ ลูกค้ากรอกยอดเอง
    field('01', hasAmount ? '12' : '11'),
    field('29', field('00', 'A000000677010111') + target),
    field('58', 'TH'),
    field('53', '764'),
    hasAmount ? field('54', Number(amount).toFixed(2)) : '',
    '6304',
  ].join('');

  return body + crc16(body);
}

/** แสดงหมายเลขแบบปิดบางส่วน เช่น 095-xxx-2547 ให้ลูกค้าเทียบกับที่เห็นในแอปธนาคาร */
export function maskPromptPayId(promptPayId) {
  const id = normalizePromptPayId(promptPayId);
  if (id.length === 10) return `${id.slice(0, 3)}-xxx-${id.slice(6)}`;
  return `${id.slice(0, 1)}-xxxx-xxxxx-${id.slice(10)}`;
}
