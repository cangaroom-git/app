"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  ArrowLeft,
  Bath,
  BedDouble,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  DoorOpen,
  Edit3,
  FileText,
  Images,
  Landmark,
  MapPin,
  Maximize2,
  PawPrint,
  Plus,
  Save,
  Sparkles,
  Star,
  Store,
  TicketPercent,
  Trash2,
  Upload,
  Users,
  Utensils,
  X,
} from "lucide-react";
import {
  STAY_STYLE_TABS,
  THAILAND_77_PROVINCES,
} from "@/data/thailandProvinces";
import { getFacilityIconMeta } from "@/lib/facilityIcons";
import {
  MAX_PHOTOS_PER_ROOM,
  MAX_ROOM_AMENITIES,
  MAX_UPLOAD_BATCH_FILES,
  normalizeRoomPhotos,
  serializeRoomPhotos,
  SYSTEM_ROOM_CATEGORIES,
  type RoomPhotoMeta,
} from "@/lib/roomPhotoSpaces";
import { runStudioTransition } from "@/lib/studioTransition";
import { parseSeasonalRulesJson } from "@/lib/seasonalPricing";
import { uploadMediaFile, uploadMediaFileWithMeta } from "@/lib/slipScanner";
import {
  StandardCheckbox,
  StandardFieldGroup,
  StandardInput,
  StandardSelectField,
  StandardStepperRow,
  StandardTextarea,
} from "@/components/ui/standards";
import { SortableList } from "@/components/ui/SortableList";
import {
  RoomPhotoStudio,
  type RoomPhotoStudioHeaderState,
} from "@/components/studio/RoomPhotoStudio";
import { StudioGrowthTab } from "@/components/studio/StudioGrowthTab";
import { StudioSeasonalPricingSection } from "@/components/studio/StudioSeasonalPricingSection";
import { StudioSheetModal } from "@/components/studio/StudioSheetModal";
import { WorkspaceSplitLayout } from "@/components/workspace/WorkspaceSplitLayout";
import { getPlaceCategoryMeta } from "@/lib/placeCategories";
import type {
  HotelAddonDto,
  MerchantModeDto,
  PlaceOpeningHoursDayDto,
  PropertyTypeDto,
} from "@/types/cangaroom";
import type {
  StudioFaqItem,
  StudioHotelHighlight,
  StudioNearbySpot,
  StudioPayload,
  StudioRoomRecord,
} from "@/components/studio/studioTypes";

const HostLocationPicker = dynamic(
  () =>
    import("@/components/studio/HostLocationPicker").then(
      (mod) => mod.HostLocationPicker
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-[260px] rounded-[16px] bg-[var(--color-background-muted)] animate-pulse" />
    ),
  }
);

export type ListingSectionId =
  | "rooms"
  | "seasonal"
  | "promotions"
  | "addons"
  | "about"
  | "location"
  | "policies"
  | "content"
  | "payout";

const VALID_LISTING_SECTIONS = new Set<ListingSectionId>([
  "rooms",
  "seasonal",
  "promotions",
  "addons",
  "about",
  "location",
  "policies",
  "content",
  "payout",
]);

export function resolveListingSection(raw?: string | null): ListingSectionId {
  if (!raw) return "rooms";
  const norm = raw.trim().toLowerCase() as ListingSectionId;
  return VALID_LISTING_SECTIONS.has(norm) ? norm : "rooms";
}

const STYLE_OPTIONS = STAY_STYLE_TABS.filter((tab) => tab.id !== "all");

const PROPERTY_TYPE_OPTIONS: Array<{
  value: PropertyTypeDto;
  label: string;
  desc: string;
}> = [
  {
    value: "BOUTIQUE_HOTEL",
    label: "โรงแรมขนาดเล็ก / บูทีค",
    desc: "หลายห้องพักหรือหลายชั้น",
  },
  {
    value: "RESORT",
    label: "รีสอร์ท / บังกะโล",
    desc: "บ้านเป็นหลังหรือหลายโซนวิว",
  },
  {
    value: "POOL_VILLA",
    label: "พูลวิลล่า (สระส่วนตัว)",
    desc: "บ้านหลังเดียวหรือหลายหลัง",
  },
  {
    value: "GLAMPING_HOMESTAY",
    label: "แกลมปิ้ง / เคบิน / โฮมสเตย์",
    desc: "เต็นท์โดม บ้านไม้ หรือใกล้ธรรมชาติ",
  },
];

const CURATED_AMENITIES = [
  "Wi-Fi ความเร็วสูง",
  "เครื่องปรับอากาศ",
  "สระว่ายน้ำส่วนตัว",
  "อ่างอาบน้ำ / จากุซซี่",
  "อาหารเช้ารวมในราคา",
  "ระเบียงชมวิวส่วนตัว",
  "สมาร์ททีวี / Netflix",
  "ที่จอดรถส่วนตัว",
  "ตู้เย็น & มินิบาร์",
  "เครื่องทำน้ำอุ่น",
  "ไดร์เป่าผม",
  "กาน้ำร้อน & กาแฟดริป",
  "เตาปิ้งย่าง / โซนหมูกระทะ",
  "ห้องครัว & อุปกรณ์ทำอาหาร",
  "โต๊ะทำงาน",
  "ระบบรักษาความปลอดภัย 24 ชม.",
];

const FAQ_TEMPLATES: StudioFaqItem[] = [
  {
    qTh: "ราคานี้รวมอาหารเช้าแล้วหรือไม่?",
    aTh: "ราคารวมอาหารเช้าสำหรับผู้เข้าพักตามจำนวนมาตรฐานของห้องแล้ว เสิร์ฟเวลา 07:30 – 10:00 น.",
  },
  {
    qTh: "มีที่จอดรถฟรีให้บริการหรือไม่?",
    aTh: "มีพื้นที่จอดรถส่วนตัวภายในที่พักฟรี ไม่มีค่าใช้จ่ายเพิ่มเติม",
  },
  {
    qTh: "สามารถเลื่อนวันเข้าพักได้หรือไม่?",
    aTh: "สามารถแจ้งเลื่อนวันเข้าพักได้ฟรี 1 ครั้ง เมื่อแจ้งล่วงหน้าอย่างน้อย 7 วันก่อนวันเช็กอิน (ขึ้นอยู่กับห้องว่าง)",
  },
  {
    qTh: "สามารถเช็กอินก่อนเวลาหรือเช็กเอาต์ช้าได้ไหม?",
    aTh: "สามารถแจ้งล่วงหน้าผ่าน LINE ของที่พักได้ หากห้องพร้อมทางเรายินดีอำนวยความสะดวกให้ครับ",
  },
  {
    qTh: "เด็กเล็กเข้าพักฟรีถึงอายุเท่าไหร่?",
    aTh: "เด็กอายุไม่เกิน 6 ปี เข้าพักร่วมกับผู้ปกครองได้ฟรี (ไม่เสริมเตียง) หากต้องการเตียงเสริมสามารถเลือกเพิ่มในขั้นตอนจองได้ครับ",
  },
];

function parseArray<T>(val: unknown): T[] {
  return Array.isArray(val) ? (val as T[]) : [];
}

export function StudioPropertyTab({
  data,
  initialSection = "rooms",
  startOnMobileList = false,
  buildHref = (p) => p,
  onReload,
  onNotify,
}: {
  data: StudioPayload;
  initialSection?: ListingSectionId;
  startOnMobileList?: boolean;
  buildHref?: (path: string) => string;
  onReload: () => Promise<void>;
  onNotify: (msg: string) => void;
}) {
  const { hotel, rooms, addons, coupons, discountRules = [], posts } = data;
  const [section, setSection] = useState<ListingSectionId>(initialSection);
  const [mobileView, setMobileView] = useState<"list" | "detail">(
    startOnMobileList ? "list" : "detail",
  );
  const [orderedRoomIds, setOrderedRoomIds] = useState<string[] | null>(null);

  useEffect(() => {
    setOrderedRoomIds(null);
  }, [rooms]);

  const displayedRooms = React.useMemo(() => {
    if (!orderedRoomIds) return rooms;
    const byId = new Map(rooms.map((r) => [r.id, r]));
    const ordered: StudioRoomRecord[] = [];
    for (const id of orderedRoomIds) {
      const found = byId.get(id);
      if (found) ordered.push(found);
    }
    for (const r of rooms) {
      if (!orderedRoomIds.includes(r.id)) ordered.push(r);
    }
    return ordered;
  }, [rooms, orderedRoomIds]);

  const handleReorderRooms = async (nextRooms: StudioRoomRecord[]) => {
    const nextIds = nextRooms.map((r) => r.id);
    setOrderedRoomIds(nextIds);
    try {
      const res = await fetch("/api/studio/rooms", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reorder",
          hotelSlug: hotel.slug,
          orderedIds: nextIds,
        }),
      });
      if (!res.ok) {
        setOrderedRoomIds(null);
        onNotify("บันทึกลำดับห้องพักไม่สำเร็จ");
        return;
      }
      onNotify("จัดลำดับห้องพักเรียบร้อย (อัปเดตหน้าร้านแล้ว)");
      await onReload();
    } catch {
      setOrderedRoomIds(null);
      onNotify("ไม่สามารถเชื่อมต่อเพื่อบันทึกลำดับห้องพักได้");
    }
  };

  useEffect(() => {
    setSection(initialSection);
  }, [initialSection]);

  useEffect(() => {
    if (startOnMobileList) {
      setMobileView("list");
    }
  }, [startOnMobileList]);

  // Listen for mobile bottom-bar "ห้องพัก" tap so it always returns to the root list menu first
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onResetToList = () => {
      setMobileView("list");
    };
    window.addEventListener("cgr:studio-listings-reset", onResetToList);
    return () => {
      window.removeEventListener("cgr:studio-listings-reset", onResetToList);
    };
  }, []);

  // Sync section & mobile drill-down state cleanly with browser back/forward navigation
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onPopState = () => {
      const pathMatch = window.location.pathname.match(
        /\/studio\/listings\/([a-z0-9-]+)/i
      );
      if (!pathMatch) {
        setMobileView("list");
        return;
      }
      const nextSec = resolveListingSection(pathMatch[1]);
      runStudioTransition("back", () => {
        setSection(nextSec);
        setMobileView("detail");
      });
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const handleSelectSection = (nextSection: ListingSectionId) => {
    setMobileView("detail");
    if (nextSection === section) return;
    runStudioTransition("swap", () => {
      setSection(nextSection);
    });
    if (typeof window !== "undefined") {
      window.history.pushState(
        null,
        "",
        buildHref(`/studio/listings/${nextSection}`)
      );
    }
  };

  // =========================================================================
  // 1. ROOM EDITOR MODAL STATE (Create + Full Edit + Embedded Photo Studio Page)
  // =========================================================================
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [roomModalPage, setRoomModalPage] = useState<"details" | "photos">(
    "details"
  );
  const [roomModalDir, setRoomModalDir] = useState<"forward" | "back">(
    "forward"
  );
  const [photoHeader, setPhotoHeader] =
    useState<RoomPhotoStudioHeaderState | null>(null);
  const roomModalBodyRef = useRef<HTMLDivElement | null>(null);
  const photoStepBackRef = useRef<(() => boolean) | null>(null);

  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [rmCode, setRmCode] = useState("");
  const [rmNameTh, setRmNameTh] = useState("");
  const [rmNameEn, setRmNameEn] = useState("");
  const [rmCategoryTh, setRmCategoryTh] = useState("ห้องพัก");
  const [rmDescTh, setRmDescTh] = useState("");
  const [rmTotalUnits, setRmTotalUnits] = useState(1);
  const [rmWeekdayPrice, setRmWeekdayPrice] = useState(2500);
  const [rmWeekendPrice, setRmWeekendPrice] = useState(2900);
  const [rmStandardGuests, setRmStandardGuests] = useState(2);
  const [rmMaxGuests, setRmMaxGuests] = useState(2);
  const [rmExtraGuestPrice, setRmExtraGuestPrice] = useState(500);
  const [rmSizeSqm, setRmSizeSqm] = useState(36);
  const [rmBedrooms, setRmBedrooms] = useState(1);
  const [rmBeds, setRmBeds] = useState(1);
  const [rmBathrooms, setRmBathrooms] = useState(1);
  const [rmPetsAllowed, setRmPetsAllowed] = useState(false);
  const [rmIsActive, setRmIsActive] = useState(true);
  const [rmAmenities, setRmAmenities] = useState<string[]>([]);
  const [rmCustomAmenity, setRmCustomAmenity] = useState("");
  const [rmPhotos, setRmPhotos] = useState<RoomPhotoMeta[]>([]);
  const [isUploadingRoomPhoto, setIsUploadingRoomPhoto] = useState(false);
  const [rmUploadProgress, setRmUploadProgress] = useState<{
    done: number;
    total: number;
    passed: number;
    skipped: number;
  } | null>(null);
  const [isDraggingModalPhotos, setIsDraggingModalPhotos] = useState(false);
  const cancelRoomUploadRef = useRef(false);
  const [isSavingRoom, setIsSavingRoom] = useState(false);
  const [togglingRoomId, setTogglingRoomId] = useState<string | null>(null);
  const [optimisticRoomActive, setOptimisticRoomActive] = useState<
    Record<string, boolean>
  >({});
  const [showRoomDetails, setShowRoomDetails] = useState(false);

  const normalizeRoomCategoryValue = (raw?: string | null): string => {
    const clean = (raw || "").trim();
    if (!clean) return "ห้องพัก";
    if (SYSTEM_ROOM_CATEGORIES.some((c) => c.value === clean)) return clean;
    const lower = clean.toLowerCase();
    if (lower.includes("pool")) return "พูลวิลล่า";
    if (lower.includes("villa") || lower.includes("bungalow")) return "วิลล่า";
    if (lower.includes("suite")) return "ห้องสวีท";
    if (lower.includes("glamp") || lower.includes("tent") || lower.includes("dome"))
      return "แกลมปิ้ง";
    if (lower.includes("cabin") || lower.includes("a-frame")) return "เคบิน";
    if (lower.includes("family")) return "ห้องครอบครัว";
    if (lower.includes("home")) return "โฮมสเตย์";
    return "ห้องพัก";
  };

  const generateNextRoomCode = (): string => {
    const used = new Set(rooms.map((r) => r.code.toUpperCase()));
    let n = rooms.length + 1;
    while (used.has(`R${n}`)) n += 1;
    return `R${n}`;
  };

  const handleToggleRoomActive = async (rm: StudioRoomRecord) => {
    const currentActive = optimisticRoomActive[rm.id] ?? rm.isActive;
    const nextActive = !currentActive;
    setOptimisticRoomActive((prev) => ({ ...prev, [rm.id]: nextActive }));
    setTogglingRoomId(rm.id);
    try {
      const res = await fetch("/api/studio/rooms", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotelSlug: hotel.slug,
          id: rm.id,
          isActive: nextActive,
        }),
      });
      if (!res.ok) {
        setOptimisticRoomActive((prev) => ({ ...prev, [rm.id]: currentActive }));
        onNotify("เปลี่ยนสถานะห้องพักไม่สำเร็จ");
        return;
      }
      onNotify(
        nextActive
          ? `เปิดขายห้อง "${rm.nameTh}" บนหน้าร้านแล้ว`
          : `พักขายห้อง "${rm.nameTh}" ชั่วคราวแล้ว`
      );
      await onReload();
    } catch {
      setOptimisticRoomActive((prev) => ({ ...prev, [rm.id]: currentActive }));
      onNotify("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setTogglingRoomId(null);
    }
  };

  const handleAddCustomAmenity = () => {
    const clean = rmCustomAmenity.trim();
    if (!clean) return;
    const exists = rmAmenities.some(
      (x) => x.trim().toLowerCase() === clean.toLowerCase()
    );
    if (exists) {
      setRmCustomAmenity("");
      onNotify(`มี "${clean}" อยู่ในรายการแล้ว`);
      return;
    }
    if (rmAmenities.length >= MAX_ROOM_AMENITIES) {
      onNotify(
        `เพิ่มสิ่งอำนวยความสะดวกได้สูงสุด ${MAX_ROOM_AMENITIES} รายการต่อห้อง`
      );
      return;
    }
    setRmAmenities((prev) => [...prev, clean]);
    setRmCustomAmenity("");
  };

  const openModalPhotoPage = () => {
    setRoomModalDir("forward");
    setRoomModalPage("photos");
    roomModalBodyRef.current?.scrollTo({ top: 0 });
  };

  const handleRoomModalBack = () => {
    if (roomModalPage === "photos") {
      const handledInside = photoStepBackRef.current?.() ?? false;
      if (handledInside) {
        roomModalBodyRef.current?.scrollTo({ top: 0 });
        return;
      }
      setRoomModalDir("back");
      setRoomModalPage("details");
      roomModalBodyRef.current?.scrollTo({ top: 0 });
    }
  };

  const openCreateRoomModal = () => {
    setEditingRoomId(null);
    setRoomModalPage("details");
    setRoomModalDir("forward");
    setPhotoHeader(null);
    setRmCode(generateNextRoomCode());
    setRmNameTh("");
    setRmNameEn("");
    setRmCategoryTh(
      hotel.propertyType === "POOL_VILLA"
        ? "พูลวิลล่า"
        : hotel.propertyType === "GLAMPING_HOMESTAY"
        ? "แกลมปิ้ง"
        : hotel.propertyType === "RESORT"
        ? "วิลล่า"
        : "ห้องพัก"
    );
    setRmDescTh("");
    setRmTotalUnits(1);
    setRmWeekdayPrice(2500);
    setRmWeekendPrice(2900);
    setRmStandardGuests(2);
    setRmMaxGuests(2);
    setRmExtraGuestPrice(500);
    setRmSizeSqm(36);
    setRmBedrooms(1);
    setRmBeds(1);
    setRmBathrooms(1);
    setRmPetsAllowed(hotel.petsAllowed);
    setRmIsActive(true);
    setRmAmenities(["Wi-Fi ความเร็วสูง", "เครื่องปรับอากาศ", "เครื่องทำน้ำอุ่น"]);
    setRmCustomAmenity("");
    setRmPhotos([]);
    setIsRoomModalOpen(true);
  };

  const openEditRoomModal = (rm: StudioRoomRecord) => {
    setEditingRoomId(rm.id);
    setRoomModalPage("details");
    setRoomModalDir("forward");
    setPhotoHeader(null);
    setRmCode(rm.code);
    setRmNameTh(rm.nameTh);
    setRmNameEn(rm.nameEn);
    setRmCategoryTh(normalizeRoomCategoryValue(rm.categoryTh));
    setRmDescTh(rm.shortDescTh);
    setRmTotalUnits(rm.totalUnits);
    setRmWeekdayPrice(rm.weekdayPriceThb);
    setRmWeekendPrice(rm.weekendPriceThb);
    setRmStandardGuests(rm.standardGuests);
    setRmMaxGuests(rm.maxGuests);
    setRmExtraGuestPrice(rm.extraGuestPriceThb);
    setRmSizeSqm(rm.sizeSqm);
    setRmBedrooms(rm.bedrooms);
    setRmBeds(rm.beds);
    setRmBathrooms(rm.bathrooms);
    setRmPetsAllowed(rm.petsAllowed);
    setRmIsActive(optimisticRoomActive[rm.id] ?? rm.isActive);
    setRmAmenities(rm.amenities);
    setRmCustomAmenity("");
    setRmPhotos(normalizeRoomPhotos(rm.galleryUrls, rm.galleryMetaJson));
    setIsRoomModalOpen(true);
  };

  const processRoomPhotoFiles = async (rawFiles: File[]) => {
    if (rawFiles.length === 0) return;

    const remainingSlots = Math.max(0, MAX_PHOTOS_PER_ROOM - rmPhotos.length);
    if (remainingSlots <= 0) {
      onNotify(`ห้องนี้มีรูปครบสูงสุด ${MAX_PHOTOS_PER_ROOM} รูปแล้ว กรุณาลบรูปเก่าก่อนเพิ่มใหม่`);
      return;
    }

    const allowedCount = Math.min(remainingSlots, MAX_UPLOAD_BATCH_FILES);
    const filesToProcess = rawFiles.slice(0, allowedCount);
    const trimmedCount = rawFiles.length - filesToProcess.length;

    if (trimmedCount > 0) {
      onNotify(
        `จำกัดสูงสุดครั้งละ ${MAX_UPLOAD_BATCH_FILES} รูป และไม่เกิน ${MAX_PHOTOS_PER_ROOM} รูป/ห้อง — กำลังนำเข้า ${filesToProcess.length} รูปแรก`
      );
    }

    cancelRoomUploadRef.current = false;
    setIsUploadingRoomPhoto(true);
    setRmUploadProgress({
      done: 0,
      total: filesToProcess.length,
      passed: 0,
      skipped: 0,
    });

    try {
      let passed = 0;
      let skipped = 0;
      let aiCount = 0;
      let lastBlockedReason: string | null = null;

      for (let i = 0; i < filesToProcess.length; i++) {
        if (cancelRoomUploadRef.current) break;
        const file = filesToProcess[i];
        try {
          const result = await uploadMediaFileWithMeta(file, "rooms");
          if (
            result.ai?.checked &&
            (result.ai.suggestedSpace || result.ai.suggestedCaptionTh)
          ) {
            aiCount += 1;
          }
          const nextPhoto: RoomPhotoMeta = {
            url: result.url,
            space: result.ai?.suggestedSpace ?? "additional",
            ...(result.ai?.suggestedCaptionTh
              ? { captionTh: result.ai.suggestedCaptionTh }
              : {}),
          };
          passed += 1;
          // Append live as each photo finishes so owner sees immediate visual progress
          setRmPhotos((prev) =>
            prev.length < MAX_PHOTOS_PER_ROOM ? [...prev, nextPhoto] : prev
          );
        } catch (err) {
          skipped += 1;
          lastBlockedReason =
            err instanceof Error ? err.message : "อัปโหลดรูปไม่สำเร็จ";
        }
        setRmUploadProgress({
          done: i + 1,
          total: filesToProcess.length,
          passed,
          skipped,
        });
      }

      if (passed > 0) {
        onNotify(
          `อัปโหลดสำเร็จ ${passed} รูป${
            aiCount > 0 ? " · AI จัดหมวด & ร่าง SEO ให้แล้ว" : ""
          }${skipped > 0 ? ` (ข้าม ${skipped} รูป)` : ""}`
        );
      } else if (lastBlockedReason) {
        onNotify(lastBlockedReason);
      }
    } finally {
      setIsUploadingRoomPhoto(false);
      setRmUploadProgress(null);
      cancelRoomUploadRef.current = false;
    }
  };

  const handleRoomPhotosUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    await processRoomPhotoFiles(files);
  };

  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rmNameTh.trim()) {
      onNotify("กรุณากรอกชื่อห้องพัก");
      return;
    }
    const finalCode = (rmCode.trim() || generateNextRoomCode()).toUpperCase();
    setIsSavingRoom(true);
    try {
      const serializedPhotos = serializeRoomPhotos(rmPhotos);
      const res = await fetch("/api/studio/rooms", {
        method: editingRoomId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotelSlug: hotel.slug,
          ...(editingRoomId ? { id: editingRoomId, isActive: rmIsActive } : {}),
          code: finalCode,
          nameTh: rmNameTh.trim(),
          nameEn: rmNameEn.trim() || rmNameTh.trim(),
          categoryTh: rmCategoryTh.trim() || "ห้องพัก",
          shortDescTh: rmDescTh.trim(),
          totalUnits: Math.max(1, Number(rmTotalUnits) || 1),
          weekdayPriceThb: Math.max(100, Number(rmWeekdayPrice) || 100),
          weekendPriceThb: Math.max(100, Number(rmWeekendPrice) || 100),
          standardGuests: Math.max(1, Number(rmStandardGuests) || 2),
          maxGuests: Math.max(
            Math.max(1, Number(rmStandardGuests) || 2),
            Number(rmMaxGuests) || 2
          ),
          extraGuestPriceThb: Math.max(0, Number(rmExtraGuestPrice) || 0),
          sizeSqm: Math.max(5, Number(rmSizeSqm) || 32),
          bedrooms: Math.max(0, Number(rmBedrooms) || 0),
          beds: Math.max(1, Number(rmBeds) || 1),
          bathrooms: Math.max(1, Number(rmBathrooms) || 1),
          petsAllowed: rmPetsAllowed,
          amenities: rmAmenities,
          galleryUrls: serializedPhotos.galleryUrls,
          galleryMetaJson: serializedPhotos.galleryMetaJson,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        onNotify(json.error || "บันทึกห้องพักไม่สำเร็จ");
        return;
      }
      setIsRoomModalOpen(false);
      onNotify(
        editingRoomId ? "อัปเดตข้อมูลห้องพักแล้ว" : "เพิ่มประเภทห้องพักใหม่แล้ว"
      );
      await onReload();
    } finally {
      setIsSavingRoom(false);
    }
  };

  const handleDeleteRoom = async (id: string) => {
    const res = await fetch(
      `/api/studio/rooms?id=${encodeURIComponent(id)}&hotel=${encodeURIComponent(
        hotel.slug
      )}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      setIsRoomModalOpen(false);
      onNotify("ลบประเภทห้องพักแล้ว");
      await onReload();
    }
  };

  // =========================================================================
  // 2. ADD-ON MODAL STATE (Create + Edit + Photo + Active Toggle)
  // =========================================================================
  const [isAddonModalOpen, setIsAddonModalOpen] = useState(false);
  const [editingAddonId, setEditingAddonId] = useState<string | null>(null);
  const [adNameTh, setAdNameTh] = useState("");
  const [adDescTh, setAdDescTh] = useState("");
  const [adPriceThb, setAdPriceThb] = useState(590);
  const [adUnitLabelTh, setAdUnitLabelTh] = useState("ชุด");
  const [adImageUrl, setAdImageUrl] = useState("");
  const [adIsActive, setAdIsActive] = useState(true);
  const [isUploadingAddon, setIsUploadingAddon] = useState(false);
  const [isSavingAddon, setIsSavingAddon] = useState(false);

  const openCreateAddonModal = () => {
    setEditingAddonId(null);
    setAdNameTh("");
    setAdDescTh("");
    setAdPriceThb(590);
    setAdUnitLabelTh("ชุด");
    setAdImageUrl("");
    setAdIsActive(true);
    setIsAddonModalOpen(true);
  };

  const openEditAddonModal = (addon: HotelAddonDto) => {
    setEditingAddonId(addon.id);
    setAdNameTh(addon.nameTh);
    setAdDescTh(addon.descriptionTh || "");
    setAdPriceThb(addon.priceThb);
    setAdUnitLabelTh(addon.unitLabelTh || "ชุด");
    setAdImageUrl(addon.imageUrl || "");
    setAdIsActive(addon.isActive);
    setIsAddonModalOpen(true);
  };

  const handleSaveAddon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adNameTh.trim()) return;
    setIsSavingAddon(true);
    try {
      const res = await fetch("/api/studio/addons", {
        method: editingAddonId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotelSlug: hotel.slug,
          ...(editingAddonId ? { id: editingAddonId, isActive: adIsActive } : {}),
          nameTh: adNameTh.trim(),
          descriptionTh: adDescTh.trim(),
          priceThb: Math.max(0, Number(adPriceThb) || 0),
          unitLabelTh: adUnitLabelTh.trim() || "ชุด",
          imageUrl: adImageUrl.trim() || null,
        }),
      });
      if (!res.ok) {
        onNotify("บันทึกบริการเสริมไม่สำเร็จ");
        return;
      }
      setIsAddonModalOpen(false);
      onNotify(
        editingAddonId ? "อัปเดตบริการเสริมแล้ว" : "เพิ่มบริการเสริมใหม่แล้ว"
      );
      await onReload();
    } finally {
      setIsSavingAddon(false);
    }
  };

  const handleDeleteAddon = async (id: string) => {
    await fetch(
      `/api/studio/addons?id=${encodeURIComponent(id)}&hotel=${encodeURIComponent(
        hotel.slug
      )}`,
      { method: "DELETE" }
    );
    setIsAddonModalOpen(false);
    onNotify("ลบบริการเสริมแล้ว");
    await onReload();
  };

  // =========================================================================
  // 3–6. HOTEL PROFILE, HIGHLIGHTS, LOCATION, NEARBY, FAQS & PAYOUT STATE
  // =========================================================================
  const [propertyType, setPropertyType] = useState<PropertyTypeDto>(
    hotel.propertyType || "BOUTIQUE_HOTEL"
  );
  const [nameTh, setNameTh] = useState(hotel.nameTh);
  const [nameEn, setNameEn] = useState(hotel.nameEn);
  const [taglineTh, setTaglineTh] = useState(hotel.taglineTh);
  const [taglineEn, setTaglineEn] = useState(hotel.taglineEn || "");
  const [descriptionTh, setDescriptionTh] = useState(hotel.descriptionTh);
  const [descriptionEn, setDescriptionEn] = useState(hotel.descriptionEn || "");
  const [logoUrl, setLogoUrl] = useState(hotel.logoUrl || "");
  const [coverImageUrl, setCoverImageUrl] = useState(hotel.coverImageUrl || "");
  const [stayStyles, setStayStyles] = useState<string[]>(hotel.stayStyles);
  const [highlights, setHighlights] = useState<StudioHotelHighlight[]>(() =>
    parseArray<StudioHotelHighlight>(hotel.highlightsJson)
  );

  const [provinceId, setProvinceId] = useState(hotel.provinceId);
  const [districtTh, setDistrictTh] = useState(hotel.districtTh);
  const [addressTh, setAddressTh] = useState(hotel.addressTh);
  const [latitude, setLatitude] = useState<number | null>(hotel.latitude);
  const [longitude, setLongitude] = useState<number | null>(hotel.longitude);
  const [googleMapsUrl, setGoogleMapsUrl] = useState(hotel.googleMapsUrl || "");
  const [nearbySpots, setNearbySpots] = useState<StudioNearbySpot[]>(() =>
    parseArray<StudioNearbySpot>(hotel.nearbySpotsJson)
  );

  const [checkInTime, setCheckInTime] = useState(hotel.checkInTime);
  const [checkOutTime, setCheckOutTime] = useState(hotel.checkOutTime);
  const [petsAllowed, setPetsAllowed] = useState(hotel.petsAllowed);
  const [petPolicyTh, setPetPolicyTh] = useState(hotel.petPolicyTh);
  const [faqs, setFaqs] = useState<StudioFaqItem[]>(() =>
    parseArray<StudioFaqItem>(hotel.faqJson)
  );

  const [promptPayId, setPromptPayId] = useState(hotel.promptPayId);
  const [promptPayAccountName, setPromptPayAccountName] = useState(
    hotel.promptPayAccountName
  );
  const [bankName, setBankName] = useState(hotel.bankName || "");
  const [bankAccountNo, setBankAccountNo] = useState(hotel.bankAccountNo || "");
  const [contactPhone, setContactPhone] = useState(hotel.contactPhone);
  const [contactLine, setContactLine] = useState(hotel.contactLine);
  const [facebookPageUrl, setFacebookPageUrl] = useState(hotel.facebookPageUrl);
  const [instagramUrl, setInstagramUrl] = useState(hotel.instagramUrl);
  const [externalWebsiteUrl, setExternalWebsiteUrl] = useState(
    hotel.externalWebsiteUrl || ""
  );
  const [primaryCtaLabelTh, setPrimaryCtaLabelTh] = useState(
    hotel.primaryCtaLabelTh || ""
  );
  const [merchantMode, setMerchantMode] = useState<MerchantModeDto>(
    hotel.merchantMode || "DIRECT_BOOKING"
  );
  const [openingHours, setOpeningHours] = useState<PlaceOpeningHoursDayDto[]>(() => {
    const defaults: PlaceOpeningHoursDayDto[] = [
      { day: "mon", open: "09:00", close: "18:00", closed: false },
      { day: "tue", open: "09:00", close: "18:00", closed: false },
      { day: "wed", open: "09:00", close: "18:00", closed: false },
      { day: "thu", open: "09:00", close: "18:00", closed: false },
      { day: "fri", open: "09:00", close: "18:00", closed: false },
      { day: "sat", open: "09:00", close: "19:00", closed: false },
      { day: "sun", open: "09:00", close: "19:00", closed: false },
    ];
    if (Array.isArray(hotel.openingHoursJson) && hotel.openingHoursJson.length > 0) {
      const byDay = new Map(hotel.openingHoursJson.map((d) => [d.day, d]));
      return defaults.map((def) => byDay.get(def.day) ?? def);
    }
    return defaults;
  });
  const [isPublished, setIsPublished] = useState(hotel.isPublished ?? true);
  const isDirectBooking = hotel.merchantMode !== "PROFILE_ONLY";
  const catMeta = getPlaceCategoryMeta(hotel.placeCategory);

  const [isUploadingBrand, setIsUploadingBrand] = useState(false);
  const [isSavingHotel, setIsSavingHotel] = useState(false);

  const saveHotelPatch = async (
    patchBody: Record<string, unknown>,
    successMsg: string
  ) => {
    setIsSavingHotel(true);
    try {
      const res = await fetch("/api/studio/hotel", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hotelSlug: hotel.slug, ...patchBody }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        onNotify(json.error || "บันทึกข้อมูลไม่สำเร็จ");
        return;
      }
      onNotify(successMsg);
      await onReload();
    } finally {
      setIsSavingHotel(false);
    }
  };

  const roomPriceSummary =
    rooms.length > 0
      ? (() => {
          const all = rooms.flatMap((r) => [r.weekdayPriceThb, r.weekendPriceThb]);
          const mn = Math.min(...all);
          const mx = Math.max(...all);
          return mn === mx
            ? `${rooms.length} แบบห้อง · ฿${mn.toLocaleString()}`
            : `${rooms.length} แบบห้อง · ฿${mn.toLocaleString()}–฿${mx.toLocaleString()}`;
        })()
      : "ยังไม่มีห้องพัก";

  const activeSeasonalRulesCount = (() => {
    const stored = parseSeasonalRulesJson(hotel.seasonalRulesJson);
    if (stored.length > 0) {
      return stored.filter((r) => r.isActive).length;
    }
    return new Set(
      data.dateOverrides
        .filter((o) => o.overridePriceThb || o.note)
        .map((o) => o.note?.trim() || "custom")
    ).size;
  })();

  const navGroups: Array<{
    groupTitle: string;
    items: Array<{
      id: ListingSectionId;
      label: string;
      sublabel: string;
      icon: typeof BedDouble;
    }>;
  }> = isDirectBooking
    ? [
        {
          groupTitle: "ห้องพัก ราคา & โปรโมชั่น",
          items: [
            {
              id: "rooms",
              label: "ห้องพัก",
              sublabel: roomPriceSummary,
              icon: BedDouble,
            },
            {
              id: "seasonal",
              label: "ราคาตามฤดูกาล & เทศกาล",
              sublabel:
                activeSeasonalRulesCount > 0
                  ? `เปิดใช้ ${activeSeasonalRulesCount} ช่วงราคา`
                  : "ปีใหม่ · สงกรานต์ · ไฮซีซั่น",
              icon: Calendar,
            },
            {
              id: "promotions",
              label: "โปรโมชั่น & ส่วนลด",
              sublabel: `${discountRules.filter((r) => r.isActive).length} ส่วนลดอัตโนมัติ · ${coupons.length} คูปอง`,
              icon: TicketPercent,
            },
            {
              id: "addons",
              label: "บริการเสริม",
              sublabel:
                addons.length > 0
                  ? `${addons.length} รายการ (หมูกระทะ / เตียงเสริม)`
                  : "เพิ่มยอดต่อบิลในหน้าชำระเงิน",
              icon: Sparkles,
            },
          ],
        },
        {
          groupTitle: "ข้อมูลที่พัก & คอนเทนต์",
          items: [
            {
              id: "about",
              label: "ข้อมูลหน้าร้าน & จุดเด่น",
              sublabel:
                highlights.length > 0
                  ? `${highlights.length} จุดเด่น · ${hotel.nameTh}`
                  : hotel.nameTh,
              icon: Store,
            },
            {
              id: "location",
              label: "ทำเล & สถานที่ใกล้เคียง",
              sublabel: `${nearbySpots.length} จุดเช็กอินใกล้เคียง`,
              icon: MapPin,
            },
            {
              id: "policies",
              label: "กฎที่พัก & คำถามพบบ่อย",
              sublabel: `เช็กอิน ${hotel.checkInTime} · ${faqs.length} FAQ`,
              icon: FileText,
            },
            {
              id: "content",
              label: "Pins / Facebook & บทความ",
              sublabel: `${data.pins.length} Pins · ${posts.length} บทความ`,
              icon: Images,
            },
            {
              id: "payout",
              label: "รับเงิน 0% GP & ติดต่อ",
              sublabel: promptPayId
                ? `PromptPay ${promptPayId}`
                : "ยังไม่ได้ตั้งค่ารับเงิน",
              icon: Landmark,
            },
          ],
        },
      ]
    : [
        {
          groupTitle: `จัดการ${catMeta.shortLabelTh}`,
          items: [
            {
              id: "about",
              label: "ข้อมูลร้าน เวลาเปิด–ปิด & ติดต่อ",
              sublabel: hotel.nameTh,
              icon: Store,
            },
            {
              id: "location",
              label: "พิกัดแผนที่ & สถานที่ใกล้เคียง",
              sublabel: `${nearbySpots.length} จุดใกล้เคียง`,
              icon: MapPin,
            },
            {
              id: "promotions",
              label: "โปรโมชั่น & สิทธิพิเศษ",
              sublabel: `${coupons.length} โปรโมชั่น`,
              icon: TicketPercent,
            },
            {
              id: "content",
              label: "โพสต์อัปเดต Facebook & บทความ",
              sublabel: `${data.pins.length} การ์ด · ${posts.length} โพสต์`,
              icon: Images,
            },
          ],
        },
      ];

  const flatNavItems = navGroups.flatMap((g) => g.items);
  const activeNavMeta = flatNavItems.find((i) => i.id === section);

  return (
    <>
      <WorkspaceSplitLayout
        title={isDirectBooking ? "จัดการที่พัก" : `จัดการ${catMeta.shortLabelTh}`}
        subtitle={`${hotel.nameTh} · ${isDirectBooking ? "0% GP" : catMeta.labelTh}`}
        activeId={section}
        onSelect={(id) => handleSelectSection(id as ListingSectionId)}
        mobileView={mobileView}
        onMobileBack={() => setMobileView("list")}
        mobileDetailTitle={activeNavMeta?.label}
        contentWidth="wide"
        navGroups={navGroups.map((group) => ({
          title: group.groupTitle,
          items: group.items.map((item) => ({
            id: item.id,
            label: item.label,
            description: item.sublabel,
            icon: item.icon,
          })),
        }))}
      >
        <div style={{ viewTransitionName: "cgr-studio-pane" }}>
              {/* =============================================================
                  SECTION 1: ROOMS — HORIZONTAL AUDIT-READY EDITORIAL ROWS
              ============================================================== */}
              {section === "rooms" && (
                <div className="space-y-7">
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-[var(--color-border)]">
                    <h2 className="text-[24px] sm:text-[26px] font-semibold tracking-[-0.02em] text-[var(--color-text-primary)]">
                      ประเภทห้องพัก ({rooms.length})
                    </h2>

                    <div className="flex items-center gap-2 shrink-0">
                      {rooms.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setShowRoomDetails((v) => !v)}
                          aria-pressed={showRoomDetails}
                          className="h-10 sm:h-11 px-3.5 sm:px-4 rounded-[12px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[14px] font-semibold text-[var(--color-text-primary)] inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                        >
                          {showRoomDetails ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                          <span>
                            {showRoomDetails ? "ซ่อนรายละเอียด" : "ดูรายละเอียด"}
                          </span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={openCreateRoomModal}
                        className="h-10 sm:h-11 px-4 sm:px-5 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] text-[14px] sm:text-[14px] font-semibold inline-flex items-center gap-2 cursor-pointer transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        <span>เพิ่มประเภทห้องพัก</span>
                      </button>
                    </div>
                  </div>

                  {rooms.length === 0 ? (
                    <div className="rounded-[20px] bg-[var(--color-background-muted)]/60 py-16 px-6 text-center space-y-3">
                      <BedDouble className="w-8 h-8 mx-auto text-[var(--color-text-tertiary)]" />
                      <p className="text-[15px] font-semibold text-[var(--color-text-primary)]">
                        ยังไม่มีประเภทห้องพักในระบบ
                      </p>
                      <p className="text-[14px] text-[var(--color-text-secondary)]">
                        เพิ่มห้องพักแรกของคุณพร้อมรูปภาพและราคา เพื่อเปิดรับจองตรง 0% GP
                      </p>
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={openCreateRoomModal}
                          className="h-11 px-6 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] text-[14px] font-semibold cursor-pointer transition-colors"
                        >
                          เพิ่มห้องพักแรกของคุณ
                        </button>
                      </div>
                    </div>
                  ) : (
                    <SortableList
                      items={displayedRooms}
                      getId={(rm) => rm.id}
                      onReorder={(nextRooms) => void handleReorderRooms(nextRooms)}
                      renderItem={(rm, { handle, isOverlay }) => {
                        const normalizedMeta = normalizeRoomPhotos(
                          rm.galleryUrls,
                          rm.galleryMetaJson
                        );
                        const seoCaptionCount = normalizedMeta.filter((m) =>
                          Boolean(m.captionTh?.trim())
                        ).length;
                        const isRoomActive =
                          optimisticRoomActive[rm.id] ?? rm.isActive;
                        const isToggling = togglingRoomId === rm.id;
                        const hasWeekendDiff =
                          rm.weekendPriceThb !== rm.weekdayPriceThb;

                        return (
                          <article
                            role="button"
                            tabIndex={isOverlay ? -1 : 0}
                            onClick={() => {
                              if (!isOverlay) openEditRoomModal(rm);
                            }}
                            onKeyDown={(e) => {
                              if (!isOverlay && (e.key === "Enter" || e.key === " ")) {
                                e.preventDefault();
                                openEditRoomModal(rm);
                              }
                            }}
                            className={`group py-4 sm:py-5 rounded-[16px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#222222] dark:focus-visible:ring-[#f5f5f5] ${
                              isOverlay
                                ? "px-3 cursor-grabbing"
                                : "first:pt-2 last:pb-2 -mx-3 px-3 hover:bg-[var(--color-background-muted)]/50 cursor-pointer"
                            } ${!isRoomActive ? "opacity-65" : ""}`}
                          >
                            {/* Compact Primary Row (Horizontal on Mobile & Desktop -> See 4-5 Rooms Easily!) */}
                            <div className="flex items-center gap-2.5 sm:gap-4">
                              {/* Drag Handle (touch-none strictly isolated to handle!) */}
                              {handle}

                              {/* Left: Crisp Squircle Photo Thumbnail */}
                              <div className="relative w-[84px] h-[66px] sm:w-[136px] sm:h-[98px] rounded-[12px] sm:rounded-[14px] overflow-hidden bg-[var(--color-background-muted)] shrink-0">
                                {rm.galleryUrls[0] ? (
                                  <img
                                    src={rm.galleryUrls[0]}
                                    alt={normalizedMeta[0]?.captionTh || rm.nameTh}
                                    className="w-full h-full object-cover group-hover:brightness-[0.95] transition"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-[var(--color-text-tertiary)]">
                                    <BedDouble className="w-5 h-5 sm:w-6 sm:h-6 stroke-[1.5]" />
                                  </div>
                                )}
                              </div>

                              {/* Center: Minimal Title + Price + Icon Specs */}
                              <div className="flex-1 min-w-0 space-y-1.5">
                                <div className="flex items-baseline gap-2 min-w-0">
                                  <h3 className="text-[16px] sm:text-[15px] font-semibold text-[var(--color-text-primary)] leading-snug truncate">
                                    {rm.nameTh}
                                  </h3>
                                  <span className="hidden sm:inline text-[13px] text-[var(--color-text-tertiary)] truncate shrink-0">
                                    {normalizeRoomCategoryValue(rm.categoryTh)}
                                  </span>
                                </div>

                                {/* Calm Single-Line Price */}
                                <p className="text-[14px] sm:text-[15px] font-semibold text-[var(--color-text-primary)] tabular-nums">
                                  ฿{rm.weekdayPriceThb.toLocaleString()}
                                  {hasWeekendDiff && (
                                    <span className="font-normal text-[var(--color-text-secondary)]">
                                      {" "}
                                      – ฿{rm.weekendPriceThb.toLocaleString()}
                                    </span>
                                  )}
                                  <span className="text-[13px] font-normal text-[var(--color-text-secondary)]">
                                    {" "}
                                    / คืน
                                  </span>
                                </p>

                                {/* Ultra-Minimal Icon Specs Row */}
                                <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[13px] text-[var(--color-text-secondary)] tabular-nums">
                                  <span
                                    title={`${rm.totalUnits} ยูนิต`}
                                    className="inline-flex items-center gap-1"
                                  >
                                    <DoorOpen className="w-3.5 h-3.5 text-[var(--color-text-tertiary)] stroke-[1.75]" />
                                    <span>{rm.totalUnits}</span>
                                  </span>
                                  <span
                                    title={`พักได้สูงสุด ${rm.maxGuests} ท่าน`}
                                    className="inline-flex items-center gap-1"
                                  >
                                    <Users className="w-3.5 h-3.5 text-[var(--color-text-tertiary)] stroke-[1.75]" />
                                    <span>{rm.maxGuests}</span>
                                  </span>
                                  <span
                                    title={`${rm.beds} เตียง`}
                                    className="inline-flex items-center gap-1"
                                  >
                                    <BedDouble className="w-3.5 h-3.5 text-[var(--color-text-tertiary)] stroke-[1.75]" />
                                    <span>{rm.beds}</span>
                                  </span>
                                  <span
                                    title={`${rm.bathrooms} ห้องน้ำ`}
                                    className="inline-flex items-center gap-1"
                                  >
                                    <Bath className="w-3.5 h-3.5 text-[var(--color-text-tertiary)] stroke-[1.75]" />
                                    <span>{rm.bathrooms}</span>
                                  </span>
                                  <span
                                    title={`${rm.sizeSqm} ตร.ม.`}
                                    className="hidden sm:inline-flex items-center gap-1"
                                  >
                                    <Maximize2 className="w-3.5 h-3.5 text-[var(--color-text-tertiary)] stroke-[1.75]" />
                                    <span>{rm.sizeSqm} ม²</span>
                                  </span>
                                  <span
                                    title={
                                      rm.galleryUrls.length === 0
                                        ? "ยังไม่มีรูปภาพ"
                                        : `${rm.galleryUrls.length} รูปภาพ`
                                    }
                                    className={`inline-flex items-center gap-1 ${
                                      rm.galleryUrls.length === 0
                                        ? "text-[var(--color-error)] font-medium"
                                        : ""
                                    }`}
                                  >
                                    <Images className="w-3.5 h-3.5 stroke-[1.75]" />
                                    <span>{rm.galleryUrls.length}</span>
                                  </span>
                                  {rm.petsAllowed && (
                                    <span
                                      title="ต้อนรับสัตว์เลี้ยง"
                                      className="hidden sm:inline-flex items-center text-[var(--color-text-tertiary)]"
                                    >
                                      <PawPrint className="w-3.5 h-3.5 stroke-[1.75]" />
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Right: 1-Click Open/Pause Toggle Switch */}
                              <div
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => e.stopPropagation()}
                                className="flex items-center gap-2.5 shrink-0"
                              >
                                <span
                                  className={`hidden sm:inline text-[13px] font-medium ${
                                    isRoomActive
                                      ? "text-[var(--color-text-primary)]"
                                      : "text-[var(--color-text-tertiary)]"
                                  }`}
                                >
                                  {isRoomActive ? "เปิดขาย" : "พักขาย"}
                                </span>
                                <button
                                  type="button"
                                  role="switch"
                                  aria-checked={isRoomActive}
                                  aria-label={
                                    isRoomActive
                                      ? `พักขายห้อง ${rm.nameTh}`
                                      : `เปิดขายห้อง ${rm.nameTh}`
                                  }
                                  disabled={isToggling}
                                  onClick={() => void handleToggleRoomActive(rm)}
                                  className={`h-7 w-12 rounded-full p-1 transition-colors cursor-pointer shrink-0 disabled:opacity-50 ${
                                    isRoomActive
                                      ? "bg-[var(--color-accent)]"
                                      : "bg-[var(--color-border-emphasized)]"
                                  }`}
                                >
                                  <span
                                    className={`block h-5 w-5 rounded-full transition-transform ${
                                      isRoomActive
                                        ? "translate-x-5 bg-white"
                                        : "translate-x-0 bg-white"
                                    }`}
                                  />
                                </button>
                              </div>
                            </div>

                            {/* Optional Expanded Details Drawer (Toggled via "ดูรายละเอียด" Button) */}
                            {showRoomDetails && (
                              <div className="mt-3.5 pt-3.5 sm:pl-[156px] border-t border-[var(--color-border-subtle)] space-y-2 text-[13px] text-[var(--color-text-secondary)]">
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 tabular-nums">
                                  <span>
                                    จ.–พฤ.{" "}
                                    <strong className="font-semibold text-[var(--color-text-primary)]">
                                      ฿{rm.weekdayPriceThb.toLocaleString()}
                                    </strong>
                                  </span>
                                  <span>
                                    ศ.–ส.{" "}
                                    <strong className="font-semibold text-[var(--color-text-primary)]">
                                      ฿{rm.weekendPriceThb.toLocaleString()}
                                    </strong>
                                  </span>
                                  <span>
                                    {rm.extraGuestPriceThb > 0
                                      ? `เสริม +฿${rm.extraGuestPriceThb.toLocaleString()}/คืน`
                                      : "ไม่มีค่าผู้เข้าพักเสริม"}
                                  </span>
                                  <span>
                                    {rm.bedrooms} ห้องนอน · {rm.sizeSqm} ตร.ม.
                                  </span>
                                  {seoCaptionCount > 0 && (
                                    <span>SEO {seoCaptionCount}/{rm.galleryUrls.length} รูป</span>
                                  )}
                                </div>

                                {rm.shortDescTh && (
                                  <p className="text-[13px] text-[var(--color-text-secondary)] line-clamp-2">
                                    {rm.shortDescTh}
                                  </p>
                                )}

                                {rm.amenities.length > 0 && (
                                  <p className="text-[13px] text-[var(--color-text-tertiary)]">
                                    {rm.amenities.slice(0, 6).join(" · ")}
                                    {rm.amenities.length > 6
                                      ? ` +${rm.amenities.length - 6}`
                                      : ""}
                                  </p>
                                )}
                              </div>
                            )}
                          </article>
                        );
                      }}
                    />
                  )}
                </div>
              )}

          {/* =================================================================
              SECTION 1B: SEASONAL & HOLIDAY PRICING (20 ธ.ค. – 3 ม.ค. ฯลฯ)
          ================================================================== */}
          {section === "seasonal" && (
            <StudioSeasonalPricingSection
              data={data}
              onReload={onReload}
              onNotify={onNotify}
            />
          )}

          {/* =================================================================
              SECTION 1C: PROMOTIONS & AUTOMATIC DISCOUNTS (Unified Header + DnD)
          ================================================================== */}
          {section === "promotions" && (
            <StudioGrowthTab
              data={data}
              mode="promotions"
              onReload={onReload}
              onNotify={onNotify}
            />
          )}

          {/* =================================================================
              SECTION 1D: PINS / FACEBOOK SYNC & SEO BLOG (Merged from Promote)
          ================================================================== */}
          {section === "content" && (
            <div className="space-y-7">
              <div className="pb-5 border-b border-[var(--color-border)]">
                <h2 className="text-[24px] sm:text-[26px] font-semibold tracking-[-0.02em] text-[var(--color-text-primary)]">
                  คอนเทนต์ Pins & บทความ SEO
                </h2>
              </div>
              <StudioGrowthTab
                data={data}
                mode="content"
                onReload={onReload}
                onNotify={onNotify}
              />
            </div>
          )}

        {/* =================================================================
            SECTION 2: ADD-ONS
        ================================================================== */}
        {section === "addons" && (
          <div className="space-y-7">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-[var(--color-border)]">
              <h2 className="text-[24px] sm:text-[26px] font-semibold tracking-[-0.02em] text-[var(--color-text-primary)]">
                บริการเสริม ({addons.length})
              </h2>
              <button
                type="button"
                onClick={openCreateAddonModal}
                className="h-10 sm:h-11 px-4 sm:px-5 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] text-[14px] sm:text-[14px] font-semibold inline-flex items-center gap-2 cursor-pointer transition-colors shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>เพิ่มบริการเสริม</span>
              </button>
            </div>

            {addons.length === 0 ? (
              <div className="rounded-[16px] bg-[var(--color-background-muted)] py-10 px-6 text-center space-y-2">
                <p className="text-[15px] font-semibold text-[var(--color-text-primary)]">
                  ยังไม่มีบริการเสริม
                </p>
                <p className="text-[14px] text-[var(--color-text-secondary)]">
                  เพิ่มชุดหมูกระทะ อาหารเช้าลอยน้ำ หรือเตียงเสริม เพื่อให้แขกเลือกเพิ่มตอนจองได้ทันที
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--color-border)]">
                {addons.map((a) => (
                  <div
                    key={a.id}
                    onClick={() => openEditAddonModal(a)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openEditAddonModal(a);
                      }
                    }}
                    className="py-4 first:pt-0 flex items-center justify-between gap-4 rounded-[12px] px-2 -mx-2 hover:bg-[var(--color-background-muted)]/70 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="h-14 w-14 aspect-square rounded-[16px] overflow-hidden bg-[var(--color-background-muted)] shrink-0 flex items-center justify-center text-[var(--color-text-secondary)]">
                        {a.imageUrl ? (
                          <img
                            src={a.imageUrl}
                            alt={a.nameTh}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Utensils className="w-5 h-5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[15px] font-semibold text-[var(--color-text-primary)] truncate">
                          {a.nameTh}
                          {!a.isActive && (
                            <span className="ml-2 text-[12px] font-normal text-[var(--color-text-secondary)]">
                              (ปิดใช้งาน)
                            </span>
                          )}
                        </p>
                        {a.descriptionTh && (
                          <p className="text-[13px] text-[var(--color-text-secondary)] truncate">
                            {a.descriptionTh}
                          </p>
                        )}
                        <p className="text-[14px] font-semibold text-[var(--color-text-primary)] tabular-nums mt-0.5">
                          +฿{a.priceThb.toLocaleString()} / {a.unitLabelTh}
                        </p>
                      </div>
                    </div>

                    <span className="h-9 px-3.5 rounded-[10px] bg-[var(--color-background-muted)] text-[13px] font-semibold text-[var(--color-text-primary)] inline-flex items-center gap-1.5 shrink-0">
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>แก้ไข</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* =================================================================
            SECTION 3: ABOUT, BRANDING, STAY STYLES & HIGHLIGHTS
        ================================================================== */}
        {section === "about" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void saveHotelPatch(
                {
                  ...(isDirectBooking ? { propertyType } : {}),
                  ...(hotel.placeCategory === "STAY" ? { merchantMode } : {}),
                  nameTh: nameTh.trim(),
                  nameEn: nameEn.trim(),
                  taglineTh: taglineTh.trim(),
                  taglineEn: taglineEn.trim(),
                  descriptionTh: descriptionTh.trim(),
                  descriptionEn: descriptionEn.trim(),
                  logoUrl: logoUrl.trim() || null,
                  coverImageUrl: coverImageUrl.trim() || null,
                  stayStyles,
                  highlightsJson: highlights.filter((h) => h.titleTh.trim()),
                  externalWebsiteUrl: externalWebsiteUrl.trim(),
                  primaryCtaLabelTh: primaryCtaLabelTh.trim(),
                  ...(!isDirectBooking
                    ? {
                        contactPhone: contactPhone.trim(),
                        contactLine: contactLine.trim(),
                        facebookPageUrl: facebookPageUrl.trim(),
                        instagramUrl: instagramUrl.trim(),
                        openingHoursJson: openingHours,
                      }
                    : {}),
                },
                "บันทึกข้อมูลหน้าร้านและจุดเด่นแล้ว"
              );
            }}
            className="divide-y divide-[var(--color-border)]"
          >
            <div className="pb-8 space-y-5">
              <div className="pb-5 border-b border-[var(--color-border)]">
                <h2 className="text-[24px] sm:text-[26px] font-semibold tracking-[-0.02em] text-[var(--color-text-primary)]">
                  {isDirectBooking
                    ? "ข้อมูลหน้าร้าน & จุดเด่นที่พัก"
                    : `ข้อมูล${catMeta.shortLabelTh} เวลาเปิด–ปิด & ช่องทางติดต่อ`}
                </h2>
              </div>

              {/* Property Type selector (Direct Booking Stays ONLY) */}
              {isDirectBooking && (
                <div className="space-y-2">
                  <span className="text-[14px] font-semibold text-[var(--color-text-primary)] block">
                    ประเภทที่พัก
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {PROPERTY_TYPE_OPTIONS.map((opt) => {
                      const active = propertyType === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setPropertyType(opt.value)}
                          className={`p-3.5 rounded-[14px] text-left cursor-pointer transition-colors ${
                            active
                              ? "bg-[var(--color-accent)] !text-[var(--color-on-accent)]"
                              : "bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)]"
                          }`}
                        >
                          <p className="text-[14px] font-semibold">{opt.label}</p>
                          <p
                            className={`text-[13px] mt-0.5 ${
                              active ? "opacity-85" : "text-[var(--color-text-secondary)]"
                            }`}
                          >
                            {opt.desc}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Optional Direct Booking opt-in/out toggle for STAY owners */}
              {hotel.placeCategory === "STAY" && (
                <div className="rounded-[18px] bg-[var(--color-background-muted)] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <p className="text-[14px] font-semibold text-[var(--color-text-primary)]">
                      โหมดการขายหน้าโปรไฟล์ ({merchantMode === "DIRECT_BOOKING" ? "เปิดระบบจองตรง 0% GP" : "หน้าโปรไฟล์ & ลิงก์จองภายนอก"})
                    </p>
                    <p className="text-[13px] text-[var(--color-text-secondary)]">
                      สลับได้ตลอดเวลาหากต้องการเปิด/ปิดปฏิทินห้องว่างบน Nondii
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {(["DIRECT_BOOKING", "PROFILE_ONLY"] as const).map((modeVal) => (
                      <button
                        key={modeVal}
                        type="button"
                        onClick={() => setMerchantMode(modeVal)}
                        className={`h-9 px-3 rounded-[10px] text-[13px] font-semibold cursor-pointer transition-colors ${
                          merchantMode === modeVal
                            ? "bg-[var(--color-accent)] !text-[var(--color-on-accent)]"
                            : "bg-[var(--color-background-card)] text-[var(--color-text-primary)]"
                        }`}
                      >
                        {modeVal === "DIRECT_BOOKING" ? "จองตรง 0% GP" : "โปรไฟล์อย่างเดียว"}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <StandardFieldGroup>
                <div className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x divide-y sm:divide-y-0 divide-[#b0b0b0] dark:divide-[var(--color-border-emphasized)]">
                  <StandardInput
                    grouped
                    label="ชื่อที่พัก (ภาษาไทย) *"
                    required
                    value={nameTh}
                    onChange={(e) => setNameTh(e.target.value)}
                  />
                  <StandardInput
                    grouped
                    label="ชื่อที่พัก (English)"
                    optionalText="ไม่บังคับ"
                    value={nameEn}
                    onChange={(e) => setNameEn(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x divide-y sm:divide-y-0 divide-[#b0b0b0] dark:divide-[var(--color-border-emphasized)]">
                  <StandardInput
                    grouped
                    label="สโลแกนสั้นๆ (ไทย)"
                    value={taglineTh}
                    onChange={(e) => setTaglineTh(e.target.value)}
                  />
                  <StandardInput
                    grouped
                    label="Tagline (English)"
                    optionalText="ไม่บังคับ"
                    value={taglineEn}
                    onChange={(e) => setTaglineEn(e.target.value)}
                  />
                </div>
              </StandardFieldGroup>

              <StandardTextarea
                label="คำอธิบายที่พัก (ภาษาไทย)"
                rows={4}
                placeholder="เล่าบรรยากาศ วิว และความพิเศษของที่พักให้แขกอยากมาพัก..."
                value={descriptionTh}
                onChange={(e) => setDescriptionTh(e.target.value)}
              />

              <StandardTextarea
                label="คำอธิบายที่พัก (English)"
                optionalText="ไม่บังคับ"
                rows={3}
                placeholder="Describe your property atmosphere, views, and direct-stay perks..."
                value={descriptionEn}
                onChange={(e) => setDescriptionEn(e.target.value)}
              />

              {/* Brand Logo & Cover */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <span className="text-[14px] font-semibold block">โลโก้ที่พัก</span>
                  <div className="flex items-center gap-2.5">
                    {logoUrl && (
                      <img
                        src={logoUrl}
                        alt="Logo"
                        className="w-11 h-11 rounded-full object-cover bg-[var(--color-background-muted)] shrink-0"
                      />
                    )}
                    <label className="h-10 px-4 rounded-[12px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[14px] font-semibold text-[var(--color-text-primary)] inline-flex items-center gap-2 cursor-pointer transition-colors shrink-0">
                      <Upload className="w-4 h-4" />
                      <span>{isUploadingBrand ? "อัปโหลด..." : "อัปโหลดโลโก้"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setIsUploadingBrand(true);
                          try {
                            const url = await uploadMediaFile(file, "logos");
                            setLogoUrl(url);
                            onNotify("อัปโหลดโลโก้แล้ว กดบันทึกเพื่อยืนยัน");
                          } finally {
                            setIsUploadingBrand(false);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[14px] font-semibold block">ภาพปกหลัก (Cover)</span>
                  <div className="flex items-center gap-2.5">
                    {coverImageUrl && (
                      <img
                        src={coverImageUrl}
                        alt="Cover"
                        className="w-16 h-11 rounded-[10px] object-cover bg-[var(--color-background-muted)] shrink-0"
                      />
                    )}
                    <label className="h-10 px-4 rounded-[12px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[14px] font-semibold text-[var(--color-text-primary)] inline-flex items-center gap-2 cursor-pointer transition-colors shrink-0">
                      <Upload className="w-4 h-4" />
                      <span>{isUploadingBrand ? "อัปโหลด..." : "อัปโหลดภาพปก"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setIsUploadingBrand(true);
                          try {
                            const url = await uploadMediaFile(file, "logos");
                            setCoverImageUrl(url);
                            onNotify("อัปโหลดภาพปกแล้ว กดบันทึกเพื่อยืนยัน");
                          } finally {
                            setIsUploadingBrand(false);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Stay Styles */}
              <div className="space-y-2">
                <span className="text-[14px] font-semibold block">
                  สไตล์ที่พัก (แสดงในหมวดหมู่หน้าแรก)
                </span>
                <div className="flex flex-wrap gap-2">
                  {STYLE_OPTIONS.map((style) => {
                    const active = stayStyles.includes(style.id);
                    return (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() =>
                          setStayStyles((prev) =>
                            prev.includes(style.id)
                              ? prev.length > 1
                                ? prev.filter((x) => x !== style.id)
                                : prev
                              : [...prev, style.id]
                          )
                        }
                        className={`h-9 px-4 rounded-full text-[13px] font-semibold cursor-pointer transition-colors ${
                          active
                            ? "bg-[var(--color-accent)] !text-[var(--color-on-accent)]"
                            : "bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)]"
                        }`}
                      >
                        {style.labelTh}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Property Highlights Editor */}
            <div className="py-8 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-[20px] font-semibold text-[var(--color-text-primary)]">
                    จุดเด่นของที่พัก (Highlights)
                  </h2>
                  <p className="text-[13px] text-[var(--color-text-secondary)]">
                    แนะนำใส่ 3 ข้อสำคัญที่ลูกค้าควรรู้ทันทีเมื่อเปิดหน้าร้าน
                  </p>
                </div>
                {highlights.length < 6 && (
                  <button
                    type="button"
                    onClick={() =>
                      setHighlights((prev) => [
                        ...prev,
                        { titleTh: "", descTh: "" },
                      ])
                    }
                    className="h-9 px-3.5 rounded-[10px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[13px] font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>เพิ่มจุดเด่น</span>
                  </button>
                )}
              </div>

              {highlights.length === 0 ? (
                <p className="text-[14px] text-[var(--color-text-secondary)]">
                  ยังไม่มีจุดเด่น — กดปุ่ม “เพิ่มจุดเด่น” เช่น วิวทะเลหมอก 180 องศา, สระน้ำเกลือส่วนตัว
                </p>
              ) : (
                <div className="divide-y divide-[var(--color-border)]">
                  {highlights.map((hl, idx) => (
                    <div
                      key={idx}
                      className="py-3.5 first:pt-0 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
                    >
                      <div className="sm:col-span-5">
                        <StandardInput
                          label={`หัวข้อจุดเด่น #${idx + 1}`}
                          placeholder="เช่น วิวภูเขาส่วนตัวทุกหลัง"
                          value={hl.titleTh}
                          onChange={(e) =>
                            setHighlights((prev) =>
                              prev.map((item, i) =>
                                i === idx
                                  ? { ...item, titleTh: e.target.value }
                                  : item
                              )
                            )
                          }
                        />
                      </div>
                      <div className="sm:col-span-6">
                        <StandardInput
                          label="คำอธิบายสั้น"
                          placeholder="เช่น ตื่นมาชมหมอกยามเช้าจากระเบียงหน้าห้อง"
                          value={hl.descTh}
                          onChange={(e) =>
                            setHighlights((prev) =>
                              prev.map((item, i) =>
                                i === idx
                                  ? { ...item, descTh: e.target.value }
                                  : item
                              )
                            )
                          }
                        />
                      </div>
                      <div className="sm:col-span-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() =>
                            setHighlights((prev) =>
                              prev.filter((_, i) => i !== idx)
                            )
                          }
                          aria-label="ลบจุดเด่น"
                          className="h-10 w-10 rounded-[10px] hover:bg-[var(--color-background-muted)] text-[var(--color-text-secondary)] hover:text-[var(--color-error)] inline-flex items-center justify-center cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* External Link, Contact Channels & 7-Day Opening Hours (for PROFILE_ONLY venues) */}
              {!isDirectBooking && (
                <div className="space-y-5 pt-2">
                  <StandardFieldGroup>
                    <div className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x divide-y sm:divide-y-0 divide-[#b0b0b0] dark:divide-[var(--color-border-emphasized)]">
                      <StandardInput
                        grouped
                        label="ลิงก์เว็บไซต์ / จองโต๊ะ / จองห้องภายนอก"
                        optionalText="ไม่บังคับ"
                        placeholder="https://yourwebsite.com"
                        value={externalWebsiteUrl}
                        onChange={(e) => setExternalWebsiteUrl(e.target.value)}
                      />
                      <StandardInput
                        grouped
                        label="ข้อความปุ่มหลัก (CTA Label)"
                        optionalText="ค่าเริ่มต้นตามหมวด"
                        placeholder={catMeta.defaultCtaTh}
                        value={primaryCtaLabelTh}
                        onChange={(e) => setPrimaryCtaLabelTh(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x divide-y sm:divide-y-0 divide-[#b0b0b0] dark:divide-[var(--color-border-emphasized)]">
                      <StandardInput
                        grouped
                        label="เบอร์โทรศัพท์"
                        placeholder="08X-XXX-XXXX"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                      />
                      <StandardInput
                        grouped
                        label="LINE ID / @LINE OA"
                        placeholder="@yourplace"
                        value={contactLine}
                        onChange={(e) => setContactLine(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x divide-y sm:divide-y-0 divide-[#b0b0b0] dark:divide-[var(--color-border-emphasized)]">
                      <StandardInput
                        grouped
                        label="ลิงก์ Facebook Page"
                        optionalText="ไม่บังคับ"
                        placeholder="https://facebook.com/..."
                        value={facebookPageUrl}
                        onChange={(e) => setFacebookPageUrl(e.target.value)}
                      />
                      <StandardInput
                        grouped
                        label="ลิงก์ Instagram"
                        optionalText="ไม่บังคับ"
                        placeholder="https://instagram.com/..."
                        value={instagramUrl}
                        onChange={(e) => setInstagramUrl(e.target.value)}
                      />
                    </div>
                  </StandardFieldGroup>

                  <div className="space-y-2.5">
                    <span className="text-[14px] font-semibold text-[var(--color-text-primary)] block">
                      เวลาเปิด–ปิดประจำสัปดาห์
                    </span>
                    <div className="rounded-[16px] border border-[var(--color-border)] divide-y divide-[var(--color-border)] overflow-hidden bg-[var(--color-background-card)]">
                      {openingHours.map((oh, dayIdx) => {
                        const DAY_TH: Record<string, string> = {
                          mon: "วันจันทร์",
                          tue: "วันอังคาร",
                          wed: "วันพุธ",
                          thu: "วันพฤหัสบดี",
                          fri: "วันศุกร์",
                          sat: "วันเสาร์",
                          sun: "วันอาทิตย์",
                        };
                        return (
                          <div
                            key={oh.day}
                            className="px-4 py-3 flex flex-wrap items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-3 min-w-[130px]">
                              <StandardCheckbox
                                checked={!oh.closed}
                                onChange={(isOpenDay) =>
                                  setOpeningHours((prev) =>
                                    prev.map((row, idx) =>
                                      idx === dayIdx
                                        ? { ...row, closed: !isOpenDay }
                                        : row
                                    )
                                  )
                                }
                                label={DAY_TH[oh.day] ?? oh.day}
                              />
                            </div>
                            {oh.closed ? (
                              <span className="text-[13px] font-medium text-[var(--color-text-secondary)]">
                                ปิดทำการ
                              </span>
                            ) : (
                              <div className="flex items-center gap-2">
                                <input
                                  type="time"
                                  value={oh.open}
                                  onChange={(e) =>
                                    setOpeningHours((prev) =>
                                      prev.map((row, idx) =>
                                        idx === dayIdx
                                          ? { ...row, open: e.target.value }
                                          : row
                                      )
                                    )
                                  }
                                  className="h-9 px-2.5 rounded-[10px] border border-[#b0b0b0] dark:border-[var(--color-border-emphasized)] bg-[var(--color-background-card)] text-[14px] tabular-nums"
                                />
                                <span className="text-[var(--color-text-secondary)]">–</span>
                                <input
                                  type="time"
                                  value={oh.close}
                                  onChange={(e) =>
                                    setOpeningHours((prev) =>
                                      prev.map((row, idx) =>
                                        idx === dayIdx
                                          ? { ...row, close: e.target.value }
                                          : row
                                      )
                                    )
                                  }
                                  className="h-9 px-2.5 rounded-[10px] border border-[#b0b0b0] dark:border-[var(--color-border-emphasized)] bg-[var(--color-background-card)] text-[14px] tabular-nums"
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={isSavingHotel}
                  className="h-11 px-6 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] text-[14px] font-semibold inline-flex items-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingHotel ? "กำลังบันทึก..." : "บันทึกข้อมูลหน้าร้าน"}</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* =================================================================
            SECTION 4: LOCATION & NEARBY SPOTS
        ================================================================== */}
        {section === "location" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void saveHotelPatch(
                {
                  provinceId,
                  districtTh: districtTh.trim(),
                  addressTh: addressTh.trim(),
                  latitude,
                  longitude,
                  googleMapsUrl: googleMapsUrl.trim() || null,
                  nearbySpotsJson: nearbySpots.filter((n) => n.nameTh.trim()),
                },
                "บันทึกทำเลที่ตั้งและจุดเช็กอินใกล้เคียงแล้ว"
              );
            }}
            className="divide-y divide-[var(--color-border)]"
          >
            <div className="pb-8 space-y-5">
              <div className="pb-5 border-b border-[var(--color-border)]">
                <h2 className="text-[24px] sm:text-[26px] font-semibold tracking-[-0.02em] text-[var(--color-text-primary)]">
                  ทำเลที่ตั้ง & แผนที่
                </h2>
              </div>

              <StandardFieldGroup>
                <div className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x divide-y sm:divide-y-0 divide-[#b0b0b0] dark:divide-[var(--color-border-emphasized)]">
                  <StandardSelectField
                    grouped
                    label="จังหวัด *"
                    value={provinceId}
                    onChange={setProvinceId}
                    sheetTitle="เลือกจังหวัดที่ตั้ง"
                    searchPlaceholder="พิมพ์ชื่อจังหวัด..."
                    options={THAILAND_77_PROVINCES.map((p) => ({
                      value: p.id,
                      label: p.nameTh,
                      sublabel: p.nameEn,
                    }))}
                  />
                  <StandardInput
                    grouped
                    label="อำเภอ / ย่านทำเล"
                    placeholder="เช่น เมือง / หาดกะตะ"
                    value={districtTh}
                    onChange={(e) => setDistrictTh(e.target.value)}
                  />
                </div>
                <StandardInput
                  grouped
                  label="ที่อยู่เต็มสำหรับแสดงบนใบจอง"
                  placeholder="บ้านเลขที่ ถนน ตำบล อำเภอ จังหวัด รหัสไปรษณีย์"
                  value={addressTh}
                  onChange={(e) => setAddressTh(e.target.value)}
                />
              </StandardFieldGroup>

              <HostLocationPicker
                provinceId={provinceId}
                latitude={latitude}
                longitude={longitude}
                googleMapsUrl={googleMapsUrl}
                onChangeCoordinates={(lat, lng) => {
                  setLatitude(lat);
                  setLongitude(lng);
                }}
                onChangeGoogleMapsUrl={setGoogleMapsUrl}
              />
            </div>

            {/* Nearby Spots Editor */}
            <div className="py-8 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-[20px] font-semibold text-[var(--color-text-primary)]">
                    สถานที่ท่องเที่ยว & คาเฟ่ใกล้เคียง
                  </h2>
                  <p className="text-[13px] text-[var(--color-text-secondary)]">
                    ช่วยให้แขกตัดสินใจง่ายขึ้นและปรากฏบนแผนที่หน้าร้าน
                  </p>
                </div>
                {nearbySpots.length < 12 && (
                  <button
                    type="button"
                    onClick={() =>
                      setNearbySpots((prev) => [
                        ...prev,
                        { nameTh: "", distTh: "" },
                      ])
                    }
                    className="h-9 px-3.5 rounded-[10px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[13px] font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>เพิ่มสถานที่</span>
                  </button>
                )}
              </div>

              {nearbySpots.length === 0 ? (
                <p className="text-[14px] text-[var(--color-text-secondary)]">
                  ยังไม่มีรายการสถานที่ใกล้เคียง — กด “เพิ่มสถานที่” เช่น หาดกะตะ · 5 นาที
                </p>
              ) : (
                <div className="divide-y divide-[var(--color-border)]">
                  {nearbySpots.map((spot, idx) => (
                    <div
                      key={idx}
                      className="py-3 first:pt-0 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
                    >
                      <div className="sm:col-span-7">
                        <StandardInput
                          label={`สถานที่ #${idx + 1}`}
                          placeholder="เช่น น้ำตกสะปัน / คาเฟ่หยุดเวลา"
                          value={spot.nameTh}
                          onChange={(e) =>
                            setNearbySpots((prev) =>
                              prev.map((item, i) =>
                                i === idx
                                  ? { ...item, nameTh: e.target.value }
                                  : item
                              )
                            )
                          }
                        />
                      </div>
                      <div className="sm:col-span-4">
                        <StandardInput
                          label="ระยะทาง / เวลาเดินทาง"
                          placeholder="เช่น ขับรถ 5 นาที (1.2 กม.)"
                          value={spot.distTh}
                          onChange={(e) =>
                            setNearbySpots((prev) =>
                              prev.map((item, i) =>
                                i === idx
                                  ? { ...item, distTh: e.target.value }
                                  : item
                              )
                            )
                          }
                        />
                      </div>
                      <div className="sm:col-span-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() =>
                            setNearbySpots((prev) =>
                              prev.filter((_, i) => i !== idx)
                            )
                          }
                          aria-label="ลบสถานที่"
                          className="h-10 w-10 rounded-[10px] hover:bg-[var(--color-background-muted)] text-[var(--color-text-secondary)] hover:text-[var(--color-error)] inline-flex items-center justify-center cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={isSavingHotel}
                  className="h-11 px-6 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] text-[14px] font-semibold inline-flex items-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingHotel ? "กำลังบันทึก..." : "บันทึกทำเลที่ตั้ง"}</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* =================================================================
            SECTION 5: HOUSE RULES & COMMON QUESTIONS (FAQ EDITOR + TEMPLATES!)
        ================================================================== */}
        {section === "policies" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void saveHotelPatch(
                {
                  checkInTime: checkInTime.trim(),
                  checkOutTime: checkOutTime.trim(),
                  petsAllowed,
                  petPolicyTh: petPolicyTh.trim(),
                  faqJson: faqs.filter((f) => f.qTh.trim() && f.aTh.trim()),
                },
                "บันทึกกฎที่พักและคำถามที่พบบ่อย (FAQ) แล้ว"
              );
            }}
            className="divide-y divide-[var(--color-border)]"
          >
            <div className="pb-8 space-y-5">
              <div className="pb-5 border-b border-[var(--color-border)]">
                <h2 className="text-[24px] sm:text-[26px] font-semibold tracking-[-0.02em] text-[var(--color-text-primary)]">
                  เวลาเข้าพัก & กฎที่พัก
                </h2>
              </div>

              <StandardFieldGroup>
                <div className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x divide-y sm:divide-y-0 divide-[#b0b0b0] dark:divide-[var(--color-border-emphasized)]">
                  <StandardInput
                    grouped
                    label="เวลาเช็กอิน"
                    placeholder="14:00"
                    value={checkInTime}
                    onChange={(e) => setCheckInTime(e.target.value)}
                  />
                  <StandardInput
                    grouped
                    label="เวลาเช็กเอาต์"
                    placeholder="11:00"
                    value={checkOutTime}
                    onChange={(e) => setCheckOutTime(e.target.value)}
                  />
                </div>
              </StandardFieldGroup>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-4 py-2">
                  <div>
                    <p className="text-[15px] font-medium text-[var(--color-text-primary)]">
                      อนุญาตสัตว์เลี้ยงเข้าพัก (Pet-friendly)
                    </p>
                    <p className="text-[13px] text-[var(--color-text-secondary)]">
                      แสดงป้ายต้อนรับสัตว์เลี้ยงบนหน้าร้านและผลการค้นหา
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={petsAllowed}
                    onClick={() => setPetsAllowed((v) => !v)}
                    className={`h-7 w-12 rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                      petsAllowed
                        ? "bg-[var(--color-accent)]"
                        : "bg-[var(--color-border-emphasized)]"
                    }`}
                  >
                    <span
                      className={`block h-5 w-5 rounded-full transition-transform ${
                        petsAllowed
                          ? "translate-x-5 bg-white"
                          : "translate-x-0 bg-white"
                      }`}
                    />
                  </button>
                </div>

                <StandardInput
                  label="รายละเอียดนโยบายสัตว์เลี้ยง"
                  optionalText="ไม่บังคับ"
                  placeholder="เช่น รับน้องหมา/แมว ไม่เกิน 10 กก. ค่าบริการ 300 บาท/คืน"
                  value={petPolicyTh}
                  onChange={(e) => setPetPolicyTh(e.target.value)}
                />
              </div>
            </div>

            {/* Common Questions (FAQ) Editor */}
            <div className="py-8 space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-[20px] font-semibold text-[var(--color-text-primary)]">
                    คำถามที่พบบ่อย (Common Questions / FAQ)
                  </h2>
                  <p className="text-[13px] text-[var(--color-text-secondary)]">
                    ช่วยลดคำถามซ้ำในแชท LINE และระบบสร้าง Schema.org FAQPage ให้ติด Google SEO อัตโนมัติ
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setFaqs((prev) => [...prev, { qTh: "", aTh: "" }])
                  }
                  className="h-9 px-3.5 rounded-[10px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[13px] font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>เพิ่มคำถามเอง</span>
                </button>
              </div>

              {/* 1-Click Thai Resort FAQ Templates */}
              <div className="space-y-2">
                <span className="text-[13px] font-semibold text-[var(--color-text-secondary)] block">
                  แตะเพื่อเพิ่มจากคำถามยอดฮิตของที่พักไทย:
                </span>
                <div className="flex flex-wrap gap-2">
                  {FAQ_TEMPLATES.map((tpl) => {
                    const exists = faqs.some((f) => f.qTh === tpl.qTh);
                    return (
                      <button
                        key={tpl.qTh}
                        type="button"
                        disabled={exists}
                        onClick={() => setFaqs((prev) => [...prev, { ...tpl }])}
                        className={`h-8 px-3 rounded-[9px] text-[13px] font-semibold transition-colors ${
                          exists
                            ? "bg-[var(--color-background-muted)] text-[var(--color-text-disabled)] cursor-not-allowed"
                            : "bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] cursor-pointer"
                        }`}
                      >
                        {exists ? "✓ " : "+ "}
                        {tpl.qTh}
                      </button>
                    );
                  })}
                </div>
              </div>

              {faqs.length === 0 ? (
                <div className="rounded-[14px] bg-[var(--color-background-muted)] p-6 text-center text-[14px] text-[var(--color-text-secondary)]">
                  ยังไม่มีคำถามที่พบบ่อย — เลือกจากคำถามยอดฮิตด้านบนหรือกด “เพิ่มคำถามเอง” ได้เลยครับ
                </div>
              ) : (
                <div className="divide-y divide-[var(--color-border)]">
                  {faqs.map((faq, idx) => (
                    <div key={idx} className="py-5 first:pt-0 space-y-3">
                      <div className="flex items-start gap-2.5">
                        <div className="flex-1 min-w-0 space-y-3">
                          <StandardInput
                            label={`คำถาม #${idx + 1}`}
                            placeholder="เช่น มีอาหารเช้าให้ไหม?"
                            value={faq.qTh}
                            onChange={(e) =>
                              setFaqs((prev) =>
                                prev.map((item, i) =>
                                  i === idx
                                    ? { ...item, qTh: e.target.value }
                                    : item
                                )
                              )
                            }
                          />
                          <StandardTextarea
                            label={`คำตอบ #${idx + 1}`}
                            rows={2}
                            placeholder="คำตอบสำหรับผู้เข้าพัก..."
                            value={faq.aTh}
                            onChange={(e) =>
                              setFaqs((prev) =>
                                prev.map((item, i) =>
                                  i === idx
                                    ? { ...item, aTh: e.target.value }
                                    : item
                                )
                              )
                            }
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setFaqs((prev) => prev.filter((_, i) => i !== idx))
                          }
                          aria-label="ลบคำถาม"
                          className="h-10 w-10 rounded-[10px] hover:bg-[var(--color-background-muted)] text-[var(--color-text-secondary)] hover:text-[var(--color-error)] inline-flex items-center justify-center cursor-pointer transition-colors shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={isSavingHotel}
                  className="h-11 px-6 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] text-[14px] font-semibold inline-flex items-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingHotel ? "กำลังบันทึก..." : "บันทึกกฎ & คำถามที่พบบ่อย"}</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* =================================================================
            SECTION 6: DIRECT 0% GP PAYOUT & CONTACT CHANNELS
        ================================================================== */}
        {section === "payout" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void saveHotelPatch(
                {
                  promptPayId: promptPayId.trim(),
                  promptPayAccountName: promptPayAccountName.trim(),
                  bankName: bankName.trim(),
                  bankAccountNo: bankAccountNo.trim(),
                  contactPhone: contactPhone.trim(),
                  contactLine: contactLine.trim(),
                  facebookPageUrl: facebookPageUrl.trim(),
                  instagramUrl: instagramUrl.trim(),
                  isPublished,
                },
                "บันทึกบัญชีรับเงิน 0% GP และช่องทางติดต่อแล้ว"
              );
            }}
            className="divide-y divide-[var(--color-border)]"
          >
            <div className="pb-8 space-y-5">
              <div className="pb-5 border-b border-[var(--color-border)]">
                <h2 className="text-[24px] sm:text-[26px] font-semibold tracking-[-0.02em] text-[var(--color-text-primary)]">
                  รับเงิน 0% GP & ช่องทางติดต่อ
                </h2>
              </div>

              <StandardFieldGroup>
                <div className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x divide-y sm:divide-y-0 divide-[#b0b0b0] dark:divide-[var(--color-border-emphasized)]">
                  <StandardInput
                    grouped
                    label="เบอร์โทร / เลขประจำตัวผู้เสียภาษี PromptPay *"
                    required
                    placeholder="0812345678 หรือ 0105561000001"
                    value={promptPayId}
                    onChange={(e) => setPromptPayId(e.target.value)}
                  />
                  <StandardInput
                    grouped
                    label="ชื่อบัญชีรับเงิน (แสดงบนหน้าจ่ายเงิน) *"
                    required
                    placeholder="เช่น บจก. สะปัน อันซีน รีสอร์ท"
                    value={promptPayAccountName}
                    onChange={(e) => setPromptPayAccountName(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x divide-y sm:divide-y-0 divide-[#b0b0b0] dark:divide-[var(--color-border-emphasized)]">
                  <StandardInput
                    grouped
                    label="ชื่อธนาคาร (สำรอง)"
                    optionalText="ไม่บังคับ"
                    placeholder="เช่น กสิกรไทย (KBank)"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                  />
                  <StandardInput
                    grouped
                    label="เลขที่บัญชีธนาคาร (สำรอง)"
                    optionalText="ไม่บังคับ"
                    placeholder="เช่น 123-4-56789-0"
                    value={bankAccountNo}
                    onChange={(e) => setBankAccountNo(e.target.value)}
                  />
                </div>
              </StandardFieldGroup>
            </div>

            <div className="py-8 space-y-5">
              <div className="space-y-0.5">
                <h2 className="text-[20px] font-semibold text-[var(--color-text-primary)]">
                  ช่องทางติดต่อตรง & สถานะหน้าร้าน
                </h2>
                <p className="text-[13px] text-[var(--color-text-secondary)]">
                  ระบบเก็บสถิติจำนวนคนกดทักทุกช่องทางให้ดูในหน้า “วันนี้”
                </p>
              </div>

              <StandardFieldGroup>
                <div className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x divide-y sm:divide-y-0 divide-[#b0b0b0] dark:divide-[var(--color-border-emphasized)]">
                  <StandardInput
                    grouped
                    label="เบอร์โทรศัพท์"
                    placeholder="08X-XXX-XXXX"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                  />
                  <StandardInput
                    grouped
                    label="LINE OA / LINE ID"
                    placeholder="@yourresort"
                    value={contactLine}
                    onChange={(e) => setContactLine(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x divide-y sm:divide-y-0 divide-[#b0b0b0] dark:divide-[var(--color-border-emphasized)]">
                  <StandardInput
                    grouped
                    label="Facebook Page URL"
                    placeholder="https://facebook.com/yourresort"
                    value={facebookPageUrl}
                    onChange={(e) => setFacebookPageUrl(e.target.value)}
                  />
                  <StandardInput
                    grouped
                    label="Instagram URL"
                    placeholder="https://instagram.com/yourresort"
                    value={instagramUrl}
                    onChange={(e) => setInstagramUrl(e.target.value)}
                  />
                </div>
              </StandardFieldGroup>

              <div className="pt-2 flex items-center justify-between gap-4 rounded-[14px] bg-[var(--color-background-muted)] p-4">
                <div>
                  <p className="text-[14px] font-semibold text-[var(--color-text-primary)]">
                    เผยแพร่หน้าร้านบน Nondii
                  </p>
                  <p className="text-[13px] text-[var(--color-text-secondary)]">
                    ปิดสวิตช์หากต้องการพักรับจองชั่วคราวโดยไม่ลบข้อมูล
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isPublished}
                  onClick={() => setIsPublished((v) => !v)}
                  className={`h-7 w-12 rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                    isPublished
                      ? "bg-[var(--color-accent)]"
                      : "bg-[var(--color-border-emphasized)]"
                  }`}
                >
                  <span
                    className={`block h-5 w-5 rounded-full transition-transform ${
                      isPublished
                        ? "translate-x-5 bg-white"
                        : "translate-x-0 bg-white"
                    }`}
                  />
                </button>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isSavingHotel}
                  className="h-11 px-6 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] text-[14px] font-semibold inline-flex items-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingHotel ? "กำลังบันทึก..." : "บันทึกบัญชี & ช่องทางติดต่อ"}</span>
                </button>
              </div>
            </div>
          </form>
        )}
        </div>
      </WorkspaceSplitLayout>

      {/* =====================================================================
          ROOM FULL EDITOR MODAL — Multi-Page Drill-Down Inside ONE Modal
          Page 1 ("details"): Room Info, Pricing, Steppers, Amenities
          Page 2 ("photos"): Embedded RoomPhotoStudio (with `←` Back button!)
      ====================================================================== */}
      <StudioSheetModal
        isOpen={isRoomModalOpen}
        onClose={() => setIsRoomModalOpen(false)}
        onBack={roomModalPage === "photos" ? handleRoomModalBack : undefined}
        backLabel="กลับไปหน้าข้อมูลห้อง"
        bodyRef={roomModalBodyRef}
        title={
          roomModalPage === "photos"
            ? photoHeader?.title || `ทัวร์รูปภาพ · ${rmNameTh || rmCode}`
            : editingRoomId
            ? `แก้ไขห้องพัก · ${rmNameTh || rmCode}`
            : "เพิ่มประเภทห้องพักใหม่"
        }
        subtitle={
          roomModalPage === "photos"
            ? photoHeader?.subtitle || `${rmPhotos.length} รูป`
            : "จัดหมวดหมู่ชัดเจน อัปเดตขึ้นหน้าร้านและปฏิทินทันทีที่บันทึก"
        }
        maxWidthClass="md:max-w-[780px]"
        heightClass="h-[90dvh] md:h-[84dvh]"
        footer={
          roomModalPage === "photos" ? (
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleRoomModalBack}
                className="h-10 px-4 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[14px] font-semibold text-[var(--color-text-primary)] inline-flex items-center gap-2 cursor-pointer transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>
                  {photoHeader && photoHeader.level === "detail"
                    ? "กลับไปดูรูปทั้งหมด"
                    : "กลับหน้าข้อมูลห้อง"}
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setRoomModalDir("back");
                  setRoomModalPage("details");
                  roomModalBodyRef.current?.scrollTo({ top: 0 });
                }}
                className="h-10 px-5 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] text-[14px] font-semibold cursor-pointer transition-colors"
              >
                เสร็จสิ้น
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              {editingRoomId ? (
                <button
                  type="button"
                  onClick={() => handleDeleteRoom(editingRoomId)}
                  className="text-[14px] font-semibold text-[var(--color-error)] underline underline-offset-2 cursor-pointer"
                >
                  ลบห้องพักนี้
                </button>
              ) : (
                <span />
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsRoomModalOpen(false)}
                  className="h-11 px-5 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[14px] font-semibold text-[var(--color-text-primary)] cursor-pointer transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  form="studio-room-editor-form"
                  disabled={isSavingRoom || isUploadingRoomPhoto}
                  className="h-11 px-6 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] text-[14px] font-semibold cursor-pointer transition-colors disabled:opacity-50"
                >
                  {isSavingRoom ? "กำลังบันทึก..." : "บันทึกห้องพัก"}
                </button>
              </div>
            </div>
          )
        }
      >
        {roomModalPage === "photos" ? (
          <div
            key="modal-page-photos"
            className={
              roomModalDir === "back"
                ? "animate-studio-panel-back"
                : "animate-studio-panel-forward"
            }
          >
            <RoomPhotoStudio
              embedded
              hotelSlug={hotel.slug}
              room={{
                id: editingRoomId ?? "",
                code: rmCode || "NEW",
                nameTh: rmNameTh || rmCode || "ห้องพักใหม่",
                galleryUrls: rmPhotos.map((p) => p.url),
                galleryMetaJson: rmPhotos,
              }}
              controlledPhotos={rmPhotos}
              onControlledPhotosChange={setRmPhotos}
              onHeaderStateChange={setPhotoHeader}
              stepBackRef={photoStepBackRef}
              onBack={handleRoomModalBack}
              onReload={onReload}
              onNotify={onNotify}
            />
          </div>
        ) : (
        <form
          key="modal-page-details"
          id="studio-room-editor-form"
          onSubmit={handleSaveRoom}
          className={`divide-y divide-[var(--color-border)] ${
            roomModalDir === "back" ? "animate-studio-panel-back" : ""
          }`}
        >
          {/* 1. PHOTOS — Unmistakable Airbnb Visual Photo Stage & Dropzone */}
          <section className="pb-7 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-[15px] font-semibold text-[var(--color-text-primary)]">
                  รูปภาพห้องพัก ({rmPhotos.length}/{MAX_PHOTOS_PER_ROOM})
                </h3>
                <p className="text-[13px] text-[var(--color-text-secondary)]">
                  รูปแรกจะแสดงเป็นภาพปกบนหน้าร้าน · ระบบย่อไฟล์อัตโนมัติและให้ AI ช่วยจัดหมวดพื้นที่
                </p>
              </div>
              {rmPhotos.length > 0 && (
                <button
                  type="button"
                  onClick={openModalPhotoPage}
                  className="h-9 px-3.5 rounded-[10px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[13px] font-semibold text-[var(--color-text-primary)] inline-flex items-center gap-1.5 cursor-pointer transition-colors shrink-0"
                >
                  <Images className="w-4 h-4" />
                  <span>จัดการทัวร์รูป & SEO</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Live Upload Progress Bar */}
            {rmUploadProgress && (
              <div className="rounded-[14px] bg-[var(--color-background-muted)] p-3.5 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[13px] font-medium text-[var(--color-text-primary)] tabular-nums">
                    กำลังย่อไฟล์และให้ AI ตรวจภาพ {rmUploadProgress.done} /{" "}
                    {rmUploadProgress.total} รูป
                    {rmUploadProgress.passed > 0
                      ? ` · ผ่าน ${rmUploadProgress.passed}`
                      : ""}
                    {rmUploadProgress.skipped > 0
                      ? ` · ข้าม ${rmUploadProgress.skipped}`
                      : ""}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      cancelRoomUploadRef.current = true;
                    }}
                    className="text-[13px] font-semibold text-[var(--color-text-secondary)] underline underline-offset-2 hover:text-[var(--color-text-primary)] cursor-pointer shrink-0"
                  >
                    หยุดที่เหลือ
                  </button>
                </div>
                <div className="h-1.5 w-full rounded-full bg-[var(--color-background-subtle)] overflow-hidden">
                  <div
                    className="h-full bg-[var(--color-accent)] transition-all duration-300"
                    style={{
                      width: `${Math.max(
                        8,
                        Math.round(
                          (rmUploadProgress.done /
                            Math.max(1, rmUploadProgress.total)) *
                            100
                        )
                      )}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Empty State: Unmistakable Visual Photo Dropzone */}
            {rmPhotos.length === 0 ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingModalPhotos(true);
                }}
                onDragLeave={() => setIsDraggingModalPhotos(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingModalPhotos(false);
                  const dropped = Array.from(e.dataTransfer.files ?? []).filter(
                    (f) => f.type.startsWith("image/")
                  );
                  void processRoomPhotoFiles(dropped);
                }}
                className={`rounded-[16px] p-6 sm:p-7 text-center space-y-4 transition-colors ${
                  isDraggingModalPhotos
                    ? "bg-[var(--color-background-subtle)] ring-2 ring-[#222222] dark:ring-[#f5f5f5]"
                    : "bg-[var(--color-background-muted)]/75"
                }`}
              >
                {/* Clean Airbnb-style 3-frame visual gallery icon */}
                <div
                  aria-hidden="true"
                  className="mx-auto flex items-end justify-center gap-2 pt-1"
                >
                  <div className="w-11 h-11 aspect-square rounded-[12px] bg-[var(--color-background-card)] -rotate-6 flex items-center justify-center text-[var(--color-text-tertiary)]">
                    <BedDouble className="w-4 h-4 stroke-[1.6]" />
                  </div>
                  <div className="w-14 h-14 aspect-square rounded-[14px] bg-[var(--color-background-card)] flex items-center justify-center text-[var(--color-text-primary)] z-10">
                    <Images className="w-6 h-6 stroke-[1.6]" />
                  </div>
                  <div className="w-11 h-11 aspect-square rounded-[12px] bg-[var(--color-background-card)] rotate-6 flex items-center justify-center text-[var(--color-text-tertiary)]">
                    <Upload className="w-4 h-4 stroke-[1.6]" />
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-[15px] font-semibold text-[var(--color-text-primary)]">
                    ลากรูปห้องพักมาวางที่นี่ หรือกดอัปโหลดรูปภาพ
                  </p>
                  <p className="text-[13px] text-[var(--color-text-secondary)]">
                    อัปโหลดได้ครั้งละสูงสุด {MAX_UPLOAD_BATCH_FILES} รูป (ไม่เกิน{" "}
                    {MAX_PHOTOS_PER_ROOM} รูป/ห้อง · สูงสุด 25 MB/รูป)
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                  <label className="h-10 px-5 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] text-[14px] font-semibold inline-flex items-center gap-2 cursor-pointer transition-colors">
                    <Upload className="w-4 h-4" />
                    <span>
                      {isUploadingRoomPhoto
                        ? "กำลังอัปโหลด..."
                        : "เลือกรูปภาพห้องพัก"}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      disabled={isUploadingRoomPhoto}
                      className="sr-only"
                      onChange={handleRoomPhotosUpload}
                    />
                  </label>

                  <button
                    type="button"
                    onClick={openModalPhotoPage}
                    className="h-10 px-4 rounded-[12px] bg-[var(--color-background-card)] hover:bg-[var(--color-background-subtle)] text-[14px] font-semibold text-[var(--color-text-primary)] inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <span>เปิดทัวร์รูป & SEO</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              /* Populated State: Airbnb Mini Visual Collage + Quick Add */
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingModalPhotos(true);
                }}
                onDragLeave={() => setIsDraggingModalPhotos(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingModalPhotos(false);
                  const dropped = Array.from(e.dataTransfer.files ?? []).filter(
                    (f) => f.type.startsWith("image/")
                  );
                  void processRoomPhotoFiles(dropped);
                }}
                className={`space-y-3 rounded-[16px] transition ${
                  isDraggingModalPhotos
                    ? "ring-2 ring-[#222222] dark:ring-[#f5f5f5] p-1"
                    : ""
                }`}
              >
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {/* Large Cover Photo Tile */}
                  <div className="relative col-span-2 row-span-2 aspect-square rounded-[20px] overflow-hidden bg-[var(--color-background-muted)] group">
                    <button
                      type="button"
                      onClick={openModalPhotoPage}
                      className="w-full h-full block cursor-pointer"
                    >
                      <img
                        src={rmPhotos[0].url}
                        alt={rmPhotos[0].captionTh || "ภาพปกห้องพัก"}
                        className="w-full h-full object-cover group-hover:brightness-[0.94] transition"
                      />
                    </button>
                    <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-[7px] bg-white/94 dark:bg-[#222222]/92 backdrop-blur-sm text-[12px] font-semibold text-[var(--color-text-primary)] inline-flex items-center gap-1 pointer-events-none">
                      <Star className="w-3 h-3 fill-current" />
                      ภาพปกหลัก
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setRmPhotos((prev) => prev.filter((_, i) => i !== 0))
                      }
                      aria-label="ลบรูปปก"
                      className="absolute top-2.5 right-2.5 h-7 w-7 rounded-[8px] bg-[#222222]/80 !text-white inline-flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Up to 4 Secondary Preview Tiles */}
                  {rmPhotos.slice(1, 5).map((photo, offsetIdx) => {
                    const realIdx = offsetIdx + 1;
                    const remainingExtra =
                      realIdx === 4 && rmPhotos.length > 5
                        ? rmPhotos.length - 5
                        : 0;
                    return (
                      <div
                        key={`${photo.url}-${realIdx}`}
                        className="relative aspect-square rounded-[16px] overflow-hidden bg-[var(--color-background-muted)] group"
                      >
                        <button
                          type="button"
                          onClick={openModalPhotoPage}
                          className="w-full h-full block cursor-pointer"
                        >
                          <img
                            src={photo.url}
                            alt={photo.captionTh || `Room ${realIdx + 1}`}
                            className="w-full h-full object-cover group-hover:brightness-[0.94] transition"
                          />
                          {remainingExtra > 0 && (
                            <span className="absolute inset-0 bg-black/50 text-white text-[15px] font-semibold flex items-center justify-center">
                              +{remainingExtra} รูป
                            </span>
                          )}
                        </button>
                        {remainingExtra === 0 && (
                          <button
                            type="button"
                            onClick={() =>
                              setRmPhotos((prev) =>
                                prev.filter((_, i) => i !== realIdx)
                              )
                            }
                            aria-label="ลบรูป"
                            className="absolute top-1.5 right-1.5 h-6 w-6 rounded-[7px] bg-[#222222]/80 !text-white inline-flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}

                  {/* Fill Remaining Slot with Quick Add Tile when < 5 photos */}
                  {rmPhotos.length < 5 && (
                    <label className="aspect-square rounded-[16px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] flex flex-col items-center justify-center gap-1 text-[var(--color-text-secondary)] cursor-pointer transition-colors">
                      <Plus className="w-5 h-5" />
                      <span className="text-[12px] font-medium">เพิ่มรูป</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        disabled={isUploadingRoomPhoto}
                        className="sr-only"
                        onChange={handleRoomPhotosUpload}
                      />
                    </label>
                  )}
                </div>

                {/* Clean Action Bar under Collage */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <p className="text-[13px] text-[var(--color-text-secondary)]">
                    คลิกที่รูปเพื่อจัดเรียง แยกโซนห้อง หรือแก้ไขคำอธิบาย SEO
                  </p>
                  {rmPhotos.length < MAX_PHOTOS_PER_ROOM && (
                    <label className="h-9 px-3.5 rounded-[10px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[13px] font-semibold text-[var(--color-text-primary)] inline-flex items-center gap-1.5 cursor-pointer transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      <span>
                        {isUploadingRoomPhoto
                          ? "กำลังอัปโหลด..."
                          : `เพิ่มรูปภาพ (${rmPhotos.length}/${MAX_PHOTOS_PER_ROOM})`}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        disabled={isUploadingRoomPhoto}
                        className="sr-only"
                        onChange={handleRoomPhotosUpload}
                      />
                    </label>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* 2. ROOM IDENTITY (Auto System Code · System Category Dropdown) */}
          <section className="py-7 space-y-4">
            <div className="space-y-0.5">
              <h3 className="text-[15px] font-semibold text-[var(--color-text-primary)]">
                ข้อมูลพื้นฐานห้องพัก
              </h3>
              <p className="text-[13px] text-[var(--color-text-secondary)]">
                ตั้งชื่อห้องให้จดจำง่าย และเลือกหมวดหมู่ที่ตรงกับประเภทห้องพัก
              </p>
            </div>

            <StandardFieldGroup>
              <div className="grid grid-cols-1 sm:grid-cols-5 sm:divide-x divide-y sm:divide-y-0 divide-[#b0b0b0] dark:divide-[var(--color-border-emphasized)]">
                <div className="sm:col-span-3">
                  <StandardInput
                    grouped
                    label="ชื่อห้องพัก (ภาษาไทย) *"
                    required
                    placeholder="เช่น พูลวิลล่า 2 ห้องนอน วิวทะเล"
                    value={rmNameTh}
                    onChange={(e) => setRmNameTh(e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <StandardSelectField
                    grouped
                    label="หมวดหมู่ห้อง"
                    value={rmCategoryTh}
                    onChange={setRmCategoryTh}
                    options={SYSTEM_ROOM_CATEGORIES.map((c) => ({
                      value: c.value,
                      label: c.label,
                      description: c.description,
                    }))}
                  />
                </div>
              </div>
              <StandardInput
                grouped
                label="ชื่อห้องพัก (English)"
                optionalText="ไม่บังคับ"
                placeholder="e.g. Seaview Pool Villa"
                value={rmNameEn}
                onChange={(e) => setRmNameEn(e.target.value)}
              />
            </StandardFieldGroup>

            <StandardTextarea
              label="คำอธิบายสั้นประจำห้อง"
              optionalText="ไม่บังคับ"
              rows={2}
              placeholder="เช่น ห้องพักวิวทะเลพร้อมระเบียงกว้างและอ่างอาบน้ำกลางแจ้ง"
              value={rmDescTh}
              onChange={(e) => setRmDescTh(e.target.value)}
            />
          </section>

          {/* 3. PRICING & INVENTORY */}
          <section className="py-7 space-y-4">
            <div className="space-y-0.5">
              <h3 className="text-[15px] font-semibold text-[var(--color-text-primary)]">
                ราคาและจำนวนห้องพัก
              </h3>
              <p className="text-[13px] text-[var(--color-text-secondary)]">
                ราคาพื้นฐานต่อคืน (สามารถตั้งราคาเทศกาลเพิ่มเติมได้ในหน้าฤดูกาลและปฏิทิน)
              </p>
            </div>

            <StandardFieldGroup>
              <div className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x divide-y sm:divide-y-0 divide-[#b0b0b0] dark:divide-[var(--color-border-emphasized)]">
                <StandardInput
                  grouped
                  label="ราคาวันธรรมดา (จ.–พฤ.) *"
                  prefixText="฿"
                  type="number"
                  min={100}
                  value={rmWeekdayPrice}
                  onChange={(e) => setRmWeekdayPrice(Number(e.target.value))}
                  className="font-semibold tabular-nums"
                />
                <StandardInput
                  grouped
                  label="ราคาคืนศุกร์–เสาร์ *"
                  prefixText="฿"
                  type="number"
                  min={100}
                  value={rmWeekendPrice}
                  onChange={(e) => setRmWeekendPrice(Number(e.target.value))}
                  className="font-semibold tabular-nums"
                />
              </div>
              <StandardInput
                grouped
                label="ค่าผู้เข้าพักเสริม (บาท / คน / คืน)"
                optionalText="ใส่ 0 หากไม่คิดเพิ่ม"
                prefixText="฿"
                type="number"
                min={0}
                value={rmExtraGuestPrice}
                onChange={(e) => setRmExtraGuestPrice(Number(e.target.value))}
                className="font-semibold tabular-nums"
              />
            </StandardFieldGroup>

            <div className="pt-1">
              <StandardStepperRow
                label="จำนวนห้องพักแบบนี้ทั้งหมด (ยูนิต)"
                description="จำนวนห้องที่เปิดรับจองได้พร้อมกันในวันเดียวกัน"
                value={rmTotalUnits}
                min={1}
                max={100}
                onChange={setRmTotalUnits}
              />
            </div>
          </section>

          {/* 4. SPACE & CAPACITY (Airbnb Counter Steppers — Screenshot 5!) */}
          <section className="py-7 space-y-4">
            <div className="space-y-0.5">
              <h3 className="text-[15px] font-semibold text-[var(--color-text-primary)]">
                ขนาดห้องและความจุผู้เข้าพัก
              </h3>
              <p className="text-[13px] text-[var(--color-text-secondary)]">
                แสดงข้อมูลสเปกบนหน้าเลือกห้องพักเพื่อให้ลูกค้าตัดสินใจได้ง่ายขึ้น
              </p>
            </div>

            <div className="divide-y divide-[var(--color-border-subtle)]">
              <StandardStepperRow
                label="จำนวนห้องนอน"
                value={rmBedrooms}
                min={0}
                max={20}
                onChange={setRmBedrooms}
              />
              <StandardStepperRow
                label="จำนวนเตียงนอน"
                value={rmBeds}
                min={1}
                max={30}
                onChange={setRmBeds}
              />
              <StandardStepperRow
                label="จำนวนห้องน้ำ"
                value={rmBathrooms}
                min={1}
                max={20}
                onChange={setRmBathrooms}
              />
              <StandardStepperRow
                label="จำนวนผู้เข้าพักมาตรฐาน (รวมในราคาห้อง)"
                value={rmStandardGuests}
                min={1}
                max={20}
                onChange={(next) => {
                  setRmStandardGuests(next);
                  if (rmMaxGuests < next) setRmMaxGuests(next);
                }}
              />
              <StandardStepperRow
                label="จำนวนผู้เข้าพักสูงสุด"
                description="รวมผู้เข้าพักเสริมที่สามารถพักได้"
                value={rmMaxGuests}
                min={1}
                max={30}
                onChange={setRmMaxGuests}
              />
            </div>

            <div className="pt-2 max-w-[260px]">
              <StandardInput
                label="ขนาดพื้นที่ห้อง"
                suffixText="ตร.ม."
                type="number"
                min={5}
                value={rmSizeSqm}
                onChange={(e) => setRmSizeSqm(Number(e.target.value))}
                className="font-semibold tabular-nums"
              />
            </div>
          </section>

          {/* 5. RULES & AMENITIES (Curated + Custom up to 25 items) */}
          <section className="pt-7 space-y-5">
            <div className="space-y-0.5">
              <h3 className="text-[15px] font-semibold text-[var(--color-text-primary)]">
                สิทธิ์และสิ่งอำนวยความสะดวก ({rmAmenities.length}/
                {MAX_ROOM_AMENITIES})
              </h3>
              <p className="text-[13px] text-[var(--color-text-secondary)]">
                เลือกจากรายการมาตรฐาน หรือเพิ่มสิ่งอำนวยความสะดวกเฉพาะของห้องได้สูงสุด{" "}
                {MAX_ROOM_AMENITIES} รายการ
              </p>
            </div>

            <div className="py-2 flex items-center justify-between gap-4">
              <div>
                <p className="text-[15px] font-medium text-[var(--color-text-primary)]">
                  อนุญาตให้นำสัตว์เลี้ยงเข้าพักในห้องนี้
                </p>
                <p className="text-[13px] text-[var(--color-text-secondary)]">
                  แสดงสัญลักษณ์ Pet-Friendly ประจำห้องนี้
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={rmPetsAllowed}
                onClick={() => setRmPetsAllowed((v) => !v)}
                className={`h-7 w-12 rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                  rmPetsAllowed
                    ? "bg-[var(--color-accent)]"
                    : "bg-[var(--color-border-emphasized)]"
                }`}
              >
                <span
                  className={`block h-5 w-5 rounded-full transition-transform ${
                    rmPetsAllowed
                      ? "translate-x-5 bg-white"
                      : "translate-x-0 bg-white"
                  }`}
                />
              </button>
            </div>

            {/* Render BOTH Curated Amenities AND Owner's Custom Added Amenities */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                ...CURATED_AMENITIES,
                ...rmAmenities.filter((am) => !CURATED_AMENITIES.includes(am)),
              ].map((am) => {
                const selected = rmAmenities.includes(am);
                const isCustom = !CURATED_AMENITIES.includes(am);
                const meta = getFacilityIconMeta(am);
                const Icon = meta.Icon;
                return (
                  <button
                    key={am}
                    type="button"
                    onClick={() => {
                      if (selected) {
                        setRmAmenities((prev) => prev.filter((x) => x !== am));
                      } else if (rmAmenities.length >= MAX_ROOM_AMENITIES) {
                        onNotify(
                          `เลือกสิ่งอำนวยความสะดวกได้สูงสุด ${MAX_ROOM_AMENITIES} รายการต่อห้อง`
                        );
                      } else {
                        setRmAmenities((prev) => [...prev, am]);
                      }
                    }}
                    className={`px-3.5 py-2.5 rounded-full text-left flex items-center justify-between gap-2 text-[13px] font-medium cursor-pointer transition-colors ${
                      selected
                        ? "bg-[var(--color-accent)] !text-[var(--color-on-accent)]"
                        : "bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)]"
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      {selected ? (
                        <Check className="w-4 h-4 shrink-0" />
                      ) : (
                        <Icon className="w-4 h-4 shrink-0" />
                      )}
                      <span className="truncate">{am}</span>
                    </span>
                    {isCustom && <X className="w-3.5 h-3.5 shrink-0 opacity-75" />}
                  </button>
                );
              })}
            </div>

            {/* Custom Amenity Input (Unified Airbnb Field) */}
            <div className="flex items-stretch gap-2.5">
              <div className="flex-1 min-w-0">
                <StandardInput
                  label="เพิ่มสิ่งอำนวยความสะดวกอื่น"
                  optionalText={`${rmAmenities.length}/${MAX_ROOM_AMENITIES} · กด Enter หรือปุ่มเพิ่ม`}
                  value={rmCustomAmenity}
                  onChange={(e) => setRmCustomAmenity(e.target.value)}
                  placeholder="เช่น คาราโอเกะ, โต๊ะพูล, อ่างแช่น้ำอุ่น"
                  disabled={rmAmenities.length >= MAX_ROOM_AMENITIES}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && rmCustomAmenity.trim()) {
                      e.preventDefault();
                      handleAddCustomAmenity();
                    }
                  }}
                />
              </div>
              <button
                type="button"
                disabled={
                  !rmCustomAmenity.trim() ||
                  rmAmenities.length >= MAX_ROOM_AMENITIES
                }
                onClick={handleAddCustomAmenity}
                className="min-h-[56px] px-5 rounded-[12px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[14px] font-semibold text-[var(--color-text-primary)] cursor-pointer disabled:opacity-45 transition-colors shrink-0"
              >
                เพิ่ม
              </button>
            </div>
          </section>
        </form>
        )}
      </StudioSheetModal>

      {/* =====================================================================
          ADD-ON CREATE / EDIT MODAL
      ====================================================================== */}
      <StudioSheetModal
        isOpen={isAddonModalOpen}
        onClose={() => setIsAddonModalOpen(false)}
        title={editingAddonId ? "แก้ไขบริการเสริม" : "เพิ่มบริการเสริมใหม่"}
        footer={
          <div className="flex items-center justify-between gap-2">
            {editingAddonId ? (
              <button
                type="button"
                onClick={() => handleDeleteAddon(editingAddonId)}
                className="text-[14px] font-semibold text-[var(--color-error)] underline underline-offset-2 cursor-pointer"
              >
                ลบบริการเสริม
              </button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAddonModalOpen(false)}
                className="h-11 px-5 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[14px] font-semibold cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                form="studio-addon-form"
                disabled={isSavingAddon || isUploadingAddon}
                className="h-11 px-6 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] text-[14px] font-semibold cursor-pointer disabled:opacity-50"
              >
                {isSavingAddon ? "กำลังบันทึก..." : "บันทึก"}
              </button>
            </div>
          </div>
        }
      >
        <form
          id="studio-addon-form"
          onSubmit={handleSaveAddon}
          className="space-y-4"
        >
          <StandardFieldGroup>
            <StandardInput
              grouped
              label="ชื่อบริการเสริม *"
              required
              placeholder="เช่น ชุดหมูกระทะริมระเบียง"
              value={adNameTh}
              onChange={(e) => setAdNameTh(e.target.value)}
            />
            <StandardInput
              grouped
              label="รายละเอียดสั้น"
              optionalText="ไม่บังคับ"
              placeholder="เช่น สำหรับ 2 ท่าน พร้อมผักสดและน้ำจิ้มสูตรเด็ด"
              value={adDescTh}
              onChange={(e) => setAdDescTh(e.target.value)}
            />
            <div className="grid grid-cols-2 divide-x divide-[#b0b0b0] dark:divide-[var(--color-border-emphasized)]">
              <StandardInput
                grouped
                label="ราคา (฿) *"
                prefixText="฿"
                type="number"
                min={0}
                required
                value={adPriceThb}
                onChange={(e) => setAdPriceThb(Number(e.target.value))}
                className="font-semibold tabular-nums"
              />
              <StandardInput
                grouped
                label="หน่วยนับ *"
                placeholder="ชุด / ท่าน / เที่ยว"
                value={adUnitLabelTh}
                onChange={(e) => setAdUnitLabelTh(e.target.value)}
              />
            </div>
          </StandardFieldGroup>

          <div className="space-y-2">
            <span className="text-[14px] font-semibold block">
              รูปประกอบบริการเสริม (ไม่บังคับ)
            </span>
            <div className="flex items-center gap-3">
              {adImageUrl && (
                <img
                  src={adImageUrl}
                  alt="Addon"
                  className="h-14 w-14 aspect-square rounded-[16px] object-cover bg-[var(--color-background-muted)] shrink-0"
                />
              )}
              <label className="h-10 px-4 rounded-[12px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[14px] font-semibold inline-flex items-center gap-2 cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>{isUploadingAddon ? "กำลังอัปโหลด..." : "อัปโหลดรูปภาพ"}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setIsUploadingAddon(true);
                    try {
                      const url = await uploadMediaFile(file, "rooms");
                      setAdImageUrl(url);
                    } finally {
                      setIsUploadingAddon(false);
                    }
                  }}
                />
              </label>
            </div>
          </div>

          {editingAddonId && (
            <div className="pt-1">
              <StandardCheckbox
                checked={adIsActive}
                onChange={setAdIsActive}
                label="เปิดให้ลูกค้าเลือกในหน้าจอง"
              />
            </div>
          )}
        </form>
      </StudioSheetModal>
    </>
  );
}
