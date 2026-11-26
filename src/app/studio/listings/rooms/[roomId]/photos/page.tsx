"use client";

import React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, BedDouble } from "lucide-react";
import { useStudio } from "@/components/studio/StudioContext";
import { RoomPhotoStudio } from "@/components/studio/RoomPhotoStudio";

export default function StudioRoomPhotosPage() {
  const params = useParams<{ roomId?: string }>();
  const router = useRouter();
  const { data, reload, notify, buildHref } = useStudio();

  const rawRoomId =
    typeof params?.roomId === "string" ? decodeURIComponent(params.roomId) : "";
  const room =
    data.rooms.find((r) => r.id === rawRoomId) ??
    data.rooms.find(
      (r) => r.code.toLowerCase() === rawRoomId.trim().toLowerCase()
    ) ??
    null;

  if (!room) {
    return (
      <div className="cgr-admin-page">
        <div className="cgr-admin-body py-12">
          <div className="rounded-[20px] bg-[var(--color-background-muted)]/60 py-16 px-6 text-center space-y-3">
            <BedDouble className="w-8 h-8 mx-auto text-[var(--color-text-tertiary)]" />
            <p className="ws-subtitle">ไม่พบประเภทห้องพักนี้</p>
            <p className="ws-body text-[var(--color-text-secondary)]">
              ห้องพักอาจถูกลบออกไปแล้ว หรือลิงก์ไม่ถูกต้อง
            </p>
            <div className="pt-2">
              <Link
                href={buildHref("/studio/listings/rooms")}
                className="h-10 px-5 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] ws-body-strong inline-flex items-center gap-2 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>กลับหน้ารายการห้องพัก</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cgr-admin-page">
      <div className="cgr-admin-body py-6 sm:py-8 animate-studio-panel-forward">
        <RoomPhotoStudio
          hotelSlug={data.hotel.slug}
          room={room}
          onBack={() => router.push(buildHref("/studio/listings/rooms"))}
          onReload={reload}
          onNotify={notify}
        />
      </div>
    </div>
  );
}
