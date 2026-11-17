"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ChevronDown, MapPin, Search, X } from "lucide-react";
import {
  THAILAND_77_PROVINCES,
  THAILAND_REGIONS,
} from "@/data/thailandProvinces";
import { LanguageCode } from "@/lib/dateFormatters";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";

export interface ProvinceSearchDropdownProps {
  language: LanguageCode;
  selectedProvinceId: string | null;
  onSelectProvince: (provinceId: string | null) => void;
}

export function ProvinceSearchDropdown({
  language,
  selectedProvinceId,
  onSelectProvince,
}: ProvinceSearchDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [query, setQuery] = useState("");
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const checkViewport = () => {
      setIsMobileViewport(window.innerWidth < 1024);
    };
    checkViewport();
    window.addEventListener("resize", checkViewport);
    return () => window.removeEventListener("resize", checkViewport);
  }, []);

  useBodyScrollLock(isOpen && isMobileViewport);

  useEffect(() => {
    if (!isOpen || isMobileViewport) return;
    const handleOutside = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    window.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      window.removeEventListener("keydown", handleEsc);
    };
  }, [isOpen, isMobileViewport]);

  const activeProvince = useMemo(
    () =>
      selectedProvinceId
        ? THAILAND_77_PROVINCES.find((p) => p.id === selectedProvinceId) ?? null
        : null,
    [selectedProvinceId]
  );

  const popularProvinces = useMemo(
    () => THAILAND_77_PROVINCES.filter((p) => p.isPopular),
    []
  );

  const filteredProvinces = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return THAILAND_77_PROVINCES;
    return THAILAND_77_PROVINCES.filter(
      (p) =>
        p.nameTh.toLowerCase().includes(q) ||
        p.nameEn.toLowerCase().includes(q)
    );
  }, [query]);

  const handlePick = (provinceId: string | null) => {
    onSelectProvince(provinceId);
    setQuery("");
    setIsOpen(false);
  };

  const activeLabel = activeProvince
    ? language === "th"
      ? activeProvince.nameTh.split("(")[0].trim()
      : activeProvince.nameEn
    : language === "th"
    ? "ทุกจังหวัด"
    : "All Provinces";

  return (
    <div ref={wrapperRef} className="relative shrink-0 select-none">
      {/* COMPACT TRIGGER INSIDE SEARCH BAR */}
      <div className="inline-flex items-center h-9 rounded-[12px] bg-[var(--color-background-card)] text-[var(--color-text-primary)] shadow-2xs border border-[var(--color-border)]/70 transition-colors">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          title={
            language === "th"
              ? "กรองตามจังหวัด (ครบ 77 จังหวัด)"
              : "Filter by province (77 provinces)"
          }
          className="h-full px-2.5 sm:px-3 inline-flex items-center gap-1.5 ty-caption font-semibold text-[var(--color-text-primary)] cursor-pointer"
        >
          <MapPin
            className={`w-3.5 h-3.5 shrink-0 ${
              activeProvince
                ? "text-[var(--color-promo)]"
                : "text-[var(--color-text-secondary)]"
            }`}
          />
          <span className="max-w-[84px] sm:max-w-[120px] truncate">
            {activeLabel}
          </span>
          {!activeProvince && (
            <ChevronDown className="w-3.5 h-3.5 text-[var(--color-text-secondary)] shrink-0" />
          )}
        </button>

        {activeProvince && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handlePick(null);
            }}
            aria-label="Clear province"
            className="pr-2.5 pl-0.5 h-full inline-flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* =====================================================================
          DESKTOP DROPDOWN (>= lg): ZERO-SCROLL 77-PROVINCE MEGA GRID
             - 7 columns × 11 rows = All 77 provinces visible at once!
             - 1 single click selects and closes immediately
      ====================================================================== */}
      {isOpen && !isMobileViewport && (
        <div className="hidden lg:block absolute right-0 top-[calc(100%+10px)] z-[85] w-[820px] xl:w-[880px] rounded-[20px] bg-[var(--color-background-popover)] border border-[var(--color-border)] shadow-[0_12px_40px_rgba(0,0,0,0.16)] p-4 space-y-3">
          {/* Top Instant Filter Row */}
          <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-[var(--color-border)]">
            <div className="h-9 flex-1 rounded-[10px] bg-[var(--color-background-muted)] px-3 flex items-center gap-2">
              <Search className="w-4 h-4 text-[var(--color-text-secondary)] shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  language === "th"
                    ? "พิมพ์ค้นหาจังหวัด..."
                    : "Quick filter province..."
                }
                autoFocus
                className="flex-1 min-w-0 bg-transparent ty-caption text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {selectedProvinceId && (
              <button
                type="button"
                onClick={() => handlePick(null)}
                className="h-9 px-3 rounded-[10px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] ty-caption font-semibold text-[var(--color-text-primary)] shrink-0 cursor-pointer transition-colors"
              >
                {language === "th" ? "ล้างจังหวัด" : "Clear"}
              </button>
            )}
          </div>

          {/* All 77 Provinces in a Compact 7-Column Grid (Zero Scroll!) */}
          {filteredProvinces.length === 0 ? (
            <p className="py-6 text-center ty-caption">
              {language === "th"
                ? "ไม่พบชื่อจังหวัดที่ค้นหา"
                : "No matching province"}
            </p>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {filteredProvinces.map((prov) => {
                const isSelected = selectedProvinceId === prov.id;
                const shortTh = prov.nameTh.split("(")[0].trim();
                return (
                  <button
                    key={prov.id}
                    type="button"
                    onClick={() => handlePick(isSelected ? null : prov.id)}
                    className={`h-[31px] px-2 rounded-[8px] text-left truncate transition-colors cursor-pointer flex items-center justify-between gap-1 ${
                      isSelected
                        ? "bg-[#111111] dark:bg-[#f5f5f5] !text-white dark:!text-[#111111] font-semibold"
                        : "hover:bg-[var(--color-background-muted)] text-[var(--color-text-primary)]"
                    }`}
                  >
                    <span
                      className={`text-[13px] truncate ${
                        isSelected
                          ? "!text-white dark:!text-[#111111] font-semibold"
                          : prov.isPopular
                          ? "font-semibold text-[var(--color-text-primary)]"
                          : "font-normal text-[var(--color-text-primary)]"
                      }`}
                    >
                      {language === "th" ? shortTh : prov.nameEn}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          MOBILE / TABLET (< lg): FULL-SCREEN 1-TAP PROVINCE MODAL
      ====================================================================== */}
      {isOpen && isMobileViewport && (
        <div
          role="dialog"
          aria-modal="true"
          className="lg:hidden fixed inset-0 z-[95] bg-[var(--color-background-body)] flex flex-col"
        >
          {/* Sticky Top Search Header */}
          <div className="px-4 pt-3 pb-3 border-b border-[var(--color-border)] flex items-center gap-2.5 bg-[var(--color-background-card)]">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close"
              className="h-10 w-10 rounded-[12px] bg-[var(--color-background-muted)] flex items-center justify-center shrink-0 cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="flex-1 h-10 rounded-[12px] bg-[var(--color-background-muted)] px-3 flex items-center gap-2">
              <Search className="w-4 h-4 text-[var(--color-text-secondary)] shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  language === "th"
                    ? "พิมพ์ค้นหาจังหวัด..."
                    : "Search 77 provinces..."
                }
                autoFocus
                className="flex-1 min-w-0 bg-transparent ty-body text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="text-[var(--color-text-secondary)] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => handlePick(null)}
              className="h-10 px-3 rounded-[12px] bg-[var(--color-background-muted)] ty-caption font-semibold text-[var(--color-text-primary)] shrink-0 cursor-pointer"
            >
              {language === "th" ? "ทุกจังหวัด" : "All"}
            </button>
          </div>

          {/* Scrollable Full-Screen Body */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 pb-10">
            {!query.trim() && (
              <div className="space-y-2">
                <p className="ty-caption font-bold text-[var(--color-text-secondary)]">
                  {language === "th" ? "จังหวัดยอดนิยม" : "Popular Destinations"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {popularProvinces.map((pop) => {
                    const isSelected = selectedProvinceId === pop.id;
                    return (
                      <button
                        key={`mpop-${pop.id}`}
                        type="button"
                        onClick={() => handlePick(isSelected ? null : pop.id)}
                        className={`h-9 px-3.5 rounded-[12px] ty-body font-semibold cursor-pointer ${
                          isSelected
                            ? "bg-[#2067da] !text-white"
                            : "bg-[var(--color-background-muted)] text-[var(--color-text-primary)]"
                        }`}
                      >
                        <span className={isSelected ? "!text-white" : ""}>
                          {language === "th" ? pop.nameTh : pop.nameEn}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {query.trim() ? (
              <div className="grid grid-cols-2 gap-2">
                {filteredProvinces.map((prov) => {
                  const isSelected = selectedProvinceId === prov.id;
                  return (
                    <button
                      key={prov.id}
                      type="button"
                      onClick={() => handlePick(isSelected ? null : prov.id)}
                      className={`h-11 px-3.5 rounded-[12px] text-left ty-body font-medium truncate cursor-pointer ${
                        isSelected
                          ? "bg-[#2067da] !text-white font-semibold"
                          : "bg-[var(--color-background-muted)]/60 text-[var(--color-text-primary)]"
                      }`}
                    >
                      <span className={isSelected ? "!text-white" : ""}>
                        {language === "th" ? prov.nameTh : prov.nameEn}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              THAILAND_REGIONS.filter((r) => r.id !== "all").map((reg) => {
                const regionItems = THAILAND_77_PROVINCES.filter(
                  (p) => p.region === reg.id
                );
                return (
                  <div key={reg.id} className="space-y-2">
                    <p className="ty-caption font-bold text-[var(--color-text-secondary)]">
                      {language === "th" ? reg.labelTh : reg.labelEn}
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {regionItems.map((prov) => {
                        const isSelected = selectedProvinceId === prov.id;
                        const shortTh = prov.nameTh.split("(")[0].trim();
                        return (
                          <button
                            key={prov.id}
                            type="button"
                            onClick={() =>
                              handlePick(isSelected ? null : prov.id)
                            }
                            className={`h-11 px-3.5 rounded-[12px] text-left ty-body truncate cursor-pointer ${
                              isSelected
                                ? "bg-[#2067da] !text-white font-semibold"
                                : "bg-[var(--color-background-muted)]/55 text-[var(--color-text-primary)]"
                            }`}
                          >
                            <span className={isSelected ? "!text-white" : ""}>
                              {language === "th" ? shortTh : prov.nameEn}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
