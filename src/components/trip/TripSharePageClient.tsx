"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useHotelApp } from "@/components/HotelAppShell";
import { clearLastClickedPinOrigin } from "@/lib/pinOriginStore";
import { preloadPinHeroImages } from "@/lib/mediaUtils";
import type { PureMediaSlide } from "@/components/media/PureMediaViewer";
import { DeleteBoardConfirmModal } from "@/components/board/BoardActionModals";
import {
  TripCardFlipModal,
  type CardOriginRect,
} from "@/components/trip/TripCardFlipModal";
import { ShareTripModal } from "@/components/trip/ShareTripModal";
import type {
  HotelPostSummaryDto,
  PinCommentDto,
  PinFeedItemDto,
  PublicTripDto,
  SavedBoardPinItemDto,
} from "@/types/cangaroom";

const TripMapPlannerView = dynamic(
  () =>
    import("@/components/trip/TripMapPlannerView").then(
      (mod) => mod.TripMapPlannerView
    ),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-x-0 top-0 bottom-[var(--cgr-mobile-nav-h)] lg:left-[72px] lg:top-16 lg:bottom-0 z-20 bg-[var(--color-background-body)] lg:px-8 lg:pt-4 lg:pb-[108px]">
        <div className="w-full h-full lg:max-w-[1220px] lg:mx-auto lg:rounded-[26px] bg-[var(--color-background-muted)] animate-pulse" />
      </div>
    ),
  }
);

const PinterestPinDetail = dynamic(
  () =>
    import("@/components/home/PinterestPinDetail").then(
      (mod) => mod.PinterestPinDetail
    ),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[360px] flex items-center justify-center bg-[var(--color-background-body)]">
        <img
          src="/brand/nondi-icon-with-text-black.svg"
          alt="Nondii"
          className="h-[34px] sm:h-[38px] w-auto object-contain opacity-90 animate-pulse dark:invert"
        />
      </div>
    ),
  }
);

const PureMediaViewer = dynamic(
  () =>
    import("@/components/media/PureMediaViewer").then(
      (mod) => mod.PureMediaViewer
    ),
  { ssr: false }
);

export interface TripSharePageClientProps {
  initialTrip: PublicTripDto;
}

export function TripSharePageClient({ initialTrip }: TripSharePageClientProps) {
  const router = useRouter();
  const {
    lang: language,
    theme,
    user: currentUser,
    savedBoards,
    savedPinIds,
    openAuthModal,
    refreshSavedBoards,
    deleteSavedBoard,
    reorderSavedBoardPins,
    triggerPinToBoard,
    togglePinLikeInstant,
    navigateToPlaceWithFlip,
  } = useHotelApp();

  const isDark = theme === "dark";

  // Keep local reactive copy so guest viewers & owner actions update smoothly in real time!
  const [trip, setTrip] = useState<PublicTripDto>(initialTrip);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false);
  const [isCloningTrip, setIsCloningTrip] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeletingTrip, setIsDeletingTrip] = useState(false);

  // If the signed-in user owns this board and it exists in HotelAppShell `savedBoards`, sync live edits cleanly
  const matchingOwnedBoard = useMemo(
    () => savedBoards.find((b) => b.id === trip.id) ?? null,
    [savedBoards, trip.id]
  );

  const isOwner = Boolean(
    trip.isOwner || (currentUser && matchingOwnedBoard !== null)
  );

  const liveEntries: SavedBoardPinItemDto[] = useMemo(() => {
    if (isOwner && matchingOwnedBoard) {
      return matchingOwnedBoard.items;
    }
    return trip.items;
  }, [isOwner, matchingOwnedBoard, trip.items]);

  const liveBoard = useMemo(
    () => ({
      ...trip,
      name: (isOwner && matchingOwnedBoard?.name) || trip.name,
      shareSlug: (isOwner && matchingOwnedBoard?.shareSlug) || trip.shareSlug,
      isPublic:
        isOwner && matchingOwnedBoard
          ? matchingOwnedBoard.isPublic
          : trip.isPublic,
      pinCount: liveEntries.length,
      items: liveEntries,
    }),
    [isOwner, liveEntries, matchingOwnedBoard, trip]
  );

  // Card 3D Flip Modal state
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [selectedPinSnapshot, setSelectedPinSnapshot] =
    useState<PinFeedItemDto | null>(null);
  const [flipOriginRect, setFlipOriginRect] = useState<CardOriginRect | null>(
    null
  );
  const [flipStopNumber, setFlipStopNumber] = useState<number>(1);
  const [animatingPinId, setAnimatingPinId] = useState<string | null>(null);

  const [pinHistoryStack, setPinHistoryStack] = useState<
    Array<{ pin: PinFeedItemDto; scrollY: number }>
  >([]);
  const [detailRestoreScrollY, setDetailRestoreScrollY] = useState<
    number | null
  >(null);
  const [pinDetail, setPinDetail] = useState<{
    pin: PinFeedItemDto;
    comments: PinCommentDto[];
    relatedPins: PinFeedItemDto[];
    hotelPosts?: HotelPostSummaryDto[];
    ownerFeedPosts?: HotelPostSummaryDto[];
    ownerBlogs?: HotelPostSummaryDto[];
    nearbyPlaces?: PinFeedItemDto[];
  } | null>(null);
  const latestPinReqRef = useRef<string | null>(null);

  const [fullscreenMedia, setFullscreenMedia] = useState<{
    slides: PureMediaSlide[];
    index: number;
  } | null>(null);

  // Preload PinterestPinDetail chunk silently so card flip -> modal is instant!
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void import("@/components/home/PinterestPinDetail");
    }, 300);
    return () => window.clearTimeout(timer);
  }, []);

  const loadPinDetail = useCallback(async (pinId: string) => {
    latestPinReqRef.current = pinId;
    const res = await fetch(`/api/pins/${encodeURIComponent(pinId)}`, {
      cache: "no-store",
    });
    if (!res.ok) return;
    const data = (await res.json()) as {
      pin: PinFeedItemDto;
      comments: PinCommentDto[];
      relatedPins: PinFeedItemDto[];
      hotelPosts?: HotelPostSummaryDto[];
      ownerFeedPosts?: HotelPostSummaryDto[];
      ownerBlogs?: HotelPostSummaryDto[];
      nearbyPlaces?: PinFeedItemDto[];
    };
    if (latestPinReqRef.current === pinId) {
      setPinDetail(data);
    }
  }, []);

  useEffect(() => {
    if (selectedPinId) {
      void loadPinDetail(selectedPinId);
    }
  }, [selectedPinId, loadPinDetail]);

  const activeTripPin = useMemo(() => {
    if (!selectedPinId) return null;
    if (pinDetail?.pin.id === selectedPinId) return pinDetail.pin;
    if (selectedPinSnapshot?.id === selectedPinId) return selectedPinSnapshot;
    return liveEntries.find((e) => e.pin.id === selectedPinId)?.pin ?? null;
  }, [pinDetail, selectedPinId, selectedPinSnapshot, liveEntries]);

  const activeTripComments = useMemo(
    () => (pinDetail?.pin.id === selectedPinId ? pinDetail.comments : []),
    [pinDetail, selectedPinId]
  );

  const activeTripHotelPosts = useMemo(
    () =>
      pinDetail?.pin.id === selectedPinId ? pinDetail.hotelPosts ?? [] : [],
    [pinDetail, selectedPinId]
  );

  const activeTripOwnerFeedPosts = useMemo(
    () =>
      pinDetail?.pin.id === selectedPinId
        ? pinDetail.ownerFeedPosts
        : undefined,
    [pinDetail, selectedPinId]
  );

  const activeTripOwnerBlogs = useMemo(
    () =>
      pinDetail?.pin.id === selectedPinId ? pinDetail.ownerBlogs : undefined,
    [pinDetail, selectedPinId]
  );

  const activeTripNearbyPlaces = useMemo(
    () =>
      pinDetail?.pin.id === selectedPinId ? pinDetail.nearbyPlaces ?? [] : [],
    [pinDetail, selectedPinId]
  );

  const otherTripEntries = useMemo(() => {
    if (!activeTripPin) return liveEntries;
    return liveEntries.filter((e) => e.pin.id !== activeTripPin.id);
  }, [activeTripPin, liveEntries]);

  const activePinIdxInTrip = useMemo(() => {
    if (!activeTripPin) return -1;
    return liveEntries.findIndex((e) => e.pin.id === activeTripPin.id);
  }, [activeTripPin, liveEntries]);

  const prevTripPinPreview =
    activePinIdxInTrip > 0
      ? liveEntries[activePinIdxInTrip - 1]?.pin ?? null
      : null;
  const nextTripPinPreview =
    activePinIdxInTrip >= 0 && activePinIdxInTrip < liveEntries.length - 1
      ? liveEntries[activePinIdxInTrip + 1]?.pin ?? null
      : null;

  const handleOpenCardFlipModal = useCallback(
    (
      pin: PinFeedItemDto,
      _stopNumber: number,
      originRect: CardOriginRect | null
    ) => {
      clearLastClickedPinOrigin();
      navigateToPlaceWithFlip({ pin, originRect });
    },
    [navigateToPlaceWithFlip]
  );

  const handleSelectRelatedPin = useCallback(
    (pin: PinFeedItemDto) => {
      if (pinHistoryStack.length >= 1) return;
      if (activeTripPin && activeTripPin.id !== pin.id) {
        setPinHistoryStack([{ pin: activeTripPin, scrollY: 0 }]);
      }
      setDetailRestoreScrollY(null);
      setSelectedPinSnapshot(pin);
      setSelectedPinId(pin.id);
    },
    [activeTripPin, pinHistoryStack.length]
  );

  const handleCloseTripPin = useCallback(() => {
    clearLastClickedPinOrigin();
    setPinHistoryStack([]);
    setDetailRestoreScrollY(null);
    setSelectedPinId(null);
  }, []);

  const handleAfterFlipClose = useCallback(() => {
    setAnimatingPinId(null);
    setSelectedPinSnapshot(null);
    setPinDetail(null);
    setFlipOriginRect(null);
  }, []);

  const handleStepBackTripPin = useCallback(() => {
    if (pinHistoryStack.length === 0) {
      handleCloseTripPin();
      return;
    }
    const prev = pinHistoryStack[pinHistoryStack.length - 1];
    setPinHistoryStack((s) => s.slice(0, -1));
    setDetailRestoreScrollY(prev.scrollY);
    setSelectedPinSnapshot(prev.pin);
    setSelectedPinId(prev.pin.id);
  }, [handleCloseTripPin, pinHistoryStack]);

  const handleNavigateTripPin = useCallback(
    (direction: "prev" | "next") => {
      const target =
        direction === "next" ? nextTripPinPreview : prevTripPinPreview;
      if (!target) return;
      setPinHistoryStack([]);
      setDetailRestoreScrollY(null);
      setSelectedPinSnapshot(target);
      setSelectedPinId(target.id);
    },
    [nextTripPinPreview, prevTripPinPreview]
  );

  const handleRemovePinFromCurrentTrip = useCallback(
    async (pinId: string) => {
      if (!isOwner) return;
      setTrip((prev) => ({
        ...prev,
        items: prev.items.filter((e) => e.pin.id !== pinId),
        pinCount: Math.max(0, prev.items.length - 1),
      }));
      if (selectedPinId === pinId) {
        handleCloseTripPin();
      }
      await fetch("/api/boards/toggle-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pinId,
          boardId: trip.id,
          action: "unsave",
        }),
      });
      await refreshSavedBoards();
    },
    [handleCloseTripPin, isOwner, refreshSavedBoards, selectedPinId, trip.id]
  );

  const handleToggleSavePinForGuest = useCallback(
    (pin: PinFeedItemDto) => {
      triggerPinToBoard({
        id: pin.id,
        coverImageUrl: pin.coverImageUrl,
        isSavedByMe: savedPinIds.has(pin.id),
      });
    },
    [savedPinIds, triggerPinToBoard]
  );

  const handleToggleLikeOnTrip = useCallback(
    (pinId: string) => {
      const target =
        (activeTripPin?.id === pinId ? activeTripPin : null) ??
        liveEntries.find((e) => e.pin.id === pinId)?.pin;
      if (!target) return;
      togglePinLikeInstant({
        id: target.id,
        isLikedByMe: target.isLikedByMe,
        likesCount: target.likesCount,
      });
    },
    [activeTripPin, liveEntries, togglePinLikeInstant]
  );

  const handleReorderPins = useCallback(
    async (orderedPinIds: string[]) => {
      if (!isOwner) return;
      // Optimistically reorder local copy too
      setTrip((prev) => {
        const orderMap = new Map(orderedPinIds.map((id, i) => [id, i]));
        const nextItems = [...prev.items]
          .sort(
            (a, b) =>
              (orderMap.get(a.pin.id) ?? 999) - (orderMap.get(b.pin.id) ?? 999)
          )
          .map((item, idx) => ({ ...item, sortOrder: idx }));
        return { ...prev, items: nextItems };
      });
      await reorderSavedBoardPins(trip.id, orderedPinIds);
    },
    [isOwner, reorderSavedBoardPins, trip.id]
  );

  const handleTogglePublic = useCallback(
    async (nextPublic: boolean) => {
      if (!isOwner) return;
      setIsUpdatingVisibility(true);
      setTrip((prev) => ({ ...prev, isPublic: nextPublic }));
      try {
        const res = await fetch(`/api/boards/${encodeURIComponent(trip.id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isPublic: nextPublic }),
        });
        if (!res.ok) {
          setTrip((prev) => ({ ...prev, isPublic: !nextPublic }));
        } else {
          await refreshSavedBoards();
        }
      } finally {
        setIsUpdatingVisibility(false);
      }
    },
    [isOwner, refreshSavedBoards, trip.id]
  );

  const executeCloneTrip = useCallback(async () => {
    setIsCloningTrip(true);
    try {
      const res = await fetch(
        `/api/boards/${encodeURIComponent(trip.shareSlug || trip.id)}/clone`,
        { method: "POST" }
      );
      if (!res.ok) return;
      const data = (await res.json()) as {
        board?: { id: string; shareSlug: string };
      };
      await refreshSavedBoards();
      if (data.board?.shareSlug || data.board?.id) {
        router.push(
          `/trip/${encodeURIComponent(data.board.shareSlug || data.board.id)}`
        );
      }
    } finally {
      setIsCloningTrip(false);
    }
  }, [refreshSavedBoards, router, trip.id, trip.shareSlug]);

  const handleCloneTrip = useCallback(async () => {
    if (isCloningTrip) return;
    if (!currentUser) {
      openAuthModal({
        reasonTh: "เข้าสู่ระบบเพื่อคัดลอกทริปนี้เก็บไว้แก้ไขและแชร์ต่อ",
        reasonEn: "Sign in to copy this trip into your account.",
        onSuccess: () => void executeCloneTrip(),
      });
      return;
    }
    await executeCloneTrip();
  }, [currentUser, executeCloneTrip, isCloningTrip, openAuthModal]);

  const handleConfirmDeleteTrip = async () => {
    if (!isOwner) return;
    setIsDeletingTrip(true);
    try {
      const ok = await deleteSavedBoard(trip.id);
      if (ok) {
        setIsDeleteOpen(false);
        router.push("/trip");
      }
    } finally {
      setIsDeletingTrip(false);
    }
  };

  const handleBack = useCallback(() => {
    handleCloseTripPin();
    handleAfterFlipClose();
    if (isOwner || currentUser) {
      router.push("/trip");
    } else {
      router.push("/explore");
    }
  }, [currentUser, handleAfterFlipClose, handleCloseTripPin, isOwner, router]);

  const modalPin = activeTripPin ?? selectedPinSnapshot;

  return (
    <>
      <TripMapPlannerView
        board={liveBoard}
        entries={liveEntries}
        language={language}
        isDark={isDark}
        isOwner={isOwner}
        ownerDisplayName={trip.ownerDisplayName}
        savedPinIds={savedPinIds}
        modalOpenPinId={animatingPinId}
        isCloningTrip={isCloningTrip}
        onBack={handleBack}
        onDeleteTrip={() => setIsDeleteOpen(true)}
        onShareTrip={() => setIsShareOpen(true)}
        onCloneTrip={() => void handleCloneTrip()}
        onSelectPinDetail={handleOpenCardFlipModal}
        onRemovePin={(pinId) => void handleRemovePinFromCurrentTrip(pinId)}
        onToggleSavePin={handleToggleSavePinForGuest}
        onReorderPins={handleReorderPins}
      />

      <TripCardFlipModal
        isOpen={Boolean(activeTripPin)}
        pin={modalPin}
        stopNumber={flipStopNumber}
        originRect={flipOriginRect}
        language={language}
        onRequestClose={handleCloseTripPin}
        onAfterClose={handleAfterFlipClose}
      >
        {modalPin && (
          <PinterestPinDetail
            pin={modalPin}
            language={language}
            currentUser={currentUser}
            comments={activeTripComments}
            savedPinIds={savedPinIds}
            relatedPins={[]}
            detailFooterMode="property-only"
            hotelPosts={activeTripHotelPosts}
            ownerFeedPosts={activeTripOwnerFeedPosts}
            ownerBlogs={activeTripOwnerBlogs}
            nearbyPlaces={activeTripNearbyPlaces}
            isNearbyHop={pinHistoryStack.length > 0}
            backTargetName={
              pinHistoryStack.length > 0
                ? language === "th"
                  ? pinHistoryStack[pinHistoryStack.length - 1].pin.hotelNameTh
                  : pinHistoryStack[pinHistoryStack.length - 1].pin.hotelNameEn
                : null
            }
            mobileOverlayMode={true}
            prevPinPreview={prevTripPinPreview}
            nextPinPreview={nextTripPinPreview}
            canStepBack={pinHistoryStack.length > 0}
            restoreScrollY={detailRestoreScrollY}
            onBack={handleStepBackTripPin}
            onClose={handleCloseTripPin}
            onSelectPin={handleSelectRelatedPin}
            onNavigatePin={handleNavigateTripPin}
            onToggleLike={handleToggleLikeOnTrip}
            onToggleSave={(pinId) => {
              const nearbyTarget = activeTripNearbyPlaces.find(
                (p) => p.id === pinId
              );
              if (nearbyTarget) {
                handleToggleSavePinForGuest(nearbyTarget);
                return;
              }
              if (isOwner && pinId === modalPin.id && pinHistoryStack.length === 0) {
                void handleRemovePinFromCurrentTrip(pinId);
              } else {
                handleToggleSavePinForGuest(modalPin);
              }
            }}
            onSharePin={() => setIsShareOpen(true)}
            onExpandMedia={(urls, idx) =>
              setFullscreenMedia({
                slides: urls.map((u) => ({ type: "image", url: u })),
                index: idx,
              })
            }
            onAddComment={async (text, parentId) => {
              await fetch(
                `/api/pins/${encodeURIComponent(modalPin.id)}/comments`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ body: text, parentId }),
                }
              );
              await loadPinDetail(modalPin.id);
            }}
            onDeleteComment={async (commentId) => {
              await fetch(`/api/comments/${encodeURIComponent(commentId)}`, {
                method: "DELETE",
              });
              await loadPinDetail(modalPin.id);
            }}
          />
        )}
      </TripCardFlipModal>

      <ShareTripModal
        isOpen={isShareOpen}
        tripName={liveBoard.name}
        shareSlug={liveBoard.shareSlug}
        pinCount={liveEntries.length}
        isOwner={isOwner}
        isPublic={liveBoard.isPublic}
        isUpdatingVisibility={isUpdatingVisibility}
        language={language}
        onTogglePublic={handleTogglePublic}
        onClose={() => setIsShareOpen(false)}
      />

      {isOwner && (
        <DeleteBoardConfirmModal
          board={isDeleteOpen ? liveBoard : null}
          language={language}
          isDeleting={isDeletingTrip}
          onClose={() => setIsDeleteOpen(false)}
          onConfirmDelete={handleConfirmDeleteTrip}
        />
      )}

      {fullscreenMedia && (
        <PureMediaViewer
          slides={fullscreenMedia.slides}
          initialIndex={fullscreenMedia.index}
          onClose={() => setFullscreenMedia(null)}
        />
      )}
    </>
  );
}
