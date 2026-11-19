"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Home,
  Loader2,
  Tent,
  Trees,
  XCircle,
} from "lucide-react";
import { THAILAND_77_PROVINCES } from "@/data/thailandProvinces";
import { normalizeHotelSlug } from "@/lib/bookingMath";
import { useHotelApp } from "@/components/HotelAppShell";
import {
  StandardFieldGroup,
  StandardInput,
  StandardSelectField,
} from "@/components/ui/standards";
import type { PropertyTypeDto } from "@/types/cangaroom";

const PROPERTY_TYPES: Array<{
  value: PropertyTypeDto;
  label: string;
  desc: string;
  icon: React.ReactNode;
}> = [
  {
    value: "BOUTIQUE_HOTEL",
    label: "โรงแรมขนาดเล็ก / บูทีค",
    desc: "มีหลายแบบห้องพักหรือหลายชั้น",
    icon: <Building2 className="w-5 h-5" />,
  },
  {
    value: "RESORT",
    label: "รีสอร์ท / บังกะโล",
    desc: "บ้านเป็นหลังหรือหลายโซนวิว",
    icon: <Trees className="w-5 h-5" />,
  },
  {
    value: "POOL_VILLA",
    label: "พูลวิลล่า (สระส่วนตัว)",
    desc: "วิลล่าสระส่วนตัวหลังเดียวหรือหลายหลัง",
    icon: <Home className="w-5 h-5" />,
  },
  {
    value: "GLAMPING_HOMESTAY",
    label: "แกลมปิ้ง / เคบิน / โฮมสเตย์",
    desc: "เต็นท์โดม เคบินไม้ หรือที่พักใกล้ธรรมชาติ",
    icon: <Tent className="w-5 h-5" />,
  },
];

export default function RegisterHotelPage() {
  const router = useRouter();
  const { user, isCheckingSession, refreshMe } = useHotelApp();

  const [propertyType, setPropertyType] =
    useState<PropertyTypeDto>("BOUTIQUE_HOTEL");
  const [nameTh, setNameTh] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [slug, setSlug] = useState("");
  const [provinceId, setProvinceId] = useState("chiang-mai");

  const [slugStatus, setSlugStatus] = useState<{
    checking: boolean;
    available: boolean | null;
    reason: string | null;
  }>({ checking: false, available: null, reason: null });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const clean = normalizeHotelSlug(slug);
    if (!clean || clean.length < 3) {
      setSlugStatus({ checking: false, available: null, reason: null });
      return;
    }

    let cancelled = false;
    setSlugStatus({ checking: true, available: null, reason: null });
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/studio/onboarding?slug=${encodeURIComponent(clean)}`
        );
        const data = (await res.json()) as {
          available: boolean;
          reason?: string | null;
        };
        if (!cancelled) {
          setSlugStatus({
            checking: false,
            available: data.available,
            reason: data.reason ?? null,
          });
        }
      } catch {
        if (!cancelled) {
          setSlugStatus({ checking: false, available: null, reason: null });
        }
      }
    }, 320);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanSlug = normalizeHotelSlug(slug);
    if (nameTh.trim().length < 2) {
      setErrorMsg("กรุณากรอกชื่อที่พักภาษาไทย");
      return;
    }
    if (cleanSlug.length < 3 || slugStatus.available === false) {
      setErrorMsg(
        slugStatus.reason ||
          "กรุณาระบุชื่อลิงก์หน้าร้าน (a-z, 0-9 อย่างน้อย 3 ตัวอักษร)"
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/studio/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quickSetup: true,
          propertyType,
          nameTh: nameTh.trim(),
          nameEn: nameEn.trim() || nameTh.trim(),
          slug: cleanSlug,
          provinceId,
        }),
      });
      const json = (await res.json()) as {
        hotel?: { slug: string };
        error?: string;
      };
      if (!res.ok || !json.hotel) {
        setErrorMsg(json.error || "ไม่สามารถเปิดบัญชีที่พักได้ กรุณาลองใหม่");
        return;
      }

      await refreshMe();
      router.push(
        `/studio/listings/rooms?hotel=${encodeURIComponent(json.hotel.slug)}`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-background-body)] flex flex-col">
      {/* Clean Minimal Top Bar */}
      <header className="sticky top-0 z-30 h-[72px] bg-[var(--color-background-body)]/95 backdrop-blur-md border-b border-[var(--color-border)] px-4 sm:px-8 lg:px-10">
        <div className="h-full max-w-[1360px] mx-auto flex items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 text-[var(--color-text-primary)]"
          >
            <svg
              viewBox="0 0 24 24"
              className="w-[26px] h-[26px]"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.05"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect width="18" height="18" x="3" y="3" rx="5.5" />
              <path d="M8 15.5 12 8.5l4 7" />
              <circle
                cx="16.5"
                cy="7.5"
                r="1.15"
                fill="currentColor"
                stroke="none"
              />
            </svg>
            <span className="text-[15px] font-semibold tracking-tight">
              Cangaroom Studio
            </span>
          </Link>

          <Link
            href="/"
            className="h-10 px-4 rounded-[12px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[13.5px] font-semibold text-[var(--color-text-primary)] inline-flex items-center transition-colors"
          >
            กลับโหมดนักเดินทาง
          </Link>
        </div>
      </header>

      {/* Main Single-Screen Fast Registration (Zero Duplication with /studio/listings!) */}
      <main className="flex-1 px-4 sm:px-8 py-10 sm:py-14">
        <div className="max-w-[640px] mx-auto">
          {!isCheckingSession && !user ? (
            <div className="py-12 text-center space-y-5">
              <span className="h-14 w-14 mx-auto rounded-[16px] bg-[var(--color-background-muted)] inline-flex items-center justify-center">
                <Building2 className="w-7 h-7" />
              </span>
              <div className="space-y-1.5">
                <h1 className="text-[26px] font-semibold text-[var(--color-text-primary)]">
                  เข้าสู่ระบบก่อนเปิดบัญชีเจ้าของที่พัก
                </h1>
                <p className="text-[14.5px] text-[var(--color-text-secondary)]">
                  ใช้บัญชี Google หรืออีเมลของคุณ เพื่อเชื่อมสิทธิ์จัดการหลังบ้าน Cangaroom Studio ฟรี 0% GP
                </p>
              </div>
              <Link
                href="/login?next=/register-hotel"
                className="inline-flex items-center h-11 px-6 rounded-[12px] bg-[#222222] hover:bg-[#3f3f3f] dark:bg-[#f5f5f5] dark:hover:bg-[#e5e5e5] !text-white dark:!text-[#222222] text-[14.5px] font-semibold transition-colors"
              >
                เข้าสู่ระบบเพื่อดำเนินการต่อ
              </Link>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="divide-y divide-[var(--color-border)]"
            >
              {/* Intro Header */}
              <div className="pb-8 space-y-2">
                <p className="text-[13px] font-semibold text-[var(--color-text-secondary)]">
                  ลงที่พักฟรี · ค่าคอมมิชชัน 0% GP ตลอดชีพ
                </p>
                <h1 className="text-[28px] sm:text-[32px] font-semibold tracking-[-0.02em] text-[var(--color-text-primary)] leading-tight">
                  เริ่มต้นเปิดหลังบ้านที่พักของคุณ
                </h1>
                <p className="text-[14.5px] leading-relaxed text-[var(--color-text-secondary)]">
                  กรอกเพียงข้อมูลเบื้องต้นเพื่อสร้างบัญชีที่พัก แล้วเข้าไปเพิ่มห้องพัก ปักหมุดแผนที่ และตั้งค่า PromptPay ได้ครบในหน้า{" "}
                  <strong className="font-semibold text-[var(--color-text-primary)]">
                    จัดการที่พัก
                  </strong>{" "}
                  โดยไม่ต้องกรอกซ้ำซ้อน
                </p>
              </div>

              {/* 1. Property Type */}
              <section className="py-8 space-y-4">
                <h2 className="text-[18px] font-semibold text-[var(--color-text-primary)]">
                  ประเภทที่พักของคุณ
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {PROPERTY_TYPES.map((opt) => {
                    const active = propertyType === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setPropertyType(opt.value)}
                        className={`p-4 rounded-[14px] text-left flex items-start gap-3.5 cursor-pointer transition-colors ${
                          active
                            ? "bg-[#222222] !text-white dark:bg-[#f5f5f5] dark:!text-[#222222]"
                            : "bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)]"
                        }`}
                      >
                        <span className="shrink-0 mt-0.5">{opt.icon}</span>
                        <div className="min-w-0">
                          <p className="text-[15px] font-semibold leading-snug">
                            {opt.label}
                          </p>
                          <p
                            className={`text-[12.5px] mt-0.5 leading-relaxed ${
                              active
                                ? "opacity-80"
                                : "text-[var(--color-text-secondary)]"
                            }`}
                          >
                            {opt.desc}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* 2. Basic Storefront Identity (Unified Airbnb Grouped Inputs) */}
              <section className="py-8 space-y-4">
                <h2 className="text-[18px] font-semibold text-[var(--color-text-primary)]">
                  ชื่อและลิงก์หน้าร้านของคุณ
                </h2>

                <StandardFieldGroup>
                  <div className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x divide-y sm:divide-y-0 divide-[#b0b0b0] dark:divide-[var(--color-border-emphasized)]">
                    <StandardInput
                      grouped
                      label="ชื่อที่พัก (ภาษาไทย) *"
                      required
                      placeholder="เช่น สะปัน อันซีน รีสอร์ท"
                      value={nameTh}
                      onChange={(e) => setNameTh(e.target.value)}
                    />
                    <StandardInput
                      grouped
                      label="ชื่อที่พัก (English)"
                      optionalText="ไม่บังคับ"
                      placeholder="e.g. Sapan Unseen Resort"
                      value={nameEn}
                      onChange={(e) => setNameEn(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x divide-y sm:divide-y-0 divide-[#b0b0b0] dark:divide-[var(--color-border-emphasized)]">
                    <StandardInput
                      grouped
                      label="ลิงก์หน้าร้าน (URL Slug) *"
                      prefixText="cangaroom.com/"
                      required
                      placeholder="sapan-unseen"
                      value={slug}
                      onChange={(e) => setSlug(normalizeHotelSlug(e.target.value))}
                      className="font-mono"
                    />
                    <StandardSelectField
                      grouped
                      label="จังหวัด *"
                      value={provinceId}
                      onChange={setProvinceId}
                      sheetTitle="เลือกจังหวัดที่ตั้ง"
                      searchPlaceholder="พิมพ์ชื่อจังหวัด..."
                      options={THAILAND_77_PROVINCES.map((p) => ({
                        value: p.id,
                        label: p.nameTh,
                        sublabel: p.nameEn,
                      }))}
                    />
                  </div>
                </StandardFieldGroup>

                {slug.length >= 3 && (
                  <p className="text-[12.5px] flex items-center gap-1.5">
                    {slugStatus.checking ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--color-text-secondary)]" />
                        <span className="text-[var(--color-text-secondary)]">
                          กำลังตรวจสอบชื่อลิงก์...
                        </span>
                      </>
                    ) : slugStatus.available ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-success)]" />
                        <span className="font-medium text-[var(--color-success)]">
                          ใช้งานได้ทันที: cangaroom.com/{slug}
                        </span>
                      </>
                    ) : slugStatus.available === false ? (
                      <>
                        <XCircle className="w-3.5 h-3.5 text-[var(--color-error)]" />
                        <span className="font-medium text-[var(--color-error)]">
                          {slugStatus.reason || "ชื่อลิงก์นี้ถูกใช้แล้ว"}
                        </span>
                      </>
                    ) : null}
                  </p>
                )}

                {errorMsg && (
                  <div className="rounded-[12px] bg-[var(--color-background-muted)] px-4 py-3 text-[13.5px] font-semibold text-[var(--color-error)]">
                    {errorMsg}
                  </div>
                )}

                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-12 rounded-[12px] bg-[#222222] hover:bg-[#3f3f3f] dark:bg-[#f5f5f5] dark:hover:bg-[#e5e5e5] !text-white dark:!text-[#222222] text-[15px] font-semibold inline-flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
                  >
                    {isSubmitting && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                    <span>
                      {isSubmitting
                        ? "กำลังสร้างบัญชีที่พัก..."
                        : "เปิดใช้งานหลังบ้าน (ไปตั้งค่าห้องพักต่อ)"}
                    </span>
                    {!isSubmitting && <ArrowRight className="w-4 h-4" />}
                  </button>
                  <p className="text-[12.5px] text-[var(--color-text-tertiary)] text-center mt-2.5">
                    ระบบจะสร้างเป็นฉบับร่าง (Draft) ให้ก่อน คุณสามารถกรอกห้องพักและกดเผยแพร่ได้เมื่อพร้อม
                  </p>
                </div>
              </section>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
