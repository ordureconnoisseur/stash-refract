# Refract cohesion audit, deploy of 2026-09-03 (measured overnight into 09-04)

Read-only. Everything below was measured on the live Stash behind the :9998
auth proxy with `tools/measure/probe.js`: viewport asserted on every run,
dark pinned with a "0" copy of pre-light.js (`pre-dark.js`), light via
pre-light.js, lite via pre-lite.js, all with the config write swallowed. No
run printed a WAIT warning. Screenshots, per-run JSON, expressions, the
compiled `inventory.json` and `boxes-measured.json` sit beside this file;
`out/` holds the raw runs, `sheet-*.png` and `cmp-*.png` are the contact
sheets the visual judgement was made from.

## 1. What was measured

`DEPLOYED_FROM.txt` last line: **8092e57** (ascension-reconcile, "final
reconciliation": merge of entity-pages 7b7898b, mobile-overhaul d77723c,
scene-panel-d). Verified myself: refract.js, css/01, 05, 07, 08, 09, 11, 12,
13, 14, 15 and 18 in `.stash/plugins/refract` equal `git show
8092e57:<file>` after `tr -d '\r'`, 12 of 12. Every number here is
attributable to that hash.

Surfaces walked: desktop 1600x1000 and phone 390x844, dark and light, lite
on home, the scene page and the performer page (and light-plus-lite on
home). Home, /performers, performer 1732 (view and edit), 265 (gold,
Ascension) and 786 (PERFECT), scene 2578 with the details panel and the
rating drawer open, /scenes, studio 347, tag 23, group 1, Settings >
Interface > Refract with the customiser open, the phone More sheet and sort
sheet, phone performer, scene, studio, tag and settings. The scrape results
dialog cannot be opened headlessly and was read from the user's screenshot
(`E:\Pictures\Screenshots\Screenshot 2026-09-03 223206.png`).

Lane attribution is by `git log 8092e57 -- <file>`: 07 and 09 = scene lane;
08, 18, 03, 16 = performer lane (entity-pages); 12 = mobile lane; 13 =
ascension lane; 11 (the customiser, last design commit 2026-08-20, then the
08-28 tokenisation sweep) and the 04/05 base = pre-lane work inherited by
the foundations keeper; 06 = the settled player.

Method: `inv.js` walks every rendered element and buckets font
size/weight/tracking/case/colour pairs, radius per control class, every
element with a `backdrop-filter`, shadows, transitions, gaps, SVG sizes;
`focus.js` focuses each control under PROBE_KEYBOARD=1 and diffs the
computed outline, box-shadow, border and fill; `boxes.js` returns the box
and computed style of named elements, and `crops.py` samples the rendered
ground inside each box from the screenshot and composites the computed ink
onto it for the contrast numbers.

## 2. Verdict

It is one design at the level a user sees first. One typeface (plus the
deliberate Concert One on the playing-card name banner and nowhere else),
one accent system that flips cleanly through light mode on every surface
walked, one card, one glass recipe on the navbar, cards, list toolbar, pager
and now the phone dock and sheets, the tier palette as the only second
colour system, one motion family, one stroke-icon family for Refract's own
chrome. Light mode reads as the same product as dark everywhere, and lite
degrades the same way everywhere except two leftovers.

Where it splits is one level down, in the state and control vocabulary, and
it splits along lane lines. Each lane built its own focus ring (alphas 0.28,
0.70, 0.90 and solid, against a house ring of 0.15 that the buttons cannot
show), its own eyebrow (eight size/weight/tracking specs), its own chip
(five fills, three rims, four weights), its own segmented-control anatomy
(free tabs; a 12px well with 9px items; an 8px black well with 6px items)
and its own dark plate colour (four rgb families beside the two the bible
allows). Each lane is internally consistent, so the seams appear exactly
where a user crosses a lane boundary: performer page to scene page (chips,
tabs, focus, plate, title letterfit), any page to Settings (radii 6/7/8/10,
0.16em heads, black wells), desktop to phone (a 44px world laid over 28 to
38px controls on the same screen), and any Refract surface to the untouched
Stash-shaped ones (studio and tag heads with no focus ring at all; the
scrape dialog with red and green rails and opaque greys). None of this is a
different direction. It is four readings of the same bible where the bible
gave a range instead of a number, plus two surfaces the bible never
reached.

## 3. Divergences, ranked by visibility to someone moving between pages

### D1. Six focus treatments, two surfaces with none

Measured per control with `:focus-visible` confirmed matching
(`out/f-*.json`).

| Surface (lane) | Controls | Ring measured |
|---|---|---|
| Scene panel, drawer open (scene, 07) | 44 | `outline 2px solid rgba(accent,0.90)` offset 2 (stars offset 1). 44 of 44. |
| Performer band (performer, 18/08) | 19 | `outline 2px solid rgba(accent,0.28)` offset 2, plus a fill step 0.06 to 0.07 on secondary buttons. 18 of 19; the StashDB link falls to the UA ring `1px auto rgb(16,16,16)`. |
| Phone sort sheet and More sheet (mobile, 12) | 12 + 10 | `outline 2px solid rgba(accent,0.70)` offset **-2** (inset). All. |
| Card customiser (11) | 59 | `outline 2px solid rgb(192,132,252)` (solid accent-bright) offset 2, hit regions offset -2. 22; the 8 accent swatches and the Lite switch get the UA ring; 6 switches are not focusable at all. |
| List toolbar and cards (04/09/03 base) | 70 | Search input: the 6.6 box-shadow ring (caught mid-transition at 0.04). 12 toolbar buttons: **no visible change** (outline 0, ink unchanged). 45 card links, view buttons and favourite hearts: UA ring. |
| Studio head (08, untouched) | 13 | **Nothing.** Outline 0 on every control, the five stars change nothing, and the organised button shows Stash's own Bootstrap ring `0 0 0 2.8px rgba(87,102,114,0.5)`, an unthemed blue-grey. |

Bible: 6.6 names one house ring (`box-shadow 0 0 0 2px rgba(accent,0.15)`);
10.3 says count the controls and count the rings; 3.9 puts non-text state
at 3:1. Polish-review-2 F4 measured the 0.28 outline at 1.41:1 dark and
1.31:1 light. Every lane wrote an outline because 09 kills box-shadow on
buttons, and every lane chose its own alpha.

Unification: a new ruling, not a winner. The ring must be an outline (the
box-shadow ring cannot survive `box-shadow: none !important`), and it must
clear 3:1 on the darkest ground it sits on, which rules out 0.15 and 0.28.
Proposed: `outline: 2px solid var(--accent-bright)` (the customiser's value;
`--accent-ink` in light) with `outline-offset: 2px` on free-standing
controls and `-2px` only inside a scrolling container (the sheet's reason).
Defined once in 09_buttons on `:focus-visible` for `.btn, button, a[href],
input, select, [tabindex]` under `body.stash-liquid-glass`; the four lane
copies go; the studio and tag heads and the list toolbar inherit it.

### D2. Segmented controls and tab strips: three anatomies

| Control (lane) | Well | Active item | Type | Height |
|---|---|---|---|---|
| Entity tabs, performer/studio/tag/group (08) | none, on a hairline | 12px, accent tint 0.12, rim 0.28, glow `0 0 14px accent 0.35` + inset ring | 12.25 / 400 / +0.015em | 35.8 |
| Scene panel tabs (07) | 12px, fill 0.03, rim 0.08 | 9px (commented concentric 12 minus 3), same tint/rim/glow | 11.2 / **600** / 0 | 28.8 in 36.8 |
| Scene toolbar (07) | pill, fill 0.04, rim 0.08 | | | 34.5 |
| Phone sort-sheet segments (12) | 12px, `--fill-2`, rim 0.12 | 9px, tint 0.12, **solid `rgb(192,132,252)` rim** | 12.25 / 600 | 28 in 36 |
| Customiser kind toggle (11) | **8px**, `rgba(0,0,0,0.30)` black, no rim | **6px**, tint 0.20, rim 0.42 | 10.08 / 600 | 27.1 in 33.1 |
| Customiser Plain/Shuffle buttons (11) | | 7px, transparent, rim 0.12 | 10.08 / 500 | 27.1 |
| Settings nav pills (04) | 16px card | 12px, tint 0.12, rim 0.28 | 14 / 400 | 37 |

The scene lane's 9px is ruled and commented (07:3125: "same token, two
geometries, do not fix to 12"), so the radius is not the drift. What
diverges: the scene and mobile strips sit in a well and the entity strip
does not; 600 against 400; 0 against 0.015em; 28.8 against 35.8 tall; the
mobile active rim is a solid accent-bright line where every other active
state in the theme is `--accent-glow` 0.28; and the customiser is off every
token. One click from a performer page to its studio's page shows two tab
strips 7px apart in height and 200 apart in weight.

Unification: the well-with-concentric-items anatomy (scene and mobile
agree, independently) wins for choosers inside a panel; the entity strip
stays free-standing (6.23's door into a panel) but the two strips take one
type pair, ruled: 600/0 (scene, matches every other control label) or
400/0.015em (entity). Active rim is `--accent-glow` everywhere; the mobile
solid rim goes. The customiser takes the sort sheet's anatomy exactly
(`--radius-sm` well at `--fill-2`, 9px items).

### D3. The eyebrow is eight specs

All uppercase; measured size / weight / tracking (light identical):

| Spec | Where (lane) |
|---|---|
| 10.08 / 600 / 0.06em | edit head "EDITING", crop label (performer) |
| 10.08 / 600 / 0.08em | band tile labels, standing labels, edit section labels (accent), Ascension keys, phone sheet group labels (performer, ascension, mobile) |
| 10.08 / 700 / 0.06em | scene studio eyebrow "PORN WORLD" (scene) |
| 10.08 / 700 / 0.08em | scene tier chip "UNRATED", "SCORE BREAKDOWN" (scene, adv-rating theming) |
| 10.08 / 600 / **0.16em** | customiser group heads "SCENE CARD", "BOTH CARDS" (11:2674, a literal past `--track-display`) |
| 11.2 / 600 / 0.10em | settings section title "REFRACT" (11) |
| 11.2 / 700 / 0.10em | desktop home section heads "RECENTLY RELEASED SCENES" (08:4564, `--track-wide`) |
| ~12 / 700 / ~0.10em | scrape dialog "EXISTING / SCRAPED / PERFORMERS" (08 old block; from the screenshot) |

And the same home section head is an eyebrow on desktop (11.2/700/0.10em
muted) and a title on the phone (17.5/600 sentence case, `--text`): the
page changes its own hierarchy language at 600px.

Bible 6.13: `--fs-xs`, weight 600 to 700, tracked from the ladder. It gives
a range, so every lane picked a point in it. Good news inside the band: it
is now one spec (tile labels measure 600 / 0.81px like the standing
labels), so polish-review F9 and the ledger row "Type, band labels" are
closed at this hash.

Unification: one pair. `--fs-xs` / 600 / `--track-eyebrow` (0.08em) /
`--text-muted`, accent allowed only where the label is also a section rule
(the edit form's pattern). That is already the majority (performer,
ascension, mobile). Scene folds 700 to 600 on the studio eyebrow (the tier
chip is a control label and may keep 700); the customiser's 0.16em and the
settings title's `--fs-sm` fold down; the desktop home heads take either the
eyebrow or, better, the phone's title treatment at every width.

### D4. Chips and pills: one silhouette, five recipes

Every resting chip measured (all `--radius-pill`, which is the cohesive
part; contrast is computed ink over the median rendered ground inside the
box, `boxes-measured.json`):

| Chip (lane) | Height | Fill | Rim | Type | Blur | Ink contrast |
|---|---|---|---|---|---|---|
| Scene tag chip (scene) | 25.7 | 0.08 `--fill-4` | 0.14 literal | 11.2 / 600 at 0.88 | none | 9.6 desktop, 13.0 phone |
| Band alias chip (performer) | 24.2 | 0.08 `--fill-4` | **0.22 `--glass-border-bright`, at rest** | 11.2 / 400 at 0.92 | none | 9.9 to 11.7 on the veil |
| Band StashDB endpoint pill (performer) | 18.6 | 0.06 `--glass-bg` | 0.12 | 10.08 / 500 | blur 10 | 14.5 |
| Scene tier chip (scene) | 22 | 0.05 `--fill-3` | 0.12 | 10.08 / 700 UP at 0.42 | none | label ink 0.42 (polish rows measured 3.0 plus) |
| Advanced-rating pill, band and scene (13) | 26 | accent 0.12 | accent 0.28 | 11.2 / 700 | none | 10.6 to 12.0 |
| Studio o-counter (08 old) | 23 | 0.10 `--glass-bg-strong` | 0.12 | 11.2 / 600 | blur 14 + `--shadow-sm` + white halo | 8.3 |
| List summary pill "1-40 of N" (04) | 21.6 | 0.04 `--fill-2` | 0.12 | 11.2 / 400 at 0.55 | blur 10 | 6.2 |
| Card tag-count pill (03) | 15.7 | accent 0.12 | accent 0.28 | 10.08 / 600 | none | |
| Phone pager page pill (mobile) | 44 | 0.04 `--fill-2` | 0.12 | 12.88 / 600 | none | |
| Tab count badge (08) | 15.7 | 0.08 | 0.12, radius **140px** | 10.08 / 700 | none | |
| Ascension match chip (13) | 27.5 | 0.04 | state colour 0.45 | mixed | none | |
| Scrape dialog chips (08 old, screenshot) | 24 | **opaque #3b3b3b** | none | 12.25 | none | |

Bible 6.7: pill, `--fs-sm`, glass fill, hairline rim. Five fills, three rims,
four weights, blur on three chip kinds against 6.5's "never blur the many
small ones". The alias chip wearing the hover rim at rest is the one a user
sees 60px from the scene panel's chips on a performer-to-scene click.

Unification: 6.7 gets numbers. Readout chip: `--fill-3` / `--glass-border` /
`--fs-sm` 500 / no blur / 24px tall (scene and alias meet in the middle:
the alias rim drops to 0.12, the scene rim to the token). Control chip
(mutates something: tier chip, adv pill, filter chips): accent tint 0.12 +
`--accent-glow` rim, which is what the adv pill and card counters already
do. Blur comes off the o-counter, the endpoint pill and the summary pill.

### D5. Dark plates: four colour families where the bible allows two

| Plate | Measured | Blur | Lane / file |
|---|---|---|---|
| Phone dock, sheets, slick arrows, stuck toolbar | `rgba(20,20,24, 0.72 / 0.92)` = `--surface-rgb` | xl-sat | mobile (12), conformant |
| Performer band data plate | `rgba(14,13,16, 0.74)` | none (over the blurred portrait) | performer (08, 18; 13 copies it) |
| Edit head plate | `rgba(14,13,16, 0.92)` | md | performer (08) |
| Player bar, scrubber wrapper | `rgba(10,10,12, 0.55)` | md | 06 |
| Scrubber time chips | `rgba(12,12,14, 0.85)` | sm | 06 |
| Volume panel | `rgba(12,12,14, 0.78)` | md | 06 |
| Overlay play buttons | `rgba(15,15,18, 0.55)` | md | 06 |
| Card flip button | `rgba(10,10,12, 0.62)` | sm | 16 |
| Playing-card back | `rgba(20,22,28, 0.92)` | | 03/16 |
| Customiser kind well | `rgba(0,0,0,0.30)`; light `rgba(20,22,34, 0.08)` | | 11 |
| Scrape dialog | opaque `#151515` / `#262626` / `#3b3b3b` | | 08 old |

Bible 3.2: two sanctioned surface colours. The source carries 29 literal
near-black rgba families across nine files. The tints are a few RGB points
apart; the alphas (0.55, 0.62, 0.72, 0.74, 0.78, 0.85, 0.92) are what read as
different rooms when the band's 0.74 plate shares a phone screen with the
0.72 dock and the 0.92 sheet. In light mode the performer lane hand-writes
`rgba(252,252,252,0.9 / 0.92)` where the mobile lane's plates flip through
the channel for free.

Unification: the mobile lane's usage is the reference. The band and edit
plates move to `rgba(var(--surface-rgb), A)` at their current alphas (14,13,16
to 20,20,24 is invisible under a portrait); the player family (06) is
section-8 settled and gets a dated ledger exemption instead.

### D6. Phone: a 44px world laid over 28 to 38px controls

On /performers/265 at 390 in one scroll: dock slots 56, toolbar controls 44,
pager 44, sheet rows 48 and 44 (mobile lane, all on the 44 floor) beside
band action buttons 38.5 in three rows, entity tabs 35.8, adv-rating pill
26, alias chips 24.2, favourite and link buttons 38.5, stars 17.5x21
(performer lane). On /scenes/2578 the scene tabs are 28.8 in a 36.8 strip
and the toolbar icons are 22 (scene lane). The mobile lane logged these as
P-08-1..4 and P-07-1..4 and built none, per its coordination note.

Also on the phone: performer, studio and tag heads centre their identity
(name, card, aliases, buttons, standing row), but the scene head is left
(eyebrow, title, date, toolbar, tabs, description). The ruling "identity
centres, data does not" reached 08 and 12 and not 07.

Unification: the mobile lane's proposals are the unification and are
already written; they belong to 08 and 07. The bible needs one sentence on
whether the scene head is identity (or whether the player above it is).

### D7. Settings and the customiser are an older theme

The surface a user opens to configure Refract is the least Refract-shaped:
settings card radius 12 where every other panel is 16; details box 8; tiles
10; buttons 6 and 7; `code` chip 10; a black `rgba(0,0,0,0.30)` well in dark
and a third channel `rgba(20,22,34,A)` in light (neither `--fg-rgb` nor
`--surface-rgb`); group heads at 0.16em; the sub-heading line at `--fs-sm`
400 muted on 48 elements; swatches with their own `0 2px 8px rgba(0,0,0,0.4)`
shadow, identical in light; and the settings card at blur `sm` where its
sibling nav-pills card is at `xl`. The card preview inside it is perfect
because it is a real card. Lane: none; it predates the lanes and the
tokenisation sweep kept its literals.

Unification: a customiser pass against the phone sheet, its nearest
relative (rows, group eyebrows, 12/9 segments, 16px surface).

### D8. Invented shadows that do not flip

Hand-written `box-shadow` measured identical in dark and light: scene panel
`0 8px 32px rgba(0,0,0,0.35)` + accent 60px halo (07:19, :524, :2071; and
06:67 on the video wrapper), scrubber wrapper `0 6px 24px 0.35` + halo,
overlay buttons `0 4px 18px 0.45`, volume panel `0 8px 24px 0.5`, customiser
swatches `0 2px 8px 0.4`. On the light scene page the panel is the one
surface carrying a 0.35 black drop under a 0.70 white fill while the navbar
beside it carries the token's 0.08. (The band tiles' hairline-by-shadow does
flip: 0.12 white to 0.08 black; fine.)

Unification: 3.3 as written; compose from `var(--shadow-lg)` plus the halo
layer. Ledger the player family as the section-8 exemption if it keeps its
depth.

### D9. Display letterfit has two signs, and flips between view and edit

Performer name in view: 28/600 at **-0.02em** (08:7556). The same name in
edit mode: 28/600 at **+0.02em** (the older h2 rule, 08:6916), so clicking
Edit changes the name's letterfit. Studio, tag and group names: +0.02em.
Scene title 21/700 at -0.015em; standing values 21/600 at -0.02em; settings
h3 17.5/600 at +0.02em; sheet titles 17.5/600 at -0.005em. Bible 3.5 lets
micro letterfit stay literal but does not fix the sign.

Unification: rule negative at `--fs-xl` and up (-0.02em), zero at `--fs-lg`
and below; fold the edit head, the studio/tag/group heads and the settings
h3.

### D10. Lite leaves two things blurred

Under `refract-lite`: the playing-card stat pills keep `blur(6px)` (16; four
per card on 40 to 270 cards, the exact GPU cost lite exists to remove) and
the list toolbar's sort dropdown keeps `blur(14px)` (04/09). Everything else
measured `none`: band pinned `rgb(17,17,17)`, dock `rgb(35,35,35)`, scene
panel, navbar. Not a lane divergence; a bible claim ("kills backdrop-filter
everywhere") that measures false in two places.

### D11. Empty, failed, resolving: two placeholder languages

Not designed, as section 9 admits, but the defaults that show through
disagree: a performer without an image is a solid **accent-filled**
silhouette (home row, /performers), the most saturated object in its row
(P1, louder than the PERFECT card beside it); a scene without a cover is a
white play glyph in a circle; a group with no scenes is "0-0 of 0" with no
sentence; a zero-result list on the phone renders nothing at all.

### D12. The scrape results dialog (from the screenshot)

Opaque `#151515` modal, `#262626` tiles, `#3b3b3b` chips, 44px red and green
rails, a solid accent Apply, uppercase 0.1em labels at 12px, a 22% label
column. It shares only its header with the line-up that precedes it. The
scrape lane's brief names all of this and its board B is the fix; nothing
is built. It is the most off-theme thing a user can reach, ranked here only
because it is one dialog behind one action.

## 4. Inventory

### 4.1 Type pairs per surface (size/weight pairs; distinct sizes; card overlays and heart particles excluded)

| Surface | Pairs | Sizes | Sizes in use |
|---|---|---|---|
| Scene page, panel + drawer (07) | 9 | 4 | 10.08, 11.2, 12.88, 21 |
| Performer band 1732 (08/18) | 16 | 10 | 10.08, 10.22, 11.2, 12.25, 12.88, 14, 17.25, 17.5, 21, 28 (four of these are the page card's) |
| Performer band 265 / 786 | 17 / 16 | 9 | as above without the empty-rating size |
| Performer edit (08) | 12 | 5 | 10.08, 11.2, 12.25, 14, 28 |
| Studio / tag page (08 old) | 11 / 12 | 6 | 10.08, 10.22, 11.2, 12.25, 14, 28 |
| Group page | 5 | 4 | 11.2, 12.25, 14, 28 |
| Home (03/08) | 10 | 7 | 10.08, 10.22, 11.2, 13.09, 14, 15.4, 17.5 |
| /performers grid (16) | 6 | 5 | 10.08, 11.2, 13.3, 14, 17.5 (Concert One at 17.5 / 15.4 / 13.3 / 11.9 / 10.5 / 9.8, scaling with card width) |
| /scenes list (03/04) | 8 | 5 | 8.12 (filter badge, Bootstrap 75%), 10.08, 10.22, 11.2, 14 |
| Settings + customiser (11) | 12 | 6 | 9.8 (`code`), 10.08, 10.22, 11.2, 14, 17.5 |
| Phone More / sort sheets (12) | 5 own pairs | 5 | 17.5/600, 14/600, 14/500, 12.25/600, 10.08/600; all on the ladder |
| Phone performer page | 18 | 9 | band + mobile chrome |

Off-ladder sizes: 10.22 (scene card date, 0.73rem), the playing-card banner
sizes (by design), 9.8 (`code`), 8.12 (filter badge), 17.25 (page card stat
value). The scene panel is the tightest surface (4 sizes, 9 pairs); the band
the widest. Emphasis weight: 600 (performer, mobile, customiser), 700 (scene
title, tier chip, tag counts, desktop home heads), 900 (card overlays,
Ascension badge): three emphasis weights across four lanes.

### 4.2 Radius per control class

| Class | Bible | Measured |
|---|---|---|
| Panels, cards, navbar | 16 | 16 everywhere except settings card **12**, customiser details **8**, customiser tiles **10**, More-sheet icon tiles **10** |
| Buttons | 12 | 12 (navbar, entity actions, edit plate, form); pill on adv-rating and tier chip; **6 / 7** customiser; 22px halves on the phone toolbar pill; 44px circles on the phone pager; flip button 11/0/0/11 |
| Inputs | 12 | 12 desktop; **pill** phone search; 12/0/0/12 string-list seams (correct) |
| Tabs | 12 (6.23) | 12 entity; 9 scene (ruled concentric); 9 phone segments (concentric, uncommented at 12_mobile:2188); **6** customiser |
| Chips | pill | pill everywhere; tab badge **140px**; scrubber time chips **6**; Stash-ID inner segment **3.5**; `code` chip 10 |
| Wells | | scene toolbar pill; scene tabs 12; sort segments 12; customiser kind **8** |

### 4.3 Materials per panel (dark; light in brackets)

| Panel | Fill | Rim | Blur | Shadow |
|---|---|---|---|---|
| Navbar | `--glass-bg` 0.06 (0.55) | 0.12 (0.10) | xl 24 | `--shadow-navbar` |
| Settings card | 0.06 (0.55) | 0.12 | **sm 10** | `--shadow-md` |
| Settings nav pills | 0.06 | 0.12 | xl 24 | `--shadow-lg` |
| Scene panel | `--glass-bg-strong` 0.10 (**0.70**) | 0.12 | sm 10 | hand-written 0.35 + halo, both modes |
| Adv-rating drawer inside it | `rgba(0,0,0,0.16)`, **also in light** | white 0.08 | xl-sat | none |
| Studio / tag / group head | 0.06 | 0.12 | xl 24 | `--shadow-md` + inset |
| Performer band | portrait fill; plate `rgba(14,13,16,0.74)` (`rgba(252,252,252,0.9)`) | 0.22 | none | `--shadow-md` + inset |
| Edit head plate | `rgba(14,13,16,0.92)` (`rgba(252,252,252,0.92)`) | 0.12 | md 14 | `--shadow-lg` |
| Phone dock | `rgba(20,20,24,0.72)` (255 channel, 0.72) | 0.12 | xl-sat | `--shadow-navbar` |
| Phone sheets | `rgba(20,20,24,0.92)` (0.92) | 0.12 | xl-sat | glow only |
| Desktop pager capsule | 0.06 | 0.12 | xl 24 | `--glass-shadow` |
| Toolbar pill | 0.06 | 0.12 | none | inset highlight + 0.18 drop |
| Player bar / scrubber | `rgba(10,10,12,0.55)` | 0.12 | md 14 | hand-written |
| Scrape dialog | opaque #151515 | | | |

Blur rungs live: 6 (card stat pills, tier plates), 10, 14, 24, 24-sat; no
rogue expression, the ladder holds. Secondary and danger buttons carry
`blur(14px)` theme-wide (09 base) against 6.5; primary buttons correctly do
not.

### 4.4 Pill anatomies: the D4 table; per-element boxes with rendered-ground contrast in `boxes-measured.json`, crops in `cmp-boxes-1..6.png`.

### 4.5 Focus treatments: the D1 table.

### 4.6 Motion, icons, gaps, status colour, voice

- Motion: 0.15 / 0.18 / 0.22 / 0.3 with `ease` on every surface; the navbar
  icon spring is the only overshoot; the dock uses `--ease-glide` in and
  `--ease-spring` out per 3.7. Literals seen: 0.5s (scene-card specs
  overlay), 0.6s (thumbnail section), 0.2s ease-in-out (hover scrubber),
  0.22s ease-in (card tier), 0.1s (list container), 0.12s (rating stars,
  which is `--dur-instant`'s value). One family.
- Icons: stroke 2px at 16.1 (navbar), 17.5 (dock grid), 19.2 and 26 (phone
  dock), 22 (player overlay); filled FA at 8.6 / 11.9 / 13.3 / 15 in cards
  and toolbars. Two families as 6.12 allows, split cleanly: stroke is
  Refract's chrome, filled is Stash's.
- Gaps: 5.6 / 7 / 10.5 / 14 carry the new work; 3 / 4 / 5 / 6 / 8 / 12 are
  literals in the scene panel (3, 5, 6, 8), customiser (3, 8, 9, 14) and
  mobile (2, 6, 12). Three literal sets, all within 2px of a rung.
- Status: danger is `--danger` on every surface (band, edit, studio, tag).
  Success is `rgb(34,197,94)` (Tailwind) on the edit add button and the
  Ascension WIN marker, against 6.9's Bootstrap `46,125,91`: two greens.
- Voice: British, sentence case, plain verbs on every Refract string seen
  ("Read more", "Unranked", "Edit dock", "Sort and view", "Show anyway",
  "Cards per row", "Select, export, edit, delete", "Hover a region of the
  card to change what sits there"). Stash's own strings ("Customize", "Auto
  tag...", "Scene Scrape Results") are the only Title Case or American text
  and 6.21 accepts that.

## 5. Cohesive, protect

- The accent system and light mode: every surface flips; `--accent-ink` is
  the accent text in light on the band, the scene panel, the customiser and
  the sheets alike (polish-review F2 and F13 measure fixed).
- The floating-chrome family: navbar, toolbar pill, pager capsule, phone
  dock and sheets share `--glass-bg` or `--surface-rgb`, `--glass-border`, a
  ladder rung and a token shadow. The dock reads as the navbar's phone self.
- Cards everywhere: 16px, 0.06, `--shadow-md`, the tier ladder, avatar rings,
  tag-count pills, the flag chip; identical on home, lists, entity pages,
  the customiser preview and the phone.
- The performer band's inner language, now one eyebrow spec, and the
  Ascension section matching it.
- The scene panel's discipline: four sizes, nine pairs, one chip family,
  every one of 44 controls focusable with one ring.
- The mobile lane's chrome: every control on the 44 floor, every size on
  the ladder, one material, one eyebrow, one ring.
- Button classes: primary / secondary / danger identical in recipe and ink
  on band, studio, tag, group, edit plate and home.
- Iconography and motion, as above.

## 6. Proposed ledger rows (DESIGN_SYSTEM.md section 9)

| Area | State | Rule |
|---|---|---|
| Focus ring | OPEN 2026-09-03, measured at 8092e57: six treatments live (shadow 0.15; outline 0.28, 0.70, 0.90, solid bright; UA default; none on studio/tag heads and 12 list-toolbar buttons). Proposed ruling: one `:focus-visible` outline in 09_buttons, `2px solid var(--accent-bright)` (light `--accent-ink`), offset 2px, -2px only inside scrolling containers; lanes delete their copies. Closes polish-review F6 and polish-review-2 F4. | 6.6, 3.9, 10.3 |
| Eyebrow | OPEN 2026-09-03: eight specs measured (600/700; 0.06/0.08/0.10/0.16em; xs/sm). Proposed: one pair, `--fs-xs` 600 `--track-eyebrow`, muted or accent-as-rule; 6.13 names the rung. "Type, band labels" closes: band measures 600/0.08em throughout. | 6.13, 3.5 |
| Segmented controls | OPEN 2026-09-03: three anatomies (entity free on a hairline; scene and mobile 12px well with 9px concentric items; customiser 8px black well, 6px items; solid rim on mobile). Proposed: 6.23 gains the well anatomy and one tab type pair; active rim is `--accent-glow` everywhere. | 6.23, 3.4 |
| Chips | OPEN 2026-09-03: five fills, three rims, four weights, blur on three kinds. Proposed numbers for 6.7: readout `--fill-3` / `--glass-border` / `--fs-sm` 500 / no blur; control = accent tint + glow. The alias chip's resting rim is the hover value and folds to hairline. | 6.7, 6.5 |
| Dark plates | OPEN 2026-09-03: 29 literal near-black families in nine files; band 14,13,16 and player 10,10,12 / 12,12,14 / 15,15,18 beside `--surface-rgb`. Band and edit plates move to the surface channel (light flips free); player family ledgered as the section-8 exemption. | 3.2 |
| Shadows | OPEN 2026-09-03: hand-written shadows identical in both modes on the scene panel (0.35), scrubber wrapper, overlay buttons, volume panel, customiser swatches. Compose from `--shadow-lg` + halo. | 3.3 |
| Display letterfit | OPEN 2026-09-03: -0.02em (performer view name, standing values), +0.02em (performer EDIT name, studio/tag/group names, settings h3), -0.015em (scene title), -0.005em (sheet titles). Rule the sign: negative at `--fs-xl` and up, zero below. | 3.5 |
| Lite | OPEN 2026-09-03: playing-card stat pills keep `blur(6px)` and the list sort toggle `blur(14px)` under `refract-lite`; "everywhere" measures false twice. | 5 |
| Phone control floor | OPEN 2026-09-03: mobile chrome on 44; band actions 38.5, entity tabs 35.8, scene tabs 28.8, adv pill 26, stars 17.5 on the same phone screens. Mobile lane's P-08-1..4 / P-07-1..4 are the fix; they belong to 08 / 07. | 6.11, 10.3 |
| Centre ruling | OPEN 2026-09-03: performer, studio and tag heads centre identity below 600; the scene head does not. Rule whether the scene head is identity. | 6.11 |
| Customiser | OPEN 2026-09-03: radii 6/7/8/10/12, black well, third light channel 20,22,34, 0.16em heads, own swatch shadow, sm blur beside an xl sibling. A measured pass against the phone sheet's vocabulary. | 3.4, 3.2, 6.13 |
| Second typeface | RECORD 2026-09-03: Concert One is live on the playing-card name banner only (16_playing_card, 1df2148; the customiser tried and rejected it at 11:2667). 3.5 should say so and say "nowhere else". | 3.5 |
| Success colour | OPEN 2026-09-03: `rgb(34,197,94)` on the edit add button and the Ascension WIN chip against 6.9's `46,125,91`. Rule the family as danger was. | 6.9, 3.1 |
| Scrape results dialog | UNBUILT 2026-09-03: brief exists (scrape-modal/BRIEF.md); the shipped 08 block is opaque greys, red/green rails, solid accent Apply. The most off-theme surface a user can reach. | 6.14, P1 |

## 7. Files

`run.sh` / `runx.sh` (runner: viewport assert, 3s spacing, retries), `inv.js`,
`focus.js`, `boxes.js`, `pre-dark.js`, `pre-lite-dark.js`, `pre-lite-light.js`,
`click-*.js` (open edit, rating drawer, customiser, burger, sort sheet),
`batch1..3.sh` + logs, `compile.py` -> `inventory.json`, `crops.py` ->
`boxes-measured.json` + `cmp-boxes-1..6.png`, `sheet.py` -> `sheet-d1..3`
(desktop dark), `sheet-l1..2` (light), `sheet-m1..4` (phone), `sheet-ml`
(phone light), `sheet-lite*`, `cmp-heads.png` (four detail heads at 1:1),
`cmp-panels.png` (scene panel open/closed beside the customiser). Raw runs in
`out/` as `<name>.json` / `.png` / `.err` / `.expr.js` / `.pre.js`.
