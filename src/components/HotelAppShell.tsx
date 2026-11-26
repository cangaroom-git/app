"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { addDaysToDate, formatDateStr } from "@/lib/bookingMath";
import {
  clearNearbyHopOrigin,
  saveNearbyHopOrigin,
} from "@/lib/placeNavigationStore";
import { recordRecentViewedPinId } from "@/lib/telemetry/clientTelemetry";
import {
  readLastUsedBoardId,
  saveLastUsedBoardId,
} from "@/lib/auth/accountHint";
import type { LanguageCode } from "@/lib/dateFormatters";
import type {
  AuthenticatedMeDto,
  CouponDealDto,
  PinFeedItemDto,
  SavedBoardDto,
} from "@/types/cangaroom";
import type {
  ActivePlaceFlipTransition,
  RouteHeroTargetRect,
} from "@/components/navigation/PlaceCardFlipOverlay";
import type { CardOriginRect } from "@/components/trip/TripCardFlipModal";
import {
  getTabIdFromPathname,
  type PlatformNavTabId,
} from "@/components/navigation/NavigationIcons";
import { PrimaryNavigation } from "@/components/navigation/PrimaryNavigation";
import { RouteProgressBar } from "@/components/navigation/RouteProgressBar";
import { useAuthenticatedProfile } from "@/components/navigation/UserProfileDropdown";
import type { BoardSaveToastState } from "@/components/board/BoardActionModals";

const PlaceCardFlipOverlay = dynamic(
  () =>
    import("@/components/navigation/PlaceCardFlipOverlay").then(
      (mod) => mod.PlaceCardFlipOverlay
    ),
  { ssr: false }
);

const CookieConsentBanner = dynamic(
  () =>
    import("@/components/privacy/CookieConsentBanner").then(
      (mod) => mod.CookieConsentBanner
    ),
  { ssr: false }
);

const AuthPromptModal = dynamic(
  () =>
    import("@/components/auth/AuthPromptModal").then(
      (mod) => mod.AuthPromptModal
    ),
  { ssr: false }
);

const BoardSaveToast = dynamic(
  () =>
    import("@/components/board/BoardActionModals").then(
      (mod) => mod.BoardSaveToast
    ),
  { ssr: false }
);

const ChooseBoardModal = dynamic(
  () =>
    import("@/components/board/BoardActionModals").then(
      (mod) => mod.ChooseBoardModal
    ),
  { ssr: false }
);

const CreateBoardModal = dynamic(
  () =>
    import("@/components/board/BoardActionModals").then(
      (mod) => mod.CreateBoardModal
    ),
  { ssr: false }
);

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
  claimedCouponIds: Set<string>;
  openCouponWallet: () => void;
  claimCouponToWallet: (params: {
    couponId?: string;
    code?: string;
    hotelId?: string;
  }) => Promise<{ success: boolean; message: string }>;
  openAuthModal: (options?: {
    reasonTh?: string;
    reasonEn?: string;
    onSuccess?: () => void | Promise<void>;
  }) => void;
  savedBoards: SavedBoardDto[];
  savedPinIds: Set<string>;
  hasLoadedBoardsOnce: boolean;
  isLoadingBoards: boolean;
  refreshSavedBoards: () => Promise<SavedBoardDto[]>;
  triggerPinToBoard: (pin: {
    id: string;
    coverImageUrl: string;
    isSavedByMe?: boolean;
  }) => Promise<{ isSaved: boolean; boardId: string | null } | null>;
  openCreateBoardModal: () => void;
  deleteSavedBoard: (boardId: string) => Promise<boolean>;
  reorderSavedBoardPins: (
    boardId: string,
    orderedPinIds: string[]
  ) => Promise<boolean>;
  pinLikeOverrides: Record<string, { isLiked: boolean; likesCount: number }>;
  togglePinLikeInstant: (pin: {
    id: string;
    isLikedByMe: boolean;
    likesCount: number;
  }) => void;
  navigateToPlaceWithFlip: (params: {
    pin: PinFeedItemDto;
    originRect?: CardOriginRect | null;
    href?: string;
    fromNearbyOf?: {
      fromSlug: string;
      fromNameTh: string;
      fromNameEn: string;
    } | null;
    openInNewTab?: boolean;
  }) => void;
  signalPlaceHeroReady: (slug: string, rect: RouteHeroTargetRect) => void;
  activeFlipTargetSlug: string | null;
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
  const router = useRouter();
  const activeTab: PlatformNavTabId = getTabIdFromPathname(pathname);

  // Persistent Cross-Route 3D Card Flip state (survives Next.js route transitions at 120fps!)
  const flipSeqRef = useRef(0);
  const flipLaunchPathRef = useRef<string>("");
  const [activeFlipTransition, setActiveFlipTransition] =
    useState<ActivePlaceFlipTransition | null>(null);
  const [readyRouteHero, setReadyRouteHero] = useState<{
    slug: string;
    rect: RouteHeroTargetRect;
  } | null>(null);

  const navigateToPlaceWithFlip = useCallback(
    (params: {
      pin: PinFeedItemDto;
      originRect?: CardOriginRect | null;
      href?: string;
      fromNearbyOf?: {
        fromSlug: string;
        fromNameTh: string;
        fromNameEn: string;
      } | null;
      openInNewTab?: boolean;
    }) => {
      const { pin, originRect, href, fromNearbyOf, openInNewTab } = params;
      const targetSlug = (pin.hotelSlug || "").trim();
      const targetHref = href || `/${encodeURIComponent(targetSlug)}`;
      if (!targetSlug) return;

      recordRecentViewedPinId(pin.id);

      if (openInNewTab && typeof window !== "undefined") {
        window.open(targetHref, "_blank", "noopener,noreferrer");
        return;
      }

      if (fromNearbyOf) {
        saveNearbyHopOrigin({
          fromSlug: fromNearbyOf.fromSlug,
          fromNameTh: fromNearbyOf.fromNameTh,
          fromNameEn: fromNearbyOf.fromNameEn,
          targetSlug,
        });
      } else {
        clearNearbyHopOrigin();
      }

      const prefersReducedMotion =
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

      if (
        originRect &&
        originRect.width >= 30 &&
        originRect.height >= 30 &&
        !prefersReducedMotion &&
        typeof window !== "undefined"
      ) {
        const nextId = ++flipSeqRef.current;
        flipLaunchPathRef.current = pathname;
        setReadyRouteHero(null);
        setActiveFlipTransition({
          id: nextId,
          slug: targetSlug,
          pin,
          originRect,
          hasNearbyBackBar: Boolean(fromNearbyOf),
        });
      }

      router.push(targetHref);
    },
    [pathname, router]
  );

  // If the user clicks another route (or browser Back) while waiting on a slow network,
  // dismiss the pending flip skeleton immediately so it never lingers on an unrelated page.
  useEffect(() => {
    if (!activeFlipTransition) return;
    const expectedPath = `/${activeFlipTransition.slug.toLowerCase()}`;
    const currentPath = decodeURIComponent(pathname).toLowerCase();
    if (
      pathname !== flipLaunchPathRef.current &&
      currentPath !== expectedPath
    ) {
      setActiveFlipTransition(null);
    }
  }, [activeFlipTransition, pathname]);

  const signalPlaceHeroReady = useCallback(
    (slug: string, rect: RouteHeroTargetRect) => {
      setReadyRouteHero({ slug, rect });
    },
    []
  );

  const handleCompleteFlipTransition = useCallback((id: number) => {
    setActiveFlipTransition((prev) => (prev && prev.id === id ? null : prev));
  }, []);

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
  const [optimisticClaimedCouponIds, setOptimisticClaimedCouponIds] =
    useState<Set<string>>(() => new Set());
  const [recommendedDeals, setRecommendedDeals] = useState<CouponDealDto[]>([]);

  // Global Auth Prompt Modal state (Desktop dialog / Mobile compact Bottom Sheet)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalReason, setAuthModalReason] = useState<{
    th?: string;
    en?: string;
  } | null>(null);
  const pendingAuthCallbackRef = useRef<(() => void | Promise<void>) | null>(
    null
  );

  // Global Airbnb-Style Board Save / Create / Move / Toast state
  const [savedBoards, setSavedBoards] = useState<SavedBoardDto[]>([]);
  const [isLoadingBoards, setIsLoadingBoards] = useState(false);
  const [hasLoadedBoardsOnce, setHasLoadedBoardsOnce] = useState(false);
  const [optimisticSavedOverrides, setOptimisticSavedOverrides] = useState<
    Record<string, boolean>
  >({});

  // Global 0ms Optimistic Like store + Per-Pin Coalescing Queue (Zero Delay, Zero Race Conditions!)
  const [pinLikeOverrides, setPinLikeOverrides] = useState<
    Record<string, { isLiked: boolean; likesCount: number }>
  >({});
  const pinLikeOverridesRef = useRef(pinLikeOverrides);
  pinLikeOverridesRef.current = pinLikeOverrides;
  const likeInFlightRef = useRef<Set<string>>(new Set());
  const likeDesiredQueueRef = useRef<Map<string, boolean>>(new Map());
  const likeRollbackRef = useRef<
    Map<string, { isLiked: boolean; likesCount: number }>
  >(new Map());
  const prevLikeUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const nextUserId = user?.id ?? null;
    const prevUserId = prevLikeUserIdRef.current;
    prevLikeUserIdRef.current = nextUserId;
    // Only reset optimistic like cache when signing out or switching accounts —
    // keep optimistic taps queued via in-place AuthModal onSuccess (null -> loggedIn)!
    if (prevUserId !== null && prevUserId !== nextUserId) {
      pinLikeOverridesRef.current = {};
      setPinLikeOverrides({});
      likeInFlightRef.current.clear();
      likeDesiredQueueRef.current.clear();
      likeRollbackRef.current.clear();
    }
  }, [user?.id]);

  const flushPinLikeQueue = useCallback(async (pinId: string) => {
    if (likeInFlightRef.current.has(pinId)) return;
    likeInFlightRef.current.add(pinId);

    try {
      while (likeDesiredQueueRef.current.has(pinId)) {
        const desiredLiked = likeDesiredQueueRef.current.get(pinId)!;
        likeDesiredQueueRef.current.delete(pinId);

        const res = await fetch(`/api/pins/${encodeURIComponent(pinId)}/like`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ desiredLiked }),
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data = (await res.json()) as {
          isLiked: boolean;
          likesCount: number;
        };

        // Only sync server count once no newer optimistic tap is queued
        if (!likeDesiredQueueRef.current.has(pinId)) {
          const synced = {
            isLiked: data.isLiked,
            likesCount: data.likesCount,
          };
          pinLikeOverridesRef.current = {
            ...pinLikeOverridesRef.current,
            [pinId]: synced,
          };
          setPinLikeOverrides((prev) => ({
            ...prev,
            [pinId]: synced,
          }));
          likeRollbackRef.current.delete(pinId);
        }
      }
    } catch {
      const rollback = likeRollbackRef.current.get(pinId);
      likeRollbackRef.current.delete(pinId);
      likeDesiredQueueRef.current.delete(pinId);
      if (rollback) {
        pinLikeOverridesRef.current = {
          ...pinLikeOverridesRef.current,
          [pinId]: rollback,
        };
        setPinLikeOverrides((prev) => ({ ...prev, [pinId]: rollback }));
      }
    } finally {
      likeInFlightRef.current.delete(pinId);
    }
  }, []);

  const performOptimisticLike = useCallback(
    (pin: { id: string; isLikedByMe: boolean; likesCount: number }) => {
      const current = pinLikeOverridesRef.current[pin.id] ?? {
        isLiked: pin.isLikedByMe,
        likesCount: pin.likesCount,
      };
      if (!likeRollbackRef.current.has(pin.id)) {
        likeRollbackRef.current.set(pin.id, current);
      }
      const nextLiked = !current.isLiked;
      const nextCount = Math.max(0, current.likesCount + (nextLiked ? 1 : -1));
      const nextEntry = { isLiked: nextLiked, likesCount: nextCount };
      pinLikeOverridesRef.current = {
        ...pinLikeOverridesRef.current,
        [pin.id]: nextEntry,
      };
      setPinLikeOverrides((prev) => ({ ...prev, [pin.id]: nextEntry }));
      likeDesiredQueueRef.current.set(pin.id, nextLiked);
      void flushPinLikeQueue(pin.id);
    },
    [flushPinLikeQueue]
  );

  const [isCreateBoardOpen, setIsCreateBoardOpen] = useState(false);
  const [isCreatingBoardSubmit, setIsCreatingBoardSubmit] = useState(false);
  const pendingPinForCreateRef = useRef<{
    id: string;
    coverImageUrl: string;
    moveFromBoardId?: string | null;
  } | null>(null);

  const [chooseBoardContext, setChooseBoardContext] = useState<{
    pinId: string;
    coverImageUrl: string;
    currentBoardId: string | null;
  } | null>(null);
  const [isMovingBoard, setIsMovingBoard] = useState(false);

  const [boardToast, setBoardToast] = useState<BoardSaveToastState | null>(null);
  const boardToastTimerRef = useRef<number | null>(null);

  const showBoardToast = useCallback((next: BoardSaveToastState) => {
    if (boardToastTimerRef.current !== null) {
      window.clearTimeout(boardToastTimerRef.current);
    }
    setBoardToast(next);
    boardToastTimerRef.current = window.setTimeout(() => {
      setBoardToast(null);
      boardToastTimerRef.current = null;
    }, 4800);
  }, []);

  const refreshSavedBoards = useCallback(async (): Promise<SavedBoardDto[]> => {
    setIsLoadingBoards(true);
    try {
      const res = await fetch("/api/boards", { cache: "no-store" });
      if (!res.ok) return [];
      const data = (await res.json()) as {
        authenticated?: boolean;
        boards?: SavedBoardDto[];
      };
      const list = Array.isArray(data.boards) ? data.boards : [];
      setSavedBoards(list);
      setHasLoadedBoardsOnce(true);
      setOptimisticSavedOverrides({});
      return list;
    } catch {
      return [];
    } finally {
      setIsLoadingBoards(false);
    }
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setSavedBoards([]);
      setHasLoadedBoardsOnce(false);
      setOptimisticSavedOverrides({});
      return;
    }
    void refreshSavedBoards();
  }, [user?.id, refreshSavedBoards]);

  const savedPinIds = useMemo(() => {
    const set = new Set<string>();
    for (const board of savedBoards) {
      for (const item of board.items) {
        set.add(item.pin.id);
      }
    }
    for (const [pinId, val] of Object.entries(optimisticSavedOverrides)) {
      if (val) set.add(pinId);
      else set.delete(pinId);
    }
    return set;
  }, [optimisticSavedOverrides, savedBoards]);

  const openAuthModal = useCallback(
    (options?: {
      reasonTh?: string;
      reasonEn?: string;
      onSuccess?: () => void | Promise<void>;
    }) => {
      pendingAuthCallbackRef.current = options?.onSuccess ?? null;
      setAuthModalReason(
        options?.reasonTh || options?.reasonEn
          ? { th: options.reasonTh, en: options.reasonEn }
          : null
      );
      setIsAuthModalOpen(true);
    },
    []
  );

  const togglePinLikeInstant = useCallback(
    (pin: { id: string; isLikedByMe: boolean; likesCount: number }) => {
      if (!user) {
        openAuthModal({
          reasonTh: "เข้าสู่ระบบเพื่อกดถูกใจที่พักนี้",
          reasonEn: "Log in to like this stay",
          onSuccess: () => performOptimisticLike(pin),
        });
        return;
      }
      performOptimisticLike(pin);
    },
    [openAuthModal, performOptimisticLike, user]
  );

  const executePinToBoardForAuthenticatedUser = useCallback(
    async (
      pin: { id: string; coverImageUrl: string; isSavedByMe?: boolean },
      knownBoards?: SavedBoardDto[]
    ): Promise<{ isSaved: boolean; boardId: string | null } | null> => {
      const boardsList =
        knownBoards ??
        (hasLoadedBoardsOnce ? savedBoards : await refreshSavedBoards());

      const currentlySaved =
        savedPinIds.has(pin.id) ||
        Boolean(
          pin.isSavedByMe && optimisticSavedOverrides[pin.id] !== false
        );

      // Already saved -> 1-click silent unsave (no notification toast)
      if (currentlySaved) {
        setOptimisticSavedOverrides((prev) => ({ ...prev, [pin.id]: false }));
        if (boardToastTimerRef.current !== null) {
          window.clearTimeout(boardToastTimerRef.current);
          boardToastTimerRef.current = null;
        }
        setBoardToast((prev) => (prev?.pinId === pin.id ? null : prev));
        try {
          const res = await fetch("/api/boards/toggle-pin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pinId: pin.id, action: "unsave" }),
          });
          if (!res.ok) {
            setOptimisticSavedOverrides((prev) => ({
              ...prev,
              [pin.id]: true,
            }));
            return null;
          }
          await Promise.all([refreshSavedBoards(), refreshProfile()]);
          return { isSaved: false, boardId: null };
        } catch {
          setOptimisticSavedOverrides((prev) => ({ ...prev, [pin.id]: true }));
          return null;
        }
      }

      // First time ever (0 boards) -> Open Airbnb "Create board" modal!
      if (boardsList.length === 0) {
        pendingPinForCreateRef.current = {
          id: pin.id,
          coverImageUrl: pin.coverImageUrl,
          moveFromBoardId: null,
        };
        setIsCreateBoardOpen(true);
        return null;
      }

      // Has >= 1 board -> 1-click save to last-used (or latest) board + Floating Bottom-Left Toast!
      const lastBoardId = readLastUsedBoardId();
      const targetBoard =
        boardsList.find((b) => b.id === lastBoardId) ??
        boardsList[boardsList.length - 1];

      setOptimisticSavedOverrides((prev) => ({ ...prev, [pin.id]: true }));
      try {
        const res = await fetch("/api/boards/toggle-pin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pinId: pin.id,
            boardId: targetBoard.id,
            action: "save",
          }),
        });
        if (!res.ok) {
          setOptimisticSavedOverrides((prev) => ({
            ...prev,
            [pin.id]: false,
          }));
          return null;
        }
        const data = (await res.json()) as {
          isSaved: boolean;
          boardId: string | null;
          boardName?: string | null;
        };
        saveLastUsedBoardId(data.boardId ?? targetBoard.id);
        await Promise.all([refreshSavedBoards(), refreshProfile()]);
        showBoardToast({
          pinId: pin.id,
          thumbnailUrl: pin.coverImageUrl,
          boardId: data.boardId ?? targetBoard.id,
          boardName: data.boardName ?? targetBoard.name,
          action: "saved",
        });
        return { isSaved: true, boardId: data.boardId ?? targetBoard.id };
      } catch {
        setOptimisticSavedOverrides((prev) => ({ ...prev, [pin.id]: false }));
        return null;
      }
    },
    [
      hasLoadedBoardsOnce,
      optimisticSavedOverrides,
      refreshProfile,
      refreshSavedBoards,
      savedBoards,
      savedPinIds,
      showBoardToast,
    ]
  );

  const triggerPinToBoard = useCallback(
    async (pin: {
      id: string;
      coverImageUrl: string;
      isSavedByMe?: boolean;
    }): Promise<{ isSaved: boolean; boardId: string | null } | null> => {
      if (!user) {
        openAuthModal({
          reasonTh: "เข้าสู่ระบบเพื่อปักหมุดที่พักลงทริปของคุณ",
          reasonEn: "Log in to save stays to your trips",
          onSuccess: async () => {
            const loaded = await refreshSavedBoards();
            await executePinToBoardForAuthenticatedUser(pin, loaded);
          },
        });
        return null;
      }
      return executePinToBoardForAuthenticatedUser(pin);
    },
    [
      executePinToBoardForAuthenticatedUser,
      openAuthModal,
      refreshSavedBoards,
      user,
    ]
  );

  const handleCreateBoardSubmit = useCallback(
    async (boardName: string) => {
      setIsCreatingBoardSubmit(true);
      try {
        const res = await fetch("/api/boards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: boardName }),
        });
        const data = (await res.json()) as {
          board?: { id: string; name: string };
          error?: string;
        };
        if (!res.ok || !data.board) {
          throw new Error(data.error || "สร้างทริปไม่สำเร็จ");
        }

        const newBoard = data.board;
        saveLastUsedBoardId(newBoard.id);

        const pendingPin = pendingPinForCreateRef.current;
        pendingPinForCreateRef.current = null;

        if (pendingPin) {
          setOptimisticSavedOverrides((prev) => ({
            ...prev,
            [pendingPin.id]: true,
          }));
          await fetch("/api/boards/toggle-pin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              pinId: pendingPin.id,
              boardId: newBoard.id,
              action: pendingPin.moveFromBoardId ? "move" : "save",
              fromBoardId: pendingPin.moveFromBoardId ?? null,
            }),
          });
          showBoardToast({
            pinId: pendingPin.id,
            thumbnailUrl: pendingPin.coverImageUrl,
            boardId: newBoard.id,
            boardName: newBoard.name,
            action: "saved",
          });
        }

        await Promise.all([refreshSavedBoards(), refreshProfile()]);
        setIsCreateBoardOpen(false);
      } finally {
        setIsCreatingBoardSubmit(false);
      }
    },
    [refreshProfile, refreshSavedBoards, showBoardToast]
  );

  const handleMovePinToChosenBoard = useCallback(
    async (targetBoard: SavedBoardDto) => {
      if (!chooseBoardContext) return;
      setIsMovingBoard(true);
      try {
        const res = await fetch("/api/boards/toggle-pin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pinId: chooseBoardContext.pinId,
            boardId: targetBoard.id,
            fromBoardId: chooseBoardContext.currentBoardId,
            action: "move",
          }),
        });
        if (res.ok) {
          saveLastUsedBoardId(targetBoard.id);
          await Promise.all([refreshSavedBoards(), refreshProfile()]);
          showBoardToast({
            pinId: chooseBoardContext.pinId,
            thumbnailUrl: chooseBoardContext.coverImageUrl,
            boardId: targetBoard.id,
            boardName: targetBoard.name,
            action: "saved",
          });
        }
        setChooseBoardContext(null);
      } finally {
        setIsMovingBoard(false);
      }
    },
    [chooseBoardContext, refreshProfile, refreshSavedBoards, showBoardToast]
  );

  const deleteSavedBoard = useCallback(
    async (boardId: string): Promise<boolean> => {
      try {
        const res = await fetch(`/api/boards/${encodeURIComponent(boardId)}`, {
          method: "DELETE",
        });
        if (!res.ok) return false;
        if (readLastUsedBoardId() === boardId) {
          saveLastUsedBoardId(null);
        }
        await Promise.all([refreshSavedBoards(), refreshProfile()]);
        return true;
      } catch {
        return false;
      }
    },
    [refreshProfile, refreshSavedBoards]
  );

  const reorderSavedBoardPins = useCallback(
    async (boardId: string, orderedPinIds: string[]): Promise<boolean> => {
      if (orderedPinIds.length === 0) return true;
      // Instant optimistic reorder in context state
      setSavedBoards((prev) =>
        prev.map((b) => {
          if (b.id !== boardId) return b;
          const byPinId = new Map(b.items.map((it) => [it.pin.id, it]));
          const reordered: typeof b.items = [];
          orderedPinIds.forEach((pid, idx) => {
            const found = byPinId.get(pid);
            if (found) {
              reordered.push({ ...found, sortOrder: idx });
              byPinId.delete(pid);
            }
          });
          // Preserve any untouched items at the end
          for (const leftover of byPinId.values()) {
            reordered.push({ ...leftover, sortOrder: reordered.length });
          }
          return { ...b, items: reordered };
        })
      );

      try {
        const res = await fetch(`/api/boards/${encodeURIComponent(boardId)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderedPinIds }),
        });
        if (!res.ok) {
          await refreshSavedBoards();
          return false;
        }
        return true;
      } catch {
        await refreshSavedBoards();
        return false;
      }
    },
    [refreshSavedBoards]
  );

  const openCreateBoardModal = useCallback(() => {
    if (!user) {
      openAuthModal({
        reasonTh: "เข้าสู่ระบบเพื่อสร้างทริปที่พักของคุณ",
        reasonEn: "Log in to create a trip",
        onSuccess: () => {
          pendingPinForCreateRef.current = null;
          setIsCreateBoardOpen(true);
        },
      });
      return;
    }
    pendingPinForCreateRef.current = null;
    setIsCreateBoardOpen(true);
  }, [openAuthModal, user]);

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

  // Detect classic (layout-consuming) OS scrollbars vs macOS native overlay scrollbars.
  // macOS overlay scrollbars measure 0px -> keep native Airbnb-like floating overlay.
  // Windows/Linux/external-mouse classic scrollbars measure >0px -> activate clean floating pill styling.
  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    const syncScrollbarMode = () => {
      const html = document.documentElement;
      delete html.dataset.classicScrollbars;
      const probe = document.createElement("div");
      probe.style.cssText =
        "position:fixed;top:-9999px;left:-9999px;width:64px;height:64px;overflow:scroll;visibility:hidden;pointer-events:none;";
      document.body.appendChild(probe);
      const scrollbarWidth = Math.max(0, probe.offsetWidth - probe.clientWidth);
      probe.remove();
      html.dataset.scrollbarWidth = String(scrollbarWidth);
      if (scrollbarWidth > 0) {
        html.dataset.classicScrollbars = "true";
      }
    };

    syncScrollbarMode();

    let resizeTimer: number | null = null;
    const handleResize = () => {
      if (resizeTimer !== null) window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(syncScrollbarMode, 250);
    };

    window.addEventListener("resize", handleResize, { passive: true });
    return () => {
      window.removeEventListener("resize", handleResize);
      if (resizeTimer !== null) window.clearTimeout(resizeTimer);
    };
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

  const loadWalletCoupons = useCallback(async () => {
    try {
      const walletRes = await fetch("/api/wallet/coupons", {
        cache: "no-store",
      });
      if (walletRes.ok) {
        const wData = (await walletRes.json()) as { coupons?: CouponDealDto[] };
        setWalletCoupons(wData.coupons || []);
      }
    } catch {
      // ignore transient network errors
    }
  }, []);

  const loadRecommendedDeals = useCallback(async () => {
    try {
      const dealsRes = await fetch("/api/deals", { cache: "no-store" });
      if (dealsRes.ok) {
        const dData = (await dealsRes.json()) as { deals?: CouponDealDto[] };
        setRecommendedDeals(dData.deals || []);
      }
    } catch {
      // ignore transient network errors
    }
  }, []);

  const loadWalletAndDeals = useCallback(async () => {
    await Promise.all([loadWalletCoupons(), loadRecommendedDeals()]);
  }, [loadWalletCoupons, loadRecommendedDeals]);

  useEffect(() => {
    setOptimisticClaimedCouponIds(new Set());
    if (!user?.id) {
      setWalletCoupons([]);
      return;
    }
    // Only fetch legacy coupon wallet rows on booking/trips routes where coupons are redeemed
    if (activeTab === "hotel" || activeTab === "trips") {
      void loadWalletCoupons();
    }
  }, [user?.id, activeTab, loadWalletCoupons]);

  const claimedCouponIds = useMemo(() => {
    const set = new Set<string>(walletCoupons.map((c) => c.id));
    for (const id of optimisticClaimedCouponIds) {
      set.add(id);
    }
    return set;
  }, [walletCoupons, optimisticClaimedCouponIds]);

  const claimCouponToWallet = useCallback(
    async (params: { couponId?: string; code?: string; hotelId?: string }) => {
      const targetId = params.couponId;
      if (targetId) {
        setOptimisticClaimedCouponIds((prev) => {
          const next = new Set(prev);
          next.add(targetId);
          return next;
        });
      }
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
          if (targetId) {
            setOptimisticClaimedCouponIds((prev) => {
              const next = new Set(prev);
              next.delete(targetId);
              return next;
            });
          }
          return {
            success: false,
            message: data.error || "ไม่สามารถเก็บคูปองได้",
          };
        }
        await Promise.all([loadWalletAndDeals(), refreshProfile()]);
        if (targetId) {
          setOptimisticClaimedCouponIds((prev) => {
            const next = new Set(prev);
            next.delete(targetId);
            return next;
          });
        }
        return {
          success: true,
          message: data.alreadyClaimed
            ? `คุณมีโค้ด ${data.couponCode} อยู่ในกระเป๋าแล้ว`
            : `เก็บโค้ด ${data.couponCode} เข้ากระเป๋าสำเร็จ!`,
        };
      } catch {
        if (targetId) {
          setOptimisticClaimedCouponIds((prev) => {
            const next = new Set(prev);
            next.delete(targetId);
            return next;
          });
        }
        return { success: false, message: "เกิดข้อผิดพลาดในการเชื่อมต่อ" };
      }
    },
    [loadWalletAndDeals, refreshProfile]
  );

  const removeCouponFromWallet = useCallback(
    async (couponId: string) => {
      setOptimisticClaimedCouponIds((prev) => {
        const next = new Set(prev);
        next.delete(couponId);
        return next;
      });
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

  const isDedicatedShellPage =
    activeTab === "login" ||
    activeTab === "studio" ||
    activeTab === "register-hotel" ||
    activeTab === "super-admin";

  const showSearchBar =
    activeTab === "home" ||
    activeTab === "explore" ||
    activeTab === "board" ||
    activeTab === "wishlist";
  const isExploreFullBleed = activeTab === "explore";
  const isTripHeroFullBleed = pathname === "/trip";
  const isAccountSplitPage =
    pathname === "/account" ||
    pathname.startsWith("/account/") ||
    pathname === "/bookings" ||
    pathname.startsWith("/bookings/");

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
      claimedCouponIds,
      openCouponWallet: () => {
        if (user?.id) {
          void loadWalletCoupons();
        }
        if (recommendedDeals.length === 0) {
          void loadRecommendedDeals();
        }
        setIsWalletOpen(true);
      },
      claimCouponToWallet,
      openAuthModal,
      savedBoards,
      savedPinIds,
      hasLoadedBoardsOnce,
      isLoadingBoards,
      refreshSavedBoards,
      triggerPinToBoard,
      openCreateBoardModal,
      deleteSavedBoard,
      reorderSavedBoardPins,
      pinLikeOverrides,
      togglePinLikeInstant,
      navigateToPlaceWithFlip,
      signalPlaceHeroReady,
      activeFlipTargetSlug: activeFlipTransition?.slug ?? null,
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
      claimedCouponIds,
      recommendedDeals.length,
      loadWalletCoupons,
      loadRecommendedDeals,
      claimCouponToWallet,
      openAuthModal,
      savedBoards,
      savedPinIds,
      hasLoadedBoardsOnce,
      isLoadingBoards,
      refreshSavedBoards,
      triggerPinToBoard,
      openCreateBoardModal,
      deleteSavedBoard,
      reorderSavedBoardPins,
      pinLikeOverrides,
      togglePinLikeInstant,
      navigateToPlaceWithFlip,
      signalPlaceHeroReady,
      activeFlipTransition?.slug,
    ]
  );

  const todayFormatted = formatDateStr(today);
  void todayFormatted;

  // Zero-scroll-listener iOS Safari (iOS 15–18 & iOS 26+ Liquid Glass) status-bar sync.
  // Observes the full-height white sheet crossing the top 14% (~110px) band of the viewport
  // so fast flicks & iOS Tap-to-Top are guaranteed to trigger `true -> false` cleanly when
  // the entire top sampling zone is pure blue sky again (0 scroll/touch listeners).
  const hasActiveHomeSearch = globalSearchQuery.trim().length > 0;
  const isMobileHeroRoute =
    (pathname === "/" && !hasActiveHomeSearch) || pathname === "/trip";
  const [isMobileHeroCovered, setIsMobileHeroCovered] = useState(false);
  const [mobileChromeCommitTick, setMobileChromeCommitTick] = useState(0);
  const prevHeroCoveredRef = useRef(false);

  useEffect(() => {
    setIsMobileHeroCovered(false);
    prevHeroCoveredRef.current = false;
    if (!isMobileHeroRoute || typeof window === "undefined") return;
    if (window.innerWidth >= 1024 || typeof IntersectionObserver === "undefined") {
      return;
    }

    let io: IntersectionObserver | null = null;
    let mo: MutationObserver | null = null;

    const attachObserver = (el: Element) => {
      io = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (!entry) return;
          const covered = entry.isIntersecting;
          setIsMobileHeroCovered((prev) => (prev === covered ? prev : covered));
        },
        // Top 14% band (~110px on iPhone, taller than the 59px Dynamic Island safe area)
        { rootMargin: "0px 0px -86% 0px", threshold: 0 }
      );
      io.observe(el);
    };

    const existingSheet = document.querySelector('[data-cgr-hero-sheet="true"]');
    if (existingSheet) {
      attachObserver(existingSheet);
    } else {
      mo = new MutationObserver(() => {
        const found = document.querySelector('[data-cgr-hero-sheet="true"]');
        if (found) {
          mo?.disconnect();
          mo = null;
          attachObserver(found);
        }
      });
      mo.observe(document.body, { childList: true, subtree: true });
    }

    return () => {
      io?.disconnect();
      mo?.disconnect();
    };
  }, [isMobileHeroRoute, pathname]);

  // Note: `#fffffe` is visually identical to pure white `#ffffff` (1/255th off)
  // while bypassing iOS Safari's known optimization that ignores resets back to `#ffffff`.
  const mobileTopChromeColor =
    pathname === "/" && !hasActiveHomeSearch && !isMobileHeroCovered
      ? "#5FAEE9"
      : pathname === "/trip" && !isMobileHeroCovered
        ? "#2986D6"
        : theme === "dark"
          ? "#11161d"
          : "#fffffe";

  useEffect(() => {
    if (typeof document === "undefined" || !document.head) return;

    const returnedToHeroTop =
      prevHeroCoveredRef.current && !isMobileHeroCovered && isMobileHeroRoute;
    prevHeroCoveredRef.current = isMobileHeroCovered;

    const applyChromeMeta = () => {
      // 1. Update live mobile `html`/`body` background CSS variable (iOS 26 Safari Live Observer)
      document.documentElement.style.setProperty(
        "--cgr-mobile-chrome-bg",
        mobileTopChromeColor
      );

      // 2. Replace our own `<meta name="theme-color">` node (iOS 15–18 Safari & installed PWA)
      const existing = document.head.querySelectorAll('meta[name="theme-color"]');
      existing.forEach((node) => node.remove());
      const meta = document.createElement("meta");
      meta.name = "theme-color";
      meta.content = mobileTopChromeColor;
      meta.setAttribute("data-cgr-theme-color", "1");
      document.head.appendChild(meta);
    };

    applyChromeMeta();

    // 3. Gently wake WebKit's `PageColorSampler` on mobile route switches and after
    //    scroll-back-to-top momentum settles (when iOS Safari throttles mid-scroll chrome repaints).
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      let rafId = window.requestAnimationFrame(() => {
        window.scrollTo(window.scrollX, window.scrollY);
      });

      if (!returnedToHeroTop) {
        return () => window.cancelAnimationFrame(rafId);
      }

      let settled = false;
      const reCommitAfterMomentum = () => {
        if (settled) return;
        settled = true;
        applyChromeMeta();
        setMobileChromeCommitTick((n) => n + 1);
        rafId = window.requestAnimationFrame(() => {
          window.scrollTo(window.scrollX, window.scrollY);
        });
      };

      window.addEventListener("scrollend", reCommitAfterMomentum, {
        once: true,
        passive: true,
      });
      const settleTimer = window.setTimeout(reCommitAfterMomentum, 320);

      return () => {
        settled = true;
        window.cancelAnimationFrame(rafId);
        window.clearTimeout(settleTimer);
        window.removeEventListener("scrollend", reCommitAfterMomentum);
      };
    }
  }, [mobileTopChromeColor, pathname, isMobileHeroCovered, isMobileHeroRoute]);

  // Sticky mount flags so dynamic modal/overlay chunks stay 0 KB on initial load
  // while preserving smooth Fade Slide-Out animations (`useModalPresence`) once opened.
  const [hasMountedAuth, setHasMountedAuth] = useState(false);
  const [hasMountedCreateBoard, setHasMountedCreateBoard] = useState(false);
  const [hasMountedChooseBoard, setHasMountedChooseBoard] = useState(false);
  const [hasMountedBoardToast, setHasMountedBoardToast] = useState(false);
  const [hasMountedFlip, setHasMountedFlip] = useState(false);

  useEffect(() => {
    if (isAuthModalOpen && !hasMountedAuth) setHasMountedAuth(true);
  }, [isAuthModalOpen, hasMountedAuth]);

  useEffect(() => {
    if (isCreateBoardOpen && !hasMountedCreateBoard)
      setHasMountedCreateBoard(true);
  }, [isCreateBoardOpen, hasMountedCreateBoard]);

  useEffect(() => {
    if (chooseBoardContext && !hasMountedChooseBoard)
      setHasMountedChooseBoard(true);
  }, [chooseBoardContext, hasMountedChooseBoard]);

  useEffect(() => {
    if (boardToast && !hasMountedBoardToast) setHasMountedBoardToast(true);
  }, [boardToast, hasMountedBoardToast]);

  useEffect(() => {
    if (activeFlipTransition && !hasMountedFlip) setHasMountedFlip(true);
  }, [activeFlipTransition, hasMountedFlip]);

  return (
    <PlatformAppContext.Provider value={contextValue}>
      <RouteProgressBar />
      {/* Top-edge 5px fixed sentinel (>= 3px WebKit PageColorSampler minimum threshold).
          Keyed by color + post-momentum commit tick so iOS 26 Safari commits a fresh fixed
          layer on route switch and when returning to the Hero top (0 scroll/touch listeners). */}
      <div
        key={`${mobileTopChromeColor}-${mobileChromeCommitTick}`}
        aria-hidden="true"
        className="lg:hidden fixed top-0 inset-x-0 z-[55] h-[5px] pointer-events-none"
        style={{ backgroundColor: mobileTopChromeColor }}
      />
      {isDedicatedShellPage ? (
        <main className="flex min-h-screen flex-col">
          {children}
          {(hasMountedAuth || isAuthModalOpen) && (
            <AuthPromptModal
              isOpen={isAuthModalOpen}
              language={lang}
              reasonText={
                authModalReason
                  ? lang === "th"
                    ? authModalReason.th
                    : authModalReason.en
                  : null
              }
              onClose={() => {
                setIsAuthModalOpen(false);
                pendingAuthCallbackRef.current = null;
              }}
              onAuthenticated={async () => {
                await refreshProfile();
                const cb = pendingAuthCallbackRef.current;
                pendingAuthCallbackRef.current = null;
                if (cb) {
                  await cb();
                }
              }}
            />
          )}
          <CookieConsentBanner language={lang} theme={theme} />
        </main>
      ) : (
        <div className="flex min-h-screen flex-col">
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
            className={
              isExploreFullBleed
                ? "pt-0 lg:pt-16 pb-0 lg:pl-[72px]"
                : isAccountSplitPage
                ? "pt-[env(safe-area-inset-top,0px)] lg:pt-16 pb-[var(--cgr-mobile-nav-h)] lg:pb-0 lg:pl-[72px] h-[100dvh] flex flex-col overflow-hidden"
                : isTripHeroFullBleed
                ? "pt-0 lg:pt-16 pb-[calc(var(--cgr-mobile-nav-h)+20px)] lg:pb-12 lg:pl-[72px]"
                : "pt-[env(safe-area-inset-top,0px)] lg:pt-16 pb-[calc(var(--cgr-mobile-nav-h)+20px)] lg:pb-12 lg:pl-[72px]"
            }
          >
            <div
              data-cgr-app-inner="true"
              className={
                isAccountSplitPage
                  ? "flex-1 min-h-0 flex flex-col p-0"
                  : isExploreFullBleed || isTripHeroFullBleed
                  ? "p-0"
                  : "px-4 sm:px-6 lg:px-8 pt-4 sm:pt-5"
              }
            >
              {children}
            </div>
          </main>

          {isWalletOpen && (
            <CouponWalletDrawer
              isOpen={isWalletOpen}
              onClose={() => setIsWalletOpen(false)}
              language={lang}
              isAuthenticated={Boolean(user)}
              walletCoupons={walletCoupons}
              claimedCouponIds={claimedCouponIds}
              recommendedDeals={recommendedDeals}
              onClaimCoupon={claimCouponToWallet}
              onRemoveCoupon={removeCouponFromWallet}
              onOpenAuthModal={openAuthModal}
            />
          )}

          {(hasMountedAuth || isAuthModalOpen) && (
            <AuthPromptModal
              isOpen={isAuthModalOpen}
              language={lang}
              reasonText={
                authModalReason
                  ? lang === "th"
                    ? authModalReason.th
                    : authModalReason.en
                  : null
              }
              onClose={() => {
                setIsAuthModalOpen(false);
                pendingAuthCallbackRef.current = null;
              }}
              onAuthenticated={async () => {
                await refreshProfile();
                const cb = pendingAuthCallbackRef.current;
                pendingAuthCallbackRef.current = null;
                if (cb) {
                  await cb();
                }
              }}
            />
          )}

          {(hasMountedCreateBoard || isCreateBoardOpen) && (
            <CreateBoardModal
              isOpen={isCreateBoardOpen}
              language={lang}
              isSubmitting={isCreatingBoardSubmit}
              onClose={() => {
                setIsCreateBoardOpen(false);
                pendingPinForCreateRef.current = null;
              }}
              onCreate={handleCreateBoardSubmit}
            />
          )}

          {(hasMountedChooseBoard || Boolean(chooseBoardContext)) && (
            <ChooseBoardModal
              isOpen={Boolean(chooseBoardContext)}
              language={lang}
              boards={savedBoards}
              currentBoardId={chooseBoardContext?.currentBoardId ?? null}
              isBusy={isMovingBoard}
              onClose={() => setChooseBoardContext(null)}
              onSelectBoard={handleMovePinToChosenBoard}
              onOpenCreateNew={() => {
                if (chooseBoardContext) {
                  pendingPinForCreateRef.current = {
                    id: chooseBoardContext.pinId,
                    coverImageUrl: chooseBoardContext.coverImageUrl,
                    moveFromBoardId: chooseBoardContext.currentBoardId,
                  };
                }
                setChooseBoardContext(null);
                setIsCreateBoardOpen(true);
              }}
            />
          )}

          {(hasMountedBoardToast || Boolean(boardToast)) && (
            <BoardSaveToast
              toast={boardToast}
              language={lang}
              onChangeBoard={() => {
                if (!boardToast) return;
                if (boardToastTimerRef.current !== null) {
                  window.clearTimeout(boardToastTimerRef.current);
                  boardToastTimerRef.current = null;
                }
                setChooseBoardContext({
                  pinId: boardToast.pinId,
                  coverImageUrl: boardToast.thumbnailUrl,
                  currentBoardId: boardToast.boardId,
                });
                setBoardToast(null);
              }}
              onDismiss={() => {
                if (boardToastTimerRef.current !== null) {
                  window.clearTimeout(boardToastTimerRef.current);
                  boardToastTimerRef.current = null;
                }
                setBoardToast(null);
              }}
            />
          )}

          <CookieConsentBanner language={lang} theme={theme} />
        </div>
      )}
      {(hasMountedFlip || Boolean(activeFlipTransition)) && (
        <PlaceCardFlipOverlay
          transition={activeFlipTransition}
          readyHero={readyRouteHero}
          language={lang}
          onComplete={handleCompleteFlipTransition}
        />
      )}
    </PlatformAppContext.Provider>
  );
}
