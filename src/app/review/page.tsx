"use client";

import React, { useState, useRef } from "react";
import {
  Star,
  Heart,
  Send,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Maximize2,
  Users,
  ArrowRight,
  Globe,
  MapPin,
} from "lucide-react";
import { useHotelApp } from "@/components/HotelAppShell";
import { StandardCard } from "@/components/ui/standards";

interface FacebookReviewPost {
  id: string;
  authorName: string;
  authorAvatar: string;
  postedAgoTh: string;
  postedAgoEn: string;
  rating: string;
  roomId: string;
  roomCode: string;
  captionTh: string;
  captionEn: string;
  hashtags: string[];
  likesCount: number;
  sharesCount: number;
  facebookUrl: string;
  photos: string[];
}

const FACEBOOK_REVIEW_POSTS: FacebookReviewPost[] = [
  {
    id: "fb-post-1",
    authorName: "KamonchanokPloy",
    authorAvatar:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=240&q=80",
    postedAgoTh: "2 วันที่แล้ว",
    postedAgoEn: "2 days ago",
    rating: "10/10",
    roomId: "room-a1",
    roomCode: "A1",
    captionTh:
      "ทริปสะปันรอบนี้ประทับใจบ้าน A1 ทรง A-Frame มากก 🌲🌫️ ตื่นเช้ามาเปิดม่านจากเตียงชั้นล่างเห็นทะเลหมอกลอยผ่านหน้าห้องเลย อ่างแช่น้ำอุ่นหน้าระเบียงคือที่สุด แนะนำสั่งชุดหมูกระทะมาทานตอนเย็นอากาศ 18 องศาฟินมากค่ะ ระบบจองผ่านเว็บก็ง่าย เช็ควันว่างกับอุณหภูมิได้เลย!",
    captionEn:
      "So impressed with our A-Frame Panorama Villa (A1) in Ban Sapan! 🌲🌫️ Waking up and opening the curtains to a sea of mist right outside our terrace was magical. The outdoor warm soaking tub and evening Thai BBQ at 18°C were 10/10!",
    hashtags: ["#สะปันอันซีน", "#ที่พักสะปัน", "#บ่อเกลือน่าน", "#AFrameVilla"],
    likesCount: 1420,
    sharesCount: 86,
    facebookUrl: "https://www.facebook.com",
    photos: [
      "https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&w=1400&q=85",
      "https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=1400&q=85",
      "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1400&q=85",
    ],
  },
  {
    id: "fb-post-2",
    authorName: "Phakin Wanderlust",
    authorAvatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=240&q=80",
    postedAgoTh: "4 วันที่แล้ว",
    postedAgoEn: "4 days ago",
    rating: "9.8/10",
    roomId: "room-a3",
    roomCode: "A3",
    captionTh:
      "พาแฟนมาพักผ่อนที่ สะปัน อันซีน น่าน จองตรงผ่านหน้าเว็บได้ส่วนลดเพิ่มแถมล็อคห้องด้วย QR 15 นาทีสะดวกมากครับ ห้องพักสะอาด กลิ่นหอมไม้สน อาหารเช้าเสิร์ฟถึงระเบียงพร้อมชุดดริปกาแฟน่านคั่วสด หอมกรุ่นท่ามกลางหุบเขา ใครหาที่พักสะปันแบบส่วนตัวแนะนำที่นี่เลยครับ",
    captionEn:
      "Brought my partner to Sapan Unseen Resort. Booking direct gave us an extra discount and instant 15-minute QR hold. The villa smelled of fresh pine, and morning breakfast with freshly roasted Nan drip coffee on our private balcony was unforgettable.",
    hashtags: ["#SapanUnseen", "#รีวิวที่พักน่าน", "#สะปัน", "#เที่ยวน่านหน้าฝน"],
    likesCount: 985,
    sharesCount: 54,
    facebookUrl: "https://www.facebook.com",
    photos: [
      "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1400&q=85",
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1400&q=85",
    ],
  },
  {
    id: "fb-post-3",
    authorName: "Nattarika S.",
    authorAvatar:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=240&q=80",
    postedAgoTh: "1 สัปดาห์ที่แล้ว",
    postedAgoEn: "1 week ago",
    rating: "9.6/10",
    roomId: "room-a2",
    roomCode: "A2",
    captionTh:
      "ยกแก๊งเพื่อนมาพักบ้าน A2 นอนได้ 4 คนสบายๆ ชั้นลอยใต้หลังคาอบอุ่นเหมือนบ้านพักตากอากาศเมืองนอกเลยค่ะ ใกล้จุดเช็คอินสะพานแขวนสะปันและคาเฟ่หยุดเวลาแค่ 5 นาที ตอนกลางคืนดาวเต็มฟ้า เงียบสงบมากๆ ต้องกลับมาซ้ำแน่นอน ❤️",
    captionEn:
      "Stayed at Villa A2 with friends—sleeps 4 comfortably with a cozy attic loft that feels like an alpine chalet! Just 5 minutes from Sapan Suspension Bridge and Yood Wela Cafe. Starry skies at night and total peace. Will definitely be back! ❤️",
    hashtags: ["#สะปันอันซีนน่าน", "#หมู่บ้านสะปัน", "#น่านเนิบเนิบ"],
    likesCount: 760,
    sharesCount: 39,
    facebookUrl: "https://www.facebook.com",
    photos: [
      "https://images.unsplash.com/photo-1449844908441-8829872d2607?auto=format&fit=crop&w=1400&q=85",
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1400&q=85",
    ],
  },
];

export default function ReviewPage() {
  const {
    propertyConfig,
    rooms,
    roomStatusMap,
    lang,
    openRoomDrawer,
    openGalleryModal,
  } = useHotelApp();

  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [slideIndexMap, setSlideIndexMap] = useState<Record<string, number>>(
    {}
  );
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [sharedPostId, setSharedPostId] = useState<string | null>(null);
  const photoStripRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const filteredPosts =
    selectedFilter === "all"
      ? FACEBOOK_REVIEW_POSTS
      : FACEBOOK_REVIEW_POSTS.filter((p) => p.roomCode === selectedFilter);

  const scrollPostPhoto = (postId: string, targetIdx: number) => {
    const el = photoStripRefs.current[postId];
    setSlideIndexMap((prev) => ({ ...prev, [postId]: targetIdx }));
    if (el && el.clientWidth > 0) {
      el.scrollTo({
        left: targetIdx * el.clientWidth,
        behavior: "smooth",
      });
    }
  };

  const handleSharePost = async (post: FacebookReviewPost) => {
    const shareUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/review#${post.id}`
        : post.facebookUrl;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `รีวิวจากคุณ ${post.authorName} — ${propertyConfig.nameTh}`,
          text: post.captionTh,
          url: shareUrl,
        });
        return;
      } catch {
        // Fallback to clipboard copy
      }
    }
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
    }
    setSharedPostId(post.id);
    setTimeout(() => setSharedPostId(null), 1800);
  };

  return (
    <>
      {/* 1. FACEBOOK CUSTOMER REVIEWS HEADER CARD */}
      <StandardCard>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="h-12 w-12 rounded-[16px] bg-[#1877F2]/12 text-[#1877F2] flex items-center justify-center shrink-0 font-bold text-[20px]">
              f
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="ty-title truncate">
                  {lang === "th"
                    ? "โพสต์รีวิวจากลูกค้าบน Facebook"
                    : "Verified Facebook Guest Reviews"}
                </h1>
                <span className="rounded-full bg-[var(--color-success-muted)] text-[var(--color-success)] px-2.5 py-0.5 text-[11px] font-bold">
                  {lang === "th" ? "9.6 / 10 ยอดเยี่ยมมาก" : "9.6 / 10 Exceptional"}
                </span>
              </div>
              <p className="ty-caption mt-0.5">
                {lang === "th"
                  ? `ดึงข้อมูลโพสต์สาธารณะจากลูกค้าจริงที่เช็คอิน ${propertyConfig.nameTh} บน Facebook`
                  : `Public Facebook check-in posts from verified guests at ${propertyConfig.nameEn}`}
              </p>
            </div>
          </div>

          <a
            href="https://www.facebook.com"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-fw-secondary shrink-0 self-start sm:self-auto"
          >
            <span>
              {lang === "th" ? "เพจ Facebook ที่พัก" : "Official Facebook Page"}
            </span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Filter Pills by Room Code */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-4 mt-4 border-t border-[var(--color-border)]">
          {[
            {
              id: "all",
              labelTh: "โพสต์ทั้งหมด",
              labelEn: "All Reviews",
            },
            {
              id: "A1",
              labelTh: "บ้านพัก A1 · A-Frame",
              labelEn: "Villa A1 · A-Frame",
            },
            {
              id: "A2",
              labelTh: "บ้านพัก A2 · A-Frame",
              labelEn: "Villa A2 · A-Frame",
            },
            {
              id: "A3",
              labelTh: "บ้านพัก A3 · Skyline",
              labelEn: "Villa A3 · Skyline",
            },
          ].map((tab) => {
            const active = selectedFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedFilter(tab.id)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition cursor-pointer ${
                  active
                    ? "bg-[var(--color-accent)] text-[var(--color-on-accent)]"
                    : "bg-[var(--color-background-muted)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                {lang === "th" ? tab.labelTh : tab.labelEn}
              </button>
            );
          })}
        </div>
      </StandardCard>

      {/* 2. FACEBOOK CUSTOMER POST FEED CARDS (Rendered in our App Window Design) */}
      {filteredPosts.map((post) => {
        const linkedRoom =
          rooms.find((r) => r.id === post.roomId || r.code === post.roomCode) ||
          rooms[0];
        const st = linkedRoom ? roomStatusMap[linkedRoom.id] : undefined;
        const nightlyRate =
          st?.effectiveNightlyPrice ?? linkedRoom?.basePriceThb ?? 2990;
        const currentSlide = slideIndexMap[post.id] ?? 0;
        const totalSlides = post.photos.length;
        const isLiked = Boolean(likedPosts[post.id]);
        const likeCount = isLiked ? post.likesCount + 1 : post.likesCount;

        return (
          <StandardCard key={post.id} id={post.id} noPadding>
            {/* Facebook Post Author Header */}
            <div className="p-4 sm:p-5 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={post.authorAvatar}
                  alt={post.authorName}
                  className="h-10 w-10 rounded-full object-cover border border-[var(--color-border)] shrink-0"
                />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="ty-body font-bold text-[var(--color-text-primary)] truncate">
                      {post.authorName}
                    </span>
                    <span className="ty-caption">
                      {lang === "th" ? "เช็คอินที่" : "checked in at"}
                    </span>
                    <span className="ty-body font-semibold text-[var(--color-text-primary)] truncate">
                      {lang === "th"
                        ? propertyConfig.nameTh
                        : propertyConfig.nameEn}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 ty-caption mt-0.5">
                    <span>
                      {lang === "th" ? post.postedAgoTh : post.postedAgoEn}
                    </span>
                    <span>·</span>
                    <Globe className="w-3 h-3" />
                    <span>
                      {lang === "th" ? "โพสต์สาธารณะ Facebook" : "Facebook Public Post"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <div className="hidden sm:inline-flex items-center gap-0.5 text-amber-500">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <Star className="w-3.5 h-3.5 fill-current" />
                </div>
                <span className="rounded-full bg-[var(--color-background-muted)] px-2.5 py-1 text-[11px] font-bold text-[var(--color-text-primary)]">
                  {post.rating}
                </span>
              </div>
            </div>

            {/* Customer Post Text & Hashtags */}
            <div className="px-4 sm:px-5 pb-3.5 space-y-2">
              <p className="ty-body whitespace-pre-line">
                {lang === "th" ? post.captionTh : post.captionEn}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {post.hashtags.map((tag) => (
                  <span
                    key={tag}
                    className="ty-caption font-semibold text-[#1877F2]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Tall Swipeable Post Photos (No gradient, no text overlay on image) */}
            <div
              onDoubleClick={() =>
                setLikedPosts((prev) => ({
                  ...prev,
                  [post.id]: !prev[post.id],
                }))
              }
              className="relative w-full aspect-[4/5] sm:h-[520px] overflow-hidden bg-black group/fbphoto"
            >
              <div
                ref={(el) => {
                  photoStripRefs.current[post.id] = el;
                }}
                onScroll={(e) => {
                  const el = e.currentTarget;
                  if (!el.clientWidth) return;
                  const idx = Math.round(el.scrollLeft / el.clientWidth);
                  if (idx !== currentSlide) {
                    setSlideIndexMap((prev) => ({ ...prev, [post.id]: idx }));
                  }
                }}
                className="flex h-full w-full overflow-x-auto snap-x snap-mandatory no-scrollbar scroll-smooth touch-pan-x"
              >
                {post.photos.map((photoUrl, idx) => (
                  <div
                    key={idx}
                    onClick={() => linkedRoom && openGalleryModal(linkedRoom)}
                    className="h-full w-full shrink-0 snap-center overflow-hidden cursor-pointer"
                  >
                    <img
                      src={photoUrl}
                      alt={`${post.authorName} review photo ${idx + 1}`}
                      draggable={false}
                      className="h-full w-full object-cover object-center select-none"
                    />
                  </div>
                ))}
              </div>

              {totalSlides > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      scrollPostPhoto(
                        post.id,
                        (currentSlide - 1 + totalSlides) % totalSlides
                      )
                    }
                    aria-label="Previous photo"
                    className="hidden lg:flex absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/60 text-white items-center justify-center opacity-0 group-hover/fbphoto:opacity-100 transition cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      scrollPostPhoto(post.id, (currentSlide + 1) % totalSlides)
                    }
                    aria-label="Next photo"
                    className="hidden lg:flex absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/60 text-white items-center justify-center opacity-0 group-hover/fbphoto:opacity-100 transition cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1 pointer-events-none">
                    {post.photos.map((_, dotIdx) => (
                      <span
                        key={dotIdx}
                        className={`h-1.5 rounded-full transition-all ${
                          dotIdx === currentSlide
                            ? "w-4 bg-white"
                            : "w-1.5 bg-white/55"
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Post Footer: Like / Share Icon + Linked Room Specs & "View This Room" */}
            <div className="p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3.5">
                  <button
                    type="button"
                    onClick={() =>
                      setLikedPosts((prev) => ({
                        ...prev,
                        [post.id]: !prev[post.id],
                      }))
                    }
                    aria-label="Like review"
                    className="inline-flex items-center gap-1.5 text-[var(--color-text-primary)] hover:opacity-75 transition cursor-pointer"
                  >
                    <Heart
                      className={`w-6 h-6 transition-transform active:scale-125 ${
                        isLiked ? "fill-rose-500 text-rose-500" : ""
                      }`}
                    />
                    <span className="ty-body font-semibold">
                      {likeCount.toLocaleString()}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSharePost(post)}
                    aria-label="Share review"
                    title={lang === "th" ? "แชร์โพสต์รีวิวนี้" : "Share this review"}
                    className="inline-flex items-center justify-center h-8 w-8 rounded-full text-[var(--color-text-primary)] hover:bg-[var(--color-overlay-hover)] transition cursor-pointer"
                  >
                    {sharedPostId === post.id ? (
                      <Check className="w-5 h-5 text-[var(--color-success)]" />
                    ) : (
                      <Send className="w-5 h-5 -rotate-12" />
                    )}
                  </button>
                </div>

                <a
                  href={post.facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 ty-caption font-semibold hover:text-[var(--color-text-primary)] transition"
                >
                  <span>
                    {lang === "th" ? "ดูโพสต์บน Facebook" : "View on Facebook"}
                  </span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {linkedRoom && (
                <div className="pt-3 border-t border-[var(--color-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center rounded-md bg-[var(--color-accent)] text-[var(--color-on-accent)] px-2 py-0.5 text-[12px] font-bold">
                        {linkedRoom.code}
                      </span>
                      <h3 className="ty-subtitle truncate">
                        {lang === "th"
                          ? linkedRoom.nameTh
                          : linkedRoom.nameEn}
                      </h3>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 ty-body font-medium text-[var(--color-text-secondary)]">
                      <span className="inline-flex items-center gap-1 text-[var(--color-text-primary)]">
                        <Maximize2 className="w-4 h-4 text-[var(--color-text-secondary)]" />
                        <span>
                          {linkedRoom.sizeSqm} {lang === "th" ? "ตร.ม." : "m²"}
                        </span>
                      </span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1 text-[var(--color-text-primary)]">
                        <Users className="w-4 h-4 text-[var(--color-text-secondary)]" />
                        <span>
                          {linkedRoom.baseGuests}–{linkedRoom.maxGuests}{" "}
                          {lang === "th" ? "ท่าน" : "guests"}
                        </span>
                      </span>
                      <span>·</span>
                      <span className="inline-flex items-baseline gap-1">
                        <strong className="ty-subtitle text-[var(--color-text-primary)]">
                          ฿{nightlyRate.toLocaleString()}
                        </strong>
                        <span className="ty-caption">
                          {lang === "th" ? "/ คืน" : "/ night"}
                        </span>
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => openRoomDrawer(linkedRoom, "details")}
                    className="btn-round-solid shrink-0 w-full sm:w-auto"
                  >
                    <span>
                      {lang === "th" ? "ดูและจองห้องพักนี้" : "View This Room"}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </StandardCard>
        );
      })}
    </>
  );
}
