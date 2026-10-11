/**
 * weatherService.ts
 *
 * Fetches current weather from the OpenWeatherMap API using the device's
 * GPS coordinates obtained from useLocationTracking.
 *
 * API key is read from the VITE_WHEATHER_API_KEY environment variable.
 * Docs: https://openweathermap.org/current
 */

const OWM_BASE_URL = "https://api.openweathermap.org/data/2.5";
const API_KEY = import.meta.env.VITE_WHEATHER_API_KEY as string;

// ─── Public types ─────────────────────────────────────────────────────────────

export interface WeatherData {
  /** Short description e.g. "Partly Cloudy" */
  description: string;
  /** Temperature in Celsius */
  tempC: number;
  /** Feels-like temperature in Celsius */
  feelsLikeC: number;
  /** Humidity percentage 0-100 */
  humidity: number;
  /** Wind speed in km/h */
  windKmh: number;
  /** OWM icon code e.g. "01d" */
  iconCode: string;
  /** Full URL to the weather icon (50×50 PNG) */
  iconUrl: string;
  /** City name resolved by OWM */
  cityName: string;
  /** Unix timestamp (seconds) of the observation */
  timestamp: number;
}

// ─── Raw OWM response shape (only what we need) ───────────────────────────────

interface OWMResponse {
  name: string;
  dt: number;
  weather: { description: string; icon: string }[];
  main: { temp: number; feels_like: number; humidity: number };
  wind: { speed: number };
}

// ─── Fetch helper ─────────────────────────────────────────────────────────────

/**
 * Fetches current weather for the given coordinates.
 * Throws if the API key is missing or the network request fails.
 *
 * @param lat  Latitude from GPS
 * @param lng  Longitude from GPS
 */
export async function fetchWeatherByCoords(
  lat: number,
  lng: number,
): Promise<WeatherData> {
  if (!API_KEY) {
    throw new Error("VITE_WHEATHER_API_KEY is not set in the environment.");
  }

  const url = new URL(`${OWM_BASE_URL}/weather`);
  url.searchParams.set("lat",   String(lat));
  url.searchParams.set("lon",   String(lng));
  url.searchParams.set("appid", API_KEY);
  url.searchParams.set("units", "metric");   // Celsius
  url.searchParams.set("lang",  "en");

  const res = await fetch(url.toString());

  if (!res.ok) {
    throw new Error(`OpenWeatherMap error ${res.status}: ${res.statusText}`);
  }

  const json: OWMResponse = await res.json();

  const weather = json.weather?.[0];
  const iconCode = weather?.icon ?? "01d";

  return {
    description:  capitalise(weather?.description ?? ""),
    tempC:        Math.round(json.main.temp),
    feelsLikeC:   Math.round(json.main.feels_like),
    humidity:     json.main.humidity,
    windKmh:      Math.round((json.wind?.speed ?? 0) * 3.6), // m/s → km/h
    iconCode,
    iconUrl:      `https://openweathermap.org/img/wn/${iconCode}@2x.png`,
    cityName:     json.name,
    timestamp:    json.dt,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function capitalise(str: string): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Returns a simple emoji for the OWM icon code so we have a text fallback
 * when the icon image fails to load.
 */
export function weatherEmoji(iconCode: string): string {
  const code = iconCode.slice(0, 2); // "01", "02", … "13"
  const map: Record<string, string> = {
    "01": "☀️",
    "02": "⛅",
    "03": "☁️",
    "04": "☁️",
    "09": "🌧️",
    "10": "🌦️",
    "11": "⛈️",
    "13": "❄️",
    "50": "🌫️",
  };
  return map[code] ?? "🌡️";
}
