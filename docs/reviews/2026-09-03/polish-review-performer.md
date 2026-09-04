# Refract performer page: polish review, 2026-09-03

Read-only review of the performer lane's last two days (band + detail grid,
edit form, card country flag chip, font swap, mutation watcher) plus the
Ascension section as a neighbour. Everything below was measured on the live
Stash behind the :9998 auth proxy with the harness; nothing was judged from
the CSS source. Screenshots and JSON sit beside this file.

## 1. What was measured

Deploy dir `C:\Users\ethork\.stash\plugins\refract\`, per DEPLOYED_FROM.txt
(last entries, 2026-09-03):

| File | Deployed from |
|---|---|
| refract.js | ascension-reconcile's refract.js + entity-pages **5f768d8** (six hunks, patch -F 3) |
| css/08_misc_mid.css | entity-pages **30a6026** + ascension 05d2a0f hunk (= ascension-reconcile f955d68, byte-identical) |
| css/03_cards.css | entity-pages **3fad07f** (verified == entity-pages HEAD, CR-stripped) |
| css/16_playing_card.css | entity-pages **1df2148** (verified == HEAD) |
| css/13_plugins.css | ascension-reconcile **9581811** |

Verified myself: 03_cards and 16_playing_card equal entity-pages HEAD after
`tr -d '\r'`; refract.js, 08 and 13 differ from entity-pages HEAD exactly as
the ledger says (they carry the ascension lane's work).

Rig: `probe8.js` (a scratch copy of tools/measure/probe.js adding
PROBE_DSF, PROBE_CLIP, PROBE_FULL and PROBE_PIXELS; the repo copy is
untouched). Contrast numbers are WCAG ratios of the computed ink composited
over the MEDIAN rendered ground sampled from a 2x screenshot inside the
element's own box (`pix.js`); "worst" is the same ink against the darkest or
brightest decile of that ground, which is what the veil over a portrait does.
Light mode used the lane's pre-light.js (genuinely on, no config writes).
Test performers: 1732 Kesha Ortega (untiered, 8 URLs), 265 Ai Uehara (gold,
Ascension payload), 786 Scarlet Chase (PERFECT tier, two Stash IDs, long
tattoos), grid /performers and home carousel with the flag form pinned via
pre-flag.js.

## 2. Findings, most important first

### F1. The action bar runs over the name row between 1201 and about 1360px wide
- Surface: band, view mode. Width 1300 and 1250. Both modes (layout, not colour).
- Measured (1300): link icon [637.3, 100.5, 26.6] and twitter [670.9, 100.5, 26.6]; Edit button [635.3, 111, 44.2 x 28]. Edit paints over both icons. At 1250 Edit is at x 585 and covers all three icons, 8px from the end of the name (593). At 1400 there is 38px of clearance; at 1200 the head goes one-column and the problem disappears. The bar's left edge moves at vw - 665, the icons end at 697.5, so the collision window is 1201 to ~1362.
- Screenshot: `v1732-1300-dark.png` (2x).
- Rule: 10.3 "survives at the narrow width", 3.6.
- Fix: either raise the one-column breakpoint to 1360, or let the action bar wrap under the name row when the two would meet (flex-wrap on the head row with the bar `flex: 1 0 auto; min-width` of its natural width).

### F2. Edit mode in light: the action plate stays a dark island but its ink flips dark
- Surface: edit form, top `.details-edit` plate. 1600, light.
- Measured: plate background rgba(14,13,16,0.92) in both modes; in light its inherited `color` is rgba(0,0,0,0.88). Cancel measures 1.26:1 (ink 14,12,18 on 41,33,50). "EDITING / Kesha Ortega", Clear Image and Save have no ink distinguishable from the plate at all (the pixel pass found no ground/ink separation). Dark is fine (Cancel 6.22).
- Screenshot: `epix-1732-light.png` (2x), `e1732-1600-light.png` (full page).
- Rule: 3.1 rule 4 (a dark island re-pins --text / --text-muted / --fg-rgb; the card-back fix 25436d7 is the recipe), 3.9.
- Fix: pin the plate's ink tokens inside `.refract-pe .details-edit` for `.refract-light`, or let the plate take the light surface family like the rest of the form.

### F3. Below 1200 the band's side padding collapses to 2.5px
- Surface: band, one-column head. 968, 807, 600. Both modes.
- Measured: Bootstrap `.row` keeps `margin: 0 -15px` and the head col no longer offsets it. 968: grid right edge 938.5 vs band right 941 (2.5px) while the card sits 17.5 in. 807: 777.5 vs 780. 600: name x 29.5 vs band 27 and grid 29.5..570.5 vs band 27..573, i.e. 2.5px on both sides while top and bottom keep 17.5. At 1600/1300 the inset is 16.5px, as intended.
- Screenshots: `v1732-968-dark.png`, `v1732-807-dark.png`, `v1732-600-dark.png` (tiles touching the rounded band edge).
- Rule: 3.6, 10.3 narrow.
- Fix: at max-width 1200 set `.refract-ph .detail-container > .row { margin: 0 }` (or pad the head col 0 15px) so the 17.5px inset holds on all four sides.

### F4. Primary-button ink on the band fails the reading floor on warm portraits
- Surface: band action bar, Edit and Submit to Stash-Box (`rgb(192,132,252)` on a 0.12 accent fill over the veil). Dark.
- Measured against the rendered ground: 1732 @1300 Edit 3.75:1 (ground 91,57,70; worst decile 2.99); 786 @1600 Submit 3.78 (Edit 4.71); 265 @1600 Edit 4.48; 1732 @1600 Edit 5.40 / Submit 4.87 (worst 3.88). The 0.12 fill is too thin to be a ground of its own, so the number is whatever the portrait behind happens to be. Delete at 3.70 is the ruled reference and is not this finding.
- Screenshots: `v1732-1300-dark.png`, `v786-1600-dark.png`.
- Rule: 3.9 (measured against the ACTUAL rendered ground; the band's veil case is the worked example in the bible).
- Fix: give `.btn-primary` on the band a fill that owns its ground (accent at ~0.3, or a quiet dark plate under the whole bar), or switch the ink to --accent-bright on this surface; re-measure on 786 and 1732, the two worst veils found.

### F5. The advanced-rating badge "8" in the band fails in light mode (and on the gold band in dark)
- Surface: `.adv-rating-btn-badge` in the rating row. 1600, both modes.
- Measured: light 2.46:1 (1732) and 2.31 (265), ink 168,85,247 on a 216..226 pale pill; dark 4.03 on 265 (warm veil), 5.37 on 1732. It is the only carrier of that rating, so the floor is 4.5.
- Screenshots: `v1732-1600-light.png`, `v265-1600-light.png` (the pill reads washed out at the right of the row).
- Rule: 3.9, 6.20 (plugin theming: our tokens, their behaviour). Owner is 13_plugins' adv-rating rule rather than the performer lane, but it sits in this band.
- Fix: light ink via `--accent-ink` (the darkened mix Edit already uses in light measures 20:1 there), dark ink `--accent-bright`.

### F6. Focus: 19 controls in the band, no house ring on any of them
- Surface: band, view mode, both modes, keyboard focus (PROBE_KEYBOARD=1, `:focus-visible` confirmed matching).
- Measured: on every `.btn` (Edit, Auto tag, Merge, Submit, Delete, Better image, Back image, the heart/link/twitter icons) the only computed change on focus is `outline-width 3px -> 0px`; no box-shadow ring, no fill step, no border change. The five rating-star buttons change nothing at all. The star-8 pill and the StashDB chip fall through to the UA default `outline: auto 1px rgb(16,16,16)`, a near-black ring on a dark band. `.refract-cap-toggle:focus-visible` in 08 already has the right rule (2px accent-glow outline, offset 2), so the recipe exists.
- Screenshot: none (state measurement); JSON in `focus2-1732-dark.json`, `focus2-1732-light.json`.
- Rule: 6.6 house ring, 10.3 "count the controls and count the rings"; because 09_buttons kills box-shadow, the ring has to be an outline.
- Fix: `.detail-header :is(.btn, button, a.btn, .adv-rating-btn):focus-visible { outline: 2px solid var(--accent-glow); outline-offset: 2px; }` scoped to the band, plus the same on the rating stars.

### F7. Vertical rhythm in the head is whatever height is left over
- Surface: band text column. 1600, both modes.
- Measured: `.performer-head` is `display: grid; gap: 10.5px; padding-top: 22.4px` with `align-content: normal`, and the band's height is the card's (card bottom = band bottom + 96 always). On a sparse performer (1732) the rows stretch: name to alias 68px, alias to stats 58, stats to grid 58, then 77px of empty band under the grid. On a dense one (265, 786) the same blocks sit at 21 / 10.6 / 10.4 with the tile grid butted against the rating row. Same DOM, six times the spacing, and the sparse case spreads the dead space over three places rather than one.
- Screenshots: `v1732-1600-dark.png` vs `v265-1600-dark.png` (2x header clips).
- Rule: 3.6 (gaps come from the scale, not from leftover), P7.
- Fix: `align-content: start` and a fixed `--gap-lg` between blocks, then put the leftover in one intentional place (the tile grid anchored to the band's bottom padding via `margin-top: auto` or a `1fr` spacer row). Consider also how far the card's top may sit below the name on tall bands: on 265 the card starts 114px below the band top while the name starts at 22.

### F8. Row height in the detail grid is set by the tallest tile, and the endpoint chip is the tallest
- Surface: detail grid, view mode. 1600 (any width). Both modes.
- Measured: a text tile is 47.6px; a tile with one endpoint chip (StashDB, 11.2/700 at 0.55 alpha, 19.6px tall) is 52.5; with two chips (786: ThePornDB + StashDB stacked) 79.6. On 786 that row also holds Tattoos and Piercings, which truncate 452px and 200px of text to 165 with an ellipsis while 32px of empty tile sits under each line: the canonical P7 failure inside a single cell. The chip's muted bold ink also reads as a disabled control beside values at 0.92 alpha; it is the only value in the grid drawn in eyebrow colour. Title tooltips do exist on the truncated values (P6 holds).
- Screenshots: `v786-1600-dark.png` (row 2), `v1732-1600-dark.png` (row 2 taller than row 1 by 4.9px).
- Rule: P7, 6.7 (pill line-height clears the font box, chips at --fs-sm), 3.5 rule 3.
- Fix: endpoint chips inline at the value line-height (`--fs-xs`, padding 0 8px, gap 6px, value ink, weight 500) so the row stays 47.6; when a row is taller anyway let the prose tiles wrap to two lines instead of ellipsising into empty space.

### F9. Two eyebrow specifications in one band
- Surface: band. All widths, both modes.
- Measured: RANKED / ACTIVE / SCENES labels are 10.08px / 600 / 0.8064px (0.08em, --track-eyebrow); the tile labels and the Ascension stat keys are 10.08px / 500 / 0.6048px (0.06em, --track-label). The weight is already in the drift ledger ("Type, band labels"); the tracking difference is not, and it is what makes the two rows read as different materials 55px apart.
- Screenshot: `v1732-1600-dark.png`.
- Rule: 6.13 (one house label pattern), 3.5 rule 2 (a surface gets six or seven pairs; the band has thirteen once the card's three are excluded).
- Fix: one eyebrow pair for the band (600 + --track-eyebrow), and take the Ascension header and keys with it as the ledger row already prescribes.

### F10. Copy: "Ranked 493 of 492"
- Surface: band standing readout (view: "RANKED 493 of 492"; edit: "Rank #493 of 492"). 1732. Both modes.
- Measured: the rank exceeds the total; the denominator and the rank are counted over different sets (the unrated performer is placed after 492 rated ones). The same fact is also phrased two ways across the two modes.
- Screenshots: `v1732-1600-dark.png`, `e1732-1600-dark.png`.
- Rule: 6.21 voice, P8 (never claim knowledge the theme does not have).
- Fix: same population for both numbers; an unrated performer reads "Unranked" (or "Not yet ranked") instead of a position past the end; one phrasing in both modes.

### F11. Ascension section as a neighbour of the band (mismatches only)
- Surface: `.custom-field-hotornot_stats` inside the band, 265 and 786. 1600 and 807, both modes.
- Measured: (a) the stat keys start at x 448.9 while every other label in the stack (tile labels, ASCENSION, MATCH HISTORY) starts at 437.7: the section's 11.2px padding and each stat cell's 11.2px padding stack, an 11.2px indent visible at every width; (b) the stats track is 6 x 183.6 against the tiles' 6 x 187.3, so BEST STREAK's column starts 18px left of EYE COLOR's directly above it; (c) the matchup chip has `min-height: 45px` where every other pill in the band is 24 to 26px (alias 24.2, rating 26); (d) ASCENSION (tier colour, hairline) and MATCH HISTORY (muted) are two stacked eyebrows with nothing between them. Contrast is clean: keys 6.2 dark / 4.7 light, WIN 7.8 / 6.2, header 10 / 20.
- Screenshots: `cf265-1600-dark.png`, `cf265-807-dark.png`, `v265-1600-light.png`.
- Rule: 3.6 (ledger "Nested tracks" already prescribes `--refract-band-cols`), 6.7.
- Fix: zero the stat cells' horizontal padding (or the section's) so keys sit on the band's label line and the pitch matches; chip min-height to the band's pill height; fold MATCH HISTORY into the section header or drop it.

### F12. Edit form: rows that do not fill their tracks, and four control heights in one column
- Surface: edit form. 1600 and 1300, both modes.
- Measured: Appearance row 2 is Hair 3 + Eye 3 + Height 2 + Weight 2 = 10 of 12 tracks (188px empty at the right), row 3 is Measurements 4 + Fake Tits 4 = 8 of 12, under a full 6+3+3 first row: a ragged right edge with no rule behind it. Heights: inputs 33.5; react-select Country 38 (its group is 56.8 vs 52.3, so its bottom edge sits 4.5px below Ethnicity's); URL and alias list inputs 30.9 inside 33.5 button groups (a 2.6px step at the seam of every URL row); the empty alias row's remove button is 35.8 tall against 30.9 for the filled one; Stash ID add/remove buttons 23px. Off-scale type: the Stash ID hash at 9.24px (0.66rem); Ascension's "of 492" at 10.41px and its "0.00 / Rank #493" 12.25/700 grey 128 at 3.8 to 4.1:1 in both modes (their pill, also a dark island in light).
- Screenshots: `e1732-1600-dark.png`, `e1732-1300-dark.png`.
- Rule: 3.6 twelve tracks, 6.6 (one input height, groups merge into one pill), 3.5 rule 1.
- Fix: Height/Weight 3+3 and Measurements/Fake Tits 6+6 (or 4+4+4 with a third field); `min-height: 33.5px` on the react-select control and the list inputs; list inputs at the same --fs as the form's other inputs; hash at --fs-xs.

### F13. Crop-guide label "THE CARD KEEPS THE MIDDLE" is illegible in light
- Surface: edit mode card crop guide. 1600, light.
- Measured: 1.72:1 (accent-ink dark purple on the dark translucent pill over the photo; dark mode 4.99). Same class as F2: an island over artwork whose ink followed the mode.
- Screenshot: `epix-1732-light.png`, `e1732-1600-light.png`.
- Rule: 3.1 rule 4.
- Fix: pin the pill's ink to the light variant (it sits on a scrim, not on the page).

### F14. Small alignments
- Alias "all 6" link is 22.2px tall and sits 1px lower than the 24.2px alias chips (y 150.5 vs 149.5) at every width. `v265-1600-dark.png`.
- Edit-mode alias subhead (Stash's, 14px rgb(134,135,145)) 3.45:1 in light, 4.51 dark; fine as secondary, weak if it is the only place the alias shows in edit mode.
- At 807 and 600 the mobile chrome makes buttons 38.5px while the rating pill beside them stays 26px and the alias chips 24.2: three control heights in one column. `v1732-807-dark.png`.

## 3. Regression checks (pass)

- Font swap (1df2148): Concert One reports `loaded` on the grid, home carousel and performer page; every one of 40 grid cards has a painted name after a grid -> performer -> back navigation; grid card height 378 unchanged.
- Mutation watcher (5f768d8): after a client-side navigation from /performers to a performer with a country (710 Mia Kay) the page card carries the flag chip (28px, visible), the name banner, the 4 stat pills, 3 standing readouts and 13 tiles at 3s, unchanged at 9s; going back, all 40 cards still carry their banners and 29 of 40 their chips (the rest have no country). No injected element went missing. `nav2.json`, `nav-grid.json`.
- No horizontal document overflow at 1600, 1400, 1300, 1250, 1200, 968, 807 or 600, view or edit.

## 4. Keep (do not touch)

- The flag chip. 28px, 2px bright ring in the card's `--badge-color-bright`, glow chain 10/22/40 in the tier colour, no filter, static position: it reads as a fourth member of the pill family on untiered (white ring, accent glow), silver, gold, diamond and PERFECT cards, in dark and light, on the grid, the home carousel and the page card. Its left edge sits on the pill row's left edge to 0.0px on both the grid card (25.7 / 25.7) and the page card (68.3 / 68.3). `cards-grid-flag-dark.png`, `pill-265.png` (4x), `cards-ph786-flag-dark.png`.
- Name or Flag as one control: in name mode the chip is `display: none` and the name shows; in flag mode the reverse; never both. Measured on 14 grid cards each way.
- The six-up tile grid's label/value pair (10.08 upper + 12.88 value at 16.3:1) and its 6 -> 4 -> 3 -> 2 track ladder with no overflow at any tested width; the band keeping its column beside the text at 807.
- The edit form's section eyebrows (10.08/600 accent, hairline rule) are exactly 6.13; the 11.2/400 field labels at 5.9:1 dark / 6.9 light are a clean second level; the twelve-track grid holds at every width and the URL list goes two-up at 29rem and single below 1200 without breaking the row chrome.
- Edit form light mode otherwise: inputs 14.7:1, labels 6.9, section eyebrows 20:1.
- The Ascension section header in tier colour on the band's label type, and the timeline chip's state-as-ink (WIN 7.8 dark / 6.2 light) with the hairline rim in the state colour.
- Delete as quiet danger: 3.70 dark is the ruled reference, 5.15 light; leave it.

## 5. Not reported (ledgered or excluded by the brief)

Custom Fields panel full-width row; the card overhanging the band (96px); band label weight 500 vs 600 (ledgered 2026-09-02, F9 adds the tracking half); the Ascension stats' duplicated breakpoints (ledgered "Nested tracks"); Delete at 3.70 dark (ruled 2026-08-30).

## 6. Files

Screenshots (`*.png`) and measurements (`*.json`, with `PIXELS` blocks where a contrast pass ran) are in this directory. Expressions: `view.js`, `edit.js`, `cards.js`, `pillalign.js`, `pix2.js`, `epix.js`, `focus2.js`, `tattoo.js`, `nav2.js`; pixel pass `pix.js`; prescripts `pre-flag.js`, `pre-flag-light.js`, `pre-edit.js`, `pre-edit-light.js`; runner `run.sh`, `batch1..7.sh`; rig `probe8.js`.