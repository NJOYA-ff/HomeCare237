/**
 * Quick sign-in credential storage.
 *
 * The user signs in once (authService.login → saveCredentials) and expects
 * one-tap PIN/biometric sign-in the second time they open a sign-in page.
 * That only works if the credential written during the first visit is still
 * readable on the next one, so these tests run the real module against an
 * in-memory Preferences store and pin:
 *   - credentials written at login are readable on the next visit
 *   - the password is never kept in plain text on the device
 *   - quick sign-in stays unavailable until a lock (PIN/fingerprint) is set up
 *   - only an explicit logout wipes them
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ store: new Map<string, string>() }));

vi.mock("@capacitor/preferences", () => ({
  Preferences: {
    get: async ({ key }: { key: string }) => ({
      value: mocks.store.has(key) ? (mocks.store.get(key) as string) : null,
    }),
    set: async ({ key, value }: { key: string; value: string }) => {
      mocks.store.set(key, value);
    },
    remove: async ({ key }: { key: string }) => {
      mocks.store.delete(key);
    },
    clear: async () => {
      mocks.store.clear();
    },
    keys: async () => Array.from(mocks.store.keys()),
  },
}));

import {
  clearCredentials,
  hasCredentials,
  isBiometricEnabled,
  isPinEnabled,
  loadCredentials,
  saveCredentials,
  savePin,
  setBiometricEnabled,
  verifyPin,
} from "../BiometricAuthService";

/** What authService.login() stores after a successful email/password login. */
const LOGIN = {
  email: "patient@homecare237.cm",
  password: "S3cret!pass",
  displayName: "Njoya P.",
};

// Must match KEY_SAVED_CREDENTIALS in BiometricAuthService (pins the key name
// so a rename can't silently orphan already-saved credentials on device).
const CREDENTIAL_KEY = "hc_saved_credentials";
const PIN_HASH_KEY = "hc_pin_hash";

describe("BiometricAuthService quick sign-in credentials", () => {
  beforeEach(() => {
    mocks.store.clear();
  });

  it("keeps the credential written at login readable on the next visit", async () => {
    // ── First visit: nothing saved yet, user logs in with email + password ──
    expect(await hasCredentials()).toBe(false);
    await saveCredentials(LOGIN);

    // ── Second visit: QuickSignIn re-reads storage and must still find it ───
    expect(await hasCredentials()).toBe(true);
    expect(await loadCredentials()).toEqual(LOGIN);
  });

  it("never keeps the password in plain text on the device", async () => {
    await saveCredentials(LOGIN);

    const raw = mocks.store.get(CREDENTIAL_KEY) ?? "";
    expect(raw).not.toBe("");
    expect(raw).not.toContain(LOGIN.password);
    expect(raw).not.toContain(LOGIN.email);
    // …but it still decodes back to exactly what was saved.
    expect(await loadCredentials()).toEqual(LOGIN);
  });

  it("unlocks quick sign-in once a PIN or fingerprint is set up", async () => {
    await saveCredentials(LOGIN);

    // No lock configured (fresh install) → the QuickSignIn gate stays closed.
    expect(await isPinEnabled()).toBe(false);
    expect(await isBiometricEnabled()).toBe(false);

    await savePin("1234"); // Settings → "Set Up PIN"
    expect(await isPinEnabled()).toBe(true);
    expect(await verifyPin("1234")).toBe(true);
    expect(await verifyPin("0000")).toBe(false);

    await setBiometricEnabled(true);
    expect(await isBiometricEnabled()).toBe(true);
  });

  it("stores only the PIN hash, never the PIN itself", async () => {
    await savePin("1234");

    const stored = mocks.store.get(PIN_HASH_KEY) ?? "";
    expect(stored).not.toBe("1234");
    expect(stored).toMatch(/^[0-9a-f]{64}$/); // sha-256 hex
  });

  it("forgets the credential only on an explicit logout", async () => {
    await saveCredentials(LOGIN);
    await clearCredentials(); // authService.logout()

    expect(await hasCredentials()).toBe(false);
    expect(await loadCredentials()).toBeNull();
  });
});
