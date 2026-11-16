"use client";

import React, { useState } from "react";
import {
  ArrowRight,
  Calendar,
  Check,
  Copy,
  Gift,
  Percent,
  ShoppingBag,
  Tag,
  Utensils,
} from "lucide-react";
import { pickLocalizedText } from "@/data/cmsDefaults";
import { formatShortDate, useHotelApp } from "@/components/HotelAppShell";
import { EditSpotButton } from "@/components/cms/AdminEditOverlay";
import { StandardButton, StatusPill } from "@/components/ui/standards";

const FALLBACK_COUPON_IMAGES = [
  "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=900&q=80",
];

export default function DealPage() {
  const {
    coupons,
    addons,
    seasonalRates,
    lang: language,
    checkIn,
    checkOut,
    nights: stayNights,
    guests: guestCount,
    savedCouponCodes,
    openCouponWallet,
    saveCouponToWallet,
    claimAndApplyCoupon,
    appliedCouponCode,
    selectedAddons,
    toggleAddon,
    navigateToTab,
    cms,
    canShowEditControls,
    openCmsEditor,
  } = useHotelApp();

  const dealCms = cms.dealPage;

  const [copiedCouponCode, setCopiedCouponCode] = useState<string | null>(null);
  const [recentBagFeedback, setRecentBagFeedback] = useState<string | null>(
    null
  );

  const visibleCoupons = canShowEditControls
    ? coupons
    : coupons.filter((coupon) => coupon.isActive);
  const visibleDiningAddons = canShowEditControls
    ? addons
    : addons.filter((addon) => addon.isActive);

  const savedCodesUpperSet = new Set(
    savedCouponCodes.map((code) => code.toUpperCase())
  );

  const handleCopyCouponCode = (
    event: React.MouseEvent,
    couponCode: string
  ) => {
    event.stopPropagation();
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(couponCode);
    }
    const result = saveCouponToWallet(couponCode);
    setRecentBagFeedback(result.message);
    setCopiedCouponCode(couponCode);
    setTimeout(() => setCopiedCouponCode(null), 1800);
    setTimeout(() => setRecentBagFeedback(null), 2600);
  };

  const handleCouponActionClick = (
    couponCode: string,
    isSavedInBag: boolean
  ) => {
    if (!isSavedInBag) {
      const result = saveCouponToWallet(couponCode);
      setRecentBagFeedback(result.message);
      setTimeout(() => setRecentBagFeedback(null), 2600);
      return;
    }

    claimAndApplyCoupon(couponCode);
    navigateToTab("book");
  };

  return (
    <>
      {/* 1. Direct Booking Coupons (#c53829 Promo Standard) */}
      <section id="offers" className="space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="ty-title flex items-center gap-2 truncate">
                <Tag className="w-5 h-5 text-[var(--color-promo-text)] shrink-0" />
                <span className="truncate">
                  {pickLocalizedText(
                    language,
                    dealCms.couponsTitleTh,
                    dealCms.couponsTitleEn
                  )}{" "}
                  ({visibleCoupons.length})
                </span>
              </h1>
              {appliedCouponCode && (
                <StatusPill variant="promo">
                  <Check className="w-3.5 h-3.5" />
                  <span>
                    {language === "th"
                      ? `กำลังใช้: ${appliedCouponCode}`
                      : `Active: ${appliedCouponCode}`}
                  </span>
                </StatusPill>
              )}
            </div>
            <p className="ty-caption truncate mt-0.5">
              {recentBagFeedback ? (
                <span className="font-semibold text-[var(--color-promo-text)]">
                  ✓ {recentBagFeedback}
                </span>
              ) : language === "th" ? (
                `เข้าพัก ${formatShortDate(
                  checkIn,
                  language
                )} – ${formatShortDate(checkOut, language)} (${stayNights} คืน · ${guestCount} ท่าน)`
              ) : (
                `Stay ${formatShortDate(
                  checkIn,
                  language
                )} – ${formatShortDate(checkOut, language)} (${stayNights}N · ${guestCount} guests)`
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {canShowEditControls && (
              <>
                <EditSpotButton
                  label="แก้หัวข้อหน้า"
                  onClick={() => openCmsEditor({ type: "deal-addons-header" })}
                />
                <EditSpotButton
                  icon="add"
                  variant="promo"
                  label="สร้างคูปองใหม่"
                  onClick={() => openCmsEditor({ type: "coupon" })}
                />
              </>
            )}

            <StandardButton
              variant="promo"
              size="md"
              onClick={openCouponWallet}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>
                {language === "th"
                  ? `กระเป๋าคูปอง (${savedCouponCodes.length})`
                  : `Coupon Bag (${savedCouponCodes.length})`}
              </span>
            </StandardButton>

            <button
              type="button"
              onClick={() => navigateToTab("book")}
              className="hidden sm:inline-flex btn-fw-secondary shrink-0 cursor-pointer"
            >
              <span>
                {language === "th" ? "เลือกห้องพัก →" : "Browse Rooms →"}
              </span>
            </button>
          </div>
        </header>

        <div className="w-full min-w-0 flex gap-3.5 overflow-x-auto overflow-y-hidden lg:overflow-visible overscroll-x-contain touch-manipulation no-scrollbar snap-x snap-proximity lg:snap-none lg:grid lg:grid-cols-3 xl:grid-cols-4 sm:gap-4">
          {visibleCoupons.map((couponItem, couponIndex) => {
            const isApplied = appliedCouponCode === couponItem.code;
            const isSavedInBag = savedCodesUpperSet.has(
              couponItem.code.toUpperCase()
            );
            const isCopied = copiedCouponCode === couponItem.code;

            return (
              <article
                key={couponItem.id}
                onClick={() =>
                  handleCouponActionClick(couponItem.code, isSavedInBag)
                }
                className={`group snap-start shrink-0 w-[268px] sm:w-[292px] lg:w-auto app-card overflow-hidden flex flex-col justify-between cursor-pointer transition ${
                  !couponItem.isActive ? "opacity-60" : ""
                } ${
                  isApplied ? "ring-2 ring-[var(--color-promo)]" : ""
                }`}
              >
                <div className="relative h-36 w-full overflow-hidden bg-[var(--color-background-subtle)]">
                  <img
                    src={
                      couponItem.imageUrl ||
                      FALLBACK_COUPON_IMAGES[
                        couponIndex % FALLBACK_COUPON_IMAGES.length
                      ]
                    }
                    alt={pickLocalizedText(
                      language,
                      couponItem.titleTh,
                      couponItem.titleEn
                    )}
                    draggable={false}
                    className="w-full h-full object-cover select-none pointer-events-none"
                  />

                  {canShowEditControls && (
                    <div className="absolute top-2.5 left-2.5 z-20">
                      <EditSpotButton
                        variant="promo"
                        onClick={() =>
                          openCmsEditor({
                            type: "coupon",
                            couponId: couponItem.id,
                          })
                        }
                      />
                    </div>
                  )}

                  {isSavedInBag && (
                    <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 rounded-full bg-black/65 backdrop-blur-md text-white px-2.5 py-0.5 ty-caption font-semibold">
                      <ShoppingBag className="w-3 h-3" />
                      <span>{language === "th" ? "ในกระเป๋า" : "In Bag"}</span>
                    </span>
                  )}
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="badge-promo">
                        {couponItem.discountType === "PERCENT"
                          ? language === "th"
                            ? `ลด ${couponItem.discountValue}%`
                            : `${couponItem.discountValue}% OFF`
                          : language === "th"
                          ? `ลด ฿${couponItem.discountValue.toLocaleString()}`
                          : `฿${couponItem.discountValue.toLocaleString()} OFF`}
                      </span>

                      <button
                        type="button"
                        onClick={(event) =>
                          handleCopyCouponCode(event, couponItem.code)
                        }
                        className="shrink-0 inline-flex items-center gap-1 ty-caption font-mono font-bold text-[var(--color-promo-text)] hover:underline cursor-pointer"
                      >
                        <Copy className="w-3 h-3" />
                        <span>
                          {isCopied
                            ? language === "th"
                              ? "คัดลอกแล้ว"
                              : "Copied"
                            : couponItem.code}
                        </span>
                      </button>
                    </div>

                    <h3 className="ty-body font-bold text-[var(--color-text-primary)] line-clamp-2">
                      {pickLocalizedText(
                        language,
                        couponItem.titleTh,
                        couponItem.titleEn
                      )}
                    </h3>
                    <p className="ty-caption">
                      {language === "th"
                        ? `ยอดขั้นต่ำ ฿${couponItem.minSpendThb.toLocaleString()}`
                        : `Min. spend ฿${couponItem.minSpendThb.toLocaleString()}`}
                    </p>
                  </div>

                  <StandardButton
                    variant={isApplied ? "secondary" : "promo"}
                    size="md"
                    className={`w-full ${
                      isApplied
                        ? "!bg-[var(--color-success-muted)] !text-[var(--color-success)]"
                        : isSavedInBag
                        ? "!bg-[var(--color-promo-muted)] !text-[var(--color-promo-text)]"
                        : ""
                    }`}
                  >
                    {isApplied ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>
                          {language === "th"
                            ? `กำลังใช้ ${couponItem.code}`
                            : `${couponItem.code} Active`}
                        </span>
                      </>
                    ) : isSavedInBag ? (
                      <>
                        <span>
                          {language === "th"
                            ? `ใช้คูปอง ${couponItem.code}`
                            : `Use ${couponItem.code}`}
                        </span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="w-4 h-4" />
                        <span>
                          {language === "th"
                            ? "เก็บเข้ากระเป๋า"
                            : "Save to Bag"}
                        </span>
                      </>
                    )}
                  </StandardButton>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* 2. In-Villa Dining & Wellness Promotions (#c53829 Deals) */}
      <section id="dining-promotions" className="space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="ty-title flex items-center gap-2">
              <Utensils className="w-5 h-5 text-[var(--color-promo-text)] shrink-0" />
              <span>
                {pickLocalizedText(
                  language,
                  dealCms.addonsTitleTh,
                  dealCms.addonsTitleEn
                )}
              </span>
            </h2>
            <p className="ty-caption mt-0.5">
              {pickLocalizedText(
                language,
                dealCms.addonsSubtitleTh,
                dealCms.addonsSubtitleEn
              )}
            </p>
          </div>

          {canShowEditControls && (
            <EditSpotButton
              icon="add"
              variant="promo"
              label="เพิ่มแพ็กเกจหมูกระทะ/สปา"
              onClick={() => openCmsEditor({ type: "addon" })}
            />
          )}
        </header>

        <div className="w-full min-w-0 flex gap-3.5 overflow-x-auto overflow-y-hidden lg:overflow-visible overscroll-x-contain touch-manipulation no-scrollbar snap-x snap-proximity lg:snap-none lg:grid lg:grid-cols-3 xl:grid-cols-4 sm:gap-4">
          {visibleDiningAddons.map((addonPromo) => {
            const isSelectedForStay = selectedAddons.includes(addonPromo.id);
            const originalPriceThb =
              addonPromo.originalPriceThb &&
              addonPromo.originalPriceThb > addonPromo.priceThb
                ? addonPromo.originalPriceThb
                : Math.round(addonPromo.priceThb * 1.25);
            const discountPercent = Math.max(
              1,
              Math.round(
                ((originalPriceThb - addonPromo.priceThb) / originalPriceThb) *
                  100
              )
            );

            return (
              <article
                key={addonPromo.id}
                onClick={() => {
                  if (!isSelectedForStay) {
                    toggleAddon(addonPromo.id);
                  }
                  navigateToTab("book");
                }}
                className={`group snap-start shrink-0 w-[268px] sm:w-[292px] lg:w-auto rounded-[16px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)]/75 overflow-hidden flex flex-col justify-between cursor-pointer transition ${
                  !addonPromo.isActive ? "opacity-60" : ""
                }`}
              >
                <div className="relative h-36 w-full overflow-hidden bg-[var(--color-background-subtle)]">
                  <img
                    src={
                      addonPromo.imageUrl ||
                      "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80"
                    }
                    alt={pickLocalizedText(
                      language,
                      addonPromo.nameTh,
                      addonPromo.nameEn
                    )}
                    draggable={false}
                    className="h-full w-full object-cover select-none pointer-events-none"
                  />

                  {canShowEditControls && (
                    <div className="absolute top-2.5 left-2.5 z-20">
                      <EditSpotButton
                        variant="promo"
                        onClick={() =>
                          openCmsEditor({
                            type: "addon",
                            addonId: addonPromo.id,
                          })
                        }
                      />
                    </div>
                  )}
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="badge-promo">
                        {language === "th"
                          ? `ลด ${discountPercent}%`
                          : `-${discountPercent}%`}
                      </span>
                      <span className="ty-caption font-medium truncate">
                        {pickLocalizedText(
                          language,
                          addonPromo.unitTh,
                          addonPromo.unitEn
                        )}
                      </span>
                    </div>
                    <h3 className="ty-body font-bold text-[var(--color-text-primary)] line-clamp-1">
                      {pickLocalizedText(
                        language,
                        addonPromo.nameTh,
                        addonPromo.nameEn
                      )}
                    </h3>
                    <p className="ty-caption line-clamp-2">
                      {pickLocalizedText(
                        language,
                        addonPromo.descTh,
                        addonPromo.descEn
                      )}
                    </p>
                    <div className="pt-0.5 flex items-baseline gap-2">
                      <span className="ty-subtitle font-bold text-[var(--color-promo-text)]">
                        ฿{addonPromo.priceThb.toLocaleString()}
                      </span>
                      <span className="ty-caption line-through">
                        ฿{originalPriceThb.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <StandardButton
                    variant={isSelectedForStay ? "secondary" : "promo"}
                    size="md"
                    className={`w-full ${
                      isSelectedForStay
                        ? "!bg-[var(--color-success-muted)] !text-[var(--color-success)]"
                        : ""
                    }`}
                  >
                    {isSelectedForStay ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>
                          {language === "th" ? "รับสิทธิ์แล้ว" : "Added to Stay"}
                        </span>
                      </>
                    ) : (
                      <>
                        <span>
                          {language === "th"
                            ? "รับโปรโมชั่นนี้"
                            : "Claim Offer"}
                        </span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </StandardButton>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* 3. Direct Booking Privileges & Seasonal Rate Tiers */}
      <section className="space-y-5">
        <header>
          <h2 className="ty-title flex items-center gap-2">
            <Gift className="w-5 h-5 text-[var(--color-accent)] shrink-0" />
            <span>
              {pickLocalizedText(
                language,
                dealCms.privilegesTitleTh,
                dealCms.privilegesTitleEn
              )}
            </span>
          </h2>
          <p className="ty-caption mt-0.5">
            {pickLocalizedText(
              language,
              dealCms.privilegesSubtitleTh,
              dealCms.privilegesSubtitleEn
            )}
          </p>
        </header>

        <div className="w-full min-w-0 flex gap-3.5 overflow-x-auto overflow-y-hidden lg:overflow-visible overscroll-x-contain touch-manipulation no-scrollbar snap-x snap-proximity lg:snap-none lg:grid lg:grid-cols-3 sm:gap-4">
          {dealCms.privileges.map((privilege) => (
            <article
              key={privilege.id}
              className="relative snap-start shrink-0 w-[268px] sm:w-[292px] lg:w-auto rounded-[16px] bg-[var(--color-background-muted)] overflow-hidden flex flex-col"
            >
              <div className="relative h-36 w-full bg-[var(--color-background-subtle)]">
                <img
                  src={privilege.imageUrl}
                  alt={pickLocalizedText(
                    language,
                    privilege.titleTh,
                    privilege.titleEn
                  )}
                  draggable={false}
                  className="h-full w-full object-cover select-none pointer-events-none"
                />
                {canShowEditControls && (
                  <div className="absolute top-2.5 right-2.5 z-20">
                    <EditSpotButton
                      onClick={() =>
                        openCmsEditor({
                          type: "deal-privilege",
                          privilegeId: privilege.id,
                        })
                      }
                    />
                  </div>
                )}
              </div>

              <div className="p-4 space-y-1">
                <span className="ty-caption font-bold text-[var(--color-accent)]">
                  {pickLocalizedText(
                    language,
                    privilege.badgeTh,
                    privilege.badgeEn
                  )}
                </span>
                <h3 className="ty-body font-bold text-[var(--color-text-primary)]">
                  {pickLocalizedText(
                    language,
                    privilege.titleTh,
                    privilege.titleEn
                  )}
                </h3>
                <p className="ty-caption">
                  {pickLocalizedText(
                    language,
                    privilege.descTh,
                    privilege.descEn
                  )}
                </p>
              </div>
            </article>
          ))}
        </div>

        {(seasonalRates.some((season) => season.isActive) ||
          canShowEditControls) && (
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between gap-2">
              <h3 className="ty-body font-bold flex items-center gap-2 text-[var(--color-text-primary)]">
                <Percent className="w-4 h-4 text-[var(--color-promo-text)]" />
                <span>
                  {language === "th"
                    ? "ตารางเรทราคาตามฤดูกาล"
                    : "Seasonal Rate Tiers"}
                </span>
              </h3>

              {canShowEditControls && (
                <EditSpotButton
                  label="จัดการเรทฤดูกาล & วันหยุด"
                  onClick={() => openCmsEditor({ type: "seasonal-rates" })}
                />
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {seasonalRates
                .filter((season) => season.isActive)
                .map((seasonRule) => {
                  const isDiscountTier =
                    seasonRule.adjustmentType === "PERCENT_DISCOUNT";
                  return (
                    <div
                      key={seasonRule.id}
                      className="rounded-[16px] bg-[var(--color-background-muted)] px-4 py-3 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <p className="ty-body font-semibold text-[var(--color-text-primary)] truncate">
                          {pickLocalizedText(
                            language,
                            seasonRule.nameTh,
                            seasonRule.nameEn
                          )}
                        </p>
                        <p className="ty-caption flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" />
                          <span>
                            {formatShortDate(seasonRule.startDate, language)} –{" "}
                            {formatShortDate(seasonRule.endDate, language)}
                          </span>
                        </p>
                      </div>
                      <span
                        className={
                          isDiscountTier
                            ? "badge-promo shrink-0"
                            : "ty-caption font-bold text-[var(--color-accent)] shrink-0"
                        }
                      >
                        {pickLocalizedText(
                          language,
                          seasonRule.badgeTh,
                          seasonRule.badgeEn
                        )}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </section>
    </>
  );
}
