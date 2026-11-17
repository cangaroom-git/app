"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  Search,
  Settings,
  TicketPercent,
  UserCheck,
} from "lucide-react";
import { formatShortDate } from "@/lib/dateFormatters";
import { scanSlipQrFromFile, uploadMediaFile } from "@/lib/slipScanner";
import { useHotelApp } from "@/components/HotelAppShell";
import {
  BookingDigitalVoucherCard,
  PromptPayPaymentCard,
} from "@/components/booking/PromptPayPaymentCard";
import { StandardButton, StandardInput, StatusPill } from "@/components/ui/standards";
import type { BookingSummaryDto } from "@/types/cangaroom";

type TripsTab = "bookings" | "wallet" | "account";

export default function TripsAndAccountPage() {
  const {
    lang: language,
    theme,
    toggleTheme,
    setLang,
    user,
    refreshMe,
    walletCoupons,
  } = useHotelApp();

  const [activeTab, setActiveTab] = useState<TripsTab>("bookings");
  const [bookings, setBookings] = useState<BookingSummaryDto[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(true);
  const [lookupCode, setLookupCode] = useState("");
  const [lookupPhone, setLookupPhone] = useState("");
  const [lookupError, setLookupError] = useState<string | null>(null);

  const [uploadingBookingId, setUploadingBookingId] = useState<string | null>(
    null
  );
  const [slipError, setSlipError] = useState<string | null>(null);

  // Account settings form
  const [profileName, setProfileName] = useState(user?.name || "");
  const [profilePhone, setProfilePhone] = useState(user?.phone || "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setProfileName(user.name || "");
      setProfilePhone(user.phone || "");
    }
  }, [user]);

  const loadBookings = useCallback(async (code?: string, phone?: string) => {
    setIsLoadingBookings(true);
    setLookupError(null);
    try {
      const qs = new URLSearchParams();
      if (code && phone) {
        qs.set("code", code.trim().toUpperCase());
        qs.set("phone", phone.trim());
      }
      const res = await fetch(`/api/bookings?${qs.toString()}`, {
        cache: "no-store",
      });
      const data = (await res.json()) as {
        bookings?: BookingSummaryDto[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "โหลดประวัติการจองไม่สำเร็จ");
      setBookings(data.bookings || []);
      if (code && phone && (data.bookings || []).length === 0) {
        setLookupError("ไม่พบใบจองที่ตรงกับรหัสและเบอร์โทรศัพท์นี้");
      }
    } catch (err) {
      setLookupError(
        err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการโหลดใบจอง"
      );
    } finally {
      setIsLoadingBookings(false);
    }
  }, []);

  useEffect(() => {
    loadBookings();
  }, [user?.id, loadBookings]);

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingProfile(true);
    setProfileFeedback(null);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profileName.trim(),
          phone: profilePhone.trim(),
        }),
      });
      if (res.ok) {
        await refreshMe();
        setProfileFeedback("บันทึกข้อมูลติดต่อเรียบร้อยแล้ว");
      }
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUploadSlipInline = async (
    bookingId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBookingId(bookingId);
    setSlipError(null);
    try {
      const [qr, url] = await Promise.all([
        scanSlipQrFromFile(file),
        uploadMediaFile(file, "slips"),
      ]);
      const res = await fetch(
        `/api/bookings/${encodeURIComponent(bookingId)}/slip`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slipImageUrl: url,
            slipQrPayload: qr.qrPayload,
          }),
        }
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "อัปโหลดสลิปไม่สำเร็จ");
      await loadBookings(lookupCode || undefined, lookupPhone || undefined);
    } catch (err) {
      setSlipError(
        err instanceof Error ? err.message : "อัปโหลดสลิปไม่สำเร็จ"
      );
    } finally {
      setUploadingBookingId(null);
    }
  };

  return (
    <div className="cgr-page-standard space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="ty-display">
            {language === "th"
              ? "การจอง & กระเป๋าคูปองของฉัน"
              : "My Trips & Coupon Wallet"}
          </h1>
          <p className="ty-caption mt-0.5">
            {user
              ? `${user.name} (${user.email})`
              : language === "th"
              ? "ดูใบจองจากทุกที่พักบน Cangaroom หรือค้นหาด้วยรหัสการจอง"
              : "Manage bookings across all Cangaroom properties"}
          </p>
        </div>

        <Link href="/" className="btn-fw-secondary">
          <span>{language === "th" ? "ค้นหาที่พักเพิ่ม" : "Explore Stays"}</span>
        </Link>
      </header>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-[var(--color-border)] overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab("bookings")}
          className={`py-3 -mb-px border-b-2 ty-body inline-flex items-center gap-2 cursor-pointer shrink-0 transition-colors ${
            activeTab === "bookings"
              ? "border-[var(--color-text-primary)] font-bold text-[var(--color-text-primary)]"
              : "border-transparent font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          }`}
        >
          <CalendarCheck className="w-4 h-4" />
          <span>การจองของฉัน ({bookings.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("wallet")}
          className={`py-3 -mb-px border-b-2 ty-body inline-flex items-center gap-2 cursor-pointer shrink-0 transition-colors ${
            activeTab === "wallet"
              ? "border-[var(--color-text-primary)] font-bold text-[var(--color-text-primary)]"
              : "border-transparent font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          }`}
        >
          <TicketPercent className="w-4 h-4" />
          <span>กระเป๋าคูปอง ({walletCoupons.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("account")}
          className={`py-3 -mb-px border-b-2 ty-body inline-flex items-center gap-2 cursor-pointer shrink-0 transition-colors ${
            activeTab === "account"
              ? "border-[var(--color-text-primary)] font-bold text-[var(--color-text-primary)]"
              : "border-transparent font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>ข้อมูลติดต่อ & ตั้งค่า</span>
        </button>
      </div>

      {/* TAB 1: BOOKINGS */}
      {activeTab === "bookings" && (
        <div className="space-y-5">
          {/* Guest Booking Lookup Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              loadBookings(lookupCode, lookupPhone);
            }}
            className="rounded-[16px] bg-[var(--color-background-muted)] p-4 flex flex-col sm:flex-row gap-2.5"
          >
            <input
              type="text"
              value={lookupCode}
              onChange={(e) => setLookupCode(e.target.value.toUpperCase())}
              placeholder="รหัสใบจอง เช่น CGR-261117-1234"
              className="h-10 flex-1 rounded-full bg-[var(--color-background-card)] px-4 ty-body font-mono uppercase focus:outline-none"
            />
            <input
              type="tel"
              value={lookupPhone}
              onChange={(e) => setLookupPhone(e.target.value)}
              placeholder="เบอร์โทรที่ใช้จอง"
              className="h-10 flex-1 rounded-full bg-[var(--color-background-card)] px-4 ty-body focus:outline-none"
            />
            <StandardButton type="submit" variant="primary" size="md">
              <Search className="w-4 h-4" />
              <span>ค้นหาใบจอง</span>
            </StandardButton>
          </form>

          {lookupError && (
            <p className="ty-caption font-semibold text-[var(--color-error)]">
              {lookupError}
            </p>
          )}

          {isLoadingBookings ? (
            <div className="h-40 rounded-[20px] bg-[var(--color-background-muted)] animate-pulse" />
          ) : bookings.length === 0 ? (
            <div className="rounded-[20px] bg-[var(--color-background-muted)] p-8 text-center space-y-2.5">
              <h2 className="ty-title">ยังไม่มีประวัติการจอง</h2>
              <p className="ty-caption">
                {user
                  ? "เมื่อคุณจองที่พักบน Cangaroom ใบจองและคิวอาร์โค้ดเช็กอินจะแสดงที่นี่ทันที"
                  : "เข้าสู่ระบบ หรือกรอกรหัสใบจอง + เบอร์โทรด้านบนเพื่อตรวจสอบสถานะ"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {bookings.map((bk) => (
                <div
                  key={bk.id}
                  className="rounded-[20px] bg-[var(--color-background-card)] border border-[var(--color-border)] p-4 sm:p-5 space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <Link
                        href={`/${bk.hotelSlug}`}
                        className="ty-subtitle font-bold hover:underline text-[var(--color-accent)]"
                      >
                        {bk.hotelNameTh}
                      </Link>
                      <p className="ty-caption">
                        #{bk.bookingCode} · {bk.roomCode} ·{" "}
                        {formatShortDate(bk.checkInDate, language)} –{" "}
                        {formatShortDate(bk.checkOutDate, language)}
                      </p>
                    </div>
                    <StatusPill
                      variant={
                        bk.status === "CONFIRMED" || bk.status === "COMPLETED"
                          ? "success"
                          : bk.status === "CANCELLED"
                          ? "error"
                          : "warning"
                      }
                    >
                      {bk.status === "HOLD_PENDING_PAYMENT"
                        ? "รอชำระเงิน & แนบสลิป"
                        : bk.status === "PENDING_VERIFICATION"
                        ? "แนบสลิปแล้ว · รอที่พักยืนยัน"
                        : bk.status === "CONFIRMED"
                        ? "ยืนยันการจองแล้ว"
                        : bk.status === "CANCELLED"
                        ? "ยกเลิกแล้ว"
                        : "เข้าพักสำเร็จ"}
                    </StatusPill>
                  </div>

                  {bk.status === "HOLD_PENDING_PAYMENT" ? (
                    <PromptPayPaymentCard
                      language={language}
                      promptPayId={bk.promptPayId}
                      promptPayAccountName={bk.promptPayAccountName}
                      amountThb={bk.netTotalThb}
                      isVerifyingSlip={uploadingBookingId === bk.id}
                      slipError={slipError}
                      slipFeedback={null}
                      onUploadSlip={(ev) => handleUploadSlipInline(bk.id, ev)}
                    />
                  ) : bk.status !== "CANCELLED" ? (
                    <BookingDigitalVoucherCard
                      booking={bk}
                      language={language}
                      formatShortDateFn={formatShortDate}
                    />
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: COUPON WALLET */}
      {activeTab === "wallet" && (
        <div className="space-y-3">
          {walletCoupons.length === 0 ? (
            <div className="rounded-[20px] bg-[var(--color-background-muted)] p-8 text-center space-y-3">
              <h2 className="ty-title">ยังไม่มีคูปองในกระเป๋า</h2>
              <Link href="/deal" className="btn-promo-solid inline-flex">
                ไปเก็บคูปองส่วนลดที่หน้า Deals
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {walletCoupons.map((c) => (
                <div
                  key={c.id}
                  className="rounded-[16px] bg-[var(--color-background-card)] border border-[var(--color-border)] p-4 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="badge-promo">
                        {c.discountType === "PERCENT"
                          ? `ลด ${c.discountValue}%`
                          : `ลด ฿${c.discountValue.toLocaleString()}`}
                      </span>
                      <span className="font-mono ty-caption font-bold">
                        {c.code}
                      </span>
                    </div>
                    <p className="ty-body font-bold truncate">{c.hotelNameTh}</p>
                    <p className="ty-caption truncate">{c.titleTh}</p>
                  </div>

                  {c.usedAt ? (
                    <StatusPill variant="neutral">ใช้แล้ว</StatusPill>
                  ) : (
                    <Link
                      href={`/${c.hotelSlug}?coupon=${encodeURIComponent(
                        c.code
                      )}`}
                      className="btn-round-solid !h-9 !px-3.5 shrink-0"
                    >
                      <span>จองเลย</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ACCOUNT & PREFERENCES */}
      {activeTab === "account" && (
        <div className="space-y-5 max-w-xl">
          {user && (
            <form
              onSubmit={handleSaveAccount}
              className="rounded-[20px] bg-[var(--color-background-card)] border border-[var(--color-border)] p-5 space-y-4"
            >
              <h2 className="ty-subtitle font-bold flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[var(--color-accent)]" />
                <span>ข้อมูลติดต่อสำหรับการจองอัตโนมัติ</span>
              </h2>
              <StandardInput
                label="ชื่อผู้เข้าพักเริ่มต้น"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
              />
              <StandardInput
                label="เบอร์โทรศัพท์เริ่มต้น"
                type="tel"
                value={profilePhone}
                onChange={(e) => setProfilePhone(e.target.value)}
              />
              {profileFeedback && (
                <p className="ty-caption font-semibold text-[var(--color-success)]">
                  {profileFeedback}
                </p>
              )}
              <StandardButton
                type="submit"
                variant="primary"
                disabled={savingProfile}
              >
                {savingProfile ? "กำลังบันทึก..." : "บันทึกข้อมูลติดต่อ"}
              </StandardButton>
            </form>
          )}

          <div className="rounded-[20px] bg-[var(--color-background-card)] border border-[var(--color-border)] p-5 space-y-3">
            <h2 className="ty-subtitle font-bold">การแสดงผลและภาษา</h2>
            <div className="flex items-center justify-between">
              <span className="ty-body">โหมดสีหน้าจอ</span>
              <button
                type="button"
                onClick={toggleTheme}
                className="btn-fw-secondary"
              >
                {theme === "dark" ? "Dark Mode" : "Light Mode"}
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span className="ty-body">ภาษา / Language</span>
              <button
                type="button"
                onClick={() => setLang(language === "th" ? "en" : "th")}
                className="btn-fw-secondary"
              >
                {language === "th" ? "ภาษาไทย (TH)" : "English (EN)"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

