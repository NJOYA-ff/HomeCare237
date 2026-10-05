/**
 * Catalogue of the services pitched by the first-run showcase.
 *
 * Every entry maps to a screen that actually exists in the app — the showcase is
 * a description of the product, not a wish list, so `route` is kept alongside
 * the copy so the claim can be checked (and so the pitch can be extended to
 * deep links later). The copy lives in SettingsContext's `en`/`fr` tables and
 * is resolved through `t()`, because the app ships bilingual and defaults to
 * French.
 *
 * Artwork is drawn vector scenes rather than photography (see ShowcaseArt).
 * Photos were tried first and reverted: the crops read as generic stock next to
 * the rest of the product, cost ~390KB over six slides on a phone that may only
 * ever show three of them, and pinned the card to a fixed aspect ratio. Inline
 * SVG is a few hundred bytes per slide, sharp at any density, and inherits
 * `currentColor` so it follows dark mode and a rebrand for free.
 *
 * `art` names one of the scenes in ShowcaseArt. It is a plain string rather
 * than a component reference so this module stays pure data (no JSX, no
 * component imports) and this file remains the single place art is chosen.
 */

export type ShowcaseArtId =
  | "consult"
  | "appointments"
  | "records"
  | "medication"
  | "emergency"
  | "wallet";

export interface ShowcaseService {
  /** Stable key; also the translation key prefix (`sc_<id>_title`). */
  id: string;
  /** Short headline. */
  titleKey: string;
  /** One sentence explaining the value. */
  bodyKey: string;
  /** Which drawn scene to show. */
  art: ShowcaseArtId;
  /** Accessible description of the scene. Says what the drawing depicts, so it
   *  is deliberately not a restatement of the headline beside it. */
  artAltKey: string;
  /** Where this service lives, for verification and future deep links. */
  route: string;
}

/** Order here is the order the user sees. */
export const SHOWCASE_SERVICES: ShowcaseService[] = [
  {
    id: "consult",
    titleKey: "sc_consult_title",
    bodyKey: "sc_consult_body",
    art: "consult",
    artAltKey: "sc_consult_alt",
    route: "/patient/consult",
  },
  {
    id: "appointments",
    titleKey: "sc_appointments_title",
    bodyKey: "sc_appointments_body",
    art: "appointments",
    artAltKey: "sc_appointments_alt",
    route: "/patient/book_appointment",
  },
  {
    id: "records",
    titleKey: "sc_records_title",
    bodyKey: "sc_records_body",
    art: "records",
    artAltKey: "sc_records_alt",
    route: "/patient/timeline",
  },
  {
    id: "medication",
    titleKey: "sc_medication_title",
    bodyKey: "sc_medication_body",
    art: "medication",
    artAltKey: "sc_medication_alt",
    route: "/patient/medications",
  },
  {
    id: "emergency",
    titleKey: "sc_emergency_title",
    bodyKey: "sc_emergency_body",
    art: "emergency",
    artAltKey: "sc_emergency_alt",
    route: "/patient/sos",
  },
  {
    id: "wallet",
    titleKey: "sc_wallet_title",
    bodyKey: "sc_wallet_body",
    art: "wallet",
    artAltKey: "sc_wallet_alt",
    route: "/patient/receipts",
  },
];