"use client";

import React from "react";
import { useHotelApp } from "@/components/HotelAppShell";
import { useStudio } from "@/components/studio/StudioContext";
import { StudioMobileMenuTab } from "@/components/studio/StudioReviewsAndMenuTab";

export default function StudioMenuPage() {
  const { user, theme, toggleTheme, lang, setLang } = useHotelApp();
  const { data, reload, notify, switchHotel } = useStudio();

  if (!user) return null;

  return (
    <div className="flex-1 w-full px-4 sm:px-8 lg:px-12 py-8 lg:py-10">
      <div className="max-w-[760px] mx-auto">
        <StudioMobileMenuTab
          key={data.hotel.id}
          data={data}
          user={user}
          theme={theme}
          lang={lang}
          onToggleTheme={toggleTheme}
          onToggleLang={() => setLang(lang === "th" ? "en" : "th")}
          onSwitchHotel={switchHotel}
          onReload={reload}
          onNotify={notify}
        />
      </div>
    </div>
  );
}
