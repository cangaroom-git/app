"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Edit3,
  Eye,
  ExternalLink,
  FileText,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { uploadMediaFile } from "@/lib/slipScanner";
import {
  StandardButton,
  StandardInput,
  StatusPill,
} from "@/components/ui/standards";
import type { PostPublishStatusDto } from "@/types/cangaroom";
import type { StudioPayload } from "@/components/studio/studioTypes";

const POST_CATEGORIES = [
  "คู่มือเที่ยว & ที่พัก",
  "รีวิวจริงจากที่พัก",
  "แนะนำห้องพัก & โปรโมชั่น",
  "คาเฟ่ & จุดเช็กอินใกล้เคียง",
];

export function StudioBlogPostsTab({
  data,
  onReload,
  onNotify,
}: {
  data: StudioPayload;
  onReload: () => Promise<void>;
  onNotify: (msg: string) => void;
}) {
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [titleTh, setTitleTh] = useState("");
  const [slug, setSlug] = useState("");
  const [categoryTh, setCategoryTh] = useState(POST_CATEGORIES[0]);
  const [roomId, setRoomId] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState(
    data.hotel.coverImageUrl || ""
  );
  const [excerptTh, setExcerptTh] = useState("");
  const [contentTh, setContentTh] = useState("");
  const [tagsRaw, setTagsRaw] = useState("");
  const [status, setStatus] = useState<PostPublishStatusDto>("PUBLISHED");
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const resetForm = () => {
    setEditingPostId(null);
    setTitleTh("");
    setSlug("");
    setCategoryTh(POST_CATEGORIES[0]);
    setRoomId("");
    setCoverImageUrl(data.hotel.coverImageUrl || "");
    setExcerptTh("");
    setContentTh("");
    setTagsRaw("");
    setStatus("PUBLISHED");
  };

  const handleLoadForEdit = (postId: string) => {
    const found = data.posts.find((p) => p.id === postId);
    if (!found) return;
    setEditingPostId(found.id);
    setTitleTh(found.titleTh);
    setSlug(found.slug);
    setCategoryTh(found.categoryTh);
    setRoomId(found.roomId || "");
    setCoverImageUrl(found.coverImageUrl);
    setExcerptTh(found.excerptTh);
    setContentTh(found.contentTh);
    setTagsRaw(found.tags.join(", "));
    setStatus(found.status);
  };

  const handleUploadCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingCover(true);
    try {
      const url = await uploadMediaFile(file, "pins");
      setCoverImageUrl(url);
      onNotify("อัปโหลดภาพปกบทความสำเร็จ");
    } catch {
      onNotify("อัปโหลดภาพปกไม่สำเร็จ");
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleSubmitPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleTh.trim() || !contentTh.trim() || !coverImageUrl.trim()) {
      onNotify("กรุณากรอกหัวข้อ เนื้อหาบทความ และรูปหน้าปกให้ครบถ้วน");
      return;
    }

    const tags = tagsRaw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/studio/posts", {
        method: editingPostId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotelSlug: data.hotel.slug,
          ...(editingPostId ? { id: editingPostId } : { slug: slug.trim() || undefined }),
          roomId: roomId || null,
          titleTh: titleTh.trim(),
          excerptTh: excerptTh.trim(),
          contentTh: contentTh.trim(),
          coverImageUrl: coverImageUrl.trim(),
          categoryTh,
          tags,
          status,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        onNotify(json.error || "บันทึกบทความไม่สำเร็จ");
        return;
      }
      onNotify(
        editingPostId
          ? "อัปเดตบทความเรียบร้อยแล้ว"
          : "เผยแพร่บทความ SEO ลงหน้าร้านที่พักแล้ว"
      );
      resetForm();
      await onReload();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (
    postId: string,
    nextStatus: PostPublishStatusDto
  ) => {
    setBusyId(postId);
    try {
      const res = await fetch("/api/studio/posts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotelSlug: data.hotel.slug,
          id: postId,
          status: nextStatus,
        }),
      });
      if (res.ok) {
        onNotify(
          nextStatus === "PUBLISHED"
            ? "เผยแพร่บทความขึ้นหน้าร้านแล้ว"
            : "เปลี่ยนสถานะเป็นฉบับร่างแล้ว"
        );
        await onReload();
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleDeletePost = async (postId: string) => {
    setBusyId(postId);
    try {
      const res = await fetch(
        `/api/studio/posts?id=${encodeURIComponent(postId)}&hotel=${encodeURIComponent(
          data.hotel.slug
        )}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        if (editingPostId === postId) resetForm();
        onNotify("ลบบทความออกจากระบบแล้ว");
        await onReload();
      }
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. Native UGC & SEO Blog Post Authoring Form */}
      <form
        onSubmit={handleSubmitPost}
        className="rounded-[20px] bg-[var(--color-background-card)] border border-[var(--color-border)] p-5 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="space-y-1">
            <h2 className="ty-title flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[var(--color-accent)]" />
              <span>
                {editingPostId
                  ? "แก้ไขบทความ Blog / คู่มือท่องเที่ยว"
                  : "เขียนบทความ Blog / รีวิวที่พัก (สร้าง SEO UGC เองบน Cangaroom)"}
              </span>
            </h2>
            <p className="ty-caption">
              บทความจะสร้างหน้า URL ถาวร cangaroom.com/{data.hotel.slug}/posts/ชื่อบทความ
              พร้อม Schema.org BlogPosting และการ์ดจองห้องพัก 0% GP ท้ายบทความอัตโนมัติ
            </p>
          </div>
          {editingPostId && (
            <StandardButton
              type="button"
              variant="secondary"
              size="sm"
              onClick={resetForm}
            >
              ยกเลิกการแก้ไข (เขียนบทความใหม่)
            </StandardButton>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <StandardInput
              label="หัวข้อบทความ (H1 SEO) *"
              placeholder="เช่น คู่มือเที่ยวหมู่บ้านสะปัน จ.น่าน ช่วงปลายฝนต้นหนาว"
              value={titleTh}
              onChange={(e) => setTitleTh(e.target.value)}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="ty-body font-semibold text-[var(--color-text-primary)]">
                  หมวดหมู่บทความ
                </span>
                <select
                  className="fw-input w-full h-10"
                  value={categoryTh}
                  onChange={(e) => setCategoryTh(e.target.value)}
                >
                  {POST_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </label>

              <StandardInput
                label="ลิงก์ Slug ภาษาอังกฤษ"
                optionalText={editingPostId ? "ล็อกถาวร" : "ไม่บังคับ"}
                placeholder="เช่น sapan-winter-guide"
                value={slug}
                disabled={Boolean(editingPostId)}
                onChange={(e) => setSlug(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="ty-body font-semibold text-[var(--color-text-primary)]">
                  แนบการ์ดจองห้องพักท้ายบทความ
                </span>
                <select
                  className="fw-input w-full h-10"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                >
                  <option value="">ไม่ระบุห้องเฉพาะ</option>
                  {data.rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nameTh} ({r.code}) — ฿
                      {r.weekdayPriceThb.toLocaleString()}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="ty-body font-semibold text-[var(--color-text-primary)]">
                  สถานะการเผยแพร่
                </span>
                <select
                  className="fw-input w-full h-10"
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as PostPublishStatusDto)
                  }
                >
                  <option value="PUBLISHED">เผยแพร่ทันที (SEO Public)</option>
                  <option value="DRAFT">บันทึกเป็นฉบับร่าง (Draft)</option>
                </select>
              </label>
            </div>

            <StandardInput
              label="แท็กคีย์เวิร์ด SEO (คั่นด้วยจุลภาค)"
              optionalText="ไม่บังคับ"
              placeholder="เช่น น่าน, สะปัน, ทะเลหมอก, ที่พักวิวเขา"
              value={tagsRaw}
              onChange={(e) => setTagsRaw(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <div>
              <span className="ty-body font-semibold block mb-1.5">
                รูปภาพหน้าปกบทความ *
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <label className="btn-fw-secondary cursor-pointer shrink-0">
                  <Upload className="w-4 h-4" />
                  <span>
                    {isUploadingCover ? "กำลังอัปโหลด..." : "อัปโหลดรูปปก"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={handleUploadCover}
                  />
                </label>
                <input
                  type="url"
                  className="fw-input flex-1 min-w-[180px]"
                  placeholder="หรือวาง URL รูปภาพหน้าปก"
                  value={coverImageUrl}
                  onChange={(e) => setCoverImageUrl(e.target.value)}
                />
              </div>
            </div>

            {coverImageUrl && (
              <div className="rounded-[14px] overflow-hidden border border-[var(--color-border)] bg-[var(--color-background-muted)] h-40">
                <img
                  src={coverImageUrl}
                  alt="ตัวอย่างรูปหน้าปกบทความ"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <StandardInput
              label="คำโปรยสรุป (Meta Description)"
              optionalText="ไม่บังคับ"
              placeholder="สรุปสั้นๆ 1-2 ประโยคสำหรับแสดงบน Google และการ์ดหน้าร้าน"
              value={excerptTh}
              onChange={(e) => setExcerptTh(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="ty-body font-semibold block mb-1.5">
            เนื้อหาบทความฉบับเต็ม (รองรับหัวข้อขึ้นต้นด้วย ## / ### และรายการแบบ - ) *
          </label>
          <textarea
            rows={8}
            className="fw-input w-full leading-relaxed"
            placeholder="เล่าเรื่องราว จุดเช็กอิน คาเฟ่ใกล้ที่พัก หรือรายละเอียดห้องพักที่น่าสนใจ..."
            value={contentTh}
            onChange={(e) => setContentTh(e.target.value)}
            required
          />
        </div>

        <div className="flex justify-end">
          <StandardButton
            type="submit"
            variant="primary"
            size="md"
            disabled={isSubmitting || isUploadingCover}
          >
            <Plus className="w-4 h-4" />
            <span>
              {isSubmitting
                ? "กำลังบันทึก..."
                : editingPostId
                ? "อัปเดตบทความ"
                : "เผยแพร่บทความใหม่"}
            </span>
          </StandardButton>
        </div>
      </form>

      {/* 2. Existing Blog Posts List */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="ty-title flex items-center gap-2">
            <FileText className="w-5 h-5 text-[var(--color-accent)]" />
            <span>บทความของที่พักทั้งหมด ({data.posts.length})</span>
          </h3>
          <Link
            href={`/${data.hotel.slug}/posts`}
            className="ty-caption font-semibold text-[var(--color-accent)] hover:underline inline-flex items-center gap-1"
          >
            <span>ดูหน้ารวมบทความสาธารณะ</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>

        {data.posts.length === 0 ? (
          <div className="rounded-[18px] bg-[var(--color-background-muted)] p-8 text-center ty-body">
            ยังไม่มีบทความ Blog — เขียนบทความแรกด้านบนเพื่อเพิ่มเนื้อหา SEO ให้ที่พักของคุณครับ
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.posts.map((post) => (
              <article
                key={post.id}
                className="rounded-[20px] bg-[var(--color-background-card)] border border-[var(--color-border)] overflow-hidden flex flex-col sm:flex-row"
              >
                <img
                  src={post.coverImageUrl}
                  alt={post.titleTh}
                  className="w-full sm:w-36 h-40 sm:h-auto object-cover shrink-0 bg-[var(--color-background-muted)]"
                />
                <div className="flex-1 min-w-0 p-4 flex flex-col justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <StatusPill
                        variant={
                          post.status === "PUBLISHED" ? "success" : "neutral"
                        }
                      >
                        {post.status === "PUBLISHED" ? "เผยแพร่แล้ว" : "ฉบับร่าง"}
                      </StatusPill>
                      <span className="ty-caption inline-flex items-center gap-1 ml-auto">
                        <Eye className="w-3.5 h-3.5" />
                        {post.viewsCount}
                      </span>
                    </div>
                    <h4 className="ty-body font-bold line-clamp-2">
                      {post.titleTh}
                    </h4>
                    <p className="ty-caption line-clamp-2">{post.excerptTh}</p>
                    {post.roomCode && (
                      <p className="ty-caption font-semibold text-[var(--color-accent)]">
                        เชื่อมห้อง {post.roomCode} · ฿
                        {post.roomPriceThb?.toLocaleString()}/คืน
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--color-border)]">
                    <Link
                      href={`/${data.hotel.slug}/posts/${post.slug}`}
                      className="ty-caption font-semibold text-[var(--color-accent)] hover:underline inline-flex items-center gap-1"
                    >
                      <span>เปิดอ่านหน้าเว็บ</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>

                    <div className="flex items-center gap-1.5">
                      <StandardButton
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => handleLoadForEdit(post.id)}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>แก้ไข</span>
                      </StandardButton>
                      <StandardButton
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={busyId === post.id}
                        onClick={() =>
                          handleToggleStatus(
                            post.id,
                            post.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED"
                          )
                        }
                      >
                        <span>
                          {post.status === "PUBLISHED" ? "ซ่อน" : "เผยแพร่"}
                        </span>
                      </StandardButton>
                      <button
                        type="button"
                        disabled={busyId === post.id}
                        onClick={() => handleDeletePost(post.id)}
                        className="btn-icon text-[var(--color-danger)]"
                        aria-label="ลบบทความ"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

