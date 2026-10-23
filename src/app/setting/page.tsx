"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Sun,
  Moon,
  Globe,
  Tag,
  Utensils,
  Phone,
  Search,
  Calendar,
  Settings,
} from "lucide-react";
import {
  useHotelApp,
  formatShortDate,
} from "@/components/HotelAppShell";
import {
  StandardCard,
  StandardSectionHeader,
} from "@/components/ui/standards";

export default function SettingPage() {
  const {
    propertyConfig,
    rooms,
    bookings,
    addons,
    lang,
    setLang,
    theme,
    setTheme,
    appliedCouponCode,
    selectedAddons,
    pendingAdminCount,
    openRoomDrawer,
    navigateToTab,
  } = useHotelApp();

  const [bookingLookupQuery, setBookingLookupQuery] = useState<string>("");

  const q = bookingLookupQuery.trim().toLowerCase();
  const matchedBookings = bookings.filter((b) => {
    if (!q) return true;
    return (
      b.bookingCode.toLowerCase().includes(q) ||
      b.guestPhone.toLowerCase().includes(q) ||
      b.guestName.toLowerCase().includes(q)
    );
  });

  return (
    <>
      {/* =====================================================================
          FEED CARD 1: GUEST PROFILE & DIRECT BOOKING HUB
      ====================================================================== */}
      <StandardCard>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="h-14 w-14 rounded-full bg-[var(--color-accent)] text-[var(--color-on-accent)] flex items-center justify-center font-bold text-[16px] shrink-0">
              GU
            </div>
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-neutral)] px-2.5 py-0.5 ty-caption font-semibold mb-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>DIRECT BOOKING MEMBER</span>
              </div>
              <h1 className="ty-display truncate">
                {lang === "th"
                  ? "การตั้งค่า & ข้อมูลการจองของคุณ"
                  : "Settings & My Bookings"}
              </h1>
              <p className="ty-body-muted truncate">
                {lang === "th"
                  ? `จัดการโหมดสี ภาษา และตรวจสอบสถานะการจองของ ${propertyConfig.nameTh}`
                  : `Manage theme, language, and reservation status at ${propertyConfig.nameEn}`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigateToTab("room")}
            className="btn-round-solid shrink-0"
          >
            <span>{lang === "th" ? "จองห้องพักเพิ่ม →" : "Book a Room →"}</span>
          </button>
        </div>
      </StandardCard>

      {/* =====================================================================
          FEED CARD 2: APPEARANCE (DARK / LIGHT MODE) & LANGUAGE PREFERENCES
      ====================================================================== */}
      <StandardCard>
        <StandardSectionHeader
          icon={<Settings className="w-5 h-5" />}
          eyebrow="APPEARANCE & PREFERENCES"
          title={
            lang === "th"
              ? "ตั้งค่าการแสดงผลและภาษา"
              : "Appearance & Language"
          }
          description={
            lang === "th"
              ? "เลือกโหมดพื้นหลังสีขาวสะอาดตา (Light Mode) หรือโหมดมืดถนอมสายตา (Dark Mode)"
              : "Choose between clean white Light Mode or sleek Dark Mode"
          }
        />

        <div className="divide-y divide-[var(--color-border)] pt-2">
          {/* Theme Mode Row */}
          <div className="fw-setting-row flex-wrap">
            <div className="flex items-center gap-3">
              {theme === "dark" ? (
                <Moon className="w-5 h-5" />
              ) : (
                <Sun className="w-5 h-5" />
              )}
              <div>
                <p className="ty-body font-semibold">
                  {lang === "th"
                    ? "โหมดสีของแอป (Theme Mode)"
                    : "Application Theme"}
                </p>
                <p className="ty-caption">
                  {theme === "light"
                    ? lang === "th"
                      ? "กำลังใช้ Light Mode (พื้นหลังสีขาวมาตรฐาน)"
                      : "Currently using Light Mode"
                    : lang === "th"
                    ? "กำลังใช้ Dark Mode (พื้นหลังสีเข้มถนอมสายตา)"
                    : "Currently using Dark Mode"}
                </p>
              </div>
            </div>

            <div className="inline-flex items-center rounded-full bg-[var(--color-background-muted)] p-1 border border-[var(--color-border)]">
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={`rounded-full px-3.5 py-1.5 text-[14px] font-semibold inline-flex items-center gap-1.5 transition cursor-pointer ${
                  theme === "light"
                    ? "bg-[var(--color-accent)] text-[var(--color-on-accent)]"
                    : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                <Sun className="w-4 h-4" />
                <span>{lang === "th" ? "สว่าง (Light)" : "Light"}</span>
              </button>
              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={`rounded-full px-3.5 py-1.5 text-[14px] font-semibold inline-flex items-center gap-1.5 transition cursor-pointer ${
                  theme === "dark"
                    ? "bg-[var(--color-accent)] text-[var(--color-on-accent)]"
                    : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                <Moon className="w-4 h-4" />
                <span>{lang === "th" ? "มืด (Dark)" : "Dark"}</span>
              </button>
            </div>
          </div>

          {/* Language Row */}
          <div className="fw-setting-row flex-wrap !border-b-0">
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5" />
              <div>
                <p className="ty-body font-semibold">
                  {lang === "th" ? "ภาษาที่แสดงผล (Language)" : "Language"}
                </p>
                <p className="ty-caption">
                  {lang === "th"
                    ? "แสดงข้อมูลห้องพักและเรทราคาเป็นภาษาไทย"
                    : "Display room details and rates in English"}
                </p>
              </div>
            </div>

            <div className="inline-flex items-center rounded-full bg-[var(--color-background-muted)] p-1 border border-[var(--color-border)]">
              <button
                type="button"
                onClick={() => setLang("th")}
                className={`rounded-full px-3.5 py-1.5 text-[14px] font-semibold transition cursor-pointer ${
                  lang === "th"
                    ? "bg-[var(--color-accent)] text-[var(--color-on-accent)]"
                    : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                ไทย (TH)
              </button>
              <button
                type="button"
                onClick={() => setLang("en")}
                className={`rounded-full px-3.5 py-1.5 text-[14px] font-semibold transition cursor-pointer ${
                  lang === "en"
                    ? "bg-[var(--color-accent)] text-[var(--color-on-accent)]"
                    : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                English (EN)
              </button>
            </div>
          </div>
        </div>
      </StandardCard>

      {/* =====================================================================
          FEED CARD 3: MY RESERVATIONS & BOOKING LOOKUP
      ====================================================================== */}
      <StandardCard>
        <StandardSectionHeader
          icon={<Calendar className="w-5 h-5" />}
          eyebrow="MY RESERVATIONS"
          title={
            lang === "th"
              ? "รายการจองห้องพักของฉัน"
              : "My Reservations"
          }
          description={
            lang === "th"
              ? "ค้นหาด้วยรหัสการจอง (เช่น SPN-1234) ชื่อผู้จอง หรือเบอร์โทรศัพท์"
              : "Search by booking reference (e.g. SPN-1234), guest name, or phone number"
          }
          action={
            <div className="relative w-full sm:w-60">
              <Search className="w-4 h-4 text-[var(--color-text-secondary)] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={bookingLookupQuery}
                onChange={(e) => setBookingLookupQuery(e.target.value)}
                placeholder={
                  lang === "th"
                    ? "ค้นหารหัสจอง / เบอร์โทร..."
                    : "Booking ref / phone..."
                }
                className="h-10 w-full rounded-full border border-[var(--color-border-emphasized)] bg-[var(--color-background-muted)] pl-9 pr-4 text-[14px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:border-[var(--color-text-primary)] focus:outline-none"
              />
            </div>
          }
        />

        {matchedBookings.length === 0 ? (
          <div className="py-8 text-center space-y-3">
            <p className="ty-body-muted">
              {lang === "th"
                ? "ยังไม่มีรายการจองที่ตรงกับการค้นหา"
                : "No matching reservations found"}
            </p>
            <button
              type="button"
              onClick={() => navigateToTab("room")}
              className="btn-fw-secondary"
            >
              {lang === "th"
                ? "ดูห้องพักที่ว่างพร้อมจอง →"
                : "Browse Available Rooms →"}
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border)] pt-2">
            {matchedBookings.slice(0, 5).map((bk) => {
              const bookedRoom = rooms.find((r) => r.id === bk.roomId);
              return (
                <div
                  key={bk.id}
                  className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[var(--color-background-muted)] px-2.5 py-0.5 font-mono text-[12px] font-bold">
                        {bk.bookingCode}
                      </span>
                      <span className="ty-body font-semibold">
                        {lang === "th"
                          ? bk.roomNameTh
                          : bookedRoom?.nameEn || bk.roomNameTh}{" "}
                        ({bk.roomCode})
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${
                          bk.status === "CONFIRMED"
                            ? "bg-[var(--color-success-muted)] text-[var(--color-success)]"
                            : bk.status === "PENDING_ADMIN"
                            ? "bg-[var(--color-warning-muted)] text-[var(--color-warning)]"
                            : bk.status === "HOLD_15_MIN"
                            ? "bg-[var(--color-accent)] text-[var(--color-on-accent)]"
                            : "bg-[var(--color-error-muted)] text-[var(--color-error)]"
                        }`}
                      >
                        {bk.status === "CONFIRMED"
                          ? lang === "th"
                            ? "ยืนยันการจองแล้ว"
                            : "Confirmed"
                          : bk.status === "PENDING_ADMIN"
                          ? lang === "th"
                            ? "รอแอดมินตรวจสลิป"
                            : "Pending Slip Verification"
                          : bk.status === "HOLD_15_MIN"
                          ? lang === "th"
                            ? "ล็อคห้อง 15 นาที (รอชำระเงิน)"
                            : "15-Min Hold (Awaiting Payment)"
                          : lang === "th"
                          ? "ยกเลิกแล้ว"
                          : "Cancelled"}
                      </span>
                    </div>
                    <p className="ty-caption">
                      {lang === "th" ? "ผู้จอง: " : "Guest: "}
                      {bk.guestName} ·{" "}
                      {lang === "th" ? "เข้าพัก " : "Stay "}
                      {formatShortDate(bk.checkIn, lang)} –{" "}
                      {formatShortDate(bk.checkOut, lang)} ({bk.nights}{" "}
                      {lang === "th" ? "คืน" : "nights"}) ·{" "}
                      {lang === "th" ? "ยอดสุทธิ " : "Net Total "}
                      <strong className="text-[var(--color-text-primary)]">
                        ฿{bk.totalPriceThb.toLocaleString()}
                      </strong>
                    </p>
                  </div>

                  {bookedRoom && bk.status === "HOLD_15_MIN" && (
                    <button
                      type="button"
                      onClick={() => openRoomDrawer(bookedRoom, "booking")}
                      className="btn-round-solid shrink-0"
                    >
                      <span>
                        {lang === "th"
                          ? "สแกน QR / แนบสลิป →"
                          : "Scan QR / Upload Slip →"}
                      </span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </StandardCard>

      {/* =====================================================================
          FEED CARD 4: SAVED COUPON & IN-VILLA ADD-ONS SUMMARY
      ====================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StandardCard className="flex flex-col justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="ty-caption font-semibold uppercase">
                ACTIVE PROMO CODE
              </span>
              <Tag className="w-4 h-4" />
            </div>
            <h3 className="ty-subtitle">
              {appliedCouponCode
                ? lang === "th"
                  ? `กำลังใช้โค้ด: ${appliedCouponCode}`
                  : `Active Code: ${appliedCouponCode}`
                : lang === "th"
                ? "ยังไม่ได้เลือกคูปองส่วนลด"
                : "No promo code applied"}
            </h3>
            <p className="ty-caption">
              {lang === "th"
                ? "ระบบจะนำไปหักลดราคาห้องพักในขั้นตอนสรุปยอดจองโดยอัตโนมัติ"
                : "Discounts are automatically applied at checkout"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigateToTab("deal")}
            className="btn-fw-secondary w-full"
          >
            {lang === "th"
              ? "ดูคูปองส่วนลดทั้งหมด →"
              : "Browse Promo Codes →"}
          </button>
        </StandardCard>

        <StandardCard className="flex flex-col justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="ty-caption font-semibold uppercase">
                IN-VILLA ADD-ONS
              </span>
              <Utensils className="w-4 h-4" />
            </div>
            <h3 className="ty-subtitle">
              {selectedAddons.length > 0
                ? lang === "th"
                  ? `เลือกบริการเสริมไว้ ${selectedAddons.length} รายการ`
                  : `${selectedAddons.length} add-on(s) selected`
                : lang === "th"
                ? "ยังไม่ได้เลือกบริการเสริม"
                : "No add-ons selected yet"}
            </h3>
            <p className="ty-caption truncate">
              {selectedAddons.length > 0
                ? addons
                    .filter((a) => selectedAddons.includes(a.id))
                    .map((a) => (lang === "th" ? a.nameTh : a.nameEn))
                    .join(", ")
                : lang === "th"
                ? "สั่งชุดหมูกระทะริมระเบียง ดินเนอร์ หรือสปาล่วงหน้าได้"
                : "Pre-order private terrace Thai BBQ, dining, or spa sets"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigateToTab("deal")}
            className="btn-fw-secondary w-full"
          >
            {lang === "th"
              ? "ดูโปรโมชั่นบริการเสริม →"
              : "Explore Add-on Packages →"}
          </button>
        </StandardCard>
      </div>

      {/* =====================================================================
          FEED CARD 5: STAY INFORMATION, CONCIERGE CONTACT & ADMIN LINK
      ====================================================================== */}
      <StandardCard>
        <h2 className="ty-title pb-2">
          {lang === "th"
            ? "ข้อมูลการเข้าพัก & ช่องทางติดต่อที่พัก"
            : "Stay Information & Resort Contact"}
        </h2>

        <div className="divide-y divide-[var(--color-border)]">
          <div className="fw-setting-row">
            <div>
              <p className="ty-body font-semibold">
                {lang === "th"
                  ? "เวลาเช็คอิน / เช็คเอาท์มาตรฐาน"
                  : "Standard Check-in & Check-out"}
              </p>
              <p className="ty-caption mt-0.5">
                Check-in {propertyConfig.checkInTime} · Check-out{" "}
                {propertyConfig.checkOutTime}
              </p>
            </div>
            <span className="rounded-full bg-[var(--color-background-muted)] px-3 py-1 ty-caption font-semibold">
              {lang === "th" ? "เวลามาตรฐาน" : "Standard"}
            </span>
          </div>

          <div className="fw-setting-row">
            <div>
              <p className="ty-body font-semibold">
                {lang === "th"
                  ? "ติดต่อฝ่ายต้อนรับ / สอบถามเส้นทาง"
                  : "Front Desk & Directions"}
              </p>
              <p className="ty-caption mt-0.5">
                {lang === "th" ? "โทร: " : "Tel: "}
                {propertyConfig.phones.join(", ")} · LINE:{" "}
                {propertyConfig.lineId}
              </p>
            </div>
            <a
              href={`tel:${propertyConfig.phones[0]}`}
              className="btn-fw-secondary shrink-0"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>{lang === "th" ? "โทรออก" : "Call Now"}</span>
            </a>
          </div>

          <div className="fw-setting-row !border-b-0">
            <div>
              <p className="ty-body font-semibold">
                {lang === "th"
                  ? "สำหรับผู้ดูแลระบบโรงแรม (Hotel Owner Studio)"
                  : "Hotel Owner & Admin Studio"}
              </p>
              <p className="ty-caption mt-0.5">
                {lang === "th"
                  ? "จัดการห้องพัก โดเมน .com อนุมัติสลิป QR และระบบ SaaS"
                  : "Manage rooms, custom .com domain, QR slips, and SaaS portals"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Link href="/login" className="btn-round-border">
                <span>{lang === "th" ? "เข้าสู่ระบบ (/login)" : "Sign In"}</span>
              </Link>
              <Link href="/admin" className="btn-round-solid">
                <span>/admin</span>
                {pendingAdminCount > 0 && (
                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-bold">
                    {pendingAdminCount}
                  </span>
                )}
              </Link>
              <Link href="/super-admin" className="btn-round-border">
                <span>/super-admin</span>
              </Link>
            </div>
          </div>
        </div>
      </StandardCard>
    </>
  );
}
