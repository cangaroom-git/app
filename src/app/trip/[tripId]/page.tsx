import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Compass, Lock, MapPinOff } from "lucide-react";
import { getServerSessionUser } from "@/lib/auth/session";
import { getTripBySlugOrId } from "@/lib/services/boardService";
import { getOptimizedPinImageUrl } from "@/lib/mediaUtils";
import { TripSharePageClient } from "@/components/trip/TripSharePageClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tripId: string }>;
}): Promise<Metadata> {
  const [{ tripId }, sessionUser] = await Promise.all([
    params,
    getServerSessionUser(),
  ]);
  const lookup = await getTripBySlugOrId(tripId, sessionUser?.id ?? null);

  if (lookup.status !== "ok") {
    return {
      title: "ทริปบน Nondii",
      robots: { index: false, follow: true },
    };
  }

  const { trip } = lookup;
  const coverUrl = trip.items[0]?.pin.coverImageUrl
    ? getOptimizedPinImageUrl(trip.items[0].pin.coverImageUrl, "hero")
    : undefined;

  const title = `ทริป ${trip.name} (${trip.pinCount} ที่พักพร้อมโปร) | Nondii`;
  const description = `ดูแผนที่เส้นทางและคูปองส่วนลดที่พักในทริป "${trip.name}" โดย ${trip.ownerDisplayName} บน Nondii`;

  return {
    title,
    description,
    robots: { index: false, follow: true },
    openGraph: {
      title,
      description,
      type: "website",
      ...(coverUrl ? { images: [{ url: coverUrl }] } : {}),
    },
    twitter: {
      card: coverUrl ? "summary_large_image" : "summary",
      title,
      description,
      ...(coverUrl ? { images: [coverUrl] } : {}),
    },
  };
}

export default async function PublicTripDetailPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const [{ tripId }, sessionUser] = await Promise.all([
    params,
    getServerSessionUser(),
  ]);
  const lookup = await getTripBySlugOrId(tripId, sessionUser?.id ?? null);

  if (lookup.status === "private") {
    return (
      <div className="cgr-page-standard px-4 sm:px-6 py-16">
        <div className="max-w-[440px] mx-auto rounded-[20px] bg-[var(--color-background-muted)] px-6 py-12 text-center space-y-4">
          <span className="h-12 w-12 rounded-[14px] bg-[var(--color-background-card)] text-[var(--color-text-primary)] inline-flex items-center justify-center mx-auto">
            <Lock className="w-5 h-5" />
          </span>
          <div className="space-y-1.5">
            <h1 className="text-[18px] font-semibold text-[var(--color-text-primary)]">
              ทริปนี้ตั้งค่าเป็นส่วนตัว
            </h1>
            <p className="text-[13.5px] text-[var(--color-text-secondary)] leading-relaxed">
              เจ้าของทริปปิดการแชร์ลิงก์ชั่วคราว คุณสามารถสำรวจโปรที่พักและสร้างทริปของคุณเองได้ฟรีบน Nondii
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
            <Link
              href="/explore"
              className="h-11 px-6 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] text-[14px] font-semibold inline-flex items-center gap-2 transition-colors"
            >
              <Compass className="w-4 h-4" />
              <span>สำรวจแผนที่ที่พัก</span>
            </Link>
            <Link
              href="/"
              className="h-11 px-5 rounded-full bg-[var(--color-background-card)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[14px] font-semibold inline-flex items-center justify-center transition-colors"
            >
              กลับหน้าแรก
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (lookup.status === "not_found") {
    return (
      <div className="cgr-page-standard px-4 sm:px-6 py-16">
        <div className="max-w-[440px] mx-auto rounded-[20px] bg-[var(--color-background-muted)] px-6 py-12 text-center space-y-4">
          <span className="h-12 w-12 rounded-[14px] bg-[var(--color-background-card)] text-[var(--color-text-primary)] inline-flex items-center justify-center mx-auto">
            <MapPinOff className="w-5 h-5" />
          </span>
          <div className="space-y-1.5">
            <h1 className="text-[18px] font-semibold text-[var(--color-text-primary)]">
              ไม่พบทริปที่คุณต้องการ
            </h1>
            <p className="text-[13.5px] text-[var(--color-text-secondary)] leading-relaxed">
              ลิงก์ทริปนี้อาจถูกลบออกหรือพิมพ์ไม่ถูกต้อง ลองสำรวจโปรที่พักบนแผนที่เพื่อสร้างทริปใหม่ได้เลย
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
            <Link
              href="/explore"
              className="h-11 px-6 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] text-[14px] font-semibold inline-flex items-center gap-2 transition-colors"
            >
              <Compass className="w-4 h-4" />
              <span>สำรวจแผนที่ที่พัก</span>
            </Link>
            <Link
              href="/"
              className="h-11 px-5 rounded-full bg-[var(--color-background-card)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[14px] font-semibold inline-flex items-center justify-center transition-colors"
            >
              กลับหน้าแรก
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <TripSharePageClient initialTrip={lookup.trip} />;
}
