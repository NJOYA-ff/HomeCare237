/**
 * Navigation graph for the unauthenticated ("auth") part of the app.
 *
 * The public auth screens are plain <Route> children of <IonReactRouter> with
 * no <IonRouterOutlet>, so they have no navigation stack of their own. That
 * makes `history.push()` the wrong tool for a back control: every tap appended
 * a new entry, so pressing back repeatedly cycled
 * landing -> role -> signin -> role -> signin and the browser/hardware back
 * button walked a trail of dead auth screens.
 *
 * The funnel is strictly linear, so the back target for every screen is fully
 * derivable. Keeping that derivation here (instead of inline `defaultHref`
 * literals scattered across eight pages) is what fixed the Admin sign-in bug
 * where the back button pointed at the *register* role picker.
 */

/** Roles that can authenticate against the platform. */
export type AuthRole = "patient" | "doctor" | "admin";

/** Stages of the auth funnel. */
export type AuthIntent = "signin" | "signup" | "recovery";

/** Entry point of the funnel. */
export const LANDING_ROUTE = "/landingpage";

/**
 * First-run language picker.
 *
 * Both landing-page CTAs route through here before reaching a role picker, so
 * the rest of the funnel renders in a language the user chose rather than
 * whatever the device locale happened to be. `?next=` carries the intended
 * destination; ChooseLanguage validates it against an allowlist before using it,
 * so this cannot be turned into an open redirect.
 */
export const LANGUAGE_GATE_ROUTE = "/choose-language";

/** The two role pickers: one for signing in, one for registering. */
export const ROLE_PICKER: Record<"signin" | "signup", string> = {
  signin: "/roleselect",
  signup: "/roleselect2",
};

/** Absolute path of every auth screen, keyed by role then intent. */
export const AUTH_ROUTES: Record<
  AuthRole,
  Record<AuthIntent, string>
> = {
  patient: {
    signin: "/Patient_signin",
    signup: "/Patient_signup",
    recovery: "/Patient_password_recovery",
  },
  doctor: {
    signin: "/Doctor_signin",
    signup: "/Doctor_signup",
    recovery: "/Doctor_password_recovery",
  },
  admin: {
    signin: "/Admin_signin",
    // Admins are provisioned by existing admins; there is no self-registration.
    signup: "/Admin_signin",
    recovery: "/Admin_password_recovery",
  },
};

/** Human labels used for the eyebrow chip on each auth screen. */
export const ROLE_LABEL: Record<AuthRole, string> = {
  patient: "Patient",
  doctor: "Doctor",
  admin: "Admin",
};

/** Translation key per role, for the eyebrow chip. */
export const ROLE_LABEL_KEY: Record<AuthRole, string> = {
  patient: "funnel_patient",
  doctor: "funnel_doctor",
  admin: "funnel_admin",
};

/** Minimal shape of SettingsContext's translator, so this module stays
 *  framework-free and unit-testable without a React render. */
export type Translate = (key: string) => string;

/** Eyebrow chip label for a role, in the active language. */
export function roleLabel(role: AuthRole, t: Translate): string {
  return t(ROLE_LABEL_KEY[role]);
}

/**
 * Admins are deliberately absent from the public role picker, so their back
 * control returns to the landing page instead of to a picker that cannot
 * represent them.
 */
const PICKER_ROLES: AuthRole[] = ["patient", "doctor"];

/**
 * Where the glass back control on an auth screen should go.
 *
 * - sign-in  -> the sign-in role picker (or the landing page for admins)
 * - sign-up  -> the register role picker (or the landing page for admins)
 * - recovery -> the sign-in screen of the same role
 */
export function authBackTarget(role: AuthRole, intent: AuthIntent): string {
  // Recovery is always reached from the sign-in screen (its "Forgot password?"
  // link), so returning there is correct for every role. It must be tested
  // before the picker fallback, otherwise admin recovery would jump to the
  // landing page while its label still reads "Back to admin sign in".
  if (intent === "recovery") {
    return AUTH_ROUTES[role].signin;
  }
  if (!PICKER_ROLES.includes(role)) {
    return LANDING_ROUTE;
  }
  return ROLE_PICKER[intent];
}

/**
 * Accessible label for the back control, e.g. "Back to role selection".
 *
 * `t` is required rather than optional: an optional translator would let a
 * caller omit it and silently fall back to English, which is exactly the bug
 * this replaced (the funnel rendered English regardless of the chosen language).
 *
 * The `{role}` slot is substituted here because SettingsContext's `t()` is a
 * plain key lookup with no interpolation.
 */
export function authBackLabel(
  role: AuthRole,
  intent: AuthIntent,
  t: Translate,
): string {
  if (intent === "recovery") {
    return t("funnel_back_signin").replace("{role}", roleLabel(role, t));
  }
  return PICKER_ROLES.includes(role)
    ? t("funnel_back_role_selection")
    : t("funnel_back_home");
}
