/**
 * The public sign-in pages must offer quick sign-in (PIN / biometric)
 * whenever the user has a saved credential and a lock enabled.
 *
 * Regression guard for the QuickSignIn wiring: the component exists, but a
 * refactor once removed it from PatientSignin / DoctorSignin / AdminSignin,
 * which silently took the one-tap sign-in away from every user. These tests
 * render the real pages and assert the button is on them.
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  hasCredentials: vi.fn(async () => true),
  loadCredentials: vi.fn(async () => ({
    email: "patient@homecare237.cm",
    password: "S3cret!pass",
    displayName: "Njoya P.",
  })),
  isBiometricEnabled: vi.fn(async () => false),
  isPinEnabled: vi.fn(async () => true),
  checkBiometryAvailability: vi.fn(async () => ({
    available: false,
    biometryType: 0,
    biometryLabel: "Fingerprint",
  })),
  authenticateWithBiometrics: vi.fn(async () => ({
    success: true,
    cancelled: false,
  })),
  verifyPin: vi.fn(async () => true),
}));

vi.mock("../utils/BiometricAuthService", () => mocks);

// The pages only use authService on submit; no Firebase import needed here.
vi.mock("../App", () => ({
  UserRole: { Patient: "patient", Doctor: "doctor", Admin: "admin" },
  authService: {
    login: vi.fn(async () => null),
    login1: vi.fn(async () => null),
    loginWithGoogle: vi.fn(async () => null),
  },
}));

import PatientSignin from "../pages/PatientSignin";
import DoctorSignin from "../pages/DoctorSignin";
import AdminSignin from "../pages/AdminSignin";
import { SettingsProvider, translations } from "../context/SettingsContext";

// The sign-in pages localise their own copy, so they read from SettingsContext
// and will throw outside a provider. Rendering the real provider (rather than a
// stub) keeps the assertions below honest: the label is only found if the string
// is genuinely produced by the EN table.
//
// The app defaults to French and SettingsProvider seeds its language from
// localStorage on first render, so hc_language is pinned to "en" here. Without
// it these tests looked for "Quick sign in" on a screen correctly rendering
// "Connexion rapide", which is exactly the regression they exist to catch —
// just reported in the wrong language.
const renderPage = (page: React.ReactElement) => {
  localStorage.setItem("hc_language", "en");
  return render(
    <SettingsProvider>
      <MemoryRouter>{page}</MemoryRouter>
    </SettingsProvider>,
  );
};

/**
 * The quick sign-in button on the three sign-in pages.
 *
 * Its accessible name is the localised action label, which changes with the
 * active lock method — so this resolves through the dictionary rather than
 * hardcoding a string that localization is free to reword.
 */
const findQuickSignInButton = () =>
  screen.findByRole("button", { name: translations.en.qs_with_pin });

describe("sign-in pages quick sign-in access", () => {
  it("offers PIN quick sign-in on the patient sign-in page", async () => {
    renderPage(<PatientSignin />);

    const button = await findQuickSignInButton();
    expect(button).toHaveTextContent("Sign in with PIN");
    expect(button).toHaveTextContent("Njoya P.");
  });

  it("offers PIN quick sign-in on the doctor sign-in page", async () => {
    renderPage(<DoctorSignin />);

    expect(await findQuickSignInButton()).toHaveTextContent("Sign in with PIN");
  });

  it("offers PIN quick sign-in on the admin sign-in page", async () => {
    renderPage(<AdminSignin />);

    expect(await findQuickSignInButton()).toHaveTextContent("Sign in with PIN");
  });
});
