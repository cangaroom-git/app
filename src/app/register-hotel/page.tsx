"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import {
  STAY_STYLE_TABS,
  THAILAND_77_PROVINCES,
} from "@/data/thailandProvinces";
import { authClient } from "@/lib/auth/client";
import { useHotelApp } from "@/components/HotelAppShell";
import { StandardButton, StandardInput } from "@/components/ui/standards";

export default function RegisterHotelPage() {
  const router = useRouter();
  const { lang, user, isCheckingSession, refreshMe } = useHotelApp();

  const [nameTh, setNameTh] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [slug, setSlug] = useState("");
  const [provinceId, setProvinceId] = useState("chiang-mai");
  const [districtTh, setDistrictTh] = useState("");
  const [stayStyles, setStayStyles] = useState<string[]>(["mountain"]);
  const [contactPhone, setContactPhone] = useState("");
  const [contactLine, setContactLine] = useState("");
  const [promptPayId, setPromptPayId] = useState("");
  const [facebookPageUrl, setFacebookPageUrl] = useState("");

  const [slugChecking, setSlugChecking] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [slugReason, setSlugReason] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
          `/api/studio/onboarding?slug=${encodeURIComponent(clean)}`
        );
        const data = (await res.json()) as {
          available?: boolean;
          reason?: string | null;
        };
        if (!cancelled) {
          setSlugAvailable(Boolean(data.available));
          setSlugReason(data.reason || null);
        }
      } catch {
        if (!cancelled) setSlugAvailable(null);
      } finally {
        if (!cancelled) setSlugChecking(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [slug]);

  const toggleStyle = (id: string) => {
    setStayStyles((prev) =>
      prev.includes(id)
        ? prev.length > 1
          ? prev.filter((s) => s !== id)
          : prev
        : [...prev, id]
    );
  };

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    try {
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      await authClient.signIn.social({
        provider: "google",
        callbackURL: `${origin}/register-hotel`,
      });
    } catch {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/studio/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nameTh: nameTh.trim(),
          nameEn: nameEn.trim() || undefined,
          slug: slug.trim(),
          provinceId,
          districtTh: districtTh.trim(),
          stayStyles,
          contactPhone: contactPhone.trim(),
          contactLine: contactLine.trim(),
          promptPayId: promptPayId.trim() || contactPhone.trim(),
          facebookPageUrl: facebookPageUrl.trim(),
        }),
      });
      const data = (await res.json()) as {
        hotel?: { slug: string };
        error?: string;
      };
      if (!res.ok || !data.hotel) {
        setErrorMessage(data.error || "เปิดเพจที่พักไม่สำเร็จ");
        setIsSubmitting(false);
        return;
      }

      await refreshMe();
      router.push(`/studio?hotel=${encodeURIComponent(data.hotel.slug)}`);
    } catch {
      setErrorMessage("เกิดข้อผิดพลาดในการเชื่อมต่อ");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="cgr-page-form space-y-6">
      <section className="space-y-2 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-background-muted)] text-[var(--color-text-primary)] px-3 py-1 ty-caption font-semibold">
          <span>สำหรับเจ้าของโรงแรม รีสอร์ท และพูลวิลล่าทั่วไทย · 0% GP</span>
        </span>
        <h1 className="ty-display text-[26px] sm:text-[28px]">
          เปิดเพจที่พัก & ระบบจองตรงฟรี 0% GP ตลอดชีพ
        </h1>
        <p className="ty-body text-[var(--color-text-secondary)]">
          รับลิงก์{" "}
          <strong className="text-[var(--color-text-primary)]">
            cangaroom.com/ชื่อที่พัก
          </strong>{" "}
          พร้อมปฏิทินห้องว่าง ระบบตรวจสลิปโอนตรงเข้าบัญชีคุณ 100%
          และเชื่อมต่อดึงรูปจาก Facebook Page อัตโนมัติ
        </p>
      </section>

      <div className="app-card p-5 sm:p-7 space-y-5">
          {isCheckingSession ? (
            <div className="py-10 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--color-accent)]" />
            </div>
          ) : !user ? (
            <div className="text-center space-y-4 py-4">
              <Building2 className="w-10 h-10 text-[var(--color-accent)] mx-auto" />
              <h2 className="ty-title">เข้าสู่ระบบก่อนเปิดเพจที่พักของคุณ</h2>
              <p className="ty-caption">
                ใช้บัญชี Google หรืออีเมลของคุณเพื่อเป็นเจ้าของสิทธิ์แก้ไขและรับยอดจอง
              </p>
              <div className="flex flex-wrap justify-center gap-2.5">
                <StandardButton
                  type="button"
                  variant="primary"
                  size="lg"
                  onClick={handleGoogleSignIn}
                  disabled={isSubmitting}
                >
                  ดำเนินการต่อด้วย Google
                </StandardButton>
                <Link
                  href="/login?callbackUrl=/register-hotel"
                  className="btn-fw-secondary !h-10 !px-5"
                >
                  เข้าสู่ระบบด้วยอีเมล
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMessage && (
                <div className="rounded-[12px] bg-[var(--color-error-muted)] p-3.5 ty-caption font-semibold text-[var(--color-error)]">
                  {errorMessage}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <StandardInput
                  label="ชื่อที่พัก (ภาษาไทย) *"
                  placeholder="เช่น บ้านทะเลหมอก สะปัน"
                  required
                  value={nameTh}
                  onChange={(e) => setNameTh(e.target.value)}
                />
                <StandardInput
                  label="ชื่อที่พัก (ภาษาอังกฤษ)"
                  placeholder="e.g. Baan Talay Mok Sapan"
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <StandardInput
                  label="ลิงก์หน้าร้านของคุณ (cangaroom.com/ชื่อที่พัก) *"
                  placeholder="เช่น sapan-talaymok (ภาษาอังกฤษตัวเล็กและขีดกลาง)"
                  required
                  value={slug}
                  onChange={(e) =>
                    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
                  }
                />
                {slug.length >= 3 && (
                  <p
                    className={`ty-caption font-semibold flex items-center gap-1.5 ${
                      slugAvailable
                        ? "text-[var(--color-success)]"
                        : "text-[var(--color-error)]"
                    }`}
                  >
                    {slugChecking ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>กำลังตรวจสอบชื่อลิงก์...</span>
                      </>
                    ) : slugAvailable ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>ใช้งานได้: cangaroom.com/{slug}</span>
                      </>
                    ) : (
                      <span>{slugReason || "ชื่อลิงก์นี้ใช้งานไม่ได้"}</span>
                    )}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="ty-caption font-semibold block mb-1.5">
                    จังหวัดที่ตั้ง *
                  </label>
                  <select
                    value={provinceId}
                    onChange={(e) => setProvinceId(e.target.value)}
                    className="fw-input w-full"
                  >
                    {THAILAND_77_PROVINCES.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nameTh}
                      </option>
                    ))}
                  </select>
                </div>

                <StandardInput
                  label="อำเภอ / ย่านทำเล"
                  placeholder="เช่น อ.แม่ริม / หาดกมลา"
                  value={districtTh}
                  onChange={(e) => setDistrictTh(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="ty-caption font-semibold block">
                  สไตล์ที่พัก (เลือกได้หลายหมวด) *
                </label>
                <div className="flex flex-wrap gap-2">
                  {STAY_STYLE_TABS.filter((t) => t.id !== "all").map((t) => {
                    const isPicked = stayStyles.includes(t.id);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => toggleStyle(t.id)}
                        className={`h-9 px-3.5 rounded-[12px] ty-caption font-semibold cursor-pointer transition ${
                          isPicked
                            ? "bg-[var(--color-accent)] text-[var(--color-on-accent)]"
                            : "bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)]"
                        }`}
                      >
                        {t.labelTh}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <StandardInput
                  label="เบอร์โทรศัพท์ติดต่อ"
                  placeholder="08X-XXX-XXXX"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                />
                <StandardInput
                  label="LINE OA / LINE ID"
                  placeholder="@yourresort"
                  value={contactLine}
                  onChange={(e) => setContactLine(e.target.value)}
                />
                <StandardInput
                  label="พร้อมเพย์รับเงินโอนตรง"
                  placeholder="เบอร์โทร หรือ เลขบัญชี"
                  value={promptPayId}
                  onChange={(e) => setPromptPayId(e.target.value)}
                />
              </div>

              <StandardInput
                label="ลิงก์ Facebook Page ของที่พัก (เพื่อเตรียมซิงก์รูปอัตโนมัติ)"
                placeholder="https://facebook.com/yourresort"
                value={facebookPageUrl}
                onChange={(e) => setFacebookPageUrl(e.target.value)}
              />

              <div className="pt-2">
                <StandardButton
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  disabled={isSubmitting || slugAvailable === false}
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : null}
                  <span>
                    {isSubmitting
                      ? "กำลังสร้างเพจที่พัก..."
                      : "เปิดเพจที่พัก & ระบบจองฟรี 0% GP ทันที"}
                  </span>
                </StandardButton>
              </div>
            </form>
          )}
      </div>
    </div>
  );
}
