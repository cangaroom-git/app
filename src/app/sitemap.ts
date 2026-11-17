import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://cangaroom.com"
  ).replace(/\/$/, "");

  const [hotels, posts] = await Promise.all([
    prisma.hotel
      .findMany({
        where: { isPublished: true, verificationStatus: { not: "SUSPENDED" } },
        select: { slug: true, updatedAt: true },
      })
      .catch(() => []),
    prisma.hotelPost
      .findMany({
        where: {
          status: "PUBLISHED",
          hotel: { isPublished: true, verificationStatus: { not: "SUSPENDED" } },
        },
        select: {
          slug: true,
          updatedAt: true,
          hotel: { select: { slug: true } },
        },
      })
      .catch(() => []),
  ]);

  const entries: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/deal`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];

  for (const hotel of hotels) {
    entries.push({
      url: `${baseUrl}/${hotel.slug}`,
      lastModified: hotel.updatedAt,
      changeFrequency: "daily",
      priority: 0.9,
    });
    entries.push({
      url: `${baseUrl}/${hotel.slug}/posts`,
      lastModified: hotel.updatedAt,
      changeFrequency: "weekly",
      priority: 0.75,
    });
  }

  for (const post of posts) {
    entries.push({
      url: `${baseUrl}/${post.hotel.slug}/posts/${post.slug}`,
      lastModified: post.updatedAt,
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }

  return entries;
}

