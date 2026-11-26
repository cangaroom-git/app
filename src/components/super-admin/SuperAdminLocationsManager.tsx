"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronRight,
  Globe,
  GripVertical,
  MapPin,
  Pencil,
  Star,
  X,
} from "lucide-react";
import type { ThailandRegionId } from "@/data/thailandProvinces";
import type {
  LocationCatalogDto,
  ProvinceConfigDto,
  RegionConfigDto,
} from "@/lib/services/locationConfigService";
import {
  StandardCheckbox,
  StandardFieldGroup,
  StandardInput,
} from "@/components/ui/standards";
import { WorkspaceCompactToolbar } from "@/components/workspace/WorkspacePrimitives";
import { WorkspaceSplitLayout } from "@/components/workspace/WorkspaceSplitLayout";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";
import { useModalPresence } from "@/lib/useModalPresence";

interface SuperAdminLocationsManagerProps {
  onNotice: (msg: string) => void;
  topBanner?: React.ReactNode;
}

type SortScopeMode = "region" | "national";

function SortableRegionRow({
  region,
  isSelected,
  provinceCount,
  placeCount,
  isMobile,
  onSelect,
}: {
  region: RegionConfigDto;
  isSelected: boolean;
  provinceCount: number;
  placeCount: number;
  isMobile?: boolean;
  onSelect: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: region.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-[14px] px-2.5 py-2.5 flex items-center gap-2 transition-colors ${
        isDragging
          ? "bg-[var(--color-background-muted)] opacity-90"
          : isSelected && !isMobile
            ? "bg-[var(--color-background-muted)]"
            : "hover:bg-[var(--color-background-muted)]/60"
      }`}
    >
      <button
        type="button"
        aria-label={`ลากจัดลำดับ ${region.labelTh}`}
        {...attributes}
        {...listeners}
        className="h-7 w-5 inline-flex items-center justify-center text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] cursor-grab active:cursor-grabbing touch-none shrink-0"
      >
        <GripVertical className="w-3.5 h-3.5" />
      </button>

      <button
        type="button"
        onClick={onSelect}
        className="flex-1 min-w-0 text-left flex items-center justify-between gap-2 cursor-pointer"
      >
        <div className="min-w-0">
          <span
            className={`block truncate ${
              isMobile
                ? "ws-subtitle"
                : isSelected
                  ? "ws-body-strong !text-[var(--color-accent)]"
                  : "ws-body-medium"
            }`}
          >
            {region.labelTh}
          </span>
          {isMobile && (
            <span className="ws-caption block mt-0.5">
              {provinceCount} จังหวัด · {placeCount} แห่ง
            </span>
          )}
        </div>
        {!isMobile ? (
          <span className="ws-badge text-[var(--color-text-secondary)] tabular-nums shrink-0">
            {provinceCount}
          </span>
        ) : (
          <ChevronRight
            size={16}
            className="text-[var(--color-text-secondary)] shrink-0"
          />
        )}
      </button>
    </div>
  );
}

function SortableProvinceRow({
  province,
  rankIndex,
  disableDrag,
  onToggleTouristHub,
  onEditGeo,
}: {
  province: ProvinceConfigDto;
  rankIndex: number;
  disableDrag: boolean;
  onToggleTouristHub: (prov: ProvinceConfigDto) => void;
  onEditGeo: (prov: ProvinceConfigDto) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: province.id, disabled: disableDrag });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`py-3.5 px-2 sm:px-3 border-b border-[var(--color-border)] flex items-center gap-2.5 sm:gap-3 transition-colors ${
        isDragging
          ? "bg-[var(--color-background-muted)] opacity-90"
          : "hover:bg-[var(--color-background-muted)]/55"
      }`}
    >
      <button
        type="button"
        disabled={disableDrag}
        aria-label={`ลากจัดลำดับ ${province.nameTh}`}
        {...attributes}
        {...listeners}
        className={`h-7 w-5 inline-flex items-center justify-center shrink-0 touch-none ${
          disableDrag
            ? "text-[var(--color-border-emphasized)] cursor-not-allowed"
            : "text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] cursor-grab active:cursor-grabbing"
        }`}
      >
        <GripVertical className="w-3.5 h-3.5" />
      </button>

      <span className="w-6 ws-caption-medium tabular-nums shrink-0 text-right">
        {rankIndex + 1}
      </span>

      <div className="min-w-0 flex-1 flex items-center gap-2">
        <span className="ws-body-medium truncate">{province.shortNameTh}</span>
        <span className="hidden md:inline ws-caption truncate">
          {province.nameEn}
        </span>
        {!province.isActive && (
          <span className="ws-badge text-[#e60023] shrink-0">ซ่อน</span>
        )}
      </div>

      <span className="hidden xl:inline ws-caption tabular-nums shrink-0 w-[132px] text-right">
        {province.centerLat.toFixed(3)}, {province.centerLng.toFixed(3)}
      </span>

      <span className="ws-caption tabular-nums shrink-0 w-[56px] text-right">
        {province.placeCount} แห่ง
      </span>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => onToggleTouristHub(province)}
          title={
            province.isTouristHub
              ? "นำออกจากเมืองท่องเที่ยวเด่น"
              : "ตั้งเป็นเมืองท่องเที่ยวเด่น"
          }
          className={`h-8 px-3 rounded-full ws-badge inline-flex items-center gap-1 cursor-pointer transition-colors ${
            province.isTouristHub
              ? "bg-[var(--color-accent)] !text-[var(--color-on-accent)]"
              : "bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-secondary)]"
          }`}
        >
          <Star
            className="w-3.5 h-3.5"
            fill={province.isTouristHub ? "currentColor" : "none"}
          />
          <span className="hidden sm:inline">เด่น</span>
        </button>

        <button
          type="button"
          onClick={() => onEditGeo(province)}
          title="แก้ไขพิกัด lat/lng"
          className="h-8 px-3 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] ws-badge inline-flex items-center gap-1 cursor-pointer transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">พิกัด</span>
        </button>
      </div>
    </div>
  );
}

export function SuperAdminLocationsManager({
  onNotice,
  topBanner,
}: SuperAdminLocationsManagerProps) {
  const [regions, setRegions] = useState<RegionConfigDto[]>([]);
  const [provinces, setProvinces] = useState<ProvinceConfigDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [scopeMode, setScopeMode] = useState<SortScopeMode>("region");
  const [selectedRegionId, setSelectedRegionId] =
    useState<ThailandRegionId>("north");
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");
  const [searchQuery, setSearchQuery] = useState("");

  const [editingProvince, setEditingProvince] =
    useState<ProvinceConfigDto | null>(null);
  const [cachedEditingProvince, setCachedEditingProvince] =
    useState<ProvinceConfigDto | null>(null);
  const [editShortNameTh, setEditShortNameTh] = useState("");
  const [editCenterLat, setEditCenterLat] = useState("");
  const [editCenterLng, setEditCenterLng] = useState("");
  const [editSouthLat, setEditSouthLat] = useState("");
  const [editNorthLat, setEditNorthLat] = useState("");
  const [editWestLng, setEditWestLng] = useState("");
  const [editEastLng, setEditEastLng] = useState("");
  const [editDefaultZoom, setEditDefaultZoom] = useState("");
  const [editIsTouristHub, setEditIsTouristHub] = useState(false);
  const [editIsActive, setEditIsActive] = useState(true);

  const editPresence = useModalPresence(Boolean(editingProvince), 250);
  useBodyScrollLock(editPresence.shouldRender);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 160, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchLocations = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/super-admin/locations", {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as LocationCatalogDto;
      setRegions(data.regions || []);
      setProvinces(data.provinces || []);
      if (data.regions?.length) {
        setSelectedRegionId((prev) =>
          data.regions.some((r) => r.id === prev) ? prev : data.regions[0].id
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchLocations();
  }, [fetchLocations]);

  const sortedRegions = useMemo(
    () => [...regions].sort((a, b) => a.sortOrder - b.sortOrder),
    [regions]
  );

  const displayedProvinces = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const base =
      scopeMode === "national"
        ? [...provinces].sort(
            (a, b) => a.nationalSortOrder - b.nationalSortOrder
          )
        : provinces
            .filter((p) => p.regionId === selectedRegionId)
            .sort((a, b) => a.regionSortOrder - b.regionSortOrder);

    if (!q) return base;
    return base.filter(
      (p) =>
        p.nameTh.toLowerCase().includes(q) ||
        p.shortNameTh.toLowerCase().includes(q) ||
        p.nameEn.toLowerCase().includes(q) ||
        p.id.includes(q)
    );
  }, [provinces, scopeMode, searchQuery, selectedRegionId]);

  const handleRegionDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIdx = sortedRegions.findIndex((r) => r.id === active.id);
    const newIdx = sortedRegions.findIndex((r) => r.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;

    const reordered = arrayMove(sortedRegions, oldIdx, newIdx).map((r, i) => ({
      ...r,
      sortOrder: i,
    }));
    setRegions(reordered);

    try {
      const res = await fetch("/api/super-admin/locations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reorder_regions",
          orderedRegionIds: reordered.map((r) => r.id),
        }),
      });
      if (res.ok) {
        onNotice("บันทึกลำดับภาคเรียบร้อย");
      } else {
        await fetchLocations();
      }
    } catch {
      await fetchLocations();
    }
  };

  const handleProvinceDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || searchQuery.trim()) return;

    const oldIdx = displayedProvinces.findIndex((p) => p.id === active.id);
    const newIdx = displayedProvinces.findIndex((p) => p.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;

    const reorderedSubset = arrayMove(displayedProvinces, oldIdx, newIdx);
    const rankMap = new Map(reorderedSubset.map((p, idx) => [p.id, idx]));

    setProvinces((prev) =>
      prev.map((p) => {
        const nextRank = rankMap.get(p.id);
        if (nextRank === undefined) return p;
        return scopeMode === "national"
          ? { ...p, nationalSortOrder: nextRank }
          : { ...p, regionSortOrder: nextRank };
      })
    );

    try {
      const res = await fetch("/api/super-admin/locations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reorder_provinces",
          scope: scopeMode,
          regionId: scopeMode === "region" ? selectedRegionId : undefined,
          orderedProvinceIds: reorderedSubset.map((p) => p.id),
        }),
      });
      if (res.ok) {
        onNotice("บันทึกลำดับจังหวัดเรียบร้อย");
      } else {
        await fetchLocations();
      }
    } catch {
      await fetchLocations();
    }
  };

  const handleToggleTouristHub = async (prov: ProvinceConfigDto) => {
    const nextVal = !prov.isTouristHub;
    setProvinces((prev) =>
      prev.map((p) => (p.id === prov.id ? { ...p, isTouristHub: nextVal } : p))
    );

    try {
      const res = await fetch("/api/super-admin/locations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_province",
          id: prov.id,
          isTouristHub: nextVal,
        }),
      });
      if (res.ok) {
        onNotice(
          nextVal
            ? `ตั้ง ${prov.shortNameTh} เป็นเมืองท่องเที่ยวเด่นแล้ว`
            : `นำ ${prov.shortNameTh} ออกจากเมืองเด่นแล้ว`
        );
      } else {
        await fetchLocations();
      }
    } catch {
      await fetchLocations();
    }
  };

  const openEditGeo = (prov: ProvinceConfigDto) => {
    setEditingProvince(prov);
    setCachedEditingProvince(prov);
    setEditShortNameTh(prov.shortNameTh);
    setEditCenterLat(String(prov.centerLat));
    setEditCenterLng(String(prov.centerLng));
    setEditSouthLat(String(prov.southLat));
    setEditNorthLat(String(prov.northLat));
    setEditWestLng(String(prov.westLng));
    setEditEastLng(String(prov.eastLng));
    setEditDefaultZoom(String(prov.defaultZoom));
    setEditIsTouristHub(prov.isTouristHub);
    setEditIsActive(prov.isActive);
  };

  const handleSaveProvinceGeo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProvince) return;

    const centerLat = Number(editCenterLat);
    const centerLng = Number(editCenterLng);
    const southLat = Number(editSouthLat);
    const northLat = Number(editNorthLat);
    const westLng = Number(editWestLng);
    const eastLng = Number(editEastLng);
    const defaultZoom = Number(editDefaultZoom);

    if (
      ![
        centerLat,
        centerLng,
        southLat,
        northLat,
        westLng,
        eastLng,
        defaultZoom,
      ].every(Number.isFinite)
    ) {
      onNotice("กรุณากรอกค่าพิกัดเป็นตัวเลขที่ถูกต้อง");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/super-admin/locations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_province",
          id: editingProvince.id,
          shortNameTh: editShortNameTh.trim() || editingProvince.shortNameTh,
          centerLat,
          centerLng,
          southLat,
          northLat,
          westLng,
          eastLng,
          defaultZoom,
          isTouristHub: editIsTouristHub,
          isActive: editIsActive,
        }),
      });
      if (res.ok) {
        setProvinces((prev) =>
          prev.map((p) =>
            p.id === editingProvince.id
              ? {
                  ...p,
                  shortNameTh:
                    editShortNameTh.trim() || editingProvince.shortNameTh,
                  centerLat,
                  centerLng,
                  southLat,
                  northLat,
                  westLng,
                  eastLng,
                  defaultZoom,
                  isTouristHub: editIsTouristHub,
                  isActive: editIsActive,
                }
              : p
          )
        );
        onNotice(`อัปเดตพิกัด จ.${editingProvince.shortNameTh} แล้ว`);
        setEditingProvince(null);
      } else {
        onNotice("บันทึกพิกัดไม่สำเร็จ");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const modalProvince = editingProvince ?? cachedEditingProvince;
  const activeRegionLabel =
    scopeMode === "national"
      ? `ทั่วประเทศ (${provinces.length})`
      : sortedRegions.find((r) => r.id === selectedRegionId)?.labelTh ??
        "ภูมิภาค";

  const renderRegionList = (isMobile: boolean) => (
    <div className="space-y-4">
      {/* National Scope Quick Entry */}
      <button
        type="button"
        onClick={() => {
          setScopeMode("national");
          setMobileView("detail");
        }}
        className={`w-full flex items-center gap-3 px-3 py-3 rounded-[14px] text-left cursor-pointer transition-colors ${
          scopeMode === "national" && !isMobile
            ? "bg-[var(--color-background-muted)] ws-body-strong !text-[var(--color-accent)]"
            : "hover:bg-[var(--color-background-muted)]/60 ws-body-medium"
        }`}
      >
        <span
          className={`w-8 h-8 rounded-full inline-flex items-center justify-center shrink-0 ${
            scopeMode === "national"
              ? "bg-[var(--color-accent)] !text-white"
              : "bg-[var(--color-background-muted)] text-[var(--color-accent)]"
          }`}
        >
          <Globe className="w-4 h-4" />
        </span>
        <div className="flex-1 min-w-0">
          <span className={isMobile ? "ws-subtitle block" : "block truncate"}>
            ทั่วประเทศ (77 จังหวัด)
          </span>
          {isMobile && (
            <span className="ws-caption block mt-0.5">
              จัดลำดับรวมทุกจังหวัดทั่วไทย
            </span>
          )}
        </div>
        {isMobile ? (
          <ChevronRight
            size={16}
            className="text-[var(--color-text-secondary)] shrink-0"
          />
        ) : (
          <span className="ws-badge text-[var(--color-text-secondary)] tabular-nums">
            {provinces.length}
          </span>
        )}
      </button>

      <div className="space-y-1">
        <p className="ws-badge text-[var(--color-text-secondary)] px-3 pb-1">
          เรียงตามภูมิภาค (ลากสลับลำดับได้)
        </p>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleRegionDragEnd}
        >
          <SortableContext
            items={sortedRegions.map((r) => r.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className={isMobile ? "divide-y divide-[var(--color-border)]" : "space-y-0.5"}>
              {sortedRegions.map((reg) => {
                const regProvs = provinces.filter((p) => p.regionId === reg.id);
                const regPlaces = regProvs.reduce(
                  (acc, p) => acc + p.placeCount,
                  0,
                );
                return (
                  <SortableRegionRow
                    key={reg.id}
                    region={reg}
                    isMobile={isMobile}
                    isSelected={
                      scopeMode === "region" && selectedRegionId === reg.id
                    }
                    provinceCount={regProvs.length}
                    placeCount={regPlaces}
                    onSelect={() => {
                      setScopeMode("region");
                      setSelectedRegionId(reg.id);
                      setMobileView("detail");
                    }}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );

  return (
    <>
      <WorkspaceSplitLayout
        title="จังหวัด & ภูมิภาค"
        subtitle={`${sortedRegions.length} ภูมิภาค · ${provinces.length} จังหวัด`}
        activeId={scopeMode === "national" ? "national" : selectedRegionId}
        mobileView={mobileView}
        onMobileBack={() => setMobileView("list")}
        mobileDetailTitle={activeRegionLabel}
        contentWidth="full"
        fullHeightRightPane
        topBanner={topBanner}
        customDesktopSidebarList={renderRegionList(false)}
        customMobileSidebarList={renderRegionList(true)}
      >
        {isLoading ? (
          <div className="py-12 text-center ws-caption">
            กำลังโหลดข้อมูล 77 จังหวัด...
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="hidden md:flex items-end justify-between gap-3 pb-4 border-b border-[var(--color-border)] shrink-0">
              <div className="space-y-0.5 min-w-0">
                <h2 className="ws-title truncate">{activeRegionLabel}</h2>
                <p className="ws-caption">
                  ลากไอคอนด้านซ้ายเพื่อจัดลำดับ ({displayedProvinces.length}{" "}
                  จังหวัด)
                </p>
              </div>
              <div className="w-60 shrink-0">
                <WorkspaceCompactToolbar
                  bordered={false}
                  compactPadding
                  searchValue={searchQuery}
                  onSearchChange={setSearchQuery}
                  searchPlaceholder="กรองชื่อจังหวัด..."
                />
              </div>
            </div>

            <div className="md:hidden pb-2 border-b border-[var(--color-border)] shrink-0">
              <WorkspaceCompactToolbar
                bordered={false}
                compactPadding
                searchValue={searchQuery}
                onSearchChange={setSearchQuery}
                searchPlaceholder="กรองชื่อจังหวัด..."
                filters={
                  <span className="ws-caption whitespace-nowrap pl-1">
                    {displayedProvinces.length} จังหวัด · ลากจัดลำดับได้
                  </span>
                }
              />
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto cgr-scroll-autohide pb-12">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleProvinceDragEnd}
              >
                <SortableContext
                  items={displayedProvinces.map((p) => p.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {displayedProvinces.map((prov, idx) => (
                    <SortableProvinceRow
                      key={prov.id}
                      province={prov}
                      rankIndex={idx}
                      disableDrag={Boolean(searchQuery.trim())}
                      onToggleTouristHub={handleToggleTouristHub}
                      onEditGeo={openEditGeo}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>
          </div>
        )}
      </WorkspaceSplitLayout>

      {/* Edit Province Geo & Coordinates Sheet */}
      {editPresence.shouldRender &&
        modalProvince &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            data-state={editPresence.dataState}
            onClick={(e) => {
              if (e.target === e.currentTarget) setEditingProvince(null);
            }}
            className="cgr-modal-backdrop fixed inset-0 z-[95] bg-black/48 flex items-end md:items-center justify-center md:p-4"
          >
            <form
              onSubmit={handleSaveProvinceGeo}
              data-state={editPresence.dataState}
              className="cgr-modal-surface-md w-full md:max-w-[720px] max-h-[92dvh] md:max-h-[86dvh] rounded-t-[24px] md:rounded-[20px] bg-[var(--color-background-popover)] border-t md:border border-[var(--color-border)] shadow-[var(--shadow-popover)] flex flex-col overflow-hidden"
            >
              <div className="md:hidden flex justify-center pt-3 shrink-0">
                <span className="h-1 w-10 rounded-full bg-[var(--color-border-emphasized)]" />
              </div>

              <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-[var(--color-border)] shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <MapPin className="w-4 h-4 text-[var(--color-accent)] shrink-0" />
                  <h3 className="ws-title truncate">
                    ตั้งค่าพิกัด · {modalProvince.nameTh}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingProvince(null)}
                  aria-label="ปิดหน้าต่าง"
                  className="h-9 w-9 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] inline-flex items-center justify-center cursor-pointer transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto cgr-scroll-autohide px-5 py-4 space-y-3.5">
                <StandardFieldGroup>
                  <StandardInput
                    label="ชื่อย่อที่แสดงบนหน้าเว็บ"
                    value={editShortNameTh}
                    onChange={(e) => setEditShortNameTh(e.target.value)}
                    grouped
                  />
                  <StandardInput
                    label="Default Zoom (เช่น 8.5 - 11.5)"
                    type="number"
                    step="0.1"
                    value={editDefaultZoom}
                    onChange={(e) => setEditDefaultZoom(e.target.value)}
                    grouped
                  />
                </StandardFieldGroup>

                <StandardFieldGroup>
                  <div className="grid grid-cols-2 divide-x divide-[#b0b0b0] dark:divide-[var(--color-border-emphasized)]">
                    <StandardInput
                      label="Center Latitude"
                      type="number"
                      step="0.0001"
                      value={editCenterLat}
                      onChange={(e) => setEditCenterLat(e.target.value)}
                      grouped
                    />
                    <StandardInput
                      label="Center Longitude"
                      type="number"
                      step="0.0001"
                      value={editCenterLng}
                      onChange={(e) => setEditCenterLng(e.target.value)}
                      grouped
                    />
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-[#b0b0b0] dark:divide-[var(--color-border-emphasized)]">
                    <StandardInput
                      label="South Lat"
                      type="number"
                      step="0.0001"
                      value={editSouthLat}
                      onChange={(e) => setEditSouthLat(e.target.value)}
                      grouped
                    />
                    <StandardInput
                      label="North Lat"
                      type="number"
                      step="0.0001"
                      value={editNorthLat}
                      onChange={(e) => setEditNorthLat(e.target.value)}
                      grouped
                    />
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-[#b0b0b0] dark:divide-[var(--color-border-emphasized)]">
                    <StandardInput
                      label="West Lng"
                      type="number"
                      step="0.0001"
                      value={editWestLng}
                      onChange={(e) => setEditWestLng(e.target.value)}
                      grouped
                    />
                    <StandardInput
                      label="East Lng"
                      type="number"
                      step="0.0001"
                      value={editEastLng}
                      onChange={(e) => setEditEastLng(e.target.value)}
                      grouped
                    />
                  </div>
                </StandardFieldGroup>

                <div className="space-y-2.5 pt-1">
                  <StandardCheckbox
                    checked={editIsTouristHub}
                    onChange={setEditIsTouristHub}
                    label="ปักหมุดเป็นเมืองท่องเที่ยวเด่น"
                  />
                  <StandardCheckbox
                    checked={editIsActive}
                    onChange={setEditIsActive}
                    label="เปิดแสดงในตัวเลือกจังหวัดหน้า /explore"
                  />
                </div>
              </div>

              <div className="shrink-0 px-5 py-3.5 pb-[max(14px,env(safe-area-inset-bottom))] border-t border-[var(--color-border)] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingProvince(null)}
                  className="h-9 px-4 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[13px] font-semibold cursor-pointer transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="h-9 px-5 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] text-[13px] font-semibold cursor-pointer transition-colors disabled:opacity-50"
                >
                  {isSaving ? "กำลังบันทึก..." : "บันทึกพิกัด"}
                </button>
              </div>
            </form>
          </div>,
          document.body
        )}
    </>
  );
}
