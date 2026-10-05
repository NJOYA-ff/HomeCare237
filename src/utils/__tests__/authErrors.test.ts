/**
 * Auth error mapping tests.
 *
 * Regression cover for the raw-SDK-text bugs: the Google and quick sign-in
 * buttons used to render `err.message` directly, showing users strings like
 * "Firebase: Error (auth/popup-closed-by-user)." and treating a deliberately
 * closed popup as a failure.
 */
import { describe, expect, it } from "vitest";

import {
  getAuthErrorCode,
  getAuthErrorMessage,
  getAuthErrorMessageT,
  getGoogleSignInErrorMessage,
  getGoogleSignInErrorMessageT,
  getQuickSignInErrorMessage,
  getQuickSignInErrorMessageT,
  getRoleMismatchMessage,
  getRoleMismatchMessageT,
  isAuthCancellation,
  isRoleMismatchError,
  isStaleCredentialError,
  ROLE_MISMATCH_CODE,
  RoleMismatchError,
} from "../authErrors";

/** Mimics a Firebase AuthError: has `code` plus a prefixed message. */
const firebaseError = (code: string) => ({
  code,
  message: `Firebase: Error (${code}).`,
  name: "FirebaseError",
});

describe("getAuthErrorCode", () => {
  it("reads the code from a Firebase error", () => {
    expect(getAuthErrorCode(firebaseError("auth/invalid-email"))).toBe(
      "auth/invalid-email",
    );
  });

  it("returns an empty string for values without a usable code", () => {
    expect(getAuthErrorCode(null)).toBe("");
    expect(getAuthErrorCode("boom")).toBe("");
    expect(getAuthErrorCode(new Error("boom"))).toBe("");
    expect(getAuthErrorCode({ code: 42 })).toBe("");
  });
});

describe("isAuthCancellation", () => {
  it("treats a closed Google popup as a cancellation", () => {
    expect(isAuthCancellation(firebaseError("auth/popup-closed-by-user"))).toBe(
      true,
    );
  });

  it("treats a cancelled popup request as a cancellation", () => {
    expect(
      isAuthCancellation(firebaseError("auth/cancelled-popup-request")),
    ).toBe(true);
  });

  it("detects the code when it only appears in the message text", () => {
    // Some SDK versions put the code in `message` but not on `code`.
    expect(
      isAuthCancellation({
        message: "Firebase: Error (auth/popup-closed-by-user).",
      }),
    ).toBe(true);
  });

  it("does not treat real failures as cancellations", () => {
    expect(isAuthCancellation(firebaseError("auth/popup-blocked"))).toBe(false);
    expect(isAuthCancellation(firebaseError("auth/network-request-failed"))).toBe(
      false,
    );
    expect(isAuthCancellation(firebaseError("auth/invalid-credential"))).toBe(
      false,
    );
  });

  it("does not treat ordinary errors as cancellations", () => {
    expect(isAuthCancellation(new Error("This is not a Doctor account."))).toBe(
      false,
    );
    expect(isAuthCancellation(null)).toBe(false);
  });
});

describe("isStaleCredentialError", () => {
  it("flags credential rejections that a retry cannot fix", () => {
    expect(isStaleCredentialError(firebaseError("auth/invalid-credential"))).toBe(
      true,
    );
    expect(isStaleCredentialError(firebaseError("auth/wrong-password"))).toBe(
      true,
    );
    expect(isStaleCredentialError(firebaseError("auth/user-not-found"))).toBe(
      true,
    );
    expect(isStaleCredentialError(firebaseError("auth/user-disabled"))).toBe(
      true,
    );
  });

  it("does not flag transient failures", () => {
    expect(
      isStaleCredentialError(firebaseError("auth/network-request-failed")),
    ).toBe(false);
    expect(isStaleCredentialError(firebaseError("auth/too-many-requests"))).toBe(
      false,
    );
  });
});

describe("getAuthErrorMessage", () => {
  it("never leaks the raw Firebase wrapper", () => {
    const message = getAuthErrorMessage(firebaseError("auth/invalid-email"));
    expect(message).not.toContain("Firebase:");
    expect(message).toBe("That email address doesn't look right. Please check it.");
  });

  it("maps invalid-credential to one neutral message, not 'no account found'", () => {
    // With enumeration protection a wrong password also yields this code, so
    // claiming the account is missing would be actively misleading.
    expect(getAuthErrorMessage(firebaseError("auth/invalid-credential"))).toBe(
      "Incorrect email or password. Please check and try again.",
    );
  });

  it("preserves the app's own human-readable guard-rail messages", () => {
    const message = getAuthErrorMessage(
      new Error("This is not a Doctor account. Please use the correct sign-in portal."),
    );
    expect(message).toBe(
      "This is not a Doctor account. Please use the correct sign-in portal.",
    );
  });

  it("preserves an inactive-account message", () => {
    expect(
      getAuthErrorMessage(new Error("This account is inactive. Please contact support.")),
    ).toBe("This account is inactive. Please contact support.");
  });

  it("includes the code for an unmapped Firebase error", () => {
    const message = getAuthErrorMessage(firebaseError("auth/some-new-code"));
    expect(message).toContain("auth/some-new-code");
    expect(message).not.toContain("Firebase:");
  });

  it("falls back when there is no usable text", () => {
    expect(getAuthErrorMessage(null)).toBe(
      "Something went wrong. Please try again.",
    );
    expect(getAuthErrorMessage({}, "Custom fallback.")).toBe("Custom fallback.");
  });

  it("uses a caller-supplied fallback for a raw Firebase message with no code", () => {
    expect(
      getAuthErrorMessage(
        { message: "Firebase: Error (auth/unmapped)." },
        "Please try again.",
      ),
    ).toBe("Please try again. (auth/unmapped)");
  });

  it("accepts a plain string error", () => {
    expect(getAuthErrorMessage("Something specific went wrong.")).toBe(
      "Something specific went wrong.",
    );
  });
});

describe("getGoogleSignInErrorMessage", () => {
  it("returns nothing when the user closes the popup", () => {
    expect(
      getGoogleSignInErrorMessage(firebaseError("auth/popup-closed-by-user")),
    ).toBe("");
    expect(
      getGoogleSignInErrorMessage(firebaseError("auth/cancelled-popup-request")),
    ).toBe("");
  });

  it("explains a blocked popup instead of showing an SDK string", () => {
    const message = getGoogleSignInErrorMessage(firebaseError("auth/popup-blocked"));
    expect(message).toMatch(/blocked/i);
    expect(message).not.toContain("Firebase:");
  });

  it("falls back to a generic message for an unknown failure", () => {
    const message = getGoogleSignInErrorMessage(new Error(""));
    expect(message).toBe("Google sign-in failed. Please try again.");
  });
});

describe("getQuickSignInErrorMessage", () => {
  it("tells the user to sign in manually when credentials are stale", () => {
    const message = getQuickSignInErrorMessage(
      firebaseError("auth/invalid-credential"),
    );
    expect(message).toMatch(/no longer valid/i);
    expect(message).toMatch(/email and password/i);
  });

  it("maps a network failure to a connectivity message", () => {
    const message = getQuickSignInErrorMessage(
      firebaseError("auth/network-request-failed"),
    );
    expect(message).toMatch(/network|connection/i);
  });

  it("falls back for an unmapped error", () => {
    expect(getQuickSignInErrorMessage(null)).toBe(
      "Quick sign-in failed. Please sign in manually.",
    );
  });
});

describe("role mismatch", () => {
  it("is identifiable without matching on the message", () => {
    expect(isRoleMismatchError(new RoleMismatchError("patient", ["doctor"]))).toBe(
      true,
    );
  });

  it("carries the auth/ namespace so one code lookup finds it", () => {
    expect(ROLE_MISMATCH_CODE).toBe("auth/role-mismatch");
    expect(getAuthErrorCode(new RoleMismatchError("patient", ["doctor"]))).toBe(
      ROLE_MISMATCH_CODE,
    );
  });

  it("does not flag unrelated Firebase errors", () => {
    expect(isRoleMismatchError(firebaseError("auth/wrong-password"))).toBe(false);
    expect(isRoleMismatchError(new Error("boom"))).toBe(false);
    expect(isRoleMismatchError(null)).toBe(false);
  });

  it("survives instanceof after the ES5 Error downleveling", () => {
    expect(new RoleMismatchError("patient", ["doctor"])).toBeInstanceOf(
      RoleMismatchError,
    );
  });

  it("names the actual role and the portal to use", () => {
    const message = getRoleMismatchMessage("patient", ["doctor"]);
    expect(message).toMatch(/Patient/);
    expect(message).toMatch(/Doctor/);
  });

  it("lists every accepted role when the portal allows more than one", () => {
    expect(getRoleMismatchMessage("patient", ["doctor", "admin"])).toMatch(
      /Doctor or Admin/,
    );
  });

  it("falls back cleanly when the role is unknown", () => {
    expect(getRoleMismatchMessage("", ["doctor"])).toMatch(/Doctor/);
  });

  // ── Quick sign-in: the user is shown the mismatch, not a generic failure ──
  it("quick sign-in shows the mismatch message", () => {
    const error = new RoleMismatchError("patient", ["doctor", "admin"]);
    expect(getQuickSignInErrorMessage(error)).toBe(error.message);
    expect(getQuickSignInErrorMessage(error)).not.toMatch(
      /Quick sign-in failed\. Please sign in manually\./,
    );
  });

  it("quick sign-in does not mislabel a mismatch as stale credentials", () => {
    // The stale-credential rule must not win, or the user would be told to retype
    // a password that is perfectly valid on the correct portal.
    const message = getQuickSignInErrorMessage(
      new RoleMismatchError("patient", ["doctor"]),
    );
    expect(message).not.toMatch(/no longer valid/i);
  });

  // ── Google sign-in: same requirement on both web and the redirect flow ────
  it("Google sign-in shows the mismatch message", () => {
    const error = new RoleMismatchError("doctor", ["patient"]);
    expect(getGoogleSignInErrorMessage(error)).toBe(error.message);
    expect(getGoogleSignInErrorMessage(error)).toMatch(/Doctor/);
  });

  it("Google sign-in does not treat a mismatch as a cancellation", () => {
    // Cancellations return "" so the UI stays silent. If a mismatch were
    // swallowed as one, the wrong-portal user would again get no feedback.
    expect(
      getGoogleSignInErrorMessage(new RoleMismatchError("patient", ["doctor"])),
    ).not.toBe("");
  });

  it("still returns an empty string for a genuine Google cancellation", () => {
    expect(
      getGoogleSignInErrorMessage(firebaseError("auth/popup-closed-by-user")),
    ).toBe("");
  });

  it("still maps ordinary Google failures", () => {
    expect(
      getGoogleSignInErrorMessage(firebaseError("auth/network-request-failed")),
    ).toMatch(/network|connection/i);
  });
});

describe("localized error mapping", () => {
  /**
   * Stand-in for the `t` function from `useSettings`. The localized helpers are
   * pure — they only need a key lookup — so they can be exercised here without
   * mounting React or importing the settings context.
   */
  const t = (key: string) => `t:${key}`;

  it("routes a Firebase code through the dictionary", () => {
    expect(getAuthErrorMessageT(firebaseError("auth/invalid-email"), t)).toBe(
      "t:autherr_invalid_email",
    );
  });

  it("maps every credential code to one neutral message", () => {
    // Email-enumeration protection collapses a wrong email and a wrong password
    // into this code, so it must not claim the account is missing.
    for (const code of [
      "auth/invalid-credential",
      "auth/invalid-login-credentials",
      "auth/wrong-password",
      "auth/invalid-password",
    ]) {
      expect(getAuthErrorMessageT(firebaseError(code), t)).toBe(
        "t:autherr_incorrect_credentials",
      );
    }
  });

  it("translates the rate-limit and network codes too", () => {
    expect(getAuthErrorMessageT(firebaseError("auth/too-many-requests"), t)).toBe(
      "t:err_too_many_attempts",
    );
    expect(getAuthErrorMessageT(firebaseError("auth/network-request-failed"), t)).toBe(
      "t:err_network",
    );
  });

  it("names the role in the translated language, not raw English", () => {
    const message = getRoleMismatchMessageT(
      new RoleMismatchError("patient", ["doctor"]),
      t,
    );
    expect(message).toBe("t:autherr_role_mismatch");
    expect(message).not.toMatch(/Doctor/);
  });

  it("keeps the role-mismatch copy on the quick sign-in path", () => {
    // Quick sign-in reuses the last saved credential, so a Patient on the Doctor
    // page hits this path. The generic handling must not swallow it.
    expect(
      getQuickSignInErrorMessageT(new RoleMismatchError("patient", ["doctor"]), t),
    ).toBe("t:autherr_role_mismatch");
  });

  it("translates a stale saved sign-in", () => {
    expect(
      getQuickSignInErrorMessageT(firebaseError("auth/invalid-credential"), t),
    ).toBe("t:autherr_stale_saved_login");
  });

  it("returns an empty string for a cancelled Google popup", () => {
    // Callers assign this straight to error state and render nothing.
    expect(getGoogleSignInErrorMessageT(firebaseError("auth/popup-closed-by-user"), t)).toBe(
      "",
    );
  });

  it("keeps the mismatch copy when a Google sign-in hits the wrong portal", () => {
    expect(
      getGoogleSignInErrorMessageT(new RoleMismatchError("patient", ["doctor"]), t),
    ).toBe("t:autherr_role_mismatch");
  });

  it("never leaks the raw Firebase wrapper", () => {
    const message = getAuthErrorMessageT(
      firebaseError("auth/some-brand-new-code"),
      t,
    );
    expect(message).not.toMatch(/Firebase:/);
    expect(message).toContain("auth/some-brand-new-code");
  });
});
