"use client";

import React, { useMemo, useState } from "react";
import {
  Check,
  ChevronRight,
  Eye,
  EyeOff,
  Heart,
  Loader2,
  Plus,
  Save,
  Sparkles,
  Tag,
  TicketPercent,
  Trash2,
} from "lucide-react";
import {
  AdminDataTable,
  type AdminColumn,
} from "@/components/admin/ui/AdminDataTable";
import { AdminFilterDropdown } from "@/components/admin/ui/AdminFilterDropdown";
import { AdminSlideSheet } from "@/components/admin/ui/AdminSlideSheet";
import { StudioDateRangePicker } from "@/components/ui/StudioDateRangePicker";
import {
  StandardFieldGroup,
  StandardInput,
  StandardTextarea,
} from "@/components/ui/standards";
import { WorkspaceCompactToolbar } from "@/components/workspace/WorkspacePrimitives";
import { StudioAiPromoSheet } from "@/components/studio/StudioAiPromoSheet";
import { formatShortDate } from "@/lib/dateFormatters";
import type { PinFeedItemDto } from "@/types/cangaroom";
import type {
  StudioCouponRecord,
  StudioPayload,
} from "@/components/studio/studioTypes";

type PromoTabMode = "promos" | "coupons";

interface StudioPromosClientProps {
  data: StudioPayload;
  onReload: () => Promise<void>;
  onNotify: (msg: string) => void;
}

/**
 * WeGlobal-Style Merchant Promotions & Coupons Workspace (`/studio/promos`)
 * - Click any promo row -> `StudioAiPromoSheet` (`max-w-4xl`) with AI Quick Poster Drop
 * - Click any coupon row -> `AdminSlideSheet` (`max-w-4xl`) coupon form
 * - Multi-select bulk Publish / Unpublish / Delete
 */
export function StudioPromosClient({
  data,
  onReload,
  onNotify,
}: StudioPromosClientProps) {
  const { hotel, pins, coupons } = data;
  const [tab, setTab] = useState<PromoTabMode>("promos");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkBusy, setIsBulkBusy] = useState(false);

  // Promo Sheet state
  const [isPromoSheetOpen, setIsPromoSheetOpen] = useState(false);
  const [editingPin, setEditingPin] = useState<PinFeedItemDto | null>(null);

  // Coupon Sheet state
  const [isCouponSheetOpen, setIsCouponSheetOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<StudioCouponRecord | null>(
    null,
  );
  const [cCode, setCCode] = useState("");
  const [cTitle, setCTitle] = useState("");
  const [cDesc, setCDesc] = useState("");
  const [cType, setCType] = useState<"PERCENT" | "FIXED_THB">("FIXED_THB");
  const [cValue, setCValue] = useState("300");
  const [cMinSpend, setCMinSpend] = useState("0");
  const [cQuota, setCQuota] = useState("");
  const [cStartsAt, setCStartsAt] = useState("");
  const [cExpiresAt, setCExpiresAt] = useState("");
  const [cActive, setCActive] = useState(true);
  const [isSavingCoupon, setIsSavingCoupon] = useState(false);
  const [couponErr, setCouponErr] = useState<string | null>(null);

  const nowTs = Date.now();
  const soonTs = nowTs + 7 * 86_400_000;

  const filteredPins = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return pins.filter((p) => {
      if (statusFilter === "published" && p.publishStatus !== "PUBLISHED") {
        return false;
      }
      if (statusFilter === "draft" && p.publishStatus === "PUBLISHED") {
        return false;
      }
      if (statusFilter === "expiring") {
        if (!p.promoExpiresAt) return false;
        const exp = new Date(p.promoExpiresAt).getTime();
        if (exp < nowTs || exp > soonTs) return false;
      }
      if (!q) return true;
      return (
        p.titleTh.toLowerCase().includes(q) ||
        (p.promoHeadlineTh || "").toLowerCase().includes(q) ||
        (p.promoCode || "").toLowerCase().includes(q)
      );
    });
  }, [pins, searchQuery, statusFilter, nowTs, soonTs]);

  const filteredCoupons = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return coupons.filter((c) => {
      if (statusFilter === "published" && !c.isActive) return false;
      if (statusFilter === "draft" && c.isActive) return false;
      if (!q) return true;
      return (
        c.code.toLowerCase().includes(q) ||
        c.titleTh.toLowerCase().includes(q)
      );
    });
  }, [coupons, searchQuery, statusFilter]);

  const openCouponEditor = (coupon: StudioCouponRecord | null) => {
    setEditingCoupon(coupon);
    setCouponErr(null);
    if (coupon) {
      setCCode(coupon.code);
      setCTitle(coupon.titleTh);
      setCDesc(coupon.descriptionTh || "");
      setCType(coupon.discountType);
      setCValue(String(coupon.discountValue));
      setCMinSpend(String(coupon.minSpendThb || 0));
      setCQuota(coupon.totalQuota ? String(coupon.totalQuota) : "");
      setCStartsAt(coupon.startsAt.slice(0, 10));
      setCExpiresAt(coupon.expiresAt.slice(0, 10));
      setCActive(coupon.isActive);
    } else {
      const today = new Date().toISOString().slice(0, 10);
      const next60 = new Date(Date.now() + 60 * 86_400_000)
        .toISOString()
        .slice(0, 10);
      setCCode("");
      setCTitle("");
      setCDesc("");
      setCType("FIXED_THB");
      setCValue("300");
      setCMinSpend("0");
      setCQuota("");
      setCStartsAt(today);
      setCExpiresAt(next60);
      setCActive(true);
    }
    setIsCouponSheetOpen(true);
  };

  const handleSaveCoupon = async () => {
    if (!cCode.trim() || !cTitle.trim() || Number(cValue) <= 0) {
      setCouponErr("กรุณากรอกโค้ด ชื่อคูปอง และมูลค่าส่วนลดให้ครบถ้วน");
      return;
    }
    setIsSavingCoupon(true);
    setCouponErr(null);
    try {
      const res = await fetch("/api/studio/coupons", {
        method: editingCoupon ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotelSlug: hotel.slug,
          ...(editingCoupon ? { id: editingCoupon.id } : {}),
          code: cCode.trim().toUpperCase(),
          titleTh: cTitle.trim(),
          descriptionTh: cDesc.trim(),
          discountType: cType,
          discountValue: Math.max(1, Math.round(Number(cValue))),
          minSpendThb: Math.max(0, Math.round(Number(cMinSpend) || 0)),
          totalQuota: cQuota.trim() ? Math.max(1, Math.round(Number(cQuota))) : null,
          startsAt: cStartsAt || undefined,
          expiresAt: cExpiresAt || undefined,
          isActive: cActive,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setCouponErr(json.error || "บันทึกคูปองไม่สำเร็จ");
        return;
      }
      onNotify(editingCoupon ? "บันทึกการแก้ไขคูปองแล้ว" : "สร้างคูปองใหม่แล้ว");
      setIsCouponSheetOpen(false);
      await onReload();
    } finally {
      setIsSavingCoupon(false);
    }
  };

  const handleDeleteCoupon = async (couponId: string) => {
    if (!window.confirm("ต้องการลบคูปองนี้ใช่หรือไม่?")) return;
    const res = await fetch(
      `/api/studio/coupons?id=${encodeURIComponent(couponId)}&hotel=${encodeURIComponent(hotel.slug)}`,
      { method: "DELETE" },
    );
    if (res.ok) {
      onNotify("ลบคูปองแล้ว");
      setIsCouponSheetOpen(false);
      await onReload();
    }
  };

  const handleBulkPinAction = async (
    action: "PUBLISH" | "UNPUBLISH" | "DELETE",
  ) => {
    if (selectedIds.length === 0) return;
    if (
      action === "DELETE" &&
      !window.confirm(`ต้องการลบโปรโมชั่นที่เลือก ${selectedIds.length} รายการใช่หรือไม่?`)
    ) {
      return;
    }
    setIsBulkBusy(true);
    try {
      await Promise.all(
        selectedIds.map((pinId) =>
          fetch("/api/studio/promos", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              hotelSlug: hotel.slug,
              pinId,
              action,
            }),
          }),
        ),
      );
      setSelectedIds([]);
      onNotify(
        action === "DELETE"
          ? "ลบรายการที่เลือกแล้ว"
          : action === "PUBLISH"
            ? "เผยแพร่รายการที่เลือกแล้ว"
            : "ซ่อนรายการที่เลือกเป็นฉบับร่างแล้ว",
      );
      await onReload();
    } finally {
      setIsBulkBusy(false);
    }
  };

  const pinColumns: AdminColumn<PinFeedItemDto>[] = [
    {
      header: "รูป",
      className: "w-14",
      cell: (p) => (
        <div className="w-10 h-10 rounded-[10px] overflow-hidden bg-[var(--color-background-muted)] flex items-center justify-center shrink-0">
          {p.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={p.coverImageUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <TicketPercent className="w-4 h-4 text-[var(--color-text-secondary)]" />
          )}
        </div>
      ),
    },
    {
      header: "พาดหัว / ชื่อโปรโมชั่น",
      cell: (p) => {
        const primaryTitle = p.promoHeadlineTh || p.titleTh;
        const showSubtitle =
          Boolean(p.promoHeadlineTh) && p.promoHeadlineTh !== p.titleTh;
        return (
          <div className="min-w-0 max-w-[340px]">
            <p className="ws-body-medium truncate">{primaryTitle}</p>
            {showSubtitle && <p className="ws-caption truncate">{p.titleTh}</p>}
          </div>
        );
      },
    },
    {
      header: "โค้ด",
      cell: (p) =>
        p.promoCode ? (
          <span className="px-2.5 py-1 rounded-full bg-[var(--color-background-muted)] ws-badge text-[var(--color-text-primary)] tracking-wide">
            {p.promoCode}
          </span>
        ) : (
          <span className="ws-caption">—</span>
        ),
    },
    {
      header: "วันหมดเขต",
      cell: (p) =>
        p.promoExpiresAt ? (
          <span className="ws-caption whitespace-nowrap tabular-nums">
            {formatShortDate(p.promoExpiresAt, "th")}
          </span>
        ) : (
          <span className="ws-caption">ไม่กำหนด</span>
        ),
    },
    {
      header: "เข้าชม",
      className: "text-right",
      cell: (p) => (
        <span className="ws-body tabular-nums">
          {(p.viewsCount ?? 0).toLocaleString()}
        </span>
      ),
    },
    {
      header: "บันทึก",
      className: "text-right",
      cell: (p) => (
        <span className="ws-body tabular-nums">
          {(p.savesCount ?? 0).toLocaleString()}
        </span>
      ),
    },
    {
      header: "สถานะ",
      cell: (p) => (
        <span
          className={`inline-flex px-2.5 py-1 rounded-full ws-badge ${
            p.publishStatus === "PUBLISHED"
              ? "bg-[#edf5fd] text-[var(--color-accent)]"
              : "bg-[var(--color-accent-yellow)] text-[#182334]"
          }`}
        >
          {p.publishStatus === "PUBLISHED" ? "เผยแพร่แล้ว" : "ฉบับร่าง"}
        </span>
      ),
    },
  ];

  const couponColumns: AdminColumn<StudioCouponRecord>[] = [
    {
      header: "โค้ดคูปอง",
      cell: (c) => (
        <span className="px-2.5 py-1 rounded-full bg-[#edf5fd] text-[var(--color-accent)] ws-badge tracking-wide">
          {c.code}
        </span>
      ),
    },
    {
      header: "ชื่อคูปอง",
      cell: (c) => (
        <div className="min-w-0 max-w-[300px]">
          <p className="ws-body-medium truncate">{c.titleTh}</p>
          {c.descriptionTh && (
            <p className="ws-caption truncate">{c.descriptionTh}</p>
          )}
        </div>
      ),
    },
    {
      header: "ส่วนลด",
      cell: (c) => (
        <span className="ws-body-strong tabular-nums">
          {c.discountType === "PERCENT"
            ? `${c.discountValue}%`
            : `฿${c.discountValue.toLocaleString()}`}
        </span>
      ),
    },
    {
      header: "เก็บแล้ว / ใช้แล้ว",
      className: "text-right",
      cell: (c) => (
        <span className="ws-caption tabular-nums">
          {c.claimedCount} / {c.usedCount}
        </span>
      ),
    },
    {
      header: "หมดเขต",
      cell: (c) => (
        <span className="ws-caption whitespace-nowrap tabular-nums">
          {formatShortDate(c.expiresAt, "th")}
        </span>
      ),
    },
    {
      header: "สถานะ",
      cell: (c) => (
        <span
          className={`inline-flex px-2.5 py-1 rounded-full ws-badge ${
            c.isActive
              ? "bg-[#edf5fd] text-[var(--color-accent)]"
              : "bg-[var(--color-background-muted)] text-[var(--color-text-secondary)]"
          }`}
        >
          {c.isActive ? "ใช้งานอยู่" : "หยุดชั่วคราว"}
        </span>
      ),
    },
  ];

  return (
    <div className="cgr-admin-page">
      {/* ═══ SINGLE-ROW COMPACT TOOLBAR (Mobile & Desktop) ═══ */}
      <WorkspaceCompactToolbar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder={
          tab === "promos" ? "ค้นหาโปรโมชั่น..." : "ค้นหาโค้ดคูปอง..."
        }
        filters={
          <>
            <div className="inline-flex items-center p-0.5 rounded-full bg-[var(--color-background-muted)] shrink-0">
              <button
                type="button"
                onClick={() => {
                  setTab("promos");
                  setSelectedIds([]);
                }}
                className={`h-8 px-3 rounded-full ws-badge whitespace-nowrap cursor-pointer transition-colors ${
                  tab === "promos"
                    ? "bg-[var(--color-accent)] !text-white"
                    : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                โปร ({pins.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab("coupons");
                  setSelectedIds([]);
                }}
                className={`h-8 px-3 rounded-full ws-badge whitespace-nowrap cursor-pointer transition-colors ${
                  tab === "coupons"
                    ? "bg-[var(--color-accent)] !text-white"
                    : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                คูปอง ({coupons.length})
              </button>
            </div>

            <AdminFilterDropdown
              label="สถานะ"
              selected={statusFilter === "all" ? [] : [statusFilter]}
              onChange={(next) => setStatusFilter(next[0] || "all")}
              options={[
                { value: "published", label: "เผยแพร่อยู่" },
                { value: "draft", label: "ฉบับร่าง / หยุดชั่วคราว" },
                ...(tab === "promos"
                  ? [{ value: "expiring", label: "ใกล้หมดเขตใน 7 วัน" }]
                  : []),
              ]}
            />
          </>
        }
        actions={
          tab === "promos" ? (
            <button
              type="button"
              onClick={() => {
                setEditingPin(null);
                setIsPromoSheetOpen(true);
              }}
              className="h-9 px-3.5 sm:px-4 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] ws-badge inline-flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-[var(--color-accent-yellow)]" />
              <span className="hidden sm:inline">ลงโปรด้วย AI</span>
              <span className="sm:hidden">AI โปร</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => openCouponEditor(null)}
              className="h-9 w-9 sm:w-auto sm:px-4 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] ws-badge inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">สร้างคูปองใหม่</span>
            </button>
          )
        }
      />

      {/* Bulk Action Strip when rows selected */}
      {tab === "promos" && selectedIds.length > 0 && (
        <div className="mx-2 mb-2 px-4 py-2 rounded-2xl bg-[#edf5fd] flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold text-[var(--color-accent)]">
            เลือกอยู่ {selectedIds.length} รายการ
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isBulkBusy}
              onClick={() => void handleBulkPinAction("PUBLISH")}
              className="h-8 px-3 rounded-full bg-[var(--color-accent)] text-white text-xs font-semibold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              <span>เผยแพร่</span>
            </button>
            <button
              type="button"
              disabled={isBulkBusy}
              onClick={() => void handleBulkPinAction("UNPUBLISH")}
              className="h-8 px-3 rounded-full bg-white text-gray-700 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span>ซ่อน</span>
            </button>
            <button
              type="button"
              disabled={isBulkBusy}
              onClick={() => void handleBulkPinAction("DELETE")}
              className="h-8 px-3 rounded-full bg-red-50 text-red-600 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>ลบ</span>
            </button>
          </div>
        </div>
      )}

      {/* ═══ PURE-WHITE HAIRLINE TABLE BODY (Desktop Table / Mobile List Rows) ═══ */}
      <div className="cgr-admin-body py-2 sm:py-3">
        {tab === "promos" ? (
          <AdminDataTable
            data={filteredPins}
            columns={pinColumns}
            enableMultiSelect
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            onRowClick={(pin) => {
              setEditingPin(pin);
              setIsPromoSheetOpen(true);
            }}
            renderMobileRow={(p) => {
              const primaryTitle = p.promoHeadlineTh || p.titleTh;
              const showSubtitle =
                Boolean(p.promoHeadlineTh) && p.promoHeadlineTh !== p.titleTh;
              return (
                <div className="py-3.5 flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-[14px] overflow-hidden bg-[var(--color-background-muted)] flex items-center justify-center shrink-0">
                    {p.coverImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.coverImageUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <TicketPercent className="w-5 h-5 text-[var(--color-text-secondary)]" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="ws-subtitle truncate">{primaryTitle}</p>
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full ws-badge shrink-0 ${
                          p.publishStatus === "PUBLISHED"
                            ? "bg-[#edf5fd] text-[var(--color-accent)]"
                            : "bg-[var(--color-accent-yellow)] text-[#182334]"
                        }`}
                      >
                        {p.publishStatus === "PUBLISHED"
                          ? "เผยแพร่แล้ว"
                          : "ฉบับร่าง"}
                      </span>
                    </div>

                    {showSubtitle && (
                      <p className="ws-caption truncate">{p.titleTh}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 ws-caption">
                      {p.promoCode && (
                        <span className="px-2 py-0.5 rounded-full bg-[var(--color-background-muted)] ws-badge text-[var(--color-text-primary)] tracking-wide">
                          {p.promoCode}
                        </span>
                      )}
                      <span className="tabular-nums">
                        {p.promoExpiresAt
                          ? `หมดเขต ${formatShortDate(p.promoExpiresAt, "th")}`
                          : "ไม่กำหนดวันหมดเขต"}
                      </span>
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        <Eye className="w-3.5 h-3.5" />
                        {(p.viewsCount ?? 0).toLocaleString()}
                      </span>
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        <Heart className="w-3.5 h-3.5" />
                        {(p.savesCount ?? 0).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-[var(--color-text-secondary)] shrink-0" />
                </div>
              );
            }}
            getViewUrl={() => `/${hotel.slug}`}
            emptyLabel="ยังไม่มีการ์ดโปรโมชั่นในร้าน — กดปุ่ม 'ลงโปรด้วย AI' เพื่อเริ่มสร้างได้เลย"
          />
        ) : (
          <AdminDataTable
            data={filteredCoupons}
            columns={couponColumns}
            onRowClick={(coupon) => openCouponEditor(coupon)}
            renderMobileRow={(c) => (
              <div className="py-4 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#edf5fd] text-[var(--color-accent)] ws-badge tracking-wide">
                      {c.code}
                    </span>
                    <span
                      className={`inline-flex px-2.5 py-0.5 rounded-full ws-badge ${
                        c.isActive
                          ? "bg-[var(--color-background-muted)] text-[var(--color-text-primary)]"
                          : "bg-[var(--color-background-muted)] text-[var(--color-text-secondary)]"
                      }`}
                    >
                      {c.isActive ? "ใช้งานอยู่" : "หยุดชั่วคราว"}
                    </span>
                  </div>

                  <p className="ws-subtitle truncate">{c.titleTh}</p>

                  <p className="ws-caption tabular-nums">
                    เก็บ {c.claimedCount} · ใช้ {c.usedCount} · หมดเขต{" "}
                    {formatShortDate(c.expiresAt, "th")}
                  </p>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <span className="ws-subtitle text-[var(--color-accent)] tabular-nums">
                    {c.discountType === "PERCENT"
                      ? `-${c.discountValue}%`
                      : `-฿${c.discountValue.toLocaleString()}`}
                  </span>
                  <ChevronRight className="w-4 h-4 text-[var(--color-text-secondary)]" />
                </div>
              </div>
            )}
            getViewUrl={() => `/${hotel.slug}`}
            emptyLabel="ยังไม่มีคูปองส่วนลด — กดปุ่ม 'สร้างคูปองใหม่' เพื่อออกคูปองให้ลูกค้าเก็บเข้ากระเป๋า"
          />
        )}
      </div>

      {/* ═══ AI PROMO SLIDE-OVER SHEET (max-w-4xl) ═══ */}
      <StudioAiPromoSheet
        isOpen={isPromoSheetOpen}
        onClose={() => {
          setIsPromoSheetOpen(false);
          setEditingPin(null);
        }}
        hotel={hotel}
        editingPin={editingPin}
        onSaved={(msg) => {
          onNotify(msg);
          void onReload();
        }}
      />

      {/* ═══ COUPON MODAL SHEET (Nondii Centered Desktop / Mobile Bottom Sheet) ═══ */}
      <AdminSlideSheet
        isOpen={isCouponSheetOpen}
        onClose={() => setIsCouponSheetOpen(false)}
        title={
          <span className="inline-flex items-center gap-2">
            <Tag className="w-4 h-4 text-[var(--color-accent)]" />
            <span>
              {editingCoupon ? `แก้ไขคูปอง ${editingCoupon.code}` : "สร้างคูปองส่วนลดใหม่"}
            </span>
          </span>
        }
        subtitle={`${hotel.nameTh} · คูปองส่วนลดสำหรับลูกค้าเก็บเข้ากระเป๋า`}
        footerAction={
          <div className="flex items-center justify-between gap-3">
            <div>
              {editingCoupon && (
                <button
                  type="button"
                  onClick={() => void handleDeleteCoupon(editingCoupon.id)}
                  className="ws-body-strong !text-red-600 hover:!text-red-700 underline underline-offset-2 inline-flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>ลบคูปอง</span>
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsCouponSheetOpen(false)}
                className="h-11 px-5 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[14px] font-semibold text-[var(--color-text-primary)] cursor-pointer transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={isSavingCoupon}
                onClick={() => void handleSaveCoupon()}
                className="h-11 px-6 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] text-[14px] font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
              >
                {isSavingCoupon ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>บันทึกคูปอง</span>
              </button>
            </div>
          </div>
        }
      >
        <div className="flex-1 overflow-y-auto cgr-scroll-autohide p-5 space-y-5 bg-[var(--color-background-card)]">
          {couponErr && (
            <div className="rounded-[12px] bg-red-50 px-4 py-3 ws-caption-medium !text-red-700">
              {couponErr}
            </div>
          )}

          <p className="ws-subtitle">รายละเอียดคูปองส่วนลด</p>

          <StandardFieldGroup>
            <div className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x divide-y sm:divide-y-0 divide-[#b0b0b0]">
              <StandardInput
                grouped
                disabled={Boolean(editingCoupon)}
                label="รหัสคูปอง (A-Z, ตัวเลข) *"
                value={cCode}
                onChange={(e) => setCCode(e.target.value.toUpperCase())}
                placeholder="เช่น DIRECT300"
                className="uppercase"
              />
              <StandardInput
                grouped
                label="ชื่อคูปอง (แสดงให้ลูกค้าเห็น) *"
                value={cTitle}
                onChange={(e) => setCTitle(e.target.value)}
                placeholder="เช่น ลดทันที 300 บาท เมื่อจองตรง"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 sm:divide-x divide-y sm:divide-y-0 divide-[#b0b0b0]">
              <StandardInput
                grouped
                type="number"
                min={1}
                label={`มูลค่าส่วนลด (${cType === "PERCENT" ? "%" : "บาท"}) *`}
                prefixText={cType === "FIXED_THB" ? "฿" : undefined}
                suffixText={cType === "PERCENT" ? "%" : undefined}
                value={cValue}
                onChange={(e) => setCValue(e.target.value)}
              />
              <StandardInput
                grouped
                type="number"
                min={0}
                label="ยอดขั้นต่ำ (บาท)"
                prefixText="฿"
                value={cMinSpend}
                onChange={(e) => setCMinSpend(e.target.value)}
              />
              <StandardInput
                grouped
                type="number"
                min={1}
                label="โควตาจำนวนสิทธิ์"
                optionalText="เว้นว่าง = ไม่จำกัด"
                value={cQuota}
                onChange={(e) => setCQuota(e.target.value)}
                placeholder="ไม่จำกัด"
              />
            </div>
          </StandardFieldGroup>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="ws-caption-medium">ประเภทส่วนลด</span>
            <div className="inline-flex items-center p-0.5 rounded-full bg-[var(--color-background-muted)]">
              <button
                type="button"
                onClick={() => setCType("FIXED_THB")}
                className={`h-8 px-4 rounded-full ws-badge cursor-pointer transition-colors ${
                  cType === "FIXED_THB"
                    ? "bg-[var(--color-accent)] !text-white"
                    : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                ลดเป็นบาท (฿)
              </button>
              <button
                type="button"
                onClick={() => setCType("PERCENT")}
                className={`h-8 px-4 rounded-full ws-badge cursor-pointer transition-colors ${
                  cType === "PERCENT"
                    ? "bg-[var(--color-accent)] !text-white"
                    : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                ลดเป็น %
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="ws-caption-medium block">ระยะเวลาใช้คูปอง</span>
            <StudioDateRangePicker
              startDate={cStartsAt}
              endDate={cExpiresAt}
              onChange={(s, e) => {
                setCStartsAt(s);
                setCExpiresAt(e);
              }}
            />
          </div>

          <StandardTextarea
            rows={3}
            label="เงื่อนไขเพิ่มเติม"
            optionalText="ไม่บังคับ"
            value={cDesc}
            onChange={(e) => setCDesc(e.target.value)}
            placeholder="เช่น ใช้ได้สำหรับการจองวันจันทร์–พฤหัสบดี"
          />

          <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-5">
            <div>
              <p className="ws-subtitle">เปิดใช้งานคูปองนี้</p>
              <p className="ws-caption mt-0.5">
                แสดงให้ลูกค้ากดเก็บเข้ากระเป๋าบนหน้าร้าน /{hotel.slug}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={cActive}
              onClick={() => setCActive((p) => !p)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                cActive ? "bg-[var(--color-accent)]" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 rounded-full bg-white transition-transform ${
                  cActive ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </div>
      </AdminSlideSheet>
    </div>
  );
}
