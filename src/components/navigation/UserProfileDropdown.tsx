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
        className={`${sizeClass} rounded-full object-cover shrink-0 border border-[var(--color-border)]`}
      />
    );
  }

  if (user) {
    const initials = (user.name || user.email || "U")
      .trim()
      .slice(0, 2)
      .toUpperCase();
    return (
      <span
        className={`${sizeClass} rounded-full bg-[var(--color-accent)] text-[var(--color-on-accent)] inline-flex items-center justify-center text-[12px] font-bold shrink-0`}
      >
        {initials}
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

  return (
    <div ref={dropdownWrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setIsDropdownOpen((prevOpen) => !prevOpen)}
        aria-label={language === "th" ? "บัญชีและเมนู" : "Account menu"}
        aria-expanded={isDropdownOpen}
        aria-haspopup="menu"
        className="h-9 w-9 rounded-full inline-flex items-center justify-center hover:bg-[var(--color-background-subtle)] transition cursor-pointer relative"
      >
        <UserAvatarCircle
          user={user}
          sizeClass="h-8 w-8"
          iconSizeClass="w-[18px] h-[18px]"
        />
        {isHotelOrSuperAdmin && pendingAdminCount > 0 && (
          <span className="absolute top-0 right-0 h-2.5 w-2.5 rounded-full bg-[var(--color-promo)] ring-2 ring-[var(--color-background-card)]" />
        )}
      </button>

      {isDropdownOpen && (
        <div
          role="menu"
          aria-label={language === "th" ? "เมนูผู้ใช้" : "User menu"}
          className="absolute right-0 top-[calc(100%+6px)] z-50 w-[256px] rounded-[8px] bg-[var(--color-background-popover)] p-1.5 shadow-[var(--shadow-popover)] border border-[var(--color-border)] select-none"
        >
          {/* 1. Minimal Identity Header */}
          {user ? (
            <div className="px-2.5 py-2 border-b border-[var(--color-border)] mb-1">
              <p className="text-[14px] font-semibold text-[var(--color-text-primary)] truncate">
                {user.name}
              </p>
              <p className="text-[12px] text-[var(--color-text-secondary)] truncate">
                {user.email}
              </p>
            </div>
          ) : (
            <div className="p-1 border-b border-[var(--color-border)] mb-1">
              <Link
                href="/login"
                role="menuitem"
                onClick={() => setIsDropdownOpen(false)}
                className="w-full h-9 px-3 rounded-[6px] bg-[var(--color-accent)] text-[var(--color-on-accent)] flex items-center justify-center gap-2 text-[14px] font-medium transition"
              >
                <LogIn className="w-4 h-4" />
                <span>
                  {language === "th" ? "เข้าสู่ระบบ" : "Sign In"}
                </span>
              </Link>
            </div>
          )}

          {/* 2. Flat Minimal Menu Rows (Zero Heavy Icon Circles) */}
          <button
            type="button"
            role="menuitem"
            onClick={() => handleNavigateMenuTab("setting")}
            className={`w-full h-9 px-2.5 rounded-[6px] flex items-center gap-2.5 text-[14px] transition cursor-pointer ${
              activeTab === "setting"
                ? "bg-[var(--color-background-subtle)] font-medium"
                : "hover:bg-[var(--color-background-muted)]"
            }`}
          >
            <CalendarCheck className="w-4 h-4 text-[var(--color-text-secondary)] shrink-0" />
            <span>{language === "th" ? "การจองของฉัน" : "My Bookings"}</span>
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setIsDropdownOpen(false);
              onOpenCouponWallet();
            }}
            className="w-full h-9 px-2.5 rounded-[6px] hover:bg-[var(--color-background-muted)] flex items-center justify-between text-[14px] transition cursor-pointer"
          >
            <span className="flex items-center gap-2.5">
              <TicketPercent className="w-4 h-4 text-[var(--color-text-secondary)] shrink-0" />
              <span>{language === "th" ? "คูปองส่วนลด" : "Coupons"}</span>
            </span>
            {savedCouponsCount > 0 && (
              <span className="badge-promo">{savedCouponsCount}</span>
            )}
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => handleNavigateMenuTab("review")}
            className={`w-full h-9 px-2.5 rounded-[6px] flex items-center gap-2.5 text-[14px] transition cursor-pointer ${
              activeTab === "review"
                ? "bg-[var(--color-background-subtle)] font-medium"
                : "hover:bg-[var(--color-background-muted)]"
            }`}
          >
            <Star className="w-4 h-4 text-[var(--color-text-secondary)] shrink-0" />
            <span>{language === "th" ? "รีวิวผู้เข้าพัก" : "Reviews"}</span>
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => handleNavigateMenuTab("guide")}
            className={`w-full h-9 px-2.5 rounded-[6px] flex items-center gap-2.5 text-[14px] transition cursor-pointer ${
              activeTab === "guide"
                ? "bg-[var(--color-background-subtle)] font-medium"
                : "hover:bg-[var(--color-background-muted)]"
            }`}
          >
            <Compass className="w-4 h-4 text-[var(--color-text-secondary)] shrink-0" />
            <span>{language === "th" ? "แผนที่ & ที่เที่ยว" : "Local Guide"}</span>
          </button>

          <div className="my-1 border-t border-[var(--color-border)]" />

          {/* 3. Admin Workspace OR 30-Day Trial */}
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
                  className="w-full h-9 px-2.5 rounded-[6px] hover:bg-[var(--color-background-muted)] flex items-center justify-between text-[14px] transition cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <Pencil className="w-4 h-4 text-[var(--color-text-secondary)] shrink-0" />
                    <span>
                      {language === "th" ? "แก้ไขหน้าเว็บ" : "Edit Page"}
                    </span>
                  </span>
                  <span className="text-[12px] text-[var(--color-text-secondary)]">
                    {isEditMode ? "ON" : "OFF"}
                  </span>
                </button>
              )}

              <Link
                href={adminHref}
                role="menuitem"
                onClick={() => setIsDropdownOpen(false)}
                className="w-full h-9 px-2.5 rounded-[6px] hover:bg-[var(--color-background-muted)] flex items-center justify-between text-[14px] transition"
              >
                <span className="flex items-center gap-2.5">
                  <LayoutDashboard className="w-4 h-4 text-[var(--color-text-secondary)] shrink-0" />
                  <span>
                    {language === "th" ? "จัดการที่พัก" : "Hotel Admin"}
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
                  className="w-full h-9 px-2.5 rounded-[6px] hover:bg-[var(--color-background-muted)] flex items-center gap-2.5 text-[14px] transition"
                >
                  <Crown className="w-4 h-4 text-[var(--color-text-secondary)] shrink-0" />
                  <span>Super Admin</span>
                </Link>
              )}
            </>
          ) : (
            <Link
              href="/register-hotel"
              role="menuitem"
              onClick={() => setIsDropdownOpen(false)}
              className="w-full h-9 px-2.5 rounded-[6px] hover:bg-[var(--color-background-muted)] flex items-center gap-2.5 text-[14px] font-medium transition"
            >
              <Building2 className="w-4 h-4 text-[var(--color-text-secondary)] shrink-0" />
              <span>
                {language === "th"
                  ? "ทดลองเปิดเว็บที่พัก 30 วัน"
                  : "Start 30-Day Trial"}
              </span>
            </Link>
          )}

          <div className="my-1 border-t border-[var(--color-border)]" />

          {/* 4. Minimal Preferences & Sign Out */}
          {onToggleTheme && (
            <button
              type="button"
              role="menuitem"
              onClick={onToggleTheme}
              className="w-full h-9 px-2.5 rounded-[6px] hover:bg-[var(--color-background-muted)] flex items-center justify-between text-[14px] transition cursor-pointer"
            >
              <span className="flex items-center gap-2.5">
                {isDarkTheme ? (
                  <Moon className="w-4 h-4 text-[var(--color-text-secondary)] shrink-0" />
                ) : (
                  <Sun className="w-4 h-4 text-[var(--color-text-secondary)] shrink-0" />
                )}
                <span>{language === "th" ? "โหมดสี" : "Theme"}</span>
              </span>
              <span className="text-[12px] text-[var(--color-text-secondary)]">
                {isDarkTheme ? "Dark" : "Light"}
              </span>
            </button>
          )}

          <button
            type="button"
            role="menuitem"
            onClick={onToggleLanguage}
            className="w-full h-9 px-2.5 rounded-[6px] hover:bg-[var(--color-background-muted)] flex items-center justify-between text-[14px] transition cursor-pointer"
          >
            <span className="flex items-center gap-2.5">
              <Globe className="w-4 h-4 text-[var(--color-text-secondary)] shrink-0" />
              <span>{language === "th" ? "ภาษา" : "Language"}</span>
            </span>
            <span className="text-[12px] text-[var(--color-text-secondary)]">
              {language === "th" ? "TH" : "EN"}
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
              className="w-full h-9 px-2.5 rounded-[6px] hover:bg-[var(--color-background-muted)] flex items-center gap-2.5 text-[14px] text-[var(--color-error)] transition cursor-pointer"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>{language === "th" ? "ออกจากระบบ" : "Log Out"}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
