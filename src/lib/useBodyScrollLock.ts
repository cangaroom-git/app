"use client";

import { useEffect } from "react";

let activeScrollLockCount = 0;
let isListenersAttached = false;
let lastTouchX = 0;
let lastTouchY = 0;

const VERTICAL_SCROLL_KEYS = new Set([
  " ",
  "Spacebar",
  "PageUp",
  "PageDown",
  "Home",
  "End",
  "ArrowUp",
  "ArrowDown",
]);

function isEditableElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return Boolean(target.closest('[contenteditable="true"]'));
}

function findActiveModalRoot(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Node)) return null;
  const element =
    target instanceof HTMLElement ? target : target.parentElement;
  if (!element) return null;
  return element.closest<HTMLElement>(
    '[aria-modal="true"], [role="dialog"], [data-scroll-lock-allow="true"]'
  );
}

function isPassThroughInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Node)) return false;
  const element =
    target instanceof HTMLElement ? target : target.parentElement;
  if (!element) return false;
  if (
    element instanceof HTMLInputElement &&
    (element.type === "range" || element.type === "number")
  ) {
    return true;
  }
  // Allow MapLibre WebGL zoom/pan and explicitly marked interactive surfaces
  return Boolean(
    element.closest('.maplibregl-map, [data-scroll-lock-free="true"]')
  );
}

function canElementScrollInDirection(
  el: HTMLElement,
  deltaX: number,
  deltaY: number
): boolean {
  const style = window.getComputedStyle(el);
  const absY = Math.abs(deltaY);
  const absX = Math.abs(deltaX);

  if (absY > 0 && absY >= absX) {
    const overflowY = style.overflowY;
    if (
      (overflowY === "auto" ||
        overflowY === "scroll" ||
        overflowY === "overlay") &&
      el.scrollHeight > el.clientHeight + 1
    ) {
      if (deltaY > 0 && el.scrollTop + el.clientHeight < el.scrollHeight - 0.5) {
        return true;
      }
      if (deltaY < 0 && el.scrollTop > 0.5) {
        return true;
      }
    }
  }

  if (absX > 0 && absX >= absY) {
    const overflowX = style.overflowX;
    if (
      (overflowX === "auto" ||
        overflowX === "scroll" ||
        overflowX === "overlay") &&
      el.scrollWidth > el.clientWidth + 1
    ) {
      if (deltaX > 0 && el.scrollLeft + el.clientWidth < el.scrollWidth - 0.5) {
        return true;
      }
      if (deltaX < 0 && el.scrollLeft > 0.5) {
        return true;
      }
    }
  }

  return false;
}

function hasScrollableAncestorInsideModal(
  target: EventTarget | null,
  modalRoot: HTMLElement,
  deltaX: number,
  deltaY: number
): boolean {
  if (!(target instanceof Node)) return false;
  let current: HTMLElement | null =
    target instanceof HTMLElement ? target : target.parentElement;

  while (current) {
    if (canElementScrollInDirection(current, deltaX, deltaY)) {
      return true;
    }
    if (current === modalRoot) break;
    current = current.parentElement;
  }

  return false;
}

function hasAnyScrollableContainerInModal(
  target: EventTarget | null,
  modalRoot: HTMLElement
): boolean {
  if (!(target instanceof Node)) return false;
  let current: HTMLElement | null =
    target instanceof HTMLElement ? target : target.parentElement;

  while (current) {
    const style = window.getComputedStyle(current);
    const overflowY = style.overflowY;
    if (
      (overflowY === "auto" ||
        overflowY === "scroll" ||
        overflowY === "overlay") &&
      current.scrollHeight > current.clientHeight + 1
    ) {
      return true;
    }
    if (current === modalRoot) break;
    current = current.parentElement;
  }

  return false;
}

function handleWheelLock(event: WheelEvent) {
  // Always allow browser pinch-to-zoom (ctrl + wheel on macOS trackpad)
  if (event.ctrlKey) return;
  if (isPassThroughInteractiveTarget(event.target)) return;

  const modalRoot = findActiveModalRoot(event.target);
  if (!modalRoot) {
    event.preventDefault();
    return;
  }

  if (
    !hasScrollableAncestorInsideModal(
      event.target,
      modalRoot,
      event.deltaX,
      event.deltaY
    )
  ) {
    event.preventDefault();
  }
}

function handleTouchStartLock(event: TouchEvent) {
  if (event.touches.length !== 1) return;
  const touch = event.touches[0];
  lastTouchX = touch.clientX;
  lastTouchY = touch.clientY;
}

function handleTouchMoveLock(event: TouchEvent) {
  // Allow pinch-to-zoom gestures
  if (event.touches.length > 1) return;
  if (isPassThroughInteractiveTarget(event.target)) return;

  const touch = event.touches[0];
  if (!touch) return;

  const deltaX = lastTouchX - touch.clientX;
  const deltaY = lastTouchY - touch.clientY;
  lastTouchX = touch.clientX;
  lastTouchY = touch.clientY;

  const modalRoot = findActiveModalRoot(event.target);
  if (!modalRoot) {
    event.preventDefault();
    return;
  }

  if (!hasScrollableAncestorInsideModal(event.target, modalRoot, deltaX, deltaY)) {
    event.preventDefault();
  }
}

function handleKeyDownLock(event: KeyboardEvent) {
  if (!VERTICAL_SCROLL_KEYS.has(event.key)) return;
  if (isEditableElement(event.target)) return;

  const modalRoot = findActiveModalRoot(event.target);
  if (!modalRoot) {
    event.preventDefault();
    return;
  }

  // Only allow keyboard vertical scrolling if focus is inside a scrollable pane in the modal
  if (!hasAnyScrollableContainerInModal(event.target, modalRoot)) {
    event.preventDefault();
  }
}

function attachScrollLockListeners() {
  if (typeof window === "undefined" || isListenersAttached) return;
  isListenersAttached = true;

  document.documentElement.dataset.scrollLocked = "true";
  window.addEventListener("wheel", handleWheelLock, {
    passive: false,
    capture: true,
  });
  window.addEventListener("touchstart", handleTouchStartLock, {
    passive: true,
    capture: true,
  });
  window.addEventListener("touchmove", handleTouchMoveLock, {
    passive: false,
    capture: true,
  });
  window.addEventListener("keydown", handleKeyDownLock, {
    capture: true,
  });
}

function detachScrollLockListeners() {
  if (typeof window === "undefined" || !isListenersAttached) return;
  isListenersAttached = false;

  delete document.documentElement.dataset.scrollLocked;
  window.removeEventListener("wheel", handleWheelLock, { capture: true });
  window.removeEventListener("touchstart", handleTouchStartLock, {
    capture: true,
  });
  window.removeEventListener("touchmove", handleTouchMoveLock, {
    capture: true,
  });
  window.removeEventListener("keydown", handleKeyDownLock, { capture: true });
}

/**
 * Zero-layout-shift, reference-counted scroll lock shared across all modals,
 * bottom sheets, and drawers.
 *
 * Why we NEVER set `overflow: hidden` on `<html>` or `<body>`:
 * - Per CSS Overflow Level 4, `overflow: hidden` turns off `scrollbar-gutter: stable`
 *   and collapses classic scrollbars immediately, causing centered pages, fixed headers,
 *   and sticky anchor bars to shift horizontally to the right on modal open/close.
 * - Instead, we keep document geometry 100% untouched (0.00px layout shift on macOS,
 *   Windows, Linux, and mobile) and intercept wheel / touch / keyboard scroll events
 *   outside the active modal's scrollable containers.
 */
export function useBodyScrollLock(isLocked: boolean): void {
  useEffect(() => {
    if (!isLocked) {
      if (activeScrollLockCount <= 0) {
        detachScrollLockListeners();
      }
      return;
    }

    const wasUnlocked = activeScrollLockCount === 0;
    activeScrollLockCount += 1;
    if (wasUnlocked) {
      attachScrollLockListeners();
    }

    return () => {
      activeScrollLockCount = Math.max(0, activeScrollLockCount - 1);
      if (activeScrollLockCount === 0) {
        detachScrollLockListeners();
      }
    };
  }, [isLocked]);
}
