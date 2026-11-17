"use client";

import React from "react";
import Link from "next/link";
import {
  Bookmark,
  ExternalLink,
  Flame,
  MessageCircle,
  Phone,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import type { StudioPayload } from "@/components/studio/studioTypes";

export function StudioOverviewTab({
  data,
  onJumpToTab,
}: {
  data: StudioPayload;
  onJumpToTab: (
    tab: "overview" | "bookings" | "rooms" | "pins" | "posts" | "coupons"
  ) => void;
}) {
  const { hotel, stats } = data;

  return (
    <div className="space-y-6">
      {/* Wishlist Intent & Direct ROI Hero */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-[20px] bg-[var(--color-promo-muted)]/65 border border-[var(--color-promo-border)] p-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="ty-caption font-bold text-[var(--color-promo-text)]">
              บันทึกเข้า /board
            </span>
            <Bookmark className="w-4 h-4 text-[var(--color-text-secondary)]" />
          </div>
          <p className="ty-display">
            {stats.boardSavesCount} ครั้ง
          </p>
          <p className="ty-caption">
            นักเดินทางที่กำลังเล็งที่พักของคุณอยู่
          </p>
        </div>

        <div className="rounded-[20px] bg-[var(--color-background-card)] border border-[var(--color-border)] p-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="ty-caption font-bold">ยอดทักติดต่อตรง</span>
            <MessageCircle className="w-4 h-4 text-[var(--color-text-secondary)]" />
          </div>
          <p className="ty-display">{stats.contactClicksTotal} ครั้ง</p>
          <p className="ty-caption">
            LINE {stats.contactClicksByChannel.LINE} · FB{" "}
            {stats.contactClicksByChannel.FACEBOOK_MESSENGER} · โทร{" "}
            {stats.contactClicksByChannel.PHONE}
          </p>
        </div>

        <div className="rounded-[20px] bg-[var(--color-background-card)] border border-[var(--color-border)] p-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="ty-caption font-bold">ยอดจองตรง 0% GP</span>
            <TrendingUp className="w-4 h-4 text-[var(--color-accent)]" />
          </div>
          <p className="ty-display text-[var(--color-accent)]">
            ฿{stats.confirmedRevenueThb.toLocaleString()}
          </p>
          <p className="ty-caption">
            ประหยัดค่า GP OTA แล้ว ~฿
            {stats.estimatedOtaGpSavedThb.toLocaleString()}
          </p>
        </div>

        <div className="rounded-[20px] bg-[var(--color-background-card)] border border-[var(--color-border)] p-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="ty-caption font-bold">สถานะเพจที่พัก</span>
            <ShieldCheck className="w-4 h-4 text-[var(--color-success)]" />
          </div>
          <p className="ty-title font-bold">
            {hotel.verificationStatus === "VERIFIED"
              ? "Verified จริง 100%"
              : hotel.verificationStatus === "PENDING_REVIEW"
              ? "รอแอดมินตรวจสอบ"
              : "ถูกระงับชั่วคราว"}
          </p>
          <Link
            href={`/${hotel.slug}`}
            className="ty-caption font-semibold text-[var(--color-accent)] hover:underline inline-flex items-center gap-1"
          >
            <span>cangaroom.com/{hotel.slug}</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Action Prompts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-[20px] bg-[var(--color-background-card)] border border-[var(--color-border)] p-5 space-y-3">
          <h2 className="ty-subtitle font-bold flex items-center gap-2">
            <Flame className="w-5 h-5 text-[var(--color-promo)]" />
            <span>เปลี่ยนคนกดบันทึกใน /board ให้เป็นยอดจองจริง</span>
          </h2>
          <p className="ty-body text-[var(--color-text-secondary)]">
            ขณะนี้มีผู้ใช้งานบันทึก Pin ของคุณเก็บไว้ในบอร์ดแล้ว{" "}
            <strong>{stats.boardSavesCount}</strong> รายการ!
            สร้างคูปองส่วนลดพิเศษเพื่อให้ระบบส่งแจ้งเตือนและดันที่พักขึ้นหน้า{" "}
            <code>/deal</code> ได้ทันที
          </p>
          <button
            type="button"
            onClick={() => onJumpToTab("coupons")}
            className="btn-promo-solid"
          >
            สร้างคูปองเรียกลูกค้า
          </button>
        </div>

        <div className="rounded-[20px] bg-[var(--color-background-card)] border border-[var(--color-border)] p-5 space-y-3">
          <h2 className="ty-subtitle font-bold flex items-center gap-2">
            <Phone className="w-5 h-5 text-[var(--color-accent)]" />
            <span>ซิงก์รูปสวยจาก Facebook Page แบบไม่ต้องอัปโหลดใหม่</span>
          </h2>
          <p className="ty-body text-[var(--color-text-secondary)]">
            มีโพสต์จาก Facebook ที่ผ่านการคัดกรองด้วย AI รอคุณกดอนุมัติอยู่{" "}
            <strong>{stats.pendingSyncPinsCount}</strong> รายการ
          </p>
          <button
            type="button"
            onClick={() => onJumpToTab("pins")}
            className="btn-round-solid"
          >
            ตรวจและอนุมัติ Pin ใน 1 คลิก
          </button>
        </div>
      </div>
    </div>
  );
}

