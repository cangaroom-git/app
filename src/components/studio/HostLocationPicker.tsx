"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  AlertTriangle,
  CheckCircle2,
  Crosshair,
  Link2,
  Loader2,
  MapPin,
  Minus,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useHotelApp } from "@/components/HotelAppShell";
import {
  StandardFieldGroup,
  StandardInput,
} from "@/components/ui/standards";
import { getProvinceById } from "@/data/thailandProvinces";
import {
  configureThailandMapInteractions,
  ensureMapLibreWorker,
  getAirbnbVectorMapStyle,
  THAILAND_MAX_ZOOM,
  WORLD_MIN_ZOOM,
} from "@/lib/geo/airbnbMapLibreStyle";
import {
  getProvinceCenter,
  validateThailandPin,
} from "@/lib/geo/thailandProvinceCentroids";
import type { ResolvedLocationCandidate } from "@/app/api/studio/resolve-location/route";

interface HostLocationPickerProps {
  provinceId: string;
  latitude: number | null;
  longitude: number | null;
  googleMapsUrl: string;
  onChangeCoordinates: (lat: number | null, lng: number | null) => void;
  onChangeGoogleMapsUrl?: (url: string) => void;
  compact?: boolean;
}

export function HostLocationPicker({
  provinceId,
  latitude,
  longitude,
  googleMapsUrl,
  onChangeCoordinates,
  onChangeGoogleMapsUrl,
  compact = false,
}: HostLocationPickerProps) {
  const { theme } = useHotelApp();
  const isDark = theme === "dark";

  const hasValidCoords =
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude);

  const [lookupInput, setLookupInput] = useState("");
  const [isResolving, setIsResolving] = useState(false);
  const [candidates, setCandidates] = useState<ResolvedLocationCandidate[]>([]);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDraggingMap, setIsDraggingMap] = useState(false);
  const [showAdvancedCoords, setShowAdvancedCoords] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const isProgrammaticMoveRef = useRef(false);
  const hasUserPinnedRef = useRef(hasValidCoords);

  useEffect(() => {
    if (hasValidCoords) {
      hasUserPinnedRef.current = true;
    }
  }, [hasValidCoords]);

  const provinceCenter = useMemo(
    () => getProvinceCenter(provinceId),
    [provinceId]
  );
  const provinceMeta = useMemo(
    () => getProvinceById(provinceId),
    [provinceId]
  );
  const provinceNameTh = provinceMeta
    ? provinceMeta.nameTh.split("(")[0].trim()
    : provinceId;

  const pinValidation = useMemo(
    () => validateThailandPin(latitude, longitude, provinceId),
    [latitude, longitude, provinceId]
  );

  const flyToAndPin = useCallback(
    (lat: number, lng: number, zoom = 16) => {
      const cleanLat = Number(lat.toFixed(6));
      const cleanLng = Number(lng.toFixed(6));
      hasUserPinnedRef.current = true;
      onChangeCoordinates(cleanLat, cleanLng);

      const map = mapRef.current;
      if (map) {
        isProgrammaticMoveRef.current = true;
        map.flyTo({
          center: [cleanLng, cleanLat],
          zoom,
          duration: 520,
        });
        map.once("moveend", () => {
          isProgrammaticMoveRef.current = false;
        });
      }
    },
    [onChangeCoordinates]
  );

  // Initialize WebGL Vector Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    ensureMapLibreWorker();
    const container = mapContainerRef.current;
    let cancelled = false;
    let mapInstance: maplibregl.Map | null = null;

    const initialCenter: [number, number] = hasValidCoords
      ? [longitude!, latitude!]
      : [provinceCenter.lng, provinceCenter.lat];
    const initialZoom = hasValidCoords ? 15.5 : 11;

    getAirbnbVectorMapStyle(isDark).then((style) => {
      if (cancelled || !mapContainerRef.current) return;
      const map = new maplibregl.Map({
        container,
        style,
        center: initialCenter,
        zoom: initialZoom,
        minZoom: WORLD_MIN_ZOOM,
        maxZoom: THAILAND_MAX_ZOOM,
        dragRotate: false,
        touchPitch: false,
        attributionControl: false,
      });
      configureThailandMapInteractions(map);

      map.on("dragstart", () => {
        setIsDraggingMap(true);
      });

      map.on("dragend", () => {
        setIsDraggingMap(false);
        const c = map.getCenter();
        hasUserPinnedRef.current = true;
        onChangeCoordinates(Number(c.lat.toFixed(6)), Number(c.lng.toFixed(6)));
      });

      map.on("click", (e: maplibregl.MapMouseEvent) => {
        const nextLat = Number(e.lngLat.lat.toFixed(6));
        const nextLng = Number(e.lngLat.lng.toFixed(6));
        hasUserPinnedRef.current = true;
        onChangeCoordinates(nextLat, nextLng);
        isProgrammaticMoveRef.current = true;
        map.easeTo({ center: [nextLng, nextLat], duration: 260 });
        map.once("moveend", () => {
          isProgrammaticMoveRef.current = false;
        });
      });

      mapRef.current = map;
      mapInstance = map;
    });

    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => mapRef.current?.resize())
        : null;
    ro?.observe(container);

    return () => {
      cancelled = true;
      ro?.disconnect();
      mapInstance?.remove();
      mapRef.current = null;
    };
    // Recreate only if theme flips; coordinate & province updates fly smoothly below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDark]);

  // Recenter map to selected province automatically if owner hasn't pinned yet
  useEffect(() => {
    if (hasUserPinnedRef.current || !mapRef.current) return;
    isProgrammaticMoveRef.current = true;
    mapRef.current.flyTo({
      center: [provinceCenter.lng, provinceCenter.lat],
      zoom: 11,
      duration: 450,
    });
    mapRef.current.once("moveend", () => {
      isProgrammaticMoveRef.current = false;
    });
  }, [provinceCenter.lat, provinceCenter.lng]);

  const resolveQueryOrLink = useCallback(
    async (rawText: string) => {
      const q = rawText.trim();
      if (q.length < 2) return;

      setIsResolving(true);
      setErrorMessage(null);
      setFeedbackMessage(null);
      setCandidates([]);

      if (/^https?:\/\//i.test(q) && onChangeGoogleMapsUrl) {
        onChangeGoogleMapsUrl(q);
      }

      try {
        const res = await fetch("/api/studio/resolve-location", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: q, provinceId }),
        });
        const data = (await res.json()) as {
          candidates?: ResolvedLocationCandidate[];
          error?: string;
        };

        const list = Array.isArray(data.candidates) ? data.candidates : [];
        if (list.length === 0) {
          setErrorMessage(
            data.error ||
              "ไม่พบสถานที่จากคำค้นนี้ ลองพิมพ์ชื่ออำเภอ/ตำบล หรือลากเลื่อนแผนที่เพื่อปักหมุดเองได้เลยครับ"
          );
          return;
        }

        if (list.length === 1 || /^https?:\/\//i.test(q)) {
          const best = list[0];
          if (best.extractedGoogleMapsUrl && onChangeGoogleMapsUrl) {
            onChangeGoogleMapsUrl(best.extractedGoogleMapsUrl);
          }
          flyToAndPin(best.lat, best.lng, 16);
          setFeedbackMessage(
            best.wasSwappedLatLng
              ? `สลับลำดับพิกัดให้ถูกต้องอัตโนมัติแล้ว (${best.lat.toFixed(5)}, ${best.lng.toFixed(5)})`
              : `ดึงจุดปักหมุดสำเร็จ: ${best.label} — ลากเลื่อนแผนที่เพื่อขยับให้ตรงหน้าทางเข้าที่พักได้เลย`
          );
        } else {
          setCandidates(list);
        }
      } catch {
        setErrorMessage("เชื่อมต่อค้นหาพิกัดไม่สำเร็จ กรุณาลองอีกครั้ง");
      } finally {
        setIsResolving(false);
      }
    },
    [flyToAndPin, onChangeGoogleMapsUrl, provinceId]
  );

  const handleUseCurrentGps = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setErrorMessage("เบราว์เซอร์นี้ไม่รองรับการดึงตำแหน่ง GPS");
      return;
    }
    setIsResolving(true);
    setErrorMessage(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsResolving(false);
        flyToAndPin(pos.coords.latitude, pos.coords.longitude, 16.5);
        setFeedbackMessage(
          "ปักหมุดตามตำแหน่งปัจจุบันของคุณแล้ว สามารถเลื่อนแผนที่ปรับจุดอย่างละเอียดได้"
        );
      },
      () => {
        setIsResolving(false);
        setErrorMessage(
          "ไม่สามารถเข้าถึงตำแหน่ง GPS ได้ กรุณาอนุญาตสิทธิ์ตำแหน่งหรือวางลิงก์ Google Maps แทน"
        );
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleZoomStep = (delta: number) => {
    const map = mapRef.current;
    if (!map) return;
    map.easeTo({
      zoom: Math.max(
        map.getMinZoom(),
        Math.min(map.getMaxZoom(), map.getZoom() + delta)
      ),
      duration: 220,
    });
  };

  const handleJumpToSelectedProvince = () => {
    flyToAndPin(provinceCenter.lat, provinceCenter.lng, 12.5);
    setFeedbackMessage(
      `ย้ายหมุดมาที่ใจกลาง จ.${provinceNameTh} แล้ว กรุณาซูมและเลื่อนหมุดไปยังตำแหน่งที่พักจริง`
    );
  };

  return (
    <div className="space-y-3">
      {/* Smart Search / Google Maps Link Auto-Extractor (Unified Airbnb Input) */}
      <div className="relative space-y-2">
        <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
          <div className="relative flex-1 min-w-0">
            <StandardInput
              label="ค้นหาตำแหน่ง หรือวางลิงก์ Google Maps"
              placeholder="วางลิงก์ maps.app.goo.gl หรือพิมพ์ชื่อที่พัก / ตำบล..."
              value={lookupInput}
              onChange={(e) => setLookupInput(e.target.value)}
              onPaste={(e) => {
                const pasted = e.clipboardData.getData("text").trim();
                if (/^https?:\/\//i.test(pasted)) {
                  window.setTimeout(() => void resolveQueryOrLink(pasted), 40);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void resolveQueryOrLink(lookupInput);
                }
              }}
              className="pr-8"
            />
            {lookupInput && (
              <button
                type="button"
                onClick={() => {
                  setLookupInput("");
                  setCandidates([]);
                }}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 h-7 w-7 rounded-[8px] hover:bg-[var(--color-background-subtle)] flex items-center justify-center cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-stretch gap-2 shrink-0">
            <button
              type="button"
              disabled={isResolving || lookupInput.trim().length < 2}
              onClick={() => void resolveQueryOrLink(lookupInput)}
              className="min-h-[56px] px-5 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] text-[13.5px] font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-40 transition-colors"
            >
              {isResolving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Link2 className="w-4 h-4" />
              )}
              <span>ค้นหา / ดึงพิกัด</span>
            </button>

            <button
              type="button"
              onClick={handleUseCurrentGps}
              disabled={isResolving}
              title="ปักหมุดตามตำแหน่ง GPS ปัจจุบัน"
              className="h-10 px-3 rounded-[12px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[13px] font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Crosshair className="w-4 h-4 shrink-0" />
              <span className="hidden md:inline">ตำแหน่งปัจจุบัน</span>
            </button>
          </div>
        </div>

        {/* Multiple Search Candidates Dropdown */}
        {candidates.length > 0 && (
          <div className="rounded-[14px] bg-[var(--color-background-popover)] border border-black/[0.06] dark:border-white/[0.1] shadow-[var(--shadow-popover)] divide-y divide-[var(--color-border)] overflow-hidden">
            {candidates.map((cand, idx) => (
              <button
                key={`${cand.lat}-${cand.lng}-${idx}`}
                type="button"
                onClick={() => {
                  if (cand.extractedGoogleMapsUrl && onChangeGoogleMapsUrl) {
                    onChangeGoogleMapsUrl(cand.extractedGoogleMapsUrl);
                  }
                  flyToAndPin(cand.lat, cand.lng, 16);
                  setCandidates([]);
                  setFeedbackMessage(
                    `เลือก "${cand.label}" แล้ว ลากเลื่อนแผนที่เพื่อจัดหมุดให้ตรงจุดที่พักได้เลย`
                  );
                }}
                className="w-full px-3.5 py-2.5 text-left flex items-center justify-between gap-3 hover:bg-[var(--color-background-muted)] cursor-pointer transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-[13.5px] font-semibold text-[var(--color-text-primary)] truncate">
                    {cand.label}
                  </p>
                  {cand.sublabel && (
                    <p className="text-[12px] text-[var(--color-text-secondary)] truncate">
                      {cand.sublabel}
                    </p>
                  )}
                </div>
                <span className="text-[12px] font-semibold text-[var(--color-text-primary)] underline shrink-0">
                  เลือกจุดนี้
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Feedback / Error Notices */}
      {feedbackMessage && (
        <p className="text-[12.5px] font-medium text-[var(--color-success)] flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{feedbackMessage}</span>
        </p>
      )}
      {errorMessage && (
        <p className="text-[12.5px] font-medium text-[var(--color-error)]">
          {errorMessage}
        </p>
      )}

      {/* Interactive Airbnb "Drag Map Under Center Resort Pin" Stage */}
      <div
        className={`relative isolate w-full ${
          compact ? "h-[240px]" : "h-[280px] sm:h-[310px]"
        } rounded-[16px] overflow-hidden bg-[#F6F4EF] dark:bg-[#191919] select-none`}
      >
        <div ref={mapContainerRef} className="w-full h-full touch-none" />

        {/* Fixed Center Crosshair Resort House Pin */}
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <div className="relative flex flex-col items-center">
            <div
              className={`h-11 w-11 rounded-full bg-[var(--color-accent)] text-[var(--color-on-accent)] shadow-[var(--shadow-popover)] ring-4 ring-white/90 dark:ring-[#18202b]/90 flex items-center justify-center transition-transform duration-150 ${
                isDraggingMap ? "-translate-y-2" : "translate-y-0"
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M12.71 2.29a1 1 0 0 0-1.42 0l-9 9a1 1 0 0 0 1.42 1.42L4 12.41V20a2 2 0 0 0 2 2h4v-6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v6h4a2 2 0 0 0 2-2v-7.59l.29.3a1 1 0 0 0 1.42-1.42l-9-9z" />
              </svg>
            </div>
            <span className="mt-1 h-1.5 w-3 rounded-full bg-black/25 dark:bg-white/30" />
          </div>
        </div>

        {/* Top-Left Instruction Chip */}
        <div className="pointer-events-none absolute top-3 left-3 z-10 max-w-[calc(100%-76px)] px-3 py-1.5 rounded-[10px] bg-white/92 dark:bg-[#222222]/92 shadow-[var(--shadow-popover)] text-[12px] font-medium text-[var(--color-text-primary)] truncate">
          ลากเลื่อนแผนที่หรือแตะจุดเพื่อให้หมุดบ้านตรงกับที่พักจริง
        </div>

        {/* Top-Right Zoom Controls */}
        <div className="absolute top-3 right-3 z-10 rounded-[10px] bg-white/95 dark:bg-[#222222]/95 shadow-[var(--shadow-popover)] divide-y divide-[var(--color-border)] overflow-hidden flex flex-col">
          <button
            type="button"
            onClick={() => handleZoomStep(0.9)}
            aria-label="Zoom in"
            className="h-9 w-9 text-[#222222] dark:text-[#f5f5f5] hover:bg-[var(--color-background-muted)] flex items-center justify-center cursor-pointer"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleZoomStep(-0.9)}
            aria-label="Zoom out"
            className="h-9 w-9 text-[#222222] dark:text-[#f5f5f5] hover:bg-[var(--color-background-muted)] flex items-center justify-center cursor-pointer"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>

        {/* Bottom-Left Pin Status Badge */}
        <div className="absolute bottom-3 left-3 z-10 px-3 py-1.5 rounded-[10px] bg-white/95 dark:bg-[#222222]/95 shadow-[var(--shadow-popover)] text-[12px] font-semibold text-[var(--color-text-primary)] inline-flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          {hasValidCoords ? (
            <span className="tabular-nums">
              ปักหมุดแล้ว ({latitude!.toFixed(5)}, {longitude!.toFixed(5)})
            </span>
          ) : (
            <span className="text-[var(--color-text-secondary)]">
              ยังไม่ได้ยืนยันจุดปักหมุด (เลื่อนแผนที่เพื่อปักหมุด)
            </span>
          )}
        </div>
      </div>

      {/* Province / Country Sanity Guardrail Warning */}
      {pinValidation.status !== "ok" && pinValidation.messageTh && (
        <div className="rounded-[12px] bg-[var(--color-background-muted)] p-3.5 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-start gap-2.5 min-w-0 flex-1">
            <AlertTriangle className="w-4 h-4 text-[var(--color-warning)] shrink-0 mt-0.5" />
            <p className="text-[12.5px] font-semibold text-[var(--color-text-primary)]">
              {pinValidation.messageTh}
            </p>
          </div>
          <button
            type="button"
            onClick={handleJumpToSelectedProvince}
            className="h-8 px-3 rounded-[9px] bg-[var(--color-background-card)] hover:bg-[var(--color-background-subtle)] text-[12px] font-semibold text-[var(--color-text-primary)] cursor-pointer shrink-0 transition-colors"
          >
            ย้ายแผนที่ไป จ.{provinceNameTh}
          </button>
        </div>
      )}

      {/* Subtle Footer Row: Google Maps URL input (if managed inline) + Optional Advanced Numeric Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-[var(--color-text-secondary)]">
        {googleMapsUrl ? (
          <span className="truncate max-w-[70%]">
            ลิงก์แผนที่: {googleMapsUrl}
          </span>
        ) : (
          <span>
            ไม่ต้องกรอก Latitude / Longitude เอง ระบบบันทึกจุดปักหมุดให้อัตโนมัติ
          </span>
        )}
        <button
          type="button"
          onClick={() => setShowAdvancedCoords((v) => !v)}
          className="inline-flex items-center gap-1 font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] underline cursor-pointer"
        >
          <SlidersHorizontal className="w-3 h-3" />
          <span>
            {showAdvancedCoords ? "ซ่อนพิกัดตัวเลข" : "แก้ไขตัวเลขพิกัดขั้นสูง"}
          </span>
        </button>
      </div>

      {showAdvancedCoords && (
        <div className="flex flex-col sm:flex-row items-stretch gap-2.5 pt-1">
          <div className="flex-1 min-w-0">
            <StandardFieldGroup>
              <div className="grid grid-cols-2 divide-x divide-[#b0b0b0] dark:divide-[var(--color-border-emphasized)]">
                <StandardInput
                  grouped
                  label="Latitude"
                  type="number"
                  step="any"
                  placeholder="19.1912"
                  value={hasValidCoords ? latitude! : ""}
                  onChange={(e) => {
                    const val = e.target.value.trim();
                    if (!val) {
                      onChangeCoordinates(null, null);
                      return;
                    }
                    const num = Number(val);
                    if (Number.isFinite(num)) {
                      onChangeCoordinates(num, longitude ?? provinceCenter.lng);
                    }
                  }}
                  className="tabular-nums"
                />
                <StandardInput
                  grouped
                  label="Longitude"
                  type="number"
                  step="any"
                  placeholder="101.1965"
                  value={hasValidCoords ? longitude! : ""}
                  onChange={(e) => {
                    const val = e.target.value.trim();
                    if (!val) {
                      onChangeCoordinates(null, null);
                      return;
                    }
                    const num = Number(val);
                    if (Number.isFinite(num)) {
                      onChangeCoordinates(latitude ?? provinceCenter.lat, num);
                    }
                  }}
                  className="tabular-nums"
                />
              </div>
            </StandardFieldGroup>
          </div>
          <div className="flex items-stretch">
            <button
              type="button"
              onClick={() => {
                hasUserPinnedRef.current = false;
                onChangeCoordinates(null, null);
              }}
              className="h-9 px-3 rounded-[10px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[12.5px] font-semibold text-[var(--color-text-secondary)] cursor-pointer transition-colors"
            >
              ล้างจุดปักหมุด
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
