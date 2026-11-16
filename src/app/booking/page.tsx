"use client";

import React, { useEffect, useState } from "react";
import { Instagram, Play, Star } from "lucide-react";
import { pickLocalizedText } from "@/data/cmsDefaults";
import { useHotelApp } from "@/components/HotelAppShell";
import { EditSpotButton } from "@/components/cms/AdminEditOverlay";
import { ResortHeroHeader } from "@/components/home/ResortHeroHeader";
import { RoomFeedCard } from "@/components/home/RoomFeedCard";
import { ShortVideoCard } from "@/components/home/ShortVideoCard";

export default function BookingPage() {
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

  const [activeFeedView] = useState<"rooms" | "shorts">("rooms");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<
    string | null
  >(null);
  const [likedRoomsById, setLikedRoomsById] = useState<Record<string, boolean>>(
    {}
  );
  const [recentlySharedRoomId, setRecentlySharedRoomId] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const categoryParam = params.get("category");
    if (categoryParam) {
      setSelectedCategoryFilter(categoryParam);
    }
    const targetRoomId = params.get("room");
    if (targetRoomId && rooms.length > 0) {
      const targetElement = document.getElementById(
        `room-card-${targetRoomId}`
      );
      targetElement?.scrollIntoView({ behavior: "smooth" });
    }
  }, [rooms]);

  const handleToggleRoomLike = (roomId: string) => {
    setLikedRoomsById((previous) => ({
      ...previous,
      [roomId]: !previous[roomId],
    }));
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
        // Fallback to clipboard copy
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

  const sectionVisibility = propertyConfig.sectionsVisibility;

  const filteredRooms = rooms.filter((room) => {
    if (!selectedCategoryFilter || selectedCategoryFilter === "all") {
      return true;
    }
    const matchingChip = cms.bookingPage.categoryChips.find(
      (chip) => chip.id === selectedCategoryFilter
    );
    if (matchingChip?.codePrefix) {
      return room.code
        .toUpperCase()
        .startsWith(matchingChip.codePrefix.toUpperCase());
    }
    return true;
  });

  const featuredReviews = cms.reviews.filter(
    (reviewItem) => reviewItem.isFeaturedOnBooking !== false
  );

  const activeShorts = cms.shortsPage.videos.filter(
    (video) => video.isActive !== false
  );

  return (
    <>
      {/* 1. Resort Hero Header & Quick Action Pills (#overview) */}
      {sectionVisibility.heroSection && (
        <ResortHeroHeader
          id="overview"
          activeCategoryFilter={selectedCategoryFilter}
          onSelectCategoryFilter={(categoryId) => {
            setSelectedCategoryFilter(categoryId);
            if (categoryId === "sapan-attractions") {
              navigateToTab("guide");
            }
          }}
          onBookClick={() => {
            const roomsAnchor = document.getElementById("rooms");
            if (roomsAnchor) {
              roomsAnchor.scrollIntoView({ behavior: "smooth" });
            } else if (rooms[0]) {
              openRoomDrawer(rooms[0], "calendar");
            }
          }}
          onChatClick={() => navigateToTab("chat")}
        />
      )}

      {/* 2. Optional 9:16 Short Videos Grid */}
      {activeFeedView === "shorts" && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="ty-title flex items-center gap-2">
              <Play className="w-4 h-4 fill-[var(--color-accent)] text-[var(--color-accent)]" />
              <span>
                {language === "th" ? "วิดีโอสั้นทั้งหมด" : "Short Videos"}
              </span>
            </h2>
            <span className="ty-caption">
              {activeShorts.length} {language === "th" ? "วิดีโอ" : "videos"}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {activeShorts.map((shortVideo, videoIndex) => {
              const linkedRoom =
                rooms.find((r) => r.id === shortVideo.roomId) ??
                rooms[shortVideo.roomIndex];
              return (
                <ShortVideoCard
                  key={shortVideo.id}
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
                  isPinned={videoIndex === 0}
                  onCardClick={() => openShortsAt(videoIndex)}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* 3. Centered Room Feed Cards */}
      <section id="rooms" className="scroll-mt-16 space-y-3.5 sm:space-y-4">
        {canShowEditControls && (
          <div className="app-card px-4 py-3 flex items-center justify-between gap-2">
            <span className="ty-subtitle font-bold">
              จัดการรายการห้องพัก ({rooms.length} หลัง)
            </span>
            <EditSpotButton
              icon="add"
              label="เพิ่มห้องพัก / วิลล่าใหม่"
              onClick={() => openCmsEditor({ type: "room" })}
            />
          </div>
        )}

        {filteredRooms.map((room, roomIndex) => {
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

      {/* 4. Verified Guest Reviews Section (#reviews) */}
      {sectionVisibility.galleryAndReviewsSection && (
        <section id="reviews" className="space-y-4 pt-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="ty-title flex items-center gap-2">
              <Star className="w-5 h-5 text-[var(--color-warning)] fill-current shrink-0" />
              <span>
                {pickLocalizedText(
                  language,
                  cms.bookingPage.reviewsHeadingTh,
                  cms.bookingPage.reviewsHeadingEn
                )}
              </span>
            </h2>

            <div className="flex flex-wrap items-center gap-2">
              {canShowEditControls && (
                <EditSpotButton
                  icon="add"
                  label="เพิ่มรีวิวลูกค้า"
                  onClick={() => openCmsEditor({ type: "review" })}
                />
              )}

              <button
                type="button"
                onClick={() => navigateToTab("review")}
                className="btn-fw-secondary cursor-pointer"
              >
                <span>
                  {language === "th" ? "ดูรีวิวทั้งหมด →" : "All Reviews →"}
                </span>
              </button>
              <a
                href={cms.bookingPage.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-fw-secondary"
              >
                <Instagram className="w-4 h-4" />
                <span>{cms.bookingPage.instagramHandle}</span>
              </a>
            </div>
          </div>

          <div className="w-full min-w-0 flex gap-3 overflow-x-auto overflow-y-hidden lg:overflow-visible overscroll-x-contain touch-manipulation no-scrollbar snap-x snap-proximity lg:snap-none lg:grid lg:grid-cols-3 sm:gap-4">
            {featuredReviews.map((reviewItem) => (
              <article
                key={reviewItem.id}
                onClick={() => navigateToTab("review")}
                className="relative snap-start shrink-0 w-[268px] sm:w-[300px] lg:w-auto rounded-[16px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)]/75 overflow-hidden flex flex-col justify-between cursor-pointer transition"
              >
                <div className="relative h-36 w-full bg-[var(--color-background-subtle)]">
                  <img
                    src={reviewItem.photos[0]}
                    alt={reviewItem.roomLabel}
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                    className="h-full w-full object-cover select-none pointer-events-none"
                  />
                  {canShowEditControls && (
                    <div className="absolute top-2.5 right-2.5 z-20">
                      <EditSpotButton
                        onClick={() =>
                          openCmsEditor({
                            type: "review",
                            reviewId: reviewItem.id,
                          })
                        }
                      />
                    </div>
                  )}
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                  <p className="ty-body line-clamp-2">
                    &ldquo;
                    {pickLocalizedText(
                      language,
                      reviewItem.captionTh,
                      reviewItem.captionEn
                    )}
                    &rdquo;
                  </p>

                  <div className="flex items-center justify-between gap-2 ty-caption">
                    <span className="font-bold text-[var(--color-text-primary)] truncate">
                      {pickLocalizedText(
                        language,
                        reviewItem.authorNameTh,
                        reviewItem.authorNameEn
                      )}{" "}
                      · {reviewItem.roomCode}
                    </span>
                    <span className="inline-flex items-center gap-1 font-bold text-[var(--color-text-primary)] shrink-0">
                      <Star className="w-3.5 h-3.5 fill-[var(--color-warning)] text-[var(--color-warning)]" />
                      <span>{reviewItem.rating}</span>
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
