/**
 * micPermission.ts
 *
 * Cross-platform microphone permission helper.
 *
 * Behaviour:
 *  - On Android / iOS (Capacitor hybrid):
 *      Uses the Web Permissions API (navigator.permissions.query) to check
 *      the current state. If 'denied', throws a MicPermissionDeniedError so
 *      the caller can surface a "go to Settings" message instead of a silent
 *      getUserMedia failure. If 'prompt' or 'granted', getUserMedia itself
 *      will trigger the native Android permission dialog as normal.
 *  - On web (browsers):
 *      Same logic applies; modern browsers surface the permission prompt via
 *      getUserMedia, so this is a lightweight pre-check only.
 *
 * Usage — call at the very top of any startRecording / getUserMedia block:
 *
 *   import { assertMicPermission } from '../utils/micPermission';
 *
 *   const startRecording = async () => {
 *     try {
 *       await assertMicPermission();
 *       const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
 *       // ... rest of recording setup
 *     } catch (err) {
 *       if (err instanceof MicPermissionDeniedError) {
 *         showAlert("Microphone access was denied. Please enable it in your device Settings.");
 *       } else {
 *         showAlert("Microphone access is required for voice messages.");
 *       }
 *     }
 *   };
 */

import { isPlatform } from "@ionic/react";

/**
 * Thrown when the microphone permission state is 'denied'.
 * Callers can distinguish this from other getUserMedia errors.
 */
export class MicPermissionDeniedError extends Error {
  constructor() {
    super("Microphone permission has been denied. Please enable it in Settings.");
    this.name = "MicPermissionDeniedError";
  }
}

/**
 * Checks the current microphone permission state.
 * Returns 'granted' | 'prompt' | 'denied' | 'unavailable'.
 * 'unavailable' means the Permissions API is not supported (older browsers /
 * WebViews) — in that case getUserMedia will handle the prompt itself.
 */
export async function queryMicPermission(): Promise<PermissionState | "unavailable"> {
  if (typeof navigator === "undefined" || !navigator.permissions) {
    return "unavailable";
  }
  try {
    const result = await navigator.permissions.query({ name: "microphone" as PermissionName });
    return result.state;
  } catch {
    // Some browsers / WebViews don't support querying 'microphone'
    return "unavailable";
  }
}

/**
 * Pre-flight check before calling getUserMedia({ audio: true }).
 *
 * - On hybrid (Android/iOS): throws MicPermissionDeniedError if the permission
 *   is already denied so the UI can show a "go to Settings" message.
 * - On web or when the API is unavailable: no-op; getUserMedia handles it.
 *
 * Does NOT call getUserMedia itself — the caller is responsible for that so
 * the existing MediaRecorder / Twilio / WebRTC flow is unchanged.
 */
export async function assertMicPermission(): Promise<void> {
  if (!isPlatform("hybrid")) {
    // On web, getUserMedia prompts natively — nothing extra needed.
    return;
  }

  const state = await queryMicPermission();

  if (state === "denied") {
    throw new MicPermissionDeniedError();
  }

  // 'granted' | 'prompt' | 'unavailable' — getUserMedia will handle the rest
}
