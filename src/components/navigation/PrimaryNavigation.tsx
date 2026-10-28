"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Bot,
  Calendar,
  Compass,
  Globe,
  LogIn,
  Moon,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
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
    activeTab === "room" ? "book" : activeTab;
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
    const handleWindowScroll = () => {
      setIsPageScrolled(window.scrollY > 8);
    };
    window.addEventListener("scroll", handleWindowScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleWindowScroll);
  }, []);

  useBodyScrollLock(isMobileProfileDrawerOpen);

  const propertyShortName =
    language === "th"
      ? propertyConfig?.nameTh?.split("(")[0]?.trim() || "สะปัน อันซีน"
      : propertyConfig?.nameEn || "Sapan Unseen";

  return (
    <>
      {/* =====================================================================
          1. DESKTOP LEFT SIDEBAR (>= lg)
             - Vertically centered primary tabs (Home, Book, Shorts, Deals)
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
                    ? "font-bold text-[var(--color-accent)]"
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
                    className="w-[24px] h-[24px] shrink-0"
                  />
                </span>

                <span className="relative z-10 flex-1 flex items-center justify-between min-w-0 opacity-0 group-hover/sidebar:opacity-100 translate-x-1 group-hover/sidebar:translate-x-0 transition-all duration-200 whitespace-nowrap">
                  <span>{language === "th" ? tab.labelTh : tab.labelEn}</span>

                  {tab.id === "book" && freeRoomCount > 0 && (
                    <span
                      className={`rounded-full px-2 py-0.5 ty-caption font-semibold ${
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
             - Sticky (`fixed top-0`) ONLY on `/booking` (and `/room`)!
             - Static (`relative`) on `/` (Home) and all other pages so full-bleed
               editorial imagery scrolls naturally without a sticky bar blocking it.
             - Right side houses Coupon Bag + Profile/Menu (on both Mobile & Desktop).
      ====================================================================== */}
      <header
        aria-label="Top navigation bar"
        className={`${
          isBookingPage
            ? `flex fixed top-0 inset-x-0 lg:left-[72px] z-40 pr-[var(--scrollbar-compensation,0px)] bg-[var(--color-background-body)]/94 backdrop-blur-xl ${
                isPageScrolled ? "shadow-[0_2px_14px_rgba(15,23,42,0.05)]" : ""
              }`
            : "flex relative w-full z-30 bg-[var(--color-background-body)]"
        } h-14 transition-[background-color,box-shadow] duration-200`}
      >
        <div className="w-full max-w-[1140px] mx-auto px-4 sm:px-5 lg:px-6 h-full flex items-center justify-between gap-2">
          {/* LEFT: Brand Mark (shown on Desktop always, and on Mobile/Tablet for non-booking pages) */}
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
            title={language === "th" ? "หน้าแรก" : "Home"}
            className={`${
              isBookingPage ? "hidden lg:inline-flex" : "inline-flex"
            } items-center gap-2.5 min-w-0 shrink-0 cursor-pointer group/brand`}
          >
            <span className="h-9 w-9 lg:h-10 lg:w-10 rounded-[12px] bg-[var(--color-accent)] text-[var(--color-on-accent)] inline-flex items-center justify-center font-bold ty-body group-hover/brand:scale-105 transition-transform shrink-0">
              {brandBadgeCode}
            </span>
            {!isBookingPage && (
              <span className="ty-subtitle font-bold text-[var(--color-text-primary)] truncate max-w-[190px] sm:max-w-none">
                {propertyShortName}
              </span>
            )}
          </Link>

          {/* RIGHT / SEARCH CONTROLS:
              - On `/booking`: Full-width Date Search Pill on < lg + Coupon Bag + Profile
              - On `/` & other pages: Clean minimal Coupon Bag + Profile */}
          <div
            className={`${
              isBookingPage ? "flex-1 lg:flex-initial" : ""
            } flex items-center justify-end gap-1.5 sm:gap-2 min-w-0`}
          >
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
                  className="flex-1 lg:flex-initial h-10 px-4 rounded-full bg-[var(--color-accent)] text-[var(--color-on-accent)] ty-body font-semibold inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Calendar className="w-4 h-4" />
                  <span>
                    {language === "th" ? "เช็คห้องว่าง" : "Check Rates"}
                  </span>
                </button>
              ))}

            {/* Coupon Bag Trigger */}
            <button
              type="button"
              onClick={onOpenCouponWallet}
              aria-label={
                language === "th" ? "กระเป๋าคูปองส่วนลด" : "Promo Coupon Bag"
              }
              title={
                language === "th" ? "กระเป๋าคูปองส่วนลด" : "Promo Coupon Bag"
              }
              className="inline-flex h-10 w-10 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] items-center justify-center shrink-0 transition cursor-pointer relative"
            >
              <ShoppingBag className="w-[19px] h-[19px]" />
              {savedCouponsCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--color-promo)] text-[var(--color-on-promo)] ty-caption font-bold inline-flex items-center justify-center leading-none">
                  {savedCouponsCount}
                </span>
              )}
            </button>

            {/* Mobile & Tablet (< lg): Profile & Menu Trigger */}
            <button
              type="button"
              aria-label={language === "th" ? "โปรไฟล์และเมนู" : "Profile menu"}
              title={language === "th" ? "โปรไฟล์ & ตั้งค่า" : "Profile & Menu"}
              onClick={() =>
                setIsMobileProfileDrawerOpen((prevOpen) => !prevOpen)
              }
              className={`lg:hidden inline-flex h-10 w-10 rounded-full items-center justify-center shrink-0 transition cursor-pointer relative ${
                isProfileSectionActive
                  ? "bg-[var(--color-accent-muted)] text-[var(--color-accent)]"
                  : "bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)]"
              }`}
            >
              <User className="w-[19px] h-[19px]" />
              {pendingAdminCount > 0 && (
                <span className="absolute top-0 right-0 h-2.5 w-2.5 rounded-full bg-[var(--color-accent)] ring-2 ring-[var(--color-background-body)]" />
              )}
            </button>

            {/* Desktop (>= lg): Profile Dropdown */}
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

          <aside className="app-right-drawer z-10 px-5 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] justify-between animate-slide-in-right-drawer">
            <div className="flex items-center justify-between gap-3 pb-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-full bg-[var(--color-accent)] text-[var(--color-on-accent)] flex items-center justify-center font-bold ty-body shrink-0">
                  {brandBadgeCode}
                </div>
                <div className="min-w-0">
                  <h2 className="ty-subtitle truncate">
                    {language === "th"
                      ? propertyConfig?.nameTh ?? "บัญชีและเมนูหลัก"
                      : propertyConfig?.nameEn ?? "Account & Menu"}
                  </h2>
                  <p className="ty-caption truncate">
                    {language === "th"
                      ? "คูปองส่วนลด รีวิว คู่มือ และการจอง"
                      : "Coupons, reviews, guide & bookings"}
                  </p>
                </div>
              </div>
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
              <button
                type="button"
                onClick={() => {
                  setIsMobileProfileDrawerOpen(false);
                  onOpenCouponWallet();
                }}
                className="w-full h-12 px-3 rounded-[12px] bg-[var(--color-promo-muted)] hover:opacity-90 flex items-center justify-between ty-body font-semibold text-[var(--color-promo-text)] transition cursor-pointer mb-2"
              >
                <span className="flex items-center gap-3.5">
                  <ShoppingBag className="w-5 h-5" />
                  <span>
                    {language === "th" ? "กระเป๋าคูปอง" : "Coupon Bag"}
                  </span>
                </span>
                <span className="rounded-full bg-[var(--color-promo)] text-[var(--color-on-promo)] px-2.5 py-0.5 ty-caption font-bold">
                  {savedCouponsCount}
                </span>
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
                  {language === "th" ? "คู่มือท่องเที่ยวสะปัน" : "Sapan Guide"}
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
          4. MOBILE & TABLET DOCKED BOTTOM NAVIGATION BAR (< lg)
             - Flush against bottom edge (`bottom-0`, white card surface + safe-area)
             - 5 Balanced Tabs: 1) Home, 2) Book, 3) [✨ AI Agent], 4) Shorts, 5) Deals
      ====================================================================== */}
      <nav
        aria-label="Mobile bottom navigation"
        className={`${
          normalizedActiveTab === "chat" ? "hidden" : "lg:hidden"
        } fixed inset-x-0 bottom-0 z-40 bg-[var(--color-background-card)] border-t border-[var(--color-border)] pb-[env(safe-area-inset-bottom)] select-none`}
      >
        <div className="max-w-[540px] mx-auto px-1 h-[58px] grid grid-cols-5 items-stretch">
          {HOTEL_NAV_TABS.map((tab) => {
            const effectiveActiveTab: HotelNavTabId = isChatOpen
              ? "chat"
              : normalizedActiveTab;
            const isTabActive =
              effectiveActiveTab === tab.id && !isMobileProfileDrawerOpen;

            // Center Slot (#3): Prominent Elevated AI Agent Button
            if (tab.id === "chat") {
              return (
                <button
                  key={tab.id}
                  type="button"
                  aria-label={
                    language === "th"
                      ? "พูดคุยกับ AI Agent"
                      : "Chat with AI Agent"
                  }
                  title={
                    language === "th"
                      ? "พูดคุยกับ AI Agent"
                      : "Chat with AI Agent"
                  }
                  onClick={() => {
                    setIsMobileProfileDrawerOpen(false);
                    onSelectTab("chat");
                  }}
                  className="relative flex flex-col items-center justify-end pb-1.5 cursor-pointer group/aiagent"
                >
                  <span
                    className={`relative -mt-5 mb-0.5 h-12 w-12 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-on-accent)] ring-4 ring-[var(--color-background-card)] shadow-[0_6px_18px_rgba(23,81,174,0.34)] flex items-center justify-center transition-transform duration-150 group-active/aiagent:scale-95 ${
                      isChatOpen ? "scale-105" : ""
                    }`}
                  >
                    <Bot className="w-[22px] h-[22px] stroke-[2.1]" />
                    <Sparkles className="w-3 h-3 absolute top-2 right-1.5 fill-current" />
                    <span
                      aria-hidden="true"
                      className="absolute top-0 right-0 h-3 w-3 rounded-full bg-[var(--color-success)] ring-2 ring-[var(--color-background-card)]"
                    />
                  </span>
                  <span className="ty-caption leading-none font-bold text-[var(--color-accent)] whitespace-nowrap">
                    {language === "th" ? tab.labelTh : tab.labelEn}
                  </span>
                </button>
              );
            }

            // Standard Docked Tabs (Home, Book, Shorts, Deals)
            return (
              <button
                key={tab.id}
                type="button"
                aria-label={tab.labelEn}
                title={language === "th" ? tab.labelTh : tab.labelEn}
                onClick={() => {
                  setIsMobileProfileDrawerOpen(false);
                  onSelectTab(tab.id);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={`relative flex flex-col items-center justify-end pb-1.5 gap-1 transition-colors cursor-pointer ${
                  isTabActive
                    ? "text-[var(--color-accent)]"
                    : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                <span className="relative flex items-center justify-center h-6">
                  <HotelNavTabIcon
                    id={tab.id}
                    isActive={isTabActive}
                    cutoutColor="var(--color-background-card)"
                    className="w-[21px] h-[21px]"
                  />
                  {tab.id === "book" && freeRoomCount > 0 && (
                    <span className="absolute -top-1 -right-2.5 h-4 min-w-[16px] px-1 rounded-full bg-[var(--color-accent)] text-[var(--color-on-accent)] ty-caption font-bold inline-flex items-center justify-center leading-none">
                      {freeRoomCount}
                    </span>
                  )}
                </span>

                <span
                  className={`ty-caption leading-none whitespace-nowrap ${
                    isTabActive
                      ? "font-bold text-[var(--color-accent)]"
                      : "font-medium"
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
