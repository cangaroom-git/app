"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Package, Sparkles, Store, TicketPercent } from "lucide-react";
import { ThailandReachMapCard } from "@/components/admin/ThailandReachMapCard";
import { AdminStatsTable } from "@/components/admin/AdminStatsTable";
import {
  WorkspaceKpiBand,
  WorkspacePageHeader,
  WorkspaceSection,
  type WorkspaceKpiItem,
} from "@/components/workspace/WorkspacePrimitives";
import type { AdminOverviewData } from "@/lib/services/adminDashboardService";

interface AdminOverviewClientProps {
  adminName: string;
  data: AdminOverviewData;
}

function getThaiGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "สวัสดีตอนเช้า";
  if (hour < 17) return "สวัสดีตอนบ่าย";
  return "สวัสดีตอนเย็น";
}

/**
 * Unified Nondii Clean Minimal Overview (`/admin`)
 * Uses canonical `<WorkspacePageHeader />`, `<WorkspaceKpiBand />`, and `<WorkspaceSection />`
 * so typography (Plus Jakarta Sans + Anuphan, max 600) and 8px spacing stay 100% identical to `/studio`.
 */
export function AdminOverviewClient({
  adminName,
  data,
}: AdminOverviewClientProps) {
  const [selectedProvinceId, setSelectedProvinceId] = useState<string | null>(
    null,
  );
  const greeting = getThaiGreeting();

  const stats: WorkspaceKpiItem[] = [
    {
      icon: TicketPercent,
      label: "คิวโปรโมชั่นรอตรวจ",
      sublabel:
        data.kpis.pendingInboxCount > 0
          ? "มีรายการรออนุมัติขึ้นหน้าฟีด"
          : "ไม่มีรายการค้างตรวจในขณะนี้",
      value: data.kpis.pendingInboxCount,
      urgent: data.kpis.pendingInboxCount > 0,
      href: "/admin/promos?tab=inbox",
    },
    {
      icon: Package,
      label: "โปรโมชั่นที่เผยแพร่อยู่",
      sublabel: "รวมทุกหมวดหมู่ทั่วประเทศ",
      value: data.kpis.activePromosCount,
      urgent: false,
      href: "/admin/promos",
    },
    {
      icon: Store,
      label: "สถานที่ & แบรนด์ทั้งหมด",
      sublabel: `ครอบคลุมแล้ว ${data.kpis.provincesCoveredCount} จังหวัด`,
      value: data.kpis.totalPlacesCount,
      urgent: false,
      href: "/admin/places",
    },
  ];

  return (
    <div className="cgr-admin-page">
      <div className="cgr-admin-body py-8 overflow-auto no-scrollbar">
        <div style={{ overflowX: "clip" }}>
          <WorkspacePageHeader
            eyebrow={`${greeting}, ${adminName}`}
            title="ศูนย์ควบคุมระบบ Nondii"
            actions={
              <Link
                href="/admin/promos"
                className="h-10 px-5 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] ws-body-strong inline-flex items-center gap-2 transition-colors"
              >
                <Sparkles className="w-4 h-4 text-[var(--color-accent-yellow)]" />
                <span>จัดการโปรโมชั่น</span>
              </Link>
            }
          />

          <WorkspaceKpiBand items={stats} />

          <WorkspaceSection bordered>
            <ThailandReachMapCard
              provinces={data.provinceReach}
              performanceRows={data.performanceRows}
              provincesCoveredCount={data.kpis.provincesCoveredCount}
              activePromosCount={data.kpis.activePromosCount}
              totalEngagementCount={data.kpis.totalEngagementCount}
              selectedProvinceId={selectedProvinceId}
              onSelectProvince={setSelectedProvinceId}
            />
          </WorkspaceSection>

          <WorkspaceSection
            title="สถิติโปรโมชั่นและสถานที่"
            subtitle="ติดตามยอดเข้าชม ยอดบันทึก Wishlist และยอดคลิกจากนักเดินทางทั่วประเทศ"
            bordered={false}
          >
            <AdminStatsTable
              rows={data.performanceRows}
              selectedProvinceId={selectedProvinceId}
              onClearProvince={() => setSelectedProvinceId(null)}
            />
          </WorkspaceSection>
        </div>
      </div>
    </div>
  );
}
