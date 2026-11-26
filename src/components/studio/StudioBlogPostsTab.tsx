"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Edit3,
  ExternalLink,
  Eye,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { uploadMediaFile } from "@/lib/slipScanner";
import {
  StandardFieldGroup,
  StandardInput,
  StandardSelectField,
  StandardTextarea,
} from "@/components/ui/standards";
import { StudioSheetModal } from "@/components/studio/StudioSheetModal";
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
  const [isEditorOpen, setIsEditorOpen] = useState(false);
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

  const openCreateModal = () => {
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
    setIsEditorOpen(true);
  };

  const openEditModal = (postId: string) => {
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
    setIsEditorOpen(true);
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
          ...(editingPostId
            ? { id: editingPostId }
            : { slug: slug.trim() || undefined }),
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
      setIsEditorOpen(false);
      onNotify(
        editingPostId
          ? "อัปเดตบทความเรียบร้อยแล้ว"
          : "เผยแพร่บทความ SEO ลงหน้าร้านที่พักแล้ว"
      );
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
        setIsEditorOpen(false);
        onNotify("ลบบทความออกจากระบบแล้ว");
        await onReload();
      }
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-0.5">
          <h2 className="text-[20px] font-semibold text-[var(--color-text-primary)]">
            บทความคู่มือเที่ยว & SEO Blog ({data.posts.length})
          </h2>
          <p className="text-[14px] text-[var(--color-text-secondary)]">
            สร้างหน้า SEO พร้อม Schema.org BlogPosting และการ์ดจองตรง 0% GP ท้ายบทความ
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href={`/${data.hotel.slug}/posts`}
            className="h-10 px-3.5 rounded-[12px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[14px] font-semibold text-[var(--color-text-primary)] inline-flex items-center gap-1.5 transition-colors"
          >
            <span>ดูหน้าบทความ</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
          <button
            type="button"
            onClick={openCreateModal}
            className="h-10 px-5 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] text-[14px] font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>เขียนบทความใหม่</span>
          </button>
        </div>
      </div>

      {data.posts.length === 0 ? (
        <div className="rounded-[16px] bg-[var(--color-background-muted)] py-10 px-6 text-center space-y-2">
          <BookOpen className="w-7 h-7 mx-auto text-[var(--color-text-secondary)]" />
          <p className="text-[15px] font-semibold text-[var(--color-text-primary)]">
            ยังไม่มีบทความ SEO Blog
          </p>
          <p className="text-[14px] text-[var(--color-text-secondary)]">
            เขียนคู่มือเที่ยวรอบที่พักหรือรีวิวห้องพักเพื่อดึงทราฟฟิกจาก Google เข้าหน้าร้านฟรี
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[var(--color-border)]">
          {data.posts.map((post) => (
            <article
              key={post.id}
              className="py-4 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4 min-w-0">
                <img
                  src={post.coverImageUrl}
                  alt={post.titleTh}
                  className="w-20 h-20 sm:w-24 sm:h-24 aspect-square rounded-[18px] object-cover shrink-0 bg-[var(--color-background-muted)]"
                />
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-[12px] text-[var(--color-text-secondary)]">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-[var(--color-text-primary)]">
                      <span
                        aria-hidden="true"
                        className={`h-1.5 w-1.5 rounded-full ${
                          post.status === "PUBLISHED"
                            ? "bg-[var(--color-success)]"
                            : "bg-[var(--color-text-disabled)]"
                        }`}
                      />
                      <span>
                        {post.status === "PUBLISHED" ? "เผยแพร่แล้ว" : "ฉบับร่าง"}
                      </span>
                    </span>
                    <span>· {post.categoryTh}</span>
                    <span className="inline-flex items-center gap-1">
                      · <Eye className="w-3.5 h-3.5" /> {post.viewsCount}
                    </span>
                  </div>
                  <h3 className="text-[15px] font-semibold text-[var(--color-text-primary)] line-clamp-1">
                    {post.titleTh}
                  </h3>
                  {post.excerptTh && (
                    <p className="text-[13px] text-[var(--color-text-secondary)] line-clamp-1">
                      {post.excerptTh}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => openEditModal(post.id)}
                  className="h-9 px-3.5 rounded-[10px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[13px] font-semibold text-[var(--color-text-primary)] inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>แก้ไข</span>
                </button>
                <button
                  type="button"
                  disabled={busyId === post.id}
                  onClick={() =>
                    handleToggleStatus(
                      post.id,
                      post.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED"
                    )
                  }
                  className="h-9 px-3 rounded-[10px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[13px] font-semibold text-[var(--color-text-primary)] cursor-pointer transition-colors"
                >
                  {post.status === "PUBLISHED" ? "ซ่อน" : "เผยแพร่"}
                </button>
                <button
                  type="button"
                  disabled={busyId === post.id}
                  onClick={() => handleDeletePost(post.id)}
                  aria-label="ลบบทความ"
                  className="h-9 w-9 rounded-[10px] hover:bg-[var(--color-background-muted)] text-[var(--color-text-secondary)] hover:text-[var(--color-error)] inline-flex items-center justify-center cursor-pointer transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Blog Post Authoring Modal / Slide-Up Bottom Sheet */}
      <StudioSheetModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        title={editingPostId ? "แก้ไขบทความ Blog" : "เขียนบทความ Blog / คู่มือเที่ยว"}
        subtitle={`URL: nondii.com/${data.hotel.slug}/posts/${slug || "..."}`}
        maxWidthClass="md:max-w-[720px]"
        footer={
          <div className="flex items-center justify-between gap-2">
            {editingPostId ? (
              <button
                type="button"
                onClick={() => handleDeletePost(editingPostId)}
                className="text-[14px] font-semibold text-[var(--color-error)] underline underline-offset-2 cursor-pointer"
              >
                ลบบทความนี้
              </button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="h-11 px-5 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[14px] font-semibold cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                form="studio-blog-form"
                disabled={isSubmitting || isUploadingCover}
                className="h-11 px-6 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] text-[14px] font-semibold cursor-pointer disabled:opacity-50"
              >
                {isSubmitting
                  ? "กำลังบันทึก..."
                  : editingPostId
                  ? "อัปเดตบทความ"
                  : "เผยแพร่บทความ"}
              </button>
            </div>
          </div>
        }
      >
        <form
          id="studio-blog-form"
          onSubmit={handleSubmitPost}
          className="space-y-5"
        >
          <StandardFieldGroup>
            <StandardInput
              grouped
              label="หัวข้อบทความ (H1 SEO) *"
              placeholder="เช่น คู่มือเที่ยวสะปัน จ.น่าน ช่วงปลายฝนต้นหนาว"
              value={titleTh}
              onChange={(e) => setTitleTh(e.target.value)}
              required
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x divide-y sm:divide-y-0 divide-[#b0b0b0] dark:divide-[var(--color-border-emphasized)]">
              <StandardSelectField
                grouped
                label="หมวดหมู่บทความ"
                value={categoryTh}
                onChange={setCategoryTh}
                sheetTitle="เลือกหมวดหมู่บทความ"
                options={POST_CATEGORIES.map((cat) => ({
                  value: cat,
                  label: cat,
                }))}
              />
              <StandardInput
                grouped
                label="ลิงก์ Slug ภาษาอังกฤษ"
                optionalText={editingPostId ? "ล็อกถาวร" : "ไม่บังคับ"}
                placeholder="เช่น sapan-winter-guide"
                value={slug}
                disabled={Boolean(editingPostId)}
                onChange={(e) => setSlug(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x divide-y sm:divide-y-0 divide-[#b0b0b0] dark:divide-[var(--color-border-emphasized)]">
              <StandardSelectField
                grouped
                label="แนบการ์ดจองห้องพักท้ายบทความ"
                value={roomId}
                onChange={setRoomId}
                sheetTitle="เลือกห้องพักที่ต้องการแนะนำ"
                options={[
                  { value: "", label: "ไม่ระบุห้องเฉพาะ" },
                  ...data.rooms.map((r) => ({
                    value: r.id,
                    label: `${r.nameTh} (${r.code})`,
                    sublabel: `฿${r.weekdayPriceThb.toLocaleString()}/คืน`,
                  })),
                ]}
              />
              <StandardSelectField
                grouped
                label="สถานะการเผยแพร่"
                value={status}
                onChange={(v) => setStatus(v as PostPublishStatusDto)}
                sheetTitle="เลือกสถานะบทความ"
                options={[
                  { value: "PUBLISHED", label: "เผยแพร่ทันที (Public SEO)" },
                  { value: "DRAFT", label: "บันทึกเป็นฉบับร่าง (Draft)" },
                ]}
              />
            </div>
          </StandardFieldGroup>

          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-3">
              {coverImageUrl && (
                <img
                  src={coverImageUrl}
                  alt="Cover"
                  className="h-14 w-22 rounded-[10px] object-cover bg-[var(--color-background-muted)] shrink-0"
                />
              )}
              <label className="min-h-[56px] px-4 rounded-[12px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[14px] font-semibold inline-flex items-center gap-2 cursor-pointer shrink-0 transition-colors">
                <Upload className="w-4 h-4" />
                <span>{isUploadingCover ? "กำลังอัปโหลด..." : "อัปโหลดรูปปก"}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleUploadCover}
                />
              </label>
              <div className="flex-1 min-w-[200px]">
                <StandardInput
                  label="หรือวาง URL รูปภาพหน้าปก *"
                  type="url"
                  placeholder="https://..."
                  value={coverImageUrl}
                  onChange={(e) => setCoverImageUrl(e.target.value)}
                />
              </div>
            </div>
          </div>

          <StandardFieldGroup>
            <StandardInput
              grouped
              label="คำโปรยสรุป (Meta Description)"
              optionalText="ไม่บังคับ"
              placeholder="สรุปสั้นๆ 1-2 ประโยคสำหรับแสดงบน Google"
              value={excerptTh}
              onChange={(e) => setExcerptTh(e.target.value)}
            />
            <StandardInput
              grouped
              label="แท็กคีย์เวิร์ด SEO (คั่นด้วยจุลภาค)"
              optionalText="ไม่บังคับ"
              placeholder="เช่น น่าน, สะปัน, ทะเลหมอก"
              value={tagsRaw}
              onChange={(e) => setTagsRaw(e.target.value)}
            />
          </StandardFieldGroup>

          <StandardTextarea
            label="เนื้อหาบทความฉบับเต็ม *"
            optionalText="รองรับ ## / ### และ -"
            rows={8}
            required
            value={contentTh}
            onChange={(e) => setContentTh(e.target.value)}
            placeholder="เล่าเรื่องราว จุดเช็กอิน คาเฟ่ใกล้ที่พัก หรือรายละเอียดห้องพัก..."
          />
        </form>
      </StudioSheetModal>
    </div>
  );
}
