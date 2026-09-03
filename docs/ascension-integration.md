# Refract and Ascension

Refract is a theme for Stash. Ascension is Sakoto's fork of HotorNot, which
adds a tier-based rating system and puts a battle-rank badge on performer
cards. Both can be installed at once, and when they are, Refract restyles
Ascension's badge so it reads as part of the card rather than as a chip dropped
on top of one.

This document exists because that restyling makes assumptions about Ascension's
markup, and in September 2026 one of them broke: 1.3.1 dropped the element
Refract was hiding and added an icon of its own, so cards drew two flames
(Discourse topic 7183, post #190). Everything Refract touches is listed here so
the next change to that markup is a known quantity on both sides.

Refract's side is written to need nothing from Ascension. Ascension does not
have to change anything for this to keep working, and nothing here asks it to
carry a compatibility shim.

Verified against Ascension 1.2.6, 1.3.1 (installed and measured live) and the
1.3.5B3 beta build that ships alongside 1.3.1 (markup read from source; its
badge is the same shape as 1.3.1).

## What would help, if it is ever easy

Four things, all optional, none urgent.

1. **A version in the package manifest.** The `version` field in
   `plugins/manifest.yml` is the constant `1.0900f916`, and it did not change
   between 1.2.6 and 1.3.1. Stash surfaces that field, so from inside Stash the
   two releases are indistinguishable: the only signal that an update exists is
   the `date`. The real version lives in `Release/ascension.yml`, which the
   package manifest does not carry. Anyone diagnosing a version-specific
   problem, in either project, currently has to open a file on disk to find out
   what they are running.
2. **A line in the release notes when the badge markup changes.** Not an API,
   not a contract, just a heads-up that the shape moved. Refract now degrades
   safely on a badge it does not recognise (see "How Refract fails safe"), so a
   surprise costs a plain badge rather than a broken one, but a note turns a
   bug report into a scheduled change.
3. **A section of Ascension's own, instead of Stash's Custom Fields.** This
   is the biggest one and the least urgent, because Refract now works around
   it. Ascension stores its match record in two Stash custom fields
   (`hotornot_stats`, `performer_record`) and `ascen-stats.js` renders the
   stats block and the match timeline in place inside them. That works, but
   Custom Fields is where a user's OWN fields live, and on a library where
   320 performers carry Ascension's fields and 28 carry a field the user
   wrote, the panel reads as plugin storage rather than as theirs. If
   Ascension ever renders its own section on the performer page instead,
   that is strictly better for both projects: the data can stay in custom
   fields, only the rendering moves.

   Refract does not wait for it. It presents those two fields in place as
   an "Ascension" section, moving no nodes, so nothing here breaks on the
   day that changes: the fields simply stop being in the panel, the
   in-place presentation stops matching, and the section Ascension draws
   itself is the one people see.
4. **The stats block's colours assume a dark theme.** `ascension.css`
   hardcodes `#e5e7eb` for a stat value, `#9aa4b2` for its label and
   `#22c55e` for a positive one. On a dark ground those measure 15.74:1,
   7.73:1 and 8.55:1 and are fine. On a light one they measure 1.21:1,
   2.46:1 and 2.23:1 against the panel Stash renders them in, so a
   neutral value is effectively invisible and none of the three clears
   the 4.5:1 floor for reading text.

   This is not caused by anything Refract does, and it predates the
   section work: the same values measured the same inside the old Custom
   Fields panel. Refract has deliberately NOT patched it, because the
   only way to reach those elements from a stylesheet is to name
   Ascension's own classes, which is the coupling this whole document
   exists to remove; a colour list would have to be maintained against
   every release exactly like the badge's markup list was. `currentColor`
   for the neutral value, or any theme-aware colour, would fix it at the
   source for every theme rather than for this one.

## What Refract touches

### The performer card badge

Everything in this section applies only inside `.performer-card`.

**JavaScript**, all in `integrateAscensionBadges` in `refract.js`, running from
the theme's debounced mutation observer:

| What | Ascension markup it reads or writes |
|---|---|
| Finds badges | `.performer-card .hon-battle-rank-badge` |
| Flags the install | adds `refract-has-ascension` to `body` when any badge exists, which is what gates the Ascension-specific controls in Refract's card customiser |
| Claims or declines a badge | see "How Refract fails safe" |
| Cleans the record | rewrites `undefined` to `0` in `.hon-wins`, `.hon-losses`, `.hon-draws`, and in the badge's `title` attribute. Ascension renders `undefinedD` when a performer has losses but no recorded draws |
| Shortens the rank | strips a leading `Rank ` and `#` from `.hon-rank-text`, so a card reads `12` rather than `Rank #12` |
| Adds a flame | prepends `svg.refract-ascension-icon`, Ascension's own navbar flame path with a warm gradient fill, as the read-out's lead glyph |
| Lifts the tier colour | reads the INLINE `color` off `.hon-rank-text` and sets it on the badge as the custom property `--refract-hon-tier`. Nothing Refract ships paints with it; it is there so a user's custom CSS can reach the tier colour |
| Mirrors the score | reads the text of `.hon-asc-score-value` and renders it in Refract's own `span.refract-ascension-score`, placed after the rank |
| Moves the badge | appends it into Refract's own `.stash-perf-country` caption, or into the card chin when there is no caption |

Two of those need a word.

**The score is mirrored, not restyled.** Ascension's `.hon-asc-score-display`,
`.hon-asc-score-value` and `.hon-asc-icon` each carry inline `!important`
declarations, and an inline `!important` cannot be overridden from a
stylesheet. Refract could strip those attributes and chose not to: stripping
means maintaining a property list against every future release, which is
exactly the coupling this document exists to avoid. Ascension's elements are
left as its author wrote them and taken out of the layout flow; Refract renders
its own copy of the number. This is the same thing Refract already does with
the flame glyph.

**The badge is moved.** Ascension replaces the native `.rating-banner`, which on
a Refract-themed performer card is where Refract draws its own stat pill row,
so an unmoved badge lands on top of the pills. That collision is caused by an
element Refract injects, so Refract is the one that resolves it. The move is a
position change only: the badge keeps its own DOM, its own handlers and its own
click target.

**CSS**, in `css/13_plugins.css` unless noted:

| Selector | What it does |
|---|---|
| `.refract-ascension-badge`, `.hon-battle-rank-badge.hon-battle-rank-badge-compact` | strips the capsule chrome and renders the badge as inline text at the caption's own scale, with one grounding drop-shadow for legibility over artwork |
| `.refract-ascension-badge > *` that is not `.hon-rank-text` and not Refract's own two elements | takes every other part out of flow, absolutely positioned and zero-sized. This one rule replaced four hides that used to be written by class name |
| the same selector, plus its descendants | the same, one level down |
| `.refract-ascension-badge svg:not(.refract-ascension-icon)` | inside a claimed badge, the only icon that paints is Refract's. This is the rule that closes #190 |
| `.refract-ascension-badge .hon-rank-text` | the amber-to-red gradient, via `background-clip: text` |
| `.refract-ascension-icon`, `.refract-ascension-score` and its `::before` | Refract's own elements: the flame, the mirrored score, and the hairline divider between the two numbers |
| `.stash-perf-country.refract-country-with-rank` (`16_playing_card.css`) | turns Refract's caption into a space-between row so the badge sits at the card's right edge |
| `.card-section.refract-chin-with-rank` and its children | the fallback position, for a performer with no country caption |
| `.refract-pc-hide-rank ... .hon-battle-rank-badge` (`03_cards.css`) | the customiser's switch for the whole badge |

### Elsewhere

| Where | What |
|---|---|
| Performer detail page | `#performer-page .refract-ph .quality-group .hon-battle-rank-badge` is `display: none` in `08_misc_mid.css`. Refract's redesigned performer band states the rank in words in its own standing row, so the badge would be the same fact twice. One consequence: the Ascended score is not visible anywhere in Refract unless the card element below is switched on. It is still on the badge's tooltip |
| Performer detail page, older header | `.detail-header .hon-battle-rank-badge` gets its margin zeroed and its size matched to the row it sits in |
| Performer band standing row | `refract.js` reads the badge's TEXT and matches `/#\s*(\d+)\s*(?:of\s*([\d,]+))?/i` to fill a "Ranked N of M" cell. See dependency 1 below |
| Navbar | `#plugin_hon` is given a slot order at the end of the library row (`13_plugins.css`) and mirrored as a tile in Refract's mobile drawer. Its glyph is not redrawn |
| Card tiering | Refract tiers a performer card once, at init, from the rating on the native banner, because Ascension replaces that banner on a 300ms timer. Anything that re-tiers later calls `applyCardTier` directly rather than waiting for the observer |
| Custom Fields panel | `13_plugins.css` presents `.custom-field-hotornot_stats` and `.custom-field-performer_record` in place as an "Ascension" section: a generated header in the performer's tier colour, the stat row wrapped rather than cut, and a real horizontal scroll on the timeline. It keys on STASH's `.custom-field-<key>` classes and names no Ascension class at all. No node is moved. Stash's own Custom Fields header is hidden when nothing but plugin storage is left, and the collapse is forced open in the same condition so the panel cannot be shut with no handle |

### Card customiser elements

Two entries in Refract's `CARD_ELEMS` table are gated on Ascension being
installed, and neither appears when it is not:

- **Rank badge**, on by default, hides `.hon-battle-rank-badge`.
- **Ascended score**, off by default, hides Refract's
  `.refract-ascension-score`. This is the only element in that table that ships
  off. The card read-out is one number by default, and both are available to
  anyone who wants them.

## How Refract fails safe

`ascensionBadgeUnknownPart` in `refract.js` decides whether Refract touches a
badge at all, and it claims one only when it can name every part of it:

- it must contain `.hon-rank-text`;
- every direct child must carry one of `hon-rank-emoji`,
  `hon-asc-score-display`, `hon-asc-separator`, `hon-rank-text`,
  `hon-rank-total` or `hon-match-stats`, or be one of Refract's own two
  elements;
- the only icons anywhere in it may be Refract's own and the one inside
  `.hon-asc-score-display`.

A badge that fails any of those gets no marker class, so not one of the rules
above reaches it: no flame, no hides, no gradient. It renders as Ascension drew
it, keeps a sane position on the card, and logs one console warning naming the
unfamiliar part. The parts list is the union of what 1.2.6 and 1.3.1 draw, and
each part is genuinely optional in one version or the other, so a missing part
is not a strange badge.

The reason for the inversion: hiding "any icon that is not ours" fixes the
version in front of you by asserting that Refract understands every badge it
will ever be shown. Asking "can I name this?" makes an unfamiliar badge plain
instead of wrong, which is the only outcome that cannot repeat #190 on a
version nobody has seen yet.

## Dependencies worth knowing about

Three places where Refract depends on something Ascension has never promised.

1. **The standing row parses text, not structure.** Refract's performer band
   reads the badge's `textContent` and matches `#N of M`. Under 1.3.1 that text
   is `11.00 | Rank #2 of 492`, with the Ascended score first, and the match
   still lands on the rank because the score contains no `#`. It survives, but
   by luck of the pattern rather than by design: a score format containing a
   `#`, or a rank written without one, would break it.
2. **The compact form is decided by route, not by card.** Ascension picks its
   compact badge with `isOnPerformerListPage()`, so badges on `/performers`
   have no `.hon-rank-total` and badges everywhere else (the home page, a
   studio's or a tag's performers) do. Anything measured only on `/performers`
   has not seen the other shape.
3. **Ascension force-expands the Custom Fields collapse.** `ascen-stats.js`
   opens `.collapse` when it finds either of its fields. Refract relies on
   that for the common case and forces the collapse open itself in the one
   case Ascension does not cover (a performer carrying only Refract's own
   `refract_back`), so a panel whose header is hidden is never left shut.
4. **Badges paint lazily and progressively.** Ascension fills its rank cache in
   the background, so a page settles with a fraction of its badges drawn: 16 of
   40 cards on `/performers`, and 111 of 195 on the home page, in one measured
   run each. Anything measuring these has to poll for a badge count rather than
   settle on a timer, or it measures a page that is still filling in.

## If the badge markup changes again

1. Load a page of performer cards and read the console. If Refract does not
   recognise the shape it says so, and names the part it did not recognise.
2. Add the new part to `ASCENSION_KNOWN_PARTS` in `refract.js` if it should be
   hidden, or to the `:not()` list in `13_plugins.css` if it should be shown.
3. If the new part contains an icon, decide whether it belongs inside
   `ASCENSION_ICON_HOST` or needs its own entry, or the flame will keep being
   suppressed as unknown.
4. Measure on `/performers` and on one other route, because of dependency 2.
