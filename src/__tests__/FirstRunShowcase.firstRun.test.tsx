 /**
 * First-run services showcase, as the app actually mounts it.
 *
 * The unit tests in utils/__tests__/firstRunShowcase.test.ts cover the flag
 * itself. This file covers the part that only shows up through <App>, where the
 * showcase gate interacts with the existing public-route gate:
 *
 *   - a brand-new device sees the showcase, not the landing page
 *   - the showcase is reachable by deep link into the funnel, not only on "/"
 *   - walking the deck to the end reveals the landing page and persists the
 *     choice, so the next cold start goes straight there
 *   - once dismissed, it does not come back
 *
 * The session-restore behaviour of the public funnel is covered separately by
 * App.noAutoLogin.test.tsx.
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signOut: vi.fn(async () => {}),
  getRedirectResult: vi.fn(async () => null),
  clearCredentials: vi.fn(async () => {}),
  saveCredentials: vi.fn(async () => {}),
  getDoc: vi.fn(async () => ({ exists: () => false, data: () => ({}) })),
}));

vi.mock("../firebaseconfig", () => ({
  auth: { currentUser: null },
  db: {},
  storage: {},
  messaging: null,
}));

vi.mock("firebase/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("firebase/auth")>();
  return {
    ...actual,
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

vi.mock("../utils/BiometricAuthService", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../utils/BiometricAuthService")>();
  return {
    ...actual,
    clearCredentials: mocks.clearCredentials,
    saveCredentials: mocks.saveCredentials,
  };
});

/* The flag lives in Capacitor Preferences with a localStorage mirror. Stubbing
 * Preferences to "unset" keeps the two in step for a first-run device, and the
 * assertions below read the mirror. */
vi.mock("@capacitor/preferences", () => ({
  Preferences: {
    get: async () => ({ value: null }),
    set: async () => undefined,
  },
}));

import App from "../App";
import { SHOWCASE_SERVICES } from "../data/servicesShowcase";

const SHOWCASE_FLAG = "hc_services_showcase_seen_v1";
const NEXT_LABEL = "Suivant";
const PREV_LABEL = "Précédent";
const FINISH_LABEL = "Créer mon compte";
const FIRST_SLIDE_HEADING = "Parlez à un médecin en vidéo";
const SECOND_SLIDE_HEADING = "Prenez rendez-vous en quelques secondes";

beforeEach(() => {
  // The flag must start unset for every case: the suite shares one jsdom, so a
  // leaked write from an earlier test would suppress the deck for all the rest.
  localStorage.removeItem(SHOWCASE_FLAG);
});

afterEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe("first-run services showcase", () => {
  it("shows the deck to a brand-new device instead of the landing page", async () => {
    render(<App />);
    expect(await screen.findByText(FIRST_SLIDE_HEADING)).toBeInTheDocument();
    expect(screen.queryByText("Se connecter")).not.toBeInTheDocument();
  });

  it("is reachable by deep link into the funnel, not only on \"/\"", async () => {
    window.history.pushState({}, "", "/patient/login");
    render(<App />);
    // The deck gates the whole signed-out tree, so a deep link must not drop the
    // user past onboarding into a half-authenticated screen.
    expect(await screen.findByText(FIRST_SLIDE_HEADING)).toBeInTheDocument();
  });

  it("does not come back once it has been seen", async () => {
    localStorage.setItem(SHOWCASE_FLAG, "true");
    render(<App />);
    expect(await screen.findByText("Se connecter")).toBeInTheDocument();
    expect(screen.queryByText(FIRST_SLIDE_HEADING)).not.toBeInTheDocument();
  });

  });

  it("walks the deck and reveals the landing page on the final card", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText(FIRST_SLIDE_HEADING);

    // The CTA only becomes the finish action on the last slide.
    for (let i = 0; i < SHOWCASE_SERVICES.length - 1; i += 1) {
      await user.click(screen.getByRole("button", { name: NEXT_LABEL }));
    }
    await user.click(screen.getByRole("button", { name: FINISH_LABEL }));

    expect(await screen.findByText("Se connecter")).toBeInTheDocument();
    // The choice is persisted, so the next cold start skips the deck entirely.
    expect(localStorage.getItem(SHOWCASE_FLAG)).toBe("true");
  });

  it("steps back through the deck, and stops at the first slide", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText(FIRST_SLIDE_HEADING);

    const back = () => screen.getByRole("button", { name: PREV_LABEL });
    // Nothing to go back to on the opening slide.
    expect(back()).toBeDisabled();

    await user.click(screen.getByRole("button", { name: NEXT_LABEL }));
    await waitFor(() =>
      expect(screen.getByText(SECOND_SLIDE_HEADING)).toBeInTheDocument()
    );
    expect(back()).toBeEnabled();

    await user.click(back());
    expect(await screen.findByText(FIRST_SLIDE_HEADING)).toBeInTheDocument();
    // And it is disabled again rather than wrapping around to the end.
    expect(back()).toBeDisabled();
  });
