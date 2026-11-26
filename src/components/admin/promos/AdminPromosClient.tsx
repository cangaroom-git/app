"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Check,
  Clock,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import {
  AdminDataTable,
  type AdminColumn,
} from "@/components/admin/ui/AdminDataTable";
import { AdminFilterDropdown } from "@/components/admin/ui/AdminFilterDropdown";
import { WorkspaceCompactToolbar } from "@/components/workspace/WorkspacePrimitives";
import {
  AiQuickPromoDropSheet,
  type EditablePromoTarget,
  type PromoTargetHotelOption,
} from "@/components/admin/promos/AiQuickPromoDropSheet";
import {
  formatPlaceLocationScopeLabel,
  formatPromoDateRangeLabel,
  getPlaceCategoryMeta,
} from "@/lib/placeCategories";
import { getProvinceById } from "@/data/thailandProvinces";

interface PromoInboxRow {
  id: string;
  sourceType: string;
  matchedHotelId: string | null;
  brandNameTh: string;
  locationScope: "SINGLE_LOCATION" | "MULTI_BRANCH" | "NATIONWIDE_ONLINE";
  branchSummaryTh: string;
  provinceId: string;
  promoCategoryCode: string;
  titleTh: string;
  descriptionTh: string;
  discountLabelTh: string;
  promoCode: string | null;
  originalPriceThb: number | null;
  dealPriceThb: number | null;
  startsAt: string | null;
  expiresAt: string | null;
  externalUrl: string | null;
  coverImageUrl: string | null;
  visualMode: "OFFICIAL_PHOTO" | "BRANDED_CARD" | "CATEGORY_FALLBACK";
  status: "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "EXPIRED" | "DUPLICATE";
  createdAt: string;
}

interface LivePromoPinRow {
  id: string;
  hotelId: string;
  titleTh: string;
  descriptionTh: string;
  coverImageUrl: string;
  provinceId: string;
  promoHeadlineTh: string | null;
  promoCode: string | null;
  promoOriginalPriceThb: number | null;
  promoDealPriceThb: number | null;
  promoStartsAt: string | null;
  promoExpiresAt: string | null;
  promoCategoryCode: string | null;
  externalDealUrl: string | null;
  visualMode: "OFFICIAL_PHOTO" | "BRANDED_CARD" | "CATEGORY_FALLBACK";
  publishStatus: string;
  viewsCount: number;
  savesCount: number;
  externalClickCount: number;
  hotel: {
    id: string;
    slug: string;
    nameTh: string;
    placeCategory: string;
    locationScope: "SINGLE_LOCATION" | "MULTI_BRANCH" | "NATIONWIDE_ONLINE";
    branchSummaryTh: string;
  };
}

type PromoView = "active" | "inbox" | "expiring";

const BATCH_SIZE = 50;

const SOURCE_SHORT: Record<string, string> = {
  ADMIN_AI_DROP: "AI Drop",
  AFFILIATE_API: "Affiliate",
  EMAIL_WEBHOOK: "Email",
  FACEBOOK_SYNC: "FB Sync",
  MERCHANT_SUBMIT: "Merchant",
  COMMUNITY_TIP: "Community",
};

const VIEW_OPTIONS = [
  { value: "active", label: "กำลังเผยแพร่" },
  { value: "inbox", label: "กล่องรับโปร" },
  { value: "expiring", label: "ใกล้หมดเขต" },
];

const CATEGORY_OPTIONS = [
  { value: "STAY", label: "ที่พัก" },
  { value: "CAFE", label: "คาเฟ่" },
  { value: "RESTAURANT", label: "อาหาร & บาร์" },
  { value: "WELLNESS", label: "สปา" },
  { value: "ATTRACTION", label: "กิจกรรม" },
];

const SCOPE_OPTIONS = [
  { value: "SINGLE_LOCATION", label: "ร้านเดี่ยว" },
  { value: "MULTI_BRANCH", label: "หลายสาขา" },
  { value: "NATIONWIDE_ONLINE", label: "ทั่วไทย / ออนไลน์" },
];

function normalizeCatCode(
  code?: string | null,
): "STAY" | "CAFE" | "RESTAURANT" | "WELLNESS" | "ATTRACTION" {
  if (
    code === "CAFE" ||
    code === "RESTAURANT" ||
    code === "WELLNESS" ||
    code === "ATTRACTION"
  ) {
    return code;
  }
  return "STAY";
}

/**
 * 1:1 WeGlobal `ProductClient` Pattern for `/admin/promos`
 * - Click ANY row → immediately opens Slide-Over `AiQuickPromoDropSheet` pre-filled for editing
 * - Multi-select circular Travel-Blue checkboxes + Bulk Publish / Unpublish / Delete bar
 * - Primary Travel-Blue buttons + `#FEF211` highlight badge
 */
export function AdminPromosClient() {
  const searchParams = useSearchParams();
  const initialView: PromoView =
    searchParams.get("tab") === "inbox"
      ? "inbox"
      : searchParams.get("tab") === "expiring"
        ? "expiring"
        : "active";

  const [view, setView] = useState<PromoView>(initialView);
  const [isSheetOpen, setIsSheetOpen] = useState(
    () => searchParams.get("drop") === "1",
  );
  const [editingTarget, setEditingTarget] =
    useState<EditablePromoTarget | null>(null);

  const [query, setQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);

  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isRunningExpire, setIsRunningExpire] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const [inboxItems, setInboxItems] = useState<PromoInboxRow[]>([]);
  const [activePins, setActivePins] = useState<LivePromoPinRow[]>([]);
  const [expiringPins, setExpiringPins] = useState<LivePromoPinRow[]>([]);
  const [expiredPins, setExpiredPins] = useState<LivePromoPinRow[]>([]);
  const [hotels, setHotels] = useState<PromoTargetHotelOption[]>([]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/promos", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "โหลดข้อมูลไม่สำเร็จ");
      setInboxItems(json.inboxItems ?? []);
      setActivePins(json.activePins ?? []);
      setExpiringPins(json.expiringPins ?? []);
      setExpiredPins(json.expiredPins ?? []);
      setHotels(json.hotels ?? []);
    } catch (err) {
      setNotice(
        err instanceof Error ? err.message : "โหลดข้อมูลโปรโมชั่นไม่สำเร็จ",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (searchParams.get("drop") === "1") {
      setEditingTarget(null);
      setIsSheetOpen(true);
    }
  }, [searchParams]);

  const showToast = (msg: string) => {
    setNotice(msg);
    window.setTimeout(() => {
      setNotice((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  // Click-row handlers (exact WeGlobal ProductClient pattern)
  const openNewPromo = () => {
    setEditingTarget(null);
    setIsSheetOpen(true);
  };

  const handleRowClickPin = (pin: LivePromoPinRow) => {
    setEditingTarget({
      targetType: "PIN",
      id: pin.id,
      matchedHotelId: pin.hotelId,
      hotelSlug: pin.hotel.slug,
      brandNameTh: pin.hotel.nameTh,
      titleTh: pin.titleTh,
      promoHeadlineTh: pin.promoHeadlineTh || pin.titleTh,
      descriptionTh: pin.descriptionTh || "",
      promoCode: pin.promoCode || "",
      promoCategoryCode: normalizeCatCode(
        pin.promoCategoryCode || pin.hotel.placeCategory,
      ),
      locationScope: pin.hotel.locationScope,
      branchSummaryTh: pin.hotel.branchSummaryTh || "",
      provinceId: pin.provinceId || "bangkok",
      originalPriceThb: pin.promoOriginalPriceThb,
      dealPriceThb: pin.promoDealPriceThb,
      startsAt: pin.promoStartsAt,
      expiresAt: pin.promoExpiresAt,
      externalUrl: pin.externalDealUrl || "",
      coverImageUrl: pin.coverImageUrl || "",
      visualMode:
        pin.visualMode === "BRANDED_CARD" ? "BRANDED_CARD" : "OFFICIAL_PHOTO",
      isPublished: pin.publishStatus === "PUBLISHED",
    });
    setIsSheetOpen(true);
  };

  const handleRowClickInbox = (item: PromoInboxRow) => {
    setEditingTarget({
      targetType: "INBOX",
      id: item.id,
      matchedHotelId: item.matchedHotelId,
      hotelSlug: null,
      brandNameTh: item.brandNameTh,
      titleTh: item.titleTh,
      promoHeadlineTh: item.discountLabelTh || item.titleTh,
      descriptionTh: item.descriptionTh || "",
      promoCode: item.promoCode || "",
      promoCategoryCode: normalizeCatCode(item.promoCategoryCode),
      locationScope: item.locationScope,
      branchSummaryTh: item.branchSummaryTh || "",
      provinceId: item.provinceId || "bangkok",
      originalPriceThb: item.originalPriceThb,
      dealPriceThb: item.dealPriceThb,
      startsAt: item.startsAt,
      expiresAt: item.expiresAt,
      externalUrl: item.externalUrl || "",
      coverImageUrl: item.coverImageUrl || "",
      visualMode:
        item.visualMode === "OFFICIAL_PHOTO" ? "OFFICIAL_PHOTO" : "BRANDED_CARD",
      isPublished: item.status === "APPROVED",
    });
    setIsSheetOpen(true);
  };

  const handleInboxAction = async (
    inboxId: string,
    action: "APPROVE" | "REJECT" | "DELETE",
  ) => {
    setBusyId(inboxId);
    try {
      const res = await fetch("/api/admin/promos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inboxId, action }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "ดำเนินการไม่สำเร็จ");
      showToast(
        action === "APPROVE"
          ? "อนุมัติขึ้นหน้าแรกแล้ว"
          : action === "REJECT"
            ? "ปัดตกแล้ว"
            : "ลบรายการแล้ว",
      );
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "ดำเนินการไม่สำเร็จ");
    } finally {
      setBusyId(null);
    }
  };

  const handleBulkAction = async (
    action: "APPROVE" | "PUBLISH" | "UNPUBLISH" | "DELETE",
  ) => {
    if (selectedIds.length === 0) return;
    setBusyId("bulk");
    try {
      for (const id of selectedIds) {
        const body =
          view === "inbox"
            ? { inboxId: id, action }
            : { pinId: id, action };
        await fetch("/api/admin/promos", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }
      const count = selectedIds.length;
      setSelectedIds([]);
      showToast(`ดำเนินการกับ ${count} รายการเรียบร้อย`);
      await loadData();
    } finally {
      setBusyId(null);
    }
  };

  const handleRunAutoExpire = async () => {
    setIsRunningExpire(true);
    try {
      const res = await fetch("/api/cron/expire-promos", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "รัน Auto-Expire ไม่สำเร็จ");
      showToast(
        `Auto-Expire สำเร็จ: Inbox ${json.expiredInboxCount ?? 0} · คูปอง ${json.expiredCouponsCount ?? 0} · การ์ดโปร ${json.expiredPromoPinsCount ?? 0}`,
      );
      await loadData();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "ไม่สามารถรัน Auto-Expire ได้",
      );
    } finally {
      setIsRunningExpire(false);
    }
  };

  const pendingInboxCount = useMemo(
    () => inboxItems.filter((i) => i.status === "PENDING_REVIEW").length,
    [inboxItems],
  );

  const q = query.trim().toLowerCase();

  const filteredInbox = useMemo(() => {
    return inboxItems.filter((item) => {
      if (
        selectedCategories.length > 0 &&
        !selectedCategories.includes(item.promoCategoryCode)
      ) {
        return false;
      }
      if (
        selectedScopes.length > 0 &&
        !selectedScopes.includes(item.locationScope)
      ) {
        return false;
      }
      if (!q) return true;
      return `${item.brandNameTh} ${item.titleTh} ${item.discountLabelTh} ${item.promoCode || ""}`
        .toLowerCase()
        .includes(q);
    });
  }, [inboxItems, selectedCategories, selectedScopes, q]);

  const expiringCombined = useMemo(() => {
    const merged = [...expiringPins, ...expiredPins];
    const seen = new Set<string>();
    return merged.filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  }, [expiringPins, expiredPins]);

  const filteredPins = useMemo(() => {
    const source = view === "active" ? activePins : expiringCombined;
    return source.filter((p) => {
      const cat = p.promoCategoryCode || p.hotel.placeCategory;
      if (selectedCategories.length > 0 && !selectedCategories.includes(cat)) {
        return false;
      }
      if (
        selectedScopes.length > 0 &&
        !selectedScopes.includes(p.hotel.locationScope)
      ) {
        return false;
      }
      if (!q) return true;
      return `${p.hotel.nameTh} ${p.titleTh} ${p.promoHeadlineTh || ""} ${p.promoCode || ""}`
        .toLowerCase()
        .includes(q);
    });
  }, [view, activePins, expiringCombined, selectedCategories, selectedScopes, q]);

  const inboxColumns: AdminColumn<PromoInboxRow>[] = useMemo(
    () => [
      {
        header: "รูป",
        accessorKey: "coverImageUrl",
        className: "w-[58px]",
        stickyLeft: true,
        cell: (item) => (
          <div className="w-10 h-10 bg-[var(--color-background-muted)] rounded-lg overflow-hidden shrink-0">
            {item.coverImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.coverImageUrl}
                alt={item.brandNameTh}
                loading="lazy"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[var(--color-text-secondary)] ws-badge">
                —
              </div>
            )}
          </div>
        ),
      },
      {
        header: "แบรนด์ / โปรโมชั่น",
        accessorKey: "brandNameTh",
        className: "min-w-[260px]",
        cell: (item) => (
          <div className="min-w-0">
            <p className="ws-body-medium truncate">{item.brandNameTh}</p>
            <p className="ws-caption truncate">
              {item.discountLabelTh || item.titleTh}
            </p>
          </div>
        ),
      },
      {
        header: "แหล่งที่มา",
        accessorKey: "sourceType",
        className: "whitespace-nowrap",
        cell: (item) => (
          <span className="ws-caption">
            {SOURCE_SHORT[item.sourceType] ?? item.sourceType}
          </span>
        ),
      },
      {
        header: "หมวดหมู่",
        accessorKey: "promoCategoryCode",
        className: "whitespace-nowrap",
        cell: (item) => (
          <span className="ws-caption">
            {getPlaceCategoryMeta(item.promoCategoryCode).shortLabelTh}
          </span>
        ),
      },
      {
        header: "ระยะเวลา",
        accessorKey: "expiresAt",
        className: "whitespace-nowrap",
        cell: (item) => {
          const info = formatPromoDateRangeLabel(
            item.startsAt,
            item.expiresAt,
            "th",
          );
          return (
            <span className="ws-caption tabular-nums">
              {info ? info.label : "—"}
            </span>
          );
        },
      },
      {
        header: "สถานะ",
        accessorKey: "status",
        className: "whitespace-nowrap text-center",
        cell: (item) => {
          if (item.status === "PENDING_REVIEW") {
            return (
              <span className="inline-flex px-2.5 py-1 rounded-full bg-[var(--color-accent-yellow)] text-[#182334] ws-badge">
                รอตรวจ
              </span>
            );
          }
          if (item.status === "APPROVED") {
            return (
              <span className="inline-flex px-2.5 py-1 rounded-full bg-[var(--color-accent-muted)] text-[var(--color-accent)] ws-badge">
                อนุมัติแล้ว
              </span>
            );
          }
          return (
            <span className="inline-flex px-2.5 py-1 rounded-full bg-[var(--color-background-muted)] text-[var(--color-text-secondary)] ws-badge">
              {item.status === "REJECTED" ? "ปัดตก" : "หมดอายุ"}
            </span>
          );
        },
      },
    ],
    [],
  );

  const pinColumns: AdminColumn<LivePromoPinRow>[] = useMemo(
    () => [
      {
        header: "รูป",
        accessorKey: "coverImageUrl",
        className: "w-[58px]",
        stickyLeft: true,
        cell: (item) => (
          <div className="w-10 h-10 bg-[var(--color-background-muted)] rounded-lg overflow-hidden shrink-0">
            {item.coverImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.coverImageUrl}
                alt={item.hotel.nameTh}
                loading="lazy"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[var(--color-text-secondary)] ws-badge">
                —
              </div>
            )}
          </div>
        ),
      },
      {
        header: "โปรโมชั่น",
        accessorKey: "titleTh",
        className: "min-w-[280px]",
        cell: (item) => (
          <div className="min-w-0">
            <p className="ws-body-medium line-clamp-1">
              {item.promoHeadlineTh || item.titleTh}
            </p>
            <p className="ws-caption truncate">
              {item.hotel.nameTh}
              {item.promoCode ? ` · โค้ด: ${item.promoCode}` : ""}
            </p>
          </div>
        ),
      },
      {
        header: "หมวดหมู่",
        accessorKey: "promoCategoryCode",
        className: "whitespace-nowrap",
        cell: (item) => (
          <span className="ws-caption">
            {
              getPlaceCategoryMeta(
                item.promoCategoryCode || item.hotel.placeCategory,
              ).shortLabelTh
            }
          </span>
        ),
      },
      {
        header: "พื้นที่",
        accessorKey: "provinceId",
        className: "whitespace-nowrap",
        cell: (item) => {
          const prov = getProvinceById(item.provinceId);
          return (
            <span className="ws-caption">
              {formatPlaceLocationScopeLabel(
                {
                  locationScope: item.hotel.locationScope,
                  branchSummaryTh: item.hotel.branchSummaryTh,
                  provinceId: item.provinceId,
                  provinceNameTh: prov
                    ? prov.nameTh.split("(")[0].trim()
                    : item.provinceId,
                  provinceNameEn: prov ? prov.nameEn : item.provinceId,
                },
                "th",
              )}
            </span>
          );
        },
      },
      {
        header: "ระยะเวลา",
        accessorKey: "promoExpiresAt",
        className: "whitespace-nowrap",
        cell: (item) => {
          const dateInfo = formatPromoDateRangeLabel(
            item.promoStartsAt,
            item.promoExpiresAt,
            "th",
          );
          if (!dateInfo) return <span className="ws-caption">—</span>;
          return (
            <span
              className={`ws-caption tabular-nums ${
                dateInfo.isExpired
                  ? "!text-red-600 font-medium"
                  : dateInfo.isExpiringSoon
                    ? "!text-[var(--color-accent)] font-semibold"
                    : ""
              }`}
            >
              {dateInfo.label}
            </span>
          );
        },
      },
      {
        header: "สถานะ",
        accessorKey: "publishStatus",
        className: "whitespace-nowrap text-center",
        cell: (item) => {
          const isExpired =
            item.promoExpiresAt &&
            new Date(item.promoExpiresAt).getTime() <= Date.now();
          if (item.publishStatus === "PUBLISHED" && !isExpired) {
            return (
              <span className="inline-flex px-2.5 py-1 rounded-full bg-[var(--color-accent-muted)] text-[var(--color-accent)] ws-badge">
                เผยแพร่แล้ว
              </span>
            );
          }
          return (
            <span className="inline-flex px-2.5 py-1 rounded-full bg-[var(--color-accent-yellow)] text-[#182334] ws-badge">
              {isExpired ? "หมดอายุ" : "ฉบับร่าง"}
            </span>
          );
        },
      },
      {
        header: "เข้าชม",
        accessorKey: "viewsCount",
        className: "w-[70px] text-center whitespace-nowrap",
        cell: (item) => (
          <span className="ws-body tabular-nums">
            {item.viewsCount.toLocaleString()}
          </span>
        ),
      },
    ],
    [],
  );

  const visibleInbox = useMemo(
    () => filteredInbox.slice(0, visibleCount),
    [filteredInbox, visibleCount],
  );
  const visiblePins = useMemo(
    () => filteredPins.slice(0, visibleCount),
    [filteredPins, visibleCount],
  );

  const activeListLength =
    view === "inbox" ? visibleInbox.length : visiblePins.length;
  const activeTotalLength =
    view === "inbox" ? filteredInbox.length : filteredPins.length;
  const hasMore = activeListLength < activeTotalLength;

  return (
    <div className="cgr-admin-page">
      {/* ═══ SINGLE-ROW COMPACT TOOLBAR (Mobile & Desktop) ═══ */}
      <WorkspaceCompactToolbar
        searchValue={query}
        onSearchChange={(val) => {
          setQuery(val);
          setVisibleCount(BATCH_SIZE);
        }}
        searchPlaceholder="ค้นหาโปรโมชั่น แบรนด์ หรือโค้ด..."
        filters={
          <>
            <AdminFilterDropdown
              label="มุมมอง"
              options={VIEW_OPTIONS}
              selected={[view]}
              onChange={(vals) => {
                const next = (vals[0] as PromoView) || "active";
                setView(next);
                setSelectedIds([]);
                setVisibleCount(BATCH_SIZE);
              }}
              multiple={false}
            />

            <AdminFilterDropdown
              label="หมวดหมู่"
              options={CATEGORY_OPTIONS}
              selected={selectedCategories}
              onChange={(vals) => {
                setSelectedCategories(vals);
                setVisibleCount(BATCH_SIZE);
              }}
              multiple
            />

            <AdminFilterDropdown
              label="พื้นที่"
              options={SCOPE_OPTIONS}
              selected={selectedScopes}
              onChange={(vals) => {
                setSelectedScopes(vals);
                setVisibleCount(BATCH_SIZE);
              }}
              multiple
            />
          </>
        }
        actions={
          <>
            {selectedIds.length > 0 && (
              <div className="flex items-center gap-0.5 bg-[var(--color-accent-muted)] px-2 py-0.5 rounded-full">
                <span className="ws-badge text-[var(--color-accent)] mx-1">
                  {selectedIds.length}
                </span>
                {view === "inbox" ? (
                  <button
                    type="button"
                    onClick={() => handleBulkAction("APPROVE")}
                    disabled={busyId === "bulk"}
                    title="อนุมัติที่เลือก"
                    className="p-1.5 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 rounded-full cursor-pointer"
                  >
                    <Check size={14} />
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => handleBulkAction("PUBLISH")}
                      disabled={busyId === "bulk"}
                      title="เผยแพร่ที่เลือก"
                      className="p-1.5 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 rounded-full cursor-pointer"
                    >
                      <Eye size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBulkAction("UNPUBLISH")}
                      disabled={busyId === "bulk"}
                      title="ซ่อนที่เลือก"
                      className="p-1.5 text-orange-600 hover:bg-orange-100 rounded-full cursor-pointer"
                    >
                      <EyeOff size={14} />
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => handleBulkAction("DELETE")}
                  disabled={busyId === "bulk"}
                  title="ลบที่เลือก"
                  className="p-1.5 text-red-600 hover:bg-red-100 rounded-full cursor-pointer"
                >
                  <Trash2 size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  aria-label="ยกเลิกการเลือก"
                  className="p-1.5 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 rounded-full cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {pendingInboxCount > 0 && view !== "inbox" && (
              <button
                type="button"
                onClick={() => {
                  setView("inbox");
                  setSelectedIds([]);
                }}
                className="h-9 px-3 rounded-full bg-[var(--color-accent-yellow)] text-[#182334] ws-badge inline-flex items-center gap-1 cursor-pointer hover:brightness-95 transition-all"
              >
                <Sparkles size={13} />
                <span>{pendingInboxCount}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleRunAutoExpire}
              disabled={isRunningExpire}
              title="เคลียร์โปรหมดอายุอัตโนมัติ"
              className="hidden sm:inline-flex h-9 px-3 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] ws-caption-medium items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
            >
              <Clock
                size={15}
                className={isRunningExpire ? "animate-spin" : ""}
              />
              <span className="hidden lg:inline">Auto-Expire</span>
            </button>

            <button
              type="button"
              onClick={loadData}
              title="รีเฟรช"
              className="h-9 w-9 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] inline-flex items-center justify-center cursor-pointer transition-colors"
            >
              <RefreshCw size={15} className={isLoading ? "animate-spin" : ""} />
            </button>

            <button
              type="button"
              onClick={openNewPromo}
              title="ลงโปรโมชั่นใหม่ / AI Drop"
              className="h-9 w-9 sm:w-auto sm:px-4 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] ws-body-strong inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              <Plus size={17} />
              <span className="hidden sm:inline">เพิ่มโปร</span>
            </button>
          </>
        }
      />

      {notice && (
        <div className="max-w-[1160px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-2 border-b border-[var(--color-border)] bg-[var(--color-accent-muted)] text-[var(--color-accent)] ws-caption-medium flex items-center justify-between gap-2 shrink-0">
          <span className="truncate">{notice}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="p-1 rounded-full hover:bg-[var(--color-accent)]/10 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ═══ CLICKABLE TABLE BODY (Aligned 1:1 with 1160px Toolbar & Top Bar) ═══ */}
      <div
        className="cgr-admin-body md:!overflow-hidden py-3"
        style={{ overflowX: "clip" }}
      >
        {isLoading && activeTotalLength === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-400 gap-2 text-sm">
            <Loader2 size={18} className="animate-spin" />
            <span>Loading promotions...</span>
          </div>
        ) : view === "inbox" ? (
          <AdminDataTable
            data={visibleInbox}
            columns={inboxColumns}
            keyField="id"
            onRowClick={handleRowClickInbox}
            enableMultiSelect
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            emptyLabel="No promotions in inbox"
            customRowAction={(item) => (
              <div className="flex items-center gap-1">
                {item.status === "PENDING_REVIEW" && (
                  <>
                    <button
                      type="button"
                      disabled={busyId === item.id}
                      onClick={() => handleInboxAction(item.id, "APPROVE")}
                      title="Approve & Publish"
                      className="inline-flex items-center justify-center rounded-full p-1.5 text-[var(--color-accent)] hover:bg-[var(--color-accent-muted)] transition-colors cursor-pointer"
                    >
                      <Check size={15} />
                    </button>
                    <button
                      type="button"
                      disabled={busyId === item.id}
                      onClick={() => handleInboxAction(item.id, "REJECT")}
                      title="Reject"
                      className="inline-flex items-center justify-center rounded-full p-1.5 text-gray-400 hover:text-gray-800 hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                      <X size={15} />
                    </button>
                  </>
                )}
                <button
                  type="button"
                  disabled={busyId === item.id}
                  onClick={() => handleInboxAction(item.id, "DELETE")}
                  title="Delete"
                  className="inline-flex items-center justify-center rounded-full p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            )}
            footer={
              <div className="border-t border-gray-100 p-2 flex items-center justify-center gap-3 text-xs text-gray-500 shrink-0">
                <span>
                  Showing {visibleInbox.length} of {filteredInbox.length} items
                </span>
                {hasMore && (
                  <button
                    type="button"
                    onClick={() => setVisibleCount((c) => c + BATCH_SIZE)}
                    className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-md font-medium text-gray-700 transition-colors cursor-pointer"
                  >
                    Load More (
                    {Math.min(
                      BATCH_SIZE,
                      filteredInbox.length - visibleInbox.length,
                    )}{" "}
                    more)
                  </button>
                )}
              </div>
            }
          />
        ) : (
          <AdminDataTable
            data={visiblePins}
            columns={pinColumns}
            keyField="id"
            onRowClick={handleRowClickPin}
            enableMultiSelect
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            getViewUrl={(item) => `/${encodeURIComponent(item.hotel.slug)}`}
            emptyLabel="No matching promotions found"
            footer={
              <div className="border-t border-gray-100 p-2 flex items-center justify-center gap-3 text-xs text-gray-500 shrink-0">
                <span>
                  Showing {visiblePins.length} of {filteredPins.length}{" "}
                  promotions
                </span>
                {hasMore && (
                  <button
                    type="button"
                    onClick={() => setVisibleCount((c) => c + BATCH_SIZE)}
                    className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-md font-medium text-gray-700 transition-colors cursor-pointer"
                  >
                    Load More (
                    {Math.min(
                      BATCH_SIZE,
                      filteredPins.length - visiblePins.length,
                    )}{" "}
                    more)
                  </button>
                )}
              </div>
            }
          />
        )}
      </div>

      {/* ═══ WEGLOBAL CLICK-ROW SLIDE-OVER FORM SHEET ═══ */}
      <AiQuickPromoDropSheet
        isOpen={isSheetOpen}
        onClose={() => {
          setIsSheetOpen(false);
          setEditingTarget(null);
        }}
        hotels={hotels}
        editingTarget={editingTarget}
        onSaved={(message, switchToView) => {
          showToast(message);
          if (switchToView) setView(switchToView);
          void loadData();
        }}
      />
    </div>
  );
}
