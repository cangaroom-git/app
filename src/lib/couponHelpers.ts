import { formatShortDate, type LanguageCode } from "@/lib/dateFormatters";
import type { DiscountTypeDto } from "@/types/cangaroom";

export function formatCouponDiscountHeadline(
  coupon: {
    discountType: DiscountTypeDto;
    discountValue: number;
  },
  language: LanguageCode
): string {
  if (coupon.discountType === "PERCENT") {
    return language === "th"
      ? `ลด ${coupon.discountValue}%`
      : `${coupon.discountValue}% OFF`;
  }
  return language === "th"
    ? `ลด ฿${coupon.discountValue.toLocaleString()}`
    : `฿${coupon.discountValue.toLocaleString()} OFF`;
}

export interface CouponQuotaInfo {
  hasQuota: boolean;
  remaining: number | null;
  total: number | null;
  usedRatio: number;
  isSoldOut: boolean;
  isLowQuota: boolean;
  label: string;
}

export function getCouponQuotaInfo(
  totalQuota: number | null | undefined,
  claimedCount: number,
  language: LanguageCode
): CouponQuotaInfo {
  if (typeof totalQuota !== "number" || totalQuota <= 0) {
    return {
      hasQuota: false,
      remaining: null,
      total: null,
      usedRatio: 0,
      isSoldOut: false,
      isLowQuota: false,
      label: language === "th" ? "ไม่จำกัดสิทธิ์" : "Unlimited uses",
    };
  }

  const safeClaimed = Math.max(0, Math.min(totalQuota, claimedCount));
  const remaining = Math.max(0, totalQuota - safeClaimed);
  const usedRatio = Math.min(1, safeClaimed / totalQuota);
  const lowThreshold = Math.max(5, Math.ceil(totalQuota * 0.25));

  return {
    hasQuota: true,
    remaining,
    total: totalQuota,
    usedRatio,
    isSoldOut: remaining <= 0,
    isLowQuota: remaining > 0 && remaining <= lowThreshold,
    label:
      remaining <= 0
        ? language === "th"
          ? "สิทธิ์เต็มแล้ว"
          : "Fully claimed"
        : language === "th"
        ? `เหลือ ${remaining.toLocaleString()}/${totalQuota.toLocaleString()} สิทธิ์`
        : `${remaining.toLocaleString()}/${totalQuota.toLocaleString()} left`,
  };
}

export interface CouponTimeInfo {
  isExpired: boolean;
  isTimeLimited: boolean;
  label: string;
}

export function getCouponTimeInfo(
  expiresAtIso: string,
  language: LanguageCode,
  nowMs: number = Date.now()
): CouponTimeInfo {
  const expiresMs = new Date(expiresAtIso).getTime();
  if (!Number.isFinite(expiresMs)) {
    return {
      isExpired: false,
      isTimeLimited: false,
      label: "",
    };
  }

  const diffMs = expiresMs - nowMs;
  if (diffMs <= 0) {
    return {
      isExpired: true,
      isTimeLimited: true,
      label: language === "th" ? "หมดอายุแล้ว" : "Expired",
    };
  }

  const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (totalHours < 24) {
    const mins = Math.max(1, Math.floor((diffMs % (1000 * 60 * 60)) / 60000));
    return {
      isExpired: false,
      isTimeLimited: true,
      label:
        language === "th"
          ? `เหลือ ${totalHours} ชม. ${mins} นาที`
          : `${totalHours}h ${mins}m left`,
    };
  }

  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (days <= 30) {
    return {
      isExpired: false,
      isTimeLimited: true,
      label: language === "th" ? `เหลือ ${days} วัน` : `${days} days left`,
    };
  }

  return {
    isExpired: false,
    isTimeLimited: false,
    label:
      language === "th"
        ? `ใช้ได้ถึง ${formatShortDate(expiresAtIso, language)}`
        : `Valid until ${formatShortDate(expiresAtIso, language)}`,
  };
}
