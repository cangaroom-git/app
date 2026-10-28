"use client";

import React from "react";

/* ============================================================================
   MY-HOTEL · UNIFIED UI, LAYOUT & TYPOGRAPHY STANDARDS
   Enforces:
   1. Single Centered Feed Layout (`max-w-[1140px] mx-auto`)
   2. Strict 5-Tier Font Scale (`ty-display`, `ty-title`, `ty-subtitle`, `ty-body`, `ty-caption`)
   3. Unified Pill Buttons, Circular Icon Buttons, Inputs & `#c53829` Promo Tokens
   4. Automatic Light Mode (#ffffff) & Dark Mode (#1C1C1D / #262627) surfaces
   ============================================================================ */

export function StandardFeedContainer({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`app-feed-shell py-4 lg:py-6 flex flex-col gap-6 lg:gap-8 ${className}`}
    >
      {children}
    </div>
  );
}

export function StandardCard({
  children,
  className = "",
  noPadding = false,
  id,
}: {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={`app-card ${
        noPadding ? "overflow-hidden" : "p-4 sm:p-5"
      } ${className}`}
    >
      {children}
    </section>
  );
}

export function StandardSectionHeader({
  eyebrow,
  title,
  description,
  icon,
  action,
  className = "",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${className}`}
    >
      <div className="min-w-0">
        {eyebrow && (
          <span className="ty-caption font-semibold uppercase tracking-wider block mb-0.5">
            {eyebrow}
          </span>
        )}
        <h2 className="ty-title flex items-center gap-2 min-w-0">
          {icon && (
            <span className="text-[var(--color-accent)] shrink-0 [&_svg]:w-5 [&_svg]:h-5">
              {icon}
            </span>
          )}
          <span className="truncate">{title}</span>
        </h2>
        {description && <p className="ty-caption mt-0.5">{description}</p>}
      </div>
      {action}
    </header>
  );
}

type ButtonVariant = "primary" | "promo" | "secondary" | "outline" | "subtle";
type ButtonSize = "sm" | "md" | "lg";

interface StandardButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

export function StandardButton({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className = "",
  children,
  ...props
}: StandardButtonProps) {
  const sizeClasses: Record<ButtonSize, string> = {
    sm: "h-8 px-3 text-[12px] leading-[1.4] [&_svg]:w-3.5 [&_svg]:h-3.5",
    md: "h-10 px-4 text-[14px] leading-[1.5] [&_svg]:w-4 [&_svg]:h-4",
    lg: "h-11 px-5 text-[14px] leading-[1.5] [&_svg]:w-4 [&_svg]:h-4",
  };

  const variantClasses: Record<ButtonVariant, string> = {
    primary:
      "bg-[var(--color-accent)] text-[var(--color-on-accent)] hover:bg-[var(--color-accent-hover)]",
    promo:
      "bg-[var(--color-promo)] text-[var(--color-on-promo)] hover:bg-[var(--color-promo-hover)]",
    secondary:
      "bg-[var(--color-background-muted)] text-[var(--color-text-primary)] hover:bg-[var(--color-background-subtle)]",
    outline:
      "bg-[var(--color-background-muted)] text-[var(--color-text-primary)] hover:bg-[var(--color-background-subtle)]",
    subtle:
      "bg-[var(--color-background-muted)] text-[var(--color-text-primary)] hover:bg-[var(--color-background-subtle)]",
  };

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer select-none ${
        sizeClasses[size]
      } ${variantClasses[variant]} ${fullWidth ? "w-full" : ""} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

interface StandardIconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: "sm" | "md";
  variant?: "subtle" | "outline" | "primary" | "promo" | "ghost";
}

export function StandardIconButton({
  size = "sm",
  variant = "subtle",
  className = "",
  children,
  ...props
}: StandardIconButtonProps) {
  const sizeMap = {
    sm: "h-9 w-9 [&_svg]:w-4 [&_svg]:h-4",
    md: "h-10 w-10 [&_svg]:w-5 [&_svg]:h-5",
  };

  const variantMap = {
    subtle:
      "bg-[var(--color-background-muted)] text-[var(--color-text-primary)] hover:bg-[var(--color-background-subtle)]",
    outline:
      "bg-[var(--color-background-muted)] text-[var(--color-text-primary)] hover:bg-[var(--color-background-subtle)]",
    primary:
      "bg-[var(--color-accent)] text-[var(--color-on-accent)] hover:bg-[var(--color-accent-hover)]",
    promo:
      "bg-[var(--color-promo)] text-[var(--color-on-promo)] hover:bg-[var(--color-promo-hover)]",
    ghost:
      "bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-overlay-hover)] hover:text-[var(--color-text-primary)]",
  };

  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center shrink-0 rounded-full transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer select-none ${sizeMap[size]} ${variantMap[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

interface StandardInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  optionalText?: string;
}

export function StandardInput({
  label,
  optionalText,
  id,
  className = "",
  ...props
}: StandardInputProps) {
  const generatedId = React.useId();
  const inputId = id || generatedId;
  const hasCustomBg = className.includes("bg-");

  return (
    <label htmlFor={inputId} className="flex flex-col gap-1.5">
      <span className="flex items-center justify-between ty-body font-semibold text-[var(--color-text-primary)]">
        <span>{label}</span>
        {optionalText && (
          <span className="ty-caption font-normal">{optionalText}</span>
        )}
      </span>
      <input
        id={inputId}
        className={`h-10 w-full rounded-[12px] ${
          hasCustomBg ? "" : "bg-[var(--color-background-muted)]"
        } px-3.5 text-[14px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] transition-all focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30 ${className}`}
        {...props}
      />
    </label>
  );
}

type RoomStatusType = "available" | "last_unit" | "booked" | "promo";
type StatusPillVariant =
  | "success"
  | "warning"
  | "error"
  | "promo"
  | "accent"
  | "neutral";

interface StatusPillProps {
  status?: RoomStatusType;
  label?: string;
  variant?: StatusPillVariant;
  children?: React.ReactNode;
  className?: string;
}

export function StatusPill({
  status,
  label,
  variant = "neutral",
  children,
  className = "",
}: StatusPillProps) {
  const statusStyles: Record<RoomStatusType, { wrapper: string; dot: string }> = {
    available: {
      wrapper:
        "bg-[var(--color-success-muted)] text-[var(--color-success)]",
      dot: "bg-[var(--color-success)]",
    },
    last_unit: {
      wrapper:
        "bg-[var(--color-warning-muted)] text-[var(--color-warning)]",
      dot: "bg-[var(--color-warning)] animate-pulse",
    },
    booked: {
      wrapper:
        "bg-[var(--color-error-muted)] text-[var(--color-error)]",
      dot: "bg-[var(--color-error)]",
    },
    promo: {
      wrapper:
        "bg-[var(--color-promo)] text-[var(--color-on-promo)]",
      dot: "bg-[var(--color-on-promo)]",
    },
  };

  if (status) {
    const current = statusStyles[status];
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 h-6 ty-caption font-semibold leading-none ${current.wrapper} ${className}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${current.dot}`} />
        <span>{label ?? children}</span>
      </span>
    );
  }

  const variantClasses: Record<StatusPillVariant, string> = {
    success: "bg-[var(--color-success-muted)] text-[var(--color-success)]",
    warning: "bg-[var(--color-warning-muted)] text-[var(--color-warning)]",
    error: "bg-[var(--color-error-muted)] text-[var(--color-error)]",
    promo: "bg-[var(--color-promo)] text-[var(--color-on-promo)]",
    accent: "bg-[var(--color-accent-muted)] text-[var(--color-accent)]",
    neutral:
      "bg-[var(--color-background-muted)] text-[var(--color-text-secondary)]",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 h-6 ty-caption font-semibold leading-none ${variantClasses[variant]} ${className}`}
    >
      {children ?? label}
    </span>
  );
}
