"use client";

import React, { useEffect, useRef } from "react";
import {
  BedDouble,
  Coffee,
  Compass,
  Sparkles,
  UtensilsCrossed,
  Wine,
} from "lucide-react";
import type { HomePromoTabId } from "@/lib/placeCategories";
import { useHeroThemeColor } from "@/lib/useHeroThemeColor";

interface HomeCollectibleHeroProps {
  language: "th" | "en";
  activeTab: HomePromoTabId;
  onSelectCategory: (tabId: HomePromoTabId) => void;
}

const HERO_CATEGORY_ICONS: Array<{
  id: Exclude<HomePromoTabId, "all">;
  labelTh: string;
  labelEn: string;
  icon: typeof BedDouble;
}> = [
  { id: "stay", labelTh: "ที่พัก", labelEn: "Stays", icon: BedDouble },
  { id: "cafe", labelTh: "คาเฟ่", labelEn: "Cafes", icon: Coffee },
  {
    id: "restaurant",
    labelTh: "อาหาร",
    labelEn: "Dining",
    icon: UtensilsCrossed,
  },
  { id: "bar", labelTh: "บาร์", labelEn: "Bars", icon: Wine },
  { id: "wellness", labelTh: "สปา", labelEn: "Spa", icon: Sparkles },
  { id: "attraction", labelTh: "กิจกรรม", labelEn: "Activities", icon: Compass },
];

/**
 * Apple-Style Smooth Inertia-Damped Full-Viewport Sticky Hero for Home (`/`):
 * - Uses delta-time exponential damping (`1 - exp(-dt * lambda)`) on GPU `translate3d + scale`
 *   so stepped mouse wheels & quick mobile swipes glide with liquid Apple-keynote silkiness
 *   (and auto-sleeps rAF at 0% idle CPU the moment motion settles!).
 * - Renders the 4K 3D Beachfront Card at `scale(1.0)` 1:1 Retina clarity:
 *   - Mobile `scrollY = 0`: edge-to-edge tropical beach & sea panorama
 *   - Desktop `scrollY = 0`: sea edge anchored cleanly along the bottom of the Hero frame
 *   - On scroll: smoothly scales DOWN & lifts into a complete floating 3D Collectible Card!
 */
export function HomeCollectibleHero({
  language,
  activeTab,
  onSelectCategory,
}: HomeCollectibleHeroProps) {
  const isTh = language === "th";
  const bgLayerRef = useRef<HTMLDivElement | null>(null);
  const headerLayerRef = useRef<HTMLDivElement | null>(null);
  const islandLayerRef = useRef<HTMLDivElement | null>(null);
  const shadowLayerRef = useRef<HTMLDivElement | null>(null);

  // Sync iOS Safari status bar seamlessly with the top sky edge (#6BA9E2), reverting to canvas when white sheet rises
  useHeroThemeColor("#6BA9E2", 0.66);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let rafId: number | null = null;
    let lastTs = 0;
    let cachedVh = Math.max(window.innerHeight, 540);
    let cachedIsDesktop = window.innerWidth >= 1024;
    let lastWidth = window.innerWidth;

    let targetBg = 0;
    let currentBg = 0;
    let targetCard = 0;
    let currentCard = 0;

    const computeTargets = () => {
      const y = Math.max(0, window.scrollY);
      const bgRange = cachedVh * (cachedIsDesktop ? 0.56 : 0.48);
      const cardRange = cachedVh * (cachedIsDesktop ? 0.38 : 0.28);
      targetBg = Math.max(0, Math.min(1, y / bgRange));
      targetCard = Math.max(0, Math.min(1, y / cardRange));
    };

    const renderFrame = (bgP: number, cardP: number) => {
      const bgEased = 1 - Math.pow(1 - bgP, 1.85);
      const cardEased = 1 - Math.pow(1 - cardP, 1.9);

      if (bgLayerRef.current) {
        const bgScale = cachedIsDesktop
          ? 1.26 - bgEased * 0.26
          : 1.2 - bgEased * 0.2;
        const bgY = cachedIsDesktop ? 18 - bgEased * 38 : 12 - bgEased * 28;
        bgLayerRef.current.style.transform = `translate3d(0, ${bgY.toFixed(2)}px, 0) scale(${bgScale.toFixed(4)})`;
      }

      if (headerLayerRef.current) {
        const headerY = cachedIsDesktop
          ? -cardEased * (cachedVh * 0.045)
          : -cardEased * (cachedVh * 0.085);
        const headerScale = cachedIsDesktop
          ? 1 - cardEased * 0.1
          : 1 - cardEased * 0.14;
        headerLayerRef.current.style.transform = `translate3d(0, ${headerY.toFixed(2)}px, 0) scale(${headerScale.toFixed(4)})`;
      }

      if (islandLayerRef.current) {
        const islandScale = cachedIsDesktop
          ? 1 - cardEased * 0.3
          : 1 - cardEased * 0.58;
        // Desktop scrollY=0 anchors the sparkling turquoise sea flush along the bottom edge of the Hero frame,
        // then smoothly lifts and scales down into a floating 3D card on scroll!
        const startY = cachedIsDesktop ? cachedVh * 0.23 : cachedVh * 0.17;
        const endY = cachedIsDesktop ? -cachedVh * 0.03 : -cachedVh * 0.09;
        const islandY = startY + (endY - startY) * cardEased;
        islandLayerRef.current.style.transform = `translate3d(0, ${islandY.toFixed(2)}px, 0) scale(${islandScale.toFixed(4)})`;
      }

      if (shadowLayerRef.current) {
        const shadowT = Math.max(0, Math.min(1, (cardEased - 0.3) / 0.7));
        shadowLayerRef.current.style.opacity = shadowT.toFixed(3);
        shadowLayerRef.current.style.transform = `scale(${(0.75 + shadowT * 0.25).toFixed(3)})`;
      }
    };

    const tick = (ts: number) => {
      const dt = lastTs ? Math.min(0.05, (ts - lastTs) / 1000) : 0.016;
      lastTs = ts;

      const factor = 1 - Math.exp(-dt * 10.5);
      currentBg += (targetBg - currentBg) * factor;
      currentCard += (targetCard - currentCard) * factor;

      const settled =
        Math.abs(targetBg - currentBg) < 0.0004 &&
        Math.abs(targetCard - currentCard) < 0.0004;

      if (settled) {
        currentBg = targetBg;
        currentCard = targetCard;
        renderFrame(currentBg, currentCard);
        rafId = null;
        lastTs = 0;
        return;
      }

      renderFrame(currentBg, currentCard);
      rafId = window.requestAnimationFrame(tick);
    };

    const wakeLoop = () => {
      computeTargets();
      if (rafId === null) {
        lastTs = 0;
        rafId = window.requestAnimationFrame(tick);
      }
    };

    const handleResize = () => {
      if (Math.abs(window.innerWidth - lastWidth) < 2) return;
      lastWidth = window.innerWidth;
      cachedIsDesktop = window.innerWidth >= 1024;
      cachedVh = Math.max(window.innerHeight, 540);
      wakeLoop();
    };

    computeTargets();
    currentBg = targetBg;
    currentCard = targetCard;
    renderFrame(currentBg, currentCard);

    window.addEventListener("scroll", wakeLoop, { passive: true });
    window.addEventListener("resize", handleResize, { passive: true });

    return () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", wakeLoop);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <section
      aria-label={
        isTh
          ? "Nondii โปรเที่ยวไทย — แหล่งรวมโปรโมชั่นที่เที่ยวในไทย"
          : "Nondii Thailand Travel Deals"
      }
      className="cgr-home-hero-stage sticky top-0 lg:top-[72px] z-0 -mx-4 -mt-[calc(1rem+env(safe-area-inset-top,0px))] sm:-mx-6 sm:-mt-[calc(1.25rem+env(safe-area-inset-top,0px))] lg:mx-auto lg:mt-0 w-auto lg:w-full lg:max-w-[min(1360px,calc((100vh-84px)*1.72))] h-[100svh] lg:h-[calc(100vh-84px)] min-h-[540px] rounded-none lg:rounded-[28px] overflow-hidden bg-[#6BA9E2] flex flex-col items-center justify-center select-none"
    >
      {/* Layer 0: Sky Cloud Background (AVIF 6.6–13.8KB + WebP fallback) */}
      <div
        ref={bgLayerRef}
        className="cgr-home-hero-layer cgr-home-hero-bg pointer-events-none absolute -inset-6 lg:-inset-9"
      >
        <picture className="block w-full h-full">
          <source
            media="(max-width: 767px)"
            srcSet="/brand/hero-slider/opt/sky-cloud-bg-mobile.avif"
            type="image/avif"
          />
          <source
            media="(max-width: 767px)"
            srcSet="/brand/hero-slider/opt/sky-cloud-bg-mobile.webp"
            type="image/webp"
          />
          <source
            srcSet="/brand/hero-slider/opt/sky-cloud-bg-desktop.avif"
            type="image/avif"
          />
          <img
            src="/brand/hero-slider/opt/sky-cloud-bg-desktop.webp"
            alt=""
            aria-hidden="true"
            fetchPriority="high"
            decoding="async"
            className="w-full h-full object-cover object-center"
          />
        </picture>
      </div>

      {/* Layer 0.5: White `☁ nondii` Logo + "โปรเที่ยวไทย" + Subtitle + 6 Frosted-Glass Icons with Short Labels */}
      <div
        ref={headerLayerRef}
        className="cgr-home-hero-layer cgr-home-hero-logo absolute inset-x-0 top-[9svh] sm:top-[8.5svh] lg:top-[7.5%] flex flex-col items-center px-4 z-20 text-center"
      >
        <img
          src="/brand/nondii-icon-with-text-white.svg"
          alt="Nondii"
          decoding="async"
          className="w-[54%] sm:w-[38%] lg:w-[26%] max-w-[330px] h-auto pointer-events-none"
        />

        <p className="mt-1.5 sm:mt-2 text-[21px] sm:text-[25px] lg:text-[27px] font-bold tracking-[-0.02em] text-white leading-tight [text-shadow:0_2px_14px_rgba(12,48,88,0.26)] pointer-events-none">
          {isTh ? "โปรเที่ยวไทย" : "Thailand Travel Deals"}
        </p>

        <p className="mt-1 text-[13px] sm:text-[14.5px] font-medium text-white/92 tracking-[-0.01em] [text-shadow:0_1px_10px_rgba(12,48,88,0.28)] pointer-events-none">
          {isTh
            ? "แหล่งรวมโปรโมชั่นที่เที่ยวในไทย"
            : "Your hub for Thailand travel promotions"}
        </p>

        {/* 6 Apple Frosted-Glass Round Icons + Short Label Underneath */}
        <div
          role="group"
          aria-label={isTh ? "เลือกหมวดโปรโมชั่น" : "Select promotion category"}
          className="mt-3.5 sm:mt-4 flex items-start justify-center gap-2.5 sm:gap-3.5 lg:gap-4"
        >
          {HERO_CATEGORY_ICONS.map((item) => {
            const Icon = item.icon;
            const isSelected = activeTab === item.id;
            const label = isTh ? item.labelTh : item.labelEn;
            return (
              <button
                key={item.id}
                type="button"
                aria-label={label}
                aria-pressed={isSelected}
                onClick={() => onSelectCategory(item.id)}
                className="group/cat flex flex-col items-center gap-1.5 cursor-pointer focus:outline-none min-w-[44px] sm:min-w-[52px]"
              >
                <span
                  className={`h-10 w-10 sm:h-11 sm:w-11 rounded-full backdrop-blur-md border inline-flex items-center justify-center transition-colors duration-200 ${
                    isSelected
                      ? "bg-white border-white text-[var(--color-accent)]"
                      : "bg-white/22 border-white/40 text-white group-hover/cat:bg-white group-hover/cat:border-white group-hover/cat:text-[var(--color-accent)]"
                  }`}
                >
                  <Icon
                    className="w-[18px] h-[18px] sm:w-[19px] sm:h-[19px]"
                    strokeWidth={2}
                  />
                </span>
                <span className="text-[11px] sm:text-[11.5px] font-semibold text-white/95 leading-none whitespace-nowrap [text-shadow:0_1px_8px_rgba(12,48,88,0.32)]">
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Layer 1: 4K 3D Beachfront Travel Card (1:1 Retina scale 1.0 -> down for razor sharpness!) */}
      <div className="relative z-10 w-full flex flex-col items-center justify-center pointer-events-none">
        <div
          ref={islandLayerRef}
          className="cgr-home-hero-layer cgr-home-hero-island w-[182vw] max-w-[760px] sm:w-[135vw] sm:max-w-[780px] lg:w-[760px] xl:w-[840px] 2xl:w-[900px] lg:max-w-none flex flex-col items-center shrink-0"
        >
          <div className="cgr-home-island-float w-full flex flex-col items-center">
            <picture className="block w-full">
              <source
                media="(max-width: 767px)"
                srcSet="/brand/hero-slider/opt/island-4k-mobile.avif"
                type="image/avif"
              />
              <source
                media="(max-width: 767px)"
                srcSet="/brand/hero-slider/opt/island-4k-mobile.webp"
                type="image/webp"
              />
              <source
                srcSet="/brand/hero-slider/opt/island-4k-desktop.avif"
                type="image/avif"
              />
              <img
                src="/brand/hero-slider/opt/island-4k-desktop.webp"
                alt={
                  isTh
                    ? "การ์ดเกาะรีสอร์ตริมทะเล 3 มิติ Nondii โปรเที่ยวไทย"
                    : "Nondii 3D beachfront resort travel card"
                }
                fetchPriority="high"
                decoding="async"
                className="w-full h-auto object-contain"
              />
            </picture>

            {/* Levitation Ground Shadow: Fades in cleanly as card scales down into floating 3D card */}
            <div
              ref={shadowLayerRef}
              aria-hidden="true"
              className="cgr-home-hero-shadow mt-3 h-4 sm:h-5 w-[66%] rounded-full bg-[#0d3b66]/24 blur-[12px]"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
