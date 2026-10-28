"use client";

import { useEffect, useState } from "react";

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

function buildFallbackDailyForecasts(daysCount: number = 14): DailyForecastItem[] {
  const baseDate = new Date();
  return Array.from({ length: daysCount }, (_, dayOffset) => {
    const targetDate = new Date(baseDate);
    targetDate.setDate(baseDate.getDate() + dayOffset);
    const fullYear = targetDate.getFullYear();
    const monthNumber = String(targetDate.getMonth() + 1).padStart(2, "0");
    const dayOfMonth = String(targetDate.getDate()).padStart(2, "0");
    const tempMax = 28 - (dayOffset % 3);
    const tempMin = 19 + (dayOffset % 2);

    return {
      dateStr: `${fullYear}-${monthNumber}-${dayOfMonth}`,
      tempMax,
      tempMin,
      tempAvg: Math.round((tempMax + tempMin) / 2),
    };
  });
}

export function useResortWeather(latitude: number, longitude: number) {
  const [weather, setWeather] = useState<LiveWeatherData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isCancelled = false;

    async function fetchResortWeather() {
      setIsLoading(true);
      try {
        const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&daily=temperature_2m_max,temperature_2m_min&timezone=Asia%2FBangkok&forecast_days=14`;
        const response = await fetch(forecastUrl);
        if (!response.ok) {
          throw new Error("Weather forecast request failed");
        }

        const weatherPayload = await response.json();
        if (isCancelled) {
          return;
        }

        const dailyDateStrings: string[] = weatherPayload?.daily?.time ?? [];
        const maxTemperatures: number[] =
          weatherPayload?.daily?.temperature_2m_max ?? [];
        const minTemperatures: number[] =
          weatherPayload?.daily?.temperature_2m_min ?? [];

        const dailyForecasts: DailyForecastItem[] = dailyDateStrings.map(
          (dateStr, index) => {
            const tempMax = Math.round(maxTemperatures[index] ?? 28);
            const tempMin = Math.round(minTemperatures[index] ?? 19);
            return {
              dateStr,
              tempMax,
              tempMin,
              tempAvg: Math.round((tempMax + tempMin) / 2),
            };
          }
        );

        setWeather({
          currentTemp: Math.round(weatherPayload?.current?.temperature_2m ?? 25),
          daily: dailyForecasts,
          fetchedAtIso: new Date().toISOString(),
        });
      } catch {
        if (!isCancelled) {
          setWeather({
            currentTemp: 25,
            daily: buildFallbackDailyForecasts(14),
            fetchedAtIso: new Date().toISOString(),
          });
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchResortWeather();

    return () => {
      isCancelled = true;
    };
  }, [latitude, longitude]);

  return { weather, loading: isLoading, isLoading };
}
