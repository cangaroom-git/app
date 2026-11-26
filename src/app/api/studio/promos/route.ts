import crypto from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  requireHotelStudioAccess,
  StudioAuthError,
} from "@/lib/auth/studioAccess";
import { revalidatePlaceCatalog } from "@/lib/cache/revalidateNondii";
import { prisma } from "@/lib/prisma";
import {
  formatPlaceLocationScopeLabel,
  formatPromoDateRangeLabel,
  sanitizeOutboundHttpsUrl,
} from "@/lib/placeCategories";
import { getProvinceById } from "@/data/thailandProvinces";

const StudioPromoCreateSchema = z.object({
  hotelSlug: z.string().optional(),
  titleTh: z.string().trim().min(2).max(140),
  promoHeadlineTh: z.string().trim().min(1).max(60),
  descriptionTh: z.string().trim().max(1500).optional().default(""),
  promoCode: z.string().trim().max(40).optional().default(""),
  promoCategoryCode: z
    .enum(["STAY", "CAFE", "RESTAURANT", "WELLNESS", "ATTRACTION"])
    .optional(),
  originalPriceThb: z.number().int().positive().nullable().optional(),
  dealPriceThb: z.number().int().positive().nullable().optional(),
  startsAt: z.string().trim().nullable().optional(),
  expiresAt: z.string().trim().nullable().optional(),
  externalUrl: z.string().trim().max(500).optional().default(""),
  coverImageUrl: z.string().trim().max(1000).optional().default(""),
  visualMode: z
    .enum(["OFFICIAL_PHOTO", "BRANDED_CARD", "CATEGORY_FALLBACK"])
    .default("OFFICIAL_PHOTO"),
  publishStatus: z
    .enum(["PUBLISHED", "PENDING_APPROVAL", "DISCARDED"])
    .default("PUBLISHED"),
});

const StudioPromoUpdateSchema = StudioPromoCreateSchema.extend({
  id: z.string().trim().min(1),
});

const StudioPromoPatchSchema = z.object({
  hotelSlug: z.string().optional(),
  pinId: z.string().trim().min(1),
  action: z.enum(["PUBLISH", "UNPUBLISH", "DELETE"]),
});

function parseOptionalDate(val?: string | null): Date | null {
  if (!val?.trim()) return null;
  const d = new Date(val);
  return Number.isFinite(d.getTime()) ? d : null;
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

export async function POST(request: Request) {
  try {
    const raw = await request.json();
    const parsed = StudioPromoCreateSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "ข้อมูลโปรโมชั่นไม่ครบถ้วน" },
        { status: 422 },
      );
    }

    const { hotel } = await requireHotelStudioAccess(parsed.data.hotelSlug);
    const d = parsed.data;
    const categoryCode = d.promoCategoryCode || hotel.placeCategory || "STAY";
    const startsAtDate = parseOptionalDate(d.startsAt) ?? new Date();
    const expiresAtDate =
      parseOptionalDate(d.expiresAt) ?? new Date(Date.now() + 30 * 86_400_000);
    const cleanExternalUrl = sanitizeOutboundHttpsUrl(d.externalUrl);

    const prov = getProvinceById(hotel.provinceId);
    const scopeLabel = formatPlaceLocationScopeLabel(
      {
        locationScope: hotel.locationScope,
        branchSummaryTh: hotel.branchSummaryTh,
        provinceId: hotel.provinceId,
        provinceNameTh: prov
          ? prov.nameTh.split("(")[0].trim()
          : hotel.provinceId,
        provinceNameEn: prov ? prov.nameEn : hotel.provinceId,
      },
      "th",
    );
    const dateInfo = formatPromoDateRangeLabel(
      startsAtDate.toISOString(),
      expiresAtDate.toISOString(),
      "th",
    );

    const brandedUrl = buildBrandedCardUrl({
      headline: d.promoHeadlineTh,
      brand: hotel.nameTh,
      category: categoryCode,
      scope: scopeLabel,
      dates: dateInfo?.label ?? null,
      code: d.promoCode || null,
    });

    const finalCover =
      d.visualMode === "BRANDED_CARD"
        ? brandedUrl
        : d.coverImageUrl.trim() || hotel.coverImageUrl || brandedUrl;

    const dedupeHash = crypto
      .createHash("sha256")
      .update(`${hotel.id}|${d.titleTh}|${d.promoHeadlineTh}|${Date.now()}`)
      .digest("hex")
      .slice(0, 32);

    const pin = await prisma.pin.create({
      data: {
        hotelId: hotel.id,
        mediaType: "PHOTO",
        category: categoryCode === "STAY" ? "ROOMS" : "DINING",
        titleTh: d.titleTh,
        titleEn: d.titleTh,
        descriptionTh: d.descriptionTh,
        descriptionEn: d.descriptionTh,
        coverImageUrl: finalCover,
        mediaUrls: [finalCover],
        aspectRatio: "1/1",
        provinceId: hotel.provinceId,
        stayStyles: hotel.stayStyles,
        semanticTags: [categoryCode.toLowerCase()],
        sourcePlatform: "MANUAL",
        dealSourceType: cleanExternalUrl ? "EXTERNAL" : "INTERNAL",
        externalDealUrl: cleanExternalUrl || null,
        externalSourceName: hotel.nameTh,
        promoHeadlineTh: d.promoHeadlineTh,
        promoHeadlineEn: d.promoHeadlineTh,
        promoCode: d.promoCode ? d.promoCode.toUpperCase() : null,
        promoOriginalPriceThb: d.originalPriceThb ?? null,
        promoDealPriceThb: d.dealPriceThb ?? null,
        promoStartsAt: startsAtDate,
        promoExpiresAt: expiresAtDate,
        promoCategoryCode: categoryCode,
        visualMode: d.visualMode,
        ingestionHash: dedupeHash,
        isCanonicalCard: false,
        publishStatus: d.publishStatus,
      },
    });

    revalidatePlaceCatalog({ slug: hotel.slug, pinId: pin.id });
    return NextResponse.json({ pin }, { status: 201 });
  } catch (err) {
    if (err instanceof StudioAuthError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.statusCode },
      );
    }
    console.error("[POST /api/studio/promos]", err);
    return NextResponse.json(
      { error: "สร้างโปรโมชั่นไม่สำเร็จ" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const raw = await request.json();
    const parsed = StudioPromoUpdateSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "ข้อมูลไม่ถูกต้อง" },
        { status: 422 },
      );
    }

    const { hotel } = await requireHotelStudioAccess(parsed.data.hotelSlug);
    const d = parsed.data;

    const existing = await prisma.pin.findFirst({
      where: { id: d.id, hotelId: hotel.id },
      select: { id: true, coverImageUrl: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "ไม่พบโปรโมชั่นนี้ในร้านของคุณ" },
        { status: 404 },
      );
    }

    const categoryCode = d.promoCategoryCode || hotel.placeCategory || "STAY";
    const startsAtDate = parseOptionalDate(d.startsAt);
    const expiresAtDate = parseOptionalDate(d.expiresAt);
    const cleanExternalUrl = sanitizeOutboundHttpsUrl(d.externalUrl);

    const prov = getProvinceById(hotel.provinceId);
    const scopeLabel = formatPlaceLocationScopeLabel(
      {
        locationScope: hotel.locationScope,
        branchSummaryTh: hotel.branchSummaryTh,
        provinceId: hotel.provinceId,
        provinceNameTh: prov
          ? prov.nameTh.split("(")[0].trim()
          : hotel.provinceId,
        provinceNameEn: prov ? prov.nameEn : hotel.provinceId,
      },
      "th",
    );
    const dateInfo = formatPromoDateRangeLabel(
      startsAtDate ? startsAtDate.toISOString() : null,
      expiresAtDate ? expiresAtDate.toISOString() : null,
      "th",
    );

    const brandedUrl = buildBrandedCardUrl({
      headline: d.promoHeadlineTh,
      brand: hotel.nameTh,
      category: categoryCode,
      scope: scopeLabel,
      dates: dateInfo?.label ?? null,
      code: d.promoCode || null,
    });

    const nextCover =
      d.visualMode === "BRANDED_CARD"
        ? brandedUrl
        : d.coverImageUrl.trim() ||
          existing.coverImageUrl ||
          hotel.coverImageUrl ||
          brandedUrl;

    const updated = await prisma.pin.update({
      where: { id: existing.id },
      data: {
        titleTh: d.titleTh,
        titleEn: d.titleTh,
        descriptionTh: d.descriptionTh,
        descriptionEn: d.descriptionTh,
        promoHeadlineTh: d.promoHeadlineTh,
        promoHeadlineEn: d.promoHeadlineTh,
        promoCode: d.promoCode ? d.promoCode.toUpperCase() : null,
        promoCategoryCode: categoryCode,
        promoOriginalPriceThb: d.originalPriceThb ?? null,
        promoDealPriceThb: d.dealPriceThb ?? null,
        promoStartsAt: startsAtDate,
        promoExpiresAt: expiresAtDate,
        dealSourceType: cleanExternalUrl ? "EXTERNAL" : "INTERNAL",
        externalDealUrl: cleanExternalUrl || null,
        visualMode: d.visualMode,
        coverImageUrl: nextCover,
        mediaUrls: [nextCover],
        publishStatus: d.publishStatus,
      },
    });

    revalidatePlaceCatalog({ slug: hotel.slug, pinId: updated.id });
    return NextResponse.json({ pin: updated });
  } catch (err) {
    if (err instanceof StudioAuthError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.statusCode },
      );
    }
    console.error("[PUT /api/studio/promos]", err);
    return NextResponse.json(
      { error: "อัปเดตโปรโมชั่นไม่สำเร็จ" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const raw = await request.json();
    const parsed = StudioPromoPatchSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 422 });
    }

    const { hotel } = await requireHotelStudioAccess(parsed.data.hotelSlug);
    const existing = await prisma.pin.findFirst({
      where: { id: parsed.data.pinId, hotelId: hotel.id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "ไม่พบโปรโมชั่นนี้ในร้านของคุณ" },
        { status: 404 },
      );
    }

    if (parsed.data.action === "DELETE") {
      await prisma.pin.delete({ where: { id: existing.id } });
      revalidatePlaceCatalog({ slug: hotel.slug, pinId: existing.id });
      return NextResponse.json({ deleted: true });
    }

    const nextStatus =
      parsed.data.action === "PUBLISH" ? "PUBLISHED" : "PENDING_APPROVAL";
    const updated = await prisma.pin.update({
      where: { id: existing.id },
      data: { publishStatus: nextStatus },
    });

    revalidatePlaceCatalog({ slug: hotel.slug, pinId: updated.id });
    return NextResponse.json({ pin: updated });
  } catch (err) {
    if (err instanceof StudioAuthError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.statusCode },
      );
    }
    console.error("[PATCH /api/studio/promos]", err);
    return NextResponse.json(
      { error: "ดำเนินการไม่สำเร็จ" },
      { status: 500 },
    );
  }
}
