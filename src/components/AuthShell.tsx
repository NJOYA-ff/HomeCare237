import React from "react";
import { IonContent, IonPage } from "@ionic/react";
import { AnimatePresence, motion } from "framer-motion";
import GlassBackButton from "./GlassBackButton";
import "../theme/hc-auth.scss";

/**
 * Shared shell for every unauthenticated screen (sign in, sign up, password
 * recovery), for all three roles.
 *
 * It reproduces the onboarding composition from Landingpage/Roleselect — the
 * same brand gradient, the same drifting glass orbs, the same 46px back
 * control and the same 28px sheet radius — so the funnel reads as one continuous
 * product instead of two half-related sets of screens. The difference is that
 * the sheet is translucent, so the artwork from the landing page reads through
 * the form instead of stopping at an opaque panel.
 *
 * Also fixes a structural bug the three recovery pages shared: AdminPassword-
 * Recovery rendered its <IonHeader> *after* <IonContent>, which detaches the
 * back control from the page flow. Here there is no header at all — the back
 * control is a fixed overlay row, so ordering cannot drift.
 */
interface AuthShellProps {
  /** Route the glass back control returns to. */
  backHref: string;
  /** Accessible label for the glass back control. */
  backLabel: string;
  /** Small uppercase kicker above the title — normally the role. */
  eyebrow: React.ReactNode;
  /** Screen title, e.g. "Welcome back". */
  title: React.ReactNode;
  /**
   * When this changes, the header cross-fades instead of snapping. Screens
   * with two states (password recovery: request form -> email sent) pass their
   * state here so the transition reads as one screen changing, not two screens
   * being swapped.
   */
  transitionKey?: string;
  /** One line of supporting copy under the title. */
  subtitle?: React.ReactNode;
  /** The form or success state. */
  children: React.ReactNode;
  /**
   * Overlays that must sit outside the sheet, such as <IonToast>.
   *
   * The sheet sets `backdrop-filter`, which makes it the containing block for
   * fixed-position descendants, so a toast rendered inside the sheet would be
   * positioned against the sheet rather than the viewport. The slot renders as
   * a sibling of the sheet instead.
   */
  overlay?: React.ReactNode;
  /** Extra class names for the <ion-content> element. */
  className?: string;
}

const AuthShell: React.FC<AuthShellProps> = ({
  backHref,
  backLabel,
  eyebrow,
  title,
  transitionKey,
  subtitle,
  children,
  overlay,
  className,
}) => {
  return (
    <IonPage>
      <IonContent fullscreen className={className ? `auth-page ${className}` : "auth-page"}>
    

        <div className="auth-backrow">
          <GlassBackButton fallbackHref={backHref} label={backLabel} />
        </div>

        <motion.div
          className="auth-sheet"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, ease: [0.22, 0.61, 0.36, 1] }}
        >
          <div className="auth-grip" aria-hidden="true" />

          <header className="auth-head">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={transitionKey ?? "default"}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
              >
                <span className="auth-eyebrow">{eyebrow}</span>
                <h1 className="auth-title">{title}</h1>
                {subtitle && <p className="auth-subtitle">{subtitle}</p>}
              </motion.div>
            </AnimatePresence>
          </header>

          {children}
        </motion.div>

        {overlay}
      </IonContent>
    </IonPage>
  );
};

export default AuthShell;
