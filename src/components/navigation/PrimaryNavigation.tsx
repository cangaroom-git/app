"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  BedDouble,
  Building2,
  Calendar,
  CalendarCheck,
  Compass,
  Crown,
  Globe,
  Home,
  LayoutDashboard,
  LogIn,
  LogOut,
  MessageCircle,
  Moon,
  Pencil,
  PlaySquare,
  ShoppingBag,
  Star,
  Sun,
  Tag,
  TicketPercent,
  X,
} from "lucide-react";
import { WhiteLabelPropertyConfig } from "@/data/rooms";
import { formatShortDate, LanguageCode } from "@/lib/dateFormatters";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";
import { HotelNavTabId } from "@/components/navigation/NavigationIcons";
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

  const sidebarMenuItems: Array<{
    id: HotelNavTabId;
    labelTh: string;
    labelEn: string;
    icon: React.ReactNode;
    badge?: number;
  }> = [
    {
      id: "home",
      labelTh: "ภาพรวมที่พัก",
      labelEn: "Overview",
      icon: <Home className="w-4 h-4 stroke-[1.75]" />,
    },
    {
      id: "book",
      labelTh: "ห้องพัก & จอง",
      labelEn: "Rooms & Booking",
      icon: <BedDouble className="w-4 h-4 stroke-[1.75]" />,
      badge: freeRoomCount > 0 ? freeRoomCount : undefined,
    },
    {
      id: "shorts",
      labelTh: "วิดีโอสั้น",
      labelEn: "Videos",
      icon: <PlaySquare className="w-4 h-4 stroke-[1.75]" />,
    },
    {
      id: "deal",
      labelTh: "คูปอง & ดีล",
      labelEn: "Deals & Coupons",
      icon: <Tag className="w-4 h-4 stroke-[1.75]" />,
    },
    {
      id: "review",
      labelTh: "รีวิวผู้เข้าพัก",
      labelEn: "Reviews",
      icon: <Star className="w-4 h-4 stroke-[1.75]" />,
    },
    {
      id: "guide",
      labelTh: "แผนที่ & ที่เที่ยว",
      labelEn: "Map & Guide",
      icon: <Compass className="w-4 h-4 stroke-[1.75]" />,
    },
    {
      id: "setting",
      labelTh: "การจองของฉัน",
      labelEn: "My Bookings",
      icon: <CalendarCheck className="w-4 h-4 stroke-[1.75]" />,
    },
  ];

  const mobileBottomItems: Array<{
    id: HotelNavTabId;
    labelTh: string;
    labelEn: string;
    icon: React.ReactNode;
  }> = [
    {
      id: "home",
      labelTh: "หน้าแรก",
      labelEn: "Home",
      icon: <Home className="w-[19px] h-[19px] stroke-[1.8]" />,
    },
    {
      id: "book",
      labelTh: "จองห้อง",
      labelEn: "Rooms",
      icon: <BedDouble className="w-[19px] h-[19px] stroke-[1.8]" />,
    },
    {
      id: "shorts",
      labelTh: "วิดีโอ",
      labelEn: "Videos",
      icon: <PlaySquare className="w-[19px] h-[19px] stroke-[1.8]" />,
    },
    {
      id: "deal",
      labelTh: "คูปอง",
      labelEn: "Deals",
      icon: <Tag className="w-[19px] h-[19px] stroke-[1.8]" />,
    },
    {
      id: "chat",
      labelTh: "แชทถาม",
      labelEn: "Chat",
      icon: <MessageCircle className="w-[19px] h-[19px] stroke-[1.8]" />,
    },
  ];

  const checkInLabel = checkInDate
    ? formatShortDate(checkInDate, language)
    : null;
  const checkOutLabel = checkOutDate
    ? formatShortDate(checkOutDate, language)
    : null;

  return (
    <>
      {/* =====================================================================
          1. MINIMAL TOP HEADER BAR (h-14 = 56px, Pure White + 1px Hairline)
      ====================================================================== */}
      <header
        aria-label="Top navigation bar"
        className="fixed top-0 inset-x-0 z-40 h-14 bg-[var(--color-background-card)] border-b border-[var(--color-border)] pr-[var(--scrollbar-compensation,0px)]"
      >
        <div className="w-full h-full px-4 lg:px-5 flex items-center justify-between gap-3">
          {/* LEFT: Clean Minimal Brand */}
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
            className="inline-flex items-center gap-2.5 min-w-0 shrink-0 cursor-pointer"
          >
            <span className="h-7 w-7 rounded-[6px] bg-[var(--color-accent)] text-[var(--color-on-accent)] inline-flex items-center justify-center text-[12px] font-bold shrink-0">
              {brandBadgeCode}
            </span>
            <span className="text-[15px] font-semibold text-[var(--color-text-primary)] truncate max-w-[180px] sm:max-w-[240px]">
              {propertyShortName}
            </span>
          </Link>

          {/* RIGHT: Clean Minimal Controls (Date Trigger + Ghost Icons + SINGLE Profile Trigger) */}
          <div className="flex items-center justify-end gap-1.5 sm:gap-2 shrink-0">
            {/* Minimal Outline Date Selector */}
            {checkInLabel && checkOutLabel && (
              <button
                type="button"
                onClick={onOpenCalendarDrawer}
                className="h-9 px-3 rounded-[6px] border border-[var(--color-border-emphasized)] hover:border-[var(--color-text-primary)] bg-[var(--color-background-card)] inline-flex items-center gap-2 text-[13px] font-medium text-[var(--color-text-primary)] transition cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" />
                <span>
                  {checkInLabel} – {checkOutLabel}
                </span>
                <span className="hidden sm:inline text-[var(--color-text-secondary)]">
                  · {stayNights} {language === "th" ? "คืน" : "N"} · {guestCount}{" "}
                  {language === "th" ? "ท่าน" : "G"}
                </span>
              </button>
            )}

            {/* Desktop Chat Ghost Button */}
            <div className="hidden sm:block">
              <button
                type="button"
                onClick={() => onSelectTab("chat")}
                aria-label={language === "th" ? "แชทสอบถาม" : "Chat"}
                title={language === "th" ? "แชทสอบถาม" : "Chat"}
                className={`btn-icon ${
                  isChatOpen ? "bg-[var(--color-background-subtle)]" : ""
                }`}
              >
                <MessageCircle className="w-[18px] h-[18px] stroke-[1.75]" />
              </button>
            </div>

            {/* Coupon Bag Ghost Button */}
            <button
              type="button"
              onClick={onOpenCouponWallet}
              aria-label={language === "th" ? "คูปองส่วนลด" : "Coupons"}
              title={language === "th" ? "คูปองส่วนลด" : "Coupons"}
              className="btn-icon relative"
            >
              <ShoppingBag className="w-[18px] h-[18px] stroke-[1.75]" />
              {savedCouponsCount > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-[var(--color-promo)] text-[var(--color-on-promo)] text-[10px] font-bold inline-flex items-center justify-center leading-none">
                  {savedCouponsCount}
                </span>
              )}
            </button>

            {/* Mobile & Tablet ONLY (< lg): Single Profile Trigger */}
            <div className="lg:hidden shrink-0">
              <button
                type="button"
                aria-label={language === "th" ? "บัญชีและเมนู" : "Account menu"}
                onClick={() => {
                  refreshProfile();
                  setIsMobileProfileDrawerOpen((prevOpen) => !prevOpen);
                }}
                className="h-9 w-9 rounded-full inline-flex items-center justify-center hover:bg-[var(--color-background-subtle)] transition cursor-pointer relative"
              >
                <UserAvatarCircle
                  user={user}
                  sizeClass="h-8 w-8"
                  iconSizeClass="w-[18px] h-[18px]"
                />
                {isHotelOrSuperAdmin && pendingAdminCount > 0 && (
                  <span className="absolute top-0 right-0 h-2.5 w-2.5 rounded-full bg-[var(--color-promo)] ring-2 ring-[var(--color-background-card)]" />
                )}
              </button>
            </div>

            {/* Desktop ONLY (>= lg): Single Profile Dropdown */}
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
          2. MINIMAL GODADDY-STYLE LEFT SIDEBAR (>= lg, w-[220px])
             - #F9FAFB subtle surface + 1px right hairline border
             - Clean monochrome line icons, zero circle blobs
      ====================================================================== */}
      <aside
        aria-label="Primary sidebar navigation"
        className="hidden lg:flex fixed top-14 bottom-0 left-0 z-30 w-[220px] flex-col justify-between bg-[var(--color-sidebar-bg)] border-r border-[var(--color-border)] py-4 px-3 overflow-y-auto select-none"
      >
        <nav aria-label="Main menu" className="space-y-0.5">
          <p className="px-2.5 pb-2 text-[12px] font-medium text-[var(--color-text-secondary)]">
            {language === "th" ? "เมนูหลัก" : "Navigation"}
          </p>

          {sidebarMenuItems.map((item) => {
            const isTabActive = normalizedActiveTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectTab(item.id);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={`w-full h-9 rounded-[6px] flex items-center justify-between px-2.5 text-[14px] transition-colors cursor-pointer ${
                  isTabActive
                    ? "bg-[var(--color-background-subtle)] font-semibold text-[var(--color-text-primary)]"
                    : "text-[var(--color-text-secondary)] hover:bg-[var(--color-overlay-hover)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={
                      isTabActive
                        ? "text-[var(--color-text-primary)]"
                        : "text-[var(--color-text-secondary)]"
                    }
                  >
                    {item.icon}
                  </span>
                  <span className="truncate">
                    {language === "th" ? item.labelTh : item.labelEn}
                  </span>
                </span>

                {item.badge !== undefined && (
                  <span className="text-[12px] font-medium text-[var(--color-text-secondary)]">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="pt-3 border-t border-[var(--color-border)] space-y-1">
          {isHotelOrSuperAdmin ? (
            <Link
              href={adminHref}
              className="w-full h-9 px-2.5 rounded-[6px] hover:bg-[var(--color-overlay-hover)] flex items-center justify-between text-[14px] font-medium text-[var(--color-text-primary)] transition"
            >
              <span className="flex items-center gap-2.5">
                <LayoutDashboard className="w-4 h-4 text-[var(--color-text-secondary)]" />
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
              className="w-full h-9 px-2.5 rounded-[6px] hover:bg-[var(--color-overlay-hover)] flex items-center gap-2.5 text-[13px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition"
            >
              <Building2 className="w-4 h-4 shrink-0" />
              <span className="truncate">
                {language === "th"
                  ? "เปิดเว็บที่พักฟรี 30 วัน"
                  : "30-Day Free Trial"}
              </span>
            </Link>
          )}
        </div>
      </aside>

      {/* =====================================================================
          3. MOBILE RIGHT DRAWER
      ====================================================================== */}
      {isMobileProfileDrawerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={language === "th" ? "เมนู" : "Menu"}
          className="fixed inset-0 z-[75] overflow-hidden"
        >
          <div
            className="app-right-drawer-backdrop animate-fade-in-backdrop"
            onClick={() => setIsMobileProfileDrawerOpen(false)}
          />

          <aside className="app-right-drawer z-10 px-4 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] justify-between animate-slide-in-right-drawer">
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-[var(--color-border)]">
              {user ? (
                <div className="flex items-center gap-2.5 min-w-0">
                  <UserAvatarCircle user={user} sizeClass="h-9 w-9" />
                  <div className="min-w-0">
                    <h2 className="text-[15px] font-semibold truncate">
                      {user.name}
                    </h2>
                    <p className="text-[12px] text-[var(--color-text-secondary)] truncate">
                      {user.email}
                    </p>
                  </div>
                </div>
              ) : (
                <h2 className="text-[16px] font-semibold truncate">
                  {propertyShortName}
                </h2>
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

            <nav className="flex-1 overflow-y-auto py-3 space-y-0.5">
              {!user && (
                <Link
                  href="/login"
                  onClick={() => setIsMobileProfileDrawerOpen(false)}
                  className="w-full h-9 px-3 rounded-[6px] bg-[var(--color-accent)] text-[var(--color-on-accent)] flex items-center justify-center gap-2 text-[14px] font-medium transition mb-2"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{language === "th" ? "เข้าสู่ระบบ" : "Sign In"}</span>
                </Link>
              )}

              <button
                type="button"
                onClick={() => {
                  onSelectTab("setting");
                  setIsMobileProfileDrawerOpen(false);
                }}
                className="w-full h-10 px-2.5 rounded-[6px] hover:bg-[var(--color-background-muted)] flex items-center gap-2.5 text-[14px] cursor-pointer"
              >
                <CalendarCheck className="w-4 h-4 text-[var(--color-text-secondary)]" />
                <span>{language === "th" ? "การจองของฉัน" : "My Bookings"}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsMobileProfileDrawerOpen(false);
                  onOpenCouponWallet();
                }}
                className="w-full h-10 px-2.5 rounded-[6px] hover:bg-[var(--color-background-muted)] flex items-center justify-between text-[14px] cursor-pointer"
              >
                <span className="flex items-center gap-2.5">
                  <TicketPercent className="w-4 h-4 text-[var(--color-text-secondary)]" />
                  <span>{language === "th" ? "คูปองส่วนลด" : "Coupons"}</span>
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
                className="w-full h-10 px-2.5 rounded-[6px] hover:bg-[var(--color-background-muted)] flex items-center gap-2.5 text-[14px] cursor-pointer"
              >
                <Star className="w-4 h-4 text-[var(--color-text-secondary)]" />
                <span>{language === "th" ? "รีวิวผู้เข้าพัก" : "Reviews"}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onSelectTab("guide");
                  setIsMobileProfileDrawerOpen(false);
                }}
                className="w-full h-10 px-2.5 rounded-[6px] hover:bg-[var(--color-background-muted)] flex items-center gap-2.5 text-[14px] cursor-pointer"
              >
                <Compass className="w-4 h-4 text-[var(--color-text-secondary)]" />
                <span>{language === "th" ? "แผนที่ & ที่เที่ยว" : "Map & Guide"}</span>
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
                      className="w-full h-10 px-2.5 rounded-[6px] hover:bg-[var(--color-background-muted)] flex items-center justify-between text-[14px] cursor-pointer"
                    >
                      <span className="flex items-center gap-2.5">
                        <Pencil className="w-4 h-4 text-[var(--color-text-secondary)]" />
                        <span>แก้ไขหน้าเว็บ</span>
                      </span>
                      <span className="text-[12px] text-[var(--color-text-secondary)]">
                        {isEditMode ? "ON" : "OFF"}
                      </span>
                    </button>
                  )}
                  <Link
                    href={adminHref}
                    onClick={() => setIsMobileProfileDrawerOpen(false)}
                    className="w-full h-10 px-2.5 rounded-[6px] hover:bg-[var(--color-background-muted)] flex items-center gap-2.5 text-[14px]"
                  >
                    <LayoutDashboard className="w-4 h-4 text-[var(--color-text-secondary)]" />
                    <span>จัดการที่พัก (Admin)</span>
                  </Link>
                  {user?.role === "SUPER_ADMIN" && (
                    <Link
                      href="/super-admin"
                      onClick={() => setIsMobileProfileDrawerOpen(false)}
                      className="w-full h-10 px-2.5 rounded-[6px] hover:bg-[var(--color-background-muted)] flex items-center gap-2.5 text-[14px]"
                    >
                      <Crown className="w-4 h-4 text-[var(--color-text-secondary)]" />
                      <span>Super Admin</span>
                    </Link>
                  )}
                </>
              ) : (
                <Link
                  href="/register-hotel"
                  onClick={() => setIsMobileProfileDrawerOpen(false)}
                  className="w-full h-10 px-2.5 rounded-[6px] hover:bg-[var(--color-background-muted)] flex items-center gap-2.5 text-[14px] font-medium"
                >
                  <Building2 className="w-4 h-4 text-[var(--color-text-secondary)]" />
                  <span>ทดลองเปิดเว็บที่พัก 30 วัน</span>
                </Link>
              )}

              <div className="my-2 border-t border-[var(--color-border)]" />

              {onToggleTheme && (
                <button
                  type="button"
                  onClick={onToggleTheme}
                  className="w-full h-10 px-2.5 rounded-[6px] hover:bg-[var(--color-background-muted)] flex items-center justify-between text-[14px] cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    {isDarkTheme ? (
                      <Moon className="w-4 h-4 text-[var(--color-text-secondary)]" />
                    ) : (
                      <Sun className="w-4 h-4 text-[var(--color-text-secondary)]" />
                    )}
                    <span>โหมดสี</span>
                  </span>
                  <span className="text-[12px] text-[var(--color-text-secondary)]">
                    {isDarkTheme ? "Dark" : "Light"}
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={handleToggleLanguage}
                className="w-full h-10 px-2.5 rounded-[6px] hover:bg-[var(--color-background-muted)] flex items-center justify-between text-[14px] cursor-pointer"
              >
                <span className="flex items-center gap-2.5">
                  <Globe className="w-4 h-4 text-[var(--color-text-secondary)]" />
                  <span>ภาษา</span>
                </span>
                <span className="text-[12px] text-[var(--color-text-secondary)]">
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
                  className="w-full h-10 px-2.5 rounded-[6px] hover:bg-[var(--color-background-muted)] flex items-center gap-2.5 text-[14px] text-[var(--color-error)] cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>ออกจากระบบ</span>
                </button>
              )}
            </nav>
          </aside>
        </div>
      )}

      {/* =====================================================================
          4. ULTRA-MINIMAL MOBILE BOTTOM BAR (< lg)
      ====================================================================== */}
      <nav
        aria-label="Mobile bottom navigation"
        className={`${
          normalizedActiveTab === "chat" ? "hidden" : "lg:hidden"
        } fixed inset-x-0 bottom-0 z-40 bg-[var(--color-background-card)] border-t border-[var(--color-border)] pb-[env(safe-area-inset-bottom)] select-none`}
      >
        <div className="max-w-[540px] mx-auto px-1 h-[52px] grid grid-cols-5 items-stretch">
          {mobileBottomItems.map((tab) => {
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
                    ? "text-[var(--color-text-primary)] font-semibold"
                    : "text-[var(--color-text-secondary)]"
                }`}
              >
                {tab.icon}
                <span className="text-[11px] leading-tight whitespace-nowrap">
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
