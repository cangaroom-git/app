"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Building2,
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
  tenantSlug?: string | null;
}

export function useAuthenticatedProfile() {
  const [user, setUser] = useState<AuthenticatedProfileUser | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  const refreshProfile = useCallback(async () => {
    try {
      const res = await authClient.getSession();
      const rawUser = res?.data?.user;
      if (rawUser?.email) {
        let resolvedRole = resolveRoleFromEmail(rawUser.email);
        let resolvedTenantSlug: string | null = null;

        try {
          const meRes = await fetch("/api/platform/me", { cache: "no-store" });
          if (meRes.ok) {
            const meData = await meRes.json();
            if (meData?.user?.role) {
              resolvedRole = meData.user.role;
            }
            if (meData?.user?.tenantSlug) {
              resolvedTenantSlug = meData.user.tenantSlug;
            } else if (meData?.tenant?.slug) {
              resolvedTenantSlug = meData.tenant.slug;
            }
          }
        } catch {
          // fallback to email-based role
        }

        setUser({
          id: rawUser.id,
          name:
            rawUser.name?.trim() ||
            rawUser.email.split("@")[0] ||
            "ผู้ใช้งาน",
          email: rawUser.email,
          image: rawUser.image || null,
          role: resolvedRole,
          tenantSlug: resolvedTenantSlug,
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
    const handleFocus = () => refreshProfile();
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
  sizeClass = "h-9 w-9",
  iconSizeClass = "w-5 h-5",
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

  const handleNavigateMenuTab = (targetTab: HotelNavTabId) => {
    setIsDropdownOpen(false);
    onSelectTab(targetTab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const isHotelOrSuperAdmin =
    user?.role === "HOTEL_ADMIN" || user?.role === "SUPER_ADMIN";

  const adminHref =
    user?.tenantSlug && user.tenantSlug !== "sapanunseen"
      ? `/admin?tenant=${encodeURIComponent(user.tenantSlug)}`
      : "/admin";

  const roleBadgeLabel =
    user?.role === "SUPER_ADMIN"
      ? "Super Admin"
      : user?.role === "HOTEL_ADMIN"
      ? "เจ้าของที่พัก"
      : language === "th"
      ? "ผู้เข้าพัก"
      : "Guest";

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
          user?.image ? "!p-0" : ""
        } ${
          isDropdownOpen
            ? "ring-2 ring-[var(--color-accent)]"
            : ""
        }`}
      >
        <UserAvatarCircle
          user={user}
          sizeClass="h-10 w-10"
          iconSizeClass="w-5 h-5"
        />
        {isHotelOrSuperAdmin && pendingAdminCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-[var(--color-promo)] ring-2 ring-[var(--color-background-card)]" />
        )}
      </button>

      {isDropdownOpen && (
        <div
          role="menu"
          aria-label={language === "th" ? "เมนูผู้ใช้" : "User menu"}
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-[312px] rounded-[12px] bg-[var(--color-background-popover)] p-2 shadow-[var(--shadow-popover)] border border-[var(--color-border)] select-none"
        >
          {/* 1. FACEBOOK-STYLE IDENTITY CARD */}
          {user ? (
            <div className="rounded-[8px] p-2.5 shadow-[0_1px_4px_rgba(0,0,0,0.08)] bg-[var(--color-background-card)] border border-[var(--color-border)] mb-2">
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
            <div className="p-1 mb-1 space-y-1.5">
              <Link
                href="/login"
                role="menuitem"
                onClick={() => setIsDropdownOpen(false)}
                className="w-full h-10 px-3.5 rounded-[8px] bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-on-accent)] flex items-center justify-center gap-2 ty-body font-semibold transition"
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

          {/* 2. GUEST ACTIONS */}
          <div className="space-y-0.5">
            <button
              type="button"
              role="menuitem"
              onClick={() => handleNavigateMenuTab("setting")}
              className={`w-full h-10 px-2.5 rounded-[8px] flex items-center justify-between ty-body font-medium transition cursor-pointer ${
                activeTab === "setting"
                  ? "bg-[var(--color-background-muted)] font-semibold"
                  : "hover:bg-[var(--color-background-muted)]"
              }`}
            >
              <span className="flex items-center gap-3">
                <span className="h-8 w-8 rounded-full bg-[var(--color-background-subtle)] inline-flex items-center justify-center">
                  <CalendarCheck className="w-4 h-4 text-[var(--color-text-primary)]" />
                </span>
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
              className="w-full h-10 px-2.5 rounded-[8px] hover:bg-[var(--color-background-muted)] flex items-center justify-between ty-body font-medium transition cursor-pointer"
            >
              <span className="flex items-center gap-3">
                <span className="h-8 w-8 rounded-full bg-[var(--color-background-subtle)] inline-flex items-center justify-center">
                  <TicketPercent className="w-4 h-4 text-[var(--color-promo-text)]" />
                </span>
                <span>
                  {language === "th" ? "คูปองส่วนลด" : "Coupon Wallet"}
                </span>
              </span>
              {savedCouponsCount > 0 && (
                <span className="badge-promo">{savedCouponsCount}</span>
              )}
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => handleNavigateMenuTab("review")}
              className={`w-full h-10 px-2.5 rounded-[8px] flex items-center justify-between ty-body font-medium transition cursor-pointer ${
                activeTab === "review"
                  ? "bg-[var(--color-background-muted)] font-semibold"
                  : "hover:bg-[var(--color-background-muted)]"
              }`}
            >
              <span className="flex items-center gap-3">
                <span className="h-8 w-8 rounded-full bg-[var(--color-background-subtle)] inline-flex items-center justify-center">
                  <Star className="w-4 h-4 text-[var(--color-text-primary)]" />
                </span>
                <span>
                  {language === "th" ? "รีวิวผู้เข้าพัก" : "Guest Reviews"}
                </span>
              </span>
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => handleNavigateMenuTab("guide")}
              className={`w-full h-10 px-2.5 rounded-[8px] flex items-center justify-between ty-body font-medium transition cursor-pointer ${
                activeTab === "guide"
                  ? "bg-[var(--color-background-muted)] font-semibold"
                  : "hover:bg-[var(--color-background-muted)]"
              }`}
            >
              <span className="flex items-center gap-3">
                <span className="h-8 w-8 rounded-full bg-[var(--color-background-subtle)] inline-flex items-center justify-center">
                  <Compass className="w-4 h-4 text-[var(--color-text-primary)]" />
                </span>
                <span>
                  {language === "th" ? "แผนที่ & ที่เที่ยวใกล้เคียง" : "Map & Local Guide"}
                </span>
              </span>
            </button>
          </div>

          <div className="my-1.5 border-t border-[var(--color-border)]" />

          {/* 3. HOTEL OWNER / ADMIN OR 30-DAY FREE TRIAL */}
          <div className="space-y-0.5">
            {isHotelOrSuperAdmin ? (
              <>
                {onToggleEditMode && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      onToggleEditMode();
                    }}
                    className={`w-full h-10 px-2.5 rounded-[8px] flex items-center justify-between ty-body font-medium transition cursor-pointer ${
                      isEditMode
                        ? "bg-[var(--color-accent-muted)] text-[var(--color-accent)] font-semibold"
                        : "hover:bg-[var(--color-background-muted)]"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span className="h-8 w-8 rounded-full bg-[var(--color-background-subtle)] inline-flex items-center justify-center">
                        <Pencil className="w-4 h-4 text-[var(--color-accent)]" />
                      </span>
                      <span>
                        {language === "th"
                          ? "แก้ไขหน้าเว็บตรงจุด"
                          : "Edit Live Page"}
                      </span>
                    </span>
                    <span className="ty-caption font-semibold">
                      {isEditMode ? "เปิดอยู่" : "ปิด"}
                    </span>
                  </button>
                )}

                <Link
                  href={adminHref}
                  role="menuitem"
                  onClick={() => setIsDropdownOpen(false)}
                  className="w-full h-10 px-2.5 rounded-[8px] hover:bg-[var(--color-background-muted)] flex items-center justify-between ty-body font-medium transition"
                >
                  <span className="flex items-center gap-3">
                    <span className="h-8 w-8 rounded-full bg-[var(--color-background-subtle)] inline-flex items-center justify-center">
                      <LayoutDashboard className="w-4 h-4 text-[var(--color-text-primary)]" />
                    </span>
                    <span>
                      {language === "th" ? "จัดการที่พัก (Admin)" : "Hotel Admin"}
                    </span>
                  </span>
                  {pendingAdminCount > 0 && (
                    <span className="badge-promo">{pendingAdminCount}</span>
                  )}
                </Link>

                {isSuperAdmin && (
                  <Link
                    href="/super-admin"
                    role="menuitem"
                    onClick={() => setIsDropdownOpen(false)}
                    className="w-full h-10 px-2.5 rounded-[8px] hover:bg-[var(--color-background-muted)] flex items-center justify-between ty-body font-medium transition"
                  >
                    <span className="flex items-center gap-3">
                      <span className="h-8 w-8 rounded-full bg-[var(--color-accent-muted)] inline-flex items-center justify-center">
                        <Crown className="w-4 h-4 text-[var(--color-accent)]" />
                      </span>
                      <span>
                        {language === "th"
                          ? "ระบบจัดการแพลตฟอร์ม (Super Admin)"
                          : "Super Admin"}
                      </span>
                    </span>
                  </Link>
                )}
              </>
            ) : (
              <Link
                href="/register-hotel"
                role="menuitem"
                onClick={() => setIsDropdownOpen(false)}
                className="w-full h-10 px-2.5 rounded-[8px] hover:bg-[var(--color-background-muted)] flex items-center justify-between ty-body font-semibold text-[var(--color-accent)] transition"
              >
                <span className="flex items-center gap-3">
                  <span className="h-8 w-8 rounded-full bg-[var(--color-accent-muted)] inline-flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-[var(--color-accent)]" />
                  </span>
                  <span>
                    {language === "th"
                      ? "สร้างเว็บที่พักฟรี 30 วัน"
                      : "Start 30-Day Free Trial"}
                  </span>
                </span>
              </Link>
            )}
          </div>

          <div className="my-1.5 border-t border-[var(--color-border)]" />

          {/* 4. PREFERENCES & SIGN OUT */}
          <div className="space-y-0.5">
            {onToggleTheme && (
              <button
                type="button"
                role="menuitem"
                onClick={onToggleTheme}
                className="w-full h-10 px-2.5 rounded-[8px] hover:bg-[var(--color-background-muted)] flex items-center justify-between ty-body font-medium transition cursor-pointer"
              >
                <span className="flex items-center gap-3">
                  <span className="h-8 w-8 rounded-full bg-[var(--color-background-subtle)] inline-flex items-center justify-center">
                    {isDarkTheme ? (
                      <Moon className="w-4 h-4 text-[var(--color-text-primary)]" />
                    ) : (
                      <Sun className="w-4 h-4 text-[var(--color-text-primary)]" />
                    )}
                  </span>
                  <span>
                    {language === "th" ? "การแสดงผลหน้าจอ" : "Display & Theme"}
                  </span>
                </span>
                <span className="ty-caption font-semibold">
                  {language === "th"
                    ? isDarkTheme
                      ? "โหมดมืด"
                      : "โหมดสว่าง"
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
              className="w-full h-10 px-2.5 rounded-[8px] hover:bg-[var(--color-background-muted)] flex items-center justify-between ty-body font-medium transition cursor-pointer"
            >
              <span className="flex items-center gap-3">
                <span className="h-8 w-8 rounded-full bg-[var(--color-background-subtle)] inline-flex items-center justify-center">
                  <Globe className="w-4 h-4 text-[var(--color-text-primary)]" />
                </span>
                <span>{language === "th" ? "ภาษา" : "Language"}</span>
              </span>
              <span className="ty-caption font-semibold">
                {language === "th" ? "ภาษาไทย" : "English"}
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
                className="w-full h-10 px-2.5 rounded-[8px] hover:bg-[var(--color-background-muted)] flex items-center justify-between ty-body font-medium text-[var(--color-text-primary)] transition cursor-pointer"
              >
                <span className="flex items-center gap-3">
                  <span className="h-8 w-8 rounded-full bg-[var(--color-background-subtle)] inline-flex items-center justify-center">
                    <LogOut className="w-4 h-4 text-[var(--color-text-primary)]" />
                  </span>
                  <span>{language === "th" ? "ออกจากระบบ" : "Log Out"}</span>
                </span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
