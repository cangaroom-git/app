"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Grid,
  Home,
  Maximize2,
  Calendar,
  Play,
  Pause,
  Video,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  RoomLodge,
  ExtraAddon,
  ResortExperienceItem,
  WhiteLabelPropertyConfig,
} from "@/data/rooms";

export interface GalleryPhoto {
  id: string;
  url: string;
  captionTh: string;
  captionEn: string;
  category:
    | "current_room"
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

interface RoomGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedRoom: RoomLodge | null;
  allRooms: RoomLodge[];
  propertyConfig: WhiteLabelPropertyConfig;
  addons?: ExtraAddon[];
  experiences?: ResortExperienceItem[];
  lang: "th" | "en";
  onBookRoom?: (room: RoomLodge) => void;
}

export function RoomGalleryModal({
  isOpen,
  onClose,
  selectedRoom,
  allRooms,
  propertyConfig,
  lang,
  onBookRoom,
}: RoomGalleryModalProps) {
  // Active Tab state — Defaults to "all" (All photos) first as requested
  const [activeCategory, setActiveCategory] = useState<string>("all");

  // Lightbox / Single-photo zoom view
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);

  // Video interactive states
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [activeRoomFilter, setActiveRoomFilter] = useState<string>("ALL");

  const modalBodyRef = useRef<HTMLDivElement>(null);
  const tabNavRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isProgrammaticScrollRef = useRef<boolean>(false);

  // Tabs ordered by importance: All photos > Video > Property Views > Rooms > Facilities > Dining > Other
  const categoryTabs = useMemo(
    () => [
      { id: "all", labelTh: "All photos", labelEn: "All photos" },
      { id: "video", labelTh: "Video", labelEn: "Video" },
      { id: "property", labelTh: "Property views", labelEn: "Property views" },
      { id: "rooms", labelTh: "Rooms", labelEn: "Rooms" },
      { id: "facilities", labelTh: "Facilities", labelEn: "Facilities" },
      { id: "dining", labelTh: "Dining", labelEn: "Dining" },
      { id: "other", labelTh: "Other", labelEn: "Other" },
    ],
    []
  );

  // Reset to "all" view and reset states when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveCategory("all");
      setActivePhotoIndex(null);
      setIsPlayingVideo(false);
      if (selectedRoom) {
        setActiveRoomFilter(selectedRoom.code);
      } else {
        setActiveRoomFilter("ALL");
      }
    }
  }, [isOpen, selectedRoom]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isOpen]);


  // =========================================================================
  // CATEGORIZED PHOTO DATA BUILDER (100% Real Authentic Photos)
  // =========================================================================
  const propertyPhotos: GalleryPhoto[] = useMemo(() => {
    const list = [
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

    return list.map((item, idx) => ({
      id: `prop-${idx}`,
      url: item.url,
      captionTh: item.captionTh,
      captionEn: item.captionEn,
      category: "property" as const,
      categoryLabelTh: "Property views",
      categoryLabelEn: "Property views",
      sourceType: "property" as const,
    }));
  }, [propertyConfig]);

  const roomPhotos: GalleryPhoto[] = useMemo(() => {
    const list: GalleryPhoto[] = [];
    allRooms.forEach((rm) => {
      rm.images.forEach((img, idx) => {
        list.push({
          id: `room-${rm.id}-${idx}`,
          url: img.url,
          captionTh:
            img.captionTh || `${rm.nameTh} (${rm.code}) - ภาพที่ ${idx + 1}`,
          captionEn:
            img.captionEn || `${rm.nameEn} (${rm.code}) - Photo ${idx + 1}`,
          category: "rooms",
          categoryLabelTh: `Rooms · ${rm.code}`,
          categoryLabelEn: `Rooms · ${rm.code}`,
          roomCode: rm.code,
          roomNameTh: rm.nameTh,
          roomNameEn: rm.nameEn,
          sourceType: "property",
        });
      });
    });
    return list;
  }, [allRooms]);

  const facilitiesPhotos: GalleryPhoto[] = useMemo(() => {
    const list = [
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

    return list.map((item, idx) => ({
      id: `facility-${idx}`,
      url: item.url,
      captionTh: item.captionTh,
      captionEn: item.captionEn,
      category: "facilities" as const,
      categoryLabelTh: "Facilities",
      categoryLabelEn: "Facilities",
      sourceType: "property" as const,
    }));
  }, []);

  const diningPhotos: GalleryPhoto[] = useMemo(() => {
    const list = [
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

    return list.map((item, idx) => ({
      id: `dining-${idx}`,
      url: item.url,
      captionTh: item.captionTh,
      captionEn: item.captionEn,
      category: "dining" as const,
      categoryLabelTh: "Dining",
      categoryLabelEn: "Dining",
      sourceType: "property" as const,
    }));
  }, []);

  const otherPhotos: GalleryPhoto[] = useMemo(() => {
    const list = [
      {
        url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1400&q=85",
        captionTh: "น้ำตกสะปันและสะพานโบราณใจกลางหมู่บ้าน (เดินเพียง 8 นาที)",
        captionEn: "Sapan Waterfall & ancient village bridge (8-min walk)",
        cat: "attractions" as const,
      },
      {
        url: "https://images.unsplash.com/photo-1449844908441-8829872d2607?auto=format&fit=crop&w=1400&q=85",
        captionTh: "นาข้าวขั้นบันไดสะปันและวิวทิวทัศน์หุบเขาดงพญา",
        captionEn: "Sapan terraced rice fields & Dong Phaya valley",
        cat: "attractions" as const,
      },
      {
        url: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=1400&q=85",
        captionTh: "บ่อเกลือโบราณ 800 ปีและวิถีชุมชนท้องถิ่น อ.บ่อเกลือ",
        captionEn: "800-year-old ancient rock salt wells in Bo Kluea",
        cat: "attractions" as const,
      },
      {
        url: "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1400&q=85",
        captionTh: "ภาพจากผู้เข้าพัก: แช่น้ำอุ่นยามเช้าหมอกลงหนามาก ประทับใจสุดๆ",
        captionEn: "Guest Photo: Morning outdoor soak in dense sea of mist",
        cat: "guest" as const,
      },
      {
        url: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1400&q=85",
        captionTh: "ภาพจากผู้เข้าพัก: หมูกระทะร้อนๆ ตอน 17 องศา อร่อยฟินมาก",
        captionEn: "Guest Photo: Enjoying hot Moo Krata at 17°C",
        cat: "guest" as const,
      },
      {
        url: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1400&q=85",
        captionTh: "ภาพจากผู้เข้าพัก: บ้านพัก A-Frame สวยตรงปก สะอาด เงียบสงบ",
        captionEn: "Guest Photo: A-Frame lodge is true to photos, clean & peaceful",
        cat: "guest" as const,
      },
      {
        url: "https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=1400&q=85",
        captionTh: "ภาพจากผู้เข้าพัก: เปิดม่านห้องนอนมาเจอหมอกเต็มตา",
        captionEn: "Guest Photo: Waking up to panoramic sea of mist right outside bed",
        cat: "guest" as const,
      },
      {
        url: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1400&q=85",
        captionTh: "ภาพจากผู้เข้าพัก: ดริปกาแฟน่านตอนเช้า หอมกรุ่นชื่นใจ",
        captionEn: "Guest Photo: Hand-dripping Nan Arabica coffee on terrace",
        cat: "guest" as const,
      },
      {
        url: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1400&q=85",
        captionTh: "ภาพจากผู้เข้าพัก: ศาลาพักผ่อนรับลมหนาวสดชื่นยามบ่าย",
        captionEn: "Guest Photo: Relaxing pavilion in cool afternoon breeze",
        cat: "guest" as const,
      },
    ];

    return list.map((item, idx) => ({
      id: `other-${idx}`,
      url: item.url,
      captionTh: item.captionTh,
      captionEn: item.captionEn,
      category: item.cat,
      categoryLabelTh: "Other",
      categoryLabelEn: "Other",
      sourceType: item.cat === "guest" ? ("guest" as const) : ("property" as const),
    }));
  }, []);

  // Master array of all photos for unified Lightbox browsing
  const allPhotos: GalleryPhoto[] = useMemo(() => {
    return [
      ...propertyPhotos,
      ...roomPhotos,
      ...facilitiesPhotos,
      ...diningPhotos,
      ...otherPhotos,
    ];
  }, [propertyPhotos, roomPhotos, facilitiesPhotos, diningPhotos, otherPhotos]);

  // Filtered room photos when using room code chips
  const displayedRoomPhotos = useMemo(() => {
    if (activeRoomFilter === "ALL") return roomPhotos;
    return roomPhotos.filter((p) => p.roomCode === activeRoomFilter);
  }, [roomPhotos, activeRoomFilter]);

  const savedScrollTopRef = useRef<number>(0);
  const thumbnailStripRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll active thumbnail into view in the thumbnail strip
  useEffect(() => {
    if (activePhotoIndex !== null && thumbnailStripRef.current) {
      const activeThumb =
        thumbnailStripRef.current.querySelector<HTMLButtonElement>(
          `[data-thumb-index="${activePhotoIndex}"]`
        );
      if (activeThumb) {
        activeThumb.scrollIntoView({
          behavior: "smooth",
          inline: "center",
          block: "nearest",
        });
      }
    }
  }, [activePhotoIndex]);

  // Find photo index in allPhotos for Lightbox mode
  const openLightboxForPhoto = useCallback(
    (photo: GalleryPhoto) => {
      let idx = allPhotos.findIndex((p) => p.id === photo.id);
      if (idx === -1) {
        idx = allPhotos.findIndex((p) => p.url === photo.url);
        if (idx === -1) idx = 0;
      }
      if (modalBodyRef.current) {
        savedScrollTopRef.current = modalBodyRef.current.scrollTop;
      }
      setActivePhotoIndex(idx);
    },
    [allPhotos]
  );

  // Close Lightbox mode and restore exact feed scroll position
  const closeLightbox = useCallback(() => {
    setActivePhotoIndex(null);
    const targetScroll = savedScrollTopRef.current;
    setTimeout(() => {
      if (modalBodyRef.current) {
        modalBodyRef.current.scrollTop = targetScroll;
      }
    }, 40);
  }, []);

  // =========================================================================
  // SCROLLSPY ENGINE: Auto-update tab indicator as user scrolls the gallery
  // =========================================================================
  const handleScroll = useCallback(() => {
    if (isProgrammaticScrollRef.current) return;
    const container = modalBodyRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;

    // Reached bottom of container
    if (scrollTop + clientHeight >= scrollHeight - 35) {
      setActiveCategory("other");
      return;
    }

    // Near the top of the container
    if (scrollTop < 70) {
      setActiveCategory("all");
      return;
    }

    // Check each section relative to container top
    const sectionIds = [
      "video",
      "property",
      "rooms",
      "facilities",
      "dining",
      "other",
    ];

    const containerRect = container.getBoundingClientRect();
    let detectedSection = "all";

    for (const secId of sectionIds) {
      const el = document.getElementById(`gallery-section-${secId}`);
      if (el) {
        const elRect = el.getBoundingClientRect();
        if (elRect.top - containerRect.top <= 140) {
          detectedSection = secId;
        }
      }
    }

    setActiveCategory(detectedSection);
  }, []);

  // Keep active tab horizontally centered in the scrolling tabs bar
  useEffect(() => {
    if (tabNavRef.current) {
      const activeBtn = tabNavRef.current.querySelector<HTMLButtonElement>(
        `[data-tab-id="${activeCategory}"]`
      );
      if (activeBtn) {
        activeBtn.scrollIntoView({
          behavior: "smooth",
          inline: "center",
          block: "nearest",
        });
      }
    }
  }, [activeCategory]);

  // Tab click handler: Smooth scroll to selected section
  const handleTabClick = (tabId: string) => {
    setActiveCategory(tabId);
    isProgrammaticScrollRef.current = true;

    const performScroll = () => {
      const container = modalBodyRef.current;
      if (!container) return;

      if (tabId === "all") {
        container.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        const targetEl = document.getElementById(`gallery-section-${tabId}`);
        if (targetEl) {
          const offset = targetEl.offsetTop - container.offsetTop;
          container.scrollTo({
            top: Math.max(0, offset - 10),
            behavior: "smooth",
          });
        }
      }

      setTimeout(() => {
        isProgrammaticScrollRef.current = false;
      }, 550);
    };

    if (activePhotoIndex !== null) {
      setActivePhotoIndex(null);
      setTimeout(performScroll, 50);
    } else {
      performScroll();
    }
  };

  // Toggle Video Play / Pause
  const toggleVideoPlayback = () => {
    if (videoRef.current) {
      if (isPlayingVideo) {
        videoRef.current.pause();
        setIsPlayingVideo(false);
      } else {
        videoRef.current.play().catch(() => {});
        setIsPlayingVideo(true);
      }
    }
  };

  // Keyboard Navigation for Lightbox
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        if (activePhotoIndex !== null) {
          closeLightbox();
        } else {
          onClose();
        }
      } else if (activePhotoIndex !== null) {
        if (e.key === "ArrowLeft") {
          setActivePhotoIndex((prev) =>
            prev !== null
              ? (prev - 1 + allPhotos.length) % allPhotos.length
              : null
          );
        } else if (e.key === "ArrowRight") {
          setActivePhotoIndex((prev) =>
            prev !== null ? (prev + 1) % allPhotos.length : null
          );
        }
      }
    },
    [isOpen, activePhotoIndex, allPhotos.length, onClose, closeLightbox]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // =========================================================================
  // RENDER HELPERS: Clean 3-column desktop grid & Dynamic alternating mobile grid
  // =========================================================================

  // Desktop 3-column clean photo grid (No quote cards, 100% real photos)
  const renderDesktopGrid = (photos: GalleryPhoto[]) => (
    <div className="hidden md:grid md:grid-cols-3 gap-3.5">
      {photos.map((photo) => (
        <article
          key={photo.id}
          onClick={() => openLightboxForPhoto(photo)}
          className="group relative aspect-[16/10] overflow-hidden rounded-[2px] bg-[#EAE4DC] border border-[#E6E0D6] hover:border-[#2563EB] shadow-2xs hover:shadow-md transition-all duration-300 cursor-pointer"
        >
          <img
            src={photo.url}
            alt={lang === "th" ? photo.captionTh : photo.captionEn}
            className="h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute top-2.5 left-2.5 z-10">
            {photo.roomCode ? (
              <span className="rounded-[2px] bg-[#2C2A29]/80 backdrop-blur-xs text-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <Home className="w-3 h-3 text-[#E6DEC8]" />
                <span>{photo.roomCode}</span>
              </span>
            ) : (
              <span className="rounded-[2px] bg-[#2C2A29]/75 backdrop-blur-xs text-white px-2 py-0.5 text-[10px] font-medium">
                {lang === "th" ? photo.categoryLabelTh : photo.categoryLabelEn}
              </span>
            )}
          </div>
          <div className="absolute top-2.5 right-2.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="h-7 w-7 rounded-[2px] bg-black/60 text-white flex items-center justify-center">
              <Maximize2 className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent p-3 pt-6 text-white opacity-90 group-hover:opacity-100 transition-opacity">
            <p className="text-xs font-medium leading-snug line-clamp-1">
              {lang === "th" ? photo.captionTh : photo.captionEn}
            </p>
          </div>
        </article>
      ))}
    </div>
  );

  // Mobile dynamic alternating editorial grid (Always strictly alternating: Wide -> Pair -> Wide -> Pair...)
  const renderMobileEditorialGrid = (photos: GalleryPhoto[]) => {
    if (photos.length === 0) return null;

    const elements: React.ReactNode[] = [];
    let i = 0;
    let isWide = true;

    while (i < photos.length) {
      if (isWide) {
        // Single wide hero photo (Row with 1 full-width photo)
        const photo = photos[i];
        elements.push(
          <div
            key={`wide-${photo.id}`}
            onClick={() => openLightboxForPhoto(photo)}
            className="group relative aspect-[16/10] w-full overflow-hidden rounded-[2px] bg-[#EAE4DC] border border-[#E6E0D6] cursor-pointer"
          >
            <img
              src={photo.url}
              alt={lang === "th" ? photo.captionTh : photo.captionEn}
              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            {photo.roomCode && (
              <span className="absolute top-2.5 left-2.5 rounded-[2px] bg-[#2C2A29]/80 backdrop-blur-xs text-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <Home className="w-3 h-3 text-[#E6DEC8]" />
                <span>{photo.roomCode}</span>
              </span>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent p-3 pt-6 text-white opacity-90">
              <p className="text-xs font-medium leading-snug line-clamp-1">
                {lang === "th" ? photo.captionTh : photo.captionEn}
              </p>
            </div>
          </div>
        );
        i += 1;
        isWide = false; // Next row MUST be a 2-column pair
      } else {
        // 2-column pair row (Row with 2 photos side-by-side)
        const p1 = photos[i];
        const p2 = photos[i + 1];

        if (p2) {
          // Exactly 2 photos side-by-side
          elements.push(
            <div key={`pair-${p1.id}-${p2.id}`} className="grid grid-cols-2 gap-2.5">
              <div
                onClick={() => openLightboxForPhoto(p1)}
                className="group relative aspect-[4/3] w-full overflow-hidden rounded-[2px] bg-[#EAE4DC] border border-[#E6E0D6] cursor-pointer"
              >
                <img
                  src={p1.url}
                  alt={lang === "th" ? p1.captionTh : p1.captionEn}
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                {p1.roomCode && (
                  <span className="absolute top-2 left-2 rounded-[2px] bg-[#2C2A29]/80 backdrop-blur-xs text-white px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <Home className="w-2.5 h-2.5 text-[#E6DEC8]" />
                    <span>{p1.roomCode}</span>
                  </span>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-transparent to-transparent p-2 text-white">
                  <p className="text-[11px] font-medium leading-tight line-clamp-1">
                    {lang === "th" ? p1.captionTh : p1.captionEn}
                  </p>
                </div>
              </div>

              <div
                onClick={() => openLightboxForPhoto(p2)}
                className="group relative aspect-[4/3] w-full overflow-hidden rounded-[2px] bg-[#EAE4DC] border border-[#E6E0D6] cursor-pointer"
              >
                <img
                  src={p2.url}
                  alt={lang === "th" ? p2.captionTh : p2.captionEn}
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                {p2.roomCode && (
                  <span className="absolute top-2 left-2 rounded-[2px] bg-[#2C2A29]/80 backdrop-blur-xs text-white px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <Home className="w-2.5 h-2.5 text-[#E6DEC8]" />
                    <span>{p2.roomCode}</span>
                  </span>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-transparent to-transparent p-2 text-white">
                  <p className="text-[11px] font-medium leading-tight line-clamp-1">
                    {lang === "th" ? p2.captionTh : p2.captionEn}
                  </p>
                </div>
              </div>
            </div>
          );
          i += 2;
          isWide = true; // Next row MUST be a wide photo
        } else {
          // Only 1 photo remaining at the end, render as single wide photo
          elements.push(
            <div
              key={`wide-tail-${p1.id}`}
              onClick={() => openLightboxForPhoto(p1)}
              className="group relative aspect-[16/10] w-full overflow-hidden rounded-[2px] bg-[#EAE4DC] border border-[#E6E0D6] cursor-pointer"
            >
              <img
                src={p1.url}
                alt={lang === "th" ? p1.captionTh : p1.captionEn}
                className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              {p1.roomCode && (
                <span className="absolute top-2.5 left-2.5 rounded-[2px] bg-[#2C2A29]/80 backdrop-blur-xs text-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <Home className="w-3 h-3 text-[#E6DEC8]" />
                  <span>{p1.roomCode}</span>
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent p-3 pt-6 text-white opacity-90">
                <p className="text-xs font-medium leading-snug line-clamp-1">
                  {lang === "th" ? p1.captionTh : p1.captionEn}
                </p>
              </div>
            </div>
          );
          i += 1;
          isWide = true; // Next row MUST be a wide photo
        }
      }
    }

    return <div className="space-y-2.5 md:hidden">{elements}</div>;
  };

  if (!isOpen) return null;

  const currentPhoto =
    activePhotoIndex !== null ? allPhotos[activePhotoIndex] : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-6"
    >
      {/* Standard Backdrop Overlay */}
      <div
        className="fixed inset-0 bg-[#4A4946]/65 backdrop-blur-xs transition-opacity hidden md:block"
        onClick={onClose}
      />

      {/* Main Container: Fullscreen on Mobile (< md), Fixed Height on Desktop/Tablet (>= md) */}
      <div className="relative w-full h-[100dvh] md:h-[88vh] md:max-h-[88vh] md:min-h-[88vh] md:max-w-6xl bg-white rounded-none md:rounded-[2px] shadow-2xl flex flex-col overflow-hidden z-10 border-0 md:border md:border-[#E2DAD0]">
        {/* ===================================================================
            AGODA-STYLE TOP BAR & TABS (Header Anatomy)
        ==================================================================== */}
        <header className="bg-white shrink-0 z-20">
          {/* Row 1: Left '✕' or '←' + Photos & Videos Title / Subtitle + Right CTA */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 sm:py-3 border-b border-[#E6E0D6]">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={activePhotoIndex !== null ? closeLightbox : onClose}
                aria-label={
                  activePhotoIndex !== null
                    ? "Back to All Photos"
                    : "Close Gallery"
                }
                className="p-1 -ml-1 text-[#2C2A29] hover:bg-[#F4EFE6] rounded-[2px] transition cursor-pointer shrink-0"
              >
                {activePhotoIndex !== null ? (
                  <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 text-[#2563EB]" />
                ) : (
                  <X className="w-5 h-5 sm:w-6 sm:h-6" />
                )}
              </button>

              <div className="min-w-0">
                <h1 className="text-sm sm:text-base font-bold text-[#1E293B] leading-tight truncate">
                  {activePhotoIndex !== null && currentPhoto
                    ? lang === "th"
                      ? currentPhoto.captionTh
                      : currentPhoto.captionEn
                    : `Photos & Videos (${allPhotos.length + 1})`}
                </h1>
                <p className="text-[11px] sm:text-xs text-[#64748B] truncate">
                  {activePhotoIndex !== null
                    ? lang === "th"
                      ? "กดปุ่มเพื่อกลับไปดูภาพรวมทั้งหมด (Grid View)"
                      : "Click back to view all photos in Grid View"
                    : propertyConfig.nameTh || "Sapan Unseen Nan"}
                </p>
              </div>
            </div>

            {/* Right Action: Clean Agoda Book Room CTA (Sharp rounded-[2px]) */}
            {selectedRoom && onBookRoom && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onBookRoom(selectedRoom);
                }}
                className="rounded-[2px] bg-[#A29080] hover:bg-[#8E7B6B] text-white px-3 sm:px-4 py-1.5 text-xs font-bold transition cursor-pointer shadow-xs inline-flex items-center gap-1.5 shrink-0"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">
                  {lang === "th"
                    ? `เลือกจองห้องพัก ${selectedRoom.code}`
                    : `Book Room ${selectedRoom.code}`}
                </span>
                <span className="sm:hidden">
                  {lang === "th" ? `จอง ${selectedRoom.code}` : `Book`}
                </span>
              </button>
            )}
          </div>

          {/* Row 2: In Lightbox Mode, show prominent Back Bar; in Grid Mode, show Category Tabs */}
          {activePhotoIndex !== null ? (
            <div className="flex items-center justify-between px-4 sm:px-6 py-2 sm:py-2.5 border-b border-[#E6E0D6] bg-[#FBF9F6]">
              <button
                type="button"
                onClick={closeLightbox}
                className="rounded-[2px] bg-white hover:bg-[#F4EFE6] border border-[#A29080] text-[#4A4643] hover:text-[#A29080] px-3.5 py-1.5 text-xs sm:text-sm font-bold inline-flex items-center gap-2 transition cursor-pointer shadow-xs"
              >
                <Grid className="w-4 h-4 text-[#A29080]" />
                <span>
                  {lang === "th"
                    ? "← กลับไปดูภาพรวมทั้งหมด (Grid View)"
                    : "← Back to All Photos (Grid View)"}
                </span>
              </button>

              <div className="flex items-center gap-2">
                {currentPhoto?.roomCode && (
                  <span className="rounded-[2px] bg-[#2C2A29] text-white px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <Home className="w-3 h-3 text-[#E6DEC8]" />
                    <span>{currentPhoto.roomCode}</span>
                  </span>
                )}
                <div className="rounded-[2px] bg-[#4A4643] text-white px-2.5 py-1 text-xs font-bold tracking-wider">
                  {activePhotoIndex + 1} / {allPhotos.length}
                </div>
              </div>
            </div>
          ) : (
            <nav
              ref={tabNavRef}
              aria-label="Photo Categories"
              className="flex items-center gap-4 sm:gap-6 overflow-x-auto px-4 sm:px-6 border-b border-[#E6E0D6] bg-white scrollbar-none"
            >
              {categoryTabs.map((tab) => {
                const isActive = activeCategory === tab.id;
                return (
                  <button
                    key={tab.id}
                    data-tab-id={tab.id}
                    type="button"
                    onClick={() => handleTabClick(tab.id)}
                    className={`shrink-0 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold transition cursor-pointer border-b-2 whitespace-nowrap ${
                      isActive
                        ? "border-[#2563EB] text-[#2563EB] font-bold"
                        : "border-transparent text-[#64748B] hover:text-[#1E293B]"
                    }`}
                  >
                    {lang === "th" ? tab.labelTh : tab.labelEn}
                  </button>
                );
              })}
            </nav>
          )}
        </header>

        {/* ===================================================================
            MODAL BODY: Switch between Continuous Agoda Photo Feed and Lightbox Viewer
        ==================================================================== */}
        <div
          ref={modalBodyRef}
          onScroll={activePhotoIndex === null ? handleScroll : undefined}
          className={`flex-1 bg-white sm:bg-[#FBF9F6] ${
            activePhotoIndex !== null
              ? "p-2 sm:p-4 overflow-hidden flex flex-col"
              : "p-4 sm:p-6 overflow-y-auto"
          }`}
        >
          {activePhotoIndex !== null && currentPhoto ? (
            /* ===============================================================
               LIGHTBOX / SLIDESHOW MODE (Full resolution with Next/Prev)
            ================================================================ */
            <div className="flex flex-col h-full justify-between items-center space-y-2 sm:space-y-3">
              {/* Main Photo Viewport with Left/Right Buttons & Floating Controls */}
              <div className="relative w-full flex-1 min-h-[260px] bg-black rounded-[2px] overflow-hidden flex items-center justify-center shadow-lg">
                <img
                  src={currentPhoto.url}
                  alt={
                    lang === "th"
                      ? currentPhoto.captionTh
                      : currentPhoto.captionEn
                  }
                  className="max-h-full max-w-full object-contain select-none"
                />

                {/* Floating Top-Left Back Button for direct one-click return */}
                <button
                  type="button"
                  onClick={closeLightbox}
                  className="absolute top-3 left-3 z-20 rounded-[2px] bg-black/70 hover:bg-black/90 backdrop-blur-xs text-white border border-white/25 px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer shadow-md"
                >
                  <Grid className="w-3.5 h-3.5 text-[#E6DEC8]" />
                  <span>
                    {lang === "th" ? "กลับไปดูภาพรวม" : "Back to Grid"}
                  </span>
                </button>

                {/* Floating Top-Right Counter Badge */}
                <div className="absolute top-3 right-3 z-20 rounded-[2px] bg-black/70 backdrop-blur-xs text-white border border-white/25 px-2.5 py-1 text-xs font-bold shadow-md">
                  {activePhotoIndex + 1} / {allPhotos.length}
                </div>

                {/* Left Arrow Button */}
                {allPhotos.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setActivePhotoIndex(
                        (activePhotoIndex - 1 + allPhotos.length) %
                          allPhotos.length
                      )
                    }
                    aria-label="Previous photo"
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 sm:h-12 sm:w-12 rounded-[2px] bg-black/60 hover:bg-black/85 text-white flex items-center justify-center transition cursor-pointer shadow-md z-10"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                )}

                {/* Right Arrow Button */}
                {allPhotos.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setActivePhotoIndex(
                        (activePhotoIndex + 1) % allPhotos.length
                      )
                    }
                    aria-label="Next photo"
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 sm:h-12 sm:w-12 rounded-[2px] bg-black/60 hover:bg-black/85 text-white flex items-center justify-center transition cursor-pointer shadow-md z-10"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                )}

                {/* Bottom Caption Overlay */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent p-3 sm:p-4 text-white z-10">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs sm:text-sm font-medium leading-snug">
                      {lang === "th"
                        ? currentPhoto.captionTh
                        : currentPhoto.captionEn}
                    </p>
                    {currentPhoto.roomCode && (
                      <span className="shrink-0 rounded-[2px] bg-[#A29080] text-white px-2 py-0.5 text-[11px] font-bold">
                        {currentPhoto.roomCode}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Thumbnail Strip for Fast Scrubbing */}
              <div
                ref={thumbnailStripRef}
                className="w-full shrink-0 flex items-center gap-2 overflow-x-auto py-1 px-1 scrollbar-none"
              >
                {allPhotos.map((photo, idx) => (
                  <button
                    key={photo.id}
                    data-thumb-index={idx}
                    type="button"
                    onClick={() => setActivePhotoIndex(idx)}
                    className={`relative h-12 sm:h-14 w-16 sm:w-20 shrink-0 rounded-[2px] overflow-hidden cursor-pointer transition ${
                      activePhotoIndex === idx
                        ? "ring-2 ring-[#2563EB] opacity-100 scale-105"
                        : "opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={photo.url}
                      alt={photo.captionTh}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* ===============================================================
               CONTINUOUS PHOTO GALLERY STREAM WITH SCROLLSPY
               Ordered by Importance:
               1. Video / 360
               2. Property views
               3. Rooms
               4. Facilities
               5. Dining
               6. Other (Attractions & Guest Photos)
            ================================================================ */
            <div className="space-y-10 pb-12">
              {/* =============================================================
                  SECTION 1: VIDEO TOUR
              ============================================================== */}
              <section id="gallery-section-video" className="scroll-mt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-[#1E293B] flex items-center gap-2">
                      <Video className="w-5 h-5 text-[#A29080]" />
                      <span>
                        {lang === "th"
                          ? "วิดีโอแนะนำรีสอร์ต"
                          : "Resort Video Tour"}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-[2px] bg-[#A29080]/15 text-[#A29080] tracking-wider uppercase">
                        4K UHD
                      </span>
                    </h2>
                    <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">
                      {lang === "th"
                        ? "สัมผัสบรรยากาศจริงผ่านมุมมองทางอากาศ 4K บินลัดเลาะทะเลหมอกและหุบเขาสะปัน"
                        : "Experience real resort ambiance via 4K aerial drone footage over Sapan Valley"}
                    </p>
                  </div>
                </div>

                {/* Single Featured Video Card */}
                <div className="w-full">
                  <div className="group relative rounded-[2px] overflow-hidden bg-black border border-[#E6E0D6] shadow-2xs aspect-[16/9] sm:aspect-[21/9] max-h-[480px] flex flex-col justify-end">
                    <video
                      ref={videoRef}
                      loop
                      muted={isMuted}
                      playsInline
                      poster={propertyConfig.heroImageUrl || "https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&w=1200&q=85"}
                      className="absolute inset-0 w-full h-full object-cover"
                      src="https://assets.mixkit.co/videos/preview/mixkit-drone-flying-over-mountains-in-a-misty-morning-42657-large.mp4"
                    />

                    {/* Top Badges */}
                    <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
                      <span className="rounded-[2px] bg-black/75 backdrop-blur-xs text-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <Video className="w-3 h-3 text-[#A29080]" />
                        <span>{lang === "th" ? "วิดีโอมุมสูง 4K" : "4K Drone Reel"}</span>
                      </span>
                      <span className="rounded-[2px] bg-black/60 text-white/90 px-1.5 py-0.5 text-[10px] font-medium">
                        0:45
                      </span>
                    </div>

                    {/* Center Big Play Button Overlay */}
                    {!isPlayingVideo && (
                      <div
                        onClick={toggleVideoPlayback}
                        className="absolute inset-0 flex items-center justify-center bg-black/25 hover:bg-black/35 transition cursor-pointer z-10"
                      >
                        <div className="h-14 w-14 rounded-[2px] bg-[#A29080] hover:bg-[#8E7B6B] text-white flex items-center justify-center shadow-lg transition transform group-hover:scale-110">
                          <Play className="w-6 h-6 fill-white ml-0.5" />
                        </div>
                      </div>
                    )}

                    {/* Bottom Controls & Caption Overlay */}
                    <div className="relative z-10 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3.5 pt-8 text-white flex items-end justify-between">
                      <div>
                        <p className="text-xs sm:text-sm font-semibold">
                          {lang === "th"
                            ? "บินลัดเลาะทะเลหมอกและหุบเขาสะปัน (4K Aerial)"
                            : "Sapan Valley Morning Sea of Mist Drone Tour"}
                        </p>
                        <p className="text-[11px] text-slate-300">
                          {lang === "th"
                            ? "มุมมองภาพรวมรีสอร์ตและขุนเขาดงพญา"
                            : "Bird's eye view over resort grounds and Dong Phaya"}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setIsMuted(!isMuted)}
                          className="p-1.5 rounded-[2px] bg-black/60 hover:bg-black/90 text-white text-xs transition cursor-pointer"
                          title={isMuted ? "Unmute" : "Mute"}
                        >
                          {isMuted ? (
                            <VolumeX className="w-4 h-4" />
                          ) : (
                            <Volume2 className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={toggleVideoPlayback}
                          className="p-1.5 rounded-[2px] bg-black/60 hover:bg-black/90 text-white text-xs transition cursor-pointer"
                        >
                          {isPlayingVideo ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4 fill-white" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* =============================================================
                  SECTION 2: PROPERTY VIEWS
              ============================================================== */}
              <section id="gallery-section-property" className="scroll-mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-[#1E293B]">
                      {lang === "th" ? "Property views · วิวและบรรยากาศรีสอร์ต" : "Property views"}
                    </h2>
                    <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">
                      {lang === "th"
                        ? "บ้านไม้ A-Frame สระน้ำ ลำธารธรรมชาติ และวิวทะเลหมอกยามเช้า"
                        : "Iconic timber villas, natural stream, and sea of mist"}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-[#64748B]">
                    {propertyPhotos.length} {lang === "th" ? "ภาพ" : "photos"}
                  </span>
                </div>

                {/* Clean 3-Column Desktop Grid & Alternating Editorial Mobile Grid */}
                {renderDesktopGrid(propertyPhotos)}
                {renderMobileEditorialGrid(propertyPhotos)}
              </section>

              {/* =============================================================
                  SECTION 3: ROOMS
              ============================================================== */}
              <section id="gallery-section-rooms" className="scroll-mt-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-[#1E293B]">
                      {lang === "th" ? "Rooms · ห้องพักทั้งหมด" : "Rooms"}
                    </h2>
                    <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">
                      {lang === "th"
                        ? "ภาพถ่ายจริงห้องพักทุกหลัง สะอาด ตรงปก พร้อมอ่างแช่น้ำชมวิว"
                        : "Verified photos of all guest villas and suites"}
                    </p>
                  </div>

                  {/* Room Quick Filter Chips */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                    <button
                      type="button"
                      onClick={() => setActiveRoomFilter("ALL")}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-[2px] transition cursor-pointer shrink-0 border ${
                        activeRoomFilter === "ALL"
                          ? "bg-[#2563EB] text-white border-[#2563EB]"
                          : "bg-white text-[#4A4643] border-[#E2DAD0] hover:border-[#A29080]"
                      }`}
                    >
                      {lang === "th" ? "ทุกห้อง" : "All Rooms"}
                    </button>
                    {allRooms.map((rm) => (
                      <button
                        key={rm.id}
                        type="button"
                        onClick={() => setActiveRoomFilter(rm.code)}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-[2px] transition cursor-pointer shrink-0 border ${
                          activeRoomFilter === rm.code
                            ? "bg-[#2563EB] text-white border-[#2563EB]"
                            : "bg-white text-[#4A4643] border-[#E2DAD0] hover:border-[#A29080]"
                        }`}
                      >
                        {rm.code}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Selected Room Notification Banner if user picked a room */}
                {selectedRoom && (
                  <div className="bg-[#F4EFE6] border border-[#E2DAD0] p-2.5 sm:p-3 rounded-[2px] flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <Home className="w-4 h-4 text-[#A29080] shrink-0" />
                      <p className="text-xs text-[#2C2A29] truncate">
                        <span className="font-bold">
                          {lang === "th" ? `ห้องพักที่คุณเลือก:` : `Selected Room:`}
                        </span>{" "}
                        {selectedRoom.code} · {lang === "th" ? selectedRoom.nameTh : selectedRoom.nameEn}
                      </p>
                    </div>

                    {onBookRoom && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onBookRoom(selectedRoom);
                        }}
                        className="rounded-[2px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-3 py-1 text-xs font-bold transition cursor-pointer shadow-2xs shrink-0"
                      >
                        {lang === "th" ? `จองห้องนี้` : `Book Now`}
                      </button>
                    )}
                  </div>
                )}

                {/* Clean 3-Column Desktop Grid & Alternating Editorial Mobile Grid */}
                {renderDesktopGrid(displayedRoomPhotos)}
                {renderMobileEditorialGrid(displayedRoomPhotos)}
              </section>

              {/* =============================================================
                  SECTION 4: FACILITIES
              ============================================================== */}
              <section id="gallery-section-facilities" className="scroll-mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-[#1E293B]">
                      {lang === "th" ? "Facilities · สิ่งอำนวยความสะดวก & สปา" : "Facilities"}
                    </h2>
                    <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">
                      {lang === "th"
                        ? "อ่างแช่น้ำกลางแจ้ง สปาส่วนตัว เตียงนุ่มดูดวิญญาณ และระเบียงกว้าง"
                        : "Outdoor soaking tubs, spa pavilions, and luxury bedding"}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-[#64748B]">
                    {facilitiesPhotos.length} {lang === "th" ? "ภาพ" : "photos"}
                  </span>
                </div>

                {/* Clean 3-Column Desktop Grid & Alternating Editorial Mobile Grid */}
                {renderDesktopGrid(facilitiesPhotos)}
                {renderMobileEditorialGrid(facilitiesPhotos)}
              </section>

              {/* =============================================================
                  SECTION 5: DINING
              ============================================================== */}
              <section id="gallery-section-dining" className="scroll-mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-[#1E293B]">
                      {lang === "th" ? "Dining · อาหารและเครื่องดื่ม" : "Dining"}
                    </h2>
                    <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">
                      {lang === "th"
                        ? "ชุดหมูกระทะเสิร์ฟถึงระเบียง กาแฟดริปน่าน และชุดอาหารเช้าพื้นเมือง"
                        : "Private terrace Thai BBQ, single-origin drip coffee, and local breakfast"}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-[#64748B]">
                    {diningPhotos.length} {lang === "th" ? "ภาพ" : "photos"}
                  </span>
                </div>

                {/* Clean 3-Column Desktop Grid & Alternating Editorial Mobile Grid */}
                {renderDesktopGrid(diningPhotos)}
                {renderMobileEditorialGrid(diningPhotos)}
              </section>

              {/* =============================================================
                  SECTION 6: OTHER (Attractions & Guest Verified Photos)
              ============================================================== */}
              <section id="gallery-section-other" className="scroll-mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-[#1E293B]">
                      {lang === "th"
                        ? "Other · แหล่งท่องเที่ยวสะปัน & ภาพจากผู้เข้าพัก"
                        : "Other · Attractions & Guest Photos"}
                    </h2>
                    <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">
                      {lang === "th"
                        ? "น้ำตกสะปัน นาข้าวขั้นบันได บ่อเกลือโบราณ 800 ปี และภาพถ่ายจริงจากลูกค้า"
                        : "Nearby sights around Ban Sapan and verified guest photos"}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-[#64748B]">
                    {otherPhotos.length} {lang === "th" ? "ภาพ" : "photos"}
                  </span>
                </div>

                {/* Clean 3-Column Desktop Grid & Alternating Editorial Mobile Grid */}
                {renderDesktopGrid(otherPhotos)}
                {renderMobileEditorialGrid(otherPhotos)}
              </section>
            </div>
          )}
        </div>

        {/* Modal Footer Bar */}
        <footer className="hidden md:flex px-5 sm:px-7 py-2.5 bg-white border-t border-[#E6E0D6] items-center justify-between text-xs text-[#6E675F] shrink-0">
          <span>
            {propertyConfig.nameTh} · {propertyConfig.locationTh}
          </span>
          <span className="font-medium text-[#2C2A29]">
            {allPhotos.length} {lang === "th" ? "ภาพถ่ายและวิดีโอทั้งหมด" : "Total photos and videos"}
          </span>
        </footer>
      </div>
    </div>
  );
}
