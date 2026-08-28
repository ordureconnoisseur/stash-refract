# Refract Design System

The governing document for how Refract looks and behaves. Everything else
(`DESIGN_BRIEF_*.md`, the CSS, the design canvases) is downstream of this.

Precedence: this file wins on foundations (colour, type, surface, depth,
motion, modes). A design brief wins on the surface it covers, and when a brief
settles something it gets folded back here. `CLAUDE.md` wins on process
(shipping, deploy, editing traps). Where two disagree and neither is obviously
newer, measured evidence wins over both.

Every number here was read out of the shipped CSS or JS, not invented.

There is a visual companion: nine artboards covering the thesis, colour, type,
surfaces, depth, motion, the rating tiers, the modes and the drift ledger.
Sources are in `design-system/` as `.dc.html` files plus `canvas.json`; re-seed
with the design canvas helper after editing them. It is a view of this file, not
a second source of truth.

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
```

Presets swap the four on `body.stash-liquid-glass.refract-<name>`: blue, pink,
red, yellow, purple, green, teal. Everything else resolves through them.

**Rules**

1. Never write a raw accent hex outside the preset block. Use
   `rgba(var(--accent-rgb), N)` so custom-CSS overrides and light mode both
   keep working.
2. The tier palette (section 4) is the only second colour system permitted. It
   is allowed to override the accent, because it is encoding data.
3. Semantic colour (error red, success green) is Bootstrap's and stays
   Bootstrap's. Do not add a third palette.

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

**Blur is a fixed ladder, not a free parameter.** Eleven tokens: six plain
(`xs` 6px, `sm` 10px, `md` 14px, `lg` 20px, `xl` 24px, `2xl` 32px) and five
saturating variants at `saturate(140%)`. On Windows Chromium every distinct
`backdrop-filter` expression compiles its own HLSL shader; consolidating from
22 expressions down to 11 tokens capped the shader count and stopped recompile
churn on home-page navigation.

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
| `--fs-xl` | 2.0 | 28 | page title |

**Rules**

1. Reach for a step. Do not invent an eighth. The scale exists because the
   performer header once rendered twelve distinct sizes, three of which sat
   within half a pixel of each other while claiming to be different levels.
2. **A surface gets six or seven size/weight pairs, not twenty.** The scene
   detail panel measured 20 pairs in a 338px column, with 10.08px doing six
   different jobs across three weights. When one size carries 119 elements it
   has stopped being a level in a hierarchy and become the default. That is the
   diagnostic: if a size is doing more than two jobs, the surface has no
   hierarchy.
3. Hierarchy is size *and* weight *and* colour together. Muted text at the same
   size is a level. Three weights at the same size is not.
4. **Centre on cap height, and let descenders hang.** `getBoundingClientRect`
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

**Spacing has no scale yet** (see the drift ledger). The de-facto rhythm in
the shipped CSS: `0.3` to `0.55rem` for gaps inside a control cluster,
`0.75` to `1rem` between clusters, with `0.5rem` the most common single value.
Until a scale exists, match the neighbouring cluster rather than inventing a
new gap.

### 3.7 Motion

The de-facto scale, measured across all sheets:

| Duration | Uses | Job |
|---|---|---|
| 0.12s | 28 | instant feedback: press, check |
| **0.15s** | **373** | the default: hover, colour, opacity, border |
| 0.18s | 106 | transforms, small movement |
| 0.22s | 39 | panel and popover entrances |
| 0.35 to 0.4s | 12 | large surfaces: drawer, flip, modal |

Easing: plain `ease` for state change (287 uses).
`cubic-bezier(0.4, 0, 0.2, 1)` for movement with a defined start and end.
`cubic-bezier(0.34, 1.2, 0.64, 1)` and its stiffer sibling
`cubic-bezier(0.34, 1.56, 0.64, 1)` for entrances that should feel physical.
Overshoot is for things arriving, never for things leaving.

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

Two standing rules already earned by bugs: the tier ladder must stay isolated
inside its grid row (its 20 to 70 would otherwise fight the pagination's 400
through a transformed ancestor), and tier cards get no `isolation` or
`will-change`, because promoting each card to its own compositor layer makes
Chrome sometimes paint them out of z-order.

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

Destructive actions live in a menu, not in a row of peers. A counter that
happens to be clickable is a readout, not a button, and must not dress like
one.

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
| danger | `rgba(217,45,32,0.22)` | `rgba(217,45,32,0.5)` |
| warning | `rgba(232,121,43,0.2)` | `rgba(232,121,43,0.45)` |

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
`--fs-xs`, weight 600 to 700, uppercase, tracked. Tracking has a de-facto
ladder: `0.04em` for tight labels, `0.06` to `0.08em` for standard eyebrows,
`0.1` to `0.14em` for wide display labels; body text sits at the global
`0.005em` and never gets tracked wider. 64 uppercase uses follow this pattern
today.

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
- Light mode shipped in v1.11.0, and lite still loads last.
- `scroll-perf` is gone and is not coming back.
- The B5 toggle desync stays unfixed. It is cosmetic.

---

## 9. Known drift

An honest ledger. None of these are emergencies. All of them are places the
system is not being followed, and each is a cheap win for whoever is already in
that file.

| Area | State | Rule |
|---|---|---|
| Type | 301 uses of `var(--fs-*)` against 99 literal sizes, so 75% adoption. The literals cluster at 0.74, 0.66, 0.62, 0.6 and 0.58rem, which is a sub-`--fs-xs` tier the scale does not have. | 3.5 |
| Type, second ladder | `07_scene_details.css` declares a six-step panel-local scale (`--sp-title` 21, `--sp-value` 15, `--sp-body` 13, `--sp-chip` 11.5, `--sp-tab` 11, `--sp-label` 10) used 15+ times alongside `var(--fs-*)` in the same file. Ruling: four of its steps are sub-third-of-a-pixel restatements of global tokens (13 vs 12.88, 11.5 vs 11.2, 11 vs 11.2, 10 vs 10.08), and two of its own steps sit 0.5px apart, the exact 3.5 rule 1 failure. Those four alias to `--fs-md`, `--fs-sm`, `--fs-sm`, `--fs-xs` when the panel work lands. The other two are real: 21px exposes a genuine hole between `--fs-lg` (17.5) and `--fs-xl` (28), and 15px a plausible emphasis step above body. If the panel design holds, promote those two to the global scale rather than keeping a parallel ladder. | 3.5 |
| Motion | Not tokenized at all. 0.15s appears 373 times as a literal. There is no `--dur-*` or `--ease-*`. | 3.7 |
| Radius | 17 hand-written `999px`, plus 2px, 3px, 6px, 8px and 10px literals. 9px is removed from this row: where commented as concentric (inner = outer minus padding) it is computed, correct, and exempt per 3.4; uncommented 9px uses still need their derivation stated or a token. | 3.4 |
| Surfaces | Four `backdrop-filter` expressions still bypass the ladder, including `blur(16px) saturate(1.1)`. | 3.2 |
| Z-index | Values run 0, 1 through 12, then 20, 30, 50, 90, 99, 100, 400, 1050, 1060, 1100, 9999, 10000, each chosen ad hoc. A band map now exists (3.8); nothing has migrated to it yet. | 3.8 |
| Spacing | No scale. Gaps cluster at 0.3, 0.35, 0.4, 0.5, 0.55, 0.75, 0.85 and 1rem, chosen by eye per cluster. | 3.6 |
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

None of those were visible in the CSS.

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
   away, so directions can be ambitious without inventing plumbing.
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
- [ ] Reads correctly in light mode.
- [ ] Readable in lite mode, with no low-alpha surface left unpinned.
- [ ] Defined behaviour under `prefers-reduced-motion` and
      `prefers-reduced-transparency`.
- [ ] Survives at the stacked or narrow width, not just the design width, and
      on phones coexists with the bottom dock rather than fighting it.
- [ ] Focus is visible on every interactive element, using the house ring
      (6.6), not the browser default and not nothing.
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
      screenshots.
