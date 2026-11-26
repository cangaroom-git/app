"use client";

import React from "react";
import { useStudio } from "@/components/studio/StudioContext";
import { StudioCalendarTab } from "@/components/studio/StudioCalendarTab";

export default function StudioCalendarPage() {
  const { data, reload, notify, buildHref } = useStudio();

  return (
    <StudioCalendarTab
      key={data.hotel.id}
      data={data}
      initialRoomCode={null}
      buildHref={buildHref}
      onNavigateRoomCode={(code) => {
        if (typeof window === "undefined") return;
        const nextUrl = code
          ? buildHref(`/studio/calendar/${encodeURIComponent(code)}`)
          : buildHref("/studio/calendar");
        window.history.replaceState(null, "", nextUrl);
      }}
      onReload={reload}
      onNotify={notify}
    />
  );
}
