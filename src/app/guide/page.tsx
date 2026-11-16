"use client";

import React, { useState } from "react";
import {
  ChevronDown,
  ExternalLink,
  HelpCircle,
  Mail,
  MapPin,
  Phone,
  Sparkles,
} from "lucide-react";
import { pickLocalizedText } from "@/data/cmsDefaults";
import { useHotelApp } from "@/components/HotelAppShell";
import { EditSpotButton } from "@/components/cms/AdminEditOverlay";

export default function GuidePage() {
  const {
    propertyConfig,
    lang,
    navigateToTab,
    cms,
    canShowEditControls,
    openCmsEditor,
  } = useHotelApp();

  const guideCms = cms.guidePage;

  const [openNearbyMap, setOpenNearbyMap] = useState<Record<string, boolean>>({
    attractions: true,
  });
  const [openFaqMap, setOpenFaqMap] = useState<Record<number, boolean>>({
    0: true,
  });

  return (
    <>
      {/* 1. Location Map, Inline Highlights & 1-Layer Nearby Accordions */}
      <section id="location-map" className="space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="ty-display flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[var(--color-accent)] shrink-0" />
              <span className="truncate">
                {pickLocalizedText(lang, guideCms.titleTh, guideCms.titleEn)}
              </span>
            </h1>
            <p className="ty-caption mt-0.5 truncate">
              {pickLocalizedText(
                lang,
                propertyConfig.locationTh,
                propertyConfig.locationEn
              )}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {canShowEditControls && (
              <EditSpotButton
                label="แก้ไขแผนที่ & รอบที่พัก"
                onClick={() => openCmsEditor({ type: "guide-location" })}
              />
            )}

            <a
              href={guideCms.googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-fw-secondary shrink-0"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Google Maps</span>
            </a>
          </div>
        </header>

        <div className="-mx-4 w-[calc(100%+2rem)] rounded-none sm:mx-0 sm:w-full sm:rounded-[20px] h-[240px] sm:h-[300px] overflow-hidden bg-[var(--color-background-muted)]">
          <iframe
            title="Resort Google Map"
            src={`https://maps.google.com/maps?q=${propertyConfig.latitude},${propertyConfig.longitude}&hl=${lang}&z=14&output=embed`}
            className="w-full h-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>

        {/* Inline Contact & Nearby Distance Highlights */}
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 ty-body">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            {guideCms.nearbySpots.map((spot) => (
              <span
                key={spot.id}
                className="inline-flex items-center gap-1.5 ty-caption text-[var(--color-text-primary)]"
              >
                <MapPin className="w-3.5 h-3.5 text-[var(--color-accent)] shrink-0" />
                <strong className="font-semibold">
                  {pickLocalizedText(lang, spot.nameTh, spot.nameEn)}
                </strong>
                <span className="text-[var(--color-text-secondary)]">
                  ({pickLocalizedText(lang, spot.distTh, spot.distEn)})
                </span>
              </span>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 ty-caption">
            {propertyConfig.phones[0] && (
              <a
                href={`tel:${propertyConfig.phones[0]}`}
                className="inline-flex items-center gap-1.5 font-semibold text-[var(--color-text-primary)] hover:text-[var(--color-accent)] transition"
              >
                <Phone className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                <span>{propertyConfig.phones.join(" , ")}</span>
              </a>
            )}
            {propertyConfig.email && (
              <a
                href={`mailto:${propertyConfig.email}`}
                className="inline-flex items-center gap-1.5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>{propertyConfig.email}</span>
              </a>
            )}
          </div>
        </div>

        {/* 1-Layer Nearby Guide Accordions */}
        <div className="space-y-2 [overflow-anchor:none]">
          {guideCms.nearbyCategories.map((category) => {
            const isOpen = Boolean(openNearbyMap[category.id]);
            const items =
              lang === "en" && category.itemsEn.length > 0
                ? category.itemsEn
                : category.itemsTh;
            return (
              <div
                key={category.id}
                className="rounded-[16px] bg-[var(--color-background-muted)] px-4 py-3.5 [overflow-anchor:none]"
              >
                <button
                  type="button"
                  onClick={() =>
                    setOpenNearbyMap((prev) => ({
                      ...prev,
                      [category.id]: !prev[category.id],
                    }))
                  }
                  className="w-full flex items-center justify-between gap-2 text-left ty-body font-semibold cursor-pointer"
                >
                  <span>
                    {pickLocalizedText(lang, category.titleTh, category.titleEn)}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 shrink-0 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isOpen && (
                  <ul className="pt-2.5 pl-5 space-y-1.5 ty-body-muted list-disc">
                    {items.map((line, idx) => (
                      <li key={idx}>{line}</li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. Frequently Asked Questions */}
      <section id="faqs" className="space-y-4 [overflow-anchor:none]">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="ty-title flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-[var(--color-accent)] shrink-0" />
              <span className="truncate">
                {lang === "th"
                  ? "คำถามที่พบบ่อย (FAQs)"
                  : "Frequently Asked Questions"}
              </span>
            </h2>
            <p className="ty-caption mt-0.5 truncate">
              {lang === "th"
                ? "ข้อมูลการเข้าพัก การเดินทาง และการจองตรงอัตโนมัติ"
                : "Essential information about your stay, travel, and instant booking"}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {canShowEditControls && (
              <EditSpotButton
                label="แก้ไข FAQs"
                onClick={() => openCmsEditor({ type: "guide-faqs" })}
              />
            )}

            <button
              type="button"
              onClick={() => navigateToTab("chat")}
              className="btn-fw-secondary shrink-0"
            >
              <Sparkles className="w-4 h-4 text-[var(--color-accent)]" />
              <span>{lang === "th" ? "ถาม AI" : "Ask AI"}</span>
            </button>
          </div>
        </header>

        <div className="space-y-2 [overflow-anchor:none]">
          {guideCms.faqs.map((faq, idx) => {
            const isOpen = Boolean(openFaqMap[idx]);
            return (
              <div
                key={faq.id}
                className="rounded-[16px] bg-[var(--color-background-muted)] px-4 py-3.5 [overflow-anchor:none]"
              >
                <button
                  type="button"
                  onClick={() =>
                    setOpenFaqMap((prev) => ({
                      ...prev,
                      [idx]: !prev[idx],
                    }))
                  }
                  className="w-full flex items-center justify-between gap-4 text-left cursor-pointer"
                  aria-expanded={isOpen}
                >
                  <span className="ty-body font-semibold">
                    {pickLocalizedText(lang, faq.qTh, faq.qEn)}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 shrink-0 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isOpen && (
                  <p className="pt-2.5 ty-body-muted">
                    {pickLocalizedText(lang, faq.aTh, faq.aEn)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
