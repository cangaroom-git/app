"use client";

import { useEffect } from "react";

let activeScrollLockCount = 0;

function applyDocumentScrollLock() {
  if (typeof document === "undefined") return;

  const htmlElement = document.documentElement;
  const bodyElement = document.body;

  const clientWidthBeforeLock = htmlElement.clientWidth;
  bodyElement.style.overflow = "hidden";
  bodyElement.style.overscrollBehavior = "none";

  // Measure the exact synchronous viewport width delta caused by hiding the vertical scrollbar
  const scrollbarWidthDelta = Math.max(
    0,
    htmlElement.clientWidth - clientWidthBeforeLock
  );

  if (scrollbarWidthDelta > 0) {
    const compensationValue = `${scrollbarWidthDelta}px`;
    htmlElement.style.setProperty("--scrollbar-compensation", compensationValue);
    bodyElement.style.paddingRight = compensationValue;
  }
}

function clearDocumentScrollLock() {
  if (typeof document === "undefined") return;

  const htmlElement = document.documentElement;
  const bodyElement = document.body;

  htmlElement.style.removeProperty("overflow");
  htmlElement.style.removeProperty("overscroll-behavior");
  htmlElement.style.removeProperty("--scrollbar-compensation");
  bodyElement.style.removeProperty("overflow");
  bodyElement.style.removeProperty("overscroll-behavior");
  bodyElement.style.removeProperty("padding-right");
}

/**
 * Reference-counted body scroll lock shared across all Right Sidebar Drawers.
 * - Eliminates parent/child `useEffect` race conditions that could freeze scrolling.
 * - Compensates for disappearing scrollbar width (`--scrollbar-compensation` + `padding-right`)
 *   within the same synchronous frame so the main feed and fixed navbar never shift by 1px.
 */
export function useBodyScrollLock(isLocked: boolean): void {
  useEffect(() => {
    if (!isLocked) {
      if (activeScrollLockCount <= 0) {
        clearDocumentScrollLock();
      }
      return;
    }

    const wasUnlocked = activeScrollLockCount === 0;
    activeScrollLockCount += 1;
    if (wasUnlocked) {
      applyDocumentScrollLock();
    }

    return () => {
      activeScrollLockCount = Math.max(0, activeScrollLockCount - 1);
      if (activeScrollLockCount === 0) {
        clearDocumentScrollLock();
      }
    };
  }, [isLocked]);
}
