"use client";

import React from "react";
import {
  Building2,
  CalendarCheck,
  Compass,
  Heart,
  LayoutDashboard,
  Map,
  PlusSquare,
  Search,
  TicketPercent,
} from "lucide-react";

export type PlatformNavTabId =
  | "home"
  | "explore"
  | "board"
  | "wishlist"
  | "deal"
  | "search"
  | "studio"
  | "register-hotel"
  | "trips"
  | "hotel"
  | "super-admin"
  | "login";

export const MOBILE_BOTTOM_TABS: ReadonlyArray<{
  id: "home" | "explore" | "board";
  href: string;
  labelTh: string;
  labelEn: string;
}> = [
  { id: "home", href: "/", labelTh: "เที่ยวอะไร", labelEn: "Discover" },
  { id: "explore", href: "/explore", labelTh: "เที่ยวไหน", labelEn: "Map" },
  { id: "board", href: "/trip", labelTh: "ทริป", labelEn: "Trip" },
];

export function getTabIdFromPathname(pathname: string): PlatformNavTabId {
  if (pathname === "/" || pathname === "" || pathname.startsWith("/style")) {
    return "home";
  }
  if (pathname.startsWith("/explore")) return "explore";
  if (pathname === "/trip" || pathname.startsWith("/trip/")) {
    return "board";
  }
  if (
    pathname === "/wishlist" ||
    pathname.startsWith("/wishlist/") ||
    pathname.startsWith("/board")
  ) {
    return "wishlist";
  }
  if (pathname.startsWith("/deal")) return "deal";
  if (pathname.startsWith("/studio")) {
    return "studio";
  }
  if (pathname.startsWith("/register")) return "register-hotel";
  if (
    pathname.startsWith("/bookings") ||
    pathname.startsWith("/trips") ||
    pathname.startsWith("/account") ||
    pathname.startsWith("/setting")
  ) {
    return "trips";
  }
  if (pathname.startsWith("/admin") || pathname.startsWith("/super-admin")) {
    return "super-admin";
  }
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
      return (
        <TicketPercent
          className={className}
          strokeWidth={isActive ? 2.25 : 1.75}
        />
      );

    case "explore":
      return (
        <Map
          className={className}
          strokeWidth={isActive ? 2.25 : 1.75}
        />
      );

    case "board":
      return (
        <Compass
          className={className}
          strokeWidth={isActive ? 2.25 : 1.75}
        />
      );

    case "wishlist":
      return (
        <Heart
          className={className}
          strokeWidth={isActive ? 2.25 : 1.75}
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

    case "search":
      return (
        <Search
          className={className}
          strokeWidth={isActive ? 2.6 : 2.1}
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
