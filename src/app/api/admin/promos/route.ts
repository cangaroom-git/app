import crypto from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdminApi } from "@/lib/admin/requireAdmin";
import { revalidatePlaceCatalog } from "@/lib/cache/revalidateNondii";
import { prisma } from "@/lib/prisma";
import {
  formatPlaceLocationScopeLabel,
  formatPromoDateRangeLabel,
  sanitizeOutboundHttpsUrl,
} from "@/lib/placeCategories";
import { getProvinceById } from "@/data/thailandProvinces";

const CreatePromoSchema = z.object({
  mode: z.enum(["INBOX", "PUBLISH_NOW"]).default("INBOX"),
  sourceType: z
    .enum([
      "AFFILIATE_API",
      "EMAIL_WEBHOOK",
      "FACEBOOK_SYNC",
      "ADMIN_AI_DROP",
      "MERCHANT_SUBMIT",
      "COMMUNITY_TIP",
    ])
    .default("ADMIN_AI_DROP"),
  matchedHotelId: z.string().trim().optional().nullable(),
  brandNameTh: z.string().trim().min(1).max(120),
  brandNameEn: z.string().trim().max(120).optional().default(""),
  locationScope: z
    .enum(["SINGLE_LOCATION", "MULTI_BRANCH", "NATIONWIDE_ONLINE"])
    .default("SINGLE_LOCATION"),
  branchSummaryTh: z.string().trim().max(140).optional().default(""),
  provinceId: z.string().trim().min(1).default("nationwide"),
  promoCategoryCode: z
    .enum(["STAY", "CAFE", "RESTAURANT", "WELLNESS", "ATTRACTION"])
    .default("STAY"),
  titleTh: z.string().trim().min(1).max(140),
  promoHeadlineTh: z.string().trim().min(1).max(60),
  descriptionTh: z.string().trim().max(1500).optional().default(""),
  promoCode: z.string().trim().max(40).optional().default(""),
  originalPriceThb: z.number().int().positive().nullable().optional(),
  dealPriceThb: z.number().int().positive().nullable().optional(),
  startsAt: z.string().trim().nullable().optional(),
  expiresAt: z.string().trim().nullable().optional(),
  externalUrl: z.string().trim().max(500).optional().default(""),
  coverImageUrl: z.string().trim().max(1000).optional().default(""),
  visualMode: z
    .enum(["OFFICIAL_PHOTO", "BRANDED_CARD", "CATEGORY_FALLBACK"])
    .default("OFFICIAL_PHOTO"),
  rawText: z.string().max(12000).optional().default(""),
});

const PatchPromoSchema = z.object({
  inboxId: z.string().trim().min(1),
  action: z.enum(["APPROVE", "REJECT", "DELETE"]),
});

function slugifyBrand(raw: string): string {
  const ascii = raw
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (ascii.length >= 3) return ascii.slice(0, 42);
  return `brand-${crypto.randomBytes(3).toString("hex")}`;
}

function buildBrandedCardUrl(params: {
  headline: string;
  brand: string;
  category: string;
  scope: string;
  dates?: string | null;
  code?: string | null;
}): string {
  const qs = new URLSearchParams();
  qs.set("headline", params.headline);
  qs.set("brand", params.brand);
  qs.set("category", params.category);
  qs.set("scope", params.scope);
  if (params.dates) qs.set("dates", params.dates);
  if (params.code) qs.set("code", params.code);
  return `/api/og/promo-card?${qs.toString()}`;
}

function parseOptionalDate(val?: string | null): Date | null {
  if (!val?.trim()) return null;
  const d = new Date(val);
  return Number.isFinite(d.getTime()) ? d : null;
}

async function publishPromoIntoCatalog(params: {
  adminUserId: string;
  matchedHotelId?: string | null;
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
  originalPriceThb?: number | null;
  dealPriceThb?: number | null;
  startsAt?: Date | null;
  expiresAt?: Date | null;
  externalUrl: string;
  coverImageUrl: string;
  visualMode: "OFFICIAL_PHOTO" | "BRANDED_CARD" | "CATEGORY_FALLBACK";
  dedupeHash: string;
}) {
  const cleanExternalUrl = sanitizeOutboundHttpsUrl(params.externalUrl);
  const prov = getProvinceById(params.provinceId);
  const scopeLabel = formatPlaceLocationScopeLabel(
    {
      locationScope: params.locationScope,
      branchSummaryTh: params.branchSummaryTh,
      provinceId: params.provinceId,
      provinceNameTh: prov ? prov.nameTh.split("(")[0].trim() : params.provinceId,
      provinceNameEn: prov ? prov.nameEn : params.provinceId,
    },
    "th"
  );
  const dateInfo = formatPromoDateRangeLabel(
    params.startsAt ? params.startsAt.toISOString() : null,
    params.expiresAt ? params.expiresAt.toISOString() : null,
    "th"
  );

  const generatedCardUrl = buildBrandedCardUrl({
    headline: params.promoHeadlineTh,
    brand: params.brandNameTh,
    category: params.promoCategoryCode,
    scope: scopeLabel,
    dates: dateInfo?.label ?? null,
    code: params.promoCode || null,
  });

  // 1. Resolve or create target Hotel/Brand entity
  let targetHotel = params.matchedHotelId
    ? await prisma.hotel.findUnique({ where: { id: params.matchedHotelId } })
    : null;

  if (!targetHotel) {
    let candidateSlug = slugifyBrand(params.brandNameEn || params.brandNameTh);
    const existingSlug = await prisma.hotel.findUnique({
      where: { slug: candidateSlug },
      select: { id: true },
    });
    if (existingSlug) {
      candidateSlug = `${candidateSlug}-${crypto.randomBytes(2).toString("hex")}`;
    }

    targetHotel = await prisma.hotel.create({
      data: {
        slug: candidateSlug,
        ownerId: params.adminUserId,
        nameTh: params.brandNameTh,
        nameEn: params.brandNameEn || params.brandNameTh,
        taglineTh: params.promoHeadlineTh,
        descriptionTh: params.descriptionTh,
        coverImageUrl:
          params.visualMode === "BRANDED_CARD" || !params.coverImageUrl
            ? generatedCardUrl
            : params.coverImageUrl,
        provinceId:
          params.locationScope === "NATIONWIDE_ONLINE"
            ? "nationwide"
            : params.provinceId,
        placeCategory: params.promoCategoryCode,
        merchantMode: "PROFILE_ONLY",
        locationScope: params.locationScope,
        branchSummaryTh: params.branchSummaryTh,
        externalWebsiteUrl: cleanExternalUrl,
        verificationStatus: "VERIFIED",
        isPublished: true,
      },
    });
  }

  const resolvedCover =
    params.visualMode === "BRANDED_CARD"
      ? generatedCardUrl
      : params.coverImageUrl || targetHotel.coverImageUrl || generatedCardUrl;

  const isMultiCampaignBrand =
    targetHotel.locationScope === "MULTI_BRANCH" ||
    targetHotel.locationScope === "NATIONWIDE_ONLINE";

  // 2. For SINGLE_LOCATION with an existing canonical pin, update its promo fields;
  //    for MULTI_BRANCH / NATIONWIDE_ONLINE (or new entity), create a fresh campaign Pin!
  let publishedPin;
  if (!isMultiCampaignBrand && targetHotel.canonicalPinId) {
    publishedPin = await prisma.pin.update({
      where: { id: targetHotel.canonicalPinId },
      data: {
        promoHeadlineTh: params.promoHeadlineTh,
        promoHeadlineEn: params.promoHeadlineTh,
        promoCode: params.promoCode || null,
        promoOriginalPriceThb: params.originalPriceThb ?? null,
        promoDealPriceThb: params.dealPriceThb ?? null,
        promoStartsAt: params.startsAt ?? null,
        promoExpiresAt: params.expiresAt ?? null,
        promoCategoryCode: params.promoCategoryCode,
        externalDealUrl: cleanExternalUrl || null,
        visualMode: params.visualMode,
        ingestionHash: params.dedupeHash,
        ...(params.visualMode === "BRANDED_CARD"
          ? { coverImageUrl: resolvedCover }
          : {}),
      },
    });
  } else {
    const isFirstPinForHotel = !targetHotel.canonicalPinId;
    publishedPin = await prisma.pin.create({
      data: {
        hotelId: targetHotel.id,
        titleTh: params.titleTh,
        titleEn: params.titleTh,
        descriptionTh: params.descriptionTh,
        coverImageUrl: resolvedCover,
        mediaUrls: [resolvedCover],
        aspectRatio: "aspect-square",
        provinceId:
          targetHotel.locationScope === "NATIONWIDE_ONLINE"
            ? "nationwide"
            : params.provinceId,
        dealSourceType: cleanExternalUrl ? "EXTERNAL" : "INTERNAL",
        externalDealUrl: cleanExternalUrl || null,
        promoHeadlineTh: params.promoHeadlineTh,
        promoHeadlineEn: params.promoHeadlineTh,
        promoCode: params.promoCode || null,
        promoOriginalPriceThb: params.originalPriceThb ?? null,
        promoDealPriceThb: params.dealPriceThb ?? null,
        promoStartsAt: params.startsAt ?? null,
        promoExpiresAt: params.expiresAt ?? null,
        promoCategoryCode: params.promoCategoryCode,
        visualMode: params.visualMode,
        ingestionHash: params.dedupeHash,
        isCanonicalCard: isFirstPinForHotel,
        publishStatus: "PUBLISHED",
      },
    });

    if (isFirstPinForHotel) {
      await prisma.hotel.update({
        where: { id: targetHotel.id },
        data: { canonicalPinId: publishedPin.id },
      });
    }
  }

  revalidatePlaceCatalog({ slug: targetHotel.slug, pinId: publishedPin.id });
  return { hotel: targetHotel, pin: publishedPin };
}

export async function GET() {
  const guard = await requireSuperAdminApi();
  if ("error" in guard) return guard.error;

  try {
    const now = new Date();
    const soonDate = new Date(now.getTime() + 5 * 86_400_000);

    const [inboxItems, pins, hotels] = await Promise.all([
      prisma.promoInboxItem.findMany({
        orderBy: [{ createdAt: "desc" }],
        take: 500,
      }),
      prisma.pin.findMany({
        where: {
          hotel: { verificationStatus: { not: "SUSPENDED" } },
        },
        orderBy: [{ updatedAt: "desc" }],
        take: 1000,
        select: {
          id: true,
          hotelId: true,
          titleTh: true,
          coverImageUrl: true,
          provinceId: true,
          promoHeadlineTh: true,
          promoCode: true,
          promoStartsAt: true,
          promoExpiresAt: true,
          promoCategoryCode: true,
          visualMode: true,
          dealSourceType: true,
          publishStatus: true,
          viewsCount: true,
          savesCount: true,
          externalClickCount: true,
          hotel: {
            select: {
              id: true,
              slug: true,
              nameTh: true,
              placeCategory: true,
              locationScope: true,
              branchSummaryTh: true,
            },
          },
        },
      }),
      prisma.hotel.findMany({
        orderBy: { nameTh: "asc" },
        select: {
          id: true,
          slug: true,
          nameTh: true,
          placeCategory: true,
          locationScope: true,
          provinceId: true,
          coverImageUrl: true,
        },
      }),
    ]);

    const activePins = pins.filter(
      (p) =>
        p.publishStatus === "PUBLISHED" &&
        (!p.promoExpiresAt || p.promoExpiresAt.getTime() > now.getTime())
    );
    const expiringPins = activePins.filter(
      (p) =>
        p.promoExpiresAt && p.promoExpiresAt.getTime() <= soonDate.getTime()
    );
    const expiredPins = pins.filter(
      (p) =>
        p.publishStatus === "DISCARDED" ||
        (p.promoExpiresAt && p.promoExpiresAt.getTime() <= now.getTime())
    );

    return NextResponse.json({
      inboxItems,
      activePins,
      expiringPins,
      expiredPins,
      hotels,
    });
  } catch (err) {
    console.error("[GET /api/admin/promos]", err);
    return NextResponse.json(
      { error: "ไม่สามารถโหลดรายการโปรโมชั่นได้" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const guard = await requireSuperAdminApi();
  if ("error" in guard) return guard.error;

  try {
    const raw = await request.json();
    const parsed = CreatePromoSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "กรุณากรอกชื่อแบรนด์/ร้าน และหัวข้อโปรโมชั่นให้ครบถ้วน" },
        { status: 422 }
      );
    }

    const d = parsed.data;
    const startsAt = parseOptionalDate(d.startsAt);
    const expiresAt = parseOptionalDate(d.expiresAt);
    const dedupeHash = crypto
      .createHash("sha256")
      .update(
        `${d.brandNameTh.toLowerCase()}|${d.promoHeadlineTh.toLowerCase()}|${d.expiresAt || ""}`
      )
      .digest("hex")
      .slice(0, 24);

    if (d.mode === "PUBLISH_NOW") {
      const published = await publishPromoIntoCatalog({
        adminUserId: guard.user.id,
        matchedHotelId: d.matchedHotelId,
        brandNameTh: d.brandNameTh,
        brandNameEn: d.brandNameEn,
        locationScope: d.locationScope,
        branchSummaryTh: d.branchSummaryTh,
        provinceId: d.provinceId,
        promoCategoryCode: d.promoCategoryCode,
        titleTh: d.titleTh,
        promoHeadlineTh: d.promoHeadlineTh,
        descriptionTh: d.descriptionTh,
        promoCode: d.promoCode,
        originalPriceThb: d.originalPriceThb,
        dealPriceThb: d.dealPriceThb,
        startsAt,
        expiresAt,
        externalUrl: d.externalUrl,
        coverImageUrl: d.coverImageUrl,
        visualMode: d.visualMode,
        dedupeHash,
      });

      const inboxItem = await prisma.promoInboxItem.create({
        data: {
          sourceType: d.sourceType,
          rawText: d.rawText,
          matchedHotelId: published.hotel.id,
          brandNameTh: d.brandNameTh,
          brandNameEn: d.brandNameEn,
          locationScope: d.locationScope,
          branchSummaryTh: d.branchSummaryTh,
          provinceId: d.provinceId,
          promoCategoryCode: d.promoCategoryCode,
          titleTh: d.titleTh,
          descriptionTh: d.descriptionTh,
          promoCode: d.promoCode || null,
          discountLabelTh: d.promoHeadlineTh,
          originalPriceThb: d.originalPriceThb ?? null,
          dealPriceThb: d.dealPriceThb ?? null,
          startsAt,
          expiresAt,
          externalUrl: sanitizeOutboundHttpsUrl(d.externalUrl) || null,
          coverImageUrl: published.pin.coverImageUrl,
          visualMode: d.visualMode,
          status: "APPROVED",
          dedupeHash,
          reviewedById: guard.user.id,
          publishedPinId: published.pin.id,
        },
      });

      return NextResponse.json({
        success: true,
        inboxItem,
        pin: published.pin,
        hotel: published.hotel,
      });
    }

    // Save into Promo Inbox queue
    const inboxItem = await prisma.promoInboxItem.create({
      data: {
        sourceType: d.sourceType,
        rawText: d.rawText,
        matchedHotelId: d.matchedHotelId || null,
        brandNameTh: d.brandNameTh,
        brandNameEn: d.brandNameEn,
        locationScope: d.locationScope,
        branchSummaryTh: d.branchSummaryTh,
        provinceId: d.provinceId,
        promoCategoryCode: d.promoCategoryCode,
        titleTh: d.titleTh,
        descriptionTh: d.descriptionTh,
        promoCode: d.promoCode || null,
        discountLabelTh: d.promoHeadlineTh,
        originalPriceThb: d.originalPriceThb ?? null,
        dealPriceThb: d.dealPriceThb ?? null,
        startsAt,
        expiresAt,
        externalUrl: sanitizeOutboundHttpsUrl(d.externalUrl) || null,
        coverImageUrl: d.coverImageUrl || null,
        visualMode: d.visualMode,
        status: "PENDING_REVIEW",
        dedupeHash,
      },
    });

    return NextResponse.json({ success: true, inboxItem });
  } catch (err) {
    console.error("[POST /api/admin/promos]", err);
    return NextResponse.json(
      { error: "บันทึกโปรโมชั่นไม่สำเร็จ" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const guard = await requireSuperAdminApi();
  if ("error" in guard) return guard.error;

  try {
    const raw = await request.json();
    const parsed = PatchPromoSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 422 });
    }

    const { inboxId, action } = parsed.data;
    const existing = await prisma.promoInboxItem.findUnique({
      where: { id: inboxId },
    });
    if (!existing) {
      return NextResponse.json({ error: "ไม่พบรายการโปรโมชั่น" }, { status: 404 });
    }

    if (action === "DELETE") {
      await prisma.promoInboxItem.delete({ where: { id: inboxId } });
      return NextResponse.json({ success: true });
    }

    if (action === "REJECT") {
      const updated = await prisma.promoInboxItem.update({
        where: { id: inboxId },
        data: { status: "REJECTED", reviewedById: guard.user.id },
      });
      return NextResponse.json({ success: true, inboxItem: updated });
    }

    // APPROVE -> publish into live catalog
    const catCode =
      existing.promoCategoryCode === "CAFE" ||
      existing.promoCategoryCode === "RESTAURANT" ||
      existing.promoCategoryCode === "WELLNESS" ||
      existing.promoCategoryCode === "ATTRACTION"
        ? existing.promoCategoryCode
        : "STAY";

    const published = await publishPromoIntoCatalog({
      adminUserId: guard.user.id,
      matchedHotelId: existing.matchedHotelId,
      brandNameTh: existing.brandNameTh,
      brandNameEn: existing.brandNameEn,
      locationScope: existing.locationScope,
      branchSummaryTh: existing.branchSummaryTh,
      provinceId: existing.provinceId,
      promoCategoryCode: catCode,
      titleTh: existing.titleTh,
      promoHeadlineTh: existing.discountLabelTh || existing.titleTh,
      descriptionTh: existing.descriptionTh,
      promoCode: existing.promoCode || "",
      originalPriceThb: existing.originalPriceThb,
      dealPriceThb: existing.dealPriceThb,
      startsAt: existing.startsAt,
      expiresAt: existing.expiresAt,
      externalUrl: existing.affiliateUrl || existing.externalUrl || "",
      coverImageUrl: existing.coverImageUrl || "",
      visualMode: existing.visualMode,
      dedupeHash: existing.dedupeHash || inboxId,
    });

    const updated = await prisma.promoInboxItem.update({
      where: { id: inboxId },
      data: {
        status: "APPROVED",
        reviewedById: guard.user.id,
        matchedHotelId: published.hotel.id,
        publishedPinId: published.pin.id,
      },
    });

    return NextResponse.json({
      success: true,
      inboxItem: updated,
      pin: published.pin,
    });
  } catch (err) {
    console.error("[PATCH /api/admin/promos]", err);
    return NextResponse.json(
      { error: "ดำเนินการไม่สำเร็จ" },
      { status: 500 }
    );
  }
}
