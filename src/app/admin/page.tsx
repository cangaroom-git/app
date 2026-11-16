"use client";

import React from "react";
import Link from "next/link";
import { ChevronLeft, Moon, Pencil, ShieldCheck, Sun } from "lucide-react";
import { useSapanStore } from "@/lib/store";
import { useHotelApp } from "@/components/HotelAppShell";
import { HotelAdminPanel } from "@/components/admin/HotelAdminPanel";
import { StatusPill } from "@/components/ui/standards";

export default function HotelAdminDashboardPage() {
  const { resetStoreToDefault } = useSapanStore();
  const {
    propertyConfig,
    rooms,
    coupons,
    addons,
    bookings,
    pendingAdminCount,
    saveStore,
    lang: language,
    setLang,
    theme,
    toggleTheme,
  } = useHotelApp();

  return (
    <div className="min-h-[100dvh] pt-12 bg-[var(--color-background-body)] text-[var(--color-text-primary)]">
      {/* Slim Always-Sticky Top Bar for Hotel Admin Settings (h-12 = 48px) */}
      <header className="fixed top-0 inset-x-0 z-40 h-12 bg-[var(--color-background-body)]/92 backdrop-blur-xl shadow-[0_2px_14px_rgba(15,23,42,0.05)]">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Link
              href="/"
              className="h-8 px-3 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] ty-caption font-semibold inline-flex items-center gap-1.5 shrink-0 transition"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>{language === "th" ? "หน้าร้าน" : "Storefront"}</span>
            </Link>

            <div className="h-8 w-8 rounded-[10px] bg-[var(--color-accent)] text-[var(--color-on-accent)] flex items-center justify-center font-bold ty-caption shrink-0">
              {propertyConfig.brandCode.slice(0, 2)}
            </div>
            <span className="ty-body font-bold truncate max-w-[160px] sm:max-w-xs">
              {language === "th"
                ? propertyConfig.nameTh
                : propertyConfig.nameEn}
            </span>
            <span className="hidden md:inline-flex">
              <StatusPill variant="accent">Admin Studio</StatusPill>
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Link
              href="/?edit=1"
              className="h-8 px-3 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-on-accent)] ty-caption font-semibold inline-flex items-center gap-1.5 transition"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>
                {language === "th" ? "แก้ไขบนหน้าเว็บจริง" : "Edit Live Site"}
              </span>
            </Link>

            <Link
              href="/super-admin"
              className="hidden sm:inline-flex h-8 px-3 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] ty-caption font-semibold items-center gap-1.5 transition"
              title="Super Admin Portal"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>SaaS</span>
            </Link>

            <button
              type="button"
              onClick={() => setLang(language === "th" ? "en" : "th")}
              className="btn-icon cursor-pointer ty-caption font-bold"
              title={
                language === "th" ? "Switch to English" : "เปลี่ยนเป็นภาษาไทย"
              }
              aria-label="Toggle language"
            >
              {language === "th" ? "EN" : "TH"}
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              className="btn-icon cursor-pointer"
              title={theme === "dark" ? "Light Mode" : "Dark Mode"}
              aria-label="Toggle Dark or Light Mode"
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Split-Pane Settings Workspace */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <HotelAdminPanel
          propertyConfig={propertyConfig}
          rooms={rooms}
          coupons={coupons}
          addons={addons}
          bookings={bookings}
          pendingAdminCount={pendingAdminCount}
          saveStore={saveStore}
          onResetStore={resetStoreToDefault}
          language={language}
          onChangeLanguage={setLang}
        />
      </main>
    </div>
  );
}
