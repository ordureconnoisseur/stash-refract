# Design brief: the scene detail panel

Self-contained. Companion to `DESIGN_BRIEF_CARD_BACK.md` and
`DESIGN_BRIEF_CARD_CUSTOMISER.md`. This one is a full overhaul, not a tweak.

---

## 1. What this is

**Stash** is a self-hosted media library with a React web UI. **Refract** is a
dark "liquid glass" theme plugin for it, distributed publicly to other Stash
users.

Open a scene in Stash and the page is two columns: the video player on the
right, and on the left a fixed-width **detail panel** holding everything about
the scene that is not the video. Title, studio, date, technical specs, the
controls that change the scene's state, and a six-tab strip whose tabs hold
tags, performers, markers, video filters, file info, play history and the edit
form.

It is the single densest surface in the theme, it is on screen for as long as
you are watching anything, and it has never been designed as a whole. It has
been accreted: each element styled correctly on its own terms, none of them
placed in relation to the others.

## 2. The job

Redesign the panel as one composition. Rearranging, merging, or removing
elements is in scope — this is explicitly not a spacing pass. Section 8 sketches
three directions; they are observations, not a specification, and a better idea
that covers the same ground is the preferred outcome.

Two things are non-negotiable and everything else is open:

1. **Nothing that Stash can do today may become impossible.** Every control and
   every tab must remain reachable. Reachable is not the same as visible: moving
   something behind a disclosure is a legitimate design decision, losing it is
   not.
2. **Refract must not reimplement Stash's behaviour.** See section 6.

## 3. What the panel is today, measured

At a 1600px viewport. The panel is `clamp(385px, 22.5vw, 405px)` wide, giving
**338px of content** at 1600 and 358px at 1920 and above.

| | |
|---|---|
| Panel | 385 x 890px |
| Header block (studio, title, date, specs) | 41.6px tall |
| Action bar | 11 controls in one 338px row |
| Tab strip | 6 tabs, 338px |
| Tab content | 692px |
| Distinct font size/weight pairs in the panel | **20** |
| Tag chips rendered | 34, in a list capped at 98px |
| Tag content actually laid out | 203px, so **48% is behind an inner scroll** |
| One performer card | 280 x 419px, **47.1% of the panel's height** |
| Dead space below the last element | 46.5px |

### The type

Twenty size/weight pairs in a 338px column, and the clusters are not
distinguishable at a glance:

```
17.5/700  17.5/400   title, performer name
14/600    14/400  14/700
13.09/900            one number ("3.75")
12.88/700 12.88/500
11.2/500  11.2/400  11.2/700     41 uses across three weights
10.36/400 10.36/600
10.08/700 10.08/600  10.08/500   119 uses across three weights
9.24/700
8.12/600             tag chips
7.14/700             stat labels ("Rating")
```

`10.08px` carries 119 elements across three weights and `11.2px` carries 41
across three more. When one size does six different jobs it has stopped being a
level in a hierarchy and become the default.

### The problem this makes obvious

**Half the panel is one performer card.** A 419px card for a single performer,
while 34 tags fight over 98px. The panel's most valuable vertical space is spent
on its least dense content.

**The tags are the densest, most-used content and they are the most
compressed.** Three and a half rows of seven, with a fade at the bottom and an
inner scrollbar, in a panel that has 46.5px of unused space beneath it.

**Nothing has rank.** The studio eyebrow is the most saturated thing on screen.
The title is 17.5px, the date 11.2px, the specs 11.2px, and the action bar
immediately below is eleven identically-weighted circles. A first-time reader
cannot tell what this panel is *about*.

## 4. The action bar, specifically

Called out because it is the worst of it, and because the current version is a
regression on what it replaced.

Eleven controls, one row, 338px, no labels, no grouping, no rank:

| control | width | what it does |
|---|---|---|
| rating trigger | 26 | opens Stash's stars + the Advanced Ratings plugin |
| favourite | 26 | toggles favourite |
| play count | 34.8 | a count, and a click increments it |
| o count | 35.2 | a count, and a click increments it |
| organised | 26 | toggles a flag |
| operations | 26 | opens a menu of eight destructive-ish actions |
| multiview | 26 | third-party plugin |

Everything is a 26px circle or a 35px pill in the same glass, at the same
weight, with no text. Four of these mutate the scene, two are counters that
happen to also be buttons, one opens a menu, one opens a popover, one belongs to
a plugin. The row communicates none of that. It reads as a row of anonymous
dots, and the eye has nowhere to land.

The previous version was worse in a different way — it wrapped to three rows and
hid two controls off the end — but it did have the five-star widget as an anchor,
which at least told you the row was about *this scene's state*. That anchor is
gone and nothing replaced it.

**The real question is not how to lay out eleven buttons.** It is whether these
eleven things belong in one row at all. A counter that displays a number is not
the same kind of object as a destructive menu, and pretending otherwise is what
produced the dots.

## 5. Data available, free

All of this is already in the DOM or one GraphQL field away, and none of it is
currently used in the panel's composition:

- **Scene**: title, studio (with logo), date, duration, resolution, fps, codec,
  container, bitrate, filesize, path, play count, o counter, last played,
  created/updated, organised flag, rating, URLs, stash IDs.
- **Relations**: performers (with images and per-performer stats), tags, groups,
  galleries, markers with timestamps and thumbnails.
- **Refract already computes**: the performer playing-card, tier, rating banner.
- **Third-party plugins inject here**: Advanced Ratings (a scored trigger +
  modal), multiview, a "better image" source picker.

## 6. Hard constraints

These are not preferences. Breaking any of them has already caused a shipped bug.

1. **Do not move React-managed nodes.** Relocating a node out of React's tree
   desyncs its fiber and produces detached handlers and orphaned nodes on
   re-render. This caused a data-loss bug on the date field. The panel's stars,
   counters, tabs and edit form are all React. **Reposition with CSS, never with
   `appendChild`.** The rating popover already does this successfully: the stars
   stay exactly where React put them and are painted into a popover by CSS.
2. **Stash's own controls take every click.** Refract may present a control
   differently, but the click must reach Stash's element so Stash keeps its
   state. The source-selector panel and the rating popover both work this way.
3. **The column is 338-358px.** It does not grow. Any design that needs more
   width is designing a different page.
4. **Below 1200px the panel stacks under the player** and is full page width.
   The design must survive being 700-1200px wide and short, not just 338 and
   tall.
5. **No per-element `filter: drop-shadow`.** Stacked drop-shadows here were
   measured as the largest per-frame paint cost and were removed.
6. `:has()` is fine in this panel — one instance, a dozen rows. It is *not* fine
   in the card grid, where it is a known scroll-perf problem.
7. **Third-party plugin elements may appear or vanish.** The design cannot
   assume the Advanced Ratings button or the multiview button exists, and must
   not look broken when they do not.

## 7. Settled, not open for redesign

- The two-column page layout (player right, panel left).
- The tab strip existing at all, and its six destinations.
- The glass surface language, the accent token system, and Albert Sans.
- The scene player, its control bar, and the quality/codec panel — those were
  redesigned separately and are done.
- The scrubber strip beneath the player.

## 8. Candidate directions

Sketches, not specifications.

### A. Masthead

Treat the top of the panel as a masthead rather than a stack of lines: studio
logo, title, and the two or three specs that matter set as one composed block
with real hierarchy, then a hairline, then everything else. The action bar
becomes a quiet row beneath it rather than the second thing you see. Cheapest of
the three; fixes rank, does not fix density.

### B. Split the action bar by kind

Stop treating eleven unlike things as one row. State that the scene *has*
(rating, favourite, organised, play count, o count) is one kind of object and
could be a compact readout — numbers with labels, legible at a glance, clickable
where it makes sense. Actions that *do something* (operations menu, multiview,
edit) are another kind and belong somewhere else entirely, possibly folded into
the tab strip's right end. This is the direction that most directly answers the
"eleven dots" problem.

### C. Give the space to the dense content

Invert the vertical budget. The performer card at 47% and the tags at 98px is
exactly backwards for a panel whose job is telling you what this scene *is*.
Tags get room to breathe; the performer becomes a compact row that expands, or
moves to its tab. Most disruptive, biggest payoff, and the one that needs the
most care because the performer card is a signature refract element and people
like it.

The strongest answer probably takes B and C together and leaves A as a
consequence.

## 9. What good looks like

- A reader who has never seen Stash can tell, in one glance, **what scene this
  is** and **what state it is in**.
- Every control's purpose is legible without hovering it.
- The type resolves to a scale you could write down — five or six steps, not
  twenty pairs.
- Nothing dense is hidden behind an inner scrollbar while whitespace sits
  unused elsewhere in the same column.
- It still looks composed at 700px wide and stacked, and with the third-party
  plugin buttons absent.
- Nothing that Stash could do before has become impossible.

## 10. Deliverable

A design, then an implementation in `css/07_scene_details.css` plus whatever
`refract.js` injection it needs, measured before and after on the live instance.
Screenshots at 1600 and at a stacked width, with the plugin buttons both present
and absent.
