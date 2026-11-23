"use client";

import React, { useRef } from "react";
import {
  useUltraHorizontalScroll,
  type UseUltraHorizontalScrollOptions,
} from "@/lib/useUltraHorizontalScroll";

export interface UltraHorizontalScrollProps
  extends React.HTMLAttributes<HTMLDivElement> {
  as?: "div" | "nav";
  ultraOptions?: UseUltraHorizontalScrollOptions;
}

/**
 * Drop-in Ultra-Smooth 120fps Inertial Momentum Horizontal Scroll Track:
 * Automatically provides native iOS exponential-decay coasting, rubber-band edge cushions,
 * vertical-scroll lock, and desktop mouse drag-to-flick with zero layout changes.
 */
export function UltraHorizontalScroll({
  as = "div",
  ultraOptions,
  children,
  ...rest
}: UltraHorizontalScrollProps) {
  const internalRef = useRef<HTMLDivElement | null>(null);
  useUltraHorizontalScroll(internalRef, ultraOptions);

  if (as === "nav") {
    return (
      <nav
        ref={internalRef as unknown as React.RefObject<HTMLElement>}
        {...(rest as React.HTMLAttributes<HTMLElement>)}
      >
        {children}
      </nav>
    );
  }

  return (
    <div ref={internalRef} {...rest}>
      {children}
    </div>
  );
}
