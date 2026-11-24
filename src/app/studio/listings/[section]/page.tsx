"use client";

import React from "react";
import { useParams } from "next/navigation";
import { useStudio } from "@/components/studio/StudioContext";
import {
  resolveListingSection,
  StudioPropertyTab,
} from "@/components/studio/StudioPropertyTab";

export default function StudioListingsSectionPage() {
  const params = useParams<{ section?: string }>();
  const { data, reload, notify, buildHref } = useStudio();
  const fallbackSection =
    data.hotel.merchantMode === "PROFILE_ONLY" ? "about" : "rooms";
  const section = resolveListingSection(
    typeof params?.section === "string" ? params.section : fallbackSection
  );

  return (
    <StudioPropertyTab
      key={data.hotel.id}
      data={data}
      initialSection={section}
      buildHref={buildHref}
      onReload={reload}
      onNotify={notify}
    />
  );
}
