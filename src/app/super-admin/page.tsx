"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  Ban,
  Building2,
  Crown,
  ExternalLink,
  Flame,
  LayoutDashboard,
  RefreshCw,
  Search,
  ShieldCheck,
  Tag,
  Users,
} from "lucide-react";
import { useHotelApp } from "@/components/HotelAppShell";
import { StatusPill } from "@/components/ui/standards";
import type { AppRole, VerificationStatusDto } from "@/types/cangaroom";

type SuperTab = "hotels" | "ads" | "users";

interface AdminHotelItem {
  id: string;
  slug: string;
  nameTh: string;
  provinceId: string;
  verificationStatus: VerificationStatusDto;
  isPublished: boolean;
  owner: { name: string | null; email: string };
  _count: { rooms: number; pins: number; coupons: number; bookings: number };
}

interface AdminPinAdItem {
  id: string;
  titleTh: string;
  coverImageUrl: string;
  provinceId: string;
  isSponsored: boolean;
  sponsoredPriority: number;
  likesCount: number;
  savesCount: number;
  hotel: { id: string; slug: string; nameTh: string };
}

interface AdminCouponAdItem {
  id: string;
  code: string;
  titleTh: string;
  discountType: "PERCENT" | "FIXED_THB";
  discountValue: number;
  claimedCount: number;
  isFeaturedDeal: boolean;
  hotel: { id: string; slug: string; nameTh: string };
}

interface AdminUserItem {
  id: string;
  email: string;
  name: string | null;
  role: AppRole;
  createdAt: string;
  _count: { ownedHotels: number; bookings: number; boards: number };
}

export default function SuperAdminConsolePage() {
  const { user, isCheckingSession } = useHotelApp();

  const [activeTab, setActiveTab] = useState<SuperTab>("hotels");
  const [hotels, setHotels] = useState<AdminHotelItem[]>([]);
  const [pins, setPins] = useState<AdminPinAdItem[]>([]);
  const [coupons, setCoupons] = useState<AdminCouponAdItem[]>([]);
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  const showNotice = (msg: string) => {
    setNotice(msg);
    window.setTimeout(() => setNotice(null), 2600);
  };

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [hRes, cRes, uRes] = await Promise.all([
        fetch("/api/super-admin/hotels", { cache: "no-store" }),
        fetch("/api/super-admin/campaigns", { cache: "no-store" }),
        fetch("/api/super-admin/users", { cache: "no-store" }),
      ]);
      if (hRes.ok) {
        const d = await hRes.json();
        setHotels(d.hotels || []);
      }
      if (cRes.ok) {
        const d = await cRes.json();
        setPins(d.pins || []);
        setCoupons(d.coupons || []);
      }
      if (uRes.ok) {
        const d = await uRes.json();
        setUsers(d.users || []);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === "SUPER_ADMIN") {
      fetchAll();
    }
  }, [user?.role, fetchAll]);

  const handleUpdateHotelVerification = async (
    hotelId: string,
    verificationStatus: VerificationStatusDto
  ) => {
    const res = await fetch("/api/super-admin/hotels", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hotelId, verificationStatus }),
    });
    if (res.ok) {
      showNotice(`อัปเดตสถานะเป็น ${verificationStatus} แล้ว`);
      await fetchAll();
    }
  };

  const handleTogglePinSponsored = async (pin: AdminPinAdItem) => {
    const next = !pin.isSponsored;
    const res = await fetch("/api/super-admin/campaigns", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetType: "PIN",
        id: pin.id,
        isSponsored: next,
        sponsoredPriority: next ? 95 : 0,
      }),
    });
    if (res.ok) {
      showNotice(
        next ? "เปิดสถานะ Sponsored Pin แล้ว" : "ปิด Sponsored Pin แล้ว"
      );
      await fetchAll();
    }
  };

  const handleToggleFeaturedDeal = async (coupon: AdminCouponAdItem) => {
    const next = !coupon.isFeaturedDeal;
    const res = await fetch("/api/super-admin/campaigns", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetType: "COUPON",
        id: coupon.id,
        isFeaturedDeal: next,
      }),
    });
    if (res.ok) {
      showNotice(
        next ? "ปักหมุด Featured Deal บนหน้า /deal แล้ว" : "นำออกจาก Featured Deal แล้ว"
      );
      await fetchAll();
    }
  };

  const handleChangeUserRole = async (userId: string, role: AppRole) => {
    const res = await fetch("/api/super-admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role }),
    });
    if (res.ok) {
      showNotice("อัปเดตสิทธิ์ผู้ใช้งานแล้ว");
      await fetchAll();
    }
  };

  if (isCheckingSession) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <RefreshCw className="w-6 h-6 animate-spin text-[var(--color-accent)]" />
      </div>
    );
  }

  if (!user || user.role !== "SUPER_ADMIN") {
    return (
      <div className="cgr-page-form py-8">
        <div className="app-card p-6 text-center space-y-3">
          <Crown className="w-10 h-10 text-[var(--color-text-primary)] mx-auto" />
          <h1 className="ty-title">เฉพาะผู้ดูแลระบบ Nondii (Super Admin)</h1>
          <p className="ty-caption">
            กรุณาเข้าสู่ระบบด้วยบัญชีผู้ดูแลแพลตฟอร์มเพื่อเข้าใช้งานหน้านี้
          </p>
          <div className="flex justify-center gap-2">
            <Link href="/login?callbackUrl=/super-admin" className="btn-round-solid">
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

  const q = searchQuery.trim().toLowerCase();
  const filteredHotels = hotels.filter(
    (h) =>
      !q ||
      h.nameTh.toLowerCase().includes(q) ||
      h.slug.toLowerCase().includes(q) ||
      h.owner.email.toLowerCase().includes(q)
  );
  const filteredUsers = users.filter(
    (u) =>
      !q ||
      u.email.toLowerCase().includes(q) ||
      (u.name || "").toLowerCase().includes(q)
  );

  return (
    <div className="cgr-page-standard space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <Crown className="w-5 h-5 text-[var(--color-text-primary)] shrink-0" />
          <h1 className="ty-display truncate">Nondii Super Admin</h1>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/studio" className="btn-fw-secondary !h-9">
            <LayoutDashboard className="w-4 h-4" />
            <span>Hotel Studio</span>
          </Link>
          <button
            type="button"
            onClick={fetchAll}
            className="btn-icon"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>

      <div className="space-y-6">
        {notice && (
          <div className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-background-muted)] text-[var(--color-text-primary)] px-4 py-2.5 ty-body font-semibold">
            {notice}
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-6 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab("hotels")}
              className={`py-3 -mb-px border-b-2 ty-body inline-flex items-center gap-2 cursor-pointer shrink-0 transition-colors ${
                activeTab === "hotels"
                  ? "border-[var(--color-text-primary)] font-bold text-[var(--color-text-primary)]"
                  : "border-transparent font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>ที่พัก & ยืนยันตัวตน ({hotels.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("ads")}
              className={`py-3 -mb-px border-b-2 ty-body inline-flex items-center gap-2 cursor-pointer shrink-0 transition-colors ${
                activeTab === "ads"
                  ? "border-[var(--color-text-primary)] font-bold text-[var(--color-text-primary)]"
                  : "border-transparent font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              <Flame className="w-4 h-4" />
              <span>โฆษณา & Featured Deals</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("users")}
              className={`py-3 -mb-px border-b-2 ty-body inline-flex items-center gap-2 cursor-pointer shrink-0 transition-colors ${
                activeTab === "users"
                  ? "border-[var(--color-text-primary)] font-bold text-[var(--color-text-primary)]"
                  : "border-transparent font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>ผู้ใช้งาน ({users.length})</span>
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-[var(--color-text-secondary)] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อที่พัก / slug / email..."
              className="w-full h-10 rounded-[12px] bg-[var(--color-background-muted)] pl-9 pr-4 ty-body focus:outline-none"
            />
          </div>
        </div>

        {/* TAB 1: HOTELS & VERIFIED KYC */}
        {activeTab === "hotels" && (
          <div className="space-y-3">
            {filteredHotels.map((h) => (
              <div
                key={h.id}
                className="rounded-[18px] bg-[var(--color-background-card)] border border-[var(--color-border)] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/${h.slug}`}
                      className="ty-subtitle font-bold hover:underline inline-flex items-center gap-1.5"
                    >
                      <span>{h.nameTh}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                    <StatusPill
                      variant={
                        h.verificationStatus === "VERIFIED"
                          ? "success"
                          : h.verificationStatus === "SUSPENDED"
                          ? "error"
                          : "warning"
                      }
                    >
                      {h.verificationStatus}
                    </StatusPill>
                  </div>
                  <p className="ty-caption">
                    /{h.slug} · จังหวัด {h.provinceId} · เจ้าของ: {h.owner.email}
                  </p>
                  <p className="ty-caption">
                    {h._count.rooms} ห้องพัก · {h._count.pins} Pins ·{" "}
                    {h._count.coupons} คูปอง · {h._count.bookings} การจอง
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <Link
                    href={`/studio?hotel=${encodeURIComponent(h.slug)}`}
                    className="btn-fw-secondary !h-9"
                  >
                    เข้า Studio
                  </Link>

                  {h.verificationStatus !== "VERIFIED" && (
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateHotelVerification(h.id, "VERIFIED")
                      }
                      className="h-9 px-3.5 rounded-[12px] bg-[var(--color-accent)] text-white ty-caption font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <BadgeCheck className="w-4 h-4" />
                      <span>อนุมัติ Verified</span>
                    </button>
                  )}

                  {h.verificationStatus !== "SUSPENDED" ? (
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateHotelVerification(h.id, "SUSPENDED")
                      }
                      className="h-9 px-3.5 rounded-[12px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-error)] ty-caption font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>ระงับ</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateHotelVerification(h.id, "VERIFIED")
                      }
                      className="btn-fw-secondary !h-9"
                    >
                      ปลดระงับ
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 2: ADS & SPONSORED PLACEMENTS */}
        {activeTab === "ads" && (
          <div className="space-y-8">
            <section className="space-y-3">
              <h2 className="ty-title flex items-center gap-2">
                <Tag className="w-5 h-5 text-[var(--color-promo)]" />
                <span>Featured Deals (แถวบนสุดของหน้า /deal)</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {coupons.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-[16px] bg-[var(--color-background-card)] border border-[var(--color-border)] p-4 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="ty-caption font-bold text-[var(--color-accent)]">
                        {c.hotel.nameTh} · {c.code}
                      </p>
                      <p className="ty-body font-bold truncate">{c.titleTh}</p>
                      <p className="ty-caption">เก็บไปแล้ว {c.claimedCount} สิทธิ์</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleFeaturedDeal(c)}
                      className={`h-9 px-3.5 rounded-[12px] ty-caption font-semibold shrink-0 cursor-pointer ${
                        c.isFeaturedDeal
                          ? "bg-[#111111] !text-white dark:bg-[#f5f5f5] dark:!text-[#111111]"
                          : "bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)]"
                      }`}
                    >
                      {c.isFeaturedDeal ? "กำลังปักหมุดเด่น" : "ตั้งเป็นดีลเด่น"}
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="ty-title flex items-center gap-2">
                <Flame className="w-5 h-5 text-[var(--color-accent)]" />
                <span>Promoted Pins (อันดับเด่นบนหน้าแรก / และ MCP)</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {pins.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-[16px] bg-[var(--color-background-card)] border border-[var(--color-border)] p-3 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={p.coverImageUrl}
                        alt={p.titleTh}
                        className="h-14 w-14 rounded-[10px] object-cover shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="ty-caption font-bold text-[var(--color-accent)] truncate">
                          {p.hotel.nameTh}
                        </p>
                        <p className="ty-body font-semibold truncate">
                          {p.titleTh}
                        </p>
                        <p className="ty-caption">
                          {p.likesCount} Likes · {p.savesCount} Saves
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleTogglePinSponsored(p)}
                      className={`h-9 px-3.5 rounded-[12px] ty-caption font-semibold shrink-0 cursor-pointer ${
                        p.isSponsored
                          ? "bg-[var(--color-accent)] text-white"
                          : "bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)]"
                      }`}
                    >
                      {p.isSponsored ? "Sponsored ON" : "Boost Pin"}
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* TAB 3: USERS & ROLES */}
        {activeTab === "users" && (
          <div className="space-y-2.5">
            {filteredUsers.map((u) => (
              <div
                key={u.id}
                className="rounded-[16px] bg-[var(--color-background-card)] border border-[var(--color-border)] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="ty-body font-bold truncate">
                      {u.name || u.email}
                    </p>
                    <StatusPill variant="accent">
                      <ShieldCheck className="w-3 h-3" />
                      <span>{u.role}</span>
                    </StatusPill>
                  </div>
                  <p className="ty-caption">
                    {u.email} · {u._count.ownedHotels} ที่พัก ·{" "}
                    {u._count.bookings} การจอง · {u._count.boards} ทริป
                  </p>
                </div>

                <select
                  value={u.role}
                  disabled={u.email === "cangaroomapp@gmail.com"}
                  onChange={(e) =>
                    handleChangeUserRole(u.id, e.target.value as AppRole)
                  }
                  className="h-9 rounded-[10px] bg-[var(--color-background-muted)] px-3 ty-caption font-bold"
                >
                  <option value="TRAVELLER">TRAVELLER</option>
                  <option value="HOTEL_OWNER">HOTEL_OWNER</option>
                  <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                </select>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
