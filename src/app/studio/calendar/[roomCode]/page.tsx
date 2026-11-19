"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { useStudio } from "@/components/studio/StudioContext";
import { StudioCalendarTab } from "@/components/studio/StudioCalendarTab";

export default function StudioRoomCalendarPage() {
  const router = useRouter();
  const params = useParams<{ roomCode?: string }>();
  const roomCode = typeof params?.roomCode === "string" ? params.roomCode : null;
  const { data, reload, notify, buildHref } = useStudio();

  return (
    <StudioCalendarTab
      key={data.hotel.id}
      data={data}
      initialRoomCode={roomCode}
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
