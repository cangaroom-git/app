"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Building2,
  CalendarCheck,
  Check,
  Crown,
  Download,
  Globe,
  Heart,
  LayoutDashboard,
  Loader2,
  Lock,
  LogIn,
  LogOut,
  Moon,
  Shield,
  ShieldCheck,
  Sun,
  TicketPercent,
  Trash2,
  User,
} from "lucide-react";
import { useHotelApp } from "@/components/HotelAppShell";
import { UserAvatarCircle } from "@/components/navigation/UserProfileDropdown";
import { ResponsiveSelect } from "@/components/ui/ResponsiveSelect";
import {
  StandardCheckbox,
  StandardFieldGroup,
  StandardInput,
} from "@/components/ui/standards";
import { WorkspaceSplitLayout } from "@/components/workspace/WorkspaceSplitLayout";
import { THAILAND_77_PROVINCES } from "@/data/thailandProvinces";
import { openPrivacySettingsModal } from "@/lib/telemetry/clientTelemetry";
import type { TravellerAccountPreferences } from "@/app/api/account/route";

type AccountSectionId =
  | "personal"
  | "security"
  | "notifications"
  | "privacy"
  | "preferences"
  | "coupons";

interface AccountSummary {
  totalBookingsCount: number;
  pendingBookingsCount: number;
  savedCouponsCount: number;
  savedPinsCount: number;
  boardsCount: number;
  ownedHotelsCount: number;
}

const REGION_CHIPS: Array<{ id: string; labelTh: string; labelEn: string }> = [
  { id: "north", labelTh: "ภาคเหนือ (เชียงใหม่ · น่าน)", labelEn: "North" },
  { id: "south", labelTh: "ทะเลใต้ (ภูเก็ต · กระบี่ · สมุย)", labelEn: "South" },
  { id: "central", labelTh: "กรุงเทพฯ & ภาคกลาง", labelEn: "Central & BKK" },
  { id: "east", labelTh: "ทะเลตะวันออก (ชลบุรี · ตราด)", labelEn: "East Coast" },
  { id: "northeast", labelTh: "เขาใหญ่ & อีสาน", labelEn: "Khao Yai & Isan" },
  { id: "west", labelTh: "หัวหิน & กาญจนบุรี", labelEn: "Hua Hin & West" },
];

const DEFAULT_PREFS: TravellerAccountPreferences = {
  emergencyContactName: "",
  emergencyContactPhone: "",
  homeProvinceId: "bangkok",
  preferredRegions: [],
  notifications: {
    wishlistExpiring: true,
    provincePromos: true,
    bookingUpdates: true,
    unsubscribeAllMarketing: false,
  },
  privacy: {
    showProvinceOnReviews: true,
    defaultPublicTrips: true,
    allowAnalyticsPersonalization: true,
  },
};

function AirbnbToggle({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors cursor-pointer disabled:opacity-50 ${
        checked
          ? "bg-[var(--color-accent)]"
          : "bg-[var(--color-background-subtle)]"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

const VALID_SECTIONS: ReadonlySet<string> = new Set([
  "personal",
  "security",
  "notifications",
  "privacy",
  "preferences",
  "coupons",
]);

function parseSectionParam(raw: string | null): AccountSectionId | null {
  if (raw && VALID_SECTIONS.has(raw)) {
    return raw as AccountSectionId;
  }
  return null;
}

/**
 * Airbnb Warm-Minimal 2-Column Traveller Account Settings (`/account`)
 * - Uses canonical `<WorkspaceSplitLayout />` (identical to `/studio/settings` & `/admin/systems`)
 * - Desktop: `max-w-[1160px]` 2-column split + auto-hide scrollbars + smooth fade-rise section swap
 * - Mobile: Native iOS horizontal push Slide-In / pop Slide-Out drill-down animation (`list` <-> `detail`)
 * - Zero skeleton flicker on background profile refreshes, tab focus, or settings mutations
 */
export function AccountSettingsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    user,
    isCheckingSession,
    refreshMe,
    signOutUser,
    lang,
    setLang,
    theme,
    setTheme,
    openCouponWallet,
  } = useHotelApp();

  const isTh = lang === "th";
  const initialParam = parseSectionParam(searchParams.get("section"));

  const [activeSection, setActiveSection] = useState<AccountSectionId>(
    initialParam ?? "personal",
  );
  const [mobileView, setMobileView] = useState<"list" | "detail">(
    initialParam ? "detail" : "list",
  );

  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const loadedUserIdRef = useRef<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [prefs, setPrefs] = useState<TravellerAccountPreferences>(DEFAULT_PREFS);
  const [summary, setSummary] = useState<AccountSummary>({
    totalBookingsCount: 0,
    pendingBookingsCount: 0,
    savedCouponsCount: 0,
    savedPinsCount: 0,
    boardsCount: 0,
    ownedHotelsCount: 0,
  });

  // Inline Airbnb-style row edit states
  const [editingField, setEditingField] = useState<
    "name" | "phone" | "emergency" | null
  >(null);
  const [draftName, setDraftName] = useState("");
  const [draftPhone, setDraftPhone] = useState("");
  const [draftEmergencyName, setDraftEmergencyName] = useState("");
  const [draftEmergencyPhone, setDraftEmergencyPhone] = useState("");

  // Danger zone delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const userId = user?.id ?? null;

  const showToast = useCallback((msg: string) => {
    setNotice(msg);
    window.setTimeout(() => {
      setNotice((prev) => (prev === msg ? null : prev));
    }, 3200);
  }, []);

  // Load account preferences once per authenticated userId — never remount/flash skeleton on background refreshes
  const loadAccount = useCallback(async (targetUserId: string) => {
    try {
      const res = await fetch("/api/account", { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as {
        user?: { name?: string | null; phone?: string | null } | null;
        preferences?: TravellerAccountPreferences;
        summary?: AccountSummary;
      };
      if (json.preferences) {
        setPrefs(json.preferences);
        setDraftEmergencyName(json.preferences.emergencyContactName || "");
        setDraftEmergencyPhone(json.preferences.emergencyContactPhone || "");
      }
      if (json.summary) setSummary(json.summary);
      if (json.user) {
        setDraftName(json.user.name || "");
        setDraftPhone(json.user.phone || "");
      }
      loadedUserIdRef.current = targetUserId;
    } finally {
      setHasLoadedOnce(true);
    }
  }, []);

  useEffect(() => {
    if (isCheckingSession) return;
    if (!userId) {
      loadedUserIdRef.current = null;
      setHasLoadedOnce(true);
      return;
    }
    if (loadedUserIdRef.current === userId) return;
    void loadAccount(userId);
  }, [isCheckingSession, userId, loadAccount]);

  // Sync browser back/forward button smoothly without Next.js RSC reloads
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handlePopState = () => {
      const next = parseSectionParam(
        new URLSearchParams(window.location.search).get("section"),
      );
      if (next) {
        setActiveSection(next);
        setMobileView("detail");
      } else {
        setMobileView("list");
      }
      setEditingField(null);
      setErrorMsg(null);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const patchAccount = async (
    payload: Record<string, unknown>,
    successMsg: string,
  ) => {
    setIsSaving(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as {
        preferences?: TravellerAccountPreferences;
        error?: string;
      };
      if (!res.ok) {
        setErrorMsg(json.error || "บันทึกไม่สำเร็จ");
        return false;
      }
      if (json.preferences) setPrefs(json.preferences);
      // Only refresh global `/api/me` when core user identity fields (name/phone) changed
      if (payload.name !== undefined || payload.phone !== undefined) {
        void refreshMe();
      }
      showToast(successMsg);
      return true;
    } catch {
      setErrorMsg("เกิดข้อผิดพลาดในการเชื่อมต่อ");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmText: deleteConfirmInput }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setErrorMsg(json.error || "ไม่สามารถลบบัญชีได้");
        return;
      }
      await signOutUser();
      router.push("/");
    } finally {
      setIsDeleting(false);
    }
  };

  const hasStudioAccess =
    summary.ownedHotelsCount > 0 ||
    (user?.ownedHotels?.length ?? 0) > 0 ||
    user?.role === "HOTEL_OWNER" ||
    user?.role === "SUPER_ADMIN";

  const navItems: Array<{
    id: AccountSectionId;
    icon: typeof User;
    labelTh: string;
    labelEn: string;
    descTh: string;
    descEn: string;
  }> = [
    {
      id: "personal",
      icon: User,
      labelTh: "ข้อมูลส่วนตัว",
      labelEn: "Personal information",
      descTh: "ชื่อที่แสดง อีเมล เบอร์โทร และผู้ติดต่อฉุกเฉิน",
      descEn: "Display name, email, phone, and emergency contact",
    },
    {
      id: "security",
      icon: ShieldCheck,
      labelTh: "การเข้าสู่ระบบและความปลอดภัย",
      labelEn: "Login & security",
      descTh: "บัญชีที่เชื่อมต่อ เซสชัน และการลบบัญชี",
      descEn: "Connected sign-in, session, and account deletion",
    },
    {
      id: "notifications",
      icon: Bell,
      labelTh: "การแจ้งเตือน",
      labelEn: "Notifications",
      descTh: "โปรใน Wishlist ใกล้หมดเขต และสถานะการจอง",
      descEn: "Expiring wishlist deals and booking updates",
    },
    {
      id: "privacy",
      icon: Lock,
      labelTh: "ความเป็นส่วนตัว & PDPA",
      labelEn: "Privacy & PDPA",
      descTh: "คุกกี้ การแชร์ทริป และส่งออกข้อมูลส่วนบุคคล",
      descEn: "Cookies, trip sharing, and personal data export",
    },
    {
      id: "preferences",
      icon: Globe,
      labelTh: "ภาษาและการแสดงผล",
      labelEn: "Languages & preferences",
      descTh: "ภาษา โหมดสว่าง/มืด และจังหวัดที่สนใจ",
      descEn: "Language, Light/Dark theme, and home province",
    },
    {
      id: "coupons",
      icon: TicketPercent,
      labelTh: "คูปองและการจองของฉัน",
      labelEn: "Coupons & bookings",
      descTh: "กระเป๋าคูปอง ประวัติการจอง และ Wishlist",
      descEn: "Coupon wallet, direct bookings, and wishlist",
    },
  ];

  // Initial-only Loading Skeleton (never flashes again after first load)
  if (isCheckingSession || (Boolean(user) && !hasLoadedOnce)) {
    return (
      <div className="cgr-admin-page">
        <div className="max-w-[1160px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
          <div className="h-8 w-44 rounded-full bg-[var(--color-background-muted)] mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-10">
            <div className="space-y-2.5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-12 rounded-[14px] bg-[var(--color-background-muted)]"
                />
              ))}
            </div>
            <div className="hidden md:block space-y-4 max-w-[680px]">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-20 rounded-[16px] bg-[var(--color-background-muted)]"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Signed-Out Gate
  if (!user) {
    return (
      <div className="cgr-admin-page">
        <div className="flex-1 overflow-y-auto cgr-scroll-autohide flex items-center justify-center px-4 py-12">
          <div className="max-w-[460px] w-full text-center space-y-5">
            <span className="h-14 w-14 mx-auto rounded-full bg-[var(--color-background-muted)] inline-flex items-center justify-center text-[var(--color-accent)]">
              <User className="w-7 h-7" />
            </span>
            <div className="space-y-1.5">
              <h1 className="ws-display">
                {isTh
                  ? "เข้าสู่ระบบเพื่อตั้งค่าบัญชี"
                  : "Log in to manage your account"}
              </h1>
              <p className="ws-body text-[var(--color-text-secondary)]">
                {isTh
                  ? "จัดการข้อมูลส่วนตัว การแจ้งเตือนโปรใกล้หมดเขต ความเป็นส่วนตัว PDPA และคูปองของคุณ"
                  : "Manage personal details, promo expiry alerts, privacy preferences, and saved coupons."}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <Link
                href="/login?next=/account"
                className="h-11 px-6 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] ws-body-strong inline-flex items-center gap-2 transition-colors"
              >
                <LogIn className="w-4 h-4" />
                <span>{isTh ? "เข้าสู่ระบบ" : "Log in"}</span>
              </Link>
              <Link
                href="/"
                className="h-11 px-5 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] ws-body-strong text-[var(--color-text-primary)] inline-flex items-center transition-colors"
              >
                {isTh ? "กลับหน้าหลัก" : "Back home"}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const homeProvince = THAILAND_77_PROVINCES.find(
    (p) => p.id === prefs.homeProvinceId,
  );

  const selectSection = (id: AccountSectionId) => {
    setActiveSection(id);
    setEditingField(null);
    setErrorMsg(null);
    setMobileView("detail");
    if (typeof window !== "undefined") {
      const nextUrl = `/account?section=${id}`;
      if (window.location.pathname + window.location.search !== nextUrl) {
        window.history.pushState({ section: id }, "", nextUrl);
      }
    }
  };

  const handleMobileBack = () => {
    setMobileView("list");
    setEditingField(null);
    setErrorMsg(null);
    if (typeof window !== "undefined" && window.location.search) {
      window.history.replaceState(null, "", "/account");
    }
  };

  const activeNavMeta = navItems.find((item) => item.id === activeSection);

  return (
    <>
      {/* Floating Toast */}
      {notice && (
        <div className="fixed bottom-24 lg:bottom-6 right-5 z-[100] rounded-full bg-[var(--color-accent)] !text-white shadow-[var(--shadow-popover)] px-5 py-2.5 ws-body-strong flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>{notice}</span>
        </div>
      )}

      <WorkspaceSplitLayout
        title={isTh ? "ตั้งค่าบัญชี" : "Account settings"}
        subtitle={user.email}
        onRootBack={() => {
          if (typeof window !== "undefined" && window.history.length > 1) {
            router.back();
          } else {
            router.push("/");
          }
        }}
        rootBackLabel={isTh ? "ย้อนกลับ" : "Go back"}
        activeId={activeSection}
        onSelect={(id) => selectSection(id as AccountSectionId)}
        mobileView={mobileView}
        onMobileBack={handleMobileBack}
        mobileBackLabel={isTh ? "ตั้งค่าบัญชี" : "Account"}
        mobileDetailTitle={
          activeNavMeta
            ? isTh
              ? activeNavMeta.labelTh
              : activeNavMeta.labelEn
            : undefined
        }
        contentWidth="narrow"
        sidebarHeaderExtra={
          <div className="flex items-center gap-3 px-1">
            <UserAvatarCircle
              user={user}
              sizeClass="h-10 w-10"
              iconSizeClass="w-4 h-4"
            />
            <div className="min-w-0 flex-1">
              <p className="ws-body-strong truncate">{user.name}</p>
              <p className="ws-caption truncate">
                {user.role === "SUPER_ADMIN"
                  ? "Super Admin"
                  : hasStudioAccess
                    ? isTh
                      ? "เจ้าของที่พัก / ร้านค้า"
                      : "Host"
                    : isTh
                      ? "นักเดินทาง"
                      : "Traveller"}
              </p>
            </div>
          </div>
        }
        navGroups={[
          {
            items: navItems.map((item) => ({
              id: item.id,
              label: isTh ? item.labelTh : item.labelEn,
              description: isTh ? item.descTh : item.descEn,
              icon: item.icon,
            })),
          },
        ]}
        sidebarFooter={
          <div className="space-y-1">
            {hasStudioAccess ? (
              <Link
                href="/studio"
                className="w-full px-3.5 py-2.5 rounded-[14px] hover:bg-[var(--color-background-muted)] flex items-center justify-between gap-3 ws-body-medium text-[var(--color-text-primary)] transition-colors"
              >
                <span className="flex items-center gap-3 min-w-0">
                  <LayoutDashboard
                    className="w-[19px] h-[19px] text-[var(--color-accent)] shrink-0"
                    strokeWidth={1.9}
                  />
                  <span className="truncate">
                    {isTh ? "Merchant Studio" : "Merchant Studio"}
                  </span>
                </span>
                <ArrowRight className="w-4 h-4 text-[var(--color-text-secondary)] shrink-0" />
              </Link>
            ) : (
              <Link
                href="/register"
                className="w-full px-3.5 py-2.5 rounded-[14px] hover:bg-[var(--color-background-muted)] flex items-center justify-between gap-3 ws-body-medium text-[var(--color-text-primary)] transition-colors"
              >
                <span className="flex items-center gap-3 min-w-0">
                  <Building2
                    className="w-[19px] h-[19px] text-[var(--color-accent)] shrink-0"
                    strokeWidth={1.9}
                  />
                  <span className="truncate">
                    {isTh ? "เปิดหน้าธุรกิจ / ที่พักฟรี" : "List your place free"}
                  </span>
                </span>
                <ArrowRight className="w-4 h-4 text-[var(--color-text-secondary)] shrink-0" />
              </Link>
            )}

            {user.role === "SUPER_ADMIN" && (
              <Link
                href="/admin"
                className="w-full px-3.5 py-2.5 rounded-[14px] hover:bg-[var(--color-background-muted)] flex items-center justify-between gap-3 ws-body-medium text-[var(--color-text-primary)] transition-colors"
              >
                <span className="flex items-center gap-3 min-w-0">
                  <Crown
                    className="w-[19px] h-[19px] text-[var(--color-accent)] shrink-0"
                    strokeWidth={1.9}
                  />
                  <span className="truncate">Admin Center</span>
                </span>
                <ArrowRight className="w-4 h-4 text-[var(--color-text-secondary)] shrink-0" />
              </Link>
            )}
          </div>
        }
      >
        <div key={activeSection} className="cgr-desktop-tab-in min-w-0">
          {errorMsg && (
            <div className="mb-5 rounded-[14px] bg-red-50 dark:bg-red-950/40 px-4 py-3 ws-body-medium text-red-700 dark:text-red-300">
              {errorMsg}
            </div>
          )}

          {/* ─────────── 1. PERSONAL INFORMATION ─────────── */}
          {activeSection === "personal" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-[20px] font-semibold text-[var(--color-text-primary)]">
                  {isTh ? "ข้อมูลส่วนตัว" : "Personal information"}
                </h2>
                <p className="text-[14px] text-[var(--color-text-secondary)] mt-1">
                  {isTh
                    ? "ข้อมูลพื้นฐานสำหรับแสดงบนรีวิว ทริป และการยืนยันการจองที่พัก"
                    : "Basic details used for reviews, trips, and direct stay reservations."}
                </p>
              </div>

              <div className="divide-y divide-[var(--color-border)]">
                {/* Display Name */}
                <div className="py-5 first:pt-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[15px] font-medium text-[var(--color-text-primary)]">
                        {isTh ? "ชื่อที่แสดง" : "Display name"}
                      </p>
                      {editingField !== "name" && (
                        <p className="text-[14px] text-[var(--color-text-secondary)] mt-0.5">
                          {user.name || (isTh ? "ยังไม่ได้ระบุ" : "Not provided")}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setDraftName(user.name || "");
                        setEditingField(editingField === "name" ? null : "name");
                      }}
                      className="text-[14px] font-semibold text-[var(--color-text-primary)] underline underline-offset-2 hover:text-[var(--color-accent)] cursor-pointer shrink-0"
                    >
                      {editingField === "name"
                        ? isTh
                          ? "ยกเลิก"
                          : "Cancel"
                        : isTh
                          ? "แก้ไข"
                          : "Edit"}
                    </button>
                  </div>

                  {editingField === "name" && (
                    <div className="mt-4 space-y-3">
                      <StandardInput
                        label={isTh ? "ชื่อที่แสดงบน Nondii" : "Display name"}
                        value={draftName}
                        onChange={(e) => setDraftName(e.target.value)}
                        placeholder={isTh ? "ชื่อ-นามสกุล หรือชื่อเล่น" : "Your name"}
                      />
                      <button
                        type="button"
                        disabled={isSaving || !draftName.trim()}
                        onClick={async () => {
                          const ok = await patchAccount(
                            { name: draftName.trim() },
                            isTh ? "อัปเดตชื่อเรียบร้อยแล้ว" : "Name updated",
                          );
                          if (ok) setEditingField(null);
                        }}
                        className="h-10 px-5 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] text-[14px] font-semibold inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                        <span>{isTh ? "บันทึก" : "Save"}</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Email Address (Read-only from Google/Neon Auth) */}
                <div className="py-5 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[15px] font-medium text-[var(--color-text-primary)]">
                      {isTh ? "อีเมล" : "Email address"}
                    </p>
                    <p className="text-[14px] text-[var(--color-text-secondary)] mt-0.5 truncate">
                      {user.email}
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-[var(--color-background-muted)] text-[12px] font-semibold text-[var(--color-accent)] shrink-0">
                    {isTh ? "ยืนยันแล้ว" : "Verified"}
                  </span>
                </div>

                {/* Phone Number */}
                <div className="py-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[15px] font-medium text-[var(--color-text-primary)]">
                        {isTh ? "เบอร์โทรศัพท์" : "Phone number"}
                      </p>
                      {editingField !== "phone" && (
                        <p className="text-[14px] text-[var(--color-text-secondary)] mt-0.5">
                          {user.phone ||
                            (isTh
                              ? "เพิ่มเบอร์โทรเพื่อให้ที่พักติดต่อและยืนยันสลิปได้เร็วขึ้น"
                              : "Add a phone number for booking confirmations")}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setDraftPhone(user.phone || "");
                        setEditingField(
                          editingField === "phone" ? null : "phone",
                        );
                      }}
                      className="text-[14px] font-semibold text-[var(--color-text-primary)] underline underline-offset-2 hover:text-[var(--color-accent)] cursor-pointer shrink-0"
                    >
                      {editingField === "phone"
                        ? isTh
                          ? "ยกเลิก"
                          : "Cancel"
                        : user.phone
                          ? isTh
                            ? "แก้ไข"
                            : "Edit"
                          : isTh
                            ? "เพิ่ม"
                            : "Add"}
                    </button>
                  </div>

                  {editingField === "phone" && (
                    <div className="mt-4 space-y-3">
                      <StandardInput
                        label={isTh ? "เบอร์โทรศัพท์มือถือ" : "Mobile phone"}
                        value={draftPhone}
                        onChange={(e) => setDraftPhone(e.target.value)}
                        placeholder="08x-xxx-xxxx"
                      />
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={async () => {
                          const ok = await patchAccount(
                            { phone: draftPhone.trim() },
                            isTh ? "บันทึกเบอร์โทรแล้ว" : "Phone saved",
                          );
                          if (ok) setEditingField(null);
                        }}
                        className="h-10 px-5 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] text-[14px] font-semibold inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                        <span>{isTh ? "บันทึก" : "Save"}</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Emergency Contact */}
                <div className="py-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[15px] font-medium text-[var(--color-text-primary)]">
                        {isTh
                          ? "ผู้ติดต่อฉุกเฉิน (ไม่บังคับ)"
                          : "Emergency contact (optional)"}
                      </p>
                      {editingField !== "emergency" && (
                        <p className="text-[14px] text-[var(--color-text-secondary)] mt-0.5">
                          {prefs.emergencyContactName
                            ? `${prefs.emergencyContactName}${
                                prefs.emergencyContactPhone
                                  ? ` · ${prefs.emergencyContactPhone}`
                                  : ""
                              }`
                            : isTh
                              ? "ยังไม่ได้ระบุ — มีประโยชน์เมื่อเดินทางเข้าพักต่างจังหวัด"
                              : "Not provided"}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setDraftEmergencyName(prefs.emergencyContactName || "");
                        setDraftEmergencyPhone(
                          prefs.emergencyContactPhone || "",
                        );
                        setEditingField(
                          editingField === "emergency" ? null : "emergency",
                        );
                      }}
                      className="text-[14px] font-semibold text-[var(--color-text-primary)] underline underline-offset-2 hover:text-[var(--color-accent)] cursor-pointer shrink-0"
                    >
                      {editingField === "emergency"
                        ? isTh
                          ? "ยกเลิก"
                          : "Cancel"
                        : prefs.emergencyContactName
                          ? isTh
                            ? "แก้ไข"
                            : "Edit"
                          : isTh
                            ? "เพิ่ม"
                            : "Add"}
                    </button>
                  </div>

                  {editingField === "emergency" && (
                    <div className="mt-4 space-y-3">
                      <StandardFieldGroup>
                        <StandardInput
                          grouped
                          label={isTh ? "ชื่อผู้ติดต่อฉุกเฉิน" : "Contact name"}
                          value={draftEmergencyName}
                          onChange={(e) =>
                            setDraftEmergencyName(e.target.value)
                          }
                          placeholder={isTh ? "เช่น คุณแม่ / เพื่อนร่วมทริป" : "Full name"}
                        />
                        <StandardInput
                          grouped
                          label={isTh ? "เบอร์โทรฉุกเฉิน" : "Contact phone"}
                          value={draftEmergencyPhone}
                          onChange={(e) =>
                            setDraftEmergencyPhone(e.target.value)
                          }
                          placeholder="08x-xxx-xxxx"
                        />
                      </StandardFieldGroup>
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={async () => {
                          const ok = await patchAccount(
                            {
                              emergencyContactName: draftEmergencyName.trim(),
                              emergencyContactPhone: draftEmergencyPhone.trim(),
                            },
                            isTh
                              ? "บันทึกผู้ติดต่อฉุกเฉินแล้ว"
                              : "Emergency contact saved",
                          );
                          if (ok) setEditingField(null);
                        }}
                        className="h-10 px-5 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] text-[14px] font-semibold inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                        <span>{isTh ? "บันทึก" : "Save"}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Airbnb-Style Trust Explanation Card (Calm Muted Surface, Zero Borders/Shadows) */}
              <div className="rounded-[20px] bg-[var(--color-background-muted)] p-5 flex items-start gap-3.5">
                <Shield className="w-5 h-5 text-[var(--color-accent)] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-[14px] font-semibold text-[var(--color-text-primary)]">
                    {isTh
                      ? "ข้อมูลใดบ้างที่แชร์กับที่พัก?"
                      : "What info is shared with places?"}
                  </p>
                  <p className="text-[14px] leading-relaxed text-[var(--color-text-secondary)]">
                    {isTh
                      ? "Nondii จะแชร์เฉพาะชื่อและเบอร์ติดต่อของคุณให้ที่พักเมื่อคุณกดยืนยันจองห้องพักเท่านั้น และไม่เปิดเผยอีเมลหรือเบอร์โทรของคุณในหน้าสาธารณะ"
                      : "Nondii only shares your name and contact phone with a property when you confirm a stay reservation."}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ─────────── 2. LOGIN & SECURITY ─────────── */}
          {activeSection === "security" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-[20px] font-semibold text-[var(--color-text-primary)]">
                  {isTh
                    ? "การเข้าสู่ระบบและความปลอดภัย"
                    : "Login & security"}
                </h2>
                <p className="text-[14px] text-[var(--color-text-secondary)] mt-1">
                  {isTh
                    ? "ตรวจสอบบัญชีที่เชื่อมต่อ เซสชันที่ใช้งาน และจัดการบัญชีของคุณ"
                    : "Manage connected sign-in methods, active session, and account status."}
                </p>
              </div>

              <div className="divide-y divide-[var(--color-border)]">
                {/* Connected Account */}
                <div className="py-5 first:pt-2 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[15px] font-medium text-[var(--color-text-primary)]">
                      Google / Neon Auth
                    </p>
                    <p className="text-[14px] text-[var(--color-text-secondary)] mt-0.5">
                      {isTh
                        ? `เชื่อมต่อกับ ${user.email}`
                        : `Connected as ${user.email}`}
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-[var(--color-background-muted)] text-[12px] font-semibold text-[var(--color-accent)] shrink-0">
                    {isTh ? "เชื่อมต่อแล้ว" : "Connected"}
                  </span>
                </div>

                {/* Current Session */}
                <div className="py-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[15px] font-medium text-[var(--color-text-primary)]">
                      {isTh ? "เซสชันปัจจุบัน" : "Current device session"}
                    </p>
                    <p className="text-[14px] text-[var(--color-text-secondary)] mt-0.5">
                      {isTh
                        ? "กำลังใช้งานอยู่บนเบราว์เซอร์นี้"
                        : "Active now on this browser"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      await signOutUser();
                      router.push("/");
                    }}
                    className="h-9 px-4 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[14px] font-semibold text-[var(--color-text-primary)] inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{isTh ? "ออกจากระบบ" : "Log out"}</span>
                  </button>
                </div>

                {/* Account Deactivation / PDPA Delete */}
                <div className="py-5 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[15px] font-medium text-[var(--color-text-primary)]">
                        {isTh ? "ลบบัญชีถาวร" : "Delete account"}
                      </p>
                      <p className="text-[14px] text-[var(--color-text-secondary)] mt-0.5">
                        {isTh
                          ? "ลบข้อมูลโปรไฟล์ Wishlist และทริปทั้งหมดออกจากระบบตามสิทธิ์ PDPA"
                          : "Permanently remove your profile, wishlists, and personal data."}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm((p) => !p)}
                      className="text-[14px] font-semibold text-red-600 underline underline-offset-2 cursor-pointer shrink-0"
                    >
                      {showDeleteConfirm
                        ? isTh
                          ? "ยกเลิก"
                          : "Cancel"
                        : isTh
                          ? "ลบบัญชี"
                          : "Deactivate"}
                    </button>
                  </div>

                  {showDeleteConfirm && (
                    <div className="rounded-[18px] bg-red-50/70 dark:bg-red-950/30 p-4 space-y-3">
                      <div className="flex items-start gap-2.5 text-[13px] text-red-700 dark:text-red-300">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <p>
                          {isTh
                            ? "การลบบัญชีไม่สามารถย้อนกลับได้ กรุณาพิมพ์คำว่า DELETE เพื่อยืนยัน"
                            : "This action cannot be undone. Type DELETE to confirm."}
                        </p>
                      </div>
                      <StandardInput
                        label='พิมพ์คำว่า "DELETE" เพื่อยืนยัน'
                        value={deleteConfirmInput}
                        onChange={(e) => setDeleteConfirmInput(e.target.value)}
                        placeholder="DELETE"
                      />
                      <button
                        type="button"
                        disabled={
                          isDeleting ||
                          deleteConfirmInput.trim().toUpperCase() !== "DELETE"
                        }
                        onClick={() => void handleDeleteAccount()}
                        className="h-10 px-5 rounded-full bg-red-600 hover:bg-red-700 text-white text-[14px] font-semibold inline-flex items-center gap-2 cursor-pointer disabled:opacity-40"
                      >
                        {isDeleting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                        <span>
                          {isTh ? "ยืนยันลบบัญชีถาวร" : "Confirm delete account"}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ─────────── 3. NOTIFICATIONS ─────────── */}
          {activeSection === "notifications" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-[20px] font-semibold text-[var(--color-text-primary)]">
                  {isTh ? "การแจ้งเตือนโปรเที่ยวไทย" : "Notifications"}
                </h2>
                <p className="text-[14px] text-[var(--color-text-secondary)] mt-1">
                  {isTh
                    ? "เลือกรับเฉพาะการแจ้งเตือนที่สำคัญ ไม่พลาดโปรเด็ดและสถานะการจอง"
                    : "Choose which deal alerts and booking updates you receive."}
                </p>
              </div>

              <div className="divide-y divide-[var(--color-border)]">
                <div className="py-5 first:pt-2 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[15px] font-medium text-[var(--color-text-primary)]">
                      {isTh
                        ? "เตือนโปรใน Wishlist ใกล้หมดเขต"
                        : "Wishlist expiring promo alerts"}
                    </p>
                    <p className="text-[14px] text-[var(--color-text-secondary)] mt-0.5">
                      {isTh
                        ? "แจ้งเตือนล่วงหน้า 3 วันก่อนที่โปรโมชั่นที่คุณกดหัวใจไว้จะหมดอายุ"
                        : "Get reminded 3 days before saved promotions expire."}
                    </p>
                  </div>
                  <AirbnbToggle
                    label="Wishlist expiring alerts"
                    checked={
                      prefs.notifications.wishlistExpiring &&
                      !prefs.notifications.unsubscribeAllMarketing
                    }
                    disabled={
                      isSaving || prefs.notifications.unsubscribeAllMarketing
                    }
                    onChange={(next) =>
                      void patchAccount(
                        {
                          notifications: {
                            wishlistExpiring: next,
                            unsubscribeAllMarketing: false,
                          },
                        },
                        isTh
                          ? "อัปเดตการแจ้งเตือนแล้ว"
                          : "Notification updated",
                      )
                    }
                  />
                </div>

                <div className="py-5 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[15px] font-medium text-[var(--color-text-primary)]">
                      {isTh
                        ? "โปรใหม่ในจังหวัดที่สนใจ"
                        : "New deals in your favorite provinces"}
                    </p>
                    <p className="text-[14px] text-[var(--color-text-secondary)] mt-0.5">
                      {isTh
                        ? "รวมดีลที่พัก คาเฟ่ และร้านอาหารเปิดใหม่ตามโซนที่คุณเลือกไว้"
                        : "Curated hotel, cafe, and dining promos in regions you follow."}
                    </p>
                  </div>
                  <AirbnbToggle
                    label="Province promo alerts"
                    checked={
                      prefs.notifications.provincePromos &&
                      !prefs.notifications.unsubscribeAllMarketing
                    }
                    disabled={
                      isSaving || prefs.notifications.unsubscribeAllMarketing
                    }
                    onChange={(next) =>
                      void patchAccount(
                        {
                          notifications: {
                            provincePromos: next,
                            unsubscribeAllMarketing: false,
                          },
                        },
                        isTh
                          ? "อัปเดตการแจ้งเตือนแล้ว"
                          : "Notification updated",
                      )
                    }
                  />
                </div>

                <div className="py-5 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[15px] font-medium text-[var(--color-text-primary)]">
                      {isTh
                        ? "สถานะการจองที่พัก & ยืนยันสลิป"
                        : "Booking & payment slip updates"}
                    </p>
                    <p className="text-[14px] text-[var(--color-text-secondary)] mt-0.5">
                      {isTh
                        ? "แจ้งเตือนทันทีเมื่อที่พักตรวจสลิปและยืนยันสิทธิ์เข้าพัก"
                        : "Instant updates when hosts verify your PromptPay slip."}
                    </p>
                  </div>
                  <AirbnbToggle
                    label="Booking updates"
                    checked={prefs.notifications.bookingUpdates}
                    disabled={isSaving}
                    onChange={(next) =>
                      void patchAccount(
                        { notifications: { bookingUpdates: next } },
                        isTh
                          ? "อัปเดตการแจ้งเตือนการจองแล้ว"
                          : "Booking alerts updated",
                      )
                    }
                  />
                </div>

                {/* Unsubscribe all marketing checkbox (Exact Airbnb bottom control) */}
                <div className="py-5">
                  <StandardCheckbox
                    checked={prefs.notifications.unsubscribeAllMarketing}
                    onChange={(next) =>
                      void patchAccount(
                        {
                          notifications: {
                            unsubscribeAllMarketing: next,
                          },
                        },
                        next
                          ? isTh
                            ? "ปิดรับอีเมลการตลาดทั้งหมดแล้ว"
                            : "Unsubscribed from marketing emails"
                          : isTh
                            ? "เปิดรับการแจ้งเตือนโปรโมชั่นอีกครั้ง"
                            : "Re-enabled marketing preferences",
                      )
                    }
                    label={
                      <span className="block space-y-0.5">
                        <span className="block text-[14px] font-medium text-[var(--color-text-primary)]">
                          {isTh
                            ? "ยกเลิกการรับอีเมลการตลาดและโปรโมชั่นทั้งหมด"
                            : "Unsubscribe from all marketing emails"}
                        </span>
                        <span className="block text-[13px] font-normal text-[var(--color-text-secondary)]">
                          {isTh
                            ? "คุณยังคงได้รับการแจ้งเตือนสำคัญเกี่ยวกับการจองที่พักและความปลอดภัยบัญชี"
                            : "You will still receive essential booking and account security messages."}
                        </span>
                      </span>
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {/* ─────────── 4. PRIVACY & PDPA ─────────── */}
          {activeSection === "privacy" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-[20px] font-semibold text-[var(--color-text-primary)]">
                  {isTh ? "ความเป็นส่วนตัว & PDPA" : "Privacy & PDPA"}
                </h2>
                <p className="text-[14px] text-[var(--color-text-secondary)] mt-1">
                  {isTh
                    ? "ควบคุมสิ่งที่แสดงบนรีวิว ทริป และจัดการข้อมูลส่วนบุคคลตามกฎหมาย PDPA"
                    : "Control review visibility, trip sharing, and personal data rights."}
                </p>
              </div>

              <div className="divide-y divide-[var(--color-border)]">
                <div className="py-5 first:pt-2 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[15px] font-medium text-[var(--color-text-primary)]">
                      {isTh
                        ? "แสดงจังหวัดของคุณบนรีวิวสาธารณะ"
                        : "Show home province on reviews"}
                    </p>
                    <p className="text-[14px] text-[var(--color-text-secondary)] mt-0.5">
                      {isTh
                        ? "ช่วยให้นักเดินทางคนอื่นเห็นมุมมองรีวิวจากผู้เดินทางจริง"
                        : "Displays your general province alongside your public reviews."}
                    </p>
                  </div>
                  <AirbnbToggle
                    label="Show province on reviews"
                    checked={prefs.privacy.showProvinceOnReviews}
                    disabled={isSaving}
                    onChange={(next) =>
                      void patchAccount(
                        { privacy: { showProvinceOnReviews: next } },
                        isTh ? "อัปเดตความเป็นส่วนตัวแล้ว" : "Privacy updated",
                      )
                    }
                  />
                </div>

                <div className="py-5 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[15px] font-medium text-[var(--color-text-primary)]">
                      {isTh
                        ? "อนุญาตให้แชร์ลิงก์ทริปที่สร้างใหม่เป็นสาธารณะ"
                        : "Allow new trips to be shared via link"}
                    </p>
                    <p className="text-[14px] text-[var(--color-text-secondary)] mt-0.5">
                      {isTh
                        ? "คุณสามารถเปลี่ยนสถานะสาธารณะ/ส่วนตัวของแต่ละทริปได้ตลอดเวลาในหน้า /trip"
                        : "You can still toggle individual trip boards anytime."}
                    </p>
                  </div>
                  <AirbnbToggle
                    label="Default public trips"
                    checked={prefs.privacy.defaultPublicTrips}
                    disabled={isSaving}
                    onChange={(next) =>
                      void patchAccount(
                        { privacy: { defaultPublicTrips: next } },
                        isTh ? "อัปเดตการตั้งค่าทริปแล้ว" : "Trip setting updated",
                      )
                    }
                  />
                </div>

                <div className="py-5 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[15px] font-medium text-[var(--color-text-primary)]">
                      {isTh
                        ? "ปรับแต่งฟีดโปรโมชั่นตามความสนใจ & คุกกี้"
                        : "Personalized recommendations & cookies"}
                    </p>
                    <p className="text-[14px] text-[var(--color-text-secondary)] mt-0.5">
                      {isTh
                        ? "ใช้ประวัติการดูและจังหวัดที่สนใจเพื่อเรียงโปรที่ตรงใจคุณก่อน"
                        : "Uses browsing taste signals to surface relevant Thailand deals."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openPrivacySettingsModal()}
                    className="h-9 px-4 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[14px] font-semibold text-[var(--color-text-primary)] cursor-pointer shrink-0 transition-colors"
                  >
                    {isTh ? "จัดการคุกกี้" : "Cookie settings"}
                  </button>
                </div>

                {/* PDPA Data Export */}
                <div className="py-5 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[15px] font-medium text-[var(--color-text-primary)]">
                      {isTh
                        ? "ดาวน์โหลดข้อมูลส่วนบุคคลของฉัน (PDPA)"
                        : "Download my personal data"}
                    </p>
                    <p className="text-[14px] text-[var(--color-text-secondary)] mt-0.5">
                      {isTh
                        ? "ส่งออกข้อมูลบัญชี ทริป คูปอง และประวัติการจองเป็นไฟล์ JSON ทันที"
                        : "Export your account, trips, coupons, and bookings as JSON."}
                    </p>
                  </div>
                  <a
                    href="/api/account/export"
                    download
                    className="h-9 px-4 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[14px] font-semibold text-[var(--color-text-primary)] inline-flex items-center gap-1.5 shrink-0 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{isTh ? "ดาวน์โหลด" : "Export"}</span>
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* ─────────── 5. LANGUAGES & PREFERENCES ─────────── */}
          {activeSection === "preferences" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-[20px] font-semibold text-[var(--color-text-primary)]">
                  {isTh ? "ภาษาและการแสดงผล" : "Languages & preferences"}
                </h2>
                <p className="text-[14px] text-[var(--color-text-secondary)] mt-1">
                  {isTh
                    ? "ตั้งค่าภาษา ธีมสี และจังหวัดหลักเพื่อช่วยคัดโปรเที่ยวไทยที่เหมาะกับคุณ"
                    : "Customize language, appearance, and preferred Thailand regions."}
                </p>
              </div>

              <div className="divide-y divide-[var(--color-border)]">
                {/* Language */}
                <div className="py-5 first:pt-2 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-[15px] font-medium text-[var(--color-text-primary)]">
                      {isTh ? "ภาษาที่แสดง" : "Preferred language"}
                    </p>
                    <p className="text-[14px] text-[var(--color-text-secondary)] mt-0.5">
                      {isTh
                        ? "สกุลเงินมาตรฐาน: บาทไทย (฿ THB)"
                        : "Default currency: Thai Baht (฿ THB)"}
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-1.5">
                    {(
                      [
                        { id: "th", label: "ภาษาไทย" },
                        { id: "en", label: "English" },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setLang(opt.id);
                          void patchAccount(
                            { preferredLang: opt.id },
                            opt.id === "th"
                              ? "เปลี่ยนเป็นภาษาไทยแล้ว"
                              : "Switched to English",
                          );
                        }}
                        className={`h-9 px-4 rounded-full text-[14px] font-semibold cursor-pointer transition-colors ${
                          lang === opt.id
                            ? "bg-[var(--color-accent)] !text-[var(--color-on-accent)]"
                            : "bg-[var(--color-background-muted)] text-[var(--color-text-primary)] hover:bg-[var(--color-background-subtle)]"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Theme Mode */}
                <div className="py-5 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-[15px] font-medium text-[var(--color-text-primary)]">
                      {isTh ? "โหมดการแสดงผล" : "Appearance"}
                    </p>
                    <p className="text-[14px] text-[var(--color-text-secondary)] mt-0.5">
                      {isTh
                        ? "เลือกระหว่างโหมดสว่างและโหมดมืด"
                        : "Choose between Light and Dark theme"}
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setTheme("light");
                        void patchAccount(
                          { preferredTheme: "light" },
                          isTh ? "เปลี่ยนเป็นโหมดสว่างแล้ว" : "Light mode active",
                        );
                      }}
                      className={`h-9 px-4 rounded-full text-[14px] font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                        theme === "light"
                          ? "bg-[var(--color-accent)] !text-[var(--color-on-accent)]"
                          : "bg-[var(--color-background-muted)] text-[var(--color-text-primary)] hover:bg-[var(--color-background-subtle)]"
                      }`}
                    >
                      <Sun className="w-4 h-4" />
                      <span>{isTh ? "สว่าง" : "Light"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTheme("dark");
                        void patchAccount(
                          { preferredTheme: "dark" },
                          isTh ? "เปลี่ยนเป็นโหมดมืดแล้ว" : "Dark mode active",
                        );
                      }}
                      className={`h-9 px-4 rounded-full text-[14px] font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                        theme === "dark"
                          ? "bg-[var(--color-accent)] !text-[var(--color-on-accent)]"
                          : "bg-[var(--color-background-muted)] text-[var(--color-text-primary)] hover:bg-[var(--color-background-subtle)]"
                      }`}
                    >
                      <Moon className="w-4 h-4" />
                      <span>{isTh ? "มืด" : "Dark"}</span>
                    </button>
                  </div>
                </div>

                {/* Home Province */}
                <div className="py-5 space-y-3">
                  <div>
                    <p className="text-[15px] font-medium text-[var(--color-text-primary)]">
                      {isTh ? "จังหวัดหลักของคุณ" : "Home province"}
                    </p>
                    <p className="text-[14px] text-[var(--color-text-secondary)] mt-0.5">
                      {isTh
                        ? `ปัจจุบัน: ${homeProvince?.nameTh || "กรุงเทพมหานคร"} — ช่วยคัดโปรใกล้ตัวและทริปสุดสัปดาห์`
                        : `Current: ${homeProvince?.nameEn || "Bangkok"}`}
                    </p>
                  </div>
                  <div className="max-w-[340px]">
                    <ResponsiveSelect
                      value={prefs.homeProvinceId}
                      onChange={(val) =>
                        void patchAccount(
                          { homeProvinceId: val },
                          isTh ? "บันทึกจังหวัดหลักแล้ว" : "Home province saved",
                        )
                      }
                      sheetTitle={isTh ? "เลือกจังหวัดหลัก" : "Select home province"}
                      triggerClassName="w-full h-12 px-4 rounded-[12px] bg-[var(--color-background-card)] border border-[#b0b0b0] dark:border-[var(--color-border-emphasized)] text-[14px] font-medium text-[var(--color-text-primary)]"
                      options={THAILAND_77_PROVINCES.map((p) => ({
                        value: p.id,
                        label: isTh ? p.nameTh : p.nameEn,
                      }))}
                    />
                  </div>
                </div>

                {/* Preferred Travel Regions */}
                <div className="py-5 space-y-3">
                  <div>
                    <p className="text-[15px] font-medium text-[var(--color-text-primary)]">
                      {isTh ? "โซนที่ชอบไปเที่ยว" : "Favorite travel regions"}
                    </p>
                    <p className="text-[14px] text-[var(--color-text-secondary)] mt-0.5">
                      {isTh
                        ? "เลือกได้หลายโซนเพื่อให้ Nondii แนะนำโปรที่พักและคาเฟ่ได้ตรงใจขึ้น"
                        : "Pick regions you love visiting for tailored deal alerts."}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {REGION_CHIPS.map((reg) => {
                      const selected = prefs.preferredRegions.includes(reg.id);
                      return (
                        <button
                          key={reg.id}
                          type="button"
                          onClick={() => {
                            const nextRegions = selected
                              ? prefs.preferredRegions.filter(
                                  (r) => r !== reg.id,
                                )
                              : [...prefs.preferredRegions, reg.id];
                            void patchAccount(
                              { preferredRegions: nextRegions },
                              isTh
                                ? "อัปเดตโซนที่สนใจแล้ว"
                                : "Travel regions updated",
                            );
                          }}
                          className={`h-9 px-4 rounded-full text-[13px] font-semibold cursor-pointer transition-colors ${
                            selected
                              ? "bg-[var(--color-accent)] !text-[var(--color-on-accent)]"
                              : "bg-[var(--color-background-muted)] text-[var(--color-text-primary)] hover:bg-[var(--color-background-subtle)]"
                          }`}
                        >
                          {isTh ? reg.labelTh : reg.labelEn}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─────────── 6. COUPONS & BOOKINGS ─────────── */}
          {activeSection === "coupons" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-[20px] font-semibold text-[var(--color-text-primary)]">
                  {isTh ? "คูปองและการจองของฉัน" : "Coupons & bookings"}
                </h2>
                <p className="text-[14px] text-[var(--color-text-secondary)] mt-1">
                  {isTh
                    ? "ตรวจสอบคูปองส่วนลดที่เก็บไว้ รายการจองที่พักตรง 0% GP และ Wishlist ของคุณ"
                    : "Access your saved coupons, direct 0% GP stay bookings, and wishlists."}
                </p>
              </div>

              <div className="divide-y divide-[var(--color-border)]">
                {/* Coupon Wallet */}
                <div className="py-5 first:pt-2 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span className="h-11 w-11 rounded-full bg-[var(--color-background-muted)] text-[var(--color-accent)] inline-flex items-center justify-center shrink-0">
                      <TicketPercent className="w-5 h-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[15px] font-semibold text-[var(--color-text-primary)]">
                        {isTh ? "กระเป๋าคูปองของฉัน" : "Your coupons"}
                      </p>
                      <p className="text-[14px] text-[var(--color-text-secondary)]">
                        {isTh
                          ? `เก็บไว้พร้อมใช้งาน ${summary.savedCouponsCount} ใบ`
                          : `${summary.savedCouponsCount} coupons available`}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => openCouponWallet()}
                    className="h-9 px-4 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] text-[14px] font-semibold cursor-pointer shrink-0 transition-colors"
                  >
                    {isTh ? "เปิดกระเป๋าคูปอง" : "Open wallet"}
                  </button>
                </div>

                {/* Bookings */}
                <div className="py-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span className="h-11 w-11 rounded-full bg-[var(--color-background-muted)] text-[var(--color-accent)] inline-flex items-center justify-center shrink-0">
                      <CalendarCheck className="w-5 h-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[15px] font-semibold text-[var(--color-text-primary)]">
                        {isTh ? "ประวัติการจองที่พัก" : "Your stay bookings"}
                      </p>
                      <p className="text-[14px] text-[var(--color-text-secondary)]">
                        {isTh
                          ? `ทั้งหมด ${summary.totalBookingsCount} รายการ${
                              summary.pendingBookingsCount > 0
                                ? ` · รอยืนยัน ${summary.pendingBookingsCount}`
                                : ""
                            }`
                          : `${summary.totalBookingsCount} bookings`}
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/bookings"
                    className="h-9 px-4 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[14px] font-semibold text-[var(--color-text-primary)] inline-flex items-center gap-1.5 shrink-0 transition-colors"
                  >
                    <span>{isTh ? "ดูการจอง" : "View bookings"}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {/* Wishlist */}
                <div className="py-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span className="h-11 w-11 rounded-full bg-[var(--color-background-muted)] text-[#e60023] inline-flex items-center justify-center shrink-0">
                      <Heart className="w-5 h-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[15px] font-semibold text-[var(--color-text-primary)]">
                        {isTh ? "Wishlist & ทริปที่บันทึกไว้" : "Saved wishlist & trips"}
                      </p>
                      <p className="text-[14px] text-[var(--color-text-secondary)]">
                        {isTh
                          ? `${summary.savedPinsCount} สถานที่/โปร · ${summary.boardsCount} ทริป`
                          : `${summary.savedPinsCount} saved · ${summary.boardsCount} trips`}
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/wishlist"
                    className="h-9 px-4 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[14px] font-semibold text-[var(--color-text-primary)] inline-flex items-center gap-1.5 shrink-0 transition-colors"
                  >
                    <span>{isTh ? "ดู Wishlist" : "Open wishlist"}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* 0% GP Direct PromptPay Safety Note */}
              <div className="rounded-[20px] bg-[var(--color-background-muted)] p-5 flex items-start gap-3.5">
                <ShieldCheck className="w-5 h-5 text-[var(--color-accent)] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-[14px] font-semibold text-[var(--color-text-primary)]">
                    {isTh
                      ? "จองตรง 0% GP — ไม่เก็บข้อมูลบัตรเครดิต"
                      : "0% GP Direct Booking — No stored credit cards"}
                  </p>
                  <p className="text-[14px] leading-relaxed text-[var(--color-text-secondary)]">
                    {isTh
                      ? "การจองที่พักบน Nondii โอนชำระตรงไปยัง PromptPay ของที่พักโดยตรง ไม่มีการตัดบัตรอัตโนมัติและไม่จัดเก็บหมายเลขบัตรเครดิตของคุณในระบบ"
                      : "Stays on Nondii settle directly to verified property PromptPay accounts with zero stored credit cards."}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </WorkspaceSplitLayout>
    </>
  );
}
