"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Check, ChevronDown, RotateCcw, ShieldCheck, X } from "lucide-react";
import type { LanguageCode } from "@/lib/dateFormatters";
import {
  flushTelemetryQueue,
  OPEN_PRIVACY_SETTINGS_EVENT,
  readClientConsentCookie,
  resetClientSessionTaste,
} from "@/lib/telemetry/clientTelemetry";

export interface CookieConsentBannerProps {
  language: LanguageCode;
  theme: "light" | "dark";
}

export function CookieConsentBanner({
  language,
  theme,
}: CookieConsentBannerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [eraseFeedback, setEraseFeedback] = useState<string | null>(null);

  useEffect(() => {
    const current = readClientConsentCookie();
    if (current === "analytics") {
      setAnalyticsEnabled(true);
    } else if (current === "essential") {
      setAnalyticsEnabled(false);
    } else {
      // Soft non-blocking entrance after 1.3s so first-visit hero paint is 100% unobstructed
      const timer = window.setTimeout(() => {
        if (readClientConsentCookie() === "unset") {
          setIsVisible(true);
        }
      }, 1300);
      return () => window.clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    const handleOpenSettings = () => {
      const current = readClientConsentCookie();
      setAnalyticsEnabled(current !== "essential");
      setIsDetailsOpen(true);
      setEraseFeedback(null);
      setIsVisible(true);
    };
    window.addEventListener(OPEN_PRIVACY_SETTINGS_EVENT, handleOpenSettings);
    return () =>
      window.removeEventListener(OPEN_PRIVACY_SETTINGS_EVENT, handleOpenSettings);
  }, []);

  const getViewportBucket = (): "sm" | "md" | "lg" => {
    if (typeof window === "undefined") return "lg";
    if (window.innerWidth < 640) return "sm";
    if (window.innerWidth < 1024) return "md";
    return "lg";
  };

  const submitConsent = useCallback(
    async (choice: "analytics" | "essential") => {
      setIsSaving(true);
      try {
        await fetch("/api/telemetry/consent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            consent: choice,
            preferredLang: language,
            preferredTheme: theme,
            viewportBucket: getViewportBucket(),
          }),
        });

        if (choice === "analytics") {
          // Immediately flush any queued in-session interactions now that consent is granted
          flushTelemetryQueue(false);
        }

        setIsVisible(false);
        setIsDetailsOpen(false);
      } catch {
        setIsVisible(false);
      } finally {
        setIsSaving(false);
      }
    },
    [language, theme]
  );

  const handleEraseMyData = async () => {
    setIsSaving(true);
    try {
      await fetch("/api/telemetry/consent", { method: "DELETE" });
      resetClientSessionTaste();
      setEraseFeedback(
        language === "th"
          ? "ล้างข้อมูลความสนใจเรียบร้อยแล้ว"
          : "Your taste data has been erased."
      );
      window.setTimeout(() => setEraseFeedback(null), 2600);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isVisible) return null;

  return (
    <aside
      aria-label={
        language === "th"
          ? "การตั้งค่าคุกกี้และความเป็นส่วนตัว (PDPA)"
          : "Cookie & Privacy Preferences"
      }
      className="fixed bottom-[calc(76px+env(safe-area-inset-bottom))] inset-x-3 sm:inset-x-auto sm:right-5 lg:bottom-5 z-[76] sm:w-[416px] pointer-events-none select-none animate-fade-in-backdrop"
    >
      <div className="pointer-events-auto rounded-[18px] bg-[var(--color-background-popover)]/96 backdrop-blur-md border border-[var(--color-border)] shadow-[var(--shadow-popover)] p-3.5 sm:p-4 space-y-3">
        {/* Compact Header + Non-Blocking Copy */}
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex items-start gap-2.5 min-w-0">
            <span className="h-7 w-7 rounded-[9px] bg-[var(--color-background-muted)] text-[var(--color-text-primary)] inline-flex items-center justify-center shrink-0 mt-0.5">
              <ShieldCheck className="w-4 h-4" />
            </span>
            <div className="min-w-0 space-y-0.5">
              <p className="text-[13.5px] font-bold text-[var(--color-text-primary)] leading-snug">
                {language === "th"
                  ? "แนะนำที่พักให้ตรงใจคุณมากขึ้น"
                  : "Personalized Stay Discovery"}
              </p>
              <p className="text-[12px] text-[var(--color-text-secondary)] leading-relaxed">
                {language === "th"
                  ? "เราใช้คุกกี้เพื่อจดจำสไตล์ที่พักที่คุณสนใจและพัฒนาเว็บไซต์ตามมาตรฐาน PDPA โดยไม่เก็บเลข IP ดิบของคุณ"
                  : "We use cookies to remember your stay preferences and improve Nondii under Thailand PDPA without storing raw IPs."}
              </p>
            </div>
          </div>

          {readClientConsentCookie() !== "unset" && (
            <button
              type="button"
              onClick={() => {
                setIsVisible(false);
                setIsDetailsOpen(false);
              }}
              aria-label="Close privacy panel"
              className="h-7 w-7 rounded-[9px] hover:bg-[var(--color-background-muted)] inline-flex items-center justify-center text-[var(--color-text-secondary)] cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Expandable PDPA Granular Controls */}
        {isDetailsOpen && (
          <div className="pt-2.5 border-t border-[var(--color-border)] space-y-2.5 text-[12px]">
            {/* 1. Strictly Necessary */}
            <div className="rounded-[12px] bg-[var(--color-background-muted)]/70 p-2.5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold text-[var(--color-text-primary)]">
                  {language === "th"
                    ? "1. คุกกี้ที่จำเป็น (Strictly Necessary)"
                    : "1. Strictly Necessary Cookies"}
                </p>
                <p className="text-[11.5px] text-[var(--color-text-secondary)] mt-0.5">
                  {language === "th"
                    ? "ใช้สำหรับการเข้าสู่ระบบ ความปลอดภัย กระเป๋าคูปอง และขั้นตอนจองห้องพัก"
                    : "Required for login security, coupon wallet, and room booking."}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-[var(--color-background-card)] border border-[var(--color-border)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--color-text-secondary)]">
                {language === "th" ? "เปิดเสมอ" : "Always on"}
              </span>
            </div>

            {/* 2. Analytics & Personalization */}
            <div className="rounded-[12px] bg-[var(--color-background-muted)]/70 p-2.5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold text-[var(--color-text-primary)]">
                  {language === "th"
                    ? "2. วิเคราะห์และจัดฟีดเฉพาะบุคคล"
                    : "2. Taste Personalization & Analytics"}
                </p>
                <p className="text-[11.5px] text-[var(--color-text-secondary)] mt-0.5">
                  {language === "th"
                    ? "จดจำหมวดที่พัก เวลาที่หยุดดูการ์ด ประเภทหน้าจอ และภูมิภาคคร่าวๆ (อายุข้อมูลไม่เกิน 180 วัน)"
                    : "Remembers viewed stay styles, dwell time, device type & coarse region (180-day max retention)."}
                </p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={analyticsEnabled}
                onClick={() => setAnalyticsEnabled((v) => !v)}
                className={`shrink-0 w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer ${
                  analyticsEnabled
                    ? "bg-[#111111] dark:bg-[#f5f5f5]"
                    : "bg-[var(--color-border-emphasized)]"
                }`}
              >
                <span
                  className={`block h-5 w-5 rounded-full transition-transform ${
                    analyticsEnabled
                      ? "translate-x-5 bg-white dark:bg-[#111111]"
                      : "translate-x-0 bg-white"
                  }`}
                />
              </button>
            </div>

            {/* Right to Erasure Action */}
            <div className="flex items-center justify-between gap-2 pt-0.5">
              <button
                type="button"
                disabled={isSaving}
                onClick={handleEraseMyData}
                className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] cursor-pointer transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>
                  {language === "th"
                    ? "ล้างประวัติความสนใจของฉันทันที"
                    : "Erase my taste history"}
                </span>
              </button>

              {eraseFeedback && (
                <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[var(--color-text-primary)]">
                  <Check className="w-3.5 h-3.5" />
                  <span>{eraseFeedback}</span>
                </span>
              )}
            </div>
          </div>
        )}

        {/* Action Row — Strict 2-Button Hierarchy (No Dark Patterns) */}
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <button
            type="button"
            onClick={() => setIsDetailsOpen((v) => !v)}
            className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] cursor-pointer transition-colors"
          >
            <span>
              {language === "th" ? "ตั้งค่า PDPA" : "Customize"}
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform ${
                isDetailsOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          <div className="flex items-center gap-1.5">
            {isDetailsOpen ? (
              <button
                type="button"
                disabled={isSaving}
                onClick={() =>
                  submitConsent(analyticsEnabled ? "analytics" : "essential")
                }
                className="h-9 px-3.5 rounded-[10px] bg-[#111111] dark:bg-[#f5f5f5] !text-white dark:!text-[#111111] text-[12.5px] font-semibold hover:opacity-90 cursor-pointer transition-opacity"
              >
                {language === "th" ? "บันทึกการตั้งค่า" : "Save choices"}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => submitConsent("essential")}
                  className="h-9 px-3 rounded-[10px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[12.5px] font-semibold cursor-pointer transition-colors"
                >
                  {language === "th" ? "จำเป็นเท่านั้น" : "Essential only"}
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => submitConsent("analytics")}
                  className="h-9 px-3.5 rounded-[10px] bg-[#111111] dark:bg-[#f5f5f5] !text-white dark:!text-[#111111] text-[12.5px] font-semibold hover:opacity-90 cursor-pointer transition-opacity"
                >
                  {language === "th" ? "ยอมรับทั้งหมด" : "Accept all"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}

