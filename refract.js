/* Stash Theme — small JS layer.
   - Adds body class for theme scope
   - Sweeps v1 DOM artifacts (orphaned label spans, fallback i tags, old Categories link)
   - Replaces the iconless "New" button text with a + SVG
   - Navbar brand: "Stash" text → empty; home orb styling (see refract.js (CSS partials))
   - Library settings: Add directory control → btn-primary label "Add" (aria keeps full phrase)
   - Settings sidebar: wrap TroubleshootingModeButton in .nav-item (Stash renders it bare under .nav)
   - Renders the /categories overlay if the user navigates there directly
*/
(function () {
    "use strict";

    try {
        if (document.documentElement) {
            document.documentElement.classList.add("stash-liquid-glass");
        }
        if (document.body) {
            document.body.classList.add("stash-liquid-glass");
        }
    } catch (e) { /* ignore */ }


    var REFRACT_PRESETS = ["blue", "pink", "red", "yellow", "purple", "green", "teal"];
    var REFRACT_PRESETS_ALL = ["orange", "blue", "pink", "red", "yellow", "purple", "green", "teal"];
    var ACCENT_STORAGE_KEY = "refract.accent";
    var REFRACT_SWATCH_COLORS = {
        orange: "#f97316",
        blue:   "#3b82f6",
        pink:   "#ec4899",
        red:    "#ef4444",
        yellow: "#eab308",
        purple: "#a855f7",
        green:  "#22c55e",
        teal:   "#14b8a6"
    };

    function getStoredAccent() {
        try {
            var v = localStorage.getItem(ACCENT_STORAGE_KEY);
            if (v && REFRACT_PRESETS_ALL.indexOf(v) !== -1) { return v; }
        } catch (e) { /* ignore */ }
        return "orange";
    }

    function applyAccentClass(accent) {
        if (!document.body) { return; }
        /* Only strip the 7 accent classes — not refract-light or
           refract-lite, which are orthogonal axes that the accent
           picker must not clobber. */
        REFRACT_PRESETS.forEach(function (p) {
            document.body.classList.remove("refract-" + p);
        });
        if (REFRACT_PRESETS.indexOf(accent) !== -1) {
            document.body.classList.add("refract-" + accent);
        }
        broadcastAccentToPlugins();
    }

    /* Mirror the resolved accent CSS vars + the URL of Refract's
       multiview-player overlay stylesheet to localStorage under a
       multiview-namespaced contract. Plugin pages served outside
       Stash's theme cascade (multiview's player at
       /plugin/multiView/assets/index.html) can't see Refract's CSS,
       but they CAN read this handoff on load: replay the vars onto
       their own :root, and inject our overlay <link> alongside. */
    function broadcastAccentToPlugins() {
        setTimeout(function () {
            try {
                var cs = getComputedStyle(document.body);
                var a = cs.getPropertyValue("--accent").trim();
                var b = cs.getPropertyValue("--accent-bright").trim();
                var t = cs.getPropertyValue("--accent-tint").trim();
                var r = cs.getPropertyValue("--accent-rgb").trim();
                if (a) { localStorage.setItem("mv.theme.accent", a); }
                if (b) { localStorage.setItem("mv.theme.accentBright", b); }
                if (t) { localStorage.setItem("mv.theme.accentTint", t); }
                if (r) { localStorage.setItem("mv.theme.accentRgb", r); }

                /* Locate Refract's plugin asset prefix by introspecting
                   the URL of Stash's bundled CSS endpoint for this plugin.
                   Stash injects ONE <link> per plugin, served at
                   /plugin/<id>/css (concatenated bundle), and serves
                   individual asset files at /plugin/<id>/assets/<path>.
                   We rewrite the bundle URL to point at our standalone
                   multiview-player.css that lives in css/. */
                var REFRACT_PLUGIN_ID = "refract";
                var refractStyleUrl = null;
                var links = document.querySelectorAll('link[rel="stylesheet"]');
                for (var i = 0; i < links.length; i++) {
                    var href = links[i].href || "";
                    if (href.indexOf("/plugin/" + REFRACT_PLUGIN_ID + "/css") !== -1) {
                        refractStyleUrl = href.replace(/\/css(\?.*)?$/, "/assets/css/multiview-player.css");
                        break;
                    }
                }
                if (refractStyleUrl) {
                    localStorage.setItem("mv.theme.styleUrl", refractStyleUrl);
                }
            } catch (e) { /* ignore */ }
        }, 0);
    }

    function applyAccentPreset() { applyAccentClass(getStoredAccent()); }
    applyAccentPreset();

    /* Refract's accent picker. Hooked into Stash's React tree via
       PluginApi.patch.instead("PluginSettings"), so the plugin panel for
       Refract Theme renders our React component instead of Stash's broken
       native string-input row. PluginID prop confirmed at runtime. */
    function buildAccentSwatchPicker() {
        var R = PluginApi.React;
        return function AccentSwatchPicker() {
            var stored = R.useState(getStoredAccent());
            var accent = stored[0];
            var setLocalAccent = stored[1];

            var minimiserState = R.useState(isViewMinimiserEnabled());
            var minimiserOn = minimiserState[0];
            var setMinimiserOn = minimiserState[1];

            var logoState = R.useState(getStoredLogoUrl());
            var logoUrl = logoState[0];
            var setLogoUrl = logoState[1];

            var ratingState = R.useState(getStoredRatingStyle());
            var ratingStyle = ratingState[0];
            var setRatingStyle = ratingState[1];

            var liteState = R.useState(isLiteModeEnabled());
            var liteOn = liteState[0];
            var setLiteOn = liteState[1];

            var lightState = R.useState(isLightModeEnabled());
            var lightOn = lightState[0];
            var setLightOn = lightState[1];

            var cardStyleState = R.useState(getStoredCardStyle());
            var cardStyle = cardStyleState[0];
            var setCardStyle = cardStyleState[1];

            var showNamesState = R.useState(isShowPerformerNamesEnabled());
            var showNamesOn = showNamesState[0];
            var setShowNamesOn = showNamesState[1];

            /* Custom CSS Source state: { loaded, url } where url is
               the value Stash currently has set (empty if not set). */
            var cssSrc = R.useState({ loaded: false, url: "" });
            var cssSrcState = cssSrc[0];
            var setCssSrcState = cssSrc[1];
            R.useEffect(function () {
                getUiConfig().then(function (ui) {
                    var key = findCssUrlKey(ui);
                    setCssSrcState({ loaded: true, url: ui[key] || "" });
                }).catch(function () {
                    setCssSrcState({ loaded: true, url: "" });
                });
            }, []);
            var pluginCssUrl = getPluginCssUrl();
            var cssIsOurs = cssSrcState.url === pluginCssUrl;
            var cssIsEmpty = !cssSrcState.url;
            function clickApplyCss() {
                if (!cssSrcState.loaded) { return; }
                if (cssIsOurs) {
                    /* Remove. */
                    setCustomCssUrl("").then(function () {
                        setCssSrcState({ loaded: true, url: "" });
                    });
                    return;
                }
                if (!cssIsEmpty) {
                    var ok = window.confirm(
                        "Custom CSS Source is currently set to:\n\n" +
                        cssSrcState.url + "\n\nReplace it with the Refract theme URL?"
                    );
                    if (!ok) { return; }
                }
                setCustomCssUrl(pluginCssUrl).then(function () {
                    setCssSrcState({ loaded: true, url: pluginCssUrl });
                });
            }

            function pickRatingStyle(style) {
                try { localStorage.setItem(RATING_STYLE_STORAGE_KEY, style); } catch (e) { /* ignore */ }
                applyRatingStyleClass(style);
                setRatingStyle(style);
                tagFilledRatings();
            }

            function toggleLight() {
                var next = !lightOn;
                /* Use View Transitions when supported (Chromium 111+,
                   Safari 18+, Firefox 137+) — browser snapshots the
                   current state, runs the DOM change, then crossfades.
                   Handles all the visual deltas (bg gradient, shadows,
                   accent glow, text colors) in one smooth fade rather
                   than instant flash. Fall back to instant on older
                   browsers. */
                function commit() {
                    try { localStorage.setItem(LIGHT_MODE_STORAGE_KEY, next ? "1" : "0"); } catch (e) { /* ignore */ }
                    applyLightModeClass(next);
                    setLightOn(next);
                }
                if (typeof document.startViewTransition === "function") {
                    document.startViewTransition(commit);
                } else {
                    commit();
                }
            }

            function toggleLite() {
                var next = !liteOn;
                try { localStorage.setItem(LITE_MODE_STORAGE_KEY, next ? "1" : "0"); } catch (e) { /* ignore */ }
                applyLiteModeClass(next);
                setLiteOn(next);
                /* Re-run the sidebar performer carousel setup so clones get
                   added (lite→full) or removed (full→lite) immediately. */
                try { setupSceneTabsPerformers(); } catch (e) { /* ignore */ }
            }

            function pickCardStyle(style) {
                try { localStorage.setItem(MINIMAL_CARDS_STORAGE_KEY, style); } catch (e) { /* ignore */ }
                applyCardStyleClass(style);
                setCardStyle(style);
            }

            function toggleShowNames() {
                var next = !showNamesOn;
                try { localStorage.setItem(SHOW_PERF_NAMES_STORAGE_KEY, next ? "1" : "0"); } catch (e) { /* ignore */ }
                applyShowPerformerNamesClass(next);
                setShowNamesOn(next);
            }

            function pick(preset) {
                try { localStorage.setItem(ACCENT_STORAGE_KEY, preset); } catch (e) { /* ignore */ }
                applyAccentClass(preset);
                setLocalAccent(preset);
            }

            function toggleMinimiser() {
                var next = !minimiserOn;
                try { localStorage.setItem(VIEW_MINIMISER_STORAGE_KEY, next ? "1" : "0"); } catch (e) { /* ignore */ }
                setMinimiserOn(next);
                if (next) { initViewModeDropdown(); }
                else { teardownViewModeDropdown(); }
            }

            function updateLogoUrl(value) {
                var trimmed = (value || "").trim();
                try {
                    if (trimmed) { localStorage.setItem(LOGO_URL_STORAGE_KEY, trimmed); }
                    else { localStorage.removeItem(LOGO_URL_STORAGE_KEY); }
                } catch (e) { /* ignore */ }
                setLogoUrl(value);
                refineBrandHomeOrb();
            }

            var swatches = REFRACT_PRESETS_ALL.map(function (preset) {
                var label = preset.charAt(0).toUpperCase() + preset.slice(1);
                return R.createElement("button", {
                    key: preset,
                    type: "button",
                    className: "refract-accent-swatch" + (preset === accent ? " is-active" : ""),
                    style: { backgroundColor: REFRACT_SWATCH_COLORS[preset] },
                    title: label,
                    "aria-label": label,
                    onClick: function () { pick(preset); }
                });
            });
            /* Light/dark mode toggle — disabled for this release while
               light-mode CSS is still being refined. Flip the flag to
               re-enable. All state (lightOn/setLightOn/toggleLight) +
               body-class bootstrap stays in place so the underlying
               feature is one-line ship-able when ready. */
            var SHOW_LIGHT_MODE_TOGGLE = false;
            if (SHOW_LIGHT_MODE_TOGGLE) {
                swatches.push(R.createElement("button", {
                    key: "__light",
                    type: "button",
                    className: "refract-accent-swatch refract-light-toggle" + (lightOn ? " is-active" : ""),
                    title: lightOn ? "Switch to dark mode" : "Switch to light mode",
                    "aria-label": "Toggle light/dark mode",
                    onClick: toggleLight
                }, lightOn ? "☀" : "☾"));
            }

            return R.createElement("div", { className: "plugin-settings" },
                R.createElement("div", { className: "setting", id: "plugin-refract-accent" },
                    R.createElement("div", null,
                        R.createElement("h3", null, "Accent colour"),
                        R.createElement("div", { className: "sub-heading" },
                            "Click a swatch to apply instantly. Saved per browser.")
                    ),
                    R.createElement("div", { className: "refract-accent-swatches" }, swatches)
                ),
                R.createElement("div", { className: "setting", id: "plugin-refract-view-minimiser" },
                    R.createElement("div", null,
                        R.createElement("h3", null, "View-mode minimiser"),
                        R.createElement("div", { className: "sub-heading" },
                            "Collapse the row of view-mode buttons into a single icon + expand chevron. Disable to use Stash's original button group.")
                    ),
                    R.createElement("div", { className: "refract-setting-control" },
                        R.createElement("div", { className: "custom-control custom-switch" },
                            R.createElement("input", {
                                type: "checkbox",
                                className: "custom-control-input",
                                id: "refract-view-minimiser-toggle",
                                checked: minimiserOn,
                                onChange: toggleMinimiser
                            }),
                            R.createElement("label", {
                                className: "custom-control-label",
                                htmlFor: "refract-view-minimiser-toggle"
                            })
                        )
                    )
                ),
                R.createElement("div", { className: "setting", id: "plugin-refract-custom-logo" },
                    R.createElement("div", null,
                        R.createElement("h3", null, "Custom logo"),
                        R.createElement("div", { className: "sub-heading" },
                            "Image URL displayed in the navbar home button. Leave empty for the default Refract orb. Hosted URLs and ",
                            R.createElement("code", null, "data:image/..."),
                            " URIs are both supported.")
                    ),
                    R.createElement("div", { className: "refract-setting-control" },
                        R.createElement("input", {
                            type: "text",
                            className: "form-control refract-logo-input",
                            placeholder: "https://example.com/logo.png",
                            value: logoUrl,
                            onChange: function (e) { updateLogoUrl(e.target.value); }
                        })
                    )
                ),
                R.createElement("div", { className: "setting", id: "plugin-refract-rating-style" },
                    R.createElement("div", null,
                        R.createElement("h3", null, "Card rating style"),
                        R.createElement("div", { className: "sub-heading" },
                            R.createElement("b", null, "Minimal"), " (default) — accent-coloured halo for every rating; brightness scales with score. ",
                            R.createElement("b", null, "Extravagant"), " — tier-based card frame, halo, and animations escalating from Bronze through Perfect. ",
                            R.createElement("b", null, "Playing card"), " — trading-card layout for performer cards: name banner at the top with tier-glow, prominent stat strip along the bottom (rating, age, scenes, O count, country).")
                    ),
                    R.createElement("div", { className: "refract-setting-control refract-rating-style-toggle" },
                        [
                            { key: "intensity",    label: "Minimal" },
                            { key: "tiers",        label: "Extravagant" },
                            { key: "playing-card", label: "Playing card" }
                        ].map(function (item) {
                            return R.createElement("button", {
                                key: item.key,
                                type: "button",
                                className: "refract-segmented-btn" + (ratingStyle === item.key ? " is-active" : ""),
                                onClick: function () { pickRatingStyle(item.key); }
                            }, item.label);
                        })
                    )
                ),
                R.createElement("div", { className: "setting", id: "plugin-refract-lite-mode" },
                    R.createElement("div", null,
                        R.createElement("h3", null, "Lite mode"),
                        R.createElement("div", { className: "sub-heading" },
                            "Strip backdrop-blur, glow shadows, animations, hover effects, and the performer carousel loop trick. Lighter on GPU; recommended on older or integrated graphics.")
                    ),
                    R.createElement("div", { className: "refract-setting-control" },
                        R.createElement("div", { className: "custom-control custom-switch" },
                            R.createElement("input", {
                                type: "checkbox",
                                className: "custom-control-input",
                                id: "refract-lite-mode-toggle",
                                checked: liteOn,
                                onChange: toggleLite
                            }),
                            R.createElement("label", {
                                className: "custom-control-label",
                                htmlFor: "refract-lite-mode-toggle"
                            })
                        )
                    )
                ),
                R.createElement("div", { className: "setting", id: "plugin-refract-card-style" },
                    R.createElement("div", null,
                        R.createElement("h3", null, "Scene card style"),
                        R.createElement("div", { className: "sub-heading" },
                            R.createElement("b", null, "Refract"), " (default) — tidier minimal layout; description block hidden so the grid stays consistent across scenes with and without descriptions. ",
                            R.createElement("b", null, "Classic"), " — Stash's original card layout with description, file path, and details visible.")
                    ),
                    R.createElement("div", { className: "refract-setting-control refract-card-style-toggle" },
                        [
                            { key: "refract", label: "Refract" },
                            { key: "classic", label: "Classic" }
                        ].map(function (item) {
                            return R.createElement("button", {
                                key: item.key,
                                type: "button",
                                className: "refract-segmented-btn" + (cardStyle === item.key ? " is-active" : ""),
                                onClick: function () { pickCardStyle(item.key); }
                            }, item.label);
                        })
                    )
                ),
                R.createElement("div", { className: "setting", id: "plugin-refract-show-perf-names" },
                    R.createElement("div", null,
                        R.createElement("h3", null, "Show performer names"),
                        R.createElement("div", { className: "sub-heading" },
                            "Display performer names as a comma-separated line under the avatar circles on scene cards. Useful when you don't want to hover each circle.")
                    ),
                    R.createElement("div", { className: "refract-setting-control" },
                        R.createElement("div", { className: "custom-control custom-switch" },
                            R.createElement("input", {
                                type: "checkbox",
                                className: "custom-control-input",
                                id: "refract-show-perf-names-toggle",
                                checked: showNamesOn,
                                onChange: toggleShowNames
                            }),
                            R.createElement("label", {
                                className: "custom-control-label",
                                htmlFor: "refract-show-perf-names-toggle"
                            })
                        )
                    )
                ),
                /* Custom CSS Source setting — disabled for this release.
                   Flip the flag to re-enable. Supporting code (cssSrc
                   state, getUiConfig/setCustomCssUrl helpers) stays in
                   place so the underlying flow is intact. */
                (function () {
                    var SHOW_CUSTOM_CSS_SOURCE = false;
                    if (!SHOW_CUSTOM_CSS_SOURCE) { return null; }
                    return R.createElement("div", { className: "setting", id: "plugin-refract-css-source" },
                        R.createElement("div", null,
                            R.createElement("h3", null, "Theme on login + early load"),
                            R.createElement("div", { className: "sub-heading" },
                                "Writes the plugin's CSS endpoint URL into Stash's Custom CSS Source so the theme loads BEFORE plugins ",
                                R.createElement("—", null),
                                " on the login page and the first-paint flash of every cold load. Toggle off to remove. ",
                                cssSrcState.loaded && cssSrcState.url
                                    ? R.createElement("div", { style: { marginTop: "0.4rem", opacity: 0.7, fontSize: "0.75rem", wordBreak: "break-all" } },
                                        "Current: ", cssSrcState.url)
                                    : null
                            )
                        ),
                        R.createElement("div", { className: "refract-setting-control" },
                            R.createElement("button", {
                                type: "button",
                                className: "refract-segmented-btn" + (cssIsOurs ? " is-active" : ""),
                                onClick: clickApplyCss,
                                disabled: !cssSrcState.loaded
                            },
                                !cssSrcState.loaded
                                    ? "Loading…"
                                    : cssIsOurs
                                        ? "Remove"
                                        : cssIsEmpty
                                            ? "Apply"
                                            : "Replace…"
                            )
                        )
                    );
                })()
            );
        };
    }

    function registerAccentPatch() {
        if (typeof PluginApi === "undefined" || !PluginApi.patch || !PluginApi.React) {
            setTimeout(registerAccentPatch, 100);
            return;
        }
        var AccentSwatchPicker = buildAccentSwatchPicker();
        PluginApi.patch.instead("PluginSettings", function () {
            var args = Array.prototype.slice.call(arguments);
            var next = args.pop();
            var props = args[0];
            if (!props || props.pluginID !== "refract") {
                return next.apply(null, args);
            }
            return PluginApi.React.createElement(AccentSwatchPicker);
        });
    }
    registerAccentPatch();

    var CATEGORIES_PATH = "/categories";
    var STORAGE_KEY_API = "refract.apiKey";
    var VIEW_MINIMISER_STORAGE_KEY = "refract.viewMinimiser";
    var LOGO_URL_STORAGE_KEY = "refract.customLogoUrl";
    var LITE_MODE_STORAGE_KEY = "refract.liteMode";
    var LIGHT_MODE_STORAGE_KEY = "refract.lightMode";
    var MINIMAL_CARDS_STORAGE_KEY = "refract.minimalCards";
    var SHOW_PERF_NAMES_STORAGE_KEY = "refract.showPerformerNames";
    var RATING_STYLE_STORAGE_KEY = "refract.ratingStyle";
    var RATING_STYLES = ["intensity", "tiers", "playing-card"];
    var GRAPHQL_URL = "/graphql";

    /* Scene card style. "refract" (the new default) = tidier minimal
       layout — description block hidden so the grid stays consistent.
       "classic" = Stash's original layout with description and details.
       Reuses MINIMAL_CARDS_STORAGE_KEY for backwards compat; legacy
       boolean values ("1" / "0") are mapped transparently. The body
       class `refract-minimal-cards` stays on the "refract" branch so
       the existing CSS that depends on it doesn't need renaming. */
    function getStoredCardStyle() {
        try {
            var v = localStorage.getItem(MINIMAL_CARDS_STORAGE_KEY);
            if (v === "classic" || v === "0") { return "classic"; }
            if (v === "refract" || v === "1") { return "refract"; }
        } catch (e) { /* ignore */ }
        return "refract";
    }
    function applyCardStyleClass(style) {
        if (!document.body) { return; }
        document.body.classList.toggle("refract-minimal-cards", style === "refract");
    }
    applyCardStyleClass(getStoredCardStyle());

    /* Performer names under scene-card avatar circles. */
    function isShowPerformerNamesEnabled() {
        try { return localStorage.getItem(SHOW_PERF_NAMES_STORAGE_KEY) === "1"; }
        catch (e) { return false; }
    }
    function applyShowPerformerNamesClass(on) {
        if (!document.body) { return; }
        document.body.classList.toggle("refract-show-perf-names", !!on);
    }
    applyShowPerformerNamesClass(isShowPerformerNamesEnabled());

    /* Custom CSS Source (Stash interface config) — lets the theme load
       on login / pre-plugin screens. We expose an "Apply / Remove"
       button in the plugin settings panel that writes the plugin's
       CSS endpoint URL into Stash's `cSSURL` (a.k.a. Custom CSS Source
       field) via the configureUI mutation. */
    function getPluginCssUrl() {
        return window.location.origin + "/plugin/refract/css";
    }
    function getUiConfig() {
        return gql("query { configuration { ui } }").then(function (res) {
            return (res && res.data && res.data.configuration && res.data.configuration.ui) || {};
        });
    }
    function findCssUrlKey(ui) {
        /* Stash has used different keys across versions; check the most
           common ones, fall back to cSSURL (current canonical). */
        var candidates = ["cSSURL", "cssURL", "cSSSource", "cssSource"];
        for (var i = 0; i < candidates.length; i++) {
            if (ui && Object.prototype.hasOwnProperty.call(ui, candidates[i])) {
                return candidates[i];
            }
        }
        return "cSSURL";
    }
    function setCustomCssUrl(url) {
        return getUiConfig().then(function (ui) {
            var key = findCssUrlKey(ui);
            var patch = {};
            patch[key] = url;
            return gqlWithVars(
                "mutation ConfigureUI($input: Map!) { configureUI(input: $input) }",
                { input: patch }
            );
        });
    }

    /* Lite mode — strips backdrop-blur, multi-layer glow shadows,
       animations / transitions / hover effects, and the performer
       carousel infinite-loop clones. CSS rules in css/14_lite.css are
       gated on `body.refract-lite`. JS gates (card tilt, carousel
       clone setup) read this class at runtime. */
    function isLiteModeEnabled() {
        try {
            return localStorage.getItem(LITE_MODE_STORAGE_KEY) === "1";
        } catch (e) { return false; }
    }
    function applyLiteModeClass(on) {
        if (!document.body) { return; }
        document.body.classList.toggle("refract-lite", !!on);
    }
    applyLiteModeClass(isLiteModeEnabled());

    /* Light mode — orthogonal to accents. Toggles a white/paper base
       via the `refract-light` body class; CSS rules in css/14_light.css
       override tokens + hardcoded shadows. Pairs with any accent.
       Loads BEFORE 15_lite.css so lite's !important shadow-strip wins
       when both modes are enabled together. */
    function isLightModeEnabled() {
        try {
            return localStorage.getItem(LIGHT_MODE_STORAGE_KEY) === "1";
        } catch (e) { return false; }
    }
    function applyLightModeClass(on) {
        if (!document.body) { return; }
        document.body.classList.toggle("refract-light", !!on);
    }
    applyLightModeClass(isLightModeEnabled());

    /* Card rating style. "intensity" (default, Minimal) = accent glow
       scales with score — uniform-coloured but progressively brighter
       for higher ratings. "tiers" (Extravagant) = collectible-card tier
       system (Bronze → Perfect) with per-tier frame, halo, and escalating
       animations. */
    function getStoredRatingStyle() {
        try {
            var v = localStorage.getItem(RATING_STYLE_STORAGE_KEY);
            if (v && RATING_STYLES.indexOf(v) !== -1) { return v; }
        } catch (e) { /* ignore */ }
        return "intensity";
    }
    function applyRatingStyleClass(style) {
        if (!document.body) { return; }
        RATING_STYLES.forEach(function (s) {
            document.body.classList.toggle("refract-rating-style-" + s, s === style);
        });
    }
    applyRatingStyleClass(getStoredRatingStyle());

    /* View-mode minimiser feature toggle. Default enabled — Refract
       collapses Stash's row of view-mode buttons into a single icon +
       expand chevron to reduce toolbar clutter. Users who prefer the
       original Stash btn-group can disable this in plugin settings. */
    function isViewMinimiserEnabled() {
        try {
            var v = localStorage.getItem(VIEW_MINIMISER_STORAGE_KEY);
            if (v === "0") { return false; }
        } catch (e) { /* ignore */ }
        return true;
    }

    /* Custom navbar home-orb logo. Empty/null = default Refract orb;
       any URL (including data:image/...) renders as an <img> inside the
       brand button. */
    function getStoredLogoUrl() {
        try {
            var v = localStorage.getItem(LOGO_URL_STORAGE_KEY);
            return (typeof v === "string" && v.trim()) ? v.trim() : "";
        } catch (e) { /* ignore */ }
        return "";
    }

    var QUERY_ROOT_TAGS =
        'query StashThemeRootTags { findTags(' +
        '  filter: { per_page: -1, sort: "name", direction: ASC },' +
        '  tag_filter: { parents: { modifier: IS_NULL } }' +
        ') { count tags { id name sort_name scene_count children { id name sort_name scene_count } } } }';

    var PLUS_SVG =
        '<svg class="stash-injected-icon svg-inline--fa fa-icon" viewBox="0 0 448 512" aria-hidden="true">' +
        '<path fill="currentColor" d="M256 80c0-17.7-14.3-32-32-32s-32 14.3-32 32V224H48c-17.7 0-32 14.3-32 32s14.3 32 32 32H192V432c0 17.7 14.3 32 32 32s32-14.3 32-32V288H400c17.7 0 32-14.3 32-32s-14.3-32-32-32H256V80z"/>' +
        '</svg>';

    /* ── helpers ─────────────────────────────────────────────────── */

    function gqlHeaders() {
        var h = { "Content-Type": "application/json" };
        try {
            var key = localStorage.getItem(STORAGE_KEY_API);
            if (key) { h.ApiKey = key; }
        } catch (e) { /* ignore */ }
        return h;
    }

    function gql(query) {
        return fetch(GRAPHQL_URL, {
            method: "POST",
            headers: gqlHeaders(),
            credentials: "include",
            body: JSON.stringify({ query: query }),
        }).then(function (r) { return r.json(); });
    }

    function gqlWithVars(query, variables) {
        return fetch(GRAPHQL_URL, {
            method: "POST",
            headers: gqlHeaders(),
            credentials: "include",
            body: JSON.stringify({ query: query, variables: variables }),
        }).then(function (r) { return r.json(); });
    }

    /* Detect Stash's rating-system type (STARS vs DECIMAL). We can't read
       this from the rating-banner alone because Stash only writes the
       legacy `rating-N` class in star FULL precision; star HALF / QUARTER /
       TENTH precisions all use the same `rating-100-N` class that decimal
       mode does, so the banner is ambiguous. We cache the last-known
       value in localStorage so the body class is set synchronously on
       reload (no flash), then refresh via GraphQL in the background. */
    var RATING_SYSTEM_STORAGE_KEY = "refract.ratingSystemType";
    function applyRatingSystemClass(type) {
        if (!document.body) { return; }
        document.body.classList.toggle("refract-rating-system-stars",
            typeof type === "string" && type.toLowerCase() === "stars");
    }
    function refractFetchRatingSystem() {
        try {
            var cached = localStorage.getItem(RATING_SYSTEM_STORAGE_KEY);
            if (cached) { applyRatingSystemClass(cached); }
        } catch (e) { /* ignore */ }
        /* `configuration.ui` is a Map! scalar in Stash's GraphQL schema —
           you can't subselect fields on it. Query the whole blob and
           read ratingSystemOptions.type from the deserialised object.

           If `ratingSystemOptions.type` is missing (Stash's default,
           decimal mode, doesn't always serialise the field), treat as
           non-stars and clear the cached value — otherwise a previous
           "stars" cache would stick across a switch to decimal. */
        gql("query { configuration { ui } }")
            .then(function (res) {
                var ui = res && res.data && res.data.configuration
                    && res.data.configuration.ui;
                var t = (ui && ui.ratingSystemOptions && ui.ratingSystemOptions.type) || "";
                try { localStorage.setItem(RATING_SYSTEM_STORAGE_KEY, t); } catch (e) { /* ignore */ }
                applyRatingSystemClass(t);
            }).catch(function () { /* ignore — keep cached value */ });
    }

    function escapeHtml(s) {
        return String(s == null ? "" : s)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function tagImageUrl(id) {
        return window.location.origin + "/tag/" + encodeURIComponent(id) + "/image?default=true";
    }

    function isCategoriesPath() {
        var p = (window.location.pathname || "/").replace(/\/$/, "") || "/";
        if (p === CATEGORIES_PATH) { return true; }
        var h = window.location.hash || "";
        return h === "#/categories" || h.indexOf("#/categories/") === 0;
    }

    /* Insert newNode into parent before referenceNode. Falls back to
       appendChild if referenceNode isn't actually a child of parent —
       React re-renders can detach references between query and call,
       causing "Child to insert before is not a child of this node"
       errors that break unrelated DOM work in the same cycle. */
    function safeInsertBefore(parent, newNode, referenceNode) {
        if (!parent || !newNode) { return null; }
        try {
            if (referenceNode && parent.contains(referenceNode)) {
                return parent.insertBefore(newNode, referenceNode);
            }
            return parent.appendChild(newNode);
        } catch (e) {
            try { return parent.appendChild(newNode); } catch (e2) { return null; }
        }
    }

    function nextTick(fn) {
        if (typeof queueMicrotask === "function") { queueMicrotask(fn); } else { setTimeout(fn, 0); }
    }

    function stripRatingBannerToNumber() {
        /* When the user has the stars rating system, Stash sometimes
           still renders the banner text in the 0–10 decimal scale.
           Convert to the user-expected 0–5 scale (so "8" for 4 stars
           becomes "4"). Detection via the body class set by
           refractFetchRatingSystem(). */
        var starsMode = document.body.classList.contains("refract-rating-system-stars");
        document.querySelectorAll(".rating-banner").forEach(function (el) {
            var raw = (el.textContent || "").replace(/\s+/g, " ").trim();
            if (!raw) { return; }
            var m = raw.match(/(\d+(?:\.\d+)?)/);
            if (!m) { return; }
            var num = m[1];
            if (starsMode) {
                var parsed = parseFloat(num);
                /* Only divide if the value is in the 0–10 range — if
                   Stash is already showing a 0–5 number we leave it. */
                if (isFinite(parsed) && parsed > 5) {
                    num = String(Math.round((parsed / 2) * 100) / 100);
                }
            }
            if (raw === num) { return; }
            el.setAttribute("data-stash-rating", num);
            el.setAttribute("aria-label", "Rating " + num);
            el.textContent = num;
        });
    }

    function setRouteClass() {
        var body = document.body;
        if (!body) { return; }
        var path = (window.location.pathname || "/").split("?")[0].split("#")[0];
        var clean = path.replace(/^\/+|\/+$/g, "") || "home";
        var cls = "stash-route-" + clean.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
        var routeClasses = [];
        body.classList.forEach(function (c) {
            if (c.indexOf("stash-route-") === 0) { routeClasses.push(c); }
        });
        routeClasses.forEach(function (c) { body.classList.remove(c); });
        body.classList.add(cls);
    }

    /* ── DOM cleanup of v1 leftovers ─────────────────────────────── */

    function cleanupLegacyArtifacts() {
        document.querySelectorAll(".stash-nav-label, .stash-nav-fallback-icon").forEach(function (n) {
            n.parentNode && n.parentNode.removeChild(n);
        });
        document.querySelectorAll("#stash-theme-categories-nav").forEach(function (n) {
            var wrap = n.closest(".nav-link") || n.parentNode;
            if (wrap && wrap.parentNode) { wrap.parentNode.removeChild(wrap); }
        });
    }

    /* ── Navbar brand: textless home orb ─────────────────────────── */

    function refineBrandHomeOrb() {
        var brand =
            document.querySelector("nav.navbar.navbar-dark .navbar-brand") ||
            document.querySelector("nav.navbar.fixed-top .navbar-brand") ||
            document.querySelector("nav.top-nav .navbar-brand") ||
            document.querySelector(".navbar .navbar-brand");
        if (!brand) {
            return false;
        }
        var btn =
            brand.querySelector("button.brand-link") ||
            brand.querySelector("button.minimal.brand-link") ||
            brand.querySelector("a.brand-link") ||
            brand.querySelector("a button") ||
            brand.querySelector("button.minimal") ||
            brand.querySelector("button");
        if (!btn) {
            return false;
        }
        var logoUrl = getStoredLogoUrl();
        var existingLogo = btn.querySelector(".refract-custom-logo");
        if (logoUrl) {
            /* Custom logo set — render a masked <span> tinted to the same
               --text white as the rest of the navbar icons. The image is
               used as a CSS mask, not a foreground bitmap, so any
               opaque pixel paints in the accent-aware text colour. Skip
               rebuild if URL unchanged. */
            if (!existingLogo || existingLogo.dataset.src !== logoUrl) {
                if (btn.tagName === "A") {
                    while (btn.firstChild) { btn.removeChild(btn.firstChild); }
                } else {
                    btn.innerHTML = "";
                }
                var logo = document.createElement("span");
                logo.className = "refract-custom-logo";
                logo.dataset.src = logoUrl;
                var maskUrl = 'url("' + logoUrl.replace(/"/g, '\\"') + '")';
                logo.style.maskImage = maskUrl;
                logo.style.webkitMaskImage = maskUrl;
                btn.appendChild(logo);
            }
        } else {
            /* Default orb — strip any text/svg/img so Refract's CSS
               renders the empty styled circle. */
            if (btn.tagName === "A") {
                var aText = (btn.textContent || "").replace(/\s+/g, " ").trim();
                if (aText || btn.querySelector("svg, img")) {
                    while (btn.firstChild) { btn.removeChild(btn.firstChild); }
                }
            } else {
                var text = (btn.textContent || "").replace(/\s+/g, " ").trim();
                if (text || btn.querySelector("svg, img")) {
                    btn.innerHTML = "";
                }
            }
        }
        var aria = (btn.getAttribute("aria-label") || "").trim();
        var low = aria.toLowerCase();
        if (!aria || low === "stash") {
            btn.setAttribute("aria-label", "Home");
            aria = "Home";
        }
        btn.setAttribute("title", aria);
        return true;
    }

    /* ── Inject + icon into the New button ───────────────────────── */

    function injectNewButtonIcon() {
        var btn = null;

        /* Prefer explicit "new" route links in the top navbar. */
        var routeCandidates = document.querySelectorAll('nav.top-nav a[href$="/new"] button');
        for (var i = 0; i < routeCandidates.length && !btn; i++) {
            btn = routeCandidates[i];
        }

        /* Fallback: any top-nav button labelled/texted as New. */
        if (!btn) {
            var labelCandidates = document.querySelectorAll('nav.top-nav button[aria-label], nav.top-nav .navbar-buttons button');
            for (var j = 0; j < labelCandidates.length && !btn; j++) {
                var candidate = labelCandidates[j];
                var aria = (candidate.getAttribute("aria-label") || "").trim().toLowerCase();
                var text = (candidate.textContent || "").trim().toLowerCase();
                if (aria === "new" || text === "new") {
                    btn = candidate;
                }
            }
        }

        if (!btn) { return false; }
        if (btn.querySelector("svg.stash-injected-icon")) { return true; }
        // Replace whatever's inside (text node "New", or anything) with the + SVG.
        btn.innerHTML = PLUS_SVG;
        btn.setAttribute("aria-label", btn.getAttribute("aria-label") || "New");
        return true;
    }

    function normalizeLibraryAddButton() {
        if (!/^\/settings(\/|$)/.test(refractPathFromLocation())) return false;
        var table = document.getElementById("stash-table");
        if (!table) { return false; }
        var btn = table.querySelector("button.btn.mt-2");
        if (!btn || btn.type !== "button") { return false; }
        var svg = btn.querySelector("svg.stash-injected-icon");
        if (svg) {
            svg.parentNode.removeChild(svg);
        }
        var fromAria = (btn.getAttribute("aria-label") || "").trim();
        var fromText = (btn.textContent || "").replace(/\s+/g, " ").trim();
        var fullLabel = fromAria;
        if (!fullLabel || fullLabel === "Add") {
            fullLabel = fromText && fromText !== "Add" ? fromText : "Add directory";
        }
        if (!fullLabel) {
            fullLabel = "Add directory";
        }
        /* Avoid touching the DOM when already normalized — prevents MutationObserver feedback loops. */
        if (
            btn.classList.contains("btn-primary") &&
            !btn.querySelector("svg.stash-injected-icon") &&
            (btn.textContent || "").replace(/\s+/g, " ").trim() === "Add" &&
            (btn.getAttribute("aria-label") || "").trim() === fullLabel
        ) {
            return true;
        }
        btn.classList.remove("btn-secondary");
        btn.classList.add("btn-primary");
        btn.textContent = "Add";
        btn.setAttribute("aria-label", fullLabel);
        btn.setAttribute("title", fullLabel);
        return true;
    }

    /* Available Plugins page: Stash renders the "Add source" button at the
       bottom of the package-sources table, far from the disabled "Install"
       button at the top — move it next to Install so they form one cluster. */
    function relocateAddSourceButton() {
        if (!/^\/settings(\/|$)/.test(refractPathFromLocation())) return;
        var addBtn = null;
        var candidates = document.querySelectorAll("button.btn-success.btn-sm");
        for (var i = 0; i < candidates.length; i++) {
            if ((candidates[i].textContent || "").trim() === "Add source") {
                addBtn = candidates[i];
                break;
            }
        }
        if (!addBtn) { return false; }
        var installs = document.querySelectorAll("button.btn-primary:not(.btn-sm)");
        var installBtn = null;
        for (var j = 0; j < installs.length; j++) {
            if ((installs[j].textContent || "").trim() === "Install") {
                installBtn = installs[j];
                break;
            }
        }
        if (!installBtn) { return false; }
        addBtn.classList.remove("btn-sm");
        addBtn.classList.remove("btn-success");
        addBtn.classList.add("btn-primary");
        if (addBtn.previousElementSibling === installBtn) { return true; }
        safeInsertBefore(installBtn.parentNode, addBtn, installBtn.nextSibling);
        return true;
    }

    /* Custom mobile burger button — injected into the navbar via JS. CSS
       (12_mobile.css) gates visibility on (pointer: coarse) so it only
       shows on touch devices. Toggles `refract-burger-open` on <body>;
       CSS re-styles `.navbar-collapse` as a dropdown panel in that state. */
    function injectMobileBurger() {
        var nav = document.querySelector("nav.top-nav");
        if (!nav) { return false; }
        if (nav.querySelector(".refract-burger")) { return true; }

        var burger = document.createElement("button");
        burger.type = "button";
        burger.className = "refract-burger";
        burger.setAttribute("aria-label", "Toggle navigation menu");
        burger.setAttribute("aria-expanded", "false");
        burger.innerHTML =
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
            'stroke-width="2" stroke-linecap="round" aria-hidden="true">' +
            '<path d="M4 6h16M4 12h16M4 18h16"/></svg>';

        burger.addEventListener("click", function (e) {
            e.stopPropagation();
            var willOpen = !document.body.classList.contains("refract-burger-open");
            if (willOpen) {
                refractRelocateButtonsIntoDropdown();
            } else {
                refractRestoreButtonsFromDropdown();
            }
            document.body.classList.toggle("refract-burger-open", willOpen);
            burger.setAttribute("aria-expanded", willOpen ? "true" : "false");
        });

        // Insert at the end so it sits on the far right of the navbar.
        nav.appendChild(burger);
        return true;
    }

    /* On open: move .navbar-buttons (sibling of .navbar-collapse in
       Stash's mobile DOM) inside the collapse panel so the utility
       cluster renders as the bottom row of the dropdown grid. Restore
       on close so desktop layout is preserved. */
    function refractRelocateButtonsIntoDropdown() {
        var nav = document.querySelector("nav.top-nav");
        if (!nav) { return; }
        var collapse = nav.querySelector(".navbar-collapse");
        var buttons = nav.querySelector(".navbar-buttons");
        if (!collapse || !buttons) { return; }
        if (buttons.parentNode === collapse) { return; }
        buttons.setAttribute("data-refract-relocated", "1");
        collapse.appendChild(buttons);
    }
    function refractRestoreButtonsFromDropdown() {
        var nav = document.querySelector("nav.top-nav");
        if (!nav) { return; }
        var buttons = nav.querySelector('[data-refract-relocated="1"]');
        if (!buttons) { return; }
        buttons.removeAttribute("data-refract-relocated");
        if (buttons.parentNode !== nav) {
            nav.appendChild(buttons);
        }
    }

    function refractBindBurgerGlobalHandlers() {
        if (window.__refractBurgerHandlersBound) { return; }
        window.__refractBurgerHandlersBound = true;

        function closeBurger() {
            refractRestoreButtonsFromDropdown();
            document.body.classList.remove("refract-burger-open");
            var b = document.querySelector(".refract-burger");
            if (b) { b.setAttribute("aria-expanded", "false"); }
        }

        document.addEventListener("click", function (e) {
            if (!document.body.classList.contains("refract-burger-open")) { return; }
            var t = e.target;
            if (!t || !t.closest) { return; }
            if (t.closest(".refract-burger")) { return; }
            if (t.closest("nav.top-nav .navbar-collapse")) {
                if (t.closest("a, button")) { closeBurger(); }
                return;
            }
            closeBurger();
        });

        if (typeof PluginApi !== "undefined" && PluginApi && PluginApi.Event && PluginApi.Event.addEventListener) {
            PluginApi.Event.addEventListener("stash:location", closeBurger);
        }
        window.addEventListener("popstate", closeBurger);
    }

    /* Inject a "Support Stash" link at the bottom of the settings sidebar
       so users can still find the donate page (we hide the navbar donate
       button because it's off-theme). External link → opens in new tab. */
    var DONATE_HREF = "https://opencollective.com/stashapp";
    var HEART_SVG =
        '<svg viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">' +
        '<path d="M225.8 468.2l-2.5-2.3L48.1 303.2C17.4 274.7 0 234.7 0 192.8l0-3.3c0-70.4 50-130.8 119.2-144 39.1-7.4 79.4 .9 109.4 22.8c12.2 8.9 19.4 18.2 27.4 28.5 8-10.3 15.3-19.6 27.4-28.5 30-21.9 70.3-30.2 109.4-22.8C462 53.5 512 113.9 512 184.3l0 3.5c0 41.9-17.4 81.9-48.1 110.4L289.6 466c-.8 .8-1.7 1.5-2.5 2.3-9.5 8.8-22 13.7-35 13.7s-25.5-4.9-35-13.7z"/>' +
        '</svg>';

    function injectSupportStashLink() {
        if (!/^\/settings(\/|$)/.test(refractPathFromLocation())) return false;
        var navs = document.querySelectorAll(".nav.nav-pills.flex-column");
        if (!navs.length) { return false; }
        var did = false;
        navs.forEach(function (nav) {
            if (nav.querySelector(".refract-support-stash")) { return; }
            // Only inject in the settings sidebar, not in the help-modal sidebar.
            if (!nav.closest("[class*='settings'], #settings-menu-container, .settings-section, .col-md-3, .col-lg-3")) { return; }

            var item = document.createElement("div");
            item.className = "nav-item refract-support-stash-item";
            item.innerHTML =
                '<a href="' + DONATE_HREF + '" target="_blank" rel="noopener noreferrer" ' +
                'class="nav-link refract-support-stash">' +
                HEART_SVG + '<span>Support Stash</span></a>';
            nav.appendChild(item);
            did = true;
        });
        return did;
    }

    /* Stash renders <div class="troubleshooting-mode-button"> as a direct child of .nav, not inside
       <div class="nav-item"> like tab links — wrap it so layout matches Tools / About, etc. */
    function normalizeSettingsSidebarNavItems() {
        if (!/^\/settings(\/|$)/.test(refractPathFromLocation())) return false;
        var allTb = document.querySelectorAll(".troubleshooting-mode-button");
        if (!allTb.length) { return false; }
        var did = false;
        allTb.forEach(function (tb) {
            var par = tb.parentElement;
            if (!par) { return; }
            if (par.classList.contains("nav-item")) { return; }
            if (!par.classList.contains("nav")) { return; }

            /* Inject a separator <hr> before advanced-mode if not already there. */
            var advancedItem = par.querySelector(":scope > .nav-item:has(.advanced-switch)");
            var prevSib = advancedItem && advancedItem.previousElementSibling;
            if (advancedItem && !(prevSib && prevSib.classList.contains("stash-theme-settings-divider"))) {
                var hr = document.createElement("li");
                hr.className = "nav-item stash-theme-settings-divider";
                safeInsertBefore(par, hr, advancedItem);
                did = true;
            }

            /* Wrap troubleshooting in a .nav-item. */
            var wrap = document.createElement("div");
            wrap.className = "nav-item stash-theme-settings-troubleshooting-item";
            safeInsertBefore(par, wrap, tb);
            wrap.appendChild(tb);
            did = true;
        });
        return did;
    }

    function refractPathFromLocation() {
        var h = window.location.hash || "";
        if (h.indexOf("#/") === 0) {
            return (h.slice(1).split("?")[0] || "/").replace(/\/+$/, "") || "/";
        }
        return (window.location.pathname || "/").replace(/\/+$/, "") || "/";
    }

    function refractPathFromHref(raw) {
        if (!raw) { return ""; }
        var s = raw.split("?")[0];
        if (s.indexOf("http://") === 0 || s.indexOf("https://") === 0) {
            try {
                return (new URL(s).pathname || "/").replace(/\/+$/, "") || "/";
            } catch (e) {
                return "";
            }
        }
        var hashIdx = s.indexOf("#/");
        if (hashIdx >= 0) {
            return (s.slice(hashIdx + 1).split("?")[0] || "/").replace(/\/+$/, "") || "/";
        }
        return (s || "/").replace(/\/+$/, "") || "/";
    }

    function markActiveUtilityButtons() {
        var currentPath = refractPathFromLocation();
        /* Right-side utility links (exact match) + left-side route links (prefix match).
           Left nav items have no .nav-link class — select all <a href> inside .navbar-nav,
           excluding javascript: pseudo-links. */
        var links = document.querySelectorAll(
            "nav.top-nav .navbar-buttons a.nav-utility[href], nav.top-nav .navbar-nav a[href]:not([href^='javascript'])"
        );
        links.forEach(function (link) {
            var rawHref = link.getAttribute("href") || "";
            if (!rawHref) { link.classList.remove("stash-nav-active"); return; }
            if (rawHref.indexOf("http://") === 0 || rawHref.indexOf("https://") === 0 || rawHref.indexOf("//") === 0) {
                try {
                    var abs = rawHref.indexOf("//") === 0 ? "https:" + rawHref : rawHref;
                    var u = new URL(abs, window.location.href);
                    if (u.origin !== window.location.origin) { link.classList.remove("stash-nav-active"); return; }
                } catch (e) { link.classList.remove("stash-nav-active"); return; }
            }
            var hrefPath = refractPathFromHref(rawHref);
            if (!hrefPath || hrefPath === "/") { link.classList.remove("stash-nav-active"); return; }
            /* Left-side route links use prefix match (e.g. /scenes active on /scenes/123).
               Utility links (.nav-utility) use exact match. */
            var isLeftNav = !link.classList.contains("nav-utility");
            var isActive = isLeftNav
                ? (currentPath === hrefPath || currentPath.indexOf(hrefPath + "/") === 0)
                : (currentPath === hrefPath);
            if (isActive) { link.classList.add("stash-nav-active"); }
            else { link.classList.remove("stash-nav-active"); }
        });
    }

    /* ── Categories overlay (used when /categories URL is hit) ───── */

    var overlayEl = null;
    var state = { root: null, view: "root", parent: null };

    function ensureOverlay() {
        if (overlayEl && document.body.contains(overlayEl)) { return overlayEl; }
        overlayEl = document.getElementById("stash-category-browser");
        if (!overlayEl) {
            overlayEl = document.createElement("div");
            overlayEl.id = "stash-category-browser";
            overlayEl.setAttribute("hidden", "");
            document.body.appendChild(overlayEl);
        }
        return overlayEl;
    }

    function setOverlayVisible(v) {
        var el = ensureOverlay();
        if (v) { el.removeAttribute("hidden"); } else { el.setAttribute("hidden", ""); }
    }

    function topBar(title, opts) {
        opts = opts || {};
        var back = opts.showBack
            ? '<button type="button" class="stash-cat-back" data-action="back">‹ Back</button>'
            : "";
        return '<div class="stash-cat-top">' +
            back +
            '<h1>' + escapeHtml(title) + '</h1>' +
            '<button type="button" class="stash-cat-close" data-action="close" aria-label="Close">×</button>' +
            '</div>';
    }

    function bindOverlayUi() {
        var el = ensureOverlay();
        el.querySelectorAll('[data-action="close"]').forEach(function (b) {
            b.onclick = function () { window.history.back(); };
        });
        el.querySelectorAll('[data-action="back"]').forEach(function (b) {
            b.onclick = function () {
                if (state.view === "child") {
                    state.view = "root";
                    state.parent = null;
                    renderGrid(state.root, false);
                }
            };
        });
    }

    function renderLoading() {
        var el = ensureOverlay();
        el.className = "";
        el.removeAttribute("hidden");
        el.innerHTML = topBar("Categories") +
            '<p class="stash-cat-sub">Loading tag hierarchy…</p>' +
            '<div class="stash-cat-skel"></div>';
        bindOverlayUi();
    }

    function renderError(msg) {
        var el = ensureOverlay();
        el.className = "";
        el.removeAttribute("hidden");
        el.innerHTML = topBar("Categories") +
            '<p class="stash-cat-error">' + escapeHtml(msg) + '</p>' +
            '<p class="stash-cat-sub">If unauthenticated, set an API key: ' +
            '<code>localStorage.setItem("' + STORAGE_KEY_API + '", "YOUR_KEY")</code> then reload.</p>';
        bindOverlayUi();
    }

    function renderGrid(tags, isChild) {
        var el = ensureOverlay();
        el.className = isChild ? "is-child" : "";
        el.removeAttribute("hidden");

        var title = isChild && state.parent ? state.parent.name : "Categories";
        var sub = isChild
            ? "Subtags. Click a tile to open the tag in Stash."
            : "Top-level tag groups. Click a tile to drill in.";

        var parts = [topBar(title, { showBack: isChild }), '<p class="stash-cat-sub">' + escapeHtml(sub) + "</p>"];

        if (!tags || !tags.length) {
            parts.push('<p class="stash-cat-sub">No tags here.</p>');
            el.innerHTML = parts.join("");
            bindOverlayUi();
            return;
        }

        parts.push('<div class="stash-cat-grid">');
        tags.forEach(function (t) {
            var name = t.sort_name || t.name || "";
            var count = t.scene_count != null ? t.scene_count : 0;
            var initials = (name.slice(0, 2) || "??").toUpperCase();
            parts.push(
                '<button type="button" class="stash-cat-tile" data-tid="' + escapeHtml(t.id) + '">' +
                    '<div class="stash-cat-hero">' +
                        '<img class="stash-cat-img" src="' + escapeHtml(tagImageUrl(t.id)) + '" alt="" loading="lazy">' +
                        '<div class="stash-cat-initials" aria-hidden="true">' + escapeHtml(initials) + '</div>' +
                    '</div>' +
                    '<span class="stash-cat-tile-text">' +
                        '<strong>' + escapeHtml(name) + '</strong>' +
                        '<small>' + count + ' scenes</small>' +
                    '</span>' +
                '</button>'
            );
        });
        parts.push("</div>");
        el.innerHTML = parts.join("");

        el.querySelectorAll(".stash-cat-img").forEach(function (img) {
            img.addEventListener("error", function () {
                img.style.display = "none";
                var n = img.nextElementSibling;
                if (n && n.classList.contains("stash-cat-initials")) { n.style.display = "flex"; }
            });
        });

        el.querySelectorAll(".stash-cat-tile").forEach(function (btn) {
            btn.addEventListener("click", function () {
                var id = btn.getAttribute("data-tid");
                var pool = state.view === "root" ? state.root : ((state.parent && state.parent._children) || []);
                var tag = null;
                for (var i = 0; i < pool.length; i++) {
                    if (pool[i].id === id) { tag = pool[i]; break; }
                }
                if (!tag) { return; }
                var hasKids = tag.children && tag.children.length;
                if (state.view === "root" && hasKids) {
                    var kids = tag.children.slice().sort(function (a, b) {
                        return (a.sort_name || a.name).localeCompare(b.sort_name || b.name);
                    });
                    state.view = "child";
                    state.parent = { name: tag.sort_name || tag.name, id: tag.id, _children: kids };
                    renderGrid(kids, true);
                } else {
                    window.location.assign("/tags/" + encodeURIComponent(tag.id));
                }
            });
        });

        bindOverlayUi();
    }

    function loadAndShow() {
        renderLoading();
        gql(QUERY_ROOT_TAGS)
            .then(function (data) {
                if (data.errors && data.errors.length) {
                    renderError(data.errors[0].message || "GraphQL error");
                    return;
                }
                var tags = (data.data && data.data.findTags && data.data.findTags.tags) || [];
                state.root = tags;
                state.view = "root";
                state.parent = null;
                if (!isCategoriesPath()) { return; }
                renderGrid(tags, false);
            })
            .catch(function (e) { renderError((e && e.message) || String(e)); });
    }

    function syncRoute() {
        setRouteClass();
        if (isCategoriesPath()) {
            if (!state.root) {
                loadAndShow();
            } else {
                setOverlayVisible(true);
                if (state.view === "root") { renderGrid(state.root, false); }
                else if (state.parent) { renderGrid(state.parent._children, true); }
            }
        } else {
            setOverlayVisible(false);
        }
    }

    /* ── SPA route detection ─────────────────────────────────────── */

    function initHistory() {
        var p = history.pushState, r = history.replaceState;
        function fire() { nextTick(syncRoute); }
        history.pushState = function () { var x = p.apply(history, arguments); fire(); return x; };
        history.replaceState = function () { var x = r.apply(history, arguments); fire(); return x; };
        window.addEventListener("popstate", fire);
        window.addEventListener("hashchange", fire);
    }

    /* ── Watch for nav re-renders so the + icon survives ─────────── */

    /* Run an init in isolation so one throw doesn't skip the rest of the
       cycle (e.g. a stale-reference NotFoundError from one init breaking
       sibling initializers running in the same MutationObserver callback). */
    function safeRun(fn) {
        try { fn(); } catch (e) { /* swallow — Stash re-renders will trigger another cycle */ }
    }

    function watchForReinjection() {
        var observer = new MutationObserver(function () {
            /* Disconnect while mutating so our DOM updates do not synchronously re-trigger this observer
               (can freeze the tab / block Stash from finishing load). */
            observer.disconnect();
            try {
                safeRun(refineBrandHomeOrb);
                safeRun(injectNewButtonIcon);
                safeRun(normalizeLibraryAddButton);
                safeRun(relocateAddSourceButton);
                safeRun(injectMobileBurger);
                safeRun(normalizeSettingsSidebarNavItems);
                safeRun(injectSupportStashLink);
                safeRun(markActiveUtilityButtons);
                safeRun(stripRatingBannerToNumber);
                safeRun(initCardTilts);
                safeRun(initSceneCards);
                safeRun(initPerformerCards);
                safeRun(syncPerformerCardHearts);
                safeRun(initSlickCarousels);
                safeRun(initFilterBar);
                safeRun(initFilterButtonBadge);
                safeRun(initViewModeDropdown);
                safeRun(initTabScrollChevrons);
                safeRun(initFloatingPager);
                safeRun(disableTableOverflowable);
                safeRun(markFilledStars);
                safeRun(initRefractTagEditor);
                safeRun(enhanceDuplicateChecker);
                safeRun(initPerformerNameTooltip);
            } finally {
                observer.observe(document.body, { childList: true, subtree: true });
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    /* ── Card tilt (VanillaTilt-style) ──────────────────────────────── */

    var TILT_MAX = 12;
    var TILT_SCALE = 1.04;
    var TILT_PERSPECTIVE = 800;
    var TILT_RESET_MS = 400;
    var TILT_MAX_GLARE = 0.18;
    var TILT_EASING = "cubic-bezier(.03,.98,.52,.99)";

    function cardTiltBind(card) {
        if (card._stashTilt) { return; }
        /* Lite mode: skip the 3D-tilt + glare entirely. */
        if (document.body.classList.contains("refract-lite")) { return; }
        card._stashTilt = true;

        /* Skip the glare overlay on image-cards — it paints above Stash's
           native hover lightbox-trigger icon and hides it from view. */
        var withGlare = !card.classList.contains("image-card");
        var glareInner = null;
        if (withGlare) {
            var glareWrap = document.createElement("div");
            glareWrap.className = "stash-tilt-glare";
            glareInner = document.createElement("div");
            glareInner.className = "stash-tilt-glare-inner";
            glareWrap.appendChild(glareInner);
            card.appendChild(glareWrap);
        }

        var raf = null;

        function applyTilt(e) {
            var rect = card.getBoundingClientRect();
            var x = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
            var y = Math.min(Math.max((e.clientY - rect.top) / rect.height, 0), 1);
            var tiltX = ((0.5 - x) * TILT_MAX).toFixed(2);
            var tiltY = ((y - 0.5) * TILT_MAX).toFixed(2);
            var angle = Math.atan2(x - 0.5, y - 0.5) * (180 / Math.PI);
            card.style.transform =
                "perspective(" + TILT_PERSPECTIVE + "px) " +
                "rotateX(" + tiltY + "deg) rotateY(" + tiltX + "deg) " +
                "scale3d(" + TILT_SCALE + "," + TILT_SCALE + "," + TILT_SCALE + ")";
            if (glareInner) {
                glareInner.style.transform = "rotate(" + angle + "deg) translate(-50%, -50%)";
                glareInner.style.opacity = String(((x + y) / 2) * TILT_MAX_GLARE);
            }
        }

        var enterTimer = null;
        function onEnter() {
            /* Cancel any pending leave-cleanup so the timer doesn't strip
               the transform we're about to set. */
            if (leaveTimer) { clearTimeout(leaveTimer); leaveTimer = null; }
            card.style.willChange = "transform";
            card.style.transition = "transform 0.22s " + TILT_EASING;
            card.style.zIndex = "1000";
            card.style.transform =
                "perspective(" + TILT_PERSPECTIVE + "px) rotateX(0deg) rotateY(0deg) " +
                "scale3d(" + TILT_SCALE + "," + TILT_SCALE + "," + TILT_SCALE + ")";
            if (enterTimer) { clearTimeout(enterTimer); }
            enterTimer = setTimeout(function () {
                if (card.style.zIndex === "1000") {
                    card.style.transition = "none";
                }
                enterTimer = null;
            }, 220);
        }

        function onMove(e) {
            if (raf) { cancelAnimationFrame(raf); }
            raf = requestAnimationFrame(function () { applyTilt(e); });
        }

        var leaveTimer = null;
        function onLeave() {
            if (raf) { cancelAnimationFrame(raf); raf = null; }
            if (enterTimer) { clearTimeout(enterTimer); enterTimer = null; }
            card.style.willChange = "auto";
            card.style.zIndex = "";
            card.style.transition = "transform " + TILT_RESET_MS + "ms " + TILT_EASING + ", box-shadow 0.22s ease";
            card.style.transform =
                "perspective(" + TILT_PERSPECTIVE + "px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)";
            /* After the reset transition finishes, drop the inline
               transform entirely so the card stops holding a permanent
               GPU compositor layer. The string check guards against
               clobbering a fresh hover that started within the reset
               window (onEnter cancels this timer in that case anyway). */
            if (leaveTimer) { clearTimeout(leaveTimer); }
            leaveTimer = setTimeout(function () {
                if (card.style.transform.indexOf("scale3d(1, 1, 1)") !== -1
                    || card.style.transform.indexOf("scale3d(1,1,1)") !== -1) {
                    card.style.removeProperty("transform");
                    card.style.removeProperty("transition");
                }
                leaveTimer = null;
            }, TILT_RESET_MS + 50);
            card.style.removeProperty("animation");
            if (glareInner) { glareInner.style.opacity = "0"; }
        }

        card.addEventListener("mouseenter", onEnter);
        card.addEventListener("mousemove", onMove);
        card.addEventListener("mouseleave", onLeave);
    }

    function initCardTilts() {
        if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) { return; }
        document.querySelectorAll(".grid-card, .scene-card, .performer-card, .wall-item").forEach(function (card) {
            cardTiltBind(card);
        });
    }

    /* ── Scene card performer circles ───────────────────────────────── */

    var QUERY_SCENE_CARDS =
        'query SceneCards($ids: [Int]) { findScenes(scene_ids: $ids) {' +
        '  scenes { id o_counter rating100 performers { id name } tags { id name } }' +
        '} }';

    var MAX_PERFORMER_CIRCLES = 5;

    var TAG_ICON_SVG =
        '<svg class="stash-tag-icon" viewBox="0 0 512 512" aria-hidden="true">' +
        '<path fill="currentColor" d="M32.5 96l0 149.5c0 17 6.7 33.3 18.7 45.3l192 192c25 25 65.5 25 90.5 0L483.2 333.3c25-25 25-65.5 0-90.5l-192-192C279.2 38.7 263 32 246 32L96.5 32c-35.3 0-64 28.7-64 64zm112 16a32 32 0 1 1 0 64 32 32 0 1 1 0-64z"/>' +
        '</svg>';

    /* O count icon — stylized rotated O glyph matching Stash native. */
    var O_ICON_SVG =
        '<svg viewBox="0 0 36 36" aria-hidden="true">' +
        '<path fill="currentColor" d="M22.855.758L7.875 7.024l12.537 9.733c2.633 2.224 6.377 2.937 9.77 1.518c4.826-2.018 7.096-7.576 5.072-12.413C33.232 1.024 27.68-1.261 22.855.758zm-9.962 17.924L2.05 10.284L.137 23.529a7.993 7.993 0 0 0 2.958 7.803a8.001 8.001 0 0 0 9.798-12.65zm15.339 7.015l-8.156-4.69l-.033 9.223c-.088 2 .904 3.98 2.75 5.041a5.462 5.462 0 0 0 7.479-2.051c1.499-2.644.589-6.013-2.04-7.523z"/>' +
        '</svg>';

    /* People / group icon — used on the minimal-mode performer pill that
       replaces the avatar circle row. */
    var PEOPLE_ICON_SVG =
        '<svg class="stash-performer-icon" viewBox="0 0 640 512" aria-hidden="true">' +
        '<path fill="currentColor" d="M96 128a96 96 0 1 1 192 0 96 96 0 1 1 -192 0zm0 192l192 0c53 0 96 43 96 96l0 32-384 0 0-32c0-53 43-96 96-96zm288-96a80 80 0 1 1 0-160 80 80 0 1 1 0 160zM496 416l0-32c0-44.2-25-83.3-62.9-103.7C440.7 277.3 449 276 457.5 276l13 0c66.3 0 120 53.7 120 120l0 20c0 22.1-17.9 40-40 40l-94.5 0c6.4-7.5 10.3-17.1 10.3-27.7l0-12.3z"/>' +
        '</svg>';

    function extractSceneId(card) {
        var a = card.querySelector('a[href^="/scenes/"]');
        if (!a) { return null; }
        var m = (a.getAttribute("href") || "").match(/\/scenes\/(\d+)/);
        return m ? parseInt(m[1], 10) : null;
    }

    function stopProp(e) { e.stopPropagation(); }

    function injectPerformerCircles(card, performers, tagCount, sceneId, oCount, tagInfo) {
        if (card.querySelector(".stash-performer-circles")) { return; }
        var section = card.querySelector(".card-section");
        if (!section) { return; }

        /* Strip the file-extension from the title at the per-card stable
           point (after GQL data has hydrated). Faster + more reliable
           than waiting for the body mutation watcher to find it. */
        stripTitleExt(card.querySelector(".card-section-title"));

        var row = document.createElement("div");
        row.className = "stash-performer-circles";

        var avatarWrap = document.createElement("div");
        avatarWrap.className = "stash-performer-avatars";

        var shown = performers.slice(0, MAX_PERFORMER_CIRCLES);
        var extra = performers.length - shown.length;

        shown.forEach(function (p) {
            var link = document.createElement("a");
            link.className = "stash-performer-link";
            link.href = "/performers/" + p.id;
            link.addEventListener("click", stopProp);
            if (p.name) {
                link.setAttribute("aria-label", p.name);
                link.dataset.performerName = p.name;
            }

            var img = document.createElement("img");
            img.className = "stash-performer-avatar";
            img.src = "/performer/" + p.id + "/image";
            img.alt = p.name || "";
            img.loading = "lazy";
            link.appendChild(img);
            avatarWrap.appendChild(link);
        });

        if (extra > 0) {
            var more = document.createElement("span");
            more.className = "stash-performer-more";
            more.textContent = "+" + extra;
            avatarWrap.appendChild(more);
        }

        row.appendChild(avatarWrap);

        /* Right-side count cluster — holds duration / O count / tag count
           badges so they share consistent spacing when present. */
        var counts = document.createElement("div");
        counts.className = "stash-card-counts";

        /* Duration pill — mirrors Stash's native .overlay-duration text
           into the counts cluster. In minimal mode this is the leftmost
           pill in the right cluster (replacing the performer pill); the
           original .overlay-duration on the thumbnail is hidden via CSS.
           In other modes the pill is hidden via CSS and the native
           overlay-duration stays in its usual spot. */
        var durEl = card.querySelector(".overlay-duration");
        var durText = durEl ? (durEl.textContent || "").trim() : "";
        if (durText) {
            var dPill = document.createElement("span");
            dPill.className = "stash-duration-pill";
            dPill.textContent = durText;
            counts.appendChild(dPill);
        }

        /* Performer pill — alternative compact representation that lives
           ALONGSIDE the avatar circles. CSS gates which one is visible:
           default mode shows circles, minimal mode shows the pill.
           Pill markup mirrors .stash-tag-count: clickable anchor to the
           first performer + glass popup (.stash-performer-popup) with
           every performer's avatar + name. */
        if (performers && performers.length) {
            var pillHref = "/performers/" + performers[0].id;
            var pPill = document.createElement("a");
            pPill.className = "stash-performer-pill";
            pPill.href = pillHref;
            pPill.title = performers.length + " performer" + (performers.length === 1 ? "" : "s");
            pPill.addEventListener("click", stopProp);
            pPill.innerHTML = PEOPLE_ICON_SVG + "<span>" + performers.length + "</span>";

            var pPop = document.createElement("div");
            pPop.className = "stash-performer-popup";
            performers.forEach(function (p) {
                if (!p || !p.id) { return; }
                var chip = document.createElement("a");
                chip.className = "stash-performer-popup-chip";
                chip.href = "/performers/" + p.id;
                chip.addEventListener("click", stopProp);
                var ava = document.createElement("img");
                ava.className = "stash-performer-popup-avatar";
                ava.src = "/performer/" + p.id + "/image";
                ava.alt = p.name || "";
                ava.loading = "lazy";
                chip.appendChild(ava);
                var nameSpan = document.createElement("span");
                nameSpan.className = "stash-performer-popup-name";
                nameSpan.textContent = p.name || "(unknown)";
                chip.appendChild(nameSpan);
                pPop.appendChild(chip);
            });
            pPill.appendChild(pPop);
            counts.appendChild(pPill);
        }

        if (oCount && oCount > 0) {
            var oBadge = document.createElement("span");
            oBadge.className = "stash-o-count";
            oBadge.title = oCount + " O";
            oBadge.innerHTML = O_ICON_SVG + "<span>" + oCount + "</span>";
            counts.appendChild(oBadge);
        }

        if (tagCount > 0) {
            var badge = document.createElement("a");
            badge.className = "stash-tag-count";
            badge.href = sceneId ? "/scenes/" + sceneId : "/tags";
            badge.addEventListener("click", stopProp);
            badge.innerHTML = TAG_ICON_SVG + "<span>" + tagCount + "</span>";
            /* Hover popup — clickable tag chips, each linking to /tags/:id.
               Built as a sibling-anchored sibling node (not via attr()) so
               we can attach event handlers and per-chip hover states. */
            if (tagInfo && tagInfo.length) {
                var popup = document.createElement("div");
                popup.className = "stash-tag-popup";
                tagInfo.forEach(function (t) {
                    var chip = document.createElement("a");
                    chip.className = "stash-tag-popup-chip";
                    chip.href = "/tags/" + t.id;
                    chip.textContent = t.name;
                    chip.addEventListener("click", stopProp);
                    popup.appendChild(chip);
                });
                badge.appendChild(popup);
            }
            counts.appendChild(badge);
        }

        if (counts.firstChild) {
            row.appendChild(counts);
        }

        section.appendChild(row);

        /* Tag portrait thumbnails so the minimal-mode cover-fill CSS can
           opt them out — for vertical scenes the cover behaviour would
           crop heavily. The image often isn't loaded yet, so check
           complete + naturalWidth, else listen for load once. */
        tagOrientation(card);

        /* Performer name labels — comma-separated, with "+N" overflow.
           Always emitted; CSS gates visibility on body.refract-show-perf-names. */
        if (performers && performers.length) {
            var namesEl = document.createElement("div");
            namesEl.className = "stash-performer-names";
            var visibleNames = performers.slice(0, MAX_PERFORMER_CIRCLES)
                .map(function (p) { return p.name; })
                .filter(Boolean);
            var leftover = performers.length - visibleNames.length;
            namesEl.textContent = visibleNames.join(", ") + (leftover > 0 ? " +" + leftover : "");
            namesEl.title = performers.map(function (p) { return p.name; }).filter(Boolean).join(", ");
            section.appendChild(namesEl);
        }

        /* Floating-hearts effect for "Favourite" scenes — driven by the
           "Favourite ★" tag injected by stash-advanced-scene-rating. We
           detect via the tagInfo array (case-insensitive match on
           "favourite" / "favorite" so it works for either spelling and
           catches the ★-suffix). Class + 7-heart layer are toggled in
           sync; only tagged cards pay the animation cost. */
        var isFavourite = tagInfo && tagInfo.some(function (t) {
            return t && t.name && /^favou?rite/i.test(t.name);
        });
        var existingHearts = card.querySelector(":scope > .refract-heart-particles");
        if (isFavourite) {
            card.classList.add("refract-favourite");
            if (!existingHearts) {
                var particles = document.createElement("div");
                particles.className = "refract-heart-particles";
                particles.setAttribute("aria-hidden", "true");
                for (var hi = 1; hi <= 5; hi++) {
                    var heart = document.createElement("span");
                    heart.className = "refract-heart refract-heart-" + hi;
                    heart.textContent = "♥"; /* ♥ */
                    particles.appendChild(heart);
                }
                card.appendChild(particles);
            }
        } else {
            card.classList.remove("refract-favourite");
            if (existingHearts) { existingHearts.remove(); }
        }
    }

    /* Add .refract-portrait to a scene-card whose preview image is taller
       than wide. CSS uses this to swap object-fit: cover (landscape) for
       object-fit: contain (portrait) so vertical scenes letterbox instead
       of cropping. Idempotent — early-exits once tagged. */
    function tagOrientation(card) {
        if (card.classList.contains("refract-portrait") ||
            card.classList.contains("refract-landscape-checked")) { return; }
        var media = card.querySelector(".scene-card-preview img, .scene-card-preview video, .scene-card-preview .preview-image");
        if (!media) { return; }
        var check = function () {
            var w = media.naturalWidth || media.videoWidth || 0;
            var h = media.naturalHeight || media.videoHeight || 0;
            if (!w || !h) { return; }
            if (h > w) { card.classList.add("refract-portrait"); }
            else { card.classList.add("refract-landscape-checked"); }
        };
        if (media.complete && media.naturalWidth) { check(); }
        else { media.addEventListener("load", check, { once: true }); }
    }

    /* Strip trailing file extensions from scene-card titles for a tidier
       grid. NO dataset marker — that previously caused a stick where my
       "already stripped" flag survived a React re-render that restored
       the extension, so the strip never re-fired. The regex test is
       cheap and idempotent (already-clean text doesn't match), so
       running on every mutation tick is fine. */
    var FILE_EXT_RE = /\.(mp4|m4v|mkv|mov|avi|webm|wmv|flv|ts|m2ts|mpg|mpeg|3gp|f4v|ogv|asf)$/i;
    function stripTitleExt(el) {
        if (!el) { return; }
        var text = (el.textContent || "").trim();
        if (!FILE_EXT_RE.test(text)) { return; }
        el.textContent = text.replace(FILE_EXT_RE, "");
    }
    function stripSceneFileExtensions() {
        document.querySelectorAll(".scene-card .card-section-title").forEach(stripTitleExt);
    }

    function initSceneCards() {
        var cards = document.querySelectorAll(".scene-card:not([data-stash-sc])");
        if (!cards.length) { return; }

        var ids = [];
        var cardMap = {};
        cards.forEach(function (card) {
            var id = extractSceneId(card);
            if (id !== null) {
                card.setAttribute("data-stash-sc", "1");
                /* Tier label placeholder — empty <div> always present;
                   CSS reads the card's `refract-card-tier-*` class (set
                   by tagFilledRatings) and fills the visible text via
                   `::after { content: "BRONZE"/...PERFECT }`. Hidden in
                   non-playing-card modes via the default reset block in
                   16_playing_card.css. */
                if (!card.querySelector(":scope > .refract-pc-tier-label")) {
                    var tierLabel = document.createElement("div");
                    tierLabel.className = "refract-pc-tier-label";
                    card.appendChild(tierLabel);
                }
                ids.push(id);
                cardMap[id] = card;         /* int key */
                cardMap[String(id)] = card; /* string key — GQL returns id as string */
            }
        });

        if (!ids.length) { return; }

        var q = 'query { findScenes(scene_ids: [' + ids.join(',') + ']) {' +
                '  scenes { id o_counter rating100 performers { id name } tags { id name } }' +
                '} }';
        gql(q)
            .then(function (res) {
                var scenes = res.data && res.data.findScenes && res.data.findScenes.scenes || [];
                scenes.forEach(function (scene) {
                    var card = cardMap[String(scene.id)] || cardMap[parseInt(scene.id, 10)];
                    if (!card) { return; }
                    var tags = scene.tags || [];
                    var tagInfo = tags.map(function (t) { return { id: t.id, name: t.name }; })
                                      .filter(function (t) { return t.id && t.name; });
                    var oCount = parseInt(scene.o_counter, 10) || 0;
                    var rating = parseInt(scene.rating100, 10) || 0;
                    injectPerformerCircles(card, scene.performers || [], tags.length, scene.id, oCount, tagInfo);
                    injectSceneRating(card, rating);
                });
                /* Re-tag freshly-injected banners so tier classes + the
                   --refract-rating var land for intensity/tiers modes. */
                try { tagFilledRatings(); } catch (e) { /* ignore */ }
            })
            .catch(function () { /* ignore */ });
    }

    /* Inject a .rating-banner inside a scene card (mirrors the badge
       Stash renders on performer cards). Idempotent — if a banner is
       already there we just refresh its text (so a user switching
       between stars and decimal rating systems sees the new value on
       the next initSceneCards pass). Rating is 0-100 in Stash;
       displayed as 0.0-10.0 in decimal mode or 0-5 in stars mode. */
    function injectSceneRating(card, rating100) {
        if (!card || !rating100 || rating100 <= 0) { return; }
        var v10 = rating100 / 10;
        var starsMode = document.body.classList.contains("refract-rating-system-stars");
        var displayValue;
        if (starsMode) {
            /* 0-5 scale, trimmed to 2 decimals to dodge float artifacts
               like 3.7500000001; trailing zeros stripped via String. */
            displayValue = String(Math.round((v10 / 2) * 100) / 100);
        } else {
            displayValue = v10.toFixed(1);
        }
        var banner = card.querySelector(":scope > .rating-banner");
        if (!banner) {
            banner = document.createElement("div");
            banner.className = "rating-banner";
            card.appendChild(banner);
        }
        banner.textContent = displayValue;
    }

    /* ── Performer card redesign ─────────────────────────────────────── */

    var PLAY_SVG =
        '<svg viewBox="0 0 512 512" width="10" height="10" fill="currentColor" aria-hidden="true">' +
        '<path d="M188.3 147.1c-7.6 4.2-12.3 12.3-12.3 20.9l0 176c0 8.7 4.7 16.7 12.3 20.9' +
        's16.8 4.1 24.3-.5l144-88c7.1-4.4 11.5-12.1 11.5-20.5s-4.4-16.1-11.5-20.5l-144-88' +
        'c-7.4-4.5-16.7-4.7-24.3-.5z"/></svg>';

    /* Solid five-point star — used by the playing-card stats strip rating
       badge. Matches Stash's general star iconography. */
    var STAR_SVG =
        '<svg viewBox="0 0 576 512" width="10" height="10" fill="currentColor" aria-hidden="true">' +
        '<path d="M316.9 18C311.6 7 300.4 0 288.1 0s-23.4 7-28.8 18L195 150.3 51.4 171.5' +
        'c-12 1.8-22 10.2-25.7 21.7s-.7 24.2 7.9 32.7L137.8 329 113.2 474.7c-2 12 3 24.2' +
        ' 12.9 31.3s23 8 33.8 2.3l128.3-68.5 128.3 68.5c10.8 5.7 23.9 4.9 33.8-2.3' +
        's14.9-19.3 12.9-31.3L438.6 329 542.7 225.9c8.6-8.5 11.7-21.2 7.9-32.7' +
        's-13.7-19.9-25.7-21.7L381.2 150.3 316.9 18z"/></svg>';

    /* Cake-with-candles — used by the playing-card stats strip age
       badge. Disambiguates the age number (e.g. "27") from any other
       stat. Simplified FontAwesome cake-candles path. */
    var CAKE_SVG =
        '<svg viewBox="0 0 448 512" width="10" height="10" fill="currentColor" aria-hidden="true">' +
        '<path d="M86.4 5.5L61.8 47.6c-3.9 6.7-5.8 14.4-5.8 22.2C56 94.2 75.6 112 99.2 112' +
        ' s43.2-17.8 43.2-42.2c0-7.8-1.9-15.5-5.8-22.2L112 5.5C110.3 2 106.9 0 103.2 0H97.2' +
        ' c-3.7 0-7.1 2-8.8 5.5zm96 0L157.8 47.6c-3.9 6.7-5.8 14.4-5.8 22.2c0 24.4 19.6 42.2' +
        ' 43.2 42.2s43.2-17.8 43.2-42.2c0-7.8-1.9-15.5-5.8-22.2L208 5.5C206.3 2 202.9 0 199.2 0' +
        ' h-5.9c-3.7 0-7.1 2-8.8 5.5zm96 0L253.8 47.6c-3.9 6.7-5.8 14.4-5.8 22.2C248 94.2' +
        ' 267.6 112 291.2 112s43.2-17.8 43.2-42.2c0-7.8-1.9-15.5-5.8-22.2L304 5.5C302.3 2' +
        ' 298.9 0 295.2 0h-5.9c-3.7 0-7.1 2-8.8 5.5zM32 192c-17.7 0-32 14.3-32 32V416H384V224' +
        ' c0-17.7-14.3-32-32-32H32zm0 256c-17.7 0-32 14.3-32 32s14.3 32 32 32H352c17.7 0 32-14.3' +
        ' 32-32s-14.3-32-32-32H32z"/></svg>';

    function stripYearsOld() {
        document.querySelectorAll(".performer-card .performer-card__age").forEach(function (el) {
            el.textContent = el.textContent.replace(/\s*years?\s+old/gi, "").trim();
        });
    }

    function initPerformerCards() {
        document.querySelectorAll(".performer-card:not([data-stash-pc])").forEach(function (card) {
            card.setAttribute("data-stash-pc", "1");

            var section  = card.querySelector(".card-section");
            var ageEl    = card.querySelector(".performer-card__age");
            var sceneLink = card.querySelector(".card-popovers .scene-count");
            var hr       = card.querySelector("hr");
            var popovers = card.querySelector(".card-popovers");
            var titleEl = card.querySelector(".card-section-title");
            /* Stash renders the country flag with class
               `performer-card__country-flag fi fi-XX` (flag-icons CSS
               library: `fi` = base, `fi-XX` = country code). Older
               Stash builds used `.flag-icon`; keep that as a fallback
               so the plugin still surfaces a flag in either layout. */
            var flagEl   = card.querySelector(".performer-card__country-flag, .flag-icon");
            var ratingEl = card.querySelector(".rating-banner");
            if (!section) { return; }

            var row = document.createElement("div");
            row.className = "stash-perf-stats";

            /* Rating badge — gated to playing-card mode via CSS. We always
               inject the badge if the card has a rated banner; the number
               comes from the same parse path as tagFilledRatings (className
               > textContent). Only injected when v > 0. */
            if (ratingEl) {
                var ratingNum = null;
                var mCls = ratingEl.className.match(/\brating-100-(\d+)\b/);
                if (mCls) {
                    ratingNum = parseInt(mCls[1], 10) * 5 / 10;
                } else {
                    mCls = ratingEl.className.match(/\brating-(\d+)\b/);
                    if (mCls) { ratingNum = parseInt(mCls[1], 10) * 2; }
                }
                if (ratingNum == null) {
                    var raw = (ratingEl.textContent || "").trim();
                    var rawV = parseFloat(raw);
                    if (isFinite(rawV) && rawV > 0) {
                        ratingNum = rawV <= 5 ? rawV * 2 : rawV;
                    }
                }
                if (ratingNum && ratingNum > 0) {
                    /* If the user has Stash's rating system set to stars,
                       show the rating chip on a 0–5 scale to match their
                       configured UI; otherwise stay on the 0–10 decimal
                       scale. Detection: `body.refract-rating-system-stars`
                       is set by refractFetchRatingSystem() on init.
                       The internal `ratingNum` stays 0–10 so tier
                       classification (Bronze..Perfect) still works the
                       same. Math.round to 2 decimals to avoid floating-
                       point artefacts like "3.7500000000001". */
                    var displayRating = ratingNum;
                    var starsMode = document.body.classList.contains("refract-rating-system-stars");
                    if (starsMode) {
                        displayRating = Math.round((ratingNum / 2) * 100) / 100;
                    }
                    var rEl = document.createElement("span");
                    rEl.className = "stash-perf-rating";
                    rEl.title = "Rating " + displayRating + (starsMode ? " / 5" : " / 10");
                    rEl.innerHTML = STAR_SVG +
                        '<span class="stash-perf-label">Rating</span>' +
                        "<span>" + escapeHtml(String(displayRating)) + "</span>";
                    row.appendChild(rEl);
                }
            }

            /* Age — adds a cake icon + "Age" label so the bare number
               (e.g. "27") isn't ambiguous in the playing-card stats
               strip. The icon and label are CSS-hidden in Minimal /
               Extravagant modes so those modes keep the compact
               icon-less "27" rendering they had before. */
            if (ageEl) {
                var ageText = ageEl.textContent.replace(/\s*years?\s+old/gi, "").trim();
                /* Stash appends " at production" when the scene has a
                   date and the performer's age is being shown relative
                   to that date. Move the qualifier into the chip label
                   so the value stays a clean bare number. */
                var ageAtProduction = /\s*at\s+production\s*$/i.test(ageText);
                if (ageAtProduction) {
                    ageText = ageText.replace(/\s*at\s+production\s*$/i, "").trim();
                }
                if (ageText) {
                    var ageSpan = document.createElement("span");
                    ageSpan.className = "stash-perf-age";
                    if (ageAtProduction) {
                        ageSpan.title = "Age at production";
                    }
                    ageSpan.innerHTML = CAKE_SVG +
                        '<span class="stash-perf-label">Age' +
                            (ageAtProduction ? '<span class="stash-perf-label-mark">*</span>' : '') +
                        '</span>' +
                        "<span>" + escapeHtml(ageText) + "</span>";
                    row.appendChild(ageSpan);
                }
                ageEl.style.display = "none";
            }

            /* O count — Stash renders it as a two-button group:
                 .count-button > [button title="O Count"] + [button.count-value > span]
               Find the title="O Count" button, walk to its parent group,
               read the .count-value span. Only inject when non-zero. */
            var oTitleBtn = popovers ? popovers.querySelector('button[title="O Count"]') : null;
            if (oTitleBtn) {
                var oGroup = oTitleBtn.closest(".count-button");
                var oValueSpan = oGroup ? oGroup.querySelector(".count-value span") : null;
                var oText = oValueSpan ? oValueSpan.textContent.trim() : "";
                if (oText && oText !== "0") {
                    var oEl = document.createElement("span");
                    oEl.className = "stash-perf-ocount";
                    oEl.title = oText + " O";
                    oEl.innerHTML = O_ICON_SVG +
                        '<span class="stash-perf-label">O Count</span>' +
                        "<span>" + escapeHtml(oText) + "</span>";
                    row.appendChild(oEl);
                }
            }

            /* Scene count — wrap the number in an inner <span> for the
               same reason as age (lets playing-card mode target an inner
               element for gradient text-clip without clipping the chip). */
            if (sceneLink) {
                var countEl = sceneLink.querySelector("span");
                var countText = countEl ? countEl.textContent.trim() : "";
                var scenesA = document.createElement("a");
                scenesA.className = "stash-perf-scenes";
                scenesA.href = sceneLink.getAttribute("href") || "#";
                scenesA.addEventListener("click", stopProp);
                scenesA.innerHTML = PLAY_SVG +
                    '<span class="stash-perf-label">Scenes</span>' +
                    "<span>" + escapeHtml(countText) + "</span>";
                row.appendChild(scenesA);
            }

            /* Country flag — kept around; clone is injected INSIDE the
               name banner (alongside the gender icon) in playing-card
               mode. This frees the top-right corner for the diagonal
               tier banner. The flag clone is added below when we
               build the name banner. */

            /* Tier label placeholder — empty in DOM. In playing-card
               mode, CSS reads the card's `refract-card-tier-*` class
               (applied later by tagFilledRatings) and fills this
               element via `::after { content: ... }`. Always injected
               so we don't need to re-run initPerformerCards when the
               rating changes; CSS handles visibility per tier. */
            var tierLabel = document.createElement("div");
            tierLabel.className = "refract-pc-tier-label";
            card.appendChild(tierLabel);

            section.appendChild(row);

            /* Combined shrink-to-fit for the stat strip + name banner.
               Both passes need to re-run on card resize (window zoom,
               grid reflow, etc.) — the one-shot rAF that fired only on
               first inject left the badges cut off after `cmd+`/`cmd-`.
               `var bannerInner` is hoisted to the forEach scope and is
               assigned later in the if(titleEl) block — by the time
               refit() actually runs (rAF / ResizeObserver callback),
               that assignment has happened or `bannerInner` is
               undefined and we skip the name pass. */
            var refitPending = false;
            function refit() {
                if (refitPending) { return; }
                refitPending = true;
                requestAnimationFrame(function () {
                    refitPending = false;
                    if (!document.body.classList.contains("refract-rating-style-playing-card")) { return; }
                    /* Stat strip — high scene counts (3 digits) push
                       chips off the right edge. Step --pc-badge-scale
                       down through the ladder until the row fits. */
                    var scales = [1, 0.92, 0.84, 0.76, 0.68, 0.6];
                    for (var i = 0; i < scales.length; i++) {
                        row.style.setProperty("--pc-badge-scale", scales[i]);
                        if (row.scrollWidth <= row.clientWidth + 1) { break; }
                    }
                    /* Name banner — Concert One is moderately wide;
                       step font-size down through the ladder until the
                       text fits the left 3/4 of the banner. */
                    if (bannerInner) {
                        var sizes = [1.25, 1.1, 0.95, 0.85, 0.75, 0.7];
                        for (var j = 0; j < sizes.length; j++) {
                            bannerInner.style.fontSize = sizes[j] + "rem";
                            if (bannerInner.scrollWidth <= bannerInner.clientWidth + 1) { break; }
                        }
                    }
                });
            }

            /* Playing-card mode name banner — Pokemon-style header:
                 [gender icon (type)]  Name        ← left-aligned
               Inject a copy of the gender icon (cloned from native
               .gender-icon under the title) PLUS just the performer name
               text (from .TruncatedText so we exclude the hidden country
               string). Display is CSS-gated to playing-card mode. */
            /* Country indicator — extract the ISO-2 code from the
               flag-icons class (`fi fi-XX`) and convert it to the
               full localized country name via `Intl.DisplayNames`
               (built-in browser API). Inserted into the chin above
               the stat strip so it stacks naturally as a quiet
               caption (no absolute positioning to fight). Falls
               back to the raw uppercase code if DisplayNames isn't
               available or doesn't know the region. */
            if (flagEl) {
                var codeMatch = (flagEl.className || "").match(/\bfi-([a-z]{2})\b/i);
                if (codeMatch) {
                    var code = codeMatch[1].toUpperCase();
                    var countryName = code;
                    try {
                        var names = new Intl.DisplayNames(["en"], { type: "region" });
                        countryName = names.of(code) || code;
                    } catch (e) { /* fall back to the raw code */ }
                    var countryWrap = document.createElement("span");
                    countryWrap.className = "stash-perf-country";
                    countryWrap.textContent = countryName;
                    section.insertBefore(countryWrap, row);
                }
            }

            if (titleEl) {
                var banner = document.createElement("div");
                banner.className = "refract-pc-name-banner";
                /* Gender — corner "type" slot before the name */
                var genderEl = titleEl.querySelector(".gender-icon");
                if (genderEl) {
                    banner.appendChild(genderEl.cloneNode(true));
                }
                /* Name — prefer .TruncatedText child; falls back to title
                   textContent. Avoid grabbing titleEl.textContent directly
                   since Stash also renders .performer-card__country-string
                   inside the title (display:none but textContent-visible).
                   We clone the element and strip any disambiguation
                   children before extracting textContent, otherwise the
                   parenthetical "(Tall)" disambig text would be folded
                   into the rendered name. */
                var nameText;
                var nameSrc = titleEl.querySelector(".TruncatedText") || titleEl;
                if (nameSrc) {
                    var nameClone = nameSrc.cloneNode(true);
                    nameClone.querySelectorAll(".performer-disambiguation, .disambiguation, .performer-card__country-string").forEach(function (el) {
                        el.remove();
                    });
                    nameText = (nameClone.textContent || "").trim();
                } else {
                    nameText = "";
                }
                var bannerInner = document.createElement("span");
                bannerInner.className = "refract-pc-name-text";
                bannerInner.textContent = nameText;
                banner.appendChild(bannerInner);
                card.insertBefore(banner, card.firstChild);

            }

            /* Initial fit + ResizeObserver re-fit on any card size change
               (window zoom via cmd+/-, grid reflow on viewport resize,
               font-loading shift, etc.). Without this the badges got
               cut off after a zoom because the one-shot rAF that ran on
               first inject didn't re-measure. ResizeObserver is rAF-
               coalesced internally so multiple card resizes per frame
               collapse to one refit. */
            refit();
            if (window.ResizeObserver) {
                var ro = new ResizeObserver(refit);
                ro.observe(card);
            }

            if (hr) { hr.style.display = "none"; }
            if (popovers) { popovers.style.display = "none"; }
        });
    }

    /* Floating-hearts effect for favourited PERFORMER cards — only in
       playing-card rating-style mode. Mirrors the scene-card hearts
       feature, but the source of "is this favourited?" is the native
       Stash `.favorite-button.favorite` class rather than a tag lookup,
       so we re-sync on every mutation cycle (Stash applies / removes
       the class reactively when the user toggles the heart). */
    function syncPerformerCardHearts() {
        var inPlayingCard = document.body.classList.contains("refract-rating-style-playing-card");
        document.querySelectorAll(".performer-card").forEach(function (card) {
            var isFav = !!card.querySelector(".favorite-button.favorite");
            var existing = card.querySelector(":scope > .refract-heart-particles");
            if (inPlayingCard && isFav) {
                card.classList.add("refract-favourite");
                if (!existing) {
                    var particles = document.createElement("div");
                    particles.className = "refract-heart-particles";
                    particles.setAttribute("aria-hidden", "true");
                    for (var hi = 1; hi <= 5; hi++) {
                        var heart = document.createElement("span");
                        heart.className = "refract-heart refract-heart-" + hi;
                        heart.textContent = "♥";
                        particles.appendChild(heart);
                    }
                    card.appendChild(particles);
                }
            } else {
                card.classList.remove("refract-favourite");
                if (existing) { existing.remove(); }
            }
        });
    }

    function onKey(e) {
        if (e.key === "Escape" && isCategoriesPath() && overlayEl && !overlayEl.hasAttribute("hidden")) {
            e.preventDefault();
            window.history.back();
        }
    }

    /* ── Floating pagination ─────────────────────────────────────────── */

    function initFloatingPager() {
        /* Match any element with class "pagination" regardless of tag */
        var pagers = Array.from(document.querySelectorAll(".pagination"));
        if (!pagers.length) { return; }

        /* Reset previous markers */
        document.querySelectorAll("[data-pager-role],[data-pager-row]").forEach(function (el) {
            el.removeAttribute("data-pager-role");
            el.removeAttribute("data-pager-row");
        });

        function rowOf(pager) {
            /* Walk up until we find a block-level wrapper that isn't just a nav/ul */
            var el = pager.parentElement;
            for (var i = 0; i < 4; i++) {
                if (!el || el === document.body) { break; }
                var tag = el.tagName;
                if (tag !== "NAV" && tag !== "UL" && tag !== "LI") {
                    /* Don't tag a wrapper that also contains the filter toolbar —
                       otherwise the whole toolbar gets position:fixed'd to the
                       viewport bottom on pages where the pager is embedded in
                       the toolbar row. Float just the pager itself in that case. */
                    if (el.querySelector('[data-stash-filter], input[placeholder*="Search" i]')) {
                        return pager;
                    }
                    return el;
                }
                el = el.parentElement;
            }
            return pager.parentElement;
        }

        /* Hide every pager except the last (Stash shows one at top, one at bottom) */
        pagers.slice(0, -1).forEach(function (p) {
            p.setAttribute("data-pager-role", "hide");
            rowOf(p).setAttribute("data-pager-row", "hide");
        });

        var last = pagers[pagers.length - 1];
        last.setAttribute("data-pager-role", "float");
        rowOf(last).setAttribute("data-pager-row", "float");
    }

    /* ── Table list view: strip overflowable so hover-popup never fires ── */

    function disableTableOverflowable() {
        document.querySelectorAll(".table-list .comma-list.overflowable").forEach(function (el) {
            el.classList.remove("overflowable");
        });
    }

    /* ── Performer rating modal: mark filled stars ───────────────────── */
    var starObserver = null;
    function markFilledStars() {
        var modal = document.querySelector(".adv-rating-modal-overlay");
        if (!modal) {
            if (starObserver) { starObserver.disconnect(); starObserver = null; }
            return;
        }
        modal.querySelectorAll(".rating-star").forEach(function (el) {
            if (el.textContent.trim() === "★") { /* ★ filled */
                el.classList.add("filled");
            } else {
                el.classList.remove("filled");
            }
        });
        if (!starObserver) {
            starObserver = new MutationObserver(function () { markFilledStars(); });
            starObserver.observe(modal, { subtree: true, childList: true, characterData: true });
        }
    }

    /* ── Filter toolbar: mark container + hide zoom slider ─────────── */

    function initFilterBar() {
        /* Find search input; if already inside a marked container, skip. */
        var search = document.querySelector('input[placeholder*="Search"]:not([data-fb-done])');
        if (!search) { return; }
        search.setAttribute("data-fb-done", "1");

        /* Don't tag modal dialogs (internal UI), and don't tag the sidebar
           filter panel — it contains a search input + lots of filter-
           section buttons and gets misidentified as the toolbar otherwise. */
        if (search.closest && search.closest('.modal, .modal-dialog, .modal-content, .sidebar')) { return; }

        /* Walk up until we find a div containing ≥ 4 buttons — that is the
           filter toolbar wrapper, whatever Stash names the class. */
        var el = search.parentElement;
        for (var i = 0; i < 7; i++) {
            if (!el || el === document.body) { break; }
            if (el.tagName === "DIV" && el.querySelectorAll("button").length >= 4) {
                if (!el.hasAttribute("data-stash-filter")) {
                    el.setAttribute("data-stash-filter", "1");
                }
                break;
            }
            el = el.parentElement;
        }
    }

    /* ── Filter button: orange glow when filters are active ─────────── */

    function initFilterButtonBadge() {
        /* Find buttons inside [data-stash-filter] that contain a .badge child —
           those are the Stash filter/sort buttons with an active-count overlay. */
        document.querySelectorAll("[data-stash-filter] button").forEach(function (btn) {
            var badge = btn.querySelector(".badge");
            if (!badge) { return; }
            var count = parseInt(badge.textContent, 10);
            if (count > 0) {
                btn.setAttribute("data-filter-active", "1");
            } else {
                btn.removeAttribute("data-filter-active");
            }
        });
    }

    /* ── View-mode dropdown: replaces the btn-group in the filter bar ── */

    function initViewModeDropdown() {
        if (!isViewMinimiserEnabled()) { return; }
        document.querySelectorAll("[data-stash-filter]").forEach(function (container) {
            if (container.querySelector(".stash-view-wrap")) { return; }
            /* View-mode buttons are the rightmost btn-group; pick the last one
               with the most buttons (≥ 3) to avoid grabbing bookmark/filter groups. */
            var allGroups = Array.from(container.querySelectorAll(".btn-group"));
            var group = null;
            var maxBtns = 0;
            allGroups.forEach(function (g) {
                var n = g.querySelectorAll(".btn").length;
                if (n >= 3 && n >= maxBtns) { group = g; maxBtns = n; }
            });
            if (!group) { return; }
            /* Exclude multiview plugin's picking toggle — it lives in this group
               but is not a view mode and must stay as a standalone button. */
            var btns = Array.from(group.querySelectorAll(".btn")).filter(function (b) {
                return !b.classList.contains("mv-picking-toggle-btn");
            });
            if (btns.length < 2) { return; }

            /* Restore any previously mis-hidden groups, then hide only this one. */
            container.querySelectorAll(".btn-group[data-stash-view-hidden]").forEach(function (g) {
                if (g !== group) { g.style.cssText = ""; g.removeAttribute("data-stash-view-hidden"); }
            });
            group.setAttribute("data-stash-view-hidden", "1");
            /* Keep normal dimensions so React continues updating button classes;
               just make it invisible and non-interactive. */
            group.style.cssText = "position:absolute;opacity:0;pointer-events:none;";

            /* Rescue the multiview picking button from the hidden group so it
               stays visible as a standalone button after the dropdown. */
            var mvBtn = group.querySelector(".mv-picking-toggle-btn");
            if (mvBtn && !container.querySelector(".stash-mv-rescued")) {
                var rescued = mvBtn.cloneNode(true);
                rescued.classList.add("stash-mv-rescued");
                rescued.addEventListener("click", function () { mvBtn.click(); });
                /* Keep rescued button in sync when multiview toggles active state */
                var mvObs = new MutationObserver(function () {
                    rescued.className = mvBtn.className + " stash-mv-rescued";
                });
                mvObs.observe(mvBtn, { attributes: true, attributeFilter: ["class"] });
                safeInsertBefore(group.parentElement, rescued, group.nextSibling);
            }

            var wrap      = document.createElement("div");
            var panel     = document.createElement("div");
            var activeInd = document.createElement("button"); /* current-view indicator */
            var trigger   = document.createElement("button"); /* chevron */
            wrap.className      = "stash-view-wrap";
            panel.className     = "stash-view-panel";
            activeInd.type      = "button";
            activeInd.className = "stash-view-active-ind";
            trigger.type        = "button";
            trigger.className   = "stash-view-trigger";
            /* Right-pointing chevron: closed = ›, open rotates to ‹ */
            trigger.innerHTML =
                "<svg viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>" +
                "<path d='M10 7L15 12L10 17' stroke='currentColor' stroke-width='1.5' " +
                "stroke-linecap='round' stroke-linejoin='round'/></svg>";

            function liveBtns() {
                /* Re-query the live DOM each time so React class updates are seen */
                return Array.from(group.querySelectorAll(".btn")).filter(function (b) {
                    return !b.classList.contains("mv-picking-toggle-btn");
                });
            }

            function isActiveLiveBtn(b) {
                return b.classList.contains("btn-primary") ||
                       b.classList.contains("active") ||
                       b.getAttribute("aria-pressed") === "true";
            }

            function getActiveBtn(current) {
                return current.find(isActiveLiveBtn) || current[0];
            }

            function syncActive() {
                var current = liveBtns();
                var activeBtn = getActiveBtn(current);

                /* Update active indicator — show current view's icon */
                if (activeBtn) {
                    var svg = activeBtn.querySelector("svg");
                    activeInd.innerHTML = svg ? svg.outerHTML : "";
                    activeInd.title = activeBtn.getAttribute("aria-label") || activeBtn.getAttribute("title") || "";
                }

                /* Update panel opt active highlights */
                Array.from(panel.querySelectorAll(".stash-view-opt")).forEach(function (opt) {
                    var live = opt._liveBtn;
                    opt.classList.toggle("active", !!(live && isActiveLiveBtn(live)));
                });
            }

            /* Build panel with NON-active view options (active already shown by indicator) */
            function buildPanel() {
                panel.innerHTML = "";
                var current = liveBtns();
                var activeBtn = getActiveBtn(current);
                current.forEach(function (btn) {
                    /* Skip the currently active view — it's shown in the indicator */
                    if (btn === activeBtn) { return; }
                    var label = btn.getAttribute("aria-label") || btn.getAttribute("title") || "";
                    var svg   = btn.querySelector("svg");
                    var opt   = document.createElement("button");
                    opt.type      = "button";
                    opt.className = "stash-view-opt";
                    opt.title     = label;
                    opt.innerHTML = svg ? svg.outerHTML : "";
                    opt._liveBtn  = btn;
                    opt.addEventListener("click", function (e) {
                        e.stopPropagation();
                        /* Always click the live DOM button, not a stale reference */
                        var target = opt._liveBtn || btn;
                        target.click();
                        setTimeout(function () { syncActive(); close(); }, 60);
                    });
                    panel.appendChild(opt);
                });
            }

            var isOpen = false;
            function open() {
                isOpen = true;
                buildPanel();   /* rebuild options fresh each open so React changes are reflected */
                syncActive();
                panel.classList.add("open");
                trigger.classList.add("open");
            }
            function close() {
                isOpen = false;
                panel.classList.remove("open");
                trigger.classList.remove("open");
            }
            function toggle(e) {
                e.stopPropagation();
                if (isOpen) { close(); } else { open(); }
            }

            trigger.addEventListener("click", toggle);
            activeInd.addEventListener("click", toggle);
            document.addEventListener("click", function () { if (isOpen) { close(); } });

            /* Stay in sync when React changes the active button class or replaces elements */
            var mo = new MutationObserver(syncActive);
            mo.observe(group, { attributes: true, subtree: true, attributeFilter: ["class", "aria-pressed"], childList: true });

            syncActive();
            /* DOM order: [active-indicator][panel][chevron]
               Panel slides right out between the indicator and chevron */
            wrap.appendChild(activeInd);
            wrap.appendChild(panel);
            wrap.appendChild(trigger);
            safeInsertBefore(group.parentElement, wrap, group);
        });
    }

    /* Tear down the view-mode dropdown and restore Stash's original
       btn-group of view buttons. Used when the user toggles the
       minimiser feature off in plugin settings. */
    function teardownViewModeDropdown() {
        document.querySelectorAll(".stash-view-wrap").forEach(function (w) { w.remove(); });
        document.querySelectorAll(".stash-mv-rescued").forEach(function (b) { b.remove(); });
        document.querySelectorAll(".btn-group[data-stash-view-hidden]").forEach(function (g) {
            g.style.cssText = "";
            g.removeAttribute("data-stash-view-hidden");
        });
    }

    /* ── Tab-strip wheel scroll ─────────────────────────────────────────
       Stash's scene/gallery .nav-tabs and .scene-toolbar strips use
       overflow-x: auto with hidden scrollbars. Trackpad users can
       side-swipe natively; mouse users with vertical-only wheels have
       no way to scroll horizontally. This handler converts vertical
       wheel deltas into horizontal scroll on those strips. Native
       horizontal-axis events (trackpad horizontal swipe, shift+wheel)
       pass through untouched. */

    function initTabScrollChevrons() {
        var path = refractPathFromLocation();
        if (!/^\/scenes\/[^/]/.test(path) && !/^\/galleries\/[^/]/.test(path)) return;
        var strips = document.querySelectorAll(
            ".scene-tabs .nav-tabs:not([data-refract-wheel-scroll])," +
            ".gallery-tabs .nav-tabs:not([data-refract-wheel-scroll])," +
            ".scene-tabs .scene-toolbar:not([data-refract-wheel-scroll])"
        );
        strips.forEach(function (strip) {
            strip.setAttribute("data-refract-wheel-scroll", "1");
            strip.addEventListener("wheel", function (e) {
                if (e.deltaY === 0) { return; }
                if (strip.scrollWidth <= strip.clientWidth) { return; }
                e.preventDefault();
                strip.scrollLeft += e.deltaY;
            }, { passive: false });
        });
    }

    /* ── Slick carousel: orange progress bar + trackpad scroll ──────── */

    function initSlickCarousels() {
        var sliders = document.querySelectorAll(".slick-slider:not([data-stash-slick])");
        sliders.forEach(function (slider) {
            slider.setAttribute("data-stash-slick", "1");

            /* -- progress bar -- */
            var bar = document.createElement("div");
            bar.className = "stash-carousel-bar";
            var fill = document.createElement("div");
            fill.className = "stash-carousel-fill";
            bar.appendChild(fill);
            slider.appendChild(bar);

            function countRealSlides() {
                var real = slider.querySelectorAll(".slick-slide:not(.slick-cloned)");
                return real.length;
            }

            function currentIndex() {
                var cur = slider.querySelector(".slick-slide.slick-current:not(.slick-cloned)");
                if (!cur) { return 0; }
                var idx = parseInt(cur.getAttribute("data-index"), 10);
                return isNaN(idx) ? 0 : idx;
            }

            function updateBar() {
                var total = countRealSlides();
                if (total <= 1) { fill.style.width = "100%"; return; }
                var pct = (currentIndex() / (total - 1)) * 100;
                fill.style.width = Math.min(Math.max(pct, 2), 100) + "%";
            }

            updateBar();

            /* Watch for slick moving by observing class changes on slides */
            var slideObserver = new MutationObserver(updateBar);
            var track = slider.querySelector(".slick-track");
            if (track) {
                slideObserver.observe(track, { attributes: true, subtree: true, attributeFilter: ["class"] });
            }

            /* -- horizontal trackpad/wheel scroll -- */
            var list = slider.querySelector(".slick-list");
            if (!list) { return; }

            var wheelDebounce = null;
            var wheelAccum = 0;
            var WHEEL_THRESHOLD = 40;

            list.addEventListener("wheel", function (e) {
                /* Only act on horizontal swipes or shift+scroll */
                var dx = Math.abs(e.deltaX);
                var dy = Math.abs(e.deltaY);

                /* Ignore clearly vertical scrolls that aren't shift-modified */
                if (!e.shiftKey && dy > dx * 2) { return; }

                e.preventDefault();

                wheelAccum += e.shiftKey ? e.deltaY : e.deltaX;
                clearTimeout(wheelDebounce);
                wheelDebounce = setTimeout(function () { wheelAccum = 0; }, 300);

                if (Math.abs(wheelAccum) < WHEEL_THRESHOLD) { return; }
                var dir = wheelAccum > 0 ? 1 : -1;
                wheelAccum = 0;

                /* Try Slick jQuery API first, fall back to clicking nav buttons */
                try {
                    if (window.$ && $(slider).slick) {
                        $(slider).slick(dir > 0 ? "slickNext" : "slickPrev");
                        return;
                    }
                } catch (err) { /* no jQuery slick */ }

                var btn = slider.querySelector(dir > 0 ? ".slick-next" : ".slick-prev");
                if (btn) { btn.click(); }
            }, { passive: false });
        });
    }

    /* ── boot ────────────────────────────────────────────────────── */

    function boot() {
        try {
            document.documentElement.classList.add("stash-liquid-glass");
            if (document.body) {
                document.body.classList.add("stash-liquid-glass");
            }
        } catch (e) { /* ignore */ }
        setRouteClass();
        cleanupLegacyArtifacts();
        initHistory();
        refractBindBurgerGlobalHandlers();
        document.addEventListener("keydown", onKey);

        if (typeof PluginApi !== "undefined" && PluginApi && PluginApi.Event && PluginApi.Event.addEventListener) {
            PluginApi.Event.addEventListener("stash:location", function () {
                refineBrandHomeOrb();
                injectNewButtonIcon();
                normalizeLibraryAddButton();
                relocateAddSourceButton();
                injectMobileBurger();
                normalizeSettingsSidebarNavItems();
                injectSupportStashLink();
                markActiveUtilityButtons();
                nextTick(stripRatingBannerToNumber);
                nextTick(syncRoute);
                nextTick(initSceneCards);
                nextTick(initPerformerCards);
                nextTick(initSlickCarousels);
                nextTick(initFilterBar);
                nextTick(initFilterButtonBadge);
                nextTick(initViewModeDropdown);
                nextTick(initTabScrollChevrons);
                nextTick(initFloatingPager);
                nextTick(disableTableOverflowable);
                nextTick(markFilledStars);
                nextTick(fixSceneTaggerDetails);
                nextTick(initImageCardLightbox);
                nextTick(unstickyGalleryToolbar);
                nextTick(initRefractTagEditor);
                nextTick(enhanceDuplicateChecker);
            });
        }

        refineBrandHomeOrb();
        injectNewButtonIcon();
        normalizeLibraryAddButton();
        relocateAddSourceButton();
                injectMobileBurger();
        normalizeSettingsSidebarNavItems();
                injectSupportStashLink();
        markActiveUtilityButtons();
        stripRatingBannerToNumber();
        initCardTilts();
        initImageCardLightbox();
        unstickyGalleryToolbar();
        initSceneCards();
        initPerformerCards();
        initSlickCarousels();
        initFilterBar();
        initFilterButtonBadge();
        initViewModeDropdown();
        initTabScrollChevrons();
        initFloatingPager();
        disableTableOverflowable();
        initRefractTagEditor();
        enhanceDuplicateChecker();
        refractFetchRatingSystem();
        watchForReinjection();
        syncRoute();
    }

    /* ── Scene Tagger: override Stash's scene-details centering via inline ── */
    /* Stash's own stylesheet loads after plugin CSS in cascade, so its        */
    /* justify-content:center and grey background win over CSS-only overrides. */
    /* Inline setProperty beats everything, including Stash's !important.      */
    function fixSceneTaggerDetails(root) {
        var r = root || document;

        /* scene-metadata: override Bootstrap's justify-content:center (vertical) so
           content starts at the top, and restore padding stripped by the global clear. */
        r.querySelectorAll(".search-result .scene-metadata").forEach(function(el) {
            el.style.setProperty("justify-content", "flex-start", "important");
            el.style.setProperty("padding", "0.6rem 0.75rem", "important");
        });

        /* scene-details: strip Stash's grey glass card and keep thumbnail + metadata side by side.
           flex-wrap:nowrap prevents metadata from falling below the thumbnail when content is wide. */
        r.querySelectorAll(".search-result .scene-details").forEach(function(el) {
            el.style.setProperty("background", "transparent", "important");
            el.style.setProperty("border", "none", "important");
            el.style.setProperty("border-radius", "0", "important");
            el.style.setProperty("box-shadow", "none", "important");
            el.style.setProperty("backdrop-filter", "none", "important");
            el.style.setProperty("padding", "0", "important");
            el.style.setProperty("display", "flex", "important");
            el.style.setProperty("flex-direction", "row", "important");
            el.style.setProperty("flex-wrap", "nowrap", "important");
            el.style.setProperty("align-items", "flex-start", "important");
            el.style.setProperty("justify-content", "flex-start", "important");
            el.style.setProperty("align-self", "flex-start", "important");
        });

        /* scene-metadata: fill the remaining width beside the thumbnail, allow shrinking,
           prevent content overflow (min-width:0 lets flex shrink past content size). */
        r.querySelectorAll(".search-result .scene-details .scene-metadata").forEach(function(el) {
            el.style.setProperty("flex", "1 1 auto", "important");
            el.style.setProperty("min-width", "0", "important");
        });

        /* optional-field: flex row, left-aligned — must set display too or
           justify-content has no effect if Stash overrides display to block   */
        r.querySelectorAll(".search-result .optional-field").forEach(function(el) {
            el.style.setProperty("background", "transparent", "important");
            el.style.setProperty("border", "none", "important");
            el.style.setProperty("box-shadow", "none", "important");
            el.style.setProperty("padding", "0", "important");
            el.style.setProperty("display", "flex", "important");
            el.style.setProperty("flex-direction", "row", "important");
            el.style.setProperty("align-items", "center", "important");
            el.style.setProperty("justify-content", "flex-start", "important");
        });

        /* fingerprint/phash/md5 rows: normalize icon alignment.
           Duration + PHashes have .SceneTaggerIcon (Stash-offset), MD5 has .mr-2.
           Force all .font-weight-bold rows to flex with consistent icon sizing.  */
        r.querySelectorAll(".search-result .scene-metadata .font-weight-bold").forEach(function(el) {
            el.style.setProperty("display", "flex", "important");
            el.style.setProperty("align-items", "center", "important");
            el.style.setProperty("gap", "0.4rem", "important");
        });
        r.querySelectorAll(".search-result .scene-metadata .font-weight-bold > svg").forEach(function(el) {
            el.style.setProperty("margin", "0", "important");
            el.style.setProperty("flex-shrink", "0", "important");
            el.style.setProperty("width", "1em", "important");
            el.style.setProperty("height", "1em", "important");
        });

        /* include-exclude-button: pull out of absolute/centered positioning */
        r.querySelectorAll(".search-result .include-exclude-button").forEach(function(el) {
            el.style.setProperty("position", "static", "important");
            el.style.setProperty("transform", "none", "important");
            el.style.setProperty("top", "auto", "important");
            el.style.setProperty("left", "auto", "important");
            el.style.setProperty("bottom", "auto", "important");
            el.style.setProperty("right", "auto", "important");
        });
    }

    /* Initial fixSceneTaggerDetails pass — subsequent passes run via the
       consolidated mutation watcher at the end of this file. */
    fixSceneTaggerDetails();

    /* ── Performer Tagger: relocate batch buttons into header ──────────
       The PerformerTagger page renders three action buttons (Batch Add,
       Batch Update, Search All) in their own .ml-auto.mb-3 row above
       the performer grid. We move them into the .tagger-container-header
       so they share the row with the Source select + gear icon. */
    function relocateTaggerBatchButtons(root) {
        var r = root || document;
        r.querySelectorAll(".tagger-container-header").forEach(function (header) {
            if (header.dataset.refractBatchMoved === "1") { return; }
            /* Find the sibling .card that contains .PerformerTagger and
               the batch-button row. */
            var sibling = header.nextElementSibling;
            while (sibling && !(sibling.classList && sibling.classList.contains("card"))) {
                sibling = sibling.nextElementSibling;
            }
            if (!sibling || !sibling.querySelector(":scope > .PerformerTagger")) { return; }
            var batchRow = sibling.querySelector(":scope > .ml-auto.mb-3");
            if (!batchRow) { return; }
            /* Place inside the right-side flex column (which wraps the
               gear button), before the gear, so the batch buttons and
               gear group together on the right edge of the header. */
            var headerRow = header.querySelector(":scope > .d-flex.justify-content-between");
            if (!headerRow) { return; }
            var rightCol = headerRow.lastElementChild;
            rightCol.insertBefore(batchRow, rightCol.firstElementChild);
            header.dataset.refractBatchMoved = "1";
        });
    }
    relocateTaggerBatchButtons();

    /* PerformerTagger search results — inject a close X button so the
       user can dismiss the result overlay without picking a match.
       The close handler HIDES via class rather than removing the
       element, because removing a React-managed element corrupts
       its virtual DOM tracking and breaks subsequent re-renders.
       Clicking Search again removes the hide class so new results
       can show through. */
    function injectTaggerSearchClose(root) {
        var r = root || document;
        r.querySelectorAll(".PerformerTagger-performer-search:not([data-refract-close])").forEach(function (results) {
            results.dataset.refractClose = "1";
            var btn = document.createElement("button");
            btn.type = "button";
            btn.className = "refract-search-close";
            btn.setAttribute("aria-label", "Close search results");
            btn.title = "Close";
            /* Chevron-up SVG icon */
            btn.innerHTML =
                '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" ' +
                'stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
                '<polyline points="18 15 12 9 6 15"/></svg>';
            btn.addEventListener("click", function (e) {
                e.stopPropagation();
                results.classList.add("refract-search-hidden");
            });
            results.appendChild(btn);
        });
    }
    injectTaggerSearchClose();

    /* Global capture-phase listener: when the user clicks the
       "Search" button inside a PerformerTagger card, un-hide any
       previously-dismissed search results in that same card so
       Stash's incoming React update can render them again. */
    document.addEventListener("click", function (e) {
        var btn = e.target.closest && e.target.closest(".PerformerTagger-performer .PerformerTagger-details .input-group .btn-primary");
        if (!btn) { return; }
        var card = btn.closest(".PerformerTagger-performer");
        if (!card) { return; }
        card.querySelectorAll(".PerformerTagger-performer-search.refract-search-hidden")
            .forEach(function (el) { el.classList.remove("refract-search-hidden"); });
    }, true);

    /* ── Scene Duplicate Checker: comparison-card layout ────────────
       Stash renders /scenes/duplicate-checker as a 10-column Bootstrap
       table that forces vertical scanning across rows to compare two
       copies of the same scene. We hide the table (CSS, gated on the
       route body class) and inject per-group glass panels with side-
       by-side scene cards. The original <tr>s and their checkboxes /
       merge / delete buttons stay live in the DOM; our custom UI fires
       .click() on them so React state and Stash's existing Edit /
       Delete / Merge / bulk-select flows continue to work.

       React mutates the underlying inputs' `checked` *property* (not
       the attribute) so neither a `change` event nor a MutationObserver
       picks up state changes coming from Stash's bulk-select dropdown.
       A 250ms poll syncs our card's visual checked state to the
       underlying input — cheap, robust, scoped to the route. */

    var refractDupSync = [];
    /* null = pre-action default (largest-file heuristic); otherwise one of
       'largestFile' | 'largestRes' | 'oldest' | 'youngest' | 'none'. Tracked
       by listening for clicks on Stash's Select-Options dropdown items
       (we read the visible label since the React state isn't exposed). */
    var refractDupStrategy = null;

    function refractParseBytes(text) {
        var m = (text || "").match(/([\d.]+)\s*([KMGT])i?B/i);
        if (!m) { return 0; }
        var u = m[2].toUpperCase();
        var mult = { K: 1024, M: 1048576, G: 1073741824, T: 1099511627776 }[u] || 1;
        return parseFloat(m[1]) * mult;
    }

    function refractParseResolution(text) {
        var m = (text || "").match(/(\d+)\s*x\s*(\d+)/);
        return m ? parseInt(m[1], 10) * parseInt(m[2], 10) : 0;
    }

    function refractFormatBytes(bytes) {
        if (!bytes) { return "0 B"; }
        var units = ["B", "KB", "MB", "GB", "TB"];
        var i = 0;
        var n = bytes;
        while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
        return (n < 10 ? n.toFixed(1) : Math.round(n).toString()) + " " + units[i];
    }

    function refractParseDupRow(tr) {
        var cells = tr.querySelectorAll(":scope > td");
        if (cells.length < 10) { return null; }
        var titleLink = cells[2].querySelector("a");
        var pathEl = cells[2].querySelector(".scene-path");
        var actionButtons = cells[9].querySelectorAll(".edit-button");
        var filesizeText = (cells[5].textContent || "").trim();
        var resolutionText = (cells[6].textContent || "").trim();
        var spriteImg = cells[1].querySelector("img");
        return {
            row: tr,
            checkInput: cells[0].querySelector("input[type=checkbox]"),
            spriteSrc: spriteImg ? spriteImg.getAttribute("src") || "" : "",
            title: titleLink ? (titleLink.textContent || "").trim() : "",
            href: titleLink ? titleLink.getAttribute("href") : "",
            path: pathEl ? (pathEl.textContent || "").trim() : "",
            duration: (cells[4].textContent || "").trim(),
            filesize: filesizeText,
            bytes: refractParseBytes(filesizeText),
            resolution: resolutionText,
            resolutionPixels: refractParseResolution(resolutionText),
            bitrate: (cells[7].textContent || "").trim(),
            codec: (cells[8].textContent || "").trim(),
            deleteBtn: actionButtons[0] || null,
            mergeBtn: actionButtons[1] || null
        };
    }

    function refractAnalyzeDupGroup(scenes) {
        var totalBytes = 0;
        var largest = scenes[0];
        var highestRes = scenes[0];
        var codecs = {};
        var codecCount = 0;
        scenes.forEach(function (s) {
            totalBytes += s.bytes || 0;
            if ((s.bytes || 0) > (largest.bytes || 0)) { largest = s; }
            if ((s.resolutionPixels || 0) > (highestRes.resolutionPixels || 0)) { highestRes = s; }
            if (s.codec && !codecs[s.codec]) { codecs[s.codec] = true; codecCount++; }
        });
        return {
            totalBytes: totalBytes,
            largest: largest,
            highestRes: highestRes,
            codecMismatch: codecCount > 1
        };
    }

    function refractMakeSpecPill(iconChar, text, isWinner, isWarn) {
        var pill = document.createElement("span");
        pill.className = "refract-dup-spec" +
            (isWinner ? " refract-dup-spec--winner" : "") +
            (isWarn ? " refract-dup-spec--warn" : "");
        pill.innerHTML =
            '<span class="refract-dup-spec__icon" aria-hidden="true">' + iconChar + '</span>' +
            '<span class="refract-dup-spec__text">' + escapeHtml(text || "—") + '</span>';
        return pill;
    }

    function refractBuildDupCard(scene, stats) {
        var isLargest = scene === stats.largest;
        var isHighestRes = scene === stats.highestRes;

        var card = document.createElement("div");
        card.className = "refract-dup-card";
        /* Stash refs so refractApplyDupSuggestions() can recompute the
           chip + suggested class whenever the user picks a different
           strategy from Stash's Select Options dropdown. */
        card._refractScene = scene;
        card._refractStats = stats;

        var spriteLink = document.createElement("a");
        spriteLink.className = "refract-dup-card__sprite";
        spriteLink.href = scene.href || "#";
        spriteLink.target = "_blank";
        spriteLink.rel = "noopener";
        var img = document.createElement("img");
        img.src = scene.spriteSrc || "";
        img.alt = "";
        img.loading = "lazy";
        spriteLink.appendChild(img);
        /* Pure-CSS hover preview — sibling <span> with a 2x sprite that
           fades in on :hover. Avoids touching Stash's React HoverPopover
           (moving React-managed nodes corrupts virtual DOM tracking). */
        var pop = document.createElement("span");
        pop.className = "refract-dup-card__sprite-pop";
        pop.innerHTML = '<img src="' + escapeHtml(scene.spriteSrc || "") + '" alt="" loading="lazy">';
        spriteLink.appendChild(pop);
        card.appendChild(spriteLink);

        var meta = document.createElement("div");
        meta.className = "refract-dup-card__meta";
        var titleA = document.createElement("a");
        titleA.className = "refract-dup-card__title";
        titleA.href = scene.href || "#";
        titleA.target = "_blank";
        titleA.rel = "noopener";
        titleA.textContent = scene.title || "(untitled)";
        titleA.title = scene.title || "";
        meta.appendChild(titleA);
        var pathDiv = document.createElement("div");
        pathDiv.className = "refract-dup-card__path";
        pathDiv.textContent = scene.path || "";
        pathDiv.title = scene.path || "";
        meta.appendChild(pathDiv);
        card.appendChild(meta);

        var specs = document.createElement("div");
        specs.className = "refract-dup-card__specs";
        specs.appendChild(refractMakeSpecPill("⏱", scene.duration, false, false));
        specs.appendChild(refractMakeSpecPill("⛁", scene.filesize, isLargest, false));
        specs.appendChild(refractMakeSpecPill("⊞", scene.resolution, isHighestRes, false));
        specs.appendChild(refractMakeSpecPill("⇡", scene.bitrate, false, false));
        specs.appendChild(refractMakeSpecPill("◊", scene.codec, false, stats.codecMismatch));
        card.appendChild(specs);

        var actions = document.createElement("div");
        actions.className = "refract-dup-card__actions";

        var checkLabel = document.createElement("label");
        checkLabel.className = "refract-dup-card__check";
        var cardInput = document.createElement("input");
        cardInput.type = "checkbox";
        if (scene.checkInput) { cardInput.checked = scene.checkInput.checked; }
        checkLabel.appendChild(cardInput);
        var checkText = document.createElement("span");
        checkText.textContent = "Mark to delete";
        checkLabel.appendChild(checkText);
        cardInput.addEventListener("change", function () {
            if (scene.checkInput && scene.checkInput.checked !== cardInput.checked) {
                scene.checkInput.click();
            }
            card.classList.toggle("refract-dup-card--checked", cardInput.checked);
        });
        if (scene.checkInput && scene.checkInput.checked) {
            card.classList.add("refract-dup-card--checked");
        }
        refractDupSync.push({ input: scene.checkInput, card: card, cardInput: cardInput });
        actions.appendChild(checkLabel);

        var mergeBtn = document.createElement("button");
        mergeBtn.type = "button";
        mergeBtn.className = "refract-dup-card__merge";
        mergeBtn.textContent = "Merge";
        if (scene.mergeBtn) {
            mergeBtn.addEventListener("click", function () { scene.mergeBtn.click(); });
        } else {
            mergeBtn.disabled = true;
        }
        actions.appendChild(mergeBtn);

        var deleteBtn = document.createElement("button");
        deleteBtn.type = "button";
        deleteBtn.className = "refract-dup-card__delete";
        deleteBtn.textContent = "Delete";
        if (scene.deleteBtn) {
            deleteBtn.addEventListener("click", function () { scene.deleteBtn.click(); });
        } else {
            deleteBtn.disabled = true;
        }
        actions.appendChild(deleteBtn);

        card.appendChild(actions);
        return card;
    }

    function refractBuildDupPanel(group, groupIndex) {
        var scenes = group.map(refractParseDupRow).filter(Boolean);
        if (!scenes.length) { return null; }
        var stats = refractAnalyzeDupGroup(scenes);

        var panel = document.createElement("div");
        panel.className = "refract-dup-panel";

        var header = document.createElement("div");
        header.className = "refract-dup-panel__header";
        var reclaim = stats.totalBytes - (stats.largest.bytes || 0);
        var headerHTML =
            '<span class="refract-dup-panel__num">Group ' + (groupIndex + 1) + '</span>' +
            '<span class="refract-dup-panel__count">' + scenes.length + ' scenes</span>' +
            '<span class="refract-dup-panel__size">' + escapeHtml(refractFormatBytes(stats.totalBytes)) + ' total</span>';
        if (reclaim > 0) {
            headerHTML += '<span class="refract-dup-panel__reclaim">Delete suggested → reclaim ' + escapeHtml(refractFormatBytes(reclaim)) + '</span>';
        }
        if (stats.codecMismatch) {
            headerHTML += '<span class="refract-dup-panel__warn">⚠ codec mismatch</span>';
        }
        header.innerHTML = headerHTML;
        panel.appendChild(header);

        var grid = document.createElement("div");
        grid.className = "refract-dup-panel__grid";
        scenes.forEach(function (s) {
            var c = refractBuildDupCard(s, stats);
            if (c) { grid.appendChild(c); }
        });
        panel.appendChild(grid);

        return panel;
    }

    function refractStartDupSyncTimer() {
        if (window.__refractDupSyncTimer) { return; }
        window.__refractDupSyncTimer = setInterval(function () {
            if (!document.body || !document.body.classList.contains("stash-route-sceneduplicatechecker")) {
                clearInterval(window.__refractDupSyncTimer);
                window.__refractDupSyncTimer = null;
                refractDupSync.length = 0;
                return;
            }
            var anyChanged = false;
            for (var i = refractDupSync.length - 1; i >= 0; i--) {
                var e = refractDupSync[i];
                if (!e.card || !e.input || !document.contains(e.card) || !document.contains(e.input)) {
                    refractDupSync.splice(i, 1);
                    continue;
                }
                var nowChecked = !!e.input.checked;
                if (e.cardInput.checked !== nowChecked) {
                    e.cardInput.checked = nowChecked;
                }
                if (e.card.classList.contains("refract-dup-card--checked") !== nowChecked) {
                    e.card.classList.toggle("refract-dup-card--checked", nowChecked);
                    anyChanged = true;
                }
            }
            /* When checked-state changes from outside (e.g. Stash's bulk
               Select Options dropdown), and the active strategy is oldest /
               youngest (which we can't compute from the DOM), recompute
               chip placement from the new checked set. */
            if (anyChanged && (refractDupStrategy === "oldest" || refractDupStrategy === "youngest")) {
                refractApplyDupSuggestions();
            }
        }, 250);
    }

    function refractApplyDupSuggestions() {
        var suggestedCount = 0;
        document.querySelectorAll(".refract-dup-card").forEach(function (card) {
            var scene = card._refractScene;
            var stats = card._refractStats;
            if (!scene || !stats) { return; }

            var isLargest = scene === stats.largest;
            var isHighestRes = scene === stats.highestRes;
            var isChecked = !!(scene.checkInput && scene.checkInput.checked);

            var suggested = false;
            var chipText = "Suggested";

            switch (refractDupStrategy) {
                case "none":
                    suggested = false;
                    break;
                case "largestRes":
                    suggested = !isHighestRes;
                    chipText = "Suggested · lower res";
                    break;
                case "oldest":
                    /* mod_time isn't rendered in the table — we can't compute
                       it ourselves. Mirror whatever Stash just checked. */
                    suggested = isChecked;
                    chipText = "Suggested · oldest";
                    break;
                case "youngest":
                    suggested = isChecked;
                    chipText = "Suggested · youngest";
                    break;
                case "largestFile":
                default: /* null — pre-action default heuristic */
                    suggested = !isLargest;
                    chipText = "Suggested · smaller file";
                    break;
            }

            card.classList.toggle("refract-dup-card--suggested", suggested);
            if (suggested) { suggestedCount++; }

            var chip = card.querySelector(":scope > .refract-dup-card__sprite > .refract-dup-card__chip");
            if (suggested) {
                if (!chip) {
                    chip = document.createElement("span");
                    chip.className = "refract-dup-card__chip";
                    var sprite = card.querySelector(".refract-dup-card__sprite");
                    if (sprite) { sprite.appendChild(chip); }
                }
                if (chip && chip.textContent !== chipText) { chip.textContent = chipText; }
            } else if (chip && chip.parentNode) {
                chip.parentNode.removeChild(chip);
            }
        });

        /* Make sure the action pill exists next to the dropdown, then
           sync its label + disabled state. */
        var btn = refractEnsureDupToolbarButton();
        var countEl = document.querySelector("[data-refract-suggested-count]");
        if (countEl) { countEl.textContent = String(suggestedCount); }
        if (btn) {
            btn.disabled = suggestedCount === 0;
            btn.classList.toggle("refract-dup-toolbar-select--empty", suggestedCount === 0);
        }

        /* Rewrite Stash's "Select Options…" toggle to show just the
           current strategy. React may re-render and reset this text;
           the next applyDupSuggestions / enhance cycle fixes it. */
        var label;
        switch (refractDupStrategy) {
            case "largestRes": label = "Lower res"; break;
            case "oldest": label = "Oldest"; break;
            case "youngest": label = "Youngest"; break;
            case "none": label = "None"; break;
            case "largestFile":
            default: label = "Smaller file"; break;
        }
        var toggle = document.querySelector("#scene-duplicate-checker .dropdown-toggle, .duplicate-checker .dropdown-toggle");
        if (toggle && toggle.textContent.trim() !== label) {
            toggle.textContent = label;
        }
    }

    /* Intercept Stash's Select Options dropdown so the strategies repurpose
       as a *filter for the Suggested chip* instead of immediately checking
       boxes. "Select None" is allowed through (it still clears checked
       state natively, which is what users expect). For the four positive
       strategies we stopImmediatePropagation so React's onClick handler
       never sees the event — the boxes don't auto-check. A separate
       "Select N suggested" button in the summary lets the user commit
       the recommendation when they're ready. */
    document.addEventListener("click", function (e) {
        if (!document.body || !document.body.classList.contains("stash-route-sceneduplicatechecker")) { return; }
        var item = e.target.closest && e.target.closest(".duplicate-checker .dropdown-item, #scene-duplicate-checker .dropdown-item");
        if (!item) { return; }
        var t = (item.textContent || "").toLowerCase();

        if (t.indexOf("none") >= 0) {
            /* Allow native behavior: Stash will uncheck everything; our
               poll will sync card --checked states; strategy → none. */
            refractDupStrategy = "none";
            setTimeout(refractApplyDupSuggestions, 50);
            return;
        }

        if (t.indexOf("resolution") >= 0) { refractDupStrategy = "largestRes"; }
        else if (t.indexOf("largest") >= 0) { refractDupStrategy = "largestFile"; }
        else if (t.indexOf("oldest") >= 0) { refractDupStrategy = "oldest"; }
        else if (t.indexOf("youngest") >= 0) { refractDupStrategy = "youngest"; }
        else { return; /* unknown dropdown item */ }

        /* For oldest/youngest we still need the boxes to be checked
           (we can't compute file age from the DOM). Native behavior is
           cheaper than a separate query, so let it through but mark
           strategy. For largestFile/largestRes we can compute ourselves,
           so block native and just update chips. */
        if (refractDupStrategy === "oldest" || refractDupStrategy === "youngest") {
            /* Let native fire — sync poll will reflect checked state and
               trigger refractApplyDupSuggestions to flag the right cards. */
            setTimeout(refractApplyDupSuggestions, 50);
            return;
        }

        e.preventDefault();
        e.stopImmediatePropagation();

        /* Close the open dropdown menu manually since we ate the click that
           Bootstrap would have used to dismiss it. Re-toggling the button
           is the safe path (React-managed state). */
        var toggleBtn = item.closest(".dropdown") && item.closest(".dropdown").querySelector(".dropdown-toggle");
        if (toggleBtn) { setTimeout(function () { toggleBtn.click(); }, 0); }

        refractApplyDupSuggestions();
    }, true);

    /* Walks every currently-suggested card and clicks its hidden Stash
       checkbox to commit the recommendation (Stash's React state updates,
       global delete button then operates on the lot). */
    function refractDupCommitSuggested() {
        document.querySelectorAll(".refract-dup-card--suggested").forEach(function (card) {
            var scene = card._refractScene;
            if (scene && scene.checkInput && !scene.checkInput.checked) {
                scene.checkInput.click();
            }
        });
    }

    /* Inject our "Select N" action pill next to Stash's now-relabeled
       dropdown toggle. React may strip extra children when it re-renders
       this region; the function is idempotent and is called on every
       enhanceDuplicateChecker + applyDupSuggestions cycle. */
    function refractEnsureDupToolbarButton() {
        if (!document.body || !document.body.classList.contains("stash-route-sceneduplicatechecker")) { return null; }
        var dropdown = document.querySelector("#scene-duplicate-checker .dropdown, .duplicate-checker .dropdown");
        if (!dropdown) { return null; }
        var host = dropdown.parentNode;
        if (!host) { return null; }
        var existing = host.querySelector(":scope > .refract-dup-toolbar-select");
        if (existing) { return existing; }
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "refract-dup-toolbar-select";
        btn.innerHTML = 'Select <b data-refract-suggested-count>0</b>';
        btn.addEventListener("click", function (e) {
            e.preventDefault();
            refractDupCommitSuggested();
        });
        /* Place immediately after the dropdown so they read as a pair. */
        if (dropdown.nextSibling) {
            host.insertBefore(btn, dropdown.nextSibling);
        } else {
            host.appendChild(btn);
        }
        return btn;
    }

    function enhanceDuplicateChecker() {
        if (!document.body || !document.body.classList.contains("stash-route-sceneduplicatechecker")) {
            return;
        }
        var card = document.querySelector("#scene-duplicate-checker");
        if (!card) { return; }
        /* Operate on the inner <div class="duplicate-checker"> — the outer
           Card's className is rewritten by React on every re-render, which
           would strip a class flag here. The inner div's className is set
           statically once by the React component, so we can stash our
           enhanced marker as a data-attribute on it (React doesn't touch
           data-* attributes it doesn't own). */
        var dc = card.querySelector(".duplicate-checker") || card;
        var table = dc.querySelector(".duplicate-checker-table");
        if (!table) { return; }
        var tbody = table.tBodies && table.tBodies[0];
        if (!tbody) { return; }

        /* Label both pagination rows so CSS can hide the top one and
           pin the bottom one to the viewport. Data attribute survives
           React re-renders. Idempotent — safe to call on every cycle. */
        var pagers = dc.querySelectorAll(":scope > .d-flex.mt-2.mb-2");
        pagers.forEach(function (p, i) {
            p.setAttribute("data-refract-pager", i === pagers.length - 1 ? "bottom" : "top");
        });

        /* Trim Stash's verbose "N sets of duplicates found." h6 down to
           "N duplicates". React may re-render and reset this; the next
           mutation cycle calls back here and fixes it. */
        var pagerH6 = document.querySelector('[data-refract-pager="bottom"] > h6');
        if (pagerH6) {
            var numMatch = (pagerH6.textContent || "").match(/[\d,]+/);
            if (numMatch) {
                var want = '<b>' + numMatch[0] + '</b> duplicates';
                if (pagerH6.innerHTML.trim() !== want) {
                    pagerH6.innerHTML = want;
                }
            }
        }

        /* Signature: row count + first row's title href. Cheap fingerprint
           for "did the dataset change?". Skips rebuild when React updates
           something orthogonal (e.g. a checked toggle that doesn't move rows). */
        var firstA = tbody.querySelector("tr a[href]");
        var sig = tbody.querySelectorAll(":scope > tr").length + ":" + (firstA ? firstA.getAttribute("href") : "");
        if (tbody.dataset.refractDupSig === sig) { return; }
        tbody.dataset.refractDupSig = sig;
        refractDupSync.length = 0;

        var groups = [];
        var current = null;
        tbody.querySelectorAll(":scope > tr").forEach(function (tr) {
            if (tr.classList.contains("separator")) {
                current = null;
                return;
            }
            if (tr.classList.contains("duplicate-group") || !current) {
                current = [];
                groups.push(current);
            }
            current.push(tr);
        });

        var prior = dc.querySelector(":scope > .refract-dup-panels");
        if (prior) { prior.parentNode.removeChild(prior); }

        var panels = document.createElement("div");
        panels.className = "refract-dup-panels";

        if (!groups.length) {
            var empty = document.createElement("div");
            empty.className = "refract-dup-empty";
            empty.innerHTML =
                '<div class="refract-dup-empty__icon" aria-hidden="true">✓</div>' +
                '<div class="refract-dup-empty__title">No duplicates found</div>' +
                '<div class="refract-dup-empty__hint">Try lowering search accuracy below Exact, or run the phash generation task on more scenes.</div>';
            panels.appendChild(empty);
        } else {
            var totalBytes = 0;
            var reclaimable = 0;
            groups.forEach(function (g) {
                var ss = g.map(refractParseDupRow).filter(Boolean);
                if (!ss.length) { return; }
                var st = refractAnalyzeDupGroup(ss);
                totalBytes += st.totalBytes;
                reclaimable += st.totalBytes - (st.largest.bytes || 0);
            });
            var summary = document.createElement("div");
            summary.className = "refract-dup-summary";
            summary.innerHTML =
                '<span class="refract-dup-summary__stat"><b>' + groups.length + '</b> sets</span>' +
                '<span class="refract-dup-summary__stat"><b>' + escapeHtml(refractFormatBytes(totalBytes)) + '</b> across duplicates</span>' +
                '<span class="refract-dup-summary__reclaim">Reclaim up to <b>' + escapeHtml(refractFormatBytes(reclaimable)) + '</b> by deleting suggested</span>';
            panels.appendChild(summary);

            groups.forEach(function (g, gi) {
                var p = refractBuildDupPanel(g, gi);
                if (p) { panels.appendChild(p); }
            });
        }

        /* Insert panels right before the table (or its .table-responsive
           wrapper, which Bootstrap adds at narrow widths) so they take
           the table's visual slot. CSS then hides the original. */
        var tableSlot = table.closest(".table-responsive") || table;
        if (tableSlot.parentNode) {
            tableSlot.parentNode.insertBefore(panels, tableSlot);
        } else {
            dc.appendChild(panels);
        }
        dc.setAttribute("data-refract-dup-enhanced", "1");
        refractApplyDupSuggestions();
        refractStartDupSyncTimer();
    }

    /* ── Performer Edit Tags Tab — native hierarchical taxonomy editor ────
       Injects an "Edit Tags" tab into #performer-tabs. When clicked, hides
       the native .tab-content via a body class and renders our own pane:
         • GraphQL fetch of the full tag taxonomy + this performer's tags
         • Hierarchy: top-level tags with children → Group;
           their children that themselves have children → Subgroup;
           remaining leaf tags → toggleable buttons
         • Leaves without an intermediate subgroup are grouped under
           a "General" pseudo-section. Tags with no parents and no
           children fall under an "Ungrouped" trailing section.
         • Click a leaf to toggle on/off. aria-pressed drives the
           selected style. Group/subgroup chevrons collapse sections.
         • Search filter — auto-expands groups containing matches.
         • Save → performerUpdate mutation; Discard reverts to
           original. No plugin dependency. */

    var refractTagEditorState = {
        performerId: null,
        loaded: false,
        loading: false,
        saving: false,
        searchQuery: "",
        originalTagIds: [],
        selectedTagIds: new Set(),
        allTags: [],
        tagsById: new Map(),
        rootGroups: [],
        openGroups: new Set(),
        openSubgroups: new Set(),
        focusSearch: false,
    };

    function refractGetPerformerId() {
        var m = (window.location.pathname || "").match(/^\/performers\/(\d+)(?:\/|$|\?|#)/);
        return m ? m[1] : null;
    }

    function refractIsTagEditorActive() {
        return document.body.classList.contains("refract-tag-editor-active");
    }

    function refractFindPerformerTabsNav() {
        var wrap = document.querySelector(".performer-tabs");
        if (!wrap) return null;
        return wrap.querySelector(":scope > nav.nav-tabs, :scope nav.nav-tabs[role='tablist']");
    }

    function refractActivateTagEditor() {
        document.body.classList.add("refract-tag-editor-active");
        var nav = refractFindPerformerTabsNav();
        if (nav) {
            nav.querySelectorAll(".nav-link").forEach(function (a) {
                a.classList.toggle("active", a.classList.contains("refract-tag-editor-tab"));
                if (!a.classList.contains("refract-tag-editor-tab")) {
                    a.setAttribute("aria-selected", "false");
                }
            });
            var ours = nav.querySelector(".refract-tag-editor-tab");
            if (ours) { ours.setAttribute("aria-selected", "true"); }
        }
        var pid = refractGetPerformerId();
        if (pid) { refractLoadTagEditorData(pid); }
        refractRenderTagEditor();
    }

    function refractDeactivateTagEditor() {
        if (!document.body.classList.contains("refract-tag-editor-active")) return;
        document.body.classList.remove("refract-tag-editor-active");
        var nav = refractFindPerformerTabsNav();
        if (nav) {
            var ours = nav.querySelector(".refract-tag-editor-tab");
            if (ours) {
                ours.classList.remove("active");
                ours.setAttribute("aria-selected", "false");
            }
        }
    }

    function initRefractTagEditor() {
        var pid = refractGetPerformerId();
        if (!pid) {
            refractDeactivateTagEditor();
            return;
        }
        var nav = refractFindPerformerTabsNav();
        if (!nav) return;
        var wrap = nav.closest(".performer-tabs");
        if (!wrap) return;

        /* Reset state when navigating to a different performer. */
        if (refractTagEditorState.performerId !== pid) {
            refractTagEditorState.performerId = pid;
            refractTagEditorState.loaded = false;
            refractTagEditorState.selectedTagIds = new Set();
            refractTagEditorState.originalTagIds = [];
            refractTagEditorState.searchQuery = "";
            refractTagEditorState.openGroups = new Set();
            refractTagEditorState.openSubgroups = new Set();
        }

        if (!nav.querySelector(".refract-tag-editor-tab")) {
            var a = document.createElement("a");
            a.className = "nav-item nav-link refract-tag-editor-tab";
            a.setAttribute("role", "tab");
            a.setAttribute("href", "#");
            a.setAttribute("aria-selected", refractIsTagEditorActive() ? "true" : "false");
            if (refractIsTagEditorActive()) { a.classList.add("active"); }
            a.textContent = "Edit Tags";
            nav.appendChild(a);
            a.addEventListener("click", function (e) {
                e.preventDefault();
                e.stopPropagation();
                refractActivateTagEditor();
            });
        } else if (refractIsTagEditorActive()) {
            var existing = nav.querySelector(".refract-tag-editor-tab");
            if (existing && !existing.classList.contains("active")) {
                existing.classList.add("active");
                existing.setAttribute("aria-selected", "true");
            }
        }

        /* Inject the pane INSIDE .tab-content (where the React-managed
           .tab-pane siblings live) so the editor inherits the column
           width and grid positioning of the rest of the performer tabs.
           Appending to .performer-tabs directly landed the pane in a
           different grid cell. */
        var tabContent = wrap.querySelector(":scope > .tab-content")
            || wrap.querySelector(".tab-content");
        if (!tabContent) return;
        var pane = tabContent.querySelector(":scope > .refract-tag-editor-pane");
        if (!pane) {
            pane = document.createElement("div");
            pane.className = "refract-tag-editor-pane tab-pane";
            pane.setAttribute("role", "tabpanel");
            pane.innerHTML = '<div class="refract-tag-editor"></div>';
            tabContent.appendChild(pane);
            refractWireTagEditorEvents(pane);
            if (refractIsTagEditorActive()) { refractRenderTagEditor(); }
        }
    }

    /* ── Tag-button hover tooltip (portaled to document.body) ───────
       Tag pills live in a deeply-nested scrolling/clipped subtree.
       Absolute-positioned tooltips inside the button get cut off by
       ancestor overflow. The reliable fix is to render a single
       tooltip element at body level (no clipping ancestor) and move
       it next to the hovered button via getBoundingClientRect(). */

    var refractTagTipEl = null;
    var refractTagTipTimer = null;

    /* ────────────────────────────────────────────────────────────────
       Performer-name tooltip — portaled to document.body so it can
       render outside the scene card's bounding box. The earlier
       ::after-on-link approach was always at risk of being clipped by
       ancestor overflow / the grid edge — the leftmost avatar's
       centered tooltip pushed past the card's left edge and got cut
       off. Portaling sidesteps the whole class of clipping problems
       since the tooltip's only ancestor is body.
       ──────────────────────────────────────────────────────────────── */
    var refractPerfTipEl = null;

    function refractEnsurePerfTip() {
        if (refractPerfTipEl && document.contains(refractPerfTipEl)) {
            return refractPerfTipEl;
        }
        refractPerfTipEl = document.createElement("div");
        refractPerfTipEl.className = "refract-performer-name-tooltip-portal";
        refractPerfTipEl.setAttribute("aria-hidden", "true");
        document.body.appendChild(refractPerfTipEl);
        return refractPerfTipEl;
    }

    function refractShowPerfTip(link) {
        var name = link.getAttribute("data-performer-name");
        if (!name) { return; }
        var tip = refractEnsurePerfTip();
        tip.textContent = name;
        var r = link.getBoundingClientRect();
        /* Show first so we can read offsetWidth/Height with the visible
           class's styles applied. CSS transition handles the fade. */
        tip.classList.add("refract-performer-name-tooltip-portal--show");
        var tipW = tip.offsetWidth;
        var tipH = tip.offsetHeight;
        var margin = 8;
        var left = r.left + r.width / 2 - tipW / 2;
        left = Math.max(margin, Math.min(left, window.innerWidth - tipW - margin));
        var top = r.top - tipH - 6;
        if (top < margin) { top = r.bottom + 6; } /* flip below if no room */
        tip.style.left = left + "px";
        tip.style.top = top + "px";
    }

    function refractHidePerfTip() {
        if (refractPerfTipEl) {
            refractPerfTipEl.classList.remove("refract-performer-name-tooltip-portal--show");
        }
    }

    function initPerformerNameTooltip() {
        if (!document.body || document.body._refractPerfTipInit) { return; }
        document.body._refractPerfTipInit = true;
        document.body.addEventListener("mouseover", function (e) {
            var link = e.target.closest && e.target.closest(".stash-performer-link[data-performer-name]");
            if (!link) { return; }
            if (e.relatedTarget && link.contains(e.relatedTarget)) { return; }
            refractShowPerfTip(link);
        });
        document.body.addEventListener("mouseout", function (e) {
            var link = e.target.closest && e.target.closest(".stash-performer-link[data-performer-name]");
            if (!link) { return; }
            if (e.relatedTarget && link.contains(e.relatedTarget)) { return; }
            refractHidePerfTip();
        });
        /* Hide on scroll — tooltip is fixed-positioned so it would
           drift away from its anchor as the page scrolls. */
        window.addEventListener("scroll", function () {
            if (refractPerfTipEl && refractPerfTipEl.classList.contains("refract-performer-name-tooltip-portal--show")) {
                refractHidePerfTip();
            }
        }, { passive: true, capture: true });
    }

    function refractEnsureTagTip() {
        if (refractTagTipEl && document.contains(refractTagTipEl)) {
            return refractTagTipEl;
        }
        refractTagTipEl = document.createElement("div");
        refractTagTipEl.className = "refract-tag-tooltip-portal";
        refractTagTipEl.setAttribute("aria-hidden", "true");
        document.body.appendChild(refractTagTipEl);
        return refractTagTipEl;
    }

    function refractPositionTagTip(tip, anchorX, anchorY) {
        var tipW = 240;
        var cursorOffset = 14;
        var margin = 8;
        var left = anchorX - tipW / 2;
        left = Math.max(margin, Math.min(left, window.innerWidth - tipW - margin));
        tip.style.left = left + "px";
        var tipH = tip.offsetHeight;
        var spaceAbove = anchorY;
        var spaceBelow = window.innerHeight - anchorY;
        var top;
        if (spaceAbove >= tipH + cursorOffset + margin || spaceAbove > spaceBelow) {
            top = anchorY - tipH - cursorOffset;
        } else {
            top = anchorY + cursorOffset;
        }
        top = Math.max(margin, Math.min(top, window.innerHeight - tipH - margin));
        tip.style.top = top + "px";
    }

    function refractShowTagTip(btn, anchorX, anchorY) {
        var id = btn.getAttribute("data-tag-id");
        if (!id) { return; }
        var tag = refractTagEditorState.tagsById && refractTagEditorState.tagsById.get(id);
        if (!tag) { return; }
        var hasImg = !!tag.imagePath;
        var hasDesc = !!(tag.description && tag.description.trim());
        /* If there's nothing to show beyond the name (which the button
           already displays), don't bother with a tooltip. */
        if (!hasImg && !hasDesc) { return; }

        var tip = refractEnsureTagTip();
        tip.innerHTML =
            (hasImg ? '<img class="refract-tag-tooltip__img" src="' + escapeHtml(tag.imagePath) + '" alt="">' : '') +
            '<div class="refract-tag-tooltip__body">' +
                '<div class="refract-tag-tooltip__name">' + escapeHtml(tag.name) + '</div>' +
                (hasDesc ? '<div class="refract-tag-tooltip__desc">' + escapeHtml(tag.description) + '</div>' : '') +
            '</div>';

        /* Show so the layout settles, position once, then re-position
           after the image loads in case content height changes (slow
           networks, late-arriving image dimensions). */
        tip.classList.add("refract-tag-tooltip-portal--show");
        refractPositionTagTip(tip, anchorX, anchorY);
        var img = tip.querySelector(".refract-tag-tooltip__img");
        if (img && !img.complete) {
            img.addEventListener("load", function () {
                if (tip.classList.contains("refract-tag-tooltip-portal--show")) {
                    refractPositionTagTip(tip, anchorX, anchorY);
                }
            }, { once: true });
        }
    }

    function refractHideTagTip() {
        if (refractTagTipTimer) {
            clearTimeout(refractTagTipTimer);
            refractTagTipTimer = null;
        }
        if (refractTagTipEl) {
            refractTagTipEl.classList.remove("refract-tag-tooltip-portal--show");
        }
    }

    function refractWireTagEditorEvents(pane) {
        /* Delegate hover via mouseover / mouseout with relatedTarget
           checks (mouseenter / mouseleave don't bubble). 400ms dwell
           before showing so quick scans don't flash the tooltip. */
        pane.addEventListener("mouseover", function (e) {
            var btn = e.target.closest && e.target.closest(".refract-tag-editor__tag");
            if (!btn) { return; }
            var related = e.relatedTarget;
            if (related && btn.contains(related)) { return; }
            if (refractTagTipTimer) { clearTimeout(refractTagTipTimer); }
            /* Capture cursor position now; tooltip anchors to it after
               the dwell delay (rather than chasing the cursor mid-hover). */
            var cx = e.clientX;
            var cy = e.clientY;
            refractTagTipTimer = setTimeout(function () {
                refractShowTagTip(btn, cx, cy);
            }, 400);
        });
        pane.addEventListener("mouseout", function (e) {
            var btn = e.target.closest && e.target.closest(".refract-tag-editor__tag");
            if (!btn) { return; }
            var related = e.relatedTarget;
            if (related && btn.contains(related)) { return; }
            refractHideTagTip();
        });
        /* Hide on scroll too — otherwise the tooltip would float in place
           while the button moves under it. */
        window.addEventListener("scroll", refractHideTagTip, { passive: true, capture: true });

        pane.addEventListener("input", function (e) {
            var t = e.target;
            if (t && t.classList && t.classList.contains("refract-tag-editor__search-input")) {
                refractTagEditorState.searchQuery = t.value;
                refractTagEditorState.focusSearch = true;
                refractRenderTagEditor();
            }
        });
        pane.addEventListener("click", function (e) {
            /* Tag button toggle */
            var tagBtn = e.target.closest(".refract-tag-editor__tag");
            if (tagBtn) {
                var id = tagBtn.getAttribute("data-tag-id");
                if (id) {
                    var s = refractTagEditorState.selectedTagIds;
                    if (s.has(id)) { s.delete(id); } else { s.add(id); }
                    refractRenderTagEditor();
                }
                return;
            }
            /* Subgroup header click — anywhere on the header toggles
               the section (excluding the static "General"/"Tags"
               root pseudo-headers). */
            var sgHeader = e.target.closest(".refract-tag-editor__subgroup-header");
            if (sgHeader && !sgHeader.classList.contains("refract-tag-editor__subgroup-header--static")) {
                var sgSection = sgHeader.closest(".refract-tag-editor__subgroup");
                var sgId = sgSection && sgSection.getAttribute("data-subgroup-id");
                if (sgId) {
                    var os = refractTagEditorState.openSubgroups;
                    if (os.has(sgId)) { os.delete(sgId); } else { os.add(sgId); }
                    refractRenderTagEditor();
                }
                return;
            }
            /* Group header click — anywhere on the header toggles. */
            var gHeader = e.target.closest(".refract-tag-editor__group-header");
            if (gHeader) {
                var gSection = gHeader.closest(".refract-tag-editor__group");
                var gId = gSection && gSection.getAttribute("data-group-id");
                if (gId) {
                    var og = refractTagEditorState.openGroups;
                    if (og.has(gId)) { og.delete(gId); } else { og.add(gId); }
                    refractRenderTagEditor();
                }
                return;
            }
            /* Save / Discard */
            if (e.target.closest(".refract-tag-editor__save")) {
                refractSaveTagEditor();
                return;
            }
            if (e.target.closest(".refract-tag-editor__discard")) {
                refractTagEditorState.selectedTagIds = new Set(
                    refractTagEditorState.originalTagIds.map(String)
                );
                refractRenderTagEditor();
                return;
            }
        });
    }

    function refractLoadTagEditorData(pid) {
        if (refractTagEditorState.loaded || refractTagEditorState.loading) return;
        refractTagEditorState.loading = true;
        refractRenderTagEditor();
        var perfQ =
            'query FindPerformerForTagEditor($id: ID!) {' +
            '  findPerformer(id: $id) { id tags { id name } }' +
            '}';
        var tagsQ =
            'query FindAllTagsForTagEditor {' +
            '  findTags(filter: { per_page: -1, sort: "name", direction: ASC }) {' +
            '    tags { id name sort_name description image_path parents { id name } children { id } }' +
            '  }' +
            '}';
        Promise.all([
            gqlWithVars(perfQ, { id: pid }),
            gql(tagsQ),
        ]).then(function (results) {
            var pdata = results[0] && results[0].data && results[0].data.findPerformer;
            var tdata = results[1] && results[1].data && results[1].data.findTags;
            if (!pdata || !tdata) throw new Error("Bad GraphQL response");
            var ids = (pdata.tags || []).map(function (t) { return String(t.id); });
            refractTagEditorState.originalTagIds = ids.slice();
            refractTagEditorState.selectedTagIds = new Set(ids);
            refractTagEditorState.allTags = (tdata.tags || []).map(function (t) {
                return {
                    id: String(t.id),
                    name: t.name || "",
                    sort_name: t.sort_name || t.name || "",
                    description: t.description || "",
                    imagePath: t.image_path || "",
                    parents: (t.parents || []).map(function (p) {
                        return { id: String(p.id), name: p.name || "" };
                    }),
                    childrenIds: (t.children || []).map(function (c) { return String(c.id); }),
                };
            });
            refractTagEditorState.tagsById = new Map(
                refractTagEditorState.allTags.map(function (t) { return [t.id, t]; })
            );
            refractBuildTagHierarchy();
            refractTagEditorState.loaded = true;
            refractTagEditorState.loading = false;
            refractRenderTagEditor();
        }).catch(function () {
            refractTagEditorState.loading = false;
            refractRenderTagEditor();
        });
    }

    function refractBuildTagHierarchy() {
        var s = refractTagEditorState;
        var byId = s.tagsById;
        var rootGroups = [];
        var ungrouped = [];

        /* Reverse-map: parent_id -> [child tag ids] from each tag's parents[] */
        var childrenByParent = new Map();
        s.allTags.forEach(function (t) {
            t.parents.forEach(function (p) {
                if (!childrenByParent.has(p.id)) childrenByParent.set(p.id, []);
                childrenByParent.get(p.id).push(t.id);
            });
        });

        s.allTags.forEach(function (t) {
            if (t.parents.length !== 0) return;
            var childIds = childrenByParent.get(t.id) || [];
            if (childIds.length === 0) {
                ungrouped.push(t);
                return;
            }
            var subgroups = [];
            var generalLeaves = [];
            childIds.forEach(function (cid) {
                var c = byId.get(cid);
                if (!c) return;
                var subChildIds = childrenByParent.get(c.id) || [];
                if (subChildIds.length > 0) {
                    var leaves = subChildIds
                        .map(function (lid) { return byId.get(lid); })
                        .filter(Boolean)
                        .sort(function (a, b) { return a.sort_name.localeCompare(b.sort_name); });
                    subgroups.push({
                        id: c.id,
                        name: c.name,
                        sort_name: c.sort_name,
                        leaves: leaves,
                    });
                } else {
                    generalLeaves.push(c);
                }
            });
            subgroups.sort(function (a, b) { return a.sort_name.localeCompare(b.sort_name); });
            if (generalLeaves.length > 0) {
                generalLeaves.sort(function (a, b) { return a.sort_name.localeCompare(b.sort_name); });
                subgroups.unshift({
                    id: null,
                    name: "General",
                    sort_name: "",
                    isRoot: true,
                    leaves: generalLeaves,
                });
            }
            rootGroups.push({
                id: t.id,
                name: t.name,
                sort_name: t.sort_name,
                subgroups: subgroups,
            });
        });

        rootGroups.sort(function (a, b) { return a.sort_name.localeCompare(b.sort_name); });

        if (ungrouped.length > 0) {
            ungrouped.sort(function (a, b) { return a.sort_name.localeCompare(b.sort_name); });
            rootGroups.push({
                id: "__ungrouped__",
                name: "Ungrouped",
                sort_name: "￿",
                subgroups: [{
                    id: null,
                    name: "Tags",
                    isRoot: true,
                    leaves: ungrouped,
                }],
            });
        }

        s.rootGroups = rootGroups;
    }

    function refractSaveTagEditor() {
        var pid = refractTagEditorState.performerId;
        if (!pid || refractTagEditorState.saving) return;
        refractTagEditorState.saving = true;
        refractRenderTagEditor();
        var mut =
            'mutation UpdatePerformerTags($input: PerformerUpdateInput!) {' +
            '  performerUpdate(input: $input) { id tags { id } }' +
            '}';
        gqlWithVars(mut, {
            input: { id: pid, tag_ids: Array.from(refractTagEditorState.selectedTagIds) }
        }).then(function (res) {
            if (res && res.errors && res.errors.length) {
                throw new Error(res.errors[0].message);
            }
            refractTagEditorState.originalTagIds = Array.from(refractTagEditorState.selectedTagIds);
            refractTagEditorState.saving = false;
            refractRenderTagEditor();
        }).catch(function () {
            refractTagEditorState.saving = false;
            refractRenderTagEditor();
        });
    }

    function refractIsTagEditorDirty() {
        var orig = refractTagEditorState.originalTagIds.map(String).sort().join(",");
        var sel = Array.from(refractTagEditorState.selectedTagIds).map(String).sort().join(",");
        return orig !== sel;
    }

    function refractCountSelectedInSubgroup(sub) {
        var sel = refractTagEditorState.selectedTagIds;
        var n = 0;
        for (var i = 0; i < sub.leaves.length; i++) {
            if (sel.has(sub.leaves[i].id)) n++;
        }
        return n;
    }

    function refractCountSelectedInGroup(group) {
        var n = 0;
        for (var i = 0; i < group.subgroups.length; i++) {
            n += refractCountSelectedInSubgroup(group.subgroups[i]);
        }
        return n;
    }

    function refractRenderTagEditor() {
        var root = document.querySelector(".refract-tag-editor-pane .refract-tag-editor");
        if (!root) return;
        var s = refractTagEditorState;

        if (s.loading && !s.loaded) {
            root.innerHTML = '<div class="refract-tag-editor__status">Loading tag library…</div>';
            return;
        }
        if (!s.loaded && !s.loading) {
            root.innerHTML = '<div class="refract-tag-editor__status">Select the tab to load tags.</div>';
            return;
        }

        var dirty = refractIsTagEditorDirty();
        var q = (s.searchQuery || "").trim().toLowerCase();
        var totalSelected = s.selectedTagIds.size;

        function leafMatches(t) { return !q || t.name.toLowerCase().indexOf(q) !== -1; }

        var groupsHtml = s.rootGroups.map(function (group) {
            var subgroupsHtml = group.subgroups.map(function (sub) {
                var visibleLeaves = sub.leaves.filter(leafMatches);
                if (q && visibleLeaves.length === 0) return null;
                var subgroupOpen = sub.isRoot || !!q || (sub.id && s.openSubgroups.has(sub.id));
                var subSelected = refractCountSelectedInSubgroup(sub);
                var leavesHtml = visibleLeaves.map(function (t) {
                    var sel = s.selectedTagIds.has(t.id);
                    /* Tooltip content lives in a body-portaled element
                       managed by refractWireTagEditorEvents; the button
                       just carries the tag-id so hover handlers can look
                       up image/description from refractTagEditorState. */
                    return '<button type="button" class="refract-tag-editor__tag' +
                        (sel ? ' is-selected' : '') + '" ' +
                        'data-tag-id="' + escapeHtml(t.id) + '" ' +
                        'aria-pressed="' + (sel ? 'true' : 'false') + '">' +
                        '<span class="refract-tag-editor__tag-label">' + escapeHtml(t.name) + '</span>' +
                        '</button>';
                }).join("");
                var headerHtml;
                if (sub.isRoot) {
                    headerHtml =
                        '<div class="refract-tag-editor__subgroup-header refract-tag-editor__subgroup-header--static">' +
                            '<span class="refract-tag-editor__subgroup-title">' + escapeHtml(sub.name) + '</span>' +
                        '</div>';
                } else {
                    headerHtml =
                        '<div class="refract-tag-editor__subgroup-header">' +
                            '<div class="refract-tag-editor__subgroup-header-main">' +
                                '<span class="refract-tag-editor__subgroup-title">' + escapeHtml(sub.name) + '</span>' +
                                '<span class="refract-tag-editor__subgroup-meta">' +
                                    '<span class="refract-tag-editor__subgroup-total">' + sub.leaves.length + '</span>' +
                                    '<span class="refract-tag-editor__subgroup-selected">' +
                                        (subSelected > 0 ? (subSelected + ' selected') : '') +
                                    '</span>' +
                                '</span>' +
                            '</div>' +
                            '<button type="button" class="refract-tag-editor__subgroup-toggle" aria-label="Toggle">' +
                                '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" ' +
                                'stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
                                '<polyline points="6 9 12 15 18 9"/></svg>' +
                            '</button>' +
                        '</div>';
                }
                return '<section class="refract-tag-editor__subgroup' +
                    (subgroupOpen ? ' is-open' : '') +
                    (sub.isRoot ? ' refract-tag-editor__subgroup--root' : '') + '"' +
                    (sub.id ? ' data-subgroup-id="' + escapeHtml(sub.id) + '"' : '') + '>' +
                    headerHtml +
                    '<div class="refract-tag-editor__subgroup-body">' +
                        '<div class="refract-tag-editor__leaf-wrap">' + leavesHtml + '</div>' +
                    '</div>' +
                    '</section>';
            }).filter(Boolean).join("");

            if (q && !subgroupsHtml) return null;

            var groupOpen = !!q || s.openGroups.has(group.id);
            var groupSelected = refractCountSelectedInGroup(group);
            var groupTotal = group.subgroups.reduce(function (sum, sub) {
                return sum + sub.leaves.length;
            }, 0);

            return '<section class="refract-tag-editor__group' + (groupOpen ? ' is-open' : '') + '" ' +
                'data-group-id="' + escapeHtml(group.id) + '">' +
                '<div class="refract-tag-editor__group-header">' +
                    '<div class="refract-tag-editor__group-header-main">' +
                        '<span class="refract-tag-editor__group-title">' + escapeHtml(group.name) + '</span>' +
                        '<span class="refract-tag-editor__group-meta">' +
                            '<span class="refract-tag-editor__group-total">' + groupTotal + '</span>' +
                            '<span class="refract-tag-editor__group-selected">' +
                                (groupSelected > 0 ? (groupSelected + ' selected') : '') +
                            '</span>' +
                        '</span>' +
                    '</div>' +
                    '<button type="button" class="refract-tag-editor__group-toggle" aria-label="Toggle">' +
                        '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" ' +
                        'stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
                        '<polyline points="6 9 12 15 18 9"/></svg>' +
                    '</button>' +
                '</div>' +
                '<div class="refract-tag-editor__group-body">' +
                    '<div class="refract-tag-editor__subgroup-grid">' + subgroupsHtml + '</div>' +
                '</div>' +
                '</section>';
        }).filter(Boolean).join("");

        if (!groupsHtml) {
            groupsHtml = '<div class="refract-tag-editor__status">' +
                (q ? 'No tags match "' + escapeHtml(s.searchQuery) + '".' : 'No tags found.') +
                '</div>';
        }

        root.innerHTML =
            '<header class="refract-tag-editor__header">' +
                '<div class="refract-tag-editor__title-wrap">' +
                    '<h6 class="refract-tag-editor__title">Tags</h6>' +
                    '<span class="refract-tag-editor__summary">' +
                        s.rootGroups.length + ' groups · ' + totalSelected + ' selected' +
                    '</span>' +
                '</div>' +
                '<div class="refract-tag-editor__actions">' +
                    '<button type="button" class="refract-tag-editor__discard"' +
                        (dirty ? '' : ' disabled') + '>Discard</button>' +
                    '<button type="button" class="refract-tag-editor__save btn btn-primary"' +
                        (dirty && !s.saving ? '' : ' disabled') + '>' +
                        (s.saving ? 'Saving…' : 'Save') +
                    '</button>' +
                '</div>' +
            '</header>' +
            '<div class="refract-tag-editor__search">' +
                '<svg class="refract-tag-editor__search-icon" viewBox="0 0 24 24" width="14" height="14" ' +
                'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
                'stroke-linejoin="round" aria-hidden="true">' +
                '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
                '<input type="text" class="refract-tag-editor__search-input" placeholder="Search tags…" ' +
                'value="' + escapeHtml(s.searchQuery || "") + '" autocomplete="off" />' +
            '</div>' +
            '<div class="refract-tag-editor__groups">' + groupsHtml + '</div>';

        if (s.focusSearch) {
            var input = root.querySelector(".refract-tag-editor__search-input");
            if (input) {
                input.focus();
                try { input.setSelectionRange(input.value.length, input.value.length); } catch (_) {}
            }
            s.focusSearch = false;
        }
    }

    /* When user clicks a native performer tab, deactivate ours. Native
       tab <a> elements carry ids like performer-tabs-tab-scenes. */
    document.addEventListener("click", function (e) {
        if (!e.target.closest) return;
        var a = e.target.closest('[id^="performer-tabs-tab-"]:not(.refract-tag-editor-tab)');
        if (!a) return;
        refractDeactivateTagEditor();
    }, true);

    /* Suppress the auto-scroll that happens when a performer tab is
       activated: React-Bootstrap/Stash scrolls the new pane into view,
       which yanks the tab strip itself off the top of the viewport.
       We snapshot the scroll position synchronously on click and
       restore it for two frames afterwards (one frame is often too
       early — the focus-induced scroll fires on the next layout). */
    document.addEventListener("click", function (e) {
        if (!e.target.closest) return;
        var tab = e.target.closest(".performer-tabs .nav-tabs .nav-link");
        if (!tab) return;
        var x = window.scrollX, y = window.scrollY;
        requestAnimationFrame(function () {
            window.scrollTo(x, y);
            requestAnimationFrame(function () { window.scrollTo(x, y); });
        });
    }, true);

    /* ── Scene player center overlay ─────────────────────────────────────
       Inject back-10 / play-pause / forward-10 buttons centered over the
       video. Click handlers proxy to the corresponding (hidden) VideoJS
       buttons so we don't depend on the player API surface. */
    var SVG_BACK_10 =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7"/><polyline points="3 4 3 9 8 9"/></svg>';
    var SVG_FWD_10 =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7"/><polyline points="21 4 21 9 16 9"/></svg>';
    var SVG_PLAY = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7L8 5z"/></svg>';
    var SVG_PAUSE = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6V5zm8 0h4v14h-4V5z"/></svg>';

    function injectScenePlayerOverlay() {
        document.querySelectorAll(".scene-player-container").forEach(function (container) {
            if (container.querySelector(".st-player-overlay")) return;
            var videojs = container.querySelector(".video-js");
            if (!videojs) return;

            var overlay = document.createElement("div");
            overlay.className = "st-player-overlay";
            overlay.innerHTML =
                '<div class="st-player-center">' +
                    '<button type="button" class="st-overlay-btn st-overlay-back" aria-label="Back 10 seconds" tabindex="-1">' + SVG_BACK_10 + '</button>' +
                    '<button type="button" class="st-overlay-btn st-overlay-play" aria-label="Play / Pause" tabindex="-1">' + SVG_PLAY + '</button>' +
                    '<button type="button" class="st-overlay-btn st-overlay-forward" aria-label="Forward 10 seconds" tabindex="-1">' + SVG_FWD_10 + '</button>' +
                '</div>';
            videojs.appendChild(overlay);

            var playBtn = videojs.querySelector(".vjs-play-control");
            var backBtn = videojs.querySelector(".vjs-seek-button.skip-back");
            var fwdBtn = videojs.querySelector(".vjs-seek-button.skip-forward");

            var ovBack = overlay.querySelector(".st-overlay-back");
            var ovPlay = overlay.querySelector(".st-overlay-play");
            var ovFwd = overlay.querySelector(".st-overlay-forward");

            function proxy(target) {
                return function (e) {
                    e.stopPropagation();
                    e.preventDefault();
                    if (target) target.click();
                };
            }
            if (ovBack && backBtn) ovBack.addEventListener("click", proxy(backBtn));
            if (ovFwd && fwdBtn) ovFwd.addEventListener("click", proxy(fwdBtn));
            if (ovPlay && playBtn) ovPlay.addEventListener("click", proxy(playBtn));

            /* Sync the overlay play/pause icon with VideoJS state.
               Use the affirmative `.vjs-playing` class so the default
               (no class set yet, e.g. before the player initialises)
               shows the play icon — checking `.vjs-paused` instead made
               the icon flip to pause on initial load before the paused
               class had been applied. */
            function syncPlayIcon() {
                if (!playBtn || !ovPlay) return;
                var playing = playBtn.classList.contains("vjs-playing");
                ovPlay.innerHTML = playing ? SVG_PAUSE : SVG_PLAY;
            }
            syncPlayIcon();
            if (playBtn) {
                new MutationObserver(syncPlayIcon).observe(playBtn, {
                    attributes: true,
                    attributeFilter: ["class"]
                });
            }
        });
    }

    /* Inject prev/next chevron buttons that horizontally scroll the
       .scene-performers row. The row is restyled (flex-wrap:nowrap +
       overflow-x:auto) via CSS so cards stay on one line. Chevrons hide
       themselves at the start/end of the scroll range and when no scroll
       is possible (e.g. only one performer). Idempotent. */
    function injectPerformerCarouselChevrons() {
        if (!/^\/scenes\/[^/]/.test(refractPathFromLocation())) return;
        document.querySelectorAll(".scene-performers-row:not([data-stash-perf-arrows])").forEach(function (wrap) {
            /* Sidebar wrappers use the adaptive setupSceneTabsPerformers()
               instead — no chevrons there, dots + keyboard nav. */
            if (wrap.closest(".scene-tabs")) return;
            var row = wrap.querySelector(".scene-performers");
            if (!row) { return; }
            wrap.setAttribute("data-stash-perf-arrows", "1");
            var prev = document.createElement("button");
            prev.type = "button";
            prev.className = "stash-perf-prev";
            prev.setAttribute("aria-label", "Previous performers");
            var next = document.createElement("button");
            next.type = "button";
            next.className = "stash-perf-next";
            next.setAttribute("aria-label", "Next performers");
            function scrollPerf(dir) {
                var card = row.querySelector(".performer-card");
                var gap = parseFloat(getComputedStyle(row).columnGap || getComputedStyle(row).gap || "12") || 12;
                var amount = card ? (card.offsetWidth + gap) : Math.max(row.clientWidth * 0.7, 200);
                row.scrollBy({ left: dir * amount, behavior: "smooth" });
            }
            function syncChevronVisibility() {
                var noScroll = row.scrollWidth <= row.clientWidth + 1;
                var atStart = row.scrollLeft <= 1;
                var atEnd = row.scrollLeft + row.clientWidth >= row.scrollWidth - 1;
                prev.style.display = (noScroll || atStart) ? "none" : "";
                next.style.display = (noScroll || atEnd) ? "none" : "";
            }
            prev.addEventListener("click", function (e) { e.preventDefault(); scrollPerf(-1); });
            next.addEventListener("click", function (e) { e.preventDefault(); scrollPerf(1); });
            wrap.appendChild(prev);
            wrap.appendChild(next);
            row.addEventListener("scroll", syncChevronVisibility, { passive: true });
            if (typeof ResizeObserver === "function") {
                var ro = new ResizeObserver(syncChevronVisibility);
                ro.observe(row);
                if (wrap.parentElement) { ro.observe(wrap.parentElement); }
            } else {
                window.addEventListener("resize", syncChevronVisibility, { passive: true });
            }
            /* React may still be inserting cards — re-sync once after a beat. */
            syncChevronVisibility();
            setTimeout(syncChevronVisibility, 200);
            setTimeout(syncChevronVisibility, 800);
        });
    }

    /* Sidebar performer carousel — count-adaptive layout.
       (1) Marks the .col-12 that directly contains .scene-performers with the
           class scene-performers-row so CSS can target it. No node is moved —
           moving a React-managed child out of its tracked parent causes a
           NotFoundError on removeChild when React reconciles after a scene save.
       (2) Counts cards, tags wrapper with data-perf-count="1|2|3|4|many".
           CSS in css/07_scene_details.css picks the layout per count.
       (3) For count >= 5: appends pagination dots, IntersectionObserver tracks
           which card is in view, scoped MutationObserver watches for card
           count changes, single delegated keydown listener for arrow keys.
       Fully idempotent — guards via class presence and wrap.__refractPerf state. */
    function setupSceneTabsPerformers() {
        /* Step 1 — mark the col-12 that contains .scene-performers as our wrapper.
           classList.add is a non-childList mutation so it does not retrigger the
           MutationObserver (which watches childList only). */
        document.querySelectorAll(".scene-tabs .tab-pane .col-12 > .scene-performers").forEach(function (el) {
            var col = el.parentElement;
            if (!col || !col.classList.contains("col-12")) return;
            if (!col.classList.contains("scene-performers-row")) {
                col.classList.add("scene-performers-row");
            }
        });

        /* Step 2-6 — apply adaptive layout per wrapper. */
        document.querySelectorAll(".scene-tabs .col-12.scene-performers-row").forEach(function (wrap) {
            applyAdaptiveLayout(wrap);
        });
    }

    function applyAdaptiveLayout(wrap) {
        var row = wrap.querySelector(".scene-performers");
        if (!row) return;
        /* Real (non-clone) cards. Clones are added BY US for infinite
           loop in count="many" mode; always count and operate on real
           cards only. */
        var realCards = row.querySelectorAll(":scope > .performer-card:not(.refract-clone)");
        var count = realCards.length;
        var state = wrap.__refractPerf || {};

        if (count === 0) {
            wrap.removeAttribute("data-perf-count");
            teardownClones(row, state);
            teardownCarouselExtras(wrap, state);
            installScopedRowObserver(wrap, row);
            return;
        }

        var bucket = count >= 5 ? "many" : String(count);
        wrap.setAttribute("data-perf-count", bucket);

        if (bucket !== "many") {
            teardownClones(row, state);
            teardownCarouselExtras(wrap, state);
            installScopedRowObserver(wrap, row);
            return;
        }

        /* count >= 5: pagination dots + IntersectionObserver + keyboard
           nav + infinite-loop clones. Cloning the first card to the end
           and last card to the start lets the user scroll past either
           edge and silently land on the equivalent real card. */

        /* Lite mode: skip the clones entirely (and tear any stale ones
           down). Native scroll-snap takes over with no silent jumps. */
        var liteOn = document.body.classList.contains("refract-lite");

        /* (Re)build loop clones if count changed or clones missing. */
        var existingClones = row.querySelectorAll(":scope > .performer-card.refract-clone").length;
        if (liteOn) {
            if (existingClones > 0) { teardownClones(row, state); }
        } else if (existingClones !== 2 || state.lastRealCount !== count) {
            teardownClones(row, state);
            var firstClone = realCards[0].cloneNode(true);
            var lastClone = realCards[count - 1].cloneNode(true);
            firstClone.classList.add("refract-clone");
            lastClone.classList.add("refract-clone");
            firstClone.setAttribute("aria-hidden", "true");
            lastClone.setAttribute("aria-hidden", "true");
            row.insertBefore(lastClone, realCards[0]);
            row.appendChild(firstClone);
            state.firstClone = firstClone;
            state.lastClone = lastClone;
            state.lastRealCount = count;
            state.initialized = false; /* re-seed initial scroll */
        }

        /* Refresh real-cards reference after clone insertion. */
        realCards = row.querySelectorAll(":scope > .performer-card:not(.refract-clone)");

        /* Rebuild dots only if count changed. */
        var existingDotCount = state.dots ? state.dots.children.length : 0;
        if (existingDotCount !== count) {
            if (state.dots && state.dots.parentNode) state.dots.parentNode.removeChild(state.dots);
            var dotsEl = document.createElement("div");
            dotsEl.className = "stash-perf-dots";
            for (var i = 0; i < count; i++) {
                var dot = document.createElement("button");
                dot.type = "button";
                dot.className = "dot";
                dot.setAttribute("aria-label", "Go to performer " + (i + 1));
                (function (idx) {
                    dot.addEventListener("click", function () {
                        var rc = row.querySelectorAll(":scope > .performer-card:not(.refract-clone)")[idx];
                        if (rc) rc.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
                    });
                })(i);
                dotsEl.appendChild(dot);
            }
            wrap.appendChild(dotsEl);
            state.dots = dotsEl;
        }

        /* (Re)wire IntersectionObserver — observes REAL cards only and
           uses their stored realIdx for dot mapping (so the active dot
           reflects the underlying performer, not a clone). */
        if (state.io) state.io.disconnect();
        state.io = new IntersectionObserver(function (entries) {
            var bestEntry = null;
            entries.forEach(function (entry) {
                if (entry.isIntersecting && (!bestEntry || entry.intersectionRatio > bestEntry.intersectionRatio)) {
                    bestEntry = entry;
                }
            });
            if (!bestEntry) return;
            var idx = parseInt(bestEntry.target.dataset.refractRealIdx, 10);
            if (isNaN(idx) || !state.dots) return;
            for (var j = 0; j < state.dots.children.length; j++) {
                state.dots.children[j].classList.toggle("active", j === idx);
            }
        }, { root: row, threshold: [0.6, 0.9] });
        realCards.forEach(function (c, idx) {
            c.dataset.refractRealIdx = String(idx);
            state.io.observe(c);
        });

        /* Initial scroll: center the first real card. The lastClone sits
           to its left so the user has visual context that there's
           something before "card 1". */
        if (!state.initialized) {
            var seedFirst = realCards[0];
            /* Wait a tick for layout to settle (offsetLeft accurate). */
            setTimeout(function () {
                if (!seedFirst.isConnected) return;
                row.scrollLeft = seedFirst.offsetLeft -
                    (row.clientWidth - seedFirst.offsetWidth) / 2;
            }, 0);
            state.initialized = true;
        }

        /* Scroll handler — silent jump when user lands on a clone.
           Hysteresis: only jump when scrollLeft is essentially AT the
           clone center (within 1px to avoid mid-scroll false positives). */
        if (state.onScroll) row.removeEventListener("scroll", state.onScroll);
        state.jumping = false;
        var jumpTimer = null;
        state.onScroll = function () {
            if (state.jumping) return;
            clearTimeout(jumpTimer);
            /* Debounce to settle-time: only act once scroll-snap finishes. */
            jumpTimer = setTimeout(function () {
                var c = state.firstClone, l = state.lastClone;
                if (!c || !l || !c.isConnected || !l.isConnected) return;
                var center = row.scrollLeft + row.clientWidth / 2;
                var firstCloneCenter = c.offsetLeft + c.offsetWidth / 2;
                var lastCloneCenter = l.offsetLeft + l.offsetWidth / 2;
                var threshold = c.offsetWidth / 3;
                var realList = row.querySelectorAll(":scope > .performer-card:not(.refract-clone)");
                var realFirst = realList[0];
                var realLast = realList[realList.length - 1];
                if (Math.abs(center - firstCloneCenter) < threshold && realFirst) {
                    /* Past the end, on firstClone → jump to real first. */
                    state.jumping = true;
                    row.scrollLeft = realFirst.offsetLeft - (row.clientWidth - realFirst.offsetWidth) / 2;
                    setTimeout(function () { state.jumping = false; }, 80);
                } else if (Math.abs(center - lastCloneCenter) < threshold && realLast) {
                    /* Before the start, on lastClone → jump to real last. */
                    state.jumping = true;
                    row.scrollLeft = realLast.offsetLeft - (row.clientWidth - realLast.offsetWidth) / 2;
                    setTimeout(function () { state.jumping = false; }, 80);
                }
            }, 120);
        };
        row.addEventListener("scroll", state.onScroll, { passive: true });

        /* Seed first dot active. */
        if (state.dots && !state.dots.querySelector(".active") && state.dots.children[0]) {
            state.dots.children[0].classList.add("active");
        }

        /* Keyboard arrows — wrap around at boundaries. */
        if (state.onKey) document.removeEventListener("keydown", state.onKey);
        state.onKey = function (e) {
            if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
            if (!wrap.isConnected) return;
            var panel = wrap.closest(".scene-tabs");
            if (!panel) return;
            var active = document.activeElement;
            var inPanel = active && panel.contains(active);
            var hovered = panel.matches(":hover");
            if (!inPanel && !hovered) return;
            if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable)) return;
            e.preventDefault();
            var curDot = state.dots ? state.dots.querySelector(".active") : null;
            var curIdx = curDot ? Array.prototype.indexOf.call(state.dots.children, curDot) : 0;
            var n = state.dots ? state.dots.children.length : count;
            var nextIdx = e.key === "ArrowRight" ? (curIdx + 1) % n : (curIdx - 1 + n) % n;
            var rc = row.querySelectorAll(":scope > .performer-card:not(.refract-clone)")[nextIdx];
            if (rc) rc.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
        };
        document.addEventListener("keydown", state.onKey);

        wrap.__refractPerf = state;
        installScopedRowObserver(wrap, row);
    }

    function teardownClones(row, state) {
        row.querySelectorAll(":scope > .performer-card.refract-clone").forEach(function (c) {
            c.remove();
        });
        if (state) {
            state.firstClone = null;
            state.lastClone = null;
            state.lastRealCount = 0;
            state.initialized = false;
            if (state.onScroll) {
                row.removeEventListener("scroll", state.onScroll);
                state.onScroll = null;
            }
        }
    }

    function teardownCarouselExtras(wrap, state) {
        if (state.io) { state.io.disconnect(); state.io = null; }
        if (state.onKey) { document.removeEventListener("keydown", state.onKey); state.onKey = null; }
        if (state.dots && state.dots.parentNode) state.dots.parentNode.removeChild(state.dots);
        state.dots = null;
        wrap.__refractPerf = state;
    }

    function installScopedRowObserver(wrap, row) {
        var state = wrap.__refractPerf || {};
        if (state.scopedMo) return;
        var debounce = null;
        state.scopedMo = new MutationObserver(function () {
            clearTimeout(debounce);
            debounce = setTimeout(function () { applyAdaptiveLayout(wrap); }, 80);
        });
        state.scopedMo.observe(row, { childList: true, subtree: false });
        wrap.__refractPerf = state;
    }

    /* Wrap the run of `.tag-item` pills that follows the "Tags" <h6> on the
       scene-details panel into a single `.st-tag-list` container, so we
       can constrain it to a 5-row column-wrap strip with horizontal
       overflow scroll (mirrors the performer-card strip below it).
       Tag items are CLONED into the wrapper (originals hidden in-place) rather
       than moved — moving React-managed nodes causes a NotFoundError on
       removeChild when React reconciles after a scene save. Rebuild is
       triggered whenever any tag-item in the col lacks data-sth-tag-origin,
       meaning React has re-rendered fresh nodes. */
    function wrapSceneTagList() {
        document.querySelectorAll(".scene-tabs .tab-pane .col-12").forEach(function (col) {
            var headings = col.querySelectorAll(":scope > h6");
            var tagsHeading = null;
            for (var i = 0; i < headings.length; i++) {
                if (headings[i].textContent.trim().toLowerCase().indexOf("tag") === 0) {
                    tagsHeading = headings[i];
                    break;
                }
            }
            if (!tagsHeading) return;
            var node = tagsHeading.nextElementSibling;
            var tagNodes = [];
            while (node && node.tagName !== "H6") {
                if (node.classList && node.classList.contains("tag-item")) {
                    tagNodes.push(node);
                }
                node = node.nextElementSibling;
            }
            if (tagNodes.length === 0) return;
            /* Only rebuild when React has inserted fresh (unmarked) tag nodes.
               This prevents infinite loops from our own DOM insertions. */
            var needsRebuild = tagNodes.some(function (t) { return !t.dataset.sthTagOrigin; });
            if (!needsRebuild) return;
            var existing = col.querySelector(":scope > .st-tag-list");
            if (existing) { existing.remove(); }
            var wrapper = document.createElement("div");
            wrapper.className = "st-tag-list";
            tagsHeading.insertAdjacentElement("afterend", wrapper);
            /* Mark originals and hide them in-place so React can removeChild
               them normally (parent unchanged). Clone into wrapper for display.
               IMPORTANT: clone BEFORE modifying the original — cloneNode(true)
               copies inline styles and dataset, so cloning after hiding would
               give us invisible clones too. */
            tagNodes.forEach(function (t) {
                var clone = t.cloneNode(true);
                t.setAttribute("data-sth-tag-origin", "1");
                t.style.setProperty("display", "none", "important");
                wrapper.appendChild(clone);
            });
        });
    }

    /* ── Gallery image card: click image → open lightbox ─────────────
       Stash's native hover-revealed lightbox-trigger icon is hidden by
       theme card styling on these builds. Route the image click to
       whichever underlying trigger Stash renders for that card. */
    function findImageLightboxTrigger(card) {
        /* querySelector matches by document order, not selector order — so we
           query for the most specific actual <button> first, then fall back
           to wrapper elements. Otherwise the wrapping DIV.preview-button is
           returned instead of the BUTTON inside (the latter has the React
           click handler that opens the lightbox). */
        return card.querySelector(".preview-button button") ||
               card.querySelector(".image-card-preview .btn-primary") ||
               card.querySelector(".card-popovers button") ||
               card.querySelector(".zoom-link, .preview-link") ||
               card.querySelector("button[title*='preview' i], button[aria-label*='preview' i], button[title*='zoom' i]") ||
               card.querySelector("a[title*='preview' i]");
    }

    /* Delegated handler — one body-level click listener catches every
       .image-card image click regardless of when React re-renders the
       cards. Replaces the previous per-card binding which relied on the
       MutationObserver scheduler firing in time after every re-render. */
    /* Pause-idle controls hide.
       Stash's video.js keeps controls visible whenever the video is
       paused — annoying when you want to screenshot a frame. After 2.5s
       of cursor inactivity (or mouse leaving the player), fade the
       control bar + big play button + cursor away. Any mouse motion or
       resume brings them back. */
    function initVideoIdleHide() {
        if (document.body._stashVideoIdleBound) { return; }
        document.body._stashVideoIdleBound = true;
        var IDLE_DELAY = 2500;
        var timers = new WeakMap();
        function clearIdle(c) {
            var t = timers.get(c);
            if (t) { clearTimeout(t); }
            timers.delete(c);
            c.classList.remove("refract-video-idle");
        }
        function schedule(c) {
            clearIdle(c);
            var v = c.querySelector("video");
            if (!v || !v.paused) { return; }
            timers.set(c, setTimeout(function () {
                if (v.paused && c.isConnected) { c.classList.add("refract-video-idle"); }
            }, IDLE_DELAY));
        }
        function findContainer(t) {
            return t && t.closest ? t.closest(".video-js") : null;
        }
        document.body.addEventListener("pause", function (e) {
            var c = findContainer(e.target);
            if (c) { schedule(c); }
        }, true);
        document.body.addEventListener("play", function (e) {
            var c = findContainer(e.target);
            if (c) { clearIdle(c); }
        }, true);
        document.body.addEventListener("mousemove", function (e) {
            var c = findContainer(e.target);
            if (!c) { return; }
            clearIdle(c);
            var v = c.querySelector("video");
            if (v && v.paused) { schedule(c); }
        }, { passive: true });
        /* Cursor leaving the player while paused — go idle immediately.
           IMPORTANT: capture-phase `mouseleave` fires for every
           descendant's mouseleave (it doesn't bubble, but the capture
           phase still hits ancestor listeners). So a mouse moving
           BETWEEN control-bar buttons or seek-bar segments would
           previously trigger this handler and immediately re-add
           `.refract-video-idle`, while the next micro-mousemove would
           clear it — rapid flicker, especially noticeable around the
           seekbar. Only treat it as a real player-leave when
           e.target IS the .video-js itself AND relatedTarget (where
           the cursor went next) is outside it. */
        document.body.addEventListener("mouseleave", function (e) {
            var c = findContainer(e.target);
            if (!c || e.target !== c) { return; }
            if (e.relatedTarget && c.contains(e.relatedTarget)) { return; }
            var v = c.querySelector("video");
            if (v && v.paused) {
                clearTimeout(timers.get(c));
                c.classList.add("refract-video-idle");
            }
        }, true);
    }

    function initImageCardLightbox() {
        if (document.body._stashLbDelegated) { return; }
        document.body._stashLbDelegated = true;
        document.body.addEventListener("click", function (e) {
            var img = e.target.closest && e.target.closest(".image-card img");
            if (!img) { return; }
            var card = img.closest(".image-card");
            if (!card) { return; }
            var trigger = findImageLightboxTrigger(card);
            if (!trigger) { return; }
            e.preventDefault();
            e.stopPropagation();
            trigger.click();
        }, true);
    }

    /* Rating-input typing shim.
       Stash's <input type="number" min="0" step="0.1" max="10"> is wired
       to a React controlled-value handler that re-parses every keystroke
       through the step engine, making it impossible to type multi-char
       values like "5.5" or "10" — React rewrites the value back to a
       clamped/rounded snapshot on every keypress. The shim detaches React
       while the user is typing and commits the parsed final value on
       blur / Enter / Tab:
         1. On focus, switch type to "text" so the browser stops native
            number-input validation per keystroke.
         2. Capture-phase listeners on `input` + `change` stop the events
            from propagating to React's delegated handler at document root.
         3. On blur/Enter, parse the raw text, clamp 0-10, round to step
            0.1, write back via the native value setter, and dispatch
            input + change so React picks up the FINAL value (just once). */
    /* Toggle .refract-overflow on .st-tag-list whenever it has more
       content than fits in its max-height — CSS gates the bottom fade
       mask on this class, so lists that fit cleanly don't get the
       half-faded last row. */
    function syncTagListFade() {
        document.querySelectorAll(".scene-tabs .st-tag-list").forEach(function (el) {
            var overflows = el.scrollHeight > el.clientHeight + 1;
            el.classList.toggle("refract-overflow", overflows);
        });
    }

    /* Tag .rating-number pills with `.refract-rated` when the numeric
       value in their span isn't 0/empty. We can't rely on Stash's own
       `.disabled` class to indicate "no rating" — it sometimes stays on
       the element even after a value is set. Re-runs via the body-wide
       mutation watcher so React re-renders are caught.
       Also tags `.rating-banner` (the small badge on performer cards)
       with --refract-rating and a tier class so the rating-style modes
       (intensity / tiers) can react via CSS. */
    function tagFilledRatings() {
        document.querySelectorAll(".rating-number").forEach(function (el) {
            var span = el.querySelector(":scope > span");
            var text = span ? (span.textContent || "").trim() : "";
            var hasInput = !!el.querySelector(":scope > input");
            var v = parseFloat(text);
            var rated = !hasInput && isFinite(v) && v > 0;
            el.classList.toggle("refract-rated", rated);
        });
        /* Some plugins (e.g. stash-multiview, alternate-scale displays)
           inject a SECOND `.rating-banner` element on the same card —
           often with a different value scale (5/5 stars rendered as a
           "10/10 decimal" equivalent). Iterating all banners would let
           the second banner overwrite the first's tier classes,
           promoting low-rated cards to Perfect. Track which cards
           have already been tier-classified and skip subsequent
           banners on the same card. The FIRST banner in DOM order is
           Stash's canonical overlay (inside the scene-card-link /
           performer-card image area), so we trust it. */
        var tieredCards = new WeakSet();
        document.querySelectorAll(".rating-banner").forEach(function (el) {
            var dupeCard = el.closest(".performer-card, .scene-card");
            if (dupeCard && tieredCards.has(dupeCard)) { return; }
            if (dupeCard) { tieredCards.add(dupeCard); }
            /* Read rating100 from the banner's className, not text — Stash's
               RatingBanner.tsx writes one of:
                 • `rating-100-N`   (N = trunc(rating100 / 5), 0–20)
                   used for decimal mode + 5-star half/quarter precision
                 • `rating-N`       (N = 1–5, legacy full-star precision)
               This works regardless of which rating system the user has
               configured and avoids depending on locale-formatted text. */
            var rating100 = null;
            var mCls = el.className.match(/\brating-100-(\d+)\b/);
            if (mCls) {
                /* Stash has shipped multiple `rating-100-N` formats:
                     • Old: N = floor(rating100/5), range 0-20
                     • New: N IS rating100 directly, range 0-100
                   Detect by magnitude — anything > 20 has to be the
                   new format (since the old format maxes at 20). */
                var n = parseInt(mCls[1], 10);
                rating100 = n > 20 ? Math.min(100, n) : n * 5;
            } else {
                mCls = el.className.match(/\brating-(\d+)\b/);
                if (mCls) { rating100 = Math.min(100, parseInt(mCls[1], 10) * 20); }
            }
            /* Fallback: parse the visible text in case Stash markup
               changes or a 3rd-party plugin injects a banner without
               the `rating-100-N` / `rating-N` class. Use the configured
               rating system (`body.refract-rating-system-stars`, set
               by refractFetchRatingSystem) to pick the scale —
               otherwise a decimal-mode 5/10 would be parsed as 5/5
               (Perfect) and 4.9/10 as 4.9/5 (Legendary), since the
               old `rawV <= 5 ? * 20 : * 10` heuristic always assumed
               low values meant stars. Clamp to 100 so an out-of-range
               input can't promote to a higher tier.

               Special guard: values >5 can ONLY be decimal (stars max
               is 5), so always treat them as decimal (×10) regardless
               of the body class. This makes the parser resilient to a
               stale `refract-rating-system-stars` class that might
               persist briefly after a stars→decimal switch. */
            if (rating100 === null) {
                var raw = (el.textContent || "").trim();
                var rawV = parseFloat(raw);
                if (isFinite(rawV) && rawV > 0) {
                    if (rawV > 5) {
                        rating100 = Math.min(100, rawV * 10);
                    } else {
                        var starsMode = document.body.classList.contains("refract-rating-system-stars");
                        rating100 = Math.min(100, starsMode ? rawV * 20 : rawV * 10);
                    }
                }
            }
            /* Diagnostic logging — temporary. Enable by running
               `window._refractTierDebug = true` in DevTools, then
               reload. Logs one line per scene-card rating banner so
               we can see what classes + text it has + how the parser
               interpreted it. Remove once tier classification is
               confirmed correct. */
            if (window._refractTierDebug) {
                var dbgCard = el.closest(".scene-card");
                if (dbgCard) {
                    console.log("[refract tier]",
                        "class:", el.className,
                        "text:", JSON.stringify((el.textContent || "").trim()),
                        "rating100:", rating100,
                        "v:", rating100 == null ? null : rating100 / 10,
                        "starsBodyClass:", document.body.classList.contains("refract-rating-system-stars")
                    );
                }
            }
            var v = rating100 == null ? 0 : rating100 / 10; /* 0–10 normalized */

            ["refract-tier-low", "refract-tier-mid", "refract-tier-high"]
                .forEach(function (c) { el.classList.remove(c); });
            /* Also clear any prior card-tier class on the enclosing card so
               a re-rendered banner with a new value (or no value) doesn't
               leave the old tier glow lingering. */
            var card = el.closest(".performer-card, .scene-card");
            var cardTiers = ["bronze", "silver", "gold", "diamond", "legendary", "perfect"];
            if (card) {
                cardTiers.forEach(function (t) {
                    card.classList.remove("refract-card-tier-" + t);
                });
                card.style.removeProperty("--refract-rating");
            }
            if (!rating100 || v <= 0) {
                el.style.removeProperty("--refract-rating");
                return;
            }
            el.style.setProperty("--refract-rating", String(v));
            if (v <= 3.4) { el.classList.add("refract-tier-low"); }
            else if (v <= 6.7) { el.classList.add("refract-tier-mid"); }
            else { el.classList.add("refract-tier-high"); }
            /* Card-frame tier (Bronze→Perfect). Applied in the "tiers"
               rating style (full card-frame treatment) AND in the
               "playing-card" style (drives the name-banner glow at the
               top of each performer card). The "intensity" (mono) mode
               is left untouched: just the existing banner glow that
               scales with --refract-rating. */
            var inTiersMode = document.body.classList.contains("refract-rating-style-tiers");
            var inPlayingCardMode = document.body.classList.contains("refract-rating-style-playing-card");
            if (card && (inTiersMode || inPlayingCardMode) && v >= 5) {
                var tier;
                if (v >= 10)      { tier = "perfect"; }
                else if (v >= 9.5) { tier = "legendary"; }
                else if (v >= 8.5) { tier = "diamond"; }
                else if (v >= 7.5) { tier = "gold"; }
                else if (v >= 6.5) { tier = "silver"; }
                else               { tier = "bronze"; }
                card.classList.add("refract-card-tier-" + tier);
            }
        });
    }

    function initRatingInputSelectAll() {
        if (document.body._stashRatingDelegated) { return; }
        document.body._stashRatingDelegated = true;
        var valueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype, "value"
        ).set;
        function stop(ev) { ev.stopPropagation(); }
        document.body.addEventListener("focusin", function (e) {
            var t = e.target;
            if (!t || !t.matches || !t.matches(".rating-number input")) { return; }
            if (t.dataset.refractRatingShim === "1") { return; }
            t.dataset.refractRatingShim = "1";
            var originalType = t.type;
            /* Remember the rating that was set BEFORE we cleared the
               input. If the user blurs without typing anything, we
               restore this so a stray click-and-click-away doesn't wipe
               the rating to 0.0. */
            var originalValue = t.value;
            t.type = "text";
            t.setAttribute("inputmode", "decimal");
            t.setAttribute("maxlength", "4");
            /* Last value that was a valid rating in 0-10 range. Used to
               revert any keystroke that would push it out of bounds. */
            var lastValid = "";
            function validate(ev) {
                ev.stopPropagation();
                var raw = t.value;
                /* Allow empty / partial decimals during typing. */
                if (raw === "" || raw === "." || /^\d{0,2}\.?\d{0,2}$/.test(raw)) {
                    var v = parseFloat(raw);
                    if (raw === "" || !isFinite(v) || (v >= 0 && v <= 10)) {
                        lastValid = raw;
                        return;
                    }
                }
                /* Reject — restore caret to end of last valid value. */
                t.value = lastValid;
            }
            t.addEventListener("input", validate, true);
            t.addEventListener("change", stop, true);
            function commit() {
                t.removeEventListener("input", validate, true);
                t.removeEventListener("change", stop, true);
                t.removeEventListener("blur", commit, true);
                t.removeEventListener("keydown", onKey, true);
                t.type = originalType;
                t.removeAttribute("inputmode");
                t.removeAttribute("maxlength");
                delete t.dataset.refractRatingShim;
                var raw = (t.value || "").trim();
                /* Empty / whitespace → user didn't type anything (just
                   focused then blurred). Restore the original rating
                   instead of committing 0. */
                if (raw === "") {
                    valueSetter.call(t, originalValue);
                    t.dispatchEvent(new Event("input", { bubbles: true }));
                    t.dispatchEvent(new Event("change", { bubbles: true }));
                    return;
                }
                var v = parseFloat(raw);
                if (!isFinite(v)) v = parseFloat(originalValue) || 0;
                if (v < 0) v = 0;
                if (v > 10) v = 10;
                v = Math.round(v * 10) / 10;
                valueSetter.call(t, v.toFixed(1));
                t.dispatchEvent(new Event("input", { bubbles: true }));
                t.dispatchEvent(new Event("change", { bubbles: true }));
            }
            function onKey(ev) {
                if (ev.key === "Enter" || ev.key === "Tab") {
                    ev.preventDefault();
                    t.blur();
                } else if (ev.key === "Escape") {
                    t.value = "";
                    t.blur();
                }
            }
            t.addEventListener("blur", commit, true);
            t.addEventListener("keydown", onKey, true);
            /* Clear current value + select on focus so typing replaces. */
            setTimeout(function () {
                try { t.value = ""; t.focus(); t.select(); } catch (e2) {}
            }, 10);
        });
    }

    /* Clear leftover inline style overrides from older versions of the
       theme — back when image-list toolbars were force-pinned to
       position:static and sidebars were mistakenly tagged data-stash-filter.
       Image lists now use the same sticky pill design as everywhere else. */
    function unstickyGalleryToolbar() {
        document.querySelectorAll(".image-list .filtered-list-toolbar").forEach(function (el) {
            ["position", "top", "bottom", "margin-left", "margin-right", "width", "max-width"].forEach(function (p) {
                el.style.removeProperty(p);
            });
        });
        document.querySelectorAll(".sidebar[data-stash-filter]").forEach(function (el) {
            el.removeAttribute("data-stash-filter");
            ["position", "top", "bottom", "margin-left", "margin-right", "width", "max-width"].forEach(function (p) {
                el.style.removeProperty(p);
            });
        });
    }

    /* Operation-menu modal — when the 3-dots #operation-menu button is
       clicked, we intercept BEFORE Bootstrap opens its dropdown and
       instead render a custom overlay panel centered in the details
       panel. The native dropdown's items are cloned (preserving their
       original click handlers via proxy clicks) so all operations stay
       functional. Bypasses Popper entirely. */
    function buildOperationMenuOverlay(items) {
        var existing = document.querySelector(".st-op-menu-overlay");
        if (existing) { existing.remove(); }
        var overlay = document.createElement("div");
        overlay.className = "st-op-menu-overlay";
        var card = document.createElement("div");
        card.className = "st-op-menu-card";
        items.forEach(function (origItem) {
            var btn = document.createElement("button");
            btn.type = "button";
            btn.className = "st-op-menu-item";
            btn.textContent = origItem.textContent.trim();
            btn.addEventListener("click", function (e) {
                e.preventDefault();
                e.stopPropagation();
                origItem.click();
                closeOperationMenuOverlay();
            });
            card.appendChild(btn);
        });
        overlay.appendChild(card);
        overlay.addEventListener("click", function (e) {
            if (e.target === overlay) { closeOperationMenuOverlay(); }
        });
        return overlay;
    }
    function closeOperationMenuOverlay() {
        var existing = document.querySelector(".st-op-menu-overlay");
        if (existing) { existing.remove(); }
        document.removeEventListener("keydown", onOperationMenuEsc);
    }
    function onOperationMenuEsc(e) {
        if (e.key === "Escape") { closeOperationMenuOverlay(); }
    }
    function dismissNativeOperationDropdown(btn) {
        /* Tell Bootstrap to close: clear .show and aria-expanded on
           wrapper + button + menu, in case it re-renders. */
        var dropdownWrap = btn && btn.parentElement;
        if (dropdownWrap) { dropdownWrap.classList.remove("show"); }
        if (btn) { btn.setAttribute("aria-expanded", "false"); }
        var menu = dropdownWrap && dropdownWrap.querySelector(".dropdown-menu.show");
        if (menu) { menu.classList.remove("show"); }
    }
    function initOperationMenuOverlay() {
        if (document.body._stashOpMenuBound) { return; }
        document.body._stashOpMenuBound = true;
        document.body.addEventListener("click", function (e) {
            var btn = e.target.closest && e.target.closest("#operation-menu");
            if (!btn) { return; }
            /* Don't intercept — let Bootstrap open the dropdown first so the
               .dropdown-menu element actually renders. Then capture it. */
            var panel = document.querySelector(".scene-tabs, .gallery-tabs");
            if (!panel) { return; }
            /* If overlay is already open, dismiss and stop. */
            if (panel.querySelector(".st-op-menu-overlay")) {
                closeOperationMenuOverlay();
                dismissNativeOperationDropdown(btn);
                return;
            }
            /* Wait for Bootstrap to render the menu, then steal items. */
            setTimeout(function () {
                var nativeMenu = document.querySelector('.dropdown-menu.show[aria-labelledby="operation-menu"]');
                if (!nativeMenu) { return; }
                var items = Array.from(nativeMenu.querySelectorAll(".dropdown-item, a, button"));
                if (!items.length) { return; }
                /* Hide the native menu — our overlay is the visible UI now. */
                nativeMenu.style.setProperty("display", "none", "important");
                var overlay = buildOperationMenuOverlay(items);
                /* Override the default close handler so dismissing the
                   overlay also tells Bootstrap the dropdown is closed. */
                overlay.addEventListener("click", function (ev) {
                    if (ev.target === overlay) {
                        closeOperationMenuOverlay();
                        dismissNativeOperationDropdown(btn);
                    }
                });
                panel.appendChild(overlay);
                document.addEventListener("keydown", onOperationMenuEsc);
            }, 0);
        }, false);
    }

    function applyScenePlayerFixes() {
        injectScenePlayerOverlay();
        setupSceneTabsPerformers();
        wrapSceneTagList();
        initImageCardLightbox();
        initRatingInputSelectAll();
        tagFilledRatings();
        syncTagListFade();
        stripSceneFileExtensions();
        initVideoIdleHide();
        unstickyGalleryToolbar();
        initOperationMenuOverlay();
        injectPerformerCarouselChevrons();
    }

    applyScenePlayerFixes(); /* initial pass; re-runs via consolidated watcher */

    // Replace home-page "View All" anchor text with an empty content so CSS can
    // overlay a chevron via ::after without fighting other rules' specificity.
    // Re-runs on mutation so React rehydration doesn't restore the text.
    function tagViewAllLinks() {
        if (refractPathFromLocation() !== "/") return;
        var anchors = document.querySelectorAll("a");
        for (var i = 0; i < anchors.length; i++) {
            var a = anchors[i];
            var text = (a.textContent || "").trim();
            if (a.dataset.stViewAll === "1") {
                if (text === "View All") { a.textContent = ""; }
                continue;
            }
            if (text !== "View All") continue;
            a.dataset.stViewAll = "1";
            a.classList.add("st-view-all");
            if (!a.getAttribute("title")) a.setAttribute("title", "View All");
            a.textContent = "";
        }
    }
    tagViewAllLinks(); /* initial pass; re-runs via consolidated watcher */

    // Lightbox consolidation: move the page indicator + header buttons (gear,
    // slideshow, fullscreen, close) from the top header bar into the bottom
    // footer so the lightbox shows ONE floating glass bar instead of two.
    // CSS hides the now-empty .Lightbox-header.
    function consolidateLightbox() {
        /* DOM-MOVING consolidation is DISABLED — moving header content
           into footer breaks Stash's React lightbox during scroll-wheel
           zoom on Chromium/Windows (page goes blank, requires reload).
           Instead this function only sets up a one-way text bridge: read
           the image count from the header indicator's <b>, mirror it as
           a muted line below the filename in the footer center. CSS
           hides the original indicator. Stash's React DOM is never
           mutated. */
        var lightbox = document.querySelector(".Lightbox");
        if (!lightbox) { return; }
        var indicator = lightbox.querySelector(".Lightbox-header-indicator");
        var footerCenter = lightbox.querySelector(".Lightbox-footer-center");
        if (!indicator || !footerCenter) { return; }

        var mirror = footerCenter.querySelector(".refract-lb-count");
        if (!mirror) {
            mirror = document.createElement("div");
            mirror.className = "refract-lb-count";
            footerCenter.appendChild(mirror);
        }
        function sync() {
            var b = indicator.querySelector("b");
            mirror.textContent = b ? (b.textContent || "").trim() : "";
        }
        sync();
        if (!indicator.__refractCountObs) {
            var obs = new MutationObserver(sync);
            obs.observe(indicator, { childList: true, subtree: true, characterData: true });
            indicator.__refractCountObs = obs;
        }
    }
    consolidateLightbox(); /* initial pass — bridge runs idempotently */

    // Scene header studio name: Stash renders only the studio logo as an
    // <img> inside <h1.studio-logo><a><img alt="…"></a></h1>; the visible
    // studio name lives only in the alt attribute. Theme CSS hides the
    // image, so without intervention nothing shows. Inject a sibling
    // <span class="st-studio-name"> alongside the image carrying the alt
    // text, so it becomes visible (CSS styles it like a label).
    /* Remove orphan .gs-trigger buttons left over from an earlier
       JS-relocation experiment that competed with React reconciliation.
       Idempotent — only deletes buttons that were detached from the
       React tree (no React fiber, no parent navbar-nav).
       After the JS approach was abandoned, leftover DOM may stick
       around once on the user's open tab; this cleans it up.
       Future React renders no longer produce orphans. */
    function cleanupOrphanGsTriggers() {
        document.querySelectorAll("nav.top-nav > .gs-trigger").forEach(function (el) {
            el.remove();
        });
    }

    /* Relocate the Stash "Attempt to fix?" link that sits as a SIBLING
       of an invalid `.date-input-group`. Move it INSIDE the group so
       it can render as a small "Fix" pill on the right of the error
       message row (CSS handles the visual). Idempotent via class. */
    function relocateDateFixLinks() {
        document.querySelectorAll(".date-input-group:has(input.is-invalid)").forEach(function (group) {
            if (group.querySelector(":scope > .refract-date-fix-btn")) { return; }
            var sibling = group.nextElementSibling;
            if (!sibling) { return; }
            var link = sibling.matches && sibling.matches("a")
                ? sibling
                : (sibling.querySelector ? sibling.querySelector("a") : null);
            if (!link) { return; }
            var text = (link.textContent || "").trim().toLowerCase();
            if (text.indexOf("attempt") !== 0 && text.indexOf("fix") === -1) { return; }
            link.classList.add("refract-date-fix-btn");
            link.textContent = "Fix";
            link.setAttribute("title", "Attempt to fix the date format");
            /* Hide the now-empty wrapper div if it had only this anchor. */
            if (sibling !== link) {
                sibling.style.display = "none";
            }
            group.appendChild(link);
        });
    }

    function injectStudioName() {
        var anchors = document.querySelectorAll(".scene-header-container h1.studio-logo > a");
        for (var i = 0; i < anchors.length; i++) {
            var a = anchors[i];
            if (a.dataset.stStudioInjected === "1") continue;
            var img = a.querySelector("img");
            if (!img) continue;
            var name = img.getAttribute("alt") || "";
            // Strip a trailing " logo" suffix if present (Stash's convention).
            name = name.replace(/\s+logo$/i, "").trim();
            if (!name) continue;
            var span = document.createElement("span");
            span.className = "st-studio-name";
            span.textContent = name;
            a.appendChild(span);
            a.dataset.stStudioInjected = "1";
        }
    }
    injectStudioName(); /* initial pass; re-runs via consolidated watcher */

    // Settings → Plugins page: replace each plugin's native
    // [Enable]/[Disable] btn-sm with a Bootstrap custom-switch toggle so
    // every row's action column reads the same. The original button stays
    // in the DOM (CSS hides it) and our toggle dispatches a click on it
    // when flipped — Stash's own handler runs unchanged. Also relocates
    // the project-link icon out of the action column into the title row
    // so the right column stays compact and consistent.
    function injectPluginToggles() {
        var groups = document.querySelectorAll(".setting-section .setting-group");
        for (var i = 0; i < groups.length; i++) {
            var group = groups[i];
            var header = group.querySelector(":scope > .setting");
            if (!header) continue;
            var rightSide = header.lastElementChild;
            if (!rightSide) continue;

            // Move the link icon (a.minimal.link) into the plugin title.
            var titleH3 = header.querySelector(":scope > div:first-child > h3");
            var linkAnchor = rightSide.querySelector("a.minimal.link.btn.btn-primary");
            if (titleH3 && linkAnchor && !linkAnchor.classList.contains("st-title-link")) {
                linkAnchor.classList.add("st-title-link");
                titleH3.appendChild(document.createTextNode(" "));
                titleH3.appendChild(linkAnchor);
            }

            // The Enable/Disable btn is the btn-sm one. Skip rows w/o it.
            var nativeBtn = rightSide.querySelector("button.btn.btn-primary.btn-sm");
            if (!nativeBtn) continue;
            // Skip our own injected chevron.
            if (nativeBtn.classList.contains("st-plugin-chevron")) continue;

            // Already done? Just sync state.
            var existing = rightSide.querySelector(".st-toggle-injected");
            if (existing) {
                var input = existing.querySelector("input");
                if (input) {
                    var enabled = !header.classList.contains("disabled");
                    if (input.checked !== enabled) input.checked = enabled;
                }
                continue;
            }

            var id = "st-plugin-toggle-" + Math.random().toString(36).slice(2, 9);
            var wrap = document.createElement("div");
            wrap.className = "st-toggle-wrap st-toggle-injected";
            wrap.innerHTML =
                '<div class="custom-control custom-switch">' +
                    '<input type="checkbox" id="' + id + '" class="custom-control-input">' +
                    '<label class="custom-control-label" for="' + id + '"></label>' +
                '</div>';

            var inp = wrap.querySelector("input");
            inp.checked = !header.classList.contains("disabled");
            inp.addEventListener("click", function (e) {
                // Forward to the native button so Stash's React handler runs.
                // Use a synthetic click event the React listener will accept.
                var btn = this.closest(".setting").querySelector(
                    "button.btn.btn-primary.btn-sm:not(.st-plugin-chevron)"
                );
                if (btn) btn.click();
                // Don't bubble to the row in case parents listen.
                e.stopPropagation();
            });

            // Place toggle as the LEFT-most action item in the right column.
            safeInsertBefore(rightSide, wrap, rightSide.firstChild);
        }
    }
    injectPluginToggles(); /* initial pass; re-runs via consolidated watcher */

    // Settings → Plugins page: each plugin renders its inline settings,
    // hooks, etc. always-expanded, which makes the list very long. Inject
    // a chevron toggle on every plugin's header row and default the
    // settings section to collapsed for a tidier view.
    function makePluginSettingsCollapsible() {
        var groups = document.querySelectorAll(".setting-section .setting-group");
        for (var i = 0; i < groups.length; i++) {
            var group = groups[i];
            if (group.dataset.stCollapsibleInjected === "1") continue;

            var header = group.querySelector(":scope > .setting");
            var section = group.querySelector(":scope > .collapsible-section");
            if (!header || !section) continue;

            // Skip plugins with no actual settings/hooks content.
            var hasContent =
                section.querySelector(".plugin-settings .setting") ||
                section.querySelector("h5"); // hooks header
            if (!hasContent) continue;

            var rightSide = header.lastElementChild;
            if (!rightSide) continue;

            var chevron = document.createElement("button");
            chevron.type = "button";
            chevron.className = "btn btn-primary btn-sm st-plugin-chevron";
            chevron.setAttribute("aria-label", "Toggle plugin settings");
            chevron.innerHTML =
                "<svg viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg' " +
                "aria-hidden='true'>" +
                "<path d='M10 7L15 12L10 17' stroke='currentColor' stroke-width='1.5' " +
                "stroke-linecap='round' stroke-linejoin='round'/></svg>";
            chevron.addEventListener("click", function (e) {
                e.stopPropagation();
                e.preventDefault();
                this.closest(".setting-group").classList.toggle("st-plugin-collapsed");
            });
            rightSide.appendChild(chevron);

            // Default to collapsed.
            group.classList.add("st-plugin-collapsed");
            group.dataset.stCollapsibleInjected = "1";
        }
    }
    makePluginSettingsCollapsible(); /* initial pass; re-runs via consolidated watcher */

    // Settings → Plugins page: take over the "Reload plugins" .setting
    // row — replace its h3 title with a live search input, and strip
    // the reload button down to an icon-only affordance. That row is
    // wasted vertical space otherwise (one button + redundant text),
    // and putting the search there keeps the page's vertical rhythm.
    // Search is case-insensitive substring over each plugin's h3 title.
    function injectPluginSearch() {
        var settings = document.querySelectorAll(".setting");
        var reloadRow = null;
        for (var i = 0; i < settings.length; i++) {
            var h = settings[i].querySelector(":scope > div:first-child > h3");
            if (h && h.textContent.trim().toLowerCase() === "reload plugins") {
                reloadRow = settings[i];
                break;
            }
        }
        if (!reloadRow || reloadRow.dataset.stSearchInjected === "1") return;

        // Reuse Stash's own .clearable-input-group + .clearable-text-field
        // markup so the theme's existing styles for those classes (the
        // glass-bg + accent-focus look used by the package-manager filter
        // and search-term rows) apply automatically. Adds a "clear" (×)
        // button alongside since the rest of those clearable rows have
        // one — keeps the family consistent.
        var wrap = document.createElement("div");
        wrap.className = "clearable-input-group st-plugin-search";
        wrap.innerHTML =
            "<input type='text' class='clearable-text-field form-control st-plugin-search-input' " +
                "placeholder='Filter…' aria-label='Search plugins' " +
                "autocomplete='off' spellcheck='false'>" +
            /* Intentionally NOT applying `btn btn-secondary` here —
               those classes would pull in the settings-scoped
               `.btn.btn-secondary` rule (a glass border + bg) that
               competes with the bare-icon `.clearable-text-field-clear`
               styling we actually want. The latter rule alone gives us
               the right look. */
            "<button type='button' class='clearable-text-field-clear st-plugin-search-clear' " +
                "aria-label='Clear search' tabindex='-1' style='display:none'>" +
                "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' " +
                    "stroke-width='2' stroke-linecap='round' stroke-linejoin='round' " +
                    "aria-hidden='true'>" +
                    "<path d='M18 6L6 18M6 6l12 12'/></svg>" +
            "</button>";

        var input = wrap.querySelector("input");
        var clearBtn = wrap.querySelector(".st-plugin-search-clear");

        function applyFilter() {
            var q = input.value.trim().toLowerCase();
            clearBtn.style.display = q ? "" : "none";
            // Use descendant combinator — plugin groups aren't always
            // direct children of .setting-section depending on Stash
            // version. Mirror what makePluginSettingsCollapsible uses.
            var groups = document.querySelectorAll(".setting-section .setting-group");
            for (var i = 0; i < groups.length; i++) {
                var g = groups[i];
                // Find the title h3 anywhere in the header row, not at
                // a strict 2-level depth — guards against React render
                // changes.
                var header = g.querySelector(":scope > .setting");
                var titleH3 = header ? header.querySelector("h3") : null;
                var name = titleH3 ? titleH3.textContent.toLowerCase() : "";
                g.classList.toggle("st-plugin-hidden", !!q && name.indexOf(q) === -1);
            }
        }
        input.addEventListener("input", applyFilter);
        clearBtn.addEventListener("click", function () {
            input.value = "";
            applyFilter();
            input.focus();
        });

        // Replace the title-div's contents with the search wrap.
        var titleDiv = reloadRow.querySelector(":scope > div:first-child");
        if (titleDiv) {
            titleDiv.innerHTML = "";
            titleDiv.appendChild(wrap);
        }

        // Reduce the reload button to icon-only — drop the inner text
        // span, keep the .fa-icon span (which holds the rotate SVG).
        var reloadBtn = reloadRow.querySelector(":scope > div:last-child button");
        if (reloadBtn) {
            reloadBtn.classList.add("st-plugin-reload-btn");
            reloadBtn.setAttribute("title", "Reload plugins");
            reloadBtn.setAttribute("aria-label", "Reload plugins");
            var spans = reloadBtn.querySelectorAll(":scope > span");
            for (var j = 0; j < spans.length; j++) {
                if (!spans[j].classList.contains("fa-icon")) spans[j].remove();
            }
        }

        reloadRow.classList.add("st-plugin-reload-row");
        reloadRow.dataset.stSearchInjected = "1";
    }
    injectPluginSearch(); /* initial pass; re-runs via consolidated watcher */

    // Settings → Tasks page: the Plugin Tasks card lists all plugin-defined
    // tasks grouped by plugin. Stash renders native .setting-group-collapse-button
    // chevrons that refract's global CSS hides. This function marks the card
    // with st-task-plugin-card (so scoped CSS can un-hide them), injects a
    // live search input, and defaults each group to collapsed by stripping
    // Bootstrap's `show` class — letting Stash's own native handler take over
    // from there (no duplicate click listener needed).
    function setupTaskPluginGroups() {
        // The plugin tasks card lives inside the tasks tab pane. Scope the
        // search there so we never accidentally match cards on other pages.
        // The pane ID ends in "-tabpane-tasks" across Stash versions.
        var tabPane = document.querySelector("[id$='-tabpane-tasks']");
        if (!tabPane) return;

        // Plugin task groups have btn-secondary btn-sm task triggers inside
        // their collapsible-section. Native task groups (Scan, Generate…)
        // have custom-switch checkboxes instead. Use that to tell them apart.
        var cards = tabPane.querySelectorAll(".card");
        var pluginCard = null;
        for (var c = 0; c < cards.length; c++) {
            var section = cards[c].querySelector(
                ".setting-group.collapsible .collapsible-section"
            );
            if (section && section.querySelector(".btn.btn-secondary.btn-sm")) {
                pluginCard = cards[c];
                break;
            }
        }
        if (!pluginCard) return;

        if (!pluginCard.classList.contains("st-task-plugin-card")) {
            pluginCard.classList.add("st-task-plugin-card");
        }

        if (!pluginCard.dataset.stTaskSearchDone) {
            var wrap = document.createElement("div");
            wrap.className = "clearable-input-group st-plugin-search st-task-plugin-search";
            wrap.innerHTML =
                "<input type='text' class='clearable-text-field form-control st-plugin-search-input' " +
                    "placeholder='Filter tasks…' aria-label='Search plugin tasks' " +
                    "autocomplete='off' spellcheck='false'>" +
                "<button type='button' class='clearable-text-field-clear st-plugin-search-clear' " +
                    "aria-label='Clear search' tabindex='-1' style='display:none'>" +
                    "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' " +
                        "stroke-width='2' stroke-linecap='round' stroke-linejoin='round' " +
                        "aria-hidden='true'>" +
                        "<path d='M18 6L6 18M6 6l12 12'/></svg>" +
                "</button>";

            var input = wrap.querySelector("input");
            var clearBtn = wrap.querySelector(".st-plugin-search-clear");

            function applyTaskFilter() {
                var q = input.value.trim().toLowerCase();
                clearBtn.style.display = q ? "" : "none";
                var groups = pluginCard.querySelectorAll(".setting-group");
                for (var gi = 0; gi < groups.length; gi++) {
                    var g = groups[gi];
                    var h3 = g.querySelector(".setting h3");
                    var name = h3 ? h3.textContent.toLowerCase() : "";
                    g.classList.toggle("st-plugin-hidden", !!q && name.indexOf(q) === -1);
                }
            }
            input.addEventListener("input", applyTaskFilter);
            clearBtn.addEventListener("click", function () {
                input.value = "";
                applyTaskFilter();
                input.focus();
            });

            pluginCard.insertBefore(wrap, pluginCard.firstChild);
            pluginCard.dataset.stTaskSearchDone = "1";
        }

        /* Default each group to collapsed: strip Bootstrap's `show` class.
           The native button's React/Bootstrap handler then owns toggle from here. */
        var groups = pluginCard.querySelectorAll(".setting-group.collapsible");
        for (var i = 0; i < groups.length; i++) {
            var group = groups[i];
            if (group.dataset.stTaskCollapsibleDone === "1") continue;
            var section = group.querySelector(".collapsible-section");
            if (section) section.classList.remove("show");
            group.dataset.stTaskCollapsibleDone = "1";
        }
    }
    setupTaskPluginGroups(); /* initial pass; re-runs via consolidated watcher */

    /* ── Consolidated mutation watcher ──────────────────────────────────
       Single global MutationObserver feeding all body-wide DOM watchers.
       Replaces 7 separate body-subtree observers — each used to fire on
       every DOM mutation, triggering 7 separate setTimeouts and 7 separate
       full-document scans. Now one observer, one debounce, one pass. */
    (function consolidatedMutationWatcher() {
        var _t = null;
        function runAll() {
            _t = null;
            /* Lightbox always-run: consolidate runs on first open then is
               idempotent. */
            try { consolidateLightbox(); } catch (e) {}
            /* Skip the rest of the handlers while the image lightbox is
               open. Stash's lightbox emits DOM mutations on zoom (scroll
               wheel changes image size + indicators), which fires this
               watcher rapidly. The downstream handlers don't apply to
               anything visible during zoom, so doing nothing here both
               saves perf and avoids interfering with Stash's transform-
               based zoom rendering. */
            if (document.querySelector(".Lightbox")) { return; }
            try { tagViewAllLinks(); } catch (e) {}
            try { cleanupOrphanGsTriggers(); } catch (e) {}
            try { relocateDateFixLinks(); } catch (e) {}
            try { injectStudioName(); } catch (e) {}
            try { fixSceneTaggerDetails(); } catch (e) {}
            try { relocateTaggerBatchButtons(); } catch (e) {}
            try { injectTaggerSearchClose(); } catch (e) {}
            try { applyScenePlayerFixes(); } catch (e) {}
            try { injectPluginToggles(); } catch (e) {}
            try { makePluginSettingsCollapsible(); } catch (e) {}
            try { injectPluginSearch(); } catch (e) {}
            try { setupTaskPluginGroups(); } catch (e) {}
        }
        function sched() {
            clearTimeout(_t);
            _t = setTimeout(runAll, 60);
        }
        new MutationObserver(sched).observe(document.body, { childList: true, subtree: true });
    })();

    // Bootstrap's Collapse uses the same `.collapsing` class for opening AND closing,
    // so CSS can't tell direction. On click we tag the header:
    //   - `.st-collapse-opening`: about to open — CSS pre-applies the orange/flat state
    //     immediately so the button transition syncs with the panel slide.
    //   - `.st-collapse-transitioning`: present during BOTH directions for ~400ms so
    //     CSS can keep the bottom border transparent during the animation, avoiding
    //     a grey-line flash when closing (where the panel is still partially visible
    //     while the button reverts to its closed-state border-bottom: glass-border).
    document.addEventListener("click", function (e) {
        var btn = e.target.closest && e.target.closest(".collapse-button");
        if (!btn) return;
        var header = btn.closest(".collapse-header");
        if (!header) return;
        var panel = header.nextElementSibling;
        if (!panel || !panel.classList.contains("collapse")) return;
        var isOpening = !panel.classList.contains("show");
        if (isOpening) header.classList.add("st-collapse-opening");
        header.classList.add("st-collapse-transitioning");
        setTimeout(function () {
            header.classList.remove("st-collapse-opening");
            header.classList.remove("st-collapse-transitioning");
        }, 400);
    }, true);

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot);
    } else {
        boot();
    }
})();
