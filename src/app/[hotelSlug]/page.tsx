import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { getServerSessionUser } from "@/lib/auth/session";
import {
  getHotelStorefrontBySlug,
  getPlaceMetadataBySlug,
} from "@/lib/services/hotelStorefrontService";
import { getPlaceCategoryMeta } from "@/lib/placeCategories";
import {
  HotelStorefrontClient,
  type HotelProfileTabId,
} from "@/components/hotel/HotelStorefrontClient";

export const dynamic = "force-dynamic";

const SCHEMA_DAY_MAP: Record<string, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

function getSchemaOrgType(placeCategory?: string | null): string {
  switch (placeCategory) {
    case "CAFE":
      return "CafeOrCoffeeShop";
    case "RESTAURANT":
      return "Restaurant";
    case "ATTRACTION":
      return "TouristAttraction";
    case "WELLNESS":
      return "HealthAndBeautyBusiness";
    default:
      return "LodgingBusiness";
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ hotelSlug: string }>;
}): Promise<Metadata> {
  const { hotelSlug } = await params;
  const cleanSlug = (hotelSlug || "").trim().toLowerCase();
  const hotel = await getPlaceMetadataBySlug(cleanSlug);

  if (!hotel) {
    return {
      title: `ไม่พบสถานที่ @${cleanSlug} | Nondii`,
    };
  }

  const catMeta = getPlaceCategoryMeta(hotel.placeCategory);
  const isDirectStay =
    hotel.merchantMode !== "PROFILE_ONLY" && hotel.hasActiveRooms;
  const minPrice = hotel.minWeekdayPriceThb;

  const title = isDirectStay
    ? `${hotel.nameTh} — ที่พัก${hotel.provinceNameTh}${
        minPrice > 0 ? ` เริ่มต้น ฿${minPrice.toLocaleString()}/คืน` : ""
      } | จองตรง 0% GP · Nondii`
    : `${hotel.nameTh} — ${catMeta.labelTh}${hotel.provinceNameTh} | Nondii`;

  const description =
    hotel.descriptionTh ||
    hotel.taglineTh ||
    (isDirectStay
      ? `ดูรูปบรรยากาศ ห้องว่าง และจองตรงกับ ${hotel.nameTh} จ.${hotel.provinceNameTh} ฟรีค่า GP 0% ผ่านระบบ Nondii`
      : `ดูบรรยากาศ โปรโมชั่น เวลาเปิด-ปิด พิกัด และรีวิวของ ${hotel.nameTh} จ.${hotel.provinceNameTh} บน Nondii`);

  const ogImage = hotel.coverImageUrl || hotel.logoUrl || undefined;

  return {
    title,
    description,
    keywords: [
      hotel.nameTh,
      hotel.nameEn,
      `${catMeta.shortLabelTh}${hotel.provinceNameTh}`,
      hotel.districtTh,
      ...hotel.stayStyles,
      isDirectStay ? "จองตรงโรงแรม" : catMeta.labelTh,
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
  const [{ hotelSlug }, sp, sessionUser] = await Promise.all([
    params,
    searchParams ?? Promise.resolve(undefined),
    getServerSessionUser().catch(() => null),
  ]);
  const cleanSlug = (hotelSlug || "").trim().toLowerCase();

  const storefront = await getHotelStorefrontBySlug(cleanSlug, {
    userId: sessionUser?.id ?? null,
  });

  if (!storefront) {
    return (
      <div className="cgr-page-form py-12 text-center space-y-4">
        <h1 className="ty-display">ไม่พบสถานที่ @{cleanSlug}</h1>
        <p className="ty-body text-[var(--color-text-secondary)]">
          ลิงก์โปรไฟล์นี้อาจถูกปิดใช้งานหรือไม่มีอยู่ในระบบ
        </p>
        <Link href="/" className="btn-round-solid inline-flex">
          กลับหน้าแรกสำรวจสถานที่
        </Link>
      </div>
    );
  }

  const { hotel, rooms, reviews } = storefront;
  const isDirectStay =
    hotel.merchantMode !== "PROFILE_ONLY" && rooms.length > 0;
  const schemaType = getSchemaOrgType(hotel.placeCategory);

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

  const openingHoursSpecification = (hotel.openingHours ?? [])
    .filter((oh) => !oh.closed && oh.open && oh.close)
    .map((oh) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: SCHEMA_DAY_MAP[oh.day] ?? oh.day,
      opens: oh.open,
      closes: oh.close,
    }));

  const placeJsonLd = {
    "@context": "https://schema.org",
    "@type": schemaType,
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
    ...(hotel.contactPhone ? { telephone: hotel.contactPhone } : {}),
    ...(hotel.externalWebsiteUrl ? { url: hotel.externalWebsiteUrl } : {}),
    ...(isDirectStay
      ? {
          checkinTime: hotel.checkInTime,
          checkoutTime: hotel.checkOutTime,
          petsAllowed: hotel.petsAllowed,
        }
      : {}),
    ...(openingHoursSpecification.length > 0
      ? { openingHoursSpecification }
      : {}),
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
    ...(isDirectStay && rooms.length > 0
      ? {
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
        }
      : {}),
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(placeJsonLd) }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}
      <HotelStorefrontClient
        key={hotel.slug}
        initialStorefront={storefront}
        hotelSlug={hotel.slug}
        initialTab={initialTab}
      />
    </>
  );
}
