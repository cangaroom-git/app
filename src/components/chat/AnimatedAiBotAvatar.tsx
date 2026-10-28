"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

export interface AnimatedAiBotAvatarProps {
  size?: "sm" | "md" | "lg";
  isActive?: boolean;
  isSpeaking?: boolean;
  isInverted?: boolean;
  className?: string;
}

const AVATAR_SIZE_CLASS_MAP: Record<"sm" | "md" | "lg", string> = {
  sm: "w-8 h-8",
  md: "w-11 h-11",
  lg: "w-12 h-12",
};

type BotEyeExpression = "normal" | "blink" | "lookLeft" | "lookRight" | "happy";

const BOT_EYE_EXPRESSION_SEQUENCE: BotEyeExpression[] = [
  "normal",
  "blink",
  "normal",
  "lookRight",
  "normal",
  "blink",
  "happy",
  "normal",
  "lookLeft",
  "normal",
];

/**
 * Minimalist Monochrome Animated AI Bot Avatar.
 * Strictly consumes CSS theme tokens (--color-accent, --color-on-accent, --color-success).
 */
export function AnimatedAiBotAvatar({
  size = "md",
  isActive = false,
  isSpeaking = false,
  isInverted = false,
  className = "",
}: AnimatedAiBotAvatarProps) {
  const [idleEyeExpression, setIdleEyeExpression] =
    useState<BotEyeExpression>("normal");

  useEffect(() => {
    let sequenceIndex = 0;
    const intervalTimer = setInterval(() => {
      sequenceIndex = (sequenceIndex + 1) % BOT_EYE_EXPRESSION_SEQUENCE.length;
      setIdleEyeExpression(BOT_EYE_EXPRESSION_SEQUENCE[sequenceIndex]);
    }, 1500);
    return () => clearInterval(intervalTimer);
  }, []);

  const activeEyeExpression: BotEyeExpression = isActive
    ? "happy"
    : idleEyeExpression;

  const eyeHorizontalOffset =
    activeEyeExpression === "lookLeft"
      ? -2.5
      : activeEyeExpression === "lookRight"
      ? 2.5
      : 0;

  const containerColorClasses = isInverted
    ? "bg-[var(--color-on-accent)] text-[var(--color-accent)]"
    : "bg-[var(--color-accent)] text-[var(--color-on-accent)]";

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 select-none rounded-full ${AVATAR_SIZE_CLASS_MAP[size]} ${containerColorClasses} ${className}`}
    >
      {(isActive || isSpeaking) && (
        <motion.span
          animate={{ scale: [1, 1.18, 1], opacity: [0.25, 0, 0.25] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="pointer-events-none absolute inset-0 rounded-full border border-current"
        />
      )}

      <motion.svg
        viewBox="0 0 64 64"
        className="w-[72%] h-[72%] overflow-visible"
        animate={{
          y: [0, -2, 0],
          rotate: isActive ? [0, -3, 3, 0] : [0, -1, 1, 0],
        }}
        transition={{
          duration: isActive ? 1.5 : 2.8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <line
          x1="32"
          y1="9"
          x2="32"
          y2="16"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <motion.circle
          cx="32"
          cy="7.5"
          r="3"
          fill="currentColor"
          animate={{ scale: [1, 1.35, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        />

        <rect
          x="7"
          y="27"
          width="4"
          height="12"
          rx="2"
          fill="currentColor"
          opacity="0.75"
        />
        <rect
          x="53"
          y="27"
          width="4"
          height="12"
          rx="2"
          fill="currentColor"
          opacity="0.75"
        />

        <rect
          x="12"
          y="16"
          width="40"
          height="32"
          rx="14"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.2"
        />

        <g transform={`translate(${eyeHorizontalOffset}, 0)`}>
          {activeEyeExpression === "blink" ? (
            <>
              <line
                x1="21"
                y1="31"
                x2="27"
                y2="31"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <line
                x1="37"
                y1="31"
                x2="43"
                y2="31"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </>
          ) : activeEyeExpression === "happy" ? (
            <>
              <path
                d="M 20.5 32.5 Q 24 27.5 27.5 32.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <path
                d="M 36.5 32.5 Q 40 27.5 43.5 32.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </>
          ) : (
            <>
              <circle cx="24" cy="31" r="3.4" fill="currentColor" />
              <circle cx="40" cy="31" r="3.4" fill="currentColor" />
            </>
          )}
        </g>

        {isSpeaking || isActive ? (
          <g>
            <motion.line
              x1="28"
              y1="40"
              x2="28"
              y2="40"
              stroke="currentColor"
              strokeWidth="2.6"
              strokeLinecap="round"
              animate={{ y1: [40.5, 38.5, 40.5], y2: [40.5, 42.5, 40.5] }}
              transition={{ duration: 0.45, repeat: Infinity }}
            />
            <motion.line
              x1="32"
              y1="39"
              x2="32"
              y2="42"
              stroke="currentColor"
              strokeWidth="2.6"
              strokeLinecap="round"
              animate={{ y1: [38, 40.5, 38], y2: [43, 40.5, 43] }}
              transition={{ duration: 0.45, repeat: Infinity }}
            />
            <motion.line
              x1="36"
              y1="40"
              x2="36"
              y2="40"
              stroke="currentColor"
              strokeWidth="2.6"
              strokeLinecap="round"
              animate={{ y1: [40.5, 38.5, 40.5], y2: [40.5, 42.5, 40.5] }}
              transition={{ duration: 0.45, repeat: Infinity }}
            />
          </g>
        ) : (
          <path
            d="M 28 39.5 Q 32 42.5 36 39.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        )}
      </motion.svg>

      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-[var(--color-success)] ring-2 ring-[var(--color-background-card)]" />
    </div>
  );
}
