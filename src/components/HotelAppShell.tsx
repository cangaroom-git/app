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
import { usePathname } from "next/navigation";
import { addDaysToDate, formatDateStr } from "@/lib/bookingMath";
import {
  readLastUsedBoardId,
  saveLastUsedBoardId,
} from "@/lib/auth/accountHint";
import type { LanguageCode } from "@/lib/dateFormatters";
import type {
  AuthenticatedMeDto,
  CouponDealDto,
  SavedBoardDto,
} from "@/types/cangaroom";
import {
  getTabIdFromPathname,
  type PlatformNavTabId,
} from "@/components/navigation/NavigationIcons";
import { PrimaryNavigation } from "@/components/navigation/PrimaryNavigation";
import { RouteProgressBar } from "@/components/navigation/RouteProgressBar";
import { useAuthenticatedProfile } from "@/components/navigation/UserProfileDropdown";
import { CookieConsentBanner } from "@/components/privacy/CookieConsentBanner";
import { AuthPromptModal } from "@/components/auth/AuthPromptModal";
import {
  BoardSaveToast,
  ChooseBoardModal,
  CreateBoardModal,
  type BoardSaveToastState,
} from "@/components/board/BoardActionModals";

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
  pinLikeOverrides: Record<string, { isLiked: boolean; likesCount: number }>;
  togglePinLikeInstant: (pin: {
    id: string;
    isLikedByMe: boolean;
    likesCount: number;
  }) => void;
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
          reasonTh: "เข้าสู่ระบบเพื่อปักหมุดที่พักลงบอร์ดของคุณ",
          reasonEn: "Log in to pin stays to your boards",
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
          throw new Error(data.error || "สร้างบอร์ดไม่สำเร็จ");
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

  const openCreateBoardModal = useCallback(() => {
    if (!user) {
      openAuthModal({
        reasonTh: "เข้าสู่ระบบเพื่อสร้างบอร์ดที่พักของคุณ",
        reasonEn: "Log in to create a board",
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
    void loadWalletCoupons();
  }, [user?.id, loadWalletCoupons]);

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
    activeTab === "register-hotel";

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
      pinLikeOverrides,
      togglePinLikeInstant,
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
      pinLikeOverrides,
      togglePinLikeInstant,
    ]
  );

  const todayFormatted = formatDateStr(today);
  void todayFormatted;

  return (
    <PlatformAppContext.Provider value={contextValue}>
      <RouteProgressBar />
      {isDedicatedShellPage ? (
        <main className="flex min-h-screen flex-col">
          {children}
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
            claimedCouponIds={claimedCouponIds}
            recommendedDeals={recommendedDeals}
            onClaimCoupon={claimCouponToWallet}
            onRemoveCoupon={removeCouponFromWallet}
            onOpenAuthModal={openAuthModal}
          />

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

          <CookieConsentBanner language={lang} theme={theme} />
        </div>
      )}
    </PlatformAppContext.Provider>
  );
}
