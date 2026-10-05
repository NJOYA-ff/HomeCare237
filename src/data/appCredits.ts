/**
 * Credits the app owes its third-party assets.
 *
 * Kept in one module because the About alert is hand-copied into four Settings
 * screens (generic, Patient, Doctor, Admin). Duplicating a licence-required
 * string is how credits go stale: change it in one place and the other three
 * quietly fall out of compliance.
 *
 * ATTRIBUTION.md next to the asset records provenance in full; this holds only
 * the line the user actually sees.
 */

/**
 * Required by the Freepik License that covers the Storyset illustrations used
 * in the first-run showcase. Must stay in the shipped UI — see
 * src/assets/showcase/ATTRIBUTION.md.
 */
export const ART_CREDIT = "Work illustrations by Storyset (https://storyset.com/work)";

/**
 * The About blurb, shared by every Settings screen.
 *
 * `blurb` is the role-neutral description; the three role-specific screens pass
 * their own. The credit and copyright are appended to all of them.
 */
export const aboutMessage = (blurb: string): string =>
  [
    "Version 1.0.0",
    blurb,
    "© 2026 HomeCare237. All rights reserved.",
    `Artwork: ${ART_CREDIT}`,
  ].join("\n\n");