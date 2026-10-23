"use client";

import React from "react";
import Link from "next/link";
import { ChevronLeft, Sun, Moon } from "lucide-react";
import { useSapanStore } from "@/lib/store";
import { useHotelApp } from "@/components/HotelAppShell";
import { HotelOwnerStudioPanel } from "@/components/HotelOwnerStudioPanel";

export default function WhiteLabelAdminDashboardPage() {
  const { resetStoreToDefault } = useSapanStore();
  const {
    propertyConfig,
    rooms,
    coupons,
    addons,
    bookings,
    pendingAdminCount,
    saveStore,
    lang,
    setLang,
    theme,
    toggleTheme,
  } = useHotelApp();

  return (
    <div className="min-h-screen bg-[var(--color-background-body)] text-[var(--color-text-primary)]">
      {/* Minimalist App Top Bar for Admin Settings */}
      <header className="sticky top-0 z-40 h-14 bg-[var(--color-background-card)]/90 backdrop-blur-md border-b border-[var(--color-border)]">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="btn-fw-secondary !py-1.5 !px-3.5">
              <ChevronLeft className="w-4 h-4" />
              <span>{lang === "th" ? "กลับหน้าแอป" : "Back to App"}</span>
            </Link>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-[10px] bg-[var(--color-accent)] text-[var(--color-on-accent)] flex items-center justify-center font-bold text-[12px]">
                {propertyConfig.brandCode.slice(0, 2)}
              </div>
              <span className="ty-body font-semibold truncate max-w-[180px] sm:max-w-xs">
                {lang === "th" ? propertyConfig.nameTh : propertyConfig.nameEn}
              </span>
              <span className="hidden sm:inline-flex items-center rounded-full bg-[var(--color-background-muted)] px-2.5 py-0.5 ty-caption font-semibold">
                Admin Settings
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="btn-round-border !py-1.5 !px-3"
              title="Toggle Dark / Light Mode"
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">
                {theme === "dark" ? "Light" : "Dark"}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setLang(lang === "th" ? "en" : "th")}
              className="btn-round-border !py-1.5 !px-3.5"
            >
              <span>{lang === "th" ? "ไทย (TH)" : "English (EN)"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Settings Layout */}
      <main className="py-3 sm:py-5">
        <HotelOwnerStudioPanel
          propertyConfig={propertyConfig}
          rooms={rooms}
          coupons={coupons}
          addons={addons}
          bookings={bookings}
          pendingAdminCount={pendingAdminCount}
          saveStore={saveStore}
          onResetStore={resetStoreToDefault}
          lang={lang}
          onChangeLang={setLang}
        />
      </main>
    </div>
  );
}
