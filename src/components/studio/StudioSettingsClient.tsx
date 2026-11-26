"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Check,
  ExternalLink,
  Globe,
  Landmark,
  Loader2,
  Receipt,
  Store,
} from "lucide-react";
import { ResponsiveSelect } from "@/components/ui/ResponsiveSelect";
import {
  StandardFieldGroup,
  StandardInput,
  StandardTextarea,
} from "@/components/ui/standards";
import { WorkspaceSplitLayout } from "@/components/workspace/WorkspaceSplitLayout";
import { PLACE_CATEGORIES } from "@/lib/placeCategories";
import { THAILAND_77_PROVINCES } from "@/data/thailandProvinces";
import type { StudioPayload } from "@/components/studio/studioTypes";

type SettingsSection = "profile" | "payouts" | "tax" | "seo";

const SIDEBAR_ITEMS: Array<{
  key: SettingsSection;
  icon: typeof Store;
  label: string;
  description: string;
}> = [
  {
    key: "profile",
    icon: Store,
    label: "ข้อมูลร้าน & ช่องทางติดต่อ",
    description: "ชื่อธุรกิจ หมวดหมู่ โหมดการทำงาน และลิงก์ติดต่อ",
  },
  {
    key: "payouts",
    icon: Landmark,
    label: "ช่องทางรับเงิน & PromptPay",
    description: "PromptPay QR และบัญชีธนาคารรับโอนตรง 0% GP",
  },
  {
    key: "tax",
    icon: Receipt,
    label: "ใบกำกับภาษี (Tax & VAT)",
    description: "ข้อมูลนิติบุคคลและเลขผู้เสียภาษี 13 หลัก",
  },
  {
    key: "seo",
    icon: Globe,
    label: "SEO & การมองเห็น",
    description: "การเผยแพร่หน้าร้านและตัวอย่างบน Google",
  },
];

function AirbnbSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
        checked
          ? "bg-[var(--color-accent)]"
          : "bg-[var(--color-background-subtle)]"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

interface StudioSettingsClientProps {
  data: StudioPayload;
  buildHref: (path: string) => string;
  onReload: () => Promise<void>;
  onNotify: (msg: string) => void;
}

/**
 * Unified Airbnb Warm-Minimal 2-Column Merchant Settings (`/studio/settings`)
 * - 1:1 visual sibling of `/account` and `/admin/systems` (`public/airbnb-account-setting` layout)
 * - Pure white canvas, borderless left nav, hairline `divide-y` right rows, Airbnb Inset-Label inputs
 */
export function StudioSettingsClient({
  data,
  buildHref,
  onReload,
  onNotify,
}: StudioSettingsClientProps) {
  const { hotel, merchantSettings } = data;
  const [activeView, setActiveView] = useState<SettingsSection>("profile");
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");
  const [isSaving, setIsSaving] = useState(false);

  // Profile & Contact
  const [nameTh, setNameTh] = useState(hotel.nameTh || "");
  const [nameEn, setNameEn] = useState(hotel.nameEn || "");
  const [taglineTh, setTaglineTh] = useState(hotel.taglineTh || "");
  const [placeCategory, setPlaceCategory] = useState(hotel.placeCategory);
  const [merchantMode, setMerchantMode] = useState(hotel.merchantMode);
  const [locationScope, setLocationScope] = useState(
    hotel.locationScope || "SINGLE_LOCATION",
  );
  const [provinceId, setProvinceId] = useState(hotel.provinceId || "bangkok");
  const [branchSummaryTh, setBranchSummaryTh] = useState(
    hotel.branchSummaryTh || "",
  );
  const [contactPhone, setContactPhone] = useState(hotel.contactPhone || "");
  const [contactLine, setContactLine] = useState(hotel.contactLine || "");
  const [externalWebsiteUrl, setExternalWebsiteUrl] = useState(
    hotel.externalWebsiteUrl || "",
  );

  // Payouts & PromptPay
  const [promptPayId, setPromptPayId] = useState(hotel.promptPayId || "");
  const [promptPayAccountName, setPromptPayAccountName] = useState(
    hotel.promptPayAccountName || "",
  );
  const [bankName, setBankName] = useState(hotel.bankName || "");
  const [bankAccountNo, setBankAccountNo] = useState(hotel.bankAccountNo || "");

  // Tax & VAT
  const [taxInvoiceEnabled, setTaxInvoiceEnabled] = useState(
    merchantSettings?.taxInvoiceEnabled ?? false,
  );
  const [taxLegalName, setTaxLegalName] = useState(
    merchantSettings?.taxLegalName ?? "",
  );
  const [taxId, setTaxId] = useState(merchantSettings?.taxId ?? "");
  const [taxBranchCode, setTaxBranchCode] = useState(
    merchantSettings?.taxBranchCode ?? "00000",
  );
  const [taxAddress, setTaxAddress] = useState(
    merchantSettings?.taxAddress ?? "",
  );

  // SEO & Visibility
  const [isPublished, setIsPublished] = useState(hotel.isPublished);
  const [allowSearchIndexing, setAllowSearchIndexing] = useState(
    merchantSettings?.allowSearchIndexing ?? true,
  );
  const [seoMetaTitle, setSeoMetaTitle] = useState(
    merchantSettings?.seoMetaTitle ?? "",
  );
  const [seoMetaDescription, setSeoMetaDescription] = useState(
    merchantSettings?.seoMetaDescription ?? "",
  );

  const saveSection = async (payload: Record<string, unknown>, msg: string) => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/studio/hotel", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotelSlug: hotel.slug,
          ...payload,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        onNotify(json.error || "บันทึกข้อมูลไม่สำเร็จ");
        return;
      }
      onNotify(msg);
      await onReload();
    } finally {
      setIsSaving(false);
    }
  };

  const renderSectionContent = () => {
    if (activeView === "profile") {
      return (
        <div className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="ws-title">ข้อมูลร้าน &amp; ช่องทางติดต่อ</h2>
              <p className="ws-caption mt-1">
                ปรับชื่อร้าน หมวดหมู่ โหมดการทำงาน และช่องทางติดต่อบนหน้า /{hotel.slug}
              </p>
            </div>
            <button
              type="button"
              disabled={isSaving}
              onClick={() =>
                void saveSection(
                  {
                    nameTh,
                    nameEn,
                    taglineTh,
                    placeCategory,
                    merchantMode,
                    locationScope,
                    provinceId,
                    branchSummaryTh,
                    contactPhone,
                    contactLine,
                    externalWebsiteUrl,
                  },
                  "บันทึกข้อมูลร้านเรียบร้อยแล้ว",
                )
              }
              className="h-10 px-5 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] text-[14px] font-semibold inline-flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-colors"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>บันทึก</span>
            </button>
          </div>

          <div className="divide-y divide-[var(--color-border)]">
            <div className="ws-row first:pt-2 space-y-3">
              <div>
                <p className="ws-subtitle">ชื่อธุรกิจและคำโปรย</p>
                <p className="ws-caption mt-0.5">
                  แสดงบนการ์ดโปรโมชั่นและหน้าโปรไฟล์สาธารณะ
                </p>
              </div>
              <StandardFieldGroup>
                <div className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x divide-y sm:divide-y-0 divide-[#b0b0b0]">
                  <StandardInput
                    grouped
                    label="ชื่อภาษาไทย *"
                    value={nameTh}
                    onChange={(e) => setNameTh(e.target.value)}
                  />
                  <StandardInput
                    grouped
                    label="ชื่อภาษาอังกฤษ (ไม่บังคับ)"
                    value={nameEn}
                    onChange={(e) => setNameEn(e.target.value)}
                  />
                </div>
                <StandardInput
                  grouped
                  label="คำโปรยสั้นๆ"
                  value={taglineTh}
                  onChange={(e) => setTaglineTh(e.target.value)}
                  placeholder="เช่น คาเฟ่วิวภูเขา หรือพูลวิลล่าส่วนตัวใจกลางหัวหิน"
                />
              </StandardFieldGroup>
            </div>

            <div className="ws-row space-y-3">
              <div>
                <p className="ws-subtitle">หมวดหมู่และโหมดการทำงาน</p>
                <p className="ws-caption mt-0.5">
                  เลือกโหมดจองตรง 0% GP สำหรับที่พัก หรือโปรไฟล์ &amp; โปรโมชั่นสำหรับร้านค้า/แบรนด์
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ResponsiveSelect
                  value={placeCategory}
                  onChange={(v) => setPlaceCategory(v as typeof placeCategory)}
                  sheetTitle="เลือกหมวดหมู่ธุรกิจ"
                  triggerClassName="w-full h-12 px-4 rounded-[12px] bg-[var(--color-background-card)] border border-[#b0b0b0] ws-body-medium"
                  options={PLACE_CATEGORIES.map((c) => ({
                    value: c.id,
                    label: c.labelTh,
                  }))}
                />
                <ResponsiveSelect
                  value={merchantMode}
                  onChange={(v) =>
                    setMerchantMode(v as "DIRECT_BOOKING" | "PROFILE_ONLY")
                  }
                  sheetTitle="เลือกโหมดหลังบ้าน"
                  triggerClassName="w-full h-12 px-4 rounded-[12px] bg-[var(--color-background-card)] border border-[#b0b0b0] ws-body-medium"
                  options={[
                    {
                      value: "DIRECT_BOOKING",
                      label: "จองตรง 0% GP (มีห้องพัก & ปฏิทิน)",
                    },
                    {
                      value: "PROFILE_ONLY",
                      label: "โปรไฟล์ & โปรโมชั่น (ร้านค้า / แบรนด์)",
                    },
                  ]}
                />
                <ResponsiveSelect
                  value={locationScope}
                  onChange={(v) =>
                    setLocationScope(
                      v as
                        | "SINGLE_LOCATION"
                        | "MULTI_BRANCH"
                        | "NATIONWIDE_ONLINE",
                    )
                  }
                  sheetTitle="ขอบเขตพื้นที่ให้บริการ"
                  triggerClassName="w-full h-12 px-4 rounded-[12px] bg-[var(--color-background-card)] border border-[#b0b0b0] ws-body-medium"
                  options={[
                    { value: "SINGLE_LOCATION", label: "ร้านเดี่ยว / 1 สาขา" },
                    { value: "MULTI_BRANCH", label: "หลายสาขา (Multi-Branch)" },
                    { value: "NATIONWIDE_ONLINE", label: "ทั่วประเทศ / ออนไลน์" },
                  ]}
                />
                <ResponsiveSelect
                  value={provinceId}
                  onChange={setProvinceId}
                  sheetTitle="เลือกจังหวัดหลัก"
                  triggerClassName="w-full h-12 px-4 rounded-[12px] bg-[var(--color-background-card)] border border-[#b0b0b0] ws-body-medium"
                  options={[
                    { value: "nationwide", label: "ทั่วประเทศ / ออนไลน์" },
                    ...THAILAND_77_PROVINCES.map((p) => ({
                      value: p.id,
                      label: p.nameTh,
                    })),
                  ]}
                />
              </div>
              {locationScope !== "SINGLE_LOCATION" && (
                <StandardInput
                  label="สรุปจำนวนสาขา"
                  value={branchSummaryTh}
                  onChange={(e) => setBranchSummaryTh(e.target.value)}
                  placeholder="เช่น กว่า 15 สาขาในกรุงเทพฯ และเชียงใหม่"
                />
              )}
            </div>

            <div className="ws-row space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="ws-subtitle">ช่องทางติดต่อ &amp; เว็บไซต์</p>
                  <p className="ws-caption mt-0.5">
                    แสดงเป็นปุ่มทักตรงบนหน้าร้าน /{hotel.slug}
                  </p>
                </div>
                <Link
                  href={buildHref("/studio/listings/location")}
                  className="ws-body-strong !text-[var(--color-accent)] hover:underline inline-flex items-center gap-1 shrink-0"
                >
                  <span>แก้ไขพิกัดแผนที่</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
              <StandardFieldGroup>
                <div className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x divide-y sm:divide-y-0 divide-[#b0b0b0]">
                  <StandardInput
                    grouped
                    label="เบอร์โทรศัพท์ร้าน"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="08x-xxx-xxxx"
                  />
                  <StandardInput
                    grouped
                    label="LINE OA"
                    value={contactLine}
                    onChange={(e) => setContactLine(e.target.value)}
                    placeholder="@myhotel"
                  />
                </div>
                <StandardInput
                  grouped
                  type="url"
                  label="เว็บไซต์ / ลิงก์จองภายนอก"
                  value={externalWebsiteUrl}
                  onChange={(e) => setExternalWebsiteUrl(e.target.value)}
                  placeholder="https://..."
                />
              </StandardFieldGroup>
            </div>
          </div>
        </div>
      );
    }

    if (activeView === "payouts") {
      return (
        <div className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="ws-title">ช่องทางรับเงิน &amp; PromptPay (0% GP)</h2>
              <p className="ws-caption mt-1">
                ลูกค้าโอนเข้าบัญชีของคุณโดยตรง 100% ไม่ผ่านตัวกลางและไม่หักค่าคอมมิชชั่น
              </p>
            </div>
            <button
              type="button"
              disabled={isSaving}
              onClick={() =>
                void saveSection(
                  {
                    promptPayId,
                    promptPayAccountName,
                    bankName,
                    bankAccountNo,
                  },
                  "บันทึกช่องทางรับเงินเรียบร้อยแล้ว",
                )
              }
              className="h-10 px-5 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] text-[14px] font-semibold inline-flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-colors"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>บันทึก</span>
            </button>
          </div>

          <div className="divide-y divide-[var(--color-border)]">
            <div className="ws-row first:pt-2 space-y-3">
              <div>
                <p className="ws-subtitle">พร้อมเพย์ (PromptPay QR)</p>
                <p className="ws-caption mt-0.5">
                  สร้าง QR Code อัตโนมัติพร้อมยอดเงินสุทธิในหน้าชำระเงิน
                </p>
              </div>
              <StandardFieldGroup>
                <div className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x divide-y sm:divide-y-0 divide-[#b0b0b0]">
                  <StandardInput
                    grouped
                    label="เบอร์พร้อมเพย์ / เลขผู้เสียภาษี"
                    value={promptPayId}
                    onChange={(e) => setPromptPayId(e.target.value)}
                    placeholder="08x-xxx-xxxx"
                  />
                  <StandardInput
                    grouped
                    label="ชื่อบัญชีพร้อมเพย์"
                    value={promptPayAccountName}
                    onChange={(e) => setPromptPayAccountName(e.target.value)}
                    placeholder="บจก. นอนดี รีสอร์ท"
                  />
                </div>
              </StandardFieldGroup>
            </div>

            <div className="ws-row space-y-3">
              <div>
                <p className="ws-subtitle">บัญชีธนาคารสำรอง</p>
                <p className="ws-caption mt-0.5">
                  แสดงให้ลูกค้าคัดลอกเลขบัญชีไปโอนผ่านแอปธนาคารได้สะดวก
                </p>
              </div>
              <StandardFieldGroup>
                <div className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x divide-y sm:divide-y-0 divide-[#b0b0b0]">
                  <StandardInput
                    grouped
                    label="ชื่อธนาคาร"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="เช่น กสิกรไทย (KBANK)"
                  />
                  <StandardInput
                    grouped
                    label="เลขที่บัญชี"
                    value={bankAccountNo}
                    onChange={(e) => setBankAccountNo(e.target.value)}
                    placeholder="123-4-56789-0"
                  />
                </div>
              </StandardFieldGroup>
            </div>
          </div>
        </div>
      );
    }

    if (activeView === "tax") {
      return (
        <div className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="ws-title">ใบกำกับภาษี (Tax &amp; VAT)</h2>
              <p className="ws-caption mt-1">
                ข้อมูลผู้ประกอบการสำหรับออกใบกำกับภาษีหรือใบเสร็จรับเงินให้ผู้เข้าพัก
              </p>
            </div>
            <button
              type="button"
              disabled={isSaving}
              onClick={() =>
                void saveSection(
                  {
                    merchantSettings: {
                      taxInvoiceEnabled,
                      taxLegalName,
                      taxId,
                      taxBranchCode,
                      taxAddress,
                    },
                  },
                  "บันทึกข้อมูลใบกำกับภาษีแล้ว",
                )
              }
              className="h-10 px-5 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] text-[14px] font-semibold inline-flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-colors"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>บันทึก</span>
            </button>
          </div>

          <div className="divide-y divide-[var(--color-border)]">
            <div className="ws-row first:pt-2 flex items-center justify-between gap-4">
              <div>
                <p className="ws-subtitle">รองรับการออกใบกำกับภาษีเต็มรูปแบบ</p>
                <p className="ws-caption mt-0.5">
                  แสดงแจ้งลูกค้าว่าสามารถขอใบกำกับภาษีจากที่พัก/ร้านค้านี้ได้
                </p>
              </div>
              <AirbnbSwitch
                label="รองรับใบกำกับภาษี"
                checked={taxInvoiceEnabled}
                onChange={setTaxInvoiceEnabled}
              />
            </div>

            <div className="ws-row space-y-3">
              <p className="ws-subtitle">ข้อมูลนิติบุคคล / ผู้เสียภาษี</p>
              <StandardFieldGroup>
                <StandardInput
                  grouped
                  label="ชื่อบริษัท / ห้างหุ้นส่วน / บุคคลธรรมดา"
                  value={taxLegalName}
                  onChange={(e) => setTaxLegalName(e.target.value)}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x divide-y sm:divide-y-0 divide-[#b0b0b0]">
                  <StandardInput
                    grouped
                    label="เลขประจำตัวผู้เสียภาษี 13 หลัก"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                  />
                  <StandardInput
                    grouped
                    label="รหัสสาขา (00000 = สำนักงานใหญ่)"
                    value={taxBranchCode}
                    onChange={(e) => setTaxBranchCode(e.target.value)}
                  />
                </div>
              </StandardFieldGroup>
              <StandardTextarea
                rows={3}
                label="ที่อยู่ตามทะเบียนภาษี"
                value={taxAddress}
                onChange={(e) => setTaxAddress(e.target.value)}
              />
            </div>
          </div>
        </div>
      );
    }

    // SEO & Visibility
    const previewTitle =
      seoMetaTitle.trim() || `${hotel.nameTh} — โปรโมชั่น & จองตรงบน Nondii`;
    const previewDesc =
      seoMetaDescription.trim() ||
      hotel.taglineTh ||
      `ดูโปรโมชั่นล่าสุด รีวิว และข้อมูลของ ${hotel.nameTh} บน Nondii`;

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="ws-title">SEO &amp; การมองเห็นหน้าร้าน</h2>
            <p className="ws-caption mt-1">
              ควบคุมการเผยแพร่และหน้าตาของ nondii.com/{hotel.slug} บน Google Search
            </p>
          </div>
          <button
            type="button"
            disabled={isSaving}
            onClick={() =>
              void saveSection(
                {
                  isPublished,
                  merchantSettings: {
                    allowSearchIndexing,
                    seoMetaTitle,
                    seoMetaDescription,
                  },
                },
                "บันทึกการตั้งค่า SEO แล้ว",
              )
            }
            className="h-10 px-5 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] text-[14px] font-semibold inline-flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-colors"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            <span>บันทึก</span>
          </button>
        </div>

        <div className="divide-y divide-[var(--color-border)]">
          <div className="ws-row first:pt-2 flex items-center justify-between gap-4">
            <div>
              <p className="ws-subtitle">เผยแพร่หน้าร้านสาธารณะ</p>
              <p className="ws-caption mt-0.5">
                แสดงหน้า /{hotel.slug} บนแผนที่และฟีดค้นหาของ Nondii
              </p>
            </div>
            <AirbnbSwitch
              label="เผยแพร่หน้าร้าน"
              checked={isPublished}
              onChange={setIsPublished}
            />
          </div>

          <div className="ws-row flex items-center justify-between gap-4">
            <div>
              <p className="ws-subtitle">
                อนุญาตให้ Google จัดเก็บดัชนี (Search Engine Indexing)
              </p>
              <p className="ws-caption mt-0.5">
                ให้หน้าธุรกิจของคุณแสดงในผลการค้นหา Google
              </p>
            </div>
            <AirbnbSwitch
              label="Search Engine Indexing"
              checked={allowSearchIndexing}
              onChange={setAllowSearchIndexing}
            />
          </div>

          <div className="ws-row space-y-4">
            <div>
              <p className="ws-subtitle">ตัวอย่างบน Google Search</p>
              <p className="ws-caption mt-0.5">
                กำหนดชื่อหัวข้อและคำอธิบายเฉพาะร้านของคุณ
              </p>
            </div>

            <div className="rounded-[18px] bg-[var(--color-background-muted)] p-4 space-y-1">
              <p className="ws-badge font-normal text-[var(--color-text-secondary)]">
                https://nondii.com/{hotel.slug}
              </p>
              <p className="text-[16px] font-medium text-[#1a0dab] truncate">
                {previewTitle}
              </p>
              <p className="ws-caption line-clamp-2">{previewDesc}</p>
            </div>

            <div className="space-y-3">
              <StandardInput
                label="Meta Title"
                value={seoMetaTitle}
                onChange={(e) => setSeoMetaTitle(e.target.value)}
                placeholder={`${hotel.nameTh} — โปรโมชั่นบน Nondii`}
              />
              <StandardTextarea
                rows={3}
                label="Meta Description"
                value={seoMetaDescription}
                onChange={(e) => setSeoMetaDescription(e.target.value)}
                placeholder="คำอธิบายสั้นๆ ที่ชวนให้คนคลิกเข้ามาดูโปรโมชั่น..."
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const activeMeta = SIDEBAR_ITEMS.find((i) => i.key === activeView);

  return (
    <WorkspaceSplitLayout
      title="ตั้งค่าร้านค้า"
      subtitle={`${hotel.nameTh} · /${hotel.slug}`}
      activeId={activeView}
      onSelect={(id) => {
        setActiveView(id as SettingsSection);
        setMobileView("detail");
      }}
      mobileView={mobileView}
      onMobileBack={() => setMobileView("list")}
      mobileDetailTitle={activeMeta?.label}
      contentWidth="narrow"
      navGroups={[
        {
          items: SIDEBAR_ITEMS.map((item) => ({
            id: item.key,
            label: item.label,
            description: item.description,
            icon: item.icon,
          })),
        },
      ]}
    >
      {renderSectionContent()}
    </WorkspaceSplitLayout>
  );
}
