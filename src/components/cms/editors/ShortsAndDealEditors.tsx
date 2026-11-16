"use client";

import React, { useRef, useState } from "react";
import { ImagePlus, Loader2, Plus, Trash2 } from "lucide-react";
import {
  DealPageCmsConfig,
  DirectPrivilegeCardItem,
  GuidePageCmsConfig,
  ManagedGuestReview,
  ManagedShortVideo,
  ShortsPageCmsConfig,
} from "@/data/cmsDefaults";
import {
  ExtraAddon,
  PromoCoupon,
  SeasonalRateRule,
  SpecialDateRateOverride,
} from "@/data/rooms";
import { ShortVideoCategory } from "@/data/shortsData";
import { uploadOptimizedImage } from "@/lib/mediaUtils";
import { StandardButton } from "@/components/ui/standards";
import {
  CMS_INPUT_CLASS,
  SmartImageUploader,
  SmartVideoLinkInput,
  ThaiFirstInput,
  ThaiFirstTextarea,
} from "@/components/cms/CmsFormPrimitives";
import { EditorCommonProps } from "@/components/cms/editors/HomeAndBookingEditors";

export function ShortsHeaderEditor({
  store,
  saveStore,
  onSaved,
}: EditorCommonProps) {
  const [draft, setDraft] = useState<ShortsPageCmsConfig>(store.cms.shortsPage);

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    saveStore((prev) => ({
      ...prev,
      cms: { ...prev.cms, shortsPage: draft },
    }));
    onSaved("บันทึกส่วนหัวหน้า Shorts เรียบร้อยแล้ว");
  };

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <ThaiFirstInput
        label="หัวข้อหน้า Shorts"
        valueTh={draft.titleTh}
        valueEn={draft.titleEn}
        onChangeTh={(v) => setDraft({ ...draft, titleTh: v })}
        onChangeEn={(v) => setDraft({ ...draft, titleEn: v })}
      />

      <ThaiFirstInput
        label="คำโปรยใต้หัวข้อ"
        valueTh={draft.subtitleTh}
        valueEn={draft.subtitleEn}
        onChangeTh={(v) => setDraft({ ...draft, subtitleTh: v })}
        onChangeEn={(v) => setDraft({ ...draft, subtitleEn: v })}
      />

      <div className="space-y-1.5">
        <label className="ty-body font-semibold block">
          ชื่อบัญชีช่อง (Channel Handle)
        </label>
        <input
          type="text"
          value={draft.channelHandle}
          onChange={(e) =>
            setDraft({ ...draft, channelHandle: e.target.value })
          }
          className={CMS_INPUT_CLASS}
        />
      </div>

      <SmartImageUploader
        label="รูปโปรไฟล์ช่อง"
        imageUrl={draft.channelAvatarUrl}
        onChangeUrl={(url) => setDraft({ ...draft, channelAvatarUrl: url })}
        folder="shorts"
        aspectClassName="aspect-[16/9]"
        maxDimension={400}
      />

      <div className="pt-3 border-t border-[var(--color-border)] space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="ty-subtitle">หมวดหมู่วิดีโอ</span>
          <button
            type="button"
            onClick={() =>
              setDraft({
                ...draft,
                categories: [
                  ...draft.categories,
                  {
                    id: `cat-${Date.now()}`,
                    labelTh: "หมวดใหม่",
                    labelEn: "New",
                  },
                ],
              })
            }
            className="ty-caption font-semibold text-[var(--color-accent)] cursor-pointer"
          >
            + เพิ่มหมวดหมู่
          </button>
        </div>

        {draft.categories.map((cat, idx) => (
          <div key={cat.id} className="flex items-end gap-2">
            <div className="flex-1">
              <ThaiFirstInput
                label={cat.id === "all" ? "ปุ่มทั้งหมด (ค่าหลัก)" : `หมวดที่ ${idx}`}
                valueTh={cat.labelTh}
                valueEn={cat.labelEn}
                onChangeTh={(v) => {
                  const next = [...draft.categories];
                  next[idx] = { ...cat, labelTh: v };
                  setDraft({ ...draft, categories: next });
                }}
                onChangeEn={(v) => {
                  const next = [...draft.categories];
                  next[idx] = { ...cat, labelEn: v };
                  setDraft({ ...draft, categories: next });
                }}
              />
            </div>
            {cat.id !== "all" && (
              <button
                type="button"
                onClick={() =>
                  setDraft({
                    ...draft,
                    categories: draft.categories.filter((_, i) => i !== idx),
                  })
                }
                aria-label="ลบหมวดหมู่"
                className="btn-icon !bg-[var(--color-error-muted)] !text-[var(--color-error)]"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      <StandardButton type="submit" variant="primary" size="lg" fullWidth>
        บันทึกข้อมูลหน้า Shorts
      </StandardButton>
    </form>
  );
}

export function ShortVideoEditor({
  store,
  saveStore,
  videoId,
  onSaved,
}: EditorCommonProps & { videoId?: string }) {
  const existing = store.cms.shortsPage.videos.find((v) => v.id === videoId);
  const firstRoom = store.rooms[0];

  const [video, setVideo] = useState<ManagedShortVideo>(() => {
    if (existing) return existing;
    return {
      id: `short-${Date.now()}`,
      titleTh: "",
      titleEn: "",
      captionTh: "",
      captionEn: "",
      hashtags: ["#สะปันอันซีน"],
      videoUrl: "",
      posterUrl: firstRoom?.images[0]?.url || "",
      audioLabel: `${store.cms.shortsPage.channelHandle} · original sound`,
      likes: 120,
      views: "1.5K",
      comments: [],
      roomIndex: 0,
      roomId: firstRoom?.id,
      couponCode: "",
      category: "mist",
      isPinned: false,
      isActive: true,
    };
  });

  const [hashtagsRaw, setHashtagsRaw] = useState(video.hashtags.join(" "));

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    if (!video.titleTh.trim() || !video.videoUrl.trim()) return;

    const matchedRoomIndex = Math.max(
      0,
      store.rooms.findIndex((r) => r.id === video.roomId)
    );
    const parsedHashtags = hashtagsRaw
      .split(/\s+/)
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => (t.startsWith("#") ? t : `#${t}`));

    const finalVideo: ManagedShortVideo = {
      ...video,
      titleTh: video.titleTh.trim(),
      titleEn: video.titleEn.trim() || video.titleTh.trim(),
      roomIndex: matchedRoomIndex,
      couponCode: video.couponCode?.trim() || undefined,
      hashtags: parsedHashtags,
    };

    saveStore((prev) => {
      const currentVideos = prev.cms.shortsPage.videos;
      const exists = currentVideos.some((item) => item.id === finalVideo.id);
      const nextList = exists
        ? currentVideos.map((item) =>
            item.id === finalVideo.id ? finalVideo : item
          )
        : [finalVideo, ...currentVideos];

      return {
        ...prev,
        cms: {
          ...prev.cms,
          shortsPage: {
            ...prev.cms.shortsPage,
            videos: nextList,
          },
        },
      };
    });

    onSaved(
      existing ? "บันทึกคลิปวิดีโอสั้นเรียบร้อยแล้ว" : "เพิ่มคลิปวิดีโอสั้นขึ้นเว็บแล้ว"
    );
  };

  const handleDelete = () => {
    if (!existing) return;
    saveStore((prev) => ({
      ...prev,
      cms: {
        ...prev.cms,
        shortsPage: {
          ...prev.cms.shortsPage,
          videos: prev.cms.shortsPage.videos.filter(
            (item) => item.id !== existing.id
          ),
        },
      },
    }));
    onSaved("ลบคลิปวิดีโอสั้นเรียบร้อยแล้ว");
  };

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <SmartVideoLinkInput
        label="ลิงก์วิดีโอสั้น 9:16 (YouTube Shorts / Facebook Reel / MP4)"
        videoUrl={video.videoUrl}
        posterUrl={video.posterUrl}
        onChangeVideoUrl={(url) => setVideo({ ...video, videoUrl: url })}
        onChangePosterUrl={(poster) => setVideo({ ...video, posterUrl: poster })}
        posterFolder="shorts"
        aspectRatio="9/16"
      />

      <ThaiFirstInput
        label="หัวข้อคลิปวิดีโอ"
        required
        valueTh={video.titleTh}
        valueEn={video.titleEn}
        onChangeTh={(v) => setVideo({ ...video, titleTh: v })}
        onChangeEn={(v) => setVideo({ ...video, titleEn: v })}
        placeholderTh="เช่น ตื่นมารับทะเลหมอกหน้าเตียงที่บ้านพัก A1"
      />

      <ThaiFirstTextarea
        label="แคปชันใต้คลิป"
        valueTh={video.captionTh}
        valueEn={video.captionEn}
        onChangeTh={(v) => setVideo({ ...video, captionTh: v })}
        onChangeEn={(v) => setVideo({ ...video, captionEn: v })}
        rows={2}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div className="space-y-1.5">
          <label className="ty-body font-semibold block">หมวดหมู่คลิป</label>
          <select
            value={video.category}
            onChange={(e) =>
              setVideo({
                ...video,
                category: e.target.value as ShortVideoCategory,
              })
            }
            className={CMS_INPUT_CLASS}
          >
            {store.cms.shortsPage.categories
              .filter((c) => c.id !== "all")
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.labelTh}
                </option>
              ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="ty-body font-semibold block">
            ผูกปุ่มจองห้องพักใต้คลิป
          </label>
          <select
            value={video.roomId || store.rooms[0]?.id || ""}
            onChange={(e) => setVideo({ ...video, roomId: e.target.value })}
            className={CMS_INPUT_CLASS}
          >
            {store.rooms.map((rm) => (
              <option key={rm.id} value={rm.id}>
                {rm.code} · {rm.nameTh}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div className="space-y-1.5">
          <label className="ty-body font-semibold text-[var(--color-promo-text)] block">
            ผูกโค้ดคูปองในคลิป (ถ้ามี)
          </label>
          <select
            value={video.couponCode || ""}
            onChange={(e) => setVideo({ ...video, couponCode: e.target.value })}
            className={CMS_INPUT_CLASS}
          >
            <option value="">— ไม่ผูกคูปอง —</option>
            {store.coupons
              .filter((c) => c.isActive)
              .map((cp) => (
                <option key={cp.id} value={cp.code}>
                  {cp.code} ({cp.titleTh})
                </option>
              ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="ty-body font-semibold block">ป้ายยอดวิว (Views)</label>
          <input
            type="text"
            value={video.views}
            onChange={(e) => setVideo({ ...video, views: e.target.value })}
            placeholder="12.5K"
            className={CMS_INPUT_CLASS}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="ty-body font-semibold block">
          แฮชแท็ก (คั่นด้วยเว้นวรรค)
        </label>
        <input
          type="text"
          value={hashtagsRaw}
          onChange={(e) => setHashtagsRaw(e.target.value)}
          placeholder="#สะปันอันซีน #ที่พักน่าน"
          className={CMS_INPUT_CLASS}
        />
      </div>

      <label className="flex items-center justify-between gap-3 rounded-[12px] bg-[var(--color-background-muted)] px-3.5 h-11 cursor-pointer">
        <span className="ty-body font-semibold">
          ปักหมุด (PINNED) ขึ้นหน้าแรกและอันดับแรก
        </span>
        <input
          type="checkbox"
          checked={Boolean(video.isPinned)}
          onChange={(e) => setVideo({ ...video, isPinned: e.target.checked })}
          className="w-4 h-4 accent-[var(--color-accent)]"
        />
      </label>

      <div className="pt-2 flex items-center gap-2.5">
        {existing && (
          <StandardButton
            type="button"
            variant="secondary"
            size="lg"
            onClick={handleDelete}
            className="!bg-[var(--color-error-muted)] !text-[var(--color-error)] shrink-0"
          >
            <Trash2 className="w-4 h-4" />
            <span>ลบคลิป</span>
          </StandardButton>
        )}
        <StandardButton type="submit" variant="primary" size="lg" fullWidth>
          {existing ? "บันทึกคลิปวิดีโอ" : "โพสต์คลิปขึ้นเว็บ"}
        </StandardButton>
      </div>
    </form>
  );
}

export function CouponEditor({
  store,
  saveStore,
  couponId,
  onSaved,
}: EditorCommonProps & { couponId?: string }) {
  const existing = store.coupons.find((c) => c.id === couponId);
  const [coupon, setCoupon] = useState<PromoCoupon>(
    existing || {
      id: `coupon-${Date.now()}`,
      code: "",
      titleTh: "",
      titleEn: "",
      descTh: "คูปองส่วนลดพิเศษเมื่อจองตรงผ่านหน้าเว็บไซต์",
      badgeTh: "",
      imageUrl:
        "https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&w=900&q=80",
      discountType: "PERCENT",
      discountValue: 10,
      minSpendThb: 2000,
      isActive: true,
    }
  );

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    if (!coupon.code.trim() || !coupon.titleTh.trim()) return;
    const normalized: PromoCoupon = {
      ...coupon,
      code: coupon.code.trim().toUpperCase(),
      titleTh: coupon.titleTh.trim(),
      badgeTh:
        coupon.discountType === "PERCENT"
          ? `ลด ${coupon.discountValue}%`
          : `ลด ฿${coupon.discountValue.toLocaleString()}`,
    };

    saveStore((prev) => {
      const exists = prev.coupons.some((c) => c.id === normalized.id);
      return {
        ...prev,
        coupons: exists
          ? prev.coupons.map((c) => (c.id === normalized.id ? normalized : c))
          : [normalized, ...prev.coupons],
      };
    });
    onSaved(`บันทึกคูปอง ${normalized.code} เรียบร้อยแล้ว`);
  };

  const handleDelete = () => {
    if (!existing) return;
    saveStore((prev) => ({
      ...prev,
      coupons: prev.coupons.filter((c) => c.id !== existing.id),
    }));
    onSaved(`ลบคูปอง ${existing.code} แล้ว`);
  };

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <SmartImageUploader
        label="รูปปกการ์ดคูปอง"
        imageUrl={coupon.imageUrl || ""}
        onChangeUrl={(url) => setCoupon({ ...coupon, imageUrl: url })}
        folder="coupons"
        aspectClassName="aspect-[16/9]"
      />

      <div className="grid grid-cols-2 gap-2.5">
        <div className="space-y-1.5">
          <label className="ty-body font-semibold text-[var(--color-promo-text)] block">
            รหัสคูปอง (CODE)
          </label>
          <input
            type="text"
            required
            value={coupon.code}
            onChange={(e) =>
              setCoupon({ ...coupon, code: e.target.value.toUpperCase() })
            }
            placeholder="SAPAN15"
            className={`${CMS_INPUT_CLASS} font-mono uppercase font-bold`}
          />
        </div>

        <div className="space-y-1.5">
          <label className="ty-body font-semibold block">สถานะคูปอง</label>
          <select
            value={coupon.isActive ? "ACTIVE" : "DISABLED"}
            onChange={(e) =>
              setCoupon({ ...coupon, isActive: e.target.value === "ACTIVE" })
            }
            className={CMS_INPUT_CLASS}
          >
            <option value="ACTIVE">เปิดใช้งาน (Active)</option>
            <option value="DISABLED">ปิดชั่วคราว (Hidden)</option>
          </select>
        </div>
      </div>

      <ThaiFirstInput
        label="ชื่อแคมเปญส่วนลด"
        required
        valueTh={coupon.titleTh}
        valueEn={coupon.titleEn || ""}
        onChangeTh={(v) => setCoupon({ ...coupon, titleTh: v })}
        onChangeEn={(v) => setCoupon({ ...coupon, titleEn: v })}
        placeholderTh="เช่น ลดเพิ่ม 15% เมื่อจองตรงผ่านเว็บ"
      />

      <div className="grid grid-cols-3 gap-2.5">
        <div className="space-y-1.5">
          <label className="ty-caption font-semibold block">รูปแบบส่วนลด</label>
          <select
            value={coupon.discountType}
            onChange={(e) =>
              setCoupon({
                ...coupon,
                discountType: e.target.value as "PERCENT" | "FIXED",
              })
            }
            className={CMS_INPUT_CLASS}
          >
            <option value="PERCENT">เปอร์เซ็นต์ (%)</option>
            <option value="FIXED">จำนวนเงิน (฿)</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="ty-caption font-semibold text-[var(--color-promo-text)] block">
            มูลค่าที่ลด
          </label>
          <input
            type="number"
            min={1}
            value={coupon.discountValue}
            onChange={(e) =>
              setCoupon({
                ...coupon,
                discountValue: Number(e.target.value) || 0,
              })
            }
            className={CMS_INPUT_CLASS}
          />
        </div>

        <div className="space-y-1.5">
          <label className="ty-caption font-semibold block">ยอดขั้นต่ำ (฿)</label>
          <input
            type="number"
            min={0}
            step={100}
            value={coupon.minSpendThb}
            onChange={(e) =>
              setCoupon({
                ...coupon,
                minSpendThb: Number(e.target.value) || 0,
              })
            }
            className={CMS_INPUT_CLASS}
          />
        </div>
      </div>

      <div className="pt-2 flex items-center gap-2.5">
        {existing && (
          <StandardButton
            type="button"
            variant="secondary"
            size="lg"
            onClick={handleDelete}
            className="!bg-[var(--color-error-muted)] !text-[var(--color-error)] shrink-0"
          >
            <Trash2 className="w-4 h-4" />
            <span>ลบ</span>
          </StandardButton>
        )}
        <StandardButton type="submit" variant="promo" size="lg" fullWidth>
          บันทึกคูปองส่วนลด
        </StandardButton>
      </div>
    </form>
  );
}

export function DealAddonsHeaderEditor({
  store,
  saveStore,
  onSaved,
}: EditorCommonProps) {
  const [draft, setDraft] = useState<DealPageCmsConfig>(store.cms.dealPage);

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    saveStore((prev) => ({
      ...prev,
      cms: { ...prev.cms, dealPage: draft },
    }));
    onSaved("บันทึกหัวข้อหน้าโปรโมชั่นเรียบร้อยแล้ว");
  };

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <ThaiFirstInput
        label="หัวข้อหมวดคูปองส่วนลด"
        valueTh={draft.couponsTitleTh}
        valueEn={draft.couponsTitleEn}
        onChangeTh={(v) => setDraft({ ...draft, couponsTitleTh: v })}
        onChangeEn={(v) => setDraft({ ...draft, couponsTitleEn: v })}
      />

      <ThaiFirstInput
        label="หัวข้อหมวดหมูกระทะ & บริการเสริม"
        valueTh={draft.addonsTitleTh}
        valueEn={draft.addonsTitleEn}
        onChangeTh={(v) => setDraft({ ...draft, addonsTitleTh: v })}
        onChangeEn={(v) => setDraft({ ...draft, addonsTitleEn: v })}
      />

      <ThaiFirstInput
        label="คำโปรยหมวดบริการเสริม"
        valueTh={draft.addonsSubtitleTh}
        valueEn={draft.addonsSubtitleEn}
        onChangeTh={(v) => setDraft({ ...draft, addonsSubtitleTh: v })}
        onChangeEn={(v) => setDraft({ ...draft, addonsSubtitleEn: v })}
      />

      <ThaiFirstInput
        label="หัวข้อหมวดสิทธิพิเศษจองตรง"
        valueTh={draft.privilegesTitleTh}
        valueEn={draft.privilegesTitleEn}
        onChangeTh={(v) => setDraft({ ...draft, privilegesTitleTh: v })}
        onChangeEn={(v) => setDraft({ ...draft, privilegesTitleEn: v })}
      />

      <ThaiFirstInput
        label="คำโปรยหมวดสิทธิพิเศษจองตรง"
        valueTh={draft.privilegesSubtitleTh}
        valueEn={draft.privilegesSubtitleEn}
        onChangeTh={(v) => setDraft({ ...draft, privilegesSubtitleTh: v })}
        onChangeEn={(v) => setDraft({ ...draft, privilegesSubtitleEn: v })}
      />

      <StandardButton type="submit" variant="primary" size="lg" fullWidth>
        บันทึกหัวข้อหน้าดีล
      </StandardButton>
    </form>
  );
}

export function AddonEditor({
  store,
  saveStore,
  addonId,
  onSaved,
}: EditorCommonProps & { addonId?: string }) {
  const existing = store.addons.find((a) => a.id === addonId);
  const [addon, setAddon] = useState<ExtraAddon>(
    existing || {
      id: `addon-${Date.now()}`,
      nameTh: "",
      nameEn: "",
      descTh: "",
      descEn: "",
      priceThb: 590,
      originalPriceThb: 750,
      unitTh: "/ ชุด",
      unitEn: "/ set",
      imageUrl:
        "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80",
      category: "DINING",
      isActive: true,
    }
  );

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    if (!addon.nameTh.trim()) return;
    const normalized: ExtraAddon = {
      ...addon,
      nameTh: addon.nameTh.trim(),
      nameEn: addon.nameEn.trim() || addon.nameTh.trim(),
    };

    saveStore((prev) => {
      const exists = prev.addons.some((a) => a.id === normalized.id);
      return {
        ...prev,
        addons: exists
          ? prev.addons.map((a) => (a.id === normalized.id ? normalized : a))
          : [normalized, ...prev.addons],
      };
    });
    onSaved(`บันทึกบริการเสริม "${normalized.nameTh}" เรียบร้อยแล้ว`);
  };

  const handleDelete = () => {
    if (!existing) return;
    saveStore((prev) => ({
      ...prev,
      addons: prev.addons.filter((a) => a.id !== existing.id),
    }));
    onSaved("ลบบริการเสริมแล้ว");
  };

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <SmartImageUploader
        label="รูปภาพแพ็กเกจอาหาร / สปา"
        imageUrl={addon.imageUrl || ""}
        onChangeUrl={(url) => setAddon({ ...addon, imageUrl: url })}
        folder="addons"
        aspectClassName="aspect-[16/9]"
      />

      <ThaiFirstInput
        label="ชื่อแพ็กเกจ / บริการเสริม"
        required
        valueTh={addon.nameTh}
        valueEn={addon.nameEn}
        onChangeTh={(v) => setAddon({ ...addon, nameTh: v })}
        onChangeEn={(v) => setAddon({ ...addon, nameEn: v })}
        placeholderTh="เช่น ชุดหมูกระทะริมระเบียง"
      />

      <ThaiFirstTextarea
        label="รายละเอียดแพ็กเกจ"
        valueTh={addon.descTh}
        valueEn={addon.descEn}
        onChangeTh={(v) => setAddon({ ...addon, descTh: v })}
        onChangeEn={(v) => setAddon({ ...addon, descEn: v })}
        rows={2}
      />

      <div className="grid grid-cols-3 gap-2.5">
        <div className="space-y-1.5">
          <label className="ty-caption font-semibold text-[var(--color-promo-text)] block">
            ราคาโปรโมชั่น (฿)
          </label>
          <input
            type="number"
            min={50}
            value={addon.priceThb}
            onChange={(e) =>
              setAddon({ ...addon, priceThb: Number(e.target.value) || 0 })
            }
            className={CMS_INPUT_CLASS}
          />
        </div>

        <div className="space-y-1.5">
          <label className="ty-caption font-semibold block">
            ราคาปกติขีดฆ่า (฿)
          </label>
          <input
            type="number"
            min={0}
            value={addon.originalPriceThb ?? Math.round(addon.priceThb * 1.25)}
            onChange={(e) =>
              setAddon({
                ...addon,
                originalPriceThb: Number(e.target.value) || undefined,
              })
            }
            className={CMS_INPUT_CLASS}
          />
        </div>

        <div className="space-y-1.5">
          <label className="ty-caption font-semibold block">สถานะ</label>
          <select
            value={addon.isActive ? "ACTIVE" : "HIDDEN"}
            onChange={(e) =>
              setAddon({ ...addon, isActive: e.target.value === "ACTIVE" })
            }
            className={CMS_INPUT_CLASS}
          >
            <option value="ACTIVE">แสดงผล</option>
            <option value="HIDDEN">ซ่อนไว้</option>
          </select>
        </div>
      </div>

      <ThaiFirstInput
        label="หน่วยนับ (เช่น / ชุด สำหรับ 2 ท่าน)"
        valueTh={addon.unitTh}
        valueEn={addon.unitEn}
        onChangeTh={(v) => setAddon({ ...addon, unitTh: v })}
        onChangeEn={(v) => setAddon({ ...addon, unitEn: v })}
      />

      <div className="pt-2 flex items-center gap-2.5">
        {existing && (
          <StandardButton
            type="button"
            variant="secondary"
            size="lg"
            onClick={handleDelete}
            className="!bg-[var(--color-error-muted)] !text-[var(--color-error)] shrink-0"
          >
            <Trash2 className="w-4 h-4" />
            <span>ลบ</span>
          </StandardButton>
        )}
        <StandardButton type="submit" variant="promo" size="lg" fullWidth>
          บันทึกแพ็กเกจเสริม
        </StandardButton>
      </div>
    </form>
  );
}

export function DealPrivilegeEditor({
  store,
  saveStore,
  privilegeId,
  onSaved,
}: EditorCommonProps & { privilegeId?: string }) {
  const existing = store.cms.dealPage.privileges.find(
    (p) => p.id === privilegeId
  );
  const [item, setItem] = useState<DirectPrivilegeCardItem>(
    existing || {
      id: `priv-${Date.now()}`,
      badgeTh: "สิทธิพิเศษ",
      badgeEn: "PRIVILEGE",
      titleTh: "",
      titleEn: "",
      descTh: "",
      descEn: "",
      imageUrl:
        "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80",
    }
  );

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    if (!item.titleTh.trim()) return;
    saveStore((prev) => {
      const list = prev.cms.dealPage.privileges;
      const exists = list.some((p) => p.id === item.id);
      return {
        ...prev,
        cms: {
          ...prev.cms,
          dealPage: {
            ...prev.cms.dealPage,
            privileges: exists
              ? list.map((p) => (p.id === item.id ? item : p))
              : [...list, item],
          },
        },
      };
    });
    onSaved("บันทึกการ์ดสิทธิพิเศษเรียบร้อยแล้ว");
  };

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <SmartImageUploader
        label="รูปประกอบการ์ดสิทธิพิเศษ"
        imageUrl={item.imageUrl}
        onChangeUrl={(url) => setItem({ ...item, imageUrl: url })}
        folder="stories"
        aspectClassName="aspect-[16/9]"
      />

      <ThaiFirstInput
        label="ป้ายกำกับด้านบน"
        valueTh={item.badgeTh}
        valueEn={item.badgeEn}
        onChangeTh={(v) => setItem({ ...item, badgeTh: v })}
        onChangeEn={(v) => setItem({ ...item, badgeEn: v })}
      />

      <ThaiFirstInput
        label="หัวข้อสิทธิพิเศษ"
        required
        valueTh={item.titleTh}
        valueEn={item.titleEn}
        onChangeTh={(v) => setItem({ ...item, titleTh: v })}
        onChangeEn={(v) => setItem({ ...item, titleEn: v })}
      />

      <ThaiFirstTextarea
        label="คำอธิบาย"
        valueTh={item.descTh}
        valueEn={item.descEn}
        onChangeTh={(v) => setItem({ ...item, descTh: v })}
        onChangeEn={(v) => setItem({ ...item, descEn: v })}
        rows={2}
      />

      <StandardButton type="submit" variant="primary" size="lg" fullWidth>
        บันทึกสิทธิพิเศษ
      </StandardButton>
    </form>
  );
}

export function SeasonalRatesEditor({
  store,
  saveStore,
  onSaved,
}: EditorCommonProps) {
  const [seasons, setSeasons] = useState<SeasonalRateRule[]>(
    store.seasonalRates
  );
  const [holidays, setHolidays] = useState<SpecialDateRateOverride[]>(
    store.specialDateRates
  );

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    saveStore((prev) => ({
      ...prev,
      seasonalRates: seasons,
      specialDateRates: holidays,
    }));
    onSaved("บันทึกตารางเรทราคาตามฤดูกาลและวันหยุดเรียบร้อยแล้ว");
  };

  return (
    <form onSubmit={handleSave} className="space-y-5">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="ty-subtitle">เรทราคาตามฤดูกาล (Seasons)</span>
          <button
            type="button"
            onClick={() =>
              setSeasons([
                ...seasons,
                {
                  id: `season-${Date.now()}`,
                  nameTh: "ฤดูกาลใหม่",
                  nameEn: "New Season",
                  seasonType: "HIGH",
                  startDate: "2026-11-01",
                  endDate: "2026-12-31",
                  adjustmentType: "PERCENT_SURCHARGE",
                  adjustmentValue: 15,
                  minStayNights: 1,
                  badgeTh: "High Season (+15%)",
                  isActive: true,
                },
              ])
            }
            className="ty-caption font-semibold text-[var(--color-accent)] cursor-pointer"
          >
            + เพิ่มช่วงฤดูกาล
          </button>
        </div>

        {seasons.map((season, idx) => (
          <div
            key={season.id}
            className="pt-3 border-t border-[var(--color-border)] first:border-t-0 first:pt-0 space-y-2.5"
          >
            <div className="flex items-center justify-between gap-2">
              <label className="inline-flex items-center gap-2 ty-caption font-bold text-[var(--color-accent)]">
                <input
                  type="checkbox"
                  checked={season.isActive}
                  onChange={(e) => {
                    const next = [...seasons];
                    next[idx] = { ...season, isActive: e.target.checked };
                    setSeasons(next);
                  }}
                />
                <span>เปิดใช้งานช่วงนี้</span>
              </label>
              <button
                type="button"
                onClick={() =>
                  setSeasons(seasons.filter((_, i) => i !== idx))
                }
                className="ty-caption text-[var(--color-error)] font-semibold cursor-pointer"
              >
                ลบ
              </button>
            </div>

            <input
              type="text"
              value={season.nameTh}
              onChange={(e) => {
                const next = [...seasons];
                next[idx] = { ...season, nameTh: e.target.value };
                setSeasons(next);
              }}
              placeholder="ชื่อช่วงฤดูกาล"
              className={CMS_INPUT_CLASS}
            />

            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={season.startDate}
                onChange={(e) => {
                  const next = [...seasons];
                  next[idx] = { ...season, startDate: e.target.value };
                  setSeasons(next);
                }}
                className={CMS_INPUT_CLASS}
              />
              <input
                type="date"
                value={season.endDate}
                onChange={(e) => {
                  const next = [...seasons];
                  next[idx] = { ...season, endDate: e.target.value };
                  setSeasons(next);
                }}
                className={CMS_INPUT_CLASS}
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <select
                value={season.adjustmentType}
                onChange={(e) => {
                  const next = [...seasons];
                  next[idx] = {
                    ...season,
                    adjustmentType: e.target
                      .value as SeasonalRateRule["adjustmentType"],
                  };
                  setSeasons(next);
                }}
                className={CMS_INPUT_CLASS}
              >
                <option value="PERCENT_SURCHARGE">บวกเพิ่ม (%)</option>
                <option value="PERCENT_DISCOUNT">ลดราคา (%)</option>
                <option value="FIXED_SURCHARGE">บวกเพิ่ม (฿)</option>
              </select>

              <input
                type="number"
                value={season.adjustmentValue}
                onChange={(e) => {
                  const next = [...seasons];
                  next[idx] = {
                    ...season,
                    adjustmentValue: Number(e.target.value) || 0,
                  };
                  setSeasons(next);
                }}
                className={CMS_INPUT_CLASS}
              />

              <input
                type="text"
                value={season.badgeTh}
                onChange={(e) => {
                  const next = [...seasons];
                  next[idx] = { ...season, badgeTh: e.target.value };
                  setSeasons(next);
                }}
                placeholder="ป้ายแสดง"
                className={CMS_INPUT_CLASS}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="pt-4 border-t border-[var(--color-border)] space-y-3">
        <div className="flex items-center justify-between">
          <span className="ty-subtitle">วันหยุดนักขัตฤกษ์ / วันพิเศษ</span>
          <button
            type="button"
            onClick={() =>
              setHolidays([
                ...holidays,
                {
                  id: `sp-${Date.now()}`,
                  dateStr: "2026-12-31",
                  titleTh: "วันหยุดพิเศษ",
                  pricingMode: "SURCHARGE_THB",
                  amountThb: 500,
                  isActive: true,
                },
              ])
            }
            className="ty-caption font-semibold text-[var(--color-accent)] cursor-pointer"
          >
            + เพิ่มวันพิเศษ
          </button>
        </div>

        {holidays.map((sp, idx) => (
          <div key={sp.id} className="grid grid-cols-12 gap-2 items-center">
            <input
              type="date"
              value={sp.dateStr}
              onChange={(e) => {
                const next = [...holidays];
                next[idx] = { ...sp, dateStr: e.target.value };
                setHolidays(next);
              }}
              className={`${CMS_INPUT_CLASS} col-span-4`}
            />
            <input
              type="text"
              value={sp.titleTh}
              onChange={(e) => {
                const next = [...holidays];
                next[idx] = { ...sp, titleTh: e.target.value };
                setHolidays(next);
              }}
              placeholder="ชื่อวันหยุด"
              className={`${CMS_INPUT_CLASS} col-span-4`}
            />
            <input
              type="number"
              value={sp.amountThb}
              onChange={(e) => {
                const next = [...holidays];
                next[idx] = { ...sp, amountThb: Number(e.target.value) || 0 };
                setHolidays(next);
              }}
              placeholder="+฿"
              className={`${CMS_INPUT_CLASS} col-span-3`}
            />
            <button
              type="button"
              onClick={() => setHolidays(holidays.filter((_, i) => i !== idx))}
              className="btn-icon !bg-[var(--color-error-muted)] !text-[var(--color-error)] col-span-1"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <StandardButton type="submit" variant="primary" size="lg" fullWidth>
        บันทึกเรทราคาฤดูกาล
      </StandardButton>
    </form>
  );
}

export function GuestReviewEditor({
  store,
  saveStore,
  reviewId,
  onSaved,
}: EditorCommonProps & { reviewId?: string }) {
  const existing = store.cms.reviews.find((r) => r.id === reviewId);
  const defaultRoom = store.rooms[0];

  const [review, setReview] = useState<ManagedGuestReview>(
    existing || {
      id: `rev-${Date.now()}`,
      authorNameTh: "",
      authorNameEn: "",
      authorAvatar:
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=240&q=80",
      postedAgoTh: "เมื่อเร็วๆ นี้",
      postedAgoEn: "Recently",
      rating: "10/10",
      roomId: defaultRoom?.id || "room-a1",
      roomCode: defaultRoom?.code || "A1",
      roomLabel: defaultRoom?.nameTh || "Villa A1",
      captionTh: "",
      captionEn: "",
      hashtags: ["#สะปันอันซีน"],
      likesCount: 250,
      sharesCount: 18,
      socialUrl: "https://www.facebook.com",
      photos: [],
      isFeaturedOnBooking: true,
    }
  );
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const multiPhotoRef = useRef<HTMLInputElement | null>(null);

  const handleUploadPhotos = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;
    setIsUploadingPhotos(true);
    try {
      const urls: string[] = [];
      for (const f of files) {
        const res = await uploadOptimizedImage(f, "reviews", 1440);
        urls.push(res.url);
      }
      setReview((prev) => ({ ...prev, photos: [...prev.photos, ...urls] }));
    } finally {
      setIsUploadingPhotos(false);
    }
  };

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    if (!review.authorNameTh.trim() || !review.captionTh.trim()) return;
    const matchedRoom =
      store.rooms.find((r) => r.id === review.roomId) || store.rooms[0];
    const finalReview: ManagedGuestReview = {
      ...review,
      authorNameEn: review.authorNameEn.trim() || review.authorNameTh.trim(),
      roomCode: matchedRoom?.code || review.roomCode,
      roomLabel: matchedRoom?.nameTh || review.roomLabel,
      photos:
        review.photos.length > 0
          ? review.photos
          : [matchedRoom?.images[0]?.url || ""],
    };

    saveStore((prev) => {
      const exists = prev.cms.reviews.some((r) => r.id === finalReview.id);
      return {
        ...prev,
        cms: {
          ...prev.cms,
          reviews: exists
            ? prev.cms.reviews.map((r) =>
                r.id === finalReview.id ? finalReview : r
              )
            : [finalReview, ...prev.cms.reviews],
        },
      };
    });
    onSaved("บันทึกรีวิวผู้เข้าพักเรียบร้อยแล้ว");
  };

  const handleDelete = () => {
    if (!existing) return;
    saveStore((prev) => ({
      ...prev,
      cms: {
        ...prev.cms,
        reviews: prev.cms.reviews.filter((r) => r.id !== existing.id),
      },
    }));
    onSaved("ลบรีวิวผู้เข้าพักแล้ว");
  };

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="ty-body font-semibold">
            รูปถ่ายรีวิว ({review.photos.length} รูป)
          </span>
          <StandardButton
            type="button"
            variant="secondary"
            size="sm"
            disabled={isUploadingPhotos}
            onClick={() => multiPhotoRef.current?.click()}
          >
            {isUploadingPhotos ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ImagePlus className="w-3.5 h-3.5" />
            )}
            <span>เพิ่มรูปรีวิว</span>
          </StandardButton>
          <input
            ref={multiPhotoRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleUploadPhotos}
            className="hidden"
          />
        </div>

        {review.photos.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {review.photos.map((photoUrl, idx) => (
              <div
                key={`${photoUrl}-${idx}`}
                className="relative w-24 h-20 rounded-[12px] overflow-hidden shrink-0 bg-[var(--color-background-muted)]"
              >
                <img
                  src={photoUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() =>
                    setReview({
                      ...review,
                      photos: review.photos.filter((_, i) => i !== idx),
                    })
                  }
                  className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/65 text-white flex items-center justify-center cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <ThaiFirstInput
        label="ชื่อลูกค้าผู้รีวิว"
        required
        valueTh={review.authorNameTh}
        valueEn={review.authorNameEn}
        onChangeTh={(v) => setReview({ ...review, authorNameTh: v })}
        onChangeEn={(v) => setReview({ ...review, authorNameEn: v })}
        placeholderTh="เช่น คุณกมลชนก"
      />

      <div className="grid grid-cols-2 gap-2.5">
        <div className="space-y-1.5">
          <label className="ty-body font-semibold block">ห้องที่เข้าพัก</label>
          <select
            value={review.roomId}
            onChange={(e) => setReview({ ...review, roomId: e.target.value })}
            className={CMS_INPUT_CLASS}
          >
            {store.rooms.map((rm) => (
              <option key={rm.id} value={rm.id}>
                {rm.code} · {rm.nameTh}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="ty-body font-semibold block">คะแนนรีวิว</label>
          <input
            type="text"
            value={review.rating}
            onChange={(e) => setReview({ ...review, rating: e.target.value })}
            placeholder="10/10"
            className={CMS_INPUT_CLASS}
          />
        </div>
      </div>

      <ThaiFirstTextarea
        label="ข้อความรีวิวความประทับใจ"
        valueTh={review.captionTh}
        valueEn={review.captionEn}
        onChangeTh={(v) => setReview({ ...review, captionTh: v })}
        onChangeEn={(v) => setReview({ ...review, captionEn: v })}
        rows={3}
      />

      <div className="space-y-1.5">
        <label className="ty-body font-semibold block">
          ลิงก์โพสต์จริง Facebook / IG (ถ้ามี)
        </label>
        <input
          type="url"
          value={review.socialUrl}
          onChange={(e) => setReview({ ...review, socialUrl: e.target.value })}
          placeholder="https://www.facebook.com/..."
          className={CMS_INPUT_CLASS}
        />
      </div>

      <label className="flex items-center justify-between gap-3 rounded-[12px] bg-[var(--color-background-muted)] px-3.5 h-11 cursor-pointer">
        <span className="ty-body font-semibold">
          แสดงในโซนรีวิวไฮไลท์หน้าจอง (/booking) ด้วย
        </span>
        <input
          type="checkbox"
          checked={review.isFeaturedOnBooking}
          onChange={(e) =>
            setReview({ ...review, isFeaturedOnBooking: e.target.checked })
          }
          className="w-4 h-4 accent-[var(--color-accent)]"
        />
      </label>

      <div className="pt-2 flex items-center gap-2.5">
        {existing && (
          <StandardButton
            type="button"
            variant="secondary"
            size="lg"
            onClick={handleDelete}
            className="!bg-[var(--color-error-muted)] !text-[var(--color-error)] shrink-0"
          >
            <Trash2 className="w-4 h-4" />
            <span>ลบ</span>
          </StandardButton>
        )}
        <StandardButton type="submit" variant="primary" size="lg" fullWidth>
          บันทึกรีวิวลูกค้า
        </StandardButton>
      </div>
    </form>
  );
}

export function GuideLocationEditor({
  store,
  saveStore,
  onSaved,
}: EditorCommonProps) {
  const [guide, setGuide] = useState<GuidePageCmsConfig>(store.cms.guidePage);
  const [locationTh, setLocationTh] = useState(store.propertyConfig.locationTh);
  const [locationEn, setLocationEn] = useState(store.propertyConfig.locationEn);
  const [lat, setLat] = useState(String(store.propertyConfig.latitude));
  const [lng, setLng] = useState(String(store.propertyConfig.longitude));
  const [phonesRaw, setPhonesRaw] = useState(
    store.propertyConfig.phones.join(", ")
  );
  const [email, setEmail] = useState(store.propertyConfig.email);

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    saveStore((prev) => ({
      ...prev,
      propertyConfig: {
        ...prev.propertyConfig,
        locationTh,
        locationEn,
        latitude: Number(lat) || prev.propertyConfig.latitude,
        longitude: Number(lng) || prev.propertyConfig.longitude,
        phones: phonesRaw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        email: email.trim(),
      },
      cms: {
        ...prev.cms,
        guidePage: guide,
      },
    }));
    onSaved("บันทึกแผนที่และข้อมูลรอบที่พักเรียบร้อยแล้ว");
  };

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <ThaiFirstInput
        label="หัวข้อหน้าแผนที่"
        valueTh={guide.titleTh}
        valueEn={guide.titleEn}
        onChangeTh={(v) => setGuide({ ...guide, titleTh: v })}
        onChangeEn={(v) => setGuide({ ...guide, titleEn: v })}
      />

      <ThaiFirstInput
        label="ที่อยู่ที่พัก"
        valueTh={locationTh}
        valueEn={locationEn}
        onChangeTh={setLocationTh}
        onChangeEn={setLocationEn}
      />

      <div className="grid grid-cols-2 gap-2.5">
        <div className="space-y-1.5">
          <label className="ty-caption font-semibold block">Latitude</label>
          <input
            type="text"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            className={CMS_INPUT_CLASS}
          />
        </div>
        <div className="space-y-1.5">
          <label className="ty-caption font-semibold block">Longitude</label>
          <input
            type="text"
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            className={CMS_INPUT_CLASS}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="ty-body font-semibold block">
          ลิงก์ปุ่ม Google Maps
        </label>
        <input
          type="url"
          value={guide.googleMapsUrl}
          onChange={(e) =>
            setGuide({ ...guide, googleMapsUrl: e.target.value })
          }
          className={CMS_INPUT_CLASS}
        />
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div className="space-y-1.5">
          <label className="ty-caption font-semibold block">เบอร์โทร</label>
          <input
            type="text"
            value={phonesRaw}
            onChange={(e) => setPhonesRaw(e.target.value)}
            className={CMS_INPUT_CLASS}
          />
        </div>
        <div className="space-y-1.5">
          <label className="ty-caption font-semibold block">อีเมล</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={CMS_INPUT_CLASS}
          />
        </div>
      </div>

      <div className="pt-3 border-t border-[var(--color-border)] space-y-3">
        <span className="ty-subtitle block">หมวดสถานที่แนะนำรอบที่พัก</span>
        {guide.nearbyCategories.map((cat, idx) => (
          <div key={cat.id} className="space-y-2">
            <ThaiFirstInput
              label={`หมวดที่ ${idx + 1}`}
              valueTh={cat.titleTh}
              valueEn={cat.titleEn}
              onChangeTh={(v) => {
                const next = [...guide.nearbyCategories];
                next[idx] = { ...cat, titleTh: v };
                setGuide({ ...guide, nearbyCategories: next });
              }}
              onChangeEn={(v) => {
                const next = [...guide.nearbyCategories];
                next[idx] = { ...cat, titleEn: v };
                setGuide({ ...guide, nearbyCategories: next });
              }}
            />
            <textarea
              rows={3}
              value={cat.itemsTh.join("\n")}
              onChange={(e) => {
                const next = [...guide.nearbyCategories];
                next[idx] = {
                  ...cat,
                  itemsTh: e.target.value
                    .split("\n")
                    .map((s) => s.trim())
                    .filter(Boolean),
                };
                setGuide({ ...guide, nearbyCategories: next });
              }}
              placeholder="บรรทัดละ 1 สถานที่"
              className="w-full rounded-[12px] bg-[var(--color-background-muted)] p-3 ty-body focus:outline-none"
            />
          </div>
        ))}
      </div>

      <StandardButton type="submit" variant="primary" size="lg" fullWidth>
        บันทึกข้อมูลแผนที่ & รอบที่พัก
      </StandardButton>
    </form>
  );
}

export function GuideFaqsEditor({
  store,
  saveStore,
  onSaved,
}: EditorCommonProps) {
  const [faqs, setFaqs] = useState(store.cms.guidePage.faqs);

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    saveStore((prev) => ({
      ...prev,
      cms: {
        ...prev.cms,
        guidePage: {
          ...prev.cms.guidePage,
          faqs,
        },
      },
    }));
    onSaved("บันทึกคำถามที่พบบ่อย (FAQs) เรียบร้อยแล้ว");
  };

  return (
    <form onSubmit={handleSave} className="space-y-4">
      {faqs.map((faq, idx) => (
        <div
          key={faq.id}
          className="pt-3 border-t border-[var(--color-border)] first:border-t-0 first:pt-0 space-y-2.5"
        >
          <div className="flex items-center justify-between">
            <span className="ty-caption font-bold text-[var(--color-accent)]">
              คำถามข้อที่ {idx + 1}
            </span>
            <button
              type="button"
              onClick={() => setFaqs(faqs.filter((_, i) => i !== idx))}
              className="ty-caption text-[var(--color-error)] font-semibold cursor-pointer"
            >
              ลบข้อนี้
            </button>
          </div>
          <ThaiFirstInput
            label="คำถาม (Q)"
            valueTh={faq.qTh}
            valueEn={faq.qEn}
            onChangeTh={(v) => {
              const next = [...faqs];
              next[idx] = { ...faq, qTh: v };
              setFaqs(next);
            }}
            onChangeEn={(v) => {
              const next = [...faqs];
              next[idx] = { ...faq, qEn: v };
              setFaqs(next);
            }}
          />
          <ThaiFirstTextarea
            label="คำตอบ (A)"
            valueTh={faq.aTh}
            valueEn={faq.aEn}
            onChangeTh={(v) => {
              const next = [...faqs];
              next[idx] = { ...faq, aTh: v };
              setFaqs(next);
            }}
            onChangeEn={(v) => {
              const next = [...faqs];
              next[idx] = { ...faq, aEn: v };
              setFaqs(next);
            }}
            rows={3}
          />
        </div>
      ))}

      <StandardButton
        type="button"
        variant="secondary"
        size="md"
        fullWidth
        onClick={() =>
          setFaqs([
            ...faqs,
            {
              id: `faq-${Date.now()}`,
              qTh: "",
              qEn: "",
              aTh: "",
              aEn: "",
            },
          ])
        }
      >
        <Plus className="w-4 h-4" />
        <span>เพิ่มคำถามที่พบบ่อย</span>
      </StandardButton>

      <StandardButton type="submit" variant="primary" size="lg" fullWidth>
        บันทึก FAQs ทั้งหมด
      </StandardButton>
    </form>
  );
}

