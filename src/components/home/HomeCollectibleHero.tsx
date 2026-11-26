"use client";

import React, { useEffect, useRef } from "react";

interface HomeCollectibleHeroProps {
  language: "th" | "en";
}

/**
 * 4-Layer Collectible Card Hero for Home (`/`):
 * - Layer 0: Bright Thai Sky + Clouds + Sun Flare (`bg-*.webp`)
 * - Layer 1: Hand Holding 3D Beach Resort Card (`card-*.webp`)
 * - Layer 2: Perspective `nondii` Logo on Water (`logo-*.webp`)
 * - Layer 3: Floating 3D "โปรเที่ยวไทย" Headline (`headline-*.webp`)
 *
 * Uses CSS GPU-only entrance + native CSS `animation-timeline: view()` parallax
 * (with a cached scrollY-only fallback for older iOS Safari / Firefox),
 * zero hover-scale, zero card drop-shadow, and zero CSS filter blur overhead.
 */
export function HomeCollectibleHero({ language }: HomeCollectibleHeroProps) {
  const isTh = language === "th";
  const stageRef = useRef<HTMLElement | null>(null);
  const bgScrollRef = useRef<HTMLDivElement | null>(null);
  const cardScrollRef = useRef<HTMLDivElement | null>(null);
  const headlineScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Skip JS scroll listener when browser supports compositor-driven scroll timelines
    if (
      typeof window.CSS !== "undefined" &&
      typeof window.CSS.supports === "function" &&
      window.CSS.supports("animation-timeline", "view()")
    ) {
      return;
    }

    let rafId: number | null = null;
    let cachedTop = 0;
    let cachedHeight = 320;
    let lastWidth = window.innerWidth;

    const measure = () => {
      const el = stageRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      cachedTop = rect.top + window.scrollY;
      cachedHeight = Math.max(el.offsetHeight, 1);
    };

    const applyParallax = () => {
      rafId = null;
      const progress = Math.max(
        0,
        Math.min(1, (window.scrollY - cachedTop) / cachedHeight)
      );

      if (bgScrollRef.current) {
        const bgY = progress * 26;
        const bgScale = 1 + progress * 0.06;
        bgScrollRef.current.style.transform = `translate3d(0, ${bgY.toFixed(1)}px, 0) scale(${bgScale.toFixed(4)})`;
      }
      if (cardScrollRef.current) {
        const cardY = progress * 14;
        cardScrollRef.current.style.transform = `translate3d(0, ${cardY.toFixed(1)}px, 0)`;
      }
      if (headlineScrollRef.current) {
        const headlineY = -progress * 20;
        headlineScrollRef.current.style.transform = `translate3d(0, ${headlineY.toFixed(1)}px, 0)`;
      }
    };

    const handleScroll = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(applyParallax);
    };

    const handleResize = () => {
      if (Math.abs(window.innerWidth - lastWidth) < 2) return;
      lastWidth = window.innerWidth;
      measure();
      handleScroll();
    };

    measure();
    applyParallax();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize, { passive: true });

    return () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <section
      ref={stageRef}
      aria-label={
        isTh
          ? "Nondii โปรเที่ยวไทย — การ์ดที่พักและที่เที่ยวทั่วไทย"
          : "Nondii Thailand Travel Deals"
      }
      className="cgr-home-hero-stage relative -mx-4 -mt-[calc(1rem+env(safe-area-inset-top,0px))] sm:-mx-6 sm:-mt-[calc(1.25rem+env(safe-area-inset-top,0px))] lg:mx-0 lg:mt-0 lg:w-full aspect-[16/9] sm:aspect-auto sm:h-[340px] md:h-[400px] lg:h-[420px] xl:h-[480px] rounded-none lg:rounded-[26px] overflow-hidden bg-[#2e96eb] mb-0 lg:mb-6 select-none"
    >
      {/* Layer 0: Bright Tropical Sky + Fluffy Clouds + Sun Flare (Fills full width seamlessly) */}
      <div
        ref={bgScrollRef}
        className="cgr-home-hero-layer cgr-home-hero-scroll-bg pointer-events-none absolute -inset-3"
      >
        <div className="cgr-home-hero-enter-bg w-full h-full">
          <picture className="block w-full h-full">
            <source
              media="(max-width: 767px)"
              srcSet="/brand/hero-slider/opt/bg-mobile.webp"
              type="image/webp"
            />
            <img
              src="/brand/hero-slider/opt/bg-desktop.webp"
              alt=""
              aria-hidden="true"
              fetchPriority="high"
              decoding="async"
              className="w-full h-full object-cover object-center"
            />
          </picture>
        </div>
      </div>

      {/* Locked 16:9 Foreground Stage — guarantees pixel-perfect alignment between Card, Logo & Headline on every viewport */}
      <div className="pointer-events-none absolute inset-0 flex items-end justify-center">
        <div className="relative h-full w-full sm:w-auto sm:aspect-[16/9] max-w-full">
          {/* Layers 1 & 2 (Perspective-locked scroll group: Hand + 3D Beach Card + nondii Logo) */}
          <div
            ref={cardScrollRef}
            className="cgr-home-hero-layer cgr-home-hero-scroll-card absolute inset-0"
          >
            {/* Layer 1: Hand Holding 3D Miniature Beach Resort Card */}
            <div className="cgr-home-hero-enter-card absolute inset-0">
              <picture className="block w-full h-full">
                <source
                  media="(max-width: 767px)"
                  srcSet="/brand/hero-slider/opt/card-mobile.webp"
                  type="image/webp"
                />
                <img
                  src="/brand/hero-slider/opt/card-desktop.webp"
                  alt={
                    isTh
                      ? "การ์ดที่พักริมทะเล 3 มิติ Nondii โปรเที่ยวไทย"
                      : "Nondii 3D beachfront stay collectible card"
                  }
                  fetchPriority="high"
                  decoding="async"
                  className="w-full h-full object-contain object-bottom"
                />
              </picture>
            </div>

            {/* Layer 2: Perspective `nondii` Logo Resting on Turquoise Water */}
            <div
              aria-hidden="true"
              className="cgr-home-hero-enter-logo absolute inset-0"
            >
              <picture className="block w-full h-full">
                <source
                  media="(max-width: 767px)"
                  srcSet="/brand/hero-slider/opt/logo-mobile.webp"
                  type="image/webp"
                />
                <img
                  src="/brand/hero-slider/opt/logo-desktop.webp"
                  alt=""
                  aria-hidden="true"
                  fetchPriority="high"
                  decoding="async"
                  className="w-full h-full object-contain object-bottom"
                />
              </picture>
            </div>
          </div>

          {/* Layer 3: Floating 3D "โปรเที่ยวไทย" Headline (Independent faster parallax + subtle sky float) */}
          <div
            ref={headlineScrollRef}
            aria-hidden="true"
            className="cgr-home-hero-layer cgr-home-hero-scroll-headline absolute inset-0"
          >
            <div className="cgr-home-hero-enter-headline absolute inset-0">
              <picture className="block w-full h-full">
                <source
                  media="(max-width: 767px)"
                  srcSet="/brand/hero-slider/opt/headline-mobile.webp"
                  type="image/webp"
                />
                <img
                  src="/brand/hero-slider/opt/headline-desktop.webp"
                  alt=""
                  aria-hidden="true"
                  fetchPriority="high"
                  decoding="async"
                  className="w-full h-full object-contain object-bottom"
                />
              </picture>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
