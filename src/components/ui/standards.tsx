"use client";

import React from "react";

/* ============================================================================
   MY-HOTEL · UNIFIED UI, LAYOUT & TYPOGRAPHY STANDARDS
   Enforces:
   1. Single Centered Feed Layout (`max-w-[760px] mx-auto`) — Facebook/Instagram style
   2. Strict 5-Tier Font Scale (`ty-display`, `ty-title`, `ty-subtitle`, `ty-body`, `ty-caption`)
   3. Automatic Light Mode (#ffffff) & Dark Mode (#0a0a0a / #141414) surfaces
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
      className={`app-feed-shell py-0 lg:py-6 flex flex-col gap-2.5 lg:gap-5 ${className}`}
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
        noPadding ? "overflow-hidden" : "p-4 sm:p-6"
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
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--color-border)] ${className}`}
    >
      <div className="flex items-start sm:items-center gap-3.5 min-w-0">
        {icon && <div className="fw-head-icon shrink-0">{icon}</div>}
        <div className="min-w-0">
          {eyebrow && (
            <span className="ty-caption font-semibold uppercase tracking-wider block mb-0.5">
              {eyebrow}
            </span>
          )}
          <h2 className="ty-title truncate">{title}</h2>
          {description && <p className="ty-body-muted mt-0.5">{description}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

type ButtonVariant = "primary" | "secondary" | "outline" | "subtle";
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
    sm: "h-9 px-3.5 text-[14px]",
    md: "h-10 px-4 text-[14px]",
    lg: "h-11 px-5 text-[14px]",
  };

  const variantClasses: Record<ButtonVariant, string> = {
    primary:
      "bg-[var(--color-accent)] text-[var(--color-on-accent)] hover:opacity-90 border border-[var(--color-accent)]",
    secondary:
      "bg-[var(--color-neutral)] text-[var(--color-text-primary)] hover:bg-[var(--color-overlay-pressed)] border border-transparent",
    outline:
      "bg-transparent text-[var(--color-text-primary)] border border-[var(--color-border-emphasized)] hover:bg-[var(--color-overlay-hover)]",
    subtle:
      "bg-[var(--color-background-muted)] text-[var(--color-text-primary)] hover:opacity-90 border border-[var(--color-border)]",
  };

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer ${
        sizeClasses[size]
      } ${variantClasses[variant]} ${fullWidth ? "w-full" : ""} ${className}`}
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

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label
          htmlFor={inputId}
          className="ty-body font-semibold text-[var(--color-text-primary)]"
        >
          {label}
        </label>
        {optionalText && <span className="ty-caption">{optionalText}</span>}
      </div>
      <input
        id={inputId}
        className={`h-10 w-full rounded-[12px] border border-[var(--color-border-emphasized)] bg-[var(--color-background-card)] px-3.5 text-[14px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] transition-all focus:border-[var(--color-text-primary)] focus:outline-none ${className}`}
        {...props}
      />
    </div>
  );
}

type RoomStatusType = "available" | "last_unit" | "booked";

export function StatusPill({
  status,
  label,
}: {
  status: RoomStatusType;
  label: string;
}) {
  const styles: Record<RoomStatusType, { wrapper: string; dot: string }> = {
    available: {
      wrapper: "bg-[#dcfce7] text-[#15803d] dark:bg-emerald-950/80 dark:text-emerald-300",
      dot: "bg-[#15803d] dark:bg-emerald-400",
    },
    last_unit: {
      wrapper: "bg-[#fef3c7] text-[#92400e] dark:bg-amber-950/80 dark:text-amber-300",
      dot: "bg-[#92400e] dark:bg-amber-400 animate-pulse",
    },
    booked: {
      wrapper: "bg-[#fee2e2] text-[#b91c1c] dark:bg-rose-950/80 dark:text-rose-300",
      dot: "bg-[#b91c1c] dark:bg-rose-400",
    },
  };

  const current = styles[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 h-7 text-[12px] font-semibold ${current.wrapper}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${current.dot}`} />
      <span>{label}</span>
    </span>
  );
}
