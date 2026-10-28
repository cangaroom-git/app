"use client";

import React, { useState } from "react";
import {
  ChevronDown,
  ExternalLink,
  HelpCircle,
  Mail,
  MapPin,
  Phone,
  Sparkles,
} from "lucide-react";
import { useHotelApp } from "@/components/HotelAppShell";

const NEARBY_SPOTS = [
  {
    nameTh: "หยุดเวลา คาเฟ่",
    nameEn: "Yood Wela Cafe",
    distTh: "5 นาที",
    distEn: "5 mins",
  },
  {
    nameTh: "น้ำตกสะปัน & สะพานแขวน",
    nameEn: "Sapan Waterfall & Bridge",
    distTh: "5 นาที",
    distEn: "5 mins",
  },
  {
    nameTh: "บ่อเกลือสินเธาว์โบราณ",
    nameEn: "Ancient Rock Salt Wells",
    distTh: "15 นาที",
    distEn: "15 mins",
  },
] as const;

const NEARBY_CATEGORIES = [
  {
    id: "shopping" as const,
    titleTh: "คาเฟ่และร้านอาหารแนะนำ",
    titleEn: "Recommended Cafes & Local Dining",
    itemsTh: [
      "หยุดเวลา คาเฟ่ (Yood Wela Cafe) — จุดชมวิวหมู่บ้านสะปันมุมสูง (5 นาที)",
      "หลงเขา คาเฟ่ (Lhong Khao Cafe) — คาเฟ่ริมลำธารท่ามกลางขุนเขา (7 นาที)",
      "ถนนคนเดินสะปัน & ตลาดเช้าชุมชน — อาหารพื้นเมืองและของฝาก (5 นาที)",
    ],
    itemsEn: [
      "Yood Wela Cafe — Iconic hilltop viewpoint overlooking Sapan village (5 mins)",
      "Lhong Khao Cafe — Streamside specialty coffee surrounded by mountains (7 mins)",
      "Sapan Walking Street & Morning Market — Local food and handicrafts (5 mins)",
    ],
  },
  {
    id: "attractions" as const,
    titleTh: "สถานที่ท่องเที่ยวยอดฮิต",
    titleEn: "Popular Tourist Attractions",
    itemsTh: [
      "น้ำตกสะปัน & สะพานแขวน — เส้นทางเดินศึกษาธรรมชาติสุดร่มรื่น (5 นาที)",
      "วัดสะปัน — จุดชมทะเลหมอกยามเช้าเหนือหุบเขาและลำน้ำว้า (6 นาที)",
      "บ่อเกลือสินเธาว์ภูเขาโบราณ อ.บ่อเกลือ — มรดกทางวัฒนธรรมกว่า 800 ปี (15 นาที)",
    ],
    itemsEn: [
      "Sapan Waterfall & Suspension Bridge — Lush nature trail (5 mins)",
      "Wat Sapan Viewpoint — Panoramic morning sea of mist over Wa River valley (6 mins)",
      "800-Year-Old Ancient Rock Salt Wells in Bo Kluea — Cultural heritage site (15 mins)",
    ],
  },
  {
    id: "transportation" as const,
    titleTh: "การเดินทางมายังที่พัก",
    titleEn: "Getting Here & Parking",
    itemsTh: [
      "เดินทางด้วยรถยนต์ส่วนตัวผ่านถนนลอยฟ้า 1081 / 1256 (รถเก๋งเล็กสามารถขึ้นได้สะดวก)",
      "ท่าอากาศยานน่านนคร (NNN) — ใช้เวลาเดินทางประมาณ 1 ชม. 45 นาที",
      "มีลานจอดรถส่วนตัวภายในบริเวณที่พัก พร้อมเจ้าหน้าที่ดูแลสัมภาระ",
    ],
    itemsEn: [
      "Accessible by private car via scenic Highway 1081 / 1256 (suitable for all passenger cars)",
      "Nan Nakhon Airport (NNN) — Approximately 1 hr 45 mins drive",
      "Complimentary private on-site parking with luggage assistance",
    ],
  },
] as const;

const FAQ_ITEMS = [
  {
    qTh: "ช่วงเดือนไหนเหมาะแก่การมาพักผ่อนและชมทะเลหมอกที่สุด?",
    qEn: "Which months are best for visiting Ban Sapan and seeing the sea of mist?",
    aTh: "สามารถมาพักผ่อนได้ตลอดทั้งปี: (1) พ.ย.–ก.พ. ช่วงฤดูหนาว อากาศเย็น 12°C–24°C และมีทะเลหมอกหนาแน่นทุกเช้า (2) ก.ค.–ต.ค. ช่วง Green Season ทุ่งนาและขุนเขาเขียวขจีพร้อมสายหมอกหลังฝนตก และ (3) มี.ค.–มิ.ย. บรรยากาศเงียบสงบเป็นส่วนตัวพร้อมราคาพิเศษ",
    aEn: "Sapan is beautiful year-round: (1) Nov–Feb Winter Season offers crisp 12°C–24°C mornings with dense sea of mist, (2) Jul–Oct Green Season features emerald rice terraces and misty mountain ridges after rain, and (3) Mar–Jun Summer Retreat offers tranquil privacy and special rates.",
  },
  {
    qTh: "ห้องพักมีรูปแบบไหนบ้าง มาเป็นคู่รักหรือครอบครัวควรเลือกห้องไหน?",
    qEn: "What villa types are available for couples or families?",
    aTh: "รองรับทั้งบ้านพักพูลวิลล่าส่วนตัวเป็นหลัง (A-Frame Private Villa เช่น A1, A2, A4) และวิลล่าพาโนรามาพร้อมอ่างจากุซซี่ (A3) สำหรับคู่รักหรือกลุ่มเพื่อน 2–4 ท่าน โดยทุกยูนิตสามารถเช็ควันว่างแบบเรียลไทม์ได้ทันที",
    aEn: "We offer private A-Frame timber villas (A1, A2, A4) and our Skyline Jacuzzi Villa (A3), ideal for couples or groups of 2–4 guests. Real-time availability is displayed on every room card.",
  },
  {
    qTh: "ราคาห้องพักรวมอาหารเช้าแล้วหรือไม่ และมีชุดหมูกระทะเสิร์ฟถึงห้องไหม?",
    qEn: "Is breakfast included, and can we order Thai BBQ (Moo Krata) to our villa?",
    aTh: "ราคาห้องพักทุกเรทรวมอาหารเช้าและชุดดริปกาแฟสดเรียบร้อยแล้ว และสามารถสั่งจองชุดหมูกระทะริมระเบียงหรือบริการเสริมเพิ่มเติมได้ในขั้นตอนการจองหรือหน้าโปรโมชั่น",
    aEn: "Yes, daily local breakfast and a Nan drip coffee set are included with every villa. You can also pre-order private terrace Thai BBQ sets and add-on packages during booking or on the Deals page.",
  },
  {
    qTh: "ขั้นตอนการจองตรงและการล็อคห้องพัก 15 นาทีทำงานอย่างไร?",
    qEn: "How does the 15-minute instant room hold and QR verification work?",
    aTh: "เมื่อเลือกวันเข้าพักและกดจอง ระบบจะล็อคห้องพักให้ 15 นาทีพร้อมสร้าง QR PromptPay เมื่อแนบรูปสลิป ระบบจะสแกนตรวจสอบ QR บนสลิปอัตโนมัติเพื่อยืนยันการจองทันที",
    aEn: "Once you select your dates and submit your booking details, the system holds your villa for 15 minutes and generates a PromptPay QR code. Upload your transfer slip and our system automatically verifies the slip QR code.",
  },
] as const;

export default function GuidePage() {
  const { propertyConfig, lang, navigateToTab } = useHotelApp();

  const [openNearbyMap, setOpenNearbyMap] = useState<Record<string, boolean>>({
    attractions: true,
  });
  const [openFaqMap, setOpenFaqMap] = useState<Record<number, boolean>>({
    0: true,
  });

  return (
    <>
      {/* 1. Location Map, Inline Highlights & 1-Layer Nearby Accordions */}
      <section id="location-map" className="space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="ty-display flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[var(--color-accent)] shrink-0" />
              <span className="truncate">
                {lang === "th"
                  ? "แผนที่การเดินทาง & รอบที่พัก"
                  : "Location Map & Nearby Sights"}
              </span>
            </h1>
            <p className="ty-caption mt-0.5 truncate">
              {lang === "th"
                ? propertyConfig.locationTh
                : propertyConfig.locationEn}
            </p>
          </div>

          <a
            href="https://maps.app.goo.gl/oGkpxrTD2C2pmeWf6?g_st=ic"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-fw-secondary shrink-0"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Google Maps</span>
          </a>
        </header>

        <div className="-mx-4 w-[calc(100%+2rem)] rounded-none sm:mx-0 sm:w-full sm:rounded-[20px] h-[240px] sm:h-[300px] overflow-hidden bg-[var(--color-background-muted)]">
          <iframe
            title="Resort Google Map"
            src={`https://maps.google.com/maps?q=${propertyConfig.latitude},${propertyConfig.longitude}&hl=${lang}&z=14&output=embed`}
            className="w-full h-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>

        {/* Inline Contact & Nearby Distance Highlights (Zero Nested Boxes) */}
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 ty-body">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            {NEARBY_SPOTS.map((spot) => (
              <span
                key={spot.nameEn}
                className="inline-flex items-center gap-1.5 ty-caption text-[var(--color-text-primary)]"
              >
                <MapPin className="w-3.5 h-3.5 text-[var(--color-accent)] shrink-0" />
                <strong className="font-semibold">
                  {lang === "th" ? spot.nameTh : spot.nameEn}
                </strong>
                <span className="text-[var(--color-text-secondary)]">
                  ({lang === "th" ? spot.distTh : spot.distEn})
                </span>
              </span>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 ty-caption">
            <a
              href={`tel:${propertyConfig.phones[0]}`}
              className="inline-flex items-center gap-1.5 font-semibold text-[var(--color-text-primary)] hover:text-[var(--color-accent)] transition"
            >
              <Phone className="w-3.5 h-3.5 text-[var(--color-accent)]" />
              <span>{propertyConfig.phones.join(" , ")}</span>
            </a>
            <a
              href={`mailto:${propertyConfig.email}`}
              className="inline-flex items-center gap-1.5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>{propertyConfig.email}</span>
            </a>
          </div>
        </div>

        {/* 1-Layer Nearby Guide Accordions */}
        <div className="space-y-2 [overflow-anchor:none]">
          {NEARBY_CATEGORIES.map((category) => {
            const isOpen = Boolean(openNearbyMap[category.id]);
            const items = lang === "th" ? category.itemsTh : category.itemsEn;
            return (
              <div
                key={category.id}
                className="rounded-[16px] bg-[var(--color-background-muted)] px-4 py-3.5 [overflow-anchor:none]"
              >
                <button
                  type="button"
                  onClick={() =>
                    setOpenNearbyMap((prev) => ({
                      ...prev,
                      [category.id]: !prev[category.id],
                    }))
                  }
                  className="w-full flex items-center justify-between gap-2 text-left ty-body font-semibold cursor-pointer"
                >
                  <span>
                    {lang === "th" ? category.titleTh : category.titleEn}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 shrink-0 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isOpen && (
                  <ul className="pt-2.5 pl-5 space-y-1.5 ty-body-muted list-disc">
                    {items.map((line, idx) => (
                      <li key={idx}>{line}</li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. Frequently Asked Questions (1-Layer Flat Accordions) */}
      <section id="faqs" className="space-y-4 [overflow-anchor:none]">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="ty-title flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-[var(--color-accent)] shrink-0" />
              <span className="truncate">
                {lang === "th"
                  ? "คำถามที่พบบ่อย (FAQs)"
                  : "Frequently Asked Questions"}
              </span>
            </h2>
            <p className="ty-caption mt-0.5 truncate">
              {lang === "th"
                ? "ข้อมูลการเข้าพัก การเดินทาง และการจองตรงอัตโนมัติ"
                : "Essential information about your stay, travel, and instant booking"}
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigateToTab("chat")}
            className="btn-fw-secondary shrink-0"
          >
            <Sparkles className="w-4 h-4 text-[var(--color-accent)]" />
            <span>{lang === "th" ? "ถาม AI" : "Ask AI"}</span>
          </button>
        </header>

        <div className="space-y-2 [overflow-anchor:none]">
          {FAQ_ITEMS.map((faq, idx) => {
            const isOpen = Boolean(openFaqMap[idx]);
            return (
              <div
                key={idx}
                className="rounded-[16px] bg-[var(--color-background-muted)] px-4 py-3.5 [overflow-anchor:none]"
              >
                <button
                  type="button"
                  onClick={() =>
                    setOpenFaqMap((prev) => ({
                      ...prev,
                      [idx]: !prev[idx],
                    }))
                  }
                  className="w-full flex items-center justify-between gap-4 text-left cursor-pointer"
                  aria-expanded={isOpen}
                >
                  <span className="ty-body font-semibold">
                    {lang === "th" ? faq.qTh : faq.qEn}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 shrink-0 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isOpen && (
                  <p className="pt-2.5 ty-body-muted">
                    {lang === "th" ? faq.aTh : faq.aEn}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
