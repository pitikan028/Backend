/**
 * 6 เซ็ทกิจกรรม ตรงกับการ์ดใน activities.html และ index.html เดิม
 * ราคาผู้ใหญ่/เด็ก ยกมาจากค่าที่ frontend ส่งเข้า bookingModal.open() เดิม
 *
 * category: elephant = กิจกรรมกับช้าง, adventure = กิจกรรมผจญภัย, workshop = เวิร์กช็อป
 * legacy_image: ชื่อไฟล์รูปเริ่มต้นของเวอร์ชันก่อน ใช้ตอน seed เท่านั้น ไม่ใช่คอลัมน์ในฐานข้อมูล
 */
const activities = [
  {
    slug: 'elephant-jungle-trekking',
    name: 'ELEPHANT JUNGLE TREKKING',
    name_th: 'เดินป่ากับช้าง',
    description_th: 'เดินป่าติดตามฝูงช้างในเส้นทางธรรมชาติ พร้อมควาญช้างผู้ชำนาญเส้นทาง',
    description_en: 'Walk alongside the herd on a natural jungle trail, led by a mahout who knows every path.',
    highlights: 'เดินเคียงข้างช้างในเส้นทางป่าจริง\nควาญช้างประจำกลุ่มดูแลตลอดทาง\nจุดถ่ายรูปริมลำธาร\nน้ำดื่มและผ้าเย็นฟรี',
    highlights_en: 'Walk beside elephants on a real jungle trail\nA dedicated mahout stays with your group\nPhoto stop by the stream\nFree drinking water and cold towels',
    category: 'elephant',
    duration_label: '1 ชั่วโมง',
    duration_label_en: '1 hour',
    duration_minutes: 60,
    adult_price: 990,
    child_price: 690,
    infant_price: 0,
    image_url: 'images/activities/card-jungle-trekking.jpg',
    legacy_image: 'jungle-trekking.svg',
    daily_capacity: 40,
    sort_order: 1,
  },
  {
    slug: 'elephant-bathing',
    name: 'ELEPHANT BATHING',
    name_th: 'อาบน้ำช้าง',
    description_th: 'ร่วมอาบน้ำและขัดผิวให้ช้างที่ลำธารธรรมชาติ กิจกรรมยอดนิยมของครอบครัว',
    description_en: 'Bathe and scrub the elephants in a natural stream — a family favourite.',
    highlights: 'อาบน้ำและขัดผิวให้ช้างที่ลำธาร\nมีชุดเปลี่ยนและห้องอาบน้ำให้บริการ\nเหมาะกับเด็กและครอบครัว\nช่างภาพช่วยเก็บภาพให้ระหว่างกิจกรรม',
    highlights_en: 'Bathe and scrub the elephants in the stream\nChanging clothes and showers provided\nGreat for kids and families\nA photographer captures the moment for you',
    category: 'elephant',
    duration_label: '1.5 ชั่วโมง',
    duration_label_en: '1.5 hours',
    duration_minutes: 90,
    adult_price: 1290,
    child_price: 990,
    infant_price: 0,
    image_url: 'images/activities/card-bathing-home.jpg',
    legacy_image: 'bathing.svg',
    daily_capacity: 30,
    sort_order: 2,
  },
  {
    slug: 'elephant-feeding',
    name: 'ELEPHANT FEEDING',
    name_th: 'ให้อาหารช้าง',
    description_th: 'เตรียมและให้อาหารช้างแบบใกล้ชิด เรียนรู้พฤติกรรมและการดูแลช้างเชิงอนุรักษ์',
    description_en: 'Prepare food and feed the elephants up close while learning how they are cared for ethically.',
    highlights: 'เตรียมกล้วย อ้อย และหญ้าด้วยตัวเอง\nเรียนรู้พฤติกรรมช้างจากควาญ\nรวมอาหารกลางวันแบบพื้นเมือง\nรับ-ส่งฟรีในตัวเมืองเชียงใหม่',
    highlights_en: 'Prepare bananas, sugarcane and grass yourself\nLearn elephant behaviour from the mahouts\nLocal-style lunch included\nFree pickup and drop-off in Chiang Mai city',
    category: 'elephant',
    duration_label: 'ครึ่งวัน',
    duration_label_en: 'Half day',
    duration_minutes: 240,
    adult_price: 1890,
    child_price: 1500,
    infant_price: 0,
    image_url: 'images/activities/card-feeding-home.jpg',
    legacy_image: 'feeding.svg',
    daily_capacity: 25,
    sort_order: 3,
  },
  {
    slug: 'vitamin-making',
    name: 'VITAMIN MAKING',
    name_th: 'ทำวิตามินให้ช้าง',
    description_th: 'เตรียมวิตามินสมุนไพรให้ช้างด้วยตัวเอง พร้อมป้อนให้ช้างกับมือ',
    description_en: 'Make herbal vitamin balls for the elephants and feed them by hand.',
    highlights: 'ตำสมุนไพรและปั้นวิตามินก้อนด้วยมือ\nป้อนวิตามินให้ช้างกับมือ\nเรียนรู้สมุนไพรพื้นบ้านที่ใช้ดูแลช้าง\nใช้เวลาสั้น เหมาะกับทริปที่เวลาจำกัด',
    highlights_en: 'Pound herbs and roll vitamin balls by hand\nFeed the vitamins to the elephants yourself\nLearn the local herbs used in elephant care\nA short activity that fits a tight schedule',
    category: 'workshop',
    duration_label: '1 ชั่วโมง',
    duration_label_en: '1 hour',
    duration_minutes: 60,
    adult_price: 990,
    child_price: 690,
    infant_price: 0,
    image_url: 'images/activities/card-vitamin-making-home.jpg',
    legacy_image: 'vitamin-making.svg',
    daily_capacity: 40,
    sort_order: 4,
  },
  {
    slug: 'bamboo-rafting',
    name: 'BAMBOO RAFTING',
    name_th: 'ล่องแพไม้ไผ่',
    description_th: 'ล่องแพไม้ไผ่ตามลำน้ำธรรมชาติ ชมวิวป่าเชียงใหม่แบบเงียบสงบ',
    description_en: 'Drift down a natural river on a bamboo raft and take in the quiet Chiang Mai jungle.',
    highlights: 'ล่องแพตามลำน้ำแม่แตง\nคนถ่อแพท้องถิ่นดูแลตลอดเส้นทาง\nมีเสื้อชูชีพทุกขนาด\nบรรยากาศเงียบสงบ เหมาะกับการพักผ่อน',
    highlights_en: 'Raft along the Mae Taeng river\nA local raftsman guides you all the way\nLife jackets in every size\nCalm and peaceful, perfect for unwinding',
    category: 'adventure',
    duration_label: '1.5 ชั่วโมง',
    duration_label_en: '1.5 hours',
    duration_minutes: 90,
    adult_price: 1290,
    child_price: 990,
    infant_price: 0,
    image_url: 'images/activities/card-bamboo-rafting.jpg',
    legacy_image: 'bamboo-rafting.svg',
    daily_capacity: 30,
    sort_order: 5,
  },
  {
    slug: 'ziplining',
    name: 'ZIPLINING',
    name_th: 'โหนสลิง',
    description_th: 'โหนสลิงชมป่าธรรมชาติจากมุมสูง พร้อมอุปกรณ์มาตรฐานและทีมงานดูแลตลอดเส้นทาง',
    description_en: 'Zip through the forest canopy with certified equipment and a crew looking after you at every platform.',
    highlights: 'ฐานสลิงหลายระดับความสูง\nอุปกรณ์นิรภัยมาตรฐานสากล\nทีมงานประจำทุกฐาน\nชมวิวป่าเชียงใหม่จากยอดไม้',
    highlights_en: 'Platforms at several heights\nInternational-standard safety gear\nStaff stationed at every platform\nTreetop views over the Chiang Mai jungle',
    category: 'adventure',
    duration_label: 'ครึ่งวัน',
    duration_label_en: 'Half day',
    duration_minutes: 240,
    adult_price: 1890,
    child_price: 1500,
    infant_price: 0,
    image_url: 'images/activities/card-ziplining-home.jpg',
    legacy_image: 'ziplining.svg',
    daily_capacity: 20,
    sort_order: 6,
  },
];

export async function seed(knex) {
  for (const { legacy_image: legacyImage, ...activity } of activities) {
    const existing = await knex('activities').where({ slug: activity.slug }).first();

    if (!existing) {
      await knex('activities').insert(activity);
      continue;
    }

    // seed รันทุกครั้งที่ API บูต จึงห้ามเขียนทับราคา/โควตาที่แอดมินแก้ไว้จากหน้าหลังบ้าน
    // เติมให้เฉพาะคอลัมน์ที่เพิ่มมาทีหลังและยังว่างอยู่ กับรูปเริ่มต้นของเวอร์ชันก่อน
    const patch = {};
    if (!existing.highlights) {
      patch.highlights = activity.highlights;
      patch.category = activity.category;
    }
    // รูปเริ่มต้นของเวอร์ชันก่อน (ภาพวาด .svg และ path .jpg ชื่อเดียวกันที่ไม่เคยมีไฟล์จริง) เปลี่ยนเป็นรูปถ่ายจริง
    // รูปที่แอดมินตั้งเองจากหลังบ้านเป็นค่าอื่น จึงไม่ถูกแตะ
    const legacyPath = `images/activities/${legacyImage}`;
    if ([legacyPath, legacyPath.replace(/\.svg$/, '.jpg')].includes(existing.image_url)) {
      patch.image_url = activity.image_url;
    }
    // ข้อความภาษาอังกฤษเพิ่มมาทีหลัง เติมให้เฉพาะช่องที่ยังไม่เคยตั้งค่า (null) — ช่องที่แอดมินตั้งใจลบให้ว่างจะไม่ถูกเติมกลับ
    for (const column of ['description_en', 'highlights_en', 'duration_label_en']) {
      if (existing[column] === null) patch[column] = activity[column];
    }
    if (Object.keys(patch).length > 0) {
      await knex('activities').where({ id: existing.id }).update(patch);
    }
  }
}
