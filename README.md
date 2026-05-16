# Refract Theme

Liquid-glass theme for [Stash](https://github.com/stashapp/stash). Frosted glass panels, floating navbar, dark base, configurable accent — plus a rating-driven card system that turns high scores into glowing collectibles.

![Refract — accent cycle on the homepage](https://github.com/ordureconnoisseur/stash-refract/releases/download/media-assets/gif-accent-cycle.gif)

> *The GIF above cycles through all eight accents back-to-back to show the range — in normal use you pick one swatch in the plugin settings panel and the theme stays in that accent. Nothing flashes, nothing cycles.*

![Accent picker — Settings → Plugins → Refract Theme](./screenshots/accent-picker.png)

## Features

- **8 accent presets** (plus custom CSS override) — pick one, applies live to every surface
- **Three rating-display styles** — *Minimal* (accent halo), *Extravagant* (six-tier collectible-card frame from Bronze to Perfect with escalating animations), *Playing card* (trading-card layout for performer cards)
- **Refract scene cards** — title overlay on thumbnail, glass spec pills, performer / tag / O-count pills with hover popovers, watched-progress + hover-scrubber layered as one bar
- **Scene player upgrades** — controls fade after inactivity (windowed + fullscreen), restored sprite-thumbnail scrubber preview, no more seekbar flicker
- **Tag editor + duplicate checker overhauls** — alphabetical tag taxonomy with image-and-description hover popovers; comparison-card redesign with highest-res / largest-file callouts
- **Lite mode** — strips blur, shadows, and animations for older or integrated GPUs

Small niceties: horizontally-scrollable navbar at narrow widths · [stash-multiview](https://github.com/ordureconnoisseur/stash-multiview) accent integration via localStorage handoff · auto-detection of STARS vs DECIMAL rating system.

## Install

1. **Settings → Plugins → Available Plugins → Add Source**
2. Paste this URL:
   ```
   https://ordureconnoisseur.github.io/plugins/main/index.yml
   ```
3. Refresh the available plugins list, find **Refract Theme**, hit **Install**.
4. Reload Stash. The plugin self-enables.

Updates flow through the plugin browser thereafter.

## See it in action

Rated cards earn tier-coloured frames, glows, and animations that escalate with the score. Bronze breathes quietly; Perfect rotates a rainbow halo with a floating ribbon.

![Tier animations escalating from Bronze to Perfect](https://github.com/ordureconnoisseur/stash-refract/releases/download/media-assets/gif-hq-2.gif)

## Rating styles

The **Card rating style** setting changes how rated cards present themselves. Applies to both scene and performer cards (except where noted).

### Minimal (default)

An accent-coloured halo glows around the rating banner; halo brightness scales with the score, so a 9.2 glows noticeably brighter than a 5.5. Cards otherwise look the same as unrated ones — the rating is informational, not the centrepiece.

### Extravagant

Rated cards earn a tier-coloured frame, glow, and animation that escalates with the score. Both scene and performer cards are tiered.

| Tier      | Rating  | Treatment                                                          |
| --------- | ------- | ------------------------------------------------------------------ |
| Bronze    | 5.0–6.4 | Quiet breathing tier-glow                                          |
| Silver    | 6.5–7.4 | Breathing + slow sheen sweep                                       |
| Gold      | 7.5–8.4 | Faster breathing + sheen + warm inset                              |
| Diamond   | 8.5–9.4 | Breathing + sparkle particles                                      |
| Legendary | 9.5–9.9 | Dual-colour neon tube + subtle float                               |
| Perfect   | 10.0    | White-hot core, rainbow halo, hue-cycling text, ribbon + float     |

Below 5.0 the card stays default-glass. Long grids with many high-tier cards can be GPU-heavy — flip **Lite mode** on if you notice scroll jank.

![Scene cards across rating tiers](https://github.com/ordureconnoisseur/stash-refract/releases/download/media-assets/gif-hq-3.gif)

### Playing card

Performer cards switch to a trading-card layout:

- Top — name banner with tier-coloured glow (a gender icon sits to the left like a type symbol)
- Bottom — a neon stat strip overlaying the image: rating, age, scene count, O count, country flag

Scene cards keep their normal Refract chin in this mode — the trading-card layout only applies to performer cards.

![Playing-card performer mode](https://github.com/ordureconnoisseur/stash-refract/releases/download/media-assets/gif-hq-1.gif)

## Scenes page

The Refract scene-card layout overlays the title on the thumbnail and reduces metadata to a row of glass pills, leaving the image as the dominant element. Hover the performer / tag / O-count pills for popovers; the watched-progress bar overlays the hover-scrubber as a single, two-colour layered bar.

![Refract scene cards on the scenes page](https://github.com/ordureconnoisseur/stash-refract/releases/download/media-assets/gif-hq-4.gif)

## Settings

Every option saves per browser and applies instantly — no refresh needed. Open **Settings → Plugins → Refract Theme** and expand the panel.

- **Accent colour** — 8 swatches: orange (default), blue, pink, red, yellow, purple, green, teal.
- **Card rating style** — Minimal / Extravagant / Playing card (see [Rating styles](#rating-styles)).
- **Scene card style** — **Refract** (default) overlay layout, or **Classic** Stash's original row with description, file path, and details.
- **Lite mode** — strips blur, glow, animations, and hover-tilt. Use it if scrolling long grids feels heavy.
- **Show performer names** — comma-separated names line under avatar circles on scene cards.
- **Custom logo** — image URL for the navbar home button. Accepts hosted URLs and inline `data:image/...` URIs.
- **View-mode minimiser** — collapses Stash's row of view-mode buttons into one icon + chevron.

## Customisation

For an accent that isn't in the preset list, override the four CSS variables via **Settings → Interface → Custom CSS**:

```css
body.stash-liquid-glass {
    --accent: #6366f1;
    --accent-bright: #818cf8;
    --accent-light: #c7d2fe;
    --accent-rgb: 99, 102, 241;
}
```

`--accent-glow` and `--accent-tint` derive from `--accent-rgb` automatically. See [`css/01_tokens.css`](./css/01_tokens.css) for the full variable list.

## Compatibility

- **Stash**: tested on 0.27.x. Older versions may work but aren't tested.
- **Browsers**: Chrome ≥105, Edge ≥105, Safari ≥15.4, Firefox ≥121. Refract uses `:has()` extensively for context-aware styling, which gates the minimum.
- **Rating system**: Refract auto-detects whether Stash is configured for STARS or DECIMAL ratings and adjusts the banner shape (5-point star vs squircle pill) accordingly. No setting needed.

## Supported plugins

Refract themes the UIs of these plugins so they sit naturally inside the glass aesthetic. None are required — the theme works fine without them — but if you install any, you'll see them re-skinned automatically.

**Deep integration** (themed UI + custom touches)

- [**stash-multiview**](https://github.com/ordureconnoisseur/stash-multiview) — multi-scene player. The accent picked in Refract flows through to the multiview player page via a localStorage handoff. Multiview's navbar button, picking toggle, queue badge, scene-card add buttons, and floating launcher are all themed.
- [**stash-advanced-scene-rating**](https://github.com/ordureconnoisseur/stash-advanced-scene-rating) and [**stash-advanced-performer-rating**](https://github.com/ordureconnoisseur/stash-advanced-performer-rating) — the ★+ rating trigger, favourite-heart toggle, and the criterion-rating modal are all re-skinned in accent glass.

**Themed compatibility** (CSS-only re-skin)

- **flexibleDateInput** — react-datepicker calendar fully restyled: header pills, day cells, month/year dropdown panels, prev/next nav arrows.
- **stashGlobalSearch** — focus colour swapped to accent so search inputs match the rest of the theme.

**Work in progress**

- **FastTagger** — initial compat fix landed (tag-pill dropdowns no longer get clipped by FastTagger's card overflow); broader visual integration is in progress.

## Known limitations

- **Older Stash / older browsers**: Refract relies on `:has()` for context-aware styling. Stash 0.26 and earlier, or browsers older than the versions in [Compatibility](#compatibility), will get only partial styling.
- **`backdrop-filter` cost**: the frosted-glass look uses `backdrop-filter` heavily. Low-end GPUs and integrated graphics may notice scroll/animation jank, especially with the lightbox open over a busy page — **Lite mode** is the off-switch.
- **Extravagant on long grids**: tier animations multiply with card count. A page of 60+ rated cards can feel heavy on integrated graphics; Lite mode strips the animations while keeping the tier colours.
- **Third-party plugin UIs**: plugins that inject their own modals or panels (and don't reuse Stash's standard Bootstrap classes) won't be themed until Refract gets a rule for them. File an issue with the plugin name if you want one added.

## Credits

- Performer **Edit Tags** tab — image + description hover popup inspired by [Performer Tags Overhaul](https://github.com/RollainKraus/stash-plugins) by RollainKraus.

## License

[AGPL-3.0](./LICENSE)
