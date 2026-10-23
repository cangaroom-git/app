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
  Calendar,
  Play,
  Pause,
  Video,
  Volume2,
  VolumeX,
  Thermometer,
  Clock,
  Users,
} from "lucide-react";
import {
  RoomLodge,
  BookingRecord,
  ExtraAddon,
  ResortExperienceItem,
  WhiteLabelPropertyConfig,
} from "@/data/rooms";
import {
  addDaysToDate,
  formatDateStr,
  getRoomInventoryForRange,
} from "@/lib/store";
import { LiveWeatherData } from "@/components/ResortWeatherWidget";

const MONTH_NAMES_TH = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];
const MONTH_NAMES_EN = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const WEEKDAYS_TH = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
const WEEKDAYS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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
  bookings?: BookingRecord[];
  today?: Date;
  checkIn?: string;
  setCheckIn?: (d: string) => void;
  checkOut?: string;
  setCheckOut?: (d: string) => void;
  nights?: number;
  weather?: LiveWeatherData | null;
  skipEntryAnimation?: boolean;
}

export function RoomGalleryModal({
  isOpen,
  onClose,
  selectedRoom,
  allRooms,
  propertyConfig,
  lang,
  onBookRoom,
  bookings = [],
  today,
  checkIn = "",
  setCheckIn,
  checkOut = "",
  setCheckOut,
  nights = 1,
  weather = null,
  skipEntryAnimation = false,
}: RoomGalleryModalProps) {
  const [activeCategory, setActiveCategory] = useState<string>("calendar");
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [activeRoomFilter, setActiveRoomFilter] = useState<string>("ALL");
  const [calendarRoomId, setCalendarRoomId] = useState<string>(
    () => selectedRoom?.id || allRooms[0]?.id || ""
  );
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => {
    const now = today || new Date();
    const minMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const base = checkIn ? new Date(checkIn + "T00:00:00") : now;
    const valid = isNaN(base.getTime()) ? now : base;
    const candidate = new Date(valid.getFullYear(), valid.getMonth(), 1);
    return candidate < minMonth ? minMonth : candidate;
  });


  const modalBodyRef = useRef<HTMLDivElement>(null);
  const tabNavRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const calendarScrollRef = useRef<HTMLDivElement>(null);
  const isDraggingCalendarRef = useRef<boolean>(false);
  const dragStartXRef = useRef<number>(0);
  const dragScrollLeftRef = useRef<number>(0);
  const hasDraggedCalendarRef = useRef<boolean>(false);
  const isProgrammaticScrollRef = useRef<boolean>(false);
  const wasOpenRef = useRef<boolean>(false);

  const categoryTabs = useMemo(
    () => [
      {
        id: "calendar",
        labelTh: "ปฏิทินห้องว่าง",
        labelEn: "Availability Calendar",
      },
      { id: "all", labelTh: "ทั้งหมด", labelEn: "All Photos" },
      { id: "video", labelTh: "วิดีโอ", labelEn: "Video" },
      { id: "property", labelTh: "บรรยากาศที่พัก", labelEn: "Property Views" },
      { id: "rooms", labelTh: "ห้องพัก", labelEn: "Rooms" },
      { id: "facilities", labelTh: "สิ่งอำนวยความสะดวก", labelEn: "Facilities" },
      { id: "dining", labelTh: "อาหาร & เครื่องดื่ม", labelEn: "Dining" },
      {
        id: "other",
        labelTh: "รีวิว & รอบที่พัก",
        labelEn: "Attractions & Guest Photos",
      },
    ],
    []
  );

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      wasOpenRef.current = true;
      setActiveCategory("calendar");
      setActivePhotoIndex(null);
      setIsPlayingVideo(false);
      const now = today || new Date();
      const minMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const base = checkIn ? new Date(checkIn + "T00:00:00") : now;
      if (!isNaN(base.getTime())) {
        const candidateMonth = new Date(base.getFullYear(), base.getMonth(), 1);
        setCalendarMonth(
          candidateMonth.getTime() < minMonth.getTime()
            ? minMonth
            : candidateMonth
        );
      }
      if (selectedRoom) {
        setActiveRoomFilter(selectedRoom.code);
        setCalendarRoomId(selectedRoom.id);
      } else {
        setActiveRoomFilter("ALL");
        if (allRooms[0]) {
          setCalendarRoomId(allRooms[0].id);
        }
      }
    } else if (!isOpen && wasOpenRef.current) {
      wasOpenRef.current = false;
    }
  }, [isOpen, selectedRoom, allRooms, checkIn, today]);

  // =========================================================================
  // CATEGORIZED PHOTO DATA BUILDER
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
      categoryLabelTh: "บรรยากาศรอบที่พัก",
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
          categoryLabelTh: `ห้องพัก · ${rm.code}`,
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
      categoryLabelTh: "สิ่งอำนวยความสะดวก",
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
      categoryLabelTh: "อาหารและเครื่องดื่ม",
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
    ];

    return list.map((item, idx) => ({
      id: `other-${idx}`,
      url: item.url,
      captionTh: item.captionTh,
      captionEn: item.captionEn,
      category: item.cat,
      categoryLabelTh: "อื่นๆ และภาพจากลูกค้า",
      categoryLabelEn: "Other",
      sourceType:
        item.cat === "guest" ? ("guest" as const) : ("property" as const),
    }));
  }, []);

  const allPhotos: GalleryPhoto[] = useMemo(() => {
    return [
      ...propertyPhotos,
      ...roomPhotos,
      ...facilitiesPhotos,
      ...diningPhotos,
      ...otherPhotos,
    ];
  }, [propertyPhotos, roomPhotos, facilitiesPhotos, diningPhotos, otherPhotos]);

  const displayedRoomPhotos = useMemo(() => {
    if (activeRoomFilter === "ALL") return roomPhotos;
    return roomPhotos.filter((p) => p.roomCode === activeRoomFilter);
  }, [roomPhotos, activeRoomFilter]);

  const savedScrollTopRef = useRef<number>(0);
  const thumbnailStripRef = useRef<HTMLDivElement | null>(null);

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

  const closeLightbox = useCallback(() => {
    setActivePhotoIndex(null);
    const targetScroll = savedScrollTopRef.current;
    setTimeout(() => {
      if (modalBodyRef.current) {
        modalBodyRef.current.scrollTop = targetScroll;
      }
    }, 40);
  }, []);

  const handleScroll = useCallback(() => {
    if (isProgrammaticScrollRef.current) return;
    const container = modalBodyRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;

    if (scrollTop + clientHeight >= scrollHeight - 35) {
      setActiveCategory("other");
      return;
    }

    if (scrollTop < 70) {
      setActiveCategory("calendar");
      return;
    }

    const sectionIds = [
      "calendar",
      "video",
      "property",
      "rooms",
      "facilities",
      "dining",
      "other",
    ];

    const containerRect = container.getBoundingClientRect();
    let detectedSection = "calendar";

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

  const handleTabClick = (tabId: string) => {
    setActiveCategory(tabId);
    isProgrammaticScrollRef.current = true;

    const container = modalBodyRef.current;
    if (container) {
      if (tabId === "calendar" || tabId === "all") {
        if (tabId === "calendar") {
          container.scrollTo({ top: 0, behavior: "smooth" });
        } else {
          const targetEl = document.getElementById("gallery-section-video");
          if (targetEl) {
            const offset = targetEl.offsetTop - container.offsetTop;
            container.scrollTo({
              top: Math.max(0, offset - 10),
              behavior: "smooth",
            });
          } else {
            container.scrollTo({ top: 0, behavior: "smooth" });
          }
        }
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
    }
  };

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
        if (e.key === "ArrowRight") {
          setActivePhotoIndex((prev) =>
            prev !== null ? (prev + 1) % allPhotos.length : 0
          );
        } else if (e.key === "ArrowLeft") {
          setActivePhotoIndex((prev) =>
            prev !== null
              ? (prev - 1 + allPhotos.length) % allPhotos.length
              : 0
          );
        }
      }
    },
    [isOpen, activePhotoIndex, allPhotos.length, closeLightbox, onClose]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // =========================================================================
  // RENDER HELPERS: Clean Social-Theme Photo Cards (Click to view full photo)
  // =========================================================================
  const renderPhotoGrid = (photos: GalleryPhoto[]) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1 sm:gap-2.5">
      {photos.map((photo) => (
        <article
          key={photo.id}
          onClick={() => openLightboxForPhoto(photo)}
          className="relative aspect-[16/10] w-full rounded-none sm:rounded-[16px] overflow-hidden bg-black border-y sm:border border-x-0 border-[var(--color-border)] cursor-pointer"
        >
          <img
            src={photo.url}
            alt={lang === "th" ? photo.captionTh : photo.captionEn}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover object-center"
          />
        </article>
      ))}
    </div>
  );

  if (!isOpen) return null;

  const activeBookingRoom =
    allRooms.find((r) => r.id === calendarRoomId) ||
    selectedRoom ||
    allRooms[0] ||
    null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center overflow-hidden"
    >
      {/* Backdrop Overlay (No heavy backdrop-blur during slide-up for 60/120fps smoothness) */}
      <div
        className={`fixed inset-0 bg-black/60 ${
          skipEntryAnimation ? "" : "animate-fade-in-backdrop"
        }`}
        onClick={onClose}
      />

      {/* Main Container: Bottom-aligned sheet/modal (smooth GPU slide-up) */}
      <div
        className={`relative w-full h-[95dvh] max-h-[95dvh] lg:h-[95vh] lg:max-h-[95vh] lg:w-[90vw] lg:max-w-4xl xl:max-w-[960px] bg-[var(--color-background-card)] text-[var(--color-text-primary)] rounded-t-[24px] rounded-b-none shadow-2xl flex flex-col overflow-hidden z-10 border-t border-x border-[var(--color-border)] border-b-0 ${
          skipEntryAnimation ? "" : "animate-slide-up-modal"
        }`}
      >
        {/* ===================================================================
            TOP HEADER & CATEGORY PILL TABS (Unified Theme)
        ==================================================================== */}
        <header className="bg-[var(--color-background-card)] border-b border-[var(--color-border)] shrink-0 z-20">
          {/* Row 1: Unified Step Header (Title Left, Date Pill & Close Right) */}
          <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-[var(--color-border)]">
            <div className="flex-1 min-w-0">
              <h1 className="ty-subtitle truncate">
                {lang === "th"
                  ? `เลือกวันเข้าพัก (${activeBookingRoom?.code || "ทุกห้อง"})`
                  : `Select Stay Dates (${activeBookingRoom?.code || "All"})`}
              </h1>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              {/* Right-aligned Check-in -> Check-out Summary Pill */}
              <button
                type="button"
                onClick={() => handleTabClick("calendar")}
                className="hidden sm:inline-flex items-center gap-2.5 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-overlay-hover)] border border-[var(--color-border)] px-3.5 py-1.5 transition cursor-pointer"
              >
                <Calendar className="w-4 h-4 text-[var(--color-text-secondary)] shrink-0" />
                <div className="flex items-center gap-2 text-left">
                  <span className="text-[11px] text-[var(--color-text-secondary)] hidden md:inline">
                    {lang === "th" ? "เช็คอิน" : "Check-in"}
                  </span>
                  <span className="ty-body font-bold text-[var(--color-text-primary)] whitespace-nowrap">
                    {checkIn || "-"}
                  </span>
                  <span className="text-[var(--color-text-secondary)] font-semibold">
                    →
                  </span>
                  <span className="text-[11px] text-[var(--color-text-secondary)] hidden md:inline">
                    {lang === "th" ? "เช็คเอาท์" : "Check-out"}
                  </span>
                  <span className="ty-body font-bold text-[var(--color-text-primary)] whitespace-nowrap">
                    {checkOut || "-"}
                  </span>
                </div>
                <span className="rounded-full bg-[var(--color-background-card)] border border-[var(--color-border)] px-2.5 py-0.5 text-[12px] font-bold text-[var(--color-text-primary)] shrink-0">
                  {Math.max(1, nights)} {lang === "th" ? "คืน" : "nights"}
                </span>
              </button>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close Modal"
                className="h-9 w-9 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-overlay-hover)] text-[var(--color-text-primary)] flex items-center justify-center transition cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Row 2: Category Filter Pills */}
          <nav
            ref={tabNavRef}
            aria-label="Photo Categories"
            className="flex items-center gap-2 overflow-x-auto px-4 sm:px-6 py-2.5 bg-[var(--color-background-card)] no-scrollbar"
          >
            {categoryTabs.map((tab) => {
              const isActive = activeCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  data-tab-id={tab.id}
                  type="button"
                  onClick={() => handleTabClick(tab.id)}
                  className={`shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition cursor-pointer whitespace-nowrap ${
                    isActive
                      ? "bg-[var(--color-accent)] text-[var(--color-on-accent)]"
                      : "bg-[var(--color-background-muted)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                  }`}
                >
                  {lang === "th" ? tab.labelTh : tab.labelEn}
                </button>
              );
            })}
          </nav>
        </header>

        {/* ===================================================================
            MODAL BODY: Full-Size Lightbox OR Continuous Photo Stream
        ==================================================================== */}
        {activePhotoIndex !== null && allPhotos[activePhotoIndex] ? (
          <div className="flex-1 bg-[var(--color-background-card)] flex flex-col overflow-hidden">
            {/* Lightbox Top Bar */}
            <div className="px-4 sm:px-6 py-2.5 border-b border-[var(--color-border)] flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={closeLightbox}
                className="inline-flex items-center gap-2 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-overlay-hover)] px-3.5 py-1.5 ty-body font-semibold text-[var(--color-text-primary)] transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>{lang === "th" ? "กลับไปหน้ารวมรูปภาพ" : "Back to photos"}</span>
              </button>

              <span className="ty-body font-semibold text-[var(--color-text-secondary)] tabular-nums">
                {activePhotoIndex + 1} / {allPhotos.length}
              </span>
            </div>

            {/* Main Full-Size Photo Stage */}
            <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden select-none">
              <img
                src={allPhotos[activePhotoIndex].url}
                alt={
                  lang === "th"
                    ? allPhotos[activePhotoIndex].captionTh
                    : allPhotos[activePhotoIndex].captionEn
                }
                className="max-h-full max-w-full object-contain"
              />

              {allPhotos.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setActivePhotoIndex(
                        (prev) =>
                          ((prev ?? 0) - 1 + allPhotos.length) % allPhotos.length
                      )
                    }
                    aria-label="Previous photo"
                    className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-black/65 hover:bg-black/85 text-white flex items-center justify-center transition cursor-pointer"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setActivePhotoIndex(
                        (prev) => ((prev ?? 0) + 1) % allPhotos.length
                      )
                    }
                    aria-label="Next photo"
                    className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-black/65 hover:bg-black/85 text-white flex items-center justify-center transition cursor-pointer"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>

            {/* Caption + Thumbnail Strip */}
            <div className="bg-[var(--color-background-card)] border-t border-[var(--color-border)] px-4 sm:px-6 py-3 space-y-2.5 shrink-0">
              <div className="flex items-center justify-between gap-2">
                <p className="ty-body font-semibold text-[var(--color-text-primary)] truncate">
                  {lang === "th"
                    ? allPhotos[activePhotoIndex].captionTh
                    : allPhotos[activePhotoIndex].captionEn}
                </p>
                <span className="ty-caption shrink-0">
                  {lang === "th"
                    ? allPhotos[activePhotoIndex].categoryLabelTh
                    : allPhotos[activePhotoIndex].categoryLabelEn}
                </span>
              </div>

              <div
                ref={thumbnailStripRef}
                className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5"
              >
                {allPhotos.map((thumb, idx) => {
                  const isCurrent = idx === activePhotoIndex;
                  return (
                    <button
                      key={thumb.id}
                      data-thumb-index={idx}
                      type="button"
                      onClick={() => setActivePhotoIndex(idx)}
                      className={`relative h-12 w-18 rounded-[8px] overflow-hidden shrink-0 border-2 transition cursor-pointer ${
                        isCurrent
                          ? "border-[var(--color-accent)] opacity-100"
                          : "border-transparent opacity-55 hover:opacity-90"
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
          ref={modalBodyRef}
          onScroll={handleScroll}
          className={`flex-1 bg-[var(--color-background-body)] py-4 px-0 sm:p-6 overflow-y-auto overscroll-contain ${
            skipEntryAnimation ? "animate-modal-step-in-left" : ""
          }`}
        >
          <div className="space-y-8 pb-6">
              {/* SECTION 0: MINIMAL APPLE CALENDAR-STYLE ROOM AVAILABILITY GRID
                  - Minimal 1px hairline grid (no cards, no multi-color fills)
                  - Single unified horizontal scroll container (slides the entire panel together)
                  - Sticky left room column + horizontal day columns for up to 1 full month
                  - Month selector (cannot go back to past months)
              */}
              {(() => {
                const calendarRoom =
                  allRooms.find((r) => r.id === calendarRoomId) ||
                  selectedRoom ||
                  allRooms[0] ||
                  null;
                const todayDate = today || new Date();
                const todayStr = formatDateStr(todayDate);
                const minMonthDate = new Date(
                  todayDate.getFullYear(),
                  todayDate.getMonth(),
                  1
                );

                const year = calendarMonth.getFullYear();
                const month = calendarMonth.getMonth();
                const daysInMonth = new Date(year, month + 1, 0).getDate();
                const isCurrentMonth =
                  year === todayDate.getFullYear() &&
                  month === todayDate.getMonth();
                const canGoPrevMonth =
                  year > minMonthDate.getFullYear() ||
                  (year === minMonthDate.getFullYear() &&
                    month > minMonthDate.getMonth());

                // Build list of selectable upcoming months (current month + next 11 months, no past months)
                const upcomingMonths = Array.from({ length: 12 }, (_, idx) => {
                  const mDate = new Date(
                    minMonthDate.getFullYear(),
                    minMonthDate.getMonth() + idx,
                    1
                  );
                  const mYear = mDate.getFullYear();
                  const mMonth = mDate.getMonth();
                  const value = `${mYear}-${String(mMonth + 1).padStart(
                    2,
                    "0"
                  )}`;
                  const label =
                    lang === "th"
                      ? `${MONTH_NAMES_TH[mMonth]} ${mYear + 543}`
                      : `${MONTH_NAMES_EN[mMonth]} ${mYear}`;
                  return { value, label, year: mYear, month: mMonth };
                });
                const currentMonthValue = `${year}-${String(month + 1).padStart(
                  2,
                  "0"
                )}`;

                const activeSelectedDateStr = checkIn || todayStr;
                const activeSelectedEndStr =
                  checkOut && checkOut > activeSelectedDateStr
                    ? checkOut
                    : formatDateStr(
                        addDaysToDate(
                          new Date(activeSelectedDateStr + "T00:00:00"),
                          1
                        )
                      );
                const monthLabel =
                  lang === "th"
                    ? `${MONTH_NAMES_TH[month]} ${year + 543}`
                    : `${MONTH_NAMES_EN[month]} ${year}`;
                const weekdaysShortEn = [
                  "Sun",
                  "Mon",
                  "Tue",
                  "Wed",
                  "Thu",
                  "Fri",
                  "Sat",
                ];

                // Build all days within the selected month (from today for current month; 1..daysInMonth for future months)
                const startDayNum = isCurrentMonth ? todayDate.getDate() : 1;
                const monthDays = Array.from(
                  { length: Math.max(1, daysInMonth - startDayNum + 1) },
                  (_, i) => {
                    const dayNum = startDayNum + i;
                    const d = new Date(year, month, dayNum);
                    const dStr = formatDateStr(d);
                    const nextDStr = formatDateStr(addDaysToDate(d, 1));
                    const forecast = weather?.daily?.find(
                      (w) => w.dateStr === dStr
                    );
                    const tempAvg =
                      forecast?.tempAvg ??
                      weather?.currentTemp ??
                      21 - (dayNum % 3);
                    const isWeekend = d.getDay() === 0 || d.getDay() === 6;

                    return {
                      date: d,
                      dateStr: dStr,
                      nextDateStr: nextDStr,
                      dayNum,
                      isToday: dStr === todayStr,
                      isWeekend,
                      dowLabel:
                        lang === "th"
                          ? WEEKDAYS_TH[d.getDay()]
                          : weekdaysShortEn[d.getDay()],
                      tempAvg,
                    };
                  }
                );

                const slideCalendarHorizontally = (dir: "left" | "right") => {
                  const delta = dir === "left" ? -420 : 420;
                  calendarScrollRef.current?.scrollBy({
                    left: delta,
                    behavior: "smooth",
                  });
                };

                const handleCalendarMouseDown = (
                  e: React.MouseEvent<HTMLDivElement>
                ) => {
                  if (!calendarScrollRef.current) return;
                  isDraggingCalendarRef.current = true;
                  hasDraggedCalendarRef.current = false;
                  dragStartXRef.current =
                    e.pageX - calendarScrollRef.current.offsetLeft;
                  dragScrollLeftRef.current =
                    calendarScrollRef.current.scrollLeft;
                };

                const handleCalendarMouseMove = (
                  e: React.MouseEvent<HTMLDivElement>
                ) => {
                  if (
                    !isDraggingCalendarRef.current ||
                    !calendarScrollRef.current
                  )
                    return;
                  const x = e.pageX - calendarScrollRef.current.offsetLeft;
                  const walk = x - dragStartXRef.current;
                  if (Math.abs(walk) > 5) {
                    hasDraggedCalendarRef.current = true;
                  }
                  calendarScrollRef.current.scrollLeft =
                    dragScrollLeftRef.current - walk;
                };

                const handleCalendarMouseUpOrLeave = () => {
                  isDraggingCalendarRef.current = false;
                };

                const selectRoomAndDate = (
                  targetRoom: RoomLodge,
                  targetDate: Date
                ) => {
                  if (hasDraggedCalendarRef.current) {
                    hasDraggedCalendarRef.current = false;
                    return;
                  }
                  const dStr = formatDateStr(targetDate);
                  if (dStr < todayStr) return;

                  const clickedNextStr = formatDateStr(
                    addDaysToDate(targetDate, 1)
                  );
                  const clickedInv = getRoomInventoryForRange(
                    targetRoom,
                    dStr,
                    clickedNextStr,
                    bookings
                  );
                  const isClickedDayFree =
                    clickedInv.state === "AVAILABLE" &&
                    clickedInv.availableUnits > 0;

                  // Cannot select a date where the room is already full
                  if (!isClickedDayFree) return;

                  const isSameRoom = calendarRoom?.id === targetRoom.id;
                  setCalendarRoomId(targetRoom.id);
                  setActiveRoomFilter(targetRoom.code);

                  if (!setCheckIn || !setCheckOut) return;

                  if (!isSameRoom) {
                    setCheckIn(dStr);
                    setCheckOut(clickedNextStr);
                    return;
                  }

                  const curStart = activeSelectedDateStr;
                  const curEnd = activeSelectedEndStr;
                  const curNights = Math.max(
                    1,
                    Math.round(
                      (new Date(curEnd + "T00:00:00").getTime() -
                        new Date(curStart + "T00:00:00").getTime()) /
                        (1000 * 60 * 60 * 24)
                    )
                  );

                  // Multi-night range selection on the same room:
                  // - If 1 night is selected and user clicks another date (before or after), try to span between them
                  // - If >1 nights are selected and user clicks a later date (dStr >= curEnd), try to extend the stay
                  if (
                    (curNights === 1 && dStr !== curStart) ||
                    (curNights > 1 && dStr >= curEnd)
                  ) {
                    const rangeStart = dStr < curStart ? dStr : curStart;
                    const rangeEnd = dStr < curStart ? curEnd : clickedNextStr;
                    const rangeInv = getRoomInventoryForRange(
                      targetRoom,
                      rangeStart,
                      rangeEnd,
                      bookings
                    );
                    if (
                      rangeInv.state === "AVAILABLE" &&
                      rangeInv.availableUnits > 0
                    ) {
                      setCheckIn(rangeStart);
                      setCheckOut(rangeEnd);
                      return;
                    }
                  }

                  // Otherwise (clicked inside existing range or blocked by a full/booked date in between): start fresh 1-night selection at clicked date
                  setCheckIn(dStr);
                  setCheckOut(clickedNextStr);
                };

                return (
                  <section
                    id="gallery-section-calendar"
                    className="scroll-mt-4 px-0"
                  >
                    <div className="relative rounded-none sm:rounded-[16px] overflow-hidden border-y sm:border border-x-0 border-[var(--color-border)] bg-[var(--color-background-card)]">
                      {/* BUILT-IN SELECTED ROOM PHOTO HEADER AT TOP OF CALENDAR */}
                      {calendarRoom && (() => {
                        const heroImg = calendarRoom.images?.[0] || {
                          url: propertyConfig.heroImageUrl || "",
                          captionTh: "",
                          captionEn: "",
                        };
                        return (
                          <div className="border-b border-[var(--color-border)] bg-[var(--color-background-card)]">
                            <div
                              onClick={() =>
                                openLightboxForPhoto({
                                  id: `cal-head-${calendarRoom.id}-0`,
                                  url: heroImg.url,
                                  captionTh:
                                    heroImg.captionTh || calendarRoom.nameTh,
                                  captionEn:
                                    heroImg.captionEn || calendarRoom.nameEn,
                                  category: "rooms",
                                  categoryLabelTh: `ห้องพัก (${calendarRoom.code})`,
                                  categoryLabelEn: `Room (${calendarRoom.code})`,
                                  sourceType: "property",
                                })
                              }
                              className="relative w-full aspect-[16/9] sm:h-64 lg:h-72 overflow-hidden bg-black cursor-pointer"
                            >
                              <img
                                src={heroImg.url}
                                alt={
                                  lang === "th"
                                    ? calendarRoom.nameTh
                                    : calendarRoom.nameEn
                                }
                                className="h-full w-full object-cover"
                              />
                            </div>
                          </div>
                        );
                      })()}

                      {/* APPLE CALENDAR-STYLE MINIMAL TOP TOOLBAR */}
                      <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-[var(--color-border)] bg-[var(--color-background-card)]">
                        {/* Left: Static Month Title + Prev/Next Month */}
                        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 min-w-0">
                          <h2 className="text-[18px] sm:text-[20px] font-bold tracking-tight text-[var(--color-text-primary)] shrink-0">
                            {monthLabel}
                          </h2>

                          {/* Month Prev / Next */}
                          <div className="inline-flex items-center rounded-lg border border-[var(--color-border)] bg-[var(--color-background-card)] overflow-hidden shrink-0">
                            <button
                              type="button"
                              disabled={!canGoPrevMonth}
                              onClick={() => {
                                if (!canGoPrevMonth) return;
                                setCalendarMonth(new Date(year, month - 1, 1));
                                if (calendarScrollRef.current) {
                                  calendarScrollRef.current.scrollLeft = 0;
                                }
                              }}
                              title={
                                lang === "th"
                                  ? "เดือนก่อนหน้า"
                                  : "Previous month"
                              }
                              className={`h-7 w-7 flex items-center justify-center transition ${
                                canGoPrevMonth
                                  ? "hover:bg-[var(--color-background-muted)] text-[var(--color-text-primary)] cursor-pointer"
                                  : "opacity-30 text-[var(--color-text-disabled)] cursor-not-allowed"
                              }`}
                            >
                              <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                            <div className="w-px h-4 bg-[var(--color-border)]" />
                            <button
                              type="button"
                              onClick={() => {
                                setCalendarMonth(new Date(year, month + 1, 1));
                                if (calendarScrollRef.current) {
                                  calendarScrollRef.current.scrollLeft = 0;
                                }
                              }}
                              title={lang === "th" ? "เดือนถัดไป" : "Next month"}
                              className="h-7 w-7 hover:bg-[var(--color-background-muted)] text-[var(--color-text-primary)] flex items-center justify-center transition cursor-pointer"
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Right: Apple Calendar Segmented Slide Controls (< | Today | >) */}
                        <div className="flex items-center gap-2.5">
                          <div className="inline-flex items-center rounded-lg border border-[var(--color-border)] bg-[var(--color-background-card)] overflow-hidden">
                            <button
                              type="button"
                              onClick={() => slideCalendarHorizontally("left")}
                              aria-label="เลื่อนตารางไปทางซ้าย"
                              className="h-8 px-2.5 hover:bg-[var(--color-background-muted)] text-[var(--color-text-primary)] flex items-center justify-center transition cursor-pointer"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                            <div className="w-px h-4 bg-[var(--color-border)]" />
                            <button
                              type="button"
                              onClick={() => {
                                setCalendarMonth(minMonthDate);
                                if (calendarRoom) {
                                  selectRoomAndDate(
                                    calendarRoom,
                                    todayDate
                                  );
                                }
                                calendarScrollRef.current?.scrollTo({
                                  left: 0,
                                  behavior: "smooth",
                                });
                              }}
                              className="h-8 px-3 hover:bg-[var(--color-background-muted)] text-[12px] font-semibold text-[var(--color-text-primary)] transition cursor-pointer"
                            >
                              {lang === "th" ? "วันนี้" : "Today"}
                            </button>
                            <div className="w-px h-4 bg-[var(--color-border)]" />
                            <button
                              type="button"
                              onClick={() => slideCalendarHorizontally("right")}
                              aria-label="เลื่อนตารางไปทางขวา"
                              className="h-8 px-2.5 hover:bg-[var(--color-background-muted)] text-[var(--color-text-primary)] flex items-center justify-center transition cursor-pointer"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* 2-PANE CALENDAR LAYOUT: Static Left Rooms Column + Horizontally Scrollable Days Pane (Zero Jitter) */}
                      <div className="flex w-full overflow-hidden">
                        {/* STATIC LEFT ROOM COLUMN (Only Room Code + Guest Capacity, no full name or price) */}
                        <div className="w-[92px] sm:w-[112px] shrink-0 border-r border-[var(--color-border)] bg-[var(--color-background-card)] z-10 flex flex-col">
                          {/* Left Column Header */}
                          <div className="h-[68px] border-b border-[var(--color-border)] px-3 py-2 flex flex-col justify-center bg-[var(--color-background-muted)]/40">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                              {lang === "th" ? "ห้องพัก" : "ROOMS"}
                            </span>
                            <span className="text-[12px] font-bold text-[var(--color-text-primary)]">
                              {allRooms.length}{" "}
                              {lang === "th" ? "ห้อง" : "Rooms"}
                            </span>
                          </div>

                          {/* Left Column Room Rows: Only Code + Guests */}
                          {allRooms.map((rm, rIdx) => {
                            const isFocusedRoom = calendarRoom?.id === rm.id;
                            const isLastRow = rIdx === allRooms.length - 1;

                            return (
                              <button
                                key={rm.id}
                                type="button"
                                onClick={() => {
                                  setCalendarRoomId(rm.id);
                                  setActiveRoomFilter(rm.code);
                                }}
                                className={`h-[68px] sm:h-[72px] px-3 text-left flex flex-col justify-center transition cursor-pointer ${
                                  !isLastRow
                                    ? "border-b border-[var(--color-border)]"
                                    : ""
                                } ${
                                  isFocusedRoom
                                    ? "bg-[var(--color-background-muted)]"
                                    : "bg-[var(--color-background-card)] hover:bg-[var(--color-overlay-hover)]"
                                }`}
                              >
                                <span className="inline-flex w-fit items-center justify-center rounded bg-[var(--color-accent)] text-[var(--color-on-accent)] px-1.5 py-0.5 text-[11px] font-bold">
                                  {rm.code}
                                </span>
                                <span className="mt-1 text-[11px] text-[var(--color-text-secondary)]">
                                  {rm.baseGuests}–{rm.maxGuests}{" "}
                                  {lang === "th" ? "ท่าน" : "guests"}
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        {/* HORIZONTALLY SCROLLABLE DAYS PANE */}
                        <div
                          ref={calendarScrollRef}
                          onMouseDown={handleCalendarMouseDown}
                          onMouseMove={handleCalendarMouseMove}
                          onMouseUp={handleCalendarMouseUpOrLeave}
                          onMouseLeave={handleCalendarMouseUpOrLeave}
                          className="flex-1 min-w-0 overflow-x-auto select-none cursor-grab active:cursor-grabbing no-scrollbar"
                        >
                          <div className="min-w-max">
                            {/* Days Header Row */}
                            <div className="flex h-[68px] border-b border-[var(--color-border)] bg-[var(--color-background-muted)]/40">
                              {monthDays.map((md) => {
                                const isCurrentSelected =
                                  md.dateStr >= activeSelectedDateStr &&
                                  md.dateStr < activeSelectedEndStr;

                                return (
                                  <button
                                    key={md.dateStr}
                                    type="button"
                                    onClick={() => {
                                      if (calendarRoom) {
                                        selectRoomAndDate(
                                          calendarRoom,
                                          md.date
                                        );
                                      }
                                    }}
                                    className={`w-[88px] sm:w-[98px] shrink-0 border-r border-[var(--color-border)] py-2 px-2 flex flex-col items-center justify-center transition cursor-pointer ${
                                      isCurrentSelected
                                        ? "bg-[var(--color-background-muted)]"
                                        : "bg-[var(--color-background-card)] hover:bg-[var(--color-overlay-hover)]"
                                    }`}
                                  >
                                    <span
                                      className={`text-[11px] font-medium ${
                                        md.isWeekend
                                          ? "text-[var(--color-text-primary)] font-semibold"
                                          : "text-[var(--color-text-secondary)]"
                                      }`}
                                    >
                                      {md.dowLabel}
                                    </span>
                                    <span
                                      className={`mt-1 h-7 w-7 rounded-full inline-flex items-center justify-center text-[14px] font-bold transition ${
                                        isCurrentSelected || md.isToday
                                          ? "bg-[var(--color-accent)] text-[var(--color-on-accent)]"
                                          : "text-[var(--color-text-primary)]"
                                      }`}
                                    >
                                      {md.dayNum}
                                    </span>
                                    <span className="mt-0.5 text-[10px] text-[var(--color-text-secondary)]">
                                      {md.tempAvg}°C
                                    </span>
                                  </button>
                                );
                              })}
                            </div>

                            {/* Room Rows on the Days Grid */}
                            {allRooms.map((rm, rIdx) => {
                              const isFocusedRoom = calendarRoom?.id === rm.id;
                              const isLastRow = rIdx === allRooms.length - 1;

                              return (
                                <div
                                  key={rm.id}
                                  className={`flex h-[68px] sm:h-[72px] ${
                                    !isLastRow
                                      ? "border-b border-[var(--color-border)]"
                                      : ""
                                  }`}
                                >
                                  {monthDays.map((md) => {
                                    const inv = getRoomInventoryForRange(
                                      rm,
                                      md.dateStr,
                                      md.nextDateStr,
                                      bookings
                                    );
                                    const dayFree =
                                      inv.state === "AVAILABLE" &&
                                      inv.availableUnits > 0;
                                    const isCellSelected =
                                      isFocusedRoom &&
                                      md.dateStr >= activeSelectedDateStr &&
                                      md.dateStr < activeSelectedEndStr;

                                    return (
                                      <button
                                        key={`${rm.id}-${md.dateStr}`}
                                        type="button"
                                        disabled={!dayFree}
                                        onClick={() =>
                                          selectRoomAndDate(rm, md.date)
                                        }
                                        className={`w-[88px] sm:w-[98px] shrink-0 border-r border-[var(--color-border)] p-2 flex items-center justify-center text-center transition ${
                                          !dayFree
                                            ? "bg-[var(--color-background-card)] cursor-not-allowed"
                                            : isCellSelected
                                            ? "bg-[var(--color-background-muted)] ring-1 ring-inset ring-[var(--color-accent)] cursor-pointer"
                                            : "bg-[var(--color-background-card)] hover:bg-[var(--color-overlay-hover)] cursor-pointer"
                                        }`}
                                      >
                                        {/* Available: Price centered. Booked: Red bullet centered. */}
                                        {dayFree ? (
                                          <span
                                            className={`text-[11px] sm:text-[12px] tabular-nums leading-none ${
                                              isCellSelected
                                                ? "font-bold text-[var(--color-text-primary)]"
                                                : "font-normal text-[var(--color-text-secondary)]"
                                            }`}
                                          >
                                            ฿{rm.basePriceThb.toLocaleString()}
                                          </span>
                                        ) : (
                                          <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>
                );
              })()}

              {/* SECTION 1: VIDEO TOUR */}
              <section
                id="gallery-section-video"
                className="scroll-mt-4 space-y-3 [content-visibility:auto] [contain-intrinsic-size:auto_420px]"
              >
                <div className="flex items-center justify-between px-4 sm:px-0">
                  <div>
                    <h2 className="ty-title flex items-center gap-2">
                      <Video className="w-5 h-5" />
                      <span>
                        {lang === "th"
                          ? "วิดีโอแนะนำบรรยากาศที่พัก"
                          : "Resort Video Tour"}
                      </span>
                    </h2>
                    <p className="ty-caption mt-0.5">
                      {lang === "th"
                        ? "มุมมองทางอากาศ 4K ทะเลหมอกและหุบเขาสะปัน"
                        : "4K aerial footage over Sapan Valley"}
                    </p>
                  </div>
                </div>

                <div className="w-full rounded-none sm:rounded-[20px] overflow-hidden bg-[var(--color-background-card)] border-y sm:border border-x-0 border-[var(--color-border)]">
                  <div className="group relative w-full aspect-[16/9] sm:aspect-auto sm:h-[380px] lg:h-[440px] bg-black overflow-hidden">
                    <video
                      ref={videoRef}
                      loop
                      muted={isMuted}
                      playsInline
                      preload="metadata"
                      poster={
                        propertyConfig.heroImageUrl ||
                        "https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&w=1200&q=85"
                      }
                      className="w-full h-full object-cover"
                      src="https://assets.mixkit.co/videos/preview/mixkit-drone-flying-over-mountains-in-a-misty-morning-42657-large.mp4"
                    />

                    {!isPlayingVideo && (
                      <div
                        onClick={toggleVideoPlayback}
                        className="absolute inset-0 flex items-center justify-center bg-black/25 hover:bg-black/35 transition cursor-pointer z-10"
                      >
                        <div className="h-14 w-14 rounded-full bg-white text-[#171717] flex items-center justify-center shadow-lg transition">
                          <Play className="w-6 h-6 fill-current ml-0.5" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Clean Video Controls Bar Below Video (No gradient overlay) */}
                  <div className="p-3.5 px-4 sm:px-5 flex items-center justify-between gap-3">
                    <div>
                      <p className="ty-body font-semibold">
                        {lang === "th"
                          ? "บินลัดเลาะทะเลหมอกและหุบเขาสะปัน (4K Aerial)"
                          : "Sapan Valley Morning Sea of Mist Drone Tour"}
                      </p>
                      <p className="ty-caption">
                        {lang === "th"
                          ? "มุมมองภาพรวมรีสอร์ตและขุนเขาดงพญา"
                          : "Bird's eye view over resort grounds"}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setIsMuted(!isMuted)}
                        className="h-9 w-9 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-overlay-hover)] text-[var(--color-text-primary)] flex items-center justify-center transition cursor-pointer"
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
                        className="h-9 w-9 rounded-full bg-[var(--color-accent)] text-[var(--color-on-accent)] flex items-center justify-center transition cursor-pointer"
                      >
                        {isPlayingVideo ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4 fill-current" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              {/* SECTION 2: PROPERTY VIEWS */}
              <section
                id="gallery-section-property"
                className="scroll-mt-4 space-y-3 [content-visibility:auto] [contain-intrinsic-size:auto_420px]"
              >
                <div className="flex items-center justify-between px-4 sm:px-0">
                  <div>
                    <h2 className="ty-title">
                      {lang === "th"
                        ? "บรรยากาศและวิวรอบที่พัก"
                        : "Property views"}
                    </h2>
                    <p className="ty-caption">
                      {lang === "th"
                        ? "บ้านไม้ A-Frame ลำธารธรรมชาติ และวิวทะเลหมอกยามเช้า"
                        : "Iconic timber villas, natural stream, and sea of mist"}
                    </p>
                  </div>
                  <span className="ty-caption font-semibold">
                    {propertyPhotos.length} {lang === "th" ? "ภาพ" : "photos"}
                  </span>
                </div>

                {renderPhotoGrid(propertyPhotos)}
              </section>

              {/* SECTION 3: ROOMS */}
              <section
                id="gallery-section-rooms"
                className="scroll-mt-4 space-y-3 [content-visibility:auto] [contain-intrinsic-size:auto_420px]"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 sm:px-0">
                  <div>
                    <h2 className="ty-title">
                      {lang === "th" ? "ห้องพักทั้งหมด" : "Rooms"}
                    </h2>
                    <p className="ty-caption">
                      {lang === "th"
                        ? "ภาพถ่ายจริงของห้องพักและพูลวิลล่าแต่ละหลัง"
                        : "Verified photos of all guest villas and suites"}
                    </p>
                  </div>

                  {/* Room Quick Filter Chips */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
                    <button
                      type="button"
                      onClick={() => setActiveRoomFilter("ALL")}
                      className={`px-3 py-1.5 text-[12px] font-semibold rounded-full transition cursor-pointer shrink-0 ${
                        activeRoomFilter === "ALL"
                          ? "bg-[var(--color-accent)] text-[var(--color-on-accent)]"
                          : "bg-[var(--color-background-muted)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                      }`}
                    >
                      {lang === "th" ? "ทุกห้อง" : "All Rooms"}
                    </button>
                    {allRooms.map((rm) => (
                      <button
                        key={rm.id}
                        type="button"
                        onClick={() => setActiveRoomFilter(rm.code)}
                        className={`px-3 py-1.5 text-[12px] font-semibold rounded-full transition cursor-pointer shrink-0 ${
                          activeRoomFilter === rm.code
                            ? "bg-[var(--color-accent)] text-[var(--color-on-accent)]"
                            : "bg-[var(--color-background-muted)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                        }`}
                      >
                        {rm.code}
                      </button>
                    ))}
                  </div>
                </div>

                {renderPhotoGrid(displayedRoomPhotos)}
              </section>

              {/* SECTION 4: FACILITIES */}
              <section
                id="gallery-section-facilities"
                className="scroll-mt-4 space-y-3 [content-visibility:auto] [contain-intrinsic-size:auto_420px]"
              >
                <div className="flex items-center justify-between px-4 sm:px-0">
                  <div>
                    <h2 className="ty-title">
                      {lang === "th"
                        ? "สิ่งอำนวยความสะดวก & สปา"
                        : "Facilities"}
                    </h2>
                    <p className="ty-caption">
                      {lang === "th"
                        ? "อ่างแช่น้ำกลางแจ้ง สปาส่วนตัว และชุดเครื่องนอนระดับพรีเมียม"
                        : "Outdoor soaking tubs, spa pavilions, and luxury bedding"}
                    </p>
                  </div>
                  <span className="ty-caption font-semibold">
                    {facilitiesPhotos.length}{" "}
                    {lang === "th" ? "ภาพ" : "photos"}
                  </span>
                </div>

                {renderPhotoGrid(facilitiesPhotos)}
              </section>

              {/* SECTION 5: DINING */}
              <section
                id="gallery-section-dining"
                className="scroll-mt-4 space-y-3 [content-visibility:auto] [contain-intrinsic-size:auto_420px]"
              >
                <div className="flex items-center justify-between px-4 sm:px-0">
                  <div>
                    <h2 className="ty-title">
                      {lang === "th" ? "อาหารและเครื่องดื่ม" : "Dining"}
                    </h2>
                    <p className="ty-caption">
                      {lang === "th"
                        ? "ชุดหมูกระทะเสิร์ฟถึงระเบียง กาแฟดริปน่าน และชุดอาหารเช้า"
                        : "Private terrace Thai BBQ, drip coffee, and local breakfast"}
                    </p>
                  </div>
                  <span className="ty-caption font-semibold">
                    {diningPhotos.length} {lang === "th" ? "ภาพ" : "photos"}
                  </span>
                </div>

                {renderPhotoGrid(diningPhotos)}
              </section>

              {/* SECTION 6: OTHER */}
              <section
                id="gallery-section-other"
                className="scroll-mt-4 space-y-3 [content-visibility:auto] [contain-intrinsic-size:auto_420px]"
              >
                <div className="flex items-center justify-between px-4 sm:px-0">
                  <div>
                    <h2 className="ty-title">
                      {lang === "th"
                        ? "แหล่งท่องเที่ยวสะปัน & ภาพจากผู้เข้าพัก"
                        : "Attractions & Guest Photos"}
                    </h2>
                    <p className="ty-caption">
                      {lang === "th"
                        ? "น้ำตกสะปัน นาข้าวขั้นบันได บ่อเกลือโบราณ และภาพจริงจากลูกค้า"
                        : "Nearby sights around Ban Sapan and verified guest photos"}
                    </p>
                  </div>
                  <span className="ty-caption font-semibold">
                    {otherPhotos.length} {lang === "th" ? "ภาพ" : "photos"}
                  </span>
                </div>

                {renderPhotoGrid(otherPhotos)}
              </section>
            </div>
        </div>
        )}

        {/* STICKY BOTTOM BOOKING BAR (Unified across all 3 modal steps) */}
        {activeBookingRoom && onBookRoom && (() => {
          const stayNights = Math.max(1, nights);
          const originalTotal = activeBookingRoom.basePriceThb * stayNights;
          const discountedNightly = Math.round(
            activeBookingRoom.basePriceThb *
              (1 - (activeBookingRoom.discountPercent || 0) / 100)
          );
          const netTotal = discountedNightly * stayNights;
          const footerInv =
            checkIn && checkOut
              ? getRoomInventoryForRange(
                  activeBookingRoom,
                  checkIn,
                  checkOut,
                  bookings
                )
              : null;
          const isFooterRoomAvailable = footerInv
            ? footerInv.state === "AVAILABLE" && footerInv.availableUnits > 0
            : true;

          return (
            <footer className="shrink-0 border-t border-[var(--color-border)] bg-[var(--color-background-card)] px-4 sm:px-6 py-3 z-20 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                {activeBookingRoom.images?.[0]?.url && (
                  <img
                    src={activeBookingRoom.images[0].url}
                    alt={activeBookingRoom.code}
                    className="h-11 w-16 rounded-[10px] object-cover border border-[var(--color-border)] shrink-0 hidden sm:block"
                  />
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center justify-center rounded bg-[var(--color-accent)] text-[var(--color-on-accent)] px-1.5 py-0.5 text-[11px] font-bold shrink-0">
                      {activeBookingRoom.code}
                    </span>
                    <span className="ty-caption truncate">
                      ({stayNights} {lang === "th" ? "คืน · 1 หลัง" : "nights · 1 villa"})
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="ty-title leading-none">
                      ฿{netTotal.toLocaleString()}
                    </span>
                    {activeBookingRoom.discountPercent > 0 && (
                      <span className="ty-caption line-through">
                        ฿{originalTotal.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                disabled={!isFooterRoomAvailable}
                onClick={() => {
                  if (!isFooterRoomAvailable) return;
                  onBookRoom(activeBookingRoom);
                }}
                className={`btn-round-solid !px-5 !py-2.5 shrink-0 ${
                  !isFooterRoomAvailable
                    ? "opacity-40 !cursor-not-allowed pointer-events-none"
                    : ""
                }`}
              >
                <span>
                  {!isFooterRoomAvailable
                    ? lang === "th"
                      ? "เต็มแล้ว"
                      : "Fully Booked"
                    : lang === "th"
                    ? "รายละเอียดและจองห้องพัก →"
                    : "Room Details & Book →"}
                </span>
              </button>
            </footer>
          );
        })()}
      </div>
    </div>
  );
}
