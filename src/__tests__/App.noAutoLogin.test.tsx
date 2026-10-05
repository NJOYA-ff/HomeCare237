/**
 * Startup behaviour: HomeCare237 must never log the user in automatically.
 *
 * Firebase Auth persists sessions across app launches (Capacitor WebView
 * storage on Android/iOS, localStorage in the browser), so on startup
 * `auth.currentUser` still holds the user from the previous session. This
 * test simulates that situation and asserts the app still lands on the
 * public landing page (the entry point to the login interface) and that the
 * restored session is signed out instead of being auto-restored.
 *
 * The session is ended with authService.endSession(), NOT authService.logout():
 * wiping the saved credential would leave the user with no quick sign-in the
 * second time they open a sign-in page.
 *
 * Every test here marks the first-run services showcase as already seen. That
 * gate plays *instead of* the landing page on a genuinely fresh device, which
 * is the behaviour covered separately by FirstRunShowcase.firstRun.test.tsx.
 * These tests are about session restore, so the gate is pre-satisfied to keep
 * them pointed at the landing page.
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** Mirrors KEY in utils/firstRunShowcase.ts (the localStorage fallback). */
const SHOWCASE_FLAG = "hc_services_showcase_seen_v1";

const mocks = vi.hoisted(() => ({
  // A user restored from a previous launch by Firebase persistence.
  fakeAuthUser: { uid: "doctor-1" },
  signOut: vi.fn(async () => {}),
  getRedirectResult: vi.fn(async () => null),
  // Quick sign-in credential storage (BiometricAuthService).
  clearCredentials: vi.fn(async () => {}),
  saveCredentials: vi.fn(async () => {}),
  // If the app ever auto-restores the session again, findUserInCollections
  // finds this doctor and renders the doctor dashboard (test then fails).
  getDoc: vi.fn(async () => ({
    exists: () => true,
    data: () => ({
      name: "Dr. Auto Login",
      email: "auto@login.test",
      role: "doctor",
      isActive: true,
      isEnabled: true,
      isVerified: true,
    }),
  })),
}));

vi.mock("../firebaseconfig", () => ({
  // `auth.currentUser` set: simulates a session restored by Firebase
  // persistence from a previous app launch.
  auth: { currentUser: mocks.fakeAuthUser },
  db: {},
  storage: {},
  messaging: null,
}));

vi.mock("firebase/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("firebase/auth")>();
  return {
    ...actual,
    // Keep the SDK quiet in jsdom: no real Auth instance is wired up.
    getAuth: () => ({ currentUser: null, onAuthStateChanged: () => () => {} }),
    onAuthStateChanged: () => () => {},
    signOut: mocks.signOut,
    getRedirectResult: mocks.getRedirectResult,
  };
});

vi.mock("firebase/firestore", async (importOriginal) => {
  const actual = await importOriginal<typeof import("firebase/firestore")>();
  return { ...actual, doc: vi.fn(() => ({})), getDoc: mocks.getDoc };
});

// Only the two credential helpers are replaced; the rest of the module stays real.
vi.mock("../utils/BiometricAuthService", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../utils/BiometricAuthService")>();
  return {
    ...actual,
    clearCredentials: mocks.clearCredentials,
    saveCredentials: mocks.saveCredentials,
  };
});

import App, { authService } from "../App";

describe("App startup login flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem(SHOWCASE_FLAG, "true");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("shows the landing/login entry point instead of auto-restoring the persisted session", async () => {
    render(<App />);

    // Landing page (public entry to the login interface) must be shown.
    // French, not "Sign in": the app defaults to French (SettingsContext), and
    // the landing CTA is now driven by t("funnel_sign_in") rather than a
    // hardcoded string.
    expect(
      await screen.findByText("Se connecter", {}, { timeout: 10000 })
    ).toBeInTheDocument();

    // The persisted session must have been ended, not restored.
    expect(mocks.signOut).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/Dr\. Auto Login/i)).not.toBeInTheDocument();
  });

  it("keeps the saved credential so quick sign-in works on the second visit", async () => {
    const endSession = vi.spyOn(authService, "endSession");
    const logout = vi.spyOn(authService, "logout");

    render(<App />);
    await screen.findByText("Se connecter", {}, { timeout: 10000 });

    // Startup must go through endSession()…
    await waitFor(() => expect(endSession).toHaveBeenCalled());
    // …never logout(), which would wipe the quick sign-in credential…
    expect(logout).not.toHaveBeenCalled();
    // …and the credential must still be on the device.
    expect(mocks.clearCredentials).not.toHaveBeenCalled();
  });
});
