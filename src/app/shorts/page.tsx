"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  Volume2,
  VolumeX,
  Play,
  Music2,
  Sparkles,
  ChevronUp,
  ChevronDown,
  BedDouble,
  Check,
  X,
  Send,
} from "lucide-react";
import { useHotelApp } from "@/components/HotelAppShell";

export interface ShortVideoItem {
  id: string;
  titleTh: string;
  titleEn: string;
  captionTh: string;
  captionEn: string;
  hashtags: string[];
  videoUrl: string;
  posterUrl: string;
  audioLabel: string;
  likes: number;
  comments: { id: string; user: string; text: string; time: string }[];
  roomIndex: number;
  couponCode?: string;
}

export const RESORT_SHORTS: ShortVideoItem[] = [
  {
    id: "short-1",
    titleTh: "ตื่นมารับทะเลหมอกหน้าเตียงที่ Private Pool Villa",
    titleEn: "Wake Up to a Sea of Mist at Our Private Villa",
    captionTh:
      "บรรยากาศยามเช้า 06:30 น. จากระเบียงวิลล่าส่วนตัว เห็นสายหมอกลอยผ่านหุบเขาสะปันแบบพาโนรามา 180 องศา",
    captionEn:
      "06:30 AM morning ambiance from your private villa deck overlooking 180-degree panoramic mist over Ban Sapan valley.",
    hashtags: ["#สะปันอันซีน", "#ที่พักสะปัน", "#พูลวิลล่าน่าน", "#ทะเลหมอก"],
    videoUrl:
      "https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-foggy-mountains-in-the-morning-41508-large.mp4",
    posterUrl:
      "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1080&q=85",
    audioLabel: "Original Audio · เสียงสายหมอกและลำน้ำว้า @sapanunseen",
    likes: 2840,
    comments: [
      {
        id: "c1",
        user: "kamonchanok.p",
        text: "ไปพักห้องนี้มาเมื่อเดือนที่แล้ว หมอกหนาแบบนี้เลยค่ะ ประทับใจมาก ❤️",
        time: "2h",
      },
      {
        id: "c2",
        user: "phakin_travel",
        text: "จองตรงหน้าเว็บใช้โค้ด SAPAN10 ลดเพิ่มคุ้มมากครับ",
        time: "5h",
      },
    ],
    roomIndex: 0,
    couponCode: "SAPAN10",
  },
  {
    id: "short-2",
    titleTh: "แช่อ่างจากุซซี่น้ำอุ่น ชมวิวขุนเขาและนาขั้นบันได",
    titleEn: "Warm Outdoor Jacuzzi Overlooking Mountain Terraces",
    captionTh:
      "พักผ่อนแบบสโลว์ไลฟ์ในห้องสวีทกระจกใสบานใหญ่ พร้อมเซ็ต Floating Afternoon Tea เสิร์ฟถึงห้องพัก",
    captionEn:
      "Slow-living sanctuary with floor-to-ceiling mountain views and signature afternoon refreshments served to your deck.",
    hashtags: ["#SapanUnseen", "#JacuzziSuite", "#เที่ยวหน้าหนาว", "#บ่อเกลือน่าน"],
    videoUrl:
      "https://assets.mixkit.co/videos/preview/mixkit-waterfall-in-forest-2213-large.mp4",
    posterUrl:
      "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1080&q=85",
    audioLabel: "Acoustic Breeze · Morning Sanctuary Sessions",
    likes: 1920,
    comments: [
      {
        id: "c3",
        user: "nicha.wander",
        text: "น้ำอุ่นกำลังดี วิวสวยเหมือนอยู่สวิตเซอร์แลนด์เลยค่ะ",
        time: "1d",
      },
    ],
    roomIndex: 1,
    couponCode: "DIRECT15",
  },
  {
    id: "short-3",
    titleTh: "ชุดหมูกระทะพรีเมียมริมระเบียง ท่ามกลางอากาศ 15°C",
    titleEn: "Private Terrace Thai BBQ Dinner in 15°C Mountain Air",
    captionTh:
      "มื้อค่ำสุดฟินกับชุดหมูกระทะคัดเกรดเสิร์ฟตรงถึงระเบียงบ้านพักส่วนตัว ไม่ต้องออกไปไหน",
    captionEn:
      "Savor a sizzling Thai BBQ dinner set served right on your private villa balcony under the cool mountain breeze.",
    hashtags: ["#หมูกระทะบนดอย", "#สะปัน", "#InVillaDining", "#น่านนคร"],
    videoUrl:
      "https://assets.mixkit.co/videos/preview/mixkit-putting-meat-on-a-barbecue-grill-43195-large.mp4",
    posterUrl:
      "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1080&q=85",
    audioLabel: "Cozy Evening · Sapan Unseen Culinary",
    likes: 3410,
    comments: [
      {
        id: "c4",
        user: "earth_foodie",
        text: "น้ำจิ้มเด็ดมากครับ สั่งเพิ่มตอนจองห้องได้เลยสะดวกสุดๆ",
        time: "3h",
      },
    ],
    roomIndex: 0,
  },
  {
    id: "short-4",
    titleTh: "เส้นทางสายโรแมนติก ถนนลอยฟ้า 1256 สู่หมู่บ้านสะปัน",
    titleEn: "Scenic Sky Road 1256 Drive into Ban Sapan Valley",
    captionTh:
      "ขับรถชมวิวทิวเขาสลับซับซ้อนและแวะหยุดเวลาคาเฟ่ ก่อนเข้าเช็คอินพักผ่อนแบบส่วนตัว",
    captionEn:
      "Cruise along Nan's iconic mountain ridge highway and stop by Yood Wela Cafe before checking in.",
    hashtags: ["#ถนนลอยฟ้า1256", "#ดอยภูคา", "#หมู่บ้านสะปัน", "#DirectBooking"],
    videoUrl:
      "https://assets.mixkit.co/videos/preview/mixkit-Curvy-road-on-a-tree-covered-hill-41537-large.mp4",
    posterUrl:
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1080&q=85",
    audioLabel: "Mountain Road · Northern Thailand Vibes",
    likes: 1650,
    comments: [
      {
        id: "c5",
        user: "mint_journey",
        text: "รถเก๋งขึ้นได้สบายมากค่ะ ถนนสวยตลอดทาง",
        time: "6h",
      },
    ],
    roomIndex: 2,
  },
  {
    id: "short-5",
    titleTh: "ดริปกาแฟร้อนยามเช้า ฟังเสียงลำน้ำว้าไหลผ่านหน้าบ้านพัก",
    titleEn: "Morning Pour-Over Coffee by the Mountain Stream",
    captionTh:
      "เซ็ตเมล็ดกาแฟน่านคั่วอ่อนดริปสดทุกเช้าในวิลล่า พร้อมขนมปังโฮมเมดและผลไม้ตามฤดูกาล",
    captionEn:
      "Single-origin Nan pour-over coffee set included in every villa with homemade breakfast.",
    hashtags: ["#กาแฟน่าน", "#สโลว์ไลฟ์สะปัน", "#SapanMorning", "#น่าน"],
    videoUrl:
      "https://assets.mixkit.co/videos/preview/mixkit-pouring-hot-water-into-a-coffee-filter-41767-large.mp4",
    posterUrl:
      "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1080&q=85",
    audioLabel: "Morning Drip · Sapan Sanctuary Cafe",
    likes: 2190,
    comments: [
      {
        id: "c6",
        user: "coffee.addict.th",
        text: "กาแฟหอมมากค่ะ นั่งดริปหน้าห้องดูหมอกฟินสุดๆ",
        time: "4h",
      },
    ],
    roomIndex: 3,
    couponCode: "SAPAN10",
  },
  {
    id: "short-6",
    titleTh: "นอนดูดาวเต็มฟ้าบนระเบียงไม้ A-Frame ท่ามกลางหุบเขา",
    titleEn: "Stargazing from Your Private A-Frame Timber Deck",
    captionTh:
      "ค่ำคืนไร้แสงไฟรบกวน เปิดไฟ Warm Light ริมระเบียง นอนชมทางช้างเผือกและดวงดาวชัดเจน",
    captionEn:
      "Zero light pollution in the valley lets you stargaze right from your warm-lit private balcony.",
    hashtags: ["#ดูดาวสะปัน", "#AFrameVilla", "#ที่พักบ่อเกลือ", "#SapanUnseen"],
    videoUrl:
      "https://assets.mixkit.co/videos/preview/mixkit-stars-in-space-1610-large.mp4",
    posterUrl:
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1080&q=85",
    audioLabel: "Starlight Acoustic · Sapan Night Sky",
    likes: 2630,
    comments: [
      {
        id: "c7",
        user: "skywatcher_bkk",
        text: "กลางคืนดาวเยอะมากจริงๆ ครับ อากาศเย็นสบายทั้งคืน",
        time: "8h",
      },
    ],
    roomIndex: 1,
  },
];

export default function ShortsPage() {
  const {
    rooms,
    roomStatusMap,
    lang,
    nights,
    openRoomDrawer,
    handleApplyCoupon,
    appliedCouponCode,
    initialShortIndex,
  } = useHotelApp();

  const feedRef = useRef<HTMLDivElement | null>(null);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  const [activeIndex, setActiveIndex] = useState(() =>
    Math.max(0, Math.min(RESORT_SHORTS.length - 1, initialShortIndex || 0))
  );

  useEffect(() => {
    if (
      initialShortIndex > 0 &&
      initialShortIndex < RESORT_SHORTS.length &&
      feedRef.current
    ) {
      const targetIdx = initialShortIndex;
      setActiveIndex(targetIdx);
      setTimeout(() => {
        if (feedRef.current) {
          feedRef.current.scrollTo({
            top: targetIdx * feedRef.current.clientHeight,
            behavior: "auto",
          });
        }
      }, 60);
    }
  }, [initialShortIndex]);
  const [isMuted, setIsMuted] = useState(true);
  const [pausedMap, setPausedMap] = useState<Record<string, boolean>>({});
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [savedMap, setSavedMap] = useState<Record<string, boolean>>({});
  const [sharedFeedbackId, setSharedFeedbackId] = useState<string | null>(null);
  const [openCommentsShortId, setOpenCommentsShortId] = useState<string | null>(
    null
  );
  const [customComments, setCustomComments] = useState<
    Record<string, { id: string; user: string; text: string; time: string }[]>
  >({});
  const [commentInput, setCommentInput] = useState("");

  // Sync video playback with active slide
  useEffect(() => {
    RESORT_SHORTS.forEach((item, idx) => {
      const vid = videoRefs.current[item.id];
      if (!vid) return;
      if (idx === activeIndex && !pausedMap[item.id]) {
        vid.play().catch(() => {
          // Autoplay fallback handled by poster/animation
        });
      } else {
        vid.pause();
      }
    });
  }, [activeIndex, pausedMap]);

  const handleScroll = () => {
    if (!feedRef.current) return;
    const { scrollTop, clientHeight } = feedRef.current;
    if (clientHeight > 0) {
      const idx = Math.round(scrollTop / clientHeight);
      if (idx !== activeIndex && idx >= 0 && idx < RESORT_SHORTS.length) {
        setActiveIndex(idx);
      }
    }
  };

  const scrollToSlide = (targetIdx: number) => {
    if (!feedRef.current) return;
    const clamped = Math.max(
      0,
      Math.min(RESORT_SHORTS.length - 1, targetIdx)
    );
    feedRef.current.scrollTo({
      top: clamped * feedRef.current.clientHeight,
      behavior: "smooth",
    });
    setActiveIndex(clamped);
  };

  const togglePlayPause = (shortId: string) => {
    const vid = videoRefs.current[shortId];
    setPausedMap((prev) => {
      const nextPaused = !prev[shortId];
      if (vid) {
        if (nextPaused) vid.pause();
        else vid.play().catch(() => {});
      }
      return { ...prev, [shortId]: nextPaused };
    });
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!openCommentsShortId || !commentInput.trim()) return;
    const newComment = {
      id: `cm-${Date.now()}`,
      user: "guest_member",
      text: commentInput.trim(),
      time: "เมื่อสักครู่",
    };
    setCustomComments((prev) => ({
      ...prev,
      [openCommentsShortId]: [
        ...(prev[openCommentsShortId] || []),
        newComment,
      ],
    }));
    setCommentInput("");
  };

  const activeCommentShort = RESORT_SHORTS.find(
    (s) => s.id === openCommentsShortId
  );

  return (
    <div className="relative flex items-center justify-center w-full h-[100dvh] lg:h-[calc(100dvh-3rem)]">
      {/* Main Vertical 9:16 Video Feed Container (Instagram Reels / YouTube Shorts Style) */}
      <div className="relative w-full lg:max-w-[430px] h-full rounded-none lg:rounded-[24px] overflow-hidden bg-black shadow-2xl">
        {/* Top Floating Controls Overlay */}
        <div className="absolute top-4 left-4 right-16 lg:right-4 z-30 flex items-center justify-between pointer-events-none">
          <div className="inline-flex items-center gap-2 rounded-full bg-black/45 backdrop-blur-md px-3.5 py-1.5 text-white border border-white/15 pointer-events-auto">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[12px] font-bold tracking-wide">
              {lang === "th" ? "SHORTS · บรรยากาศจริง" : "SHORTS · REAL VIBES"}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsMuted((m) => !m)}
            aria-label={isMuted ? "Unmute" : "Mute"}
            className="h-9 w-9 rounded-full bg-black/45 backdrop-blur-md text-white border border-white/15 flex items-center justify-center hover:bg-black/65 transition cursor-pointer pointer-events-auto"
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Vertical Snap Scroll Viewport */}
        <div
          ref={feedRef}
          onScroll={handleScroll}
          className="w-full h-full overflow-y-scroll snap-y snap-mandatory no-scrollbar"
        >
          {RESORT_SHORTS.map((short, idx) => {
            const linkedRoom =
              rooms[short.roomIndex % Math.max(1, rooms.length)] ?? rooms[0];
            const st = linkedRoom ? roomStatusMap[linkedRoom.id] : undefined;
            const nightly =
              st?.effectiveNightlyPrice ?? linkedRoom?.basePriceThb ?? 2590;
            const isLiked = Boolean(likedMap[short.id]);
            const isSaved = Boolean(savedMap[short.id]);
            const isPaused = Boolean(pausedMap[short.id]);
            const totalComments =
              short.comments.length + (customComments[short.id]?.length ?? 0);

            return (
              <article
                key={short.id}
                className="relative w-full h-full snap-start snap-always shrink-0 overflow-hidden bg-black select-none"
              >
                {/* Background Poster with subtle motion + HTML5 Vertical Video */}
                <img
                  src={short.posterUrl}
                  alt={short.titleTh}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <video
                  ref={(el) => {
                    videoRefs.current[short.id] = el;
                  }}
                  src={short.videoUrl}
                  poster={short.posterUrl}
                  loop
                  muted={isMuted}
                  playsInline
                  autoPlay={idx === 0}
                  onClick={() => togglePlayPause(short.id)}
                  className="absolute inset-0 w-full h-full object-cover cursor-pointer"
                />

                {/* Gradient Scrim for Readability */}
                <div
                  onClick={() => togglePlayPause(short.id)}
                  className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/85 cursor-pointer"
                />

                {/* Center Play Indicator when Paused */}
                {isPaused && (
                  <button
                    type="button"
                    onClick={() => togglePlayPause(short.id)}
                    aria-label="Play video"
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 h-16 w-16 rounded-full bg-black/55 backdrop-blur-md text-white flex items-center justify-center border border-white/25 cursor-pointer"
                  >
                    <Play className="w-7 h-7 fill-current ml-0.5" />
                  </button>
                )}

                {/* Right-Side Action Rail (Instagram Reels / YouTube Shorts) */}
                <div className="absolute right-3 bottom-36 lg:bottom-28 z-20 flex flex-col items-center gap-4 text-white">
                  <button
                    type="button"
                    onClick={() =>
                      setLikedMap((p) => ({ ...p, [short.id]: !p[short.id] }))
                    }
                    className="flex flex-col items-center gap-1 cursor-pointer group"
                  >
                    <span
                      className={`h-11 w-11 rounded-full backdrop-blur-md flex items-center justify-center transition ${
                        isLiked
                          ? "bg-rose-500 text-white"
                          : "bg-black/40 text-white group-hover:bg-black/60"
                      }`}
                    >
                      <Heart
                        className={`w-5 h-5 ${isLiked ? "fill-current" : ""}`}
                      />
                    </span>
                    <span className="text-[12px] font-semibold">
                      {(short.likes + (isLiked ? 1 : 0)).toLocaleString()}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOpenCommentsShortId(short.id)}
                    className="flex flex-col items-center gap-1 cursor-pointer group"
                  >
                    <span className="h-11 w-11 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center group-hover:bg-black/60 transition">
                      <MessageCircle className="w-5 h-5" />
                    </span>
                    <span className="text-[12px] font-semibold">
                      {totalComments}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setSavedMap((p) => ({ ...p, [short.id]: !p[short.id] }))
                    }
                    className="flex flex-col items-center gap-1 cursor-pointer group"
                  >
                    <span
                      className={`h-11 w-11 rounded-full backdrop-blur-md flex items-center justify-center transition ${
                        isSaved
                          ? "bg-amber-500 text-white"
                          : "bg-black/40 text-white group-hover:bg-black/60"
                      }`}
                    >
                      <Bookmark
                        className={`w-5 h-5 ${isSaved ? "fill-current" : ""}`}
                      />
                    </span>
                    <span className="text-[12px] font-semibold">
                      {isSaved
                        ? lang === "th"
                          ? "บันทึกแล้ว"
                          : "Saved"
                        : lang === "th"
                        ? "บันทึก"
                        : "Save"}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (typeof navigator !== "undefined" && navigator.clipboard) {
                        navigator.clipboard.writeText(window.location.href);
                      }
                      setSharedFeedbackId(short.id);
                      setTimeout(() => setSharedFeedbackId(null), 1800);
                    }}
                    className="flex flex-col items-center gap-1 cursor-pointer group"
                  >
                    <span className="h-11 w-11 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center group-hover:bg-black/60 transition">
                      <Share2 className="w-5 h-5" />
                    </span>
                    <span className="text-[12px] font-semibold">
                      {sharedFeedbackId === short.id
                        ? lang === "th"
                          ? "คัดลอกแล้ว"
                          : "Copied"
                        : lang === "th"
                        ? "แชร์"
                        : "Share"}
                    </span>
                  </button>
                </div>

                {/* Bottom Overlay: Author, Caption, Audio & Direct Room Booking Card */}
                <div className="absolute inset-x-0 bottom-0 z-20 p-4 pb-24 lg:pb-4 pr-16 space-y-3 text-white">
                  {/* Author & Promo Pill */}
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-full bg-white text-[#171717] flex items-center justify-center font-bold text-[12px] shrink-0">
                      SU
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[14px] font-bold truncate">
                          @sapanunseen
                        </span>
                        <span className="rounded-full bg-emerald-500 text-white px-2 py-0.5 text-[12px] font-semibold">
                          Official
                        </span>
                      </div>
                    </div>
                    {short.couponCode && (
                      <button
                        type="button"
                        onClick={() => handleApplyCoupon(short.couponCode)}
                        className="rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md px-2.5 py-1 text-[12px] font-semibold transition cursor-pointer"
                      >
                        {appliedCouponCode === short.couponCode
                          ? lang === "th"
                            ? `✓ ใช้โค้ด ${short.couponCode}`
                            : `✓ Code ${short.couponCode}`
                          : lang === "th"
                          ? `เก็บโค้ด ${short.couponCode}`
                          : `Claim ${short.couponCode}`}
                      </button>
                    )}
                  </div>

                  {/* Title & Caption */}
                  <div className="space-y-1">
                    <h2 className="text-[16px] font-bold leading-snug">
                      {lang === "th" ? short.titleTh : short.titleEn}
                    </h2>
                    <p className="text-[14px] text-white/85 line-clamp-2 leading-relaxed">
                      {lang === "th" ? short.captionTh : short.captionEn}
                    </p>
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {short.hashtags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[12px] font-semibold text-white/90"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Audio Track Pill */}
                  <div className="flex items-center gap-2 text-[12px] text-white/80">
                    <Music2 className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{short.audioLabel}</span>
                  </div>

                  {/* Linked Room Direct-Booking Card inside Short */}
                  {linkedRoom && (
                    <div
                      onClick={() => openRoomDrawer(linkedRoom, "details")}
                      className="rounded-[16px] bg-white/15 hover:bg-white/25 backdrop-blur-xl border border-white/20 p-2.5 flex items-center justify-between gap-3 cursor-pointer transition"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={linkedRoom.images[0]?.url}
                          alt={
                            lang === "th"
                              ? linkedRoom.nameTh
                              : linkedRoom.nameEn
                          }
                          className="w-12 h-12 rounded-[10px] object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <BedDouble className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                            <span className="text-[14px] font-bold truncate">
                              {lang === "th"
                                ? linkedRoom.nameTh
                                : linkedRoom.nameEn}{" "}
                              ({linkedRoom.code})
                            </span>
                          </div>
                          <span className="text-[12px] text-white/85 block">
                            {lang === "th"
                              ? `฿${nightly.toLocaleString()} / คืน · รวม ${nights} คืน`
                              : `฿${nightly.toLocaleString()} / night · ${nights} nights`}
                          </span>
                        </div>
                      </div>

                      <span className="rounded-full bg-white text-[#171717] px-3.5 py-1.5 text-[12px] font-bold shrink-0">
                        {lang === "th" ? "จองห้องนี้ →" : "Book Villa →"}
                      </span>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        {/* Slide-Up Comments Sheet inside Shorts Player */}
        {activeCommentShort && (
          <div className="absolute inset-0 z-40 bg-black/50 flex flex-col justify-end">
            <div className="rounded-t-[24px] bg-[var(--color-background-popover)] text-[var(--color-text-primary)] p-4 max-h-[65%] flex flex-col gap-3">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
                <h3 className="ty-subtitle">
                  {lang === "th" ? "ความคิดเห็น" : "Comments"} (
                  {activeCommentShort.comments.length +
                    (customComments[activeCommentShort.id]?.length ?? 0)}
                  )
                </h3>
                <button
                  type="button"
                  onClick={() => setOpenCommentsShortId(null)}
                  className="h-8 w-8 rounded-full hover:bg-[var(--color-overlay-hover)] flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 py-1">
                {[
                  ...activeCommentShort.comments,
                  ...(customComments[activeCommentShort.id] || []),
                ].map((cm) => (
                  <div key={cm.id} className="flex items-start gap-2.5">
                    <div className="h-8 w-8 rounded-full bg-[var(--color-accent)] text-[var(--color-on-accent)] flex items-center justify-center text-[12px] font-bold shrink-0">
                      {cm.user.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="ty-caption font-bold text-[var(--color-text-primary)]">
                          @{cm.user}
                        </span>
                        <span className="ty-caption">{cm.time}</span>
                      </div>
                      <p className="ty-body mt-0.5">{cm.text}</p>
                    </div>
                  </div>
                ))}
              </div>

              <form
                onSubmit={handleAddComment}
                className="flex items-center gap-2 pt-2 border-t border-[var(--color-border)]"
              >
                <input
                  type="text"
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  placeholder={
                    lang === "th" ? "แสดงความคิดเห็น..." : "Add a comment..."
                  }
                  className="flex-1 h-10 rounded-full bg-[var(--color-background-card)] px-4 text-[14px] focus:outline-none"
                />
                <button
                  type="submit"
                  className="btn-round-solid !h-10 !px-4 shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Desktop Right-Side Up / Down Slide Navigation Buttons */}
      <div className="hidden lg:flex flex-col gap-2.5 ml-4">
        <button
          type="button"
          disabled={activeIndex === 0}
          onClick={() => scrollToSlide(activeIndex - 1)}
          aria-label="Previous video"
          className="h-11 w-11 rounded-full bg-[var(--color-background-card)] hover:bg-[var(--color-overlay-pressed)] disabled:opacity-35 flex items-center justify-center text-[var(--color-text-primary)] transition cursor-pointer"
        >
          <ChevronUp className="w-5 h-5" />
        </button>
        <button
          type="button"
          disabled={activeIndex === RESORT_SHORTS.length - 1}
          onClick={() => scrollToSlide(activeIndex + 1)}
          aria-label="Next video"
          className="h-11 w-11 rounded-full bg-[var(--color-background-card)] hover:bg-[var(--color-overlay-pressed)] disabled:opacity-35 flex items-center justify-center text-[var(--color-text-primary)] transition cursor-pointer"
        >
          <ChevronDown className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
