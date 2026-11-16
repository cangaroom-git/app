"use client";

import React, { useMemo, useState } from "react";
import { BedDouble, Grid3X3, Heart, Play, Sparkles, UserCheck } from "lucide-react";
import { pickLocalizedText } from "@/data/cmsDefaults";
import { RoomLodge } from "@/data/rooms";
import { useHotelApp } from "@/components/HotelAppShell";
import { EditSpotButton } from "@/components/cms/AdminEditOverlay";
import {
  PureMediaSlide,
  PureMediaViewer,
} from "@/components/cms/PureMediaViewer";
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
    navigateToTab,
    cms,
    canShowEditControls,
    openCmsEditor,
  } = useHotelApp();

  const [activeGridTab, setActiveGridTab] = useState<GridFilterTab>("all");
  const [viewerState, setViewerState] = useState<{
    slides: PureMediaSlide[];
    initialIndex: number;
  } | null>(null);

  const activeShorts = useMemo(
    () => cms.shortsPage.videos.filter((video) => video.isActive !== false),
    [cms.shortsPage.videos]
  );

  // Build unified mixed Instagram-style media tiles (Pure Photo / Carousel / Video Viewing Only!)
  const allMixedTiles = useMemo<MixedMediaTile[]>(() => {
    const allVideoSlides: PureMediaSlide[] = activeShorts.map((vid) => ({
      type: "video",
      url: vid.videoUrl,
      posterUrl: vid.posterUrl,
      aspectRatio: "9/16",
      caption: pickLocalizedText(language, vid.titleTh, vid.titleEn),
    }));

    const videoTiles: MixedMediaTile[] = activeShorts.map((vid, idx) => ({
      id: `vid-${vid.id}`,
      kind: "video",
      imageUrl: vid.posterUrl,
      title: pickLocalizedText(language, vid.titleTh, vid.titleEn),
      metricLabel: vid.views,
      isPinned: Boolean(vid.isPinned),
      onSelect: () =>
        setViewerState({ slides: allVideoSlides, initialIndex: idx }),
      onEdit: () =>
        openCmsEditor({ type: "short-video", videoId: vid.id }),
    }));

    const roomTiles: MixedMediaTile[] = rooms.map((room: RoomLodge) => {
      const roomAlbumSlides: PureMediaSlide[] = room.images.map((img) => ({
        type: "image",
        url: img.url,
        caption: pickLocalizedText(
          language,
          img.captionTh || room.nameTh,
          img.captionEn || room.nameEn
        ),
      }));

      return {
        id: `room-${room.id}`,
        kind: room.images.length > 1 ? "carousel" : "photo",
        imageUrl: room.images[0]?.url || "",
        title: pickLocalizedText(language, room.nameTh, room.nameEn),
        metricLabel: `${room.images.length} ${
          language === "th" ? "รูป" : "photos"
        }`,
        onSelect: () =>
          setViewerState({ slides: roomAlbumSlides, initialIndex: 0 }),
        onEdit: () => openCmsEditor({ type: "room", roomId: room.id }),
      };
    });

    const reviewTiles: MixedMediaTile[] = cms.reviews
      .filter((rev) => Boolean(rev.photos[0]))
      .map((rev) => {
        const revSlides: PureMediaSlide[] = rev.photos.map((photoUrl) => ({
          type: "image",
          url: photoUrl,
          caption: pickLocalizedText(language, rev.captionTh, rev.captionEn),
        }));
        return {
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
          onSelect: () => setViewerState({ slides: revSlides, initialIndex: 0 }),
          onEdit: () => openCmsEditor({ type: "review", reviewId: rev.id }),
        };
      });

    const allGallerySlides: PureMediaSlide[] = cms.gallery.photos.map((p) => ({
      type: "image",
      url: p.url,
      caption: pickLocalizedText(language, p.captionTh, p.captionEn),
    }));

    const galleryTiles: MixedMediaTile[] = cms.gallery.photos.map(
      (photo, gIdx) => ({
        id: `gal-${photo.id}`,
        kind: "photo",
        imageUrl: photo.url,
        title: pickLocalizedText(language, photo.captionTh, photo.captionEn),
        onSelect: () =>
          setViewerState({ slides: allGallerySlides, initialIndex: gIdx }),
        onEdit: () => openCmsEditor({ type: "gallery-photos" }),
      })
    );

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
    language,
    openCmsEditor,
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
      labelTh: "อัลบั้มห้องพัก",
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

      {/* 2. INSTAGRAM-STYLE MIXED PHOTO & VIDEO GRID (Zero Hover Scale, Pure Media Viewer!) */}
      <section className="app-card overflow-hidden">
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
                className="h-full w-full object-cover object-center"
              />

              {/* Top-Right Minimal Instagram Media Type Icon */}
              <div className="absolute top-2.5 right-2.5 pointer-events-none">
                {tile.kind === "video" ? (
                  <IgVideoBadgeIcon />
                ) : tile.kind === "carousel" ? (
                  <IgCarouselBadgeIcon />
                ) : null}
              </div>

              {/* Subtle Desktop Dim Overlay (NO hover scale!) */}
              <div className="hidden lg:flex absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex-col items-center justify-center p-3 text-center text-white pointer-events-none">
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
              </div>

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

      {/* Pure Photo / Carousel / Video Lightbox (Zero Details / Zero Booking Clutter) */}
      <PureMediaViewer
        slides={viewerState?.slides ?? null}
        initialIndex={viewerState?.initialIndex ?? 0}
        onClose={() => setViewerState(null)}
      />
    </div>
  );
}
