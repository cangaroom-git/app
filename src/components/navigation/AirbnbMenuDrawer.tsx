"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  ArrowLeftRight,
  Bell,
  Building2,
  CalendarCheck,
  Crown,
  ExternalLink,
  Globe,
  Heart,
  Home,
  LayoutDashboard,
  LogIn,
  LogOut,
  Moon,
  Plus,
  RefreshCw,
  Settings,
  ShieldCheck,
  Sun,
  X,
} from "lucide-react";
import type { LanguageCode } from "@/lib/dateFormatters";
import type { AuthenticatedMeDto } from "@/types/cangaroom";
import type { PlatformNavTabId } from "@/components/navigation/NavigationIcons";
import {
  SuperAdminAvatarCircle,
  UserAvatarCircle,
} from "@/components/navigation/UserProfileDropdown";
import { openPrivacySettingsModal } from "@/lib/telemetry/clientTelemetry";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";
import { useModalPresence } from "@/lib/useModalPresence";

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
  variant?: "traveller" | "studio" | "admin";
  user: AuthenticatedMeDto | null;
  adminFallback?: {
    name: string;
    email: string;
  };
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
  adminFallback,
  onSignOut,
  language,
  onToggleLanguage,
  isDarkTheme,
  onToggleTheme,
  activeTab,
  studio,
}: AirbnbMenuDrawerProps) {
  const [isMounted, setIsMounted] = useState(false);
  const { shouldRender, dataState } = useModalPresence(isOpen, 310);
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartYRef = useRef<number | null>(null);
  const dragStartTimeRef = useRef<number>(0);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setIsDragging(false);
      setDragOffsetY(0);
      dragStartYRef.current = null;
    }
  }, [isOpen]);

  useBodyScrollLock(shouldRender);

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => {
      window.removeEventListener("keydown", handleEsc);
    };
  }, [isOpen, onClose]);

  const handleHeaderTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (typeof window === "undefined" || window.innerWidth >= 768) return;
    if (e.touches.length !== 1) return;
    dragStartYRef.current = e.touches[0].clientY;
    dragStartTimeRef.current = Date.now();
    setIsDragging(true);
  };

  const handleHeaderTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (dragStartYRef.current === null || e.touches.length !== 1) return;
    const dy = e.touches[0].clientY - dragStartYRef.current;
    if (dy > 0) {
      setDragOffsetY(dy);
    } else {
      setDragOffsetY(0);
    }
  };

  const handleHeaderTouchEnd = () => {
    if (dragStartYRef.current === null) return;
    const elapsed = Math.max(1, Date.now() - dragStartTimeRef.current);
    const velocity = dragOffsetY / elapsed;
    const shouldDismiss = dragOffsetY >= 72 || (dragOffsetY >= 32 && velocity > 0.45);
    dragStartYRef.current = null;
    setIsDragging(false);
    setDragOffsetY(0);
    if (shouldDismiss) {
      onClose();
    }
  };

  if (!isMounted || !shouldRender || typeof document === "undefined") {
    return null;
  }

  const isTh = language === "th";
  const isStudio = variant === "studio" && Boolean(studio);
  const isAdmin = variant === "admin";
  const primaryHotel = user?.ownedHotels?.[0] ?? null;
  const totalStudioPending =
    user?.ownedHotels?.reduce((sum, h) => sum + h.pendingBookingsCount, 0) ?? 0;
  const hasStudioAccess =
    Boolean(primaryHotel) ||
    user?.role === "HOTEL_OWNER" ||
    user?.role === "SUPER_ADMIN";
  const savedPinsCount = user?.savedPinsCount ?? 0;

  const displayName =
    user?.name || adminFallback?.name || (isTh ? "ผู้ดูแลระบบ" : "Admin");
  const displayEmail = user?.email || adminFallback?.email || "";

  const roleLabel =
    user?.role === "SUPER_ADMIN" || isAdmin
      ? "Super Admin"
      : user?.role === "HOTEL_OWNER" || primaryHotel
        ? isTh
          ? "เจ้าของที่พัก"
          : "Host"
        : isTh
          ? "นักเดินทาง"
          : "Traveller";

  const isSuperAdmin = user?.role === "SUPER_ADMIN" || isAdmin;
  const heroBadgeText = isStudio
    ? "Merchant Studio"
    : isAdmin
      ? "Admin Center"
      : isSuperAdmin
        ? "Super Admin"
        : hasStudioAccess
          ? "Merchant Studio · 0% GP"
          : "Nondii · 0% GP";

  const rowClass =
    "w-full min-h-[48px] px-3 -mx-3 rounded-[14px] hover:bg-[var(--color-background-muted)] flex items-center justify-between gap-3 text-[15px] font-normal text-[var(--color-text-primary)] transition-colors cursor-pointer";
  const activeRowClass =
    "w-full min-h-[48px] px-3 -mx-3 rounded-[14px] bg-[var(--color-background-muted)] flex items-center justify-between gap-3 text-[15px] font-semibold text-[var(--color-text-primary)] transition-colors cursor-pointer";

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isTh ? "เมนูหลัก" : "Main menu"}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      className="fixed inset-0 z-[95] overflow-hidden"
    >
      {/* Smooth Airbnb Fade Backdrop */}
      <div
        data-state={dataState}
        onClick={onClose}
        className="cgr-modal-backdrop fixed inset-0 bg-black/40 dark:bg-black/60"
      />

      {/* Mobile: Rounded Slide-Up Bottom Sheet (< md) | Desktop/Tablet: Airbnb Slide-Over Right Drawer (>= md) */}
      <aside
        data-state={dataState}
        data-dragging={isDragging ? "true" : undefined}
        style={
          dragOffsetY > 0
            ? { transform: `translate3d(0, ${dragOffsetY}px, 0)` }
            : undefined
        }
        className="cgr-menu-drawer-surface fixed inset-x-0 bottom-0 md:inset-y-0 md:left-auto md:right-0 z-10 w-full md:w-[min(100vw,396px)] max-h-[88dvh] md:max-h-none rounded-t-[28px] md:rounded-t-none md:rounded-l-[24px] bg-[var(--color-background-popover)] text-[var(--color-text-primary)] shadow-[var(--shadow-popover)] flex flex-col overflow-hidden select-none"
      >
        {/* Mobile Grab Handle + Sticky Top Utility Row (supports 1:1 swipe-down to close on mobile) */}
        <div
          onTouchStart={handleHeaderTouchStart}
          onTouchMove={handleHeaderTouchMove}
          onTouchEnd={handleHeaderTouchEnd}
          onTouchCancel={handleHeaderTouchEnd}
          className="shrink-0 bg-[var(--color-background-popover)] touch-none md:touch-auto"
        >
          <div className="md:hidden flex justify-center pt-3 pb-1">
            <span
              aria-hidden="true"
              className="h-1 w-10 rounded-full bg-[var(--color-border-emphasized)]"
            />
          </div>

          <div className="px-6 pt-2 md:pt-5 pb-2 flex items-center justify-between gap-2">
            <h2 className="text-[22px] md:text-[24px] leading-[1.25] font-semibold tracking-tight text-[var(--color-text-primary)]">
              {isTh ? "เมนู" : "Menu"}
            </h2>

            <div className="flex items-center gap-2">
              {isStudio && studio ? (
                <Link
                  href={studio.todayHref}
                  onClick={onClose}
                  aria-label={
                    isTh ? "รายการแจ้งเตือนการจอง" : "Booking alerts"
                  }
                  title={isTh ? "รายการวันนี้" : "Today"}
                  className="h-10 w-10 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] inline-flex items-center justify-center relative transition-colors"
                >
                  <Bell className="w-[18px] h-[18px]" strokeWidth={1.85} />
                  {studio.pendingBookingsCount > 0 && (
                    <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[var(--color-promo)]" />
                  )}
                </Link>
              ) : null}

              <button
                type="button"
                onClick={onClose}
                aria-label={isTh ? "ปิดเมนู" : "Close menu"}
                className="h-10 w-10 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] inline-flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-[18px] h-[18px]" strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>

        {/* Smooth Auto-Hide Scrollable Content */}
        <div className="flex-1 overflow-y-auto cgr-scroll-autohide overscroll-contain px-6 pt-2.5 pb-[max(1.75rem,env(safe-area-inset-bottom))]">
              {/* Single Minimal Nondii Membership / Workspace Card */}
              <div
                className={`relative rounded-[20px] overflow-hidden text-white p-5 mb-6 ${
                  isAdmin
                    ? "bg-[#dc2626] dark:bg-[#b91c1c]"
                    : "bg-[#1e78d6] dark:bg-[#1a5da8]"
                }`}
              >
                {/* Subtle Nondii Cloud Vector Watermark */}
                <svg
                  aria-hidden="true"
                  viewBox="94 12 52 46"
                  fill="currentColor"
                  className="absolute -right-5 -top-4 w-[156px] h-[138px] text-white/[0.14] pointer-events-none select-none"
                >
                  <path d="M108.901,53.84C101.942,52.031 96.799,45.701 96.799,38.179C96.799,29.249 104.049,21.998 112.979,21.998C114.082,21.998 115.16,22.109 116.201,22.32C117.911,18.082 122.065,15.089 126.912,15.089C133.283,15.089 138.457,20.262 138.457,26.634C138.457,28.235 138.13,29.76 137.54,31.146C140.872,33.442 143.058,37.284 143.058,41.633C143.058,48.339 137.86,53.84 131.277,54.325L131.277,54.332L131.163,54.332C130.888,54.35 130.611,54.359 130.331,54.359C130.052,54.359 129.774,54.35 129.499,54.332L124.074,54.332L126.63,49.905L130.331,49.905C134.897,49.905 138.603,46.198 138.603,41.633C138.603,38.815 137.192,36.325 135.038,34.831C133.702,33.904 132.079,33.36 130.331,33.36C129.699,33.36 129.083,33.432 128.491,33.566C127.741,33.737 127.029,34.01 126.372,34.369C125.892,34.63 125.326,34.679 124.809,34.505C124.291,34.33 123.871,33.948 123.648,33.449C123.482,33.1 123.303,32.758 123.111,32.425C122.939,32.127 122.756,31.837 122.562,31.555C121.98,30.717 121.292,29.958 120.517,29.299C119.063,28.064 117.303,27.179 115.367,26.775C114.596,26.614 113.797,26.529 112.979,26.529C106.549,26.529 101.329,31.749 101.329,38.179C101.329,44.034 105.658,48.886 111.287,49.707L108.901,53.84ZM116.349,49.852C118.515,49.874 120.663,49.905 120.663,49.905L121.484,49.905L118.928,54.332L113.918,54.332C113.864,54.336 113.811,54.338 113.758,54.341L116.349,49.852ZM133.323,29.26C133.655,28.45 133.839,27.563 133.839,26.634C133.839,22.811 130.735,19.707 126.912,19.707C124.067,19.707 121.62,21.426 120.554,23.88C123.02,25.19 125.107,27.12 126.609,29.46C127.786,29.1 129.036,28.906 130.331,28.906C131.361,28.906 132.363,29.029 133.323,29.26Z" />
                </svg>

                {/* Card Identity + Primary Action(s) */}
                <div className="relative z-10 space-y-4">
                  <span className="inline-flex items-center h-6 px-2.5 rounded-full bg-white/18 text-white text-[12px] font-medium">
                    {heroBadgeText}
                  </span>

                  {isStudio && studio ? (
                    <>
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="rounded-full ring-2 ring-white/30 shrink-0">
                          <UserAvatarCircle
                            user={user}
                            sizeClass="h-11 w-11"
                            iconSizeClass="w-5 h-5"
                          />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[16px] font-semibold text-white truncate">
                            {studio.hotelName}
                          </p>
                          <p className="text-[13px] text-white/80 truncate">
                            /{studio.hotelSlug} · ★{" "}
                            {studio.ratingAvg.toFixed(1)}
                          </p>
                        </div>
                      </div>

                      {isSuperAdmin ? (
                        <div className="grid grid-cols-2 gap-2">
                          <Link
                            href={`/${studio.hotelSlug}`}
                            onClick={onClose}
                            className="h-10 px-3 rounded-full bg-white hover:bg-white/90 !text-[#182334] text-[13px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <ExternalLink
                              className="w-3.5 h-3.5 shrink-0"
                              strokeWidth={2}
                            />
                            <span className="truncate">
                              {isTh ? "หน้าร้าน" : "Storefront"}
                            </span>
                          </Link>
                          <Link
                            href="/admin"
                            onClick={onClose}
                            className="h-10 px-3 rounded-full bg-white hover:bg-white/90 !text-[#182334] text-[13px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <Crown
                              className="w-3.5 h-3.5 text-[#dc2626] shrink-0"
                              strokeWidth={2}
                            />
                            <span className="truncate">Admin</span>
                          </Link>
                        </div>
                      ) : (
                        <Link
                          href={`/${studio.hotelSlug}`}
                          onClick={onClose}
                          className="w-full h-10 px-4 rounded-full bg-white hover:bg-white/90 !text-[#182334] text-[14px] font-semibold flex items-center justify-center gap-2 transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" strokeWidth={1.9} />
                          <span>
                            {isTh ? "ดูหน้าร้านจริง" : "View live listing"}
                          </span>
                        </Link>
                      )}
                    </>
                  ) : isAdmin ? (
                    <>
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="rounded-full ring-2 ring-white/30 shrink-0">
                          {user ? (
                            <UserAvatarCircle
                              user={user}
                              sizeClass="h-11 w-11"
                              iconSizeClass="w-5 h-5"
                            />
                          ) : (
                            <SuperAdminAvatarCircle sizeClass="h-11 w-11" />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[16px] font-semibold text-white truncate">
                            {displayName}
                          </p>
                          <p className="text-[13px] text-white/80 truncate">
                            {roleLabel}
                            {displayEmail ? ` · ${displayEmail}` : ""}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <Link
                          href="/studio"
                          onClick={onClose}
                          className="h-10 px-3 rounded-full bg-white hover:bg-white/90 !text-[#182334] text-[13px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <LayoutDashboard
                            className="w-3.5 h-3.5 text-[#1e78d6] shrink-0"
                            strokeWidth={2}
                          />
                          <span className="truncate">Studio</span>
                        </Link>
                        <Link
                          href="/"
                          onClick={onClose}
                          className="h-10 px-3 rounded-full bg-white hover:bg-white/90 !text-[#182334] text-[13px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Home
                            className="w-3.5 h-3.5 shrink-0"
                            strokeWidth={2}
                          />
                          <span className="truncate">
                            {isTh ? "หน้าเว็บหลัก" : "Home"}
                          </span>
                        </Link>
                      </div>
                    </>
                  ) : user ? (
                    <>
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="rounded-full ring-2 ring-white/30 shrink-0">
                          <UserAvatarCircle
                            user={user}
                            sizeClass="h-11 w-11"
                            iconSizeClass="w-5 h-5"
                          />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[16px] font-semibold text-white truncate">
                            {user.name}
                          </p>
                          <p className="text-[13px] text-white/80 truncate">
                            {roleLabel} · {user.email}
                          </p>
                        </div>
                      </div>

                      {isSuperAdmin ? (
                        <div className="grid grid-cols-2 gap-2">
                          <Link
                            href="/studio"
                            onClick={onClose}
                            className="h-10 px-3 rounded-full bg-white hover:bg-white/90 !text-[#182334] text-[13px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <LayoutDashboard
                              className="w-3.5 h-3.5 text-[#1e78d6] shrink-0"
                              strokeWidth={2}
                            />
                            <span className="truncate">Studio</span>
                            {totalStudioPending > 0 && (
                              <span className="px-1.5 py-0.5 rounded-full bg-[var(--color-promo)] !text-white text-[11px] font-semibold leading-none shrink-0">
                                {totalStudioPending}
                              </span>
                            )}
                          </Link>
                          <Link
                            href="/admin"
                            onClick={onClose}
                            className="h-10 px-3 rounded-full bg-white hover:bg-white/90 !text-[#182334] text-[13px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <Crown
                              className="w-3.5 h-3.5 text-[#dc2626] shrink-0"
                              strokeWidth={2}
                            />
                            <span className="truncate">Admin</span>
                          </Link>
                        </div>
                      ) : hasStudioAccess ? (
                        <Link
                          href="/studio"
                          onClick={onClose}
                          className="w-full h-10 px-4 rounded-full bg-white hover:bg-white/90 !text-[#182334] text-[14px] font-semibold flex items-center justify-center gap-2 transition-colors"
                        >
                          <ArrowLeftRight
                            className="w-4 h-4"
                            strokeWidth={1.9}
                          />
                          <span>
                            {isTh
                              ? "จัดการร้าน / Studio"
                              : "Manage place / Studio"}
                          </span>
                          {totalStudioPending > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-[var(--color-promo)] !text-white text-[12px] font-semibold leading-none">
                              {totalStudioPending}
                            </span>
                          )}
                        </Link>
                      ) : (
                        <Link
                          href="/register"
                          onClick={onClose}
                          className="w-full h-10 px-4 rounded-full bg-white hover:bg-white/90 !text-[#182334] text-[14px] font-semibold flex items-center justify-center gap-2 transition-colors"
                        >
                          <Building2 className="w-4 h-4" strokeWidth={1.9} />
                          <span>
                            {isTh
                              ? "ลงธุรกิจ / ที่พักฟรี 0% GP"
                              : "List your place free"}
                          </span>
                        </Link>
                      )}
                    </>
                  ) : (
                    <div className="space-y-3.5">
                      <div className="space-y-1">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src="/brand/nondii-icon-with-text-white.svg"
                          alt="Nondii"
                          className="h-7 w-auto object-contain"
                        />
                        <p className="text-[13px] leading-relaxed text-white/85">
                          {isTh
                            ? "บันทึกที่พักสวย เก็บคูปองส่วนลด และจองตรง 0% GP"
                            : "Save visual stays, collect coupons & book direct 0% GP"}
                        </p>
                      </div>
                      <Link
                        href="/login"
                        onClick={onClose}
                        className="w-full h-10 px-5 rounded-full bg-white hover:bg-white/90 !text-[#182334] text-[14px] font-semibold flex items-center justify-center gap-2 transition-colors"
                      >
                        <LogIn className="w-4 h-4" strokeWidth={2} />
                        <span>
                          {isTh
                            ? "เข้าสู่ระบบด้วย Google"
                            : "Sign in with Google"}
                        </span>
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              {/* Streamlined Navigation — Zero Duplication (Theme / Language / PDPA live in /account) */}
              {isStudio && studio ? (
                <nav aria-label={isTh ? "เมนูจัดการที่พัก" : "Hosting menu"}>
                  <div className="space-y-0.5">
                    <Link
                      href="/account"
                      onClick={onClose}
                      className={rowClass}
                    >
                      <span className="flex items-center gap-3.5 min-w-0">
                        <Settings
                          className="w-[20px] h-[20px] shrink-0"
                          strokeWidth={1.75}
                        />
                        <span className="truncate">
                          {isTh ? "ตั้งค่าบัญชีส่วนตัว" : "Account settings"}
                        </span>
                      </span>
                    </Link>

                    <Link href="/" onClick={onClose} className={rowClass}>
                      <span className="flex items-center gap-3.5 min-w-0">
                        <ArrowLeftRight
                          className="w-[20px] h-[20px] shrink-0"
                          strokeWidth={1.75}
                        />
                        <span className="truncate">
                          {isTh
                            ? "สลับเป็นโหมดนักเดินทาง"
                            : "Switch to traveling"}
                        </span>
                      </span>
                    </Link>

                    <Link
                      href="/register"
                      onClick={onClose}
                      className={rowClass}
                    >
                      <span className="flex items-center gap-3.5 min-w-0">
                        <Plus
                          className="w-[20px] h-[20px] shrink-0"
                          strokeWidth={1.75}
                        />
                        <span className="truncate">
                          {isTh
                            ? "เพิ่มธุรกิจ / สถานที่ใหม่"
                            : "Create a new listing"}
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
                      <span className="flex items-center gap-3.5 min-w-0">
                        <RefreshCw
                          className="w-[20px] h-[20px] shrink-0"
                          strokeWidth={1.75}
                        />
                        <span className="truncate">
                          {isTh ? "รีเฟรชข้อมูลล่าสุด" : "Refresh studio data"}
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
                        <span className="flex items-center gap-3.5 min-w-0">
                          <LogOut
                            className="w-[20px] h-[20px] shrink-0"
                            strokeWidth={1.75}
                          />
                          <span className="truncate">
                            {isTh ? "ออกจากระบบ" : "Log out"}
                          </span>
                        </span>
                      </button>
                    </>
                  )}
                </nav>
              ) : isAdmin ? (
                <nav aria-label={isTh ? "เมนูผู้ดูแลระบบ" : "Admin menu"}>
                  <div className="space-y-0.5">
                    <Link
                      href="/account"
                      onClick={onClose}
                      className={rowClass}
                    >
                      <span className="flex items-center gap-3.5 min-w-0">
                        <Settings
                          className="w-[20px] h-[20px] shrink-0"
                          strokeWidth={1.75}
                        />
                        <span className="truncate">
                          {isTh ? "ตั้งค่าบัญชีส่วนตัว" : "Account settings"}
                        </span>
                      </span>
                    </Link>

                    <Link
                      href="/register"
                      onClick={onClose}
                      className={rowClass}
                    >
                      <span className="flex items-center gap-3.5 min-w-0">
                        <Plus
                          className="w-[20px] h-[20px] shrink-0"
                          strokeWidth={1.75}
                        />
                        <span className="truncate">
                          {isTh
                            ? "เพิ่มธุรกิจ / สถานที่ใหม่"
                            : "Create a new listing"}
                        </span>
                      </span>
                    </Link>
                  </div>

                  {onSignOut && (
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
                        <span className="flex items-center gap-3.5 min-w-0">
                          <LogOut
                            className="w-[20px] h-[20px] shrink-0"
                            strokeWidth={1.75}
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
                  {user ? (
                    <>
                      <div className="space-y-0.5">
                        <Link
                          href="/account"
                          onClick={onClose}
                          className={rowClass}
                        >
                          <span className="flex items-center gap-3.5 min-w-0">
                            <Settings
                              className="w-[20px] h-[20px] shrink-0"
                              strokeWidth={1.75}
                            />
                            <span className="truncate">
                              {isTh ? "ตั้งค่าบัญชี" : "Account settings"}
                            </span>
                          </span>
                          <span className="text-[12px] text-[var(--color-text-secondary)] shrink-0">
                            {isTh ? "ภาษา · สี · PDPA" : "Prefs"}
                          </span>
                        </Link>

                        <Link
                          href="/bookings"
                          onClick={onClose}
                          className={
                            activeTab === "trips" ? activeRowClass : rowClass
                          }
                        >
                          <span className="flex items-center gap-3.5 min-w-0">
                            <CalendarCheck
                              className="w-[20px] h-[20px] shrink-0"
                              strokeWidth={1.75}
                            />
                            <span className="truncate">
                              {isTh
                                ? "การจอง & คูปองของฉัน"
                                : "My bookings & wallet"}
                            </span>
                          </span>
                        </Link>

                        <Link
                          href="/wishlist"
                          onClick={onClose}
                          className={
                            activeTab === "wishlist" ? activeRowClass : rowClass
                          }
                        >
                          <span className="flex items-center gap-3.5 min-w-0">
                            <Heart
                              className="w-[20px] h-[20px] shrink-0"
                              strokeWidth={1.75}
                              fill={
                                activeTab === "wishlist"
                                  ? "currentColor"
                                  : "none"
                              }
                            />
                            <span className="truncate">
                              {isTh ? "Wishlist ที่ถูกใจ" : "Wishlist"}
                            </span>
                          </span>
                          {savedPinsCount > 0 && (
                            <span className="text-[13px] font-semibold text-[var(--color-text-secondary)] shrink-0 tabular-nums">
                              {savedPinsCount}
                            </span>
                          )}
                        </Link>
                      </div>

                      {onSignOut && (
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
                            <span className="flex items-center gap-3.5 min-w-0">
                              <LogOut
                                className="w-[20px] h-[20px] shrink-0"
                                strokeWidth={1.75}
                              />
                              <span className="truncate">
                                {isTh ? "ออกจากระบบ" : "Log out"}
                              </span>
                            </span>
                          </button>
                        </>
                      )}
                    </>
                  ) : (
                    /* Signed-out guest quick preferences (cannot access /account yet) */
                    <div className="space-y-0.5">
                      <button
                        type="button"
                        onClick={onToggleTheme}
                        className={rowClass}
                      >
                        <span className="flex items-center gap-3.5 min-w-0">
                          {isDarkTheme ? (
                            <Moon
                              className="w-[20px] h-[20px] shrink-0"
                              strokeWidth={1.75}
                            />
                          ) : (
                            <Sun
                              className="w-[20px] h-[20px] shrink-0"
                              strokeWidth={1.75}
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
                        <span className="flex items-center gap-3.5 min-w-0">
                          <Globe
                            className="w-[20px] h-[20px] shrink-0"
                            strokeWidth={1.75}
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
                        <span className="flex items-center gap-3.5 min-w-0">
                          <ShieldCheck
                            className="w-[20px] h-[20px] shrink-0"
                            strokeWidth={1.75}
                          />
                          <span className="truncate">
                            {isTh
                              ? "คุกกี้ & ความเป็นส่วนตัว"
                              : "Cookies & privacy"}
                          </span>
                        </span>
                      </button>
                    </div>
                  )}
                </nav>
              )}
            </div>
          </aside>
        </div>,
    document.body,
  );
}
