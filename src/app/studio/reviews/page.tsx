"use client";

import React from "react";
import { useStudio } from "@/components/studio/StudioContext";
import { StudioReviewsPanel } from "@/components/studio/StudioReviewsAndMenuTab";

export default function StudioReviewsPage() {
  const { data, reload, notify } = useStudio();

  return (
    <div className="flex-1 w-full px-4 sm:px-8 lg:px-10 py-8 lg:py-10">
      <div className="max-w-[1360px] mx-auto">
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
