# Refract Theme

Liquid-glass theme for [Stash](https://github.com/stashapp/stash). Frosted glass panels, floating navbar, dark base, orange accent.

> Screenshots coming soon.

## Install

**Via Stash's plugin manager** (recommended once listed in CommunityScripts):
1. Settings → Plugins → Available Plugins
2. Find "Refract Theme" and click Install

**Manually**:
```bash
git clone https://github.com/ordureconnoisseur/stash-refract \
  ~/.stash/plugins/Refract
```
Then restart Stash and enable the plugin in Settings → Plugins.

## Compatibility

- **Stash**: tested on 0.27.x. Older versions may work but aren't tested.
- **Browsers**: Chrome ≥105, Edge ≥105, Safari ≥15.4, Firefox ≥121. Refract uses `:has()` extensively for context-aware styling, which gates the minimum.

## Recommended companion plugins

These plugins have UI integrations themed in Refract; they're not required:

- [stash-multiview](https://github.com/ordureconnoisseur/stash-multiview) — multi-scene player
- [stash-advanced-performer-rating](https://github.com/ordureconnoisseur/stash-advanced-performer-rating)
- [stash-advanced-scene-rating](https://github.com/ordureconnoisseur/stash-advanced-scene-rating)

## Customisation

Refract's colour and layout tokens are CSS variables on `body.stash-liquid-glass`. To override (e.g. swap the orange accent for indigo), paste into Stash's **Settings → Interface → Custom CSS**:

```css
body.stash-liquid-glass {
    --accent: #6366f1;
    --accent-bright: #818cf8;
    --accent-glow: rgba(99, 102, 241, 0.28);
    --accent-tint: rgba(99, 102, 241, 0.12);
}
```

See [`css/01_tokens.css`](./css/01_tokens.css) for the full variable list.

## Known limitations

- Stash's pre-auth login page can't be themed — Stash plugins don't load until after login.
- A brief flash of Stash's default blue may appear on initial page load before the plugin CSS arrives. Frame-bound, not fixable from a plugin.

## License

[AGPL-3.0](./LICENSE)
