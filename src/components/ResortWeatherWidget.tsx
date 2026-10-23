"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  ThermometerSnowflake,
} from "lucide-react";

export interface DailyForecastItem {
  dateStr: string;
  tempMax: number;
  tempMin: number;
  tempAvg: number;
}

export interface LiveWeatherData {
  currentTemp: number;
  daily: DailyForecastItem[];
  fetchedAtIso: string;
}

export interface DailyRoomPriceSnapshot {
  freeRoomsCount: number;
  totalActiveRooms: number;
  startingPriceThb: number;
  originalPriceThb: number;
  promoLabelTh: string;
  isPromoDay: boolean;
  rateNoteTh?: string;
}

export function useResortWeather(latitude: number, longitude: number) {
  const [weather, setWeather] = useState<LiveWeatherData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchWeather() {
      setLoading(true);
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&daily=temperature_2m_max,temperature_2m_min&timezone=Asia%2FBangkok&forecast_days=14`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Weather fetch failed");
        const data = await res.json();
        if (cancelled) return;

        const dailyDates: string[] = data?.daily?.time ?? [];
        const maxTemps: number[] = data?.daily?.temperature_2m_max ?? [];
        const minTemps: number[] = data?.daily?.temperature_2m_min ?? [];

        const daily: DailyForecastItem[] = dailyDates.map((dStr, idx) => {
          const tMax = Math.round(maxTemps[idx] ?? 28);
          const tMin = Math.round(minTemps[idx] ?? 19);
          return {
            dateStr: dStr,
            tempMax: tMax,
            tempMin: tMin,
            tempAvg: Math.round((tMax + tMin) / 2),
          };
        });

        setWeather({
          currentTemp: Math.round(data?.current?.temperature_2m ?? 25),
          daily,
          fetchedAtIso: new Date().toISOString(),
        });
      } catch {
        if (!cancelled) {
          const today = new Date();
          const fallbackDaily: DailyForecastItem[] = Array.from({
            length: 14,
          }).map((_, i) => {
            const d = new Date(today);
            d.setDate(d.getDate() + i);
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, "0");
            const day = String(d.getDate()).padStart(2, "0");
            const tMax = 28 - (i % 3);
            const tMin = 19 + (i % 2);
            return {
              dateStr: `${y}-${m}-${day}`,
              tempMax: tMax,
              tempMin: tMin,
              tempAvg: Math.round((tMax + tMin) / 2),
            };
          });
          setWeather({
            currentTemp: 25,
            daily: fallbackDaily,
            fetchedAtIso: new Date().toISOString(),
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchWeather();
    return () => {
      cancelled = true;
    };
  }, [latitude, longitude]);

  return { weather, loading };
}

interface ResortWeatherStripProps {
  weather: LiveWeatherData | null;
  loading: boolean;
  cityLabel: string;
  checkInDateStr: string;
  lang: "th" | "en";
  accentColor: string;
  onSelectCheckInDate?: (dateStr: string) => void;
  getDailyRoomSnapshot?: (dateStr: string) => DailyRoomPriceSnapshot;
}

export function ResortWeatherWidget({
  weather,
  loading,
  cityLabel,
  checkInDateStr,
  lang,
  onSelectCheckInDate,
  getDailyRoomSnapshot,
}: ResortWeatherStripProps) {
  const sliderRef = useRef<HTMLDivElement | null>(null);

  const minTempOfAll = useMemo(() => {
    if (!weather?.daily?.length) return 18;
    return Math.min(...weather.daily.slice(0, 14).map((d) => d.tempMin));
  }, [weather]);

  const handleSlide = (dir: "left" | "right") => {
    if (!sliderRef.current) return;
    const amount = 540;
    sliderRef.current.scrollBy({
      left: dir === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  if (loading && !weather) {
    return (
      <div className="py-6 animate-pulse flex items-center justify-between">
        <div className="h-6 w-64 bg-[#f1f1f1] rounded-[12px]" />
        <div className="h-6 w-36 bg-[#f1f1f1] rounded-[12px]" />
      </div>
    );
  }

  if (!weather) return null;

  return (
    <div className="w-full">
      {/* Section Header — fastwork.com Minimalist Style with Right-Aligned Slider Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="fw-head-icon shrink-0">
            <ThermometerSnowflake className="w-5 h-5 text-[#171717]" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[18px] sm:text-[20px] font-semibold text-[#171717]">
                พยากรณ์อากาศ 14 วัน & ราคาห้องพักรายวัน
              </h2>
              <span className="rounded-full bg-[#0000000f] px-2.5 py-0.5 text-[12px] font-medium text-[#171717]">
                {cityLabel} · {weather.currentTemp}°C
              </span>
            </div>
            <p className="text-[13px] text-[#737373] mt-0.5">
              {lang === "th"
                ? "เลือกวันที่อากาศเย็นสบายและคลิกที่การ์ดเพื่อกำหนดวันเช็คอินได้ทันที"
                : "Select any forecast card below to set your check-in date"}
            </p>
          </div>
        </div>

        {/* Right-Aligned Slider Controls — fastwork.com Neutral Pills */}
        <div className="ml-auto flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={() => handleSlide("left")}
            className="rounded-full px-3.5 py-2 text-[12px] font-medium bg-[#0000000f] hover:bg-[#00000018] text-[#171717] transition cursor-pointer inline-flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>ก่อนหน้า</span>
          </button>
          <button
            type="button"
            onClick={() => handleSlide("right")}
            className="rounded-full px-3.5 py-2 text-[12px] font-medium bg-[#0000000f] hover:bg-[#00000018] text-[#171717] transition cursor-pointer inline-flex items-center gap-1"
          >
            <span>ถัดไป</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 14-Day Vertical Cards Slider — fastwork.com Minimalist Cards */}
      <div
        ref={sliderRef}
        className="flex items-stretch gap-3.5 overflow-x-auto pb-2 snap-x snap-mandatory no-scrollbar"
      >
        {weather.daily.slice(0, 14).map((day, idx) => {
          const isSelected = day.dateStr === checkInDateStr;
          const dObj = new Date(day.dateStr + "T00:00:00");
          const dayOfWeek = dObj.getDay();
          const isWeekend =
            dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0;

          const dayNum = dObj.getDate();
          const weekdayFull = dObj.toLocaleDateString(
            lang === "th" ? "th-TH" : "en-US",
            { weekday: "long" }
          );
          const monthShort = dObj.toLocaleDateString(
            lang === "th" ? "th-TH" : "en-US",
            { month: "short" }
          );
          const monthLong = dObj.toLocaleDateString(
            lang === "th" ? "th-TH" : "en-US",
            { month: "long" }
          );
          const isColdest = day.tempMin === minTempOfAll;

          const snap: DailyRoomPriceSnapshot = getDailyRoomSnapshot
            ? getDailyRoomSnapshot(day.dateStr)
            : {
                freeRoomsCount: 8,
                totalActiveRooms: 11,
                startingPriceThb: isWeekend ? 3230 : 2720,
                originalPriceThb: isWeekend ? 3800 : 3200,
                promoLabelTh: isWeekend
                  ? "โปรจองตรง -15%"
                  : "โปรวันธรรมดา -15%",
                isPromoDay: true,
              };

          const isAvailable = snap.freeRoomsCount > 0;

          return (
            <article
              key={day.dateStr}
              onClick={() => {
                if (!isAvailable) return;
                onSelectCheckInDate?.(day.dateStr);
              }}
              className={`group snap-start shrink-0 w-[235px] sm:w-[250px] relative flex flex-col justify-between rounded-[16px] bg-white border p-4 transition duration-150 ${
                !isAvailable
                  ? "opacity-55 bg-[#fafafa] border-[#ebebeb] cursor-not-allowed select-none"
                  : isSelected
                  ? "cursor-pointer"
                  : "border-[#ebebeb] hover:border-[#262626] cursor-pointer"
              }`}
            >
              <div>
                {/* Top Date & Tag Row */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[14px] font-semibold text-[#171717]">
                      {weekdayFull}
                    </div>
                    <div className="text-[12px] text-[#737373]">
                      {dayNum} {monthLong}
                    </div>
                  </div>

                  {!isAvailable ? (
                    <span className="rounded-full bg-[#facecb] text-[#a50c25] px-2.5 py-0.5 text-[11px] font-medium">
                      เต็ม
                    </span>
                  ) : isColdest ? (
                    <span className="rounded-full bg-[#262626] text-white px-2.5 py-0.5 text-[11px] font-medium">
                      หนาวสุด
                    </span>
                  ) : idx === 0 ? (
                    <span className="rounded-full bg-[#0000000f] text-[#171717] px-2.5 py-0.5 text-[11px] font-medium">
                      วันนี้
                    </span>
                  ) : isWeekend ? (
                    <span className="rounded-full bg-[#0000000f] text-[#737373] px-2.5 py-0.5 text-[11px] font-medium">
                      สุดสัปดาห์
                    </span>
                  ) : null}
                </div>

                {/* Temperature Display Box */}
                <div className="mt-3.5 rounded-[12px] bg-[#f1f1f1] p-3 flex items-end justify-between">
                  <div>
                    <span className="text-[11px] text-[#737373] block">
                      อุณหภูมิต่ำสุด
                    </span>
                    <div className="flex items-baseline gap-0.5 mt-0.5">
                      <span className="text-[28px] font-semibold leading-none text-[#171717]">
                        {day.tempMin}°
                      </span>
                      <span className="text-[12px] font-medium text-[#737373]">
                        C
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-[#737373] block">
                      สูงสุด
                    </span>
                    <span className="text-[13px] font-semibold text-[#171717]">
                      {day.tempMax}°C
                    </span>
                  </div>
                </div>

                {/* Availability & Starting Price */}
                <div className="mt-3.5 pt-3 border-t border-[#ebebeb] flex items-end justify-between">
                  <div>
                    <span className="block text-[12px] font-medium text-[#171717]">
                      {isAvailable
                        ? `ว่าง ${snap.freeRoomsCount} ยูนิต`
                        : "ไม่มีห้องว่าง"}
                    </span>
                    {isAvailable && snap.isPromoDay && (
                      <span className="text-[11px] text-[#737373] block mt-0.5">
                        {snap.promoLabelTh}
                      </span>
                    )}
                  </div>

                  <div className="text-right">
                    {isAvailable &&
                      snap.originalPriceThb > snap.startingPriceThb && (
                        <span className="text-[11px] line-through text-[#a3a3a3] block">
                          ฿{snap.originalPriceThb.toLocaleString()}
                        </span>
                      )}
                    <span className="text-[16px] font-semibold text-[#171717]">
                      ฿{snap.startingPriceThb.toLocaleString()}
                    </span>
                    <span className="text-[11px] text-[#737373]"> / คืน</span>
                  </div>
                </div>
              </div>

              {/* Action Pill Button */}
              <div className="mt-3.5">
                <div
                  className={`w-full rounded-full py-2 px-3 text-[12px] font-medium text-center transition flex items-center justify-center gap-1.5 ${
                    !isAvailable
                      ? "bg-[#f1f1f1] text-[#a3a3a3]"
                      : isSelected
                      ? "bg-[#262626] text-white"
                      : "bg-[#0000000f] text-[#171717] group-hover:bg-[#262626] group-hover:text-white"
                  }`}
                >
                  {isSelected ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>
                        เลือกแล้ว ({dayNum} {monthShort})
                      </span>
                    </>
                  ) : isAvailable ? (
                    <span>เลือกเช็คอิน ({day.tempMin}°C)</span>
                  ) : (
                    <span>เต็มแล้ว</span>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
