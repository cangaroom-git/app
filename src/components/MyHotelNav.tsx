"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Sun, Moon, Compass, Star } from "lucide-react";
import { WhiteLabelPropertyConfig } from "@/data/rooms";

export type HotelNavTabId =
  | "book"
  | "home"
  | "room"
  | "shorts"
  | "chat"
  | "deal"
  | "review"
  | "guide"
  | "setting";
export type MyHotelTabId = HotelNavTabId;

export const HOTEL_NAV_TABS: ReadonlyArray<{
  id: "book" | "shorts" | "chat" | "deal";
  href: string;
  label: string;
  labelTh: string;
}> = [
  { id: "book", href: "/", label: "Book", labelTh: "จองห้องพัก" },
  { id: "shorts", href: "/shorts", label: "Short Video", labelTh: "วิดีโอสั้น" },
  { id: "chat", href: "/chat", label: "Chat", labelTh: "AI แชท" },
  { id: "deal", href: "/deal", label: "Deals", labelTh: "โปรโมชั่น" },
];

export function getTabIdFromPathname(pathname: string): HotelNavTabId {
  if (pathname.startsWith("/shorts")) return "shorts";
  if (pathname.startsWith("/chat")) return "chat";
  if (pathname.startsWith("/deal")) return "deal";
  if (pathname.startsWith("/review")) return "review";
  if (pathname.startsWith("/guide")) return "guide";
  if (pathname.startsWith("/setting")) return "setting";
  return "book";
}

/**
 * Solar-style minimalist icons (Instagram / Fastwork style)
 * Solid filled when active, clean stroke outline when inactive
 */
export function HotelNavTabIcon({
  id,
  active,
  cutoutColor = "var(--color-background-card)",
  className = "w-[22px] h-[22px]",
}: {
  id: HotelNavTabId;
  active: boolean;
  cutoutColor?: string;
  className?: string;
}) {
  switch (id) {
    case "book":
    case "home":
    case "room":
      return active ? (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <rect
            x="2.5"
            y="4"
            width="19"
            height="17.5"
            rx="4"
            fill="currentColor"
          />
          <path
            d="M8 2.5v3M16 2.5v3"
            stroke="currentColor"
            strokeWidth={2.2}
            strokeLinecap="round"
          />
          <rect
            x="5.5"
            y="10"
            width="13"
            height="8.5"
            rx="2"
            fill={cutoutColor}
          />
        </svg>
      ) : (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.9}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          aria-hidden="true"
        >
          <rect x="3" y="4.5" width="18" height="16.5" rx="3.5" />
          <path d="M8 2.8v3.2M16 2.8v3.2M3 9.5h18" />
          <path d="M8.5 14h3M8.5 17h6" />
        </svg>
      );

    case "shorts":
      return active ? (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <rect
            x="3"
            y="3"
            width="18"
            height="18"
            rx="5"
            fill="currentColor"
          />
          <path d="M10 8.5v7l6-3.5-6-3.5Z" fill={cutoutColor} />
        </svg>
      ) : (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.9}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          aria-hidden="true"
        >
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <path d="M10 8.8v6.4l5.5-3.2-5.5-3.2Z" fill="currentColor" />
        </svg>
      );

    case "chat":
      return active ? (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path
            d="M12 3C6.8 3 2.7 6.6 2.7 11.2c0 2.3 1 4.4 2.7 5.9-.2 1.2-.8 2.4-1.5 3.1-.3.3-.1.8.4.8 1.8 0 3.5-.6 4.7-1.3.9.2 1.9.4 3 .4 5.2 0 9.3-3.6 9.3-8.2S17.2 3 12 3Z"
            fill="currentColor"
          />
          <circle cx="8.8" cy="11.4" r="1.25" fill={cutoutColor} />
          <circle cx="12" cy="11.4" r="1.25" fill={cutoutColor} />
          <circle cx="15.2" cy="11.4" r="1.25" fill={cutoutColor} />
        </svg>
      ) : (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.9}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          aria-hidden="true"
        >
          <path d="M12 3.2c-5 0-9 3.5-9 7.9 0 2.2 1 4.2 2.6 5.6-.2 1.1-.7 2.2-1.4 2.9-.3.3-.1.8.4.8 1.7 0 3.3-.5 4.5-1.2.9.2 1.9.3 2.9.3 5 0 9-3.5 9-7.9S17 3.2 12 3.2Z" />
          <circle cx="8.8" cy="11.2" r="1" fill="currentColor" />
          <circle cx="12" cy="11.2" r="1" fill="currentColor" />
          <circle cx="15.2" cy="11.2" r="1" fill="currentColor" />
        </svg>
      );

    case "deal":
      return active ? (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path
            d="M3.5 11.2V5.5a2 2 0 0 1 2-2h5.7a2 2 0 0 1 1.41.59l7.3 7.3a2 2 0 0 1 0 2.82l-5.7 5.7a2 2 0 0 1-2.82 0l-7.3-7.3a2 2 0 0 1-.59-1.41Z"
            fill="currentColor"
          />
          <circle cx="8.5" cy="8.5" r="1.6" fill={cutoutColor} />
        </svg>
      ) : (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.9}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          aria-hidden="true"
        >
          <path d="M3.5 11.2V5.5a2 2 0 0 1 2-2h5.7a2 2 0 0 1 1.41.59l7.3 7.3a2 2 0 0 1 0 2.82l-5.7 5.7a2 2 0 0 1-2.82 0l-7.3-7.3a2 2 0 0 1-.59-1.41Z" />
          <circle cx="8.5" cy="8.5" r="1.3" fill="currentColor" />
        </svg>
      );

    case "review":
      return <Star className={className} />;

    case "guide":
      return <Compass className={className} />;

    case "setting":
      return active ? (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <circle cx="12" cy="12" r="9.2" fill="currentColor" />
          <circle cx="12" cy="12" r="3" fill={cutoutColor} />
        </svg>
      ) : (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.9}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.6.77 1.02 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
        </svg>
      );
  }
}

export interface MyHotelNavProps {
  activeTab: HotelNavTabId;
  onSelectTab: (tab: HotelNavTabId) => void;
  propertyConfig?: WhiteLabelPropertyConfig;
  lang: "th" | "en";
  setLang?: (lang: "th" | "en") => void;
  theme?: "light" | "dark";
  onToggleTheme?: () => void;
  propertyNameTh?: string;
  propertyNameEn?: string;
  brandCode?: string;
  availableUnitsCount?: number;
  availableRoomCount?: number;
  pendingAdminCount?: number;
}

export function MyHotelNav({
  activeTab,
  onSelectTab,
  propertyConfig,
  lang,
  setLang,
  theme = "light",
  onToggleTheme,
  propertyNameTh,
  propertyNameEn,
  brandCode,
  availableUnitsCount,
  availableRoomCount,
  pendingAdminCount = 0,
}: MyHotelNavProps) {
  const [bottomNavHidden, setBottomNavHidden] = useState(false);
  const [bottomNavRendered, setBottomNavRendered] = useState(true);
  const [menuDrawerOpen, setMenuDrawerOpen] = useState(false);

  const brandCodeDisplay = propertyConfig?.brandCode ?? brandCode ?? "SU";
  const nameThDisplay =
    propertyConfig?.nameTh ?? propertyNameTh ?? "สะปัน อันซีน น่าน";
  const nameEnDisplay =
    propertyConfig?.nameEn ?? propertyNameEn ?? "SAPAN UNSEEN NAN";
  const roomCount = availableRoomCount ?? availableUnitsCount ?? 0;

  const handleToggleLang = () => {
    if (setLang) {
      setLang(lang === "th" ? "en" : "th");
    }
  };

  useEffect(() => {
    let lastScrollY = window.scrollY;
    let ticking = false;
    let upScrollAccumulation = 0;

    const updateVisibility = () => {
      const currentY = window.scrollY;
      const maxScrollY =
        document.documentElement.scrollHeight - window.innerHeight;

      // Ignore iOS Safari rubber-band overscroll at top or bottom
      if (currentY < 0 || (maxScrollY > 0 && currentY > maxScrollY)) {
        ticking = false;
        return;
      }

      const diff = currentY - lastScrollY;
      const downThreshold = 10;
      const upAccumulationTarget = 60;

      if (currentY < 60) {
        setBottomNavHidden(false);
        upScrollAccumulation = 0;
      } else if (diff > 0) {
        upScrollAccumulation = 0;
        if (diff > downThreshold) {
          setBottomNavHidden(true);
        }
      } else if (diff < 0) {
        upScrollAccumulation += Math.abs(diff);
        if (upScrollAccumulation > upAccumulationTarget) {
          setBottomNavHidden(false);
        }
      }

      lastScrollY = currentY;
      ticking = false;
    };

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateVisibility);
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!bottomNavHidden) {
      setBottomNavRendered(true);
    } else {
      const timer = setTimeout(() => setBottomNavRendered(false), 300);
      return () => clearTimeout(timer);
    }
  }, [bottomNavHidden]);

  const isDark = theme === "dark";
  const normalizedActiveTab =
    activeTab === "home" || activeTab === "room" ? "book" : activeTab;
  const isMoreSectionActive =
    normalizedActiveTab === "setting" ||
    normalizedActiveTab === "guide" ||
    normalizedActiveTab === "review" ||
    menuDrawerOpen;

  return (
    <>
      {/* =====================================================================
          1. DESKTOP LEFT SIDEBAR (>= lg, Instagram Desktop Rail Style)
             - Pure White background (#ffffff in Light mode)
             - Collapsed width: 72px (shows prominent icons only)
             - Hover width: 244px (smoothly reveals text labels & badges)
             - Bottom-left: Theme Toggle + More (Hamburger Menu) trigger
      ====================================================================== */}
      <aside
        aria-label="Primary sidebar navigation"
        className="hidden lg:flex fixed inset-y-0 left-0 z-40 flex-col justify-between bg-[var(--color-sidebar-bg,var(--color-background-body))] w-[72px] hover:w-[244px] transition-[width,box-shadow] duration-250 ease-out group/sidebar overflow-hidden py-4 px-3"
      >
        {/* Top: Brand Mark */}
        <div>
          <button
            type="button"
            onClick={() => {
              onSelectTab("book");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="w-full h-12 rounded-[14px] flex items-center gap-3.5 px-1.5 text-left hover:bg-[var(--color-overlay-hover)] transition cursor-pointer"
          >
            <div className="h-9 w-9 rounded-[12px] bg-[var(--color-accent)] text-[var(--color-on-accent)] flex items-center justify-center font-bold text-[12px] shrink-0">
              {brandCodeDisplay.slice(0, 2)}
            </div>
            <div className="min-w-0 opacity-0 group-hover/sidebar:opacity-100 translate-x-1 group-hover/sidebar:translate-x-0 transition-all duration-200 whitespace-nowrap">
              <span className="block font-semibold text-[14px] text-[var(--color-text-primary)] tracking-tight truncate max-w-[155px]">
                {lang === "th" ? nameThDisplay : nameEnDisplay}
              </span>
              <span className="block text-[12px] text-[var(--color-text-secondary)]">
                @my-hotel
              </span>
            </div>
          </button>
        </div>

        {/* Center: Navigation Tabs (On Desktop Left Sidebar, hide 'chat' because Desktop uses Bottom-Right Chat Bubble) */}
        <nav aria-label="Primary navigation" className="flex flex-col gap-2.5">
          {HOTEL_NAV_TABS.filter((tab) => tab.id !== "chat").map((tab) => {
            const isActive = normalizedActiveTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  onSelectTab(tab.id);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={`relative w-full h-12 rounded-[14px] flex items-center gap-4 px-3 text-[14px] transition-colors cursor-pointer group/navitem text-[var(--color-text-primary)] ${
                  isActive
                    ? "font-bold"
                    : "hover:bg-[var(--color-overlay-hover)] font-normal"
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="my-hotel-desktop-tab-pill"
                    className="absolute inset-0 rounded-[14px] bg-[var(--color-background-card)]"
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
                    active={isActive}
                    cutoutColor="var(--color-background-card)"
                    className="w-[30px] h-[30px] shrink-0"
                  />
                  {tab.id === "chat" && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-[var(--color-background-body)]" />
                  )}
                </span>

                <span className="relative z-10 flex-1 flex items-center justify-between min-w-0 opacity-0 group-hover/sidebar:opacity-100 translate-x-1 group-hover/sidebar:translate-x-0 transition-all duration-200 whitespace-nowrap">
                  <span>{lang === "th" ? tab.labelTh : tab.label}</span>

                  {tab.id === "book" && roomCount > 0 && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[12px] font-semibold ${
                        isActive
                          ? "bg-[var(--color-accent)] text-[var(--color-on-accent)]"
                          : "bg-[var(--color-background-card)] text-[var(--color-text-secondary)]"
                      }`}
                    >
                      {roomCount}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Bottom-Left: More (Hamburger Menu) Trigger */}
        <div className="pt-2 border-t border-[var(--color-border)] space-y-1">
          <button
            type="button"
            onClick={() => setMenuDrawerOpen((prev) => !prev)}
            className={`relative w-full h-11 rounded-[14px] flex items-center gap-4 px-3 text-[14px] text-[var(--color-text-primary)] hover:bg-[var(--color-overlay-hover)] transition-colors cursor-pointer group/menu ${
              isMoreSectionActive
                ? "bg-[var(--color-background-card)] shadow-xs font-bold"
                : ""
            }`}
          >
            <span className="relative flex items-center justify-center w-6 h-6 shrink-0 transition-transform duration-200 group-hover/menu:scale-105">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                className="w-[22px] h-[22px]"
              >
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              {pendingAdminCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[var(--color-accent)] ring-2 ring-[var(--color-background-body)]" />
              )}
            </span>
            <span className="flex-1 flex items-center justify-between opacity-0 group-hover/sidebar:opacity-100 translate-x-1 group-hover/sidebar:translate-x-0 transition-all duration-200 whitespace-nowrap font-medium">
              <span>{lang === "th" ? "เมนูเพิ่มเติม" : "More"}</span>
              <span className="text-[12px] font-semibold text-[var(--color-text-secondary)] uppercase">
                {lang}
              </span>
            </span>
          </button>
        </div>
      </aside>

      {/* =====================================================================
          2. "MORE" HAMBURGER MENU DRAWER
             - Desktop (>= lg): Slides from LEFT next to the Left Sidebar (lg:left-[72px])
             - Mobile & Tablet (< lg): Slides from RIGHT
             - Menu items:
               - Guide (/guide)
               - Setting (/setting)
               ------------
               - Mode
               - Language
               - Admin (/admin)
      ====================================================================== */}
      <div
        className={`fixed inset-0 z-50 overflow-hidden transition-opacity duration-300 ${
          menuDrawerOpen
            ? "opacity-100 visible pointer-events-auto"
            : "opacity-0 invisible pointer-events-none"
        }`}
      >
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
          onClick={() => setMenuDrawerOpen(false)}
        />

        <aside
          aria-label="More menu drawer"
          className={`fixed inset-y-0 right-0 lg:left-[0px] lg:right-auto w-[84vw] max-w-[300px] bg-[var(--color-sidebar-bg,var(--color-background-body))] rounded-l-[24px] lg:rounded-l-none lg:rounded-r-[24px] shadow-2xl border-l lg:border-l-0 lg:border-r border-[var(--color-border)] p-5 flex flex-col justify-between transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
            menuDrawerOpen
              ? "translate-x-0 lg:translate-x-0"
              : "translate-x-full lg:-translate-x-full"
          }`}
        >
          <div className="space-y-4 overflow-y-auto no-scrollbar">
            {/* Top Header Row: More + Close X */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-8 w-8 rounded-[10px] bg-[var(--color-accent)] text-[var(--color-on-accent)] flex items-center justify-center font-bold text-[12px] shrink-0">
                  {brandCodeDisplay.slice(0, 2)}
                </div>
                <span className="ty-title truncate">
                  {lang === "th" ? "เมนูเพิ่มเติม" : "More"}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setMenuDrawerOpen(false)}
                aria-label="Close menu"
                className="h-8 w-8 rounded-full hover:bg-[var(--color-overlay-hover)] flex items-center justify-center text-[var(--color-text-primary)] transition cursor-pointer shrink-0"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  className="w-5 h-5"
                >
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            {/* Section 1: Review, Guide & Setting */}
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => {
                  onSelectTab("review");
                  setMenuDrawerOpen(false);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={`w-full h-11 px-3 rounded-[12px] flex items-center justify-between text-[14px] font-semibold transition cursor-pointer ${
                  normalizedActiveTab === "review"
                    ? "bg-[var(--color-background-card)] shadow-xs text-[var(--color-text-primary)]"
                    : "hover:bg-[var(--color-overlay-hover)] text-[var(--color-text-primary)]"
                }`}
              >
                <span className="flex items-center gap-3.5">
                  <HotelNavTabIcon
                    id="review"
                    active={normalizedActiveTab === "review"}
                    className="w-5 h-5"
                  />
                  <span>{lang === "th" ? "รีวิวผู้เข้าพัก" : "Review"}</span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onSelectTab("guide");
                  setMenuDrawerOpen(false);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={`w-full h-11 px-3 rounded-[12px] flex items-center justify-between text-[14px] font-semibold transition cursor-pointer ${
                  normalizedActiveTab === "guide"
                    ? "bg-[var(--color-background-card)] shadow-xs text-[var(--color-text-primary)]"
                    : "hover:bg-[var(--color-overlay-hover)] text-[var(--color-text-primary)]"
                }`}
              >
                <span className="flex items-center gap-3.5">
                  <HotelNavTabIcon
                    id="guide"
                    active={normalizedActiveTab === "guide"}
                    className="w-5 h-5"
                  />
                  <span>{lang === "th" ? "คู่มือท่องเที่ยว" : "Guide"}</span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onSelectTab("setting");
                  setMenuDrawerOpen(false);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={`w-full h-11 px-3 rounded-[12px] flex items-center justify-between text-[14px] font-semibold transition cursor-pointer ${
                  normalizedActiveTab === "setting"
                    ? "bg-[var(--color-background-card)] shadow-xs text-[var(--color-text-primary)]"
                    : "hover:bg-[var(--color-overlay-hover)] text-[var(--color-text-primary)]"
                }`}
              >
                <span className="flex items-center gap-3.5">
                  <HotelNavTabIcon
                    id="setting"
                    active={normalizedActiveTab === "setting"}
                    className="w-5 h-5"
                  />
                  <span>{lang === "th" ? "ตั้งค่า & การจอง" : "Setting"}</span>
                </span>
              </button>
            </div>

            <div className="border-t border-[var(--color-border)]" />

            {/* Section 2: Mode, Language, Admin */}
            <div className="space-y-1">
              {onToggleTheme && (
                <button
                  type="button"
                  onClick={onToggleTheme}
                  className="w-full h-11 px-3 rounded-[12px] hover:bg-[var(--color-overlay-hover)] flex items-center justify-between text-[14px] font-medium text-[var(--color-text-primary)] transition cursor-pointer"
                >
                  <span className="flex items-center gap-3.5">
                    {isDark ? (
                      <Sun className="w-5 h-5" />
                    ) : (
                      <Moon className="w-5 h-5" />
                    )}
                    <span>
                      {lang === "th" ? "Appearance" : "Appearance"}
                    </span>
                  </span>
                  <span className="rounded-full bg-[var(--color-background-card)] shadow-xs px-2.5 py-0.5 text-[12px] font-semibold text-[var(--color-text-primary)]">
                    {lang === "th"
                      ? isDark
                        ? "มืด (Dark)"
                        : "สว่าง (Light)"
                      : isDark
                      ? "Dark"
                      : "Light"}
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={handleToggleLang}
                className="w-full h-11 px-3 rounded-[12px] hover:bg-[var(--color-overlay-hover)] flex items-center justify-between text-[14px] font-medium text-[var(--color-text-primary)] transition cursor-pointer"
              >
                <span className="flex items-center gap-3.5">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-5 h-5"
                  >
                    <circle cx="12" cy="12" r="9" />
                    <path d="M3.6 9h16.8M3.6 15h16.8" />
                    <path d="M11.5 3a17 17 0 0 0 0 18M12.5 3a17 17 0 0 1 0 18" />
                  </svg>
                  <span>{lang === "th" ? "Language" : "Language"}</span>
                </span>
                <span className="rounded-full bg-[var(--color-background-card)] shadow-xs px-2.5 py-0.5 text-[12px] font-semibold text-[var(--color-text-primary)] uppercase">
                  {lang === "th" ? "ไทย (TH)" : "English (EN)"}
                </span>
              </button>

              <Link
                href="/admin"
                onClick={() => setMenuDrawerOpen(false)}
                className="w-full h-11 px-3 rounded-[12px] hover:bg-[var(--color-overlay-hover)] flex items-center justify-between text-[14px] font-medium text-[var(--color-text-primary)] transition"
              >
                <span className="flex items-center gap-3.5">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-5 h-5"
                  >
                    <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3Z" />
                    <path d="M9 12l2 2 4-4" />
                  </svg>
                  <span>
                    {lang === "th" ? "Admin" : "Admin"}
                  </span>
                </span>
                {pendingAdminCount > 0 ? (
                  <span className="rounded-full bg-[var(--color-accent)] text-[var(--color-on-accent)] px-2 py-0.5 text-[12px] font-semibold">
                    {pendingAdminCount}
                  </span>
                ) : (
                  <span className="ty-caption">→</span>
                )}
              </Link>
            </div>
          </div>

          {/* Bottom Direct Booking Guarantee Pill */}
          <div className="pt-4 border-t border-[var(--color-border)] flex items-center justify-between ty-caption">
            <span>
              {lang === "th" ? "ระบบจองตรงที่พัก" : "Direct Booking App"}
            </span>
            <span className="font-semibold text-[var(--color-text-primary)]">
              {lang === "th" ? "การันตีราคาดีที่สุด 100%" : "100% Best Rate"}
            </span>
          </div>
        </aside>
      </div>

      {/* =====================================================================
          3. MOBILE & TABLET FLOATING BOTTOM NAVIGATION BAR (< lg)
             - Icon-only (no text labels!)
             - 1) Book, 2) Short Video, 3) Chat, 4) Deals, 5) More (Hamburger Menu)
             - Hidden when in AI Chat mode (/chat); reappears when exiting chat
      ====================================================================== */}
      <nav
        aria-label="Mobile bottom navigation"
        className={`${
          normalizedActiveTab === "chat"
            ? "hidden"
            : !bottomNavRendered && bottomNavHidden
            ? "hidden"
            : "lg:hidden"
        } fixed bottom-3 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-[360px] transition-all duration-300 ease-in-out ${
          bottomNavHidden
            ? "translate-y-2 opacity-0 scale-95 pointer-events-none"
            : "translate-y-0 opacity-100 scale-100 pointer-events-auto"
        }`}
      >
        <div
          className="rounded-full p-1.5 flex items-center justify-between gap-1"
          style={{
            background: isDark
              ? "linear-gradient(135deg, rgba(28, 28, 28, 0.78) 0%, rgba(16, 16, 16, 0.58) 100%)"
              : "linear-gradient(135deg, rgba(255, 255, 255, 0.78) 0%, rgba(255, 255, 255, 0.52) 100%)",
            backdropFilter: "blur(28px) saturate(200%)",
            WebkitBackdropFilter: "blur(28px) saturate(200%)",
            boxShadow: isDark
              ? "0 12px 36px -6px rgba(0, 0, 0, 0.45), inset 0 1px 1.5px rgba(255, 255, 255, 0.14)"
              : "0 12px 36px -6px rgba(15, 23, 42, 0.14), 0 4px 12px -2px rgba(15, 23, 42, 0.06), inset 0 1px 1.5px rgba(255, 255, 255, 0.92), inset 0 -1px 1px rgba(255, 255, 255, 0.45)",
            border: isDark
              ? "1px solid rgba(255, 255, 255, 0.14)"
              : "1px solid rgba(255, 255, 255, 0.72)",
          }}
        >
          {/* 4 Main Tabs: 1) Book, 2) Short Video, 3) Chat, 4) Deals */}
          {HOTEL_NAV_TABS.map((tab) => {
            const isActive = normalizedActiveTab === tab.id && !menuDrawerOpen;
            return (
              <button
                key={tab.id}
                type="button"
                aria-label={tab.label}
                title={lang === "th" ? tab.labelTh : tab.label}
                onClick={() => {
                  setMenuDrawerOpen(false);
                  onSelectTab(tab.id);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={`relative flex-1 h-11 rounded-full flex items-center justify-center transition-colors duration-200 cursor-pointer text-[var(--color-text-primary)] ${
                  isActive ? "font-bold" : "opacity-75 hover:opacity-100"
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="my-hotel-mobile-tab-pill"
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: isDark
                        ? "linear-gradient(180deg, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0.08) 100%)"
                        : "linear-gradient(180deg, rgba(255, 255, 255, 0.92) 0%, rgba(255, 255, 255, 0.68) 100%)",
                      boxShadow: isDark
                        ? "0 2px 10px rgba(0, 0, 0, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.2)"
                        : "0 2px 10px rgba(0, 0, 0, 0.07), inset 0 1px 1px rgba(255, 255, 255, 0.95)",
                      border: isDark
                        ? "1px solid rgba(255, 255, 255, 0.16)"
                        : "1px solid rgba(255, 255, 255, 0.85)",
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
                    active={isActive}
                    cutoutColor={isDark ? "#1f1f1f" : "#ffffff"}
                    className="w-[22px] h-[22px]"
                  />
                  {tab.id === "book" && roomCount > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 rounded-full bg-[var(--color-accent)] text-[var(--color-on-accent)] text-[10px] font-bold px-1.5 leading-tight">
                      {roomCount}
                    </span>
                  )}
                </div>
              </button>
            );
          })}

          {/* 5) More (Hamburger Menu Trigger — Guide, Setting, Mode, Language, Admin) */}
          <button
            type="button"
            aria-label="More menu"
            title={lang === "th" ? "เมนูเพิ่มเติม (More)" : "More"}
            onClick={() => setMenuDrawerOpen((prev) => !prev)}
            className={`relative flex-1 h-11 rounded-full flex items-center justify-center transition-colors duration-200 cursor-pointer text-[var(--color-text-primary)] ${
              isMoreSectionActive ? "font-bold" : "opacity-75 hover:opacity-100"
            }`}
          >
            {isMoreSectionActive && (
              <motion.span
                layoutId="my-hotel-mobile-tab-pill"
                className="absolute inset-0 rounded-full"
                style={{
                  background: isDark
                    ? "linear-gradient(180deg, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0.08) 100%)"
                    : "linear-gradient(180deg, rgba(255, 255, 255, 0.92) 0%, rgba(255, 255, 255, 0.68) 100%)",
                  boxShadow: isDark
                    ? "0 2px 10px rgba(0, 0, 0, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.2)"
                    : "0 2px 10px rgba(0, 0, 0, 0.07), inset 0 1px 1px rgba(255, 255, 255, 0.95)",
                  border: isDark
                    ? "1px solid rgba(255, 255, 255, 0.16)"
                    : "1px solid rgba(255, 255, 255, 0.85)",
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
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                className="w-[22px] h-[22px]"
              >
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
              {pendingAdminCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[var(--color-accent)]" />
              )}
            </div>
          </button>
        </div>
      </nav>
    </>
  );
}
