/**
 * The layer-parsing that makes the showcase illustrations animatable.
 *
 * These are the assertions that are easy to get wrong and impossible to notice:
 * a missed layer is a still illustration, and a wrongly-namespaced id is an
 * invisible scene in one of the two decks. Both present as "the art is broken"
 * with nothing in the console, so they are pinned here.
 */
import { describe, expect, it } from "vitest";

import { buildSceneMarkup } from "../components/onboarding/buildSceneMarkup";

/** A miniature stand-in with the same shape as the real vendored files. */
const SAMPLE = `<!-- vendored from Storyset -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500">
  <g id="background-complete">
    <g id="background-complete-inject-0"><path d="M0 0"/></g>
  </g>
  <g id="Shadow" transform="translate(10,10)">
    <ellipse cx="5" cy="5" rx="5" ry="5"/>
  </g>
  <!-- a comment mentioning <g id="decoy"></g>, which must be left alone -->
  <g id="Character">
    <g id="Character-inject-0"><path d="M1 1"/></g>
  </g>
  <g id="props-inject-0"/>
</svg>`;

describe("buildSceneMarkup", () => {
  it("reads the root viewBox rather than hard-coding it", () => {
    expect(buildSceneMarkup(SAMPLE, "a").viewBox).toBe("0 0 500 500");
    expect(buildSceneMarkup('<svg viewBox="0 0 64 64"><g id="x"/></svg>', "a").viewBox).toBe(
      "0 0 64 64",
    );
  });

  it("namespaces every top-level id so two mounted decks cannot collide", () => {
    const { inner } = buildSceneMarkup(SAMPLE, "deck1");
    expect(inner).toContain('id="deck1-background-complete"');
    expect(inner).toContain('id="deck1-Character"');
    /* The vendor's bare id must be gone, not merely prefixed somewhere. */
    expect(inner).not.toMatch(/id="(Character|Shadow)"/);
  });

  it("gives two instances of the same file different ids", () => {
    const a = buildSceneMarkup(SAMPLE, "deck1").inner;
    const b = buildSceneMarkup(SAMPLE, "deck2").inner;
    expect(a).not.toBe(b);
    expect(b).toContain('id="deck2-Character"');
  });

  it("stamps layers with a class and a back-to-front stagger index", () => {
    const { inner } = buildSceneMarkup(SAMPLE, "a");
    const indices = [...inner.matchAll(/--sc-layer-i:(\d+)/g)].map((m) => m[1]);
    /* Four top-level groups (background, Shadow, Character, props), indexed in
       file order. The two `*-inject-*` wrappers are nested and must not appear. */
    expect(indices).toEqual(["0", "1", "2", "3"]);
    expect(inner).toContain('class="sc-svg-layer"');
  });

  it("marks the character layer so it can animate separately", () => {
    const { inner } = buildSceneMarkup(SAMPLE, "a");
    expect(inner).toMatch(/id="a-Character"[^>]*class="sc-svg-layer sc-svg-layer--character"/);
  });

  it("stamps only direct children, never the vendor's nested wrappers", () => {
    const { inner } = buildSceneMarkup(SAMPLE, "a");
    /* A nested group animating on its own would double up with its parent. */
    expect(inner).not.toContain("a-background-complete-inject-0");
    expect(inner).not.toContain("a-Character-inject-0");
    /* It must survive untouched, id and all. */
    expect(inner).toContain('id="Character-inject-0"');
  });

  it("keeps the vendor's other attributes on a stamped group", () => {
    const { inner } = buildSceneMarkup(SAMPLE, "a");
    expect(inner).toContain('id="a-Shadow"');
    expect(inner).toContain('transform="translate(10,10)"');
  });

  it("does not treat markup inside a comment as an element", () => {
    const { inner } = buildSceneMarkup(SAMPLE, "a");
    expect(inner).not.toContain("a-decoy");
    expect(inner).toContain('<g id="decoy"></g>');
  });

  it("does not let a self-closing top-level group corrupt the depth counter", () => {
    /* If a self-closing <g/> bumped depth, every later layer would be treated as
       nested and left unstamped. */
    expect(buildSceneMarkup(SAMPLE, "a").inner).toContain('id="a-props-inject-0"');
  });

  it("drops the provenance comment prepended at vendoring time", () => {
    expect(buildSceneMarkup(SAMPLE, "a").inner).not.toContain("vendored from Storyset");
  });

  it("throws rather than returning half-built markup when the root is missing", () => {
    expect(() => buildSceneMarkup("<div>not an svg</div>", "a")).toThrow();
    expect(() => buildSceneMarkup("<svg viewBox='0 0 1 1'>", "a")).toThrow();
  });
});