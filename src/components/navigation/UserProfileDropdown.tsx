"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Bookmark,
  Building2,
  CalendarCheck,
  Crown,
  ExternalLink,
  Globe,
  LayoutDashboard,
  LogIn,
  LogOut,
  Moon,
  Sun,
  TicketPercent,
  User,
} from "lucide-react";
import type { LanguageCode } from "@/lib/dateFormatters";
import type { AuthenticatedMeDto } from "@/types/cangaroom";
import { authClient } from "@/lib/auth/client";
import type { PlatformNavTabId } from "@/components/navigation/NavigationIcons";

export type AuthenticatedProfileUser = AuthenticatedMeDto;

export function useAuthenticatedProfile() {
  const [user, setUser] = useState<AuthenticatedMeDto | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  const refreshProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/me", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { user?: AuthenticatedMeDto | null };
        setUser(data.user ?? null);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsCheckingSession(false);
    }
  }, []);

  useEffect(() => {
    refreshProfile();
    const handleRefreshEvent = () => refreshProfile();
    window.addEventListener("focus", handleRefreshEvent);
    window.addEventListener("cangaroom-me-refresh", handleRefreshEvent);
    return () => {
      window.removeEventListener("focus", handleRefreshEvent);
      window.removeEventListener("cangaroom-me-refresh", handleRefreshEvent);
    };
  }, [refreshProfile]);

  const signOutUser = useCallback(async () => {
    try {
      await authClient.signOut();
    } catch {
      // ignore network error on sign out
    } finally {
      setUser(null);
      window.dispatchEvent(new Event("cangaroom-me-refresh"));
    }
  }, []);

  return {
    user,
    isCheckingSession,
    refreshProfile,
    signOutUser,
  };
}

export function UserAvatarCircle({
  user,
  sizeClass = "h-9 w-9",
  iconSizeClass = "w-5 h-5",
}: {
  user: AuthenticatedMeDto | null;
  sizeClass?: string;
  iconSizeClass?: string;
}) {
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [user?.avatarUrl]);

  if (user?.avatarUrl && !imgFailed) {
    return (
      <img
        src={user.avatarUrl}
        alt={user.name || user.email}
        referrerPolicy="no-referrer"
        onError={() => setImgFailed(true)}
        className={`${sizeClass} rounded-full object-cover shrink-0`}
      />
    );
  }

  if (user) {
    const initial = (user.name?.[0] || user.email?.[0] || "U").toUpperCase();
    return (
      <span
        className={`${sizeClass} rounded-full bg-[var(--color-accent)] text-[var(--color-on-accent)] inline-flex items-center justify-center ty-caption font-bold shrink-0`}
      >
        {initial}
      </span>
    );
  }

  return <User className={iconSizeClass} />;
}

export interface UserProfileDropdownProps {
  user: AuthenticatedMeDto | null;
  onRefreshProfile: () => Promise<void>;
  onSignOut: () => Promise<void>;
  language: LanguageCode;
  onToggleLanguage: () => void;
  isDarkTheme: boolean;
  onToggleTheme: () => void;
  activeTab: PlatformNavTabId;
  onOpenCouponWallet: () => void;
}

export function UserProfileDropdown({
  user,
  onRefreshProfile,
  onSignOut,
  language,
  onToggleLanguage,
  isDarkTheme,
  onToggleTheme,
  activeTab,
  onOpenCouponWallet,
}: UserProfileDropdownProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownWrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isDropdownOpen) return;
    onRefreshProfile();

    const handleOutside = (event: MouseEvent) => {
      if (
        dropdownWrapperRef.current &&
        !dropdownWrapperRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsDropdownOpen(false);
    };

    document.addEventListener("mousedown", handleOutside);
    window.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      window.removeEventListener("keydown", handleEsc);
    };
  }, [isDropdownOpen, onRefreshProfile]);

  const primaryHotel = user?.ownedHotels?.[0] ?? null;
  const totalStudioPending =
    user?.ownedHotels?.reduce((sum, h) => sum + h.pendingBookingsCount, 0) ?? 0;
  const hasStudioAccess =
    Boolean(primaryHotel) ||
    user?.role === "HOTEL_OWNER" ||
    user?.role === "SUPER_ADMIN";

  const roleBadgeLabel =
    user?.role === "SUPER_ADMIN"
      ? "Super Admin"
      : user?.role === "HOTEL_OWNER" || primaryHotel
      ? "เจ้าของที่พัก"
      : language === "th"
      ? "นักเดินทาง"
      : "Traveller";

  return (
    <div ref={dropdownWrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setIsDropdownOpen((prev) => !prev)}
        aria-label={language === "th" ? "โปรไฟล์และเมนู" : "Profile and menu"}
        aria-expanded={isDropdownOpen}
        aria-haspopup="menu"
        className={`btn-icon btn-icon-lg relative overflow-visible ${
          user?.avatarUrl ? "!p-0" : ""
        } ${isDropdownOpen ? "ring-2 ring-[var(--color-accent)]" : ""}`}
      >
        <UserAvatarCircle
          user={user}
          sizeClass="h-10 w-10"
          iconSizeClass="w-5 h-5"
        />
        {totalStudioPending > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-[var(--color-promo)] ring-2 ring-[var(--color-background-card)]" />
        )}
      </button>

      {isDropdownOpen && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-[308px] rounded-[16px] bg-[var(--color-background-popover)] p-2 shadow-[var(--shadow-popover)] border border-[var(--color-border)] select-none"
        >
          {user ? (
            <div className="rounded-[12px] p-2.5 bg-[var(--color-background-card)] border border-[var(--color-border)] mb-2">
              <div className="flex items-center gap-3">
                <UserAvatarCircle user={user} sizeClass="h-10 w-10" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="ty-body font-bold text-[var(--color-text-primary)] truncate">
                      {user.name}
                    </p>
                    <span className="shrink-0 rounded-full bg-[var(--color-accent-muted)] text-[var(--color-accent)] px-2 py-0.5 ty-caption font-semibold leading-none">
                      {roleBadgeLabel}
                    </span>
                  </div>
                  <p className="ty-caption truncate">{user.email}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-1 mb-1">
              <Link
                href="/login"
                role="menuitem"
                onClick={() => setIsDropdownOpen(false)}
                className="w-full h-10 px-3.5 rounded-[12px] bg-[var(--color-promo)] hover:bg-[var(--color-promo-hover)] text-[var(--color-on-promo)] flex items-center justify-center gap-2 ty-body font-semibold transition"
              >
                <LogIn className="w-4 h-4" />
                <span>
                  {language === "th"
                    ? "เข้าสู่ระบบด้วย Google"
                    : "Sign in with Google"}
                </span>
              </Link>
            </div>
          )}

          <div className="space-y-0.5">
            <Link
              href="/board"
              onClick={() => setIsDropdownOpen(false)}
              className={`w-full h-10 px-2.5 rounded-[10px] flex items-center justify-between ty-body font-medium transition ${
                activeTab === "board"
                  ? "bg-[var(--color-background-muted)] font-semibold"
                  : "hover:bg-[var(--color-background-muted)]"
              }`}
            >
              <span className="flex items-center gap-3">
                <Bookmark className="w-[18px] h-[18px] text-[var(--color-promo)]" />
                <span>
                  {language === "th"
                    ? "บอร์ดที่พักที่บันทึกไว้"
                    : "My Saved Boards"}
                </span>
              </span>
              {user && user.savedPinsCount > 0 && (
                <span className="badge-promo">{user.savedPinsCount}</span>
              )}
            </Link>

            <Link
              href="/trips"
              onClick={() => setIsDropdownOpen(false)}
              className={`w-full h-10 px-2.5 rounded-[10px] flex items-center justify-between ty-body font-medium transition ${
                activeTab === "trips"
                  ? "bg-[var(--color-background-muted)] font-semibold"
                  : "hover:bg-[var(--color-background-muted)]"
              }`}
            >
              <span className="flex items-center gap-3">
                <CalendarCheck className="w-[18px] h-[18px]" />
                <span>
                  {language === "th"
                    ? "การจอง & คูปองของฉัน"
                    : "My Trips & Wallet"}
                </span>
              </span>
            </Link>

            <button
              type="button"
              onClick={() => {
                setIsDropdownOpen(false);
                onOpenCouponWallet();
              }}
              className="w-full h-10 px-2.5 rounded-[10px] hover:bg-[var(--color-background-muted)] flex items-center justify-between ty-body font-medium transition cursor-pointer"
            >
              <span className="flex items-center gap-3">
                <TicketPercent className="w-[18px] h-[18px] text-[var(--color-promo-text)]" />
                <span>
                  {language === "th" ? "กระเป๋าคูปองด่วน" : "Quick Coupon Bag"}
                </span>
              </span>
              {user && user.savedCouponsCount > 0 && (
                <span className="badge-promo">{user.savedCouponsCount}</span>
              )}
            </button>
          </div>

          <div className="my-1.5 border-t border-[var(--color-border)]" />

          <div className="space-y-0.5">
            {hasStudioAccess && (
              <Link
                href="/studio"
                onClick={() => setIsDropdownOpen(false)}
                className="w-full h-10 px-2.5 rounded-[10px] hover:bg-[var(--color-background-muted)] flex items-center justify-between ty-body font-medium transition"
              >
                <span className="flex items-center gap-3">
                  <LayoutDashboard className="w-[18px] h-[18px] text-[var(--color-accent)]" />
                  <span>
                    {language === "th"
                      ? "จัดการที่พัก (Hotel Studio)"
                      : "Hotel Studio"}
                  </span>
                </span>
                {totalStudioPending > 0 && (
                  <span className="badge-promo">{totalStudioPending}</span>
                )}
              </Link>
            )}

            {primaryHotel && (
              <Link
                href={`/${primaryHotel.slug}`}
                onClick={() => setIsDropdownOpen(false)}
                className="w-full h-10 px-2.5 rounded-[10px] hover:bg-[var(--color-background-muted)] flex items-center justify-between ty-body font-medium transition"
              >
                <span className="flex items-center gap-3 min-w-0">
                  <ExternalLink className="w-[18px] h-[18px] shrink-0" />
                  <span className="truncate">/{primaryHotel.slug}</span>
                </span>
              </Link>
            )}

            <Link
              href="/register-hotel"
              onClick={() => setIsDropdownOpen(false)}
              className="w-full h-10 px-2.5 rounded-[10px] hover:bg-[var(--color-background-muted)] flex items-center gap-3 ty-body font-semibold text-[var(--color-accent)] transition"
            >
              <Building2 className="w-[18px] h-[18px]" />
              <span>
                {language === "th"
                  ? "เปิดเพจที่พักฟรี 0% GP"
                  : "List Property Free (0% GP)"}
              </span>
            </Link>

            {user?.role === "SUPER_ADMIN" && (
              <Link
                href="/super-admin"
                onClick={() => setIsDropdownOpen(false)}
                className="w-full h-10 px-2.5 rounded-[10px] hover:bg-[var(--color-background-muted)] flex items-center gap-3 ty-body font-medium transition"
              >
                <Crown className="w-[18px] h-[18px] text-[var(--color-accent)]" />
                <span>Super Admin Console</span>
              </Link>
            )}
          </div>

          <div className="my-1.5 border-t border-[var(--color-border)]" />

          <div className="space-y-0.5">
            <button
              type="button"
              onClick={onToggleTheme}
              className="w-full h-10 px-2.5 rounded-[10px] hover:bg-[var(--color-background-muted)] flex items-center justify-between ty-body font-medium transition cursor-pointer"
            >
              <span className="flex items-center gap-3">
                {isDarkTheme ? (
                  <Moon className="w-[18px] h-[18px]" />
                ) : (
                  <Sun className="w-[18px] h-[18px]" />
                )}
                <span>{language === "th" ? "โหมดสี" : "Appearance"}</span>
              </span>
              <span className="ty-caption font-semibold">
                {isDarkTheme ? "Dark" : "Light"}
              </span>
            </button>

            <button
              type="button"
              onClick={onToggleLanguage}
              className="w-full h-10 px-2.5 rounded-[10px] hover:bg-[var(--color-background-muted)] flex items-center justify-between ty-body font-medium transition cursor-pointer"
            >
              <span className="flex items-center gap-3">
                <Globe className="w-[18px] h-[18px]" />
                <span>{language === "th" ? "ภาษา" : "Language"}</span>
              </span>
              <span className="ty-caption font-semibold">
                {language === "th" ? "TH" : "EN"}
              </span>
            </button>

            {user && (
              <button
                type="button"
                onClick={async () => {
                  await onSignOut();
                  setIsDropdownOpen(false);
                }}
                className="w-full h-10 px-2.5 rounded-[10px] hover:bg-[var(--color-background-muted)] flex items-center gap-3 ty-body font-medium text-[var(--color-error)] transition cursor-pointer"
              >
                <LogOut className="w-[18px] h-[18px]" />
                <span>{language === "th" ? "ออกจากระบบ" : "Log Out"}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
