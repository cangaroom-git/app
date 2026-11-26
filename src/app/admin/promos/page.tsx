import React, { Suspense } from "react";
import { AdminPromosClient } from "@/components/admin/promos/AdminPromosClient";

export const dynamic = "force-dynamic";

export default function AdminPromosPage() {
  return (
    <Suspense
      fallback={
        <div className="cgr-admin-page">
          <div className="cgr-admin-body p-6">
            <div className="max-w-[1360px] mx-auto space-y-4">
              <div className="h-12 rounded-[16px] bg-[var(--color-background-muted)] cgr-skeleton-block" />
              <div className="h-64 rounded-[22px] bg-[var(--color-background-muted)] cgr-skeleton-block" />
            </div>
          </div>
        </div>
      }
    >
      <AdminPromosClient />
    </Suspense>
  );
}
