# Refract mobile overhaul: design brief

Canvas: https://claude.ai/code/artifact/f73a2a65-30c0-4472-b6dd-4af121c40fbd
Working files: `build.mjs` generates the nine `.dc.html` artboards, `canvas.json`
and reads `img/*.jpg` (crops of the live screenshots). Re-run `node build.mjs`
then re-seed to change anything.

Current-state captures (390x844 and 430x932, plus drawer-open, scrolled and
light-mode shots) are in this folder: `home-*.png`, `performers-*.png`,
`performer265-*.png`, `scene17783-*.png`, `home-drawer-390x844.png`,
`home-light-390x844.png`.

## 1. The binge-ios pattern, extracted

Source: `C:\Users\ethork\Projects\binge-ios\binge\Views\Shared\BingeBottomNav.swift`,
`NavChrome.swift`, `NavPreviewHarness.swift`, `RootView.swift` (lines 50, 123,
139-142), and the commit bodies of `ed6631d`, `919c3f3`, `54a3899`, `18dade4`,
`269ab97`, `64173c4` / `2c25c83`.

Geometry (measured off a matched pair of reference shots at 3px/pt on a 393pt
screen, then rounded; `919c3f3`):

| | expanded | contracted |
|---|---|---|
| width | 344 | 302 (side inset 23 vs 44) |
| height | 58 | 49 |
| gap above physical bottom | 23 | 28 |
| icon | 26 | 22 |
| active pill | 74 x 50 | 63 x 41 |
| row end padding | 9 | 8 |

Hierarchy and placement:
- A capsule that FLOATS over content, not a bar content stops above
  (`ed6631d`). Content pads by a fixed `footprint` = 23 + 58 = 81 so the bar
  shrinking can never reflow a feed (`54a3899`). `safeAreaInset` was tried and
  reverted; the ZStack ignores the bottom inset and the capsule sits IN the
  home-indicator zone (`18dade4`, `f8b0487`).
- Five slots, icons only, no labels. The current item is ONE tinted glass pill
  (`.white.opacity(0.22)`) that slides between slots; five conditional pills
  never animated, a single element whose offset changes cannot fail
  (`269ab97`). Filled icon variants where they exist; otherwise the pill alone
  carries the active state.
- Motion (`NavChrome.swift`): direction, not activity. Scroll down more than a
  5pt deadzone contracts; scroll up, y < 80 (nearTop), or a tap expands.
  Resize spring response 0.34 / damping 0.82; pill travel 0.42 / 0.78. Same
  constants as the web plugin's `useAutoHideTabBar`.
- Many destinations: the fifth slot is Menu, a page of labelled rows (title,
  subtitle, icon), not a tile grid (`MenuPage.swift`).
- Under the reel's scrub bar a frost band runs to the physical bottom so the
  caption and nav sit on a frosted strip, not raw video (`64173c4`).

## 2. What Refract does today (from the captures)

- Edge-to-edge opaque dock, 64px tall, `rgb(28,26,33)`, hairline top, four
  routes + burger (`12_mobile.css` 222-315; `refract.js` 5093-5180). Settled in
  DESIGN_SYSTEM 6.11 as "imitate the platform's chrome"; NOT in section 8, so
  this proposal is allowed to re-open it.
- Burger opens a 13-tile icon grid with no labels (Scenes, Images, Movies,
  Galleries, Markers, Performers, Studios, Tags, Stats, Settings, Forage,
  Binge, Ascension). Drawer y=174 to 771.
- Floating pager lands on top of the cards on every list page.
- Home: uppercase tracked section heads; scene card 320 wide showing 1.1
  cards; performer cards ~220 wide with four stat pills over the portrait.
- Performer 265 (Ai Uehara): 200px card on top, name at y=380, seven action
  buttons in three rows, standing row, stars 3.8 + Ascension 8, 2-up detail
  grid, eight-row Ascension ladder, tabs wrap to two rows, then the grid.
- Scene: player inside the 12px gutter with 16px radius; title panel; Advanced
  Rating "PERFECT 5" pill; six tabs at --fs-sm in one row; sparse details.

## 3. The boards

Accent on every board is a tweak (purple default because that is the preset
the live captures run; orange, blue, pink as swatches). Tokens are lifted from
`css/01_tokens.css`; light values follow 3.2's matched-lift alphas.

1. **Dock: states** (`Main.dc.html`). Refract's desktop navbar material
   (--glass-bg, blur 24 sat, --glass-border, --shadow-navbar) in capsule form at
   binge-ios's exact geometry. Active pill = --accent-tint with a 1px accent
   inner rim and the 14px glow the current dock already uses; active icon =
   --accent-ink (flips in light). Three bands: expanded, contracted, pill in
   flight. Decision: one visual language for chrome on every width; the settled
   "platform chrome" trade in 6.11 is what this replaces.
2. **Dock: More sheet** (`DockMore.dc.html`). Rows with labels in three groups
   (Library, Plugins, Stash), rising from the dock with the page scrimmed;
   "Edit dock" in the sheet header exposes the existing dock-config setting
   where people actually need it (P8). The More icon morphs to a close mark.
3. **Home** (`Home.dc.html`) and **Home, light** (`HomeLight.dc.html`). Section
   heads at --fs-lg 600 with a 44px chevron; scene cards 300 wide (next card
   peeks 66px, the touch affordance); description clamps to 2 lines; performer
   cards 168 wide, stats move off the artwork into a 36px footer (P7). The
   third head is the user's real saved filter "fav". Content runs under the dock.
4. **Performers grid** (`Performers.dc.html`). Toolbar = search field + filter +
   sort, all 44px, with "1,245 performers / 40 per page" as a quiet line;
   2-up cards at 179; tier frames kept (Cali Carter bronze); pager is a compact
   capsule above the dock that hides with it.
5. **Performer page** (`Performer.dc.html`, `PerformerBelow.dc.html`). Card
   128x192 beside the name; Edit + favourite + link + kebab (Auto tag, Merge,
   Submit to Stash-Box, Better image, Back image, Delete live in the kebab, P6);
   standing row as three stat cells; 2-up detail grid with hairlines; Ascension
   as a four-cell strip plus the last match row; tabs one scrolling row of
   --radius-sm tabs (6.23). The scrolled board shows the contracted dock.
6. **Scene page** (`Scene.dc.html`). Edge-to-edge player; title at --fs-xl
   clamped to 2 lines; one wrapped meta row (studio, date, duration, res/codec,
   size); rating row directly beneath (stars at 32x44 tap, o-counter,
   favourite, kebab; Advanced Rating's pill goes first in this row when the
   plugin is present, and nothing is reserved when it is not); tabs scroll;
   tags wrap fully. Data is scene 2578 (Hazel Moore, Porn World) because 17783
   had one tag and no studio, which hides the layout rules.
7. **System** (`System.dc.html`). Type scale, gap ladder plus the two mobile
   insets, radius ladder, the 44px tap floor made explicit (dock slot 65x50,
   30px chip inside a 44 hit area, 40px tab in a 44 row), safe-area cross
   section (`bottom: max(23px, env(safe-area-inset-bottom))`, footprint 81),
   and the motion table mapping binge's springs onto --dur-settle / --dur-slow
   with --ease-spring, plus reduced-motion and reduced-transparency tiers (P5).

## 4. Open questions

1. 6.11 says the platform-chrome dock trade is settled. This proposal reverses
   it on the strength of binge-ios. Confirm you want to re-open it.
2. Contracted-state trigger on the web: scroll direction on `window` vs the
   page's own scroll container; Stash pages scroll the document, the scene
   player does not. Which surfaces should never contract (player fullscreen,
   lightbox, drawer open)?
3. Should the pager fold INTO the dock on list pages (a sixth slot) or stay a
   separate capsule that hides with it, as drawn?
4. Home: keep Stash's Title Case heads (P4, CSS cannot recase) or accept them.
5. Performer actions: is Delete acceptable inside the kebab (bottom, red)?
6. Scene: when Advanced Rating is present its pill replaces the star control in
   the rating row; when both plugins are present, which one owns the row?
7. Light-mode glass values for the capsule are approximated here
   (`rgba(255,255,255,0.55)` fill, `rgba(0,0,0,0.08)` rim); measure against
   `14_light.css` before building.
8. Ascension: the stat strip assumes the plugin's DOM exposes matches, wins,
   losses and streak as separate nodes; verify against the live markup.

## 5. First build slice

The dock alone, CSS-first in `12_mobile.css` on the existing
`.refract-mobile-dock` / `.refract-dock-item` DOM (P4: no new state):
1. Capsule geometry and material (expanded only), footprint padding 81 +
   safe-area, pager lifted above it.
2. One `.refract-dock-pill` element injected by `refractRebuildMobileDock`,
   positioned from the active index via a `--dock-active` custom property;
   `left` transitions with `--dur-slow var(--ease-spring)`.
3. Scroll-direction contraction as a body class (`refract-dock-contracted`)
   set by a passive scroll listener with the 5px deadzone and 80px near-top,
   guarded by `prefers-reduced-motion`.
4. Measure both states with `tools/measure/probe.js` at 390x844 and 430x932
   before touching the More sheet.
The More sheet (labelled rows) is slice two; the page boards are slices three
onward and are independent of each other.
