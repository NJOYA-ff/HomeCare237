import { Preferences } from "@capacitor/preferences";

/**
 * First-run services showcase flag.
 *
 * The app opens on a short pitch of what HomeCare237 does, but only the very
 * first time it is installed on a device. Two conditions have to hold:
 *
 *   1. this device has never completed the showcase, and
 *   2. there is no account behind the launch.
 *
 * Condition (2) is structural rather than stored here: <App> renders the public
 * funnel only while `currentUser` is null, and it deliberately signs out any
 * session that Firebase restores from a previous launch (see the "No automatic
 * login" comment in App.tsx). The showcase therefore *cannot* reach a signed-in
 * user, because the only route that renders it lives inside that branch. Adding
 * a stored "is registered" flag here would create a second source of truth that
 * could disagree with Firebase after an account is deleted or a device is
 * shared, so it is deliberately not done.
 *
 * Storage is @capacitor/preferences (SharedPreferences on Android, UserDefaults
 * on iOS) so the flag survives app restarts on device, with a localStorage
 * mirror for the browser build. Both are written on every set, so a run where
 * one store is unavailable still reads correctly from the other. If *no* store
 * is reachable the showcase is shown rather than skipped: over-presenting once
 * is far less harmful than silently never showing it.
 */

/**
 * Bump when the content changes enough that showing it again is worthwhile
 * (new services, redesigned slides). Existing installs key off the old value,
 * so a bump re-runs the showcase exactly once for everyone.
 */
export const SHOWCASE_VERSION = 1;

const KEY = `hc_services_showcase_seen_v${SHOWCASE_VERSION}`;

/** True once this device has finished (or skipped) the showcase. */
export async function hasSeenServicesShowcase(): Promise<boolean> {
  try {
    const { value } = await Preferences.get({ key: KEY });
    if (value === "true") return true;
  } catch {
    // Fall through to the localStorage mirror.
  }
  try {
    return localStorage.getItem(KEY) === "true";
  } catch {
    return false;
  }
}

/** Record that the showcase has been shown on this device. */
export async function markServicesShowcaseSeen(): Promise<void> {
  try {
    await Preferences.set({ key: KEY, value: "true" });
  } catch {
    // Non-fatal: the mirror below is enough to suppress the next visit.
  }
  try {
    localStorage.setItem(KEY, "true");
  } catch {
    // Storage disabled — the showcase will reappear, which is acceptable.
  }
}

/**
 * Parses a request to replay the showcase out of a URL query string.
 *
 * Pure and side-effect free so it can be unit tested directly: the value the
 * gate actually uses is captured once at module load (see FirstRunGate), which a
 * test cannot influence by setting the URL after import.
 */
export function isShowcasePreviewRequest(search: string): boolean {
  try {
    const value = new URLSearchParams(search).get("showcase");
    return value === "1" || value === "true";
  } catch {
    return false;
  }
}

/**
 * True when this page load asked for the showcase to be replayed, e.g.
 * `?showcase=1`.
 *
 * Development builds only: a shipped app must not let a link replay onboarding
 * for a real user. Reading the flag is enough — it never writes to storage — so
 * using it to look around cannot suppress the showcase on the next genuine cold
 * start.
 *
 * Read at module load rather than inside a component effect. IonReactRouter
 * rewrites the URL as it mounts, so by the time an effect runs, `?showcase=1`
 * has already been stripped from `location.search`. Module scope evaluates
 * before the router mounts, while the URL still reflects what was requested.
 */
export const SHOWCASE_PREVIEW_REQUESTED: boolean = import.meta.env.DEV
  ? isShowcasePreviewRequest(window.location.search)
  : false;

/**
 * Forget the flag so the showcase plays again.
 *
 * Not wired to any UI: this exists for QA and support ("show me what a new
 * install looks like"). Deliberately not reachable from Settings, because a
 * user who cleared their own flag would get a first-run screen on an account
 * they already own.
 */
export async function resetServicesShowcase(): Promise<void> {
  try {
    await Preferences.remove({ key: KEY });
  } catch {
    // Ignore.
  }
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Ignore.
  }
}
