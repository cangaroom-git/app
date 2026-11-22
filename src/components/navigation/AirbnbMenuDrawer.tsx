"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeftRight,
  Bell,
  Bookmark,
  Building2,
  CalendarCheck,
  Crown,
  ExternalLink,
  Globe,
  LayoutDashboard,
  LogIn,
  LogOut,
  Map,
  Moon,
  Plus,
  RefreshCw,
  ShieldCheck,
  Star,
  Sun,
  X,
} from "lucide-react";
import type { LanguageCode } from "@/lib/dateFormatters";
import type { AuthenticatedMeDto } from "@/types/cangaroom";
import type { PlatformNavTabId } from "@/components/navigation/NavigationIcons";
import { UserAvatarCircle } from "@/components/navigation/UserProfileDropdown";
import { openPrivacySettingsModal } from "@/lib/telemetry/clientTelemetry";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";

export interface AirbnbMenuDrawerStudioContext {
  hotelName: string;
  hotelSlug: string;
  ratingAvg: number;
  reviewsCount: number;
  pendingBookingsCount: number;
  reviewsHref: string;
  todayHref: string;
  onReload: () => void | Promise<void>;
}

export interface AirbnbMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  variant?: "traveller" | "studio";
  user: AuthenticatedMeDto | null;
  onRefreshProfile?: () => Promise<void>;
  onSignOut?: () => Promise<void>;
  language: LanguageCode;
  onToggleLanguage: () => void;
  isDarkTheme: boolean;
  onToggleTheme: () => void;
  activeTab?: PlatformNavTabId;
  onOpenCouponWallet?: () => void;
  studio?: AirbnbMenuDrawerStudioContext;
}

export function AirbnbMenuDrawer({
  isOpen,
  onClose,
  variant = "traveller",
  user,
  onRefreshProfile,
  onSignOut,
  language,
  onToggleLanguage,
  isDarkTheme,
  onToggleTheme,
  activeTab,
  onOpenCouponWallet,
  studio,
}: AirbnbMenuDrawerProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setIsExiting(true);
    }
  }, [isOpen]);

  useBodyScrollLock(isOpen || isExiting);

  useEffect(() => {
    if (!isOpen) return;
    // Defer profile refresh until after the 500ms slide-in completes so no React
    // re-render interrupts the GPU slide transition.
    const refreshTimer = onRefreshProfile
      ? window.setTimeout(() => {
          void onRefreshProfile();
        }, 540)
      : null;

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => {
      if (refreshTimer !== null) window.clearTimeout(refreshTimer);
      window.removeEventListener("keydown", handleEsc);
    };
  }, [isOpen, onClose, onRefreshProfile]);

  if (!isMounted || typeof document === "undefined") {
    return null;
  }

  const isTh = language === "th";
  const isStudio = variant === "studio" && Boolean(studio);
  const primaryHotel = user?.ownedHotels?.[0] ?? null;
  const totalStudioPending =
    user?.ownedHotels?.reduce((sum, h) => sum + h.pendingBookingsCount, 0) ?? 0;
  const hasStudioAccess =
    Boolean(primaryHotel) ||
    user?.role === "HOTEL_OWNER" ||
    user?.role === "SUPER_ADMIN";
  const savedPinsCount = user?.savedPinsCount ?? 0;
  const savedCouponsCount = user?.savedCouponsCount ?? 0;

  const roleLabel =
    user?.role === "SUPER_ADMIN"
      ? "Super Admin"
      : user?.role === "HOTEL_OWNER" || primaryHotel
      ? isTh
        ? "เจ้าของที่พัก"
        : "Host"
      : isTh
      ? "นักเดินทาง"
      : "Traveller";

  const rowClass =
    "w-full min-h-[48px] px-3 -mx-3 rounded-[12px] hover:bg-[var(--color-background-muted)] flex items-center justify-between gap-3 text-[15.5px] font-normal text-[var(--color-text-primary)] transition-colors cursor-pointer";
  const activeRowClass =
    "w-full min-h-[48px] px-3 -mx-3 rounded-[12px] bg-[var(--color-background-muted)] flex items-center justify-between gap-3 text-[15.5px] font-semibold text-[var(--color-text-primary)] transition-colors cursor-pointer";

  return createPortal(
    <AnimatePresence onExitComplete={() => setIsExiting(false)}>
      {isOpen && (
        <div
          key="airbnb-menu-drawer"
          role="dialog"
          aria-modal="true"
          aria-label={isTh ? "เมนูหลัก" : "Main menu"}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          className="fixed inset-0 z-[95] overflow-hidden"
        >
          {/* Smooth Airbnb Fade Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{
              opacity: 1,
              transition: { duration: 0.42, ease: [0.16, 1, 0.3, 1] },
            }}
            exit={{
              opacity: 0,
              transition: { duration: 0.34, ease: [0.32, 0.72, 0, 1] },
            }}
            onClick={onClose}
            style={{ willChange: "opacity" }}
            className="fixed inset-0 bg-black/30 dark:bg-black/55"
          />

          {/* Airbnb Slide-Over Right Drawer */}
          <motion.aside
            initial={{ x: "100%" }}
            animate={{
              x: 0,
              transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
            }}
            exit={{
              x: "100%",
              transition: { duration: 0.38, ease: [0.32, 0.72, 0, 1] },
            }}
            style={{ willChange: "transform" }}
            className="fixed inset-y-0 right-0 z-10 w-[min(100vw,396px)] sm:rounded-l-[24px] bg-[var(--color-background-popover)] text-[var(--color-text-primary)] shadow-[var(--shadow-popover)] flex flex-col overflow-hidden select-none"
          >
        {/* Sticky Top Utility Row (Notification/Wallet + Close) */}
        <div className="px-6 pt-5 pb-2 flex items-center justify-end gap-2 shrink-0 bg-[var(--color-background-popover)]">
          {isStudio && studio ? (
            <Link
              href={studio.todayHref}
              onClick={onClose}
              aria-label={isTh ? "รายการแจ้งเตือนการจอง" : "Booking alerts"}
              title={isTh ? "รายการวันนี้" : "Today"}
              className="h-10 w-10 rounded-[12px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] inline-flex items-center justify-center relative transition-colors"
            >
              <Bell className="w-[19px] h-[19px]" strokeWidth={1.85} />
              {studio.pendingBookingsCount > 0 && (
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[var(--color-promo)]" />
              )}
            </Link>
          ) : null}

          <button
            type="button"
            onClick={onClose}
            aria-label={isTh ? "ปิดเมนู" : "Close menu"}
            className="h-10 w-10 rounded-[12px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] inline-flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-[19px] h-[19px]" strokeWidth={2} />
          </button>
        </div>

        {/* Smooth Scrollable Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-6 pt-1 pb-[max(2rem,env(safe-area-inset-bottom))]">
          {/* Generous Airbnb Display Title */}
          <h2 className="text-[28px] leading-[1.2] font-semibold tracking-tight text-[var(--color-text-primary)] mb-5">
            {isTh ? "เมนู" : "Menu"}
          </h2>

          {/* Signature Airbnb Warm Minimal Highlight Card */}
          <div className="rounded-[20px] bg-[var(--color-background-muted)] p-5 mb-6">
            {isStudio && studio ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  <UserAvatarCircle
                    user={user}
                    sizeClass="h-12 w-12"
                    iconSizeClass="w-5 h-5"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[16px] font-semibold text-[var(--color-text-primary)] truncate">
                      {studio.hotelName}
                    </p>
                    <p className="text-[13px] text-[var(--color-text-secondary)] truncate">
                      /{studio.hotelSlug} · ★ {studio.ratingAvg.toFixed(1)}
                    </p>
                  </div>
                </div>

                <Link
                  href={`/${studio.hotelSlug}`}
                  onClick={onClose}
                  className="w-full h-11 px-4 rounded-[12px] bg-[var(--color-background-card)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[14px] font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" strokeWidth={1.9} />
                  <span>{isTh ? "ดูหน้าร้านจริง" : "View live listing"}</span>
                </Link>
              </div>
            ) : user ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  <UserAvatarCircle
                    user={user}
                    sizeClass="h-12 w-12"
                    iconSizeClass="w-5 h-5"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[16px] font-semibold text-[var(--color-text-primary)] truncate">
                      {user.name}
                    </p>
                    <p className="text-[13px] text-[var(--color-text-secondary)] truncate">
                      {roleLabel} · {user.email}
                    </p>
                  </div>
                </div>

                {hasStudioAccess ? (
                  <Link
                    href="/studio"
                    onClick={onClose}
                    className="w-full h-11 px-4 rounded-[12px] bg-[var(--color-background-card)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[14px] font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    <ArrowLeftRight className="w-4 h-4" strokeWidth={1.9} />
                    <span>
                      {isTh ? "โหมดเจ้าของที่พัก" : "Switch to hosting"}
                    </span>
                    {totalStudioPending > 0 && (
                      <span className="px-1.5 py-0.5 rounded-[6px] bg-[var(--color-promo)] !text-white text-[11px] font-bold leading-none">
                        {totalStudioPending}
                      </span>
                    )}
                  </Link>
                ) : (
                  <Link
                    href="/register-hotel"
                    onClick={onClose}
                    className="w-full h-11 px-4 rounded-[12px] bg-[var(--color-background-card)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[14px] font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    <Building2 className="w-4 h-4" strokeWidth={1.9} />
                    <span>
                      {isTh ? "เปิดเพจที่พักฟรี 0% GP" : "List your stay free"}
                    </span>
                  </Link>
                )}
              </div>
            ) : (
              <div className="text-center space-y-3.5">
                <img
                  src="/brand/nondi-icon-with-text-black.svg"
                  alt="Nondii"
                  className="h-8 w-auto mx-auto object-contain dark:invert"
                />
                <p className="text-[13.5px] leading-relaxed text-[var(--color-text-secondary)]">
                  {isTh
                    ? "บันทึกที่พักสวย เก็บคูปองส่วนลด และจองตรง 0% GP"
                    : "Save visual stays, collect coupons & book direct 0% GP"}
                </p>
                <Link
                  href="/login"
                  onClick={onClose}
                  className="w-full h-11 px-4 rounded-[12px] bg-[#222222] hover:bg-[#3f3f3f] dark:bg-[#f5f5f5] dark:hover:bg-[#e5e5e5] !text-white dark:!text-[#222222] text-[14px] font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <LogIn className="w-4 h-4" strokeWidth={2} />
                  <span>
                    {isTh ? "เข้าสู่ระบบด้วย Google" : "Sign in with Google"}
                  </span>
                </Link>
              </div>
            )}
          </div>

          {/* Menu Items — Studio Mode vs Traveller Mode */}
          {isStudio && studio ? (
            <nav aria-label={isTh ? "เมนูจัดการที่พัก" : "Hosting menu"}>
              <div className="space-y-0.5">
                <Link href="/" onClick={onClose} className={rowClass}>
                  <span className="flex items-center gap-4 min-w-0">
                    <ArrowLeftRight
                      className="w-[22px] h-[22px] shrink-0"
                      strokeWidth={1.7}
                    />
                    <span className="truncate">
                      {isTh ? "สลับเป็นโหมดนักเดินทาง" : "Switch to traveling"}
                    </span>
                  </span>
                </Link>

                <Link
                  href={studio.reviewsHref}
                  onClick={onClose}
                  className={rowClass}
                >
                  <span className="flex items-center gap-4 min-w-0">
                    <Star
                      className="w-[22px] h-[22px] shrink-0"
                      strokeWidth={1.7}
                    />
                    <span className="truncate">
                      {isTh
                        ? `รีวิวผู้เข้าพัก (${studio.reviewsCount})`
                        : `Guest reviews (${studio.reviewsCount})`}
                    </span>
                  </span>
                  <span className="text-[13px] font-medium text-[var(--color-text-secondary)] shrink-0">
                    ★ {studio.ratingAvg.toFixed(1)}
                  </span>
                </Link>

                <Link
                  href="/register-hotel"
                  onClick={onClose}
                  className={rowClass}
                >
                  <span className="flex items-center gap-4 min-w-0">
                    <Plus
                      className="w-[22px] h-[22px] shrink-0"
                      strokeWidth={1.7}
                    />
                    <span className="truncate">
                      {isTh ? "เพิ่มที่พักแห่งใหม่" : "Create a new listing"}
                    </span>
                  </span>
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    void studio.onReload();
                  }}
                  className={rowClass}
                >
                  <span className="flex items-center gap-4 min-w-0">
                    <RefreshCw
                      className="w-[22px] h-[22px] shrink-0"
                      strokeWidth={1.7}
                    />
                    <span className="truncate">
                      {isTh ? "รีเฟรชข้อมูลล่าสุด" : "Refresh studio data"}
                    </span>
                  </span>
                </button>

                {user?.role === "SUPER_ADMIN" && (
                  <Link
                    href="/super-admin"
                    onClick={onClose}
                    className={rowClass}
                  >
                    <span className="flex items-center gap-4 min-w-0">
                      <Crown
                        className="w-[22px] h-[22px] shrink-0"
                        strokeWidth={1.7}
                      />
                      <span className="truncate">Super Admin Console</span>
                    </span>
                  </Link>
                )}
              </div>

              <div className="my-3.5 border-t border-[var(--color-border)]" />

              <div className="space-y-0.5">
                <button
                  type="button"
                  onClick={onToggleTheme}
                  className={rowClass}
                >
                  <span className="flex items-center gap-4 min-w-0">
                    {isDarkTheme ? (
                      <Moon
                        className="w-[22px] h-[22px] shrink-0"
                        strokeWidth={1.7}
                      />
                    ) : (
                      <Sun
                        className="w-[22px] h-[22px] shrink-0"
                        strokeWidth={1.7}
                      />
                    )}
                    <span className="truncate">
                      {isTh ? "โหมดสี" : "Appearance"}
                    </span>
                  </span>
                  <span className="text-[13px] font-medium text-[var(--color-text-secondary)] shrink-0">
                    {isDarkTheme
                      ? isTh
                        ? "มืด"
                        : "Dark"
                      : isTh
                      ? "สว่าง"
                      : "Light"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={onToggleLanguage}
                  className={rowClass}
                >
                  <span className="flex items-center gap-4 min-w-0">
                    <Globe
                      className="w-[22px] h-[22px] shrink-0"
                      strokeWidth={1.7}
                    />
                    <span className="truncate">
                      {isTh ? "ภาษา" : "Language"}
                    </span>
                  </span>
                  <span className="text-[13px] font-medium text-[var(--color-text-secondary)] shrink-0">
                    {isTh ? "ไทย (TH)" : "English (EN)"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    openPrivacySettingsModal();
                  }}
                  className={rowClass}
                >
                  <span className="flex items-center gap-4 min-w-0">
                    <ShieldCheck
                      className="w-[22px] h-[22px] shrink-0"
                      strokeWidth={1.7}
                    />
                    <span className="truncate">
                      {isTh ? "คุกกี้ & ความเป็นส่วนตัว" : "Cookies & privacy"}
                    </span>
                  </span>
                </button>
              </div>

              {user && onSignOut && (
                <>
                  <div className="my-3.5 border-t border-[var(--color-border)]" />
                  <button
                    type="button"
                    onClick={async () => {
                      await onSignOut();
                      onClose();
                    }}
                    className={rowClass}
                  >
                    <span className="flex items-center gap-4 min-w-0">
                      <LogOut
                        className="w-[22px] h-[22px] shrink-0"
                        strokeWidth={1.7}
                      />
                      <span className="truncate">
                        {isTh ? "ออกจากระบบ" : "Log out"}
                      </span>
                    </span>
                  </button>
                </>
              )}
            </nav>
          ) : (
            <nav aria-label={isTh ? "เมนูผู้ใช้" : "Account menu"}>
              <div className="space-y-0.5">
                <Link
                  href="/trips"
                  onClick={onClose}
                  className={activeTab === "trips" ? activeRowClass : rowClass}
                >
                  <span className="flex items-center gap-4 min-w-0">
                    <CalendarCheck
                      className="w-[22px] h-[22px] shrink-0"
                      strokeWidth={1.7}
                    />
                    <span className="truncate">
                      {isTh ? "การจอง & คูปองของฉัน" : "My trips & wallet"}
                    </span>
                  </span>
                </Link>

                <Link
                  href="/board"
                  onClick={onClose}
                  className={activeTab === "board" ? activeRowClass : rowClass}
                >
                  <span className="flex items-center gap-4 min-w-0">
                    <Bookmark
                      className="w-[22px] h-[22px] shrink-0"
                      strokeWidth={1.7}
                    />
                    <span className="truncate">
                      {isTh ? "บอร์ดคูปองที่บันทึกไว้" : "Saved deal boards"}
                    </span>
                  </span>
                  {savedPinsCount > 0 && (
                    <span className="text-[13px] font-semibold text-[var(--color-text-secondary)] shrink-0">
                      {savedPinsCount}
                    </span>
                  )}
                </Link>

                <Link
                  href="/explore"
                  onClick={onClose}
                  className={activeTab === "explore" ? activeRowClass : rowClass}
                >
                  <span className="flex items-center gap-4 min-w-0">
                    <Map
                      className="w-[22px] h-[22px] shrink-0"
                      strokeWidth={1.7}
                    />
                    <span className="truncate">
                      {isTh ? "แผนที่โปรที่พักทั่วไทย" : "Explore deals on map"}
                    </span>
                  </span>
                </Link>
              </div>

              <div className="my-3.5 border-t border-[var(--color-border)]" />

              <div className="space-y-0.5">
                {hasStudioAccess && (
                  <Link
                    href="/studio"
                    onClick={onClose}
                    className={
                      activeTab === "studio" ? activeRowClass : rowClass
                    }
                  >
                    <span className="flex items-center gap-4 min-w-0">
                      <LayoutDashboard
                        className="w-[22px] h-[22px] shrink-0"
                        strokeWidth={1.7}
                      />
                      <span className="truncate">
                        {isTh ? "จัดการที่พัก (Hotel Studio)" : "Hotel Studio"}
                      </span>
                    </span>
                    {totalStudioPending > 0 && (
                      <span className="px-2 py-0.5 rounded-[6px] bg-[var(--color-promo)] !text-white text-[11px] font-bold leading-none shrink-0">
                        {totalStudioPending}
                      </span>
                    )}
                  </Link>
                )}

                {primaryHotel && (
                  <Link
                    href={`/${primaryHotel.slug}`}
                    onClick={onClose}
                    className={rowClass}
                  >
                    <span className="flex items-center gap-4 min-w-0">
                      <ExternalLink
                        className="w-[22px] h-[22px] shrink-0"
                        strokeWidth={1.7}
                      />
                      <span className="truncate">/{primaryHotel.slug}</span>
                    </span>
                  </Link>
                )}

                <Link
                  href="/register-hotel"
                  onClick={onClose}
                  className={
                    activeTab === "register-hotel" ? activeRowClass : rowClass
                  }
                >
                  <span className="flex items-center gap-4 min-w-0">
                    <Plus
                      className="w-[22px] h-[22px] shrink-0"
                      strokeWidth={1.7}
                    />
                    <span className="truncate">
                      {isTh
                        ? "เปิดเพจที่พักฟรี 0% GP"
                        : "List property free (0% GP)"}
                    </span>
                  </span>
                </Link>

                {user?.role === "SUPER_ADMIN" && (
                  <Link
                    href="/super-admin"
                    onClick={onClose}
                    className={
                      activeTab === "super-admin" ? activeRowClass : rowClass
                    }
                  >
                    <span className="flex items-center gap-4 min-w-0">
                      <Crown
                        className="w-[22px] h-[22px] shrink-0"
                        strokeWidth={1.7}
                      />
                      <span className="truncate">Super Admin Console</span>
                    </span>
                  </Link>
                )}
              </div>

              <div className="my-3.5 border-t border-[var(--color-border)]" />

              <div className="space-y-0.5">
                <button
                  type="button"
                  onClick={onToggleTheme}
                  className={rowClass}
                >
                  <span className="flex items-center gap-4 min-w-0">
                    {isDarkTheme ? (
                      <Moon
                        className="w-[22px] h-[22px] shrink-0"
                        strokeWidth={1.7}
                      />
                    ) : (
                      <Sun
                        className="w-[22px] h-[22px] shrink-0"
                        strokeWidth={1.7}
                      />
                    )}
                    <span className="truncate">
                      {isTh ? "โหมดสี" : "Appearance"}
                    </span>
                  </span>
                  <span className="text-[13px] font-medium text-[var(--color-text-secondary)] shrink-0">
                    {isDarkTheme
                      ? isTh
                        ? "มืด"
                        : "Dark"
                      : isTh
                      ? "สว่าง"
                      : "Light"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={onToggleLanguage}
                  className={rowClass}
                >
                  <span className="flex items-center gap-4 min-w-0">
                    <Globe
                      className="w-[22px] h-[22px] shrink-0"
                      strokeWidth={1.7}
                    />
                    <span className="truncate">
                      {isTh ? "ภาษา" : "Language"}
                    </span>
                  </span>
                  <span className="text-[13px] font-medium text-[var(--color-text-secondary)] shrink-0">
                    {isTh ? "ไทย (TH)" : "English (EN)"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    openPrivacySettingsModal();
                  }}
                  className={rowClass}
                >
                  <span className="flex items-center gap-4 min-w-0">
                    <ShieldCheck
                      className="w-[22px] h-[22px] shrink-0"
                      strokeWidth={1.7}
                    />
                    <span className="truncate">
                      {isTh ? "คุกกี้ & ความเป็นส่วนตัว" : "Cookies & privacy"}
                    </span>
                  </span>
                </button>
              </div>

              {user && onSignOut && (
                <>
                  <div className="my-3.5 border-t border-[var(--color-border)]" />
                  <button
                    type="button"
                    onClick={async () => {
                      await onSignOut();
                      onClose();
                    }}
                    className={rowClass}
                  >
                    <span className="flex items-center gap-4 min-w-0">
                      <LogOut
                        className="w-[22px] h-[22px] shrink-0"
                        strokeWidth={1.7}
                      />
                      <span className="truncate">
                        {isTh ? "ออกจากระบบ" : "Log out"}
                      </span>
                    </span>
                  </button>
                </>
              )}
            </nav>
          )}
        </div>
      </motion.aside>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
