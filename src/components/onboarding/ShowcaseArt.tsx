/**
 * Artwork for the first-run showcase cards.
 *
 * Every slide is a stock illustration from Storyset, all six from the same
 * collection and the same "Rafiki" style so the deck reads as one set. They are
 * vendored as files under `../../assets/showcase/`. Provenance and licence for
 * each file are in ../../assets/showcase/ATTRIBUTION.md — the credit that
 * licence requires is rendered by the About alert in the Settings pages.
 *
 * WHY STOCK, NOT DRAWN. These six were hand-drawn first, in ./showcaseScenes,
 * and that code is now deleted. The drawn scenes were geometric abstractions —
 * a circle-and-rectangle call window for consult, a capsule beside a clock for
 * medication — and at the ~218px this deck renders them, they read as diagrams
 * of a concept rather than as a scene carrying the pitch. Real illustration
 * fixed that for consult, which is why the art was replaced wholesale rather
 * than slide by slide: one stock illustration beside five drawn scenes is
 * worse than either, because the deck looks like it was assembled from two
 * sources.
 *
 * PHOTOGRAPHY IS STILL THE WRONG ANSWER. Flat illustration is deliberate.
 * Photos were tried before the drawn scenes and reverted: the crops read as
 * generic stock next to the rest of the product, and they pinned the card to a
 * fixed aspect ratio.
 *
 * ── Why these are inlined rather than <img> ──
 * They used to be <img src="...svg">, which isolated each one in its own
 * document — the reason the vendor's un-namespaced `<g id>` values never
 * collided between the two decks that can mount at once. That isolation is
 * also exactly why they could not be animated: an <img>-loaded SVG is a
 * separate document, so no page script can add a class to its root and no page
 * stylesheet can reach its layers. Storyset ships its motion keyed on an
 * `.animated` class on the root <svg>, which is unreachable through <img>.
 *
 * Inlining costs that isolation, so buildSceneMarkup above namespaces every
 * id per mounted deck to win it back — see its note and ATTRIBUTION.md. The
 * trade is deliberate: the vendor's own <g id> values would otherwise cross
 * over between the real first-run gate and the `?showcase=1` preview overlay.
 *
 * The artwork is decorative: its description lives once on the wrapper in
 * FirstRunShowcase, because labelling both would announce each slide twice.
 * The inline <svg> therefore carries aria-hidden rather than a label.
 *
 * All six illustrations are 500x500 and drawn to bleed to their own canvas
 * edges, which is why `.sc-art-svg` preserves the slice at its natural aspect
 * rather than letting it letterbox.
 */
import React, { useEffect, useId, useMemo, useState } from "react";

import type { ShowcaseArtId } from "../../data/servicesShowcase";
import { buildSceneMarkup } from "./buildSceneMarkup";

/* `?raw` gives the file's source text instead of a URL, which is what lets the
 * art be inlined and animated. See the header note on why inlining is required. */
import ambulanceArt from "../../assets/showcase/storyset-ambulance-rafiki.svg?raw";
import healthPassportArt from "../../assets/showcase/storyset-health-passport-rafiki.svg?raw";
import medicalPrescriptionArt from "../../assets/showcase/storyset-medical-prescription-rafiki.svg?raw";
import mobilePaymentsArt from "../../assets/showcase/storyset-mobile-payments-rafiki.svg?raw";
import onlineDoctorArt from "../../assets/showcase/storyset-online-doctor-rafiki.svg?raw";
import scheduleArt from "../../assets/showcase/storyset-schedule-rafiki.svg?raw";

/* The operators' real logo artwork, on transparent backgrounds. See the
 * trademark note on OPERATOR_LOGOS before replacing or recolouring these. */
import mtnMomoLogo from "../../assets/operators/mtn-momo.png";
import orangeMoneyLogo from "../../assets/operators/orange-money.png";

/**
 * The two mobile-money operators this app actually bills through.
 *
 * TRADEMARK. These are the operators' own marks, vendored as files rather than
 * redrawn. Redrawing a mobile-money logo is both legally worse and visually
 * worse: the wordmark *is* the asset, so a hand-built approximation reads as a
 * fake, and both operators enforce brand guidelines on their own marks. The
 * consequence is that these are replace-only — do not recolour, stretch, add
 * effects or set them in a type style. To add an operator, drop its official
 * mark in src/assets/operators/ and add a row here.
 *
 * WHY THE CHIPS ARE BRAND GROUNDS AND NOT THE PALETTE. The marks are
 * transparent PNGs, and each one is drawn in colours that need the field its
 * designers put it on: MTN MoMo's wordmark is MTN yellow (#ffcb05), which
 * vanishes on a yellow chip, and Orange Money's wordmark is white, which
 * vanishes on the white sheet. So each mark sits on the backdrop from the
 * operator's own exported artwork — MTN blue #004F71 and Orange's black — and
 * nothing else. That is also why the marks are replace-only: a yellow-on-yellow
 * chip is the failure mode a recolour "fix" would introduce.
 */
const OPERATOR_LOGOS = [
  {
    id: "mtn-momo",
    label: "MTN MoMo",
    src: mtnMomoLogo,
    chip: "#004F71",
  },
  {
    id: "orange-money",
    label: "Orange Money",
    src: orangeMoneyLogo,
    chip: "#000000",
  },
] as const;

interface ShowcaseArtProps {
  /** Which illustration to show. */
  art: ShowcaseArtId;
}

/**
 * Every scene, keyed by id. Typed as a total Record rather than a Partial one
 * on purpose: adding a service without its artwork should fail the build here,
 * not render a blank disc at runtime. The artwork is part of the service entry.
 */
const SCENE_ART: Record<ShowcaseArtId, string> = {
  /** Video consult: the call itself. */
  consult: onlineDoctorArt,
  /** Appointments: a calendar with the slot confirmed. */
  appointments: scheduleArt,
  /** Records: the health passport holding them. */
  records: healthPassportArt,
  /** Medication: the prescription being written. */
  medication: medicalPrescriptionArt,
  /** Emergency: the ambulance responding. */
  emergency: ambulanceArt,
  /** Wallet: paying by phone, as MTN MoMo and Orange Money are used here. */
  wallet: mobilePaymentsArt,
};

/**
 * Beat between mount and the illustration's draw-in, in ms. Matches the delay in
 * ShowcaseRipple so the art and the ripple settle together rather than in two
 * separate waves.
 */
const ANIMATE_AFTER_MS = 1000;

/**
 * Whether this user has asked for less motion.
 *
 * Read once per mount rather than tracked, because it cannot change without a
 * reload of the OS setting and React would otherwise re-run every layer's
 * animation if it did. Guarding in JS as well as in CSS is deliberate: CSS alone
 * would still mount the keyframes and then cancel them, and the media query
 * cannot reach the inline `--sc-layer-i` stagger.
 */
const prefersReducedMotion = (): boolean =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const ShowcaseArt: React.FC<ShowcaseArtProps> = ({ art }) => {
  /* React's useId is stable across renders and unique per mounted instance,
   * which is exactly the property the id namespacing needs: two decks mounted
   * at once get different prefixes, so neither can resolve the other's layers.
   * It contains colons, so it is sanitised into something valid in a CSS
   * selector and an HTML id. */
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");

  /* Parsed once per art per deck. The illustration is large (20-70KB of markup)
   * and re-running this regex pass on every render of a six-slide deck would be
   * wasteful; `art` is the only input that changes the result. */
  const { viewBox, inner } = useMemo(() => buildSceneMarkup(SCENE_ART[art], uid), [art, uid]);

  /* THE VENDOR'S OWN CONTRACT. Storyset's illustrations animate when a class
   * named `animated` is present on the root <svg>, which is what the usual
   * static-page snippet toggles:
   *
   *     document.addEventListener('DOMContentLoaded', () =>
   *       setTimeout(() => document.querySelector('svg').classList.add('animated'), 1000));
   *
   * Reproduced in React, and kept as a class rather than applied to the DOM node
   * directly for three reasons. The artwork is inlined (see the header), so the
   * selector is ours to choose and does not have to be `document.querySelector` —
   * which would have matched ShowcaseRipple's <svg> first and animated the wrong
   * element. A component-scoped class survives React re-renders, which a manual
   * classList write would not. And under prefers-reduced-motion the timer is
   * never scheduled at all, so the layers are never animated and never left
   * mid-entrance.
   *
   * The timer lives in an effect with its own clearTimeout because this mounts
   * and unmounts with the deck: a user who taps straight through the six slides
   * unmounts the art within the second, and an uncleared timer would set state
   * on a gone component. */
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const timer = window.setTimeout(() => setAnimated(true), ANIMATE_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <svg
      className={`sc-art-svg${animated ? " animated" : ""}`}
      viewBox={viewBox}
      /* Matches the source art's square canvas and bleeds like the old
         object-fit: cover did, rather than letterboxing. */
      preserveAspectRatio="xMidYMid slice"
      /* Decorative: the wrapper in FirstRunShowcase carries the description, so
         this must not announce itself a second time. */
      aria-hidden="true"
      focusable="false"
      /* The markup is our own vendored, build-time-constant asset — never user
         input — run through buildSceneMarkup above. See the header note. */
      dangerouslySetInnerHTML={{ __html: inner }}
    />
  );
};

/**
 * The operator marks, rendered as their own row rather than inside the art disc.
 *
 * Separate from <ShowcaseArt> for layout, not logic: the art sits in a 240px
 * circle, and dropping a two-up logo row into that circle would crowd the
 * illustration and clip against the border-radius. It rides below the disc with
 * the copy instead, so it can breathe.
 *
 * Returns null for every slide but the wallet, which is the only one that names
 * an operator.
 *
 * TRADEMARK. These are the operators' real marks, and they are here because the
 * slide's whole claim is "pay the way Cameroon pays" — naming MTN MoMo and
 * Orange Money is the point, and a generic bank card would undercut it. That
 * also means these are the only third-party trademarks on this screen, and the
 * operators do not grant us permission to alter their marks. So: use them
 * as-is, in their own colours, never recoloured to the palette and never
 * stretched. Both files are the operators' artwork with only the exported
 * backdrop removed (the supplied PNGs were logo-on-solid-colour exports, which
 * would otherwise read as coloured rectangles on a white card). If a mark is
 * ever replaced, replace it with another official asset rather than editing it.
 */
export const ShowcaseOperators: React.FC<{ art: ShowcaseArtId }> = ({ art }) => {
  if (art !== "wallet") return null;

  return (
    <ul className="sc-operators">
      {OPERATOR_LOGOS.map((op) => (
        <li key={op.id} className="sc-operator">
          {/* The chip fill comes from the operator's own brand ground, inline
              rather than in the stylesheet: these are third-party trademarks, so
              their colours travel with the asset instead of being editable in a
              project-wide CSS file someone will eventually restyle. */}
          <span className="sc-operator-chip" style={{ background: op.chip }}>
            {/* Real image with real alt text, not decoration — the mark is the
                content of this row. */}
            <img className="sc-operator-logo" src={op.src} alt={op.label} />
          </span>
        </li>
      ))}
    </ul>
  );
};

export default ShowcaseArt;