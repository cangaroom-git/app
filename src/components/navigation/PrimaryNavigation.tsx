"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Calendar,
  Compass,
  Globe,
  LogIn,
  Moon,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Star,
  Sun,
  User,
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
import { UserProfileDropdown } from "@/components/navigation/UserProfileDropdown";

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
}: PrimaryNavigationProps) {
  const [isPageScrolled, setIsPageScrolled] = useState(false);
  const [isMobileBottomNavHidden, setIsMobileBottomNavHidden] = useState(false);
  const [shouldRenderMobileBottomNav, setShouldRenderMobileBottomNav] =
    useState(true);
  const [isMobileProfileDrawerOpen, setIsMobileProfileDrawerOpen] =
    useState(false);

  const brandBadgeCode = (
    propertyConfig?.brandCode ??
    brandCode ??
    "SU"
  ).slice(0, 2);
  const freeRoomCount = availableRoomCount ?? availableUnitsCount ?? 0;
  const isDarkTheme = theme === "dark";

  const normalizedActiveTab: HotelNavTabId =
    activeTab === "home" || activeTab === "room" ? "book" : activeTab;
  const isBookingPage = normalizedActiveTab === "book";

  const isProfileSectionActive =
    normalizedActiveTab === "setting" ||
    normalizedActiveTab === "guide" ||
    normalizedActiveTab === "review" ||
    isMobileProfileDrawerOpen;

  const handleToggleLanguage = () => {
    if (onChangeLanguage) {
      onChangeLanguage(language === "th" ? "en" : "th");
    }
  };

  useEffect(() => {
    let lastScrollY = window.scrollY;
    let isFrameScheduled = false;
    let upwardScrollAccumulation = 0;

    const evaluateBottomNavVisibility = () => {
      const currentScrollY = window.scrollY;
      setIsPageScrolled(currentScrollY > 8);
      const maxScrollY =
        document.documentElement.scrollHeight - window.innerHeight;

      if (currentScrollY < 0 || (maxScrollY > 0 && currentScrollY > maxScrollY)) {
        isFrameScheduled = false;
        return;
      }

      const scrollDelta = currentScrollY - lastScrollY;
      const hideDownwardThreshold = 10;
      const showUpwardAccumulationTarget = 60;

      if (currentScrollY < 60) {
        setIsMobileBottomNavHidden(false);
        upwardScrollAccumulation = 0;
      } else if (scrollDelta > 0) {
        upwardScrollAccumulation = 0;
        if (scrollDelta > hideDownwardThreshold) {
          setIsMobileBottomNavHidden(true);
        }
      } else if (scrollDelta < 0) {
        upwardScrollAccumulation += Math.abs(scrollDelta);
        if (upwardScrollAccumulation > showUpwardAccumulationTarget) {
          setIsMobileBottomNavHidden(false);
        }
      }

      lastScrollY = currentScrollY;
      isFrameScheduled = false;
    };

    const handleWindowScroll = () => {
      if (!isFrameScheduled) {
        window.requestAnimationFrame(evaluateBottomNavVisibility);
        isFrameScheduled = true;
      }
    };

    window.addEventListener("scroll", handleWindowScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleWindowScroll);
  }, []);

  useEffect(() => {
    if (!isMobileBottomNavHidden) {
      setShouldRenderMobileBottomNav(true);
    } else {
      const hideTimer = setTimeout(
        () => setShouldRenderMobileBottomNav(false),
        300
      );
      return () => clearTimeout(hideTimer);
    }
  }, [isMobileBottomNavHidden]);

  useBodyScrollLock(isMobileProfileDrawerOpen);

  return (
    <>
      {/* =====================================================================
          1. DESKTOP LEFT SIDEBAR (>= lg)
             - Vertically centered primary tabs (Book, Short Video, Deals)
             - Bottom-left "More" button removed (moved to Top-Right User Profile)
      ====================================================================== */}
      <aside
        aria-label="Primary sidebar navigation"
        className="hidden lg:flex fixed inset-y-0 left-0 z-40 flex-col justify-center bg-[var(--color-background-body)] w-[72px] hover:w-[244px] transition-[width,box-shadow] duration-250 ease-out group/sidebar overflow-hidden py-4 px-3"
      >
        <nav aria-label="Primary navigation" className="flex flex-col gap-2">
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
                className={`relative w-full h-12 rounded-[14px] flex items-center gap-4 px-3 text-[14px] transition-colors cursor-pointer group/navitem text-[var(--color-text-primary)] ${
                  isTabActive
                    ? "font-bold"
                    : "hover:bg-[var(--color-background-muted)] font-normal"
                }`}
              >
                {isTabActive && (
                  <motion.span
                    layoutId="my-hotel-desktop-tab-pill"
                    className="absolute inset-0 rounded-[14px] bg-[var(--color-background-muted)]"
                    transition={{
                      type: "spring",
                      stiffness: 420,
                      damping: 34,
                      mass: 0.8,
                    }}
                  />
                )}
                <span className="relative z-10 flex items-center justify-center w-6 h-6 shrink-0 transition-transform duration-200 group-hover/navitem:scale-105">
                  <HotelNavTabIcon
                    id={tab.id}
                    isActive={isTabActive}
                    cutoutColor="var(--color-background-body)"
                    className="w-[26px] h-[26px] shrink-0"
                  />
                </span>

                <span className="relative z-10 flex-1 flex items-center justify-between min-w-0 opacity-0 group-hover/sidebar:opacity-100 translate-x-1 group-hover/sidebar:translate-x-0 transition-all duration-200 whitespace-nowrap">
                  <span>{language === "th" ? tab.labelTh : tab.labelEn}</span>

                  {tab.id === "book" && freeRoomCount > 0 && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[12px] font-semibold ${
                        isTabActive
                          ? "bg-[var(--color-accent)] text-[var(--color-on-accent)]"
                          : "bg-[var(--color-background-muted)] text-[var(--color-text-secondary)]"
                      }`}
                    >
                      {freeRoomCount}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* =====================================================================
          2. CONTEXT-AWARE TOP NAVBAR (h-14 = 56px)
             - Sticky (`fixed top-0`) ONLY on the Booking page (`/` & `/room`)!
             - Mobile & Tablet (< lg): Shown ONLY on the Booking page as a full-width
               Search Pill (`flex-1 h-11`) + Coupon Bag (`h-11 w-11`) aligned edge-to-edge
               with the Hero card. Completely hidden on non-booking pages!
             - Desktop (>= lg): Left Brand Icon + Right Date Picker (Booking page only)
               + Coupon Bag + User Profile Dropdown. Static on non-booking pages.
      ====================================================================== */}
      <header
        aria-label="Top navigation bar"
        className={`${
          isBookingPage
            ? `flex fixed top-0 inset-x-0 lg:left-[72px] z-40 pr-[var(--scrollbar-compensation,0px)] bg-[var(--color-background-body)]/92 backdrop-blur-xl ${
                isPageScrolled ? "shadow-[0_2px_14px_rgba(15,23,42,0.05)]" : ""
              }`
            : "hidden lg:flex relative w-full z-30 bg-[var(--color-background-body)]"
        } h-14 transition-[background-color,box-shadow] duration-200`}
      >
        <div className="w-full max-w-[1140px] mx-auto px-4 sm:px-5 lg:px-6 h-full flex items-center justify-between gap-2.5">
          {/* LEFT (>= lg): Brand Icon ONLY */}
          <Link
            href="/"
            onClick={(event) => {
              if (activeTab === "book" || activeTab === "home") {
                event.preventDefault();
                window.scrollTo({ top: 0, behavior: "smooth" });
              } else {
                onSelectTab("book");
              }
            }}
            aria-label="Home"
            title={language === "th" ? "หน้าแรก" : "Home"}
            className="hidden lg:flex h-10 w-10 rounded-[12px] bg-[var(--color-accent)] text-[var(--color-on-accent)] items-center justify-center font-bold ty-body hover:scale-105 transition-transform shrink-0 cursor-pointer"
          >
            {brandBadgeCode}
          </Link>

          {/* FULL-WIDTH SEARCH BAR ON MOBILE/TABLET (< lg), RIGHT CONTROLS ON DESKTOP (>= lg) */}
          <div className="flex-1 lg:flex-initial flex items-center justify-end gap-2 min-w-0">
            {isBookingPage &&
              (checkInDate && checkOutDate ? (
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
                  onClick={() => {
                    const roomsSection = document.getElementById("rooms");
                    roomsSection?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="flex-1 lg:flex-initial h-11 lg:h-10 px-4 rounded-full bg-[var(--color-accent)] text-[var(--color-on-accent)] ty-body font-semibold inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Calendar className="w-4 h-4" />
                  <span>
                    {language === "th" ? "เช็คห้องว่าง" : "Check Rates"}
                  </span>
                </button>
              ))}

            <button
              type="button"
              onClick={onOpenCouponWallet}
              aria-label={
                language === "th" ? "กระเป๋าคูปองส่วนลด" : "Promo Coupon Bag"
              }
              title={
                language === "th" ? "กระเป๋าคูปองส่วนลด" : "Promo Coupon Bag"
              }
              className="inline-flex h-11 w-11 lg:h-10 lg:w-10 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] items-center justify-center shrink-0 transition cursor-pointer relative"
            >
              <ShoppingBag className="w-5 h-5" />
              {savedCouponsCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--color-promo)] text-[var(--color-on-promo)] text-[11px] font-bold inline-flex items-center justify-center leading-none">
                  {savedCouponsCount}
                </span>
              )}
            </button>

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
              />
            </div>
          </div>
        </div>
      </header>

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

          <aside className="app-right-drawer z-10 p-5 justify-between animate-slide-in-right-drawer">
            <nav className="space-y-1 overflow-y-auto no-scrollbar">
              <div className="flex items-center justify-between pb-3">
                <span className="ty-subtitle flex items-center gap-2">
                  <User className="w-4 h-4 text-[var(--color-accent)]" />
                  <span>
                    {language === "th" ? "โปรไฟล์ & เมนู" : "Profile & Menu"}
                  </span>
                </span>

                <button
                  type="button"
                  onClick={() => setIsMobileProfileDrawerOpen(false)}
                  aria-label="Close menu"
                  className="btn-icon"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsMobileProfileDrawerOpen(false);
                  onOpenCouponWallet();
                }}
                className="w-full h-11 px-3.5 rounded-[14px] bg-[var(--color-promo-muted)] hover:opacity-90 flex items-center justify-between ty-body font-bold text-[var(--color-promo-text)] transition cursor-pointer mb-2"
              >
                <span className="flex items-center gap-3">
                  <ShoppingBag className="w-4 h-4" />
                  <span>
                    {language === "th"
                      ? "กระเป๋าคูปองส่วนลด"
                      : "Promo Coupon Bag"}
                  </span>
                </span>
                <span className="badge-promo">{savedCouponsCount}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onSelectTab("review");
                  setIsMobileProfileDrawerOpen(false);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={`w-full h-11 px-3 rounded-[12px] flex items-center gap-3.5 ty-body font-medium transition cursor-pointer ${
                  normalizedActiveTab === "review"
                    ? "bg-[var(--color-background-muted)] font-semibold text-[var(--color-text-primary)]"
                    : "hover:bg-[var(--color-background-muted)] text-[var(--color-text-primary)]"
                }`}
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
                className={`w-full h-11 px-3 rounded-[12px] flex items-center gap-3.5 ty-body font-medium transition cursor-pointer ${
                  normalizedActiveTab === "guide"
                    ? "bg-[var(--color-background-muted)] font-semibold text-[var(--color-text-primary)]"
                    : "hover:bg-[var(--color-background-muted)] text-[var(--color-text-primary)]"
                }`}
              >
                <Compass className="w-5 h-5 text-[var(--color-text-secondary)]" />
                <span>
                  {language === "th" ? "คู่มือท่องเที่ยว" : "Sapan Guide"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onSelectTab("setting");
                  setIsMobileProfileDrawerOpen(false);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={`w-full h-11 px-3 rounded-[12px] flex items-center gap-3.5 ty-body font-medium transition cursor-pointer ${
                  normalizedActiveTab === "setting"
                    ? "bg-[var(--color-background-muted)] font-semibold text-[var(--color-text-primary)]"
                    : "hover:bg-[var(--color-background-muted)] text-[var(--color-text-primary)]"
                }`}
              >
                <Settings className="w-5 h-5 text-[var(--color-text-secondary)]" />
                <span>
                  {language === "th" ? "ตั้งค่า & การจอง" : "My Bookings"}
                </span>
              </button>

              {onToggleTheme && (
                <button
                  type="button"
                  onClick={onToggleTheme}
                  className="w-full h-11 px-3 rounded-[12px] hover:bg-[var(--color-background-muted)] flex items-center justify-between ty-body font-medium text-[var(--color-text-primary)] transition cursor-pointer"
                >
                  <span className="flex items-center gap-3.5">
                    {isDarkTheme ? (
                      <Sun className="w-5 h-5 text-[var(--color-text-secondary)]" />
                    ) : (
                      <Moon className="w-5 h-5 text-[var(--color-text-secondary)]" />
                    )}
                    <span>{language === "th" ? "โหมดสี" : "Appearance"}</span>
                  </span>
                  <span className="ty-caption font-semibold text-[var(--color-text-secondary)]">
                    {language === "th"
                      ? isDarkTheme
                        ? "มืด"
                        : "สว่าง"
                      : isDarkTheme
                      ? "Dark"
                      : "Light"}
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={handleToggleLanguage}
                className="w-full h-11 px-3 rounded-[12px] hover:bg-[var(--color-background-muted)] flex items-center justify-between ty-body font-medium text-[var(--color-text-primary)] transition cursor-pointer"
              >
                <span className="flex items-center gap-3.5">
                  <Globe className="w-5 h-5 text-[var(--color-text-secondary)]" />
                  <span>{language === "th" ? "ภาษา" : "Language"}</span>
                </span>
                <span className="ty-caption font-semibold text-[var(--color-text-secondary)]">
                  {language === "th" ? "ไทย (TH)" : "English (EN)"}
                </span>
              </button>

              <Link
                href="/login"
                onClick={() => setIsMobileProfileDrawerOpen(false)}
                className="w-full h-11 px-3 rounded-[12px] hover:bg-[var(--color-background-muted)] flex items-center gap-3.5 ty-body font-medium text-[var(--color-text-primary)] transition"
              >
                <LogIn className="w-5 h-5 text-[var(--color-text-secondary)]" />
                <span>{language === "th" ? "เข้าสู่ระบบ" : "Sign In"}</span>
              </Link>

              <Link
                href="/admin"
                onClick={() => setIsMobileProfileDrawerOpen(false)}
                className="w-full h-11 px-3 rounded-[12px] hover:bg-[var(--color-background-muted)] flex items-center justify-between ty-body font-medium text-[var(--color-text-primary)] transition"
              >
                <span className="flex items-center gap-3.5">
                  <ShieldCheck className="w-5 h-5 text-[var(--color-text-secondary)]" />
                  <span>Admin</span>
                </span>
                {pendingAdminCount > 0 && (
                  <span className="rounded-full bg-[var(--color-accent)] text-[var(--color-on-accent)] px-2 py-0.5 ty-caption font-semibold">
                    {pendingAdminCount}
                  </span>
                )}
              </Link>
            </nav>

            <p className="ty-caption flex items-center justify-between pt-3">
              <span>
                {language === "th" ? "ระบบจองตรงที่พัก" : "Direct Booking App"}
              </span>
              <span className="font-semibold text-[var(--color-text-primary)]">
                {language === "th" ? "การันตีราคาดีที่สุด 100%" : "100% Best Rate"}
              </span>
            </p>
          </aside>
        </div>
      )}

      {/* =====================================================================
          4. MOBILE & TABLET FLOATING BOTTOM NAVIGATION BAR (< lg)
             - Icon-only: 1) Book, 2) Short Video, 3) Chat, 4) Deals, 5) User Profile
      ====================================================================== */}
      <nav
        aria-label="Mobile bottom navigation"
        className={`${
          normalizedActiveTab === "chat"
            ? "hidden"
            : !shouldRenderMobileBottomNav && isMobileBottomNavHidden
            ? "hidden"
            : "lg:hidden"
        } fixed bottom-3 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-[360px] transition-all duration-300 ease-in-out ${
          isMobileBottomNavHidden
            ? "translate-y-2 opacity-0 scale-95 pointer-events-none"
            : "translate-y-0 opacity-100 scale-100 pointer-events-auto"
        }`}
      >
        <div
          className="rounded-full p-1.5 flex items-center justify-between gap-1"
          style={{
            background: isDarkTheme
              ? "linear-gradient(135deg, rgba(32, 32, 35, 0.86) 0%, rgba(22, 22, 24, 0.72) 100%)"
              : "linear-gradient(135deg, rgba(255, 255, 255, 0.88) 0%, rgba(245, 246, 248, 0.76) 100%)",
            backdropFilter: "blur(28px) saturate(200%)",
            WebkitBackdropFilter: "blur(28px) saturate(200%)",
            boxShadow: isDarkTheme
              ? "0 14px 40px -6px rgba(0, 0, 0, 0.55)"
              : "0 14px 40px -6px rgba(15, 23, 42, 0.16), 0 4px 12px -2px rgba(15, 23, 42, 0.06)",
          }}
        >
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
                title={language === "th" ? tab.labelTh : tab.labelEn}
                onClick={() => {
                  setIsMobileProfileDrawerOpen(false);
                  onSelectTab(tab.id);
                  if (tab.id !== "chat") {
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }
                }}
                className={`relative flex-1 h-11 rounded-full flex items-center justify-center transition-colors duration-200 cursor-pointer text-[var(--color-text-primary)] ${
                  isTabActive ? "font-bold" : "opacity-75 hover:opacity-100"
                }`}
              >
                {isTabActive && (
                  <motion.span
                    layoutId="my-hotel-mobile-tab-pill"
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: isDarkTheme
                        ? "rgba(255, 255, 255, 0.14)"
                        : "rgba(255, 255, 255, 0.96)",
                      boxShadow: isDarkTheme
                        ? "0 2px 10px rgba(0, 0, 0, 0.28)"
                        : "0 2px 10px rgba(15, 23, 42, 0.08)",
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 420,
                      damping: 34,
                      mass: 0.8,
                    }}
                  />
                )}
                <div className="relative z-10 flex items-center justify-center">
                  <HotelNavTabIcon
                    id={tab.id}
                    isActive={isTabActive}
                    cutoutColor={isDarkTheme ? "#202023" : "#ffffff"}
                    className="w-[22px] h-[22px]"
                  />
                  {tab.id === "book" && freeRoomCount > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 rounded-full bg-[var(--color-accent)] text-[var(--color-on-accent)] text-[10px] font-bold px-1.5 leading-tight">
                      {freeRoomCount}
                    </span>
                  )}
                </div>
              </button>
            );
          })}

          {/* 5) User Profile & Coupon Bag Drawer Trigger on Mobile */}
          <button
            type="button"
            aria-label={language === "th" ? "โปรไฟล์และเมนู" : "Profile menu"}
            title={language === "th" ? "โปรไฟล์ & คูปอง" : "Profile & Coupons"}
            onClick={() =>
              setIsMobileProfileDrawerOpen((prevOpen) => !prevOpen)
            }
            className={`relative flex-1 h-11 rounded-full flex items-center justify-center transition-colors duration-200 cursor-pointer text-[var(--color-text-primary)] ${
              isProfileSectionActive
                ? "font-bold"
                : "opacity-75 hover:opacity-100"
            }`}
          >
            {isProfileSectionActive && (
              <motion.span
                layoutId="my-hotel-mobile-tab-pill"
                className="absolute inset-0 rounded-full"
                style={{
                  background: isDarkTheme
                    ? "rgba(255, 255, 255, 0.14)"
                    : "rgba(255, 255, 255, 0.96)",
                  boxShadow: isDarkTheme
                    ? "0 2px 10px rgba(0, 0, 0, 0.28)"
                    : "0 2px 10px rgba(15, 23, 42, 0.08)",
                }}
                transition={{
                  type: "spring",
                  stiffness: 420,
                  damping: 34,
                  mass: 0.8,
                }}
              />
            )}
            <div className="relative z-10 flex items-center justify-center">
              <User className="w-[21px] h-[21px]" />
              {savedCouponsCount > 0 ? (
                <span className="absolute -top-1.5 -right-2 rounded-full bg-[var(--color-promo)] text-[var(--color-on-promo)] text-[10px] font-bold px-1.5 leading-tight">
                  {savedCouponsCount}
                </span>
              ) : pendingAdminCount > 0 ? (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[var(--color-accent)]" />
              ) : null}
            </div>
          </button>
        </div>
      </nav>
    </>
  );
}
