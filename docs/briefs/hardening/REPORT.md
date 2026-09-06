# Hardening pass: the ship candidate on a clean Stash

Lane `hardening`, 2026-09-06, branch forked from 4129377. The lane's rig could
not write this file, so the overseer placed it; the findings, numbers and
commit hashes are the lane's own.

## Why

1.24.0 shipped a ReferenceError that blanked Stash for every user whose card
preview fell back to its mock. Every gate in this repo measured the author's
own instance: a large library on a current Stash, where fallbacks and empty
states never run. This pass measures the opposite instance.

## The fixture

Clean Stash container `binge-fresh` on the Mac mini (port 9998 on the mini,
tunnelled to the PC on 9997). Stash v0.31.1, no auth, no StashDB key.
Library: 15 scenes, 2 performers (no image, no rating, no birthdate, no
country), 3 tags, 0 studios, 0 groups, 0 images, 0 galleries. Plugins: binge
0.12.1 and the Refract candidate. Every deploy to the fixture was verified by
CR-stripped sha256 against the commit's blob.

Fixture state changed and left: `lastNoteSeen` set so the release-notes
modal stays dismissed; `ui.refract` and `ui.ratingSystemOptions` cleared back
to null (a never-touched install); binge disabled and re-enabled once. No
media, performer, tag, studio, group or scene created or destroyed.

## The rig

Own copies of probe.js on ports 9224 and 9225, `PROBE_LANE=hardening`,
`REFRACT_DEPLOY` pointed at a local mirror of what was copied to the mini.
Every run carried a prescript installing `window.__errs` before the first
page script; every expression returned the error list, `#root` child count,
horizontal overflow, and the themed body class.

## What was walked

17 surfaces at 1440 dark, 17 at 390 dark, 10 at 1440 light, 6 in lite, 4
with binge disabled, then the same after the fixes: `/`, `/scenes`,
`/performers`, `/studios`, `/tags`, `/groups`, `/images`, `/galleries`,
`/scenes/markers`, `/scenes/1`, `/performers/1`, `/tags/1`,
`/performers/new`, `/scenes/new`, `/stats`, `/settings?tab=interface`,
`/settings?tab=plugins`. Interactions: all eight accent swatches, lite and
light on and off, every card-style segment, Plain card, Shuffle, Reset card
customiser (with `window.confirm` stubbed), the mobile burger and drawer, the
list toolbar sheet on a populated and an empty list, all six scene tabs, and
the settings panel with the preview query blocked so the mock fallback
renders.

Result: no uncaught errors, no unhandled rejections, `#root` never emptied,
no horizontal overflow, the themed class present everywhere. The 1.24.1
fallback fix holds. Five findings, all correctness or presentation, all fixed.

## Findings and fixes

F1. A fresh Stash is on stars and Refract read it as decimal. Stash defaults
`ui.ratingSystemOptions` to stars with full precision and only writes the key
once changed; Refract read the missing key as decimal, so card banners sat on
the 0-10 scale while the app was on 0-5, and one click on Stars wrote
`starPrecision: tenth` on an instance that never had one. Fixed in 5445213:
missing key reads as stars, full precision is the fill.

F2. The scope control on a tag page drew a switch between two views of
nothing (0 scenes either way). Fixed in 0874cfe: the control is not drawn when
both counts are zero.

F3. The mock preview drew both cards stacked and the Scene / Performer switch
did nothing, because the stage rules key off `.refract-preview-cards` and the
fallback set its HTML one level up. Fixed in 1ceeab6: the fallback renders
inside the same wrapper, and the switch flips the mocks.

F4. `/scenes/new` kept Stash's raw blue-grey Save bar: Refract's rules were
scoped under the scene tabs wrapper, which the standalone create page does not
have. Fixed in cc9030c.

F5. The performer page's placeholder portrait was never recoloured. In light
mode the white silhouette sat on a white plate (1.00:1) and took the white
name banner with it (1.04:1). The first attempt (19c8f7b) targeted the img,
which the Refract layout hides; the painted face is a div with the URL as a
background image. 8ef31b5 marks that face in JS when the URL carries
`default=true`. After: 1.78:1 in light, 1.77:1 in dark, banner ink 8.7:1.

## Observations, not changed

O1. Performer stat pills read three dashes out of four on a performer with one
value: documented design (`anyStat`); changing the threshold is a ruling.
O2. Empty list pages are a toolbar over a void: Stash's own empty state; no
Refract element with nothing behind it was found there.
O3. The scene Details tab is empty on a scene with no data; the panel's
height comes from the player column.
O4. The playing-card name banner reads as an outline in light mode over a
pale ground (8.7:1, legible, not the intent). Lives in 16_playing_card.css;
routed to the entity-pages lane.
O5. On the mock card the studio overlay sits under the tier ribbon and reads
as clipped text; real cards put a logo there and do not collide.
O6. Reset card customiser opens `window.confirm`, which blocks CDP; stub it to
drive it.
O7. Rig hazard: a probe Chrome left alive from a light run poisons the next
dark run on the same port and writes light to the server. Kill the Chrome
whose profile you own before switching modes on a port.

## Not exercised

Studio, group, gallery and image detail pages (the fixture has none);
the advanced-rating drawer in its installed state; the lightbox, the player's
own controls and multiview-player.css; real touch input; the page after the
Reset reload (verified through the server config instead).
