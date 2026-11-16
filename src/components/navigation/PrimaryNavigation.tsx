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

  const desktopPrimaryTabs = HOTEL_NAV_TABS.filter((t) => t.id !== "chat");

  return (
    <>
      {/* =====================================================================
          1. CANGAROOM SIGNATURE TOP NAVBAR (Airbnb × Instagram Clean Header)
             - Centered max-w-[1120px], symmetric open-canvas balance
      ====================================================================== */}
      <header
        aria-label="Top navigation bar"
        className="fixed top-0 inset-x-0 z-40 h-16 bg-[var(--color-background-body)]/95 backdrop-blur-md border-b border-[var(--color-border)] pr-[var(--scrollbar-compensation,0px)]"
      >
        <div className="w-full max-w-[1120px] mx-auto h-full px-3 sm:px-5 lg:px-6 flex items-center justify-between gap-2">
          {/* LEFT: Brand Mark + Property Name */}
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
            className="inline-flex items-center gap-2.5 min-w-0 shrink-0 cursor-pointer group/brand"
          >
            <span className="h-9 w-9 rounded-[10px] bg-[var(--color-accent)] text-[var(--color-on-accent)] inline-flex items-center justify-center font-bold ty-body shrink-0 transition-transform group-hover/brand:scale-105">
              {brandBadgeCode}
            </span>
            <span className="hidden sm:block ty-subtitle font-bold text-[var(--color-text-primary)] truncate max-w-[180px] xl:max-w-[220px]">
              {propertyShortName}
            </span>
          </Link>

          {/* CENTER (Desktop >= lg): Clean Airbnb-Style Navigation Tabs */}
          <nav
            aria-label="Primary tabs"
            className="hidden lg:flex items-center gap-1 rounded-full bg-[var(--color-background-muted)] p-1 border border-[var(--color-border)]"
          >
            {desktopPrimaryTabs.map((tab) => {
              const isTabActive = normalizedActiveTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    onSelectTab(tab.id);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className={`h-9 px-4 rounded-full inline-flex items-center gap-2 ty-body transition cursor-pointer ${
                    isTabActive
                      ? "bg-[var(--color-background-card)] text-[var(--color-text-primary)] font-semibold shadow-[0_1px_4px_rgba(0,0,0,0.08)]"
                      : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] font-medium"
                  }`}
                >
                  <span>
                    {language === "th" ? tab.labelTh : tab.labelEn}
                  </span>
                  {tab.id === "book" && freeRoomCount > 0 && (
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold leading-none ${
                        isTabActive
                          ? "bg-[var(--color-accent)] text-[var(--color-on-accent)]"
                          : "bg-[var(--color-background-subtle)] text-[var(--color-text-primary)]"
                      }`}
                    >
                      {freeRoomCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* CENTER (< lg Mobile/Tablet): Compact Date Search Pill */}
          <div className="flex lg:hidden flex-1 max-w-[320px] items-center justify-center min-w-0">
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
                className="h-9 px-3.5 rounded-full bg-[var(--color-background-muted)] text-[var(--color-text-primary)] ty-caption font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                <span>
                  {language === "th" ? "เลือกวันเข้าพัก" : "Select Dates"}
                </span>
              </button>
            )}
          </div>

          {/* RIGHT: Date Trigger (xl) + AI Concierge + Coupon Bag + Single Profile Avatar */}
          <div className="flex items-center justify-end gap-2 shrink-0">
            {checkInDate && checkOutDate && (
              <div className="hidden xl:block">
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
              </div>
            )}

            {/* Desktop AI Chat Circle */}
            <div className="hidden sm:block shrink-0">
              <button
                type="button"
                onClick={() => onSelectTab("chat")}
                aria-label={language === "th" ? "ทักแชท AI" : "AI Concierge"}
                title={language === "th" ? "ถามผู้ช่วยที่พัก" : "Ask AI Concierge"}
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
                aria-label={
                  language === "th" ? "โปรไฟล์และเมนู" : "Profile menu"
                }
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

            {/* Desktop (>= lg): Single Profile Dropdown */}
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
          2. MOBILE PROFILE & MENU RIGHT SIDEBAR DRAWER
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
                  className="w-full h-10 px-3.5 rounded-[10px] bg-[var(--color-accent)] text-[var(--color-on-accent)] flex items-center justify-center gap-2 ty-body font-semibold transition mb-2"
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
                className="w-full h-11 px-2.5 rounded-[10px] hover:bg-[var(--color-background-muted)] flex items-center gap-3 ty-body font-medium transition cursor-pointer"
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
                className="w-full h-11 px-2.5 rounded-[10px] hover:bg-[var(--color-background-muted)] flex items-center justify-between ty-body font-medium transition cursor-pointer"
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
                className="w-full h-11 px-2.5 rounded-[10px] hover:bg-[var(--color-background-muted)] flex items-center gap-3 ty-body font-medium transition cursor-pointer"
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
                className="w-full h-11 px-2.5 rounded-[10px] hover:bg-[var(--color-background-muted)] flex items-center gap-3 ty-body font-medium transition cursor-pointer"
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
                      className={`w-full h-11 px-2.5 rounded-[10px] flex items-center justify-between ty-body font-medium transition cursor-pointer ${
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
                    className="w-full h-11 px-2.5 rounded-[10px] hover:bg-[var(--color-background-muted)] flex items-center justify-between ty-body font-medium transition"
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
                      className="w-full h-11 px-2.5 rounded-[10px] hover:bg-[var(--color-background-muted)] flex items-center gap-3 ty-body font-medium transition"
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
                  className="w-full h-11 px-2.5 rounded-[10px] hover:bg-[var(--color-background-muted)] flex items-center gap-3 ty-body font-semibold text-[var(--color-accent)] transition"
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
                  className="w-full h-11 px-2.5 rounded-[10px] hover:bg-[var(--color-background-muted)] flex items-center justify-between ty-body font-medium transition cursor-pointer"
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
                className="w-full h-11 px-2.5 rounded-[10px] hover:bg-[var(--color-background-muted)] flex items-center justify-between ty-body font-medium transition cursor-pointer"
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
                  className="w-full h-11 px-2.5 rounded-[10px] hover:bg-[var(--color-background-muted)] flex items-center gap-3 ty-body font-medium text-[var(--color-error)] transition cursor-pointer"
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
          3. MOBILE BOTTOM TAB BAR (< lg)
      ====================================================================== */}
      <nav
        aria-label="Mobile bottom navigation"
        className={`${
          normalizedActiveTab === "chat" ? "hidden" : "lg:hidden"
        } fixed inset-x-0 bottom-0 z-40 bg-[var(--color-background-card)] border-t border-[var(--color-border)] pb-[env(safe-area-inset-bottom)] select-none`}
      >
        <div className="max-w-[540px] mx-auto px-1 h-[56px] grid grid-cols-5 items-stretch">
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
