import type { Metadata } from "next";
import React from "react";
import { requireSuperAdminPage } from "@/lib/admin/requireAdmin";
import { getAdminSidebarCounts } from "@/lib/services/adminDashboardService";
import { AdminShell } from "@/components/admin/AdminShell";

export const metadata: Metadata = {
  title: "Admin Center | Nondii",
  description: "ศูนย์ควบคุมโปรโมชั่น สถานที่ และระบบหลังบ้าน Nondii",
};

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const adminUser = await requireSuperAdminPage();
  const counts = await getAdminSidebarCounts();

  return (
    <AdminShell
      adminName={adminUser.name}
      adminEmail={adminUser.email}
      counts={counts}
    >
      {children}
    </AdminShell>
  );
}
