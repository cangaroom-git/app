"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, Send, Upload, X } from "lucide-react";
import { useModalPresence } from "@/lib/useModalPresence";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";
import { uploadMediaFile } from "@/lib/slipScanner";
import {
  StandardFieldGroup,
  StandardInput,
  StandardTextarea,
} from "@/components/ui/standards";

export interface OwnerQuickPostModalProps {
  isOpen: boolean;
  hotelSlug: string;
  hotelName: string;
  defaultCoverUrl?: string | null;
  onClose: () => void;
  onPosted: () => void | Promise<void>;
}

export function OwnerQuickPostModal({
  isOpen,
  hotelSlug,
  hotelName,
  defaultCoverUrl,
  onClose,
  onPosted,
}: OwnerQuickPostModalProps) {
  const { shouldRender, dataState } = useModalPresence(isOpen, 250);
  useBodyScrollLock(shouldRender);

  const [postKind, setPostKind] = useState<"FEED_POST" | "BLOG">("FEED_POST");
  const [titleTh, setTitleTh] = useState("");
  const [contentTh, setContentTh] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState(defaultCoverUrl || "");
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setPostKind("FEED_POST");
    setTitleTh("");
    setContentTh("");
    setCoverImageUrl(defaultCoverUrl || "");
    setErrorMsg(null);
  }, [isOpen, defaultCoverUrl]);

  useEffect(() => {
    if (!isOpen) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [isOpen, onClose]);

  if (!shouldRender || typeof document === "undefined") return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (titleTh.trim().length < 3) {
      setErrorMsg("กรุณาใส่หัวข้อโพสต์อย่างน้อย 3 ตัวอักษร");
      return;
    }
    if (!coverImageUrl.trim()) {
      setErrorMsg("กรุณาอัปโหลดรูปภาพประกอบโพสต์");
      return;
    }
    if (postKind === "BLOG" && contentTh.trim().length < 20) {
      setErrorMsg("บทความควรมีเนื้อหาอย่างน้อย 20 ตัวอักษร");
      return;
    }
    if (contentTh.trim().length < 3) {
      setErrorMsg("กรุณาเขียนข้อความประกอบโพสต์");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/studio/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotelSlug,
          postKind,
          titleTh: titleTh.trim(),
          excerptTh: contentTh.trim().slice(0, 180),
          contentTh: contentTh.trim(),
          coverImageUrl: coverImageUrl.trim(),
          status: "PUBLISHED",
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setErrorMsg(json.error || "เผยแพร่โพสต์ไม่สำเร็จ");
        return;
      }
      await onPosted();
      onClose();
    } catch {
      setErrorMsg("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="สร้างโพสต์ใหม่"
      onClick={(e) => {
        e.stopPropagation();
        if (e.target === e.currentTarget) onClose();
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center sm:p-5"
    >
      <div
        data-state={dataState}
        onClick={onClose}
        className="cgr-modal-backdrop fixed inset-0 bg-black/45 backdrop-blur-[2px]"
      />

      <div
        data-state={dataState}
        className="cgr-modal-surface-md relative z-10 w-full sm:max-w-[560px] max-h-[90dvh] flex flex-col rounded-t-[24px] sm:rounded-[24px] bg-[var(--color-background-popover)] shadow-[var(--shadow-popover)] overflow-hidden"
      >
        <div className="sm:hidden pt-3 pb-1 flex justify-center shrink-0">
          <span className="h-1 w-10 rounded-full bg-[var(--color-border-emphasized)]" />
        </div>

        <div className="px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <h2 className="text-[18px] font-semibold text-[var(--color-text-primary)] truncate">
              โพสต์อัปเดตหน้าเพจ
            </h2>
            <p className="text-[12.5px] text-[var(--color-text-secondary)] truncate">
              {hotelName} · เผยแพร่ขึ้นหน้าโปรไฟล์ /{hotelSlug} ทันที
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดหน้าต่าง"
            className="h-9 w-9 rounded-[12px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] inline-flex items-center justify-center cursor-pointer transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto overscroll-contain px-6 py-5 space-y-5 pb-[max(20px,env(safe-area-inset-bottom))]"
        >
          {/* Post Kind Toggle */}
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { id: "FEED_POST", label: "โพสต์อัปเดตสั้น" },
                { id: "BLOG", label: "บทความ / คู่มือเที่ยว" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setPostKind(opt.id)}
                className={`h-10 rounded-[12px] text-[13.5px] font-semibold cursor-pointer transition-colors ${
                  postKind === opt.id
                    ? "bg-[var(--color-accent)] !text-[var(--color-on-accent)]"
                    : "bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Square Photo Upload */}
          <div className="flex items-center gap-4">
            {coverImageUrl ? (
              <img
                src={coverImageUrl}
                alt="Preview"
                className="h-20 w-20 rounded-[18px] object-cover bg-[var(--color-background-muted)] shrink-0"
              />
            ) : (
              <div className="h-20 w-20 rounded-[18px] bg-[var(--color-background-muted)] flex items-center justify-center shrink-0 text-[var(--color-text-secondary)]">
                <Upload className="w-5 h-5" />
              </div>
            )}
            <label className="h-10 px-4 rounded-[12px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[13.5px] font-semibold text-[var(--color-text-primary)] inline-flex items-center gap-2 cursor-pointer transition-colors">
              {isUploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              <span>{isUploading ? "กำลังอัปโหลด..." : "อัปโหลดรูปโพสต์"}</span>
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setIsUploading(true);
                  try {
                    const url = await uploadMediaFile(file, "pins");
                    setCoverImageUrl(url);
                  } finally {
                    setIsUploading(false);
                  }
                }}
              />
            </label>
          </div>

          <StandardFieldGroup>
            <StandardInput
              grouped
              label={postKind === "FEED_POST" ? "หัวข้อ / แคปชันสั้น *" : "ชื่อบทความ *"}
              required
              placeholder={
                postKind === "FEED_POST"
                  ? "เช่น เมนูใหม่ประจำฤดูหนาว หรือ บรรยากาศหมอกเช้านี้"
                  : "เช่น 5 จุดเช็กอินน่าแวะรอบที่พัก"
              }
              value={titleTh}
              onChange={(e) => setTitleTh(e.target.value)}
            />
          </StandardFieldGroup>

          <StandardTextarea
            label={postKind === "FEED_POST" ? "รายละเอียดโพสต์ *" : "เนื้อหาบทความ *"}
            rows={5}
            placeholder="เล่าเรื่องราว โปรโมชั่น หรือบรรยากาศล่าสุดให้ผู้ติดตาม..."
            value={contentTh}
            onChange={(e) => setContentTh(e.target.value)}
          />

          {errorMsg && (
            <div className="rounded-[12px] bg-[var(--color-background-muted)] px-4 py-3 text-[13px] font-semibold text-[var(--color-error)]">
              {errorMsg}
            </div>
          )}

          <div className="pt-1 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="h-11 px-5 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[14px] font-semibold text-[var(--color-text-primary)] cursor-pointer transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-11 px-6 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] text-[14px] font-semibold inline-flex items-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>{isSubmitting ? "กำลังเผยแพร่..." : "เผยแพร่โพสต์"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
