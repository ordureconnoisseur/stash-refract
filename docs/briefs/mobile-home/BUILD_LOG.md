# Mobile Home tile

Lane `mobile-home`, branch `mobile-home`, forked from the ship branch at
`4129377`.

## The fault

Below phone widths Refract does not shrink the desktop navbar, it replaces it
(6.11), and `css/12_mobile.css` hides `nav.top-nav` entirely. Stash keeps its
only route to the home page on that navbar, and not as a menu item: the brand
`<a href="/">` is the whole of it. The mobile drawer and the dock are built
from `MOBILE_NAV_ITEMS` plus whatever the navbar scan harvests, and neither
produced a Home tile, so on a phone there was no way to reach `/` at all.
Reported on the forum, thread 7183, post 204.

Measured on the baseline build: `nav.top-nav a[href="/"]` count 1, drawer rows
`/images /groups /galleries /scenes/markers /stats /settings` plus three plugin
tiles, no `/`.

## What shipped

`refract.js` only. No CSS changed: the drawer row and the dock slot are
existing components and the tile is purely additive.

- Home joins `MOBILE_NAV_ITEMS` as the first entry, so it renders as the first
  Library row of the More sheet and, because `refractDockCandidates()` harvests
  the drawer, becomes a candidate in the Edit dock grid.
- `MOBILE_DOCK_DEFAULT` is untouched. The default dock is still
  scenes, performers, studios, tags.
- New `home` glyph in `MOBILE_NAV_ICONS`: 24 viewBox, `fill="none"`,
  `stroke="currentColor"`, width 2, round caps and joins, with one
  `fill="currentColor"` door. Same family, same weight and the same one solid
  accent detail the scenes, images, markers and tags glyphs carry (6.12).
- The tile carries `always: true`, emitted as `data-always-on="1"`, and the
  disabled-route pass in `refractAppendPluginDrawerTiles` skips it. Every other
  hardcoded row is hidden when its route is absent from the live navbar,
  because that is how a user disabling a menu item reads. Home is not one of
  Stash's `menuItems`, so its absence from that list means nothing about it.

Commit `61edd55`, CR-stripped sha256 of `refract.js` `224117ccd55e587b`.
Baseline for the before numbers: `4129377`, `0fce3201a9ee8960`.

## Measurements

Harness: `tools/measure/stamped.sh`, `PROBE_LANE=mobile-home`, port 9223,
authproxy on :9998. Route `/scenes`, drawer opened from the dock burger.
Build fingerprints: baseline `527d1a575b69`, shipped `ae371d764d14`.

### The Home row, all four conditions

390x844 and 430x932, dark and light, all four identical:

| | Home | every neighbour |
|---|---|---|
| row height | 48 | 48 |
| icon tile | 36 x 36 | 36 x 36 |
| glyph | 20 x 20 | 20 x 20 |
| row x / w at 390 | 19 / 352 | 19 / 352 |
| row x / w at 430 | 19 / 392 | 19 / 392 |
| group | library | library |

It sorts first in the Library band (y 183.78 at 390, the band label at 152.67),
and its label reads "Home".

### Nothing else moved

The sheet is bottom-anchored, so it grew upward by exactly one row: drawer
height 603.33 to 653.33, top 149.67 to 99.67 at 390 (237.67 to 187.67 at 430).
Every pre-existing row kept its absolute position and size to the hundredth of
a pixel:

    /images /groups /galleries /scenes/markers /stats /settings
    /plugin/forage /plugin/binge action:ascension
    dx 0.00  dy 0.00  dw 0.00  dh 0.00   (all nine, all four conditions)

The dock with the default selection is byte-identical before and after:

    390: /scenes 33/64.8  /performers 97.8/64.81  /studios 162.61/64.8
         /tags 227.41/64.8  burger 292.2/64.8
    430: /scenes 33/72.8  /performers 105.8/72.81  /studios 178.61/72.8
         /tags 251.41/72.8  burger 324.2/72.8

### Home pinned to the dock

Selection `["/","/scenes","/performers","/studios","/tags"]`, six slots with the
burger, seeded before boot and read back through Refract's own path:

| | 390x844 | 430x932 |
|---|---|---|
| Home slot | 54 x 56 | 60.66 x 56 |
| every other slot | 54 x 56 | 60.66 / 60.67 x 56 |
| glyph, all slots | 26 x 26 | 26 x 26 |
| `--dock-count` | 6 | 6 |

Home takes the first slot. Its drawer row is stamped `data-in-dock` and hidden,
so the sheet stays "everything else" with no duplicate. Same in dark and light.

### The Settings grid

Settings > Interface > Refract > Mobile dock, at 390x844:

- 14 candidates, Home first.
- One distinct tile size across all 14: 37.8 x 37.8, glyph 17.5 x 17.5. Home is
  not an exception.
- Clicking it writes `refract.dockItems` =
  `["/scenes","/performers","/studios","/tags","/"]` and rebuilds the dock in
  place: `Home[/] Scenes Performers Studios Tags All pages`.
- The server sync payload carries the same array, captured from the
  `configureUISetting` mutation body, so a pinned Home survives a reload and
  reaches other devices. Every probe swallowed that mutation rather than
  sending it: the live server's `refract.dockItems` was absent before the run
  and absent after it.

### The tap

At 390x844 dark and 430x932 light, from `/scenes`:

| | drawer row | dock tile |
|---|---|---|
| `location.pathname` after | `/` | `/` |
| body route class | `stash-route-home` | `stash-route-home` |
| home rows rendered | 6 | 6 |
| drawer closed | yes | n/a |
| dock items lit | none pinned | Home only |

Navigation is the existing pattern, `pushState` plus a `PopStateEvent`, shared
with every other tile. The `"/"` href cannot over-match a route: the active
tests are `path === href` or `path.indexOf(href + "/") === 0`, and the second
looks for `"//"`, which no route contains. Confirmed at `/scenes`, where Home
is inactive and Scenes is lit.

## Screenshots

`shots/`, named `<phase>-<width>-<mode>.png`.

- `before-*` and `after-*`: the More sheet on the baseline and shipped builds.
- `dock-*`: Home pinned, all four conditions.
- `tap-drawer-*`, `tap-dock-*`: the home page after the tap.
- `settings-grid-390-dark.png`: the Edit dock grid with Home lit.

## Left open

`refract.yml` is not version-bumped. This lane does not ship; the overseer
reconciles the version with the other lanes.
