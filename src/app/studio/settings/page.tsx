"use client";

import React from "react";
import { useStudio } from "@/components/studio/StudioContext";
import { StudioSettingsClient } from "@/components/studio/StudioSettingsClient";

export default function StudioSettingsPage() {
  const { data, reload, notify, buildHref } = useStudio();

  return (
    <StudioSettingsClient
      key={data.hotel.id}
      data={data}
      buildHref={buildHref}
      onReload={reload}
      onNotify={notify}
    />
  );
}
