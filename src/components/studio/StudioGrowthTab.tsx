"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CalendarRange,
  Clock,
  ImagePlus,
  Moon,
  Percent,
  Plus,
  Tag,
  TicketPercent,
} from "lucide-react";
import { addDaysToDate, formatDateStr } from "@/lib/bookingMath";
import { formatShortDate } from "@/lib/dateFormatters";
import { HotelCouponTicketCard } from "@/components/deals/HotelCouponTicketCard";
import {
  StandardFieldGroup,
  StandardInput,
  StandardSelectField,
  StandardStepperRow,
} from "@/components/ui/standards";
import { StudioDateRangePicker } from "@/components/ui/StudioDateRangePicker";
import { SortableList } from "@/components/ui/SortableList";
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

interface AutoDiscountRowItem extends HotelDiscountRuleDto {
  isTemplate?: boolean;
  templateKey?: string;
}

const BUILTIN_DISCOUNT_TEMPLATES: Array<{
  templateKey: string;
  ruleType: DiscountRuleTypeDto;
  titleTh: string;
  discountValue: number;
  minNights?: number;
  minAdvanceDays?: number;
  maxAdvanceDays?: number;
}> = [
  {
    templateKey: "stay-2-nights",
    ruleType: "LENGTH_OF_STAY",
    titleTh: "ส่วนลดพักต่อเนื่อง 2 คืนขึ้นไป",
    discountValue: 10,
    minNights: 2,
  },
  {
    templateKey: "weekly-7-nights",
    ruleType: "LENGTH_OF_STAY",
    titleTh: "ส่วนลดพักยาวรายสัปดาห์ (7+ คืน)",
    discountValue: 20,
    minNights: 7,
  },
  {
    templateKey: "early-bird-14d",
    ruleType: "EARLY_BIRD",
    titleTh: "จองล่วงหน้า Early Bird (14+ วัน)",
    discountValue: 10,
    minAdvanceDays: 14,
  },
  {
    templateKey: "last-minute-3d",
    ruleType: "LAST_MINUTE",
    titleTh: "ดีลนาทีสุดท้าย Last-Minute (≤ 3 วัน)",
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
  const todayStr = useMemo(() => formatDateStr(new Date()), []);
  const [subTab, setSubTab] = useState<GrowthSubTabId>(() =>
    mode === "content" ? "pins" : "discounts"
  );

  // =========================================================================
  // OPTIMISTIC ORDER & TOGGLE STATE (1:1 with Rooms & Seasonal Pricing)
  // =========================================================================
  const [orderedCouponIds, setOrderedCouponIds] = useState<string[] | null>(
    null
  );
  const [optimisticCouponActive, setOptimisticCouponActive] = useState<
    Record<string, boolean>
  >({});
  const [togglingCouponId, setTogglingCouponId] = useState<string | null>(null);
  const [deletingCouponId, setDeletingCouponId] = useState<string | null>(null);

  const [orderedRuleIds, setOrderedRuleIds] = useState<string[] | null>(null);
  const [optimisticRuleActive, setOptimisticRuleActive] = useState<
    Record<string, boolean>
  >({});
  const [togglingRuleId, setTogglingRuleId] = useState<string | null>(null);
  const [deletingRuleId, setDeletingRuleId] = useState<string | null>(null);

  useEffect(() => {
    setOrderedCouponIds(null);
    setOptimisticCouponActive({});
  }, [coupons]);

  useEffect(() => {
    setOrderedRuleIds(null);
    setOptimisticRuleActive({});
  }, [discountRules]);

  const orderedCoupons = useMemo<StudioCouponRecord[]>(() => {
    const hydrated = coupons.map((c) => ({
      ...c,
      isActive: optimisticCouponActive[c.id] ?? c.isActive,
    }));
    if (!orderedCouponIds) return hydrated;
    const byId = new Map(hydrated.map((c) => [c.id, c]));
    const next: StudioCouponRecord[] = [];
    for (const id of orderedCouponIds) {
      const found = byId.get(id);
      if (found) next.push(found);
    }
    for (const c of hydrated) {
      if (!orderedCouponIds.includes(c.id)) next.push(c);
    }
    return next;
  }, [coupons, optimisticCouponActive, orderedCouponIds]);

  const orderedRules = useMemo<AutoDiscountRowItem[]>(() => {
    const savedRows: AutoDiscountRowItem[] = discountRules.map((r) => {
      const matchedTpl = BUILTIN_DISCOUNT_TEMPLATES.find(
        (tpl) => tpl.titleTh.trim() === r.titleTh.trim()
      );
      return {
        ...r,
        isActive: optimisticRuleActive[r.id] ?? r.isActive,
        isTemplate: Boolean(matchedTpl),
        templateKey: matchedTpl?.templateKey,
      };
    });

    const savedTitles = new Set(savedRows.map((r) => r.titleTh.trim()));
    const merged: AutoDiscountRowItem[] = [...savedRows];

    for (const tpl of BUILTIN_DISCOUNT_TEMPLATES) {
      if (savedTitles.has(tpl.titleTh.trim())) continue;
      const tplId = `tpl-${tpl.templateKey}`;
      merged.push({
        id: tplId,
        hotelId: hotel.id,
        ruleType: tpl.ruleType,
        titleTh: tpl.titleTh,
        discountType: "PERCENT",
        discountValue: tpl.discountValue,
        minNights: tpl.minNights ?? null,
        minAdvanceDays: tpl.minAdvanceDays ?? null,
        maxAdvanceDays: tpl.maxAdvanceDays ?? null,
        isActive: optimisticRuleActive[tplId] ?? false,
        isTemplate: true,
        templateKey: tpl.templateKey,
      });
    }

    if (!orderedRuleIds) return merged;
    const byId = new Map(merged.map((r) => [r.id, r]));
    const next: AutoDiscountRowItem[] = [];
    for (const id of orderedRuleIds) {
      const found = byId.get(id);
      if (found) next.push(found);
    }
    for (const r of merged) {
      if (!orderedRuleIds.includes(r.id)) next.push(r);
    }
    return next;
  }, [discountRules, hotel.id, optimisticRuleActive, orderedRuleIds]);

  const activeAutoDiscountsCount = useMemo(
    () => orderedRules.filter((r) => r.isActive).length,
    [orderedRules]
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
  const [cpStartsAt, setCpStartsAt] = useState(todayStr);
  const [cpExpiresAt, setCpExpiresAt] = useState(() =>
    addDaysToDate(todayStr, 90)
  );
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
    setCpStartsAt(todayStr);
    setCpExpiresAt(addDaysToDate(todayStr, 90));
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
    setCpStartsAt(c.startsAt ? c.startsAt.slice(0, 10) : todayStr);
    setCpExpiresAt(
      c.expiresAt ? c.expiresAt.slice(0, 10) : addDaysToDate(todayStr, 90)
    );
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
      descriptionTh: cpDesc || "ใช้ได้เฉพาะการจองตรงผ่าน Nondii",
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

  const handleToggleCoupon = async (coupon: StudioCouponRecord) => {
    const nextActive = !coupon.isActive;
    setOptimisticCouponActive((prev) => ({ ...prev, [coupon.id]: nextActive }));
    setTogglingCouponId(coupon.id);
    try {
      const res = await fetch("/api/studio/coupons", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotelSlug: hotel.slug,
          id: coupon.id,
          isActive: nextActive,
        }),
      });
      if (!res.ok) {
        setOptimisticCouponActive((prev) => ({
          ...prev,
          [coupon.id]: coupon.isActive,
        }));
        onNotify("เปลี่ยนสถานะคูปองไม่สำเร็จ");
        return;
      }
      onNotify(
        nextActive
          ? `เปิดใช้งานคูปอง ${coupon.code} แล้ว`
          : `ปิดใช้งานคูปอง ${coupon.code} ชั่วคราวแล้ว`
      );
      await onReload();
    } catch {
      setOptimisticCouponActive((prev) => ({
        ...prev,
        [coupon.id]: coupon.isActive,
      }));
      onNotify("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setTogglingCouponId(null);
    }
  };

  const handleReorderCoupons = async (nextCoupons: StudioCouponRecord[]) => {
    const nextIds = nextCoupons.map((c) => c.id);
    setOrderedCouponIds(nextIds);
    try {
      const res = await fetch("/api/studio/coupons", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reorder",
          hotelSlug: hotel.slug,
          orderedIds: nextIds,
        }),
      });
      if (!res.ok) {
        setOrderedCouponIds(null);
        onNotify("บันทึกลำดับคูปองไม่สำเร็จ");
        return;
      }
      onNotify("จัดลำดับคูปองเรียบร้อย");
      await onReload();
    } catch {
      setOrderedCouponIds(null);
      onNotify("ไม่สามารถเชื่อมต่อเพื่อบันทึกลำดับคูปองได้");
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    setDeletingCouponId(id);
    try {
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
    } finally {
      setDeletingCouponId(null);
    }
  };

  // =========================================================================
  // 2. AUTOMATIC STAY DISCOUNTS (HotelDiscountRule CRUD + DnD Sort)
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

  const openCreateRuleModal = () => {
    setEditingRuleId(null);
    setRlType("LENGTH_OF_STAY");
    setRlTitle("ส่วนลดพักต่อเนื่อง");
    setRlDiscountType("PERCENT");
    setRlDiscountValue(10);
    setRlMinNights(2);
    setRlMinAdvanceDays(14);
    setRlMaxAdvanceDays(3);
    setIsRuleModalOpen(true);
  };

  const openEditRuleModal = (rule: AutoDiscountRowItem) => {
    // Unsaved built-in template opens prefilled so saving creates it in DB
    setEditingRuleId(rule.id.startsWith("tpl-") ? null : rule.id);
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

  const handleToggleRule = async (rule: AutoDiscountRowItem) => {
    const nextActive = !rule.isActive;
    const isUnsavedTemplate = rule.id.startsWith("tpl-");
    setOptimisticRuleActive((prev) => ({ ...prev, [rule.id]: nextActive }));
    setTogglingRuleId(rule.id);
    try {
      const res = isUnsavedTemplate
        ? await fetch("/api/studio/discount-rules", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              hotelSlug: hotel.slug,
              ruleType: rule.ruleType,
              titleTh: rule.titleTh,
              discountType: rule.discountType,
              discountValue: rule.discountValue,
              minNights: rule.minNights,
              minAdvanceDays: rule.minAdvanceDays,
              maxAdvanceDays: rule.maxAdvanceDays,
              isActive: nextActive,
            }),
          })
        : await fetch("/api/studio/discount-rules", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              hotelSlug: hotel.slug,
              id: rule.id,
              isActive: nextActive,
            }),
          });
      if (!res.ok) {
        setOptimisticRuleActive((prev) => ({
          ...prev,
          [rule.id]: rule.isActive,
        }));
        onNotify("เปลี่ยนสถานะส่วนลดไม่สำเร็จ");
        return;
      }
      onNotify(
        nextActive
          ? `เปิดใช้งาน "${rule.titleTh}" แล้ว`
          : `ปิดใช้งาน "${rule.titleTh}" ชั่วคราวแล้ว`
      );
      await onReload();
    } catch {
      setOptimisticRuleActive((prev) => ({
        ...prev,
        [rule.id]: rule.isActive,
      }));
      onNotify("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setTogglingRuleId(null);
    }
  };

  const handleReorderRules = async (nextRules: AutoDiscountRowItem[]) => {
    const nextIds = nextRules.map((r) => r.id);
    setOrderedRuleIds(nextIds);
    const persistedIds = nextIds.filter((id) => !id.startsWith("tpl-"));
    if (persistedIds.length < 2) {
      return;
    }
    try {
      const res = await fetch("/api/studio/discount-rules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reorder",
          hotelSlug: hotel.slug,
          orderedIds: persistedIds,
        }),
      });
      if (!res.ok) {
        setOrderedRuleIds(null);
        onNotify("บันทึกลำดับส่วนลดไม่สำเร็จ");
        return;
      }
      onNotify("จัดลำดับส่วนลดอัตโนมัติเรียบร้อย");
      await onReload();
    } catch {
      setOrderedRuleIds(null);
      onNotify("ไม่สามารถเชื่อมต่อเพื่อบันทึกลำดับส่วนลดได้");
    }
  };

  const handleDeleteRule = async (id: string) => {
    setDeletingRuleId(id);
    try {
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
    } finally {
      setDeletingRuleId(null);
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

  const hotelThumb = hotel.coverImageUrl || hotel.logoUrl || "";

  return (
    <div className="space-y-4">
      {/* Unified Clean Header for Promotions Mode (1:1 Match with Rooms & Seasonal Pricing) */}
      {mode === "promotions" && (
        <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-[var(--color-border)]">
          <h2 className="text-[24px] sm:text-[26px] font-semibold tracking-[-0.02em] text-[var(--color-text-primary)]">
            โปรโมชั่น & ส่วนลด
          </h2>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => openCreateRuleModal()}
              className="h-10 sm:h-11 px-3.5 sm:px-4 rounded-[12px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[14px] font-medium inline-flex items-center gap-2 cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่มส่วนลดอัตโนมัติ</span>
            </button>

            <button
              type="button"
              onClick={openCreateCouponModal}
              className="h-10 sm:h-11 px-4 sm:px-5 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] text-[14px] sm:text-[14px] font-semibold inline-flex items-center gap-2 cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>สร้างคูปองใหม่</span>
            </button>
          </div>
        </div>
      )}

      {/* Clean Underline Sub-Tab Bar (hidden in single-focus promotions mode) */}
      {visibleTabs.length > 0 && (
        <div className="border-b border-[var(--color-border)] flex items-center gap-6 overflow-x-auto overflow-y-hidden touch-pan-x no-scrollbar">
          {visibleTabs.map((tab) => {
            const active = effectiveSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSubTab(tab.id)}
                className={`h-12 border-b-2 inline-flex items-center gap-2 text-[14px] whitespace-nowrap cursor-pointer transition-colors ${
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
          SUB-TAB 1: COUPON TICKET LIST + AUTOMATIC STAY DISCOUNTS
      ==================================================================== */}
      {effectiveSubTab === "discounts" && (
        <div className="divide-y divide-[var(--color-border)]">
          {/* 1A. Promo Code Coupons — Signature Ticket Card Visual + Toggle + Drag-to-Sort */}
          <section className="py-6 first:pt-2 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-baseline gap-2">
                <h3 className="text-[15px] font-semibold text-[var(--color-text-primary)]">
                  คูปองโค้ดส่วนลด
                </h3>
                <span className="text-[14px] text-[var(--color-text-secondary)] tabular-nums">
                  ({orderedCoupons.length})
                </span>
              </div>
              {mode !== "promotions" && (
                <button
                  type="button"
                  onClick={openCreateCouponModal}
                  className="h-10 px-4 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] text-[14px] font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>สร้างคูปองใหม่</span>
                </button>
              )}
            </div>

            {orderedCoupons.length === 0 ? (
              <div className="rounded-[16px] bg-[var(--color-background-muted)] py-9 px-6 text-center space-y-3">
                {/* Clean Signature Ticket Silhouette */}
                <div className="relative mx-auto w-[148px] h-[64px] rounded-[12px] bg-[var(--color-background-card)] border border-dashed border-[var(--color-border-emphasized)] flex items-center overflow-hidden">
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -left-[1px] top-1/2 -translate-y-1/2 w-[8px] h-[16px] rounded-r-full bg-[var(--color-background-muted)] border-y border-r border-dashed border-[var(--color-border-emphasized)]"
                  />
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-[1px] top-1/2 -translate-y-1/2 w-[8px] h-[16px] rounded-l-full bg-[var(--color-background-muted)] border-y border-l border-dashed border-[var(--color-border-emphasized)]"
                  />
                  <div className="w-[44px] h-full flex items-center justify-center border-r border-dashed border-[var(--color-border-emphasized)]">
                    <Percent className="w-4 h-4 text-[var(--color-text-secondary)]" />
                  </div>
                  <div className="flex-1 text-center px-2">
                    <p className="text-[12px] font-semibold text-[var(--color-text-primary)]">
                      ลด ฿300
                    </p>
                    <p className="font-mono text-[12px] text-[var(--color-text-tertiary)]">
                      DIRECT300
                    </p>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-[15px] font-semibold text-[var(--color-text-primary)]">
                    ยังไม่มีคูปองส่วนลด
                  </p>
                  <p className="text-[14px] text-[var(--color-text-secondary)]">
                    คูปองที่เปิดใช้งานจะแสดงบนหน้าร้านของคุณและหน้า /deal ฟรี
                  </p>
                </div>

                <button
                  type="button"
                  onClick={openCreateCouponModal}
                  className="h-10 px-4 rounded-[12px] bg-[var(--color-background-card)] hover:bg-[var(--color-background-subtle)] text-[14px] font-semibold text-[var(--color-text-primary)] inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>สร้างคูปองแรก</span>
                </button>
              </div>
            ) : (
              <SortableList
                items={orderedCoupons}
                getId={(c) => c.id}
                onReorder={(nextCoupons) => void handleReorderCoupons(nextCoupons)}
                renderItem={(c, { handle, isOverlay }) => {
                  const isToggling = togglingCouponId === c.id;
                  const discountText =
                    c.discountType === "PERCENT"
                      ? `ลด ${c.discountValue}%`
                      : `ลด ฿${c.discountValue.toLocaleString()}`;
                  const expiresDateStr = c.expiresAt
                    ? c.expiresAt.slice(0, 10)
                    : "";

                  return (
                    <article
                      role="button"
                      tabIndex={isOverlay ? -1 : 0}
                      onClick={() => {
                        if (!isOverlay) openEditCouponModal(c);
                      }}
                      onKeyDown={(e) => {
                        if (!isOverlay && (e.key === "Enter" || e.key === " ")) {
                          e.preventDefault();
                          openEditCouponModal(c);
                        }
                      }}
                      className={`group py-4 sm:py-5 rounded-[16px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#222222] dark:focus-visible:ring-[#f5f5f5] ${
                        isOverlay
                          ? "px-3 cursor-grabbing"
                          : "first:pt-2 last:pb-2 -mx-3 px-3 hover:bg-[var(--color-background-muted)]/50 cursor-pointer"
                      } ${!c.isActive ? "opacity-65" : ""}`}
                    >
                      <div className="flex items-center gap-2.5 sm:gap-4">
                        {/* Drag Handle */}
                        {handle}

                        {/* Signature Miniature Coupon Ticket (Matches /deal HotelCouponTicketCard!) */}
                        <div className="relative shrink-0 w-[132px] sm:w-[162px] h-[72px] sm:h-[78px] rounded-[12px] bg-[var(--color-background-card)] border border-[var(--color-border-emphasized)] flex items-center select-none">
                          {/* Semicircular Ticket Cutouts */}
                          <span
                            aria-hidden="true"
                            className={`pointer-events-none absolute -left-[1px] top-1/2 -translate-y-1/2 w-[7px] h-[14px] rounded-r-full border-y border-r border-[var(--color-border-emphasized)] z-10 transition-colors ${
                              isOverlay
                                ? "bg-[var(--color-background-card)]"
                                : "bg-[var(--color-background-body)] group-hover:bg-[var(--color-background-muted)]"
                            }`}
                          />
                          <span
                            aria-hidden="true"
                            className={`pointer-events-none absolute -right-[1px] top-1/2 -translate-y-1/2 w-[7px] h-[14px] rounded-l-full border-y border-l border-[var(--color-border-emphasized)] z-10 transition-colors ${
                              isOverlay
                                ? "bg-[var(--color-background-card)]"
                                : "bg-[var(--color-background-body)] group-hover:bg-[var(--color-background-muted)]"
                            }`}
                          />

                          {/* Left Property Photo Strip */}
                          <div className="w-[38px] sm:w-[46px] h-full shrink-0 overflow-hidden rounded-l-[11px] bg-[var(--color-background-muted)]">
                            {hotelThumb ? (
                              <img
                                src={hotelThumb}
                                alt={hotel.nameTh}
                                className={`h-full w-full object-cover ${
                                  !c.isActive ? "grayscale opacity-60" : ""
                                }`}
                              />
                            ) : (
                              <span className="h-full w-full flex items-center justify-center text-[13px] font-semibold text-[var(--color-text-primary)]">
                                {hotel.nameTh[0] || "N"}
                              </span>
                            )}
                          </div>

                          {/* Vertical Dashed Perforation */}
                          <div
                            aria-hidden="true"
                            className="h-full border-l border-dashed border-[var(--color-border-emphasized)] shrink-0"
                          />

                          {/* Ticket Value + Monospace Code */}
                          <div className="flex-1 min-w-0 px-2.5 py-1.5 flex flex-col justify-center">
                            <p className="text-[14px] sm:text-[15px] font-extrabold tracking-tight text-[var(--color-text-primary)] leading-tight truncate tabular-nums">
                              {discountText}
                            </p>
                            <span className="mt-1 inline-block font-mono text-[12px] sm:text-[12px] font-semibold text-[var(--color-text-secondary)] truncate">
                              {c.code}
                            </span>
                          </div>
                        </div>

                        {/* Center: Title + Minimal Icon Metadata Row */}
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-baseline gap-2 min-w-0">
                            <h4 className="text-[15px] sm:text-[15px] font-semibold text-[var(--color-text-primary)] leading-snug truncate">
                              {c.titleTh}
                            </h4>
                            {c.isFeaturedDeal && (
                              <span className="hidden sm:inline text-[12px] text-[var(--color-text-tertiary)] shrink-0">
                                Featured
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[13px] text-[var(--color-text-secondary)] tabular-nums">
                            <span>
                              {c.minSpendThb > 0
                                ? `ขั้นต่ำ ฿${c.minSpendThb.toLocaleString()}`
                                : "ไม่มีขั้นต่ำ"}
                            </span>

                            <span className="inline-flex items-center gap-1">
                              <TicketPercent className="w-3.5 h-3.5 text-[var(--color-text-tertiary)] stroke-[1.75]" />
                              <span>
                                เก็บ {c.claimedCount}
                                {c.totalQuota ? `/${c.totalQuota}` : ""} · ใช้{" "}
                                {c.usedCount}
                              </span>
                            </span>

                            {expiresDateStr && (
                              <span className="inline-flex items-center gap-1">
                                <CalendarRange className="w-3.5 h-3.5 text-[var(--color-text-tertiary)] stroke-[1.75]" />
                                <span>
                                  หมดอายุ {formatShortDate(expiresDateStr, "th")}
                                </span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Right: 1-Click Toggle Switch (Delete safely lives inside Edit Modal) */}
                        <div
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                          className="flex items-center gap-2.5 shrink-0"
                        >
                          <span
                            className={`hidden sm:inline text-[13px] font-medium ${
                              c.isActive
                                ? "text-[var(--color-text-primary)]"
                                : "text-[var(--color-text-tertiary)]"
                            }`}
                          >
                            {c.isActive ? "เปิดใช้" : "ปิดไว้"}
                          </span>

                          <button
                            type="button"
                            role="switch"
                            aria-checked={c.isActive}
                            aria-label={
                              c.isActive
                                ? `ปิดใช้งานคูปอง ${c.code}`
                                : `เปิดใช้งานคูปอง ${c.code}`
                            }
                            disabled={isToggling}
                            onClick={() => void handleToggleCoupon(c)}
                            className={`h-7 w-12 rounded-full p-1 transition-colors cursor-pointer shrink-0 disabled:opacity-50 ${
                              c.isActive
                                ? "bg-[var(--color-accent)]"
                                : "bg-[var(--color-border-emphasized)]"
                            }`}
                          >
                            <span
                              className={`block h-5 w-5 rounded-full transition-transform ${
                                c.isActive
                                  ? "translate-x-5 bg-white"
                                  : "translate-x-0 bg-white"
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                }}
              />
            )}
          </section>

          {/* 1B. Automatic Discounts — Built-in 1-Click Templates + Sortable + Toggle (1:1 with Seasonal Pricing!) */}
          <section className="py-7 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-baseline gap-2">
                <h3 className="text-[15px] font-semibold text-[var(--color-text-primary)]">
                  ส่วนลดอัตโนมัติ (ไม่ต้องกรอกโค้ด)
                </h3>
                <span className="text-[14px] text-[var(--color-text-secondary)] tabular-nums">
                  (เปิดใช้ {activeAutoDiscountsCount})
                </span>
              </div>
              {mode !== "promotions" && (
                <button
                  type="button"
                  onClick={() => openCreateRuleModal()}
                  className="h-10 px-4 rounded-[12px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[14px] font-semibold text-[var(--color-text-primary)] inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>เพิ่มกฎส่วนลด</span>
                </button>
              )}
            </div>

            <SortableList
              items={orderedRules}
              getId={(rule) => rule.id}
              onReorder={(nextRules) => void handleReorderRules(nextRules)}
              renderItem={(rule, { handle, isOverlay }) => {
                const isToggling = togglingRuleId === rule.id;

                return (
                  <article
                    role="button"
                    tabIndex={isOverlay ? -1 : 0}
                    onClick={() => {
                      if (!isOverlay) openEditRuleModal(rule);
                    }}
                    onKeyDown={(e) => {
                      if (!isOverlay && (e.key === "Enter" || e.key === " ")) {
                        e.preventDefault();
                        openEditRuleModal(rule);
                      }
                    }}
                    className={`group py-4 sm:py-5 rounded-[16px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#222222] dark:focus-visible:ring-[#f5f5f5] ${
                      isOverlay
                        ? "px-3 cursor-grabbing"
                        : "first:pt-2 last:pb-2 -mx-3 px-3 hover:bg-[var(--color-background-muted)]/50 cursor-pointer"
                    } ${!rule.isActive ? "opacity-70" : ""}`}
                  >
                    <div className="flex items-center gap-2.5 sm:gap-4">
                      {/* Drag Handle */}
                      {handle}

                      {/* Discount Value Badge */}
                      <span
                        className={`h-9 min-w-[56px] px-2.5 rounded-full text-[14px] font-semibold inline-flex items-center justify-center shrink-0 tabular-nums transition-colors ${
                          rule.isActive
                            ? "bg-[var(--color-accent)] !text-[var(--color-on-accent)]"
                            : "bg-[var(--color-background-muted)] text-[var(--color-text-secondary)]"
                        }`}
                      >
                        {rule.discountType === "PERCENT"
                          ? `${rule.discountValue}%`
                          : `฿${rule.discountValue.toLocaleString()}`}
                      </span>

                      {/* Center: Title + Template Tag + Condition Metadata */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-baseline gap-2 min-w-0">
                          <h4 className="text-[15px] sm:text-[15px] font-semibold text-[var(--color-text-primary)] leading-snug truncate">
                            {rule.titleTh}
                          </h4>
                          {rule.isTemplate && (
                            <span className="hidden sm:inline text-[12px] text-[var(--color-text-tertiary)] shrink-0">
                              เทมเพลต
                            </span>
                          )}
                        </div>
                        <p className="text-[13px] text-[var(--color-text-secondary)] inline-flex items-center gap-1.5">
                          {rule.ruleType === "LENGTH_OF_STAY" ? (
                            <Moon className="w-3.5 h-3.5 text-[var(--color-text-tertiary)] stroke-[1.75]" />
                          ) : (
                            <Clock className="w-3.5 h-3.5 text-[var(--color-text-tertiary)] stroke-[1.75]" />
                          )}
                          <span>{describeRuleCondition(rule)}</span>
                        </p>
                      </div>

                      {/* Right: 1-Click Toggle Switch (Delete safely lives inside Edit Modal) */}
                      <div
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                        className="flex items-center gap-2.5 shrink-0"
                      >
                        <span
                          className={`hidden sm:inline text-[13px] font-medium ${
                            rule.isActive
                              ? "text-[var(--color-text-primary)]"
                              : "text-[var(--color-text-tertiary)]"
                          }`}
                        >
                          {rule.isActive ? "เปิดใช้" : "ปิดไว้"}
                        </span>

                        <button
                          type="button"
                          role="switch"
                          aria-checked={rule.isActive}
                          aria-label={
                            rule.isActive
                              ? `ปิดใช้งาน ${rule.titleTh}`
                              : `เปิดใช้งาน ${rule.titleTh}`
                          }
                          disabled={isToggling}
                          onClick={() => void handleToggleRule(rule)}
                          className={`h-7 w-12 rounded-full p-1 transition-colors cursor-pointer shrink-0 disabled:opacity-50 ${
                            rule.isActive
                              ? "bg-[var(--color-accent)]"
                              : "bg-[var(--color-border-emphasized)]"
                          }`}
                        >
                          <span
                            className={`block h-5 w-5 rounded-full transition-transform ${
                              rule.isActive
                                ? "translate-x-5 bg-white"
                                : "translate-x-0 bg-white"
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              }}
            />
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
                disabled={deletingCouponId === editingCouponId}
                onClick={() => void handleDeleteCoupon(editingCouponId)}
                className="text-[14px] font-semibold text-[var(--color-error)] underline underline-offset-2 cursor-pointer disabled:opacity-40"
              >
                {deletingCouponId === editingCouponId
                  ? "กำลังลบ..."
                  : "ลบคูปองนี้"}
              </button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsCouponModalOpen(false)}
                className="h-11 px-5 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[14px] font-semibold cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                form="studio-coupon-form"
                disabled={isSavingCoupon}
                className="h-11 px-6 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] text-[14px] font-semibold cursor-pointer disabled:opacity-50"
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

            <StudioDateRangePicker
              grouped
              startLabel="วันที่เริ่มใช้ได้"
              endLabel="วันหมดอายุ"
              startDate={cpStartsAt || todayStr}
              endDate={cpExpiresAt || addDaysToDate(todayStr, 90)}
              onChange={(nextStart, nextEnd) => {
                setCpStartsAt(nextStart);
                setCpExpiresAt(nextEnd);
              }}
            />
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
                disabled={deletingRuleId === editingRuleId}
                onClick={() => void handleDeleteRule(editingRuleId)}
                className="text-[14px] font-semibold text-[var(--color-error)] underline underline-offset-2 cursor-pointer disabled:opacity-40"
              >
                {deletingRuleId === editingRuleId ? "กำลังลบ..." : "ลบกฎนี้"}
              </button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsRuleModalOpen(false)}
                className="h-11 px-5 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[14px] font-semibold cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                form="studio-rule-form"
                disabled={isSavingRule}
                className="h-11 px-6 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] text-[14px] font-semibold cursor-pointer disabled:opacity-50"
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
