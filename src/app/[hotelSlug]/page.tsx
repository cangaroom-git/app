import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { getServerSessionUser } from "@/lib/auth/session";
import { getHotelStorefrontBySlug } from "@/lib/services/hotelStorefrontService";
import {
  HotelStorefrontClient,
  type HotelProfileTabId,
} from "@/components/hotel/HotelStorefrontClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ hotelSlug: string }>;
}): Promise<Metadata> {
  const { hotelSlug } = await params;
  const cleanSlug = (hotelSlug || "").trim().toLowerCase();
  const storefront = await getHotelStorefrontBySlug(cleanSlug);

  if (!storefront) {
    return {
      title: `ไม่พบที่พัก @${cleanSlug} | Nondii`,
    };
  }

  const { hotel, rooms } = storefront;
  const minPrice = rooms.reduce(
    (min, r) => (r.weekdayPriceThb < min ? r.weekdayPriceThb : min),
    rooms[0]?.weekdayPriceThb ?? 0
  );

  const title = `${hotel.nameTh} — ที่พัก${hotel.provinceNameTh}${
    minPrice > 0 ? ` เริ่มต้น ฿${minPrice.toLocaleString()}/คืน` : ""
  } | จองตรง 0% GP · Nondii`;

  const description =
    hotel.descriptionTh ||
    hotel.taglineTh ||
    `ดูรูปบรรยากาศ ห้องว่าง และจองตรงกับ ${hotel.nameTh} จ.${hotel.provinceNameTh} ฟรีค่า GP 0% ผ่านระบบ Nondii`;

  const ogImage = hotel.coverImageUrl || hotel.logoUrl || undefined;

  return {
    title,
    description,
    keywords: [
      hotel.nameTh,
      hotel.nameEn,
      `ที่พัก${hotel.provinceNameTh}`,
      hotel.districtTh,
      ...hotel.stayStyles,
      "จองตรงโรงแรม",
    ].filter(Boolean),
    alternates: {
      canonical: `/${hotel.slug}`,
    },
    openGraph: {
      type: "website",
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

export default async function HotelStorefrontPage({
  params,
  searchParams,
}: {
  params: Promise<{ hotelSlug: string }>;
  searchParams?: Promise<{ tab?: string; room?: string; coupon?: string }>;
}) {
  const [{ hotelSlug }, sp] = await Promise.all([
    params,
    searchParams ?? Promise.resolve(undefined),
  ]);
  const cleanSlug = (hotelSlug || "").trim().toLowerCase();

  const sessionUser = await getServerSessionUser().catch(() => null);
  const storefront = await getHotelStorefrontBySlug(cleanSlug, {
    userId: sessionUser?.id ?? null,
  });

  if (!storefront) {
    return (
      <div className="cgr-page-form py-12 text-center space-y-4">
        <h1 className="ty-display">ไม่พบที่พัก @{cleanSlug}</h1>
        <p className="ty-body text-[var(--color-text-secondary)]">
          ลิงก์หน้าร้านนี้อาจถูกปิดใช้งานหรือไม่มีอยู่ในระบบ
        </p>
        <Link href="/" className="btn-round-solid inline-flex">
          กลับหน้าแรกสำรวจที่พัก
        </Link>
      </div>
    );
  }

  const { hotel, rooms, reviews } = storefront;

  const rawTab = sp?.tab;
  const initialTab: HotelProfileTabId =
    rawTab === "rooms" ||
    rawTab === "blog" ||
    rawTab === "reviews" ||
    rawTab === "more" ||
    rawTab === "posts"
      ? rawTab
      : rawTab === "info"
      ? "more"
      : sp?.room || sp?.coupon
      ? "rooms"
      : "posts";

  const photoObjects = rooms.flatMap((r) =>
    (r.galleryMeta && r.galleryMeta.length > 0
      ? r.galleryMeta
      : r.galleryUrls.map((url) => ({
          url,
          space: "additional" as const,
          captionTh: undefined,
        }))
    ).map((photo) => ({
      "@type": "ImageObject",
      url: photo.url,
      name: `${hotel.nameTh} — ${r.nameTh}`,
      ...(photo.captionTh ? { caption: photo.captionTh, description: photo.captionTh } : {}),
    }))
  );

  const lodgingJsonLd = {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    name: hotel.nameTh,
    alternateName: hotel.nameEn,
    description: hotel.descriptionTh || hotel.taglineTh,
    image:
      photoObjects.length > 0
        ? [
            ...(hotel.coverImageUrl
              ? [{ "@type": "ImageObject", url: hotel.coverImageUrl, name: hotel.nameTh }]
              : []),
            ...photoObjects.slice(0, 20),
          ]
        : hotel.coverImageUrl || hotel.logoUrl,
    telephone: hotel.contactPhone,
    checkinTime: hotel.checkInTime,
    checkoutTime: hotel.checkOutTime,
    petsAllowed: hotel.petsAllowed,
    address: {
      "@type": "PostalAddress",
      streetAddress: hotel.addressTh,
      addressLocality: hotel.districtTh,
      addressRegion: hotel.provinceNameTh,
      addressCountry: "TH",
    },
    ...(hotel.latitude && hotel.longitude
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: hotel.latitude,
            longitude: hotel.longitude,
          },
        }
      : {}),
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: hotel.ratingAvg,
      reviewCount: Math.max(1, hotel.reviewCount),
    },
    ...(reviews.length > 0
      ? {
          review: reviews.slice(0, 6).map((rv) => ({
            "@type": "Review",
            author: { "@type": "Person", name: rv.authorName },
            reviewRating: {
              "@type": "Rating",
              ratingValue: rv.rating,
              bestRating: 5,
            },
            reviewBody: rv.commentTh,
            datePublished: rv.createdAt,
          })),
        }
      : {}),
    makesOffer: rooms.map((r) => ({
      "@type": "Offer",
      name: r.nameTh,
      description: r.shortDescTh,
      ...(r.galleryUrls.length > 0 ? { image: r.galleryUrls.slice(0, 8) } : {}),
      price: r.weekdayPriceThb,
      priceCurrency: "THB",
      availability:
        r.availableUnits > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/SoldOut",
    })),
  };

  const faqJsonLd =
    hotel.faqs.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: hotel.faqs.map((f) => ({
            "@type": "Question",
            name: f.qTh,
            acceptedAnswer: {
              "@type": "Answer",
              text: f.aTh,
            },
          })),
        }
      : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(lodgingJsonLd) }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}
      <HotelStorefrontClient
        initialStorefront={storefront}
        hotelSlug={hotel.slug}
        initialTab={initialTab}
      />
    </>
  );
}
