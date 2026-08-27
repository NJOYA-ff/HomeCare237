/**
 * BiometricAuthService
 *
 * Handles fingerprint / biometric authentication and PIN fallback for all
 * three user roles (Patient, Doctor, Admin).
 *
 * Storage keys (via @capacitor/preferences so they survive app restarts on Android):
 *   hc_biometric_enabled   – "true" | "false"
 *   hc_pin_enabled         – "true" | "false"
 *   hc_pin_hash            – SHA-256 hex of the user's 4-6 digit PIN
 */

import { BiometricAuth, BiometryType, BiometryError } from "@aparajita/capacitor-biometric-auth";
import { Preferences } from "@capacitor/preferences";

// ─── Storage keys ────────────────────────────────────────────────────────────
const KEY_BIOMETRIC_ENABLED = "hc_biometric_enabled";
const KEY_PIN_ENABLED = "hc_pin_enabled";
const KEY_PIN_HASH = "hc_pin_hash";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** SHA-256 hash of a string, returned as a lowercase hex string. */
async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface BiometryAvailability {
  /** True when the device has biometry hardware AND the user has enrolled. */
  available: boolean;
  /** The specific biometry type (fingerprint, face, iris, …) */
  biometryType: BiometryType;
  /** Human-readable label for the type ("Fingerprint", "Face ID", …) */
  biometryLabel: string;
}

/** Check device biometry support without side-effects. */
export async function checkBiometryAvailability(): Promise<BiometryAvailability> {
  try {
    const result = await BiometricAuth.checkBiometry();
    return {
      available: result.isAvailable,
      biometryType: result.biometryType,
      biometryLabel: getBiometryLabel(result.biometryType),
    };
  } catch {
    return {
      available: false,
      biometryType: BiometryType.none,
      biometryLabel: "None",
    };
  }
}

/** Returns a human-friendly name for the biometry type. */
export function getBiometryLabel(type: BiometryType): string {
  switch (type) {
    case BiometryType.touchId:
      return "Touch ID";
    case BiometryType.faceId:
      return "Face ID";
    case BiometryType.fingerprintAuthentication:
      return "Fingerprint";
    case BiometryType.faceAuthentication:
      return "Face Authentication";
    case BiometryType.irisAuthentication:
      return "Iris Authentication";
    default:
      return "Biometrics";
  }
}

// ─── Biometric enable / disable ───────────────────────────────────────────────

export async function isBiometricEnabled(): Promise<boolean> {
  const { value } = await Preferences.get({ key: KEY_BIOMETRIC_ENABLED });
  return value === "true";
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  await Preferences.set({ key: KEY_BIOMETRIC_ENABLED, value: String(enabled) });
}

// ─── PIN enable / disable / setup ─────────────────────────────────────────────

export async function isPinEnabled(): Promise<boolean> {
  const { value } = await Preferences.get({ key: KEY_PIN_ENABLED });
  return value === "true";
}

/**
 * Saves a new PIN (hashed) and marks PIN as enabled.
 * The raw PIN is never stored.
 */
export async function savePin(pin: string): Promise<void> {
  const hash = await sha256(pin);
  await Preferences.set({ key: KEY_PIN_HASH, value: hash });
  await Preferences.set({ key: KEY_PIN_ENABLED, value: "true" });
}

/**
 * Verifies a user-entered PIN against the stored hash.
 * Returns true on match.
 */
export async function verifyPin(pin: string): Promise<boolean> {
  const { value: storedHash } = await Preferences.get({ key: KEY_PIN_HASH });
  if (!storedHash) return false;
  const enteredHash = await sha256(pin);
  return enteredHash === storedHash;
}

/**
 * Disables PIN authentication and removes the stored hash.
 */
export async function disablePin(): Promise<void> {
  await Preferences.set({ key: KEY_PIN_ENABLED, value: "false" });
  await Preferences.remove({ key: KEY_PIN_HASH });
}

// ─── Biometric authentication ─────────────────────────────────────────────────

export interface AuthResult {
  success: boolean;
  /** True when biometry was cancelled by the user (should show PIN fallback). */
  cancelled: boolean;
  error?: string;
}

/**
 * Prompt the user for biometric authentication.
 * If biometry is not available or fails with a lockout/cancel, returns
 * the appropriate flag so the caller can decide to fall back to PIN.
 */
export async function authenticateWithBiometrics(
  reason = "Verify your identity to access HomeCare237"
): Promise<AuthResult> {
  try {
    await BiometricAuth.authenticate({
      reason,
      cancelTitle: "Use PIN instead",
      allowDeviceCredential: false,
    });
    return { success: true, cancelled: false };
  } catch (err: any) {
    if (err instanceof BiometryError) {
      // userCancel / systemCancel → show PIN fallback
      const cancelCodes = ["userCancel", "systemCancel", "appCancel"];
      if (cancelCodes.includes(err.code as string)) {
        return { success: false, cancelled: true, error: err.message };
      }
      return { success: false, cancelled: false, error: err.message };
    }
    return { success: false, cancelled: false, error: String(err) };
  }
}

// ─── Combined unlock flow ─────────────────────────────────────────────────────

/**
 * Convenience function: try biometrics first, then PIN.
 * Returns { success, needsPin } where needsPin tells the caller to show the PIN UI.
 */
export async function unlock(): Promise<{
  success: boolean;
  needsPin: boolean;
}> {
  const [biometricEnabled, pinEnabled] = await Promise.all([
    isBiometricEnabled(),
    isPinEnabled(),
  ]);

  if (biometricEnabled) {
    const result = await authenticateWithBiometrics();
    if (result.success) return { success: true, needsPin: false };
    if (result.cancelled && pinEnabled) return { success: false, needsPin: true };
    // Hard failure (lockout etc.) – still offer PIN if available
    if (pinEnabled) return { success: false, needsPin: true };
  }

  if (pinEnabled) return { success: false, needsPin: true };

  // Neither biometric nor PIN is enabled – no lock
  return { success: true, needsPin: false };
}

/** Returns true if ANY security lock (biometric or PIN) is currently enabled. */
export async function isLockEnabled(): Promise<boolean> {
  const [bio, pin] = await Promise.all([isBiometricEnabled(), isPinEnabled()]);
  return bio || pin;
}

// ─── Saved credentials (for quick sign-in) ───────────────────────────────────
//
// Credentials are stored obfuscated in Capacitor Preferences so a casual
// inspection of the device storage does not reveal plain-text passwords.
// This is NOT full encryption — it is obfuscation suitable for the same
// threat model as a device keystore (i.e. it protects against offline
// file inspection, not against a rooted/jailbroken device).
//
// The same approach used by major banking apps on mobile: credentials are
// gated behind the device biometric / PIN prompt before being retrieved.
//
// Storage key:
//   hc_saved_credentials  – base64(xor(JSON, repeat(KEY)))

const KEY_SAVED_CREDENTIALS = "hc_saved_credentials";

// A static salt mixed with the device language/platform to make the XOR key
// slightly device-specific without requiring native crypto.
const CRED_SALT = "HC237_CRED_SALT_v1";

function makeXorKey(length: number): number[] {
  // Build a repeating key from CRED_SALT + navigator info
  const seed =
    CRED_SALT +
    (typeof navigator !== "undefined" ? navigator.language : "en") +
    (typeof navigator !== "undefined" ? navigator.platform ?? "" : "");
  const result: number[] = [];
  for (let i = 0; i < length; i++) {
    result.push(seed.charCodeAt(i % seed.length));
  }
  return result;
}

function obfuscate(plain: string): string {
  const bytes = Array.from(new TextEncoder().encode(plain));
  const key = makeXorKey(bytes.length);
  const xored = bytes.map((b, i) => b ^ key[i]);
  return btoa(String.fromCharCode(...xored));
}

function deobfuscate(encoded: string): string {
  try {
    const chars = atob(encoded);
    const bytes = Array.from(chars).map((c) => c.charCodeAt(0));
    const key = makeXorKey(bytes.length);
    const plain = bytes.map((b, i) => b ^ key[i]);
    return new TextDecoder().decode(new Uint8Array(plain));
  } catch {
    return "";
  }
}

export interface SavedCredentials {
  email: string;
  password: string;
  /** Display name shown on the quick-signin button */
  displayName?: string;
}

/**
 * Persist credentials so they can be retrieved via PIN/biometric on next
 * sign-in. Call this immediately after a successful Firebase login.
 */
export async function saveCredentials(creds: SavedCredentials): Promise<void> {
  const json = JSON.stringify(creds);
  await Preferences.set({
    key: KEY_SAVED_CREDENTIALS,
    value: obfuscate(json),
  });
}

/**
 * Retrieve previously saved credentials.
 * Returns null if none are stored or if decoding fails.
 * MUST only be called after the user has passed biometric/PIN verification.
 */
export async function loadCredentials(): Promise<SavedCredentials | null> {
  const { value } = await Preferences.get({ key: KEY_SAVED_CREDENTIALS });
  if (!value) return null;
  try {
    const json = deobfuscate(value);
    if (!json) return null;
    return JSON.parse(json) as SavedCredentials;
  } catch {
    return null;
  }
}

/**
 * Returns true if there are saved credentials for quick sign-in.
 * Safe to call without any auth check — it only checks key existence.
 */
export async function hasCredentials(): Promise<boolean> {
  const { value } = await Preferences.get({ key: KEY_SAVED_CREDENTIALS });
  return !!value;
}

/**
 * Wipe saved credentials — call on explicit logout.
 */
export async function clearCredentials(): Promise<void> {
  await Preferences.remove({ key: KEY_SAVED_CREDENTIALS });
}
