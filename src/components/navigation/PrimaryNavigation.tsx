"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Building2,
  Calendar,
  CalendarCheck,
  Compass,
  Crown,
  Globe,
  LayoutDashboard,
  LogIn,
  LogOut,
  MessageCircle,
  Moon,
  Pencil,
  ShoppingBag,
  Star,
  Sun,
  TicketPercent,
  X,
} from "lucide-react";
import { WhiteLabelPropertyConfig } from "@/data/rooms";
import { LanguageCode } from "@/lib/dateFormatters";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";
import { StayDatePickerBar } from "@/components/booking/StayDatePickerBar";
import {
  HOTEL_NAV_TABS,
  HotelNavTabIcon,
  HotelNavTabId,
} from "@/components/navigation/NavigationIcons";
import {
  UserAvatarCircle,
  UserProfileDropdown,
  useAuthenticatedProfile,
} from "@/components/navigation/UserProfileDropdown";

export interface PrimaryNavigationProps {
  activeTab: HotelNavTabId;
  onSelectTab: (tab: HotelNavTabId) => void;
  propertyConfig?: WhiteLabelPropertyConfig;
  language: LanguageCode;
  onChangeLanguage?: (language: LanguageCode) => void;
  theme?: "light" | "dark";
  onToggleTheme?: () => void;
  brandCode?: string;
  availableUnitsCount?: number;
  availableRoomCount?: number;
  pendingAdminCount?: number;
  savedCouponsCount?: number;
  onOpenCouponWallet: () => void;
  checkInDate?: string;
  checkOutDate?: string;
  guestCount?: number;
  stayNights?: number;
  isCalendarDrawerOpen?: boolean;
  onOpenCalendarDrawer?: () => void;
  isChatOpen?: boolean;
  isEditMode?: boolean;
  onToggleEditMode?: () => void;
}

export function PrimaryNavigation({
  activeTab,
  onSelectTab,
  propertyConfig,
  language,
  onChangeLanguage,
  theme = "light",
  onToggleTheme,
  brandCode,
  availableUnitsCount,
  availableRoomCount,
  pendingAdminCount = 0,
  savedCouponsCount = 0,
  onOpenCouponWallet,
  checkInDate,
  checkOutDate,
  guestCount = 2,
  stayNights = 1,
  isCalendarDrawerOpen = false,
  onOpenCalendarDrawer,
  isChatOpen = false,
  isEditMode = false,
  onToggleEditMode,
}: PrimaryNavigationProps) {
  const [isMobileProfileDrawerOpen, setIsMobileProfileDrawerOpen] =
    useState(false);
  const { user, refreshProfile, signOutUser } = useAuthenticatedProfile();

  const brandBadgeCode = (
    propertyConfig?.brandCode ??
    brandCode ??
    "SU"
  ).slice(0, 2);
  const freeRoomCount = availableRoomCount ?? availableUnitsCount ?? 0;
  const isDarkTheme = theme === "dark";

  const normalizedActiveTab: HotelNavTabId =
    activeTab === "room" ? "book" : activeTab;

  const isHotelOrSuperAdmin =
    user?.role === "HOTEL_ADMIN" || user?.role === "SUPER_ADMIN";

  const adminHref =
    user?.tenantSlug && user.tenantSlug !== "sapanunseen"
      ? `/admin?tenant=${encodeURIComponent(user.tenantSlug)}`
      : "/admin";

  const handleToggleLanguage = () => {
    if (onChangeLanguage) {
      onChangeLanguage(language === "th" ? "en" : "th");
    }
  };

  useBodyScrollLock(isMobileProfileDrawerOpen);

  const propertyShortName =
    language === "th"
      ? propertyConfig?.nameTh?.split("(")[0]?.trim() || "สะปัน อันซีน"
      : propertyConfig?.nameEn || "Sapan Unseen";

  const leftRailSecondaryItems: Array<{
    id: HotelNavTabId;
    labelTh: string;
    labelEn: string;
    icon: React.ReactNode;
  }> = [
    {
      id: "review",
      labelTh: "รีวิวผู้เข้าพัก",
      labelEn: "Guest Reviews",
      icon: <Star className="w-[18px] h-[18px]" />,
    },
    {
      id: "guide",
      labelTh: "แผนที่ & ที่เที่ยว",
      labelEn: "Map & Guide",
      icon: <Compass className="w-[18px] h-[18px]" />,
    },
    {
      id: "setting",
      labelTh: "การจองของฉัน",
      labelEn: "My Bookings",
      icon: <CalendarCheck className="w-[18px] h-[18px]" />,
    },
  ];

  return (
    <>
      {/* =====================================================================
          1. FACEBOOK-STYLE ALWAYS-FIXED TOP BAR (h-14 = 56px)
      ====================================================================== */}
      <header
        aria-label="Top navigation bar"
        className="fixed top-0 inset-x-0 z-40 h-14 bg-[var(--color-background-card)] border-b border-[var(--color-border)] shadow-[0_1px_2px_rgba(0,0,0,0.06)] pr-[var(--scrollbar-compensation,0px)]"
      >
        <div className="w-full h-full px-3 sm:px-4 lg:px-5 flex items-center justify-between gap-2">
          {/* LEFT: Facebook-Style Brand Circle + Resort Title */}
          <Link
            href="/"
            onClick={(event) => {
              if (normalizedActiveTab === "home") {
                event.preventDefault();
                window.scrollTo({ top: 0, behavior: "smooth" });
              } else {
                onSelectTab("home");
              }
            }}
            aria-label="Home"
            className="inline-flex items-center gap-2.5 min-w-0 shrink-0 cursor-pointer"
          >
            <span className="h-10 w-10 rounded-full bg-[var(--color-accent)] text-[var(--color-on-accent)] inline-flex items-center justify-center font-bold ty-body shrink-0">
              {brandBadgeCode}
            </span>
            <span className="hidden sm:block ty-subtitle font-bold text-[var(--color-text-primary)] truncate max-w-[200px] lg:max-w-[240px]">
              {propertyShortName}
            </span>
          </Link>

          {/* CENTER: Compact Date Search Pill (Always accessible like Facebook Search) */}
          <div className="flex-1 max-w-[440px] flex items-center justify-center min-w-0">
            {checkInDate && checkOutDate ? (
              <StayDatePickerBar
                isCompact
                language={language}
                checkInDate={checkInDate}
                checkOutDate={checkOutDate}
                guestCount={guestCount}
                stayNights={stayNights}
                availableRoomUnitsCount={freeRoomCount}
                isCalendarOpen={isCalendarDrawerOpen}
                onOpenCalendarDrawer={onOpenCalendarDrawer || (() => {})}
              />
            ) : (
              <button
                type="button"
                onClick={() => onSelectTab("book")}
                className="h-10 px-4 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] ty-body font-medium inline-flex items-center gap-2 cursor-pointer"
              >
                <Calendar className="w-4 h-4 text-[var(--color-accent)]" />
                <span>
                  {language === "th" ? "เลือกวันเข้าพัก" : "Select Dates"}
                </span>
              </button>
            )}
          </div>

          {/* RIGHT: Facebook Action Circles (Messenger AI, Coupon Bag, Profile Avatar) */}
          <div className="flex items-center justify-end gap-2 shrink-0">
            {/* Desktop AI Chat Circle */}
            <div className="hidden sm:block shrink-0">
              <button
                type="button"
                onClick={() => onSelectTab("chat")}
                aria-label={language === "th" ? "ทักแชท AI" : "AI Messenger"}
                title={language === "th" ? "ทักแชทถามที่พัก" : "Ask AI Concierge"}
                className={`btn-icon btn-icon-lg relative ${
                  isChatOpen
                    ? "!bg-[var(--color-accent-muted)] !text-[var(--color-accent)]"
                    : ""
                }`}
              >
                <MessageCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Coupon Bag Circle */}
            <button
              type="button"
              onClick={onOpenCouponWallet}
              aria-label={
                language === "th" ? "กระเป๋าคูปองส่วนลด" : "Promo Coupon Bag"
              }
              title={
                language === "th" ? "กระเป๋าคูปองส่วนลด" : "Promo Coupon Bag"
              }
              className="btn-icon btn-icon-lg relative"
            >
              <ShoppingBag className="w-5 h-5" />
              {savedCouponsCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[19px] h-[19px] px-1 rounded-full bg-[var(--color-promo)] text-[var(--color-on-promo)] ty-caption font-bold inline-flex items-center justify-center leading-none">
                  {savedCouponsCount}
                </span>
              )}
            </button>

            {/* Mobile & Tablet (< lg): Profile Avatar Trigger */}
            <div className="lg:hidden shrink-0">
              <button
                type="button"
                aria-label={language === "th" ? "โปรไฟล์และเมนู" : "Profile menu"}
                onClick={() => {
                  refreshProfile();
                  setIsMobileProfileDrawerOpen((prevOpen) => !prevOpen);
                }}
                className={`btn-icon btn-icon-lg relative ${
                  user?.image ? "!p-0" : ""
                }`}
              >
                <UserAvatarCircle
                  user={user}
                  sizeClass="h-10 w-10"
                  iconSizeClass="w-5 h-5"
                />
                {isHotelOrSuperAdmin && pendingAdminCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-[var(--color-promo)] ring-2 ring-[var(--color-background-card)]" />
                )}
              </button>
            </div>

            {/* Desktop (>= lg): Facebook Profile Dropdown */}
            <div className="hidden lg:block shrink-0">
              <UserProfileDropdown
                language={language}
                onToggleLanguage={handleToggleLanguage}
                isDarkTheme={isDarkTheme}
                onToggleTheme={onToggleTheme}
                activeTab={normalizedActiveTab}
                onSelectTab={onSelectTab}
                savedCouponsCount={savedCouponsCount}
                onOpenCouponWallet={onOpenCouponWallet}
                pendingAdminCount={pendingAdminCount}
                isEditMode={isEditMode}
                onToggleEditMode={onToggleEditMode}
              />
            </div>
          </div>
        </div>
      </header>

      {/* =====================================================================
          2. FACEBOOK-STYLE DESKTOP LEFT NAVIGATION RAIL (>= lg, w-[244px])
             - Always readable, sits cleanly on #F2F4F7 wash without hover-jumping
      ====================================================================== */}
      <aside
        aria-label="Primary sidebar navigation"
        className="hidden lg:flex fixed top-14 bottom-0 left-0 z-30 w-[244px] flex-col justify-between bg-[var(--color-background-body)] py-3 px-2.5 overflow-y-auto select-none"
      >
        <div className="space-y-1">
          {HOTEL_NAV_TABS.filter((tab) => tab.id !== "chat").map((tab) => {
            const isTabActive = normalizedActiveTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  onSelectTab(tab.id);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={`w-full h-11 rounded-[8px] flex items-center justify-between px-2.5 ty-body transition-colors cursor-pointer ${
                  isTabActive
                    ? "bg-[var(--color-background-subtle)] font-semibold text-[var(--color-accent)]"
                    : "hover:bg-[var(--color-overlay-hover)] font-medium text-[var(--color-text-primary)]"
                }`}
              >
                <span className="flex items-center gap-3 min-w-0">
                  <span
                    className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                      isTabActive
                        ? "bg-[var(--color-accent)] text-[var(--color-on-accent)]"
                        : "bg-[var(--color-background-subtle)] text-[var(--color-text-primary)]"
                    }`}
                  >
                    <HotelNavTabIcon
                      id={tab.id}
                      isActive={false}
                      cutoutColor="transparent"
                      className="w-[18px] h-[18px]"
                    />
                  </span>
                  <span className="truncate">
                    {language === "th" ? tab.labelTh : tab.labelEn}
                  </span>
                </span>

                {tab.id === "book" && freeRoomCount > 0 && (
                  <span className="rounded-full bg-[var(--color-accent-muted)] text-[var(--color-accent)] px-2 py-0.5 ty-caption font-semibold">
                    {freeRoomCount}
                  </span>
                )}
              </button>
            );
          })}

          <div className="my-2 border-t border-[var(--color-border)] mx-2" />

          {leftRailSecondaryItems.map((item) => {
            const isTabActive = normalizedActiveTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectTab(item.id);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={`w-full h-11 rounded-[8px] flex items-center gap-3 px-2.5 ty-body transition-colors cursor-pointer ${
                  isTabActive
                    ? "bg-[var(--color-background-subtle)] font-semibold text-[var(--color-accent)]"
                    : "hover:bg-[var(--color-overlay-hover)] font-medium text-[var(--color-text-primary)]"
                }`}
              >
                <span
                  className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                    isTabActive
                      ? "bg-[var(--color-accent)] text-[var(--color-on-accent)]"
                      : "bg-[var(--color-background-subtle)] text-[var(--color-text-primary)]"
                  }`}
                >
                  {item.icon}
                </span>
                <span className="truncate">
                  {language === "th" ? item.labelTh : item.labelEn}
                </span>
              </button>
            );
          })}
        </div>

        {/* Bottom Platform CTA / Admin Quick Link */}
        <div className="pt-3 border-t border-[var(--color-border)] px-1 space-y-2">
          {isHotelOrSuperAdmin ? (
            <Link
              href={adminHref}
              className="w-full h-10 px-3 rounded-[8px] bg-[var(--color-background-card)] hover:bg-[var(--color-background-subtle)] shadow-[var(--shadow-card)] flex items-center justify-between ty-body font-semibold text-[var(--color-text-primary)] transition"
            >
              <span className="flex items-center gap-2.5">
                <LayoutDashboard className="w-4 h-4 text-[var(--color-accent)]" />
                <span>
                  {language === "th" ? "จัดการที่พัก" : "Hotel Admin"}
                </span>
              </span>
              {pendingAdminCount > 0 && (
                <span className="badge-promo">{pendingAdminCount}</span>
              )}
            </Link>
          ) : (
            <Link
              href="/register-hotel"
              className="w-full px-3 py-2.5 rounded-[10px] bg-[var(--color-background-card)] hover:bg-[var(--color-background-subtle)] shadow-[var(--shadow-card)] flex items-center gap-2.5 transition"
            >
              <span className="h-8 w-8 rounded-full bg-[var(--color-accent-muted)] text-[var(--color-accent)] flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <p className="ty-caption font-bold text-[var(--color-text-primary)] truncate">
                  {language === "th"
                    ? "สำหรับเจ้าของที่พัก"
                    : "For Hotel Owners"}
                </p>
                <p className="ty-caption text-[var(--color-accent)] font-semibold truncate">
                  {language === "th"
                    ? "ทดลองเปิดเว็บฟรี 30 วัน"
                    : "30-Day Free Trial"}
                </p>
              </div>
            </Link>
          )}
          <p className="px-2 ty-caption">Cangaroom · Direct Booking</p>
        </div>
      </aside>

      {/* =====================================================================
          3. MOBILE PROFILE & MENU RIGHT SIDEBAR DRAWER
      ====================================================================== */}
      {isMobileProfileDrawerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={language === "th" ? "โปรไฟล์และเมนู" : "Profile and menu"}
          className="fixed inset-0 z-[75] overflow-hidden"
        >
          <div
            className="app-right-drawer-backdrop animate-fade-in-backdrop"
            onClick={() => setIsMobileProfileDrawerOpen(false)}
          />

          <aside className="app-right-drawer z-10 px-4 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] justify-between animate-slide-in-right-drawer">
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-[var(--color-border)]">
              {user ? (
                <div className="flex items-center gap-3 min-w-0">
                  <UserAvatarCircle user={user} sizeClass="h-10 w-10" />
                  <div className="min-w-0">
                    <h2 className="ty-subtitle truncate">{user.name}</h2>
                    <p className="ty-caption truncate">{user.email}</p>
                  </div>
                </div>
              ) : (
                <div className="min-w-0">
                  <h2 className="ty-subtitle truncate">
                    {language === "th" ? "เมนูและบัญชีผู้ใช้" : "Menu & Account"}
                  </h2>
                  <p className="ty-caption truncate">{propertyShortName}</p>
                </div>
              )}
              <button
                type="button"
                onClick={() => setIsMobileProfileDrawerOpen(false)}
                aria-label="Close menu"
                className="btn-icon"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto py-3 space-y-1">
              {!user && (
                <Link
                  href="/login"
                  onClick={() => setIsMobileProfileDrawerOpen(false)}
                  className="w-full h-10 px-3.5 rounded-[8px] bg-[var(--color-accent)] text-[var(--color-on-accent)] flex items-center justify-center gap-2 ty-body font-semibold transition mb-2"
                >
                  <LogIn className="w-4 h-4" />
                  <span>
                    {language === "th"
                      ? "เข้าสู่ระบบด้วย Google"
                      : "Sign in with Google"}
                  </span>
                </Link>
              )}

              <button
                type="button"
                onClick={() => {
                  onSelectTab("setting");
                  setIsMobileProfileDrawerOpen(false);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="w-full h-11 px-2.5 rounded-[8px] hover:bg-[var(--color-background-muted)] flex items-center gap-3 ty-body font-medium transition cursor-pointer"
              >
                <CalendarCheck className="w-5 h-5 text-[var(--color-text-secondary)]" />
                <span>
                  {language === "th" ? "การจองของฉัน" : "My Bookings"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsMobileProfileDrawerOpen(false);
                  onOpenCouponWallet();
                }}
                className="w-full h-11 px-2.5 rounded-[8px] hover:bg-[var(--color-background-muted)] flex items-center justify-between ty-body font-medium transition cursor-pointer"
              >
                <span className="flex items-center gap-3">
                  <TicketPercent className="w-5 h-5 text-[var(--color-promo-text)]" />
                  <span>
                    {language === "th" ? "คูปองส่วนลด" : "Coupon Wallet"}
                  </span>
                </span>
                {savedCouponsCount > 0 && (
                  <span className="badge-promo">{savedCouponsCount}</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  onSelectTab("review");
                  setIsMobileProfileDrawerOpen(false);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="w-full h-11 px-2.5 rounded-[8px] hover:bg-[var(--color-background-muted)] flex items-center gap-3 ty-body font-medium transition cursor-pointer"
              >
                <Star className="w-5 h-5 text-[var(--color-text-secondary)]" />
                <span>
                  {language === "th" ? "รีวิวผู้เข้าพัก" : "Guest Reviews"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onSelectTab("guide");
                  setIsMobileProfileDrawerOpen(false);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="w-full h-11 px-2.5 rounded-[8px] hover:bg-[var(--color-background-muted)] flex items-center gap-3 ty-body font-medium transition cursor-pointer"
              >
                <Compass className="w-5 h-5 text-[var(--color-text-secondary)]" />
                <span>
                  {language === "th" ? "แผนที่ & ที่เที่ยว" : "Map & Guide"}
                </span>
              </button>

              <div className="my-2 border-t border-[var(--color-border)]" />

              {isHotelOrSuperAdmin ? (
                <>
                  {onToggleEditMode && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileProfileDrawerOpen(false);
                        onToggleEditMode();
                      }}
                      className={`w-full h-11 px-2.5 rounded-[8px] flex items-center justify-between ty-body font-medium transition cursor-pointer ${
                        isEditMode
                          ? "bg-[var(--color-accent-muted)] text-[var(--color-accent)] font-semibold"
                          : "hover:bg-[var(--color-background-muted)]"
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <Pencil className="w-5 h-5 text-[var(--color-accent)]" />
                        <span>
                          {language === "th"
                            ? "แก้ไขหน้าเว็บตรงจุด"
                            : "Edit Live Page"}
                        </span>
                      </span>
                      <span className="ty-caption font-semibold">
                        {isEditMode ? "เปิดอยู่" : "ปิด"}
                      </span>
                    </button>
                  )}

                  <Link
                    href={adminHref}
                    onClick={() => setIsMobileProfileDrawerOpen(false)}
                    className="w-full h-11 px-2.5 rounded-[8px] hover:bg-[var(--color-background-muted)] flex items-center justify-between ty-body font-medium transition"
                  >
                    <span className="flex items-center gap-3">
                      <LayoutDashboard className="w-5 h-5 text-[var(--color-text-secondary)]" />
                      <span>
                        {language === "th"
                          ? "จัดการที่พัก (Admin)"
                          : "Hotel Admin"}
                      </span>
                    </span>
                    {pendingAdminCount > 0 && (
                      <span className="badge-promo">{pendingAdminCount}</span>
                    )}
                  </Link>

                  {user?.role === "SUPER_ADMIN" && (
                    <Link
                      href="/super-admin"
                      onClick={() => setIsMobileProfileDrawerOpen(false)}
                      className="w-full h-11 px-2.5 rounded-[8px] hover:bg-[var(--color-background-muted)] flex items-center gap-3 ty-body font-medium transition"
                    >
                      <Crown className="w-5 h-5 text-[var(--color-accent)]" />
                      <span>
                        {language === "th"
                          ? "ระบบแพลตฟอร์ม (Super Admin)"
                          : "Super Admin"}
                      </span>
                    </Link>
                  )}
                </>
              ) : (
                <Link
                  href="/register-hotel"
                  onClick={() => setIsMobileProfileDrawerOpen(false)}
                  className="w-full h-11 px-2.5 rounded-[8px] hover:bg-[var(--color-background-muted)] flex items-center gap-3 ty-body font-semibold text-[var(--color-accent)] transition"
                >
                  <Building2 className="w-5 h-5" />
                  <span>
                    {language === "th"
                      ? "สร้างเว็บที่พักฟรี 30 วัน"
                      : "Start 30-Day Free Trial"}
                  </span>
                </Link>
              )}

              <div className="my-2 border-t border-[var(--color-border)]" />

              {onToggleTheme && (
                <button
                  type="button"
                  onClick={onToggleTheme}
                  className="w-full h-11 px-2.5 rounded-[8px] hover:bg-[var(--color-background-muted)] flex items-center justify-between ty-body font-medium transition cursor-pointer"
                >
                  <span className="flex items-center gap-3">
                    {isDarkTheme ? (
                      <Moon className="w-5 h-5 text-[var(--color-text-secondary)]" />
                    ) : (
                      <Sun className="w-5 h-5 text-[var(--color-text-secondary)]" />
                    )}
                    <span>
                      {language === "th" ? "การแสดงผล" : "Appearance"}
                    </span>
                  </span>
                  <span className="ty-caption font-semibold">
                    {language === "th"
                      ? isDarkTheme
                        ? "โหมดมืด"
                        : "โหมดสว่าง"
                      : isDarkTheme
                      ? "Dark"
                      : "Light"}
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={handleToggleLanguage}
                className="w-full h-11 px-2.5 rounded-[8px] hover:bg-[var(--color-background-muted)] flex items-center justify-between ty-body font-medium transition cursor-pointer"
              >
                <span className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-[var(--color-text-secondary)]" />
                  <span>{language === "th" ? "ภาษา" : "Language"}</span>
                </span>
                <span className="ty-caption font-semibold">
                  {language === "th" ? "ภาษาไทย" : "English"}
                </span>
              </button>

              {user && (
                <button
                  type="button"
                  onClick={async () => {
                    await signOutUser();
                    setIsMobileProfileDrawerOpen(false);
                  }}
                  className="w-full h-11 px-2.5 rounded-[8px] hover:bg-[var(--color-background-muted)] flex items-center gap-3 ty-body font-medium text-[var(--color-error)] transition cursor-pointer"
                >
                  <LogOut className="w-5 h-5" />
                  <span>
                    {language === "th" ? "ออกจากระบบ" : "Log Out"}
                  </span>
                </button>
              )}
            </nav>
          </aside>
        </div>
      )}

      {/* =====================================================================
          4. CLEAN FACEBOOK-STYLE MOBILE BOTTOM TAB BAR (< lg)
             - Flat, clean, zero floating cartoon bubbles
      ====================================================================== */}
      <nav
        aria-label="Mobile bottom navigation"
        className={`${
          normalizedActiveTab === "chat" ? "hidden" : "lg:hidden"
        } fixed inset-x-0 bottom-0 z-40 bg-[var(--color-background-card)] border-t border-[var(--color-border)] pb-[env(safe-area-inset-bottom)] select-none`}
      >
        <div className="max-w-[540px] mx-auto px-1 h-[54px] grid grid-cols-5 items-stretch">
          {HOTEL_NAV_TABS.map((tab) => {
            const effectiveActiveTab: HotelNavTabId = isChatOpen
              ? "chat"
              : normalizedActiveTab;
            const isTabActive =
              effectiveActiveTab === tab.id && !isMobileProfileDrawerOpen;

            return (
              <button
                key={tab.id}
                type="button"
                aria-label={tab.labelEn}
                onClick={() => {
                  setIsMobileProfileDrawerOpen(false);
                  onSelectTab(tab.id);
                  if (tab.id !== "chat") {
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }
                }}
                className={`relative flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
                  isTabActive
                    ? "text-[var(--color-accent)]"
                    : "text-[var(--color-text-secondary)]"
                }`}
              >
                {isTabActive && (
                  <span className="absolute top-0 inset-x-3 h-[2.5px] rounded-b-full bg-[var(--color-accent)]" />
                )}
                <span className="relative flex items-center justify-center h-6">
                  {tab.id === "chat" ? (
                    <MessageCircle className="w-[21px] h-[21px]" />
                  ) : (
                    <HotelNavTabIcon
                      id={tab.id}
                      isActive={isTabActive}
                      cutoutColor="var(--color-background-card)"
                      className="w-[21px] h-[21px]"
                    />
                  )}
                  {tab.id === "book" && freeRoomCount > 0 && (
                    <span className="absolute -top-1 -right-2.5 h-4 min-w-[16px] px-1 rounded-full bg-[var(--color-accent)] text-[var(--color-on-accent)] text-[11px] font-bold inline-flex items-center justify-center leading-none">
                      {freeRoomCount}
                    </span>
                  )}
                </span>
                <span
                  className={`text-[11px] leading-tight whitespace-nowrap ${
                    isTabActive ? "font-semibold" : "font-normal"
                  }`}
                >
                  {language === "th" ? tab.labelTh : tab.labelEn}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
