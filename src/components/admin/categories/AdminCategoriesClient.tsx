"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Loader2,
  Lock,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import {
  StandardButton,
  StandardFieldGroup,
  StandardInput,
  StandardSelectField,
  StandardTextarea,
} from "@/components/ui/standards";
import { useModalPresence } from "@/lib/useModalPresence";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";

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

export function AdminCategoriesClient() {
  const [categories, setCategories] = useState<PlaceCategoryConfigRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRootId, setSelectedRootId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [editLabelTh, setEditLabelTh] = useState("");
  const [editLabelEn, setEditLabelEn] = useState("");
  const [editShortLabelTh, setEditShortLabelTh] = useState("");
  const [editDefaultCtaTh, setEditDefaultCtaTh] = useState("");
  const [editDescriptionTh, setEditDescriptionTh] = useState("");
  const [editCrestHex, setEditCrestHex] = useState("#1e78d6");
  const [editIsActive, setEditIsActive] = useState(true);

  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createParentId, setCreateParentId] = useState<string>("");
  const [createCode, setCreateCode] = useState("");
  const [createSlug, setCreateSlug] = useState("");
  const [createLabelTh, setCreateLabelTh] = useState("");
  const [createLabelEn, setCreateLabelEn] = useState("");
  const [createCrestHex, setCreateCrestHex] = useState("#1e78d6");
  const [isCreating, setIsCreating] = useState(false);

  const { shouldRender: renderCreate, dataState: createState } =
    useModalPresence(isCreateOpen, 250);
  useBodyScrollLock(renderCreate);

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
        prev && roots.some((r) => r.id === prev) ? prev : roots[0]?.id ?? null
      );
      setEditingId((prev) =>
        prev && list.some((c) => c.id === prev) ? prev : roots[0]?.id ?? null
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
    [categories]
  );

  const subCategories = useMemo(
    () =>
      categories
        .filter((c) => c.parentId === selectedRootId)
        .sort((a, b) => a.position - b.position),
    [categories, selectedRootId]
  );

  const editingCategory = useMemo(
    () => categories.find((c) => c.id === editingId) ?? null,
    [categories, editingId]
  );

  useEffect(() => {
    if (!editingCategory) return;
    setEditLabelTh(editingCategory.labelTh);
    setEditLabelEn(editingCategory.labelEn);
    setEditShortLabelTh(editingCategory.shortLabelTh || editingCategory.labelTh);
    setEditDefaultCtaTh(editingCategory.defaultCtaTh || "ดูโปรโมชั่น");
    setEditDescriptionTh(editingCategory.descriptionTh || "");
    setEditCrestHex(editingCategory.crestBgHex || "#1e78d6");
    setEditIsActive(editingCategory.isActive);
  }, [editingCategory]);

  const handleToggleActive = async (cat: PlaceCategoryConfigRow) => {
    const nextActive = !cat.isActive;
    setCategories((prev) =>
      prev.map((c) => (c.id === cat.id ? { ...c, isActive: nextActive } : c))
    );
    try {
      const res = await fetch("/api/admin/categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: cat.id, isActive: nextActive }),
      });
      if (!res.ok) throw new Error();
      showToast(
        nextActive ? `เปิดหมวด "${cat.labelTh}" แล้ว` : `ซ่อนหมวด "${cat.labelTh}" แล้ว`
      );
    } catch {
      await loadCategories();
      showToast("อัปเดตสถานะไม่สำเร็จ");
    }
  };

  const handleReorder = async (
    siblings: PlaceCategoryConfigRow[],
    index: number,
    direction: -1 | 1
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
      })
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

  const handleSaveInspector = async () => {
    if (!editingCategory) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingCategory.id,
          labelTh: editLabelTh.trim(),
          labelEn: editLabelEn.trim(),
          shortLabelTh: editShortLabelTh.trim(),
          defaultCtaTh: editDefaultCtaTh.trim(),
          descriptionTh: editDescriptionTh.trim(),
          crestBgHex: editCrestHex,
          isActive: editIsActive,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "บันทึกไม่สำเร็จ");
      showToast(`บันทึก "${editLabelTh.trim()}" แล้ว`);
      await loadCategories();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
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
        { method: "DELETE" }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "ลบไม่สำเร็จ");
      showToast(`ลบ "${cat.labelTh}" แล้ว`);
      await loadCategories();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "ลบไม่สำเร็จ");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createLabelTh.trim() || !createCode.trim() || !createSlug.trim()) {
      showToast("กรุณากรอกชื่อไทย, Code และ Slug ให้ครบถ้วน");
      return;
    }
    setIsCreating(true);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: createCode.trim().toUpperCase(),
          slug: createSlug.trim().toLowerCase(),
          labelTh: createLabelTh.trim(),
          labelEn: createLabelEn.trim() || createLabelTh.trim(),
          crestBgHex: createCrestHex,
          parentId: createParentId || null,
          isActive: true,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "สร้างหมวดหมู่ไม่สำเร็จ");
      setIsCreateOpen(false);
      setCreateCode("");
      setCreateSlug("");
      setCreateLabelTh("");
      setCreateLabelEn("");
      showToast(`เพิ่มหมวด "${createLabelTh.trim()}" แล้ว`);
      await loadCategories();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "สร้างหมวดหมู่ไม่สำเร็จ");
    } finally {
      setIsCreating(false);
    }
  };

  const openCreateModal = (defaultParentId = "") => {
    setCreateParentId(defaultParentId);
    const parent = roots.find((r) => r.id === defaultParentId);
    setCreateCrestHex(parent?.crestBgHex || "#1e78d6");
    setIsCreateOpen(true);
  };

  return (
    <div className="cgr-admin-page">
      {/* Compact Flush Toolbar */}
      <div className="cgr-admin-toolbar">
        <div className="flex items-center gap-2.5 min-w-0">
          <h1 className="text-[14.5px] font-bold text-[var(--color-text-primary)] truncate">
            หมวดหมู่โปรโมชั่น
          </h1>
          <span className="text-[12px] text-[var(--color-text-secondary)] hidden sm:inline tabular-nums">
            {roots.length} หมวดหลัก · {categories.length - roots.length} หมวดย่อย
          </span>
        </div>

        <button
          type="button"
          onClick={() => openCreateModal("")}
          className="h-7.5 px-3 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] text-[12px] font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>เพิ่มหมวดหมู่</span>
        </button>
      </div>

      {notice && (
        <div className="px-4 py-1.5 border-b border-[var(--color-border)] bg-[var(--color-background-muted)] flex items-center justify-between gap-2 text-[12.5px] font-medium shrink-0">
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

      {/* Flush 3-Pane Split (Zero Outer Boxes, Pure border-b + border-r) */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[var(--color-border)] overflow-y-auto lg:overflow-hidden">
        {/* Pane 1: L1 Roots */}
        <section className="lg:col-span-4 flex flex-col min-h-0">
          <div className="h-[34px] px-4 border-b border-[var(--color-border)] flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--color-text-secondary)] shrink-0">
            <span>หมวดหลัก ({roots.length})</span>
            <span>แสดง / ลำดับ</span>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <p className="px-4 py-8 text-[12.5px] text-[var(--color-text-secondary)]">
                กำลังโหลด...
              </p>
            ) : (
              roots.map((cat, idx) => {
                const isInspecting = editingId === cat.id;
                const isRootSelected = selectedRootId === cat.id;
                return (
                  <div
                    key={cat.id}
                    className={`h-[38px] px-4 border-b border-[var(--color-border)] flex items-center gap-2 transition-colors ${
                      isInspecting
                        ? "bg-[var(--color-accent)]/8"
                        : isRootSelected
                        ? "bg-[var(--color-background-muted)]/60"
                        : "hover:bg-[var(--color-background-muted)]/50"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRootId(cat.id);
                        setEditingId(cat.id);
                      }}
                      className="flex-1 min-w-0 flex items-center gap-2 text-left cursor-pointer"
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: cat.crestBgHex }}
                      />
                      <span
                        className={`text-[13px] truncate ${
                          isInspecting
                            ? "font-semibold text-[var(--color-accent)]"
                            : "font-medium text-[var(--color-text-primary)]"
                        }`}
                      >
                        {cat.labelTh}
                      </span>
                      <span className="text-[11.5px] text-[var(--color-text-tertiary)] tabular-nums shrink-0">
                        ({cat.placesCount})
                      </span>
                    </button>

                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleReorder(roots, idx, -1)}
                        aria-label="เลื่อนขึ้น"
                        className="h-6 w-6 rounded-full hover:bg-[var(--color-background-subtle)] text-[var(--color-text-secondary)] inline-flex items-center justify-center cursor-pointer disabled:opacity-25"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === roots.length - 1}
                        onClick={() => handleReorder(roots, idx, 1)}
                        aria-label="เลื่อนลง"
                        className="h-6 w-6 rounded-full hover:bg-[var(--color-background-subtle)] text-[var(--color-text-secondary)] inline-flex items-center justify-center cursor-pointer disabled:opacity-25"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={cat.isActive}
                        aria-label={`สลับ ${cat.labelTh}`}
                        onClick={() => handleToggleActive(cat)}
                        className={`relative ml-1 inline-flex h-4.5 w-8 items-center rounded-full transition-colors cursor-pointer ${
                          cat.isActive
                            ? "bg-[var(--color-accent)]"
                            : "bg-[var(--color-border-emphasized)]"
                        }`}
                      >
                        <span
                          className={`inline-block h-3 w-3 rounded-full bg-white transition-transform duration-150 ${
                            cat.isActive ? "translate-x-4" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Pane 2: L2 Sub-Categories */}
        <section className="lg:col-span-4 flex flex-col min-h-0">
          <div className="h-[34px] px-4 border-b border-[var(--color-border)] flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--color-text-secondary)] shrink-0">
            <span>หมวดย่อย ({subCategories.length})</span>
            {selectedRootId && (
              <button
                type="button"
                onClick={() => openCreateModal(selectedRootId)}
                className="text-[11.5px] font-semibold text-[var(--color-accent)] hover:underline inline-flex items-center gap-0.5 cursor-pointer normal-case"
              >
                <Plus className="w-3 h-3" />
                <span>เพิ่มหมวดย่อย</span>
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {subCategories.length === 0 ? (
              <p className="px-4 py-8 text-[12.5px] text-[var(--color-text-secondary)]">
                ยังไม่มีหมวดย่อยในหมวดนี้
              </p>
            ) : (
              subCategories.map((sub, idx) => {
                const isInspecting = editingId === sub.id;
                return (
                  <div
                    key={sub.id}
                    className={`h-[38px] px-4 border-b border-[var(--color-border)] flex items-center gap-2 transition-colors ${
                      isInspecting
                        ? "bg-[var(--color-accent)]/8"
                        : "hover:bg-[var(--color-background-muted)]/50"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setEditingId(sub.id)}
                      className="flex-1 min-w-0 flex items-center gap-2 text-left cursor-pointer"
                    >
                      <span
                        className={`text-[13px] truncate ${
                          isInspecting
                            ? "font-semibold text-[var(--color-accent)]"
                            : "font-medium text-[var(--color-text-primary)]"
                        }`}
                      >
                        {sub.labelTh}
                      </span>
                      <span className="text-[11.5px] text-[var(--color-text-tertiary)] font-mono truncate">
                        /{sub.slug}
                      </span>
                    </button>

                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleReorder(subCategories, idx, -1)}
                        aria-label="เลื่อนขึ้น"
                        className="h-6 w-6 rounded-full hover:bg-[var(--color-background-subtle)] text-[var(--color-text-secondary)] inline-flex items-center justify-center cursor-pointer disabled:opacity-25"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === subCategories.length - 1}
                        onClick={() => handleReorder(subCategories, idx, 1)}
                        aria-label="เลื่อนลง"
                        className="h-6 w-6 rounded-full hover:bg-[var(--color-background-subtle)] text-[var(--color-text-secondary)] inline-flex items-center justify-center cursor-pointer disabled:opacity-25"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={sub.isActive}
                        aria-label={`สลับ ${sub.labelTh}`}
                        onClick={() => handleToggleActive(sub)}
                        className={`relative ml-1 inline-flex h-4.5 w-8 items-center rounded-full transition-colors cursor-pointer ${
                          sub.isActive
                            ? "bg-[var(--color-accent)]"
                            : "bg-[var(--color-border-emphasized)]"
                        }`}
                      >
                        <span
                          className={`inline-block h-3 w-3 rounded-full bg-white transition-transform duration-150 ${
                            sub.isActive ? "translate-x-4" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Pane 3: Flush Inspector */}
        <section className="lg:col-span-4 flex flex-col min-h-0">
          <div className="h-[34px] px-4 border-b border-[var(--color-border)] flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--color-text-secondary)] shrink-0">
            <span>รายละเอียดหมวดที่เลือก</span>
            {editingCategory?.isSystem && (
              <span className="inline-flex items-center gap-1 normal-case">
                <Lock className="w-3 h-3" /> System Root
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {editingCategory ? (
              <>
                <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: editCrestHex }}
                    />
                    <span className="text-[14px] font-bold text-[var(--color-text-primary)] truncate">
                      {editLabelTh || editingCategory.labelTh}
                    </span>
                  </div>
                  <span className="text-[11.5px] font-mono text-[var(--color-text-secondary)]">
                    {editingCategory.code}
                  </span>
                </div>

                <StandardFieldGroup>
                  <StandardInput
                    grouped
                    label="ชื่อหมวดหมู่ (ภาษาไทย)"
                    value={editLabelTh}
                    onChange={(e) => setEditLabelTh(e.target.value)}
                  />
                  <StandardInput
                    grouped
                    label="ชื่อหมวดหมู่ (English)"
                    value={editLabelEn}
                    onChange={(e) => setEditLabelEn(e.target.value)}
                  />
                  <div className="grid grid-cols-2 divide-x divide-[#b0b0b0] dark:divide-[var(--color-border-emphasized)]">
                    <StandardInput
                      grouped
                      label="ชื่อสั้นบนแท็บ"
                      value={editShortLabelTh}
                      onChange={(e) => setEditShortLabelTh(e.target.value)}
                    />
                    <StandardInput
                      grouped
                      label="ปุ่ม CTA เริ่มต้น"
                      value={editDefaultCtaTh}
                      onChange={(e) => setEditDefaultCtaTh(e.target.value)}
                    />
                  </div>
                </StandardFieldGroup>

                <StandardTextarea
                  label="คำอธิบายหมวดหมู่"
                  rows={2}
                  value={editDescriptionTh}
                  onChange={(e) => setEditDescriptionTh(e.target.value)}
                />

                <div className="space-y-1.5">
                  <p className="text-[12px] font-medium text-[var(--color-text-secondary)]">
                    สีตราสัญลักษณ์ (Matte Crest)
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    {CREST_SWATCHES.map((sw) => {
                      const selected =
                        editCrestHex.toLowerCase() === sw.hex.toLowerCase();
                      return (
                        <button
                          key={sw.hex}
                          type="button"
                          title={sw.label}
                          onClick={() => setEditCrestHex(sw.hex)}
                          style={{ backgroundColor: sw.hex }}
                          className={`h-7 w-7 rounded-full inline-flex items-center justify-center text-white cursor-pointer ${
                            selected
                              ? "ring-2 ring-offset-2 ring-[var(--color-text-primary)] dark:ring-offset-[#11161d]"
                              : "opacity-80 hover:opacity-100"
                          }`}
                        >
                          {selected && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-3 border-t border-[var(--color-border)] flex items-center justify-between gap-2">
                  {!editingCategory.isSystem ? (
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => handleDeleteCategory(editingCategory)}
                      className="h-8 px-3 rounded-full hover:bg-[var(--color-background-muted)] text-[var(--color-text-secondary)] hover:text-[#e60023] text-[12.5px] font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>ลบหมวด</span>
                    </button>
                  ) : (
                    <span className="text-[11.5px] text-[var(--color-text-tertiary)]">
                      ล็อกหมวดหลักระบบ
                    </span>
                  )}

                  <StandardButton
                    type="button"
                    variant="primary"
                    size="sm"
                    disabled={isSaving}
                    onClick={handleSaveInspector}
                  >
                    {isSaving ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    <span>บันทึก</span>
                  </StandardButton>
                </div>
              </>
            ) : (
              <p className="text-[13px] text-[var(--color-text-secondary)]">
                เลือกหมวดหมู่ทางซ้ายเพื่อแก้ไข
              </p>
            )}
          </div>
        </section>
      </div>

      {/* Create Modal */}
      {renderCreate &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="เพิ่มหมวดหมู่โปรโมชั่น"
            data-state={createState}
            onClick={() => setIsCreateOpen(false)}
            className="cgr-modal-backdrop fixed inset-0 z-[95] bg-black/45 backdrop-blur-[2px] flex items-end sm:items-center justify-center sm:p-4"
          >
            <form
              data-state={createState}
              onClick={(e) => e.stopPropagation()}
              onSubmit={handleCreateCategory}
              className="cgr-modal-surface-md w-full sm:max-w-[500px] rounded-t-[24px] sm:rounded-[24px] bg-[var(--color-background-popover)] shadow-[var(--shadow-popover)] overflow-hidden"
            >
              <div
                aria-hidden="true"
                className="sm:hidden h-1 w-10 rounded-full bg-[var(--color-border-emphasized)] mx-auto mt-3"
              />
              <div className="px-5 py-3.5 border-b border-[var(--color-border)] flex items-center justify-between">
                <h3 className="text-[15.5px] font-bold text-[var(--color-text-primary)]">
                  เพิ่มหมวดหมู่โปรโมชั่นใหม่
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

              <div className="p-5 space-y-3.5">
                <StandardSelectField
                  label="อยู่ภายใต้หมวดหลัก"
                  value={createParentId}
                  onChange={setCreateParentId}
                  options={[
                    { value: "", label: "สร้างเป็นหมวดหลักใหม่ (Level 1)" },
                    ...roots.map((r) => ({
                      value: r.id,
                      label: `หมวดย่อยใต้ "${r.labelTh}"`,
                    })),
                  ]}
                />

                <StandardFieldGroup>
                  <StandardInput
                    grouped
                    required
                    label="ชื่อหมวดหมู่ (ภาษาไทย)"
                    value={createLabelTh}
                    onChange={(e) => setCreateLabelTh(e.target.value)}
                    placeholder="เช่น คาเฟ่ริมทะเล"
                  />
                  <StandardInput
                    grouped
                    label="ชื่อหมวดหมู่ (English)"
                    value={createLabelEn}
                    onChange={(e) => setCreateLabelEn(e.target.value)}
                    placeholder="เช่น Beachfront Cafes"
                  />
                  <div className="grid grid-cols-2 divide-x divide-[#b0b0b0] dark:divide-[var(--color-border-emphasized)]">
                    <StandardInput
                      grouped
                      required
                      label="CODE"
                      value={createCode}
                      onChange={(e) =>
                        setCreateCode(
                          e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "_")
                        )
                      }
                      placeholder="BEACH_CAFE"
                    />
                    <StandardInput
                      grouped
                      required
                      label="Slug"
                      value={createSlug}
                      onChange={(e) =>
                        setCreateSlug(
                          e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-")
                        )
                      }
                      placeholder="beach-cafe"
                    />
                  </div>
                </StandardFieldGroup>

                <div className="flex items-center gap-2 pt-1">
                  {CREST_SWATCHES.map((sw) => (
                    <button
                      key={sw.hex}
                      type="button"
                      onClick={() => setCreateCrestHex(sw.hex)}
                      style={{ backgroundColor: sw.hex }}
                      className={`h-7 w-7 rounded-full inline-flex items-center justify-center text-white cursor-pointer ${
                        createCrestHex === sw.hex
                          ? "ring-2 ring-offset-2 ring-[var(--color-text-primary)] dark:ring-offset-[#1e2736]"
                          : "opacity-80 hover:opacity-100"
                      }`}
                    >
                      {createCrestHex === sw.hex && (
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="px-5 py-3.5 border-t border-[var(--color-border)] flex items-center justify-end gap-2 pb-[max(14px,env(safe-area-inset-bottom))]">
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
                  {isCreating ? "กำลังสร้าง..." : "สร้างหมวดหมู่"}
                </StandardButton>
              </div>
            </form>
          </div>,
          document.body
        )}
    </div>
  );
}
