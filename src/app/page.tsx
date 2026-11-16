"use client";

import React, { useState } from "react";
import { Play, Star } from "lucide-react";
import { pickLocalizedText } from "@/data/cmsDefaults";
import { useHotelApp } from "@/components/HotelAppShell";
import { EditSpotButton } from "@/components/cms/AdminEditOverlay";
import { ResortHeroHeader } from "@/components/home/ResortHeroHeader";
import { RoomFeedCard } from "@/components/home/RoomFeedCard";
import { ShortVideoCard } from "@/components/home/ShortVideoCard";

export default function HomePage() {
  const {
    propertyConfig,
    rooms,
    lang: language,
    setCheckIn,
    setCheckOut,
    nights: stayNights,
    roomStatusMap,
    findNextAvailableRangeForRoom,
    openRoomDrawer,
    navigateToTab,
    openShortsAt,
    cms,
    canShowEditControls,
    openCmsEditor,
  } = useHotelApp();

  const [likedRoomsById, setLikedRoomsById] = useState<Record<string, boolean>>(
    {}
  );
  const [recentlySharedRoomId, setRecentlySharedRoomId] = useState<
    string | null
  >(null);

  const activeShorts = cms.shortsPage.videos.filter(
    (video) => video.isActive !== false
  );
  const sortedShorts = [...activeShorts].sort(
    (a, b) => Number(Boolean(b.isPinned)) - Number(Boolean(a.isPinned))
  );
  const featuredShorts = sortedShorts.slice(0, 4);

  const featuredReviews = cms.reviews
    .filter((reviewItem) => reviewItem.isFeaturedOnBooking !== false)
    .slice(0, 3);

  const handleToggleRoomLike = (roomId: string) => {
    setLikedRoomsById((prev) => ({ ...prev, [roomId]: !prev[roomId] }));
  };

  const handleShareRoomLink = async (roomTitle: string, roomId: string) => {
    const roomShareUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/booking?room=${roomId}`
        : "";
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: roomTitle,
          text: `${roomTitle} — ${propertyConfig.nameTh}`,
          url: roomShareUrl,
        });
        return;
      } catch {
        // fallback to clipboard
      }
    }
    if (
      typeof navigator !== "undefined" &&
      navigator.clipboard &&
      roomShareUrl
    ) {
      navigator.clipboard.writeText(roomShareUrl);
    }
    setRecentlySharedRoomId(roomId);
    setTimeout(() => setRecentlySharedRoomId(null), 1800);
  };

  return (
    <div className="w-full min-w-0 flex flex-col gap-3.5 sm:gap-4 select-none">
      {/* 1. FACEBOOK PAGE COVER & PROFILE HEADER CARD */}
      <ResortHeroHeader
        cmsEditType="home-hero"
        onBookClick={() => {
          const roomsEl = document.getElementById("home-rooms-feed");
          if (roomsEl) {
            roomsEl.scrollIntoView({ behavior: "smooth" });
          } else {
            navigateToTab("book");
          }
        }}
        onChatClick={() => navigateToTab("chat")}
      />

      {/* 2. FACEBOOK REELS STRIP CARD */}
      {featuredShorts.length > 0 && (
        <section className="app-card p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="ty-subtitle font-bold flex items-center gap-2">
              <Play className="w-4 h-4 fill-[var(--color-accent)] text-[var(--color-accent)] shrink-0" />
              <span>
                {language === "th"
                  ? "คลิปบรรยากาศจริง (Reels)"
                  : "Reels & Short Videos"}
              </span>
            </h2>

            <div className="flex items-center gap-2">
              {canShowEditControls && (
                <EditSpotButton
                  icon="add"
                  label="เพิ่มคลิปสั้น"
                  onClick={() => openCmsEditor({ type: "short-video" })}
                />
              )}
              <button
                type="button"
                onClick={() => navigateToTab("shorts")}
                className="ty-body font-semibold text-[var(--color-accent)] hover:underline cursor-pointer"
              >
                {language === "th" ? "ดูทั้งหมด" : "See all"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            {featuredShorts.map((shortVideo, videoIndex) => {
              const linkedRoom =
                rooms.find((r) => r.id === shortVideo.roomId) ??
                rooms[shortVideo.roomIndex] ??
                rooms[0];

              const originalIdx = cms.shortsPage.videos.findIndex(
                (v) => v.id === shortVideo.id
              );

              return (
                <div key={shortVideo.id} className="relative">
                  <ShortVideoCard
                    id={shortVideo.id}
                    title={pickLocalizedText(
                      language,
                      shortVideo.titleTh,
                      shortVideo.titleEn
                    )}
                    roomCode={linkedRoom?.code}
                    posterUrl={shortVideo.posterUrl}
                    viewsCount={shortVideo.views}
                    priceThb={linkedRoom?.basePriceThb}
                    discountPercent={linkedRoom?.discountPercent}
                    isPinned={Boolean(shortVideo.isPinned || videoIndex === 0)}
                    onCardClick={() =>
                      openShortsAt(originalIdx >= 0 ? originalIdx : videoIndex)
                    }
                  />

                  {canShowEditControls && (
                    <div className="absolute top-12 right-2 z-20">
                      <EditSpotButton
                        onClick={() =>
                          openCmsEditor({
                            type: "short-video",
                            videoId: shortVideo.id,
                          })
                        }
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 3. CLEAN SOCIAL ROOM FEED CARDS */}
      <section id="home-rooms-feed" className="scroll-mt-16 space-y-3.5 sm:space-y-4">
        {canShowEditControls && (
          <div className="app-card px-4 py-3 flex items-center justify-between gap-2">
            <span className="ty-subtitle font-bold">
              จัดการห้องพัก ({rooms.length} หลัง)
            </span>
            <EditSpotButton
              icon="add"
              label="เพิ่มห้องพักใหม่"
              onClick={() => openCmsEditor({ type: "room" })}
            />
          </div>
        )}

        {rooms.map((room, roomIndex) => {
          const roomStatus = roomStatusMap[room.id];
          const isRoomAvailable =
            roomStatus?.state === "AVAILABLE" &&
            (roomStatus?.availableUnits ?? 0) > 0;
          const nextAvailableRange = !isRoomAvailable
            ? findNextAvailableRangeForRoom(room)
            : null;

          return (
            <RoomFeedCard
              key={room.id}
              room={room}
              roomIndex={roomIndex}
              language={language}
              stayNights={stayNights}
              roomStatus={roomStatus}
              nextAvailableRange={nextAvailableRange}
              isLiked={Boolean(likedRoomsById[room.id])}
              isShared={recentlySharedRoomId === room.id}
              onToggleLike={() => handleToggleRoomLike(room.id)}
              onShareRoom={() =>
                handleShareRoomLink(
                  pickLocalizedText(language, room.nameTh, room.nameEn),
                  room.id
                )
              }
              onSelectNextAvailableDates={(nextCheckIn, nextCheckOut) => {
                setCheckIn(nextCheckIn);
                setCheckOut(nextCheckOut);
              }}
              onOpenRoomDetails={(initialPhotoIndex) =>
                openRoomDrawer(room, "details", initialPhotoIndex ?? 0)
              }
              onBookRoom={() => openRoomDrawer(room, "calendar")}
              onEditRoom={
                canShowEditControls
                  ? () => openCmsEditor({ type: "room", roomId: room.id })
                  : undefined
              }
            />
          );
        })}
      </section>

      {/* 4. GUEST REVIEWS CARD */}
      {featuredReviews.length > 0 && (
        <section className="app-card p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="ty-subtitle font-bold flex items-center gap-1.5">
              <Star className="w-4 h-4 fill-[var(--color-warning)] text-[var(--color-warning)] shrink-0" />
              <span>
                {language === "th"
                  ? "รีวิวจากผู้เข้าพักจริง"
                  : "Verified Guest Reviews"}
              </span>
            </h2>
            <button
              type="button"
              onClick={() => navigateToTab("review")}
              className="ty-body font-semibold text-[var(--color-accent)] hover:underline cursor-pointer"
            >
              {language === "th" ? "ดูทั้งหมด" : "See all"}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {featuredReviews.map((rev) => (
              <div
                key={rev.id}
                onClick={() => navigateToTab("review")}
                className="rounded-[10px] bg-[var(--color-background-muted)] p-3.5 flex flex-col justify-between gap-2.5 cursor-pointer hover:bg-[var(--color-background-subtle)]/70 transition"
              >
                <p className="ty-body line-clamp-3">
                  “{pickLocalizedText(language, rev.captionTh, rev.captionEn)}”
                </p>
                <div className="flex items-center justify-between gap-2 ty-caption">
                  <span className="font-semibold text-[var(--color-text-primary)] truncate">
                    {pickLocalizedText(
                      language,
                      rev.authorNameTh,
                      rev.authorNameEn
                    )}
                  </span>
                  <span className="font-bold text-[var(--color-accent)] shrink-0">
                    ★ {rev.rating}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
