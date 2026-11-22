"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, Search, X } from "lucide-react";
import type { LanguageCode } from "@/lib/dateFormatters";
import { recordRecentSearch } from "@/lib/telemetry/clientTelemetry";
import type {
  SmartSearchMatchedHotel,
  SmartSearchRecentPin,
} from "@/lib/services/smartSearchService";
import {
  SmartSearchDropdown,
  type SmartSearchSelectQueryPayload,
} from "@/components/navigation/SmartSearchDropdown";
import { startRouteProgress } from "@/components/navigation/RouteProgressBar";
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
import { AirbnbMenuDrawer } from "@/components/navigation/AirbnbMenuDrawer";

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
  const [isMobileNavHidden, setIsMobileNavHidden] = useState(false);
  const [isFloatingSearchOpen, setIsFloatingSearchOpen] = useState(false);
  const [isDesktopSearchOpen, setIsDesktopSearchOpen] = useState(false);

  const shouldHideMobileBottomNav =
    isMobileNavHidden && !isMobileProfileDrawerOpen && !isFloatingSearchOpen;
  const isHotelBookingFlowPage =
    activeTab === "hotel" && !pathname.includes("/posts");
  const [isBottomNavRendered, setIsBottomNavRendered] = useState(
    !shouldHideMobileBottomNav
  );

  useEffect(() => {
    if (!shouldHideMobileBottomNav) {
      setIsBottomNavRendered(true);
    } else {
      const timer = window.setTimeout(() => setIsBottomNavRendered(false), 300);
      return () => window.clearTimeout(timer);
    }
  }, [shouldHideMobileBottomNav]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.dataset.mobileNavHidden =
      shouldHideMobileBottomNav ? "true" : "false";
    return () => {
      document.documentElement.dataset.mobileNavHidden = "false";
    };
  }, [shouldHideMobileBottomNav]);

  const desktopSearchWrapperRef = useRef<HTMLDivElement | null>(null);
  const desktopSearchInputRef = useRef<HTMLInputElement | null>(null);
  const floatingSearchInputRef = useRef<HTMLInputElement | null>(null);
  const lastScrollYRef = useRef<number>(0);
  const lastScrollTargetRef = useRef<EventTarget | null>(null);

  useBodyScrollLock(isFloatingSearchOpen);

  useEffect(() => {
    setIsMobileNavHidden(false);
    setIsFloatingSearchOpen(false);
    setIsDesktopSearchOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isDesktopSearchOpen) return;
    const handleOutsideSearch = (e: MouseEvent) => {
      if (
        desktopSearchWrapperRef.current &&
        !desktopSearchWrapperRef.current.contains(e.target as Node)
      ) {
        setIsDesktopSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideSearch);
    return () => {
      document.removeEventListener("mousedown", handleOutsideSearch);
    };
  }, [isDesktopSearchOpen]);

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
        currentY = window.scrollY;
        const maxScrollY =
          document.documentElement.scrollHeight - window.innerHeight;
        // Ignore iOS rubber-band overscroll beyond the top or bottom
        if (currentY < 0 || (maxScrollY > 0 && currentY > maxScrollY)) {
          return;
        }
      } else if (
        target instanceof HTMLElement &&
        target.dataset.mobileScrollContainer === "true"
      ) {
        currentY = target.scrollTop;
        const maxScrollTop = target.scrollHeight - target.clientHeight;
        if (currentY < 0 || (maxScrollTop > 0 && currentY > maxScrollTop)) {
          return;
        }
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

  const isDarkTheme = theme === "dark";
  const ownedHotel = user?.ownedHotels?.[0] ?? null;
  const hasStudioAccess =
    Boolean(ownedHotel) ||
    user?.role === "HOTEL_OWNER" ||
    user?.role === "SUPER_ADMIN";
  const pendingStudioBookings =
    user?.ownedHotels?.reduce((sum, h) => sum + h.pendingBookingsCount, 0) ?? 0;

  const ensureOnDiscoveryFeed = useCallback(() => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("cgr:reset-home-pin"));
    }
    if (
      activeTab !== "home" &&
      activeTab !== "explore" &&
      activeTab !== "board"
    ) {
      router.push("/");
    }
  }, [activeTab, router]);

  const handleSelectSmartQuery = useCallback(
    (payload: SmartSearchSelectQueryPayload) => {
      const clean = payload.query.trim();
      if (clean) {
        recordRecentSearch({
          query: clean,
          imageUrl: payload.imageUrl,
          subtitle: payload.subtitle,
        });
      }
      onChangeSearchQuery(clean);
      setIsDesktopSearchOpen(false);
      setIsFloatingSearchOpen(false);
      desktopSearchInputRef.current?.blur();
      floatingSearchInputRef.current?.blur();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("cgr:reset-home-pin"));
      }
      if (activeTab !== "home" && activeTab !== "deal" && activeTab !== "board") {
        router.push("/");
      } else if (activeTab !== "home") {
        // Navigating to / ensures curated style/idea clicks show pins directly
        router.push("/");
      }
    },
    [activeTab, onChangeSearchQuery, router]
  );

  const handleSelectSmartHotel = useCallback(
    (hotel: SmartSearchMatchedHotel) => {
      recordRecentSearch({
        query: language === "th" ? hotel.nameTh : hotel.nameEn,
        imageUrl: hotel.imageUrl,
        subtitle:
          language === "th" ? hotel.provinceNameTh : hotel.provinceNameEn,
        hotelSlug: hotel.slug,
      });
      setIsDesktopSearchOpen(false);
      setIsFloatingSearchOpen(false);
      desktopSearchInputRef.current?.blur();
      floatingSearchInputRef.current?.blur();
      startRouteProgress();
      router.push(`/${hotel.slug}`);
    },
    [language, router]
  );

  const handleSelectSmartPin = useCallback(
    (pin: SmartSearchRecentPin) => {
      setIsDesktopSearchOpen(false);
      setIsFloatingSearchOpen(false);
      desktopSearchInputRef.current?.blur();
      floatingSearchInputRef.current?.blur();
      startRouteProgress();
      router.push(`/?stay=${encodeURIComponent(pin.id)}`);
    },
    [router]
  );

  const handleFloatingSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = searchQuery.trim();
    if (clean) {
      recordRecentSearch({ query: clean });
    }
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
          title="Nondii · Thailand Direct Stays"
          aria-label="Nondii Home"
          onClick={() => {
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("cgr:reset-home-pin"));
            }
          }}
          className="h-12 w-12 rounded-[16px] hover:bg-[var(--color-background-muted)] flex items-center justify-center text-[var(--color-text-primary)] transition-colors"
        >
          <img
            src="/brand/nondii-icon-square-black.svg"
            alt="Nondii"
            className="w-[38px] h-[38px] object-contain dark:invert"
          />
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

          {/* 2) Explore Map */}
          <Link
            href="/explore"
            title={
              language === "th"
                ? "แผนที่โปรที่พักทั่วไทย"
                : "Explore deals on map"
            }
            aria-label="Explore map"
            className={`h-12 w-12 rounded-[16px] hover:bg-[var(--color-background-muted)] flex items-center justify-center text-[var(--color-text-primary)] transition-colors relative ${
              activeTab === "explore"
                ? "bg-[var(--color-background-muted)]/85"
                : ""
            }`}
          >
            <PlatformNavIcon id="explore" isActive={activeTab === "explore"} />
          </Link>

          {/* 3) Board (Saved Coupons & Deals) */}
          <Link
            href="/board"
            title={
              language === "th"
                ? "บอร์ดคูปองที่บันทึกไว้"
                : "Saved deal boards"
            }
            aria-label="Saved Boards"
            className={`h-12 w-12 rounded-[16px] hover:bg-[var(--color-background-muted)] flex items-center justify-center text-[var(--color-text-primary)] transition-colors relative ${
              activeTab === "board" ? "bg-[var(--color-background-muted)]/85" : ""
            }`}
          >
            <PlatformNavIcon id="board" isActive={activeTab === "board"} />
          </Link>
        </nav>

        {/* Bottom More Menu (≡) — Opens Airbnb Slide-Over Menu Drawer */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsMobileProfileDrawerOpen(true)}
            title={language === "th" ? "เมนูเพิ่มเติม" : "More"}
            aria-label="More menu"
            aria-expanded={isMobileProfileDrawerOpen}
            aria-haspopup="dialog"
            className={`h-12 w-12 rounded-[16px] hover:bg-[var(--color-background-muted)] flex items-center justify-center text-[var(--color-text-primary)] transition-colors cursor-pointer relative ${
              isMobileProfileDrawerOpen ||
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
              strokeWidth={isMobileProfileDrawerOpen ? 2.5 : 2}
            />
            {pendingStudioBookings > 0 && (
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[var(--color-promo)]" />
            )}
          </button>
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
            className="inline-flex items-center text-[var(--color-text-primary)] select-none"
          >
            <img
              src="/brand/nondi-icon-with-text-black.svg"
              alt="Nondii"
              className="h-[34px] w-auto object-contain dark:invert"
            />
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
          <div
            ref={desktopSearchWrapperRef}
            className="hidden lg:block relative flex-1 min-w-0"
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const clean = searchQuery.trim();
                if (clean) {
                  recordRecentSearch({ query: clean });
                }
                setIsDesktopSearchOpen(false);
                desktopSearchInputRef.current?.blur();
                ensureOnDiscoveryFeed();
              }}
              className="flex w-full h-11 rounded-[12px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)]/70 focus-within:bg-[var(--color-background-muted)] focus-within:ring-1 focus-within:ring-[var(--color-border-emphasized)] pl-3.5 pr-2 items-center gap-2 transition-colors min-w-0"
            >
              <Search className="w-[19px] h-[19px] text-[var(--color-text-secondary)] shrink-0" />

              <input
                ref={desktopSearchInputRef}
                id="global-stay-search"
                name="q"
                type="text"
                value={searchQuery}
                onFocus={() => setIsDesktopSearchOpen(true)}
                onChange={(e) => {
                  onChangeSearchQuery(e.target.value);
                  if (!isDesktopSearchOpen) setIsDesktopSearchOpen(true);
                }}
                placeholder={
                  language === "th"
                    ? "ค้นหาโปรที่พัก จังหวัด ชื่อโรงแรม หรือแหล่งดีล..."
                    : "Search stay deals, provinces, hotels, or sources..."
                }
                aria-label={language === "th" ? "ค้นหาโปรที่พัก" : "Search deals"}
                className="flex-1 min-w-[60px] bg-transparent ty-body text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none"
              />

              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    onChangeSearchQuery("");
                    desktopSearchInputRef.current?.focus();
                    setIsDesktopSearchOpen(true);
                  }}
                  aria-label="Clear search"
                  className="h-7 w-7 rounded-[10px] bg-[var(--color-text-secondary)]/20 hover:bg-[var(--color-text-secondary)]/35 flex items-center justify-center cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </form>

            <SmartSearchDropdown
              isOpen={isDesktopSearchOpen}
              query={searchQuery}
              language={language}
              variant="desktop"
              inputRef={desktopSearchInputRef}
              onSelectQuery={handleSelectSmartQuery}
              onSelectHotel={handleSelectSmartHotel}
              onSelectPin={handleSelectSmartPin}
              onClose={() => setIsDesktopSearchOpen(false)}
            />
          </div>
        ) : (
          <div className="hidden lg:block flex-1" />
        )}

        {/* DESKTOP RIGHT ACTIONS (>= lg) */}
        <div className="hidden lg:flex items-center gap-1.5 shrink-0">
          {hasStudioAccess ? (
            <Link
              href="/studio"
              className="h-10 px-3.5 rounded-[12px] hover:bg-[var(--color-background-muted)] text-[14px] font-semibold text-[var(--color-text-primary)] inline-flex items-center gap-2 transition-colors relative whitespace-nowrap"
            >
              <span>
                {language === "th" ? "โหมดเจ้าของที่พัก" : "Switch to hosting"}
              </span>
              {pendingStudioBookings > 0 && (
                <span className="h-2 w-2 rounded-full bg-[var(--color-promo)] shrink-0" />
              )}
            </Link>
          ) : (
            <Link
              href="/register-hotel"
              className="h-10 px-3.5 rounded-[12px] hover:bg-[var(--color-background-muted)] text-[14px] font-semibold text-[var(--color-text-primary)] inline-flex items-center transition-colors whitespace-nowrap"
            >
              {language === "th" ? "ลงที่พักฟรี 0% GP" : "List your stay"}
            </Link>
          )}

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
              className="w-full max-h-[82dvh] flex flex-col rounded-[18px] bg-[var(--color-background-popover)] border border-[var(--color-border)] shadow-[var(--shadow-popover)] p-3"
            >
              <form
                onSubmit={handleFloatingSearchSubmit}
                className="flex items-center gap-2 shrink-0"
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

              <SmartSearchDropdown
                isOpen={isFloatingSearchOpen}
                query={searchQuery}
                language={language}
                variant="mobile"
                inputRef={floatingSearchInputRef}
                onSelectQuery={handleSelectSmartQuery}
                onSelectHotel={handleSelectSmartHotel}
                onSelectPin={handleSelectSmartPin}
                onClose={() => setIsFloatingSearchOpen(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          4. AIRBNB SLIDE-OVER RIGHT MENU DRAWER (Desktop Hamburger & Mobile Menu)
      ====================================================================== */}
      <AirbnbMenuDrawer
        isOpen={isMobileProfileDrawerOpen}
        onClose={() => setIsMobileProfileDrawerOpen(false)}
        variant="traveller"
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

      {/* =====================================================================
          5. HORIZONTAL ICON-ONLY MOBILE FLOATING BOTTOM BAR (< lg, z-[70])
             Compact horizontal centered dock (Home / Explore Map / Saved Boards) — ZERO text labels
      ====================================================================== */}
      <nav
        aria-label="Mobile navigation"
        aria-hidden={shouldHideMobileBottomNav}
        data-hide-on-hotel={isHotelBookingFlowPage ? "true" : undefined}
        className={`fixed inset-x-3 max-w-fit mx-auto z-[70] lg:hidden pointer-events-none select-none transition-all duration-300 ease-in-out ${
          shouldHideMobileBottomNav
            ? "translate-y-3 opacity-0"
            : "translate-y-0 opacity-100"
        } ${!isBottomNavRendered && shouldHideMobileBottomNav ? "hidden" : ""}`}
        style={{
          bottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <div
          className={`${
            shouldHideMobileBottomNav
              ? "pointer-events-none"
              : "pointer-events-auto"
          } flex flex-row items-center gap-2 rounded-[18px] bg-[var(--color-background-card)]/92 backdrop-blur-xl border border-[var(--color-border)] shadow-[var(--shadow-popover)] p-1.5`}
        >
          {MOBILE_BOTTOM_TABS.map((tab) => {
            const activeCutoutColor = isDarkTheme ? "#222222" : "#ffffff";
            const isTabActive =
              activeTab === tab.id &&
              !isFloatingSearchOpen &&
              !isMobileProfileDrawerOpen;

            return (
              <Link
                key={tab.id}
                href={tab.href}
                title={language === "th" ? tab.labelTh : tab.labelEn}
                aria-label={language === "th" ? tab.labelTh : tab.labelEn}
                onClick={() => {
                  setIsFloatingSearchOpen(false);
                  if (tab.id === "home" && typeof window !== "undefined") {
                    window.dispatchEvent(new CustomEvent("cgr:reset-home-pin"));
                  }
                }}
                className={`h-11 w-12 rounded-[12px] flex items-center justify-center transition-colors relative ${
                  isTabActive
                    ? "bg-[#222222] !text-white dark:bg-[#f5f5f5] dark:!text-[#222222]"
                    : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-background-muted)]"
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
                  className="w-[21px] h-[21px] shrink-0"
                />
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
