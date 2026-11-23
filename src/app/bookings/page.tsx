"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarCheck,
  ChevronRight,
  Search,
  Settings,
  TicketPercent,
  UserCheck,
} from "lucide-react";
import { formatShortDate } from "@/lib/dateFormatters";
import { useHotelApp } from "@/components/HotelAppShell";
import {
  BookingDigitalVoucherCard,
  PromptPayPaymentCard,
} from "@/components/booking/PromptPayPaymentCard";
import {
  StandardButton,
  StandardFieldGroup,
  StandardInput,
  StatusPill,
} from "@/components/ui/standards";
import type { BookingSummaryDto } from "@/types/cangaroom";

type BookingsTab = "bookings" | "wallet" | "account";

export default function BookingsAndAccountPage() {
  const {
    lang: language,
    theme,
    toggleTheme,
    setLang,
    user,
    refreshMe,
    walletCoupons,
  } = useHotelApp();

  const [activeTab, setActiveTab] = useState<BookingsTab>("bookings");
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
    if (!user?.id) {
      setIsLoadingBookings(false);
      return;
    }
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
      const { scanSlipQrFromFile, uploadMediaFile } = await import(
        "@/lib/slipScanner"
      );
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
              : "My Bookings & Coupon Wallet"}
          </h1>
          <p className="ty-caption mt-0.5">
            {user
              ? `${user.name} (${user.email})`
              : language === "th"
              ? "ดูใบจองจากทุกที่พักบน Nondii หรือค้นหาด้วยรหัสการจอง"
              : "Manage bookings across all Nondii properties"}
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
          {/* Guest Booking Lookup Bar (Unified Airbnb Grouped Inputs) */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              loadBookings(lookupCode, lookupPhone);
            }}
            className="flex flex-col sm:flex-row items-stretch gap-3"
          >
            <div className="flex-1 min-w-0">
              <StandardFieldGroup>
                <div className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x divide-y sm:divide-y-0 divide-[#b0b0b0] dark:divide-[var(--color-border-emphasized)]">
                  <StandardInput
                    grouped
                    label="รหัสใบจอง"
                    type="text"
                    value={lookupCode}
                    onChange={(e) => setLookupCode(e.target.value.toUpperCase())}
                    placeholder="CGR-261117-1234"
                    className="font-mono uppercase"
                  />
                  <StandardInput
                    grouped
                    label="เบอร์โทรศัพท์ที่ใช้จอง"
                    type="tel"
                    value={lookupPhone}
                    onChange={(e) => setLookupPhone(e.target.value)}
                    placeholder="08X-XXX-XXXX"
                  />
                </div>
              </StandardFieldGroup>
            </div>
            <button
              type="submit"
              className="min-h-[56px] px-6 rounded-[12px] bg-[#222222] hover:bg-[#3f3f3f] dark:bg-[#f5f5f5] dark:hover:bg-[#e5e5e5] !text-white dark:!text-[#222222] text-[14.5px] font-semibold inline-flex items-center justify-center gap-2 shrink-0 cursor-pointer transition-colors"
            >
              <Search className="w-4 h-4" />
              <span>ค้นหาใบจอง</span>
            </button>
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
                  ? "เมื่อคุณจองที่พักบน Nondii ใบจองและคิวอาร์โค้ดเช็กอินจะแสดงที่นี่ทันที"
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
              <h2 className="ty-title">ยังไม่มีคูปองที่บันทึกไว้</h2>
              <Link href="/" className="btn-round-solid inline-flex">
                ไปดูคูปองและโปรที่พักทั้งหมด
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
                      <ChevronRight className="w-3.5 h-3.5" />
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
