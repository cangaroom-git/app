"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  BedDouble,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Moon,
  Percent,
  Plus,
  Repeat,
  Sparkles,
} from "lucide-react";
import { addDaysToDate, formatDateStr } from "@/lib/bookingMath";
import { formatShortDate } from "@/lib/dateFormatters";
import {
  buildDefaultRoomPricesForPct,
  BUILTIN_THAI_SEASON_TEMPLATES,
  computeAnnualPricingGauge,
  countRuleDays,
  findOverlappingSeasonalRules,
  getNextSeasonDateRange,
  parseSeasonalRulesJson,
  type DailyPriceTier,
  type SeasonalRuleRecord,
} from "@/lib/seasonalPricing";
import {
  StandardCheckbox,
  StandardFieldGroup,
  StandardInput,
  StandardSelectField,
  StandardStepperRow,
} from "@/components/ui/standards";
import { StudioDateRangePicker } from "@/components/ui/StudioDateRangePicker";
import { SortableList } from "@/components/ui/SortableList";
import { StudioSheetModal } from "@/components/studio/StudioSheetModal";
import type { StudioPayload } from "@/components/studio/studioTypes";

const DAY_PILLS = [
  { dow: 0, label: "อา" },
  { dow: 1, label: "จ" },
  { dow: 2, label: "อ" },
  { dow: 3, label: "พ" },
  { dow: 4, label: "พฤ" },
  { dow: 5, label: "ศ" },
  { dow: 6, label: "ส" },
];

const TIER_BAR_CLASS: Record<DailyPriceTier, string> = {
  promo: "bg-[#16a34a]",
  normal: "bg-[#e5e5e5] dark:bg-[#333333]",
  high: "bg-[#222222] dark:bg-[#e5e5e5]",
  peak: "bg-[#dc2626]",
};

const TIER_TEXT_CLASS: Record<DailyPriceTier, string> = {
  promo: "text-[#16a34a]",
  normal: "text-[var(--color-text-tertiary)]",
  high: "text-[var(--color-text-primary)]",
  peak: "text-[#dc2626]",
};

const TIER_LABEL_TH: Record<DailyPriceTier, string> = {
  promo: "ลดราคา / โปรโมชั่น",
  normal: "ราคามาตรฐาน",
  high: "ปรับราคาขึ้น",
  peak: "เทศกาล / Peak สูง",
};

export function StudioSeasonalPricingSection({
  data,
  onReload,
  onNotify,
}: {
  data: StudioPayload;
  onReload: () => Promise<void>;
  onNotify: (msg: string) => void;
}) {
  const { hotel, rooms, dateOverrides } = data;
  const todayStr = useMemo(() => formatDateStr(new Date()), []);
  const currentYear = new Date().getFullYear();

  const [isReportOpen, setIsReportOpen] = useState(false);
  const [gaugeYear, setGaugeYear] = useState<number>(currentYear);
  const [gaugeRoomId, setGaugeRoomId] = useState<string>("all");
  const [selectedGaugeMonth, setSelectedGaugeMonth] = useState<number | null>(
    null
  );

  // Optimistic toggle & drag-order state so interactions feel instant
  const [optimisticActive, setOptimisticActive] = useState<
    Record<string, boolean>
  >({});
  const [orderedRuleIds, setOrderedRuleIds] = useState<string[] | null>(null);
  const [togglingRuleId, setTogglingRuleId] = useState<string | null>(null);
  const [deletingRuleId, setDeletingRuleId] = useState<string | null>(null);

  useEffect(() => {
    setOrderedRuleIds(null);
  }, [hotel.seasonalRulesJson]);

  // Merge stored rules from Hotel.seasonalRulesJson with built-in Thai holiday templates
  // Preserves exact user-sorted order from Hotel.seasonalRulesJson + optimistic drag order!
  const allRules = useMemo<SeasonalRuleRecord[]>(() => {
    const saved = parseSeasonalRulesJson(hotel.seasonalRulesJson);
    const savedPresetKeys = new Set(
      saved.map((r) => r.presetKey).filter((k): k is string => Boolean(k))
    );

    const baseList: SeasonalRuleRecord[] = saved.map((r) => ({
      ...r,
      isActive: optimisticActive[r.id] ?? r.isActive,
    }));

    for (const tpl of BUILTIN_THAI_SEASON_TEMPLATES) {
      if (savedPresetKeys.has(tpl.presetKey)) continue;
      const dates = getNextSeasonDateRange(
        tpl.startMonth,
        tpl.startDay,
        tpl.endMonth,
        tpl.endDay
      );
      const id = `tpl-${tpl.presetKey}`;
      baseList.push({
        id,
        presetKey: tpl.presetKey,
        name: tpl.name,
        startDate: dates.startDate,
        endDate: dates.endDate,
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
        minNights: tpl.minNights,
        defaultPct: tpl.defaultPct,
        roomPrices: buildDefaultRoomPricesForPct(rooms, tpl.defaultPct),
        isActive: optimisticActive[id] ?? false,
        repeatAnnually: true,
      });
    }

    if (!orderedRuleIds) return baseList;
    const byId = new Map(baseList.map((r) => [r.id, r]));
    const reordered: SeasonalRuleRecord[] = [];
    for (const id of orderedRuleIds) {
      const found = byId.get(id);
      if (found) reordered.push(found);
    }
    for (const r of baseList) {
      if (!orderedRuleIds.includes(r.id)) reordered.push(r);
    }
    return reordered;
  }, [hotel.seasonalRulesJson, rooms, optimisticActive, orderedRuleIds]);

  const handleReorderRules = async (nextRules: SeasonalRuleRecord[]) => {
    setOrderedRuleIds(nextRules.map((r) => r.id));
    try {
      const res = await fetch("/api/studio/seasonal-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reorder",
          hotelSlug: hotel.slug,
          orderedRules: nextRules,
        }),
      });
      if (!res.ok) {
        setOrderedRuleIds(null);
        onNotify("บันทึกลำดับช่วงราคาไม่สำเร็จ");
        return;
      }
      onNotify("จัดลำดับช่วงราคาเรียบร้อย");
      await onReload();
    } catch {
      setOrderedRuleIds(null);
      onNotify("ไม่สามารถเชื่อมต่อเพื่อบันทึกลำดับช่วงราคาได้");
    }
  };

  // 12-Month Annual Pricing Gauge computation
  const annualGauge = useMemo(
    () =>
      computeAnnualPricingGauge({
        year: gaugeYear,
        rooms,
        selectedRoomId: gaugeRoomId,
        rules: allRules,
        dateOverrides,
      }),
    [gaugeYear, rooms, gaugeRoomId, allRules, dateOverrides]
  );

  const gaugeSummary = useMemo(() => {
    const valid = annualGauge.filter((m) => m.baselineAvgThb > 0);
    if (valid.length === 0) return null;
    const avgYear = Math.round(
      valid.reduce((s, m) => s + m.effectiveAvgThb, 0) / valid.length
    );
    const baselineYear = Math.round(
      valid.reduce((s, m) => s + m.baselineAvgThb, 0) / valid.length
    );
    const peakMonth = [...valid].sort((a, b) => b.diffPct - a.diffPct)[0];
    const promoMonth = [...valid].sort((a, b) => a.diffPct - b.diffPct)[0];
    const maxAbsPct = Math.max(
      25,
      ...valid.map((m) => Math.abs(m.diffPct))
    );
    return { avgYear, baselineYear, peakMonth, promoMonth, maxAbsPct };
  }, [annualGauge]);

  // =========================================================================
  // MODAL EDITOR STATE
  // =========================================================================
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editingPresetKey, setEditingPresetKey] = useState<string | null>(null);
  const [editingIsActive, setEditingIsActive] = useState(true);
  const [seasonName, setSeasonName] = useState("");
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(() => addDaysToDate(todayStr, 6));
  const [repeatAnnually, setRepeatAnnually] = useState(false);
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [minNights, setMinNights] = useState(1);
  const [roomPriceMap, setRoomPriceMap] = useState<Record<string, string>>({});
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const overlappingActiveRules = useMemo(
    () =>
      findOverlappingSeasonalRules(allRules, {
        id: editingRuleId,
        startDate,
        endDate,
        roomIds: selectedRoomIds,
        repeatAnnually,
      }),
    [allRules, editingRuleId, startDate, endDate, selectedRoomIds, repeatAnnually]
  );

  const openEditRuleModal = (rule: SeasonalRuleRecord) => {
    setEditingRuleId(rule.id);
    setEditingPresetKey(rule.presetKey ?? null);
    setEditingIsActive(rule.isActive || true);
    setSeasonName(rule.name);
    setStartDate(rule.startDate);
    setEndDate(rule.endDate);
    setRepeatAnnually(Boolean(rule.repeatAnnually));
    setDaysOfWeek(
      rule.daysOfWeek.length > 0 ? rule.daysOfWeek : [0, 1, 2, 3, 4, 5, 6]
    );
    setMinNights(Math.max(1, rule.minNights || 1));

    const nextMap: Record<string, string> = {};
    const activeIds: string[] = [];
    for (const r of rooms) {
      const savedPrice = rule.roomPrices[r.id];
      if (savedPrice && savedPrice >= 100) {
        nextMap[r.id] = String(savedPrice);
        activeIds.push(r.id);
      } else {
        const base = Math.max(r.weekdayPriceThb, r.weekendPriceThb);
        nextMap[r.id] = String(base);
      }
    }
    setRoomPriceMap(nextMap);
    setSelectedRoomIds(
      activeIds.length > 0 ? activeIds : rooms.map((r) => r.id)
    );
    setIsEditorOpen(true);
  };

  const openCreateNewRuleModal = (prefillStart?: string, prefillEnd?: string, prefillName?: string) => {
    const s = prefillStart ?? todayStr;
    const e = prefillEnd ?? addDaysToDate(s, 6);
    setEditingRuleId(null);
    setEditingPresetKey(null);
    setEditingIsActive(true);
    setSeasonName(prefillName ?? "ช่วงราคาพิเศษ");
    setStartDate(s);
    setEndDate(e);
    setRepeatAnnually(false);
    setDaysOfWeek([0, 1, 2, 3, 4, 5, 6]);
    setMinNights(1);
    const defaultPrices = buildDefaultRoomPricesForPct(rooms, 20);
    const strMap: Record<string, string> = {};
    for (const r of rooms) strMap[r.id] = String(defaultPrices[r.id] ?? r.weekdayPriceThb);
    setRoomPriceMap(strMap);
    setSelectedRoomIds(rooms.map((r) => r.id));
    setIsEditorOpen(true);
  };

  const applyQuickPercent = (pct: number) => {
    const computed = buildDefaultRoomPricesForPct(rooms, pct);
    const next: Record<string, string> = {};
    for (const r of rooms) next[r.id] = String(computed[r.id] ?? r.weekdayPriceThb);
    setRoomPriceMap(next);
  };

  const toggleDayOfWeek = (dow: number) => {
    setDaysOfWeek((prev) =>
      prev.includes(dow)
        ? prev.length > 1
          ? prev.filter((d) => d !== dow)
          : prev
        : [...prev, dow].sort((a, b) => a - b)
    );
  };

  const handleToggleRule = async (rule: SeasonalRuleRecord) => {
    if (rooms.length === 0) {
      onNotify("กรุณาเพิ่มประเภทห้องพักอย่างน้อย 1 ห้องก่อนเปิดใช้งาน");
      return;
    }
    const nextActive = !rule.isActive;
    setOptimisticActive((prev) => ({ ...prev, [rule.id]: nextActive }));
    setTogglingRuleId(rule.id);

    try {
      const res = await fetch("/api/studio/seasonal-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle",
          hotelSlug: hotel.slug,
          ruleId: rule.id,
          isActive: nextActive,
          fallbackRule: rule,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setOptimisticActive((prev) => ({ ...prev, [rule.id]: rule.isActive }));
        onNotify(json.error || "เปลี่ยนสถานะช่วงราคาไม่สำเร็จ");
        return;
      }
      onNotify(
        nextActive
          ? `เปิดใช้งาน "${rule.name}" และซิงก์ลงปฏิทินแล้ว`
          : `ปิดใช้งาน "${rule.name}" ชั่วคราวแล้ว`
      );
      await onReload();
    } catch {
      setOptimisticActive((prev) => ({ ...prev, [rule.id]: rule.isActive }));
      onNotify("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setTogglingRuleId(null);
    }
  };

  const handleSaveRule = async () => {
    if (!seasonName.trim()) {
      onNotify("กรุณาตั้งชื่อช่วงฤดูกาล / เทศกาล");
      return;
    }
    if (!startDate || !endDate || endDate < startDate) {
      onNotify("กรุณาเลือกช่วงวันที่ให้ถูกต้อง");
      return;
    }
    if (selectedRoomIds.length === 0) {
      onNotify("กรุณาเลือกห้องพักอย่างน้อย 1 ห้อง");
      return;
    }

    const roomPrices: Record<string, number> = {};
    for (const rid of selectedRoomIds) {
      const val = Math.round(Number(roomPriceMap[rid]));
      if (!Number.isFinite(val) || val < 100) {
        onNotify("กรุณากรอกราคาห้องพักให้ถูกต้อง (ขั้นต่ำ ฿100)");
        return;
      }
      roomPrices[rid] = val;
    }

    const ruleId =
      editingRuleId ??
      `season-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const payloadRule: SeasonalRuleRecord = {
      id: ruleId,
      presetKey: editingPresetKey,
      name: seasonName.trim(),
      startDate,
      endDate,
      daysOfWeek,
      minNights: Math.max(1, minNights),
      roomPrices,
      isActive: editingIsActive,
      repeatAnnually,
    };

    setIsSaving(true);
    try {
      const res = await fetch("/api/studio/seasonal-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upsert",
          hotelSlug: hotel.slug,
          rule: payloadRule,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        onNotify(json.error || "บันทึกช่วงราคาไม่สำเร็จ");
        return;
      }
      setOptimisticActive((prev) => ({ ...prev, [ruleId]: editingIsActive }));
      setIsEditorOpen(false);
      onNotify(`บันทึก "${payloadRule.name}" และซิงก์ลงปฏิทินแล้ว`);
      await onReload();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRule = async (rule: SeasonalRuleRecord) => {
    setDeletingRuleId(rule.id);
    try {
      const res = await fetch("/api/studio/seasonal-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete",
          hotelSlug: hotel.slug,
          ruleId: rule.id,
        }),
      });
      if (res.ok) {
        onNotify(`ลบช่วงราคา "${rule.name}" และคืนราคาปกติบนปฏิทินแล้ว`);
        await onReload();
      }
    } finally {
      setDeletingRuleId(null);
    }
  };

  const getRulePriceSummary = (rule: SeasonalRuleRecord) => {
    const prices = Object.values(rule.roomPrices).filter((p) => p >= 100);
    if (prices.length === 0) return null;
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    return minP === maxP
      ? `฿${minP.toLocaleString()}`
      : `฿${minP.toLocaleString()} – ฿${maxP.toLocaleString()}`;
  };

  const getRuleDiffPct = (rule: SeasonalRuleRecord): number | null => {
    let baseSum = 0;
    let overrideSum = 0;
    let count = 0;
    for (const r of rooms) {
      const ov = rule.roomPrices[r.id];
      if (!ov) continue;
      const base = Math.round((r.weekdayPriceThb + r.weekendPriceThb) / 2);
      baseSum += base;
      overrideSum += ov;
      count += 1;
    }
    if (count === 0 || baseSum <= 0) return rule.defaultPct ?? null;
    return Math.round(((overrideSum - baseSum) / baseSum) * 100);
  };

  return (
    <div className="space-y-4">
      {/* Unified Clean Header (1:1 Match with Rooms: Secondary Report Button + Primary Action) */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-[var(--color-border)]">
        <h2 className="text-[24px] sm:text-[26px] font-semibold tracking-[-0.02em] text-[var(--color-text-primary)]">
          ราคาตามฤดูกาล & เทศกาล
        </h2>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsReportOpen(true)}
            className="h-10 sm:h-11 px-3.5 sm:px-4 rounded-[12px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[13.5px] font-medium inline-flex items-center gap-2 cursor-pointer transition-colors"
          >
            <BarChart3 className="w-4 h-4" />
            <span>ภาพรวมทั้งปี</span>
          </button>

          <button
            type="button"
            onClick={() => openCreateNewRuleModal()}
            className="h-10 sm:h-11 px-4 sm:px-5 rounded-[12px] bg-[#222222] hover:bg-[#3f3f3f] dark:bg-[#f5f5f5] dark:hover:bg-[#e5e5e5] !text-white dark:!text-[#222222] text-[13.5px] sm:text-[14px] font-semibold inline-flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>สร้างช่วงราคาใหม่</span>
          </button>
        </div>
      </div>

      {/* =====================================================================
          COMPACT HORIZONTAL SEASON LIST (Exact Rooms Style + Drag-to-Sort + 1-Click Toggle!)
          Zero nested tabs!
      ====================================================================== */}
      <SortableList
        items={allRules}
        getId={(rule) => rule.id}
        onReorder={(nextRules) => void handleReorderRules(nextRules)}
        renderItem={(rule, { handle, isOverlay }) => {
          const daysCount = countRuleDays(rule.startDate, rule.endDate);
          const roomCount = Object.keys(rule.roomPrices).length;
          const priceRangeText = getRulePriceSummary(rule);
          const diffPct = getRuleDiffPct(rule);
          const isPromo = diffPct !== null && diffPct < 0;
          const isTemplate = Boolean(rule.presetKey);
          const isToggling = togglingRuleId === rule.id;

          return (
            <article
              role="button"
              tabIndex={isOverlay ? -1 : 0}
              onClick={() => {
                if (!isOverlay) openEditRuleModal(rule);
              }}
              onKeyDown={(e) => {
                if (!isOverlay && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  openEditRuleModal(rule);
                }
              }}
              className={`group py-4 sm:py-5 rounded-[16px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#222222] dark:focus-visible:ring-[#f5f5f5] ${
                isOverlay
                  ? "px-3 cursor-grabbing"
                  : "first:pt-2 last:pb-2 -mx-3 px-3 hover:bg-[var(--color-background-muted)]/50 cursor-pointer"
              } ${!rule.isActive ? "opacity-70" : ""}`}
            >
              <div className="flex items-center gap-2.5 sm:gap-4">
                {/* Drag Handle (touch-none strictly isolated to handle!) */}
                {handle}

                {/* Left: Crisp Minimal Icon Badge */}
                  <div
                    className={`h-8 w-8 rounded-[10px] flex items-center justify-center shrink-0 transition-colors ${
                      rule.isActive
                        ? "bg-[#222222] !text-white dark:bg-[#f5f5f5] dark:!text-[#222222]"
                        : "bg-[var(--color-background-muted)] text-[var(--color-text-secondary)]"
                    }`}
                  >
                    {isPromo ? (
                      <Percent className="w-4 h-4 stroke-[1.8]" />
                    ) : isTemplate ? (
                      <Sparkles className="w-4 h-4 stroke-[1.8]" />
                    ) : (
                      <CalendarRange className="w-4 h-4 stroke-[1.8]" />
                    )}
                  </div>

                  {/* Center: Title + Price/Rate + Minimal Icon Specs */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-baseline gap-2 min-w-0">
                      <h3 className="text-[16px] sm:text-[17px] font-semibold text-[var(--color-text-primary)] leading-snug truncate">
                        {rule.name}
                      </h3>
                      {isTemplate && (
                        <span className="hidden sm:inline text-[12px] text-[var(--color-text-tertiary)] shrink-0">
                          เทมเพลต
                        </span>
                      )}
                    </div>

                    {/* Price & Delta */}
                    <p className="text-[14px] sm:text-[15px] font-semibold text-[var(--color-text-primary)] tabular-nums flex flex-wrap items-center gap-x-2">
                      <span>{priceRangeText ? `${priceRangeText} / คืน` : "ยังไม่ได้ตั้งราคา"}</span>
                      {diffPct !== null && diffPct !== 0 && (
                        <span
                          className={`text-[12.5px] font-semibold ${
                            diffPct < 0
                              ? "text-[var(--color-success)]"
                              : "text-[var(--color-text-secondary)]"
                          }`}
                        >
                          {diffPct > 0 ? `+${diffPct}%` : `${diffPct}%`}
                        </span>
                      )}
                    </p>

                    {/* Minimal Icon Metadata Row */}
                    <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[12.5px] text-[var(--color-text-secondary)] tabular-nums">
                      <span className="inline-flex items-center gap-1">
                        <CalendarRange className="w-3.5 h-3.5 text-[var(--color-text-tertiary)] stroke-[1.75]" />
                        <span>
                          {formatShortDate(rule.startDate, "th")} –{" "}
                          {formatShortDate(rule.endDate, "th")}
                        </span>
                        <span className="text-[var(--color-text-tertiary)]">
                          ({daysCount} วัน)
                        </span>
                      </span>

                      {rule.minNights > 1 && (
                        <span
                          title={`เข้าพักขั้นต่ำ ${rule.minNights} คืน`}
                          className="inline-flex items-center gap-1"
                        >
                          <Moon className="w-3.5 h-3.5 text-[var(--color-text-tertiary)] stroke-[1.75]" />
                          <span>{rule.minNights} คืน</span>
                        </span>
                      )}

                      <span
                        title={`ครอบคลุม ${roomCount} ประเภทห้อง`}
                        className="inline-flex items-center gap-1"
                      >
                        <BedDouble className="w-3.5 h-3.5 text-[var(--color-text-tertiary)] stroke-[1.75]" />
                        <span>{roomCount}</span>
                      </span>

                      {rule.repeatAnnually && (
                        <span
                          title="ทำซ้ำช่วงวันและราคานี้ทุกปีโดยอัตโนมัติ"
                          className="inline-flex items-center gap-1 text-[var(--color-text-primary)] font-medium"
                        >
                          <Repeat className="w-3.5 h-3.5 text-[var(--color-text-tertiary)] stroke-[1.75]" />
                          <span>ทุกปี</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: 1-Click Toggle Switch (Delete safely lives inside Edit Modal) */}
                  <div
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                    className="flex items-center gap-2.5 shrink-0"
                  >
                    <span
                      className={`hidden sm:inline text-[12.5px] font-medium ${
                        rule.isActive
                          ? "text-[var(--color-text-primary)]"
                          : "text-[var(--color-text-tertiary)]"
                      }`}
                    >
                      {rule.isActive ? "เปิดใช้" : "ปิดไว้"}
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={rule.isActive}
                      aria-label={
                        rule.isActive
                          ? `ปิดใช้งาน ${rule.name}`
                          : `เปิดใช้งาน ${rule.name}`
                      }
                      disabled={isToggling}
                      onClick={() => void handleToggleRule(rule)}
                      className={`h-7 w-12 rounded-[10px] p-1 transition-colors cursor-pointer shrink-0 disabled:opacity-50 ${
                        rule.isActive
                          ? "bg-[#222222] dark:bg-[#f5f5f5]"
                          : "bg-[var(--color-border-emphasized)]"
                      }`}
                    >
                      <span
                        className={`block h-5 w-5 rounded-full transition-transform ${
                          rule.isActive
                            ? "translate-x-5 bg-white dark:bg-[#222222]"
                            : "translate-x-0 bg-white"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </article>
          );
        }}
      />

      {/* =====================================================================
          12-MONTH ANNUAL PRICING REPORT MODAL (Day-by-Day Multi-Color Timeline)
          Green = Promo | Gray = Standard | Black = High (+1%..29%) | Red = Peak (30%+)
      ====================================================================== */}
      <StudioSheetModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        title="ภาพรวมราคาทั้งปี 12 เดือน"
        subtitle={`แสดงแถบสีรายวัน (วันที่ 1 – สิ้นเดือน) ของปี พ.ศ. ${gaugeYear + 543}`}
        maxWidthClass="max-w-[780px]"
        heightClass="h-[90dvh] md:h-[84dvh]"
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsReportOpen(false)}
              className="h-11 px-5 rounded-[12px] bg-[#222222] hover:bg-[#3f3f3f] dark:bg-[#f5f5f5] dark:hover:bg-[#e5e5e5] !text-white dark:!text-[#222222] text-[14px] font-semibold cursor-pointer transition-colors"
            >
              ปิดรายงาน
            </button>
          </div>
        }
      >
        <div className="space-y-5">
          {/* Year Switcher + Room Scope Selector */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setGaugeYear((y) => y - 1);
                  setSelectedGaugeMonth(null);
                }}
                aria-label="ปีก่อนหน้า"
                className="h-9.5 w-9.5 rounded-[10px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] inline-flex items-center justify-center cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2.5 text-[15.5px] font-semibold text-[var(--color-text-primary)] tabular-nums">
                ปี พ.ศ. {gaugeYear + 543}{" "}
                <span className="text-[13px] font-normal text-[var(--color-text-secondary)]">
                  ({gaugeYear})
                </span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setGaugeYear((y) => y + 1);
                  setSelectedGaugeMonth(null);
                }}
                aria-label="ปีถัดไป"
                className="h-9.5 w-9.5 rounded-[10px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] inline-flex items-center justify-center cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {rooms.length > 1 && (
              <div className="w-full sm:w-[230px]">
                <StandardSelectField
                  label="ดูราคาของห้อง"
                  value={gaugeRoomId}
                  onChange={setGaugeRoomId}
                  options={[
                    { value: "all", label: `เฉลี่ยทุกห้อง (${rooms.length} แบบ)` },
                    ...rooms.map((r) => ({
                      value: r.id,
                      label: r.nameTh,
                    })),
                  ]}
                />
              </div>
            )}
          </div>

          {/* 3-Metric Compact Summary Strip */}
          {gaugeSummary && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="rounded-[12px] bg-[var(--color-background-muted)]/65 px-3.5 py-3 space-y-0.5">
                <p className="text-[11.5px] text-[var(--color-text-secondary)]">
                  เฉลี่ยทั้งปี (ปกติ ฿{gaugeSummary.baselineYear.toLocaleString()})
                </p>
                <p className="text-[17px] font-semibold text-[var(--color-text-primary)] tabular-nums">
                  ฿{gaugeSummary.avgYear.toLocaleString()}
                  <span className="text-[12px] font-normal text-[var(--color-text-secondary)]">
                    {" "}
                    / คืน
                  </span>
                </p>
              </div>

              <div className="rounded-[12px] bg-[var(--color-background-muted)]/65 px-3.5 py-3 space-y-0.5">
                <p className="text-[11.5px] text-[var(--color-text-secondary)]">
                  เดือนราคาสูงสุด
                </p>
                <p className="text-[16px] font-semibold text-[var(--color-text-primary)] tabular-nums">
                  {gaugeSummary.peakMonth.diffPct > 0
                    ? `${gaugeSummary.peakMonth.monthShortTh} (+${gaugeSummary.peakMonth.diffPct}%)`
                    : "ยังไม่มีช่วงปรับขึ้น"}
                </p>
              </div>

              <div className="rounded-[12px] bg-[var(--color-background-muted)]/65 px-3.5 py-3 space-y-0.5">
                <p className="text-[11.5px] text-[var(--color-text-secondary)]">
                  เดือนโปรโมชั่นประหยัดสุด
                </p>
                <p className="text-[16px] font-semibold text-[#16a34a] tabular-nums">
                  {gaugeSummary.promoMonth.diffPct < 0
                    ? `${gaugeSummary.promoMonth.monthShortTh} (${gaugeSummary.promoMonth.diffPct}%)`
                    : "ยังไม่มีช่วงลดราคา"}
                </p>
              </div>
            </div>
          )}

          {/* 4-Color Daily Timeline Legend */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-[var(--color-text-secondary)] pt-1">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-[3px] bg-[#16a34a]" />
              ลดราคา / โปร (&lt;0%)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-[3px] bg-[#e5e5e5] dark:bg-[#333333]" />
              ราคาปกติ (0%)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-[3px] bg-[#222222] dark:bg-[#e5e5e5]" />
              ปรับขึ้น (+1% ถึง +29%)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-[3px] bg-[#dc2626]" />
              เทศกาล / Peak (+30%+)
            </span>
          </div>

          {/* Day Ruler Header aligned over the 12 Timeline Bars */}
          <div className="flex items-center gap-3 sm:gap-4 px-2 text-[11px] font-medium text-[var(--color-text-tertiary)] tabular-nums">
            <span className="w-9 sm:w-11 shrink-0">เดือน</span>
            <div className="flex-1 flex items-center justify-between">
              <span>1</span>
              <span>10</span>
              <span>20</span>
              <span>สิ้นเดือน</span>
            </div>
            <span className="w-[106px] sm:w-[132px] text-right shrink-0">
              เฉลี่ย / คืน
            </span>
          </div>

          {/* 12-Month Multi-Color Day-by-Day Timeline */}
          <div className="divide-y divide-[var(--color-border-subtle)] -mt-3">
            {annualGauge.map((m) => {
              const isExpanded = selectedGaugeMonth === m.monthIndex;
              const activeTierColors = (
                ["promo", "high", "peak"] as DailyPriceTier[]
              ).filter((t) => m.tierDays[t] > 0);

              return (
                <div key={m.monthIndex} className="py-2">
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedGaugeMonth((prev) =>
                        prev === m.monthIndex ? null : m.monthIndex
                      )
                    }
                    className="w-full py-1.5 px-2 -mx-2 rounded-[12px] hover:bg-[var(--color-background-muted)]/60 flex items-center gap-3 sm:gap-4 text-left cursor-pointer transition-colors"
                  >
                    {/* Month Label */}
                    <span className="w-9 sm:w-11 text-[13.5px] font-semibold text-[var(--color-text-primary)] shrink-0">
                      {m.monthShortTh}
                    </span>

                    {/* Day-by-Day Proportional Multi-Color Bar (1 -> 28/30/31) */}
                    <div
                      className="flex-1 min-w-0 h-3.5 rounded-[6px] overflow-hidden flex gap-[1.5px] bg-[var(--color-background-card)]"
                      aria-label={`แถบราคา ${m.monthFullTh}`}
                    >
                      {m.segments.map((seg, idx) => {
                        const rangeLabel =
                          seg.startDay === seg.endDay
                            ? `วันที่ ${seg.startDay}`
                            : `วันที่ ${seg.startDay}–${seg.endDay}`;
                        const pctText =
                          seg.diffPct > 0
                            ? `+${seg.diffPct}%`
                            : seg.diffPct < 0
                            ? `${seg.diffPct}%`
                            : "ปกติ";
                        return (
                          <span
                            key={`${m.monthIndex}-${idx}-${seg.startDay}`}
                            style={{ flexGrow: seg.daysCount, flexBasis: 0 }}
                            title={`${rangeLabel} ${m.monthShortTh} · ${
                              seg.label || TIER_LABEL_TH[seg.tier]
                            } (${pctText}) · ฿${seg.avgPriceThb.toLocaleString()}/คืน`}
                            className={`h-full first:rounded-l-[5px] last:rounded-r-[5px] transition-opacity ${TIER_BAR_CLASS[seg.tier]}`}
                          />
                        );
                      })}
                    </div>

                    {/* Right Price & Delta */}
                    <div className="w-[106px] sm:w-[132px] flex items-center justify-end gap-2 shrink-0 tabular-nums">
                      <span className="text-[13px] sm:text-[13.5px] font-semibold text-[var(--color-text-primary)]">
                        ฿{m.effectiveAvgThb.toLocaleString()}
                      </span>
                      <span
                        className={`w-11 text-right text-[12px] font-semibold ${
                          m.diffPct <= -2
                            ? "text-[#16a34a]"
                            : m.diffPct >= 30
                            ? "text-[#dc2626]"
                            : m.diffPct >= 2
                            ? "text-[var(--color-text-primary)]"
                            : activeTierColors.length > 0
                            ? "text-[var(--color-text-secondary)]"
                            : "text-[var(--color-text-tertiary)] font-normal"
                        }`}
                      >
                        {m.diffPct > 0
                          ? `+${m.diffPct}%`
                          : m.diffPct < 0
                          ? `${m.diffPct}%`
                          : activeTierColors.length > 0
                          ? "ผสม"
                          : "ปกติ"}
                      </span>
                    </div>
                  </button>

                  {/* Expanded Month Day-Segment Breakdown */}
                  {isExpanded && (
                    <div className="mt-2 ml-9 sm:ml-11 rounded-[12px] bg-[var(--color-background-muted)]/70 p-3.5 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-[12.5px]">
                          <p className="font-semibold text-[var(--color-text-primary)]">
                            {m.monthFullTh} {gaugeYear + 543} · เฉลี่ย ฿
                            {m.effectiveAvgThb.toLocaleString()}/คืน
                          </p>
                          <p className="text-[var(--color-text-secondary)]">
                            ราคามาตรฐาน ฿{m.baselineAvgThb.toLocaleString()}/คืน
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const pad = (n: number) =>
                              String(n).padStart(2, "0");
                            const lastDay = new Date(
                              gaugeYear,
                              m.monthIndex + 1,
                              0
                            ).getDate();
                            setIsReportOpen(false);
                            openCreateNewRuleModal(
                              `${gaugeYear}-${pad(m.monthIndex + 1)}-01`,
                              `${gaugeYear}-${pad(m.monthIndex + 1)}-${pad(
                                lastDay
                              )}`,
                              `ราคาพิเศษ ${m.monthFullTh}`
                            );
                          }}
                          className="h-8 px-3 rounded-[9px] bg-[#222222] !text-white dark:bg-[#f5f5f5] dark:!text-[#222222] text-[12px] font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>ตั้งราคาเดือนนี้</span>
                        </button>
                      </div>

                      {/* Segment-by-Segment Colored Breakdown */}
                      <div className="divide-y divide-[var(--color-border-subtle)] text-[12.5px]">
                        {m.segments.map((seg, idx) => (
                          <div
                            key={`seg-detail-${m.monthIndex}-${idx}`}
                            className="py-1.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className={`h-2.5 w-2.5 rounded-[3px] shrink-0 ${TIER_BAR_CLASS[seg.tier]}`}
                              />
                              <span className="font-medium text-[var(--color-text-primary)] tabular-nums shrink-0">
                                {seg.startDay === seg.endDay
                                  ? `${seg.startDay} ${m.monthShortTh}`
                                  : `${seg.startDay}–${seg.endDay} ${m.monthShortTh}`}
                              </span>
                              <span className="text-[var(--color-text-secondary)] truncate">
                                {seg.label || TIER_LABEL_TH[seg.tier]} ({seg.daysCount} วัน)
                              </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 tabular-nums">
                              <span className="font-semibold text-[var(--color-text-primary)]">
                                ฿{seg.avgPriceThb.toLocaleString()}
                              </span>
                              <span
                                className={`w-10 text-right font-semibold ${TIER_TEXT_CLASS[seg.tier]}`}
                              >
                                {seg.diffPct > 0
                                  ? `+${seg.diffPct}%`
                                  : seg.diffPct < 0
                                  ? `${seg.diffPct}%`
                                  : "0%"}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </StudioSheetModal>

      {/* =====================================================================
          SEASONAL PRICING EDITOR MODAL
          - Custom Airbnb 2-Month Date Range Picker (Zero native <input type="date">)
          - Live Overlap Warning Notice
          - Global StandardCheckbox + Room Cover Thumbnails
      ====================================================================== */}
      <StudioSheetModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        title={editingRuleId ? `แก้ไข · ${seasonName}` : "สร้างช่วงราคาตามฤดูกาล"}
        maxWidthClass="md:max-w-[680px]"
        footer={
          <div className="flex items-center justify-between gap-2.5">
            {editingRuleId && !editingPresetKey ? (
              <button
                type="button"
                disabled={deletingRuleId === editingRuleId}
                onClick={async () => {
                  const target = allRules.find((r) => r.id === editingRuleId);
                  if (!target) return;
                  await handleDeleteRule(target);
                  setIsEditorOpen(false);
                }}
                className="text-[13.5px] font-semibold text-[var(--color-error)] underline underline-offset-2 cursor-pointer disabled:opacity-40"
              >
                {deletingRuleId === editingRuleId ? "กำลังลบ..." : "ลบช่วงราคานี้"}
              </button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="h-11 px-5 rounded-[12px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[14px] font-semibold text-[var(--color-text-primary)] cursor-pointer transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => void handleSaveRule()}
                className="h-11 px-6 rounded-[12px] bg-[#222222] hover:bg-[#3f3f3f] dark:bg-[#f5f5f5] dark:hover:bg-[#e5e5e5] !text-white dark:!text-[#222222] text-[14px] font-semibold cursor-pointer transition-colors disabled:opacity-50"
              >
                {isSaving ? "กำลังบันทึก..." : "บันทึกช่วงราคา"}
              </button>
            </div>
          </div>
        }
      >
        <div className="divide-y divide-[var(--color-border)]">
          {/* 1. Season Name + Airbnb 2-Month Date Range Picker */}
          <section className="pb-6 space-y-4">
            <h3 className="text-[16px] font-semibold text-[var(--color-text-primary)]">
              ช่วงเวลาเทศกาล / ฤดูกาล
            </h3>

            <StandardFieldGroup>
              <StandardInput
                grouped
                label="ชื่อช่วงฤดูกาล / เทศกาล"
                placeholder="เช่น เทศกาลปีใหม่, High Season, โปรหน้าฝน"
                value={seasonName}
                onChange={(e) => setSeasonName(e.target.value)}
              />
              <StudioDateRangePicker
                grouped
                startDate={startDate}
                endDate={endDate}
                onChange={(nextStart, nextEnd) => {
                  setStartDate(nextStart);
                  setEndDate(nextEnd);
                }}
              />
            </StandardFieldGroup>

            {/* Repeat Annually Toggle */}
            <div className="space-y-1 pt-0.5">
              <StandardCheckbox
                checked={repeatAnnually}
                onChange={setRepeatAnnually}
                label="ใช้ช่วงเวลานี้ซ้ำทุกปี (ตั้งแต่วันนี้เป็นต้นไป)"
              />
              <p className="text-[12px] text-[var(--color-text-secondary)] pl-7.5 leading-relaxed">
                มีผลเฉพาะวันที่ยังไม่ผ่านพ้นไปและทำซ้ำในอนาคตทุกปี เหมาะกับเทศกาลที่วันที่คงที่ (เช่น ปีใหม่, สงกรานต์, High/Green Season) — ไม่แนะนำสำหรับวันหยุดที่เลื่อนทุกปี เช่น ตรุษจีน
              </p>
            </div>

            {/* Live Overlap Warning (Calm, Transparent, Zero Error!) */}
            {overlappingActiveRules.length > 0 && (
              <div className="rounded-[12px] bg-[var(--color-background-muted)] p-3.5 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-[var(--color-warning)] shrink-0 mt-0.5" />
                <p className="text-[12.5px] leading-relaxed text-[var(--color-text-secondary)]">
                  ช่วงวันนี้ทับซ้อนกับ{" "}
                  <strong className="font-semibold text-[var(--color-text-primary)]">
                    {overlappingActiveRules
                      .map((o) => `${o.rule.name} (${o.overlapDays} วัน)`)
                      .join(", ")}
                  </strong>{" "}
                  — ระบบไม่เกิด Error โดยช่วงเทศกาลที่สั้นกว่าจะมีสิทธิ์ใช้ราคาก่อนโดยอัตโนมัติ (หากปิดเทศกาล ราคาฤดูกาลเดิมจะคืนกลับมาเอง)
                </p>
              </div>
            )}

            <StandardStepperRow
              label="จำนวนคืนเข้าพักขั้นต่ำในช่วงนี้"
              description="กำหนดเช่น 2 คืนสำหรับวันหยุดยาว"
              value={minNights}
              min={1}
              max={30}
              onChange={setMinNights}
            />

            {/* Days of Week */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-[13.5px] font-medium text-[var(--color-text-secondary)]">
                  ใช้กับวันในสัปดาห์
                </span>
                <div className="flex items-center gap-3 text-[12.5px]">
                  <button
                    type="button"
                    onClick={() => setDaysOfWeek([0, 1, 2, 3, 4, 5, 6])}
                    className="underline underline-offset-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] cursor-pointer"
                  >
                    ทุกวัน
                  </button>
                  <button
                    type="button"
                    onClick={() => setDaysOfWeek([5, 6])}
                    className="underline underline-offset-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] cursor-pointer"
                  >
                    เฉพาะ ศ.–ส.
                  </button>
                </div>
              </div>
              <div
                role="group"
                aria-label="เลือกวันในสัปดาห์"
                className="grid grid-cols-7 rounded-[12px] border border-[#b0b0b0] dark:border-[var(--color-border-emphasized)] bg-[var(--color-background-card)] divide-x divide-[#b0b0b0] dark:divide-[var(--color-border-emphasized)] overflow-hidden"
              >
                {DAY_PILLS.map((dp) => {
                  const selected = daysOfWeek.includes(dp.dow);
                  return (
                    <button
                      key={dp.dow}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggleDayOfWeek(dp.dow)}
                      className={`h-11 first:rounded-l-[11px] last:rounded-r-[11px] text-[13.5px] font-semibold cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-text-primary)] ${
                        selected
                          ? "bg-[#222222] !text-white dark:bg-[#f5f5f5] dark:!text-[#222222]"
                          : "bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-background-muted)] hover:text-[var(--color-text-primary)]"
                      }`}
                    >
                      {dp.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* 2. Per-Room Nightly Prices (Global StandardCheckbox + Room Cover Thumbnails!) */}
          <section className="pt-6 space-y-4">
            <div className="space-y-2">
              <h3 className="text-[16px] font-semibold text-[var(--color-text-primary)]">
                ราคาต่อคืนแยกแต่ละห้องในช่วงนี้
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {[-15, 15, 25, 30, 50].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => applyQuickPercent(pct)}
                    className="h-8 px-3 rounded-[9px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[12.5px] font-semibold text-[var(--color-text-primary)] cursor-pointer transition-colors"
                  >
                    {pct > 0 ? `+${pct}%` : `${pct}%`} ทุกห้อง
                  </button>
                ))}
              </div>
            </div>

            {rooms.length === 0 ? (
              <p className="text-[14px] text-[var(--color-text-secondary)] py-4">
                กรุณาเพิ่มประเภทห้องพักก่อนตั้งราคาตามฤดูกาล
              </p>
            ) : (
              <div className="divide-y divide-[var(--color-border-subtle)]">
                {rooms.map((rm) => {
                  const checked = selectedRoomIds.includes(rm.id);
                  return (
                    <div
                      key={rm.id}
                      className={`py-3.5 first:pt-1 flex items-center justify-between gap-3.5 transition-opacity ${
                        checked ? "opacity-100" : "opacity-55"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <StandardCheckbox
                          checked={checked}
                          ariaLabel={`เลือกห้อง ${rm.nameTh}`}
                          onChange={(nextChecked) => {
                            setSelectedRoomIds((prev) =>
                              nextChecked
                                ? [...prev, rm.id]
                                : prev.filter((id) => id !== rm.id)
                            );
                          }}
                        />

                        {/* Crisp Room Cover Thumbnail for Instant Visual Recognition */}
                        <div className="w-12 h-9 rounded-[8px] overflow-hidden bg-[var(--color-background-muted)] shrink-0 flex items-center justify-center text-[var(--color-text-tertiary)]">
                          {rm.galleryUrls[0] ? (
                            <img
                              src={rm.galleryUrls[0]}
                              alt={rm.nameTh}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <BedDouble className="w-4 h-4 stroke-[1.6]" />
                          )}
                        </div>

                        <div
                          onClick={() =>
                            setSelectedRoomIds((prev) =>
                              prev.includes(rm.id)
                                ? prev.filter((id) => id !== rm.id)
                                : [...prev, rm.id]
                            )
                          }
                          className="min-w-0 cursor-pointer"
                        >
                          <p className="text-[14.5px] font-semibold text-[var(--color-text-primary)] truncate">
                            {rm.nameTh}
                          </p>
                          <p className="text-[12px] text-[var(--color-text-secondary)] tabular-nums">
                            ปกติ ฿{rm.weekdayPriceThb.toLocaleString()} – ฿
                            {rm.weekendPriceThb.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="w-[136px] shrink-0">
                        <div className="flex items-center h-11 rounded-[10px] border border-[#b0b0b0] dark:border-[var(--color-border-emphasized)] bg-[var(--color-background-card)] px-3 focus-within:border-[var(--color-text-primary)] focus-within:ring-1 focus-within:ring-[var(--color-text-primary)] transition-colors">
                          <span className="text-[14px] text-[var(--color-text-secondary)] mr-1.5">
                            ฿
                          </span>
                          <input
                            type="number"
                            min={100}
                            disabled={!checked}
                            value={roomPriceMap[rm.id] ?? ""}
                            onChange={(e) =>
                              setRoomPriceMap((prev) => ({
                                ...prev,
                                [rm.id]: e.target.value,
                              }))
                            }
                            className="w-full bg-transparent text-[15px] font-semibold text-right text-[var(--color-text-primary)] focus:outline-none tabular-nums disabled:opacity-40"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </StudioSheetModal>
    </div>
  );
}
