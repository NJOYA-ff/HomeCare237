/**
 * Quick sign-in (PIN / biometric) on the sign-in pages.
 *
 * Regression guard: QuickSignIn was once dropped from the sign-in pages, so
 * users who had enabled PIN / fingerprint lost the one-tap way back into
 * their account. These tests pin the behaviour of the component rendered by
 * PatientSignin / DoctorSignin / AdminSignin:
 *   - hidden when there are no saved credentials
 *   - hidden when neither PIN nor biometric is enabled
 *   - shows the "Sign in with PIN" button + saved user name
 *   - a correct 4-digit PIN hands the saved credentials to the parent
 *   - a wrong PIN shows an error and never signs the user in
 *   - biometric sign-in is used when fingerprint is enabled and available
 */
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

/** Credentials saved by authService.login() after a previous manual login. */
const SAVED = {
  email: "patient@homecare237.cm",
  password: "S3cret!pass",
  displayName: "Njoya P.",
};

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
  verifyPin: vi.fn(async (pin: string) => pin === "1234"),
}));

// The component only talks to the app for these seven helpers; mocking the
// whole module keeps jsdom away from the native biometric plugin.
vi.mock("../utils/BiometricAuthService", () => mocks);

import QuickSignIn from "../components/QuickSignIn";
import { SettingsProvider, translations } from "../context/SettingsContext";

/**
 * QuickSignIn localises its own copy, so it reads from SettingsContext and
 * throws outside a provider. Rendering the real provider (rather than stubbing
 * `t`) keeps the assertions below honest: every string is looked up through the
 * same EN dictionary the app uses.
 *
 * The app defaults to French, and SettingsProvider seeds its language from
 * localStorage on first render. Pinning hc_language to "en" before each render
 * is what makes the English expectations below valid — without it these tests
 * were asserting against French copy and failing for the right reason.
 */
const renderQuickSignIn = (ui: React.ReactElement) => {
  localStorage.setItem("hc_language", "en");
  return render(<SettingsProvider>{ui}</SettingsProvider>);
};

/** Tap a PIN on the on-screen keypad (one button per digit). */
const typePin = (pin: string) => {
  for (const digit of pin) {
    fireEvent.click(screen.getByRole("button", { name: digit }));
  }
};

/** Let pending promise callbacks and React flushes settle. */
const flushAsync = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("QuickSignIn", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.hasCredentials.mockResolvedValue(true);
    mocks.loadCredentials.mockResolvedValue(SAVED);
    mocks.isBiometricEnabled.mockResolvedValue(false);
    mocks.isPinEnabled.mockResolvedValue(true);
    mocks.checkBiometryAvailability.mockResolvedValue({
      available: false,
      biometryType: 0,
      biometryLabel: "Fingerprint",
    });
    mocks.verifyPin.mockImplementation(async (pin: string) => pin === "1234");
  });

  it("renders nothing when there are no saved credentials", async () => {
    mocks.hasCredentials.mockResolvedValue(false);
    const { container } = renderQuickSignIn(<QuickSignIn onCredentials={vi.fn()} />);

    await waitFor(() => expect(mocks.hasCredentials).toHaveBeenCalled());
    await flushAsync();

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText(translations.en.qs_divider)).not.toBeInTheDocument();
  });

  it("stays hidden when neither PIN nor biometric is enabled", async () => {
    mocks.isPinEnabled.mockResolvedValue(false);
    const { container } = renderQuickSignIn(<QuickSignIn onCredentials={vi.fn()} />);

    await waitFor(() => expect(mocks.isPinEnabled).toHaveBeenCalled());
    await flushAsync();

    expect(container).toBeEmptyDOMElement();
  });

  it("shows the PIN button with the saved user name and signs in with a correct PIN", async () => {
    const onCredentials = vi.fn();
    renderQuickSignIn(<QuickSignIn onCredentials={onCredentials} />);

    // The button's accessible name comes from the dictionary, so this matches
    // only if qs_with_pin genuinely resolves to the English copy.
    const button = await screen.findByRole("button", {
      name: translations.en.qs_with_pin,
    });
    expect(button).toHaveTextContent("Sign in with PIN");
    expect(button).toHaveTextContent("Njoya P.");

    fireEvent.click(button);
    expect(
      await screen.findByText(translations.en.qs_pin_label)
    ).toBeInTheDocument();

    typePin("1234");

    await waitFor(() =>
      expect(onCredentials).toHaveBeenCalledWith({
        email: SAVED.email,
        password: SAVED.password,
      })
    );
    expect(mocks.verifyPin).toHaveBeenCalledWith("1234");
  });

  it("rejects a wrong PIN and never signs the user in", async () => {
    const onCredentials = vi.fn();
    renderQuickSignIn(<QuickSignIn onCredentials={onCredentials} />);

    fireEvent.click(
      await screen.findByRole("button", { name: translations.en.qs_with_pin })
    );
    await screen.findByText(translations.en.qs_pin_label);

    typePin("9999");

    expect(await screen.findByText(translations.en.err_incorrect_pin)).toBeInTheDocument();
    expect(onCredentials).not.toHaveBeenCalled();
  });

  it("uses fingerprint when biometric sign-in is enabled and available", async () => {
    mocks.isBiometricEnabled.mockResolvedValue(true);
    mocks.checkBiometryAvailability.mockResolvedValue({
      available: true,
      biometryType: 1,
      biometryLabel: "Fingerprint",
    });
    const onCredentials = vi.fn();
    renderQuickSignIn(<QuickSignIn onCredentials={onCredentials} />);

    // With biometrics available the title interpolates the native method name
    // into qs_with_biometric, so the accessible name follows it.
    const expected = translations.en.qs_with_biometric.replace(
      "{method}",
      "Fingerprint"
    );
    const button = await screen.findByRole("button", { name: expected });
    expect(button).toHaveTextContent("Sign in with Fingerprint");

    fireEvent.click(button);

    await waitFor(() =>
      expect(mocks.authenticateWithBiometrics).toHaveBeenCalled()
    );
    await waitFor(() =>
      expect(onCredentials).toHaveBeenCalledWith({
        email: SAVED.email,
        password: SAVED.password,
      })
    );
  });
});
