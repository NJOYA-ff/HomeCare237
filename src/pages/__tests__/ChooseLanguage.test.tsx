/**
 * Language gate: the screen between the landing page's CTAs and the role pickers.
 *
 * Two things carry the weight here and are pinned below.
 *
 * 1. Switching language must not need a reload. setLanguage re-renders every
 *    `t()` consumer synchronously, which is what lets the *next* screen render
 *    in the newly chosen language. A reload here would flash on a cold first-run
 *    install and would also drop the onboarding param the router strips on mount.
 *
 * 2. `?next=` is attacker-controllable, so it is matched against an allowlist.
 *    Without that, a crafted link could bounce a patient to an attacker-owned URL
 *    immediately after they pick their language — a credible phishing vector on a
 *    healthcare app. `startsWith("/")` alone is NOT enough: `//evil.com` is
 *    protocol-relative and resolves to a different origin.
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";

import ChooseLanguage, { resolveNextTarget } from "../ChooseLanguage";
import { AUTH_ROUTES, LANGUAGE_GATE_ROUTE, LANDING_ROUTE } from "../../utils/authFlow";
import { SettingsProvider, translations } from "../../context/SettingsContext";
import type { Language } from "../../context/SettingsContext";
import fs from "fs";
import path from "path";

/** Renders the gate, then reports whatever path we ended up on. */
const renderGate = (search = "") => {
  let landedOn = "";
  const utils = render(
    <SettingsProvider>
      <MemoryRouter initialEntries={[`${LANGUAGE_GATE_ROUTE}${search}`]}>
        <ChooseLanguage />
        <Route
          path="*"
          render={({ location }) => {
            landedOn = location.pathname;
            return null;
          }}
        />
      </MemoryRouter>
    </SettingsProvider>,
  );
  return { ...utils, landedAt: () => landedOn };
};

describe("resolveNextTarget", () => {
  it("passes through an allowlisted destination", () => {
    expect(resolveNextTarget("?next=/roleselect2")).toBe("/roleselect2");
    expect(resolveNextTarget("?next=/roleselect")).toBe("/roleselect");
    // Auth route literals are capitalised (see AUTH_ROUTES), so the allowlist
    // matches them exactly — a lowercase variant is correctly rejected below.
    expect(resolveNextTarget(`?next=${AUTH_ROUTES.patient.signin}`)).toBe(
      AUTH_ROUTES.patient.signin,
    );
    expect(resolveNextTarget(`?next=${AUTH_ROUTES.doctor.signup}`)).toBe(
      AUTH_ROUTES.doctor.signup,
    );
  });

  it("falls back to the landing page when next is absent", () => {
    expect(resolveNextTarget("")).toBe(LANDING_ROUTE);
  });

  it("refuses to be used as an open redirect", () => {
    // Absolute URL to another origin.
    expect(resolveNextTarget("?next=https://evil.com/steal")).toBe(LANDING_ROUTE);
    expect(resolveNextTarget("?next=http://evil.com")).toBe(LANDING_ROUTE);
    // Protocol-relative: starts with "/", so a naive prefix check would pass it,
    // but the browser resolves it to the evil origin.
    expect(resolveNextTarget("?next=//evil.com")).toBe(LANDING_ROUTE);
    // In-app path that is not part of the funnel.
    expect(resolveNextTarget("?next=/admin-dashboard")).toBe(LANDING_ROUTE);
    // Path traversal aimed at escaping the allowlist.
    expect(resolveNextTarget("?next=/roleselect/../../admin")).toBe(LANDING_ROUTE);
    // Encoded, to slip past a check that does not decode.
    expect(resolveNextTarget("?next=%2F%2Fevil.com")).toBe(LANDING_ROUTE);
    // Right shape, wrong case — must not resolve to a real screen.
    expect(resolveNextTarget("?next=/patient_signin")).toBe(LANDING_ROUTE);
  });
});

describe("ChooseLanguage page", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders no header subtitle under the title", () => {
    renderGate();

    // The page deliberately drops AuthShell's `subtitle`. The two cards are the
    // whole job of this screen, and the copy under the heading was noise — so the
    // heading must sit directly above the list with no <p> between them.
    expect(screen.queryByText(translations.fr.lang_page_sub)).not.toBeInTheDocument();
    expect(document.querySelector(".auth-subtitle")).toBeNull();
  });

  it("offers both languages, named in their own language", () => {
    renderGate();

    // Endonyms, so a user who cannot read the current language can still find
    // their own. These must never be translated.
    expect(screen.getByText("English")).toBeInTheDocument();
    expect(screen.getByText("Français")).toBeInTheDocument();
  });

  it("switches the app language without a reload", async () => {
    const user = userEvent.setup();
    renderGate();

    // AuthShell renders the title as an <h1>. The page's own copy comes through
    // t(), so flipping the language has to change it here in place — not only on
    // screens loaded later. That is what proves no reload is needed.
    const heading = () => screen.getByRole("heading", { level: 1 });

    // The app defaults to French, so the gate opens in French.
    expect(heading()).toHaveTextContent("Choisissez votre langue");

    await user.click(screen.getByText("English"));
    expect(heading()).toHaveTextContent("Choose your language");

    // ...and back again, so the control is not one-way.
    await user.click(screen.getByText("Français"));
    expect(heading()).toHaveTextContent("Choisissez votre langue");
  });

  it("marks the active language as pressed", async () => {
    const user = userEvent.setup();
    renderGate();

    // French is the default, so the French card starts selected.
    expect(screen.getByText("Français").closest("button")).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await user.click(screen.getByText("English"));
    expect(screen.getByText("English").closest("button")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByText("Français").closest("button")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("navigates to the allowlisted destination on Continue", async () => {
    const user = userEvent.setup();
    const { landedAt } = renderGate("?next=/roleselect2");

    await user.click(screen.getByRole("button", { name: /Continuer|Commencer|Continue/ }));

    await waitFor(() => expect(landedAt()).toBe("/roleselect2"));
  });

  it("sends the user to the landing page when next is hostile", async () => {
    const user = userEvent.setup();
    const { landedAt } = renderGate("?next=//evil.com");

    await user.click(screen.getByRole("button", { name: /Continuer|Commencer|Continue/ }));

    await waitFor(() => expect(landedAt()).toBe(LANDING_ROUTE));
  });
});

describe("post-gate funnel localization", () => {
  /**
   * The screens a user actually reaches after picking a language. If any of
   * them regresses to a hardcoded English string, the language gate becomes a
   * lie: the user picks French and the very next screen is still English.
   */
  const FUNNEL_PAGES = [
    "Roleselect.tsx",
    "Roleselect2.tsx",
    "PatientSignin.tsx",
    "DoctorSignin.tsx",
    "AdminSignin.tsx",
    "PatientSignup.tsx",
    "DoctorSignup.tsx",
    "PatientPasswordRecovery.tsx",
    "DoctorPasswordRecovery.tsx",
    "AdminPasswordRecovery.tsx",
  ];

  const read = (file: string) =>
    fs.readFileSync(path.join(__dirname, "..", file), "utf8");

  it.each(FUNNEL_PAGES)("%s consumes the language setting", (file) => {
    expect(read(file)).toMatch(/useSettings\(\)/);
  });

  it.each(FUNNEL_PAGES)("%s has no hardcoded user-facing English copy", (file) => {
    const source = read(file);
    const offenders: string[] = [];

    // JSX text nodes and string literals that reach the screen.
    for (const m of source.matchAll(/>([A-Z][A-Za-z]+(?: [A-Za-z'?!.,…]+){1,})</g)) {
      offenders.push(`JSX text: "${m[1]}"`);
    }
    for (const m of source.matchAll(/placeholder="([^"]+)"/g)) {
      offenders.push(`placeholder="${m[1]}"`);
    }
    for (const m of source.matchAll(/message:\s*"([^"]{6,})"/g)) {
      offenders.push(`validation message: "${m[1]}"`);
    }

    expect(offenders).toEqual([]);
  });

  it("keeps English and French dictionaries in exact key parity", () => {
    // A key present in only one language silently falls back to the key name
    // (or to English), so a missing translation shows up as broken UI rather
    // than a failing build. Pin it in a test.
    //
    // Asserted against the imported dictionaries, not by re-parsing
    // SettingsContext's source. The source-parsing version counted the `key:
    // string,` parameter of the `t()` signature as a 403rd French key and
    // failed on a file whose dictionaries were actually in parity — a test that
    // reports breakage where there is none trains people to ignore it.
    const en = Object.keys(translations.en);
    const fr = Object.keys(translations.fr);

    expect(en.length).toBeGreaterThan(0);
    expect(fr.filter((k) => !en.includes(k))).toEqual([]);
    expect(en.filter((k) => !fr.includes(k))).toEqual([]);

    // Parity on the names alone is not enough: a key mapped to "" in one
    // language renders as an empty label, which reads as a broken screen just
    // as surely as a missing key does.
    for (const lang of ["en", "fr"] as Language[]) {
      const empty = Object.entries(translations[lang])
        .filter(([, value]) => !value.trim())
        .map(([key]) => key);
      expect({ lang, empty }).toEqual({ lang, empty: [] });
    }
  });

  it("keeps the language picker endonyms untranslated in both languages", () => {
    // The whole point of the picker is that someone who cannot read the app's
    // current language can still find their own. If these ever get translated,
    // a French-speaking user arriving in an English app loses their own option.
    for (const key of ["lang_english", "lang_french"] as const) {
      expect(translations.en[key]).toBe(translations.fr[key]);
    }
    expect(translations.en.lang_english).toBe("English");
    expect(translations.en.lang_french).toBe("Français");
  });
});
