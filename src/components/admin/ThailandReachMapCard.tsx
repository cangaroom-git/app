"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Globe, RefreshCw, Users, X } from "lucide-react";
import { ResponsiveSelect } from "@/components/ui/ResponsiveSelect";
import type {
  AdminPerformanceRow,
  ProvinceReachMetric,
} from "@/lib/services/adminDashboardService";

interface ThailandGeoProvince {
  id: string;
  code: string;
  nameTh: string;
  nameEn: string;
  d: string;
}

interface ThailandGeoPayload {
  width: number;
  height: number;
  provinces: ThailandGeoProvince[];
}

// Module-level cache so the 74KB static SVG map loads once per browser session
let cachedThailandGeo: ThailandGeoPayload | null = null;
let inflightGeoPromise: Promise<ThailandGeoPayload> | null = null;

function loadThailandGeo(): Promise<ThailandGeoPayload> {
  if (cachedThailandGeo) return Promise.resolve(cachedThailandGeo);
  if (!inflightGeoPromise) {
    inflightGeoPromise = fetch("/geo/thailand-provinces-svg.json")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load Thailand map geometry");
        return res.json() as Promise<ThailandGeoPayload>;
      })
      .then((data) => {
        cachedThailandGeo = data;
        return data;
      })
      .catch((err) => {
        inflightGeoPromise = null;
        throw err;
      });
  }
  return inflightGeoPromise;
}

interface ThailandReachMapCardProps {
  provinces: ProvinceReachMetric[];
  performanceRows: AdminPerformanceRow[];
  provincesCoveredCount: number;
  activePromosCount: number;
  totalEngagementCount: number;
  selectedProvinceId: string | null;
  onSelectProvince: (provinceId: string | null) => void;
}

type MetricMode = "places" | "promos" | "engagement";

/* Admin Center Crimson Red Heat Scale (Soft Rose -> Admin Crimson #dc2626) */
const COLOR_SCALE = [
  "#fef2f2", // very low
  "#fee2e2", // low
  "#fecaca", // medium
  "#fca5a5", // high
  "#ef4444", // very high
  "#dc2626", // highest (Admin Crimson Red)
];

const METRIC_OPTIONS = [
  { value: "places", label: "จำนวนสถานที่ทั้งหมด" },
  { value: "promos", label: "โปรโมชั่นที่เผยแพร่อยู่" },
  { value: "engagement", label: "ยอดเข้าชมสะสม" },
];

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function getProvinceColor(
  count: number | undefined,
  maxCount: number,
): string {
  if (!count || count <= 0 || maxCount <= 0) return "#f1f5f9";
  const logCount = Math.log(count + 1);
  const logMax = Math.log(maxCount + 1);
  const ratio = Math.min(logCount / logMax, 1);
  const index = Math.min(
    Math.floor(ratio * COLOR_SCALE.length),
    COLOR_SCALE.length - 1,
  );
  return COLOR_SCALE[index];
}

/**
 * 1:1 WeGlobal WorldMapCard — Official 77-Province Thailand Choropleth Map
 * - Real DOPA 77-province Mercator polygon boundaries (including Phuket, Samui, Koh Chang, etc.)
 * - Nondii `#f1f5f9` neutral land, `#747474` hairline borders, Travel-Blue `#eaf3fc → #1e78d6` heat scale + `#FEF211` selected stroke
 * - Rich floating tooltip showing Top 5 places/promos inside each hovered province with thumbnails
 */
export function ThailandReachMapCard({
  provinces,
  performanceRows,
  provincesCoveredCount,
  totalEngagementCount,
  selectedProvinceId,
  onSelectProvince,
}: ThailandReachMapCardProps) {
  const router = useRouter();
  const [geo, setGeo] = useState<ThailandGeoPayload | null>(cachedThailandGeo);
  const [metric, setMetric] = useState<MetricMode>("places");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [containerSize, setContainerSize] = useState({ w: 720, h: 480 });
  const [elapsedSec, setElapsedSec] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const mountedAtRef = useRef<number>(Date.now());

  useEffect(() => {
    let alive = true;
    if (!geo) {
      loadThailandGeo()
        .then((data) => {
          if (alive) setGeo(data);
        })
        .catch(() => {});
    }
    return () => {
      alive = false;
    };
  }, [geo]);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSec(Math.round((Date.now() - mountedAtRef.current) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getMetricValue = (p: ProvinceReachMetric) => {
    if (metric === "promos") return p.activePromosCount;
    if (metric === "engagement") return p.totalEngagement;
    return p.placesCount;
  };

  const { provinceMap, maxVal, topProvinces } = useMemo(() => {
    const map = new Map<string, ProvinceReachMetric>();
    let max = 0;
    for (const p of provinces) {
      map.set(p.provinceId, p);
      const v = getMetricValue(p);
      if (v > max) max = v;
    }
    const ranked = [...provinces]
      .filter((p) => getMetricValue(p) > 0)
      .sort((a, b) => getMetricValue(b) - getMetricValue(a));
    return { provinceMap: map, maxVal: max, topProvinces: ranked };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provinces, metric]);

  // Pre-group Top 5 Places/Promos per province for instant 0ms WeGlobal rich tooltip
  const topPlacesByProvince = useMemo(() => {
    const grouped = new Map<string, AdminPerformanceRow[]>();
    for (const row of performanceRows) {
      if (!row.provinceId || row.provinceId === "nationwide") continue;
      const list = grouped.get(row.provinceId);
      if (list) list.push(row);
      else grouped.set(row.provinceId, [row]);
    }
    const result = new Map<
      string,
      Array<{ id: string; name: string; image: string; views: number; pct: number }>
    >();
    for (const [provId, list] of grouped.entries()) {
      const sorted = [...list].sort((a, b) => b.viewsCount - a.viewsCount);
      const totalViews = sorted.reduce(
        (sum, r) => sum + Math.max(1, r.viewsCount),
        0,
      );
      result.set(
        provId,
        sorted.slice(0, 5).map((r) => ({
          id: r.id,
          name: r.hotelNameTh,
          image: r.coverImageUrl,
          views: r.viewsCount,
          pct: Math.max(
            1,
            Math.round((Math.max(1, r.viewsCount) / totalViews) * 100),
          ),
        })),
      );
    }
    return result;
  }, [performanceRows]);

  const hoveredProvince = hoveredId ? provinceMap.get(hoveredId) ?? null : null;
  const hoveredPlaces = hoveredId ? topPlacesByProvince.get(hoveredId) ?? [] : [];
  const selectedProvince = selectedProvinceId
    ? provinceMap.get(selectedProvinceId) ?? null
    : null;

  const handleRefresh = () => {
    setIsRefreshing(true);
    mountedAtRef.current = Date.now();
    setElapsedSec(0);
    router.refresh();
    window.setTimeout(() => setIsRefreshing(false), 600);
  };

  const tooltipW = 240;
  const tooltipH = hoveredPlaces.length > 0 ? 220 : 72;
  const tooltipLeft =
    tooltipPos.x + tooltipW + 20 > containerSize.w
      ? Math.max(8, tooltipPos.x - tooltipW - 8)
      : tooltipPos.x + 14;
  const tooltipTop =
    tooltipPos.y + tooltipH + 10 > containerSize.h
      ? Math.max(8, tooltipPos.y - tooltipH - 8)
      : tooltipPos.y + 10;

  return (
    <div className="bg-[var(--color-background-body)]">
      <div className="flex flex-col md:flex-row gap-6 md:gap-8">
        {/* ── Left Panel: Clean Minimal Stats Rail ── */}
        <div className="w-full md:w-[260px] shrink-0 flex flex-col justify-between">
          <div className="space-y-5">
            {/* Province Reached */}
            <div>
              <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[var(--color-text-secondary)] mb-1">
                <Globe className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                <span>ความครอบคลุมรายจังหวัด</span>
              </div>
              <p className="text-[28px] font-semibold text-[var(--color-text-primary)] tracking-tight tabular-nums">
                {provincesCoveredCount}{" "}
                <span className="text-[14px] font-normal text-[var(--color-text-secondary)]">
                  / 77 จังหวัด
                </span>
              </p>
            </div>

            {/* User Reached */}
            <div>
              <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[var(--color-text-secondary)] mb-1">
                <Users className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                <span>การเข้าชมสะสม</span>
              </div>
              <p className="text-[28px] font-semibold text-[var(--color-text-primary)] tracking-tight tabular-nums">
                {formatNumber(totalEngagementCount)}{" "}
                <span className="text-[14px] font-normal text-[var(--color-text-secondary)]">
                  ครั้ง
                </span>
              </p>
            </div>

            {/* Clean Flat Dropdown */}
            <div>
              <p className="text-[12px] font-semibold text-[var(--color-text-secondary)] mb-1.5">
                ตัวชี้วัดบนแผนที่
              </p>
              <ResponsiveSelect
                value={metric}
                onChange={(v) => setMetric(v as MetricMode)}
                options={METRIC_OPTIONS}
                sheetTitle="เลือกตัวชี้วัด"
                triggerClassName="w-full h-10 px-3.5 rounded-[12px] bg-[var(--color-background-card)] border border-[#b0b0b0] hover:border-[var(--color-text-primary)] text-[14px] text-[var(--color-text-primary)] font-medium"
                dropdownClassName="min-w-[220px]"
              />
            </div>

            {/* Top Provinces List: Mobile horizontal pill strip (zero nested vertical scroll!) / Desktop ranked list */}
            {topProvinces.length > 0 && (
              <div className="flex flex-col">
                <p className="text-[12px] font-semibold text-[var(--color-text-secondary)] mb-2">
                  จังหวัดยอดนิยม
                </p>

                {/* Mobile (< md): Single-row horizontal pills so vertical page scroll is never hijacked */}
                <div className="flex md:hidden items-center gap-1.5 overflow-x-auto overflow-y-hidden touch-pan-x no-scrollbar py-0.5">
                  {topProvinces.map((p) => {
                    const val = getMetricValue(p);
                    const color = getProvinceColor(val, maxVal);
                    const isSel = selectedProvinceId === p.provinceId;
                    return (
                      <button
                        key={p.provinceId}
                        type="button"
                        onClick={() =>
                          onSelectProvince(isSel ? null : p.provinceId)
                        }
                        className={`h-8 px-3 rounded-full inline-flex items-center gap-1.5 ws-caption-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                          isSel
                            ? "bg-[var(--color-accent)] !text-[var(--color-on-accent)] font-semibold"
                            : "bg-[var(--color-background-muted)] !text-[var(--color-text-primary)] active:bg-[var(--color-background-subtle)]"
                        }`}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/10"
                          style={{
                            backgroundColor: isSel ? "#ffffff" : color,
                          }}
                        />
                        <span>{p.nameTh}</span>
                        <span
                          className={`ws-badge tabular-nums ${
                            isSel
                              ? "text-white/85"
                              : "text-[var(--color-text-secondary)]"
                          }`}
                        >
                          {formatNumber(val)}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Desktop (>= md): Ranked vertical list with auto-hide scrollbar */}
                <div className="hidden md:block space-y-1 max-h-[240px] overflow-y-auto cgr-scroll-autohide pr-1">
                  {topProvinces.map((p) => {
                    const val = getMetricValue(p);
                    const color = getProvinceColor(val, maxVal);
                    const isSel = selectedProvinceId === p.provinceId;
                    const isHov = hoveredId === p.provinceId;
                    return (
                      <button
                        key={p.provinceId}
                        type="button"
                        onClick={() =>
                          onSelectProvince(isSel ? null : p.provinceId)
                        }
                        onMouseEnter={() => setHoveredId(p.provinceId)}
                        onMouseLeave={() => setHoveredId(null)}
                        className={`w-full flex items-center gap-2.5 text-[14px] text-left rounded-[10px] px-2 py-1.5 transition-colors cursor-pointer ${
                          isSel
                            ? "bg-[var(--color-accent-muted)] text-[var(--color-accent)] font-semibold"
                            : isHov
                              ? "bg-[var(--color-background-muted)]"
                              : "hover:bg-[var(--color-background-muted)]/70"
                        }`}
                      >
                        <span
                          className="w-3 h-3 rounded-full shrink-0 border border-[var(--color-border)]"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-[var(--color-text-primary)] truncate flex-1">
                          {p.nameTh}
                        </span>
                        <span className="text-[var(--color-text-secondary)] font-medium text-xs tabular-nums">
                          {formatNumber(val)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Color Legend */}
            <div className="hidden md:block">
              <p className="text-[12px] text-[var(--color-text-secondary)] mb-1.5">
                น้อย → มาก
              </p>
              <div className="flex h-2 rounded-full overflow-hidden">
                {COLOR_SCALE.map((color, i) => (
                  <div
                    key={i}
                    className="flex-1"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Last Updated + Refresh */}
          <div className="mt-5 pt-4 border-t border-[var(--color-border)] hidden md:flex items-center justify-between">
            <p className="text-[12px] text-[var(--color-text-secondary)]">
              อัปเดตเมื่อ {elapsedSec} วิที่แล้ว
            </p>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--color-accent)] hover:opacity-80 cursor-pointer transition-opacity disabled:opacity-50"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`}
              />
              <span>รีเฟรช</span>
            </button>
          </div>
        </div>

        {/* ── Right Panel: Real 77-Province Thailand Choropleth Map on Clean Pure White Canvas ── */}
        <div
          className="flex-1 relative bg-[var(--color-background-muted)]/40 rounded-[24px] min-h-[380px] md:min-h-[500px] select-none flex items-center justify-center py-5 px-3"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setTooltipPos({
              x: e.clientX - rect.left,
              y: e.clientY - rect.top,
            });
            setContainerSize({ w: rect.width, h: rect.height });
          }}
          onMouseLeave={() => setHoveredId(null)}
        >
          {/* Active Province Filter Clear Pill */}
          {selectedProvince && (
            <button
              type="button"
              onClick={() => onSelectProvince(null)}
              className="absolute top-4 right-4 z-10 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
            >
              <span>Filter: {selectedProvince.nameTh}</span>
              <X className="w-3.5 h-3.5 text-gray-400" />
            </button>
          )}

          {geo ? (
            <svg
              viewBox={`0 0 ${geo.width} ${geo.height}`}
              role="img"
              aria-label="Thailand 77-Province Choropleth Map"
              className="h-[380px] md:h-[500px] w-auto max-w-full"
            >
              {geo.provinces.map((provGeo) => {
                const metricRow = provinceMap.get(provGeo.id);
                const val = metricRow ? getMetricValue(metricRow) : 0;
                const hasData = val > 0;
                const isSelected = selectedProvinceId === provGeo.id;
                const isHovered = hoveredId === provGeo.id;

                const defaultFill = getProvinceColor(val, maxVal);
                const fill = isSelected
                  ? "#dc2626"
                  : isHovered
                    ? hasData
                      ? "#b91c1c"
                      : "#fee2e2"
                    : defaultFill;

                return (
                  <path
                    key={provGeo.id}
                    d={provGeo.d}
                    fill={fill}
                    stroke={
                      isSelected
                        ? "#FEF211"
                        : isHovered
                          ? "#dc2626"
                          : "#747474"
                    }
                    strokeWidth={isSelected ? 1.8 : isHovered ? 0.9 : 0.45}
                    strokeLinejoin="round"
                    onClick={() =>
                      onSelectProvince(isSelected ? null : provGeo.id)
                    }
                    onMouseEnter={() => setHoveredId(provGeo.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    className="cursor-pointer transition-colors duration-150 outline-none"
                  />
                );
              })}
            </svg>
          ) : (
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Loading Thailand map...</span>
            </div>
          )}

          {/* ── Rich WeGlobal Floating Tooltip (with Top 5 Places + Thumbnails) ── */}
          {hoveredProvince && (
            <div
              className="absolute pointer-events-none z-50 bg-white border border-gray-200 rounded-xl shadow-[var(--shadow-popover)] overflow-hidden"
              style={{
                left: tooltipLeft,
                top: tooltipTop,
                width: tooltipW,
              }}
            >
              {/* Header */}
              <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-800 truncate">
                  {hoveredProvince.nameTh}
                </p>
                <p className="text-xs text-gray-500">
                  {hoveredProvince.placesCount.toLocaleString()} places ·{" "}
                  {hoveredProvince.activePromosCount.toLocaleString()} promos
                  {hoveredProvince.totalEngagement > 0
                    ? ` · ${formatNumber(hoveredProvince.totalEngagement)} visits`
                    : ""}
                </p>
              </div>

              {/* Top Places / Promos inside this province */}
              {hoveredPlaces.length > 0 && (
                <div className="px-3 py-2 space-y-1.5">
                  <p className="text-[12px] font-semibold text-gray-400 uppercase tracking-wider">
                    Top Places
                  </p>
                  {hoveredPlaces.map((place) => (
                    <div key={place.id} className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded bg-gray-100 overflow-hidden shrink-0 border border-gray-100">
                        {place.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={place.image}
                            alt={place.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300 text-[12px]">
                            N/A
                          </div>
                        )}
                      </div>
                      <span className="flex-1 text-xs text-gray-700 truncate leading-tight">
                        {place.name}
                      </span>
                      <span className="text-xs font-semibold text-gray-500 shrink-0 tabular-nums">
                        {place.pct}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
