"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ExternalLink,
  Search,
  X,
} from "lucide-react";
import { AdminTableFooter } from "@/components/admin/AdminTableFooter";
import {
  formatPlaceLocationScopeLabel,
  formatPromoDateRangeLabel,
  getPlaceCategoryMeta,
} from "@/lib/placeCategories";
import type { AdminPerformanceRow } from "@/lib/services/adminDashboardService";

interface AdminStatsTableProps {
  rows: AdminPerformanceRow[];
  selectedProvinceId: string | null;
  onClearProvince: () => void;
}

type SortField = "viewsCount" | "savesCount" | "externalClickCount";

export function AdminStatsTable({
  rows,
  selectedProvinceId,
  onClearProvince,
}: AdminStatsTableProps) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [scopeFilter, setScopeFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<SortField>("viewsCount");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const toggleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"));
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
    setPage(1);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows
      .filter((r) => {
        if (selectedProvinceId && r.provinceId !== selectedProvinceId) {
          return false;
        }
        if (categoryFilter !== "ALL" && r.placeCategory !== categoryFilter) {
          return false;
        }
        if (scopeFilter !== "ALL" && r.locationScope !== scopeFilter) {
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
  }, [rows, search, categoryFilter, scopeFilter, selectedProvinceId, sortBy, sortOrder]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortBy !== field) {
      return <ArrowUpDown className="w-3 h-3 text-[var(--color-text-tertiary)]" />;
    }
    return sortOrder === "desc" ? (
      <ArrowDown className="w-3 h-3 text-[var(--color-accent)]" />
    ) : (
      <ArrowUp className="w-3 h-3 text-[var(--color-accent)]" />
    );
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-[var(--color-background-body)]">
      {/* Compact Inline Filter Strip (border-b, zero outer cards) */}
      <div className="px-4 py-1.5 border-b border-[var(--color-border)] flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex flex-wrap items-center gap-1">
          {[
            { id: "ALL", label: "ทุกหมวด" },
            { id: "STAY", label: "ที่พัก" },
            { id: "CAFE", label: "คาเฟ่" },
            { id: "RESTAURANT", label: "อาหาร & บาร์" },
            { id: "WELLNESS", label: "สปา" },
            { id: "ATTRACTION", label: "กิจกรรม" },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setCategoryFilter(cat.id);
                setPage(1);
              }}
              className={`h-7 px-2.5 rounded-full text-[12px] font-semibold cursor-pointer transition-colors ${
                categoryFilter === cat.id
                  ? "bg-[var(--color-accent)] !text-[var(--color-on-accent)]"
                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-background-muted)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              {cat.label}
            </button>
          ))}

          <span className="hidden sm:inline-block w-px h-4 bg-[var(--color-border)] mx-1" />

          {[
            { id: "ALL", label: "ทุกพื้นที่" },
            { id: "SINGLE_LOCATION", label: "ร้านเดี่ยว" },
            { id: "MULTI_BRANCH", label: "หลายสาขา" },
            { id: "NATIONWIDE_ONLINE", label: "ทั่วไทย/ออนไลน์" },
          ].map((sc) => (
            <button
              key={sc.id}
              type="button"
              onClick={() => {
                setScopeFilter(sc.id);
                setPage(1);
              }}
              className={`h-7 px-2.5 rounded-full text-[11.5px] font-semibold cursor-pointer transition-colors ${
                scopeFilter === sc.id
                  ? "bg-[var(--color-text-primary)] text-[var(--color-background-body)]"
                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-background-muted)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              {sc.label}
            </button>
          ))}

          {selectedProvinceId && (
            <button
              type="button"
              onClick={onClearProvince}
              className="h-7 px-2.5 rounded-full bg-[var(--color-accent)] !text-[var(--color-on-accent)] text-[11.5px] font-semibold inline-flex items-center gap-1 cursor-pointer ml-1"
            >
              <span>จังหวัด: {selectedProvinceId}</span>
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="relative w-full sm:w-[220px]">
          <Search className="w-3.5 h-3.5 text-[var(--color-text-tertiary)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="กรองชื่อร้าน, โปร, จังหวัด..."
            className="w-full h-7.5 rounded-full bg-[var(--color-background-muted)] pl-8 pr-3 text-[12.5px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
          />
        </div>
      </div>

      {/* Full-Bleed Scrollable Single-Row Table (Zero Images, Pure border-b) */}
      <div className="flex-1 min-h-0 overflow-auto">
        <table className="w-full text-left border-collapse min-w-[820px]">
          <thead className="sticky top-0 z-10 bg-[var(--color-background-body)]">
            <tr className="h-[34px] border-b border-[var(--color-border)] text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--color-text-secondary)]">
              <th className="px-4 w-[24%]">สถานที่ / แบรนด์</th>
              <th className="px-3 w-[24%]">โปรโมชั่น</th>
              <th className="px-3 whitespace-nowrap">หมวด</th>
              <th className="px-3 whitespace-nowrap">พื้นที่</th>
              <th className="px-3 whitespace-nowrap">อายุโปร</th>
              <th className="px-3 text-right whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => toggleSort("viewsCount")}
                  className="inline-flex items-center gap-1 cursor-pointer hover:text-[var(--color-text-primary)]"
                >
                  <span>วิว</span>
                  <SortIcon field="viewsCount" />
                </button>
              </th>
              <th className="px-3 text-right whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => toggleSort("savesCount")}
                  className="inline-flex items-center gap-1 cursor-pointer hover:text-[var(--color-text-primary)]"
                >
                  <span>บันทึก</span>
                  <SortIcon field="savesCount" />
                </button>
              </th>
              <th className="px-3 text-right whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => toggleSort("externalClickCount")}
                  className="inline-flex items-center gap-1 cursor-pointer hover:text-[var(--color-text-primary)]"
                >
                  <span>คลิก</span>
                  <SortIcon field="externalClickCount" />
                </button>
              </th>
              <th className="px-4 text-right whitespace-nowrap">ดู</th>
            </tr>
          </thead>
          <tbody>
            {pagedRows.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="py-10 text-center text-[13px] text-[var(--color-text-secondary)] border-b border-[var(--color-border)]"
                >
                  ไม่พบรายการที่ตรงกับตัวกรอง
                </td>
              </tr>
            ) : (
              pagedRows.map((row) => {
                const cat = getPlaceCategoryMeta(row.placeCategory);
                const scopeLabel = formatPlaceLocationScopeLabel(
                  {
                    locationScope: row.locationScope,
                    provinceId: row.provinceId,
                    provinceNameTh: row.provinceNameTh,
                    provinceNameEn: row.provinceNameTh,
                  },
                  "th"
                );
                const dateInfo = formatPromoDateRangeLabel(
                  null,
                  row.promoExpiresAt,
                  "th"
                );

                return (
                  <tr
                    key={row.id}
                    className="h-[38px] border-b border-[var(--color-border)] hover:bg-[var(--color-background-muted)]/60 transition-colors text-[13px]"
                  >
                    <td className="px-4 font-semibold text-[var(--color-text-primary)] max-w-[240px] truncate">
                      <Link
                        href={`/${encodeURIComponent(row.hotelSlug)}`}
                        target="_blank"
                        className="hover:text-[var(--color-accent)] transition-colors"
                      >
                        {row.hotelNameTh}
                      </Link>
                    </td>
                    <td className="px-3 text-[var(--color-text-secondary)] max-w-[240px] truncate">
                      {row.promoHeadlineTh ? (
                        <span className="font-medium text-[var(--color-accent)]">
                          {row.promoHeadlineTh}
                        </span>
                      ) : (
                        <span className="text-[var(--color-text-tertiary)]">—</span>
                      )}
                    </td>
                    <td className="px-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--color-text-primary)]">
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: cat.crestBgHex }}
                        />
                        <span>{cat.shortLabelTh}</span>
                      </span>
                    </td>
                    <td className="px-3 whitespace-nowrap text-[12px] text-[var(--color-text-secondary)] max-w-[140px] truncate">
                      {scopeLabel}
                    </td>
                    <td className="px-3 whitespace-nowrap text-[12px] tabular-nums">
                      {dateInfo ? (
                        <span
                          className={
                            dateInfo.isExpired
                              ? "text-[#e60023] font-semibold"
                              : dateInfo.isExpiringSoon
                              ? "text-[var(--color-accent)] font-semibold"
                              : "text-[var(--color-text-secondary)]"
                          }
                        >
                          {dateInfo.label}
                        </span>
                      ) : (
                        <span className="text-[var(--color-text-tertiary)]">—</span>
                      )}
                    </td>
                    <td className="px-3 text-right tabular-nums text-[12.5px] font-medium text-[var(--color-text-primary)]">
                      {row.viewsCount.toLocaleString()}
                    </td>
                    <td className="px-3 text-right tabular-nums text-[12.5px] text-[var(--color-text-secondary)]">
                      {row.savesCount.toLocaleString()}
                    </td>
                    <td className="px-3 text-right tabular-nums text-[12.5px] text-[var(--color-text-secondary)]">
                      {row.externalClickCount.toLocaleString()}
                    </td>
                    <td className="px-4 text-right whitespace-nowrap">
                      <Link
                        href={`/${encodeURIComponent(row.hotelSlug)}`}
                        target="_blank"
                        title="เปิดหน้าโปรไฟล์"
                        className="h-6.5 w-6.5 rounded-full hover:bg-[var(--color-background-muted)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] inline-flex items-center justify-center transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Sticky Compact Pagination Bar */}
      <AdminTableFooter
        totalItems={filtered.length}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
}
