"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Calendar, SlidersHorizontal, Sparkles } from "lucide-react";

export type MyHotelTabId = "home" | "book" | "ai-chat" | "deals" | "more";

interface HotelNavTabIconProps {
  name: MyHotelTabId;
  active: boolean;
  className?: string;
}

/**
 * Custom SVG Tab Icons inspired by WeGlobal (/Users/light/my-shop/src/components/ui/NavTabIcon.tsx)
 * - Active state: Solid filled shape with crisp white cutouts
 * - Inactive state: Clean 2px outline stroke
 */
export function HotelNavTabIcon({
  name,
  active,
  className = "w-5 h-5",
}: HotelNavTabIconProps) {
  switch (name) {
    case "home":
      return active ? (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <path
            d="M3 10.25L12 3l9 7.25V20a1.75 1.75 0 0 1-1.75 1.75H4.75A1.75 1.75 0 0 1 3 20v-9.75Z"
            fill="currentColor"
          />
          <path
            d="M9.5 21.75V14.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v7.25"
            fill="#ffffff"
          />
        </svg>
      ) : (
        <svg
          viewBox="0 0 24 24"
          className={className}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 10.25L12 3l9 7.25V20a1.75 1.75 0 0 1-1.75 1.75H4.75A1.75 1.75 0 0 1 3 20v-9.75Z" />
          <path d="M9.5 21.75V14.25h5v7.5" />
        </svg>
      );

    case "book":
      return active ? (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <rect
            x="2.5"
            y="5"
            width="19"
            height="15.5"
            rx="2.5"
            fill="currentColor"
          />
          <path
            d="M7.5 3v3.5M16.5 3v3.5"
            stroke="currentColor"
            strokeWidth={2.2}
            strokeLinecap="round"
          />
          <rect x="5.5" y="10" width="13" height="2" rx="1" fill="#ffffff" />
          <rect x="5.5" y="14" width="8" height="2" rx="1" fill="#ffffff" />
        </svg>
      ) : (
        <svg
          viewBox="0 0 24 24"
          className={className}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="5" width="18" height="16" rx="2.5" />
          <path d="M16 3v4M8 3v4M3 10h18" />
          <path d="M8 14h3M8 17h6" />
        </svg>
      );

    case "ai-chat":
      return active ? (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <path
            d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8.5a2.5 2.5 0 0 1-2.5 2.5H10l-4.2 3.4c-.65.52-1.8.06-1.8-.78V5.5Z"
            fill="currentColor"
          />
          {/* Sparkle star cutout inside chat bubble */}
          <path
            d="M12 6.2l1.05 2.45L15.5 9.7l-2.45 1.05L12 13.2l-1.05-2.45L8.5 9.7l2.45-1.05L12 6.2Z"
            fill="#ffffff"
          />
        </svg>
      ) : (
        <svg
          viewBox="0 0 24 24"
          className={className}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8.5a2.5 2.5 0 0 1-2.5 2.5H10l-4.2 3.4c-.65.52-1.8.06-1.8-.78V5.5Z" />
          <path d="M12 6.8l.85 1.9 1.9.85-1.9.85-.85 1.9-.85-1.9-1.9-.85 1.9-.85.85-1.9Z" />
        </svg>
      );

    case "deals":
      return active ? (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <path
            d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82Z"
            fill="currentColor"
          />
          <circle cx="7.5" cy="7.5" r="1.8" fill="#ffffff" />
          <path
            d="M10.5 14.5l4-4"
            stroke="#ffffff"
            strokeWidth={2}
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <svg
          viewBox="0 0 24 24"
          className={className}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82Z" />
          <circle cx="7.5" cy="7.5" r="1.25" fill="currentColor" />
        </svg>
      );

    case "more":
      return active ? (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor">
          <rect x="3" y="3" width="7.5" height="7.5" rx="2" />
          <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" />
          <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" />
          <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" />
        </svg>
      ) : (
        <svg
          viewBox="0 0 24 24"
          className={className}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3.5" y="3.5" width="7" height="7" rx="1.75" />
          <rect x="13.5" y="3.5" width="7" height="7" rx="1.75" />
          <rect x="3.5" y="13.5" width="7" height="7" rx="1.75" />
          <rect x="13.5" y="13.5" width="7" height="7" rx="1.75" />
        </svg>
      );
  }
}

interface MyHotelNavProps {
  activeTab: MyHotelTabId;
  onSelectTab: (tab: MyHotelTabId) => void;
  lang: "th" | "en";
  setLang: (lang: "th" | "en") => void;
  propertyNameTh: string;
  propertyNameEn: string;
  brandCode: string;
  availableUnitsCount: number;
  activeDealsCount: number;
  pendingAdminCount: number;
  dateRangeSummary: string;
  nights: number;
  onOpenOwnerStudio?: () => void;
}

export function MyHotelNav({
  activeTab,
  onSelectTab,
  lang,
  setLang,
  propertyNameTh,
  propertyNameEn,
  brandCode,
  availableUnitsCount,
  activeDealsCount,
  pendingAdminCount,
  dateRangeSummary,
  nights,
  onOpenOwnerStudio,
}: MyHotelNavProps) {
  // Scroll-direction hide/show for Mobile Floating Bottom Bar (identical to WeGlobal MobileBottomMenu.tsx)
  const [mobileBarVisible, setMobileBarVisible] = useState(true);
  const lastScrollY = useRef(0);
  const upScrollAccumulator = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = Math.max(0, window.scrollY);
      const delta = currentY - lastScrollY.current;

      if (currentY <= 40) {
        setMobileBarVisible(true);
        upScrollAccumulator.current = 0;
      } else if (delta > 10) {
        setMobileBarVisible(false);
        upScrollAccumulator.current = 0;
      } else if (delta < 0) {
        upScrollAccumulator.current += Math.abs(delta);
        if (upScrollAccumulator.current >= 60) {
          setMobileBarVisible(true);
        }
      }

      lastScrollY.current = currentY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navItems: Array<{
    id: MyHotelTabId;
    label: string;
    subLabelTh: string;
    badge?: number | string;
  }> = [
    {
      id: "home",
      label: "Home",
      subLabelTh: "เรื่องราวที่พัก",
    },
    {
      id: "book",
      label: "Book",
      subLabelTh: "จองห้องพัก",
      badge: availableUnitsCount > 0 ? availableUnitsCount : undefined,
    },
    {
      id: "ai-chat",
      label: "AI Chat",
      subLabelTh: "จองผ่าน AI",
      badge: "AI",
    },
    {
      id: "deals",
      label: "Deals",
      subLabelTh: "โปรโมชั่น",
      badge: activeDealsCount > 0 ? activeDealsCount : undefined,
    },
    {
      id: "more",
      label: "More",
      subLabelTh: "เพิ่มเติม/จัดการ",
    },
  ];

  return (
    <>
      {/* =====================================================================
          DESKTOP & TABLET TOP BAR (md: and up) + SLIM MOBILE TOP HEADER
          Modeled directly after WeGlobal's Nav.tsx + Fastwork #0063F5 palette
      ====================================================================== */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
        <div className="max-w-7xl mx-auto px-3 sm:px-6">
          <div className="relative flex items-center justify-between gap-2 h-14">
            {/* LEFT: my-hotel SaaS Brand + Property Identity */}
            <div className="flex items-center gap-2.5 z-10 min-w-0">
              <button
                type="button"
                onClick={() => onSelectTab("home")}
                className="flex items-center gap-2.5 text-left group cursor-pointer min-w-0"
              >
                <div className="h-9 w-9 rounded-xl bg-[#0063F5] text-white flex items-center justify-center font-extrabold text-xs tracking-wider shadow-[0_4px_12px_rgba(0,99,245,0.28)] group-hover:bg-[#0052CC] transition shrink-0">
                  {brandCode.slice(0, 3) || "MH"}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-sm sm:text-base tracking-tight text-[#121317] truncate">
                      {lang === "th" ? propertyNameTh : propertyNameEn}
                    </span>
                    <span className="hidden xl:inline-flex items-center rounded-full bg-[#EFF6FF] border border-[#BFDBFE] px-2 py-0.5 text-[10px] font-bold text-[#0063F5]">
                      my-hotel
                    </span>
                  </div>
                  <p className="text-[11px] text-[#64748B] truncate hidden sm:block">
                    Official Direct Booking · {dateRangeSummary} ({nights} คืน)
                  </p>
                </div>
              </button>
            </div>

            {/* CENTER: 5 MENU TABS (Desktop & Tablet >= md) — Exact WeGlobal Dead-Center Pattern */}
            <nav
              aria-label="Primary Navigation"
              className="hidden md:flex absolute left-1/2 -translate-x-1/2 top-0 bottom-0 items-center justify-center h-full z-10"
            >
              {navItems.map((item) => {
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelectTab(item.id);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    title={`${item.label} (${item.subLabelTh})`}
                    className={`w-20 lg:w-24 xl:w-28 h-full flex items-center justify-center relative group transition-colors cursor-pointer ${
                      active
                        ? "text-[#0063F5]"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    <div
                      className={`w-full h-11 mx-1 rounded-xl flex items-center justify-center gap-1.5 px-2 transition-colors ${
                        active
                          ? "bg-[#EFF6FF]/80"
                          : "group-hover:bg-slate-100/90"
                      }`}
                    >
                      <div className="relative flex items-center justify-center shrink-0">
                        <HotelNavTabIcon
                          name={item.id}
                          active={active}
                          className="w-5 h-5 transition-transform duration-150 group-active:scale-95"
                        />
                        {item.badge !== undefined && (
                          <span
                            className={` -top-1.5 -right-2.5 absolute min-w-[16px] h-[16px] px-1 rounded-full text-[9px] font-extrabold flex items-center justify-center leading-none ring-2 ring-white ${
                              item.id === "ai-chat"
                                ? "bg-gradient-to-r from-[#0063F5] to-[#3B82F6] text-white"
                                : active
                                ? "bg-[#0063F5] text-white"
                                : "bg-slate-200 text-slate-700"
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-xs lg:text-[13px] tracking-tight whitespace-nowrap ${
                          active ? "font-bold text-[#0063F5]" : "font-semibold"
                        }`}
                      >
                        {item.label}
                      </span>
                    </div>

                    {active && (
                      <span className="absolute bottom-0 inset-x-2 h-[3px] rounded-t-md bg-[#0063F5]" />
                    )}
                  </button>
                );
              })}
            </nav>

            {/* RIGHT: Quick Actions (Date Pill on Mobile, Language Toggle, Hotel Owner Studio Button) */}
            <div className="flex items-center gap-1.5 sm:gap-2 z-10">
              {/* Mobile Quick Book Pill */}
              <button
                type="button"
                onClick={() => onSelectTab("book")}
                className="md:hidden inline-flex items-center gap-1.5 h-8 px-2.5 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] text-[#0063F5] text-[11px] font-bold cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate max-w-[110px]">
                  ว่าง {availableUnitsCount} ห้อง
                </span>
              </button>

              {/* Language Switcher */}
              <div className="hidden sm:inline-flex items-center rounded-full bg-slate-100 p-0.5 border border-slate-200/80 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setLang("th")}
                  className={`px-2 py-1 rounded-full transition cursor-pointer ${
                    lang === "th"
                      ? "bg-white text-[#0063F5] shadow-2xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  TH
                </button>
                <button
                  type="button"
                  onClick={() => setLang("en")}
                  className={`px-2 py-1 rounded-full transition cursor-pointer ${
                    lang === "en"
                      ? "bg-white text-[#0063F5] shadow-2xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  EN
                </button>
              </div>

              {/* Quick AI Concierge Trigger on Desktop */}
              <button
                type="button"
                onClick={() => onSelectTab("ai-chat")}
                className={`hidden lg:inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-xs font-bold border transition cursor-pointer ${
                  activeTab === "ai-chat"
                    ? "bg-[#0063F5] text-white border-[#0063F5] shadow-[0_4px_12px_rgba(0,99,245,0.24)]"
                    : "bg-[#EFF6FF] text-[#0063F5] border-[#BFDBFE] hover:bg-[#DBEAFE]"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI จองห้องพัก</span>
              </button>

              {/* Hotel Owner Studio / Admin CMS Button */}
              {onOpenOwnerStudio ? (
                <button
                  type="button"
                  onClick={onOpenOwnerStudio}
                  className="inline-flex items-center gap-1.5 h-9 px-3 sm:px-3.5 rounded-full bg-slate-900 hover:bg-[#0063F5] text-white text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">ระบบจัดการโรงแรม</span>
                  <span className="sm:hidden">จัดการ</span>
                  {pendingAdminCount > 0 && (
                    <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 text-[10px] font-extrabold">
                      {pendingAdminCount}
                    </span>
                  )}
                </button>
              ) : (
                <Link
                  href="/admin"
                  className="inline-flex items-center gap-1.5 h-9 px-3 sm:px-3.5 rounded-full bg-slate-900 hover:bg-[#0063F5] text-white text-xs font-bold transition shadow-xs"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">ระบบจัดการโรงแรม</span>
                  <span className="sm:hidden">Admin</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* =====================================================================
          MOBILE FLOATING BOTTOM BAR (< md)
          Modeled directly after WeGlobal's MobileBottomMenu.tsx:
          - Rounded-full glassmorphic pill in Fastwork Blue (#0063F5)
          - Active item has crisp white pill background with #0063F5 icon & text
          - Auto-hides on scroll down, reveals on scroll up
      ====================================================================== */}
      <div
        className={`fixed inset-x-3 sm:inset-x-6 max-w-lg mx-auto z-[110] md:hidden transition-all duration-300 ease-in-out ${
          mobileBarVisible
            ? "translate-y-0 opacity-100"
            : "translate-y-24 opacity-0 pointer-events-none"
        }`}
        style={{
          bottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <div
          className="h-[56px] px-2 rounded-full border border-white/40 shadow-[0_8px_28px_rgba(0,99,245,0.32)] ring-1 ring-black/5 flex items-center justify-between"
          style={{
            backgroundColor: "rgba(0, 99, 245, 0.92)",
            backdropFilter: "blur(16px) saturate(160%)",
            WebkitBackdropFilter: "blur(16px) saturate(160%)",
          }}
        >
          {navItems.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectTab(item.id);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                aria-label={item.label}
                className={`relative w-[62px] sm:w-[72px] h-10 rounded-full flex flex-col items-center justify-center transition-all active:scale-95 cursor-pointer ${
                  active
                    ? "bg-white text-[#0063F5] shadow-sm"
                    : "text-white/90 hover:text-white hover:bg-white/15"
                }`}
              >
                <div className="relative flex items-center justify-center">
                  <HotelNavTabIcon
                    name={item.id}
                    active={active}
                    className="w-[18px] h-[18px]"
                  />
                  {item.badge !== undefined && (
                    <span
                      className={`-top-1 -right-2.5 absolute min-w-[14px] h-[14px] px-1 rounded-full text-[8px] font-extrabold flex items-center justify-center leading-none ${
                        active
                          ? "bg-[#0063F5] text-white"
                          : "bg-white text-[#0063F5]"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
                <span
                  className={`text-[10px] leading-tight mt-0.5 tracking-tight ${
                    active ? "font-extrabold text-[#0063F5]" : "font-semibold"
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
