/** รีวิวและ FAQ ยกมาจากเนื้อหาที่ hardcode ไว้ใน index.html เดิม */

const reviews = [
  {
    author_name: 'Emily R.',
    rating: 5,
    source: 'google',
    comment:
      'Amazing experience! The mahouts treat the elephants so gently, and there’s no elephant riding at all.',
    is_published: true,
    sort_order: 1,
  },
  {
    author_name: 'Somchai P.',
    rating: 5,
    source: 'tripadvisor',
    comment: 'Perfect for families. The kids loved feeding the elephants up close.',
    is_published: true,
    sort_order: 2,
  },
  {
    author_name: 'Klaus M.',
    rating: 4,
    source: 'google',
    comment: 'Beautiful place with friendly staff. Highly recommend booking in advance.',
    is_published: true,
    sort_order: 3,
  },
];

const faqs = [
  {
    question: 'Do you provide pickup service from Chiang Mai city?',
    answer: 'Yes, free pickup within a 15 km radius from the city.',
    sort_order: 1,
  },
  {
    question: 'Can a 5-year-old child join the activities?',
    answer:
      'ได้ครับ เด็กอายุ 4 ปีขึ้นไปเข้าร่วมได้ทุกกิจกรรม โดยต้องมีผู้ปกครองดูแลตลอดเวลา สำหรับกิจกรรมโหนสลิงมีข้อกำหนดน้ำหนักขั้นต่ำ 20 กก.',
    sort_order: 2,
  },
  {
    question: 'เวลารับ-ส่งของแต่ละรอบคือกี่โมง?',
    answer:
      'รอบเช้ารับระหว่าง 06.00 - 06.30 น. เวลาอาจคลาดเคลื่อนเล็กน้อยตามจุดรับ หากมีการเปลี่ยนแปลงจะแจ้งทางอีเมลล่วงหน้า',
    sort_order: 3,
  },
  {
    question: 'ยกเลิกการจองได้ถึงเมื่อไหร่?',
    answer: 'ยกเลิกฟรีก่อนเริ่มกิจกรรมอย่างน้อย 72 ชั่วโมง หลังจากนั้นจะไม่สามารถคืนเงินได้',
    sort_order: 4,
  },
];

export async function seed(knex) {
  for (const review of reviews) {
    const existing = await knex('reviews')
      .where({ author_name: review.author_name, comment: review.comment })
      .first();
    if (!existing) await knex('reviews').insert(review);
  }

  for (const faq of faqs) {
    const existing = await knex('faqs').where({ question: faq.question }).first();
    if (!existing) await knex('faqs').insert(faq);
  }
}
