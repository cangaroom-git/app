"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Check,
  Clock,
  ExternalLink,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { AdminTableFooter } from "@/components/admin/AdminTableFooter";
import {
  AiQuickPromoDropSheet,
  type PromoTargetHotelOption,
} from "@/components/admin/promos/AiQuickPromoDropSheet";
import {
  formatPlaceLocationScopeLabel,
  formatPromoDateRangeLabel,
  getPlaceCategoryMeta,
} from "@/lib/placeCategories";
import { getProvinceById } from "@/data/thailandProvinces";

interface PromoInboxRow {
  id: string;
  sourceType: string;
  brandNameTh: string;
  locationScope: "SINGLE_LOCATION" | "MULTI_BRANCH" | "NATIONWIDE_ONLINE";
  branchSummaryTh: string;
  provinceId: string;
  promoCategoryCode: string;
  titleTh: string;
  discountLabelTh: string;
  promoCode: string | null;
  startsAt: string | null;
  expiresAt: string | null;
  externalUrl: string | null;
  status: "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "EXPIRED" | "DUPLICATE";
  createdAt: string;
}

interface LivePromoPinRow {
  id: string;
  hotelId: string;
  titleTh: string;
  provinceId: string;
  promoHeadlineTh: string | null;
  promoCode: string | null;
  promoStartsAt: string | null;
  promoExpiresAt: string | null;
  promoCategoryCode: string | null;
  publishStatus: string;
  viewsCount: number;
  savesCount: number;
  externalClickCount: number;
  hotel: {
    id: string;
    slug: string;
    nameTh: string;
    placeCategory: string;
    locationScope: "SINGLE_LOCATION" | "MULTI_BRANCH" | "NATIONWIDE_ONLINE";
    branchSummaryTh: string;
  };
}

type PromoTab = "inbox" | "active" | "expiring";

const SOURCE_SHORT: Record<string, string> = {
  ADMIN_AI_DROP: "AI Drop",
  AFFILIATE_API: "Affiliate",
  EMAIL_WEBHOOK: "Email",
  FACEBOOK_SYNC: "FB Sync",
  MERCHANT_SUBMIT: "ร้านค้า",
  COMMUNITY_TIP: "ผู้ใช้",
};

export function AdminPromosClient() {
  const searchParams = useSearchParams();
  const initialTab: PromoTab =
    searchParams.get("tab") === "inbox"
      ? "inbox"
      : searchParams.get("tab") === "expiring"
      ? "expiring"
      : "active";

  const [activeTab, setActiveTab] = useState<PromoTab>(initialTab);
  const [isDropOpen, setIsDropOpen] = useState(
    () => searchParams.get("drop") === "1"
  );
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isRunningExpire, setIsRunningExpire] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const [inboxItems, setInboxItems] = useState<PromoInboxRow[]>([]);
  const [activePins, setActivePins] = useState<LivePromoPinRow[]>([]);
  const [expiringPins, setExpiringPins] = useState<LivePromoPinRow[]>([]);
  const [expiredPins, setExpiredPins] = useState<LivePromoPinRow[]>([]);
  const [hotels, setHotels] = useState<PromoTargetHotelOption[]>([]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/promos", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "โหลดข้อมูลไม่สำเร็จ");
      setInboxItems(json.inboxItems ?? []);
      setActivePins(json.activePins ?? []);
      setExpiringPins(json.expiringPins ?? []);
      setExpiredPins(json.expiredPins ?? []);
      setHotels(json.hotels ?? []);
    } catch (err) {
      setNotice(
        err instanceof Error ? err.message : "โหลดข้อมูลโปรโมชั่นไม่สำเร็จ"
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (searchParams.get("drop") === "1") {
      setIsDropOpen(true);
    }
  }, [searchParams]);

  const showToast = (msg: string) => {
    setNotice(msg);
    window.setTimeout(() => {
      setNotice((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  const handleInboxAction = async (
    inboxId: string,
    action: "APPROVE" | "REJECT" | "DELETE"
  ) => {
    setBusyId(inboxId);
    try {
      const res = await fetch("/api/admin/promos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inboxId, action }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "ดำเนินการไม่สำเร็จ");
      showToast(
        action === "APPROVE"
          ? "อนุมัติขึ้นหน้าแรกแล้ว"
          : action === "REJECT"
          ? "ปัดตกแล้ว"
          : "ลบรายการแล้ว"
      );
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "ดำเนินการไม่สำเร็จ");
    } finally {
      setBusyId(null);
    }
  };

  const handleRunAutoExpire = async () => {
    setIsRunningExpire(true);
    try {
      const res = await fetch("/api/cron/expire-promos", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "รัน Auto-Expire ไม่สำเร็จ");
      showToast(
        `ล้างโปรหมดอายุแล้ว: Inbox ${json.expiredInboxCount ?? 0} · คูปอง ${json.expiredCouponsCount ?? 0} · การ์ดโปร ${json.expiredPromoPinsCount ?? 0}`
      );
      await loadData();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "ไม่สามารถรัน Auto-Expire ได้"
      );
    } finally {
      setIsRunningExpire(false);
    }
  };

  const pendingInboxCount = useMemo(
    () => inboxItems.filter((i) => i.status === "PENDING_REVIEW").length,
    [inboxItems]
  );

  const q = query.trim().toLowerCase();

  const filteredInbox = useMemo(() => {
    if (!q) return inboxItems;
    return inboxItems.filter((item) =>
      `${item.brandNameTh} ${item.titleTh} ${item.discountLabelTh} ${item.promoCode || ""}`
        .toLowerCase()
        .includes(q)
    );
  }, [inboxItems, q]);

  const filteredActive = useMemo(() => {
    if (!q) return activePins;
    return activePins.filter((p) =>
      `${p.hotel.nameTh} ${p.titleTh} ${p.promoHeadlineTh || ""} ${p.promoCode || ""}`
        .toLowerCase()
        .includes(q)
    );
  }, [activePins, q]);

  const expiringCombined = useMemo(() => {
    const merged = [...expiringPins, ...expiredPins];
    const seen = new Set<string>();
    const unique = merged.filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
    if (!q) return unique;
    return unique.filter((p) =>
      `${p.hotel.nameTh} ${p.titleTh} ${p.promoHeadlineTh || ""} ${p.promoCode || ""}`
        .toLowerCase()
        .includes(q)
    );
  }, [expiredPins, expiringPins, q]);

  const totalCount =
    activeTab === "inbox"
      ? filteredInbox.length
      : activeTab === "active"
      ? filteredActive.length
      : expiringCombined.length;

  const pagedInbox = useMemo(
    () => filteredInbox.slice((page - 1) * pageSize, page * pageSize),
    [filteredInbox, page, pageSize]
  );
  const pagedPins = useMemo(() => {
    const source = activeTab === "active" ? filteredActive : expiringCombined;
    return source.slice((page - 1) * pageSize, page * pageSize);
  }, [activeTab, filteredActive, expiringCombined, page, pageSize]);

  return (
    <div className="cgr-admin-page">
      {/* Single Compact Toolbar: Inline Tabs + Search + Actions */}
      <div className="cgr-admin-toolbar">
        <div className="flex items-center gap-3 min-w-0 overflow-x-auto no-scrollbar">
          <h1 className="text-[14.5px] font-bold text-[var(--color-text-primary)] whitespace-nowrap">
            โปรโมชั่น
          </h1>
          <span className="w-px h-4 bg-[var(--color-border)] shrink-0" />
          <div className="flex items-center gap-1">
            {(
              [
                { id: "inbox", label: "Inbox", count: pendingInboxCount, urgent: true },
                { id: "active", label: "ใช้งานอยู่", count: activePins.length, urgent: false },
                { id: "expiring", label: "ใกล้หมด/หมดอายุ", count: expiringCombined.length, urgent: false },
              ] as const
            ).map((tab) => {
              const selected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);
                    setPage(1);
                  }}
                  className={`h-7.5 px-3 rounded-full text-[12.5px] font-semibold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
                    selected
                      ? "bg-[var(--color-accent)] !text-[var(--color-on-accent)]"
                      : "text-[var(--color-text-secondary)] hover:bg-[var(--color-background-muted)] hover:text-[var(--color-text-primary)]"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[11px] tabular-nums ${
                      selected
                        ? "opacity-90"
                        : tab.urgent && tab.count > 0
                        ? "text-[#e60023] font-bold"
                        : "text-[var(--color-text-tertiary)]"
                    }`}
                  >
                    {tab.count.toLocaleString()}
                  </span>
                </button>
              );
            })}
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
              placeholder="ค้นหาแบรนด์, โค้ด, โปร..."
              className="w-full h-7.5 pl-8 pr-3 rounded-full bg-[var(--color-background-muted)] text-[12.5px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
            />
          </div>

          <button
            type="button"
            disabled={isRunningExpire}
            onClick={handleRunAutoExpire}
            className="h-7.5 px-3 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[12px] font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
          >
            <Clock className="w-3.5 h-3.5" />
            <span className="hidden md:inline">
              {isRunningExpire ? "กำลังล้าง..." : "ล้างหมดอายุ"}
            </span>
          </button>

          <button
            type="button"
            onClick={loadData}
            aria-label="รีเฟรช"
            className="h-7.5 w-7.5 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] inline-flex items-center justify-center cursor-pointer transition-colors shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>

          <button
            type="button"
            onClick={() => setIsDropOpen(true)}
            className="h-7.5 px-3 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] text-[12px] font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI แกะโปร</span>
          </button>
        </div>
      </div>

      {/* Slim Inline Notice Bar */}
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
        {activeTab === "inbox" ? (
          <table className="w-full text-left border-collapse min-w-[920px]">
            <thead className="sticky top-0 z-10 bg-[var(--color-background-body)]">
              <tr className="h-[34px] border-b border-[var(--color-border)] text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--color-text-secondary)]">
                <th className="px-4 whitespace-nowrap">หมวด</th>
                <th className="px-3 w-[20%]">แบรนด์ / ร้าน</th>
                <th className="px-3 w-[26%]">โปรโมชั่น</th>
                <th className="px-3 whitespace-nowrap">โค้ด</th>
                <th className="px-3 whitespace-nowrap">ขอบเขต</th>
                <th className="px-3 whitespace-nowrap">วันหมดเขต</th>
                <th className="px-3 whitespace-nowrap">ที่มา</th>
                <th className="px-3 whitespace-nowrap">สถานะ</th>
                <th className="px-4 text-right whitespace-nowrap">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-[13px] text-[var(--color-text-secondary)]">
                    กำลังโหลดข้อมูล...
                  </td>
                </tr>
              ) : pagedInbox.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[13px] text-[var(--color-text-secondary)] border-b border-[var(--color-border)]">
                    ยังไม่มีรายการใน Promo Inbox — กด{" "}
                    <button
                      type="button"
                      onClick={() => setIsDropOpen(true)}
                      className="font-semibold text-[var(--color-accent)] underline underline-offset-2 cursor-pointer"
                    >
                      AI แกะโปร
                    </button>{" "}
                    เพื่อเพิ่มรายการใหม่
                  </td>
                </tr>
              ) : (
                pagedInbox.map((item) => {
                  const cat = getPlaceCategoryMeta(item.promoCategoryCode);
                  const prov = getProvinceById(item.provinceId);
                  const scopeLabel = formatPlaceLocationScopeLabel(
                    {
                      locationScope: item.locationScope,
                      branchSummaryTh: item.branchSummaryTh,
                      provinceId: item.provinceId,
                      provinceNameTh: prov
                        ? prov.nameTh.split("(")[0].trim()
                        : item.provinceId,
                      provinceNameEn: prov ? prov.nameEn : item.provinceId,
                    },
                    "th"
                  );
                  const dateInfo = formatPromoDateRangeLabel(
                    item.startsAt,
                    item.expiresAt,
                    "th"
                  );
                  const isBusy = busyId === item.id;

                  return (
                    <tr
                      key={item.id}
                      className="h-[38px] border-b border-[var(--color-border)] hover:bg-[var(--color-background-muted)]/60 transition-colors text-[13px]"
                    >
                      <td className="px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--color-text-primary)]">
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: cat.crestBgHex }}
                          />
                          <span>{cat.shortLabelTh}</span>
                        </span>
                      </td>
                      <td className="px-3 font-semibold text-[var(--color-text-primary)] max-w-[200px] truncate">
                        {item.brandNameTh}
                      </td>
                      <td className="px-3 text-[var(--color-accent)] font-medium max-w-[260px] truncate">
                        {item.discountLabelTh || item.titleTh}
                      </td>
                      <td className="px-3 whitespace-nowrap text-[12px] font-semibold text-[var(--color-text-primary)] tabular-nums">
                        {item.promoCode || (
                          <span className="font-normal text-[var(--color-text-tertiary)]">—</span>
                        )}
                      </td>
                      <td className="px-3 whitespace-nowrap text-[12px] text-[var(--color-text-secondary)] max-w-[140px] truncate">
                        {scopeLabel}
                      </td>
                      <td className="px-3 whitespace-nowrap text-[12px] text-[var(--color-text-secondary)] tabular-nums">
                        {dateInfo?.label || "—"}
                      </td>
                      <td className="px-3 whitespace-nowrap text-[12px] text-[var(--color-text-secondary)]">
                        {SOURCE_SHORT[item.sourceType] ?? item.sourceType}
                      </td>
                      <td className="px-3 whitespace-nowrap text-[12px]">
                        <span className="inline-flex items-center gap-1.5 font-medium">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              item.status === "APPROVED"
                                ? "bg-emerald-500"
                                : item.status === "PENDING_REVIEW"
                                ? "bg-amber-500"
                                : "bg-[var(--color-text-tertiary)]"
                            }`}
                          />
                          <span>
                            {item.status === "PENDING_REVIEW"
                              ? "รออนุมัติ"
                              : item.status === "APPROVED"
                              ? "เผยแพร่แล้ว"
                              : item.status === "REJECTED"
                              ? "ปัดตก"
                              : "หมดอายุ"}
                          </span>
                        </span>
                      </td>
                      <td className="px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          {item.status === "PENDING_REVIEW" && (
                            <>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleInboxAction(item.id, "APPROVE")}
                                className="h-6.5 px-2.5 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] text-[11.5px] font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <Check className="w-3 h-3" />
                                <span>อนุมัติ</span>
                              </button>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleInboxAction(item.id, "REJECT")}
                                className="h-6.5 px-2.5 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[11.5px] font-semibold cursor-pointer transition-colors"
                              >
                                ปัดตก
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleInboxAction(item.id, "DELETE")}
                            aria-label="ลบ"
                            className="h-6.5 w-6.5 rounded-full hover:bg-[var(--color-background-muted)] text-[var(--color-text-tertiary)] hover:text-[#e60023] inline-flex items-center justify-center cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="sticky top-0 z-10 bg-[var(--color-background-body)]">
              <tr className="h-[34px] border-b border-[var(--color-border)] text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--color-text-secondary)]">
                <th className="px-4 whitespace-nowrap">หมวด</th>
                <th className="px-3 w-[22%]">แบรนด์ / สถานที่</th>
                <th className="px-3 w-[26%]">โปรโมชั่น</th>
                <th className="px-3 whitespace-nowrap">โค้ด</th>
                <th className="px-3 whitespace-nowrap">พื้นที่</th>
                <th className="px-3 whitespace-nowrap">วันหมดเขต</th>
                <th className="px-3 text-right whitespace-nowrap">วิว</th>
                <th className="px-3 text-right whitespace-nowrap">บันทึก</th>
                <th className="px-3 text-right whitespace-nowrap">คลิก</th>
                <th className="px-4 text-right whitespace-nowrap">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-[13px] text-[var(--color-text-secondary)]">
                    กำลังโหลดข้อมูล...
                  </td>
                </tr>
              ) : pagedPins.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-[13px] text-[var(--color-text-secondary)] border-b border-[var(--color-border)]">
                    ไม่พบรายการโปรโมชั่นในแท็บนี้
                  </td>
                </tr>
              ) : (
                pagedPins.map((pin) => {
                  const cat = getPlaceCategoryMeta(
                    pin.promoCategoryCode || pin.hotel.placeCategory
                  );
                  const prov = getProvinceById(pin.provinceId);
                  const scopeLabel = formatPlaceLocationScopeLabel(
                    {
                      locationScope: pin.hotel.locationScope,
                      branchSummaryTh: pin.hotel.branchSummaryTh,
                      provinceId: pin.provinceId,
                      provinceNameTh: prov
                        ? prov.nameTh.split("(")[0].trim()
                        : pin.provinceId,
                      provinceNameEn: prov ? prov.nameEn : pin.provinceId,
                    },
                    "th"
                  );
                  const dateInfo = formatPromoDateRangeLabel(
                    pin.promoStartsAt,
                    pin.promoExpiresAt,
                    "th"
                  );

                  return (
                    <tr
                      key={pin.id}
                      className="h-[38px] border-b border-[var(--color-border)] hover:bg-[var(--color-background-muted)]/60 transition-colors text-[13px]"
                    >
                      <td className="px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--color-text-primary)]">
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: cat.crestBgHex }}
                          />
                          <span>{cat.shortLabelTh}</span>
                        </span>
                      </td>
                      <td className="px-3 font-semibold text-[var(--color-text-primary)] max-w-[220px] truncate">
                        <Link
                          href={`/${pin.hotel.slug}`}
                          target="_blank"
                          className="hover:text-[var(--color-accent)] transition-colors"
                        >
                          {pin.hotel.nameTh}
                        </Link>
                      </td>
                      <td className="px-3 max-w-[260px] truncate">
                        {pin.promoHeadlineTh ? (
                          <span className="font-medium text-[var(--color-accent)]">
                            {pin.promoHeadlineTh}
                          </span>
                        ) : (
                          <span className="text-[var(--color-text-secondary)]">
                            {pin.titleTh}
                          </span>
                        )}
                      </td>
                      <td className="px-3 whitespace-nowrap text-[12px] font-semibold text-[var(--color-text-primary)] tabular-nums">
                        {pin.promoCode || (
                          <span className="font-normal text-[var(--color-text-tertiary)]">—</span>
                        )}
                      </td>
                      <td className="px-3 whitespace-nowrap text-[12px] text-[var(--color-text-secondary)] max-w-[140px] truncate">
                        {scopeLabel}
                      </td>
                      <td className="px-3 whitespace-nowrap text-[12px] tabular-nums">
                        {dateInfo ? (
                          <span
                            className={
                              dateInfo.isExpired
                                ? "text-[#e60023] font-semibold"
                                : dateInfo.isExpiringSoon
                                ? "text-[var(--color-accent)] font-semibold"
                                : "text-[var(--color-text-secondary)]"
                            }
                          >
                            {dateInfo.label}
                          </span>
                        ) : (
                          <span className="text-[var(--color-text-tertiary)]">—</span>
                        )}
                      </td>
                      <td className="px-3 text-right tabular-nums text-[12.5px] font-medium">
                        {pin.viewsCount.toLocaleString()}
                      </td>
                      <td className="px-3 text-right tabular-nums text-[12.5px] text-[var(--color-text-secondary)]">
                        {pin.savesCount.toLocaleString()}
                      </td>
                      <td className="px-3 text-right tabular-nums text-[12.5px] text-[var(--color-text-secondary)]">
                        {pin.externalClickCount.toLocaleString()}
                      </td>
                      <td className="px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <Link
                            href={`/studio?hotelId=${pin.hotel.id}`}
                            className="h-6.5 px-2.5 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[11.5px] font-semibold inline-flex items-center transition-colors"
                          >
                            Studio
                          </Link>
                          <Link
                            href={`/${pin.hotel.slug}`}
                            target="_blank"
                            title="ดูหน้าเว็บ"
                            className="h-6.5 w-6.5 rounded-full hover:bg-[var(--color-background-muted)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] inline-flex items-center justify-center transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      <AdminTableFooter
        totalItems={totalCount}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />

      <AiQuickPromoDropSheet
        isOpen={isDropOpen}
        onClose={() => setIsDropOpen(false)}
        hotels={hotels}
        onCreated={(msg, publishedNow) => {
          showToast(msg);
          setActiveTab(publishedNow ? "active" : "inbox");
          setPage(1);
          loadData();
        }}
      />
    </div>
  );
}
