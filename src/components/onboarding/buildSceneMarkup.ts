/**
 * Turns a vendored Storyset SVG file into markup this app can animate.
 *
 * WHY THIS EXISTS. The showcase illustrations arrive through Vite as URLs and
 * are rendered with <img>, which is what keeps each one in its own document
 * scope. That isolation is exactly why they cannot be animated: an <img>-loaded
 * SVG is a separate document, so no page script can add a class to its root and
 * no page stylesheet can reach its layers. Adding the vendor's `.animated`
 * class from the parent page is a no-op against an <img>.
 *
 * So the art has to be INLINED to be animated, and inlining is the one thing
 * the asset notes warn about: all six files declare the same un-namespaced
 * `<g id>` values (`background-complete`, `Character`, `Shadow`, ...) and two
 * decks can be mounted at once — the real first-run gate plus the `?showcase=1`
 * preview overlay. Left alone, the second deck's `#Character` would resolve to
 * the first deck's node and the layers would cross over. `buildSceneMarkup`
 * namespaces every id per instance, which is the mitigation ATTRIBUTION.md asks
 * for before inlining.
 *
 * It also stamps each top-level layer with a class and an index, because the
 * vendor files carry no animation CSS at all (no <style>, no <animate>) — the
 * motion is ours, defined in FirstRunShowcase.css against these classes. Only
 * top-level groups are stamped: nested ones (Freepik's `*-inject-*` wrappers)
 * are the vendor's internal decomposition and animating them would double up.
 *
 * This lives in its own module rather than beside the component because it is
 * pure string work with no JSX: it is directly unit-testable without mounting a
 * component, and keeping it out of ShowcaseArt keeps that file's exports to
 * components alone, which is what Vite's fast refresh needs.
 */

/** Freepik's character layer, spelled inconsistently across the six files. */
const CHARACTER_LAYER = /^(Character|character-\d+)$/i;

/** Per-instance prefix on every id, so two mounted decks cannot collide. */
const idFor = (uid: string, vendorId: string): string => `${uid}-${vendorId}`;

/** Strips the provenance comment the vendoring step prepends to each file. */
const stripProvenance = (svg: string): string => svg.replace(/^\uFEFF?\s*<!--[\s\S]*?-->\s*/, "");

/** The root `<svg>`'s attributes, so its viewBox is not hard-coded twice. */
const rootAttrsOf = (svg: string): string => {
  const open = /<svg\b([^>]*)>/.exec(svg);
  if (!open) throw new Error("showcase art: no root <svg> element found");
  return open[1];
};

/** Everything between the root open tag and the closing `</svg>`. */
const innerOf = (svg: string): string => {
  const open = /<svg\b[^>]*>/.exec(svg);
  const close = svg.lastIndexOf("</svg>");
  if (!open || close === -1) throw new Error("showcase art: malformed <svg> root");
  return svg.slice(open.index + open[0].length, close);
};

export interface SceneMarkup {
  /** The root element's viewBox, e.g. "0 0 500 500". */
  viewBox: string;
  /** The root element's children, namespaced and layer-stamped, for innerHTML. */
  inner: string;
}

/**
 * Prepares one vendored file for inlining under a given instance id.
 *
 * @param raw The .svg file contents, imported with Vite's `?raw` suffix.
 * @param uid Unique per mounted deck, so ids never collide across decks.
 */
export const buildSceneMarkup = (raw: string, uid: string): SceneMarkup => {
  const svg = stripProvenance(raw);
  const viewBox = /viewBox="([^"]*)"/.exec(rootAttrsOf(svg))?.[1] ?? "0 0 500 500";

  /* Depth-aware rewrite of the root's DIRECT children only.
   *
   * A flat regex over every `<g id=...>` would also catch Freepik's nested
   * `*-inject-*` wrappers, and stamping those would animate the same pixels
   * twice — once as part of its parent layer and again on its own. Tracking
   * depth is what keeps the two apart. Comments are skipped as single units so
   * a `<g id="...">` inside one is never treated as an element. */
  let depth = 0;
  let index = 0;
  const inner = innerOf(svg).replace(
    /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][\w:-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>/g,
    (match, closing: string | undefined, tag: string | undefined, attrs: string, selfClose: string) => {
      if (match.startsWith("<!--")) return match;

      const isClose = closing === "/";
      if (depth === 0 && !isClose && tag === "g") {
        const id = /\bid="([^"]+)"/.exec(attrs)?.[1];
        if (id) {
          /* Drop the vendor id, re-add it namespaced, and attach the classes the
           * stylesheet keys on. `style` is set rather than a class so the
           * per-layer stagger index stays out of the stylesheet's selectors. */
          const rest = attrs.replace(/\s*\bid="[^"]*"/, "").trim();
          const classes = ["sc-svg-layer"];
          if (CHARACTER_LAYER.test(id)) classes.push("sc-svg-layer--character");
          /* The depth is bumped BELOW, on the emitted element, and never
           * short-circuited by an early return: returning here without counting
           * this <g> as an opening tag would leave depth at 0, so every later
           * group would look like a sibling and get stamped too. */
          depth += 1;
          return `<g${rest ? ` ${rest}` : ""} id="${idFor(uid, id)}" class="${classes.join(" ")}" style="--sc-layer-i:${index++}">`;
        }
      }

      if (!selfClose) depth += isClose ? -1 : 1;
      return match;
    }
  );

  return { viewBox, inner };
};
