/**
 * healthAiService.ts
 *
 * Client for the HomeCare237 **AI health care tips** feature displayed on the
 * patient Health Education page.
 *
 * The Gemini API key never reaches the browser: every request is proxied by
 * the local API server (`server/twilio-function.cjs` →
 * `POST /api/ai/health-tips`). When the model is unreachable or not configured
 * the caller falls back to the bundled articles, so the page always shows
 * something useful.
 *
 * Optional env (see .env):
 *   VITE_API_BASE_URL    base URL of the API server (needed for native builds)
 *   VITE_AI_TIMEOUT_MS   request timeout in ms (default 20000)
 */

export interface HealthTip {
  title: string;
  detail: string;
}

export type HealthAiErrorCode =
  | "AI_NOT_CONFIGURED"
  | "AI_UPSTREAM_ERROR"
  | "AI_EMPTY_RESPONSE"
  | "AI_RATE_LIMITED"
  | "AI_TIMEOUT"
  | "AI_OFFLINE";

export type HealthTipsResult =
  | {
      ok: true;
      tips: HealthTip[];
      topic: string;
      language: string;
      generatedAt: string;
      /** False when the payload was served from the offline cache. */
      live: boolean;
    }
  | { ok: false; code: HealthAiErrorCode };

export interface AiHealthTopic {
  /** Id understood by the server — keep in sync with AI_TOPICS. */
  id: string;
  /** Translation key resolved through useSettings().t(). */
  labelKey: string;
}

/** Disease / wellbeing topics offered as chips on the Health Education page. */
export const AI_HEALTH_TOPICS: AiHealthTopic[] = [
  { id: "mpox", labelKey: "topicMpox" },
  { id: "malaria", labelKey: "topicMalaria" },
  { id: "cholera", labelKey: "topicCholera" },
  { id: "typhoid", labelKey: "topicTyphoid" },
  { id: "dengue", labelKey: "topicDengue" },
  { id: "diarrhoea", labelKey: "topicDiarrhoea" },
  { id: "tuberculosis", labelKey: "topicTuberculosis" },
  { id: "hygiene", labelKey: "topicHygiene" },
  { id: "nutrition", labelKey: "topicNutrition" },
  { id: "maternal", labelKey: "topicMaternal" },
  { id: "mental", labelKey: "topicMental" },
  { id: "general", labelKey: "topicGeneral" },
];

export const DEFAULT_AI_TOPIC = "malaria";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");
const REQUEST_TIMEOUT_MS = Number(import.meta.env.VITE_AI_TIMEOUT_MS) || 20000;
const CACHE_PREFIX = "hc_ai_tips_";

const cacheKey = (topic: string, language: string) =>
  `${CACHE_PREFIX}${language}_${topic}`;

const writeCache = (result: Extract<HealthTipsResult, { ok: true }>) => {
  try {
    localStorage.setItem(
      cacheKey(result.topic, result.language),
      JSON.stringify(result),
    );
  } catch (err) {
    console.warn("AI tips cache write failed:", err);
  }
};

/**
 * Ask the AI for fresh health care tips about `topic`.
 * Never throws — inspect `result.ok` and show only tips cached from an
 * earlier assistant response when it fails.
 */
export const fetchHealthTips = async (
  params: {
    topic?: string;
    language?: "en" | "fr";
    count?: number;
  } = {},
): Promise<HealthTipsResult> => {
  const { topic = DEFAULT_AI_TOPIC, language = "fr", count = 4 } = params;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE}/api/ai/health-tips`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, language, count }),
      signal: controller.signal,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok || !data || data.success !== true) {
      const code = (data && data.error) as HealthAiErrorCode | undefined;
      return { ok: false, code: code || "AI_UPSTREAM_ERROR" };
    }

    const tips = Array.isArray(data.tips) ? (data.tips as HealthTip[]) : [];
    if (!tips.length) return { ok: false, code: "AI_EMPTY_RESPONSE" };

    const result: Extract<HealthTipsResult, { ok: true }> = {
      ok: true,
      tips,
      topic: String(data.topic || topic),
      language: String(data.language || language),
      generatedAt: String(data.generatedAt || new Date().toISOString()),
      live: true,
    };
    writeCache(result);
    return result;
  } catch (err) {
    // A blocked or aborted request surfaces as an AbortError.
    const aborted = (err as { name?: string })?.name === "AbortError";
    return { ok: false, code: aborted ? "AI_TIMEOUT" : "AI_OFFLINE" };
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Read the last successful tips for a topic from localStorage, so the section
 * still renders offline (returned with `live: false`).
 */
export const readCachedTips = (
  topic: string = DEFAULT_AI_TOPIC,
  language: "en" | "fr" = "fr",
): HealthTipsResult | null => {
  try {
    const raw = localStorage.getItem(cacheKey(topic, language));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.ok === true && Array.isArray(parsed.tips) && parsed.tips.length) {
      return { ...parsed, live: false } as HealthTipsResult;
    }
  } catch (err) {
    console.warn("AI tips cache read failed:", err);
  }
  return null;
};

/** Translation key for the notice shown when the AI tips could not load. */
export const aiErrorTranslationKey = (code: HealthAiErrorCode): string =>
  code === "AI_NOT_CONFIGURED" ? "aiTipsNotConfigured" : "aiTipsOffline";