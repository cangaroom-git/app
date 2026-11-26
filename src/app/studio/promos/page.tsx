"use client";

import React from "react";
import { useStudio } from "@/components/studio/StudioContext";
import { StudioPromosClient } from "@/components/studio/StudioPromosClient";

export default function StudioPromosPage() {
  const { data, reload, notify } = useStudio();

  return (
    <StudioPromosClient
      key={data.hotel.id}
      data={data}
      onReload={reload}
      onNotify={notify}
    />
  );
}
