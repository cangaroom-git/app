import React from "react";
import { getAdminOverviewData } from "@/lib/services/adminDashboardService";
import { AdminOverviewClient } from "@/components/admin/AdminOverviewClient";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const data = await getAdminOverviewData();
  return <AdminOverviewClient data={data} />;
}
