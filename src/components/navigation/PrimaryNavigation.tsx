"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Bookmark,
  Building2,
  CalendarCheck,
  Crown,
  Globe,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Moon,
  PlusSquare,
  Search,
  ShoppingBag,
  Sun,
  TicketPercent,
  X,
} from "lucide-react";
import type { LanguageCode } from "@/lib/dateFormatters";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";
import type { AuthenticatedMeDto } from "@/types/cangaroom";
import { AgodaDateRangeFilter } from "@/components/navigation/AgodaDateRangeFilter";
import {
  MOBILE_BOTTOM_TABS,
  PlatformNavIcon,
  type PlatformNavTabId,
} from "@/components/navigation/NavigationIcons";
import { ProvinceSearchDropdown } from "@/components/navigation/ProvinceSearchDropdown";
import {
  UserAvatarCircle,
  UserProfileDropdown,
} from "@/components/navigation/UserProfileDropdown";

export interface PrimaryNavigationProps {
  activeTab: PlatformNavTabId;
  showSearchBar: boolean;
  user: AuthenticatedMeDto | null;
  onRefreshProfile: () => Promise<void>;
  onSignOut: () => Promise<void>;
  language: LanguageCode;
  onChangeLanguage: (language: LanguageCode) => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onOpenCouponWallet: () => void;
  checkInDate: string;
  checkOutDate: string;
  onChangeCheckInDate: (dateStr: string) => void;
  onChangeCheckOutDate: (dateStr: string) => void;
  todayDate: Date;
  guestCount: number;
  onChangeGuestCount: (guests: number) => void;
  isDateFilterActive: boolean;
  onChangeDateFilterActive: (active: boolean) => void;
  selectedProvinceId: string | null;
  onSelectProvince: (provinceId: string | null) => void;
  searchQuery: string;
  onChangeSearchQuery: (query: string) => void;
}

export function PrimaryNavigation({
  activeTab,
  showSearchBar,
  user,
  onRefreshProfile,
  onSignOut,
  language,
  onChangeLanguage,
  theme,
  onToggleTheme,
  onOpenCouponWallet,
  checkInDate,
  checkOutDate,
  onChangeCheckInDate,
  onChangeCheckOutDate,
  todayDate,
  guestCount,
  onChangeGuestCount,
  isDateFilterActive,
  onChangeDateFilterActive,
  selectedProvinceId,
  onSelectProvince,
  searchQuery,
  onChangeSearchQuery,
}: PrimaryNavigationProps) {
  const [isMobileProfileDrawerOpen, setIsMobileProfileDrawerOpen] =
    useState(false);
  const [isMorePopoverOpen, setIsMorePopoverOpen] = useState(false);
  const moreWrapperRef = useRef<HTMLDivElement | null>(null);

  useBodyScrollLock(isMobileProfileDrawerOpen);

  useEffect(() => {
    if (!isMorePopoverOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (
        moreWrapperRef.current &&
        !moreWrapperRef.current.contains(e.target as Node)
      ) {
        setIsMorePopoverOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMorePopoverOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    window.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      window.removeEventListener("keydown", handleEsc);
    };
  }, [isMorePopoverOpen]);

  const isDarkTheme = theme === "dark";
  const savedPinsCount = user?.savedPinsCount ?? 0;
  const savedCouponsCount = user?.savedCouponsCount ?? 0;
  const ownedHotel = user?.ownedHotels?.[0] ?? null;
  const hasStudioAccess =
    Boolean(ownedHotel) ||
    user?.role === "HOTEL_OWNER" ||
    user?.role === "SUPER_ADMIN";
  const pendingStudioBookings =
    user?.ownedHotels?.reduce((sum, h) => sum + h.pendingBookingsCount, 0) ?? 0;

  return (
    <>
      {/* 1. INSTAGRAM-STYLE MINIMAL 72px LEFT SIDEBAR (>= lg) */}
      <aside
        aria-label="Primary sidebar navigation"
        className="hidden lg:flex fixed inset-y-0 left-0 z-50 w-[72px] flex-col items-center justify-between bg-[var(--color-background-card)] border-r border-[var(--color-border)] py-5 select-none"
      >
        {/* Top Brand Glyph */}
        <Link
          href="/"
          title="Cangaroom · Thailand Direct Stays"
          aria-label="Home"
          className="h-12 w-12 rounded-[16px] hover:bg-[var(--color-background-muted)] flex items-center justify-center text-[var(--color-text-primary)] transition-colors"
        >
          <svg
            viewBox="0 0 24 24"
            className="w-[27px] h-[27px]"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect width="18" height="18" x="3" y="3" rx="5.5" />
            <path d="M8 15.5 12 8.5l4 7" />
            <circle
              cx="16.5"
              cy="7.5"
              r="1.15"
              fill="currentColor"
              stroke="none"
            />
          </svg>
        </Link>

        {/* Center Vertically Balanced Stack */}
        <nav
          aria-label="Main navigation"
          className="flex flex-col items-center gap-2.5"
        >
          <Link
            href="/"
            title={language === "th" ? "หน้าแรก" : "Home"}
            aria-label="Home"
            className={`h-12 w-12 rounded-[16px] hover:bg-[var(--color-background-muted)] flex items-center justify-center text-[var(--color-text-primary)] transition-colors ${
              activeTab === "home" ? "bg-[var(--color-background-muted)]/75" : ""
            }`}
          >
            <PlatformNavIcon id="home" isActive={activeTab === "home"} />
          </Link>

          <Link
            href="/board"
            title={
              language === "th"
                ? `บอร์ดที่บันทึกไว้${savedPinsCount > 0 ? ` (${savedPinsCount})` : ""}`
                : `Saved Boards${savedPinsCount > 0 ? ` (${savedPinsCount})` : ""}`
            }
            aria-label="Saved Boards"
            className={`h-12 w-12 rounded-[16px] hover:bg-[var(--color-background-muted)] flex items-center justify-center text-[var(--color-text-primary)] transition-colors relative ${
              activeTab === "board" ? "bg-[var(--color-background-muted)]/75" : ""
            }`}
          >
            <PlatformNavIcon id="board" isActive={activeTab === "board"} />
            {savedPinsCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-[6px] bg-[var(--color-promo)] text-[var(--color-on-promo)] text-[10px] font-bold inline-flex items-center justify-center leading-none">
                {savedPinsCount > 99 ? "99+" : savedPinsCount}
              </span>
            )}
          </Link>

          <Link
            href="/deal"
            title={
              language === "th"
                ? "ศูนย์รวมคูปองส่วนลดที่พัก"
                : "Deals & Hotel Coupons"
            }
            aria-label="Deals"
            className={`h-12 w-12 rounded-[16px] hover:bg-[var(--color-background-muted)] flex items-center justify-center text-[var(--color-text-primary)] transition-colors relative ${
              activeTab === "deal" ? "bg-[var(--color-background-muted)]/75" : ""
            }`}
          >
            <PlatformNavIcon id="deal" isActive={activeTab === "deal"} />
            {savedCouponsCount > 0 && (
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[var(--color-promo)]" />
            )}
          </Link>

          {hasStudioAccess ? (
            <Link
              href="/studio"
              title={
                language === "th" ? "จัดการที่พัก (Studio)" : "Hotel Studio"
              }
              aria-label="Hotel Studio"
              className={`h-12 w-12 rounded-[16px] hover:bg-[var(--color-background-muted)] flex items-center justify-center text-[var(--color-text-primary)] transition-colors relative ${
                activeTab === "studio"
                  ? "bg-[var(--color-background-muted)]/75"
                  : ""
              }`}
            >
              <LayoutDashboard
                className="w-[25px] h-[25px]"
                strokeWidth={activeTab === "studio" ? 2.4 : 2}
              />
              {pendingStudioBookings > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-[6px] bg-[var(--color-promo)] text-[var(--color-on-promo)] text-[10px] font-bold inline-flex items-center justify-center leading-none">
                  {pendingStudioBookings}
                </span>
              )}
            </Link>
          ) : (
            <Link
              href="/register-hotel"
              title={
                language === "th"
                  ? "เปิดเพจที่พักฟรี 0% GP"
                  : "List Your Property Free (0% GP)"
              }
              aria-label="List Hotel Free"
              className={`h-12 w-12 rounded-[16px] hover:bg-[var(--color-background-muted)] flex items-center justify-center text-[var(--color-text-primary)] transition-colors ${
                activeTab === "register-hotel"
                  ? "bg-[var(--color-background-muted)]/75"
                  : ""
              }`}
            >
              <PlusSquare
                className="w-[25px] h-[25px]"
                strokeWidth={activeTab === "register-hotel" ? 2.4 : 2}
              />
            </Link>
          )}

          <Link
            href="/trips"
            title={
              language === "th"
                ? "การจอง & กระเป๋าคูปองของฉัน"
                : "My Trips & Coupon Wallet"
            }
            aria-label="My Trips and Profile"
            className="h-12 w-12 rounded-[16px] hover:bg-[var(--color-background-muted)] flex items-center justify-center transition-colors"
          >
            <span
              className={`rounded-full p-[1.5px] ${
                activeTab === "trips"
                  ? "ring-2 ring-[var(--color-text-primary)]"
                  : ""
              }`}
            >
              <UserAvatarCircle
                user={user}
                sizeClass="h-7 w-7"
                iconSizeClass="w-[24px] h-[24px]"
              />
            </span>
          </Link>
        </nav>

        {/* Bottom More Menu (≡) */}
        <div ref={moreWrapperRef} className="relative">
          <button
            type="button"
            onClick={() => setIsMorePopoverOpen((v) => !v)}
            title={language === "th" ? "เมนูเพิ่มเติม" : "More"}
            aria-label="More menu"
            className={`h-12 w-12 rounded-[16px] hover:bg-[var(--color-background-muted)] flex items-center justify-center text-[var(--color-text-primary)] transition-colors cursor-pointer ${
              isMorePopoverOpen ? "bg-[var(--color-background-muted)]" : ""
            }`}
          >
            <Menu
              className="w-[26px] h-[26px]"
              strokeWidth={isMorePopoverOpen ? 2.5 : 2}
            />
          </button>

          {isMorePopoverOpen && (
            <div className="absolute left-0 bottom-[calc(100%+8px)] w-[268px] rounded-[16px] bg-[var(--color-background-popover)] p-2 shadow-[var(--shadow-popover)] border border-[var(--color-border)] space-y-0.5 z-50">
              <Link
                href="/board"
                onClick={() => setIsMorePopoverOpen(false)}
                className="w-full h-11 px-3 rounded-[10px] hover:bg-[var(--color-background-muted)] flex items-center justify-between ty-body"
              >
                <span className="flex items-center gap-3">
                  <Bookmark className="w-[20px] h-[20px]" />
                  <span>
                    {language === "th"
                      ? "บอร์ดที่พักที่บันทึกไว้"
                      : "My Saved Boards"}
                  </span>
                </span>
                {savedPinsCount > 0 && (
                  <span className="badge-promo">{savedPinsCount}</span>
                )}
              </Link>

              <Link
                href="/trips"
                onClick={() => setIsMorePopoverOpen(false)}
                className="w-full h-11 px-3 rounded-[10px] hover:bg-[var(--color-background-muted)] flex items-center gap-3 ty-body"
              >
                <CalendarCheck className="w-[20px] h-[20px]" />
                <span>
                  {language === "th"
                    ? "การจอง & คูปองของฉัน"
                    : "My Trips & Wallet"}
                </span>
              </Link>

              <Link
                href="/register-hotel"
                onClick={() => setIsMorePopoverOpen(false)}
                className="w-full h-11 px-3 rounded-[10px] hover:bg-[var(--color-background-muted)] flex items-center gap-3 ty-body font-semibold"
              >
                <Building2 className="w-[20px] h-[20px]" />
                <span>
                  {language === "th"
                    ? "เปิดเพจที่พักฟรี 0% GP"
                    : "List Property Free"}
                </span>
              </Link>

              <button
                type="button"
                onClick={onToggleTheme}
                className="w-full h-11 px-3 rounded-[10px] hover:bg-[var(--color-background-muted)] flex items-center justify-between ty-body cursor-pointer"
              >
                <span className="flex items-center gap-3">
                  {isDarkTheme ? (
                    <Moon className="w-[20px] h-[20px]" />
                  ) : (
                    <Sun className="w-[20px] h-[20px]" />
                  )}
                  <span>
                    {language === "th" ? "สลับโหมดสี" : "Switch appearance"}
                  </span>
                </span>
                <span className="ty-caption font-semibold">
                  {isDarkTheme ? "Dark" : "Light"}
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  onChangeLanguage(language === "th" ? "en" : "th")
                }
                className="w-full h-11 px-3 rounded-[10px] hover:bg-[var(--color-background-muted)] flex items-center justify-between ty-body cursor-pointer"
              >
                <span className="flex items-center gap-3">
                  <Globe className="w-[20px] h-[20px]" />
                  <span>{language === "th" ? "ภาษา" : "Language"}</span>
                </span>
                <span className="ty-caption font-semibold">
                  {language === "th" ? "TH" : "EN"}
                </span>
              </button>

              {hasStudioAccess && (
                <>
                  <div className="my-1 border-t border-[var(--color-border)]" />
                  <Link
                    href="/studio"
                    onClick={() => setIsMorePopoverOpen(false)}
                    className="w-full h-11 px-3 rounded-[10px] hover:bg-[var(--color-background-muted)] flex items-center justify-between ty-body"
                  >
                    <span className="flex items-center gap-3">
                      <LayoutDashboard className="w-[20px] h-[20px]" />
                      <span>Hotel Studio</span>
                    </span>
                    {pendingStudioBookings > 0 && (
                      <span className="badge-promo">
                        {pendingStudioBookings}
                      </span>
                    )}
                  </Link>
                </>
              )}

              {user?.role === "SUPER_ADMIN" && (
                <Link
                  href="/super-admin"
                  onClick={() => setIsMorePopoverOpen(false)}
                  className="w-full h-11 px-3 rounded-[10px] hover:bg-[var(--color-background-muted)] flex items-center gap-3 ty-body"
                >
                  <Crown className="w-[20px] h-[20px]" />
                  <span>Super Admin</span>
                </Link>
              )}

              <div className="my-1 border-t border-[var(--color-border)]" />
              {user ? (
                <button
                  type="button"
                  onClick={async () => {
                    await onSignOut();
                    setIsMorePopoverOpen(false);
                  }}
                  className="w-full h-11 px-3 rounded-[10px] hover:bg-[var(--color-background-muted)] flex items-center gap-3 ty-body text-[var(--color-error)] cursor-pointer"
                >
                  <LogOut className="w-[20px] h-[20px]" />
                  <span>{language === "th" ? "ออกจากระบบ" : "Log out"}</span>
                </button>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setIsMorePopoverOpen(false)}
                  className="w-full h-11 px-3 rounded-[10px] hover:bg-[var(--color-background-muted)] flex items-center gap-3 ty-body font-semibold"
                >
                  <LogIn className="w-[20px] h-[20px]" />
                  <span>{language === "th" ? "เข้าสู่ระบบ" : "Log in"}</span>
                </Link>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* 2. UNIFIED 64px TOP HEADER BAR (Exact px-4 sm:px-6 lg:px-8 Gutter Matching Main) */}
      <header
        aria-label="Top navigation bar"
        className="fixed top-0 inset-x-0 lg:left-[72px] z-40 h-16 bg-[var(--color-background-body)]/95 backdrop-blur-md border-b border-[var(--color-border)] px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3"
      >
        {showSearchBar ? (
          <div className="flex-1 h-11 rounded-[12px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)]/70 focus-within:bg-[var(--color-background-muted)] focus-within:ring-1 focus-within:ring-[var(--color-border-emphasized)] pl-3.5 pr-2 flex items-center gap-2 transition-colors min-w-0">
            <Search className="w-[19px] h-[19px] text-[var(--color-text-secondary)] shrink-0" />

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onChangeSearchQuery(e.target.value)}
              placeholder={
                language === "th"
                  ? "ค้นหาที่พัก สไตล์ หรือทำเล..."
                  : "Search stays, styles, or locations..."
              }
              aria-label={language === "th" ? "ค้นหา" : "Search"}
              className="flex-1 min-w-[60px] bg-transparent ty-body text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none"
            />

            {searchQuery && (
              <button
                type="button"
                onClick={() => onChangeSearchQuery("")}
                aria-label="Clear search"
                className="h-7 w-7 rounded-[10px] bg-[var(--color-text-secondary)]/20 hover:bg-[var(--color-text-secondary)]/35 flex items-center justify-center cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            <ProvinceSearchDropdown
              language={language}
              selectedProvinceId={selectedProvinceId}
              onSelectProvince={onSelectProvince}
            />

            <AgodaDateRangeFilter
              language={language}
              todayDate={todayDate}
              checkInDate={checkInDate}
              checkOutDate={checkOutDate}
              onChangeCheckInDate={onChangeCheckInDate}
              onChangeCheckOutDate={onChangeCheckOutDate}
              guestCount={guestCount}
              onChangeGuestCount={onChangeGuestCount}
              isDateFilterActive={isDateFilterActive}
              onChangeDateFilterActive={onChangeDateFilterActive}
            />
          </div>
        ) : (
          <div className="flex items-center gap-2 min-w-0">
            <Link
              href="/"
              className="lg:hidden h-10 px-3 rounded-[12px] bg-[var(--color-background-muted)] inline-flex items-center gap-2 ty-body font-bold"
            >
              <span>Cangaroom</span>
            </Link>
          </div>
        )}

        <div className="flex items-center gap-1.5 shrink-0">
          <Link
            href="/board"
            aria-label={
              language === "th" ? "บอร์ดที่พักที่บันทึกไว้" : "Saved Boards"
            }
            title={
              language === "th" ? "บอร์ดที่พักที่บันทึกไว้" : "Saved Boards"
            }
            className={`h-11 w-11 rounded-[14px] hover:bg-[var(--color-background-muted)] inline-flex items-center justify-center text-[var(--color-text-primary)] relative transition ${
              activeTab === "board" ? "bg-[var(--color-background-muted)]" : ""
            }`}
          >
            <Bookmark
              className="w-[22px] h-[22px]"
              fill={activeTab === "board" ? "currentColor" : "none"}
            />
            {savedPinsCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-[6px] bg-[var(--color-promo)] text-[var(--color-on-promo)] text-[11px] font-bold inline-flex items-center justify-center leading-none">
                {savedPinsCount > 99 ? "99+" : savedPinsCount}
              </span>
            )}
          </Link>

          <button
            type="button"
            onClick={onOpenCouponWallet}
            aria-label={
              language === "th" ? "กระเป๋าคูปองส่วนลด" : "Saved Coupons"
            }
            title={language === "th" ? "กระเป๋าคูปองส่วนลด" : "Saved Coupons"}
            className="h-11 w-11 rounded-[14px] hover:bg-[var(--color-background-muted)] inline-flex items-center justify-center text-[var(--color-text-primary)] relative transition cursor-pointer"
          >
            <ShoppingBag className="w-[22px] h-[22px]" />
            {savedCouponsCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-[6px] bg-[var(--color-promo)] text-[var(--color-on-promo)] text-[11px] font-bold inline-flex items-center justify-center leading-none">
                {savedCouponsCount}
              </span>
            )}
          </button>

          <div className="lg:hidden shrink-0">
            <button
              type="button"
              aria-label={language === "th" ? "โปรไฟล์และเมนู" : "Profile menu"}
              onClick={() => {
                onRefreshProfile();
                setIsMobileProfileDrawerOpen((prev) => !prev);
              }}
              className="h-11 w-11 rounded-[14px] hover:bg-[var(--color-background-muted)] inline-flex items-center justify-center relative cursor-pointer"
            >
              <UserAvatarCircle
                user={user}
                sizeClass="h-8 w-8"
                iconSizeClass="w-[22px] h-[22px]"
              />
            </button>
          </div>

          <div className="hidden lg:block shrink-0">
            <UserProfileDropdown
              user={user}
              onRefreshProfile={onRefreshProfile}
              onSignOut={onSignOut}
              language={language}
              onToggleLanguage={() =>
                onChangeLanguage(language === "th" ? "en" : "th")
              }
              isDarkTheme={isDarkTheme}
              onToggleTheme={onToggleTheme}
              activeTab={activeTab}
              onOpenCouponWallet={onOpenCouponWallet}
            />
          </div>
        </div>
      </header>

      {/* 3. MOBILE PROFILE RIGHT SIDEBAR DRAWER (< lg) */}
      {isMobileProfileDrawerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Mobile menu"
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
                  <h2 className="ty-subtitle truncate">Cangaroom</h2>
                  <p className="ty-caption truncate">
                    {language === "th"
                      ? "รวมที่พักสวยทั่วไทย จองตรง 0% GP"
                      : "Thailand Visual Stays & 0% GP"}
                  </p>
                </div>
              )}
              <button
                type="button"
                onClick={() => setIsMobileProfileDrawerOpen(false)}
                aria-label="Close menu"
                className="h-10 w-10 rounded-[12px] bg-[var(--color-background-muted)] flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto py-3 space-y-1">
              {!user && (
                <Link
                  href="/login"
                  onClick={() => setIsMobileProfileDrawerOpen(false)}
                  className="w-full h-11 px-3.5 rounded-[10px] bg-[#111111] dark:bg-[#f5f5f5] !text-white dark:!text-[#111111] flex items-center justify-center gap-2 ty-body font-semibold mb-2"
                >
                  <LogIn className="w-5 h-5" />
                  <span>
                    {language === "th"
                      ? "เข้าสู่ระบบด้วย Google"
                      : "Sign in with Google"}
                  </span>
                </Link>
              )}

              <Link
                href="/board"
                onClick={() => setIsMobileProfileDrawerOpen(false)}
                className="w-full h-11 px-3 rounded-[10px] hover:bg-[var(--color-background-muted)] flex items-center justify-between ty-body font-medium"
              >
                <span className="flex items-center gap-3">
                  <Bookmark className="w-5 h-5 text-[var(--color-text-secondary)]" />
                  <span>
                    {language === "th"
                      ? "บอร์ดที่พักที่บันทึกไว้"
                      : "My Saved Boards"}
                  </span>
                </span>
                {savedPinsCount > 0 && (
                  <span className="badge-promo">{savedPinsCount}</span>
                )}
              </Link>

              <Link
                href="/deal"
                onClick={() => setIsMobileProfileDrawerOpen(false)}
                className="w-full h-11 px-3 rounded-[10px] hover:bg-[var(--color-background-muted)] flex items-center gap-3 ty-body font-medium"
              >
                <TicketPercent className="w-5 h-5 text-[var(--color-text-secondary)]" />
                <span>
                  {language === "th" ? "ศูนย์รวมคูปองที่พัก" : "Hotel Deals"}
                </span>
              </Link>

              <Link
                href="/trips"
                onClick={() => setIsMobileProfileDrawerOpen(false)}
                className="w-full h-11 px-3 rounded-[10px] hover:bg-[var(--color-background-muted)] flex items-center gap-3 ty-body font-medium"
              >
                <CalendarCheck className="w-5 h-5 text-[var(--color-text-secondary)]" />
                <span>
                  {language === "th"
                    ? "การจอง & กระเป๋าคูปอง"
                    : "My Trips & Wallet"}
                </span>
              </Link>

              <div className="my-2 border-t border-[var(--color-border)]" />

              {hasStudioAccess && (
                <Link
                  href="/studio"
                  onClick={() => setIsMobileProfileDrawerOpen(false)}
                  className="w-full h-11 px-3 rounded-[10px] hover:bg-[var(--color-background-muted)] flex items-center justify-between ty-body font-medium"
                >
                  <span className="flex items-center gap-3">
                    <LayoutDashboard className="w-5 h-5 text-[var(--color-text-secondary)]" />
                    <span>Hotel Studio</span>
                  </span>
                  {pendingStudioBookings > 0 && (
                    <span className="badge-promo">{pendingStudioBookings}</span>
                  )}
                </Link>
              )}

              <Link
                href="/register-hotel"
                onClick={() => setIsMobileProfileDrawerOpen(false)}
                className="w-full h-11 px-3 rounded-[10px] hover:bg-[var(--color-background-muted)] flex items-center gap-3 ty-body font-semibold text-[var(--color-text-primary)]"
              >
                <Building2 className="w-5 h-5 text-[var(--color-text-secondary)]" />
                <span>
                  {language === "th"
                    ? "เปิดเพจที่พักฟรี 0% GP"
                    : "List Property Free (0% GP)"}
                </span>
              </Link>

              {user?.role === "SUPER_ADMIN" && (
                <Link
                  href="/super-admin"
                  onClick={() => setIsMobileProfileDrawerOpen(false)}
                  className="w-full h-11 px-3 rounded-[10px] hover:bg-[var(--color-background-muted)] flex items-center gap-3 ty-body font-medium"
                >
                  <Crown className="w-5 h-5 text-[var(--color-text-secondary)]" />
                  <span>Super Admin</span>
                </Link>
              )}

              <div className="my-2 border-t border-[var(--color-border)]" />

              <button
                type="button"
                onClick={onToggleTheme}
                className="w-full h-11 px-3 rounded-[12px] hover:bg-[var(--color-background-muted)] flex items-center justify-between ty-body font-medium cursor-pointer"
              >
                <span className="flex items-center gap-3">
                  {isDarkTheme ? (
                    <Moon className="w-5 h-5 text-[var(--color-text-secondary)]" />
                  ) : (
                    <Sun className="w-5 h-5 text-[var(--color-text-secondary)]" />
                  )}
                  <span>{language === "th" ? "การแสดงผล" : "Appearance"}</span>
                </span>
                <span className="ty-caption font-semibold">
                  {isDarkTheme ? "Dark" : "Light"}
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  onChangeLanguage(language === "th" ? "en" : "th")
                }
                className="w-full h-11 px-3 rounded-[12px] hover:bg-[var(--color-background-muted)] flex items-center justify-between ty-body font-medium cursor-pointer"
              >
                <span className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-[var(--color-text-secondary)]" />
                  <span>{language === "th" ? "ภาษา" : "Language"}</span>
                </span>
                <span className="ty-caption font-semibold">
                  {language === "th" ? "TH" : "EN"}
                </span>
              </button>

              {user && (
                <button
                  type="button"
                  onClick={async () => {
                    await onSignOut();
                    setIsMobileProfileDrawerOpen(false);
                  }}
                  className="w-full h-11 px-3 rounded-[12px] hover:bg-[var(--color-background-muted)] flex items-center gap-3 ty-body font-medium text-[var(--color-error)] cursor-pointer"
                >
                  <LogOut className="w-5 h-5" />
                  <span>{language === "th" ? "ออกจากระบบ" : "Log Out"}</span>
                </button>
              )}
            </nav>
          </aside>
        </div>
      )}

      {/* 4. MINIMAL INSTAGRAM-STYLE MOBILE BOTTOM BAR (< lg) */}
      <nav
        aria-label="Mobile bottom navigation"
        className="lg:hidden fixed inset-x-0 bottom-0 z-40 bg-[var(--color-background-card)] border-t border-[var(--color-border)] pb-[env(safe-area-inset-bottom)] select-none"
      >
        <div className="max-w-[540px] mx-auto px-2 h-[56px] grid grid-cols-5 items-center">
          {MOBILE_BOTTOM_TABS.map((tab) => {
            const targetHref =
              tab.id === "studio" && !hasStudioAccess
                ? "/register-hotel"
                : tab.href;
            const isTabActive =
              (tab.id === "studio"
                ? activeTab === "studio" || activeTab === "register-hotel"
                : activeTab === tab.id) && !isMobileProfileDrawerOpen;

            return (
              <Link
                key={tab.id}
                href={targetHref}
                aria-label={tab.labelEn}
                className={`h-full flex items-center justify-center transition-colors ${
                  isTabActive
                    ? "text-[var(--color-text-primary)]"
                    : "text-[var(--color-text-secondary)]"
                }`}
              >
                <span className="relative flex items-center justify-center">
                  <PlatformNavIcon
                    id={tab.id}
                    isActive={isTabActive}
                    hasOwnedHotel={hasStudioAccess}
                    cutoutColor="var(--color-background-card)"
                    className="w-[24px] h-[24px]"
                  />
                  {tab.id === "board" && savedPinsCount > 0 && (
                    <span className="absolute -top-1 -right-2 min-w-[15px] h-[15px] px-1 rounded-[5px] bg-[var(--color-promo)] text-[var(--color-on-promo)] text-[9px] font-bold inline-flex items-center justify-center leading-none">
                      {savedPinsCount > 9 ? "9+" : savedPinsCount}
                    </span>
                  )}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
