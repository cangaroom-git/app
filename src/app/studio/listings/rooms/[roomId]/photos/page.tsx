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
      <div className="max-w-[1360px] mx-auto w-full px-4 sm:px-8 lg:px-10 py-14">
        <div className="rounded-[20px] bg-[var(--color-background-muted)]/60 py-16 px-6 text-center space-y-3">
          <BedDouble className="w-8 h-8 mx-auto text-[var(--color-text-tertiary)]" />
          <p className="text-[17px] font-semibold text-[var(--color-text-primary)]">
            ไม่พบประเภทห้องพักนี้
          </p>
          <p className="text-[14px] text-[var(--color-text-secondary)]">
            ห้องพักอาจถูกลบออกไปแล้ว หรือลิงก์ไม่ถูกต้อง
          </p>
          <div className="pt-2">
            <Link
              href={buildHref("/studio/listings/rooms")}
              className="h-10 px-5 rounded-[12px] bg-[#222222] !text-white dark:bg-[#f5f5f5] dark:!text-[#222222] text-[13.5px] font-semibold inline-flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>กลับหน้ารายการห้องพัก</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full bg-[var(--color-background-body)]">
      <div className="max-w-[1360px] mx-auto w-full px-4 sm:px-8 lg:px-10 py-8 lg:py-10 animate-studio-panel-forward">
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
