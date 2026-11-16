"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Ban,
  Building2,
  Check,
  ChevronLeft,
  Crown,
  ExternalLink,
  Globe,
  Loader2,
  Lock,
  Moon,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sun,
  Trash2,
  Users,
} from "lucide-react";
import { useHotelApp } from "@/components/HotelAppShell";
import { StandardButton, StatusPill } from "@/components/ui/standards";
import {
  UserAvatarCircle,
  useAuthenticatedProfile,
} from "@/components/navigation/UserProfileDropdown";
import type { PlatformTenantRecord } from "@/lib/db";
import type { ManagedPlatformUser } from "@/app/api/platform/users/route";
import type { AppUserRole } from "@/lib/auth/client";

type SuperTab = "tenants" | "users";

function computeDaysLeft(expiresAtIso: string): number {
  const diffMs = new Date(expiresAtIso).getTime() - Date.now();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

export default function SuperAdminPage() {
  const { lang, setLang, theme, toggleTheme } = useHotelApp();
  const { user: currentUser, isCheckingSession } = useAuthenticatedProfile();

  const [activeTab, setActiveTab] = useState<SuperTab>("tenants");
  const [tenants, setTenants] = useState<PlatformTenantRecord[]>([]);
  const [users, setUsers] = useState<ManagedPlatformUser[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Create Tenant Form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newNameTh, setNewNameTh] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newOwnerEmail, setNewOwnerEmail] = useState("");
  const [newCustomDomain, setNewCustomDomain] = useState("");
  const [newStatus, setNewStatus] = useState<"TRIAL" | "ACTIVE">("TRIAL");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showToast = (msg: string) => {
    setNotice(msg);
    setErrorMsg(null);
    window.setTimeout(() => setNotice(null), 2800);
  };

  const fetchPlatformData = useCallback(async () => {
    setIsLoadingData(true);
    try {
      const [tenantsRes, usersRes] = await Promise.all([
        fetch("/api/platform/tenants", { cache: "no-store" }),
        fetch("/api/platform/users", { cache: "no-store" }),
      ]);
      if (tenantsRes.ok) {
        const tData = await tenantsRes.json();
        setTenants(tData.tenants || []);
      }
      if (usersRes.ok) {
        const uData = await usersRes.json();
        setUsers(uData.users || []);
      }
    } catch {
      setErrorMsg("ไม่สามารถโหลดข้อมูลแพลตฟอร์มได้");
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser?.role === "SUPER_ADMIN") {
      fetchPlatformData();
    }
  }, [currentUser?.role, fetchPlatformData]);

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNameTh.trim() || !newSlug.trim() || !newOwnerEmail.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/platform/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nameTh: newNameTh.trim(),
          slug: newSlug.trim(),
          ownerEmail: newOwnerEmail.trim(),
          customDomain: newCustomDomain.trim(),
          status: newStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "สร้างโรงแรมไม่สำเร็จ");
        return;
      }
      setTenants((prev) => [data.tenant, ...prev]);
      setNewNameTh("");
      setNewSlug("");
      setNewOwnerEmail("");
      setNewCustomDomain("");
      setShowCreateForm(false);
      showToast(`เพิ่มโรงแรม ${data.tenant.slug}.cangaroom.com เรียบร้อยแล้ว`);
      fetchPlatformData();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTenantAction = async (
    id: string,
    action: "EXTEND_TRIAL_30D" | "ACTIVATE_1YR" | "SUSPEND" | "REACTIVATE"
  ) => {
    const res = await fetch("/api/platform/tenants", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    const data = await res.json();
    if (res.ok && data.tenant) {
      setTenants((prev) =>
        prev.map((t) => (t.id === id ? data.tenant : t))
      );
      showToast("อัปเดตสถานะโรงแรมเรียบร้อยแล้ว");
    } else {
      setErrorMsg(data.error || "ไม่สามารถอัปเดตได้");
    }
  };

  const handleDeleteTenant = async (tenant: PlatformTenantRecord) => {
    if (
      !window.confirm(
        `ยืนยันลบโรงแรม "${tenant.nameTh}" (${tenant.slug}.cangaroom.com) ออกจากระบบ?`
      )
    ) {
      return;
    }
    const res = await fetch(
      `/api/platform/tenants?id=${encodeURIComponent(tenant.id)}`,
      { method: "DELETE" }
    );
    const data = await res.json();
    if (res.ok) {
      setTenants((prev) => prev.filter((t) => t.id !== tenant.id));
      showToast(`ลบ ${tenant.nameTh} เรียบร้อยแล้ว`);
    } else {
      setErrorMsg(data.error || "ลบไม่สำเร็จ");
    }
  };

  const handleUpdateUser = async (
    targetUser: ManagedPlatformUser,
    patch: { role?: AppUserRole; tenantSlug?: string; banned?: boolean }
  ) => {
    const res = await fetch("/api/platform/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: targetUser.id,
        email: targetUser.email,
        ...patch,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      showToast(`อัปเดตบัญชี ${targetUser.email} เรียบร้อยแล้ว`);
      fetchPlatformData();
    } else {
      setErrorMsg(data.error || "อัปเดตบัญชีไม่สำเร็จ");
    }
  };

  const handleDeleteUser = async (targetUser: ManagedPlatformUser) => {
    if (
      !window.confirm(
        `ยืนยันลบบัญชีผู้ใช้ "${targetUser.email}" ออกจากระบบถาวร?`
      )
    ) {
      return;
    }
    const res = await fetch(
      `/api/platform/users?id=${encodeURIComponent(
        targetUser.id
      )}&email=${encodeURIComponent(targetUser.email)}`,
      { method: "DELETE" }
    );
    const data = await res.json();
    if (res.ok) {
      setUsers((prev) => prev.filter((u) => u.id !== targetUser.id));
      showToast(`ลบบัญชี ${targetUser.email} เรียบร้อยแล้ว`);
    } else {
      setErrorMsg(data.error || "ลบบัญชีไม่สำเร็จ");
    }
  };

  const filteredTenants = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return tenants;
    return tenants.filter(
      (t) =>
        t.nameTh.toLowerCase().includes(q) ||
        t.slug.toLowerCase().includes(q) ||
        t.ownerEmail.toLowerCase().includes(q) ||
        t.customDomain.toLowerCase().includes(q)
    );
  }, [tenants, searchQuery]);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.tenantSlug || "").toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  const activePaidCount = tenants.filter((t) => t.status === "ACTIVE").length;
  const trialCount = tenants.filter((t) => t.status === "TRIAL").length;
  const totalArr = tenants
    .filter((t) => t.status === "ACTIVE")
    .reduce((sum, t) => sum + (t.planPriceThb || 12000), 0);

  // Route Guard: Only SUPER_ADMIN can access /super-admin
  if (isCheckingSession) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-[var(--color-background-body)] gap-2 ty-body">
        <Loader2 className="w-5 h-5 animate-spin text-[var(--color-accent)]" />
        <span>กำลังตรวจสอบสิทธิ์ผู้ดูแลแพลตฟอร์ม...</span>
      </div>
    );
  }

  if (!currentUser || currentUser.role !== "SUPER_ADMIN") {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-[var(--color-background-body)] px-4">
        <div className="w-full max-w-[420px] app-card p-6 text-center space-y-4">
          <div className="mx-auto h-12 w-12 rounded-full bg-[var(--color-error-muted)] text-[var(--color-error)] flex items-center justify-center">
            <Lock className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h1 className="ty-title">เฉพาะผู้ดูแลแพลตฟอร์มสูงสุด (Super Admin)</h1>
            <p className="ty-body-muted">
              กรุณาเข้าสู่ระบบด้วยอีเมลผู้ดูแลหลักของ Cangaroom เพื่อเข้าใช้งานหน้านี้
            </p>
          </div>
          <div className="flex items-center justify-center gap-2">
            <Link href="/login" className="btn-round-solid">
              เข้าสู่ระบบ
            </Link>
            <Link href="/" className="btn-fw-secondary">
              กลับหน้าแรก
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] pt-14 bg-[var(--color-background-body)] text-[var(--color-text-primary)]">
      {/* Facebook-Style Fixed Top Header */}
      <header className="fixed top-0 inset-x-0 z-40 h-14 bg-[var(--color-background-card)] border-b border-[var(--color-border)] shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
        <div className="max-w-6xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Link href="/" className="btn-fw-secondary !h-9 !px-3">
              <ChevronLeft className="w-4 h-4" />
              <span>{lang === "th" ? "หน้าเว็บ" : "Storefront"}</span>
            </Link>

            <Crown className="w-5 h-5 text-[var(--color-accent)] shrink-0" />
            <span className="ty-subtitle font-bold truncate">
              Cangaroom Super Admin
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/register-hotel"
              className="hidden sm:inline-flex btn-fw-secondary !h-9 !px-3"
            >
              <Plus className="w-4 h-4" />
              <span>หน้าสมัครฟรี 30 วัน</span>
            </Link>

            <button
              type="button"
              onClick={() => setLang(lang === "th" ? "en" : "th")}
              className="btn-icon ty-caption font-bold"
            >
              {lang === "th" ? "EN" : "TH"}
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              className="btn-icon"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-5 space-y-4">
        {/* 1. REAL DATABASE KPI SUMMARY BAR */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="app-card p-4">
            <p className="ty-caption">โรงแรมทั้งหมดในระบบ</p>
            <p className="ty-display mt-1">{tenants.length}</p>
          </div>
          <div className="app-card p-4">
            <p className="ty-caption">กำลังทดลองใช้ฟรี 30 วัน</p>
            <p className="ty-display mt-1 text-[var(--color-warning)]">
              {trialCount}
            </p>
          </div>
          <div className="app-card p-4">
            <p className="ty-caption">เปิดแพ็กเกจรายปีแล้ว (Active)</p>
            <p className="ty-display mt-1 text-[var(--color-success)]">
              {activePaidCount}
            </p>
          </div>
          <div className="app-card p-4">
            <p className="ty-caption">รายได้ประจำต่อปี (ARR)</p>
            <p className="ty-display mt-1 text-[var(--color-accent)]">
              ฿{totalArr.toLocaleString()}
            </p>
          </div>
        </section>

        {/* 2. CLEAN 2-TAB BAR + SEARCH */}
        <section className="app-card p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("tenants")}
              className={`h-10 px-4 rounded-[8px] inline-flex items-center gap-2 ty-body font-semibold transition cursor-pointer ${
                activeTab === "tenants"
                  ? "bg-[var(--color-accent)] text-[var(--color-on-accent)]"
                  : "bg-[var(--color-background-muted)] text-[var(--color-text-primary)] hover:bg-[var(--color-background-subtle)]"
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>โรงแรม & วันทดลองใช้ ({tenants.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("users")}
              className={`h-10 px-4 rounded-[8px] inline-flex items-center gap-2 ty-body font-semibold transition cursor-pointer ${
                activeTab === "users"
                  ? "bg-[var(--color-accent)] text-[var(--color-on-accent)]"
                  : "bg-[var(--color-background-muted)] text-[var(--color-text-primary)] hover:bg-[var(--color-background-subtle)]"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>บัญชีผู้ใช้ทั้งหมด ({users.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-[260px]">
              <Search className="w-4 h-4 text-[var(--color-text-secondary)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาชื่อโรงแรม, อีเมล, โดเมน..."
                className="h-10 w-full rounded-full bg-[var(--color-background-muted)] pl-9 pr-3.5 ty-body focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
              />
            </div>

            {activeTab === "tenants" && (
              <StandardButton
                variant="primary"
                size="md"
                onClick={() => setShowCreateForm((v) => !v)}
              >
                <Plus className="w-4 h-4" />
                <span>{showCreateForm ? "ปิดฟอร์ม" : "เพิ่มโรงแรม"}</span>
              </StandardButton>
            )}
          </div>
        </section>

        {notice && (
          <div className="rounded-[8px] bg-[var(--color-success-muted)] text-[var(--color-success)] px-4 py-2.5 ty-body font-semibold">
            ✓ {notice}
          </div>
        )}
        {errorMsg && (
          <div className="rounded-[8px] bg-[var(--color-error-muted)] text-[var(--color-error)] px-4 py-2.5 ty-body font-semibold">
            {errorMsg}
          </div>
        )}

        {/* =================================================================
            TAB 1: REAL HOTELS & 30-DAY FREE TRIAL MANAGEMENT
        ================================================================== */}
        {activeTab === "tenants" && (
          <section className="space-y-3">
            {showCreateForm && (
              <form
                onSubmit={handleCreateTenant}
                className="app-card p-4 space-y-3"
              >
                <h2 className="ty-subtitle font-bold">
                  เพิ่มโรงแรมใหม่เข้าระบบฐานข้อมูล
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  <input
                    type="text"
                    required
                    value={newNameTh}
                    onChange={(e) => setNewNameTh(e.target.value)}
                    placeholder="ชื่อโรงแรม *"
                    className="fw-input"
                  />
                  <input
                    type="text"
                    required
                    value={newSlug}
                    onChange={(e) =>
                      setNewSlug(
                        e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")
                      )
                    }
                    placeholder="ซับโดเมน (เช่น phupha) *"
                    className="fw-input font-mono"
                  />
                  <input
                    type="email"
                    required
                    value={newOwnerEmail}
                    onChange={(e) => setNewOwnerEmail(e.target.value)}
                    placeholder="Gmail เจ้าของที่พัก *"
                    className="fw-input"
                  />
                  <input
                    type="text"
                    value={newCustomDomain}
                    onChange={(e) => setNewCustomDomain(e.target.value)}
                    placeholder="โดเมน .com (ถ้ามี)"
                    className="fw-input font-mono"
                  />
                  <div className="flex items-center gap-2">
                    <select
                      value={newStatus}
                      onChange={(e) =>
                        setNewStatus(e.target.value as "TRIAL" | "ACTIVE")
                      }
                      className="fw-input flex-1"
                    >
                      <option value="TRIAL">ทดลองฟรี 30 วัน</option>
                      <option value="ACTIVE">รายปี (Active)</option>
                    </select>
                    <StandardButton
                      type="submit"
                      variant="primary"
                      size="md"
                      disabled={isSubmitting}
                    >
                      <Check className="w-4 h-4" />
                      <span>บันทึก</span>
                    </StandardButton>
                  </div>
                </div>
              </form>
            )}

            {isLoadingData ? (
              <div className="app-card p-8 flex items-center justify-center gap-2 ty-body-muted">
                <Loader2 className="w-5 h-5 animate-spin text-[var(--color-accent)]" />
                <span>กำลังโหลดรายชื่อโรงแรมจากฐานข้อมูล...</span>
              </div>
            ) : filteredTenants.length === 0 ? (
              <div className="app-card p-8 text-center ty-body-muted">
                ไม่พบโรงแรมที่ค้นหา
              </div>
            ) : (
              filteredTenants.map((tenant) => {
                const daysLeft = computeDaysLeft(tenant.expiresAt);
                const storefrontHref =
                  tenant.slug === "sapanunseen"
                    ? "/"
                    : `/?tenant=${encodeURIComponent(tenant.slug)}`;
                const adminHref =
                  tenant.slug === "sapanunseen"
                    ? "/admin"
                    : `/admin?tenant=${encodeURIComponent(tenant.slug)}`;

                return (
                  <article
                    key={tenant.id}
                    className="app-card p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="ty-subtitle font-bold">
                          {tenant.nameTh}
                        </h3>
                        <StatusPill
                          variant={
                            tenant.status === "ACTIVE"
                              ? "success"
                              : tenant.status === "TRIAL"
                              ? "warning"
                              : "error"
                          }
                        >
                          {tenant.status === "TRIAL"
                            ? `ทดลองใช้ · เหลือ ${daysLeft} วัน`
                            : tenant.status === "ACTIVE"
                            ? `ใช้งานรายปี · เหลือ ${daysLeft} วัน`
                            : tenant.status === "SUSPENDED"
                            ? "ระงับชั่วคราว"
                            : "หมดอายุ"}
                        </StatusPill>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 ty-caption">
                        <span className="inline-flex items-center gap-1 font-mono text-[var(--color-accent)] font-semibold">
                          <Globe className="w-3.5 h-3.5" />
                          {tenant.slug}.cangaroom.com
                        </span>
                        {tenant.customDomain && (
                          <span className="font-mono font-semibold text-[var(--color-text-primary)]">
                            · {tenant.customDomain}
                          </span>
                        )}
                        <span>· เจ้าของ: {tenant.ownerEmail}</span>
                        <span>
                          · หมดอายุ:{" "}
                          {new Date(tenant.expiresAt).toLocaleDateString(
                            "th-TH"
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          handleTenantAction(tenant.id, "EXTEND_TRIAL_30D")
                        }
                        className="btn-fw-secondary !h-8 !px-3 !text-[13px]"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>+30 วัน</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleTenantAction(tenant.id, "ACTIVATE_1YR")
                        }
                        className="btn-round-solid !h-8 !px-3 !text-[13px]"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>เปิดรายปี (+1 ปี)</span>
                      </button>

                      {tenant.status === "SUSPENDED" ? (
                        <button
                          type="button"
                          onClick={() =>
                            handleTenantAction(tenant.id, "REACTIVATE")
                          }
                          className="btn-fw-secondary !h-8 !px-3 !text-[13px]"
                        >
                          <span>ปลดระงับ</span>
                        </button>
                      ) : (
                        tenant.id !== "ten-sapanunseen" && (
                          <button
                            type="button"
                            onClick={() =>
                              handleTenantAction(tenant.id, "SUSPEND")
                            }
                            className="btn-fw-secondary !h-8 !px-3 !text-[13px]"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            <span>ระงับ</span>
                          </button>
                        )
                      )}

                      <Link
                        href={storefrontHref}
                        className="btn-fw-secondary !h-8 !px-3 !text-[13px]"
                      >
                        <span>หน้าเว็บ</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>

                      <Link
                        href={adminHref}
                        className="btn-fw-secondary !h-8 !px-3 !text-[13px]"
                      >
                        <span>หลังบ้าน</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>

                      {tenant.id !== "ten-sapanunseen" && (
                        <button
                          type="button"
                          onClick={() => handleDeleteTenant(tenant)}
                          className="h-8 w-8 rounded-[8px] bg-[var(--color-error-muted)] text-[var(--color-error)] inline-flex items-center justify-center hover:opacity-85 cursor-pointer"
                          title="ลบโรงแรม"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </article>
                );
              })
            )}
          </section>
        )}

        {/* =================================================================
            TAB 2: ALL USER ACCOUNTS MANAGEMENT (neon_auth.user)
        ================================================================== */}
        {activeTab === "users" && (
          <section className="space-y-3">
            {isLoadingData ? (
              <div className="app-card p-8 flex items-center justify-center gap-2 ty-body-muted">
                <Loader2 className="w-5 h-5 animate-spin text-[var(--color-accent)]" />
                <span>กำลังโหลดรายชื่อบัญชีผู้ใช้ทั้งหมด...</span>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="app-card p-8 text-center ty-body-muted">
                ยังไม่มีบัญชีผู้ใช้ที่ตรงกับคำค้นหา
              </div>
            ) : (
              filteredUsers.map((u) => {
                const isPrimaryOwner =
                  u.email.toLowerCase() === "cangaroomapp@gmail.com";

                return (
                  <article
                    key={u.id}
                    className="app-card p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <UserAvatarCircle
                        user={{
                          name: u.name,
                          email: u.email,
                          image: u.image,
                          role: u.role,
                        }}
                        sizeClass="h-11 w-11"
                      />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="ty-subtitle font-bold truncate">
                            {u.name}
                          </h3>
                          {u.banned ? (
                            <StatusPill variant="error">ถูกระงับบัญชี</StatusPill>
                          ) : (
                            <StatusPill
                              variant={
                                u.role === "SUPER_ADMIN"
                                  ? "accent"
                                  : u.role === "HOTEL_ADMIN"
                                  ? "success"
                                  : "neutral"
                              }
                            >
                              {u.role}
                            </StatusPill>
                          )}
                        </div>
                        <p className="ty-caption truncate">
                          {u.email} · สมัครเมื่อ{" "}
                          {new Date(u.createdAt).toLocaleDateString("th-TH")}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {/* Role Selector */}
                      <select
                        disabled={isPrimaryOwner}
                        value={u.role}
                        onChange={(e) =>
                          handleUpdateUser(u, {
                            role: e.target.value as AppUserRole,
                          })
                        }
                        aria-label="กำหนดสิทธิ์ผู้ใช้"
                        className="fw-input !h-9 !text-[13px]"
                      >
                        <option value="GUEST">GUEST (ลูกค้าจองห้อง)</option>
                        <option value="HOTEL_ADMIN">
                          HOTEL_ADMIN (เจ้าของที่พัก)
                        </option>
                        <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                      </select>

                      {/* Linked Hotel Selector */}
                      <select
                        value={u.tenantSlug || ""}
                        onChange={(e) =>
                          handleUpdateUser(u, { tenantSlug: e.target.value })
                        }
                        aria-label="ผูกกับโรงแรม"
                        className="fw-input !h-9 !text-[13px] max-w-[200px]"
                      >
                        <option value="">— ไม่ผูกโรงแรม —</option>
                        {tenants.map((t) => (
                          <option key={t.id} value={t.slug}>
                            {t.nameTh} ({t.slug})
                          </option>
                        ))}
                      </select>

                      {!isPrimaryOwner && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateUser(u, { banned: !u.banned })
                            }
                            className="btn-fw-secondary !h-9 !px-3 !text-[13px]"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            <span>{u.banned ? "ปลดระงับ" : "ระงับบัญชี"}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u)}
                            className="h-9 w-9 rounded-[8px] bg-[var(--color-error-muted)] text-[var(--color-error)] inline-flex items-center justify-center hover:opacity-85 cursor-pointer"
                            title="ลบบัญชีผู้ใช้"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </article>
                );
              })
            )}
          </section>
        )}
      </main>
    </div>
  );
}
