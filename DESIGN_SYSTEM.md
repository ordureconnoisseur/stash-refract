# Refract Design System

The governing document for how Refract looks and behaves. Everything else
(`DESIGN_BRIEF_*.md`, the CSS, the design canvases) is downstream of this.

Precedence: this file wins on foundations (colour, type, surface, depth,
motion, modes). A design brief wins on the surface it covers, and when a brief
settles something it gets folded back here. `CLAUDE.md` wins on process
(shipping, deploy, editing traps). Where two disagree and neither is obviously
newer, measured evidence wins over both.

Every number here was read out of the shipped CSS or JS, not invented.

Merging this file: every branch's changes are additive prose, so a wholesale
"take my side" conflict resolution silently discards a lane's thinking - it
happened on 2026-08-30 (dc918cb dropped rule 7.18 while the ancestry showed
the commit that added it). This file merges hunk by hunk or not at all, and a
rule number cited from anywhere else (CLAUDE.md, ledger rows, another lane)
is a stable reference: repair numbering around it, never renumber it.

There is a visual companion: ten artboards covering the thesis, colour, type,
surfaces, depth, motion, the rating tiers, the modes, component law and the
drift ledger. Sources are in `design-system/` as `.dc.html` files plus
`canvas.json`; re-seed with the design canvas helper after editing them, and
run `node design-system/lint.mjs`, which checks the artboards against this
file's own laws. It is a view of this file, not a second source of truth.

---

## 1. The thesis

**A dark room with lit glass in it.**

The library is the only saturated thing on screen. Chrome is transparent,
borrowing colour from whatever is behind it. One accent hue lights the edges.
The theme raises its voice in exactly one circumstance: a rating high enough to
have earned it.

Everything below is that sentence, made specific enough to argue with.

---

## 2. Principles

Nine rules. Each exists to settle an argument that has actually come up.

**P1. The image is the subject.** Chrome never out-saturates content. If a
control is more colourful than the thumbnail next to it, the control is wrong.
The studio eyebrow being the most saturated element in the scene panel is the
canonical failure.

**P2. One accent, one hue, never assumed.** Eight presets ship, plus light
mode, plus a custom CSS override. Nothing may depend on orange. Any design that
reads correctly only in one hue is broken in seven others.

**P3. Emphasis is earned, not applied.** Visual intensity is a function of
data. A card glows because it is rated 9.8, not because glowing looks good.
Decoration that does not encode something is noise, and Refract already has
enough surface area to be noisy on.

**P4. Restyle, never reimplement.** Stash owns behaviour and state. Refract
owns presentation. Refract may move a control with CSS, wrap it, or paint a
proxy in front of it, but the click reaches Stash's own element and Stash keeps
its state. The moment Refract owns a piece of state, it owns every bug in it
forever.

**P5. Degrade in tiers, not cliffs.** Every effect must have a defined
behaviour in five conditions: dark, light, lite, `prefers-reduced-motion`,
`prefers-reduced-transparency`. "It disappears" is a valid answer. "Nobody
checked" is not.

**P6. Reachable beats visible.** Moving a control behind a disclosure is a
legitimate design decision. Losing it is not. Nothing Stash could do before a
redesign may become impossible after it.

**P7. Space goes to density.** Nothing dense may sit behind an inner scrollbar
while whitespace goes unused in the same column. 34 tag chips crushed into 98px
above 46.5px of dead space is the canonical failure.

**P8. Give people the means; never claim knowledge the theme does not have.**
Refract cannot tell which image is safe for work, which performer is a
duplicate, or what a user meant. So it does not guess. It makes the parts
configurable and lets the user express the intent. This answers a whole class
of feature requests without the theme ever being wrong.

**P9. Measure the live page. Reading the CSS does not tell you what it does.**
Refract restyles Stash's DOM through a deep stack of existing rules, so a
change can be correct in the source and do nothing on screen. Use the harness
(section 10.1). Four separate "obvious" causes of the Chrome scroll problem
(blur, box-shadow, animation, filter) were each ruled out by A/B, and the real
cost turned out to be style recalculation. Intuition about this codebase has a
poor track record.

---

## 3. Foundations

### 3.1 Colour

Authored in `css/01_tokens.css` on `body.stash-liquid-glass`.

**Neutrals**

| Token | Dark | Light | Job |
|---|---|---|---|
| `--bg-0` | `#0a0a0a` | `#ffffff` | page floor, gradient bottom |
| `--bg-1` | `#111` | `#fafafa` | gradient top, html backstop |
| `--text` | `rgba(255,255,255,0.92)` | `rgba(0,0,0,0.88)` | primary |
| `--text-muted` | `rgba(255,255,255,0.55)` | `rgba(0,0,0,0.65)` | secondary |

The page is not flat `--bg-0`. It is a fixed three-layer field: a soft white
radial from top-left, a faint accent radial from the right, over a vertical
`--bg-1` to `--bg-0` ramp, with `background-attachment: fixed` so it does not
scroll with content. `<html>` is separately pinned to `--bg-1` because iOS
Safari exposes it under the URL bar and on rubber-band overscroll.

Light mode raises muted text from 0.55 to 0.65 alpha. Accent flavour goes on
titles, not on secondary text.

**Accent**

Four authored tokens, two derived:

```
--accent        #f97316    solid fills, borders
--accent-bright #fb923c    hover, link hover, brighter rim
--accent-light  #ffd4b0    text on accent, high-key detail
--accent-rgb    249,115,22 the one that matters
--accent-glow   rgba(var(--accent-rgb), 0.28)   derived
--accent-tint   rgba(var(--accent-rgb), 0.12)   derived
--accent-ink    the accent when it is INK                  derived, per mode
```

`--accent-ink` exists because neither authored shade can be text on a
light panel, which rule 4 below says about `--accent-light` and which is
just as true of the other two. Measured on a modal card fill (`#f4f4f4`)
across the eight accents: `--accent-bright` lands 1.39 to 2.51:1 and
`--accent` 1.74 to 3.60, yellow, green and teal worst in both. So the
token resolves to `--accent-bright` in dark (6.60 to 11.92:1 on the dark
counterpart) and to `color-mix(in srgb, var(--accent) 55%, #000)` in
light (5.19 to 8.61). Use it wherever the accent is the ink; keep
`--accent` and `--accent-bright` for fills, rims and marks, where the
contrast bar does not apply.

Presets swap the four on `body.stash-liquid-glass.refract-<name>`: blue, pink,
red, yellow, purple, green, teal. Everything else resolves through them.

**Rules**

1. Never write a raw accent hex outside the preset block. Use
   `rgba(var(--accent-rgb), N)` so custom-CSS overrides and light mode both
   keep working.
2. The tier palette (section 4) is the only second colour system permitted. It
   is allowed to override the accent, because it is encoding data.
3. Semantic colour is Bootstrap's and stays Bootstrap's, with one ruled
   exception (2026-08-30): **danger is ours.** Destructive state had
   converged on Tailwind red de facto, so it is tokenized as the accent
   pattern: `--danger` `#ef4444`, `--danger-bright` `#f87171` (ink on danger
   tints), `--danger-light` `#fca5a5` (ink on strong fills), `--danger-rgb`
   `239, 68, 68`. It deliberately shares a base with the refract-red accent
   preset; in that preset, danger reads as emphasis, which is accepted.
   Success and warning remain Bootstrap's until ruled.
4. **White is not ink; `--fg-rgb` is.** Text colour derivations are written
   `rgba(var(--fg-rgb), A)`, where the token is `255, 255, 255` in dark and
   `0, 0, 0` in light, and any island that stays dark inside light mode
   re-flips it locally, following `--text` wherever `--text` is re-pointed.
   The evidence: 44 of the theme's 76 hardcoded white text declarations
   never got their hand-written light counterpart, and two shipped as
   white-on-white. A token that flips cannot be forgotten. (Ruled
   2026-08-30; the token ships with the scene lane and reaches every lane
   at merge.)

   Text stands on one of three grounds, and only the first two flip:

   - **A mode ground** (panel, page): ink is `rgba(var(--fg-rgb), A)`.
   - **A dark island inside light** (the player bar, the card back): the
     island re-flips `--fg-rgb` locally, following `--text`.
   - **Artwork** (a thumbnail, a wall tile, a photograph): NOT a mode
     ground at all. Text on imagery keeps its own light ink plus a dark
     text-shadow, and is never swept onto the flipping token, because the
     picture does not change with the mode. **The tell is the shadow**:
     text on a photograph needs one, text on a panel never wants one.

   And the reason sweeps are scoped by hand, proven on the card back: the
   one legible string in light mode was a hardcoded white that happened to
   be right. A grep-driven sweep removes the one declaration that worked
   and keeps the three that did not. Classify each white against its
   actual ground; never sweep ink as a batch.
5. **A token that flips between modes can flip its JOB, not just its
   value.** `--accent-light` is high-key TEXT in dark and a pale FILL tint
   in light: measured across the seven presets it is 1.32 to 1.90:1 on the
   light panel, so a new use of it as text ships invisible in light mode
   while looking correct in dark and correct in the source. `--accent` is
   the light-mode text shade at 3.30 to 5.38:1 (this file's habitual
   `--accent-bright` only reaches 2.28 to 3.96). Any use of an accent token
   in a role the other mode does not share needs a partner rule in
   `14_light.css`, and the check is a contrast number, not a look.
6. **A token's fallback cannot know its consumer's ground; a concrete rule
   can.** When a token needs a pre-support fallback, the only honest value
   is another token (`--accent-ink: var(--accent)`), because the token
   serves every surface at once. A rule on ONE known surface may instead
   bake the resolved value of the thing it falls back from, byte-identical
   where supported (measured delta 0,0,0 per channel on the performer
   band), so old browsers get the same pixels rather than merely legible
   ones. The two-line token fallback is the floor; baking is available
   wherever the ground is known. A baked literal derived from a token
   carries a comment saying to recompute it if that token ever moves.

   The corollary, proven on the performer band 2026-08-30: **a rule cannot
   have both the token's identity and its own ground-correct fallback.**
   The parse-time double declaration only works when the later value is
   INVALID on the old engine, and a token with its own built-in fallback is
   always valid, so a baked literal declared before `var(--danger-ink)` is
   dead on every browser. A rule picks one: the token, accepting the
   token's ground-blind fallback (2.08:1 on that band), or its own baked
   pair (5.15:1 there). On a known surface, pick the ground and keep the
   recompute comment; the token is for surfaces the theme does not know.

### 3.2 Surfaces

The canonical glass recipe, five properties, in this order:

```css
background: var(--glass-bg);
border: 1px solid var(--glass-border);
border-radius: var(--radius);
box-shadow: var(--shadow-lg);          /* --shadow-navbar for the navbar */
backdrop-filter: var(--glass-blur);
```

Two fills: `--glass-bg` at 0.06 alpha for floating chrome, `--glass-bg-strong`
at 0.10 for panels that hold reading content. Two rims: `--glass-border` at
0.12, `--glass-border-bright` at 0.22 for hover and focus.

**Below the glass fills sits the fill ramp** (tokenized 2026-08-28 from the
measured background histogram): `--fill-1` 0.03 (hairline tint: rows, wells),
`--fill-2` 0.04 (resting fill: inputs, tiles), `--fill-3` 0.05 (raised fill:
chips, list items), `--fill-4` 0.08 (hover and active).

**The ramp flips in light mode on matched perceptual lift, not mirrored
alpha** (ruled 2026-08-30, live since fc90e7b; reverted for a day by an
unmerged-branch deploy of `14_light` and restored by the d0f3d13 union
merge, 2026-08-31 - see 7.13). The L*
curve is steep near black, so a white alpha lifts a dark ground more than
the same black alpha drops a light one; naive mirroring makes every light
fill about 23% weaker than its dark twin (dL* 2.65 against 3.43 at step 1).
The light values are black alphas computed to match each step's dark dL*
against the measured grounds (dark panel 26,25,29; light pane 255,255,255):
0.04 / 0.053 / 0.065 / 0.10 - exact matches, not rounded, because the
number's job is the invariant, and the fills are SEMANTIC (resting vs raised
vs hover must read equally in both modes), unlike the depth shadows, which
light deliberately quiets. They live in `14_light` per section 5's
token-scope pattern. Retuning either end means recomputing the other from
the invariant, never copying the alpha across.

The glass fills are a separate vocabulary from the ramp: never alias 0.06 to
`--glass-bg` or 0.10 to `--glass-bg-strong` in a rule light mode does not
override, or that surface will frost unexpectedly in light.

**Near-opaque overlays use the surface family**: `rgba(var(--surface-rgb), A)`
with `--surface-rgb: 20, 20, 24` (popovers, menus, floating overlay chrome;
the alpha stays per use), and `--surface-solid` (`rgba(11,11,11,0.94)`) for
the modal, which is exactly neutral on purpose (6.14). Two sanctioned surface
colours, no third.

**The light surface family, EXECUTED and measured 2026-08-30** (94bc238): the family follows the
channels-not-colours pattern `--fg-rgb` set, so it is two token moves, not a
new ladder. (1) `14_light` re-points `--surface-rgb` to `255, 255, 255`; the
per-use alphas stay, and every `rgba(var(--surface-rgb), A)` consumer flips
with it. (2) `--bg-0-rgb` is added (`10, 10, 10` dark, `255, 255, 255`
light) for consumers that need the page floor as channels. Measured outcomes: light resolves
the surface channel to white end-to-end (a consumer div reads
`rgba(255,255,255,0.92)`), dark is byte-identical to before, and light-plus-
lite resolves lite's opaque pins to near-opaque WHITE (0.96) with scrims
staying dark, which is correct and is the P5 condition now actually looked
at. The classification found no dark islands among the 30 consumers (the
Lightbox is deliberately light in light mode); what it found instead were
four ARTWORK consumers (duration pill, carousel chevrons, lite's two card
pills), which moved onto **`--scrim-rgb`**: the mode-FIXED dark film for
things sitting on imagery, the third ground's surface counterpart to its
never-flipping ink. `14_light` must never re-point it. Still open, per the
ledger: the 17 hand-written near-white overrides retire per-surface in
measured windows, shrinking to an alpha-only line where light's tuned alpha
genuinely differs, deleting where it does not. And a lesson from cf's pass
that binds every such window: **grounds under IMAGES need an eyeball in both
modes, not just probes** - an image on a mode-flipping ground can vanish
while every text probe passes (the logo plate defect class). The scene
lane's icon pass added the small-glyph corollary: a glyph can measure
perfectly and still read wrong when a feature gap lands under about a
pixel at render size (an info-i's dot antialiasing into its stem at 13px,
resolving at 15px with a 1.2px gap). Sub-pixel feature separation is an
eyeball check at final render size, never a geometry calculation.

**Blur is a fixed ladder, not a free parameter.** Nine live expressions: five
plain rungs (`xs` 6px, `sm` 10px, `md` 14px, `xl` 24px, `2xl` 32px) and four
saturating variants at `saturate(140%)`. On Windows Chromium every distinct
`backdrop-filter` expression compiles its own HLSL shader; the ladder has been
consolidated twice for exactly that reason (22 expressions originally, 11 at
the first pass, 9 since 2026-08-28, when the `lg` 20px rung folded into `xl`
because a 4px delta at that magnitude is imperceptible behind glass).
`--glass-blur-lg`, `--glass-blur-lg-sat` and the legacy `--glass-blur` stay
defined as aliases of the xl values so users' custom CSS keeps working; new
code uses the xl names.

Rule: **never invent a new `backdrop-filter` expression.** Pick a rung. If none
fits, the design is asking for something the ladder should have, and the ladder
gains one new rung, once, in the token file.

**Glass surfaces stack, and the stacking is not intuitive.** A translucent
panel over the page is already a composite. Painting another background or blur
on a child of it reads as a *lighter band*, not a match. To occlude something
inside a glass panel without a visible seam, use an opaque composite of the
same formula (`--bg-1` plus one `--glass-bg-strong`), or go fully transparent
with `position: static`.

Under `prefers-reduced-transparency: reduce`, the two fills go opaque
(`rgba(28,28,30,0.95)` and `rgba(36,36,40,0.97)`) and blur is dropped from the
named surface classes.

### 3.3 Depth

Six graduated shadows plus two composites:

```
--shadow-xs   0 1px 4px  rgba(0,0,0,0.35)
--shadow-sm   0 2px 10px rgba(0,0,0,0.25)
--shadow-md   0 4px 24px rgba(0,0,0,0.25)
--shadow-lg   0 8px 26px rgba(0,0,0,0.32)
--shadow-xl   0 12px 40px rgba(0,0,0,0.55)
--shadow-2xl  0 24px 60px rgba(0,0,0,0.55)
--shadow-inset-track   carved groove: dark dent plus bright top rim
--shadow-navbar        depth drop, hairline, inner highlight, two accent halos
```

Rule: **shadows come from tokens, so light mode is free.** `14_light.css`
redefines all eight inside `.refract-light` and every consumer flips
automatically. A hand-written `box-shadow` is a shadow that will look wrong in
light mode, and there is no way to find it except by looking.

Composites needing an accent halo compose `var(--shadow-X)` with inline accent
layers rather than being written from scratch. `--shadow-navbar` deliberately
uses a tight halo (18px and 40px) rather than a wide one, because the wide
layer was asymmetrically clipped by the main wrapper's `overflow-x`.

**No per-element `filter: drop-shadow`.** Stacked drop-shadows were measured as
the largest per-frame paint cost in the scene panel and were removed. Use
`box-shadow`.

### 3.4 Radius

Three tokens: `--radius` 16px (surfaces, cards, navbar), `--radius-sm` 12px
(controls, chips, inner elements), `--radius-pill` 9999px (pills, counters,
round buttons). Circles use `50%`.

That is the whole vocabulary, with one computed exception: **nested radii are
concentric.** Inner radius = outer radius minus the gap between the two edges.
A 12px container with 3px padding needs 9px inside; equal nested radii read as
untidy. A concentric radius is computed, not chosen, must carry a comment
stating its derivation (`/* 12px container minus 3px padding */`), and is
exempt from the three-token vocabulary.

Everything else literal (`2px`, `3px`, `6px`, `8px`, `10px`, hand-written
`999px`) is drift (section 9).

### 3.5 Type

**Albert Sans Variable**, self-hosted, one file covering weights 100 to 900
plus an italic companion. Loaded absolutely from
`/plugin/refract/assets/fonts/AlbertSans-Variable.woff2` with
`font-display: block`.

The `/assets/` segment is added by Stash via the `ui.assets./: .` mapping in
`refract.yml`. A relative path, or a path without `/assets/`, **fails
silently** and falls back to system-ui, which looks close enough that v1.10.2
shipped broken. Verify in DevTools Network: 200, not 404.

The font is forced onto everything except `code`, `pre`, `kbd`, `samp`.

**The scale.** Root is 14px.

| Token | rem | px | Job |
|---|---|---|---|
| `--fs-xs` | 0.72 | 10.08 | counters, overlay metadata |
| `--fs-sm` | 0.8 | 11.2 | pills, chips, badges |
| `--fs-base` | 0.875 | 12.25 | controls: buttons, tabs, inputs |
| `--fs-md` | 0.92 | 12.88 | card titles, dense headings |
| `--fs-body` | 1.0 | 14 | body copy, detail values |
| `--fs-lg` | 1.25 | 17.5 | sub-headings |
| `--fs-xl` | 1.5 | 21 | panel and section titles |
| `--fs-2xl` | 2.0 | 28 | page title |

**Rules**

1. Reach for a step. Do not invent another. The scale exists because the
   performer header once rendered twelve distinct sizes, three of which sat
   within half a pixel of each other while claiming to be different levels.
   When a step is genuinely missing, check whether the ladder already has a
   dead rung before adding one: `--fs-lg` and `--fs-xl` had ZERO consumers
   theme-wide while 14 literal sizes sat above `--fs-body`, none of them at
   17.5 or 28px, so the 21px the scene panel needed was met by retuning
   `--fs-xl` and moving the old 28px to `--fs-2xl` rather than by adding an
   eighth name beside two nobody used. Retuning a token nothing references
   changes nothing on screen; adding one grows the vocabulary forever.
2. **A surface gets six or seven size/weight pairs, not twenty.** The scene
   detail panel measured 20 pairs in a 338px column, with 10.08px doing six
   different jobs across three weights. When one size carries 119 elements it
   has stopped being a level in a hierarchy and become the default. That is the
   diagnostic: if a size is doing more than two jobs, the surface has no
   hierarchy.
3. Hierarchy is size *and* weight *and* colour together. Muted text at the same
   size is a level. Three weights at the same size is not.
4. **A fixed set of controls in a fixed-width container overrides the job
   column.** The table puts tabs at `--fs-base`, and the scene panel's six
   tab labels do not fit 338px at 12.25px: 366px against 338, and 354 even
   with the padding at its floor. They sit at `--fs-sm`. This is the one
   sanctioned reason to take a control below its row in the table, it is
   settled by measurement rather than taste, and it does not generalise to
   controls that can wrap or scroll.
5. **Centre on cap height, and let descenders hang.** `getBoundingClientRect`
   returns the line box, which reserves descender space whether or not the
   string has a descender, so a box-centred label without one reads high.
   Albert Sans at 11px measures ascent 10, descent 3, cap 8, and that asymmetry
   is the entire cause. Tab labels that measured +0.5px off by the box model
   were 1.5px high in rendered pixels. For vertical rhythm, screenshot and scan
   the ink rows inside the DOM box; compare cap-height centre against box
   centre, never ink centre between two different words.

### 3.6 Layout

- Page gutter is **12px** left and right on `.main.container-fluid`, matching
  the floating navbar's inset so the gutter reads flush.
- Top padding is 2.5rem. Stash reserves roughly 60px for its own fixed navbar;
  Refract's floats 4px lower, so it needs a little more breathing room.
- Scene and image pages get `padding: 1.5rem 0 0 0` instead, because the row
  supplies its own 20px on the sides and bottom.
- Bootstrap's `-15px` row margins are zeroed on the top-level row so
  detail-page content respects the 12px gutter.
- **Inset with padding, never margin, on `width:100%` border-box containers.**
  A right margin pushes past 100%, does nothing visible, and can cause
  horizontal-overflow flashes on load. `padding-right` shrinks the flex content
  area so `justify-content: flex-end` actually insets.
- The scene detail panel is `clamp(385px, 22.5vw, 405px)`, giving 338px of
  content at 1600 and 358px at 1920 and above. It does not grow. Below 1200px
  it stacks under the player at full width, so every panel design must also
  work at 700 to 1200px wide and short.
- Card width is computed in JS (`useCardWidth`), and scene cards are direct
  flex children of `.row.justify-content-center` with no `col-` wrapper. There
  is no static value for a card's right edge. Align siblings with a one-off
  inset variable, not by deriving `--bs-gutter-x`.

Navbar controls scale with viewport: `--nav-btn-size` steps 2.4rem, then
2.7rem at 1441px, 3rem at 1921px, 3.4rem at 2561px, with icon size and gap
following. The defaults are tuned for a 13 to 15 inch laptop at 100% scaling.

**The gap scale** (tokenized 2026-08-28 from the measured histogram):
`--gap-2xs` 0.25rem (glyph-adjacent), `--gap-xs` 0.3 (inside a chip),
`--gap-sm` 0.4 (control clusters), `--gap-md` 0.5 (the default between
items), `--gap-lg` 0.75 (between groups), `--gap-xl` 1rem (between sections).
New `gap` declarations pick a step. Pixel glyph gaps (2/4/5px icon spacing)
stay literal, and **padding and margins are not yet in scope**: they are a
far larger surface where consolidation moves layout, so they remain on the
drift ledger for a measured pass. Until then, padding matches the
neighbouring cluster.

### 3.7 Motion

Tokenized 2026-08-28 in `01_tokens.css`, from the measured de-facto scale
(0.15s appeared 373 times as a literal before this):

| Token | Value | Job |
|---|---|---|
| `--dur-instant` | 0.12s | instant feedback: press, check |
| `--dur-fast` | 0.15s | the default: hover, colour, opacity, border |
| `--dur-move` | 0.18s | transforms, small movement |
| `--dur-enter` | 0.22s | panel and popover entrances |
| `--dur-settle` | 0.3s | multi-property settles, reveals |
| `--dur-slow` | 0.4s | large surfaces: drawer, flip, modal |

Easing: plain `ease` for state change (the majority). `--ease-glide`
(`cubic-bezier(0.4, 0, 0.2, 1)`) for movement with a defined start and end.
`--ease-spring` (`0.34, 1.2, 0.64, 1`) and `--ease-spring-hard`
(`0.34, 1.56, 0.64, 1`) for entrances that should feel physical. Overshoot is
for things arriving, never for things leaving.

New motion picks a token. `multiview-player.css` keeps literals deliberately:
it loads in multiview's context, where the tokens may not resolve.

**Card tilt** is the signature interaction and its constants are fixed:
12 degrees maximum, 1.04 scale, 800px perspective, 400ms reset, 0.18 maximum
glare alpha, `cubic-bezier(.03,.98,.52,.99)`.

Hover lift is `translateY(-2px)`. It is small on purpose. Cards in a grid that
jump are cards that make a grid feel unstable.

**Rules (motion)**

1. **Never toggle a document-wide effect on scroll.** `scroll-perf` toggled a
   body class to strip `backdrop-filter` while scrolling; on Chromium D3D11
   this mass-rebuilt hundreds of GPU layers and froze the home page. Removed in
   v1.13.17 and not coming back. The only surviving mid-motion strip is the
   scoped per-carousel `.refract-slick-animating` one, Gecko and WebKit only,
   for the roughly 500ms of a slide.
2. Motion that repeats forever must be tied to data (the tier animations) or be
   removable (lite mode). Ambient animation on undifferentiated chrome is noise
   that never stops.
3. `prefers-reduced-motion: reduce` strips animation and keeps colour. It is
   handled in 13 places today; a new animated element adds a 14th.

### 3.8 Elevation (proposed scale)

There is no z-index system today; the drift ledger (section 9) documents the
mess. This is the proposed band map, drawn from what the shipped values
actually mean. New code picks from a band; existing values migrate
opportunistically, file by file, never in a sweep.

| Band | Range | What lives here |
|---|---|---|
| Content | 0 to 9 | in-flow layering inside a component |
| Card tiers | 20 to 70 | the tier rank ladder (section 4), fixed |
| Floating chrome | 90 to 120 | mobile scrim 99, mobile dock 110, sticky bars |
| Page overlays | 400 | floating pagination |
| Bootstrap layer | 1050 to 1100 | modals, dropdowns, popovers (Bootstrap's own values) |
| Topmost | 9999 to 10000 | lightbox chrome, drag ghosts, absolute-last-resort |

The cross-file singletons are named tokens (2026-08-28): `--z-scrim` 99,
`--z-dock` 110, `--z-pager` 400, `--z-overlay` 1060 (above Bootstrap's modal),
`--z-lightbox` 1100, `--z-top` 9999. In-component stacking (0 to 9) and the
tier ladder stay literal by design; Bootstrap's own 1050 is theirs.

Two standing rules already earned by bugs: the tier ladder must stay isolated
inside its grid row (its 20 to 70 would otherwise fight the pagination's 400
through a transformed ancestor), and tier cards get no `isolation` or
`will-change`, because promoting each card to its own compositor layer makes
Chrome sometimes paint them out of z-order.

### 3.9 Contrast

The floors, checked as numbers per 10.1 (and for light mode computed from the
`14_light.css` token values, since toggling the body class does not probe it
faithfully):

| Role | Floor | Applies to |
|---|---|---|
| Reading text | 4.5:1 | body copy, values, any text that is the sole carrier of its information |
| Secondary text | 3:1 | muted labels, dates, captions doing support work |
| Non-text state | 3:1 | focus rings, active indicators, borders that encode state |

Contrast is measured against the element's ACTUAL rendered ground, never the
surface it nominally sits on. The performer band's "white panel" measures
210,187,174 under its translucent veil over a portrait, which turns
`--danger`'s passing 3.76:1 into a failing 2.04:1; arithmetic against the
nominal panel passes things the screen fails.

Both modes, all eight accents; the binding constraint is almost always light
mode with the yellow preset. Quieter than the floor is possible, but only as a
**listed exemption in the drift ledger with its reason**, so that subordination
is a decision someone made and dated, never an accident nobody measured. An
element that fails its floor in one mode only is the 3.1 rule 4 case: fix it
with a partner rule in the other mode's scope, not by splitting the
difference.

---

## 4. The rating tier system

Refract's one loud idea, and the reason P3 exists.

Three rating styles, chosen by the user:

- **Minimal** (default): an accent halo on the rating banner whose brightness
  scales with the score. The rating is informational, not the centrepiece.
- **Extravagant**: the six-tier collectible frame below, on scene and performer
  cards both.
- **Playing card**: performer cards become a trading-card layout. Name banner
  on top with a gender glyph sitting to its left like a type symbol, neon stat
  strip over the image at the bottom. Scene cards keep the Refract chin.

**The tiers**

| Tier | Rating | `--tier-color` | Treatment |
|---|---|---|---|
| Bronze | 5.0 to 6.4 | `215,148,92` | quiet breathing glow |
| Silver | 6.5 to 7.4 | `192,196,204` | breathing plus slow sheen sweep |
| Gold | 7.5 to 8.4 | `230,185,78` | faster breathing, sheen, warm inset |
| Diamond | 8.5 to 9.4 | `165,223,219` | breathing plus sparkle particles |
| Legendary | 9.5 to 9.9 | `244,114,182` with `96,165,250` and `192,132,252` | dual-colour neon tube, subtle float |
| Perfect | 10.0 | `255,255,255` core | white-hot core, rotating rainbow halo, hue-cycling text, ribbon, float |

Every tier also carries `--tier-color-bright` for rims and cores. Consumers
write `rgba(var(--tier-color), N)` and never a literal.

**Rules**

1. **The floor is 5.0 and it is deliberate.** Below 5, a card is default glass.
   Do not "fix" this. If everything is a collectible, nothing is.
2. Tiers stack in z-order by rank (bronze 20 through perfect 70) so a higher
   tier's halo is never clipped by a lower-ranked neighbour.
3. Escalation is monotonic. Each tier adds to the one below rather than
   swapping to a different idea, so a user can rank two cards by looking at
   them.
4. Tier colour is data. It is the one palette allowed to override the accent.
5. Performer cards are tiered exactly once, at init, from the rating read off
   the native banner, because the Ascension plugin deletes that banner on a
   300ms timer. Anything that changes a performer tier later must call
   `applyCardTier` directly rather than waiting for the observer.

---

## 5. Modes and the body-class contract

Everything Refract does is gated by a class on `<body>`. There is no other
switch.

| Class | Meaning |
|---|---|
| `stash-liquid-glass` | the theme is on. Every selector starts here. |
| `refract-<hue>` | accent preset: blue, pink, red, yellow, purple, green, teal |
| `refract-light` | light mode |
| `refract-lite` | performance mode |
| `refract-flourish-tiers` | Extravagant rating style |
| `refract-minimal-cards` | Minimal rating style |
| `refract-perf-layout-card` | playing-card performer layout |
| `refract-rating-system-stars` | Stash is set to STARS, not DECIMAL |
| `refract-sc-*`, `refract-pc-*` | per-element card visibility, from `CARD_ELEMS` |
| `stash-route-<path>` | the current route |

**Rules**

1. **Light and lite are orthogonal to accent and to each other.** Eight accents
   times two colour schemes is sixteen combinations, and lite doubles it again.
   Nothing may assume a combination.
2. **Load order is the arbitration mechanism.** `refract.yml` lists
   `01_tokens` first, then `02` through `14_light`, then `16_playing_card` and
   `17_scroll_perf`, and `15_lite` LAST. The numbering no longer matches the
   order, so read the manifest, not the filenames. Light redefines tokens in
   its own scope so every consumer flips for free. Lite is the final word on
   performance and strips effects with `!important` regardless of colour
   scheme.

   `17_scroll_perf.css` is a legacy filename. The document-wide mechanism it
   was named for is gone; all that remains in it is the scoped carousel
   mid-slide strip.
3. **Route classes are added by JS at boot, so they do not exist on first
   paint.** Anything gated on one will flash. If an element is flash-prone,
   hide it with an unscoped rule as well.
4. Visibility toggles double their gate class for specificity. The country gate
   triples it, because playing-card's country-with-rank rule ties a double.
5. Retired setting keys migrate or purge at boot. Do not leave a dead key
   reading from localStorage.

**What lite actually does.** Kills `backdrop-filter` everywhere, hover glow
halos, active-route icon glow, focused-chip glow, and the 3D tilt with its
glare overlay. Pins every formerly-translucent floating surface to an opaque
dark, because 0.06 alpha without blur reads as a film over scrolling content.
Keeps animations, transitions, base shadows, carousel clones, and cheap state
indicators such as border and colour shifts.

Lite is not "the theme with the fun removed". It is the theme on a machine that
cannot composite. Anything that becomes unreadable in lite is a bug, not a
trade-off.

---

## 6. Component law

### 6.1 Cards

The image is the card. Text overlays it or sits in a chin below it, never
beside it. Metadata is glass pills, not rows. Hover does three things and only
three: lift 2px, warm the rim, tilt if enabled. The rating banner is a
five-point star in STARS mode and a squircle pill in DECIMAL, auto-detected, no
setting. A card in a grid never scrolls internally.

Per-element visibility comes from the `CARD_ELEMS` table: every hideable part
of a card has a `refract-sc-*` / `refract-pc-*` body class, and the keys, the
classes and the settings chips all derive from that one table. A new card
element that should be hideable joins the table; it does not get a bespoke
toggle.

An element may ship OFF (ruled 2026-09-02, the Ascended score being the
first). Its roster chip is then its only control, and that is sufficient
rather than a compromise: a hit target cannot exist for something the card
does not draw, which is already true of Tag count on a scene with no tags
and Country on a performer with none. The element's default belongs in the
table beside it, so an absent stored value is no longer the same statement
as one set off, and a look that lists only what it HIDES cannot express a
default-off element at all. That last clause is the trap: "absent means
shown" was encoded in four separate readers, each locally correct and
invisible to the others, and missing one is silent - a look switches the
element on, or two looks collapse to one signature. 7.20's law about the
selector you are reading has a JS twin, and the cure is the same: one
reader, here one helper, owns the question.

### 6.2 The playing card

The signature element. When `refract-perf-layout-card` is set, a performer card
becomes a trading card:

- **Name banner** on top (`.refract-pc-name-banner`), tier-glow behind the
  name, the gender glyph sitting to its left like a type symbol.
- **Neon stat strip** over the bottom of the image: rating, age, scene count,
  o-count, country flag, each a compact icon-plus-value unit.
- **Tier label ribbon** (`.refract-pc-tier-label`) when tiered.
- **A back**: the flip button two-phase-rotates to a dossier face built lazily
  on first flip, GraphQL fired only then. The flip is faked (section 8) because
  `overflow: hidden` forces `transform-style: flat`.

The name and tier chip are never toggleable; a card must always be
identifiable. Scene cards keep the Refract chin in this mode; the trading-card
layout is performers only.

### 6.3 Navbar

Fixed and floating, inset 12px on three sides, `--radius`, the full glass
recipe, `--shadow-navbar`. Clips horizontally (`overflow-x: clip`) and stays
visible vertically so active-state halos are not cut off. Icons are
drag-reorderable and the order persists. It scrolls horizontally rather than
wrapping at narrow widths.

### 6.4 Panels

`--glass-bg-strong` plus a blur rung. Content sets its own rhythm; the panel
supplies the rim and the floor and nothing else. Remember section 3.2: a child
of a glass panel cannot paint its own glass without reading as a lighter band.

**Free user text never sets a panel's height.** Descriptions, details, titles
and file paths are unbounded input; the composition gives them a budget
(line-clamp or max-height plus a disclosure to expand) and the budget comes
from the layout, not the content. The canonical failure: a 1,838px scene
description pushed the tag list to y=2246 inside an 890px panel, leaving
everything below it invisible with no signal that it existed. Clamp with a
visible affordance; do not solve it with an inner scrollbar, which is the P7
failure wearing a different hat. This applies to every surface that renders
user-entered text, cards included.

### 6.5 Buttons

The primary recipe, from `09_buttons.css`:

```css
background: var(--accent-tint);          /* 0.12 accent */
border: 1px solid var(--accent-glow);    /* 0.28 accent */
color: var(--accent-bright);
border-radius: var(--radius-sm);
font-weight: 600;
/* hover and focus: fill to 0.22, glow shadow, text to --text */
```

**Deliberately no backdrop-filter.** The rule hits every primary button on the
page, which can be 30 to 50 on heavy pages, and each blurred button is its own
GPU compositor layer. Accent tint plus accent-glow border is readable without
blur. This is the template for any repeated control: blur is for the few large
surfaces, never for the many small ones.

The **minimal** variant (`.btn.minimal`) is the icon-only button: transparent
fill, transparent border, no shadow, no blur. The glyph is the button. Used for
the favourite heart and its peers.

Destructive actions, ruled 2026-08-30: **inside an edit context, a
destructive action may sit inline in a row of peers when it wears the quiet
danger recipe** - danger tint fill, danger ink (3.1), never primary weight -
with the performer band's Delete as built as the reference. Repeating rows
may use compact danger remove buttons (the string-list pattern). Outside
edit contexts the old law stands: destructive actions live in a menu, not in
a row of peers. The distinction is the context's own contract: an edit
surface is where the user came to change things, so a quiet red door there
is honest; the same door in a browsing row is an ambush.

A counter that happens to be clickable is a readout, not a button, and must
not dress like one.

### 6.6 Inputs and forms

Glass inputs: `rgba(255,255,255,0.04)` fill, `--glass-border` rim, `--text`
ink, `--fs-sm` in dense contexts and `--fs-base` elsewhere. Focus is an accent
event, not a browser default:

```css
border-color: var(--accent-glow);
box-shadow: 0 0 0 2px rgba(var(--accent-rgb), 0.15);   /* 3px on selects */
outline: none;
background: rgba(255, 255, 255, 0.09);                  /* one step up */
```

Focus must always be visible; the rule above is the house focus ring. Input
groups (prepend button plus field) merge into one pill: the seam edge of each
half flattens its radius. Do not force `border-radius` with `!important` on a
high-specificity input selector; it blocks the downstream pill-merging rules,
which is a bug that already shipped once.

### 6.7 Pills and chips

`--radius-pill`, `--fs-sm`, glass fill, hairline rim. They are readouts first
and controls second. A pill that mutates something must look different from a
pill that reports something. Eleven identical 26px circles in one row
communicates nothing, and that is exactly what the scene panel action bar
shipped.

**Line-height must clear the font box (ascent plus descent), or the line box
must be centred explicitly.** A pill set `line-height: 11.5px` against Albert
Sans's 14px font box at that size sent the half-leading negative, silently
dragging its baseline 2px up while its neighbours sat 3.13px low: 5.1px of
spread across one row of pills, invisible in the source and unmeasurable by
eye. Negative leading never announces itself; when a row of chips will not
align, check the line-height against the font box before touching padding.

**Positive leading and a centred line box are still not centred text.** A
chip with healthy line-height and `align-items: center` measures centred to
a hundredth of a pixel by `getBoundingClientRect` and can still sit 1.5px
high, because the line box it centres reserves descender space and the cap
band inside it therefore sits about a pixel above the box. The counter
pills read that way against their own icons while the box model said they
were perfect. **Audit a row by scanning the rendered ink against the pill
it sits in.** In this panel every correctly-set chip lands its ink at +0.50
from the pill centre, icons included, so anything that is not +0.50 is the
thing to fix. Asymmetric vertical padding moves a flex-centred line box by
half the difference, and Chrome rounds the result to whole pixels at 1x, so
pick the value from the measurement rather than from the arithmetic.

### 6.8 Popovers and hover cards

Bootstrap's variables are re-pegged at body level so they cascade everywhere:
`rgba(20,20,24,0.97)` in dark, `rgba(255,255,255,0.97)` in light, 12px radius.
Do not restyle a popover locally; fix the variable.

Refract also injects its own hover cards (performer circles on scene cards, tag
popups). Two rules earned there:

1. **The popup stays open while the mouse travels to it.** Show on hover of the
   badge OR the popup itself, so the cursor can cross the gap without
   dismissal.
2. Injected popovers portal to body level and get the thin scrollbar (6.10),
   never an inner scroll trap inside a card.

### 6.9 Toasts and status colour

Status tints layer ONTO the glass; they do not replace it:

| State | Fill | Border |
|---|---|---|
| success | `rgba(46,125,91,0.22)` | `rgba(46,125,91,0.45)` |
| danger | `rgba(var(--danger-rgb),0.22)` | `rgba(var(--danger-rgb),0.5)` |
| warning | `rgba(232,121,43,0.2)` | `rgba(232,121,43,0.45)` |

Danger rows use the 3.1 danger tokens (ruled 2026-08-30; the toast's old
`217,45,32` crimson was the one stray and was folded onto `--danger-rgb`, a
slight visible warm-up at 0.22 alpha). Success and warning stay literal until
their families are ruled.

The rule this encodes: **state must survive the glass.** The original flat
glass toast beat Bootstrap's `.bg-success` / `.bg-danger` with `!important`, so
a failed task and a successful one rendered identically and an error carried no
signal at all. Whenever a themed surface can carry semantic state, check that
the state still reads after theming.

### 6.10 Scrollbars

Thin, track-less, accent-thumbed:

- Width 8px on content panes, 4px inside popups.
- Thumb `rgba(var(--accent-rgb), 0.35)`, hover `0.6`, pill radius. Quiet
  contexts (tag popups) may use `--glass-border` instead of accent.
- Track transparent, always.

A scrollbar is chrome; it gets accent only because it is interactive.

**These widths only exist through `::-webkit-scrollbar`, and Chrome discards
every one of those rules for an element that has a standard scrollbar property
in effect.** `scrollbar-width` and `scrollbar-color` are INHERITED, so an
ancestor setting either -- `.scene-tabs` sets the colour for the whole detail
column -- silently disables the pseudo-element styling for everything inside
it. The element then draws the 15px platform default in theme paint, with
Windows arrow buttons: the one width nobody chose. Adding the standard
properties back only trades 15px for the 10px Chrome calls thin. What restores
the intended bar is resetting them, `scrollbar-width: auto` and
`scrollbar-color: auto`, which hands the element back to `::-webkit`; measured
in the rating drawer at 15 then 10 then 4. Firefox has no `::-webkit` and keeps
its platform bar in either case. Never read a width off the `::-webkit` rule --
measure `offsetWidth - clientWidth`, which is also the only honest source for
any layout that has to compensate for the gutter.

### 6.11 Mobile chrome

Below phone widths Refract does not shrink the desktop navbar; it replaces it,
ground-up, width-driven (any narrow viewport, not touch-gated):

- **Bottom dock**: an edge-to-edge native-feeling tab bar. 3.5rem content
  height, near-black fill, hairline top border, 12px blur, safe-area inset
  folded INSIDE the bar so it reads as device chrome rather than a floating
  element. Essential routes one tap away, burger tile at the end.
- **Drawer**: a body-level overlay of route tiles, opened by the burger, closed
  by it too (dock 110 sits above the scrim 99 so the burger stays reachable).
- **Scrim**: dims the page under the drawer.

Breakpoints in use: 600, 768, 900, 991, 1200 max-width, with 12_mobile loaded
after the desktop sheets so its rules win. The scene page stacks player over
panel below 1200 (section 3.6); the card grid drops to two columns on phones.

The dock deliberately breaks the floating-glass language: at phone size the
theme imitates the platform's own chrome instead of its desktop self. That
trade is settled.

### 6.12 Iconography

- Inline SVG only, sized by the text box, coloured by `currentColor`. Two
  families in use: filled Font Awesome-style paths (matching Stash's own icon
  set) and stroke-based glyphs; keep to those, matching whichever the
  surrounding Stash context uses.
- **Never emoji.** Beyond the house style rule, there is a technical one: on
  Windows, emoji glyphs render as colour bitmaps that ignore `fillStyle` and
  `currentColor` entirely. The heart is drawn as bezier paths for exactly this
  reason.
- Icons inherit their text colour and therefore theme for free. An icon with a
  hard-coded fill is wrong in seven accents and light mode.
- **For a glyph you do not own** (a plugin's unicode star with an inline
  hard-coded colour): hide the native glyph and draw a data-URI SVG as a CSS
  mask with `background-color: currentColor`. The element's DOM and handlers
  are untouched (P4), and theming plus hover states come free on a control you
  cannot edit.

### 6.13 The eyebrow, and micro-type

The house label pattern for section headers, column labels and stat captions:
`--fs-xs`, weight 600 to 700, uppercase, tracked. The tracking ladder is
tokenized (2026-08-28): `--track-tight` 0.04em, `--track-label` 0.06,
`--track-eyebrow` 0.08, `--track-wide` 0.1, `--track-display` 0.14. Body text
sits at the global `0.005em` and never gets tracked wider; micro letterfit on
display text (0.01 to 0.02em) is a different job and stays literal.

An eyebrow labels; it is always `--text-muted` or accent, never brighter than
the content it introduces (P1).

### 6.14 Modals and dialogs

The modal is NOT the standard glass recipe, deliberately:

```css
background: rgba(11, 11, 11, 0.94);   /* near-opaque neutral, not --glass-bg */
border: 1px solid var(--glass-border);
border-radius: var(--radius);
backdrop-filter: var(--glass-blur);
color-scheme: dark;
box-shadow: var(--glass-shadow), 0 0 0 1px rgba(0,0,0,0.35) inset;
```

Two rules inside it:

1. **Neutral grey, never a blue-ish mix.** An `(n, n, n+4)` background reads
   as blue next to `--bg-0`. The fill is exactly neutral.
2. **Headers justify flex-start, never space-between.** A two-child header
   with `space-between` once put 399px of nothing between an icon and its
   title in a 498px bar. The close button reaches the right edge with
   `margin-left: auto`, which only works from flex-start.

Dialog column labels use the eyebrow (6.13) with a hairline underline. An
empty `.modal-footer` child is display-none rather than left to reserve ghost
space.

### 6.15 The lightbox

Viewer chrome floats like the navbar: the footer is a fixed bar inset 12px
left, right and bottom, near-opaque dark (`rgba(18,18,22,0.92)`), hairline
rim, three anchored groups (left, centre, right). The mutation watcher pauses
while the lightbox is open, so nothing injected may rely on observer ticks
inside it. Media stays the subject (P1): chrome sits at the edges and never
overlaps the image.

### 6.16 The scene player

Redesigned separately and settled (section 8), but its vocabulary is design
law for anything added near it:

- **Chrome lives on the wrapper.** Border, radius, shadow and margin belong to
  `.video-wrapper`, not the video element.
- **Idle fade is asymmetric.** Controls and overlay leave together on a slow
  1s fade when the user goes inactive; pointer-driven hides (mouseleave,
  keyboard handoff) keep a 0.2s snap. Slow out, fast when intentional.
- **The overlay hides while scrubbing** so it never sits on the frame being
  previewed.
- **Unknown controls stay visible.** A third-party plugin's player button gets
  default placement, never display-none; Refract only styles the controls it
  knows.
- The scrubber groove uses `--shadow-inset-track`; centre overlay buttons
  (back, play-pause, forward) appear on hover only.

### 6.17 List and table views

The table view is a glass shell: `--glass-bg` fill, hairline rim, `--radius`,
with Bootstrap's table variables re-pegged at body level (transparent bg,
0.02-alpha stripes, 0.045 hover). Header cells are sticky at `top: 0` with
`--glass-bg-strong` plus a blur rung; the sticky offset is 0 because
`.table-list` is its own scrollport, not the window. The background moves onto
the `th` itself because a sticky cell paints its own layer.

### 6.18 Floating platforms

Two more members of the floating-chrome family, both pill-shaped
(`--radius-pill`) to distinguish them from the rectangular navbar:

- **The toolbar pill** behind the filtered-list toolbar, painted via
  `::before` so React inline-style overrides on the toolbar itself cannot wipe
  it, with negative inset for breathing room.
- **The pagination capsule**, fixed bottom-centre, z 400. Width is
  content-sized (`width: auto` plus a viewport max), because a stretched
  wrapper once took clicks across the whole page width.

A new floating control joins this family: pill, glass, fixed, inset from the
viewport edge, never touching it.

### 6.19 Selection mode

The card checkbox is custom-drawn (`appearance: none`), sits top-left inside
the card, and is invisible until the card is hovered or it is checked. Checked
state fills accent. It uses `--glass-blur-xs`, the one small-control exception
to the no-blur-on-repeated-controls rule (6.5), acceptable because at most a
handful are visible mid-interaction. Beware: `:has(.card-check:hover)` in the
grid is the known scroll-perf hazard (section 7); new selection affordances
must not add another.

### 6.20 Theming third-party plugins

`13_plugins.css` re-skins other people's UIs (multiview, Ascension,
advanced-rating, ThumbPreviews, DiceR, SFWSwitch, date pickers, and more).
The law for adding one:

1. **Theme their surfaces with our tokens; never change their behaviour.** P4
   applies doubly: it is not even our state to break.
2. **Their DOM is weather.** Selectors must tolerate the plugin being absent,
   renamed, or updated; a broken plugin selector may not damage the base
   theme. Scope every rule to the plugin's own root class or id.
3. **Navbar injections get slot ordering, not redesign.** A plugin's navbar
   button is arranged into the icon row and inherits `--nav-btn-size`; its
   glyph is not redrawn.
4. Minimal-compat is a valid tier: some plugins (stashGlobalSearch) get one
   tweak, not a re-skin. Match effort to how visible the plugin's UI is
   inside the theme.
5. **A plugin control with a hard-coded look gets the mask treatment**
   (6.12): hide its glyph, repaint with a currentColor mask, never edit its
   element.

### 6.21 Voice

The words are part of the theme and follow the same discipline:

- **British English**: colour, customiser, organised, favourite. Refract's UI
  copy, settings labels and README already are; stay consistent.
- **Sentence case everywhere**: "Accent colour", "Card rating style", "Show
  performer names". Uppercase belongs to the eyebrow treatment (6.13), not to
  the words themselves.
- Labels name what the user controls, in their vocabulary, not the
  implementation's: "Lite mode", never "disable backdrop-filter".
- A control says what it does: the plain verb, no cleverness. Counters are
  nouns. Toggles are states.
- No emoji, no em dashes, anywhere, ever.
- Errors say what happened and what to do, specifically. A toast that cannot
  say which of success or failure occurred is the 6.9 bug in words.

### 6.22 Empty, failed, resolving

Nothing here is designed yet (section 9 says so honestly); this is the law for
when it is:

1. **An empty slot carries information, and a repeated placeholder destroys
   it.** In a grid where the image is the identifier, ten identical
   silhouettes are anti-informative: they read as "dull photo", not "no
   photo". The slot promotes whatever field is doing the disambiguating
   instead.
2. **Absent, failed and resolving are three different states.** Absent is
   permanent and says so. Failed to load is not permanent and deserves a
   retry affordance. Resolving must hold the slot's dimensions so the grid
   does not reflow when it lands.
3. An empty screen is an invitation to act (6.21): it says what would fill it
   and offers the action, in the interface's voice.

### 6.23 Tabs and segmented controls

Ruled 2026-08-30: **tab links take `--radius-sm`.** A tab is a rectangular
door into a rectangular panel, and a pill-shaped door reads as a button. The
pill silhouette belongs to the 6.18 floating family: the scope control and
floating segmented controls stay `--radius-pill`, because they float free of
any panel they would need to match. The shape is the type signal: rounded
rectangle = takes you somewhere in place, pill = floating chooser.

---

## 7. Platform physics

Constraints from the substrate. Breaking one of these has already shipped a
bug.

1. **Do not move React-managed nodes.** Relocating a node out of React's tree
   desyncs its fiber: detached handlers, orphaned nodes on re-render. This
   caused a data-loss bug on the scene date field. Leave the native node where
   React put it, hide it with CSS, and inject a proxy that forwards clicks. The
   rating popover does this correctly: the stars never move, CSS paints them
   into a popover.
2. **`:has()` has a budget and the card grid has spent it.** It is fine in a
   detail panel (one instance, a dozen rows). It is a known scroll-perf problem
   in the grid, where `:has(.card-check:hover)` re-fires as every card passes
   under the cursor across a 19,000-element page. Style recalculation, not
   paint, is the cost: 117ms per pass, measured. `:has()` also sets the browser
   floor (Chrome and Edge 105, Safari 15.4, Firefox 121).
3. **Third-party plugin elements may be absent, and may change shape per
   state.** Advanced Ratings, multiview and the better-image picker all
   inject into Refract's surfaces. A design may use them when present, must
   not look broken when absent, and must not reserve space for something that
   is not there. The sharper trap is state: Advanced Rating renders a star, a
   plus and a badge when incomplete, and a star and a plus with NO number at
   all when complete. A design measured against the one state it happened to
   open in is wrong in the others. Measure every state of a third-party
   control before styling it.
4. **Self-hosted assets resolve under `/plugin/refract/assets/<path>` only.**
   The plain `/plugin/refract/<path>` route serves manifest-listed CSS and JS
   and silently 404s everything else.
5. **One ES5 file, no build step.** `refract.js` is a single IIFE. Injected
   markup is built with `innerHTML` from a template, which makes novel layout
   cheap and makes any build-time abstraction impossible.
6. **One consolidated MutationObserver** drives a debounced `runAll()` that
   calls every DOM-augmenting function inside `try/catch`. New DOM work
   registers there. It pauses while the lightbox is open.
7. **Stash renders duplicate pagers**, top and bottom. Refract tags all but the
   last for hiding. On `/scenes` the top wrapper is also the totals summary, so
   naive hiding swallows the stats.
8. No emoji. No em dashes. Anywhere: CSS, JS, UI copy, commit messages.
9. **A selector group's specificity is its MOST specific selector, not the
   one you happened to read.** `08_misc_mid.css:2658` groups
   `.rating-stars .btn.btn-secondary.minimal` with `.rating-stars button`;
   the second is (0,2,2) and the first is (0,5,1), so a new rule pitched to
   beat (0,2,2) lost. The five stars were the only controls out of 39 that
   stayed without a focus ring while every other one was fixed, and the
   source looked correct. Count every selector in the group, or check the
   computed style and let it tell you. It has cost two rounds in one
   session: the same mistake put the video-filter read-out back on screen
   truncated to "10...", because `06`'s column rule is a group whose first
   selector is (0,6,1) against a tidier (0,4,1) replacement.

   **`:is()` is that same group, folded inside one selector, and it is
   worse because the group is invisible in the part you are reading.**
   Every branch of an `:is()` takes the specificity of its STRONGEST
   branch. `05_list_views.css:620` styles dialog primary buttons through
   `:is(#configuration-tabs #settings-container, ..., .modal-body)`: the
   `.modal-body` branch, which reads like one class, carries (2,3,1) --
   two IDs' worth -- and pins every primary button in every modal to
   `--radius-sm !important`. Four `!important` longhands at (0,6,1) lost
   to it silently while the source looked correct on both sides. Never
   put an ID branch in an `:is()` with class branches; use `:where()` for
   the branches meant to stay weak, or write the ID case as its own rule.
   This is only findable with `CSS.getMatchedStylesForNode` (10.1), which
   reports each matching selector's real specificity.
10. **A rule that defers to a feature must name the feature in its
   selector.** `06_scene_player.css` hid the numeric read-out beside every
   video-filter slider because a live-preview swatch chip replaces it. The
   swatch was switched off on 2026-07-28 as unfinished
   (`REFRACT_FILTER_SWATCHES_ENABLED = false`); the CSS that deferred to it
   stayed on, so the Filters tab shipped 13 sliders with no read-out of any
   kind: no number, no chip, an empty 0px column. Keying the hide on the
   class the injection adds (`.refract-has-swatch`) makes the fallback
   automatic in both directions. A feature flag that lives only in JS
   silently desynchronises every rule written in anticipation of it.
11. **Read a third-party control's mechanism off the DOM, not off its
   name.** Stash's partial star looks like a left-anchored clip and is
   not: on a 40 percent star `.filled-star` measures `left: 4.20px,
   width: 5.59px`, a WINDOW onto a region of the glyph. A mask painted on
   that div starts at the div's own left edge, so it drew the star's tip
   inside a window meant to show its middle and every partial star came
   out wrong. Where a control encodes a value geometrically, measure the
   geometry at more than one value before building on it: one full star
   and one empty star both look correct under either theory.
12. **CSS and JS version skew fails silently.** The body-class contract
    (section 5) and the injected scaffolds mean much of the CSS keys on
    classes that JS adds at runtime. Deploy CSS from one build over
    refract.js from another and those rules match nothing: no error, no
    visual break, just rules that quietly stopped existing. A hybrid build
    did exactly this on 2026-08-29. The deploy protocol that prevents it
    (one committed tree, reproducible from a hash) is process and lives in
    CLAUDE.md; the physics fact is recorded here because no review that
    reads source can catch it.
13. **A token and its first consumer are one atomic unit at deploy time,
    whatever the repo says.** `var(--x)` with `--x` undefined is invalid at
    computed-value time: the declaration is DROPPED, not defaulted - no
    warning, no fallback, no layout break. When a consumer of a new token
    deployed ahead of its definition on 2026-08-30, every danger declaration
    in the theme vanished at once and the Delete button rendered as
    plausible-looking plain white text at 9.87:1. The discipline: whoever
    lands a new token deploys the token file FIRST and announces it before
    any lane migrates onto it, and the token file is superset-checked
    against the deployed copy before every deploy - it must carry every
    lane's vocabulary at once, so "my committed tree" is not enough. Nor
    is it the only such file: any mode scope two lanes both define tokens
    in has the same property. On 2026-08-31 a deploy of `14_light.css`
    from a branch that had not merged the scene lane's work silently
    reverted the entire light fill flip - 145 `var(--fill-N)` consumers
    went white-on-white while the deploy's own change measured correct.
    The superset check (custom-property names, deployed versus candidate)
    applies to every shared token-defining file, and a deploy of one from
    an unmerged branch is a revert, whatever the intent.
14. **A shorthand with `!important` erases longhands set anywhere else, at any
   specificity.** `background: x !important` resets `background-image` too,
   and a higher-specificity longhand without `!important` still loses. This
   is a different failure from losing the cascade: the rule wins and your
   longhand vanishes silently. When extending a surface where any rule sets a
   shorthand with `!important`, every longhand you set must repeat
   `!important`.
15. **Changing `flex-direction` re-points every inherited alignment
    property.** Alignment is axis-relative: a container that becomes a column
    silently re-purposes `align-items` from vertical to horizontal, and a rule
    written for the old axis (a modal header's `align-items: center`) starts
    doing something else entirely. When you change an axis, re-declare both
    alignment properties explicitly.
16. **Collapsing something Stash sized from a grid track means zeroing the
    MINIMUMS, not just the dimensions.** Stash sizes cards and their images
    off the track they were laid out in, and those minimums outrank a
    `width: 100%` set later. Twice now: collapsed performer cards stuck at
    169px wide because `[data-perf-count="2"]` won, and then the images
    inside the fixed 34px circles carried `min-width: 157.5px`, so
    `object-fit: cover` scaled each photo to cover 157px and the card
    clipped all but the leftmost 34px. Every avatar was an edge sliver of a
    hugely zoomed picture and it looked like a bad crop rather than a
    layout fault. Set `min-width` and `min-height` to 0 on every box down
    to the replaced element.
17. **Below 1200px the panel is not a column, and anything tuned to 338px
    has to say what it does at 1060px.** Three separate things stretched
    when the page stacked: the tab strip's `flex: 1 1 auto` turned six tabs
    into 166 to 181px slabs around 46px of ink; the description ran the
    full pane at about 157 characters a line; and Stash's own header
    ordering flips at exactly 1200px, sending the studio eyebrow below the
    title it labels. A row composed for the column needs a cap, a measure,
    or an explicit order, and the check is to measure at 1600 AND at 1100.
18. **A contrast number is only as good as the ground you measured it
    against, and `backgroundColor` is not the ground.** Light mode paints
    the page with `background-image` gradients over a transparent
    `background-color`, so `getComputedStyle(document.body).backgroundColor`
    returns `rgba(0, 0, 0, 0)`. Parsed for channels that is black, and
    every composite built on it inverts: the panel came out mid-grey
    (179,179,179) instead of white, and two disclosure controls were
    reported at 2.55:1 when they actually measured between 3.30 and
    5.38:1 depending on the accent preset. Nothing errored, and the
    numbers looked entirely ordinary. Sample the rendered pixel instead:
    screenshot, take the modal colour of a blank region of the surface,
    and composite the element's computed `color` onto that. The panel's
    real ground is 255,255,255 and the drawer's is 214,214,214, and
    neither is derivable from a property read. The one honest tell was
    that the arithmetic had produced a grey nobody had chosen; treat an
    unexpected ground as a broken measurement, not a surprising result.
19. **Replaced-element physics.** A border or radius on an element whose
    content does not fill its box frames the box, not the picture:
    `object-fit: contain` plus a border produced a 168px frame around a 94px
    portrait with 29px of dead space each side. And `max-width: 100%` on a
    replaced element inside a content-sized flex parent is circular; remove
    the sizing floor and it collapses, measured at 2x2. Size replaced
    elements from a real constraint, never from each other.
20. **When one selector appears more than once, the rule that wins is
    never the one you are reading.** Three times in one pass: two
    `--ic-grid` blocks where the stale later one drew rings instead of
    squares; a `display: none` on `.count-icon` that a later
    `inline-flex` list had silently killed; and three identical
    `.adv-rating-btn` selectors where the hide sat in the middle, so a
    control meant to be gone stayed on screen and could be clicked. Equal
    specificity is decided by source order alone, which is invisible when
    the blocks are a thousand lines apart and each carries a comment
    arguing for its own value. Before adding a declaration, grep the
    selector across the file; when a block turns out to be dead, delete
    it rather than outvote it, because a fourth rule leaves the same trap
    for the next person. A dead rule with a rationale is worse than no
    rule at all.
18. **A contrast number is only as good as the ground you measured it
    against, and `backgroundColor` is not the ground.** Light mode paints
    the page with `background-image` gradients over a transparent
    `background-color`, so `getComputedStyle(document.body).backgroundColor`
    returns `rgba(0, 0, 0, 0)`. Parsed for channels that is black, and
    every composite built on it inverts: the panel came out mid-grey
    (179,179,179) instead of white, and two disclosure controls were
    reported at 2.55:1 when they actually measured between 3.30 and
    5.38:1 depending on the accent preset. Nothing errored, and the
    numbers looked entirely ordinary. Sample the rendered pixel instead:
    screenshot, take the modal colour of a blank region of the surface,
    and composite the element's computed `color` onto that. The panel's
    real ground is 255,255,255 and the drawer's is 214,214,214, and
    neither is derivable from a property read. The one honest tell was
    that the arithmetic had produced a grey nobody had chosen; treat an
    unexpected ground as a broken measurement, not a surprising result.
19. **Balanced braces are not a valid CSS file.** A scripted edit that
    appends a paragraph without opening `/*` leaves prose sitting in the
    stylesheet; the parser error-recovers by skipping to the next thing
    it can parse, and what it skips is whatever rule happens to follow.
    Exactly one rule vanished, its neighbours were untouched, and the
    file passed the brace-balance check this project's notes prescribe.
    From outside it looks impossible: the rule is in the file, absent
    from `document.styleSheets`, and everything around it is fine. Count
    `/*` against `*/` as well as `{` against `}` after every scripted
    edit, and treat a rule that is present on disk but missing from the
    parsed sheet as a syntax fault ABOVE it, not a specificity problem
    in it.
20. **A probe that returns nothing is broken until proven otherwise.**
    `sh.cssRules` throws a SecurityError on a cross-origin stylesheet, so
    a `try/catch` around the whole loop rather than the single access
    kills the entire scan at the first foreign sheet: 0 sheets read,
    0 rules, no error. The same scan must also recurse into grouping
    rules or every `@supports` and `@media` body is invisible. Both
    faults report absence, and absence reads as evidence. This cost a
    reported "gap" on a surface that turned out to be styled correctly
    and deliberately. A working scan of this app walks about 9,700 rules
    across 16 to 17 sheets with 0 skipped; anything far below that is the
    instrument, not the finding.
21. **A diff is not evidence of deletion in a file that gets rewritten in
    place.** `DESIGN_SYSTEM.md` is edited by several lanes, so paragraphs
    get renumbered, reworded and folded into neighbours constantly. A
    line diff calls every one of those a deletion. Checking two lanes'
    additions this way produced nine reported losses of which eight were
    imaginary: a principle that had gained a ruled exception, a rule that
    had been renumbered, a table row folded onto a token, and a ledger
    row another lane had rewritten better than the original. Verify a
    passage still exists by searching the FLATTENED file
    (`tr '\n' ' '`) for two or three independent markers from inside it,
    never by reading a diff and never with a pattern that could span a
    line break. Only content that fails every marker is actually gone --
    which, across both lanes and one whole day, was exactly one rule.

21. **Balanced braces are not a valid CSS file.** A scripted edit that
    appends prose without opening its comment leaves that prose in the
    stylesheet, and the parser error-recovers to the next thing it can
    parse - eating whatever rule FOLLOWS the fault. Exactly one rule
    vanished that way, neighbours untouched, and the file passed the
    brace-balance check these notes used to prescribe. From outside it
    looks impossible: present on disk, absent from
    `document.styleSheets`. Count `/*` against `*/` as well as `{`
    against `}` after every scripted edit, and treat a rule present on
    disk but missing from the parsed sheet as a syntax fault ABOVE it,
    never as a specificity problem inside it.

---

## 8. Settled, do not re-litigate

- The tier floor at `v >= 5`.
- The two-column scene page (player right, panel left) and the six-tab strip.
- The glass surface language, the accent token system, and Albert Sans.
- The scene player, its control bar, and the quality/codec panel.
- The scrubber strip beneath the player.
- The card flip exists. How you reach the back is not in question.
- A performer's name and tier chip are never toggleable. A card must always be
  identifiable.
- The card back cannot use `preserve-3d`. `overflow: hidden` is required for
  the rounded corners and the tier ribbon clip, which forces
  `transform-style: flat`. The flip is faked: turn to the edge, swap faces,
  teleport to the mirror edge, finish the turn. Both faces rest at
  `rotateY(0)`.
- The performer band is always expanded. Stash's detail-header collapse is a
  deliberate subtraction on the performer page only (the wrapper hide at
  `08_misc_mid.css`, taking the styled toggle with it): no collapsed-state
  design exists for the band, and none is planned. Everywhere else the stock
  `.expand-collapse` toggle survives, restyled not replaced, and works
  (measured on studio and tag pages, 2026-08-31). User-confirmed 2026-09-01.
- Light mode shipped in v1.11.0, and lite still loads last.
- `scroll-perf` is gone and is not coming back.
- The B5 toggle desync stays unfixed. It is cosmetic.

---

## 9. Known drift

An honest ledger. None of these are emergencies. All of them are places the
system is not being followed, and each is a cheap win for whoever is already in
that file. A ledger without dates becomes a museum: every row carries when it
was logged or ruled on and what triggers a revisit, so this stays a decision
record rather than a list of things everyone has stopped seeing. Rows without
an explicit date were logged at the ledger's creation, 2026-08-27.

| Area | State | Rule |
|---|---|---|
| Type | 301 uses of `var(--fs-*)` against 99 literal sizes, so 75% adoption. The literals cluster at 0.74, 0.66, 0.62, 0.6 and 0.58rem, which is a sub-`--fs-xs` tier the scale does not have. | 3.5 |
| Type, second ladder | RESOLVED 2026-08-28: the panel-local scale is gone and every size in the panel is a scale token. Folded as ruled, with two corrections measurement forced. `--sp-value` had no consumers left and was deleted rather than aliased. 21px was promoted by retuning `--fs-xl` (and moving 28px to `--fs-2xl`) rather than adding an eighth step, because both top rungs had zero consumers theme-wide. Measured before and after: 13 size/weight pairs across 9 distinct sizes became 10 across 5. Logged 2026-08-27. | 3.5 |
| Type, sub-scale literals | 31 literal font sizes sit below `--fs-xs` across 16 distinct values from 5.04 to 9.5px, 20 of them clustered in 8.12 to 9.24. The scene panel's own (9.5px tag counts) folded UP to `--fs-xs` rather than down, which removed a size instead of adding a rung, so no `--fs-2xs` was created. Whether the other 30 want one rung or none is a measured pass, not a drive-by. Logged 2026-08-28; revisit with the padding pass. | 3.5 |
| Contrast | RULED 2026-08-30: brighten. `.st-tag-caption` and `.st-tag-n` go to alpha 0.42, clearing the 3:1 secondary floor. The scene lane is executing; this row closes when the change lands and is measured. | 3.9 |
| Destructive actions | RULED 2026-08-30: inline delete. 6.5 revised to codify shipped practice - inline destructive actions are legal in edit contexts with the quiet danger recipe (the performer band Delete as built is the reference; string-list compact removes likewise); outside edit contexts the menu law stands. No CSS changed anywhere; the ruling codifies what shipped. | 6.5 |
| Browser floor | RESOLVED 2026-08-30, ruled baked fallbacks: the documented Chrome 105 floor stands. Both light ink tokens now declare a literal-token fallback first (`--accent-ink: var(--accent)`, `--danger-ink: var(--danger)`, both above their floors) with the color-mix upgrade gated behind `@supports`, so 105-110 gets legible ink instead of a silent drop and 111+ gets the better shade. The performer lane mirrors the pattern for its 08 hand-roll via double declaration. | 3.1, 7.13 |
| Tag-card heart | RESOLVED 2026-08-30, same day: no defect. The blank captures were a probe artifact - the hover reveal lives on an unclassed ancestor `<a>` at opacity 0, so the element computed visible and topmost while an ancestor kept it unpainted, and the black `fill` was the svg container's inert default (the path carries currentColor and the styled colour reaches it, both modes measured). The sweep still fixed something real: the revealed heart was white-on-white in light mode and is now legible. Method lesson recorded in 10.1. | 10.1 |
| Em dashes | RESOLVED 2026-08-28: 1,091 swept from the shipped source in one mechanical commit (853 in the stylesheets, 236 in refract.js comments, plus two that were live UI strings, one of them a latent crash: `createElement("...")` with the dash as a TAG NAME, saved only by sitting behind a hardcoded-false flag). Zero remain; the `Edit` string-matching trap is gone with them. | 6.21, 7.8 |
| Motion | Tokenized 2026-08-28 in three passes: the canonical five, then near-duplicates, then the 0.25 to 0.35s residue onto a new `--dur-settle` (shifts up to 14%, the one perceptible-in-principle fold; eyeball drawers and reveals). Remaining literals are deliberate: 0.08s micro-flashes and the player idle 1s fade. | 3.7 |
| Radius | 17 hand-written `999px`, plus 2px, 3px, 6px, 8px and 10px literals. 9px is removed from this row: where commented as concentric (inner = outer minus padding) it is computed, correct, and exempt per 3.4; uncommented 9px uses still need their derivation stated or a token. | 3.4 |
| Surfaces | RESOLVED 2026-08-28: the rogue `backdrop-filter` expressions folded to ladder rungs (the 16px saturate(1.1) pair sat behind 94 to 96 percent opaque fills, so the fold is invisible; 8px went to sm). Live shader count now equals the ladder: nine. | 3.2 |
| Z-index | Values run 0, 1 through 12, then 20, 30, 50, 90, 99, 100, 400, 1050, 1060, 1100, 9999, 10000, each chosen ad hoc. A band map now exists (3.8); nothing has migrated to it yet. | 3.8 |
| Light fill overrides | OPEN 2026-08-30: the fill flip landed (fc90e7b), was silently reverted in the deploy dir for a day by the surface-family deploy of 14_light from an unmerged branch (2026-08-30 to 08-31, the 7.13 sibling-file trap), and is live again since the d0f3d13 union merge, re-measured at all three scopes both modes. The 26 hand-rolled light fills (0.02 to 0.07 against ramp rungs 0.04 to 0.10) were deliberately NOT retired - each removal is a visible change wanting a per-surface measured look, and the selector-matching classifier is not trustworthy enough to bulk-delete on. Retire them surface by surface in measured windows. | 3.2 |
| Light surface family | EXECUTED 2026-08-30 (94bc238), measured both modes plus light-and-lite: surface channel flips to white, dark byte-identical, scrims mode-fixed via the new --scrim-rgb, --bg-0-rgb added. Remaining: the 17 near-white overrides retire per-surface (see the fill-overrides row for the same discipline), now redundant where their alpha matches the flipped channel. | 3.2 |
| Spacing | Gaps tokenized 2026-08-28. Padding/margins: histogram drawn 2026-08-30 (1,420 declarations, 69 distinct rem values forming a near-continuum from 0.1 to 1.5; heaviest: 0.5 at 96, 0.85 at 77, 0.4 at 69, 0.6 at 67, 0.7 at 58, 0.55 at 52). DRAFT scale, pending measurement: nine steps sharing the gap values where they coincide (0.25, 0.4, 0.5, 0.75, 1) plus padding-only steps near 0.15, 0.65, 0.85 and 1.25, fold bands capped at 0.075rem (about 1px); sub-7px pixel paddings and negative margins stay literal (optical and layout-special). Naming (unified --space-* vs parallel --pad-*) and every fold direction are stage-2 decisions, made against the live page. BLOCKED on the deploy dir until the scene lane finishes the fill flip; two lanes cannot measure concurrently. | 3.6 |
| Specificity | 8,268 `!important` declarations. Largely unavoidable against Bootstrap, but it means load order and class doubling are the only remaining levers. | 5.2 |

If a sub-`--fs-xs` step is genuinely needed, add it to the scale once rather
than writing `0.62rem` a sixth time.

**Not yet designed at all** (distinct from drift; these have no treatment to
follow yet):

- **Empty states.** No styled "no results" or first-run surface exists;
  Stash's defaults show through. An empty screen is an invitation to act, and
  currently it is nobody's.
- **Loading.** The player spinner is styled; list and grid loading is
  whatever Stash renders. No skeleton language exists, and inventing one is a
  brief-worthy decision, not a drive-by.
- **The gallery/image performer popover** is styled to text-names-only as a
  stopgap; true scene-card parity is a tracked TODO in `CLAUDE.md`.

---

## 10. Working method

### 10.1 Measure first, with the harness

`tools/measure` (gitignored, with its own README) is an auth proxy on :9998
forwarding to Stash on :9999 with the ApiKey attached, plus a headless-Chrome
CDP probe that evaluates an expression against the live page and screenshots
it. Run it before and after any panel or CSS change. Prerequisites: node 24 or
newer for the global WebSocket, Chrome, and Stash running on :9999. Start the
proxy with the Bash tool's `run_in_background`; `&` or `nohup` dies with the
shell and the next probe then silently measures a Chrome error page.

What reading the source missed and measuring found, all in one session:

- A scene description rendering 1,838px tall, pushing the tag list to y=2246
  inside an 890px panel, so everything below it was invisible. (Now law in
  6.4: free user text never sets a panel's height.)
- Collapsed cards stuck at 169px because `[data-perf-count="2"]` outranked the
  collapse rules. Height applied, width did not, from the same block.
- 119.81px of dead air from a `justify-content: space-between` inherited from
  outside Refract's own blocks.
- The Advanced Rating trigger rendering no number at all in its complete state,
  which made a "score pill" design wrong before it was drawn.

And in the session that folded the panel's type scale, all four of these,
none of which is visible in the source either:

- A comment asserting a fix that had not worked. The tab strip's 4px padding
  was documented as the cure for the seven-tab overflow; simulated, it had
  reduced that overflow from 38px to 17px and left Edit behind a scroll.
  **A comment is a claim, and an old claim is measurable.**
- Arithmetic predicting an overflow that could not happen. Raising the tab
  size looked like +4.9px of text against zero slack; measured, the six-tab
  case did not move at all, because `flex: 1 1 auto` had already stretched
  the items past max-content. Predicting a flex layout by adding up widths
  is guessing with extra steps.
- A rule that shipped, was correctly written, and matched nothing on screen:
  Stash hangs a `.badge` inside some tab labels that Refract had never
  selected, so it inherited Bootstrap's `font-size: 75%` and rendered at
  8.4px, a size arrived at by multiplication and belonging to no scale.
- A hierarchy inversion invisible to the eye but obvious to a sort. Ranking
  every element by chroma put the two disclosure links (162) above the
  studio eyebrow and the active tab (120), so the panel's quietest
  affordances were its loudest objects. **Rank a surface by saturation the
  way you rank it by size; P1 and P3 are both testable that way.**

None of those were visible in the CSS.

Two process rules the harness sessions earned:

- **Measure a fresh document.** A page that loaded before the edit measures
  the old CSS; two wrong conclusions in one session came from exactly this,
  including a fix declared failed that had worked. Reload, then measure.
- **A probe that returns nothing is broken until proven otherwise.**
  `cssRules` throws a SecurityError on a cross-origin sheet, so a try/catch
  around the scan LOOP rather than the single access kills the whole scan at
  the first foreign sheet: zero sheets, zero rules, no error. The same scan
  must recurse into grouping rules or every `@supports` and `@media` body is
  invisible. Both faults report absence, and absence reads as evidence - one
  cost a reported gap on a surface that was styled correctly. Calibration: a
  working scan of this app walks roughly 9,700 rules across 16 to 17 sheets;
  far below that is the instrument, not the finding.
- **A diff is not evidence of deletion in a file that is rewritten in
  place.** Several lanes renumber, reword and fold this file's paragraphs
  constantly, and a line diff calls every one of those a deletion: two lanes
  reported nine losses from diffs in one day and eight were imaginary (the
  ninth was 7.18). Verify a passage still exists by searching the FLATTENED
  current file for two or three independent markers from inside it - never
  from a diff, and never with a pattern that could span a line break.
- **A blank capture with clean computed values means an ancestor.**
  `opacity` on an ancestor appears in none of the element's own numbers: the
  element computes visible, non-zero, unclipped, and `elementsFromPoint`
  still reports it topmost, while it paints nothing. When a capture comes
  back blank and every property says it should not, walk the ancestor chain
  for opacity before touching anything else. Four captures and two wrong
  conclusions were spent learning this on the tag-card heart.
- **Measure a deployed, committed build.** The harness measures whatever is
  in the plugin directory, not what is in your tree, and with parallel lanes
  that directory can hold a hybrid (one lane's CSS over another's JS). A
  hybrid measures perfectly plausibly while rules keyed on JS-added classes
  match nothing (section 7 rule 12). Before measuring: re-deploy your own
  build, from a committed tree, so the numbers are attributable to a hash.
- **Re-laying out a surface means hunting its old rules first.** In a
  numbered cascade, stale rules for the superseded layout in a
  higher-numbered file do not error; they win. A morning's row-layout rules
  overrode the afternoon's grid from a later file, and the change "would not
  take" through several edits. Before re-laying out a surface, grep every
  numbered file for that surface's selectors and delete what the new layout
  supersedes.

### 10.2 The brief format

Refract's design work runs through briefs, and the format has earned its keep.
A brief that changes a surface has ten sections:

1. **What this is.** Written for someone who has never seen Stash.
2. **The job.** What is in scope, in one paragraph, including whether
   rearranging or removing elements is allowed.
3. **What it is today, measured.** Real numbers off the live instance:
   dimensions, element counts, font size and weight pairs, percentages of the
   available space. This section does most of the work.
4. **The worst part, specifically.** Name it, and say why.
5. **Data available, free.** What is already in the DOM or one GraphQL field
   away, so directions can be ambitious without inventing plumbing. Confirm
   against returned data, not the schema: a field existing in the type is not
   the same as a live query returning it filled. One mockup showed a count
   the type does not carry at all, and the substitute field existed but came
   back empty for every result tested.
6. **Hard constraints.** Only things that have actually caused a bug.
7. **Settled, not open.** So a direction does not spend itself on ground that
   is already decided.
8. **Candidate directions.** Explicitly observations, not a specification. A
   better idea covering the same ground is the preferred outcome.
9. **What good looks like.** Testable statements, not adjectives.
10. **Deliverable.** Which files, and what evidence of before and after.

### 10.3 Review checklist

Before a design ships:

- [ ] Reads correctly in all eight accents, and depends on none of them.
- [ ] Reads correctly in light mode, checked as a CONTRAST NUMBER against
      the surface behind it and across all seven presets, not by eye. Light
      mode cannot be measured by toggling the body class from a probe: the
      class is mirrored to Stash's server-side UI config and re-read at
      boot, and toggling it leaves some elements reporting the colour from
      the previous style pass while their own tokens report the new one.
      Compute from the token values, or have the mode genuinely on.
- [ ] Readable in lite mode, with no low-alpha surface left unpinned.
- [ ] Defined behaviour under `prefers-reduced-motion` and
      `prefers-reduced-transparency`.
- [ ] Survives at the stacked or narrow width, not just the design width, and
      on phones coexists with the bottom dock rather than fighting it.
- [ ] Focus is visible on every interactive element, using the house ring
      (6.6), not the browser default and not nothing. Count the controls and
      count the rings: the scene panel had 39 controls, 251 rules in the
      document mentioning `:focus`, and not one of them matching. Where a
      surface sets `box-shadow: none !important` on its controls, 6.6's
      shadow ring cannot work and the ring has to be an `outline`.
      **Measuring this needs the harness set up for it**: a headless page is
      not focused, so `.focus()` does nothing and nothing matches `:focus`,
      which is indistinguishable from a missing style; and Chrome only
      matches `:focus-visible` after the page has seen a real keyboard
      event. `probe.js` enables focus emulation always and presses Tab under
      `PROBE_KEYBOARD=1`.
- [ ] Survives every third-party plugin element being absent.
- [ ] No React node relocated; every click still lands on Stash's element.
- [ ] Every size comes from the type scale, and the surface has six or seven
      size/weight pairs, not twenty.
- [ ] Every blur comes from the ladder; no new `backdrop-filter` expression.
- [ ] Every shadow comes from a token, so light mode flips for free.
- [ ] No `filter: drop-shadow` on a repeated element.
- [ ] Nothing Stash could do before has become impossible.
- [ ] Rows centred on cap height, checked in rendered pixels rather than by
      `getBoundingClientRect` alone.
- [ ] **The computed style matches the intent, not just that the rule
      shipped.** A correct rule that lost the cascade (specificity, source
      order, an attribute selector outranking it) is indistinguishable from no
      rule, and three of four failures in one measured session were exactly
      this. Check `getComputedStyle` or the harness, per property changed.
- [ ] Before and after measured on the live instance with the harness, with
      screenshots, from a freshly loaded document.
- [ ] If the change touched the canvas artboards:
      `node design-system/lint.mjs` passes. The bible is measured against its
      own laws by tool, not by eye.
