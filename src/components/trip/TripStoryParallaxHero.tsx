"use client";

import React, { useEffect, useRef } from "react";
import { Camera, ChevronDown, Users } from "lucide-react";
import type { PublicCommunityTripDto } from "@/lib/services/boardService";

interface TripStoryParallaxHeroProps {
  language: "th" | "en";
  isSignedIn: boolean;
  totalTripsCount: number;
  provinceGroupCount: number;
  communityTrips: PublicCommunityTripDto[];
  onCreateTrip: () => void;
  onSignIn: () => void;
}

export function TripStoryParallaxHero({
  language,
  totalTripsCount,
}: TripStoryParallaxHeroProps) {
  const isTh = language === "th";
  const runwayRef = useRef<HTMLDivElement | null>(null);
  const stickyStageRef = useRef<HTMLElement | null>(null);
  const bgLayerRef = useRef<HTMLDivElement | null>(null);
  const travellerLayerRef = useRef<HTMLDivElement | null>(null);
  const contentLayerRef = useRef<HTMLDivElement | null>(null);
  const scrollHintRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reducedMotionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );
    if (reducedMotionQuery.matches) return;

    let rafId: number | null = null;

    const applyStickyPanorama = () => {
      rafId = null;
      const runwayEl = runwayRef.current;
      const stageEl = stickyStageRef.current;
      if (!runwayEl || !stageEl) return;

      const runwayRect = runwayEl.getBoundingClientRect();
      const stickyTop = window.innerWidth >= 1024 ? 80 : 0;
      const scrubRange = Math.max(
        runwayEl.offsetHeight - stageEl.offsetHeight,
        1
      );

      // 0 at top of page -> 1 as user scrolls through the deep sticky runway (while hero stays pinned!)
      const rawProgress = Math.max(
        0,
        Math.min(1, (stickyTop - runwayRect.top) / scrubRange)
      );

      // Smooth cinematic ease-out curve for natural camera dolly-out feel
      const eased = 1 - Math.pow(1 - rawProgress, 1.45);

      // Layer 0 (Pure Mountain & Sky Panorama):
      // Deep zoom-out from 1.62 -> 1.00 + vertical horizon sweep (36px -> -26px)
      if (bgLayerRef.current) {
        const bgScale = 1.62 - eased * 0.62;
        const bgY = 36 - eased * 62;
        bgLayerRef.current.style.transform = `translate3d(0, ${bgY.toFixed(1)}px, 0) scale(${bgScale.toFixed(4)})`;
      }

      // Layer 1 (Girl + Summit Ground Ledge):
      // Anchored at bottom-center (50% 100%) with +88px initial offset so her full straw hat stays
      // inside the frame at scrollY=0, then camera flies back (1.34 -> 1.00, 88px -> 0px) to reveal
      // the entire rocky mountaintop ledge & wild shrubs with distinct 3D depth separation!
      if (travellerLayerRef.current) {
        const fgScale = 1.34 - eased * 0.34;
        const fgY = 88 - eased * 88;
        travellerLayerRef.current.style.transform = `translate3d(0, ${fgY.toFixed(1)}px, 0) scale(${fgScale.toFixed(4)})`;
      }

      // Layer 3 (Headline & Copy): gentle upward float as vista opens wide
      if (contentLayerRef.current) {
        const contentY = -eased * 14;
        contentLayerRef.current.style.transform = `translate3d(0, ${contentY.toFixed(1)}px, 0)`;
      }

      // Subtle scroll hint fades out smoothly as soon as user starts scrubbing
      if (scrollHintRef.current) {
        const hintOpacity = Math.max(0, Math.min(1, 1 - rawProgress * 4.2));
        scrollHintRef.current.style.opacity = hintOpacity.toFixed(3);
      }
    };

    const handleScroll = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(applyStickyPanorama);
    };

    applyStickyPanorama();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });

    return () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  return (
    <div
      ref={runwayRef}
      className="cgr-trip-hero-runway relative w-full h-[210svh] lg:h-[200vh]"
    >
      <section
        ref={stickyStageRef}
        aria-label={isTh ? "เล่าเรื่องเที่ยวบน Nondii" : "Nondii Travel Stories"}
        className="sticky top-0 lg:top-[80px] w-full h-[86svh] min-h-[560px] max-h-[820px] lg:h-[min(78vh,640px)] overflow-hidden rounded-b-[32px] lg:rounded-[28px] bg-[#2a629a] flex flex-col justify-end select-none"
      >
        {/* Layer 0: Uninterrupted Mountain & Sky Panorama (Deep zoom-out 1.62 -> 1.00 while pinned) */}
        <div
          ref={bgLayerRef}
          className="cgr-trip-hero-layer pointer-events-none absolute -inset-9"
          style={{
            transform: "translate3d(0, 36px, 0) scale(1.62)",
            transformOrigin: "50% 42%",
          }}
        >
          <img
            src="/brand/nondii-trip-bg-v2.webp"
            alt=""
            aria-hidden="true"
            fetchPriority="high"
            decoding="async"
            className="w-full h-full object-cover object-center"
          />
        </div>

        {/* Layer 1: Traveller Standing On Summit Ground Ledge (Dolly-out 1.34 -> 1.00 anchored to ground) */}
        <div
          ref={travellerLayerRef}
          className="cgr-trip-hero-layer pointer-events-none absolute inset-x-0 top-0 bottom-0 flex items-end justify-center"
          style={{
            transform: "translate3d(0, 88px, 0) scale(1.34)",
            transformOrigin: "50% 100%",
          }}
        >
          <img
            src="/brand/nondii-trip-girl-ground.webp"
            alt={
              isTh
                ? "นักเดินทางยืนบนยอดผาถือกล้องมองวิวภูเขา"
                : "Traveller standing on mountain summit ledge holding camera"
            }
            fetchPriority="high"
            decoding="async"
            className="w-full h-full object-cover object-[50%_100%]"
          />
        </div>

        {/* Layer 2: Calm Twilight-Blue Atmospheric Scrim For Crisp White Copy */}
        <div
          aria-hidden="true"
          className="cgr-trip-hero-scrim pointer-events-none absolute inset-x-0 bottom-0 h-[56%] sm:h-[52%]"
        />

        {/* Layer 3: Storytelling Invitation Copy */}
        <div
          ref={contentLayerRef}
          className="cgr-trip-hero-layer relative z-20 px-5 sm:px-6 lg:px-8 pb-6 sm:pb-8 pt-16 flex flex-col items-center text-center"
        >
          {/* Display Headline */}
          <h1 className="text-[28px] sm:text-[36px] lg:text-[42px] font-bold tracking-[-0.025em] text-white leading-[1.15] max-w-[640px] [text-shadow:0_2px_16px_rgba(10,24,44,0.45)]">
            {isTh ? (
              <>
                ชวนเพื่อนเล่าเรื่องเที่ยว
                <br />
                แชร์ทริปในแบบของคุณ
              </>
            ) : (
              <>
                Share Your Travel
                <br />
                Stories Together
              </>
            )}
          </h1>

          {/* Compact Icon Metadata Row */}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[12.5px] sm:text-[13.5px] font-medium text-white/95 [text-shadow:0_1px_10px_rgba(10,24,44,0.45)]">
            <span className="inline-flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-[#8cc8ff]" />
              <span>
                {totalTripsCount > 0
                  ? isTh
                    ? `${totalTripsCount} ทริปที่เพื่อนแชร์ไว้`
                    : `${totalTripsCount} Shared Community Trips`
                  : isTh
                  ? "เปิดพื้นที่เล่าเรื่องเที่ยว"
                  : "Open Community Stories"}
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-[#8cc8ff]" />
              <span>{isTh ? "บันทึก & ตามรอยได้ฟรี" : "Save & Follow Free"}</span>
            </span>
          </div>

          {/* Subtle Scroll Affordance Hint (Fades out as vista widens) */}
          <div
            ref={scrollHintRef}
            aria-hidden="true"
            className="mt-4 inline-flex items-center gap-1 text-[11.5px] font-medium text-white/80 transition-opacity duration-200"
          >
            <span>
              {isTh ? "เลื่อนลงเพื่อเปิดวิวกว้าง" : "Scroll to widen the view"}
            </span>
            <ChevronDown className="w-3.5 h-3.5" />
          </div>
        </div>
      </section>
    </div>
  );
}
