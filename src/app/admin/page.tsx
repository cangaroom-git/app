"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  Trash2,
  Home,
  Tag,
  Calendar,
  QrCode,
  RotateCcw,
  BedDouble,
  DollarSign,
  TrendingUp,
  Search,
  Eye,
  ExternalLink,
  Check,
  X,
  Building2,
  ClipboardList,
  Sparkles,
  CloudSun,
  Sliders,
  Layers,
  CalendarRange,
  Globe,
} from "lucide-react";
import {
  useSapanStore,
  formatDateStr,
  addDaysToDate,
  calculateNightlyRateForDate,
  getRoomInventoryForRange,
} from "@/lib/store";
import {
  RoomLodge,
  BookingRecord,
  BookingRecordStatus,
  SeasonalRateRule,
  SpecialDateRateOverride,
  WEATHER_LOCATION_PRESETS,
  RoomCategoryType,
  RoomInventoryMode,
} from "@/data/rooms";
import {
  StandardButton,
  StandardInput,
} from "@/components/ui/standards";

type AdminNavId =
  | "overview"
  | "rooms"
  | "rates"
  | "promotions"
  | "bookings"
  | "whitelabel";

export default function WhiteLabelAdminDashboardPage() {
  const { store, saveStore, resetStoreToDefault } = useSapanStore();
  const {
    propertyConfig,
    rooms,
    seasonalRates,
    specialDateRates,
    addons,
    coupons,
    bookings,
  } = store;

  const [activeNav, setActiveNav] = useState<AdminNavId>("overview");
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Slide-over Inspector Drawer for a selected booking / slip
  const [inspectedBookingId, setInspectedBookingId] = useState<string | null>(
    null
  );

  // Search & status filter in Bookings view
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | BookingRecordStatus
  >("ALL");

  // Modal for Manual Walk-in / Line / Room Block
  const [showManualModal, setShowManualModal] = useState<boolean>(false);
  const [manualRoomId, setManualRoomId] = useState<string>(
    rooms[0]?.id ?? "room-a1"
  );
  const [manualUnits, setManualUnits] = useState<number>(1);
  const [manualCheckIn, setManualCheckIn] = useState<string>(() =>
    formatDateStr(new Date())
  );
  const [manualCheckOut, setManualCheckOut] = useState<string>(() =>
    formatDateStr(addDaysToDate(new Date(), 1))
  );
  const [manualGuestName, setManualGuestName] = useState<string>("");
  const [manualGuestPhone, setManualGuestPhone] = useState<string>("");

  // Modal for Adding New Room / Villa
  const [showAddRoomModal, setShowAddRoomModal] = useState<boolean>(false);
  const [newRoomCode, setNewRoomCode] = useState<string>("V3");
  const [newRoomNameTh, setNewRoomNameTh] = useState<string>("");
  const [newRoomCategory, setNewRoomCategory] =
    useState<RoomCategoryType>("VILLA");
  const [newRoomInventoryMode, setNewRoomInventoryMode] =
    useState<RoomInventoryMode>("SINGLE_UNIT");
  const [newRoomTotalUnits, setNewRoomTotalUnits] = useState<number>(1);
  const [newRoomBasePrice, setNewRoomBasePrice] = useState<number>(4200);
  const [newRoomWeekendPrice, setNewRoomWeekendPrice] = useState<number>(4900);
  const [newRoomSizeSqm, setNewRoomSizeSqm] = useState<number>(55);
  const [newRoomMaxGuests, setNewRoomMaxGuests] = useState<number>(4);
  const [newRoomImageUrl, setNewRoomImageUrl] = useState<string>(
    "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1400&q=85"
  );

  // New Seasonal Rate Form State
  const [seasonNameTh, setSeasonNameTh] = useState<string>("");
  const [seasonType, setSeasonType] = useState<"PEAK" | "HIGH" | "LOW">("HIGH");
  const [seasonStart, setSeasonStart] = useState<string>("2026-11-01");
  const [seasonEnd, setSeasonEnd] = useState<string>("2027-01-31");
  const [seasonAdjType, setSeasonAdjType] = useState<
    "PERCENT_SURCHARGE" | "PERCENT_DISCOUNT" | "FIXED_SURCHARGE"
  >("PERCENT_SURCHARGE");
  const [seasonAdjValue, setSeasonAdjValue] = useState<number>(20);
  const [seasonMinStay, setSeasonMinStay] = useState<number>(1);

  // New Special Date Override Form State
  const [spDateStr, setSpDateStr] = useState<string>(() =>
    formatDateStr(addDaysToDate(new Date(), 5))
  );
  const [spTitleTh, setSpTitleTh] = useState<string>("");
  const [spMode, setSpMode] = useState<"SURCHARGE_THB" | "FIXED_PRICE_THB">(
    "SURCHARGE_THB"
  );
  const [spAmountThb, setSpAmountThb] = useState<number>(1000);

  // New Coupon Form State
  const [newCouponCode, setNewCouponCode] = useState<string>("");
  const [newCouponTitle, setNewCouponTitle] = useState<string>("");
  const [newCouponType, setNewCouponType] = useState<"PERCENT" | "FIXED">(
    "PERCENT"
  );
  const [newCouponValue, setNewCouponValue] = useState<number>(15);
  const [newCouponMinSpend, setNewCouponMinSpend] = useState<number>(2500);

  // New Addon Form State
  const [newAddonName, setNewAddonName] = useState<string>("");
  const [newAddonPrice, setNewAddonPrice] = useState<number>(590);
  const [newAddonUnit, setNewAddonUnit] = useState<string>("/ เซ็ต");

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Metrics
  const pendingBookings = useMemo(
    () => bookings.filter((b) => b.status === "PENDING_ADMIN"),
    [bookings]
  );
  const confirmedBookings = useMemo(
    () => bookings.filter((b) => b.status === "CONFIRMED"),
    [bookings]
  );
  const holdBookings = useMemo(
    () => bookings.filter((b) => b.status === "HOLD_15_MIN"),
    [bookings]
  );
  const totalConfirmedRevenue = useMemo(
    () => confirmedBookings.reduce((sum, b) => sum + b.totalPriceThb, 0),
    [confirmedBookings]
  );
  const totalInventoryUnits = useMemo(
    () => rooms.reduce((sum, r) => sum + Math.max(1, r.totalUnits ?? 1), 0),
    [rooms]
  );

  const inspectedBooking = useMemo(
    () => bookings.find((b) => b.id === inspectedBookingId) ?? null,
    [bookings, inspectedBookingId]
  );

  // Filtered bookings list
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (statusFilter !== "ALL" && b.status !== statusFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        b.bookingCode.toLowerCase().includes(q) ||
        b.guestName.toLowerCase().includes(q) ||
        b.guestPhone.toLowerCase().includes(q) ||
        b.roomCode.toLowerCase().includes(q)
      );
    });
  }, [bookings, statusFilter, searchQuery]);

  // 14-Day Tape Chart & Rate Preview Dates
  const next14Days = useMemo(() => {
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    return Array.from({ length: 14 }).map((_, i) => {
      const d = addDaysToDate(base, i);
      return {
        dateStr: formatDateStr(d),
        dayNum: d.getDate(),
        weekdayShort: d.toLocaleDateString("th-TH", { weekday: "short" }),
        monthShort: d.toLocaleDateString("th-TH", { month: "short" }),
      };
    });
  }, []);

  // Actions
  const handleConfirmBooking = (bookingId: string) => {
    saveStore((prev) => ({
      ...prev,
      bookings: prev.bookings.map((b) =>
        b.id === bookingId ? { ...b, status: "CONFIRMED" } : b
      ),
    }));
    showToast("อนุมัติสลิปและยืนยันการจองสำเร็จ");
  };

  const handleCancelBooking = (bookingId: string) => {
    saveStore((prev) => ({
      ...prev,
      bookings: prev.bookings.map((b) =>
        b.id === bookingId ? { ...b, status: "CANCELLED" } : b
      ),
    }));
    showToast("ยกเลิกรายการจองและคืนสต็อกห้องว่างแล้ว");
  };

  const handleUpdateRoomField = <K extends keyof RoomLodge>(
    roomId: string,
    field: K,
    value: RoomLodge[K]
  ) => {
    saveStore((prev) => ({
      ...prev,
      rooms: prev.rooms.map((r) =>
        r.id === roomId ? { ...r, [field]: value } : r
      ),
    }));
  };

  const handleCreateNewRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomCode.trim() || !newRoomNameTh.trim()) return;
    const code = newRoomCode.trim().toUpperCase();
    const units =
      newRoomInventoryMode === "SINGLE_UNIT"
        ? 1
        : Math.max(1, Number(newRoomTotalUnits));

    const newRoom: RoomLodge = {
      id: `room-${Date.now()}`,
      slug: `room-${code.toLowerCase()}-${Date.now()}`,
      code,
      nameTh: newRoomNameTh.trim(),
      nameEn: newRoomNameTh.trim(),
      categoryTh:
        newRoomInventoryMode === "SINGLE_UNIT"
          ? "บ้านเดี่ยวส่วนตัว (Single Unit)"
          : `ประเภทห้องพัก (${units} ห้องย่อย)`,
      categoryEn:
        newRoomInventoryMode === "SINGLE_UNIT"
          ? "Single Villa Unit"
          : `Room Type (${units} Units)`,
      roomCategory: newRoomCategory,
      inventoryMode: newRoomInventoryMode,
      totalUnits: units,
      shortDescTh:
        "ห้องพักพร้อมสิ่งอำนวยความสะดวกครบครัน ระเบียงชมวิวส่วนตัว และบริการอาหารเช้า",
      shortDescEn: "Luxury accommodation with private balcony and breakfast.",
      longDescTh: [
        "ออกแบบอย่างพิถีพิถันเพื่อการพักผ่อนที่เป็นส่วนตัว พร้อมสิ่งอำนวยความสะดวกระดับโรงแรม 5 ดาวและบริการอาหารเช้า",
      ],
      longDescEn: [
        "Thoughtfully designed for a serene stay with full luxury amenities.",
      ],
      basePriceThb: Number(newRoomBasePrice) || 3500,
      weekendPriceThb: Number(newRoomWeekendPrice) || 4200,
      discountPercent: 0,
      extraBedPriceThb: 1000,
      sizeSqm: Number(newRoomSizeSqm) || 50,
      minGuests: 1,
      baseGuests: 2,
      maxGuests: Number(newRoomMaxGuests) || 4,
      bedrooms: 1,
      beds: 1,
      bathrooms: 1,
      petsAllowed: false,
      statusMode: "ACTIVE",
      mapX: 50,
      mapY: 50,
      highlightTh:
        newRoomInventoryMode === "SINGLE_UNIT"
          ? `บ้านเดี่ยวส่วนตัว (1 ยูนิต) · ${newRoomSizeSqm} ตร.ม.`
          : `มี ${units} ห้องย่อย · ${newRoomSizeSqm} ตร.ม.`,
      highlightEn: `${newRoomSizeSqm} sqm · Up to ${newRoomMaxGuests} Guests`,
      images: [
        {
          url:
            newRoomImageUrl.trim() ||
            "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1400&q=85",
          captionTh: newRoomNameTh.trim(),
          captionEn: newRoomNameTh.trim(),
        },
      ],
      amenities: {
        common: [
          "เตียง King Size พรีเมียม",
          "เครื่องปรับอากาศและสมาร์ททีวี",
          "ฟรี Wi-Fi ความเร็วสูง",
        ],
        dining: ["ฟรีอาหารเช้าสำหรับ 2 ท่าน", "ชุดชงกาแฟและมินิบาร์"],
        outdoor: ["ระเบียงส่วนตัวชมวิวธรรมชาติ"],
      },
    };

    saveStore((prev) => ({
      ...prev,
      rooms: [...prev.rooms, newRoom],
    }));
    setNewRoomNameTh("");
    setShowAddRoomModal(false);
    showToast(`สร้างห้องพัก ${code} (${units} ยูนิต) เรียบร้อยแล้ว`);
  };

  const handleAddSeasonalRate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!seasonNameTh.trim()) return;
    const sign =
      seasonAdjType === "PERCENT_DISCOUNT"
        ? `-${seasonAdjValue}%`
        : seasonAdjType === "PERCENT_SURCHARGE"
        ? `+${seasonAdjValue}%`
        : `+฿${seasonAdjValue}`;

    const newRule: SeasonalRateRule = {
      id: `season-${Date.now()}`,
      nameTh: seasonNameTh.trim(),
      nameEn: seasonNameTh.trim(),
      seasonType,
      startDate: seasonStart,
      endDate: seasonEnd,
      adjustmentType: seasonAdjType,
      adjustmentValue: Number(seasonAdjValue),
      minStayNights: Number(seasonMinStay) || 1,
      badgeTh: `${seasonType} Season (${sign})`,
      isActive: true,
    };

    saveStore((prev) => ({
      ...prev,
      seasonalRates: [newRule, ...prev.seasonalRates],
    }));
    setSeasonNameTh("");
    showToast("เพิ่มเรทราคาตามฤดูกาล (Seasonal Rate) สำเร็จ");
  };

  const handleAddSpecialDateOverride = (e: React.FormEvent) => {
    e.preventDefault();
    if (!spDateStr || !spTitleTh.trim()) return;
    const newSp: SpecialDateRateOverride = {
      id: `sp-${Date.now()}`,
      dateStr: spDateStr,
      titleTh: spTitleTh.trim(),
      pricingMode: spMode,
      amountThb: Number(spAmountThb),
      isActive: true,
    };
    saveStore((prev) => ({
      ...prev,
      specialDateRates: [newSp, ...prev.specialDateRates],
    }));
    setSpTitleTh("");
    showToast(`ตั้งราคาวันหยุดพิเศษ (${spDateStr}) เรียบร้อยแล้ว`);
  };

  const handleCreateManualBooking = (e: React.FormEvent) => {
    e.preventDefault();
    const room = rooms.find((r) => r.id === manualRoomId);
    if (!room || !manualGuestName.trim()) return;

    const start = new Date(manualCheckIn + "T00:00:00");
    const end = new Date(manualCheckOut + "T00:00:00");
    const nights = Math.max(
      1,
      Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    );
    const total = room.basePriceThb * nights * manualUnits;

    const newBooking: BookingRecord = {
      id: `bk-admin-${Date.now()}`,
      bookingCode: `ADM-${Math.floor(1000 + Math.random() * 9000)}`,
      roomId: room.id,
      roomCode: room.code,
      roomNameTh: room.nameTh,
      unitsBooked: manualUnits,
      checkIn: manualCheckIn,
      checkOut: manualCheckOut,
      nights,
      guests: room.baseGuests * manualUnits,
      extraGuests: 0,
      extraBedTotalThb: 0,
      addonsSelected: [],
      addonsTotalThb: 0,
      couponDiscountThb: 0,
      roomSubtotalThb: total,
      totalPriceThb: total,
      depositAmountThb: total,
      guestName: manualGuestName.trim(),
      guestPhone: manualGuestPhone.trim() || "-",
      guestContact: "Walk-in / LINE / Admin",
      guestNote: "ลงคิวจองโดยแอดมิน",
      status: "CONFIRMED",
      createdAtIso: new Date().toISOString(),
      holdExpiresAtIso: new Date().toISOString(),
      slipQrVerified: true,
      slipQrPayload: "ADMIN-DIRECT-ENTRY",
      source: "ADMIN_BLOCK",
    };

    saveStore((prev) => ({
      ...prev,
      bookings: [newBooking, ...prev.bookings],
    }));
    setManualGuestName("");
    setManualGuestPhone("");
    setShowManualModal(false);
    showToast(`บันทึกการจองห้อง ${room.code} (${manualUnits} ห้อง) สำเร็จ`);
  };

  const handleAddCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCouponCode.trim() || !newCouponTitle.trim()) return;
    saveStore((prev) => ({
      ...prev,
      coupons: [
        ...prev.coupons,
        {
          id: `coupon-${Date.now()}`,
          code: newCouponCode.trim().toUpperCase(),
          titleTh: newCouponTitle.trim(),
          discountType: newCouponType,
          discountValue: Number(newCouponValue),
          minSpendThb: Number(newCouponMinSpend),
          isActive: true,
        },
      ],
    }));
    setNewCouponCode("");
    setNewCouponTitle("");
    showToast("สร้างโปรโมชั่นและคูปองส่วนลดใหม่เรียบร้อย");
  };

  const handleAddAddon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddonName.trim()) return;
    saveStore((prev) => ({
      ...prev,
      addons: [
        ...prev.addons,
        {
          id: `addon-${Date.now()}`,
          nameTh: newAddonName.trim(),
          nameEn: newAddonName.trim(),
          descTh: "บริการเสริมพิเศษจากทางรีสอร์ท",
          descEn: "Curated resort add-on service",
          priceThb: Number(newAddonPrice),
          unitTh: newAddonUnit.trim() || "/ รายการ",
          unitEn: "/ item",
          isActive: true,
        },
      ],
    }));
    setNewAddonName("");
    showToast("เพิ่มบริการเสริม (Dining / Spa Add-on) เรียบร้อย");
  };

  const renderStatusBadge = (status: BookingRecordStatus) => {
    switch (status) {
      case "PENDING_ADMIN":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            รอตรวจสลิป
          </span>
        );
      case "HOLD_15_MIN":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
            ล็อคห้อง 15 นาที
          </span>
        );
      case "CONFIRMED":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            ยืนยันแล้ว
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
            ยกเลิก
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex">
      {/* =====================================================================
          1. FIXED LEFT SIDEBAR NAVIGATION (WHITE-LABEL HOSPITALITY PMS)
      ====================================================================== */}
      <aside className="w-68 bg-[#1C2826] text-white flex flex-col justify-between shrink-0 fixed inset-y-0 left-0 z-30">
        <div>
          <div className="h-16 px-5 flex items-center justify-between border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-[#C5A880] flex items-center justify-center font-extrabold text-sm text-[#141413]">
                {propertyConfig.brandCode}
              </div>
              <div className="truncate">
                <p className="text-sm font-bold leading-tight truncate text-white">
                  {propertyConfig.nameTh}
                </p>
                <p className="text-[11px] text-[#C5A880]">
                  White-Label Resort PMS
                </p>
              </div>
            </div>
          </div>

          <nav className="p-3 space-y-1">
            <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white/50">
              OPERATIONS & REVENUE
            </p>

            <button
              type="button"
              onClick={() => setActiveNav("overview")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeNav === "overview"
                  ? "bg-[#C5A880] text-[#141413]"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <QrCode className="w-4 h-4" />
                ภาพรวม & ตรวจสลิป QR
              </span>
              {pendingBookings.length > 0 && (
                <span className="rounded-full bg-amber-500 text-slate-950 px-2 py-0.5 text-[10px] font-extrabold">
                  {pendingBookings.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveNav("rooms")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeNav === "rooms"
                  ? "bg-[#C5A880] text-[#141413]"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <BedDouble className="w-4 h-4" />
                สร้าง/จัดการห้องพัก ({rooms.length})
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveNav("rates")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeNav === "rates"
                  ? "bg-[#C5A880] text-[#141413]"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <CalendarRange className="w-4 h-4" />
                เรทราคา Season & วันพิเศษ
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveNav("promotions")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeNav === "promotions"
                  ? "bg-[#C5A880] text-[#141413]"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Tag className="w-4 h-4" />
                โปรโมชั่น, คูปอง & บริการเสริม
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveNav("bookings")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeNav === "bookings"
                  ? "bg-[#C5A880] text-[#141413]"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Calendar className="w-4 h-4" />
                ตารางห้องว่าง & การจอง
              </span>
              <span className="text-[11px] opacity-75">{bookings.length}</span>
            </button>

            <p className="px-3 pt-4 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-white/50">
              WHITE-LABEL CONFIGURATION
            </p>

            <button
              type="button"
              onClick={() => setActiveNav("whitelabel")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeNav === "whitelabel"
                  ? "bg-[#C5A880] text-[#141413]"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Globe className="w-4 h-4" />
                แบรนด์, สภาพอากาศ & 9 Sections
              </span>
            </button>
          </nav>
        </div>

        <div className="p-3 border-t border-white/10 space-y-2">
          <button
            type="button"
            onClick={() => setShowManualModal(true)}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#C5A880] hover:bg-[#B59669] text-[#141413] py-2.5 px-3 text-xs font-extrabold transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            ลงคิวจอง / บล็อกห้องพัก
          </button>

          <Link
            href="/"
            className="w-full flex items-center justify-between rounded-lg bg-white/10 hover:bg-white/15 px-3 py-2 text-xs text-white/85 transition"
          >
            <span className="flex items-center gap-2">
              <Home className="w-3.5 h-3.5" />
              ดูหน้าเว็บลูกค้า (Storefront)
            </span>
            <ExternalLink className="w-3.5 h-3.5 opacity-60" />
          </Link>

          <button
            type="button"
            onClick={() => {
              resetStoreToDefault();
              showToast("รีเซ็ตข้อมูลกลับเป็นค่าเริ่มต้นเรียบร้อย");
            }}
            className="w-full flex items-center gap-2 rounded-lg px-3 py-1.5 text-[11px] text-white/50 hover:text-white hover:bg-white/5 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            รีเซ็ตข้อมูลตัวอย่าง (Demo Reset)
          </button>
        </div>
      </aside>

      {/* =====================================================================
          2. MAIN WORKSPACE AREA
      ====================================================================== */}
      <div className="flex-1 pl-68 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-20">
          <div>
            <h1 className="text-base font-bold text-slate-900">
              {activeNav === "overview" &&
                "ภาพรวมระบบ & คิวตรวจสอบสลิปโอนเงิน (Slip Verification)"}
              {activeNav === "rooms" &&
                "ระบบสร้างและจัดการห้องพัก (Single-Unit Villa & Multi-Unit Room Type)"}
              {activeNav === "rates" &&
                "ระบบตั้งเรทราคาตามฤดูกาล (Seasonal Rates) & วันหยุดพิเศษ (Special Dates)"}
              {activeNav === "promotions" &&
                "โปรโมชั่นแพ็กเกจ, คูปองส่วนลด & บริการเสริม (Dining / Spa Add-ons)"}
              {activeNav === "bookings" &&
                "ตารางห้องว่าง 14 วัน (Multi-Unit Tape Chart) & ทะเบียนการจอง"}
              {activeNav === "whitelabel" &&
                "ตั้งค่าแบรนด์ White-Label, พิกัด API สภาพอากาศ & เปิด/ปิด 9 Sections"}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {toastMsg && (
              <div className="rounded-lg bg-slate-900 text-white px-3.5 py-1.5 text-xs font-medium flex items-center gap-2 shadow-sm">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                {toastMsg}
              </div>
            )}
            <StandardButton
              variant="outline"
              size="sm"
              onClick={() => setShowAddRoomModal(true)}
            >
              <Plus className="w-3.5 h-3.5" />
              สร้างห้องพักใหม่
            </StandardButton>
          </div>
        </header>

        <main className="p-6 max-w-7xl w-full mx-auto space-y-6">
          {/* KPI Summary Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl bg-white border border-slate-200 p-4 flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">
                  รอแอดมินตรวจสลิป
                </p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {pendingBookings.length}
                </p>
                <p className="text-[11px] text-amber-700 font-medium mt-1">
                  สแกน QR สลิปผ่านแล้ว รอกดยืนยัน
                </p>
              </div>
              <div className="h-9 w-9 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                <Clock className="w-4 h-4" />
              </div>
            </div>

            <div className="rounded-xl bg-white border border-slate-200 p-4 flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">
                  สต็อกห้องพักรวมทั้งหมด
                </p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {totalInventoryUnits}{" "}
                  <span className="text-sm font-normal text-slate-500">
                    ยูนิต ({rooms.length} ประเภท)
                  </span>
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  รองรับทั้งบ้านเดี่ยว & Room Type
                </p>
              </div>
              <div className="h-9 w-9 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
                <Layers className="w-4 h-4" />
              </div>
            </div>

            <div className="rounded-xl bg-white border border-slate-200 p-4 flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">
                  เรทฤดูกาล & วันพิเศษที่เปิดใช้
                </p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {seasonalRates.filter((s) => s.isActive).length +
                    specialDateRates.filter((sp) => sp.isActive).length}
                </p>
                <p className="text-[11px] text-emerald-700 font-medium mt-1">
                  คำนวณเรทรายคืนอัตโนมัติ
                </p>
              </div>
              <div className="h-9 w-9 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                <CalendarRange className="w-4 h-4" />
              </div>
            </div>

            <div className="rounded-xl bg-white border border-slate-200 p-4 flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">
                  ยอดรายได้ยืนยันแล้ว
                </p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  ฿{totalConfirmedRevenue.toLocaleString()}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  จองตรงไม่เสียค่าคอมฯ OTA
                </p>
              </div>
              <div className="h-9 w-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* =================================================================
              MODULE 1: OVERVIEW & 1-CLICK SLIP APPROVAL QUEUE
          ================================================================== */}
          {activeNav === "overview" && (
            <div className="rounded-xl bg-white border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    รายการรอตรวจสอบสลิปโอนเงิน ({pendingBookings.length})
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    คลิกที่รายการเพื่อดูรูปสลิปและรหัสอ้างอิง QR ด้านขวามือ หรือกดยืนยันใน 1 คลิก
                  </p>
                </div>
              </div>

              {pendingBookings.length === 0 ? (
                <div className="p-10 text-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-900">
                    ตรวจสอบสลิปครบทุกรายการแล้ว
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {pendingBookings.map((bk) => (
                    <div
                      key={bk.id}
                      className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/80 transition"
                    >
                      <div className="flex items-start gap-4">
                        <button
                          type="button"
                          onClick={() => setInspectedBookingId(bk.id)}
                          className="relative h-16 w-14 rounded-lg border border-slate-200 overflow-hidden bg-slate-100 shrink-0 group cursor-pointer"
                        >
                          {bk.slipDataUrl ? (
                            <img
                              src={bk.slipDataUrl}
                              alt="Slip"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-[10px] text-slate-400">
                              No Slip
                            </div>
                          )}
                        </button>

                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                              {bk.bookingCode}
                            </span>
                            <span className="text-xs font-bold text-white bg-[#1C2826] px-2 py-0.5 rounded">
                              {bk.roomCode} ({bk.unitsBooked ?? 1} ห้อง)
                            </span>
                            <span className="text-sm font-bold text-slate-900">
                              {bk.guestName}
                            </span>
                            <span className="text-xs text-slate-500">
                              ({bk.guestPhone})
                            </span>
                          </div>
                          <div className="text-xs text-slate-600">
                            เช็คอิน:{" "}
                            <strong className="text-slate-900">
                              {bk.checkIn}
                            </strong>{" "}
                            → เช็คเอาท์:{" "}
                            <strong className="text-slate-900">
                              {bk.checkOut}
                            </strong>{" "}
                            ({bk.nights} คืน · {bk.guests} ท่าน)
                          </div>
                          {bk.slipQrPayload && (
                            <div className="text-[11px] text-emerald-700 font-medium">
                              ✓ QR Ref: {bk.slipQrPayload}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between lg:justify-end gap-4 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100">
                        <div className="text-right">
                          <span className="text-[11px] text-slate-500 block">
                            ยอดโอนสุทธิ
                          </span>
                          <span className="text-lg font-extrabold text-slate-900">
                            ฿{bk.totalPriceThb.toLocaleString()}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleConfirmBooking(bk.id)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-xs font-bold transition cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            ยืนยันการจอง
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCancelBooking(bk.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 px-3 py-2 text-xs font-semibold transition cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                            ปฏิเสธ
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* =================================================================
              MODULE 2: ROOM BUILDER & INVENTORY MANAGER (SINGLE_UNIT & ROOM_TYPE)
          ================================================================== */}
          {activeNav === "rooms" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    รายการห้องพักและวิลล่าทั้งหมด ({rooms.length} รายการ · รวม{" "}
                    {totalInventoryUnits} ยูนิต)
                  </h2>
                  <p className="text-xs text-slate-500">
                    ปรับเปลี่ยนรูปแบบสต็อกได้ทั้งแบบ &ldquo;บ้านเดี่ยวระบุหลัง (Single Unit)&rdquo; และ &ldquo;ประเภทห้องพักหลายยูนิต (Room Type)&rdquo;
                  </p>
                </div>
                <StandardButton
                  variant="primary"
                  size="sm"
                  onClick={() => setShowAddRoomModal(true)}
                >
                  <Plus className="w-4 h-4" />
                  เพิ่มห้องพัก / วิลล่าใหม่
                </StandardButton>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {rooms.map((room) => (
                  <div
                    key={room.id}
                    className="rounded-xl bg-white border border-slate-200 overflow-hidden"
                  >
                    <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-3 bg-slate-50/60">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="h-9 px-2.5 rounded-lg bg-[#1C2826] text-[#E5CFA6] font-extrabold text-xs flex items-center justify-center shrink-0">
                          {room.code}
                        </span>
                        <div className="min-w-0">
                          <input
                            type="text"
                            value={room.nameTh}
                            onChange={(e) =>
                              handleUpdateRoomField(
                                room.id,
                                "nameTh",
                                e.target.value
                              )
                            }
                            className="text-sm font-bold text-slate-900 bg-transparent border-b border-transparent focus:border-slate-400 focus:outline-none w-full"
                          />
                          <p className="text-[11px] text-slate-500">
                            ขนาด {room.sizeSqm} ตร.ม. · พักมาตรฐาน{" "}
                            {room.baseGuests} ท่าน (สูงสุด {room.maxGuests} ท่าน)
                          </p>
                        </div>
                      </div>

                      <select
                        value={room.statusMode}
                        onChange={(e) =>
                          handleUpdateRoomField(
                            room.id,
                            "statusMode",
                            e.target.value as "ACTIVE" | "MAINTENANCE"
                          )
                        }
                        className={`rounded-lg px-3 py-1.5 text-xs font-bold border cursor-pointer ${
                          room.statusMode === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "bg-rose-50 text-rose-800 border-rose-200"
                        }`}
                      >
                        <option value="ACTIVE">🟢 เปิดรับจอง (Active)</option>
                        <option value="MAINTENANCE">
                          🔴 ปิดปรับปรุง (Maintenance)
                        </option>
                      </select>
                    </div>

                    <div className="p-4 space-y-4">
                      {/* Inventory Model & Unit Count Row */}
                      <div className="grid grid-cols-3 gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200/80">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            รูปแบบสต็อกห้องพัก
                          </label>
                          <select
                            value={room.inventoryMode || "SINGLE_UNIT"}
                            onChange={(e) => {
                              const mode = e.target
                                .value as RoomInventoryMode;
                              handleUpdateRoomField(
                                room.id,
                                "inventoryMode",
                                mode
                              );
                              if (mode === "SINGLE_UNIT") {
                                handleUpdateRoomField(room.id, "totalUnits", 1);
                              }
                            }}
                            className="w-full h-9 rounded-lg border border-slate-300 bg-white px-2 text-xs font-bold text-slate-900"
                          >
                            <option value="SINGLE_UNIT">
                              บ้านเดี่ยว (1 หลัง)
                            </option>
                            <option value="ROOM_TYPE">
                              Room Type (หลายห้อง)
                            </option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            หมวดหมู่ (Category)
                          </label>
                          <select
                            value={room.roomCategory || "VILLA"}
                            onChange={(e) =>
                              handleUpdateRoomField(
                                room.id,
                                "roomCategory",
                                e.target.value as RoomCategoryType
                              )
                            }
                            className="w-full h-9 rounded-lg border border-slate-300 bg-white px-2 text-xs font-bold text-slate-900"
                          >
                            <option value="VILLA">Private Villa</option>
                            <option value="SUITE">Luxury Suite</option>
                            <option value="DELUXE">Deluxe Room</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            จำนวนห้องย่อย (Units)
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={50}
                            disabled={
                              (room.inventoryMode || "SINGLE_UNIT") ===
                              "SINGLE_UNIT"
                            }
                            value={room.totalUnits ?? 1}
                            onChange={(e) =>
                              handleUpdateRoomField(
                                room.id,
                                "totalUnits",
                                Math.max(1, Number(e.target.value))
                              )
                            }
                            className="w-full h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-bold text-slate-900 disabled:bg-slate-100 disabled:text-slate-400"
                          />
                        </div>
                      </div>

                      {/* Base Rate / Weekend Rate / Discount / Extra Bed */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                            ราคาวันธรรมดา (฿)
                          </label>
                          <input
                            type="number"
                            value={room.basePriceThb}
                            onChange={(e) =>
                              handleUpdateRoomField(
                                room.id,
                                "basePriceThb",
                                Number(e.target.value)
                              )
                            }
                            className="w-full h-9 rounded-lg border border-slate-300 px-2.5 text-sm font-bold text-slate-900"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                            ราคาศุกร์-เสาร์ (฿)
                          </label>
                          <input
                            type="number"
                            value={room.weekendPriceThb}
                            onChange={(e) =>
                              handleUpdateRoomField(
                                room.id,
                                "weekendPriceThb",
                                Number(e.target.value)
                              )
                            }
                            className="w-full h-9 rounded-lg border border-slate-300 px-2.5 text-sm font-bold text-slate-900"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                            ส่วนลดหน้าเว็บ (%)
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={80}
                            value={room.discountPercent}
                            onChange={(e) =>
                              handleUpdateRoomField(
                                room.id,
                                "discountPercent",
                                Number(e.target.value)
                              )
                            }
                            className="w-full h-9 rounded-lg border border-slate-300 px-2.5 text-sm font-bold text-emerald-700"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                            เตียงเสริม/ท่าน (฿)
                          </label>
                          <input
                            type="number"
                            value={room.extraBedPriceThb}
                            onChange={(e) =>
                              handleUpdateRoomField(
                                room.id,
                                "extraBedPriceThb",
                                Number(e.target.value)
                              )
                            }
                            className="w-full h-9 rounded-lg border border-slate-300 px-2.5 text-sm font-bold text-slate-900"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* =================================================================
              MODULE 3: SEASONAL RATES & SPECIAL HOLIDAY OVERRIDE ENGINE
          ================================================================== */}
          {activeNav === "rates" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left 6 Cols: Seasonal Rate Rules */}
                <div className="lg:col-span-6 rounded-xl bg-white border border-slate-200 p-5 space-y-4">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">
                      1. ตั้งเรทราคาตามฤดูกาล (Seasonal Rate Rules)
                    </h2>
                    <p className="text-xs text-slate-500">
                      กำหนดช่วง High Season, Peak Season หรือ Green Season เพื่อปรับเรทราคาขึ้น/ลงอัตโนมัติ
                    </p>
                  </div>

                  <form
                    onSubmit={handleAddSeasonalRate}
                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          ชื่อฤดูกาล (Season Name)
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="เช่น High Season หน้าหนาว"
                          value={seasonNameTh}
                          onChange={(e) => setSeasonNameTh(e.target.value)}
                          className="w-full h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          ระดับ (Tier)
                        </label>
                        <select
                          value={seasonType}
                          onChange={(e) =>
                            setSeasonType(
                              e.target.value as "PEAK" | "HIGH" | "LOW"
                            )
                          }
                          className="w-full h-9 rounded-lg border border-slate-300 bg-white px-2 text-xs font-bold"
                        >
                          <option value="PEAK">PEAK (สูงสุด)</option>
                          <option value="HIGH">HIGH (ไฮซีซั่น)</option>
                          <option value="LOW">LOW (กรีนซีซั่น)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          วันเริ่มต้น
                        </label>
                        <input
                          type="date"
                          value={seasonStart}
                          onChange={(e) => setSeasonStart(e.target.value)}
                          className="w-full h-9 rounded-lg border border-slate-300 bg-white px-2 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          วันสิ้นสุด
                        </label>
                        <input
                          type="date"
                          value={seasonEnd}
                          onChange={(e) => setSeasonEnd(e.target.value)}
                          className="w-full h-9 rounded-lg border border-slate-300 bg-white px-2 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          การปรับเรท
                        </label>
                        <select
                          value={seasonAdjType}
                          onChange={(e) =>
                            setSeasonAdjType(
                              e.target.value as
                                | "PERCENT_SURCHARGE"
                                | "PERCENT_DISCOUNT"
                                | "FIXED_SURCHARGE"
                            )
                          }
                          className="w-full h-9 rounded-lg border border-slate-300 bg-white px-1.5 text-xs font-semibold"
                        >
                          <option value="PERCENT_SURCHARGE">บวกเพิ่ม (%)</option>
                          <option value="PERCENT_DISCOUNT">ลดราคา (%)</option>
                          <option value="FIXED_SURCHARGE">บวกเพิ่ม (฿)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          จำนวน (% หรือ ฿)
                        </label>
                        <input
                          type="number"
                          value={seasonAdjValue}
                          onChange={(e) =>
                            setSeasonAdjValue(Number(e.target.value))
                          }
                          className="w-full h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-bold"
                        />
                      </div>
                    </div>

                    <StandardButton
                      type="submit"
                      variant="primary"
                      size="sm"
                      fullWidth
                    >
                      <Plus className="w-3.5 h-3.5" />
                      เพิ่มช่วงฤดูกาล (Add Season Rule)
                    </StandardButton>
                  </form>

                  <div className="divide-y divide-slate-200">
                    {seasonalRates.map((s) => (
                      <div
                        key={s.id}
                        className="py-3 flex items-center justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded px-2 py-0.5 text-[10px] font-extrabold ${
                                s.seasonType === "PEAK"
                                  ? "bg-rose-100 text-rose-800"
                                  : s.seasonType === "HIGH"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-emerald-100 text-emerald-800"
                              }`}
                            >
                              {s.badgeTh}
                            </span>
                            <span className="text-xs font-bold text-slate-900">
                              {s.nameTh}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {s.startDate} ถึง {s.endDate}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              saveStore((prev) => ({
                                ...prev,
                                seasonalRates: prev.seasonalRates.map((item) =>
                                  item.id === s.id
                                    ? { ...item, isActive: !item.isActive }
                                    : item
                                ),
                              }))
                            }
                            className={`rounded-md px-2.5 py-1 text-[11px] font-bold cursor-pointer ${
                              s.isActive
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {s.isActive ? "เปิดใช้งาน" : "ปิดไว้"}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              saveStore((prev) => ({
                                ...prev,
                                seasonalRates: prev.seasonalRates.filter(
                                  (item) => item.id !== s.id
                                ),
                              }))
                            }
                            className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right 6 Cols: Special Dates / Holiday Rate Overrides */}
                <div className="lg:col-span-6 rounded-xl bg-white border border-slate-200 p-5 space-y-4">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">
                      2. ตั้งราคาวันหยุดพิเศษ / นักขัตฤกษ์ (Special Date Override)
                    </h2>
                    <p className="text-xs text-slate-500">
                      มีลำดับความสำคัญสูงสุด (Priority 1) ใช้กำหนดราคาเฉพาะวันหยุดยาวหรือคืนเคานต์ดาวน์
                    </p>
                  </div>

                  <form
                    onSubmit={handleAddSpecialDateOverride}
                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          เลือกวันที่พิเศษ
                        </label>
                        <input
                          type="date"
                          required
                          value={spDateStr}
                          onChange={(e) => setSpDateStr(e.target.value)}
                          className="w-full h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          ชื่อวันหยุด / เทศกาล
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="เช่น วันพ่อแห่งชาติ / วันสิ้นปี"
                          value={spTitleTh}
                          onChange={(e) => setSpTitleTh(e.target.value)}
                          className="w-full h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          รูปแบบการคิดราคา
                        </label>
                        <select
                          value={spMode}
                          onChange={(e) =>
                            setSpMode(
                              e.target.value as
                                | "SURCHARGE_THB"
                                | "FIXED_PRICE_THB"
                            )
                          }
                          className="w-full h-9 rounded-lg border border-slate-300 bg-white px-2 text-xs font-semibold"
                        >
                          <option value="SURCHARGE_THB">
                            บวกเพิ่มจากเรทปกติ (+฿)
                          </option>
                          <option value="FIXED_PRICE_THB">
                            กำหนดราคาคงที่ (Fixed ฿)
                          </option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          จำนวนเงิน (บาท/คืน)
                        </label>
                        <input
                          type="number"
                          value={spAmountThb}
                          onChange={(e) =>
                            setSpAmountThb(Number(e.target.value))
                          }
                          className="w-full h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-bold"
                        />
                      </div>
                    </div>

                    <StandardButton
                      type="submit"
                      variant="primary"
                      size="sm"
                      fullWidth
                    >
                      <Plus className="w-3.5 h-3.5" />
                      เพิ่มราคาวันหยุดพิเศษ
                    </StandardButton>
                  </form>

                  <div className="divide-y divide-slate-200">
                    {specialDateRates.map((sp) => (
                      <div
                        key={sp.id}
                        className="py-3 flex items-center justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded">
                              {sp.dateStr}
                            </span>
                            <span className="text-xs font-bold text-slate-900">
                              {sp.titleTh}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {sp.pricingMode === "SURCHARGE_THB"
                              ? `บวกเพิ่มคืนละ +฿${sp.amountThb.toLocaleString()}`
                              : `ราคาคงที่ ฿${sp.amountThb.toLocaleString()} / คืน`}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            saveStore((prev) => ({
                              ...prev,
                              specialDateRates: prev.specialDateRates.filter(
                                (item) => item.id !== sp.id
                              ),
                            }))
                          }
                          className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 14-Day Live Rate Preview Matrix */}
              <div className="rounded-xl bg-white border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-200">
                  <h3 className="text-sm font-bold text-slate-900">
                    ตารางจำลองเรทราคาขายจริงรายวันล่วงหน้า 14 วัน (Live Rate Matrix)
                  </h3>
                  <p className="text-xs text-slate-500">
                    แสดงราคาสุทธิต่อคืนของแต่ละห้องหลังคำนวณ Weekday / Weekend / Season / วันหยุดพิเศษ และส่วนลดหน้าเว็บแล้ว
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[11px] text-slate-500">
                        <th className="py-2.5 px-4 font-bold min-w-[180px]">
                          ห้องพัก / วันที่
                        </th>
                        {next14Days.map((d) => (
                          <th
                            key={d.dateStr}
                            className="py-2 px-2 text-center font-semibold min-w-[68px] border-l border-slate-200/70"
                          >
                            <span className="block text-[10px]">
                              {d.weekdayShort}
                            </span>
                            <span className="text-xs font-bold text-slate-900">
                              {d.dayNum} {d.monthShort}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-xs">
                      {rooms.map((room) => (
                        <tr key={room.id}>
                          <td className="py-3 px-4 font-bold text-slate-900">
                            {room.code} — {room.nameTh}
                          </td>
                          {next14Days.map((d) => {
                            const info = calculateNightlyRateForDate(
                              room,
                              d.dateStr,
                              seasonalRates,
                              specialDateRates
                            );
                            return (
                              <td
                                key={d.dateStr}
                                className={`p-2 text-center border-l border-slate-100 ${
                                  info.rateType === "SPECIAL_DATE"
                                    ? "bg-amber-50 font-extrabold text-amber-900"
                                    : info.rateType === "SEASONAL"
                                    ? "bg-blue-50/50 font-bold text-blue-900"
                                    : info.rateType === "WEEKEND"
                                    ? "bg-emerald-50/40 font-bold text-emerald-900"
                                    : "text-slate-700"
                                }`}
                                title={info.rateLabelTh}
                              >
                                ฿{info.finalNightlyRate.toLocaleString()}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================
              MODULE 4: PROMOTIONS, COUPONS & DINING/SPA ADD-ONS
          ================================================================== */}
          {activeNav === "promotions" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left 6 Cols: Promo Coupons */}
              <div className="lg:col-span-6 rounded-xl bg-white border border-slate-200 p-5 space-y-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    คูปองและโปรโมชั่นหน้าเว็บ ({coupons.length})
                  </h2>
                  <p className="text-xs text-slate-500">
                    แสดงใน Section &ldquo;Exclusive Offers&rdquo; หน้าแรก และใช้กรอกลดราคาตอนจอง
                  </p>
                </div>

                <form
                  onSubmit={handleAddCoupon}
                  className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3"
                >
                  <div className="grid grid-cols-2 gap-2.5">
                    <StandardInput
                      label="รหัสคูปอง *"
                      placeholder="เช่น SUMMER20"
                      required
                      value={newCouponCode}
                      onChange={(e) =>
                        setNewCouponCode(e.target.value.toUpperCase())
                      }
                    />
                    <StandardInput
                      label="แคมเปญโปรโมชั่น *"
                      placeholder="เช่น ลดรับซัมเมอร์ 20%"
                      required
                      value={newCouponTitle}
                      onChange={(e) => setNewCouponTitle(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        ประเภท
                      </label>
                      <select
                        value={newCouponType}
                        onChange={(e) =>
                          setNewCouponType(
                            e.target.value as "PERCENT" | "FIXED"
                          )
                        }
                        className="w-full h-10 rounded-xl border border-slate-300 bg-white px-2.5 text-xs font-semibold"
                      >
                        <option value="PERCENT">ลดเป็น %</option>
                        <option value="FIXED">ลดเป็นบาท (฿)</option>
                      </select>
                    </div>
                    <StandardInput
                      label="มูลค่าส่วนลด"
                      type="number"
                      value={newCouponValue}
                      onChange={(e) =>
                        setNewCouponValue(Number(e.target.value))
                      }
                    />
                    <StandardInput
                      label="ยอดขั้นต่ำ (฿)"
                      type="number"
                      value={newCouponMinSpend}
                      onChange={(e) =>
                        setNewCouponMinSpend(Number(e.target.value))
                      }
                    />
                  </div>
                  <StandardButton
                    type="submit"
                    variant="primary"
                    size="sm"
                    fullWidth
                  >
                    <Plus className="w-3.5 h-3.5" />
                    เพิ่มโปรโมชั่นคูปอง
                  </StandardButton>
                </form>

                <div className="divide-y divide-slate-200">
                  {coupons.map((c) => (
                    <div
                      key={c.id}
                      className="py-3 flex items-center justify-between gap-2"
                    >
                      <div>
                        <span className="font-mono text-xs font-extrabold bg-slate-100 text-slate-900 px-2 py-0.5 rounded">
                          {c.code}
                        </span>
                        <span className="ml-2 text-xs font-bold text-emerald-700">
                          {c.discountType === "PERCENT"
                            ? `ลด ${c.discountValue}%`
                            : `ลด ฿${c.discountValue}`}
                        </span>
                        <p className="text-xs text-slate-600 mt-0.5">
                          {c.titleTh}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          saveStore((prev) => ({
                            ...prev,
                            coupons: prev.coupons.filter(
                              (item) => item.id !== c.id
                            ),
                          }))
                        }
                        className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right 6 Cols: Dining & Spa Add-ons */}
              <div className="lg:col-span-6 rounded-xl bg-white border border-slate-200 p-5 space-y-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    บริการเสริม Dining & Spa Add-ons ({addons.length})
                  </h2>
                  <p className="text-xs text-slate-500">
                    แสดงใน Section &ldquo;Dining & Culinary&rdquo; หน้าเว็บ และให้ลูกค้าติ๊กเลือกเพิ่มตอนจอง
                  </p>
                </div>

                <form
                  onSubmit={handleAddAddon}
                  className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3"
                >
                  <StandardInput
                    label="ชื่อบริการเสริม / เซ็ตอาหาร *"
                    placeholder="เช่น ชุด Afternoon Tea ริมสระน้ำ"
                    required
                    value={newAddonName}
                    onChange={(e) => setNewAddonName(e.target.value)}
                  />
                  <div className="grid grid-cols-2 gap-2.5">
                    <StandardInput
                      label="ราคา (บาท)"
                      type="number"
                      value={newAddonPrice}
                      onChange={(e) => setNewAddonPrice(Number(e.target.value))}
                    />
                    <StandardInput
                      label="หน่วยนับ"
                      placeholder="/ เซ็ต"
                      value={newAddonUnit}
                      onChange={(e) => setNewAddonUnit(e.target.value)}
                    />
                  </div>
                  <StandardButton
                    type="submit"
                    variant="primary"
                    size="sm"
                    fullWidth
                  >
                    <Plus className="w-3.5 h-3.5" />
                    เพิ่มบริการเสริมใหม่
                  </StandardButton>
                </form>

                <div className="divide-y divide-slate-200">
                  {addons.map((a) => (
                    <div
                      key={a.id}
                      className="py-3 flex items-center justify-between gap-2"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-900">
                          {a.nameTh}
                        </p>
                        <p className="text-xs text-emerald-700 font-semibold">
                          +฿{a.priceThb.toLocaleString()} {a.unitTh}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          saveStore((prev) => ({
                            ...prev,
                            addons: prev.addons.filter(
                              (item) => item.id !== a.id
                            ),
                          }))
                        }
                        className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* =================================================================
              MODULE 5: MULTI-UNIT TAPE CHART & RESERVATIONS TABLE
          ================================================================== */}
          {activeNav === "bookings" && (
            <div className="space-y-6">
              {/* 14-Day Multi-Unit Availability Tape Chart */}
              <div className="rounded-xl bg-white border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">
                      ตารางสต็อกห้องว่าง 14 วัน (Multi-Unit PMS Tape Chart)
                    </h2>
                    <p className="text-xs text-slate-500">
                      แสดงจำนวนห้องที่ว่างเทียบกับจำนวนยูนิตทั้งหมดของแต่ละประเภทห้องพัก
                    </p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[11px] text-slate-500">
                        <th className="py-2.5 px-4 font-bold min-w-[190px]">
                          ห้องพัก (จำนวนยูนิต)
                        </th>
                        {next14Days.map((d) => (
                          <th
                            key={d.dateStr}
                            className="py-2 px-1.5 text-center font-semibold min-w-[64px] border-l border-slate-200/70"
                          >
                            <span className="block text-[10px]">
                              {d.weekdayShort}
                            </span>
                            <span className="text-xs font-bold text-slate-900">
                              {d.dayNum}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-xs">
                      {rooms.map((room) => (
                        <tr key={room.id}>
                          <td className="py-3 px-4 font-bold text-slate-900">
                            {room.code} ({room.totalUnits ?? 1} ห้อง)
                          </td>
                          {next14Days.map((d) => {
                            const nextStr = formatDateStr(
                              addDaysToDate(new Date(d.dateStr + "T00:00:00"), 1)
                            );
                            const inv = getRoomInventoryForRange(
                              room,
                              d.dateStr,
                              nextStr,
                              bookings
                            );
                            return (
                              <td
                                key={d.dateStr}
                                className="p-1.5 text-center border-l border-slate-100"
                              >
                                <span
                                  className={`inline-block w-full rounded py-1 text-[10px] font-bold ${
                                    inv.availableUnits === 0
                                      ? "bg-rose-100 text-rose-800"
                                      : inv.availableUnits < inv.totalUnits
                                      ? "bg-amber-100 text-amber-800"
                                      : "bg-emerald-50 text-emerald-700"
                                  }`}
                                >
                                  {inv.availableUnits}/{inv.totalUnits}
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Reservations Table */}
              <div className="rounded-xl bg-white border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="relative w-full sm:w-72">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="ค้นหารหัสจอง, ชื่อลูกค้า, เบอร์โทร..."
                      className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-300 text-xs"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase text-slate-500">
                        <th className="py-3 px-4">รหัสจอง</th>
                        <th className="py-3 px-4">ห้องพัก</th>
                        <th className="py-3 px-4">ผู้เข้าพัก</th>
                        <th className="py-3 px-4">เช็คอิน – เช็คเอาท์</th>
                        <th className="py-3 px-4">ยอดสุทธิ</th>
                        <th className="py-3 px-4">สถานะ</th>
                        <th className="py-3 px-4 text-right">การจัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-xs">
                      {filteredBookings.map((b) => (
                        <tr key={b.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-mono font-bold">
                            {b.bookingCode}
                          </td>
                          <td className="py-3 px-4 font-bold">
                            {b.roomCode} ({b.unitsBooked ?? 1} ห้อง)
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">
                              {b.guestName}
                            </div>
                            <div className="text-slate-500">{b.guestPhone}</div>
                          </td>
                          <td className="py-3 px-4">
                            {b.checkIn} → {b.checkOut} ({b.nights} คืน)
                          </td>
                          <td className="py-3 px-4 font-extrabold">
                            ฿{b.totalPriceThb.toLocaleString()}
                          </td>
                          <td className="py-3 px-4">
                            {renderStatusBadge(b.status)}
                          </td>
                          <td className="py-3 px-4 text-right space-x-1.5">
                            {b.status !== "CONFIRMED" && (
                              <button
                                type="button"
                                onClick={() => handleConfirmBooking(b.id)}
                                className="rounded bg-emerald-600 text-white px-2.5 py-1 font-bold cursor-pointer"
                              >
                                ยืนยัน
                              </button>
                            )}
                            {b.status !== "CANCELLED" && (
                              <button
                                type="button"
                                onClick={() => handleCancelBooking(b.id)}
                                className="rounded border border-rose-200 text-rose-700 px-2.5 py-1 font-semibold cursor-pointer"
                              >
                                ยกเลิก
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================
              MODULE 6: WHITE-LABEL BRAND, WEATHER API & 9-SECTION CMS TOGGLES
          ================================================================== */}
          {activeNav === "whitelabel" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left 7 Cols: Brand Identity + Weather Coordinates */}
              <div className="lg:col-span-7 rounded-xl bg-white border border-slate-200 p-5 space-y-5">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    1. ตั้งค่าแบรนด์ที่พัก (White-Label Brand Customization)
                  </h2>
                  <p className="text-xs text-slate-500">
                    เปลี่ยนชื่อรีสอร์ท โลโก้ สีประจำแบรนด์ และบัญชีรับโอนเงินเพื่อนำไปขายต่อให้ลูกค้าแต่ละราย
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      อักษรย่อโลโก้
                    </label>
                    <input
                      type="text"
                      maxLength={3}
                      value={propertyConfig.brandCode}
                      onChange={(e) =>
                        saveStore((prev) => ({
                          ...prev,
                          propertyConfig: {
                            ...prev.propertyConfig,
                            brandCode: e.target.value.toUpperCase(),
                          },
                        }))
                      }
                      className="w-full h-10 rounded-xl border border-slate-300 px-3 text-sm font-extrabold uppercase"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      ชื่อที่พัก / รีสอร์ท (ภาษาไทย)
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
                      className="w-full h-10 rounded-xl border border-slate-300 px-3 text-sm font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      ชื่อที่พัก (ภาษาอังกฤษ)
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
                      className="w-full h-10 rounded-xl border border-slate-300 px-3 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      สีหลักของแบรนด์ (Top Bar & Theme Hex)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={propertyConfig.primaryColor}
                        onChange={(e) =>
                          saveStore((prev) => ({
                            ...prev,
                            propertyConfig: {
                              ...prev.propertyConfig,
                              primaryColor: e.target.value,
                            },
                          }))
                        }
                        className="h-10 w-14 rounded-[2px] border border-slate-300 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={propertyConfig.primaryColor}
                        onChange={(e) =>
                          saveStore((prev) => ({
                            ...prev,
                            propertyConfig: {
                              ...prev.propertyConfig,
                              primaryColor: e.target.value,
                            },
                          }))
                        }
                        className="flex-1 h-10 rounded-[2px] border border-slate-300 px-3 text-xs font-mono"
                      />
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {[
                        {
                          label: "Anantara Warm Slate (#4A4946)",
                          color: "#4A4946",
                        },
                        {
                          label: "Anantara Taupe (#A29080)",
                          color: "#A29080",
                        },
                        {
                          label: "Beachfront Navy (#13293D)",
                          color: "#13293D",
                        },
                        {
                          label: "Terracotta Resort (#4A2C2A)",
                          color: "#4A2C2A",
                        },
                      ].map((t) => (
                        <button
                          key={t.color}
                          type="button"
                          onClick={() =>
                            saveStore((prev) => ({
                              ...prev,
                              propertyConfig: {
                                ...prev.propertyConfig,
                                primaryColor: t.color,
                              },
                            }))
                          }
                          className="inline-flex items-center gap-1.5 rounded-[2px] border border-slate-300 bg-slate-50 hover:bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-700 cursor-pointer"
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: t.color }}
                          />
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Live Weather API Location Configuration */}
                <div className="pt-4 border-t border-slate-200 space-y-3">
                  <div className="flex items-center gap-2">
                    <CloudSun className="w-4 h-4 text-[#A29080]" />
                    <h3 className="text-sm font-bold text-slate-900">
                      2. ตั้งค่าพิกัดพยากรณ์อากาศสด (Live Weather API Coordinates)
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500">
                    เลือกทำเลที่ตั้งของที่พัก (ริมแม่น้ำ / ริมทะเล / ในเมือง / ธรรมชาติ) หรือระบุพิกัด Latitude / Longitude เพื่อให้หน้าเว็บดึงสภาพอากาศสดจาก Open-Meteo API
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {WEATHER_LOCATION_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          saveStore((prev) => ({
                            ...prev,
                            propertyConfig: {
                              ...prev.propertyConfig,
                              latitude: preset.latitude,
                              longitude: preset.longitude,
                              weatherCityLabelTh: preset.labelTh,
                              weatherCityLabelEn: preset.labelEn,
                            },
                          }));
                          showToast(
                            `เปลี่ยนพิกัดสภาพอากาศเป็น ${preset.labelTh} แล้ว`
                          );
                        }}
                        className={`rounded-[2px] px-3 py-1.5 text-xs font-bold border transition cursor-pointer ${
                          Math.abs(
                            propertyConfig.latitude - preset.latitude
                          ) < 0.01
                            ? "bg-[#545351] text-white border-[#A29080]"
                            : "bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100"
                        }`}
                      >
                        📍 {preset.labelTh}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        ชื่อเมืองที่แสดง
                      </label>
                      <input
                        type="text"
                        value={propertyConfig.weatherCityLabelTh}
                        onChange={(e) =>
                          saveStore((prev) => ({
                            ...prev,
                            propertyConfig: {
                              ...prev.propertyConfig,
                              weatherCityLabelTh: e.target.value,
                            },
                          }))
                        }
                        className="w-full h-9 rounded-lg border border-slate-300 px-2.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Latitude
                      </label>
                      <input
                        type="number"
                        step="0.0001"
                        value={propertyConfig.latitude}
                        onChange={(e) =>
                          saveStore((prev) => ({
                            ...prev,
                            propertyConfig: {
                              ...prev.propertyConfig,
                              latitude: Number(e.target.value),
                            },
                          }))
                        }
                        className="w-full h-9 rounded-lg border border-slate-300 px-2.5 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Longitude
                      </label>
                      <input
                        type="number"
                        step="0.0001"
                        value={propertyConfig.longitude}
                        onChange={(e) =>
                          saveStore((prev) => ({
                            ...prev,
                            propertyConfig: {
                              ...prev.propertyConfig,
                              longitude: Number(e.target.value),
                            },
                          }))
                        }
                        className="w-full h-9 rounded-lg border border-slate-300 px-2.5 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right 5 Cols: Toggle Show/Hide for the 9 Anantara Storefront Sections */}
              <div className="lg:col-span-5 rounded-xl bg-white border border-slate-200 p-5 space-y-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    3. เปิด/ปิดการแสดงผล 9 Sections หน้าเว็บ (Anantara Layout)
                  </h2>
                  <p className="text-xs text-slate-500">
                    ปรับแต่งโครงสร้างหน้าเว็บให้เหมาะกับขนาดของที่พักลูกค้าแต่ละรายในคลิกเดียว
                  </p>
                </div>

                <div className="divide-y divide-slate-200 text-xs">
                  {(
                    [
                      {
                        key: "heroSection",
                        label: "Section 2: Cinematic Hero Showcase",
                      },
                      {
                        key: "storyAndWeatherSection",
                        label: "Section 3: Sanctuary Story & Live Weather API",
                      },
                      {
                        key: "accommodationsSection",
                        label: "Section 4: Accommodations (Villas & Suites)",
                      },
                      {
                        key: "specialOffersSection",
                        label: "Section 5: Exclusive Offers & Promo Packages",
                      },
                      {
                        key: "diningSection",
                        label: "Section 6: Dining & Culinary Experiences",
                      },
                      {
                        key: "experiencesSection",
                        label: "Section 7: Signature Wellness & Facilities",
                      },
                      {
                        key: "galleryAndReviewsSection",
                        label: "Section 8: Guest Reviews & Social Proof",
                      },
                      {
                        key: "policiesAndLocationSection",
                        label: "Section 9: Policies, Location & Footer",
                      },
                    ] as Array<{
                      key: keyof typeof propertyConfig.sectionsVisibility;
                      label: string;
                    }>
                  ).map((sec) => {
                    const enabled = propertyConfig.sectionsVisibility[sec.key];
                    return (
                      <div
                        key={sec.key}
                        className="py-3 flex items-center justify-between gap-3"
                      >
                        <span className="font-semibold text-slate-800">
                          {sec.label}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            saveStore((prev) => ({
                              ...prev,
                              propertyConfig: {
                                ...prev.propertyConfig,
                                sectionsVisibility: {
                                  ...prev.propertyConfig.sectionsVisibility,
                                  [sec.key]: !enabled,
                                },
                              },
                            }))
                          }
                          className={`rounded-full px-3 py-1 text-[11px] font-bold transition cursor-pointer ${
                            enabled
                              ? "bg-emerald-600 text-white"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {enabled ? "แสดงผล (Visible)" : "ซ่อนไว้ (Hidden)"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* =====================================================================
          MODAL: CREATE NEW ROOM / VILLA
      ====================================================================== */}
      {showAddRoomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">
                เพิ่มห้องพัก / วิลล่าใหม่เข้าสู่ระบบ
              </h2>
              <button
                type="button"
                onClick={() => setShowAddRoomModal(false)}
                className="h-8 w-8 rounded-lg hover:bg-slate-100 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewRoom} className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <StandardInput
                  label="รหัสห้อง *"
                  placeholder="เช่น V3, S2"
                  required
                  value={newRoomCode}
                  onChange={(e) => setNewRoomCode(e.target.value)}
                />
                <div className="col-span-2">
                  <StandardInput
                    label="ชื่อห้องพัก / วิลล่า *"
                    placeholder="เช่น Pool Villa V3 — Mountain Horizon"
                    required
                    value={newRoomNameTh}
                    onChange={(e) => setNewRoomNameTh(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    รูปแบบสต็อก
                  </label>
                  <select
                    value={newRoomInventoryMode}
                    onChange={(e) => {
                      const m = e.target.value as RoomInventoryMode;
                      setNewRoomInventoryMode(m);
                      if (m === "SINGLE_UNIT") setNewRoomTotalUnits(1);
                    }}
                    className="w-full h-11 rounded-xl border border-slate-300 px-2.5 text-xs font-bold"
                  >
                    <option value="SINGLE_UNIT">บ้านเดี่ยว (1 หลัง)</option>
                    <option value="ROOM_TYPE">Room Type (หลายห้อง)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    หมวดหมู่
                  </label>
                  <select
                    value={newRoomCategory}
                    onChange={(e) =>
                      setNewRoomCategory(e.target.value as RoomCategoryType)
                    }
                    className="w-full h-11 rounded-xl border border-slate-300 px-2.5 text-xs font-bold"
                  >
                    <option value="VILLA">Private Villa</option>
                    <option value="SUITE">Suite</option>
                    <option value="DELUXE">Deluxe</option>
                  </select>
                </div>

                <StandardInput
                  label="จำนวนยูนิต"
                  type="number"
                  min={1}
                  disabled={newRoomInventoryMode === "SINGLE_UNIT"}
                  value={newRoomTotalUnits}
                  onChange={(e) => setNewRoomTotalUnits(Number(e.target.value))}
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StandardInput
                  label="ราคาวันธรรมดา (฿)"
                  type="number"
                  value={newRoomBasePrice}
                  onChange={(e) => setNewRoomBasePrice(Number(e.target.value))}
                />
                <StandardInput
                  label="ราคาศุกร์-เสาร์ (฿)"
                  type="number"
                  value={newRoomWeekendPrice}
                  onChange={(e) =>
                    setNewRoomWeekendPrice(Number(e.target.value))
                  }
                />
                <StandardInput
                  label="ขนาด (ตร.ม.)"
                  type="number"
                  value={newRoomSizeSqm}
                  onChange={(e) => setNewRoomSizeSqm(Number(e.target.value))}
                />
                <StandardInput
                  label="พักสูงสุด (ท่าน)"
                  type="number"
                  value={newRoomMaxGuests}
                  onChange={(e) => setNewRoomMaxGuests(Number(e.target.value))}
                />
              </div>

              <StandardInput
                label="URL รูปภาพหลัก"
                value={newRoomImageUrl}
                onChange={(e) => setNewRoomImageUrl(e.target.value)}
              />

              <div className="pt-2 flex justify-end gap-2">
                <StandardButton
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddRoomModal(false)}
                >
                  ยกเลิก
                </StandardButton>
                <StandardButton type="submit" variant="primary" size="sm">
                  บันทึกห้องพักใหม่
                </StandardButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: MANUAL WALK-IN / ROOM BLOCK
      ====================================================================== */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">
                ลงคิวจองตรง / บล็อกห้องพัก (Walk-in / LINE)
              </h2>
              <button
                type="button"
                onClick={() => setShowManualModal(false)}
                className="h-8 w-8 rounded-lg hover:bg-slate-100 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateManualBooking} className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    เลือกห้องพัก
                  </label>
                  <select
                    value={manualRoomId}
                    onChange={(e) => setManualRoomId(e.target.value)}
                    className="w-full h-11 rounded-xl border border-slate-300 px-3 text-xs font-bold"
                  >
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.code} — {r.nameTh}
                      </option>
                    ))}
                  </select>
                </div>
                <StandardInput
                  label="จำนวนห้อง"
                  type="number"
                  min={1}
                  value={manualUnits}
                  onChange={(e) =>
                    setManualUnits(Math.max(1, Number(e.target.value)))
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <StandardInput
                  label="วันเช็คอิน"
                  type="date"
                  value={manualCheckIn}
                  onChange={(e) => setManualCheckIn(e.target.value)}
                />
                <StandardInput
                  label="วันเช็คเอาท์"
                  type="date"
                  value={manualCheckOut}
                  onChange={(e) => setManualCheckOut(e.target.value)}
                />
              </div>

              <StandardInput
                label="ชื่อผู้เข้าพัก / หมายเหตุ *"
                placeholder="เช่น คุณสมชาย (จองผ่าน LINE)"
                required
                value={manualGuestName}
                onChange={(e) => setManualGuestName(e.target.value)}
              />

              <StandardInput
                label="เบอร์โทรศัพท์"
                placeholder="08X-XXX-XXXX"
                value={manualGuestPhone}
                onChange={(e) => setManualGuestPhone(e.target.value)}
              />

              <div className="pt-2 flex justify-end gap-2">
                <StandardButton
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowManualModal(false)}
                >
                  ยกเลิก
                </StandardButton>
                <StandardButton type="submit" variant="primary" size="sm">
                  ยืนยันการล็อคห้องพัก
                </StandardButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          RIGHT SLIDE-OVER SLIP INSPECTOR DRAWER
      ====================================================================== */}
      {inspectedBooking && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-xs"
          onClick={() => setInspectedBookingId(null)}
        >
          <div
            className="w-full max-w-md bg-white h-full shadow-2xl border-l border-slate-200 p-5 overflow-y-auto flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <span className="font-mono text-xs font-bold text-slate-500">
                    {inspectedBooking.bookingCode}
                  </span>
                  <h3 className="text-base font-bold text-slate-900">
                    ตรวจสอบสลิปโอนเงิน ({inspectedBooking.guestName})
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setInspectedBookingId(null)}
                  className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {inspectedBooking.slipDataUrl && (
                <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                  <img
                    src={inspectedBooking.slipDataUrl}
                    alt="Bank Slip"
                    className="w-full max-h-96 object-contain"
                  />
                </div>
              )}

              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">ห้องพัก:</span>
                  <span className="font-bold">
                    {inspectedBooking.roomCode} (
                    {inspectedBooking.unitsBooked ?? 1} ห้อง)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">วันที่เข้าพัก:</span>
                  <span className="font-bold">
                    {inspectedBooking.checkIn} → {inspectedBooking.checkOut}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ยอดโอนสุทธิ:</span>
                  <span className="text-base font-extrabold text-emerald-700">
                    ฿{inspectedBooking.totalPriceThb.toLocaleString()}
                  </span>
                </div>
                {inspectedBooking.slipQrPayload && (
                  <div className="pt-2 border-t border-slate-200 text-[11px] font-mono text-emerald-700 break-all">
                    QR Payload: {inspectedBooking.slipQrPayload}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  handleConfirmBooking(inspectedBooking.id);
                  setInspectedBookingId(null);
                }}
                className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 text-xs font-bold cursor-pointer"
              >
                ✓ อนุมัติและยืนยันการจอง
              </button>
              <button
                type="button"
                onClick={() => {
                  handleCancelBooking(inspectedBooking.id);
                  setInspectedBookingId(null);
                }}
                className="rounded-xl border border-rose-200 text-rose-700 px-4 py-2.5 text-xs font-bold cursor-pointer"
              >
                ปฏิเสธ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
