"use client";

import React, { useState } from "react";
import {
  Building2,
  MapPin,
  PauseCircle,
  PlayCircle,
  Plus,
  QrCode,
  Save,
  Tag,
  Trash2,
  Upload,
} from "lucide-react";
import {
  STAY_STYLE_TABS,
  THAILAND_77_PROVINCES,
} from "@/data/thailandProvinces";
import { uploadMediaFile } from "@/lib/slipScanner";
import {
  StandardButton,
  StandardInput,
  StatusPill,
} from "@/components/ui/standards";
import type { DiscountTypeDto } from "@/types/cangaroom";
import type { StudioPayload } from "@/components/studio/studioTypes";

const STYLE_OPTIONS = STAY_STYLE_TABS.filter((tab) => tab.id !== "all");

export function StudioCouponsAndProfileTab({
  data,
  onReload,
  onNotify,
}: {
  data: StudioPayload;
  onReload: () => Promise<void>;
  onNotify: (msg: string) => void;
}) {
  // Coupon form state
  const [couponCode, setCouponCode] = useState("");
  const [couponTitle, setCouponTitle] = useState("");
  const [couponDesc, setCouponDesc] = useState("");
  const [discountType, setDiscountType] = useState<DiscountTypeDto>("FIXED_THB");
  const [discountValue, setDiscountValue] = useState(300);
  const [minSpendThb, setMinSpendThb] = useState(2000);
  const [maxDiscountThb, setMaxDiscountThb] = useState("");
  const [totalQuota, setTotalQuota] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [isCreatingCoupon, setIsCreatingCoupon] = useState(false);

  // Hotel Profile + PromptPay form state
  const [nameTh, setNameTh] = useState(data.hotel.nameTh);
  const [nameEn, setNameEn] = useState(data.hotel.nameEn);
  const [taglineTh, setTaglineTh] = useState(data.hotel.taglineTh);
  const [descriptionTh, setDescriptionTh] = useState(data.hotel.descriptionTh);
  const [logoUrl, setLogoUrl] = useState(data.hotel.logoUrl || "");
  const [coverImageUrl, setCoverImageUrl] = useState(
    data.hotel.coverImageUrl || ""
  );
  const [provinceId, setProvinceId] = useState(data.hotel.provinceId);
  const [districtTh, setDistrictTh] = useState(data.hotel.districtTh);
  const [addressTh, setAddressTh] = useState(data.hotel.addressTh);
  const [latitude, setLatitude] = useState(
    data.hotel.latitude !== null ? String(data.hotel.latitude) : ""
  );
  const [longitude, setLongitude] = useState(
    data.hotel.longitude !== null ? String(data.hotel.longitude) : ""
  );
  const [googleMapsUrl, setGoogleMapsUrl] = useState(
    data.hotel.googleMapsUrl || ""
  );
  const [stayStyles, setStayStyles] = useState<string[]>(data.hotel.stayStyles);
  const [checkInTime, setCheckInTime] = useState(data.hotel.checkInTime);
  const [checkOutTime, setCheckOutTime] = useState(data.hotel.checkOutTime);
  const [petsAllowed, setPetsAllowed] = useState(data.hotel.petsAllowed);
  const [petPolicyTh, setPetPolicyTh] = useState(data.hotel.petPolicyTh);
  const [contactPhone, setContactPhone] = useState(data.hotel.contactPhone);
  const [contactLine, setContactLine] = useState(data.hotel.contactLine);
  const [facebookPageUrl, setFacebookPageUrl] = useState(
    data.hotel.facebookPageUrl
  );
  const [instagramUrl, setInstagramUrl] = useState(data.hotel.instagramUrl);
  const [promptPayId, setPromptPayId] = useState(data.hotel.promptPayId);
  const [promptPayAccountName, setPromptPayAccountName] = useState(
    data.hotel.promptPayAccountName
  );
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingBrandAsset, setIsUploadingBrandAsset] = useState(false);

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim() || !couponTitle.trim()) {
      onNotify("กรุณากรอกรหัสคูปองและชื่อโปรโมชั่น");
      return;
    }

    setIsCreatingCoupon(true);
    try {
      const res = await fetch("/api/studio/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotelSlug: data.hotel.slug,
          code: couponCode.trim().toUpperCase(),
          titleTh: couponTitle.trim(),
          descriptionTh: couponDesc.trim(),
          discountType,
          discountValue: Number(discountValue),
          minSpendThb: Number(minSpendThb) || 0,
          maxDiscountThb: maxDiscountThb ? Number(maxDiscountThb) : null,
          totalQuota: totalQuota ? Number(totalQuota) : null,
          expiresAt: expiresAt || undefined,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        onNotify(json.error || "สร้างคูปองไม่สำเร็จ");
        return;
      }
      setCouponCode("");
      setCouponTitle("");
      setCouponDesc("");
      setMaxDiscountThb("");
      setTotalQuota("");
      setExpiresAt("");
      onNotify("สร้างคูปองส่วนลดเรียบร้อยแล้ว แสดงในหน้า /deal และหน้าร้านทันที");
      await onReload();
    } finally {
      setIsCreatingCoupon(false);
    }
  };

  const handleToggleCoupon = async (id: string, nextActive: boolean) => {
    const res = await fetch("/api/studio/coupons", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hotelSlug: data.hotel.slug,
        id,
        isActive: nextActive,
      }),
    });
    if (res.ok) {
      onNotify(nextActive ? "เปิดใช้งานคูปองแล้ว" : "พักใช้งานคูปองชั่วคราวแล้ว");
      await onReload();
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    const res = await fetch(
      `/api/studio/coupons?id=${encodeURIComponent(id)}&hotel=${encodeURIComponent(
        data.hotel.slug
      )}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      onNotify("ลบคูปองออกจากระบบแล้ว");
      await onReload();
    }
  };

  const handleUploadBrandAsset = async (
    target: "logo" | "cover",
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingBrandAsset(true);
    try {
      const url = await uploadMediaFile(file, "logos");
      if (target === "logo") {
        setLogoUrl(url);
      } else {
        setCoverImageUrl(url);
      }
      onNotify(
        target === "logo" ? "อัปโหลดโลโก้ที่พักแล้ว" : "อัปโหลดภาพปกที่พักแล้ว"
      );
    } catch {
      onNotify("อัปโหลดรูปไม่สำเร็จ");
    } finally {
      setIsUploadingBrandAsset(false);
    }
  };

  const toggleStyle = (styleId: string) => {
    setStayStyles((prev) =>
      prev.includes(styleId)
        ? prev.filter((item) => item !== styleId)
        : [...prev, styleId]
    );
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      const parsedLat = latitude.trim() ? Number(latitude) : null;
      const parsedLng = longitude.trim() ? Number(longitude) : null;

      const res = await fetch("/api/studio/hotel", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotelSlug: data.hotel.slug,
          nameTh: nameTh.trim(),
          nameEn: nameEn.trim(),
          taglineTh: taglineTh.trim(),
          descriptionTh: descriptionTh.trim(),
          logoUrl: logoUrl.trim() || null,
          coverImageUrl: coverImageUrl.trim() || null,
          provinceId,
          districtTh: districtTh.trim(),
          addressTh: addressTh.trim(),
          latitude: Number.isFinite(parsedLat) ? parsedLat : null,
          longitude: Number.isFinite(parsedLng) ? parsedLng : null,
          googleMapsUrl: googleMapsUrl.trim() || null,
          stayStyles,
          checkInTime: checkInTime.trim(),
          checkOutTime: checkOutTime.trim(),
          petsAllowed,
          petPolicyTh: petPolicyTh.trim(),
          contactPhone: contactPhone.trim(),
          contactLine: contactLine.trim(),
          facebookPageUrl: facebookPageUrl.trim(),
          instagramUrl: instagramUrl.trim(),
          promptPayId: promptPayId.trim(),
          promptPayAccountName: promptPayAccountName.trim(),
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        onNotify(json.error || "บันทึกข้อมูลโปรไฟล์ไม่สำเร็จ");
        return;
      }
      onNotify("อัปเดตข้อมูลหน้าร้านและบัญชีรับเงิน PromptPay แล้ว");
      await onReload();
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. Coupon Creator & Existing Coupons */}
      <section className="space-y-4">
        <form
          onSubmit={handleCreateCoupon}
          className="rounded-[20px] bg-[var(--color-background-card)] border border-[var(--color-border)] p-5 space-y-4"
        >
          <h2 className="ty-title flex items-center gap-2">
            <Tag className="w-5 h-5 text-[var(--color-promo)]" />
            <span>สร้างคูปองส่วนลดหน้าร้าน & หน้า /deal (0% GP)</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <StandardInput
              label="รหัสโค้ด (EN/ตัวเลข) *"
              placeholder="เช่น WEEKDAY500"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              required
            />
            <div className="sm:col-span-2">
              <StandardInput
                label="ชื่อโปรโมชั่น / คูปอง *"
                placeholder="เช่น ลดทันที ฿500 เมื่อเข้าพักวันอาทิตย์-พฤหัสบดี"
                value={couponTitle}
                onChange={(e) => setCouponTitle(e.target.value)}
                required
              />
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="ty-body font-semibold text-[var(--color-text-primary)]">
                ประเภทส่วนลด
              </span>
              <select
                className="fw-input w-full h-10"
                value={discountType}
                onChange={(e) =>
                  setDiscountType(e.target.value as DiscountTypeDto)
                }
              >
                <option value="FIXED_THB">ลดเป็นบาท (฿)</option>
                <option value="PERCENT">ลดเป็นเปอร์เซ็นต์ (%)</option>
              </select>
            </label>

            <StandardInput
              label={`มูลค่าส่วนลด (${discountType === "PERCENT" ? "%" : "บาท"}) *`}
              type="number"
              min={1}
              value={discountValue}
              onChange={(e) => setDiscountValue(Number(e.target.value))}
              required
            />
            <StandardInput
              label="ยอดจองขั้นต่ำ (บาท)"
              type="number"
              min={0}
              value={minSpendThb}
              onChange={(e) => setMinSpendThb(Number(e.target.value))}
            />

            <StandardInput
              label="ลดสูงสุด (บาท)"
              optionalText="สำหรับ %"
              type="number"
              min={1}
              placeholder="ไม่จำกัด"
              value={maxDiscountThb}
              onChange={(e) => setMaxDiscountThb(e.target.value)}
            />
            <StandardInput
              label="จำนวนสิทธิ์ทั้งหมด"
              optionalText="ไม่บังคับ"
              type="number"
              min={1}
              placeholder="ไม่จำกัดสิทธิ์"
              value={totalQuota}
              onChange={(e) => setTotalQuota(e.target.value)}
            />
            <StandardInput
              label="วันหมดอายุ"
              optionalText="เว้นว่าง = 90 วัน"
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div className="flex-1">
              <StandardInput
                label="เงื่อนไขเพิ่มเติม"
                optionalText="ไม่บังคับ"
                placeholder="เช่น ใช้ร่วมกับบริการเสริมหมูกระทะได้ / เฉพาะจองตรงผ่าน Cangaroom"
                value={couponDesc}
                onChange={(e) => setCouponDesc(e.target.value)}
              />
            </div>
            <StandardButton
              type="submit"
              variant="promo"
              size="md"
              disabled={isCreatingCoupon}
            >
              <Plus className="w-4 h-4" />
              <span>{isCreatingCoupon ? "กำลังสร้าง..." : "สร้างคูปองใหม่"}</span>
            </StandardButton>
          </div>
        </form>

        <div className="space-y-2.5">
          <h3 className="ty-subtitle font-bold">
            คูปองของที่พักทั้งหมด ({data.coupons.length})
          </h3>
          {data.coupons.length === 0 ? (
            <div className="rounded-[18px] bg-[var(--color-background-muted)] p-6 text-center ty-body">
              ยังไม่มีคูปองส่วนลด — สร้างคูปองด้านบนเพื่อดึงดูดคนที่เซฟ Pin คุณไว้ใน /board
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data.coupons.map((c) => (
                <div
                  key={c.id}
                  className="rounded-[18px] bg-[var(--color-background-card)] border border-[var(--color-border)] p-4 flex flex-col justify-between gap-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono ty-body font-bold px-2.5 py-0.5 rounded-[8px] bg-[var(--color-promo-muted)] text-[var(--color-promo-text)]">
                        {c.code}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {c.isFeaturedDeal && (
                          <StatusPill variant="promo">Featured Deal</StatusPill>
                        )}
                        <StatusPill variant={c.isActive ? "success" : "neutral"}>
                          {c.isActive ? "เปิดใช้งาน" : "พักชั่วคราว"}
                        </StatusPill>
                      </div>
                    </div>
                    <p className="ty-body font-semibold">{c.titleTh}</p>
                    <p className="ty-caption">
                      ส่วนลด{" "}
                      {c.discountType === "PERCENT"
                        ? `${c.discountValue}%`
                        : `฿${c.discountValue.toLocaleString()}`}{" "}
                      · ขั้นต่ำ ฿{c.minSpendThb.toLocaleString()} · เก็บแล้ว{" "}
                      {c.claimedCount} ครั้ง · ใช้แล้ว {c.usedCount} ครั้ง
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)]">
                    <span className="ty-caption">
                      หมดอายุ{" "}
                      {new Date(c.expiresAt).toLocaleDateString("th-TH")}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <StandardButton
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => handleToggleCoupon(c.id, !c.isActive)}
                      >
                        {c.isActive ? (
                          <>
                            <PauseCircle className="w-4 h-4" />
                            <span>พักใช้</span>
                          </>
                        ) : (
                          <>
                            <PlayCircle className="w-4 h-4" />
                            <span>เปิดใช้</span>
                          </>
                        )}
                      </StandardButton>
                      <button
                        type="button"
                        onClick={() => handleDeleteCoupon(c.id)}
                        className="btn-icon text-[var(--color-danger)]"
                        aria-label="ลบคูปอง"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 2. Hotel Profile, PromptPay QR, Contacts & Map Editor */}
      <form
        onSubmit={handleSaveProfile}
        className="rounded-[20px] bg-[var(--color-background-card)] border border-[var(--color-border)] p-5 space-y-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="ty-title flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[var(--color-accent)]" />
            <span>ตั้งค่าโปรไฟล์หน้าร้าน & บัญชี PromptPay รับเงินตรง</span>
          </h2>
          <span className="ty-caption">/{data.hotel.slug}</span>
        </div>

        {/* PromptPay Highlight Box */}
        <div className="rounded-[18px] bg-[var(--color-accent-muted)]/60 border border-[var(--color-accent-border)] p-4 space-y-3">
          <h3 className="ty-subtitle font-bold flex items-center gap-2 text-[var(--color-accent-text)]">
            <QrCode className="w-4 h-4" />
            <span>บัญชีรับเงินตรงจากผู้เข้าพัก 100% (PromptPay 0% GP)</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <StandardInput
              label="เบอร์โทร / เลขผู้เสียภาษี PromptPay *"
              placeholder="เช่น 0812345678 หรือ 0105561000001"
              value={promptPayId}
              onChange={(e) => setPromptPayId(e.target.value)}
              required
            />
            <StandardInput
              label="ชื่อบัญชีรับเงินที่แสดงบนหน้าชำระเงิน *"
              placeholder="เช่น บจก. สะปัน อันซีน รีสอร์ท"
              value={promptPayAccountName}
              onChange={(e) => setPromptPayAccountName(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Brand Identity & Photos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StandardInput
            label="ชื่อที่พัก (ภาษาไทย) *"
            value={nameTh}
            onChange={(e) => setNameTh(e.target.value)}
            required
          />
          <StandardInput
            label="ชื่อที่พัก (English)"
            value={nameEn}
            onChange={(e) => setNameEn(e.target.value)}
          />
          <div className="md:col-span-2">
            <StandardInput
              label="สโลแกนสั้นๆ ใต้ชื่อที่พัก (Tagline)"
              value={taglineTh}
              onChange={(e) => setTaglineTh(e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <label className="ty-body font-semibold block mb-1.5">
              คำอธิบายที่พักฉบับเต็ม
            </label>
            <textarea
              rows={3}
              className="fw-input w-full"
              value={descriptionTh}
              onChange={(e) => setDescriptionTh(e.target.value)}
            />
          </div>

          <div>
            <span className="ty-body font-semibold block mb-1.5">
              โลโก้ที่พัก
            </span>
            <div className="flex items-center gap-2">
              {logoUrl && (
                <img
                  src={logoUrl}
                  alt="Logo"
                  className="w-10 h-10 rounded-full object-cover border border-[var(--color-border)] shrink-0"
                />
              )}
              <label className="btn-fw-secondary cursor-pointer shrink-0">
                <Upload className="w-4 h-4" />
                <span>อัปโหลด</span>
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => handleUploadBrandAsset("logo", e)}
                />
              </label>
              <input
                type="url"
                className="fw-input flex-1"
                placeholder="URL โลโก้"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
              />
            </div>
          </div>

          <div>
            <span className="ty-body font-semibold block mb-1.5">
              ภาพปกหน้าร้าน (Cover Banner)
            </span>
            <div className="flex items-center gap-2">
              {coverImageUrl && (
                <img
                  src={coverImageUrl}
                  alt="Cover"
                  className="w-16 h-10 rounded-[8px] object-cover border border-[var(--color-border)] shrink-0"
                />
              )}
              <label className="btn-fw-secondary cursor-pointer shrink-0">
                <Upload className="w-4 h-4" />
                <span>อัปโหลด</span>
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => handleUploadBrandAsset("cover", e)}
                />
              </label>
              <input
                type="url"
                className="fw-input flex-1"
                placeholder="URL ภาพปก"
                value={coverImageUrl}
                onChange={(e) => setCoverImageUrl(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Location & Map */}
        <div className="space-y-3">
          <h3 className="ty-subtitle font-bold flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[var(--color-promo)]" />
            <span>ทำเลที่ตั้ง & แผนที่</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="ty-body font-semibold text-[var(--color-text-primary)]">
                จังหวัด *
              </span>
              <select
                className="fw-input w-full h-10"
                value={provinceId}
                onChange={(e) => setProvinceId(e.target.value)}
              >
                {THAILAND_77_PROVINCES.map((prov) => (
                  <option key={prov.id} value={prov.id}>
                    {prov.nameTh} ({prov.nameEn})
                  </option>
                ))}
              </select>
            </label>
            <StandardInput
              label="อำเภอ / เขต"
              value={districtTh}
              onChange={(e) => setDistrictTh(e.target.value)}
            />
            <StandardInput
              label="ลิงก์ Google Maps"
              placeholder="https://maps.google.com/..."
              value={googleMapsUrl}
              onChange={(e) => setGoogleMapsUrl(e.target.value)}
            />
            <div className="sm:col-span-2">
              <StandardInput
                label="ที่อยู่สำหรับลูกค้า & ใบจอง"
                value={addressTh}
                onChange={(e) => setAddressTh(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <StandardInput
                label="Latitude"
                placeholder="19.188"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
              />
              <StandardInput
                label="Longitude"
                placeholder="101.196"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Stay Styles & Policies */}
        <div className="space-y-3">
          <span className="ty-body font-semibold block">
            สไตล์ที่พัก (ใช้จัดหมวดหมู่บนหน้าฟีดหลัก & AI Search)
          </span>
          <div className="flex flex-wrap gap-2">
            {STYLE_OPTIONS.map((style) => {
              const active = stayStyles.includes(style.id);
              return (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => toggleStyle(style.id)}
                  className={`px-3.5 py-1.5 rounded-full text-[13px] font-semibold transition-colors ${
                    active
                      ? "bg-[#111111] text-white dark:bg-[#f5f5f5] dark:text-[#111111]"
                      : "bg-[var(--color-background-muted)] text-[var(--color-text-secondary)]"
                  }`}
                >
                  {style.labelTh}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <StandardInput
              label="เวลาเช็กอิน"
              value={checkInTime}
              onChange={(e) => setCheckInTime(e.target.value)}
            />
            <StandardInput
              label="เวลาเช็กเอาต์"
              value={checkOutTime}
              onChange={(e) => setCheckOutTime(e.target.value)}
            />
            <div className="flex items-end pb-2">
              <label className="inline-flex items-center gap-2 cursor-pointer ty-body font-medium">
                <input
                  type="checkbox"
                  checked={petsAllowed}
                  onChange={(e) => setPetsAllowed(e.target.checked)}
                  className="w-4 h-4 accent-[var(--color-accent)]"
                />
                <span>อนุญาตสัตว์เลี้ยงเข้าพัก (Pet-friendly)</span>
              </label>
            </div>
          </div>

          {petsAllowed && (
            <StandardInput
              label="เงื่อนไขสัตว์เลี้ยง"
              placeholder="เช่น รับน้องหมา/แมว ไม่เกิน 10 กก. มีค่าบริการ 300 บาท/คืน"
              value={petPolicyTh}
              onChange={(e) => setPetPolicyTh(e.target.value)}
            />
          )}
        </div>

        {/* Direct Contact Channels */}
        <div className="space-y-3">
          <h3 className="ty-subtitle font-bold">
            ช่องทางทักตรงกับลูกค้า (ลดภาระแชทในเว็บ & เก็บสถิติ Click ROI)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <StandardInput
              label="เบอร์โทรศัพท์"
              placeholder="08x-xxx-xxxx"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
            />
            <StandardInput
              label="LINE ID หรือลิงก์ LINE OA"
              placeholder="@yourhotel หรือ https://line.me/..."
              value={contactLine}
              onChange={(e) => setContactLine(e.target.value)}
            />
            <StandardInput
              label="Facebook Page URL"
              placeholder="https://facebook.com/yourpage"
              value={facebookPageUrl}
              onChange={(e) => setFacebookPageUrl(e.target.value)}
            />
            <StandardInput
              label="Instagram URL"
              placeholder="https://instagram.com/yourpage"
              value={instagramUrl}
              onChange={(e) => setInstagramUrl(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <StandardButton
            type="submit"
            variant="primary"
            size="md"
            disabled={isSavingProfile || isUploadingBrandAsset}
          >
            <Save className="w-4 h-4" />
            <span>
              {isSavingProfile
                ? "กำลังบันทึกข้อมูล..."
                : "บันทึกข้อมูลที่พักทั้งหมด"}
            </span>
          </StandardButton>
        </div>
      </form>
    </div>
  );
}
