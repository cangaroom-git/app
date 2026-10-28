"use client";

import React from "react";
import { Compass, Star } from "lucide-react";

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

export const HOTEL_NAV_TABS: ReadonlyArray<{
  id: "book" | "shorts" | "chat" | "deal";
  href: string;
  labelEn: string;
  labelTh: string;
}> = [
  { id: "book", href: "/", labelEn: "Book", labelTh: "จองห้องพัก" },
  {
    id: "shorts",
    href: "/shorts",
    labelEn: "Short Video",
    labelTh: "วิดีโอสั้น",
  },
  { id: "chat", href: "/chat", labelEn: "Chat", labelTh: "AI แชท" },
  { id: "deal", href: "/deal", labelEn: "Deals", labelTh: "โปรโมชั่น" },
];

export function getTabIdFromPathname(pathname: string): HotelNavTabId {
  if (pathname.startsWith("/shorts")) {
    return "shorts";
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
  return "book";
}

export function HotelNavTabIcon({
  id,
  isActive,
  cutoutColor = "var(--color-background-card)",
  className = "w-[22px] h-[22px]",
}: {
  id: HotelNavTabId;
  isActive: boolean;
  cutoutColor?: string;
  className?: string;
}) {
  switch (id) {
    case "book":
    case "home":
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
      return isActive ? (
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
      return isActive ? (
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
