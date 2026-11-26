"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { RefreshCw, Search, X } from "lucide-react";
import { AdminTableFooter } from "@/components/admin/AdminTableFooter";

interface SponsoredPinItem {
  id: string;
  titleTh: string;
  provinceId: string;
  isSponsored: boolean;
  sponsoredPriority: number;
  likesCount: number;
  savesCount: number;
  hotel: { id: string; slug: string; nameTh: string };
}

interface FeaturedCouponItem {
  id: string;
  code: string;
  titleTh: string;
  discountType: string;
  discountValue: number;
  claimedCount: number;
  isFeaturedDeal: boolean;
  hotel: { id: string; slug: string; nameTh: string };
}

type CampaignTab = "deals" | "sponsored";

export function AdminCampaignsClient() {
  const [activeTab, setActiveTab] = useState<CampaignTab>("deals");
  const [pins, setPins] = useState<SponsoredPinItem[]>([]);
  const [coupons, setCoupons] = useState<FeaturedCouponItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [notice, setNotice] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setNotice(msg);
    window.setTimeout(() => {
      setNotice((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/super-admin/campaigns", {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "โหลดข้อมูลโฆษณาไม่สำเร็จ");
      setPins(json.pins ?? []);
      setCoupons(json.coupons ?? []);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleFeaturedCoupon = async (coupon: FeaturedCouponItem) => {
    setBusyId(coupon.id);
    const nextState = !coupon.isFeaturedDeal;
    try {
      const res = await fetch("/api/super-admin/campaigns", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType: "COUPON",
          id: coupon.id,
          isFeaturedDeal: nextState,
        }),
      });
      if (!res.ok) throw new Error();
      setCoupons((prev) =>
        prev.map((c) =>
          c.id === coupon.id ? { ...c, isFeaturedDeal: nextState } : c
        )
      );
      showToast(
        nextState
          ? `ตั้ง "${coupon.code}" เป็น Featured Deal แล้ว`
          : `ปลด "${coupon.code}" ออกแล้ว`
      );
    } catch {
      showToast("อัปเดตสถานะไม่สำเร็จ");
    } finally {
      setBusyId(null);
    }
  };

  const toggleSponsoredPin = async (pin: SponsoredPinItem) => {
    setBusyId(pin.id);
    const nextState = !pin.isSponsored;
    try {
      const res = await fetch("/api/super-admin/campaigns", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType: "PIN",
          id: pin.id,
          isSponsored: nextState,
          sponsoredPriority: nextState ? 100 : 0,
        }),
      });
      if (!res.ok) throw new Error();
      setPins((prev) =>
        prev.map((p) =>
          p.id === pin.id ? { ...p, isSponsored: nextState } : p
        )
      );
      showToast(
        nextState
          ? `เปิด Sponsored ให้ "${pin.hotel.nameTh}" แล้ว`
          : `ปิด Sponsored ของ "${pin.hotel.nameTh}" แล้ว`
      );
    } catch {
      showToast("อัปเดตสถานะไม่สำเร็จ");
    } finally {
      setBusyId(null);
    }
  };

  const q = query.trim().toLowerCase();
  const filteredCoupons = useMemo(() => {
    if (!q) return coupons;
    return coupons.filter((c) =>
      `${c.code} ${c.titleTh} ${c.hotel.nameTh}`.toLowerCase().includes(q)
    );
  }, [coupons, q]);

  const filteredPins = useMemo(() => {
    if (!q) return pins;
    return pins.filter((p) =>
      `${p.titleTh} ${p.hotel.nameTh} ${p.provinceId}`.toLowerCase().includes(q)
    );
  }, [pins, q]);

  const featuredCount = coupons.filter((c) => c.isFeaturedDeal).length;
  const sponsoredCount = pins.filter((p) => p.isSponsored).length;

  const totalItems =
    activeTab === "deals" ? filteredCoupons.length : filteredPins.length;
  const pagedCoupons = useMemo(
    () => filteredCoupons.slice((page - 1) * pageSize, page * pageSize),
    [filteredCoupons, page, pageSize]
  );
  const pagedPins = useMemo(
    () => filteredPins.slice((page - 1) * pageSize, page * pageSize),
    [filteredPins, page, pageSize]
  );

  return (
    <div className="cgr-admin-page">
      {/* Single Compact Toolbar */}
      <div className="cgr-admin-toolbar">
        <div className="flex items-center gap-2.5 min-w-0 overflow-x-auto no-scrollbar">
          <h1 className="text-[14.5px] font-bold text-[var(--color-text-primary)] whitespace-nowrap">
            โฆษณา &amp; ดีลเด่น
          </h1>
          <span className="w-px h-4 bg-[var(--color-border)] shrink-0" />
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setActiveTab("deals");
                setPage(1);
              }}
              className={`h-7.5 px-3 rounded-full text-[12.5px] font-semibold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === "deals"
                  ? "bg-[var(--color-accent)] !text-[var(--color-on-accent)]"
                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-background-muted)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              <span>Featured Deals</span>
              <span className="text-[11px] tabular-nums opacity-85">
                {featuredCount}/{coupons.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("sponsored");
                setPage(1);
              }}
              className={`h-7.5 px-3 rounded-full text-[12.5px] font-semibold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === "sponsored"
                  ? "bg-[var(--color-accent)] !text-[var(--color-on-accent)]"
                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-background-muted)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              <span>Sponsored Feed</span>
              <span className="text-[11px] tabular-nums opacity-85">
                {sponsoredCount}/{pins.length}
              </span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="relative w-[190px] sm:w-[220px]">
            <Search className="w-3.5 h-3.5 text-[var(--color-text-tertiary)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="ค้นหาโค้ด, แบรนด์, การ์ด..."
              className="w-full h-7.5 pl-8 pr-3 rounded-full bg-[var(--color-background-muted)] text-[12.5px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
            />
          </div>

          <button
            type="button"
            onClick={loadData}
            aria-label="รีเฟรช"
            className="h-7.5 w-7.5 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] inline-flex items-center justify-center cursor-pointer transition-colors shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {notice && (
        <div className="px-4 py-1.5 border-b border-[var(--color-border)] bg-[var(--color-background-muted)] flex items-center justify-between gap-2 text-[12.5px] font-medium text-[var(--color-text-primary)] shrink-0">
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

      {/* Full-Bleed Single-Row Table (Zero Images, Pure border-b) */}
      <div className="cgr-admin-body">
        {activeTab === "deals" ? (
          <table className="w-full text-left border-collapse min-w-[780px]">
            <thead className="sticky top-0 z-10 bg-[var(--color-background-body)]">
              <tr className="h-[34px] border-b border-[var(--color-border)] text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--color-text-secondary)]">
                <th className="px-4 whitespace-nowrap">โค้ด</th>
                <th className="px-3 w-[24%]">แบรนด์ / สถานที่</th>
                <th className="px-3 w-[34%]">รายละเอียดโปรโมชั่น</th>
                <th className="px-3 text-right whitespace-nowrap">รับแล้ว</th>
                <th className="px-3 whitespace-nowrap">สถานะ</th>
                <th className="px-4 text-right whitespace-nowrap">Featured</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-[13px] text-[var(--color-text-secondary)]">
                    กำลังโหลดข้อมูล...
                  </td>
                </tr>
              ) : pagedCoupons.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-[13px] text-[var(--color-text-secondary)] border-b border-[var(--color-border)]">
                    ไม่พบคูปองที่เปิดใช้งานอยู่
                  </td>
                </tr>
              ) : (
                pagedCoupons.map((coupon) => (
                  <tr
                    key={coupon.id}
                    className="h-[38px] border-b border-[var(--color-border)] hover:bg-[var(--color-background-muted)]/60 transition-colors text-[13px]"
                  >
                    <td className="px-4 whitespace-nowrap font-mono text-[12px] font-bold text-[var(--color-text-primary)]">
                      {coupon.code}
                    </td>
                    <td className="px-3 font-semibold text-[var(--color-text-primary)] max-w-[240px] truncate">
                      <Link
                        href={`/${coupon.hotel.slug}`}
                        target="_blank"
                        className="hover:text-[var(--color-accent)] transition-colors"
                      >
                        {coupon.hotel.nameTh}
                      </Link>
                    </td>
                    <td className="px-3 text-[var(--color-text-secondary)] max-w-[340px] truncate">
                      {coupon.titleTh}
                    </td>
                    <td className="px-3 text-right tabular-nums text-[12.5px] font-medium text-[var(--color-text-primary)]">
                      {coupon.claimedCount.toLocaleString()}
                    </td>
                    <td className="px-3 whitespace-nowrap text-[12px]">
                      <span className="inline-flex items-center gap-1.5 font-medium">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            coupon.isFeaturedDeal
                              ? "bg-[var(--color-accent)]"
                              : "bg-[var(--color-border-emphasized)]"
                          }`}
                        />
                        <span
                          className={
                            coupon.isFeaturedDeal
                              ? "text-[var(--color-accent)] font-semibold"
                              : "text-[var(--color-text-secondary)]"
                          }
                        >
                          {coupon.isFeaturedDeal ? "Featured" : "ปกติ"}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={coupon.isFeaturedDeal}
                        aria-label={`สลับ Featured ${coupon.code}`}
                        disabled={busyId === coupon.id}
                        onClick={() => toggleFeaturedCoupon(coupon)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer disabled:opacity-40 ${
                          coupon.isFeaturedDeal
                            ? "bg-[var(--color-accent)]"
                            : "bg-[var(--color-border-emphasized)]"
                        }`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform duration-150 ${
                            coupon.isFeaturedDeal
                              ? "translate-x-4.5"
                              : "translate-x-1"
                          }`}
                        />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-left border-collapse min-w-[780px]">
            <thead className="sticky top-0 z-10 bg-[var(--color-background-body)]">
              <tr className="h-[34px] border-b border-[var(--color-border)] text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--color-text-secondary)]">
                <th className="px-4 w-[24%]">แบรนด์ / สถานที่</th>
                <th className="px-3 w-[34%]">ชื่อการ์ดโปรโมชั่น</th>
                <th className="px-3 whitespace-nowrap">จังหวัด</th>
                <th className="px-3 text-right whitespace-nowrap">บันทึก</th>
                <th className="px-3 text-right whitespace-nowrap">ถูกใจ</th>
                <th className="px-3 whitespace-nowrap">สถานะ</th>
                <th className="px-4 text-right whitespace-nowrap">Sponsored</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-[13px] text-[var(--color-text-secondary)]">
                    กำลังโหลดข้อมูล...
                  </td>
                </tr>
              ) : pagedPins.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-[13px] text-[var(--color-text-secondary)] border-b border-[var(--color-border)]">
                    ไม่พบการ์ดโปรโมชั่น
                  </td>
                </tr>
              ) : (
                pagedPins.map((pin) => (
                  <tr
                    key={pin.id}
                    className="h-[38px] border-b border-[var(--color-border)] hover:bg-[var(--color-background-muted)]/60 transition-colors text-[13px]"
                  >
                    <td className="px-4 font-semibold text-[var(--color-text-primary)] max-w-[240px] truncate">
                      <Link
                        href={`/${pin.hotel.slug}`}
                        target="_blank"
                        className="hover:text-[var(--color-accent)] transition-colors"
                      >
                        {pin.hotel.nameTh}
                      </Link>
                    </td>
                    <td className="px-3 text-[var(--color-text-secondary)] max-w-[340px] truncate">
                      {pin.titleTh}
                    </td>
                    <td className="px-3 whitespace-nowrap text-[12px] text-[var(--color-text-secondary)]">
                      {pin.provinceId}
                    </td>
                    <td className="px-3 text-right tabular-nums text-[12.5px] font-medium">
                      {pin.savesCount.toLocaleString()}
                    </td>
                    <td className="px-3 text-right tabular-nums text-[12.5px] text-[var(--color-text-secondary)]">
                      {pin.likesCount.toLocaleString()}
                    </td>
                    <td className="px-3 whitespace-nowrap text-[12px]">
                      <span className="inline-flex items-center gap-1.5 font-medium">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            pin.isSponsored
                              ? "bg-[var(--color-accent)]"
                              : "bg-[var(--color-border-emphasized)]"
                          }`}
                        />
                        <span
                          className={
                            pin.isSponsored
                              ? "text-[var(--color-accent)] font-semibold"
                              : "text-[var(--color-text-secondary)]"
                          }
                        >
                          {pin.isSponsored ? "Sponsored" : "Organic"}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={pin.isSponsored}
                        aria-label={`สลับ Sponsored ${pin.hotel.nameTh}`}
                        disabled={busyId === pin.id}
                        onClick={() => toggleSponsoredPin(pin)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer disabled:opacity-40 ${
                          pin.isSponsored
                            ? "bg-[var(--color-accent)]"
                            : "bg-[var(--color-border-emphasized)]"
                        }`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform duration-150 ${
                            pin.isSponsored ? "translate-x-4.5" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      <AdminTableFooter
        totalItems={totalItems}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
}
