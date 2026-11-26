"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Map as MapIcon } from "lucide-react";
import { ThailandReachMapCard } from "@/components/admin/ThailandReachMapCard";
import { AdminStatsTable } from "@/components/admin/AdminStatsTable";
import type { AdminOverviewData } from "@/lib/services/adminDashboardService";

interface AdminOverviewClientProps {
  data: AdminOverviewData;
}

export function AdminOverviewClient({ data }: AdminOverviewClientProps) {
  const [selectedProvinceId, setSelectedProvinceId] = useState<string | null>(
    null
  );
  const [showMap, setShowMap] = useState(true);

  const kpis = [
    {
      label: "Promo Inbox รออนุมัติ",
      value: data.kpis.pendingInboxCount,
      meta: "รอตรวจขึ้นหน้าแรก",
      href: "/admin/promos?tab=inbox",
      dot: data.kpis.pendingInboxCount > 0 ? "#e60023" : "#1e78d6",
    },
    {
      label: "โปรโมชั่นใช้งานอยู่",
      value: data.kpis.activePromosCount,
      meta:
        data.kpis.expiringSoonCount > 0
          ? `ใกล้หมดเขต ${data.kpis.expiringSoonCount}`
          : "สดใหม่ทั้งหมด",
      href: "/admin/promos",
      dot: "#1e78d6",
    },
    {
      label: "สถานที่ & แบรนด์ทั้งหมด",
      value: data.kpis.totalPlacesCount,
      meta: `ครอบคลุม ${data.kpis.provincesCoveredCount}/77 จังหวัด`,
      href: "/admin/places",
      dot: "#529D48",
    },
    {
      label: "รอ Verified / รายงาน",
      value: data.kpis.pendingPlacesCount + data.kpis.openReportsCount,
      meta: `รอตรวจ ${data.kpis.pendingPlacesCount} · แจ้งปัญหา ${data.kpis.openReportsCount}`,
      href: "/admin/places?status=PENDING_REVIEW",
      dot: "#D47E35",
    },
  ];

  return (
    <div className="cgr-admin-page">
      {/* Compact Flush Top Bar */}
      <div className="cgr-admin-toolbar">
        <div className="flex items-center gap-2.5">
          <h1 className="text-[14.5px] font-bold text-[var(--color-text-primary)]">
            ภาพรวมระบบ (Overview)
          </h1>
          <span className="text-[12px] text-[var(--color-text-secondary)] hidden sm:inline tabular-nums">
            {data.kpis.totalPlacesCount.toLocaleString()} แห่ง ·{" "}
            {data.kpis.activePromosCount.toLocaleString()} โปร ·{" "}
            {data.kpis.provincesCoveredCount}/77 จังหวัด
          </span>
        </div>

        <button
          type="button"
          onClick={() => setShowMap((v) => !v)}
          className={`h-7.5 px-3 rounded-full text-[12px] font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
            showMap
              ? "bg-[var(--color-background-muted)] text-[var(--color-text-primary)] hover:bg-[var(--color-background-subtle)]"
              : "bg-[var(--color-accent)] !text-[var(--color-on-accent)]"
          }`}
        >
          <MapIcon className="w-3.5 h-3.5" />
          <span>{showMap ? "ซ่อนแผนที่" : "แสดงแผนที่ 77 จังหวัด"}</span>
        </button>
      </div>

      {/* Flush High-Density KPI Strip (border-b, zero outer box divs) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-[var(--color-border)] border-b border-[var(--color-border)] shrink-0">
        {kpis.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="px-4 py-2.5 hover:bg-[var(--color-background-muted)]/60 transition-colors flex items-center justify-between gap-2 min-w-0"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[11.5px] text-[var(--color-text-secondary)]">
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.dot }}
                />
                <span className="truncate">{item.label}</span>
              </div>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-[20px] font-bold tracking-[-0.02em] text-[var(--color-text-primary)] tabular-nums leading-none">
                  {item.value.toLocaleString()}
                </span>
                <span className="text-[11px] text-[var(--color-text-tertiary)] truncate">
                  {item.meta}
                </span>
              </div>
            </div>
            <ArrowUpRight className="w-3.5 h-3.5 text-[var(--color-text-tertiary)] shrink-0" />
          </Link>
        ))}
      </div>

      {/* Optional Slim Collapsible 77-Province Reach Strip */}
      {showMap && (
        <ThailandReachMapCard
          provinces={data.provinceReach}
          provincesCoveredCount={data.kpis.provincesCoveredCount}
          activePromosCount={data.kpis.activePromosCount}
          totalEngagementCount={data.kpis.totalEngagementCount}
          selectedProvinceId={selectedProvinceId}
          onSelectProvince={setSelectedProvinceId}
        />
      )}

      {/* Full-Bleed Compact Single-Row Performance Table */}
      <AdminStatsTable
        rows={data.performanceRows}
        selectedProvinceId={selectedProvinceId}
        onClearProvince={() => setSelectedProvinceId(null)}
      />
    </div>
  );
}
