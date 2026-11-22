import {
  isValidRoomPhotoSpace,
  type RoomPhotoSpaceId,
} from "@/lib/roomPhotoSpaces";

export type ImageModerationDecision = "ALLOW" | "BLOCK";

export type ImageModerationReasonCategory =
  | "NONE"
  | "NSFW_EXPLICIT"
  | "VIOLENCE_ILLEGAL"
  | "GAMBLING_SCAM"
  | "IRRELEVANT_SPAM";

export interface GeminiImageAnalysisResult {
  checked: boolean;
  decision: ImageModerationDecision;
  reasonCategory: ImageModerationReasonCategory;
  reasonTh: string | null;
  suggestedSpace: RoomPhotoSpaceId | null;
  suggestedCaptionTh: string | null;
  warnings: string[];
  skippedReason?: string;
}

const GEMINI_MODELS = [
  { name: "gemini-3.8-flash", thinkingLevel: "LOW" as const },
  { name: "gemini-flash-latest", thinkingLevel: null },
] as const;

function buildModerationPrompt(folder: string): string {
  if (folder === "slips") {
    return `You are a safety moderator for a Thai hotel booking platform (Nondii).
This upload is a BANK PAYMENT SLIP / QR TRANSFER RECEIPT.
Only block if the image contains explicit pornography/nudity, graphic violence/gore, or illegal content.
Do NOT block bank slips, receipts, screenshots, or QR codes.

Return strict JSON only:
{
  "decision": "ALLOW" | "BLOCK",
  "reasonCategory": "NONE" | "NSFW_EXPLICIT" | "VIOLENCE_ILLEGAL",
  "reasonTh": string | null,
  "warnings": string[]
}`;
  }

  const isRoomPhoto = folder === "rooms";
  return `You are a helpful AI image moderator and hospitality photo assistant for Nondii, a Thai boutique hotel, resort, pool villa, and glamping booking platform.

Evaluate the uploaded image carefully with HIGH PRECISION and LOW FALSE POSITIVES (never unfairly block genuine Thai hotel/resort photos!):

1. HARD BLOCK ("decision": "BLOCK") ONLY when high confidence:
   - "NSFW_EXPLICIT": Explicit nudity, pornography, sexual content. IMPORTANT: Normal resort pools, beaches, guests in normal swimwear, bathtubs, and spas are SAFE ("ALLOW").
   - "VIOLENCE_ILLEGAL": Graphic violence, gore, weapons, illegal drugs, hate symbols.
   - "GAMBLING_SCAM": Online gambling ads/banners (เว็บพนัน, บาคาร่า, สล็อต, แทงบอล, คาสิโนออนไลน์), scam banners, or spam QR promo graphics.
   - "IRRELEVANT_SPAM": Obviously unrelated junk for a hotel listing (e.g., bank transfer slips, national ID cards/passports with PII, random internet memes, chat screenshots).

2. ALLOW ("decision": "ALLOW") for genuine hospitality photos (rooms, beds, bathrooms, tubs, balconies, ocean/mountain views, pools, dining/breakfast, gardens, exteriors, cafes, pets at pet-friendly stays, decor, hotel logos).
   - Optionally include at most 1 gentle Thai tip in "warnings" ONLY if the photo is visibly very blurry, pitch-dark, or heavily covered in promotional text/watermarks. Otherwise return [].

${
  isRoomPhoto
    ? `3. If decision is "ALLOW", ALSO classify the room space into EXACTLY one of:
   - "bedroom" (bed, sleeping area)
   - "bathroom" (bathroom, bathtub, jacuzzi, shower)
   - "balcony" (balcony, terrace, sea/mountain/garden view)
   - "pool" (private pool, resort pool, plunge pool)
   - "living" (living room, sofa, dining, kitchen, pantry)
   - "exterior" (building exterior, villa facade, garden, entrance)
   - "additional" (breakfast, amenities, details, or mixed/other)
   And write "suggestedCaptionTh": ONE concise, natural, factual Thai SEO/AEO description (50-130 characters) describing ONLY what is actually visible in the photo (no fabricated claims, no emojis, no hashtags).`
    : `3. Set "suggestedSpace": null and "suggestedCaptionTh": null.`
}

Return STRICT valid JSON only (no markdown fences):
{
  "decision": "ALLOW" | "BLOCK",
  "reasonCategory": "NONE" | "NSFW_EXPLICIT" | "VIOLENCE_ILLEGAL" | "GAMBLING_SCAM" | "IRRELEVANT_SPAM",
  "reasonTh": string | null,
  "suggestedSpace": "bedroom" | "bathroom" | "balcony" | "pool" | "living" | "exterior" | "additional" | null,
  "suggestedCaptionTh": string | null,
  "warnings": string[]
}`;
}

function defaultBlockReasonTh(category: ImageModerationReasonCategory): string {
  switch (category) {
    case "NSFW_EXPLICIT":
      return "ไม่สามารถอัปโหลดรูปนี้ได้ เนื่องจากตรวจพบเนื้อหาที่ไม่เหมาะสมหรือลามกอนาจาร";
    case "VIOLENCE_ILLEGAL":
      return "ไม่สามารถอัปโหลดรูปนี้ได้ เนื่องจากตรวจพบเนื้อหาความรุนแรงหรือผิดกฎหมาย";
    case "GAMBLING_SCAM":
      return "ไม่สามารถอัปโหลดรูปนี้ได้ เนื่องจากตรวจพบโฆษณาเว็บพนันหรือข้อความสแปม";
    case "IRRELEVANT_SPAM":
      return "รูปภาพนี้ไม่เกี่ยวข้องกับที่พักหรือมีข้อมูลส่วนตัว (เช่น สลิป/เอกสาร/ภาพแคปแชท) กรุณาใช้รูปบรรยากาศหรือห้องพักจริง";
    default:
      return "ไม่สามารถอัปโหลดรูปภาพนี้ได้ เนื่องจากไม่ตรงตามนโยบายความปลอดภัยของแพลตฟอร์ม";
  }
}

export async function analyzeImageWithGemini(
  buffer: Buffer,
  mimeType: string,
  folder: string
): Promise<GeminiImageAnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return {
      checked: false,
      decision: "ALLOW",
      reasonCategory: "NONE",
      reasonTh: null,
      suggestedSpace: null,
      suggestedCaptionTh: null,
      warnings: [],
      skippedReason: "GEMINI_API_KEY_NOT_CONFIGURED",
    };
  }

  const base64Data = buffer.toString("base64");
  const prompt = buildModerationPrompt(folder);

  let lastError = "UNKNOWN_ERROR";

  for (const modelSpec of GEMINI_MODELS) {
    const model = modelSpec.name;
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        signal: AbortSignal.timeout(15000),
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: base64Data,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1024,
            responseMimeType: "application/json",
            ...(modelSpec.thinkingLevel
              ? { thinkingConfig: { thinkingLevel: modelSpec.thinkingLevel } }
              : {}),
          },
        }),
      });

      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        lastError = `HTTP_${res.status}`;
        // If billing/quota/auth issue, don't burn retries on fallback models — fail-open cleanly
        if (res.status === 401 || res.status === 402 || res.status === 403 || res.status === 429) {
          console.warn(
            `[GeminiImageModeration] Skipped (${model} HTTP ${res.status}):`,
            errBody.slice(0, 220)
          );
          break;
        }
        continue;
      }

      const payload = (await res.json()) as {
        candidates?: Array<{
          content?: { parts?: Array<{ text?: string }> };
          finishReason?: string;
        }>;
        promptFeedback?: { blockReason?: string };
      };

      // If Gemini's own built-in safety filter blocked the prompt/image outright
      const safetyBlock =
        payload.promptFeedback?.blockReason ||
        payload.candidates?.[0]?.finishReason;
      if (
        safetyBlock === "SAFETY" ||
        safetyBlock === "PROHIBITED_CONTENT" ||
        safetyBlock === "BLOCKLIST"
      ) {
        return {
          checked: true,
          decision: "BLOCK",
          reasonCategory: "NSFW_EXPLICIT",
          reasonTh: defaultBlockReasonTh("NSFW_EXPLICIT"),
          suggestedSpace: null,
          suggestedCaptionTh: null,
          warnings: [],
        };
      }

      const rawText = payload.candidates?.[0]?.content?.parts
        ?.map((p) => p.text ?? "")
        .join("")
        .trim();

      if (!rawText) {
        lastError = "EMPTY_RESPONSE";
        continue;
      }

      const cleaned = rawText
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

      const parsed = JSON.parse(cleaned) as {
        decision?: string;
        reasonCategory?: string;
        reasonTh?: string | null;
        suggestedSpace?: string | null;
        suggestedCaptionTh?: string | null;
        warnings?: unknown;
      };

      const decision: ImageModerationDecision =
        parsed.decision === "BLOCK" ? "BLOCK" : "ALLOW";

      const validCategories = new Set<ImageModerationReasonCategory>([
        "NONE",
        "NSFW_EXPLICIT",
        "VIOLENCE_ILLEGAL",
        "GAMBLING_SCAM",
        "IRRELEVANT_SPAM",
      ]);
      const reasonCategory: ImageModerationReasonCategory =
        typeof parsed.reasonCategory === "string" &&
        validCategories.has(parsed.reasonCategory as ImageModerationReasonCategory)
          ? (parsed.reasonCategory as ImageModerationReasonCategory)
          : decision === "BLOCK"
          ? "IRRELEVANT_SPAM"
          : "NONE";

      const reasonTh =
        decision === "BLOCK"
          ? (typeof parsed.reasonTh === "string" && parsed.reasonTh.trim()) ||
            defaultBlockReasonTh(reasonCategory)
          : null;

      const suggestedSpace: RoomPhotoSpaceId | null =
        decision === "ALLOW" && isValidRoomPhotoSpace(parsed.suggestedSpace)
          ? parsed.suggestedSpace
          : null;

      const suggestedCaptionTh =
        decision === "ALLOW" &&
        typeof parsed.suggestedCaptionTh === "string" &&
        parsed.suggestedCaptionTh.trim().length > 0
          ? parsed.suggestedCaptionTh.trim().slice(0, 220)
          : null;

      const warnings = Array.isArray(parsed.warnings)
        ? parsed.warnings
            .filter((w): w is string => typeof w === "string" && w.trim().length > 0)
            .map((w) => w.trim().slice(0, 180))
            .slice(0, 2)
        : [];

      return {
        checked: true,
        decision,
        reasonCategory,
        reasonTh,
        suggestedSpace,
        suggestedCaptionTh,
        warnings,
      };
    } catch (err) {
      lastError = err instanceof Error ? err.message : "FETCH_FAILED";
    }
  }

  return {
    checked: false,
    decision: "ALLOW",
    reasonCategory: "NONE",
    reasonTh: null,
    suggestedSpace: null,
    suggestedCaptionTh: null,
    warnings: [],
    skippedReason: lastError,
  };
}
