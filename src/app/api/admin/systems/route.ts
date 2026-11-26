import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdminApi } from "@/lib/admin/requireAdmin";
import { revalidatePlaceCatalog } from "@/lib/cache/revalidateNondii";
import { prisma } from "@/lib/prisma";

const DEFAULT_SYSTEM_CONFIGS: Record<string, Record<string, unknown>> = {
  settings_general: {
    siteName: "Nondii",
    taglineTh: "ศูนย์รวมโปรเที่ยวไทย · ที่พัก คาเฟ่ ร้านอาหาร & บาร์",
    contactEmail: "deals@nondii.com",
    defaultLanguage: "th",
    enableAutoExpire: true,
  },
  global_seo: {
    metaTitle: "Nondii — ศูนย์รวมโปรเที่ยวไทย · ที่พัก คาเฟ่ ร้านอาหาร & บาร์",
    metaDescription:
      "แหล่งรวมโปรโมชั่นสำหรับนักท่องเที่ยวทั่วไทย ทั้งที่พักจองตรง 0% GP คาเฟ่ ร้านอาหาร บาร์ แบรนด์ดัง และบัตรเครดิต",
    ogImageUrl: "/brand/hero-slider/opt/island-4k-desktop.webp",
  },
};

const DEFAULT_AI_PROMPTS = [
  {
    key: "promo_poster_extract",
    titleTh: "AI แกะโปรโมชั่นจากโปสเตอร์ / ข้อความ (Quick Promo Drop)",
    prompt: `You are Nondii's Thailand Travel Promotion Extractor. Read Thai/English promo posters or text and return strict JSON containing brandNameTh, locationScope (SINGLE_LOCATION | MULTI_BRANCH | NATIONWIDE_ONLINE), provinceId, promoCategoryCode (STAY | CAFE | RESTAURANT | WELLNESS | ATTRACTION), titleTh, promoHeadlineTh (<= 28 chars), descriptionTh, promoCode, originalPriceThb, dealPriceThb, startsAt (YYYY-MM-DD), expiresAt (YYYY-MM-DD), externalUrl, suggestedVisualMode (OFFICIAL_PHOTO | BRANDED_CARD).`,
  },
  {
    key: "fb_sync_triage",
    titleTh: "AI คัดกรองโพสต์ Facebook Page 3 ระดับ",
    prompt: `Evaluate Thai hospitality Facebook posts into Tier 1 (clean venue photography >= 85), Tier 2 (promotional graphic -> extract coupon draft), or Tier 3 (irrelevant meme/spam < 40 -> DISCARD).`,
  },
];

const SaveSystemSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("CONFIG"),
    key: z.string().trim().min(2).max(60),
    value: z.record(z.string(), z.unknown()),
  }),
  z.object({
    kind: z.literal("PROMPT"),
    key: z.string().trim().min(2).max(60),
    titleTh: z.string().trim().max(120).optional(),
    prompt: z.string().trim().min(10).max(8000),
  }),
]);

export async function GET() {
  const guard = await requireSuperAdminApi();
  if ("error" in guard) return guard.error;

  try {
    const [configs, prompts, users] = await Promise.all([
      prisma.systemConfig.findMany({ orderBy: { key: "asc" } }),
      prisma.aiPrompt.findMany({ orderBy: { key: "asc" } }),
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          _count: { select: { ownedHotels: true, bookings: true, boards: true } },
        },
      }),
    ]);

    const configMap: Record<string, Record<string, unknown>> = {
      ...DEFAULT_SYSTEM_CONFIGS,
    };
    for (const c of configs) {
      if (c.value && typeof c.value === "object" && !Array.isArray(c.value)) {
        configMap[c.key] = {
          ...(configMap[c.key] ?? {}),
          ...(c.value as Record<string, unknown>),
        };
      }
    }

    const promptMap = new Map(prompts.map((p) => [p.key, p]));
    const mergedPrompts = DEFAULT_AI_PROMPTS.map((def) => {
      const saved = promptMap.get(def.key);
      return {
        key: def.key,
        titleTh: saved?.titleTh || def.titleTh,
        prompt: saved?.prompt || def.prompt,
        updatedAt: saved?.updatedAt?.toISOString() ?? null,
      };
    });

    return NextResponse.json({
      configs: configMap,
      prompts: mergedPrompts,
      users,
    });
  } catch (err) {
    console.error("[GET /api/admin/systems]", err);
    return NextResponse.json(
      { error: "ไม่สามารถโหลดการตั้งค่าระบบได้" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const guard = await requireSuperAdminApi();
  if ("error" in guard) return guard.error;

  try {
    const raw = await request.json();
    const parsed = SaveSystemSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 422 });
    }

    if (parsed.data.kind === "CONFIG") {
      await prisma.systemConfig.upsert({
        where: { key: parsed.data.key },
        update: {
          value: parsed.data.value as object,
          updatedBy: guard.user.email,
        },
        create: {
          key: parsed.data.key,
          value: parsed.data.value as object,
          updatedBy: guard.user.email,
        },
      });
    } else {
      await prisma.aiPrompt.upsert({
        where: { key: parsed.data.key },
        update: {
          ...(parsed.data.titleTh ? { titleTh: parsed.data.titleTh } : {}),
          prompt: parsed.data.prompt,
          updatedBy: guard.user.email,
        },
        create: {
          key: parsed.data.key,
          titleTh: parsed.data.titleTh || parsed.data.key,
          prompt: parsed.data.prompt,
          updatedBy: guard.user.email,
        },
      });
    }

    revalidatePlaceCatalog();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[PATCH /api/admin/systems]", err);
    return NextResponse.json(
      { error: "บันทึกการตั้งค่าไม่สำเร็จ" },
      { status: 500 }
    );
  }
}
