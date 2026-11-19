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
  const section = resolveListingSection(
    typeof params?.section === "string" ? params.section : "rooms"
  );
  const { data, reload, notify, buildHref } = useStudio();

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
