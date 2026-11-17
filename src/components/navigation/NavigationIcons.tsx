"use client";

import React from "react";
import {
  Bookmark,
  Building2,
  CalendarCheck,
  LayoutDashboard,
  PlusSquare,
  TicketPercent,
} from "lucide-react";

export type PlatformNavTabId =
  | "home"
  | "board"
  | "deal"
  | "studio"
  | "register-hotel"
  | "trips"
  | "hotel"
  | "super-admin"
  | "login";

export const MOBILE_BOTTOM_TABS: ReadonlyArray<{
  id: "home" | "board" | "deal" | "studio" | "trips";
  href: string;
  labelTh: string;
  labelEn: string;
}> = [
  { id: "home", href: "/", labelTh: "หน้าแรก", labelEn: "Home" },
  { id: "board", href: "/board", labelTh: "บอร์ด", labelEn: "Boards" },
  { id: "deal", href: "/deal", labelTh: "คูปอง", labelEn: "Deals" },
  { id: "studio", href: "/studio", labelTh: "ที่พัก", labelEn: "Studio" },
  { id: "trips", href: "/trips", labelTh: "การจอง", labelEn: "Trips" },
];

export function getTabIdFromPathname(pathname: string): PlatformNavTabId {
  if (pathname === "/" || pathname === "") return "home";
  if (pathname.startsWith("/board")) return "board";
  if (pathname.startsWith("/deal")) return "deal";
  if (pathname.startsWith("/studio") || pathname.startsWith("/admin")) {
    return "studio";
  }
  if (pathname.startsWith("/register-hotel")) return "register-hotel";
  if (pathname.startsWith("/trips") || pathname.startsWith("/setting")) {
    return "trips";
  }
  if (pathname.startsWith("/super-admin")) return "super-admin";
  if (pathname.startsWith("/login")) return "login";
  return "hotel";
}

export function PlatformNavIcon({
  id,
  isActive,
  hasOwnedHotel = false,
  cutoutColor = "var(--color-background-card)",
  className = "w-[25px] h-[25px]",
}: {
  id: PlatformNavTabId;
  isActive: boolean;
  hasOwnedHotel?: boolean;
  cutoutColor?: string;
  className?: string;
}) {
  switch (id) {
    case "home":
      return isActive ? (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path
            d="M11.15 2.72a1.35 1.35 0 0 1 1.7 0l8.1 6.62c.35.29.55.72.55 1.18V19.5A2.5 2.5 0 0 1 19 22H5a2.5 2.5 0 0 1-2.5-2.5v-8.98c0-.46.2-.89.55-1.18l8.1-6.62Z"
            fill="currentColor"
          />
          <rect
            x="9.5"
            y="13.5"
            width="5"
            height="8.5"
            rx="1.5"
            fill={cutoutColor}
          />
        </svg>
      ) : (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          aria-hidden="true"
        >
          <path d="M3 10.5 12 3l9 7.5V19.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9Z" />
          <path d="M9.5 21.5v-7a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v7" />
        </svg>
      );

    case "board":
      return (
        <Bookmark
          className={className}
          strokeWidth={isActive ? 2.4 : 2}
          fill={isActive ? "currentColor" : "none"}
        />
      );

    case "deal":
      return (
        <TicketPercent
          className={className}
          strokeWidth={isActive ? 2.4 : 2}
        />
      );

    case "studio":
      return hasOwnedHotel ? (
        <LayoutDashboard
          className={className}
          strokeWidth={isActive ? 2.4 : 2}
        />
      ) : (
        <PlusSquare className={className} strokeWidth={isActive ? 2.4 : 2} />
      );

    case "register-hotel":
      return <PlusSquare className={className} strokeWidth={isActive ? 2.4 : 2} />;

    case "trips":
      return (
        <CalendarCheck
          className={className}
          strokeWidth={isActive ? 2.4 : 2}
        />
      );

    default:
      return (
        <Building2 className={className} strokeWidth={isActive ? 2.4 : 2} />
      );
  }
}
