"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bookmark,
  Building2,
  CalendarCheck,
  Crown,
  ExternalLink,
  Globe,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Moon,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sun,
  TicketPercent,
  X,
} from "lucide-react";
import type { LanguageCode } from "@/lib/dateFormatters";
import { openPrivacySettingsModal } from "@/lib/telemetry/clientTelemetry";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";
import type { AuthenticatedMeDto } from "@/types/cangaroom";
import {
  MOBILE_BOTTOM_TABS,
  PlatformNavIcon,
  type PlatformNavTabId,
} from "@/components/navigation/NavigationIcons";
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
  searchQuery,
  onChangeSearchQuery,
}: PrimaryNavigationProps) {
  const router = useRouter();
  const pathname = usePathname() || "/";

  const [isMobileProfileDrawerOpen, setIsMobileProfileDrawerOpen] =
    useState(false);
  const [isMorePopoverOpen, setIsMorePopoverOpen] = useState(false);
  const [isMobileNavHidden, setIsMobileNavHidden] = useState(false);
  const [isFloatingSearchOpen, setIsFloatingSearchOpen] = useState(false);

  const moreWrapperRef = useRef<HTMLDivElement | null>(null);
  const floatingSearchInputRef = useRef<HTMLInputElement | null>(null);
  const lastScrollYRef = useRef<number>(0);
  const lastScrollTargetRef = useRef<EventTarget | null>(null);

  useBodyScrollLock(isMobileProfileDrawerOpen || isFloatingSearchOpen);

  useEffect(() => {
    setIsMobileNavHidden(false);
    setIsFloatingSearchOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isFloatingSearchOpen) return;
    const t = window.setTimeout(() => {
      floatingSearchInputRef.current?.focus();
    }, 60);
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFloatingSearchOpen(false);
    };
    window.addEventListener("keydown", onEsc);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", onEsc);
    };
  }, [isFloatingSearchOpen]);

  // Smooth Mobile/Tablet Auto-Hide Navbar on Scroll Down & Reveal on Scroll Up (< lg)
  useEffect(() => {
    if (typeof window === "undefined") return;
    let rafId = 0;

    const handleScroll = (e: Event) => {
      if (window.innerWidth >= 1024) {
        return;
      }

      const target = e.target;
      let currentY = 0;

      if (
        target === document ||
        target === window ||
        target === document.documentElement ||
        target === document.body
      ) {
        currentY = Math.max(0, window.scrollY);
      } else if (
        target instanceof HTMLElement &&
        target.dataset.mobileScrollContainer === "true"
      ) {
        currentY = Math.max(0, target.scrollTop);
      } else {
        return;
      }

      if (lastScrollTargetRef.current !== target) {
        lastScrollTargetRef.current = target;
        lastScrollYRef.current = currentY;
        if (currentY <= 32) setIsMobileNavHidden(false);
        return;
      }

      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = 0;
        const prevY = lastScrollYRef.current;
        const delta = currentY - prevY;

        if (currentY <= 32) {
          setIsMobileNavHidden(false);
          lastScrollYRef.current = currentY;
          return;
        }

        if (delta > 10 && currentY > 56) {
          setIsMobileNavHidden(true);
          lastScrollYRef.current = currentY;
        } else if (delta < -8) {
          setIsMobileNavHidden(false);
          lastScrollYRef.current = currentY;
        }
      });
    };

    window.addEventListener("scroll", handleScroll, {
      capture: true,
      passive: true,
    });
    return () => {
      window.removeEventListener("scroll", handleScroll, { capture: true });
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, []);

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

  const ensureOnDiscoveryFeed = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("cgr:reset-home-pin"));
    }
    if (activeTab !== "home" && activeTab !== "deal" && activeTab !== "board") {
      router.push("/");
    }
  };

  const handleFloatingSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsFloatingSearchOpen(false);
    ensureOnDiscoveryFeed();
  };

  const handleOpenFloatingSearch = () => {
    setIsMobileProfileDrawerOpen(false);
    setIsMobileNavHidden(false);
    setIsFloatingSearchOpen((prev) => !prev);
  };

  return (
    <>
      {/* =====================================================================
          1. DESKTOP MINIMAL 72px LEFT SIDEBAR (>= lg)
             Strictly 3 Traveller-First Items: 1) Home (/), 2) Deal (/deal), 3) Board (/board)
             Secondary / Owner / Trips routes live cleanly inside More (≡)
      ====================================================================== */}
      <aside
        aria-label="Primary sidebar navigation"
        className="hidden lg:flex fixed inset-y-0 left-0 z-50 w-[72px] flex-col items-center justify-between bg-[var(--color-background-card)] border-r border-[var(--color-border)] py-5 select-none"
      >
        {/* Top Brand Glyph */}
        <Link
          href="/"
          title="Cangaroom · Thailand Direct Stays"
          aria-label="Home"
          onClick={() => {
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("cgr:reset-home-pin"));
            }
          }}
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

        {/* Center Vertically Balanced Stack: 1) Home, 2) Deal, 3) Board */}
        <nav
          aria-label="Main navigation"
          className="flex flex-col items-center gap-2.5"
        >
          {/* 1) Home */}
          <Link
            href="/"
            title={language === "th" ? "หน้าแรก" : "Home"}
            aria-label="Home"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("cgr:reset-home-pin"));
              }
            }}
            className={`h-12 w-12 rounded-[16px] hover:bg-[var(--color-background-muted)] flex items-center justify-center text-[var(--color-text-primary)] transition-colors ${
              activeTab === "home" ? "bg-[var(--color-background-muted)]/85" : ""
            }`}
          >
            <PlatformNavIcon id="home" isActive={activeTab === "home"} />
          </Link>

          {/* 2) Deal */}
          <Link
            href="/deal"
            title={
              language === "th"
                ? "ดีล & คูปองส่วนลดที่พัก"
                : "Deals & Hotel Coupons"
            }
            aria-label="Deals"
            className={`h-12 w-12 rounded-[16px] hover:bg-[var(--color-background-muted)] flex items-center justify-center text-[var(--color-text-primary)] transition-colors relative ${
              activeTab === "deal" ? "bg-[var(--color-background-muted)]/85" : ""
            }`}
          >
            <PlatformNavIcon id="deal" isActive={activeTab === "deal"} />
            {savedCouponsCount > 0 && (
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[var(--color-promo)]" />
            )}
          </Link>

          {/* 3) Board */}
          <Link
            href="/board"
            title={
              language === "th"
                ? `บอร์ดที่บันทึกไว้${savedPinsCount > 0 ? ` (${savedPinsCount})` : ""}`
                : `Saved Boards${savedPinsCount > 0 ? ` (${savedPinsCount})` : ""}`
            }
            aria-label="Saved Boards"
            className={`h-12 w-12 rounded-[16px] hover:bg-[var(--color-background-muted)] flex items-center justify-center text-[var(--color-text-primary)] transition-colors relative ${
              activeTab === "board" ? "bg-[var(--color-background-muted)]/85" : ""
            }`}
          >
            <PlatformNavIcon id="board" isActive={activeTab === "board"} />
            {savedPinsCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-[6px] bg-[var(--color-promo)] text-[var(--color-on-promo)] text-[10px] font-bold inline-flex items-center justify-center leading-none">
                {savedPinsCount > 99 ? "99+" : savedPinsCount}
              </span>
            )}
          </Link>
        </nav>

        {/* Bottom More Menu (≡) — Houses /trips, /register-hotel, /studio, /super-admin & Settings */}
        <div ref={moreWrapperRef} className="relative">
          <button
            type="button"
            onClick={() => setIsMorePopoverOpen((v) => !v)}
            title={language === "th" ? "เมนูเพิ่มเติม" : "More"}
            aria-label="More menu"
            className={`h-12 w-12 rounded-[16px] hover:bg-[var(--color-background-muted)] flex items-center justify-center text-[var(--color-text-primary)] transition-colors cursor-pointer relative ${
              isMorePopoverOpen ||
              activeTab === "trips" ||
              activeTab === "register-hotel" ||
              activeTab === "studio" ||
              activeTab === "super-admin"
                ? "bg-[var(--color-background-muted)]"
                : ""
            }`}
          >
            <Menu
              className="w-[26px] h-[26px]"
              strokeWidth={isMorePopoverOpen ? 2.5 : 2}
            />
            {pendingStudioBookings > 0 && (
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[var(--color-promo)]" />
            )}
          </button>

          {isMorePopoverOpen && (
            <div className="absolute left-0 bottom-[calc(100%+8px)] w-[276px] rounded-[16px] bg-[var(--color-background-popover)] p-2 shadow-[var(--shadow-popover)] border border-[var(--color-border)] space-y-0.5 z-50">
              <Link
                href="/trips"
                onClick={() => setIsMorePopoverOpen(false)}
                className={`w-full h-11 px-3 rounded-[10px] hover:bg-[var(--color-background-muted)] flex items-center justify-between ty-body ${
                  activeTab === "trips"
                    ? "bg-[var(--color-background-muted)] font-semibold"
                    : ""
                }`}
              >
                <span className="flex items-center gap-3">
                  <CalendarCheck className="w-[20px] h-[20px]" />
                  <span>
                    {language === "th"
                      ? "การจอง & คูปองของฉัน"
                      : "My Trips & Wallet"}
                  </span>
                </span>
              </Link>

              <button
                type="button"
                onClick={() => {
                  setIsMorePopoverOpen(false);
                  onOpenCouponWallet();
                }}
                className="w-full h-11 px-3 rounded-[10px] hover:bg-[var(--color-background-muted)] flex items-center justify-between ty-body cursor-pointer"
              >
                <span className="flex items-center gap-3">
                  <ShoppingBag className="w-[20px] h-[20px]" />
                  <span>
                    {language === "th" ? "กระเป๋าคูปองด่วน" : "Coupon Wallet"}
                  </span>
                </span>
                {savedCouponsCount > 0 && (
                  <span className="badge-promo">{savedCouponsCount}</span>
                )}
              </button>

              <Link
                href="/register-hotel"
                onClick={() => setIsMorePopoverOpen(false)}
                className={`w-full h-11 px-3 rounded-[10px] hover:bg-[var(--color-background-muted)] flex items-center gap-3 ty-body font-semibold ${
                  activeTab === "register-hotel"
                    ? "bg-[var(--color-background-muted)]"
                    : ""
                }`}
              >
                <Building2 className="w-[20px] h-[20px]" />
                <span>
                  {language === "th"
                    ? "เปิดเพจที่พักฟรี 0% GP"
                    : "List Property Free (0% GP)"}
                </span>
              </Link>

              {hasStudioAccess && (
                <>
                  <div className="my-1 border-t border-[var(--color-border)]" />
                  <Link
                    href="/studio"
                    onClick={() => setIsMorePopoverOpen(false)}
                    className={`w-full h-11 px-3 rounded-[10px] hover:bg-[var(--color-background-muted)] flex items-center justify-between ty-body ${
                      activeTab === "studio"
                        ? "bg-[var(--color-background-muted)] font-semibold"
                        : ""
                    }`}
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
                  {ownedHotel && (
                    <Link
                      href={`/${ownedHotel.slug}`}
                      onClick={() => setIsMorePopoverOpen(false)}
                      className="w-full h-11 px-3 rounded-[10px] hover:bg-[var(--color-background-muted)] flex items-center gap-3 ty-body"
                    >
                      <ExternalLink className="w-[20px] h-[20px]" />
                      <span className="truncate">/{ownedHotel.slug}</span>
                    </Link>
                  )}
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

              <button
                type="button"
                onClick={() => {
                  setIsMorePopoverOpen(false);
                  openPrivacySettingsModal();
                }}
                className="w-full h-11 px-3 rounded-[10px] hover:bg-[var(--color-background-muted)] flex items-center gap-3 ty-body cursor-pointer"
              >
                <ShieldCheck className="w-[20px] h-[20px]" />
                <span>
                  {language === "th"
                    ? "ตั้งค่าคุกกี้ & PDPA"
                    : "Cookies & Privacy"}
                </span>
              </button>

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

      {/* =====================================================================
          2. UNIFIED 64px TOP HEADER BAR
             - Mobile/Tablet (< lg): Left = Cangaroom | Right = Search + More/Profile
             - Desktop (>= lg): Pure Full-Width Search Bar + Coupon Bag + User Dropdown
      ====================================================================== */}
      <header
        aria-label="Top navigation bar"
        className={`fixed top-0 inset-x-0 lg:left-[72px] z-40 h-16 bg-[var(--color-background-body)]/95 backdrop-blur-md border-b border-[var(--color-border)] px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform ${
          isMobileNavHidden &&
          !isMobileProfileDrawerOpen &&
          !isFloatingSearchOpen
            ? "max-lg:-translate-y-full"
            : "translate-y-0"
        } lg:translate-y-0`}
      >
        {/* MOBILE / TABLET LEFT: CANGAROOM WORDMARK (< lg) */}
        <div className="flex lg:hidden items-center gap-2 min-w-0">
          <Link
            href="/"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("cgr:reset-home-pin"));
              }
            }}
            className="inline-flex items-center gap-2 text-[var(--color-text-primary)] select-none"
          >
            <svg
              viewBox="0 0 24 24"
              className="w-[24px] h-[24px] shrink-0"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
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
            <span className="text-[18px] font-bold tracking-tight">
              Cangaroom
            </span>
          </Link>
        </div>

        {/* MOBILE / TABLET RIGHT: SEARCH ICON + MORE/PROFILE (< lg) */}
        <div className="flex lg:hidden items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleOpenFloatingSearch}
            aria-label={language === "th" ? "เปิดแถบค้นหา" : "Open search"}
            className={`h-10 w-10 rounded-[12px] inline-flex items-center justify-center transition-colors relative cursor-pointer ${
              isFloatingSearchOpen || searchQuery.trim().length > 0
                ? "bg-[var(--color-background-muted)] text-[var(--color-text-primary)]"
                : "hover:bg-[var(--color-background-muted)] text-[var(--color-text-primary)]"
            }`}
          >
            <Search className="w-[20px] h-[20px]" strokeWidth={2.1} />
            {searchQuery.trim().length > 0 && (
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[var(--color-promo)]" />
            )}
          </button>

          <button
            type="button"
            aria-label={
              language === "th" ? "เมนูเพิ่มเติมและโปรไฟล์" : "More & Profile"
            }
            onClick={() => {
              onRefreshProfile();
              setIsFloatingSearchOpen(false);
              setIsMobileProfileDrawerOpen((prev) => !prev);
            }}
            className="h-10 w-10 rounded-[12px] hover:bg-[var(--color-background-muted)] inline-flex items-center justify-center relative cursor-pointer transition-colors"
          >
            {user ? (
              <UserAvatarCircle
                user={user}
                sizeClass="h-7 w-7"
                iconSizeClass="w-[20px] h-[20px]"
              />
            ) : (
              <Menu
                className="w-[21px] h-[21px] text-[var(--color-text-primary)]"
                strokeWidth={2.1}
              />
            )}
            {pendingStudioBookings > 0 && (
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[var(--color-promo)]" />
            )}
          </button>
        </div>

        {/* DESKTOP PURE FULL-WIDTH SEARCH BAR (>= lg) */}
        {showSearchBar ? (
          <div className="hidden lg:flex flex-1 h-11 rounded-[12px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)]/70 focus-within:bg-[var(--color-background-muted)] focus-within:ring-1 focus-within:ring-[var(--color-border-emphasized)] pl-3.5 pr-2 items-center gap-2 transition-colors min-w-0">
            <Search className="w-[19px] h-[19px] text-[var(--color-text-secondary)] shrink-0" />

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onChangeSearchQuery(e.target.value)}
              placeholder={
                language === "th"
                  ? "ค้นหาชื่อที่พัก จังหวัด อำเภอ หรือสไตล์ที่ชอบ..."
                  : "Search stays, provinces, districts, or styles..."
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
          </div>
        ) : (
          <div className="hidden lg:block flex-1" />
        )}

        {/* DESKTOP RIGHT ACTIONS (>= lg) */}
        <div className="hidden lg:flex items-center gap-1.5 shrink-0">
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
      </header>

      {/* =====================================================================
          3. FLOATING SEARCH BAR OVERLAY (< lg)
             Triggered by Top Navbar "Search" icon OR Bottom Bar "Search" button
      ====================================================================== */}
      {isFloatingSearchOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={language === "th" ? "ค้นหาที่พัก" : "Search stays"}
          className="lg:hidden fixed inset-0 z-[82] overflow-hidden"
        >
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px] animate-fade-in-backdrop"
            onClick={() => setIsFloatingSearchOpen(false)}
          />

          <div className="relative z-10 px-3 pt-[max(12px,env(safe-area-inset-top))]">
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full rounded-[18px] bg-[var(--color-background-popover)] border border-[var(--color-border)] shadow-[var(--shadow-popover)] p-3"
            >
              <form
                onSubmit={handleFloatingSearchSubmit}
                className="flex items-center gap-2"
              >
                <div className="flex-1 h-11 rounded-[13px] bg-[var(--color-background-muted)] focus-within:ring-1 focus-within:ring-[var(--color-border-emphasized)] pl-3.5 pr-2 flex items-center gap-2 min-w-0">
                  <Search className="w-[18px] h-[18px] text-[var(--color-text-secondary)] shrink-0" />
                  <input
                    ref={floatingSearchInputRef}
                    type="search"
                    value={searchQuery}
                    onChange={(e) => onChangeSearchQuery(e.target.value)}
                    placeholder={
                      language === "th"
                        ? "ค้นหาชื่อที่พัก จังหวัด หรือสไตล์..."
                        : "Search stays, provinces, or styles..."
                    }
                    className="flex-1 min-w-0 bg-transparent text-[15px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        onChangeSearchQuery("");
                        floatingSearchInputRef.current?.focus();
                      }}
                      aria-label="Clear search"
                      className="h-7 w-7 rounded-[9px] bg-[var(--color-background-subtle)] flex items-center justify-center text-[var(--color-text-primary)] shrink-0 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  className="h-11 px-4 rounded-[13px] bg-[#111111] dark:bg-[#f5f5f5] !text-white dark:!text-[#111111] text-[14px] font-semibold shrink-0 cursor-pointer"
                >
                  {language === "th" ? "ค้นหา" : "Search"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          4. MOBILE MORE & PROFILE RIGHT DRAWER (< lg)
             Houses /trips, /register-hotel, /studio, Coupon Wallet & Settings
      ====================================================================== */}
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
                  className="w-full h-11 px-3.5 rounded-[12px] bg-[#111111] dark:bg-[#f5f5f5] !text-white dark:!text-[#111111] flex items-center justify-center gap-2 ty-body font-semibold mb-2"
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
                href="/trips"
                onClick={() => setIsMobileProfileDrawerOpen(false)}
                className="w-full h-11 px-3 rounded-[10px] hover:bg-[var(--color-background-muted)] flex items-center gap-3 ty-body font-medium"
              >
                <CalendarCheck className="w-5 h-5 text-[var(--color-text-secondary)]" />
                <span>
                  {language === "th"
                    ? "การจอง & กระเป๋าคูปองของฉัน"
                    : "My Trips & Wallet"}
                </span>
              </Link>

              <button
                type="button"
                onClick={() => {
                  setIsMobileProfileDrawerOpen(false);
                  onOpenCouponWallet();
                }}
                className="w-full h-11 px-3 rounded-[10px] hover:bg-[var(--color-background-muted)] flex items-center justify-between ty-body font-medium cursor-pointer"
              >
                <span className="flex items-center gap-3">
                  <ShoppingBag className="w-5 h-5 text-[var(--color-text-secondary)]" />
                  <span>
                    {language === "th" ? "กระเป๋าคูปองด่วน" : "Coupon Wallet"}
                  </span>
                </span>
                {savedCouponsCount > 0 && (
                  <span className="badge-promo">{savedCouponsCount}</span>
                )}
              </button>

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

              <button
                type="button"
                onClick={() => {
                  setIsMobileProfileDrawerOpen(false);
                  openPrivacySettingsModal();
                }}
                className="w-full h-11 px-3 rounded-[12px] hover:bg-[var(--color-background-muted)] flex items-center gap-3 ty-body font-medium cursor-pointer"
              >
                <ShieldCheck className="w-5 h-5 text-[var(--color-text-secondary)]" />
                <span>
                  {language === "th"
                    ? "ตั้งค่าคุกกี้ & ความเป็นส่วนตัว (PDPA)"
                    : "Cookies & Privacy (PDPA)"}
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

      {/* =====================================================================
          5. FLOATING SEPARATED SQUIRCLE MOBILE BOTTOM BAR (< lg, z-[70])
             4 Buttons Only: 1) Home (/), 2) Deal (/deal), 3) Search (Floating), 4) Board (/board)
      ====================================================================== */}
      <nav
        aria-label="Mobile bottom navigation"
        className={`fixed bottom-[max(14px,env(safe-area-inset-bottom))] inset-x-0 z-[70] lg:hidden pointer-events-none flex items-center justify-center px-3 select-none transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform ${
          isMobileNavHidden &&
          !isMobileProfileDrawerOpen &&
          !isFloatingSearchOpen
            ? "translate-y-[calc(100%+28px)]"
            : "translate-y-0"
        }`}
      >
        <div className="pointer-events-auto flex items-center gap-2.5">
          {MOBILE_BOTTOM_TABS.map((tab) => {
            const activeCutoutColor = isDarkTheme ? "#f5f5f5" : "#111111";

            if (tab.id === "search") {
              const isSearchActive = isFloatingSearchOpen;
              return (
                <button
                  key={tab.id}
                  type="button"
                  aria-label={tab.labelEn}
                  onClick={handleOpenFloatingSearch}
                  className={`h-12 w-12 rounded-[16px] border border-[var(--color-border)] shadow-[var(--shadow-popover)] backdrop-blur-md flex items-center justify-center transition-colors relative cursor-pointer ${
                    isSearchActive
                      ? "bg-[#111111] !text-white dark:bg-[#f5f5f5] dark:!text-[#111111]"
                      : "bg-[var(--color-background-card)]/95 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                  }`}
                >
                  <PlatformNavIcon
                    id="search"
                    isActive={isSearchActive}
                    className="w-[22px] h-[22px]"
                  />
                  {searchQuery.trim().length > 0 && !isSearchActive && (
                    <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[var(--color-promo)]" />
                  )}
                </button>
              );
            }

            const isTabActive =
              activeTab === tab.id &&
              !isFloatingSearchOpen &&
              !isMobileProfileDrawerOpen;

            return (
              <Link
                key={tab.id}
                href={tab.href || "/"}
                aria-label={tab.labelEn}
                onClick={() => {
                  setIsFloatingSearchOpen(false);
                  if (tab.id === "home" && typeof window !== "undefined") {
                    window.dispatchEvent(new CustomEvent("cgr:reset-home-pin"));
                  }
                }}
                className={`h-12 w-12 rounded-[16px] border border-[var(--color-border)] shadow-[var(--shadow-popover)] backdrop-blur-md flex items-center justify-center transition-colors relative ${
                  isTabActive
                    ? "bg-[#111111] !text-white dark:bg-[#f5f5f5] dark:!text-[#111111]"
                    : "bg-[var(--color-background-card)]/95 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                <PlatformNavIcon
                  id={tab.id}
                  isActive={isTabActive}
                  cutoutColor={
                    isTabActive
                      ? activeCutoutColor
                      : "var(--color-background-card)"
                  }
                  className="w-[22px] h-[22px]"
                />
                {tab.id === "deal" && savedCouponsCount > 0 && (
                  <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[var(--color-promo)]" />
                )}
                {tab.id === "board" && savedPinsCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-[5px] bg-[var(--color-promo)] text-[var(--color-on-promo)] text-[9px] font-bold inline-flex items-center justify-center leading-none">
                    {savedPinsCount > 9 ? "9+" : savedPinsCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
