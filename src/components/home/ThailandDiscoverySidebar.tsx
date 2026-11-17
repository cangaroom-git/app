"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Check,
  MapPin,
  RotateCcw,
  Search,
  Star,
  X,
} from "lucide-react";
import {
  STAY_STYLE_CATEGORIES,
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

  const displayedProvinces =
    showAllProvinces || provinceSearch.trim().length > 0 || selectedRegion !== "all"
      ? filteredProvinces
      : filteredProvinces.slice(0, 12);

  const activeProvinceObj = selectedProvinceId
    ? THAILAND_77_PROVINCES.find((p) => p.id === selectedProvinceId) ?? null
    : null;

  const hasAnyFilter =
    Boolean(selectedProvinceId) || selectedStyles.length > 0;

  return (
    <aside className="space-y-6 select-none">
      {/* =====================================================================
          1. FASTWORK-STYLE STAY CATEGORY CARDS (Cross-Filter: Mountain, Sea, Bars, Pool Villas...)
      ====================================================================== */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="ty-subtitle font-bold">
            {language === "th" ? "สไตล์ที่พัก" : "Stay Styles"}
          </h2>

          {hasAnyFilter ? (
            <button
              type="button"
              onClick={onResetAllFilters}
              className="inline-flex items-center gap-1 ty-caption font-semibold text-[var(--color-promo)] hover:underline cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>
                {language === "th" ? "ล้างตัวกรอง" : "Reset filters"}
              </span>
            </button>
          ) : (
            <span className="ty-caption font-medium">
              {language === "th" ? "เลือกผสมได้หลายแบบ" : "Multi-select"}
            </span>
          )}
        </div>

        <div className="space-y-2.5">
          {STAY_STYLE_CATEGORIES.map((cat) => {
            const isSelected = selectedStyles.includes(cat.id);
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onToggleStyle(cat.id)}
                className={`w-full text-left rounded-[16px] border p-2.5 flex items-center gap-3.5 transition cursor-pointer ${
                  isSelected
                    ? "border-[var(--color-text-primary)] bg-[var(--color-background-muted)]/60 shadow-2xs"
                    : "border-[var(--color-border)] bg-[var(--color-background-card)] hover:border-[var(--color-border-emphasized)]"
                }`}
              >
                <div className="relative w-[84px] h-[64px] rounded-[12px] overflow-hidden bg-[var(--color-background-muted)] shrink-0">
                  <img
                    src={cat.thumbUrl}
                    alt={cat.titleEn}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                  {isSelected && (
                    <span className="absolute top-1.5 right-1.5 h-5 w-5 rounded-[6px] bg-[#111111] text-white inline-flex items-center justify-center">
                      <Check className="w-3.5 h-3.5" strokeWidth={2.6} />
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="ty-body font-bold text-[var(--color-text-primary)] truncate">
                    {language === "th" ? cat.titleTh : cat.titleEn}
                  </p>
                  <p className="ty-caption truncate">
                    ฿{cat.priceFromThb.toLocaleString()}+ · {cat.countLabel}
                  </p>
                  <p className="ty-caption font-semibold text-[var(--color-text-primary)] flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span>{cat.rating}</span>
                    <span className="font-normal text-[var(--color-text-secondary)] truncate">
                      · {language === "th" ? cat.subtitleTh : cat.subtitleEn}
                    </span>
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* =====================================================================
          2. ALL 77 THAILAND PROVINCES CROSS-FILTER
      ====================================================================== */}
      <section className="rounded-[20px] border border-[var(--color-border)] bg-[var(--color-background-card)] p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="ty-subtitle font-bold flex items-center gap-1.5">
            <MapPin className="w-[18px] h-[18px] text-[var(--color-promo)]" />
            <span>
              {language === "th"
                ? "ค้นหาตามจังหวัด (77)"
                : "77 Provinces of Thailand"}
            </span>
          </h2>

          {activeProvinceObj && (
            <button
              type="button"
              onClick={() => onSelectProvince(null)}
              className="inline-flex items-center gap-1 rounded-[10px] bg-[#111111] text-white px-2.5 py-1 ty-caption !text-white font-semibold cursor-pointer"
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

        {/* Search Input across 77 Provinces */}
        <div className="h-10 rounded-[12px] bg-[var(--color-background-muted)] px-3 flex items-center gap-2">
          <Search className="w-4 h-4 text-[var(--color-text-secondary)] shrink-0" />
          <input
            type="text"
            value={provinceSearch}
            onChange={(e) => setProvinceSearch(e.target.value)}
            placeholder={
              language === "th"
                ? "พิมพ์ชื่อจังหวัด เช่น น่าน, ภูเก็ต, เชียงใหม่..."
                : "Filter province (e.g. Phuket, Nan, Chiang Mai)..."
            }
            className="flex-1 min-w-0 bg-transparent ty-caption text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none"
          />
          {provinceSearch && (
            <button
              type="button"
              onClick={() => setProvinceSearch("")}
              className="text-[var(--color-text-secondary)] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Region Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          {THAILAND_REGIONS.map((reg) => {
            const isRegActive = selectedRegion === reg.id;
            return (
              <button
                key={reg.id}
                type="button"
                onClick={() => setSelectedRegion(reg.id)}
                className={`h-7 px-2.5 rounded-[10px] ty-caption font-semibold whitespace-nowrap transition cursor-pointer ${
                  isRegActive
                    ? "bg-[#111111] !text-white"
                    : "bg-[var(--color-background-muted)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                {language === "th" ? reg.labelTh : reg.labelEn}
              </button>
            );
          })}
        </div>

        {/* Province Pills Grid */}
        <div className="max-h-[240px] overflow-y-auto pr-1 flex flex-wrap gap-1.5">
          {displayedProvinces.map((prov) => {
            const isSelected = selectedProvinceId === prov.id;
            return (
              <button
                key={prov.id}
                type="button"
                onClick={() =>
                  onSelectProvince(isSelected ? null : prov.id)
                }
                className={`h-8 px-3 rounded-[10px] ty-caption font-medium inline-flex items-center gap-1 transition cursor-pointer ${
                  isSelected
                    ? "bg-[var(--color-promo)] !text-white font-semibold"
                    : "bg-[var(--color-background-muted)] text-[var(--color-text-primary)] hover:bg-[var(--color-background-subtle)]"
                }`}
              >
                <span>
                  {language === "th" ? prov.nameTh : prov.nameEn}
                </span>
              </button>
            );
          })}
        </div>

        {!provinceSearch &&
          selectedRegion === "all" &&
          filteredProvinces.length > 12 && (
            <button
              type="button"
              onClick={() => setShowAllProvinces((v) => !v)}
              className="w-full h-9 rounded-[12px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] ty-caption font-semibold text-[var(--color-text-primary)] transition cursor-pointer"
            >
              {showAllProvinces
                ? language === "th"
                  ? "ย่อรายชื่อจังหวัด"
                  : "Show top provinces"
                : language === "th"
                ? `ดูครบทั้ง 77 จังหวัด`
                : `Show all 77 provinces`}
            </button>
          )}
      </section>

      {/* =====================================================================
          3. PARTNER HOTEL ONBOARDING CARD
      ====================================================================== */}
      <div className="rounded-[20px] border border-[var(--color-border)] bg-[var(--color-background-muted)]/60 p-4 space-y-2.5">
        <div className="flex items-center gap-2.5">
          <span className="h-9 w-9 rounded-[12px] bg-[var(--color-promo)] text-white inline-flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <p className="ty-body font-bold leading-snug">
              {language === "th"
                ? "คุณเป็นเจ้าของที่พักใช่ไหม?"
                : "Own a Hotel or Villa?"}
            </p>
            <p className="ty-caption">
              {language === "th"
                ? "ลงรูปและวิดีโอที่พักของคุณฟรี 30 วัน รับจองตรงไม่หักค่าคอมมิชชั่น"
                : "List your property photos & videos free for 30 days."}
            </p>
          </div>
        </div>

        <Link
          href="/register-hotel"
          className="w-full h-10 rounded-[12px] bg-[#111111] hover:opacity-90 !text-white ty-body font-semibold inline-flex items-center justify-center transition"
        >
          {language === "th"
            ? "นำที่พักเข้าร่วมฟรี 30 วัน"
            : "List Your Stay Free"}
        </Link>
      </div>
    </aside>
  );
}
