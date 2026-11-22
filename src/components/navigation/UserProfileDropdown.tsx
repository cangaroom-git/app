"use client";

import React, { useCallback, useEffect, useState } from "react";
import { User } from "lucide-react";
import type { LanguageCode } from "@/lib/dateFormatters";
import type { AuthenticatedMeDto } from "@/types/cangaroom";
import { authClient } from "@/lib/auth/client";
import { saveReturningAccountHint } from "@/lib/auth/accountHint";
import type { PlatformNavTabId } from "@/components/navigation/NavigationIcons";
import { AirbnbMenuDrawer } from "@/components/navigation/AirbnbMenuDrawer";

export type AuthenticatedProfileUser = AuthenticatedMeDto;

export function useAuthenticatedProfile() {
  const [user, setUser] = useState<AuthenticatedMeDto | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  const refreshProfile = useCallback(async () => {
    try {
      if (
        typeof window !== "undefined" &&
        window.location.search.includes("neon_auth_session_verifier")
      ) {
        await authClient.getSession().catch(() => null);
        try {
          const nextUrl = new URL(window.location.href);
          if (
            nextUrl.searchParams.has("neon_auth_session_verifier") &&
            nextUrl.pathname !== "/login"
          ) {
            nextUrl.searchParams.delete("neon_auth_session_verifier");
            window.history.replaceState({}, "", nextUrl.toString());
          }
        } catch {
          // ignore URL cleanup error
        }
      }
      const res = await fetch("/api/me", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { user?: AuthenticatedMeDto | null };
        const loadedUser = data.user ?? null;
        setUser(loadedUser);
        if (loadedUser?.email) {
          saveReturningAccountHint({
            name: loadedUser.name || loadedUser.email.split("@")[0],
            email: loadedUser.email,
            avatarUrl: loadedUser.avatarUrl ?? null,
          });
        }
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
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const totalStudioPending =
    user?.ownedHotels?.reduce((sum, h) => sum + h.pendingBookingsCount, 0) ?? 0;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsDrawerOpen(true)}
        aria-label={language === "th" ? "โปรไฟล์และเมนู" : "Profile and menu"}
        aria-expanded={isDrawerOpen}
        aria-haspopup="dialog"
        className={`btn-icon btn-icon-lg relative overflow-visible cursor-pointer ${
          user?.avatarUrl ? "!p-0" : ""
        } ${isDrawerOpen ? "ring-2 ring-[var(--color-text-primary)]" : ""}`}
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

      <AirbnbMenuDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        variant="traveller"
        user={user}
        onRefreshProfile={onRefreshProfile}
        onSignOut={onSignOut}
        language={language}
        onToggleLanguage={onToggleLanguage}
        isDarkTheme={isDarkTheme}
        onToggleTheme={onToggleTheme}
        activeTab={activeTab}
        onOpenCouponWallet={onOpenCouponWallet}
      />
    </div>
  );
}
