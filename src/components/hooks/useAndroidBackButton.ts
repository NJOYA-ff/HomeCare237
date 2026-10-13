/**
 * Authenticated Android hardware-back handling.
 *
 * Without this, the device back button walks the browser history left by
 * sign-in (`history.push` → dashboard), so leaving a tab root navigates to
 * `/Patient_signin` (or similar) while the user is still logged in. That URL
 * is outside IonTabs' matched routes and leaves the tab bar in a broken /
 * hidden state.
 *
 * Strategy:
 *  - On role "home" / tab-root paths: exit the app instead of leaving the shell
 *  - Everywhere else: let Ionic's default stack pop run
 */

import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import type { BackButtonEvent } from "@ionic/react";

/** Mirrors App.UserRole without importing App (avoids a circular dep). */
export type BackButtonRole = "patient" | "doctor" | "admin";

/** Patient bottom-tab destinations — back here must not leave the shell. */
const PATIENT_TAB_ROOTS = new Set([
  "/patient/dashboard",
  "/patient/diagnoses",
  "/patient/book_appointment",
  "/patient/consult",
  "/patient/profile",
]);

const DOCTOR_HOME = "/doc/dashboard";
const ADMIN_HOME = "/admin/dashboard";

function isShellRoot(pathname: string, role: BackButtonRole): boolean {
  if (role === "patient") {
    return PATIENT_TAB_ROOTS.has(pathname);
  }
  if (role === "doctor") {
    return pathname === DOCTOR_HOME;
  }
  if (role === "admin") {
    return pathname === ADMIN_HOME;
  }
  return false;
}

/**
 * Priority above Ionic's default nav handler (0) so we can short-circuit
 * before history pops into an auth screen.
 */
const BACK_PRIORITY = 10;

export function useAndroidBackButton(role: BackButtonRole | null | undefined): void {
  const location = useLocation();

  useEffect(() => {
    if (!role) return;
    // Web/dev still emits ionBackButton in some environments; keep the same
    // shell-root guard so tab-bar regressions are reproducible in the browser.
    const onBack = (ev: Event) => {
      const event = ev as BackButtonEvent;
      event.detail.register(BACK_PRIORITY, (processNextHandler) => {
        const path = location.pathname;

        if (isShellRoot(path, role)) {
          if (Capacitor.isNativePlatform()) {
            App.exitApp();
          }
          // On web, swallow the event so we do not walk into auth history.
          return;
        }

        processNextHandler();
      });
    };

    document.addEventListener("ionBackButton", onBack);
    return () => document.removeEventListener("ionBackButton", onBack);
  }, [role, location.pathname]);
}
