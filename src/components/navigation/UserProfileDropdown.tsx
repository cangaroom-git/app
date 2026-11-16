"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Compass,
  Globe,
  LogIn,
  Moon,
  Pencil,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Star,
  Sun,
  User,
} from "lucide-react";
import { LanguageCode } from "@/lib/dateFormatters";
import { HotelNavTabId } from "@/components/navigation/NavigationIcons";

export interface UserProfileDropdownProps {
  language: LanguageCode;
  onToggleLanguage: () => void;
  isDarkTheme: boolean;
  onToggleTheme?: () => void;
  activeTab: HotelNavTabId;
  onSelectTab: (tab: HotelNavTabId) => void;
  savedCouponsCount: number;
  onOpenCouponWallet: () => void;
  pendingAdminCount?: number;
  isEditMode?: boolean;
  onToggleEditMode?: () => void;
}

export function UserProfileDropdown({
  language,
  onToggleLanguage,
  isDarkTheme,
  onToggleTheme,
  activeTab,
  onSelectTab,
  savedCouponsCount,
  onOpenCouponWallet,
  pendingAdminCount = 0,
  isEditMode = false,
  onToggleEditMode,
}: UserProfileDropdownProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownWrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isDropdownOpen) {
      return;
    }

    const handlePointerDownOutside = (event: MouseEvent) => {
      if (
        dropdownWrapperRef.current &&
        !dropdownWrapperRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDownOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDownOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDropdownOpen]);

  const isSecondaryRouteActive =
    activeTab === "review" || activeTab === "guide" || activeTab === "setting";

  const handleNavigateMenuTab = (targetTab: HotelNavTabId) => {
    setIsDropdownOpen(false);
    onSelectTab(targetTab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div ref={dropdownWrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setIsDropdownOpen((prevOpen) => !prevOpen)}
        aria-label={language === "th" ? "โปรไฟล์และเมนู" : "Profile and menu"}
        aria-expanded={isDropdownOpen}
        aria-haspopup="menu"
        title={language === "th" ? "โปรไฟล์ & เมนู" : "Profile & Menu"}
        className={`btn-icon btn-icon-lg relative ${
          isDropdownOpen || isSecondaryRouteActive
            ? "!bg-[var(--color-accent-muted)] !text-[var(--color-accent)]"
            : ""
        }`}
      >
        <User className="w-5 h-5" />
        {pendingAdminCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[var(--color-accent)] ring-2 ring-[var(--color-background-card)]" />
        )}
      </button>

      {isDropdownOpen && (
        <div
          role="menu"
          aria-label={language === "th" ? "เมนูผู้ใช้" : "User menu"}
          className="absolute right-0 top-[calc(100%+10px)] z-50 w-[264px] rounded-[20px] bg-[var(--color-background-popover)] p-2 shadow-[var(--shadow-popover)] space-y-0.5"
        >
          {/* 1. Coupon Bag */}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setIsDropdownOpen(false);
              onOpenCouponWallet();
            }}
            className="w-full h-10 px-3 rounded-[12px] bg-[var(--color-promo-muted)] hover:opacity-90 flex items-center justify-between ty-body font-semibold text-[var(--color-promo-text)] transition cursor-pointer mb-1"
          >
            <span className="flex items-center gap-3">
              <ShoppingBag className="w-4 h-4 text-[var(--color-promo-text)]" />
              <span>
                {language === "th" ? "กระเป๋าคูปอง" : "Coupon Bag"}
              </span>
            </span>
            <span className="badge-promo">{savedCouponsCount}</span>
          </button>

          {/* 2. Flat Menu List (Zero Nested Wrapper Boxes) */}
          <button
            type="button"
            role="menuitem"
            onClick={() => handleNavigateMenuTab("review")}
            className={`w-full h-10 px-3 rounded-[12px] flex items-center justify-between ty-body font-medium transition cursor-pointer ${
              activeTab === "review"
                ? "bg-[var(--color-background-muted)] font-semibold text-[var(--color-text-primary)]"
                : "hover:bg-[var(--color-background-muted)] text-[var(--color-text-primary)]"
            }`}
          >
            <span className="flex items-center gap-3">
              <Star className="w-4 h-4 text-[var(--color-text-secondary)]" />
              <span>
                {language === "th" ? "รีวิวผู้เข้าพัก" : "Guest Reviews"}
              </span>
            </span>
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => handleNavigateMenuTab("guide")}
            className={`w-full h-10 px-3 rounded-[12px] flex items-center justify-between ty-body font-medium transition cursor-pointer ${
              activeTab === "guide"
                ? "bg-[var(--color-background-muted)] font-semibold text-[var(--color-text-primary)]"
                : "hover:bg-[var(--color-background-muted)] text-[var(--color-text-primary)]"
            }`}
          >
            <span className="flex items-center gap-3">
              <Compass className="w-4 h-4 text-[var(--color-text-secondary)]" />
              <span>
                {language === "th" ? "คู่มือท่องเที่ยว" : "Sapan Guide"}
              </span>
            </span>
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => handleNavigateMenuTab("setting")}
            className={`w-full h-10 px-3 rounded-[12px] flex items-center justify-between ty-body font-medium transition cursor-pointer ${
              activeTab === "setting"
                ? "bg-[var(--color-background-muted)] font-semibold text-[var(--color-text-primary)]"
                : "hover:bg-[var(--color-background-muted)] text-[var(--color-text-primary)]"
            }`}
          >
            <span className="flex items-center gap-3">
              <Settings className="w-4 h-4 text-[var(--color-text-secondary)]" />
              <span>
                {language === "th" ? "ตั้งค่า & การจอง" : "My Bookings"}
              </span>
            </span>
          </button>

          {onToggleTheme && (
            <button
              type="button"
              role="menuitem"
              onClick={onToggleTheme}
              className="w-full h-10 px-3 rounded-[12px] hover:bg-[var(--color-background-muted)] flex items-center justify-between ty-body font-medium text-[var(--color-text-primary)] transition cursor-pointer"
            >
              <span className="flex items-center gap-3">
                {isDarkTheme ? (
                  <Sun className="w-4 h-4 text-[var(--color-text-secondary)]" />
                ) : (
                  <Moon className="w-4 h-4 text-[var(--color-text-secondary)]" />
                )}
                <span>{language === "th" ? "โหมดสี" : "Appearance"}</span>
              </span>
              <span className="ty-caption font-semibold text-[var(--color-text-secondary)]">
                {language === "th"
                  ? isDarkTheme
                    ? "มืด"
                    : "สว่าง"
                  : isDarkTheme
                  ? "Dark"
                  : "Light"}
              </span>
            </button>
          )}

          <button
            type="button"
            role="menuitem"
            onClick={onToggleLanguage}
            className="w-full h-10 px-3 rounded-[12px] hover:bg-[var(--color-background-muted)] flex items-center justify-between ty-body font-medium text-[var(--color-text-primary)] transition cursor-pointer"
          >
            <span className="flex items-center gap-3">
              <Globe className="w-4 h-4 text-[var(--color-text-secondary)]" />
              <span>{language === "th" ? "ภาษา" : "Language"}</span>
            </span>
            <span className="ty-caption font-semibold text-[var(--color-text-secondary)]">
              {language === "th" ? "ไทย (TH)" : "EN"}
            </span>
          </button>

          <Link
            href="/login"
            role="menuitem"
            onClick={() => setIsDropdownOpen(false)}
            className="w-full h-10 px-3 rounded-[12px] hover:bg-[var(--color-background-muted)] flex items-center justify-between ty-body font-medium text-[var(--color-text-primary)] transition"
          >
            <span className="flex items-center gap-3">
              <LogIn className="w-4 h-4 text-[var(--color-text-secondary)]" />
              <span>{language === "th" ? "เข้าสู่ระบบ" : "Sign In"}</span>
            </span>
          </Link>

          {onToggleEditMode && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsDropdownOpen(false);
                onToggleEditMode();
              }}
              className={`w-full h-10 px-3 rounded-[12px] flex items-center justify-between ty-body font-semibold transition cursor-pointer ${
                isEditMode
                  ? "bg-[var(--color-accent)] text-[var(--color-on-accent)]"
                  : "hover:bg-[var(--color-background-muted)] text-[var(--color-accent)]"
              }`}
            >
              <span className="flex items-center gap-3">
                <Pencil className="w-4 h-4" />
                <span>
                  {isEditMode
                    ? language === "th"
                      ? "ปิดโหมดแก้ไขเว็บ"
                      : "Exit Edit Mode"
                    : language === "th"
                    ? "แก้ไขหน้าเว็บจริง"
                    : "Edit Live Page"}
                </span>
              </span>
            </button>
          )}

          <Link
            href="/admin"
            role="menuitem"
            onClick={() => setIsDropdownOpen(false)}
            className="w-full h-10 px-3 rounded-[12px] hover:bg-[var(--color-background-muted)] flex items-center justify-between ty-body font-medium text-[var(--color-text-primary)] transition"
          >
            <span className="flex items-center gap-3">
              <ShieldCheck className="w-4 h-4 text-[var(--color-text-secondary)]" />
              <span>Admin</span>
            </span>
            {pendingAdminCount > 0 && (
              <span className="rounded-full bg-[var(--color-accent)] text-[var(--color-on-accent)] px-2 py-0.5 ty-caption font-bold">
                {pendingAdminCount}
              </span>
            )}
          </Link>
        </div>
      )}
    </div>
  );
}
