import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdminApi } from "@/lib/admin/requireAdmin";
import { prisma } from "@/lib/prisma";
import { THAILAND_77_PROVINCES } from "@/data/thailandProvinces";

const ExtractRequestSchema = z.object({
  rawText: z.string().max(12000).optional().default(""),
  imageBase64: z.string().max(8_000_000).optional().nullable(),
  imageMimeType: z.string().max(100).optional().nullable(),
});

export interface ExtractedPromoPayload {
  brandNameTh: string;
  brandNameEn: string;
  locationScope: "SINGLE_LOCATION" | "MULTI_BRANCH" | "NATIONWIDE_ONLINE";
  branchSummaryTh: string;
  provinceId: string;
  promoCategoryCode: "STAY" | "CAFE" | "RESTAURANT" | "WELLNESS" | "ATTRACTION";
  titleTh: string;
  promoHeadlineTh: string;
  descriptionTh: string;
  promoCode: string;
  originalPriceThb: number | null;
  dealPriceThb: number | null;
  startsAt: string | null;
  expiresAt: string | null;
  externalUrl: string;
  suggestedVisualMode: "OFFICIAL_PHOTO" | "BRANDED_CARD";
  matchedHotel: {
    id: string;
    slug: string;
    nameTh: string;
    coverImageUrl: string | null;
    locationScope: "SINGLE_LOCATION" | "MULTI_BRANCH" | "NATIONWIDE_ONLINE";
    provinceId: string;
    placeCategory: string;
  } | null;
  usedAi: boolean;
}

const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash"] as const;

function fallbackHeuristicExtract(rawText: string): Omit<ExtractedPromoPayload, "matchedHotel" | "usedAi"> {
  const clean = rawText.trim();
  const lines = clean
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const urlMatch = clean.match(/https?:\/\/[^\s)]+/i);
  const codeMatch =
    clean.match(/(?:โค้ด|code|coupon|รหัส)[:\s#]*([A-Z0-9_-]{3,20})/i) ??
    clean.match(/\b([A-Z]{3,12}\d{1,4})\b/);
  const percentMatch = clean.match(/(?:ลด(?:สูงสุด|เพิ่ม)?|off)\s*(\d{1,2})\s*%/i);
  const bahtMatch = clean.match(/(?:ลด|เริ่มต้น|เพียง)\s*[฿]?\s*([\d,]{2,6})\s*(?:บาท|฿)?/i);

  let promoCategoryCode: ExtractedPromoPayload["promoCategoryCode"] = "STAY";
  const lower = clean.toLowerCase();
  if (/คาเฟ่|กาแฟ|cafe|coffee|เบเกอรี|มัทฉะ|ชาเขียว/.test(lower)) {
    promoCategoryCode = "CAFE";
  } else if (/ร้านอาหาร|บุฟเฟ่ต์|บาร์|รูฟท็อป|buffet|bar|rooftop|ซีฟู้ด|ดินเนอร์|kfc/.test(lower)) {
    promoCategoryCode = "RESTAURANT";
  } else if (/สปา|นวด|ออนเซ็น|spa|onsen|wellness/.test(lower)) {
    promoCategoryCode = "WELLNESS";
  } else if (/สวนน้ำ|ล่องเรือ|ทัวร์|บัตรเข้าชม|กิจกรรม|waterpark|cruise/.test(lower)) {
    promoCategoryCode = "ATTRACTION";
  }

  let locationScope: ExtractedPromoPayload["locationScope"] = "SINGLE_LOCATION";
  let branchSummaryTh = "";
  let provinceId = "bangkok";

  if (/บัตรเครดิต|ktc|scb|kbank|krungsri|agoda|klook|ออนไลน์|ทั่วประเทศ/.test(lower)) {
    locationScope = "NATIONWIDE_ONLINE";
    provinceId = "nationwide";
  } else if (/ทุกสาขา|สาขาที่ร่วมรายการ|kfc|starbucks|amazon|after you|centara|minor/.test(lower)) {
    locationScope = "MULTI_BRANCH";
    branchSummaryTh = "ทุกสาขาที่ร่วมรายการทั่วไทย";
    provinceId = "nationwide";
  } else {
    const matchedProv = THAILAND_77_PROVINCES.find(
      (p) =>
        lower.includes(p.nameTh.split("(")[0].trim().toLowerCase()) ||
        lower.includes(p.nameEn.toLowerCase())
    );
    if (matchedProv) provinceId = matchedProv.id;
  }

  const headline = percentMatch
    ? `ลด ${percentMatch[1]}%`
    : bahtMatch
    ? `เริ่มต้น ฿${bahtMatch[1]}`
    : (lines[0] || "โปรโมชั่นพิเศษ").slice(0, 42);

  const defaultExpiry = new Date(Date.now() + 30 * 86_400_000)
    .toISOString()
    .slice(0, 10);

  return {
    brandNameTh: (lines[0] || "แบรนด์พาร์ทเนอร์").slice(0, 60),
    brandNameEn: "",
    locationScope,
    branchSummaryTh,
    provinceId,
    promoCategoryCode,
    titleTh: (lines[0] || headline).slice(0, 100),
    promoHeadlineTh: headline,
    descriptionTh: clean.slice(0, 600),
    promoCode: codeMatch ? codeMatch[1].toUpperCase() : "",
    originalPriceThb: null,
    dealPriceThb: bahtMatch
      ? Number(bahtMatch[1].replace(/,/g, "")) || null
      : null,
    startsAt: new Date().toISOString().slice(0, 10),
    expiresAt: defaultExpiry,
    externalUrl: urlMatch ? urlMatch[0] : "",
    suggestedVisualMode:
      locationScope === "NATIONWIDE_ONLINE" ? "BRANDED_CARD" : "OFFICIAL_PHOTO",
  };
}

function buildGeminiPromoPrompt(customPrompt?: string | null): string {
  if (customPrompt?.trim()) return customPrompt.trim();
  return `You are Nondii's Thailand Travel Promotion Data Extractor.
Read the provided Thai/English promotional poster image and/or text and extract structured promotion metadata.

Return STRICT JSON ONLY (no markdown fences):
{
  "brandNameTh": string (name of hotel, cafe, restaurant, bar, chain, or credit card brand),
  "brandNameEn": string (English name if visible, else ""),
  "locationScope": "SINGLE_LOCATION" | "MULTI_BRANCH" | "NATIONWIDE_ONLINE",
  "branchSummaryTh": string (e.g. "ทุกสาขาทั่วไทย" for MULTI_BRANCH, else ""),
  "provinceId": string (lowercase slug like "bangkok", "chiang-mai", "phuket", "nakhon-ratchasima", "nan", or "nationwide"),
  "promoCategoryCode": "STAY" | "CAFE" | "RESTAURANT" | "WELLNESS" | "ATTRACTION",
  "titleTh": string (clear Thai promo title <= 85 chars),
  "promoHeadlineTh": string (ultra-punchy badge headline <= 28 chars, e.g. "ลด 25% รวมอาหารเช้า" or "1 แถม 1 เครื่องดื่ม"),
  "descriptionTh": string (concise Thai terms & highlights <= 350 chars),
  "promoCode": string (coupon code if present, else ""),
  "originalPriceThb": number | null,
  "dealPriceThb": number | null,
  "startsAt": "YYYY-MM-DD" | null (convert Thai B.E. year e.g. 2569 -> 2026),
  "expiresAt": "YYYY-MM-DD" | null (convert Thai B.E. year e.g. 2569 -> 2026),
  "externalUrl": string (URL if present, else ""),
  "suggestedVisualMode": "OFFICIAL_PHOTO" | "BRANDED_CARD"
}

Rules:
- Use "NATIONWIDE_ONLINE" and provinceId "nationwide" for credit cards (KTC/SCB/KBank), OTA codes (Agoda/Klook), or nationwide online offers.
- Use "MULTI_BRANCH" for chains (KFC, Starbucks, Cafe Amazon, After You, Centara, etc.).
- Use "BRANDED_CARD" for suggestedVisualMode if the offer is a text-only/credit-card/code promo without clean venue photography.`;
}

export async function POST(request: Request) {
  const guard = await requireSuperAdminApi();
  if ("error" in guard) return guard.error;

  try {
    const body = await request.json();
    const parsed = ExtractRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "ข้อมูลไม่ถูกต้อง กรุณาใส่ข้อความหรือรูปโปสเตอร์โปรโมชั่น" },
        { status: 422 }
      );
    }

    const { rawText, imageBase64, imageMimeType } = parsed.data;
    if (!rawText.trim() && !imageBase64) {
      return NextResponse.json(
        { error: "กรุณาวางข้อความโปรโมชั่น หรืออัปโหลดรูปโปสเตอร์อย่างน้อย 1 อย่าง" },
        { status: 400 }
      );
    }

    let extracted = fallbackHeuristicExtract(rawText);
    let usedAi = false;

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (apiKey) {
      const customPromptRow = await prisma.aiPrompt
        .findUnique({ where: { key: "promo_poster_extract" } })
        .catch(() => null);

      const parts: Array<Record<string, unknown>> = [
        { text: buildGeminiPromoPrompt(customPromptRow?.prompt) },
      ];
      if (rawText.trim()) {
        parts.push({ text: `RAW PROMO TEXT:\n${rawText.trim()}` });
      }
      if (imageBase64) {
        const cleanB64 = imageBase64.replace(/^data:[^;]+;base64,/, "");
        parts.push({
          inlineData: {
            mimeType: imageMimeType || "image/jpeg",
            data: cleanB64,
          },
        });
      }

      for (const modelName of GEMINI_MODELS) {
        try {
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(apiKey)}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ role: "user", parts }],
                generationConfig: {
                  temperature: 0.15,
                  responseMimeType: "application/json",
                },
              }),
            }
          );
          if (!res.ok) continue;
          const json = (await res.json()) as {
            candidates?: Array<{
              content?: { parts?: Array<{ text?: string }> };
            }>;
          };
          const rawOut = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!rawOut) continue;
          const cleanJson = rawOut
            .replace(/^```json\s*/i, "")
            .replace(/^```\s*/i, "")
            .replace(/\s*```$/i, "")
            .trim();
          const aiObj = JSON.parse(cleanJson) as Partial<ExtractedPromoPayload>;
          extracted = {
            ...extracted,
            brandNameTh: (aiObj.brandNameTh || extracted.brandNameTh).trim(),
            brandNameEn: (aiObj.brandNameEn || extracted.brandNameEn).trim(),
            locationScope:
              aiObj.locationScope === "MULTI_BRANCH" ||
              aiObj.locationScope === "NATIONWIDE_ONLINE" ||
              aiObj.locationScope === "SINGLE_LOCATION"
                ? aiObj.locationScope
                : extracted.locationScope,
            branchSummaryTh: (aiObj.branchSummaryTh || extracted.branchSummaryTh).trim(),
            provinceId: (aiObj.provinceId || extracted.provinceId).trim(),
            promoCategoryCode:
              aiObj.promoCategoryCode === "STAY" ||
              aiObj.promoCategoryCode === "CAFE" ||
              aiObj.promoCategoryCode === "RESTAURANT" ||
              aiObj.promoCategoryCode === "WELLNESS" ||
              aiObj.promoCategoryCode === "ATTRACTION"
                ? aiObj.promoCategoryCode
                : extracted.promoCategoryCode,
            titleTh: (aiObj.titleTh || extracted.titleTh).trim(),
            promoHeadlineTh: (aiObj.promoHeadlineTh || extracted.promoHeadlineTh).trim(),
            descriptionTh: (aiObj.descriptionTh || extracted.descriptionTh).trim(),
            promoCode: (aiObj.promoCode || extracted.promoCode).trim().toUpperCase(),
            originalPriceThb:
              typeof aiObj.originalPriceThb === "number" &&
              Number.isFinite(aiObj.originalPriceThb)
                ? Math.round(aiObj.originalPriceThb)
                : extracted.originalPriceThb,
            dealPriceThb:
              typeof aiObj.dealPriceThb === "number" &&
              Number.isFinite(aiObj.dealPriceThb)
                ? Math.round(aiObj.dealPriceThb)
                : extracted.dealPriceThb,
            startsAt: aiObj.startsAt || extracted.startsAt,
            expiresAt: aiObj.expiresAt || extracted.expiresAt,
            externalUrl: (aiObj.externalUrl || extracted.externalUrl).trim(),
            suggestedVisualMode:
              aiObj.suggestedVisualMode === "BRANDED_CARD"
                ? "BRANDED_CARD"
                : extracted.suggestedVisualMode,
          };
          usedAi = true;
          break;
        } catch {
          // try next model or fallback
        }
      }
    }

    // Entity Matching against real Neon Postgres Hotel/Brand directory
    const searchName = extracted.brandNameTh.trim();
    const matchedHotel = searchName
      ? await prisma.hotel.findFirst({
          where: {
            OR: [
              { nameTh: { contains: searchName, mode: "insensitive" } },
              ...(extracted.brandNameEn
                ? [
                    {
                      nameEn: {
                        contains: extracted.brandNameEn,
                        mode: "insensitive" as const,
                      },
                    },
                  ]
                : []),
            ],
          },
          select: {
            id: true,
            slug: true,
            nameTh: true,
            coverImageUrl: true,
            locationScope: true,
            provinceId: true,
            placeCategory: true,
          },
        })
      : null;

    const payload: ExtractedPromoPayload = {
      ...extracted,
      matchedHotel,
      usedAi,
    };

    return NextResponse.json({ extracted: payload });
  } catch (err) {
    console.error("[POST /api/admin/promos/extract]", err);
    return NextResponse.json(
      { error: "ไม่สามารถแกะข้อมูลโปรโมชั่นได้" },
      { status: 500 }
    );
  }
}
