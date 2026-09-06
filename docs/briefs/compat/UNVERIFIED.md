# Compat checks that need a running Stash

Everything in `MATRIX.md` was settled by reading Stash's schema and source at
each tag. The items below were settled the same way but rest on an assumption
about RUNTIME behaviour that only a live server of that version can confirm.
Each one names the exact thing to run and the exact result that means "pass".

The fixes are written so that a failure here degrades rather than breaks, so
none of these blocks a ship. They decide whether a feature comes back on an
old server or stays dark.

---

## U1. The wording of an unknown-field error

**Why it matters.** Four fallbacks in this branch fire on a substring match
against the error message: `refractQueryOptional` looks for `custom_fields` or
`sort_name`, `refractSceneQuery` for `groups`, `refractPerfQuery` for
`group_count`. If a server words the rejection without naming the field, the
narrow query never runs and the feature stays dark, exactly as it is today.

**Needs:** Stash 0.26.x and 0.27.x.

**Run** (browser console on the fixture, or `curl` to `/graphql`):

```js
fetch("/graphql", {
  method: "POST",
  credentials: "same-origin",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ query: "query { findPerformer(id: \"1\") { id custom_fields } }" })
}).then(r => r.json()).then(j => console.log(JSON.stringify(j.errors)));
```

**Expect:** an `errors` array whose first `message` contains the literal
string `custom_fields`. The gqlgen wording is
`Cannot query field "custom_fields" on type "Performer".`

Repeat with `sort_name` on `findTags`, `groups` on `findScenes`, and
`group_count` on `findPerformers`. All four must name the field.

**If one does not:** widen that fallback's trigger list in
`refractQueryOptional`'s caller to include a phrase the server does use, or
change the trigger to "any rejection on the first attempt of this query".

---

## U2. Does 0.26 actually throw on a second `instead`?

**Why it matters.** This is the one uncontained failure the audit found, and
the fix (`refractPatchInstead`) is a `try/catch` around each registration. The
throw is plain in `patch.tsx` at v0.26.2:

```ts
export function instead(component: string, fn: Function) {
  if (insteadFns[component]) {
    throw new Error("instead has already been called for " + component);
  }
  insteadFns[component] = fn;
}
```

but it only bites when a SECOND plugin wants the same point, which needs two
plugins installed to reproduce.

**Needs:** Stash 0.26.x, Refract, and any second plugin that patches
`MainNavBar.UtilityItems` or `MainNavBar.MenuItems` with `instead`. A
three-line stub plugin will do.

**Run:** load both, hard refresh, and read the console.

**Expect, with the fix:** one `[refract] could not patch MainNavBar.MenuItems:
instead has already been called for MainNavBar.MenuItems` warning, the theme
otherwise fully alive, and the settings panel present in Settings ->
Interface -> Refract (the other navbar point carries it).

**Expect, without the fix (to confirm the bug was real):** a single uncaught
error and a page with the CSS applied but no injected cards, no navbar work
and no settings section at all.

---

## U3. The card preview on 0.26 and 0.27

**Why it matters.** Three separate fixes converge here and the answer differs
by version.

**Needs:** Stash 0.26.x and 0.27.x with a non-empty library.

**Run:** open Settings -> Interface -> Refract and watch the preview box, with
the network tab open.

**Expect on 0.27:** two requests for the scene (the first naming `groups` is
rejected, the retry naming `movies` succeeds) and one for the performer. The
scene card renders for real. The performer card falls back to the mock,
because `loadableComponents.PerformerCard` does not exist until 0.28 - this is
correct, not a regression.

**Expect on 0.26:** two scene requests (`groups` then `movies`) and two
performer requests (`group_count` then `movie_count`), all four resolving, and
then BOTH cards drawn as static mocks, because `PluginApi.components` on 0.26
holds only HoverPopover, TagLink and LoadingIndicator. The point of the fix
here is that the box shows the mocks immediately instead of erroring first.

**Fails if:** the box shows "Preview unavailable", or the console carries a
TypeError from `loadComponents`.

---

## U4. Card backs on 0.26 and 0.27 after the custom_fields narrowing

**Why it matters.** `refractFlipQueryText(false)` drops `custom_fields` and
therefore drops the per-performer override. Everything else on the back -
stats, top scenes, top photos, the global back-image rule - should come back.

**Needs:** Stash 0.26.x or 0.27.x, a performer with a rating, scenes and
images.

**Run:** flip a performer card on the performers list.

**Expect:** the back draws with its stat pills filled and its scene strip
populated. No "Couldn't load stats". The performer page shows its photo flip
tab. Choosing "Set image (back)..." reports, in the toolbar tooltip, "This
Stash has no custom fields, so a per-performer back image cannot be saved."

**Fails if:** the back still says "Couldn't load stats", which would mean the
narrowing did not fire (see U1).

---

## U5. The Categories page on 0.26 and 0.27

**Needs:** Stash 0.26.x or 0.27.x with at least one root tag.

**Run:** navigate to `/categories`.

**Expect:** the grid, sorted by `name` (there is no `sort_name` to sort by),
with scene counts.

**Fails if:** the page still renders the GraphQL error text, which again would
point at U1.

---

## U6. Whether 0.26's `PluginSettings` absence is visibly ugly

**Why it matters.** Refract's `instead("PluginSettings")` replaces Stash's
native string-input row for the refract plugin with a pointer note. On 0.26
that patch point does not exist, so the native row renders. The audit calls
this contained, but nobody has looked at it.

**Needs:** Stash 0.26.x.

**Run:** Settings -> Plugins -> Refract Theme.

**Expect:** Stash's own settings rows, unstyled by us but not broken.

**If it looks bad:** the DOM-level fallback is to hide that panel's body from
CSS on a body class, or to inject the pointer note next to it from the
mutation watcher. Not worth doing until somebody has seen it.

---

## U7. The 0.26 list pages, visually

**Why it matters.** Section 4 of the matrix says ~78 CSS selectors match
nothing on 0.26 - the whole sidebar, list-toolbar, pagination-footer and
group-page families. "Matches nothing" is provably safe; "still looks like
Refract" is a judgement only a screenshot can settle.

**Needs:** Stash 0.26.x.

**Run:** open `/scenes`, `/performers`, `/tags`, and a scene detail page.

**Expect:** cards, navbar, glass surfaces and typography all themed; the
filter toolbar and pagination in Stash's native styling rather than Refract's.
Degraded, legible, not broken.

**Fails if:** anything overlaps, is unreadable, or has a control that cannot
be clicked.
