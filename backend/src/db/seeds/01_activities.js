/**
 * 6 เซ็ทกิจกรรม ตรงกับการ์ดใน activities.html และ index.html เดิม
 * ราคาผู้ใหญ่/เด็ก ยกมาจากค่าที่ frontend ส่งเข้า bookingModal.open() เดิม
 */
const activities = [
  {
    slug: 'elephant-jungle-trekking',
    name: 'ELEPHANT JUNGLE TREKKING',
    name_th: 'เดินป่ากับช้าง',
    description_th: 'เดินป่าติดตามฝูงช้างในเส้นทางธรรมชาติ พร้อมควาญช้างผู้ชำนาญเส้นทาง',
    duration_label: '1 ชั่วโมง',
    duration_minutes: 60,
    adult_price: 990,
    child_price: 690,
    infant_price: 0,
    image_url: 'images/activities/jungle-trekking.jpg',
    daily_capacity: 40,
    sort_order: 1,
  },
  {
    slug: 'elephant-bathing',
    name: 'ELEPHANT BATHING',
    name_th: 'อาบน้ำช้าง',
    description_th: 'ร่วมอาบน้ำและขัดผิวให้ช้างที่ลำธารธรรมชาติ กิจกรรมยอดนิยมของครอบครัว',
    duration_label: '1.5 ชั่วโมง',
    duration_minutes: 90,
    adult_price: 1290,
    child_price: 990,
    infant_price: 0,
    image_url: 'images/activities/bathing.jpg',
    daily_capacity: 30,
    sort_order: 2,
  },
  {
    slug: 'elephant-feeding',
    name: 'ELEPHANT FEEDING',
    name_th: 'ให้อาหารช้าง',
    description_th: 'เตรียมและให้อาหารช้างแบบใกล้ชิด เรียนรู้พฤติกรรมและการดูแลช้างเชิงอนุรักษ์',
    duration_label: 'ครึ่งวัน',
    duration_minutes: 240,
    adult_price: 1890,
    child_price: 1500,
    infant_price: 0,
    image_url: 'images/activities/feeding.jpg',
    daily_capacity: 25,
    sort_order: 3,
  },
  {
    slug: 'vitamin-making',
    name: 'VITAMIN MAKING',
    name_th: 'ทำวิตามินให้ช้าง',
    description_th: 'เตรียมวิตามินสมุนไพรให้ช้างด้วยตัวเอง พร้อมป้อนให้ช้างกับมือ',
    duration_label: '1 ชั่วโมง',
    duration_minutes: 60,
    adult_price: 990,
    child_price: 690,
    infant_price: 0,
    image_url: 'images/activities/vitamin-making.jpg',
    daily_capacity: 40,
    sort_order: 4,
  },
  {
    slug: 'bamboo-rafting',
    name: 'BAMBOO RAFTING',
    name_th: 'ล่องแพไม้ไผ่',
    description_th: 'ล่องแพไม้ไผ่ตามลำน้ำธรรมชาติ ชมวิวป่าเชียงใหม่แบบเงียบสงบ',
    duration_label: '1.5 ชั่วโมง',
    duration_minutes: 90,
    adult_price: 1290,
    child_price: 990,
    infant_price: 0,
    image_url: 'images/activities/bamboo-rafting.jpg',
    daily_capacity: 30,
    sort_order: 5,
  },
  {
    slug: 'ziplining',
    name: 'ZIPLINING',
    name_th: 'โหนสลิง',
    description_th: 'โหนสลิงชมป่าธรรมชาติจากมุมสูง พร้อมอุปกรณ์มาตรฐานและทีมงานดูแลตลอดเส้นทาง',
    duration_label: 'ครึ่งวัน',
    duration_minutes: 240,
    adult_price: 1890,
    child_price: 1500,
    infant_price: 0,
    image_url: 'images/activities/ziplining.jpg',
    daily_capacity: 20,
    sort_order: 6,
  },
];

export async function seed(knex) {
  // upsert ตาม slug เพื่อให้รัน seed ซ้ำได้โดยไม่ลบการจองที่อ้างถึงกิจกรรมอยู่
  for (const activity of activities) {
    const existing = await knex('activities').where({ slug: activity.slug }).first();
    if (existing) {
      await knex('activities')
        .where({ id: existing.id })
        .update({ ...activity, updated_at: knex.fn.now() });
    } else {
      await knex('activities').insert(activity);
    }
  }
}
