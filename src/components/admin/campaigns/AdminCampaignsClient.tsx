"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, X } from "lucide-react";
import {
  AdminDataTable,
  type AdminColumn,
} from "@/components/admin/ui/AdminDataTable";
import { AdminFilterDropdown } from "@/components/admin/ui/AdminFilterDropdown";
import { WorkspaceCompactToolbar } from "@/components/workspace/WorkspacePrimitives";

interface SponsoredPinItem {
  id: string;
  titleTh: string;
  provinceId: string;
  isSponsored: boolean;
  sponsoredPriority: number;
  likesCount: number;
  savesCount: number;
  hotel: { id: string; slug: string; nameTh: string };
}

interface FeaturedCouponItem {
  id: string;
  code: string;
  titleTh: string;
  discountType: string;
  discountValue: number;
  claimedCount: number;
  isFeaturedDeal: boolean;
  hotel: { id: string; slug: string; nameTh: string };
}

type CampaignView = "deals" | "sponsored";
const BATCH_SIZE = 50;

const VIEW_OPTIONS = [
  { value: "deals", label: "ดีลแนะนำ" },
  { value: "sponsored", label: "ฟีดโปรโมต" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "เปิดใช้งาน" },
  { value: "inactive", label: "ปิดอยู่" },
];

/**
 * 1:1 WeGlobal Table Page for `/admin/campaigns`
 */
export function AdminCampaignsClient() {
  const [view, setView] = useState<CampaignView>("deals");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [pins, setPins] = useState<SponsoredPinItem[]>([]);
  const [coupons, setCoupons] = useState<FeaturedCouponItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const [notice, setNotice] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setNotice(msg);
    window.setTimeout(() => {
      setNotice((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/super-admin/campaigns", {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "โหลดข้อมูลโฆษณาไม่สำเร็จ");
      setPins(json.pins ?? []);
      setCoupons(json.coupons ?? []);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleFeaturedCoupon = async (coupon: FeaturedCouponItem) => {
    setBusyId(coupon.id);
    const nextState = !coupon.isFeaturedDeal;
    try {
      const res = await fetch("/api/super-admin/campaigns", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType: "COUPON",
          id: coupon.id,
          isFeaturedDeal: nextState,
        }),
      });
      if (!res.ok) throw new Error();
      setCoupons((prev) =>
        prev.map((c) =>
          c.id === coupon.id ? { ...c, isFeaturedDeal: nextState } : c,
        ),
      );
      showToast(
        nextState
          ? `ตั้ง "${coupon.code}" เป็น Featured Deal แล้ว`
          : `ปลด "${coupon.code}" ออกแล้ว`,
      );
    } catch {
      showToast("อัปเดตสถานะไม่สำเร็จ");
    } finally {
      setBusyId(null);
    }
  };

  const toggleSponsoredPin = async (pin: SponsoredPinItem) => {
    setBusyId(pin.id);
    const nextState = !pin.isSponsored;
    try {
      const res = await fetch("/api/super-admin/campaigns", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType: "PIN",
          id: pin.id,
          isSponsored: nextState,
          sponsoredPriority: nextState ? 100 : 0,
        }),
      });
      if (!res.ok) throw new Error();
      setPins((prev) =>
        prev.map((p) =>
          p.id === pin.id ? { ...p, isSponsored: nextState } : p,
        ),
      );
      showToast(
        nextState
          ? `เปิด Sponsored ให้ "${pin.hotel.nameTh}" แล้ว`
          : `ปิด Sponsored ของ "${pin.hotel.nameTh}" แล้ว`,
      );
    } catch {
      showToast("อัปเดตสถานะไม่สำเร็จ");
    } finally {
      setBusyId(null);
    }
  };

  const q = query.trim().toLowerCase();

  const filteredCoupons = useMemo(() => {
    return coupons.filter((c) => {
      if (statusFilter[0] === "active" && !c.isFeaturedDeal) return false;
      if (statusFilter[0] === "inactive" && c.isFeaturedDeal) return false;
      if (!q) return true;
      return `${c.code} ${c.titleTh} ${c.hotel.nameTh}`
        .toLowerCase()
        .includes(q);
    });
  }, [coupons, statusFilter, q]);

  const filteredPins = useMemo(() => {
    return pins.filter((p) => {
      if (statusFilter[0] === "active" && !p.isSponsored) return false;
      if (statusFilter[0] === "inactive" && p.isSponsored) return false;
      if (!q) return true;
      return `${p.titleTh} ${p.hotel.nameTh} ${p.provinceId}`
        .toLowerCase()
        .includes(q);
    });
  }, [pins, statusFilter, q]);

  const visibleCoupons = useMemo(
    () => filteredCoupons.slice(0, visibleCount),
    [filteredCoupons, visibleCount],
  );
  const visiblePins = useMemo(
    () => filteredPins.slice(0, visibleCount),
    [filteredPins, visibleCount],
  );

  const couponColumns: AdminColumn<FeaturedCouponItem>[] = useMemo(
    () => [
      {
        header: "โค้ดคูปอง",
        accessorKey: "code",
        className: "w-[130px] whitespace-nowrap",
        cell: (c) => (
          <span className="ws-body-strong tracking-wide">{c.code}</span>
        ),
      },
      {
        header: "สถานที่ / แบรนด์",
        className: "min-w-[200px]",
        cell: (c) => (
          <span className="ws-body-medium">{c.hotel.nameTh}</span>
        ),
      },
      {
        header: "ชื่อแคมเปญ",
        accessorKey: "titleTh",
        className: "min-w-[260px]",
        cell: (c) => (
          <span className="ws-caption line-clamp-1">{c.titleTh}</span>
        ),
      },
      {
        header: "เก็บแล้ว",
        accessorKey: "claimedCount",
        className: "w-[80px] text-center whitespace-nowrap",
        cell: (c) => (
          <span className="ws-body tabular-nums">
            {c.claimedCount.toLocaleString()}
          </span>
        ),
      },
      {
        header: "สถานะแนะนำ",
        accessorKey: "isFeaturedDeal",
        className: "w-[110px] text-center whitespace-nowrap",
        cell: (c) => (
          <button
            type="button"
            disabled={busyId === c.id}
            onClick={(e) => {
              e.stopPropagation();
              toggleFeaturedCoupon(c);
            }}
            className={`inline-flex px-3 py-1 rounded-full ws-badge transition-colors cursor-pointer ${
              c.isFeaturedDeal
                ? "bg-[var(--color-accent)] !text-white hover:bg-[var(--color-accent-hover)]"
                : "bg-[var(--color-background-muted)] text-[var(--color-text-secondary)] hover:bg-[var(--color-background-subtle)]"
            }`}
          >
            {c.isFeaturedDeal ? "Featured" : "ทั่วไป"}
          </button>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [busyId],
  );

  const pinColumns: AdminColumn<SponsoredPinItem>[] = useMemo(
    () => [
      {
        header: "สถานที่ / แบรนด์",
        className: "min-w-[220px]",
        cell: (p) => (
          <span className="ws-body-medium">{p.hotel.nameTh}</span>
        ),
      },
      {
        header: "การ์ดโปรโมชั่น",
        accessorKey: "titleTh",
        className: "min-w-[280px]",
        cell: (p) => (
          <span className="ws-caption line-clamp-1">{p.titleTh}</span>
        ),
      },
      {
        header: "บันทึก",
        accessorKey: "savesCount",
        className: "w-[70px] text-center whitespace-nowrap",
        cell: (p) => (
          <span className="ws-body tabular-nums">{p.savesCount}</span>
        ),
      },
      {
        header: "ถูกใจ",
        accessorKey: "likesCount",
        className: "w-[70px] text-center whitespace-nowrap",
        cell: (p) => (
          <span className="ws-body tabular-nums">{p.likesCount}</span>
        ),
      },
      {
        header: "Sponsored",
        accessorKey: "isSponsored",
        className: "w-[110px] text-center whitespace-nowrap",
        cell: (p) => (
          <button
            type="button"
            disabled={busyId === p.id}
            onClick={(e) => {
              e.stopPropagation();
              toggleSponsoredPin(p);
            }}
            className={`inline-flex px-3 py-1 rounded-full ws-badge transition-colors cursor-pointer ${
              p.isSponsored
                ? "bg-[var(--color-accent)] !text-white hover:bg-[var(--color-accent-hover)]"
                : "bg-[var(--color-background-muted)] text-[var(--color-text-secondary)] hover:bg-[var(--color-background-subtle)]"
            }`}
          >
            {p.isSponsored ? "Sponsored" : "ปกติ"}
          </button>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [busyId],
  );

  const activeLen =
    view === "deals" ? visibleCoupons.length : visiblePins.length;
  const totalLen =
    view === "deals" ? filteredCoupons.length : filteredPins.length;
  const hasMore = activeLen < totalLen;

  return (
    <div className="cgr-admin-page">
      <WorkspaceCompactToolbar
        searchValue={query}
        onSearchChange={(val) => {
          setQuery(val);
          setVisibleCount(BATCH_SIZE);
        }}
        searchPlaceholder="ค้นหาแคมเปญ คูปอง หรือสถานที่..."
        filters={
          <>
            <AdminFilterDropdown
              label="แคมเปญ"
              options={VIEW_OPTIONS}
              selected={[view]}
              onChange={(vals) => {
                setView((vals[0] as CampaignView) || "deals");
                setVisibleCount(BATCH_SIZE);
              }}
              multiple={false}
            />

            <AdminFilterDropdown
              label="สถานะ"
              options={STATUS_OPTIONS}
              selected={statusFilter}
              onChange={(vals) => {
                setStatusFilter(vals);
                setVisibleCount(BATCH_SIZE);
              }}
              multiple={false}
            />
          </>
        }
        actions={
          <button
            type="button"
            onClick={loadData}
            title="รีเฟรช"
            className="h-9 w-9 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] inline-flex items-center justify-center cursor-pointer transition-colors"
          >
            <RefreshCw size={15} className={isLoading ? "animate-spin" : ""} />
          </button>
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

      <div
        className="cgr-admin-body md:!overflow-hidden py-3"
        style={{ overflowX: "clip" }}
      >
        {isLoading && totalLen === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-400 gap-2 text-sm">
            <Loader2 size={18} className="animate-spin" />
            <span>Loading campaigns...</span>
          </div>
        ) : view === "deals" ? (
          <AdminDataTable
            data={visibleCoupons}
            columns={couponColumns}
            keyField="id"
            getViewUrl={(item) => `/${encodeURIComponent(item.hotel.slug)}`}
            emptyLabel="No featured deals found"
            footer={
              <div className="border-t border-gray-100 p-2 flex items-center justify-center gap-3 text-xs text-gray-500 shrink-0">
                <span>
                  Showing {visibleCoupons.length} of {filteredCoupons.length}{" "}
                  deals
                </span>
                {hasMore && (
                  <button
                    type="button"
                    onClick={() => setVisibleCount((c) => c + BATCH_SIZE)}
                    className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-md font-medium text-gray-700 cursor-pointer"
                  >
                    Load More (
                    {Math.min(
                      BATCH_SIZE,
                      filteredCoupons.length - visibleCoupons.length,
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
            getViewUrl={(item) => `/${encodeURIComponent(item.hotel.slug)}`}
            emptyLabel="No promo cards found"
            footer={
              <div className="border-t border-gray-100 p-2 flex items-center justify-center gap-3 text-xs text-gray-500 shrink-0">
                <span>
                  Showing {visiblePins.length} of {filteredPins.length} cards
                </span>
                {hasMore && (
                  <button
                    type="button"
                    onClick={() => setVisibleCount((c) => c + BATCH_SIZE)}
                    className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-md font-medium text-gray-700 cursor-pointer"
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
    </div>
  );
}
