import { prisma } from "@/lib/prisma";

export interface RawFacebookPostInput {
  externalPostId: string;
  message: string;
  imageUrl?: string | null;
  videoUrl?: string | null;
  permalinkUrl?: string | null;
}

export interface TriagedSocialResult {
  tier: 1 | 2 | 3;
  publishStatus: "PUBLISHED" | "PENDING_APPROVAL" | "DISCARDED";
  confidenceScore: number;
  triageNote: string;
  category: "ROOMS" | "VIEWS" | "VIDEOS" | "DINING" | "REVIEWS";
  extractedTitleTh: string;
  extractedStyles: string[];
  extractedTags: string[];
  promoSuggestionCode?: string;
}

const JUNK_OR_CLOSURE_KEYWORDS = [
  "ปิดปรับปรุง",
  "งดให้บริการ",
  "ปิดถนน",
  "น้ำท่วม",
  "ไฟดับ",
  "ขำๆ",
  "มุกตลก",
  "มีม",
  "ฮาๆ",
  "สวัสดีวันจันทร์",
  "หวย",
  "ข่าวด่วน",
  "แชร์ข่าว",
  "รับสมัครพนักงาน",
  "ปิดซ่อม",
];

const PROMO_GRAPHIC_KEYWORDS = [
  "โปรไฟไหม้",
  "ส่วนลด",
  "ลดทันที",
  "คูปอง",
  "โค้ดลด",
  "flash sale",
  "โปรโมชั่น",
  "เหลือเพียง",
];

const STAY_STYLE_KEYWORDS: ReadonlyArray<{
  style: string;
  keywords: string[];
}> = [
  { style: "mountain", keywords: ["หมอก", "ภูเขา", "ดอย", "เขาใหญ่", "สะปัน", "วิวเขา"] },
  { style: "pool-villa", keywords: ["พูลวิลล่า", "pool", "สระส่วนตัว", "สระว่ายน้ำ"] },
  { style: "sea", keywords: ["ทะเล", "ชายหาด", "เกาะ", "อันดามัน", "beach", "sea"] },
  { style: "bars", keywords: ["บาร์", "รูฟท็อป", "ค็อกเทล", "rooftop", "bar", "ไวน์"] },
  { style: "bathtub", keywords: ["อ่าง", "ออนเซ็น", "ตีฟอง", "bathtub", "onsen"] },
  { style: "glamping", keywords: ["แกลมปิ้ง", "โดม", "เต็นท์", "กางเต็นท์", "เคบิน"] },
];

export function classifyFacebookPostWithSmartTriage(
  post: RawFacebookPostInput,
  hotelDefaultStyles: string[]
): TriagedSocialResult {
  const text = (post.message || "").trim();
  const textLower = text.toLowerCase();
  const hasMedia = Boolean(post.imageUrl || post.videoUrl);

  // Tier 3: Jokes, news, staff recruitment, or temporary closure notices -> auto-discard
  const matchedJunk = JUNK_OR_CLOSURE_KEYWORDS.find((kw) =>
    textLower.includes(kw.toLowerCase())
  );
  if (!hasMedia || matchedJunk) {
    return {
      tier: 3,
      publishStatus: "DISCARDED",
      confidenceScore: matchedJunk ? 15 : 22,
      triageNote: matchedJunk
        ? `Tier 3 · ตรวจพบโพสต์ข่าว/ประกาศ/มีม ("${matchedJunk}") — คัดทิ้งอัตโนมัติ`
        : "Tier 3 · โพสต์ข้อความไม่มีรูปภาพ/วิดีโอที่พัก — คัดทิ้งอัตโนมัติ",
      category: "VIEWS",
      extractedTitleTh: text.slice(0, 72) || "โพสต์ที่ไม่เกี่ยวกับห้องพัก",
      extractedStyles: [],
      extractedTags: [],
    };
  }

  // Tier 2: Promo notice graphic -> hold out of feed & suggest coupon creation
  const matchedPromo = PROMO_GRAPHIC_KEYWORDS.find((kw) =>
    textLower.includes(kw.toLowerCase())
  );
  const codeMatch = text.match(/\b([A-Z0-9]{4,14})\b/);

  const detectedStyles = STAY_STYLE_KEYWORDS.filter((entry) =>
    entry.keywords.some((kw) => textLower.includes(kw.toLowerCase()))
  ).map((e) => e.style);

  const finalStyles =
    detectedStyles.length > 0 ? detectedStyles : hotelDefaultStyles.slice(0, 2);

  const category = post.videoUrl
    ? "VIDEOS"
    : textLower.includes("หมูกระทะ") ||
      textLower.includes("อาหาร") ||
      textLower.includes("กาแฟ") ||
      textLower.includes("ค็อกเทล")
    ? "DINING"
    : textLower.includes("ห้อง") || textLower.includes("วิลล่า")
    ? "ROOMS"
    : "VIEWS";

  const firstLine =
    text
      .split("\n")
      .map((l) => l.trim())
      .find(Boolean) || "บรรยากาศล่าสุดของที่พัก";

  if (matchedPromo && codeMatch) {
    return {
      tier: 2,
      publishStatus: "PENDING_APPROVAL",
      confidenceScore: 76,
      triageNote: `Tier 2 · ตรวจพบโพสต์โปรโมชั่น ("${matchedPromo}") แนะนำสร้างคูปองโค้ด ${codeMatch[1]} ในหน้าคูปอง`,
      category,
      extractedTitleTh: firstLine.slice(0, 90),
      extractedStyles: finalStyles,
      extractedTags: finalStyles,
      promoSuggestionCode: codeMatch[1],
    };
  }

  // Tier 1: High-confidence resort photo/video ready for 1-Click Approval
  return {
    tier: 1,
    publishStatus: "PENDING_APPROVAL",
    confidenceScore: 94,
    triageNote:
      "Tier 1 · ภาพถ่าย/วิดีโอที่พักคมชัด จัดหมวดสไตล์และพร้อมอนุมัติขึ้นเว็บใน 1 คลิก",
    category,
    extractedTitleTh: firstLine.slice(0, 90),
    extractedStyles: finalStyles,
    extractedTags: finalStyles,
  };
}

export async function runFacebookPageSyncBatch(params: {
  hotelId: string;
  posts: RawFacebookPostInput[];
}) {
  const { hotelId, posts } = params;

  const hotel = await prisma.hotel.findUnique({
    where: { id: hotelId },
    include: {
      rooms: { where: { isActive: true }, orderBy: { sortOrder: "asc" }, take: 1 },
    },
  });
  if (!hotel) throw new Error("ไม่พบข้อมูลที่พัก");

  const importedPins = [];
  for (const post of posts) {
    const triage = classifyFacebookPostWithSmartTriage(post, hotel.stayStyles);
    const coverUrl =
      post.imageUrl ||
      hotel.coverImageUrl ||
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1000&q=85";

    const upserted = await prisma.pin.upsert({
      where: {
        hotelId_sourcePlatform_externalPostId: {
          hotelId: hotel.id,
          sourcePlatform: "FACEBOOK",
          externalPostId: post.externalPostId,
        },
      },
      update: {
        aiConfidenceScore: triage.confidenceScore,
        aiTriageNote: triage.triageNote,
      },
      create: {
        hotelId: hotel.id,
        roomId: triage.tier === 1 ? hotel.rooms[0]?.id ?? null : null,
        mediaType: post.videoUrl ? "VIDEO" : "PHOTO",
        category: triage.category,
        titleTh: triage.extractedTitleTh,
        descriptionTh: post.message.slice(0, 500),
        coverImageUrl: coverUrl,
        mediaUrls: [coverUrl],
        videoUrl: post.videoUrl || null,
        aspectRatio: post.videoUrl ? "aspect-[9/16]" : "aspect-[4/5]",
        provinceId: hotel.provinceId,
        stayStyles: triage.extractedStyles,
        semanticTags: triage.extractedTags,
        sourcePlatform: "FACEBOOK",
        externalPostId: post.externalPostId,
        externalPermalink: post.permalinkUrl || null,
        publishStatus: triage.publishStatus,
        aiConfidenceScore: triage.confidenceScore,
        aiTriageNote: triage.triageNote,
      },
    });
    importedPins.push(upserted);
  }

  await prisma.socialConnection.updateMany({
    where: { hotelId: hotel.id, platform: "FACEBOOK" },
    data: { lastSyncedAt: new Date() },
  });

  return importedPins;
}

