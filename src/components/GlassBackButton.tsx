import React from "react";
import { IonButton, IonIcon } from "@ionic/react";
import { chevronBackOutline } from "ionicons/icons";
import { useHistory } from "react-router";

/**
 * Shared onboarding/auth back control.
 *
 * Icon-only circular control (no "Back" text) — a flat translucent light-white
 * disc with no border and no rim — used on the role pickers, sign-in, sign-up and
 * password-recovery pages.
 *
 * Navigation: the public auth routes are plain <Route> children of
 * <IonReactRouter> with no <IonRouterOutlet>, so they have no page stack of
 * their own. The previous implementation called `router.push(target, "back")`,
 * which *appended* an entry instead of returning to the previous screen, so
 * every tap grew the stack and the browser/hardware back button cycled through
 * dead auth screens. The funnel is strictly linear and its targets are fully
 * derivable (see utils/authFlow), so this navigates to an explicit route with
 * `replace()`: the current entry is swapped out, the stack never grows, and
 * system back stays predictable — including on a cold deep link, where there is
 * no in-app entry to pop.
 */
interface GlassBackButtonProps {
  /** Route to return to, e.g. the role picker for this screen's stage. */
  fallbackHref: string;
  /** Accessible label for the icon-only button. */
  label?: string;
  /** Extra class names, merged with the base `auth-back` treatment. */
  className?: string;
}

const GlassBackButton: React.FC<GlassBackButtonProps> = ({
  fallbackHref,
  label = "Go back",
  className,
}) => {
  const history = useHistory();

  const handleClick = () => {
    // Nothing sensible to go back to from a deep link or a hard refresh.
    if (!fallbackHref || fallbackHref === history.location.pathname) {
      return;
    }
    history.replace(fallbackHref);
  };

  return (
    <IonButton
      fill="clear"
      className={className ? `auth-back ${className}` : "auth-back"}
      onClick={handleClick}
      aria-label={label}
    >
      <IonIcon slot="icon-only" icon={chevronBackOutline} />
    </IonButton>
  );
};

export default GlassBackButton;
