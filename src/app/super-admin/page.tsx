"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Building2,
  Globe,
  Plus,
  Check,
  ChevronLeft,
  ExternalLink,
  RefreshCw,
  Sparkles,
  CreditCard,
  ShieldCheck,
  Sun,
  Moon,
} from "lucide-react";
import { useHotelApp } from "@/components/HotelAppShell";
import { StandardButton, StatusPill } from "@/components/ui/standards";

interface TenantHotel {
  id: string;
  nameTh: string;
  nameEn: string;
  subdomain: string;
  customDomain: string;
  ownerLine: string;
  planPriceThb: number;
  status: "ACTIVE" | "TRIAL" | "EXPIRED";
  expiresAt: string;
  autoConfirmQr: boolean;
}

const INITIAL_TENANTS: TenantHotel[] = [
  {
    id: "ten-1",
    nameTh: "สะปัน อันซีน น่าน",
    nameEn: "Sapan Unseen Nan",
    subdomain: "sapanunseen.cangaroom.com",
    customDomain: "www.sapanunseen.com",
    ownerLine: "@sapanunseen",
    planPriceThb: 12000,
    status: "ACTIVE",
    expiresAt: "2027-10-23",
    autoConfirmQr: true,
  },
  {
    id: "ten-2",
    nameTh: "คีรีมาลา พูลวิลล่า เขาใหญ่",
    nameEn: "Kirimala Pool Villa",
    subdomain: "kirimala.cangaroom.com",
    customDomain: "www.kirimalaresort.com",
    ownerLine: "@kirimala",
    planPriceThb: 12000,
    status: "ACTIVE",
    expiresAt: "2027-08-15",
    autoConfirmQr: true,
  },
  {
    id: "ten-3",
    nameTh: "ม่อนหมอก แคมป์ปิ้ง เชียงใหม่",
    nameEn: "Mon Mok Glamping",
    subdomain: "monmok.cangaroom.com",
    customDomain: "",
    ownerLine: "@monmokcamp",
    planPriceThb: 12000,
    status: "TRIAL",
    expiresAt: "2026-11-10",
    autoConfirmQr: true,
  },
];

type SuperTab = "tenants" | "services" | "billing";

export default function SuperAdminPage() {
  const { lang, setLang, theme, toggleTheme } = useHotelApp();
  const [activeTab, setActiveTab] = useState<SuperTab>("tenants");
  const [tenants, setTenants] = useState<TenantHotel[]>(INITIAL_TENANTS);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newNameTh, setNewNameTh] = useState("");
  const [newSubdomain, setNewSubdomain] = useState("");
  const [newCustomDomain, setNewCustomDomain] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 2400);
  };

  const handleCreateTenant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNameTh.trim()) return;
    const slug =
      newSubdomain
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "") || `hotel-${tenants.length + 1}`;
    const nextTenant: TenantHotel = {
      id: `ten-${Date.now()}`,
      nameTh: newNameTh.trim(),
      nameEn: newNameTh.trim(),
      subdomain: `${slug}.cangaroom.com`,
      customDomain: newCustomDomain.trim(),
      ownerLine: `@${slug}`,
      planPriceThb: 12000,
      status: "ACTIVE",
      expiresAt: "2027-10-23",
      autoConfirmQr: true,
    };
    setTenants((prev) => [nextTenant, ...prev]);
    setNewNameTh("");
    setNewSubdomain("");
    setNewCustomDomain("");
    setShowCreateForm(false);
    showToast(`สร้างเว็บไซต์ ${nextTenant.subdomain} สำเร็จแล้ว`);
  };

  const handleExtendOneYear = (id: string) => {
    setTenants((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              status: "ACTIVE",
              expiresAt: "2028-10-23",
            }
          : t
      )
    );
    showToast("ต่ออายุแพ็กเกจ 12,000 บาท/ปี (+1 ปี) เรียบร้อยแล้ว");
  };

  const activeCount = tenants.filter((t) => t.status === "ACTIVE").length;
  const totalArr = activeCount * 12000;

  return (
    <div className="min-h-[100dvh] pt-12 bg-[var(--color-background-body)] text-[var(--color-text-primary)]">
      {/* Slim Always-Sticky Top Bar (Matches /admin, h-12 = 48px) */}
      <header className="fixed top-0 inset-x-0 z-40 h-12 bg-[var(--color-background-body)]/92 backdrop-blur-xl shadow-[0_2px_14px_rgba(15,23,42,0.05)]">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Link
              href="/"
              className="h-8 px-3 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] ty-caption font-semibold inline-flex items-center gap-1.5 shrink-0 transition"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>{lang === "th" ? "หน้าร้าน" : "Storefront"}</span>
            </Link>

            <ShieldCheck className="w-4 h-4 text-[var(--color-accent)] shrink-0" />
            <span className="ty-body font-bold truncate">Super Admin</span>
            <span className="hidden sm:inline-flex">
              <StatusPill variant="accent">SaaS Platform</StatusPill>
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Link
              href="/admin"
              className="hidden sm:inline-flex h-8 px-3 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] ty-caption font-semibold items-center gap-1.5 transition"
            >
              <span>Hotel Admin</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>

            <button
              type="button"
              onClick={() => setLang(lang === "th" ? "en" : "th")}
              className="btn-icon cursor-pointer ty-caption font-bold"
              title={lang === "th" ? "Switch to English" : "เปลี่ยนเป็นภาษาไทย"}
              aria-label="Toggle language"
            >
              {lang === "th" ? "EN" : "TH"}
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              className="btn-icon cursor-pointer"
              title={theme === "dark" ? "Light Mode" : "Dark Mode"}
              aria-label="Toggle Dark or Light Mode"
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* LEFT SIDEBAR (1-Layer Tonal Surface) */}
          <aside className="md:col-span-4 lg:col-span-3 rounded-[20px] bg-[var(--color-background-muted)] p-4 flex flex-col gap-4 md:sticky md:top-16">
            <div className="px-2">
              <h1 className="ty-title">
                {lang === "th" ? "จัดการแพลตฟอร์ม" : "Platform Console"}
              </h1>
              <p className="ty-caption mt-0.5">
                {lang === "th"
                  ? "จัดการผู้เช่าโรงแรม โดเมน และรายได้รายปี"
                  : "Manage hotel tenants, custom domains & ARR"}
              </p>
            </div>

            <nav className="flex md:flex-col gap-1 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setActiveTab("tenants")}
                className={`h-11 px-3.5 rounded-[12px] flex items-center justify-between gap-2.5 ty-body transition cursor-pointer shrink-0 ${
                  activeTab === "tenants"
                    ? "bg-[var(--color-accent)] text-[var(--color-on-accent)] font-semibold"
                    : "text-[var(--color-text-secondary)] hover:bg-[var(--color-background-subtle)]"
                }`}
              >
                <span className="flex items-center gap-3">
                  <Building2 className="w-4 h-4" />
                  <span>Hotels & Domains</span>
                </span>
                <span className="ty-caption font-semibold opacity-90">
                  {tenants.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("services")}
                className={`h-11 px-3.5 rounded-[12px] flex items-center justify-between gap-2.5 ty-body transition cursor-pointer shrink-0 ${
                  activeTab === "services"
                    ? "bg-[var(--color-accent)] text-[var(--color-on-accent)] font-semibold"
                    : "text-[var(--color-text-secondary)] hover:bg-[var(--color-background-subtle)]"
                }`}
              >
                <span className="flex items-center gap-3">
                  <Sparkles className="w-4 h-4" />
                  <span>Add-on Services</span>
                </span>
                <span className="ty-caption font-semibold opacity-90">4</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("billing")}
                className={`h-11 px-3.5 rounded-[12px] flex items-center justify-between gap-2.5 ty-body transition cursor-pointer shrink-0 ${
                  activeTab === "billing"
                    ? "bg-[var(--color-accent)] text-[var(--color-on-accent)] font-semibold"
                    : "text-[var(--color-text-secondary)] hover:bg-[var(--color-background-subtle)]"
                }`}
              >
                <span className="flex items-center gap-3">
                  <CreditCard className="w-4 h-4" />
                  <span>ARR & Billing</span>
                </span>
              </button>
            </nav>

            <div className="hidden md:flex items-center justify-between px-2 pt-2 ty-caption">
              <span>SaaS ฿12,000/yr</span>
              <Link
                href="/admin"
                className="font-semibold text-[var(--color-accent)] hover:underline inline-flex items-center gap-1"
              >
                <span>Hotel Admin</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </aside>

          {/* RIGHT WORKSPACE (Open Canvas) */}
          <section className="md:col-span-8 lg:col-span-9 space-y-5">
            <header className="flex items-center justify-between gap-4">
              <div>
                <h2 className="ty-display">
                  {activeTab === "tenants"
                    ? "Hotels & Custom Domains"
                    : activeTab === "services"
                    ? "Simple Value-Added Services"
                    : "Annual Recurring Revenue (ARR)"}
                </h2>
                {notice && (
                  <p className="ty-caption font-semibold text-[var(--color-success)] mt-1">
                    ✓ {notice}
                  </p>
                )}
              </div>

              {activeTab === "tenants" && (
                <StandardButton
                  variant="primary"
                  size="md"
                  onClick={() => setShowCreateForm((v) => !v)}
                >
                  <Plus className="w-4 h-4" />
                  <span>{showCreateForm ? "Close" : "New Hotel"}</span>
                </StandardButton>
              )}
            </header>

            {activeTab === "tenants" && (
              <div className="space-y-3">
                {showCreateForm && (
                  <form
                    onSubmit={handleCreateTenant}
                    className="grid grid-cols-1 sm:grid-cols-3 gap-3 pb-2"
                  >
                    <input
                      type="text"
                      required
                      value={newNameTh}
                      onChange={(e) => setNewNameTh(e.target.value)}
                      placeholder="ชื่อโรงแรม (เช่น ภูผา รีสอร์ท)"
                      className="h-10 rounded-[12px] bg-[var(--color-background-muted)] px-3.5 ty-body focus:ring-2 focus:ring-[var(--color-accent)]/30 focus:outline-none"
                    />
                    <input
                      type="text"
                      value={newSubdomain}
                      onChange={(e) => setNewSubdomain(e.target.value)}
                      placeholder="Subdomain (เช่น phupha)"
                      className="h-10 rounded-[12px] bg-[var(--color-background-muted)] px-3.5 ty-body font-mono focus:ring-2 focus:ring-[var(--color-accent)]/30 focus:outline-none"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newCustomDomain}
                        onChange={(e) => setNewCustomDomain(e.target.value)}
                        placeholder="Custom .com (เช่น www.phupha.com)"
                        className="h-10 flex-1 min-w-0 rounded-[12px] bg-[var(--color-background-muted)] px-3.5 ty-body font-mono focus:ring-2 focus:ring-[var(--color-accent)]/30 focus:outline-none"
                      />
                      <StandardButton type="submit" variant="primary" size="md">
                        <Check className="w-4 h-4" />
                        <span>Create</span>
                      </StandardButton>
                    </div>
                  </form>
                )}

                {tenants.map((tenant) => (
                  <article
                    key={tenant.id}
                    className="rounded-[16px] bg-[var(--color-background-muted)] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="ty-subtitle">{tenant.nameTh}</h3>
                        <StatusPill
                          variant={
                            tenant.status === "ACTIVE" ? "success" : "warning"
                          }
                        >
                          {tenant.status}
                        </StatusPill>
                      </div>

                      <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 ty-caption font-mono">
                        <span className="inline-flex items-center gap-1">
                          <Globe className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                          {tenant.subdomain}
                        </span>
                        {tenant.customDomain && (
                          <span className="font-semibold text-[var(--color-text-primary)]">
                            · {tenant.customDomain}
                          </span>
                        )}
                        <span>· Exp: {tenant.expiresAt}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleExtendOneYear(tenant.id)}
                        className="h-8 px-3 rounded-full bg-[var(--color-background-subtle)] hover:opacity-85 ty-caption font-semibold inline-flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>+1 Yr</span>
                      </button>

                      <Link
                        href="/admin"
                        title="เข้าหลังบ้านโรงแรมนี้ (Impersonate)"
                        className="h-8 px-3 rounded-full bg-[var(--color-accent)] text-[var(--color-on-accent)] ty-caption font-semibold inline-flex items-center gap-1.5 hover:opacity-90 transition"
                      >
                        <span>/admin</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {activeTab === "services" && (
              <div className="space-y-2.5">
                {[
                  {
                    title: "Done-for-You Initial Setup",
                    desc: "ลงรูปห้องพัก ตั้งค่าราคา และสอนใช้งานจนเปิดรับจองได้ทันที",
                    price: "฿3,500",
                  },
                  {
                    title: "Custom .com Domain + Cloudflare SSL",
                    desc: "จดโดเมนชื่อโรงแรม .com พร้อมผูก DNS และ SSL อัตโนมัติรายปี",
                    price: "฿1,000 / yr",
                  },
                  {
                    title: "Custom Resort Map Illustration",
                    desc: "วาดแผนผังรีสอร์ทพร้อมปักหมุดพิกัดวิลล่าแบบ Interactive",
                    price: "฿2,500",
                  },
                  {
                    title: "SEO Travel Blog Pack (10 Articles)",
                    desc: "เขียนบทความรีวิวที่เที่ยวใกล้โรงแรมเพื่อดึงคนจาก Google",
                    price: "฿1,500",
                  },
                ].map((srv) => (
                  <article
                    key={srv.title}
                    className="rounded-[16px] bg-[var(--color-background-muted)] p-4 flex items-center justify-between gap-4"
                  >
                    <div>
                      <h3 className="ty-body font-semibold">{srv.title}</h3>
                      <p className="ty-caption mt-0.5">{srv.desc}</p>
                    </div>
                    <span className="ty-subtitle font-bold text-[var(--color-accent)] shrink-0">
                      {srv.price}
                    </span>
                  </article>
                ))}
              </div>
            )}

            {activeTab === "billing" && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="rounded-[16px] bg-[var(--color-background-muted)] p-5">
                  <p className="ty-caption">Active Hotels</p>
                  <p className="ty-display mt-1">{activeCount}</p>
                </div>
                <div className="rounded-[16px] bg-[var(--color-background-muted)] p-5">
                  <p className="ty-caption">Annual Recurring (ARR)</p>
                  <p className="ty-display mt-1 text-[var(--color-accent)]">
                    ฿{totalArr.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-[16px] bg-[var(--color-background-muted)] p-5">
                  <p className="ty-caption">Package Rate</p>
                  <p className="ty-display mt-1">฿12,000 / yr</p>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
