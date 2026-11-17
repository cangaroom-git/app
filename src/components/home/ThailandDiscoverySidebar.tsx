"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Bath,
  Check,
  ChevronDown,
  MapPin,
  Mountain,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Tent,
  Waves,
  Wine,
  X,
} from "lucide-react";
import {
  StayStyleTag,
  THAILAND_77_PROVINCES,
  THAILAND_REGIONS,
  ThailandRegionId,
} from "@/data/thailandProvinces";
import { LanguageCode } from "@/lib/dateFormatters";

export interface ThailandTopFilterBarProps {
  language: LanguageCode;
  selectedProvinceId: string | null;
  onSelectProvince: (provinceId: string | null) => void;
  selectedStyles: StayStyleTag[];
  onToggleStyle: (style: StayStyleTag) => void;
  onResetAllFilters: () => void;
  resultCount?: number;
}

const STAY_STYLE_OPTIONS: ReadonlyArray<{
  id: StayStyleTag;
  labelTh: string;
  labelEn: string;
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}> = [
  {
    id: "mountain",
    labelTh: "ภูเขา & ทะเลหมอก",
    labelEn: "Mountain & Mist",
    Icon: Mountain,
  },
  {
    id: "pool-villa",
    labelTh: "พูลวิลล่าส่วนตัว",
    labelEn: "Pool Villas",
    Icon: Sparkles,
  },
  {
    id: "sea",
    labelTh: "ติดทะเล & ชายหาด",
    labelEn: "Sea & Beachfront",
    Icon: Waves,
  },
  {
    id: "bars",
    labelTh: "บาร์ & รูฟท็อป",
    labelEn: "Bars & Rooftop",
    Icon: Wine,
  },
  {
    id: "bathtub",
    labelTh: "อ่างแช่น้ำ & ออนเซ็น",
    labelEn: "Onsen & Bathtub",
    Icon: Bath,
  },
  {
    id: "glamping",
    labelTh: "แกลมปิ้ง & เคบิน",
    labelEn: "Glamping & Cabin",
    Icon: Tent,
  },
];

export function ThailandTopFilterBar({
  language,
  selectedProvinceId,
  onSelectProvince,
  selectedStyles,
  onToggleStyle,
  onResetAllFilters,
  resultCount,
}: ThailandTopFilterBarProps) {
  const [openMenu, setOpenMenu] = useState<"province" | "style" | null>(null);
  const [provinceSearch, setProvinceSearch] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<
    "all" | ThailandRegionId
  >("all");
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!openMenu) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpenMenu(null);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMenu(null);
    };
    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEsc);
    };
  }, [openMenu]);

  const filteredProvinces = useMemo(() => {
    const q = provinceSearch.trim().toLowerCase();
    return THAILAND_77_PROVINCES.filter((prov) => {
      if (selectedRegion !== "all" && prov.region !== selectedRegion) {
        return false;
      }
      if (!q) return true;
      return (
        prov.nameTh.toLowerCase().includes(q) ||
        prov.nameEn.toLowerCase().includes(q)
      );
    });
  }, [provinceSearch, selectedRegion]);

  const activeProvinceObj = selectedProvinceId
    ? THAILAND_77_PROVINCES.find((p) => p.id === selectedProvinceId) ?? null
    : null;

  const hasAnyFilter =
    Boolean(selectedProvinceId) || selectedStyles.length > 0;

  return (
    <div
      ref={containerRef}
      className="relative flex items-center gap-2 shrink-0 select-none"
    >
      {/* 1. COMPACT PROVINCE DROPDOWN TRIGGER (All 77 Provinces) */}
      <div className="relative">
        <button
          type="button"
          onClick={() =>
            setOpenMenu((prev) => (prev === "province" ? null : "province"))
          }
          className={`h-9 px-3 rounded-[12px] inline-flex items-center gap-1.5 ty-caption font-semibold transition-colors cursor-pointer ${
            activeProvinceObj
              ? "bg-[#111111] !text-white"
              : openMenu === "province"
              ? "bg-[var(--color-background-subtle)] text-[var(--color-text-primary)]"
              : "bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)]"
          }`}
        >
          <MapPin
            className={`w-3.5 h-3.5 shrink-0 ${
              activeProvinceObj
                ? "!text-white"
                : "text-[var(--color-text-secondary)]"
            }`}
          />
          <span className={activeProvinceObj ? "!text-white" : ""}>
            {activeProvinceObj
              ? language === "th"
                ? activeProvinceObj.nameTh.split("(")[0].trim()
                : activeProvinceObj.nameEn
              : language === "th"
              ? "จังหวัด (77)"
              : "Provinces (77)"}
          </span>
          <ChevronDown
            className={`w-3.5 h-3.5 shrink-0 ${
              activeProvinceObj ? "!text-white" : ""
            }`}
          />
        </button>

        {openMenu === "province" && (
          <div className="absolute right-0 top-[calc(100%+8px)] z-40 w-[320px] sm:w-[360px] rounded-[18px] bg-[var(--color-background-popover)] border border-[var(--color-border)] shadow-[var(--shadow-popover)] p-3.5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="ty-caption font-bold text-[var(--color-text-primary)]">
                {language === "th"
                  ? "เลือกจังหวัดในประเทศไทย (ครบ 77 จังหวัด)"
                  : "Filter by Thailand Province (77)"}
              </span>
              {activeProvinceObj && (
                <button
                  type="button"
                  onClick={() => {
                    onSelectProvince(null);
                    setOpenMenu(null);
                  }}
                  className="ty-caption font-semibold text-[var(--color-promo)] hover:underline cursor-pointer"
                >
                  {language === "th" ? "ดูทุกจังหวัด" : "All provinces"}
                </button>
              )}
            </div>

            {/* Search Input */}
            <div className="h-9 rounded-[10px] bg-[var(--color-background-muted)] px-3 flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-[var(--color-text-secondary)] shrink-0" />
              <input
                type="text"
                value={provinceSearch}
                onChange={(e) => setProvinceSearch(e.target.value)}
                placeholder={
                  language === "th"
                    ? "พิมพ์ค้นหาจังหวัด เช่น น่าน, ภูเก็ต, เชียงใหม่..."
                    : "Search province..."
                }
                autoFocus
                className="flex-1 min-w-0 bg-transparent ty-caption text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none"
              />
              {provinceSearch && (
                <button
                  type="button"
                  onClick={() => setProvinceSearch("")}
                  className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Region Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5">
              {THAILAND_REGIONS.map((reg) => {
                const isRegActive = selectedRegion === reg.id;
                return (
                  <button
                    key={reg.id}
                    type="button"
                    onClick={() => setSelectedRegion(reg.id)}
                    className={`h-7 px-2.5 rounded-[8px] ty-caption font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                      isRegActive
                        ? "bg-[#111111] !text-white"
                        : "text-[var(--color-text-secondary)] hover:bg-[var(--color-background-muted)] hover:text-[var(--color-text-primary)]"
                    }`}
                  >
                    <span className={isRegActive ? "!text-white" : ""}>
                      {language === "th" ? reg.labelTh : reg.labelEn}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* 77 Provinces Grid */}
            <div className="max-h-[240px] overflow-y-auto pr-1 flex flex-wrap gap-1.5">
              {filteredProvinces.map((prov) => {
                const isSelected = selectedProvinceId === prov.id;
                const shortTh = prov.nameTh.split("(")[0].trim();
                return (
                  <button
                    key={prov.id}
                    type="button"
                    onClick={() => {
                      onSelectProvince(isSelected ? null : prov.id);
                      setOpenMenu(null);
                    }}
                    className={`h-8 px-2.5 rounded-[9px] ty-caption font-medium transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-[var(--color-promo)] !text-white font-semibold"
                        : "bg-[var(--color-background-muted)]/80 hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)]"
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
        )}
      </div>

      {/* 2. COMPACT STAY STYLE MULTI-SELECT DROPDOWN TRIGGER */}
      <div className="relative">
        <button
          type="button"
          onClick={() =>
            setOpenMenu((prev) => (prev === "style" ? null : "style"))
          }
          className={`h-9 px-3 rounded-[12px] inline-flex items-center gap-1.5 ty-caption font-semibold transition-colors cursor-pointer ${
            selectedStyles.length > 0
              ? "bg-[#111111] !text-white"
              : openMenu === "style"
              ? "bg-[var(--color-background-subtle)] text-[var(--color-text-primary)]"
              : "bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)]"
          }`}
        >
          <SlidersHorizontal
            className={`w-3.5 h-3.5 shrink-0 ${
              selectedStyles.length > 0
                ? "!text-white"
                : "text-[var(--color-text-secondary)]"
            }`}
          />
          <span className={selectedStyles.length > 0 ? "!text-white" : ""}>
            {selectedStyles.length > 0
              ? language === "th"
                ? `สไตล์ที่พัก (${selectedStyles.length})`
                : `Style (${selectedStyles.length})`
              : language === "th"
              ? "สไตล์ที่พัก"
              : "Stay Style"}
          </span>
          <ChevronDown
            className={`w-3.5 h-3.5 shrink-0 ${
              selectedStyles.length > 0 ? "!text-white" : ""
            }`}
          />
        </button>

        {openMenu === "style" && (
          <div className="absolute right-0 top-[calc(100%+8px)] z-40 w-[264px] rounded-[18px] bg-[var(--color-background-popover)] border border-[var(--color-border)] shadow-[var(--shadow-popover)] p-2.5 space-y-1">
            <div className="flex items-center justify-between px-2 py-1">
              <span className="ty-caption font-bold text-[var(--color-text-primary)]">
                {language === "th"
                  ? "เลือกผสมได้หลายสไตล์"
                  : "Select Stay Styles"}
              </span>
              {selectedStyles.length > 0 && (
                <button
                  type="button"
                  onClick={onResetAllFilters}
                  className="ty-caption font-semibold text-[var(--color-promo)] hover:underline cursor-pointer"
                >
                  {language === "th" ? "ล้าง" : "Clear"}
                </button>
              )}
            </div>

            {STAY_STYLE_OPTIONS.map(({ id, labelTh, labelEn, Icon }) => {
              const isSelected = selectedStyles.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onToggleStyle(id)}
                  className={`w-full h-10 px-3 rounded-[12px] flex items-center justify-between gap-2.5 text-left transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-[#111111] !text-white font-semibold"
                      : "text-[var(--color-text-primary)] hover:bg-[var(--color-background-muted)]"
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isSelected
                          ? "!text-white"
                          : "text-[var(--color-text-secondary)]"
                      }`}
                      strokeWidth={2}
                    />
                    <span
                      className={`ty-caption truncate ${
                        isSelected
                          ? "!text-white font-semibold"
                          : "text-[var(--color-text-primary)] font-medium"
                      }`}
                    >
                      {language === "th" ? labelTh : labelEn}
                    </span>
                  </span>

                  {isSelected && (
                    <Check
                      className="w-4 h-4 shrink-0 !text-white"
                      strokeWidth={2.5}
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. COMPACT RESET BUTTON (Only when filters active — fixed inline height, never shifts grid!) */}
      {hasAnyFilter && (
        <button
          type="button"
          onClick={onResetAllFilters}
          title={
            language === "th"
              ? `ล้างตัวกรอง (${resultCount ?? 0} รายการ)`
              : `Reset filters (${resultCount ?? 0})`
          }
          className="h-9 px-2.5 rounded-[12px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] inline-flex items-center gap-1 ty-caption font-semibold transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">
            {language === "th" ? "ล้าง" : "Reset"}
          </span>
        </button>
      )}
    </div>
  );
}

export { ThailandTopFilterBar as ThailandDiscoverySidebar };
