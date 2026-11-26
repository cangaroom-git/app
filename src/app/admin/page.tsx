import React from "react";
import { requireSuperAdminPage } from "@/lib/admin/requireAdmin";
import { getAdminOverviewData } from "@/lib/services/adminDashboardService";
import { AdminOverviewClient } from "@/components/admin/AdminOverviewClient";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const [adminUser, data] = await Promise.all([
    requireSuperAdminPage(),
    getAdminOverviewData(),
  ]);

  return (
    <AdminOverviewClient
      adminName={adminUser.name || adminUser.email || "Admin"}
      data={data}
    />
  );
}
