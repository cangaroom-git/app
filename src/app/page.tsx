"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Star,
  Instagram,
  Play,
  ChevronLeft,
  ChevronRight,
  Users,
  Maximize2,
  Calendar,
  ShieldCheck,
  BedDouble,
  Thermometer,
  Heart,
  Send,
  Check,
  ArrowRight,
  Video,
  Image as ImageIcon,
  Smile,
} from "lucide-react";
import { useHotelApp, formatShortDate } from "@/components/HotelAppShell";
import { StandardCard, StatusPill } from "@/components/ui/standards";
import { AiConciergeHeroBox } from "@/components/AnimatedAiBot";
import {
  addDaysToDate,
  formatDateStr,
  getRoomInventoryForRange,
} from "@/lib/store";
import { RESORT_SHORTS } from "@/app/shorts/page";

const SHORT_DAYS_TH = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
const SHORT_DAYS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const SHORT_MONTHS_TH = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];
const SHORT_MONTHS_EN = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function formatSliderDayLabel(dateStr: string, lang: "th" | "en" = "th"): string {
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return dateStr;
  if (lang === "en") {
    return `${SHORT_DAYS_EN[d.getDay()]} ${d.getDate()} ${
      SHORT_MONTHS_EN[d.getMonth()]
    }`;
  }
  return `${SHORT_DAYS_TH[d.getDay()]} ${d.getDate()} ${
    SHORT_MONTHS_TH[d.getMonth()]
  }`;
}

/**
 * Viewport-gated video player for horizontal Reels strip.
 * Prevents 6 concurrent MP4 downloads on initial page load by only playing/buffering
 * videos that are currently visible inside the viewport.
 */
function ViewportReelVideo({
  videoUrl,
  posterUrl,
  eager,
}: {
  videoUrl: string;
  posterUrl: string;
  eager: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        if (entry.isIntersecting) {
          el.play().catch(() => {});
        } else {
          el.pause();
        }
      },
      { threshold: 0.25 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <video
      ref={videoRef}
      src={videoUrl}
      poster={posterUrl}
      muted
      loop
      playsInline
      preload={eager ? "metadata" : "none"}
      className="w-full h-full object-cover"
    />
  );
}

export default function HomePage() {
  const {
    propertyConfig,
    rooms,
    bookings,
    today,
    lang,
    checkIn,
    setCheckIn,
    checkOut,
    setCheckOut,
    guests,
    nights,
    weather,
    roomStatusMap,
    totalAvailableUnitsCount,
    totalInventoryUnitsCount,
    findNextAvailableRangeForRoom,
    openRoomDrawer,
    openGalleryModal,
    navigateToTab,
    submitChatPrompt,
    openShortsAt,
  } = useHotelApp();

  const [aiPromptInput, setAiPromptInput] = useState("");
  const [cardSlideIndex, setCardSlideIndex] = useState<Record<string, number>>(
    {}
  );
  const [likedRooms, setLikedRooms] = useState<Record<string, boolean>>({});
  const [sharedRoomId, setSharedRoomId] = useState<string | null>(null);
  const [activeAnchorRoomId, setActiveAnchorRoomId] = useState<string>(
    rooms[0]?.id ?? ""
  );
  const isProgrammaticScrollRef = useRef<boolean>(false);
  const programmaticScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  useEffect(() => {
    if (typeof window === "undefined" || rooms.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (isProgrammaticScrollRef.current) return;
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const roomId = entry.target.getAttribute("data-room-anchor-id");
            if (roomId) {
              setActiveAnchorRoomId(roomId);
              break;
            }
          }
        }
      },
      { rootMargin: "-20% 0px -55% 0px", threshold: 0.1 }
    );

    rooms.forEach((rm) => {
      const el = document.getElementById(`room-card-${rm.id}`);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [rooms]);

  const scrollToRoomCard = (roomId: string) => {
    isProgrammaticScrollRef.current = true;
    if (programmaticScrollTimerRef.current) {
      clearTimeout(programmaticScrollTimerRef.current);
    }
    setActiveAnchorRoomId(roomId);

    requestAnimationFrame(() => {
      const el = document.getElementById(`room-card-${roomId}`);
      if (el) {
        const rect = el.getBoundingClientRect();
        const currentScrollY =
          window.scrollY || document.documentElement.scrollTop || 0;
        const targetTop = Math.max(0, rect.top + currentScrollY - 88);
        window.scrollTo({
          top: targetTop,
          behavior: "smooth",
        });
      }
      programmaticScrollTimerRef.current = setTimeout(() => {
        isProgrammaticScrollRef.current = false;
      }, 750);
    });
  };

  const reelsSliderRef = useRef<HTMLDivElement | null>(null);
  const dateSliderRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const photoTouchStartRef = useRef<{ x: number; y: number } | null>(null);

  const scrollReelsSlider = (dir: "left" | "right") => {
    const el = reelsSliderRef.current;
    if (!el) return;
    const offset = dir === "left" ? -310 : 310;
    el.scrollBy({ left: offset, behavior: "smooth" });
  };

  const handleAiPromptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = aiPromptInput.trim();
    if (!trimmed) {
      navigateToTab("chat");
      return;
    }
    setAiPromptInput("");
    submitChatPrompt(trimmed);
  };

  const scrollDateSlider = (roomId: string, dir: "left" | "right") => {
    const el = dateSliderRefs.current[roomId];
    if (!el) return;
    const offset = dir === "left" ? -280 : 280;
    el.scrollBy({ left: offset, behavior: "smooth" });
  };

  const scrollPhotoToSlide = (roomId: string, targetIdx: number) => {
    setCardSlideIndex((prev) => ({ ...prev, [roomId]: targetIdx }));
  };

  const toggleLikeRoom = (roomId: string) => {
    setLikedRooms((prev) => ({ ...prev, [roomId]: !prev[roomId] }));
  };

  const handleShareRoom = async (roomName: string, roomId: string) => {
    const shareUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/?room=${roomId}`
        : "";
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: roomName,
          text: `${roomName} — ${propertyConfig.nameTh}`,
          url: shareUrl,
        });
        return;
      } catch {
        // Fallback to clipboard copy
      }
    }
    if (typeof navigator !== "undefined" && navigator.clipboard && shareUrl) {
      navigator.clipboard.writeText(shareUrl);
    }
    setSharedRoomId(roomId);
    setTimeout(() => setSharedRoomId(null), 1800);
  };

  // 14-day date list for each room's availability & temperature slider
  const next14Days = Array.from({ length: 14 }, (_, idx) => {
    const d = addDaysToDate(today, idx);
    const dateStr = formatDateStr(d);
    const nextDateStr = formatDateStr(addDaysToDate(d, 1));
    const forecast = weather?.daily?.find((w) => w.dateStr === dateStr);
    const tempAvg =
      forecast?.tempAvg ?? weather?.currentTemp ?? 21 - (idx % 3);
    return {
      dateStr,
      nextDateStr,
      label: formatSliderDayLabel(dateStr, lang),
      tempAvg,
    };
  });

  const vis = propertyConfig.sectionsVisibility;
  const availableRoomTypesCount = rooms.filter((r) => {
    const st = roomStatusMap[r.id];
    return st?.state === "AVAILABLE" && (st?.availableUnits ?? 0) > 0;
  }).length;

  return (
    <>
      {/* =====================================================================
          UNIFIED TOP SECTION (#overview): ASK AI INPUT + LARGE PURE VIDEO REELS SLIDER
          - No border, no padding on #overview
          - Clean AI Chat Input with Send button inside the input (no profile avatar, no media icons)
          - Prev/Next buttons on Video Slider appear on mouse hover only
      ====================================================================== */}
      {vis.heroSection && (
        <StandardCard id="overview" noPadding className="!border-0">
          {/* 1. PROMINENT ICON-FIRST AI BAR WITH MONOCHROME ANIMATED BOT */}
          <AiConciergeHeroBox
            lang={lang}
            promptValue={aiPromptInput}
            onPromptChange={setAiPromptInput}
            onSubmitPrompt={handleAiPromptSubmit}
            onQuickPromptClick={(promptText) => submitChatPrompt(promptText)}
            onOpenFullChat={() => navigateToTab("chat")}
          />

          {/* 2. LARGE PURE VIDEO REELS SLIDER (VIDEO ONLY — NO TEXT, ARROWS ON HOVER ONLY) */}
          <div className="relative group/reels overflow-hidden max-w-full">
            {/* Left Floating Arrow (Hover Only) */}
            <button
              type="button"
              onClick={() => scrollReelsSlider("left")}
              aria-label="เลื่อนดูวิดีโอก่อนหน้า"
              className="hidden sm:flex absolute left-2.5 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-[var(--color-background-card)] border border-[var(--color-border)] text-[var(--color-text-primary)] shadow-lg items-center justify-center opacity-0 pointer-events-none group-hover/reels:opacity-100 group-hover/reels:pointer-events-auto hover:scale-105 transition-all cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Horizontal Slider Track */}
            <div
              ref={reelsSliderRef}
              className="flex gap-3 px-4 sm:px-5 overflow-x-auto no-scrollbar snap-x snap-mandatory scroll-smooth"
            >
              {RESORT_SHORTS.map((shortItem, idx) => (
                <div
                  key={shortItem.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openShortsAt(idx)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openShortsAt(idx);
                    }
                  }}
                  aria-label={shortItem.titleTh}
                  className="relative w-[176px] sm:w-[210px] h-[296px] sm:h-[352px] shrink-0 snap-start rounded-[16px] overflow-hidden bg-[var(--color-background-muted)] cursor-pointer group/reelcard"
                >
                  <ViewportReelVideo
                    videoUrl={shortItem.videoUrl}
                    posterUrl={shortItem.posterUrl}
                    eager={idx < 2}
                  />
                </div>
              ))}
            </div>

            {/* Right Floating Arrow (Hover Only) */}
            <button
              type="button"
              onClick={() => scrollReelsSlider("right")}
              aria-label="เลื่อนดูวิดีโอถัดไป"
              className="hidden sm:flex absolute right-2.5 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-[var(--color-background-card)] border border-[var(--color-border)] text-[var(--color-text-primary)] shadow-lg items-center justify-center opacity-0 pointer-events-none group-hover/reels:opacity-100 group-hover/reels:pointer-events-auto hover:scale-105 transition-all cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </StandardCard>
      )}

      {/* Anchor target for Sticky Booking Bar */}
      <div id="rooms" className="scroll-mt-24 -mb-3 lg:-mb-5" />

      {/* Mobile / Tablet Compact Room Anchor Strip (< xl) — Icon + Room Code + Available/Full Only */}
      <div className="xl:hidden w-full max-w-full bg-[var(--color-background-body)] px-4 py-2 border-b border-[var(--color-border)] flex items-center gap-2 overflow-x-auto no-scrollbar">
        {rooms.map((rm) => {
          const st = roomStatusMap[rm.id];
          const isAvail =
            st?.state === "AVAILABLE" && (st?.availableUnits ?? 0) > 0;
          const isActive = activeAnchorRoomId === rm.id;

          return (
            <button
              key={rm.id}
              type="button"
              onClick={() => scrollToRoomCard(rm.id)}
              className={`h-9 pl-1.5 pr-3 rounded-full inline-flex items-center gap-2 ty-caption font-semibold shrink-0 border transition cursor-pointer ${
                isActive
                  ? "bg-[var(--color-accent)] text-[var(--color-on-accent)] border-[var(--color-accent)]"
                  : "bg-[var(--color-background-card)] text-[var(--color-text-primary)] border-[var(--color-border)]"
              }`}
            >
              <div className="relative h-6 w-6 shrink-0">
                <img
                  src={rm.images[0]?.url}
                  alt={rm.code}
                  loading="lazy"
                  decoding="async"
                  className="h-6 w-6 rounded-full object-cover"
                />
                <span
                  className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full ring-1 ring-[var(--color-background-card)] ${
                    isAvail ? "bg-emerald-500" : "bg-rose-500"
                  }`}
                />
              </div>
              <span className="font-bold">{rm.code}</span>
              <span className="opacity-75 font-medium">
                {isAvail
                  ? lang === "th"
                    ? "ว่าง"
                    : "Available"
                  : lang === "th"
                  ? "เต็ม"
                  : "Full"}
              </span>
            </button>
          );
        })}
      </div>

      {/* =====================================================================
          ALL ROOMS TALL SOCIAL POST CARDS (FACEBOOK POST STYLE)
          - Top Header (Above Image): Room Code + Title + SAVE Badge + StatusPill + Size / Guests / Price
          - Middle: Tall vertical swipeable image (aspect-[4/5] sm:h-[540px])
          - Underneath Image:
            1) 14-Day Availability & Temperature Slider Date
            2) Single Action Row: Like button + Share button + "View This Room" button
      ====================================================================== */}
      {rooms.map((room, roomIdx) => {
        const currentSlide = cardSlideIndex[room.id] ?? 0;
        const totalSlides = room.images.length;
        const st = roomStatusMap[room.id];
        const isAvailable =
          st?.state === "AVAILABLE" && (st?.availableUnits ?? 0) > 0;
        const nightlyRate = st?.effectiveNightlyPrice ?? room.basePriceThb;
        const totalStayRate = st?.totalStayRoomPrice ?? nightlyRate * nights;
        const originalNightlyRate =
          room.discountPercent > 0
            ? Math.round(nightlyRate / (1 - room.discountPercent / 100))
            : nightlyRate;
        const isSingleVilla =
          (room.inventoryMode || "SINGLE_UNIT") === "SINGLE_UNIT";
        const nextAvail = !isAvailable
          ? findNextAvailableRangeForRoom(room)
          : null;

        const isLiked = Boolean(likedRooms[room.id]);
        const baseLikes = 1240 + roomIdx * 315;
        const likeCount = isLiked ? baseLikes + 1 : baseLikes;

        return (
          <div
            key={room.id}
            id={`room-card-${room.id}`}
            data-room-anchor-id={room.id}
            className="scroll-mt-20"
          >
          <StandardCard noPadding>
            {/* 1. TOP FACEBOOK POST HEADER & ROOM DETAILS (ABOVE IMAGE) */}
            <div className="p-4 sm:p-5 space-y-1.5 min-w-0">
              <div className="flex items-center justify-between gap-2 min-w-0">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="inline-flex items-center justify-center rounded-md bg-[var(--color-accent)] text-[var(--color-on-accent)] px-2 py-0.5 text-[12px] font-bold shrink-0">
                    {room.code}
                  </span>
                  <h3 className="ty-title truncate min-w-0">
                    {lang === "th" ? room.nameTh : room.nameEn}
                  </h3>
                  {room.discountPercent > 0 && (
                    <span className="hidden sm:inline-flex rounded-full bg-[var(--color-success-muted)] text-[var(--color-success)] px-2 py-0.5 text-[11px] font-bold shrink-0">
                      {lang === "th"
                        ? `ลด ${room.discountPercent}%`
                        : `SAVE ${room.discountPercent}%`}
                    </span>
                  )}
                </div>

                <div className="shrink-0 text-right">
                  <div className="inline-flex items-baseline gap-1.5">
                    {room.discountPercent > 0 && (
                      <span className="ty-caption line-through">
                        ฿{originalNightlyRate.toLocaleString()}
                      </span>
                    )}
                    <strong className="ty-subtitle text-[var(--color-text-primary)]">
                      ฿{nightlyRate.toLocaleString()}
                    </strong>
                    <span className="ty-caption">
                      {lang === "th" ? "/ คืน" : "/ night"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Minimalist Essential Specs: จำนวนตารางเมตร / พักกี่ท่าน & ราคารวม */}
              <div className="flex flex-wrap items-center justify-between gap-2 ty-body font-medium text-[var(--color-text-secondary)]">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="inline-flex items-center gap-1 text-[var(--color-text-primary)]">
                    <Maximize2 className="w-4 h-4 text-[var(--color-text-secondary)]" />
                    <span>
                      {room.sizeSqm} {lang === "th" ? "ตร.ม." : "m²"}
                    </span>
                  </span>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1 text-[var(--color-text-primary)]">
                    <Users className="w-4 h-4 text-[var(--color-text-secondary)]" />
                    <span>
                      {room.baseGuests}–{room.maxGuests}{" "}
                      {lang === "th" ? "ท่าน" : "guests"}
                    </span>
                  </span>
                </div>

                <p className="ty-caption">
                  {lang === "th"
                    ? `รวม ${nights} คืน: `
                    : `Total (${nights} nights): `}
                  <strong className="text-[var(--color-text-primary)]">
                    ฿{totalStayRate.toLocaleString()}
                  </strong>
                  {!isAvailable && nextAvail ? (
                    <button
                      type="button"
                      onClick={() => {
                        setCheckIn(nextAvail.nextCheckIn);
                        setCheckOut(nextAvail.nextCheckOut);
                      }}
                      className="ml-2 underline font-semibold text-[var(--color-text-primary)] cursor-pointer"
                    >
                      (
                      {lang === "th"
                        ? `ว่างเร็วสุด: ${formatShortDate(
                            nextAvail.nextCheckIn,
                            lang
                          )} →`
                        : `Next available: ${formatShortDate(
                            nextAvail.nextCheckIn,
                            lang
                          )} →`}
                      )
                    </button>
                  ) : null}
                </p>
              </div>
            </div>

            {/* 2. Tall Portrait Post Image Carousel (touch-pan-y + CSS translateX so vertical scroll down NEVER gets trapped) */}
            <div
              onDoubleClick={(e) => {
                e.stopPropagation();
                toggleLikeRoom(room.id);
              }}
              onTouchStart={(e) => {
                const t = e.touches[0];
                if (t) {
                  photoTouchStartRef.current = { x: t.clientX, y: t.clientY };
                }
              }}
              onTouchEnd={(e) => {
                if (!photoTouchStartRef.current || totalSlides <= 1) return;
                const t = e.changedTouches[0];
                if (!t) return;
                const dx = t.clientX - photoTouchStartRef.current.x;
                const dy = t.clientY - photoTouchStartRef.current.y;
                photoTouchStartRef.current = null;
                if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) {
                  if (dx < 0) {
                    scrollPhotoToSlide(room.id, (currentSlide + 1) % totalSlides);
                  } else {
                    scrollPhotoToSlide(
                      room.id,
                      (currentSlide - 1 + totalSlides) % totalSlides
                    );
                  }
                }
              }}
              className="relative w-full aspect-[4/5] sm:h-[540px] overflow-hidden bg-black group/photo touch-pan-y"
            >
              <div
                style={{
                  transform: `translate3d(-${currentSlide * 100}%, 0, 0)`,
                }}
                className="flex h-full w-full transition-transform duration-300 ease-out will-change-transform"
              >
                {room.images.map((img, imgIdx) => (
                  <div
                    key={imgIdx}
                    onClick={() => openGalleryModal(room)}
                    className="h-full w-full shrink-0 overflow-hidden cursor-pointer"
                  >
                    <img
                      src={img.url}
                      alt={img.captionTh || room.nameTh}
                      draggable={false}
                      fetchPriority={
                        roomIdx === 0 && imgIdx === 0 ? "high" : "auto"
                      }
                      loading={
                        roomIdx === 0 && imgIdx === 0 ? "eager" : "lazy"
                      }
                      decoding="async"
                      className="h-full w-full object-cover object-center select-none"
                    />
                  </div>
                ))}
              </div>

              {totalSlides > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const prevIdx =
                        (currentSlide - 1 + totalSlides) % totalSlides;
                      scrollPhotoToSlide(room.id, prevIdx);
                    }}
                    aria-label="Previous photo"
                    className="hidden lg:flex absolute left-0 top-1/2 -translate-y-1/2 m-0 p-0 h-10 w-10 rounded-none bg-black/60 hover:bg-black/85 text-white items-center justify-center opacity-0 group-hover/photo:opacity-100 transition cursor-pointer z-10"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const nextIdx = (currentSlide + 1) % totalSlides;
                      scrollPhotoToSlide(room.id, nextIdx);
                    }}
                    aria-label="Next photo"
                    className="hidden lg:flex absolute right-0 top-1/2 -translate-y-1/2 m-0 p-0 h-10 w-10 rounded-none bg-black/60 hover:bg-black/85 text-white items-center justify-center opacity-0 group-hover/photo:opacity-100 transition cursor-pointer z-10"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>

                  {/* Carousel Dots Indicator */}
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1 pointer-events-none">
                    {room.images.map((_, dotIdx) => (
                      <span
                        key={dotIdx}
                        className={`h-1.5 rounded-full transition-all ${
                          dotIdx === currentSlide
                            ? "w-4 bg-white"
                            : "w-1.5 bg-white/55"
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* 3. Single Bottom Action Row: Like Button + Share Button + "View This Room" Button */}
            <div className="px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <button
                  type="button"
                  onClick={() => toggleLikeRoom(room.id)}
                  aria-label="Like room"
                  className="inline-flex items-center gap-1.5 text-[var(--color-text-primary)] hover:opacity-75 transition cursor-pointer"
                >
                  <Heart
                    className={`w-6 h-6 transition-transform active:scale-125 ${
                      isLiked ? "fill-rose-500 text-rose-500" : ""
                    }`}
                  />
                  <span className="ty-body font-semibold">
                    {likeCount.toLocaleString()}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleShareRoom(
                      lang === "th" ? room.nameTh : room.nameEn,
                      room.id
                    )
                  }
                  aria-label="Share room"
                  title={lang === "th" ? "แชร์ห้องพักนี้" : "Share this room"}
                  className="inline-flex items-center justify-center h-8 w-8 rounded-full text-[var(--color-text-primary)] hover:bg-[var(--color-overlay-hover)] transition cursor-pointer"
                >
                  {sharedRoomId === room.id ? (
                    <Check className="w-5 h-5 text-[var(--color-success)]" />
                  ) : (
                    <Send className="w-5 h-5 -rotate-12" />
                  )}
                </button>
              </div>

              <button
                type="button"
                disabled={!isAvailable}
                onClick={() => {
                  if (!isAvailable) return;
                  openRoomDrawer(room, "details");
                }}
                className={`btn-round-solid shrink-0 ${
                  !isAvailable
                    ? "opacity-40 !cursor-not-allowed pointer-events-none"
                    : ""
                }`}
              >
                <span>
                  {!isAvailable
                    ? lang === "th"
                      ? "เต็มแล้ว"
                      : "Fully Booked"
                    : lang === "th"
                    ? "จองห้องพักนี้"
                    : "Book This Room"}
                </span>
                {isAvailable && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </StandardCard>
          </div>
        );
      })}

      {/* =====================================================================
          GUEST REVIEWS CARD SLIDER (flex gap-3 md:grid md:grid-cols-3 md:gap-3)
          - Visually distinct from Room Booking cards
          - Clean top image per review card with NO gradient and NO text on image
      ====================================================================== */}
      {vis.galleryAndReviewsSection && (
        <section
          id="reviews"
          className="w-full max-w-full min-w-0 overflow-hidden px-3.5 sm:px-4 lg:px-0 pt-2 pb-4 space-y-3.5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 min-w-0">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="fw-head-icon shrink-0">
                <Star className="w-5 h-5 text-amber-500 fill-current" />
              </div>
              <div className="min-w-0">
                <h2 className="ty-title truncate">
                  {lang === "th"
                    ? "9.6 / 10 ยอดเยี่ยมมาก · รีวิวจากผู้เข้าพักจริง"
                    : "9.6 / 10 Exceptional · Verified Guest Reviews"}
                </h2>
                <p className="ty-caption truncate">
                  {lang === "th"
                    ? "ความประทับใจจากผู้เข้าพักจริงและโพสต์รีวิวจาก Facebook"
                    : "Real stories and verified Facebook reviews from our guests"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 max-w-full">
              <button
                type="button"
                onClick={() => navigateToTab("review")}
                className="btn-fw-secondary"
              >
                <span>
                  {lang === "th"
                    ? "ดูรีวิว Facebook ทั้งหมด →"
                    : "View All Facebook Reviews →"}
                </span>
              </button>
              <a
                href="https://www.instagram.com/sapanunseen?vrfl=NGFrdjRieXI3NXNq&utm_source=qr"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-fw-secondary"
              >
                <Instagram className="w-4 h-4" />
                <span>@sapanunseen</span>
              </a>
            </div>
          </div>

          <div className="flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory md:grid md:grid-cols-3 md:gap-3">
            {[
              {
                id: "rev-1",
                guestTh: "คุณกมลชนก",
                guestEn: "Kamonchanok P.",
                room: "A-Frame Panorama Villa (A1)",
                score: "10/10",
                photo:
                  "https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&w=800&q=80",
                quoteTh:
                  "ระบบจองใช้งานง่ายมาก เห็นวันว่างและอุณหภูมิรายวันชัดเจนตั้งแต่ใต้รูปห้องพัก วิลล่าบรรยากาศเป็นส่วนตัวและอ่างแช่น้ำชมหมอกฟินมากค่ะ",
                quoteEn:
                  "Booking was effortless with real-time availability right on the calendar. The private A-Frame villa and outdoor soaking tub overlooking the morning mist were unforgettable!",
              },
              {
                id: "rev-2",
                guestTh: "คุณภาคิน",
                guestEn: "Phakin T.",
                room: "Skyline Jacuzzi Villa (A3)",
                score: "9.8/10",
                photo:
                  "https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=800&q=80",
                quoteTh:
                  "ประทับใจตั้งแต่กดจองตรงได้ส่วนลด แนบสลิปปุ๊บระบบสแกน QR ยืนยันไวมาก หมูกระทะริมระเบียงและอาหารเช้าดีงามระดับ 5 ดาวครับ",
                quoteEn:
                  "Loved the direct booking discount and instant QR slip verification. Having hot Thai BBQ on our private deck and 5-star breakfast in the morning was amazing.",
              },
              {
                id: "rev-3",
                guestTh: "คุณณัฐริกา",
                guestEn: "Natrika S.",
                room: "Sapan Forest Cabin (B1)",
                score: "9.6/10",
                photo:
                  "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80",
                quoteTh:
                  "ตื่นเช้ามาเปิดม่านเจอทะเลหมอกลอยผ่านหน้าห้องเลยค่ะ กาแฟดริปหอมมาก พนักงานดูแลอบอุ่น เป็นทริปสะปันที่ประทับใจที่สุด",
                quoteEn:
                  "Waking up to a sea of mist drifting past our terrace was magical. The local Nan drip coffee and warm hospitality made this our best Sapan trip ever.",
              },
            ].map((rev) => (
              <div
                key={rev.id}
                onClick={() => navigateToTab("review")}
                className="snap-start shrink-0 w-[265px] sm:w-[290px] md:w-auto rounded-[20px] bg-[var(--color-background-card)] border border-[var(--color-border)] overflow-hidden flex flex-col justify-between cursor-pointer hover:border-[var(--color-border-emphasized)] transition"
              >
                <div>
                  <div className="h-36 w-full overflow-hidden bg-[var(--color-background-muted)]">
                    <img
                      src={rev.photo}
                      alt={rev.room}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-3.5 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="inline-flex items-center gap-0.5 text-amber-500">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <Star className="w-3.5 h-3.5 fill-current" />
                      </div>
                      <span className="rounded-full bg-[var(--color-background-muted)] px-2 py-0.5 text-[11px] font-bold text-[var(--color-text-primary)]">
                        {rev.score}
                      </span>
                    </div>
                    <p className="ty-body line-clamp-3">
                      &ldquo;{lang === "th" ? rev.quoteTh : rev.quoteEn}&rdquo;
                    </p>
                  </div>
                </div>

                <div className="px-3.5 pb-3.5 pt-2 border-t border-[var(--color-border)] flex items-center justify-between gap-2">
                  <span className="ty-caption font-bold text-[var(--color-text-primary)] truncate">
                    — {lang === "th" ? rev.guestTh : rev.guestEn}
                  </span>
                  <span className="ty-caption truncate">{rev.room}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
