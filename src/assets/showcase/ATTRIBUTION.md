# Third-party art attribution

Assets in `src/assets/` that are not ours, and what the licence asks of us.

## Storyset / Freepik

All six illustrations used by the first-run services showcase. Every one is from
the **Rafiki** style, so the deck reads as a single set rather than six
unrelated pictures — that consistency is the reason these were chosen together
rather than one at a time.

| File | Source | Slide |
|---|---|---|
| `showcase/storyset-online-doctor-rafiki.svg` | [storyset.com/illustration/online-doctor/rafiki](https://storyset.com/illustration/online-doctor/rafiki) | `consult` |
| `showcase/storyset-schedule-rafiki.svg` | [storyset.com/illustration/schedule/rafiki](https://storyset.com/illustration/schedule/rafiki) | `appointments` |
| `showcase/storyset-health-passport-rafiki.svg` | [storyset.com/illustration/health-passport/rafiki](https://storyset.com/illustration/health-passport/rafiki) | `records` |
| `showcase/storyset-medical-prescription-rafiki.svg` | [storyset.com/illustration/medical-prescription/rafiki](https://storyset.com/illustration/medical-prescription/rafiki) | `medication` |
| `showcase/storyset-ambulance-rafiki.svg` | [storyset.com/illustration/ambulance/rafiki](https://storyset.com/illustration/ambulance/rafiki) | `emergency` |
| `showcase/storyset-mobile-payments-rafiki.svg` | [storyset.com/illustration/mobile-payments/rafiki](https://storyset.com/illustration/mobile-payments/rafiki) | `wallet` |

**Licence:** [Freepik License](https://storyset.com/terms) — free for personal
and commercial use, including in apps and web products, **with attribution**.
Modifications and derivative works are permitted.

The attribution the licence requires is rendered in the app, as
`"Work illustrations by Storyset (https://storyset.com/work)"`: see
`ART_CREDIT` in `src/data/appCredits.ts`, which every settings About alert
renders via `aboutMessage()`. Removing that credit breaks the licence.

### Why all six are stock

The showcase has six slides and previously mixed one stock illustration with
five hand-drawn scenes in `showcaseScenes.tsx`. That code has been deleted.

The drawn scenes were geometric abstractions — a circle-and-rectangle call
window for `consult`, a capsule beside a clock for `medication` — and at the
~218px the deck renders them, they read as diagrams of a concept rather than as
a scene carrying the pitch. Real illustration fixed that for `consult`, which is
why the art was then replaced wholesale rather than slide by slide: one stock
illustration beside five drawn scenes is worse than either, because the deck
looks assembled from two sources.

Flat illustration rather than photography is deliberate. Photos were tried
before the drawn scenes and reverted: the crops read as generic stock next to
the rest of the product, and they pinned the card to a fixed aspect ratio.

One substitution worth recording: `emergency` uses **Ambulance**, not the
similarly named *Emergency call*. That one is a break-in scene — its layers
include a `Door` and a `Crowbar` — which is wrong for a medical SOS.

### Re-vendoring

Each file is the vendor's original with a comment block prepended. To refresh
or replace one: download the SVG from its Storyset page, prepend the provenance
comment, save under the same name. Do not hand-edit the shapes; the `<g id>`
values (`background-complete`, `Character` and siblings) are the vendor's and
renaming them is pointless churn.

Those ids are **not** namespaced, and all six files declare the same ones. That
is safe only because Vite serves each as a URL and `ShowcaseArt` references them
through `<img>`, giving each its own document scope. Two decks can be mounted at
once (the real gate plus the `?showcase=1` preview overlay), so if these are ever
inlined as JSX the second deck mounted would steal the first one's layers.
Namespace the ids before you do that.

### Two things worth checking before you ship

1. **Account vs. redistributing.** The free licence covers *using* the
   illustrations. Storyset's Terms of Use additionally say the User is "not
   authorised to distribute, resell or rent any Storyset Content", and
   prohibit generating downloads "through any robots, spiders or any other
   mechanism". Committing the source files into this repo is redistribution.
   That is why these were fetched by hand rather than by a script run on every
   build, and why they are isolated in one directory with this note — if your
   legal read differs, buy the premium tier, which grants redistribution, and
   delete this section.
2. **Attribution placement.** The credit is currently in the About screen.
   Confirm that is reachable and visible enough for your risk appetite; a
   first-run-only showcase means many users will never see it.