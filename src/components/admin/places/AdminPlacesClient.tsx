"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { useSearchParams } from "next/navigation";
import {
  Ban,
  Check,
  ExternalLink,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import {
  StandardButton,
  StandardFieldGroup,
  StandardInput,
  StandardSelectField,
} from "@/components/ui/standards";
import { ResponsiveSelect } from "@/components/ui/ResponsiveSelect";
import { AdminTableFooter } from "@/components/admin/AdminTableFooter";
import { useModalPresence } from "@/lib/useModalPresence";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";
import {
  formatPlaceLocationScopeLabel,
  getPlaceCategoryMeta,
} from "@/lib/placeCategories";
import {
  getProvinceById,
  THAILAND_77_PROVINCES,
} from "@/data/thailandProvinces";

interface AdminPlaceRow {
  id: string;
  slug: string;
  nameTh: string;
  nameEn: string;
  provinceId: string;
  placeCategory: "STAY" | "CAFE" | "RESTAURANT" | "ATTRACTION" | "WELLNESS";
  locationScope: "SINGLE_LOCATION" | "MULTI_BRANCH" | "NATIONWIDE_ONLINE";
  branchSummaryTh: string;
  verificationStatus: "PENDING_REVIEW" | "VERIFIED" | "SUSPENDED";
  isPublished: boolean;
  owner: { name: string; email: string } | null;
  _count: {
    rooms: number;
    pins: number;
    coupons: number;
    bookings: number;
    branches: number;
  };
}

type PlaceFilter =
  | "ALL"
  | "SINGLE_LOCATION"
  | "MULTI_BRANCH"
  | "NATIONWIDE_ONLINE"
  | "PENDING_REVIEW";

const SCOPE_SELECT_OPTIONS = [
  { value: "SINGLE_LOCATION", label: "ร้านเดี่ยว" },
  { value: "MULTI_BRANCH", label: "หลายสาขา" },
  { value: "NATIONWIDE_ONLINE", label: "ทั่วไทย/ออนไลน์" },
];

const CATEGORY_OPTIONS = [
  { value: "STAY", label: "ที่พัก & โรงแรม" },
  { value: "CAFE", label: "คาเฟ่" },
  { value: "RESTAURANT", label: "ร้านอาหาร & บาร์" },
  { value: "WELLNESS", label: "สปา & เวลเนส" },
  { value: "ATTRACTION", label: "กิจกรรม & ที่เที่ยว" },
];

export function AdminPlacesClient() {
  const searchParams = useSearchParams();
  const initialFilter: PlaceFilter =
    searchParams.get("status") === "PENDING_REVIEW" ? "PENDING_REVIEW" : "ALL";

  const [places, setPlaces] = useState<AdminPlaceRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<PlaceFilter>(initialFilter);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Create Brand / Place Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newNameTh, setNewNameTh] = useState("");
  const [newNameEn, setNewNameEn] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newCategory, setNewCategory] = useState<
    "STAY" | "CAFE" | "RESTAURANT" | "ATTRACTION" | "WELLNESS"
  >("CAFE");
  const [newScope, setNewScope] = useState<
    "SINGLE_LOCATION" | "MULTI_BRANCH" | "NATIONWIDE_ONLINE"
  >("MULTI_BRANCH");
  const [newProvinceId, setNewProvinceId] = useState("nationwide");
  const [newBranchSummary, setNewBranchSummary] = useState("");
  const [newTagline, setNewTagline] = useState("");
  const [newWebsiteUrl, setNewWebsiteUrl] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const { shouldRender: renderCreate, dataState: createState } =
    useModalPresence(isCreateOpen, 250);
  useBodyScrollLock(renderCreate);

  const showToast = (msg: string) => {
    setNotice(msg);
    window.setTimeout(() => {
      setNotice((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  const loadPlaces = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/super-admin/hotels", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "โหลดรายการไม่สำเร็จ");
      setPlaces(json.hotels ?? []);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "โหลดรายการไม่สำเร็จ");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlaces();
  }, [loadPlaces]);

  const provinceOptions = useMemo(
    () => [
      { value: "nationwide", label: "ทั่วประเทศ / ออนไลน์" },
      ...THAILAND_77_PROVINCES.map((p) => ({
        value: p.id,
        label: p.nameTh.split("(")[0].trim(),
        sublabel: p.nameEn,
      })),
    ],
    []
  );

  const counts = useMemo(
    () => ({
      ALL: places.length,
      SINGLE_LOCATION: places.filter((p) => p.locationScope === "SINGLE_LOCATION")
        .length,
      MULTI_BRANCH: places.filter((p) => p.locationScope === "MULTI_BRANCH")
        .length,
      NATIONWIDE_ONLINE: places.filter(
        (p) => p.locationScope === "NATIONWIDE_ONLINE"
      ).length,
      PENDING_REVIEW: places.filter(
        (p) => p.verificationStatus === "PENDING_REVIEW"
      ).length,
    }),
    [places]
  );

  const filteredPlaces = useMemo(() => {
    const q = query.trim().toLowerCase();
    return places.filter((p) => {
      if (filter === "PENDING_REVIEW" && p.verificationStatus !== "PENDING_REVIEW") {
        return false;
      }
      if (
        (filter === "SINGLE_LOCATION" ||
          filter === "MULTI_BRANCH" ||
          filter === "NATIONWIDE_ONLINE") &&
        p.locationScope !== filter
      ) {
        return false;
      }
      if (!q) return true;
      return `${p.nameTh} ${p.nameEn} ${p.slug} ${p.provinceId} ${p.owner?.email || ""}`
        .toLowerCase()
        .includes(q);
    });
  }, [places, filter, query]);

  const pagedPlaces = useMemo(
    () => filteredPlaces.slice((page - 1) * pageSize, page * pageSize),
    [filteredPlaces, page, pageSize]
  );

  const patchPlace = async (
    hotelId: string,
    payload: {
      verificationStatus?: "PENDING_REVIEW" | "VERIFIED" | "SUSPENDED";
      isPublished?: boolean;
      locationScope?: "SINGLE_LOCATION" | "MULTI_BRANCH" | "NATIONWIDE_ONLINE";
    },
    successMsg: string
  ) => {
    setBusyId(hotelId);
    try {
      const res = await fetch("/api/super-admin/hotels", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hotelId, ...payload }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "อัปเดตไม่สำเร็จ");
      showToast(successMsg);
      await loadPlaces();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "อัปเดตไม่สำเร็จ");
    } finally {
      setBusyId(null);
    }
  };

  const handleCreatePlace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNameTh.trim() || !newSlug.trim()) {
      showToast("กรุณากรอกชื่อแบรนด์/สถานที่ และ URL slug");
      return;
    }
    setIsCreating(true);
    try {
      const res = await fetch("/api/super-admin/hotels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nameTh: newNameTh.trim(),
          nameEn: newNameEn.trim(),
          slug: newSlug.trim(),
          placeCategory: newCategory,
          locationScope: newScope,
          provinceId:
            newScope === "NATIONWIDE_ONLINE" ? "nationwide" : newProvinceId,
          branchSummaryTh: newBranchSummary.trim(),
          taglineTh: newTagline.trim(),
          externalWebsiteUrl: newWebsiteUrl.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "สร้างแบรนด์ไม่สำเร็จ");
      setIsCreateOpen(false);
      setNewNameTh("");
      setNewNameEn("");
      setNewSlug("");
      setNewBranchSummary("");
      setNewTagline("");
      setNewWebsiteUrl("");
      showToast(`เพิ่ม "${newNameTh.trim()}" (/${json.hotel?.slug}) แล้ว`);
      await loadPlaces();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "สร้างแบรนด์ไม่สำเร็จ");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="cgr-admin-page">
      {/* Single Compact Toolbar */}
      <div className="cgr-admin-toolbar">
        <div className="flex items-center gap-2.5 min-w-0 overflow-x-auto no-scrollbar">
          <h1 className="text-[14.5px] font-bold text-[var(--color-text-primary)] whitespace-nowrap">
            สถานที่ &amp; แบรนด์
          </h1>
          <span className="w-px h-4 bg-[var(--color-border)] shrink-0" />
          <div className="flex items-center gap-1">
            {(
              [
                { id: "ALL", label: "ทั้งหมด" },
                { id: "SINGLE_LOCATION", label: "ร้านเดี่ยว" },
                { id: "MULTI_BRANCH", label: "หลายสาขา" },
                { id: "NATIONWIDE_ONLINE", label: "ทั่วไทย" },
                { id: "PENDING_REVIEW", label: "รอตรวจ" },
              ] as const
            ).map((pill) => {
              const active = filter === pill.id;
              return (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => {
                    setFilter(pill.id);
                    setPage(1);
                  }}
                  className={`h-7 px-2.5 rounded-full text-[12px] font-semibold inline-flex items-center gap-1 whitespace-nowrap cursor-pointer transition-colors ${
                    active
                      ? "bg-[var(--color-accent)] !text-[var(--color-on-accent)]"
                      : "text-[var(--color-text-secondary)] hover:bg-[var(--color-background-muted)] hover:text-[var(--color-text-primary)]"
                  }`}
                >
                  <span>{pill.label}</span>
                  <span
                    className={`text-[11px] tabular-nums ${
                      active
                        ? "opacity-90"
                        : pill.id === "PENDING_REVIEW" && counts[pill.id] > 0
                        ? "text-[#e60023] font-bold"
                        : "text-[var(--color-text-tertiary)]"
                    }`}
                  >
                    {counts[pill.id]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="relative w-[190px] sm:w-[220px]">
            <Search className="w-3.5 h-3.5 text-[var(--color-text-tertiary)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="ค้นหาชื่อร้าน, slug, อีเมล..."
              className="w-full h-7.5 pl-8 pr-3 rounded-full bg-[var(--color-background-muted)] text-[12.5px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
            />
          </div>

          <button
            type="button"
            onClick={loadPlaces}
            aria-label="รีเฟรช"
            className="h-7.5 w-7.5 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] inline-flex items-center justify-center cursor-pointer transition-colors shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>

          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="h-7.5 px-3 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] text-[12px] font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>เพิ่มแบรนด์</span>
          </button>
        </div>
      </div>

      {notice && (
        <div className="px-4 py-1.5 border-b border-[var(--color-border)] bg-[var(--color-background-muted)] flex items-center justify-between gap-2 text-[12.5px] font-medium text-[var(--color-text-primary)] shrink-0">
          <span className="truncate">{notice}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label="ปิด"
            className="h-5 w-5 rounded-full hover:bg-[var(--color-background-subtle)] inline-flex items-center justify-center cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Full-Bleed Single-Row Table (Zero Images, Pure border-b) */}
      <div className="cgr-admin-body">
        <table className="w-full text-left border-collapse min-w-[960px]">
          <thead className="sticky top-0 z-10 bg-[var(--color-background-body)]">
            <tr className="h-[34px] border-b border-[var(--color-border)] text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--color-text-secondary)]">
              <th className="px-4 w-[24%]">ชื่อสถานที่ / แบรนด์</th>
              <th className="px-3 whitespace-nowrap">Slug</th>
              <th className="px-3 whitespace-nowrap">หมวด</th>
              <th className="px-3 whitespace-nowrap">พื้นที่</th>
              <th className="px-3 whitespace-nowrap">Scope</th>
              <th className="px-3 text-right whitespace-nowrap">โปร / คูปอง / ห้อง</th>
              <th className="px-3 whitespace-nowrap">สถานะ</th>
              <th className="px-4 text-right whitespace-nowrap">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-[13px] text-[var(--color-text-secondary)]">
                  กำลังโหลดข้อมูล...
                </td>
              </tr>
            ) : pagedPlaces.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-[13px] text-[var(--color-text-secondary)] border-b border-[var(--color-border)]">
                  ไม่พบสถานที่หรือแบรนด์ในตัวกรองนี้
                </td>
              </tr>
            ) : (
              pagedPlaces.map((place) => {
                const cat = getPlaceCategoryMeta(place.placeCategory);
                const prov = getProvinceById(place.provinceId);
                const scopeText = formatPlaceLocationScopeLabel(
                  {
                    locationScope: place.locationScope,
                    branchSummaryTh: place.branchSummaryTh,
                    provinceId: place.provinceId,
                    provinceNameTh: prov
                      ? prov.nameTh.split("(")[0].trim()
                      : place.provinceId,
                    provinceNameEn: prov ? prov.nameEn : place.provinceId,
                  },
                  "th"
                );
                const isBusy = busyId === place.id;

                return (
                  <tr
                    key={place.id}
                    className="h-[38px] border-b border-[var(--color-border)] hover:bg-[var(--color-background-muted)]/60 transition-colors text-[13px]"
                  >
                    <td className="px-4 font-semibold text-[var(--color-text-primary)] max-w-[240px] truncate">
                      <Link
                        href={`/${place.slug}`}
                        target="_blank"
                        className="hover:text-[var(--color-accent)] transition-colors"
                      >
                        {place.nameTh}
                      </Link>
                    </td>
                    <td className="px-3 text-[12px] text-[var(--color-text-secondary)] max-w-[160px] truncate font-mono">
                      /{place.slug}
                    </td>
                    <td className="px-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 text-[12px] font-medium">
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: cat.crestBgHex }}
                        />
                        <span>{cat.shortLabelTh}</span>
                      </span>
                    </td>
                    <td className="px-3 whitespace-nowrap text-[12px] text-[var(--color-text-secondary)] max-w-[130px] truncate">
                      {scopeText}
                    </td>
                    <td className="px-3 whitespace-nowrap">
                      <div className="w-[126px]">
                        <ResponsiveSelect
                          value={place.locationScope}
                          onChange={(nextScopeVal) =>
                            patchPlace(
                              place.id,
                              {
                                locationScope: nextScopeVal as
                                  | "SINGLE_LOCATION"
                                  | "MULTI_BRANCH"
                                  | "NATIONWIDE_ONLINE",
                              },
                              `อัปเดต Scope "${place.nameTh}" แล้ว`
                            )
                          }
                          options={SCOPE_SELECT_OPTIONS}
                          sheetTitle={`ขอบเขตพื้นที่: ${place.nameTh}`}
                          triggerClassName="w-full h-6.5 px-2.5 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[11.5px] font-semibold text-[var(--color-text-primary)]"
                          dropdownClassName="min-w-[180px] right-0"
                        />
                      </div>
                    </td>
                    <td className="px-3 text-right whitespace-nowrap text-[12px] tabular-nums text-[var(--color-text-secondary)]">
                      {place._count.pins} · {place._count.coupons} · {place._count.rooms}
                    </td>
                    <td className="px-3 whitespace-nowrap text-[12px]">
                      <span className="inline-flex items-center gap-1.5 font-medium">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            place.verificationStatus === "VERIFIED"
                              ? "bg-emerald-500"
                              : place.verificationStatus === "PENDING_REVIEW"
                              ? "bg-amber-500"
                              : "bg-[#e60023]"
                          }`}
                        />
                        <span>
                          {place.verificationStatus === "VERIFIED"
                            ? "Verified"
                            : place.verificationStatus === "PENDING_REVIEW"
                            ? "รอตรวจ"
                            : "ระงับ"}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <Link
                          href={`/studio?hotelId=${place.id}`}
                          className="h-6.5 px-2.5 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[11.5px] font-semibold inline-flex items-center transition-colors"
                        >
                          Studio
                        </Link>
                        {place.verificationStatus !== "VERIFIED" ? (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() =>
                              patchPlace(
                                place.id,
                                { verificationStatus: "VERIFIED", isPublished: true },
                                `อนุมัติ "${place.nameTh}" แล้ว`
                              )
                            }
                            className="h-6.5 px-2.5 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] text-[11.5px] font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Check className="w-3 h-3" />
                            <span>อนุมัติ</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() =>
                              patchPlace(
                                place.id,
                                { verificationStatus: "SUSPENDED", isPublished: false },
                                `ระงับ "${place.nameTh}" แล้ว`
                              )
                            }
                            title="ระงับชั่วคราว"
                            className="h-6.5 px-2.5 rounded-full hover:bg-[var(--color-background-muted)] text-[var(--color-text-secondary)] hover:text-[#e60023] text-[11.5px] font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Ban className="w-3 h-3" />
                            <span>ระงับ</span>
                          </button>
                        )}
                        <Link
                          href={`/${place.slug}`}
                          target="_blank"
                          title="เปิดหน้าโปรไฟล์"
                          className="h-6.5 w-6.5 rounded-full hover:bg-[var(--color-background-muted)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] inline-flex items-center justify-center transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <AdminTableFooter
        totalItems={filteredPlaces.length}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />

      {/* Create New Brand / Chain / Place Sheet */}
      {renderCreate &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="เพิ่มแบรนด์ / เชน / สถานที่ใหม่"
            data-state={createState}
            onClick={() => setIsCreateOpen(false)}
            className="cgr-modal-backdrop fixed inset-0 z-[95] bg-black/45 backdrop-blur-[2px] flex items-end sm:items-center justify-center sm:p-4"
          >
            <form
              data-state={createState}
              onClick={(e) => e.stopPropagation()}
              onSubmit={handleCreatePlace}
              className="cgr-modal-surface-md w-full sm:max-w-[540px] max-h-[90dvh] rounded-t-[24px] sm:rounded-[24px] bg-[var(--color-background-popover)] shadow-[var(--shadow-popover)] flex flex-col overflow-hidden"
            >
              <div
                aria-hidden="true"
                className="sm:hidden h-1 w-10 rounded-full bg-[var(--color-border-emphasized)] mx-auto mt-3 shrink-0"
              />
              <div className="px-5 py-3.5 border-b border-[var(--color-border)] flex items-center justify-between shrink-0">
                <h3 className="text-[15.5px] font-bold text-[var(--color-text-primary)]">
                  เพิ่มแบรนด์ / เชน / สถานที่ใหม่
                </h3>
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  aria-label="ปิด"
                  className="h-8 w-8 rounded-full bg-[var(--color-background-muted)] inline-flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-3.5">
                <StandardFieldGroup>
                  <StandardInput
                    grouped
                    required
                    label="ชื่อแบรนด์ / ร้าน (ภาษาไทย)"
                    value={newNameTh}
                    onChange={(e) => setNewNameTh(e.target.value)}
                    placeholder="เช่น บัตรเครดิต KTC, KFC ประเทศไทย, Café Amazon"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x divide-y sm:divide-y-0 divide-[#b0b0b0] dark:divide-[var(--color-border-emphasized)]">
                    <StandardInput
                      grouped
                      label="ชื่อภาษาอังกฤษ"
                      value={newNameEn}
                      onChange={(e) => setNewNameEn(e.target.value)}
                      placeholder="เช่น KTC Travel"
                    />
                    <StandardInput
                      grouped
                      required
                      label="URL Slug"
                      value={newSlug}
                      onChange={(e) =>
                        setNewSlug(
                          e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-")
                        )
                      }
                      placeholder="เช่น ktc-travel"
                    />
                  </div>
                </StandardFieldGroup>

                <StandardFieldGroup>
                  <div className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x divide-y sm:divide-y-0 divide-[#b0b0b0] dark:divide-[var(--color-border-emphasized)]">
                    <StandardSelectField
                      grouped
                      label="หมวดหลัก"
                      value={newCategory}
                      onChange={(v) =>
                        setNewCategory(
                          v as "STAY" | "CAFE" | "RESTAURANT" | "ATTRACTION" | "WELLNESS"
                        )
                      }
                      options={CATEGORY_OPTIONS}
                    />
                    <StandardSelectField
                      grouped
                      label="ขอบเขตพื้นที่ (LocationScope)"
                      value={newScope}
                      onChange={(v) => {
                        const next = v as
                          | "SINGLE_LOCATION"
                          | "MULTI_BRANCH"
                          | "NATIONWIDE_ONLINE";
                        setNewScope(next);
                        if (next === "NATIONWIDE_ONLINE") {
                          setNewProvinceId("nationwide");
                        }
                      }}
                      options={SCOPE_SELECT_OPTIONS}
                    />
                  </div>

                  {newScope !== "NATIONWIDE_ONLINE" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x divide-y sm:divide-y-0 divide-[#b0b0b0] dark:divide-[var(--color-border-emphasized)]">
                      <StandardSelectField
                        grouped
                        label="จังหวัดหลัก"
                        value={newProvinceId}
                        onChange={setNewProvinceId}
                        options={provinceOptions}
                        searchPlaceholder="ค้นหาจังหวัด..."
                      />
                      <StandardInput
                        grouped
                        label="สรุปสาขา"
                        value={newBranchSummary}
                        onChange={(e) => setNewBranchSummary(e.target.value)}
                        placeholder="เช่น กว่า 400 สาขาทั่วไทย"
                      />
                    </div>
                  )}
                </StandardFieldGroup>

                <StandardFieldGroup>
                  <StandardInput
                    grouped
                    label="คำโปรยสั้นๆ"
                    value={newTagline}
                    onChange={(e) => setNewTagline(e.target.value)}
                    placeholder="เช่น รวมดีลที่พักและร้านอาหาร"
                  />
                  <StandardInput
                    grouped
                    label="เว็บไซต์ทางการ / ลิงก์พาร์ทเนอร์"
                    value={newWebsiteUrl}
                    onChange={(e) => setNewWebsiteUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </StandardFieldGroup>
              </div>

              <div className="px-5 py-3.5 border-t border-[var(--color-border)] flex items-center justify-end gap-2 shrink-0 pb-[max(14px,env(safe-area-inset-bottom))]">
                <StandardButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsCreateOpen(false)}
                >
                  ยกเลิก
                </StandardButton>
                <StandardButton
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isCreating}
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>กำลังสร้าง...</span>
                    </>
                  ) : (
                    <span>สร้างแบรนด์ทันที</span>
                  )}
                </StandardButton>
              </div>
            </form>
          </div>,
          document.body
        )}
    </div>
  );
}
