"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronRight,
  Eye,
  Heart,
  MousePointerClick,
  X,
} from "lucide-react";
import {
  AdminDataTable,
  type AdminColumn,
} from "@/components/admin/ui/AdminDataTable";
import { AdminFilterDropdown } from "@/components/admin/ui/AdminFilterDropdown";
import { WorkspaceCompactToolbar } from "@/components/workspace/WorkspacePrimitives";
import {
  formatPlaceLocationScopeLabel,
  getPlaceCategoryMeta,
} from "@/lib/placeCategories";
import type { AdminPerformanceRow } from "@/lib/services/adminDashboardService";

interface AdminStatsTableProps {
  rows: AdminPerformanceRow[];
  selectedProvinceId: string | null;
  onClearProvince: () => void;
}

type SortField = "viewsCount" | "savesCount" | "externalClickCount";

const BATCH_SIZE = 50;

const CATEGORY_OPTIONS = [
  { value: "STAY", label: "ที่พัก" },
  { value: "CAFE", label: "คาเฟ่" },
  { value: "RESTAURANT", label: "อาหาร & บาร์" },
  { value: "WELLNESS", label: "สปา & เวลเนส" },
  { value: "ATTRACTION", label: "กิจกรรม & ที่เที่ยว" },
];

const SCOPE_OPTIONS = [
  { value: "SINGLE_LOCATION", label: "ร้านเดี่ยว" },
  { value: "MULTI_BRANCH", label: "หลายสาขา" },
  { value: "NATIONWIDE_ONLINE", label: "ทั่วไทย / ออนไลน์" },
];

/**
 * 1:1 WeGlobal ProductStatsTable (Overview bottom card)
 * - Compact white Search input + white pill FilterDropdowns (`Category`, `Scope`)
 * - Rounded-2xl pure white `<AdminDataTable />` (`md:h-[500px] lg:h-[580px]`)
 * - `w-10 h-10 bg-gray-100 rounded-lg` thumbnail + Name + Promo + Category + Saves/Clicks/Views + Eye
 * - Centered `"50 of N  [Load More]"` footer
 */
export function AdminStatsTable({
  rows,
  selectedProvinceId,
  onClearProvince,
}: AdminStatsTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortField>("viewsCount");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);

  const toggleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"));
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows
      .filter((r) => {
        if (selectedProvinceId && r.provinceId !== selectedProvinceId) {
          return false;
        }
        if (
          selectedCategories.length > 0 &&
          !selectedCategories.includes(r.placeCategory)
        ) {
          return false;
        }
        if (
          selectedScopes.length > 0 &&
          !selectedScopes.includes(r.locationScope)
        ) {
          return false;
        }
        if (!q) return true;
        return (
          r.hotelNameTh.toLowerCase().includes(q) ||
          r.hotelSlug.toLowerCase().includes(q) ||
          (r.promoHeadlineTh || "").toLowerCase().includes(q) ||
          r.provinceNameTh.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const diff = a[sortBy] - b[sortBy];
        return sortOrder === "desc" ? -diff : diff;
      });
  }, [
    rows,
    search,
    selectedCategories,
    selectedScopes,
    selectedProvinceId,
    sortBy,
    sortOrder,
  ]);

  const visibleRows = useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount],
  );
  const hasMore = visibleRows.length < filtered.length;

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortBy !== field) {
      return <ArrowUpDown size={12} className="text-gray-300" />;
    }
    return sortOrder === "desc" ? (
      <ArrowDown size={12} className="text-[var(--color-accent)]" />
    ) : (
      <ArrowUp size={12} className="text-[var(--color-accent)]" />
    );
  };

  const columns: AdminColumn<AdminPerformanceRow>[] = useMemo(
    () => [
      {
        header: "รูป",
        accessorKey: "coverImageUrl",
        className: "w-[60px]",
        stickyLeft: true,
        cell: (item) => (
          <div className="w-10 h-10 relative bg-[var(--color-background-muted)] rounded-lg overflow-hidden shrink-0">
            {item.coverImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.coverImageUrl}
                alt={item.hotelNameTh}
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
        header: "สถานที่ / แบรนด์",
        accessorKey: "hotelNameTh",
        className: "min-w-[240px]",
        cell: (item) => (
          <span className="ws-body-medium line-clamp-2">
            {item.hotelNameTh}
          </span>
        ),
      },
      {
        header: "โปรโมชั่น",
        accessorKey: "promoHeadlineTh",
        className: "min-w-[160px] max-w-[240px]",
        cell: (item) => (
          <span className="ws-caption line-clamp-1">
            {item.promoHeadlineTh || "—"}
          </span>
        ),
      },
      {
        header: "หมวดหมู่",
        accessorKey: "placeCategory",
        className: "whitespace-nowrap",
        cell: (item) => (
          <span className="ws-caption">
            {getPlaceCategoryMeta(item.placeCategory).shortLabelTh}
          </span>
        ),
      },
      {
        header: "พื้นที่",
        accessorKey: "locationScope",
        className: "whitespace-nowrap",
        cell: (item) => (
          <span className="ws-caption">
            {formatPlaceLocationScopeLabel(
              {
                locationScope: item.locationScope,
                provinceId: item.provinceId,
                provinceNameTh: item.provinceNameTh,
                provinceNameEn: item.provinceNameTh,
              },
              "th",
            )}
          </span>
        ),
      },
      {
        header: () => (
          <button
            type="button"
            onClick={() => toggleSort("savesCount")}
            className="inline-flex items-center gap-1 hover:text-[var(--color-text-primary)] transition-colors whitespace-nowrap cursor-pointer"
          >
            บันทึก <SortIcon field="savesCount" />
          </button>
        ),
        accessorKey: "savesCount",
        className: "w-[72px] text-center whitespace-nowrap",
        cell: (item) => (
          <span className="ws-body tabular-nums">
            {item.savesCount.toLocaleString()}
          </span>
        ),
      },
      {
        header: () => (
          <button
            type="button"
            onClick={() => toggleSort("externalClickCount")}
            className="inline-flex items-center gap-1 hover:text-[var(--color-text-primary)] transition-colors whitespace-nowrap cursor-pointer"
          >
            คลิก <SortIcon field="externalClickCount" />
          </button>
        ),
        accessorKey: "externalClickCount",
        className: "w-[72px] text-center whitespace-nowrap",
        cell: (item) => (
          <span className="ws-body tabular-nums">
            {item.externalClickCount.toLocaleString()}
          </span>
        ),
      },
      {
        header: () => (
          <button
            type="button"
            onClick={() => toggleSort("viewsCount")}
            className="inline-flex items-center gap-1 hover:text-[var(--color-text-primary)] transition-colors whitespace-nowrap cursor-pointer"
          >
            เข้าชม <SortIcon field="viewsCount" />
          </button>
        ),
        accessorKey: "viewsCount",
        className: "w-[72px] text-center whitespace-nowrap",
        cell: (item) => (
          <span className="ws-body-medium tabular-nums">
            {item.viewsCount.toLocaleString()}
          </span>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sortBy, sortOrder],
  );

  return (
    <div className="space-y-3">
      {/* Single-Row Compact Toolbar (Mobile expandable search icon + horizontal filters) */}
      <WorkspaceCompactToolbar
        bordered={false}
        compactPadding
        searchValue={search}
        onSearchChange={(val) => {
          setSearch(val);
          setVisibleCount(BATCH_SIZE);
        }}
        searchPlaceholder="ค้นหาชื่อสถานที่ โปร หรือจังหวัด..."
        filters={
          <>
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

            {selectedProvinceId && (
              <button
                type="button"
                onClick={onClearProvince}
                className="h-9 inline-flex items-center gap-1.5 px-3 rounded-full ws-badge bg-[var(--color-accent-muted)] text-[var(--color-accent)] whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>จังหวัด: {selectedProvinceId}</span>
                <X size={12} />
              </button>
            )}
          </>
        }
      />

      {/* Pure White Hairline DataTable (Desktop Table / Mobile Native List Rows) */}
      <div className="md:h-[500px] lg:h-[560px]">
        <AdminDataTable
          data={visibleRows}
          columns={columns}
          keyField="id"
          onRowClick={(item) =>
            router.push(`/${encodeURIComponent(item.hotelSlug)}`)
          }
          getViewUrl={(item) => `/${encodeURIComponent(item.hotelSlug)}`}
          renderMobileRow={(item) => {
            const scopeLabel = formatPlaceLocationScopeLabel(
              {
                locationScope: item.locationScope,
                provinceId: item.provinceId,
                provinceNameTh: item.provinceNameTh,
                provinceNameEn: item.provinceNameTh,
              },
              "th",
            );
            return (
              <div className="py-3.5 flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-[14px] overflow-hidden bg-[var(--color-background-muted)] flex items-center justify-center shrink-0">
                  {item.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.coverImageUrl}
                      alt={item.hotelNameTh}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="ws-badge text-[var(--color-text-secondary)]">
                      —
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="ws-subtitle truncate">{item.hotelNameTh}</p>
                    <span className="px-2 py-0.5 rounded-full bg-[var(--color-background-muted)] ws-badge text-[var(--color-text-secondary)] shrink-0">
                      {getPlaceCategoryMeta(item.placeCategory).shortLabelTh}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 min-w-0">
                    {item.promoHeadlineTh && (
                      <span className="ws-caption-medium !text-[var(--color-accent)] truncate">
                        {item.promoHeadlineTh}
                      </span>
                    )}
                    {item.promoHeadlineTh && scopeLabel && (
                      <span className="ws-caption shrink-0">·</span>
                    )}
                    {scopeLabel && (
                      <span className="ws-caption shrink-0">{scopeLabel}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 ws-caption tabular-nums">
                    <span className="inline-flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" />
                      {item.viewsCount.toLocaleString()}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Heart className="w-3.5 h-3.5" />
                      {item.savesCount.toLocaleString()}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MousePointerClick className="w-3.5 h-3.5" />
                      {item.externalClickCount.toLocaleString()}
                    </span>
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 text-[var(--color-text-secondary)] shrink-0" />
              </div>
            );
          }}
          emptyLabel="ไม่พบรายการที่ตรงกับตัวกรอง"
          footer={
            <div className="border-t border-[var(--color-border)] py-3 flex items-center justify-center gap-3 text-xs text-[var(--color-text-secondary)] shrink-0">
              <span>
                แสดง {visibleRows.length} จาก {filtered.length} รายการ
              </span>
              {hasMore && (
                <button
                  type="button"
                  onClick={() => setVisibleCount((c) => c + BATCH_SIZE)}
                  className="px-4 py-1.5 bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] rounded-full font-semibold text-[var(--color-text-primary)] transition-colors cursor-pointer"
                >
                  โหลดเพิ่ม (
                  {Math.min(BATCH_SIZE, filtered.length - visibleRows.length)})
                </button>
              )}
            </div>
          }
        />
      </div>
    </div>
  );
}
