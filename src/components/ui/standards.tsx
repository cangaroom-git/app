import React from "react";

/**
 * MY-HOTEL MODERN FASTWORK DESIGN SYSTEM STANDARDS
 * Modeled after www.fastwork.com & WeGlobal (/Users/light/my-shop)
 *
 * CORE DESIGN PRINCIPLE:
 * - Modern neutral SaaS aesthetic that adapts seamlessly to any hotel property.
 * - Primary Brand Blue: #0063F5 (Hover #0052CC, Soft Tint #EFF6FF, Border Tint #BFDBFE)
 * - Clean Surfaces: Pure White #FFFFFF & Cool Canvas #F6F8FB
 * - Crisp Slate Typography: Heading #121317, Body #475467, Muted #64748B
 * - Modern Rounded Geometry: rounded-xl / rounded-2xl cards & buttons, rounded-full pills.
 */

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "primary"
    | "secondary"
    | "outline"
    | "subtle"
    | "ghost"
    | "danger";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
}

export function StandardButton({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className = "",
  children,
  ...props
}: ButtonProps) {
  const sizeClasses = {
    sm: "h-9 px-4 text-xs font-semibold",
    md: "h-10 px-5 text-xs sm:text-sm font-semibold",
    lg: "h-12 px-7 text-sm font-bold",
  }[size];

  const variantClasses = {
    primary:
      "bg-[#0063F5] text-white border border-[#0063F5] hover:bg-[#0052CC] hover:border-[#0052CC] shadow-[0_4px_12px_rgba(0,99,245,0.22)] disabled:bg-[#E2E8F0] disabled:border-[#E2E8F0] disabled:text-[#94A3B8] disabled:shadow-none",
    secondary:
      "bg-[#0F172A] text-white border border-[#0F172A] hover:bg-[#1E293B] hover:border-[#1E293B]",
    outline:
      "bg-white text-[#121317] border border-[#CBD5E1] hover:border-[#0063F5] hover:text-[#0063F5] hover:bg-[#EFF6FF] disabled:border-[#E2E8F0] disabled:text-[#94A3B8]",
    subtle:
      "bg-[#EFF6FF] text-[#0063F5] border border-[#BFDBFE] hover:bg-[#DBEAFE] hover:border-[#93C5FD]",
    ghost:
      "bg-transparent text-[#475467] hover:text-[#0063F5] hover:bg-[#F1F5F9]",
    danger:
      "bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA] hover:bg-[#FEE2E2]",
  }[variant];

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl transition-all duration-200 cursor-pointer disabled:cursor-not-allowed ${sizeClasses} ${variantClasses} ${
        fullWidth ? "w-full" : ""
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  helperText?: string;
  optionalText?: string;
}

export function StandardInput({
  label,
  helperText,
  optionalText,
  className = "",
  ...props
}: InputProps) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-[#334155]">
          {label}
        </label>
        {optionalText && (
          <span className="text-[11px] text-[#64748B]">{optionalText}</span>
        )}
      </div>
      <input
        className={`h-11 w-full rounded-xl border border-[#CBD5E1] bg-white px-3.5 text-sm text-[#121317] placeholder:text-[#94A3B8] transition-all focus:border-[#0063F5] focus:outline-none focus:ring-3 focus:ring-[#0063F5]/15 ${className}`}
        {...props}
      />
      {helperText && (
        <p className="text-[11px] text-[#64748B] leading-snug">{helperText}</p>
      )}
    </div>
  );
}

export type PillStatusType =
  | "available"
  | "last_unit"
  | "pending"
  | "booked"
  | "maintenance"
  | "neutral";

export function StatusPill({
  status,
  tone,
  label,
}: {
  status?: PillStatusType;
  tone?: PillStatusType;
  label: string;
}) {
  const key: PillStatusType = status ?? tone ?? "neutral";

  const styles: Record<PillStatusType, string> = {
    available:
      "bg-[#0063F5] text-white border-[#0052CC] shadow-xs",
    last_unit:
      "bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]",
    pending:
      "bg-[#EFF6FF] text-[#0063F5] border-[#BFDBFE]",
    booked:
      "bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]",
    maintenance:
      "bg-[#F1F5F9] text-[#475569] border-[#CBD5E1]",
    neutral: "bg-[#F8FAFC] text-[#334155] border-[#E2E8F0]",
  };

  const dotStyles: Record<PillStatusType, string> = {
    available: "bg-[#60A5FA]",
    last_unit: "bg-[#F59E0B]",
    pending: "bg-[#0063F5]",
    booked: "bg-[#EF4444]",
    maintenance: "bg-[#64748B]",
    neutral: "bg-[#0063F5]",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold leading-none whitespace-nowrap ${styles[key]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotStyles[key]}`} />
      {label}
    </span>
  );
}
