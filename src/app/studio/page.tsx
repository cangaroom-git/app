"use client";

import React from "react";
import { useStudio } from "@/components/studio/StudioContext";
import { StudioOverviewClient } from "@/components/studio/StudioOverviewClient";

export default function StudioTodayPage() {
  const { data, reload, notify, buildHref } = useStudio();

  return (
    <StudioOverviewClient
      key={data.hotel.id}
      data={data}
      buildHref={buildHref}
      onReload={reload}
      onNotify={notify}
    />
  );
}
