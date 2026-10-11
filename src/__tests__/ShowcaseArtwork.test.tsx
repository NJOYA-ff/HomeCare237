/**
 * The two pieces of the showcase that carry third-party artwork and motion.
 *
 * The deck's gating and routing behaviour lives in
 * FirstRunShowcase.firstRun.test.tsx, which mounts the whole <App>. What is
 * covered here is narrower and only reachable through those two components:
 *
 *   - the ripple gains its `--animated` class when `ready={true}` is passed,
 *     and stays unanimated when `ready={false}`
 *   - the wallet slide is the only one carrying the operator marks, and it
 *     names both operators in real alt text
 *
 * Note: the ripple no longer owns an internal timer. The parent (FirstRunShowcase)
 * is responsible for the delay and passes `ready` once the page transition ends.
 * These tests therefore drive `ready` directly rather than advancing fake timers.
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ShowcaseRipple from "../components/onboarding/ShowcaseRipple";
import { ShowcaseOperators } from "../components/onboarding/ShowcaseArt";
import { SHOWCASE_SERVICES } from "../data/servicesShowcase";
import type { ShowcaseArtId } from "../data/servicesShowcase";

const WALLET: ShowcaseArtId = "wallet";
/* Any non-wallet slide, taken from the real deck rather than hardcoded, so this
   stays a genuine "every other slide" as services are added or renamed. */
const OTHER_SLIDE = SHOWCASE_SERVICES.find((s) => s.art !== WALLET)!.art;

describe("ShowcaseRipple", () => {
  it("holds the rings back when ready=false", () => {
    const { container } = render(<ShowcaseRipple ready={false} />);
    const svg = container.querySelector("svg");

    // Not animated: the class is what the draw-on keyframes hang off, and it
    // must not appear until the parent signals ready.
    expect(svg).not.toHaveClass("sc-ripple-svg--animated");
  });

  it("marks the SVG animated immediately when ready=true", () => {
    const { container } = render(<ShowcaseRipple ready={true} />);
    const svg = container.querySelector("svg");

    expect(svg).toHaveClass("sc-ripple-svg--animated");
  });

  it("removes the animated class when ready flips back to false", () => {
    const { container, rerender } = render(<ShowcaseRipple ready={true} />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveClass("sc-ripple-svg--animated");

    rerender(<ShowcaseRipple ready={false} />);
    expect(svg).not.toHaveClass("sc-ripple-svg--animated");
  });

  it("normalises every ring's dash length so one keyframe can draw them all", () => {
    const { container } = render(<ShowcaseRipple ready={false} />);
    const rings = container.querySelectorAll("circle");

    expect(rings.length).toBeGreaterThan(1);
    // pathLength=1 rewrites the dash maths to 0..1 regardless of each ring's
    // real circumference; without it the offset would need a per-ring constant.
    rings.forEach((ring) => {
      expect(ring).toHaveAttribute("pathLength", "1");
    });
  });
});

describe("ShowcaseOperators", () => {
  it("shows both real marks on the wallet slide, named for assistive tech", () => {
    render(<ShowcaseOperators art={WALLET} />);

    // Real alt text, not alt="": the mark is the content of this row, and the
    // point of the slide is naming the operators Cameroon actually pays with.
    expect(screen.getByAltText("MTN MoMo")).toBeInTheDocument();
    expect(screen.getByAltText("Orange Money")).toBeInTheDocument();
  });

  it("renders nothing on any other slide", () => {
    const { container } = render(<ShowcaseOperators art={OTHER_SLIDE} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing on any non-wallet slide in the deck", () => {
    // The guard is `art !== "wallet"`, so this pins it against every current
    // slide: a new service cannot quietly start claiming these trademarks.
    SHOWCASE_SERVICES.filter((s) => s.art !== WALLET).forEach((service) => {
      const { container, unmount } = render(<ShowcaseOperators art={service.art} />);
      expect(container, `slide "${service.id}" must not render operator marks`).toBeEmptyDOMElement();
      unmount();
    });
  });
});