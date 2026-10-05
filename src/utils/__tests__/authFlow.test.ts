/**
 * Auth funnel navigation graph.
 *
 * The glass back control on all eight auth screens resolves its destination
 * through authBackTarget() rather than a hard-coded href, and navigates with
 * history.replace() so the funnel never grows a stack. Both decisions are easy
 * to regress silently, so these tests pin the whole matrix:
 *   - patient/doctor sign-in and sign-up return to the matching role picker
 *   - admin returns to the landing page, since no public picker offers admin
 *   - recovery always returns to the sign-in screen of the same role
 *   - every label agrees with the target it is shown on
 *   - no route points back at itself (a self-targeting back button is a trap)
 */
import { describe, expect, it } from "vitest";

import {
  AUTH_ROUTES,
  LANDING_ROUTE,
  ROLE_PICKER,
  authBackLabel,
  authBackTarget,
  type AuthIntent,
  type AuthRole,
} from "../authFlow";

const ROLES: AuthRole[] = ["patient", "doctor", "admin"];
const INTENTS: AuthIntent[] = ["signin", "signup", "recovery"];

/**
 * Stand-in for SettingsContext's translator, using the real English copy so the
 * label-vs-target assertions below keep testing the same strings they always
 * did. `t` became a required parameter of authBackLabel when the funnel was
 * localised; these tests exist to prove a required translator was not a
 * behaviour change, so they must not hard-code their own English.
 */
const EN: Record<string, string> = {
  funnel_patient: "Patient",
  funnel_doctor: "Doctor",
  funnel_admin: "Admin",
  funnel_back_role_selection: "Back to role selection",
  funnel_back_signin: "Back to {role} sign in",
  funnel_back_home: "Back to home",
};
const tEn = (key: string) => EN[key] ?? key;

describe("authBackTarget", () => {
  it("returns the sign-in role picker for patient and doctor sign-in", () => {
    expect(authBackTarget("patient", "signin")).toBe(ROLE_PICKER.signin);
    expect(authBackTarget("doctor", "signin")).toBe(ROLE_PICKER.signin);
  });

  it("returns the register role picker for patient and doctor sign-up", () => {
    expect(authBackTarget("patient", "signup")).toBe(ROLE_PICKER.signup);
    expect(authBackTarget("doctor", "signup")).toBe(ROLE_PICKER.signup);
  });

  it("sends admin sign-in to the landing page, not to a picker that has no admin", () => {
    expect(authBackTarget("admin", "signin")).toBe(LANDING_ROUTE);
    expect(authBackTarget("admin", "signup")).toBe(LANDING_ROUTE);
  });

  it("returns admin recovery to the admin sign-in screen, not the landing page", () => {
    // Regression: the admin landing fallback used to be applied before the
    // recovery branch, so this resolved to /landingpage while the label still
    // read "Back to admin sign in".
    expect(authBackTarget("admin", "recovery")).toBe("/Admin_signin");
  });

  it("returns every role's recovery screen to that role's sign-in screen", () => {
    for (const role of ROLES) {
      expect(authBackTarget(role, "recovery")).toBe(AUTH_ROUTES[role].signin);
    }
  });

  it("never points a screen's back control back at itself", () => {
    for (const role of ROLES) {
      for (const intent of INTENTS) {
        expect(authBackTarget(role, intent)).not.toBe(AUTH_ROUTES[role][intent]);
      }
    }
  });

  it("keeps every back target on a known route in the funnel", () => {
    const known = new Set<string>([
      LANDING_ROUTE,
      ROLE_PICKER.signin,
      ROLE_PICKER.signup,
      ...ROLES.flatMap((role) => Object.values(AUTH_ROUTES[role])),
    ]);

    for (const role of ROLES) {
      for (const intent of INTENTS) {
        expect(known).toContain(authBackTarget(role, intent));
      }
    }
  });
});

describe("authBackLabel", () => {
  it("names the destination screen the same way the target resolves", () => {
    for (const role of ROLES) {
      for (const intent of INTENTS) {
        const label = authBackLabel(role, intent, tEn);
        const target = authBackTarget(role, intent);

        expect(label.length).toBeGreaterThan(0);
        // A label that says "sign in" must not resolve to the landing page, and
        // a label that says "home" must not resolve to a sign-in screen.
        if (label.includes("sign in")) {
          expect(target).toBe(AUTH_ROUTES[role].signin);
        }
        if (label === "Back to home") {
          expect(target).toBe(LANDING_ROUTE);
        }
      }
    }
  });

  it("substitutes the role into the recovery label in the active language", () => {
    const FR: Record<string, string> = {
      funnel_patient: "Patient",
      funnel_doctor: "Médecin",
      funnel_admin: "Administrateur",
      funnel_back_signin: "Retour à la connexion {role}",
    };
    const tFr = (key: string) => FR[key] ?? key;

    // The role must come from the translator, not from the English ROLE_LABEL
    // map: "Médecin" here is what proves the label is actually localised.
    expect(authBackLabel("doctor", "recovery", tFr)).toBe(
      "Retour à la connexion Médecin",
    );
    // And no un-substituted {role} placeholder may survive to the screen.
    for (const role of ROLES) {
      expect(authBackLabel(role, "recovery", tFr)).not.toContain("{role}");
    }
  });
});
