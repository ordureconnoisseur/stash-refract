# Performer grid rebuild plan (WebGL component, not a DOM restyle)

Status: DECIDED, not started. Design settled 2026-06-28 in a Claude session;
written down 2026-07-02 so it stops living only in transcripts.
Publicly signaled in the theme feedback thread ("going to prototype the
performer grid first").

## Problem

The card grids are the only real performance problem in Refract. Everything
else (settings, player, edit forms) is a handful of DOM nodes and is fine as
a CSS theme.

Profiled 2026-06 on a 270-card / ~19k-element home page (see OPEN ISSUE in
CLAUDE.md for full detail):

- Cost is **style recalc + Layout (~117ms per pass), NOT painting**
  (Rendering ~3,600ms of 5s vs Painting ~170ms).
- A/B-ruled-out as causes: blur (backdrop-filter), box-shadow, CSS
  animations, plain `filter`. None changed Chrome scroll.
- Only playing-card mode (and tiers) is bad. Likely driver: `:has()`
  selectors re-evaluated across the huge DOM (especially
  `:has(.card-check:hover)`), amplified by playing-card's ~15-20 extra
  nodes per card.

Conclusion: the ceiling is **structural**. A theme that decorates Stash's
DOM necessarily grows the DOM and pays recalc across all of it. No CSS
tweak escapes this; several attempts made it worse (scroll-perf freeze,
`.refract-tier-card` marker breaking scroll entirely).

## Rejected approaches (do not revisit without new evidence)

1. **More CSS surgery.** Tried repeatedly; the remaining wins
   (`:has()` -> JS hover class, row-level `content-visibility`) are
   incremental and don't remove the per-card scaffold cost.
2. **WebGL overlay synced to Stash's DOM rects** (canvas chases
   `getBoundingClientRect` of React-owned cards). Killed by scroll-sync
   jitter risk: the overlay must track React's moving rects every frame or
   effects visibly drift. Chasing someone else's layout is the failure mode.
3. **Rebuild the whole Stash frontend.** Multi-year fork; 95% of screens
   aren't the perf problem; permanent feature-parity treadmill on the
   player/tagger/edit forms for zero perf gain there.

## Decision

Refract **stays a theme** for the whole app. The **card grid becomes a
custom component Refract mounts in place of Stash's grid**, migrated
route-by-route, grid-first, starting with the performer grid. Never worse
off than today: converted views are fast, unconverted views stay themed,
and we can stop at any view.

Core principles:

- **Own the layout.** We compute every card's position. This is what
  dissolves the sync problem: sprites and hit-targets come from the same
  numbers, nothing chases React.
- **Data from GraphQL, never the DOM.** `findPerformers` with the current
  filter/sort/page. Stable contract; same pattern as multiview/binge/
  desire. Local API key already available.
- **Render the expensive visuals in one WebGL canvas via PixiJS.**
  Batched sprites, GPU blur/glow filters out of the box, particle systems.
  Do not hand-write a GLSL engine. One canvas = one compositing surface
  instead of hundreds of layers, and the ~15-20 node/card scaffold leaves
  the DOM entirely, which attacks the *actual* measured bottleneck
  (recalc/layout over DOM size), not just paint.
- **Thumbnails as textures.** We load the performer image URLs into Pixi
  ourselves, so blur/glow is trivial: we own the pixels. No screenshotting
  the DOM.
- **Virtualize.** Only visible cards get sprites, regardless of page size.
- **Text and interaction stay DOM.** Thin transparent hit-targets +
  name/detail text positioned at our computed rects (WebGL text is
  miserable). Buttons (favourite, rating, O-counter) fire GraphQL
  mutations directly.
- **Keep Stash's filter toolbar + routing.** The toolbar is ~10 elements
  and not a bottleneck. It keeps driving the URL; we observe the URL/
  filter state (route detection already exists: `setRouteClass()` in
  refract.js), run our own query, render, and hide Stash's grid container.

## Inherited behavior we must reimplement (the real cost)

Rendering is the small part. The grid also does:

- Filtering / sorting / saved filters / pagination or infinite scroll
  (we reuse Stash's toolbar for input, but must translate its URL/filter
  state into our GraphQL query correctly).
- Click -> navigate to `/performers/<id>` (router push, not full reload).
- Per-card actions: favourite, rating, O-counter -> GraphQL mutations.
- Selection + bulk edit: OUT OF SCOPE for v1. Document as a known gap;
  users can switch to another rating mode / disable the custom grid for
  bulk work.
- Hover preview scrubbing: performers are static images, so N/A for the
  performer grid. Becomes real work only if/when scene grids migrate.

Parity tax is accepted and bounded: when Stash adds a card feature, the
custom grid adds it or visibly lacks it. This is the same commitment
already made three times (multiview, binge, desire).

## Phase 0: standalone POC (build this before touching the theme)

Separate throwaway project (suggested: `C:\Users\ethork\Projects\
refract-grid-poc`, Vite, plain page pointed at `localhost:9999/graphql`
with the local API key). NOT inside this repo; the theme ships untouched
in parallel and nothing risks the CDN sync pipeline.

Scope, deliberately read-mostly:

- One hardcoded filter, one page of ~250+ performers.
- Pixi canvas grid: thumbnail texture + frosted-glass card + tier glow
  (approximate the playing-card look, don't port it pixel-perfect yet).
- Virtualized scroll.
- DOM hit-target layer: click-to-open (log the id) + favourite toggle
  (real `performerUpdate` mutation).
- Measure on the weak-GPU box (Dining9093, the machine that can only run
  lite mode today).

Success criteria (answer these two questions, nothing else):

1. Is scroll buttery on weak GPU at 250+ cards? (Target: no visible
   jank; recalc/layout per scroll pass should collapse to near zero
   since the DOM is ~10 hit-targets per visible row, not 19k nodes.)
2. Does the hit-target + mutation wiring feel sane to build against?

If yes to both -> Phase 1. If the scroll or the wiring is a swamp: stop,
we spent a weekend, lite mode still exists.

## Phase 1: fold into Refract as an optional mode

- Ship inside the theme as an opt-in setting ("WebGL performer grid"),
  default OFF initially.
- Mount on `body.stash-route-performers` (list view only; the bare route
  class already excludes `/performers/123`).
- Hide Stash's native grid container while mounted; unmount cleanly on
  route change (respect the existing "don't move React nodes" rule:
  overlay/hide, never reparent).
- Translate the toolbar's filter state -> `findPerformers` query. Start
  with the common cases (sort, page size, favourite, rating, tags) and
  fall back to native grid for filter shapes we don't parse yet.
- Port the playing-card visual language properly (tier frames, pips,
  seal, hearts) as Pixi sprites/filters.
- Pixi is a real dependency in a repo with no build step. Options, decide
  at Phase 1 start: (a) vendor pixi.min.js into the plugin (~450KB,
  simplest, matches the no-build ethos), or (b) give the grid component
  its own Vite build like binge and ship the dist. Lean (b) if the
  component grows TS/modules, (a) if it stays one file.

## Phase 2+ (only if Phase 1 lands well)

- Scene grid (adds hover preview video: video textures in Pixi, real but
  solved territory), gallery/image grids.
- Home page carousels (the 270-card page that started all this).
- Each view migrates only when its pain justifies it. Settings etc. stay
  themed forever.

## Non-goals

- Replacing Stash's frontend wholesale.
- Dropping lite mode (it remains the fallback for unconverted views and
  unparsed filters).
- Bulk-edit parity in v1.
- Any change to the publish pipeline; the POC lives outside this repo.
