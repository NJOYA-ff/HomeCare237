/**
 * authErrors.ts
 *
 * Turns Firebase Auth failures into messages a patient, doctor or admin can
 * actually act on.
 *
 * Why this exists
 * ---------------
 * Both sign-in entry points displayed `err.message` verbatim, which surfaces
 * raw SDK text such as "Firebase: Error (auth/popup-closed-by-user)." Three
 * distinct problems came out of that:
 *
 *  1. **Unactionable text.** Users were told things like "Firebase: Error".
 *  2. **Cancelled flows were reported as failures.** Closing the Google popup
 *     is a normal user action, yet it surfaced as a red error. These are now
 *     classified as cancellations (see {@link isAuthCancellation}).
 *  3. **Wrong message for `auth/invalid-credential`.** With email-enumeration
 *     protection enabled (the Firebase default), a wrong email *and* a wrong
 *     password both fail with that single code. Mapping it to "No account found
 *     with this email address" would tell a legitimate user their account does
 *     not exist, so it maps to one neutral message covering both cases.
 *
 * Pure module — no Firebase imports — so it is unit testable.
 */

/**
 * Matches a bare Firebase error code inside a wrapper message, e.g. the
 * `auth/unmapped` in `"Firebase: Error (auth/unmapped)."`.
 *
 * Deliberately requires the `auth/` prefix so ordinary prose that merely
 * contains parentheses is not mistaken for a code.
 */
const FIREBASE_CODE_IN_MESSAGE = /auth\/[a-z0-9-]+/i;

/** Firebase codes that mean "the user backed out", not "something broke". */
const CANCELLATION_CODES = [
  "auth/popup-closed-by-user",
  "auth/cancelled-popup-request",
  "auth/user-cancelled",
  "auth/canceled",
];

/** Firebase error codes with a specific, user-facing meaning. */
const CODE_MESSAGES: Record<string, string> = {
  // ── Credential problems ──────────────────────────────────────────────────
  "auth/invalid-credential":
    "Incorrect email or password. Please check and try again.",
  "auth/invalid-login-credentials":
    "Incorrect email or password. Please check and try again.",
  "auth/wrong-password":
    "Incorrect email or password. Please check and try again.",
  "auth/invalid-password":
    "Incorrect email or password. Please check and try again.",
  "auth/invalid-email": "That email address doesn't look right. Please check it.",
  "auth/missing-password": "Please enter your password.",
  "auth/missing-email": "Please enter your email address.",

  // ── Account state ────────────────────────────────────────────────────────
  "auth/user-not-found": "No account was found with those details.",
  "auth/user-disabled":
    "This account has been disabled. Please contact support.",

  // ── Google / popup specific ──────────────────────────────────────────────
  "auth/popup-blocked":
    "Your browser blocked the Google sign-in window. Allow pop-ups for this site and try again.",
  "auth/account-exists-with-different-credential":
    "An account already exists with this email using a different sign-in method. Sign in with your password instead.",
  "auth/credential-already-in-use":
    "This email is already linked to another account. Sign in with your password instead.",
  "auth/operation-not-allowed":
    "Google sign-in isn't enabled for this app yet. Please use your email and password.",
  "auth/unauthorized-domain":
    "Google sign-in isn't enabled for this domain. Please use your email and password.",
  "auth/too-many-requests":
    "Too many attempts. Please wait a moment and try again.",

  // ── Connectivity ─────────────────────────────────────────────────────────
  "auth/network-request-failed":
    "Network error. Please check your connection and try again.",
  "auth/timeout": "The request timed out. Please check your connection and try again.",
  "auth/internal-error":
    "Something went wrong on our side. Please try again in a moment.",
};

/**
 * Reads the `code` property Firebase attaches to its errors.
 *
 * Falls back to parsing the code out of the message. Some SDK versions — and
 * most importantly the `auth/…` wrapper shown in older console output — carry
 * the code only in the text (`"Firebase: Error (auth/unmapped)."`). Without this
 * fallback the caller sees no code, so it cannot build the
 * `"<fallback> (<code>)"` string, and returning the raw message instead would
 * leak the `Firebase:` wrapper straight to the user.
 */
export function getAuthErrorCode(error: unknown): string {
  if (!error || typeof error !== "object") return "";
  const code = (error as { code?: unknown }).code;
  if (typeof code === "string" && code) return code;
  // `getMessage` is declared below; function declarations hoist, so this is safe.
  return getMessage(error).match(FIREBASE_CODE_IN_MESSAGE)?.[0] ?? "";
}

/** Reads `message` off an unknown thrown value. */
function getMessage(error: unknown): string {
  if (typeof error === "string") return error.trim();
  if (!error || typeof error !== "object") return "";
  const message = (error as { message?: unknown }).message;
  return typeof message === "string" ? message.trim() : "";
}

/**
 * True when the failure just means the user closed the Google popup or
 * cancelled the flow. Callers should clear any loading state and show no
 * error, because nothing actually went wrong.
 *
 * Checks the `code` *and* the message: some SDK versions raise the code on the
 * error but only embed it in the message text.
 */
export function isAuthCancellation(error: unknown): boolean {
  const code = getAuthErrorCode(error);
  if (code && CANCELLATION_CODES.includes(code)) return true;
  const message = getMessage(error);
  return CANCELLATION_CODES.some((c) => message.includes(c));
}

/**
 * True when saved quick-sign-in credentials are no longer valid — the user
 * changed their password, or the account was removed or disabled.
 */
export function isStaleCredentialError(error: unknown): boolean {
  const code = getAuthErrorCode(error);
  return (
    code === "auth/invalid-credential" ||
    code === "auth/invalid-login-credentials" ||
    code === "auth/wrong-password" ||
    code === "auth/invalid-password" ||
    code === "auth/user-not-found" ||
    code === "auth/user-disabled"
  );
}

/**
 * Maps an unknown thrown value to a message safe to show a user.
 *
 * Errors raised by this app's own guard rails (`assertRoleAccess`) carry no
 * `code` and already hold human copy — e.g. "This is not a Doctor account."
 * Those pass through unchanged instead of being replaced by a generic string.
 *
 * @param error   the caught value
 * @param fallback message used when the error carries no usable text
 */
export function getAuthErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  const code = getAuthErrorCode(error);
  if (code && CODE_MESSAGES[code]) return CODE_MESSAGES[code];

  const message = getMessage(error);
  // App-generated errors hold readable prose; keep it. Never surface the raw
  // "Firebase: Error (…)." wrapper.
  if (message && !message.startsWith("Firebase:")) return message;

  // Unknown Firebase code: include the code (searchable in logs) but not the
  // raw wrapper, so support can still identify it.
  if (code) return `${fallback} (${code})`;

  return message || fallback;
}

/**
 * Stable code carried by {@link RoleMismatchError}.
 *
 * Firebase codes are all namespaced `auth/…`; reusing that shape here means a
 * single `getAuthErrorCode()` lookup identifies this failure wherever it is
 * caught, without depending on the human-readable message.
 */
export const ROLE_MISMATCH_CODE = "auth/role-mismatch";

/**
 * Thrown when a user authenticates successfully but their account role does not
 * match the portal they signed in through — e.g. a Patient using the Doctor
 * sign-in page.
 *
 * Before this existed the condition was signalled with a bare `new Error(...)`,
 * which had two consequences:
 *
 *  1. **It was indistinguishable from any other failure.** The Google *redirect*
 *     flow (`handleGoogleRedirectResult`, used on Android/iOS where popups are
 *     blocked) wrapped everything in a `catch` that returned `null`. A role
 *     mismatch therefore produced *no message at all* — the user was silently
 *     returned to the landing page with no idea why.
 *  2. **The Firebase session survived the rejection.** `signInWithEmailAndPassword`
 *     and `signInWithPopup` had already established a session by the time the
 *     role was checked, and the rejection path never signed out, leaving an
 *     authenticated-but-unauthorised session behind.
 *
 * Carrying the actual role on the error lets the UI name the right portal, and
 * `code` lets callers branch without string-matching.
 */
export class RoleMismatchError extends Error {
  readonly code = ROLE_MISMATCH_CODE;
  /** Role held by the account, e.g. `"patient"`. */
  readonly actualRole: string;
  /** Roles the portal accepts, e.g. `["doctor", "admin"]`. */
  readonly expectedRoles: string[];

  constructor(actualRole: string, expectedRoles: string[]) {
    super(getRoleMismatchMessage(actualRole, expectedRoles));
    this.name = "RoleMismatchError";
    this.actualRole = actualRole;
    this.expectedRoles = expectedRoles;
    // Required when targeting ES5 so `instanceof` keeps working after the
    // TypeScript `extends Error` downleveling.
    Object.setPrototypeOf(this, RoleMismatchError.prototype);
  }
}

/** True only for errors raised by this app's own role guard. */
export function isRoleMismatchError(error: unknown): boolean {
  return getAuthErrorCode(error) === ROLE_MISMATCH_CODE;
}

const ROLE_WORDS: Record<string, string> = {
  patient: "Patient",
  doctor: "Doctor",
  admin: "Admin",
};

/** Capitalised role name for display, e.g. `"patient"` → `"Patient"`. */
function roleWord(role: string): string {
  const key = String(role || "").toLowerCase();
  return ROLE_WORDS[key] || (role ? role.charAt(0).toUpperCase() + role.slice(1) : "");
}

/** The roles a portal accepts, as display words: `["doctor","admin"]` → `"Doctor or Admin"`. */
function roleListWords(roles: string[]): string {
  const words = roles.map(roleWord).filter(Boolean);
  if (words.length === 0) return "this portal";
  if (words.length === 1) return words[0];
  return `${words.slice(0, -1).join(", ")} or ${words[words.length - 1]}`;
}

/**
 * Copy shown when the portal doesn't match the account role.
 *
 * It names the *actual* role and the correct portal rather than just saying
 * "wrong account", because the user's next step is always the same: open the
 * sign-in page for the role they actually hold.
 */
export function getRoleMismatchMessage(
  actualRole: string,
  expectedRoles: string[],
): string {
  const actual = roleWord(actualRole);
  const expected = roleListWords(expectedRoles);
  if (!actual) {
    return `This account cannot sign in here. Please use the ${expected} sign-in portal.`;
  }
  return `This is a ${actual} account. You are on the ${expected} sign-in page — please use the ${actual} portal instead.`;
}

/**
 * Translation key per Firebase code, mirroring {@link CODE_MESSAGES}.
 *
 * Kept as a separate table rather than reusing `CODE_MESSAGES` values as keys:
 * the English strings are user-facing copy that may be reworded, while these
 * keys are a stable contract with the dictionary.
 */
const CODE_MESSAGE_KEYS: Record<string, string> = {
  "auth/invalid-credential": "autherr_incorrect_credentials",
  "auth/invalid-login-credentials": "autherr_incorrect_credentials",
  "auth/wrong-password": "autherr_incorrect_credentials",
  "auth/invalid-password": "autherr_incorrect_credentials",
  "auth/invalid-email": "autherr_invalid_email",
  "auth/missing-password": "autherr_missing_password",
  "auth/missing-email": "autherr_missing_email",
  "auth/user-not-found": "autherr_user_not_found",
  "auth/user-disabled": "autherr_user_disabled",
  "auth/popup-blocked": "autherr_popup_blocked",
  "auth/account-exists-with-different-credential": "autherr_account_exists_other",
  "auth/credential-already-in-use": "autherr_credential_in_use",
  "auth/operation-not-allowed": "autherr_operation_not_allowed",
  "auth/unauthorized-domain": "autherr_unauthorized_domain",
  "auth/too-many-requests": "err_too_many_attempts",
  "auth/network-request-failed": "err_network",
  "auth/timeout": "autherr_timeout",
  "auth/internal-error": "autherr_internal_error",
};

/**
 * Translator shape these helpers need. Declared structurally so this module
 * stays framework-free and testable without React.
 */
export type Translate = (key: string, params?: Record<string, string | number>) => string;

/** Role → dictionary key, for the role-mismatch copy. */
const ROLE_LABEL_KEYS: Record<string, string> = {
  patient: "funnel_patient",
  doctor: "funnel_doctor",
  admin: "funnel_admin",
};

/** Translation key carrying the localized "Doctor or Admin" role list. */
export const ROLE_LIST_KEY = "funnel_sign_in_as";

/**
 * Localized equivalent of {@link getRoleMismatchMessage}.
 *
 * The role names are translated rather than interpolated as raw English words,
 * so a French user reads "Ceci est un compte Médecin" rather than a French
 * sentence with an English noun in the middle.
 */
export function getRoleMismatchMessageT(
  error: unknown,
  t: Translate,
): string {
  if (!isRoleMismatchError(error)) return "";
  const { actualRole, expectedRoles } = error as RoleMismatchError;

  const expected = expectedRoles
    .map((role) => (ROLE_LABEL_KEYS[role] ? t(ROLE_LABEL_KEYS[role]) : role))
    // Fall back to the raw role so the message still names the right portal
    // even if a role has no dictionary entry yet.
    .filter(Boolean);

  if (!actualRole) {
    return t("autherr_role_mismatch_unnamed", {
      expected: expected.length ? expected.join(" / ") : t(ROLE_LIST_KEY),
    });
  }

  const actual = ROLE_LABEL_KEYS[actualRole]
    ? t(ROLE_LABEL_KEYS[actualRole])
    : roleWord(actualRole);

  return t("autherr_role_mismatch", {
    actual,
    expected: expected.length ? expected.join(" / ") : t(ROLE_LIST_KEY),
  });
}

/**
 * Localized equivalent of {@link getAuthErrorMessage}.
 *
 * Mirrors the same decision order, so a code that resolves to a translation key
 * is translated, and anything the tables don't cover still falls back to the
 * error's own prose (which the app generates in the user's language elsewhere).
 */
export function getAuthErrorMessageT(
  error: unknown,
  t: Translate,
  fallback = "",
): string {
  const code = getAuthErrorCode(error);
  if (code && CODE_MESSAGE_KEYS[code]) return t(CODE_MESSAGE_KEYS[code]);

  const message = getMessage(error);
  if (message && !message.startsWith("Firebase:")) return message;
  if (code) return `${fallback || t("err_login_failed")} (${code})`;
  return message || fallback;
}

/**
 * Localized equivalent of {@link getQuickSignInErrorMessage}.
 *
 * A role mismatch is checked first, for the same reason as the original: it
 * carries no `code`, so the generic Firebase path would discard its message.
 */
export function getQuickSignInErrorMessageT(
  error: unknown,
  t: Translate,
): string {
  const mismatch = getRoleMismatchMessageT(error, t);
  if (mismatch) return mismatch;
  if (isStaleCredentialError(error)) return t("autherr_stale_saved_login");
  return getAuthErrorMessageT(error, t, t("err_quick_signin_failed"));
}

/**
 * Localized equivalent of {@link getGoogleSignInErrorMessage}.
 *
 * Returns `""` for cancellations, so callers can assign the result straight to
 * their error state and render nothing.
 */
export function getGoogleSignInErrorMessageT(
  error: unknown,
  t: Translate,
): string {
  const mismatch = getRoleMismatchMessageT(error, t);
  if (mismatch) return mismatch;
  if (isAuthCancellation(error)) return "";
  return getAuthErrorMessageT(error, t, t("autherr_google_failed"));
}

/**
 * For the Google button: returns `""` when the failure was a cancellation (so
 * the caller shows nothing) and a mapped message otherwise.
 *
 * A role mismatch is checked first, for the same reason as in
 * {@link getQuickSignInErrorMessage}: the check must never be short-circuited by
 * the generic Firebase handling, since this message is the only feedback the
 * user gets on the wrong portal.
 */
export function getGoogleSignInErrorMessage(error: unknown): string {
  if (isRoleMismatchError(error)) {
    return (error as RoleMismatchError).message;
  }
  if (isAuthCancellation(error)) return "";
  return getAuthErrorMessage(error, "Google sign-in failed. Please try again.");
}

/**
 * For quick sign-in. Stale credentials get a message that says what to do next,
 * since retrying the same PIN can never succeed.
 *
 * A role mismatch is deliberately checked *before* the stale-credential rule.
 * Quick sign-in reuses the last saved credential, so a user who last signed in
 * as a Patient and is now on the Doctor page fails with an app-generated
 * `RoleMismatchError` that carries no `code` at all. It must keep its own copy.
 */
export function getQuickSignInErrorMessage(error: unknown): string {
  if (isRoleMismatchError(error)) {
    return (error as RoleMismatchError).message;
  }
  if (isStaleCredentialError(error)) {
    return "Your saved sign-in is no longer valid. Please sign in with your email and password.";
  }
  return getAuthErrorMessage(error, "Quick sign-in failed. Please sign in manually.");
}