/**
 * apiBase.ts
 *
 * Resolves the base URL for the HomeCare237 API server.
 *
 * Resolution order
 * ────────────────
 * 1. VITE_API_BASE_URL environment variable (set in .env / .env.local).
 *    Use this to point at the local dev server (http://localhost:3400) or any
 *    custom deployment.
 *
 * 2. Firebase Cloud Functions URL (hardcoded fallback).
 *    Used automatically in every production Android/iOS build where
 *    VITE_API_BASE_URL is empty — Vite strips all VITE_ vars from the
 *    compiled bundle unless they are explicitly set at build time.
 *
 * Path mapping (Firebase Functions vs local Express server)
 * ─────────────────────────────────────────────────────────
 *  Local Express path             Firebase Function name
 *  /api/twilio/token         →    twilioToken
 *  /api/twilio/video-token   →    twilioToken  (type:"video" in body)
 *  /api/twilio/voice-token   →    twilioToken  (type:"voice" in body)
 *  /api/twilio/voice         →    twilioVoiceWebhook
 *  /api/twilio/send          →    twilioSms
 *
 * Callers should use getApiUrl() which maps paths automatically.
 */

/** Must match .firebaserc and firebase.json */
const FIREBASE_PROJECT_ID = "homecare-1c228";
const FIREBASE_REGION     = "us-central1";

/**
 * Returns the API base URL.
 *
 * Dev  (VITE_API_BASE_URL=http://localhost:3400) → "http://localhost:3400"
 * Prod (VITE_API_BASE_URL not set in APK build)  → Firebase Functions base
 */
export function getApiBase(): string {
  const envBase: string =
    typeof import.meta !== "undefined" &&
    (import.meta as any).env?.VITE_API_BASE_URL
      ? String((import.meta as any).env.VITE_API_BASE_URL).replace(/\/+$/, "")
      : "";

  if (envBase) return envBase;

  // Production fallback — Firebase Cloud Functions
  return `https://${FIREBASE_REGION}-${FIREBASE_PROJECT_ID}.cloudfunctions.net`;
}

/**
 * Maps a legacy Express path to the correct endpoint for whatever backend
 * is currently in use (local dev server or Firebase Functions).
 *
 * Usage:
 *   const url = getApiUrl("/api/twilio/token");
 *   await fetch(url, { method: "POST", body: JSON.stringify({ ... }) });
 */
export function getApiUrl(legacyPath: string): string {
  const base       = getApiBase();
  const isFirebase = base.includes("cloudfunctions.net");

  if (!isFirebase) {
    // Local Express server — use paths as-is
    return `${base}${legacyPath}`;
  }

  // Map Express paths to Firebase Function names
  const pathMap: Record<string, string> = {
    "/api/twilio/token":                   "twilioToken",
    "/api/twilio/video-token":             "twilioToken",
    "/api/twilio/voice-token":             "twilioToken",
    "/api/twilio/voice":                   "twilioVoiceWebhook",
    "/api/twilio/send":                    "twilioSms",
    "/api/twilio/send-appointment-status": "twilioSms",
  };

  const fnName = pathMap[legacyPath];
  if (fnName) return `${base}/${fnName}`;

  // Unknown path — forward as-is (best-effort)
  return `${base}${legacyPath}`;
}
