"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ChevronLeft,
  ChevronRight,
  Images,
  Pause,
  Play,
  Video,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { RoomLodge, WhiteLabelPropertyConfig } from "@/data/rooms";
import { LanguageCode } from "@/lib/dateFormatters";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";

export interface GalleryPhotoItem {
  id: string;
  url: string;
  captionTh: string;
  captionEn: string;
  category:
    | "rooms"
    | "property"
    | "facilities"
    | "dining"
    | "attractions"
    | "guest";
  categoryLabelTh: string;
  categoryLabelEn: string;
  roomCode?: string;
  roomNameTh?: string;
  roomNameEn?: string;
  sourceType: "property" | "guest";
}

export interface RoomGalleryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedRoom: RoomLodge | null;
  allRooms: RoomLodge[];
  propertyConfig: WhiteLabelPropertyConfig;
  language: LanguageCode;
}

const GALLERY_CATEGORY_TABS = [
  { id: "rooms", labelTh: "ห้องพัก", labelEn: "Rooms" },
  { id: "video", labelTh: "วิดีโอ", labelEn: "Video" },
  { id: "property", labelTh: "บรรยากาศที่พัก", labelEn: "Property Views" },
  { id: "facilities", labelTh: "สิ่งอำนวยความสะดวก", labelEn: "Facilities" },
  { id: "dining", labelTh: "อาหาร & เครื่องดื่ม", labelEn: "Dining" },
  {
    id: "other",
    labelTh: "รีวิว & รอบที่พัก",
    labelEn: "Attractions & Guest Photos",
  },
] as const;

export function RoomGalleryDrawer({
  isOpen,
  onClose,
  selectedRoom,
  allRooms,
  propertyConfig,
  language,
}: RoomGalleryDrawerProps) {
  const [activeCategoryId, setActiveCategoryId] = useState<string>("rooms");
  const [lightboxPhotoIndex, setLightboxPhotoIndex] = useState<number | null>(
    null
  );
  const [isPlayingPromoVideo, setIsPlayingPromoVideo] = useState(false);
  const [isPromoVideoMuted, setIsPromoVideoMuted] = useState(true);
  const [activeRoomFilterCode, setActiveRoomFilterCode] =
    useState<string>("ALL");

  const drawerScrollBodyRef = useRef<HTMLDivElement | null>(null);
  const categoryTabNavRef = useRef<HTMLElement | null>(null);
  const promoVideoElementRef = useRef<HTMLVideoElement | null>(null);
  const lightboxThumbnailStripRef = useRef<HTMLDivElement | null>(null);
  const savedScrollTopRef = useRef<number>(0);
  const isProgrammaticScrollRef = useRef<boolean>(false);
  const wasPreviouslyOpenRef = useRef<boolean>(false);

  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (isOpen && !wasPreviouslyOpenRef.current) {
      wasPreviouslyOpenRef.current = true;
      setActiveCategoryId("rooms");
      setLightboxPhotoIndex(null);
      setIsPlayingPromoVideo(false);
      setActiveRoomFilterCode(selectedRoom ? selectedRoom.code : "ALL");
      if (drawerScrollBodyRef.current) {
        drawerScrollBodyRef.current.scrollTop = 0;
      }
    } else if (!isOpen && wasPreviouslyOpenRef.current) {
      wasPreviouslyOpenRef.current = false;
    }
  }, [isOpen, selectedRoom]);

  const roomPhotos = useMemo<GalleryPhotoItem[]>(() => {
    const photos: GalleryPhotoItem[] = [];
    allRooms.forEach((room) => {
      room.images.forEach((image, idx) => {
        photos.push({
          id: `room-${room.id}-${idx}`,
          url: image.url,
          captionTh:
            image.captionTh ||
            `${room.nameTh} (${room.code}) - ภาพที่ ${idx + 1}`,
          captionEn:
            image.captionEn ||
            `${room.nameEn} (${room.code}) - Photo ${idx + 1}`,
          category: "rooms",
          categoryLabelTh: `ห้องพัก · ${room.code}`,
          categoryLabelEn: `Rooms · ${room.code}`,
          roomCode: room.code,
          roomNameTh: room.nameTh,
          roomNameEn: room.nameEn,
          sourceType: "property",
        });
      });
    });
    return photos;
  }, [allRooms]);

  const propertyPhotos = useMemo<GalleryPhotoItem[]>(() => {
    const rawItems = [
      {
        url:
          propertyConfig.heroImageUrl ||
          "https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&w=2000&q=85",
        captionTh: "บ้านไม้ทรง A-Frame ท่ามกลางป่าสนและขุนเขาสะปัน",
        captionEn: "Iconic A-Frame timber lodges in pine forest of Sapan",
      },
      {
        url: "https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=1400&q=85",
        captionTh: "ทัศนียภาพสายหมอกและยอดเขาหุบเขาสะปันยามเช้า",
        captionEn: "Morning sea of mist over Sapan mountain valley",
      },
      {
        url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1400&q=85",
        captionTh: "ลำธารธรรมชาติและทางเดินสายหมอกในหมู่บ้านสะปัน",
        captionEn: "Natural stream and misty walkway in Ban Sapan",
      },
      {
        url: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1400&q=85",
        captionTh: "แสงสีทองยามเย็นและระเบียงชมวิวพาโนรามา",
        captionEn: "Golden hour sunset terrace view",
      },
      {
        url: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1400&q=85",
        captionTh: "บรรยากาศเงียบสงบและสถาปัตยกรรมไม้ธรรมชาติ",
        captionEn: "Serene mountain ambiance and natural timber architecture",
      },
      {
        url: "https://images.unsplash.com/photo-1449844908441-8829872d2607?auto=format&fit=crop&w=1400&q=85",
        captionTh: "สะพานโบราณและทุ่งนาเขียวขจีกลางสายหมอกสะปัน",
        captionEn: "Ancient bridge and emerald rice fields in Sapan mist",
      },
    ];

    return rawItems.map((item, idx) => ({
      id: `prop-${idx}`,
      url: item.url,
      captionTh: item.captionTh,
      captionEn: item.captionEn,
      category: "property",
      categoryLabelTh: "บรรยากาศรอบที่พัก",
      categoryLabelEn: "Property views",
      sourceType: "property",
    }));
  }, [propertyConfig]);

  const facilitiesPhotos = useMemo<GalleryPhotoItem[]>(() => {
    const rawItems = [
      {
        url: "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1400&q=85",
        captionTh: "อ่างแช่น้ำกลางแจ้ง (Outdoor Soaking Tub) ชมวิวทะเลหมอก",
        captionEn: "Outdoor soaking tub overlooking mountain ridge",
      },
      {
        url: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1400&q=85",
        captionTh: "มุมพักผ่อนและสปาส่วนตัวท่ามกลางธรรมชาติ",
        captionEn: "Private pavilion amidst lush greenery",
      },
      {
        url: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1400&q=85",
        captionTh: "ห้องน้ำและสิ่งอำนวยความสะดวกระดับพรีเมียม",
        captionEn: "Luxury bathroom amenities & fittings",
      },
      {
        url: "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1400&q=85",
        captionTh: "เตียงนอนดูดวิญญาณพร้อมชุดเครื่องนอนคอตตอน 100%",
        captionEn: "Plush king-size bed with 100% fine cotton linens",
      },
    ];

    return rawItems.map((item, idx) => ({
      id: `facility-${idx}`,
      url: item.url,
      captionTh: item.captionTh,
      captionEn: item.captionEn,
      category: "facilities",
      categoryLabelTh: "สิ่งอำนวยความสะดวก",
      categoryLabelEn: "Facilities",
      sourceType: "property",
    }));
  }, []);

  const diningPhotos = useMemo<GalleryPhotoItem[]>(() => {
    const rawItems = [
      {
        url: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1400&q=85",
        captionTh: "ชุดหมูกระทะร้อนๆ รับลมหนาวเสิร์ฟถึงระเบียงห้องพัก",
        captionEn: "Private terrace Thai BBQ (Moo Krata) dinner set",
      },
      {
        url: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1400&q=85",
        captionTh: "ชุดดริปกาแฟสดเมล็ดกาแฟน่าน พร้อมกาน้ำร้อนไฟฟ้า",
        captionEn: "Nan single-origin pour-over drip coffee set",
      },
      {
        url: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1400&q=85",
        captionTh: "เซ็ตอาหารเช้าเสิร์ฟถึงระเบียงบ้านพัก (08:00 - 09:30 น.)",
        captionEn: "Signature breakfast tray served to your private deck",
      },
      {
        url: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1400&q=85",
        captionTh: "มุมกาแฟยามเช้าและอาหารว่างต้อนรับ",
        captionEn: "Morning coffee corner with complimentary refreshments",
      },
    ];

    return rawItems.map((item, idx) => ({
      id: `dining-${idx}`,
      url: item.url,
      captionTh: item.captionTh,
      captionEn: item.captionEn,
      category: "dining",
      categoryLabelTh: "อาหารและเครื่องดื่ม",
      categoryLabelEn: "Dining",
      sourceType: "property",
    }));
  }, []);

  const otherPhotos = useMemo<GalleryPhotoItem[]>(() => {
    const rawItems = [
      {
        url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1400&q=85",
        captionTh: "น้ำตกสะปันและสะพานโบราณใจกลางหมู่บ้าน (เดินเพียง 8 นาที)",
        captionEn: "Sapan Waterfall & ancient village bridge (8-min walk)",
        category: "attractions" as const,
      },
      {
        url: "https://images.unsplash.com/photo-1449844908441-8829872d2607?auto=format&fit=crop&w=1400&q=85",
        captionTh: "นาข้าวขั้นบันไดสะปันและวิวทิวทัศน์หุบเขาดงพญา",
        captionEn: "Sapan terraced rice fields & Dong Phaya valley",
        category: "attractions" as const,
      },
      {
        url: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=1400&q=85",
        captionTh: "บ่อเกลือโบราณ 800 ปีและวิถีชุมชนท้องถิ่น อ.บ่อเกลือ",
        captionEn: "800-year-old ancient rock salt wells in Bo Kluea",
        category: "attractions" as const,
      },
      {
        url: "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1400&q=85",
        captionTh:
          "ภาพจากผู้เข้าพัก: แช่น้ำอุ่นยามเช้าหมอกลงหนามาก ประทับใจสุดๆ",
        captionEn: "Guest Photo: Morning outdoor soak in dense sea of mist",
        category: "guest" as const,
      },
      {
        url: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1400&q=85",
        captionTh: "ภาพจากผู้เข้าพัก: หมูกระทะร้อนๆ ตอน 17 องศา อร่อยฟินมาก",
        captionEn: "Guest Photo: Enjoying hot Moo Krata at 17°C",
        category: "guest" as const,
      },
      {
        url: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1400&q=85",
        captionTh:
          "ภาพจากผู้เข้าพัก: บ้านพัก A-Frame สวยตรงปก สะอาด เงียบสงบ",
        captionEn:
          "Guest Photo: A-Frame lodge is true to photos, clean & peaceful",
        category: "guest" as const,
      },
    ];

    return rawItems.map((item, idx) => ({
      id: `other-${idx}`,
      url: item.url,
      captionTh: item.captionTh,
      captionEn: item.captionEn,
      category: item.category,
      categoryLabelTh: "อื่นๆ และภาพจากลูกค้า",
      categoryLabelEn: "Other",
      sourceType: item.category === "guest" ? "guest" : "property",
    }));
  }, []);

  const filteredRoomPhotos = useMemo(() => {
    if (activeRoomFilterCode === "ALL") {
      return roomPhotos;
    }
    return roomPhotos.filter(
      (photo) => photo.roomCode === activeRoomFilterCode
    );
  }, [roomPhotos, activeRoomFilterCode]);

  const allGalleryPhotos = useMemo<GalleryPhotoItem[]>(
    () => [
      ...filteredRoomPhotos,
      ...propertyPhotos,
      ...facilitiesPhotos,
      ...diningPhotos,
      ...otherPhotos,
    ],
    [
      filteredRoomPhotos,
      propertyPhotos,
      facilitiesPhotos,
      diningPhotos,
      otherPhotos,
    ]
  );

  useEffect(() => {
    if (lightboxPhotoIndex !== null && lightboxThumbnailStripRef.current) {
      const activeThumbButton =
        lightboxThumbnailStripRef.current.querySelector<HTMLButtonElement>(
          `[data-thumb-index="${lightboxPhotoIndex}"]`
        );
      activeThumbButton?.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }
  }, [lightboxPhotoIndex]);

  const handleOpenLightbox = useCallback(
    (photo: GalleryPhotoItem) => {
      let targetIndex = allGalleryPhotos.findIndex(
        (candidate) => candidate.id === photo.id
      );
      if (targetIndex === -1) {
        targetIndex = allGalleryPhotos.findIndex(
          (candidate) => candidate.url === photo.url
        );
        if (targetIndex === -1) {
          targetIndex = 0;
        }
      }
      if (drawerScrollBodyRef.current) {
        savedScrollTopRef.current = drawerScrollBodyRef.current.scrollTop;
      }
      setLightboxPhotoIndex(targetIndex);
    },
    [allGalleryPhotos]
  );

  const handleCloseLightbox = useCallback(() => {
    setLightboxPhotoIndex(null);
    const savedScroll = savedScrollTopRef.current;
    setTimeout(() => {
      if (drawerScrollBodyRef.current) {
        drawerScrollBodyRef.current.scrollTop = savedScroll;
      }
    }, 40);
  }, []);

  const handleBodyScroll = useCallback(() => {
    if (isProgrammaticScrollRef.current || !drawerScrollBodyRef.current) {
      return;
    }
    const container = drawerScrollBodyRef.current;
    const { scrollTop, scrollHeight, clientHeight } = container;

    if (scrollTop + clientHeight >= scrollHeight - 35) {
      setActiveCategoryId("other");
      return;
    }
    if (scrollTop < 60) {
      setActiveCategoryId("rooms");
      return;
    }

    const sectionOrder = [
      "rooms",
      "video",
      "property",
      "facilities",
      "dining",
      "other",
    ];
    const containerRect = container.getBoundingClientRect();
    let currentSection = "rooms";

    for (const sectionId of sectionOrder) {
      const sectionElement = document.getElementById(
        `gallery-section-${sectionId}`
      );
      if (sectionElement) {
        const elementRect = sectionElement.getBoundingClientRect();
        if (elementRect.top - containerRect.top <= 140) {
          currentSection = sectionId;
        }
      }
    }

    setActiveCategoryId(currentSection);
  }, []);

  useEffect(() => {
    if (!categoryTabNavRef.current) {
      return;
    }
    const activeTabButton =
      categoryTabNavRef.current.querySelector<HTMLButtonElement>(
        `[data-tab-id="${activeCategoryId}"]`
      );
    activeTabButton?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [activeCategoryId]);

  const handleSelectCategoryTab = (tabId: string) => {
    setActiveCategoryId(tabId);
    isProgrammaticScrollRef.current = true;

    const container = drawerScrollBodyRef.current;
    if (!container) {
      return;
    }

    if (tabId === "rooms") {
      container.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      const targetElement = document.getElementById(`gallery-section-${tabId}`);
      if (targetElement) {
        const offsetTop = targetElement.offsetTop - container.offsetTop;
        container.scrollTo({
          top: Math.max(0, offsetTop - 10),
          behavior: "smooth",
        });
      } else {
        container.scrollTo({ top: 0, behavior: "smooth" });
      }
    }

    setTimeout(() => {
      isProgrammaticScrollRef.current = false;
    }, 550);
  };

  const handleToggleVideoPlayback = () => {
    if (!promoVideoElementRef.current) {
      return;
    }
    if (isPlayingPromoVideo) {
      promoVideoElementRef.current.pause();
      setIsPlayingPromoVideo(false);
    } else {
      promoVideoElementRef.current.play().catch(() => {});
      setIsPlayingPromoVideo(true);
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) {
        return;
      }
      if (event.key === "Escape") {
        if (lightboxPhotoIndex !== null) {
          handleCloseLightbox();
        } else {
          onClose();
        }
      } else if (lightboxPhotoIndex !== null) {
        if (event.key === "ArrowRight") {
          setLightboxPhotoIndex((prev) =>
            prev !== null ? (prev + 1) % allGalleryPhotos.length : 0
          );
        } else if (event.key === "ArrowLeft") {
          setLightboxPhotoIndex((prev) =>
            prev !== null
              ? (prev - 1 + allGalleryPhotos.length) % allGalleryPhotos.length
              : 0
          );
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isOpen,
    lightboxPhotoIndex,
    allGalleryPhotos.length,
    handleCloseLightbox,
    onClose,
  ]);

  const renderPhotoGrid = (photos: GalleryPhotoItem[]) => (
    <div className="grid grid-cols-2 gap-2 px-4 sm:px-0">
      {photos.map((photo) => (
        <article
          key={photo.id}
          onClick={() => handleOpenLightbox(photo)}
          className="relative aspect-[16/10] w-full rounded-[12px] sm:rounded-[16px] overflow-hidden bg-black cursor-pointer"
        >
          <img
            src={photo.url}
            alt={language === "th" ? photo.captionTh : photo.captionEn}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover object-center hover:scale-[1.02] transition-transform duration-300"
          />
        </article>
      ))}
    </div>
  );

  if (!isOpen) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[70] overflow-hidden"
    >
      <div
        className="app-right-drawer-backdrop animate-fade-in-backdrop"
        onClick={onClose}
      />

      <div className="app-right-drawer z-10 animate-slide-in-right-drawer">
        {/* Top Header & Pure Media Category Pill Tabs */}
        <header className="bg-[var(--color-background-card)] shadow-[0_2px_16px_rgba(15,23,42,0.04)] shrink-0 z-20">
          <div className="flex items-center justify-between gap-2 px-4 sm:px-5 pt-3 pb-2">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="h-9 w-9 rounded-full bg-[var(--color-accent-muted)] text-[var(--color-accent)] flex items-center justify-center shrink-0">
                <Images className="w-4 h-4" />
              </div>
              <h1 className="ty-subtitle truncate min-w-0">
                {activeRoomFilterCode !== "ALL"
                  ? language === "th"
                    ? `แกลเลอรีรูปภาพ (${activeRoomFilterCode})`
                    : `Photo Gallery (${activeRoomFilterCode})`
                  : language === "th"
                  ? "แกลเลอรีรูปภาพและวิดีโอ"
                  : "Photo & Video Gallery"}
              </h1>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close gallery"
              className="btn-icon shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {lightboxPhotoIndex === null && (
            <nav
              ref={categoryTabNavRef}
              aria-label="Photo Categories"
              className="flex items-center gap-1.5 overflow-x-auto px-4 sm:px-5 pb-3 pt-1 bg-[var(--color-background-card)] no-scrollbar"
            >
              {GALLERY_CATEGORY_TABS.map((tab) => {
                const isTabActive = activeCategoryId === tab.id;
                return (
                  <button
                    key={tab.id}
                    data-tab-id={tab.id}
                    type="button"
                    onClick={() => handleSelectCategoryTab(tab.id)}
                    className={`shrink-0 h-8 rounded-full px-3.5 ty-caption font-semibold inline-flex items-center transition cursor-pointer whitespace-nowrap ${
                      isTabActive
                        ? "bg-[var(--color-accent)] text-[var(--color-on-accent)]"
                        : "bg-[var(--color-background-muted)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                    }`}
                  >
                    {language === "th" ? tab.labelTh : tab.labelEn}
                  </button>
                );
              })}
            </nav>
          )}
        </header>

        {/* Body: Lightbox View OR Categorized Photo & Video Gallery */}
        {lightboxPhotoIndex !== null && allGalleryPhotos[lightboxPhotoIndex] ? (
          <div className="flex-1 bg-[var(--color-background-card)] flex flex-col overflow-hidden">
            <div className="px-4 sm:px-5 py-2.5 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={handleCloseLightbox}
                className="inline-flex items-center gap-2 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-overlay-hover)] px-3.5 py-1.5 ty-body font-semibold text-[var(--color-text-primary)] transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>
                  {language === "th" ? "กลับไปหน้ารวมรูปภาพ" : "Back to photos"}
                </span>
              </button>

              <span className="ty-body font-semibold text-[var(--color-text-secondary)] tabular-nums">
                {lightboxPhotoIndex + 1} / {allGalleryPhotos.length}
              </span>
            </div>

            <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden select-none">
              <img
                src={allGalleryPhotos[lightboxPhotoIndex].url}
                alt={
                  language === "th"
                    ? allGalleryPhotos[lightboxPhotoIndex].captionTh
                    : allGalleryPhotos[lightboxPhotoIndex].captionEn
                }
                className="max-h-full max-w-full object-contain"
              />

              {allGalleryPhotos.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setLightboxPhotoIndex(
                        (prev) =>
                          ((prev ?? 0) - 1 + allGalleryPhotos.length) %
                          allGalleryPhotos.length
                      )
                    }
                    aria-label="Previous photo"
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/65 hover:bg-black/85 text-white flex items-center justify-center transition cursor-pointer"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setLightboxPhotoIndex(
                        (prev) => ((prev ?? 0) + 1) % allGalleryPhotos.length
                      )
                    }
                    aria-label="Next photo"
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/65 hover:bg-black/85 text-white flex items-center justify-center transition cursor-pointer"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>

            <div className="bg-[var(--color-background-card)] px-4 sm:px-5 py-3 space-y-2.5 shrink-0">
              <div className="flex items-center justify-between gap-2">
                <p className="ty-body font-semibold text-[var(--color-text-primary)] truncate">
                  {language === "th"
                    ? allGalleryPhotos[lightboxPhotoIndex].captionTh
                    : allGalleryPhotos[lightboxPhotoIndex].captionEn}
                </p>
                <span className="ty-caption shrink-0">
                  {language === "th"
                    ? allGalleryPhotos[lightboxPhotoIndex].categoryLabelTh
                    : allGalleryPhotos[lightboxPhotoIndex].categoryLabelEn}
                </span>
              </div>

              <div
                ref={lightboxThumbnailStripRef}
                className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 px-0.5"
              >
                {allGalleryPhotos.map((thumb, idx) => {
                  const isCurrent = idx === lightboxPhotoIndex;
                  return (
                    <button
                      key={thumb.id}
                      data-thumb-index={idx}
                      type="button"
                      onClick={() => setLightboxPhotoIndex(idx)}
                      className={`relative h-12 w-18 rounded-[8px] overflow-hidden shrink-0 transition cursor-pointer ${
                        isCurrent
                          ? "ring-2 ring-[var(--color-accent)] opacity-100"
                          : "opacity-55 hover:opacity-90"
                      }`}
                    >
                      <img
                        src={thumb.url}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div
            ref={drawerScrollBodyRef}
            onScroll={handleBodyScroll}
            className="flex-1 bg-[var(--color-background-card)] py-4 px-0 sm:p-5 overflow-y-auto overscroll-contain"
          >
            <div className="space-y-8 pb-6">
              {/* SECTION 1: Rooms (Placed first so room photo clicks show room gallery immediately) */}
              <section
                id="gallery-section-rooms"
                className="scroll-mt-4 space-y-3"
              >
                <div className="flex flex-col gap-2 px-4 sm:px-0">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h2 className="ty-title">
                        {language === "th" ? "ภาพถ่ายห้องพัก" : "Room Photos"}
                      </h2>
                      <p className="ty-caption">
                        {language === "th"
                          ? "ภาพถ่ายจริงภายในห้องพักและระเบียงส่วนตัวแต่ละหลัง"
                          : "Verified interior and private terrace photos"}
                      </p>
                    </div>
                    <span className="ty-caption font-semibold shrink-0">
                      {filteredRoomPhotos.length}{" "}
                      {language === "th" ? "ภาพ" : "photos"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                    <button
                      type="button"
                      onClick={() => setActiveRoomFilterCode("ALL")}
                      className={`h-8 px-3 ty-caption font-semibold rounded-full inline-flex items-center transition cursor-pointer shrink-0 ${
                        activeRoomFilterCode === "ALL"
                          ? "bg-[var(--color-accent)] text-[var(--color-on-accent)]"
                          : "bg-[var(--color-background-muted)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                      }`}
                    >
                      {language === "th" ? "ทุกห้อง" : "All Rooms"}
                    </button>
                    {allRooms.map((roomItem) => (
                      <button
                        key={roomItem.id}
                        type="button"
                        onClick={() => setActiveRoomFilterCode(roomItem.code)}
                        className={`h-8 px-3 ty-caption font-semibold rounded-full inline-flex items-center transition cursor-pointer shrink-0 ${
                          activeRoomFilterCode === roomItem.code
                            ? "bg-[var(--color-accent)] text-[var(--color-on-accent)]"
                            : "bg-[var(--color-background-muted)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                        }`}
                      >
                        {roomItem.code}
                      </button>
                    ))}
                  </div>
                </div>
                {renderPhotoGrid(filteredRoomPhotos)}
              </section>

              {/* SECTION 2: Video Tour */}
              <section
                id="gallery-section-video"
                className="scroll-mt-4 space-y-3"
              >
                <div className="px-4 sm:px-0">
                  <h2 className="ty-title flex items-center gap-2">
                    <Video className="w-5 h-5" />
                    <span>
                      {language === "th"
                        ? "วิดีโอแนะนำบรรยากาศที่พัก"
                        : "Resort Video Tour"}
                    </span>
                  </h2>
                  <p className="ty-caption mt-0.5">
                    {language === "th"
                      ? "มุมมองทางอากาศ 4K ทะเลหมอกและหุบเขาสะปัน"
                      : "4K aerial footage over Sapan Valley"}
                  </p>
                </div>

                <div className="w-full rounded-none sm:rounded-[16px] overflow-hidden bg-[var(--color-background-muted)]">
                  <div className="group relative w-full aspect-[16/9] bg-black overflow-hidden">
                    <video
                      ref={promoVideoElementRef}
                      loop
                      muted={isPromoVideoMuted}
                      playsInline
                      preload="metadata"
                      poster={
                        propertyConfig.heroImageUrl ||
                        "https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&w=1200&q=85"
                      }
                      className="w-full h-full object-cover"
                      src="https://assets.mixkit.co/videos/preview/mixkit-drone-flying-over-mountains-in-a-misty-morning-42657-large.mp4"
                    />

                    {!isPlayingPromoVideo && (
                      <div
                        onClick={handleToggleVideoPlayback}
                        className="absolute inset-0 flex items-center justify-center bg-black/25 hover:bg-black/35 transition cursor-pointer z-10"
                      >
                        <div className="h-14 w-14 rounded-full bg-white text-[#171717] flex items-center justify-center shadow-lg transition">
                          <Play className="w-6 h-6 fill-current ml-0.5" />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-3.5 px-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="ty-body font-semibold truncate">
                        {language === "th"
                          ? "บินลัดเลาะทะเลหมอกและหุบเขาสะปัน (4K Aerial)"
                          : "Sapan Valley Morning Sea of Mist Drone Tour"}
                      </p>
                      <p className="ty-caption truncate">
                        {language === "th"
                          ? "มุมมองภาพรวมรีสอร์ตและขุนเขาดงพญา"
                          : "Bird's eye view over resort grounds"}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setIsPromoVideoMuted((prevMuted) => !prevMuted)
                        }
                        className="btn-icon"
                        title={isPromoVideoMuted ? "Unmute" : "Mute"}
                      >
                        {isPromoVideoMuted ? (
                          <VolumeX className="w-4 h-4" />
                        ) : (
                          <Volume2 className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={handleToggleVideoPlayback}
                        className="h-9 w-9 rounded-full bg-[var(--color-accent)] text-[var(--color-on-accent)] flex items-center justify-center transition cursor-pointer"
                      >
                        {isPlayingPromoVideo ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4 fill-current" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              {/* SECTION 3: Property Views */}
              <section
                id="gallery-section-property"
                className="scroll-mt-4 space-y-3"
              >
                <div className="flex items-center justify-between px-4 sm:px-0">
                  <div>
                    <h2 className="ty-title">
                      {language === "th"
                        ? "บรรยากาศและวิวรอบที่พัก"
                        : "Property views"}
                    </h2>
                    <p className="ty-caption">
                      {language === "th"
                        ? "บ้านไม้ A-Frame ลำธารธรรมชาติ และวิวทะเลหมอกยามเช้า"
                        : "Iconic timber villas, natural stream, and sea of mist"}
                    </p>
                  </div>
                  <span className="ty-caption font-semibold">
                    {propertyPhotos.length}{" "}
                    {language === "th" ? "ภาพ" : "photos"}
                  </span>
                </div>
                {renderPhotoGrid(propertyPhotos)}
              </section>

              {/* SECTION 4: Facilities */}
              <section
                id="gallery-section-facilities"
                className="scroll-mt-4 space-y-3"
              >
                <div className="flex items-center justify-between px-4 sm:px-0">
                  <div>
                    <h2 className="ty-title">
                      {language === "th"
                        ? "สิ่งอำนวยความสะดวก & สปา"
                        : "Facilities"}
                    </h2>
                    <p className="ty-caption">
                      {language === "th"
                        ? "อ่างแช่น้ำกลางแจ้ง สปาส่วนตัว และชุดเครื่องนอนระดับพรีเมียม"
                        : "Outdoor soaking tubs, spa pavilions, and luxury bedding"}
                    </p>
                  </div>
                  <span className="ty-caption font-semibold">
                    {facilitiesPhotos.length}{" "}
                    {language === "th" ? "ภาพ" : "photos"}
                  </span>
                </div>
                {renderPhotoGrid(facilitiesPhotos)}
              </section>

              {/* SECTION 5: Dining */}
              <section
                id="gallery-section-dining"
                className="scroll-mt-4 space-y-3"
              >
                <div className="flex items-center justify-between px-4 sm:px-0">
                  <div>
                    <h2 className="ty-title">
                      {language === "th" ? "อาหารและเครื่องดื่ม" : "Dining"}
                    </h2>
                    <p className="ty-caption">
                      {language === "th"
                        ? "ชุดหมูกระทะเสิร์ฟถึงระเบียง กาแฟดริปน่าน และชุดอาหารเช้า"
                        : "Private terrace Thai BBQ, drip coffee, and local breakfast"}
                    </p>
                  </div>
                  <span className="ty-caption font-semibold">
                    {diningPhotos.length}{" "}
                    {language === "th" ? "ภาพ" : "photos"}
                  </span>
                </div>
                {renderPhotoGrid(diningPhotos)}
              </section>

              {/* SECTION 6: Attractions & Guest Photos */}
              <section
                id="gallery-section-other"
                className="scroll-mt-4 space-y-3"
              >
                <div className="flex items-center justify-between px-4 sm:px-0">
                  <div>
                    <h2 className="ty-title">
                      {language === "th"
                        ? "แหล่งท่องเที่ยวสะปัน & ภาพจากผู้เข้าพัก"
                        : "Attractions & Guest Photos"}
                    </h2>
                    <p className="ty-caption">
                      {language === "th"
                        ? "น้ำตกสะปัน นาข้าวขั้นบันได บ่อเกลือโบราณ และภาพจริงจากลูกค้า"
                        : "Nearby sights around Ban Sapan and verified guest photos"}
                    </p>
                  </div>
                  <span className="ty-caption font-semibold">
                    {otherPhotos.length}{" "}
                    {language === "th" ? "ภาพ" : "photos"}
                  </span>
                </div>
                {renderPhotoGrid(otherPhotos)}
              </section>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
