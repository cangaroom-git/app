"use client";

import React from "react";
import {
  ArrowRight,
  Bath,
  Bot,
  CloudSun,
  Coffee,
  Compass,
  Images,
  MapPin,
  Maximize2,
  Mountain,
  Play,
  QrCode,
  ShieldCheck,
  Star,
  Tag,
  Trees,
  Users,
  Utensils,
} from "lucide-react";
import { RESORT_SHORTS } from "@/data/shortsData";
import { useHotelApp } from "@/components/HotelAppShell";
import { ShortVideoCard } from "@/components/home/ShortVideoCard";
import { StandardButton } from "@/components/ui/standards";

const EXPERIENCE_PILLARS = [
  {
    id: "mist",
    icon: Mountain,
    titleTh: "วิวหุบเขา 360°",
    titleEn: "360° Mountain Mist",
    captionTh: "ทะเลหมอกลอยผ่านหน้าระเบียง",
    captionEn: "Morning mist right outside your deck",
  },
  {
    id: "soak",
    icon: Bath,
    titleTh: "อ่างน้ำอุ่นชมดาว",
    titleEn: "Private Soaking Tub",
    captionTh: "แช่น้ำอุ่นส่วนตัวหน้าวิลล่า",
    captionEn: "Outdoor warm tub at every villa",
  },
  {
    id: "coffee",
    icon: Coffee,
    titleTh: "กาแฟดริปเมล็ดน่าน",
    titleEn: "Nan Drip Coffee",
    captionTh: "เสิร์ฟคู่เซตอาหารเช้าถึงห้อง",
    captionEn: "Served with daily terrace breakfast",
  },
  {
    id: "sanctuary",
    icon: Trees,
    titleTh: "ไพรเวทท่ามกลางป่า",
    titleEn: "Secluded Sanctuary",
    captionTh: "เงียบสงบ โอบล้อมด้วยธรรมชาติ",
    captionEn: "Intimate timber villas in nature",
  },
] as const;

const NEARBY_VALLEY_PINS = [
  { th: "น้ำตกสะปัน 5 นาที", en: "Sapan Waterfall · 5m" },
  { th: "หยุดเวลาคาเฟ่ 5 นาที", en: "Yood Wela Cafe · 5m" },
  { th: "บ่อเกลือโบราณ 15 นาที", en: "Ancient Salt Wells · 15m" },
] as const;

const GUEST_STORY_QUOTES = [
  {
    id: "story-q1",
    quoteTh:
      "ตื่นเช้าเปิดม่านเจอทะเลหมอกลอยผ่านหน้าเตียง อ่างน้ำอุ่นริมระเบียงกับกาแฟดริปคือความสุขที่อยากหยุดเวลาไว้จริงๆ ค่ะ",
    quoteEn:
      "Waking up to a sea of mist drifting right past our terrace tub with freshly brewed Nan drip coffee was pure magic.",
    authorTh: "คุณกมลชนก · A-Frame Villa (A1)",
    authorEn: "Kamonchanok P. · A-Frame Villa (A1)",
    score: "10/10",
  },
  {
    id: "story-q2",
    quoteTh:
      "บ้านไม้หอมกลิ่นสน เงียบสงบเป็นส่วนตัวมาก ตอนค่ำทานหมูกระทะท่ามกลางอากาศ 18°C ดาวเต็มฟ้า ประทับใจที่สุดครับ",
    quoteEn:
      "Quiet timber sanctuary surrounded by mountains. Evening BBQ on our private deck under a starry 18°C sky was unforgettable.",
    authorTh: "คุณภาคิน · Skyline Jacuzzi (A3)",
    authorEn: "Phakin T. · Skyline Jacuzzi (A3)",
    score: "9.8/10",
  },
] as const;

export default function HomePage() {
  const {
    propertyConfig,
    rooms,
    coupons,
    weather,
    lang: language,
    totalAvailableUnitsCount,
    openRoomDrawer,
    openGalleryModal,
    navigateToTab,
    openShortsAt,
  } = useHotelApp();

  const heroImageUrl =
    rooms[0]?.images[0]?.url ||
    propertyConfig.heroImageUrl ||
    "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=2000&q=85";

  const diningStoryImageUrl =
    "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1400&q=85";
  const valleyStoryImageUrl =
    "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1400&q=85";

  const liveTempCelsius = weather?.currentTemp
    ? Math.round(weather.currentTemp)
    : 19;

  const highestCouponPercent = coupons
    .filter((coupon) => coupon.isActive && coupon.discountType === "PERCENT")
    .reduce(
      (maxPercent, coupon) => Math.max(maxPercent, coupon.discountValue),
      0
    );
  const highestRoomDiscountPercent = rooms.reduce(
    (maxPercent, room) => Math.max(maxPercent, room.discountPercent || 0),
    0
  );
  const maxDirectPromoPercent = Math.max(
    highestCouponPercent,
    highestRoomDiscountPercent,
    10
  );

  const featuredShorts = RESORT_SHORTS.slice(0, 4);

  const hotelJsonLdSchema = {
    "@context": "https://schema.org",
    "@type": "Hotel",
    name: `${propertyConfig.nameTh} (${propertyConfig.nameEn})`,
    description: propertyConfig.taglineTh,
    image: [heroImageUrl],
    address: {
      "@type": "PostalAddress",
      streetAddress: "บ้านสะปัน ตำบลดงพญา",
      addressLocality: "อำเภอบ่อเกลือ",
      addressRegion: "จังหวัดน่าน",
      postalCode: "55220",
      addressCountry: "TH",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: propertyConfig.latitude,
      longitude: propertyConfig.longitude,
    },
  };

  return (
    <div className="flex flex-col gap-10 sm:gap-14 lg:gap-16 pb-2 select-none">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(hotelJsonLdSchema) }}
      />

      {/* =====================================================================
          SECTION 1: PURE FULL-BLEED ATMOSPHERIC HERO (Habitas-Style Zero Overlay)
             - Mobile (< 640px): Edge-to-edge full-bleed (`rounded-none`)
             - Tablet/Desktop (>= 640px): Soft `rounded-[20px]` architectural frame
      ====================================================================== */}
      <section aria-label="Resort Atmosphere">
        <div
          onClick={() => openGalleryModal(null)}
          className="relative -mt-4 -mx-4 w-[calc(100%+2rem)] rounded-none sm:mt-0 sm:mx-0 sm:w-full sm:rounded-[20px] aspect-[4/5] sm:aspect-[21/10] max-h-[540px] overflow-hidden bg-[var(--color-background-muted)] cursor-pointer group/hero"
        >
          <img
            src={heroImageUrl}
            alt={
              language === "th" ? propertyConfig.nameTh : propertyConfig.nameEn
            }
            loading="eager"
            decoding="async"
            className="w-full h-full object-cover object-center transition-transform duration-700 group-hover/hero:scale-[1.02]"
          />

          {/* Subtle Bottom Bar Pills (No Heavy Dark Gradient Over Photo) */}
          <div className="absolute inset-x-3 sm:inset-x-4 bottom-3 sm:bottom-4 flex items-center justify-between gap-2 pointer-events-none">
            <span className="inline-flex items-center gap-2 rounded-full bg-black/60 backdrop-blur-md text-white px-3.5 h-8 ty-caption font-semibold">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                {language === "th" ? "บ้านสะปัน จ.น่าน" : "Ban Sapan, Nan"}
              </span>
              <span className="opacity-60">·</span>
              <span className="inline-flex items-center gap-1 tabular-nums shrink-0">
                <CloudSun className="w-3.5 h-3.5" />
                {liveTempCelsius}°C
              </span>
            </span>

            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                openGalleryModal(null);
              }}
              className="pointer-events-auto rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white px-3.5 h-8 inline-flex items-center gap-1.5 ty-caption font-semibold transition cursor-pointer shrink-0"
            >
              <Images className="w-3.5 h-3.5" />
              <span>{language === "th" ? "ดูภาพทั้งหมด" : "Gallery"}</span>
            </button>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 2: SOUL OF SAPAN MANIFESTO & 4 ICON PILLARS (Open Canvas)
      ====================================================================== */}
      <section className="space-y-7 sm:space-y-9">
        <div className="max-w-2xl mx-auto sm:text-center space-y-3.5">
          <p className="inline-flex items-center gap-1.5 ty-caption font-semibold uppercase tracking-wider text-[var(--color-accent)]">
            <Star className="w-3.5 h-3.5 fill-[var(--color-warning)] text-[var(--color-warning)]" />
            <span>
              {language === "th"
                ? "4.9 ★ · บ้านพักไพรเวทกลางหุบเขาสะปัน"
                : "4.9 ★ · Private Mountain Sanctuary in Nan"}
            </span>
          </p>

          <h1 className="ty-display text-[var(--color-text-primary)]">
            {language === "th"
              ? "พักจังหวะชีวิต ท่ามกลางขุนเขาและสายหมอกสะปัน"
              : "Slow Down Above the Drifting Mist of Sapan Valley"}
          </h1>

          <p className="ty-body-muted">
            {language === "th"
              ? "วิลล่าไม้ทรง A-Frame และเคบินส่วนตัวเพียงไม่กี่หลัง ริมหุบเขาอำเภอบ่อเกลือ จังหวัดน่าน ออกแบบให้แสงเช้า ทะเลหมอก และความเงียบสงบโอบกอดทุกช่วงเวลาการพักผ่อน"
              : "An intimate collection of timber A-Frame villas in Bo Kluea, Nan — crafted so morning light, mountain mist, and stillness frame every moment of your stay."}
          </p>

          <div className="pt-1.5 flex flex-wrap items-center sm:justify-center gap-2.5">
            <StandardButton
              variant="primary"
              size="lg"
              onClick={() => navigateToTab("book")}
            >
              <span>
                {language === "th"
                  ? totalAvailableUnitsCount > 0
                    ? `เช็กห้องว่าง (${totalAvailableUnitsCount} หลัง) →`
                    : "เช็กวันว่าง & ราคา →"
                  : "Check Availability →"}
              </span>
            </StandardButton>

            <button
              type="button"
              onClick={() => navigateToTab("chat")}
              className="btn-fw-secondary h-11 px-4 cursor-pointer"
            >
              <Bot className="w-4 h-4 text-[var(--color-accent)]" />
              <span>
                {language === "th" ? "คุยกับ AI Agent" : "Ask AI Concierge"}
              </span>
            </button>
          </div>
        </div>

        {/* 4 Open-Canvas Icon Pillars (Zero Box-in-Box) */}
        <div className="pt-6 border-t border-[var(--color-border)] grid grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
          {EXPERIENCE_PILLARS.map((pillar) => {
            const IconComponent = pillar.icon;
            return (
              <div key={pillar.id} className="flex items-start gap-3 min-w-0">
                <span className="h-10 w-10 rounded-full bg-[var(--color-background-muted)] text-[var(--color-accent)] flex items-center justify-center shrink-0">
                  <IconComponent className="w-5 h-5" />
                </span>
                <div className="min-w-0">
                  <h2 className="ty-body font-bold text-[var(--color-text-primary)] truncate">
                    {language === "th" ? pillar.titleTh : pillar.titleEn}
                  </h2>
                  <p className="ty-caption mt-0.5 line-clamp-2">
                    {language === "th" ? pillar.captionTh : pillar.captionEn}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* =====================================================================
          SECTION 3: "OUR VILLAS" FRAMELESS HORIZONTAL SHOWCASE
             - True Habitas Editorial DNA: Crisp portrait photos + open-canvas text
      ====================================================================== */}
      <section className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <span className="ty-caption font-semibold uppercase tracking-wider text-[var(--color-accent)] block">
              {language === "th" ? "OUR VILLAS" : "OUR HOMES"}
            </span>
            <h2 className="ty-title mt-0.5">
              {language === "th"
                ? "เอกลักษณ์บ้านพักแต่ละหลัง"
                : "Signature Timber Villas"}
            </h2>
          </div>

          <button
            type="button"
            onClick={() => navigateToTab("book")}
            className="inline-flex items-center gap-1 ty-body font-semibold text-[var(--color-accent)] hover:underline cursor-pointer shrink-0"
          >
            <span>
              {language === "th" ? "เช็กวันว่างทั้งหมด" : "All Villas"}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="-mx-4 px-4 sm:mx-0 sm:px-0 flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:gap-5">
          {rooms.map((room) => (
            <article
              key={room.id}
              onClick={() => openRoomDrawer(room, "details", 0)}
              className="group snap-start shrink-0 w-[256px] sm:w-auto flex flex-col gap-3 cursor-pointer"
            >
              {/* Frameless Portrait Image */}
              <div className="relative aspect-[4/5] w-full rounded-[16px] overflow-hidden bg-[var(--color-background-muted)]">
                <img
                  src={room.images[0]?.url}
                  alt={language === "th" ? room.nameTh : room.nameEn}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />

                <span className="absolute top-3 left-3 rounded-full bg-black/60 backdrop-blur-md text-white px-2.5 py-0.5 ty-caption font-bold">
                  {room.code}
                </span>

                {room.discountPercent > 0 && (
                  <span className="absolute top-3 right-3 badge-promo">
                    -{room.discountPercent}%
                  </span>
                )}
              </div>

              {/* Open-Canvas Typography (Zero Grey Wrapper Card) */}
              <div className="space-y-1 min-w-0">
                <h3 className="ty-subtitle text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] transition-colors truncate">
                  {language === "th" ? room.nameTh : room.nameEn}
                </h3>

                <p className="ty-caption line-clamp-1">
                  {language === "th"
                    ? room.highlightTh || room.shortDescTh
                    : room.highlightEn || room.shortDescEn}
                </p>

                <div className="pt-1 flex items-center justify-between gap-2 ty-caption">
                  <span className="inline-flex items-center gap-2 text-[var(--color-text-secondary)]">
                    <span className="inline-flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {room.baseGuests}–{room.maxGuests}
                    </span>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1">
                      <Maximize2 className="w-3.5 h-3.5" />
                      {room.sizeSqm} {language === "th" ? "ตร.ม." : "m²"}
                    </span>
                  </span>

                  <span className="font-semibold text-[var(--color-accent)] inline-flex items-center gap-0.5 shrink-0">
                    <span>{language === "th" ? "สำรวจห้อง" : "Explore"}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* =====================================================================
          SECTION 4: ALTERNATING SPLIT EDITORIAL STORIES (50/50 Left-Right)
             - Mobile (< 640px): Edge-to-edge full-bleed photos (`rounded-none`)
             - Desktop (>= 640px): Clean `rounded-[20px]` paired with minimal copy
      ====================================================================== */}
      <section className="space-y-10 sm:space-y-14">
        {/* Story 4.1: Terrace Dining & Local Coffee (Text Left · Photo Right on Desktop) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-10 items-center">
          <div className="order-2 lg:order-1 lg:col-span-5 space-y-3.5">
            <span className="inline-flex items-center gap-1.5 ty-caption font-semibold uppercase tracking-wider text-[var(--color-accent)]">
              <Utensils className="w-3.5 h-3.5" />
              <span>
                {language === "th"
                  ? "TERRACE DINING & COFFEE"
                  : "TERRACE DINING & COFFEE"}
              </span>
            </span>

            <h2 className="ty-display text-[var(--color-text-primary)] leading-snug">
              {language === "th"
                ? "เช้าดริปกาแฟรับสายหมอก ค่ำหมูกระทะร้อนๆ บนระเบียงส่วนตัว"
                : "Morning Drip Coffee Over the Mist, Evening BBQ Under the Stars"}
            </h2>

            <p className="ty-body-muted">
              {language === "th"
                ? "ทุกเช้าเสิร์ฟเซตอาหารเช้าพื้นเมืองและกาแฟคั่วสดจากน่านถึงหน้าห้องพัก ส่วนยามค่ำเพลิดเพลินกับชุดหมูกระทะท่ามกลางอากาศเย็นสบายโดยไม่ต้องออกไปไหน"
                : "Wake up to local breakfast and freshly roasted Nan drip coffee delivered to your terrace, followed by private open-air Thai BBQ dinners in the cool mountain air."}
            </p>

            <div className="pt-1">
              <button
                type="button"
                onClick={() => navigateToTab("deal")}
                className="btn-fw-secondary cursor-pointer"
              >
                <span>
                  {language === "th"
                    ? "ดูเซตอาหาร & โปรโมชั่นเสริม →"
                    : "Explore Dining & Add-ons →"}
                </span>
              </button>
            </div>
          </div>

          <div className="order-1 lg:order-2 lg:col-span-7">
            <div className="-mx-4 w-[calc(100%+2rem)] rounded-none sm:mx-0 sm:w-full sm:rounded-[20px] aspect-[16/10] overflow-hidden bg-[var(--color-background-muted)]">
              <img
                src={diningStoryImageUrl}
                alt={
                  language === "th"
                    ? "กาแฟดริปและอาหารเช้าที่สะปัน"
                    : "Morning coffee on terrace"
                }
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>

        {/* Story 4.2: Sapan Valley & Bo Kluea (Photo Left · Text Right on Desktop) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-10 items-center">
          <div className="lg:col-span-7">
            <div className="-mx-4 w-[calc(100%+2rem)] rounded-none sm:mx-0 sm:w-full sm:rounded-[20px] aspect-[16/10] overflow-hidden bg-[var(--color-background-muted)]">
              <img
                src={valleyStoryImageUrl}
                alt={
                  language === "th"
                    ? "หุบเขาสะปัน อำเภอบ่อเกลือ จังหวัดน่าน"
                    : "Ban Sapan Valley in Nan"
                }
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <div className="lg:col-span-5 space-y-3.5">
            <span className="inline-flex items-center gap-1.5 ty-caption font-semibold uppercase tracking-wider text-[var(--color-accent)]">
              <Compass className="w-3.5 h-3.5" />
              <span>SENSE OF PLACE · BAN SAPAN</span>
            </span>

            <h2 className="ty-display text-[var(--color-text-primary)] leading-snug">
              {language === "th"
                ? "หัวใจของหมู่บ้านสะปัน ห่างน้ำตกและจุดชมวิวเพียง 5 นาที"
                : "At the Heart of Ban Sapan, Minutes from Iconic Valley Trails"}
            </h2>

            <p className="ty-body-muted">
              {language === "th"
                ? "เดินทางสะดวกด้วยรถยนต์ทุกประเภท โอบล้อมด้วยทุ่งนาขั้นบันได ลำน้ำว้า และวิถีชุมชนบ่อเกลือโบราณกว่า 800 ปี"
                : "Effortlessly accessible via scenic mountain roads, surrounded by emerald rice terraces, the Wa River stream, and 800-year-old rock salt heritage."}
            </p>

            <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 ty-caption font-semibold text-[var(--color-text-primary)]">
              {NEARBY_VALLEY_PINS.map((pin) => (
                <span key={pin.en} className="inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[var(--color-accent)] shrink-0" />
                  <span>{language === "th" ? pin.th : pin.en}</span>
                </span>
              ))}
            </div>

            <div className="pt-1">
              <button
                type="button"
                onClick={() => navigateToTab("guide")}
                className="btn-fw-secondary cursor-pointer"
              >
                <span>
                  {language === "th"
                    ? "เปิดแผนที่ & คู่มือเที่ยวสะปัน →"
                    : "View Map & Local Guide →"}
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 5: "LIVING STORIES" — 9:16 REELS & VERIFIED GUEST MOMENTS
      ====================================================================== */}
      <section className="space-y-6">
        <div className="flex items-end justify-between gap-3">
          <div>
            <span className="ty-caption font-semibold uppercase tracking-wider text-[var(--color-accent)] block">
              LIVING STORIES
            </span>
            <h2 className="ty-title mt-0.5 flex items-center gap-2">
              <Play className="w-4 h-4 fill-[var(--color-accent)] text-[var(--color-accent)] shrink-0" />
              <span>
                {language === "th"
                  ? "บรรยากาศเคลื่อนไหวจริงจากที่พัก"
                  : "Real Moments in Motion"}
              </span>
            </h2>
          </div>

          <button
            type="button"
            onClick={() => navigateToTab("shorts")}
            className="inline-flex items-center gap-1 ty-body font-semibold text-[var(--color-accent)] hover:underline cursor-pointer shrink-0"
          >
            <span>{language === "th" ? "ดูวิดีโอทั้งหมด" : "All Videos"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {featuredShorts.map((shortVideo, videoIndex) => {
            const linkedRoom =
              shortVideo.roomIndex !== undefined
                ? rooms[shortVideo.roomIndex]
                : undefined;
            return (
              <ShortVideoCard
                key={shortVideo.id}
                id={shortVideo.id}
                title={
                  language === "th" ? shortVideo.titleTh : shortVideo.titleEn
                }
                roomCode={linkedRoom?.code}
                posterUrl={shortVideo.posterUrl}
                viewsCount={shortVideo.views}
                priceThb={linkedRoom?.basePriceThb}
                discountPercent={linkedRoom?.discountPercent}
                isPinned={videoIndex === 0}
                onCardClick={() => openShortsAt(videoIndex)}
              />
            );
          })}
        </div>

        {/* Open-Canvas Guest Voices Strip */}
        <div className="pt-4 border-t border-[var(--color-border)] grid grid-cols-1 md:grid-cols-2 gap-5">
          {GUEST_STORY_QUOTES.map((item) => (
            <div
              key={item.id}
              onClick={() => navigateToTab("review")}
              className="space-y-2 cursor-pointer group/quote"
            >
              <p className="ty-body text-[var(--color-text-primary)] group-hover/quote:text-[var(--color-accent)] transition-colors">
                &ldquo;{language === "th" ? item.quoteTh : item.quoteEn}&rdquo;
              </p>
              <div className="flex items-center justify-between gap-2 ty-caption">
                <span className="font-semibold text-[var(--color-text-secondary)]">
                  {language === "th" ? item.authorTh : item.authorEn}
                </span>
                <span className="inline-flex items-center gap-1 font-bold text-[var(--color-text-primary)]">
                  <Star className="w-3.5 h-3.5 fill-[var(--color-warning)] text-[var(--color-warning)]" />
                  <span>{item.score}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* =====================================================================
          SECTION 6: DIRECT BOOKING PRIVILEGES INVITE (Seamless Bridge to /booking)
      ====================================================================== */}
      <section className="-mx-4 px-4 py-8 sm:mx-0 sm:rounded-[20px] sm:p-8 bg-[var(--color-background-muted)] flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-3 max-w-xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge-promo">
              <Tag className="w-3 h-3" />
              <span>
                {language === "th"
                  ? `จองตรงลดสูงสุด ${maxDirectPromoPercent}%`
                  : `Direct Booking · Save up to ${maxDirectPromoPercent}%`}
              </span>
            </span>
            <span className="ty-caption font-semibold text-[var(--color-text-secondary)]">
              {language === "th"
                ? "การันตีราคาดีที่สุดจากที่พักโดยตรง"
                : "100% Best Rate Direct Guarantee"}
            </span>
          </div>

          <h2 className="ty-display text-[var(--color-text-primary)]">
            {language === "th"
              ? "พร้อมออกเดินทางสู่สะปันหรือยังครับ?"
              : "Ready for Your Misty Mountain Escape?"}
          </h2>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 ty-caption font-semibold text-[var(--color-text-primary)]">
            <span className="inline-flex items-center gap-1.5">
              <Coffee className="w-4 h-4 text-[var(--color-accent)]" />
              <span>
                {language === "th" ? "ฟรีอาหารเช้า & ดริปกาแฟ" : "Free Breakfast"}
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <QrCode className="w-4 h-4 text-[var(--color-accent)]" />
              <span>
                {language === "th"
                  ? "ล็อคห้องทันใจ 15 นาทีด้วย QR"
                  : "15-Min Instant QR Hold"}
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[var(--color-accent)]" />
              <span>
                {language === "th" ? "เช็กวันว่างเรียลไทม์" : "Live Calendar"}
              </span>
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <StandardButton
            variant="primary"
            size="lg"
            onClick={() => navigateToTab("book")}
          >
            <span>
              {language === "th"
                ? "เลือกวันเข้าพัก & จองเลย"
                : "Select Dates & Book"}
            </span>
            <ArrowRight className="w-4 h-4" />
          </StandardButton>
        </div>
      </section>
    </div>
  );
}
