# Design brief: the scene scrape results dialog

Self-contained. Companion to the line-up (`css/05_list_views.css` 3110 to
3800, `refract.js` 8763 to 9040, `design-scrape-modal/`). Format per
`DESIGN_SYSTEM.md` 10.2. Canvas: `scene-scrape-results.html` (six boards),
working sources beside this file.

---

## 1. What this is

**Stash** is a self-hosted media library with a React web UI. **Refract** is
a dark glass theme plugin for it, distributed publicly.

Scraping a scene is two dialogs in a row. The first, the **line-up**, asks
"which record is this?" and shows candidates as a contact sheet (already
redesigned and shipped). The second, this one, asks "which fields do you
want?" It lists every field the scraper returned that differs from what the
scene has, side by side as EXISTING and SCRAPED, and lets the user choose per
field before pressing Apply. Stash calls it "Scene Scrape Results"; the same
component serves performers, studios, galleries, groups and images.

## 2. The job

Redesign the dialog so it reads as the same family as the line-up and the
rest of Refract's modals, with one clear per-row choice instead of two
coloured rails, and per-row state that can be read in words. Rearranging
with CSS grid and `display: contents` is in scope; moving React nodes is not
(7.1). Injecting text (state lines, the footer count, the "nothing on record"
words) through the existing MutationObserver is in scope, the same way the
line-up injects its plates and collision note.

## 3. What it is today, measured

Read off the user's screenshot (`E:\Pictures\Screenshots\Screenshot
2026-09-03 223206.png`, 962 x 591 at 1x) and the shipped CSS. NOT probed on
the live instance: the dialog needs a completed scrape to open, and headless
Chrome cannot drive one. Treat every number as plus or minus 2px until the
build slice measures it with the harness.

| | |
|---|---|
| Modal | about 930 wide (Bootstrap `modal-lg` 800 plus Refract's override) |
| Header strip | 52px tall, a fourth grey, pencil icon plus Title Case string |
| Label column | 208px, 22% (08_misc_mid 510 sets it to 17% of the row) |
| Rails | 44px wide per side, red `#2a1616`-ish and green `#14281c`-ish, full cell height |
| Existing performers cell | 70px tall |
| Scraped performers cell | 160px tall, 90px of it empty |
| Chips | 24px tall, 12.25px, opaque `#3b3b3b` on `#262626` on `#151515` |
| react-select value box | capped at 132px with inner scroll (08_misc_mid 518) |
| Cover cells | 136px tall, image behind the rail, no chosen mark |
| Footer buttons | 40px, Cancel glass, Apply SOLID purple |
| Fields the dialog can show | 12: title, code, urls, date, director, studio, performers, groups, tags, details, stash_ids, cover_image (+ custom fields on performers) |
| Row states Stash actually has | 3: using scraped (`useNewValue`), keeping existing, and a "create new" list under the scraped field. Unchanged rows are not rendered at all (`ScrapeDialogRow` returns null when `!result.scraped && !newValues && !alwaysShow`). |

Materials on screen: three opaque greys plus two status tints plus one
solid accent. The bible's modal has one surface (6.14) and alpha fills on it.

## 4. The worst part, specifically

**The rails.** A 44px red slab and a 44px green slab per row are the most
saturated things on screen (P1), and they say the wrong thing: red on the
existing side reads as "your value is wrong", when keeping it is a perfectly
good choice. The colour encodes a verdict the dialog does not have. Second
worst: nothing in the performers row says Shakira Brazil is the one change;
the user has to diff two chip lists by eye.

## 5. Data available, free

All in the DOM, confirmed against `stash-fork/ui/v2.5/src/components/Shared/ScrapeDialog/`:

- **Which side is chosen**: the prepend button holds `svg.fa-check` on the
  chosen side and `svg.fa-xmark` (Font Awesome renders `faTimes` as
  `fa-xmark`) on the other. Stash swaps them on click. `:has(svg.fa-check)`
  is the whole state read; 08_misc_mid 437 already keys on it.
- **Row identity**: `.row[data-field="performers"]` etc. on every row.
- **Per-row EXISTING / SCRAPED labels**: Stash renders them in EVERY row as
  `label.column-label.d-lg-none`, hidden on desktop by Bootstrap's
  `display: none !important`. Localised, Stash's own words. The phone board
  uses them as tile captions; desktop can unhide them if wanted.
- **Chip names on both sides**: `.react-select__multi-value__label` text.
  Comparing the two lists gives "added" and "would be dropped" without
  guessing (P8: derived, not inferred).
- **Create-new entities**: `.tag-item.badge` under the scraped field
  (`NewScrapedObjects`), each with a `.btn.minimal` holding `svg.fa-plus`,
  tags also `svg.fa-link`. Ten or more collapse behind Stash's
  `CollapseButton` ("Missing (N)").
- **Empty existing**: a `readOnly` `input.form-control` with an empty value
  (or an absent `img.scene-cover`). Nothing to read; the words are injected.
- **Locked**: `stash_ids` row's scraped input is `readOnly` (the `locked`
  prop).
- **Title**: `dialogs.scrape_entity_title`, "{entity} Scrape Results",
  localised. Cannot be sentence-cased by CSS without lying in other
  languages; open question 1.
- **Count of changes**: not in the DOM as a number; counted by JS from the
  `fa-check` positions and the badge list.

## 6. Hard constraints

Only things that have already bitten.

1. **7.1: never move a React node.** Every relocation on the boards is
   `display: contents` plus grid placement, the pattern 08_misc_mid 6293
   already uses on the performer image row. The click lands on Stash's
   button.
2. **7.9: the `:is()` ID trap.** `05_list_views.css:620` pins every
   `.btn-primary` in a `.modal-body` to `--radius-sm !important` at (2,3,1).
   The footer's Apply already has that radius, so nothing to fight; but any
   radius change on a button inside this dialog loses silently. Measure with
   `CSS.getMatchedStylesForNode`.
3. **7.14: `background: x !important` shorthands** on `.modal-content
   .form-control` (04_filters 248) reset every longhand. Tiles that carry a
   hatched `background-image` must repeat `!important` on each longhand.
4. **`.d-lg-none` is `display: none !important`** at lg and up. Unhiding the
   per-row labels on desktop needs `!important` and higher specificity;
   keeping them hidden on desktop (as board B does) costs nothing.
5. **7.12 and 7.13**: the state line, the footer count and the chip diff are
   JS-added classes; CSS keyed on them is dead if `refract.js` is not
   deployed from the same tree. One tree, one deploy.
6. **The 132px value-container cap** (08_misc_mid 518) applies to every
   `.scraper-edit .react-select__value-container--is-multi`. This dialog is
   not inside `.scraper-edit` (that is the performer edit page), so
   retiring it here is a scoped rule, not a deletion.
7. 7.2: `:has()` is fine here (a dozen rows), never in the grid.

## 7. Settled, not open

- The modal recipe (6.14): `--surface-solid`, glass rim, `--radius`, blur
  `xl`, `--glass-shadow` plus the inset hairline. Neutral, never blue.
- The header is the line-up's: accent bar, `--fs-xl` title at -0.02em, a
  hairline. Flex-start, never space-between.
- The footer is 04_filters 176 to 246: secondary is glass, primary is
  accent tint on glass with the glow. No solid accent fills.
- Chips are 6.7: `--radius-pill`, `--fs-sm`, `--fill-3`, hairline.
- Eyebrows are 6.13; column labels get the hairline underline (6.14).
- Selection is the accent (line-up cards, 6.19). Danger is `--danger-*`
  and only for things that will be removed.
- Phone: a full-height sheet, 44px targets, coexists with the dock (6.11).

## 8. Candidate directions

**Built (boards B to F): the radio pair.** Each row is a label with a state
line, then two tiles. The tile that will be written wears the line-up's
selected recipe (accent rim 0.55, `--accent-tint`, `--text` ink) and its
mark is filled; the other tile is `--fill-2`, muted ink, empty ring. The two
marks are Stash's two buttons; exactly one holds `fa-check`, so the pair is
a radio by construction. Red and green retire.

**Considered and not drawn: a segmented toggle in the row head** ("Keep |
Use scraped" beside the label, the two buttons relocated with grid). It
puts the control 400px from the value it governs and reads as a tab (6.23),
so a click's consequence is not next to the click. Rejected for that, but
it is a legitimate reading of the same markup if the marks-in-tiles prove
too quiet.

**Also considered: a single check on the scraped side only.** Simpler,
but it makes "keeping yours" invisible: the existing tile would have no
state at all. The pair is what makes the kept row legible.

Where the bible is silent, taste decided: the 150px label column, the
state line under each label (`--fs-xs`, muted, `--accent-ink` when the row
will change), the one-line rule in the header, the count inside the Apply
label, and the 0.08 hairline between rows (one step under `--glass-border`).

## 9. What good looks like

- Zero red or green pixels in the dialog that are not a `--danger` "would
  be dropped" chip.
- Every row can be read as a sentence without looking at colour: label,
  state line, chosen tile.
- The count in the footer equals the number of rows whose scraped tile
  holds `fa-check`, and updates on every click.
- Exactly one filled mark per row at all times; clicking either mark
  flips the pair (Stash's own behaviour, unchanged).
- Twelve performers and thirty tags render with no inner scrollbar; both
  tiles in a row share a bottom edge (measured, not eyeballed).
- A 600-character details tile grows to its text; the body scrolls, the
  header, column strip and footer do not.
- The cover row shows two 16:9 wells at the same size with the chosen one
  marked; an absent existing cover is the hatched plate with words, not a
  blank.
- Create-new chips are dashed accent, distinct from every other chip, and
  the state line names how many.
- Focus rings on every button and mark (10.3); the mark's hit area is at
  least 32px on desktop and 44px on the phone sheet.
- Six or seven type pairs on the surface, every size from the scale.
- Light mode checked as contrast numbers on the tile grounds (3.9), all
  seven presets; lite mode pins the tiles opaque.
- The line-up and this dialog, opened one after the other, share the
  header, the selected state, the absent plate and the footer.

## 10. Deliverable

**Which file.** Neither `07_scene_details.css` nor `09_buttons.css`. The
dialog is shared by every entity (the same `ScrapeDialog` renders performer,
studio, gallery, group and image results), so 07's scene-page scope is
wrong, and 09 is the button vocabulary, not a row layout. The rules replace
the "Scrape Results Modal" block already in `css/08_misc_mid.css` (6101 to
about 6560), anchored on the same fingerprint:

```
body.stash-liquid-glass .modal-content:has(> .modal-body > .dialog-container)
```

JS goes in `refract.js` beside `initScrapeResults` (8991) as a sibling
`initScrapeDialog`, registered in the same `runAll()` and wrapped in
`safeRun`. The light partner goes in `14_light.css` section 29, next to the
line-up's.

**Selectors, from Stash's markup.**

| Thing | Selector |
|---|---|
| the dialog | `.modal-dialog.scrape-dialog` / `.modal-content:has(> .modal-body > .dialog-container)` |
| header, title | `.modal-header`, `.modal-header span` (the pencil is `svg.fa-pencil`) |
| column strip | `.dialog-container > form > .row:first-child .column-label` |
| a row | `.dialog-container > form > .row[data-field]` |
| label | `.row[data-field] > label.col-form-label` |
| the two halves | `.row[data-field] > .col-lg-9 > .row > .col-lg-6` (first = existing) |
| per-row side labels | `.row[data-field] label.column-label.d-lg-none` |
| the tile | `.col-lg-6 > .input-group` |
| the mark | `.input-group > .input-group-prepend > .btn.btn-secondary` |
| chosen | `.btn:has(svg.fa-check)`; not chosen `.btn:has(svg.fa-xmark)` |
| text value | `.input-group > input.form-control[readonly]` (existing), `input.form-control` (scraped) |
| details | `textarea.form-control.scene-description` |
| chips | `.react-select__multi-value`, `__label`, `__remove` |
| create-new | `.col-lg-6 > .tag-item.badge`, its `.btn.minimal svg.fa-plus` / `svg.fa-link` |
| cover | `.input-group > img.scene-cover` (performer: `img.performer-image`, `.image-selection`) |
| URLs | `.string-list-row .string-list-input` (keep the existing one-block treatment) |
| footer | `.modal-footer .btn-secondary`, `.btn-primary` |

**JS-added hooks** (names proposed): `refract-sd-state` (the injected
state line under the label), `refract-sd-added` / `refract-sd-dropped` on
chips, `refract-sd-empty` on a tile whose input is blank (with the words
as `data-refract-sd-empty`), `refract-sd-count` on the injected footer
readout, `refract-sd-create` on the badge list. Every string injected is
Refract's own copy in British English, sentence case (6.21).

**Must not be touched.**

- `.scraper-edit` rules (08_misc_mid 408 to 520): they serve the performer
  edit page's inline scrape rows, a different surface. New rules are scoped
  under the dialog fingerprint and override by specificity, never by
  editing that block.
- `04_filters.css` 59 to 262: the modal base every dialog shares.
- `05_list_views.css` 3110 to 3800: the line-up. Read from, never edited.
- `05_list_views.css:620`: the `:is()` primary-button rule. Do not re-pitch
  it to win a corner (7.9).
- Stash's DOM order, handlers and state. `display: contents` and grid only.

**Evidence.** Before: the screenshot above plus a harness capture once a
scrape is on screen (open the dialog by hand in the probe's Chrome, then
run the expression; `PROBE_KEYBOARD=1` for the focus pass). After: the
same expression, both modes, purple and yellow presets at minimum, at 1600
and at 390.

## 11. The performer build slice (boards G to J)

**What is different, measured from `Performers/PerformerDetails/PerformerScrapeDialog.tsx`.**

| | Scene | Performer |
|---|---|---|
| Rows the dialog can show | 12 | 25, in Stash's order: name, disambiguation, aliases, gender, birthdate, death date, ethnicity, country, hair colour, eye colour, weight, height, penis length, circumcised, measurements, fake tits, career start, career end, tattoos, piercings, URLs, details, tags, image, stash ID |
| Aliases | n/a | `ScrapedTextAreaRow`: a comma-joined string on BOTH sides. Not chips in the DOM. |
| Gender, circumcised | n/a | `Form.Control as="select"` with `plaintext` + `disabled` on the existing side, a live select on the scraped side |
| Country | n/a | existing side: read-only input with the country NAME (`getCountryByISO`); scraped side: `CountrySelect` with `showFlag={false}` |
| Image | `ScrapedImageRow`, one `img.scene-cover` per side | `ScrapedImagesRow`: existing `img.performer-image`; scraped is `ImageSelector` rendering ONE `img` at a time plus `.select-buttons` (prev, `h5.image-index` "2 of 5", next) when there is more than one candidate |
| Gender gate | n/a | NONE in Stash (neither the edit form nor the dialog). Refract's edit form hides the two rows with `form.refract-pe-hide-male` (08_misc_mid 8974) |
| Studio row | select + create-new | none |
| Custom fields | none | none in the scrape dialog (the merge dialog has `ScrapedCustomFieldRows`) |

**Decisions the performer dialog makes that the scene one does not.**

1. **Aliases are chips derived from the comma string.** JS splits both
   sides on `,`, renders a chip row per side into an injected node above
   the textarea, marks added and dropped by name, and leaves Stash's
   textarea in place as the editable line under the chips (P4: the
   control the user types into is Stash's; the chips are a reading
   surface). The existing side's textarea is `readOnly`; hide it and let
   the chips stand alone there.
2. **The candidate strip.** Stash shows one candidate at a time. The
   redesign keeps the current candidate large and adds a strip of N
   frames under it, N read from Stash's own `h5.image-index` text
   ("{index} of {total}", locale key `index_of_total`). A frame fills
   with the candidate's thumbnail once that index has been on screen
   (JS caches `img.src` per index as the user pages); unseen frames are
   the hatched plate. Clicking a frame is out of scope for CSS and JS
   alike unless it drives Stash's prev/next buttons the right number of
   times; the honest first build is a passive strip plus Stash's two
   buttons at its ends. A full sheet of all candidates on open needs an
   upstream change to `ImageSelector` (render all thumbnails): small,
   additive, single-concern, so it fits the PR policy.
3. **The gender gate.** The two male-only rows take
   `.refract-pe-hide-male`'s rule: JS reads the gender select on the
   performer page behind the modal (`#performer-page` edit form), or the
   chosen gender tile when the dialog has a gender row, and adds
   `refract-sd-hide-male` to the dialog. P6 caveat: a scraper that
   returns a value for a female record is noise, and the edit form
   already settled that hiding it is right; keep the two rows reachable
   by removing the class when the gender is unknown.
4. **Country is the name, no flag.** 03_cards 2141: name or flag, never
   both, and the flag chip is a card-level opt-in
   (`refract-pc-country-flag`). A dialog row is a value, not a card.
5. **Compact rhythm for short rows.** Twenty-five rows at the scene
   dialog's 12px row padding and 40px tiles run past 1600px. Text and
   select rows take 8px padding and 34px tiles (`--fs-base` still);
   list, textarea and image rows keep the full rhythm. Same tokens,
   two densities, chosen by the row's control kind.

**Selectors, performer-specific.**

| Thing | Selector |
|---|---|
| the dialog | same fingerprint; the header `span` reads "Performer Scrape Results" |
| aliases, tattoos, piercings, details | `.row[data-field="aliases"] textarea.form-control` (existing `[readonly]`) |
| gender, circumcised | `.row[data-field="gender"] select.input-control` (`.form-control-plaintext[disabled]` on the existing side) |
| country | `.row[data-field="country"]`: existing `input.form-control[readonly]`, scraped `.react-select` (`CountrySelect`) |
| male-only rows | `.row[data-field="penis_length"]`, `.row[data-field="circumcised"]` |
| image, existing | `.row[data-field="image"] .col-lg-6:first-of-type img.performer-image` |
| image, scraped | `.image-selection-parent > .image-selection > .performer-image > img:not(.d-none)` |
| candidate count | `.image-selection > .select-buttons > h5.image-index` (text) |
| prev / next | `.select-buttons > .btn:first-child`, `.btn:last-child` (Stash's `btn-primary`) |
| stash ID | `.row[data-field="remote_site_id"]` (the scene one is `stash_ids`) |
| URLs | `.string-list-row .string-list-input .input-group` per line; added lines found by comparing against the existing side's lines |

**Where.** The same block in `css/08_misc_mid.css`; the performer image
rules at 6222 to 6390 (the rail-on-portrait grid) are the part that
retires. Entity-specific rules key on `[data-field]`, never on the
dialog title.

**Must not be touched.** Everything in section 10, plus: `#performer-page
.refract-pe` (08_misc_mid 8900 to 9410, the performer edit form): the
gender rule is READ from there, not edited; and `PerformerMergeDialog`,
which reuses `ScrapeDialog` and will inherit the restyle untouched
(check it in the after-evidence, since it carries custom-field rows the
scrape dialog does not).

**Evidence for the performer slice.** A StashDB scrape on a performer
with several candidate images, captured at 1600 and 390, both modes;
the merge dialog opened once to confirm nothing regressed.

## Open questions

1. The title is Stash's localised "Scene Scrape Results". Sentence case
   would need a JS rewrite of a localised string; leave it, or rewrite only
   when the UI language is English?
2. Desktop per-row side labels: board B hides them (the column strip does
   the job); the phone board shows them. Confirm, or show both.
3. The "would be dropped" chip uses `--danger` at 0.08 / 0.28. It is the
   only non-accent colour on the surface; is a neutral strike-through
   preferred so the surface is single-hue?
4. The Apply label carries the count ("Apply 6 changes"). Stash's string is
   "Apply"; the count would be appended by JS. Keep, or leave the count in
   the footer readout only?
5. Concentric radius: the line-up ships a 9px well inside a 14px card with
   7px padding, off 3.4's rule. Fix both wells together at build?
6. URLs row: the boards do not draw it. The existing one-block string-list
   treatment (08_misc_mid 6508 onward) should survive inside a tile; needs
   a measured look once the dialog is open with URLs.
7. The line-up half of board F is drawn from `design-scrape-modal/
   Main.dc.html`, not re-measured from the shipped CSS; the family read is
   by design language, not by pixel.
