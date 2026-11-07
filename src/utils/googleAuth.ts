/**
 * googleAuth.ts
 *
 * Cross-platform Google Sign-In helper for HomeCare237.
 *
 * Platform strategy
 * ─────────────────
 * Android / iOS (Capacitor native)
 *   Uses @codetrix-studio/capacitor-google-auth which opens the native
 *   system account-picker. The plugin returns a Google ID token that is
 *   exchanged for a Firebase credential via signInWithCredential().
 *   This completely avoids the broken signInWithRedirect / signInWithPopup
 *   behaviour inside Capacitor WebViews.
 *
 * Web (browser)
 *   Falls back to Firebase's signInWithPopup using GoogleAuthProvider,
 *   which works correctly in normal browser tabs.
 *
 * Return value
 * ────────────
 * Always resolves to a Firebase UserCredential, identical to what the rest
 * of AuthService expects. Throws on cancellation or error.
 */

import { Capacitor } from "@capacitor/core";
import {
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup,
  type UserCredential,
} from "firebase/auth";
import { auth } from "../firebaseconfig";

/**
 * Sign in with Google on any platform.
 * Throws if the user cancels or an error occurs.
 */
export async function signInWithGoogle(): Promise<UserCredential> {
  const platform = Capacitor.getPlatform(); // "android" | "ios" | "web"

  // ── Native Android / iOS ────────────────────────────────────────────────
  if (platform === "android" || platform === "ios") {
    // Dynamic import keeps the plugin out of the web bundle entirely.
    const { GoogleAuth } = await import("@codetrix-studio/capacitor-google-auth");

    // Initialize must be called once. Safe to call multiple times — the
    // plugin no-ops on subsequent calls.
    await GoogleAuth.initialize({
      clientId:
        "770997904222-upkuve0qgasnfham5q31rc1qoj218vuv.apps.googleusercontent.com",
      scopes: ["profile", "email"],
      grantOfflineAccess: true,
    });

    // Opens the native Google account picker.
    // Throws "User cancelled" if the user dismisses it.
    const googleUser = await GoogleAuth.signIn();

    // The plugin returns idToken or authentication.idToken depending on version
    const idToken =
      googleUser.authentication?.idToken ??
      (googleUser as any).idToken;

    if (!idToken) {
      throw new Error(
        "Google Sign-In did not return an ID token. " +
        "Make sure your SHA-1 fingerprint is registered in Firebase Console and " +
        "the Web Client ID in capacitor.config.ts matches the one in google-services.json."
      );
    }

    // Exchange the Google ID token for a Firebase credential
    const credential = GoogleAuthProvider.credential(idToken);
    return signInWithCredential(auth, credential);
  }

  // ── Web (browser) ───────────────────────────────────────────────────────
  const provider = new GoogleAuthProvider();
  provider.addScope("profile");
  provider.addScope("email");
  provider.setCustomParameters({ prompt: "select_account" });
  return signInWithPopup(auth, provider);
}

/**
 * Sign out from Google on native platforms.
 * On web, Firebase's signOut() is sufficient (handled by AuthService.logout).
 */
export async function signOutFromGoogle(): Promise<void> {
  const platform = Capacitor.getPlatform();
  if (platform === "android" || platform === "ios") {
    try {
      const { GoogleAuth } = await import("@codetrix-studio/capacitor-google-auth");
      await GoogleAuth.signOut();
    } catch {
      // Non-fatal — Firebase session is already ended by AuthService.logout
    }
  }
}
