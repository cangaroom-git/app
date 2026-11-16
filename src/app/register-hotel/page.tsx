"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  CheckCircle2,
  ExternalLink,
  Globe,
  Loader2,
  Moon,
  Sun,
} from "lucide-react";
import { authClient } from "@/lib/auth/client";
import { useHotelApp } from "@/components/HotelAppShell";
import {
  UserAvatarCircle,
  useAuthenticatedProfile,
} from "@/components/navigation/UserProfileDropdown";
import { StandardButton, StandardInput } from "@/components/ui/standards";

export default function RegisterHotelTrialPage() {
  const router = useRouter();
  const { lang, setLang, theme, toggleTheme } = useHotelApp();
  const { user, isCheckingSession } = useAuthenticatedProfile();

  const [nameTh, setNameTh] = useState("");
  const [slug, setSlug] = useState("");
  const [locationTh, setLocationTh] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [ownerLine, setOwnerLine] = useState("");

  const [slugChecking, setSlugChecking] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [slugReason, setSlugReason] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdTenant, setCreatedTenant] = useState<{
    slug: string;
    nameTh: string;
    expiresAt: string;
  } | null>(null);

  useEffect(() => {
    const clean = slug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "")
      .replace(/^-+|-+$/g, "");
    if (!clean || clean.length < 3) {
      setSlugAvailable(null);
      setSlugReason(null);
      return;
    }

    let cancelled = false;
    setSlugChecking(true);
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/platform/onboarding?slug=${encodeURIComponent(clean)}`
        );
        const data = await res.json();
        if (!cancelled) {
          setSlugAvailable(Boolean(data.available));
          setSlugReason(data.reason || null);
        }
      } catch {
        if (!cancelled) {
          setSlugAvailable(null);
        }
      } finally {
        if (!cancelled) {
          setSlugChecking(false);
        }
      }
    }, 320);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [slug]);

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    try {
      const callbackOrigin =
        typeof window !== "undefined"
          ? `${window.location.origin}/register-hotel`
          : "/register-hotel";
      await authClient.signIn.social({
        provider: "google",
        callbackURL: callbackOrigin,
      });
    } catch {
      setIsSubmitting(false);
    }
  };

  const handleCreateTrialHotel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameTh.trim() || !slug.trim()) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/platform/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nameTh: nameTh.trim(),
          slug: slug.trim(),
          locationTh: locationTh.trim(),
          ownerPhone: ownerPhone.trim(),
          ownerLine: ownerLine.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setErrorMessage(data?.error || "ไม่สามารถสร้างเว็บไซต์ที่พักได้");
        setIsSubmitting(false);
        return;
      }

      setCreatedTenant({
        slug: data.tenant.slug,
        nameTh: data.tenant.nameTh,
        expiresAt: data.tenant.expiresAt,
      });
    } catch {
      setErrorMessage("เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่");
    } finally {
      setIsSubmitting(false);
    }
  };

  const normalizedSlug = slug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "");

  return (
    <div className="min-h-[100dvh] bg-[var(--color-background-body)] text-[var(--color-text-primary)] flex flex-col">
      {/* Top Bar */}
      <header className="h-14 bg-[var(--color-background-card)] border-b border-[var(--color-border)] px-4 sm:px-6 flex items-center justify-between">
        <Link href="/" className="btn-fw-secondary !h-9">
          <ArrowLeft className="w-4 h-4" />
          <span>{lang === "th" ? "กลับหน้าแรก" : "Back"}</span>
        </Link>

        <div className="flex items-center gap-2">
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
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-[480px] app-card p-5 sm:p-6 space-y-5">
          {createdTenant ? (
            <div className="text-center space-y-4 py-2">
              <div className="mx-auto h-14 w-14 rounded-full bg-[var(--color-success-muted)] text-[var(--color-success)] flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h1 className="ty-display">
                  {lang === "th"
                    ? "เปิดเว็บไซต์ที่พักสำเร็จแล้ว!"
                    : "Your Hotel Site is Live!"}
                </h1>
                <p className="ty-body-muted">
                  {lang === "th"
                    ? `เริ่มสิทธิ์ทดลองใช้งานฟรี 30 วันสำหรับ “${createdTenant.nameTh}” เรียบร้อยแล้ว`
                    : `Your 30-day free trial for “${createdTenant.nameTh}” is now active.`}
                </p>
              </div>

              <div className="rounded-[10px] bg-[var(--color-background-muted)] p-3.5 text-left space-y-1.5">
                <p className="ty-caption font-semibold">
                  {lang === "th" ? "ลิงก์เว็บไซต์ของคุณ" : "Your Subdomain URL"}
                </p>
                <p className="ty-subtitle font-mono text-[var(--color-accent)] break-all">
                  https://{createdTenant.slug}.cangaroom.com
                </p>
                <p className="ty-caption">
                  {lang === "th"
                    ? `ใช้งานฟรีถึงวันที่ ${new Date(
                        createdTenant.expiresAt
                      ).toLocaleDateString("th-TH", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}`
                    : `Free trial valid until ${new Date(
                        createdTenant.expiresAt
                      ).toLocaleDateString("en-US")}`}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <StandardButton
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={() =>
                    router.push(
                      `/admin?tenant=${encodeURIComponent(createdTenant.slug)}`
                    )
                  }
                >
                  <span>
                    {lang === "th" ? "เข้าจัดการหลังบ้าน" : "Open Admin"}
                  </span>
                </StandardButton>

                <StandardButton
                  variant="secondary"
                  size="lg"
                  fullWidth
                  onClick={() =>
                    router.push(
                      `/?tenant=${encodeURIComponent(createdTenant.slug)}&edit=1`
                    )
                  }
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>
                    {lang === "th" ? "แก้ไขหน้าเว็บจริง" : "Edit Live Site"}
                  </span>
                </StandardButton>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-accent-muted)] text-[var(--color-accent)] px-3 py-1 ty-caption font-semibold">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>
                    {lang === "th"
                      ? "ทดลองใช้งานฟรี 30 วัน · เปิดใช้งานทันที"
                      : "30-Day Free Trial · Instant Setup"}
                  </span>
                </div>
                <h1 className="ty-display">
                  {lang === "th"
                    ? "สร้างเว็บไซต์จองที่พักของคุณ"
                    : "Create Your Direct Booking Site"}
                </h1>
                <p className="ty-body-muted">
                  {lang === "th"
                    ? "สมัครเสร็จใช้งานได้ทันทีโดยไม่ต้องรออนุมัติ พร้อมระบบปฏิทินล็อกห้องพัก คูปองส่วนลด และแก้ไขข้อมูลจากหน้าเว็บได้เอง"
                    : "Launch your resort booking website in 30 seconds — no approval wait and no credit card required."}
                </p>
              </div>

              {isCheckingSession ? (
                <div className="py-8 flex items-center justify-center gap-2 ty-body-muted">
                  <Loader2 className="w-5 h-5 animate-spin text-[var(--color-accent)]" />
                  <span>กำลังตรวจสอบบัญชีผู้ใช้...</span>
                </div>
              ) : !user ? (
                <div className="rounded-[10px] bg-[var(--color-background-muted)] p-4 space-y-3">
                  <p className="ty-body font-semibold">
                    {lang === "th"
                      ? "ขั้นตอนที่ 1: ยืนยันบัญชีเจ้าของที่พักด้วย Google"
                      : "Step 1: Continue with your Google account"}
                  </p>
                  <p className="ty-caption">
                    {lang === "th"
                      ? "ระบบจะผูกสิทธิ์ผู้ดูแลที่พัก (Hotel Admin) เข้ากับอีเมล Gmail ของคุณโดยอัตโนมัติ"
                      : "Your Gmail will automatically become the owner account for your property."}
                  </p>
                  <StandardButton
                    type="button"
                    variant="primary"
                    size="lg"
                    fullWidth
                    disabled={isSubmitting}
                    onClick={handleGoogleSignIn}
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : null}
                    <span>
                      {lang === "th"
                        ? "ดำเนินการต่อด้วยบัญชี Google"
                        : "Continue with Google"}
                    </span>
                  </StandardButton>
                </div>
              ) : (
                <form onSubmit={handleCreateTrialHotel} className="space-y-4">
                  {/* Signed-in Owner Card */}
                  <div className="rounded-[8px] bg-[var(--color-background-muted)] p-3 flex items-center gap-3">
                    <UserAvatarCircle user={user} sizeClass="h-10 w-10" />
                    <div className="min-w-0 flex-1">
                      <p className="ty-body font-semibold truncate flex items-center gap-1">
                        <span>{user.name}</span>
                        <BadgeCheck className="w-4 h-4 text-[var(--color-accent)] shrink-0" />
                      </p>
                      <p className="ty-caption truncate">{user.email}</p>
                    </div>
                  </div>

                  <StandardInput
                    label={
                      lang === "th"
                        ? "ชื่อโรงแรม / พูลวิลล่า / รีสอร์ท *"
                        : "Property Name *"
                    }
                    placeholder={
                      lang === "th"
                        ? "เช่น ภูผา พูลวิลล่า เขาใหญ่"
                        : "e.g. Phupha Pool Villa"
                    }
                    required
                    value={nameTh}
                    onChange={(e) => setNameTh(e.target.value)}
                  />

                  <div className="space-y-1.5">
                    <label className="block ty-body font-semibold text-[var(--color-text-primary)]">
                      {lang === "th"
                        ? "ชื่อลิงก์เว็บไซต์ของคุณ (Subdomain) *"
                        : "Your Subdomain *"}
                    </label>
                    <div className="flex items-center rounded-[8px] border border-[var(--color-border)] bg-[var(--color-background-muted)] focus-within:border-[var(--color-accent)] focus-within:bg-[var(--color-background-card)] overflow-hidden">
                      <span className="pl-3 pr-1 text-[var(--color-text-secondary)]">
                        <Globe className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        required
                        value={slug}
                        onChange={(e) =>
                          setSlug(
                            e.target.value
                              .toLowerCase()
                              .replace(/[^a-z0-9-]/g, "")
                          )
                        }
                        placeholder="phupha"
                        className="h-10 flex-1 min-w-0 bg-transparent px-2 ty-body font-mono focus:outline-none"
                      />
                      <span className="pr-3 ty-caption font-mono font-semibold text-[var(--color-text-secondary)] shrink-0">
                        .cangaroom.com
                      </span>
                    </div>

                    {normalizedSlug.length >= 3 && (
                      <p
                        className={`ty-caption font-medium ${
                          slugChecking
                            ? "text-[var(--color-text-secondary)]"
                            : slugAvailable
                            ? "text-[var(--color-success)]"
                            : "text-[var(--color-error)]"
                        }`}
                      >
                        {slugChecking
                          ? "กำลังตรวจสอบชื่อลิงก์..."
                          : slugAvailable
                          ? `✓ ใช้งาน https://${normalizedSlug}.cangaroom.com ได้ทันที`
                          : `✗ ${slugReason || "ชื่อนี้ไม่สามารถใช้งานได้"}`}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <StandardInput
                      label={lang === "th" ? "ทำเลที่ตั้ง / จังหวัด" : "Location"}
                      placeholder={
                        lang === "th" ? "เช่น เขาใหญ่ จ.นครราชสีมา" : "e.g. Khao Yai"
                      }
                      value={locationTh}
                      onChange={(e) => setLocationTh(e.target.value)}
                    />
                    <StandardInput
                      label={lang === "th" ? "เบอร์โทรศัพท์" : "Phone Number"}
                      placeholder="08x-xxx-xxxx"
                      value={ownerPhone}
                      onChange={(e) => setOwnerPhone(e.target.value)}
                    />
                  </div>

                  <StandardInput
                    label="LINE Official / LINE ID"
                    optionalText={lang === "th" ? "ไม่บังคับ" : "Optional"}
                    placeholder="@yourhotel"
                    value={ownerLine}
                    onChange={(e) => setOwnerLine(e.target.value)}
                  />

                  {errorMessage && (
                    <div className="rounded-[8px] bg-[var(--color-error-muted)] text-[var(--color-error)] px-3.5 py-2.5 ty-caption font-semibold">
                      {errorMessage}
                    </div>
                  )}

                  <StandardButton
                    type="submit"
                    variant="primary"
                    size="lg"
                    fullWidth
                    disabled={
                      isSubmitting ||
                      slugChecking ||
                      slugAvailable === false ||
                      normalizedSlug.length < 3
                    }
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : null}
                    <span>
                      {lang === "th"
                        ? "เปิดเว็บที่พักทดลองใช้ฟรี 30 วัน"
                        : "Start My 30-Day Free Trial"}
                    </span>
                  </StandardButton>
                </form>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

