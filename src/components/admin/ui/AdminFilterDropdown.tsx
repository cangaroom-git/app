"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search, X } from "lucide-react";
import { useModalPresence } from "@/lib/useModalPresence";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";

export interface AdminFilterOption {
  label: string;
  value: string;
}

interface AdminFilterDropdownProps {
  label: string;
  options: AdminFilterOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  multiple?: boolean;
  showSearch?: boolean;
}

/**
 * 1:1 WeGlobal Pill FilterDropdown
 * - White rounded-full pill trigger (`border-gray-200 text-gray-600 text-xs font-medium`)
 * - Active selection turns calm blue (`bg-blue-100 text-blue-700 border-blue-200`) with count & clear X
 * - Portal desktop dropdown + mobile slide-up bottom sheet
 */
export function AdminFilterDropdown({
  label,
  options,
  selected,
  onChange,
  multiple = false,
  showSearch = false,
}: AdminFilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isMobileView, setIsMobileView] = useState(false);
  const mobilePresence = useModalPresence(isOpen && isMobileView, 250);
  useBodyScrollLock(mobilePresence.shouldRender);
  const [dropdownRect, setDropdownRect] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const check = () => setIsMobileView(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (isOpen && triggerRef.current && !isMobileView) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownRect({
        top: rect.bottom + 4,
        left: Math.min(rect.left, window.innerWidth - 236),
        width: Math.max(rect.width, 210),
      });
    } else if (!isOpen) {
      setDropdownRect(null);
      setSearchTerm("");
    }
  }, [isOpen, isMobileView]);

  useEffect(() => {
    if (!isOpen || isMobileView) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        panelRef.current &&
        !panelRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, isMobileView]);

  const filteredOptions = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, searchTerm]);

  const hasSelection = selected.length > 0;
  const activeSingleLabel =
    !multiple && selected.length === 1
      ? options.find((o) => o.value === selected[0])?.label
      : null;

  const handleToggle = (value: string) => {
    if (multiple) {
      if (selected.includes(value)) {
        onChange(selected.filter((v) => v !== value));
      } else {
        onChange([...selected, value]);
      }
    } else {
      if (selected.includes(value)) {
        onChange([]);
      } else {
        onChange([value]);
      }
      setIsOpen(false);
    }
  };

  return (
    <div ref={triggerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className={`h-9 inline-flex items-center gap-1.5 px-3 rounded-full ws-caption-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
          hasSelection
            ? "bg-[var(--color-accent-muted)] !text-[var(--color-accent)] border-[var(--color-accent)]/30 hover:bg-[var(--color-accent)]/12"
            : "bg-[var(--color-background-card)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:bg-[var(--color-background-muted)] hover:text-[var(--color-text-primary)]"
        }`}
      >
        <span>{activeSingleLabel || label}</span>
        {multiple && hasSelection && (
          <span className="bg-[var(--color-accent)] text-white ws-badge px-1.5 py-0.5 rounded-full leading-none">
            {selected.length}
          </span>
        )}
        {hasSelection ? (
          <X
            size={12}
            className="text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]"
            onClick={(e) => {
              e.stopPropagation();
              onChange([]);
            }}
          />
        ) : (
          <ChevronDown
            size={12}
            className={`text-gray-400 transition-transform duration-150 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        )}
      </button>

      {typeof document !== "undefined" &&
        ((isMobileView && mobilePresence.shouldRender) ||
          (!isMobileView && isOpen && dropdownRect)) &&
        createPortal(
          isMobileView ? (
            <div
              data-state={mobilePresence.dataState}
              className="fixed inset-0 z-[95] bg-black/48 flex items-end justify-center cgr-modal-backdrop"
              onClick={() => setIsOpen(false)}
            >
              <div
                ref={panelRef}
                data-state={mobilePresence.dataState}
                onClick={(e) => e.stopPropagation()}
                className="w-full bg-[var(--color-background-popover)] border-t border-[var(--color-border)] rounded-t-[24px] shadow-[var(--shadow-popover)] max-h-[75dvh] flex flex-col overflow-hidden pb-[max(20px,env(safe-area-inset-bottom))] cgr-modal-surface-md"
              >
                <div className="mx-auto mt-3 mb-1 h-1 w-10 rounded-full bg-[var(--color-border-emphasized)] shrink-0" />
                <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-border)] shrink-0">
                  <span className="text-[16px] font-semibold text-[var(--color-text-primary)]">
                    {label}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    aria-label="ปิด"
                    className="h-9 w-9 rounded-[10px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] inline-flex items-center justify-center cursor-pointer transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
                {showSearch && (
                  <div className="px-3 py-2 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                    <Search size={14} className="text-gray-400 shrink-0" />
                    <input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search..."
                      className="w-full text-sm bg-transparent outline-none text-gray-800 placeholder:text-gray-400"
                    />
                  </div>
                )}
                <div className="overflow-y-auto p-2 space-y-0.5">
                  {filteredOptions.map((opt) => {
                    const checked = selected.includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleToggle(opt.value)}
                        className={`w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center gap-2.5 cursor-pointer transition-colors ${
                          checked
                            ? "bg-[var(--color-accent-muted)] text-[var(--color-accent)] font-semibold"
                            : "text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        <span
                          className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                            checked
                              ? "bg-[var(--color-accent)] border-[var(--color-accent)]"
                              : "border-gray-300 bg-white"
                          }`}
                        >
                          {checked && (
                            <span className="w-1.5 h-1.5 rounded-full bg-white" />
                          )}
                        </span>
                        <span className="truncate">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div
              ref={panelRef}
              style={{
                top: dropdownRect!.top,
                left: dropdownRect!.left,
                minWidth: dropdownRect!.width,
              }}
              className="fixed z-[95] bg-white border border-gray-200 rounded-xl shadow-[var(--shadow-popover)] overflow-hidden max-w-[280px]"
            >
              {showSearch && (
                <div className="p-2 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                  <Search size={13} className="text-gray-400 shrink-0" />
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search..."
                    autoFocus
                    className="w-full text-xs bg-transparent outline-none text-gray-800 placeholder:text-gray-400"
                  />
                </div>
              )}
              <div className="max-h-[300px] overflow-y-auto p-1">
                {filteredOptions.length === 0 ? (
                  <p className="px-3 py-4 text-center text-xs text-gray-400">
                    No results found
                  </p>
                ) : (
                  filteredOptions.map((opt) => {
                    const checked = selected.includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleToggle(opt.value)}
                        className={`w-full text-left px-3 py-2 text-xs rounded-lg flex items-center gap-2 cursor-pointer transition-colors ${
                          checked
                            ? "bg-[var(--color-accent-muted)] text-[var(--color-accent)] font-semibold"
                            : "text-gray-700 hover:bg-gray-50 font-medium"
                        }`}
                      >
                        <span
                          className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                            checked
                              ? "bg-[var(--color-accent)] border-[var(--color-accent)]"
                              : "border-gray-300 bg-white"
                          }`}
                        >
                          {checked && (
                            <svg
                              width="8"
                              height="6"
                              viewBox="0 0 8 6"
                              fill="none"
                            >
                              <path
                                d="M1 3L3 5L7 1"
                                stroke="white"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </span>
                        <span className="truncate">{opt.label}</span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          ),
          document.body,
        )}
    </div>
  );
}
