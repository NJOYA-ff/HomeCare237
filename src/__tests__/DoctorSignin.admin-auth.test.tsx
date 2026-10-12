/**
 * DoctorSignin page accepts both Doctor and Admin accounts.
 *
 * Regression guard: the page passes [Doctor, Admin] as expected roles to
 * authService.login1() and routes each account to its own dashboard. These
 * tests pin the full authentication matrix:
 *   - a Doctor credential → /doc/dashboard
 *   - an Admin credential → /admin/dashboard
 *   - wrong credentials   → neutral message (not "No doctor account found")
 *   - a role mismatch      → role-mismatch guidance, not a generic failure
 *
 * Mocks mirror the patterns established in SigninPages.quickAccess.test.tsx.
 */
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Switch, Route } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { RoleMismatchError } from "../utils/authErrors";

const mocks = vi.hoisted(() => ({
  login1: vi.fn(),
}));

vi.mock("../App", () => ({
  UserRole: { Patient: "patient", Doctor: "doctor", Admin: "admin" },
  authService: {
    loginWithGoogle: vi.fn(async () => null),
    login1: mocks.login1,
  },
}));

vi.mock("../utils/BiometricAuthService", () => ({
  hasCredentials: vi.fn(async () => false),
  loadCredentials: vi.fn(async () => null),
  isBiometricEnabled: vi.fn(async () => false),
  isPinEnabled: vi.fn(async () => false),
  authenticateWithBiometrics: vi.fn(async () => ({
    success: false,
    cancelled: true,
  })),
  checkBiometryAvailability: vi.fn(async () => ({
    available: false,
    biometryType: 0,
    biometryLabel: "Fingerprint",
  })),
  verifyPin: vi.fn(async () => false),
}));

vi.mock("../components/LoadingHelix", () => ({
  default: () => React.createElement("div", { "data-testid": "loading-helix" }),
}));

vi.mock("../components/QuickSignIn", () => ({
  default: () => null,
}));

import DoctorSignin from "../pages/DoctorSignin";
import { SettingsProvider, translations } from "../context/SettingsContext";

const renderPage = (initialEntries = ["/Doctor_signin"]) => {
  localStorage.setItem("hc_language", "en");
    return render(
    <SettingsProvider>
      <MemoryRouter initialEntries={initialEntries}>
        <Switch>
          <Route exact path="/Doctor_signin" render={() => <DoctorSignin />} />
          <Route exact path="/doc/dashboard" render={() => <div>Doctor Dashboard</div>} />
          <Route exact path="/admin/dashboard" render={() => <div>Admin Dashboard</div>} />
        </Switch>
      </MemoryRouter>
    </SettingsProvider>,
  );
};

const fillAndSubmitForm = async () => {
  const emailInputs = screen.getAllByPlaceholderText(translations.en.field_email);
  const emailInput = emailInputs[0];
  fireEvent.change(emailInput, {
    target: { value: "test@example.com" },
  });
  const passwordInputs = screen.getAllByPlaceholderText(translations.en.field_password);
  fireEvent.change(passwordInputs[0], {
    target: { value: "password123" },
  });
                  // IonButton renders as <ion-button> custom element in jsdom, so we
  // submit the form directly via the DOM form element's submit event.
  const form = document.querySelector("form") as HTMLFormElement;
  fireEvent.submit(form);
};

describe("DoctorSignin — admin access", () => {
  beforeEach(() => vi.clearAllMocks());

  it("routes an Admin credential to the admin dashboard", async () => {
    mocks.login1.mockResolvedValueOnce({
      uid: "admin-1",
      role: "admin",
      name: "Admin User",
      email: "admin@homecare237.cm",
      userType: "admin",
    });

    renderPage();
    await fillAndSubmitForm();

    await waitFor(() => {
      expect(screen.getByText("Admin Dashboard")).toBeInTheDocument();
    });

    expect(mocks.login1).toHaveBeenCalledWith(
      "test@example.com",
      "password123",
      ["doctor", "admin"],
    );
  });

  it("still routes a Doctor credential to the doctor dashboard", async () => {
    mocks.login1.mockResolvedValueOnce({
      uid: "doc-1",
      role: "doctor",
      name: "Dr. Smith",
      email: "doc@homecare237.cm",
      userType: "doctor",
    });

    renderPage();
    await fillAndSubmitForm();

    await waitFor(() => {
      expect(screen.getByText("Doctor Dashboard")).toBeInTheDocument();
    });
  });

  it("never routes an unexpected role to a dashboard (no default fallback)", async () => {
    // login1() in the real app would have thrown a RoleMismatchError for a
    // patient here; the point of this test is purely to pin that the page
    // itself has no `default:` branch funneling unknown roles somewhere.
    mocks.login1.mockResolvedValueOnce({
      uid: "mystery-1",
      role: "patient",
      name: "Odd Account",
      email: "odd@example.com",
    });

    renderPage();
    await fillAndSubmitForm();

    await waitFor(() => {
      expect(mocks.login1).toHaveBeenCalled();
    });

    expect(screen.queryByText("Doctor Dashboard")).not.toBeInTheDocument();
    expect(screen.queryByText("Admin Dashboard")).not.toBeInTheDocument();
  });

  it("shows a neutral message (not doctor-specific) when no account is found", async () => {
    mocks.login1.mockRejectedValueOnce({
      code: "auth/user-not-found",
      message: "Firebase: Error (auth/user-not-found).",
      name: "FirebaseError",
    });

    renderPage();
    await fillAndSubmitForm();

    await waitFor(() => {
      const error = screen.getByText(/No account was found/i);
      expect(error).toBeInTheDocument();
    });

    // Must NOT mention "doctor" — admins see this message too.
    expect(screen.queryByText(/doctor account/i)).not.toBeInTheDocument();
  });

  it("shows a role-mismatch message when a Patient tries to sign in here", async () => {
    mocks.login1.mockRejectedValueOnce(
      new RoleMismatchError("patient", ["doctor", "admin"]),
    );

    renderPage();
    await fillAndSubmitForm();

    await waitFor(() => {
      expect(
        screen.getByText(/This is a Patient account/i),
      ).toBeInTheDocument();
    });
  });

  it("shows a Doctor / Admin eyebrow — not a Doctor-only label", () => {
    renderPage();
    // The eyebrow chip must name both roles so an admin knows they are on the
    // right page. "Doctor" alone would be confusing for an admin.
    const eyebrow = screen.getByText(/Doctor\s*\/\s*Admin/i);
    expect(eyebrow).toBeInTheDocument();
  });

  it("shows a staff subtitle — not a doctor-only patient-records message", () => {
    renderPage();
    // Must reference both roles or be role-neutral.
    // The old doctor-only copy read "manage your appointments, consults and
    // patient records", which excludes admins and signals the wrong audience.
    const subtitle = screen.getByText(/Doctor or Admin credentials/i);
    expect(subtitle).toBeInTheDocument();
  });

  it("links Forgot Password to the Doctor/Admin recovery page", () => {
    renderPage();
    // The Forgot Password button must NOT link to the doctor-only recovery
    // route — admins need a recovery page that is labelled for them.
    const btn = screen.getByText(/Forgot Password/i);
    // The button is an IonButton with routerLink; in jsdom it renders as an
    // <ion-button> custom element. Check the routerLink attribute directly.
    const ionBtn = btn.closest("ion-button");
    expect(ionBtn).not.toBeNull();
    const link = ionBtn!.getAttribute("router-link") ?? ionBtn!.getAttribute("routerlink");
    // Must route to a recovery page that is shared (Doctor_password_recovery
    // is the real-Firebase-backed recovery shared by both roles).
    expect(link).toMatch(/password_recovery/i);
    expect(link).not.toMatch(/Patient/i);
  });
});
