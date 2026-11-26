"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  BedDouble,
  ChevronRight,
  Coffee,
  Compass,
  Layers,
  Loader2,
  Lock,
  Plus,
  Save,
  Sparkles,
  Trash2,
  UtensilsCrossed,
  Wine,
  X,
} from "lucide-react";
import { AdminSlideSheet } from "@/components/admin/ui/AdminSlideSheet";
import {
  StandardCheckbox,
  StandardFieldGroup,
  StandardInput,
  StandardSelectField,
  StandardTextarea,
} from "@/components/ui/standards";
import { WorkspaceSplitLayout } from "@/components/workspace/WorkspaceSplitLayout";

function getCategoryLucideIcon(code: string, slug: string, iconKey?: string) {
  const key = `${code} ${slug} ${iconKey || ""}`.toUpperCase();
  if (key.includes("STAY") || key.includes("HOTEL") || key.includes("BED")) {
    return BedDouble;
  }
  if (key.includes("CAFE") || key.includes("COFFEE")) {
    return Coffee;
  }
  if (key.includes("BAR") || key.includes("WINE") || key.includes("DRINK")) {
    return Wine;
  }
  if (key.includes("RESTAURANT") || key.includes("FOOD") || key.includes("DINING")) {
    return UtensilsCrossed;
  }
  if (key.includes("WELLNESS") || key.includes("SPA") || key.includes("SPARKLES")) {
    return Sparkles;
  }
  if (key.includes("ATTRACTION") || key.includes("ACTIVITY") || key.includes("COMPASS")) {
    return Compass;
  }
  return Layers;
}

interface PlaceCategoryConfigRow {
  id: string;
  code: string;
  slug: string;
  labelTh: string;
  labelEn: string;
  shortLabelTh: string;
  shortLabelEn: string;
  descriptionTh: string;
  crestBgHex: string;
  iconKey: string;
  schemaOrgType: string;
  defaultCtaTh: string;
  defaultCtaEn: string;
  level: number;
  position: number;
  isActive: boolean;
  isSystem: boolean;
  parentId: string | null;
  placesCount: number;
}

const CREST_SWATCHES = [
  { hex: "#5369A6", label: "Indigo Slate (ที่พัก)" },
  { hex: "#D47E35", label: "Warm Ochre (คาเฟ่)" },
  { hex: "#C6566E", label: "Berry Rose (อาหาร & บาร์)" },
  { hex: "#3A8D9A", label: "Coastal Teal (สปา & เวลเนส)" },
  { hex: "#529D48", label: "Botanical Sage (กิจกรรม)" },
  { hex: "#1e78d6", label: "Travel Blue (ทั่วไป)" },
];

/**
 * 1:1 WeGlobal Category Hierarchy (Miller Columns + Slide-Over Editor Sheet)
 */
export function AdminCategoriesClient() {
  const [categories, setCategories] = useState<PlaceCategoryConfigRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRootId, setSelectedRootId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");
  const [notice, setNotice] = useState<string | null>(null);

  // Slide-over Sheet State (Edit or Create)
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingCategory, setEditingCategory] =
    useState<PlaceCategoryConfigRow | null>(null);

  const [code, setCode] = useState("");
  const [slug, setSlug] = useState("");
  const [parentId, setParentId] = useState("");
  const [labelTh, setLabelTh] = useState("");
  const [labelEn, setLabelEn] = useState("");
  const [shortLabelTh, setShortLabelTh] = useState("");
  const [defaultCtaTh, setDefaultCtaTh] = useState("");
  const [descriptionTh, setDescriptionTh] = useState("");
  const [crestHex, setCrestHex] = useState("#1e78d6");
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const showToast = (msg: string) => {
    setNotice(msg);
    window.setTimeout(() => {
      setNotice((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  const loadCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/categories", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "โหลดหมวดหมู่ไม่สำเร็จ");
      const list = (json.categories ?? []) as PlaceCategoryConfigRow[];
      setCategories(list);

      const roots = list.filter((c) => c.level === 1);
      setSelectedRootId((prev) =>
        prev && roots.some((r) => r.id === prev) ? prev : roots[0]?.id ?? null,
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : "โหลดหมวดหมู่ไม่สำเร็จ");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const roots = useMemo(
    () =>
      categories
        .filter((c) => c.level === 1)
        .sort((a, b) => a.position - b.position),
    [categories],
  );

  const subCategories = useMemo(
    () =>
      categories
        .filter((c) => c.parentId === selectedRootId)
        .sort((a, b) => a.position - b.position),
    [categories, selectedRootId],
  );

  const selectedRoot = useMemo(
    () => roots.find((r) => r.id === selectedRootId) ?? null,
    [roots, selectedRootId],
  );

  const openEditSheet = (cat: PlaceCategoryConfigRow) => {
    setEditingCategory(cat);
    setCode(cat.code);
    setSlug(cat.slug);
    setParentId(cat.parentId || "");
    setLabelTh(cat.labelTh);
    setLabelEn(cat.labelEn);
    setShortLabelTh(cat.shortLabelTh || cat.labelTh);
    setDefaultCtaTh(cat.defaultCtaTh || "ดูโปรโมชั่น");
    setDescriptionTh(cat.descriptionTh || "");
    setCrestHex(cat.crestBgHex || "#1e78d6");
    setIsActive(cat.isActive);
    setIsSheetOpen(true);
  };

  const openCreateSheet = (defaultParent = "") => {
    setEditingCategory(null);
    setCode("");
    setSlug("");
    setParentId(defaultParent);
    setLabelTh("");
    setLabelEn("");
    setShortLabelTh("");
    setDefaultCtaTh("ดูโปรโมชั่น");
    setDescriptionTh("");
    const parent = roots.find((r) => r.id === defaultParent);
    setCrestHex(parent?.crestBgHex || "#1e78d6");
    setIsActive(true);
    setIsSheetOpen(true);
  };

  const handleToggleActive = async (cat: PlaceCategoryConfigRow) => {
    const nextActive = !cat.isActive;
    setCategories((prev) =>
      prev.map((c) => (c.id === cat.id ? { ...c, isActive: nextActive } : c)),
    );
    try {
      const res = await fetch("/api/admin/categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: cat.id, isActive: nextActive }),
      });
      if (!res.ok) throw new Error();
      showToast(
        nextActive
          ? `เปิดหมวด "${cat.labelTh}" แล้ว`
          : `ซ่อนหมวด "${cat.labelTh}" แล้ว`,
      );
    } catch {
      await loadCategories();
      showToast("อัปเดตสถานะไม่สำเร็จ");
    }
  };

  const handleReorder = async (
    siblings: PlaceCategoryConfigRow[],
    index: number,
    direction: -1 | 1,
  ) => {
    const swapIdx = index + direction;
    if (swapIdx < 0 || swapIdx >= siblings.length) return;
    const reordered = [...siblings];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(swapIdx, 0, moved);
    const orderedIds = reordered.map((c) => c.id);

    setCategories((prev) =>
      prev.map((c) => {
        const pos = orderedIds.indexOf(c.id);
        return pos >= 0 ? { ...c, position: pos } : c;
      }),
    );

    try {
      const res = await fetch("/api/admin/categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "REORDER", orderedIds }),
      });
      if (!res.ok) throw new Error();
      showToast("จัดลำดับเรียบร้อย");
    } catch {
      await loadCategories();
      showToast("จัดลำดับไม่สำเร็จ");
    }
  };

  const handleSaveSheet = async () => {
    if (editingCategory) {
      setIsSaving(true);
      try {
        const res = await fetch("/api/admin/categories", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingCategory.id,
            labelTh: labelTh.trim(),
            labelEn: labelEn.trim(),
            shortLabelTh: shortLabelTh.trim(),
            defaultCtaTh: defaultCtaTh.trim(),
            descriptionTh: descriptionTh.trim(),
            crestBgHex: crestHex,
            isActive,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "บันทึกไม่สำเร็จ");
        showToast(`บันทึก "${labelTh.trim()}" แล้ว`);
        setIsSheetOpen(false);
        await loadCategories();
      } catch (err) {
        showToast(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
      } finally {
        setIsSaving(false);
      }
      return;
    }

    if (!labelTh.trim() || !code.trim() || !slug.trim()) {
      showToast("กรุณากรอกชื่อไทย, Code และ Slug ให้ครบถ้วน");
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          slug: slug.trim().toLowerCase(),
          labelTh: labelTh.trim(),
          labelEn: labelEn.trim() || labelTh.trim(),
          crestBgHex: crestHex,
          parentId: parentId || null,
          isActive,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "สร้างหมวดหมู่ไม่สำเร็จ");
      showToast(`เพิ่มหมวด "${labelTh.trim()}" แล้ว`);
      setIsSheetOpen(false);
      await loadCategories();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "สร้างหมวดหมู่ไม่สำเร็จ");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCategory = async (cat: PlaceCategoryConfigRow) => {
    if (cat.isSystem) return;
    setIsSaving(true);
    try {
      const res = await fetch(
        `/api/admin/categories?id=${encodeURIComponent(cat.id)}`,
        { method: "DELETE" },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "ลบไม่สำเร็จ");
      showToast(`ลบ "${cat.labelTh}" แล้ว`);
      setIsSheetOpen(false);
      await loadCategories();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "ลบไม่สำเร็จ");
    } finally {
      setIsSaving(false);
    }
  };

  const renderRootList = (isMobile: boolean) => (
    <div
      className={
        isMobile ? "divide-y divide-[var(--color-border)]" : "space-y-1"
      }
    >
      {roots.map((cat, idx) => {
        const selected = selectedRootId === cat.id;
        const CatIcon = getCategoryLucideIcon(
          cat.code,
          cat.slug,
          cat.iconKey,
        );

        if (isMobile) {
          return (
            <div
              key={cat.id}
              onClick={() => {
                setSelectedRootId(cat.id);
                setMobileView("detail");
              }}
              className="px-2 py-3.5 flex items-center justify-between gap-3 cursor-pointer active:bg-[var(--color-background-muted)] transition-colors"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <span
                  className={`h-10 w-10 rounded-full inline-flex items-center justify-center shrink-0 transition-colors ${
                    selected
                      ? "bg-[var(--color-accent)] text-white"
                      : "bg-[var(--color-background-muted)] text-[var(--color-accent)]"
                  }`}
                >
                  <CatIcon className="w-[18px] h-[18px]" strokeWidth={1.9} />
                </span>
                <div className="min-w-0">
                  <p className="ws-subtitle truncate flex items-center gap-1.5">
                    <span className="truncate">{cat.labelTh}</span>
                    {cat.isSystem && (
                      <Lock
                        size={11}
                        className="text-[var(--color-text-secondary)] shrink-0"
                      />
                    )}
                  </p>
                  <p className="ws-caption truncate mt-0.5">
                    {cat.placesCount} แห่ง · /{cat.slug}
                  </p>
                </div>
              </div>
              <ChevronRight
                size={16}
                className="text-[var(--color-text-secondary)] shrink-0"
              />
            </div>
          );
        }

        // Desktop: 1:1 compact single-line nav row matching /admin/systems
        return (
          <div
            key={cat.id}
            onClick={() => {
              setSelectedRootId(cat.id);
              setMobileView("detail");
            }}
            className={`group w-full flex items-center gap-3 px-3.5 py-3 rounded-[14px] text-left cursor-pointer transition-colors ws-body-medium ${
              selected
                ? "bg-[var(--color-background-muted)] !font-semibold !text-[var(--color-text-primary)]"
                : "!text-[var(--color-text-secondary)] hover:bg-[var(--color-background-muted)]/60 hover:!text-[var(--color-text-primary)]"
            }`}
          >
            <CatIcon
              className={`w-[20px] h-[20px] shrink-0 ${
                selected
                  ? "text-[var(--color-accent)]"
                  : "text-[var(--color-text-secondary)]"
              }`}
              strokeWidth={selected ? 2.1 : 1.75}
            />
            <span className="truncate flex-1 min-w-0">{cat.labelTh}</span>

            {/* Reorder arrows appear subtly on hover; count badge shows cleanly when idle */}
            <div
              className="hidden group-hover:flex items-center gap-0.5 shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                disabled={idx === 0}
                onClick={() => handleReorder(roots, idx, -1)}
                title="เลื่อนขึ้น"
                className="p-1 rounded-full hover:bg-[var(--color-background-subtle)] text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] disabled:opacity-25 cursor-pointer"
              >
                <ArrowUp size={13} />
              </button>
              <button
                type="button"
                disabled={idx === roots.length - 1}
                onClick={() => handleReorder(roots, idx, 1)}
                title="เลื่อนลง"
                className="p-1 rounded-full hover:bg-[var(--color-background-subtle)] text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] disabled:opacity-25 cursor-pointer"
              >
                <ArrowDown size={13} />
              </button>
            </div>
            <span className="group-hover:hidden ws-badge text-[var(--color-text-secondary)] tabular-nums shrink-0">
              {cat.placesCount}
            </span>
          </div>
        );
      })}
    </div>
  );

  return (
    <>
      <WorkspaceSplitLayout
        title="หมวดหมู่"
        subtitle={`${roots.length} หมวดหลัก · ${categories.length - roots.length} หมวดย่อย`}
        activeId={selectedRootId || ""}
        mobileView={mobileView}
        onMobileBack={() => setMobileView("list")}
        mobileDetailTitle={selectedRoot?.labelTh}
        contentWidth="narrow"
        customDesktopSidebarList={renderRootList(false)}
        customMobileSidebarList={renderRootList(true)}
        sidebarFooter={
          <button
            type="button"
            onClick={() => openCreateSheet("")}
            className="w-full h-10 px-4 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] ws-body-strong inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
          >
            <Plus size={15} />
            <span>เพิ่มหมวดหมู่หลัก</span>
          </button>
        }
        topBanner={
          notice ? (
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
          ) : undefined
        }
      >
        {isLoading ? (
          <div className="py-16 flex items-center justify-center ws-caption gap-2">
            <Loader2
              size={18}
              className="animate-spin text-[var(--color-accent)]"
            />
            <span>กำลังโหลดหมวดหมู่...</span>
          </div>
        ) : !selectedRoot ? (
          <div className="py-16 text-center ws-caption">
            เลือกหมวดหมู่หลักทางด้านซ้ายเพื่อดูและจัดการรายละเอียด
          </div>
        ) : (
          <div key={selectedRoot.id} className="cgr-desktop-tab-in space-y-8">
            {/* ─── Section 1: Root Category Header & Summary (matches /admin/systems rhythm) ─── */}
            <div className="space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <h2 className="ws-title truncate flex items-center gap-2">
                    <span>{selectedRoot.labelTh}</span>
                    {selectedRoot.isSystem && (
                      <Lock
                        size={14}
                        className="text-[var(--color-text-secondary)] shrink-0"
                      />
                    )}
                  </h2>
                  <p className="ws-caption">
                    {selectedRoot.code} · /{selectedRoot.slug} ·{" "}
                    {selectedRoot.placesCount} สถานที่
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEditSheet(selectedRoot)}
                    className="h-9 px-4 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] ws-body-strong text-[var(--color-text-primary)] cursor-pointer transition-colors"
                  >
                    แก้ไขหมวดหลัก
                  </button>
                  <button
                    type="button"
                    onClick={() => openCreateSheet(selectedRoot.id)}
                    className="h-9 px-4 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] ws-body-strong inline-flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Plus size={15} />
                    <span>เพิ่มหมวดย่อย</span>
                  </button>
                </div>
              </div>

              {/* Hairline-divided Root Controls */}
              <div className="divide-y divide-[var(--color-border)] border-t border-b border-[var(--color-border)]">
                <div className="ws-row flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="ws-subtitle">สถานะการแสดงผลหมวดหลัก</p>
                    <p className="ws-caption mt-0.5">
                      แสดงหมวดหมู่นี้บนแถบกรองหน้าหลัก แผนที่ และหน้าลงทะเบียนร้านค้า
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleActive(selectedRoot)}
                    className={`h-9 px-3.5 rounded-full ws-badge shrink-0 cursor-pointer transition-colors ${
                      selectedRoot.isActive
                        ? "bg-[var(--color-accent-muted)] text-[var(--color-accent)]"
                        : "bg-[var(--color-accent-yellow)] text-[#182334]"
                    }`}
                  >
                    {selectedRoot.isActive ? "เปิดใช้งานอยู่" : "ซ่อนชั่วคราว"}
                  </button>
                </div>

                <div className="ws-row flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="ws-subtitle">สีป้ายหมวดหมู่ (Category Crest)</p>
                    <p className="ws-caption mt-0.5">
                      ใช้แสดงบนการ์ดสถานที่ 1:1 และหมุดแผนที่สำหรับหมวดนี้
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openEditSheet(selectedRoot)}
                    className="inline-flex items-center gap-2 h-9 px-3.5 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] ws-caption-medium !text-[var(--color-text-primary)] shrink-0 cursor-pointer transition-colors"
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/10"
                      style={{
                        backgroundColor: selectedRoot.crestBgHex || "#5369A6",
                      }}
                    />
                    <span>{selectedRoot.crestBgHex || "#5369A6"}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* ─── Section 2: Sub-Categories List ─── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="ws-subtitle">
                    หมวดหมู่ย่อย ({subCategories.length})
                  </h3>
                  <p className="ws-caption mt-0.5">
                    คลิกที่รายการเพื่อแก้ไขชื่อ Slug หรือสลับสถานะการแสดงผล
                  </p>
                </div>
              </div>

              {subCategories.length === 0 ? (
                <div className="rounded-[18px] bg-[var(--color-background-muted)] px-5 py-10 text-center space-y-2.5">
                  <p className="ws-caption">ยังไม่มีหมวดหมู่ย่อยในหมวดนี้</p>
                  <button
                    type="button"
                    onClick={() => openCreateSheet(selectedRoot.id)}
                    className="h-9 px-4 rounded-full bg-[var(--color-background-card)] hover:bg-[var(--color-background-subtle)] ws-body-strong text-[var(--color-text-primary)] inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Plus size={14} />
                    <span>สร้างหมวดหมู่ย่อยแรก</span>
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-[var(--color-border)] border-t border-[var(--color-border)]">
                  {subCategories.map((sub, idx) => (
                    <div
                      key={sub.id}
                      onClick={() => openEditSheet(sub)}
                      className="py-4 px-2 -mx-2 rounded-[12px] flex items-center justify-between gap-3 hover:bg-[var(--color-background-muted)]/55 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-[var(--color-accent)]" />
                        <div className="min-w-0">
                          <p className="ws-body-medium truncate">
                            {sub.labelTh}
                          </p>
                          <p className="ws-caption truncate">/{sub.slug}</p>
                        </div>
                      </div>

                      <div
                        className="flex items-center gap-1 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => handleToggleActive(sub)}
                          className={`px-2.5 py-1 rounded-full ws-badge cursor-pointer transition-colors ${
                            sub.isActive
                              ? "bg-[var(--color-accent-muted)] text-[var(--color-accent)]"
                              : "bg-[var(--color-accent-yellow)] text-[#182334]"
                          }`}
                        >
                          {sub.isActive ? "เปิดใช้งาน" : "ซ่อน"}
                        </button>
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleReorder(subCategories, idx, -1)}
                          title="เลื่อนขึ้น"
                          className="p-1.5 rounded-full hover:bg-[var(--color-background-muted)] text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] disabled:opacity-25 cursor-pointer"
                        >
                          <ArrowUp size={13} />
                        </button>
                        <button
                          type="button"
                          disabled={idx === subCategories.length - 1}
                          onClick={() => handleReorder(subCategories, idx, 1)}
                          title="เลื่อนลง"
                          className="p-1.5 rounded-full hover:bg-[var(--color-background-muted)] text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] disabled:opacity-25 cursor-pointer"
                        >
                          <ArrowDown size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </WorkspaceSplitLayout>

      {/* Nondii Centered-Desktop / Mobile Bottom-Sheet Category Editor */}
      <AdminSlideSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        title={
          editingCategory
            ? `แก้ไขหมวดหมู่ · ${editingCategory.labelTh}`
            : "เพิ่มหมวดหมู่ใหม่"
        }
        subtitle={
          editingCategory
            ? `${editingCategory.code} · /${editingCategory.slug}`
            : "สร้างหมวดหมู่หลักหรือหมวดหมู่ย่อยสำหรับโปรเที่ยวไทย"
        }
        footerAction={
          <div className="flex items-center justify-between gap-3">
            <div>
              {editingCategory && !editingCategory.isSystem && (
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleDeleteCategory(editingCategory)}
                  className="ws-body-strong !text-red-600 hover:!text-red-700 underline underline-offset-2 inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <Trash2 size={14} />
                  <span>ลบหมวดหมู่</span>
                </button>
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
            <h3 className="ws-subtitle">ข้อมูลหมวดหมู่</h3>

            <StandardFieldGroup>
              {!editingCategory && (
                <>
                  <StandardSelectField
                    grouped
                    label="หมวดหมู่หลัก (Parent Category)"
                    value={parentId}
                    onChange={setParentId}
                    options={[
                      { value: "", label: "หมวดหมู่หลัก (ระดับ 1)" },
                      ...roots.map((r) => ({ value: r.id, label: r.labelTh })),
                    ]}
                    sheetTitle="เลือกหมวดหมู่หลัก"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x divide-y sm:divide-y-0 divide-[#b0b0b0]">
                    <StandardInput
                      grouped
                      label="รหัสหมวดหมู่ (Code) *"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      placeholder="CAR_RENTAL"
                    />
                    <StandardInput
                      grouped
                      label="URL Slug *"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value.toLowerCase())}
                      placeholder="car-rental"
                    />
                  </div>
                </>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x divide-y sm:divide-y-0 divide-[#b0b0b0]">
                <StandardInput
                  grouped
                  label="ชื่อหมวดหมู่ (ไทย) *"
                  value={labelTh}
                  onChange={(e) => setLabelTh(e.target.value)}
                />
                <StandardInput
                  grouped
                  label="ชื่อหมวดหมู่ (อังกฤษ)"
                  value={labelEn}
                  onChange={(e) => setLabelEn(e.target.value)}
                />
              </div>

              {editingCategory && (
                <div className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x divide-y sm:divide-y-0 divide-[#b0b0b0]">
                  <StandardInput
                    grouped
                    label="ชื่อย่อบนป้าย (ไทย)"
                    value={shortLabelTh}
                    onChange={(e) => setShortLabelTh(e.target.value)}
                  />
                  <StandardInput
                    grouped
                    label="ข้อความปุ่มหลัก (CTA)"
                    value={defaultCtaTh}
                    onChange={(e) => setDefaultCtaTh(e.target.value)}
                  />
                </div>
              )}
            </StandardFieldGroup>
          </div>

          <div className="space-y-2">
            <p className="ws-caption-medium">สีประจำหมวดหมู่ (Crest Color)</p>
            <div className="flex flex-wrap gap-2">
              {CREST_SWATCHES.map((sw) => (
                <button
                  key={sw.hex}
                  type="button"
                  onClick={() => setCrestHex(sw.hex)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full ws-badge border cursor-pointer transition-colors ${
                    crestHex === sw.hex
                      ? "border-[var(--color-accent)] bg-[var(--color-accent-muted)] text-[var(--color-accent)]"
                      : "border-[var(--color-border)] bg-[var(--color-background-card)] text-[var(--color-text-secondary)] hover:bg-[var(--color-background-muted)]"
                  }`}
                >
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: sw.hex }}
                  />
                  <span>{sw.label}</span>
                </button>
              ))}
            </div>
          </div>

          {editingCategory && (
            <StandardTextarea
              rows={3}
              label="คำอธิบายหมวดหมู่ (ไทย)"
              value={descriptionTh}
              onChange={(e) => setDescriptionTh(e.target.value)}
            />
          )}

          <div className="pt-1">
            <StandardCheckbox
              checked={isActive}
              onChange={setIsActive}
              label="เปิดใช้งาน (แสดงบนหน้าเว็บสาธารณะ)"
            />
          </div>
        </div>
      </AdminSlideSheet>
    </>
  );
}
