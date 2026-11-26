"use client";

import React, { useId } from "react";

interface HeroSunlightSkyLayerProps {
  sunCoreRef: React.RefObject<HTMLDivElement | null>;
  sunRaysRef: React.RefObject<HTMLDivElement | null>;
}

interface HeroLensFlareLayerProps {
  flareNearRef: React.RefObject<HTMLDivElement | null>;
  flareMidRef: React.RefObject<HTMLDivElement | null>;
  flareFarRef: React.RefObject<HTMLDivElement | null>;
}

interface OpticalRay {
  angle: number;
  length: number;
  baseHalfWidth: number;
  tipHalfWidth: number;
  opacity: number;
}

/**
 * Wide atmospheric sunbeams with strongly varied short/medium/long lengths.
 * Rendered with soft Gaussian diffusion (`blur-[14px]`) so zero hard edges appear.
 */
const SOFT_LIGHT_SHAFTS: OpticalRay[] = [
  // Very long hero shaft sweeping gently upper-left
  { angle: -156, length: 470, baseHalfWidth: 10, tipHalfWidth: 44, opacity: 0.22 },
  // Short warm pocket beam
  { angle: -131, length: 185, baseHalfWidth: 8, tipHalfWidth: 26, opacity: 0.16 },
  // Long diagonal beam sweeping across sky toward lower-left
  { angle: 164, length: 455, baseHalfWidth: 11, tipHalfWidth: 42, opacity: 0.24 },
  // Medium beam angled steeper downward
  { angle: 136, length: 270, baseHalfWidth: 9, tipHalfWidth: 32, opacity: 0.17 },
  // Long steep downward sun shaft kissing the right water edge
  { angle: 112, length: 420, baseHalfWidth: 9, tipHalfWidth: 36, opacity: 0.2 },
];

/**
 * Delicate diffraction streaks with asymmetric angles & markedly different lengths
 * (from short 115px wisps up to long 445px beams). Each ray uses its own length-matched
 * linear gradient (`0% -> 100%`) so every tip dissolves seamlessly into `#5FAEE9`.
 */
const DIFFRACTION_STREAKS: OpticalRay[] = [
  { angle: -168, length: 245, baseHalfWidth: 2.5, tipHalfWidth: 9, opacity: 0.18 },
  { angle: -152, length: 445, baseHalfWidth: 3.5, tipHalfWidth: 15, opacity: 0.26 },
  { angle: -140, length: 145, baseHalfWidth: 2, tipHalfWidth: 7, opacity: 0.16 },
  { angle: -122, length: 315, baseHalfWidth: 3, tipHalfWidth: 12, opacity: 0.2 },
  { angle: -104, length: 135, baseHalfWidth: 2, tipHalfWidth: 6, opacity: 0.13 },
  { angle: 176, length: 195, baseHalfWidth: 2.2, tipHalfWidth: 8, opacity: 0.17 },
  { angle: 161, length: 430, baseHalfWidth: 3.6, tipHalfWidth: 15, opacity: 0.27 },
  { angle: 148, length: 130, baseHalfWidth: 2, tipHalfWidth: 6.5, opacity: 0.16 },
  { angle: 133, length: 335, baseHalfWidth: 3, tipHalfWidth: 12, opacity: 0.21 },
  { angle: 119, length: 165, baseHalfWidth: 2.2, tipHalfWidth: 7.5, opacity: 0.16 },
  { angle: 106, length: 395, baseHalfWidth: 3.2, tipHalfWidth: 13, opacity: 0.22 },
  { angle: 92, length: 150, baseHalfWidth: 2, tipHalfWidth: 7, opacity: 0.14 },
];

/**
 * Layer 0.25 (`z-[5]`): Soft, Natural, Tucked-Edge Sunlight Haze & Varied-Length Sunbeams.
 * Tucked slightly off the right edge with translucent exponential falloff so the sun blends
 * organically into `#5FAEE9` and keeps the very top strip pure `#5FAEE9` for iOS Dynamic Island.
 */
export function HeroSunlightSkyLayer({
  sunCoreRef,
  sunRaysRef,
}: HeroSunlightSkyLayerProps) {
  const uid = useId().replace(/:/g, "");
  const coreGradId = `cgr-sun-core-${uid}`;
  const scatterGradId = `cgr-sun-scatter-${uid}`;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[5] overflow-hidden select-none"
    >
      {/* Tucked slightly into the right edge so the light feels natural & atmospheric */}
      <div className="absolute right-[-24px] sm:right-[-26px] lg:right-[-32px] top-[28%] sm:top-[30%] lg:top-[35%] h-0 w-0">
        {/* Whisper-Soft Atmospheric Bloom + Translucent Luminous Core */}
        <div
          ref={sunCoreRef}
          className="cgr-home-sun-layer absolute -left-[240px] -top-[240px] sm:-left-[320px] sm:-top-[320px] lg:-left-[430px] lg:-top-[430px] w-[480px] h-[480px] sm:w-[640px] sm:h-[640px] lg:w-[860px] lg:h-[860px] mix-blend-screen"
        >
          <div className="cgr-home-sun-breathe w-full h-full blur-[6px]">
            <svg
              viewBox="0 0 800 800"
              className="w-full h-full overflow-visible"
              fill="none"
            >
              <defs>
                {/* Wide airy sunlit haze dissolving seamlessly into sky blue */}
                <radialGradient id={scatterGradId} cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.54" />
                  <stop offset="14%" stopColor="#f2faff" stopOpacity="0.34" />
                  <stop offset="32%" stopColor="#d6eeff" stopOpacity="0.16" />
                  <stop offset="56%" stopColor="#b0ddff" stopOpacity="0.06" />
                  <stop offset="80%" stopColor="#84c9ff" stopOpacity="0.015" />
                  <stop offset="100%" stopColor="#5FAEE9" stopOpacity="0" />
                </radialGradient>

                {/* Gentle warm-white solar core (translucent, never a harsh white ball) */}
                <radialGradient id={coreGradId} cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.78" />
                  <stop offset="22%" stopColor="#fffef8" stopOpacity="0.6" />
                  <stop offset="48%" stopColor="#f0f9ff" stopOpacity="0.28" />
                  <stop offset="76%" stopColor="#d8f0ff" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </radialGradient>
              </defs>

              <circle cx="400" cy="400" r="395" fill={`url(#${scatterGradId})`} />
              <circle cx="400" cy="400" r="102" fill={`url(#${coreGradId})`} />
            </svg>
          </div>
        </div>

        {/* Scroll-Interactive Feathery Sunbeams (Short, Medium & Long Varied Lengths) */}
        <div
          ref={sunRaysRef}
          className="cgr-home-sun-layer absolute -left-[280px] -top-[280px] sm:-left-[370px] sm:-top-[370px] lg:-left-[500px] lg:-top-[500px] w-[560px] h-[560px] sm:w-[740px] sm:h-[740px] lg:w-[1000px] lg:h-[1000px] mix-blend-screen"
        >
          {/* Pass 1: Misty wide light shafts (`blur-[14px]`) */}
          <svg
            viewBox="0 0 1000 1000"
            className="absolute inset-0 w-full h-full overflow-visible blur-[14px]"
            fill="none"
          >
            <defs>
              {SOFT_LIGHT_SHAFTS.map((ray, idx) => (
                <linearGradient
                  key={idx}
                  id={`cgr-shaft-${uid}-${idx}`}
                  gradientUnits="userSpaceOnUse"
                  x1="500"
                  y1="500"
                  x2={500 + ray.length}
                  y2="500"
                >
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
                  <stop offset="28%" stopColor="#f2faff" stopOpacity="0.52" />
                  <stop offset="68%" stopColor="#d8f0ff" stopOpacity="0.16" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </linearGradient>
              ))}
            </defs>

            {SOFT_LIGHT_SHAFTS.map((ray, idx) => (
              <g key={idx} transform={`rotate(${ray.angle} 500 500)`}>
                <polygon
                  points={`500,${500 - ray.baseHalfWidth} ${500 + ray.length},${500 - ray.tipHalfWidth} ${500 + ray.length},${500 + ray.tipHalfWidth} 500,${500 + ray.baseHalfWidth}`}
                  fill={`url(#cgr-shaft-${uid}-${idx})`}
                  opacity={ray.opacity}
                />
              </g>
            ))}
          </svg>

          {/* Pass 2: Feathery varied-length diffraction streaks (`blur-[4px]`) */}
          <svg
            viewBox="0 0 1000 1000"
            className="absolute inset-0 w-full h-full overflow-visible blur-[4px]"
            fill="none"
          >
            <defs>
              {DIFFRACTION_STREAKS.map((ray, idx) => (
                <linearGradient
                  key={idx}
                  id={`cgr-streak-${uid}-${idx}`}
                  gradientUnits="userSpaceOnUse"
                  x1="500"
                  y1="500"
                  x2={500 + ray.length}
                  y2="500"
                >
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.92" />
                  <stop offset="22%" stopColor="#ffffff" stopOpacity="0.54" />
                  <stop offset="58%" stopColor="#e8f6ff" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </linearGradient>
              ))}
            </defs>

            {DIFFRACTION_STREAKS.map((ray, idx) => (
              <g key={idx} transform={`rotate(${ray.angle} 500 500)`}>
                <polygon
                  points={`500,${500 - ray.baseHalfWidth} ${500 + ray.length},${500 - ray.tipHalfWidth} ${500 + ray.length},${500 + ray.tipHalfWidth} 500,${500 + ray.baseHalfWidth}`}
                  fill={`url(#cgr-streak-${uid}-${idx})`}
                  opacity={ray.opacity}
                />
              </g>
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
}

/**
 * Layer 1.5 (`z-[15]`): Whisper-Soft Multi-Depth Camera-Optics Diagonal Lens-Flare Bokeh.
 * Uses subtle optical feathering (`blur-[1.5px]`–`blur-[4px]`) and delicate translucency so
 * every lens reflection melts naturally into the sky rather than reading as solid circles.
 */
export function HeroLensFlareLayer({
  flareNearRef,
  flareMidRef,
  flareFarRef,
}: HeroLensFlareLayerProps) {
  const uid = useId().replace(/:/g, "");
  const peachGradId = `cgr-flare-peach-${uid}`;
  const cyanGradId = `cgr-flare-cyan-${uid}`;
  const lavenderGradId = `cgr-flare-lavender-${uid}`;
  const pearlMidGradId = `cgr-flare-pearl-mid-${uid}`;
  const pearlFarGradId = `cgr-flare-pearl-far-${uid}`;
  const ghostGradId = `cgr-flare-ghost-${uid}`;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[15] overflow-hidden select-none"
    >
      {/* Depth Plane 1 (Near Sun): Delicate Blush-Peach & Mint-Cyan Bokeh */}
      <div
        ref={flareNearRef}
        className="cgr-home-sun-layer absolute inset-0 mix-blend-screen"
      >
        <svg
          viewBox="0 0 100 100"
          className="absolute right-[9.5%] sm:right-[10.5%] lg:right-[10.5%] top-[31.5%] sm:top-[34.5%] lg:top-[39.5%] w-[24px] h-[24px] sm:w-[32px] sm:h-[32px] lg:w-[40px] lg:h-[40px] blur-[2px]"
        >
          <defs>
            <radialGradient id={peachGradId} cx="48%" cy="48%" r="52%">
              <stop offset="0%" stopColor="#fff4f7" stopOpacity="0.28" />
              <stop offset="62%" stopColor="#ffdce8" stopOpacity="0.2" />
              <stop offset="82%" stopColor="#ffd0df" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#ffdce8" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="50" cy="50" r="46" fill={`url(#${peachGradId})`} />
        </svg>

        <svg
          viewBox="0 0 100 100"
          className="absolute right-[15.5%] sm:right-[16.5%] lg:right-[15.8%] top-[33%] sm:top-[36%] lg:top-[41.5%] w-[28px] h-[28px] sm:w-[38px] sm:h-[38px] lg:w-[48px] lg:h-[48px] blur-[2.5px]"
        >
          <defs>
            <radialGradient id={cyanGradId} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#eafffb" stopOpacity="0.3" />
              <stop offset="60%" stopColor="#c2f8f1" stopOpacity="0.2" />
              <stop offset="82%" stopColor="#a3eef6" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#c2f8f1" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="50" cy="50" r="46" fill={`url(#${cyanGradId})`} />
        </svg>
      </div>

      {/* Depth Plane 2 (Mid Optical Axis): Dreamy Lavender Bokeh Ring + Soft Pearl Dot */}
      <div
        ref={flareMidRef}
        className="cgr-home-sun-layer absolute inset-0 mix-blend-screen"
      >
        <svg
          viewBox="0 0 120 120"
          className="absolute right-[21%] sm:right-[22%] lg:right-[21.5%] top-[34%] sm:top-[37%] lg:top-[42%] w-[46px] h-[46px] sm:w-[60px] sm:h-[60px] lg:w-[76px] lg:h-[76px] blur-[2px]"
        >
          <defs>
            <radialGradient id={lavenderGradId} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#eef0ff" stopOpacity="0.2" />
              <stop offset="58%" stopColor="#e2e5ff" stopOpacity="0.17" />
              <stop offset="78%" stopColor="#dfd8ff" stopOpacity="0.26" />
              <stop offset="90%" stopColor="#f0e6ff" stopOpacity="0.14" />
              <stop offset="100%" stopColor="#dfe3ff" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="60" cy="60" r="54" fill={`url(#${lavenderGradId})`} />
        </svg>

        <svg
          viewBox="0 0 60 60"
          className="absolute right-[29.5%] sm:right-[29%] lg:right-[28.2%] top-[37.5%] sm:top-[40.5%] lg:top-[46%] w-[15px] h-[15px] sm:w-[18px] sm:h-[18px] lg:w-[22px] lg:h-[22px] blur-[1px]"
        >
          <defs>
            <radialGradient id={pearlMidGradId} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.68" />
              <stop offset="42%" stopColor="#f5f3ff" stopOpacity="0.34" />
              <stop offset="76%" stopColor="#d9dcff" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="30" cy="30" r="27" fill={`url(#${pearlMidGradId})`} />
        </svg>
      </div>

      {/* Depth Plane 3 (Far Optical Axis): Tiny Pinpoint Glint + Misty Atmospheric Ghost */}
      <div
        ref={flareFarRef}
        className="cgr-home-sun-layer absolute inset-0 mix-blend-screen"
      >
        <svg
          viewBox="0 0 40 40"
          className="absolute right-[36%] sm:right-[35.5%] lg:right-[34.2%] top-[39.5%] sm:top-[42.5%] lg:top-[48.5%] w-[9px] h-[9px] sm:w-[11px] sm:h-[11px] lg:w-[13px] lg:h-[13px] blur-[0.8px]"
        >
          <defs>
            <radialGradient id={pearlFarGradId} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.72" />
              <stop offset="45%" stopColor="#f5f3ff" stopOpacity="0.36" />
              <stop offset="78%" stopColor="#d9dcff" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="20" cy="20" r="18" fill={`url(#${pearlFarGradId})`} />
        </svg>

        <svg
          viewBox="0 0 180 180"
          className="absolute right-[38.5%] sm:right-[39.5%] lg:right-[38%] top-[37.5%] sm:top-[41%] lg:top-[46.5%] w-[84px] h-[84px] sm:w-[110px] sm:h-[110px] lg:w-[144px] lg:h-[144px] blur-[6px]"
        >
          <defs>
            <radialGradient id={ghostGradId} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#e8f4ff" stopOpacity="0.06" />
              <stop offset="62%" stopColor="#d6ecff" stopOpacity="0.1" />
              <stop offset="82%" stopColor="#cce8ff" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#5FAEE9" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="90" cy="90" r="84" fill={`url(#${ghostGradId})`} />
        </svg>
      </div>
    </div>
  );
}
