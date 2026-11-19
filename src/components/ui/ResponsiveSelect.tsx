"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";

export interface ResponsiveSelectOption {
  value: string;
  label: string;
  sublabel?: string;
  dotTone?: "success" | "warning" | "error";
}

interface ResponsiveSelectProps {
  id?: string;
  value: string;
  onChange: (nextValue: string) => void;
  options: ResponsiveSelectOption[];
  sheetTitle: string;
  ariaLabel?: string;
  insetLabel?: string;
  optionalText?: string;
  grouped?: boolean;
  leadingIcon?: React.ReactNode;
  triggerClassName?: string;
  dropdownClassName?: string;
  searchPlaceholder?: string;
  closeAriaLabel?: string;
}

function StatusDot({ tone }: { tone: "success" | "warning" | "error" }) {
  const bgClass =
    tone === "success"
      ? "bg-[var(--color-success)]"
      : tone === "warning"
      ? "bg-[var(--color-warning)]"
      : "bg-[var(--color-error)]";
  return <span aria-hidden="true" className={`h-2 w-2 rounded-full shrink-0 ${bgClass}`} />;
}

export function ResponsiveSelect({
  id,
  value,
  onChange,
  options,
  sheetTitle,
  ariaLabel,
  insetLabel,
  optionalText,
  grouped = false,
  leadingIcon,
  triggerClassName = "w-full h-10 px-3 rounded-[10px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[13px] font-semibold text-[var(--color-text-primary)]",
  dropdownClassName = "min-w-[280px] left-0 right-0",
  searchPlaceholder = "ค้นหา...",
  closeAriaLabel = "Close",
}: ResponsiveSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [filterQuery, setFilterQuery] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(max-width: 1023px)");
    setIsMobileViewport(mq.matches);
    const onChangeViewport = (e: MediaQueryListEvent) => {
      setIsMobileViewport(e.matches);
    };
    mq.addEventListener("change", onChangeViewport);
    return () => mq.removeEventListener("change", onChangeViewport);
  }, []);

  useBodyScrollLock(isOpen && isMobileViewport);

  // Close desktop popover on outside click & close both modes on Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (
        !isMobileViewport &&
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKey);
    document.addEventListener("mousedown", handleMouseDown);
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, [isMobileViewport, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setFilterQuery("");
    }
  }, [isOpen]);

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value) ?? options[0] ?? null,
    [options, value]
  );

  const showSearch = options.length > 8;
  const filteredOptions = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.sublabel && opt.sublabel.toLowerCase().includes(q))
    );
  }, [filterQuery, options]);

  const handleSelectOption = (nextVal: string) => {
    onChange(nextVal);
    setIsOpen(false);
  };

  const resolvedTriggerClass = insetLabel
    ? grouped
      ? `w-full min-h-[56px] px-3.5 py-2 rounded-[11px] bg-transparent text-left focus:outline-none ${
          isOpen
            ? "ring-2 ring-inset ring-[var(--color-text-primary)] relative z-10 bg-[var(--color-background-card)]"
            : "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-text-primary)]"
        }`
      : `w-full min-h-[56px] px-3.5 py-2 rounded-[12px] border bg-[var(--color-background-card)] text-left focus:outline-none ${
          isOpen
            ? "border-[var(--color-text-primary)] ring-1 ring-[var(--color-text-primary)]"
            : "border-[#b0b0b0] dark:border-[var(--color-border-emphasized)] hover:border-[var(--color-text-primary)] focus-visible:border-[var(--color-text-primary)] focus-visible:ring-1 focus-visible:ring-[var(--color-text-primary)]"
        }`
    : triggerClassName;

  return (
    <div ref={containerRef} className="relative flex-1 min-w-0">
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel || insetLabel || sheetTitle}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center justify-between gap-2 text-left cursor-pointer transition-colors ${resolvedTriggerClass}`}
      >
        {insetLabel ? (
          <span className="flex flex-col justify-center min-w-0 flex-1">
            <span className="flex items-center justify-between gap-2 text-[12px] font-medium leading-tight text-[var(--color-text-secondary)]">
              <span className="truncate">{insetLabel}</span>
              {optionalText && (
                <span className="text-[11px] font-normal text-[var(--color-text-tertiary)] shrink-0">
                  {optionalText}
                </span>
              )}
            </span>
            <span className="flex items-center gap-2 mt-0.5 text-[15px] leading-snug text-[var(--color-text-primary)] min-w-0">
              {leadingIcon}
              <span className="truncate">{selectedOption?.label ?? ""}</span>
            </span>
          </span>
        ) : (
          <span className="flex items-center gap-2 min-w-0 flex-1">
            {leadingIcon}
            <span className="truncate">{selectedOption?.label ?? ""}</span>
          </span>
        )}
        <ChevronDown
          className={`w-4 h-4 text-[var(--color-text-secondary)] shrink-0 transition-transform duration-150 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* DESKTOP FLOATING DROPDOWN POPOVER (>= lg) */}
      {isOpen && !isMobileViewport && (
        <div
          role="listbox"
          aria-label={sheetTitle}
          className={`absolute top-[calc(100%+6px)] z-50 rounded-[16px] bg-[var(--color-background-popover)] border border-[var(--color-border)] shadow-[var(--shadow-popover)] p-1.5 ${dropdownClassName}`}
        >
          {showSearch && (
            <div className="p-1.5 pb-2">
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 text-[var(--color-text-secondary)] absolute left-3 pointer-events-none" />
                <input
                  type="search"
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  autoFocus
                  className="w-full h-9 pl-8 pr-3 rounded-[10px] bg-[var(--color-background-muted)] text-[13px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none"
                />
              </div>
            </div>
          )}

          <div className="max-h-[300px] overflow-y-auto space-y-0.5">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-4 text-center text-[12.5px] text-[var(--color-text-secondary)]">
                —
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelectOption(opt.value)}
                    className={`w-full px-3 py-2.5 rounded-[10px] text-left flex items-center justify-between gap-2.5 cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-[var(--color-background-muted)]"
                        : "hover:bg-[var(--color-background-muted)]/70"
                    }`}
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-2 min-w-0">
                        {opt.dotTone && <StatusDot tone={opt.dotTone} />}
                        <span
                          className={`text-[13px] truncate ${
                            isSelected
                              ? "font-semibold text-[var(--color-text-primary)]"
                              : "font-medium text-[var(--color-text-primary)]"
                          }`}
                        >
                          {opt.label}
                        </span>
                      </div>
                      {opt.sublabel && (
                        <p className="text-[11.5px] text-[var(--color-text-secondary)] truncate">
                          {opt.sublabel}
                        </p>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-[var(--color-text-primary)] shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* MOBILE / TABLET SLIDE-UP BOTTOM SHEET MODAL (< lg) */}
      {isOpen &&
        isMobileViewport &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={sheetTitle}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-[85] bg-black/50 flex items-end justify-center animate-fade-in-backdrop"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[640px] max-h-[82dvh] rounded-t-[24px] bg-[var(--color-background-popover)] border-t border-[var(--color-border)] shadow-[var(--shadow-popover)] flex flex-col overflow-hidden animate-slide-up-sheet pb-[max(16px,env(safe-area-inset-bottom))]"
            >
              <div
                aria-hidden="true"
                className="h-1 w-10 rounded-full bg-[var(--color-border-emphasized)] mx-auto mt-3 shrink-0"
              />

              <div className="px-5 py-3.5 border-b border-[var(--color-border)] flex items-center justify-between gap-3 shrink-0">
                <h3 className="text-[16.5px] font-semibold text-[var(--color-text-primary)] truncate">
                  {sheetTitle}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label={closeAriaLabel}
                  className="h-9 w-9 rounded-[10px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] inline-flex items-center justify-center cursor-pointer transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {showSearch && (
                <div className="px-4 pt-3 shrink-0">
                  <div className="relative flex items-center">
                    <Search className="w-4 h-4 text-[var(--color-text-secondary)] absolute left-3.5 pointer-events-none" />
                    <input
                      type="search"
                      value={filterQuery}
                      onChange={(e) => setFilterQuery(e.target.value)}
                      placeholder={searchPlaceholder}
                      className="w-full h-10 pl-10 pr-3.5 rounded-[12px] bg-[var(--color-background-muted)] text-[14px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <div
                role="listbox"
                aria-label={sheetTitle}
                className="p-3 overflow-y-auto space-y-1.5"
              >
                {filteredOptions.length === 0 ? (
                  <div className="py-8 text-center text-[13.5px] text-[var(--color-text-secondary)]">
                    —
                  </div>
                ) : (
                  filteredOptions.map((opt) => {
                    const isSelected = opt.value === value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => handleSelectOption(opt.value)}
                        className={`w-full min-h-[52px] px-3.5 py-2.5 rounded-[12px] text-left flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-[var(--color-background-muted)] border border-[var(--color-border-emphasized)]"
                            : "hover:bg-[var(--color-background-muted)]/70 border border-transparent"
                        }`}
                      >
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-center gap-2 min-w-0">
                            {opt.dotTone && <StatusDot tone={opt.dotTone} />}
                            <span
                              className={`text-[14.5px] leading-snug ${
                                isSelected
                                  ? "font-semibold text-[var(--color-text-primary)]"
                                  : "font-medium text-[var(--color-text-primary)]"
                              }`}
                            >
                              {opt.label}
                            </span>
                          </div>
                          {opt.sublabel && (
                            <p className="text-[12.5px] text-[var(--color-text-secondary)]">
                              {opt.sublabel}
                            </p>
                          )}
                        </div>
                        {isSelected && (
                          <Check className="w-5 h-5 text-[var(--color-text-primary)] shrink-0" />
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

