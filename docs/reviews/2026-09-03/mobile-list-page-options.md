# Refract mobile: list page options (pager and toolbar)

Canvas: https://claude.ai/code/artifact/f3681f8f-6586-4a5e-80a3-b5b6809f58a2
Working files: `pager/build-pager.mjs` generates the sixteen `.dc.html`
artboards and `canvas.json`; `pager/render.sh` renders previews with headless
Chrome into `pager/preview/`. Re-run `node build-pager.mjs`, then re-seed.

Everything on the boards uses the shipped dock (BUILD_LOG slice 1 and the
polish round): capsule 344x58 at inset 23, bottom max(23px, safe-area);
contracted 302x49 at inset 44, bottom 28; fill rgba(var(--surface-rgb),0.72),
rim --glass-border, blur 24px saturate 140%, --shadow-navbar, active pill
--accent-tint. Cards are today's cards at today's sizes (171 two-up, 349
one-up). Nothing on a card changes.

## Why the last two builds were rejected

- The slab (s6d): a 247-wide rectangle with 12px top corners lapping the
  capsule by 14px. Two shapes, two radii, one overlapping the other. It read
  as a mistake in stacking, not as a design.
- The weld (p-after): a 344-wide tier joined to the capsule with a shared
  outline. One object with two jobs; the pill radius on top and the capsule
  radius below made it read as a lozenge with a bite out of it.

Both tried to make the pager and the dock ONE thing. The user's words were
"integrate visually", which means a shared language, not a shared outline.

## The pager: four options

Fixed facts respected by all four: three controls on phones (previous,
"1 of 3,281", next), every control 44px, four-digit totals fit ("1 of 3,281"
at --fs-md 600 tabular measures 78px of ink inside a 112px minimum label;
"3,281 of 3,281" is 112 exactly), the page-jump is a tap on the label, the
dock is untouched, and the grid's last row never hides under either state.

### Option 1: sibling pill (boards A, F)

A second capsule above the dock in the dock's material: 48 tall, padding
0 6, content-sized (212 for "1 of 32": 44 + 112 + 44 + 12), centred, pill
radius, surface 0.72 fill, glass-border rim, 24px blur. Its shadow is
--shadow-lg, not --shadow-navbar: the accent halo stays the dock's alone, so
the pair has a hierarchy by size and by glow. Air between them: 10px (pill
bottom edge 753, capsule top 763), the same 10 the More sheet already keeps.

States. Dock expanded: pill present. Dock contracted (scrolling down): the
pill drops 12px and fades to 0 over --dur-settle --ease-glide (it is leaving,
no overshoot), pointer-events none. It returns with the dock on scroll-up,
tap, y under 80, and, new, when the document end is within 80px, so "next"
is present when you finish a page. Content pads by 146 (7 + 48 + 10 + 58 +
23) instead of 88.

Page jump. Tapping the label turns it into a numeric field in place (36 tall
inside the 48 pill, fill-3, an accent inset ring, inputmode numeric,
enterkeyhint go); "of 3,281" stays as the suffix; the right chevron becomes
Go. Enter or Go navigates and scrolls to top; blur or Escape restores the
label. Both capsules are positioned from the bottom so they ride the visual
viewport when the keyboard opens.

- Reach: thumb zone; prev, next and the jump are one tap, always.
- Clash with the dock: none. Same material with air; no halo of its own.
- Cost: 58px more grid covered while expanded. Paid only while not reading,
  because the pill leaves on scroll-down. Light: fill 255,255,255 at 0.72,
  rim rgba(0,0,0,0.10), chevron ink rgba(0,0,0,0.80).

### Option 2: in flow at the end of the grid (board B)

A 44px row after the last cards, in the toolbar's control material (fill-2,
glass-border rim, pill radius, no blur, no shadow): it is content, not
chrome. It sits above the footprint like any last row, so the dock never
meets it. The top caption ("1-40 of 1,245") would need to become a link that
scrolls to it, or the jump is unreachable from the top.

- Reach: only at the end of the page. A jump from page 1 to 200 means
  scrolling 40 cards first.
- Clash: none.
- Cost: no prev/next mid-page; a 40-card scroll to reach the pager.

### Option 3: in the sticky toolbar (boards C, H3)

Tier 2 of a two-tier plate (28px radius: 44 control + 6 padding, concentric
with the pill controls inside) carries prev, label, next on the left and the
cards-per-row toggle plus More on the right. The bottom holds the dock alone;
content pads by 88.

- Reach: top of the screen, the worst zone one-handed on a 6.1 inch phone.
- Clash: none at the bottom; instead 98px of permanent sticky chrome on top.
- Cost: it grows the surface the user has just rejected.

### Option 4: page chip and sheet (board D)

A 30px chip ("12 / 3,281", --fs-sm 600 tabular) in a 44 hit area, anchored
8px above the capsule's top-right corner, riding the contraction (26 tall at
inset 44). Tapping opens a sheet in the More sheet's language: prev, a
number field with the total as its suffix, next; then First page, Last page,
Go.

- Reach: thumb zone, but prev and next are two taps.
- Clash: smallest footprint of the four.
- Cost: next page, the most used control on a 3,281-page list, loses its
  one-tap status.

### Recommendation: Option 1

It is the only option that keeps prev, next and the jump one tap away in the
thumb zone AND answers the rejection literally: two objects in one language.
Its cost is paid only when the pill is not needed. Options 2 and 3 move the
pager to where the thumb is not; option 4 buries the most used control.

Build notes for slice 6b: the live `.pagination` row becomes the pill (no
React nodes move); First/Last stay display:none on phones; `body:has(
[data-pager-row=float])` and the capsule's square top corners go away, the
capsule is a plain pill again; the tier's hairline divider goes; the pager
gets `--z-pager` as before and its own --shadow-lg; the contracted rule adds
`translateY(12px); opacity:0` under `body.refract-dock-contracted`; the scroll
controller gains the end-of-document expand (mirror of near-top). Content
padding-bottom becomes footprint + 48 + 10 + --gap-md.

## The toolbar

### As it is (board G)

Three materials on one bar: a filled pill (search, Random), bare glyphs
(filter, bookmark, dots) and bare text (40). Sort is two objects with a 12px
radius beside the search pill's 9999. The second line is three right-aligned
glyphs with no plate and no relationship to the row above. 98px of sticky
chrome for controls used once per visit. It reads as leftovers because it
is: eight Stash controls kept alive at 44px each, then pushed onto two rows.

### H1: one tier, one sheet (boards H1, H1 sheet, H1 scrolled)

One 44px tier: the search field (flex 1, fill-2, glass-border, pill,
magnifier at 14, placeholder "Search performers") and one grouped pill
holding filter (44 wide) and sort (label --fs-base 600 with a 14px chevron)
split by a hairline. Under it, one caption line at --fs-sm muted: "1-40 of
1,245" left (range in --text 600), "40 per page" right. Everything else
moves into a sort sheet with the More sheet's rows in four groups: Sort by
(field, direction segmented), Saved filters (chips), View (per page 20/40/60/
120 segmented; cards per row 2/1 segmented), Actions (select, list
operations). The sort half opens the sheet; the filter half opens Stash's
own filter editor.

Sticky: the caption scrolls away with the page. The tier stays and gains the
chrome material (surface 0.72, blur, --shadow-lg) as a 56px pill with 6px of
padding around the 44px controls, the same move the desktop navbar makes.
It drops back into the page when y is under 80.

The cards-per-row toggle lives in View beside per page because it is the
same kind of choice, set once. If the user wants it one tap away, H2 is the
option that keeps it on the bar.

### H2: two tiers in one plate (boards H2, H2 scrolled)

The same first tier inside a 28px-radius plate with a second tier: the count
on the left, and the demoted controls as 36px chips in one material on the
right (saved, 40, cards per row, More). Scrolling down folds the second tier
away and the plate becomes a pill. Keeps every control one tap, one
material; costs 104px at rest and a second row of small chips that still
asks the eye to sort seven things.

### H3: tier 2 carries the pager (board H3)

The toolbar for Option 3. Both tiers stay sticky because the pager is the
reason for the second. Same reach cost as Option 3.

### Recommendation: H1, with the sibling pill (board I)

The list page then reads as one system: chrome (the sticky tier, the pager
pill, the capsule) is the dock's material at three sizes; in-page controls
(field, group, chevrons, label, sheet rows) are fill-2 pills; content runs
under the chrome at both ends. Vertical rhythm: 16 to the tier, 44 tier,
--gap-md 8, 20 caption, --gap-lg to the first row, 8 grid gap, 146 bottom
padding. Every control is 44.

Build notes: the tier is the existing sticky toolbar with its ::before pill
narrowed to 56 tall and only painted under `body.refract-toolbar-stuck`
(scroll y over 80, set by the same controller as the dock); the sort label
and direction buttons render as one group via the descendant selectors
already in place (the btn-group is display:contents); tier-2 controls get
display:none on phones and are re-homed into a sheet that reuses the drawer's
row styles, with the per-page select and the cols toggle as segmented rows.
The sheet needs one new injected surface (like the cols toggle), no Stash
nodes moved.
