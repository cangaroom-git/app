"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { addDaysToDate, formatDateStr } from "@/lib/bookingMath";
import type { LanguageCode } from "@/lib/dateFormatters";
import type { AuthenticatedMeDto, CouponDealDto } from "@/types/cangaroom";
import {
  getTabIdFromPathname,
  type PlatformNavTabId,
} from "@/components/navigation/NavigationIcons";
import { PrimaryNavigation } from "@/components/navigation/PrimaryNavigation";
import { useAuthenticatedProfile } from "@/components/navigation/UserProfileDropdown";
import { CookieConsentBanner } from "@/components/privacy/CookieConsentBanner";

const CouponWalletDrawer = dynamic(
  () =>
    import("@/components/drawers/CouponWalletDrawer").then(
      (mod) => mod.CouponWalletDrawer
    ),
  { ssr: false }
);

export type Lang = LanguageCode;
export type ThemeMode = "light" | "dark";

const THEME_STORAGE_KEY = "my-hotel-theme";
const LANGUAGE_STORAGE_KEY = "my-hotel-lang";

export interface PlatformAppContextValue {
  lang: Lang;
  setLang: (nextLang: Lang) => void;
  theme: ThemeMode;
  setTheme: (nextTheme: ThemeMode) => void;
  toggleTheme: () => void;
  today: Date;
  checkIn: string;
  setCheckIn: (dateStr: string) => void;
  checkOut: string;
  setCheckOut: (dateStr: string) => void;
  guests: number;
  setGuests: (guests: number) => void;
  isDateFilterActive: boolean;
  setIsDateFilterActive: (active: boolean) => void;
  globalSearchQuery: string;
  setGlobalSearchQuery: (query: string) => void;
  selectedProvinceId: string | null;
  setSelectedProvinceId: (provinceId: string | null) => void;
  user: AuthenticatedMeDto | null;
  isCheckingSession: boolean;
  refreshMe: () => Promise<void>;
  signOutUser: () => Promise<void>;
  walletCoupons: CouponDealDto[];
  openCouponWallet: () => void;
  claimCouponToWallet: (params: {
    couponId?: string;
    code?: string;
    hotelId?: string;
  }) => Promise<{ success: boolean; message: string }>;
}

const PlatformAppContext = createContext<PlatformAppContextValue | null>(null);

export function useHotelApp(): PlatformAppContextValue {
  const ctx = useContext(PlatformAppContext);
  if (!ctx) {
    throw new Error("useHotelApp must be used within HotelAppShell");
  }
  return ctx;
}

export function HotelAppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const activeTab: PlatformNavTabId = getTabIdFromPathname(pathname);

  const [lang, setLangState] = useState<Lang>("th");
  const [theme, setThemeState] = useState<ThemeMode>("light");

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [checkIn, setCheckIn] = useState<string>(() => addDaysToDate(today, 1));
  const [checkOut, setCheckOut] = useState<string>(() => addDaysToDate(today, 2));
  const [guests, setGuests] = useState<number>(2);
  const [isDateFilterActive, setIsDateFilterActive] = useState<boolean>(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState<string>("");
  const [selectedProvinceId, setSelectedProvinceId] = useState<string | null>(null);

  const { user, isCheckingSession, refreshProfile, signOutUser } =
    useAuthenticatedProfile();

  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [walletCoupons, setWalletCoupons] = useState<CouponDealDto[]>([]);
  const [recommendedDeals, setRecommendedDeals] = useState<CouponDealDto[]>([]);

  // Hydrate UI preferences only (theme + lang — never business data)
  useEffect(() => {
    try {
      const savedLang = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (savedLang === "en" || savedLang === "th") setLangState(savedLang);
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme === "dark" || savedTheme === "light") {
        setThemeState(savedTheme);
        document.documentElement.classList.toggle("dark", savedTheme === "dark");
      }
    } catch {
      // ignore
    }
  }, []);

  const setLang = useCallback((nextLang: Lang) => {
    setLangState(nextLang);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLang);
    } catch {
      // ignore
    }
  }, []);

  const setTheme = useCallback((nextTheme: ThemeMode) => {
    setThemeState(nextTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
      document.documentElement.classList.toggle("dark", nextTheme === "dark");
    } catch {
      // ignore
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  const loadWalletAndDeals = useCallback(async () => {
    try {
      const [walletRes, dealsRes] = await Promise.all([
        fetch("/api/wallet/coupons", { cache: "no-store" }),
        fetch("/api/deals", { cache: "no-store" }),
      ]);
      if (walletRes.ok) {
        const wData = (await walletRes.json()) as { coupons?: CouponDealDto[] };
        setWalletCoupons(wData.coupons || []);
      }
      if (dealsRes.ok) {
        const dData = (await dealsRes.json()) as { deals?: CouponDealDto[] };
        setRecommendedDeals(dData.deals || []);
      }
    } catch {
      // ignore transient network errors
    }
  }, []);

  useEffect(() => {
    loadWalletAndDeals();
  }, [user?.id, loadWalletAndDeals]);

  const claimCouponToWallet = useCallback(
    async (params: { couponId?: string; code?: string; hotelId?: string }) => {
      try {
        const res = await fetch("/api/wallet/coupons", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
        });
        const data = (await res.json()) as {
          error?: string;
          alreadyClaimed?: boolean;
          couponCode?: string;
        };
        if (!res.ok) {
          return {
            success: false,
            message: data.error || "ไม่สามารถเก็บคูปองได้",
          };
        }
        await Promise.all([loadWalletAndDeals(), refreshProfile()]);
        return {
          success: true,
          message: data.alreadyClaimed
            ? `คุณมีโค้ด ${data.couponCode} อยู่ในกระเป๋าแล้ว`
            : `เก็บโค้ด ${data.couponCode} เข้ากระเป๋าสำเร็จ!`,
        };
      } catch {
        return { success: false, message: "เกิดข้อผิดพลาดในการเชื่อมต่อ" };
      }
    },
    [loadWalletAndDeals, refreshProfile]
  );

  const removeCouponFromWallet = useCallback(
    async (couponId: string) => {
      await fetch(`/api/wallet/coupons?couponId=${encodeURIComponent(couponId)}`, {
        method: "DELETE",
      });
      await Promise.all([loadWalletAndDeals(), refreshProfile()]);
    },
    [loadWalletAndDeals, refreshProfile]
  );

  const handleSetCheckIn = useCallback(
    (nextIn: string) => {
      setCheckIn(nextIn);
      if (nextIn >= checkOut) {
        setCheckOut(addDaysToDate(nextIn, 1));
      }
    },
    [checkOut]
  );

  const handleSetCheckOut = useCallback(
    (nextOut: string) => {
      if (nextOut <= checkIn) {
        setCheckOut(addDaysToDate(checkIn, 1));
      } else {
        setCheckOut(nextOut);
      }
    },
    [checkIn]
  );

  const isAuthFullScreenPage = activeTab === "login";

  const showSearchBar =
    activeTab === "home" || activeTab === "board" || activeTab === "deal";
  const isFluidFeedPage = activeTab === "home" || activeTab === "board";

  const contextValue: PlatformAppContextValue = useMemo(
    () => ({
      lang,
      setLang,
      theme,
      setTheme,
      toggleTheme,
      today,
      checkIn,
      setCheckIn: handleSetCheckIn,
      checkOut,
      setCheckOut: handleSetCheckOut,
      guests,
      setGuests,
      isDateFilterActive,
      setIsDateFilterActive,
      globalSearchQuery,
      setGlobalSearchQuery,
      selectedProvinceId,
      setSelectedProvinceId,
      user,
      isCheckingSession,
      refreshMe: refreshProfile,
      signOutUser,
      walletCoupons,
      openCouponWallet: () => {
        loadWalletAndDeals();
        setIsWalletOpen(true);
      },
      claimCouponToWallet,
    }),
    [
      lang,
      setLang,
      theme,
      setTheme,
      toggleTheme,
      today,
      checkIn,
      handleSetCheckIn,
      checkOut,
      handleSetCheckOut,
      guests,
      isDateFilterActive,
      globalSearchQuery,
      selectedProvinceId,
      user,
      isCheckingSession,
      refreshProfile,
      signOutUser,
      walletCoupons,
      loadWalletAndDeals,
      claimCouponToWallet,
    ]
  );

  const todayFormatted = formatDateStr(today);
  void todayFormatted;

  return (
    <PlatformAppContext.Provider value={contextValue}>
      {isAuthFullScreenPage ? (
        <main className="min-h-[100dvh] bg-[var(--color-background-body)] text-[var(--color-text-primary)]">
          {children}
        </main>
      ) : (
        <div className="min-h-[100dvh] bg-[var(--color-background-body)] text-[var(--color-text-primary)]">
          <PrimaryNavigation
            activeTab={activeTab}
            showSearchBar={showSearchBar}
            user={user}
            onRefreshProfile={refreshProfile}
            onSignOut={signOutUser}
            language={lang}
            onChangeLanguage={setLang}
            theme={theme}
            onToggleTheme={toggleTheme}
            onOpenCouponWallet={() => {
              loadWalletAndDeals();
              setIsWalletOpen(true);
            }}
            checkInDate={checkIn}
            checkOutDate={checkOut}
            onChangeCheckInDate={handleSetCheckIn}
            onChangeCheckOutDate={handleSetCheckOut}
            todayDate={today}
            guestCount={guests}
            onChangeGuestCount={setGuests}
            isDateFilterActive={isDateFilterActive}
            onChangeDateFilterActive={setIsDateFilterActive}
            selectedProvinceId={selectedProvinceId}
            onSelectProvince={setSelectedProvinceId}
            searchQuery={globalSearchQuery}
            onChangeSearchQuery={setGlobalSearchQuery}
          />

          <main
            data-cgr-app-main="true"
            className="pt-16 pb-[calc(80px+env(safe-area-inset-bottom))] lg:pb-12 lg:pl-[72px]"
          >
            <div
              data-cgr-app-inner="true"
              className={
                isFluidFeedPage
                  ? "px-1.5 sm:px-6 lg:px-8 pt-2 sm:pt-5"
                  : "px-4 sm:px-6 lg:px-8 pt-5"
              }
            >
              {children}
            </div>
          </main>

          <CouponWalletDrawer
            isOpen={isWalletOpen}
            onClose={() => setIsWalletOpen(false)}
            language={lang}
            isAuthenticated={Boolean(user)}
            walletCoupons={walletCoupons}
            recommendedDeals={recommendedDeals}
            onClaimCoupon={claimCouponToWallet}
            onRemoveCoupon={removeCouponFromWallet}
          />

          <CookieConsentBanner language={lang} theme={theme} />
        </div>
      )}
    </PlatformAppContext.Provider>
  );
}
