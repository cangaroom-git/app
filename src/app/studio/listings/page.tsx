"use client";

import React from "react";
import { useStudio } from "@/components/studio/StudioContext";
import { StudioPropertyTab } from "@/components/studio/StudioPropertyTab";

export default function StudioListingsPage() {
  const { data, reload, notify, buildHref } = useStudio();

  return (
    <StudioPropertyTab
      key={data.hotel.id}
      data={data}
      initialSection="rooms"
      buildHref={buildHref}
      onReload={reload}
      onNotify={notify}
    />
  );
}
