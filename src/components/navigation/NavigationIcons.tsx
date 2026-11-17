"use client";

import React from "react";
import { Bookmark, Compass, Sparkles, Star } from "lucide-react";

export type HotelNavTabId =
  | "home"
  | "board"
  | "book"
  | "room"
  | "shorts"
  | "chat"
  | "deal"
  | "review"
  | "guide"
  | "setting";

export const HOTEL_NAV_TABS: ReadonlyArray<{
  id: "home" | "board" | "book" | "chat" | "deal";
  href: string;
  labelEn: string;
  labelTh: string;
}> = [
  { id: "home", href: "/", labelEn: "Home", labelTh: "หน้าแรก" },
  {
    id: "board",
    href: "/board",
    labelEn: "Saved Board",
    labelTh: "บอร์ดที่บันทึก",
  },
  { id: "book", href: "/booking", labelEn: "Book", labelTh: "จองห้อง" },
  { id: "chat", href: "/chat", labelEn: "Ask AI", labelTh: "ถาม AI" },
  { id: "deal", href: "/deal", labelEn: "Deals", labelTh: "โปรโมชั่น" },
];

export function getTabIdFromPathname(pathname: string): HotelNavTabId {
  if (pathname.startsWith("/board")) {
    return "board";
  }
  if (pathname.startsWith("/booking") || pathname.startsWith("/room")) {
    return "book";
  }
  if (pathname.startsWith("/shorts")) {
    return "board";
  }
  if (pathname.startsWith("/chat")) {
    return "chat";
  }
  if (pathname.startsWith("/deal")) {
    return "deal";
  }
  if (pathname.startsWith("/review")) {
    return "review";
  }
  if (pathname.startsWith("/guide")) {
    return "guide";
  }
  if (pathname.startsWith("/setting")) {
    return "setting";
  }
  return "home";
}

export function HotelNavTabIcon({
  id,
  isActive,
  cutoutColor = "var(--color-background-card)",
  className = "w-[24px] h-[24px]",
}: {
  id: HotelNavTabId;
  isActive: boolean;
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
    case "shorts":
      return (
        <Bookmark
          className={className}
          strokeWidth={isActive ? 2.4 : 2}
          fill={isActive ? "currentColor" : "none"}
        />
      );

    case "book":
    case "room":
      return isActive ? (
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
          strokeWidth={2}
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

    case "chat":
      return <Sparkles className={className} />;

    case "deal":
      return isActive ? (
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
          strokeWidth={2}
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
      return isActive ? (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <circle cx="12" cy="12" r="9.2" fill="currentColor" />
          <circle cx="12" cy="12" r="3" fill={cutoutColor} />
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
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.6.77 1.02 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
        </svg>
      );
  }
}
