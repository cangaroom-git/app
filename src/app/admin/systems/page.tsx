import React, { Suspense } from "react";
import { AdminSystemsClient } from "@/components/admin/systems/AdminSystemsClient";

export const dynamic = "force-dynamic";

export default function AdminSystemsPage() {
  return (
    <Suspense
      fallback={
        <div className="cgr-admin-page">
          <div className="cgr-admin-body p-6">
            <div className="max-w-[1360px] mx-auto h-72 rounded-[22px] bg-[var(--color-background-muted)] cgr-skeleton-block" />
          </div>
        </div>
      }
    >
      <AdminSystemsClient />
    </Suspense>
  );
}
