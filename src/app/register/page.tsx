"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  Building2,
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  Globe,
  Home,
  Loader2,
  Sparkles,
  Tent,
  Trees,
  Upload,
  XCircle,
} from "lucide-react";
import { THAILAND_77_PROVINCES } from "@/data/thailandProvinces";
import { normalizeHotelSlug } from "@/lib/bookingMath";
import { PLACE_CATEGORIES } from "@/lib/placeCategories";
import { PlaceCategoryIcon } from "@/components/shared/PlaceCategoryCrest";
import { useHotelApp } from "@/components/HotelAppShell";
import { uploadMediaFile } from "@/lib/slipScanner";
import {
  StandardFieldGroup,
  StandardInput,
  StandardSelectField,
} from "@/components/ui/standards";
import type {
  MerchantModeDto,
  PlaceCategoryDto,
  PropertyTypeDto,
} from "@/types/cangaroom";

const HostLocationPicker = dynamic(
  () =>
    import("@/components/studio/HostLocationPicker").then(
      (mod) => mod.HostLocationPicker
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-[240px] rounded-[20px] bg-[var(--color-background-muted)] animate-pulse" />
    ),
  }
);

const CATEGORY_DESCRIPTIONS: Record<PlaceCategoryDto, string> = {
  STAY: "โรงแรม รีสอร์ท พูลวิลล่า โฮมสเตย์ แกลมปิ้ง",
  CAFE: "คาเฟ่ ร้านกาแฟ เบเกอรี มุมถ่ายรูป",
  RESTAURANT: "ร้านอาหาร อาหารพื้นถิ่น บาร์ รูฟท็อป",
  ATTRACTION: "จุดชมวิว น้ำตก วัด ตลาด แหล่งท่องเที่ยว",
  WELLNESS: "สปา ออนเซ็น นวดไทย เวลเนส",
};

const PROPERTY_TYPES: Array<{
  value: PropertyTypeDto;
  label: string;
  desc: string;
  icon: React.ReactNode;
}> = [
  {
    value: "BOUTIQUE_HOTEL",
    label: "โรงแรมขนาดเล็ก / บูทีค",
    desc: "หลายแบบห้องพักหรือหลายชั้น",
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
    desc: "เต็นท์โดม บ้านไม้ หรือใกล้ธรรมชาติ",
    icon: <Tent className="w-5 h-5" />,
  },
];

export default function UnifiedRegisterPage() {
  const router = useRouter();
  const { user, isCheckingSession, refreshMe } = useHotelApp();

  const [placeCategory, setPlaceCategory] = useState<PlaceCategoryDto>("STAY");
  const [merchantMode, setMerchantMode] =
    useState<MerchantModeDto>("DIRECT_BOOKING");
  const [propertyType, setPropertyType] =
    useState<PropertyTypeDto>("BOUTIQUE_HOTEL");

  const [nameTh, setNameTh] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [taglineTh, setTaglineTh] = useState("");
  const [slug, setSlug] = useState("");
  const [provinceId, setProvinceId] = useState("chiang-mai");
  const [externalWebsiteUrl, setExternalWebsiteUrl] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactLine, setContactLine] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");

  const [slugStatus, setSlugStatus] = useState<{
    checking: boolean;
    available: boolean | null;
    reason: string | null;
  }>({ checking: false, available: null, reason: null });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const effectiveMerchantMode: MerchantModeDto =
    placeCategory === "STAY" ? merchantMode : "PROFILE_ONLY";

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
      setErrorMsg("กรุณากรอกชื่อสถานที่ภาษาไทย");
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
          quickSetup: effectiveMerchantMode === "DIRECT_BOOKING",
          placeCategory,
          merchantMode: effectiveMerchantMode,
          propertyType,
          nameTh: nameTh.trim(),
          nameEn: nameEn.trim() || nameTh.trim(),
          taglineTh: taglineTh.trim() || undefined,
          slug: cleanSlug,
          provinceId,
          externalWebsiteUrl: externalWebsiteUrl.trim() || undefined,
          contactPhone: contactPhone.trim() || undefined,
          contactLine: contactLine.trim() || undefined,
          coverImageUrl: coverImageUrl.trim() || undefined,
          latitude,
          longitude,
          googleMapsUrl: googleMapsUrl.trim() || undefined,
        }),
      });
      const json = (await res.json()) as {
        hotel?: { slug: string; merchantMode: MerchantModeDto };
        error?: string;
      };
      if (!res.ok || !json.hotel) {
        setErrorMsg(json.error || "ไม่สามารถเปิดหน้าสถานที่ได้ กรุณาลองใหม่");
        return;
      }

      await refreshMe();
      if (effectiveMerchantMode === "DIRECT_BOOKING") {
        router.push(
          `/studio/listings/rooms?hotel=${encodeURIComponent(json.hotel.slug)}`
        );
      } else {
        router.push(`/${encodeURIComponent(json.hotel.slug)}`);
      }
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
            <img
              src="/brand/nondii-icon-square-black.svg"
              alt="Nondii"
              className="w-8 h-8 object-contain dark:invert"
            />
            <span className="text-[15.5px] font-semibold tracking-tight">
              Nondii · เปิดหน้าธุรกิจฟรี
            </span>
          </Link>

          <Link
            href="/"
            className="h-10 px-4 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[13.5px] font-semibold text-[var(--color-text-primary)] inline-flex items-center transition-colors"
          >
            กลับโหมดนักเดินทาง
          </Link>
        </div>
      </header>

      <main className="flex-1 px-4 sm:px-8 py-10 sm:py-14">
        <div className="max-w-[680px] mx-auto">
          {!isCheckingSession && !user ? (
            <div className="py-12 text-center space-y-5">
              <span className="h-14 w-14 mx-auto rounded-[18px] bg-[var(--color-background-muted)] inline-flex items-center justify-center text-[var(--color-accent)]">
                <Sparkles className="w-7 h-7" />
              </span>
              <div className="space-y-1.5">
                <h1 className="text-[26px] font-semibold text-[var(--color-text-primary)]">
                  เข้าสู่ระบบก่อนเปิดหน้าธุรกิจบน Nondii
                </h1>
                <p className="text-[14.5px] text-[var(--color-text-secondary)]">
                  เปิดหน้าโปรไฟล์สถานที่ ปักหมุดแผนที่ แจกโปรโมชั่น หรือรับจองตรง 0% GP ได้ฟรีตลอดชีพ
                </p>
              </div>
              <Link
                href="/login?next=/register"
                className="inline-flex items-center h-11 px-6 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] text-[14.5px] font-semibold transition-colors"
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
                <p className="text-[13px] font-semibold text-[var(--color-accent)]">
                  เปิดหน้าสถานที่ฟรีตลอดชีพ · ไม่มีค่าคอมมิชชัน 0% GP
                </p>
                <h1 className="text-[28px] sm:text-[32px] font-semibold tracking-[-0.02em] text-[var(--color-text-primary)] leading-tight">
                  สร้างหน้าโปรไฟล์สถานที่ของคุณ
                </h1>
                <p className="text-[14.5px] leading-relaxed text-[var(--color-text-secondary)]">
                  ใช้ได้ทั้งโรงแรม คาเฟ่ ร้านอาหาร ที่เที่ยว และสปา ปักหมุดขึ้นแผนที่ Nondii และแก้ไขข้อมูลหรือโพสต์ข่าวสารได้เหมือนเพจโซเชียล
                </p>
              </div>

              {/* Step 1: 5 Place Categories */}
              <section className="py-8 space-y-4">
                <div className="space-y-1">
                  <h2 className="text-[18px] font-semibold text-[var(--color-text-primary)]">
                    1. เลือกประเภทธุรกิจของคุณ
                  </h2>
                  <p className="text-[13px] text-[var(--color-text-secondary)]">
                    ระบบจะจัดหมวดการ์ด สีหมุดแผนที่ และหน้าจัดการหลังบ้านให้ตรงกับธุรกิจของคุณอัตโนมัติ
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {PLACE_CATEGORIES.map((cat) => {
                    const active = placeCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setPlaceCategory(cat.id)}
                        className={`p-4 rounded-[20px] text-left flex items-start gap-3.5 cursor-pointer transition-colors ${
                          active
                            ? "bg-[var(--color-accent-muted)] ring-2 ring-[var(--color-accent)] text-[var(--color-text-primary)]"
                            : "bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)]"
                        }`}
                      >
                        <span
                          style={{ color: cat.crestBgHex }}
                          className="h-10 w-10 rounded-[12px] bg-[var(--color-background-card)] ring-1 ring-black/[0.06] dark:ring-white/[0.08] inline-flex items-center justify-center shrink-0"
                        >
                          <PlaceCategoryIcon category={cat.id} className="w-5 h-5" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-[15px] font-semibold leading-snug">
                            {cat.labelTh}
                          </p>
                          <p className="text-[12.5px] mt-0.5 leading-relaxed text-[var(--color-text-secondary)]">
                            {CATEGORY_DESCRIPTIONS[cat.id]}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Step 2 (STAY only): MerchantMode + PropertyType */}
              {placeCategory === "STAY" && (
                <section className="py-8 space-y-6">
                  <div className="space-y-3">
                    <h2 className="text-[18px] font-semibold text-[var(--color-text-primary)]">
                      2. รูปแบบหน้าโปรไฟล์ที่พักที่ต้องการ
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setMerchantMode("DIRECT_BOOKING")}
                        className={`p-4 rounded-[20px] text-left flex items-start gap-3 cursor-pointer transition-colors ${
                          merchantMode === "DIRECT_BOOKING"
                            ? "bg-[var(--color-accent-muted)] ring-2 ring-[var(--color-accent)] text-[var(--color-text-primary)]"
                            : "bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)]"
                        }`}
                      >
                        <span className="h-10 w-10 rounded-[12px] bg-[var(--color-background-card)] text-[var(--color-accent)] inline-flex items-center justify-center shrink-0">
                          <CalendarCheck className="w-5 h-5" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-[15px] font-semibold">
                            เปิดระบบจองตรง 0% GP ฟรี
                          </p>
                          <p className="text-[12.5px] text-[var(--color-text-secondary)] mt-0.5 leading-relaxed">
                            มีปฏิทินห้องว่าง ราคาวันหยุด และรับเงินเข้า PromptPay 100% เหมาะกับที่พักที่รับจองผ่านแชท
                          </p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setMerchantMode("PROFILE_ONLY")}
                        className={`p-4 rounded-[20px] text-left flex items-start gap-3 cursor-pointer transition-colors ${
                          merchantMode === "PROFILE_ONLY"
                            ? "bg-[var(--color-accent-muted)] ring-2 ring-[var(--color-accent)] text-[var(--color-text-primary)]"
                            : "bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)]"
                        }`}
                      >
                        <span className="h-10 w-10 rounded-[12px] bg-[var(--color-background-card)] text-[var(--color-accent)] inline-flex items-center justify-center shrink-0">
                          <Globe className="w-5 h-5" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-[15px] font-semibold">
                            ใช้เฉพาะหน้าโปรไฟล์ & ลิงก์เว็บจองเอง
                          </p>
                          <p className="text-[12.5px] text-[var(--color-text-secondary)] mt-0.5 leading-relaxed">
                            มีระบบจอง/PMS อยู่แล้ว ไม่ต้องดูแลปฏิทินซ้ำ ใช้หน้าโปรไฟล์สวยๆ ส่งคนกลับเว็บโรงแรม
                          </p>
                        </div>
                      </button>
                    </div>
                  </div>

                  {merchantMode === "DIRECT_BOOKING" && (
                    <div className="space-y-3">
                      <p className="text-[14.5px] font-semibold text-[var(--color-text-primary)]">
                        รูปแบบที่พัก
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {PROPERTY_TYPES.map((opt) => {
                          const active = propertyType === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => setPropertyType(opt.value)}
                              className={`p-3.5 rounded-[18px] text-left flex items-start gap-3 cursor-pointer transition-colors ${
                                active
                                  ? "bg-[var(--color-accent)] !text-[var(--color-on-accent)]"
                                  : "bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)]"
                              }`}
                            >
                              <span className="shrink-0 mt-0.5">{opt.icon}</span>
                              <div className="min-w-0">
                                <p className="text-[14.5px] font-semibold leading-snug">
                                  {opt.label}
                                </p>
                                <p
                                  className={`text-[12px] mt-0.5 leading-relaxed ${
                                    active
                                      ? "opacity-85"
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
                    </div>
                  )}
                </section>
              )}

              {/* Step 3: Place Identity, Cover & Location */}
              <section className="py-8 space-y-5">
                <h2 className="text-[18px] font-semibold text-[var(--color-text-primary)]">
                  {placeCategory === "STAY" ? "3." : "2."} ข้อมูลสถานที่ & ลิงก์หน้าร้าน
                </h2>

                <StandardFieldGroup>
                  <div className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x divide-y sm:divide-y-0 divide-[#b0b0b0] dark:divide-[var(--color-border-emphasized)]">
                    <StandardInput
                      grouped
                      label="ชื่อสถานที่ (ภาษาไทย) *"
                      required
                      placeholder={
                        placeCategory === "STAY"
                          ? "เช่น สะปัน อันซีน รีสอร์ท"
                          : placeCategory === "CAFE"
                          ? "เช่น กราฟ คาเฟ่ น่าน"
                          : "เช่น ชื่อร้านหรือสถานที่ของคุณ"
                      }
                      value={nameTh}
                      onChange={(e) => setNameTh(e.target.value)}
                    />
                    <StandardInput
                      grouped
                      label="ชื่อภาษาอังกฤษ (English)"
                      optionalText="ไม่บังคับ"
                      placeholder="e.g. Graph Cafe Nan"
                      value={nameEn}
                      onChange={(e) => setNameEn(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x divide-y sm:divide-y-0 divide-[#b0b0b0] dark:divide-[var(--color-border-emphasized)]">
                    <StandardInput
                      grouped
                      label="ลิงก์หน้าร้าน (URL Slug) *"
                      prefixText="nondii.com/"
                      required
                      placeholder="your-place-name"
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
                          ใช้งานได้ทันที: nondii.com/{slug}
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

                <StandardFieldGroup>
                  <StandardInput
                    grouped
                    label="คำโปรยสั้นๆ บนการ์ด / หน้าโปรไฟล์"
                    optionalText="ไม่บังคับ"
                    placeholder="เช่น คาเฟ่สโลว์บาร์กลางหุบเขา วิวหมอกยามเช้า"
                    value={taglineTh}
                    onChange={(e) => setTaglineTh(e.target.value)}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x divide-y sm:divide-y-0 divide-[#b0b0b0] dark:divide-[var(--color-border-emphasized)]">
                    <StandardInput
                      grouped
                      label="เบอร์โทรติดต่อ"
                      optionalText="ไม่บังคับ"
                      placeholder="08X-XXX-XXXX"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                    />
                    <StandardInput
                      grouped
                      label="LINE ID / @LINE OA"
                      optionalText="ไม่บังคับ"
                      placeholder="@yourplace"
                      value={contactLine}
                      onChange={(e) => setContactLine(e.target.value)}
                    />
                  </div>
                  {effectiveMerchantMode === "PROFILE_ONLY" && (
                    <StandardInput
                      grouped
                      label="ลิงก์เว็บไซต์ / หน้าจอง / เมนูภายนอก"
                      optionalText="ไม่บังคับ"
                      placeholder="https://yourwebsite.com"
                      value={externalWebsiteUrl}
                      onChange={(e) => setExternalWebsiteUrl(e.target.value)}
                    />
                  )}
                </StandardFieldGroup>

                {/* Cover Photo Upload (Square 1:1 preview) */}
                <div className="space-y-2">
                  <p className="text-[14px] font-semibold text-[var(--color-text-primary)]">
                    ภาพปกหน้าการ์ด (แนะนำรูปสี่เหลี่ยมจัตุรัส 1:1)
                  </p>
                  <div className="flex items-center gap-4">
                    {coverImageUrl ? (
                      <img
                        src={coverImageUrl}
                        alt="Cover preview"
                        className="h-20 w-20 rounded-[18px] object-cover bg-[var(--color-background-muted)] shrink-0"
                      />
                    ) : (
                      <div className="h-20 w-20 rounded-[18px] bg-[var(--color-background-muted)] flex items-center justify-center text-[var(--color-text-secondary)] shrink-0">
                        <Upload className="w-5 h-5" />
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <label className="h-10 px-4 rounded-[14px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[13.5px] font-semibold text-[var(--color-text-primary)] inline-flex items-center gap-2 cursor-pointer transition-colors">
                        {isUploadingCover ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Upload className="w-4 h-4" />
                        )}
                        <span>
                          {isUploadingCover ? "กำลังอัปโหลด..." : "อัปโหลดภาพปก"}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setIsUploadingCover(true);
                            try {
                              const url = await uploadMediaFile(file, "logos");
                              setCoverImageUrl(url);
                            } finally {
                              setIsUploadingCover(false);
                            }
                          }}
                        />
                      </label>
                      <p className="text-[12px] text-[var(--color-text-secondary)]">
                        หากยังไม่มีรูป ระบบจะใส่ภาพตัวอย่างให้ก่อนและเปลี่ยนทีหลังได้ทันที
                      </p>
                    </div>
                  </div>
                </div>

                {/* Map Pin & Google Maps Link Resolver */}
                <div className="space-y-2 pt-2">
                  <p className="text-[14px] font-semibold text-[var(--color-text-primary)]">
                    ปักหมุดพิกัดบนแผนที่ (วางลิงก์ Google Maps หรือเลื่อนหมุดได้เลย)
                  </p>
                  <HostLocationPicker
                    provinceId={provinceId}
                    latitude={latitude}
                    longitude={longitude}
                    googleMapsUrl={googleMapsUrl}
                    onChangeCoordinates={(lat, lng) => {
                      setLatitude(lat);
                      setLongitude(lng);
                    }}
                    onChangeGoogleMapsUrl={setGoogleMapsUrl}
                    compact
                  />
                </div>

                {errorMsg && (
                  <div className="rounded-[14px] bg-[var(--color-background-muted)] px-4 py-3 text-[13.5px] font-semibold text-[var(--color-error)]">
                    {errorMsg}
                  </div>
                )}

                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-12 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] text-[15px] font-semibold inline-flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
                  >
                    {isSubmitting && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                    <span>
                      {isSubmitting
                        ? "กำลังเปิดหน้าสถานที่..."
                        : effectiveMerchantMode === "DIRECT_BOOKING"
                        ? "เปิดระบบจองตรง 0% GP (ไปตั้งค่าห้องพักต่อ)"
                        : "สร้างหน้าโปรไฟล์สถานที่ฟรีเลย"}
                    </span>
                    {!isSubmitting && <ChevronRight className="w-4 h-4" />}
                  </button>
                  <p className="text-[12.5px] text-[var(--color-text-tertiary)] text-center mt-2.5">
                    {effectiveMerchantMode === "DIRECT_BOOKING"
                      ? "ระบบจะสร้างแบบร่างให้คุณเพิ่มห้องพักและเปิดเผยแพร่เมื่อพร้อม"
                      : "สร้างเสร็จเปิดหน้าโปรไฟล์ใช้งานและแชร์ลิงก์ได้ทันที พร้อมป้ายรอตรวจสอบ"}
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
