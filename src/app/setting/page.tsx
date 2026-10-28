"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  Globe,
  Moon,
  Phone,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Sun,
  Tag,
  Utensils,
} from "lucide-react";
import { formatShortDate, useHotelApp } from "@/components/HotelAppShell";
import {
  StandardButton,
  StandardSectionHeader,
  StatusPill,
} from "@/components/ui/standards";

export default function SettingPage() {
  const {
    propertyConfig,
    rooms,
    bookings,
    addons,
    lang: language,
    setLang,
    theme,
    setTheme,
    savedCouponCodes,
    openCouponWallet,
    appliedCouponCode,
    selectedAddons,
    pendingAdminCount,
    openRoomDrawer,
    navigateToTab,
  } = useHotelApp();

  const [bookingLookupQuery, setBookingLookupQuery] = useState<string>("");

  const normalizedSearchQuery = bookingLookupQuery.trim().toLowerCase();
  const filteredBookings = bookings.filter((bookingRecord) => {
    if (!normalizedSearchQuery) return true;
    return (
      bookingRecord.bookingCode.toLowerCase().includes(normalizedSearchQuery) ||
      bookingRecord.guestPhone.toLowerCase().includes(normalizedSearchQuery) ||
      bookingRecord.guestName.toLowerCase().includes(normalizedSearchQuery)
    );
  });

  return (
    <>
      {/* 1. Open-Canvas Guest Profile Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="h-12 w-12 rounded-full bg-[var(--color-accent)] text-[var(--color-on-accent)] flex items-center justify-center font-bold ty-subtitle shrink-0">
            GU
          </div>
          <div className="min-w-0">
            <h1 className="ty-display truncate">
              {language === "th"
                ? "การตั้งค่า & การจองของฉัน"
                : "Settings & My Bookings"}
            </h1>
            <p className="ty-caption truncate flex items-center gap-1.5 mt-0.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[var(--color-accent)] shrink-0" />
              <span>
                {language === "th"
                  ? `${propertyConfig.nameTh} · สมาชิกจองตรง`
                  : `${propertyConfig.nameEn} · Direct Member`}
              </span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigateToTab("book")}
          className="btn-round-solid shrink-0 cursor-pointer"
        >
          <span>{language === "th" ? "จองห้องพัก" : "Book a Room"}</span>
        </button>
      </header>

      {/* 2. Appearance, Language & Quick Wallet (1-Layer Rows on Open Canvas) */}
      <section className="space-y-3">
        <StandardSectionHeader
          icon={<Settings className="w-5 h-5" />}
          title={
            language === "th"
              ? "การแสดงผล ภาษา & สิทธิพิเศษ"
              : "Preferences & Perks"
          }
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Theme Row */}
          <div className="rounded-[16px] bg-[var(--color-background-muted)] p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              {theme === "dark" ? (
                <Moon className="w-4 h-4 text-[var(--color-accent)] shrink-0" />
              ) : (
                <Sun className="w-4 h-4 text-[var(--color-accent)] shrink-0" />
              )}
              <div className="min-w-0">
                <p className="ty-body font-semibold truncate">
                  {language === "th" ? "โหมดสี" : "Theme"}
                </p>
                <p className="ty-caption truncate">
                  {theme === "light" ? "Light Mode" : "Dark Mode"}
                </p>
              </div>
            </div>

            <div className="inline-flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={`h-8 rounded-full px-3 ty-caption font-semibold inline-flex items-center gap-1.5 transition cursor-pointer ${
                  theme === "light"
                    ? "bg-[var(--color-accent)] text-[var(--color-on-accent)]"
                    : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                <span>Light</span>
              </button>
              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={`h-8 rounded-full px-3 ty-caption font-semibold inline-flex items-center gap-1.5 transition cursor-pointer ${
                  theme === "dark"
                    ? "bg-[var(--color-accent)] text-[var(--color-on-accent)]"
                    : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                <span>Dark</span>
              </button>
            </div>
          </div>

          {/* Language Row */}
          <div className="rounded-[16px] bg-[var(--color-background-muted)] p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <Globe className="w-4 h-4 text-[var(--color-accent)] shrink-0" />
              <div className="min-w-0">
                <p className="ty-body font-semibold truncate">
                  {language === "th" ? "ภาษา" : "Language"}
                </p>
                <p className="ty-caption truncate">
                  {language === "th" ? "ภาษาไทย (TH)" : "English (EN)"}
                </p>
              </div>
            </div>

            <div className="inline-flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setLang("th")}
                className={`h-8 rounded-full px-3 ty-caption font-semibold inline-flex items-center transition cursor-pointer ${
                  language === "th"
                    ? "bg-[var(--color-accent)] text-[var(--color-on-accent)]"
                    : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                TH
              </button>
              <button
                type="button"
                onClick={() => setLang("en")}
                className={`h-8 rounded-full px-3 ty-caption font-semibold inline-flex items-center transition cursor-pointer ${
                  language === "en"
                    ? "bg-[var(--color-accent)] text-[var(--color-on-accent)]"
                    : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                EN
              </button>
            </div>
          </div>

          {/* Coupon Bag (#c53829 Promo) */}
          <div className="rounded-[16px] bg-[var(--color-background-muted)] p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="ty-body font-semibold flex items-center gap-1.5 truncate">
                <ShoppingBag className="w-4 h-4 text-[var(--color-promo-text)] shrink-0" />
                <span>
                  {language === "th" ? "กระเป๋าคูปอง" : "Coupon Bag"}
                </span>
                {appliedCouponCode && (
                  <span className="badge-promo font-mono">
                    {appliedCouponCode}
                  </span>
                )}
              </p>
              <p className="ty-caption mt-0.5 truncate">
                {savedCouponCodes.length > 0
                  ? language === "th"
                    ? `เก็บไว้ ${savedCouponCodes.length} ใบ`
                    : `${savedCouponCodes.length} saved`
                  : language === "th"
                  ? "ยังไม่มีคูปองในกระเป๋า"
                  : "No coupons saved yet"}
              </p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <StandardButton
                variant="promo"
                size="sm"
                onClick={openCouponWallet}
              >
                <Tag className="w-3.5 h-3.5" />
                <span>
                  {language === "th"
                    ? `เปิด (${savedCouponCodes.length})`
                    : `Open (${savedCouponCodes.length})`}
                </span>
              </StandardButton>
            </div>
          </div>

          {/* In-Villa Add-ons */}
          <div className="rounded-[16px] bg-[var(--color-background-muted)] p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="ty-body font-semibold flex items-center gap-1.5 truncate">
                <Utensils className="w-4 h-4 text-[var(--color-accent)] shrink-0" />
                <span>
                  {language === "th" ? "บริการเสริมในวิลล่า" : "In-Villa Add-ons"}
                </span>
              </p>
              <p className="ty-caption mt-0.5 truncate">
                {selectedAddons.length > 0
                  ? addons
                      .filter((addon) => selectedAddons.includes(addon.id))
                      .map((addon) =>
                        language === "th"
                          ? addon.nameTh
                          : addon.nameEn || addon.nameTh
                      )
                      .join(", ")
                  : language === "th"
                  ? "หมูกระทะ ดินเนอร์ และสปาส่วนตัว"
                  : "Private terrace BBQ, dining & spa"}
              </p>
            </div>

            <StandardButton
              variant="primary"
              size="sm"
              onClick={() => navigateToTab("deal")}
              className="shrink-0"
            >
              <span>{language === "th" ? "เลือกดู" : "Explore"}</span>
            </StandardButton>
          </div>
        </div>
      </section>

      {/* 3. My Reservations & Booking Lookup (1-Layer Rows on Open Canvas) */}
      <section className="space-y-3">
        <StandardSectionHeader
          icon={<Calendar className="w-5 h-5" />}
          title={
            language === "th" ? "รายการจองของฉัน" : "My Reservations"
          }
          description={
            language === "th"
              ? "ค้นหาด้วยรหัสการจอง ชื่อผู้จอง หรือเบอร์โทรศัพท์"
              : "Search by booking reference, guest name, or phone"
          }
          action={
            <div className="relative w-full sm:w-60">
              <Search className="w-4 h-4 text-[var(--color-text-secondary)] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={bookingLookupQuery}
                onChange={(event) => setBookingLookupQuery(event.target.value)}
                placeholder={
                  language === "th"
                    ? "รหัสจอง / เบอร์โทร..."
                    : "Booking ref / phone..."
                }
                className="h-10 w-full rounded-full bg-[var(--color-background-muted)] pl-9 pr-4 ty-body text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:ring-2 focus:ring-[var(--color-accent)]/30 focus:outline-none"
              />
            </div>
          }
        />

        {filteredBookings.length === 0 ? (
          <div className="rounded-[16px] bg-[var(--color-background-muted)] py-8 px-4 text-center space-y-2.5">
            <p className="ty-body-muted">
              {language === "th"
                ? "ไม่พบรายการจองที่ตรงกับการค้นหา"
                : "No matching reservations found"}
            </p>
            <StandardButton
              variant="primary"
              size="sm"
              onClick={() => navigateToTab("book")}
            >
              <span>
                {language === "th" ? "ดูห้องพักที่ว่าง" : "Browse Rooms"}
              </span>
            </StandardButton>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredBookings.slice(0, 5).map((bookingRecord) => {
              const bookedRoom = rooms.find(
                (room) => room.id === bookingRecord.roomId
              );
              return (
                <div
                  key={bookingRecord.id}
                  className="rounded-[16px] bg-[var(--color-background-muted)] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono ty-caption font-bold text-[var(--color-accent)]">
                        #{bookingRecord.bookingCode}
                      </span>
                      <span className="ty-body font-semibold">
                        {language === "th"
                          ? bookingRecord.roomNameTh
                          : bookedRoom?.nameEn || bookingRecord.roomNameTh}{" "}
                        ({bookingRecord.roomCode})
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
                          ? language === "th"
                            ? "ยืนยันแล้ว"
                            : "Confirmed"
                          : bookingRecord.status === "PENDING_ADMIN"
                          ? language === "th"
                            ? "รอตรวจสลิป"
                            : "Pending Slip"
                          : bookingRecord.status === "HOLD_15_MIN"
                          ? language === "th"
                            ? "ล็อคห้อง 15 นาที"
                            : "15-Min Hold"
                          : language === "th"
                          ? "ยกเลิกแล้ว"
                          : "Cancelled"}
                      </StatusPill>
                    </div>
                    <p className="ty-caption">
                      {bookingRecord.guestName} ·{" "}
                      {formatShortDate(bookingRecord.checkIn, language)} –{" "}
                      {formatShortDate(bookingRecord.checkOut, language)} (
                      {bookingRecord.nights}{" "}
                      {language === "th" ? "คืน" : "nights"}) ·{" "}
                      <strong className="text-[var(--color-text-primary)]">
                        ฿{bookingRecord.totalPriceThb.toLocaleString()}
                      </strong>
                    </p>
                  </div>

                  {bookedRoom && bookingRecord.status === "HOLD_15_MIN" && (
                    <button
                      type="button"
                      onClick={() => openRoomDrawer(bookedRoom, "checkout")}
                      className="btn-round-solid shrink-0"
                    >
                      <span>
                        {language === "th"
                          ? "สแกน QR / แนบสลิป"
                          : "Scan QR / Slip"}
                      </span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 4. Stay Information & Hotel Studio Portal */}
      <section className="space-y-3">
        <StandardSectionHeader
          icon={<Clock className="w-5 h-5" />}
          title={
            language === "th"
              ? "ข้อมูลการเข้าพัก & ผู้ดูแลระบบ"
              : "Stay Info & Admin Studio"
          }
        />

        <div className="space-y-2">
          <div className="rounded-[16px] bg-[var(--color-background-muted)] p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="ty-body font-semibold">
                {language === "th"
                  ? "เวลาเช็คอิน – เช็คเอาท์"
                  : "Check-in & Check-out"}
              </p>
              <p className="ty-caption mt-0.5">
                Check-in {propertyConfig.checkInTime} · Check-out{" "}
                {propertyConfig.checkOutTime}
              </p>
            </div>

            <a
              href={`tel:${propertyConfig.phones[0]}`}
              className="btn-round-solid !h-9 !px-3.5 shrink-0"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>{propertyConfig.phones[0]}</span>
            </a>
          </div>

          <div className="rounded-[16px] bg-[var(--color-background-muted)] p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="ty-body font-semibold">
                {language === "th"
                  ? "สำหรับผู้ดูแลระบบที่พัก (Hotel Studio)"
                  : "Hotel Owner & Admin Studio"}
              </p>
              <p className="ty-caption mt-0.5">
                {language === "th"
                  ? "จัดการห้องพัก โดเมน .com อนุมัติสลิป QR และระบบ SaaS"
                  : "Manage rooms, custom .com domain, QR slips, and SaaS"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Link
                href="/login"
                className="h-9 px-3.5 rounded-full hover:bg-[var(--color-background-subtle)] ty-caption font-semibold inline-flex items-center transition"
              >
                {language === "th" ? "เข้าสู่ระบบ" : "Sign In"}
              </Link>
              <Link href="/admin" className="btn-round-solid !h-9 !px-3.5">
                <span>/admin</span>
                {pendingAdminCount > 0 && (
                  <span className="rounded-full bg-white/20 px-1.5 py-0.5 ty-caption font-bold">
                    {pendingAdminCount}
                  </span>
                )}
              </Link>
              <Link
                href="/super-admin"
                className="h-9 px-3.5 rounded-full hover:bg-[var(--color-background-subtle)] ty-caption font-semibold inline-flex items-center transition"
              >
                /super-admin
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
