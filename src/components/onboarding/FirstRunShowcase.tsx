import React, { useCallback, useEffect, useMemo, useState } from "react";
import { IonContent, IonPage, useIonViewDidEnter } from "@ionic/react";
import { motion, useReducedMotion } from "framer-motion";

import { SHOWCASE_SERVICES } from "../../data/servicesShowcase";
import { useSettings } from "../../context/SettingsContext";
import ShowcaseArt, { ShowcaseOperators } from "./ShowcaseArt";
import ShowcaseRipple from "./ShowcaseRipple";
import "./FirstRunShowcase.css";

/** Drag travel, in % of the deck width, that commits to the next/previous slide. */
const SWIPE_COMMIT = 22;

/** Chevron, pointing right by default. Decorative in every use, so it is hidden
 *  from assistive tech: each button carries its own text or aria-label saying
 *  which way the deck moves. */
const Chevron: React.FC<{ dir?: "left" | "right" }> = ({ dir = "right" }) => (
  <svg
    className="sc-cta-icon"
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
  >
    <path
      d={dir === "right" ? "M9 5l7 7-7 7" : "M15 5l-7 7 7 7"}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

interface FirstRunShowcaseProps {
  /** Called once the user finishes or skips. */
  onDone: (reason: "completed" | "skipped") => void;
}

/**
 * First-run services showcase.
 *
 * Six swipeable cards presenting what the app does, shown once per device to a
 * visitor with no account (see utils/firstRunShowcase.ts for the gating rules).
 *
 * Interaction choices worth knowing:
 *   - Every slide is mounted at once and translated horizontally rather than
 *     rendered conditionally, so the deck can be dragged continuously and a
 *     mid-swipe re-render cannot tear the stack.
 *   - Only the active slide is exposed to assistive tech; inactive slides are
 *     `aria-hidden` + `inert`, so a screen reader hears one service at a time
 *     instead of six headings back to back, and Tab cannot land on them.
 *   - Swipe is an enhancement, never the only way through: the prev/next chevrons
 *     and the dot indicators are real focusable buttons, and arrow keys page the
 *     deck. The chevrons are icon-only and transparent; each carries an aria-label
 *     so it still announces as "Previous"/"Next" rather than an unlabelled dot.
 */
const FirstRunShowcase: React.FC<FirstRunShowcaseProps> = ({ onDone }) => {
  const { t } = useSettings();
  const [index, setIndex] = useState(0);
  const total = SHOWCASE_SERVICES.length;
  const isLast = index === total - 1;

  /* The art's entrance is decorative, so it stands down with the OS setting
   * rather than fighting it. Read through framer's hook rather than the
   * prefersReducedMotion() util because that one samples the media query once
   * and never updates; this component stays mounted, so a user toggling the
   * setting mid-deck would otherwise keep getting the animation. */
  const reduceMotion = useReducedMotion();

  /* ── Shared "page ready" signal ──────────────────────────────────────────
   * All entrance animations (ripple, illustration layers, kicker) start from
   * this single flag rather than each counting their own independent timer.
   *
   * useIonViewDidEnter fires once the Ionic page-entry transition has fully
   * completed, so the flag is set only when the screen is actually visible —
   * not at mount, which on a pushed route happens while the incoming slide is
   * still mid-transition. A short settle delay (120 ms) gives the browser one
   * or two frames to finish any deferred layout work before the animations
   * kick off, so the first frame is never the "catch-up" frame of a keyframe
   * that started while layout was still running.
   *
   * Under prefers-reduced-motion the flag is never set and every child that
   * gates on it stays static, which is the correct outcome for a decorative
   * flourish nobody asked for. The CSS media query in FirstRunShowcase.css is
   * a belt-and-braces fallback for any animation that is not gated here. */
  const [pageReady, setPageReady] = useState(false);

  useIonViewDidEnter(() => {
    if (reduceMotion) return;
    const timer = window.setTimeout(() => setPageReady(true), 120);
    return () => window.clearTimeout(timer);
  });

  const goTo = useCallback(
    (next: number) => {
      setIndex(Math.max(0, Math.min(total - 1, next)));
    },
    [total],
  );

  const advance = useCallback(() => {
    if (isLast) onDone("completed");
    else goTo(index + 1);
  }, [goTo, index, isLast, onDone]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowRight") goTo(index + 1);
    else if (event.key === "ArrowLeft") goTo(index - 1);
  };

  // iOS Safari otherwise overscroll-drags the page sideways mid-swipe.
  useEffect(() => {
    const previous = document.body.style.overscrollBehaviorX;
    document.body.style.overscrollBehaviorX = "contain";
    return () => {
      document.body.style.overscrollBehaviorX = previous;
    };
  }, []);

  const progress = useMemo(
    () =>
      t("sc_progress")
        .replace("{current}", String(index + 1))
        .replace("{total}", String(total)),
    [index, t, total],
  );

  return (
    <IonPage>
      <IonContent fullscreen className="sc-content">
        {/* Same funnel gradient as the landing page, so the first frame of the
            install matches the screen the user lands on afterwards. */}

        <div className="sc-frame">
          {/* Concentric ripple, painted over the deck but under the header and
              footer. It has to sit ABOVE the card: the sheet is a 0.9-alpha
              white, so a backdrop layer would survive at 10% strength and read
              as blank. See ShowcaseRipple for the geometry. */}
          <ShowcaseRipple ready={pageReady} />

          <header className="sc-head">
            <motion.p
              className="sc-kicker"
              initial={{ opacity: 0, y: -12 }}
              animate={pageReady ? { opacity: 1, y: 0 } : { opacity: 0, y: -12 }}
              transition={{ duration: 0.5 }}
            >
              {t("sc_kicker")}
            </motion.p>
            <button type="button" className="sc-skip" onClick={() => onDone("skipped")}>
              {t("sc_skip")}
            </button>
          </header>

          <div
            className="sc-deck"
            role="group"
            aria-roledescription="carousel"
            aria-label={t("sc_headline")}
            tabIndex={0}
            onKeyDown={onKeyDown}
          >
            <motion.div
              className="sc-track"
              animate={{ x: `${-index * 100}%` }}
              transition={{ type: "spring", stiffness: 260, damping: 32 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.12}
              onDragEnd={(_, info) => {
                // Framer reports total gesture travel; the same commit threshold
                // is expressed as a share of the deck width.
                const travel = info.offset.x;
                if (travel <= -SWIPE_COMMIT) goTo(index + 1);
                else if (travel >= SWIPE_COMMIT) goTo(index - 1);
              }}
            >
              {SHOWCASE_SERVICES.map((service, i) => {
                const active = i === index;

                return (
                <section
                  key={service.id}
                  className="sc-slide"
                  aria-hidden={!active}
                  inert={!active}
                >
                  <article className="sc-card">
                    {/* The illustration, described once here for assistive tech.
                        The description lives on this wrapper rather than on the
                        <img> because ShowcaseArt renders decorative art with
                        alt="", so this is the only announcement — putting a
                        label on both would read the slide out twice.

                        ENTRANCE ANIMATION, AND WHY IT IS KEYED ON `active`.
                        Every slide is mounted at once (see the header note), so
                        a mount-triggered entrance would play for all six while
                        five of them are off screen and the user would never see
                        it. Framer only reads `initial` at mount, so re-running
                        the animation on arrival means remounting: the key flips
                        with `active`, which mounts the art fresh each time its
                        slide is reached and replays the spring.

                        `initial` is only set to the hidden state when `pageReady`
                        is already true at re-mount time — i.e. when the user
                        navigates to a slide after the page transition has
                        settled. For the first slide, `pageReady` is false at
                        mount so `initial={false}` and `animate` drives it
                        straight to visible with no delay. This prevents the
                        SVG from being invisible during the Ionic page
                        transition before `useIonViewDidEnter` fires. */}
                    <motion.div
                      key={`${service.id}-${active ? "in" : "out"}`}
                      className="sc-card-art"
                      role="img"
                      aria-label={t(service.artAltKey)}
                      /* `initial` is the hidden state only when the animation is
                       * actually going to play: `pageReady` is already true (page
                       * transition done) AND motion is allowed. For the first
                       * slide before `pageReady`, this evaluates to `false` so
                       * Framer skips the hidden-then-animate cycle and the art
                       * is visible immediately. For subsequent slides, `pageReady`
                       * is already true at re-mount (because the key flip happens
                       * after the page has settled), so the entrance plays. */
                      initial={active && !reduceMotion && pageReady ? { opacity: 0, scale: 0.9 } : false}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={
                        active && !reduceMotion && pageReady
                          ? { type: "spring", stiffness: 220, damping: 22 }
                          : { duration: 0 }
                      }
                    >
                      <ShowcaseArt art={service.art} ready={pageReady} />
                    </motion.div>
                    {/* The mobile-money marks, on the wallet slide only. Inside
                        the copy block rather than the art disc: the disc is a
                        fixed 240px circle and a logo row would clip against its
                        border-radius. See ShowcaseOperators for the trademark
                        rules — these are the operators' real artwork. */}
                    <ShowcaseOperators art={service.art} />
                    <div className="sc-card-copy">
                      <h2 className="sc-card-title">{t(service.titleKey)}</h2>
                      <p className="sc-card-body">{t(service.bodyKey)}</p>
                    </div>
                  </article>
                </section>
                );
              })}
            </motion.div>
          </div>

          <footer className="sc-foot">
            <p className="sc-sub">{t("sc_sub")}</p>

            {/* Plain buttons in a labelled group rather than a tablist: the
                dots drive a carousel, not tab panels, and a tablist without
                matching tabpanels is invalid ARIA. */}
            <div className="sc-dots" role="group" aria-label={progress}>
              {SHOWCASE_SERVICES.map((service, i) => (
                <button
                  key={service.id}
                  type="button"
                  aria-current={i === index}
                  aria-label={`${i + 1} / ${total}`}
                  className={`sc-dot${i === index ? " sc-dot-on" : ""}`}
                  onClick={() => goTo(i)}
                />
              ))}
            </div>

            <p className="sc-progress" aria-live="polite">
              {progress}
            </p>

            <div className="sc-actions">
              {/* Icon-only pager. The visible label is gone, so the accessible
                  name has to come from aria-label or the button announces as a
                  bare unlabelled control. */}
              <motion.button
                type="button"
                className="sc-nav"
                onClick={() => goTo(index - 1)}
                disabled={index === 0}
                aria-label={t("sc_prev")}
                whileTap={index === 0 ? undefined : { scale: 0.9 }}
              >
                <Chevron dir="left" />
              </motion.button>

              <motion.button
                type="button"
                className="sc-nav"
                onClick={advance}
                /* The last slide's button is the finish action, so its accessible
                   name says "Create my account" even though it now draws the same
                   chevron as every other step. The visible control is a uniform
                   pager now, so the action is no longer spelled out on screen —
                   which means this label is the only thing telling a screen
                   reader user what the last press actually does. Don't drop it in
                   favour of sc_next. */
                aria-label={isLast ? t("sc_start") : t("sc_next")}
                whileTap={{ scale: 0.9 }}
              >
                {/* Same chevron on every slide, last one included. An earlier
                    version promoted the final button to a brand-filled pill
                    reading "Create my account" with a tick; that made the pager
                    jump in width and fill colour on the last step, and the deck
                    is a uniform pager rather than a form with a submit button —
                    onboarding continues into the landing page, where sign-up
                    lives. The finish action is therefore expressed in the
                    accessible name only. */}
                <Chevron />
              </motion.button>
            </div>
          </footer>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default FirstRunShowcase;
