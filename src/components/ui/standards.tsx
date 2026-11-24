"use client";

import React from "react";
import { Check } from "lucide-react";
import {
  ResponsiveSelect,
  type ResponsiveSelectOption,
} from "@/components/ui/ResponsiveSelect";

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
    sm: "h-8 px-3.5 rounded-full text-[13px] leading-[1.35] [&_svg]:w-3.5 [&_svg]:h-3.5",
    md: "h-9 px-4 rounded-full text-[14px] leading-[1.35] [&_svg]:w-4 [&_svg]:h-4",
    lg: "h-11 px-6 rounded-full text-[15px] leading-[1.35] [&_svg]:w-4 [&_svg]:h-4",
  };

  const variantClasses: Record<ButtonVariant, string> = {
    primary:
      "bg-[var(--color-accent)] !text-[var(--color-on-accent)] hover:bg-[var(--color-accent-hover)]",
    promo:
      "bg-[var(--color-accent)] !text-[var(--color-on-accent)] hover:bg-[var(--color-accent-hover)]",
    secondary:
      "bg-[var(--color-background-muted)] text-[var(--color-text-primary)] hover:bg-[var(--color-background-subtle)]",
    outline:
      "bg-[var(--color-background-card)] border border-[var(--color-border-emphasized)] text-[var(--color-text-primary)] hover:border-[var(--color-accent)] hover:bg-[var(--color-background-muted)]",
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
    sm: "h-9 w-9 rounded-full [&_svg]:w-4 [&_svg]:h-4",
    md: "h-10 w-10 rounded-full [&_svg]:w-5 [&_svg]:h-5",
  };

  const variantMap = {
    subtle:
      "bg-[var(--color-background-muted)] text-[var(--color-text-primary)] hover:bg-[var(--color-background-subtle)]",
    outline:
      "bg-[var(--color-background-card)] border border-[var(--color-border-emphasized)] text-[var(--color-text-primary)] hover:border-[var(--color-accent)] hover:bg-[var(--color-background-muted)]",
    primary:
      "bg-[var(--color-accent)] !text-[var(--color-on-accent)] hover:bg-[var(--color-accent-hover)]",
    promo:
      "bg-[var(--color-accent)] !text-[var(--color-on-accent)] hover:bg-[var(--color-accent-hover)]",
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
  helperText?: string;
  prefixText?: string;
  suffixText?: string;
  grouped?: boolean;
}

/**
 * Unified Airbnb Inset-Label Input Field (Site-Wide Standard)
 * Pure white canvas · 1px #b0b0b0 hairline · Inset 12px top-left label · 56px min height
 */
export function StandardInput({
  label,
  optionalText,
  helperText,
  prefixText,
  suffixText,
  grouped = false,
  id,
  className = "",
  ...props
}: StandardInputProps) {
  const generatedId = React.useId();
  const inputId = id || generatedId;

  const boxClass = grouped
    ? "relative flex flex-col justify-center min-h-[56px] px-3.5 py-2 rounded-[11px] bg-transparent focus-within:bg-[var(--color-background-card)] focus-within:z-10 focus-within:ring-2 focus-within:ring-inset focus-within:ring-[var(--color-text-primary)] transition-colors"
    : "relative flex flex-col justify-center min-h-[56px] w-full rounded-[12px] border border-[#b0b0b0] dark:border-[var(--color-border-emphasized)] bg-[var(--color-background-card)] px-3.5 py-2 focus-within:border-[var(--color-text-primary)] focus-within:ring-1 focus-within:ring-[var(--color-text-primary)] transition-colors";

  return (
    <div className={grouped ? "min-w-0" : "w-full"}>
      <label htmlFor={inputId} className={`${boxClass} cursor-text`}>
        <span className="flex items-center justify-between gap-2 text-[12px] font-medium leading-tight text-[var(--color-text-secondary)]">
          <span className="truncate">{label}</span>
          {optionalText && (
            <span className="text-[11px] font-normal text-[var(--color-text-tertiary)] shrink-0">
              {optionalText}
            </span>
          )}
        </span>
        <span className="flex items-center gap-1.5 mt-0.5">
          {prefixText && (
            <span className="text-[15px] font-medium text-[var(--color-text-secondary)] shrink-0">
              {prefixText}
            </span>
          )}
          <input
            id={inputId}
            className={`w-full bg-transparent text-[15px] leading-snug text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none min-w-0 ${className}`}
            {...props}
          />
          {suffixText && (
            <span className="text-[13px] text-[var(--color-text-secondary)] shrink-0">
              {suffixText}
            </span>
          )}
        </span>
      </label>
      {helperText && (
        <p className="text-[12px] text-[var(--color-text-secondary)] mt-1.5 leading-relaxed">
          {helperText}
        </p>
      )}
    </div>
  );
}

interface StandardTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  optionalText?: string;
  helperText?: string;
}

/**
 * Unified Airbnb Inset-Label Textarea Field (Site-Wide Standard)
 */
export function StandardTextarea({
  label,
  optionalText,
  helperText,
  id,
  rows = 3,
  className = "",
  ...props
}: StandardTextareaProps) {
  const generatedId = React.useId();
  const textareaId = id || generatedId;

  return (
    <div className="w-full">
      <label
        htmlFor={textareaId}
        className="block w-full rounded-[12px] border border-[#b0b0b0] dark:border-[var(--color-border-emphasized)] bg-[var(--color-background-card)] px-3.5 py-2.5 focus-within:border-[var(--color-text-primary)] focus-within:ring-1 focus-within:ring-[var(--color-text-primary)] transition-colors cursor-text"
      >
        <span className="flex items-center justify-between gap-2 text-[12px] font-medium leading-tight text-[var(--color-text-secondary)]">
          <span>{label}</span>
          {optionalText && (
            <span className="text-[11px] font-normal text-[var(--color-text-tertiary)] shrink-0">
              {optionalText}
            </span>
          )}
        </span>
        <textarea
          id={textareaId}
          rows={rows}
          className={`w-full mt-1 bg-transparent text-[15px] leading-relaxed text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none resize-none ${className}`}
          {...props}
        />
      </label>
      {helperText && (
        <p className="text-[12px] text-[var(--color-text-secondary)] mt-1.5 leading-relaxed">
          {helperText}
        </p>
      )}
    </div>
  );
}

/**
 * Unified Airbnb Inset-Label Select Field (Matches Property Type Dropdown Standard)
 */
export function StandardSelectField({
  label,
  optionalText,
  helperText,
  grouped = false,
  value,
  onChange,
  options,
  sheetTitle,
  leadingIcon,
  searchPlaceholder,
}: {
  label: string;
  optionalText?: string;
  helperText?: string;
  grouped?: boolean;
  value: string;
  onChange: (nextValue: string) => void;
  options: ResponsiveSelectOption[];
  sheetTitle?: string;
  leadingIcon?: React.ReactNode;
  searchPlaceholder?: string;
}) {
  return (
    <div className={grouped ? "min-w-0" : "w-full"}>
      <ResponsiveSelect
        value={value}
        onChange={onChange}
        options={options}
        insetLabel={label}
        optionalText={optionalText}
        grouped={grouped}
        sheetTitle={sheetTitle || label}
        leadingIcon={leadingIcon}
        searchPlaceholder={searchPlaceholder}
      />
      {helperText && (
        <p className="text-[12px] text-[var(--color-text-secondary)] mt-1.5 leading-relaxed">
          {helperText}
        </p>
      )}
    </div>
  );
}

/**
 * Unified Airbnb Grouped Field Box (Matches Sticky Widget CHECK-IN | CHECKOUT)
 */
export function StandardFieldGroup({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[12px] border border-[#b0b0b0] dark:border-[var(--color-border-emphasized)] bg-[var(--color-background-card)] divide-y divide-[#b0b0b0] dark:divide-[var(--color-border-emphasized)] ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * Unified Airbnb Counter Stepper Row (Matches Property Type: Label  [ - ] 1 [ + ])
 */
export function StandardStepperRow({
  label,
  description,
  value,
  min = 0,
  max = 99,
  onChange,
}: {
  label: string;
  description?: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="py-3.5 first:pt-1 last:pb-1 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-[15px] font-medium text-[var(--color-text-primary)]">
          {label}
        </p>
        {description && (
          <p className="text-[12.5px] text-[var(--color-text-secondary)] mt-0.5">
            {description}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3.5 shrink-0">
        <button
          type="button"
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
          aria-label={`ลด ${label}`}
          className="h-8 w-8 rounded-[10px] border border-[#b0b0b0] dark:border-[var(--color-border-emphasized)] hover:border-[var(--color-text-primary)] text-[var(--color-text-primary)] inline-flex items-center justify-center text-[16px] leading-none cursor-pointer transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          −
        </button>
        <span className="w-6 text-center text-[15px] font-semibold text-[var(--color-text-primary)] tabular-nums">
          {value}
        </span>
        <button
          type="button"
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
          aria-label={`เพิ่ม ${label}`}
          className="h-8 w-8 rounded-[10px] border border-[#b0b0b0] dark:border-[var(--color-border-emphasized)] hover:border-[var(--color-text-primary)] text-[var(--color-text-primary)] inline-flex items-center justify-center text-[16px] leading-none cursor-pointer transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          +
        </button>
      </div>
    </div>
  );
}

/**
 * Unified Airbnb Warm Minimal Squircle Checkbox (Global Site-Wide Standard)
 * Zero browser-default blue checkboxes — crisp 20×20px squircle (`rounded-[6px]`)
 * with solid `#222222` (`#f5f5f5` dark) active fill and subtle border when unchecked.
 */
export function StandardCheckbox({
  checked,
  onChange,
  disabled = false,
  label,
  ariaLabel,
  className = "",
}: {
  checked: boolean;
  onChange: (nextChecked: boolean) => void;
  disabled?: boolean;
  label?: React.ReactNode;
  ariaLabel?: string;
  className?: string;
}) {
  const box = (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={ariaLabel ?? (typeof label === "string" ? label : undefined)}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`h-5 w-5 rounded-[6px] inline-flex items-center justify-center shrink-0 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-1 ${
        checked
          ? "bg-[var(--color-accent)] border border-[var(--color-accent)] !text-[var(--color-on-accent)]"
          : "bg-[var(--color-background-card)] border border-[#b0b0b0] dark:border-[var(--color-border-emphasized)] hover:border-[var(--color-accent)]"
      } ${!label ? className : ""}`}
    >
      {checked && <Check className="w-3.5 h-3.5 stroke-[2.75]" />}
    </button>
  );

  if (!label) return box;

  return (
    <div
      className={`inline-flex items-center gap-2.5 text-[14px] font-medium text-[var(--color-text-primary)] ${
        disabled ? "opacity-50" : "cursor-pointer"
      } ${className}`}
    >
      {box}
      <span
        onClick={() => {
          if (!disabled) onChange(!checked);
        }}
        className="select-none"
      >
        {label}
      </span>
    </div>
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
    promo: "bg-[var(--color-accent)]",
  };

  const dotByVariant: Record<StatusPillVariant, string> = {
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    error: "bg-rose-500",
    promo: "bg-[var(--color-accent)]",
    accent: "bg-[var(--color-accent)]",
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
