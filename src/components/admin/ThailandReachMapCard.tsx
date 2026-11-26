"use client";

import React, { useMemo, useState } from "react";
import { X } from "lucide-react";
import type { ProvinceReachMetric } from "@/lib/services/adminDashboardService";

interface ThailandReachMapCardProps {
  provinces: ProvinceReachMetric[];
  provincesCoveredCount: number;
  activePromosCount: number;
  totalEngagementCount: number;
  selectedProvinceId: string | null;
  onSelectProvince: (provinceId: string | null) => void;
}

type MetricMode = "places" | "promos" | "engagement";

const LNG_MIN = 97.2;
const LNG_MAX = 105.8;
const LAT_MIN = 5.4;
const LAT_MAX = 20.6;
const SVG_W = 400;
const SVG_H = 620;

function projectThailand(lat: number, lng: number): { x: number; y: number } {
  const x = 32 + ((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * (SVG_W - 64);
  const y = 26 + ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * (SVG_H - 52);
  return { x, y };
}

const THAILAND_CONTOUR_COORDS: Array<[number, number]> = [
  [20.42, 99.88], [20.25, 100.42], [19.55, 100.48], [19.45, 101.25],
  [18.18, 101.18], [17.55, 101.65], [18.22, 102.95], [18.38, 103.95],
  [17.55, 104.78], [16.25, 105.12], [15.25, 105.62], [14.32, 105.12],
  [14.42, 103.55], [13.65, 102.68], [12.22, 102.82], [11.65, 102.56],
  [12.52, 101.85], [12.65, 100.88], [13.48, 100.55], [13.38, 100.02],
  [12.15, 99.96], [10.95, 99.52], [9.25, 99.88], [7.85, 100.38],
  [6.92, 101.35], [6.22, 102.08], [5.65, 101.15], [6.42, 100.12],
  [7.35, 99.42], [8.08, 98.32], [9.85, 98.58], [11.35, 99.22],
  [13.25, 99.25], [15.12, 98.35], [16.75, 98.52], [17.85, 97.72],
  [19.42, 97.88], [19.88, 98.95],
];

const THAILAND_SVG_PATH =
  THAILAND_CONTOUR_COORDS.map(([lat, lng], idx) => {
    const pt = projectThailand(lat, lng);
    return `${idx === 0 ? "M" : "L"}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
  }).join(" ") + " Z";

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function getHeatFill(val: number, maxVal: number): string {
  if (val <= 0 || maxVal <= 0) return "#dce7f4";
  const ratio = Math.log(val + 1) / Math.log(maxVal + 1);
  if (ratio > 0.8) return "#1e78d6";
  if (ratio > 0.55) return "#3d93eb";
  if (ratio > 0.3) return "#74b6f6";
  return "#a8d2fa";
}

export function ThailandReachMapCard({
  provinces,
  provincesCoveredCount,
  selectedProvinceId,
  onSelectProvince,
}: ThailandReachMapCardProps) {
  const [metric, setMetric] = useState<MetricMode>("places");
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const getMetricValue = (p: ProvinceReachMetric) => {
    if (metric === "promos") return p.activePromosCount;
    if (metric === "engagement") return p.totalEngagement;
    return p.placesCount;
  };

  const { maxVal, topProvinces } = useMemo(() => {
    let max = 0;
    for (const p of provinces) {
      const v = getMetricValue(p);
      if (v > max) max = v;
    }
    const ranked = [...provinces]
      .filter((p) => getMetricValue(p) > 0)
      .sort((a, b) => getMetricValue(b) - getMetricValue(a))
      .slice(0, 8);
    return { maxVal: max, topProvinces: ranked };
  }, [provinces, metric]);

  const hoveredProvince = useMemo(
    () => provinces.find((p) => p.provinceId === hoveredId) ?? null,
    [provinces, hoveredId]
  );

  const selectedProvince = useMemo(
    () => provinces.find((p) => p.provinceId === selectedProvinceId) ?? null,
    [provinces, selectedProvinceId]
  );

  return (
    <section className="shrink-0 border-b border-[var(--color-border)] bg-[var(--color-background-body)] grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[var(--color-border)]">
      {/* Left: Compact Border-b Top Provinces List */}
      <div className="lg:col-span-5 xl:col-span-4 flex flex-col">
        <div className="h-[36px] px-4 border-b border-[var(--color-border)] flex items-center justify-between gap-2">
          <span className="text-[11.5px] font-semibold uppercase tracking-[0.04em] text-[var(--color-text-secondary)]">
            ความครอบคลุม ({provincesCoveredCount}/77 จังหวัด)
          </span>
          <div className="flex items-center gap-1">
            {(
              [
                { id: "places", label: "ร้าน" },
                { id: "promos", label: "โปร" },
                { id: "engagement", label: "ยอดวิว" },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMetric(m.id)}
                className={`h-6 px-2 rounded-full text-[11px] font-semibold cursor-pointer transition-colors ${
                  metric === m.id
                    ? "bg-[var(--color-accent)] !text-[var(--color-on-accent)]"
                    : "text-[var(--color-text-secondary)] hover:bg-[var(--color-background-muted)]"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-[var(--color-border)] max-h-[216px] overflow-y-auto">
          {topProvinces.length === 0 ? (
            <p className="px-4 py-6 text-[12.5px] text-[var(--color-text-secondary)]">
              ยังไม่มีข้อมูลสถิติรายจังหวัด
            </p>
          ) : (
            topProvinces.map((prov) => {
              const val = getMetricValue(prov);
              const isSel = selectedProvinceId === prov.provinceId;
              const fill = getHeatFill(val, maxVal);
              return (
                <button
                  key={prov.provinceId}
                  type="button"
                  onClick={() => onSelectProvince(isSel ? null : prov.provinceId)}
                  onMouseEnter={() => setHoveredId(prov.provinceId)}
                  onMouseLeave={() => setHoveredId(null)}
                  className={`w-full h-[30px] px-4 flex items-center justify-between gap-3 text-left cursor-pointer transition-colors ${
                    isSel
                      ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)] font-semibold"
                      : "hover:bg-[var(--color-background-muted)]/60 text-[var(--color-text-primary)]"
                  }`}
                >
                  <span className="inline-flex items-center gap-2 min-w-0 text-[12.5px]">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: fill }}
                    />
                    <span className="truncate">{prov.nameTh}</span>
                  </span>
                  <span className="text-[12px] font-semibold tabular-nums text-[var(--color-text-secondary)] shrink-0">
                    {formatCompact(val)}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right: Clean Compact SVG Spatial Map */}
      <div className="lg:col-span-7 xl:col-span-8 relative px-4 py-2 flex items-center justify-center min-h-[220px] max-h-[252px] overflow-hidden">
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          role="img"
          aria-label="แผนที่ความหนาแน่นโปรโมชั่น 77 จังหวัดในประเทศไทย"
          className="h-[225px] w-auto select-none"
        >
          <path
            d={THAILAND_SVG_PATH}
            className="fill-[var(--color-background-muted)] stroke-[var(--color-border-emphasized)]"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          {provinces.map((prov) => {
            const pt = projectThailand(prov.lat, prov.lng);
            const val = getMetricValue(prov);
            const hasData = val > 0;
            const isSelected = selectedProvinceId === prov.provinceId;
            const isHovered = hoveredId === prov.provinceId;
            const ratio =
              hasData && maxVal > 0
                ? Math.log(val + 1) / Math.log(maxVal + 1)
                : 0;
            const radius = hasData ? 4.5 + ratio * 9 : 2.5;
            const fill = getHeatFill(val, maxVal);
            return (
              <g
                key={prov.provinceId}
                onClick={() => onSelectProvince(isSelected ? null : prov.provinceId)}
                onMouseEnter={() => setHoveredId(prov.provinceId)}
                onMouseLeave={() => setHoveredId(null)}
                className="cursor-pointer"
              >
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={radius}
                  fill={fill}
                  stroke={
                    isSelected || isHovered
                      ? "var(--color-text-primary)"
                      : "#ffffff"
                  }
                  strokeWidth={isSelected || isHovered ? 2 : hasData ? 1.2 : 0.6}
                  opacity={hasData ? 0.94 : 0.65}
                />
              </g>
            );
          })}
        </svg>

        {/* Inline Hover / Selection Readout */}
        {(hoveredProvince || selectedProvince) && (
          <div className="absolute top-2.5 right-4 flex items-center gap-2 text-[12px] text-[var(--color-text-primary)]">
            <span className="font-semibold">
              {(hoveredProvince ?? selectedProvince)!.nameTh}
            </span>
            <span className="text-[var(--color-text-secondary)] tabular-nums">
              {(hoveredProvince ?? selectedProvince)!.placesCount} ร้าน ·{" "}
              {(hoveredProvince ?? selectedProvince)!.activePromosCount} โปร
            </span>
            {selectedProvince && (
              <button
                type="button"
                onClick={() => onSelectProvince(null)}
                className="h-5 px-2 rounded-full bg-[var(--color-background-muted)] text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                <span>ล้าง</span>
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
