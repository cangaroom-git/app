"use client";

function findVisibleTarget(selector: string): HTMLElement | null {
  if (typeof document === "undefined") return null;
  const nodes = Array.from(document.querySelectorAll<HTMLElement>(selector));
  for (const el of nodes) {
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      return el;
    }
  }
  return null;
}

/**
 * Satisfying Airbnb/Shopee-style micro-interaction: launches a compact monochrome
 * coupon chip along a smooth ballistic arc from the claimed CTA to the visible
 * Coupon Wallet target button, then bumps the wallet counter on arrival.
 */
export function launchCouponFlyAnimation(
  sourceEl: HTMLElement | null,
  badgeText: string
): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  if (!sourceEl) return;

  const targetEl =
    findVisibleTarget("[data-coupon-wallet-drawer-target='true']") ??
    findVisibleTarget("[data-coupon-wallet-target='true']");

  if (!targetEl) return;

  const srcRect = sourceEl.getBoundingClientRect();
  const dstRect = targetEl.getBoundingClientRect();
  if (srcRect.width <= 0 || dstRect.width <= 0) return;

  const startX = srcRect.left + srcRect.width / 2;
  const startY = srcRect.top + srcRect.height / 2;
  const endX = dstRect.left + dstRect.width / 2;
  const endY = dstRect.top + dstRect.height / 2;

  const midX = (startX + endX) / 2;
  const midY = Math.min(startY, endY) - 48;

  const chip = document.createElement("div");
  chip.setAttribute("aria-hidden", "true");
  chip.textContent = badgeText;
  chip.style.position = "fixed";
  chip.style.left = `${startX}px`;
  chip.style.top = `${startY}px`;
  chip.style.transform = "translate3d(-50%, -50%, 0)";
  chip.style.zIndex = "99";
  chip.style.pointerEvents = "none";
  chip.style.padding = "5px 10px";
  chip.style.borderRadius = "10px";
  chip.style.fontSize = "12px";
  chip.style.fontWeight = "700";
  chip.style.letterSpacing = "-0.01em";
  chip.style.whiteSpace = "nowrap";
  chip.style.boxShadow = "0 6px 20px rgba(0, 0, 0, 0.16)";

  const isDark = document.documentElement.classList.contains("dark");
  chip.style.backgroundColor = isDark ? "#f5f5f5" : "#222222";
  chip.style.color = isDark ? "#222222" : "#ffffff";

  document.body.appendChild(chip);

  const dxMid = midX - startX;
  const dyMid = midY - startY;
  const dxEnd = endX - startX;
  const dyEnd = endY - startY;

  const anim = chip.animate(
    [
      {
        transform: "translate3d(-50%, -50%, 0) scale(1)",
        opacity: 1,
      },
      {
        transform: `translate3d(calc(-50% + ${dxMid}px), calc(-50% + ${dyMid}px), 0) scale(0.92)`,
        opacity: 0.95,
        offset: 0.48,
      },
      {
        transform: `translate3d(calc(-50% + ${dxEnd}px), calc(-50% + ${dyEnd}px), 0) scale(0.45)`,
        opacity: 0.15,
      },
    ],
    {
      duration: 480,
      easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      fill: "forwards",
    }
  );

  const finish = () => {
    chip.remove();
    targetEl.classList.remove("cgr-wallet-bump");
    // Force reflow so rapid consecutive claims retrigger the bump cleanly
    void targetEl.offsetWidth;
    targetEl.classList.add("cgr-wallet-bump");
    window.setTimeout(() => {
      targetEl.classList.remove("cgr-wallet-bump");
    }, 390);
  };

  anim.onfinish = finish;
  anim.oncancel = () => chip.remove();
}
