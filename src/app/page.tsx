"use client";

import React, { useMemo, useState } from "react";
import { BedDouble, Grid3X3, Heart, Play, Sparkles, UserCheck } from "lucide-react";
import { pickLocalizedText } from "@/data/cmsDefaults";
import { RoomLodge } from "@/data/rooms";
import { useHotelApp } from "@/components/HotelAppShell";
import { EditSpotButton } from "@/components/cms/AdminEditOverlay";
import { ResortHeroHeader } from "@/components/home/ResortHeroHeader";

type GridFilterTab = "all" | "reels" | "rooms" | "reviews";

interface MixedMediaTile {
  id: string;
  kind: "video" | "carousel" | "photo" | "review";
  imageUrl: string;
  title: string;
  subtitle?: string;
  metricLabel?: string;
  isPinned?: boolean;
  onSelect: () => void;
  onEdit?: () => void;
}

/** Exact Instagram Top-Right Multi-Photo Carousel Icon */
function IgCarouselBadgeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-[19px] h-[19px] text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.55)]"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M19 5.5H8.5A2.5 2.5 0 0 0 6 8v10.5A2.5 2.5 0 0 0 8.5 21H19a2.5 2.5 0 0 0 2.5-2.5V8A2.5 2.5 0 0 0 19 5.5Z" />
      <path
        d="M4.5 16.5V6A2.5 2.5 0 0 1 7 3.5h10.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Exact Instagram Top-Right Video / Reel Rounded Play Badge Icon */
function IgVideoBadgeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-[19px] h-[19px] text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.55)]"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M17.5 3.5h-11A3 3 0 0 0 3.5 6.5v11a3 3 0 0 0 3 3h11a3 3 0 0 0 3-3v-11a3 3 0 0 0-3-3Zm-7.25 12.1V8.4a.65.65 0 0 1 .98-.56l6.1 3.6a.65.65 0 0 1 0 1.12l-6.1 3.6a.65.65 0 0 1-.98-.56Z" />
    </svg>
  );
}

export default function HomePage() {
  const {
    rooms,
    lang: language,
    openRoomDrawer,
    openGalleryModal,
    navigateToTab,
    openShortsAt,
    cms,
    canShowEditControls,
    openCmsEditor,
  } = useHotelApp();

  const [activeGridTab, setActiveGridTab] = useState<GridFilterTab>("all");

  const activeShorts = useMemo(
    () => cms.shortsPage.videos.filter((video) => video.isActive !== false),
    [cms.shortsPage.videos]
  );

  // Build unified mixed Instagram-style media tiles (Videos + Room Carousels + Gallery Photos + Guest Reviews)
  const allMixedTiles = useMemo<MixedMediaTile[]>(() => {
    const videoTiles: MixedMediaTile[] = activeShorts.map((vid, idx) => {
      const originalIdx = cms.shortsPage.videos.findIndex(
        (v) => v.id === vid.id
      );
      const linkedRoom =
        rooms.find((r) => r.id === vid.roomId) ?? rooms[vid.roomIndex];
      return {
        id: `vid-${vid.id}`,
        kind: "video",
        imageUrl: vid.posterUrl,
        title: pickLocalizedText(language, vid.titleTh, vid.titleEn),
        subtitle: linkedRoom
          ? `${linkedRoom.code} · ฿${linkedRoom.basePriceThb.toLocaleString()}`
          : undefined,
        metricLabel: vid.views,
        isPinned: Boolean(vid.isPinned),
        onSelect: () => openShortsAt(originalIdx >= 0 ? originalIdx : idx),
        onEdit: () =>
          openCmsEditor({ type: "short-video", videoId: vid.id }),
      };
    });

    const roomTiles: MixedMediaTile[] = rooms.map((room: RoomLodge) => ({
      id: `room-${room.id}`,
      kind: "carousel",
      imageUrl: room.images[0]?.url || "",
      title: pickLocalizedText(language, room.nameTh, room.nameEn),
      subtitle: `฿${room.basePriceThb.toLocaleString()} / ${
        language === "th" ? "คืน" : "night"
      }`,
      metricLabel: `${room.images.length} ${
        language === "th" ? "รูป" : "photos"
      }`,
      onSelect: () => openRoomDrawer(room, "details", 0),
      onEdit: () => openCmsEditor({ type: "room", roomId: room.id }),
    }));

    const reviewTiles: MixedMediaTile[] = cms.reviews
      .filter((rev) => Boolean(rev.photos[0]))
      .map((rev) => ({
        id: `rev-${rev.id}`,
        kind: rev.photos.length > 1 ? "carousel" : "review",
        imageUrl: rev.photos[0],
        title: pickLocalizedText(language, rev.captionTh, rev.captionEn),
        subtitle: `${pickLocalizedText(
          language,
          rev.authorNameTh,
          rev.authorNameEn
        )} · ★ ${rev.rating}`,
        metricLabel: `${rev.likesCount}`,
        onSelect: () => navigateToTab("review"),
        onEdit: () => openCmsEditor({ type: "review", reviewId: rev.id }),
      }));

    const galleryTiles: MixedMediaTile[] = cms.gallery.photos.map((photo) => ({
      id: `gal-${photo.id}`,
      kind: "photo",
      imageUrl: photo.url,
      title: pickLocalizedText(language, photo.captionTh, photo.captionEn),
      onSelect: () => openGalleryModal(null),
      onEdit: () => openCmsEditor({ type: "gallery-photos" }),
    }));

    // Interleave naturally so videos, carousels, and photos blend organically like a real Instagram grid
    const interleaved: MixedMediaTile[] = [];
    const maxLen = Math.max(
      videoTiles.length,
      roomTiles.length,
      reviewTiles.length,
      galleryTiles.length
    );

    const seenUrls = new Set<string>();
    const pushUnique = (tile?: MixedMediaTile) => {
      if (!tile || !tile.imageUrl) return;
      // Keep room & video tiles always; deduplicate extra gallery URLs if identical
      if (tile.kind === "photo" && seenUrls.has(tile.imageUrl)) return;
      seenUrls.add(tile.imageUrl);
      interleaved.push(tile);
    };

    for (let i = 0; i < maxLen; i++) {
      pushUnique(roomTiles[i]);
      pushUnique(videoTiles[i]);
      pushUnique(reviewTiles[i]);
      pushUnique(galleryTiles[i]);
    }

    return interleaved;
  }, [
    activeShorts,
    cms.gallery.photos,
    cms.reviews,
    cms.shortsPage.videos,
    language,
    navigateToTab,
    openCmsEditor,
    openGalleryModal,
    openRoomDrawer,
    openShortsAt,
    rooms,
  ]);

  const displayedTiles = useMemo(() => {
    if (activeGridTab === "reels") {
      return allMixedTiles.filter((t) => t.kind === "video");
    }
    if (activeGridTab === "rooms") {
      return allMixedTiles.filter((t) => t.id.startsWith("room-"));
    }
    if (activeGridTab === "reviews") {
      return allMixedTiles.filter((t) => t.id.startsWith("rev-"));
    }
    return allMixedTiles;
  }, [activeGridTab, allMixedTiles]);

  const filterTabs: Array<{
    id: GridFilterTab;
    labelTh: string;
    labelEn: string;
    icon: React.ReactNode;
  }> = [
    {
      id: "all",
      labelTh: "ทั้งหมด",
      labelEn: "Posts",
      icon: <Grid3X3 className="w-4 h-4" />,
    },
    {
      id: "reels",
      labelTh: "Reels",
      labelEn: "Reels",
      icon: <Play className="w-4 h-4" />,
    },
    {
      id: "rooms",
      labelTh: "ห้องพัก",
      labelEn: "Rooms",
      icon: <BedDouble className="w-4 h-4" />,
    },
    {
      id: "reviews",
      labelTh: "รีวิวผู้เข้าพัก",
      labelEn: "Tagged",
      icon: <UserCheck className="w-4 h-4" />,
    },
  ];

  return (
    <div className="w-full min-w-0 flex flex-col gap-3 select-none">
      {/* 1. PROFILE HEADER CARD */}
      <ResortHeroHeader
        cmsEditType="home-hero"
        onBookClick={() => navigateToTab("book")}
        onChatClick={() => navigateToTab("chat")}
      />

      {/* 2. INSTAGRAM-STYLE MIXED PHOTO & VIDEO GRID */}
      <section className="app-card overflow-hidden">
        {/* Clean Instagram Tab Strip */}
        <div className="px-3 sm:px-5 border-b border-[var(--color-border)] flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 sm:gap-4 overflow-x-auto no-scrollbar">
            {filterTabs.map((tab) => {
              const isActive = activeGridTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveGridTab(tab.id)}
                  className={`relative h-12 px-3 inline-flex items-center gap-2 ty-body transition cursor-pointer whitespace-nowrap ${
                    isActive
                      ? "font-semibold text-[var(--color-text-primary)]"
                      : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                  }`}
                >
                  {tab.icon}
                  <span>
                    {language === "th" ? tab.labelTh : tab.labelEn}
                  </span>
                  {isActive && (
                    <span className="absolute bottom-0 inset-x-0 h-[2px] bg-[var(--color-text-primary)]" />
                  )}
                </button>
              );
            })}
          </div>

          {canShowEditControls && (
            <div className="flex items-center gap-1.5 shrink-0 py-1.5">
              <EditSpotButton
                icon="add"
                label="เพิ่มรูป"
                onClick={() => openCmsEditor({ type: "gallery-photos" })}
              />
              <EditSpotButton
                icon="add"
                label="เพิ่มคลิป"
                onClick={() => openCmsEditor({ type: "short-video" })}
              />
            </div>
          )}
        </div>

        {/* Tight 3-to-4 Column Portrait Media Grid (4:5 Instagram Ratio, Mixing Videos & Photos) */}
        <div className="grid grid-cols-3 md:grid-cols-4 gap-[2px] sm:gap-[3px] bg-[var(--color-background-body)]">
          {displayedTiles.map((tile, index) => (
            <div
              key={tile.id}
              onClick={tile.onSelect}
              className="group relative aspect-[4/5] w-full overflow-hidden bg-[var(--color-background-muted)] cursor-pointer"
            >
              <img
                src={tile.imageUrl}
                alt={tile.title}
                loading={index < 8 ? "eager" : "lazy"}
                decoding="async"
                draggable={false}
                className="h-full w-full object-cover object-center transition-transform duration-300 lg:group-hover:scale-[1.03]"
              />

              {/* Top-Right Minimal Instagram Media Type Icon (Video Reel vs Carousel) */}
              <div className="absolute top-2.5 right-2.5 pointer-events-none">
                {tile.kind === "video" ? (
                  <IgVideoBadgeIcon />
                ) : tile.kind === "carousel" ? (
                  <IgCarouselBadgeIcon />
                ) : null}
              </div>

              {/* Clean Desktop Hover Overlay (Zero Clutter at Rest!) */}
              <div className="hidden lg:flex absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex-col items-center justify-center p-3 text-center text-white pointer-events-none">
                {tile.metricLabel && (
                  <div className="inline-flex items-center gap-1.5 ty-body font-bold !text-white mb-1">
                    {tile.kind === "video" ? (
                      <Play className="w-4 h-4 fill-white text-white" />
                    ) : tile.kind === "review" ? (
                      <Heart className="w-4 h-4 fill-white text-white" />
                    ) : (
                      <Sparkles className="w-4 h-4 text-white" />
                    )}
                    <span>{tile.metricLabel}</span>
                  </div>
                )}
                <p className="ty-caption font-semibold !text-white line-clamp-2">
                  {tile.title}
                </p>
                {tile.subtitle && (
                  <p className="ty-caption !text-white/85 mt-0.5">
                    {tile.subtitle}
                  </p>
                )}
              </div>

              {/* Admin On-Page Edit Button */}
              {canShowEditControls && tile.onEdit && (
                <div
                  className="absolute bottom-2 right-2 z-20"
                  onClick={(e) => e.stopPropagation()}
                >
                  <EditSpotButton onClick={tile.onEdit} />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
