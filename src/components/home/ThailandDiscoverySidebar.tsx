"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  Bath,
  Check,
  ChevronDown,
  ChevronUp,
  Mountain,
  RotateCcw,
  Search,
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

export interface ThailandDiscoverySidebarProps {
  language: LanguageCode;
  selectedProvinceId: string | null;
  onSelectProvince: (provinceId: string | null) => void;
  selectedStyles: StayStyleTag[];
  onToggleStyle: (style: StayStyleTag) => void;
  onResetAllFilters: () => void;
}

const MINIMAL_STAY_STYLES: ReadonlyArray<{
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

export function ThailandDiscoverySidebar({
  language,
  selectedProvinceId,
  onSelectProvince,
  selectedStyles,
  onToggleStyle,
  onResetAllFilters,
}: ThailandDiscoverySidebarProps) {
  const [provinceSearch, setProvinceSearch] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<
    "all" | ThailandRegionId
  >("all");
  const [showAllProvinces, setShowAllProvinces] = useState(false);

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

  const isExpandedList =
    showAllProvinces ||
    provinceSearch.trim().length > 0 ||
    selectedRegion !== "all";

  const displayedProvinces = isExpandedList
    ? filteredProvinces
    : filteredProvinces.slice(0, 8);

  const activeProvinceObj = selectedProvinceId
    ? THAILAND_77_PROVINCES.find((p) => p.id === selectedProvinceId) ?? null
    : null;

  const hasAnyFilter =
    Boolean(selectedProvinceId) || selectedStyles.length > 0;

  return (
    <aside className="space-y-6 select-none lg:pl-2">
      {/* =====================================================================
          1. MINIMAL STAY STYLE CROSS-FILTER
      ====================================================================== */}
      <section className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-[13px] font-semibold tracking-tight text-[var(--color-text-secondary)]">
            {language === "th" ? "สไตล์ที่พัก" : "Stay Style"}
          </h2>

          {hasAnyFilter && (
            <button
              type="button"
              onClick={onResetAllFilters}
              className="inline-flex items-center gap-1 text-[12px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{language === "th" ? "ล้างค่า" : "Reset"}</span>
            </button>
          )}
        </div>

        <div className="space-y-0.5">
          {MINIMAL_STAY_STYLES.map(({ id, labelTh, labelEn, Icon }) => {
            const isSelected = selectedStyles.includes(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => onToggleStyle(id)}
                className={`w-full h-10 px-3 rounded-[12px] flex items-center justify-between gap-2.5 text-left transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-[var(--color-text-primary)] text-[var(--color-background-card)] font-semibold"
                    : "text-[var(--color-text-primary)] hover:bg-[var(--color-background-muted)] font-normal"
                }`}
              >
                <span className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`w-[18px] h-[18px] shrink-0 ${
                      isSelected
                        ? "text-[var(--color-background-card)]"
                        : "text-[var(--color-text-secondary)]"
                    }`}
                    strokeWidth={isSelected ? 2.2 : 1.8}
                  />
                  <span className="text-[14px] truncate">
                    {language === "th" ? labelTh : labelEn}
                  </span>
                </span>

                {isSelected && (
                  <Check className="w-4 h-4 shrink-0" strokeWidth={2.4} />
                )}
              </button>
            );
          })}
        </div>
      </section>

      <div className="border-t border-[var(--color-border)]" />

      {/* =====================================================================
          2. MINIMAL 77 PROVINCES FILTER
      ====================================================================== */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-[13px] font-semibold tracking-tight text-[var(--color-text-secondary)]">
            {language === "th" ? "จังหวัด (77)" : "Provinces (77)"}
          </h2>

          {activeProvinceObj && (
            <button
              type="button"
              onClick={() => onSelectProvince(null)}
              className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--color-text-primary)] hover:opacity-75 cursor-pointer"
            >
              <span>
                {language === "th"
                  ? activeProvinceObj.nameTh.split("(")[0].trim()
                  : activeProvinceObj.nameEn}
              </span>
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Minimal Search Input */}
        <div className="h-9 rounded-[10px] bg-[var(--color-background-muted)] px-3 flex items-center gap-2">
          <Search className="w-3.5 h-3.5 text-[var(--color-text-secondary)] shrink-0" />
          <input
            type="text"
            value={provinceSearch}
            onChange={(e) => setProvinceSearch(e.target.value)}
            placeholder={
              language === "th" ? "ค้นหาจังหวัด..." : "Search province..."
            }
            className="flex-1 min-w-0 bg-transparent text-[13px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none"
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

        {/* Quiet Region Tabs (Shown only when expanded or filtering) */}
        {isExpandedList && (
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5">
            {THAILAND_REGIONS.map((reg) => {
              const isRegActive = selectedRegion === reg.id;
              return (
                <button
                  key={reg.id}
                  type="button"
                  onClick={() => setSelectedRegion(reg.id)}
                  className={`h-7 px-2.5 rounded-[8px] text-[12px] whitespace-nowrap transition-colors cursor-pointer ${
                    isRegActive
                      ? "bg-[var(--color-text-primary)] text-[var(--color-background-card)] font-semibold"
                      : "text-[var(--color-text-secondary)] hover:bg-[var(--color-background-muted)] hover:text-[var(--color-text-primary)]"
                  }`}
                >
                  {language === "th" ? reg.labelTh : reg.labelEn}
                </button>
              );
            })}
          </div>
        )}

        {/* Clean Minimal Province Chips */}
        <div
          className={`${
            isExpandedList ? "max-h-[260px] overflow-y-auto pr-1" : ""
          } flex flex-wrap gap-1.5`}
        >
          {displayedProvinces.map((prov) => {
            const isSelected = selectedProvinceId === prov.id;
            const shortTh = prov.nameTh.split("(")[0].trim();
            return (
              <button
                key={prov.id}
                type="button"
                onClick={() => onSelectProvince(isSelected ? null : prov.id)}
                className={`h-8 px-3 rounded-[10px] text-[13px] transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-[var(--color-text-primary)] text-[var(--color-background-card)] font-semibold"
                    : "bg-[var(--color-background-muted)]/75 hover:bg-[var(--color-background-muted)] text-[var(--color-text-primary)]"
                }`}
              >
                {language === "th" ? shortTh : prov.nameEn}
              </button>
            );
          })}
        </div>

        {/* Quiet Toggle for All 77 Provinces */}
        {!provinceSearch && selectedRegion === "all" && (
          <button
            type="button"
            onClick={() => setShowAllProvinces((v) => !v)}
            className="px-1 inline-flex items-center gap-1 text-[12px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
          >
            <span>
              {showAllProvinces
                ? language === "th"
                  ? "แสดงเฉพาะจังหวัดยอดนิยม"
                  : "Show popular provinces"
                : language === "th"
                ? "ดูครบทั้ง 77 จังหวัด"
                : "View all 77 provinces"}
            </span>
            {showAllProvinces ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        )}
      </section>

      <div className="border-t border-[var(--color-border)] pt-4 px-1">
        <Link
          href="/register-hotel"
          className="text-[12px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          {language === "th"
            ? "สำหรับเจ้าของที่พัก · ลงที่พักฟรี 30 วัน →"
            : "For property owners · List free for 30 days →"}
        </Link>
      </div>
    </aside>
  );
}
