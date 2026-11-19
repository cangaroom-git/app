export const MAX_PHOTOS_PER_ROOM = 20;
export const MAX_UPLOAD_BATCH_FILES = 10;
export const MAX_ROOM_AMENITIES = 25;

export const SYSTEM_ROOM_CATEGORIES: ReadonlyArray<{
  value: string;
  label: string;
  description: string;
}> = [
  {
    value: "ห้องพัก",
    label: "ห้องพัก (Standard / Deluxe)",
    description: "ห้องพักมาตรฐาน ห้องดีลักซ์ หรือห้องซูพีเรียร์",
  },
  {
    value: "ห้องสวีท",
    label: "ห้องสวีท (Suite)",
    description: "ห้องพักขนาดใหญ่พร้อมโซนนั่งเล่นแยกเป็นสัดส่วน",
  },
  {
    value: "พูลวิลล่า",
    label: "พูลวิลล่า (Pool Villa)",
    description: "วิลล่าพร้อมสระว่ายน้ำส่วนตัว",
  },
  {
    value: "วิลล่า",
    label: "วิลล่า / บังกะโล (Villa / Bungalow)",
    description: "บ้านพักแยกเป็นหลังพร้อมความเป็นส่วนตัว",
  },
  {
    value: "แกลมปิ้ง",
    label: "แกลมปิ้ง / เต็นท์โดม (Glamping)",
    description: "เต็นท์ติดแอร์ โดมใส หรือที่พักใกล้ชิดธรรมชาติ",
  },
  {
    value: "เคบิน",
    label: "เคบิน / บ้านไม้ (Cabin / A-Frame)",
    description: "บ้านไม้ บ้านทรงเอเฟรม หรือกระท่อมพักผ่อน",
  },
  {
    value: "ห้องครอบครัว",
    label: "ห้องครอบครัว (Family Room)",
    description: "ห้องพักสำหรับครอบครัวหรือกลุ่มเพื่อนหลายเตียง",
  },
  {
    value: "โฮมสเตย์",
    label: "บ้านพักเหมาหลัง / โฮมสเตย์",
    description: "บ้านพักสำหรับกลุ่มใหญ่หรือโฮมสเตย์ท้องถิ่น",
  },
];

export type RoomPhotoSpaceId =
  | "bedroom"
  | "bathroom"
  | "balcony"
  | "pool"
  | "living"
  | "exterior"
  | "additional";

export interface RoomPhotoMeta {
  url: string;
  space: RoomPhotoSpaceId;
  captionTh?: string;
}

export interface RoomPhotoSpaceDefinition {
  id: RoomPhotoSpaceId;
  labelTh: string;
  labelEn: string;
  descriptionTh: string;
  placeholderCaptionTh: string;
}

export const ROOM_PHOTO_SPACES: readonly RoomPhotoSpaceDefinition[] = [
  {
    id: "bedroom",
    labelTh: "ห้องนอน",
    labelEn: "Bedroom",
    descriptionTh: "เตียงนอน มุมพักผ่อน และแสงธรรมชาติในห้อง",
    placeholderCaptionTh:
      "เช่น เตียงคิงไซส์ผ้านวมนุ่มพร้อมหน้าต่างกระจกบานใหญ่รับวิวธรรมชาติยามเช้า",
  },
  {
    id: "bathroom",
    labelTh: "ห้องน้ำ & อ่างอาบน้ำ",
    labelEn: "Bathroom & tub",
    descriptionTh: "อ่างแช่น้ำ เรนชาวเวอร์ และของใช้ในห้องน้ำ",
    placeholderCaptionTh:
      "เช่น อ่างอาบน้ำทรงลอยตัวริมหน้าต่าง พร้อมน้ำอุ่นและอุปกรณ์อาบน้ำครบชุด",
  },
  {
    id: "balcony",
    labelTh: "ระเบียง & วิว",
    labelEn: "Balcony & view",
    descriptionTh: "วิวทะเล ภูเขา หรือระเบียงส่วนตัวสำหรับนั่งชิล",
    placeholderCaptionTh:
      "เช่น ระเบียงส่วนตัวชมวิวทะเล 180 องศา พร้อมชุดโต๊ะนั่งจิบกาแฟตอนเช้า",
  },
  {
    id: "pool",
    labelTh: "สระว่ายน้ำ",
    labelEn: "Pool",
    descriptionTh: "สระว่ายน้ำส่วนตัว จากุซซี่ หรือสระส่วนกลาง",
    placeholderCaptionTh:
      "เช่น สระว่ายน้ำส่วนตัวระบบเกลือติดระเบียงห้อง พร้อมเก้าอี้อาบแดด",
  },
  {
    id: "living",
    labelTh: "โซนนั่งเล่น / ครัว",
    labelEn: "Living & kitchen",
    descriptionTh: "โซฟา โต๊ะทานอาหาร มุมกาแฟ หรือแพนทรี",
    placeholderCaptionTh:
      "เช่น โซนนั่งเล่นโปร่งโล่งพร้อมสมาร์ททีวี มุมชงกาแฟดริป และตู้เย็นมินิบาร์",
  },
  {
    id: "exterior",
    labelTh: "ภายนอก & บรรยากาศ",
    labelEn: "Exterior & surroundings",
    descriptionTh: "ตัวอาคาร สวน รอบที่พัก หรือทางเข้าห้องพัก",
    placeholderCaptionTh:
      "เช่น บรรยากาศภายนอกวิลล่ารายล้อมด้วยสวนสีเขียวและทางเดินส่วนตัว",
  },
  {
    id: "additional",
    labelTh: "รูปเพิ่มเติม",
    labelEn: "Additional photos",
    descriptionTh: "มุมสวยอื่นๆ อาหารเช้า หรือรายละเอียดพิเศษ",
    placeholderCaptionTh:
      "เช่น เซตอาหารเช้าเสิร์ฟถึงห้องพักพร้อมผลไม้สดและกาแฟคั่วบด",
  },
] as const;

const VALID_SPACE_IDS = new Set<RoomPhotoSpaceId>(
  ROOM_PHOTO_SPACES.map((s) => s.id)
);

export function isValidRoomPhotoSpace(raw: unknown): raw is RoomPhotoSpaceId {
  return typeof raw === "string" && VALID_SPACE_IDS.has(raw as RoomPhotoSpaceId);
}

export function getRoomPhotoSpaceDef(
  spaceId?: string | null
): RoomPhotoSpaceDefinition {
  const found = ROOM_PHOTO_SPACES.find((s) => s.id === spaceId);
  return found ?? ROOM_PHOTO_SPACES[ROOM_PHOTO_SPACES.length - 1];
}

/**
 * Merges `galleryUrls` (canonical ordered array where index 0 = cover photo)
 * with optional `galleryMetaJson` metadata.
 */
export function normalizeRoomPhotos(
  galleryUrls: string[] | null | undefined,
  galleryMetaJson: unknown
): RoomPhotoMeta[] {
  const metaMap = new Map<string, { space: RoomPhotoSpaceId; captionTh?: string }>();
  const metaUrls: string[] = [];

  if (Array.isArray(galleryMetaJson)) {
    for (const item of galleryMetaJson) {
      if (!item || typeof item !== "object") continue;
      const rec = item as Record<string, unknown>;
      const url = typeof rec.url === "string" ? rec.url.trim() : "";
      if (!url) continue;
      const space: RoomPhotoSpaceId = isValidRoomPhotoSpace(rec.space)
        ? rec.space
        : "additional";
      const captionRaw =
        typeof rec.captionTh === "string" ? rec.captionTh.trim() : "";
      metaMap.set(url, {
        space,
        ...(captionRaw ? { captionTh: captionRaw.slice(0, 300) } : {}),
      });
      metaUrls.push(url);
    }
  }

  const orderedSource =
    Array.isArray(galleryUrls) && galleryUrls.length > 0 ? galleryUrls : metaUrls;

  const seen = new Set<string>();
  const result: RoomPhotoMeta[] = [];

  for (const rawUrl of orderedSource) {
    const url = typeof rawUrl === "string" ? rawUrl.trim() : "";
    if (!url || seen.has(url)) continue;
    seen.add(url);
    const meta = metaMap.get(url);
    result.push({
      url,
      space: meta?.space ?? "additional",
      ...(meta?.captionTh ? { captionTh: meta.captionTh } : {}),
    });
  }

  return result;
}

export function serializeRoomPhotos(photos: RoomPhotoMeta[]): {
  galleryUrls: string[];
  galleryMetaJson: RoomPhotoMeta[];
} {
  const seen = new Set<string>();
  const cleanMeta: RoomPhotoMeta[] = [];
  for (const p of photos) {
    const url = p.url.trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    const caption = p.captionTh?.trim().slice(0, 300);
    cleanMeta.push({
      url,
      space: isValidRoomPhotoSpace(p.space) ? p.space : "additional",
      ...(caption ? { captionTh: caption } : {}),
    });
  }
  return {
    galleryUrls: cleanMeta.map((p) => p.url),
    galleryMetaJson: cleanMeta,
  };
}

/**
 * Checks whether a room photo still needs AI categorization, Thai SEO captioning,
 * or WebP CDN compression (so AI never wastes time/credits re-processing completed photos).
 */
export function doesRoomPhotoNeedOptimization(photo: RoomPhotoMeta): boolean {
  const missingCaption = !photo.captionTh || photo.captionTh.trim().length < 8;
  const uncategorized = !photo.space || photo.space === "additional";
  const isUnoptimizedLocal = photo.url.startsWith("/uploads/");
  const isNonWebpCloudinary =
    photo.url.includes("res.cloudinary.com/") &&
    !photo.url.toLowerCase().includes(".webp");

  return (
    missingCaption ||
    uncategorized ||
    isUnoptimizedLocal ||
    isNonWebpCloudinary
  );
}
