"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  CalendarCheck,
  Compass,
  Crown,
  Globe,
  LayoutDashboard,
  LogIn,
  LogOut,
  Moon,
  Pencil,
  Star,
  Sun,
  TicketPercent,
  User,
} from "lucide-react";
import { LanguageCode } from "@/lib/dateFormatters";
import { HotelNavTabId } from "@/components/navigation/NavigationIcons";
import {
  AppUserRole,
  authClient,
  resolveRoleFromEmail,
} from "@/lib/auth/client";

export interface AuthenticatedProfileUser {
  id?: string;
  name: string;
  email: string;
  image?: string | null;
  role: AppUserRole;
}

export function useAuthenticatedProfile() {
  const [user, setUser] = useState<AuthenticatedProfileUser | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  const refreshProfile = useCallback(async () => {
    try {
      const res = await authClient.getSession();
      const rawUser = res?.data?.user;
      if (rawUser?.email) {
        setUser({
          id: rawUser.id,
          name:
            rawUser.name?.trim() ||
            rawUser.email.split("@")[0] ||
            "Cangaroom User",
          email: rawUser.email,
          image: rawUser.image || null,
          role: resolveRoleFromEmail(rawUser.email),
        });
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
    const handleFocus = () => {
      refreshProfile();
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [refreshProfile]);

  const signOutUser = useCallback(async () => {
    try {
      await authClient.signOut();
    } catch {
      // ignore sign-out network errors
    } finally {
      setUser(null);
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
  sizeClass = "h-8 w-8",
  iconSizeClass = "w-[18px] h-[18px]",
}: {
  user: AuthenticatedProfileUser | null;
  sizeClass?: string;
  iconSizeClass?: string;
}) {
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [user?.image]);

  if (user?.image && !imgFailed) {
    return (
      <img
        src={user.image}
        alt={user.name || user.email}
        referrerPolicy="no-referrer"
        onError={() => setImgFailed(true)}
        className={`${sizeClass} rounded-full object-cover shrink-0 ring-1 ring-[var(--color-border)]`}
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
  const { user, refreshProfile, signOutUser } = useAuthenticatedProfile();

  useEffect(() => {
    if (!isDropdownOpen) {
      return;
    }
    refreshProfile();

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
  }, [isDropdownOpen, refreshProfile]);

  const isSecondaryRouteActive =
    activeTab === "review" || activeTab === "guide" || activeTab === "setting";

  const handleNavigateMenuTab = (targetTab: HotelNavTabId) => {
    setIsDropdownOpen(false);
    onSelectTab(targetTab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const roleBadgeLabel =
    user?.role === "SUPER_ADMIN"
      ? "Super Admin"
      : user?.role === "HOTEL_ADMIN"
      ? "Hotel Admin"
      : language === "th"
      ? "สมาชิก"
      : "Member";

  return (
    <div ref={dropdownWrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setIsDropdownOpen((prevOpen) => !prevOpen)}
        aria-label={language === "th" ? "โปรไฟล์และเมนู" : "Profile and menu"}
        aria-expanded={isDropdownOpen}
        aria-haspopup="menu"
        title={
          user
            ? `${user.name} (${user.email})`
            : language === "th"
            ? "โปรไฟล์ & เมนู"
            : "Profile & Menu"
        }
        className={`btn-icon btn-icon-lg relative overflow-visible ${
          user?.image ? "!p-0.5" : ""
        } ${
          isDropdownOpen || isSecondaryRouteActive
            ? "!bg-[var(--color-accent-muted)] !text-[var(--color-accent)]"
            : ""
        }`}
      >
        <UserAvatarCircle
          user={user}
          sizeClass="h-8 w-8"
          iconSizeClass="w-5 h-5"
        />
        {pendingAdminCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[var(--color-accent)] ring-2 ring-[var(--color-background-card)]" />
        )}
      </button>

      {isDropdownOpen && (
        <div
          role="menu"
          aria-label={language === "th" ? "เมนูผู้ใช้" : "User menu"}
          className="absolute right-0 top-[calc(100%+10px)] z-50 w-[284px] rounded-[20px] bg-[var(--color-background-popover)] p-2 shadow-[var(--shadow-popover)] border border-[var(--color-border)] select-none"
        >
          {/* ===============================================================
              ZONE 1: IDENTITY HEADER (Google Profile / Sign-In CTA)
          ================================================================ */}
          {user ? (
            <div className="px-3 py-2.5 flex items-center gap-3">
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
                <p className="ty-caption truncate mt-0.5">{user.email}</p>
              </div>
            </div>
          ) : (
            <div className="p-1.5">
              <Link
                href="/login"
                role="menuitem"
                onClick={() => setIsDropdownOpen(false)}
                className="w-full h-10 px-3.5 rounded-[12px] bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-on-accent)] flex items-center justify-between ty-body font-semibold transition"
              >
                <span className="flex items-center gap-2.5">
                  <LogIn className="w-4 h-4" />
                  <span>
                    {language === "th"
                      ? "เข้าสู่ระบบ / สมัครสมาชิก"
                      : "Sign in / Register"}
                  </span>
                </span>
                <span className="ty-caption !text-white/85 font-medium">
                  Gmail
                </span>
              </Link>
            </div>
          )}

          <div className="my-1 border-t border-[var(--color-border)]" />

          {/* ===============================================================
              ZONE 2: GUEST STAY & EXPLORE
          ================================================================ */}
          <div className="space-y-0.5">
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
                <CalendarCheck className="w-4 h-4 text-[var(--color-text-secondary)]" />
                <span>
                  {language === "th" ? "การจองของฉัน" : "My Bookings"}
                </span>
              </span>
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsDropdownOpen(false);
                onOpenCouponWallet();
              }}
              className="w-full h-10 px-3 rounded-[12px] hover:bg-[var(--color-background-muted)] flex items-center justify-between ty-body font-medium text-[var(--color-text-primary)] transition cursor-pointer"
            >
              <span className="flex items-center gap-3">
                <TicketPercent className="w-4 h-4 text-[var(--color-promo-text)]" />
                <span>
                  {language === "th" ? "กระเป๋าคูปองส่วนลด" : "Coupon Wallet"}
                </span>
              </span>
              {savedCouponsCount > 0 ? (
                <span className="badge-promo">{savedCouponsCount}</span>
              ) : (
                <span className="ty-caption font-semibold text-[var(--color-text-secondary)]">
                  0
                </span>
              )}
            </button>

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
                  {language === "th"
                    ? "คู่มือท่องเที่ยว & แผนที่"
                    : "Local Guide & Map"}
                </span>
              </span>
            </button>
          </div>

          <div className="my-1 border-t border-[var(--color-border)]" />

          {/* ===============================================================
              ZONE 3: WORKSPACE & ADMIN MANAGEMENT
          ================================================================ */}
          <div className="space-y-0.5">
            {onToggleEditMode && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setIsDropdownOpen(false);
                  onToggleEditMode();
                }}
                className={`w-full h-10 px-3 rounded-[12px] flex items-center justify-between ty-body font-medium transition cursor-pointer ${
                  isEditMode
                    ? "bg-[var(--color-accent)] text-[var(--color-on-accent)] font-semibold"
                    : "hover:bg-[var(--color-background-muted)] text-[var(--color-text-primary)]"
                }`}
              >
                <span className="flex items-center gap-3">
                  <Pencil
                    className={`w-4 h-4 ${
                      isEditMode
                        ? "text-[var(--color-on-accent)]"
                        : "text-[var(--color-accent)]"
                    }`}
                  />
                  <span>
                    {language === "th"
                      ? "แก้ไขหน้าเว็บตรงจุด"
                      : "Edit Live Page"}
                  </span>
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 ty-caption font-bold leading-none ${
                    isEditMode
                      ? "bg-white/20 !text-white"
                      : "bg-[var(--color-background-muted)] text-[var(--color-text-secondary)]"
                  }`}
                >
                  {isEditMode ? "ON" : "OFF"}
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
                <LayoutDashboard className="w-4 h-4 text-[var(--color-text-secondary)]" />
                <span>
                  {language === "th" ? "จัดการที่พัก (Admin)" : "Hotel Admin"}
                </span>
              </span>
              {pendingAdminCount > 0 && (
                <span className="rounded-full bg-[var(--color-accent)] text-[var(--color-on-accent)] px-2 py-0.5 ty-caption font-bold leading-none">
                  {pendingAdminCount}
                </span>
              )}
            </Link>

            {isSuperAdmin && (
              <Link
                href="/super-admin"
                role="menuitem"
                onClick={() => setIsDropdownOpen(false)}
                className="w-full h-10 px-3 rounded-[12px] hover:bg-[var(--color-background-muted)] flex items-center justify-between ty-body font-medium text-[var(--color-text-primary)] transition"
              >
                <span className="flex items-center gap-3">
                  <Crown className="w-4 h-4 text-[var(--color-accent)]" />
                  <span>
                    {language === "th"
                      ? "ศูนย์ควบคุม (Super Admin)"
                      : "Super Admin"}
                  </span>
                </span>
              </Link>
            )}
          </div>

          <div className="my-1 border-t border-[var(--color-border)]" />

          {/* ===============================================================
              ZONE 4: PREFERENCES & SIGN OUT
          ================================================================ */}
          <div className="space-y-0.5">
            {onToggleTheme && (
              <button
                type="button"
                role="menuitem"
                onClick={onToggleTheme}
                className="w-full h-10 px-3 rounded-[12px] hover:bg-[var(--color-background-muted)] flex items-center justify-between ty-body font-medium text-[var(--color-text-primary)] transition cursor-pointer"
              >
                <span className="flex items-center gap-3">
                  {isDarkTheme ? (
                    <Moon className="w-4 h-4 text-[var(--color-text-secondary)]" />
                  ) : (
                    <Sun className="w-4 h-4 text-[var(--color-text-secondary)]" />
                  )}
                  <span>{language === "th" ? "โหมดหน้าจอ" : "Appearance"}</span>
                </span>
                <span className="inline-flex items-center rounded-full bg-[var(--color-background-muted)] px-2.5 py-0.5 ty-caption font-semibold text-[var(--color-text-primary)]">
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
              <span className="inline-flex items-center rounded-full bg-[var(--color-background-muted)] px-2.5 py-0.5 ty-caption font-semibold text-[var(--color-text-primary)]">
                {language === "th" ? "ไทย · TH" : "ENG · EN"}
              </span>
            </button>

            {user && (
              <button
                type="button"
                role="menuitem"
                onClick={async () => {
                  await signOutUser();
                  setIsDropdownOpen(false);
                }}
                className="w-full h-10 px-3 rounded-[12px] hover:bg-[var(--color-error-muted)] flex items-center justify-between ty-body font-medium text-[var(--color-error)] transition cursor-pointer"
              >
                <span className="flex items-center gap-3">
                  <LogOut className="w-4 h-4" />
                  <span>
                    {language === "th" ? "ออกจากระบบ" : "Sign Out"}
                  </span>
                </span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
