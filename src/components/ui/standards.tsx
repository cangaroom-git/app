"use client";

import React from "react";

/* ============================================================================
   CANGAROOM · MASTER UI, LAYOUT & MONOCHROME STANDARDS (v2.0)
   Enforces:
   1. 3-Tier Standardized Container Grid (`cgr-page-fluid`, `cgr-page-standard`, `cgr-page-reading`)
   2. Strict 95/5 Monochrome Palette (#FFFFFF, #F1F1F1, #111111, #737373)
   3. ZERO Card Shadows & ZERO Hover Scale Site-Wide
   4. 2-Button Hierarchy (#111111 Primary, #F1F1F1 Secondary) & 6px Dot StatusPills
   ============================================================================ */

export function StandardFeedContainer({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`cgr-page-standard flex flex-col gap-6 ${className}`}>
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
      className={`rounded-[20px] bg-[var(--color-background-card)] border border-[var(--color-border)] ${
        noPadding ? "overflow-hidden" : "p-4 sm:p-5"
      } ${className}`}
    >
      {children}
    </section>
  );
}

export function StandardSectionHeader({
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
        <h2 className="ty-title flex items-center gap-2 min-w-0">
          {icon && (
            <span className="text-[var(--color-text-primary)] shrink-0 [&_svg]:w-5 [&_svg]:h-5">
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
    sm: "h-8 px-3 rounded-[10px] text-[13px] leading-[1.35] [&_svg]:w-3.5 [&_svg]:h-3.5",
    md: "h-9 px-4 rounded-[12px] text-[14px] leading-[1.35] [&_svg]:w-4 [&_svg]:h-4",
    lg: "h-10 px-5 rounded-[13px] text-[15px] leading-[1.35] [&_svg]:w-4 [&_svg]:h-4",
  };

  const variantClasses: Record<ButtonVariant, string> = {
    primary:
      "bg-[#222222] !text-white hover:bg-[#3f3f3f] dark:bg-[#f5f5f5] dark:hover:bg-[#e5e5e5] dark:!text-[#222222]",
    promo:
      "bg-[#222222] !text-white hover:bg-[#3f3f3f] dark:bg-[#f5f5f5] dark:hover:bg-[#e5e5e5] dark:!text-[#222222]",
    secondary:
      "bg-[var(--color-background-muted)] text-[var(--color-text-primary)] hover:bg-[var(--color-background-subtle)]",
    outline:
      "bg-[var(--color-background-card)] border border-[var(--color-border-emphasized)] text-[var(--color-text-primary)] hover:border-[var(--color-text-primary)] hover:bg-[var(--color-background-muted)]",
    subtle:
      "bg-[var(--color-background-muted)] text-[var(--color-text-primary)] hover:bg-[var(--color-background-subtle)]",
  };

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 font-semibold transition-colors duration-150 disabled:opacity-50 disabled:pointer-events-none cursor-pointer select-none ${
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
    sm: "h-9 w-9 rounded-[12px] [&_svg]:w-4 [&_svg]:h-4",
    md: "h-10 w-10 rounded-[13px] [&_svg]:w-5 [&_svg]:h-5",
  };

  const variantMap = {
    subtle:
      "bg-[var(--color-background-muted)] text-[var(--color-text-primary)] hover:bg-[var(--color-background-subtle)]",
    outline:
      "bg-[var(--color-background-card)] border border-[var(--color-border-emphasized)] text-[var(--color-text-primary)] hover:border-[var(--color-text-primary)] hover:bg-[var(--color-background-muted)]",
    primary:
      "bg-[#222222] !text-white hover:bg-[#3f3f3f] dark:bg-[#f5f5f5] dark:hover:bg-[#e5e5e5] dark:!text-[#222222]",
    promo:
      "bg-[#222222] !text-white hover:bg-[#3f3f3f] dark:bg-[#f5f5f5] dark:hover:bg-[#e5e5e5] dark:!text-[#222222]",
    ghost:
      "bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-background-muted)] hover:text-[var(--color-text-primary)]",
  };

  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center shrink-0 transition-colors duration-150 disabled:opacity-50 disabled:pointer-events-none cursor-pointer select-none ${sizeMap[size]} ${variantMap[variant]} ${className}`}
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
        className={`h-10 w-full rounded-[12px] border border-[var(--color-border)] ${
          hasCustomBg ? "" : "bg-[var(--color-background-muted)]"
        } px-3.5 text-[15px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] transition-colors focus:outline-none focus:border-[var(--color-border-emphasized)] focus:bg-[var(--color-background-card)] ${className}`}
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
  const dotByStatus: Record<RoomStatusType, string> = {
    available: "bg-emerald-500",
    last_unit: "bg-amber-500",
    booked: "bg-rose-500",
    promo: "bg-[#111111] dark:bg-[#f5f5f5]",
  };

  const dotByVariant: Record<StatusPillVariant, string> = {
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    error: "bg-rose-500",
    promo: "bg-[#111111] dark:bg-[#f5f5f5]",
    accent: "bg-[#111111] dark:bg-[#f5f5f5]",
    neutral: "bg-[var(--color-text-secondary)]",
  };

  const dotClass = status ? dotByStatus[status] : dotByVariant[variant];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-[var(--color-background-muted)] text-[var(--color-text-primary)] px-2.5 h-6 text-[12px] font-semibold leading-none ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${dotClass}`} />
      <span>{label ?? children}</span>
    </span>
  );
}
