/**
 * useWeather.ts
 *
 * Fetches and caches current weather for the user's GPS position.
 *
 * - Waits until a valid GeolocationPosition is available.
 * - Automatically re-fetches every REFRESH_INTERVAL_MS (10 minutes).
 * - Re-fetches when the position changes significantly (> ~1 km).
 * - Exposes loading / error states.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import {
  fetchWeatherByCoords,
  type WeatherData,
} from "../components/Services/weatherService";

/** Minimum distance (degrees, ~1 km) before triggering a fresh weather fetch. */
const MIN_DELTA_DEG = 0.01;

/** How often to automatically refresh weather (10 minutes). */
const REFRESH_INTERVAL_MS = 10 * 60 * 1000;

export interface UseWeatherReturn {
  weather: WeatherData | null;
  weatherLoading: boolean;
  weatherError: string | null;
  /** Call this to force an immediate refresh */
  refreshWeather: () => void;
}

/**
 * Custom hook that fetches weather data based on GPS position.
 *
 * @param position  GeolocationPosition from useLocationTracking (or null)
 */
export function useWeather(
  position: GeolocationPosition | null,
): UseWeatherReturn {
  const [weather, setWeather]             = useState<WeatherData | null>(null);
  const [weatherLoading, setLoading]      = useState(false);
  const [weatherError, setWeatherError]   = useState<string | null>(null);

  // Track last coordinates we fetched for, to avoid redundant requests
  const lastFetchedCoordsRef = useRef<{ lat: number; lng: number } | null>(null);
  const timerRef             = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchWeather = useCallback(
    async (lat: number, lng: number) => {
      setLoading(true);
      setWeatherError(null);
      try {
        const data = await fetchWeatherByCoords(lat, lng);
        setWeather(data);
        lastFetchedCoordsRef.current = { lat, lng };
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to load weather";
        setWeatherError(msg);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Fetch weather whenever the position changes significantly
  useEffect(() => {
    if (!position) return;

    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    const last = lastFetchedCoordsRef.current;

    // Skip if we have recent data and position hasn't moved much
    const hasMoved =
      !last ||
      Math.abs(lat - last.lat) > MIN_DELTA_DEG ||
      Math.abs(lng - last.lng) > MIN_DELTA_DEG;

    if (!hasMoved && weather) return;

    fetchWeather(lat, lng);
  }, [position, fetchWeather, weather]);

  // Periodic auto-refresh every 10 minutes
  useEffect(() => {
    timerRef.current = setInterval(() => {
      if (position) {
        fetchWeather(position.coords.latitude, position.coords.longitude);
      }
    }, REFRESH_INTERVAL_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [position, fetchWeather]);

  const refreshWeather = useCallback(() => {
    if (position) {
      // Reset last-fetched coords so next call is forced
      lastFetchedCoordsRef.current = null;
      fetchWeather(position.coords.latitude, position.coords.longitude);
    }
  }, [position, fetchWeather]);

  return { weather, weatherLoading, weatherError, refreshWeather };
}
