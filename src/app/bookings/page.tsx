"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarCheck,
  ChevronRight,
  Compass,
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
import { WorkspaceSplitLayout } from "@/components/workspace/WorkspaceSplitLayout";
import type { BookingSummaryDto } from "@/types/cangaroom";

type BookingsTab = "bookings" | "wallet" | "account";

export default function BookingsAndAccountPage() {
  const router = useRouter();
  const {
    lang: language,
    theme,
    toggleTheme,
    setLang,
    user,
    refreshMe,
    walletCoupons,
  } = useHotelApp();

  const isTh = language === "th";

  const [activeTab, setActiveTab] = useState<BookingsTab>("bookings");
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");
  const [bookings, setBookings] = useState<BookingSummaryDto[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(true);
  const [lookupCode, setLookupCode] = useState("");
  const [lookupPhone, setLookupPhone] = useState("");
  const [lookupError, setLookupError] = useState<string | null>(null);

  const [uploadingBookingId, setUploadingBookingId] = useState<string | null>(
    null,
  );
  const [slipError, setSlipError] = useState<string | null>(null);

  // Quick contact form
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
        err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการโหลดใบจอง",
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
    void loadBookings();
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
    e: React.ChangeEvent<HTMLInputElement>,
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
        },
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "อัปโหลดสลิปไม่สำเร็จ");
      await loadBookings(lookupCode || undefined, lookupPhone || undefined);
    } catch (err) {
      setSlipError(
        err instanceof Error ? err.message : "อัปโหลดสลิปไม่สำเร็จ",
      );
    } finally {
      setUploadingBookingId(null);
    }
  };

  const navItems: Array<{
    id: BookingsTab;
    icon: typeof CalendarCheck;
    label: string;
    description: string;
    badge?: number;
  }> = [
    {
      id: "bookings",
      icon: CalendarCheck,
      label: isTh ? "การจองของฉัน" : "My bookings",
      description: isTh
        ? "ตรวจสอบสถานะใบจอง ค้นหาด้วยรหัส และแนบสลิป"
        : "Track stay bookings, lookup code & upload slip",
      badge: bookings.length > 0 ? bookings.length : undefined,
    },
    {
      id: "wallet",
      icon: TicketPercent,
      label: isTh ? "กระเป๋าคูปอง" : "Coupon wallet",
      description: isTh
        ? "คูปองส่วนลดที่เก็บไว้พร้อมใช้จองตรง 0% GP"
        : "Saved discount coupons ready for direct booking",
      badge: walletCoupons.length > 0 ? walletCoupons.length : undefined,
    },
    {
      id: "account",
      icon: Settings,
      label: isTh ? "ข้อมูลติดต่อ & การแสดงผล" : "Contact & display",
      description: isTh
        ? "ชื่อ-เบอร์โทรเริ่มต้นสำหรับการจอง ภาษา และโหมดสี"
        : "Default guest contact, language & appearance",
    },
  ];

  const activeMeta = navItems.find((item) => item.id === activeTab);

  return (
    <WorkspaceSplitLayout
      title={isTh ? "การจอง & คูปอง" : "Bookings & Wallet"}
      subtitle={
        user
          ? `${user.name} · ${user.email}`
          : isTh
            ? "ดูใบจองและคูปองทั้งหมดบน Nondii"
            : "Manage your bookings & coupons on Nondii"
      }
      onRootBack={() => {
        if (typeof window !== "undefined" && window.history.length > 1) {
          router.back();
        } else {
          router.push("/");
        }
      }}
      rootBackLabel={isTh ? "ย้อนกลับ" : "Go back"}
      activeId={activeTab}
      onSelect={(id) => {
        setActiveTab(id as BookingsTab);
        setMobileView("detail");
      }}
      mobileView={mobileView}
      onMobileBack={() => setMobileView("list")}
      mobileBackLabel={isTh ? "การจอง & คูปอง" : "Bookings"}
      mobileDetailTitle={activeMeta?.label}
      contentWidth="wide"
      navGroups={[
        {
          items: navItems.map((item) => ({
            id: item.id,
            label: item.label,
            description: item.description,
            icon: item.icon,
            badge: item.badge,
          })),
        },
      ]}
      sidebarFooter={
        <div className="space-y-1">
          <Link
            href="/"
            className="w-full px-3.5 py-2.5 rounded-[14px] hover:bg-[var(--color-background-muted)] flex items-center justify-between gap-3 ws-body-medium text-[var(--color-text-primary)] transition-colors"
          >
            <span className="flex items-center gap-3 min-w-0">
              <Compass
                className="w-[19px] h-[19px] text-[var(--color-accent)] shrink-0"
                strokeWidth={1.9}
              />
              <span className="truncate">
                {isTh ? "ค้นหาที่พัก & โปรเพิ่ม" : "Explore stays & deals"}
              </span>
            </span>
            <ArrowRight className="w-4 h-4 text-[var(--color-text-secondary)] shrink-0" />
          </Link>

          <Link
            href="/account"
            className="w-full px-3.5 py-2.5 rounded-[14px] hover:bg-[var(--color-background-muted)] flex items-center justify-between gap-3 ws-body-medium text-[var(--color-text-primary)] transition-colors"
          >
            <span className="flex items-center gap-3 min-w-0">
              <Settings
                className="w-[19px] h-[19px] text-[var(--color-text-secondary)] shrink-0"
                strokeWidth={1.9}
              />
              <span className="truncate">
                {isTh ? "ตั้งค่าบัญชีแบบเต็ม" : "Full account settings"}
              </span>
            </span>
            <ArrowRight className="w-4 h-4 text-[var(--color-text-secondary)] shrink-0" />
          </Link>
        </div>
      }
    >
      <div key={activeTab} className="cgr-desktop-tab-in min-w-0">
        {/* ─── TAB 1: BOOKINGS ─── */}
        {activeTab === "bookings" && (
          <div className="space-y-6">
            <div>
              <h2 className="ws-title">
                {isTh ? "การจองของฉัน" : "My bookings"} ({bookings.length})
              </h2>
              <p className="ws-caption mt-1">
                {isTh
                  ? "ตรวจสอบใบจองจากทุกที่พักบน Nondii หรือค้นหาด้วยรหัสการจอง + เบอร์โทร"
                  : "View stay bookings across Nondii or look up a reservation by code."}
              </p>
            </div>

            {/* Guest Booking Lookup Bar (Airbnb Grouped Inputs) */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void loadBookings(lookupCode, lookupPhone);
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
                      onChange={(e) =>
                        setLookupCode(e.target.value.toUpperCase())
                      }
                      placeholder="CGR-261117-1234"
                      className="uppercase"
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
                className="min-h-[52px] px-6 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] ws-body-strong inline-flex items-center justify-center gap-2 shrink-0 cursor-pointer transition-colors"
              >
                <Search className="w-4 h-4" />
                <span>ค้นหาใบจอง</span>
              </button>
            </form>

            {lookupError && (
              <p className="ws-caption-medium !text-[var(--color-error)]">
                {lookupError}
              </p>
            )}

            {isLoadingBookings ? (
              <div className="h-40 rounded-[20px] bg-[var(--color-background-muted)] animate-pulse" />
            ) : bookings.length === 0 ? (
              <div className="rounded-[20px] bg-[var(--color-background-muted)] p-8 text-center space-y-2.5">
                <h3 className="ws-subtitle">ยังไม่มีประวัติการจอง</h3>
                <p className="ws-caption">
                  {user
                    ? "เมื่อคุณจองที่พักบน Nondii ใบจองและคิวอาร์โค้ดเช็กอินจะแสดงที่นี่ทันที"
                    : "เข้าสู่ระบบ หรือกรอกรหัสใบจอง + เบอร์โทรด้านบนเพื่อตรวจสอบสถานะ"}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--color-border)]">
                {bookings.map((bk) => (
                  <div key={bk.id} className="py-6 first:pt-2 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <Link
                          href={`/${bk.hotelSlug}`}
                          className="ws-subtitle hover:underline text-[var(--color-accent)]"
                        >
                          {bk.hotelNameTh}
                        </Link>
                        <p className="ws-caption mt-0.5 tabular-nums">
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

        {/* ─── TAB 2: COUPON WALLET ─── */}
        {activeTab === "wallet" && (
          <div className="space-y-6">
            <div>
              <h2 className="ws-title">
                {isTh ? "กระเป๋าคูปอง" : "Coupon wallet"} ({walletCoupons.length})
              </h2>
              <p className="ws-caption mt-1">
                {isTh
                  ? "คูปองส่วนลดที่เก็บไว้พร้อมใช้ในหน้าจองห้องพัก 0% GP"
                  : "Saved discount coupons ready to redeem on direct bookings."}
              </p>
            </div>

            {walletCoupons.length === 0 ? (
              <div className="rounded-[20px] bg-[var(--color-background-muted)] p-8 text-center space-y-3">
                <h3 className="ws-subtitle">ยังไม่มีคูปองที่บันทึกไว้</h3>
                <Link
                  href="/"
                  className="h-10 px-5 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] ws-body-strong inline-flex items-center justify-center transition-colors"
                >
                  ไปดูคูปองและโปรที่พักทั้งหมด
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-[var(--color-border)]">
                {walletCoupons.map((c) => (
                  <div
                    key={c.id}
                    className="ws-row first:pt-2 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-full bg-[var(--color-accent-muted)] text-[var(--color-accent)] ws-badge">
                          {c.discountType === "PERCENT"
                            ? `ลด ${c.discountValue}%`
                            : `ลด ฿${c.discountValue.toLocaleString()}`}
                        </span>
                        <span className="ws-caption-medium text-[var(--color-text-primary)] tracking-wide">
                          {c.code}
                        </span>
                      </div>
                      <p className="ws-subtitle truncate">{c.hotelNameTh}</p>
                      <p className="ws-caption truncate">{c.titleTh}</p>
                    </div>

                    {c.usedAt ? (
                      <StatusPill variant="neutral">ใช้แล้ว</StatusPill>
                    ) : (
                      <Link
                        href={`/${c.hotelSlug}?coupon=${encodeURIComponent(
                          c.code,
                        )}`}
                        className="h-9 px-4 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] ws-badge inline-flex items-center gap-1 shrink-0 transition-colors"
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

        {/* ─── TAB 3: CONTACT & DISPLAY ─── */}
        {activeTab === "account" && (
          <div className="space-y-6 max-w-[680px]">
            <div>
              <h2 className="ws-title">
                {isTh ? "ข้อมูลติดต่อ & การแสดงผล" : "Contact & display"}
              </h2>
              <p className="ws-caption mt-1">
                {isTh
                  ? "กรอกชื่อ-เบอร์โทรเริ่มต้นเพื่อกรอกอัตโนมัติในหน้าจองห้องพัก"
                  : "Save default guest contact info and display preferences."}
              </p>
            </div>

            <div className="divide-y divide-[var(--color-border)]">
              {user && (
                <form
                  onSubmit={handleSaveAccount}
                  className="ws-row first:pt-2 space-y-4"
                >
                  <p className="ws-subtitle flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-[var(--color-accent)]" />
                    <span>ข้อมูลติดต่อสำหรับการจองอัตโนมัติ</span>
                  </p>
                  <StandardFieldGroup>
                    <StandardInput
                      grouped
                      label="ชื่อผู้เข้าพักเริ่มต้น"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                    />
                    <StandardInput
                      grouped
                      label="เบอร์โทรศัพท์เริ่มต้น"
                      type="tel"
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value)}
                    />
                  </StandardFieldGroup>
                  {profileFeedback && (
                    <p className="ws-caption-medium !text-[var(--color-success)]">
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

              <div className="ws-row flex items-center justify-between gap-4">
                <div>
                  <p className="ws-subtitle">โหมดสีหน้าจอ</p>
                  <p className="ws-caption mt-0.5">สลับระหว่างโหมดสว่างและมืด</p>
                </div>
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="h-9 px-4 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] ws-body-strong text-[var(--color-text-primary)] cursor-pointer transition-colors"
                >
                  {theme === "dark" ? "โหมดมืด" : "โหมดสว่าง"}
                </button>
              </div>

              <div className="ws-row flex items-center justify-between gap-4">
                <div>
                  <p className="ws-subtitle">ภาษา / Language</p>
                  <p className="ws-caption mt-0.5">เลือกภาษาที่แสดงบน Nondii</p>
                </div>
                <button
                  type="button"
                  onClick={() => setLang(language === "th" ? "en" : "th")}
                  className="h-9 px-4 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] ws-body-strong text-[var(--color-text-primary)] cursor-pointer transition-colors"
                >
                  {language === "th" ? "ภาษาไทย (TH)" : "English (EN)"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </WorkspaceSplitLayout>
  );
}
