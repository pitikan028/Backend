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
    image: "images/blog/blog-01.JPG",
    date: "2026-09-28",
    author: "Chokchai Elephant Camp",
    category: "Elephant Care",
    content: `
      <p>Chiang Mai's warm climate makes every day a perfect day for a mud bath. If you have ever watched our elephants at the riverbank, you will have seen them scoop up mud with their trunks and throw it over their backs.</p>
      <p>It may look like play, but a mud bath is one of the most important parts of an elephant's daily routine.</p>

      <img src="images/blog/blog-01-a.JPG" alt="ช้างกำลังเล่นโคลนริมแม่น้ำ">

      <h2>Natural Sunscreen</h2>
      <p>Elephant skin is thick, but it is surprisingly sensitive. A layer of mud protects it from sunburn and keeps the skin from drying out during the hot season.</p>

      <h2>Keeping Insects Away</h2>
      <p>Once the mud dries, it forms a crust that makes it harder for flies and other insects to bite. When the elephants rub against trees later, the dried mud also takes loose skin and parasites with it.</p>

      <h2>Staying Cool</h2>
      <p>Elephants cannot sweat the way we do. Wet mud cools the skin as it slowly dries, helping the elephants stay comfortable through the afternoon.</p>

      <img src="images/blog/blog-01-b.JPG" alt="นักท่องเที่ยวอาบน้ำให้ช้างหลังเล่นโคลน">

      <h2>Join the Fun</h2>
      <p>During our Elephant Bathing activity, you can watch the mud bath up close and then help wash the elephants in the river afterwards. Bring clothes you don't mind getting dirty!</p>
    `,
  },
  {
    id: 2,
    title: "Explore the Asian Elephant and Its Natural Habitat",
    excerpt:
      "From twin-domed heads to matriarchal herds — meet the Asian elephant, the forests it calls home and the efforts to protect it.",
    image: "images/blog/blog-02.JPG",
    date: "2026-09-14",
    author: "Chokchai Elephant Camp",
    category: "Wildlife",
    content: `
      <p>The Asian elephant is a truly remarkable creature that has captured human fascination for centuries. As the largest land mammal native to Asia, it occupies a special place not only in the natural world but also in the hearts and cultures of many people. From its distinctive physical features to its rich social life, the Asian elephant tells a story of resilience, intelligence, and deep cultural ties. Yet, despite its impressive presence, this species faces serious threats that put its future at risk. Let’s take a closer look at the Asian elephant, exploring its physical traits, habitats, behaviors, diet, conservation status, and cultural importance, while also shedding light on the efforts underway to protect these gentle giants.</p>

      <img src="images/blog/blog-02-a.JPG" alt="ลูกช้างเล่นน้ำในแม่น้ำข้างแม่ช้างสองเชือก">

      <h2>Asian Elephant: Physical Characteristics and Unique Adaptations</h2>
      <p>The Asian elephant (Elephas maximus) might be smaller than its African cousins, but it still commands attention with its size and presence. Adult males can weigh as much as 6,000 kilograms (around 13,200 pounds) and stand about 3.5 meters (11.5 feet) tall. Their grey, wrinkled skin isn’t just a signature look—it helps protect them and keeps their bodies flexible as they navigate forests and grasslands.</p>
      <p>One feature that often surprises people is their smaller, semi-circular ears, which resemble the shape of the Indian subcontinent. This contrasts with the large, fan-like ears of African elephants, which help with heat regulation. The Asian elephant’s head has a unique twin-domed shape, making it easier for scientists and enthusiasts to tell them apart from other species.</p>
      <p>Another fascinating adaptation lies at the tip of their trunk. Unlike African elephants, which have two “fingers” for grasping, Asian elephants have just one. This single finger allows them to perform delicate tasks, like picking up tiny objects or stripping leaves from branches. Male Asian elephants often sport large tusks, but females usually have smaller tusks called tushes that rarely extend beyond the mouth. This difference in tusk size helps observers distinguish males from females in the wild.</p>
      <p>Asian elephants also have smoother skin compared to African elephants, which helps them retain moisture in humid environments. Their feet have five toenails on the front and four on the back, supporting their movement across various terrains. These physical traits aren’t just interesting—they’re vital adaptations that have helped Asian elephants thrive in a range of habitats.</p>

      <h2>Habitat and Distribution of Asian Elephants Across Asia</h2>
      <p>Asian elephants are incredibly adaptable, living in a variety of environments across South and Southeast Asia. They call home to evergreen and deciduous forests, dry forests, grasslands, bamboo thickets, and even swamps. Their range spans 13 countries, including India, Sri Lanka, Myanmar, Thailand, Cambodia, Laos, Vietnam, Malaysia, Indonesia, and China.</p>
      <p>These elephants tend to favor low-lying areas rich in water sources like rivers, springs, and wetlands—places essential for drinking and bathing. In the past, Asian elephants roamed vast, continuous forests, but today, their habitats are fragmented. Human activities like farming, logging, and building roads have carved their homes into smaller, isolated patches. This fragmentation not only restricts their movement but also increases encounters with humans, often leading to conflict.</p>
      <p>Take India, for example. The Western Ghats and Northeastern forests are vital refuges for Asian elephants, while in Southeast Asia, dense jungles in Thailand and Myanmar offer crucial shelter. Yet, as these habitats shrink and break apart, elephants struggle to find mates and maintain healthy genetic diversity. Crossing human settlements becomes a necessity, but it also raises the risk of dangerous interactions.</p>

      <h2>Behavior and Social Structure of Asian Elephants in the Wild</h2>
      <p>Asian elephants are social beings with complex behaviors and communication styles. Female elephants live in matriarchal groups, usually made up of six to seven related females. These groups are led by the oldest and wisest female, who guides the herd to food, water, and safe resting spots. This leadership is key to the group’s survival and cohesion.</p>
      <p>Males tend to live alone, joining female groups only during the mating season. Communication among Asian elephants is rich and varied, involving vocalizations like rumbles and trumpets, as well as body language such as ear flapping and trunk gestures. These signals help keep the group together, warn of danger, and strengthen bonds.</p>
      <p>Elephants are known for their intelligence and emotional depth. They mourn their dead and show empathy toward others in their herd. Researchers have observed elephants returning to the bones of deceased companions, gently touching and caressing them in what seems like a form of remembrance. Such behaviors reveal a profound social awareness rarely seen in the animal kingdom.</p>
      <p>Additionally, Asian elephants communicate using infrasonic sounds—vibrations too low for humans to hear—that travel long distances through dense forests. This allows herds to stay connected even when separated by thick vegetation. Their social structure and communication skills are essential tools for navigating their environment and ensuring the group’s well-being.</p>

      <h2>Diet of the Asian Elephant: What Do These Giants Eat?</h2>
      <p>As herbivores, Asian elephants have a diverse diet that includes grasses, leaves, tree bark, roots, and small stems. Given their enormous size, they need to consume a lot—up to 150 kilograms (330 pounds) of vegetation every day.</p>
      <p>Besides wild plants, Asian elephants sometimes raid crops like sugarcane, bananas, and rice, which can lead to conflicts with farmers. These encounters often cause economic losses for local communities and can provoke retaliatory actions against elephants. Water is just as important; elephants drink daily and spend a good deal of time bathing and cooling off, making access to clean water sources vital for their health.</p>
      <p>Interestingly, Asian elephants are selective feeders. They tend to pick nutrient-rich plants and avoid toxic ones. Their feeding habits also shape their ecosystems. By uprooting trees and trampling vegetation, they create clearings that benefit other wildlife, acting as natural ecosystem engineers.</p>

      <h2>Conservation Status and Threats Facing Asian Elephants Today</h2>
      <p>The Asian elephant is listed as endangered by the International Union for Conservation of Nature (IUCN). Several factors contribute to their declining numbers. Habitat loss and fragmentation top the list, driven by growing human populations and land-use changes. As forests are cleared for farming and development, elephants lose their homes and migration routes.</p>
      <p>Poaching remains a serious threat, mainly for ivory and other body parts. Even though Asian elephants generally have smaller tusks than their African relatives, poachers still target them. Human-elephant conflict is also a growing concern, as elephants damage crops and property, sometimes leading to retaliatory killings.</p>
      <p>Fragmented habitats isolate elephant groups, reducing genetic diversity and increasing their vulnerability to disease and environmental changes. Conservationists stress the importance of maintaining connected habitats to support healthy populations.</p>
      <p>For instance, in Sri Lanka, efforts to reduce conflict include building electric fences and running community awareness programs. Despite these measures, rapid urban growth and expanding agriculture continue to encroach on elephant territories, making conservation a constant challenge.</p>

      <h2>Cultural Significance of Asian Elephants in Asia</h2>
      <p>Asian elephants hold deep cultural and spiritual meaning across many Asian countries. In Hinduism and Buddhism, elephants symbolize wisdom, strength, and good fortune. The elephant-headed god Ganesha is one of the most beloved figures in Hindu culture, representing the removal of obstacles and new beginnings.</p>
      <p>In Thailand, elephants are national icons, featured prominently in festivals, religious ceremonies, and folklore. Historically, they have been used as working animals in logging and ceremonial roles, weaving them tightly into local traditions. This cultural significance highlights the importance of protecting both the species and the heritage they embody, fostering respect and coexistence between humans and elephants.</p>
      <p>In countries like India and Myanmar, elephants play key roles in royal processions and temple rituals, underscoring their revered status. This deep cultural connection has inspired conservation efforts that combine traditional reverence with modern protection strategies.</p>

      <h2>Current Conservation Efforts and Challenges for Asian Elephants</h2>
      <p>Protecting Asian elephants requires a multifaceted approach involving habitat preservation, anti-poaching initiatives, community involvement, and scientific research. Wildlife corridors are being created to reconnect fragmented habitats, allowing elephants to roam freely and maintain genetic diversity. Anti-poaching patrols and stricter enforcement of laws aim to curb illegal hunting.</p>
      <p>Community-based programs educate locals on ways to live alongside elephants, such as using deterrents to prevent crop raids and promoting alternative livelihoods that reduce dependence on farming near elephant habitats. Organizations like the Asian Elephant Protection initiative in China and the Elephant Jungle Sanctuary in Thailand showcase successful models of ethical elephant care and coexistence.</p>
      <p>Technology also plays a role. GPS tracking and population monitoring provide valuable insights that help shape conservation strategies and measure their success. International cooperation and funding support these diverse efforts.</p>
      <p>Still, challenges persist. Expanding agriculture, infrastructure projects, and urban growth continue to eat away at elephant habitats, increasing the risk of conflict. Tackling these issues demands collaboration among governments, conservationists, and local communities. Raising awareness globally and supporting sustainable tourism and conservation programs are crucial steps toward securing a future for Asian elephants.</p>

      <h2>Conclusion: Protecting the Asian Elephant for Future Generations</h2>
      <p>The Asian elephant stands as a symbol of nature’s grandeur and plays a vital role in maintaining healthy ecosystems. Its unique physical features, social complexity, and cultural importance make it a fascinating species worthy of admiration and study. Yet, the threats it faces call for urgent attention and action. By deepening our understanding of the Asian elephant’s biology, behavior, and challenges, we can nurture greater appreciation and a stronger commitment to its conservation.</p>
      <p>With ongoing global cooperation and dedicated efforts, there is hope for a future where Asian elephants coexist peacefully with humans, enriching biodiversity and cultural heritage for generations to come. Supporting conservation organizations, protecting habitats, and encouraging responsible tourism are practical ways anyone can contribute to this important cause.</p>
      <p>For those interested in learning more or getting involved, reputable sources like the World Wildlife Fund (WWF) and the International Union for Conservation of Nature (IUCN) offer valuable information and opportunities to help.</p>

      <h2>Further Reading</h2>
      <ul>
        <li><a href="https://www.ifaw.org/animals/asian-elephants" target="_blank" rel="noopener">Asian Elephants - IFAW</a></li>
        <li><a href="https://elephantjunglesanctuary.com/blog/asian-elephant/" target="_blank" rel="noopener">Asian Elephant - Elephant Jungle Sanctuary</a></li>
        <li><a href="https://www.worldwildlife.org/species/elephant/asian-elephant/" target="_blank" rel="noopener">Asian Elephant - World Wildlife Fund</a></li>
      </ul>
    `,
  },
  {
    id: 3,
    title: "How We Prepare Vitamin Balls for Our Elephants",
    excerpt:
      "Rice, bananas and tamarind — learn what goes into the vitamin balls you'll make with your own hands.",
    image: "images/blog/blog-03.JPG",
    date: "2026-08-30",
    author: "Chokchai Elephant Camp",
    category: "Elephant Care",
    content: `
      <h2>Understanding Elephant Digestion</h2>
      <p>To comprehend the significance of our herbal vitamins, one must first delve into the intricacies of the elephant digestive system. With a cylindrical-shaped stomach, elephants possess a simple digestive process where food is stored for gradual breakdown. The digestive efficiency of these gentle giants stands at approximately 40%-50%. Given the challenges posed by the digestion of their diet, providing supplementary vitamins becomes essential for optimal well-being.</p>

      <h2>The Art of Crafting Elephant Vitamins</h2>
      <p>Our herbal vitamins are carefully concocted from natural ingredients, each serving a unique purpose in supporting the elephants' digestive system. The key ingredient, tamarind, takes center stage in this nutritional symphony; rich in fiber, potassium bitartrate, malic, and tartaric acids, tamarind aids in maintaining the consistency of digestion. Rice husk flour, a protein powerhouse, plays a crucial role in fortifying the overall nutritional content.</p>

      <img src="images/blog/blog-03-a.JPG" alt="นักท่องเที่ยวตำส่วนผสมในครกไม้ ข้างถาดข้าวโพดบด กล้วย และเกลือ">

      <p>Additionally, elephants require essential minerals such as calcium, phosphorus, iron, zinc, and sodium, all of which are thoughtfully integrated into our vitamin recipe through the inclusion of salt. To make the vitamins more palatable, we add the sweet touch of bananas, ensuring our elephants relish every nutritious bite.</p>

      <h2>The Perfect Vitamin Ball</h2>
      <p>Participating in the vitamin-making activity is not only educational but also an engaging experience for everyone. The process is straightforward, and enthusiasts of all ages can join in. The only aspect to be mindful of is the water content; it should strike the right balance, not too sticky or watery, allowing the mixture to be easily shaped into perfect vitamin balls.</p>

      <img src="images/blog/blog-03-b.JPG" alt="ส่วนผสมวิตามินบอลที่ตำเสร็จแล้ววางบนถาดอะลูมิเนียม">

      <p>These unique vitamin balls serve as a powerhouse of nutrients, addressing various aspects of the elephants' health. If you share our passion for the well-being of these incredible creatures, we invite you to participate in this enriching activity offered exclusively at Chokchai Elephant Camp.</p>

      <img src="images/blog/blog-03-c.JPG" alt="นักท่องเที่ยวนั่งปั้นวิตามินบอลกับกล้วยที่โต๊ะไม้">

      <h2>Join Us in Nurturing Elephant Health</h2>
      <p>At Chokchai Elephant Camp, we believe in the power of collective efforts to ensure the health and happiness of our elephants. If you're intrigued by the prospect of contributing to the well-being of these majestic animals, we encourage you to explore the vitamin-making activity during your visit. Your involvement not only fosters a deeper connection with the elephants but also contributes to their overall health and vitality.</p>

      <img src="images/blog/blog-03-d.JPG" alt="วิตามินบอลสอดไส้กล้วยที่ปั้นเสร็จแล้ววางเรียงบนถาด">

      <p>Come, be a part of the journey to nurture and nourish our elephants at Chokchai Elephant Camp.</p>
    `,
  },
  {
    id: 4,
    title: "Bamboo Rafting on the Mae Taeng River",
    excerpt:
      "Glide down a calm jungle river on a handmade bamboo raft and see Chiang Mai from a different angle.",
    image: "images/blog/blog-04.JPG",
    date: "2026-08-16",
    author: "Chokchai Elephant Camp",
    category: "Activities",
    content: `
      <p>Take a peaceful journey along the Mae Taeng River, surrounded by lush green forests and the natural beauty of northern Thailand. Sitting on a traditional handmade bamboo raft, you can simply relax and enjoy the gentle flow of the river as the scenery slowly passes by.</p>

      <img src="images/blog/blog-04-b.JPG" alt="วิวแม่น้ำแม่แตงและป่าเขียวมองจากบนแพไม้ไผ่ใต้ร่มสีรุ้ง">

      <h2>The Quieter Side of Chiang Mai</h2>
      <p>Bamboo rafting is a wonderful way to experience the quieter side of Chiang Mai. Listen to the sounds of nature, feel the fresh air and watch the changing landscape along the river. Depending on the season and water conditions, the river may be calm and relaxing, making the experience perfect for slowing down after a day of activities.</p>

      <h2>Handmade Rafts, Local Guides</h2>
      <p>Our bamboo rafts are made from locally sourced bamboo and designed to float gently along the river. Your local guide will accompany you and help make sure you have a safe and enjoyable experience.</p>

      <img src="images/blog/blog-04-c.JPG" alt="ไกด์ท้องถิ่นถือไม้ไผ่ถ่อแพล่องไปตามแม่น้ำแม่แตง">

      <h2>Northern Thailand at a Slower Pace</h2>
      <p>Whether you're travelling with family, friends or as a couple, Mae Taeng River bamboo rafting offers a chance to step away from the busy tourist routes and experience northern Thailand at a slower pace.</p>

      <img src="images/blog/blog-04-a.JPG" alt="นักท่องเที่ยวลองถ่อแพไม้ไผ่ด้วยตัวเองท่ามกลางป่าริมแม่น้ำ">

      <p>Sit back, enjoy the river, and let the jungle scenery take you along.</p>
    `,
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
    content: `
      <p>At our sanctuary, we believe that spending time with elephants should be about respect, understanding and care — not riding.</p>

      <h2>Why We Don't Offer Riding</h2>
      <p>For this reason, we do not offer elephant riding. Instead, our activities focus on allowing visitors to observe elephants behaving naturally, learn about their daily lives and take part in gentle, supervised activities such as preparing food and vitamin balls.</p>

      <h2>Wellbeing Comes First</h2>
      <p>We believe elephants should have the freedom to walk, eat, rest and interact at their own pace. Our team works to create an environment where the elephants' wellbeing comes first, while giving visitors the opportunity to appreciate these incredible animals without treating them as entertainment.</p>

      <h2>What Makes an Experience Truly Ethical</h2>
      <p>An ethical elephant experience is not about how close you can get or how many activities you can do. It is about creating a meaningful connection while respecting the animal's needs and natural behaviour.</p>

      <h2>More Than Just Photographs</h2>
      <p>When you visit us, we hope you leave with more than just photographs. We hope you leave with a deeper understanding of elephants — and why caring for them responsibly matters.</p>
    `,
  },
  {
    id: 6,
    title: "Where Thailand’s Gentle Giants Come Out to Play!",
    excerpt:
      "Splashing, mud rolling and trunk games — discover the playful side of the elephants at Chokchai Elephant Camp.",
    image: "images/blog/blog-06.jpg",
    date: "2026-08-31",
    author: "Chokchai Elephant Camp",
    category: "Wildlife",
    content: `
      <p>Have you ever seen an elephant splash through the water, roll happily in the mud, or playfully tease a friend with its trunk?</p>
      <p>At Chokchai Elephant Camp, every visit is an opportunity to slow down, connect with nature, and discover the charming personalities of Thailand’s beloved elephants.</p>
      <img src="images/blog/blog-06-a.jpg" alt="นักท่องเที่ยวสาดน้ำให้ช้างในแม่น้ำ">
      <h2>The Playful Side of Elephants</h2>
      <p>When elephants feel relaxed and comfortable, their playful side may begin to appear. You might see them spraying water, rolling in cool mud, tossing small branches, gently nudging one another, or chasing their elephant friends. Sometimes, even a simple trunk wiggle can become a very serious game!</p>
      <p>These moments are not only adorable—they also tell us something important about elephant life. Play helps elephants explore their surroundings, practise useful skills, communicate, and strengthen their social relationships.</p>
      <h2>Every Elephant Has Its Own Personality</h2>
      <p>Just like people, every elephant has a unique personality. Some are curious adventurers, some are enthusiastic water-play champions, and others prefer to stand quietly and watch the excitement from a peaceful corner.</p>
      <img src="images/blog/blog-06-b.jpg" alt="ลูกช้างเดินอยู่ระหว่างช้างโตสองเชือกบนทุ่งหญ้า">
      <h2>Natural Moments, Never Forced</h2>
      <p>The most beautiful moments are always the natural ones. Elephants should never be forced to perform or play. At Chokchai Elephant Camp, we encourage visitors to respect their space, observe their behaviour, and appreciate each elephant’s individual mood.</p>
      <p>Some days may bring a spectacular splash. Other days, you may witness a gentle trunk touch, a happy step, or a peaceful moment shared between an elephant and its mahout. Every visit offers a different story—and that is what makes the experience so special.</p>
      <h2>Spend a Day with Us</h2>
      <p>If you are searching for a meaningful adventure filled with nature, learning, laughter, and unforgettable elephant encounters, come and spend a day with us in the beautiful countryside of Mae Taeng, Chiang Mai.</p>
      <p>Come with curiosity, an open heart, and your camera. You may arrive as a visitor, but you will leave with wonderful memories and a deeper appreciation for these magnificent animals.</p>
      <p><strong>Chokchai Elephant Camp — Mae Taeng, Chiang Mai, Thailand</strong></p>
      <p>Which playful elephant moment would you love to see? Team Splash or Team Mud?</p>
    `,
  },
  {
    id: 7,
    title: "Feed Elephants Chiang Mai Guide for Ethical Tourism",
    excerpt:
      "Where to feed elephants in Mae Taeng, what to expect on your visit and how to interact with them responsibly.",
    image: "images/blog/blog-07.jpg",
    date: "2026-04-04",
    author: "Chokchai Elephant Camp",
    category: "Travel",
    content: `
      <p>Feeding elephants in Chiang Mai, especially in the beautiful Mae Taeng area, is more than just a fun activity—it’s a chance to form a genuine connection with these gentle giants. For travelers and animal lovers, this experience offers a meaningful way to support elephant welfare and conservation. Unlike the typical elephant rides or shows, the ethical sanctuaries around Mae Taeng focus on rescuing and rehabilitating elephants, providing them with a peaceful, natural environment where they can live without stress. If you’re gearing up for a visit to Chiang Mai and want to learn how to feed elephants responsibly, this guide will walk you through the best spots to visit, what to expect, how to interact respectfully, and tips to make your trip truly memorable.</p>
      <h2>Feed Elephants Chiang Mai: Best Places to Feed Elephants in Mae Taeng</h2>
      <p>Mae Taeng is well-known for its ethical elephant sanctuaries that put the elephants’ well-being first. These places offer wide, natural spaces where rescued elephants can roam freely, and visitors get to participate in feeding and caring activities that directly support conservation efforts.</p>
      <h2>Elephant Highlands and Sunshine for Elephants: Responsible Sanctuaries in Mae Taeng</h2>
      <p>Other noteworthy sanctuaries in Mae Taeng include Elephant Highlands and Sunshine for Elephants. Both offer day visits and volunteer programs focused on responsible elephant care. They strictly ban riding and tethering, creating a calm environment where elephants can thrive naturally. Visitors can join in feeding, bathing, and observing the elephants, gaining insight into their social lives and emotional depth.</p>
      <h2>What to Expect During Your Visit to Feed Elephants in Chiang Mai</h2>
      <p>When you visit a sanctuary to feed elephants in Chiang Mai, you’re stepping into a well-organized, immersive experience designed to build respect and connection with these magnificent animals. Typically, your visit starts with an introduction to the elephants and their backgrounds, helping you understand their personalities and life stories. This context makes the experience more meaningful and personal.</p>
      <p>You’ll often begin by preparing food—chopping fresh fruits and vegetables under the guidance of experienced staff. Feeding the elephants is a magical moment; they use their trunks with surprising dexterity to gently take food from your hands or feeding platforms. Watching their slow, deliberate movements reveals their intelligence and sensitivity in a way that photos can’t capture.</p>
      <p>After feeding, you might see the elephants enjoying mud baths or swimming in nearby rivers—activities that are essential for their skin health and cooling down. At Elephant Nature Park, visitors can choose from half-day, full-day, or even overnight stays. Longer visits allow you to help with food preparation, cleaning enclosures, and maintaining the shelter. These hands-on experiences offer a rare glimpse into the sanctuary’s daily life and deepen your bond with the elephants.</p>
      <h2>Guidelines for Responsible Interaction When You Feed Elephants Chiang Mai</h2>
      <p>Interacting with elephants calls for mindfulness and respect to keep both visitors and animals safe and comfortable. To support ethical tourism, it’s important to follow these guidelines when feeding elephants in Chiang Mai:</p>
      <ul>
        <li><strong>Follow sanctuary rules and staff instructions:</strong> These are in place to protect everyone and ensure a positive experience.</li>
        <li><strong>Feed only approved food:</strong> Stick to the fruits and vegetables provided or approved by the sanctuary to keep the elephants healthy.</li>
        <li><strong>Avoid loud noises and sudden movements:</strong> Elephants are sensitive and can get startled easily, so stay calm and gentle.</li>
        <li><strong>Respect the elephants’ space:</strong> Let the elephants approach you on their own terms, fostering trust and comfort.</li>
        <li><strong>Support ethical sanctuaries:</strong> Choose places that prioritize elephant welfare and avoid those that exploit animals for entertainment or profit.</li>
      </ul>
      <h2>Tips for Making the Most of Your Trip to Feed Elephants in Chiang Mai</h2>
      <p>To get the most out of your experience feeding elephants in Chiang Mai, here are some handy tips:</p>
      <ul>
        <li><strong>Book in advance:</strong> Especially for overnight or volunteer programs, as spots fill up quickly due to high demand.</li>
        <li><strong>Dress appropriately:</strong> Wear comfortable clothes suited to the weather and sturdy shoes for walking on natural terrain.</li>
        <li><strong>Bring a camera:</strong> Capture special moments but avoid using flash, which can disturb the elephants.</li>
        <li><strong>Learn about the elephants:</strong> Take time to listen to guides and hear each elephant’s story to deepen your connection.</li>
        <li><strong>Combine your visit with local culture:</strong> Explore Mae Taeng and Chiang Mai’s rich cultural heritage for a fuller travel experience.</li>
        <li><strong>Support the sanctuary:</strong> Consider buying souvenirs or making donations to help fund ongoing care and rehabilitation efforts, contributing to the elephants’ future.</li>
      </ul>
      <h2>Conclusion: Supporting Ethical Elephant Tourism in Chiang Mai</h2>
      <p>Feeding elephants in Mae Taeng is more than just a tourist activity—it’s a meaningful way to support the rescue and rehabilitation of these incredible animals. By choosing ethical sanctuaries like Elephant Nature Park, you help promote compassionate treatment and conservation efforts that allow elephants to live freely and happily in environments that respect their natural behaviors.</p>
      <p>This guide has shared the best places to feed elephants, what to expect during your visit, how to interact responsibly, and tips to enhance your experience. Embracing ethical elephant tourism not only creates lasting memories but also supports a sustainable future for Asia’s beloved elephants. For more details and bookings, check out the official websites of Elephant Nature Park and other trusted Mae Taeng sanctuaries. Approach this unique experience with care and respect, and you’ll be part of a movement that protects and cherishes these amazing creatures.</p>
      <h2>Further Reading</h2>
      <ul>
        <li><a href="https://www.facebook.com/groups/travelthailandgroup/posts/1624990398289743/" target="_blank" rel="noopener">Travel Thailand Group Facebook Post</a></li>
        <li><a href="https://www.facebook.com/groups/52526883526/posts/10161134517153527/" target="_blank" rel="noopener">Elephant Care Community Facebook Post</a></li>
      </ul>
    `,
  },
  {
    id: 8,
    title: "Thai Elephants and the Global Perspective: Love, Culture, and Different Understandings",
    excerpt:
      "Thailand’s deep bond with elephants, the lessons of history and why cross-cultural understanding matters for ethical elephant care.",
    image: "images/blog/blog-08.jpg",
    date: "2026-02-03",
    author: "Chokchai Elephant Camp",
    category: "Travel",
    content: `
      <p>Thailand is one of the countries with a long and deep relationship with elephants. Elephants are not only former working animals or symbols of strength, but also important cultural and historical icons that are closely tied to Thai identity. Many mahouts and elephant caretakers see elephants as members of their own families, passing down knowledge of care from generation to generation. This often raises the question: Is there anywhere that loves elephants as much as the people who live and work with them every day?</p>
      <p>In modern times, however, animal welfare and ethical tourism have become global concerns. Some international tourists may receive information or images that create the perception of elephant mistreatment, which can lead to criticism of elephant care practices in different countries. At the same time, many elephant camps and caretakers in Thailand have been adapting and improving their standards to align more closely with international animal-welfare principles.</p>
      <img src="images/blog/blog-08-a.jpg" alt="โปสเตอร์ Thai Elephants &amp; Global Perspectives ว่าด้วยวัฒนธรรม ความเมตตา และการท่องเที่ยวอย่างมีจริยธรรม">
      <h2>Lessons from History</h2>
      <p>History also shows that problems in the treatment of elephants have not been limited to any single nation. Several well-known historical cases are often cited in discussions about animal ethics, including:</p>
      <img src="images/blog/blog-08-x.jpg" alt="ภาพถ่ายเก่าของช้างที่ถูกล่ามโซ่ทั้งตัว">
      <p><strong>Mary the Elephant</strong>, who was killed after being judged impossible to control or train according to human expectations.</p>
      <img src="images/blog/blog-08-y.jpg" alt="ภาพพิมพ์เก่าแสดงเหตุการณ์ยิงช้างในสวนสัตว์ที่ปารีส">
      <p><strong>Castor and Pollux</strong>, twin elephants that were shot in a zoo and later used as meat.</p>
      <img src="images/blog/blog-08-z.jpg" alt="ภาพถ่ายเก่าของช้าง Topsy ท่ามกลางฝูงชน">
      <p><strong>Topsy</strong>, an elephant that was put to death after appearing in film productions through the use of electrical execution.</p>
      <p>These events are frequently referenced as historical lessons in animal welfare, highlighting how standards of care in the past were often inadequate and how such incidents contributed to the rise of animal-rights awareness worldwide.</p>
      <h2>Elephants in Thailand Today</h2>
      <p>In Thailand, elephants have long been regarded as national heritage animals, connected to royal history, religion, and traditional ceremonies. Today, many elephant sanctuaries and camps are shifting their focus toward activities such as feeding, bathing, observation, and educational experiences that emphasize the elephants’ natural behavior rather than heavy labor or stressful performances.</p>
      <h2>The Path Forward</h2>
      <p>Conservation experts agree that transparent information and cross-cultural understanding are essential. Sharing knowledge and improving international cooperation on animal-welfare standards can help reduce misunderstandings and promote more responsible tourism.</p>
      <p>Ultimately, ethical elephant care — respecting animal rights while preserving cultural heritage — is increasingly recognized as the path forward. Collaboration among caretakers, tourists, researchers, and authorities will be key to ensuring that elephants around the world are treated with dignity and compassion in the years to come.</p>
    `,
  },
  {
    id: 9,
    title: "Elephant Welfare Myth: “No Hook (No Use of Hooks) Is the Only Ethical Standard?”",
    excerpt:
      "Is “no hook” really the only ethical standard? What experts say about tools, training and true elephant welfare.",
    image: "images/blog/blog-09.jpg",
    date: "2026-02-03",
    author: "Chokchai Elephant Camp",
    category: "Travel",
    content: `
      <h2>What Is an Elephant Hook?</h2>
      <p>An elephant hook is a traditional tool used by mahouts (elephant handlers) that helps communicate direction and guide elephants. It has been part of traditional elephant handling (Thai khanabal) for many years.</p>
      <h2>Understanding the Myth</h2>
      <p>Many advocates and tourists see any form of tool or restraint—such as hooks or chains—as inherently unethical. The idea is that no hook = good and any hook = abuse. But this binary view is misleading.</p>
      <p>According to expert veterinarians and wildlife specialists in Thailand, including those quoted in MGR Online, the presence or absence of hooks alone does not determine welfare. What matters is how tools are used, why they are used, and whether the overall welfare of the elephant—including safety and psychological comfort—is prioritized.</p>
      <img src="images/blog/blog-09-a.jpg" alt="ภาพเปรียบเทียบ Myth กับ Fact เรื่องการใช้ตะขอของควาญช้าง">
      <h2>Traditional Use vs. Cruel Abuse</h2>
      <p>In Thai elephant handling tradition (khanabal), tools like hooks or chains were historically used to guide elephants safely and prevent harm, not to injure them.</p>
      <p>In practice, the controlled, careful use of tools helps mahouts manage large animals safely, especially in situations of fear, danger, or aggression.</p>
      <p>Tools are not inherently abusive, but abusive use (e.g., violent striking, causing wounds, or using tools without training) is harmful and unethical.</p>
      <p>The article explains that even advocates of strict “no hook” policies may inadvertently hide harmful practices—or worse, create situations where untrained animals are difficult to control and potentially dangerous.</p>
      <h2>What Science and Experts Say</h2>
      <p>Experts emphasize that true welfare standards focus on animal health, safety, behavior, stress, environment, and the capability of caregivers to handle elephants responsibly — not simply on the absence of a single tool.</p>
      <p>They note that:</p>
      <ul>
        <li>Elephants that have never been trained with tools like hooks may be unsafe to manage, especially in emergencies when rapid direction or control is needed.</li>
        <li>Proper welfare demands knowledgeable handlers, appropriate training, and tools used only to communicate rather than harm.</li>
        <li>Misleading claims that all hooks must be banned absolutely ignore the reality that well-trained animals and handlers can coexist safely and humanely.</li>
      </ul>
      <h2>A Wider Perspective on Welfare</h2>
      <p>Animal-welfare organizations also distinguish between different contexts of tool use. For example, in some high-welfare sanctuaries, hooks are not needed during routine visitor interactions, but they may still be present for emergency control only. This highlights a balanced approach rather than a simplistic ban.</p>
      <h2>Conclusion: Tools Are Not the Whole Story</h2>
      <p>The belief that no hook is the only ethical standard is a myth. What matters most for elephant welfare is:</p>
      <ul>
        <li>Overall care quality</li>
        <li>Skilled and compassionate mahouts</li>
        <li>Safe environments</li>
        <li>Proper rest, food, and veterinary access</li>
        <li>Humane use of any handling tools — when and only if necessary</li>
      </ul>
      <p>Welfare should be evaluated by behavioral science, veterinary insight, and ethical practice, not by a single rule about tools.</p>
      <p>By understanding the full context and consulting scientific and expert sources, travelers can make more informed decisions about elephant tourism and support truly responsible care.</p>
      <h2>Reference</h2>
      <ul>
        <li>MGR Online. <a href="https://mgronline.com/daily/detail/9690000010582" target="_blank" rel="noopener">ความเข้าใจผิดและข่าวเท็จกับความจริงทางวิทยาศาสตร์ของการเลี้ยงช้าง</a></li>
      </ul>
    `,
  },
  {
    id: 10,
    title: "Elephant Activities in Thailand: Choices, Welfare Standards, and Responsible Tourism",
    excerpt:
      "Thailand’s elephant camp standards, and how riding and non-riding activities differ for visitors.",
    image: "images/blog/blog-10.jpg",
    date: "2026-02-03",
    author: "Chokchai Elephant Camp",
    category: "Travel",
    content: `
      <p>Thailand has established clear standards and guidelines for elephant care.</p>
      <p>At present, elephant camps are encouraged to follow the <strong>Elephant Camp Standards (มก.อช.)</strong> developed by the <strong>National Bureau of Agricultural Commodity and Food Standards (ACFS)</strong>. These standards serve as a reference framework and practical guideline for elephant facilities across the country. They cover various types of camps, including tourism-based, conservation-focused, and educational centers, with emphasis on rest periods, health checks, food and water management, living environments, and overall safety for elephants.</p>
      <p>At the same time, Thailand also enforces the Animal Cruelty Prevention and Animal Welfare Act B.E. 2557 (2014), which sets legal penalties for those who fail to comply with animal-welfare principles. This law aims to raise and maintain consistent standards of animal care nationwide.</p>
      <h2>The Difference Between Riding and Non-Riding Elephant Activities</h2>
      <p>Many travelers visiting Thailand often ask which type of activity is more suitable.</p>
      <p>Tourism experts note that elephant-related programs today come in many forms and are generally considered a personal choice, as each option provides a different kind of experience.</p>
      <p><strong>Riding Experience</strong></p>
      <ul>
        <li>Enjoy natural scenery from a higher viewpoint</li>
        <li>Supervised by trained and professional staff</li>
        <li>Time limits and weight controls are applied for safety</li>
      </ul>
      <p><strong>Non-Riding Activities</strong></p>
      <ul>
        <li>Feeding elephants</li>
        <li>Bathing elephants</li>
        <li>Preparing vitamin balls or supplements</li>
        <li>Close interaction and photography</li>
      </ul>
      <p>In standardized elephant camps, elephants are provided with daily rest periods, professional caretakers, and appropriate living conditions. Visitors can therefore choose activities that align with their personal comfort level and preferences.</p>
    `,
  },
  {
    id: 11,
    title: "Muay Thai & Elephant Care Experience at Chokchai Elephant Camp",
    excerpt:
      "Train in Thailand’s national sport and spend time caring for elephants — all in one program.",
    image: "images/blog/blog-11.jpg",
    date: "2026-01-24",
    author: "Chokchai Elephant Camp",
    category: "Travel",
    content: `
      <h2>Muay Thai &amp; Elephant Care Program</h2>
      <p>This special program is designed for visitors who want to experience both Thailand’s national sport and its gentle giants in a responsible way.</p>
      <h2>What You Will Experience</h2>
      <ul>
        <li><strong>Muay Thai Training Session:</strong> Learn basic Muay Thai techniques with experienced local trainers. The session focuses on fundamentals, movement, and fun—no prior experience required.</li>
        <li><strong>Ethical Elephant Care Activities:</strong> Spend quality time with our elephants through feeding, preparing vitamin balls, and observing their natural behavior. No riding, no shows—only care and respect.</li>
        <li><strong>Cultural &amp; Educational Experience:</strong> Gain insight into elephant conservation, local wisdom, and the cultural importance of Muay Thai in Thai society.</li>
      </ul>
      <img src="images/blog/blog-11-a.jpg" alt="ครูมวยสอนท่ามวยไทยพื้นฐานให้ผู้เข้าร่วมบนเวที">

      <img src="images/blog/blog-11-b.jpg" alt="ผู้เข้าร่วมฝึกมวยไทยบนลานฝึก โดยมีช้างอยู่ด้านหลัง">
      <h2>Who Is This Program For?</h2>
      <ul>
        <li>Travelers looking for a unique and active experience</li>
        <li>Muay Thai beginners and enthusiasts</li>
        <li>Visitors interested in ethical tourism and animal welfare</li>
        <li>Families, couples, and solo travelers seeking something different</li>
      </ul>
      <img src="images/blog/blog-11-e.jpg" alt="ครูมวยสาธิตท่าทางให้ผู้เข้าร่วมบนลานฝึก">
      <h2>Why Choose This Experience?</h2>
      <ul>
        <li>Combines sport, culture, and conservation</li>
        <li>Ethical, elephant-friendly activities</li>
        <li>Small groups for a more personal experience</li>
        <li>Managed by a local camp with long-term elephant care commitment</li>
      </ul>
      <img src="images/blog/blog-11-d.jpg" alt="ผู้ชมยืนรอบเวทีมวย Chokchai Boxing Gym">
      <h2>Interested in Muay Thai &amp; Elephant Care?</h2>
      <p>Feel free to contact Chokchai Elephant Camp for more details and availability.</p>
      <p>Muay Thai training is available—just ask!</p>
      <img src="images/blog/blog-11-c.jpg" alt="เวทีมวย Chokchai Boxing Gym พร้อมโลโก้ช้างสวมนวม">

      <img src="images/blog/blog-11-f.jpg" alt="เวทีมวยและกระสอบทรายตั้งพื้นในโรงฝึก">
    `,
  },
  {
    id: 12,
    title: "Welcome Baby Nappa – Newborn Elephant at Chokchai Camp",
    excerpt:
      "Meet Baby Nappa, the newborn female elephant born to her mother Molopo at Chokchai Elephant Camp.",
    image: "images/blog/blog-12.jpg",
    date: "2025-11-03",
    author: "Chokchai Elephant Camp",
    category: "Travel",
    content: `
      <p>A beautiful moment unfolded at Chokchai Elephant Camp in Mae Taeng, Chiang Mai, as the team joyfully welcomed Baby Nappa, a newborn female elephant born to her loving mother Molopo on March 19, 2025.</p>
      <h2>First Steps</h2>
      <p>In the soft morning light, Baby Nappa took her first steps beside her mother, who gently guided and protected her every move. The atmosphere at the camp was filled with happiness and emotion as caretakers and veterinarians, who had been watching over Molopo for weeks, celebrated the safe and natural birth.</p>
      <img src="images/blog/blog-12-a.jpg" alt="ลูกช้างแรกเกิดนอนพักบนพื้น">
      <h2>Bonding with Mother Molopo</h2>
      <p>At present, Molopo and Nappa are staying in a quiet, secure area of the camp where they can bond naturally and adjust to their surroundings. A dedicated care team continues to monitor them closely, providing the best nutrition, comfort, and medical attention.</p>
      <img src="images/blog/blog-12-b.jpg" alt="ลูกช้างเล่นน้ำในกะละมังข้างงวงของแม่ช้าง">
      <h2>Meeting Baby Nappa</h2>
      <p>In the coming months, Chokchai Elephant Camp plans to introduce special educational and eco-tourism activities, allowing visitors to meet Baby Nappa and learn more about elephant care and conservation. Through her story, the camp hopes to inspire love and respect for elephants and raise awareness about the importance of protecting Thailand’s wildlife.</p>
      <h2>A Symbol of Hope</h2>
      <p>Baby Nappa’s birth is not only a celebration of new life — it’s a symbol of hope, love, and the deep connection between humans and nature.</p>
    `,
  },
  {
    id: 13,
    title: "Visiting Elephants at Chokchai Elephant Camp",
    excerpt:
      "How our elephants came to live alongside people, and what “Elephants help people, people help elephants” means for your visit.",
    image: "images/blog/blog-13.jpg",
    date: "2023-12-06",
    author: "Chokchai Elephant Camp",
    category: "Travel",
    content: `
      <p>At the Chokchai Elephant Camp, elephants have developed an incredible bond with travelers because these elephants have lived alongside humans for their entire lives. They initially came here after being rescued from logging activities at the border. This history has made these elephants incredibly familiar with people throughout their lives. Visitors can get up close, hug, or even touch the elephants. However, for the safety of everyone, especially during male elephant temperamental moments, there's a precautionary health check before any encounters.</p>
      <img src="images/blog/blog-13-b.jpg" alt="ช้างสองเชือกกำลังกินหญ้าบนทุ่ง">
      <h2>Elephants Help People, People Help Elephants</h2>
      <p>Chokchai Elephant Camp has been operating for 17 years, but the conservation program for elephants was introduced in 2022. Despite the camp's reopening, the income from conservation programs isn't enough to cover the camp's expenses like elephant food, healthcare, and more. The elephants consume around 200 kilograms of food per day, costing approximately 15,000 Baht. This has led to the camp's slogan "Elephants help people, people help elephants" this year. Consequently, the elephant rides here are unique because the elephants roam naturally, munching on leaves and foliage along the way. Travelers get to witness their happy ear flaps and wagging tails, signs of contentment. This approach is aimed at reducing stress for these elephants, letting them be themselves. However, due to the current limitations and reduced workforce, the number of tourists for elephant rides is restricted per day.</p>
      <img src="images/blog/blog-13-a.jpg" alt="นักท่องเที่ยวนั่งช้างเดินผ่านทุ่งหญ้าท่ามกลางภูเขา">
      <h2>A Careful Return</h2>
      <p>This return aims to limit the daily walks of the elephants and aid them in regaining their previous income levels. Before COVID-19, there were 200 employees; now, only about 50 remain. This situation has urged restrictions on elephant walks per day, aiding in restoring the elephants' income. Older elephants have programs that ensure they don't get overwhelmed by tourists, and their accommodations have been improved.</p>
      <p>The hope is that this return will help create a better environment for the elephants and attract tourists to visit the Chokchai Elephant Camp under the slogan "Elephants help people, people help elephants." Let's join hands and hearts to support both the camp and its elephants during this visit.</p>
    `,
  },
  {
    id: 14,
    title: "History of Chokchai Elephant Camp Chiangmai",
    excerpt:
      "From a single elephant in 2006 to a renewed purpose today — the story of Chokchai Elephant Camp and its founder, Mr. Eddie.",
    image: "images/blog/blog-14.jpg",
    date: "2023-11-03",
    author: "Chokchai Elephant Camp",
    category: "Travel",
    content: `
      <p>Chokchai Elephant Camp, nestled in the picturesque locale of Mae Tang, Chiangmai, Thailand, stands as a renowned tourist attraction since its inception in January 2006. Over the past 17 years, the camp has undergone significant transformations, evolving into a prominent destination under the stewardship of its founder, Mr. Chokchai Srisirivilai, affectionately known as Mr. Eddie.</p>
      <img src="images/blog/blog-14-a.jpg" alt="ผู้หญิงยืนหน้าโรงช้างของปางช้างโชคชัย">
      <h2>Humble Beginnings</h2>
      <p>The camp's origins trace back to Mr. Eddie's humble beginnings with just one elephant, the beloved "Ming Jalearn." To meet the growing demand, he rented six additional elephants from Mae Jam, with the initial caretaker, "So," managing the spirited male elephant, "Sae Dor." As the enterprise flourished, requiring more space, Mr. Chokchai expanded the camp by acquiring additional land. The community's collaborative spirit was evident in 2552 when local villagers volunteered to construct the first bouncing bridge, connecting the camp to the opposite bank. Subsequently, in 2557, a second bridge was built to enhance structural integrity.</p>
      <img src="images/blog/blog-14-c.jpg" alt="ควาญช้างเดินนำช้างบนทางเดินในป่า">

      <img src="images/blog/blog-14-e.jpg" alt="ทางดินเข้าสู่ปางช้างมองจากในรถ">
      <h2>Years of Growth</h2>
      <p>Mr. Eddie's prior experience as a tour guide contributed to the camp's early success. The first program introduced was elephant riding, a much sought-after activity. The camp gradually introduced attractions such as the long neck village and captivating elephant shows within its premises. Between 2554 and 2556, Chokchai Elephant Camp soared in popularity, attracting over 2000 tourists daily during China's National Day, boasting a workforce of more than 200 employees, and owning a commendable fleet of 80 elephants.</p>
      <img src="images/blog/blog-14-b.jpg" alt="ผู้ชมจำนวนมากนั่งชมการแสดงในปางช้าง">

      <img src="images/blog/blog-14-h.jpg" alt="รถตู้นักท่องเที่ยวจอดเรียงกันในลานจอดรถ">

      <img src="images/blog/blog-14-g.jpg" alt="ลานจอดรถของปางช้างในช่วงที่มีนักท่องเที่ยวจำนวนมาก">

      <img src="images/blog/blog-14-d.jpg" alt="นักท่องเที่ยวตักอาหารบุฟเฟต์ในโรงอาหารของปางช้าง">
      <h2>Hard Times</h2>
      <p>However, the advent of the Covid-19 pandemic in recent years dealt a severe blow to Mr. Eddie's financial stability. The resulting economic downturn affected daily operations, leading to decreased tourism, financial strain, and a subsequent reduction in staff as some mahouts left the camp. In response, Mr. Eddie sought assistance from foundations to mitigate the impact.</p>
      <p>Tragically, in 2564, Mr. Eddie was diagnosed with intestinal cancer, leaving him with approximately a year to live. On January 11, 2565, at 12:10 A.M., he passed away. In his last testament, dated January 10, 2565, he expressed his wish to pass on his entire business to his daughter.</p>
      <img src="images/blog/blog-14-f.jpg" alt="ผู้หญิงในชุดพื้นเมืองยืนหน้าฝูงช้างของปางช้างโชคชัย">
      <h2>A Renewed Purpose</h2>
      <p>Despite the challenges, the camp continues to operate with a renewed purpose. In 2023, it embraces the visionary concept of "Better mahout life, Better elephant care." This forward-looking approach seeks to improve the lives of mahouts and, by extension, the well-being of the elephants under their care. As Chokchai Elephant Camp navigates its future, it does so with a commitment to honoring Mr. Eddie's legacy and advancing the cause of responsible elephant tourism.</p>
    `,
  },
  {
    id: 15,
    title: "Elephants communicate using a wide range of vocalizations, including trumpets and rumbles. They also use infrasound, which is below the range of human hearing, to communicate over long distances.",
    excerpt:
      "Trumpets, rumbles and infrasound — how elephants talk to each other over long distances.",
    image: "images/blog/blog-15.jpg",
    date: "2023-09-17",
    author: "Chokchai Elephant Camp",
    category: "Travel",
    content: `
      <p>Elephants communicate using a wide range of vocalizations, including trumpets and rumbles. They also use infrasound, which is below the range of human hearing, to communicate over long distances.</p>
    `,
  },
  {
    id: 16,
    title: "Chokchai and San-dee: Two majestic souls, forever bonded by friendship.",
    excerpt:
      "Two majestic souls, forever bonded by friendship.",
    image: "images/blog/blog-16.jpg",
    date: "2023-09-17",
    author: "Chokchai Elephant Camp",
    category: "Travel",
    content: `
      <p>Chokchai and San-dee: Two majestic souls, forever bonded by friendship.</p>
    `,
  },
  {
    id: 17,
    title: "Chokchai Elephant Camp.",
    excerpt:
      "Our heartfelt gratitude to everyone who chooses to visit Chokchai Elephant Camp.",
    image: "images/blog/blog-17.jpg",
    date: "2023-09-17",
    author: "Chokchai Elephant Camp",
    category: "Travel",
    content: `
      <p>We want to extend our heartfelt gratitude for choosing to visit Chokchai Elephant Camp. Your presence enriches our journey and brings joy to our gentle giants. We hope you had a memorable experience with us and created beautiful memories that will last a lifetime. Thank you for supporting our mission of promoting elephant welfare and conservation.</p>
    `,
  },
  {
    id: 18,
    title: "Did you know that elephants are not only majestic",
    excerpt:
      "Did you know that elephants are not only majestic, but also highly intelligent creatures?",
    image: "images/blog/blog-18.jpg",
    date: "2023-09-17",
    author: "Chokchai Elephant Camp",
    category: "Travel",
    content: `
      <p>Did you know that elephants are not only majestic, but also highly intelligent creatures?</p>
    `,
  },
  {
    id: 19,
    title: "Join us in celebrating the wonders of nature as we feed these gentle giants!",
    excerpt:
      "Celebrate the wonders of nature as we feed these gentle giants.",
    image: "images/blog/blog-19.jpg",
    date: "2023-09-17",
    author: "Chokchai Elephant Camp",
    category: "Travel",
    content: `
      <p>Join us in celebrating the wonders of nature as we feed these gentle giants!</p>
    `,
  },
  {
    id: 20,
    title: "Discover the fascinating world of elephants",
    excerpt:
      "Discover the fascinating world of elephants and learn why stepping on their poop can actually be a good thing!",
    image: "images/blog/blog-20.jpg",
    date: "2023-09-17",
    author: "Chokchai Elephant Camp",
    category: "Travel",
    content: `
      <p>Discover the fascinating world of elephants and learn why stepping on their poop can actually be a good thing!</p>
    `,
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
