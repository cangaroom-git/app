"use client";

import React, { useMemo, useState } from "react";
import {
  BookOpen,
  Edit3,
  ImagePlus,
  PauseCircle,
  Percent,
  PlayCircle,
  Plus,
  Tag,
  Trash2,
} from "lucide-react";
import { HotelCouponTicketCard } from "@/components/deals/HotelCouponTicketCard";
import {
  StandardFieldGroup,
  StandardInput,
  StandardSelectField,
  StandardStepperRow,
} from "@/components/ui/standards";
import { StudioBlogPostsTab } from "@/components/studio/StudioBlogPostsTab";
import { StudioPinsAndFacebookTab } from "@/components/studio/StudioPinsAndFacebookTab";
import { StudioSheetModal } from "@/components/studio/StudioSheetModal";
import type {
  CouponDealDto,
  DiscountRuleTypeDto,
  DiscountTypeDto,
  HotelDiscountRuleDto,
} from "@/types/cangaroom";
import type {
  StudioCouponRecord,
  StudioPayload,
} from "@/components/studio/studioTypes";

type GrowthSubTabId = "discounts" | "pins" | "blog";

const QUICK_DISCOUNT_PRESETS: Array<{
  ruleType: DiscountRuleTypeDto;
  titleTh: string;
  descTh: string;
  discountValue: number;
  minNights?: number;
  minAdvanceDays?: number;
  maxAdvanceDays?: number;
}> = [
  {
    ruleType: "LENGTH_OF_STAY",
    titleTh: "ส่วนลดพักต่อเนื่อง 2 คืนขึ้นไป",
    descTh: "ลดอัตโนมัติเมื่อลูกค้าจองตั้งแต่ 2 คืนขึ้นไป",
    discountValue: 10,
    minNights: 2,
  },
  {
    ruleType: "LENGTH_OF_STAY",
    titleTh: "ส่วนลดพักยาวรายสัปดาห์ (7+ คืน)",
    descTh: "ดึงดูดสาย Workation & พูลวิลล่าระยะยาว",
    discountValue: 20,
    minNights: 7,
  },
  {
    ruleType: "EARLY_BIRD",
    titleTh: "จองล่วงหน้า Early Bird (14+ วัน)",
    descTh: "ลดอัตโนมัติเมื่อจองล่วงหน้าอย่างน้อย 14 วัน",
    discountValue: 10,
    minAdvanceDays: 14,
  },
  {
    ruleType: "LAST_MINUTE",
    titleTh: "ดีลนาทีสุดท้าย Last-Minute (≤ 3 วัน)",
    descTh: "ช่วยระบายห้องว่างใกล้เข้าพักภายใน 3 วัน",
    discountValue: 15,
    maxAdvanceDays: 3,
  },
];

export function StudioGrowthTab({
  data,
  mode = "all",
  onReload,
  onNotify,
}: {
  data: StudioPayload;
  mode?: "all" | "promotions" | "content";
  onReload: () => Promise<void>;
  onNotify: (msg: string) => void;
}) {
  const { hotel, coupons, discountRules = [], posts } = data;
  const [subTab, setSubTab] = useState<GrowthSubTabId>(() =>
    mode === "content" ? "pins" : "discounts"
  );

  // =========================================================================
  // 1. COUPON MODAL STATE (Create + Edit + Live 3D Ticket Preview)
  // =========================================================================
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [editingCouponId, setEditingCouponId] = useState<string | null>(null);
  const [cpCode, setCpCode] = useState("");
  const [cpTitle, setCpTitle] = useState("");
  const [cpDesc, setCpDesc] = useState("");
  const [cpType, setCpType] = useState<DiscountTypeDto>("FIXED_THB");
  const [cpValue, setCpValue] = useState(300);
  const [cpMinSpend, setCpMinSpend] = useState(2000);
  const [cpMaxDiscount, setCpMaxDiscount] = useState("");
  const [cpTotalQuota, setCpTotalQuota] = useState("");
  const [cpStartsAt, setCpStartsAt] = useState("");
  const [cpExpiresAt, setCpExpiresAt] = useState("");
  const [isSavingCoupon, setIsSavingCoupon] = useState(false);

  const openCreateCouponModal = () => {
    setEditingCouponId(null);
    setCpCode("");
    setCpTitle("");
    setCpDesc("");
    setCpType("FIXED_THB");
    setCpValue(300);
    setCpMinSpend(2000);
    setCpMaxDiscount("");
    setCpTotalQuota("");
    setCpStartsAt(new Date().toISOString().slice(0, 10));
    setCpExpiresAt("");
    setIsCouponModalOpen(true);
  };

  const openEditCouponModal = (c: StudioCouponRecord) => {
    setEditingCouponId(c.id);
    setCpCode(c.code);
    setCpTitle(c.titleTh);
    setCpDesc(c.descriptionTh || "");
    setCpType(c.discountType);
    setCpValue(c.discountValue);
    setCpMinSpend(c.minSpendThb);
    setCpMaxDiscount(c.maxDiscountThb ? String(c.maxDiscountThb) : "");
    setCpTotalQuota(c.totalQuota ? String(c.totalQuota) : "");
    setCpStartsAt(c.startsAt ? c.startsAt.slice(0, 10) : "");
    setCpExpiresAt(c.expiresAt ? c.expiresAt.slice(0, 10) : "");
    setIsCouponModalOpen(true);
  };

  const previewDeal = useMemo<CouponDealDto>(() => {
    const expIso = cpExpiresAt
      ? new Date(cpExpiresAt).toISOString()
      : new Date(Date.now() + 90 * 86400000).toISOString();
    return {
      id: editingCouponId || "preview",
      hotelId: hotel.id,
      hotelSlug: hotel.slug,
      hotelNameTh: hotel.nameTh,
      hotelNameEn: hotel.nameEn || hotel.nameTh,
      hotelLogoUrl: hotel.logoUrl,
      hotelVerificationStatus: hotel.verificationStatus,
      provinceId: hotel.provinceId,
      provinceNameTh: "",
      provinceNameEn: "",
      stayStyles: hotel.stayStyles,
      code: (cpCode || "DIRECT300").toUpperCase(),
      titleTh: cpTitle || "ลดทันทีสำหรับลูกค้าจองตรง 0% GP",
      titleEn: cpTitle || "Direct Booking Discount",
      descriptionTh: cpDesc || "ใช้ได้เฉพาะการจองตรงผ่าน Cangaroom",
      descriptionEn: cpDesc || "Valid on direct booking",
      coverImageUrl: hotel.coverImageUrl,
      discountType: cpType,
      discountValue: Math.max(1, Number(cpValue) || 100),
      minSpendThb: Math.max(0, Number(cpMinSpend) || 0),
      maxDiscountThb: cpMaxDiscount ? Number(cpMaxDiscount) : null,
      totalQuota: cpTotalQuota ? Number(cpTotalQuota) : null,
      claimedCount: 0,
      usedCount: 0,
      startsAt: cpStartsAt
        ? new Date(cpStartsAt).toISOString()
        : new Date().toISOString(),
      expiresAt: expIso,
      isFeaturedDeal: false,
      isActive: true,
      isClaimedByMe: false,
      usedAt: null,
    };
  }, [
    editingCouponId,
    hotel,
    cpCode,
    cpTitle,
    cpDesc,
    cpType,
    cpValue,
    cpMinSpend,
    cpMaxDiscount,
    cpTotalQuota,
    cpStartsAt,
    cpExpiresAt,
  ]);

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cpTitle.trim() || (!editingCouponId && !cpCode.trim())) {
      onNotify("กรุณากรอกรหัสคูปองและชื่อโปรโมชั่น");
      return;
    }
    setIsSavingCoupon(true);
    try {
      const res = await fetch("/api/studio/coupons", {
        method: editingCouponId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotelSlug: hotel.slug,
          ...(editingCouponId
            ? { id: editingCouponId }
            : { code: cpCode.trim().toUpperCase() }),
          titleTh: cpTitle.trim(),
          descriptionTh: cpDesc.trim(),
          discountType: cpType,
          discountValue: Math.max(1, Number(cpValue) || 1),
          minSpendThb: Math.max(0, Number(cpMinSpend) || 0),
          maxDiscountThb: cpMaxDiscount ? Number(cpMaxDiscount) : null,
          totalQuota: cpTotalQuota ? Number(cpTotalQuota) : null,
          startsAt: cpStartsAt || undefined,
          expiresAt: cpExpiresAt || undefined,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        onNotify(json.error || "บันทึกคูปองไม่สำเร็จ");
        return;
      }
      setIsCouponModalOpen(false);
      onNotify(
        editingCouponId
          ? "อัปเดตคูปองส่วนลดแล้ว"
          : "สร้างคูปองแล้ว แสดงบนหน้าร้านและ /deal ทันที"
      );
      await onReload();
    } finally {
      setIsSavingCoupon(false);
    }
  };

  const handleToggleCoupon = async (id: string, nextActive: boolean) => {
    const res = await fetch("/api/studio/coupons", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hotelSlug: hotel.slug, id, isActive: nextActive }),
    });
    if (res.ok) {
      onNotify(nextActive ? "เปิดใช้งานคูปองแล้ว" : "พักใช้งานคูปองชั่วคราวแล้ว");
      await onReload();
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    const res = await fetch(
      `/api/studio/coupons?id=${encodeURIComponent(id)}&hotel=${encodeURIComponent(
        hotel.slug
      )}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      setIsCouponModalOpen(false);
      onNotify("ลบคูปองออกจากระบบแล้ว");
      await onReload();
    }
  };

  // =========================================================================
  // 2. AUTOMATIC STAY DISCOUNTS (HotelDiscountRule CRUD)
  // =========================================================================
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [rlType, setRlType] = useState<DiscountRuleTypeDto>("LENGTH_OF_STAY");
  const [rlTitle, setRlTitle] = useState("ส่วนลดพักต่อเนื่อง 2 คืนขึ้นไป");
  const [rlDiscountType, setRlDiscountType] =
    useState<DiscountTypeDto>("PERCENT");
  const [rlDiscountValue, setRlDiscountValue] = useState(10);
  const [rlMinNights, setRlMinNights] = useState(2);
  const [rlMinAdvanceDays, setRlMinAdvanceDays] = useState(14);
  const [rlMaxAdvanceDays, setRlMaxAdvanceDays] = useState(3);
  const [isSavingRule, setIsSavingRule] = useState(false);

  const openCreateRuleModal = (
    preset?: (typeof QUICK_DISCOUNT_PRESETS)[number]
  ) => {
    setEditingRuleId(null);
    setRlType(preset?.ruleType ?? "LENGTH_OF_STAY");
    setRlTitle(preset?.titleTh ?? "ส่วนลดพักต่อเนื่อง");
    setRlDiscountType("PERCENT");
    setRlDiscountValue(preset?.discountValue ?? 10);
    setRlMinNights(preset?.minNights ?? 2);
    setRlMinAdvanceDays(preset?.minAdvanceDays ?? 14);
    setRlMaxAdvanceDays(preset?.maxAdvanceDays ?? 3);
    setIsRuleModalOpen(true);
  };

  const openEditRuleModal = (rule: HotelDiscountRuleDto) => {
    setEditingRuleId(rule.id);
    setRlType(rule.ruleType);
    setRlTitle(rule.titleTh);
    setRlDiscountType(rule.discountType);
    setRlDiscountValue(rule.discountValue);
    setRlMinNights(rule.minNights ?? 2);
    setRlMinAdvanceDays(rule.minAdvanceDays ?? 14);
    setRlMaxAdvanceDays(rule.maxAdvanceDays ?? 3);
    setIsRuleModalOpen(true);
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rlTitle.trim()) return;
    setIsSavingRule(true);
    try {
      const res = await fetch("/api/studio/discount-rules", {
        method: editingRuleId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotelSlug: hotel.slug,
          ...(editingRuleId ? { id: editingRuleId } : {}),
          ruleType: rlType,
          titleTh: rlTitle.trim(),
          discountType: rlDiscountType,
          discountValue: Math.max(1, Number(rlDiscountValue) || 1),
          minNights: rlType === "LENGTH_OF_STAY" ? Number(rlMinNights) : null,
          minAdvanceDays:
            rlType === "EARLY_BIRD" ? Number(rlMinAdvanceDays) : null,
          maxAdvanceDays:
            rlType === "LAST_MINUTE" ? Number(rlMaxAdvanceDays) : null,
        }),
      });
      if (!res.ok) {
        onNotify("บันทึกกฎส่วนลดไม่สำเร็จ");
        return;
      }
      setIsRuleModalOpen(false);
      onNotify("บันทึกส่วนลดอัตโนมัติแล้ว");
      await onReload();
    } finally {
      setIsSavingRule(false);
    }
  };

  const handleToggleRule = async (rule: HotelDiscountRuleDto) => {
    const res = await fetch("/api/studio/discount-rules", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hotelSlug: hotel.slug,
        id: rule.id,
        isActive: !rule.isActive,
      }),
    });
    if (res.ok) {
      onNotify(!rule.isActive ? "เปิดใช้ส่วนลดอัตโนมัติแล้ว" : "ปิดใช้ชั่วคราวแล้ว");
      await onReload();
    }
  };

  const handleDeleteRule = async (id: string) => {
    const res = await fetch(
      `/api/studio/discount-rules?id=${encodeURIComponent(
        id
      )}&hotel=${encodeURIComponent(hotel.slug)}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      setIsRuleModalOpen(false);
      onNotify("ลบกฎส่วนลดแล้ว");
      await onReload();
    }
  };

  const describeRuleCondition = (r: HotelDiscountRuleDto) => {
    if (r.ruleType === "LENGTH_OF_STAY") {
      return `พักตั้งแต่ ${r.minNights ?? 2} คืนขึ้นไป`;
    }
    if (r.ruleType === "EARLY_BIRD") {
      return `จองล่วงหน้าอย่างน้อย ${r.minAdvanceDays ?? 14} วัน`;
    }
    return `จองก่อนเข้าพักไม่เกิน ${r.maxAdvanceDays ?? 3} วัน`;
  };

  const effectiveSubTab: GrowthSubTabId =
    mode === "promotions"
      ? "discounts"
      : mode === "content" && subTab === "discounts"
      ? "pins"
      : subTab;

  const visibleTabs =
    mode === "promotions"
      ? []
      : mode === "content"
      ? [
          {
            id: "pins" as const,
            label: "Pins & Facebook Sync",
            count: data.stats.pendingSyncPinsCount,
            icon: <ImagePlus className="w-4 h-4" />,
          },
          {
            id: "blog" as const,
            label: "บทความ SEO Blog",
            count: posts.length,
            icon: <BookOpen className="w-4 h-4" />,
          },
        ]
      : [
          {
            id: "discounts" as const,
            label: "คูปอง & ส่วนลดอัตโนมัติ",
            count: coupons.length + discountRules.length,
            icon: <Tag className="w-4 h-4" />,
          },
          {
            id: "pins" as const,
            label: "Pins & Facebook Sync",
            count: data.stats.pendingSyncPinsCount,
            icon: <ImagePlus className="w-4 h-4" />,
          },
          {
            id: "blog" as const,
            label: "บทความ SEO Blog",
            count: posts.length,
            icon: <BookOpen className="w-4 h-4" />,
          },
        ];

  return (
    <div className="space-y-8">
      {/* Clean Underline Sub-Tab Bar (hidden when single-focus promotions mode) */}
      {visibleTabs.length > 0 && (
        <div className="border-b border-[var(--color-border)] flex items-center gap-6 overflow-x-auto overflow-y-hidden touch-pan-x no-scrollbar">
          {visibleTabs.map((tab) => {
            const active = effectiveSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSubTab(tab.id)}
                className={`h-12 border-b-2 inline-flex items-center gap-2 text-[14.5px] whitespace-nowrap cursor-pointer transition-colors ${
                  active
                    ? "border-[var(--color-text-primary)] text-[var(--color-text-primary)] font-semibold"
                    : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] font-medium"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span className="text-[12px] text-[var(--color-text-secondary)] tabular-nums">
                    ({tab.count})
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* ===================================================================
          SUB-TAB 1: AUTOMATIC STAY DISCOUNTS + PROMO CODE COUPONS
      ==================================================================== */}
      {effectiveSubTab === "discounts" && (
        <div className="divide-y divide-[var(--color-border)]">
          {/* 1A. Automatic Discounts (Airbnb Pattern: Best Single Discount Applies) */}
          <section className="pb-8 lg:pb-10 space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="space-y-0.5">
                <h2 className="text-[20px] font-semibold text-[var(--color-text-primary)]">
                  ส่วนลดอัตโนมัติ (ไม่ต้องกรอกโค้ด)
                </h2>
                <p className="text-[13.5px] text-[var(--color-text-secondary)]">
                  ใช้กติกา Airbnb: หากลูกค้าเข้าเงื่อนไขหลายรายการหรือมีคูปอง ระบบจะเลือกใช้ส่วนลดที่คุ้มที่สุดเพียง 1 รายการ (ไม่ลดซ้อนกัน)
                </p>
              </div>
              <button
                type="button"
                onClick={() => openCreateRuleModal()}
                className="h-10 px-4 rounded-[12px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[13.5px] font-semibold text-[var(--color-text-primary)] inline-flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>เพิ่มกฎส่วนลด</span>
              </button>
            </div>

            {/* Active / Configured Rules */}
            {discountRules.length > 0 && (
              <div className="divide-y divide-[var(--color-border)]">
                {discountRules.map((rule) => (
                  <div
                    key={rule.id}
                    className="py-4 first:pt-0 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <span className="h-11 min-w-[60px] px-2.5 rounded-[12px] bg-[var(--color-background-muted)] text-[15px] font-semibold text-[var(--color-text-primary)] inline-flex items-center justify-center shrink-0 tabular-nums">
                        {rule.discountType === "PERCENT"
                          ? `${rule.discountValue}%`
                          : `฿${rule.discountValue.toLocaleString()}`}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[15.5px] font-semibold text-[var(--color-text-primary)] truncate">
                          {rule.titleTh}
                        </p>
                        <p className="text-[13px] text-[var(--color-text-secondary)]">
                          {describeRuleCondition(rule)} ·{" "}
                          {rule.isActive ? "กำลังใช้งาน" : "ปิดชั่วคราว"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEditRuleModal(rule)}
                        className="h-9 px-3 rounded-[10px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[13px] font-semibold text-[var(--color-text-primary)] cursor-pointer transition-colors"
                      >
                        แก้ไข
                      </button>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={rule.isActive}
                        onClick={() => handleToggleRule(rule)}
                        className={`h-7 w-12 rounded-[10px] p-1 transition-colors cursor-pointer shrink-0 ${
                          rule.isActive
                            ? "bg-[#222222] dark:bg-[#f5f5f5]"
                            : "bg-[var(--color-border-emphasized)]"
                        }`}
                      >
                        <span
                          className={`block h-5 w-5 rounded-full transition-transform ${
                            rule.isActive
                              ? "translate-x-5 bg-white dark:bg-[#222222]"
                              : "translate-x-0 bg-white"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Quick Presets */}
            <div className="space-y-2 pt-1">
              <span className="text-[12.5px] font-semibold text-[var(--color-text-secondary)] block">
                สูตรส่วนลดยอดนิยมสำหรับโรงแรมและพูลวิลล่า (แตะเพื่อตั้งค่า):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {QUICK_DISCOUNT_PRESETS.map((preset) => (
                  <button
                    key={preset.titleTh}
                    type="button"
                    onClick={() => openCreateRuleModal(preset)}
                    className="p-3.5 rounded-[14px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-left flex items-center gap-3.5 cursor-pointer transition-colors"
                  >
                    <span className="h-10 w-12 rounded-[10px] bg-[var(--color-background-card)] text-[14px] font-semibold text-[var(--color-text-primary)] inline-flex items-center justify-center shrink-0 tabular-nums">
                      {preset.discountValue}%
                    </span>
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold text-[var(--color-text-primary)] truncate">
                        {preset.titleTh}
                      </p>
                      <p className="text-[12.5px] text-[var(--color-text-secondary)] line-clamp-1">
                        {preset.descTh}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* 1B. Promo Code Coupons (Displayed on /{hotelSlug} & /deal Marketplace) */}
          <section className="py-8 lg:py-10 space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="space-y-0.5">
                <h2 className="text-[20px] font-semibold text-[var(--color-text-primary)]">
                  คูปองโค้ดส่วนลด ({coupons.length})
                </h2>
                <p className="text-[13.5px] text-[var(--color-text-secondary)]">
                  คูปองที่เปิดใช้งานจะแสดงบนหน้าร้านของคุณและศูนย์รวมดีล /deal ฟรี เพื่อดึงคนที่เซฟเข้า /board กลับมาจอง
                </p>
              </div>
              <button
                type="button"
                onClick={openCreateCouponModal}
                className="h-11 px-5 rounded-[12px] bg-[#222222] hover:bg-[#3f3f3f] dark:bg-[#f5f5f5] dark:hover:bg-[#e5e5e5] !text-white dark:!text-[#222222] text-[14px] font-semibold inline-flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>สร้างคูปองใหม่</span>
              </button>
            </div>

            {coupons.length === 0 ? (
              <div className="rounded-[16px] bg-[var(--color-background-muted)] py-10 px-6 text-center space-y-2">
                <Percent className="w-7 h-7 mx-auto text-[var(--color-text-secondary)]" />
                <p className="text-[15.5px] font-semibold text-[var(--color-text-primary)]">
                  ยังไม่มีคูปองส่วนลด
                </p>
                <p className="text-[13.5px] text-[var(--color-text-secondary)]">
                  สร้างคูปองแรกเพื่อให้ที่พักของคุณปรากฏบนหน้า /deal ทั่วประเทศฟรี
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--color-border)]">
                {coupons.map((c) => (
                  <div
                    key={c.id}
                    className="py-4 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[14px] font-semibold px-2.5 py-0.5 rounded-[8px] bg-[var(--color-background-muted)] text-[var(--color-text-primary)]">
                          {c.code}
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[var(--color-text-primary)]">
                          <span
                            aria-hidden="true"
                            className={`h-1.5 w-1.5 rounded-full ${
                              c.isActive
                                ? "bg-[var(--color-success)]"
                                : "bg-[var(--color-text-disabled)]"
                            }`}
                          />
                          <span>{c.isActive ? "เปิดใช้งาน" : "พักชั่วคราว"}</span>
                        </span>
                        {c.isFeaturedDeal && (
                          <span className="text-[12px] font-semibold text-[var(--color-text-secondary)]">
                            · Featured Deal
                          </span>
                        )}
                      </div>
                      <p className="text-[15.5px] font-semibold text-[var(--color-text-primary)]">
                        {c.titleTh}
                      </p>
                      <p className="text-[13px] text-[var(--color-text-secondary)] tabular-nums">
                        ลด{" "}
                        {c.discountType === "PERCENT"
                          ? `${c.discountValue}%`
                          : `฿${c.discountValue.toLocaleString()}`}{" "}
                        · ขั้นต่ำ ฿{c.minSpendThb.toLocaleString()} · เก็บแล้ว{" "}
                        {c.claimedCount} · ใช้แล้ว {c.usedCount} · หมดอายุ{" "}
                        {new Date(c.expiresAt).toLocaleDateString("th-TH")}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEditCouponModal(c)}
                        className="h-9 px-3 rounded-[10px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[13px] font-semibold text-[var(--color-text-primary)] inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>แก้ไข</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleCoupon(c.id, !c.isActive)}
                        className="h-9 px-3 rounded-[10px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[13px] font-semibold text-[var(--color-text-primary)] inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        {c.isActive ? (
                          <>
                            <PauseCircle className="w-3.5 h-3.5" />
                            <span>พักใช้</span>
                          </>
                        ) : (
                          <>
                            <PlayCircle className="w-3.5 h-3.5" />
                            <span>เปิดใช้</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCoupon(c.id)}
                        aria-label="ลบคูปอง"
                        className="h-9 w-9 rounded-[10px] hover:bg-[var(--color-background-muted)] text-[var(--color-text-secondary)] hover:text-[var(--color-error)] inline-flex items-center justify-center cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ===================================================================
          SUB-TAB 2: PINS & FACEBOOK AUTO-SYNC
      ==================================================================== */}
      {effectiveSubTab === "pins" && (
        <StudioPinsAndFacebookTab
          data={data}
          onReload={onReload}
          onNotify={onNotify}
        />
      )}

      {/* ===================================================================
          SUB-TAB 3: SEO BLOG POSTS
      ==================================================================== */}
      {effectiveSubTab === "blog" && (
        <StudioBlogPostsTab
          data={data}
          onReload={onReload}
          onNotify={onNotify}
        />
      )}

      {/* =====================================================================
          COUPON CREATE / EDIT MODAL + LIVE 3D TICKET PREVIEW
      ====================================================================== */}
      <StudioSheetModal
        isOpen={isCouponModalOpen}
        onClose={() => setIsCouponModalOpen(false)}
        title={editingCouponId ? `แก้ไขคูปอง ${cpCode}` : "สร้างคูปองส่วนลดใหม่"}
        subtitle="แสดงทั้งบนหน้าร้านของคุณและศูนย์รวมดีล /deal ฟรี 0% GP"
        maxWidthClass="md:max-w-[660px]"
        footer={
          <div className="flex items-center justify-between gap-2">
            {editingCouponId ? (
              <button
                type="button"
                onClick={() => handleDeleteCoupon(editingCouponId)}
                className="text-[13.5px] font-semibold text-[var(--color-error)] underline underline-offset-2 cursor-pointer"
              >
                ลบคูปองนี้
              </button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsCouponModalOpen(false)}
                className="h-11 px-4 rounded-[12px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[14px] font-semibold cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                form="studio-coupon-form"
                disabled={isSavingCoupon}
                className="h-11 px-6 rounded-[12px] bg-[#222222] hover:bg-[#3f3f3f] dark:bg-[#f5f5f5] dark:hover:bg-[#e5e5e5] !text-white dark:!text-[#222222] text-[14.5px] font-semibold cursor-pointer disabled:opacity-50"
              >
                {isSavingCoupon ? "กำลังบันทึก..." : "บันทึกคูปอง"}
              </button>
            </div>
          </div>
        }
      >
        <form
          id="studio-coupon-form"
          onSubmit={handleSaveCoupon}
          className="space-y-5"
        >
          {/* Live Signature 3D Flip Ticket Preview */}
          <div className="rounded-[16px] bg-[var(--color-background-muted)] p-4 space-y-2">
            <p className="text-[12px] font-semibold text-[var(--color-text-secondary)]">
              ตัวอย่างตั๋วคูปองที่นักเดินทางจะเห็นบนหน้า /deal และหน้าร้าน:
            </p>
            <div className="max-w-[380px] mx-auto pointer-events-none">
              <HotelCouponTicketCard
                deal={previewDeal}
                language="th"
                isClaimed={false}
                isClaiming={false}
                variant="compact"
                subtitleMode="campaign"
                notchBgClass="bg-[var(--color-background-muted)]"
                onClaim={async () => false}
                onRedeem={() => {}}
              />
            </div>
          </div>

          <StandardFieldGroup>
            <div className="grid grid-cols-1 sm:grid-cols-3 sm:divide-x divide-y sm:divide-y-0 divide-[#b0b0b0] dark:divide-[var(--color-border-emphasized)]">
              <StandardInput
                grouped
                label="รหัสโค้ด (EN/ตัวเลข) *"
                placeholder="เช่น DIRECT300"
                required
                disabled={Boolean(editingCouponId)}
                value={cpCode}
                onChange={(e) =>
                  setCpCode(
                    e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "")
                  )
                }
                className="font-mono uppercase font-semibold"
              />
              <div className="sm:col-span-2">
                <StandardInput
                  grouped
                  label="ชื่อโปรโมชั่น *"
                  placeholder="เช่น ลดทันที ฿300 เมื่อจองตรง 0% GP"
                  required
                  value={cpTitle}
                  onChange={(e) => setCpTitle(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 sm:divide-x divide-y sm:divide-y-0 divide-[#b0b0b0] dark:divide-[var(--color-border-emphasized)]">
              <StandardSelectField
                grouped
                label="ประเภทส่วนลด"
                value={cpType}
                onChange={(v) => setCpType(v as DiscountTypeDto)}
                sheetTitle="เลือกประเภทส่วนลด"
                options={[
                  { value: "FIXED_THB", label: "ลดเป็นบาท (฿)" },
                  { value: "PERCENT", label: "ลดเป็นเปอร์เซ็นต์ (%)" },
                ]}
              />
              <StandardInput
                grouped
                label={`มูลค่าส่วนลด (${cpType === "PERCENT" ? "%" : "฿"}) *`}
                type="number"
                min={1}
                required
                value={cpValue}
                onChange={(e) => setCpValue(Number(e.target.value))}
                className="font-semibold tabular-nums"
              />
              <StandardInput
                grouped
                label="ยอดจองขั้นต่ำ (฿)"
                type="number"
                min={0}
                value={cpMinSpend}
                onChange={(e) => setCpMinSpend(Number(e.target.value))}
                className="font-semibold tabular-nums"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x divide-y sm:divide-y-0 divide-[#b0b0b0] dark:divide-[var(--color-border-emphasized)]">
              <StandardInput
                grouped
                label="ลดสูงสุด (฿)"
                optionalText="สำหรับ %"
                type="number"
                min={1}
                placeholder="ไม่จำกัด"
                value={cpMaxDiscount}
                onChange={(e) => setCpMaxDiscount(e.target.value)}
              />
              <StandardInput
                grouped
                label="จำนวนสิทธิ์ทั้งหมด"
                optionalText="ไม่บังคับ"
                type="number"
                min={1}
                placeholder="ไม่จำกัด"
                value={cpTotalQuota}
                onChange={(e) => setCpTotalQuota(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x divide-y sm:divide-y-0 divide-[#b0b0b0] dark:divide-[var(--color-border-emphasized)]">
              <StandardInput
                grouped
                label="วันที่เริ่มใช้ได้"
                type="date"
                value={cpStartsAt}
                onChange={(e) => setCpStartsAt(e.target.value)}
              />
              <StandardInput
                grouped
                label="วันหมดอายุ"
                optionalText="เว้นว่าง = 90 วัน"
                type="date"
                value={cpExpiresAt}
                onChange={(e) => setCpExpiresAt(e.target.value)}
              />
            </div>
          </StandardFieldGroup>

          <StandardInput
            label="เงื่อนไขเพิ่มเติม"
            optionalText="ไม่บังคับ"
            placeholder="เช่น ใช้ได้ทุกวันรวมวันหยุดยาว"
            value={cpDesc}
            onChange={(e) => setCpDesc(e.target.value)}
          />
        </form>
      </StudioSheetModal>

      {/* =====================================================================
          AUTOMATIC DISCOUNT RULE CREATE / EDIT MODAL
      ====================================================================== */}
      <StudioSheetModal
        isOpen={isRuleModalOpen}
        onClose={() => setIsRuleModalOpen(false)}
        title={
          editingRuleId ? "แก้ไขกฎส่วนลดอัตโนมัติ" : "เพิ่มส่วนลดอัตโนมัติ"
        }
        subtitle="คำนวณลดราคาให้อัตโนมัติตอนลูกค้าเลือกวันเข้าพัก"
        footer={
          <div className="flex items-center justify-between gap-2">
            {editingRuleId ? (
              <button
                type="button"
                onClick={() => handleDeleteRule(editingRuleId)}
                className="text-[13.5px] font-semibold text-[var(--color-error)] underline underline-offset-2 cursor-pointer"
              >
                ลบกฎนี้
              </button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsRuleModalOpen(false)}
                className="h-11 px-4 rounded-[12px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[14px] font-semibold cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                form="studio-rule-form"
                disabled={isSavingRule}
                className="h-11 px-6 rounded-[12px] bg-[#222222] hover:bg-[#3f3f3f] dark:bg-[#f5f5f5] dark:hover:bg-[#e5e5e5] !text-white dark:!text-[#222222] text-[14.5px] font-semibold cursor-pointer disabled:opacity-50"
              >
                {isSavingRule ? "กำลังบันทึก..." : "บันทึกกฎส่วนลด"}
              </button>
            </div>
          </div>
        }
      >
        <form
          id="studio-rule-form"
          onSubmit={handleSaveRule}
          className="space-y-4"
        >
          <StandardFieldGroup>
            <StandardSelectField
              grouped
              label="ประเภทเงื่อนไข"
              value={rlType}
              onChange={(v) => setRlType(v as DiscountRuleTypeDto)}
              sheetTitle="เลือกประเภทส่วนลดอัตโนมัติ"
              options={[
                {
                  value: "LENGTH_OF_STAY",
                  label: "พักต่อเนื่องหลายคืน (Length of Stay)",
                },
                {
                  value: "EARLY_BIRD",
                  label: "จองล่วงหน้า (Early Bird)",
                },
                {
                  value: "LAST_MINUTE",
                  label: "ดีลนาทีสุดท้าย (Last-Minute)",
                },
              ]}
            />
            <StandardInput
              grouped
              label="ชื่อส่วนลดที่แสดงให้ลูกค้า *"
              required
              value={rlTitle}
              onChange={(e) => setRlTitle(e.target.value)}
            />
            <div className="grid grid-cols-2 divide-x divide-[#b0b0b0] dark:divide-[var(--color-border-emphasized)]">
              <StandardSelectField
                grouped
                label="รูปแบบส่วนลด"
                value={rlDiscountType}
                onChange={(v) => setRlDiscountType(v as DiscountTypeDto)}
                sheetTitle="เลือกรูปแบบส่วนลด"
                options={[
                  { value: "PERCENT", label: "ลดเป็นเปอร์เซ็นต์ (%)" },
                  { value: "FIXED_THB", label: "ลดเป็นบาท (฿)" },
                ]}
              />
              <StandardInput
                grouped
                label={`มูลค่าส่วนลด (${rlDiscountType === "PERCENT" ? "%" : "฿"}) *`}
                type="number"
                min={1}
                max={rlDiscountType === "PERCENT" ? 80 : 90000}
                required
                value={rlDiscountValue}
                onChange={(e) => setRlDiscountValue(Number(e.target.value))}
                className="font-semibold tabular-nums"
              />
            </div>
          </StandardFieldGroup>

          {rlType === "LENGTH_OF_STAY" && (
            <StandardStepperRow
              label="จำนวนคืนขั้นต่ำ (คืน)"
              value={rlMinNights}
              min={2}
              max={90}
              onChange={setRlMinNights}
            />
          )}

          {rlType === "EARLY_BIRD" && (
            <StandardStepperRow
              label="ต้องจองล่วงหน้าอย่างน้อย (วัน)"
              value={rlMinAdvanceDays}
              min={1}
              max={365}
              onChange={setRlMinAdvanceDays}
            />
          )}

          {rlType === "LAST_MINUTE" && (
            <StandardStepperRow
              label="สำหรับการจองก่อนวันเข้าพักไม่เกิน (วัน)"
              value={rlMaxAdvanceDays}
              min={0}
              max={60}
              onChange={setRlMaxAdvanceDays}
            />
          )}
        </form>
      </StudioSheetModal>
    </div>
  );
}
