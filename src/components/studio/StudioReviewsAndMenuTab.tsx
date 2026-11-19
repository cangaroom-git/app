"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowLeftRight,
  Building2,
  Crown,
  ExternalLink,
  Globe,
  MessageSquareText,
  Moon,
  Plus,
  Send,
  Star,
  Sun,
} from "lucide-react";
import { formatShortDate } from "@/lib/dateFormatters";
import { ResponsiveSelect } from "@/components/ui/ResponsiveSelect";
import { StandardTextarea } from "@/components/ui/standards";
import type { AuthenticatedMeDto } from "@/types/cangaroom";
import type { StudioPayload } from "@/components/studio/studioTypes";

export function StudioReviewsPanel({
  data,
  onReload,
  onNotify,
}: {
  data: StudioPayload;
  onReload: () => Promise<void>;
  onNotify: (msg: string) => void;
}) {
  const { hotel, reviews } = data;
  const [replyDraftById, setReplyDraftById] = useState<Record<string, string>>(
    {}
  );
  const [openReplyId, setOpenReplyId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const handleSaveReply = async (reviewId: string) => {
    const text = (replyDraftById[reviewId] ?? "").trim();
    setSavingId(reviewId);
    try {
      const res = await fetch("/api/studio/reviews", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotelSlug: hotel.slug,
          reviewId,
          ownerReplyTh: text,
        }),
      });
      if (!res.ok) {
        onNotify("บันทึกคำตอบรีวิวไม่สำเร็จ");
        return;
      }
      setOpenReplyId(null);
      onNotify("บันทึกการตอบกลับรีวิวแล้ว");
      await onReload();
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3 pb-4 border-b border-[var(--color-border)]">
        <div className="space-y-0.5">
          <h1 className="text-[22px] font-semibold text-[var(--color-text-primary)] inline-flex items-center gap-2">
            <Star className="w-5 h-5 fill-current" />
            <span>
              {hotel.ratingAvg.toFixed(1)} · รีวิวจากผู้เข้าพัก ({reviews.length})
            </span>
          </h1>
          <p className="text-[13.5px] text-[var(--color-text-secondary)]">
            ตอบกลับคำชมหรือข้อเสนอแนะเพื่อสร้างความน่าเชื่อถือบนหน้าร้าน cangaroom.com/{hotel.slug}
          </p>
        </div>
      </div>

      {reviews.length === 0 ? (
        <div className="rounded-[16px] bg-[var(--color-background-muted)] py-12 px-6 text-center space-y-2">
          <MessageSquareText
            className="w-8 h-8 mx-auto text-[var(--color-text-secondary)]"
            strokeWidth={1.6}
          />
          <p className="text-[16px] font-semibold text-[var(--color-text-primary)]">
            ยังไม่มีรีวิวสำหรับที่พักนี้
          </p>
          <p className="text-[13.5px] text-[var(--color-text-secondary)]">
            เมื่อมีแขกเข้าพักและรีวิว คะแนนและข้อความจะแสดงที่นี่เพื่อให้คุณตอบกลับได้ทันที
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[var(--color-border)]">
          {reviews.map((rv) => {
            const isReplying = openReplyId === rv.id;
            const draftVal = replyDraftById[rv.id] ?? rv.ownerReplyTh ?? "";

            return (
              <article key={rv.id} className="py-5 first:pt-0 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="h-10 w-10 rounded-full bg-[var(--color-background-muted)] inline-flex items-center justify-center font-semibold text-[14px] text-[var(--color-text-primary)] shrink-0">
                      {rv.authorName[0]}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[15px] font-semibold text-[var(--color-text-primary)] truncate">
                        {rv.authorName}
                      </p>
                      <p className="text-[12.5px] text-[var(--color-text-secondary)]">
                        {rv.roomCode ? `ห้อง ${rv.roomCode} · ` : ""}
                        {formatShortDate(rv.createdAt, "th")}
                      </p>
                    </div>
                  </div>

                  <div className="inline-flex items-center gap-0.5 text-[var(--color-text-primary)] shrink-0">
                    {Array.from({
                      length: Math.max(1, Math.min(5, rv.rating)),
                    }).map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-current" />
                    ))}
                  </div>
                </div>

                <p className="text-[15px] leading-relaxed text-[var(--color-text-primary)]">
                  {rv.commentTh}
                </p>

                {rv.ownerReplyTh && !isReplying && (
                  <div className="rounded-[12px] bg-[var(--color-background-muted)] p-3.5 space-y-1">
                    <p className="text-[12px] font-semibold text-[var(--color-text-secondary)]">
                      คำตอบจาก {hotel.nameTh}
                    </p>
                    <p className="text-[14px] text-[var(--color-text-primary)]">
                      {rv.ownerReplyTh}
                    </p>
                  </div>
                )}

                {isReplying ? (
                  <div className="space-y-3 pt-1">
                    <StandardTextarea
                      label={`ตอบกลับในนาม ${hotel.nameTh}`}
                      rows={3}
                      value={draftVal}
                      onChange={(e) =>
                        setReplyDraftById((prev) => ({
                          ...prev,
                          [rv.id]: e.target.value,
                        }))
                      }
                      placeholder="เขียนคำขอบคุณหรือคำชี้แจงจากเจ้าของที่พัก..."
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={savingId === rv.id}
                        onClick={() => handleSaveReply(rv.id)}
                        className="h-9 px-4 rounded-[10px] bg-[#222222] hover:bg-[#3f3f3f] dark:bg-[#f5f5f5] dark:hover:bg-[#e5e5e5] !text-white dark:!text-[#222222] text-[13px] font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>
                          {savingId === rv.id ? "กำลังบันทึก..." : "ส่งคำตอบ"}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setOpenReplyId(null)}
                        className="h-9 px-3.5 rounded-[10px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[13px] font-semibold cursor-pointer"
                      >
                        ยกเลิก
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setReplyDraftById((prev) => ({
                        ...prev,
                        [rv.id]: rv.ownerReplyTh ?? "",
                      }));
                      setOpenReplyId(rv.id);
                    }}
                    className="text-[13.5px] font-semibold text-[var(--color-text-primary)] underline underline-offset-2 cursor-pointer hover:opacity-75"
                  >
                    {rv.ownerReplyTh ? "แก้ไขคำตอบกลับ" : "ตอบกลับรีวิวนี้"}
                  </button>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function StudioMobileMenuTab({
  data,
  user,
  theme,
  lang,
  onToggleTheme,
  onToggleLang,
  onSwitchHotel,
  onReload,
  onNotify,
}: {
  data: StudioPayload;
  user: AuthenticatedMeDto;
  theme: "light" | "dark";
  lang: "th" | "en";
  onToggleTheme: () => void;
  onToggleLang: () => void;
  onSwitchHotel: (slug: string) => void;
  onReload: () => Promise<void>;
  onNotify: (msg: string) => void;
}) {
  const [showReviews, setShowReviews] = useState(false);
  const ownedHotels = user.ownedHotels || [];

  if (showReviews) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setShowReviews(false)}
          className="text-[14px] font-semibold text-[var(--color-text-primary)] underline underline-offset-2 cursor-pointer"
        >
          ← กลับไปที่เมนู
        </button>
        <StudioReviewsPanel
          data={data}
          onReload={onReload}
          onNotify={onNotify}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="space-y-1">
        <h1 className="text-[24px] font-semibold text-[var(--color-text-primary)]">
          เมนูหลังบ้าน
        </h1>
        <p className="text-[14px] text-[var(--color-text-secondary)]">
          {data.hotel.nameTh} · @{data.hotel.slug}
        </p>
      </div>

      {/* Multi-Property Switcher */}
      {ownedHotels.length > 1 && (
        <div className="space-y-1.5">
          <span className="text-[13px] font-semibold text-[var(--color-text-secondary)] block">
            สลับที่พักที่จัดการ
          </span>
          <ResponsiveSelect
            value={data.hotel.slug}
            onChange={onSwitchHotel}
            sheetTitle="เลือกที่พักที่ต้องการจัดการ"
            triggerClassName="w-full h-11 px-3.5 rounded-[12px] bg-[var(--color-background-muted)] text-[14.5px] font-semibold text-[var(--color-text-primary)]"
            options={ownedHotels.map((item) => ({
              value: item.slug,
              label: item.nameTh,
              sublabel:
                item.pendingBookingsCount > 0
                  ? `${item.pendingBookingsCount} รอตรวจสลิป`
                  : `/${item.slug}`,
            }))}
          />
        </div>
      )}

      {/* Clean Airbnb divide-y Menu List */}
      <div className="divide-y divide-[var(--color-border)]">
        <button
          type="button"
          onClick={() => setShowReviews(true)}
          className="w-full py-4 flex items-center justify-between text-left cursor-pointer"
        >
          <span className="flex items-center gap-3 text-[15.5px] font-medium text-[var(--color-text-primary)]">
            <Star className="w-5 h-5" />
            <span>รีวิวจากผู้เข้าพัก ({data.reviews.length})</span>
          </span>
          <span className="text-[13px] text-[var(--color-text-secondary)]">
            ★ {data.hotel.ratingAvg.toFixed(1)}
          </span>
        </button>

        <Link
          href={`/${data.hotel.slug}`}
          className="w-full py-4 flex items-center justify-between text-[15.5px] font-medium text-[var(--color-text-primary)]"
        >
          <span className="flex items-center gap-3">
            <Building2 className="w-5 h-5" />
            <span>ดูหน้าร้านสาธารณะ</span>
          </span>
          <ExternalLink className="w-4 h-4 text-[var(--color-text-secondary)]" />
        </Link>

        <Link
          href="/register-hotel"
          className="w-full py-4 flex items-center justify-between text-[15.5px] font-medium text-[var(--color-text-primary)]"
        >
          <span className="flex items-center gap-3">
            <Plus className="w-5 h-5" />
            <span>เพิ่มที่พักแห่งใหม่ (ฟรี 0% GP)</span>
          </span>
        </Link>

        {user.role === "SUPER_ADMIN" && (
          <Link
            href="/super-admin"
            className="w-full py-4 flex items-center justify-between text-[15.5px] font-medium text-[var(--color-text-primary)]"
          >
            <span className="flex items-center gap-3">
              <Crown className="w-5 h-5" />
              <span>Super Admin Console</span>
            </span>
          </Link>
        )}

        <button
          type="button"
          onClick={onToggleTheme}
          className="w-full py-4 flex items-center justify-between text-left cursor-pointer"
        >
          <span className="flex items-center gap-3 text-[15.5px] font-medium text-[var(--color-text-primary)]">
            {theme === "dark" ? (
              <Moon className="w-5 h-5" />
            ) : (
              <Sun className="w-5 h-5" />
            )}
            <span>โหมดการแสดงผล</span>
          </span>
          <span className="text-[13px] text-[var(--color-text-secondary)]">
            {theme === "dark" ? "มืด (Dark)" : "สว่าง (Light)"}
          </span>
        </button>

        <button
          type="button"
          onClick={onToggleLang}
          className="w-full py-4 flex items-center justify-between text-left cursor-pointer"
        >
          <span className="flex items-center gap-3 text-[15.5px] font-medium text-[var(--color-text-primary)]">
            <Globe className="w-5 h-5" />
            <span>ภาษา (Language)</span>
          </span>
          <span className="text-[13px] text-[var(--color-text-secondary)]">
            {lang === "th" ? "ภาษาไทย" : "English"}
          </span>
        </button>
      </div>

      {/* Airbnb Signature Switch-to-Traveling Squircle Button */}
      <div className="pt-2">
        <Link
          href="/"
          className="w-full h-12 rounded-[14px] bg-[#222222] hover:bg-[#3f3f3f] dark:bg-[#f5f5f5] dark:hover:bg-[#e5e5e5] !text-white dark:!text-[#222222] text-[15px] font-semibold inline-flex items-center justify-center gap-2 transition-colors"
        >
          <ArrowLeftRight className="w-4 h-4" />
          <span>สลับเป็นโหมดนักเดินทาง</span>
        </Link>
      </div>
    </div>
  );
}
