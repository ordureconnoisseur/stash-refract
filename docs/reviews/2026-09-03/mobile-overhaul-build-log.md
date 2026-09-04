# Refract mobile overhaul: build log (mobile lane)

Worktree: C:\Users\ethork\Projects\stash-refract-mobile, branch mobile-overhaul
(cut from ascension-reconcile ccbcc67, 2026-09-03). tools/ junction + CLAUDE.md
hard link created per CLAUDE.md.

Deploy state at start: deployed refract.js hash 85ef44baff25 == ascension-reconcile
HEAD == this branch's base. css/12_mobile.css 8d93a0d1f607 identical on every lane.

## Standing constraints logged

- HARD EXCLUSION (user): no edits to css/03_cards.css, css/16_playing_card.css,
  or any card markup/JS. Cards on every board are today's cards.
- Coordination note (performer lane, relayed by the coordinator): the performer
  band's sub-820 and sub-600 layout lives in css/08_misc_mid.css; the scene
  panel's responsive rules live in css/07_scene_details.css. For slices 4 and 5:
  measure what those files already do at 390 and 430 FIRST, build only the
  deltas the board calls for, and where a delta belongs to the band's or
  panel's own rules, write it here as a proposed change for that lane instead
  of overriding from 12_mobile.css. My clear ownership: dock, drawer, More
  sheet, safe areas, page-level chrome around those surfaces.
- DESIGN_SYSTEM.md is read-only for me; rulings and new tokens go in the final
  report as proposed ledger rows. New tokens are defined locally in
  12_mobile.css under --refract-dock-* names and flagged for promotion.

## Slice 1: the dock

(in progress)

### Landed

Commits on mobile-overhaul: c4eef5a (dock capsule, pill, scroll controller,
footprint), 57149cf-era fix commit "Dock capsule fill moves to the surface
family at 0.72..." (see git log). Deployed twice from merged committed trees
(93eacc9, then 57149cf); DEPLOYED_FROM.txt has both lines. refract.js deployed
== every lane's HEAD at the time of copy (guard passed).

Files: css/12_mobile.css (dock block rewritten, drawer bottom re-based on the
footprint), refract.js (pill span + --dock-count in injectMobileDock;
refractMarkActiveDockItem writes --dock-active and .refract-dock-has-active,
parks the pill on More while the drawer is open; refractSetDockContracted /
refractBindDockScroll: passive scroll, rAF-throttled, 5px deadzone, 80px
near-top, expands on tap / drawer open / route change; never contracts under
prefers-reduced-motion, drawer open, .Lightbox present or fullscreen; no-op
above 900px).

### Measured (deployed 57149cf, fresh documents, viewport asserted each run)

390x844 /performers dark: capsule x23 y763 344x58 (23 above bottom); slots
64.8x56 (tap floor met); icons 26; pill 73.8x50 centred on slot 1 (centres
130.2 == 130.2); main padding-bottom 88 (81 footprint + gap-md); pager bottom
edge 753 (10 above the capsule); drawer bottom edge 753.
Scrolled (ex-dock-scroll): y420 down -> contracted 302x49 at x44, 28 above
bottom, icons 22, pill 52.8x41 (before the 9px-lap fix; now 61 on 7 slots);
y400 up -> expanded again. Pager rode along (y 696.7 -> 705.7).
430x932: 384x58 capsule, slots 72.8, pill 68.8 (pre-fix) / lap rule now.
7-slot dock at 430 (PROBE_STORAGE seeded 6 items): slots 52 wide, pill 61 =
slot + 9, centred on Studios (215 == 215).
Drawer open: pill parks on slot 4 (More), burger colour accent-ink, drawer
y155.7 h597.3 (bottom 753).
Desktop 1600x1000: dock display none, main padding-bottom 84 (09_buttons'
pager rule, unchanged), pager bottom 21px (1.5rem, unchanged), navbar flex.
Footprint var unset on body at desktop (rules are inside max-width 900).

Pixel contrast (contrast.py: ink = rendered glyph pixels, ground = ring
around each icon):
- FIRST BUILD with --glass-bg 0.06 (the board's material): capsule ground
  over the performer grid rgb(196,148,136); icons 1.69 / 2.11 / 2.71 / 2.43
  / 2.27 (390 dark), 2.03 to 2.72 (430), home 2.36 to 3.90. FAIL.
  Light: route icons were WHITE on the white capsule (1.29 to 1.52) because
  04_filters' global anchor rule (0,6,1) outranked the slot colour.
- SHIPPED BUILD (surface family 0.72 + !important slot colour): dark
  performers 6.75 / 3.45 (active accent on its pill) / 8.08 / 7.56 / 7.61;
  home 8.17 to 9.60; light performers 11.01 / 8.31 / 11.91 / 10.63 / 10.18.
  Every inactive icon clears 4.5, the active accent icon clears the 3:1
  non-text floor in dark and 8.3 in light.

Screenshots: shots/s1-*.png (first build), shots/s1b-*.png (shipped):
s1b-performers-390, s1b-performers-light-390, s1b-home-390, s1b-7slot-430,
s1-performers-scroll-390 (contracted state), s1-drawer-390, s1-desktop-1600.

### Deviations from the board, and why

1. Capsule FILL is rgba(var(--surface-rgb), 0.72), not --glass-bg. Measured
   above. The dock is the only chrome that sits permanently over artwork;
   the desktop navbar's 0.06 is tuned for a page ground. Rim, radius,
   shadow (--shadow-navbar) and blur (--glass-blur-xl-sat) are the board's.
   Reduced transparency pins 0.97; lite pins rgb(35,35,35) (the family's
   value in 15_lite section 4; written in 12_mobile, and 15_lite's comment
   saying the dock needs no pin is now stale: proposed one-line fix for the
   file's owner).
2. Slot colour and active colour carry !important (04_filters anchor rule and
   its :hover, which would have left a tapped slot accent-coloured on touch).
3. Content pads by footprint + --gap-md (88), not bare 81, so a last row's
   rim never touches the capsule. The footprint itself is fixed as specified.
4. Pill laps its slot by 9px (binge's 74 over 65.2) rather than a fixed 74,
   so 6- and 7-slot docks keep the proportion.
5. Resize easing: --dur-settle with --ease-glide contracting and --ease-spring
   expanding (overshoot only on arrival, 3.7); pill travel --dur-slow
   --ease-spring as the System board says.
6. The pager is lifted onto the footprint and rides the contraction for now
   (bottom footprint+10 / +1); it still renders "1 / of / 32" stacked on
   /performers as before this work. Slice 6 folds it into the dock.

### Proposed tokens (local in 12_mobile.css, flagged for 01_tokens)

--refract-dock-bottom: max(23px, env(safe-area-inset-bottom, 0px))
--refract-dock-footprint: calc(var(--refract-dock-bottom) + 58px)
--refract-dock-fill: rgba(var(--surface-rgb), 0.72) (per-element; could stay local)

### Open

- The contracted state was measured by synthetic scrollTo; real touch
  momentum scrolling fires the same scroll events, but the feel (deadzone,
  rAF) should be eyeballed on a phone once.
- Unicode note: several dock/drawer comments in 12_mobile.css still use box
  drawing characters from before; untouched.

## Slice 2: the More sheet

Commit "The drawer becomes the More sheet: labelled rows..." (see git log),
deployed from merged tree 150b15e (refract.js + css/12_mobile.css). Deployed
refract.js at copy time matched entity-pages HEAD (the entity lane had
deployed since my slice 1); merged first, guard passed.

What landed: the existing .refract-mobile-drawer keeps its tile DOM (the
registry the dock is configured from) and renders as a sheet: header row
44px ("More" --fs-lg 600, "Edit dock" --fs-base 600 --accent-ink with a
pencil, links to /settings?tab=interface and scrolls #plugin-refract-dock-
config into view once rendered); three eyebrow group labels (Library,
Plugins, Stash; --fs-xs 600 --track-eyebrow --text-muted per 6.13); rows
48px: 36px icon tile (--fill-2, --glass-border, 10px radius, 20px glyph),
label --fs-body 600 painted by ::after from the tile's aria-label, chevron
18px masked ::before in --text-muted (outward arrow for target=_blank
launchers). Rows already in the dock get data-in-dock from the same
selection the dock is built from (refractSyncDrawerRows, read-before-write,
runs every dock pass) and hide; empty groups hide their label. Per-tile
stagger animation removed: the sheet rises as one surface. multiview's count
badge moves off the tile corner to before the chevron. Focus rings via
outline.

Measured 390x844 dark (s2-sheet-390.png/json): sheet x12 w366 y149.7
h603.3 (bottom edge 753 = footprint + 10); head 44; title 17.5px/600;
Edit dock 90.8x44 accent-bright; group labels 10.08px 600 ls 0.81px muted;
rows 352x48, icon 36 at x25, glyph 20, label 14px 600, chevron 18 muted;
hidden in dock: Scenes, Performers, Studios, Tags; visible rows Images,
Movies, Galleries, Markers | Forage, Binge, Ascension | Stats, Settings;
pill parked on More (x287.7). Light (s2-sheet-light-390): sheet
rgba(255,255,255,0.92), rows rgba(0,0,0,0.88), chevron rgba(0,0,0,0.65),
icon tile rgba(0,0,0,0.055), Edit dock the deep accent mix.

Deviations: no row hints ("Performer-driven grabbing" etc. on the board):
the DOM carries only each plugin's label, and inventing subtitles is not
data. Hints can come back if plugins ever expose a description.

## Slice 3: Home (surroundings only)

Commit "Home on phones: section heads become a 44px row..." deployed from
merged tree 13843c7 (css/12_mobile.css only). Appended as a new
@media (max-width: 600px) block at the end of 12_mobile.css.

What landed: .recommendation-row-head is a 44px row, no hairline, text at
--fs-lg 600 in --text (was --fs-sm 700 uppercase --track-wide muted), text
edge aligned to the card edge (5px slide pad); the view-all link is a
44x44 hit area with the 18px muted chevron and no plate; rows separated by
--gap-lg; slick arrows hidden under (hover: none) and (pointer: coarse)
inside the phone breakpoint, so pointer users at phone width keep them.

Measured 390x844 (s3-home-390.json/png): heads 366x44 at y19/451.1/867.8;
h2 17.5px/600, text-transform none, rgba(255,255,255,0.92), 209/221/24 wide
(all single line); chevron link 44x44 at x334, glyph 18px muted, no
fill/border; row gap 10.5 (440.6 -> 451.1); progress bar unchanged 366x3.
Cards unchanged: scene 320x353, performer 224x338. Light: h2
rgba(0,0,0,0.88), chevron rgba(0,0,0,0.65). 430x932: heads 406x44, same
type. The touch-arrow rule cannot be exercised by the headless probe
(matchMedia coarse = false there, arrows report block, which is the
correct pointer-device result); verified by reading the computed rule
only. Needs one eyeball on a phone.

NOT built (hard exclusion, cards): scene cards 300 wide with a 66px peek
(today 320 with a 43px peek), the 2-line description clamp, performer
cards 168 wide with the four stat pills moved into a 36px footer (P7).
These are card-lane work; the board's intent is recorded for whoever owns
03_cards.css: on phones the card width should leave a deliberate peek and
the stat pills should leave the portrait.

## Slices 4 and 5: performer page and scene page (my part, plus proposals)

Per the coordination note, I measured what 08_misc_mid.css and
07_scene_details.css already do at 390 before writing anything, and built
only the page-level deltas that live in 12_mobile.css. Commit "Detail-page
tab strips scroll as one row on phones..." deployed from merged tree 8183a02
(css/12_mobile.css only); a follow-up fix to the scene page's top padding
specificity is in the next commit.

### Measured before (390x844, performer 265; s4-perf-before-390*.png/json)

08's sub-600 layout already: card 200x300 on top (x44.5 y29.5), band x27
w336 (12 page + 15 Bootstrap col), name 28px/600 at y347 with favourite and
link buttons inline at 38.5x38.5, alias row, action buttons in three rows
(Edit 44x38.5, Auto tag, Merge / Submit to Stash-Box / Better image, Back
image, Delete), standing row of three cells 39.6 tall, stars 17.5px + adv
rating pill 26 tall, detail grid ALREADY 2-up (149px cells, 47.6 tall,
hairlines), custom fields 328 tall, Ascension ladder 8 rows, tabs wrapped to
TWO rows (y1302.8 and y1342.7, 35.8 tall, radius 12), header 1276 tall in
total.

### What I built (12_mobile.css)

- Entity and scene tab strips: one scrolling row (flex-wrap nowrap,
  overflow-x auto, hidden scrollbar, snap, left-aligned), scoped to
  .performer-tabs/.studio-tabs/.tag-tabs/.group-tabs/.movie-tabs/
  .scene-tabs/.gallery-tabs/.image-tabs; settings keep the generic wrap.
  Measured after (s4-perf-390-y700): six tabs all at y602.8, strip 43.3
  tall, last two overflow to x365.6 and 478.4 (the peek). Tab size, type
  and radius untouched (08's).
- Scene page: the stacked row's 52px navbar reservation removed (the nav is
  display:none on phones); player edge to edge (x0 w390, radius 0; was x12
  w366 r16); .scene-tabs panel flattened (no glass, no border, no radius,
  padding gap-xl 12px 0) so the details run in the page. Measured after
  (s5-scene-390): player 390x223 at y28 (the 21px main pad is fixed in the
  follow-up commit: 01_tokens' :has(> .row > ...) outranked my shorter
  :has()), title x12 w366, tab strip one row (already fit: 6 tabs in 386),
  tags wrap fully (366 wide, 247 tall). Screenshots s5-scene-390.png.

### Proposed for 08_misc_mid.css (performer lane), from the boards

P-08-1. Below 600, the card beside the name at 128x192 (--radius-sm) instead
  of 200x300 above it; the name at --fs-2xl 600 beside it; the standing
  row's three cells and the stars/Ascension chip under the name in the
  same band. Today the head starts at y347 and the first fact below the
  fold.
P-08-2. Actions: Edit (primary, flex 1) + favourite + link + kebab in ONE
  44px row; Auto tag, Merge, Submit to Stash-Box, Better image, Back image
  and Delete (last, danger) move into the kebab (user ruling: Delete lives
  in the kebab). Today: three rows, 138.6px.
P-08-3. Tap floor: the favourite and link buttons in the h2 measure
  38.5x38.5; the 820 rule that lifts .name-icons .btn to 2.75rem misses
  them. Stars are 17.5x21 (the 32x44 hit area the board draws needs 07/08
  to size the star buttons, not the glyphs).
P-08-4. Band inset: at 390 the band sits at x27 w336 (12 + Bootstrap 15);
  the boards use the 12px gutter. `.detail-container` padding 1.25rem at
  600 could drop to 12px and the Bootstrap col gutter zeroed.
P-08-5 (ascension lane, 13_plugins): the eight-row ladder becomes a
  four-cell strip (Matches, Wins, Losses, Streak) plus the last match row
  on phones; today 260px for mostly zeros.

### Proposed for 07_scene_details.css (scene lane)

P-07-1. Title --fs-xl 600 clamped to 2 lines (today 21px/700, 2 lines via
  TruncatedText). P-07-2. One wrapped meta row: studio, date, duration,
  resolution/codec, size (today: studio eyebrow above the title, and date /
  fps / resolution under it). P-07-3. Rating row directly under the meta:
  stars 32x44 tap, o-counter, favourite, kebab; Advanced Rating's pill first
  when present, nothing reserved when absent (today: an "UNRATED" pill and
  four 30px icons). P-07-4. Tab links 40px tall in a 44 row (today 28.8 in a
  36.8 strip).

## Slice 6: list pages (toolbar and pager)

Commits: "List pages on phones: the filter toolbar becomes two tiers..."
(294aef2 merge), "Toolbar tiers: saved filters and the view group land on
the second line..." (810311d), "Toolbar: sort stays on the first tier..."
(bc2facf), and the 44px pager floor commit after it. Each deployed from the
merged tree (css/12_mobile.css only). The scene page's top padding fix
(01_tokens' :has(> .row > ...) shape) shipped in 294aef2; measured after:
main padding 0, player at y7 (was y80 before slice 5, y28 after its first
cut).

### Measured before (390, /performers; s6-toolbar-before-390.json)
Toolbar pill 345x42 sticky at top 7; EIGHT visible controls at 30px tall
(search as a 30x30 icon, saved filters 28.7, filter 28.7, sort 64.3 +
direction 30.7, per-page select 35, list operations 28.7, multiview toggle
28.7; the native view group hidden by inline style). Pager: .pagination-
footer 213x56 at y696.7 with the "1 of 32" button 40.6 wide wrapping to
three lines; count container display:none.

### Built (12_mobile.css, max-width 900)
Toolbar as two tiers in one sticky element: the ::before pill paints
behind the first 56px only. Tier 1: search as a real 44px field (flex 1,
min 120, magnifier at left 14, placeholder visible, text ink), filter
44x44, sort label + direction 44 tall. Tier 2, right-aligned, no plate:
saved filters, per-page (44 square showing the number), list operations.
Stash's filter/saved-filter btn-group is display:contents so its two
children can sit on different tiers (descendant selectors, since the DOM
parent stays). Typing still collapses everything else (the existing
focus-within rule). multiview's picking toggle is hidden on phones because
its launcher already is. The count ("1-40 of 1,245") is the top pager
container re-shown as a --fs-sm muted caption under the toolbar (not on
/scenes, which has 04_filters' relocated stats).

Pager folds INTO the dock (user ruling): the live pagination row is
restyled as a tier 304 wide (dock inset + 20) whose bottom edge sits 14px
under the capsule's top edge, in the dock's material (surface 0.72,
glass-border rim, xl-sat blur, --radius-sm top corners, no bottom border),
z-index dock - 1. Buttons 44 tall (chevrons 40 wide, "1 of 32" auto width,
nowrap). When the dock contracts the tier drops 40px behind the capsule and
fades (opacity 0, pointer-events none). First/last and the page-jump
popover stay live; no React node moved.

### Measured after (390; s6d-toolbar-390.json, s6c-toolbar-390.png,
s6c-scroll-390.png)
Toolbar 345x98 (two 44 rows); tier 1 at y29.2: search 164.8x44 with
padding 0 14 0 40, filter 44x44 at x199, sort 64.3x44 + direction 44x44;
tier 2 at y77.2: saved 44, per-page 44, ops 44 right-aligned. Caption
"1-40 of 1,245" 68.5x14 muted at y129 (light: rgba(0,0,0,0.65)). Pager tier
.pagination 247.5 wide at y716 (bottom 777 = 14 under the dock top 763),
radius 12 12 0 0, rgba(20,20,24,0.72) (light: 255,255,255,0.72), buttons
44 tall, "1 of 32" 65.5 wide on one line. Contracted (y420): tier at y756
(+40) and opacity 0; dock 302x49. 430x932: toolbar 385x98, two rows.
Desktop 1600: see s6d-desktop-1600.json (dock none, pager bottom 21px,
toolbar untouched by these media-scoped rules).

### Deviations
- Sort keeps its two Stash buttons (label + direction) rather than the
  board's single "Random v" control: the direction toggle is a live
  control and cannot be folded without React.
- Per-page shows as a 44px "40" tile on tier 2 rather than the board's
  "40 per page" text: it is a live <select>.
- The count reads "1-40 of 1,245" (Stash's text) rather than "1,245
  performers": no invented copy.
- The native view-mode group (grid/list/wall) was already unreachable on
  phones before this work (both it and refract's view dropdown are hidden
  in the existing 900 block); unchanged, flagged.

## Slice 7: the system floor on the surfaces this lane owns

Audit probe (ex-floor.js, 390x844, sheet open; s7-floor-390*.json):
dock slots 5, min 56 (64.8x56 expanded, 56.8x47 contracted); sheet rows 9
at 48; Edit dock 44; toolbar controls 10, min 44; pager buttons 5, 44x44
after the last commit (chevrons were 40 wide). Type on owned surfaces is on
the ladder: sheet title 17.5/600 (--fs-lg), group labels 10.08/600
(--fs-xs), rows 14/600 (--fs-body), Edit dock 12.25/600 (--fs-base), count
caption 11.2 (--fs-sm), search input 14 (--fs-body), home heads 17.5/600.
Spacing: dock inset 23/44, footprint 81 + safe area, sheet padding 6/6/8,
row gap 2, home row gap --gap-lg, toolbar gap 6 / row-gap 2.

Not applied (other lanes' surfaces, proposed in slices 4/5): entity tab
links 35.8 tall (08), scene tab links 28.8 tall in a 36.8 strip (07),
favourite/link buttons 38.5 in the performer h2 (08), star buttons 17.5x21
(07/08), Ascension ladder (13).

Reduced motion: dock never resizes (JS does not bind); pill cross-fades.
Reduced transparency: dock fill 0.97, blur dropped. Lite: dock pinned
rgb(35,35,35) from 12_mobile (15_lite's comment claiming the dock needs no
pin is now stale; one-line fix proposed to its owner). Light mode measured
on every slice (see each section). Lite and reduced-* were verified by
reading the computed rule set, not by a live probe.

## Harness notes for other lanes

- m.sh (scratchpad build/) wraps probe.js: asserts the viewport the
  expression reports equals the one requested, retries after a wait, and
  distinguishes an EVAL ERROR (the expression threw) from a stale-Chrome
  attach. Tonight one hung probe (node 39012 + headless chrome 35152,
  port 9223) blocked every later run until killed; an expression that
  throws also reports as "got x" without the EVAL check.
- contrast.py measures icon ink against the rendered ring around each
  glyph; it is what caught the 1.69:1 capsule.

## Final state (2026-09-03, end of session)

Branch mobile-overhaul HEAD 2811e50 (worktree C:\Users\ethork\Projects\
stash-refract-mobile), clean, never pushed, main untouched. Carries
entity-pages, ascension-reconcile and scene-panel-d as of the last merge.
Deployed: refract.js dc70bcb0c7c4 (== this HEAD == ascension-reconcile HEAD,
which merged this branch), css/12_mobile.css 6f5d94418c72 (== this HEAD).
Every deploy is a line in DEPLOYED_FROM.txt. No other file was copied by
this lane. Files changed by this lane: css/12_mobile.css, refract.js only.

## Polish round (user feedback from the phone, via the coordinator)

Commits 52b3671 (all three items) and a4a717d (toggle hidden on desktop),
both deployed from merged trees (refract.js dfc395b839c2, css/12_mobile.css
e9a1aa1e713c). Deployed refract.js matched ascension-reconcile HEAD at copy
time (that lane had merged my branch); guard passed.

1. Pager folds into the dock, literally. The live pagination row is a tier
   at the capsule's own 23px inset and 344 width, directly on the nav tier
   (tier bottom 763 == dock top 763, zero overlap; was 14px overlap at a
   narrower width), same material (surface 0.72, xl-sat blur), one outline
   (tier rim has no bottom edge, capsule rim has no top edge and square top
   corners via body:has([data-pager-row=float])), one radius family (29px
   top corners on the tier, the pill's own curve below), a hairline inset
   divider, glow-only shadow on the tier and z dock+1 so the capsule's
   directional shadow cannot paint the join. Contracts as one: at y420 the
   tier is 302 wide at x44 y723 over the 302x49 capsule at y767. Content
   pads by footprint + 44 (132px) and the More sheet clears it (bottom
   135). Measured p-after-*.json; shots p-after-performers-390/430 (+light),
   p-after-scenes-390, p-after-contracted-390.
2. Controls: First and Last hidden on phones (display:none, nodes kept,
   desktop shows them: desktop pager 210x38.8 with "1 of 32" 65.5 wide,
   unchanged). Prev and Next 44x44 with 22px masked chevrons in the dock's
   icon ink rgba(fg,0.80) (font-size 0 on the glyph text); disabled at
   0.35. The page-jump label is Stash's button.page-count two groups deep;
   the container, its btn-group and the button are all 44 tall now; the
   label is --fs-md 600 tabular, content-sized with min-width 112, padding
   16: "1 of 3,281" on /scenes measures 112 wide, scrollWidth 112 ==
   clientWidth 112 (was 82 wide, 30.8 tall, overflowing). Same numbers at
   430. The page-jump popover (#select_page_popover, Stash's node) gets a
   44px-tall input on phones; it is type=number and has no inputmode; it is
   Stash's input so I left its attributes alone, as instructed.
3. One card per row. refract.mobileCols ("2" default, "1") added to
   REFRACT_SYNC_KEYS (localStorage + configureUISetting mirror, pulled on
   boot and re-applied in reapplyRefractSettings); body.refract-mobile-
   onecol; 12_mobile's existing 768 grid rule (repeat(2, 1fr) on
   .row.justify-content-center, which is what already overrides Stash's
   card width on phones) gains a one-track variant. A 44x44 toggle
   (.refract-cols-toggle, injected into every .filtered-list-toolbar, never
   moving Stash's nodes) sits on the toolbar's second tier and swaps its
   glyph; hidden above 768. Gate measured: /performers 390 two-up 171px
   cards -> click -> one-up 349px, stored "1"; fresh document with the
   setting pinned: /scenes one-up 349, /performers 430 one-up 389,
   /performers/265 scenes tab one-up 334; desktop toggle display none,
   grid untouched. NOTE: the click test mirrored "1" to the user's SERVER
   copy; reset to "2" by a second click probe (p-reset.json: stored "2",
   final check two-up) and every later probe of the one-col state used
   build/pre-onecol.js, which pins localStorage and swallows the mirror
   writes exactly like pre-light.js. Cards untouched.

## List-page ruling (canvas f3681f8f: pager option B in flow, toolbar H1)

Commits 90bec9c (the build), 10d126a (group halves specificity), and the
"In-flow pager: Stash's footer container stops lifting the row..." commit
merged at d77723c. Deployed from merged trees; last copy: refract.js
568da5e0c5a9, css/12_mobile.css 38ec5c9be141 (deployed refract.js matched
entity-pages HEAD at copy time; guard passed). Files: css/12_mobile.css
(the whole list-page block rewritten: listpage.css), refract.js (the sort
sheet, the stuck state, caption and placeholder sync; the cols toggle
button is gone, the setting stays).

BUILD 1, pager in flow. The two-tier capsule, the floating tier and the
body:has() rim surgery are gone; the capsule measures 344x58 at inset 23
(430: 384x58), contracting to 302x49 at inset 44, border-radius 9999 on
all corners, top rim present, in every run. The live pagination row stays
in the document as a 44px row after the last cards: prev and next 44px
fill-2 circles with 20px chevrons in --text, the page-jump label a fill-2
pill at --fs-md 600 tabular, min 112, content-sized; first and last
display:none (nodes kept). Stash's .pagination-footer-container carried
position:relative; bottom:48.75px, which lifted the row 39px into the last
cards once it was in flow; it is static on phones now. Measured at the end
of the page: /performers 390 last card bottom 652.7, pager y663.1 (10.5
below), bottom 707, contracted dock top 767 (60 clear; expanded 763);
/scenes 390 "1 of 3,281" scrollWidth 110 == clientWidth 110; 430 both pages
the same geometry at 406 wide. Content padding back to 88 (footprint +
gap-md). The count caption is the link that scrolls to the pager.

BUILD 2, toolbar H1. One 44px tier: the search field (flex 1, fill-2,
glass-border rim, pill, magnifier at 14, placeholder "Search performers" /
"Search scenes" from the route, set as an attribute React never rewrites)
and one grouped pill: the filter button as the left half (22 0 0 22, fill-2)
and Stash's sort toggle as the right half (0 22 22 0, hairline between,
label --fs-base 600, 14px masked chevron). Direction, saved filters, per
page, list operations, the view group and multiview's toggle are
display:none in the bar. Caption line under the tier at --fs-sm muted:
Stash's range on the left, "N per page" on the right (data-per-page from
the live select); on /scenes 04_filters' stats overlay shows instead of
the range. Stuck: past 80px the toolbar element gets .refract-stuck (set by
the dock's scroll controller and re-derived every pass, never on body) and
its ::before paints the chrome material (surface 0.72, xl-sat blur,
--shadow-lg) 6px around the controls; opacity 0 at rest. Measured: rest
345x44 at y23, plate 0; stuck 345x44 at y6, plate 1, both pages, both
widths, both modes.

The sort sheet (.refract-list-sheet, injected once at body level, rebuilt
from the live toolbar on open): "Sort and view" header with close; Sort by
(the current field with Change: proxies Stash's sort dropdown, which the
existing mobile rules render as a modal; Direction segmented, proxies
Stash's direction button, state read off its caret icon); Saved filters
(row, proxies the saved-filter dropdown); View (Per page segmented 20/40/60/
120 plus the current value, set through the native select setter and a
change event; Cards per row segmented, refract.mobileCols); Actions (row,
proxies list operations). The sort half of the group opens it (capture-
phase intercept on phones only; the sheet's own row reaches Stash's
dropdown through a bypass), scrim and Escape close it. Measured 390: sheet
366x484 at y268.6 (bottom 753), 6 rows at 48, segments 40x28 in 36px
groups, current values Descending / 40 / Two cards per row; Stash's menu
stays closed on the intercepted tap. Light: fills rgba(0,0,0,0.055), rims
rgba(0,0,0,0.10).

Deviations from the boards: the sort FIELD list is one tap deeper than
H1 draws (Stash renders its menus lazily, empty until opened, so the rows
proxy the dropdowns rather than harvesting them); saved filters are a row
opening Stash's list, not chips; the caption's range is not bolded (it is a
React text node, no element to style). Desktop 1600: toolbar 640x40.6 with
15 controls, pager pill 210x38.8 with "1 of 32", no dock, unchanged.

Shots: before (the welded build) p-after-performers-390/430(+light).png,
p-after-scenes-390.png; after h1b-performers-390.png (rest), -390-end
(contracted dock, pager), -390-sheet, h1b-scenes-390.png, -390-end,
h1b-performers-430.png, -430-end, h1b-scenes-430-end.png,
h1b-performers-light-390.png, -light-390-end, -light-430,
-light-390-sheet, h1b-desktop-1600.png.

## Phone follow-ups: stuck top air, the bare plus, alignment rule

Commit 98a4630, deployed (refract.js 25f2d8729626, css/12_mobile.css
a5d3c27ea616; deployed refract.js matched ascension-reconcile HEAD at copy).

1. Stuck tier top air: the sticky toolbar's top is calc(12px +
   env(safe-area-inset-top)); the plate's 6px padding sits inside that.
   Measured stuck (a1-stuck-*.json): control top edge y12 at 390, 430 and
   700, dark (pre-dark.js pin) and light (pre-light.js); plate opacity 1.
   The bare "+" is multiview's #mv-filter-add-btn ("Add current search as
   a slot"), 30.8px, injected into the filter btn-group while picking mode
   is on (the user's phone has it on). It is hidden in the phone bar with
   the other demoted controls and appears in the sort sheet's Actions
   group as "Add this filter to multiview" (proxy click) whenever the
   button exists. Verified with picking mode toggled on in a probe: the
   bar shows search, filter, sort only (a1-plus-after-390.json).
2. Alignment rule (identity centred, data left) on my surfaces: home
   section heads are labels of full-width rows and stay left (unchanged);
   the More sheet header ("More" + Edit dock) and the sort sheet header
   ("Sort and view" + close) are headers with an action, not identity
   stacks, so they stay left with their rows; the toolbar is untouched.
   Empty state: at 390 a zero-result list renders no message at all
   (measured /performers?q=zzqqxxyy: 0 cards, no text node matching
   no results / nothing / empty), so there is nothing to align and 6.22's
   empty-state law remains unbuilt; end-of-list is the centred pager row
   (a control row, board B).

Harness note: several probes today WITHOUT a prescript came up light
(body.refract-light) although the server holds refract.lightMode "0";
with build/pre-dark.js (pre-light with "0") they are dark. Dark runs now
pin explicitly. Cause not chased.

## Cohesion audit (8092e57) follow-up: proposed ruling on the home section head

D3 measured the same home section head as an eyebrow on desktop (11.2 /
700 / --track-wide, muted, under a hairline) and a title on the phone
(17.5 / 600 sentence case, --text, in a 44px row with a 44px chevron).

Proposed ruling (agreeing with the coordinator's lean): two jobs, two
treatments, stated as a rule in 6.13 and 6.11.
- On the phone the head is a TAP ROW: the whole 44px row is the way to the
  full list (the chevron's hit area) and the carousel has no other
  affordance for "see all" on touch. A tap row carries title type
  (--fs-lg 600, --text) so it reads as the thing you press.
- On desktop the head LABELS a full-width row that is not itself tappable
  (the arrows and the view-all link are); a label is an eyebrow. It should
  fold to the one eyebrow pair (--fs-xs 600 --track-eyebrow muted) with
  the rest of D3 rather than stay at 11.2 / 700 / --track-wide; that is
  08's rule (08:4564) and belongs to that lane's pass.
- The rule: "a row you press carries a title; a row you read carries an
  eyebrow". Measured: phone heads 17.5/600 at y19..451..867 (s3), desktop
  heads 11.2/700 (audit). No code change from this lane.

## Cohesion audit round (mobile lane items 2, 3, 4, 6; item 1 pending)

Commit "Cohesion: the sort sheet's active segment takes the theme's active
state..." merged at 96627fc; deployed refract.js d135dde6feea,
css/12_mobile.css 6dc16e4ac8f0 (deployed refract.js matched
ascension-reconcile HEAD at copy). Tree carries entity-pages 77e6c86 (the
one chip recipe in 10_pills_badges).

2. Segments: .refract-seg button.is-on = accent tint 0.12, inset 1px
   --accent-glow (0.28), 0 0 14px accent 0.35; the solid 0.25 rim is gone.
   Measured (c-dark-390.json): shadow "rgba(168,85,247,0.28) 0 0 0 1px
   inset, rgba(168,85,247,0.35) 0 0 14px", bg 0.12, ink accent-bright.
   Anatomy otherwise unchanged (12px well at --fill-2, 9px items, 12.25/
   600) pending the scene lane's 6.23 text; will follow it if it differs.
3. Chips: the only chip this lane draws is the More sheet's multiview
   count badge; it now carries .refract-chip and takes the recipe from 10
   (12_mobile keeps only its place in the row). The pager's page-jump
   label is a 44px button, not a chip; the caption is text.
4. Lite: 15_lite has no mobile section, so the pins live in 12 under
   body.refract-lite: the dock, the sort sheet and the stuck toolbar plate
   pin rgb(35,35,35) with no blur; the burger and sheet scrims drop their
   blur; the tier's in-page controls (search field, filter half, sort
   half) carry backdrop-filter: none in every mode (09 gave the toggle
   blur 14). Measured under pre-lite.js (c-lite-390.json): sort toggle,
   filter, search "none"; plate none / rgb(35,35,35) / opacity 1 when
   stuck; sheet and dock none / rgb(35,35,35); scrim none.
6. Eyebrows drawn by this lane (both sheets' group labels) already sit at
   --fs-xs 600 --track-eyebrow --text-muted (10.08 / 600 / 0.81px
   measured in slice 2); unchanged.
1. Focus: NOT done yet. The global :focus-visible rule in 09 had not
   landed on scene-panel-d at this commit (09 still has only the
   adv-rating list ring); deleting my three rings now would leave the
   dock, both sheets and the toolbar on the UA ring. They stay until the
   hash arrives; then: dock slot keeps only outline-offset -6px and the
   pill radius, both sheets keep only outline-offset -2px (they scroll),
   and the pager, toolbar controls and the segments take the rule
   untouched. Verify with PROBE_KEYBOARD=1.

### Chip join, per the coordinator's follow-up

Commit "The More sheet's count badge is listed in the chip recipe's
inventory..." merged at f2ecdce; deployed css/10_pills_badges.css
9bfc36712832 (entity-pages dd445d4's recipe plus one appended selector in
the read-out :is() list, CRLF preserved) and css/12_mobile.css
284ac0dcf2e2. The badge also carries .refract-chip, so it joins either
way; 12 restates none of the recipe (only order 3, min-width 24,
box-sizing, tabular, centred text). Measured with a badge placed in the
Stats row (c-badge-390b.json): 28.8x24 at x304 in the 352x48 row, after
the label and before the chevron; height 24, padding 0 10, --fill-3
(0.05), 1px rim 0.12, 11.2/500, pill, no blur; the row stays 48. No other
chip belongs to this lane (the pager label is a 44px button; the caption
is text; the sheet rows carry no counts).
Note for reconciliation: 10 is shared; other lanes must merge
mobile-overhaul to keep the inventory line.

### Chip join, corrected

10_pills_badges.css is the performer lane's this round; my appended
selector is withdrawn (10 restored to entity-pages' version and deployed
so). The badge keeps .refract-chip, so it still takes the recipe (measured
above). Selectors handed to the coordinator for the performer lane to
append:
- READ-OUT: `.refract-mobile-drawer .refract-drawer-tile-badge` (the More
  sheet's multiview count badge; also carries .refract-chip). No
  deviation.
Nothing else from this lane is a chip.

### Chip join, final

Coordinator ruling: the single append at f2ecdce stands and the performer
lane merges it before its next edit to 10. My interim revert (28957f2) is
undone: 10 is the f2ecdce version again (inventory line present),
committed and deployed (47414db42847 -> 9bfc36712832). No further edits to
10 from this lane; new chips go through the coordinator. Items 1 and 2
held as prepared, waiting on the scene lane's hash.

### Cohesion items 1 and 2, on the scene lane's f23419f

Commit "Mobile chrome takes 09's one focus ring..." merged at 7291619;
deployed css/12_mobile.css bc458082f4d1 only (09 was already deployed at
the scene lane's 3b6b21860375, which is what the ring was measured
against).

1. Focus: the three rings of my own are gone. The dock slot keeps
   outline-offset -6px (inside the capsule) and the pill radius; the More
   sheet's rows and Edit dock and the sort sheet's buttons keep -2px
   because those surfaces scroll; all three are written with the tripled
   body class at (0,6,1) so their !important offset outranks the rule's
   own. Verified with PROBE_KEYBOARD=1 by focusing each control and
   reading :focus-visible and the computed outline (c-focus-390.json,
   c-focus-light-390.json): search, filter, sort, the five dock slots
   (-6px), the page-jump label, Next, the More sheet's first row and Edit
   dock (-2px), a sort-sheet row, a segment and the sheet's close all
   ring "solid 2px accent-bright" in dark and the deep accent mix
   (color(srgb 0.317 0.11 0.505)) in light. Previous on page 1 is
   disabled and cannot take focus, so it shows no ring by construction;
   on any other page it is the same button as Next.
2. Segments: values are now 09's anatomy verbatim: well --fill-1 on a
   1px rgba(--fg-rgb, 0.08) rim at 12px, items 9px --fs-sm 600 muted,
   active accent tint + --accent-glow rim + 0 0 14px 0.35 + inset 0.18.
   Measured dark: well rgba(255,255,255,0.03) / rim 0.08, active bg 0.12,
   border 0.28, shadow as ruled, ink accent-bright, 11.2/600; light: well
   rgba(0,0,0,0.04) / 0.08, active bg 0.08, border 0.18 (the light token
   values), ink rgb(168,85,247). These are an INTERIM local copy, marked
   in the file, until the scene lane appends to its 09 :is() lists:
     well   .refract-list-sheet .refract-seg
     item   .refract-list-sheet .refract-seg button
     active .refract-list-sheet .refract-seg button.is-on
   After that, everything but geometry (36 tall, 3px padding, 2px gap,
   items 40 min x 28, 0 10 padding) comes out of 12.

Ledger confirmation: the restore at 28957f2 copied css/10_pills_badges.css
ONLY (DEPLOYED_FROM.txt line 330); every copy this lane has made carries a
ledger line, and this lane has never copied css/08_misc_mid.css.

### Segments on the canonical rules (scene-panel-d 03820b4)

Commit 6689d97: 12 keeps only geometry for .refract-seg (display, 36
tall, 0 3px side padding, box-sizing, flex) and its buttons (40 min x 28,
0 10 padding, tabular numerals, a transparent 1px border and background
as the button reset); the well fill and rim, the 3px vertical padding and
3px gap, the item radius, type and ink, and the active state all come
from 09's three canonical rules, which now list the sheet's selectors.
Deployed css/12_mobile.css d815cf4c5e64 (09 at 03820b4 was already
deployed as 556876f1b07a). Re-measured (c-seg-390.json,
c-seg-light-390.json): sheet 366x484.4 at y268.6 (unchanged); six rows
352x48; wells 91 / 177 / 91 x 36 with padding 3 and gap 3, --fill-1 on a
0.08 --fg-rgb rim, 12px; every segment 40x28 at 11.2/600, 9px (the type
step from 12.25 to 11.2 changed no box because the 40px minimum governs;
"120" still fits); active bg 0.12 / rim 0.28 / glow + inset dark, 0.08 /
0.18 light, ink accent-bright dark and rgb(168,85,247) light.

### Re-measure after entity-pages 35c9f84 and scene-panel-d e59eb71

Merged at a8738d9; 09, 10 and 12 were all deployed at this tree's
versions, so the live build is the merged tree. Nothing moved
(r-badge-*, r-seg-*, r-top-*, r-end-* JSON, 390 and 430, dark and light):
badge 28.8x24 in the 48 row, --fill-3 (dark 0.05 / light 0.067), 1px rim
(0.12 / 0.10), 11.2/500, pill, no blur; segments 40x28 at 11.2/600 in 36
wells (fill-1, 0.08 rim, pad 3, gap 3), active tint + glow rim + glow in
both modes, sheet 366x484.4, rows 48; toolbar 345/385x44 at y23 with the
search field 200.4/240.4 (fill-2), filter 44 (22 0 0 22), sort 92.6
(12.25/600), caption 20 tall; stuck at y12 with the plate on; pager row
366/406x44 at the page end, circles 44 (50%), label 112 (pill), all
fill-2 (0.04 / 0.055); dock 344x58 -> 302x49. The 12 badge rule at
(0,3,1) now outranks the (0,2,1) recipe, but it carries only order,
min-width, box-sizing, tabular numerals and text-align, so nothing of the
recipe is overridden. No change to 12; nothing copied.

### Harness trap found and closed: cross-lane attach on port 9223

The "light anomaly" (runs pinned dark coming back light, localStorage
"1", server "0") was never refract: every lane's probe binds
--remote-debugging-port=9223, so when two lanes probe at once a run
attaches to the OTHER lane's Chrome, and at the same 390x844 the viewport
check cannot tell. Diagnosed with r-mode-dark.json (stored "1" under a
"0" pin = another lane's pre-light session). build/m.sh now stamps
window.__mobileLane from its prescript and wraps the expression so a
document without the stamp returns {vw:-1, foreign:true} and the run is
retried; probe.js untouched. Re-run under the guard: r-mode-dark2 is dark
(stored "0"), badge r-badge-390b in dark = --fill-3 0.05 / rim 0.12 /
11.2/500 / 24 tall, unchanged. The earlier re-measure values above stand
(the light-tagged runs were genuinely light sessions; the geometry is
mode-independent and matched in both).

### Harness corrections (coordinator, 2026-09-04)

- Kill rule: my two clean-ups today filtered processes by the
  refract-probe-<pid> profile path and port 9223, which every lane's
  probe uses, so they will have killed other lanes' runs (and the scene
  lane's identical sweep killed one of mine). Withdrawn: from here this
  lane kills nothing it did not spawn. build/m.sh never kills; a hung run
  is left for its owner and reported.
- tools/measure/stamped.sh is the shared per-run-token wrapper (refuses
  foreign windows, retries); it drops the screenshot until the Ascension
  lane adds a shot argument. build/m.sh keeps its own stamp meanwhile.
Nothing outstanding for this lane; the round closes after the performer
lane's last deletion and the Ascension lane's parity.
