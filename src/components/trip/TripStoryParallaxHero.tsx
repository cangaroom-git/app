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
  const brandLogoLayerRef = useRef<HTMLDivElement | null>(null);
  const travellerLayerRef = useRef<HTMLDivElement | null>(null);
  const contentLayerRef = useRef<HTMLDivElement | null>(null);
  const scrollHintRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const reducedMotionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );
    if (reducedMotionQuery.matches) return;

    // Modern browsers (Chrome/Edge/Safari 26+) run the parallax 100% on the GPU compositor
    // via CSS `animation-timeline: view()` in globals.css with zero main-thread JS scroll lag.
    if (
      typeof window.CSS !== "undefined" &&
      typeof window.CSS.supports === "function" &&
      window.CSS.supports("animation-timeline", "view()")
    ) {
      return;
    }

    // Fallback for older iOS Safari / Firefox:
    // Cache runway geometry ONCE (never call getBoundingClientRect/offsetHeight inside scroll!)
    // so every scroll frame only reads `window.scrollY` and writes GPU `translate3d`.
    let rafId: number | null = null;
    let cachedRunwayTop = 0;
    let cachedScrubRange = 1;
    let cachedStickyTop = 0;
    let cachedIsDesktop = window.innerWidth >= 1024;
    let lastMeasuredWidth = window.innerWidth;

    const measureGeometry = () => {
      const runwayEl = runwayRef.current;
      const stageEl = stickyStageRef.current;
      if (!runwayEl || !stageEl) return;
      cachedIsDesktop = window.innerWidth >= 1024;
      cachedStickyTop = cachedIsDesktop ? 72 : 0;
      const rect = runwayEl.getBoundingClientRect();
      cachedRunwayTop = rect.top + window.scrollY;
      cachedScrubRange = Math.max(
        runwayEl.offsetHeight - stageEl.offsetHeight,
        1
      );
    };

    const applyStickyPanorama = () => {
      rafId = null;
      const scrollDelta = window.scrollY + cachedStickyTop - cachedRunwayTop;
      const rawProgress = Math.max(
        0,
        Math.min(1, scrollDelta / cachedScrubRange)
      );
      const eased = 1 - Math.pow(1 - rawProgress, 1.45);

      if (bgLayerRef.current) {
        const bgScale = cachedIsDesktop
          ? 1.42 - eased * 0.42
          : 1.22 - eased * 0.22;
        const bgY = cachedIsDesktop ? 28 - eased * 50 : 18 - eased * 32;
        bgLayerRef.current.style.transform = `translate3d(0, ${bgY.toFixed(1)}px, 0) scale(${bgScale.toFixed(4)})`;
      }

      if (brandLogoLayerRef.current) {
        const logoProgress = Math.max(
          0,
          Math.min(1, (rawProgress - 0.12) / 0.72)
        );
        const logoEased = 1 - Math.pow(1 - logoProgress, 1.75);
        const logoOpacity = logoEased * 0.92;
        const logoY = 56 - logoEased * 56;
        const logoScale = 0.92 + logoEased * 0.1;
        brandLogoLayerRef.current.style.opacity = logoOpacity.toFixed(3);
        brandLogoLayerRef.current.style.transform = `translate3d(0, ${logoY.toFixed(1)}px, 0) scale(${logoScale.toFixed(4)})`;
      }

      if (travellerLayerRef.current) {
        const fgScale = cachedIsDesktop
          ? 1.22 - eased * 0.22
          : 1.13 - eased * 0.13;
        const fgY = cachedIsDesktop ? 54 - eased * 54 : 34 - eased * 34;
        travellerLayerRef.current.style.transform = `translate3d(0, ${fgY.toFixed(1)}px, 0) scale(${fgScale.toFixed(4)})`;
      }

      if (contentLayerRef.current) {
        const contentY = -eased * 14;
        contentLayerRef.current.style.transform = `translate3d(0, ${contentY.toFixed(1)}px, 0)`;
      }

      if (scrollHintRef.current) {
        const hintOpacity = Math.max(0, Math.min(1, 1 - rawProgress * 4));
        scrollHintRef.current.style.opacity = hintOpacity.toFixed(3);
      }
    };

    const handleScroll = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(applyStickyPanorama);
    };

    const handleResize = () => {
      // Ignore mobile URL-bar height-only resize jitter mid-scroll
      if (Math.abs(window.innerWidth - lastMeasuredWidth) < 2) return;
      lastMeasuredWidth = window.innerWidth;
      measureGeometry();
      handleScroll();
    };

    measureGeometry();
    applyStickyPanorama();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize, { passive: true });

    return () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div
      ref={runwayRef}
      className="cgr-trip-hero-runway relative w-full lg:max-w-[min(1380px,calc((100vh-84px)*1.72))] lg:mx-auto h-[175svh] lg:h-[195vh]"
    >
      <section
        ref={stickyStageRef}
        aria-label={isTh ? "เล่าเรื่องเที่ยวบน Nondii" : "Nondii Travel Stories"}
        className="cgr-trip-hero-stage sticky top-0 lg:top-[72px] w-full h-[100svh] lg:h-[calc(100vh-84px)] min-h-[540px] overflow-hidden rounded-none lg:rounded-[28px] bg-[#2a629a] flex flex-col justify-end select-none"
      >
        {/* Layer 0: Uninterrupted Mountain & Sky Panorama (4K AVIF + WebP + Compositor Dolly-Out) */}
        <div
          ref={bgLayerRef}
          className="cgr-trip-hero-layer cgr-trip-hero-bg pointer-events-none absolute -inset-6 lg:-inset-9"
        >
          <picture className="block w-full h-full">
            <source
              media="(max-width: 1023px)"
              srcSet="/brand/nondii-trip-bg-4k-mobile.avif"
              type="image/avif"
            />
            <source
              media="(max-width: 1023px)"
              srcSet="/brand/nondii-trip-bg-4k-mobile.webp"
              type="image/webp"
            />
            <source
              srcSet="/brand/nondii-trip-bg-4k-desktop.avif"
              type="image/avif"
            />
            <img
              src="/brand/nondii-trip-bg-4k-desktop.webp"
              alt=""
              aria-hidden="true"
              fetchPriority="high"
              decoding="async"
              className="w-full h-full object-cover object-center"
            />
          </picture>
        </div>

        {/* Layer 0.5: Pure White Nondii Wordmark SVG (Zero CSS filter/drop-shadow overhead!) */}
        <div
          ref={brandLogoLayerRef}
          aria-hidden="true"
          className="cgr-trip-hero-layer cgr-trip-hero-logo pointer-events-none absolute inset-x-0 top-[14%] sm:top-[12%] lg:top-[10%] flex justify-center px-6"
        >
          <img
            src="/brand/nondii-text-white.svg"
            alt=""
            aria-hidden="true"
            decoding="async"
            className="w-[82%] sm:w-[70%] lg:w-[58%] max-w-[780px] h-auto"
          />
        </div>

        {/* Layer 1: Ultra-Sharp 5.5K Traveller Standing On Summit Ground Ledge (AVIF + WebP) */}
        <div
          ref={travellerLayerRef}
          className="cgr-trip-hero-layer cgr-trip-hero-fg pointer-events-none absolute inset-x-0 top-0 bottom-0 flex items-end justify-center"
        >
          <picture className="block w-full h-full">
            <source
              media="(max-width: 1023px)"
              srcSet="/brand/nondii-trip-girl-4k-mobile.avif"
              type="image/avif"
            />
            <source
              media="(max-width: 1023px)"
              srcSet="/brand/nondii-trip-girl-4k-mobile.webp"
              type="image/webp"
            />
            <source
              srcSet="/brand/nondii-trip-girl-4k-desktop.avif"
              type="image/avif"
            />
            <img
              src="/brand/nondii-trip-girl-4k-desktop.webp"
              alt={
                isTh
                  ? "นักเดินทางยืนบนยอดผาถือกล้องมองวิวภูเขา"
                  : "Traveller standing on mountain summit ledge holding camera"
              }
              fetchPriority="high"
              decoding="async"
              className="w-full h-full object-cover object-[50%_100%]"
            />
          </picture>
        </div>

        {/* Layer 2: Calm Twilight-Blue Atmospheric Scrim For Crisp White Copy */}
        <div
          aria-hidden="true"
          className="cgr-trip-hero-scrim pointer-events-none absolute inset-x-0 bottom-0 h-[56%] sm:h-[52%]"
        />

        {/* Layer 3: Storytelling Invitation Copy */}
        <div
          ref={contentLayerRef}
          className="cgr-trip-hero-layer cgr-trip-hero-copy relative z-20 px-5 sm:px-6 lg:px-8 pb-[calc(var(--cgr-mobile-nav-h)+42px)] sm:pb-[calc(var(--cgr-mobile-nav-h)+48px)] lg:pb-8 pt-16 flex flex-col items-center text-center"
        >
          {/* Display Headline */}
          <h1 className="text-[28px] sm:text-[36px] lg:text-[42px] font-bold tracking-[-0.025em] text-white leading-[1.15] max-w-[640px] [text-shadow:0_2px_14px_rgba(10,24,44,0.42)]">
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
          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[12.5px] sm:text-[13.5px] font-medium text-white/95 [text-shadow:0_1px_10px_rgba(10,24,44,0.42)]">
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
            className="cgr-trip-hero-hint mt-4 inline-flex items-center gap-1 text-[11.5px] font-medium text-white/80"
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
