import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { addDaysToDate, formatDateStr } from "@/lib/bookingMath";
import { getServerSessionUser } from "@/lib/auth/session";
import {
  getHotelStorefrontBySlug,
  getPlaceMetadataBySlug,
} from "@/lib/services/hotelStorefrontService";
import { HotelCheckoutClient } from "@/components/booking/HotelCheckoutClient";

export const dynamic = "force-dynamic";

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
      title: "ยืนยันและชำระเงิน | Nondii",
      robots: { index: false, follow: false },
    };
  }

  return {
    title: `ยืนยันการจอง · ${hotel.nameTh} | Nondii`,
    robots: { index: false, follow: false },
  };
}

export default async function HotelCheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ hotelSlug: string }>;
  searchParams?: Promise<{
    room?: string;
    checkIn?: string;
    checkOut?: string;
    guests?: string;
    coupon?: string;
  }>;
}) {
  const [{ hotelSlug }, sp] = await Promise.all([
    params,
    searchParams ?? Promise.resolve(undefined),
  ]);

  const cleanSlug = (hotelSlug || "").trim().toLowerCase();
  const todayStr = formatDateStr(new Date());
  const defaultCheckIn = addDaysToDate(todayStr, 1);

  const rawIn = sp?.checkIn;
  const checkInDate =
    rawIn && /^\d{4}-\d{2}-\d{2}$/.test(rawIn) && rawIn >= todayStr
      ? rawIn
      : defaultCheckIn;

  const rawOut = sp?.checkOut;
  const checkOutDate =
    rawOut && /^\d{4}-\d{2}-\d{2}$/.test(rawOut) && rawOut > checkInDate
      ? rawOut
      : addDaysToDate(checkInDate, 1);

  const parsedGuests = Number(sp?.guests ?? 2);
  const guests =
    Number.isFinite(parsedGuests) && parsedGuests >= 1
      ? Math.min(12, Math.floor(parsedGuests))
      : 2;

  const sessionUser = await getServerSessionUser().catch(() => null);
  const storefront = await getHotelStorefrontBySlug(cleanSlug, {
    checkInDate,
    checkOutDate,
    userId: sessionUser?.id ?? null,
  });

  if (!storefront) {
    return (
      <div className="cgr-page-form py-12 text-center space-y-4">
        <h1 className="ty-display">ไม่พบที่พัก @{cleanSlug}</h1>
        <Link href="/" className="btn-round-solid inline-flex">
          กลับหน้าแรกสำรวจที่พัก
        </Link>
      </div>
    );
  }

  return (
    <HotelCheckoutClient
      initialStorefront={storefront}
      initialRoomParam={sp?.room ?? null}
      initialCheckIn={checkInDate}
      initialCheckOut={checkOutDate}
      initialGuests={guests}
      initialCouponParam={sp?.coupon ?? null}
    />
  );
}

