"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useStudio } from "@/components/studio/StudioContext";
import { StudioTodayTab } from "@/components/studio/StudioTodayTab";

export default function StudioTodayPage() {
  const router = useRouter();
  const { data, reload, notify, buildHref } = useStudio();

  return (
    <div className="flex-1 w-full px-4 sm:px-8 lg:px-10 py-8 lg:py-10">
      <div className="max-w-[1360px] mx-auto">
        <StudioTodayTab
          key={data.hotel.id}
          data={data}
          onReload={reload}
          onNotify={notify}
          onNavigateTab={(tab) => {
            if (tab === "calendar") {
              router.push(buildHref("/studio/calendar"));
            } else if (tab === "property") {
              router.push(buildHref("/studio/listings/rooms"));
            } else if (tab === "growth") {
              router.push(buildHref("/studio/listings/promotions"));
            } else {
              router.push(buildHref("/studio"));
            }
          }}
        />
      </div>
    </div>
  );
}
