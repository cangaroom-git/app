"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Bot,
  Check,
  Clock,
  FileText,
  Globe,
  Image as ImageIcon,
  Loader2,
  Lock,
  Mail,
  Settings,
  Type,
  Users,
  X,
} from "lucide-react";
import {
  AdminDataTable,
  type AdminColumn,
} from "@/components/admin/ui/AdminDataTable";
import { ResponsiveSelect } from "@/components/ui/ResponsiveSelect";
import {
  StandardFieldGroup,
  StandardInput,
  StandardTextarea,
} from "@/components/ui/standards";
import { WorkspaceCompactToolbar } from "@/components/workspace/WorkspacePrimitives";
import { WorkspaceSplitLayout } from "@/components/workspace/WorkspaceSplitLayout";

type SystemView = "main" | "general" | "seo" | "ai-prompts" | "users";

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

const SIDEBAR_ITEMS: Array<{
  key: Exclude<SystemView, "main">;
  icon: typeof Settings;
  label: string;
  description: string;
  view: Exclude<SystemView, "main">;
}> = [
  {
    key: "general",
    icon: Settings,
    label: "ทั่วไป",
    description: "ชื่อเว็บ คำโปรย อีเมลรับโปร และระบบหมดอายุอัตโนมัติ",
    view: "general",
  },
  {
    key: "seo",
    icon: Globe,
    label: "SEO & การค้นหา",
    description: "Meta Title, OG Image และตัวอย่างบน Google",
    view: "seo",
  },
  {
    key: "ai-prompts",
    icon: Bot,
    label: "คำสั่ง AI (Prompts)",
    description: "กติกาให้ Gemini Vision แกะโปสเตอร์โปรโมชั่น",
    view: "ai-prompts",
  },
  {
    key: "users",
    icon: Users,
    label: "ผู้ใช้งาน & สิทธิ์",
    description: "นักเดินทาง เจ้าของธุรกิจ และผู้ดูแลระบบ",
    view: "users",
  },
];

const BATCH_SIZE = 50;

// ─── Unified Airbnb Clean Minimal Building Blocks (Matches /account & /studio/settings 1:1) ───
function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="divide-y divide-[var(--color-border)]">{children}</div>
  );
}

function SectionRow({
  icon: Icon,
  label,
  description,
  children,
}: {
  icon: typeof Type;
  label: string;
  description?: string;
  children: React.ReactNode;
  noBorder?: boolean;
}) {
  return (
    <div className="ws-row first:pt-2 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-[var(--color-background-muted)] text-[var(--color-accent)] flex items-center justify-center shrink-0 mt-0.5">
          <Icon size={16} />
        </div>
        <div className="min-w-0">
          <p className="ws-subtitle">{label}</p>
          {description && <p className="ws-caption mt-0.5">{description}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function SaveActionButton({
  saving,
  onSave,
  label = "บันทึก",
}: {
  saving: boolean;
  onSave: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onSave}
      disabled={saving}
      className="h-10 px-5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] text-[14px] font-semibold rounded-full disabled:opacity-50 transition-colors inline-flex items-center gap-2 cursor-pointer shrink-0"
    >
      {saving ? (
        <Loader2 size={15} className="animate-spin" />
      ) : (
        <Check size={15} />
      )}
      <span>{saving ? "กำลังบันทึก..." : label}</span>
    </button>
  );
}

/**
 * 1:1 WeGlobal `SettingsClient` (Apple macOS Settings 2-Column Layout) for `/admin/systems`
 * - Desktop/Tablet: `max-w-7xl mx-auto` 2-column split (Left `w-64 xl:w-72` sidebar + Right scrollable content)
 * - Mobile: iOS Settings drill-down menu (`main` list → sub-page with `< Back`)
 * - All primary buttons & headings styled in Nondii Travel-Blue (`var(--color-accent)`)
 */
export function AdminSystemsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawView = searchParams.get("view") as SystemView | null;
  const initialDesktopView: Exclude<SystemView, "main"> =
    rawView === "seo" || rawView === "ai-prompts" || rawView === "users"
      ? rawView
      : "general";

  const [currentView, setCurrentView] = useState<Exclude<SystemView, "main">>(
    initialDesktopView,
  );
  const [mobileView, setMobileView] = useState<"list" | "detail">(
    rawView && ["general", "seo", "ai-prompts", "users"].includes(rawView)
      ? "detail"
      : "list",
  );

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
  const [visibleUsers, setVisibleUsers] = useState(BATCH_SIZE);

  useEffect(() => {
    setCurrentView(initialDesktopView);
  }, [initialDesktopView]);

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

      const gen = (json.configs?.settings_general ?? {}) as Record<
        string,
        unknown
      >;
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

  const navigateView = (view: Exclude<SystemView, "main">) => {
    setCurrentView(view);
    setMobileView("detail");
    router.replace(`/admin/systems?view=${view}`, { scroll: false });
  };

  const handleSaveConfig = async (
    key: "settings_general" | "global_seo",
    value: Record<string, unknown>,
    successMsg: string,
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
    nextRole: "TRAVELLER" | "HOTEL_OWNER" | "SUPER_ADMIN",
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
        prev.map((u) => (u.id === userId ? { ...u, role: nextRole } : u)),
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
      `${u.name} ${u.email} ${u.role}`.toLowerCase().includes(q),
    );
  }, [users, userQuery]);

  const slicedUsers = useMemo(
    () => filteredUsers.slice(0, visibleUsers),
    [filteredUsers, visibleUsers],
  );

  const userColumns: AdminColumn<AdminUserRow>[] = useMemo(
    () => [
      {
        header: "ชื่อผู้ใช้",
        accessorKey: "name",
        className: "min-w-[180px]",
        cell: (u) => (
          <span className="ws-body-medium">{u.name || "Nondii User"}</span>
        ),
      },
      {
        header: "อีเมล",
        accessorKey: "email",
        className: "min-w-[220px]",
        cell: (u) => <span className="ws-caption">{u.email}</span>,
      },
      {
        header: "สถานที่",
        className: "w-[70px] text-center whitespace-nowrap",
        cell: (u) => (
          <span className="ws-body tabular-nums">{u._count.ownedHotels}</span>
        ),
      },
      {
        header: "การจอง",
        className: "w-[80px] text-center whitespace-nowrap",
        cell: (u) => (
          <span className="ws-body tabular-nums">{u._count.bookings}</span>
        ),
      },
      {
        header: "ทริป",
        className: "w-[70px] text-center whitespace-nowrap",
        cell: (u) => (
          <span className="ws-body tabular-nums">{u._count.boards}</span>
        ),
      },
      {
        header: "สิทธิ์การใช้งาน",
        accessorKey: "role",
        className: "w-[170px] text-right whitespace-nowrap",
        cell: (u) => {
          const isFounder = u.email === "cangaroomapp@gmail.com";
          if (isFounder) {
            return (
              <span className="inline-flex items-center gap-1 ws-badge text-[var(--color-accent)] bg-[var(--color-accent-muted)] px-2.5 py-1 rounded-full">
                <Lock size={11} />
                <span>Founder Admin</span>
              </span>
            );
          }
          return (
            <div
              className={`inline-block w-[150px] text-left ${
                busyUserId === u.id ? "opacity-50 pointer-events-none" : ""
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <ResponsiveSelect
                value={u.role}
                onChange={(nextVal) =>
                  handleChangeUserRole(
                    u.id,
                    nextVal as "TRAVELLER" | "HOTEL_OWNER" | "SUPER_ADMIN",
                  )
                }
                options={ROLE_OPTIONS}
                sheetTitle={`Role: ${u.email}`}
                triggerClassName="w-full h-9 px-3 rounded-full border border-[var(--color-border)] bg-[var(--color-background-card)] ws-caption-medium !text-[var(--color-text-primary)] hover:bg-[var(--color-background-muted)]"
                dropdownClassName="min-w-[180px] right-0"
              />
            </div>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [busyUserId],
  );

  const desktopView: Exclude<SystemView, "main"> = currentView;

  const renderContent = (view: Exclude<SystemView, "main">) => {
    if (isLoading) {
      return (
        <div className="p-10 text-center ws-caption">
          <Loader2 className="animate-spin mx-auto mb-2 w-5 h-5 text-[var(--color-accent)]" />
          กำลังโหลดการตั้งค่าระบบ...
        </div>
      );
    }

    if (view === "general") {
      return (
        <div className="space-y-6">

          {/* ─── ข้อมูลเว็บไซต์ ─── */}
          <div className="flex items-center justify-between gap-3">
            <h2 className="ws-title">ข้อมูลแพลตฟอร์มทั่วไป</h2>
            <SaveActionButton
              saving={isSaving}
              onSave={() =>
                handleSaveConfig(
                  "settings_general",
                  {
                    siteName: siteName.trim(),
                    taglineTh: taglineTh.trim(),
                    contactEmail: contactEmail.trim(),
                    defaultLanguage: "th",
                    enableAutoExpire,
                  },
                  "บันทึกการตั้งค่าทั่วไปแล้ว",
                )
              }
            />
          </div>

          <SectionCard>
            <SectionRow
              icon={Type}
              label="ชื่อแพลตฟอร์มและคำโปรย"
              description="แสดงบนแถบเบราว์เซอร์ หน้าแรก และคำอธิบาย SEO"
            >
              <StandardFieldGroup>
                <StandardInput
                  grouped
                  label="ชื่อเว็บไซต์ (Site Name)"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  placeholder="Nondii"
                />
                <StandardInput
                  grouped
                  label="คำโปรยหลักภาษาไทย (Platform Tagline)"
                  value={taglineTh}
                  onChange={(e) => setTaglineTh(e.target.value)}
                  placeholder="แหล่งรวมโปรโมชั่นที่เที่ยวในไทย"
                />
              </StandardFieldGroup>
            </SectionRow>

            <SectionRow
              icon={Mail}
              label="อีเมลรับข่าวสารโปรโมชั่น"
              description="รับจดหมายข่าวจากโรงแรมและบัตรเครดิตเพื่อให้ AI แกะโปรอัตโนมัติ"
            >
              <StandardInput
                type="email"
                label="Inbound Promo Email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="deals@nondii.com"
              />
            </SectionRow>

            <SectionRow
              icon={ImageIcon}
              label="Favicon & Brand Mark"
              description="Active SVG icon used for favicon and navigation sidebar"
              noBorder
            >
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/brand/round-icon-blue.svg"
                  alt="Nondii Icon"
                  className="w-11 h-11 rounded-full border border-gray-200 bg-white p-0.5"
                />
                <div className="text-xs text-gray-500">
                  <p className="font-mono text-gray-700">
                    /brand/round-icon-blue.svg
                  </p>
                  <p>Synced across browser favicon &amp; sidebar menus</p>
                </div>
              </div>
            </SectionRow>
          </SectionCard>

          {/* ─── Automation Policy ─── */}
          <h2 className="ws-title pt-4">ระบบจัดการโปรโมชั่นอัตโนมัติ</h2>

          <SectionCard>
            <SectionRow
              icon={Clock}
              label="Auto-Expire Promotions"
              description="Automatically hide expired deals & coupons from the homepage every midnight"
              noBorder
            >
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={enableAutoExpire}
                  onChange={(e) => setEnableAutoExpire(e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--color-accent)]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-accent)]" />
              </label>
            </SectionRow>
          </SectionCard>
        </div>
      );
    }

    if (view === "seo") {
      const validTitle =
        metaTitle.trim() || "Nondii — โปรเที่ยวไทย แหล่งรวมโปรโมชั่นที่เที่ยวในไทย";
      const validDesc =
        metaDescription.trim() ||
        "รวมโปรโมชั่นที่พัก คาเฟ่ ร้านอาหาร บาร์ สปา และกิจกรรมทั่วไทย พร้อมจองห้องพักตรง 0% GP";

      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="ws-title">SEO &amp; การค้นหา</h2>
            <SaveActionButton
              saving={isSaving}
              onSave={() =>
                handleSaveConfig(
                  "global_seo",
                  {
                    metaTitle: metaTitle.trim(),
                    metaDescription: metaDescription.trim(),
                    ogImageUrl: ogImageUrl.trim(),
                  },
                  "บันทึก SEO เรียบร้อย",
                )
              }
            />
          </div>

          <div>
            <h4 className="text-xs font-semibold text-[var(--color-accent)] uppercase tracking-wider mb-3 px-1">
              Home Page Meta
            </h4>

            <SectionCard>
              <SectionRow
                icon={Type}
                label="Meta Title & Meta Description"
                description="กำหนดข้อความที่แสดงบนหน้าผลการค้นหา Google"
              >
                <div className="space-y-3">
                  <StandardInput
                    label="Meta Title"
                    optionalText={`${metaTitle.length} / 60`}
                    value={metaTitle}
                    onChange={(e) => setMetaTitle(e.target.value)}
                    placeholder="Nondii — โปรเที่ยวไทย แหล่งรวมโปรโมชั่นที่เที่ยวในไทย"
                  />
                  <StandardTextarea
                    rows={3}
                    label="Meta Description"
                    optionalText={`${metaDescription.length} / 160`}
                    value={metaDescription}
                    onChange={(e) => setMetaDescription(e.target.value)}
                    placeholder="รวมโปรโมชั่นที่พัก คาเฟ่ ร้านอาหาร บาร์ สปา และกิจกรรมทั่วไทย..."
                  />
                </div>
              </SectionRow>

              <SectionRow
                icon={ImageIcon}
                label="Social Share Image (OG Image)"
                description="ขนาดแนะนำ 1200 × 630 px"
              >
                <div className="flex flex-col sm:flex-row gap-3 items-start">
                  <div className="w-36 aspect-[1.91/1] bg-[var(--color-background-card)] rounded-[12px] overflow-hidden border border-[var(--color-border)] shrink-0 flex items-center justify-center">
                    {ogImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={ogImageUrl}
                        alt="OG Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon size={20} className="text-[var(--color-text-tertiary)]" />
                    )}
                  </div>
                  <div className="flex-1 w-full">
                    <StandardInput
                      label="OG Image URL"
                      value={ogImageUrl}
                      onChange={(e) => setOgImageUrl(e.target.value)}
                      placeholder="/brand/hero-slider/opt/island-4k-desktop.webp"
                    />
                  </div>
                </div>
              </SectionRow>

              {/* Exact WeGlobal Google Search Preview */}
              <div className="px-4 py-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Google Search Preview
                </p>
                <div className="bg-white p-4 rounded-xl border border-gray-200">
                  <div className="flex items-center gap-2 mb-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/brand/round-icon-blue.svg"
                      alt="Nondii"
                      className="w-6 h-6 rounded-full shrink-0"
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm text-gray-800 leading-tight truncate">
                        {siteName || "Nondii"}
                      </span>
                      <span className="text-xs text-gray-500 leading-tight truncate">
                        https://nondii.com/
                      </span>
                    </div>
                  </div>
                  <h4 className="text-lg text-[#1a0dab] truncate font-normal">
                    {validTitle}
                  </h4>
                  <p className="text-sm text-[#4d5156] mt-0.5 line-clamp-2">
                    {validDesc}
                  </p>
                </div>
              </div>
            </SectionCard>
          </div>
        </div>
      );
    }

    if (view === "ai-prompts") {
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="ws-title">คำสั่ง AI (System Prompts)</h2>
          </div>

          {prompts.map((item) => (
            <SectionCard key={item.key}>
              <div className="px-4 py-3.5 border-b border-white flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-gray-200 text-[var(--color-accent)] flex items-center justify-center shrink-0">
                    <Bot size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {item.titleTh}
                    </p>
                    <p className="text-xs font-mono text-gray-500 truncate">
                      {item.key}
                    </p>
                  </div>
                </div>
                <SaveActionButton
                  saving={isSaving}
                  label="Save"
                  onSave={() => handleSavePrompt(item)}
                />
              </div>

              <div className="py-4">
                <StandardTextarea
                  rows={5}
                  label="System Prompt"
                  value={item.prompt}
                  onChange={(e) => {
                    const nextVal = e.target.value;
                    setPrompts((prev) =>
                      prev.map((p) =>
                        p.key === item.key ? { ...p, prompt: nextVal } : p,
                      ),
                    );
                  }}
                />
              </div>
            </SectionCard>
          ))}
        </div>
      );
    }

    // Users & RBAC view (Compact single-row search bar on mobile & desktop)
    return (
      <div className="h-full flex flex-col min-h-0 space-y-3">
        <div className="hidden md:flex items-center justify-between gap-3 shrink-0">
          <h2 className="ws-title">ผู้ใช้งาน &amp; สิทธิ์ ({users.length})</h2>
          <div className="w-64 shrink-0">
            <WorkspaceCompactToolbar
              bordered={false}
              compactPadding
              searchValue={userQuery}
              onSearchChange={(val) => {
                setUserQuery(val);
                setVisibleUsers(BATCH_SIZE);
              }}
              searchPlaceholder="ค้นหาชื่อหรืออีเมลผู้ใช้..."
            />
          </div>
        </div>
        <div className="md:hidden pb-2 border-b border-[var(--color-border)] shrink-0">
          <WorkspaceCompactToolbar
            bordered={false}
            compactPadding
            searchValue={userQuery}
            onSearchChange={(val) => {
              setUserQuery(val);
              setVisibleUsers(BATCH_SIZE);
            }}
            searchPlaceholder="ค้นหาชื่อหรืออีเมลผู้ใช้..."
            filters={
              <span className="ws-caption whitespace-nowrap pl-1">
                ทั้งหมด {filteredUsers.length} บัญชี
              </span>
            }
          />
        </div>

        <div className="flex-1 min-h-0">
          <AdminDataTable
            data={slicedUsers}
            columns={userColumns}
            keyField="id"
            emptyLabel="No users found"
            footer={
              <div className="border-t border-gray-100 p-2 flex items-center justify-center gap-3 text-xs text-gray-500 shrink-0">
                <span>
                  Showing {slicedUsers.length} of {filteredUsers.length} users
                </span>
                {slicedUsers.length < filteredUsers.length && (
                  <button
                    type="button"
                    onClick={() => setVisibleUsers((c) => c + BATCH_SIZE)}
                    className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-md font-medium text-gray-700 cursor-pointer"
                  >
                    Load More
                  </button>
                )}
              </div>
            }
          />
        </div>
      </div>
    );
  };

  const activeItemMeta = SIDEBAR_ITEMS.find((i) => i.key === desktopView);

  return (
    <WorkspaceSplitLayout
      title="ตั้งค่าระบบ"
      subtitle="การกำหนดค่าแพลตฟอร์ม Nondii"
      activeId={desktopView}
      onSelect={(id) => navigateView(id as Exclude<SystemView, "main">)}
      mobileView={mobileView}
      onMobileBack={() => setMobileView("list")}
      mobileDetailTitle={activeItemMeta?.label}
      contentWidth={desktopView === "users" ? "full" : "narrow"}
      fullHeightRightPane={desktopView === "users"}
      navGroups={[
        {
          items: SIDEBAR_ITEMS.map((item) => ({
            id: item.key,
            label: item.label,
            description: item.description,
            icon: item.icon,
            badge: item.key === "users" ? users.length : undefined,
          })),
        },
      ]}
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
      {renderContent(desktopView)}
    </WorkspaceSplitLayout>
  );
}
