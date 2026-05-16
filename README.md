# Refract Theme

Liquid-glass theme for [Stash](https://github.com/stashapp/stash). Frosted glass panels, floating navbar, dark base, configurable accent.

## Features

- Glass-morphism re-skin of every Stash surface — cards, filters, scene player, lightbox, settings, scene tagger, tag editor
- 8 built-in accent presets + custom override via CSS variables — applies instantly, saved per browser
- Three rating-display styles for scene and performer cards — **Minimal** (accent halo), **Extravagant** (six-tier collectible card frame), **Playing card** (trading-card layout for performer cards)
- Two scene-card layouts — **Refract** (default — title overlay on thumbnail, glass spec pills, performer / tag / O-count pills, hover-scrubber overlay) or **Classic** (Stash's original card with description and file path)
- Lite mode — strips backdrop-blur, glow shadows, animations, and hover-tilt for older or integrated GPUs
- Horizontally-scrollable navbar at narrow desktop widths instead of icons collapsing one-by-one
- Tag editor overhaul (Settings → Tags / performer Edit → Tags tab) — alphabetical taxonomy, hover tooltip with the tag's image + description, themed editing flow
- Scene player upgrades — controls fade after inactivity (windowed + fullscreen), restored sprite-thumbnail preview on scrubber hover, seekbar flicker fix
- Duplicate checker comparison-card redesign — at-a-glance highest-resolution / largest-file callouts
- Theme-aware integration with [stash-multiview](https://github.com/ordureconnoisseur/stash-multiview) — accent flows into the multiview player via a localStorage handoff

![Scenes page](https://github.com/ordureconnoisseur/stash-refract/releases/download/media-assets/gif-hq-4.gif)

The accent picker lives in **Settings → Plugins → Refract Theme** and applies live to every surface — navbar, cards, filter pills, scene tagger, and any companion plugin that's been theme-aware'd.

## Settings

Open **Settings → Plugins → Refract Theme** and expand the panel. Every option saves per browser and applies instantly — no refresh.

| Setting               | Options                                       | What it does                                                                                                                                       |
| --------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Accent colour         | 8 swatches                                    | Orange (default), blue, pink, red, yellow, purple, green, teal. Drives every accent surface in the theme.                                          |
| View-mode minimiser   | On / Off                                      | Collapses Stash's row of view-mode buttons into one icon + chevron to reduce toolbar clutter.                                                      |
| Custom logo           | Image URL                                     | Replaces the navbar home button's orb. Accepts hosted URLs and inline `data:image/...` URIs.                                                       |
| Card rating style     | Minimal / Extravagant / Playing card          | How rated scene and performer cards present themselves. See [Rating styles](#rating-styles) below.                                                 |
| Lite mode             | On / Off                                      | Strips blur, glow, animations, and hover-tilt. Use it if scrolling long grids feels heavy.                                                         |
| Scene card style      | Refract / Classic                             | **Refract** (default) is the new minimal layout — title overlays the thumbnail, metadata becomes glass pills. **Classic** restores Stash's row with description, file path, and details. |
| Show performer names  | On / Off                                      | Adds a comma-separated performer-name line under the avatar circles on scene cards.                                                                |

## Rating styles

The **Card rating style** setting changes how rated cards present themselves. The choice applies to both scene and performer cards (with one exception — see Playing card below).

### Minimal (default)

An accent-coloured halo glows around the rating banner; the halo brightness scales with the score, so a 9.2 glows noticeably brighter than a 5.5. Cards otherwise look the same as unrated ones — the rating is informational, not the centrepiece.

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

![Tier animations](https://github.com/ordureconnoisseur/stash-refract/releases/download/media-assets/gif-hq-2.gif)

### Playing card

Performer cards switch to a trading-card layout:

- Top: name banner with tier-coloured glow (a gender icon sits to the left like a type symbol)
- Bottom: a neon stat strip overlaying the image — rating, age, scene count, O count, country flag

Scene cards keep their normal Refract chin in this mode — the trading-card layout only applies to performer cards.

![Playing-card performer mode](https://github.com/ordureconnoisseur/stash-refract/releases/download/media-assets/gif-hq-1.gif)

## Install

Recommended — via Stash plugin browser:

1. **Settings → Plugins → Available Plugins → Add Source**
2. Paste this URL:
   ```
   https://ordureconnoisseur.github.io/plugins/main/index.yml
   ```
3. Refresh the available plugins list, find **Refract Theme**, hit **Install**.
4. Reload Stash. The plugin self-enables.

Updates flow through the plugin browser thereafter.

## Compatibility

- **Stash**: tested on 0.27.x. Older versions may work but aren't tested.
- **Browsers**: Chrome ≥105, Edge ≥105, Safari ≥15.4, Firefox ≥121. Refract uses `:has()` extensively for context-aware styling, which gates the minimum.
- **Rating system**: Refract auto-detects whether Stash is configured for STARS or DECIMAL ratings and adjusts the banner shape (5-point star vs squircle pill) accordingly. No setting needed.

## Recommended companion plugins

These plugins have UI integrations themed in Refract; they're not required:

- [stash-multiview](https://github.com/ordureconnoisseur/stash-multiview) — multi-scene player
- [stash-advanced-performer-rating](https://github.com/ordureconnoisseur/stash-advanced-performer-rating)
- [stash-advanced-scene-rating](https://github.com/ordureconnoisseur/stash-advanced-scene-rating)

## Customisation

Most users will be set after picking an accent + a rating style in the [Settings](#settings) panel. The notes below cover the things that aren't surfaced as toggles.

### Accent colour presets

Refract ships with seven alternate accents in addition to the default orange. Open **Settings → Plugins → Refract Theme**, expand its panel, and click one of the eight colour swatches in the **Accent colour** row — orange (default), blue, pink, red, yellow, purple, green, or teal. The change applies instantly and is saved per browser; no refresh needed.

### Custom colour

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

## Known limitations

- **Older Stash / older browsers**: Refract relies on `:has()` for context-aware styling. Stash 0.26 and earlier, or browsers older than the versions in [Compatibility](#compatibility), will get only partial styling.
- **`backdrop-filter` cost**: the frosted-glass look uses `backdrop-filter` heavily. Low-end GPUs and integrated graphics may notice scroll/animation jank, especially with the lightbox open over a busy page — **Lite mode** is the off-switch.
- **Extravagant on long grids**: tier animations multiply with card count. A page of 60+ rated cards can feel heavy on integrated graphics; **Lite mode** strips the animations while keeping the tier colours.
- **Third-party plugin UIs**: plugins that inject their own modals or panels (and don't reuse Stash's standard Bootstrap classes) won't be themed until Refract gets a rule for them. File an issue with the plugin name if you want one added.

## Credits

- Performer **Edit Tags** tab — image + description hover popup inspired by [Performer Tags Overhaul](https://github.com/RollainKraus/stash-plugins) by RollainKraus.

## License

[AGPL-3.0](./LICENSE)
