"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BedDouble,
  BookOpen,
  Building2,
  CalendarCheck,
  ExternalLink,
  ImagePlus,
  LayoutDashboard,
  Plus,
  RefreshCw,
  Tag,
} from "lucide-react";
import { useHotelApp } from "@/components/HotelAppShell";
import { StudioOverviewTab } from "@/components/studio/StudioOverviewTab";
import { StudioBookingsAndBlocksTab } from "@/components/studio/StudioBookingsAndBlocksTab";
import { StudioRoomsAndAddonsTab } from "@/components/studio/StudioRoomsAndAddonsTab";
import { StudioPinsAndFacebookTab } from "@/components/studio/StudioPinsAndFacebookTab";
import { StudioBlogPostsTab } from "@/components/studio/StudioBlogPostsTab";
import { StudioCouponsAndProfileTab } from "@/components/studio/StudioCouponsAndProfileTab";
import type { StudioPayload } from "@/components/studio/studioTypes";
import { StandardButton, StatusPill } from "@/components/ui/standards";

type StudioTabId =
  | "overview"
  | "bookings"
  | "rooms"
  | "pins"
  | "posts"
  | "coupons";

function StudioWorkspaceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedHotelSlug = searchParams.get("hotel");

  const { user, isCheckingSession } = useHotelApp();

  const [activeTab, setActiveTab] = useState<StudioTabId>("overview");
  const [studioData, setStudioData] = useState<StudioPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const showNotice = useCallback((msg: string) => {
    setNotice(msg);
    window.setTimeout(() => setNotice(null), 3200);
  }, []);

  const loadStudioData = useCallback(async () => {
    if (!user) {
      setStudioData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorStatus(null);
    setErrorMessage(null);
    try {
      const qs = requestedHotelSlug
        ? `?hotel=${encodeURIComponent(requestedHotelSlug)}`
        : "";
      const res = await fetch(`/api/studio/hotel${qs}`, { cache: "no-store" });
      if (!res.ok) {
        const errJson = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setErrorStatus(res.status);
        setErrorMessage(errJson.error || "ไม่สามารถโหลดข้อมูล Hotel Studio ได้");
        setStudioData(null);
        return;
      }
      const payload = (await res.json()) as StudioPayload;
      setStudioData(payload);
    } catch {
      setErrorStatus(500);
      setErrorMessage("เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล");
    } finally {
      setIsLoading(false);
    }
  }, [user, requestedHotelSlug]);

  useEffect(() => {
    if (isCheckingSession) return;
    void loadStudioData();
  }, [isCheckingSession, loadStudioData]);

  const handleSwitchHotel = (nextSlug: string) => {
    if (!nextSlug) return;
    router.replace(`/studio?hotel=${encodeURIComponent(nextSlug)}`);
  };

  if (isCheckingSession) {
    return (
      <div className="cgr-page-standard py-10 text-center ty-body">
        กำลังตรวจสอบสิทธิ์เข้าใช้งาน Hotel Studio...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="cgr-page-form py-8">
        <div className="rounded-[20px] bg-[var(--color-background-card)] border border-[var(--color-border)] p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-[14px] bg-[var(--color-background-muted)] text-[var(--color-text-primary)] flex items-center justify-center mx-auto">
            <Building2 className="w-6 h-6" />
          </div>
          <h1 className="ty-title">Cangaroom Hotel Studio (0% GP)</h1>
          <p className="ty-body text-[var(--color-text-secondary)]">
            เข้าสู่ระบบด้วยบัญชีเจ้าของที่พักเพื่อจัดการห้องพัก ตรวจสลิป PromptPay
            ซิงก์โพสต์ Facebook และออกคูปองส่วนลดฟรีตลอดชีพ
          </p>
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            <Link href="/login?next=/studio" className="btn-round-solid">
              เข้าสู่ระบบ
            </Link>
            <Link href="/register-hotel" className="btn-fw-secondary">
              สมัครเปิดหน้าร้านที่พักฟรี
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!isLoading && errorStatus === 404) {
    return (
      <div className="cgr-page-form py-8">
        <div className="rounded-[20px] bg-[var(--color-background-card)] border border-[var(--color-border)] p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-[14px] bg-[var(--color-background-muted)] text-[var(--color-text-primary)] flex items-center justify-center mx-auto">
            <Building2 className="w-6 h-6" />
          </div>
          <h1 className="ty-title">คุณยังไม่มีหน้าร้านที่พักบน Cangaroom</h1>
          <p className="ty-body text-[var(--color-text-secondary)]">
            สร้างหน้าโปรไฟล์ที่พักของคุณเองได้ฟรี 100% พร้อมระบบรับจองตรง 0% GP
            รับเงินเข้า PromptPay โดยตรง และซิงก์ภาพสวยๆ จาก Facebook Page
          </p>
          <div className="flex justify-center pt-2">
            <Link href="/register-hotel" className="btn-round-solid">
              <Plus className="w-4 h-4" />
              <span>เปิดหน้าร้านที่พักฟรีทันที</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!isLoading && errorStatus && errorStatus !== 404) {
    return (
      <div className="cgr-page-form py-8">
        <div className="rounded-[20px] bg-[var(--color-background-card)] border border-[var(--color-border)] p-7 text-center space-y-4">
          <p className="ty-subtitle font-bold text-[var(--color-error)]">
            {errorMessage || "ไม่สามารถเปิดดูหน้าจัดการที่พักนี้ได้"}
          </p>
          <div className="flex justify-center gap-2">
            <StandardButton
              variant="secondary"
              size="sm"
              onClick={() => router.replace("/studio")}
            >
              กลับไปที่พักหลักของฉัน
            </StandardButton>
            <StandardButton
              variant="primary"
              size="sm"
              onClick={() => void loadStudioData()}
            >
              ลองใหม่
            </StandardButton>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading || !studioData) {
    return (
      <div className="cgr-page-standard space-y-4">
        <div className="h-24 rounded-[20px] bg-[var(--color-background-muted)] animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="h-28 rounded-[20px] bg-[var(--color-background-muted)] animate-pulse" />
          <div className="h-28 rounded-[20px] bg-[var(--color-background-muted)] animate-pulse" />
          <div className="h-28 rounded-[20px] bg-[var(--color-background-muted)] animate-pulse" />
          <div className="h-28 rounded-[20px] bg-[var(--color-background-muted)] animate-pulse" />
        </div>
      </div>
    );
  }

  const tabs: Array<{
    id: StudioTabId;
    label: string;
    icon: React.ReactNode;
    badge?: number;
  }> = [
    {
      id: "overview",
      label: "ภาพรวม ROI",
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: "bookings",
      label: "ใบจอง & ปิดวัน",
      icon: <CalendarCheck className="w-4 h-4" />,
      badge: studioData.stats.pendingBookingsCount,
    },
    {
      id: "rooms",
      label: "ห้องพัก & บริการเสริม",
      icon: <BedDouble className="w-4 h-4" />,
    },
    {
      id: "pins",
      label: "Pins & Facebook Sync",
      icon: <ImagePlus className="w-4 h-4" />,
      badge: studioData.stats.pendingSyncPinsCount,
    },
    {
      id: "posts",
      label: "บทความ Blog (SEO)",
      icon: <BookOpen className="w-4 h-4" />,
      badge: studioData.posts?.length ?? 0,
    },
    {
      id: "coupons",
      label: "คูปอง & โปรไฟล์/PromptPay",
      icon: <Tag className="w-4 h-4" />,
    },
  ];

  const ownedHotels = user.ownedHotels || [];

  return (
    <div className="cgr-page-standard space-y-6">
      {/* Floating Toast Notification */}
      {notice && (
        <div className="fixed bottom-20 lg:bottom-6 right-6 z-50 rounded-[10px] bg-[#111111] !text-white dark:bg-[#f5f5f5] dark:!text-[#111111] border border-[var(--color-border)] px-4 py-2.5 text-[13px] font-semibold">
          {notice}
        </div>
      )}

      {/* Studio Header + Multi-Property Switcher */}
      <header className="rounded-[20px] bg-[var(--color-background-card)] border border-[var(--color-border)] p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill variant="accent">Hotel Studio · 0% GP</StatusPill>
            <StatusPill
              variant={
                studioData.hotel.verificationStatus === "VERIFIED"
                  ? "success"
                  : studioData.hotel.verificationStatus === "PENDING_REVIEW"
                  ? "warning"
                  : "error"
              }
            >
              <span>
                {studioData.hotel.verificationStatus === "VERIFIED"
                  ? "Verified จริง 100%"
                  : studioData.hotel.verificationStatus === "PENDING_REVIEW"
                  ? "รอตรวจยืนยันตัวตน"
                  : "ถูกระงับชั่วคราว"}
              </span>
            </StatusPill>
          </div>
          <h1 className="ty-display truncate">{studioData.hotel.nameTh}</h1>
          <div className="flex flex-wrap items-center gap-3 ty-caption">
            <Link
              href={`/${studioData.hotel.slug}`}
              className="inline-flex items-center gap-1 font-semibold text-[var(--color-text-primary)] hover:underline"
            >
              <span>ดูหน้าร้านจริง: cangaroom.com/{studioData.hotel.slug}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
            {user.role === "SUPER_ADMIN" && (
              <Link
                href="/super-admin"
                className="font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:underline"
              >
                เปิด Super Admin Console
              </Link>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {ownedHotels.length > 0 && (
            <select
              aria-label="เลือกที่พักที่ต้องการจัดการ"
              className="fw-input text-sm font-semibold min-w-[210px]"
              value={studioData.hotel.slug}
              onChange={(e) => handleSwitchHotel(e.target.value)}
            >
              {ownedHotels.map((item) => (
                <option key={item.id} value={item.slug}>
                  {item.nameTh}
                  {item.pendingBookingsCount > 0
                    ? ` (${item.pendingBookingsCount} รอตรวจสลิป)`
                    : ""}
                </option>
              ))}
              {!ownedHotels.some((h) => h.slug === studioData.hotel.slug) && (
                <option value={studioData.hotel.slug}>
                  {studioData.hotel.nameTh}
                </option>
              )}
            </select>
          )}

          <Link href="/register-hotel" className="btn-fw-secondary">
            <Plus className="w-4 h-4" />
            <span>เพิ่มที่พักใหม่</span>
          </Link>

          <StandardButton
            variant="secondary"
            size="sm"
            onClick={() => void loadStudioData()}
            aria-label="รีเฟรชข้อมูล"
          >
            <RefreshCw className="w-4 h-4" />
            <span>รีเฟรช</span>
          </StandardButton>
        </div>
      </header>

      {/* Studio 5-Tab Bar */}
      <nav
        aria-label="เมนูจัดการหลังบ้านที่พัก"
        className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-[13px] font-bold whitespace-nowrap transition-colors ${
                isActive
                  ? "bg-[#111111] text-white dark:bg-[#f5f5f5] dark:text-[#111111]"
                  : "bg-[var(--color-background-muted)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {typeof tab.badge === "number" && tab.badge > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[11px] font-bold bg-[var(--color-promo)] text-white">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Active Tab Content */}
      {activeTab === "overview" && (
        <StudioOverviewTab
          key={studioData.hotel.id}
          data={studioData}
          onJumpToTab={setActiveTab}
        />
      )}
      {activeTab === "bookings" && (
        <StudioBookingsAndBlocksTab
          key={studioData.hotel.id}
          data={studioData}
          onReload={loadStudioData}
          onNotify={showNotice}
        />
      )}
      {activeTab === "rooms" && (
        <StudioRoomsAndAddonsTab
          key={studioData.hotel.id}
          data={studioData}
          onReload={loadStudioData}
          onNotify={showNotice}
        />
      )}
      {activeTab === "pins" && (
        <StudioPinsAndFacebookTab
          key={studioData.hotel.id}
          data={studioData}
          onReload={loadStudioData}
          onNotify={showNotice}
        />
      )}
      {activeTab === "posts" && (
        <StudioBlogPostsTab
          key={studioData.hotel.id}
          data={studioData}
          onReload={loadStudioData}
          onNotify={showNotice}
        />
      )}
      {activeTab === "coupons" && (
        <StudioCouponsAndProfileTab
          key={studioData.hotel.id}
          data={studioData}
          onReload={loadStudioData}
          onNotify={showNotice}
        />
      )}
    </div>
  );
}

export default function HotelStudioPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-6xl mx-auto px-4 py-12 text-center ty-body">
          กำลังโหลด Hotel Studio...
        </div>
      }
    >
      <StudioWorkspaceContent />
    </Suspense>
  );
}
