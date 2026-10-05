import React, { useCallback, useMemo, useState } from "react";
import { useHistory, useLocation } from "react-router-dom";
import { IonIcon, IonSpinner } from "@ionic/react";
import { motion } from "framer-motion";
import { checkmark, globeOutline } from "ionicons/icons";

import AuthShell from "../components/AuthShell";
import { useSettings } from "../context/SettingsContext";
import type { Language } from "../context/SettingsContext";
import { AUTH_ROUTES, LANDING_ROUTE } from "../utils/authFlow";

/**
 * One selectable language.
 *
 * `native` is the language's name *in that language* ("English", "Français"), so
 * someone who cannot read the currently active language can still find their own.
 * It is deliberately NOT translated, so every option renders identically no
 * matter what language the app is currently in.
 *
 * The cards used to carry a second line — a real UI sentence per language, as a
 * preview of what the app would look like. It was dropped: the preview is not
 * what identifies an option for the person who most needs it. A French speaker
 * arriving in an English app cannot read an English sentence either way, so the
 * sample told them nothing the endonym did not, while the endonym works for
 * exactly the monolingual case the picker exists to serve.
 */
interface LangOption {
  code: Language;
  native: string;
}

/** Registration targets, so "Get started" can route on to the right role picker. */
const NEXT_ROUTES: Record<string, string> = {
  patient: AUTH_ROUTES.patient.signup,
  doctor: AUTH_ROUTES.doctor.signup,
};

/**
 * Destinations `?next=` is allowed to point at.
 *
 * Without this whitelist the param would be an open redirect: anything landing
 * on this page could be bounced to an attacker-controlled URL after the user
 * picks a language, which is a credible phishing vector on a healthcare app.
 */
const ALLOWED_NEXT = new Set<string>([
  ...Object.values(NEXT_ROUTES),
  AUTH_ROUTES.patient.signin,
  AUTH_ROUTES.doctor.signin,
  AUTH_ROUTES.admin.signin,
  "/roleselect",
  "/roleselect2",
]);

/** Reads `?next=`, falling back to the landing page when absent or not allowed. */
export function resolveNextTarget(search: string): string {
  const requested = new URLSearchParams(search).get("next");
  // The allowlist is the real guard here. A `startsWith("/")` check alone would
  // still admit `//evil.com`, which the browser resolves protocol-relative.
  if (!requested || !requested.startsWith("/") || !ALLOWED_NEXT.has(requested)) {
    return LANDING_ROUTE;
  }
  return requested;
}

/**
 * First-run language picker, shown between the services showcase and the rest of
 * the funnel.
 *
 * Rendered inside <AuthShell> so it inherits the funnel's gradient, orbs, sheet
 * and glass back control — a bespoke screen here would read as a different app.
 *
 * Choosing a language only calls setLanguage(), which persists to localStorage
 * and re-renders every `t()` consumer immediately. There is no reload step: a
 * full reload would be a visible flash on a cold first-run install, and it would
 * also drop the onboarding query param the router strips on mount.
 *
 * The options are buttons, not a radio group, because tapping a card commits
 * immediately. The explicit Continue button below is the real keyboard and
 * screen-reader landing spot, so no arrow-key navigation is expected here.
 */
const ChooseLanguage: React.FC = () => {
  const { t, language, setLanguage } = useSettings();
  const history = useHistory();
  const location = useLocation();
  const [pending, setPending] = useState(false);

  const nextTarget = useMemo(
    () => resolveNextTarget(location.search),
    [location.search],
  );

  const options: LangOption[] = useMemo(
    () => [
      {
        code: "en",
        native: t("lang_english"),
      },
      {
        code: "fr",
        native: t("lang_french"),
      },
    ],
    [t],
  );

  const choose = useCallback(
    (code: Language) => {
      // No reload: setLanguage persists to localStorage and re-renders every
      // `t()` consumer synchronously, so the rest of the funnel — including the
      // screen we are about to push to — renders in the new language.
      setLanguage(code);
    },
    [setLanguage],
  );

  const goNext = useCallback(() => {
    setPending(true);
    // `replace`, not `push`: this screen is a gate, and leaving it in the history
    // stack would make the hardware back button return to a language picker the
    // user has already answered.
    history.replace(nextTarget);
  }, [history, nextTarget]);

  return (
    <AuthShell
      backHref={LANDING_ROUTE}
      backLabel={t("funnel_back_home")}
      eyebrow={
        <>
          <IonIcon icon={globeOutline} className="lang-eyebrow-icon" />{" "}
          {t("language")}
        </>
      }
      title={t("lang_page_title")}
    >
      <div className="lang-list" role="group" aria-label={t("lang_page_title")}>
        {options.map((option, i) => {
          const selected = language === option.code;
          return (
            <motion.button
              key={option.code}
              type="button"
              className={`lang-card${selected ? " lang-card-on" : ""}`}
              onClick={() => choose(option.code)}
              aria-pressed={selected}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.06 * i }}
              whileTap={{ scale: 0.985 }}
            >
              <span className="lang-card-check" aria-hidden="true">
                {selected ? <IonIcon icon={checkmark} /> : null}
              </span>
              <span className="lang-card-body">
                {/* Single line: the endonym only. The sample sentence this used
                    to render underneath is gone — see LangOption. */}
                <span className="lang-card-native">{option.native}</span>
              </span>
            </motion.button>
          );
        })}
      </div>

      <div className="lang-continue-row">
        <IonSpinner
          name="crescent"
          className={`lang-spinner${pending ? " lang-spinner-on" : ""}`}
        />
        <button
          type="button"
          className="lang-continue"
          onClick={goNext}
          disabled={pending}
        >
          {t("lang_continue")}
        </button>
      </div>

      <p className="lang-note">{t("lang_change_later")}</p>
    </AuthShell>
  );
};

export default ChooseLanguage;
