/**
 * WeatherWidget.tsx
 *
 * Polished, self-contained weather card that can be dropped into any dashboard.
 * Accepts the values from the `useWeather` hook and renders them with a dynamic
 * sky-gradient that shifts based on the current weather condition.
 */

import React, { useMemo } from "react";
import { IonIcon } from "@ionic/react";
import { refreshOutline, waterOutline, thermometerOutline } from "ionicons/icons";
import { type WeatherData, weatherEmoji } from "../Services/weatherService";
import "./WeatherWidget.scss";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface WeatherWidgetProps {
  /** WeatherData from useWeather hook, or null while loading */
  weather: WeatherData | null;
  /** True while a fetch is in progress */
  loading: boolean;
  /** Error message if the last fetch failed */
  error?: string | null;
  /** Called when the user taps the Refresh button */
  onRefresh?: () => void;
}

// ─── Gradient palette keyed by OWM icon prefix ────────────────────────────────

type SkyTheme = {
  gradient: string;
  textColor: string;
  accent: string;
};

function getSkyTheme(iconCode: string): SkyTheme {
  const code = iconCode.slice(0, 2);
  switch (code) {
    // Clear sky (day)
    case "01":
      return {
        gradient: "linear-gradient(145deg, #2879f8 0%, #52aeff 60%, #fed552 100%)",
        textColor: "#ffffff",
        accent: "rgba(255,255,255,0.25)",
      };
    // Few clouds
    case "02":
      return {
        gradient: "linear-gradient(145deg, #3a8fcb 0%, #6db9e8 60%, #c9e8fa 100%)",
        textColor: "#ffffff",
        accent: "rgba(255,255,255,0.20)",
      };
    // Scattered / broken clouds
    case "03":
    case "04":
      return {
        gradient: "linear-gradient(145deg, #607d8b 0%, #90a4ae 60%, #cfd8dc 100%)",
        textColor: "#ffffff",
        accent: "rgba(255,255,255,0.18)",
      };
    // Shower rain
    case "09":
      return {
        gradient: "linear-gradient(145deg, #4a6fa5 0%, #647faa 60%, #a3b8cc 100%)",
        textColor: "#ffffff",
        accent: "rgba(255,255,255,0.18)",
      };
    // Rain
    case "10":
      return {
        gradient: "linear-gradient(145deg, #374fa0 0%, #5a72b5 60%, #92afd0 100%)",
        textColor: "#ffffff",
        accent: "rgba(255,255,255,0.18)",
      };
    // Thunderstorm
    case "11":
      return {
        gradient: "linear-gradient(145deg, #1a1a2e 0%, #2e3560 60%, #5c6a99 100%)",
        textColor: "#e8eaf0",
        accent: "rgba(255,255,255,0.15)",
      };
    // Snow
    case "13":
      return {
        gradient: "linear-gradient(145deg, #b0bec5 0%, #cfd8dc 60%, #eceff1 100%)",
        textColor: "#37474f",
        accent: "rgba(255,255,255,0.30)",
      };
    // Mist / fog
    case "50":
      return {
        gradient: "linear-gradient(145deg, #8d9da8 0%, #aebcc5 60%, #cdd8de 100%)",
        textColor: "#ffffff",
        accent: "rgba(255,255,255,0.20)",
      };
    default:
      return {
        gradient: "linear-gradient(145deg, #2563eb 0%, #3b82f6 60%, #60a5fa 100%)",
        textColor: "#ffffff",
        accent: "rgba(255,255,255,0.20)",
      };
  }
}

/** Format a Unix timestamp as a short "HH:MM" local time string. */
function formatTime(unixSec: number): string {
  return new Date(unixSec * 1000).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

const WeatherWidget: React.FC<WeatherWidgetProps> = ({
  weather,
  loading,
  error,
  onRefresh,
}) => {
  const skyTheme = useMemo<SkyTheme>(
    () => getSkyTheme(weather?.iconCode ?? "01d"),
    [weather?.iconCode],
  );

  // ── Skeleton ────────────────────────────────────────────────────────────────
  if (loading && !weather) {
    return (
      <div className="weather-widget weather-widget--skeleton" aria-busy="true" aria-label="Loading weather">
        <div className="ww-skeleton-row ww-sk-title" />
        <div className="ww-skeleton-main">
          <div className="ww-skeleton-circle" />
          <div className="ww-skeleton-temp" />
        </div>
        <div className="ww-skeleton-details">
          <div className="ww-skeleton-pill" />
          <div className="ww-skeleton-pill" />
          <div className="ww-skeleton-pill" />
        </div>
      </div>
    );
  }

  // ── Error state ─────────────────────────────────────────────────────────────
  if (error && !weather) {
    return (
      <div className="weather-widget weather-widget--error" role="alert">
        <span className="ww-error-icon">⚠️</span>
        <span className="ww-error-msg">{error}</span>
        {onRefresh && (
          <button className="ww-refresh-btn" onClick={onRefresh} aria-label="Retry loading weather">
            Retry
          </button>
        )}
      </div>
    );
  }

  // ── No data yet ─────────────────────────────────────────────────────────────
  if (!weather) return null;

  const { gradient, textColor, accent } = skyTheme;

  return (
    <div
      className="weather-widget"
      style={
        {
          "--ww-gradient": gradient,
          "--ww-text": textColor,
          "--ww-accent": accent,
        } as React.CSSProperties
      }
      role="region"
      aria-label={`Weather: ${weather.description}, ${weather.tempC}°C in ${weather.cityName}`}
    >
      {/* Decorative blobs for depth */}
      <span className="ww-blob ww-blob--1" aria-hidden="true" />
      <span className="ww-blob ww-blob--2" aria-hidden="true" />

      {/* Header row: city + last-updated time */}
      <div className="ww-header">
        <span className="ww-city"> {weather.cityName}</span>
        <span className="ww-updated">Updated {formatTime(weather.timestamp)}</span>
      </div>

      {/* Main row: icon + temperature + description */}
      <div className="ww-main">
        <div className="ww-icon-wrap">
          <img
            src={weather.iconUrl}
            alt={weather.description}
            className="ww-icon"
            onError={(e) => {
              const img = e.currentTarget as HTMLImageElement;
              img.style.display = "none";
              // Show emoji fallback sibling
              const fallback = img.nextElementSibling as HTMLElement | null;
              if (fallback) fallback.style.display = "block";
            }}
          />
          <span
            className="ww-icon-fallback"
            aria-hidden="true"
            style={{ display: "none" }}
          >
            {weatherEmoji(weather.iconCode)}
          </span>
        </div>

        <div className="ww-temp-block">
          <span className="ww-temp">{weather.tempC}°</span>
          <span className="ww-unit">C</span>
        </div>

        <div className="ww-desc-block">
          <span className="ww-desc">{weather.description}</span>
        </div>
      </div>

      {/* Detail pills: humidity, wind, feels-like */}
      <div className="ww-details">
        <div className="ww-detail-pill">
          <IonIcon icon={waterOutline} className="ww-detail-icon" aria-hidden="true" />
          <span className="ww-detail-value">{weather.humidity}%</span>
          <span className="ww-detail-label">Humidity</span>
        </div>

        <div className="ww-detail-pill">
          <span className="ww-detail-icon" aria-hidden="true">💨</span>
          <span className="ww-detail-value">{weather.windKmh}</span>
          <span className="ww-detail-label">km/h</span>
        </div>

        <div className="ww-detail-pill">
          <IonIcon icon={thermometerOutline} className="ww-detail-icon" aria-hidden="true" />
          <span className="ww-detail-value">{weather.feelsLikeC}°</span>
          <span className="ww-detail-label">Feels like</span>
        </div>
      </div>

      {/* Footer: refresh button */}
      {onRefresh && (
        <div className="ww-footer">
          <button
            className="ww-refresh-btn"
            onClick={onRefresh}
            aria-label="Refresh weather"
            disabled={loading}
          >
            <IonIcon
              icon={refreshOutline}
              className={`ww-refresh-icon${loading ? " ww-refresh-icon--spinning" : ""}`}
              aria-hidden="true"
            />
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      )}
    </div>
  );
};

export default WeatherWidget;
