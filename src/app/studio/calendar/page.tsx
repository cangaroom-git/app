"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useStudio } from "@/components/studio/StudioContext";
import { StudioCalendarTab } from "@/components/studio/StudioCalendarTab";

export default function StudioCalendarPage() {
  const router = useRouter();
  const { data, reload, notify, buildHref } = useStudio();

  return (
    <StudioCalendarTab
      key={data.hotel.id}
      data={data}
      initialRoomCode={null}
      buildHref={buildHref}
      onNavigateRoomCode={(code) => {
        if (code) {
          router.push(buildHref(`/studio/calendar/${encodeURIComponent(code)}`));
        } else {
          router.push(buildHref("/studio/calendar"));
        }
      }}
      onReload={reload}
      onNotify={notify}
    />
  );
}
