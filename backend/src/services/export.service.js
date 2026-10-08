import ExcelJS from 'exceljs';
import dayjs from 'dayjs';

const STATUS_LABELS = {
  pending: 'รอยืนยัน',
  confirmed: 'ยืนยันแล้ว',
  cancelled: 'ยกเลิก',
  completed: 'เสร็จสิ้น',
};

const PAYMENT_LABELS = {
  unpaid: 'ยังไม่ชำระ',
  reviewing: 'รอตรวจสอบ',
  paid: 'ชำระแล้ว',
  refunded: 'คืนเงินแล้ว',
};

const PICKUP_LABELS = {
  hotel: 'โรงแรม',
  meeting_point: 'จุดนัดพบ',
  airbnb: 'Airbnb',
  undecided: 'ยังไม่ระบุ',
};

const ROUND_LABELS = { morning: 'รอบเช้า', afternoon: 'รอบกลางวัน' };

const COLUMNS = [
  { header: 'รหัสการจอง', key: 'booking_ref', width: 14 },
  { header: 'วันที่เข้าร่วม', key: 'booking_date', width: 14 },
  { header: 'กิจกรรม', key: 'activity', width: 30 },
  { header: 'สถานะ', key: 'status', width: 12 },
  { header: 'การชำระเงิน', key: 'payment_status', width: 14 },
  { header: 'ชื่อ', key: 'first_name', width: 18 },
  { header: 'นามสกุล', key: 'last_name', width: 18 },
  { header: 'เบอร์โทร', key: 'phone', width: 16 },
  { header: 'อีเมล', key: 'email', width: 28 },
  { header: 'แอปติดต่อ', key: 'contact_app', width: 12 },
  { header: 'ไอดีติดต่อ', key: 'contact_id', width: 18 },
  { header: 'ผู้ใหญ่', key: 'adults', width: 9 },
  { header: 'เด็ก', key: 'children', width: 9 },
  { header: 'ทารก', key: 'infants', width: 9 },
  { header: 'ยอดรวม (บาท)', key: 'total_amount', width: 15, style: { numFmt: '#,##0.00' } },
  { header: 'วิธีชำระ', key: 'payment_method', width: 12 },
  { header: 'จุดรับ', key: 'pickup_type', width: 12 },
  { header: 'รายละเอียดจุดรับ', key: 'pickup_detail', width: 28 },
  { header: 'รอบรับ', key: 'pickup_round', width: 12 },
  { header: 'หมายเหตุ', key: 'note', width: 30 },
  { header: 'จองเมื่อ', key: 'created_at', width: 18 },
];

/**
 * ค่าที่ลูกค้าพิมพ์เองแล้วขึ้นต้นด้วย = + - @ จะถูก Excel มองเป็นสูตร (formula injection)
 * เติม ' นำหน้าให้ Excel แสดงเป็นข้อความธรรมดา — เบอร์โทรอย่าง +66... ไม่ใช่สูตรจึงปล่อยไว้
 */
const safeText = (value) => {
  const text = value == null ? '' : String(value);
  if (/^[=@]/.test(text) || (/^[+-]/.test(text) && !/^[+-][\d\s()-]*$/.test(text))) return `'${text}`;
  return text;
};

/** สร้างไฟล์ .xlsx ของรายการจอง (ผลลัพธ์ของ listBookingsForExport) คืนเป็น Buffer */
export async function buildBookingsWorkbook(bookings) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Chokchai Elephant Camp';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Bookings', { views: [{ state: 'frozen', ySplit: 1 }] });
  sheet.columns = COLUMNS;
  sheet.getRow(1).font = { bold: true };

  for (const booking of bookings) {
    sheet.addRow({
      booking_ref: booking.booking_ref,
      booking_date: booking.booking_date,
      activity: safeText(booking.activity?.name_th ?? booking.activity?.name),
      status: STATUS_LABELS[booking.status] ?? booking.status,
      payment_status: PAYMENT_LABELS[booking.payment_status] ?? booking.payment_status,
      first_name: safeText(booking.first_name),
      last_name: safeText(booking.last_name),
      phone: safeText(booking.phone),
      email: safeText(booking.email),
      contact_app: booking.contact_app ?? '',
      contact_id: safeText(booking.contact_id),
      adults: booking.adults,
      children: booking.children,
      infants: booking.infants,
      total_amount: booking.total_amount,
      payment_method: booking.payment_method ?? '',
      pickup_type: PICKUP_LABELS[booking.pickup_type] ?? booking.pickup_type,
      pickup_detail: safeText(booking.pickup_detail),
      pickup_round: ROUND_LABELS[booking.pickup_round] ?? booking.pickup_round,
      note: safeText(booking.note),
      created_at: booking.created_at ? dayjs(booking.created_at).format('YYYY-MM-DD HH:mm') : '',
    });
  }

  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: COLUMNS.length } };
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

export default { buildBookingsWorkbook };
