"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Calendar,
  CalendarCheck,
  Clapperboard,
  Compass,
  Crown,
  Globe,
  Heart,
  Home,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Moon,
  Pencil,
  PlusSquare,
  Search,
  Send,
  ShoppingBag,
  Star,
  Sun,
  TicketPercent,
  X,
} from "lucide-react";
import { WhiteLabelPropertyConfig } from "@/data/rooms";
import { formatShortDate, LanguageCode } from "@/lib/dateFormatters";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";
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
  searchQuery?: string;
  onChangeSearchQuery?: (query: string) => void;
}

export function PrimaryNavigation({
  activeTab,
  onSelectTab,
  propertyConfig,
  language,
  onChangeLanguage,
  theme = "light",
  onToggleTheme,
  availableUnitsCount,
  availableRoomCount,
  pendingAdminCount = 0,
  savedCouponsCount = 0,
  onOpenCouponWallet,
  checkInDate,
  checkOutDate,
  guestCount = 2,
  onOpenCalendarDrawer,
  isChatOpen = false,
  isEditMode = false,
  onToggleEditMode,
  searchQuery = "",
  onChangeSearchQuery,
}: PrimaryNavigationProps) {
  const [isMobileProfileDrawerOpen, setIsMobileProfileDrawerOpen] =
    useState(false);
  const [isMorePopoverOpen, setIsMorePopoverOpen] = useState(false);
  const moreWrapperRef = useRef<HTMLDivElement | null>(null);
  const { user, refreshProfile, signOutUser } = useAuthenticatedProfile();

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

  const propertyShortName =
    language === "th"
      ? propertyConfig?.nameTh?.split("(")[0]?.trim() || "สะปัน อันซีน"
      : propertyConfig?.nameEn || "Sapan Unseen";

  return (
    <>
      {/* =====================================================================
          1. INSTAGRAM-STYLE MINIMAL 72px LEFT SIDEBAR (>= lg)
             - Top: Minimal monochrome brand glyph
             - Center: Vertically centered pure icon stack + circular user avatar
             - Bottom: Minimal Hamburger (≡) More menu
      ====================================================================== */}
      <aside
        aria-label="Primary sidebar navigation"
        className="hidden lg:flex fixed inset-y-0 left-0 z-50 w-[72px] flex-col items-center justify-between bg-[var(--color-background-card)] border-r border-[var(--color-border)] py-5 select-none"
      >
        {/* TOP BRAND GLYPH (Clean Instagram Outline Aesthetic) */}
        <Link
          href="/"
          onClick={(e) => {
            if (normalizedActiveTab === "home") {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: "smooth" });
            } else {
              onSelectTab("home");
            }
          }}
          title={propertyShortName}
          aria-label="Home"
          className="h-12 w-12 rounded-[12px] hover:bg-[var(--color-background-muted)] flex items-center justify-center text-[var(--color-text-primary)] transition-colors cursor-pointer"
        >
          <svg
            viewBox="0 0 24 24"
            className="w-[24px] h-[24px]"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect width="18" height="18" x="3" y="3" rx="5" />
            <path d="M8 15.5 12 8.5l4 7" />
            <circle cx="16.5" cy="7.5" r="1" fill="currentColor" stroke="none" />
          </svg>
        </Link>

        {/* CENTER VERTICALLY BALANCED ICON STACK (Exact Instagram Rhythm) */}
        <nav
          aria-label="Main navigation"
          className="flex flex-col items-center gap-2"
        >
          {/* 1. Home (Pinterest Masonry Feed) */}
          <button
            type="button"
            onClick={() => {
              onSelectTab("home");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            title={language === "th" ? "หน้าแรก" : "Home"}
            aria-label="Home"
            className="h-12 w-12 rounded-[12px] hover:bg-[var(--color-background-muted)] flex items-center justify-center text-[var(--color-text-primary)] transition-colors cursor-pointer"
          >
            <Home
              className="w-[24px] h-[24px]"
              strokeWidth={normalizedActiveTab === "home" ? 2.6 : 1.9}
              fill={normalizedActiveTab === "home" ? "currentColor" : "none"}
            />
          </button>

          {/* 2. Reels / Short Videos */}
          <button
            type="button"
            onClick={() => {
              onSelectTab("shorts");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            title={language === "th" ? "คลิปสั้น Reels" : "Reels"}
            aria-label="Reels"
            className="h-12 w-12 rounded-[12px] hover:bg-[var(--color-background-muted)] flex items-center justify-center text-[var(--color-text-primary)] transition-colors cursor-pointer"
          >
            <Clapperboard
              className="w-[24px] h-[24px]"
              strokeWidth={normalizedActiveTab === "shorts" ? 2.5 : 1.9}
            />
          </button>

          {/* 3. Direct Message / AI Concierge (Instagram Paper Plane) */}
          <button
            type="button"
            onClick={() => onSelectTab("chat")}
            title={language === "th" ? "แชทสอบถามที่พัก" : "Messages"}
            aria-label="Messages"
            className="h-12 w-12 rounded-[12px] hover:bg-[var(--color-background-muted)] flex items-center justify-center text-[var(--color-text-primary)] transition-colors cursor-pointer relative"
          >
            <Send
              className="w-[23px] h-[23px]"
              strokeWidth={isChatOpen ? 2.5 : 1.9}
            />
          </button>

          {/* 4. Check Rooms & Book (/booking) */}
          <button
            type="button"
            onClick={() => {
              onSelectTab("book");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            title={language === "th" ? "เช็กห้องว่าง & จอง" : "Book Rooms"}
            aria-label="Book Rooms"
            className="h-12 w-12 rounded-[12px] hover:bg-[var(--color-background-muted)] flex items-center justify-center text-[var(--color-text-primary)] transition-colors cursor-pointer relative"
          >
            <Calendar
              className="w-[24px] h-[24px]"
              strokeWidth={normalizedActiveTab === "book" ? 2.5 : 1.9}
            />
            {freeRoomCount > 0 && (
              <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-[var(--color-promo)]" />
            )}
          </button>

          {/* 5. Deals & Saved Coupons (Heart Icon like Instagram) */}
          <button
            type="button"
            onClick={() => {
              onSelectTab("deal");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            title={language === "th" ? "คูปอง & โปรโมชั่น" : "Deals & Coupons"}
            aria-label="Deals"
            className="h-12 w-12 rounded-[12px] hover:bg-[var(--color-background-muted)] flex items-center justify-center text-[var(--color-text-primary)] transition-colors cursor-pointer relative"
          >
            <Heart
              className="w-[24px] h-[24px]"
              strokeWidth={normalizedActiveTab === "deal" ? 2.5 : 1.9}
              fill={normalizedActiveTab === "deal" ? "currentColor" : "none"}
            />
            {savedCouponsCount > 0 && (
              <span className="absolute top-2.5 right-2 h-2 w-2 rounded-full bg-[var(--color-promo)]" />
            )}
          </button>

          {/* 6. Create / Live Edit (Instagram + Icon) */}
          {isHotelOrSuperAdmin && onToggleEditMode ? (
            <button
              type="button"
              onClick={onToggleEditMode}
              title={
                isEditMode
                  ? language === "th"
                    ? "ปิดโหมดแก้ไขหน้าเว็บ"
                    : "Exit Edit Mode"
                  : language === "th"
                  ? "แก้ไขหน้าเว็บจริง"
                  : "Edit Live Page"
              }
              aria-label="Create or edit"
              className={`h-12 w-12 rounded-[12px] hover:bg-[var(--color-background-muted)] flex items-center justify-center transition-colors cursor-pointer ${
                isEditMode
                  ? "text-[var(--color-accent)] bg-[var(--color-accent-muted)]"
                  : "text-[var(--color-text-primary)]"
              }`}
            >
              <PlusSquare className="w-[24px] h-[24px]" strokeWidth={1.9} />
            </button>
          ) : (
            <Link
              href="/register-hotel"
              title={
                language === "th"
                  ? "สร้างเว็บที่พักฟรี 30 วัน"
                  : "Create Hotel Site (30-Day Free Trial)"
              }
              aria-label="Create hotel site"
              className="h-12 w-12 rounded-[12px] hover:bg-[var(--color-background-muted)] flex items-center justify-center text-[var(--color-text-primary)] transition-colors"
            >
              <PlusSquare className="w-[24px] h-[24px]" strokeWidth={1.9} />
            </Link>
          )}

          {/* 7. Profile Avatar in Stack (Matches Instagram Image 1) */}
          <button
            type="button"
            onClick={() => {
              onSelectTab("setting");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            title={
              user
                ? `${user.name} · ${
                    language === "th" ? "การจองของฉัน" : "My Bookings"
                  }`
                : language === "th"
                ? "การจองของฉัน"
                : "My Bookings"
            }
            aria-label="Profile and bookings"
            className="h-12 w-12 rounded-[12px] hover:bg-[var(--color-background-muted)] flex items-center justify-center transition-colors cursor-pointer"
          >
            <span
              className={`rounded-full p-[1.5px] ${
                normalizedActiveTab === "setting"
                  ? "ring-2 ring-[var(--color-text-primary)]"
                  : ""
              }`}
            >
              <UserAvatarCircle
                user={user}
                sizeClass="h-6 w-6"
                iconSizeClass="w-[22px] h-[22px]"
              />
            </span>
          </button>
        </nav>

        {/* BOTTOM HAMBURGER (≡) MORE POPOVER (Exact Instagram Bottom-Left Menu) */}
        <div ref={moreWrapperRef} className="relative">
          <button
            type="button"
            onClick={() => setIsMorePopoverOpen((v) => !v)}
            title={language === "th" ? "เมนูเพิ่มเติม" : "More"}
            aria-label="More menu"
            className={`h-12 w-12 rounded-[12px] hover:bg-[var(--color-background-muted)] flex items-center justify-center text-[var(--color-text-primary)] transition-colors cursor-pointer ${
              isMorePopoverOpen ? "bg-[var(--color-background-muted)]" : ""
            }`}
          >
            <Menu
              className="w-[24px] h-[24px]"
              strokeWidth={isMorePopoverOpen ? 2.5 : 1.9}
            />
          </button>

          {isMorePopoverOpen && (
            <div className="absolute left-0 bottom-[calc(100%+8px)] w-[256px] rounded-[16px] bg-[var(--color-background-popover)] p-2 shadow-[var(--shadow-popover)] border border-[var(--color-border)] space-y-0.5 z-50">
              <button
                type="button"
                onClick={() => {
                  setIsMorePopoverOpen(false);
                  onSelectTab("guide");
                }}
                className="w-full h-11 px-3 rounded-[10px] hover:bg-[var(--color-background-muted)] flex items-center gap-3 ty-body cursor-pointer"
              >
                <Compass className="w-[18px] h-[18px]" />
                <span>
                  {language === "th" ? "แผนที่ & ที่เที่ยวใกล้เคียง" : "Map & Local Guide"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsMorePopoverOpen(false);
                  onSelectTab("review");
                }}
                className="w-full h-11 px-3 rounded-[10px] hover:bg-[var(--color-background-muted)] flex items-center gap-3 ty-body cursor-pointer"
              >
                <Star className="w-[18px] h-[18px]" />
                <span>
                  {language === "th" ? "รีวิวผู้เข้าพักจริง" : "Guest Reviews"}
                </span>
              </button>

              {onToggleTheme && (
                <button
                  type="button"
                  onClick={onToggleTheme}
                  className="w-full h-11 px-3 rounded-[10px] hover:bg-[var(--color-background-muted)] flex items-center justify-between ty-body cursor-pointer"
                >
                  <span className="flex items-center gap-3">
                    {isDarkTheme ? (
                      <Moon className="w-[18px] h-[18px]" />
                    ) : (
                      <Sun className="w-[18px] h-[18px]" />
                    )}
                    <span>
                      {language === "th" ? "สลับโหมดสี" : "Switch appearance"}
                    </span>
                  </span>
                  <span className="ty-caption font-semibold">
                    {isDarkTheme ? "Dark" : "Light"}
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={handleToggleLanguage}
                className="w-full h-11 px-3 rounded-[10px] hover:bg-[var(--color-background-muted)] flex items-center justify-between ty-body cursor-pointer"
              >
                <span className="flex items-center gap-3">
                  <Globe className="w-[18px] h-[18px]" />
                  <span>{language === "th" ? "ภาษา" : "Language"}</span>
                </span>
                <span className="ty-caption font-semibold">
                  {language === "th" ? "TH" : "EN"}
                </span>
              </button>

              {isHotelOrSuperAdmin && (
                <>
                  <div className="my-1 border-t border-[var(--color-border)]" />
                  <Link
                    href={adminHref}
                    onClick={() => setIsMorePopoverOpen(false)}
                    className="w-full h-11 px-3 rounded-[10px] hover:bg-[var(--color-background-muted)] flex items-center justify-between ty-body"
                  >
                    <span className="flex items-center gap-3">
                      <LayoutDashboard className="w-[18px] h-[18px]" />
                      <span>Hotel Admin</span>
                    </span>
                    {pendingAdminCount > 0 && (
                      <span className="badge-promo">{pendingAdminCount}</span>
                    )}
                  </Link>
                  {user?.role === "SUPER_ADMIN" && (
                    <Link
                      href="/super-admin"
                      onClick={() => setIsMorePopoverOpen(false)}
                      className="w-full h-11 px-3 rounded-[10px] hover:bg-[var(--color-background-muted)] flex items-center gap-3 ty-body"
                    >
                      <Crown className="w-[18px] h-[18px] text-[var(--color-accent)]" />
                      <span>Super Admin</span>
                    </Link>
                  )}
                </>
              )}

              <div className="my-1 border-t border-[var(--color-border)]" />
              {user ? (
                <button
                  type="button"
                  onClick={async () => {
                    await signOutUser();
                    setIsMorePopoverOpen(false);
                  }}
                  className="w-full h-11 px-3 rounded-[10px] hover:bg-[var(--color-background-muted)] flex items-center gap-3 ty-body text-[var(--color-error)] cursor-pointer"
                >
                  <LogOut className="w-[18px] h-[18px]" />
                  <span>{language === "th" ? "ออกจากระบบ" : "Log out"}</span>
                </button>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setIsMorePopoverOpen(false)}
                  className="w-full h-11 px-3 rounded-[10px] hover:bg-[var(--color-background-muted)] flex items-center gap-3 ty-body font-semibold"
                >
                  <LogIn className="w-[18px] h-[18px]" />
                  <span>{language === "th" ? "เข้าสู่ระบบ" : "Log in"}</span>
                </Link>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* =====================================================================
          2. PINTEREST-STYLE TOP SEARCH BAR (h-16, pure white #FFFFFF)
      ====================================================================== */}
      <header
        aria-label="Top search bar"
        className="fixed top-0 inset-x-0 lg:left-[72px] z-40 h-16 bg-[var(--color-background-body)] px-3 sm:px-5 flex items-center gap-2.5 sm:gap-3 pr-[var(--scrollbar-compensation,0.75rem)]"
      >
        {/* Full-Width Soft Gray #F1F1F1 Pinterest Search Pill */}
        <div className="flex-1 h-12 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)]/65 focus-within:bg-[var(--color-background-muted)] focus-within:ring-2 focus-within:ring-[var(--color-accent)]/30 px-4 flex items-center gap-3 transition-colors min-w-0">
          <Search className="w-[18px] h-[18px] text-[var(--color-text-secondary)] shrink-0" />

          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onChangeSearchQuery?.(e.target.value)}
            placeholder={
              language === "th"
                ? `ค้นหาใน ${propertyShortName} (เช่น วิวหมอก, อ่างแช่น้ำ, บ้านพัก A1, รีวิว)...`
                : `Search ${propertyShortName} (villas, mist view, bathtub, reviews)...`
            }
            aria-label={language === "th" ? "ค้นหา" : "Search"}
            className="flex-1 min-w-0 bg-transparent ty-body text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none"
          />

          {searchQuery && (
            <button
              type="button"
              onClick={() => onChangeSearchQuery?.("")}
              aria-label="Clear search"
              className="h-6 w-6 rounded-full bg-[var(--color-text-secondary)]/25 hover:bg-[var(--color-text-secondary)]/40 flex items-center justify-center cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Right-Inside-Search-Pill Quick Date Picker Trigger */}
          {checkInDate && checkOutDate && (
            <button
              type="button"
              onClick={onOpenCalendarDrawer}
              title={
                language === "th"
                  ? "เลือกวันเช็กอิน - เช็กเอาท์"
                  : "Select stay dates"
              }
              className="hidden sm:inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-[var(--color-background-card)] text-[var(--color-text-primary)] ty-caption font-semibold shadow-2xs hover:opacity-90 transition cursor-pointer shrink-0"
            >
              <Calendar className="w-3.5 h-3.5 text-[var(--color-promo)]" />
              <span>
                {formatShortDate(checkInDate, language)} · {guestCount}{" "}
                {language === "th" ? "ท่าน" : "guests"}
              </span>
            </button>
          )}
        </div>

        {/* Right Action Icons: Saved Coupons + Single User Avatar */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onOpenCouponWallet}
            aria-label={
              language === "th" ? "กระเป๋าคูปองส่วนลด" : "Saved Coupons"
            }
            title={language === "th" ? "กระเป๋าคูปองส่วนลด" : "Saved Coupons"}
            className="h-10 w-10 rounded-full hover:bg-[var(--color-background-muted)] inline-flex items-center justify-center text-[var(--color-text-primary)] relative transition cursor-pointer"
          >
            <ShoppingBag className="w-5 h-5" />
            {savedCouponsCount > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-[17px] h-[17px] px-1 rounded-full bg-[var(--color-promo)] text-[var(--color-on-promo)] text-[11px] font-bold inline-flex items-center justify-center leading-none">
                {savedCouponsCount}
              </span>
            )}
          </button>

          {/* Mobile/Tablet (< lg): Single Profile Avatar */}
          <div className="lg:hidden shrink-0">
            <button
              type="button"
              aria-label={language === "th" ? "โปรไฟล์และเมนู" : "Profile menu"}
              onClick={() => {
                refreshProfile();
                setIsMobileProfileDrawerOpen((prevOpen) => !prevOpen);
              }}
              className="h-10 w-10 rounded-full hover:bg-[var(--color-background-muted)] inline-flex items-center justify-center relative cursor-pointer"
            >
              <UserAvatarCircle
                user={user}
                sizeClass="h-8 w-8"
                iconSizeClass="w-5 h-5"
              />
            </button>
          </div>

          {/* Desktop (>= lg): Single Profile Avatar + Dropdown */}
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
      </header>

      {/* =====================================================================
          3. MOBILE PROFILE RIGHT SIDEBAR DRAWER (< lg)
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
                  className="w-full h-10 px-3.5 rounded-full bg-[var(--color-promo)] text-[var(--color-on-promo)] flex items-center justify-center gap-2 ty-body font-semibold transition mb-2"
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
                }}
                className="w-full h-11 px-3 rounded-[12px] hover:bg-[var(--color-background-muted)] flex items-center gap-3 ty-body font-medium cursor-pointer"
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
                className="w-full h-11 px-3 rounded-[12px] hover:bg-[var(--color-background-muted)] flex items-center justify-between ty-body font-medium cursor-pointer"
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
                }}
                className="w-full h-11 px-3 rounded-[12px] hover:bg-[var(--color-background-muted)] flex items-center gap-3 ty-body font-medium cursor-pointer"
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
                }}
                className="w-full h-11 px-3 rounded-[12px] hover:bg-[var(--color-background-muted)] flex items-center gap-3 ty-body font-medium cursor-pointer"
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
                      className="w-full h-11 px-3 rounded-[12px] hover:bg-[var(--color-background-muted)] flex items-center justify-between ty-body font-medium cursor-pointer"
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
                    className="w-full h-11 px-3 rounded-[12px] hover:bg-[var(--color-background-muted)] flex items-center justify-between ty-body font-medium"
                  >
                    <span className="flex items-center gap-3">
                      <LayoutDashboard className="w-5 h-5 text-[var(--color-text-secondary)]" />
                      <span>Hotel Admin</span>
                    </span>
                    {pendingAdminCount > 0 && (
                      <span className="badge-promo">{pendingAdminCount}</span>
                    )}
                  </Link>

                  {user?.role === "SUPER_ADMIN" && (
                    <Link
                      href="/super-admin"
                      onClick={() => setIsMobileProfileDrawerOpen(false)}
                      className="w-full h-11 px-3 rounded-[12px] hover:bg-[var(--color-background-muted)] flex items-center gap-3 ty-body font-medium"
                    >
                      <Crown className="w-5 h-5 text-[var(--color-accent)]" />
                      <span>Super Admin</span>
                    </Link>
                  )}
                </>
              ) : (
                <Link
                  href="/register-hotel"
                  onClick={() => setIsMobileProfileDrawerOpen(false)}
                  className="w-full h-11 px-3 rounded-[12px] hover:bg-[var(--color-background-muted)] flex items-center gap-3 ty-body font-semibold text-[var(--color-accent)]"
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
                  className="w-full h-11 px-3 rounded-[12px] hover:bg-[var(--color-background-muted)] flex items-center justify-between ty-body font-medium cursor-pointer"
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
                    {isDarkTheme ? "Dark" : "Light"}
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={handleToggleLanguage}
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
                    await signOutUser();
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

      {/* =====================================================================
          4. MINIMAL INSTAGRAM-STYLE MOBILE BOTTOM ICON BAR (< lg)
      ====================================================================== */}
      <nav
        aria-label="Mobile bottom navigation"
        className={`${
          normalizedActiveTab === "chat" ? "hidden" : "lg:hidden"
        } fixed inset-x-0 bottom-0 z-40 bg-[var(--color-background-card)] border-t border-[var(--color-border)] pb-[env(safe-area-inset-bottom)] select-none`}
      >
        <div className="max-w-[540px] mx-auto px-2 h-[52px] grid grid-cols-5 items-center">
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
                className={`h-full flex items-center justify-center transition-colors cursor-pointer ${
                  isTabActive
                    ? "text-[var(--color-text-primary)]"
                    : "text-[var(--color-text-secondary)]"
                }`}
              >
                <span className="relative flex items-center justify-center">
                  {tab.id === "chat" ? (
                    <Send
                      className="w-[22px] h-[22px]"
                      strokeWidth={isTabActive ? 2.5 : 1.9}
                    />
                  ) : (
                    <HotelNavTabIcon
                      id={tab.id}
                      isActive={isTabActive}
                      cutoutColor="var(--color-background-card)"
                      className="w-[22px] h-[22px]"
                    />
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
