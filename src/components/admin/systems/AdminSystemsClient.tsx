"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Bot,
  Globe,
  Loader2,
  Lock,
  Save,
  Search,
  SlidersHorizontal,
  Users,
  X,
} from "lucide-react";
import {
  StandardButton,
  StandardCheckbox,
  StandardFieldGroup,
  StandardInput,
  StandardTextarea,
} from "@/components/ui/standards";
import { ResponsiveSelect } from "@/components/ui/ResponsiveSelect";
import { AdminTableFooter } from "@/components/admin/AdminTableFooter";

type SystemView = "general" | "seo" | "ai-prompts" | "users";

interface AiPromptRow {
  key: string;
  titleTh: string;
  prompt: string;
  updatedAt: string | null;
}

interface AdminUserRow {
  id: string;
  email: string;
  name: string;
  role: "TRAVELLER" | "HOTEL_OWNER" | "SUPER_ADMIN";
  createdAt: string;
  _count: { ownedHotels: number; bookings: number; boards: number };
}

const ROLE_OPTIONS = [
  { value: "TRAVELLER", label: "Traveller" },
  { value: "HOTEL_OWNER", label: "Merchant / Host" },
  { value: "SUPER_ADMIN", label: "Super Admin" },
];

const NAV_ITEMS: Array<{
  id: SystemView;
  labelTh: string;
  icon: typeof SlidersHorizontal;
}> = [
  { id: "general", labelTh: "ตั้งค่าทั่วไป", icon: SlidersHorizontal },
  { id: "seo", labelTh: "SEO & OpenGraph", icon: Globe },
  { id: "ai-prompts", labelTh: "AI Prompts", icon: Bot },
  { id: "users", labelTh: "ผู้ใช้งาน & RBAC", icon: Users },
];

export function AdminSystemsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawView = searchParams.get("view");
  const activeView: SystemView =
    rawView === "seo" || rawView === "ai-prompts" || rawView === "users"
      ? rawView
      : "general";

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // General
  const [siteName, setSiteName] = useState("Nondii");
  const [taglineTh, setTaglineTh] = useState("");
  const [contactEmail, setContactEmail] = useState("deals@nondii.com");
  const [enableAutoExpire, setEnableAutoExpire] = useState(true);

  // SEO
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [ogImageUrl, setOgImageUrl] = useState("");

  // AI Prompts & Users
  const [prompts, setPrompts] = useState<AiPromptRow[]>([]);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [userQuery, setUserQuery] = useState("");
  const [userPage, setUserPage] = useState(1);
  const [userPageSize, setUserPageSize] = useState(50);

  const showToast = (msg: string) => {
    setNotice(msg);
    window.setTimeout(() => {
      setNotice((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  const loadSystems = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/systems", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "โหลดการตั้งค่าระบบไม่สำเร็จ");

      const gen = (json.configs?.settings_general ?? {}) as Record<string, unknown>;
      setSiteName(String(gen.siteName ?? "Nondii"));
      setTaglineTh(String(gen.taglineTh ?? ""));
      setContactEmail(String(gen.contactEmail ?? "deals@nondii.com"));
      setEnableAutoExpire(Boolean(gen.enableAutoExpire ?? true));

      const seo = (json.configs?.global_seo ?? {}) as Record<string, unknown>;
      setMetaTitle(String(seo.metaTitle ?? ""));
      setMetaDescription(String(seo.metaDescription ?? ""));
      setOgImageUrl(String(seo.ogImageUrl ?? ""));

      setPrompts(json.prompts ?? []);
      setUsers(json.users ?? []);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "โหลดการตั้งค่าไม่สำเร็จ");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSystems();
  }, [loadSystems]);

  const setView = (view: SystemView) => {
    router.replace(`/admin/systems?view=${view}`, { scroll: false });
  };

  const handleSaveConfig = async (
    key: "settings_general" | "global_seo",
    value: Record<string, unknown>,
    successMsg: string
  ) => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/systems", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "CONFIG", key, value }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "บันทึกไม่สำเร็จ");
      showToast(successMsg);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePrompt = async (promptRow: AiPromptRow) => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/systems", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "PROMPT",
          key: promptRow.key,
          titleTh: promptRow.titleTh,
          prompt: promptRow.prompt,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "บันทึก Prompt ไม่สำเร็จ");
      showToast(`บันทึก "${promptRow.titleTh}" แล้ว`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangeUserRole = async (
    userId: string,
    nextRole: "TRAVELLER" | "HOTEL_OWNER" | "SUPER_ADMIN"
  ) => {
    setBusyUserId(userId);
    try {
      const res = await fetch("/api/super-admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: nextRole }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "อัปเดตสิทธิ์ไม่สำเร็จ");
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: nextRole } : u))
      );
      showToast("อัปเดตสิทธิ์เรียบร้อย");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "อัปเดตสิทธิ์ไม่สำเร็จ");
    } finally {
      setBusyUserId(null);
    }
  };

  const filteredUsers = useMemo(() => {
    const q = userQuery.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      `${u.name} ${u.email} ${u.role}`.toLowerCase().includes(q)
    );
  }, [users, userQuery]);

  const pagedUsers = useMemo(
    () =>
      filteredUsers.slice(
        (userPage - 1) * userPageSize,
        userPage * userPageSize
      ),
    [filteredUsers, userPage, userPageSize]
  );

  return (
    <div className="cgr-admin-page">
      {/* Single Compact Toolbar with Inline View Pills */}
      <div className="cgr-admin-toolbar">
        <div className="flex items-center gap-2.5 min-w-0 overflow-x-auto no-scrollbar">
          <h1 className="text-[14.5px] font-bold text-[var(--color-text-primary)] whitespace-nowrap">
            ตั้งค่าระบบ
          </h1>
          <span className="w-px h-4 bg-[var(--color-border)] shrink-0" />
          <div className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = activeView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setView(item.id)}
                  className={`h-7.5 px-3 rounded-full text-[12.5px] font-semibold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
                    active
                      ? "bg-[var(--color-accent)] !text-[var(--color-on-accent)]"
                      : "text-[var(--color-text-secondary)] hover:bg-[var(--color-background-muted)] hover:text-[var(--color-text-primary)]"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.labelTh}</span>
                  {item.id === "users" && (
                    <span className="text-[11px] tabular-nums opacity-85">
                      {users.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {activeView === "users" && (
          <div className="relative w-[200px]">
            <Search className="w-3.5 h-3.5 text-[var(--color-text-tertiary)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={userQuery}
              onChange={(e) => {
                setUserQuery(e.target.value);
                setUserPage(1);
              }}
              placeholder="ค้นหาชื่อ, อีเมล, สิทธิ์..."
              className="w-full h-7.5 pl-8 pr-3 rounded-full bg-[var(--color-background-muted)] text-[12.5px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
            />
          </div>
        )}
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

      {/* Body */}
      {isLoading ? (
        <div className="p-6 text-[13px] text-[var(--color-text-secondary)]">
          กำลังโหลดการตั้งค่า...
        </div>
      ) : activeView === "users" ? (
        <>
          <div className="cgr-admin-body">
            <table className="w-full text-left border-collapse min-w-[780px]">
              <thead className="sticky top-0 z-10 bg-[var(--color-background-body)]">
                <tr className="h-[34px] border-b border-[var(--color-border)] text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--color-text-secondary)]">
                  <th className="px-4 w-[24%]">ชื่อผู้ใช้</th>
                  <th className="px-3 w-[28%]">อีเมล</th>
                  <th className="px-3 text-right whitespace-nowrap">สถานที่</th>
                  <th className="px-3 text-right whitespace-nowrap">การจอง</th>
                  <th className="px-3 text-right whitespace-nowrap">ทริป</th>
                  <th className="px-4 text-right whitespace-nowrap">สิทธิ์ (RBAC)</th>
                </tr>
              </thead>
              <tbody>
                {pagedUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-10 text-center text-[13px] text-[var(--color-text-secondary)] border-b border-[var(--color-border)]"
                    >
                      ไม่พบผู้ใช้งาน
                    </td>
                  </tr>
                ) : (
                  pagedUsers.map((u) => {
                    const isFounder = u.email === "cangaroomapp@gmail.com";
                    return (
                      <tr
                        key={u.id}
                        className="h-[38px] border-b border-[var(--color-border)] hover:bg-[var(--color-background-muted)]/60 transition-colors text-[13px]"
                      >
                        <td className="px-4 font-semibold text-[var(--color-text-primary)] max-w-[220px] truncate">
                          {u.name || "ผู้ใช้งาน Nondii"}
                        </td>
                        <td className="px-3 text-[12.5px] text-[var(--color-text-secondary)] max-w-[260px] truncate font-mono">
                          {u.email}
                        </td>
                        <td className="px-3 text-right tabular-nums text-[12.5px]">
                          {u._count.ownedHotels}
                        </td>
                        <td className="px-3 text-right tabular-nums text-[12.5px] text-[var(--color-text-secondary)]">
                          {u._count.bookings}
                        </td>
                        <td className="px-3 text-right tabular-nums text-[12.5px] text-[var(--color-text-secondary)]">
                          {u._count.boards}
                        </td>
                        <td className="px-4 text-right whitespace-nowrap">
                          {isFounder ? (
                            <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--color-accent)]">
                              <Lock className="w-3 h-3" />
                              <span>Founder Admin</span>
                            </span>
                          ) : (
                            <div
                              className={`inline-block w-[150px] text-left ${
                                busyUserId === u.id
                                  ? "opacity-50 pointer-events-none"
                                  : ""
                              }`}
                            >
                              <ResponsiveSelect
                                value={u.role}
                                onChange={(nextVal) =>
                                  handleChangeUserRole(
                                    u.id,
                                    nextVal as
                                      | "TRAVELLER"
                                      | "HOTEL_OWNER"
                                      | "SUPER_ADMIN"
                                  )
                                }
                                options={ROLE_OPTIONS}
                                sheetTitle={`เปลี่ยนสิทธิ์: ${u.email}`}
                                triggerClassName="w-full h-6.5 px-2.5 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[12px] font-semibold text-[var(--color-text-primary)]"
                                dropdownClassName="min-w-[180px] right-0"
                              />
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <AdminTableFooter
            totalItems={filteredUsers.length}
            page={userPage}
            pageSize={userPageSize}
            onPageChange={setUserPage}
            onPageSizeChange={setUserPageSize}
          />
        </>
      ) : activeView === "general" ? (
        <div className="cgr-admin-body">
          <div className="max-w-[720px] px-4 sm:px-6 py-5 space-y-5">
            <div className="pb-3 border-b border-[var(--color-border)]">
              <h2 className="text-[14.5px] font-bold text-[var(--color-text-primary)]">
                ตั้งค่าทั่วไปของแพลตฟอร์ม
              </h2>
              <p className="text-[12.5px] text-[var(--color-text-secondary)]">
                ชื่อแพลตฟอร์ม, อีเมลรับโปรโมชั่น และนโยบายซ่อนโปรหมดอายุอัตโนมัติ
              </p>
            </div>

            <StandardFieldGroup>
              <StandardInput
                grouped
                label="ชื่อแพลตฟอร์ม"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
              />
              <StandardInput
                grouped
                label="สโลแกนหลัก (ภาษาไทย)"
                value={taglineTh}
                onChange={(e) => setTaglineTh(e.target.value)}
              />
              <StandardInput
                grouped
                label="อีเมลรับโปรโมชั่น / Inbound Webhook"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
              />
            </StandardFieldGroup>

            <StandardCheckbox
              checked={enableAutoExpire}
              onChange={setEnableAutoExpire}
              label="เปิดใช้งาน Auto-Expire อัตโนมัติ (ซ่อนโปรที่หมดอายุออกจากหน้าแรก)"
            />

            <div className="pt-4 border-t border-[var(--color-border)] flex justify-end">
              <StandardButton
                type="button"
                variant="primary"
                size="sm"
                disabled={isSaving}
                onClick={() =>
                  handleSaveConfig(
                    "settings_general",
                    {
                      siteName: siteName.trim(),
                      taglineTh: taglineTh.trim(),
                      contactEmail: contactEmail.trim(),
                      defaultLanguage: "th",
                      enableAutoExpire,
                    },
                    "บันทึกการตั้งค่าทั่วไปแล้ว"
                  )
                }
              >
                {isSaving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>บันทึกการตั้งค่า</span>
              </StandardButton>
            </div>
          </div>
        </div>
      ) : activeView === "seo" ? (
        <div className="cgr-admin-body">
          <div className="max-w-[720px] px-4 sm:px-6 py-5 space-y-4">
            <div className="pb-3 border-b border-[var(--color-border)]">
              <h2 className="text-[14.5px] font-bold text-[var(--color-text-primary)]">
                SEO &amp; OpenGraph ส่วนกลาง
              </h2>
              <p className="text-[12.5px] text-[var(--color-text-secondary)]">
                กำหนด Meta Title, Meta Description และภาพแชร์หลักของ Nondii
              </p>
            </div>

            <StandardInput
              label="Global Meta Title"
              value={metaTitle}
              onChange={(e) => setMetaTitle(e.target.value)}
            />
            <StandardTextarea
              label="Global Meta Description"
              rows={3}
              value={metaDescription}
              onChange={(e) => setMetaDescription(e.target.value)}
            />
            <StandardInput
              label="Default OG Share Image URL"
              value={ogImageUrl}
              onChange={(e) => setOgImageUrl(e.target.value)}
            />

            <div className="pt-4 border-t border-[var(--color-border)] flex justify-end">
              <StandardButton
                type="button"
                variant="primary"
                size="sm"
                disabled={isSaving}
                onClick={() =>
                  handleSaveConfig(
                    "global_seo",
                    {
                      metaTitle: metaTitle.trim(),
                      metaDescription: metaDescription.trim(),
                      ogImageUrl: ogImageUrl.trim(),
                    },
                    "บันทึก SEO เรียบร้อย"
                  )
                }
              >
                {isSaving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>บันทึก SEO</span>
              </StandardButton>
            </div>
          </div>
        </div>
      ) : (
        <div className="cgr-admin-body divide-y divide-[var(--color-border)]">
          {prompts.map((item) => (
            <div key={item.key} className="max-w-[820px] px-4 sm:px-6 py-5 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[14px] font-bold text-[var(--color-text-primary)] truncate">
                    {item.titleTh}
                  </p>
                  <p className="text-[11.5px] font-mono text-[var(--color-text-secondary)]">
                    {item.key}
                  </p>
                </div>
                <StandardButton
                  type="button"
                  variant="primary"
                  size="sm"
                  disabled={isSaving}
                  onClick={() => handleSavePrompt(item)}
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>บันทึก Prompt</span>
                </StandardButton>
              </div>

              <StandardTextarea
                label="System Prompt Instruction"
                rows={4}
                value={item.prompt}
                onChange={(e) => {
                  const nextVal = e.target.value;
                  setPrompts((prev) =>
                    prev.map((p) =>
                      p.key === item.key ? { ...p, prompt: nextVal } : p
                    )
                  );
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
