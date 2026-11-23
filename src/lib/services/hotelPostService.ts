import { cache } from "react";
import { unstable_cache } from "next/cache";
import { getProvinceById } from "@/data/thailandProvinces";
import { NONDII_CACHE_TAGS } from "@/lib/cache/revalidateNondii";
import { prisma } from "@/lib/prisma";
import type {
  HotelPostDetailDto,
  HotelPostSummaryDto,
} from "@/types/cangaroom";

export function normalizePostSlug(rawSlug?: string | null, fallbackTitle?: string): string {
  const candidate = (rawSlug?.trim() || fallbackTitle?.trim() || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (candidate.length >= 3) {
    return candidate.slice(0, 80);
  }
  return `story-${Date.now().toString(36)}`;
}

export interface HotelPostQueryRow {
  id: string;
  hotelId: string;
  roomId: string | null;
  slug: string;
  titleTh: string;
  titleEn: string;
  excerptTh: string;
  contentTh: string;
  coverImageUrl: string;
  galleryUrls: string[];
  postKind?: "FEED_POST" | "BLOG";
  categoryTh: string;
  tags: string[];
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  viewsCount: number;
  publishedAt: Date;
  room?: {
    code: string;
    nameTh: string;
    weekdayPriceThb: number;
  } | null;
}

export function mapHotelPostToSummaryDto(
  row: HotelPostQueryRow,
  hotel: {
    slug: string;
    nameTh: string;
    logoUrl: string | null;
    verificationStatus: "PENDING_REVIEW" | "VERIFIED" | "SUSPENDED";
    provinceId: string;
  }
): HotelPostSummaryDto {
  const prov = getProvinceById(hotel.provinceId);
  return {
    id: row.id,
    hotelId: row.hotelId,
    hotelSlug: hotel.slug,
    hotelNameTh: hotel.nameTh,
    hotelLogoUrl: hotel.logoUrl,
    hotelVerificationStatus: hotel.verificationStatus,
    provinceNameTh: prov?.nameTh || hotel.provinceId,
    roomId: row.roomId,
    roomCode: row.room?.code ?? null,
    roomNameTh: row.room?.nameTh ?? null,
    roomPriceThb: row.room?.weekdayPriceThb ?? null,
    slug: row.slug,
    titleTh: row.titleTh,
    excerptTh:
      row.excerptTh.trim() ||
      row.contentTh.replace(/[#*`>\-\n]+/g, " ").trim().slice(0, 160),
    coverImageUrl: row.coverImageUrl,
    galleryUrls: row.galleryUrls ?? [],
    postKind: row.postKind ?? "BLOG",
    categoryTh: row.categoryTh,
    tags: row.tags,
    status: row.status,
    viewsCount: row.viewsCount,
    publishedAt: row.publishedAt.toISOString(),
  };
}

export function mapHotelPostToDetailDto(
  row: HotelPostQueryRow,
  hotel: {
    slug: string;
    nameTh: string;
    logoUrl: string | null;
    verificationStatus: "PENDING_REVIEW" | "VERIFIED" | "SUSPENDED";
    provinceId: string;
  }
): HotelPostDetailDto {
  return {
    ...mapHotelPostToSummaryDto(row, hotel),
    contentTh: row.contentTh,
    galleryUrls: row.galleryUrls,
  };
}

export const listPublishedHotelPostsBySlug = cache(
  async (rawHotelSlug: string) => {
    const slug = rawHotelSlug.trim().toLowerCase();
    if (!slug) return null;

    return unstable_cache(
      async () => {
        const hotel = await prisma.hotel.findUnique({
          where: { slug },
          select: {
            id: true,
            slug: true,
            nameTh: true,
            nameEn: true,
            taglineTh: true,
            logoUrl: true,
            coverImageUrl: true,
            provinceId: true,
            districtTh: true,
            verificationStatus: true,
            posts: {
              where: { status: "PUBLISHED" },
              orderBy: { publishedAt: "desc" },
              select: {
                id: true,
                hotelId: true,
                roomId: true,
                slug: true,
                titleTh: true,
                titleEn: true,
                excerptTh: true,
                contentTh: true,
                coverImageUrl: true,
                galleryUrls: true,
                postKind: true,
                categoryTh: true,
                tags: true,
                status: true,
                viewsCount: true,
                publishedAt: true,
                room: {
                  select: { code: true, nameTh: true, weekdayPriceThb: true },
                },
              },
            },
          },
        });

        if (!hotel) return null;

        const prov = getProvinceById(hotel.provinceId);
        return {
          hotel: {
            id: hotel.id,
            slug: hotel.slug,
            nameTh: hotel.nameTh,
            nameEn: hotel.nameEn || hotel.nameTh,
            taglineTh: hotel.taglineTh,
            logoUrl: hotel.logoUrl,
            coverImageUrl: hotel.coverImageUrl,
            provinceId: hotel.provinceId,
            provinceNameTh: prov?.nameTh || hotel.provinceId,
            districtTh: hotel.districtTh,
            verificationStatus: hotel.verificationStatus,
          },
          posts: hotel.posts.map((p) => mapHotelPostToSummaryDto(p, hotel)),
        };
      },
      [`hotel-posts-index-v1-${slug}`],
      {
        revalidate: 1800,
        tags: [NONDII_CACHE_TAGS.places, NONDII_CACHE_TAGS.place(slug)],
      }
    )();
  }
);

export function incrementHotelPostViews(postId: string): void {
  if (!postId) return;
  prisma.hotelPost
    .update({
      where: { id: postId },
      data: { viewsCount: { increment: 1 } },
    })
    .catch(() => {});
}

export const getPublishedHotelPostDetail = cache(
  async (rawHotelSlug: string, rawPostSlug: string) => {
    const hotelSlug = rawHotelSlug.trim().toLowerCase();
    const postSlug = rawPostSlug.trim().toLowerCase();
    if (!hotelSlug || !postSlug) return null;

    return unstable_cache(
      async () => {
        const hotel = await prisma.hotel.findUnique({
          where: { slug: hotelSlug },
          select: {
            id: true,
            slug: true,
            nameTh: true,
            nameEn: true,
            taglineTh: true,
            logoUrl: true,
            coverImageUrl: true,
            provinceId: true,
            districtTh: true,
            contactLine: true,
            contactPhone: true,
            verificationStatus: true,
          },
        });

        if (!hotel) return null;

        const post = await prisma.hotelPost.findUnique({
          where: {
            hotelId_slug: {
              hotelId: hotel.id,
              slug: postSlug,
            },
          },
          select: {
            id: true,
            hotelId: true,
            roomId: true,
            slug: true,
            titleTh: true,
            titleEn: true,
            excerptTh: true,
            contentTh: true,
            coverImageUrl: true,
            galleryUrls: true,
            postKind: true,
            categoryTh: true,
            tags: true,
            status: true,
            viewsCount: true,
            publishedAt: true,
            room: {
              select: {
                id: true,
                code: true,
                nameTh: true,
                shortDescTh: true,
                weekdayPriceThb: true,
                maxGuests: true,
                sizeSqm: true,
                galleryUrls: true,
              },
            },
          },
        });

        if (!post || post.status !== "PUBLISHED") return null;

        const relatedRaw = await prisma.hotelPost.findMany({
          where: {
            hotelId: hotel.id,
            status: "PUBLISHED",
            id: { not: post.id },
          },
          orderBy: { publishedAt: "desc" },
          take: 3,
          select: {
            id: true,
            hotelId: true,
            roomId: true,
            slug: true,
            titleTh: true,
            titleEn: true,
            excerptTh: true,
            contentTh: true,
            coverImageUrl: true,
            galleryUrls: true,
            postKind: true,
            categoryTh: true,
            tags: true,
            status: true,
            viewsCount: true,
            publishedAt: true,
            room: {
              select: { code: true, nameTh: true, weekdayPriceThb: true },
            },
          },
        });

        const prov = getProvinceById(hotel.provinceId);
        return {
          hotel: {
            ...hotel,
            nameEn: hotel.nameEn || hotel.nameTh,
            provinceNameTh: prov?.nameTh || hotel.provinceId,
          },
          post: mapHotelPostToDetailDto(post, hotel),
          linkedRoom: post.room
            ? {
                id: post.room.id,
                code: post.room.code,
                nameTh: post.room.nameTh,
                shortDescTh: post.room.shortDescTh,
                weekdayPriceThb: post.room.weekdayPriceThb,
                maxGuests: post.room.maxGuests,
                sizeSqm: post.room.sizeSqm,
                coverImageUrl: post.room.galleryUrls[0] || hotel.coverImageUrl,
              }
            : null,
          relatedPosts: relatedRaw.map((rp) =>
            mapHotelPostToSummaryDto(rp, hotel)
          ),
        };
      },
      [`hotel-post-detail-v1-${hotelSlug}-${postSlug}`],
      {
        revalidate: 1800,
        tags: [NONDII_CACHE_TAGS.places, NONDII_CACHE_TAGS.place(hotelSlug)],
      }
    )();
  }
);

