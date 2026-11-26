import React, { Suspense } from "react";
import { AdminPlacesClient } from "@/components/admin/places/AdminPlacesClient";

export const dynamic = "force-dynamic";

export default function AdminPlacesPage() {
  return (
    <Suspense
      fallback={
        <div className="cgr-admin-page">
          <div className="cgr-admin-body py-6">
            <div className="space-y-4">
              <div className="h-12 rounded-[16px] bg-[var(--color-background-muted)] cgr-skeleton-block" />
              <div className="h-64 rounded-[22px] bg-[var(--color-background-muted)] cgr-skeleton-block" />
            </div>
          </div>
        </div>
      }
    >
      <AdminPlacesClient />
    </Suspense>
  );
}
