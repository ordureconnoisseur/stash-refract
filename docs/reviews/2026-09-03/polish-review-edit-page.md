# Refract performer page: polish review 2 (edit mode + view band at the stacked widths), 2026-09-03

Read-only. Everything measured on the live Stash behind the :9998 auth proxy
with the harness; nothing judged from the source. Screenshots and JSON sit
beside this file (`e*` edit, `v*` view, `px*` pixel passes, `z*` close-ups at
4x/8x, `focus*` and `rs*` focus runs, `misc*` supplementary geometry).

## 1. What was measured against

Deploy dir `C:\Users\ethork\.stash\plugins\refract\`, verified myself
(CR-stripped compare against entity-pages HEAD **05921a1**):

| File | Deployed from | Check |
|---|---|---|
| css/08_misc_mid.css | entity-pages **05921a1** | byte-equal to HEAD |
| refract.js | entity-pages **46f9940** performer work, carried by 05921a1 | equal to HEAD except the mobile lane's 3-line toolbar-stuck hunk (d77723c); `refractPhAnchorCard` byte-identical |
| css/14_light.css, 09_buttons.css, 01_tokens.css | HEAD | byte-equal |

Rig: `probe8.js` (the scratch copy adding PROBE_DSF/CLIP/FULL/PIXELS; repo
probe.js untouched). Every run's JSON was checked for `vw` equal to the
requested width and its `.err` for a WAIT warning before it was used; two
runs (px895, misc-1600) timed out on attempt 1 and were re-run clean.
Contrast is a WCAG ratio of the computed ink over the median rendered ground
sampled inside the element's own box from a 2x screenshot (`pix.js`);
"worst" is against the darkest/brightest decile. Light mode was genuinely
on via `pre-light.js` with the config write swallowed.

Performers: 1732 Kesha Ortega (8 URLs, 1 alias, unrated), 895 Kitty Lynn
(Ascension bronze, 26 URLs, two endpoints, Trans disambiguation), 1018
Jessie Belle (no alias, 7 URLs). Edit: 1600, 1200, 1150, 1095, 1064, 968,
807. View: 1200, 1150, 1095, 807. Dark throughout; light at 1600, 1150, 807
(1732), 1064 (895), 1095 (1018) in edit and 1150 (1732), 1095 (895) in view.

## 2. Findings, most important first

### F1. The action plate and the bottom action bar are still a 75% column at every width of 1200 and above, including the stacked 1200
- Surface: edit head plate `.details-edit.col-xl-9` and its bottom copy. 1600 and 1200. Both modes.
- Measured: plate `max-width: 75%; flex: 0 0 75%` (Bootstrap `col-xl-9`, not overridden). 1600: plate 870.8 wide, right edge 1264.3, form right edge 1554.5 (290.2 short). 1200: the page is already stacked (`flex-direction: column`, head at x 45.5 spanning 1109) but `min-width: 1200` still matches, so the plate is 831.8 of 1109 (277.2 short) while every field row above and below runs the full 1109. The bottom bar (order 90) and its rule are the same 75%: Cancel/Save sit at x 1131 to 1264 under a form whose right edge is 1554. Below 1200 both are full width (1150: 1059/1059).
- Screenshots: `e1732-1600-dark.png`, `e1732-1200-dark.png`, `e1732-1600-light.png`, `e895-1600-dark.png`.
- Rule: 3.6 (a composition has one right edge), 10.3 "survives the stacked width".
- Fix: `body.stash-liquid-glass #performer-page .refract-pe .details-edit { max-width: 100%; flex-basis: auto; }` (both copies), so the plate and the bottom bar span the form at every width.

### F2. Edit stacks the card above the head at 1200 and below while the view band keeps it beside the text, so Edit opens a void the width of the band
- Surface: edit page composition. 1200, 1150, 1095, 1064, 968, 807. Both modes.
- Measured: view band container `flex-direction: row` at 1200, 1150, 1095 and 807 (card 240x360 beside an 853/803/748px head; 200x300 beside 500 at 807). Edit container `column` at the same widths: the 240x273 card sits alone on the first row with nothing beside it, 869x273 empty at 1200, 764 at 1095, 476 at 807; the name starts 28px under the card's caption at y 393 (1200) and 370 (807). Clicking Edit at 1150 therefore moves the portrait from beside the name to above it. The head's own rows (name 33.7 + alias 21 + rating 32.4 + plate 97.4 + gaps = 205px) would fit beside the 273px card at every stacked width; only the form needs the full width.
- Screenshots: `v1732-1150-dark.png` vs `e1732-1150-dark.png`; `v1732-807-dark.png` vs `e1732-807-dark.png`; `e1018-968-dark.png`.
- Rule: P7 (space goes to density), 3.6, 10.3 stacked width; the brief's "image + head + form as one thing".
- Fix: keep the card beside the head's rows at the stacked widths and let only the form drop under both. Cheapest shape: keep `row` on the container, `flex-wrap: wrap`, the head's row block as the card's sibling, and the form `flex-basis: 100%; order: 99` (the form is already `order`-driven inside the head, so this means the form leaves `.performer-head` or the head becomes `display: contents` at these widths). If the DOM must stay, the minimum is to size the stacked card to the void it creates: at 807 a 200px card as in view, or the crop caption inline with the name row.

### F3. View band, 1200 to 1095: the non-hanging card sits on the band's top edge, 16.7px above the name, while at 807 it is inset 17.5 and top-aligned with the name
- Surface: view band card anchor. 1200, 1150, 1095 (all three performers). Both modes.
- Measured: `refract-ph-hang` correctly absent at all four widths (card 360 vs min-height 380 and vs head content 323.9/600.3/317.5). Container padding `0 17.5px 16.8px`: card top 76.8 = band top 76.8 (0 inset) while the name's box starts at 93.5 (`cardTopVsNameTop -16.7` on 1732, 895 and 1018, dark and light); left inset 17.5, bottom inset 20, top inset 0. At 807 the container padding is `17.5px 17.5px 16.8px` and the card top equals the name top (71.3 = 71.3). In the 2x close-up the card's rounded corner sits inside the band's rounded corner with no ground between them, and Kitty's bronze glow spills past the band's top edge.
- Screenshots: `zhead-1150-dark.png` (2x), `v895-1095-dark.png`, `v1018-1200-dark.png`, `v1732-1150-light.png`, `v1732-807-dark.png` (the correct case).
- Rule: the brief's anchor contract ("otherwise it top-aligns with the name"), 3.6 inset consistency, 6.1.
- Fix: the 0 top padding belongs to the hang state only: `.detail-header:not(.refract-ph-hang) .detail-container { padding-top: 17.5px }` (or `margin-top` on the host equal to the head's 16.7 top offset) so the not-hanging card top-aligns with the name at every width, as it already does at 807.

### F4. Focus: the two react-selects show nothing, two controls fall to the UA ring, and the house ring itself measures 1.4:1
- Surface: edit form, keyboard focus (PROBE_KEYBOARD=1, `:focus-visible` confirmed). 1600, both modes.
- Measured: 91 focusable controls; 76 ring. The 15 without: 9 scrape buttons + 1 drag handle + 2 remove buttons + Save are `disabled` (exempt), leaving **Country and Tags**: their `.react-select__control` gains `--is-focused` and matches `:focus-within` but no computed property changes (outline, box-shadow, border, background all identical; `rs-1600-dark.png` shows no ring). The Stash-ID hash link and the Ignore-auto-tag checkbox get the UA `outline: auto 1px rgb(16,16,16)`, a near-black ring on a 30-grey ground. Everything else takes the lane's ring: `2px solid rgba(168,85,247,0.28)` offset 1px (light `rgba(147,51,234,0.18)`), which composites to (69,45,91) on (30,30,30) = **1.41:1** dark and (233,216,249) on 252 = **1.31:1** light; in the 4x crops it is a hairline.
- Screenshots: `focus-1600-dark.png`, `focus-1600-light.png` (4x, URL input focused), `rs-1600-dark.png`, `rs-1600-light.png` (Country focused, no ring).
- Rule: 6.6 focus must always be visible; 3.9 non-text state 3:1; 10.3 "count the controls and count the rings".
- Fix: `.refract-pe form .react-select__control--is-focused { outline: 2px solid var(--accent-glow); outline-offset: 1px; border-color: var(--accent-glow) }`; the same outline on `[data-refract-pe="stash-ids"] li a:focus-visible` and `.form-check-input:focus-visible`. The 0.28/0.18 alpha is the house recipe (6.6), so raising it to a solid `--accent-bright` / `--accent-ink` outline is a theme-wide decision: either take it, or ledger the ring as a listed exemption per 3.9 rather than leave it unmeasured.

### F5. The Ascension pill in the edit head is a dark island whose tier ink fails in both modes, and it still prints a rank past the end
- Surface: `.hon-battle-rank-badge` in the edit head's rating row. All widths, both modes. Owner is Ascension/13_plugins (6.20), but it sits in this composition.
- Measured: Kitty (bronze) `.hon-rank-text` and `.hon-asc-score-value` rgb(127,30,130) 12.25/700 on a 36-grey pill: **1.78:1** and **1.71:1**, identical in light because the pill stays dark (`zasc-1600-light.png`). Kesha/Jessie (untiered): grey 128 at 4.08 / 3.83 (rank is the sole carrier: floor 4.5). "of 492" is 10.41px (off-ladder) at 4.49 to 4.76. The pill also reads "Rank #493 of 492" for the two unrated performers in edit mode; the view band's F10 fix ("Unranked") does not reach here because this is the plugin's own badge.
- Screenshots: `zasc-1600-dark.png`, `zasc-1600-light.png` (4x), `e1018-968-dark.png`.
- Rule: 3.1 rule 4 (a dark island re-pins its ink to the bright variant), 3.9, 6.21/P8 for the copy.
- Fix: in 13_plugins scope the badge ink to the tier's `-bright` colour (or `--text` for untiered) and the total to `--fs-xs`; if the plugin's copy cannot be changed, hide its rank segment in the edit head and let the band's standing readout be the only rank.

### F6. Two input text sizes in one form (F12 residue)
- Surface: edit form. All widths, both modes.
- Measured: URL and alias inputs 12.25px (`--fs-base`), every other input, select, textarea and react-select value 14px (`--fs-body`); same 10.5px padding, same 33.6 height. The prior F12 asked for the list inputs at the same size as the rest; heights were unified, sizes were not.
- Screenshots: `zurl-1600-dark.png` vs the Name field in `e1732-1600-dark.png`.
- Rule: 3.5 rule 1 and 6.6 (one size per control role).
- Fix: one `--fs` for every input in `.refract-pe form` (either both at `--fs-body`, or the whole form at `--fs-base` which is the table's rung for controls).

### F7. The empty string-list row carries 4.9px of phantom height
- Surface: aliases and URLs groups, the trailing empty row. 1600 to 968 (two-up or wider grids). Both modes.
- Measured: the empty row's `.input-group-append` is 38.5 tall against its 33.6 button and its 33.6 input; the filled rows are 33.6 throughout. The aliases `.form-group` is therefore 38.5 (57.2 for the whole group against 52.3 for a plain field) and the URL grid's last row is 38.5 on Kitty (26 rows) and Jessie (8). At 807 (single column) it is 33.6. Invisible as a box, visible as rhythm: aliases bottom to APPEARANCE measures 17.5 where the section gap elsewhere is 14 + row-gap.
- Screenshots: `zalias-1600-dark.png` (8x), data in `misc-1600-dark.json` (`aliasIgs`).
- Rule: 3.6 gaps come from the scale, not from leftover.
- Fix: `.refract-pe .string-list-input .input-group-append { height: 2.4rem; align-items: stretch }` (or find what the disabled remove button's wrapper inherits, likely Bootstrap's `.btn-sm` line box plus a stray margin).

### F8. Small radius and height mismatches inside rows
- Plate: Cancel 28 tall beside Save 30.8 (`.btn-success` at 2.2rem) in the same row, 1.4px proud top and bottom; the bottom bar copies it. Two heights in a row of two peers reads as an error, not as primacy: give Save its emphasis by fill, keep the row at one height. `zplate-1600-dark.png`.
- Stash IDs: a 12px-radius trash square beside a 9999 pill whose inner endpoint segment is `3.5px` (a literal, not concentric with the pill); the add button below is another 12px square. `zsid-1600-dark.png`. Rule 3.4.
- Head rhythm in edit: name to alias 4.1, alias to rating 6.3, rating to plate 10.5, plate to form 14, form to IDENTITY 14. 6.3 is on no step of the gap scale (`--gap-sm` 5.6, `--gap-md` 7). Rule 3.6.

### F9. Country value clipped without an ellipsis at three tracks
- Surface: Country react-select, 1600 (three-track column, 279.8 wide). Kitty.
- Measured: `react-select__single-value` "United States of America" scrollWidth 188 vs clientWidth 186: the last glyph is cut, no ellipsis. Fine at the six-track widths.
- Screenshot: `e895-1600-dark.png` (Country cell).
- Rule: P6 (nothing lost), 10.3.
- Fix: `text-overflow: ellipsis` is already react-select's default; the 2px is the flag glyph's margin eating the value's box: reduce the flag's right margin or the control's horizontal padding by 2px.

## 3. Re-verification

| Item | Status | Measured |
|---|---|---|
| F2 light edit plate ink | **Fixed** | plate `rgba(252,252,252,0.92)` in light with `rgba(0,0,0,0.88)` ink: Scrape/Set image 16.5:1, Cancel/Clear Image/EDITING 6.9:1 (was 1.26 and "no ink"). Dark unchanged 6.2 to 14.6. Disabled Save 2.09 light / 2.71 dark (disabled, exempt). `e1732-1600-light.png`, `zplate-1600-light.png`. |
| F12 rows fill tracks, one control height | **Fixed** (heights, tracks); **residue** F6 (sizes) | `rowsShort` empty at every width except the 75% bar (F1). 33.6px on 20 text inputs, 4 dates, 1 select, 2 react-selects, 26 list buttons, 9 scrape buttons, 2 Stash-ID buttons at every width; textareas 84; the Stash-ID hash is 10.08px. List inputs still 12.25 vs 14. |
| F13 crop label ink in light | **Fixed** | ink rgb(216,180,254) on the 0.62 scrim: 7.53:1 (worst 5.13); dark 5.04. `zcrop-1600-light.png`. |
| New 1: head + form share the image's inset below 1200 | **Holds** | host, head, plate and form all at x 45.5; right edges at band inset (1104.5 at 1150, 1018.5 at 1064, 922.5 at 968, 761.5 at 807); `docW == vw` at every width. But see F1 for the plate at exactly 1200 and F2 for what the shared inset composes into. |
| New 2: the head's row gap above the plate | **Holds** | 10.5 above (rating row to plate) and 14 below at 1600, 1200, 1150, 1095, 1064, 968, 807, dark and light. |
| New 3: string-list groups as one shape, `--fill-2` both modes | **Holds** | input and every button `rgba(255,255,255,0.04)` dark / `rgba(0,0,0,0.055)` light, one 0.12/0.10 rim, seams as the buttons' single 1px left border, input `12 0 0 12`, last button `0 12 12 0`. 8x crops `zurl-1600-dark.png`, `zurl-1600-light.png` read as one control. Residue: F7 phantom height on the empty row. |
| New 4: card anchor by measured rows | **Holds for the decision, not for the placement** | `refract-ph-hang` absent at 1200/1150/1095/807 on all three performers (card 360 < floor 380), present nowhere it should not be; no void above the card (0). But the not-hanging card sits 16.7px above the name at 1200 to 1095 and 0 at 807 (F3). Edit mode at 1600: card 364 vs a 1718 head, no hang, card top = name top 91.8. |

## 4. Keep (do not touch)

- The string-list group in both modes: one ground, one rim, hairline seams, 12px outer corners; the remove button's quiet danger appears only on hover. The 8x crops are clean.
- Head, plate and form on the image's left edge at every stacked width, and the form's twelve tracks holding with every row full from 1600 to 807, with the URL list two-up to 968 and single at 807.
- The plate's three-line grouping at 807 (state / tools / leave) and its 10.5 / 14 rhythm into the form at every width.
- Light edit mode: plate on the light surface, labels 6.9, inputs 14.7, eyebrows 20:1, crop label 7.5 on its scrim; the string-list fill reads as the same material as every other field.
- Focus ring present on every enabled text input, date, textarea, native select and button (76 of 76 enabled non-react-select controls), keyboard-only.
- The view band at 807: 200x300 card inset 17.5 and top-aligned with the name beside a 500px head; the 1600 edit page: 320 card top-aligned with the name with a 28px gutter.
- Ink elsewhere: field labels 5.9 dark / 6.9 light, section eyebrows 6.3 / 20, placeholders 5.6 / 6.6, URL text 12.9 / 14.7, remove icons 5.0 / 6.7, na-notice 6.0 / 7.0, Show anyway 6.6 / 20, Custom Fields 14/600 accent.

## 5. Not reported

The mobile dock over the form at 807 (mobile lane); Ascension's win/loss chip colours (plugin state-as-ink, passes); URL inputs scrolling long values (inherent to text inputs); the disabled scrape buttons' dimmed icon (Stash state); the 75% bottom bar's Clear Image wrapper growing to 501px (transparent).

## 6. Files

Expressions `ge.js` (edit geometry + pixel targets), `gv.js` (view anchor), `fe.js` (focus sweep), `rs.js` (react-select / link / checkbox focus), `misc.js`; pixel pass `pix.js`; prescripts `pre-edit.js`, `pre-edit-light.js`, `pre-light.js`; runner `run.sh`, batches `batchA.sh`, `batchBC.sh`, `batchD.sh`, `batchE.sh` with logs; rig `probe8.js`.