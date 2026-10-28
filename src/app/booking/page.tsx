"use client";

import React, { useEffect, useState } from "react";
import { Instagram, Play, Star } from "lucide-react";
import { RESORT_SHORTS } from "@/data/shortsData";
import { useHotelApp } from "@/components/HotelAppShell";
import { ResortHeroHeader } from "@/components/home/ResortHeroHeader";
import { RoomFeedCard } from "@/components/home/RoomFeedCard";
import { ShortVideoCard } from "@/components/home/ShortVideoCard";

interface FeaturedGuestReview {
  id: string;
  guestNameTh: string;
  guestNameEn: string;
  roomLabel: string;
  ratingScore: string;
  photoUrl: string;
  quoteTh: string;
  quoteEn: string;
}

const FEATURED_GUEST_REVIEWS: FeaturedGuestReview[] = [
  {
    id: "rev-1",
    guestNameTh: "คุณกมลชนก",
    guestNameEn: "Kamonchanok P.",
    roomLabel: "A-Frame Panorama Villa (A1)",
    ratingScore: "10/10",
    photoUrl:
      "https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&w=800&q=80",
    quoteTh:
      "ระบบจองใช้งานง่ายมาก เห็นวันว่างชัดเจน วิลล่าเป็นส่วนตัวและอ่างแช่น้ำชมหมอกฟินมากค่ะ",
    quoteEn:
      "Effortless direct booking with real-time calendar. The private A-Frame villa and misty outdoor bathtub were unforgettable!",
  },
  {
    id: "rev-2",
    guestNameTh: "คุณภาคิน",
    guestNameEn: "Phakin T.",
    roomLabel: "Skyline Jacuzzi Villa (A3)",
    ratingScore: "9.8/10",
    photoUrl:
      "https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=800&q=80",
    quoteTh:
      "ประทับใจตั้งแต่กดจองตรงได้ส่วนลด แนบสลิปปุ๊บระบบสแกน QR ยืนยันไวมาก หมูกระทะและอาหารเช้าดีงามครับ",
    quoteEn:
      "Loved the direct booking promo and instant QR slip check. Hot BBQ on our deck and 5-star breakfast!",
  },
  {
    id: "rev-3",
    guestNameTh: "คุณณัฐริกา",
    guestNameEn: "Natrika S.",
    roomLabel: "Sapan Forest Cabin (B1)",
    ratingScore: "9.6/10",
    photoUrl:
      "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80",
    quoteTh:
      "ตื่นเช้ามาเปิดม่านเจอทะเลหมอกลอยผ่านหน้าห้องเลยค่ะ กาแฟดริปหอมมาก พนักงานดูแลอบอุ่นที่สุด",
    quoteEn:
      "Waking up to a sea of mist drifting past our terrace was magical. Warm hospitality and great drip coffee.",
  },
];

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

  // Support deep-link query `?room=<id>` or `?category=<id>` smoothly on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const categoryParam = params.get("category");
    if (categoryParam) {
      setSelectedCategoryFilter(categoryParam);
    }
    const targetRoomId = params.get("room");
    if (targetRoomId && rooms.length > 0) {
      const targetElement = document.getElementById(`room-card-${targetRoomId}`);
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
    if (selectedCategoryFilter === "aframe") {
      return room.code.startsWith("A");
    }
    if (selectedCategoryFilter === "panoramic") {
      return room.code.startsWith("B");
    }
    return true;
  });

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
              {RESORT_SHORTS.length} {language === "th" ? "วิดีโอ" : "videos"}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {RESORT_SHORTS.map((shortVideo, videoIndex) => {
              const linkedRoom =
                shortVideo.roomIndex !== undefined
                  ? rooms[shortVideo.roomIndex]
                  : undefined;
              return (
                <ShortVideoCard
                  key={shortVideo.id}
                  id={shortVideo.id}
                  title={shortVideo.titleTh}
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

      {/* 3. Centered 1140px Room Feed Cards (Frameless Full-Bleed on Mobile, Rounded Tonal on Desktop) */}
      <section id="rooms" className="scroll-mt-16 space-y-5 sm:space-y-4">
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
                  language === "th" ? room.nameTh : room.nameEn,
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
            />
          );
        })}
      </section>

      {/* 4. Verified Guest Reviews Section (#reviews) — Open Canvas, 1-Layer Cards */}
      {sectionVisibility.galleryAndReviewsSection && (
        <section id="reviews" className="space-y-4 pt-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="ty-title flex items-center gap-2">
              <Star className="w-5 h-5 text-[var(--color-warning)] fill-current shrink-0" />
              <span>
                {language === "th"
                  ? "9.6 / 10 รีวิวจากผู้เข้าพักจริง"
                  : "9.6 / 10 Verified Guest Reviews"}
              </span>
            </h2>

            <div className="flex flex-wrap items-center gap-2">
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
                href="https://www.instagram.com/sapanunseen?vrfl=NGFrdjRieXI3NXNq&utm_source=qr"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-fw-secondary"
              >
                <Instagram className="w-4 h-4" />
                <span>@sapanunseen</span>
              </a>
            </div>
          </div>

          <div className="flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:gap-4">
            {FEATURED_GUEST_REVIEWS.map((reviewItem) => (
              <article
                key={reviewItem.id}
                onClick={() => navigateToTab("review")}
                className="snap-start shrink-0 w-[268px] sm:w-auto rounded-[16px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)]/75 overflow-hidden flex flex-col justify-between cursor-pointer transition"
              >
                <img
                  src={reviewItem.photoUrl}
                  alt={reviewItem.roomLabel}
                  loading="lazy"
                  decoding="async"
                  className="h-36 w-full object-cover bg-[var(--color-background-subtle)]"
                />

                <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                  <p className="ty-body line-clamp-2">
                    &ldquo;
                    {language === "th"
                      ? reviewItem.quoteTh
                      : reviewItem.quoteEn}
                    &rdquo;
                  </p>

                  <div className="flex items-center justify-between gap-2 ty-caption">
                    <span className="font-bold text-[var(--color-text-primary)] truncate">
                      {language === "th"
                        ? reviewItem.guestNameTh
                        : reviewItem.guestNameEn}{" "}
                      · {reviewItem.roomLabel.split("(")[0].trim()}
                    </span>
                    <span className="inline-flex items-center gap-1 font-bold text-[var(--color-text-primary)] shrink-0">
                      <Star className="w-3.5 h-3.5 fill-[var(--color-warning)] text-[var(--color-warning)]" />
                      <span>{reviewItem.ratingScore}</span>
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
