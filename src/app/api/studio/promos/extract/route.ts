import { NextResponse } from "next/server";
import { z } from "zod";
import {
  requireHotelStudioAccess,
  StudioAuthError,
} from "@/lib/auth/studioAccess";
import { prisma } from "@/lib/prisma";
import { THAILAND_77_PROVINCES } from "@/data/thailandProvinces";

const ExtractRequestSchema = z.object({
  hotelSlug: z.string().optional(),
  rawText: z.string().max(12000).optional().default(""),
  imageBase64: z.string().max(8_000_000).optional().nullable(),
  imageMimeType: z.string().max(100).optional().nullable(),
});

export interface StudioExtractedPromoPayload {
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
  promoCategoryCode: "STAY" | "CAFE" | "RESTAURANT" | "WELLNESS" | "ATTRACTION";
  provinceId: string;
  usedAi: boolean;
}

const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash"] as const;

function heuristicExtractForMerchant(
  rawText: string,
  defaults: {
    hotelNameTh: string;
    category: "STAY" | "CAFE" | "RESTAURANT" | "WELLNESS" | "ATTRACTION";
    provinceId: string;
    locationScope: string;
  },
): Omit<StudioExtractedPromoPayload, "usedAi"> {
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
  const bahtMatch = clean.match(
    /(?:ลด|เริ่มต้น|เพียง)\s*[฿]?\s*([\d,]{2,6})\s*(?:บาท|฿)?/i,
  );

  const lower = clean.toLowerCase();
  let provinceId = defaults.provinceId || "bangkok";
  const matchedProv = THAILAND_77_PROVINCES.find(
    (p) =>
      lower.includes(p.nameTh.split("(")[0].trim().toLowerCase()) ||
      lower.includes(p.nameEn.toLowerCase()),
  );
  if (matchedProv) provinceId = matchedProv.id;

  const headline = percentMatch
    ? `ลด ${percentMatch[1]}%`
    : bahtMatch
      ? `เริ่มต้น ฿${bahtMatch[1]}`
      : (lines[0] || `โปรพิเศษ ${defaults.hotelNameTh}`).slice(0, 32);

  const defaultExpiry = new Date(Date.now() + 30 * 86_400_000)
    .toISOString()
    .slice(0, 10);

  return {
    titleTh: (lines[0] || `${headline} · ${defaults.hotelNameTh}`).slice(0, 100),
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
      defaults.locationScope === "NATIONWIDE_ONLINE"
        ? "BRANDED_CARD"
        : "OFFICIAL_PHOTO",
    promoCategoryCode: defaults.category,
    provinceId,
  };
}

function buildMerchantPromoPrompt(hotelNameTh: string, category: string): string {
  return `You are Nondii's Merchant Promotion Extractor for "${hotelNameTh}" (category: ${category}).
Read the provided Thai/English promotional poster image and/or caption text and extract structured promotion fields.

Return STRICT JSON ONLY (no markdown fences):
{
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
}`;
}

export async function POST(request: Request) {
  try {
    const raw = await request.json();
    const parsed = ExtractRequestSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "ข้อมูลไม่ถูกต้อง กรุณาใส่ข้อความหรือรูปโปสเตอร์โปรโมชั่น" },
        { status: 422 },
      );
    }

    const { hotel } = await requireHotelStudioAccess(parsed.data.hotelSlug);
    const { rawText, imageBase64, imageMimeType } = parsed.data;
    if (!rawText.trim() && !imageBase64) {
      return NextResponse.json(
        { error: "กรุณาวางข้อความโปรโมชั่น หรืออัปโหลดรูปโปสเตอร์อย่างน้อย 1 อย่าง" },
        { status: 400 },
      );
    }

    const validCategory =
      hotel.placeCategory === "CAFE" ||
      hotel.placeCategory === "RESTAURANT" ||
      hotel.placeCategory === "WELLNESS" ||
      hotel.placeCategory === "ATTRACTION"
        ? hotel.placeCategory
        : "STAY";

    let extracted = heuristicExtractForMerchant(rawText, {
      hotelNameTh: hotel.nameTh,
      category: validCategory,
      provinceId: hotel.provinceId,
      locationScope: hotel.locationScope,
    });
    let usedAi = false;

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (apiKey) {
      const customPromptRow = await prisma.aiPrompt
        .findUnique({ where: { key: "promo_poster_extract" } })
        .catch(() => null);

      const parts: Array<Record<string, unknown>> = [
        {
          text:
            customPromptRow?.prompt?.trim() ||
            buildMerchantPromoPrompt(hotel.nameTh, validCategory),
        },
        {
          text: `MERCHANT CONTEXT: ${hotel.nameTh} (${hotel.provinceId}, ${validCategory})`,
        },
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
            },
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
          const aiObj = JSON.parse(cleanJson) as Partial<StudioExtractedPromoPayload>;
          extracted = {
            ...extracted,
            titleTh: (aiObj.titleTh || extracted.titleTh).trim(),
            promoHeadlineTh: (
              aiObj.promoHeadlineTh || extracted.promoHeadlineTh
            ).trim(),
            descriptionTh: (
              aiObj.descriptionTh || extracted.descriptionTh
            ).trim(),
            promoCode: (aiObj.promoCode || extracted.promoCode)
              .trim()
              .toUpperCase(),
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

    return NextResponse.json({
      extracted: {
        ...extracted,
        usedAi,
      } satisfies StudioExtractedPromoPayload,
    });
  } catch (err) {
    if (err instanceof StudioAuthError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.statusCode },
      );
    }
    console.error("[POST /api/studio/promos/extract]", err);
    return NextResponse.json(
      { error: "ไม่สามารถแกะข้อมูลโปรโมชั่นได้" },
      { status: 500 },
    );
  }
}
