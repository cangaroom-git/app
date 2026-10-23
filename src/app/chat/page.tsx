"use client";

import React from "react";
import {
  useHotelApp,
  formatShortDate,
} from "@/components/HotelAppShell";
import { AiBookingChatView } from "@/components/AiBookingChatView";

export default function ChatPage() {
  const {
    propertyConfig,
    lang,
    checkIn,
    checkOut,
    nights,
    guests,
    setGuests,
    rooms,
    roomStatusMap,
    coupons,
    appliedCouponCode,
    handleApplyCoupon,
    addons,
    selectedAddons,
    toggleAddon,
    weather,
    openRoomDrawer,
    navigateToTab,
    pendingChatPrompt,
    setPendingChatPrompt,
  } = useHotelApp();

  return (
    <AiBookingChatView
      propertyNameTh={propertyConfig.nameTh}
      propertyNameEn={propertyConfig.nameEn}
      lang={lang}
      checkIn={checkIn}
      checkOut={checkOut}
      nights={nights}
      guests={guests}
      setGuests={setGuests}
      rooms={rooms}
      roomStatusMap={roomStatusMap}
      coupons={coupons}
      appliedCouponCode={appliedCouponCode}
      onApplyCoupon={(code) => handleApplyCoupon(code)}
      addons={addons}
      selectedAddons={selectedAddons}
      onToggleAddon={toggleAddon}
      weather={weather}
      formatShortDate={(d) => formatShortDate(d, lang)}
      onOpenRoomDetails={(rm) => openRoomDrawer(rm, "details")}
      onSwitchToBookTab={() => navigateToTab("room")}
      onExitChat={() => navigateToTab("home")}
      initialPrompt={pendingChatPrompt}
      onConsumeInitialPrompt={() => setPendingChatPrompt(null)}
    />
  );
}
