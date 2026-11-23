"use client";

import { useCallback, useSyncExternalStore } from "react";
import { useHotelApp } from "@/components/HotelAppShell";

interface LikeSnapshot {
  isLiked: boolean;
  likesCount: number;
}

const overrides = new Map<string, LikeSnapshot>();
const inFlight = new Set<string>();
const listeners = new Set<() => void>();

function notify() {
  for (const fn of listeners) fn();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Keep external detail modals (e.g. PinterestPinDetail) in sync with card hearts */
export function syncPinLikeState(
  pinId: string,
  isLiked: boolean,
  likesCount: number
) {
  overrides.set(pinId, {
    isLiked,
    likesCount: Math.max(0, Math.floor(likesCount)),
  });
  notify();
}

export function usePlaceLike(
  pinId: string,
  initialIsLiked: boolean,
  initialLikesCount: number
) {
  const { user, openAuthModal } = useHotelApp();

  const snapshot = useSyncExternalStore(
    subscribe,
    () => overrides.get(pinId) ?? null,
    () => null
  );

  const isLiked = snapshot ? snapshot.isLiked : initialIsLiked;
  const likesCount = snapshot ? snapshot.likesCount : initialLikesCount;

  const commitToggle = useCallback(
    async (nextLiked: boolean, prevLiked: boolean, prevCount: number) => {
      if (inFlight.has(pinId)) return;
      inFlight.add(pinId);

      const optimisticCount = Math.max(
        0,
        prevCount + (nextLiked ? 1 : -1)
      );
      overrides.set(pinId, {
        isLiked: nextLiked,
        likesCount: optimisticCount,
      });
      notify();

      try {
        const res = await fetch(
          `/api/pins/${encodeURIComponent(pinId)}/like`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ desiredLiked: nextLiked }),
          }
        );
        if (res.status === 401) {
          overrides.set(pinId, { isLiked: prevLiked, likesCount: prevCount });
          notify();
          openAuthModal({
            reasonTh: "เข้าสู่ระบบเพื่อกดหัวใจให้สถานที่นี้",
            reasonEn: "Sign in to like this place",
          });
          return;
        }
        if (res.ok) {
          const data = (await res.json()) as {
            isLiked?: boolean;
            likesCount?: number;
          };
          if (
            typeof data.isLiked === "boolean" &&
            typeof data.likesCount === "number"
          ) {
            overrides.set(pinId, {
              isLiked: data.isLiked,
              likesCount: Math.max(0, data.likesCount),
            });
            notify();
          }
        } else {
          overrides.set(pinId, { isLiked: prevLiked, likesCount: prevCount });
          notify();
        }
      } catch {
        overrides.set(pinId, { isLiked: prevLiked, likesCount: prevCount });
        notify();
      } finally {
        inFlight.delete(pinId);
      }
    },
    [openAuthModal, pinId]
  );

  const toggleLike = useCallback(() => {
    const current = overrides.get(pinId) ?? {
      isLiked: initialIsLiked,
      likesCount: initialLikesCount,
    };
    const nextLiked = !current.isLiked;

    if (!user) {
      openAuthModal({
        reasonTh: "เข้าสู่ระบบเพื่อกดหัวใจให้สถานที่นี้",
        reasonEn: "Sign in to like this place",
        onSuccess: () => {
          void commitToggle(true, current.isLiked, current.likesCount);
        },
      });
      return;
    }

    void commitToggle(nextLiked, current.isLiked, current.likesCount);
  }, [
    commitToggle,
    initialIsLiked,
    initialLikesCount,
    openAuthModal,
    pinId,
    user,
  ]);

  return { isLiked, likesCount, toggleLike };
}
