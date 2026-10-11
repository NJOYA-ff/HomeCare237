/**
 * Concentric "ripple" backdrop for the first-run showcase.
 *
 * Thirteen rings on a diagonal axis, each rotated a little further around the
 * canvas centre than the last. Because the ring centres sit on the 45° diagonal
 * at a decreasing distance from the middle while the rotation decreases with
 * them, the stack reads as a single spiral rather than as flat concentric
 * circles — that offset is the whole effect, so the cx/rotate pairs below are
 * load-bearing and must not be "simplified" into a centred ring set.
 *
 * WHY AN OVERLAY AND NOT PART OF THE BACKDROP. The obvious placement is behind
 * the card, next to the funnel gradient, and it does not work: the sheet is a
 * 0.9-alpha white, so anything behind it survives at 10% strength. The most
 * saturated ring here (#ff3895) comes out the far side as rgb(255, 235, 244) —
 * indistinguishable from the white sheet. So the ripple is painted *over* the
 * deck at low opacity instead, under the header and footer. See the layering
 * note in FirstRunShowcase.css before moving it.
 *
 * COLOUR is fixed rather than a theme token, for the same reason as the
 * illustrations: these are meant to read as a tinted light show on a white
 * sheet, and a theme-aware hue would vanish in one mode or the other. Safe only
 * while the card stays a light sheet in both themes — see ShowcaseArt.
 *
 * Purely decorative: `aria-hidden` on the wrapper, and the rings are
 * `fill="none"` strokes, so nothing here is exposed to assistive tech.
 *
 * WHY THE CLASS INSTEAD OF A CSS-ONLY ANIMATION. The rings draw themselves in
 * once, shortly after mount, via the `sc-ripple-svg--animated` class. This is
 * the React form of the usual static-page snippet —
 *
 *     document.addEventListener('DOMContentLoaded', () =>
 *       setTimeout(() => document.querySelector('svg').classList.add('animated'), 1000));
 *
 * — except the timing is now driven by the parent (FirstRunShowcase) via a
 * `ready` prop rather than this component's own timer. That lets all animations
 * on the page start from the same signal: when Ionic's page transition ends
 * (useIonViewDidEnter) the parent sets `pageReady = true` and passes it here,
 * so the ripple, the art, and the Framer Motion entrances all fire together
 * instead of each counting their own 1000ms from mount.
 *
 * Nothing here gates comprehension, so the animation is skipped entirely under
 * `prefers-reduced-motion` (see the media query in FirstRunShowcase.css).
 */
import React from "react";

interface RippleRing {
  /** Ring radius in viewBox units. */
  r: number;
  /** Centre on the diagonal; cy is always equal to cx (see the header note). */
  cx: number;
  /** Stroke width, thickening toward the centre. */
  width: number;
  /** Hue, walking magenta -> indigo from the outermost ring inward. */
  stroke: string;
  /** Per-ring opacity, ramping 0.1 -> 1.0 toward the centre. */
  opacity: number;
  /** Degrees rotated about the canvas centre. */
  rotate: number;
}

/** Outer ring first, so the faintest paints underneath the brightest. */
const RINGS: readonly RippleRing[] = [
  { r: 50, cx: 684, width: 4, stroke: "#ff3895", opacity: 0.1, rotate: 100 },
  { r: 58.3333, cx: 660.3333, width: 5, stroke: "#f645a1", opacity: 0.175, rotate: 91.6667 },
  { r: 66.6667, cx: 636.6667, width: 6, stroke: "#ed50ab", opacity: 0.25, rotate: 83.3333 },
  { r: 75, cx: 613, width: 7, stroke: "#e35ab5", opacity: 0.325, rotate: 75 },
  { r: 83.3333, cx: 589.3333, width: 8, stroke: "#d962bf", opacity: 0.4, rotate: 66.6667 },
  { r: 91.6667, cx: 565.6667, width: 9, stroke: "#cf6ac8", opacity: 0.475, rotate: 58.3333 },
  { r: 100, cx: 542, width: 10, stroke: "#c472d1", opacity: 0.55, rotate: 50 },
  { r: 108.3333, cx: 518.3333, width: 11, stroke: "#b879d9", opacity: 0.625, rotate: 41.6667 },
  { r: 116.6667, cx: 494.6667, width: 12, stroke: "#ab7fe1", opacity: 0.7, rotate: 33.3333 },
  { r: 125, cx: 471, width: 13, stroke: "#9e86e9", opacity: 0.775, rotate: 25 },
  { r: 133.3333, cx: 447.3333, width: 14, stroke: "#8f8cf1", opacity: 0.85, rotate: 16.6667 },
  { r: 141.6667, cx: 423.6667, width: 15, stroke: "#7e91f8", opacity: 0.925, rotate: 8.3333 },
  { r: 150, cx: 400, width: 16, stroke: "#6b97ff", opacity: 1, rotate: 0 },
];

/** Matches the source art's 800x800 canvas; the CSS box decides the rendered size. */
const VIEW_BOX = "0 0 800 800";

interface ShowcaseRippleProps {
  /**
   * When true the rings begin their draw-in animation.
   * Driven by the parent (FirstRunShowcase) once the Ionic page transition
   * has finished, so the ripple starts at the same moment as all the other
   * showcase entrances rather than on its own independent timer.
   */
  ready: boolean;
}

const ShowcaseRipple: React.FC<ShowcaseRippleProps> = ({ ready }) => {
  /* `ready` itself drives the animated class directly — no local timer needed.
   * The parent is responsible for the delay between page-visible and ready=true,
   * so this component stays stateless with respect to timing. */

  return (
    <svg
      /* The class is what the draw-on keyframes hang off. See the header note for
         why the timing is driven by the parent rather than a local timer. */
      className={`sc-ripple-svg${ready ? " sc-ripple-svg--animated" : ""}`}
      viewBox={VIEW_BOX}
      /* Decorative: the slide's own art carries the accessible description. */
      aria-hidden="true"
      focusable="false"
    >
      {RINGS.map(({ r, cx, width, stroke, opacity, rotate }, i) => (
        <circle
          key={r}
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          stroke={stroke}
          strokeWidth={width}
          opacity={opacity}
          transform={`rotate(${rotate}, 400, 400)`}
          /* Normalises the dash math to 0..1 for every ring regardless of its
             real circumference, so one keyframe can draw all of them. See the
             .sc-ripple-svg circle rule. */
          pathLength={1}
          /* Stagger, so the stack assembles from the outside in rather than all
             at once. i is the ring's index in RINGS, which is already ordered
             outermost-first, so the delay needs no separate sort. */
          style={{ animationDelay: `${i * 55}ms` }}
        />
      ))}
    </svg>
  );
};

export default ShowcaseRipple;