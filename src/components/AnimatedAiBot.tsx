"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Send, Mic } from "lucide-react";

export interface AnimatedAiBotAvatarProps {
  size?: "sm" | "md" | "lg";
  isActive?: boolean;
  isSpeaking?: boolean;
  inverted?: boolean;
  className?: string;
}

const SIZE_MAP = {
  sm: "w-8 h-8",
  md: "w-11 h-11",
  lg: "w-12 h-12",
};

/**
 * Minimalist Monochrome Animated AI Bot Avatar
 * Strictly uses theme tokens (--color-accent & --color-on-accent) with zero cartoon/neon colors.
 * Features smooth floating motion, blinking/glancing eyes, and subtle signal pulse.
 */
export function AnimatedAiBotAvatar({
  size = "md",
  isActive = false,
  isSpeaking = false,
  inverted = false,
  className = "",
}: AnimatedAiBotAvatarProps) {
  const [eyeState, setEyeState] = useState<
    "normal" | "blink" | "lookLeft" | "lookRight" | "happy"
  >("normal");

  useEffect(() => {
    const sequence: Array<
      "normal" | "blink" | "lookLeft" | "lookRight" | "happy"
    > = [
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
    let idx = 0;
    const timer = setInterval(() => {
      idx = (idx + 1) % sequence.length;
      setEyeState(sequence[idx]);
    }, 1500);
    return () => clearInterval(timer);
  }, []);

  const currentEye = isActive ? "happy" : eyeState;
  const eyeOffsetX =
    currentEye === "lookLeft" ? -2.5 : currentEye === "lookRight" ? 2.5 : 0;

  const containerColors = inverted
    ? "bg-[var(--color-on-accent)] text-[var(--color-accent)]"
    : "bg-[var(--color-accent)] text-[var(--color-on-accent)]";

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 select-none rounded-full ${SIZE_MAP[size]} ${containerColors} ${className}`}
    >
      {/* Subtle monochrome pulse ring when active/speaking */}
      {(isActive || isSpeaking) && (
        <motion.span
          animate={{ scale: [1, 1.18, 1], opacity: [0.25, 0, 0.25] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="pointer-events-none absolute inset-0 rounded-full border border-current"
        />
      )}

      {/* Minimalist Monochrome SVG Bot */}
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
        {/* Antenna Stem */}
        <line
          x1="32"
          y1="9"
          x2="32"
          y2="16"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
        {/* Pulsing Antenna Dot */}
        <motion.circle
          cx="32"
          cy="7.5"
          r="3"
          fill="currentColor"
          animate={{ scale: [1, 1.35, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Side Ears */}
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

        {/* Bot Head Outline (Rounded Pill Frame) */}
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

        {/* Animated Eyes inside Visor */}
        <g transform={`translate(${eyeOffsetX}, 0)`}>
          {currentEye === "blink" ? (
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
          ) : currentEye === "happy" ? (
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

        {/* Minimalist Mouth / Voice Equalizer */}
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

      {/* Minimal Online Status Dot */}
      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-[var(--color-background-card)]" />
    </div>
  );
}

export interface AiConciergeHeroBoxProps {
  lang: "th" | "en";
  promptValue: string;
  onPromptChange: (val: string) => void;
  onSubmitPrompt: (e: React.FormEvent) => void;
  onQuickPromptClick: (promptText: string) => void;
  onOpenFullChat: () => void;
}

/**
 * Prominent, Icon-First Single Pill AI Bar for the Home Feed (#overview)
 * - Larger height (h-14 / h-16) so it stands out cleanly above the Reels slider
 * - Monochrome Animated Bot on the left
 * - Voice Mic button (Web Speech API + fallback) + solid Send icon button on the right
 */
export function AiConciergeHeroBox({
  lang,
  promptValue,
  onPromptChange,
  onSubmitPrompt,
  onQuickPromptClick,
  onOpenFullChat,
}: AiConciergeHeroBoxProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isListening, setIsListening] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestTranscriptRef = useRef<string>("");

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
      }
    };
  }, []);

  const handleToggleVoice = () => {
    // Stop if already listening
    if (isListening) {
      setIsListening(false);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
      const captured = latestTranscriptRef.current.trim() || promptValue.trim();
      if (captured) {
        onPromptChange("");
        latestTranscriptRef.current = "";
        onQuickPromptClick(captured);
      }
      return;
    }

    // Try native Web Speech API (Chrome / Safari / iOS / Android)
    const SpeechRecognitionAPI =
      typeof window !== "undefined"
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (window as any).SpeechRecognition ||
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (window as any).webkitSpeechRecognition
        : null;

    if (SpeechRecognitionAPI) {
      try {
        const recognition = new SpeechRecognitionAPI();
        recognition.lang = lang === "th" ? "th-TH" : "en-US";
        recognition.interimResults = true;
        recognition.continuous = false;
        recognitionRef.current = recognition;
        latestTranscriptRef.current = "";
        setIsListening(true);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onresult = (event: any) => {
          let transcript = "";
          for (let i = 0; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          latestTranscriptRef.current = transcript;
          onPromptChange(transcript);
        };

        recognition.onend = () => {
          setIsListening(false);
          const finalSpeech = latestTranscriptRef.current.trim();
          if (finalSpeech) {
            onPromptChange("");
            latestTranscriptRef.current = "";
            onQuickPromptClick(finalSpeech);
          }
        };

        recognition.onerror = () => {
          setIsListening(false);
        };

        recognition.start();
        return;
      } catch {
        // Fall through to simulated voice fallback if blocked
      }
    }

    // Fallback when browser doesn't support SpeechRecognition
    setIsListening(true);
    const sampleVoice =
      lang === "th"
        ? "เช็คห้องว่างสำหรับ 2 ท่าน พร้อมคูปองส่วนลดครับ"
        : "Check available villas for 2 guests and promo codes";
    onPromptChange(sampleVoice);
    fallbackTimerRef.current = setTimeout(() => {
      setIsListening(false);
      onPromptChange("");
      onQuickPromptClick(sampleVoice);
    }, 1600);
  };

  const isBotActive = isFocused || isListening || promptValue.trim().length > 0;

  return (
    <form onSubmit={onSubmitPrompt} className="mb-4 px-5">
      <div
        className={`flex items-center w-full rounded-full bg-[var(--color-background-muted)] border transition-all duration-200 pl-2 pr-2 h-14 sm:h-16 ${
          isBotActive
            ? "border-[var(--color-text-primary)] bg-[var(--color-background-card)] shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
            : "border-[var(--color-border-emphasized)] hover:border-[var(--color-text-primary)]/40"
        }`}
      >
        {/* Left: Live Monochrome Animated Bot Avatar */}
        <button
          type="button"
          onClick={onOpenFullChat}
          title={lang === "th" ? "เปิดแชท AI" : "Open AI Chat"}
          aria-label={lang === "th" ? "เปิดแชท AI" : "Open AI Chat"}
          className="mr-3 shrink-0 cursor-pointer hover:scale-105 active:scale-95 transition-transform"
        >
          <AnimatedAiBotAvatar
            size="md"
            isActive={isBotActive}
            isSpeaking={isListening}
          />
        </button>

        {/* Center: Minimal Text Input */}
        <input
          type="text"
          value={promptValue}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onChange={(e) => onPromptChange(e.target.value)}
          placeholder={
            isListening
              ? lang === "th"
                ? "กำลังฟังเสียงพูด..."
                : "Listening..."
              : lang === "th"
              ? "ถาม AI..."
              : "Ask AI..."
          }
          className="flex-1 min-w-0 bg-transparent ty-body font-medium text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none"
        />

        {/* Right: Voice Mic Button + Send Button */}
        <div className="flex items-center gap-1.5 ml-2 shrink-0">
          <button
            type="button"
            onClick={handleToggleVoice}
            title={
              isListening
                ? lang === "th"
                  ? "แตะเพื่อหยุดพูด"
                  : "Tap to stop listening"
                : lang === "th"
                ? "พูดด้วยเสียง"
                : "Voice input"
            }
            aria-label={lang === "th" ? "พูดด้วยเสียง" : "Voice input"}
            className={`relative h-10 w-10 sm:h-11 sm:w-11 rounded-full inline-flex items-center justify-center transition-all cursor-pointer ${
              isListening
                ? "bg-[var(--color-accent)] text-[var(--color-on-accent)] scale-105"
                : "hover:bg-[var(--color-overlay-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            {isListening && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-accent)] opacity-30" />
            )}
            <Mic className="w-4 h-4 relative z-10" />
          </button>

          <button
            type="submit"
            title={lang === "th" ? "ส่งข้อความถึง AI" : "Send to AI"}
            aria-label={lang === "th" ? "ส่งข้อความถึง AI" : "Send to AI"}
            className="h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-[var(--color-accent)] text-[var(--color-on-accent)] inline-flex items-center justify-center shrink-0 hover:opacity-90 active:scale-95 transition-all cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </form>
  );
}
