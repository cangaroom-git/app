"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  BedDouble,
  Check,
  Compass,
  Home,
  Pencil,
  Play,
  Plus,
  Star,
  Tag,
} from "lucide-react";
import {
  BookingRecord,
  ExtraAddon,
  PromoCoupon,
  RoomLodge,
  WhiteLabelPropertyConfig,
} from "@/data/rooms";
import { SapanStoreData } from "@/lib/store";
import { LanguageCode } from "@/lib/dateFormatters";
import { StandardButton, StatusPill } from "@/components/ui/standards";

export interface HotelAdminPanelProps {
  propertyConfig: WhiteLabelPropertyConfig;
  rooms: RoomLodge[];
  coupons: PromoCoupon[];
  addons: ExtraAddon[];
  bookings?: BookingRecord[];
  pendingAdminCount: number;
  saveStore: (updater: (prev: SapanStoreData) => SapanStoreData) => void;
  onResetStore?: () => void;
  language?: LanguageCode;
  onChangeLanguage?: (nextLanguage: LanguageCode) => void;
}

type AdminSettingsSectionId =
  | "visual"
  | "bookings"
  | "account"
  | "domain"
  | "rooms"
  | "coupons"
  | "addons"
  | "ai";

const ADMIN_SECTION_ORDER: AdminSettingsSectionId[] = [
  "visual",
  "bookings",
  "account",
  "domain",
  "rooms",
  "coupons",
  "addons",
  "ai",
];

function AdminSectionIcon({
  sectionId,
  isFilled,
  className = "w-5 h-5",
}: {
  sectionId: AdminSettingsSectionId;
  isFilled: boolean;
  className?: string;
}) {
  switch (sectionId) {
    case "visual":
      return <Pencil className={className} />;
    case "account":
      return isFilled ? (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path
            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Zm0 4.5a3.2 3.2 0 1 1 0 6.4 3.2 3.2 0 0 1 0-6.4Zm0 13c-2.67 0-5.01-1.31-6.36-3.32.03-2.1 4.24-3.26 6.36-3.26 2.11 0 6.33 1.16 6.36 3.26A7.48 7.48 0 0 1 12 19.5Z"
            fill="currentColor"
          />
        </svg>
      ) : (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          className={className}
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9.5" />
          <circle cx="12" cy="9.5" r="3" />
          <path
            d="M6.2 18.8c1.3-2 3.4-3.1 5.8-3.1s4.5 1.1 5.8 3.1"
            strokeLinecap="round"
          />
        </svg>
      );

    case "rooms":
      return isFilled ? (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path
            d="M4 5a3 3 0 0 0-3 3v9a2 2 0 0 0 2 2v1.5a1 1 0 1 0 2 0V19h14v1.5a1 1 0 1 0 2 0V19a2 2 0 0 0 2-2V8a3 3 0 0 0-3-3H4Zm1.5 4.5A1.5 1.5 0 0 1 7 8h3.5A1.5 1.5 0 0 1 12 9.5V11H5.5V9.5Zm7.5 0A1.5 1.5 0 0 1 14.5 8H17a1.5 1.5 0 0 1 1.5 1.5V11H13V9.5Z"
            fill="currentColor"
          />
        </svg>
      ) : (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          aria-hidden="true"
        >
          <path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10H3V7Z" />
          <path d="M2 14h20v4H2v-4ZM4 18v2M20 18v2" />
          <path d="M6 10h4v4H6zM14 10h4v4h-4z" />
        </svg>
      );

    case "coupons":
      return isFilled ? (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path
            d="M3 8a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v1.6a2.4 2.4 0 0 0 0 4.8V16a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-1.6a2.4 2.4 0 0 0 0-4.8V8Zm6.5 3.2a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4Zm5 4a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4Z"
            fill="currentColor"
          />
        </svg>
      ) : (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          aria-hidden="true"
        >
          <path d="M3 8a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v1.6a2.4 2.4 0 0 0 0 4.8V16a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-1.6a2.4 2.4 0 0 0 0-4.8V8Z" />
          <path d="M9.5 14.5l5-5" />
        </svg>
      );

    case "addons":
      return isFilled ? (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path
            d="M12 3a9 9 0 0 0-9 9v1h18v-1a9 9 0 0 0-9-9Zm-1.5-1.5a1.5 1.5 0 0 1 3 0V3h-3V1.5ZM2 15h20a1 1 0 0 1 1 1v1a3 3 0 0 1-3 3H4a3 3 0 0 1-3-3v-1a1 1 0 0 1 1-1Z"
            fill="currentColor"
          />
        </svg>
      ) : (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          aria-hidden="true"
        >
          <path d="M3 13a9 9 0 0 1 18 0H3Z" />
          <path d="M2 16h20v1a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-1ZM12 4V2" />
        </svg>
      );

    case "domain":
      return isFilled ? (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path
            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Zm6.9 6h-2.95c-.32-1.25-.78-2.45-1.38-3.56A8.03 8.03 0 0 1 18.9 8ZM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96ZM4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2s.06 1.34.14 2H4.26Zm.84 2h2.95c.32 1.25.78 2.45 1.38 3.56A7.99 7.99 0 0 1 5.1 16Zm2.95-8H5.1a7.99 7.99 0 0 1 4.33-3.56C8.83 5.55 8.37 6.75 8.05 8ZM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96ZM14.34 14H9.66c-.09-.66-.16-1.32-.16-2s.07-1.35.16-2h4.68c.09.65.16 1.32.16 2s-.07 1.34-.16 2Zm.23 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95a8.03 8.03 0 0 1-4.33 3.56ZM16.36 14c.08-.66.14-1.32.14-2s-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2h-3.38Z"
            fill="currentColor"
          />
        </svg>
      ) : (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9.5" />
          <path d="M2.5 12h19M12 2.5c2.5 2.6 3.9 5.9 3.9 9.5s-1.4 6.9-3.9 9.5c-2.5-2.6-3.9-5.9-3.9-9.5s1.4-6.9 3.9-9.5Z" />
        </svg>
      );

    case "ai":
      return isFilled ? (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <rect x="4" y="6" width="16" height="13" rx="5" fill="currentColor" />
          <path
            d="M12 2v4"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
          />
          <circle
            cx="9"
            cy="12"
            r="1.5"
            fill="var(--color-background-card)"
          />
          <circle
            cx="15"
            cy="12"
            r="1.5"
            fill="var(--color-background-card)"
          />
        </svg>
      ) : (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          aria-hidden="true"
        >
          <rect x="4" y="6" width="16" height="13" rx="5" />
          <path d="M12 2v4" />
          <circle cx="9" cy="12" r="1.2" fill="currentColor" />
          <circle cx="15" cy="12" r="1.2" fill="currentColor" />
        </svg>
      );

    case "bookings":
      return isFilled ? (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <rect
            x="3"
            y="4"
            width="18"
            height="17"
            rx="3.5"
            fill="currentColor"
          />
          <path
            d="M8 2.5v3M16 2.5v3"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
          />
          <path
            d="M9 13.5l2 2 4.5-4.5"
            stroke="var(--color-background-card)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      ) : (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          aria-hidden="true"
        >
          <rect x="3" y="4.5" width="18" height="16.5" rx="3.5" />
          <path d="M8 2.8v3.2M16 2.8v3.2M3 9.5h18" />
          <path d="M9 14.5l2 2 4-4" />
        </svg>
      );
  }
}

export function HotelAdminPanel({
  propertyConfig,
  rooms,
  coupons,
  addons,
  bookings = [],
  pendingAdminCount,
  saveStore,
  onResetStore,
  language = "th",
}: HotelAdminPanelProps) {
  const [sectionState, setSectionState] = useState<{
    section: AdminSettingsSectionId;
    direction: 1 | -1;
  }>({
    section: "visual",
    direction: 1,
  });

  const activeSection = sectionState.section;
  const sectionSlideDirection = sectionState.direction;

  const handleSelectSection = (nextSection: AdminSettingsSectionId) => {
    setSectionState((previous) => {
      if (previous.section === nextSection) return previous;
      const previousIndex = ADMIN_SECTION_ORDER.indexOf(previous.section);
      const nextIndex = ADMIN_SECTION_ORDER.indexOf(nextSection);
      return {
        section: nextSection,
        direction: nextIndex >= previousIndex ? 1 : -1,
      };
    });
  };

  const [shouldShowAddRoomForm, setShouldShowAddRoomForm] = useState(false);
  const [newRoomCode, setNewRoomCode] = useState("");
  const [newRoomNameTh, setNewRoomNameTh] = useState("");
  const [newRoomPriceThb, setNewRoomPriceThb] = useState(3500);
  const [newRoomUnitsCount] = useState(1);
  const [newRoomDiscountPercent] = useState(10);

  const [shouldShowAddCouponForm, setShouldShowAddCouponForm] = useState(false);
  const [newCouponCode, setNewCouponCode] = useState("");
  const [newCouponTitleTh, setNewCouponTitleTh] = useState("");
  const [newCouponDiscountValue, setNewCouponDiscountValue] = useState(15);
  const [newCouponDiscountType, setNewCouponDiscountType] = useState<
    "PERCENT" | "FIXED"
  >("PERCENT");

  const [shouldShowAddAddonForm, setShouldShowAddAddonForm] = useState(false);
  const [newAddonNameTh, setNewAddonNameTh] = useState("");
  const [newAddonPriceThb, setNewAddonPriceThb] = useState(690);
  const [newAddonUnitTh, setNewAddonUnitTh] = useState("ต่อชุด");

  const [isEditingBrandProfile, setIsEditingBrandProfile] = useState(false);
  const [savedNoticeMessage, setSavedNoticeMessage] = useState<string | null>(
    null
  );

  const showSavedNotification = (message: string) => {
    setSavedNoticeMessage(message);
    setTimeout(() => setSavedNoticeMessage(null), 2500);
  };

  const standardFieldClassName =
    "h-10 w-full rounded-[12px] bg-[var(--color-background-card)] px-3.5 ty-body text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:ring-2 focus:ring-[var(--color-accent)]/30 focus:outline-none transition";

  const handleCreateRoom = (event: React.FormEvent) => {
    event.preventDefault();
    if (!newRoomNameTh.trim()) return;
    const normalizedCode = (
      newRoomCode.trim() || `R${rooms.length + 1}`
    ).toUpperCase();

    const createdRoom: RoomLodge = {
      id: `room-${Date.now()}`,
      slug: `room-${normalizedCode.toLowerCase()}-${Date.now()}`,
      code: normalizedCode,
      nameTh: newRoomNameTh.trim(),
      nameEn: newRoomNameTh.trim(),
      categoryTh:
        Number(newRoomUnitsCount) > 1 ? "ประเภทห้องพัก" : "บ้านพักส่วนตัว",
      categoryEn:
        Number(newRoomUnitsCount) > 1 ? "Room Type" : "Private Villa",
      roomCategory: Number(newRoomUnitsCount) > 1 ? "SUITE" : "VILLA",
      shortDescTh:
        "ห้องพักพร้อมระเบียงชมวิวและสิ่งอำนวยความสะดวกครบครัน รวมอาหารเช้า",
      shortDescEn:
        "Modern room with private balcony and full amenities including breakfast",
      longDescTh: [
        "ห้องพักดีไซน์โมเดิร์นพร้อมวิวธรรมชาติและสิ่งอำนวยความสะดวกครบครัน เหมาะสำหรับการพักผ่อนอย่างแท้จริง",
      ],
      longDescEn: [
        "Modern accommodation with scenic view and full amenities, ideal for relaxation.",
      ],
      basePriceThb: Number(newRoomPriceThb) || 3500,
      weekendPriceThb: Number(newRoomPriceThb) || 3500,
      discountPercent: Number(newRoomDiscountPercent) || 0,
      extraBedPriceThb: 800,
      sizeSqm: 48,
      minGuests: 1,
      baseGuests: 2,
      maxGuests: 4,
      bedrooms: 1,
      beds: 1,
      bathrooms: 1,
      petsAllowed: false,
      statusMode: "ACTIVE",
      mapX: 50,
      mapY: 50,
      highlightTh: "วิวธรรมชาติ · สิ่งอำนวยความสะดวกครบครัน",
      highlightEn: "Scenic Nature View · Full Amenities",
      totalUnits: Math.max(1, Number(newRoomUnitsCount) || 1),
      inventoryMode:
        Number(newRoomUnitsCount) > 1 ? "ROOM_TYPE" : "SINGLE_UNIT",
      images: [
        {
          url: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80",
          captionTh: newRoomNameTh.trim(),
          captionEn: newRoomNameTh.trim(),
        },
        {
          url: "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1200&q=80",
          captionTh: "ระเบียงชมวิวส่วนตัว",
          captionEn: "Private Terrace",
        },
      ],
      amenities: {
        outdoor: ["ระเบียงชมวิวส่วนตัว", "ชุดเก้าอี้พักผ่อนรับลม"],
        dining: ["เซ็ตอาหารเช้า", "มินิบาร์และชุดดริปกาแฟ"],
        common: [
          "เตียง King Size",
          "เครื่องปรับอากาศ",
          "Smart TV & Wi-Fi",
          "ไดร์เป่าผม",
        ],
      },
    };

    saveStore((previous) => ({
      ...previous,
      rooms: [...previous.rooms, createdRoom],
    }));

    setNewRoomCode("");
    setNewRoomNameTh("");
    setShouldShowAddRoomForm(false);
    showSavedNotification(`เพิ่มห้องพัก "${createdRoom.nameTh}" เรียบร้อยแล้ว`);
  };

  const handleCreateCoupon = (event: React.FormEvent) => {
    event.preventDefault();
    if (!newCouponCode.trim() || !newCouponTitleTh.trim()) return;
    const normalizedCode = newCouponCode.trim().toUpperCase();

    const createdCoupon: PromoCoupon = {
      id: `coupon-${Date.now()}`,
      code: normalizedCode,
      titleTh: newCouponTitleTh.trim(),
      descTh: "คูปองส่วนลดพิเศษสำหรับการจองตรงผ่านหน้าเว็บไซต์",
      badgeTh:
        newCouponDiscountType === "PERCENT"
          ? `SAVE ${newCouponDiscountValue}%`
          : `SAVE ฿${newCouponDiscountValue}`,
      imageUrl:
        "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=900&q=80",
      discountType: newCouponDiscountType,
      discountValue: Number(newCouponDiscountValue) || 10,
      minSpendThb: 2000,
      isActive: true,
    };

    saveStore((previous) => ({
      ...previous,
      coupons: [createdCoupon, ...previous.coupons],
    }));

    setNewCouponCode("");
    setNewCouponTitleTh("");
    setShouldShowAddCouponForm(false);
    showSavedNotification(`สร้างคูปอง ${normalizedCode} เรียบร้อยแล้ว`);
  };

  const handleCreateAddon = (event: React.FormEvent) => {
    event.preventDefault();
    if (!newAddonNameTh.trim()) return;

    const createdAddon: ExtraAddon = {
      id: `addon-${Date.now()}`,
      nameTh: newAddonNameTh.trim(),
      nameEn: newAddonNameTh.trim(),
      descTh: "บริการเสริมพิเศษจัดเตรียมให้พร้อมในวันเข้าพัก",
      descEn: "Curated in-villa add-on service",
      priceThb: Number(newAddonPriceThb) || 500,
      unitTh: newAddonUnitTh.trim() || "ต่อชุด",
      unitEn: "per set",
      category: "DINING",
      imageUrl:
        "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80",
      isActive: true,
    };

    saveStore((previous) => ({
      ...previous,
      addons: [createdAddon, ...previous.addons],
    }));

    setNewAddonNameTh("");
    setShouldShowAddAddonForm(false);
    showSavedNotification(
      `เพิ่มบริการเสริม "${createdAddon.nameTh}" เรียบร้อยแล้ว`
    );
  };

  const navigationSections: {
    id: AdminSettingsSectionId;
    labelTh: string;
    labelEn: string;
    count?: number;
  }[] = [
    {
      id: "visual",
      labelTh: "แก้ไขหน้าเว็บจริง",
      labelEn: "Edit Live Website",
    },
    {
      id: "bookings",
      labelTh: "รายการจอง & สลิป",
      labelEn: "Bookings & QR Slips",
      count: bookings.length,
    },
    {
      id: "account",
      labelTh: "บัญชี & PromptPay",
      labelEn: "Account & PromptPay",
    },
    {
      id: "domain",
      labelTh: "โดเมน & เว็บไซต์",
      labelEn: "Domain & Website",
    },
    {
      id: "rooms",
      labelTh: "ปรับเรทราคาด่วน",
      labelEn: "Quick Room Rates",
      count: rooms.length,
    },
    {
      id: "coupons",
      labelTh: "คูปอง & โปรโมชั่น",
      labelEn: "Coupons & Deals",
      count: coupons.length,
    },
    {
      id: "addons",
      labelTh: "บริการเสริมในวิลล่า",
      labelEn: "In-Villa Add-ons",
      count: addons.length,
    },
    {
      id: "ai",
      labelTh: "AI Concierge",
      labelEn: "AI Concierge",
    },
  ];

  const activeSectionMeta =
    navigationSections.find((item) => item.id === activeSection) ||
    navigationSections[0];

  return (
    <section className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8 items-start">
      {/* Left Sidebar Navigation (Single 1-Layer Surface on Open Canvas) */}
      <aside className="md:col-span-4 lg:col-span-3 rounded-[20px] bg-[var(--color-background-muted)] p-4 flex flex-col gap-4 md:sticky md:top-16">
        <div className="px-2">
          <h1 className="ty-title">
            {language === "th" ? "ตั้งค่าระบบที่พัก" : "Hotel Settings"}
          </h1>
          <p className="ty-caption mt-0.5">
            {propertyConfig.brandCode} ·{" "}
            {pendingAdminCount > 0
              ? `${pendingAdminCount} pending`
              : "All synced"}
          </p>
        </div>

        <nav className="flex md:flex-col gap-1 overflow-x-auto no-scrollbar">
          {navigationSections.map((sectionItem) => {
            const isSelected = activeSection === sectionItem.id;
            const isPromoSection = sectionItem.id === "coupons";
            return (
              <button
                key={sectionItem.id}
                type="button"
                onClick={() => handleSelectSection(sectionItem.id)}
                className={`relative w-full min-w-max md:min-w-0 h-11 px-3.5 rounded-[12px] flex items-center justify-between gap-2.5 ty-body transition-colors cursor-pointer ${
                  isSelected
                    ? "text-[var(--color-text-primary)] font-semibold"
                    : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-overlay-hover)]"
                }`}
              >
                {isSelected && (
                  <motion.span
                    layoutId="hotel-owner-settings-nav-pill"
                    className="absolute inset-0 rounded-[12px] bg-[var(--color-background-card)] shadow-2xs"
                    transition={{
                      type: "spring",
                      stiffness: 420,
                      damping: 34,
                      mass: 0.8,
                    }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-3">
                  <AdminSectionIcon
                    sectionId={sectionItem.id}
                    isFilled={isSelected}
                    className={`w-5 h-5 shrink-0 ${
                      isPromoSection && isSelected
                        ? "text-[var(--color-promo-text)]"
                        : isSelected
                        ? "text-[var(--color-accent)]"
                        : "text-current"
                    }`}
                  />
                  <span>
                    {language === "th"
                      ? sectionItem.labelTh
                      : sectionItem.labelEn}
                  </span>
                </span>
                {typeof sectionItem.count === "number" && (
                  <span
                    className={`relative z-10 ty-caption font-semibold ${
                      isPromoSection ? "text-[var(--color-promo-text)]" : ""
                    }`}
                  >
                    {sectionItem.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Right Split-Pane Settings Content (Directly on Open Canvas) */}
      <div className="md:col-span-8 lg:col-span-9 flex flex-col space-y-4 min-w-0">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="ty-display flex items-center gap-2.5">
              <AdminSectionIcon
                sectionId={activeSection}
                isFilled={true}
                className={`w-5 h-5 shrink-0 ${
                  activeSection === "coupons"
                    ? "text-[var(--color-promo-text)]"
                    : "text-[var(--color-accent)]"
                }`}
              />
              <span>
                {language === "th"
                  ? activeSectionMeta.labelTh
                  : activeSectionMeta.labelEn}
              </span>
            </h2>
            {savedNoticeMessage && (
              <p className="ty-caption font-semibold text-[var(--color-success)] mt-0.5">
                ✓ {savedNoticeMessage}
              </p>
            )}
          </div>

          {activeSection === "rooms" && (
            <StandardButton
              variant="primary"
              size="md"
              onClick={() => setShouldShowAddRoomForm((prev) => !prev)}
            >
              <Plus className="w-4 h-4" />
              <span>
                {shouldShowAddRoomForm
                  ? language === "th"
                    ? "ปิดฟอร์ม"
                    : "Close"
                  : language === "th"
                  ? "เพิ่มห้องพัก"
                  : "Add Room"}
              </span>
            </StandardButton>
          )}

          {activeSection === "coupons" && (
            <StandardButton
              variant="promo"
              size="md"
              onClick={() => setShouldShowAddCouponForm((prev) => !prev)}
            >
              <Plus className="w-4 h-4" />
              <span>
                {shouldShowAddCouponForm
                  ? language === "th"
                    ? "ปิดฟอร์ม"
                    : "Close"
                  : language === "th"
                  ? "สร้างคูปองส่วนลด"
                  : "Create Coupon"}
              </span>
            </StandardButton>
          )}

          {activeSection === "addons" && (
            <StandardButton
              variant="secondary"
              size="md"
              onClick={() => setShouldShowAddAddonForm((prev) => !prev)}
            >
              <Plus className="w-4 h-4" />
              <span>
                {shouldShowAddAddonForm
                  ? language === "th"
                    ? "ปิดฟอร์ม"
                    : "Close"
                  : language === "th"
                  ? "เพิ่มบริการเสริม"
                  : "Add Service"}
              </span>
            </StandardButton>
          )}
        </header>

        <div className="flex-1 relative overflow-x-clip">
            <AnimatePresence
              initial={false}
              custom={sectionSlideDirection}
              mode="wait"
            >
              <motion.div
                key={activeSection}
                custom={sectionSlideDirection}
                variants={{
                  enter: (direction: number) => ({
                    x: direction > 0 ? 48 : -48,
                    opacity: 0,
                  }),
                  center: {
                    x: 0,
                    opacity: 1,
                    transitionEnd: { transform: "none" },
                  },
                  exit: (direction: number) => ({
                    x: direction > 0 ? -48 : 48,
                    opacity: 0,
                  }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  x: { type: "tween", duration: 0.22, ease: [0.32, 0.72, 0, 1] },
                  opacity: { duration: 0.16, ease: "easeOut" },
                }}
              >
                {/* 0. Live Visual Website Editor Launchpad */}
                {activeSection === "visual" && (
                  <div className="space-y-4">
                    <p className="ty-body-muted">
                      คลิกเลือกหน้าที่ต้องการแก้ไข ระบบจะเปิดหน้าเว็บจริงพร้อมปุ่มดินสอให้จิ้มแก้ข้อความ รูปภาพ (ย่อ WebP อัตโนมัติขึ้น Cloudinary) และวางลิงก์วิดีโอ YouTube / Facebook ได้ตรงจุดทันที
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {[
                        {
                          href: "/?edit=1",
                          Icon: Home,
                          title: "หน้าแรก (/)",
                          desc: "ภาพปกหลัก, คำโปรย H1, 4 จุดเด่น, เรื่องราวคู่ภาพ และแบนเนอร์",
                          isPromo: false,
                        },
                        {
                          href: "/booking?edit=1",
                          Icon: BedDouble,
                          title: "หน้าจอง & ห้องพัก (/booking)",
                          desc: "เพิ่ม/แก้ไขห้องพัก, อัปโหลดหลายรูป, เรทวันธรรมดา-ศุกร์เสาร์ และแกลเลอรีรวม",
                          isPromo: false,
                        },
                        {
                          href: "/shorts?edit=1",
                          Icon: Play,
                          title: "วิดีโอสั้น (/shorts)",
                          desc: "วางลิงก์ YouTube Shorts / Facebook ดึงปกอัตโนมัติ ผูกห้องพักและคูปอง",
                          isPromo: false,
                        },
                        {
                          href: "/deal?edit=1",
                          Icon: Tag,
                          title: "คูปอง & โปรโมชั่น (/deal)",
                          desc: "คูปองส่วนลด, แพ็กเกจหมูกระทะ/สปา, การ์ดสิทธิพิเศษ และเรทฤดูกาล",
                          isPromo: true,
                        },
                        {
                          href: "/review?edit=1",
                          Icon: Star,
                          title: "รีวิวผู้เข้าพัก (/review)",
                          desc: "เพิ่มรูปและข้อความประทับใจจากลูกค้าจริง ผูกปุ่มจองห้องอัตโนมัติ",
                          isPromo: false,
                        },
                        {
                          href: "/guide?edit=1",
                          Icon: Compass,
                          title: "แผนที่ & คู่มือที่พัก (/guide)",
                          desc: "แก้ไขพิกัดแผนที่, ที่เที่ยวใกล้เคียง และคำถามที่พบบ่อย (FAQs)",
                          isPromo: false,
                        },
                      ].map((card) => {
                        const CardIcon = card.Icon;
                        return (
                          <Link
                            key={card.href}
                            href={card.href}
                            className="rounded-[16px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] p-4 flex items-start justify-between gap-3 transition group"
                          >
                            <div className="flex items-start gap-3 min-w-0">
                              <span
                                className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
                                  card.isPromo
                                    ? "bg-[var(--color-promo-muted)] text-[var(--color-promo-text)]"
                                    : "bg-[var(--color-accent-muted)] text-[var(--color-accent)]"
                                }`}
                              >
                                <CardIcon className="w-5 h-5" />
                              </span>
                              <div className="min-w-0">
                                <p className="ty-body font-bold text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] transition-colors">
                                  {card.title}
                                </p>
                                <p className="ty-caption mt-0.5 line-clamp-2">
                                  {card.desc}
                                </p>
                              </div>
                            </div>

                            <span className="h-9 w-9 rounded-full bg-[var(--color-background-card)] flex items-center justify-center shrink-0 text-[var(--color-accent)]">
                              <ArrowRight className="w-4 h-4" />
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 1. Account & PromptPay */}
                {activeSection === "account" && (
                  <div className="space-y-2.5">
                    <div className="rounded-[16px] bg-[var(--color-background-muted)] p-4 space-y-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="ty-body font-semibold text-[var(--color-text-primary)]">
                            {language === "th"
                              ? "ข้อมูลโรงแรมและแบรนด์"
                              : "Hotel profile & branding"}
                          </p>
                          <p className="ty-caption mt-0.5">
                            {propertyConfig.nameTh} ({propertyConfig.nameEn}) ·
                            Code: {propertyConfig.brandCode}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setIsEditingBrandProfile((prev) => !prev)
                          }
                          className="btn-fw-secondary !bg-[var(--color-background-card)] shrink-0 cursor-pointer"
                        >
                          {isEditingBrandProfile
                            ? language === "th"
                              ? "เสร็จสิ้น"
                              : "Done"
                            : language === "th"
                            ? "แก้ไข"
                            : "Edit"}
                        </button>
                      </div>

                      {isEditingBrandProfile && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                          <div>
                            <label className="ty-caption font-semibold block mb-1.5">
                              ชื่อโรงแรม (ภาษาไทย)
                            </label>
                            <input
                              type="text"
                              value={propertyConfig.nameTh}
                              onChange={(event) =>
                                saveStore((previous) => ({
                                  ...previous,
                                  propertyConfig: {
                                    ...previous.propertyConfig,
                                    nameTh: event.target.value,
                                  },
                                }))
                              }
                              className={standardFieldClassName}
                            />
                          </div>
                          <div>
                            <label className="ty-caption font-semibold block mb-1.5">
                              Hotel Name (English)
                            </label>
                            <input
                              type="text"
                              value={propertyConfig.nameEn}
                              onChange={(event) =>
                                saveStore((previous) => ({
                                  ...previous,
                                  propertyConfig: {
                                    ...previous.propertyConfig,
                                    nameEn: event.target.value,
                                  },
                                }))
                              }
                              className={standardFieldClassName}
                            />
                          </div>
                          <div>
                            <label className="ty-caption font-semibold block mb-1.5">
                              PromptPay ID (เบอร์โทร / เลขนิติบุคคล)
                            </label>
                            <input
                              type="text"
                              value={propertyConfig.promptPayId}
                              onChange={(event) =>
                                saveStore((previous) => ({
                                  ...previous,
                                  propertyConfig: {
                                    ...previous.propertyConfig,
                                    promptPayId: event.target.value,
                                  },
                                }))
                              }
                              className={`${standardFieldClassName} font-mono`}
                            />
                          </div>
                          <div>
                            <label className="ty-caption font-semibold block mb-1.5">
                              ชื่อบัญชีรับโอน (Account Name)
                            </label>
                            <input
                              type="text"
                              value={propertyConfig.promptPayAccountName}
                              onChange={(event) =>
                                saveStore((previous) => ({
                                  ...previous,
                                  propertyConfig: {
                                    ...previous.propertyConfig,
                                    promptPayAccountName: event.target.value,
                                  },
                                }))
                              }
                              className={standardFieldClassName}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="rounded-[16px] bg-[var(--color-background-muted)] p-4 flex items-center justify-between gap-4">
                      <div>
                        <p className="ty-body font-semibold text-[var(--color-text-primary)]">
                          PromptPay QR settlement
                        </p>
                        <p className="ty-caption mt-0.5">
                          {propertyConfig.promptPayAccountName} ·{" "}
                          {propertyConfig.promptPayId}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsEditingBrandProfile(true)}
                        className="btn-fw-secondary !bg-[var(--color-background-card)] shrink-0 cursor-pointer"
                      >
                        {language === "th" ? "ตั้งค่า" : "Configure"}
                      </button>
                    </div>

                    <div className="rounded-[16px] bg-[var(--color-background-muted)] p-4 flex items-center justify-between gap-4">
                      <div>
                        <p className="ty-body font-semibold text-[var(--color-text-primary)]">
                          Auto-confirm QR slip
                        </p>
                        <p className="ty-caption mt-0.5">
                          {propertyConfig.autoConfirmSlip !== false
                            ? "ยืนยันการจอง (CONFIRMED) ทันทีที่สแกน QR สลิปผ่าน"
                            : "รอแอดมินกด Approve เองในหน้า Bookings"}
                        </p>
                      </div>
                      <StandardButton
                        variant={
                          propertyConfig.autoConfirmSlip !== false
                            ? "primary"
                            : "secondary"
                        }
                        size="sm"
                        onClick={() => {
                          const shouldAutoConfirm = !(
                            propertyConfig.autoConfirmSlip !== false
                          );
                          saveStore((previous) => ({
                            ...previous,
                            propertyConfig: {
                              ...previous.propertyConfig,
                              autoConfirmSlip: shouldAutoConfirm,
                            },
                          }));
                          showSavedNotification(
                            shouldAutoConfirm
                              ? "เปิดระบบยืนยันสลิปอัตโนมัติแล้ว"
                              : "เปลี่ยนเป็นโหมดแอดมินกดยืนยันเอง"
                          );
                        }}
                        className={`shrink-0 ${
                          propertyConfig.autoConfirmSlip === false
                            ? "!bg-[var(--color-background-card)]"
                            : ""
                        }`}
                      >
                        {propertyConfig.autoConfirmSlip !== false
                          ? "Auto-Confirm ON"
                          : "Manual Mode"}
                      </StandardButton>
                    </div>

                    <div className="rounded-[16px] bg-[var(--color-background-muted)] p-4 flex items-center justify-between gap-4">
                      <div>
                        <p className="ty-body font-semibold text-[var(--color-text-primary)]">
                          Help center
                        </p>
                        <p className="ty-caption mt-0.5">
                          Direct reservation support · Tel:{" "}
                          {propertyConfig.phones[0]} · LINE:{" "}
                          {propertyConfig.lineId}
                        </p>
                      </div>
                      <a
                        href={`tel:${propertyConfig.phones[0]}`}
                        className="btn-fw-secondary !bg-[var(--color-background-card)] shrink-0"
                      >
                        {language === "th" ? "ติดต่อ" : "Contact"}
                      </a>
                    </div>

                    <div className="rounded-[16px] bg-[var(--color-background-muted)] p-4 flex items-center justify-between gap-4">
                      <div>
                        <p className="ty-body font-semibold text-[var(--color-text-primary)]">
                          Reservations & QR slip verification
                        </p>
                        <p className="ty-caption mt-0.5">
                          Manage guest bookings and verify uploaded bank slips (
                          {pendingAdminCount} pending)
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSelectSection("bookings")}
                        className="btn-fw-secondary !bg-[var(--color-background-card)] shrink-0 cursor-pointer"
                      >
                        Manage ({bookings.length})
                      </button>
                    </div>

                    {onResetStore && (
                      <div className="rounded-[16px] bg-[var(--color-background-muted)] p-4 flex items-center justify-between gap-4">
                        <div>
                          <p className="ty-body font-semibold text-[var(--color-text-primary)]">
                            Reset demo data
                          </p>
                          <p className="ty-caption mt-0.5">
                            Restore rooms, coupons, and sample reservations to
                            initial defaults
                          </p>
                        </div>
                        <StandardButton
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            onResetStore();
                            showSavedNotification(
                              "รีเซ็ตข้อมูลตัวอย่างเรียบร้อยแล้ว"
                            );
                          }}
                          className="shrink-0 !bg-[var(--color-background-card)]"
                        >
                          Reset data
                        </StandardButton>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. Bookings & QR Slips */}
                {activeSection === "bookings" && (
                  <div className="space-y-2.5">
                    {bookings.length === 0 ? (
                      <div className="rounded-[16px] bg-[var(--color-background-muted)] py-12 text-center ty-body-muted">
                        ยังไม่มีรายการจองในระบบ
                      </div>
                    ) : (
                      bookings.map((bookingRecord) => (
                        <div
                          key={bookingRecord.id}
                          className="rounded-[16px] bg-[var(--color-background-muted)] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono ty-caption font-bold px-2.5 py-0.5 rounded-full bg-[var(--color-background-card)] text-[var(--color-text-primary)]">
                                {bookingRecord.bookingCode}
                              </span>
                              <span className="ty-body font-semibold text-[var(--color-text-primary)]">
                                {bookingRecord.guestName} (
                                {bookingRecord.guestPhone})
                              </span>
                              <StatusPill
                                variant={
                                  bookingRecord.status === "CONFIRMED"
                                    ? "success"
                                    : bookingRecord.status === "PENDING_ADMIN"
                                    ? "warning"
                                    : bookingRecord.status === "HOLD_15_MIN"
                                    ? "accent"
                                    : "error"
                                }
                              >
                                {bookingRecord.status === "CONFIRMED"
                                  ? "ยืนยันแล้ว"
                                  : bookingRecord.status === "PENDING_ADMIN"
                                  ? "รอตรวจสลิป"
                                  : bookingRecord.status === "HOLD_15_MIN"
                                  ? "ล็อคห้อง 15 นาที"
                                  : "ยกเลิก"}
                              </StatusPill>
                            </div>
                            <p className="ty-caption">
                              {bookingRecord.roomNameTh} (
                              {bookingRecord.roomCode}) ·{" "}
                              {bookingRecord.checkIn} ถึง{" "}
                              {bookingRecord.checkOut} ({bookingRecord.nights}{" "}
                              คืน) · ยอดสุทธิ{" "}
                              <strong className="text-[var(--color-text-primary)]">
                                ฿{bookingRecord.totalPriceThb.toLocaleString()}
                              </strong>
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {bookingRecord.status !== "CONFIRMED" && (
                              <StandardButton
                                variant="primary"
                                size="sm"
                                onClick={() => {
                                  saveStore((previous) => ({
                                    ...previous,
                                    bookings: previous.bookings.map((item) =>
                                      item.id === bookingRecord.id
                                        ? { ...item, status: "CONFIRMED" }
                                        : item
                                    ),
                                  }));
                                  showSavedNotification(
                                    `อนุมัติการจอง ${bookingRecord.bookingCode} เรียบร้อยแล้ว`
                                  );
                                }}
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Approve</span>
                              </StandardButton>
                            )}
                            {bookingRecord.status !== "CANCELLED" && (
                              <StandardButton
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  saveStore((previous) => ({
                                    ...previous,
                                    bookings: previous.bookings.map((item) =>
                                      item.id === bookingRecord.id
                                        ? { ...item, status: "CANCELLED" }
                                        : item
                                    ),
                                  }));
                                  showSavedNotification(
                                    `ยกเลิกการจอง ${bookingRecord.bookingCode} เรียบร้อยแล้ว`
                                  );
                                }}
                                className="!bg-[var(--color-error-muted)] !text-[var(--color-error)]"
                              >
                                Cancel
                              </StandardButton>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* 3. Rooms & Rates */}
                {activeSection === "rooms" && (
                  <div className="space-y-3">
                    {shouldShowAddRoomForm && (
                      <form
                        onSubmit={handleCreateRoom}
                        className="p-5 rounded-[16px] bg-[var(--color-background-muted)] space-y-4"
                      >
                        <p className="ty-body font-semibold text-[var(--color-text-primary)]">
                          Create new room or villa
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                          <input
                            type="text"
                            placeholder="Room Code (e.g. V5)"
                            value={newRoomCode}
                            onChange={(event) =>
                              setNewRoomCode(event.target.value)
                            }
                            className={standardFieldClassName}
                          />
                          <input
                            type="text"
                            required
                            placeholder="ชื่อห้องพัก (เช่น Horizon Villa)"
                            value={newRoomNameTh}
                            onChange={(event) =>
                              setNewRoomNameTh(event.target.value)
                            }
                            className={`${standardFieldClassName} sm:col-span-2`}
                          />
                          <input
                            type="number"
                            min={500}
                            step={100}
                            placeholder="Price / Night (฿)"
                            value={newRoomPriceThb}
                            onChange={(event) =>
                              setNewRoomPriceThb(Number(event.target.value))
                            }
                            className={standardFieldClassName}
                          />
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <StandardButton
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setShouldShowAddRoomForm(false)}
                            className="!bg-[var(--color-background-card)]"
                          >
                            Cancel
                          </StandardButton>
                          <StandardButton
                            type="submit"
                            variant="primary"
                            size="sm"
                          >
                            Save room
                          </StandardButton>
                        </div>
                      </form>
                    )}

                    <div className="space-y-2.5">
                      {rooms.map((roomItem) => (
                        <div
                          key={roomItem.id}
                          className="rounded-[16px] bg-[var(--color-background-muted)] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <img
                              src={roomItem.images[0]?.url}
                              alt={roomItem.nameTh}
                              className="w-14 h-14 rounded-[12px] object-cover bg-[var(--color-background-subtle)] shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="ty-body font-semibold text-[var(--color-text-primary)] truncate">
                                  {roomItem.nameTh}
                                </span>
                                <span className="rounded-full bg-[var(--color-background-card)] px-2.5 py-0.5 ty-caption font-semibold text-[var(--color-text-secondary)]">
                                  {roomItem.code}
                                </span>
                                {roomItem.discountPercent > 0 && (
                                  <span className="badge-promo">
                                    -{roomItem.discountPercent}%
                                  </span>
                                )}
                              </div>
                              <p className="ty-caption mt-0.5">
                                {roomItem.sizeSqm} sq.m. · Max{" "}
                                {roomItem.maxGuests} guests ·{" "}
                                {roomItem.totalUnits ?? 1} unit
                                {(roomItem.totalUnits ?? 1) > 1 ? "s" : ""}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 shrink-0">
                            <div className="flex items-center gap-1.5">
                              <span className="ty-caption">฿</span>
                              <input
                                type="number"
                                min={500}
                                step={100}
                                value={roomItem.basePriceThb}
                                onChange={(event) => {
                                  const nextRateThb =
                                    Number(event.target.value) || 1000;
                                  saveStore((previous) => ({
                                    ...previous,
                                    rooms: previous.rooms.map((item) =>
                                      item.id === roomItem.id
                                        ? {
                                            ...item,
                                            basePriceThb: nextRateThb,
                                          }
                                        : item
                                    ),
                                  }));
                                }}
                                className="h-9 w-24 rounded-full bg-[var(--color-background-card)] px-3 ty-body font-semibold text-[var(--color-text-primary)] text-right focus:ring-2 focus:ring-[var(--color-accent)]/30 focus:outline-none"
                              />
                            </div>

                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min={0}
                                max={80}
                                value={roomItem.discountPercent}
                                onChange={(event) => {
                                  const clampedDiscount = Math.min(
                                    80,
                                    Math.max(
                                      0,
                                      Number(event.target.value) || 0
                                    )
                                  );
                                  saveStore((previous) => ({
                                    ...previous,
                                    rooms: previous.rooms.map((item) =>
                                      item.id === roomItem.id
                                        ? {
                                            ...item,
                                            discountPercent: clampedDiscount,
                                          }
                                        : item
                                    ),
                                  }));
                                }}
                                className="h-9 w-16 rounded-full bg-[var(--color-promo-muted)] px-2.5 ty-body font-semibold text-[var(--color-promo-text)] text-center focus:ring-2 focus:ring-[var(--color-promo)]/30 focus:outline-none"
                              />
                              <span className="ty-caption text-[var(--color-promo-text)] font-semibold">
                                % off
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. Coupons & Deals (#c53829 Promo Standard) */}
                {activeSection === "coupons" && (
                  <div className="space-y-3">
                    {shouldShowAddCouponForm && (
                      <form
                        onSubmit={handleCreateCoupon}
                        className="p-5 rounded-[16px] bg-[var(--color-promo-muted)] space-y-4"
                      >
                        <p className="ty-body font-semibold text-[var(--color-promo-text)] flex items-center gap-2">
                          <Tag className="w-4 h-4" />
                          <span>Create promo coupon</span>
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                          <input
                            type="text"
                            required
                            placeholder="CODE (e.g. SUMMER20)"
                            value={newCouponCode}
                            onChange={(event) =>
                              setNewCouponCode(event.target.value.toUpperCase())
                            }
                            className={`${standardFieldClassName} font-mono uppercase`}
                          />
                          <input
                            type="text"
                            required
                            placeholder="ชื่อแคมเปญส่วนลด"
                            value={newCouponTitleTh}
                            onChange={(event) =>
                              setNewCouponTitleTh(event.target.value)
                            }
                            className={`${standardFieldClassName} sm:col-span-2`}
                          />
                          <div className="flex gap-2">
                            <input
                              type="number"
                              min={1}
                              value={newCouponDiscountValue}
                              onChange={(event) =>
                                setNewCouponDiscountValue(
                                  Number(event.target.value)
                                )
                              }
                              className={standardFieldClassName}
                            />
                            <select
                              value={newCouponDiscountType}
                              onChange={(event) =>
                                setNewCouponDiscountType(
                                  event.target.value as "PERCENT" | "FIXED"
                                )
                              }
                              className="h-10 rounded-[12px] bg-[var(--color-background-card)] px-2.5 ty-caption font-semibold text-[var(--color-text-primary)] focus:outline-none"
                            >
                              <option value="PERCENT">%</option>
                              <option value="FIXED">฿</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <StandardButton
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setShouldShowAddCouponForm(false)}
                            className="!bg-[var(--color-background-card)]"
                          >
                            Cancel
                          </StandardButton>
                          <StandardButton
                            type="submit"
                            variant="promo"
                            size="sm"
                          >
                            Save coupon
                          </StandardButton>
                        </div>
                      </form>
                    )}

                    <div className="space-y-2.5">
                      {coupons.map((couponItem) => (
                        <div
                          key={couponItem.id}
                          className="rounded-[16px] bg-[var(--color-background-muted)] p-4 flex items-center justify-between gap-4"
                        >
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="ty-body font-semibold text-[var(--color-text-primary)]">
                                {couponItem.titleTh}
                              </span>
                              <span className="badge-promo font-mono">
                                {couponItem.code}
                              </span>
                            </div>
                            <p className="ty-caption mt-0.5">
                              Discount:{" "}
                              <strong className="text-[var(--color-promo-text)]">
                                {couponItem.discountType === "PERCENT"
                                  ? `${couponItem.discountValue}%`
                                  : `฿${couponItem.discountValue.toLocaleString()}`}
                              </strong>{" "}
                              · Min. spend ฿
                              {couponItem.minSpendThb.toLocaleString()}
                            </p>
                          </div>

                          <StandardButton
                            variant={couponItem.isActive ? "promo" : "outline"}
                            size="sm"
                            onClick={() =>
                              saveStore((previous) => ({
                                ...previous,
                                coupons: previous.coupons.map((item) =>
                                  item.id === couponItem.id
                                    ? { ...item, isActive: !item.isActive }
                                    : item
                                ),
                              }))
                            }
                            className={`shrink-0 ${
                              !couponItem.isActive
                                ? "!bg-[var(--color-background-card)]"
                                : ""
                            }`}
                          >
                            {couponItem.isActive ? "Active" : "Disabled"}
                          </StandardButton>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. In-Villa Add-ons */}
                {activeSection === "addons" && (
                  <div className="space-y-3">
                    {shouldShowAddAddonForm && (
                      <form
                        onSubmit={handleCreateAddon}
                        className="p-5 rounded-[16px] bg-[var(--color-background-muted)] space-y-4"
                      >
                        <p className="ty-body font-semibold text-[var(--color-text-primary)]">
                          Add in-villa service or dining package
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <input
                            type="text"
                            required
                            placeholder="ชื่อบริการเสริม (เช่น ชุดหมูกระทะพรีเมียม)"
                            value={newAddonNameTh}
                            onChange={(event) =>
                              setNewAddonNameTh(event.target.value)
                            }
                            className={standardFieldClassName}
                          />
                          <input
                            type="number"
                            min={50}
                            step={50}
                            placeholder="Price (฿)"
                            value={newAddonPriceThb}
                            onChange={(event) =>
                              setNewAddonPriceThb(Number(event.target.value))
                            }
                            className={standardFieldClassName}
                          />
                          <input
                            type="text"
                            placeholder="Unit (e.g. ต่อชุด)"
                            value={newAddonUnitTh}
                            onChange={(event) =>
                              setNewAddonUnitTh(event.target.value)
                            }
                            className={standardFieldClassName}
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <StandardButton
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setShouldShowAddAddonForm(false)}
                            className="!bg-[var(--color-background-card)]"
                          >
                            Cancel
                          </StandardButton>
                          <StandardButton
                            type="submit"
                            variant="primary"
                            size="sm"
                          >
                            Save service
                          </StandardButton>
                        </div>
                      </form>
                    )}

                    <div className="space-y-2.5">
                      {addons.map((addonItem) => (
                        <div
                          key={addonItem.id}
                          className="rounded-[16px] bg-[var(--color-background-muted)] p-4 flex items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <img
                              src={
                                addonItem.imageUrl ||
                                "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=400&q=80"
                              }
                              alt={addonItem.nameTh}
                              className="w-12 h-12 rounded-[12px] object-cover bg-[var(--color-background-subtle)] shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="ty-body font-semibold text-[var(--color-text-primary)] truncate">
                                {addonItem.nameTh}
                              </p>
                              <p className="ty-caption mt-0.5">
                                +฿{addonItem.priceThb.toLocaleString()} (
                                {addonItem.unitTh})
                              </p>
                            </div>
                          </div>

                          <StandardButton
                            variant={
                              addonItem.isActive ? "secondary" : "outline"
                            }
                            size="sm"
                            onClick={() =>
                              saveStore((previous) => ({
                                ...previous,
                                addons: previous.addons.map((item) =>
                                  item.id === addonItem.id
                                    ? { ...item, isActive: !item.isActive }
                                    : item
                                ),
                              }))
                            }
                            className="shrink-0 !bg-[var(--color-background-card)]"
                          >
                            {addonItem.isActive ? "Available" : "Hidden"}
                          </StandardButton>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 6. Domain & Website */}
                {activeSection === "domain" && (
                  <div className="space-y-2.5">
                    <div className="rounded-[16px] bg-[var(--color-background-muted)] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <p className="ty-body font-semibold text-[var(--color-text-primary)]">
                          Free Subdomain (Ready instantly)
                        </p>
                        <p className="ty-caption font-mono mt-0.5">
                          https://
                          {propertyConfig.subdomainSlug || "sapanunseen"}
                          .cangaroom.com
                        </p>
                      </div>
                      <StatusPill variant="success">
                        <Check className="w-3.5 h-3.5" />
                        <span>Active</span>
                      </StatusPill>
                    </div>

                    <div className="rounded-[16px] bg-[var(--color-background-muted)] p-4 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <p className="ty-body font-semibold text-[var(--color-text-primary)]">
                            Custom Hotel Domain (.com)
                          </p>
                          <p className="ty-caption mt-0.5">
                            ชื่อเว็บไซต์ของโรงแรมคุณเอง 100% เพื่อติด SEO หน้าแรก
                            Google
                          </p>
                        </div>
                        <StatusPill variant="accent">SSL Protected</StatusPill>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                        <input
                          type="text"
                          value={propertyConfig.customDomain || ""}
                          onChange={(event) =>
                            saveStore((previous) => ({
                              ...previous,
                              propertyConfig: {
                                ...previous.propertyConfig,
                                customDomain: event.target.value,
                              },
                            }))
                          }
                          placeholder="www.yourhotel.com"
                          className={`${standardFieldClassName} flex-1 font-mono`}
                        />
                        <StandardButton
                          type="button"
                          variant="primary"
                          size="md"
                          onClick={() =>
                            showSavedNotification(
                              `บันทึกโดเมน ${
                                propertyConfig.customDomain || ""
                              } เรียบร้อยแล้ว`
                            )
                          }
                          className="shrink-0"
                        >
                          Save Domain
                        </StandardButton>
                      </div>
                    </div>

                    <div className="rounded-[16px] bg-[var(--color-background-muted)] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <p className="ty-body font-semibold text-[var(--color-text-primary)]">
                          บริการจดโดเมน .com พร้อมผูกให้ครบวงจร
                        </p>
                        <p className="ty-caption mt-0.5">
                          ทีมงานจดชื่อ .com + ตั้งค่า Cloudflare SSL ให้พร้อมใช้
                          (+฿1,000 / ปี)
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          showSavedNotification(
                            "ส่งคำขอให้ทีมงานจดโดเมน .com เรียบร้อยแล้ว"
                          )
                        }
                        className="btn-fw-secondary !bg-[var(--color-background-card)] shrink-0 cursor-pointer"
                      >
                        Request (+฿1,000/yr)
                      </button>
                    </div>
                  </div>
                )}

                {/* 7. AI Concierge */}
                {activeSection === "ai" && (
                  <div className="space-y-2.5">
                    <div className="rounded-[16px] bg-[var(--color-background-muted)] p-4 flex items-center justify-between gap-4">
                      <div>
                        <p className="ty-body font-semibold text-[var(--color-text-primary)]">
                          AI Auto-Booking & QR Generator
                        </p>
                        <p className="ty-caption mt-0.5">
                          อนุญาตให้ AI แนะนำห้องว่างและส่ง QR รับเงินแทนเจ้าของ
                          24 ชม.
                        </p>
                      </div>
                      <StandardButton
                        variant={
                          propertyConfig.aiAutoBookingEnabled !== false
                            ? "primary"
                            : "secondary"
                        }
                        size="sm"
                        onClick={() => {
                          const shouldEnableAi = !(
                            propertyConfig.aiAutoBookingEnabled !== false
                          );
                          saveStore((previous) => ({
                            ...previous,
                            propertyConfig: {
                              ...previous.propertyConfig,
                              aiAutoBookingEnabled: shouldEnableAi,
                            },
                          }));
                          showSavedNotification(
                            shouldEnableAi
                              ? "เปิดใช้งาน AI Auto-Booking แล้ว"
                              : "ปิด AI Auto-Booking ชั่วคราว"
                          );
                        }}
                        className={`shrink-0 ${
                          propertyConfig.aiAutoBookingEnabled === false
                            ? "!bg-[var(--color-background-card)]"
                            : ""
                        }`}
                      >
                        {propertyConfig.aiAutoBookingEnabled !== false
                          ? "Active 24/7"
                          : "Paused"}
                      </StandardButton>
                    </div>

                    <div className="rounded-[16px] bg-[var(--color-background-muted)] p-4 space-y-3">
                      <div>
                        <p className="ty-body font-semibold text-[var(--color-text-primary)]">
                          Check-in / Check-out & Breakfast Hours
                        </p>
                        <p className="ty-caption mt-0.5">
                          ข้อมูลเวลาที่ AI ใช้ตอบลูกค้าอัตโนมัติ
                        </p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <input
                          type="text"
                          value={propertyConfig.checkInTime}
                          onChange={(event) =>
                            saveStore((previous) => ({
                              ...previous,
                              propertyConfig: {
                                ...previous.propertyConfig,
                                checkInTime: event.target.value,
                              },
                            }))
                          }
                          placeholder="Check-in (14:00 น.)"
                          className={standardFieldClassName}
                        />
                        <input
                          type="text"
                          value={propertyConfig.checkOutTime}
                          onChange={(event) =>
                            saveStore((previous) => ({
                              ...previous,
                              propertyConfig: {
                                ...previous.propertyConfig,
                                checkOutTime: event.target.value,
                              },
                            }))
                          }
                          placeholder="Check-out (11:00 น.)"
                          className={standardFieldClassName}
                        />
                        <input
                          type="text"
                          value={propertyConfig.breakfastTime}
                          onChange={(event) =>
                            saveStore((previous) => ({
                              ...previous,
                              propertyConfig: {
                                ...previous.propertyConfig,
                                breakfastTime: event.target.value,
                              },
                            }))
                          }
                          placeholder="Breakfast (08:00 - 09:30 น.)"
                          className={standardFieldClassName}
                        />
                      </div>
                    </div>

                    <div className="rounded-[16px] bg-[var(--color-background-muted)] p-4 space-y-3">
                      <p className="ty-body font-semibold text-[var(--color-text-primary)]">
                        Hotel Rules & AI Knowledge Base
                      </p>
                      <textarea
                        rows={4}
                        value={propertyConfig.rulesTh.join("\n")}
                        onChange={(event) =>
                          saveStore((previous) => ({
                            ...previous,
                            propertyConfig: {
                              ...previous.propertyConfig,
                              rulesTh: event.target.value
                                .split("\n")
                                .map((line) => line.trim())
                                .filter(Boolean),
                            },
                          }))
                        }
                        className="w-full rounded-[12px] bg-[var(--color-background-card)] p-3.5 ty-body text-[var(--color-text-primary)] focus:ring-2 focus:ring-[var(--color-accent)]/30 focus:outline-none transition"
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
      </div>
    </section>
  );
}
