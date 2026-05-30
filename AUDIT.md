# Refract architecture & correctness audit

_Full-file review of `refract.js` (6,979 lines) — 2026-05-30. Reviewed at extra-high effort across 9+ finder angles plus 5 region passes, every reported line hand-verified against source. Working tree was clean (`main` = `origin/main`); this audits the shipped code, not a diff._

## Verdict — the "house on stilts" feeling is justified, but the diagnosis matters

The stilts are **not** sloppy cleanup. Refract is actually disciplined about idempotency and teardown in most places (`disconnect`/`removeEventListener` at 5061, 5178, 2727, 5563–66, 5674, 6834–48). The fragility is **structural**:

A single 6,979-line JS file reaches into Stash's React-rendered markup — rewriting `textContent`, regex-parsing class names, cloning/moving nodes, hiding native controls with inline styles, stealing Bootstrap dropdown items — all driven by a body-wide `MutationObserver` that re-runs ~15 injectors on every mutation, **because Stash exposes no stable hooks**. Every Stash UI update is a coin-flip on what breaks, and none of it can be expressed in CSS.

**The single highest-value move is upstream data hooks, not refactoring the JS.** Land upstream PR #1 below and ~10% of this file (plus its only background GraphQL call) simply deletes.

---

## Part 1 — Upstream PRs to file against `stashapp/stash` (ranked by leverage)

### PR #1 — Rating data attributes ⭐ _deletes the most stilts + the only network round-trip_
**Today:** refract regex-parses `rating-100-N`/`rating-N` off class names (5435+), rewrites `.rating-banner` text (801–827), makes its **own GraphQL call + localStorage cache** just to learn the rating *scale* (`refractFetchRatingSystem`, 738–759), then re-derives a percentage for halos/tiers (5455, 5509, 2400).
**PR:** have Stash render `data-rating100="83"` + `data-rating-system="stars|decimal"` (ideally `--rating-pct: 83%`) on the rating banner / card root.
**Deletes:** the rating-system fetch, its cache + body-class plumbing, `stripRatingBannerToNumber`, the class-regex parser, and bugs **B3, B7, B12, B13** below. Halos/tiers become pure CSS (`attr()` / `var()`). _This is the one PR that removes a whole subsystem._

### PR #2 — A route-change event _unblocks removing a global monkeypatch_
**Today:** refract patches `history.pushState`/`replaceState` (1761–1768) to detect navigation — collides with any other plugin doing the same (multiview, OStats).
**PR:** emit a `PluginApi.Event` on react-router location change (or expose `useLocation`).
**Deletes:** the history wrap (B9) and the *reason* the body-wide observer must re-run everything on navigation.

### PR #3 — Component slots / patch points for chrome
**Today:** refract rewrites navbar-brand `innerHTML` (857–921), the New button (925), injects the mobile burger/drawer (1029+), **steals Bootstrap dropdown items** for the operation menu (5655+), hides the native view-mode btn-group with inline styles and rebuilds it (2954+). Stash *already* exposes `PluginApi.patch.instead` (refract uses it cleanly for `PluginSettings` at 464).
**PR:** extend patchable/slot-able components to NavBar brand, the nav-item list, and the list-view toolbar.
**Deletes:** the `innerHTML` rewrites, the dropdown theft, and most observer-driven re-injection — refract renders React instead of mutating DOM. Dissolves the markup-race class (B8, B16, B17, B18).

### PR #4 — Locale-independent action hooks + orientation/state attributes
**Today:** refract matches **English text** (`"New"`, `"Add"`, `"View All"`, aria `"stash"`, dup-checker `"delete"`/`"merge"`), and `title="O Count"`; walks `.count-button .count-value span`; measures image load for portrait vs landscape; matches `[id^="performer-tabs-tab-"]` and section heading regex `/menu|navigation/i`.
**PR:** stable `data-action="o-counter|new|delete|merge|…"` on controls; `data-orientation` on covers (Stash already knows dimensions); stable container ids/`data-*` for settings sections.
**Deletes:** all i18n-fragile text matching (**this breaks refract today for non-English users**) and the orientation measurement pass. Fixes B2, B14, B20, B21, B25.

### PR #5 (falls out of #1–#4) — Retire the body-wide observer
Once injectors disappear, `watchForReinjection` (1779) can be scoped or dropped, dissolving the `data-stash-*` marker scheme behind B6 and B8.

**Suggested order:** #1 (biggest, self-contained) → #2 (small, high interop value) → #4 (small, fixes i18n) → #3 (largest Stash-side change).

---

## Part 2 — Bug findings (verified, ranked by severity)

Severity: 🔴 high (data-loss / silent feature death) · 🟠 medium · 🟡 low/cosmetic.
Bucket: **L** = fix locally now · **S** = local stopgap, upstream PR retires it · **U** = upstream is the real fix.

| # | Sev | Loc | Bucket | Bug | Failure |
|---|----|-----|--------|-----|---------|
| B1 | 🔴 | `708` | L | `gqlXhr.onload` resolves on **any** HTTP status if body is JSON; no caller checks `errors[]` | 401/403/422 from expired ApiKey returns `{errors:[…]}` → resolves with `data===undefined`; `res.data\|\|{}` (2250) iterates 0 keys, indistinguishable from "no scenes"; `.catch` never fires |
| B2 | 🔴 | `2216` | L | `data-stash-sc` set **before** the async query; nothing ever clears it (verified — only writer, no `removeAttribute`) | Any query failure → cards marked done, `:not([data-stash-sc])` (2208) excludes them forever → no badges/circles/rating until full reload |
| B3 | 🔴 | `751` | S→PR#1 | `refractFetchRatingSystem` caches `""` on empty/errored response, erasing a valid `"stars"` cache | Error response (see B1) → `localStorage` set to `""`, body loses `refract-rating-system-stars`, entire scale flips to decimal — the exact stale-cache bug the comment claims to prevent |
| B4 | 🟠 | `6384` | L | Task-queue expand state is a `Set` keyed by **array index** (6370/6418) | Expand job at index 2; job 0 finishes and drops → old index-3 job becomes index 2 and inherits "expanded," user's job collapses |
| B5 | 🟠 | `162` | L (→PR#2) | Light-mode toggle has two sources — panel `useState` (162) + navbar button (6459) — sharing localStorage but not React state | Toggle via navbar while panel open → body flips but panel swatch stale; next panel click computes `!lightOn` from stale closure → no-op/desync |
| B6 | 🟠 | `2270` | S→PR#3 | slick clone vs `data-stash-sc` marker can disagree | Marker-carrying clone excluded forever (no badges); unmarked clone re-fires a full `findScene`. Mostly mitigated by href-requery + idempotency; the marker-carrying-clone case slips through |
| B7 | 🟠 | `5455` | S→PR#1 | Text-fallback rating parse reads the **live** `refract-rating-system-stars` body class mid-parse | First paint before the async rating-system fetch resolves → stars "4" parsed as decimal 40 not 80 → wrong tier until a later observer pass |
| B8 | 🟠 | `4889` | L | Play-button `MutationObserver` created per `.scene-player-container`, never stored or disconnected (**verified** — `new MutationObserver(syncPlayIcon).observe(...)`, no handle) | Each scene→scene nav mounts a fresh container + a new observer on the new play button; old observers keep referencing detached nodes → one leaked observer per scene viewed |
| B9 | 🟠 | `3201` | L | Per-slider `MutationObserver` on `.slick-track` created every `initSlickCarousels` pass, never disconnected (**verified** — local `var slideObserver`) | Navigate home→studio→home…; React rebuilds `.slick-slider`, marker dies with the node, each remount spins a fresh observer; orphans accumulate and fire `updateBar` against dead nodes |
| B10 | 🟠 | `1761` | U→PR#2 | `history.pushState/replaceState` wrapped with no idempotence guard | Called once today (3285), so active risk is interop: other plugins wrapping the same methods can drop refract's `syncRoute` or double-fire depending on load order |
| B11 | 🟠 | `5187` | L | `installScopedRowObserver` guards on `state.scopedMo` presence but never re-observes when React replaces the `.scene-performers` row | After a re-render `row` is a new node; `if (state.scopedMo) return` strands the observer on the detached old row → performer add/remove no longer triggers relayout; dots/clones go stale |
| B12 | 🟡 | `96` | S→PR#1 | `broadcastAccentToPlugins` reads `getComputedStyle` on `setTimeout(0)`, no retry | Cold load: accent vars not yet applied; empty reads skipped by `if(a)` → multiview player keeps previous accent |
| B13 | 🟡 | `5509` | S→PR#1 | Card-tier frame gated `v >= 5`; bronze branch unreachable below 5/10 | A card rated 3/10 gets no `refract-card-tier-*` class → no frame / no playing-card banner glow. **Confirm intended floor** (may be by design) |
| B14 | 🟠 | `3582` | L (→PR#4) | Dup-checker maps native Delete/Merge **purely by positional index** into a generic `.edit-button` NodeList: `deleteBtn: actionButtons[0]`, `mergeBtn: actionButtons[1]` (**verified** — no label check at all) | If Stash reorders the action column, adds another `.edit-button`, or renders merge-first, the refract card's **Delete** fires Stash's **Merge** — a destructive, irreversible mis-action. A `data-action` attr upstream (PR#4) is the durable fix; locally, match by aria-label/title instead of index |
| B15 | 🟠 | `5660` | U→PR#3 | Op-menu item-click does `origItem.click(); closeOperationMenuOverlay()` but never dismisses the native Bootstrap dropdown (**verified** — only the backdrop path calls dismiss) | After picking an item, the underlying dropdown keeps `.show` + `aria-expanded="true"` (only the menu was `display:none`'d) → next click inconsistent; AT still reports menu expanded |
| B16 | 🟠 | `5711` | U→PR#3 | Op-menu hides native dropdown with inline `display:none !important` on a React-owned node | Any re-render of the scene-tabs subtree drops the inline style → native Popper dropdown reappears behind/over the custom overlay (duplicate menus); no class-based reassertion |
| B17 | 🟠 | `1395` | S→PR#3/#4 | Drawer active-marking reads only `data-href` + bare `window.location.pathname` (**verified** — NOT the hash-aware `refractPathFromLocation()` that `markActiveUtilityButtons` at 1525 uses); ignores the `aliases` list and lacks longest-prefix disambiguation | `/movies` (alias of `/groups`) and `/markers` (alias of `/scenes/markers`) → no tile highlighted; on `/scenes/markers` both the Scenes **and** Markers tiles light up. Under hash routing, `pathname` is always `/` so nothing matches |
| B18 | 🟡 | `5853` | S→PR#3 | `injectStudioName` guards via `dataset.stStudioInjected` but never refreshes the span | Studio reassignment updates `<img alt>` in place on the same `<a>` → guard skips it → stale studio name shown forever |
| B19 | 🟡 | `6296` | L | Collapse "expand" branch pins `max-height` to `scrollHeight` at expand time, never resets to `none` | A section that grows after expand (async-loaded plugin settings, nested control opening) is clipped by the frozen `max-height` |
| B20 | 🟡 | `5895` | S→PR#4 | `injectPluginToggles` selects the native button via `button.btn.btn-primary.btn-sm`, which also matches the injected `.st-plugin-chevron` | If the chevron is matched first, the `continue` guard skips the **whole row** → that plugin silently gets no toggle |
| B21 | 🟡 | `4809` | U→PR#4 | Tag-editor deactivation matches `[id^="performer-tabs-tab-"]` | Stash changing/localizing its tab id scheme → deactivation never runs → custom Edit-Tags pane stuck visible over the native pane |
| B22 | 🟡 | `31` | L | `earlyNavOrder`/`applyOrder` `forEach` assume every saved entry is a string | A legacy/corrupted numeric entry → `key.slice` throws → outer `try/catch` swallows → **entire** saved nav order silently dropped on load |
| B23 | 🟡 | `3187` | L | Carousel progress math: `currentIndex()` reads slick `data-index` (includes clones) but divides by real-slide count | Infinite-loop carousel: `data-index` 4 with 3 real slides → 200% clamped to 100%; progress bar misrepresents position |
| B24 | 🟡 | `3538` | L | `refractParseBytes` only matches `[KMGT]i?B`; plain `"512 B"` returns 0 | Tiny file in a dup group → counts as 0 bytes → wrong "largest" pick + wrong "Reclaim up to X"; could flag the real keeper for deletion |
| B25 | 🟡 | `3873` | S→PR#4 | Dup-checker relabels Stash's dropdown toggle via `toggle.textContent = label`, destroying caret/icon children | Caret glyph disappears; next React re-render restores it → flicker as the two systems fight |
| B26 | 🟡 | `1288`, `1353` | L | Attribute selectors built from runtime hrefs without `CSS.escape` (nav-icon swap + plugin drawer tiles) | A plugin nav href containing a quote/bracket → `querySelectorAll` throws `SyntaxError` → aborts the whole icon/tile pass for all remaining links |
| B27 | 🟡 | `5796` | L | Lightbox count `MutationObserver` stored on the indicator node, never `disconnect`ed | Each lightbox reopen creates a new indicator + observer; the old detached one leaks |
| B28 | 🟡 | `4939` | L | Chevron `ResizeObserver` + row `scroll` listener created per `.scene-performers-row`, no teardown | React-replaced row → prior observer/listener orphaned; accumulate over a session (sidebar carousel has teardown; this path doesn't) |
| B29 | 🟡 | `3268` | L | `setInterval(check, 4000)` has no `clearInterval` | Runs every 4s for the page's life regardless of route; stacks if the carousel re-initializes |
| B30 | 🟡 | `5929` | L | Plugin-toggle checkbox forwards `btn.click()` without `e.preventDefault()` | Checkbox flips optimistically; if the native button is mid-re-render (`if(btn)` skips) the switch shows a state that doesn't match the plugin until the next watcher pass |
| B31 | 🟡 | `5828` | S→PR#4 | `.date-input-group:has(input.is-invalid)` no-ops where `:has()` unsupported | "Attempt to fix?" relocation silently doesn't happen (low — `:has()` broadly supported since 2023) |
| B32 | 🟡 | `6604` | L | `parseInt(getComputedStyle(a).order)` missing radix — inconsistent with radix-10 calls elsewhere | Benign today (computed `order` is an integer string); latent footgun + lint inconsistency |
| B33 | 🟡 | `1331` | S→PR#3 | `refractAppendPluginDrawerTiles` only appends; no removal pass for orphaned tiles | Disable a plugin → its mobile drawer tile persists and click-navigates to a dead route |
| B34 | 🟠 | `6839` | L | Drag `onPointerUp` does **unguarded** `document.body.removeChild(drag.clone)` (**verified** — no `parentNode` check) before the listener teardown + `drag=null` at 6845-6848 | If the floating clone is already detached when pointerup fires (e.g. something removed it, or a pointercancel/pointerup race), `removeChild` throws → the three `removeEventListener`s and `drag=null` never run → next `pointerdown` is rejected by `\|\| drag` → **drag-to-reorder dead until reload**. Guard with `if (drag.clone && drag.clone.parentNode)` |

### Plausible / needs-a-product-call (lower confidence)
- **B5 / B13** depend on intended behavior — confirm before "fixing."
- `1124`/`1265` push **path-form** URLs (`/scenes`) even though the code elsewhere handles hash-form hrefs; if any Stash deployment is hash-routed this breaks nav. Verify whether hash routing is actually a supported target before investing.
- `5070` IO active-dot mapping reads `dataset.refractRealIdx`, stamped by DOM order; `cloneNode(true)` copies it onto clones. Desync is possible if React reuses/reorders performer nodes without changing count — plausible, hard to trigger.
- `3682` dup-card checkbox seed can briefly disagree with the 250ms sync poll after a rebuild mid-toggle (≤250ms visual glitch).

---

## Part 3 — Cleanup & efficiency

| # | Loc | Kind | Item |
|---|-----|------|------|
| C1 | `5979` / `6207` / `6287` | dedup | **Collapse/expand max-height rAF animation is triplicated verbatim** (3 copies, ~20 lines each) across `makePluginSettingsCollapsible`, `setupTaskPluginGroups`, `setupNativeTaskGroups`. Extract `toggleCollapsibleSection(grp)` — and fix B19 once instead of three times. |
| C2 | `66`–`666` | dedup | **~7 near-identical `getStored*` / `apply*Class` blocks** (accent, light, lite, cardStyle, ratingStyle, minimiser, logo), each its own try/catch + body-class toggle. Collapse to `lsGet(key, default)` / `bodyClassToggle(cls, on)` factories. |
| C3 | `416`–`522` | simplify | **Dead Custom-CSS-Source subsystem** gated behind `SHOW_CUSTOM_CSS_SOURCE = false` (421), yet drags along `cssSrc` state, `getUiConfig`, `findCssUrlKey`, `setCustomCssUrl`, `clickApplyCss` (~100 lines). Remove or extract. |
| C4 | `1779` | efficiency | Body-wide observer runs ~15 inits, each doing its own `querySelectorAll`, on **every** mutation burst with no rAF/idle batching → a React render storm triggers N full-document sweeps. Scope observers per-surface or debounce+batch. (PR #5 retires most of this.) |
| C5 | `5638` | efficiency | `unstickyGalleryToolbar` does 4 full-document `querySelectorAll` sweeps every consolidated-watcher pass with no "done" guard, though it only ever cleans legacy inline styles once. |
| C6 | `3797` | efficiency | `refractApplyDupSuggestions` does a full-document `.refract-dup-card` scan on each invocation, including from the 250ms poll under oldest/youngest strategy → sustained whole-page style churn while many boxes settle. |
| C7 | `6063` | efficiency | Plugin search `applyFilter` re-runs `querySelectorAll('.setting-section .setting-group')` + re-reads every `h3` on **every keystroke**; cache the group/name list once at injection. |
| C8 | `3157` | efficiency | Tab-strip wheel handler reads `scrollWidth`/`clientWidth` on every wheel event (layout flush on a hot path); cache or read once per burst. |
| C9 | `857`–`921` | simplify | Brand-button lookup tries 4 container selectors × 6 button selectors. Audit which branches are reachable on current Stash; likely reducible to 1–2. (PR #3 removes this entirely.) |
| C10 | `6855` | efficiency | `attachDrag` flags elements `st-nav-draggable` + binds pointerdown per element with no teardown; reused nodes accumulate handlers across re-renders over a long session. |

---

## Part 4 — Verified NON-issues (do not "fix" these)

Hand-checked and confirmed correct — recorded so they don't get re-flagged:
- **`3760` dup-sync timer** — self-clears on route change (`clearInterval` at 3764). Fine.
- **`1184` toolbar-dropdown observer** — guarded singleton (`if (!document.body.__refractToolbarDropdownObserver)`). Fine.
- **`4413` tag-tooltip window scroll listener** — uses the stable named fn `refractHideTagTip` with consistent options → browser de-dupes identical `addEventListener`. Not a leak.
- **`2400` rating-chip `&& > 0` guard** — defensively correct (0 = unrated). Not a bug.
- **Drag FLIP (6700+)** — reads are batched before writes (proper FLIP); no read-write-read layout thrash. Pointer listeners document-level and balanced.

> **Correction:** during verification I retracted two entries I had initially marked as non-issues. Both turned out to be real and are now listed above:
> - `6839` drag `removeChild(drag.clone)` is **unguarded** (see B34) — not guarded as I first wrote.
> - `1395` drawer marking uses bare `window.location.pathname`, **not** `refractPathFromLocation()` (folded into B17).

---

## Suggested fix sequence
1. **Error-handling cluster (B1 + B2 + B3)** — one tight change in `gqlXhr` + the `data-stash-sc` marker timing; biggest user-visible win (cards silently dying). Highest priority.
2. **Observer/timer leaks (B8, B9, B11, B27, B28, B29)** — store + `disconnect`/`clearInterval` on re-init; mechanical, low-risk.
3. **Destructive mis-wire (B14)** — replace the positional `actionButtons[0/1]` mapping for dup-checker Delete/Merge with an aria-label/title match before the upstream `data-action` PR lands; this one can merge scenes the user meant to delete.
4. **Cleanup C1 (triplicated collapse) + B19** together.
5. **File upstream PR #1** (rating attrs) — then delete B3/B7/B12/B13 and the whole rating-system fetch.
6. PRs #2 → #4 → #3 as bandwidth allows.

_Commit per logical group so regressions stay bisectable (per project convention)._
