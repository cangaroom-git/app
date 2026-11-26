"use client";

import React from "react";
import { useStudio } from "@/components/studio/StudioContext";
import { StudioReviewsPanel } from "@/components/studio/StudioReviewsAndMenuTab";

export default function StudioReviewsPage() {
  const { data, reload, notify } = useStudio();

  return (
    <div className="cgr-admin-page">
      <div className="cgr-admin-body py-6 sm:py-8">
        <StudioReviewsPanel
          key={data.hotel.id}
          data={data}
          onReload={reload}
          onNotify={notify}
        />
      </div>
    </div>
  );
}
