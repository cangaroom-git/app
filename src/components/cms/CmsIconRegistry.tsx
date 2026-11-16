"use client";

import React from "react";
import {
  Bath,
  Coffee,
  Compass,
  Flame,
  Gift,
  Heart,
  LucideIcon,
  MapPin,
  Mountain,
  QrCode,
  ShieldCheck,
  Sparkles,
  Star,
  Sun,
  Trees,
  Utensils,
  Wifi,
} from "lucide-react";
import { CmsIconKey } from "@/data/cmsDefaults";

export const CMS_ICON_OPTIONS: {
  key: CmsIconKey;
  labelTh: string;
  Icon: LucideIcon;
}[] = [
  { key: "mountain", labelTh: "ภูเขา", Icon: Mountain },
  { key: "bath", labelTh: "อ่างน้ำ", Icon: Bath },
  { key: "coffee", labelTh: "กาแฟ", Icon: Coffee },
  { key: "trees", labelTh: "ป่าไม้", Icon: Trees },
  { key: "utensils", labelTh: "อาหาร", Icon: Utensils },
  { key: "compass", labelTh: "ทำเล", Icon: Compass },
  { key: "star", labelTh: "ดาวเด่น", Icon: Star },
  { key: "sparkles", labelTh: "ไฮไลท์", Icon: Sparkles },
  { key: "qrcode", labelTh: "สแกน QR", Icon: QrCode },
  { key: "shield", labelTh: "มั่นใจ", Icon: ShieldCheck },
  { key: "wifi", labelTh: "Wi-Fi", Icon: Wifi },
  { key: "flame", labelTh: "แคมป์/ปิ้งย่าง", Icon: Flame },
  { key: "sun", labelTh: "แสงเช้า", Icon: Sun },
  { key: "mappin", labelTh: "หมุดพิกัด", Icon: MapPin },
  { key: "gift", labelTh: "สิทธิพิเศษ", Icon: Gift },
  { key: "heart", labelTh: "ประทับใจ", Icon: Heart },
];

const ICON_MAP: Record<CmsIconKey, LucideIcon> = CMS_ICON_OPTIONS.reduce(
  (acc, item) => {
    acc[item.key] = item.Icon;
    return acc;
  },
  {} as Record<CmsIconKey, LucideIcon>
);

export function CmsDynamicIcon({
  iconKey,
  className = "w-5 h-5",
}: {
  iconKey: CmsIconKey;
  className?: string;
}) {
  const IconComponent = ICON_MAP[iconKey] || Sparkles;
  return <IconComponent className={className} />;
}

export function CmsIconPicker({
  value,
  onChange,
}: {
  value: CmsIconKey;
  onChange: (nextKey: CmsIconKey) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {CMS_ICON_OPTIONS.map((option) => {
        const isSelected = option.key === value;
        const IconComp = option.Icon;
        return (
          <button
            key={option.key}
            type="button"
            onClick={() => onChange(option.key)}
            title={option.labelTh}
            aria-label={option.labelTh}
            className={`h-9 w-9 rounded-full inline-flex items-center justify-center transition cursor-pointer ${
              isSelected
                ? "bg-[var(--color-accent)] text-[var(--color-on-accent)]"
                : "bg-[var(--color-background-muted)] text-[var(--color-text-secondary)] hover:bg-[var(--color-background-subtle)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            <IconComp className="w-4 h-4" />
          </button>
        );
      })}
    </div>
  );
}

