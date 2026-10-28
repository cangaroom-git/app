export type ShortVideoCategory =
  | "all"
  | "mist"
  | "villas"
  | "dining"
  | "coffee"
  | "stargaze"
  | "road";

export interface ShortVideoComment {
  id: string;
  user: string;
  text: string;
  time: string;
  likes?: number;
  isLiked?: boolean;
}

export interface ShortVideoItem {
  id: string;
  titleTh: string;
  titleEn: string;
  captionTh: string;
  captionEn: string;
  hashtags: string[];
  videoUrl: string;
  posterUrl: string;
  audioLabel: string;
  likes: number;
  comments: ShortVideoComment[];
  roomIndex: number;
  couponCode?: string;
  category: ShortVideoCategory;
  views: string;
  isPinned?: boolean;
}

export const SHORTS_CATEGORIES: ReadonlyArray<{
  id: ShortVideoCategory;
  labelTh: string;
  labelEn: string;
}> = [
  { id: "all", labelTh: "ทั้งหมด", labelEn: "All" },
  { id: "mist", labelTh: "หมอกยามเช้า", labelEn: "Morning Mist" },
  { id: "villas", labelTh: "พูลวิลล่า & จากุซซี่", labelEn: "Pool Villas" },
  { id: "dining", labelTh: "หมูกระทะระเบียง", labelEn: "Terrace BBQ" },
  { id: "coffee", labelTh: "กาแฟดริป", labelEn: "Pour-Over" },
  { id: "stargaze", labelTh: "ดูดาว", labelEn: "Stargazing" },
  { id: "road", labelTh: "ถนนลอยฟ้า 1256", labelEn: "Road 1256" },
];

export const RESORT_SHORTS: ShortVideoItem[] = [
  {
    id: "short-1",
    titleTh: "ตื่นมารับทะเลหมอกหน้าเตียงที่ Private Pool Villa",
    titleEn: "Wake Up to a Sea of Mist at Our Private Villa",
    captionTh:
      "บรรยากาศยามเช้า 06:30 น. จากระเบียงวิลล่าส่วนตัว เห็นสายหมอกลอยผ่านหุบเขาสะปันแบบพาโนรามา 180 องศา #สะปันอันซีน #ที่พักสะปัน #พูลวิลล่าน่าน #ทะเลหมอก",
    captionEn:
      "06:30 AM morning ambiance from your private villa deck overlooking 180-degree panoramic mist over Ban Sapan valley.",
    hashtags: ["#สะปันอันซีน", "#ที่พักสะปัน", "#พูลวิลล่าน่าน", "#ทะเลหมอก"],
    videoUrl:
      "https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-foggy-mountains-in-the-morning-41508-large.mp4",
    posterUrl:
      "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1080&q=85",
    audioLabel: "เสียงสายหมอกและลำน้ำว้า · sapanunseen original",
    likes: 4820,
    views: "1.2M",
    isPinned: true,
    category: "mist",
    roomIndex: 0,
    couponCode: "SAPAN10",
    comments: [
      {
        id: "c1",
        user: "kamonchanok.p",
        text: "ไปพักห้องนี้มาเมื่อเดือนที่แล้ว หมอกหนาแบบนี้เลยค่ะ ประทับใจมาก ❤️",
        time: "2 ชม. ที่แล้ว",
        likes: 142,
      },
      {
        id: "c2",
        user: "phakin_travel",
        text: "จองตรงหน้าเว็บใช้โค้ด SAPAN10 ลดเพิ่มคุ้มมากครับ วิวสวยสมชื่ออันซีน",
        time: "5 ชม. ที่แล้ว",
        likes: 89,
      },
      {
        id: "c3",
        user: "somchai.nan",
        text: "ช่วงเดือนพฤศจิกายน-ธันวาคม หมอกจะสวยแบบนี้ทุกวันเลยครับ",
        time: "1 วันที่แล้ว",
        likes: 34,
      },
    ],
  },
  {
    id: "short-2",
    titleTh: "แช่อ่างจากุซซี่น้ำอุ่น ชมวิวขุนเขาและนาขั้นบันได",
    titleEn: "Warm Outdoor Jacuzzi Overlooking Mountain Terraces",
    captionTh:
      "พักผ่อนแบบสโลว์ไลฟ์ในห้องสวีทกระจกใสบานใหญ่ พร้อมเซ็ต Floating Afternoon Tea เสิร์ฟถึงห้องพัก #SapanUnseen #JacuzziSuite #เที่ยวหน้าหนาว",
    captionEn:
      "Slow-living sanctuary with floor-to-ceiling mountain views and signature afternoon refreshments served to your deck.",
    hashtags: [
      "#SapanUnseen",
      "#JacuzziSuite",
      "#เที่ยวหน้าหนาว",
      "#บ่อเกลือน่าน",
    ],
    videoUrl:
      "https://assets.mixkit.co/videos/preview/mixkit-waterfall-in-forest-2213-large.mp4",
    posterUrl:
      "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1080&q=85",
    audioLabel: "Acoustic Breeze · Morning Sanctuary Sessions",
    likes: 3920,
    views: "850K",
    category: "villas",
    roomIndex: 1,
    couponCode: "DIRECT15",
    comments: [
      {
        id: "c4",
        user: "nicha.wander",
        text: "น้ำอุ่นกำลังดี วิวสวยเหมือนอยู่สวิตเซอร์แลนด์เลยค่ะ แนะนำห้องนี้เลย",
        time: "1 วันที่แล้ว",
        likes: 56,
      },
    ],
  },
  {
    id: "short-3",
    titleTh: "ชุดหมูกระทะพรีเมียมริมระเบียง ท่ามกลางอากาศ 15°C",
    titleEn: "Private Terrace Thai BBQ Dinner in 15°C Mountain Air",
    captionTh:
      "มื้อค่ำสุดฟินกับชุดหมูกระทะคัดเกรดเสิร์ฟตรงถึงระเบียงบ้านพักส่วนตัว ไม่ต้องออกไปไหน น้ำจิ้มสูตรเด็ดสะปัน #หมูกระทะบนดอย #สะปัน #InVillaDining",
    captionEn:
      "Savor a sizzling Thai BBQ dinner set served right on your private villa balcony under the cool mountain breeze.",
    hashtags: ["#หมูกระทะบนดอย", "#สะปัน", "#InVillaDining", "#น่านนคร"],
    videoUrl:
      "https://assets.mixkit.co/videos/preview/mixkit-putting-meat-on-a-barbecue-grill-43195-large.mp4",
    posterUrl:
      "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1080&q=85",
    audioLabel: "Cozy Evening · Sapan Unseen Culinary",
    likes: 6410,
    views: "980K",
    category: "dining",
    roomIndex: 0,
    comments: [
      {
        id: "c5",
        user: "earth_foodie",
        text: "น้ำจิ้มเด็ดมากครับ สั่งเพิ่มตอนจองห้องได้เลยสะดวกสุดๆ ชุดใหญ่กิน 2 คนอิ่มแปล้",
        time: "3 ชม. ที่แล้ว",
        likes: 210,
      },
    ],
  },
  {
    id: "short-4",
    titleTh: "เส้นทางสายโรแมนติก ถนนลอยฟ้า 1256 สู่หมู่บ้านสะปัน",
    titleEn: "Scenic Sky Road 1256 Drive into Ban Sapan Valley",
    captionTh:
      "ขับรถชมวิวทิวเขาสลับซับซ้อนและแวะหยุดเวลาคาเฟ่ ก่อนเข้าเช็คอินพักผ่อนแบบส่วนตัว #ถนนลอยฟ้า1256 #ดอยภูคา #หมู่บ้านสะปัน",
    captionEn:
      "Cruise along Nan's iconic mountain ridge highway and stop by Yood Wela Cafe before checking in.",
    hashtags: [
      "#ถนนลอยฟ้า1256",
      "#ดอยภูคา",
      "#หมู่บ้านสะปัน",
      "#DirectBooking",
    ],
    videoUrl:
      "https://assets.mixkit.co/videos/preview/mixkit-Curvy-road-on-a-tree-covered-hill-41537-large.mp4",
    posterUrl:
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1080&q=85",
    audioLabel: "Mountain Road · Northern Thailand Vibes",
    likes: 2950,
    views: "430K",
    category: "road",
    roomIndex: 2,
    comments: [
      {
        id: "c6",
        user: "mint_journey",
        text: "รถเก๋งเครื่อง 1.2 ก็ขึ้นได้สบายมากค่ะ ถนนลาดยางสวยตลอดทาง โค้งสนุกมาก",
        time: "6 ชม. ที่แล้ว",
        likes: 77,
      },
    ],
  },
  {
    id: "short-5",
    titleTh: "ดริปกาแฟร้อนยามเช้า ฟังเสียงลำน้ำว้าไหลผ่านหน้าบ้านพัก",
    titleEn: "Morning Pour-Over Coffee by the Mountain Stream",
    captionTh:
      "เซ็ตเมล็ดกาแฟน่านคั่วอ่อนดริปสดทุกเช้าในวิลล่า พร้อมขนมปังโฮมเมดและผลไม้ตามฤดูกาล เสิร์ฟฟรีทุกห้องพัก #กาแฟน่าน #สโลว์ไลฟ์สะปัน #SapanMorning",
    captionEn:
      "Single-origin Nan pour-over coffee set included in every villa with homemade breakfast.",
    hashtags: ["#กาแฟน่าน", "#สโลว์ไลฟ์สะปัน", "#SapanMorning", "#น่าน"],
    videoUrl:
      "https://assets.mixkit.co/videos/preview/mixkit-pouring-hot-water-into-a-coffee-filter-41767-large.mp4",
    posterUrl:
      "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1080&q=85",
    audioLabel: "Morning Drip · Sapan Sanctuary Cafe",
    likes: 3190,
    views: "520K",
    category: "coffee",
    roomIndex: 3,
    couponCode: "SAPAN10",
    comments: [
      {
        id: "c7",
        user: "coffee.addict.th",
        text: "กาแฟหอมฟุ้งมากค่ะ นั่งดริปหน้าห้องดูหมอกฟินสุดๆ เป็นโมเมนต์ที่ดีที่สุดในทริป",
        time: "4 ชม. ที่แล้ว",
        likes: 95,
      },
    ],
  },
  {
    id: "short-6",
    titleTh: "นอนดูดาวเต็มฟ้าบนระเบียงไม้ A-Frame ท่ามกลางหุบเขา",
    titleEn: "Stargazing from Your Private A-Frame Timber Deck",
    captionTh:
      "ค่ำคืนไร้แสงไฟรบกวน เปิดไฟ Warm Light ริมระเบียง นอนชมทางช้างเผือกและดวงดาวระยิบระยับ #ดูดาวสะปัน #AFrameVilla #ที่พักบ่อเกลือ",
    captionEn:
      "Zero light pollution in the valley lets you stargaze right from your warm-lit private balcony.",
    hashtags: ["#ดูดาวสะปัน", "#AFrameVilla", "#ที่พักบ่อเกลือ", "#SapanUnseen"],
    videoUrl:
      "https://assets.mixkit.co/videos/preview/mixkit-stars-in-space-1610-large.mp4",
    posterUrl:
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1080&q=85",
    audioLabel: "Starlight Acoustic · Sapan Night Sky",
    likes: 4630,
    views: "710K",
    category: "stargaze",
    roomIndex: 1,
    comments: [
      {
        id: "c8",
        user: "skywatcher_bkk",
        text: "กลางคืนดาวเยอะมากจริงๆ ครับ ถ่ายติดทางช้างเผือกด้วย อากาศ 16 องศากำลังดี",
        time: "8 ชม. ที่แล้ว",
        likes: 124,
      },
    ],
  },
  {
    id: "short-7",
    titleTh: "สะพานแขวนข้ามลำน้ำว้า จุดชมวิวแลนด์มาร์กใกล้ที่พัก",
    titleEn: "Scenic Suspension Bridge Landmark over Wa River",
    captionTh:
      "เดินเพียง 5 นาทีจากรีสอร์ต ชมสายน้ำใสไหลผ่านโขดหิน ถ่ายรูปมุมมองสะพานไม้สุดคลาสสิก #สะพานสะปัน #จุดเช็คอินสะปัน",
    captionEn:
      "A short 5-minute stroll from the resort to the iconic suspension bridge over the pristine river.",
    hashtags: ["#สะพานสะปัน", "#จุดเช็คอินสะปัน", "#UnseenThailand"],
    videoUrl:
      "https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-foggy-mountains-in-the-morning-41508-large.mp4",
    posterUrl:
      "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1080&q=85",
    audioLabel: "River Ambience · Nan Nature Soundscape",
    likes: 2180,
    views: "340K",
    category: "mist",
    roomIndex: 2,
    comments: [
      {
        id: "c9",
        user: "ploy.photoholic",
        text: "แสงช่วง 4 โมงเย็นสวยมาก แนะนำพกกล้องไปถ่ายรูปเลยค่ะ",
        time: "12 ชม. ที่แล้ว",
        likes: 48,
      },
    ],
  },
  {
    id: "short-8",
    titleTh: "อ่างอาบน้ำกลางแจ้งชมสายหมอก Panorama 360°",
    titleEn: "Open-Air Soaking Tub with 360° Panoramic Mist",
    captionTh:
      "ความผ่อนคลายระดับพรีเมียม โรยกลีบกุหลาบและ Bath Bomb หอมละมุน เสิร์ฟแชมเปญชมพระอาทิตย์ตก #วิลล่าหรูสะปัน #JacuzziView",
    captionEn:
      "Ultimate relaxation in our outdoor soaking tub overlooking endless layered mountain ranges.",
    hashtags: ["#วิลล่าหรูสะปัน", "#JacuzziView", "#DirectBooking"],
    videoUrl:
      "https://assets.mixkit.co/videos/preview/mixkit-waterfall-in-forest-2213-large.mp4",
    posterUrl:
      "https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&w=1080&q=85",
    audioLabel: "Spa & Serenity · Sapan Wellness",
    likes: 5890,
    views: "1.1M",
    category: "villas",
    roomIndex: 0,
    couponCode: "DIRECT15",
    comments: [
      {
        id: "c10",
        user: "viewfinder_th",
        text: "ห้องนี้ฟินที่สุดในสะปันแล้วครับ จองตรงได้สิทธิพิเศษเยอะกว่า OTA",
        time: "1 วันที่แล้ว",
        likes: 188,
      },
    ],
  },
];
