import React, { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

import {
  hasSeenServicesShowcase,
  markServicesShowcaseSeen,
  SHOWCASE_PREVIEW_REQUESTED,
} from "../../utils/firstRunShowcase";
import FirstRunShowcase from "./FirstRunShowcase";

type Phase = "checking" | "show" | "done";

interface FirstRunGateProps {
  /** Rendered in place of the showcase once it has been seen or dismissed. */
  children: ReactNode;
}

/**
 * Decides whether the first-run services showcase plays.
 *
 * Three requirements have to line up, and each is checked in a different place:
 *
 *   - no account  → guaranteed by position. This gate only renders inside the
 *     `!currentUser` branch of App.tsx, and App deliberately signs out any
 *     session Firebase restores, so it cannot be shown to a signed-in user.
 *   - first launch on this device → hasSeenServicesShowcase(), which reads
 *     Capacitor Preferences with a localStorage mirror.
 *   - a deliberate exit → the flag is written on both "Skip" and "Get started",
 *     so there is no way out of the deck that leaves it to replay forever.
 *
 * While the flag is being read we render nothing rather than flashing the
 * landing page and then covering it, which would look like a glitch. The flag
 * read is a single key lookup, so this state lasts a single frame in practice.
 *
 * It renders `children` directly once finished instead of redirecting to it:
 * the funnel's back target for the landing page does not exist, so there is
 * nothing to pop back to, and swapping the component in place keeps the router
 * history untouched.
 */
const FirstRunGate: React.FC<FirstRunGateProps> = ({ children }) => {
  const [phase, setPhase] = useState<Phase>("checking");

  useEffect(() => {
    // ShowcasePreview already owns the screen during a preview (it has to, in
    // order to work while signed in). Standing aside here avoids stacking two
    // decks on the landing route.
    if (SHOWCASE_PREVIEW_REQUESTED) return;

    let active = true;
    hasSeenServicesShowcase()
      .then((seen) => {
        if (active) setPhase(seen ? "done" : "show");
      })
      .catch(() => {
        // Storage unreadable: prefer showing the pitch once over never showing it.
        if (active) setPhase("show");
      });
    return () => {
      active = false;
    };
  }, []);

  const handleDone = useCallback(() => {
    // Optimistic: reveal the landing page immediately and persist in the
    // background. Awaiting the write would stall the exit on a few ms of I/O.
    setPhase("done");
    void markServicesShowcaseSeen();
  }, []);

  if (SHOWCASE_PREVIEW_REQUESTED) return <>{children}</>;
  if (phase === "checking") return null;
  if (phase === "show") return <FirstRunShowcase onDone={handleDone} />;
  return <>{children}</>;
};

export default FirstRunGate;

/**
 * Full-screen showcase preview for design review.
 *
 * Separate from FirstRunGate on purpose. That gate sits inside the signed-out
 * branch of App, so on a device where someone is already logged in it never
 * renders and the deck cannot be reviewed at all. This one ignores auth state
 * and the stored flag, which is what you want when deliberately looking at it.
 *
 * Portalled to <body> rather than rendered in place. FirstRunShowcase roots an
 * IonPage, and Ionic positions those absolutely at z-index 0 relative to an
 * IonRouterOutlet. Mounted beside the router instead of inside it, the deck
 * landed underneath the active page and never became visible — the DOM said it
 * was there, the screen said otherwise. A portal to <body> puts it last in
 * paint order, which is what "preview it on top of the app" requires.
 *
 * Returns null unless the page load asked for it (see
 * SHOWCASE_PREVIEW_REQUESTED), and is a no-op in production builds.
 */
export const ShowcasePreview: React.FC = () => {
  const [dismissed, setDismissed] = useState(!SHOWCASE_PREVIEW_REQUESTED);

  // Portals need a DOM, so wait for one rather than assuming.
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => setHost(document.body), []);

  if (!SHOWCASE_PREVIEW_REQUESTED || dismissed || !host) return null;

  return createPortal(
    // Dismissal is deliberately not persisted: previewing must not consume the
    // real first-run experience on this device.
    <FirstRunShowcase onDone={() => setDismissed(true)} />,
    host,
  );
};
