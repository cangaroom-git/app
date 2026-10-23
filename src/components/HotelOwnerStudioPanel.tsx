"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  Plus,
  Check,
  ExternalLink,
} from "lucide-react";
import {
  RoomLodge,
  PromoCoupon,
  ExtraAddon,
  BookingRecord,
  WhiteLabelPropertyConfig,
} from "@/data/rooms";
import { SapanStoreData } from "@/lib/store";

interface HotelOwnerStudioPanelProps {
  propertyConfig: WhiteLabelPropertyConfig;
  rooms: RoomLodge[];
  coupons: PromoCoupon[];
  addons: ExtraAddon[];
  bookings?: BookingRecord[];
  pendingAdminCount: number;
  saveStore: (updater: (prev: SapanStoreData) => SapanStoreData) => void;
  onResetStore?: () => void;
  lang?: "th" | "en";
  onChangeLang?: (nextLang: "th" | "en") => void;
}

type SettingsSectionId =
  | "account"
  | "domain"
  | "bookings"
  | "rooms"
  | "ai"
  | "coupons"
  | "addons";

/**
 * Solar-style minimalist icons matching fastwork.com/settings/*
 * Solid black fill when active/header, clean stroke outline when inactive
 */
function SettingsNavIcon({
  id,
  filled,
  className = "w-5 h-5",
}: {
  id: SettingsSectionId;
  filled: boolean;
  className?: string;
}) {
  switch (id) {
    case "account":
      return filled ? (
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
      return filled ? (
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
      return filled ? (
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
      return filled ? (
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
      return filled ? (
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
      return filled ? (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <rect x="4" y="6" width="16" height="13" rx="5" fill="currentColor" />
          <path
            d="M12 2v4"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
          />
          <circle cx="9" cy="12" r="1.5" fill="#ffffff" />
          <circle cx="15" cy="12" r="1.5" fill="#ffffff" />
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
      return filled ? (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <rect x="3" y="4" width="18" height="17" rx="3.5" fill="currentColor" />
          <path
            d="M8 2.5v3M16 2.5v3"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
          />
          <path
            d="M9 13.5l2 2 4.5-4.5"
            stroke="#ffffff"
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

export function HotelOwnerStudioPanel({
  propertyConfig,
  rooms,
  coupons,
  addons,
  bookings = [],
  pendingAdminCount,
  saveStore,
  onResetStore,
  lang = "th",
  onChangeLang,
}: HotelOwnerStudioPanelProps) {
  const [sectionState, setSectionState] = useState<{
    section: SettingsSectionId;
    direction: 1 | -1;
  }>({
    section: "account",
    direction: 1,
  });
  const activeSection = sectionState.section;
  const sectionSlideDirection = sectionState.direction;

  const setActiveSection = (nextSection: SettingsSectionId) => {
    setSectionState((prev) => {
      if (prev.section === nextSection) return prev;
      const sectionOrder: SettingsSectionId[] = [
        "account",
        "domain",
        "bookings",
        "rooms",
        "ai",
        "coupons",
        "addons",
      ];
      const prevIdx = sectionOrder.indexOf(prev.section);
      const nextIdx = sectionOrder.indexOf(nextSection);
      return {
        section: nextSection,
        direction: nextIdx >= prevIdx ? 1 : -1,
      };
    });
  };

  // Modals / Inline Expanders for Quick Create
  const [showAddRoomForm, setShowAddRoomForm] = useState(false);
  const [newRoomCode, setNewRoomCode] = useState("");
  const [newRoomNameTh, setNewRoomNameTh] = useState("");
  const [newRoomPrice, setNewRoomPrice] = useState(3500);
  const [newRoomUnits, setNewRoomUnits] = useState(1);
  const [newRoomDiscount, setNewRoomDiscount] = useState(10);

  const [showAddCouponForm, setShowAddCouponForm] = useState(false);
  const [newCouponCode, setNewCouponCode] = useState("");
  const [newCouponTitle, setNewCouponTitle] = useState("");
  const [newCouponValue, setNewCouponValue] = useState(15);
  const [newCouponType, setNewCouponType] = useState<"PERCENT" | "FIXED">(
    "PERCENT"
  );

  const [showAddAddonForm, setShowAddAddonForm] = useState(false);
  const [newAddonName, setNewAddonName] = useState("");
  const [newAddonPrice, setNewAddonPrice] = useState(690);
  const [newAddonUnit, setNewAddonUnit] = useState("ต่อชุด");

  const [editingBrand, setEditingBrand] = useState(false);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const triggerSavedNotice = (msg: string) => {
    setSavedNotice(msg);
    setTimeout(() => setSavedNotice(null), 2500);
  };

  const handleQuickAddRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomNameTh.trim()) return;
    const code = (newRoomCode.trim() || `R${rooms.length + 1}`).toUpperCase();
    const newRoom: RoomLodge = {
      id: `room-${Date.now()}`,
      slug: `room-${code.toLowerCase()}-${Date.now()}`,
      code,
      nameTh: newRoomNameTh.trim(),
      nameEn: newRoomNameTh.trim(),
      categoryTh: Number(newRoomUnits) > 1 ? "ประเภทห้องพัก" : "บ้านพักส่วนตัว",
      categoryEn: Number(newRoomUnits) > 1 ? "Room Type" : "Private Villa",
      roomCategory: Number(newRoomUnits) > 1 ? "SUITE" : "VILLA",
      shortDescTh: "ห้องพักพร้อมระเบียงชมวิวและสิ่งอำนวยความสะดวกครบครัน รวมอาหารเช้า",
      shortDescEn: "Modern room with private balcony and full amenities including breakfast",
      longDescTh: [
        "ห้องพักดีไซน์โมเดิร์นพร้อมวิวธรรมชาติและสิ่งอำนวยความสะดวกครบครัน เหมาะสำหรับการพักผ่อนอย่างแท้จริง",
      ],
      longDescEn: [
        "Modern accommodation with scenic view and full amenities, ideal for relaxation.",
      ],
      basePriceThb: Number(newRoomPrice) || 3500,
      weekendPriceThb: Number(newRoomPrice) || 3500,
      discountPercent: Number(newRoomDiscount) || 0,
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
      totalUnits: Math.max(1, Number(newRoomUnits) || 1),
      inventoryMode: Number(newRoomUnits) > 1 ? "ROOM_TYPE" : "SINGLE_UNIT",
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

    saveStore((prev) => ({
      ...prev,
      rooms: [...prev.rooms, newRoom],
    }));

    setNewRoomCode("");
    setNewRoomNameTh("");
    setShowAddRoomForm(false);
    triggerSavedNotice(`เพิ่มห้องพัก "${newRoom.nameTh}" เรียบร้อยแล้ว`);
  };

  const handleQuickAddCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCouponCode.trim() || !newCouponTitle.trim()) return;
    const code = newCouponCode.trim().toUpperCase();
    const newCoupon: PromoCoupon = {
      id: `coupon-${Date.now()}`,
      code,
      titleTh: newCouponTitle.trim(),
      descTh: "คูปองส่วนลดพิเศษสำหรับการจองตรงผ่านหน้าเว็บไซต์",
      badgeTh:
        newCouponType === "PERCENT"
          ? `SAVE ${newCouponValue}%`
          : `SAVE ฿${newCouponValue}`,
      imageUrl:
        "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=900&q=80",
      discountType: newCouponType,
      discountValue: Number(newCouponValue) || 10,
      minSpendThb: 2000,
      isActive: true,
    };

    saveStore((prev) => ({
      ...prev,
      coupons: [newCoupon, ...prev.coupons],
    }));

    setNewCouponCode("");
    setNewCouponTitle("");
    setShowAddCouponForm(false);
    triggerSavedNotice(`สร้างคูปอง ${code} เรียบร้อยแล้ว`);
  };

  const handleQuickAddAddon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddonName.trim()) return;
    const newAddon: ExtraAddon = {
      id: `addon-${Date.now()}`,
      nameTh: newAddonName.trim(),
      nameEn: newAddonName.trim(),
      descTh: "บริการเสริมพิเศษจัดเตรียมให้พร้อมในวันเข้าพัก",
      descEn: "Curated in-villa add-on service",
      priceThb: Number(newAddonPrice) || 500,
      unitTh: newAddonUnit.trim() || "ต่อชุด",
      unitEn: "per set",
      category: "DINING",
      imageUrl:
        "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80",
      isActive: true,
    };

    saveStore((prev) => ({
      ...prev,
      addons: [newAddon, ...prev.addons],
    }));

    setNewAddonName("");
    setShowAddAddonForm(false);
    triggerSavedNotice(`เพิ่มบริการเสริม "${newAddon.nameTh}" เรียบร้อยแล้ว`);
  };

  const navItems: {
    id: SettingsSectionId;
    label: string;
    count?: number;
  }[] = [
    { id: "account", label: "Account & PromptPay" },
    { id: "domain", label: "Domain & Website" },
    { id: "bookings", label: "Bookings & QR Slips", count: bookings.length },
    { id: "rooms", label: "Rooms & Rates", count: rooms.length },
    { id: "ai", label: "AI Concierge" },
    { id: "coupons", label: "Coupons & Deals", count: coupons.length },
    { id: "addons", label: "In-Villa Add-ons", count: addons.length },
  ];

  const currentNavMeta =
    navItems.find((i) => i.id === activeSection) || navItems[0];

  return (
    <section className="p-2 sm:p-3.5 bg-[#f1f1f1]">
      {/* =====================================================================
          FASTWORK.COM APP SHELL CONTAINER (.shell-main)
          Exact match to Screenshots 1, 2, and 3:
          - Rounded white surface card inside #f1f1f1 outer shell
          - 2-Column split layout separated by 1px #ebebeb divider
      ====================================================================== */}
      <div className="max-w-7xl mx-auto rounded-[20px] bg-white border border-[#ebebeb] min-h-[76vh] grid grid-cols-1 md:grid-cols-12 overflow-hidden">
        {/* ===================================================================
            LEFT SIDEBAR: Settings Navigation (Matches fastwork.com/settings/*)
        ==================================================================== */}
        <aside className="md:col-span-4 lg:col-span-3 border-b md:border-b-0 md:border-r border-[#ebebeb] p-4 sm:p-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h1 className="text-[22px] font-semibold text-[#171717] tracking-tight">
                Admin Settings
              </h1>
              <Link
                href="/"
                className="inline-flex items-center gap-1 rounded-full bg-[#f1f1f1] hover:bg-[#e5e5e5] px-3 py-1 text-xs font-semibold text-[#171717] transition"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>App</span>
              </Link>
            </div>

            <nav className="flex md:flex-col gap-1 overflow-x-auto no-scrollbar">
              {navItems.map((item) => {
                const isSelected = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveSection(item.id)}
                    className={`relative w-full min-w-max md:min-w-0 h-11 px-3.5 rounded-[12px] flex items-center justify-between gap-2.5 text-[15px] transition-colors cursor-pointer ${
                      isSelected
                        ? "text-[#171717] font-semibold"
                        : "text-[#171717] hover:bg-[#00000008] font-normal"
                    }`}
                  >
                    {isSelected && (
                      <motion.span
                        layoutId="hotel-owner-settings-nav-pill"
                        className="absolute inset-0 rounded-[12px] bg-[#0000000f]"
                        transition={{
                          type: "spring",
                          stiffness: 420,
                          damping: 34,
                          mass: 0.8,
                        }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-3">
                      <SettingsNavIcon
                        id={item.id}
                        filled={isSelected}
                        className="w-5 h-5 shrink-0 text-[#171717]"
                      />
                      <span>{item.label}</span>
                    </span>
                    {typeof item.count === "number" && (
                      <span className="relative z-10 text-xs text-[#737373] font-medium">
                        {item.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Bottom Back to Storefront Link inside Left Rail */}
          <div className="hidden md:block pt-6 border-t border-[#ebebeb] mt-6 px-2">
            <div className="flex items-center justify-between text-[13px] text-[#737373]">
              <span>Storefront</span>
              <Link
                href="/"
                className="font-semibold text-[#171717] hover:underline inline-flex items-center gap-1"
              >
                <span>Back to App</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </aside>

        {/* ===================================================================
            RIGHT PANEL: Content Area with .fw-head-icon + .fw-setting-row
        ==================================================================== */}
        <div className="md:col-span-8 lg:col-span-9 flex flex-col">
          {/* Top Panel Header (Exact match to [icon] Account / Language / Privacy Policy) */}
          <div className="px-6 sm:px-8 py-5 border-b border-[#ebebeb] flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="fw-head-icon">
                <SettingsNavIcon
                  id={activeSection}
                  filled={true}
                  className="w-5 h-5 text-[#171717]"
                />
              </div>
              <div>
                <h2 className="text-[20px] sm:text-[22px] font-semibold text-[#171717] leading-tight">
                  {currentNavMeta.label}
                </h2>
                {savedNotice && (
                  <p className="text-xs font-medium text-[#007004] mt-0.5">
                    ✓ {savedNotice}
                  </p>
                )}
              </div>
            </div>

            {activeSection === "rooms" && (
              <button
                type="button"
                onClick={() => setShowAddRoomForm((v) => !v)}
                className="btn-fw-secondary"
              >
                <Plus className="w-4 h-4" />
                <span>{showAddRoomForm ? "Close" : "Add room"}</span>
              </button>
            )}

            {activeSection === "coupons" && (
              <button
                type="button"
                onClick={() => setShowAddCouponForm((v) => !v)}
                className="btn-fw-secondary"
              >
                <Plus className="w-4 h-4" />
                <span>{showAddCouponForm ? "Close" : "Create coupon"}</span>
              </button>
            )}

            {activeSection === "addons" && (
              <button
                type="button"
                onClick={() => setShowAddAddonForm((v) => !v)}
                className="btn-fw-secondary"
              >
                <Plus className="w-4 h-4" />
                <span>{showAddAddonForm ? "Close" : "Add service"}</span>
              </button>
            )}
          </div>

          {/* Panel Body */}
          <div className="px-6 sm:px-8 py-2 flex-1 relative overflow-x-clip">
            <AnimatePresence initial={false} custom={sectionSlideDirection} mode="wait">
              <motion.div
                key={activeSection}
                custom={sectionSlideDirection}
                variants={{
                  enter: (dir: number) => ({
                    x: dir > 0 ? 48 : -48,
                    opacity: 0,
                  }),
                  center: {
                    x: 0,
                    opacity: 1,
                    transitionEnd: { transform: "none" },
                  },
                  exit: (dir: number) => ({
                    x: dir > 0 ? -48 : 48,
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
            {/* ===============================================================
                1. ACCOUNT & HOTEL BRAND (Matches Screenshot 1: fastwork.com/settings/account)
            ================================================================ */}
            {activeSection === "account" && (
              <div className="divide-y divide-[#ebebeb]">
                {/* Row 1: Hotel Name & Brand Identity */}
                <div className="py-5 space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[15px] font-semibold text-[#171717]">
                        Hotel profile & branding
                      </p>
                      <p className="text-[13px] text-[#737373] mt-0.5">
                        {propertyConfig.nameTh} ({propertyConfig.nameEn}) · Code:{" "}
                        {propertyConfig.brandCode}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingBrand((v) => !v)}
                      className="btn-fw-secondary shrink-0"
                    >
                      {editingBrand ? "Done" : "Edit"}
                    </button>
                  </div>

                  {editingBrand && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-[#ebebeb]">
                      <div>
                        <label className="text-xs font-semibold text-[#737373] block mb-1.5">
                          ชื่อโรงแรม (ภาษาไทย)
                        </label>
                        <input
                          type="text"
                          value={propertyConfig.nameTh}
                          onChange={(e) =>
                            saveStore((prev) => ({
                              ...prev,
                              propertyConfig: {
                                ...prev.propertyConfig,
                                nameTh: e.target.value,
                              },
                            }))
                          }
                          className="h-10 w-full rounded-[12px] border border-[#d4d4d4] px-3.5 text-sm text-[#171717] focus:border-[#262626] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-[#737373] block mb-1.5">
                          Hotel Name (English)
                        </label>
                        <input
                          type="text"
                          value={propertyConfig.nameEn}
                          onChange={(e) =>
                            saveStore((prev) => ({
                              ...prev,
                              propertyConfig: {
                                ...prev.propertyConfig,
                                nameEn: e.target.value,
                              },
                            }))
                          }
                          className="h-10 w-full rounded-[12px] border border-[#d4d4d4] px-3.5 text-sm text-[#171717] focus:border-[#262626] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-[#737373] block mb-1.5">
                          PromptPay ID (เบอร์โทร / เลขนิติบุคคล)
                        </label>
                        <input
                          type="text"
                          value={propertyConfig.promptPayId}
                          onChange={(e) =>
                            saveStore((prev) => ({
                              ...prev,
                              propertyConfig: {
                                ...prev.propertyConfig,
                                promptPayId: e.target.value,
                              },
                            }))
                          }
                          className="h-10 w-full rounded-[12px] border border-[#d4d4d4] px-3.5 text-sm font-mono text-[#171717] focus:border-[#262626] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-[#737373] block mb-1.5">
                          ชื่อบัญชีรับโอน (Account Name)
                        </label>
                        <input
                          type="text"
                          value={propertyConfig.promptPayAccountName}
                          onChange={(e) =>
                            saveStore((prev) => ({
                              ...prev,
                              propertyConfig: {
                                ...prev.propertyConfig,
                                promptPayAccountName: e.target.value,
                              },
                            }))
                          }
                          className="h-10 w-full rounded-[12px] border border-[#d4d4d4] px-3.5 text-sm text-[#171717] focus:border-[#262626] focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Row 2: PromptPay QR Payment Receiver */}
                <div className="fw-setting-row">
                  <div>
                    <p className="text-[15px] font-semibold text-[#171717]">
                      PromptPay QR settlement
                    </p>
                    <p className="text-[13px] text-[#737373] mt-0.5">
                      {propertyConfig.promptPayAccountName} ·{" "}
                      {propertyConfig.promptPayId}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingBrand(true)}
                    className="btn-fw-secondary shrink-0"
                  >
                    Configure
                  </button>
                </div>

                {/* Row 2B: Auto-Confirm Slip Verification Toggle */}
                <div className="fw-setting-row">
                  <div>
                    <p className="text-[15px] font-semibold text-[#171717]">
                      Auto-confirm QR slip
                    </p>
                    <p className="text-[13px] text-[#737373] mt-0.5">
                      {propertyConfig.autoConfirmSlip !== false
                        ? "ยืนยันการจอง (CONFIRMED) ทันทีที่สแกน QR สลิปผ่าน"
                        : "รอแอดมินกด Approve เองในหน้า Bookings"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const nextVal = !(
                        propertyConfig.autoConfirmSlip !== false
                      );
                      saveStore((prev) => ({
                        ...prev,
                        propertyConfig: {
                          ...prev.propertyConfig,
                          autoConfirmSlip: nextVal,
                        },
                      }));
                      triggerSavedNotice(
                        nextVal
                          ? "เปิดระบบยืนยันสลิปอัตโนมัติแล้ว"
                          : "เปลี่ยนเป็นโหมดแอดมินกดยืนยันเอง"
                      );
                    }}
                    className={
                      propertyConfig.autoConfirmSlip !== false
                        ? "btn-round-solid !py-1.5 !px-4 !text-xs shrink-0"
                        : "btn-fw-secondary shrink-0"
                    }
                  >
                    {propertyConfig.autoConfirmSlip !== false
                      ? "Auto-Confirm ON"
                      : "Manual Mode"}
                  </button>
                </div>

                {/* Row 3: Help center (Exact match to Screenshot 1) */}
                <div className="fw-setting-row">
                  <div>
                    <p className="text-[15px] font-semibold text-[#171717]">
                      Help center
                    </p>
                    <p className="text-[13px] text-[#737373] mt-0.5">
                      Direct reservation support · Tel:{" "}
                      {propertyConfig.phones[0]} · LINE: {propertyConfig.lineId}
                    </p>
                  </div>
                  <a
                    href={`tel:${propertyConfig.phones[0]}`}
                    className="btn-fw-secondary shrink-0"
                  >
                    Contact
                  </a>
                </div>

                {/* Row 4: Reservations & QR Slip Verification */}
                <div className="fw-setting-row">
                  <div>
                    <p className="text-[15px] font-semibold text-[#171717]">
                      Reservations & QR slip verification
                    </p>
                    <p className="text-[13px] text-[#737373] mt-0.5">
                      Manage guest bookings and verify uploaded bank slips (
                      {pendingAdminCount} pending)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveSection("bookings")}
                    className="btn-fw-secondary shrink-0"
                  >
                    Manage ({bookings.length})
                  </button>
                </div>

                {onResetStore && (
                  <div className="fw-setting-row">
                    <div>
                      <p className="text-[15px] font-semibold text-[#171717]">
                        Reset demo data
                      </p>
                      <p className="text-[13px] text-[#737373] mt-0.5">
                        Restore rooms, coupons, and sample reservations to
                        initial defaults
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onResetStore();
                        triggerSavedNotice("รีเซ็ตข้อมูลตัวอย่างเรียบร้อยแล้ว");
                      }}
                      className="btn-round-border shrink-0 !text-xs"
                    >
                      Reset data
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ===============================================================
                1B. BOOKINGS & SLIPS (Clean Fastwork Divided List Rows)
            ================================================================ */}
            {activeSection === "bookings" && (
              <div className="divide-y divide-[#ebebeb]">
                {bookings.length === 0 ? (
                  <div className="py-12 text-center text-sm text-[#737373]">
                    ยังไม่มีรายการจองในระบบ
                  </div>
                ) : (
                  bookings.map((bk) => (
                    <div
                      key={bk.id}
                      className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#f1f1f1] text-[#171717]">
                            {bk.bookingCode}
                          </span>
                          <span className="text-[15px] font-semibold text-[#171717]">
                            {bk.guestName} ({bk.guestPhone})
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                              bk.status === "CONFIRMED"
                                ? "bg-[#c5e5c0] text-[#007004]"
                                : bk.status === "PENDING_ADMIN"
                                ? "bg-[#f8da9d] text-[#745b00]"
                                : bk.status === "HOLD_15_MIN"
                                ? "bg-[#f1f1f1] text-[#171717]"
                                : "bg-[#facecb] text-[#a50c25]"
                            }`}
                          >
                            {bk.status === "CONFIRMED"
                              ? "ยืนยันแล้ว"
                              : bk.status === "PENDING_ADMIN"
                              ? "รอตรวจสลิป"
                              : bk.status === "HOLD_15_MIN"
                              ? "ล็อคห้อง 15 นาที"
                              : "ยกเลิก"}
                          </span>
                        </div>
                        <p className="text-[13px] text-[#737373]">
                          {bk.roomNameTh} ({bk.roomCode}) · {bk.checkIn} ถึง{" "}
                          {bk.checkOut} ({bk.nights} คืน) · ยอดสุทธิ{" "}
                          <strong className="text-[#171717]">
                            ฿{bk.totalPriceThb.toLocaleString()}
                          </strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {bk.status !== "CONFIRMED" && (
                          <button
                            type="button"
                            onClick={() => {
                              saveStore((prev) => ({
                                ...prev,
                                bookings: prev.bookings.map((item) =>
                                  item.id === bk.id
                                    ? { ...item, status: "CONFIRMED" }
                                    : item
                                ),
                              }));
                              triggerSavedNotice(
                                `อนุมัติการจอง ${bk.bookingCode} เรียบร้อยแล้ว`
                              );
                            }}
                            className="btn-round-solid !py-1.5 !px-3.5 !text-xs"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>
                        )}
                        {bk.status !== "CANCELLED" && (
                          <button
                            type="button"
                            onClick={() => {
                              saveStore((prev) => ({
                                ...prev,
                                bookings: prev.bookings.map((item) =>
                                  item.id === bk.id
                                    ? { ...item, status: "CANCELLED" }
                                    : item
                                ),
                              }));
                              triggerSavedNotice(
                                `ยกเลิกการจอง ${bk.bookingCode} เรียบร้อยแล้ว`
                              );
                            }}
                            className="btn-round-border !py-1.5 !px-3.5 !text-xs !text-[#a50c25]"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ===============================================================
                2. ROOMS & RATES (Clean Fastwork Divided List Rows)
            ================================================================ */}
            {activeSection === "rooms" && (
              <div>
                {showAddRoomForm && (
                  <form
                    onSubmit={handleQuickAddRoom}
                    className="my-4 p-5 rounded-[16px] bg-[#f1f1f1] space-y-4"
                  >
                    <p className="text-sm font-semibold text-[#171717]">
                      Create new room or villa
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <input
                        type="text"
                        placeholder="Room Code (e.g. V5)"
                        value={newRoomCode}
                        onChange={(e) => setNewRoomCode(e.target.value)}
                        className="h-10 rounded-[12px] border border-[#d4d4d4] bg-white px-3.5 text-sm text-[#171717] focus:border-[#262626] focus:outline-none"
                      />
                      <input
                        type="text"
                        required
                        placeholder="ชื่อห้องพัก (เช่น Horizon Villa)"
                        value={newRoomNameTh}
                        onChange={(e) => setNewRoomNameTh(e.target.value)}
                        className="h-10 rounded-[12px] border border-[#d4d4d4] bg-white px-3.5 text-sm text-[#171717] focus:border-[#262626] focus:outline-none sm:col-span-2"
                      />
                      <input
                        type="number"
                        min={500}
                        step={100}
                        placeholder="Price / Night (฿)"
                        value={newRoomPrice}
                        onChange={(e) =>
                          setNewRoomPrice(Number(e.target.value))
                        }
                        className="h-10 rounded-[12px] border border-[#d4d4d4] bg-white px-3.5 text-sm text-[#171717] focus:border-[#262626] focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowAddRoomForm(false)}
                        className="btn-round-border !py-1.5 !text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn-round-solid !py-1.5 !text-xs"
                      >
                        Save room
                      </button>
                    </div>
                  </form>
                )}

                <div className="divide-y divide-[#ebebeb]">
                  {rooms.map((rm) => (
                    <div
                      key={rm.id}
                      className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <img
                          src={rm.images[0]?.url}
                          alt={rm.nameTh}
                          className="w-14 h-14 rounded-[12px] object-cover bg-[#f1f1f1] shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[15px] font-semibold text-[#171717] truncate">
                              {rm.nameTh}
                            </span>
                            <span className="rounded-full bg-[#f1f1f1] px-2 py-0.5 text-[11px] font-medium text-[#737373]">
                              {rm.code}
                            </span>
                          </div>
                          <p className="text-[13px] text-[#737373] mt-0.5">
                            {rm.sizeSqm} sq.m. · Max {rm.maxGuests} guests ·{" "}
                            {rm.totalUnits ?? 1} unit{(rm.totalUnits ?? 1) > 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-[#737373]">฿</span>
                          <input
                            type="number"
                            min={500}
                            step={100}
                            value={rm.basePriceThb}
                            onChange={(e) => {
                              const val = Number(e.target.value) || 1000;
                              saveStore((prev) => ({
                                ...prev,
                                rooms: prev.rooms.map((item) =>
                                  item.id === rm.id
                                    ? { ...item, basePriceThb: val, weekendPriceThb: val }
                                    : item
                                ),
                              }));
                            }}
                            className="h-9 w-24 rounded-full border border-[#d4d4d4] bg-white px-3 text-sm font-semibold text-[#171717] text-right focus:border-[#262626] focus:outline-none"
                          />
                        </div>

                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={0}
                            max={80}
                            value={rm.discountPercent}
                            onChange={(e) => {
                              const val = Math.min(
                                80,
                                Math.max(0, Number(e.target.value) || 0)
                              );
                              saveStore((prev) => ({
                                ...prev,
                                rooms: prev.rooms.map((item) =>
                                  item.id === rm.id
                                    ? { ...item, discountPercent: val }
                                    : item
                                ),
                              }));
                            }}
                            className="h-9 w-16 rounded-full border border-[#d4d4d4] bg-white px-2.5 text-sm font-semibold text-[#171717] text-center focus:border-[#262626] focus:outline-none"
                          />
                          <span className="text-xs text-[#737373]">% off</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ===============================================================
                3. COUPONS & DEALS (Clean Fastwork Divided List Rows)
            ================================================================ */}
            {activeSection === "coupons" && (
              <div>
                {showAddCouponForm && (
                  <form
                    onSubmit={handleQuickAddCoupon}
                    className="my-4 p-5 rounded-[16px] bg-[#f1f1f1] space-y-4"
                  >
                    <p className="text-sm font-semibold text-[#171717]">
                      Create promo coupon
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <input
                        type="text"
                        required
                        placeholder="CODE (e.g. SUMMER20)"
                        value={newCouponCode}
                        onChange={(e) =>
                          setNewCouponCode(e.target.value.toUpperCase())
                        }
                        className="h-10 rounded-[12px] border border-[#d4d4d4] bg-white px-3.5 text-sm font-mono uppercase text-[#171717] focus:border-[#262626] focus:outline-none"
                      />
                      <input
                        type="text"
                        required
                        placeholder="ชื่อแคมเปญส่วนลด"
                        value={newCouponTitle}
                        onChange={(e) => setNewCouponTitle(e.target.value)}
                        className="h-10 rounded-[12px] border border-[#d4d4d4] bg-white px-3.5 text-sm text-[#171717] focus:border-[#262626] focus:outline-none sm:col-span-2"
                      />
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min={1}
                          value={newCouponValue}
                          onChange={(e) =>
                            setNewCouponValue(Number(e.target.value))
                          }
                          className="h-10 w-full rounded-[12px] border border-[#d4d4d4] bg-white px-3 text-sm text-[#171717] focus:border-[#262626] focus:outline-none"
                        />
                        <select
                          value={newCouponType}
                          onChange={(e) =>
                            setNewCouponType(
                              e.target.value as "PERCENT" | "FIXED"
                            )
                          }
                          className="h-10 rounded-[12px] border border-[#d4d4d4] bg-white px-2.5 text-xs font-semibold text-[#171717]"
                        >
                          <option value="PERCENT">%</option>
                          <option value="FIXED">฿</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowAddCouponForm(false)}
                        className="btn-round-border !py-1.5 !text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn-round-solid !py-1.5 !text-xs"
                      >
                        Save coupon
                      </button>
                    </div>
                  </form>
                )}

                <div className="divide-y divide-[#ebebeb]">
                  {coupons.map((cp) => (
                    <div key={cp.id} className="fw-setting-row">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[15px] font-semibold text-[#171717]">
                            {cp.titleTh}
                          </span>
                          <span className="rounded-full bg-[#f1f1f1] px-2.5 py-0.5 font-mono text-xs font-semibold text-[#171717]">
                            {cp.code}
                          </span>
                        </div>
                        <p className="text-[13px] text-[#737373] mt-0.5">
                          Discount:{" "}
                          {cp.discountType === "PERCENT"
                            ? `${cp.discountValue}%`
                            : `฿${cp.discountValue.toLocaleString()}`}{" "}
                          · Min. spend ฿{cp.minSpendThb.toLocaleString()}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          saveStore((prev) => ({
                            ...prev,
                            coupons: prev.coupons.map((c) =>
                              c.id === cp.id
                                ? { ...c, isActive: !c.isActive }
                                : c
                            ),
                          }))
                        }
                        className={
                          cp.isActive
                            ? "btn-fw-secondary"
                            : "btn-round-border !text-[#737373]"
                        }
                      >
                        {cp.isActive ? "Active" : "Disabled"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ===============================================================
                4. IN-VILLA ADD-ONS (Clean Fastwork Divided List Rows)
            ================================================================ */}
            {activeSection === "addons" && (
              <div>
                {showAddAddonForm && (
                  <form
                    onSubmit={handleQuickAddAddon}
                    className="my-4 p-5 rounded-[16px] bg-[#f1f1f1] space-y-4"
                  >
                    <p className="text-sm font-semibold text-[#171717]">
                      Add in-villa service or dining package
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input
                        type="text"
                        required
                        placeholder="ชื่อบริการเสริม (เช่น ชุดหมูกระทะพรีเมียม)"
                        value={newAddonName}
                        onChange={(e) => setNewAddonName(e.target.value)}
                        className="h-10 rounded-[12px] border border-[#d4d4d4] bg-white px-3.5 text-sm text-[#171717] focus:border-[#262626] focus:outline-none"
                      />
                      <input
                        type="number"
                        min={50}
                        step={50}
                        placeholder="Price (฿)"
                        value={newAddonPrice}
                        onChange={(e) =>
                          setNewAddonPrice(Number(e.target.value))
                        }
                        className="h-10 rounded-[12px] border border-[#d4d4d4] bg-white px-3.5 text-sm text-[#171717] focus:border-[#262626] focus:outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Unit (e.g. ต่อชุด)"
                        value={newAddonUnit}
                        onChange={(e) => setNewAddonUnit(e.target.value)}
                        className="h-10 rounded-[12px] border border-[#d4d4d4] bg-white px-3.5 text-sm text-[#171717] focus:border-[#262626] focus:outline-none"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowAddAddonForm(false)}
                        className="btn-round-border !py-1.5 !text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn-round-solid !py-1.5 !text-xs"
                      >
                        Save service
                      </button>
                    </div>
                  </form>
                )}

                <div className="divide-y divide-[#ebebeb]">
                  {addons.map((item) => (
                    <div key={item.id} className="fw-setting-row">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <img
                          src={
                            item.imageUrl ||
                            "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=400&q=80"
                          }
                          alt={item.nameTh}
                          className="w-12 h-12 rounded-[10px] object-cover bg-[#f1f1f1] shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-[15px] font-semibold text-[#171717] truncate">
                            {item.nameTh}
                          </p>
                          <p className="text-[13px] text-[#737373] mt-0.5">
                            +฿{item.priceThb.toLocaleString()} ({item.unitTh})
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          saveStore((prev) => ({
                            ...prev,
                            addons: prev.addons.map((a) =>
                              a.id === item.id
                                ? { ...a, isActive: !a.isActive }
                                : a
                            ),
                          }))
                        }
                        className={
                          item.isActive
                            ? "btn-fw-secondary shrink-0"
                            : "btn-round-border !text-[#737373] shrink-0"
                        }
                      >
                        {item.isActive ? "Available" : "Hidden"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ===============================================================
                5. DOMAIN & WEBSITE (Hybrid Subdomain + Custom .com Domain)
            ================================================================ */}
            {activeSection === "domain" && (
              <div className="divide-y divide-[#ebebeb]">
                <div className="py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-[15px] font-semibold text-[#171717]">
                      Free Subdomain (Ready instantly)
                    </p>
                    <p className="text-[13px] font-mono text-[#737373] mt-0.5">
                      https://{propertyConfig.subdomainSlug || "sapanunseen"}.myhotel.app
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#dcfce7] text-[#007004] px-3 py-1 text-xs font-semibold shrink-0">
                    <Check className="w-3.5 h-3.5" />
                    <span>Active</span>
                  </span>
                </div>

                <div className="py-5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-[15px] font-semibold text-[#171717]">
                        Custom Hotel Domain (.com)
                      </p>
                      <p className="text-[13px] text-[#737373] mt-0.5">
                        ชื่อเว็บไซต์ของโรงแรมคุณเอง 100% เพื่อติด SEO หน้าแรก Google
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f1f1f1] text-[#171717] px-3 py-1 text-xs font-semibold shrink-0">
                      SSL Protected
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                    <input
                      type="text"
                      value={propertyConfig.customDomain || ""}
                      onChange={(e) =>
                        saveStore((prev) => ({
                          ...prev,
                          propertyConfig: {
                            ...prev.propertyConfig,
                            customDomain: e.target.value,
                          },
                        }))
                      }
                      placeholder="www.yourhotel.com"
                      className="h-10 flex-1 rounded-[12px] border border-[#d4d4d4] bg-white px-3.5 text-sm font-mono text-[#171717] focus:border-[#262626] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        triggerSavedNotice(
                          `บันทึกโดเมน ${propertyConfig.customDomain || ""} เรียบร้อยแล้ว`
                        )
                      }
                      className="btn-round-solid !py-2 !px-4 !text-xs shrink-0"
                    >
                      Save Domain
                    </button>
                  </div>
                </div>

                <div className="fw-setting-row">
                  <div>
                    <p className="text-[15px] font-semibold text-[#171717]">
                      บริการจดโดเมน .com พร้อมผูกให้ครบวงจร
                    </p>
                    <p className="text-[13px] text-[#737373] mt-0.5">
                      ทีมงานจดชื่อ .com + ตั้งค่า Cloudflare SSL ให้พร้อมใช้ (+฿1,000 / ปี)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      triggerSavedNotice("ส่งคำขอให้ทีมงานจดโดเมน .com เรียบร้อยแล้ว")
                    }
                    className="btn-fw-secondary shrink-0"
                  >
                    Request (+฿1,000/yr)
                  </button>
                </div>
              </div>
            )}

            {/* ===============================================================
                6. AI CONCIERGE & AUTO-BOOKING
            ================================================================ */}
            {activeSection === "ai" && (
              <div className="divide-y divide-[#ebebeb]">
                <div className="fw-setting-row">
                  <div>
                    <p className="text-[15px] font-semibold text-[#171717]">
                      AI Auto-Booking & QR Generator
                    </p>
                    <p className="text-[13px] text-[#737373] mt-0.5">
                      อนุญาตให้ AI แนะนำห้องว่างและส่ง QR รับเงินแทนเจ้าของ 24 ชม.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const nextVal = !(
                        propertyConfig.aiAutoBookingEnabled !== false
                      );
                      saveStore((prev) => ({
                        ...prev,
                        propertyConfig: {
                          ...prev.propertyConfig,
                          aiAutoBookingEnabled: nextVal,
                        },
                      }));
                      triggerSavedNotice(
                        nextVal
                          ? "เปิดใช้งาน AI Auto-Booking แล้ว"
                          : "ปิด AI Auto-Booking ชั่วคราว"
                      );
                    }}
                    className={
                      propertyConfig.aiAutoBookingEnabled !== false
                        ? "btn-round-solid !py-1.5 !px-4 !text-xs shrink-0"
                        : "btn-fw-secondary shrink-0"
                    }
                  >
                    {propertyConfig.aiAutoBookingEnabled !== false
                      ? "Active 24/7"
                      : "Paused"}
                  </button>
                </div>

                <div className="py-5 space-y-3">
                  <div>
                    <p className="text-[15px] font-semibold text-[#171717]">
                      Check-in / Check-out & Breakfast Hours
                    </p>
                    <p className="text-[13px] text-[#737373] mt-0.5">
                      ข้อมูลเวลาที่ AI ใช้ตอบลูกค้าอัตโนมัติ
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input
                      type="text"
                      value={propertyConfig.checkInTime}
                      onChange={(e) =>
                        saveStore((prev) => ({
                          ...prev,
                          propertyConfig: {
                            ...prev.propertyConfig,
                            checkInTime: e.target.value,
                          },
                        }))
                      }
                      placeholder="Check-in (14:00 น.)"
                      className="h-10 rounded-[12px] border border-[#d4d4d4] bg-white px-3.5 text-sm text-[#171717] focus:border-[#262626] focus:outline-none"
                    />
                    <input
                      type="text"
                      value={propertyConfig.checkOutTime}
                      onChange={(e) =>
                        saveStore((prev) => ({
                          ...prev,
                          propertyConfig: {
                            ...prev.propertyConfig,
                            checkOutTime: e.target.value,
                          },
                        }))
                      }
                      placeholder="Check-out (11:00 น.)"
                      className="h-10 rounded-[12px] border border-[#d4d4d4] bg-white px-3.5 text-sm text-[#171717] focus:border-[#262626] focus:outline-none"
                    />
                    <input
                      type="text"
                      value={propertyConfig.breakfastTime}
                      onChange={(e) =>
                        saveStore((prev) => ({
                          ...prev,
                          propertyConfig: {
                            ...prev.propertyConfig,
                            breakfastTime: e.target.value,
                          },
                        }))
                      }
                      placeholder="Breakfast (08:00 - 09:30 น.)"
                      className="h-10 rounded-[12px] border border-[#d4d4d4] bg-white px-3.5 text-sm text-[#171717] focus:border-[#262626] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="py-5 space-y-3">
                  <p className="text-[15px] font-semibold text-[#171717]">
                    Hotel Rules & AI Knowledge Base
                  </p>
                  <textarea
                    rows={4}
                    value={propertyConfig.rulesTh.join("\n")}
                    onChange={(e) =>
                      saveStore((prev) => ({
                        ...prev,
                        propertyConfig: {
                          ...prev.propertyConfig,
                          rulesTh: e.target.value
                            .split("\n")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        },
                      }))
                    }
                    className="w-full rounded-[12px] border border-[#d4d4d4] bg-white p-3.5 text-sm text-[#171717] focus:border-[#262626] focus:outline-none"
                  />
                </div>
              </div>
            )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
