"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
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
  const inFlightRef = useRef<Promise<void> | null>(null);
  const lastFetchedAtRef = useRef<number>(0);

  const refreshProfile = useCallback(async () => {
    if (inFlightRef.current) {
      return inFlightRef.current;
    }

    const run = (async () => {
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
        lastFetchedAtRef.current = Date.now();
        if (res.ok) {
          const data = (await res.json()) as { user?: AuthenticatedMeDto | null };
          const loadedUser = data.user ?? null;
          setUser((prev) =>
            JSON.stringify(prev) === JSON.stringify(loadedUser)
              ? prev
              : loadedUser
          );
          if (loadedUser?.email) {
            saveReturningAccountHint({
              name: loadedUser.name || loadedUser.email.split("@")[0],
              email: loadedUser.email,
              avatarUrl: loadedUser.avatarUrl ?? null,
            });
          }
        } else {
          setUser((prev) => (prev === null ? prev : null));
        }
      } catch {
        setUser((prev) => (prev === null ? prev : null));
      } finally {
        setIsCheckingSession(false);
        inFlightRef.current = null;
      }
    })();

    inFlightRef.current = run;
    return run;
  }, []);

  useEffect(() => {
    void refreshProfile();
    const handleFocusRefresh = () => {
      // Throttle passive window focus refetches (15s) to prevent flicker when switching tabs/DevTools
      if (Date.now() - lastFetchedAtRef.current < 15000) return;
      void refreshProfile();
    };
    const handleRefreshEvent = () => {
      void refreshProfile();
    };
    window.addEventListener("focus", handleFocusRefresh);
    window.addEventListener("cangaroom-me-refresh", handleRefreshEvent);
    return () => {
      window.removeEventListener("focus", handleFocusRefresh);
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

export function SuperAdminAvatarCircle({
  sizeClass = "h-9 w-9",
}: {
  sizeClass?: string;
}) {
  return (
    <span
      aria-label="Nondii Super Admin"
      className={`${sizeClass} rounded-full bg-[#11161d] text-white inline-flex items-center justify-center shrink-0 select-none`}
    >
      <svg
        aria-hidden="true"
        viewBox="94 12 52 46"
        fill="currentColor"
        className="w-[62%] h-[62%]"
      >
        <path d="M108.901,53.84C101.942,52.031 96.799,45.701 96.799,38.179C96.799,29.249 104.049,21.998 112.979,21.998C114.082,21.998 115.16,22.109 116.201,22.32C117.911,18.082 122.065,15.089 126.912,15.089C133.283,15.089 138.457,20.262 138.457,26.634C138.457,28.235 138.13,29.76 137.54,31.146C140.872,33.442 143.058,37.284 143.058,41.633C143.058,48.339 137.86,53.84 131.277,54.325L131.277,54.332L131.163,54.332C130.888,54.35 130.611,54.359 130.331,54.359C130.052,54.359 129.774,54.35 129.499,54.332L124.074,54.332L126.63,49.905L130.331,49.905C134.897,49.905 138.603,46.198 138.603,41.633C138.603,38.815 137.192,36.325 135.038,34.831C133.702,33.904 132.079,33.36 130.331,33.36C129.699,33.36 129.083,33.432 128.491,33.566C127.741,33.737 127.029,34.01 126.372,34.369C125.892,34.63 125.326,34.679 124.809,34.505C124.291,34.33 123.871,33.948 123.648,33.449C123.482,33.1 123.303,32.758 123.111,32.425C122.939,32.127 122.756,31.837 122.562,31.555C121.98,30.717 121.292,29.958 120.517,29.299C119.063,28.064 117.303,27.179 115.367,26.775C114.596,26.614 113.797,26.529 112.979,26.529C106.549,26.529 101.329,31.749 101.329,38.179C101.329,44.034 105.658,48.886 111.287,49.707L108.901,53.84ZM116.349,49.852C118.515,49.874 120.663,49.905 120.663,49.905L121.484,49.905L118.928,54.332L113.918,54.332C113.864,54.336 113.811,54.338 113.758,54.341L116.349,49.852ZM133.323,29.26C133.655,28.45 133.839,27.563 133.839,26.634C133.839,22.811 130.735,19.707 126.912,19.707C124.067,19.707 121.62,21.426 120.554,23.88C123.02,25.19 125.107,27.12 126.609,29.46C127.786,29.1 129.036,28.906 130.331,28.906C131.361,28.906 132.363,29.029 133.323,29.26Z" />
      </svg>
    </span>
  );
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

  if (user?.role === "SUPER_ADMIN") {
    return <SuperAdminAvatarCircle sizeClass={sizeClass} />;
  }

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
        className={`${sizeClass} rounded-full bg-[var(--color-accent)] text-[var(--color-on-accent)] inline-flex items-center justify-center ty-caption font-semibold shrink-0`}
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
