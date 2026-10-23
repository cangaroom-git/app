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
} from "lucide-react";

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
    subdomain: "sapanunseen.myhotel.app",
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
    subdomain: "kirimala.myhotel.app",
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
    subdomain: "monmok.myhotel.app",
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
      subdomain: `${slug}.myhotel.app`,
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
    <div className="min-h-screen bg-[var(--color-background-muted)] p-2 sm:p-4">
      <div className="max-w-7xl mx-auto rounded-[20px] bg-[var(--color-background-card)] border border-[var(--color-border)] min-h-[82vh] grid grid-cols-1 md:grid-cols-12 overflow-hidden">
        {/* LEFT SIDEBAR */}
        <aside className="md:col-span-4 lg:col-span-3 border-b md:border-b-0 md:border-r border-[var(--color-border)] p-4 sm:p-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[var(--color-text-primary)]" />
                <h1 className="ty-title">Super Admin</h1>
              </div>
              <Link
                href="/"
                title="กลับหน้าหลัก"
                className="h-9 w-9 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-overlay-hover)] inline-flex items-center justify-center text-[var(--color-text-primary)] transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </Link>
            </div>

            <nav className="flex md:flex-col gap-1 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setActiveTab("tenants")}
                className={`h-11 px-3.5 rounded-[12px] flex items-center justify-between gap-2.5 ty-body transition cursor-pointer ${
                  activeTab === "tenants"
                    ? "bg-[var(--color-background-muted)] font-semibold text-[var(--color-text-primary)]"
                    : "text-[var(--color-text-secondary)] hover:bg-[var(--color-overlay-hover)]"
                }`}
              >
                <span className="flex items-center gap-3">
                  <Building2 className="w-4 h-4" />
                  <span>Hotels & Domains</span>
                </span>
                <span className="ty-caption">{tenants.length}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("services")}
                className={`h-11 px-3.5 rounded-[12px] flex items-center justify-between gap-2.5 ty-body transition cursor-pointer ${
                  activeTab === "services"
                    ? "bg-[var(--color-background-muted)] font-semibold text-[var(--color-text-primary)]"
                    : "text-[var(--color-text-secondary)] hover:bg-[var(--color-overlay-hover)]"
                }`}
              >
                <span className="flex items-center gap-3">
                  <Sparkles className="w-4 h-4" />
                  <span>Add-on Services</span>
                </span>
                <span className="ty-caption">4</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("billing")}
                className={`h-11 px-3.5 rounded-[12px] flex items-center justify-between gap-2.5 ty-body transition cursor-pointer ${
                  activeTab === "billing"
                    ? "bg-[var(--color-background-muted)] font-semibold text-[var(--color-text-primary)]"
                    : "text-[var(--color-text-secondary)] hover:bg-[var(--color-overlay-hover)]"
                }`}
              >
                <span className="flex items-center gap-3">
                  <CreditCard className="w-4 h-4" />
                  <span>ARR & Billing</span>
                </span>
              </button>
            </nav>
          </div>

          <div className="hidden md:flex items-center justify-between pt-5 border-t border-[var(--color-border)] px-2 ty-caption">
            <span>SaaS ฿12,000/yr</span>
            <Link
              href="/admin"
              className="font-semibold text-[var(--color-text-primary)] hover:underline inline-flex items-center gap-1"
            >
              <span>Hotel Admin</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </aside>

        {/* RIGHT CONTENT PANEL */}
        <div className="md:col-span-8 lg:col-span-9 flex flex-col">
          {/* Header */}
          <div className="px-6 sm:px-8 py-5 border-b border-[var(--color-border)] flex items-center justify-between gap-4">
            <div>
              <h2 className="ty-title">
                {activeTab === "tenants"
                  ? "Hotels & Custom Domains"
                  : activeTab === "services"
                  ? "Simple Value-Added Services"
                  : "Annual Recurring Revenue (ARR)"}
              </h2>
              {notice && (
                <p className="ty-caption font-semibold text-[var(--color-success)] mt-0.5">
                  ✓ {notice}
                </p>
              )}
            </div>

            {activeTab === "tenants" && (
              <button
                type="button"
                onClick={() => setShowCreateForm((v) => !v)}
                className="btn-round-solid !py-2 !px-4"
              >
                <Plus className="w-4 h-4" />
                <span>{showCreateForm ? "Close" : "New Hotel"}</span>
              </button>
            )}
          </div>

          {/* Body */}
          <div className="px-6 sm:px-8 py-4 flex-1">
            {activeTab === "tenants" && (
              <div className="space-y-4">
                {showCreateForm && (
                  <form
                    onSubmit={handleCreateTenant}
                    className="p-4 rounded-[16px] bg-[var(--color-background-muted)] border border-[var(--color-border)] space-y-3"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input
                        type="text"
                        required
                        value={newNameTh}
                        onChange={(e) => setNewNameTh(e.target.value)}
                        placeholder="ชื่อโรงแรม (เช่น ภูผา รีสอร์ท)"
                        className="h-10 rounded-[12px] border border-[var(--color-border-emphasized)] bg-[var(--color-background-card)] px-3.5 ty-body focus:outline-none"
                      />
                      <input
                        type="text"
                        value={newSubdomain}
                        onChange={(e) => setNewSubdomain(e.target.value)}
                        placeholder="Subdomain (เช่น phupha)"
                        className="h-10 rounded-[12px] border border-[var(--color-border-emphasized)] bg-[var(--color-background-card)] px-3.5 ty-body font-mono focus:outline-none"
                      />
                      <input
                        type="text"
                        value={newCustomDomain}
                        onChange={(e) => setNewCustomDomain(e.target.value)}
                        placeholder="Custom .com (เช่น www.phupha.com)"
                        className="h-10 rounded-[12px] border border-[var(--color-border-emphasized)] bg-[var(--color-background-card)] px-3.5 ty-body font-mono focus:outline-none"
                      />
                    </div>
                    <div className="flex justify-end">
                      <button type="submit" className="btn-round-solid !py-2">
                        <Check className="w-4 h-4" />
                        <span>Create Tenant</span>
                      </button>
                    </div>
                  </form>
                )}

                <div className="divide-y divide-[var(--color-border)]">
                  {tenants.map((tenant) => (
                    <div
                      key={tenant.id}
                      className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="ty-subtitle">{tenant.nameTh}</span>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                              tenant.status === "ACTIVE"
                                ? "bg-[var(--color-success-muted)] text-[var(--color-success)]"
                                : "bg-[var(--color-warning-muted)] text-[var(--color-warning)]"
                            }`}
                          >
                            {tenant.status}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 ty-caption font-mono">
                          <span className="inline-flex items-center gap-1">
                            <Globe className="w-3.5 h-3.5" />
                            {tenant.subdomain}
                          </span>
                          {tenant.customDomain && (
                            <span className="rounded-full bg-[var(--color-background-muted)] px-2.5 py-0.5 text-[var(--color-text-primary)] font-semibold">
                              {tenant.customDomain}
                            </span>
                          )}
                          <span>Exp: {tenant.expiresAt}</span>
                        </div>
                      </div>

                      {/* Icon-First Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleExtendOneYear(tenant.id)}
                          title="ต่ออายุ +1 ปี (฿12,000)"
                          className="btn-round-border !py-1.5 !px-3 !text-xs"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>+1 Yr</span>
                        </button>

                        <Link
                          href="/admin"
                          title="เข้าหลังบ้านโรงแรมนี้ (Impersonate)"
                          className="btn-round-solid !py-1.5 !px-3.5 !text-xs"
                        >
                          <span>/admin</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "services" && (
              <div className="divide-y divide-[var(--color-border)]">
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
                  <div key={srv.title} className="fw-setting-row">
                    <div>
                      <p className="ty-body font-semibold">{srv.title}</p>
                      <p className="ty-caption mt-0.5">{srv.desc}</p>
                    </div>
                    <span className="rounded-full bg-[var(--color-background-muted)] px-3.5 py-1.5 ty-body font-bold">
                      {srv.price}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "billing" && (
              <div className="space-y-5 py-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className="rounded-[16px] bg-[var(--color-background-muted)] p-4">
                    <p className="ty-caption">Active Hotels</p>
                    <p className="ty-display mt-1">{activeCount}</p>
                  </div>
                  <div className="rounded-[16px] bg-[var(--color-background-muted)] p-4">
                    <p className="ty-caption">Annual Recurring (ARR)</p>
                    <p className="ty-display mt-1">
                      ฿{totalArr.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-[16px] bg-[var(--color-background-muted)] p-4">
                    <p className="ty-caption">Package Rate</p>
                    <p className="ty-display mt-1">฿12,000 / yr</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
