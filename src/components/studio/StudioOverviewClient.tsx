"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  ChevronRight,
  Clock,
  ExternalLink,
  Eye,
  Heart,
  MapPin,
  MessageCircle,
  Plus,
  Receipt,
  Sparkles,
  TicketPercent,
  TrendingUp,
  Wand2,
} from "lucide-react";
import {
  AdminDataTable,
  type AdminColumn,
} from "@/components/admin/ui/AdminDataTable";
import {
  WorkspaceCompactToolbar,
  WorkspaceKpiBand,
  WorkspacePageHeader,
  WorkspaceSearchInput,
  WorkspaceSection,
  WorkspaceStatusPill,
  type WorkspaceKpiItem,
} from "@/components/workspace/WorkspacePrimitives";
import { getPlaceCategoryMeta } from "@/lib/placeCategories";
import { formatDateStr } from "@/lib/bookingMath";
import { formatShortDate } from "@/lib/dateFormatters";
import { getProvinceById } from "@/data/thailandProvinces";
import { StudioAiPromoSheet } from "@/components/studio/StudioAiPromoSheet";
import {
  StudioBookingDetailSheet,
  StudioManualBookingSheet,
} from "@/components/studio/StudioBookingDetailSheet";
import type { BookingSummaryDto, PinFeedItemDto } from "@/types/cangaroom";
import type { StudioPayload } from "@/components/studio/studioTypes";

type BookingFilterTab = "pending" | "today" | "upcoming" | "all";

const BOOKING_STATUS_LABELS: Record<string, string> = {
  HOLD_PENDING_PAYMENT: "รอโอนเงิน",
  PENDING_VERIFICATION: "รอตรวจสลิป",
  CONFIRMED: "ยืนยันแล้ว",
  COMPLETED: "เข้าพักแล้ว",
  CANCELLED: "ยกเลิก",
};

function getThaiGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "สวัสดีตอนเช้า";
  if (hour < 17) return "สวัสดีตอนบ่าย";
  return "สวัสดีตอนเย็น";
}

interface StudioOverviewClientProps {
  data: StudioPayload;
  buildHref: (path: string) => string;
  onReload: () => Promise<void>;
  onNotify: (msg: string) => void;
}

/**
 * Unified Nondii Clean Minimal Overview (`/studio`)
 * Uses the exact same `<WorkspacePageHeader />`, `<WorkspaceKpiBand />`, `<WorkspaceSection />`,
 * and `.ws-*` typography / 8px spatial tokens as `/admin`.
 */
export function StudioOverviewClient({
  data,
  buildHref,
  onReload,
  onNotify,
}: StudioOverviewClientProps) {
  const { hotel, stats, bookings, pins, coupons, branches = [] } = data;
  const isDirectBooking = hotel.merchantMode !== "PROFILE_ONLY";
  const catMeta = getPlaceCategoryMeta(hotel.placeCategory);
  const todayStr = useMemo(() => formatDateStr(new Date()), []);
  const greeting = getThaiGreeting();

  // Modals state
  const [isAiPromoOpen, setIsAiPromoOpen] = useState(false);
  const [editingPin, setEditingPin] = useState<PinFeedItemDto | null>(null);
  const [selectedBooking, setSelectedBooking] =
    useState<BookingSummaryDto | null>(null);
  const [isManualBookingOpen, setIsManualBookingOpen] = useState(false);

  // Filters
  const [bookingTab, setBookingTab] = useState<BookingFilterTab>(() =>
    stats.pendingBookingsCount > 0 ? "pending" : "upcoming",
  );
  const [bookingSearch, setBookingSearch] = useState("");
  const [promoSearch, setPromoSearch] = useState("");

  const totalPinViews =
    stats.totalPinViews ??
    pins.reduce((sum, p) => sum + (p.viewsCount ?? 0), 0);
  const totalExternalClicks =
    stats.totalExternalClicks ??
    pins.reduce((sum, p) => sum + (p.externalClickCount ?? 0), 0);
  const totalEngagement =
    stats.boardSavesCount + stats.contactClicksTotal + totalExternalClicks;
  const activePromosCount =
    stats.activePromosCount ??
    pins.filter(
      (p) => p.publishStatus === "PUBLISHED" && Boolean(p.promoHeadlineTh),
    ).length + coupons.filter((c) => c.isActive).length;

  const bookingCounts = useMemo(() => {
    const pending = bookings.filter(
      (b) =>
        b.status === "PENDING_VERIFICATION" ||
        b.status === "HOLD_PENDING_PAYMENT",
    ).length;
    const todayCheckIn = bookings.filter(
      (b) =>
        b.status === "CONFIRMED" && b.checkInDate.slice(0, 10) === todayStr,
    ).length;
    const upcoming = bookings.filter(
      (b) =>
        (b.status === "CONFIRMED" || b.status === "PENDING_VERIFICATION") &&
        b.checkOutDate.slice(0, 10) >= todayStr,
    ).length;
    return { pending, todayCheckIn, upcoming, all: bookings.length };
  }, [bookings, todayStr]);

  const filteredBookings = useMemo(() => {
    const q = bookingSearch.trim().toLowerCase();
    return bookings
      .filter((b) => {
        if (bookingTab === "pending") {
          if (
            b.status !== "PENDING_VERIFICATION" &&
            b.status !== "HOLD_PENDING_PAYMENT"
          ) {
            return false;
          }
        } else if (bookingTab === "today") {
          if (
            b.status !== "CONFIRMED" ||
            b.checkInDate.slice(0, 10) !== todayStr
          ) {
            return false;
          }
        } else if (bookingTab === "upcoming") {
          if (
            (b.status !== "CONFIRMED" &&
              b.status !== "PENDING_VERIFICATION") ||
            b.checkOutDate.slice(0, 10) < todayStr
          ) {
            return false;
          }
        }
        if (!q) return true;
        return (
          b.bookingCode.toLowerCase().includes(q) ||
          b.guestName.toLowerCase().includes(q) ||
          b.guestPhone.toLowerCase().includes(q) ||
          b.roomCode.toLowerCase().includes(q)
        );
      })
      .slice(0, 12);
  }, [bookings, bookingTab, bookingSearch, todayStr]);

  const filteredPromos = useMemo(() => {
    const q = promoSearch.trim().toLowerCase();
    return pins
      .filter((p) => {
        if (!q) return true;
        return (
          p.titleTh.toLowerCase().includes(q) ||
          (p.promoHeadlineTh || "").toLowerCase().includes(q) ||
          (p.promoCode || "").toLowerCase().includes(q)
        );
      })
      .slice(0, 15);
  }, [pins, promoSearch]);

  const kpiCards: WorkspaceKpiItem[] = isDirectBooking
    ? [
        {
          icon: Receipt,
          label: "รอตรวจสลิป / เช็กอินวันนี้",
          value:
            bookingCounts.pending > 0
              ? `${bookingCounts.pending} รอตรวจ`
              : `${bookingCounts.todayCheckIn} เช็กอิน`,
          sublabel:
            bookingCounts.pending > 0
              ? `เช็กอินวันนี้ ${bookingCounts.todayCheckIn} รายการ`
              : "ไม่มีสลิปค้างตรวจในขณะนี้",
          urgent: bookingCounts.pending > 0,
          href: buildHref("/studio/calendar"),
        },
        {
          icon: TrendingUp,
          label: "ยอดจองตรง 0% GP",
          value: `฿${stats.confirmedRevenueThb.toLocaleString()}`,
          sublabel: `ประหยัดค่า GP OTA ~฿${stats.estimatedOtaGpSavedThb.toLocaleString()}`,
          urgent: false,
          href: buildHref("/studio/calendar"),
        },
        {
          icon: TicketPercent,
          label: "โปรโมชั่นที่กำลังใช้งาน",
          value: activePromosCount,
          sublabel: `Wishlist ${stats.boardSavesCount.toLocaleString()} · เข้าชม ${totalPinViews.toLocaleString()}`,
          urgent: activePromosCount === 0,
          href: buildHref("/studio/promos"),
        },
      ]
    : [
        {
          icon: Eye,
          label: "ยอดเข้าชมโปรไฟล์ & โปร",
          value: totalPinViews,
          sublabel: `จาก ${pins.length} การ์ดโปรโมชั่นและโพสต์ของร้าน`,
          urgent: false,
          href: buildHref("/studio/promos"),
        },
        {
          icon: Heart,
          label: "ยอดบันทึก Wishlist & คลิกใช้สิทธิ์",
          value: totalEngagement,
          sublabel: `Wishlist ${stats.boardSavesCount} · คลิกติดต่อ ${stats.contactClicksTotal} · คลิกโปร ${totalExternalClicks}`,
          urgent: false,
          href: buildHref("/studio/promos"),
        },
        {
          icon: TicketPercent,
          label: "โปรโมชั่นที่กำลังใช้งาน",
          value: activePromosCount,
          sublabel:
            activePromosCount > 0
              ? `คูปอง ${coupons.filter((c) => c.isActive).length} · คลิกเพื่อจัดการโปร`
              : "ยังไม่มีโปร — กดลงโปรด้วย AI ได้เลย",
          urgent: activePromosCount === 0,
          href: buildHref("/studio/promos"),
        },
      ];

  const bookingColumns: AdminColumn<BookingSummaryDto>[] = [
    {
      header: "รหัสจอง",
      cell: (b) => (
        <span className="ws-body-strong tabular-nums">#{b.bookingCode}</span>
      ),
    },
    {
      header: "ผู้เข้าพัก",
      cell: (b) => (
        <div className="min-w-0">
          <p className="ws-body-medium truncate">{b.guestName}</p>
          <p className="ws-caption">{b.guestPhone}</p>
        </div>
      ),
    },
    {
      header: "ห้องพัก",
      cell: (b) => (
        <span className="ws-body">
          {b.roomCode} · {b.roomNameTh}
        </span>
      ),
    },
    {
      header: "วันที่เข้าพัก",
      cell: (b) => (
        <span className="ws-caption whitespace-nowrap">
          {formatShortDate(b.checkInDate, "th")} →{" "}
          {formatShortDate(b.checkOutDate, "th")} ({b.nights} คืน)
        </span>
      ),
    },
    {
      header: "ยอดสุทธิ",
      className: "text-right",
      cell: (b) => (
        <span className="ws-body-strong tabular-nums">
          ฿{b.netTotalThb.toLocaleString()}
        </span>
      ),
    },
    {
      header: "สถานะ",
      cell: (b) => {
        const isPending =
          b.status === "PENDING_VERIFICATION" ||
          b.status === "HOLD_PENDING_PAYMENT";
        const tone = isPending
          ? "warning"
          : b.status === "CONFIRMED" || b.status === "COMPLETED"
            ? "primary"
            : "neutral";
        return (
          <WorkspaceStatusPill tone={tone}>
            {BOOKING_STATUS_LABELS[b.status] || b.status}
          </WorkspaceStatusPill>
        );
      },
    },
  ];

  const promoColumns: AdminColumn<PinFeedItemDto>[] = [
    {
      header: "รูป",
      className: "w-14",
      cell: (p) => (
        <div className="w-10 h-10 rounded-[10px] overflow-hidden bg-[var(--color-background-muted)] flex items-center justify-center shrink-0">
          {p.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={p.coverImageUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <TicketPercent className="w-4 h-4 text-[var(--color-text-secondary)]" />
          )}
        </div>
      ),
    },
    {
      header: "ชื่อโปรโมชั่น / โพสต์",
      cell: (p) => {
        const primaryTitle = p.promoHeadlineTh || p.titleTh;
        const showSubtitle =
          Boolean(p.promoHeadlineTh) && p.promoHeadlineTh !== p.titleTh;
        return (
          <div className="min-w-0 max-w-[320px]">
            <p className="ws-body-medium truncate">{primaryTitle}</p>
            {showSubtitle && <p className="ws-caption truncate">{p.titleTh}</p>}
          </div>
        );
      },
    },
    {
      header: "โค้ด",
      cell: (p) =>
        p.promoCode ? (
          <WorkspaceStatusPill tone="neutral">{p.promoCode}</WorkspaceStatusPill>
        ) : (
          <span className="ws-caption opacity-40">—</span>
        ),
    },
    {
      header: "หมดเขต",
      cell: (p) =>
        p.promoExpiresAt ? (
          <span className="ws-caption whitespace-nowrap tabular-nums">
            {formatShortDate(p.promoExpiresAt, "th")}
          </span>
        ) : (
          <span className="ws-caption opacity-60">ไม่กำหนด</span>
        ),
    },
    {
      header: "เข้าชม",
      className: "text-right",
      cell: (p) => (
        <span className="ws-body tabular-nums">
          {(p.viewsCount ?? 0).toLocaleString()}
        </span>
      ),
    },
    {
      header: "บันทึก",
      className: "text-right",
      cell: (p) => (
        <span className="ws-body tabular-nums">
          {(p.savesCount ?? 0).toLocaleString()}
        </span>
      ),
    },
    {
      header: "สถานะ",
      cell: (p) => (
        <WorkspaceStatusPill
          tone={p.publishStatus === "PUBLISHED" ? "primary" : "warning"}
        >
          {p.publishStatus === "PUBLISHED" ? "เผยแพร่แล้ว" : "ฉบับร่าง"}
        </WorkspaceStatusPill>
      ),
    },
  ];

  return (
    <div className="cgr-admin-page">
      <div className="cgr-admin-body py-8 overflow-auto no-scrollbar">
        <div style={{ overflowX: "clip" }}>
          <WorkspacePageHeader
            eyebrow={
              <span className="inline-flex flex-wrap items-center gap-2">
                <span>{greeting}</span>
                <span>·</span>
                <span>
                  {catMeta.labelTh} (
                  {isDirectBooking ? "จองตรง 0% GP" : "โปรไฟล์ & โปรโมชั่น"})
                </span>
                {hotel.verificationStatus === "VERIFIED" ? (
                  <span className="inline-flex items-center gap-1 text-[var(--color-accent)] font-semibold">
                    <BadgeCheck className="w-3.5 h-3.5" />
                    <span>ยืนยันแล้ว</span>
                  </span>
                ) : (
                  <WorkspaceStatusPill tone="warning">
                    <Clock className="w-3 h-3 mr-1" />
                    รอตรวจสอบ
                  </WorkspaceStatusPill>
                )}
              </span>
            }
            title={hotel.nameTh}
            actions={
              <>
                {isDirectBooking && (
                  <button
                    type="button"
                    disabled={data.rooms.length === 0}
                    onClick={() => setIsManualBookingOpen(true)}
                    className="h-10 px-4 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] ws-body-strong inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>จอง Walk-in / LINE</span>
                  </button>
                )}

                <Link
                  href={`/${encodeURIComponent(hotel.slug)}`}
                  target="_blank"
                  className="hidden sm:inline-flex h-10 px-4 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] ws-body-strong items-center gap-1.5 transition-colors"
                >
                  <span>ดูหน้าร้าน</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setEditingPin(null);
                    setIsAiPromoOpen(true);
                  }}
                  className="h-10 px-5 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] ws-body-strong inline-flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <Sparkles className="w-4 h-4 text-[var(--color-accent-yellow)]" />
                  <span>ลงโปรด้วย AI</span>
                </button>
              </>
            }
          />

          <WorkspaceKpiBand items={kpiCards} />

          {isDirectBooking ? (
            <WorkspaceSection
              title="รายการจอง & ตรวจสลิปวันนี้"
              subtitle="คลิกที่แถวรายการจองเพื่อเปิดดูสลิปโอนเงิน PromptPay และกดยืนยันห้องพัก"
            >
              <WorkspaceCompactToolbar
                bordered={false}
                compactPadding
                searchValue={bookingSearch}
                onSearchChange={setBookingSearch}
                searchPlaceholder="ค้นหาชื่อแขก / รหัสจอง..."
                filters={
                  <>
                    {(
                      [
                        {
                          id: "pending",
                          label: "รอตรวจสลิป",
                          count: bookingCounts.pending,
                        },
                        {
                          id: "today",
                          label: "เช็กอินวันนี้",
                          count: bookingCounts.todayCheckIn,
                        },
                        {
                          id: "upcoming",
                          label: "กำลังจะเข้าพัก",
                          count: bookingCounts.upcoming,
                        },
                        { id: "all", label: "ทั้งหมด", count: bookingCounts.all },
                      ] as Array<{
                        id: BookingFilterTab;
                        label: string;
                        count: number;
                      }>
                    ).map((t) => {
                      const active = bookingTab === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setBookingTab(t.id)}
                          className={`h-9 px-3.5 rounded-full ws-caption-medium inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
                            active
                              ? "bg-[var(--color-accent)] !text-[var(--color-on-accent)] font-semibold"
                              : "bg-[var(--color-background-muted)] !text-[var(--color-text-primary)] hover:bg-[var(--color-background-subtle)]"
                          }`}
                        >
                          <span>{t.label}</span>
                          {t.count > 0 && (
                            <span
                              className={`px-1.5 py-0.5 rounded-full ws-badge leading-none ${
                                active
                                  ? "bg-white/20 text-white"
                                  : t.id === "pending"
                                    ? "bg-[var(--color-accent-yellow)] text-[#182334]"
                                    : "bg-white/80 text-[var(--color-text-secondary)]"
                              }`}
                            >
                              {t.count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </>
                }
              />

              <AdminDataTable
                data={filteredBookings}
                columns={bookingColumns}
                onRowClick={(bk) => setSelectedBooking(bk)}
                renderMobileRow={(b) => {
                  const isPending =
                    b.status === "PENDING_VERIFICATION" ||
                    b.status === "HOLD_PENDING_PAYMENT";
                  const tone = isPending
                    ? "warning"
                    : b.status === "CONFIRMED" || b.status === "COMPLETED"
                      ? "primary"
                      : "neutral";
                  return (
                    <div className="py-4 flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <p className="ws-subtitle truncate">{b.guestName}</p>
                          <span className="ws-caption tabular-nums shrink-0">
                            #{b.bookingCode}
                          </span>
                        </div>
                        <p className="ws-caption truncate">
                          {b.roomCode} · {b.roomNameTh}
                        </p>
                        <p className="ws-caption tabular-nums">
                          {formatShortDate(b.checkInDate, "th")} →{" "}
                          {formatShortDate(b.checkOutDate, "th")} ({b.nights} คืน)
                        </p>
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-1.5">
                        <span className="ws-subtitle tabular-nums">
                          ฿{b.netTotalThb.toLocaleString()}
                        </span>
                        <WorkspaceStatusPill tone={tone}>
                          {BOOKING_STATUS_LABELS[b.status] || b.status}
                        </WorkspaceStatusPill>
                      </div>
                    </div>
                  );
                }}
                emptyLabel={
                  bookingTab === "pending"
                    ? "ไม่มีใบจองรอตรวจสลิปในขณะนี้ — คลิก 'ทั้งหมด' เพื่อดูประวัติการจอง"
                    : "ยังไม่มีรายการจองที่ตรงกับตัวกรองนี้"
                }
              />
            </WorkspaceSection>
          ) : (
            <WorkspaceSection>
              <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-8 items-start">
                <div className="rounded-[20px] bg-[var(--color-background-muted)] p-6 space-y-4">
                  <WorkspaceStatusPill tone="warning">
                    <Wand2 className="w-3.5 h-3.5 mr-1.5" />
                    AI QUICK PROMO DROP
                  </WorkspaceStatusPill>
                  <div className="space-y-1.5">
                    <h2 className="ws-title">
                      โยนรูปโปสเตอร์หรือข้อความโปรโมชั่น ให้ AI ลงฟีดให้ใน 10 วินาที
                    </h2>
                    <p className="ws-body text-[var(--color-text-secondary)]">
                      ระบบจะแกะพาดหัวส่วนลด โค้ด ราคา และวันหมดเขตให้อัตโนมัติ พร้อมเผยแพร่บนหน้า{" "}
                      <span className="ws-body-strong">
                        nondii.com/{hotel.slug}
                      </span>{" "}
                      ทันที
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPin(null);
                        setIsAiPromoOpen(true);
                      }}
                      className="h-11 px-5 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] ws-body-strong inline-flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <Sparkles className="w-4 h-4 text-[var(--color-accent-yellow)]" />
                      <span>ลงโปรโมชั่นใหม่ด้วย AI</span>
                    </button>
                    <Link
                      href={buildHref("/studio/listings/about")}
                      className="h-11 px-5 rounded-full bg-[var(--color-background-card)] hover:bg-[var(--color-background-subtle)] ws-body-strong inline-flex items-center gap-1.5 transition-colors"
                    >
                      <MapPin className="w-4 h-4 text-[var(--color-accent)]" />
                      <span>แก้ไขข้อมูลร้าน &amp; พิกัด</span>
                    </Link>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="ws-subtitle">ช่องทางที่ลูกค้าติดต่อร้าน</h3>
                  <div className="divide-y divide-[var(--color-border)]">
                    <div className="py-3.5 flex items-center justify-between">
                      <span className="ws-body text-[var(--color-text-secondary)] inline-flex items-center gap-2">
                        <MessageCircle className="w-4 h-4 text-[var(--color-accent)]" />
                        คลิกทัก LINE
                      </span>
                      <span className="ws-body-strong tabular-nums">
                        {stats.contactClicksByChannel.LINE.toLocaleString()}
                      </span>
                    </div>
                    <div className="py-3.5 flex items-center justify-between">
                      <span className="ws-body text-[var(--color-text-secondary)]">
                        คลิก Facebook / Instagram
                      </span>
                      <span className="ws-body-strong tabular-nums">
                        {stats.contactClicksByChannel.FACEBOOK_MESSENGER.toLocaleString()}
                      </span>
                    </div>
                    <div className="py-3.5 flex items-center justify-between">
                      <span className="ws-body text-[var(--color-text-secondary)]">
                        คลิกโทรออก
                      </span>
                      <span className="ws-body-strong tabular-nums">
                        {stats.contactClicksByChannel.PHONE.toLocaleString()}
                      </span>
                    </div>
                    <div className="py-3.5 flex items-center justify-between">
                      <span className="ws-body text-[var(--color-text-secondary)]">
                        คลิกไปหน้าใช้สิทธิ์โปร
                      </span>
                      <span className="ws-body-strong text-[var(--color-accent)] tabular-nums">
                        {totalExternalClicks.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {branches.length > 0 && (
                    <div className="pt-2">
                      <p className="ws-caption-medium mb-2">
                        สาขาที่เปิดใช้งาน ({branches.length} สาขา)
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {branches.slice(0, 6).map((br) => {
                          const prov = getProvinceById(br.provinceId);
                          return (
                            <WorkspaceStatusPill key={br.id} tone="neutral">
                              {br.branchNameTh}
                              {prov
                                ? ` (${prov.nameTh.split("(")[0].trim()})`
                                : ""}
                            </WorkspaceStatusPill>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </WorkspaceSection>
          )}

          <WorkspaceSection
            title={
              <span className="inline-flex items-center gap-3">
                <span>โปรโมชั่นและการ์ดของร้าน ({pins.length})</span>
                <Link
                  href={buildHref("/studio/promos")}
                  className="ws-caption-medium text-[var(--color-accent)] hover:underline inline-flex items-center gap-1"
                >
                  <span>จัดการทั้งหมด</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </span>
            }
            subtitle="คลิกที่แถวโปรโมชั่นเพื่อแก้ไขพาดหัว โค้ด หรือวันหมดเขตได้ทันที"
            action={
              <WorkspaceSearchInput
                value={promoSearch}
                onChange={setPromoSearch}
                placeholder="ค้นหาโปรโมชั่นของร้าน..."
              />
            }
            bordered={false}
          >
            <AdminDataTable
              data={filteredPromos}
              columns={promoColumns}
              onRowClick={(pin) => {
                setEditingPin(pin);
                setIsAiPromoOpen(true);
              }}
              renderMobileRow={(p) => {
                const primaryTitle = p.promoHeadlineTh || p.titleTh;
                const showSubtitle =
                  Boolean(p.promoHeadlineTh) && p.promoHeadlineTh !== p.titleTh;
                return (
                  <div className="py-3.5 flex items-center gap-3.5">
                    <div className="w-14 h-14 rounded-[14px] overflow-hidden bg-[var(--color-background-muted)] flex items-center justify-center shrink-0">
                      {p.coverImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.coverImageUrl}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <TicketPercent className="w-5 h-5 text-[var(--color-text-secondary)]" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="ws-subtitle truncate">{primaryTitle}</p>
                        <WorkspaceStatusPill
                          tone={
                            p.publishStatus === "PUBLISHED"
                              ? "primary"
                              : "warning"
                          }
                        >
                          {p.publishStatus === "PUBLISHED"
                            ? "เผยแพร่แล้ว"
                            : "ฉบับร่าง"}
                        </WorkspaceStatusPill>
                      </div>

                      {showSubtitle && (
                        <p className="ws-caption truncate">{p.titleTh}</p>
                      )}

                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 ws-caption">
                        {p.promoCode && (
                          <span className="px-2 py-0.5 rounded-full bg-[var(--color-background-muted)] ws-badge text-[var(--color-text-primary)]">
                            {p.promoCode}
                          </span>
                        )}
                        <span className="tabular-nums">
                          {p.promoExpiresAt
                            ? `หมดเขต ${formatShortDate(p.promoExpiresAt, "th")}`
                            : "ไม่กำหนดวันหมดเขต"}
                        </span>
                        <span className="inline-flex items-center gap-1 tabular-nums">
                          <Eye className="w-3.5 h-3.5" />
                          {(p.viewsCount ?? 0).toLocaleString()}
                        </span>
                        <span className="inline-flex items-center gap-1 tabular-nums">
                          <Heart className="w-3.5 h-3.5" />
                          {(p.savesCount ?? 0).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-[var(--color-text-secondary)] shrink-0" />
                  </div>
                );
              }}
              getViewUrl={() => `/${hotel.slug}`}
              emptyLabel="ยังไม่มีโปรโมชั่นในร้านของคุณ — กดปุ่ม 'ลงโปรด้วย AI' ด้านบนเพื่อสร้างโปรแรกได้เลย"
            />
          </WorkspaceSection>
        </div>
      </div>

      {/* ═══ NONDII CENTERED-DESKTOP / MOBILE BOTTOM-SHEET MODALS ═══ */}
      <StudioAiPromoSheet
        isOpen={isAiPromoOpen}
        onClose={() => {
          setIsAiPromoOpen(false);
          setEditingPin(null);
        }}
        hotel={hotel}
        editingPin={editingPin}
        onSaved={(msg) => {
          onNotify(msg);
          void onReload();
        }}
      />

      <StudioBookingDetailSheet
        booking={selectedBooking}
        hotelSlug={hotel.slug}
        onClose={() => setSelectedBooking(null)}
        onUpdated={(msg) => {
          onNotify(msg);
          void onReload();
        }}
      />

      {isDirectBooking && (
        <StudioManualBookingSheet
          isOpen={isManualBookingOpen}
          onClose={() => setIsManualBookingOpen(false)}
          data={data}
          onCreated={(msg) => {
            onNotify(msg);
            void onReload();
          }}
        />
      )}
    </div>
  );
}
