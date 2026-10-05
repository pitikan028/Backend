/**
 * 6 เซ็ทกิจกรรม ตรงกับการ์ดใน activities.html และ index.html เดิม
 * ราคาผู้ใหญ่/เด็ก ยกมาจากค่าที่ frontend ส่งเข้า bookingModal.open() เดิม
 *
 * category: elephant = กิจกรรมกับช้าง, adventure = กิจกรรมผจญภัย, workshop = เวิร์กช็อป
 */
const activities = [
  {
    slug: 'elephant-jungle-trekking',
    name: 'ELEPHANT JUNGLE TREKKING',
    name_th: 'เดินป่ากับช้าง',
    description_th: 'เดินป่าติดตามฝูงช้างในเส้นทางธรรมชาติ พร้อมควาญช้างผู้ชำนาญเส้นทาง',
    highlights: 'เดินเคียงข้างช้างในเส้นทางป่าจริง\nควาญช้างประจำกลุ่มดูแลตลอดทาง\nจุดถ่ายรูปริมลำธาร\nน้ำดื่มและผ้าเย็นฟรี',
    category: 'elephant',
    duration_label: '1 ชั่วโมง',
    duration_minutes: 60,
    adult_price: 990,
    child_price: 690,
    infant_price: 0,
    image_url: 'images/activities/jungle-trekking.svg',
    daily_capacity: 40,
    sort_order: 1,
  },
  {
    slug: 'elephant-bathing',
    name: 'ELEPHANT BATHING',
    name_th: 'อาบน้ำช้าง',
    description_th: 'ร่วมอาบน้ำและขัดผิวให้ช้างที่ลำธารธรรมชาติ กิจกรรมยอดนิยมของครอบครัว',
    highlights: 'อาบน้ำและขัดผิวให้ช้างที่ลำธาร\nมีชุดเปลี่ยนและห้องอาบน้ำให้บริการ\nเหมาะกับเด็กและครอบครัว\nช่างภาพช่วยเก็บภาพให้ระหว่างกิจกรรม',
    category: 'elephant',
    duration_label: '1.5 ชั่วโมง',
    duration_minutes: 90,
    adult_price: 1290,
    child_price: 990,
    infant_price: 0,
    image_url: 'images/activities/bathing.svg',
    daily_capacity: 30,
    sort_order: 2,
  },
  {
    slug: 'elephant-feeding',
    name: 'ELEPHANT FEEDING',
    name_th: 'ให้อาหารช้าง',
    description_th: 'เตรียมและให้อาหารช้างแบบใกล้ชิด เรียนรู้พฤติกรรมและการดูแลช้างเชิงอนุรักษ์',
    highlights: 'เตรียมกล้วย อ้อย และหญ้าด้วยตัวเอง\nเรียนรู้พฤติกรรมช้างจากควาญ\nรวมอาหารกลางวันแบบพื้นเมือง\nรับ-ส่งฟรีในตัวเมืองเชียงใหม่',
    category: 'elephant',
    duration_label: 'ครึ่งวัน',
    duration_minutes: 240,
    adult_price: 1890,
    child_price: 1500,
    infant_price: 0,
    image_url: 'images/activities/feeding.svg',
    daily_capacity: 25,
    sort_order: 3,
  },
  {
    slug: 'vitamin-making',
    name: 'VITAMIN MAKING',
    name_th: 'ทำวิตามินให้ช้าง',
    description_th: 'เตรียมวิตามินสมุนไพรให้ช้างด้วยตัวเอง พร้อมป้อนให้ช้างกับมือ',
    highlights: 'ตำสมุนไพรและปั้นวิตามินก้อนด้วยมือ\nป้อนวิตามินให้ช้างกับมือ\nเรียนรู้สมุนไพรพื้นบ้านที่ใช้ดูแลช้าง\nใช้เวลาสั้น เหมาะกับทริปที่เวลาจำกัด',
    category: 'workshop',
    duration_label: '1 ชั่วโมง',
    duration_minutes: 60,
    adult_price: 990,
    child_price: 690,
    infant_price: 0,
    image_url: 'images/activities/vitamin-making.svg',
    daily_capacity: 40,
    sort_order: 4,
  },
  {
    slug: 'bamboo-rafting',
    name: 'BAMBOO RAFTING',
    name_th: 'ล่องแพไม้ไผ่',
    description_th: 'ล่องแพไม้ไผ่ตามลำน้ำธรรมชาติ ชมวิวป่าเชียงใหม่แบบเงียบสงบ',
    highlights: 'ล่องแพตามลำน้ำแม่แตง\nคนถ่อแพท้องถิ่นดูแลตลอดเส้นทาง\nมีเสื้อชูชีพทุกขนาด\nบรรยากาศเงียบสงบ เหมาะกับการพักผ่อน',
    category: 'adventure',
    duration_label: '1.5 ชั่วโมง',
    duration_minutes: 90,
    adult_price: 1290,
    child_price: 990,
    infant_price: 0,
    image_url: 'images/activities/bamboo-rafting.svg',
    daily_capacity: 30,
    sort_order: 5,
  },
  {
    slug: 'ziplining',
    name: 'ZIPLINING',
    name_th: 'โหนสลิง',
    description_th: 'โหนสลิงชมป่าธรรมชาติจากมุมสูง พร้อมอุปกรณ์มาตรฐานและทีมงานดูแลตลอดเส้นทาง',
    highlights: 'ฐานสลิงหลายระดับความสูง\nอุปกรณ์นิรภัยมาตรฐานสากล\nทีมงานประจำทุกฐาน\nชมวิวป่าเชียงใหม่จากยอดไม้',
    category: 'adventure',
    duration_label: 'ครึ่งวัน',
    duration_minutes: 240,
    adult_price: 1890,
    child_price: 1500,
    infant_price: 0,
    image_url: 'images/activities/ziplining.svg',
    daily_capacity: 20,
    sort_order: 6,
  },
];

export async function seed(knex) {
  for (const activity of activities) {
    const existing = await knex('activities').where({ slug: activity.slug }).first();

    if (!existing) {
      await knex('activities').insert(activity);
      continue;
    }

    // seed รันทุกครั้งที่ API บูต จึงห้ามเขียนทับราคา/โควตาที่แอดมินแก้ไว้จากหน้าหลังบ้าน
    // เติมให้เฉพาะคอลัมน์ที่เพิ่มมาทีหลังและยังว่างอยู่ กับ path รูปเริ่มต้นของเวอร์ชันก่อนซึ่งไม่มีไฟล์จริง
    const patch = {};
    if (!existing.highlights) {
      patch.highlights = activity.highlights;
      patch.category = activity.category;
    }
    if (existing.image_url === activity.image_url.replace(/\.svg$/, '.jpg')) {
      patch.image_url = activity.image_url;
    }
    if (Object.keys(patch).length > 0) {
      await knex('activities').where({ id: existing.id }).update(patch);
    }
  }
}
