"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Ban,
  Check,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  X,
} from "lucide-react";
import {
  AdminDataTable,
  type AdminColumn,
} from "@/components/admin/ui/AdminDataTable";
import { AdminFilterDropdown } from "@/components/admin/ui/AdminFilterDropdown";
import { AdminSlideSheet } from "@/components/admin/ui/AdminSlideSheet";
import {
  StandardCheckbox,
  StandardFieldGroup,
  StandardInput,
  StandardSelectField,
} from "@/components/ui/standards";
import { WorkspaceCompactToolbar } from "@/components/workspace/WorkspacePrimitives";
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
  coverImageUrl: string | null;
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

const BATCH_SIZE = 50;

const CATEGORY_OPTIONS = [
  { value: "STAY", label: "ที่พัก & โรงแรม" },
  { value: "CAFE", label: "คาเฟ่" },
  { value: "RESTAURANT", label: "ร้านอาหาร & บาร์" },
  { value: "WELLNESS", label: "สปา & เวลเนส" },
  { value: "ATTRACTION", label: "กิจกรรม & ที่เที่ยว" },
];

const SCOPE_OPTIONS = [
  { value: "SINGLE_LOCATION", label: "ร้านเดี่ยว" },
  { value: "MULTI_BRANCH", label: "หลายสาขา" },
  { value: "NATIONWIDE_ONLINE", label: "ทั่วไทย / ออนไลน์" },
];

const STATUS_OPTIONS = [
  { value: "VERIFIED", label: "ยืนยันแล้ว" },
  { value: "PENDING_REVIEW", label: "รอตรวจสอบ" },
  { value: "SUSPENDED", label: "ระงับชั่วคราว" },
];

/**
 * 1:1 WeGlobal Products-Style Table + Right Slide-Over Sheet for `/admin/places`
 */
export function AdminPlacesClient() {
  const searchParams = useSearchParams();
  const initialStatus =
    searchParams.get("status") === "PENDING_REVIEW" ? ["PENDING_REVIEW"] : [];

  const [places, setPlaces] = useState<AdminPlaceRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] =
    useState<string[]>(initialStatus);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Slide-over Sheet State (Edit existing OR Create new)
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingPlace, setEditingPlace] = useState<AdminPlaceRow | null>(null);

  // Form fields
  const [nameTh, setNameTh] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [slug, setSlug] = useState("");
  const [category, setCategory] = useState<
    "STAY" | "CAFE" | "RESTAURANT" | "ATTRACTION" | "WELLNESS"
  >("CAFE");
  const [scope, setScope] = useState<
    "SINGLE_LOCATION" | "MULTI_BRANCH" | "NATIONWIDE_ONLINE"
  >("MULTI_BRANCH");
  const [provinceId, setProvinceId] = useState("nationwide");
  const [branchSummary, setBranchSummary] = useState("");
  const [tagline, setTagline] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [verificationStatus, setVerificationStatus] = useState<
    "PENDING_REVIEW" | "VERIFIED" | "SUSPENDED"
  >("VERIFIED");
  const [isPublished, setIsPublished] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

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
    [],
  );

  const openCreate = () => {
    setEditingPlace(null);
    setNameTh("");
    setNameEn("");
    setSlug("");
    setCategory("CAFE");
    setScope("MULTI_BRANCH");
    setProvinceId("nationwide");
    setBranchSummary("");
    setTagline("");
    setWebsiteUrl("");
    setVerificationStatus("VERIFIED");
    setIsPublished(true);
    setIsSheetOpen(true);
  };

  const openEdit = (place: AdminPlaceRow) => {
    setEditingPlace(place);
    setNameTh(place.nameTh);
    setNameEn(place.nameEn || "");
    setSlug(place.slug);
    setCategory(place.placeCategory);
    setScope(place.locationScope);
    setProvinceId(place.provinceId || "nationwide");
    setBranchSummary(place.branchSummaryTh || "");
    setVerificationStatus(place.verificationStatus);
    setIsPublished(place.isPublished);
    setIsSheetOpen(true);
  };

  const handleSaveSheet = async () => {
    if (editingPlace) {
      setIsSaving(true);
      try {
        const res = await fetch("/api/super-admin/hotels", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            hotelId: editingPlace.id,
            verificationStatus,
            isPublished,
            locationScope: scope,
            placeCategory: category,
            branchSummaryTh: branchSummary.trim(),
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "อัปเดตไม่สำเร็จ");
        showToast(`บันทึก "${editingPlace.nameTh}" แล้ว`);
        setIsSheetOpen(false);
        await loadPlaces();
      } catch (err) {
        showToast(err instanceof Error ? err.message : "อัปเดตไม่สำเร็จ");
      } finally {
        setIsSaving(false);
      }
      return;
    }

    if (!nameTh.trim() || !slug.trim()) {
      showToast("กรุณากรอกชื่อแบรนด์/สถานที่ และ URL slug");
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch("/api/super-admin/hotels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nameTh: nameTh.trim(),
          nameEn: nameEn.trim(),
          slug: slug.trim(),
          placeCategory: category,
          locationScope: scope,
          provinceId:
            scope === "NATIONWIDE_ONLINE" ? "nationwide" : provinceId,
          branchSummaryTh: branchSummary.trim(),
          taglineTh: tagline.trim(),
          externalWebsiteUrl: websiteUrl.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "สร้างแบรนด์ไม่สำเร็จ");
      showToast(`เพิ่ม "${nameTh.trim()}" (/${json.hotel?.slug}) แล้ว`);
      setIsSheetOpen(false);
      await loadPlaces();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "สร้างแบรนด์ไม่สำเร็จ");
    } finally {
      setIsSaving(false);
    }
  };

  const handleBulkVerify = async (nextStatus: "VERIFIED" | "SUSPENDED") => {
    if (selectedIds.length === 0) return;
    setBusyId("bulk");
    try {
      for (const hotelId of selectedIds) {
        await fetch("/api/super-admin/hotels", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            hotelId,
            verificationStatus: nextStatus,
            isPublished: nextStatus === "VERIFIED",
          }),
        });
      }
      setSelectedIds([]);
      showToast(
        nextStatus === "VERIFIED"
          ? `อนุมัติ ${selectedIds.length} รายการแล้ว`
          : `ระงับ ${selectedIds.length} รายการแล้ว`,
      );
      await loadPlaces();
    } finally {
      setBusyId(null);
    }
  };

  const filteredPlaces = useMemo(() => {
    const q = query.trim().toLowerCase();
    return places.filter((p) => {
      if (
        selectedCategories.length > 0 &&
        !selectedCategories.includes(p.placeCategory)
      ) {
        return false;
      }
      if (
        selectedScopes.length > 0 &&
        !selectedScopes.includes(p.locationScope)
      ) {
        return false;
      }
      if (
        selectedStatuses.length > 0 &&
        !selectedStatuses.includes(p.verificationStatus)
      ) {
        return false;
      }
      if (!q) return true;
      return `${p.nameTh} ${p.nameEn} ${p.slug} ${p.provinceId} ${p.owner?.email || ""}`
        .toLowerCase()
        .includes(q);
    });
  }, [places, query, selectedCategories, selectedScopes, selectedStatuses]);

  const visiblePlaces = useMemo(
    () => filteredPlaces.slice(0, visibleCount),
    [filteredPlaces, visibleCount],
  );
  const hasMore = visiblePlaces.length < filteredPlaces.length;

  const columns: AdminColumn<AdminPlaceRow>[] = useMemo(
    () => [
      {
        header: "รูป",
        accessorKey: "coverImageUrl",
        className: "w-[58px]",
        stickyLeft: true,
        cell: (item) => (
          <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden border border-gray-100 shrink-0">
            {item.coverImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.coverImageUrl}
                alt={item.nameTh}
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
        accessorKey: "nameTh",
        className: "min-w-[260px]",
        cell: (item) => (
          <div className="min-w-0">
            <p className="ws-body-medium truncate">{item.nameTh}</p>
            <p className="ws-caption truncate">/{item.slug}</p>
          </div>
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
        cell: (item) => {
          const prov = getProvinceById(item.provinceId);
          return (
            <span className="ws-caption">
              {formatPlaceLocationScopeLabel(
                {
                  locationScope: item.locationScope,
                  branchSummaryTh: item.branchSummaryTh,
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
        header: "จำนวนโปร",
        className: "w-[80px] text-center whitespace-nowrap",
        cell: (item) => (
          <span className="ws-body tabular-nums">{item._count.pins}</span>
        ),
      },
      {
        header: "สถานะ",
        accessorKey: "verificationStatus",
        className: "whitespace-nowrap text-center",
        cell: (item) => {
          if (item.verificationStatus === "PENDING_REVIEW") {
            return (
              <span className="inline-flex px-2.5 py-1 rounded-full bg-[var(--color-accent-yellow)] text-[#182334] ws-badge">
                รอตรวจ
              </span>
            );
          }
          if (item.verificationStatus === "SUSPENDED") {
            return (
              <span className="inline-flex px-2.5 py-1 rounded-full bg-red-50 text-red-600 ws-badge">
                ระงับชั่วคราว
              </span>
            );
          }
          return (
            <span className="inline-flex px-2.5 py-1 rounded-full bg-[var(--color-accent-muted)] text-[var(--color-accent)] ws-badge">
              {item.isPublished ? "เผยแพร่แล้ว" : "ฉบับร่าง"}
            </span>
          );
        },
      },
    ],
    [],
  );

  return (
    <div className="cgr-admin-page">
      {/* ═══ SINGLE-ROW COMPACT TOOLBAR (Mobile & Desktop) ═══ */}
      <WorkspaceCompactToolbar
        searchValue={query}
        onSearchChange={(val) => {
          setQuery(val);
          setVisibleCount(BATCH_SIZE);
        }}
        searchPlaceholder="ค้นหาชื่อสถานที่ แบรนด์ หรือจังหวัด..."
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
            <AdminFilterDropdown
              label="สถานะ"
              options={STATUS_OPTIONS}
              selected={selectedStatuses}
              onChange={(vals) => {
                setSelectedStatuses(vals);
                setVisibleCount(BATCH_SIZE);
              }}
              multiple={false}
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
                <button
                  type="button"
                  disabled={busyId === "bulk"}
                  onClick={() => handleBulkVerify("VERIFIED")}
                  title="อนุมัติที่เลือก"
                  className="p-1.5 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 rounded-full cursor-pointer"
                >
                  <Check size={14} />
                </button>
                <button
                  type="button"
                  disabled={busyId === "bulk"}
                  onClick={() => handleBulkVerify("SUSPENDED")}
                  title="ระงับที่เลือก"
                  className="p-1.5 text-red-600 hover:bg-red-100 rounded-full cursor-pointer"
                >
                  <Ban size={14} />
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

            <button
              type="button"
              onClick={loadPlaces}
              title="รีเฟรช"
              className="h-9 w-9 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] inline-flex items-center justify-center cursor-pointer transition-colors"
            >
              <RefreshCw size={15} className={isLoading ? "animate-spin" : ""} />
            </button>

            <button
              type="button"
              onClick={openCreate}
              title="เพิ่มแบรนด์ / สถานที่"
              className="h-9 w-9 sm:w-auto sm:px-4 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] ws-body-strong inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              <Plus size={17} />
              <span className="hidden sm:inline">เพิ่มสถานที่</span>
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

      {/* ═══ TABLE BODY (Aligned 1:1 with 1160px Toolbar & Top Bar) ═══ */}
      <div
        className="cgr-admin-body md:!overflow-hidden py-3"
        style={{ overflowX: "clip" }}
      >
        {isLoading && places.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-400 gap-2 text-sm">
            <Loader2 size={18} className="animate-spin" />
            <span>Loading places...</span>
          </div>
        ) : (
          <AdminDataTable
            data={visiblePlaces}
            columns={columns}
            keyField="id"
            onRowClick={openEdit}
            enableMultiSelect
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            getViewUrl={(item) => `/${encodeURIComponent(item.slug)}`}
            emptyLabel="No places found"
            footer={
              <div className="border-t border-gray-100 p-2 flex items-center justify-center gap-3 text-xs text-gray-500 shrink-0">
                <span>
                  Showing {visiblePlaces.length} of {filteredPlaces.length}{" "}
                  places
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
                      filteredPlaces.length - visiblePlaces.length,
                    )}{" "}
                    more)
                  </button>
                )}
              </div>
            }
          />
        )}
      </div>

      {/* ═══ NONDII CENTERED-DESKTOP / MOBILE BOTTOM-SHEET EDITOR ═══ */}
      <AdminSlideSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        thumbnailUrl={editingPlace ? editingPlace.coverImageUrl : undefined}
        title={editingPlace ? editingPlace.nameTh : "New Place / Brand"}
        subtitle={
          editingPlace
            ? `/${editingPlace.slug}`
            : "เพิ่มแบรนด์หรือสถานที่ใหม่เข้าสู่ระบบ Nondii"
        }
        footerAction={
          <div className="flex items-center justify-between gap-3">
            <div>
              {editingPlace && (
                <a
                  href={`/${encodeURIComponent(editingPlace.slug)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="ws-body-strong !text-[var(--color-text-secondary)] hover:!text-[var(--color-text-primary)] underline underline-offset-2 transition-colors"
                >
                  ดูหน้าร้านจริง
                </a>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsSheetOpen(false)}
                className="h-11 px-5 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[14px] font-semibold text-[var(--color-text-primary)] cursor-pointer transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSaveSheet}
                className="h-11 px-6 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] text-[14px] font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Save size={15} />
                )}
                <span>{isSaving ? "กำลังบันทึก..." : "บันทึก"}</span>
              </button>
            </div>
          </div>
        }
      >
        <div className="flex-1 overflow-y-auto cgr-scroll-autohide px-5 py-5 space-y-5">
          <div className="space-y-3">
            <h3 className="ws-subtitle">ข้อมูลพื้นฐาน</h3>

            <StandardFieldGroup>
              <div className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x divide-y sm:divide-y-0 divide-[#b0b0b0]">
                <StandardInput
                  grouped
                  label="ชื่อแบรนด์ / สถานที่ (ไทย) *"
                  value={nameTh}
                  disabled={Boolean(editingPlace)}
                  onChange={(e) => setNameTh(e.target.value)}
                  placeholder="เช่น Café Amazon, KTC, Centara"
                />
                <StandardInput
                  grouped
                  label="URL Slug *"
                  value={slug}
                  disabled={Boolean(editingPlace)}
                  onChange={(e) => setSlug(e.target.value.toLowerCase())}
                  placeholder="cafe-amazon"
                />
              </div>

              {!editingPlace && (
                <div className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x divide-y sm:divide-y-0 divide-[#b0b0b0]">
                  <StandardInput
                    grouped
                    label="ชื่อภาษาอังกฤษ (ไม่บังคับ)"
                    value={nameEn}
                    onChange={(e) => setNameEn(e.target.value)}
                    placeholder="Optional English Name"
                  />
                  <StandardInput
                    grouped
                    type="url"
                    label="เว็บไซต์ทางการ"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x divide-y sm:divide-y-0 divide-[#b0b0b0]">
                <StandardSelectField
                  grouped
                  label="หมวดหมู่"
                  value={category}
                  onChange={(v) =>
                    setCategory(
                      v as
                        | "STAY"
                        | "CAFE"
                        | "RESTAURANT"
                        | "ATTRACTION"
                        | "WELLNESS",
                    )
                  }
                  options={CATEGORY_OPTIONS}
                  sheetTitle="เลือกหมวดหมู่"
                />
                <StandardSelectField
                  grouped
                  label="ขอบเขตพื้นที่ให้บริการ"
                  value={scope}
                  onChange={(v) =>
                    setScope(
                      v as
                        | "SINGLE_LOCATION"
                        | "MULTI_BRANCH"
                        | "NATIONWIDE_ONLINE",
                    )
                  }
                  options={SCOPE_OPTIONS}
                  sheetTitle="ขอบเขตพื้นที่ให้บริการ"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x divide-y sm:divide-y-0 divide-[#b0b0b0]">
                {!editingPlace && scope !== "NATIONWIDE_ONLINE" && (
                  <StandardSelectField
                    grouped
                    label="จังหวัดหลัก"
                    value={provinceId}
                    onChange={setProvinceId}
                    options={provinceOptions}
                    sheetTitle="เลือกจังหวัดหลัก"
                  />
                )}
                <StandardInput
                  grouped
                  label="สรุปจำนวนสาขา"
                  value={branchSummary}
                  onChange={(e) => setBranchSummary(e.target.value)}
                  placeholder="เช่น กว่า 4,000 สาขาทั่วไทย"
                />
              </div>

              {!editingPlace && (
                <StandardInput
                  grouped
                  label="คำโปรยสั้นๆ"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="คำโปรยสั้นๆ สำหรับหน้าโปรไฟล์"
                />
              )}
            </StandardFieldGroup>
          </div>

          {editingPlace && (
            <div className="border-t border-[var(--color-border)] pt-5 space-y-4">
              <h3 className="ws-subtitle">การตรวจสอบและการเผยแพร่</h3>

              <StandardSelectField
                label="สถานะการตรวจสอบ"
                value={verificationStatus}
                onChange={(v) =>
                  setVerificationStatus(
                    v as "PENDING_REVIEW" | "VERIFIED" | "SUSPENDED",
                  )
                }
                options={STATUS_OPTIONS}
                sheetTitle="สถานะการตรวจสอบ"
              />

              <div className="pt-1">
                <StandardCheckbox
                  checked={isPublished}
                  onChange={setIsPublished}
                  label="เผยแพร่บน Nondii สาธารณะ"
                />
              </div>
            </div>
          )}
        </div>
      </AdminSlideSheet>
    </div>
  );
}
