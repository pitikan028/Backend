/* =========================================================
   BLOG DATA — Chokchai Elephant Camp
   แก้ไข/เพิ่ม Blog ที่ไฟล์นี้ไฟล์เดียว
   หน้าแรก, blog.html และ blog-post.html จะอ่านข้อมูลจากที่นี่

   ฟิลด์ของแต่ละ Blog:
   - id       : เลขไม่ซ้ำกัน (ใช้ในลิงก์ blog-post.html?id=1)
   - title    : ชื่อเรื่อง
   - excerpt  : คำอธิบายสั้นบนการ์ด
   - image    : รูปปก
   - date     : วันที่ รูปแบบ YYYY-MM-DD
   - author   : ผู้เขียน
   - category : หมวดหมู่
   - content  : เนื้อหาเต็ม (เขียนเป็น HTML ได้ ใช้ <p>, <h2>, <img>, <ul>)
                ถ้ายังไม่ใส่ จะแสดงข้อความ "Full story coming soon"
   เรียงจากใหม่ไปเก่า — Blog แรกจะแสดงบนหน้าแรก
   ========================================================= */

const BLOG_POSTS = [
  {
    id: 1,
    title: "Why Do Elephants Love Mud Baths?",
    excerpt:
      "Discover why our elephants roll in the mud every day and how it keeps their skin healthy under the Chiang Mai sun.",
    image: "images/blog/blog-01.jpg",
    date: "2026-09-28",
    author: "Chokchai Elephant Camp",
    category: "Elephant Care",
    content: `
      <p>Chiang Mai's warm climate makes every day a perfect day for a mud bath. If you have ever watched our elephants at the riverbank, you will have seen them scoop up mud with their trunks and throw it over their backs.</p>
      <p>It may look like play, but a mud bath is one of the most important parts of an elephant's daily routine.</p>

      <img src="images/blog/blog-01-a.jpg" alt="ช้างกำลังเล่นโคลนริมแม่น้ำ">

      <h2>Natural Sunscreen</h2>
      <p>Elephant skin is thick, but it is surprisingly sensitive. A layer of mud protects it from sunburn and keeps the skin from drying out during the hot season.</p>

      <h2>Keeping Insects Away</h2>
      <p>Once the mud dries, it forms a crust that makes it harder for flies and other insects to bite. When the elephants rub against trees later, the dried mud also takes loose skin and parasites with it.</p>

      <h2>Staying Cool</h2>
      <p>Elephants cannot sweat the way we do. Wet mud cools the skin as it slowly dries, helping the elephants stay comfortable through the afternoon.</p>

      <img src="images/blog/blog-01-b.jpg" alt="นักท่องเที่ยวอาบน้ำให้ช้างหลังเล่นโคลน">

      <h2>Join the Fun</h2>
      <p>During our Elephant Bathing activity, you can watch the mud bath up close and then help wash the elephants in the river afterwards. Bring clothes you don't mind getting dirty!</p>
    `,
  },
  {
    id: 2,
    title: "A Day at Chokchai: What to Expect",
    excerpt:
      "From morning pickup to the last splash in the river, here is how a full day at our camp usually goes.",
    image: "images/blog/blog-02.jpg",
    date: "2026-09-14",
    author: "Chokchai Elephant Camp",
    category: "Travel Tips",
  },
  {
    id: 3,
    title: "How We Prepare Vitamin Balls for Our Elephants",
    excerpt:
      "Rice, bananas and tamarind — learn what goes into the vitamin balls you'll make with your own hands.",
    image: "images/blog/blog-03.jpg",
    date: "2026-08-30",
    author: "Chokchai Elephant Camp",
    category: "Elephant Care",
  },
  {
    id: 4,
    title: "Bamboo Rafting on the Mae Taeng River",
    excerpt:
      "Glide down a calm jungle river on a handmade bamboo raft and see Chiang Mai from a different angle.",
    image: "images/blog/blog-04.jpg",
    date: "2026-08-16",
    author: "Chokchai Elephant Camp",
    category: "Activities",
  },
  {
    id: 5,
    title: "Ethical Elephant Tourism: Why We Don't Offer Riding",
    excerpt:
      "Our commitment to elephant welfare, and what makes an elephant experience truly ethical.",
    image: "images/blog/blog-05.jpg",
    date: "2026-08-02",
    author: "Chokchai Elephant Camp",
    category: "Elephant Care",
  },
  {
    id: 6,
    title: "Jungle Trekking Tips for First-Timers",
    excerpt:
      "What to wear, what to bring and how to enjoy your first trek alongside the elephants.",
    image: "images/blog/blog-06.jpg",
    date: "2026-07-19",
    author: "Chokchai Elephant Camp",
    category: "Travel Tips",
  },
  {
    id: 7,
    title: "Meet Our Mahouts",
    excerpt:
      "The people who spend every day with our elephants share their stories and the bond they've built.",
    image: "images/blog/blog-07.jpg",
    date: "2026-07-05",
    author: "Chokchai Elephant Camp",
    category: "Culture",
  },
  {
    id: 8,
    title: "What Do Elephants Eat in a Day?",
    excerpt:
      "An adult elephant can eat a surprising amount of food every day. Here's what's on the menu.",
    image: "images/blog/blog-08.jpg",
    date: "2026-06-21",
    author: "Chokchai Elephant Camp",
    category: "Elephant Care",
  },
  {
    id: 9,
    title: "Ziplining Over the Chiang Mai Jungle",
    excerpt:
      "Fly between the treetops and get a bird's-eye view of the forest around our camp.",
    image: "images/blog/blog-09.jpg",
    date: "2026-06-07",
    author: "Chokchai Elephant Camp",
    category: "Activities",
  },
  {
    id: 10,
    title: "The Best Time of Year to Visit Chiang Mai",
    excerpt:
      "Cool season, hot season or rainy season — how each one changes your elephant day.",
    image: "images/blog/blog-10.jpg",
    date: "2026-05-24",
    author: "Chokchai Elephant Camp",
    category: "Travel Tips",
  },
  {
    id: 11,
    title: "Asian vs African Elephants: What's the Difference?",
    excerpt:
      "Ears, size and temperament — a simple guide to telling the two species apart.",
    image: "images/blog/blog-11.jpg",
    date: "2026-05-10",
    author: "Chokchai Elephant Camp",
    category: "Elephant Care",
  },
  {
    id: 12,
    title: "Family Guide: Visiting the Camp with Kids",
    excerpt:
      "Tips for parents to make the day safe, fun and memorable for the little ones.",
    image: "images/blog/blog-12.jpg",
    date: "2026-04-26",
    author: "Chokchai Elephant Camp",
    category: "Travel Tips",
  },
  {
    id: 13,
    title: "The Story of Chokchai Elephant Camp",
    excerpt:
      "How our camp began, and how we've grown over more than 15 years in the jungles of Chiang Mai.",
    image: "images/blog/blog-13.jpg",
    date: "2026-04-12",
    author: "Chokchai Elephant Camp",
    category: "Culture",
  },
  {
    id: 14,
    title: "What to Pack for Your Elephant Day",
    excerpt:
      "A simple checklist so you're ready for mud, water and jungle trails.",
    image: "images/blog/blog-14.jpg",
    date: "2026-03-29",
    author: "Chokchai Elephant Camp",
    category: "Travel Tips",
  },
  {
    id: 15,
    title: "How Elephants Communicate",
    excerpt:
      "Rumbles, trumpets and body language — the many ways elephants talk to each other.",
    image: "images/blog/blog-15.jpg",
    date: "2026-03-15",
    author: "Chokchai Elephant Camp",
    category: "Elephant Care",
  },
  {
    id: 16,
    title: "Northern Thai Food to Try Near Mae Taeng",
    excerpt:
      "Khao soi, sai ua and more — local dishes worth trying on your way to or from the camp.",
    image: "images/blog/blog-16.jpg",
    date: "2026-03-01",
    author: "Chokchai Elephant Camp",
    category: "Culture",
  },
  {
    id: 17,
    title: "Photography Tips for Your Visit",
    excerpt:
      "How to get great photos of the elephants while keeping them, and yourself, comfortable.",
    image: "images/blog/blog-17.jpg",
    date: "2026-02-15",
    author: "Chokchai Elephant Camp",
    category: "Activities",
  },
];

/* ---------- Helpers (ไม่ต้องแก้) ---------- */
function formatBlogDate(isoDate) {
  const d = new Date(isoDate + "T00:00:00");
  // หน้าไทย (<html lang="th"> ตั้งโดย js/lang-boot.js) แสดงวันที่แบบไทย
  const thai = document.documentElement.lang === "th";
  return d.toLocaleDateString(thai ? "th-TH" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getBlogPost(id) {
  return BLOG_POSTS.find(function (p) {
    return p.id === Number(id);
  });
}
