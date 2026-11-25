"use client";

import React, { useMemo } from "react";
import { RotateCcw, Sparkles } from "lucide-react";
import type { SavedBoardDto } from "@/types/cangaroom";

export interface PopularProvinceGroupConfig {
  id: string;
  provinceId: string;
  nameTh: string;
  nameEn: string;
  subtitleTh: string;
  subtitleEn: string;
  keywords: string[];
  badgePosition: "left" | "right";
  landmark: "chiang-mai" | "nan" | "pattaya" | "phuket" | "khao-yai" | "krabi";
  fallbackPhotos: [string, string];
}

export const POPULAR_TRIP_PROVINCE_GROUPS: PopularProvinceGroupConfig[] = [
  {
    id: "group-chiang-mai",
    provinceId: "chiang-mai",
    nameTh: "เชียงใหม่",
    nameEn: "Chiang Mai",
    subtitleTh: "ดอยสุเทพ · นิมมาน · แม่กำปอง",
    subtitleEn: "Doi Suthep · Nimman · Mae Kampong",
    keywords: ["เชียงใหม่", "chiang mai", "นิมมาน", "แม่กำปอง", "ม่อนแจ่ม"],
    badgePosition: "left",
    landmark: "chiang-mai",
    fallbackPhotos: [
      "https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&w=640&q=80",
      "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=640&q=80",
    ],
  },
  {
    id: "group-nan",
    provinceId: "nan",
    nameTh: "น่าน",
    nameEn: "Nan",
    subtitleTh: "สะปัน · บ่อเกลือ · ถนนลอยฟ้า",
    subtitleEn: "Sapan · Bo Kluea · Sky Road",
    keywords: ["น่าน", "nan", "สะปัน", "บ่อเกลือ", "ปัว"],
    badgePosition: "right",
    landmark: "nan",
    fallbackPhotos: [
      "https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=640&q=80",
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=640&q=80",
    ],
  },
  {
    id: "group-pattaya",
    provinceId: "chon-buri",
    nameTh: "พัทยา",
    nameEn: "Pattaya",
    subtitleTh: "เกาะล้าน · นาเกลือ · คาเฟ่ริมทะเล",
    subtitleEn: "Koh Larn · Naklua · Beach Cafes",
    keywords: ["พัทยา", "ชลบุรี", "บางแสน", "pattaya", "chon buri", "เกาะล้าน"],
    badgePosition: "left",
    landmark: "pattaya",
    fallbackPhotos: [
      "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=640&q=80",
      "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=640&q=80",
    ],
  },
  {
    id: "group-phuket",
    provinceId: "phuket",
    nameTh: "ภูเก็ต",
    nameEn: "Phuket",
    subtitleTh: "เมืองเก่า · แหลมพรหมเทพ · กะรน",
    subtitleEn: "Old Town · Promthep · Karon",
    keywords: ["ภูเก็ต", "phuket", "ป่าตอง", "กะรน", "ราไวย์"],
    badgePosition: "right",
    landmark: "phuket",
    fallbackPhotos: [
      "https://images.unsplash.com/photo-1573843981267-be1999ff37cd?auto=format&fit=crop&w=640&q=80",
      "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=640&q=80",
    ],
  },
  {
    id: "group-khao-yai",
    provinceId: "nakhon-ratchasima",
    nameTh: "เขาใหญ่",
    nameEn: "Khao Yai",
    subtitleTh: "ปากช่อง · ทิวสน · คาเฟ่กลางหุบเขา",
    subtitleEn: "Pak Chong · Pine Hills · Valley Cafes",
    keywords: ["เขาใหญ่", "โคราช", "นครราชสีมา", "ปากช่อง", "khao yai"],
    badgePosition: "left",
    landmark: "khao-yai",
    fallbackPhotos: [
      "https://images.unsplash.com/photo-1602002418082-a4443e081dd1?auto=format&fit=crop&w=640&q=80",
      "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?auto=format&fit=crop&w=640&q=80",
    ],
  },
  {
    id: "group-krabi",
    provinceId: "krabi",
    nameTh: "กระบี่",
    nameEn: "Krabi",
    subtitleTh: "อ่าวนาง · ไร่เลย์ · เกาะพีพี",
    subtitleEn: "Ao Nang · Railay · Koh Phi Phi",
    keywords: ["กระบี่", "krabi", "อ่าวนาง", "ไร่เลย์", "พีพี"],
    badgePosition: "right",
    landmark: "krabi",
    fallbackPhotos: [
      "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?auto=format&fit=crop&w=640&q=80",
      "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=640&q=80",
    ],
  },
];

export function matchesProvinceGroup(
  board: SavedBoardDto,
  group: PopularProvinceGroupConfig
): boolean {
  if (board.items.some((entry) => entry.pin.provinceId === group.provinceId)) {
    return true;
  }
  const haystack = `${board.name} ${board.items
    .map((e) => `${e.pin.provinceNameTh} ${e.pin.titleTh} ${e.pin.hotelNameTh}`)
    .join(" ")}`.toLowerCase();
  return group.keywords.some((kw) => haystack.includes(kw.toLowerCase()));
}

function ProvinceLandmarkIllustration({
  landmark,
}: {
  landmark: PopularProvinceGroupConfig["landmark"];
}) {
  switch (landmark) {
    case "chiang-mai":
      // Lanna Pagoda (Doi Suthep)
      return (
        <svg
          viewBox="0 0 64 64"
          className="w-11 h-11 sm:w-12 sm:h-12 shrink-0"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M32 6L35 16H29L32 6Z"
            fill="#D49B35"
            stroke="#5C4418"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M27 16H37L39 24H25L27 16Z"
            fill="#E7B754"
            stroke="#5C4418"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M22 24H42L45 35H19L22 24Z"
            fill="#D49B35"
            stroke="#5C4418"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M15 35H49V44H15V35Z"
            fill="#F4D38A"
            stroke="#5C4418"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M10 44H54V52H10V44Z"
            fill="#E7B754"
            stroke="#5C4418"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M28 44V38C28 36.5 29.8 35.5 32 35.5C34.2 35.5 36 36.5 36 38V44"
            fill="#5C4418"
          />
        </svg>
      );
    case "nan":
      // Wat Phumin Tiered Roof & Misty Mountains
      return (
        <svg
          viewBox="0 0 64 64"
          className="w-11 h-11 sm:w-12 sm:h-12 shrink-0"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M6 48L20 26L31 40L44 22L58 48H6Z"
            fill="#73A882"
            stroke="#2B5237"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M22 36L32 27L42 36H22Z"
            fill="#C9735B"
            stroke="#5C2D20"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M19 42L32 33L45 42H19Z"
            fill="#DF8E74"
            stroke="#5C2D20"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <rect
            x="24"
            y="42"
            width="16"
            height="10"
            rx="1.5"
            fill="#FFFDF7"
            stroke="#5C2D20"
            strokeWidth="1.5"
          />
          <circle cx="48" cy="15" r="4.5" fill="#F2C864" />
        </svg>
      );
    case "pattaya":
      // Coastal Lighthouse & Palm Silhouette
      return (
        <svg
          viewBox="0 0 64 64"
          className="w-11 h-11 sm:w-12 sm:h-12 shrink-0"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M27 18H37L40 50H24L27 18Z"
            fill="#FFFFFF"
            stroke="#27476B"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path d="M26 27H38L38.7 34H25.3L26 27Z" fill="#E66454" />
          <path d="M25 40H39L39.6 46H24.4L25 40Z" fill="#E66454" />
          <rect
            x="26"
            y="12"
            width="12"
            height="6"
            rx="1.5"
            fill="#5BA4E6"
            stroke="#27476B"
            strokeWidth="1.5"
          />
          <path
            d="M24 12L32 6L40 12H24Z"
            fill="#E66454"
            stroke="#27476B"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M12 52C17 49 23 49 28 52C33 55 39 55 44 52C48 50 51 50 54 52"
            stroke="#1E78D6"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
      );
    case "phuket":
      // Old Town Sino-Portuguese Shophouse
      return (
        <svg
          viewBox="0 0 64 64"
          className="w-11 h-11 sm:w-12 sm:h-12 shrink-0"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M14 22C14 16 22 12 32 12C42 12 50 16 50 22V51H14V22Z"
            fill="#F4D794"
            stroke="#6C4E1F"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <rect
            x="19"
            y="24"
            width="8"
            height="11"
            rx="4"
            fill="#5384B8"
            stroke="#6C4E1F"
            strokeWidth="1.4"
          />
          <rect
            x="37"
            y="24"
            width="8"
            height="11"
            rx="4"
            fill="#5384B8"
            stroke="#6C4E1F"
            strokeWidth="1.4"
          />
          <path
            d="M26 51V40C26 36.7 28.7 34 32 34C35.3 34 38 36.7 38 40V51H26Z"
            fill="#C9735B"
            stroke="#6C4E1F"
            strokeWidth="1.4"
          />
          <path d="M12 51H52" stroke="#6C4E1F" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "khao-yai":
      // Mountain Pines & Windmill
      return (
        <svg
          viewBox="0 0 64 64"
          className="w-11 h-11 sm:w-12 sm:h-12 shrink-0"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M8 50L22 25L36 50H8Z"
            fill="#609D6D"
            stroke="#264D30"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M28 50L42 20L56 50H28Z"
            fill="#4B8759"
            stroke="#264D30"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M42 20L46 28H38L42 20Z"
            fill="#FFFFFF"
            fillOpacity="0.85"
          />
          <circle cx="18" cy="16" r="4.5" fill="#F2C864" />
        </svg>
      );
    case "krabi":
      // Limestone Karst Peaks & Longtail Boat
      return (
        <svg
          viewBox="0 0 64 64"
          className="w-11 h-11 sm:w-12 sm:h-12 shrink-0"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M12 44L17 18C18 14 23 14 25 19L30 44H12Z"
            fill="#6D9B8D"
            stroke="#284A41"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M34 44L39 14C40 10 46 11 48 16L52 44H34Z"
            fill="#568677"
            stroke="#284A41"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M18 45H46C44 50 38 52 32 52C26 52 20 50 18 45Z"
            fill="#D48B45"
            stroke="#593514"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M11 54C17 51 23 51 29 54C35 57 41 57 47 54C50 52.5 52 52.5 54 54"
            stroke="#1E78D6"
            strokeWidth="2.1"
            strokeLinecap="round"
          />
        </svg>
      );
  }
}

interface TripProvinceGroupsSectionProps {
  language: "th" | "en";
  allTrips: SavedBoardDto[];
  selectedGroupId: string | null;
  onSelectGroup: (group: PopularProvinceGroupConfig | null) => void;
}

export function TripProvinceGroupsSection({
  language,
  allTrips,
  selectedGroupId,
  onSelectGroup,
}: TripProvinceGroupsSectionProps) {
  const isTh = language === "th";

  const hydratedGroups = useMemo(() => {
    return POPULAR_TRIP_PROVINCE_GROUPS.map((group) => {
      const matchedTrips = allTrips.filter((trip) =>
        matchesProvinceGroup(trip, group)
      );
      const realPhotos: string[] = [];
      for (const trip of matchedTrips) {
        // Prioritize stop photos that belong specifically to this province
        const provinceStops = trip.items.filter((entry) => {
          if (entry.pin.provinceId === group.provinceId) return true;
          const hay =
            `${entry.pin.provinceNameTh} ${entry.pin.titleTh} ${entry.pin.hotelNameTh}`.toLowerCase();
          return group.keywords.some((kw) => hay.includes(kw.toLowerCase()));
        });
        for (const entry of provinceStops) {
          const url = entry.pin.coverImageUrl;
          if (url && !realPhotos.includes(url)) {
            realPhotos.push(url);
          }
          if (realPhotos.length >= 2) break;
        }
        if (realPhotos.length >= 2) break;
      }

      const frontPhoto = realPhotos[0] || group.fallbackPhotos[0];
      const backPhoto =
        realPhotos[1] ||
        (group.fallbackPhotos[0] !== frontPhoto
          ? group.fallbackPhotos[0]
          : group.fallbackPhotos[1]);

      return {
        ...group,
        tripCount: matchedTrips.length,
        frontPhoto,
        backPhoto,
      };
    });
  }, [allTrips]);

  return (
    <section
      id="popular-province-groups"
      className="space-y-4 scroll-mt-20"
    >
      {/* Section Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[var(--color-accent)]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>
              {isTh ? "ปักหมุดตามจังหวัดฮิต" : "Curated Destination Groups"}
            </span>
          </div>
          <h2 className="text-[20px] sm:text-[23px] font-bold tracking-[-0.02em] text-[var(--color-text-primary)]">
            {isTh ? "กลุ่มทริปจังหวัดยอดนิยม" : "Popular Province Groups"}
          </h2>
          <p className="text-[13.5px] text-[var(--color-text-secondary)]">
            {isTh
              ? "เลือกกลุ่มจังหวัดที่อยากไป เพื่อดูเรื่องราวและทริปที่เพื่อนนักเดินทางแชร์ไว้"
              : "Pick a popular destination group to explore traveller stories and itineraries."}
          </p>
        </div>

        {selectedGroupId && (
          <button
            type="button"
            onClick={() => onSelectGroup(null)}
            className="h-9 px-4 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[13px] font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{isTh ? "ดูทุกจังหวัด" : "All destinations"}</span>
          </button>
        )}
      </div>

      {/* Cute Scrapbook Sky Stage (Inspired by Reference Image 2) */}
      <div className="cgr-trip-scrapbook-sky relative rounded-[28px] px-4 py-7 sm:px-8 sm:py-10 overflow-hidden">
        {/* Subtle Decorative Dashed Travel Trail */}
        <svg
          viewBox="0 0 1000 520"
          fill="none"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 w-full h-full opacity-45 dark:opacity-25"
        >
          <path
            d="M 120 110 C 280 50, 380 210, 520 160 C 660 110, 760 60, 880 140 C 940 185, 890 320, 780 355 C 640 400, 440 310, 290 385 C 180 440, 110 380, 90 320"
            stroke="#8EB6DC"
            strokeWidth="2.5"
            strokeDasharray="7 9"
            strokeLinecap="round"
          />
        </svg>

        {/* Staggered Constellation Grid of 6 Popular Province Clusters */}
        <div className="relative z-10 grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-8 sm:gap-x-8 sm:gap-y-11">
          {hydratedGroups.map((group, idx) => {
            const isSelected = selectedGroupId === group.id;
            const staggerClass = [
              idx % 2 === 1 ? "mt-5 md:mt-0" : "",
              idx % 3 === 1 ? "md:mt-7" : "",
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <button
                key={group.id}
                type="button"
                onClick={() => onSelectGroup(isSelected ? null : group)}
                aria-pressed={isSelected}
                className={`group flex flex-col items-center text-center cursor-pointer transition-transform duration-300 ease-[var(--ease-out-expo)] hover:-translate-y-1 focus:outline-none ${staggerClass}`}
              >
                {/* Province Title + Custom Thai Landmark Illustration Peeking Above */}
                <div className="flex items-end justify-center gap-2 mb-1.5">
                  <span className="text-[17px] sm:text-[19px] font-bold tracking-[-0.015em] text-[var(--color-text-primary)] leading-none pb-1">
                    {isTh ? group.nameTh : group.nameEn}
                  </span>
                  <ProvinceLandmarkIllustration landmark={group.landmark} />
                </div>

                {/* Overlapping White-Framed 1:1 Square Postcards + Red-Top Calendar Badge */}
                <div className="relative aspect-square w-[144px] sm:w-[172px]">
                  {/* Back Tilted Postcard */}
                  <div className="absolute left-0 top-2 w-[92px] sm:w-[110px] aspect-square rounded-[18px] p-1 bg-white dark:bg-[#1e2736] shadow-[var(--shadow-popover)] -rotate-6 overflow-hidden">
                    <img
                      src={group.backPhoto}
                      alt=""
                      aria-hidden="true"
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover rounded-[14px]"
                    />
                  </div>

                  {/* Front Focal Postcard */}
                  <div
                    className={`absolute right-0 bottom-1 w-[104px] sm:w-[126px] aspect-square rounded-[20px] p-1.5 bg-white dark:bg-[#1e2736] shadow-[var(--shadow-popover)] rotate-3 overflow-hidden transition-colors ${
                      isSelected ? "ring-2 ring-[var(--color-accent)]" : ""
                    }`}
                  >
                    <img
                      src={group.frontPhoto}
                      alt={isTh ? group.nameTh : group.nameEn}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover rounded-[15px]"
                    />
                  </div>

                  {/* Cute Red-Top Calendar Badge (Trip Count) */}
                  <div
                    className={`absolute top-0 z-20 w-10 sm:w-11 rounded-[10px] overflow-hidden bg-white dark:bg-[#1e2736] shadow-[var(--shadow-popover)] ${
                      group.badgePosition === "left"
                        ? "-left-1 -rotate-3"
                        : "-right-1 rotate-3"
                    }`}
                  >
                    <div className="h-3 bg-[#e60023] flex items-center justify-center gap-2.5">
                      <span className="h-1 w-1 rounded-full bg-white/90" />
                      <span className="h-1 w-1 rounded-full bg-white/90" />
                    </div>
                    <div className="py-1 text-center text-[13px] sm:text-[14px] font-bold text-[var(--color-text-primary)] tabular-nums leading-none">
                      {group.tripCount > 0 ? group.tripCount : "+"}
                    </div>
                  </div>
                </div>

                {/* Compact Caption + Active Pill */}
                <p className="mt-2 text-[12px] sm:text-[12.5px] text-[var(--color-text-secondary)] line-clamp-1 max-w-[190px]">
                  {isTh ? group.subtitleTh : group.subtitleEn}
                </p>

                <span
                  className={`mt-1.5 inline-flex items-center h-6 px-3 rounded-full text-[11.5px] font-semibold transition-colors ${
                    isSelected
                      ? "bg-[var(--color-accent)] !text-[var(--color-on-accent)]"
                      : "bg-white/85 dark:bg-[#1e2736]/90 text-[var(--color-text-primary)] group-hover:bg-white dark:group-hover:bg-[#243041]"
                  }`}
                >
                  {isSelected
                    ? isTh
                      ? "กำลังดูกลุ่มนี้"
                      : "Viewing group"
                    : group.tripCount > 0
                    ? isTh
                      ? `${group.tripCount} ทริปที่แชร์`
                      : `${group.tripCount} shared`
                    : isTh
                    ? "ชวนแชร์ทริปแรก"
                    : "Share first story"}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
