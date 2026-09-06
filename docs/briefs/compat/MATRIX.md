# Refract compatibility matrix

What Refract asks of Stash, and whether each Stash has it.

Audited: **v0.26.2** (the oldest release users are known to run, and the floor
the theme claims), **v0.29.3**, **v0.30.1**, **v0.31.1** (the three newest
minors), and **develop** at `5646b793`, 2026-05-28. Two intermediate tags,
v0.27.2 and v0.28.1, were read for the single question of which release
introduced each field; they are named in the notes rather than given columns.

Sources: `refract.js` in this worktree; the Stash checkout at
`C:\Users\ethork\Projects\stash-fork`, read with `git show <tag>:<path>` so no
branch was moved.

Legend for the outcome column:

- **uncontained** - the failure escapes into a render path or aborts module
  execution. A blank page, or a theme that does not load at all.
- **contained** - the failure is caught, the feature degrades, nothing else
  breaks.
- **guarded** - a fallback for exactly this case already existed, or was added
  in this branch.

---

## 1. GraphQL fields and arguments

| Dependency | 0.26.2 | 0.29.3 | 0.30.1 | 0.31.1 | develop | If absent |
|---|---|---|---|---|---|---|
| `Scene.groups { group { id name front_image_path } scene_index }` | absent (added 0.27) | yes | yes | yes | yes | guarded: `refractSceneQuery` retries with `movies`, which every audited version still carries |
| `Scene.movies { movie { … } scene_index }` | yes | yes (deprecated) | yes | yes | yes | the fallback target; still present on develop |
| `Scene.{id,title,details,date,rating100,o_counter,organized,interactive,interactive_speed,resume_time}` | yes | yes | yes | yes | yes | - |
| `Scene.files { id path basename width height duration video_codec frame_rate bit_rate size format fingerprints { type value } }` | yes | yes | yes | yes | yes | - |
| `Scene.paths { screenshot preview stream webp vtt sprite interactive_heatmap }` | yes | yes | yes | yes | yes | - |
| `Scene.{studio,performers,tags,galleries,scene_markers,captions,stash_ids}` | yes | yes | yes | yes | yes | - |
| `SceneMarker.{id,title,seconds}` | yes | yes | yes | yes | yes | - |
| `SceneCaption.{language_code,caption_type}` | yes | yes | yes | yes | yes | - |
| `Performer.group_count` | absent (added 0.27; was `movie_count`) | yes | yes | yes | yes | **fixed**: `refractPerfQuery` now retries with `movie_count`. Before, the whole preview performer query was rejected and the performer half of the card preview was permanently empty on 0.26 |
| `Performer.custom_fields` | absent (added 0.28) | yes | yes | yes | yes | **fixed**: `refractFlipQueryText` / `refractPbQueryText` narrow on first rejection. Before, both card-back queries were rejected whole, so on 0.26 and 0.27 every performer card back lost its stats, scene strip and photo strip, and the performer-page photo flip never appeared |
| `Performer.{measurements,height_cm,weight,career_length,birthdate,gender,country,favorite,rating100,o_counter,scene_count,image_count,gallery_count,performer_count,alias_list,tags,stash_ids,disambiguation,image_path}` | yes | yes | yes | yes | yes | - |
| `Tag.sort_name` | absent (added 0.28) | yes | yes | yes | yes | **fixed**: `refractRootTagsQueryText` and the tag editor's `tagsQ` narrow on first rejection. Before, the Categories page rendered a raw GraphQL error instead of the grid, and the performer tag editor never loaded |
| `Tag.{id,name,description,image_path,parents,children,scene_count}` | yes | yes | yes | yes | yes | - |
| `Studio.{child_studios,scene_count}` | yes | yes | yes | yes | yes | - |
| `Gallery.title` | yes | yes | yes | yes | yes | - |
| `Group.front_image_path` / `Movie.front_image_path` | movie only | both | both | both | both | covered by the groups/movies fallback |
| `SceneFilterType.{rating100,studios,performers,performer_count,tags}` | yes | yes | yes | yes | yes | - |
| `PerformerFilterType.{rating100,scene_count}` | yes | yes | yes | yes | yes | - |
| `TagFilterType.{parents,name}` | yes | yes | yes | yes | yes | - |
| `ImageFilterType.performers` | yes | yes | yes | yes | yes | - |
| `HierarchicalMultiCriterionInput.depth` | yes | yes | yes | yes | yes | - |
| `CriterionModifier.{IS_NULL,GREATER_THAN,INCLUDES,MATCHES_REGEX}` | yes | yes | yes | yes | yes | - |
| `PerformerUpdateInput.custom_fields: CustomFieldsInput` | absent (added 0.28) | yes | yes | yes | yes | contained, and now legible: `refractSetBackOverride` refuses with a plain sentence when the read side has already found no custom fields. There is no older equivalent, so this feature genuinely cannot exist before 0.28 |
| `findScene(id:)`, `findScenes(filter, scene_filter, scene_ids)` | yes | yes | yes | yes | yes | - |
| `findPerformer(id:)`, `findPerformers(filter, performer_filter, performer_ids)` | yes | yes | yes | yes | yes | - |
| `findTag(id:)`, `findTags(filter, tag_filter)`, `findStudio(id:)`, `findImages(filter, image_filter)` | yes | yes | yes | yes | yes | - |
| `jobQueue { id status }`, `JobStatus.{READY,RUNNING,STOPPING}` | yes | yes | yes | yes | yes | - |
| `configuration { ui }`, `configuration { plugins }` | yes | yes | yes | yes | yes | - |
| `configureUI(input: Map)` | yes | yes | yes | yes | yes | Refract declares `$input: Map!`; a non-null variable into a nullable argument is legal on all five |
| `configureUISetting(key: String!, value: Any)` | yes | yes | yes | yes | yes | - |
| `sceneDecrementO(id:)`, `imageDecrementO(id:)` | yes | yes | yes | yes | yes | - |
| `performerUpdate(input: PerformerUpdateInput)` | yes | yes | yes | yes | yes | the input's `custom_fields` member is the version-sensitive part, above |

Counts: **4 absent on 0.26.2** (`Scene.groups`, `Performer.group_count`,
`Performer.custom_fields`, `Tag.sort_name`, plus the `PerformerUpdateInput`
member that follows from the third). **2 absent on 0.27.2**
(`Performer.custom_fields`, `Tag.sort_name`). **0 absent on 0.28.1 and
later**, including develop. Nothing Refract asks for has been removed by any
audited version.

### How the four are handled now

`refractQueryOptional(state, fields, build, variables)`, next to `gql` and
`gqlWithVars`, runs the wide query, and on a rejection whose message names one
of the optional fields runs the narrow one and remembers the answer in
`state.narrow` for the rest of the session. Any other rejection still rejects,
so a permissions or network failure is never mistaken for an old schema. The
cost of an old server is one wasted request per feature per page load.

The card preview keeps its own version of the same trick
(`refractSceneQuery` / `refractPerfQuery`) because its transport resolves with
`{ errors }` rather than rejecting.

---

## 2. PluginApi surfaces

| Surface | 0.26.2 | 0.29.3 | 0.30.1 | 0.31.1 | develop | If absent |
|---|---|---|---|---|---|---|
| `PluginApi.React`, `PluginApi.ReactDOM` | yes | yes | yes | yes | yes | already checked before use; `registerAccentPatch` retries every 100ms until present |
| `PluginApi.patch.instead` | yes, **different contract** | yes | yes | yes | yes | **fixed**. Up to 0.26 the registry held ONE function per component and a second registration threw `instead has already been called for X`. 0.27 made it a list and chained them. So on 0.26, another plugin claiming `PluginSettings`, `MainNavBar.UtilityItems`, `MainNavBar.MenuItems` or `BooleanSetting` first turned Refract's registration into a throw at module scope, which aborted the rest of the IIFE: no mutation watcher, no card injection, no navbar work, no settings. Each registration is now its own attempt (`refractPatchInstead`) |
| patch point `PluginSettings` | absent (added 0.27) | yes | yes | yes | yes | contained. The plugin panel keeps Stash's own broken string-input row instead of Refract's pointer note. Settings still reach the Interface tab through the navbar points |
| patch point `BooleanSetting` | absent (added 0.27) | yes | yes | yes | yes | contained. One of the three redundant hosts for the settings portal is simply not there; the other two carry it |
| patch points `MainNavBar.UtilityItems`, `MainNavBar.MenuItems` | yes | yes | yes | yes | yes | if both were replaced by another plugin without chaining, the Interface section shows an empty card and `refractMountSettingsFallback` writes the "could not attach" notice into it. Already handled |
| `PluginApi.components.SceneCard` / `.PerformerCard` | absent (0.26 registers only HoverPopover, TagLink, LoadingIndicator) | yes | yes | yes | yes | contained: `canReal` is false and the preview draws its static mocks. **Hardened**: `PluginApi.components` is now read through a `|| {}`, because that read happens inside a render path where a TypeError unmounts Stash's tree and blanks the page |
| `PluginApi.loadableComponents.SceneCard` | yes | yes | yes | yes | yes | - |
| `PluginApi.loadableComponents.PerformerCard` | absent (added 0.28) | yes | yes | yes | yes | **fixed**. `loadComponents` calls `fn()` on every entry it is handed, so the missing one threw inside it and rejected the whole load, taking the SceneCard half of the preview down with it. Refract now passes only the entries the server offers |
| `PluginApi.utils.loadComponents` | yes | yes | yes | yes | yes | already checked before use |
| `PluginApi.ReactDOM.createPortal` | yes | yes | yes | yes | yes | **hardened**: checked before use, because the call sits in a render path. A missing portal now renders nothing rather than throwing |
| `PluginApi.Event.addEventListener("stash:location")` | yes | yes | yes | yes | yes | already checked at all three call sites; the route watcher falls back to the mutation observer |
| `PluginApi.libraries`, `PluginApi.register`, `PluginApi.hooks`, `PluginApi.GQL` | n/a | n/a | n/a | n/a | n/a | Refract does not use them |

Counts: **4 PluginApi differences on 0.26.2** (`instead` contract,
`PluginSettings`, `BooleanSetting`, `components.SceneCard`/`PerformerCard`),
plus `loadableComponents.PerformerCard` absent through 0.27. **1 on 0.27.2**
(`loadableComponents.PerformerCard`). **0 on 0.28.1 and later.**

---

## 3. Module-scope execution

Not a Stash surface, but the mechanism by which every one of the above became
a blank page rather than a missing feature.

`refract.js` is one IIFE. The consolidated mutation watcher at the foot wraps
each of its handlers in `try/catch`, but the FIRST call to each of them sat at
module scope, unwrapped, and so did `registerAccentPatch`. A throw in any of
the 38 top-level initialisers aborted everything after it in the file,
including the watcher itself and `boot()`.

**Fixed**: all 38 now run through `refractInit`, which reports the failure by
name on the console and carries on. This is the structural guarantee that a
schema or PluginApi surprise on an old server costs one feature, not the
theme.

---

## 4. DOM selectors

Method: every class token inside a `querySelector` / `querySelectorAll` /
`closest` / `matches` string in `refract.js` (224 tokens), and every class
token in a selector position across `css/*.css` (1,029 tokens), matched
against the whole `ui/v2.5/src` tree at each audited version.

The scan reports a token as absent when the literal string does not appear in
Stash's source. That produces false absences for two families which are NOT
compatibility problems and are excluded from the counts below:

- classes generated by a library rather than written in Stash's source:
  Bootstrap (`btn-sm`, `btn-success`, `col-md-3`, `nav-item`, `tab-pane`,
  `table-responsive`, `fixed-top`), video.js (`vjs-*`), slick (`slick-cloned`,
  `slick-current`), react-select, react-datepicker, and the Lightbox's own
  `Lightbox-*` parts;
- classes belonging to other plugins the user runs and Refract deliberately
  co-operates with: `adv-rating-*`, `hon-*`, `mv-*`, `gs-trigger`,
  `tag-manager*`, `details-tags-overhaul*`, `edit-tags-overhaul*`.

Stash-owned tokens that a version does not have:

| Version | JS selectors missing | CSS selectors missing | Reads as |
|---|---|---|---|
| 0.26.2 | 13 | ~78 | the list-toolbar, sidebar, pagination-footer, group-page and custom-fields families all postdate it |
| 0.29.3 | 4 | 7 | `quality-group`, `sort-by-select`, `column-label`, `pagination-footer-container`, `selected-count`, `sidebar-toggle-button-container` arrive in 0.30 |
| 0.30.1 | 2 | 12 | the 0.31 additions: `date-input-group`, `bulk-update-date-input`, `image-list`, `troubleshooting-mode-button`, `TagTagger*`, `col-auto`, `search-item-check`, `wall-item-check`, `dropdown-toggle-split`, `input-group-append` |
| 0.31.1 | 0 | 0 | - |
| develop | 0 | 0 | - |

The 0.26 set, named: `collapse-header`, `filtered-list-toolbar`,
`filter-slider-value`, `job-description`, `list-operations`,
`overlay-duration`, `page-count`, `page-size-selector`,
`pagination-index-container`, `plugin-settings`, `saved-filter-dropdown`,
`sidebar`, `sort-by-select`. Plus, in CSS only, the `sidebar-*`,
`pagination-footer*`, `group-*`, `custom-fields*`, `scraper-*`, `wall-item-*`
and `marker-card` families.

**Outcome for every one of them: contained.** A CSS rule whose selector
matches nothing does nothing. Every JS injector that reads one of these
null-checks the result and returns, and each is called from the mutation
watcher inside its own `try/catch`; the only unguarded call was the first one
at module scope, which section 3 fixes.

**Nothing Refract targets has been removed** between 0.26.2 and develop. Every
difference is a class that arrived later, so the direction of risk is old
servers looking plainer, never new servers breaking.

---

## 5. Everything else that was checked and is fine

- `window.fetch` is never wrapped or patched by Refract. The comment above
  `gqlXhr` explains the reverse concern - other plugins patching `fetch` -
  which is why the main transport is XHR. The one `fetch` call
  (`refractGqlQuery`, used by the card preview and the entity-page counts) now
  sends the same headers as the XHR transport, so an API-key-only session
  answers it too.
- `gqlXhr` already distinguishes a total GraphQL failure (errors, no data)
  from a partial one (some aliases resolved), rejects the first and resolves
  the second. `initSceneCards` depends on that and uses aliased singular
  `findScene(id:)` calls precisely so one missing id cannot take a page of
  badges with it.
- Every GraphQL consumer in the file has a `.catch`. After this branch, none
  of them reaches through a possibly-null `data.findX` on the way to a value.
