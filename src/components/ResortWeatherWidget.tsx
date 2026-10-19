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
    const amount = 580;
    sliderRef.current.scrollBy({
      left: dir === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  if (loading && !weather) {
    return (
      <div className="py-6 animate-pulse flex items-center justify-between">
        <div className="h-6 w-64 bg-slate-200 rounded-xl" />
        <div className="h-6 w-36 bg-slate-200 rounded-xl" />
      </div>
    );
  }

  if (!weather) return null;

  return (
    <div className="w-full">
      {/* Section Header — With Right-Aligned Slider Controls */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] px-3 py-1 text-[11px] font-bold text-[#0063F5]">
            <ThermometerSnowflake className="w-3.5 h-3.5" />
            <span>
              14-DAY FORECAST & AVAILABILITY · {cityLabel} (ตอนนี้{" "}
              {weather.currentTemp}°C)
            </span>
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#121317] mt-2">
            พยากรณ์อากาศ 14 วัน & ราคาห้องพักรายวัน
          </h2>
          <p className="text-xs sm:text-sm text-[#475467] mt-1">
            {lang === "th" ? (
              <>
                เลือกวันที่อากาศหนาวที่สุดเพื่อสัมผัสไอหมอกและอากาศบริสุทธิ์ล่วงหน้า 14 วัน —{" "}
                <strong className="text-[#0063F5]">
                  คลิกที่การ์ดเพื่อเลือกวันเช็คอินได้ทันที
                </strong>
              </>
            ) : (
              <>
                Choose the chilliest dates to experience mountain mist and crisp air —{" "}
                <strong className="text-[#0063F5]">
                  Click any card to select your check-in date
                </strong>
              </>
            )}
          </p>
        </div>

        {/* Modern Fastwork Slider Controls — Right-Aligned */}
        <div className="ml-auto flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={() => handleSlide("left")}
            className="rounded-xl px-3.5 py-2 text-xs font-bold border bg-white border-slate-200 text-[#475467] hover:border-[#0063F5] hover:text-[#0063F5] hover:bg-[#EFF6FF] transition cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>ก่อนหน้า</span>
          </button>
          <button
            type="button"
            onClick={() => handleSlide("right")}
            className="rounded-xl px-3.5 py-2 text-xs font-bold border bg-white border-slate-200 text-[#475467] hover:border-[#0063F5] hover:text-[#0063F5] hover:bg-[#EFF6FF] transition cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
          >
            <span>ถัดไป</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 14-Day Vertical Cards Slider — Fastwork Modern Style */}
      <div
        ref={sliderRef}
        className="flex items-stretch gap-4 sm:gap-5 overflow-x-auto pb-3 snap-x snap-mandatory"
        style={{ scrollbarWidth: "thin" }}
      >
        {weather.daily.slice(0, 14).map((day, idx) => {
          const isSelected = day.dateStr === checkInDateStr;
          const dObj = new Date(day.dateStr + "T00:00:00");
          const dayOfWeek = dObj.getDay();
          const isWeekend = dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0;

          const dayNum = dObj.getDate();
          const weekdayFull = dObj.toLocaleDateString(
            lang === "th" ? "th-TH" : "en-US",
            { weekday: "long" }
          );
          const weekdayShort = dObj.toLocaleDateString(
            lang === "th" ? "th-TH" : "en-US",
            { weekday: "short" }
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
              className={`group snap-start shrink-0 w-[250px] sm:w-[270px] relative flex flex-col justify-between rounded-2xl bg-white border overflow-hidden transition duration-200 ${
                !isAvailable
                  ? "opacity-60 bg-slate-50 border-slate-200 cursor-not-allowed select-none"
                  : isSelected
                  ? "border-[#0063F5] shadow-[0_10px_28px_rgba(0,99,245,0.18)] ring-2 ring-[#0063F5] cursor-pointer"
                  : isColdest
                  ? "border-[#93C5FD] hover:border-[#0063F5] hover:shadow-moder-card cursor-pointer"
                  : "border-slate-200/90 hover:border-[#0063F5] hover:shadow-moder-card cursor-pointer"
              }`}
            >
              <div>
                {/* Top Visual Area: Cool Blue Weather Header */}
                <div className="relative w-full overflow-hidden p-4 flex flex-col justify-between border-b bg-gradient-to-b from-[#EFF6FF] via-[#F8FAFC] to-white border-slate-100">
                  <div className="flex items-center justify-between gap-2 min-h-[22px]">
                    {isColdest ? (
                      <span className="rounded-full bg-[#0063F5] text-white px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-2xs">
                        <ThermometerSnowflake className="w-3 h-3" />
                        <span>
                          {lang === "th" ? "❄ หนาวสุดในรอบ 14 วัน" : "❄ COLDEST"}
                        </span>
                      </span>
                    ) : idx === 0 ? (
                      <span className="rounded-full bg-slate-900 text-white px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                        {lang === "th" ? "วันนี้ · TODAY" : "TODAY"}
                      </span>
                    ) : isWeekend ? (
                      <span className="rounded-full bg-sky-100 text-[#0063F5] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                        {lang === "th" ? "สุดสัปดาห์" : "WEEKEND"}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        FORECAST
                      </span>
                    )}

                    {!isAvailable && (
                      <span className="rounded-full bg-rose-50 text-rose-600 border border-rose-200 px-2 py-0.5 text-[10px] font-bold uppercase">
                        {lang === "th" ? "ห้องเต็ม" : "FULL"}
                      </span>
                    )}
                  </div>

                  {/* Hero: Lowest Temperature of the Day */}
                  <div className="mt-3 flex items-end justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#475467]">
                        <ThermometerSnowflake className="w-3.5 h-3.5 text-[#0063F5]" />
                        <span>
                          {lang === "th" ? "อุณหภูมิต่ำสุด" : "MIN TEMP"}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[#121317]">
                          {day.tempMin}°
                        </span>
                        <span className="text-sm font-bold text-[#0063F5]">
                          C
                        </span>
                      </div>
                    </div>

                    <div className="text-right pb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        {lang === "th" ? "สูงสุดกลางวัน" : "DAY HIGH"}
                      </span>
                      <span className="text-base font-bold text-[#334155] block">
                        {day.tempMax}°C
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Content: Prominent Date Presentation */}
                <div className="p-4 sm:p-5 flex flex-col gap-3.5">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-[#F6F8FB] border border-slate-200 px-3 py-2 text-center shrink-0 min-w-[56px] group-hover:border-[#0063F5] group-hover:bg-[#EFF6FF] transition">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-[#0063F5]">
                        {monthShort}
                      </span>
                      <span className="block text-2xl sm:text-3xl font-extrabold text-[#121317] leading-none my-0.5">
                        {dayNum}
                      </span>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        {weekdayShort}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <h3 className="font-bold text-base sm:text-lg tracking-tight leading-snug text-[#121317] group-hover:text-[#0063F5] transition-colors">
                        {weekdayFull}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {dayNum} {monthLong}
                      </p>
                    </div>
                  </div>

                  {/* Availability & Starting Price */}
                  <div className="pt-3 border-t border-slate-100 flex items-end justify-between text-xs text-[#475467]">
                    <div>
                      <span className="block font-bold text-[#121317]">
                        {isAvailable
                          ? lang === "th"
                            ? `ว่าง ${snap.freeRoomsCount} ยูนิต`
                            : `${snap.freeRoomsCount} rooms left`
                          : lang === "th"
                          ? "ไม่มีห้องว่าง"
                          : "Fully booked"}
                      </span>
                      {isAvailable && snap.isPromoDay && (
                        <span className="text-[10px] text-[#0063F5] font-semibold block">
                          {snap.promoLabelTh}
                        </span>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
                        เริ่มต้น
                      </span>
                      {isAvailable &&
                        snap.originalPriceThb > snap.startingPriceThb && (
                          <span className="text-[10px] line-through text-slate-400 block">
                            ฿{snap.originalPriceThb.toLocaleString()}
                          </span>
                        )}
                      <span className="text-lg font-extrabold text-[#0063F5]">
                        ฿{snap.startingPriceThb.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        {lang === "th" ? "/ คืน" : "/ night"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <footer className="px-4 sm:px-5 pb-4 sm:pb-5">
                <div
                  className={`w-full rounded-xl py-2.5 px-3 text-xs font-bold text-center border transition flex items-center justify-center gap-1.5 ${
                    !isAvailable
                      ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                      : isSelected
                      ? "bg-[#0F172A] border-[#0F172A] text-white"
                      : "bg-[#0063F5] border-[#0063F5] text-white group-hover:bg-[#0052CC] group-hover:border-[#0052CC] shadow-[0_4px_12px_rgba(0,99,245,0.2)]"
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
                    <span>
                      {lang === "th"
                        ? `เลือกเช็คอินวันนี้ (${day.tempMin}°C)`
                        : `SELECT DATE (${day.tempMin}°C)`}
                    </span>
                  ) : (
                    <span>เต็มแล้ว (SOLD OUT)</span>
                  )}
                </div>
              </footer>
            </article>
          );
        })}
      </div>
    </div>
  );
}
