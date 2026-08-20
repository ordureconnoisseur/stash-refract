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

    /* ── Early nav-order injection ───────────────────────────────────────
       Writes saved order as CSS rules into <head> immediately on script
       execution — before React paints the nav — so items never appear in
       the wrong order on page load. setupNavbarReorder() later manages
       the same <style> tag for live drag updates. */
    (function earlyNavOrder() {
        try {
            var raw = localStorage.getItem("refract-nav-order-v1");
            if (!raw) return;
            var saved = JSON.parse(raw);
            if (!Array.isArray(saved) || !saved.length) return;
            var navSel = "body.stash-liquid-glass nav.top-nav .navbar-nav";
            var css = "";
            saved.forEach(function (key, i) {
                /* A legacy/corrupted non-string entry (e.g. a bare number
                   from an older format) would throw on .slice and, caught by
                   the outer try, silently drop the ENTIRE saved nav order.
                   Skip non-strings instead. */
                if (typeof key !== "string") { return; }
                var sel;
                if (key.slice(0, 2) === "k:") {
                    sel = navSel + ' > [data-rb-event-key="' + key.slice(2) + '"]';
                } else if (key.slice(0, 2) === "i:") {
                    sel = navSel + " > #" + key.slice(2);
                } else { return; }
                css += sel + " { order: " + (i + 1) + " !important; }\n";
            });
            if (!css) return;
            var style = document.createElement("style");
            style.id = "st-nav-order-style";
            (document.head || document.documentElement).appendChild(style);
            style.textContent = css;
        } catch (e) { /* ignore */ }
    }());

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
        var attempts = 0;
        function attempt() {
            try {
                var cs = getComputedStyle(document.body);
                var a = cs.getPropertyValue("--accent").trim();
                var b = cs.getPropertyValue("--accent-bright").trim();
                var t = cs.getPropertyValue("--accent-tint").trim();
                var r = cs.getPropertyValue("--accent-rgb").trim();
                /* On a cold load the bundled CSS may not have applied yet,
                   so the accent vars read empty. Retry a few frames before
                   giving up — otherwise the multiview handoff keeps a stale
                   accent with no recovery. */
                if (!a && attempts < 10) {
                    attempts++;
                    requestAnimationFrame(attempt);
                    return;
                }
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
        }
        if (typeof requestAnimationFrame === "function") {
            requestAnimationFrame(attempt);
        } else {
            setTimeout(attempt, 0);
        }
    }

    function applyAccentPreset() { applyAccentClass(getStoredAccent()); }
    applyAccentPreset();

    /* Refract's accent picker. Hooked into Stash's React tree via
       PluginApi.patch.instead("PluginSettings"), so the plugin panel for
       Refract Theme renders our React component instead of Stash's broken
       native string-input row. PluginID prop confirmed at runtime. */
    /* Quiet support line at the foot of the settings panel. Muted, passive,
       and below every real setting - no banner, no dismiss state. */
    function refractSupportNote(R) {
        function link(href, label) {
            return R.createElement("a", {
                href: href,
                target: "_blank",
                rel: "noopener noreferrer"
            }, label);
        }
        return R.createElement("div", { className: "setting refract-support" },
            R.createElement("div", { className: "sub-heading" },
                "Refract is free. ",
                link("https://github.com/sponsors/ordureconnoisseur", "Sponsor"),
                " or ",
                link("https://ko-fi.com/ordureconnoisseur", "Ko-fi"),
                " if you would like to chip in."));
    }

    function buildAccentSwatchPicker() {
        var R = PluginApi.React;

        /* Error boundary for the real-card preview: any render crash in
           Stash's card components (schema drift, missing field) calls
           onError so the preview falls back to the static mocks instead
           of taking the whole settings panel down. ES5-style class. */
        function PreviewBoundary(props) {
            R.Component.call(this, props);
            this.state = { err: false };
        }
        PreviewBoundary.prototype = Object.create(R.Component.prototype);
        PreviewBoundary.prototype.constructor = PreviewBoundary;
        PreviewBoundary.getDerivedStateFromError = function () { return { err: true }; };
        PreviewBoundary.prototype.componentDidCatch = function () {
            if (this.props.onError) { this.props.onError(); }
        };
        PreviewBoundary.prototype.render = function () {
            return this.state.err ? null : this.props.children;
        };

        /* Live preview: one real scene + one real performer rendered with
           Stash's own card components — pixel-identical to the grid, and
           every refract processor treats them as real cards. Falls back
           to the static mocks when the library is empty, the fetch
           fails, the components are unavailable, or a card crashes.
           Clicks are swallowed (capture phase) so card links can't
           navigate away from settings; the shuffle button re-rolls and
           persists the new pick. */
        var refractPreviewReload = null;
        var refractPreviewRefresh = null;
        var refractPreviewHeldSize = null;
        function RefractCardPreview() {
            var st = R.useState({ loading: true, scene: null, performer: null, failed: false });
            var pv = st[0], setPv = st[1];

            /* The loading state keeps the box the last card had. Without it
               the box collapsed to one line of text on every reload -- and a
               stat pick reloads -- so the pointer, sitting on a chip over the
               card, was suddenly outside the corner layer: mouseleave, band
               cleared, menu closed. Move left/right relies on the menu staying
               open through the write. */
            function load(shuffle) {
                var held = document.querySelector("#plugin-refract-card-preview .refract-card-preview");
                if (held && held.offsetWidth) { refractPreviewHeldSize = { w: held.offsetWidth, h: held.offsetHeight }; }
                setPv({ loading: true, scene: null, performer: null, failed: false });
                var componentsReady = (PluginApi.utils && PluginApi.utils.loadComponents && PluginApi.loadableComponents && PluginApi.loadableComponents.SceneCard)
                    ? PluginApi.utils.loadComponents([PluginApi.loadableComponents.SceneCard, PluginApi.loadableComponents.PerformerCard])
                    : Promise.resolve();
                Promise.all([componentsReady, refractFetchPreviewData(shuffle)])
                    .then(function (rs) {
                        var d = rs[1] || {};
                        setPv({ loading: false, scene: d.scene || null, performer: d.performer || null,
                                failed: !d.scene && !d.performer });
                    })
                    .catch(function () {
                        setPv({ loading: false, scene: null, performer: null, failed: true });
                    });
            }
            /* The rail owns Shuffle now, and the rail is rendered by the panel,
               not by this component. Publish `load` on a module slot during
               render (before any early return, so it cannot be skipped by the
               loading/mock branches) rather than through a hook. */
            /* Two doors. Shuffle wants a NEW pick; everything else -- editing a
               pill, applying a look -- wants the SAME card redrawn. They shared
               one function that always shuffled, so every touch of the strip
               threw a different performer on the stage and you lost the thing
               you were looking at. */
            refractPreviewReload = function () { load(true); };
            refractPreviewRefresh = function () { load(false); };
            R.useEffect(function () { load(false); }, []);

            var SceneCard = PluginApi.components.SceneCard;
            var PerformerCard = PluginApi.components.PerformerCard;
            var canReal = !pv.failed && SceneCard && PerformerCard && (pv.scene || pv.performer);

            if (pv.loading) {
                return R.createElement("div", {
                    className: "refract-card-preview refract-card-preview-loading",
                    style: refractPreviewHeldSize
                        ? { minWidth: refractPreviewHeldSize.w + "px", minHeight: refractPreviewHeldSize.h + "px" }
                        : undefined
                }, R.createElement("div", { className: "sub-heading" }, "Loading preview…"));
            }
            if (!canReal) {
                /* Static mock fallback (empty library / error). */
                return R.createElement("div", {
                    className: "refract-card-preview",
                    dangerouslySetInnerHTML: { __html: refractBuildPreviewHtml() }
                });
            }
            function onCardError() {
                setPv({ loading: false, scene: null, performer: null, failed: true });
            }
            return R.createElement("div", { className: "refract-card-preview refract-card-preview-real" },
                R.createElement("div", {
                    className: "refract-preview-cards",
                    onClickCapture: function (e) {
                        e.preventDefault();
                        e.stopPropagation();
                    }
                },
                    pv.scene ? R.createElement(PreviewBoundary, { key: "s" + pv.scene.id, onError: onCardError },
                        R.createElement(SceneCard, { scene: pv.scene })) : null,
                    pv.performer ? R.createElement(PreviewBoundary, { key: "p" + pv.performer.id, onError: onCardError },
                        R.createElement(PerformerCard, { performer: pv.performer })) : null
                ),
                null
            );
        }

        /* Mobile dock configuration: a grid of every dock candidate
           (core routes + plugin tiles, harvested live from the drawer),
           click to toggle membership. Lit = in the dock. */
        function DockConfigGrid() {
            var candSt = R.useState(refractDockCandidates);
            var cands = candSt[0], setCands = candSt[1];
            var selSt = R.useState(refractGetDockSelection);
            var sel = selSt[0], setSel = selSt[1];
            R.useEffect(function () {
                /* Plugin tiles appear asynchronously as the navbar is
                   scanned; poll until the candidate list stops growing. */
                var t = setInterval(function () {
                    var c = refractDockCandidates();
                    if (c.length !== cands.length) { setCands(c); }
                }, 1000);
                return function () { clearInterval(t); };
            }, [cands.length]);
            var MAX_DOCK_ICONS = 6;
            function toggle(key) {
                var isOn = sel.indexOf(key) !== -1;
                /* Hard cap: more than 6 + burger squeezes the bar into
                   uselessness on narrow phones. */
                if (!isOn && sel.length >= MAX_DOCK_ICONS) { return; }
                var next = isOn
                    ? sel.filter(function (k) { return k !== key; })
                    : sel.concat([key]);
                try { localStorage.setItem(DOCK_ITEMS_KEY, JSON.stringify(next)); } catch (e) { /* ignore */ }
                scheduleServerSync();
                setSel(next);
                refractRebuildMobileDock();
            }
            var full = sel.length >= MAX_DOCK_ICONS;
            if (!cands.length) {
                return R.createElement("div", { className: "sub-heading" },
                    "Icons load once the navbar has been scanned…");
            }
            return R.createElement("div", { className: "refract-dock-grid" },
                cands.map(function (c) {
                    var on = sel.indexOf(c.key) !== -1;
                    var blocked = !on && full;
                    return R.createElement("button", {
                        key: c.key,
                        type: "button",
                        className: "refract-dock-grid-item" + (on ? " is-active" : "") + (blocked ? " is-blocked" : ""),
                        title: blocked ? (c.label + " (dock is full: 6 max)") : c.label,
                        "aria-label": c.label,
                        "aria-pressed": on ? "true" : "false",
                        "aria-disabled": blocked ? "true" : "false",
                        onClick: function () { toggle(c.key); },
                        dangerouslySetInnerHTML: { __html: c.iconHtml }
                    });
                })
            );
        }

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

            /* Drawer open/closed. Local only, deliberately NOT in
               REFRACT_SYNC_KEYS: whether a panel is expanded is per-device
               convenience, not part of how the theme looks. Defaults open, so
               nothing changes for anyone who never touches it. */
            var customiserOpenState = R.useState(isCustomiserOpen());
            var customiserOpen = customiserOpenState[0];
            var setCustomiserOpen = customiserOpenState[1];
            function setCustomiserOpenPref(open) {
                if (open === customiserOpen) { return; }
                try { localStorage.setItem(CUSTOMISER_OPEN_KEY, open ? "1" : "0"); } catch (e) { /* ignore */ }
                setCustomiserOpen(open);
            }

            /* Which card the customiser is currently pointed at. Drives the
               preview and the type-specific settings; shared settings
               (flourish, rating system, hover) stay visible in both, because
               hiding a setting that affects BOTH card types behind a card-type
               switch would be a lie. Local only, like the drawer state. */
            /* The previewed back is plain DOM, not React, so it has to be
               rebuilt by hand whenever anything it renders from changes. It
               retries briefly because the preview card arrives asynchronously
               from its own query. */
            R.useEffect(function () {
                var tries = 0;
                var want = editingBack ? "back" : previewKind;
                /* Rebuild once per render, because any setting could have
                   changed what the back renders and its markup is a template,
                   not a live view. */
                var built = refractSyncPreviewBack(want);
                var t = null;
                if (!built) {
                    /* The preview card arrives from its own query, so on first
                       paint there may be nothing to attach to yet. */
                    t = setInterval(function () {
                        tries += 1;
                        if (refractSyncPreviewBack(want) || tries > 40) { clearInterval(t); t = null; }
                    }, 150);
                }
                /* ...and keep watch while the back is the face being edited.
                   RefractCardPreview owns the card and re-renders on its own
                   schedule -- shuffling, its query resolving -- which replaces
                   the card node and takes the back's plain DOM with it. That
                   is a child re-render, so THIS effect does not run again and
                   the preview sat blank until something else moved. Cheap
                   non-destructive re-assert: it only rebuilds when the back has
                   actually gone, so it never thrashes a healthy one. */
                var watch = null;
                if (editingBack) {
                    watch = setInterval(function () {
                        var card = document.querySelector("#plugin-refract-card-preview .performer-card");
                        if (card && !card.querySelector(".refract-card-back")) {
                            refractSyncPreviewBack("back");
                        }
                    }, 400);
                }
                return function () {
                    if (t) { clearInterval(t); }
                    if (watch) { clearInterval(watch); }
                };
            });

            /* Which quadrant of the preview card is being hovered, or null.
               Deliberately NOT persisted: it is a pointer position, not a
               preference, and it must be cleared on every card-type switch. */
            var zoneState = R.useState(null);
            var zone = zoneState[0];
            var setZoneRaw = zoneState[1];

            /* A band's chips do not fit inside the band. The stat strip's band
               is 52px tall on a 323px card and its chips need ~58px, so they
               render above it -- inside the TRAY's band. Moving the pointer
               from the strip to its own chips therefore crossed the tray's hit
               area, which swapped the zone and took the chips away before they
               could be clicked. Measured: the swap happened 30px into a 58px
               journey, which made the stat slots impossible to edit.

               Rather than shuffle rectangles until the gaps close -- they
               cannot all close, the bands are adjacent by construction -- the
               switch is given a short grace period. Entering a DIFFERENT band
               only schedules the change; landing on any chip cancels it. The
               first hover is still instant, because there is nothing to
               protect when no band is open yet. */
            function setZone(z) {
                if (refractZoneTimer) { clearTimeout(refractZoneTimer); refractZoneTimer = null; }
                if (z !== zone) { elemMenuState[1](null); elemHoverState[1](null); }
                setZoneRaw(z);
            }
            function enterZone(z) {
                if (refractZoneTimer) { clearTimeout(refractZoneTimer); refractZoneTimer = null; }
                if (z === zone) { return; }
                if (zone === null) { setZoneRaw(z); return; }
                refractZoneTimer = setTimeout(function () {
                    refractZoneTimer = null;
                    setZoneRaw(z);
                }, 220);
            }
            /* Landing on the chips cancels a pending swap AND re-asserts the
               band, so a slow diagonal across a corner cannot strand you. */
            function holdZone(z) {
                if (refractZoneTimer) { clearTimeout(refractZoneTimer); refractZoneTimer = null; }
                if (z !== zone) { setZoneRaw(z); }
            }
            /* Armed when the panel is first SEEN this session, not when it
               mounts: the settings page mounts it far below the fold, and a
               pulse that played while the user was reading the accent picker
               was a pulse nobody saw. */
            /* The card's tier class, mirrored onto the stage: the stage's
               ::before glow and floor shadow tint themselves from --seal, so
               a gold card sits in gold light and an unrated card in plain
               dark. A MutationObserver because the tier lands asynchronously
               (tagFilledRatings) on a card this component does not render. */
            R.useEffect(function () {
                var stage = document.getElementById("plugin-refract-card-preview");
                if (!stage || typeof MutationObserver === "undefined") { return undefined; }
                var sync = function () {
                    var card = stage.querySelector(".scene-card, .performer-card");
                    var m = card && (card.className || "").match(/refract-card-tier-\w+/);
                    var want = m ? ("refract-cc-" + m[0].slice("refract-card-".length)) : "";
                    var have = (stage.className.match(/refract-cc-tier-\w+/) || [""])[0];
                    if (want !== have) {
                        if (have) { stage.classList.remove(have); }
                        if (want) { stage.classList.add(want); }
                    }
                };
                sync();
                var mo = new MutationObserver(sync);
                mo.observe(stage, { subtree: true, attributes: true, attributeFilter: ["class"], childList: true });
                return function () { mo.disconnect(); };
            }, []);
            /* Where the real pills ARE. Measured off the drawn strip rather
               than derived from the list, because the strip's visual order is
               inline `order` (so DOM order lies) and the back's fitter drops
               pills that do not fit. Sorted by x, the boxes line up with the
               slot list one for one. */
            var pillBoxesState = R.useState([]);
            var pillBoxes = pillBoxesState[0];
            var pillHoverState = R.useState(null);
            var pillHover = pillHoverState[0];
            /* The focused ELEMENT, by key -- the same idea as pillMenu one
               level up: click the thing on the card, get the thing's own
               controls. */
            var elemMenuState = R.useState(null);
            var elemMenu = elemMenuState[0];
            var elemHoverState = R.useState(null);
            var elemHover = elemHoverState[0];
            var elemBoxesState = R.useState({});
            var elemBoxes = elemBoxesState[0];
            R.useEffect(function () {
                var live = true, timers = [], raf = null;
                var measure = function () {
                    if (!live) { return; }
                    var want = [], laidOut = false;
                    var mFace = stripFaceOf(zone);
                    if (mFace) {
                        var box = document.querySelector("#plugin-refract-card-preview .refract-cc-cardbox");
                        /* Which strip is DRAWN, rather than which one the state
                           says should be: both faces are laid out at once (the
                           front strip keeps its box while the back is showing),
                           so the card's own class is the honest answer. */
                        var showBack = !!(box && box.querySelector(".performer-card.refract-show-back"));
                        var strip = box && (mFace === "foot"
                            ? box.querySelector(".refract-card-back .refract-cb-foot")
                            : ((showBack && box.querySelector(".refract-card-back .refract-mb-stats"))
                                || box.querySelector(".stash-perf-stats:not(.refract-mb-stats)")));
                        if (strip && strip.children.length) {
                            var br = box.getBoundingClientRect();
                            Array.prototype.forEach.call(strip.children, function (n, di) {
                                var r = n.getBoundingClientRect();
                                if (!r.width || !r.height) { return; }
                                laidOut = true;
                                /* The SLOT this cell belongs to, off the cell.
                                   An empty stat is drawn and hidden, so counting
                                   the visible cells numbered a shorter list and
                                   every slot after a gap was off by one -- on a
                                   performer with no height, clicking the second
                                   visible pill opened the third slot's menu. */
                                var di2 = parseInt(n.getAttribute("data-i"), 10);
                                want.push({
                                    i: isNaN(di2) ? di : di2,
                                    left: Math.round(r.left - br.left),
                                    top: Math.round(r.top - br.top),
                                    width: Math.round(r.width),
                                    height: Math.round(r.height)
                                });
                            });
                            want.sort(function (x, y) { return x.left - y.left; });
                            /* The back's strip is REBUILT under us -- its pills
                               measure 0x0 on some frames and their real size on
                               others. Logged: want 4 -> want 0 -> want 4 within
                               35ms. A zero landing between two good frames used
                               to wipe the boxes, which is why the back's hit
                               targets appeared or not depending on the race.
                               A strip that exists but has no box yet is "not
                               ready", never "empty". */
                            if (!laidOut && pillBoxes.length) { return; }
                        }
                    }
                    if (JSON.stringify(want) !== JSON.stringify(pillBoxes)) { pillBoxesState[1](want); }

                    /* Every element of the armed zone that is actually drawn,
                       so each can carry its own hit target. Same "present but
                       not laid out is not ready" rule as the pills. */
                    var eb = {};
                    if (zone) {
                        var cbox = document.querySelector("#plugin-refract-card-preview .refract-cc-cardbox");
                        /* The preview holds BOTH cards at once and hides one
                           in CSS, so a `.scene-card, .performer-card` query
                           returns whichever comes first in the DOM -- the scene
                           card -- and the performer front measured nothing.
                           Name the card this tab is editing. */
                        var root = cbox && (editingBack
                            ? cbox.querySelector(".refract-card-back")
                            : cbox.querySelector(previewKind === "performer" ? ".performer-card" : ".scene-card"));
                        if (root) {
                            var rb = cbox.getBoundingClientRect();
                            CARD_ELEMS.forEach(function (d) {
                                if (!d.sel || d.group !== elemGroup) { return; }
                                if (cardElems[d.key] || !elemAvailable(d)) { return; }
                                if (zoneOfElem(d) !== zone) { return; }
                                /* The strip belongs to the pills while they are
                                   editable; two overlapping targets over one
                                   object is worse than none. */
                                if (d.key === "refract.pcHideStats" && pillStripEditable()) { return; }
                                /* The first VISIBLE match, not the first match.
                                   `sel` lists alternates ("the duration pill OR
                                   the specs-overlay duration"), and querySelector
                                   returns whichever comes first in DOM ORDER --
                                   which for Duration is the hidden overlay span,
                                   0x0, so the element was silently skipped and
                                   its chip had no target. Same trap waits for the
                                   studio in "As title text" mode. */
                                var ns;
                                try { ns = root.querySelectorAll(d.sel); } catch (e) { ns = null; }
                                if (!ns || !ns.length) { return; }
                                var r = null;
                                for (var qi = 0; qi < ns.length; qi++) {
                                    var node = ns[qi];
                                    var rr = node.getBoundingClientRect();
                                    if (!rr.width || !rr.height) { continue; }
                                    /* An element that is a picture, or wraps
                                       one, is outlined where the PICTURE is.
                                       The studio logo's box is a fixed slot and
                                       the artwork is letterboxed inside it, so
                                       the box was a different shape from the
                                       logo on every single card. */
                                    /* Exactly one picture, or none. A wrapper
                                       holding SEVERAL -- the performer avatar
                                       row -- is its own shape, and hugging the
                                       first of them would shrink the target to
                                       one face out of three. (Avatars are
                                       `cover` today, so this changes nothing
                                       now; it stops it changing later.) */
                                    var ims = node.tagName === "IMG"
                                        ? [node] : node.querySelectorAll("img");
                                    var im = ims.length === 1 ? ims[0] : null;
                                    if (im) {
                                        var pr = refractPaintedRect(im);
                                        if (pr.width && pr.height) { rr = pr; }
                                    }
                                    r = rr;
                                    break;
                                }
                                if (!r) { return; }
                                eb[d.key] = {
                                    left: Math.round(r.left - rb.left),
                                    top: Math.round(r.top - rb.top),
                                    width: Math.round(r.width),
                                    height: Math.round(r.height)
                                };
                            });
                        }
                    }
                    if (JSON.stringify(eb) !== JSON.stringify(elemBoxes)) { elemBoxesState[1](eb); }
                };
                /* Staggered, because the strip settles at its own pace: after
                   paint, then again while the back finishes its own query. */
                raf = requestAnimationFrame(measure);
                [80, 200, 420].forEach(function (ms) { timers.push(setTimeout(measure, ms)); });
                return function () {
                    live = false;
                    if (raf) { cancelAnimationFrame(raf); }
                    timers.forEach(clearTimeout);
                };
            });
            var introState = R.useState(false);
            var introOn = introState[0];
            R.useEffect(function () {
                var seen = false;
                try { seen = sessionStorage.getItem("refract.ccIntroShown") === "1"; } catch (e) { seen = true; }
                if (seen || typeof IntersectionObserver === "undefined") { return undefined; }
                var t = null, io = null;
                var stage = document.getElementById("plugin-refract-card-preview");
                if (!stage) { return undefined; }
                /* Fires on the FIRST real sight of the stage. The previous
                   gates (1.5s arming delay + a 400ms still-in-view confirm)
                   were built against a settle-layout ghost and ate the pulse
                   entirely -- the one orchestrated moment never played. A
                   0.6 threshold on the observer is protection enough: the
                   pre-settle layout never shows 60% of the stage. */
                io = new IntersectionObserver(function (entries) {
                    if (!entries.some(function (en) { return en.isIntersecting; })) { return; }
                    io.disconnect(); io = null;
                    try { sessionStorage.setItem("refract.ccIntroShown", "1"); } catch (e) { /* ignore */ }
                    introState[1](true);
                    t = setTimeout(function () { introState[1](false); }, 2600);
                }, { threshold: 0.6 });
                io.observe(stage);
                return function () {
                    if (io) { io.disconnect(); }
                    if (t) { clearTimeout(t); }
                };
            }, []);
            /* Session-only, like the preview kind: what the preview shows is a
               device thing, not a preference. */
            var plainState = R.useState(refractPreviewPlain);
            var plainOn = plainState[0];
            var setPlainOn = plainState[1];
            var previewKindState = R.useState(storedPreviewKind());
            var previewKind = previewKindState[0];
            var setPreviewKindState = previewKindState[1];
            function setPreviewKind(kind) {
                if (kind === previewKind) { return; }
                try { localStorage.setItem(PREVIEW_KIND_KEY, kind); } catch (e) { /* ignore */ }
                setPreviewKindState(kind);
            }


            var perfCardStyleState = R.useState(getPerfCardStyle());
            var perfCardStyle = perfCardStyleState[0];
            var setPerfCardStyle = perfCardStyleState[1];

            /* MUST come after perfCardStyle above. These were declared higher
               up and read `perfCardStyle` before its `var` had been assigned:
               the declaration hoists but the value does not, so canFlipPreview
               computed against `undefined` and the flip tab never rendered. */
            /* The back is a SIDE of the performer card, not a third card type.
               It was a tab beside "Scene card" and "Performer card", which put
               one card's two faces on the same footing as two different cards
               and made the flip -- the thing the back exists for -- invisible
               in the very place you configure it. It is a flip on the card now.

               Not persisted: which face you left the editor on is a pointer
               position, not a preference, and a customiser that reopens
               showing the back would bury the front. */
            var previewSideState = R.useState("front");
            var previewSideRaw = previewSideState[0];
            var setPreviewSideState = previewSideState[1];
            /* Only the Refract performer layout has a back at all, so every
               other combination is pinned to the front rather than offered a
               flip that would preview nothing. */
            var canFlipPreview = previewKind === "performer" && perfCardStyle === "refract";
            var previewSide = canFlipPreview ? previewSideRaw : "front";
            var editingBack = previewSide === "back";
            /* Which CARD_ELEMS group the zones and chips are reading. */
            var elemGroup = editingBack ? "back" : previewKind;
            function setPreviewSide(side) {
                if (side === previewSideRaw) { return; }
                setZone(null);
                setPillMenu(null);
                setPreviewSideState(side);
            }

            var flourishState = R.useState(getFlourish());
            var flourish = flourishState[0];
            var setFlourish = flourishState[1];

            var liteState = R.useState(isLiteModeEnabled());
            var liteOn = liteState[0];
            var setLiteOn = liteState[1];

            var lightState = R.useState(isLightModeEnabled());
            var lightOn = lightState[0];
            var setLightOn = lightState[1];

            var cardStyleState = R.useState(getStoredCardStyle());
            var cardStyle = cardStyleState[0];
            var setCardStyle = cardStyleState[1];

            var studioBannerState = R.useState(isStudioBannerVisible());
            var studioBannerOn = studioBannerState[0];
            var setStudioBannerOn = studioBannerState[1];

            var perfCardHoverState = R.useState(isPerformerCardHover());
            var perfCardHoverOn = perfCardHoverState[0];
            var setPerfCardHoverOn = perfCardHoverState[1];


            var pluginSortState = R.useState(isPluginSortDisabledBottom());
            var pluginSortDisabledBottomOn = pluginSortState[0];
            var setPluginSortDisabledBottomOn = pluginSortState[1];

            var centerControlsState = R.useState(isCenterControlsHidden());
            var centerControlsHiddenOn = centerControlsState[0];
            var setCenterControlsHiddenOn = centerControlsState[1];

            var filterTagsState = R.useState(isFilterTagsShown());
            var filterTagsOn = filterTagsState[0];
            var setFilterTagsOn = filterTagsState[1];


            /* Card element visibility: one state map driven by the
               CARD_ELEMS table (key -> hidden bool). */
            var cardElemsState = R.useState(function () {
                var m = {};
                CARD_ELEMS.forEach(function (d) { m[d.key] = isCardElemHidden(d.key); });
                return m;
            });
            var cardElems = cardElemsState[0];
            var setCardElems = cardElemsState[1];

            /* Side + layering for the top-edge elements. `__layer` rides along
               in the same map so one setState covers a preset. */
            /* Any back already built is stale the moment one of these
               changes: the back's markup is a template, not a live view. */
            function dropBuiltBacks() {
                var builts = document.querySelectorAll(".performer-card .refract-card-back");
                for (var bi = 0; bi < builts.length; bi++) {
                    if (builts[bi].parentNode) { builts[bi].parentNode.removeChild(builts[bi]); }
                }
            }
            var trayOnState = R.useState(storedTrayOn);
            var trayOn = trayOnState[0];
            function pickTrayOn(v) {
                if (trayOn === v) { return; }
                try { localStorage.setItem(TRAY_KEY, v ? "1" : "0"); } catch (e) { /* ignore */ }
                scheduleServerSync();
                applyBackClasses();
                dropBuiltBacks();
                trayOnState[1](v);
            }
            var trayPhotosState = R.useState(storedTrayPhotos);
            var trayPhotos = trayPhotosState[0];
            function pickTrayPhotos(v) {
                if (trayPhotos === v) { return; }
                try { localStorage.setItem(TRAY_PHOTOS_KEY, v ? "1" : "0"); } catch (e) { /* ignore */ }
                scheduleServerSync();
                dropBuiltBacks();
                trayPhotosState[1](v);
            }
            /* The back's stat slots, in order, and which one has its menu
               open. The menu index is NOT persisted: it is a pointer position. */
            var backStyleState = R.useState(storedBackStyle);
            var backStyleStored = backStyleState[0];
            /* The stored preference and what the card really builds are two
               different things on a library with no category ratings: the pref
               may say dossier while every card falls back to the gallery. The
               customiser drew the stored one -- Dossier marked active, no bands
               offered, "fixed layout" in the hint -- over a preview that was a
               gallery you could not touch. Everything below reads the EFFECTIVE
               style; the stored one is only what the Dossier look writes. */
            var hasCatsState = R.useState(refractLibraryHasCategories());
            var hasCats = hasCatsState[0];
            R.useEffect(function () {
                var live = true;
                refractOnCategoriesKnown(function (v) { if (live) { hasCatsState[1](!!v); } });
                return function () { live = false; };
            }, []);
            var backStyle = (backStyleStored === "dossier" && hasCats) ? "dossier" : "gallery";
            function pickBackStyle(v) {
                if (backStyleStored === v) { return; }
                try { localStorage.setItem(BACK_STYLE_KEY, v); } catch (e) { /* ignore */ }
                scheduleServerSync();
                dropBuiltBacks();
                backStyleState[1](v);
            }
            var backPillsState = R.useState(backPillsPref);
            var backPills = backPillsState[0];
            var pillMenuState = R.useState(null);
            var pillMenu = pillMenuState[0];
            /* Escape closes whichever menu is open. MUST sit below
               `var pillMenu`: declared above it, the dependency array read the
               hoisted-but-unassigned `undefined` every render, so it never
               changed, the effect never re-ran when a pill menu opened, and no
               listener was ever attached. The element menu worked only because
               its variable happens to be declared earlier -- which is exactly
               why the bug looked fixed. */
            R.useEffect(function () {
                if (pillMenu === null && elemMenu === null) { return undefined; }
                var onKey = function (e) {
                    if (e.key !== "Escape") { return; }
                    e.stopPropagation();
                    setPillMenu(null);
                    elemMenuState[1](null);
                };
                document.addEventListener("keydown", onKey);
                return function () { document.removeEventListener("keydown", onKey); };
            }, [pillMenu, elemMenu]);

            var setPillMenu = pillMenuState[1];
            function writeBackPills(list) {
                try { localStorage.setItem(BACK_PILLS_KEY, list.join(",")); } catch (e) { /* ignore */ }
                scheduleServerSync();
                dropBuiltBacks();
                backPillsState[1](list);
            }
            /* The dossier's footer, the third strip. Same storage shape, same
               rebuild: the back is a template, so a changed list means a new
               back rather than a patched one. */
            var footPillsState = R.useState(footPillsPref);
            var footPills = footPillsState[0];
            function writeFootPills(list) {
                try { localStorage.setItem(FOOT_PILLS_KEY, list.join(",")); } catch (e) { /* ignore */ }
                scheduleServerSync();
                dropBuiltBacks();
                footPillsState[1](list);
            }
            /* The FRONT's slot list, same shape. Cards are rebuilt by removing
               their marker so initPerformerCards runs again on them. */
            var frontPillsState = R.useState(frontPillsPref);
            var frontPills = frontPillsState[0];
            function writeFrontPills(list) {
                try { localStorage.setItem(FRONT_PILLS_KEY, list.join(",")); } catch (e) { /* ignore */ }
                scheduleServerSync();
                var cards = document.querySelectorAll(".performer-card[data-stash-pc]");
                for (var ci = 0; ci < cards.length; ci++) {
                    cards[ci].removeAttribute("data-stash-pc");
                    var oldRow = cards[ci].querySelector(".stash-perf-stats:not(.refract-mb-stats)");
                    if (oldRow && oldRow.parentNode) { oldRow.parentNode.removeChild(oldRow); }
                    var oldBanner = cards[ci].querySelector(".refract-pc-name-banner:not(.refract-mb-name)");
                    if (oldBanner && oldBanner.parentNode) { oldBanner.parentNode.removeChild(oldBanner); }
                    var oldTier = cards[ci].querySelector(".refract-pc-tier-label:not(.refract-mb-sash)");
                    if (oldTier && oldTier.parentNode) { oldTier.parentNode.removeChild(oldTier); }
                    var oldCountry = cards[ci].querySelector(".stash-perf-country");
                    if (oldCountry && oldCountry.parentNode) {
                        /* Ascension's rank badge is HOSTED inside the country
                           caption (integrateAscensionBadges moves it there).
                           It is the plugin's own node, not ours: hand it back
                           to the card before the caption goes, so the next
                           pass can adopt it again rather than find it gone. */
                        var hostedBadge = oldCountry.querySelector(".hon-battle-rank-badge");
                        if (hostedBadge) {
                            hostedBadge.classList.remove("refract-ascension-badge");
                            cards[ci].appendChild(hostedBadge);
                        }
                        oldCountry.parentNode.removeChild(oldCountry);
                    }
                    /* Everything initPerformerCards injects is gone; it can run
                       clean on this card again. */
                }
                try { initPerformerCards(); } catch (e) { /* the observer will */ }
                frontPillsState[1](list);
                if (refractPreviewRefresh) { refractPreviewRefresh(); }
            }

            /* One editor for both strips. `face` picks the list, the catalogue,
               the writer and the cap; everything else is identical, which is
               the point -- the two strips are the same component. */
            /* Three strips, one machine. The dossier's footer joined last and
               was the reason to stop writing `face === "back" ? a : b`. */
            function slotApi(face) {
                if (face === "foot") {
                    return {
                        list: footPills, cat: BACK_STATS, def: backStatDef,
                        max: FOOT_PILLS_MAX, write: writeFootPills
                    };
                }
                if (face === "back") {
                    return {
                        list: backPills, cat: BACK_STATS, def: backStatDef,
                        max: BACK_PILLS_MAX, write: writeBackPills
                    };
                }
                return {
                    list: frontPills, cat: FRONT_STATS, def: frontStatDef,
                    max: FRONT_PILLS_MAX, write: writeFrontPills
                };
            }
            function setPillAt(face, i, key) {
                var a = slotApi(face);
                var next = a.list.slice();
                /* A stat can only be in the strip once, so assigning one that is
                   already somewhere else MOVES it rather than duplicating it.
                   `i` one past the end is the pending "Add stat" slot. */
                var was = next.indexOf(key);
                if (was !== -1 && was !== i) { next.splice(was, 1); if (was < i) { i -= 1; } }
                if (i > next.length) { i = next.length; }
                next[i] = key;
                a.write(next);
            }
            /* C5. A slot's neighbours swap; the menu follows the pill. */
            function movePill(face, i, dir) {
                var a = slotApi(face);
                var j = i + dir;
                if (j < 0 || j >= a.list.length) { return; }
                var next = a.list.slice();
                var t = next[i]; next[i] = next[j]; next[j] = t;
                a.write(next);
                setPillMenu(j);
            }
            function removePillAt(face, i) {
                var a = slotApi(face);
                var next = a.list.slice();
                next.splice(i, 1);
                a.write(next);
            }
            /* Opens the menu for the slot one past the end. Nothing is written
               until a stat is picked: "Add stat" used to append the first free
               stat at once and then ask, so a change of mind cost a Remove. */
            function addPill(face) {
                var a = slotApi(face);
                if (a.list.length >= a.max) { return; }
                setPillMenu(a.list.length);
            }
            function slotChips(face) {
                var a = slotApi(face);
                var pending = pillMenu !== null && pillMenu === a.list.length && a.list.length < a.max;
                if (pillMenu !== null && (a.list[pillMenu] !== undefined || pending)) {
                    var cur = pending ? null : a.list[pillMenu];
                    /* On the back the rating has two forms, and both live HERE
                       now -- as two entries of the one Rating slot -- rather
                       than as a separate radio in the sash corner. That radio
                       and this slot were two controls over one fact: pick Edge
                       there and the Rating slot chip stayed, pointing at a pill
                       that no longer drew. One control, honest chip. */
                    var entries = [];
                    a.cat.forEach(function (st) {
                        if (face === "back" && st.key === "rating") {
                            entries.push({ st: st, mode: "pill", label: "Rating pill" });
                            entries.push({ st: st, mode: "edge", label: "Rating edge meter" });
                        } else {
                            entries.push({ st: st, mode: null, label: st.menu || st.label });
                        }
                    });
                    var menu = entries.map(function (en) {
                        var st = en.st;
                        var isCur = cur !== null && st.key === cur && (en.mode === null || en.mode === ratingDisp);
                        var taken = a.list.indexOf(st.key) !== -1 && st.key !== cur;
                        /* ADDING a stat that is already on the strip would MOVE
                           it -- an "add" gesture that removes a pill. Offered
                           as a disabled option instead, so the strip's contents
                           still read honestly. Moving stays available from the
                           pill that already holds it. */
                        var blocked = pending && taken;
                        return R.createElement("button", {
                            key: st.key + (en.mode || ""),
                            type: "button",
                            className: "refract-cc-chip" + (isCur ? " is-on" : "") + (blocked ? " is-dimmed" : ""),
                            role: "radio",
                            disabled: blocked,
                            "aria-checked": isCur ? "true" : "false",
                            title: blocked
                                ? en.label + " is already on the strip"
                                : (taken ? "Move " + en.label + " to this slot" : en.label),
                            onClick: function () {
                                if (blocked) { return; }
                                if (en.mode) { pickRatingDisp(en.mode); }
                                setPillAt(face, pillMenu, st.key);
                                setPillMenu(null);
                            }
                        }, R.createElement("span", { className: "refract-cc-chip-box" }), en.label);
                    });
                    /* Wrapped in its own grid: eight options centre-wrapped into
                       four ragged rows over the card image, each indented
                       differently, read as accidental. Two even columns read
                       as a list. Remove sits apart underneath, because it is
                       not another value. */
                    var foot = pending
                        ? [R.createElement("button", {
                            key: "__cancel",
                            type: "button",
                            className: "refract-cc-chip refract-cc-chip-swap refract-cc-slot-remove",
                            title: "Add nothing",
                            onClick: function () { setPillMenu(null); }
                        }, R.createElement("span", { className: "refract-cc-chip-box" }), "Cancel")]
                        : [R.createElement("button", {
                            key: "__left",
                            type: "button",
                            className: "refract-cc-chip refract-cc-chip-swap refract-cc-slot-move",
                            disabled: pillMenu === 0,
                            title: "Swap with the pill to its left",
                            onClick: function () { movePill(face, pillMenu, -1); }
                        }, "\u2190 Move left"),
                        R.createElement("button", {
                            key: "__right",
                            type: "button",
                            className: "refract-cc-chip refract-cc-chip-swap refract-cc-slot-move",
                            disabled: pillMenu === a.list.length - 1,
                            title: "Swap with the pill to its right",
                            onClick: function () { movePill(face, pillMenu, 1); }
                        }, "Move right \u2192"),
                        R.createElement("button", {
                            key: "__rm",
                            type: "button",
                            className: "refract-cc-chip refract-cc-chip-swap refract-cc-slot-remove",
                            title: "Take this pill off the strip",
                            onClick: function () { var i = pillMenu; setPillMenu(null); removePillAt(face, i); }
                        }, R.createElement("span", { className: "refract-cc-chip-box" }), "Remove")];
                    /* The menu says WHICH pill it is editing. Opened from the pill
                       itself the connection is already made by the ring around
                       it, but the card is 264px wide and the menu nearly fills
                       it, so the name is what survives at a glance. */
                    var curDef = cur ? a.def(cur) : null;
                    var headText = pending
                        ? "Add which stat?"
                        : ((curDef ? (curDef.menu || curDef.label) : "This pill")
                            + (face === "back" && cur === "rating" && ratingDisp === "edge" ? " (edge)" : ""));
                    return [R.createElement("div", { key: "__menu", className: "refract-cc-slot-menu" + (pending ? " is-pending" : "") },
                        R.createElement("div", { key: "__head", className: "refract-cc-slot-menu-head" }, headText),
                        menu,
                        R.createElement("div", { key: "__foot", className: "refract-cc-slot-menu-foot" }, foot)
                    )];
                }
                /* No slot proxies any more. A row of chips NAMING the pills sat
                   in the band's tray jumbled among the band's own toggles, and
                   picking one opened a big list -- two hops and a vocabulary
                   ("slot") that exists nowhere on the card. The pill on the
                   card is the control now (see pillHits): the band's tray keeps
                   only what belongs to the whole strip. */
                var slots = [];
                if (a.list.length < a.max) {
                    slots.push(R.createElement("button", {
                        key: "__add",
                        type: "button",
                        className: "refract-cc-chip refract-cc-chip-swap",
                        title: "Add another pill to the strip",
                        onClick: function () { addPill(face); }
                    }, R.createElement("span", { className: "refract-cc-chip-box" }), "Add stat"));
                }
                return slots;
            }
            var trayRowsState = R.useState(storedTrayRows);
            var trayRows = trayRowsState[0];
            function pickTrayRows(v) {
                if (trayRows === v) { return; }
                try { localStorage.setItem(TRAY_ROWS_KEY, String(v)); } catch (e) { /* ignore */ }
                scheduleServerSync();
                dropBuiltBacks();
                trayRowsState[1](v);
            }
            var ratingDispState = R.useState(storedRatingDisp);
            var ratingDisp = ratingDispState[0];
            function pickRatingDisp(v) {
                if (ratingDisp === v) { return; }
                try { localStorage.setItem(RATING_DISP_KEY, v); } catch (e) { /* ignore */ }
                scheduleServerSync();
                applyBackClasses();
                dropBuiltBacks();
                ratingDispState[1](v);
            }
            var backSrcState = R.useState(storedBackSrc);
            var backSrc = backSrcState[0];
            var setBackSrcState = backSrcState[1];
            function pickBackSrc(v) {
                if (backSrc === v) { return; }
                try { localStorage.setItem(BACK_SRC_KEY, v); } catch (e) { /* ignore */ }
                scheduleServerSync();
                dropBuiltBacks();
                setBackSrcState(v);
            }
            var studioModeState = R.useState(storedStudioMode);
            var studioMode = studioModeState[0];
            var setStudioModeState = studioModeState[1];
            function pickStudioMode(v) {
                if (studioMode === v) { return; }
                try { localStorage.setItem(STUDIO_MODE_KEY, v); } catch (e) { /* ignore */ }
                scheduleServerSync();
                applyStudioModeClass();
                applyStudioTextPrefix();
                setStudioModeState(v);
            }
            var cardSidesState = R.useState(function () {
                var m = {};
                CARD_ELEMS.forEach(function (d) { if (d.sideKey) { m[d.key] = cardElemSide(d); } });
                m.__layer = tierLayerPref();
                return m;
            });
            var cardSides = cardSidesState[0];
            var setCardSides = cardSidesState[1];

            /* Mirror of Stash's OWN rating system setting. Not a refract
               setting and deliberately not in REFRACT_SYNC_KEYS — it is
               surfaced here only so you don't have to go and find it. */
            var ratingSysState = R.useState(function () {
                return document.body.classList.contains("refract-rating-system-stars") ? "stars" : "decimal";
            });
            var ratingSys = ratingSysState[0];
            var setRatingSys = ratingSysState[1];
            function setRatingSystem(v) {
                if (ratingSys === v) { return; }
                setRatingSys(v);
                /* Stash stores this LOWERCASE and carries a starPrecision
                   alongside the type ({ type: "decimal", starPrecision:
                   "tenth" }), and configureUISetting replaces the whole
                   object. So read it back first and change only the type,
                   otherwise the user's precision is silently clobbered. */
                gql("query { configuration { ui } }")
                    .then(function (res) {
                        var ui = (res && res.data && res.data.configuration
                            && res.data.configuration.ui) || {};
                        var cur = ui.ratingSystemOptions || {};
                        var opts = {};
                        Object.keys(cur).forEach(function (k) { opts[k] = cur[k]; });
                        opts.type = (v === "stars") ? "stars" : "decimal";
                        if (!opts.starPrecision) { opts.starPrecision = "tenth"; }
                        return gqlWithVars(
                            'mutation($v: Any){ configureUISetting(key: "ratingSystemOptions", value: $v) }',
                            { v: opts }
                        );
                    })
                    .then(function () { refractFetchRatingSystem(); })
                    .catch(function () { /* no perms / offline — Stash keeps what it had */ });
            }

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

            function pickPerfCardStyle(style) {
                try { localStorage.setItem(PERF_CARD_STYLE_KEY, style); } catch (e) { /* ignore */ }
                scheduleServerSync();
                applyCardModeClasses();
                setPerfCardStyle(style);
            }

            function pickFlourish(v) {
                try { localStorage.setItem(FLOURISH_KEY, v); } catch (e) { /* ignore */ }
                scheduleServerSync();
                applyCardModeClasses();
                setFlourish(v);
                /* Tier classes are only applied in Extravagant, so the cards
                   have to be re-tagged when this flips either way. Scene cards
                   come from tagFilledRatings; performer cards cannot be
                   re-read and need the captured rating instead. */
                tagFilledRatings();
                retagPerformerTiers();
            }

            function pickCardStyle(style) {
                try { localStorage.setItem(MINIMAL_CARDS_STORAGE_KEY, style); } catch (e) { /* ignore */ }
                scheduleServerSync();
                applyCardStyleClass(style);
                setCardStyle(style);
            }

            function toggleStudioBanner() {
                var next = !studioBannerOn;
                try { localStorage.setItem(STUDIO_BANNER_STORAGE_KEY, next ? "1" : "0"); } catch (e) { /* ignore */ }
                scheduleServerSync();
                applyStudioBannerClass(next);
                setStudioBannerOn(next);
            }

            function togglePluginSortDisabledBottom() {
                var next = !pluginSortDisabledBottomOn;
                try { localStorage.setItem(PLUGIN_SORT_DISABLED_BOTTOM_KEY, next ? "1" : "0"); } catch (e) { /* ignore */ }
                scheduleServerSync();
                setPluginSortDisabledBottomOn(next);
                /* Re-sort immediately so the change is visible if the user is
                   sitting on the Plugins page (FLIP-animated by sortPluginList). */
                try { sortPluginList(); } catch (e) { /* ignore */ }
            }

            function togglePerfCardHover() {
                var next = !perfCardHoverOn;
                try { localStorage.setItem(PERFORMER_CARD_HOVER_KEY, next ? "1" : "0"); } catch (e) { /* ignore */ }
                scheduleServerSync();
                applyPerformerCardHoverClass(next);
                setPerfCardHoverOn(next);
            }

            function toggleCenterControlsHidden() {
                var next = !centerControlsHiddenOn;
                try { localStorage.setItem(HIDE_CENTER_CONTROLS_KEY, next ? "1" : "0"); } catch (e) { /* ignore */ }
                scheduleServerSync();
                applyCenterControlsHiddenClass(next);
                setCenterControlsHiddenOn(next);
            }

            function toggleFilterTags() {
                var next = !filterTagsOn;
                try { localStorage.setItem(SHOW_FILTER_TAGS_KEY, next ? "1" : "0"); } catch (e) { /* ignore */ }
                scheduleServerSync();
                applyFilterTagsShownClass(next);
                setFilterTagsOn(next);
            }


            function toggleCardElem(key) {
                var nextHidden = !cardElems[key];
                try { localStorage.setItem(key, nextHidden ? "1" : "0"); } catch (e) { /* ignore */ }
                scheduleServerSync();
                applyCardElemClasses();
                /* The dossier's category rows are fitted to the room the panel
                   actually has, and switching any other panel off hands it
                   more. Without this the grid kept the row count it was built
                   with and went on claiming "+N more" for rows it now had space
                   to draw. */
                if (key.indexOf("refract.cb") === 0) {
                    Array.prototype.forEach.call(document.querySelectorAll(".refract-card-back"), function (b) {
                        try { refractFitBackStats(b); } catch (e) { /* ignore */ }
                    });
                }
                var m = {};
                CARD_ELEMS.forEach(function (d) {
                    m[d.key] = (d.key === key) ? nextHidden : cardElems[d.key];
                });
                setCardElems(m);
            }

            /* THE RATING BADGE SITS ALONE. It is a solid disc pinned to the
               very point of a corner, so anything else anchored there loses:
               the tier sash puts a diagonal under it, and the studio logo --
               which is often a wide wordmark, not a square mark -- ends up
               shoulder to shoulder with it. The sash and the logo may still
               share, because that crossing is designed and has its own
               over/under control.

               Two corners, three elements, and the rating wanting one to
               itself resolves exactly: the rating in one, the sash and the
               logo together in the other. Whatever you just placed keeps the
               corner you put it in; everything else gives way. Nothing is
               hidden and nothing is lost -- the user asked for "disable the
               rating badge or something", and moving is the version of that
               which you can undo by looking at it. */
            var SCENE_CORNER_KEYS = REFRACT_CORNER_KEYS;
            var RATING_KEY = REFRACT_RATING_KEY;
            /* Which corner an element really occupies: nothing if it is hidden,
               gated off by the flourish, sent to the bottom, or -- for the
               studio -- set as title text, which is not a corner at all. */
            function cornerSideOf(key, sides) {
                var d = elemDef(key);
                if (!d || cardElems[key] || !elemAvailable(d)) { return null; }
                if (key === "refract.scHideStudio" && studioMode === "text") { return null; }
                var sd = sides[key] || d.sideDefault;
                return (sd === "left" || sd === "right") ? sd : null;
            }
            /* Who this placement will shift, so the menu can say so first. */
            /* What the menu PROMISES before you click is the resolver's own
               answer, run on a copy -- not a second, hand-kept summary of it
               that could drift out of step with what actually happens. */
            function displacedBy(key, side) {
                var out = [];
                if (elemGroup !== "scene" || (side !== "left" && side !== "right")) { return out; }
                if (SCENE_CORNER_KEYS.indexOf(key) === -1) { return out; }
                var before = {};
                Object.keys(cardSides).forEach(function (k) { before[k] = cardSides[k]; });
                before[key] = side;
                var after = refractResolveCorners(before, cornerSideOf, key);
                SCENE_CORNER_KEYS.forEach(function (k) {
                    var was = cornerSideOf(k, cardSides);
                    if (k !== key && was !== null && after[k] !== was) { out.push(k); }
                });
                return out;
            }
            function setElemSide(d, side) {
                if (!d.sideKey || cardSides[d.key] === side) { return; }
                var m = {};
                Object.keys(cardSides).forEach(function (k) { m[k] = cardSides[k]; });
                m[d.key] = side;

                if (elemGroup === "scene" && SCENE_CORNER_KEYS.indexOf(d.key) !== -1) {
                    m = refractResolveCorners(m, cornerSideOf, d.key);
                }

                Object.keys(m).forEach(function (k) {
                    if (m[k] === cardSides[k]) { return; }
                    var dd = elemDef(k);
                    if (!dd || !dd.sideKey) { return; }
                    try { localStorage.setItem(dd.sideKey, m[k]); } catch (e) { /* ignore */ }
                });
                scheduleServerSync();
                setCardSides(m);
                applyCardSideClasses();
            }

            /* Presets APPLY, they do not latch: with this many rows most real
               configurations match no preset, so nothing is ever shown as the
               "current" one. They exist mainly so the names people already
               know still get them there in one click. */
            /* Six LOOKS, not six permutations. The old four were three different
               fixes for the same overlap plus one that dropped two pills, so
               four pictures came out nearly identical and the row read as
               decoration. These differ in silhouette:

                 Default     the shipped look, sash across the logo
                 Mirrored    the same card, other hand
                 No clash    logo steps aside, nothing overlaps
                 Logo first  keep the overlap, logo wins
                 Details     no sash, no logo, every fact kept, calm rating
                 Poster      artwork and title, nothing else

               A look sets the FLOURISH too. Without that, every look is stuck
               with tier frames and a sash, and "quiet" is unreachable. */
            /* Six LOOKS, not six permutations. They differ in silhouette, and
               each one is a full statement: elements, sides, layering, the
               flourish AND how the studio is expressed.

                 Default          the shipped look, sash across the logo
                 Studio in title  the studio becomes text, freeing the corner
                 No clash         logo steps aside, both stay in corners
                 Logo first       keep the overlap, logo wins
                 Details          no sash, no logo, every fact kept, calm rating
                 Poster           artwork and title, nothing else

               "Mirrored" was dropped: the defaults are rating left, ribbon
               right, studio right, and it set exactly the opposite of each,
               which is precisely what placing each of them once already does.
               It was a shortcut to three clicks, not a look.

               Three of these answer the same conflict, the sash crossing the
               logo, in three genuinely different ways: move the logo, reorder
               the two, or stop making the studio a logo at all. */
            /* `tip` is one sentence per card type, what the look changes: a
               row of six pictures with the one tooltip "sets every element"
               left the difference between Default and Logo first to a squint.
               `pills` (performer only) is the front strip's stat selection;
               a look that carries one lands on a definite strip. */
            var CARD_PRESETS = [
                { label: "Default", hide: [], sides: {}, layer: "ribbon",
                  flourish: "extravagant", studio: "logo",
                  pills: FRONT_PILLS_DEFAULT.slice(),
                  tip: { scene: "Everything on: rating badge left, tier sash and studio logo right, performers and counts in the chin. Extravagant.",
                         performer: "Everything on: name banner, tier sash, country, and the four default stat pills. Extravagant." } },
                { label: "Studio in title", hide: [], sides: {}, layer: "ribbon",
                  flourish: "extravagant", studio: "text",
                  tip: { scene: "The studio's name goes before the title, so the corner logo is gone and the sash has the top right to itself.",
                         performer: "" } },
                { label: "No clash", hide: [], sides: { "refract.scHideStudio": "left" },
                  layer: "ribbon", flourish: "extravagant", studio: "logo",
                  tip: { scene: "Studio logo moved to the top left, so it never sits under the tier sash.",
                         performer: "" } },
                { label: "Logo first", hide: [], sides: {}, layer: "logo",
                  flourish: "extravagant", studio: "logo",
                  tip: { scene: "Same corners as Default, but the studio logo is drawn OVER the sash instead of under it.",
                         performer: "" } },
                { label: "Details", sides: {}, layer: "ribbon", flourish: "minimal", studio: "logo",
                  hide: ["refract.scHideTier", "refract.scHideStudio", "refract.pcHideTier"],
                  tip: { scene: "No sash, no studio logo, but performers, duration and counts stay. Sets the flourish to Minimal.",
                         performer: "No sash; name, country and stats stay. Sets the flourish to Minimal." } },
                { label: "Poster", sides: {}, layer: "ribbon", flourish: "minimal", studio: "logo",
                  hide: ["refract.scHideTier", "refract.scHideStudio", "refract.scHideDuration",
                         "refract.scHidePerformers", "refract.scHideOCount", "refract.scHideTagCount",
                         "refract.scHideDate", "refract.scHideResolution",
                         "refract.pcHideTier", "refract.pcHideCountry", "refract.pcHideStats",
                         "refract.pcHideRank"],
                  tip: { scene: "Just the image and the title. Rating stays. Sets the flourish to Minimal.",
                         performer: "Just the image and the name. Sets the flourish to Minimal." } },
                /* Performer only: the strip carries body facts instead of
                   library counts. Signatures on the scene tab include no
                   pills, so there it dedupes into Default. */
                { label: "Vitals", hide: [], sides: {}, layer: "ribbon",
                  flourish: "extravagant", studio: "logo",
                  pills: ["height", "measure", "career", "scenes"],
                  tip: { scene: "",
                         performer: "Everything on, with the strip showing height, measurements, career and scene count." } }
            ];
            /* A look sets THIS tab's card and nothing else. It used to write
               every CARD_ELEMS key regardless of group: "Poster" on the Scene
               tab hid the performer card's tier, country and stats; "Default"
               on the Performer tab un-hid the scene's studio, reset every scene
               side and forced the studio back to a logo. Two tabs labelled as
               two cards, looks that behaved as one global preset, and nothing
               on screen said the other tab had moved.

               The one thing a look may still change outside its card is the
               flourish, because Minimal/Extravagant is the difference between
               "Details" and "Default" -- and the look's title says so. */
            function applyCardPreset(p) {
                var elemMap = {};
                Object.keys(cardElems).forEach(function (k) { elemMap[k] = cardElems[k]; });
                CARD_ELEMS.forEach(function (d) {
                    if (d.group !== elemGroup) { return; }
                    var hidden = p.hide.indexOf(d.key) !== -1;
                    try { localStorage.setItem(d.key, hidden ? "1" : "0"); } catch (e) { /* ignore */ }
                    elemMap[d.key] = hidden;
                });
                var sideMap = {};
                Object.keys(cardSides).forEach(function (k) { sideMap[k] = cardSides[k]; });
                CARD_ELEMS.forEach(function (d) {
                    if (d.group !== elemGroup || !d.sideKey) { return; }
                    var s = p.sides[d.key] || d.sideDefault;
                    try { localStorage.setItem(d.sideKey, s); } catch (e) { /* ignore */ }
                    sideMap[d.key] = s;
                });
                if (elemGroup === "scene") {
                    try { localStorage.setItem(TIER_LAYER_KEY, p.layer); } catch (e) { /* ignore */ }
                    sideMap.__layer = p.layer;
                    if (p.studio) { pickStudioMode(p.studio); }
                }
                if (elemGroup === "performer" && p.pills && p.pills.join(",") !== frontPills.join(",")) {
                    writeFrontPills(p.pills.slice());
                }
                if (p.flourish && p.flourish !== flourish) { pickFlourish(p.flourish); }
                scheduleServerSync();
                applyCardElemClasses();
                applyCardSideClasses();
                setCardElems(elemMap);
                setCardSides(sideMap);
            }




            /* The tier ribbon IS a tier flourish, so it only exists in
               Extravagant — listing it under Minimal would be a dead row. */
            /* TWO answers, not five. Either the element does not exist in this
               configuration at all -- a Classic-only element under Refract, a
               plugin you have not installed, the dossier's panels on a gallery
               back -- in which case nothing is drawn, because a control for a
               card you are not looking at is noise. Or it exists and something
               is BLOCKING it, in which case it keeps its place in the tray,
               greyed, saying why in one line.

               Everything that cannot act now renders that second way: the tier
               sash under Minimal, the tray settings under Mirror, a stat
               already on the strip, the Dossier look on a library with no
               category ratings. Previously each of those invented its own
               look, its own wording and, in one case, its own position. */
            function elemState(d) {
                if (d.noop) { return null; }
                /* The name banner is a Refract-layout element; in Classic it is
                   display:none, so a chip for it would ring a corner and do
                   nothing -- the exact defect the no-op Rating banner had. */
                if (d.key === "refract.pcHideName" && perfCardStyle !== "refract") { return null; }
                if (d.classicOnly && cardStyle !== "classic") { return null; }
                if (d.plugin === "ascension" && !document.body.classList.contains("refract-has-ascension")) { return null; }
                if (d.dossier && !(editingBack && backStyle === "dossier")) { return null; }
                /* The mirror side of the same statement. These three are parts
                   of the gallery/mirror anatomy and the dossier draws none of
                   them; until now nothing SAID so -- they were kept off it by
                   the accident that the dossier is offered different bands, an
                   implicit rule doing a gate's job. */
                if (d.gallery && (!editingBack || backStyle === "dossier")) { return null; }
                if (d.tier && flourish !== "extravagant") {
                    return { blocked: true, reason: "Needs the Extravagant rating flourish" };
                }
                return { blocked: false, reason: null };
            }
            function elemAvailable(d) {
                var st = elemState(d);
                return !!st && !st.blocked;
            }


            /* == Corner touch ==========================================
               The card IS the control surface. Each quadrant owns the
               elements that sit in that corner: hovering one rings it and
               floats those elements as chips, and clicking a chip toggles the
               element. This replaces the six-row element list outright, which
               is why no list appears anywhere below. */
            /* "Studio logo" is the wrong word for it once it is text. */
            function elemLabel(d) {
                if (d.key === "refract.scHideStudio" && studioMode === "text") { return "Studio name"; }
                return d.label;
            }
            /* THE TOP EDGE IS ONE BAND. Three elements live along it -- the
               rating badge, the tier sash and the studio -- and each of them
               can sit in either top corner, so splitting the edge into two
               bands made the ROSTER move every time you moved an element. The
               top-right corner would offer one lonely chip while the other two
               hid in the top-left, and setting the studio to title text emptied
               it out of the top altogether.

               A band answers "what does the card show up here", which does not
               change when something slides from one corner to the other. WHERE
               a thing sits, and what form it takes, is the thing's own
               business -- click it and its menu says so. Wide area toggles;
               focused element places.

               The one element that genuinely leaves the top edge is the studio
               sent to the bottom-right corner: that is a different part of the
               card, so its chip goes with it. As title text it stays here,
               because the title row is where the top edge overflows to and
               because otherwise there is no way back to a logo. */
            function zoneOfElem(d) {
                if (ELEM_ZONE_FIXED[d.key]) { return ELEM_ZONE_FIXED[d.key]; }
                if (cardSides[d.key] === "bottom") { return "br"; }
                return "top";
            }
            function elemsInZone(z) {
                return CARD_ELEMS.filter(function (d) {
                    return d.group === elemGroup && elemState(d) && zoneOfElem(d) === z;
                });
            }
            /* `swapTopCorners` lived here. Deleted: placing one element already
               moves whatever it displaces out of the way, so a single pick in
               an element's own menu IS the swap -- and this chip was rendered
               into BOTH top trays, so the same action appeared twice. A control
               from before elements had menus of their own. */
            /* One element's own controls, opened by clicking the element on the
               card. Everything here acts on THAT element and says its name, so
               "Move to bottom corner" can no longer be a chip in a shared tray
               that three elements were sitting in. */
            var SIDE_LABEL = { left: "Top left", right: "Top right", bottom: "Bottom right" };
            function elemDef(key) {
                for (var i = 0; i < CARD_ELEMS.length; i++) {
                    if (CARD_ELEMS[i].key === key) { return CARD_ELEMS[i]; }
                }
                return null;
            }
            /* Has this element anything to say that its tray chip cannot?
               Only a place to sit or a form to take. Hiding is the ROSTER's
               job, and the roster is the load-bearing home because a tray chip
               can act on an element that is not drawn -- Tag count on a scene
               with no tags, Country on a performer with none. You cannot click
               what is not there, so the menu is the duplicate that goes. */
            function elemHasMenu(d) {
                if (!d) { return false; }
                if (d.key === "refract.scHideStudio") { return true; }
                return !!d.sideKey;
            }
            function elemActionMenu(d) {
                var rows = [];
                var isStudio = d.key === "refract.scHideStudio";
                /* Where it sits. This is the only place placement is asked,
                   and it asks about ONE element -- the old shared chip moved
                   every top-edge element at once and could not name what it
                   was about to move. */
                var placeRows = rows, formRows = [];
                if (d.sideKey && !(isStudio && studioMode === "text")) {
                    var sides = d.sides || ["left", "right"];
                    var cur = cardSides[d.key] || d.sideDefault;
                    sides.forEach(function (sd) {
                        placeRows.push(R.createElement("button", {
                            key: "side-" + sd,
                            type: "button",
                            className: "refract-cc-chip" + (cur === sd ? " is-on" : ""),
                            role: "radio",
                            "aria-checked": cur === sd ? "true" : "false",
                            title: (function () {
                                var t = "Put " + elemLabel(d).toLowerCase() + " in the " + SIDE_LABEL[sd].toLowerCase() + " corner";
                                var moved = displacedBy(d.key, sd).map(function (k) {
                                    return elemLabel(elemDef(k)).toLowerCase();
                                });
                                if (moved.length) { t += ", moving " + moved.join(" and ") + " across"; }
                                return t;
                            })(),
                            onClick: function () { setElemSide(d, sd); elemMenuState[1](null); }
                        }, R.createElement("span", { className: "refract-cc-chip-box" }), SIDE_LABEL[sd]));
                    });
                }
                /* The studio is the one element with a FORM as well as a place:
                   a logo in a corner, or its name set before the title. */
                if (isStudio) {
                    [["logo", "Logo"], ["text", "Title text"]].forEach(function (o) {
                        formRows.push(R.createElement("button", {
                            key: "mode-" + o[0],
                            type: "button",
                            className: "refract-cc-chip" + (studioMode === o[0] ? " is-on" : ""),
                            role: "radio",
                            "aria-checked": studioMode === o[0] ? "true" : "false",
                            title: o[0] === "text"
                                ? "Set the studio's name before the scene title instead"
                                : "Put the studio back in a corner as its logo",
                            onClick: function () { pickStudioMode(o[0]); elemMenuState[1](null); }
                        }, R.createElement("span", { className: "refract-cc-chip-box" }), o[1]));
                    });
                }
                /* Two questions, asked as two. They were five identical
                   squares with two ticks and no headings, and picking a form
                   silently deleted the placement question. */
                var groups = [];
                var grp = function (k, head, rows) {
                    if (!rows.length) { return; }
                    groups.push(R.createElement("div", { key: k + "h", className: "refract-cc-menu-sub" }, head));
                    /* `display: contents`, so the menu's grid still lays the
                       buttons out itself while a screen reader hears one named
                       group of radios rather than four loose ones. */
                    groups.push(R.createElement("div", {
                        key: k, className: "refract-cc-menu-grp", role: "radiogroup",
                        "aria-label": elemLabel(d) + ": " + head.toLowerCase()
                    }, rows));
                };
                grp("__where", "Where", placeRows);
                grp("__as", "As", formRows);
                return [R.createElement("div", { key: "__emenu", className: "refract-cc-slot-menu is-elem" },
                    R.createElement("div", { key: "__head", className: "refract-cc-slot-menu-head" }, elemLabel(d)),
                    groups
                )];
            }
            function zoneChips(z) {
                /* A focused element owns the tray while its menu is open. */
                var fd = elemMenu ? elemDef(elemMenu) : null;
                if (fd && zoneOfElem(fd) === z) { return elemActionMenu(fd); }
                /* Which picture the back uses. A radio, not toggles: exactly
                   one source is in use, and the whole point of it is that the
                   back can differ from the front.

                   Offered in TWO places because the picture is in two places.
                   On the gallery it is the card, so it is that band. On the
                   dossier it is the portrait in the hero row (the full-card
                   wash behind the panels is the same photo, blurred), so it
                   joins that band -- and until now it was offered on the
                   dossier NOWHERE, which meant changing the picture of the
                   default back meant switching looks twice to do it. */
                function backSrcChips() {
                    return [
                        ["portrait", "Portrait"],
                        ["scene", "Top scene"],
                        ["photo", "Top photo"]
                    ].map(function (o) {
                        return R.createElement("button", {
                            key: "src-" + o[0],
                            type: "button",
                            className: "refract-cc-chip" + (backSrc === o[0] ? " is-on" : ""),
                            role: "radio",
                            "aria-checked": backSrc === o[0] ? "true" : "false",
                            title: "Use the " + o[1].toLowerCase() + " as the back's picture",
                            onClick: function () { pickBackSrc(o[0]); }
                        }, R.createElement("span", { className: "refract-cc-chip-box" }), o[1]);
                    });
                }
                if (z === "img") { return backSrcChips(); }
                if (z === "tray") {
                    /* Mirror is the tray OFF. Its two settings survive so the
                       gallery you had comes back intact when you switch look,
                       but they cannot act while there is no tray, so they say
                       so instead of writing invisibly. */
                    var trayOff = !trayOn;
                    return [
                        ["__tray", "Tray", trayOn, function () { pickTrayOn(!trayOn); }],
                        ["__photos", "Photos in tray", trayPhotos, function () { pickTrayPhotos(!trayPhotos); }],
                        ["__rows", "Two rows", trayRows === 2, function () { pickTrayRows(trayRows === 2 ? 1 : 2); }]
                    ].map(function (o) {
                        /* The two tray SETTINGS cannot act while there is no
                           tray (the Mirror look). Disabled with a reason, the
                           way the Minimal tier chip is -- they used to write
                           silently to a hidden element. */
                        var dead = trayOff && o[0] !== "__tray";
                        return R.createElement("button", {
                            key: o[0],
                            type: "button",
                            className: "refract-cc-chip" + (dead ? " is-dimmed" : (o[2] ? " is-on" : "")),
                            role: "switch",
                            "aria-checked": (!dead && o[2]) ? "true" : "false",
                            "aria-disabled": dead ? "true" : undefined,
                            disabled: dead,
                            title: dead ? "Needs the tray. Switch Tray on, or pick the Gallery look." : undefined,
                            onClick: function () { if (!dead) { o[3](); } }
                        }, R.createElement("span", { className: "refract-cc-chip-box" }), o[1]);
                    });
                }
                /* Every pill is its own control. The chips sit in a centred
                   row directly over the strip, one per slot and in the same
                   order, so clicking the chip reads as clicking the pill under
                   it. Seven on/off toggles could express the same SET but never
                   the same order, and framed the job as choosing what to hide.
                   Its on/off chip joins them below, the way the front's does --
                   the back's band used to return slot chips and NOTHING else,
                   so the one thing you could not do to the back's strip was
                   turn it off. */
                if (editingBack && z === "bottom" && pillMenu !== null && stripFaceOf(z)) { return slotChips("back"); }
                var chips = elemsInZone(z).map(function (d) {
                    var st = elemState(d) || { blocked: false };
                    var shown = !cardElems[d.key];
                    /* Blocked chips do NOT also read as on. One tick meant two
                       things -- "this is showing" and "this is permitted" --
                       and Mirror's tray showed a ticked, disabled, excused chip
                       for a tray that was not there. */
                    return R.createElement("button", {
                        key: d.key,
                        type: "button",
                        className: "refract-cc-chip"
                            + (st.blocked ? " is-dimmed" : (shown ? " is-on" : ""))
                            /* Hovering the thing on the card lights its chip,
                               and hovering the chip lights the thing. The two
                               halves of one control were never joined, so in a
                               corner holding three elements you had to read
                               labels to learn which chip was which. */
                            + (elemHover === d.key ? " is-linked" : ""),
                        role: "switch",
                        disabled: st.blocked,
                        "aria-checked": (!st.blocked && shown) ? "true" : "false",
                        "aria-disabled": st.blocked ? "true" : undefined,
                        title: st.blocked ? st.reason : undefined,
                        "aria-label": elemLabel(d) + ", " + (d.group === "scene" ? "scene card" : "performer card"),
                        onMouseEnter: function () { if (!st.blocked) { elemHoverState[1](d.key); } },
                        onMouseLeave: function () { elemHoverState[1](null); },
                        onClick: function () { if (!st.blocked) { toggleCardElem(d.key); } }
                    }, R.createElement("span", { className: "refract-cc-chip-box" }), elemLabel(d));
                });
                /* The tier-under-Minimal chip used to be appended HERE, after
                   every other chip, so a blocked element also changed position
                   -- the tray silently reordered itself to encode a state. It
                   is rendered in place above, like any other chip. */
                /* The studio's "Move to bottom corner" and "Show as text" chips
                   used to sit HERE, in the corner's shared tray, next to the
                   Tier ribbon and Rating banner toggles -- so the tray offered
                   "Move to bottom corner" with nothing saying which of the
                   three elements it would move. They live in the studio's own
                   menu now, reached by clicking the studio on the card. */
                /* The performer FRONT's bottom band: Country and the strip
                   as toggles, and -- while the strip is shown, in the Refract
                   layout -- one chip per slot, exactly as on the back. */
                if (!editingBack && previewKind === "performer" && z === "bottom"
                        && perfCardStyle === "refract" && !cardElems["refract.pcHideStats"]) {
                    if (pillMenu !== null) { return slotChips("front"); }
                    chips = chips.concat(slotChips("front"));
                }
                /* Same shape on the back: the strip's own switch, then a chip
                   per slot -- and no slots offered once the strip is off,
                   because a list of what a hidden strip would carry is a
                   control that cannot be seen to work. */
                if (editingBack && z === "bottom" && stripFaceOf(z)) {
                    chips = chips.concat(slotChips("back"));
                }
                /* The dossier's hero row holds the visible copy of the back's
                   picture, so the picture's source is asked here -- the panel's
                   own switch first, then which photo it shows. */
                if (z === "dhero") { chips = chips.concat(backSrcChips()); }
                /* And its footer is a strip like the other two: the panel's own
                   switch, then Add. Each item on the card is its own control,
                   the same as every pill. */
                if (z === "dfoot" && stripFaceOf(z)) {
                    if (pillMenu !== null) { return slotChips("foot"); }
                    chips = chips.concat(slotChips("foot"));
                }
                return chips;
            }
            /* Can a pill on the drawn strip be edited? The back's strip always
               can (its band only exists on the gallery/mirror looks); the
               front's needs the Refract layout and a shown strip. Both the hit
               targets and the rail's hint read this, so they cannot disagree. */
            /* WHICH STRIP a band edits, or null. One question asked once,
               because there are three strips now and every place that used to
               test `zone === "bottom"` had its own idea of which one that was.
               A strip that is switched off is not editable: a list of what a
               hidden strip would carry is a control you cannot see work. */
            function stripFaceOf(z) {
                if (z === "bottom") {
                    if (editingBack) {
                        return (backStyle === "dossier" || cardElems["refract.mbHideStats"])
                            ? null : "back";
                    }
                    return (previewKind === "performer" && perfCardStyle === "refract"
                        && !cardElems["refract.pcHideStats"]) ? "front" : null;
                }
                if (z === "dfoot") {
                    return (editingBack && backStyle === "dossier"
                        && !cardElems["refract.cbHideFoot"]) ? "foot" : null;
                }
                return null;
            }
            function pillStripEditable() { return !!stripFaceOf(zone); }
            function cornerLayer() {
                /* A performer card's top-left holds nothing toggleable now that
                   the no-op rating is gone, and ringing an empty corner
                   promises a control that never appears. */

                /* One new zone the front never needed: the image itself. It is
                   the only element on the back that is a CHOICE rather than a
                   toggle, so its chips behave as a radio row. */
                /* The back has no top-left zone: the name banner lives there and
                   is never toggleable, exactly as on the front. */
                /* Order is DOM order, and these overlap: the image band runs
                   the full width across the top, and the sash corner sits ON
                   it. Later wins, so the corner has to come second or the
                   band swallows it. */
                /* The bands describe the GALLERY's anatomy. The dossier has
                   its own fixed layout with nothing to move, so it is offered
                   no regions rather than regions that would lie. */
                /* The bands describe the GALLERY's anatomy. The dossier has
                   its own fixed layout with nothing to move, so it is offered
                   no regions rather than regions that would lie. */
                var zones = editingBack
                    /* The gallery back mirrors the front's anatomy, so it
                       gets the front's bands: the picture, the name strip over
                       its top-left, the sash corner, the tray, the strip. "img"
                       comes FIRST because it runs the full width of the top and
                       the other two sit ON it -- later wins, and a band that
                       swallows its neighbours is the defect this order exists
                       to avoid. The name band was the last piece missing: its
                       chip pointed at a band the back never offered, so the
                       switch existed and could not be reached. */
                    ? (backStyle === "dossier" ? ["dhead", "dhero", "dmedia", "dfoot"] : ["img", "tl", "tr", "tray", "bottom"])
                    : (previewKind === "performer"
                        /* The performer front has exactly two places anything
                           can be moved: the sash in the top-right corner, and
                           the country + stats band across the bottom. Four
                           quadrants promised control in two corners that hold
                           nothing -- the top-left offered no chips at all. */
                        ? ["tl", "tr", "edge", "bottom"]
                        : ["top", "bl", "br"]);
                /* Built ONCE per zone, then used twice: to drop bands that
                   have nothing to offer, and to render the armed one. A zone
                   whose chips all gate away (the performer card's top-left
                   under the Classic layout) used to keep a tabbable hit that
                   announced "show its controls" and then showed none -- the
                   no-op Rating chip's defect, one level up. */
                var zoneChipMap = {};
                zones.forEach(function (z) { zoneChipMap[z] = zoneChips(z); });
                zones = zones.filter(function (z) {
                    /* The strip's band survives on the strength of the PILLS.
                       At the 6-pill cap "Add stat" correctly disappears, and on
                       the back that was the band's only chip -- so the band was
                       dropped and the strip could never be armed, edited,
                       reordered or emptied again. Three clicks into a dead end
                       whose only exit was Reset. */
                    /* NOT gated on pillBoxes: those are only measured while
                       the zone is ARMED, and the zone cannot be armed if this
                       filter has already dropped it -- the first attempt at
                       this fix deadlocked on exactly that. Editability is the
                       honest test and needs no measurement. */
                    if (stripFaceOf(z)) { return true; }
                    return zoneChipMap[z].length > 0;
                });
                var chips = (zone && zoneChipMap[zone]) ? zoneChipMap[zone] : [];
                /* Hover is the fast path; focus, Enter/Space and a tap all
                   LATCH the band (holdZone, no grace period), so the editor
                   works without a pointer that hovers. */
                var ZONE_NAMES = {
                    tl: "Top left corner", tr: "Top right corner",
                    bl: "Bottom left corner", br: "Bottom right corner",
                    bottom: "Bottom band", img: "Image band", tray: "Tray band",
                    dmedia: "Media strip", dfoot: "Collector footer"
                };
                var hits = zones.map(function (z) {
                    return R.createElement("div", {
                        key: z,
                        className: "refract-cc-hit refract-cc-hit-" + z,
                        role: "button",
                        tabIndex: 0,
                        "aria-label": (ZONE_NAMES[z] || z) + ": show its controls",
                        onMouseEnter: function () { enterZone(z); },
                        onFocus: function () { holdZone(z); },
                        onClick: function () { holdZone(z); },
                        onKeyDown: function (e) {
                            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); holdZone(z); }
                        }
                    });
                });
                /* A base shield under the bands, covering the whole card.

                   The bands do not tile it: four 44%-tall quadrants left a 39px
                   horizontal gap down the middle, and a scene card's zones left
                   31px. The pointer reaching the CARD through that gap is what
                   started Stash's hover preview -- the scene began playing
                   mid-edit, which is why the scene card felt uneditable. It also
                   let the card's own hover chrome fire under the editor.

                   With the shield the pointer can never touch the card while the
                   customiser is open, and the bands are free to be exactly the
                   size of what they point at instead of being stretched to meet
                   each other. Entering it clears the band, through the same
                   grace period as any other switch. */
                hits.unshift(R.createElement("div", {
                    key: "__shield",
                    className: "refract-cc-hit refract-cc-hit-shield",
                    onMouseEnter: function () { enterZone(null); }
                }));
                /* One hit per drawn pill, laid exactly over it. Above the band
                   it sits in, below the tray. Hovering a pill HOLDS the band
                   (the grace timer would otherwise treat the pill as leaving
                   it), and clicking one opens that pill's own menu. */
                /* Gated exactly as the MENU is gated in zoneChips. Under the
                   Classic performer layout the hits used to render over the
                   plain stat text -- tabbable, ringed on hover, and opening
                   nothing, because the menu is Refract-layout only. */
                var z0 = zone;
                var pillFace = stripFaceOf(zone);
                var pillsLive = pillFace ? pillBoxes : [];
                var pillHits = pillsLive.map(function (b, di) {
                    /* `b.i` is the SLOT; `di` is merely where it happens to be
                       drawn. They differ whenever a stat this performer lacks
                       leaves a gap in the middle of the strip. */
                    var i = (b.i === undefined) ? di : b.i;
                    var open = pillMenu === i;
                    var z0 = zone;
                    return R.createElement("button", {
                        key: "__pill" + i,
                        type: "button",
                        className: "refract-cc-pill-hit" + (open ? " is-open" : ""),
                        style: { left: b.left + "px", top: b.top + "px", width: b.width + "px", height: b.height + "px" },
                        title: open ? "Close" : "Change what this shows",
                        /* "of" counts the SLOTS, not the ones that happen to
                           be drawn: with a stat this performer lacks in the
                           middle, five drawn cells announced themselves as
                           "Slot 6 of 5". */
                        "aria-label": "Slot " + (i + 1) + " of " + slotApi(pillFace).list.length
                            + ": change what it shows",
                        "aria-expanded": open ? "true" : "false",
                        onMouseEnter: function () { holdZone(z0); pillHoverState[1](di); },
                        onMouseLeave: function () { pillHoverState[1](null); },
                        onFocus: function () { holdZone(z0); pillHoverState[1](di); },
                        onBlur: function () { pillHoverState[1](null); },
                        onClick: function (e) {
                            e.preventDefault(); e.stopPropagation();
                            elemMenuState[1](null);
                            setPillMenu(open ? null : i);
                        }
                    });
                });
                /* On the pills, the light contracts to the PILLS. The band's
                   ring frames country + strip + the padding between them, which
                   is the right subject while you are choosing a band -- but the
                   moment the pointer is on a pill, that box is bigger than
                   anything you can act on. Since the scrim IS this ring's
                   box-shadow, moving the ring tightens the lit area with it.
                   The whole ROW, not the single pill: sweeping across four
                   pills would otherwise redraw the scrim four times, and the
                   pill you are on already has its own ring. */
                /* One hit per drawn element of this band -- the pill idea, one
                   level up. The band's tray keeps the on/off toggles (you
                   cannot click an element that is not drawn); everything about
                   a PARTICULAR element is behind the element itself. */
                var elemHits = [];
                Object.keys(elemBoxes).forEach(function (k) {
                    var b = elemBoxes[k];
                    var d = elemDef(k);
                    if (!d) { return; }
                    var open = elemMenu === k;
                    elemHits.push(R.createElement("button", {
                        key: "__el" + k,
                        type: "button",
                        className: "refract-cc-elem-hit" + (open ? " is-open" : "")
                            + (elemHasMenu(d) ? "" : " is-plain"),
                        style: { left: b.left + "px", top: b.top + "px", width: b.width + "px", height: b.height + "px" },
                        title: elemHasMenu(d)
                            ? (open ? "Close" : elemLabel(d) + " - where it sits, and how")
                            : elemLabel(d),
                        "aria-label": elemHasMenu(d)
                            ? elemLabel(d) + ": choose where it sits"
                            : elemLabel(d),
                        "aria-expanded": elemHasMenu(d) ? (open ? "true" : "false") : undefined,
                        onMouseEnter: function () { holdZone(z0); elemHoverState[1](k); },
                        onMouseLeave: function () { elemHoverState[1](null); },
                        onFocus: function () { holdZone(z0); elemHoverState[1](k); },
                        onBlur: function () { elemHoverState[1](null); },
                        onClick: function (e) {
                            e.preventDefault(); e.stopPropagation();
                            /* Hide-only elements have no menu now: the hit still
                               lights the element so the tray chip has a face,
                               but the switch lives in one place. */
                            if (!elemHasMenu(d)) { return; }
                            setPillMenu(null);
                            elemMenuState[1](open ? null : k);
                        }
                    }));
                });

                var ringStyle = null;
                var focusEl = elemMenu || elemHover;
                if (focusEl && elemBoxes[focusEl]) {
                    var fb = elemBoxes[focusEl];
                    var fp = 4;
                    ringStyle = {
                        left: (fb.left - fp) + "px",
                        top: (fb.top - fp) + "px",
                        width: (fb.width + fp * 2) + "px",
                        height: (fb.height + fp * 2) + "px",
                        right: "auto",
                        bottom: "auto",
                        borderRadius: "10px"
                    };
                } else if (pillsLive.length && (pillHover !== null || pillMenu !== null)) {
                    var x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
                    pillsLive.forEach(function (b) {
                        if (b.left < x1) { x1 = b.left; }
                        if (b.top < y1) { y1 = b.top; }
                        if (b.left + b.width > x2) { x2 = b.left + b.width; }
                        if (b.top + b.height > y2) { y2 = b.top + b.height; }
                    });
                    var pad = 4;
                    ringStyle = {
                        left: (x1 - pad) + "px",
                        top: (y1 - pad) + "px",
                        width: (x2 - x1 + pad * 2) + "px",
                        height: (y2 - y1 + pad * 2) + "px",
                        right: "auto",
                        bottom: "auto",
                        borderRadius: "999px"
                    };
                }

                /* First open this session: every band's ring pulses once, in
                   sequence, so the card announces itself as the control
                   surface. Nothing else on screen says "hover the card". */
                var introRings = introOn ? zones.map(function (z, i) {
                    return R.createElement("div", {
                        key: "__intro-" + z,
                        className: "refract-cc-ring refract-cc-ring-" + z + " is-intro",
                        style: { animationDelay: (i * 140) + "ms" }
                    });
                }) : null;
                return R.createElement("div", {
                    className: "refract-cc-corners",
                    onMouseLeave: function () {
                        setZone(null); setPillMenu(null); pillHoverState[1](null);
                        elemMenuState[1](null); elemHoverState[1](null);
                    }
                },
                    hits,
                    pillHits,
                    elemHits,
                    introRings,
                    (chips.length || pillsLive.length) ? R.createElement("div", {
                        className: "refract-cc-ring refract-cc-ring-" + zone
                            + (ringStyle ? " is-tight" : ""),
                        style: ringStyle || undefined
                    }) : null,
                    chips.length ? R.createElement("div", {
                        className: "refract-cc-chips refract-cc-chips-" + zone,
                        onMouseEnter: function () { holdZone(zone); },
                        onMouseMove: function () { holdZone(zone); }
                    }, chips) : null
                );
            }

            /* == The four global settings, as tiles beside the card =====
               Deliberately narrow and titled only, so they read as secondary
               to the card. Every one is a two-value segmented control, which
               is why the hover switch became On / Off. */
            function segTile(id, title, opts, value, onPick, note) {
                return R.createElement("div", { className: "refract-cc-tile", id: id },
                    R.createElement("div", { className: "refract-cc-tile-title" }, title),
                    note ? R.createElement("div", { className: "refract-cc-tile-note" }, note) : null,
                    R.createElement("div", { className: "refract-cc-seg" },
                        opts.map(function (o) {
                            return R.createElement("button", {
                                key: o[0],
                                type: "button",
                                className: "refract-cc-seg-btn" + (value === o[0] ? " is-active" : ""),
                                "aria-pressed": value === o[0] ? "true" : "false",
                                onClick: function () { onPick(o[0]); }
                            }, o[1]);
                        })
                    )
                );
            }
            /* Beside the card: only what belongs to THIS card. Everything that
               reaches both cards (or past them) used to sit here too, under a
               tab named for one card, so "Rating flourish" on the Scene tab
               looked like a scene setting and quietly changed the performer
               card. Those live in the "Both cards" strip below the stage now.

               No "Rating display" tile on the back either. It was the same
               choice as the Rating slot's menu, under a third name -- one
               setting, two controls, two vocabularies. */
            function settingTiles() {
                if (editingBack || previewKind !== "scene") {
                    return [segTile("plugin-refract-perf-card-style", "Performer card style",
                        [["refract", "Refract"], ["classic", "Classic"]], perfCardStyle, pickPerfCardStyle,
                        perfCardStyle === "refract"
                            ? "Name banner, stat pills, and the card back."
                            : "Stash's own layout. No name banner, no card back.")];
                }
                return [segTile("plugin-refract-card-style", "Scene card style",
                    [["refract", "Refract"], ["classic", "Classic"]], cardStyle, pickCardStyle,
                    cardStyle === "refract"
                        ? "Tidier chin: the description is hidden."
                        : "Stash's own layout, with the description.")];
            }
            /* The settings that reach both cards, or past them, in one strip
               that says so. Not per tab: the tab is which card you are
               editing, and these do not care. */
            /* One strip, two labelled groups: "This card" (the tab's card, so
               the head names it) and "Both cards". The per-card tile used to
               sit beside the card in its own column, which with one tile left
               was a tile floating in a void beside a 395px card. */
            function bothCardsStrip() {
                var thisCard = (editingBack || previewKind !== "scene") ? "Performer card" : "Scene card";
                return R.createElement("div", { className: "refract-cc-strip" },
                    R.createElement("div", { className: "refract-cc-group refract-cc-group-this" },
                        R.createElement("div", { className: "refract-cc-group-head" },
                            R.createElement("span", null, thisCard)),
                        R.createElement("div", { className: "refract-cc-group-tiles" }, settingTiles())
                    ),
                    R.createElement("div", { className: "refract-cc-group refract-cc-group-both" },
                        R.createElement("div", { className: "refract-cc-group-head" },
                            R.createElement("span", null, "Both cards"),
                            R.createElement("button", {
                                type: "button",
                                className: "refract-cc-reset",
                                title: "Put every card setting back to how Refract ships it",
                                onClick: resetCardCustomiser
                            }, "Reset card customiser")
                        ),
                        R.createElement("div", { className: "refract-cc-group-tiles" },
                            segTile("plugin-refract-flourish", "Rating flourish",
                                [["minimal", "Minimal"], ["extravagant", "Extravagant"]], flourish, pickFlourish,
                                "Extravagant draws the tier sash and the neon; Minimal draws neither."),
                            segTile("plugin-refract-perf-card-hover", "Performer popover",
                                [["off", "Name"], ["on", "Card"]], perfCardHoverOn ? "on" : "off",
                                function (v) { if ((v === "on") !== !!perfCardHoverOn) { togglePerfCardHover(); } },
                                "What hovering a performer on a scene card shows."),
                            segTile("plugin-refract-rating-system", "Rating system",
                                [["decimal", "Decimal"], ["stars", "Stars"]], ratingSys, setRatingSystem,
                                "Stash's own setting. Changes ratings everywhere.")
                        )
                    )
                );
            }
            /* D1. Every card-customiser key goes; the four settings in the
               strip stay, because they are Stash-wide or theme-wide and the
               confirm says so. The page reloads once the server copy has been
               replaced, so every piece of state -- fourteen of them in this
               component alone, plus the body classes and every built card --
               starts from the shipped defaults rather than being walked back
               one setter at a time. */
            function resetCardCustomiser() {
                var ok = window.confirm(
                    "Reset the card customiser?\n\n"
                    + "Every element, side, look, stat pill, tray and back setting on both cards goes back to how Refract ships.\n"
                    + "Rating flourish, card styles, the performer popover and the rating system are not touched.\n\n"
                    + "The page will reload.");
                if (!ok) { return; }
                /* SERVER FIRST. The old order cleared localStorage, pushed,
                   and reloaded in a .then chained after a .catch -- so an
                   offline push still reloaded, boot pulled the untouched
                   server copy back, and the confirmed reset silently undid
                   itself. Now the post-reset snapshot is computed without
                   touching anything, pushed, and only a confirmed write
                   clears the local keys and reloads. A failure changes
                   NOTHING and says so. */
                var after = snapshotRefractSettings();
                REFRACT_CARD_RESET_KEYS.forEach(function (k) { delete after[k]; });
                if (refractSyncTimer) { clearTimeout(refractSyncTimer); refractSyncTimer = null; }
                gqlWithVars(
                    'mutation($v: Any){ configureUISetting(key: "refract", value: $v) }',
                    { v: after }
                ).then(function (res) {
                    if (!res || !res.data) { throw new Error("no data"); }
                    REFRACT_CARD_RESET_KEYS.forEach(function (k) {
                        try { localStorage.removeItem(k); } catch (e) { /* ignore */ }
                    });
                    window.location.reload();
                }).catch(function () {
                    window.alert("Could not reach the server, so nothing was reset. Your settings are unchanged.");
                });
            }

            /* == Looks =================================================
               Presets stop being four text chips and become four small
               pictures of the card, drawn from each preset's own flags so a
               preset can never illustrate something it does not do. */
            function presetArt(p) {
                var hid = function (k) { return p.hide.indexOf(k) !== -1; };
                var scene = previewKind === "scene";
                var ext = (p.flourish || flourish) === "extravagant";
                var side = function (k, dflt) { return p.sides[k] || dflt; };
                if (!scene) {
                    /* Measured off a live performer card, as fractions of it:
                       name banner x0-75% y0-11%, tier sash top-right crossing
                       the name's tail, country x4-75% y81-85%, stat pills
                       x4-96% y86-97%. It has NO corner rating badge and its
                       title sits at the TOP, so drawing a scene card's
                       furniture on it was wrong in every part but the sash. */
                    return {
                        performer: true,
                        ext: ext,
                        name: !hid("refract.pcHideName"),
                        ribbon: ext && !hid("refract.pcHideTier"),
                        country: !hid("refract.pcHideCountry"),
                        stats: !hid("refract.pcHideStats"),
                        /* A look that changes the STRIP's contents (Vitals) has
                           to look different from one that does not, or two
                           tiles sit side by side drawing the identical card.
                           Squared, varied-width pills = "different stats". */
                        altStats: !!(p.pills && p.pills.join(",") !== FRONT_PILLS_DEFAULT.join(","))
                    };
                }
                return {
                    performer: false,
                    ext: ext,
                    rating: !hid("refract.scHideRating"),
                    ratingRight: side("refract.scHideRating", "left") === "right",
                    /* The sash is a tier flourish, so a Minimal look cannot have
                       one no matter what the hide list says. */
                    ribbon: ext && !hid("refract.scHideTier"),
                    ribbonLeft: side("refract.scHideTier", "right") === "left",
                    logo: !hid("refract.scHideStudio"),
                    /* Each miniature shows what ITS look produces, so the
                       studio's form comes from the look, not from whatever the
                       card happens to be set to right now. */
                    logoInline: p.studio === "text",
                    logoLeft: p.studio !== "text" && side("refract.scHideStudio", "right") === "left",
                    logoBottom: p.studio !== "text" && side("refract.scHideStudio", "right") === "bottom",
                    /* Do the sash and the logo actually cross in this look?
                       They do when both sit on the same side. */
                    logoCrossed: p.studio !== "text" && ext && !hid("refract.scHideTier")
                        && side("refract.scHideStudio", "right") !== "bottom"
                        && side("refract.scHideStudio", "right") === side("refract.scHideTier", "right"),
                    logoOver: p.layer === "logo",
                    people: !hid("refract.scHidePerformers"),
                    extras: !(hid("refract.scHideDuration") && hid("refract.scHideOCount") && hid("refract.scHideTagCount"))
                };
            }
            /* A look that lands on exactly the same card as an earlier one is
               not a look, it is a duplicate picture. On a performer card there
               is no studio logo, no side to pick and no rating banner, so
               Default, Mirrored, No clash and Logo first all produce the
               identical card. Signature each look against the elements this
               card type actually HAS, and keep the first of each. */
            function lookSignature(p) {
                var parts = [];
                var hasSides = false;
                CARD_ELEMS.forEach(function (d) {
                    if (d.group !== elemGroup || d.noop) { return; }
                    parts.push(d.key + (p.hide.indexOf(d.key) !== -1 ? "0" : "1"));
                    /* In text mode the studio has no corner, so its side and the
                       ribbon-over-logo layer decide nothing, and looks that
                       differ only by those become the same card. */
                    var sideCounts = d.sideKey
                        && !(d.key === "refract.scHideStudio" && p.studio === "text");
                    if (sideCounts) { hasSides = true; parts.push(p.sides[d.key] || d.sideDefault); }
                });
                /* Layering only decides anything where sides exist to clash. */
                if (hasSides && p.studio !== "text") { parts.push(p.layer); }
                parts.push(p.flourish || flourish);
                /* Only where a studio exists. A performer card has none, so
                   "Studio in title" produces the identical card to Default
                   there and must dedupe away like the others. */
                if (previewKind === "scene") { parts.push(p.studio || "logo"); }
                /* And only the performer card has a front strip to select. */
                if (previewKind === "performer") { parts.push((p.pills || FRONT_PILLS_DEFAULT).join(",")); }
                return parts.join("|");
            }
            function visibleLooks() {
                var seen = {};
                var out = [];
                CARD_PRESETS.forEach(function (p) {
                    var sig = lookSignature(p);
                    if (seen[sig]) { return; }
                    seen[sig] = 1;
                    out.push(p);
                });
                return out;
            }
            /* The back has two positions of ONE anatomy, not two anatomies.
               Gallery is the tray on; Mirror is the tray off with a separate
               image, which is exactly the back that shipped before the tray
               existed. Naming them as looks is what let the "Back style"
               switch go away. */

            var BACK_LOOKS = [
                /* Three, not five. Contact sheet and Stats were each one or two
                   chip clicks away from Gallery -- "tray with no pills" and
                   "pills with no tray" are states the chips already express, and
                   a look that only re-states a chip is a duplicate control with
                   a picture on it. Their miniatures gave it away: Stats and
                   Mirror drew the same card and differed only by a pill count
                   nobody counts.

                   Mirror stays because its difference is NOT a chip: it is the
                   only look that changes the back's IMAGE SOURCE, which is what
                   request #172 asked for.

                   `pills` is the whole stat selection, so a look always lands on
                   a definite card rather than inheriting what came before it. */
                { key: "dossier", label: "Dossier", style: "dossier", tray: false, rows: 2,
                  pills: ["rating", "height", "career", "scenes"] },
                { key: "gallery", label: "Gallery", style: "gallery", tray: true, rows: 2,
                  pills: ["rating", "height", "career", "scenes"] },
                { key: "mirror", label: "Mirror", style: "gallery", tray: false, rows: 2,
                  pills: ["rating", "height", "career", "scenes"] }
            ];
            function applyBackLook(p) {
                setPillMenu(null);
                pickBackStyle(p.style);
                /* The dossier draws none of these, so it leaves them alone:
                   switching to it and back should return the gallery you had,
                   not a gallery this look happened to specify. */
                if (p.style === "dossier") { return; }
                pickTrayOn(p.tray);
                pickTrayRows(p.rows);
                writeBackPills(p.pills.slice());
                /* Mirror only says something if the two faces differ, and they
                   only differ if the back is not showing the front's portrait.
                   Nudge the source, but never overwrite a deliberate choice of
                   top photo. */
                if (!p.tray && backSrc === "portrait") { pickBackSrc("scene"); }
            }
            /* A look is "in force" when the card already matches it, so the row
               marks what you are looking at rather than what you last clicked. */
            function backLookActive(p) {
                if (backStyle !== p.style) { return false; }
                /* A different anatomy has nothing else to match on. */
                if (p.style === "dossier") { return true; }
                if (trayOn !== p.tray) { return false; }
                if (p.tray && trayRows !== p.rows) { return false; }
                return backPills.join(",") === p.pills.join(",");
            }
            function backLookPicture(p) {
                var on = backLookActive(p);
                var unavailable = p.style === "dossier" && !hasCats;
                var part = function (name, n) {
                    var kids = [];
                    for (var i = 0; i < (n || 0); i++) { kids.push(R.createElement("i", { key: i })); }
                    return R.createElement("span", { className: "refract-cc-art-" + name }, kids);
                };
                return R.createElement("button", {
                    key: p.key,
                    type: "button",
                    className: "refract-cc-preset" + (on ? " is-active" : "") + (unavailable ? " is-unavailable" : ""),
                    "aria-pressed": on ? "true" : "false",
                    "aria-disabled": unavailable ? "true" : "false",
                    disabled: unavailable,
                    title: unavailable
                        ? "Needs category ratings (the advanced-rating plugin). This library has none, so the back falls back to the gallery."
                        : {
                        dossier: "The score, the category ratings and a media strip. The default.",
                        gallery: "Their top-rated media over the back's own image, with four stats.",
                        mirror: "No tray: the front's face again, with its own image source."
                    }[p.key],
                    /* The label carries the reason too, because a greyed tile
                       with only a tooltip is a mystery on touch. */
                    "data-reason": unavailable ? "needs category ratings" : null,
                    onClick: function () { applyBackLook(p); }
                },
                    R.createElement("span", {
                        className: "refract-cc-preset-art is-extravagant"
                    },
                        R.createElement("span", { className: "refract-cc-preset-inner" }, [
                            p.style === "dossier" ? part("score") : null,
                            part("name"),
                            /* The dossier has no corner sash -- its tier is a
                               CHIP in the header -- so drawing one was the
                               miniature describing a card that does not exist. */
                            p.style === "dossier" ? part("chip") : part("ribbon"),
                            p.style === "dossier"
                                ? part("rows", 4)
                                : (p.tray ? part("tray", p.rows === 1 ? 3 : 6) : part("imgmark")),
                            /* The miniature draws what ITS look produces, so a
                               look with no stats shows no strip at all. */
                            p.style === "dossier"
                                ? part("strip", 3)
                                : (p.pills.length
                                    /* Draw the ACTUAL count, not a capped four.
                                       Capped, Stats (six) and Mirror (four)
                                       drew the same picture, and two looks that
                                       produce different cards must not. */
                                    ? part("stats", p.pills.length)
                                    : null)
                        ])
                    ),
                    R.createElement("span", { className: "refract-cc-preset-label" }, p.label)
                );
            }
            /* Does the CURRENT card match this look exactly? The back row
               has marked its look from the start; the front rows never did,
               which read as an unexplained inconsistency. Same meaning here:
               the ring marks what you are looking at, not what you last
               clicked. */
            function presetMatchesCurrent(p) {
                if ((p.flourish || flourish) !== flourish) { return false; }
                var i, d;
                for (i = 0; i < CARD_ELEMS.length; i++) {
                    d = CARD_ELEMS[i];
                    if (d.group !== elemGroup || d.noop) { continue; }
                    if (!!cardElems[d.key] !== (p.hide.indexOf(d.key) !== -1)) { return false; }
                    if (d.sideKey && elemGroup === "scene") {
                        if ((cardSides[d.key] || d.sideDefault) !== (p.sides[d.key] || d.sideDefault)) { return false; }
                    }
                }
                if (elemGroup === "scene") {
                    if ((cardSides.__layer || "ribbon") !== p.layer) { return false; }
                    if (studioMode !== (p.studio || "logo")) { return false; }
                }
                if (elemGroup === "performer") {
                    if (frontPills.join(",") !== (p.pills || FRONT_PILLS_DEFAULT).join(",")) { return false; }
                }
                return true;
            }
            function presetPicture(p) {
                var a = presetArt(p);
                var on = presetMatchesCurrent(p);
                /* Repeated furniture (performer circles, the two scene pills, the
                   four stat pills) is drawn as real child elements rather than
                   as a repeating gradient. The gradient version could not round
                   its inner edges, so a "row of pills" came out as one pill
                   with three square blocks inside it. */
                var part = function (name, cls, n) {
                    var kids = [];
                    for (var i = 0; i < (n || 0); i++) { kids.push(R.createElement("i", { key: i })); }
                    return R.createElement("span", { className: "refract-cc-art-" + name + (cls || "") }, kids);
                };
                var inner = a.performer
                    ? [
                        a.name ? part("name") : null,
                        a.country ? part("country") : null,
                        a.stats ? part("stats", a.altStats ? " is-alt" : "", 4) : null,
                        a.ribbon ? part("ribbon") : null
                    ]
                    : [
                        part("title", (a.logo && a.logoInline) ? " is-shifted" : ""),
                        a.people ? part("people", "", 3) : null,
                        a.extras ? part("extras", (a.logo && a.logoBottom) ? " is-lifted" : "", 2) : null,
                        a.rating ? part("rating", a.ratingRight ? " is-right" : "") : null,
                        a.ribbon ? part("ribbon", a.ribbonLeft ? " is-left" : "") : null,
                        a.logo ? part("logo",
                            a.logoInline ? " is-inline" : (
                                (a.logoLeft ? " is-left" : "")
                                + (a.logoBottom ? " is-bottom" : "")
                                + (a.logoCrossed ? " is-crossed" : "")
                                + (a.logoCrossed && a.logoOver ? " is-over" : ""))) : null
                    ];
                var tip = (p.tip && p.tip[previewKind]) || "";
                return R.createElement("button", {
                    key: p.label,
                    type: "button",
                    className: "refract-cc-preset" + (on ? " is-active" : ""),
                    "aria-pressed": on ? "true" : "false",
                    title: (tip ? tip + " " : "") + "Adjust anything afterwards.",
                    onClick: function () { applyCardPreset(p); }
                },
                    R.createElement("span", {
                        className: "refract-cc-preset-art" + (a.ext ? " is-extravagant" : "")
                    },
                        R.createElement("span", { className: "refract-cc-preset-inner" }, inner)
                    ),
                    R.createElement("span", { className: "refract-cc-preset-label" }, p.label)
                );
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
                    scheduleServerSync();
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
                scheduleServerSync();
                applyLiteModeClass(next);
                setLiteOn(next);
                /* Re-run the sidebar performer carousel setup so clones get
                   added (lite→full) or removed (full→lite) immediately. */
                try { setupSceneTabsPerformers(); } catch (e) { /* ignore */ }
            }

            function pick(preset) {
                try { localStorage.setItem(ACCENT_STORAGE_KEY, preset); } catch (e) { /* ignore */ }
                scheduleServerSync();
                applyAccentClass(preset);
                setLocalAccent(preset);
            }

            function toggleMinimiser() {
                var next = !minimiserOn;
                try { localStorage.setItem(VIEW_MINIMISER_STORAGE_KEY, next ? "1" : "0"); } catch (e) { /* ignore */ }
                scheduleServerSync();
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
                scheduleServerSync();
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
            /* Light/dark mode toggle — sun (light on) / moon (light off)
               glyph sitting alongside the accent swatches. Sun-gradient
               active state in 11_misc_tail.css makes the current mode
               obvious at a glance. View Transitions crossfade the flip
               on supporting browsers; instant on older ones. */
            swatches.push(R.createElement("button", {
                key: "__light",
                type: "button",
                className: "refract-accent-swatch refract-light-toggle" + (lightOn ? " is-active" : ""),
                title: lightOn ? "Switch to dark mode" : "Switch to light mode",
                "aria-label": "Toggle light/dark mode",
                onClick: toggleLight,
                dangerouslySetInnerHTML: { __html: lightOn ? SUN_ICON_SVG : MOON_ICON_SVG }
            }));

            return R.createElement("div", { className: "plugin-settings" },
                R.createElement("div", { className: "setting", id: "plugin-refract-accent" },
                    R.createElement("div", null,
                        R.createElement("h3", null, "Accent colour"),
                        R.createElement("div", { className: "sub-heading" },
                            "Click a swatch to apply instantly. Saved per browser.")
                    ),
                    R.createElement("div", { className: "refract-accent-swatches" }, swatches)
                ),
                R.createElement("div", { className: "setting", id: "plugin-refract-lite-mode" },
                    R.createElement("div", null,
                        R.createElement("h3", null, "Lite mode"),
                        R.createElement("div", { className: "sub-heading" },
                            "Strip backdrop-blur + hover glow halos + card tilt (the GPU-heavy bits). Animations, shadows, and the performer carousel stay. Recommended if the home page feels janky on Chrome / Edge / Brave.")
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
                /* == Card customiser ==
                   Everything that changes how scene and performer cards look,
                   collated around the live preview. Same native <details>
                   drawer as the Suggestion Box below, so there is one
                   collapse idiom in this panel and the keyboard/ARIA
                   behaviour comes for free.

                   It was an always-open section from 2026-07-26 until it grew
                   a preview, five settings and the elements grid; collapsible
                   again 2026-08-17. `open` is CONTROLLED by state, not just an
                   initial attribute: this panel re-renders on every setting
                   change, and an uncontrolled attribute would snap the drawer
                   back to its initial value each time. */
                R.createElement("details", {
                    className: "refract-suggestion-box refract-card-customiser",
                    open: customiserOpen,
                    onToggle: function (e) { setCustomiserOpenPref(e.currentTarget.open); }
                },
                    R.createElement("summary", { className: "refract-suggestion-summary refract-customiser-header" },
                        R.createElement("h3", null, "Card customiser"),
                        R.createElement("div", { className: "sub-heading" },
                            "Everything that changes how cards look, around a live preview.")
                    ),
                    R.createElement("div", { className: "refract-suggestion-body refract-cc-body" },
                        /* == Corner touch ==================================
                           The panel is a card and the things that change it,
                           not a stack of settings rows. Three bands:

                             rail   card type, and what to do with the card
                             stage  the card, with the four global settings
                                    riding its right edge as one centred unit
                             looks  the presets, as pictures of the card

                           Per-element visibility is NOT here. It lives on the
                           card itself: hover a quadrant, click a chip. The
                           card is the only object on screen that knows where
                           an element actually sits, so it does the explaining
                           that a six-row list of labels could not. */
                        R.createElement("div", { className: "refract-cc-rail" },
                            R.createElement("div", {
                                className: "refract-cc-kind",
                                role: "tablist",
                                "aria-label": "Which card to edit"
                            },
                                /* Two cards, two tabs. The performer card's
                                   BACK is not a third card -- it is the same
                                   card turned over, reached by the flip on the
                                   card itself. */
                                [
                                    { key: "scene", label: "Scene card" },
                                    { key: "performer", label: "Performer card" }
                                ].map(function (o) {
                                    return R.createElement("button", {
                                        key: o.key,
                                        type: "button",
                                        role: "tab",
                                        "aria-selected": previewKind === o.key ? "true" : "false",
                                        className: "refract-cc-kind-btn" + (previewKind === o.key ? " is-active" : ""),
                                        onClick: function () {
                                            setZone(null);
                                            setPreviewSideState("front");
                                            setPreviewKind(o.key);
                                        }
                                    }, o.label);
                                }),
                                /* The face, as a segment nested in the tab it
                                   belongs to. It sat by Shuffle as one "Back"
                                   button, which read as a third card or as an
                                   action; here it is plainly the performer
                                   card's front or back. Only present when the
                                   card has a back to show. */
                                (canFlipPreview && previewKind === "performer") ? R.createElement("div", {
                                    key: "__face",
                                    className: "refract-cc-face",
                                    role: "radiogroup",
                                    "aria-label": "Which face of the performer card"
                                },
                                    R.createElement("span", {
                                        className: "refract-cc-face-icon" + (editingBack ? " is-back" : ""),
                                        "aria-hidden": "true",
                                        dangerouslySetInnerHTML: { __html: REFRACT_FLIP_ICON }
                                    }),
                                    [["front", "Front"], ["back", "Back"]].map(function (f) {
                                        var on = (editingBack ? "back" : "front") === f[0];
                                        return R.createElement("button", {
                                            key: f[0],
                                            type: "button",
                                            role: "radio",
                                            "aria-checked": on ? "true" : "false",
                                            className: "refract-cc-face-btn" + (on ? " is-active" : ""),
                                            title: f[0] === "back" ? "Show the back of the card" : "Show the front of the card",
                                            onClick: function () { setPreviewSide(f[0]); }
                                        }, f[1]);
                                    })
                                ) : null
                            ),
                            R.createElement("div", { className: "refract-cc-rail-right" },
                                R.createElement("span", { className: "refract-cc-hint" },
                                    /* Two sentences, not five. Each new kind of
                                       object used to add one, and one of them
                                       lied: the performer strip's band said
                                       "click a pill" while Country and the rank
                                       badge were equally clickable beside it. */
                                    zone
                                        ? "Click anything on the card to change it"
                                        : "Hover a region of the card to change what sits there"),
                                R.createElement("button", {
                                    type: "button",
                                    className: "refract-cc-shuffle refract-cc-plain" + (plainOn ? " is-on" : ""),
                                    "aria-pressed": plainOn ? "true" : "false",
                                    title: plainOn
                                        ? "Showing a scene with no studio or rating and an unrated performer. Click for the usual well-rated picks."
                                        : "Preview the worst case: a scene with no studio or rating, an unrated performer. No logo, no sash, no tier.",
                                    onClick: function () {
                                        var next = !plainOn;
                                        refractPreviewPlain = next;
                                        setPlainOn(next);
                                        if (refractPreviewReload) { refractPreviewReload(); }
                                    }
                                }, "Plain card"),
                                R.createElement("button", {
                                    type: "button",
                                    className: "refract-cc-shuffle",
                                    title: "Show a different scene and performer",
                                    onClick: function () {
                                        if (refractPreviewReload) { refractPreviewReload(); }
                                    }
                                }, "Shuffle")
                            )
                        ),
                        R.createElement("div", {
                            className: "refract-cc-stage refract-preview-kind-"
                                + (editingBack ? "back" : previewKind)
                                + (canFlipPreview ? " refract-cc-can-flip" : "")
                                + (editingBack ? " is-back" : ""),
                            id: "plugin-refract-card-preview"
                        },
                            R.createElement("div", { className: "refract-cc-cardslot" },
                                /* The corner layer hangs off a box that shrink-wraps
                                   the CARD, so an overlay pinned to it sits on the
                                   card's own edges. */
                                R.createElement("div", { className: "refract-cc-cardbox" },
                                    R.createElement(RefractCardPreview),
                                    cornerLayer()
                                )
                            )
                        ),
                        bothCardsStrip(),
                        R.createElement("div", { className: "refract-cc-looks" },
                            R.createElement("div", { className: "refract-cc-looks-head" }, "Looks"),
                            R.createElement("div", {
                                className: "refract-cc-preset-grid refract-cc-preset-"
                                    + (editingBack ? "back" : previewKind)
                            }, editingBack
                                ? BACK_LOOKS.map(backLookPicture)
                                : visibleLooks().map(presetPicture))
                        )
                    )
                ),
                R.createElement("div", { className: "setting refract-dock-config-setting", id: "plugin-refract-dock-config" },
                    R.createElement("div", null,
                        R.createElement("h3", null, "Mobile dock"),
                        R.createElement("div", { className: "sub-heading" },
                            "Choose which icons sit in the bottom bar on narrow screens; lit icons are shown, up to six. Plugin buttons included. The burger is always last, and everything stays reachable from its drawer.")
                    ),
                    R.createElement(DockConfigGrid)
                ),
                /* ── The Suggestion Box ─────────────────────────────────────
                   A collapsed-by-default drawer of opt-in features that run
                   against the theme's defaults but get requested often.
                   Native <details> so it stays hidden until clicked open. */
                R.createElement("details", { className: "refract-suggestion-box" },
                    R.createElement("summary", { className: "refract-suggestion-summary" },
                        R.createElement("h3", null, "The Suggestion Box"),
                        R.createElement("div", { className: "sub-heading" },
                            "Things I'd never pick myself. But you asked, so here they are. Enable at your own aesthetic risk.")
                    ),
                    R.createElement("div", { className: "refract-suggestion-body" },
                        R.createElement("div", { className: "setting", id: "plugin-refract-studio-banner" },
                            R.createElement("div", null,
                                R.createElement("h3", null, "Studio banner"),
                                R.createElement("div", { className: "sub-heading" },
                                    "Show the studio's logo image above the scene title instead of the small muted studio name.")
                            ),
                            R.createElement("div", { className: "refract-setting-control" },
                                R.createElement("div", { className: "custom-control custom-switch" },
                                    R.createElement("input", {
                                        type: "checkbox",
                                        className: "custom-control-input",
                                        id: "refract-studio-banner-toggle",
                                        checked: studioBannerOn,
                                        onChange: toggleStudioBanner
                                    }),
                                    R.createElement("label", {
                                        className: "custom-control-label",
                                        htmlFor: "refract-studio-banner-toggle"
                                    })
                                )
                            )
                        ),
                        R.createElement("div", { className: "setting", id: "plugin-refract-plugin-sort" },
                            R.createElement("div", null,
                                R.createElement("h3", null, "Group by enabled state"),
                                R.createElement("div", { className: "sub-heading" },
                                    "On the Settings → Plugins page, sort enabled plugins A→Z first, then disabled ones A→Z below. Off (default) is one flat A→Z list, matching Stash's native order. Reorders glide rather than snap.")
                            ),
                            R.createElement("div", { className: "refract-setting-control" },
                                R.createElement("div", { className: "custom-control custom-switch" },
                                    R.createElement("input", {
                                        type: "checkbox",
                                        className: "custom-control-input",
                                        id: "refract-plugin-sort-toggle",
                                        checked: pluginSortDisabledBottomOn,
                                        onChange: togglePluginSortDisabledBottom
                                    }),
                                    R.createElement("label", {
                                        className: "custom-control-label",
                                        htmlFor: "refract-plugin-sort-toggle"
                                    })
                                )
                            )
                        ),
                        R.createElement("div", { className: "setting", id: "plugin-refract-hide-center-controls" },
                            R.createElement("div", null,
                                R.createElement("h3", null, "Hide player center controls"),
                                R.createElement("div", { className: "sub-heading" },
                                    "Remove the back / play / forward buttons that appear over the scene player, leaving only the stock control bar. For keyboard-driven viewing or short clips where the overlay gets in the way.")
                            ),
                            R.createElement("div", { className: "refract-setting-control" },
                                R.createElement("div", { className: "custom-control custom-switch" },
                                    R.createElement("input", {
                                        type: "checkbox",
                                        className: "custom-control-input",
                                        id: "refract-hide-center-controls-toggle",
                                        checked: centerControlsHiddenOn,
                                        onChange: toggleCenterControlsHidden
                                    }),
                                    R.createElement("label", {
                                        className: "custom-control-label",
                                        htmlFor: "refract-hide-center-controls-toggle"
                                    })
                                )
                            )
                        ),
                        R.createElement("div", { className: "setting", id: "plugin-refract-show-filter-tags" },
                            R.createElement("div", null,
                                R.createElement("h3", null, "Active-filter chips"),
                                R.createElement("div", { className: "sub-heading" },
                                    "Show the row of active-filter chips above list views so filters can be dismissed without opening the filter menu. Off (default) keeps the tidy toolbar; the filter button badge still shows the count.")
                            ),
                            R.createElement("div", { className: "refract-setting-control" },
                                R.createElement("div", { className: "custom-control custom-switch" },
                                    R.createElement("input", {
                                        type: "checkbox",
                                        className: "custom-control-input",
                                        id: "refract-show-filter-tags-toggle",
                                        checked: filterTagsOn,
                                        onChange: toggleFilterTags
                                    }),
                                    R.createElement("label", {
                                        className: "custom-control-label",
                                        htmlFor: "refract-show-filter-tags-toggle"
                                    })
                                )
                            )
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
                })(),
                refractSupportNote(R)
            );
        };
    }

    function registerAccentPatch() {
        if (typeof PluginApi === "undefined" || !PluginApi.patch || !PluginApi.React) {
            setTimeout(registerAccentPatch, 100);
            return;
        }
        PluginApi.patch.instead("PluginSettings", function () {
            var args = Array.prototype.slice.call(arguments);
            var next = args.pop();
            var props = args[0];
            if (!props || props.pluginID !== "refract") {
                return next.apply(null, args);
            }
            /* The full settings panel moved to Settings -> Interface ->
               Refract (injectInterfaceRefractSection); the plugin panel
               keeps a quiet pointer so nobody hunts for vanished
               settings. The #refract hash makes the injector scroll the
               relocated section into view after the page loads. */
            var R2 = PluginApi.React;
            return R2.createElement("div", { className: "refract-settings-moved-note sub-heading" },
                "Refract's settings have moved to ",
                R2.createElement("a", { href: "/settings?tab=interface#refract" },
                    "Settings → Interface → Refract"),
                "."
            );
        });

        /* In-tree host for the relocated settings panel. The panel must
           live inside Stash's React tree (portalled from a patched
           always-mounted component) rather than a standalone
           ReactDOM.render root: the real-card preview renders Stash's
           own SceneCard/PerformerCard, which need the app's
           ConfigurationProvider / IntlProvider / Router contexts.
           MainNavBar.UtilityItems is patchable and mounted on every
           route; the host itself renders nothing in the navbar — it
           only portals into the injected Interface section container
           whenever that exists. */
        var R3 = PluginApi.React;
        var RefractSettingsPanel = buildAccentSwatchPicker();
        function RefractInterfacePortalHost() {
            var st = R3.useState(null);
            var container = st[0], setContainer = st[1];
            /* The panel reads every preference into useState at mount, and on
               a fresh device it mounts BEFORE the server pull lands: shipped
               defaults shown as the current state, over a library configured
               otherwise, and any click in that window syncs stale values up.
               When the pull settles, remount the whole panel (key change) so
               every hook re-reads the now-correct localStorage. One remount,
               only ever on the first settle, invisible when nothing changed. */
            var epochSt = R3.useState(refractSyncSettled ? 1 : 0);
            R3.useEffect(function () {
                var live = true;
                refractOnSettingsSynced(function () {
                    if (live) { epochSt[1](1); }
                });
                return function () { live = false; };
            }, []);
            var tokenRef = R3.useRef({});
            R3.useEffect(function () {
                var t = setInterval(function () {
                    var c = document.querySelector("#refract-settings-section > .card");
                    if (!c) {
                        if (container) { setContainer(null); }
                        return;
                    }
                    /* Stash renders MainNavBar.UtilityItems TWICE (desktop
                       navbar + the collapsed-menu slot), so two hosts
                       exist and both would portal the panel — duplicating
                       every settings row. Claim-with-heartbeat on the
                       container: the first host to claim renders and
                       refreshes its claim each tick; the other idles. A
                       claim older than 2s is stale (its host unmounted)
                       and can be stolen. */
                    var claim = c._refractHostClaim;
                    var now = Date.now();
                    if (!claim || claim.token === tokenRef.current || (now - claim.at) > 2000) {
                        c._refractHostClaim = { token: tokenRef.current, at: now };
                        if (c !== container) { setContainer(c); }
                    } else if (container) {
                        setContainer(null);
                    }
                }, 400);
                return function () { clearInterval(t); };
            }, [container]);
            if (!container) { return null; }
            return PluginApi.ReactDOM.createPortal(
                R3.createElement(RefractSettingsPanel, { key: "sync-" + epochSt[0] }), container);
        }
        PluginApi.patch.instead("MainNavBar.UtilityItems", function () {
            var args = Array.prototype.slice.call(arguments);
            var next = args.pop();
            var orig = next.apply(null, args);
            return R3.createElement(R3.Fragment, null, orig,
                R3.createElement(RefractInterfacePortalHost, { key: "refract-settings-host" }));
        });
    }
    registerAccentPatch();

    var CATEGORIES_PATH = "/categories";
    var STORAGE_KEY_API = "refract.apiKey";
    var VIEW_MINIMISER_STORAGE_KEY = "refract.viewMinimiser";
    var LOGO_URL_STORAGE_KEY = "refract.customLogoUrl";
    var LITE_MODE_STORAGE_KEY = "refract.liteMode";
    var LIGHT_MODE_STORAGE_KEY = "refract.lightMode";
    var LIGHT_TOGGLE_NAVBAR_KEY = "refract.lightToggleNavbar";
    var HELP_BUTTON_STORAGE_KEY = "refract.showHelpButton";
    var STUDIO_BANNER_STORAGE_KEY = "refract.studioBanner";
    var PERFORMER_CARD_HOVER_KEY = "refract.performerCardHover";
    var MINIMAL_CARDS_STORAGE_KEY = "refract.minimalCards";
    var RATING_STYLE_STORAGE_KEY = "refract.ratingStyle";   /* retired; read once by migrateRatingStyle */
    var PERF_CARD_STYLE_KEY = "refract.perfCardStyle";      /* "refract" | "classic" */
    var CUSTOMISER_OPEN_KEY = "refract.customiserOpen";     /* drawer state, local only */
    /* Pending band switch, held outside the component because there is exactly
       one customiser and it must survive a re-render. */
    var refractZoneTimer = null;
    var PREVIEW_KIND_KEY = "refract.previewKind";           /* "scene" | "performer", local only */
    /* WHICH scene and performer the preview is showing. Both were USED by
       refractFetchPreviewData and never DECLARED, so every read threw a
       ReferenceError that the surrounding try/catch swallowed: the stored ids
       came back null, the "keep the same card" branch never ran, and the
       preview picked a fresh random card on every single reload -- including
       the reload after each pill edit. Editing one pill threw a different
       performer on the stage, which made the whole panel feel unstable.
       Device-local, deliberately outside REFRACT_SYNC_KEYS: which card you are
       previewing is not a preference to carry between machines. */
    var PREVIEW_SCENE_ID_KEY = "refract.previewSceneId";    /* local only */
    var PREVIEW_PERF_ID_KEY = "refract.previewPerfId";      /* local only */
    var FLOURISH_KEY = "refract.flourish";                  /* "minimal" | "extravagant" */
    /* Settings → Plugins list: float disabled plugins to the bottom (the
       pre-v1.15 behaviour) instead of one flat A→Z run. Opt-in; default off. */
    var PLUGIN_SORT_DISABLED_BOTTOM_KEY = "refract.pluginSortDisabledBottom";
    /* Scene player: remove the injected center overlay (back-10 / play /
       forward-10) entirely, leaving the stock control bar. Opt-in;
       default off (overlay shown). */
    var HIDE_CENTER_CONTROLS_KEY = "refract.hideCenterControls";
    var SHOW_FILTER_TAGS_KEY = "refract.showFilterTags";

    /* Gender glyph for the mock name banner — the real banner CLONES the
       native .gender-icon svg from the card title, which the mocks don't
       have, so carry a static venus copy with the same class. */
    var REFRACT_PREVIEW_GENDER_SVG =
        '<svg class="gender-icon" viewBox="0 0 384 512" fill="currentColor" aria-hidden="true">' +
        '<path d="M80 176a112 112 0 1 1 224 0A112 112 0 1 1 80 176zM224 349.1c81.9-15 144-86.8 ' +
        '144-173.1C368 78.8 289.2 0 192 0S16 78.8 16 176c0 86.3 62.1 158.1 144 173.1V384H128' +
        'c-17.7 0-32 14.3-32 32s14.3 32 32 32h32v32c0 17.7 14.3 32 32 32s32-14.3 32-32V448h32' +
        'c17.7 0 32-14.3 32-32s-14.3-32-32-32H224V349.1z"/></svg>';

    /* Built LAZILY (function, not a var) because it concatenates the shared
       pill icon constants (STAR_SVG, CAKE_SVG, O_ICON_SVG, PLAY_SVG,
       PEOPLE_ICON_SVG, TAG_ICON_SVG) which are declared further down the
       file — by settings render time they're all assigned. Markup mirrors a
       REAL processed card (dumped live 2026-07-26): name banner first child,
       circles/counts INSIDE .card-section after the title, icons inside
       every pill. --pc-badge-scale is JS-fitted on real cards; the mock
       hardcodes a value tuned to its fixed 190px width. */
    function refractBuildPreviewHtml() {
        return '<div class="scene-card grid-card card refract-preview-card" data-stash-sc="1">' +
            '<div class="thumbnail-section">' +
                '<a class="scene-card-link">' +
                    '<div class="scene-card-preview">' +
                        '<img class="scene-card-preview-image" alt="" src="' + REFRACT_PREVIEW_ART_SCENE + '">' +
                    '</div>' +
                    '<div class="scene-specs-overlay"><span class="overlay-resolution">1080p</span><span class="overlay-duration">12:34</span></div>' +
                '</a>' +
                '<div class="studio-overlay">Studio</div>' +
            '</div>' +
            /* DIRECT card child on purpose: 03_cards.css hides any banner
               nested deeper (`.scene-card .rating-banner`) and re-shows
               only `.scene-card > .rating-banner` — refract.js's injected
               source-of-truth banner. The mock mirrors the injected one,
               not Stash's hidden native nested banner. */
            '<div class="rating-banner">8.6</div>' +
            '<div class="card-section">' +
                '<a><h5 class="card-section-title">Example Scene</h5></a>' +
                /* Shown only in Classic card style (refract-minimal-cards
                   hides .scene-card__details); lets the "Scene card style"
                   segmented control visibly flip the preview. */
                '<div class="scene-card__details">' +
                    '<span class="scene-card__date">2026-01-01</span>' +
                    '<span class="file-path extra-scene-info">D:\\Media\\Example Scene.mp4</span>' +
                '</div>' +
                '<div class="stash-performer-circles">' +
                    '<div class="stash-performer-avatars">' +
                        '<a class="stash-performer-link"><img class="stash-performer-avatar" alt="" src="' + REFRACT_PREVIEW_ART_PERF + '"></a>' +
                        '<a class="stash-performer-link"><img class="stash-performer-avatar" alt="" src="' + REFRACT_PREVIEW_ART_PERF + '"></a>' +
                    '</div>' +
                    '<div class="stash-card-counts">' +
                        '<span class="stash-duration-pill">12:34</span>' +
                        '<a class="stash-performer-pill">' + PEOPLE_ICON_SVG + '<span>2</span></a>' +
                        '<span class="stash-o-count">' + O_ICON_SVG + '<span>3</span></span>' +
                        '<a class="stash-tag-count">' + TAG_ICON_SVG + '<span>4</span></a>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            '<hr>' + /* hidden in Refract card style, shown in Classic */
            '<div class="refract-pc-tier-label"></div>' +
        '</div>' +
        '<div class="performer-card grid-card card refract-preview-card" data-stash-pc="1">' +
            '<div class="refract-pc-name-banner">' + REFRACT_PREVIEW_GENDER_SVG +
                '<span class="refract-pc-name-text" style="font-size: 0.85rem;">Jane Example</span>' +
            '</div>' +
            '<div class="thumbnail-section"><a><img class="performer-card-image" alt="" src="' + REFRACT_PREVIEW_ART_PERF + '"></a>' +
                '<div class="rating-banner">8.6</div>' +
            '</div>' +
            '<div class="card-section">' +
                '<a><h5 class="card-section-title">Jane Example</h5></a>' +
                '<span class="stash-perf-country"><span class="stash-perf-country-name">United States</span></span>' +
                '<div class="stash-perf-stats" style="--pc-badge-scale: 0.65;">' +
                    '<span class="stash-perf-rating">' + STAR_SVG + '<span class="stash-perf-label">Rating</span><span>8.6</span></span>' +
                    '<span class="stash-perf-age">' + CAKE_SVG + '<span class="stash-perf-label">Age</span><span>29</span></span>' +
                    '<span class="stash-perf-ocount">' + O_ICON_SVG + '<span class="stash-perf-label">O Count</span><span>12</span></span>' +
                    '<a class="stash-perf-scenes">' + PLAY_SVG + '<span class="stash-perf-label">Scenes</span><span>34</span></a>' +
                '</div>' +
            '</div>' +
            '<div class="refract-pc-tier-label"></div>' +
        '</div>';
    }

    var PREVIEW_SCENE_FIELDS_BASE =
        "id title details date rating100 o_counter organized interactive interactive_speed resume_time " +
        "files { id path basename width height duration video_codec frame_rate bit_rate size format " +
            "fingerprints { type value } } " +
        "paths { screenshot preview stream webp vtt sprite interactive_heatmap } " +
        "studio { id name image_path } performers { id name gender image_path } " +
        "tags { id name } galleries { id title } scene_markers { id title seconds } " +
        "captions { language_code caption_type } " +
        "stash_ids { endpoint stash_id }";
    var PREVIEW_SCENE_FIELDS = PREVIEW_SCENE_FIELDS_BASE +
        " groups { group { id name front_image_path } scene_index }";
    var PREVIEW_SCENE_FIELDS_MOVIES = PREVIEW_SCENE_FIELDS_BASE +
        " movies { movie { id name front_image_path } scene_index }";
    var PREVIEW_PERF_FIELDS =
        "id name disambiguation gender birthdate country image_path favorite " +
        "rating100 o_counter scene_count image_count gallery_count group_count " +
        "performer_count tags { id name } stash_ids { endpoint stash_id } alias_list";
    function refractGqlQuery(query) {
        return fetch("/graphql", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: query })
        }).then(function (r) { return r.json(); });
    }
    /* Resolve { scene, performer } for the preview. shuffle=true ignores
       stored ids and re-rolls. Random picks prefer high-rated records
       with performers so every card element is populated; if the filter
       finds nothing (small library) it retries unfiltered. */
    /* Which scene field set works on this server (groups vs legacy
       movies); resolved on first failure and remembered for the session. */
    var refractPreviewSceneFields = PREVIEW_SCENE_FIELDS;
    function refractSceneQuery(buildQuery) {
        return refractGqlQuery(buildQuery(refractPreviewSceneFields)).then(function (r) {
            if (r.errors && refractPreviewSceneFields !== PREVIEW_SCENE_FIELDS_MOVIES &&
                    JSON.stringify(r.errors).indexOf("groups") !== -1) {
                refractPreviewSceneFields = PREVIEW_SCENE_FIELDS_MOVIES;
                return refractGqlQuery(buildQuery(refractPreviewSceneFields));
            }
            return r;
        });
    }
    /* "Plain" picks the worst case on purpose: a scene with no studio and no
       rating, a performer with no rating. That is the card with no logo, no
       sash and no tier -- the state where the counts lift, the corner empties
       and the chin has to hold on its own -- and the preview never showed it,
       because the default pick is a well-rated card by design. */
    var refractPreviewPlain = false;
    function refractFetchPreviewData(shuffle) {
        var plain = refractPreviewPlain;
        function randomScene(filtered) {
            var f = filtered
                ? (plain
                    ? ", scene_filter: { rating100: { value: 0, modifier: IS_NULL }, studios: { value: [], modifier: IS_NULL }, performer_count: { value: 0, modifier: GREATER_THAN } }"
                    : ", scene_filter: { rating100: { value: 74, modifier: GREATER_THAN }, performer_count: { value: 0, modifier: GREATER_THAN } }")
                : "";
            return refractSceneQuery(function (F) {
                return "query { findScenes(filter: { per_page: 1, sort: \"random\" }" + f + ") { scenes { " + F + " } } }";
            }).then(function (r) {
                    var s = r.data && r.data.findScenes.scenes[0];
                    if (!s && filtered) { return randomScene(false); }
                    return s || null;
                });
        }
        function randomPerformer(filtered) {
            var f = filtered
                ? (plain
                    ? ", performer_filter: { rating100: { value: 0, modifier: IS_NULL }, scene_count: { value: 0, modifier: GREATER_THAN } }"
                    : ", performer_filter: { rating100: { value: 74, modifier: GREATER_THAN }, scene_count: { value: 0, modifier: GREATER_THAN } }")
                : "";
            return refractGqlQuery("query { findPerformers(filter: { per_page: 1, sort: \"random\" }" + f + ") { performers { " + PREVIEW_PERF_FIELDS + " } } }")
                .then(function (r) {
                    var p = r.data && r.data.findPerformers.performers[0];
                    if (!p && filtered) { return randomPerformer(false); }
                    return p || null;
                });
        }
        function byId(kind, id2, fields) {
            return refractGqlQuery("query { " + kind + "(id: \"" + id2 + "\") { " + fields + " } }")
                .then(function (r) { return (r.data && r.data[kind]) || null; });
        }
        var storedScene = null, storedPerf = null;
        try {
            storedScene = localStorage.getItem(PREVIEW_SCENE_ID_KEY);
            storedPerf = localStorage.getItem(PREVIEW_PERF_ID_KEY);
        } catch (e) { /* ignore */ }
        var sceneP = (!shuffle && storedScene)
            ? refractSceneQuery(function (F) {
                return "query { findScene(id: \"" + storedScene + "\") { " + F + " } }";
              }).then(function (r) {
                var s = (r.data && r.data.findScene) || null;
                return s || randomScene(true);
              })
            : randomScene(true);
        var perfP = (!shuffle && storedPerf)
            ? byId("findPerformer", storedPerf, PREVIEW_PERF_FIELDS).then(function (p) { return p || randomPerformer(true); })
            : randomPerformer(true);
        return Promise.all([sceneP, perfP]).then(function (rs) {
            try {
                if (rs[0]) { localStorage.setItem(PREVIEW_SCENE_ID_KEY, String(rs[0].id)); }
                if (rs[1]) { localStorage.setItem(PREVIEW_PERF_ID_KEY, String(rs[1].id)); }
            } catch (e) { /* ignore */ }
            return { scene: rs[0], performer: rs[1] };
        });
    }

    /* ── Card element visibility ─────────────────────────────────────
       Ground-up model (2026-07-26, replacing the ad-hoc per-request
       toggle pile from 1.19): every element a scene / performer card
       shows is a chip in the customiser, grouped per card type, all
       defaulting to SHOWN. This one table drives the storage keys, the
       body classes, and the settings UI. Resolution is deliberately
       absent: the res chip follows the Scene card style (Classic shows
       it, the tidy layout hides it) and is not an independent choice. */
    /* `sideKey` marks the elements that live on the card's TOP EDGE and can
       therefore sit left or right. The bottom edge is spoken for (title bar +
       performer row + duration/count pills), so there are two places, not
       four. The tier ribbon is the only one that crosses a corner rather than
       sitting in the row, which is why it is the only one that needs a
       layering choice when it shares a side. */
    var CARD_ELEMS = [
        /* `sel` is where the element is DRAWN on the card. The customiser lays
           a hit target over it so the OBJECT is its own control -- the same
           move the stat pills made. Without it, a corner holding three
           elements had to put their actions in one shared tray, where "Move to
           bottom corner" could not say WHICH of the three it moved. */
        { key: "refract.scHideRating",     cls: "refract-sc-hide-rating",     group: "scene",     label: "Rating banner",
          sel: ":scope > .rating-banner",
          sideKey: "refract.scRatingSide", sideDefault: "left",  sideCls: "refract-sc-rating-right",
          /* The one side class named for the RIGHT. */
          sideClsSide: "right" },
        { key: "refract.scHideTier",       cls: "refract-sc-hide-tier",       group: "scene",     label: "Tier ribbon", tier: true,
          sel: ".refract-pc-tier-label",
          sideKey: "refract.scTierSide",   sideDefault: "right", sideCls: "refract-sc-tier-left" },
        /* The studio has THREE positions, not two: the top-left and top-right
           corners, and the bottom-right corner beside the count pills. The
           extra body class is applied when the side is "bottom"; the count
           cluster lifts out of its way in CSS. `sideCls` still names the
           left class so everything that reads it keeps working. */
        { key: "refract.scHideStudio",     cls: "refract-sc-hide-studio",     group: "scene",     label: "Studio logo",
          sel: ".studio-overlay, .refract-sc-studio-name",
          sideKey: "refract.scStudioSide", sideDefault: "right", sideCls: "refract-sc-studio-left",
          sides: ["left", "right", "bottom"], bottomCls: "refract-sc-studio-bottom" },
        { key: "refract.scHideDuration",   cls: "refract-sc-hide-duration",   group: "scene",     label: "Duration",
          sel: ".stash-duration-pill, .scene-specs-overlay .overlay-duration" },
        { key: "refract.scHidePerformers", cls: "refract-sc-hide-performers", group: "scene",     label: "Performers",
          sel: ".stash-performer-avatars" },
        /* "Count pills" was one switch over two pills that answer different
           questions (how often, how tagged); each is its own now. The old key
           migrates in applyCardElemClasses. */
        { key: "refract.scHideOCount",     cls: "refract-sc-hide-ocount",     group: "scene",     label: "O count",
          sel: ".stash-o-count" },
        { key: "refract.scHideTagCount",   cls: "refract-sc-hide-tagcount",   group: "scene",     label: "Tag count",
          sel: ".stash-tag-count" },
        /* Only the Classic scene card shows a date line and a resolution
           badge; the Refract layout hides both by design (the tidy chin). So
           these are offered only there -- a chip for a thing the layout never
           draws would be the no-op Rating banner all over again. */
        { key: "refract.scHideDate",       cls: "refract-sc-hide-date",       group: "scene",     label: "Date", classicOnly: true,
          sel: ".scene-card__date" },
        { key: "refract.scHideResolution", cls: "refract-sc-hide-resolution", group: "scene",     label: "Resolution", classicOnly: true,
          sel: ".scene-specs-overlay .overlay-resolution" },
        /* The third and last Classic-only element: the scene's own description
           under the title. Stash draws it, Refract's chin does not, and it was
           the one thing on a Classic card with no switch at all.
           `.file-path` and the file-size overlay beside it are deliberately NOT
           offered: Stash has its own setting for those ("show extra file info")
           and a second switch over one thing is how a panel starts lying. */
        { key: "refract.scHideDetails",    cls: "refract-sc-hide-details",    group: "scene",     label: "Description", classicOnly: true,
          sel: ".scene-card__description" },
        /* The last untoggleable scene element. Off, the card is a pure
           poster -- same legitimate wall as hiding the performer's name. */
        { key: "refract.scHideTitle",      cls: "refract-sc-hide-title",      group: "scene",     label: "Title",
          sel: ".card-section-title" },
        /* NO-OP. Its rule hides `.performer-card .rating-banner`, and a
           performer card never renders one: checked live across four
           performers under BOTH card styles, always ABSENT. The performer's
           rating is one of the stat pills along the bottom, so "Stat pills"
           already covers it. Offering this was a control that did nothing. */
        { key: "refract.pcHideRating",     cls: "refract-pc-hide-rating",     group: "performer", label: "Rating banner", noop: true },
        { key: "refract.pcHideTier",       cls: "refract-pc-hide-tier",       group: "performer", label: "Tier ribbon", tier: true,
          sel: ".refract-pc-tier-label:not(.refract-mb-sash)" },
        /* The one element that was never toggleable, and the reason the
           performer card's top-left corner offered nothing. Hidden, the card
           is a pure picture, which is a legitimate wall. Deliberately in no
           look: hiding a name is an act, not a style. */
        { key: "refract.pcHideName",       cls: "refract-pc-hide-name",       group: "performer", label: "Name",
          sel: ".refract-pc-name-banner:not(.refract-mb-name)" },
        { key: "refract.pcHideCountry",    cls: "refract-pc-hide-country",    group: "performer", label: "Country",
          sel: ".stash-perf-country" },
        { key: "refract.pcHideStats",      cls: "refract-pc-hide-stats",      group: "performer", label: "Stat pills" },
        /* Ascension's rank read-out. Its visibility used to be a side effect
           of the Country chip (the badge is HOSTED inside the country caption
           when one exists); now it has its own switch and survives the
           country's. Only offered when Ascension is actually installed. */
        { key: "refract.pcHideRank",       cls: "refract-pc-hide-rank",       group: "performer", label: "Rank badge", plugin: "ascension",
          sel: ".hon-battle-rank-badge" },
        /* The flip tab, and with it the whole back. Every OTHER thing about the
           back was configurable -- its face, its picture, its stats, its tray,
           each panel of the dossier -- except whether you wanted one. The back
           is built lazily on first flip, so this costs nothing when off; it
           takes the tab off the card and leaves a plain picture. */
        { key: "refract.pcHideBack",       cls: "refract-pc-hide-back",       group: "performer", label: "Flip tab",
          sel: ".refract-card-flip-btn" },
        /* The BACK of a performer card. In "mirror" style the back is the same
           face as the front configured differently, so it has its own copies of
           the same kinds of element rather than sharing the front's. */
        /* The sash is the back's only on/off element. Its STATS are not
           toggles any more: the strip is an ordered list of slots and each slot
           holds whichever stat you put in it, which is what the back was always
           claiming to be ("its own selection"). Seven checkboxes could express
           the same set but never the same ORDER, and made you think in terms of
           what to hide rather than what to show. See BACK_STATS. */
        { key: "refract.mbHideTier",       cls: "refract-mb-hide-tier",       group: "back", label: "Tier ribbon", tier: true, gallery: true,
          sel: ".refract-mb-sash" },
        /* The back's own copies of two elements the front could always switch
           off and the back could not. The back is not the front: you may want
           the name on the picture side and the numbers alone on the back, or
           the reverse. Both were fixed furniture. */
        { key: "refract.mbHideName",       cls: "refract-mb-hide-name",       group: "back", label: "Name", gallery: true,
          sel: ".refract-mb-name" },
        { key: "refract.mbHideStats",      cls: "refract-mb-hide-stats",      group: "back", label: "Stat pills", gallery: true,
          sel: ".refract-mb-stats" },
        /* The dossier's two switchable panels. Its ratings grid stays fixed
           (that layout IS the look), but the media strip and the collector
           footer are additions a purist may not want -- and the dossier being
           the DEFAULT back with zero knobs was its own finding. */
        /* The title bar and the portrait-and-score row. Two of the
           dossier's five panels could be switched and three could not, and no
           rule said which -- the ratings grid IS the look and stays fixed, but
           a name you have already read on the front and a portrait you are
           looking through are both things a reader may not want twice. */
        { key: "refract.cbHideHead",       cls: "refract-cb-hide-head",       group: "back", label: "Title bar", dossier: true,
          sel: ".refract-cb-head" },
        { key: "refract.cbHideHero",       cls: "refract-cb-hide-hero",       group: "back", label: "Portrait & score", dossier: true,
          sel: ".refract-cb-hero" },
        { key: "refract.cbHideMedia",      cls: "refract-cb-hide-media",      group: "back", label: "Media strip", dossier: true,
          sel: ".refract-cb-media" },
        { key: "refract.cbHideFoot",       cls: "refract-cb-hide-foot",       group: "back", label: "Collector footer", dossier: true,
          sel: ".refract-cb-foot" }
    ];
    /* Which quadrant of the card each element lives in. Top-edge scene
       elements are absent on purpose: their corner follows their own
       Left/Right side. Performer top elements are fixed, because the name
       banner owns the edge between them and neither can move. */
    var ELEM_ZONE_FIXED = {
        /* Scene-card elements really do live in corners. */
        "refract.scHidePerformers": "bl",
        "refract.scHideDuration":   "br",
        "refract.scHideOCount":     "br",
        "refract.scHideTagCount":   "br",
        "refract.scHideDate":       "bl",
        "refract.scHideResolution": "br",
        /* The performer card's do NOT. Measured on a 216px preview, the country
           caption runs x9-207 and the stat strip x9-207 -- both the full width
           of the card. Pinned to "bl" and "br" they got a half-width ring each,
           so every ring pointed at half of its element and at half of the other
           one, and the two top corners promised controls that were not there.
           They share the bottom BAND, the way the back's strip does. */
        "refract.pcHideCountry":    "bottom",
        "refract.pcHideStats":      "bottom",
        "refract.pcHideName":       "tl",
        "refract.pcHideRating":     "tl",
        "refract.pcHideTier":       "tr",
        /* The back's stats live in ONE strip across the bottom, so they share
           one zone. Splitting them across bl and br would ring half a row. */
        "refract.mbHideTier":       "tr",
        "refract.mbHideName":       "tl",
        /* With the strip's slot chips, exactly as the front's on/off sits with
           the front's. One band, one strip, one place to ask about it. */
        "refract.mbHideStats":      "bottom",
        "refract.pcHideRank":       "bottom",
        "refract.scHideTitle":      "bl",
        "refract.scHideDetails":    "bl",
        /* Measured on the preview: the flip tab is a 27x40 tab on the card's
           RIGHT EDGE at y45-55%, which is no corner at all. In "tr" its chip
           sat in a tray whose band stopped at 29% -- a control naming an
           element you could not reach from it. Its own thin band, where it
           actually is. */
        "refract.pcHideBack":       "edge",
        "refract.cbHideHead":       "dhead",
        "refract.cbHideHero":       "dhero",
        "refract.cbHideMedia":      "dmedia",
        "refract.cbHideFoot":       "dfoot"
    };
    var TIER_LAYER_KEY = "refract.scTierLayer";
    /* The studio can be a logo in a corner, or the studio's NAME set before the
       scene title. "text" moves it out of the corner entirely, which is why it
       is a mode rather than another on/off. */
    var STUDIO_MODE_KEY = "refract.scStudioMode";
    /* The card back. One anatomy: which image it uses, whether the media tray
       is on, and where the rating is drawn. There is deliberately no "style"
       key any more -- Mirror is this same face with the tray off. */
    var BACK_SRC_KEY = "refract.cbSrc";
    /* Explicit card-back labels are built but held back from public release:
       the toggle is hidden and isCardBackExplicit() is forced off while this is
       false. Flip to true to ship the feature (no other change needed). */
    var REFRACT_CARDBACK_EXPLICIT_ENABLED = false;
    var CARD_BACK_EXPLICIT_KEY = "refract.cardBackExplicit";

    /* Which face the back wears. "gallery" is the image-and-tray anatomy every
       other look configures; "dossier" is the stats sheet, which is a different
       anatomy and therefore a different builder rather than another
       arrangement of the same one. */
    var BACK_STYLE_KEY = "refract.cbStyle";
    /* Which stats the back's strip carries, in order. Six slots maximum:
       seven pills wrap to a second row at 285px and the strip stops reading as
       a strip. */
    var BACK_PILLS_KEY = "refract.cbPills";
    var BACK_PILLS_MAX = 6;
    var TRAY_KEY = "refract.cbTray";
    var TRAY_PHOTOS_KEY = "refract.cbTrayPhotos";
    /* Two rows of three, or one. One row leaves the image most of the card and
       still says "there is more here"; two makes the tray the subject. */
    var TRAY_ROWS_KEY = "refract.cbTrayRows";

    /* Every stat the back can hold. `icon` matters as much as the value: the
       front's pill is a two-column grid with the icon in column 1 and the value
       in column 2, so a pill WITHOUT an icon leaves column 1 empty and the
       number sits visibly off-centre. That is also what made the back's pills
       read as almost-but-not-quite the front's. With icons they are the same
       component, and the two faces differ only in WHICH stats they carry --
       which was the point. */
    var BACK_STATS = [
        { key: "rating",  label: "Rating",  icon: "STAR" },
        /* The front carried Age and the back could not, for no reason beyond
           the flip query not asking for a birthdate. The two strips are the
           same component and now offer the same catalogue. */
        { key: "age",     label: "Age",     icon: "CAKE" },
        { key: "height",  label: "Height",  icon: "HEIGHT" },
        { key: "career",  label: "Career",  icon: "HOURGLASS" },
        /* The pill says "Stats" because "Measurements" will not fit a pill;
           the menu says Measurements because "Stats" inside a list of stats
           says nothing. */
        { key: "measure", label: "Stats",   menu: "Measurements", icon: "TAPE" },
        { key: "weight",  label: "Weight",  icon: "WEIGHT" },
        { key: "o",       label: "O Count", icon: "O" },
        { key: "scenes",  label: "Scenes",  icon: "PLAY" }
    ];
    var BACK_PILLS_DEFAULT = ["rating", "height", "career", "scenes"];

    /* The dossier's collector footer, which was a hardcoded list of six in a
       hardcoded order -- built by a different hand from the two stat strips
       and therefore a different KIND of thing to the reader, though it is a
       row of stats like the others. Same catalogue, same slots, same machine.
       The default is exactly what it drew before, so nobody's card moves. */
    var FOOT_PILLS_KEY = "refract.cbFoot";
    var FOOT_PILLS_MAX = 6;
    var FOOT_PILLS_DEFAULT = ["scenes", "o", "measure", "height", "weight", "career"];
    function footPillsPref() {
        var raw;
        try { raw = localStorage.getItem(FOOT_PILLS_KEY); } catch (e) { raw = null; }
        if (raw == null) { return FOOT_PILLS_DEFAULT.slice(); }
        var out = [];
        String(raw).split(",").forEach(function (k) {
            k = k.trim();
            if (k && backStatDef(k) && out.indexOf(k) === -1) { out.push(k); }
        });
        return out.slice(0, FOOT_PILLS_MAX);
    }

    /* The FRONT strip is a slot list too. It was a fixed four (rating, age,
       o-count, scenes) behind one on/off chip, while the back's was editable
       per pill -- the inconsistency was the complaint. Same catalogue as the
       back plus age, which lives on the front. Four of these are read straight
       off Stash's card DOM; the other four need a query, batched once per
       grid rather than once per card. */
    var FRONT_PILLS_KEY = "refract.pcPills";
    var FRONT_PILLS_MAX = 6;
    var FRONT_STATS = [
        { key: "rating",  label: "Rating",  icon: "STAR",      dom: true },
        { key: "age",     label: "Age",     icon: "CAKE",      dom: true },
        { key: "o",       label: "O Count", icon: "O",         dom: true },
        { key: "scenes",  label: "Scenes",  icon: "PLAY",      dom: true },
        { key: "height",  label: "Height",  icon: "HEIGHT" },
        { key: "career",  label: "Career",  icon: "HOURGLASS" },
        /* The pill says "Stats" because "Measurements" will not fit a pill;
           the menu says Measurements because "Stats" inside a list of stats
           says nothing. */
        { key: "measure", label: "Stats",   menu: "Measurements", icon: "TAPE" },
        { key: "weight",  label: "Weight",  icon: "WEIGHT" }
    ];
    var FRONT_PILLS_DEFAULT = ["rating", "age", "o", "scenes"];
    function frontStatDef(key) {
        for (var i = 0; i < FRONT_STATS.length; i++) {
            if (FRONT_STATS[i].key === key) { return FRONT_STATS[i]; }
        }
        return null;
    }
    function frontPillsPref() {
        var raw;
        try { raw = localStorage.getItem(FRONT_PILLS_KEY); } catch (e) { raw = null; }
        if (raw == null) { return FRONT_PILLS_DEFAULT.slice(); }
        var out = [];
        String(raw).split(",").forEach(function (k) {
            k = k.trim();
            if (k && frontStatDef(k) && out.indexOf(k) === -1) { out.push(k); }
        });
        return out.slice(0, FRONT_PILLS_MAX);
    }
    /* The class the front's CSS knows each pill by. Rating/age/scenes keep
       their historic names; o-count is `stash-perf-ocount` on the front. */
    function frontPillClass(key) {
        return key === "o" ? "stash-perf-ocount" : ("stash-perf-" + key);
    }
    function frontStatIcon(name) {
        return name === "CAKE" ? CAKE_SVG : backStatIcon(name);
    }
    function backStatIcon(name) {
        return name === "STAR" ? STAR_SVG
             : name === "CAKE" ? CAKE_SVG
             : name === "PLAY" ? PLAY_SVG
             : name === "O" ? O_ICON_SVG
             : name === "HEIGHT" ? HEIGHT_SVG
             : name === "HOURGLASS" ? HOURGLASS_SVG
             : name === "TAPE" ? TAPE_SVG
             : name === "WEIGHT" ? WEIGHT_SVG
             : "";
    }
    /* Whole years from a YYYY-MM-DD birthdate, or null. The front reads its
       age straight off Stash's own card markup; the back has only the record,
       so it does the arithmetic once here rather than in the painter. */
    function refractAgeFrom(bd) {
        if (!bd) { return null; }
        var m = String(bd).match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (!m) { return null; }
        var now = new Date();
        var y = now.getFullYear() - Number(m[1]);
        var mo = (now.getMonth() + 1) - Number(m[2]);
        if (mo < 0 || (mo === 0 && now.getDate() < Number(m[3]))) { y -= 1; }
        return (y > 0 && y < 130) ? String(y) : null;
    }
    function backStatDef(key) {
        for (var i = 0; i < BACK_STATS.length; i++) {
            if (BACK_STATS[i].key === key) { return BACK_STATS[i]; }
        }
        return null;
    }
    /* The DOSSIER is the default. It is the face that makes the flip worth
       making: the only one carrying something neither side of the card can
       otherwise show, the per-category ratings. The gallery face -- the front's
       shell around a media tray -- reads as a re-skinned front, because three
       quarters of it is inherited from the front by construction.

       The gallery stays as the picture-led alternative, and is used
       automatically for anyone whose library has no category ratings at all,
       since an empty dossier is a worse default than a picture. */
    function backStylePref() {
        try {
            var v = localStorage.getItem(BACK_STYLE_KEY);
            if (v === "gallery" || v === "dossier") { return v; }
        } catch (e) { /* fall through */ }
        return "dossier";
    }
    function storedBackStyle() { return backStylePref(); }
    function backPillsPref() {
        var raw;
        try { raw = localStorage.getItem(BACK_PILLS_KEY); } catch (e) { raw = null; }
        if (raw == null) { return BACK_PILLS_DEFAULT.slice(); }
        /* An empty string is a real answer -- the Contact sheet look has no
           strip at all -- so it is not treated as "unset". */
        var out = [];
        String(raw).split(",").forEach(function (k) {
            k = k.trim();
            if (k && backStatDef(k) && out.indexOf(k) === -1) { out.push(k); }
        });
        return out.slice(0, BACK_PILLS_MAX);
    }
    /* "pill" is a stat pill in the bottom strip; "edge" is a bar along the
       bottom edge. The sash carries the TIER and nothing else -- putting the
       rating on it too was a third home for one fact and a second thing for the
       sash to mean. */
    var RATING_DISP_KEY = "refract.cbRating";
    var CARD_SIDE_KEYS = CARD_ELEMS.filter(function (d) { return d.sideKey; })
        .map(function (d) { return d.sideKey; })
        .concat([TIER_LAYER_KEY, STUDIO_MODE_KEY, BACK_SRC_KEY, BACK_PILLS_KEY, FRONT_PILLS_KEY,
            FOOT_PILLS_KEY, BACK_STYLE_KEY, TRAY_KEY, TRAY_PHOTOS_KEY, TRAY_ROWS_KEY,
            RATING_DISP_KEY, CARD_BACK_EXPLICIT_KEY]);
    /* What "Reset card customiser" clears: every element, side and back key.
       Not the flourish, the card styles, the popover or the rating system --
       those reach past the cards. */
    var REFRACT_CARD_RESET_KEYS = CARD_ELEMS.map(function (d) { return d.key; }).concat(CARD_SIDE_KEYS);

    function isCardElemHidden(key) {
        try { return localStorage.getItem(key) === "1"; } catch (e) { return false; }
    }
    function cardElemSide(d) {
        if (!d.sideKey) { return null; }
        try {
            var v = localStorage.getItem(d.sideKey);
            var ok = d.sides || ["left", "right"];
            return ok.indexOf(v) !== -1 ? v : d.sideDefault;
        } catch (e) { return d.sideDefault; }
    }
    function storedStudioMode() { return studioModePref(); }
    function storedBackSrc() { return backSrcPref(); }
    function storedTrayOn() { return trayOnPref(); }
    function storedTrayPhotos() { return trayPhotosPref(); }
    function storedTrayRows() { return trayRowsPref(); }
    function storedRatingDisp() { return ratingDispPref(); }
    /* The tray is the reason the back exists, so it is on unless turned off. */
    function trayOnPref() {
        try { return localStorage.getItem(TRAY_KEY) !== "0"; } catch (e) { return true; }
    }
    function trayPhotosPref() {
        try { return localStorage.getItem(TRAY_PHOTOS_KEY) !== "0"; } catch (e) { return true; }
    }
    function trayRowsPref() {
        try { return localStorage.getItem(TRAY_ROWS_KEY) === "1" ? 1 : 2; } catch (e) { return 2; }
    }
    function ratingDispPref() {
        try {
            /* "sash" was a third option and is gone; anything stored from then
               lands on the pill, which is where the rating started. */
            return localStorage.getItem(RATING_DISP_KEY) === "edge" ? "edge" : "pill";
        } catch (e) { return "pill"; }
    }
    function effectiveRatingDisp() { return ratingDispPref(); }
    function backSrcPref() {
        try {
            var v = localStorage.getItem(BACK_SRC_KEY);
            return (v === "portrait" || v === "photo") ? v : "scene";
        } catch (e) { return "scene"; }
    }
    function studioModePref() {
        try { return localStorage.getItem(STUDIO_MODE_KEY) === "text" ? "text" : "logo"; }
        catch (e) { return "logo"; }
    }
    function applyStudioModeClass() {
        if (!document.body) { return; }
        document.body.classList.toggle("refract-sc-studio-text", studioModePref() === "text");
    }
    /* The tray is always in the DOM -- its region has to stay hoverable even
       when switched off, so that one chip can bring it back -- which means the
       switch is a class, not a branch in the builder. */
    function applyBackClasses() {
        if (!document.body) { return; }
        document.body.classList.toggle("refract-cb-tray-off", !trayOnPref());
    }
    /* Set the studio's NAME before the scene title. The name is only available
       where Stash rendered a `.studio-overlay` (measured: 13 of 40 cards on the
       scenes page), and it lives in the logo image's `alt`, so this shows the
       studio on exactly the cards that would have shown a logo. Nothing is
       invented for cards that never had one.

       A new node inside a React-managed <h5>, not a moved one: the consolidated
       observer re-runs this after every re-render, which is the same contract
       the performer circles use. */
    function applyStudioTextPrefix() {
        /* Own the body class here rather than relying on the module-eval call:
           that one runs before `document.body` is guaranteed and lost the race
           on some loads, which left the name injected AND the logo still
           showing. This runs from the consolidated observer, so it cannot. */
        applyStudioModeClass();
        var on = studioModePref() === "text";
        var cards = document.querySelectorAll(".scene-card");
        for (var i = 0; i < cards.length; i++) {
            var card = cards[i];
            var title = card.querySelector("h5.card-section-title");
            if (!title) { continue; }
            var existing = title.querySelector(".refract-sc-studio-name");
            var name = "";
            if (on) {
                var overlay = card.querySelector(".studio-overlay");
                if (overlay) {
                    var img = overlay.querySelector("img");
                    name = ((img && img.alt) || overlay.textContent || "").trim();
                }
            }
            if (!name) {
                if (existing && existing.parentNode) { existing.parentNode.removeChild(existing); }
                continue;
            }
            if (existing) {
                if (existing.textContent !== name) { existing.textContent = name; }
                continue;
            }
            var span = document.createElement("span");
            span.className = "refract-sc-studio-name";
            span.textContent = name;
            title.insertBefore(span, title.firstChild);
        }
    }
    function tierLayerPref() {
        try { return localStorage.getItem(TIER_LAYER_KEY) === "logo" ? "logo" : "ribbon"; }
        catch (e) { return "ribbon"; }
    }
    /* The one-time split of "Count pills" into O count and Tag count. Runs on
       every apply, because the boot sync can write the old key back from a
       server copy saved before the split; it is a no-op once the key is gone. */
    function migrateCountPills() {
        try {
            var old = localStorage.getItem("refract.scHideCounts");
            if (old === null) { return; }
            if (localStorage.getItem("refract.scHideOCount") === null) { localStorage.setItem("refract.scHideOCount", old); }
            if (localStorage.getItem("refract.scHideTagCount") === null) { localStorage.setItem("refract.scHideTagCount", old); }
            localStorage.removeItem("refract.scHideCounts");
        } catch (e) { /* ignore */ }
    }
    /* THE badge-sits-alone rule, written once.

       It was written twice, in two vocabularies: the customiser resolved it
       over its own settings map, and the boot pass resolved it straight over
       localStorage. They disagreed -- only the customiser knew that when
       something takes the badge's corner, the badge's old corner-mate should
       come BACK to join it rather than be left sitting alone opposite. Two
       readings of one sentence is how a rule stops feeling like a rule.

       `at(key, sides)` answers "which corner does this really occupy" and is
       supplied by the caller, because the customiser knows its own live state
       and the boot pass only has storage. `placed` keeps its corner; whatever
       clashes gives way. Pure: it returns a new map and writes nothing. */
    var REFRACT_CORNER_KEYS = ["refract.scHideRating", "refract.scHideTier", "refract.scHideStudio"];
    var REFRACT_RATING_KEY = "refract.scHideRating";
    function refractResolveCorners(sides, at, placed) {
        var m = {};
        Object.keys(sides).forEach(function (k) { m[k] = sides[k]; });
        var side = at(placed, m);
        if (side !== "left" && side !== "right") { return m; }
        var opp = side === "left" ? "right" : "left";
        if (placed === REFRACT_RATING_KEY) {
            /* The badge claims this corner; the sash and the logo move across,
               where they may sit together. */
            REFRACT_CORNER_KEYS.forEach(function (k) {
                if (k !== REFRACT_RATING_KEY && at(k, m) === side) { m[k] = opp; }
            });
        } else if (at(REFRACT_RATING_KEY, m) === side) {
            /* Something took the badge's corner, so the badge moves across --
               and whatever was over there comes back to join the element that
               displaced it, rather than landing on the badge again. */
            m[REFRACT_RATING_KEY] = opp;
            REFRACT_CORNER_KEYS.forEach(function (k) {
                if (k === REFRACT_RATING_KEY || k === placed) { return; }
                if (at(k, m) === opp) { m[k] = side; }
            });
        }
        return m;
    }
    /* A saved layout from before the badge-sits-alone rule can still have the
       rating sharing a corner with the sash or the studio -- the rule only
       fires when you PLACE something, and nobody re-places what is already
       where they left it. Normalised once at boot: the badge keeps the corner
       it was given, the others step across (where they may sit together).
       Silent, but the state it corrects is one the UI would no longer let you
       create, and it only ever moves things apart. */
    var REFRACT_CORNER_SIDE_KEYS = {
        "refract.scHideRating": ["refract.scRatingSide", "left"],
        "refract.scHideTier": ["refract.scTierSide", "right"],
        "refract.scHideStudio": ["refract.scStudioSide", "right"]
    };
    /* WHERE AN IMAGE ACTUALLY PAINTS.

       A studio logo is an <img> with `object-fit: contain` inside a box of
       fixed size, so the artwork is letterboxed and the shape of what you SEE
       depends entirely on that studio's file. Measured across one grid: the
       same 112x50 box paints 112x8.5 for a 1351x102 wordmark and 112x41 for a
       182x67 square-ish mark -- a five-fold difference in height between two
       cards side by side. The box says almost nothing about where the logo is,
       which is why an outline drawn on the box lined up with nothing and
       lined up differently on every card.

       `object-position` decides where the letterboxed rectangle sits in the
       leftover space; Chrome reports it as two percentages or two lengths, and
       both are handled. Anything but contain/scale-down fills the box, so the
       box is already the answer. */
    function refractPaintedRect(n) {
        var r = n.getBoundingClientRect();
        var nw = n.naturalWidth, nh = n.naturalHeight;
        /* Not loaded yet: the box is the best guess, and the measure pass runs
           again on a timer, so a late image corrects itself. */
        if (!nw || !nh || !r.width || !r.height) { return r; }
        var cs;
        try { cs = window.getComputedStyle(n); } catch (e) { return r; }
        var fit = cs.objectFit;
        if (fit !== "contain" && fit !== "scale-down") { return r; }
        var sc = Math.min(r.width / nw, r.height / nh);
        if (fit === "scale-down") { sc = Math.min(sc, 1); }
        var w = nw * sc, h = nh * sc;
        var slackX = r.width - w, slackY = r.height - h;
        var pos = String(cs.objectPosition || "50% 50%").trim().split(/\s+/);
        var axis = function (raw, slack) {
            if (raw === undefined) { return slack / 2; }
            var v = parseFloat(raw);
            if (isNaN(v)) { return slack / 2; }
            return /%$/.test(raw) ? slack * (v / 100) : v;
        };
        return {
            left: r.left + axis(pos[0], slackX),
            top: r.top + axis(pos.length > 1 ? pos[1] : pos[0], slackY),
            width: w,
            height: h
        };
    }
    function normaliseSceneCorners() {
        var moved = false;
        try {
            var sides = {};
            REFRACT_CORNER_KEYS.forEach(function (k) {
                var c = REFRACT_CORNER_SIDE_KEYS[k];
                sides[k] = localStorage.getItem(c[0]) || c[1];
            });
            var minimal = localStorage.getItem(FLOURISH_KEY) === "minimal";
            var studioText = localStorage.getItem(STUDIO_MODE_KEY) === "text";
            /* The same question the customiser's `cornerSideOf` answers, asked
               of storage: hidden, gated off by Minimal, or set as title text
               all mean "not in a corner". */
            var at = function (k, m) {
                if (localStorage.getItem(k) === "1") { return null; }
                if (k === "refract.scHideTier" && minimal) { return null; }
                if (k === "refract.scHideStudio" && studioText) { return null; }
                var sd = m[k];
                return (sd === "left" || sd === "right") ? sd : null;
            };
            var out = refractResolveCorners(sides, at, REFRACT_RATING_KEY);
            REFRACT_CORNER_KEYS.forEach(function (k) {
                if (out[k] === sides[k]) { return; }
                localStorage.setItem(REFRACT_CORNER_SIDE_KEYS[k][0], out[k]);
                moved = true;
            });
        } catch (e) { /* ignore */ }
        return moved;
    }
    /* Once at boot -- and again after the server copy lands, because that pull
       overwrites localStorage and would otherwise reinstate the very clash
       this just corrected. Whichever runs last wins, and both are idempotent. */
    if (normaliseSceneCorners()) { scheduleServerSync(); }

    function applyCardElemClasses() {
        if (!document.body) { return; }
        migrateCountPills();
        CARD_ELEMS.forEach(function (d) {
            document.body.classList.toggle(d.cls, isCardElemHidden(d.key));
        });
        /* Ascension's rank badge is HOSTED inside the country caption when a
           country is shown, so hiding the country used to take the badge down
           with it -- its visibility hanging off an unrelated chip. The hosting
           logic already refuses a hidden caption and falls back to the chin,
           but it only runs from the DOM observer, which watches childList and
           never sees a body CLASS change. Re-home the badges here, at the one
           place every element-visibility change passes through. */
        try { integrateAscensionBadges(); } catch (e) { /* Ascension absent */ }
    }
    /* Only the NON-default side gets a class, so the shipped layout costs no
       extra CSS and nothing changes for anyone who never opens this. */
    function applyCardSideClasses() {
        if (!document.body) { return; }
        CARD_ELEMS.forEach(function (d) {
            if (!d.sideKey) { return; }
            var side = cardElemSide(d);
            /* Apply the class for the side the CLASS ITSELF NAMES, not merely
               "not the default" -- with a third position in play, "bottom" must
               not light it. Nearly every sideCls is a `-left` class, but the
               rating banner's is `refract-sc-rating-RIGHT`, so a blanket
               `side === "left"` inverted it: the shipped preference (left) put
               the class on and drew the badge on the RIGHT, straight into the
               corner already holding the tier sash and the studio logo. That
               is the "triple stacked top right by default". */
            document.body.classList.toggle(d.sideCls, side === (d.sideClsSide || "left"));
            if (d.bottomCls) { document.body.classList.toggle(d.bottomCls, side === "bottom"); }
        });
        document.body.classList.toggle("refract-sc-tier-under", tierLayerPref() === "logo");
    }
    /* One-time migration from the retired 1.19 toggle keys; the O-count
       and show-resolution toggles are retired outright. */
    (function migrateCardElemKeys() {
        try {
            [
                ["refract.hideCardRatings", ["refract.scHideRating", "refract.pcHideRating"]],
                ["refract.hideScenePerformers", ["refract.scHidePerformers"]],
                ["refract.hidePerfStats", ["refract.pcHideStats"]]
            ].forEach(function (m) {
                var v = localStorage.getItem(m[0]);
                if (v === "1") {
                    m[1].forEach(function (nk) {
                        if (localStorage.getItem(nk) === null) { localStorage.setItem(nk, "1"); }
                    });
                }
                if (v !== null) { localStorage.removeItem(m[0]); }
            });
            localStorage.removeItem("refract.hidePerfOCount");
            localStorage.removeItem("refract.showSceneRes");
        } catch (e) { /* ignore */ }
    })();
    applyCardElemClasses();
    applyCardSideClasses();
    applyStudioModeClass();

    /* Settings mirrored to Stash's server-side UI config (see the
       settings-sync block below). RATING_SYSTEM is deliberately excluded:
       it's auto-detected from Stash, not a user preference. */
    var REFRACT_SYNC_KEYS = [
        ACCENT_STORAGE_KEY, VIEW_MINIMISER_STORAGE_KEY, LOGO_URL_STORAGE_KEY,
        LITE_MODE_STORAGE_KEY, LIGHT_MODE_STORAGE_KEY, LIGHT_TOGGLE_NAVBAR_KEY,
        HELP_BUTTON_STORAGE_KEY, STUDIO_BANNER_STORAGE_KEY, PERFORMER_CARD_HOVER_KEY,
        MINIMAL_CARDS_STORAGE_KEY, PERF_CARD_STYLE_KEY, FLOURISH_KEY,
        PLUGIN_SORT_DISABLED_BOTTOM_KEY, HIDE_CENTER_CONTROLS_KEY,
        SHOW_FILTER_TAGS_KEY, DOCK_ITEMS_KEY
    ].concat(CARD_ELEMS.map(function (d) { return d.key; })).concat(CARD_SIDE_KEYS);

    function isPluginSortDisabledBottom() {
        try {
            return localStorage.getItem(PLUGIN_SORT_DISABLED_BOTTOM_KEY) === "1";
        } catch (e) { return false; }
    }

    var GRAPHQL_URL = "/graphql";

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

    /* Lite mode — strips backdrop-blur (the heaviest GPU cost on
       Windows Chromium / D3D11), hover glow halos, and the 3D card
       tilt-glare. Animations, base shadows, transitions, and the
       performer carousel loop clones all stay on. CSS rules in
       css/15_lite.css handle the blur kill + solid backgrounds +
       hover-effect strips; the cardTiltBind JS gate skips the tilt
       binding entirely. */
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

    /* Engine flag — true for Blink/Chromium (Chrome/Edge/Opera/Brave), false
       for Gecko (Firefox) and WebKit (Safari). backdrop-filter raster behaves
       very differently across these, so a couple of perf mitigations branch on
       it. Detect by the "Chrome/" UA token (absent in Firefox and Safari). */
    var IS_CHROMIUM = /Chrome\//.test(navigator.userAgent || "");

    /* scroll-perf REMOVED in v1.13.17. It toggled body.refract-scrolling on
       scroll bursts so 17_scroll_perf.css could strip backdrop-filter during
       scroll. On Chromium D3D11, flipping backdrop-filter on every element
       mass-rebuilt hundreds of GPU compositing layers, FREEZING the home page
       for seconds on scroll. It was already gated off for Gecko/WebKit (only
       caused a pop-in flash there, no raster win) and its Chromium benefit was
       marginal at best — net-negative. Static blur scrolls acceptably; the
       toggle cost far more than it saved. (The body.refract-scrolling CSS rules
       were removed from 17_scroll_perf.css in the same change.) */

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
    /* Safari on iOS (and Chrome on Android) tint the browser chrome —
       the status-bar strip above the page — from the theme-color meta,
       which Stash never sets, so it renders WHITE against the dark
       theme on phones. Maintain one matching the page's top-edge
       colour (the --bg-1 end of the body gradient), tracking light
       mode. */
    function refractApplyThemeColorMeta(lightOn) {
        if (!document.head) { return; }
        var meta = document.querySelector('meta[name="theme-color"]');
        if (!meta) {
            meta = document.createElement("meta");
            meta.setAttribute("name", "theme-color");
            document.head.appendChild(meta);
        }
        meta.setAttribute("content", lightOn ? "#fafafa" : "#111111");
    }

    function applyLightModeClass(on) {
        if (!document.body) { return; }
        document.body.classList.toggle("refract-light", !!on);
        refractApplyThemeColorMeta(!!on);
    }
    applyLightModeClass(isLightModeEnabled());

    /* Light-mode navbar toggle visibility. Defaults to ON so users can
       discover light mode without digging into plugin settings. Stash
       Interface tab gets a switch row (injectInterfaceLightToggleSetting)
       so it sits alongside other navbar-item visibility toggles. */
    function isLightToggleNavbarVisible() {
        try {
            var v = localStorage.getItem(LIGHT_TOGGLE_NAVBAR_KEY);
            return v === null || v === "1"; /* default ON when unset */
        } catch (e) { return true; }
    }
    function applyLightToggleNavbarClass(on) {
        if (!document.body) { return; }
        document.body.classList.toggle("refract-show-light-nav", !!on);
    }
    applyLightToggleNavbarClass(isLightToggleNavbarVisible());

    /* Help button visibility. Refract hides Stash's navbar Help (?) button
       by default; this opt-in toggle re-shows it via the `refract-show-help`
       body class (css/02_navbar.css gates the hide + restyles it to match
       the other navbar icon buttons). Defaults OFF (unset = hidden). */
    function isHelpButtonVisible() {
        try {
            return localStorage.getItem(HELP_BUTTON_STORAGE_KEY) === "1";
        } catch (e) { return false; }
    }
    function applyHelpButtonClass(on) {
        if (!document.body) { return; }
        document.body.classList.toggle("refract-show-help", !!on);
    }
    applyHelpButtonClass(isHelpButtonVisible());

    /* Studio banner visibility. Refract shows the studio NAME as a small
       muted label above the scene title by default (the logo image is
       hidden). This opt-in toggle (in "The Suggestion Box" settings drawer)
       swaps the muted text for Stash's original studio logo image via the
       `refract-studio-banner` body class (css/07_scene_details.css gates the
       swap). Defaults OFF. */
    function isStudioBannerVisible() {
        try {
            return localStorage.getItem(STUDIO_BANNER_STORAGE_KEY) === "1";
        } catch (e) { return false; }
    }
    function applyStudioBannerClass(on) {
        if (!document.body) { return; }
        document.body.classList.toggle("refract-studio-banner", !!on);
    }
    applyStudioBannerClass(isStudioBannerVisible());

    /* Performer-card-on-hover. By default hovering a performer circle on a
       scene card shows a small name-only tooltip; this opt-in toggle swaps
       it for a card-style popover (image + name) via the
       `refract-performer-card-hover` body class, read live by the tooltip
       portal logic. Defaults OFF. */
    function isPerformerCardHover() {
        try {
            return localStorage.getItem(PERFORMER_CARD_HOVER_KEY) === "1";
        } catch (e) { return false; }
    }
    function applyPerformerCardHoverClass(on) {
        if (!document.body) { return; }
        document.body.classList.toggle("refract-performer-card-hover", !!on);
    }
    applyPerformerCardHoverClass(isPerformerCardHover());

    /* Scene-player center controls hide. Refract overlays back-10 /
       play / forward-10 buttons on the scene player; this opt-in toggle
       (in "The Suggestion Box") removes them entirely for keyboard-
       first viewing. Defaults OFF (overlay shown). The overlay is
       still injected either way so flipping the toggle takes effect
       live; the `refract-hide-center-controls` body class display-
       gates it in 06_scene_player.css. */
    function isCenterControlsHidden() {
        try {
            return localStorage.getItem(HIDE_CENTER_CONTROLS_KEY) === "1";
        } catch (e) { return false; }
    }
    function applyCenterControlsHiddenClass(on) {
        if (!document.body) { return; }
        document.body.classList.toggle("refract-hide-center-controls", !!on);
    }
    applyCenterControlsHiddenClass(isCenterControlsHidden());

    /* Active-filter chips row. Theme hides it by default (the filter
       button badge shows the count); this opt-in re-shows it so filters
       can be dismissed without opening the filter menu (forum request,
       obatzdamelt 2026-07). Gate in 09_buttons.css; key declared early
       with its siblings so REFRACT_SYNC_KEYS can include it. */
    function isFilterTagsShown() {
        try {
            return localStorage.getItem(SHOW_FILTER_TAGS_KEY) === "1";
        } catch (e) { return false; }
    }
    function applyFilterTagsShownClass(on) {
        if (!document.body) { return; }
        document.body.classList.toggle("refract-show-filter-tags", !!on);
    }
    applyFilterTagsShownClass(isFilterTagsShown());

    /* Scene card style. "refract" (default) = tidier minimal layout —
       description block hidden so the grid stays consistent across
       scenes with and without descriptions. "classic" = Stash's
       original layout with description, file path, and details
       visible. Body class `refract-minimal-cards` is on the "refract"
       branch — every selector in 08_misc_mid.css + 15_lite.css that
       hides/restyles native card details is scoped to that class, so
       "classic" mode = absence of the class. Legacy boolean values
       ("1" / "0") mapped transparently for backwards-compat. */
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

    /* The old single "Card rating style" (intensity / tiers / playing-card)
       bundled two independent axes and is retired. It is now:

         Performer card style  refract | classic   -> LAYOUT
           "refract" is the old playing-card layout (name banner on top, stat
           strip along the bottom). Drives `.refract-perf-layout-card`.

         Rating flourish       minimal | extravagant -> TREATMENT
           "minimal" is the accent halo that brightens with score; the tier
           frames, halos and animations (Bronze -> Perfect) and the tier ribbon
           are "extravagant". Drives `.refract-flourish-tiers`.

       Both default to the shipped look (Classic + Minimal). Only the non-
       default emits a class, so an untouched install carries neither.
       Scene card style stays its own setting; the two card types have always
       had independent layouts and merging them would lose combinations. */
    function storedPreviewKind() {
        try {
            var v = localStorage.getItem(PREVIEW_KIND_KEY);
            /* "back" was its own tab once. Anyone carrying that value lands on
               the performer card, which is the thing the back belongs to. */
            if (v === "back") { return "performer"; }
            return v === "performer" ? v : "scene";
        } catch (e) { return "scene"; }
    }
    function isCustomiserOpen() {
        try { return localStorage.getItem(CUSTOMISER_OPEN_KEY) !== "0"; }
        catch (e) { return true; }
    }
    /* Defaults are REFRACT and EXTRAVAGANT. They were Classic and Minimal,
       which on a fresh install hid the entire back/flip story -- the customiser
       had no Back button, no dossier, no slot chips, no performer-page control,
       all gated on the Refract layout -- and left the "Name" chip a no-op.
       Anyone with a stored value keeps it; only the never-set case moves. */
    function getPerfCardStyle() {
        try {
            return localStorage.getItem(PERF_CARD_STYLE_KEY) === "classic" ? "classic" : "refract";
        } catch (e) { return "refract"; }
    }
    function getFlourish() {
        try {
            return localStorage.getItem(FLOURISH_KEY) === "minimal" ? "minimal" : "extravagant";
        } catch (e) { return "extravagant"; }
    }
    function applyCardModeClasses() {
        if (!document.body) { return; }
        document.body.classList.toggle("refract-perf-layout-card", getPerfCardStyle() === "refract");
        document.body.classList.toggle("refract-flourish-tiers", getFlourish() === "extravagant");
    }
    /* One-time migration off the retired key, same shape as
       migrateCardElemKeys. Runs before the first apply. */
    (function migrateRatingStyle() {
        try {
            var old = localStorage.getItem(RATING_STYLE_STORAGE_KEY);
            if (!old) { return; }
            if (localStorage.getItem(PERF_CARD_STYLE_KEY) === null) {
                localStorage.setItem(PERF_CARD_STYLE_KEY,
                    old === "playing-card" ? "refract" : "classic");
            }
            if (localStorage.getItem(FLOURISH_KEY) === null) {
                localStorage.setItem(FLOURISH_KEY,
                    old === "intensity" ? "minimal" : "extravagant");
            }
            localStorage.removeItem(RATING_STYLE_STORAGE_KEY);
        } catch (e) { /* ignore */ }
    })();
    applyCardModeClasses();

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

    /* GraphQL transport uses XMLHttpRequest, not fetch.
       Some third-party plugins (e.g. stashUserscriptLibrary, used by
       OStats) monkey-patch window.fetch to inject their own per-response
       hooks. Those hooks assume a specific data shape (e.g. data.data.findScene)
       and throw synchronously inside their patched .then when refract's
       responses don't match — which rejects refract's promise chain and
       silently breaks scene-card badge injection (initSceneCards's catch
       swallows the error). XHR isn't typically intercepted, so this
       sidesteps the whole class of conflict. */
    function gqlXhr(body) {
        return new Promise(function (resolve, reject) {
            var xhr = new XMLHttpRequest();
            xhr.open("POST", GRAPHQL_URL, true);
            xhr.withCredentials = true;
            var headers = gqlHeaders();
            Object.keys(headers).forEach(function (k) {
                xhr.setRequestHeader(k, headers[k]);
            });
            xhr.onload = function () {
                var res;
                try { res = JSON.parse(xhr.responseText); }
                catch (e) { reject(e); return; }
                /* onload fires for HTTP 4xx/5xx too (only transport
                   failures hit onerror). Without this guard an auth error
                   (401/403/422) with a parseable JSON body resolves with
                   res.data === undefined, which callers can't distinguish
                   from a legitimately empty result — so enrichment silently
                   no-ops with no retry signal. */
                if (xhr.status < 200 || xhr.status >= 300) {
                    var httpMsg = (res && res.errors && res.errors.length &&
                        res.errors[0].message) || ("HTTP " + xhr.status);
                    reject(new Error(httpMsg));
                    return;
                }
                /* GraphQL total failure: errors present AND no data at all.
                   Partial success (some aliased findScene calls resolved,
                   others errored — see initSceneCards) still carries `data`,
                   so we resolve and let the caller use what it got. */
                if (res && res.errors && res.errors.length && res.data == null) {
                    reject(new Error(res.errors[0].message || "GraphQL error"));
                    return;
                }
                resolve(res);
            };
            xhr.onerror = function () { reject(new Error("network error")); };
            xhr.send(body);
        });
    }

    function gql(query) {
        return gqlXhr(JSON.stringify({ query: query }));
    }

    function gqlWithVars(query, variables) {
        return gqlXhr(JSON.stringify({ query: query, variables: variables }));
    }

    /* ── Server-side settings sync ──────────────────────────────────────
       refract settings live in localStorage for an instant, flash-free
       boot, but localStorage is per-origin and per-browser — so settings
       "reset" when Stash is reached via a different URL/session/relaunch.
       Mirror them into Stash's server-side UI config
       (configuration.ui.refract) so they persist per-server everywhere.
       Contract: localStorage is the instant cache; the server copy is the
       source of truth on boot. On change we write both. */
    function snapshotRefractSettings() {
        var out = {};
        REFRACT_SYNC_KEYS.forEach(function (k) {
            try {
                var v = localStorage.getItem(k);
                if (v !== null) { out[k] = v; }
            } catch (e) { /* ignore */ }
        });
        return out;
    }

    var refractSyncTimer = null;
    function scheduleServerSync() {
        if (refractSyncTimer) { clearTimeout(refractSyncTimer); }
        refractSyncTimer = setTimeout(function () {
            refractSyncTimer = null;
            gqlWithVars(
                'mutation($v: Any){ configureUISetting(key: "refract", value: $v) }',
                { v: snapshotRefractSettings() }
            ).catch(function () { /* offline / no perms — localStorage still holds it */ });
        }, 400);
    }

    /* Re-apply every synced setting from (now-updated) localStorage. Called
       after the server copy is pulled in on boot. Mirrors the boot apply
       sequence; rating-system is auto-detected separately so it's skipped. */
    function reapplyRefractSettings() {
        try {
            /* The pull may have brought back a layout where the rating badge
               shares a corner; correct it before the classes are written, and
               push the correction so the server stops serving it. */
            if (normaliseSceneCorners()) { scheduleServerSync(); }
            applyAccentClass(getStoredAccent());
            applyLiteModeClass(isLiteModeEnabled());
            applyLightModeClass(isLightModeEnabled());
            applyLightToggleNavbarClass(isLightToggleNavbarVisible());
            applyHelpButtonClass(isHelpButtonVisible());
            applyStudioBannerClass(isStudioBannerVisible());
            applyPerformerCardHoverClass(isPerformerCardHover());
            applyCenterControlsHiddenClass(isCenterControlsHidden());
            applyFilterTagsShownClass(isFilterTagsShown());
            applyCardElemClasses();
            applyCardSideClasses();
            applyCardStyleClass(getStoredCardStyle());
            applyCardModeClasses();
        } catch (e) { /* ignore */ }
    }

    /* Boot reconcile: pull the server copy. If present, it wins — write it
       into localStorage and re-apply. If absent (first run after upgrade),
       migrate the current localStorage settings up to the server. */
    /* Server keys that were split or renamed live on in old server copies
       (and are re-imported forever on devices that never re-push). Each maps
       an old server key onto the new local keys it feeds, applied only when
       the server has no opinion on the new keys itself. */
    var REFRACT_SYNC_LEGACY = {
        "refract.scHideCounts": ["refract.scHideOCount", "refract.scHideTagCount"]
    };
    /* Settled-sync listeners: the customiser mounts before this pull lands
       and must re-read everything once it does (the first-visit panel used
       to show shipped defaults over a server copy that said otherwise). */
    var refractSyncSettled = false;
    var refractSyncListeners = [];
    function refractOnSettingsSynced(fn) {
        if (refractSyncSettled) { fn(); return; }
        refractSyncListeners.push(fn);
    }
    function refractSettleSync() {
        refractSyncSettled = true;
        var ls = refractSyncListeners.splice(0);
        ls.forEach(function (fn) { try { fn(); } catch (e) { /* ignore */ } });
    }
    function initSettingsSync() {
        /* What each key held when the pull STARTED: a key the user changes
           while the pull is in flight wins over the server copy, instead of
           being silently reverted a second after they set it. */
        var atBoot = {};
        REFRACT_SYNC_KEYS.forEach(function (k) {
            try { atBoot[k] = localStorage.getItem(k); } catch (e) { atBoot[k] = null; }
        });
        gql("query { configuration { ui } }").then(function (res) {
            var ui = res && res.data && res.data.configuration && res.data.configuration.ui;
            var server = ui && ui.refract;
            if (server && typeof server === "object" && Object.keys(server).length) {
                var changed = false;
                var editedInFlight = false;
                REFRACT_SYNC_KEYS.forEach(function (k) {
                    if (!Object.prototype.hasOwnProperty.call(server, k)) { return; }
                    var sv = server[k];
                    if (sv === null || sv === undefined) { return; }
                    sv = String(sv);
                    var cur = null;
                    try { cur = localStorage.getItem(k); } catch (e) { /* ignore */ }
                    if (cur !== atBoot[k]) { editedInFlight = true; return; }
                    if (cur !== sv) {
                        try { localStorage.setItem(k, sv); changed = true; } catch (e) { /* ignore */ }
                    }
                });
                /* Old-name keys in the server copy feed their successors,
                   unless the server already carries the successors. */
                Object.keys(REFRACT_SYNC_LEGACY).forEach(function (oldK) {
                    var sv = server[oldK];
                    if (sv === null || sv === undefined) { return; }
                    REFRACT_SYNC_LEGACY[oldK].forEach(function (newK) {
                        if (Object.prototype.hasOwnProperty.call(server, newK)) { return; }
                        var cur = null;
                        try { cur = localStorage.getItem(newK); } catch (e) { /* ignore */ }
                        if (cur === null) {
                            try { localStorage.setItem(newK, String(sv)); changed = true; } catch (e) { /* ignore */ }
                        }
                    });
                });
                if (changed) { reapplyRefractSettings(); }
                /* Anything edited mid-pull goes back up so the server copy
                   converges instead of staying one change behind. */
                if (editedInFlight) { scheduleServerSync(); }
            } else if (Object.keys(snapshotRefractSettings()).length) {
                /* No server copy yet — migrate current localStorage up. */
                scheduleServerSync();
            }
            refractSettleSync();
        }).catch(function () { refractSettleSync(); /* no server / no auth — stay on localStorage */ });
    }
    initSettingsSync();

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
                /* No usable config blob in a *successful* response — don't
                   clobber the cached value with "". (An errored/auth-failed
                   response now rejects in gqlXhr and lands in .catch below,
                   so it never reaches here and the cache is preserved.)
                   When ui IS present, an empty type legitimately means
                   decimal mode, so writing "" is correct. */
                if (!ui) { return; }
                var t = (ui.ratingSystemOptions && ui.ratingSystemOptions.type) || "";
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
       CSS re-styles `.navbar-collapse` as a dropdown panel in that state.

       Inner DOM: three .refract-burger-line spans (stacked horizontals)
       that CSS morphs into an X via rotate/translate when .is-open. */
    var BURGER_CLOSE_MS = 180;
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
            '<span class="refract-burger-icon" aria-hidden="true">' +
                '<span class="refract-burger-line"></span>' +
                '<span class="refract-burger-line"></span>' +
                '<span class="refract-burger-line"></span>' +
            '</span>';

        burger.addEventListener("click", function (e) {
            e.stopPropagation();
            var isOpen = document.body.classList.contains("refract-burger-open");
            if (isOpen) {
                refractCloseBurger();
            } else {
                refractOpenBurger();
            }
        });

        // Insert at the end so it sits on the far right of the navbar.
        nav.appendChild(burger);
        return true;
    }

    /* Mirror Stash's native "/new" button (contextual + button used to
       add new scenes/performers/etc.) as a refract-styled .refract-mobile-new
       anchor positioned just left of the burger. Tracks the native button's
       current href and updates as the route changes. Removes itself on
       routes where Stash itself wouldn't show a new button.

       We can't read the native button's visibility (we hide its parent
       wholesale on mobile), so the route-whitelist below mirrors the
       set Stash renders the new button on. */
    var NEW_BUTTON_ROUTES = [
        "/scenes", "/performers", "/studios", "/tags",
        "/galleries", "/images", "/groups", "/movies"
    ];
    function refractRouteAllowsNew() {
        var path = window.location.pathname;
        for (var i = 0; i < NEW_BUTTON_ROUTES.length; i++) {
            var prefix = NEW_BUTTON_ROUTES[i];
            if (path === prefix || path.indexOf(prefix + "/") === 0) {
                return true;
            }
        }
        return false;
    }

    function injectMobileNewButton() {
        var nav = document.querySelector("nav.top-nav");
        if (!nav) { return false; }

        var nativeLink = nav.querySelector('a[href$="/new"]');
        var existing = nav.querySelector(".refract-mobile-new");

        if (!nativeLink || !refractRouteAllowsNew()) {
            if (existing) { existing.remove(); }
            return false;
        }

        var href = nativeLink.getAttribute("href");
        var label = nativeLink.getAttribute("aria-label")
            || nativeLink.getAttribute("title")
            || "New";

        if (existing) {
            if (existing.getAttribute("href") !== href) {
                existing.setAttribute("href", href);
                existing.setAttribute("aria-label", label);
                existing.setAttribute("title", label);
            }
            return true;
        }

        var btn = document.createElement("a");
        btn.className = "refract-mobile-new";
        btn.setAttribute("href", href);
        btn.setAttribute("aria-label", label);
        btn.setAttribute("title", label);
        btn.innerHTML = PLUS_SVG;

        // SPA-navigate via pushState rather than full reload.
        btn.addEventListener("click", function (e) {
            e.preventDefault();
            var target = btn.getAttribute("href");
            if (target && window.location.pathname !== target) {
                window.history.pushState(null, "", target);
                window.dispatchEvent(new PopStateEvent("popstate"));
            }
        });

        // Insert before the burger so it sits just to its left.
        var burger = nav.querySelector(".refract-burger");
        if (burger) {
            nav.insertBefore(btn, burger);
        } else {
            nav.appendChild(btn);
        }
        return true;
    }

    /* Body-level backdrop scrim — fades in/out with the drawer.
       Click closes. Injected once, idempotent. */
    function injectBurgerScrim() {
        if (document.querySelector(".refract-burger-scrim")) { return true; }
        var scrim = document.createElement("div");
        scrim.className = "refract-burger-scrim";
        scrim.setAttribute("aria-hidden", "true");
        scrim.addEventListener("click", function () { refractCloseBurger(); });
        document.body.appendChild(scrim);
        return true;
    }

    /* Mobile: when a Bootstrap dropdown inside the toolbar opens (sort,
       page-size, etc.), show a body-level scrim and re-style the menu as
       a centered modal panel via the `refract-toolbar-dropdown-open`
       body class. Tapping the scrim closes the dropdown by clicking its
       toggle (which lets Bootstrap run its full close routine). */
    function injectToolbarDropdownScrim() {
        if (!document.querySelector(".refract-toolbar-dropdown-scrim")) {
            var scrim = document.createElement("div");
            scrim.className = "refract-toolbar-dropdown-scrim";
            scrim.setAttribute("aria-hidden", "true");
            scrim.addEventListener("click", function () {
                var toggle = document.querySelector(
                    ".filtered-list-toolbar [aria-expanded='true']"
                );
                if (toggle) { toggle.click(); }
            });
            document.body.appendChild(scrim);
        }
        if (!document.body.__refractToolbarDropdownObserver) {
            var observer = new MutationObserver(function () {
                var anyOpen = !!document.querySelector(
                    ".filtered-list-toolbar .dropdown-menu.show"
                );
                document.body.classList.toggle(
                    "refract-toolbar-dropdown-open", anyOpen
                );
            });
            observer.observe(document.body, {
                subtree: true,
                childList: true,
                attributes: true,
                attributeFilter: ["class", "aria-expanded"]
            });
            document.body.__refractToolbarDropdownObserver = observer;
        }
        return true;
    }

    /* Open / close — toggles body class which animates the drawer. Both
       burger instances (legacy top-nav one and the bottom dock's) get
       the is-open X morph so whichever is visible reads correctly. */
    function refractSetBurgerState(open) {
        var bs = document.querySelectorAll(".refract-burger, .refract-dock-burger");
        for (var i = 0; i < bs.length; i++) {
            bs[i].classList.toggle("is-open", open);
            bs[i].setAttribute("aria-expanded", open ? "true" : "false");
        }
    }
    function refractOpenBurger() {
        document.body.classList.add("refract-burger-open");
        refractSetBurgerState(true);
        refractMarkActiveDrawerTile();
    }
    function refractCloseBurger() {
        if (!document.body.classList.contains("refract-burger-open")) { return; }
        refractSetBurgerState(false);
        document.body.classList.remove("refract-burger-open");
    }

    /* Mobile drawer — body-level overlay built from a hardcoded item
       list. Independent of Stash's navbar DOM (which we hide entirely
       on mobile). Each tile is an <a> whose click triggers SPA nav via
       pushState + popstate (Stash's React Router responds to popstate). */
    var MOBILE_NAV_ITEMS = [
        { href: "/scenes",         label: "Scenes",     icon: "scenes" },
        { href: "/images",         label: "Images",     icon: "images" },
        { href: "/groups",         label: "Movies",     icon: "movies",   aliases: ["/movies"] },
        { href: "/galleries",      label: "Galleries",  icon: "galleries" },
        { href: "/scenes/markers", label: "Markers",    icon: "markers",  aliases: ["/markers"] },
        { href: "/performers",     label: "Performers", icon: "performers" },
        { href: "/studios",        label: "Studios",    icon: "studios" },
        { href: "/tags",           label: "Tags",       icon: "tags" },
        { href: "/stats",          label: "Stats",      icon: "stats" },
        { href: "/settings",       label: "Settings",   icon: "settings" }
    ];

    var MOBILE_NAV_ICONS = {
        scenes:     '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M10 8l6 4-6 4z" fill="currentColor" stroke="none"/></svg>',
        images:     '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="1.6" fill="currentColor" stroke="none"/><path d="M21 16l-5-5-9 9"/></svg>',
        movies:     '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8.5" cy="9" r="5"/><circle cx="15.5" cy="9" r="5"/><circle cx="12" cy="15.5" r="5"/></svg>',
        galleries:  '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="14" height="14" rx="2"/><rect x="7" y="3" width="14" height="14" rx="2" opacity="0.55"/></svg>',
        markers:    '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C8 2 5 5 5 9c0 5.5 7 13 7 13s7-7.5 7-13c0-4-3-7-7-7z"/><circle cx="12" cy="9" r="2.5" fill="currentColor" stroke="none"/></svg>',
        performers: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>',
        studios:    '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="13" cy="6" r="3"/><rect x="2.5" y="9.5" width="15" height="9" rx="1.5"/><path d="M17.5 12.5L21.5 11L21.5 17L17.5 15.5Z"/></svg>',
        tags:       '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.6 13.4l-7.2 7.2a2 2 0 01-2.8 0L3 13V3h10l7.6 7.6a2 2 0 010 2.8z"/><circle cx="7.5" cy="7.5" r="1.5" fill="currentColor" stroke="none"/></svg>',
        stats:      '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
        settings:   '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>'
    };

    /* Mobile bottom dock — iOS-style fixed pill bar with the essential
       routes one tap away (Scenes, Performers, Studios, Tags, Settings)
       and a burger tile at the end that opens the full drawer for
       everything else (secondary pages + plugin tiles). Replaces the
       top-nav burger as the drawer opener on mobile; 12_mobile.css
       shows it under 900px. Partially answers the forum "two taps per
       action" complaint without giving up the drawer as the overflow
       strategy. */
    /* Dock contents are USER-CONFIGURABLE (Settings -> Interface ->
       Refract -> Mobile dock): a click-to-select icon grid persisted as
       a JSON key array. Default: the four core routes + burger. */
    var MOBILE_DOCK_DEFAULT = ["/scenes", "/performers", "/studios", "/tags"];
    var DOCK_ITEMS_KEY = "refract.dockItems";

    function refractGetDockSelection() {
        try {
            var raw = localStorage.getItem(DOCK_ITEMS_KEY);
            if (raw) {
                var arr = JSON.parse(raw);
                if (Object.prototype.toString.call(arr) === "[object Array]" && arr.length) {
                    return arr;
                }
            }
        } catch (e) { /* fall through to default */ }
        return MOBILE_DOCK_DEFAULT.slice();
    }

    /* Every dock candidate, harvested from the DRAWER's tiles — the
       drawer is already the canonical registry of everything mirrorable
       (hardcoded routes, plugin route tiles, plugin ACTION tiles like
       DiceR / SFWSwitch / Ascension). Keys: the route href, or
       "action:<key>" for action tiles. Off-tiles (routes the user
       disabled in Stash's menu settings) are excluded. */
    function refractDockCandidates() {
        var out = [];
        var tiles = document.querySelectorAll(
            ".refract-mobile-drawer .refract-drawer-tile:not(.refract-drawer-tile-off)");
        for (var i = 0; i < tiles.length; i++) {
            var t = tiles[i];
            var actionKey = t.getAttribute("data-action");
            var href = t.getAttribute("data-href");
            var key = actionKey ? ("action:" + actionKey) : href;
            if (!key) { continue; }
            var icon = t.querySelector(".refract-drawer-tile-icon");
            out.push({
                key: key,
                label: t.getAttribute("aria-label") || key,
                iconHtml: icon ? icon.innerHTML : "",
                href: href || null,
                actionSelector: t.getAttribute("data-action-selector") || null,
                target: t.getAttribute("target") || null,
                aliases: t.getAttribute("data-aliases") || ""
            });
        }
        return out;
    }

    function refractDockItemsFromSelection() {
        var sel = refractGetDockSelection();
        var cands = refractDockCandidates();
        var items = [];
        var i;
        if (cands.length) {
            for (i = 0; i < cands.length; i++) {
                if (sel.indexOf(cands[i].key) !== -1) { items.push(cands[i]); }
            }
        } else {
            /* Drawer not built yet (very early load): hardcoded route
               fallback so the dock appears immediately; the signature
               check below swaps in the full set once tiles exist. */
            for (i = 0; i < MOBILE_NAV_ITEMS.length; i++) {
                var it = MOBILE_NAV_ITEMS[i];
                if (sel.indexOf(it.href) !== -1) {
                    items.push({
                        key: it.href, label: it.label, href: it.href,
                        iconHtml: MOBILE_NAV_ICONS[it.icon] || "",
                        actionSelector: null, target: null,
                        aliases: (it.aliases || []).join(" ")
                    });
                }
            }
        }
        return items;
    }

    function injectMobileDock() {
        if (!document.body) { return false; }
        var items = refractDockItemsFromSelection();
        var sig = items.map(function (x) { return x.key; }).join("|");
        var existing = document.querySelector(".refract-mobile-dock");
        if (existing) {
            /* Idempotent per configuration: rebuild only when the item
               set changed (selection edited, or plugin tiles arrived). */
            if (existing.getAttribute("data-sig") === sig) { return true; }
            existing.parentNode.removeChild(existing);
        }
        var dock = document.createElement("nav");
        dock.className = "refract-mobile-dock";
        dock.setAttribute("aria-label", "Quick navigation");
        dock.setAttribute("data-sig", sig);

        var html = "";
        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            if (item.actionSelector) {
                html +=
                    '<button type="button" class="refract-dock-item" data-action-selector="' +
                        refractAttrEscape(item.actionSelector) + '" aria-label="' + item.label + '">' +
                        item.iconHtml +
                    '</button>';
            } else {
                html +=
                    '<a class="refract-dock-item" href="' + item.href + '" data-href="' + item.href + '"' +
                        (item.aliases ? ' data-aliases="' + item.aliases + '"' : '') +
                        (item.target ? ' target="' + item.target + '" rel="noopener noreferrer"' : '') +
                        ' aria-label="' + item.label + '">' +
                        item.iconHtml +
                    '</a>';
            }
        }
        html +=
            '<button type="button" class="refract-dock-item refract-dock-burger" aria-label="All pages" aria-expanded="false">' +
                '<span class="refract-burger-icon" aria-hidden="true">' +
                    '<span class="refract-burger-line"></span>' +
                    '<span class="refract-burger-line"></span>' +
                    '<span class="refract-burger-line"></span>' +
                '</span>' +
            '</button>';
        dock.innerHTML = html;

        dock.addEventListener("click", function (e) {
            if (!e.target || !e.target.closest) { return; }
            var burger = e.target.closest(".refract-dock-burger");
            if (burger) {
                if (document.body.classList.contains("refract-burger-open")) {
                    refractCloseBurger();
                } else {
                    refractOpenBurger();
                }
                return;
            }
            var tile = e.target.closest(".refract-dock-item");
            if (!tile) { return; }
            /* Action tiles proxy-click the plugin's live navbar control
               (same pattern as the drawer). */
            var actionSel = tile.getAttribute("data-action-selector");
            if (actionSel) {
                e.preventDefault();
                refractCloseBurger();
                var liveBtn = document.querySelector(actionSel);
                if (liveBtn) { liveBtn.click(); }
                return;
            }
            /* Standalone-app launchers (binge / Stash TV etc.) keep the
               native new-tab anchor behaviour. */
            if (tile.getAttribute("target") === "_blank") {
                refractCloseBurger();
                return;
            }
            e.preventDefault();
            refractCloseBurger();
            var href = tile.getAttribute("data-href");
            if (href && window.location.pathname !== href) {
                window.history.pushState(null, "", href);
                window.dispatchEvent(new PopStateEvent("popstate"));
            }
        });

        document.body.appendChild(dock);
        refractMarkActiveDockItem();
        return true;
    }

    /* Force-rebuild after a selection change in settings. */
    function refractRebuildMobileDock() {
        var d = document.querySelector(".refract-mobile-dock");
        if (d && d.parentNode) { d.parentNode.removeChild(d); }
        injectMobileDock();
    }

    function refractMarkActiveDockItem() {
        var dock = document.querySelector(".refract-mobile-dock");
        if (!dock) { return; }
        var path = window.location.pathname;
        var tiles = dock.querySelectorAll(".refract-dock-item[data-href]");
        for (var i = 0; i < tiles.length; i++) {
            var t = tiles[i];
            var routes = [t.getAttribute("data-href")]
                .concat((t.getAttribute("data-aliases") || "").split(" ").filter(Boolean));
            var active = false;
            for (var r = 0; r < routes.length; r++) {
                if (path === routes[r] || path.indexOf(routes[r] + "/") === 0 ||
                        (routes[r] === "/settings" && path.indexOf("/settings") === 0)) {
                    active = true;
                    break;
                }
            }
            t.classList.toggle("is-active", active);
        }
    }

    function injectMobileDrawer() {
        if (document.querySelector(".refract-mobile-drawer")) { return true; }
        var drawer = document.createElement("nav");
        drawer.className = "refract-mobile-drawer";
        drawer.setAttribute("aria-label", "Mobile navigation");

        var html = "";
        for (var i = 0; i < MOBILE_NAV_ITEMS.length; i++) {
            var item = MOBILE_NAV_ITEMS[i];
            var icon = MOBILE_NAV_ICONS[item.icon] || "";
            html +=
                '<a class="refract-drawer-tile" href="' + item.href + '" data-href="' + item.href + '"' +
                    ((item.aliases && item.aliases.length) ? ' data-aliases="' + item.aliases.join(" ") + '"' : '') +
                    ' aria-label="' + item.label + '">' +
                    '<span class="refract-drawer-tile-icon">' + icon + '</span>' +
                '</a>';
        }
        drawer.innerHTML = html;

        drawer.addEventListener("click", function (e) {
            var t = e.target;
            if (!t || !t.closest) { return; }
            var tile = t.closest(".refract-drawer-tile");
            if (!tile) { return; }
            /* Action tiles (DiceR roll, SFWSwitch toggle) mirror a plugin's
               navbar CONTROL, not a route. Forward the click to the live
               source button (re-queried each time; it persists in the navbar)
               and close the drawer. */
            var actionSel = tile.getAttribute("data-action-selector");
            if (actionSel) {
                e.preventDefault();
                refractCloseBurger();
                var liveBtn = document.querySelector(actionSel);
                if (liveBtn) { liveBtn.click(); }
                return;
            }
            /* target="_blank" tiles (plugin launcher buttons like binge/
               desire/forage/Stash TV, which open a standalone app in a new
               tab rather than an in-app route) get the native anchor click
               behaviour — no preventDefault, no fake SPA nav. Faking a
               pushState+popstate to a static plugin-asset path that no
               React Router route matches would just rewrite the URL bar
               and do nothing, silently breaking the tile. */
            if (tile.getAttribute("target") === "_blank") {
                refractCloseBurger();
                return;
            }
            e.preventDefault();
            var href = tile.getAttribute("data-href");
            refractCloseBurger();
            if (href && window.location.pathname !== href) {
                window.history.pushState(null, "", href);
                window.dispatchEvent(new PopStateEvent("popstate"));
            }
        });

        document.body.appendChild(drawer);
        refractMarkActiveDrawerTile();
        return true;
    }

    /* Replace Stash's native navbar SVG icons with our refract-styled
       versions (the same set used in the mobile drawer). Idempotent
       via data-refract-icon marker. Re-applied on each watcher tick
       and on stash:location since React may re-render the nav. */
    /* Escape a value for use inside a DOUBLE-QUOTED attribute selector,
       e.g. [href="<value>"]. Only " and \ are special there. (CSS.escape is
       for unquoted identifiers and would over-escape.) Without this, a
       runtime href/key containing a quote throws a SyntaxError that aborts
       the whole querySelector pass. */
    function refractAttrEscape(s) {
        return String(s == null ? "" : s).replace(/(["\\])/g, "\\$1");
    }

    /* Shared max-height/opacity collapse animation for the plugin- and
       task-group chevrons (previously triplicated verbatim). On expand,
       release the fixed max-height once the transition finishes so a
       section whose content grows later (e.g. async-loaded settings) isn't
       clipped by the frozen pixel height (audit B19). */
    function refractAnimateCollapse(body, willExpand) {
        if (!body) { return; }
        if (willExpand) {
            body.style.maxHeight = body.scrollHeight + "px";
            body.style.opacity = "1";
            var onEnd = function (e) {
                if (e.target !== body || e.propertyName !== "max-height") { return; }
                body.style.maxHeight = "none";
                body.removeEventListener("transitionend", onEnd);
            };
            body.addEventListener("transitionend", onEnd);
        } else {
            body.style.maxHeight = body.scrollHeight + "px";
            void body.offsetHeight;
            body.style.maxHeight = "0px";
            body.style.opacity = "0";
        }
    }

    function refractApplyNavIcons() {
        var nav = document.querySelector("nav.top-nav");
        if (!nav) { return false; }
        for (var i = 0; i < MOBILE_NAV_ITEMS.length; i++) {
            var item = MOBILE_NAV_ITEMS[i];
            var iconSvgStr = MOBILE_NAV_ICONS[item.icon];
            if (!iconSvgStr) { continue; }
            var hrefs = [item.href].concat(item.aliases || []);
            for (var h = 0; h < hrefs.length; h++) {
                var links = nav.querySelectorAll('[href="' + refractAttrEscape(hrefs[h]) + '"]');
                for (var j = 0; j < links.length; j++) {
                    var link = links[j];
                    if (link.getAttribute("data-refract-icon") === item.icon) { continue; }
                    var oldSvg = link.querySelector("svg");
                    if (!oldSvg) { continue; }
                    var wrapper = document.createElement("span");
                    wrapper.innerHTML = iconSvgStr;
                    var newSvg = wrapper.firstElementChild;
                    if (!newSvg) { continue; }
                    // Preserve Stash's classes so sizing / active CSS still applies.
                    var oldClass = oldSvg.getAttribute("class");
                    if (oldClass) { newSvg.setAttribute("class", oldClass); }
                    oldSvg.replaceWith(newSvg);
                    link.setAttribute("data-refract-icon", item.icon);
                }
            }
        }
        return true;
    }

    /* Swap Stash's FontAwesome icons in the card-popover count buttons
       (performer / scene / tag / gallery / studio) for refract's own
       navbar SVGs, so card footers match the nav. The FA <Icon> renders
       <svg data-icon="user|tag|play-circle|...">; we keep that element
       (don't replaceWith — that detaches React's fiber) and rewrite its
       viewBox + inner paths + stroke styling in place. Re-keying data-icon
       to "<name>-refract" makes the next watcher pass skip it; a React
       re-render restores the FA glyph + original data-icon, which the
       watcher re-catches. */
    /* Keyed by the popover button's stable class (.performer-count etc.),
       NOT FA's data-icon — FA7 renamed those (only "user" still matched,
       which is why just the performer icon swapped first time round). */
    var CARD_POPOVER_BTN_ICON = {
        "performer-count": "performers",
        "scene-count": "scenes",
        "tag-count": "tags",
        "gallery-count": "galleries",
        "studio-count": "studios",
        "image-count": "images",
        "group-count": "movies",
        "marker-count": "markers"
    };
    function refractifyCardPopoverIcons() {
        Object.keys(CARD_POPOVER_BTN_ICON).forEach(function (cls) {
            var key = CARD_POPOVER_BTN_ICON[cls];
            var iconStr = MOBILE_NAV_ICONS[key];
            if (!iconStr) { return; }
            var svgs = document.querySelectorAll(
                ".card-popovers ." + cls + " svg:not([data-refract-pop])"
            );
            for (var i = 0; i < svgs.length; i++) {
                var svg = svgs[i];
                var tmp = document.createElement("div");
                tmp.innerHTML = iconStr;
                var ref = tmp.querySelector("svg");
                if (!ref) { continue; }
                svg.setAttribute("viewBox", ref.getAttribute("viewBox") || "0 0 24 24");
                svg.innerHTML = ref.innerHTML;
                /* Inline styles beat FA's .svg-inline--fa CSS, which would
                   otherwise fill our stroke-only glyphs into solid blobs.
                   Inner elements keep their own fill/stroke attrs. */
                svg.style.fill = "none";
                svg.style.stroke = "currentColor";
                svg.style.strokeWidth = "2";
                svg.style.strokeLinecap = "round";
                svg.style.strokeLinejoin = "round";
                svg.style.width = "1em";
                svg.style.height = "1em";
                svg.setAttribute("data-refract-pop", key);
            }
        });
    }

    /* Normalize an arbitrary (plugin-authored) icon's color to currentColor
       so it always reads against refract's dark glass tiles. Plugins inject
       icons in all sorts of ways — some inherit color via a CSS class (fine,
       survives as currentColor already), but others bake a literal color
       into a fill/stroke attribute or inline style (e.g. a legacy FA4-style
       glyph, or an icon lib that hardcodes "#212529"). That literal color
       clones verbatim and, if dark, is invisible on our dark background —
       reads to the user as "the icon is missing" when the tile/link are
       actually fine. Root gets fill/stroke forced to currentColor so any
       child with NO explicit color inherits it normally; a child WITH an
       explicit non-"none" color gets overridden too (still normalized) but
       "none" is left alone so multi-part icons keep their intentional gaps. */
    function refractNormalizeIconColor(svg) {
        svg.setAttribute("fill", "currentColor");
        svg.setAttribute("stroke", "currentColor");
        var all = svg.querySelectorAll("*");
        for (var i = 0; i < all.length; i++) {
            var el = all[i];
            el.removeAttribute("style");
            var fill = el.getAttribute("fill");
            if (fill && fill.toLowerCase() !== "none") { el.setAttribute("fill", "currentColor"); }
            var stroke = el.getAttribute("stroke");
            if (stroke && stroke.toLowerCase() !== "none") { el.setAttribute("stroke", "currentColor"); }
        }
    }

    /* Append plugin-injected nav items to the mobile drawer. Scans the
       navbar for any link not already represented (by href) in our
       hardcoded MOBILE_NAV_ITEMS, then builds a tile in our style
       using the plugin's own SVG. Idempotent (skips tiles that exist),
       runs every watcher tick so plugins that mount late get caught.
       Skips /new contextual buttons — those get mirrored next to the
       burger via injectMobileNewButton instead. */
    var NATIVE_NAV_SKIP = {
        "/": true,        // home — brand orb already covers it
        "/setup": true,
        "/migrate": true
    };
    function refractAppendPluginDrawerTiles() {
        var drawer = document.querySelector(".refract-mobile-drawer");
        var nav = document.querySelector("nav.top-nav");
        if (!drawer || !nav) { return false; }

        // Build the set of hrefs we already render natively.
        var known = {};
        // Track plugin hrefs seen this pass, to reconcile orphaned tiles below.
        var present = {};
        // Track which KNOWN (hardcoded) routes are actually present in the
        // live navbar, so we can hide tiles for menu items the user disabled.
        var knownPresent = {};
        for (var i = 0; i < MOBILE_NAV_ITEMS.length; i++) {
            var item = MOBILE_NAV_ITEMS[i];
            known[item.href] = true;
            if (item.aliases) {
                for (var k = 0; k < item.aliases.length; k++) {
                    known[item.aliases[k]] = true;
                }
            }
        }

        var links = nav.querySelectorAll("a[href]");
        for (var j = 0; j < links.length; j++) {
            var link = links[j];
            var href = link.getAttribute("href");
            if (!href) { continue; }
            if (known[href]) { knownPresent[href] = true; continue; }
            if (NATIVE_NAV_SKIP[href]) { continue; }
            // /new contextual button — mirrored separately next to burger.
            if (/\/new$/.test(href)) { continue; }
            // External / system links we never want in the drawer.
            if (href.indexOf("logout") !== -1) { continue; }
            if (href.indexOf("opencollective") !== -1) { continue; }
            if (href.indexOf("github.com") !== -1) { continue; }
            /* Absolute http(s) URLs: skip genuinely external hosts, but KEEP
               same-origin ones. Some plugins hardcode the full origin for a
               standalone app they open in a new tab (e.g. stashgifs, whose
               button carries target="_blank" + a real svg); those are ours to
               mirror, and the drawer's target="_blank" branch launches them
               correctly. */
            if (/^https?:/i.test(href) && href.indexOf(window.location.origin) !== 0) { continue; }
            /* Not a real route — a "javascript:"/"#" href means the link is
               actually a click-handler-driven action (e.g. a plugin's modal
               trigger styled as a nav pill, like Ascension's ranking button)
               rather than a page to navigate to. Faking SPA navigation to it
               would silently do nothing (or throw), and there's no original
               click handler to forward to since we only clone the icon, not
               the source node. Skip here; controls that deserve mirroring
               get a proxy-click entry in PLUGIN_ACTION_TILES instead (as
               Ascension now does). */
            if (/^(javascript:|#)/i.test(href.replace(/^\s+/, ""))) { continue; }
            // Already rendered — still mark present so reconcile keeps it.
            if (drawer.querySelector('.refract-drawer-tile[data-href="' + refractAttrEscape(href) + '"]')) { present[href] = true; continue; }

            var srcSvg = link.querySelector("svg");
            if (!srcSvg) { continue; }
            var label = link.getAttribute("aria-label")
                || link.getAttribute("title")
                || (link.textContent || "").trim()
                || href;

            var tile = document.createElement("a");
            tile.className = "refract-drawer-tile";
            tile.setAttribute("href", href);
            tile.setAttribute("data-href", href);
            tile.setAttribute("aria-label", label);
            tile.setAttribute("data-plugin-tile", "1");
            // Carry target/rel so standalone-app launcher buttons (binge,
            // desire, forage, Stash TV — real routes that open in a new
            // tab rather than an in-app page) keep that behaviour when
            // mirrored here; see the drawer's click handler above.
            var linkTarget = link.getAttribute("target");
            if (linkTarget) {
                tile.setAttribute("target", linkTarget);
                var linkRel = link.getAttribute("rel");
                tile.setAttribute("rel", linkRel || "noopener noreferrer");
            }

            var iconSpan = document.createElement("span");
            iconSpan.className = "refract-drawer-tile-icon";
            // Clone + strip inline sizing/classes from the plugin's SVG so
            // our CSS owns sizing cleanly. iOS Safari honors width="1em"
            // and FA's .svg-inline--fa more aggressively than desktop, so
            // without stripping these the icon renders at the wrong size
            // and gets pushed off-center within the tile.
            var cloned = srcSvg.cloneNode(true);
            cloned.removeAttribute("class");
            cloned.removeAttribute("width");
            cloned.removeAttribute("height");
            cloned.removeAttribute("style");
            cloned.removeAttribute("preserveAspectRatio");
            refractNormalizeIconColor(cloned);
            iconSpan.appendChild(cloned);
            tile.appendChild(iconSpan);

            drawer.appendChild(tile);
            present[href] = true;
        }

        /* Reconcile: drop plugin tiles whose source nav link is gone
           (plugin disabled/unmounted). Otherwise a stale tile lingers and
           click-navigates to a now-dead route. */
        var ptiles = drawer.querySelectorAll(".refract-drawer-tile[data-plugin-tile]");
        for (var p = 0; p < ptiles.length; p++) {
            var ph = ptiles[p].getAttribute("data-href");
            if (!present[ph] && ptiles[p].parentNode) {
                ptiles[p].parentNode.removeChild(ptiles[p]);
            }
        }

        /* Hide hardcoded tiles for menu items the user disabled in Stash's
           Interface settings. Stash filters disabled items out of the
           navbar DOM entirely (MainNavbar menuItems), so a known route
           absent from the live navbar means it's disabled. We toggle a
           hide class rather than removing the tile, so re-enabling the
           item restores it. Only runs once the navbar has actually
           rendered (>= 1 known route present), so we never blank the
           drawer mid-load; Settings/Stats are always rendered, so this
           readiness signal is reliable. */
        var navReady = false;
        for (var kp in knownPresent) {
            if (knownPresent.hasOwnProperty(kp)) { navReady = true; break; }
        }
        if (navReady) {
            /* Exclude action tiles (data-action-tile): they mirror plugin
               controls, not routes, so they have no data-href to match a live
               navbar route — without this exclusion the "disabled route" pass
               would stamp them refract-drawer-tile-off on every tick and hide
               them. */
            var htiles = drawer.querySelectorAll(".refract-drawer-tile:not([data-plugin-tile]):not([data-action-tile])");
            for (var h = 0; h < htiles.length; h++) {
                var htile = htiles[h];
                var hcands = [htile.getAttribute("data-href") || ""];
                var halias = htile.getAttribute("data-aliases");
                if (halias) { hcands = hcands.concat(halias.split(/\s+/)); }
                var enabled = false;
                for (var hc = 0; hc < hcands.length; hc++) {
                    if (hcands[hc] && knownPresent[hcands[hc]]) { enabled = true; break; }
                }
                if (enabled) {
                    htile.classList.remove("refract-drawer-tile-off");
                } else {
                    htile.classList.add("refract-drawer-tile-off");
                }
            }
        }

        refractAppendPluginActionTiles();
        return true;
    }

    /* Mirror plugin navbar ACTION buttons (click-handlers, not routes) into
       the drawer. The route-mirror above can't reach these: DiceR's roll
       button has href="javascript:void(0)" and no <svg> (its icon is a CSS
       mask), and SFWSwitch's toggle is a <button> whose wrapping <a> has no
       href — so neither is a real route with a clonable icon on an a[href].
       For each registered control we find the live source button, build a
       tile with a matching icon (cloned from the source's own svg when it
       has one, else the spec's inline markup), and forward the tile's click
       to the live button (Refract's "leave the native node, proxy the
       click" pattern). Idempotent; reconciles tiles whose plugin unmounted. */
    var PLUGIN_ACTION_TILES = [
        {
            key: "dicer",
            label: "Random",
            selector: ".random-btn",
            icon: '<svg width="1em" height="1em" viewBox="0 0 16 16" fill="currentColor"><path d="M5,4A1,1,0,1,0,6,5,1,1,0,0,0,5,4Zm6,6a1,1,0,1,0,1,1A1,1,0,0,0,11,10ZM8,7A1,1,0,1,0,9,8,1,1,0,0,0,8,7Zm4.36-6H3.64A2.64,2.64,0,0,0,1,3.64v8.72A2.64,2.64,0,0,0,3.64,15h8.72A2.64,2.64,0,0,0,15,12.36V3.64A2.64,2.64,0,0,0,12.36,1ZM13.6,12.36a1.25,1.25,0,0,1-1.24,1.24H3.64A1.25,1.25,0,0,1,2.4,12.36V3.64A1.25,1.25,0,0,1,3.64,2.4h8.72A1.25,1.25,0,0,1,13.6,3.64Z"/></svg>'
        },
        {
            key: "sfwswitch",
            label: "SFW Mode",
            selector: "#plugin_sfw",
            /* SFWSwitch ships an odd FA "screen" glyph at a non-standard
               viewBox that garbles when normalized; use a clean on-theme
               eye-off (semantically right for a blur/SFW toggle) instead. */
            icon: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'
        },
        {
            key: "ascension",
            label: "Ascension",
            /* Ascension's ranking button: href="javascript:void(0);" with a
               click handler (openRankingModal) bound to the anchor itself, so
               the proxy-click pattern fires the modal. No spec icon — the
               source button carries a clean currentColor flame svg that the
               clone fallback below mirrors faithfully. */
            selector: "#plugin_hon"
        },
        {
            key: "multiview",
            label: "Multiview",
            /* multiView's floating picking launcher is BODY-level (not a
               navbar control) and hidden on mobile by 12_mobile.css; this
               tile mirrors its open button so launches work from the
               drawer. Exists only while picking mode is on — the tile
               appears/disappears with it. Its two counters (scene picks +
               filter slots) collapse into ONE combined badge, painted by
               the badge pass below. */
            selector: "#mv-open-btn",
            scope: "body"
        }
    ];
    function refractAppendPluginActionTiles() {
        var drawer = document.querySelector(".refract-mobile-drawer");
        var nav = document.querySelector("nav.top-nav");
        if (!drawer || !nav) { return false; }

        for (var i = 0; i < PLUGIN_ACTION_TILES.length; i++) {
            var spec = PLUGIN_ACTION_TILES[i];
            /* scope "body": the control lives outside the navbar (e.g.
               multiView's floating launcher). */
            var root = spec.scope === "body" ? document : nav;
            var src = root.querySelector(spec.selector);
            var existing = drawer.querySelector('.refract-drawer-tile[data-action="' + spec.key + '"]');
            if (!src) { continue; }      // not mounted; reconcile below clears any stale tile
            if (existing) { continue; }  // already mirrored

            var tile = document.createElement("a");
            tile.className = "refract-drawer-tile";
            tile.setAttribute("href", "#");
            tile.setAttribute("data-action", spec.key);
            tile.setAttribute("data-action-selector", spec.selector);
            tile.setAttribute("data-action-tile", "1");
            if (spec.scope) { tile.setAttribute("data-action-scope", spec.scope); }
            tile.setAttribute("aria-label", spec.label);

            var iconSpan = document.createElement("span");
            iconSpan.className = "refract-drawer-tile-icon";
            // Prefer a spec-provided icon (clean, on-theme); fall back to
            // cloning the source button's own svg only when none is given.
            var srcSvg = src.querySelector ? src.querySelector("svg") : null;
            if (spec.icon) {
                iconSpan.innerHTML = spec.icon;
            } else if (srcSvg) {
                var cloned = srcSvg.cloneNode(true);
                cloned.removeAttribute("class");
                cloned.removeAttribute("width");
                cloned.removeAttribute("height");
                cloned.removeAttribute("style");
                cloned.removeAttribute("preserveAspectRatio");
                refractNormalizeIconColor(cloned);
                iconSpan.appendChild(cloned);
            }
            tile.appendChild(iconSpan);
            drawer.appendChild(tile);
        }

        /* Reconcile: drop action tiles whose source button is gone. */
        var atiles = drawer.querySelectorAll(".refract-drawer-tile[data-action-tile]");
        for (var a = 0; a < atiles.length; a++) {
            var sel = atiles[a].getAttribute("data-action-selector");
            var aroot = atiles[a].getAttribute("data-action-scope") === "body" ? document : nav;
            if (sel && !aroot.querySelector(sel) && atiles[a].parentNode) {
                atiles[a].parentNode.removeChild(atiles[a]);
            }
        }

        /* multiview tile badge: ONE combined number (scene picks + filter
           slots) instead of the launcher's two separate counters. The
           counters keep their textContent even while display:none'd at
           zero, so parse-and-sum is safe. */
        var mvTile = drawer.querySelector('.refract-drawer-tile[data-action="multiview"]');
        if (mvTile) {
            var mvScenes = document.getElementById("mv-scene-count");
            var mvFilters = document.getElementById("mv-filter-count");
            var mvTotal = (parseInt(mvScenes && mvScenes.textContent, 10) || 0)
                + (parseInt(mvFilters && mvFilters.textContent, 10) || 0);
            var mvBadge = mvTile.querySelector(".refract-drawer-tile-badge");
            if (mvTotal > 0) {
                if (!mvBadge) {
                    mvBadge = document.createElement("span");
                    mvBadge.className = "refract-drawer-tile-badge";
                    mvTile.appendChild(mvBadge);
                }
                if (mvBadge.textContent !== String(mvTotal)) {
                    mvBadge.textContent = String(mvTotal);
                }
            } else if (mvBadge && mvBadge.parentNode) {
                mvBadge.parentNode.removeChild(mvBadge);
            }
        }
        return true;
    }

    function refractMarkActiveDrawerTile() {
        var drawer = document.querySelector(".refract-mobile-drawer");
        if (!drawer) { return; }
        var tiles = drawer.querySelectorAll(".refract-drawer-tile");
        /* Hash-aware path (bare pathname is always "/" under hash routing);
           honour each tile's data-aliases; and light up the LONGEST matching
           prefix so /scenes/markers lights Markers, not Scenes — mirrors
           markActiveUtilityButtons(). */
        var path = refractPathFromLocation();
        var best = null, bestLen = -1;
        for (var i = 0; i < tiles.length; i++) {
            tiles[i].classList.remove("is-active");
            var cands = [tiles[i].getAttribute("data-href") || ""];
            var aliasAttr = tiles[i].getAttribute("data-aliases");
            if (aliasAttr) { cands = cands.concat(aliasAttr.split(/\s+/)); }
            for (var c = 0; c < cands.length; c++) {
                var href = cands[c];
                if (!href) { continue; }
                if ((path === href || path.indexOf(href + "/") === 0) && href.length > bestLen) {
                    best = tiles[i];
                    bestLen = href.length;
                }
            }
        }
        if (best) { best.classList.add("is-active"); }
    }

    function refractBindBurgerGlobalHandlers() {
        if (window.__refractBurgerHandlersBound) { return; }
        window.__refractBurgerHandlersBound = true;

        document.addEventListener("click", function (e) {
            if (!document.body.classList.contains("refract-burger-open")) { return; }
            var t = e.target;
            if (!t || !t.closest) { return; }
            if (t.closest(".refract-burger")) { return; }
            // Scrim + drawer-tile + dock clicks are handled by their own
            // listeners (the dock burger toggles; dock tiles close+navigate).
            if (t.closest(".refract-burger-scrim")) { return; }
            if (t.closest(".refract-mobile-drawer")) { return; }
            if (t.closest(".refract-mobile-dock")) { return; }
            refractCloseBurger();
        });

        document.addEventListener("keydown", function (e) {
            if (e.key !== "Escape") { return; }
            if (!document.body.classList.contains("refract-burger-open")) { return; }
            refractCloseBurger();
        });

        function onLocationChange() {
            refractCloseBurger();
            refractMarkActiveDrawerTile();
            refractMarkActiveDockItem();
        }
        if (typeof PluginApi !== "undefined" && PluginApi && PluginApi.Event && PluginApi.Event.addEventListener) {
            PluginApi.Event.addEventListener("stash:location", onLocationChange);
        }
        window.addEventListener("popstate", onLocationChange);
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

    /* Encode a single "scenes" list-filter criterion exactly the way Stash's
       ListFilterModel.getEncodedParams does, so a hand-built URL drops the
       user onto a correctly pre-filtered list. The scheme (verified against
       filter.ts / criterion.ts in the Stash source):
         1. JSON.stringify the criterion object.
         2. Swap UNQUOTED { } for ( ) (Stash's translateJSON encode pass).
         3. encodeURI the whole thing.
         4. Percent-escape the reserved query chars ? # & ; = + .
       If Stash ever changes this, the link just lands on an unfiltered list
       (never an error). Scene filtering is by id; the label is cosmetic (the
       filter chip text). */
    function refractEncodeSceneCriterion(sceneId, label) {
        var crit = {
            type: "scenes",
            modifier: "INCLUDES",
            value: [{ id: String(sceneId), label: label || String(sceneId) }]
        };
        var json = JSON.stringify(crit);
        var out = "", inString = false, esc = false;
        for (var i = 0; i < json.length; i++) {
            var c = json.charAt(i);
            if (esc) { out += c; esc = false; continue; }
            if (c === "\\") { if (inString) { esc = true; } out += c; continue; }
            if (c === '"') { inString = !inString; out += c; continue; }
            if (!inString && c === "{") { out += "("; continue; }
            if (!inString && c === "}") { out += ")"; continue; }
            out += c;
        }
        out = encodeURI(out);
        var reserved = ["?", "#", "&", ";", "=", "+"];
        for (var r = 0; r < reserved.length; r++) {
            out = out.split(reserved[r]).join(encodeURIComponent(reserved[r]));
        }
        return out;
    }

    /* "See All" markers shortcut (detox22 request). The native Scene > Markers
       panel has a top-left "Create Marker" button but no way to jump to the
       full Markers list filtered to THIS scene, which is where bulk marker
       editing lives. Inject a top-right "See All" button that deep-links to
       /scenes/markers pre-filtered by this scene. The destination view is
       native Stash (the markers list takes a Scenes criterion); only the
       shortcut is ours. */
    function injectMarkerSeeAllButton() {
        var panel = document.querySelector(".scene-markers-panel");
        if (!panel) { return false; }
        if (panel.querySelector(".refract-marker-see-all")) { return true; }
        var m = refractPathFromLocation().match(/^\/scenes\/(\d+)/);
        if (!m) { return false; }
        var sceneId = m[1];
        /* Title is purely for the filter-chip label; filtering is by id. */
        var titleEl = document.querySelector(".scene-header-container h3.scene-header, h3.scene-header");
        var title = titleEl ? (titleEl.textContent || "").replace(/\s+/g, " ").trim() : "";
        var url = "/scenes/markers?c=" + refractEncodeSceneCriterion(sceneId, title || ("Scene " + sceneId));
        var a = document.createElement("a");
        a.className = "btn btn-secondary refract-marker-see-all";
        a.href = url;
        a.setAttribute("title", "Open the Markers list filtered to this scene (for bulk editing)");
        a.innerHTML =
            '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>' +
            '<span>See All</span>';
        panel.appendChild(a);
        return true;
    }

    /* ── Performer card flip (playing-card mode) ──────────────────────
       JoeBiden/detox22 idea: a trading-card "flip" on performer cards.
       The corner flip button reveals a back face: a mirrored, heavily
       blurred frosted version of the performer photo behind the
       advanced-rating category bars (parsed from the plugin's `Category: N`
       tag convention), a stats strip, and the non-rating tags. Opt-in per
       card (you click the button) and built LAZILY on first flip, so normal
       browsing is untouched and no GraphQL runs until you actually flip.
       Scoped to playing-card mode + performer cards for now. */
    var REFRACT_CATEGORY_RE = /^(.+?)\s*:\s*([0-5])$/; /* advanced-rating tag */
    /* Rarity names per tier, shown as the card subtitle only when the
       explicit-labels toggle is on (otherwise the tier badge alone speaks). */
    var REFRACT_RARITY = {
        bronze: "Bronze Whore",
        silver: "Silver Slut",
        gold: "Golden Cumdump",
        diamond: "Diamond Fucktoy",
        legendary: "Legendary Cum Queen",
        perfect: "Perfect Goddess"
    };

    function refractFlipEscHtml(s) {
        return String(s)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;")
            .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }
    /* A URL bound for style="background-image:url('...')" built as an HTML
       string: the single-quote swap covers the url() context and the entity
       escape covers the attribute context. Every value is a Stash-shaped URL
       today, but relying on Stash never emitting a quote is not a contract. */
    function refractCssUrlAttr(u) {
        return refractFlipEscHtml(String(u == null ? "" : u).replace(/'/g, "%27"));
    }

    /* Solar's "flip horizontal" pennants (CC-BY, svgrepo 528971), adapted for
       13px: two EQUAL pennants folding toward a solid axis -- symmetric in
       shape, so nothing looks lopsided -- with the near one filled and the far
       one outlined, which is what says "this face / the face you would turn
       to". The stock version keeps its dashed axis and open stroke ends, which
       is detail that turns to noise below 16px; the fill/outline split reads
       at any size. currentColor throughout, so it tints with its button, and
       the rail's mirror on "Back" swaps which pennant is the solid one. */
    var REFRACT_FLIP_ICON =
        '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
        '<path d="M2 5.88641C2 4.18426 2 3.33319 2.54242 3.05405C3.08484 2.77491 3.77738 3.26959 5.16247 4.25894L6.74371 5.3884C7.35957 5.8283 7.6675 6.04825 7.83375 6.3713C8 6.69435 8 7.07277 8 7.8296V16.1705C8 16.9273 8 17.3057 7.83375 17.6288C7.6675 17.9518 7.35957 18.1718 6.74372 18.6117L5.16248 19.7411C3.77738 20.7305 3.08484 21.2251 2.54242 20.946C2 20.6669 2 19.8158 2 18.1136V5.88641Z" fill="currentColor"/>' +
        '<path d="M22 5.88641C22 4.18426 22 3.33319 21.4576 3.05405C20.9152 2.77491 20.2226 3.26959 18.8375 4.25894L17.2563 5.3884C16.6404 5.8283 16.3325 6.04825 16.1662 6.3713C16 6.69435 16 7.07277 16 7.8296V16.1705C16 16.9273 16 17.3057 16.1662 17.6288C16.3325 17.9518 16.6404 18.1718 17.2563 18.6117L18.8375 19.7411C20.2226 20.7305 20.9152 21.2251 21.4576 20.946C22 20.6669 22 19.8158 22 18.1136V5.88641Z" stroke="currentColor" stroke-width="1.6" opacity="0.6"/>' +
        '<path d="M12 3v18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
        '</svg>';

    /* Category display order, mirroring the advanced-rating plugin. The plugin
       stores its performer criteria as an ordered `performer_criteria_ids` list
       in its own plugin config, with display names in `performer_name_<id>`. We
       read that same config once (cached) so the card-back ratings sit in the
       exact order the plugin shows them, including any reordering the user does
       in its settings. Until/if that loads we use the plugin's default order. */
    var REFRACT_AR_DEFAULT_NAMES = {
        face: "Face", breasts: "Breasts", ass: "Ass", body: "Body Overall",
        genitals: "Genitals", technique: "Technique",
        energy: "Energy & Presence", sluttiness: "Sluttiness"
    };
    var REFRACT_AR_CAT_ORDER = ["face", "breasts", "ass", "body overall", "genitals",
        "technique", "energy & presence", "sluttiness"];
    var refractAROrderLoaded = false;
    function refractLoadARCategoryOrder() {
        if (refractAROrderLoaded) { return; }
        refractAROrderLoaded = true;
        try {
            gql("query { configuration { plugins } }").then(function (res) {
                var plugins = res && res.data && res.data.configuration && res.data.configuration.plugins;
                var cfg = plugins && plugins.advancedRating;
                if (!cfg) { return; }
                var raw = cfg.performer_criteria_ids;
                if (typeof raw !== "string" || !raw.trim()) { return; }
                var order = raw.split(",").map(function (s) { return s.trim(); }).filter(Boolean)
                    .map(function (id) {
                        var nm = cfg["performer_name_" + id] || REFRACT_AR_DEFAULT_NAMES[id] || id;
                        return String(nm).toLowerCase();
                    });
                if (order.length) { REFRACT_AR_CAT_ORDER = order; }
            }).catch(function () {});
        } catch (e) {}
    }

    function injectPerformerCardFlip() {
        if (!document.body.classList.contains("refract-perf-layout-card")) { return; }
        refractLoadARCategoryOrder();
        var cards = document.querySelectorAll(".performer-card:not([data-refract-flip])");
        for (var i = 0; i < cards.length; i++) {
            (function (card) {
                card.setAttribute("data-refract-flip", "1");
                var link = card.querySelector('a[href*="/performers/"]');
                var m = link && (link.getAttribute("href") || "").match(/\/performers\/(\d+)/);
                if (!m) { return; }
                var pid = m[1];
                var btn = document.createElement("button");
                btn.className = "refract-card-flip-btn";
                btn.type = "button";
                btn.title = "Flip card";
                btn.setAttribute("aria-label", "Flip card");
                btn.innerHTML = REFRACT_FLIP_ICON;
                btn.addEventListener("click", function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    refractDoPerformerFlip(card, pid);
                });
                card.appendChild(btn);
                /* Build the back on HOVER, not on click. Its thumbnails load
                   async, so a back built at the moment the turn starts can
                   land half-painted -- the one moment the whole feature is
                   selling itself. The tab takes 200ms to slide in and a human
                   takes longer than that to aim at it, so hovering buys the
                   images a free head start at no cost to anyone who never
                   flips. */
                card.addEventListener("mouseenter", function () {
                    if (card.querySelector(".refract-card-back")) { return; }
                    refractBuildPerformerBack(card, pid);
                });
            })(cards[i]);
        }
    }

    function refractPrefersReducedMotion() {
        try {
            return !!(window.matchMedia
                && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
        } catch (e) { return false; }
    }

    /* Two-phase flip: spin the whole card to its edge (rotateY -90deg, where
       it foreshortens to an invisible vertical line), swap front<->back
       content at that hidden midpoint, then spin back to face-on. The card
       rests at rotateY(0) either way, so the back is never mirrored and the
       state survives a React re-render (no leftover inline transform). A true
       preserve-3d two-face flip isn't possible here: the card needs
       overflow:hidden (rounded corners + the tier ribbon clip), which forces
       transform-style:flat. */
    function refractDoPerformerFlip(card, pid) {
        if (card._rfxFlipBusy) { return; }
        var toBack = !card.classList.contains("refract-show-back");
        if (toBack && !card.querySelector(".refract-card-back")) {
            refractBuildPerformerBack(card, pid);
        }
        /* Someone who has asked the OS for less motion gets the face, not the
           turn. The flip is feedback, not decoration, so the state change still
           happens -- instantly. */
        if (refractPrefersReducedMotion()) {
            card.classList.toggle("refract-show-back", toBack);
            return;
        }
        card._rfxFlipBusy = true;
        card.style.zIndex = "200";
        /* Blurring under an animating perspective transform is the most
           expensive thing this card can do, and the pills carry a backdrop
           filter. Drop it for the ~475ms of the turn rather than slowing the
           turn down: nobody reads a pill edge-on. */
        card.classList.add("refract-flipping");
        /* Phase 1: turn to the edge (-90deg). */
        card.style.transition = "transform 0.24s ease-in";
        card.style.transform = "perspective(1200px) rotateY(-90deg)";
        setTimeout(function () {
            /* At the invisible edge, swap faces, then TELEPORT across to the
               mirror edge (+90deg, also edge-on and invisible) with transitions
               off. Finishing the same-direction turn (+90 -> 0) reads as one
               continuous flip, and BOTH faces come to rest at rotateY(0) so
               nothing is ever mirrored (no scaleX trickery, no accumulation,
               and the state survives a React re-render). */
            if (toBack) {
                card.classList.add("refract-show-back");
                /* Now that it has a box, the strip can be measured and fitted. */
                var shown = card.querySelector(".refract-card-back");
                if (shown) { refractFitBackStats(shown); }
            } else { card.classList.remove("refract-show-back"); }
            card.style.transition = "none";
            card.style.transform = "perspective(1200px) rotateY(90deg)";
            void card.offsetWidth;
            /* Phase 2: finish the turn to face-on. */
            card.style.transition = "transform 0.24s ease-out";
            card.style.transform = "perspective(1200px) rotateY(0deg)";
            setTimeout(function () {
                card.style.transition = "";
                card.style.transform = "";
                card.style.zIndex = "";
                card.classList.remove("refract-flipping");
                card._rfxFlipBusy = false;
            }, 250);
        }, 235);
    }

    /* One query, shared by both back styles. Everything either face needs is
       already here, which is why a scene-sourced image or a different stat
       selection costs no extra request. */
    var REFRACT_FLIP_QUERY =
        'query RefractFlip($id: ID!) {' +
        '  findPerformer(id: $id) { id rating100 favorite o_counter scene_count measurements height_cm weight career_length birthdate custom_fields tags { id name } }' +
        '  findScenes(scene_filter: { performers: { value: [$id], modifier: INCLUDES } }, filter: { per_page: 9, sort: "rating", direction: DESC }) { count scenes { id title rating100 paths { screenshot } } }' +
        '  findImages(image_filter: { performers: { value: [$id], modifier: INCLUDES } }, filter: { per_page: 9, sort: "rating", direction: DESC }) { count images { id paths { thumbnail } } }' +
        '}';
    /* The customiser previews the back by building it onto the preview's real
       performer card and showing that face directly. No flip animation: this
       is a preview, and a card that spins every time you toggle a chip is
       noise. Rebuilt from scratch on every change because the back's markup is
       a template, not a live view. */
    function refractSyncPreviewBack(kind) {
        var card = document.querySelector("#plugin-refract-card-preview .performer-card");
        if (!card) { return false; }
        if (kind !== "back") {
            var stale = card.querySelector(".refract-card-back");
            if (stale && stale.parentNode) { stale.parentNode.removeChild(stale); }
            card.classList.remove("refract-show-back");
            return true;
        }
        /* Resolve the performer BEFORE tearing anything down. This removed the
           old back first and only then looked for the link, so any moment the
           preview card was mid-re-render -- which it is every time a setting
           changes, since RefractCardPreview refetches -- left a card with its
           front hidden by `refract-show-back` and no back to show: a blank
           rectangle that stayed blank until something else moved.

           Nothing is destroyed unless there is something to put in its place. */
        var link = card.querySelector('a[href*="/performers/"]');
        var m = link ? String(link.getAttribute("href") || "").match(/\/performers\/(\d+)/) : null;
        if (!m) { return false; }
        var old = card.querySelector(".refract-card-back");
        if (old && old.parentNode) { old.parentNode.removeChild(old); }
        refractBuildPerformerBack(card, m[1]);
        card.classList.add("refract-show-back");
        /* The strip is measurable only once the back is displayed, and the
           values arrive with the query, so fit on both. */
        var built = card.querySelector(".refract-card-back");
        if (built) {
            refractFitBackStats(built);
            setTimeout(function () { refractFitBackStats(built); }, 400);
            setTimeout(function () { refractFitBackStats(built); }, 1200);
        }
        return true;
    }

    /* == The per-performer card back ==========================================
       A global rule covers almost everyone: the back uses their portrait, their
       top scene or their top photo. This is the exception for the one performer
       where that rule picks the wrong thing.

       Stored in the performer's own `custom_fields`, so it lives in the library
       database, syncs to every device and is covered by backups. NOT
       localStorage. */
    var BACK_OVERRIDE_FIELD = "refract_back";

    function refractBackOverride(cf) {
        try {
            var raw = cf && cf[BACK_OVERRIDE_FIELD];
            if (!raw) { return null; }
            var o = (typeof raw === "string") ? JSON.parse(raw) : raw;
            if (!o || !o.path) { return null; }
            o.path = refractRelPath(o.path);
            return o;
        } catch (e) { return null; }
    }

    /* ALWAYS `partial`. `full` replaces the whole map, and other plugins keep
       their own keys in there (hotornot_stats is already in this library), so a
       full write would silently destroy another plugin's data. */
    /* Stash builds `paths.*` as absolute URLs from the REQUEST host, so an
       override saved while on localhost stores "http://localhost:9999/..." and
       then breaks for the same library reached over a domain or a tailnet.
       Store it host-relative and let the browser resolve it. */
    function refractRelPath(u) {
        u = String(u || "");
        /* Only THIS host is stripped. An external URL keeps its host, or it
           would be turned into a path on this Stash that does not exist. */
        var m = u.match(/^(https?:\/\/[^/]+)/i);
        if (m && m[1].toLowerCase() === String(location.origin).toLowerCase()) { return u.slice(m[1].length); }
        return u;
    }

    function refractSetBackOverride(pid, val) {
        var m = "mutation RefractBackOverride($id: ID!, $cf: CustomFieldsInput!) {" +
                "  performerUpdate(input: { id: $id, custom_fields: $cf }) { id }" +
                "}";
        var cf;
        if (val) {
            var partial = {};
            partial[BACK_OVERRIDE_FIELD] = JSON.stringify(val);
            cf = { partial: partial };
        } else {
            cf = { remove: [BACK_OVERRIDE_FIELD] };
        }
        return gqlWithVars(m, { id: String(pid), cf: cf });
    }

    /* == The two photos on the performer page ==================================
       The header image is a PHOTO, not the card, so its other side is the
       other PHOTO -- the one this performer's card back will use -- not the
       whole back face. A flip tab turns the photo over to it.

       (A first version turned it over to the entire card back, dossier and
       all. That confused two things: the page shows pictures, the card shows
       faces. The back photo is what you are choosing here; the card is where
       it ends up.)

       SETTING the back photo happens where Stash sets the front one: in the
       edit toolbar. Stash's own "Set image…" is relabelled "Set image
       (front)…" and an identical "Set image (back)…" sits beside it, with the
       same kind of menu Stash's opens -- from this performer's scenes and
       photos, from a file, from a URL, or back to the default. A control row
       under the photo came before that; it was a second place to set images
       on a page that already had one, and it looked like nothing else there.

       Setting the FRONT is Stash's own button doing its own thing; Refract
       touches nothing about the front image. Setting the BACK writes the
       per-performer override into custom_fields; "Use default" clears it.

       Nothing React owns is moved. Stash's <img> stays where it is and is
       hidden; a stage the same size sits over it and holds a copy of the front
       and, once built, the back. The stage tracks the image's box through a
       ResizeObserver, so the collapsed header and window resizes keep it in
       register. */
    var REFRACT_PB_QUERY =
        'query RefractPerformerBack($id: ID!) {' +
        '  findPerformer(id: $id) { id name gender rating100 custom_fields }' +
        '  findScenes(scene_filter: { performers: { value: [$id], modifier: INCLUDES } }, filter: { per_page: 12, sort: "rating", direction: DESC }) { scenes { id title paths { screenshot } } }' +
        '  findImages(image_filter: { performers: { value: [$id], modifier: INCLUDES } }, filter: { per_page: 12, sort: "rating", direction: DESC }) { images { id title paths { thumbnail } } }' +
        '}';

    function refractPerformerIdFromUrl() {
        var m = String(location.pathname).match(/^\/performers\/(\d+)/);
        return m ? m[1] : null;
    }

    function applyPerformerBackControl() {
        var pid = refractPerformerIdFromUrl();
        var host = document.querySelector(".detail-header-image");
        if (!pid || !host) { refractApplyBackToolbar(); return; }
        var img = host.querySelector("img.performer");
        /* The back only exists in the Refract performer layout, so in Classic
           the page keeps Stash's plain image and nothing is added. */
        if (!document.body.classList.contains("refract-perf-layout-card") || !img) {
            var stale = host.querySelector(".refract-pp");
            if (stale) {
                if (stale._rfxRo) { stale._rfxRo.disconnect(); }
                if (stale.parentNode) { stale.parentNode.removeChild(stale); }
            }
            host.classList.remove("refract-pp-host");
            refractApplyBackToolbar();
            return;
        }
        var existing = host.querySelector(".refract-pp");
        if (existing && existing.getAttribute("data-pid") === pid) { refractApplyBackToolbar(); return; }
        /* The old stage's ResizeObserver dies WITH the old stage. It used to
           survive: one orphaned observer per rebuild, each firing fit()
           against a detached node and pinning its closure. */
        if (existing) {
            if (existing._rfxRo) { existing._rfxRo.disconnect(); }
            if (existing.parentNode) { existing.parentNode.removeChild(existing); }
        }

        host.classList.add("refract-pp-host");
        var root = document.createElement("div");
        root.className = "refract-pp";
        root.setAttribute("data-pid", pid);
        root.innerHTML =
            '<div class="refract-pp-stage">' +
            '  <div class="refract-pp-front" style="background-image:url(\'' + String(img.getAttribute("src") || "").replace(/'/g, "%27") + '\')"></div>' +
            '  <button type="button" class="refract-card-flip-btn refract-pp-flip" title="Show back photo" aria-label="Show back photo">' + REFRACT_FLIP_ICON + '</button>' +
            '</div>';
        host.appendChild(root);

        /* The stage sits on the photo's box. Showing the front, it IS the
           photo's box. Showing the back, it keeps the width and takes the BACK
           photo's own height -- the back is not cropped to the front's shape,
           it is its own picture at its own aspect. The frame changes shape at
           the edge-on moment of the flip, where nothing is visible. */
        var stage = root.querySelector(".refract-pp-stage");
        var frontCopy = root.querySelector(".refract-pp-front");
        var backRatio = null;   /* height / width of the back photo, once known */
        var showingBack = false;
        var lastSrc = img.getAttribute("src") || "";
        /* React owns the <img> and replaces it -- Stash's own "Set image
           (front)" swaps the node. fit() re-resolves it every pass instead of
           closing over a node that may be detached, and the front copy
           follows a changed src, so the stage never freezes on a dead photo. */
        var liveImg = function () {
            if (!img.isConnected) {
                var fresh = host.querySelector("img.performer");
                if (fresh) {
                    img = fresh;
                    if (ro) { ro.observe(img); }
                }
            }
            return img;
        };
        var fit = function () {
            var im = liveImg();
            var hb = host.getBoundingClientRect(), ib = im.getBoundingClientRect();
            if (!ib.width) { return; }
            var src = im.getAttribute("src") || "";
            if (src && src !== lastSrc) {
                lastSrc = src;
                frontCopy.style.backgroundImage = "url('" + src.replace(/'/g, "%27") + "')";
            }
            var h = (showingBack && backRatio) ? Math.round(ib.width * backRatio) : ib.height;
            stage.style.left = (ib.left - hb.left) + "px";
            stage.style.top = (ib.top - hb.top) + "px";
            stage.style.width = ib.width + "px";
            stage.style.height = h + "px";
        };
        root._rfxSetBack = function (on, ratio) { showingBack = on; if (ratio) { backRatio = ratio; } fit(); };
        var ro = null;
        fit();
        requestAnimationFrame(fit);
        if (typeof ResizeObserver !== "undefined") {
            ro = new ResizeObserver(fit);
            ro.observe(img);
            ro.observe(host);
            root._rfxRo = ro;
        }
        if (img.complete) { fit(); } else { img.addEventListener("load", fit, { once: true }); }
        /* The front copy still opens Stash's lightbox, as the image did. */
        frontCopy.addEventListener("click", function () {
            var b = liveImg().closest("button");
            if (b) { b.click(); }
        });

        gqlWithVars(REFRACT_PB_QUERY, { id: pid }).then(function (res) {
            var d = res && res.data;
            if (!d) { return; }
            refractRenderPageCard(root, host, img, pid, d);
            refractApplyBackToolbar();
        }).catch(function () { /* the flip stays; the toolbar button waits for data */ });
    }

    function refractRenderPageCard(root, host, img, pid, d) {
        var perf = d.findPerformer || {};
        var over = refractBackOverride(perf.custom_fields);
        var scenes = (d.findScenes && d.findScenes.scenes) || [];
        var images = (d.findImages && d.findImages.images) || [];
        var stage = root.querySelector(".refract-pp-stage");
        var flipBtn = stage.querySelector(".refract-pp-flip");
        var face = "front";
        var busy = false;

        /* The back photo, resolved by the SAME function the cards use, so
           what the page shows is what a card will use. This asked the question
           itself until now -- the fourth copy of one rule, and the copies had
           already drifted: the dossier's portrait cell answered it differently
           from the wash directly behind it. */
        function backPhotoUrl() {
            return refractBackImageUrl(img.getAttribute("src") || "", d);
        }
        var backRatioKnown = null;
        function buildBack(done) {
            var el = stage.querySelector(".refract-pp-backimg");
            if (!el) {
                el = document.createElement("div");
                el.className = "refract-pp-backimg";
                stage.insertBefore(el, flipBtn);
            }
            var url = String(backPhotoUrl());
            el.style.backgroundImage = "url('" + url.replace(/'/g, "%27") + "')";
            /* Its natural shape decides the frame's height on the back. The
               probe is bounded: a request that neither loads nor errors used
               to leave busy=true forever, a dead flip button. */
            var settled = false;
            var finish = function (ratio) {
                if (settled) { return; }
                settled = true;
                backRatioKnown = ratio;
                if (done) { done(); }
            };
            var probe = new Image();
            probe.onload = function () {
                finish(probe.naturalWidth ? (probe.naturalHeight / probe.naturalWidth) : null);
            };
            probe.onerror = function () { finish(null); };
            setTimeout(function () { finish(backRatioKnown); }, 5000);
            probe.src = url;
        }
        function labelFlip() {
            var t = face === "back" ? "Show front photo" : "Show back photo";
            flipBtn.setAttribute("title", t);
            flipBtn.setAttribute("aria-label", t);
        }

        function flip() {
            if (busy) { return; }
            var toBack = face === "front";
            busy = true;
            var go = function () {
                if (refractPrefersReducedMotion()) {
                    face = toBack ? "back" : "front";
                    stage.classList.toggle("is-back", toBack);
                    root._rfxSetBack(toBack, backRatioKnown);
                    busy = false;
                    labelFlip();
                    return;
                }
                stage.style.transition = "transform 0.24s ease-in";
                stage.style.transform = "perspective(1200px) rotateY(-90deg)";
                setTimeout(function () {
                    face = toBack ? "back" : "front";
                    stage.classList.toggle("is-back", toBack);
                    /* Edge-on: the frame takes the new photo's shape unseen. */
                    root._rfxSetBack(toBack, backRatioKnown);
                    labelFlip();
                    stage.style.transition = "none";
                    stage.style.transform = "perspective(1200px) rotateY(90deg)";
                    void stage.offsetWidth;
                    stage.style.transition = "transform 0.24s ease-out";
                    stage.style.transform = "perspective(1200px) rotateY(0deg)";
                    setTimeout(function () {
                        stage.style.transition = "";
                        stage.style.transform = "";
                        busy = false;
                    }, 250);
                }, 235);
            };
            /* Going to the back, the photo's shape must be known before the
               turn starts, or the frame would resize after landing. */
            if (toBack) { buildBack(go); } else { go(); }
        }
        flipBtn.addEventListener("click", function (e) {
            e.preventDefault(); e.stopPropagation(); flip();
        });

        /* Writes the override (or clears it), then re-resolves the back photo
           here and drops any built back for this performer elsewhere. Returns
           the write, so the toolbar can say "Saving…" honestly. */
        function chooseBack(val) {
            over = val;
            var p = refractSetBackOverride(pid, val);
            /* This performer's back, wherever it is built, is stale. */
            var built = document.querySelectorAll('.performer-card a[href$="/performers/' + pid + '"]');
            for (var i = 0; i < built.length; i++) {
                var c = built[i].closest ? built[i].closest(".performer-card") : null;
                var b = c && c.querySelector(".refract-card-back");
                if (b && b.parentNode) { b.parentNode.removeChild(b); }
            }
            if (face === "back") { buildBack(function () { root._rfxSetBack(true, backRatioKnown); }); }
            return p;
        }

        /* Their own media, in a dialog: the top scenes and photos, portrait
           cells at the crop the card will use. Choosing writes at once; there
           is no save step, so there is nothing to abandon halfway. */
        function openPicker(onDone) {
            refractCloseBackPicker();
            var wrap = document.createElement("div");
            wrap.className = "refract-pb-backdrop";
            var pick = document.createElement("div");
            pick.className = "refract-pb-picker";
            pick.setAttribute("role", "dialog");
            pick.setAttribute("aria-label", "Pick this performer’s back photo");
            var cells = "";
            var anyScene = scenes.some(function (sc) { return sc.paths && sc.paths.screenshot; });
            var anyImage = images.some(function (im) { return im.paths && im.paths.thumbnail; });
            if (anyScene) { cells += '<div class="refract-pb-group">Scenes</div>'; }
            scenes.forEach(function (sc) {
                if (!sc.paths || !sc.paths.screenshot) { return; }
                cells += '<button type="button" class="refract-pb-cell" data-kind="scene" data-id="' + sc.id +
                    '" aria-label="Use scene: ' + refractFlipEscHtml(sc.title || ("scene " + sc.id)) + '"' +
                    ' title="' + refractFlipEscHtml(sc.title || ("Scene " + sc.id)) + '"' +
                    ' data-path="' + refractFlipEscHtml(sc.paths.screenshot) + '">' +
                    '<span class="refract-pb-cell-art" style="background-image:url(\'' +
                    refractCssUrlAttr(sc.paths.screenshot) + '\')"></span></button>';
            });
            if (anyImage) { cells += '<div class="refract-pb-group">Photos</div>'; }
            images.forEach(function (im) {
                if (!im.paths || !im.paths.thumbnail) { return; }
                cells += '<button type="button" class="refract-pb-cell" data-kind="image" data-id="' + im.id +
                    '" aria-label="Use photo: ' + refractFlipEscHtml(im.title || ("photo " + im.id)) + '"' +
                    ' title="' + refractFlipEscHtml(im.title || ("Photo " + im.id)) + '"' +
                    ' data-path="' + refractFlipEscHtml(im.paths.thumbnail) + '">' +
                    '<span class="refract-pb-cell-art" style="background-image:url(\'' +
                    refractCssUrlAttr(im.paths.thumbnail) + '\')"></span></button>';
            });
            if (!anyScene && !anyImage) {
                cells += '<div class="refract-pb-empty">This performer has no scenes or photos to pick from yet.</div>';
            }
            pick.innerHTML = '<div class="refract-pb-picker-head">' +
                '<span>Back photo: pick from ' + refractFlipEscHtml(perf.name || "this performer") + '’s scenes and photos</span>' +
                '<button type="button" class="refract-pb-btn refract-pb-cancel">Cancel</button></div>' +
                '<div class="refract-pb-grid">' + cells + '</div>';
            wrap.appendChild(pick);
            document.body.appendChild(wrap);
            var close = function () { if (wrap.parentNode) { wrap.parentNode.removeChild(wrap); } document.removeEventListener("keydown", onKey); };
            wrap._rfxClose = close;
            var onKey = function (e) { if (e.key === "Escape") { close(); } };
            document.addEventListener("keydown", onKey);
            wrap.addEventListener("mousedown", function (e) { if (e.target === wrap) { close(); } });
            pick.querySelector(".refract-pb-cancel").addEventListener("click", close);
            pick.querySelector(".refract-pb-grid").addEventListener("click", function (e) {
                var cell = e.target.closest ? e.target.closest(".refract-pb-cell") : null;
                if (!cell) { return; }
                close();
                var p = chooseBack({
                    kind: cell.getAttribute("data-kind"),
                    id: cell.getAttribute("data-id"),
                    path: refractRelPath(cell.getAttribute("data-path"))
                });
                if (onDone) { onDone(p); }
            });
        }

        root._rfx = {
            pid: pid,
            hasOverride: function () { return !!over; },
            chooseBack: chooseBack,
            openPicker: openPicker
        };
    }

    function refractCloseBackPicker() {
        var w = document.querySelector(".refract-pb-backdrop");
        /* Through the picker's own close, which owns the document keydown
           listener -- removing just the node orphaned one listener per
           reopen. */
        if (w && w._rfxClose) { w._rfxClose(); }
        else if (w && w.parentNode) { w.parentNode.removeChild(w); }
    }

    /* A file, shrunk to fit a card. The card back never shows more than a few
       hundred pixels of it, and the value lives in a custom field on the
       performer, so a full-size upload would be a megabyte where 100KB does. */
    function refractShrinkImageFile(file, maxEdge, quality) {
        return new Promise(function (resolve, reject) {
            var fr = new FileReader();
            fr.onerror = function () { reject(new Error("could not read the file")); };
            fr.onload = function () {
                var im = new Image();
                im.onload = function () {
                    try {
                        var w = im.naturalWidth, h = im.naturalHeight;
                        if (!w || !h) { reject(new Error("not an image")); return; }
                        var k = Math.min(1, maxEdge / Math.max(w, h));
                        var cw = Math.max(1, Math.round(w * k)), ch = Math.max(1, Math.round(h * k));
                        var cv = document.createElement("canvas");
                        cv.width = cw; cv.height = ch;
                        var ctx = cv.getContext("2d");
                        /* JPEG has no alpha; an unpainted canvas encodes as
                           black. Paint the card's own ground colour first, so
                           a transparent PNG lands on the theme's dark rather
                           than a void. */
                        ctx.fillStyle = "#101014";
                        ctx.fillRect(0, 0, cw, ch);
                        ctx.drawImage(im, 0, 0, cw, ch);
                        resolve(cv.toDataURL("image/jpeg", quality));
                    } catch (e) { reject(e); }
                };
                im.onerror = function () { reject(new Error("not an image")); };
                im.src = String(fr.result);
            };
            fr.readAsDataURL(file);
        });
    }

    /* Small stroke icons for the menu, in the flip glyph's manner. */
    var REFRACT_PB_ICONS = {
        media: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="7" width="13" height="13" rx="1.6"/><path d="M8 4h11a2 2 0 0 1 2 2v11"/><path d="M3 17l4-4 3 3 2-2 4 4"/><circle cx="8.5" cy="11" r="1.2"/></svg>',
        file:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>',
        link:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg>',
        undo:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7v6h6"/><path d="M3.5 13A9 9 0 1 0 6 6.3L3 9"/></svg>'
    };

    /* == The edit toolbar: "Set image (front)…" and "Set image (back)…" ======
       Stash renders "Set image…" as a plain button whose only child is a text
       node; the label is swapped in place and re-asserted on every tick,
       because React re-renders it. The twin is a real sibling with the same
       classes, inserted after it, and it opens a menu shaped like Stash's own
       popover, on the same footing: from this performer's scenes and photos,
       from a file, from a URL, or the default. */
    function refractApplyBackToolbar() {
        /* Stash renders the toolbar twice (the full header and its compact
           twin), so every one gets the treatment. */
        var toolbars = document.querySelectorAll(".detail-header.edit .details-edit");
        var root = document.querySelector(".refract-pp[data-pid]");
        var rfx = root && root._rfx;
        var mine = document.querySelectorAll(".refract-set-back-btn");
        var i, j;
        if (!toolbars.length || !rfx) {
            for (i = 0; i < mine.length; i++) { if (mine[i].parentNode) { mine[i].parentNode.removeChild(mine[i]); } }
            refractCloseBackPopover();
            return;
        }
        for (i = 0; i < toolbars.length; i++) {
            var stashBtn = null;
            var btns = toolbars[i].querySelectorAll("button.btn-secondary");
            for (j = 0; j < btns.length; j++) {
                if (btns[j].classList.contains("refract-set-back-btn")) { continue; }
                var tn = btns[j].firstChild;
                if (tn && tn.nodeType === 3 && /^Set image/.test(tn.nodeValue)) { stashBtn = btns[j]; break; }
            }
            var own = toolbars[i].querySelector(".refract-set-back-btn");
            if (!stashBtn) {
                if (own && own.parentNode) { own.parentNode.removeChild(own); }
                continue;
            }
            if (stashBtn.firstChild.nodeValue !== "Set image (front)…") {
                stashBtn.firstChild.nodeValue = "Set image (front)…";
            }
            if (own && own.previousElementSibling !== stashBtn) {
                own.parentNode.removeChild(own); own = null;
            }
            if (!own) {
                own = document.createElement("button");
                own.type = "button";
                own.className = "mr-2 btn btn-secondary refract-set-back-btn";
                own.textContent = "Set image (back)…";
                own.setAttribute("aria-haspopup", "true");
                own.addEventListener("click", function (e) {
                    e.preventDefault(); e.stopPropagation();
                    var me = e.currentTarget;
                    if (document.querySelector(".refract-pb-pop")) { refractCloseBackPopover(); return; }
                    var r2 = document.querySelector(".refract-pp[data-pid]");
                    if (r2 && r2._rfx) { refractOpenBackPopover(me, r2._rfx); }
                });
                stashBtn.parentNode.insertBefore(own, stashBtn.nextSibling);
            }
        }
    }

    function refractCloseBackPopover() {
        var p = document.querySelector(".refract-pb-pop");
        if (p && p._rfxClose) { p._rfxClose(); } else if (p && p.parentNode) { p.parentNode.removeChild(p); }
    }

    function refractOpenBackPopover(btn, rfx) {
        refractCloseBackPopover();
        var pop = document.createElement("div");
        pop.className = "fade show popover bs-popover-top refract-pb-pop";
        pop.setAttribute("role", "menu");
        pop.setAttribute("x-placement", "top");
        var hasOver = rfx.hasOverride();
        pop.innerHTML =
            '<div class="arrow"></div>' +
            '<div class="popover-body">' +
            '  <div><button type="button" class="minimal btn btn-primary" data-act="media">' + REFRACT_PB_ICONS.media + '<span>From their scenes and photos…</span></button></div>' +
            '  <div><label class="image-input form-label refract-pb-filelbl"><button type="button" class="btn btn-secondary" data-act="filebtn">' + REFRACT_PB_ICONS.file + '<span>From file…</span></button>' +
            '    <input type="file" class="form-control-file" accept=".jpg,.jpeg,.png,.webp,.gif" data-act="file"></label></div>' +
            '  <div><button type="button" class="minimal btn btn-primary" data-act="url">' + REFRACT_PB_ICONS.link + '<span>From URL…</span></button></div>' +
            '  <div><button type="button" class="minimal btn btn-primary" data-act="default"' + (hasOver ? '' : ' disabled title="The back already uses the default"') + '>' + REFRACT_PB_ICONS.undo + '<span>Use default</span></button></div>' +
            '</div>';
        document.body.appendChild(pop);

        var place = function () {
            var b = btn.getBoundingClientRect();
            var pw = pop.offsetWidth, ph = pop.offsetHeight;
            var left = b.left + window.scrollX + b.width / 2 - pw / 2;
            left = Math.max(8, Math.min(left, window.scrollX + document.documentElement.clientWidth - pw - 8));
            var top = b.top + window.scrollY - ph - 10;
            pop.style.position = "absolute";
            pop.style.left = left + "px";
            pop.style.top = top + "px";
            var arrow = pop.querySelector(".arrow");
            if (arrow) { arrow.style.left = Math.round(b.left + window.scrollX + b.width / 2 - left - 8) + "px"; }
        };
        place();

        var onDoc = function (e) {
            if (pop.contains(e.target) || btn.contains(e.target)) { return; }
            close();
        };
        var onKey = function (e) { if (e.key === "Escape") { close(); } };
        var close = function () {
            document.removeEventListener("mousedown", onDoc, true);
            document.removeEventListener("keydown", onKey);
            window.removeEventListener("resize", place);
            if (pop.parentNode) { pop.parentNode.removeChild(pop); }
        };
        pop._rfxClose = close;
        setTimeout(function () { document.addEventListener("mousedown", onDoc, true); }, 0);
        document.addEventListener("keydown", onKey);
        window.addEventListener("resize", place);

        /* The button says what is happening: "Saving…", then back to its
           name; "Could not save" for a moment if the write failed. */
        var report = function (p) {
            if (!p || !p.then) { return; }
            var was = btn.textContent;
            btn.textContent = "Saving…";
            btn.disabled = true;
            p.then(function () {
                btn.textContent = was; btn.disabled = false;
            }).catch(function (err) {
                btn.textContent = "Could not save"; btn.disabled = false;
                /* The reason rides on the tooltip; a bare failure is a puzzle. */
                btn.setAttribute("title", "Could not save the back image: " + String((err && err.message) || err || "unknown error"));
                setTimeout(function () { btn.textContent = was; }, 2200);
            });
        };

        pop.addEventListener("click", function (e) {
            var t = e.target.closest ? e.target.closest("[data-act]") : null;
            if (!t) { return; }
            var act = t.getAttribute("data-act");
            if (act === "filebtn" || act === "file") { return; }   /* the label opens the input */
            e.preventDefault();
            if (act === "media") { close(); rfx.openPicker(report); return; }
            if (act === "default") { close(); report(rfx.chooseBack(null)); return; }
            if (act === "url") {
                close();
                var u = window.prompt("Image URL for the back of " + "this performer's card:", "");
                if (!u) { return; }
                u = String(u).trim();
                if (!/^https?:\/\//i.test(u) && !/^\//.test(u)) { return; }
                report(rfx.chooseBack({ kind: "url", path: refractRelPath(u) }));
            }
        });
        pop.querySelector('input[data-act="file"]').addEventListener("change", function (e) {
            var f = e.target.files && e.target.files[0];
            close();
            if (!f) { return; }
            report(refractShrinkImageFile(f, 900, 0.82).then(function (dataUri) {
                return rfx.chooseBack({ kind: "file", name: f.name, path: dataUri });
            }));
        });
    }

    /* == The gallery back =====================================================
       ONE anatomy, not a choice between two. The back is the front's own shell
       (name banner, tier sash, stat strip) wrapped around a middle the front
       cannot hold: a tray of this performer's top-rated media.

       That middle is what earns the flip. The mirror back that came before was
       right about everything except its reason to exist: it gave the turn
       nothing the front lacked. It survives here as a LOOK rather than a style
       -- tray off, a separate image chosen -- which is why there is no
       "Back style" switch any more. Mirror and Gallery are two positions of
       the same anatomy.

       Its own image source and its own stat selection are untouched, so #172
       stays answered: portrait on the front, a scene still on the back, chosen
       by the user, with the theme never claiming to know which image is which.

       Sized in `cqw` against the card's inline-size container, calibrated at
       ~285px wide, the same approach 07_scene_details.css already uses. */
    function refractBuildPerformerBack(card, pid) {
        /* The dossier is not a configuration of the face below -- it is a
           different one -- so it gets the card outright rather than being
           folded into a builder that would have to ignore most of itself. */
        if (backStylePref() === "dossier" && refractLibraryHasCategories()) {
            return refractBuildDossierBack(card, pid);
        }
        return refractBuildGalleryBack(card, pid);
    }

    /* The dossier's body IS the category ratings. On a library with none, every
       card would turn over to "No category ratings yet" -- an empty state as the
       default, which is the worst thing a default can be. One cheap check,
       cached: does ANY performer tag look like `Category: N`? The answer cannot
       change without a tag edit, so it is asked once per page life. */
    var refractHasCatsCache = null;
    var refractHasCatsListeners = [];
    /* Anyone rendering from the answer subscribes here; the query resolves into
       it. The customiser needs this because it renders before the query returns
       and would otherwise show the optimistic answer for good. */
    function refractOnCategoriesKnown(fn) {
        if (refractHasCatsCache !== null && refractHasCatsSettled) { fn(refractHasCatsCache); return; }
        refractHasCatsListeners.push(fn);
    }
    var refractHasCatsSettled = false;
    function refractLibraryHasCategories() {
        if (refractHasCatsCache !== null) { return refractHasCatsCache; }
        /* Optimistic until proven otherwise: the query below settles it, and a
           first flip drawing the dossier on a library that has categories is
           the common case. */
        refractHasCatsCache = true;
        gqlWithVars(
            /* MATCHES_REGEX against the same shape REFRACT_CATEGORY_RE accepts.
               The first version asked for ONE tag whose name merely CONTAINED
               ":" -- on a library where the first such tag was, say, "Ratio:
               4:3", it would have concluded there were no categories at all
               and put every card on the gallery face. */
            'query { findTags(filter: { per_page: 1 }, tag_filter: { name: { value: ":\\\\s*[0-5]$", modifier: MATCHES_REGEX } })' +
            ' { tags { id name } } }', {}
        ).then(function (res) {
            var tags = (res && res.data && res.data.findTags && res.data.findTags.tags) || [];
            var any = tags.some(function (t) { return REFRACT_CATEGORY_RE.test(t.name || ""); });
            if (!any) {
                refractHasCatsCache = false;
                /* Anything already built on the optimistic answer is wrong. */
                var built = document.querySelectorAll(".performer-card .refract-card-back");
                for (var i = 0; i < built.length; i++) {
                    if (built[i].parentNode) { built[i].parentNode.removeChild(built[i]); }
                }
            }
            refractHasCatsSettled = true;
            var ls = refractHasCatsListeners.splice(0);
            ls.forEach(function (fn) { try { fn(refractHasCatsCache); } catch (e) { /* ignore */ } });
        }).catch(function () {
            refractHasCatsSettled = true;
            var ls2 = refractHasCatsListeners.splice(0);
            ls2.forEach(function (fn) { try { fn(refractHasCatsCache); } catch (e) { /* ignore */ } });
        });
        return refractHasCatsCache;
    }
    /* What the card will actually build, as opposed to what is stored. */
    function effectiveBackStyle() {
        return (backStylePref() === "dossier" && refractLibraryHasCategories()) ? "dossier" : "gallery";
    }

    function refractBuildGalleryBack(card, pid) {
        var back = document.createElement("div");
        back.className = "refract-card-back refract-mirror-back";
        var img = card.querySelector("img.performer-card-image");
        var portrait = img ? (img.getAttribute("src") || "") : "";
        var nameEl = card.querySelector(".performer-name");
        var name = nameEl ? (nameEl.textContent || "").trim() : "";

        /* Reuse the FRONT's own name banner rather than approximating it. Its
           rule is a plain descendant selector, so the same markup inside the
           back inherits the identical treatment: left-aligned at the very top
           edge, Albert Sans 400, the gender glyph, the text-shadow stack, and
           the right quarter left clear for the tier sash. Centring a bold copy
           of it, as the first pass did, was not a mirror of anything. */
        var srcBanner = card.querySelector(".refract-pc-name-banner");
        var bannerHtml;
        if (srcBanner) {
            /* Marked, so hiding the FRONT's name leaves the back's alone --
               same arrangement as the sash clone. */
            var bannerClone = srcBanner.cloneNode(true);
            bannerClone.classList.add("refract-mb-name");
            bannerHtml = bannerClone.outerHTML;
        } else {
            bannerHtml = '<div class="refract-pc-name-banner refract-mb-name"><span class="refract-pc-name">' +
                refractFlipEscHtml(name) + '</span></div>';
        }

        /* The tier sash the same way: the FRONT's own element, cloned. An
           earlier pass drew a bespoke sash here and derived its own tier from
           the rating, which meant a second implementation of the same idea that
           could drift from the front and needed its own colour rules. Cloning
           gives the back the identical sash for free -- same geometry, same
           tier tint from the card's own `refract-card-tier-*` class, same
           behaviour at every tier -- and there is exactly one sash in the
           codebase again.

           The clone carries `refract-mb-sash` so the two faces stay
           independently toggleable: the front's hide gate excludes it and the
           back's own gate targets it. */
        var srcSash = card.querySelector(".refract-pc-tier-label");
        var sashHtml = "";
        if (srcSash) {
            var sashClone = srcSash.cloneNode(true);
            sashClone.classList.add("refract-mb-sash");
            sashHtml = sashClone.outerHTML;
        }

        back.innerHTML =
            '<div class="refract-mb-img"></div>' +
            '<div class="refract-mb-scrim refract-mb-scrim-top"></div>' +
            '<div class="refract-mb-scrim refract-mb-scrim-bot"></div>' +
            bannerHtml +
            sashHtml +
            /* The tray. Emitted always, even when switched off or empty: the
               region-touch zones are fixed areas of the card, so the place a
               switched-off tray WOULD sit still has to be hoverable for the
               chip that brings it back. CSS hides it; the DOM keeps the slot. */
            '<div class="refract-mb-tray">' +
            '<div class="refract-mb-tray-head">' +
            '<span class="refract-mb-tray-title">Top rated</span>' +
            '<span class="refract-mb-tray-count"></span>' +
            '</div>' +
            '<div class="refract-mb-tray-grid"></div>' +
            '</div>' +
            /* The rating's third form: a 3px fill along the bottom edge,
               echoing the scene card's resume bar. Survives lite mode and
               scans across a whole grid at a glance. */
            '<div class="refract-mb-edge"><i></i></div>' +
            /* The SAME stat strip the front uses, not a bespoke set of chips.
               `.stash-perf-stats > *` is a descendant rule, so this inherits the
               front's pill exactly: the tier-tinted gradient, the 18px radius,
               the label-over-value grid. The back differs by WHICH stats it
               carries, not by how they look. Building my own dark chips made
               the back read as the stat pills done worse. */
            '<div class="stash-perf-stats refract-mb-stats">' +
            backPillsPref().map(refractMirrorPill).join("") +
            '</div>';
        /* NO "SIDE B" mark. The design added one to stop the flip feeling
           pointless when both faces are configured identically, but it read as
           a floating label with nothing to attach to. The back is already
           unmistakable without it: a different image by default, a rating
           badge the front does not have, and different stats in the bottom
           corners. */
        card.appendChild(back);
        refractPaintBack(back, portrait, null);

        gqlWithVars(REFRACT_FLIP_QUERY, { id: pid }).then(function (res) {
            var d = res && res.data;
            refractPaintBack(back, portrait, d);
        }).catch(function () { /* the portrait fallback is already painted */ });
    }

    /* One pill, in the front's own markup shape EXACTLY: icon, then label,
       then value. The icon is not decoration -- the pill is a two-column grid
       and the icon holds column 1, so a pill without one leaves that column
       empty and pushes the number off its centre. */
    /* `data-i` is the SLOT this pill belongs to, and it is load-bearing. A
       pill with no value is hidden outright (`.refract-mb-empty`), so the
       customiser measuring the DRAWN pills and numbering them 0,1,2 was
       numbering a shorter list: on a performer with no height, clicking the
       second visible pill opened the menu for the third slot. The index comes
       off the pill itself now, so a gap in the middle costs nothing. */
    function refractMirrorPill(key, i) {
        var d = backStatDef(key);
        if (!d) { return ""; }
        return '<span class="stash-perf-' + key + ' refract-mb-p refract-mb-p-' + key +
            ' refract-mb-empty" data-i="' + i + '">' +
            backStatIcon(d.icon) +
            '<span class="stash-perf-label">' + refractFlipEscHtml(d.label) + '</span>' +
            '<span class="refract-mb-v"></span></span>';
    }

    /* Painting is split out because it runs twice: once immediately with the
       portrait so the back is never blank, then again when the query lands. */
    /* WHICH PICTURE THE BACK USES. One answer, for both faces.

       The gallery back asked it here; the dossier never asked at all and took
       the portrait always, on the argument that the image source "describes
       the gallery's anatomy". But the dossier is a back and it draws a picture
       twice -- the portrait cell in its hero row, and the full-card wash behind
       the frosted panels -- so a reader who set the back's picture to a top
       scene got a silent override with nothing to say so, and no control on
       that look to discover why. Same question, same answer, both faces. */
    function refractBackImageUrl(portrait, d) {
        var p = d && d.findPerformer;
        var scenes = (d && d.findScenes && d.findScenes.scenes) || [];
        var images = (d && d.findImages && d.findImages.images) || [];
        /* An override beats the global rule; that is the whole point of it. */
        var over = refractBackOverride(p && p.custom_fields);
        if (over) { return over.path; }
        var src = backSrcPref();
        if (src === "scene" && scenes[0] && scenes[0].paths && scenes[0].paths.screenshot) {
            return scenes[0].paths.screenshot;
        }
        if (src === "photo" && images[0] && images[0].paths && images[0].paths.thumbnail) {
            return images[0].paths.thumbnail;
        }
        /* Asked for a scene by a performer with none, or a photo from an empty
           library: the portrait, which is the one picture that always exists. */
        return portrait;
    }
    function refractCssBgUrl(url) {
        return "url('" + String(url).replace(/'/g, "%27") + "')";
    }
    function refractPaintBack(back, portrait, d) {
        var p = d && d.findPerformer;
        var url = refractBackImageUrl(portrait, d);
        var el = back.querySelector(".refract-mb-img");
        if (el && url) { el.style.backgroundImage = refractCssBgUrl(url); }
        if (!p) { return; }

        var mode = effectiveRatingDisp();
        /* The rating exists on the back if the performer has one. WHERE it goes
           is the Rating display control: a pill (only if a slot holds it) or
           the edge meter. */
        var rating10 = refractCardRating10(back, p);
        var hasRating = rating10 != null;
        back.setAttribute("data-rating-mode", hasRating ? mode : "none");

        /* Nothing is written onto the sash. It is the front's element and it
           says what the front's says: the tier, and only the tier. */
        var edge = back.querySelector(".refract-mb-edge i");
        if (edge && rating10 != null) {
            edge.style.width = Math.max(0, Math.min(100, rating10 * 10)) + "%";
        }

        var set = function (sel, text) {
            var n = back.querySelector(sel);
            if (!n) { return; }
            var v = n.querySelector(".refract-mb-v");
            if (text === null || text === undefined || text === "") {
                n.classList.add("refract-mb-empty");
                return;
            }
            n.classList.remove("refract-mb-empty");
            if (v) { v.textContent = text; } else { n.textContent = text; }
        };
        /* Values only. Each pill carries its own label above the number, the
           way the front's do, so nothing needs a unit glued onto it. The
           rating pill is only ONE of three places the rating can live, so it
           fills only when that is the mode in force. */
        set(".refract-mb-p-rating", (mode === "pill" && rating10 != null)
            ? refractFlipRating(rating10) : null);
        set(".refract-mb-p-age", refractAgeFrom(p.birthdate));
        set(".refract-mb-p-height", p.height_cm ? (p.height_cm + " cm") : null);
        set(".refract-mb-p-career", refractCareerLabel(p.career_length));
        set(".refract-mb-p-measure", p.measurements || null);
        set(".refract-mb-p-weight", p.weight ? (p.weight + " kg") : null);
        set(".refract-mb-p-o", p.o_counter != null ? String(p.o_counter) : null);
        set(".refract-mb-p-scenes", p.scene_count != null ? String(p.scene_count) : null);

        refractFitBackStats(back);
        refractPaintTray(back, d);
    }

    /* The front measures its strip and shrinks the pills to an exact fit; the
       back had no such pass and wore a hardcoded scale instead, which is why it
       never quite matched. Same algorithm, same floor: measure at full size and
       multiply toward a fit, a few passes converging because the borders do not
       scale. Now the two strips are the same component at the same size, and
       the back's can hold six pills without a magic number. */
    /* Must run while the back is VISIBLE. It is `display: none` until the card
       is turned over, and a hidden element measures 0, so calling this from the
       paint alone was a no-op every time -- the strip kept the scale it was
       born with. It is called again on the flip, and from the preview when the
       back is shown. */
    /* The dossier's category rows, fitted to the height the panel really has.
       Runs from the same places the strip fitter does, i.e. whenever the back
       is measurable. */
    function refractFitDossierCats(back) {
        /* The name first: it shares its row with the tier chip and used to run
           straight into it on long names. Step the size down, and only then
           let the ellipsis (CSS) take what is left. */
        var name = back.querySelector(".refract-cb-name");
        if (name) {
            name.style.fontSize = "";
            var steps = [1.18, 1.04, 0.92];
            for (var k = 0; k < steps.length && name.scrollWidth > name.clientWidth + 1; k++) {
                name.style.fontSize = steps[k] + "rem";
            }
        }
        var assets = back.querySelector(".refract-cb-assets");
        var grid = back.querySelector(".refract-cb-grid");
        var more = back.querySelector(".refract-cb-more");
        if (!assets || !grid || !more) { return; }
        var rows = grid.querySelectorAll(".refract-cb-stat");
        if (!rows.length) { return; }
        for (var i = 0; i < rows.length; i++) { rows[i].classList.remove("refract-cb-cut"); }
        more.setAttribute("hidden", "");
        if (!(assets.clientHeight > 0)) { return; }
        if (grid.scrollHeight <= grid.clientHeight + 1) { return; }
        /* Real layout, not arithmetic: show the count line, then cut rows off
           the end until the grid no longer overflows. At most eight passes. */
        more.removeAttribute("hidden");
        var visible = rows.length;
        while (visible > 1 && grid.scrollHeight > grid.clientHeight + 1) {
            visible -= 1;
            rows[visible].classList.add("refract-cb-cut");
            more.textContent = "+" + (rows.length - visible) + " more";
        }
    }

    function refractFitBackStats(back) {
        refractFitDossierCats(back);
        var row = back.querySelector(".refract-mb-stats");
        if (!row) { return; }
        var pills = row.querySelectorAll(".refract-mb-p");
        for (var k = 0; k < pills.length; k++) { pills[k].classList.remove("refract-mb-dropped"); }
        row.style.setProperty("--pc-badge-scale", 1);
        var avail = row.clientWidth;
        if (!(avail > 0)) { return; }

        /* DISCRETE steps, not a continuous ratio. The continuous version fitted
           each card exactly and so emitted a different real number for every
           one -- measured 0.7329 / 0.7271 / 0.6672 on three adjacent cards,
           i.e. the same word at 6.16px, 6.11px and 5.60px across one grid. A
           system has a few sizes; it does not compute one per instance. */
        var STEPS = [1, 0.85, 0.7];
        for (var i = 0; i < STEPS.length; i++) {
            row.style.setProperty("--pc-badge-scale", STEPS[i]);
            if (row.scrollWidth <= avail + 1) { return; }
        }
        /* Still too wide at the smallest step. Drop trailing pills rather than
           shrink further: below ~7px a letterspaced uppercase label is texture,
           not a label, and four readable stats beat six unreadable ones. */
        for (var j = pills.length - 1; j > 0; j--) {
            pills[j].classList.add("refract-mb-dropped");
            if (row.scrollWidth <= avail + 1) { return; }
        }
    }

    /* == The dossier back ====================================================
       A SECOND anatomy, and the only one. Everything else on the back is a
       configuration of the gallery face -- same shell, different contents --
       but this is a stats sheet: a title bar, the score as the hero, a 3-up
       media strip, the category ratings, and a vitals footer.

       It was deleted when the back became one anatomy, and that was too broad
       a cut. It holds something no other face does and no configuration of the
       gallery face can: the per-category ratings from the advanced-rating
       plugin, parsed out of the performer's `Category: N` tags and drawn as
       named 5-segment bars. That is the strongest form of the argument the
       whole back rests on -- content the front cannot hold -- so it comes back
       as a look rather than staying deleted for tidiness.

       It does NOT share the gallery's controls. The tray, the stat slots and
       the image source describe the gallery's anatomy and mean nothing here,
       so choosing this look hands the card over to a different builder and the
       region bands step aside.
       ======================================================================== */
    function refractBuildDossierBack(card, pid) {
        var back = document.createElement("div");
        back.className = "refract-card-back";
        var img = card.querySelector("img.performer-card-image");
        var imgSrc = img ? (img.getAttribute("src") || "") : "";
        var nameEl = card.querySelector(".performer-name");
        var name = nameEl ? (nameEl.textContent || "").trim() : "";
        var tier = "";
        var cl = (card.className || "").match(/refract-card-tier-(\w+)/);
        if (cl) { tier = cl[1]; }
        var photo = imgSrc
            ? ' style="background-image:url(\'' + refractCssUrlAttr(imgSrc) + '\')"' : '';

        /* Fixed, NON-SCROLLING dossier with the STATS as the hero: a title bar
           (name top-left, tier chip top-right), a hero row pairing the portrait
           beside the score banner, a 3-up media strip (top scene + library
           photos), then the category "Assets" as the large flex body (one
           readable row each), and a collector footer of library stats. */
        back.innerHTML =
            '<div class="refract-back-photo"' + photo + '></div>' +
            '<div class="refract-back-frost"></div>' +
            '<div class="refract-cb refract-cb-tier-' + (tier || 'none') + '">' +
            '<div class="refract-cb-head">' +
            '<span class="refract-cb-title">' +
            '<span class="refract-cb-name">' + refractFlipEscHtml(name) + '</span>' +
            '</span>' +
            (tier ? '<span class="refract-cb-tierchip">' + tier + '</span>' : '') +
            '</div>' +
            '<div class="refract-cb-hero">' +
            '<div class="refract-cb-portrait"' + photo + '></div>' +
            '<div class="refract-cb-score refract-cb-score-empty"></div>' +
            '</div>' +
            '<div class="refract-cb-assets"><div class="refract-cb-loading">Loading</div></div>' +
            '<div class="refract-cb-media refract-cb-media-loading">' +
            '<div class="refract-cb-media-item"><div class="refract-cb-media-img"' + photo + '></div></div>' +
            '</div>' +
            '<div class="refract-cb-foot"></div>' +
            '</div>';
        card.appendChild(back);

        /* Gender "type" glyph before the name, cloned from the card's native
           gender icon (same source the front name-banner uses). Carries its
           data-gender attribute so the per-gender glow CSS applies here too. */
        var genderSrc = card.querySelector(".gender-icon");
        var titleEl2 = back.querySelector(".refract-cb-title");
        var nameEl2 = back.querySelector(".refract-cb-name");
        if (genderSrc && titleEl2 && nameEl2) {
            var gIcon = genderSrc.cloneNode(true);
            gIcon.classList.add("refract-cb-gender");
            titleEl2.insertBefore(gIcon, nameEl2);
        }

        gqlWithVars(REFRACT_FLIP_QUERY, { id: pid }).then(function (res) {
            var d = res && res.data;
            var p = d && d.findPerformer;
            var scenes = d && d.findScenes && d.findScenes.scenes;
            var images = d && d.findImages && d.findImages.images;
            /* Both places the dossier draws the picture, from the one resolver
               the gallery uses. Painted here rather than in the markup above
               because a top scene or a top photo is only known once the query
               lands; the portrait is already on screen until it does, so there
               is no blank moment. */
            var url = refractBackImageUrl(imgSrc, d);
            if (url && url !== imgSrc) {
                var bg = refractCssBgUrl(url);
                var wash = back.querySelector(".refract-back-photo");
                var cell = back.querySelector(".refract-cb-portrait");
                if (wash) { wash.style.backgroundImage = bg; }
                if (cell) { cell.style.backgroundImage = bg; }
            }
            if (p) { refractFillPerformerBack(back, p, scenes, images); }
        }).catch(function () {
            var l = back.querySelector(".refract-cb-loading");
            if (l) { l.textContent = "Couldn't load stats"; }
        });
    }

    function isCardBackExplicit() {
        if (!REFRACT_CARDBACK_EXPLICIT_ENABLED) { return false; }
        try { return localStorage.getItem(CARD_BACK_EXPLICIT_KEY) === "1"; }
        catch (e) { return false; }
    }

    /* Career span in whole years, parsed from the free-text career_length
       ("2014 -", "2014-2020", etc.). Open-ended ranges count up to now; a
       non-year string passes through if it's short enough to fit a chip. */
    function refractCareerYears(cl) {
        if (!cl) { return ""; }
        var s = String(cl).replace(/\s+/g, " ").trim();
        var ys = s.match(/\d{4}/g);
        if (ys && ys.length) {
            var start = parseInt(ys[0], 10);
            var end = ys.length > 1 ? parseInt(ys[1], 10) : (new Date()).getFullYear();
            var span = end - start;
            if (span < 0) { span = 0; }
            return span + (span === 1 ? " yr" : " yrs");
        }
        return s.length <= 12 ? s : "";
    }

    /* Media-strip click -> open the scene/image. SPA-navigate via pushState +
       popstate (Stash's React Router responds to popstate), but leave
       ctrl/cmd/middle-click to the native href so new-tab still works. */
    function refractMediaNavClick(e) {
        var a = (e.target && e.target.closest) ? e.target.closest(".refract-cb-media-item") : null;
        if (!a) { return; }
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) { return; }
        var href = a.getAttribute("href");
        if (!href) { return; }
        e.preventDefault();
        e.stopPropagation();
        if (window.location.pathname + window.location.search !== href) {
            window.history.pushState(null, "", href);
            window.dispatchEvent(new PopStateEvent("popstate"));
        }
    }

    function refractFillPerformerBack(back, p, scenes, images) {
        /* The backdrop wash used to be repainted HERE, from its own copy of the
           back-image rule -- which is how it came to disagree with the portrait
           cell an inch in front of it, the wash following your choice of
           picture while the cell stayed the portrait for ever. Both are painted
           together now, by the one resolver, in the build pass that already had
           the query in hand. */
        var explicit = isCardBackExplicit();
        var L = explicit ? {
            score: "Slut Score", assets: "Assets", scenes: "On-Cam Fucks", o: "Loads", topscene: "Best Fuck"
        } : {
            score: "Rating", assets: "Ratings", scenes: "Scenes", o: "O-Count", topscene: "Top Scene"
        };

        /* Headline score (the overall rating100 / "slut score") - the hero. */
        var score = back.querySelector(".refract-cb-score");
        if (score) {
            score.classList.remove("refract-cb-score-empty");
            score.innerHTML =
                '<div class="refract-cb-score-num">' + (p.rating100 != null ? p.rating100 : "--") + '</div>' +
                '<div class="refract-cb-score-lbl">' + L.score + '</div>' +
                (p.favorite ? '<span class="refract-cb-fav" title="Favourite">&#10084;</span>' : '');
        }

        /* Media strip: lead with the top scene (labelled + rated), then the
           performer's top-rated library photos, then any remaining scenes as
           stills. Up to three; all lazy (only fetched on flip). Falls back to
           the portrait placeholder when she has no scenes or photos. */
        var mediaEl = back.querySelector(".refract-cb-media");
        if (mediaEl) {
            mediaEl.classList.remove("refract-cb-media-loading");
            var media = [];
            var top = scenes && scenes[0];
            if (top && top.paths && top.paths.screenshot) {
                media.push({ url: top.paths.screenshot, tag: L.topscene, rate: top.rating100, href: "/scenes/" + top.id });
            }
            (images || []).forEach(function (im) {
                if (media.length >= 3) { return; }
                if (im && im.paths && im.paths.thumbnail) { media.push({ url: im.paths.thumbnail, href: "/images/" + im.id }); }
            });
            (scenes || []).slice(1).forEach(function (sc) {
                if (media.length >= 3) { return; }
                if (sc && sc.paths && sc.paths.screenshot) { media.push({ url: sc.paths.screenshot, href: "/scenes/" + sc.id }); }
            });
            if (media.length) {
                mediaEl.innerHTML = media.map(function (m) {
                    var tag = m.tag ? '<span class="refract-cb-media-tag">' + refractFlipEscHtml(m.tag) + '</span>' : '';
                    var rate = (m.rate != null) ? '<span class="refract-cb-media-rate">&#9733; ' + m.rate + '</span>' : '';
                    return '<a class="refract-cb-media-item" href="' + refractFlipEscHtml(m.href) + '">' +
                        '<div class="refract-cb-media-img" style="background-image:url(\'' +
                        refractCssUrlAttr(m.url) + '\')"></div>' + tag + rate + '</a>';
                }).join("");
                mediaEl.addEventListener("click", refractMediaNavClick);
            }
        }

        /* Category ratings ("Assets") - the main body, one readable row each
           (name, full-width meter bar and the 0-5 value). FIXED order, matching
           the advanced-rating plugin's own criteria order (so each category
           always sits in the same row); anything the plugin doesn't list falls
           to the end alphabetically. The list scrolls if it overflows. Parsed
           from advanced-rating's `Category: N` tags. */
        var cats = [];
        (p.tags || []).forEach(function (t) {
            var nm = t.name || "";
            var mm = nm.match(REFRACT_CATEGORY_RE);
            if (mm) { cats.push({ name: mm[1].replace(/[\W_]+$/, "").trim(), score: parseInt(mm[2], 10) }); }
        });
        cats.sort(function (a, b) {
            var an = a.name.toLowerCase(), bn = b.name.toLowerCase();
            var ia = REFRACT_AR_CAT_ORDER.indexOf(an); if (ia === -1) { ia = 999; }
            var ib = REFRACT_AR_CAT_ORDER.indexOf(bn); if (ib === -1) { ib = 999; }
            if (ia !== ib) { return ia - ib; }
            return an < bn ? -1 : (an > bn ? 1 : 0);
        });
        var shown = cats;
        var assets = back.querySelector(".refract-cb-assets");
        if (assets) {
            var h = '<div class="refract-cb-assets-head"><span>' + L.assets + '</span>' +
                (cats.length ? '<span class="refract-cb-assets-n">' + cats.length + '</span>' : '') + '</div>';
            /* Every row is emitted; refractFitDossierCats then hides the
               trailing ones that do not fit the room the panel actually has
               and writes "+N more" from what it hid. A fixed cap of five was
               wrong in both directions: on a 216px preview five did not fit,
               and on a wide face there was room for all eight. */
            var hidden = 0;
            if (shown.length) {
                h += '<div class="refract-cb-grid">';
                shown.forEach(function (c) {
                    var segs = "";
                    for (var s = 1; s <= 5; s++) { segs += '<span class="refract-cb-seg' + (s <= c.score ? " on" : "") + '"></span>'; }
                    h += '<div class="refract-cb-stat refract-s' + c.score + '"><span class="refract-cb-stat-name">' +
                        refractFlipEscHtml(c.name) + '</span><span class="refract-cb-bar">' + segs + '</span>' +
                        '<span class="refract-cb-stat-val">' + c.score + '</span></div>';
                });
                h += '</div>';
                h += '<div class="refract-cb-more" hidden></div>';
            } else {
                h += '<div class="refract-cb-empty">No ' + (explicit ? 'assets rated' : 'category ratings') + ' yet</div>';
            }
            assets.innerHTML = h;
        }

        /* Collector footer: the stats you chose, in the order you put them,
           each drawn only if this performer has it. An item with no value is
           still EMITTED, hidden, carrying its index -- see refractMirrorPill
           for why the customiser needs that. */
        var foot = back.querySelector(".refract-cb-foot");
        if (foot) {
            foot.innerHTML = footPillsPref().map(function (key, i) {
                var v = refractFootValue(p, key);
                return '<span class="refract-cb-foot-item' + (v ? "" : " refract-cb-foot-empty") +
                    '" data-i="' + i + '"><b>' + refractFlipEscHtml(v || "") +
                    '</b>' + refractFlipEscHtml(refractFootLabel(key, L)) + '</span>';
            }).join("");
        }
    }
    /* The footer's own wording. Its cells are narrower than a pill and read as
       a caption, so three of the catalogue's labels are shortened here rather
       than in the catalogue, which two other strips share. */
    function refractFootLabel(key, L) {
        if (key === "scenes") { return L.scenes; }
        if (key === "o") { return L.o; }
        if (key === "measure") { return "Meas"; }
        var d = backStatDef(key);
        return d ? d.label : key;
    }
    function refractFootValue(p, key) {
        if (!p) { return ""; }
        switch (key) {
        case "scenes": return p.scene_count != null ? String(p.scene_count) : "";
        case "o": return (p.o_counter != null && p.o_counter > 0) ? String(p.o_counter) : "";
        case "measure": return p.measurements || "";
        case "height": return p.height_cm ? (p.height_cm + "cm") : "";
        case "weight": return p.weight ? (p.weight + "kg") : "";
        case "career": return refractCareerYears(p.career_length) || "";
        case "age": return refractAgeFrom(p.birthdate) || "";
        case "rating": return p.rating100 != null ? refractFlipRating(p.rating100 / 10) : "";
        default: return "";
        }
    }

    /* == The tray =============================================================
       Six of their best, taken off the same query the rest of the back already
       runs, so it costs no extra request. Scenes and photos interleave when
       both are wanted, which is what makes the row read as a library rather
       than a filmstrip.

       An empty tray is not an empty panel: with nothing rated, the tray is
       removed outright and the card lands on exactly the mirror look. The
       degraded state is a designed state, not a hole. */
    function refractPaintTray(back, d) {
        var grid = back.querySelector(".refract-mb-tray-grid");
        var tray = back.querySelector(".refract-mb-tray");
        if (!grid || !tray) { return; }
        var scenes = (d && d.findScenes && d.findScenes.scenes) || [];
        var images = (d && d.findImages && d.findImages.images) || [];
        var withPhotos = trayPhotosPref();

        var pool = [];
        scenes.forEach(function (sc) {
            if (sc && sc.paths && sc.paths.screenshot) {
                pool.push({ tag: "SC", url: sc.paths.screenshot, label: sc.title || ("Scene " + sc.id) });
            }
        });
        if (withPhotos) {
            var photos = [];
            images.forEach(function (im) {
                if (im && im.paths && im.paths.thumbnail) {
                    photos.push({ tag: "PH", url: im.paths.thumbnail, label: "Photo " + im.id });
                }
            });
            /* Interleave rather than concatenate: six scene stills followed by
               nothing is the same filmstrip the front already implies. */
            var mixed = [];
            var n = Math.max(pool.length, photos.length);
            for (var i = 0; i < n; i++) {
                if (pool[i]) { mixed.push(pool[i]); }
                if (photos[i]) { mixed.push(photos[i]); }
            }
            pool = mixed;
        }
        var cells = pool.slice(0, trayRowsPref() === 1 ? 3 : 6);
        tray.classList.toggle("refract-mb-tray-empty", cells.length === 0);
        /* One row when there is little to show, rather than a 3x2 grid with
           four holes in it. */
        tray.classList.toggle("refract-mb-tray-thin", cells.length > 0 && cells.length < 3);

        /* Tag a cell only when the tray is MIXED. Six cells each labelled "SC"
           is the clearest tell of an unedited design: repeating a label on every
           member of a homogeneous set says nothing six times. When they are all
           one kind the heading says so once, and the cells are just pictures. */
        var kinds = {};
        cells.forEach(function (c) { kinds[c.tag] = 1; });
        var mixed = Object.keys(kinds).length > 1;
        var html = "";
        cells.forEach(function (c) {
            html += '<span class="refract-mb-cell" style="background-image:url(\'' +
                refractCssUrlAttr(c.url) + '\')" title="' +
                refractFlipEscHtml(c.label) + '">' +
                (mixed ? '<span class="refract-mb-cell-tag">' + c.tag + '</span>' : '') +
                '</span>';
        });
        grid.innerHTML = html;

        var title = back.querySelector(".refract-mb-tray-title");
        if (title) {
            title.textContent = mixed ? "Top rated"
                : (kinds.PH ? "Top rated photos" : "Top rated scenes");
        }

        var count = back.querySelector(".refract-mb-tray-count");
        if (count) {
            var ns = (d && d.findScenes && d.findScenes.count) || 0;
            var ni = (d && d.findImages && d.findImages.count) || 0;
            /* "1283 SC / 0 PH" prints a zero as though it meant something.
               The count says what the six were drawn FROM, so an empty library
               just drops out of the line. */
            count.textContent = (withPhotos && ni > 0) ? (ns + " SC / " + ni + " PH") : (ns + " SC");
        }
    }

    /* `career_length` is free text and comes in as anything from "9" to
       "2017 - 2023". A bare year range in a corner pill reads as noise, so a
       plain number gets its unit and anything else is left as the user wrote
       it. */
    function refractCareerLabel(v) {
        if (!v) { return null; }
        var t = String(v).trim().replace(/\s+/g, " ");
        if (!t) { return null; }
        if (/^\d+$/.test(t)) { return t + " yrs"; }
        /* Stash stores career_length as free text, and an open-ended range
           ("2018 -") rendered literally as a year with a dash hanging off it,
           which is not a fact anyone can read at pill size. Any year or year
           range becomes a SPAN, counted to now when it is open-ended. */
        var m = t.match(/^(\d{4})\s*[-\u2013\u2014]?\s*(\d{4})?$/);
        if (m) {
            var start = parseInt(m[1], 10);
            var end = m[2] ? parseInt(m[2], 10) : new Date().getFullYear();
            var span = Math.max(0, end - start);
            return span <= 0 ? "<1 yr" : (span + (span === 1 ? " yr" : " yrs"));
        }
        /* Anything else is the user's own words; keep it only if it can fit. */
        return t.length <= 9 ? t : null;
    }

    /* The front's read-out, arrived at the front's way. This did its own
       arithmetic and disagreed with the card it was printed on: decimal mode
       showed the raw 0-100 (95) against the front's 0-10 (9.5), and stars mode
       rounded to one decimal (4.8) against the front's two (4.75). One fact,
       one card, two numbers -- which is on its own enough to make the back look
       unfinished. Same scale, same rounding, both modes. */
    /* Takes the 0-10 value, not rating100: that is the scale the front works
       in, and parity with the front is the entire point. */
    function refractFlipRating(v10) {
        if (!document.body || !document.body.classList.contains("refract-rating-system-stars")) {
            return String(v10);
        }
        return String(Math.round((v10 / 2) * 100) / 100);
    }

    /* The rating the FRONT of this very card is showing.

       Reading `rating100` off the query looked obviously right and was wrong:
       measured on one card the front said 9.5 and the back said 4.9, i.e. 9.8
       -- not a rounding difference, a different NUMBER. The front's rating pass
       does not use `rating100` directly (advanced-rating computes its own
       overall) and it publishes the result on the card as `data-refract-rating`
       on a 0-10 scale. Read that and the two faces cannot disagree, whatever
       produced it. `rating100` stays as the fallback for a card whose front
       pass has not run. */
    function refractCardRating10(back, p) {
        var card = back && back.closest ? back.closest(".performer-card") : null;
        var attr = card && card.getAttribute("data-refract-rating");
        if (attr) {
            var v = parseFloat(attr);
            if (isFinite(v)) { return v; }
        }
        return (p && p.rating100 != null) ? p.rating100 / 10 : null;
    }






    function markActiveUtilityButtons() {
        var currentPath = refractPathFromLocation();
        /* Right-side utility links (exact match) + left-side route links (prefix match).
           Left nav items have no .nav-link class — select all <a href> inside .navbar-nav,
           excluding javascript: pseudo-links. */
        var links = document.querySelectorAll(
            "nav.top-nav .navbar-buttons a.nav-utility[href], nav.top-nav .navbar-nav a[href]:not([href^='javascript'])"
        );
        /* Pre-pass: collect all left-nav hrefs so we can disambiguate
           prefix matches. /scenes shouldn't light up when on
           /scenes/markers because Markers is its own nav item with a
           longer prefix. */
        var leftNavHrefs = [];
        links.forEach(function (link) {
            if (link.classList.contains("nav-utility")) { return; }
            var p = refractPathFromHref(link.getAttribute("href") || "");
            if (p && p !== "/") { leftNavHrefs.push(p); }
        });
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
            var isActive;
            if (isLeftNav) {
                if (currentPath === hrefPath) {
                    isActive = true;
                } else if (currentPath.indexOf(hrefPath + "/") === 0) {
                    /* Prefix match — but only if no longer-prefix nav item
                       also matches. Prevents /scenes lighting up on
                       /scenes/markers (Markers owns the longer prefix). */
                    isActive = !leftNavHrefs.some(function (other) {
                        return other !== hrefPath
                            && other.length > hrefPath.length
                            && (currentPath === other || currentPath.indexOf(other + "/") === 0);
                    });
                } else {
                    isActive = false;
                }
            } else {
                isActive = (currentPath === hrefPath);
            }
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
        function fire() { nextTick(syncRoute); }
        /* Prefer Stash's own location event (stash:location, fired from
           App.tsx on every React Router navigation) over monkeypatching
           history.pushState/replaceState. The patch approach is fragile:
           it collides with any other plugin that wraps the same methods.
           Only fall back to wrapping history on older Stash builds that
           predate the event. */
        if (typeof PluginApi !== "undefined" && PluginApi && PluginApi.Event && PluginApi.Event.addEventListener) {
            PluginApi.Event.addEventListener("stash:location", fire);
        } else {
            var p = history.pushState, r = history.replaceState;
            history.pushState = function () { var x = p.apply(history, arguments); fire(); return x; };
            history.replaceState = function () { var x = r.apply(history, arguments); fire(); return x; };
            window.addEventListener("popstate", fire);
        }
        /* hashchange isn't covered by stash:location; keep it for any
           hash-routed setup. */
        window.addEventListener("hashchange", fire);
    }

    /* ── Watch for nav re-renders so the + icon survives ─────────── */

    /* Run an init in isolation so one throw doesn't skip the rest of the
       cycle (e.g. a stale-reference NotFoundError from one init breaking
       sibling initializers running in the same MutationObserver callback). */
    function safeRun(fn) {
        try { fn(); } catch (e) { /* swallow — Stash re-renders will trigger another cycle */ }
    }

    /* ── The player's source menu, as two questions ──────────────────────
       Stash lists every transcode as one flat menu: Direct stream, then MP4,
       MP4 Standard (480p), MP4 Low (240p), WEBM, WEBM Standard (480p) ... a
       format-by-resolution MATRIX flattened into thirteen rows, where picking
       "720p" means scanning for the row that also happens to say the container
       you are already on. They are two independent choices and they read as
       two: pick a format, pick a resolution.

       Stash's own <li>s stay in the DOM, untouched and merely hidden, and every
       click is forwarded to one of them -- so video.js runs its own handler and
       keeps its own state. Nothing here reimplements playback. */
    /* VR projection. Stash owns the question of whether a scene IS VR:
       vrmode.ts adds its menu button only when the scene carries the tag
       named by the "VR Tag" setting (Settings > Interface > Scene
       Player), and removes it otherwise. Earlier this drove the
       videojs-vr plugin directly, which put a Projection row on EVERY
       scene -- clutter on the 99% that are flat, and not what Stash
       means by VR.

       So the group now appears only when Stash's own VR control is
       present, and it forwards clicks to that control's items -- the same
       contract as Format, Resolution and Speed. Stash's button is then
       hidden, because the panel is showing it.

       The button carries no distinguishing class (it is a stock videojs
       MenuButton), so it is identified by its items, which are fixed by
       vrmode.ts: 180 LR / 360 TB / 360 Mono / Off. */
    function refractVrMenuButton() {
        var btns = document.querySelectorAll(".vjs-control-bar .vjs-menu-button");
        for (var i = 0; i < btns.length; i++) {
            var items = btns[i].querySelectorAll(".vjs-menu-item");
            var labels = [];
            for (var j = 0; j < items.length; j++) {
                labels.push(String(items[j].textContent || "").replace(/,\s*selected\s*$/i, "").trim());
            }
            if (labels.indexOf("360 Mono") !== -1 && labels.indexOf("180 LR") !== -1) { return btns[i]; }
        }
        return null;
    }

    function refractVrModes() {
        var host = refractVrMenuButton();
        if (!host) { return []; }
        var out = [];
        Array.prototype.forEach.call(host.querySelectorAll(".vjs-menu-item"), function (li) {
            var label = String(li.textContent || "").replace(/,\s*selected\s*$/i, "").trim();
            if (label) { out.push({ label: label, li: li }); }
        });
        return out;
    }

    function refractCurrentVr() {
        var modes = refractVrModes();
        for (var i = 0; i < modes.length; i++) {
            if (modes[i].li.classList.contains("vjs-selected")) { return modes[i].label; }
        }
        return null;
    }

    /* The playback-rate control is a sibling menu button on the control
       bar. Its items are the source of truth for which rates this player
       offers, so they are read rather than hard-coded. */
    function refractSourceRates() {
        var host = document.querySelector(".vjs-playback-rate");
        if (!host) { return []; }
        var items = host.querySelectorAll(".vjs-menu-item");
        var out = [];
        Array.prototype.forEach.call(items, function (li) {
            var label = String(li.textContent || "").replace(/,\s*selected\s*$/i, "").trim();
            if (label) { out.push({ label: label, li: li }); }
        });
        /* video.js lists fastest-first; slowest-first reads like a dial. */
        return out.reverse();
    }

    function refractCurrentRate() {
        var rates = refractSourceRates();
        for (var i = 0; i < rates.length; i++) {
            if (rates[i].li.classList.contains("vjs-selected")) { return rates[i].label; }
        }
        return null;
    }

    function refractParseSourceLabel(text) {
        var t = String(text || "").replace(/,\s*selected\s*$/i, "").trim();
        if (!t) { return null; }
        if (/^direct\s+stream$/i.test(t)) { return { direct: true, label: t }; }
        var m = t.match(/^(\S+)\s*(.*)$/);
        if (!m) { return null; }
        return { direct: false, format: m[1], res: (m[2] || "").trim() || "Original", label: t };
    }

    function refractEnhanceSourceMenu() {
        var host = document.querySelector(".vjs-source-selector");
        if (!host) { return; }
        var menu = host.querySelector(".vjs-menu");
        var list = menu && menu.querySelector(".vjs-menu-content");
        if (!list) { return; }
        var items = Array.prototype.slice.call(list.querySelectorAll(".vjs-menu-item"));
        if (items.length < 3) { return; }

        var parsed = [];
        items.forEach(function (li) {
            var p = refractParseSourceLabel(li.textContent);
            if (p) { p.li = li; p.on = li.classList.contains("vjs-selected"); parsed.push(p); }
        });
        var real = parsed.filter(function (p) { return !p.direct; });
        if (!real.length) { return; }

        /* A signature of the offer, so a re-render only happens when Stash's
           own menu actually changes (transcode settings, a different file). */
        var sig = parsed.map(function (p) { return p.label; }).join("|");
        var panel = host.querySelector(".refract-src");
        if (panel && panel.getAttribute("data-sig") !== sig) {
            panel.parentNode.removeChild(panel);
            panel = null;
        }

        var formats = [], resolutions = [];
        real.forEach(function (p) {
            if (formats.indexOf(p.format) === -1) { formats.push(p.format); }
            if (resolutions.indexOf(p.res) === -1) { resolutions.push(p.res); }
        });
        var cur = parsed.filter(function (p) { return p.on; })[0] || null;
        var find = function (fmt, res) {
            for (var i = 0; i < real.length; i++) {
                if (real[i].format === fmt && real[i].res === res) { return real[i]; }
            }
            return null;
        };

        if (!panel) {
            panel = document.createElement("div");
            panel.className = "refract-src";
            panel.setAttribute("data-sig", sig);
            var direct = parsed.filter(function (p) { return p.direct; })[0];
            var html = "";
            if (direct) {
                html += '<button type="button" class="refract-src-direct" data-kind="direct">' +
                    refractFlipEscHtml(direct.label) + "</button>";
            }
            html += '<div class="refract-src-group"><div class="refract-src-head">Format</div><div class="refract-src-row">';
            formats.forEach(function (f) {
                html += '<button type="button" class="refract-src-opt" data-kind="format" data-v="' +
                    refractFlipEscHtml(f) + '">' + refractFlipEscHtml(f) + "</button>";
            });
            html += "</div></div>";
            html += '<div class="refract-src-group"><div class="refract-src-head">Resolution</div><div class="refract-src-row">';
            resolutions.forEach(function (r) {
                /* "Standard (480p)" reads as its number here, because the
                   column heading already says what the number is. */
                var short = (r.match(/\((\d+p)\)/) || [])[1] || r;
                html += '<button type="button" class="refract-src-opt" data-kind="res" data-v="' +
                    refractFlipEscHtml(r) + '" title="' + refractFlipEscHtml(r) + '">' +
                    refractFlipEscHtml(short) + "</button>";
            });
            html += "</div></div>";
            /* Speed. Same contract as Format and Resolution: Stash's own
               menu items stay in the DOM and take the click, so video.js
               keeps its state and refract reimplements nothing. */
            var rates = refractSourceRates();
            if (rates.length) {
                /* A slider, not eight more pills. Speed is an ordered scale
                   with a natural resting point, which is what a slider is
                   for -- and eight pills was the single biggest block in
                   the panel. It still snaps to Stash's own rates rather
                   than inventing continuous values, so the click can be
                   forwarded to Stash's menu item like everything else. */
                var curRate = refractCurrentRate();
                var curIdx = 0;
                for (var qi = 0; qi < rates.length; qi++) {
                    if (rates[qi].label === curRate) { curIdx = qi; }
                }
                html += '<div class="refract-src-group refract-src-group-rate">' +
                    '<div class="refract-src-head">Speed</div>' +
                    '<div class="refract-src-rate">' +
                    '<input type="range" class="refract-src-slider" data-kind="rate"' +
                    ' min="0" max="' + (rates.length - 1) + '" step="1" value="' + curIdx + '"' +
                    ' aria-label="Playback speed">' +
                    '<span class="refract-src-rate-val">' + refractFlipEscHtml(curRate || "1x") + "</span>" +
                    "</div></div>";
            }
            var vrModes = refractVrModes();
            if (vrModes.length) {
                html += '<div class="refract-src-group"><div class="refract-src-head">Projection</div><div class="refract-src-row">';
                vrModes.forEach(function (m) {
                    html += '<button type="button" class="refract-src-opt" data-kind="vr" data-v="' +
                        refractFlipEscHtml(m.label) + '">' + refractFlipEscHtml(m.label) + "</button>";
                });
                html += "</div></div>";
            }
            panel.innerHTML = html;
            menu.appendChild(panel);

            var slider = panel.querySelector(".refract-src-slider");
            if (slider) {
                var applyRate = function () {
                    var rs = refractSourceRates();
                    var pick = rs[parseInt(slider.value, 10)];
                    if (!pick) { return; }
                    var out = panel.querySelector(".refract-src-rate-val");
                    if (out) { out.textContent = pick.label; }
                    pick.li.click();
                };
                slider.addEventListener("input", applyRate);
                /* The slider lives inside the menu; without this a drag or
                   a click on it closes the menu via the panel handler. */
                slider.addEventListener("click", function (e) { e.stopPropagation(); });
                slider.addEventListener("mousedown", function (e) { e.stopPropagation(); });
            }

            panel.addEventListener("click", function (e) {
                var b = e.target.closest ? e.target.closest("[data-kind]") : null;
                if (!b) { return; }
                e.preventDefault();
                e.stopPropagation();
                var kind = b.getAttribute("data-kind");
                var target = null;
                if (kind === "vr") {
                    var wantVr = b.getAttribute("data-v");
                    var ms = refractVrModes();
                    for (var mi = 0; mi < ms.length; mi++) {
                        if (ms[mi].label === wantVr) { ms[mi].li.click(); break; }
                    }
                    Array.prototype.forEach.call(panel.querySelectorAll('[data-kind="vr"]'), function (o) {
                        o.classList.toggle("is-on", o.getAttribute("data-v") === wantVr);
                    });
                    return;
                }
                if (kind === "direct") {
                    target = parsed.filter(function (p) { return p.direct; })[0];
                } else {
                    /* Hold the other axis. Coming from Direct stream there is
                       no other axis to hold, so take the first offer -- the
                       original resolution of the format you asked for. */
                    var nowFmt = (cur && !cur.direct) ? cur.format : formats[0];
                    var nowRes = (cur && !cur.direct) ? cur.res : resolutions[0];
                    if (kind === "format") {
                        target = find(b.getAttribute("data-v"), nowRes) || find(b.getAttribute("data-v"), resolutions[0]);
                    } else {
                        target = find(nowFmt, b.getAttribute("data-v")) || find(formats[0], b.getAttribute("data-v"));
                    }
                }
                if (target && target.li) { target.li.click(); }
            });
        }

        /* Marks, every pass: video.js moves `vjs-selected` itself. */
        var mark = function (sel, val) {
            Array.prototype.forEach.call(panel.querySelectorAll(sel), function (b) {
                b.classList.toggle("is-on", b.getAttribute("data-v") === val);
            });
        };
        var d = panel.querySelector(".refract-src-direct");
        if (d) { d.classList.toggle("is-on", !!(cur && cur.direct)); }
        var nowRate = refractCurrentRate();
        var sl = panel.querySelector(".refract-src-slider");
        if (sl && nowRate) {
            var all = refractSourceRates();
            for (var si = 0; si < all.length; si++) {
                if (all[si].label === nowRate && String(si) !== sl.value) { sl.value = String(si); }
            }
            var rv = panel.querySelector(".refract-src-rate-val");
            if (rv && rv.textContent !== nowRate) { rv.textContent = nowRate; }
        }
        mark('[data-kind="vr"]', refractCurrentVr());
        /* Stash's own controls are redundant once the panel carries them.
           Hidden, not removed: their menu items are what the panel
           forwards clicks to, and a display:none <li> still runs its
           handler. */
        var vrBtn = refractVrMenuButton();
        if (vrBtn) { vrBtn.classList.add("refract-vr-folded"); }
        if (panel.querySelector('[data-kind="rate"]')) {
            var rateBtn = document.querySelector(".vjs-control-bar .vjs-playback-rate");
            if (rateBtn) { rateBtn.classList.add("refract-rate-folded"); }
        }
        mark('[data-kind="format"]', cur && !cur.direct ? cur.format : null);
        mark('[data-kind="res"]', cur && !cur.direct ? cur.res : null);
        /* An offer this file does not have is shown as unavailable rather than
           silently doing nothing. */
        var heldRes = (cur && !cur.direct) ? cur.res : resolutions[0];
        var heldFmt = (cur && !cur.direct) ? cur.format : formats[0];
        Array.prototype.forEach.call(panel.querySelectorAll('[data-kind="format"]'), function (b) {
            var ok = !!(find(b.getAttribute("data-v"), heldRes) || find(b.getAttribute("data-v"), resolutions[0]));
            b.disabled = !ok;
        });
        Array.prototype.forEach.call(panel.querySelectorAll('[data-kind="res"]'), function (b) {
            var ok = !!(find(heldFmt, b.getAttribute("data-v")) || find(formats[0], b.getAttribute("data-v")));
            b.disabled = !ok;
        });
        list.classList.add("refract-src-hidden");
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
                safeRun(injectMobileNewButton);
                safeRun(injectBurgerScrim);
                safeRun(injectToolbarDropdownScrim);
                safeRun(injectMobileDrawer);
                safeRun(injectMobileDock);
                safeRun(refractApplyNavIcons);
                safeRun(refractifyCardPopoverIcons);
                safeRun(refractAppendPluginDrawerTiles);
                safeRun(normalizeSettingsSidebarNavItems);
                safeRun(injectSupportStashLink);
                safeRun(markActiveUtilityButtons);
                safeRun(stripRatingBannerToNumber);
                safeRun(initCardTilts);
                safeRun(initSceneCards);
                safeRun(initPerformerCards);
                safeRun(syncPerformerCardHearts);
                safeRun(integrateAscensionBadges);
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
                safeRun(initTagCountPopover);
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
        /* Home-page slick carousel cards: skip the tilt entirely. The per-
           mousemove perspective/scale transform forced backdrop-filter +
           glow-shadow re-raster every frame against a blur-dense home page,
           dropping hover to ~2fps on Chrome. CSS in 03_cards.css also
           flattens their :hover (no scale/glow). The effect stays on the
           real list/grid views. Not marked _stashTilt — the closest() check
           is cheap and keeps SPA re-binds correct. */
        if (card.closest && card.closest(".slick-slider")) { return; }
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
        /* Bind tilt listeners + glare overlay up front at boot / SPA-rebind.
           v1.13.13 lazy-bound these via IntersectionObserver (bind only when a
           card neared the viewport) to shave boot cost ~80→~20 cards, but that
           appended the .stash-tilt-glare overlay div mid-scroll as cards came
           into view — a DOM mutation during scroll that flashed a visible
           pop-in (worst on Firefox during fast scroll). Binding all present
           cards directly costs only a few listeners + one tiny div each, and
           the _stashTilt idempotence guard in cardTiltBind keeps repeat
           (SPA-rebind) calls cheap. */
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

    /* O count icon — stylized rotated O glyph matching Stash native.
       Fill attribute lives on the <svg> root (not the inner <path>) to
       match STAR/CAKE/PLAY structure. Path-level fill would shadow the
       CSS `fill: --badge-color-bright` override used by playing-card
       mode and the path would render in the chip's currentColor
       instead. */
    var O_ICON_SVG =
        '<svg viewBox="0 0 36 36" fill="currentColor" aria-hidden="true">' +
        '<path d="M22.855.758L7.875 7.024l12.537 9.733c2.633 2.224 6.377 2.937 9.77 1.518c4.826-2.018 7.096-7.576 5.072-12.413C33.232 1.024 27.68-1.261 22.855.758zm-9.962 17.924L2.05 10.284L.137 23.529a7.993 7.993 0 0 0 2.958 7.803a8.001 8.001 0 0 0 9.798-12.65zm15.339 7.015l-8.156-4.69l-.033 9.223c-.088 2 .904 3.98 2.75 5.041a5.462 5.462 0 0 0 7.479-2.051c1.499-2.644.589-6.013-2.04-7.523z"/>' +
        '</svg>';

    /* Light-mode toggle glyphs — sun (light on) / moon (light off). User-
       supplied svgrepo icons, normalised to currentColor so they inherit the
       toggle button's color (incl. the warm-gradient active state). Sun is
       stroke-based, moon is fill-based. */
    var SUN_ICON_SVG =
        '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
        '<path d="M12 3V4M12 20V21M4 12H3M6.31412 6.31412L5.5 5.5M17.6859 6.31412L18.5 5.5M6.31412 17.69L5.5 18.5001M17.6859 17.69L18.5 18.5001M21 12H20M16 12C16 14.2091 14.2091 16 12 16C9.79086 16 8 14.2091 8 12C8 9.79086 9.79086 8 12 8C14.2091 8 16 9.79086 16 12Z" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>' +
        '</svg>';
    var MOON_ICON_SVG =
        '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
        '<path d="M21.0672 11.8568L20.4253 11.469L21.0672 11.8568ZM12.1432 2.93276L11.7553 2.29085V2.29085L12.1432 2.93276ZM21.25 12C21.25 17.1086 17.1086 21.25 12 21.25V22.75C17.9371 22.75 22.75 17.9371 22.75 12H21.25ZM12 21.25C6.89137 21.25 2.75 17.1086 2.75 12H1.25C1.25 17.9371 6.06294 22.75 12 22.75V21.25ZM2.75 12C2.75 6.89137 6.89137 2.75 12 2.75V1.25C6.06294 1.25 1.25 6.06294 1.25 12H2.75ZM15.5 14.25C12.3244 14.25 9.75 11.6756 9.75 8.5H8.25C8.25 12.5041 11.4959 15.75 15.5 15.75V14.25ZM20.4253 11.469C19.4172 13.1373 17.5882 14.25 15.5 14.25V15.75C18.1349 15.75 20.4407 14.3439 21.7092 12.2447L20.4253 11.469ZM9.75 8.5C9.75 6.41182 10.8627 4.5828 12.531 3.57467L11.7553 2.29085C9.65609 3.5593 8.25 5.86509 8.25 8.5H9.75ZM12 2.75C11.9115 2.75 11.8077 2.71008 11.7324 2.63168C11.6686 2.56527 11.6538 2.50244 11.6503 2.47703C11.6461 2.44587 11.6482 2.35557 11.7553 2.29085L12.531 3.57467C13.0342 3.27065 13.196 2.71398 13.1368 2.27627C13.0754 1.82126 12.7166 1.25 12 1.25V2.75ZM21.7092 12.2447C21.6444 12.3518 21.5541 12.3539 21.523 12.3497C21.4976 12.3462 21.4347 12.3314 21.3683 12.2676C21.2899 12.1923 21.25 12.0885 21.25 12H22.75C22.75 11.2834 22.1787 10.9246 21.7237 10.8632C21.286 10.804 20.7293 10.9658 20.4253 11.469L21.7092 12.2447Z" fill="currentColor"/>' +
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

        /* The chin's height, published on the card. The studio logo's
           bottom-corner position has to clear the chin, and the logo's
           containing block is the CARD (measured: `bottom: 0.45rem` landed it
           on the title, not above it), so the CSS needs the chin's height to
           subtract. It is one line in the Refract layout and taller in
           Classic, and it can change on resize, hence the observer. */
        var chinPublish = function () {
            var h = section.offsetHeight;
            if (h > 0) { card.style.setProperty("--refract-chin-h", h + "px"); }
        };
        requestAnimationFrame(chinPublish);
        if (typeof ResizeObserver !== "undefined" && !section._rfxChinRO) {
            section._rfxChinRO = new ResizeObserver(chinPublish);
            section._rfxChinRO.observe(section);
        }

        /* Tag portrait thumbnails so the minimal-mode cover-fill CSS can
           opt them out — for vertical scenes the cover behaviour would
           crop heavily. The image often isn't loaded yet, so check
           complete + naturalWidth, else listen for load once. */
        tagOrientation(card);

        /* Heart-halo effect for "Favourite" scenes — driven by the
           "Favourite ★" tag injected by the Advanced Rating plugin. We
           detect via the tagInfo array (case-insensitive match on
           "favourite" / "favorite" so it works for either spelling and
           catches the ★-suffix). Class + static heart-halo layer are
           toggled in sync; only tagged cards build the layer. */
        var isFavourite = tagInfo && tagInfo.some(function (t) {
            return t && t.name && /^favou?rite/i.test(t.name);
        });
        var existingHearts = card.querySelector(":scope > .refract-heart-particles");
        if (isFavourite) {
            card.classList.add("refract-favourite");
            if (!existingHearts) {
                card.appendChild(refractBuildHearts());
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

        /* Use aliased findScene (singular) calls instead of findScenes
           (plural) with scene_ids. Stash's findScenes(scene_ids:) errors
           the entire batch if ANY id in the list doesn't exist — and on
           a home page with stale/deleted recommendations that's common
           enough to silently break every card in the page. findScene(id:)
           returns null for missing ids, so other aliases in the same
           query still resolve and the rest of the cards get badges. */
        var fields = 'id o_counter rating100 performers { id name } tags { id name }';
        var aliases = ids.map(function (id) {
            return 's' + id + ': findScene(id: ' + id + ') { ' + fields + ' }';
        }).join(' ');
        var q = 'query { ' + aliases + ' }';
        gql(q)
            .then(function (res) {
                var data = res.data || {};
                Object.keys(data).forEach(function (key) {
                    var scene = data[key];
                    if (!scene) { return; }
                    var tags = scene.tags || [];
                    var tagInfo = tags.map(function (t) { return { id: t.id, name: t.name }; })
                                      .filter(function (t) { return t.id && t.name; });
                    var oCount = parseInt(scene.o_counter, 10) || 0;
                    var rating = parseInt(scene.rating100, 10) || 0;
                    /* Re-query the live DOM by scene-id href instead of
                       trusting cardMap. On the home page, React + slick
                       reshuffle/clone scene-card nodes between when we
                       fire the query and when it resolves — cardMap
                       refs point to detached originals while the visible
                       cards (including slick clones) are new nodes that
                       cardMap doesn't know about. Querying by href
                       finds whatever's in the DOM right now, so all
                       visible copies of a scene-card get badges. The
                       idempotence checks inside injectPerformerCircles
                       /injectSceneRating make double-calls safe. */
                    var sceneId = String(scene.id);
                    var liveCards = document.querySelectorAll(
                        '.scene-card a[href^="/scenes/' + sceneId + '?"], ' +
                        '.scene-card a[href="/scenes/' + sceneId + '"], ' +
                        '.scene-card a[href^="/scenes/' + sceneId + '/"]'
                    );
                    var seen = [];
                    liveCards.forEach(function (a) {
                        var card = a.closest(".scene-card");
                        if (!card || seen.indexOf(card) !== -1) { return; }
                        seen.push(card);
                        injectPerformerCircles(card, scene.performers || [], tags.length, scene.id, oCount, tagInfo);
                        injectSceneRating(card, rating);
                    });
                });
                /* Re-tag freshly-injected banners so tier classes + the
                   --refract-rating var land for intensity/tiers modes. */
                try { tagFilledRatings(); } catch (e) { /* ignore */ }
            })
            .catch(function () {
                /* Query failed (expired ApiKey, network blip, Stash
                   restart). Un-mark the cards we claimed so the next
                   MutationObserver pass retries them — otherwise
                   :not([data-stash-sc]) excludes them forever and they show
                   no badges until a full reload. Re-query live by href since
                   React may have swapped the nodes while in flight; a
                   detached original still carrying the marker is harmless
                   (the live selector never sees it). */
                ids.forEach(function (id) {
                    document.querySelectorAll(
                        '.scene-card[data-stash-sc] a[href^="/scenes/' + id + '?"], ' +
                        '.scene-card[data-stash-sc] a[href="/scenes/' + id + '"], ' +
                        '.scene-card[data-stash-sc] a[href^="/scenes/' + id + '/"]'
                    ).forEach(function (a) {
                        var c = a.closest(".scene-card");
                        if (c) { c.removeAttribute("data-stash-sc"); }
                    });
                });
            });
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

    /* Ascension's own navbar wordmark glyph (the `plugin_hon__flame`
       flame). Injected as the lead glyph of the relocated rank read-out
       so it self-documents as "Ascension" without the literal word.
       Mirrors the plugin's `viewBox="0 0 512 512"` flame path verbatim,
       but fills it with a warm amber-to-red vertical gradient (paired
       with a glow in 13_plugins.css) so it reads as an actual flame, not
       a flat tier-coloured mark. The gradient def rides inside the SVG;
       its id is shared across every injected flame (all identical, so a
       `url(#)` reference resolving to the first is fine). */
    /* Four more glyphs in the front's own idiom: solid, currentColor, sized
       to the same 10px box as STAR/CAKE/PLAY so they sit on the pill's icon
       row without a second visual language. */
    var HEIGHT_SVG =
        '<svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor" aria-hidden="true">' +
        '<path d="M12 1.5l4.2 5.2h-3v10.6h3L12 22.5 7.8 17.3h3V6.7h-3L12 1.5z"/></svg>';
    var HOURGLASS_SVG =
        '<svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor" aria-hidden="true">' +
        '<path d="M5 2h14v2.2h-1.1c0 3-1.9 5.6-4.6 6.8v1.9c2.7 1.3 4.6 3.9 4.6 6.9H19V22H5v-2.2h1.1' +
        'c0-3 1.9-5.6 4.6-6.9v-1.9C8 9.8 6.1 7.2 6.1 4.2H5V2z"/></svg>';
    var TAPE_SVG =
        '<svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor" aria-hidden="true">' +
        '<path d="M3 4.5h18v3.4H3V4.5zm3.4 5.8h11.2v3.4H6.4v-3.4zM3 16.1h18v3.4H3v-3.4z"/></svg>';
    var WEIGHT_SVG =
        '<svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor" fill-rule="evenodd" aria-hidden="true">' +
        '<path d="M8.6 3h6.8l3.9 18H4.7L8.6 3zm3.4 3.1a2.1 2.1 0 100 4.2 2.1 2.1 0 000-4.2z"/></svg>';

    var ASCENSION_FLAME_SVG =
        '<svg class="refract-ascension-icon" viewBox="0 0 512 512" aria-hidden="true">' +
        '<defs><linearGradient id="refract-flame-grad" x1="0.5" y1="0" x2="0.5" y2="1">' +
        '<stop offset="0" stop-color="#ffd24a"/>' +
        '<stop offset="0.5" stop-color="#ff7a18"/>' +
        '<stop offset="1" stop-color="#e11d2a"/>' +
        '</linearGradient></defs>' +
        '<path fill="url(#refract-flame-grad)" d="M160.53 20.906c-22.075.207-39.973 9.138-54.218 23.782C89.507 61.962 78.3 87.6 ' +
        '74.876 115.624c-6.847 56.05 16.55 119.953 82.094 146.625l-7.032 17.313c-64.128-26.096-93.275' +
        '-84.757-94.782-141-17.36 10.866-27.608 27.05-32.343 46.437-5.728 23.448-2.727 51.54 7.906 ' +
        '77.844 21.264 52.61 71.37 96.856 138.436 87.594l2.563 18.53c-48.795 6.74-90.183-11.576-119.907' +
        '-41.03-8.152 16.216-7.504 32.264-.657 48.312 8.472 19.854 27.498 39.252 52.875 53.594 47.085 ' +
        '26.61 114.8 35.554 173.19 5.094-5.43-20.99-2.652-45.074 11.342-69.313 22.71-39.332 60.78-49.83 ' +
        '88.375-38.688 13.798 5.572 25.08 16.555 29.875 31.157 4.796 14.6 2.836 32.303-7.375 50.312-11.8 ' +
        '20.81-34.144 27.877-51.25 22.22-8.552-2.83-16.22-9.437-18.875-18.876-2.653-9.44-.142-20.366 ' +
        '7.063-31.313l15.594 10.282c-5.238 7.955-5.5 13.08-4.69 15.967.813 2.888 2.84 4.895 6.75 6.188 ' +
        '7.822 2.587 21.483-.152 29.158-13.688 8.188-14.44 8.82-26.183 5.843-35.25-2.976-9.066-9.846' +
        '-15.954-19.092-19.687-18.493-7.467-46.14-2.273-65.188 30.72-14.024 24.29-14.373 45.376-6.72 ' +
        '63.436l2.814 4.375c-.197.13-.397.25-.594.376.256.497.513 1.008.78 1.5 1.945 3.565 4.218 7.007 ' +
        '6.814 10.28.1.13.21.25.312.377.395.49.81.984 1.22 1.468 11.508 13.657 28.358 24.378 47.312 ' +
        '30.283 24.26 7.557 51.596 7.146 74.843-3.75 23.248-10.897 42.935-31.972 52.69-68.375 3.323' +
        '-12.406 5.08-23.776 5.5-34.313.01-.418.023-.832.03-1.25.087-5.1-.088-10.246-.563-15.406-.037' +
        '-.407-.084-.814-.125-1.22-.032-.27-.06-.544-.093-.813-3.295-25.79-15.823-46.16-34.345-64.437' +
        '-29.635-29.24-75.698-51.638-122.75-74.125-47.052-22.487-95.112-45.1-128.875-77.656-31.683' +
        '-30.553-49.926-71.185-40.313-124.814-.72-.01-1.444-.006-2.156 0z"/></svg>';

    function stripYearsOld() {
        document.querySelectorAll(".performer-card .performer-card__age").forEach(function (el) {
            el.textContent = el.textContent.replace(/\s*years?\s+old/gi, "").trim();
        });
    }

    /* Apply the Bronze→Perfect card-frame tier class (drives the playing-
       card name-banner glow + tiers-mode card frame) directly from a
       0–10 rating. tagFilledRatings normally does this, but it reads the
       native `.rating-banner` from the debounced runAll pass — and on
       performer cards Ascension deletes that banner (ratingBanner.replace
       With) on a 300ms timer, which beats the debounce on navigation and
       leaves the card untiered. initPerformerCards already parses the
       rating off the banner the instant the card is processed (the
       race-winning immediate observer), so applying the tier here makes
       it survive regardless of whether the banner lives long enough for
       tagFilledRatings to see it. Thresholds mirror tagFilledRatings. */
    /* Re-apply performer tier classes from the rating captured at init.

       Performer cards are tiered exactly once, inside initPerformerCards
       (`.performer-card:not([data-stash-pc])`), because the rating is read off
       the native banner that Ascension deletes moments later. Nothing re-reads
       it, so flipping the flourish used to leave performer cards on their old
       tier until a reload, while scene cards updated immediately from the
       observer tick. applyCardTier strips the old tier first, so this handles
       both directions. */
    function retagPerformerTiers() {
        document.querySelectorAll(".performer-card[data-refract-rating]").forEach(function (card) {
            var v = parseFloat(card.getAttribute("data-refract-rating"));
            if (isFinite(v) && v > 0) { applyCardTier(card, v); }
        });
    }

    function applyCardTier(card, v) {
        if (!card) { return; }
        ["bronze", "silver", "gold", "diamond", "legendary", "perfect"].forEach(function (t) {
            card.classList.remove("refract-card-tier-" + t);
        });
        var heavyMode = document.body.classList.contains("refract-flourish-tiers");
        if (heavyMode && v >= 5) {
            var tier = v >= 10  ? "perfect"
                     : v >= 9.5 ? "legendary"
                     : v >= 8.5 ? "diamond"
                     : v >= 7.5 ? "gold"
                     : v >= 6.5 ? "silver"
                     :            "bronze";
            card.classList.add("refract-card-tier-" + tier);
        }
    }

    /* Query-sourced front stats, batched. Every card that needs one queues
       here during initPerformerCards; one `findPerformers(performer_ids)`
       request per tick serves them all, instead of forty single fetches. */
    var refractFrontFillQueue = [];
    var refractFrontFillTimer = null;
    function refractQueueFrontFill(card, row, pid, keys, hadDomValue) {
        refractFrontFillQueue.push({ card: card, row: row, pid: pid, keys: keys, had: hadDomValue });
        if (refractFrontFillTimer) { return; }
        refractFrontFillTimer = setTimeout(refractFlushFrontFill, 30);
    }
    function refractFlushFrontFill() {
        refractFrontFillTimer = null;
        var batch = refractFrontFillQueue.splice(0);
        if (!batch.length) { return; }
        var ids = [];
        batch.forEach(function (b) { if (ids.indexOf(parseInt(b.pid, 10)) === -1) { ids.push(parseInt(b.pid, 10)); } });
        gqlWithVars(
            'query RefractFrontStats($ids: [Int!]) { findPerformers(performer_ids: $ids, filter: { per_page: -1 })' +
            ' { performers { id height_cm career_length measurements weight } } }',
            { ids: ids }
        ).then(function (res) {
            var list = (res && res.data && res.data.findPerformers && res.data.findPerformers.performers) || [];
            var byId = {};
            list.forEach(function (pf) { byId[String(pf.id)] = pf; });
            batch.forEach(function (b) {
                var pf = byId[String(b.pid)];
                var any = b.had;
                b.keys.forEach(function (k) {
                    var el = b.row.querySelector('[data-refract-stat="' + k + '"]');
                    if (!el) { return; }
                    var v = null;
                    if (pf) {
                        if (k === "height") { v = pf.height_cm ? (pf.height_cm + " cm") : null; }
                        else if (k === "career") { v = refractCareerLabel(pf.career_length); }
                        else if (k === "measure") { v = pf.measurements || null; }
                        else if (k === "weight") { v = pf.weight ? (pf.weight + " kg") : null; }
                    }
                    var valSpan = el.querySelector("span:not(.stash-perf-label)");
                    if (v != null) {
                        el.classList.remove("stash-perf-empty");
                        if (valSpan) { valSpan.textContent = v; }
                        any = true;
                    }
                });
                /* Nothing on the strip has a value after all: take it away, the
                   same rule the DOM-only path applies up front. */
                if (!any && b.row.parentNode) { b.row.parentNode.removeChild(b.row); }
                else if (b.card._rfxRefit) { b.card._rfxRefit(); }
            });
        }).catch(function () { /* the placeholders stay as dashes */ });
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

            /* Build all four stat pills (Rating, Age, O Count, Scenes) in
               a fixed order on EVERY card so the strip keeps the same
               shape regardless of which stats the performer has filled in.
               A pill with no value shows a "-" placeholder and gets the
               `stash-perf-empty` class (CSS dims it). If NONE of the four
               has a real value we skip the strip entirely (see anyStat) so
               an unrated/blank performer doesn't get a row of empty pills. */
            var anyStat = false;

            /* Rating badge — gated to playing-card mode via CSS. The number
               comes from the same parse path as tagFilledRatings (className
               > textContent). Real value only when v > 0; otherwise "-". */
            var ratingValue = null;
            var ratingTitle = "Rating";
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
                    /* Tier the card now, from the banner we just read —
                       before Ascension can delete it (see applyCardTier).
                       Keep the value: this is the ONLY moment the rating is
                       readable, and the tier has to be recomputable later
                       when the rating flourish is toggled (retagPerformerTiers). */
                    card.setAttribute("data-refract-rating", String(ratingNum));
                    applyCardTier(card, ratingNum);
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
                    ratingValue = String(displayRating);
                    ratingTitle = "Rating " + displayRating + (starsMode ? " / 5" : " / 10");
                }
            }
            var rEl = document.createElement("span");
            rEl.className = "stash-perf-rating" + (ratingValue == null ? " stash-perf-empty" : "");
            rEl.title = ratingTitle;
            rEl.innerHTML = STAR_SVG +
                '<span class="stash-perf-label">Rating</span>' +
                "<span>" + (ratingValue == null ? "-" : escapeHtml(ratingValue)) + "</span>";
            row.appendChild(rEl);
            if (ratingValue != null) { anyStat = true; }

            /* Age — adds a cake icon + "Age" label so the bare number
               (e.g. "27") isn't ambiguous in the playing-card stats
               strip. The icon and label are CSS-hidden in Minimal /
               Extravagant modes so those modes keep the compact
               icon-less "27" rendering they had before. */
            var ageValue = null;
            var ageAtProduction = false;
            if (ageEl) {
                var ageText = ageEl.textContent.replace(/\s*years?\s+old/gi, "").trim();
                /* Stash appends " at production" when the scene has a
                   date and the performer's age is being shown relative
                   to that date. Move the qualifier into the chip label
                   so the value stays a clean bare number. */
                ageAtProduction = /\s*at\s+production\s*$/i.test(ageText);
                if (ageAtProduction) {
                    ageText = ageText.replace(/\s*at\s+production\s*$/i, "").trim();
                }
                if (ageText) { ageValue = ageText; }
                ageEl.style.display = "none";
            }
            var ageSpan = document.createElement("span");
            ageSpan.className = "stash-perf-age" + (ageValue == null ? " stash-perf-empty" : "");
            if (ageValue != null && ageAtProduction) {
                ageSpan.title = "Age at production";
            }
            ageSpan.innerHTML = CAKE_SVG +
                '<span class="stash-perf-label">Age' +
                    ((ageValue != null && ageAtProduction) ? '<span class="stash-perf-label-mark">*</span>' : '') +
                '</span>' +
                "<span>" + (ageValue == null ? "-" : escapeHtml(ageValue)) + "</span>";
            row.appendChild(ageSpan);
            if (ageValue != null) { anyStat = true; }

            /* O count — Stash renders it as a two-button group:
                 .count-button > [button title="O Count"] + [button.count-value > span]
               Find the title="O Count" button, walk to its parent group,
               read the .count-value span. Real value only when non-zero. */
            var oValue = null;
            var oTitleBtn = popovers ? popovers.querySelector('button[title="O Count"]') : null;
            if (oTitleBtn) {
                var oGroup = oTitleBtn.closest(".count-button");
                var oValueSpan = oGroup ? oGroup.querySelector(".count-value span") : null;
                var oText = oValueSpan ? oValueSpan.textContent.trim() : "";
                if (oText && oText !== "0") { oValue = oText; }
            }
            var oEl = document.createElement("span");
            oEl.className = "stash-perf-ocount" + (oValue == null ? " stash-perf-empty" : "");
            if (oValue != null) { oEl.title = oValue + " O"; }
            oEl.innerHTML = O_ICON_SVG +
                '<span class="stash-perf-label">O Count</span>' +
                "<span>" + (oValue == null ? "-" : escapeHtml(oValue)) + "</span>";
            row.appendChild(oEl);
            if (oValue != null) { anyStat = true; }

            /* Scene count — wrap the number in an inner <span> for the
               same reason as age (lets playing-card mode target an inner
               element for gradient text-clip without clipping the chip).
               Real value only when non-zero; the pill is a live link only
               when it has scenes to point at. */
            var sceneValue = null;
            var sceneHref = null;
            if (sceneLink) {
                var countEl = sceneLink.querySelector("span");
                var countText = countEl ? countEl.textContent.trim() : "";
                if (countText && countText !== "0") { sceneValue = countText; }
                sceneHref = sceneLink.getAttribute("href");
            }
            var scenesA = document.createElement("a");
            scenesA.className = "stash-perf-scenes" + (sceneValue == null ? " stash-perf-empty" : "");
            if (sceneValue != null) {
                if (sceneHref) { scenesA.href = sceneHref; }
                scenesA.addEventListener("click", stopProp);
            }
            scenesA.innerHTML = PLAY_SVG +
                '<span class="stash-perf-label">Scenes</span>' +
                "<span>" + (sceneValue == null ? "-" : escapeHtml(sceneValue)) + "</span>";
            row.appendChild(scenesA);
            if (sceneValue != null) { anyStat = true; }

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

            /* The four DOM-sourced pills above are built on every card in a
               fixed order. In the Refract layout the SLOT LIST now decides
               which of them survive, in what order, and which query-sourced
               pills join them. Classic keeps the historic four: its pill
               styling is bespoke per class and knows nothing of the others. */
            var layoutCard = document.body.classList.contains("refract-perf-layout-card");
            var frontSlots = layoutCard ? frontPillsPref() : FRONT_PILLS_DEFAULT.slice();
            var built = { rating: rEl, age: ageSpan, o: oEl, scenes: scenesA };
            var wantsQuery = [];
            if (layoutCard) {
                Object.keys(built).forEach(function (k) {
                    if (frontSlots.indexOf(k) === -1 && built[k].parentNode) {
                        built[k].parentNode.removeChild(built[k]);
                    }
                });
                frontSlots.forEach(function (k, i) {
                    var d = frontStatDef(k);
                    if (!d) { return; }
                    var el = built[k];
                    if (!el) {
                        /* A query-sourced pill: built empty in the front's own
                           markup shape, filled once the batch returns. */
                        el = document.createElement("span");
                        el.className = frontPillClass(k) + " stash-perf-empty";
                        el.setAttribute("data-refract-stat", k);
                        el.innerHTML = frontStatIcon(d.icon) +
                            '<span class="stash-perf-label">' + escapeHtml(d.label) + '</span>' +
                            "<span>-</span>";
                        row.appendChild(el);
                        wantsQuery.push(k);
                    }
                    /* Inline `order` beats the class order rules, so the slot
                       list is the order you see. */
                    el.style.order = String(i);
                });
            }
            /* The strip is shown if any pill has a value, or if a query pill
               may still get one; the batch fill removes it again if not. */
            if (anyStat || wantsQuery.length) {
                section.appendChild(row);
            }
            if (wantsQuery.length) {
                var link0 = card.querySelector('a[href*="/performers/"]');
                var pm = link0 && (link0.getAttribute("href") || "").match(/\/performers\/(\d+)/);
                if (pm) { refractQueueFrontFill(card, row, pm[1], wantsQuery, anyStat); }
            }

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
            /* Exposed so the batched stat fill can re-fit once values land. */
            card._rfxRefit = function () { refit(); };
            function refit() {
                if (refitPending) { return; }
                refitPending = true;
                requestAnimationFrame(function () {
                    refitPending = false;
                    if (!document.body.classList.contains("refract-perf-layout-card")) { return; }
                    /* Stat strip — high scene counts (3 digits) push chips
                       off the right edge, so shrink to fit.

                       DISCRETE steps, matching refractFitBackStats and the
                       rule it states: a system has a few sizes, it does not
                       compute one per instance. The continuous ratio this
                       replaces fitted every card exactly and so emitted a
                       different real number for each one -- measured across
                       one screen of 40 identical 250.16px cards: 22 distinct
                       pill font sizes (12.10 to 13.51px), 20 label sizes and
                       22 pill heights, with six chip rows in a single grid
                       row landing on five different baselines.

                       The ladder was tried before and reverted because an
                       overshoot "got spread into a big random gap between the
                       chips". That was a misdiagnosis: an evenly shared
                       surplus is not random. `.stash-perf-age` was carrying
                       `margin-right: auto` leaked in from the non-playing-card
                       layout, which in a space-between row collects ALL the
                       slack at one position. 16_playing_card.css now resets
                       those margins, so a step's surplus distributes evenly
                       and the ladder is usable again. */
                    row.style.setProperty("--pc-badge-scale", 1);
                    var pcAvail = row.clientWidth;
                    if (pcAvail > 0 && row.scrollWidth > pcAvail + 1) {
                        var PC_STEPS = [1, 0.85, 0.7, 0.55, 0.45];
                        for (var pi = 0; pi < PC_STEPS.length; pi++) {
                            row.style.setProperty("--pc-badge-scale", PC_STEPS[pi]);
                            if (row.scrollWidth <= pcAvail + 1) { break; }
                        }
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
                    /* Name lives in an inner span so the Ascension rank
                       read-out can sit on the SAME line, pushed to the
                       right edge, while the name still ellipsis-truncates
                       if it's long (see integrateAscensionBadges). */
                    var countryNameSpan = document.createElement("span");
                    countryNameSpan.className = "stash-perf-country-name";
                    countryNameSpan.textContent = countryName;
                    countryWrap.appendChild(countryNameSpan);
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

    /* Heart effect for favourited cards. Builds ONE .refract-heart-
       particles layer holding TWO sub-layers; CSS shows whichever fits
       the current mode (so toggling lite at runtime switches instantly
       with no rebuild):
         • .refract-heart-float-layer — an animated vignette ring of live
           hearts that twinkle (staggered opacity + scale pulse), full
           mode. Transform + opacity animation only.
         • .refract-heart-halo-layer — a static photographic-vignette ring
           of hearts (lite mode + reduced motion): one of five baked SVGs
           (crowding the corners, thinning inward, centre clear) applied as
           a background-image. One node + one cached blit per card. Zero
           per-frame cost.
       Shared by the scene-card (tag-driven) and performer-card (native-
       favourite) injectors. */
    function refractBuildHearts() {
        var particles = document.createElement("div");
        particles.className = "refract-heart-particles";
        particles.setAttribute("aria-hidden", "true");

        /* ── Full-mode layer — an ANIMATED vignette ring. Same edge-
           crowding distribution as the lite halo, but built as live spans
           so each heart can twinkle (a staggered opacity + scale pulse)
           for a shimmering halo. Full mode only; lite swaps to the static
           baked SVG below. transform + opacity only, so the animation is
           GPU-composited. */
        var floatLayer = document.createElement("div");
        floatLayer.className = "refract-heart-float-layer";

        var COUNT = 28;     /* hearts in the ring */
        var BAND  = 0.30;   /* how far inward (0..0.5) the ring reaches */
        var GLYPHS = ["♥", "♥", "♥", "♥", "♡"];
        var PALETTE = ["255, 74, 130", "255, 102, 150", "255, 130, 170"];
        var placed = 0, guard = 0, maxGuard = COUNT * 50;
        while (placed < COUNT && guard < maxGuard) {
            guard++;
            var x = Math.random();
            var y = Math.random();
            var edge = Math.min(x, 1 - x, y, 1 - y);    /* 0 at rim .. 0.5 centre */
            var t = edge / BAND;
            if (t >= 1) { continue; }                    /* central void */
            if (Math.random() > Math.pow(1 - t, 1.7)) { continue; } /* vignette falloff */
            var depth = 1 - t;                           /* 1 at rim .. 0 inward */

            var color = PALETTE[(Math.random() * PALETTE.length) | 0];
            var size  = (9 + depth * 16).toFixed(1);     /* 9 .. 25px */
            var op    = (0.4 + depth * 0.55).toFixed(2); /* 0.40 .. 0.95 peak */
            var rot   = ((Math.random() * 46) - 23).toFixed(1);
            var glow  = (3 + depth * 9).toFixed(1);
            var dur   = (2.4 + Math.random() * 2.8).toFixed(2); /* 2.4 .. 5.2s */
            var dl    = (Math.random() * 3.5).toFixed(2);       /* 0 .. 3.5s stagger */

            var fh = document.createElement("span");
            fh.className = "refract-heart-twinkle";
            fh.textContent = GLYPHS[(Math.random() * GLYPHS.length) | 0];
            fh.style.cssText =
                "left:" + (x * 100).toFixed(2) + "%;" +
                "top:" + (y * 100).toFixed(2) + "%;" +
                "font-size:" + size + "px;" +
                "color:rgba(" + color + ",1);" +
                "text-shadow:0 0 " + glow + "px rgba(" + color + ",0.5);" +
                "--op:" + op + ";" +
                "--rot:" + rot + "deg;" +
                "--dur:" + dur + "s;" +
                "--dl:" + dl + "s;";
            floatLayer.appendChild(fh);
            placed++;
        }
        particles.appendChild(floatLayer);

        /* ── Halo layer (lite mode / reduced motion) — static vignette. ──
           The ring of hearts is a baked SVG (img/heart-halo-N.svg) applied
           as a background-image in CSS, NOT ~36 live spans. One node per
           card instead of 36 keeps style-recalc cheap on big favourite
           grids, and the whole ring paints as a single cached blit. Pick
           one of five pre-rendered variants at random so the cards don't
           all share the exact same pattern (the variants are generated
           from this same vignette distribution; see img/heart-halo-*.svg).
           The rose rim-glow is baked into each SVG too, so no extra CSS. */
        var halo = document.createElement("div");
        var variant = 1 + ((Math.random() * 5) | 0);
        halo.className = "refract-heart-halo-layer refract-heart-halo-v" + variant;
        particles.appendChild(halo);

        return particles;
    }

    /* Heart-halo sync for favourited PERFORMER cards — only in playing-
       card rating-style mode. The source of "is this favourited?" is the
       native Stash `.favorite-button.favorite` class rather than a tag
       lookup, so we re-sync on every mutation cycle (Stash toggles the
       class reactively when the user clicks the heart). */
    function syncPerformerCardHearts() {
        var inPlayingCard = document.body.classList.contains("refract-perf-layout-card");
        document.querySelectorAll(".performer-card").forEach(function (card) {
            var isFav = !!card.querySelector(".favorite-button.favorite");
            var existing = card.querySelector(":scope > .refract-heart-particles");
            if (inPlayingCard && isFav) {
                card.classList.add("refract-favourite");
                if (!existing) {
                    card.appendChild(refractBuildHearts());
                }
            } else {
                card.classList.remove("refract-favourite");
                if (existing) { existing.remove(); }
            }
        });
    }

    /* ── Ascension (Sakoto's HotorNot fork) compatibility ─────────────
       Ascension swaps a performer card's native .rating-banner for its
       own `.hon-battle-rank-badge.hon-battle-rank-badge-compact`. The
       badge inherits none of the banner's layout, so it lands wherever
       the banner sat in the DOM and overlaps Refract's injected
       `.stash-perf-stats` pill row (the user-reported clash). Relocate
       it to ride the SAME LINE as the chin's `.stash-perf-country`
       caption, pinned to the RIGHT edge of the card (append it inside
       that span, which CSS turns into a space-between row), so it reads
       as a quiet trailing rank read-out opposite the nationality rather
       than a chip that fights the stat pills. We also prepend Ascension's
       own navbar flame glyph as the badge's lead icon (replacing the
       literal "ASCENSION" wordmark CSS used before) and colour it to
       match the rank number, so the read-out is "<country> ... [flame] N".
       13_plugins.css strips the plugin's capsule chrome and renders it as
       subtle inline text. Tag it `.refract-ascension-badge` for that CSS,
       and flag the body so other rules can detect Ascension.

       The country caption only renders in playing-card mode (CSS-hidden
       elsewhere), so we only nest into it there. Falls back to the chin
       just above the stat pills when there's no visible country caption
       (performer without a country, or a non-playing-card mode).
       Idempotent: only moves a badge that isn't already parked, and only
       injects the flame once, so Ascension's debounced re-injection and
       React re-renders don't cause churn. Runs from watchForReinjection
       (which disconnects before mutating), so our move doesn't re-fire
       the observer. Inert on installs without Ascension; the selector
       matches no DOM. */
    function integrateAscensionBadges() {
        var badges = document.querySelectorAll(".performer-card .hon-battle-rank-badge");
        if (badges.length) {
            document.body.classList.add("refract-has-ascension");
        }
        /* Only playing-card mode shows the `.stash-perf-country` caption;
           in other rating styles it's CSS-hidden, so nesting the rank
           into it would hide it too, so fall back to the chin there. */
        var pcMode = document.body.classList.contains("refract-perf-layout-card");
        badges.forEach(function (badge) {
            badge.classList.add("refract-ascension-badge");
            /* Ascension renders "undefinedW/L/D" when a performer has no
               recorded record yet, so sanitise so the line reads cleanly.
               Re-runs each cycle, so it self-heals if Ascension rebuilds
               the badge. */
            badge.querySelectorAll(".hon-wins, .hon-losses, .hon-draws").forEach(function (s) {
                if (/undefined/i.test(s.textContent)) {
                    s.textContent = s.textContent.replace(/undefined/gi, "0");
                }
            });
            /* Drop both the literal "Rank " word and the "#" so the
               read-out is a bare number after the flame glyph. Only write
               when it actually changes, to avoid needless mutations. */
            var rankText = badge.querySelector(".hon-rank-text");
            if (rankText) {
                var stripped = rankText.textContent
                    .replace(/^\s*rank\s*/i, "")
                    .replace(/^\s*#\s*/, "");
                if (stripped !== rankText.textContent) {
                    rankText.textContent = stripped;
                }
            }
            /* Lead the read-out with Ascension's own navbar flame glyph
               (once per badge instance). Sits before the plugin's tier
               emoji, which CSS hides, so the line reads "[flame] N". The
               glyph carries its own warm gradient fill, so no per-card
               colour wiring is needed. */
            if (!badge.querySelector(".refract-ascension-icon")) {
                badge.insertAdjacentHTML("afterbegin", ASCENSION_FLAME_SVG);
            }
            var card = badge.closest(".performer-card");
            if (!card) { return; }
            var section = card.querySelector(".card-section");
            /* Playing-card mode: ride the country caption's line, pushed to
               the RIGHT edge of the card. The marker class turns the caption
               into a space-between flex row (name left, rank right), and we
               append the badge as its last child. */
            /* A country the user has HIDDEN is no host: the badge would die
               with it, its visibility a side effect of an unrelated chip. */
            var country = (pcMode && section && !document.body.classList.contains("refract-pc-hide-country"))
                ? section.querySelector(":scope > .stash-perf-country")
                : null;
            if (country) {
                country.classList.add("refract-country-with-rank");
                if (badge.parentElement === country && country.lastElementChild === badge) {
                    return;
                }
                country.appendChild(badge);
                return;
            }
            /* Fallback (no country caption / non-playing-card): sit on the
               NAME's line, at the right edge.

               It stays a CHILD OF THE CHIN and is positioned there by CSS
               rather than being appended into the name element, for two
               reasons: the chin is a flex COLUMN, so any in-flow child costs a
               whole extra line and makes the chin taller; and the name is
               wrapped in an <a> to the performer, so nesting the rank inside
               it would swallow the rank's own click target. */
            if (!section) { return; }
            section.classList.add("refract-chin-with-rank");
            if (badge.parentElement === section && badge === section.lastElementChild) {
                return;
            }
            section.appendChild(badge);
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

        /* Scene Duplicate Checker has its own dedicated pager treatment
           (data-refract-pager rows tagged by enhanceDuplicateChecker +
           styling in 08_misc_mid.css) — skip it here so the two systems
           don't fight over the same elements. */
        if (document.querySelector("#scene-duplicate-checker")) {
            return;
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

    /* ── Page-jump popover: dismiss on scroll ──────────────────────────
       The "jump to page" popover (#select_page_popover) is Popper-positioned
       and portaled to <body>, while the floating pager it springs from is
       position:fixed. On scroll the fixed bar is composited smoothly, but
       Popper recomputes the popover's document coords a frame late, so the
       pill visibly stutters as it chases the bar. It's a transient type-a-page
       input, so the clean fix is to just close it on scroll (clicking the
       trigger toggles it shut) — nothing left to stutter. Bound once. */
    var refractPageJumpDismissBound = false;
    function bindPageJumpScrollDismiss() {
        if (refractPageJumpDismissBound) { return; }
        refractPageJumpDismissBound = true;
        window.addEventListener("scroll", function () {
            /* The overlay only exists in the DOM while open, so this is a
               cheap no-op the rest of the time. */
            if (!document.getElementById("select_page_popover")) { return; }
            var trigger = document.querySelector("button.page-count");
            if (trigger) { trigger.click(); }
        }, { passive: true, capture: true });
    }
    bindPageJumpScrollDismiss();

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

    /* ── Details Tags Overhaul plugin: collapse panel by default ──────
       The kmv details-tags-overhaul plugin renders its panel with
       `.is-open` already on the section root, so the tag groups are
       visible by default. Refract paired CSS hides everything below
       the panel header when `.is-open` is absent — here we strip it
       once on first render so the panel starts collapsed. A marker on
       the section keeps us from re-stripping after the user opens it
       manually (the plugin's own JS owns toggle behavior). */
    function collapseDetailsTagsOverhaul() {
        document.querySelectorAll("#kmv-details-tags-overhaul.details-tags-overhaul.is-open").forEach(function (el) {
            if (el.dataset.stRefractCollapsedOnce) { return; }
            el.classList.remove("is-open");
            el.dataset.stRefractCollapsedOnce = "1";
        });
    }

    /* ── Hold-to-decrement on every O-count button ─────────────────────
       Stash's O counter increments on click. Add a long-press behavior:
       holding for 500ms fires the matching {scene,image}DecrementO mutation
       and suppresses the following click (which would otherwise increment).
       The count text is updated in place from the mutation response.

       Targets two wrapper variants Stash uses:
         .count-button (scene detail toolbar + scene-card popovers)
           — two buttons inside: .count-icon[title="O Count"] + .count-value
         .o-counter (image detail toolbar + Lightbox-footer + image-card popovers)
           — single button title="O Count" with count as last inner span

       Entity ID is resolved from context:
         • scene/image detail toolbar → URL match
         • Lightbox → current image src
         • scene/image card popovers → href on the card link
         • performer cards → SKIPPED (no performerDecrementO mutation;
           the O count there is an aggregate display) */
    function setupOCounterLongPress(root) {
        var r = root || document;
        r.querySelectorAll(".count-button, .o-counter").forEach(function (wrapper) {
            if (wrapper.dataset.refractOLongPress === "1") { return; }
            /* Sanity: only attach to wrappers that actually contain an O button. */
            if (!wrapper.querySelector('button[title="O Count"]')) { return; }
            var ctx = detectOEntityContext(wrapper);
            if (!ctx) { return; }
            wrapper.dataset.refractOLongPress = "1";

            var HOLD_MS = 500;
            var timer = null;
            var longPressed = false;

            function setCount(n) {
                /* .count-button: count text lives in .count-value > span */
                var cv = wrapper.querySelector(".count-value span");
                if (cv) { cv.textContent = String(n); return; }
                /* .o-counter: count is the last <span> child of the O Count button */
                var titleBtn = wrapper.querySelector('button[title="O Count"]');
                if (titleBtn) {
                    var spans = titleBtn.querySelectorAll(":scope > span");
                    var span = spans[spans.length - 1];
                    if (span) { span.textContent = String(n); }
                }
            }

            function decrement() {
                var mutation = ctx.type === "scene"
                    ? "mutation Dec($id: ID!) { sceneDecrementO(id: $id) }"
                    : "mutation Dec($id: ID!) { imageDecrementO(id: $id) }";
                var field = ctx.type === "scene" ? "sceneDecrementO" : "imageDecrementO";
                gqlWithVars(mutation, { id: ctx.id }).then(function (resp) {
                    if (resp && resp.data && typeof resp.data[field] === "number") {
                        setCount(resp.data[field]);
                    }
                }).catch(function () { /* ignore */ });
            }

            function cancelTimer() {
                if (timer !== null) { clearTimeout(timer); timer = null; }
            }

            wrapper.addEventListener("pointerdown", function (e) {
                if (e.button !== 0) { return; }
                /* Only react to pointerdowns on an actual button — clicking
                   the wrapper border/padding shouldn't fire. */
                if (!e.target.closest("button")) { return; }
                longPressed = false;
                cancelTimer();
                timer = setTimeout(function () {
                    timer = null;
                    longPressed = true;
                    decrement();
                    /* Tiny flash so the user sees the long-press registered. */
                    wrapper.classList.add("refract-o-decremented");
                    setTimeout(function () {
                        wrapper.classList.remove("refract-o-decremented");
                    }, 280);
                }, HOLD_MS);
            });
            wrapper.addEventListener("pointerup", cancelTimer);
            wrapper.addEventListener("pointerleave", cancelTimer);
            wrapper.addEventListener("pointercancel", cancelTimer);

            /* Capture-phase click suppression — fires before Stash's own
               click handler. Reset the flag after suppressing so the next
               normal click still increments. */
            wrapper.addEventListener("click", function (e) {
                if (longPressed) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    longPressed = false;
                }
            }, true);
        });
    }

    function detectOEntityContext(el) {
        var path = location.pathname;

        /* 1. Detail-page toolbars: entity ID comes from the URL. */
        if (el.closest(".scene-toolbar")) {
            var sm = path.match(/\/scenes\/(\d+)/);
            if (sm) { return { type: "scene", id: sm[1] }; }
        }
        if (el.closest(".image-toolbar")) {
            var im = path.match(/\/images\/(\d+)/);
            if (im) { return { type: "image", id: im[1] }; }
        }

        /* 2. Lightbox — pull the ID out of the currently-visible image src. */
        var lb = el.closest(".Lightbox") || (el.closest(".Lightbox-footer") && document.querySelector(".Lightbox"));
        if (lb) {
            var imgEl = lb.querySelector('img[src*="/image/"]');
            if (imgEl) {
                var lm = (imgEl.getAttribute("src") || "").match(/\/image\/(\d+)/);
                if (lm) { return { type: "image", id: lm[1] }; }
            }
        }

        /* 3. Card popovers — find the card type and pull the ID from its link.
              Skip performer cards entirely: the O count there is an aggregate
              across all the performer's scenes, not a single entity. */
        var performerCard = el.closest(".performer-card");
        var sceneCard = el.closest(".scene-card, .gallery-card");
        var imageCard = el.closest(".image-card");
        if (performerCard && !sceneCard && !imageCard) { return null; }
        if (sceneCard) {
            var sl = sceneCard.querySelector('a[href*="/scenes/"]');
            if (sl) {
                var slm = (sl.getAttribute("href") || "").match(/\/scenes\/(\d+)/);
                if (slm) { return { type: "scene", id: slm[1] }; }
            }
        }
        if (imageCard) {
            var il = imageCard.querySelector('a[href*="/images/"]');
            if (il) {
                var ilm = (il.getAttribute("href") || "").match(/\/images\/(\d+)/);
                if (ilm) { return { type: "image", id: ilm[1] }; }
            }
        }

        return null;
    }

    /* ── Filter toolbar: mark container + hide zoom slider ─────────── */

    function initFilterBar() {
        /* Find search input; if already inside a marked container, skip. */
        var search = document.querySelector('input[placeholder*="Search"]:not([data-fb-done])');
        if (!search) { return; }
        search.setAttribute("data-fb-done", "1");

        /* Don't tag modal dialogs (internal UI), the sidebar filter panel
           (search input + lots of filter-section buttons → false positive),
           or forms (third-party plugins like edit-tags-overhaul inject a
           "Search tags…" input inside the scene edit form; the form column
           has plenty of buttons, so it'd otherwise get tagged as a toolbar
           and inherit all the filter-bar styling). */
        if (search.closest && search.closest('.modal, .modal-dialog, .modal-content, .sidebar, form, .edit-tags-overhaul, #tag-manager-host, .tag-manager')) { return; }

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
            /* View-mode buttons: pick the btn-group with the most direct .btn
               children that isn't a structural wrapper (contains no child btn-group)
               and isn't a dropdown (no dropdown-toggle child). Threshold ≥ 2 so
               pages with only two view modes (images, groups, etc.) are handled.
               Using direct children avoids counting nested groups' buttons, which
               previously caused the saved-filters btn-group wrapper to be selected
               on pages where the view-mode group has fewer than 3 buttons. */
            var allGroups = Array.from(container.querySelectorAll(".btn-group"));
            var group = null;
            var maxBtns = 0;
            allGroups.forEach(function (g) {
                var children = Array.from(g.children);
                /* Skip wrappers that directly contain other btn-groups */
                if (children.some(function (c) { return c.classList.contains("btn-group"); })) { return; }
                var directBtns = children.filter(function (c) { return c.classList.contains("btn"); });
                /* Skip dropdown groups (saved filters, sort, etc.) */
                if (directBtns.some(function (b) { return b.classList.contains("dropdown-toggle"); })) { return; }
                var n = directBtns.length;
                if (n >= 2 && n >= maxBtns) { group = g; maxBtns = n; }
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
                /* Self-clean: if slick remounted and this slider was
                   detached by React, stop observing the dead subtree so
                   the observer + its closures can be collected (the
                   data-stash-slick marker means the fresh slider gets its
                   own observer; this one would otherwise fire forever
                   against detached nodes). */
                if (!slider.isConnected) {
                    if (slideObserver) { slideObserver.disconnect(); }
                    return;
                }
                var total = countRealSlides();
                if (total <= 1) { fill.style.width = "100%"; return; }
                var pct = (currentIndex() / (total - 1)) * 100;
                fill.style.width = Math.min(Math.max(pct, 2), 100) + "%";
            }

            updateBar();

            /* Off-Chromium only: drop in-card glass blur while the row is mid-
               slide. Slick moves via a transform: translate3d() transition on
               .slick-track (not native scroll). On Gecko/WebKit, re-rastering
               the blurred card pills every frame as the track translates janks
               the slide. We tag the slider .refract-slick-animating for the
               transition window; the scoped `*` strip in 17_scroll_perf.css
               kills blur within just this one carousel subtree (toggled once
               per slide, not per frame), and it restores on settle, masked by
               the slide motion. Chromium composites this smoothly already, so
               the class is never added there. */
            var animTimer = null;
            function markAnimating() {
                if (IS_CHROMIUM) { return; }
                slider.classList.add("refract-slick-animating");
                clearTimeout(animTimer);
                animTimer = setTimeout(function () {
                    slider.classList.remove("refract-slick-animating");
                }, 560); /* slick default speed 500ms + settle margin */
            }

            /* Watch for slick moving by observing class changes on slides */
            var slideObserver = new MutationObserver(function () {
                updateBar();
                markAnimating();
            });
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

    /* ── Active-task poll: spin the navbar cog while tasks run ──────
       Polls jobQueue every 4s, toggles `refract-tasks-running` on
       <body> when any job is in a non-terminal state. CSS in
       02_navbar.css picks up that class and rotates the settings
       cog SVG. Pauses while the tab is hidden to avoid background
       traffic, refreshes immediately on tab-visible so the spinner
       state isn't stale by up to one interval. */
    function refractActiveTaskPoll() {
        function check() {
            if (document.hidden) { return; }
            gql('query { jobQueue { id status } }')
                .then(function (res) {
                    var jobs = (res && res.data && res.data.jobQueue) || [];
                    var active = jobs.some(function (j) {
                        return j && (j.status === "READY" || j.status === "RUNNING" || j.status === "STOPPING");
                    });
                    document.body.classList.toggle("refract-tasks-running", active);
                })
                .catch(function () { /* Stash restarting or offline — leave class as-is */ });
        }
        check();
        setInterval(check, 4000);
        document.addEventListener("visibilitychange", function () {
            if (!document.hidden) { check(); }
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
                injectMobileNewButton();
                injectBurgerScrim();
                injectToolbarDropdownScrim();
                injectMobileDrawer();
                injectMobileDock();
                refractApplyNavIcons();
                refractAppendPluginDrawerTiles();
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
        injectMobileNewButton();
        injectBurgerScrim();
        injectToolbarDropdownScrim();
        injectMobileDrawer();
        injectMobileDock();
        refractApplyNavIcons();
        refractAppendPluginDrawerTiles();
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
        refractActiveTaskPoll();
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
        /* Unit prefix is optional so a plain-bytes value like "512 B" parses
           as 512 rather than 0 — a 0 would corrupt group totals, the
           "largest" winner pick, and the reclaim estimate. */
        var m = (text || "").match(/([\d.]+)\s*([KMGT]?)i?B/i);
        if (!m) { return 0; }
        var u = m[2].toUpperCase();
        var mult = { "": 1, K: 1024, M: 1048576, G: 1073741824, T: 1099511627776 }[u] || 1;
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
        /* Identify Delete vs Merge by their label (title / aria-label /
           text), NOT by column position. A positional [0]=delete/[1]=merge
           mapping silently fires the WRONG action — merging scenes the user
           meant to delete — if Stash ever reorders the action column or adds
           another .edit-button. Fall back to positional only when no label
           disambiguates (preserves behavior on unlabelled buttons). */
        function dupBtnLabel(b) {
            return ((b.getAttribute("aria-label") || "") + " " +
                    (b.getAttribute("title") || "") + " " +
                    (b.textContent || "")).toLowerCase();
        }
        var dupDeleteBtn = null, dupMergeBtn = null;
        for (var ab = 0; ab < actionButtons.length; ab++) {
            var lbl = dupBtnLabel(actionButtons[ab]);
            if (!dupDeleteBtn && lbl.indexOf("delete") !== -1) { dupDeleteBtn = actionButtons[ab]; }
            else if (!dupMergeBtn && lbl.indexOf("merge") !== -1) { dupMergeBtn = actionButtons[ab]; }
        }
        if (!dupDeleteBtn && !dupMergeBtn) {
            dupDeleteBtn = actionButtons[0] || null;
            dupMergeBtn = actionButtons[1] || null;
        }
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
            deleteBtn: dupDeleteBtn,
            mergeBtn: dupMergeBtn
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
        var pagerH6s = dc.querySelectorAll('[data-refract-pager] > h6');
        pagerH6s.forEach(function (pagerH6) {
            var numMatch = (pagerH6.textContent || "").match(/[\d,]+/);
            if (numMatch) {
                var want = '<b>' + numMatch[0] + '</b> duplicates';
                if (pagerH6.innerHTML.trim() !== want) {
                    pagerH6.innerHTML = want;
                }
            }
        });

        /* Page-size selector → injected into the filter form (alongside
           Search Accuracy etc.) rather than the stats bar. The native
           <select> is React-controlled, so inject a proxy styled like the
           form's other selects (which gives it the themed dropdown chevron)
           and forward changes to the live select via the native value setter
           + a dispatched change event React listens for. Idempotent. */
        var dupForm = dc.querySelector(":scope > form");
        var dupNativeSel = dc.querySelector('[data-refract-pager] select');
        if (dupForm && dupNativeSel && dupNativeSel.options && dupNativeSel.options.length) {
            var psProxy = dupForm.querySelector(".refract-dup-pagesize");
            if (!psProxy) {
                var psGroup = document.createElement("div");
                psGroup.className = "form-group refract-dup-pagesize-group";
                var psRow = document.createElement("div");
                psRow.className = "row no-gutters";
                var psLabel = document.createElement("label");
                psLabel.className = "form-label";
                psLabel.textContent = "Per Page";
                var psCol = document.createElement("div");
                psCol.className = "col-auto";
                psProxy = document.createElement("select");
                psProxy.className = "input-control form-control refract-dup-pagesize";
                psProxy.title = "Scenes per page";
                psProxy.addEventListener("change", function () {
                    var live = dc.querySelector('[data-refract-pager] select');
                    if (!live) { return; }
                    var setter = Object.getOwnPropertyDescriptor(
                        window.HTMLSelectElement.prototype, "value"
                    ).set;
                    setter.call(live, this.value);
                    live.dispatchEvent(new Event("change", { bubbles: true }));
                });
                psCol.appendChild(psProxy);
                psRow.appendChild(psLabel);
                psRow.appendChild(psCol);
                psGroup.appendChild(psRow);
                dupForm.appendChild(psGroup);
            }
            /* (Re)sync options + current value from the live native select. */
            if (psProxy.options.length !== dupNativeSel.options.length) {
                psProxy.innerHTML = "";
                for (var psi = 0; psi < dupNativeSel.options.length; psi++) {
                    var psO = dupNativeSel.options[psi];
                    var psOp = document.createElement("option");
                    psOp.value = psO.value;
                    psOp.textContent = psO.textContent;
                    psProxy.appendChild(psOp);
                }
            }
            if (psProxy.value !== dupNativeSel.value) { psProxy.value = dupNativeSel.value; }
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
            /* Total-duplicates count: read from the (already trimmed) React
               pager h6 — it's the page-independent total, which refract's
               per-page group math can't reproduce. */
            var topH6 = dc.querySelector('[data-refract-pager] > h6');
            var countMatch = topH6 ? (topH6.textContent || "").match(/[\d,]+/) : null;
            var countHTML = countMatch
                ? '<span class="refract-dup-summary__count"><b>' + escapeHtml(countMatch[0]) + '</b> duplicates</span>'
                : '';
            summary.innerHTML =
                countHTML +
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

    /* Scene-card tag-count popup, portaled to body (same fix as the
       performer-name tooltip): the inline `.stash-tag-popup` is clipped by
       the card's overflow:hidden, so on hover we clone its chips into a
       body-level element positioned via getBoundingClientRect(). */
    var refractTagPopupEl = null;
    var refractTagPopupTimer = null;

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
        /* Card mode (Suggestion Box opt-in): show the performer image +
           name instead of a plain text label. */
        var cardMode = document.body.classList.contains("refract-performer-card-hover");
        tip.textContent = "";
        if (cardMode) {
            var m = (link.getAttribute("href") || "").match(/\/performers\/(\d+)/);
            if (m) {
                var im = document.createElement("img");
                im.className = "refract-perf-tip-img";
                im.src = "/performer/" + m[1] + "/image";
                im.alt = "";
                im.loading = "lazy";
                tip.appendChild(im);
            }
            var nm = document.createElement("span");
            nm.className = "refract-perf-tip-name";
            nm.textContent = name;
            tip.appendChild(nm);
            tip.classList.add("refract-performer-name-tooltip-portal--card");
        } else {
            tip.textContent = name;
            tip.classList.remove("refract-performer-name-tooltip-portal--card");
        }
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

    function refractEnsureTagPopup() {
        if (refractTagPopupEl && document.contains(refractTagPopupEl)) {
            return refractTagPopupEl;
        }
        refractTagPopupEl = document.createElement("div");
        refractTagPopupEl.className = "refract-tag-popup-portal";
        refractTagPopupEl.setAttribute("aria-hidden", "true");
        document.body.appendChild(refractTagPopupEl);
        /* Keep open while the cursor is on the portal itself so the user
           can travel from the badge onto the chips to click them. */
        refractTagPopupEl.addEventListener("mouseenter", function () {
            if (refractTagPopupTimer) {
                clearTimeout(refractTagPopupTimer);
                refractTagPopupTimer = null;
            }
        });
        refractTagPopupEl.addEventListener("mouseleave", refractHideTagPopupSoon);
        return refractTagPopupEl;
    }

    function refractShowTagPopup(badge) {
        var inline = badge.querySelector(".stash-tag-popup");
        if (!inline) { return; }
        var portal = refractEnsureTagPopup();
        if (refractTagPopupTimer) {
            clearTimeout(refractTagPopupTimer);
            refractTagPopupTimer = null;
        }
        /* Clone chips fresh each time (cheap; <= a few dozen). The clones
           keep their href so clicking still navigates to /tags/:id; being
           outside the card, no card-click handler interferes. */
        portal.textContent = "";
        var chips = inline.querySelectorAll(".stash-tag-popup-chip");
        for (var i = 0; i < chips.length; i++) {
            var a = document.createElement("a");
            a.className = "stash-tag-popup-chip";
            a.href = chips[i].getAttribute("href") || "#";
            a.textContent = chips[i].textContent;
            portal.appendChild(a);
        }
        portal.classList.add("refract-tag-popup-portal--show");
        /* Position above the badge, right edges aligned (matches the old
           inline bottom:100%/right:0 anchor); flip below if no room. */
        var r = badge.getBoundingClientRect();
        var pw = portal.offsetWidth;
        var ph = portal.offsetHeight;
        var margin = 8;
        var left = r.right - pw;
        left = Math.max(margin, Math.min(left, window.innerWidth - pw - margin));
        var top = r.top - ph - 6;
        if (top < margin) { top = r.bottom + 6; }
        top = Math.max(margin, Math.min(top, window.innerHeight - ph - margin));
        portal.style.left = left + "px";
        portal.style.top = top + "px";
    }

    function refractHideTagPopupSoon() {
        if (refractTagPopupTimer) { clearTimeout(refractTagPopupTimer); }
        refractTagPopupTimer = setTimeout(function () {
            if (refractTagPopupEl) {
                refractTagPopupEl.classList.remove("refract-tag-popup-portal--show");
            }
            refractTagPopupTimer = null;
        }, 160);
    }

    function initTagCountPopover() {
        if (!document.body || document.body._refractTagPopupInit) { return; }
        document.body._refractTagPopupInit = true;
        document.body.addEventListener("mouseover", function (e) {
            var badge = e.target.closest && e.target.closest(".stash-tag-count");
            if (!badge) { return; }
            if (e.relatedTarget && badge.contains(e.relatedTarget)) { return; }
            refractShowTagPopup(badge);
        });
        document.body.addEventListener("mouseout", function (e) {
            var badge = e.target.closest && e.target.closest(".stash-tag-count");
            if (!badge) { return; }
            /* Don't hide if the cursor is moving into the badge or onto the
               portal — the portal's own mouseleave will close it. */
            if (e.relatedTarget && (badge.contains(e.relatedTarget) ||
                (refractTagPopupEl && refractTagPopupEl.contains(e.relatedTarget)))) {
                return;
            }
            refractHideTagPopupSoon();
        });
        window.addEventListener("scroll", function (e) {
            /* Scrolling INSIDE the popup (it's overflow-y:auto) also fires
               here via capture — don't dismiss in that case. Only page/
               ancestor scroll (which would drift the fixed popup off its
               anchor) should close it. */
            if (e.target === refractTagPopupEl) { return; }
            if (refractTagPopupEl && refractTagPopupEl.classList.contains("refract-tag-popup-portal--show")) {
                refractTagPopupEl.classList.remove("refract-tag-popup-portal--show");
                if (refractTagPopupTimer) { clearTimeout(refractTagPopupTimer); refractTagPopupTimer = null; }
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
        '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7"/><polyline points="3 4 3 9 8 9"/></svg>';
    var SVG_FWD_10 =
        '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7"/><polyline points="21 4 21 9 16 9"/></svg>';
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
                /* Store the observer on the node and disconnect any prior
                   one before re-observing, so re-processing a play button
                   (or a node React reused) never stacks observers. */
                if (playBtn.__refractPlayObs) { playBtn.__refractPlayObs.disconnect(); }
                var playObs = new MutationObserver(syncPlayIcon);
                playObs.observe(playBtn, {
                    attributes: true,
                    attributeFilter: ["class"]
                });
                playBtn.__refractPlayObs = playObs;
            }

            /* Pointer discriminator for the overlay. vjs counts KEYBOARD
               input as user activity, so gating on `.vjs-user-active`
               alone summoned the buttons for keyboard users (forum
               complaint; worst on short clips). But running our own
               stillness TIMER (the first fix) made the overlay hide on a
               different clock than the control bar, which hides on vjs's
               inactivity timer — the two faded out at visibly different
               moments. So `refract-pointer-active` now only answers "was
               the latest activity pointer-born, over the player?": set on
               mouse/touch activity, cleared on mouseleave or keydown, NO
               timer of its own. The CSS show gate requires it AND
               `.vjs-user-active`, so the hide moment (and the 1s fade,
               matched in 06_scene_player.css) is vjs's own — overlay and
               control bar leave together. Keyboard input still never
               shows the overlay: it clears the flag before vjs marks
               activity. Listeners live on the videojs node and die with
               it; keydown is capture-phase so vjs handlers that stop
               propagation can't starve it. */
            function pointerClear() {
                videojs.classList.remove("refract-pointer-active");
            }
            function pointerShow() {
                videojs.classList.add("refract-pointer-active");
            }
            videojs.addEventListener("mousemove", pointerShow, { passive: true });
            videojs.addEventListener("touchstart", pointerShow, { passive: true });
            /* mouseleave doesn't bubble, and it's bound directly on the
               videojs node (not capture), so it only fires when the
               cursor leaves the player as a whole — no flicker when
               moving between child controls. */
            videojs.addEventListener("mouseleave", pointerClear);
            videojs.addEventListener("keydown", pointerClear, true);
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
            var chevronRo = null;
            function syncChevronVisibility() {
                /* Self-clean: once React swaps out this row, stop observing
                   the detached node so the ResizeObserver + scroll listener
                   closures can be collected (the fresh wrap gets its own via
                   the :not([data-stash-perf-arrows]) selector). */
                if (!row.isConnected) {
                    if (chevronRo) { chevronRo.disconnect(); }
                    return;
                }
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
                chevronRo = new ResizeObserver(syncChevronVisibility);
                chevronRo.observe(row);
                if (wrap.parentElement) { chevronRo.observe(wrap.parentElement); }
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
        /* Galleries render performers in `.gallery-performers` instead of
           scenes' `.scene-performers` (identical card layout + structure,
           just a different container class). Tag the gallery row with
           `scene-performers` so every shared selector below (and all the
           adaptive-layout CSS) treats scenes, images and galleries the same.
           Re-added each cycle if React strips it on re-render. */
        document.querySelectorAll(".gallery-tabs .tab-pane .col-12 > .gallery-performers:not(.scene-performers)").forEach(function (el) {
            el.classList.add("scene-performers");
        });

        /* Step 1 — mark the col-12 that contains .scene-performers as our wrapper.
           classList.add is a non-childList mutation so it does not retrigger the
           MutationObserver (which watches childList only). */
        document.querySelectorAll(":is(.scene-tabs, .image-tabs, .gallery-tabs) .tab-pane .col-12 > .scene-performers").forEach(function (el) {
            var col = el.parentElement;
            if (!col || !col.classList.contains("col-12")) return;
            if (!col.classList.contains("scene-performers-row")) {
                col.classList.add("scene-performers-row");
            }
        });

        /* Step 2-6 — apply adaptive layout per wrapper. */
        document.querySelectorAll(":is(.scene-tabs, .image-tabs, .gallery-tabs) .col-12.scene-performers-row").forEach(function (wrap) {
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

        /* (Re)build loop clones if count changed or clones missing. */
        var existingClones = row.querySelectorAll(":scope > .performer-card.refract-clone").length;
        if (existingClones !== 2 || state.lastRealCount !== count) {
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

        /* Nav row: a centred [prev][dots][next] strip. The chevron buttons
           reuse the main-column carousel's .stash-perf-prev/.stash-perf-next
           styling (glyph + accent); CSS flips them from the absolute overlay
           to inline items flanking the dots. The nav container is built once
           and kept across re-runs; the dots are rebuilt inside it (between
           the chevrons) when the performer count changes. Both chevrons and
           dots step with wrap-around, reading the LIVE row + active dot at
           click time so a React row-swap can't strand a stale closure. */
        if (!state.nav || !state.nav.isConnected) {
            if (state.nav && state.nav.parentNode) { state.nav.parentNode.removeChild(state.nav); }
            var makeNav = function (dir) {
                return function (e) {
                    e.preventDefault();
                    var liveRow = wrap.querySelector(".scene-performers");
                    var st = wrap.__refractPerf || {};
                    var dotsEl2 = st.dots;
                    if (!liveRow || !dotsEl2 || !dotsEl2.children.length) { return; }
                    var n = dotsEl2.children.length;
                    var curDot = dotsEl2.querySelector(".active");
                    var curIdx = curDot ? Array.prototype.indexOf.call(dotsEl2.children, curDot) : 0;
                    var nextIdx = dir > 0 ? (curIdx + 1) % n : (curIdx - 1 + n) % n;
                    var rc = liveRow.querySelectorAll(":scope > .performer-card:not(.refract-clone)")[nextIdx];
                    if (rc) { rc.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" }); }
                };
            };
            var navEl = document.createElement("div");
            navEl.className = "stash-perf-nav";
            var pBtn = document.createElement("button");
            pBtn.type = "button";
            pBtn.className = "stash-perf-prev";
            pBtn.setAttribute("aria-label", "Previous performer");
            pBtn.addEventListener("click", makeNav(-1));
            var nBtn = document.createElement("button");
            nBtn.type = "button";
            nBtn.className = "stash-perf-next";
            nBtn.setAttribute("aria-label", "Next performer");
            nBtn.addEventListener("click", makeNav(1));
            navEl.appendChild(pBtn);
            navEl.appendChild(nBtn);
            wrap.appendChild(navEl);
            state.nav = navEl;
            state.prevBtn = pBtn;
            state.nextBtn = nBtn;
        }

        /* Rebuild dots only if count changed; insert them between the
           chevrons inside the nav row. */
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
            state.nav.insertBefore(dotsEl, state.nextBtn);
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
            var panel = wrap.closest(".scene-tabs, .image-tabs, .gallery-tabs");
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
        /* Removing the nav container takes the chevrons + dots with it. */
        if (state.nav && state.nav.parentNode) state.nav.parentNode.removeChild(state.nav);
        state.nav = null;
        state.dots = null;
        state.prevBtn = null;
        state.nextBtn = null;
        wrap.__refractPerf = state;
    }

    function installScopedRowObserver(wrap, row) {
        var state = wrap.__refractPerf || {};
        /* Re-observe when React has swapped the .scene-performers row for a
           new node: the old observer would otherwise keep watching a
           detached row and never fire for performer add/remove, leaving
           dots/clones stale until a full route change rebuilds the wrap. */
        if (state.scopedMo) {
            if (state.observedRow === row) { return; }
            state.scopedMo.disconnect();
        }
        var debounce = null;
        state.observedRow = row;
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
            var inTiersMode = document.body.classList.contains("refract-flourish-tiers");
            if (card && inTiersMode && v >= 5) {
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
        /* Strip data-stash-filter off form columns — older builds (or any
           run where a third-party plugin's "Search…" input snuck into the
           scene edit form) would tag the column as a filter toolbar and
           inherit the wrong styling. Forms aren't toolbars. */
        document.querySelectorAll("form [data-stash-filter], form[data-stash-filter]").forEach(function (el) {
            el.removeAttribute("data-stash-filter");
        });
        /* Same problem with CustomTagsManager — its sidebar holds a search
           input + many buttons, which made older builds tag the whole
           layout as a filter toolbar. The plugin owns its own styling. */
        document.querySelectorAll("#tag-manager-host [data-stash-filter], .tag-manager [data-stash-filter]").forEach(function (el) {
            el.removeAttribute("data-stash-filter");
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
            var panel = document.querySelector(".scene-tabs, .image-tabs, .gallery-tabs");
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
            /* Self-clean: when React swaps the lightbox indicator for a
               fresh node, this observer is left watching the detached old
               one (the new node gets its own observer via the guard below).
               Disconnect once the target leaves the document so it can be
               collected instead of firing against a dead node forever. */
            if (!indicator.isConnected) {
                if (indicator.__refractCountObs) { indicator.__refractCountObs.disconnect(); }
                return;
            }
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

    /* Surface the Stash "Attempt to fix?" link (which sits as a SIBLING
       after an invalid `.date-input-group`) as a compact "Fix" pill on
       the error row.

       We must NOT move the native anchor into the group. Moving a
       React-managed node desyncs React's tree: once the date is fixed,
       React unmounts the original wrapper but the moved anchor is left
       orphaned in the group with its onClick handler detached, so a
       second click triggers the anchor's default navigation (Stash
       homepage) and loses unsaved form data. Instead we leave the native
       anchor in place (CSS-hidden via .refract-date-fix-native), inject
       our OWN non-navigating <button> proxy that forwards the click to
       the live native anchor, and remove that proxy as soon as the field
       is valid. Idempotent via class. */
    function relocateDateFixLinks() {
        /* 1. Remove stale proxy buttons whose field is no longer invalid.
           This is what prevents the data-loss second click: the pill is
           gone the instant the date validates. */
        document.querySelectorAll(".date-input-group > .refract-date-fix-btn").forEach(function (btn) {
            var grp = btn.closest(".date-input-group");
            if (!grp || !grp.querySelector("input.is-invalid")) {
                btn.remove();
            }
        });
        /* 2. Add a proxy Fix pill for invalid fields exposing a native
           fix anchor. */
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
            /* Hide the native anchor in place (do not move it) so React
               keeps managing its lifecycle; the CSS !important rule beats
               any inline style React may set on the node. */
            (sibling !== link ? sibling : link).classList.add("refract-date-fix-native");
            var btn = document.createElement("button");
            btn.type = "button"; /* never submit/save the form */
            btn.className = "refract-date-fix-btn";
            btn.textContent = "Fix";
            btn.setAttribute("title", "Attempt to fix the date format");
            btn.addEventListener("click", function (e) {
                e.preventDefault();
                /* Re-resolve the native anchor at click time (React may
                   have re-rendered it). Clicking the live, still-mounted
                   anchor runs Stash's handler in React's context, so the
                   fix applies and no orphan is ever created. */
                var sib = group.nextElementSibling;
                var native = sib && sib.matches && sib.matches("a")
                    ? sib
                    : (sib && sib.querySelector ? sib.querySelector("a") : null);
                if (native) { native.click(); }
            });
            group.appendChild(btn);
        });
    }

    /* The bulk-edit dialogs ("Edit N Images / Scenes / …") render their Date
       field with the wrapper class `.bulk-update-date-input` instead of the
       inline-form `.date-input-group`, but the markup inside is identical
       (a .form-control + an .input-group-append holding the nested
       react-datepicker calendar button). All of Refract's date-field merge
       styling is keyed to `.date-input-group`, so the bulk field missed it and
       the calendar rendered as a detached pill. Stamp the same class on so it
       reuses that handling verbatim. Idempotent. */
    function tagBulkDateInputGroups() {
        document.querySelectorAll(".bulk-update-date-input:not(.date-input-group)").forEach(function (el) {
            el.classList.add("date-input-group");
        });
    }

    /* Scenes list "stats" pill. Stash renders, in the top
       `.pagination-index-container`, a `span.paginationIndex` reading
       "1-40 of 1234" with a `<br>` and a `.scenes-stats` span holding
       "(duration - total size)". Refract repositions this span to the
       top-right of the grid (CSS) and reformats the text to a single line:
       "<total> scenes · <duration> · <size>" — dropping the per-page
       "1-40 of" range and flattening the two lines into one.

       IMPORTANT: PaginationIndex is a React function component that
       re-renders `{indexText}<br/>{metadataByline}` IN PLACE whenever the
       filtered total changes. So we must NOT destroy its children — doing
       that desyncs React's fiber (it keeps updating now-detached text nodes
       while our replacement stays frozen at the first value, which is why
       the count used to be stuck at the unfiltered library total). Instead
       we leave Stash's nodes intact (CSS collapses the native text via the
       `refract-scene-stats` class) and maintain our OWN `.refract-stats-
       overlay` child holding the reformatted line. We re-read Stash's live,
       localized count/duration/size each pass and refresh the overlay from a
       signature, so a filter re-render flows straight through. We only read
       Stash's "X of N" text to recover N (the one coupling — that format is
       hardcoded, not localized, in PaginationIndex). */
    function reformatSceneStats() {
        document.querySelectorAll(".pagination-index-container span.paginationIndex").forEach(function (idx) {
            var statsSpan = idx.querySelector(".scenes-stats");
            if (!statsSpan) { return; } /* scenes view only — gallery/perf lists have no .scenes-stats */
            var dur = statsSpan.querySelector(".scenes-duration");
            var size = statsSpan.querySelector(".scenes-size");
            /* Recover the total count from the leading "first-last of N"
               text. The count text is the first text node of the span,
               before the <br> — our overlay is appended AFTER the <br>, so
               this loop never sees it. */
            var head = "";
            for (var i = 0; i < idx.childNodes.length; i++) {
                var n = idx.childNodes[i];
                if (n.nodeType === 1 && n.tagName === "BR") { break; }
                if (n.nodeType === 3) { head += n.nodeValue; }
            }
            var m = head.match(/([\d.,\s]+)\s*$/); /* trailing number after "of" */
            var total = head.indexOf(" of ") !== -1
                ? head.split(" of ").pop().trim()
                : (m ? m[1].trim() : "");
            var durTxt = dur ? dur.textContent.trim() : "";
            var sizeTxt = size ? size.textContent.trim() : "";
            if (!total) { return; } /* totals unknown — leave Stash's text */

            /* Build "<N> scenes · <dur> · <size>" from the parts present. */
            var parts = [total + (total === "1" ? " scene" : " scenes")];
            if (durTxt) { parts.push(durTxt); }
            if (sizeTxt) { parts.push(sizeTxt); }
            var text = parts.join(" · ");

            idx.classList.add("refract-scene-stats");
            var overlay = idx.querySelector(":scope > .refract-stats-overlay");
            /* Signature skips redundant writes but always re-creates the
               overlay if React reconciled it away on a re-render. */
            if (overlay && idx.dataset.stStatsSig === text) { return; }
            if (!overlay) {
                overlay = document.createElement("span");
                overlay.className = "refract-stats-overlay";
                idx.appendChild(overlay);
            }
            overlay.textContent = text;
            idx.dataset.stStatsSig = text;
        });
    }

    function injectStudioName() {
        var anchors = document.querySelectorAll(".scene-header-container h1.studio-logo > a");
        for (var i = 0; i < anchors.length; i++) {
            var a = anchors[i];
            var img = a.querySelector("img");
            if (!img) continue;
            var name = img.getAttribute("alt") || "";
            // Strip a trailing " logo" suffix if present (Stash's convention).
            name = name.replace(/\s+logo$/i, "").trim();
            if (!name) continue;
            /* Refresh on change rather than skip-once: when the studio is
               reassigned, React updates the <img alt> in place on the same
               anchor, so a skip-if-injected guard would leave the old studio
               name showing forever. */
            var existing = a.querySelector(":scope > .st-studio-name");
            if (existing) {
                if (existing.textContent !== name) { existing.textContent = name; }
                continue;
            }
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
            /* Exclude our own injected chevron IN the selector — matching it
               then `continue`-ing skipped the whole row, so the plugin got
               no toggle at all when the chevron sorted first. */
            var nativeBtn = rightSide.querySelector("button.btn.btn-primary.btn-sm:not(.st-plugin-chevron)");
            if (!nativeBtn) continue;

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
                // Don't bubble to the row in case parents listen.
                e.stopPropagation();
                // Forward to the native button so Stash's React handler runs.
                // Use a synthetic click event the React listener will accept.
                var btn = this.closest(".setting").querySelector(
                    "button.btn.btn-primary.btn-sm:not(.st-plugin-chevron)"
                );
                if (btn && btn.isConnected) {
                    btn.click();
                } else {
                    /* No live native button to forward to (mid re-render):
                       undo the optimistic checkbox flip so the visible switch
                       can't desync from the plugin's real state. */
                    this.checked = !this.checked;
                }
            });

            // Place toggle as the LEFT-most action item in the right column.
            safeInsertBefore(rightSide, wrap, rightSide.firstChild);
        }
    }
    injectPluginToggles(); /* initial pass; re-runs via consolidated watcher */

    // Settings → Plugins page: sort the installed-plugin list alphabetically
    // (A→Z), regardless of enabled/disabled state. This matches the native
    // plugin-list ordering from the accepted upstream PR; we no longer float
    // disabled plugins to the bottom.
    // Stash renders the plugins as one .setting-group per plugin inside a
    // bare <div>; we flag that <div> as a flex column (refract-plugin-list,
    // styled in css/13_plugins.css) and assign each row a CSS `order`. Nothing
    // is moved in the DOM — relocating a React-managed node desyncs its fiber
    // (NotFoundError on the next reconcile), so order-only is the safe play.
    // Re-runs via the consolidated watcher, so it re-sorts after a plugin is
    // toggled (which re-renders the list and resets our inline order).
    /* FLIP position cache, keyed by plugin name → { top, left } from the last
       sort pass. Keyed by NAME (not node) so it survives React replacing the
       row nodes when a plugin is toggled. offsetTop/offsetLeft are used (not
       getBoundingClientRect): they're layout positions, so they're immune to
       both scrolling and any transform left over from an in-flight animation. */
    var refractPluginPosCache = {};
    function sortPluginList() {
        var disabledBottom = isPluginSortDisabledBottom();
        /* Identify plugin rows the same way injectPluginToggles does: a
           .setting-group whose header carries the native enable/disable
           btn-sm (the injected chevron is excluded). Collect their parent
           containers (normally a single <div>). */
        var groups = document.querySelectorAll(".setting-section .setting-group");
        var containers = [];
        for (var i = 0; i < groups.length; i++) {
            var header = groups[i].querySelector(":scope > .setting");
            if (!header) continue;
            if (!header.querySelector("button.btn.btn-primary.btn-sm:not(.st-plugin-chevron)")) continue;
            var parent = groups[i].parentElement;
            if (parent && containers.indexOf(parent) === -1) { containers.push(parent); }
        }

        var animate = !document.body.classList.contains("refract-lite") &&
            !(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

        for (var c = 0; c < containers.length; c++) {
            var container = containers[c];
            container.classList.add("refract-plugin-list");

            var rows = [];
            var kids = container.children;
            for (var k = 0; k < kids.length; k++) {
                var g = kids[k];
                if (!g.classList || !g.classList.contains("setting-group")) continue;
                var h = g.querySelector(":scope > .setting");
                if (!h) continue;
                var h3 = h.querySelector(":scope > div:first-child > h3");
                /* Name lives in the heading's leading text node ("Name (1.2.3)");
                   reading the text node (not textContent) skips the project-link
                   anchor injectPluginToggles appends into the same h3. */
                var nameSrc = (h3 && h3.firstChild && h3.firstChild.nodeType === 3)
                    ? h3.firstChild.nodeValue
                    : (h3 ? h3.textContent : "");
                var name = (nameSrc || "").replace(/\s*\([^)]*\)\s*$/, "").trim().toLowerCase();
                /* Disabled rows carry `.disabled` on the header (same signal
                   injectPluginToggles reads to set the toggle checkbox). */
                rows.push({ el: g, name: name, disabled: h.classList.contains("disabled") });
            }
            if (!rows.length) continue;

            rows.sort(function (a, b) {
                /* When the opt-in is on, enabled rows come first, disabled
                   rows sink below; A→Z within each group. Off = one flat
                   A→Z run, matching the upstream native plugin list. */
                if (disabledBottom && a.disabled !== b.disabled) {
                    return a.disabled ? 1 : -1;
                }
                if (a.name < b.name) { return -1; }
                if (a.name > b.name) { return 1; }
                return 0;
            });

            /* FIRST — each row's prior layout position (from the cache; empty
               on the very first pass, so first render never animates). */
            var firsts = {};
            var fr;
            for (fr = 0; fr < rows.length; fr++) {
                if (Object.prototype.hasOwnProperty.call(refractPluginPosCache, rows[fr].name)) {
                    firsts[rows[fr].name] = refractPluginPosCache[rows[fr].name];
                }
            }

            /* Apply the new order (CSS `order` only — never move the nodes). */
            var changed = false;
            var r;
            for (r = 0; r < rows.length; r++) {
                var ord = String(r);
                if (rows[r].el.style.order !== ord) { rows[r].el.style.order = ord; changed = true; }
            }

            /* LAST — read each row's new layout position (one reflow) and
               refresh the cache for next time. Skip hidden rows (offsetParent
               null, e.g. filtered out by search) so they don't poison the FLIP. */
            var lasts = {};
            var lr;
            for (lr = 0; lr < rows.length; lr++) {
                var el = rows[lr].el;
                if (!el.offsetParent) { continue; }
                var pos = { top: el.offsetTop, left: el.offsetLeft };
                lasts[rows[lr].name] = pos;
                refractPluginPosCache[rows[lr].name] = pos;
            }

            if (!animate || !changed) { continue; }

            /* PLAY — invert each moved row back to where it visually was, then
               transition the transform away so the reorder glides into place. */
            var moved = [];
            var p;
            for (p = 0; p < rows.length; p++) {
                var nm = rows[p].name;
                if (!firsts[nm] || !lasts[nm]) { continue; }
                var dx = firsts[nm].left - lasts[nm].left;
                var dy = firsts[nm].top - lasts[nm].top;
                if (!dx && !dy) { continue; }
                var elp = rows[p].el;
                elp.style.transition = "none";
                elp.style.transform = "translate(" + dx + "px, " + dy + "px)";
                moved.push(elp);
            }
            if (!moved.length) { continue; }
            /* Force a reflow so the inverted transforms commit before we play. */
            void container.offsetHeight;
            var m;
            for (m = 0; m < moved.length; m++) {
                moved[m].style.transition = "transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)";
                moved[m].style.transform = "";
            }
            (function (els) {
                setTimeout(function () {
                    for (var z = 0; z < els.length; z++) {
                        els[z].style.transition = "";
                        els[z].style.transform = "";
                    }
                }, 460);
            })(moved);
        }
    }
    sortPluginList(); /* initial pass; re-runs via consolidated watcher */

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
                var grp = this.closest(".setting-group");
                var sec = grp.querySelector(":scope > .collapsible-section");
                var collapsing = !grp.classList.contains("st-plugin-collapsed");
                grp.classList.toggle("st-plugin-collapsed");
                if (!sec) return;
                refractAnimateCollapse(sec, !collapsing);
            });
            rightSide.appendChild(chevron);

            header.addEventListener("click", function (e) {
                if (!e.target.closest("button, a, input, label, select")) {
                    e.stopPropagation();
                }
            });

            section.style.overflow = "hidden";
            section.style.maxHeight = "0px";
            section.style.opacity = "0";
            section.style.transition = "max-height 0.28s ease, opacity 0.2s ease";
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

    // Settings → Tasks page: mirrors makePluginSettingsCollapsible + injectPluginSearch
    // for the Plugin Tasks card. Identical chevron (st-plugin-chevron) and collapse
    // class (st-plugin-collapsed) so all existing CSS applies without duplication.
    function setupTaskPluginGroups() {
        var tabPane = document.querySelector("[id$='-tabpane-tasks']");
        if (!tabPane) return;

        // Plugin task groups have btn-secondary btn-sm task triggers inside their
        // collapsible-section; native groups (Scan, Generate…) have checkboxes.
        var cards = tabPane.querySelectorAll(".card");
        var pluginCard = null;
        for (var c = 0; c < cards.length; c++) {
            var s = cards[c].querySelector(".setting-group.collapsible .collapsible-section");
            if (s && s.querySelector(".btn.btn-secondary.btn-sm")) {
                pluginCard = cards[c];
                break;
            }
        }
        if (!pluginCard) return;

        if (!pluginCard.classList.contains("st-task-plugin-card")) {
            pluginCard.classList.add("st-task-plugin-card");
        }

        // Inject search bar once — wrapped in a .setting row so the
        // clearable-input-group layout matches the Plugins page search.
        if (!pluginCard.dataset.stTaskSearchDone) {
            var searchRow = document.createElement("div");
            searchRow.className = "setting st-task-search-row";

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

            searchRow.appendChild(wrap);
            pluginCard.insertBefore(searchRow, pluginCard.firstChild);
            pluginCard.dataset.stTaskSearchDone = "1";
        }

        // Inject identical st-plugin-chevron into each group header and default
        // to collapsed — exactly as makePluginSettingsCollapsible does it so all
        // existing chevron CSS (.st-plugin-chevron, .st-plugin-collapsed) applies.
        var groups = pluginCard.querySelectorAll(".setting-group.collapsible");
        for (var i = 0; i < groups.length; i++) {
            var group = groups[i];
            if (group.dataset.stTaskChevronDone === "1") continue;

            var header = group.querySelector(":scope > .setting");
            if (!header) { group.dataset.stTaskChevronDone = "1"; continue; }
            var rightSide = header.lastElementChild;
            if (!rightSide) { group.dataset.stTaskChevronDone = "1"; continue; }

            var chevron = document.createElement("button");
            chevron.type = "button";
            chevron.className = "btn btn-primary btn-sm st-plugin-chevron";
            chevron.setAttribute("aria-label", "Toggle plugin tasks");
            chevron.innerHTML =
                "<svg viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg' " +
                "aria-hidden='true'>" +
                "<path d='M10 7L15 12L10 17' stroke='currentColor' stroke-width='1.5' " +
                "stroke-linecap='round' stroke-linejoin='round'/></svg>";
            chevron.addEventListener("click", function (e) {
                e.stopPropagation();
                e.preventDefault();
                var grp = this.closest(".setting-group");
                var sec = grp.querySelector(":scope > .collapsible-section");
                var collapsing = !grp.classList.contains("st-plugin-collapsed");
                grp.classList.toggle("st-plugin-collapsed");
                if (!sec) return;
                refractAnimateCollapse(sec, !collapsing);
            });
            rightSide.appendChild(chevron);

            header.addEventListener("click", function (e) {
                if (!e.target.closest("button, a, input, label, select")) {
                    e.stopPropagation();
                }
            });

            var taskSec = group.querySelector(":scope > .collapsible-section");
            if (taskSec) {
                taskSec.style.overflow = "hidden";
                taskSec.style.maxHeight = "0px";
                taskSec.style.opacity = "0";
                taskSec.style.transition = "max-height 0.28s ease, opacity 0.2s ease";
            }
            group.classList.add("st-plugin-collapsed");
            group.dataset.stTaskChevronDone = "1";
        }
    }
    setupTaskPluginGroups(); /* initial pass; re-runs via consolidated watcher */

    // Settings → Tasks page: native task groups (Scan / Auto Tag / Generate /
    // Clean / Identify / Migrate). Mirrors setupTaskPluginGroups but anchored
    // on the absence of `.btn.btn-secondary.btn-sm` inside .collapsible-section
    // (that pattern marks plugin task triggers; native groups instead have
    // checkbox toggles). Default to collapsed and inject the same st-plugin-chevron
    // so existing chevron CSS applies without duplication.
    function setupNativeTaskGroups() {
        var tabPane = document.querySelector("[id$='-tabpane-tasks']");
        if (!tabPane) return;

        var groups = tabPane.querySelectorAll(".setting-group.collapsible");
        for (var i = 0; i < groups.length; i++) {
            var group = groups[i];

            if (group.dataset.stTaskChevronDone === "1") continue;

            var section = group.querySelector(":scope > .collapsible-section");
            if (!section) continue; // no body to collapse

            // Skip plugin task groups — those have .btn.btn-secondary.btn-sm
            // triggers in their collapsible-section. Native task groups (Scan,
            // Generate…) have checkbox toggles instead.
            if (section.querySelector(".btn.btn-secondary.btn-sm")) continue;

            var header = group.querySelector(":scope > .setting");
            if (!header) { group.dataset.stTaskChevronDone = "1"; continue; }
            var rightSide = header.lastElementChild;
            if (!rightSide) { group.dataset.stTaskChevronDone = "1"; continue; }

            var chevron = document.createElement("button");
            chevron.type = "button";
            chevron.className = "btn btn-primary btn-sm st-plugin-chevron";
            chevron.setAttribute("aria-label", "Toggle section");
            chevron.innerHTML =
                "<svg viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg' " +
                "aria-hidden='true'>" +
                "<path d='M10 7L15 12L10 17' stroke='currentColor' stroke-width='1.5' " +
                "stroke-linecap='round' stroke-linejoin='round'/></svg>";
            chevron.addEventListener("click", function (e) {
                e.stopPropagation();
                e.preventDefault();
                var grp = this.closest(".setting-group");
                var sec = grp.querySelector(":scope > .collapsible-section");
                var collapsing = !grp.classList.contains("st-plugin-collapsed");
                grp.classList.toggle("st-plugin-collapsed");
                if (!sec) return;
                refractAnimateCollapse(sec, !collapsing);
            });
            rightSide.appendChild(chevron);

            section.style.overflow = "hidden";
            section.style.maxHeight = "0px";
            section.style.opacity = "0";
            section.style.transition = "max-height 0.28s ease, opacity 0.2s ease";
            group.classList.add("st-plugin-collapsed");
            group.dataset.stTaskChevronDone = "1";
        }
    }
    setupNativeTaskGroups(); /* initial pass; re-runs via consolidated watcher */

    /* Task Queue progress — inline percentage next to the title.
       Bootstrap renders the percentage as text INSIDE .progress-bar; the
       bar is 4 px tall in our theme (08_misc_mid.css L5846) so the text
       overflows vertically as a faded blur. CSS hides the inner text;
       this function reads the percentage from the .progress-bar's inline
       style width and appends a small " · 14%" suffix to the job title. */
    function setupTaskQueuePercent() {
        var jobs = document.querySelectorAll(".job-table.card li.job");
        for (var i = 0; i < jobs.length; i++) {
            var job = jobs[i];
            var bar = job.querySelector(":scope .progress > .progress-bar");
            var desc = job.querySelector(":scope .job-description > div");
            if (!desc) continue;

            var pct = "";
            if (bar) {
                var w = bar.getAttribute("style") || "";
                var m = w.match(/width\s*:\s*([\d.]+)%/i);
                if (m) {
                    /* Round so we don't dump "14.2857%" on screen. */
                    pct = Math.round(parseFloat(m[1])) + "%";
                }
            }

            var span = desc.querySelector(":scope > .st-task-pct");
            if (!pct) {
                if (span) span.remove();
                continue;
            }
            if (!span) {
                span = document.createElement("span");
                span.className = "st-task-pct";
                desc.appendChild(span);
            }
            if (span.textContent !== pct) {
                span.textContent = pct;
            }
        }
    }
    setupTaskQueuePercent(); /* initial pass; re-runs via consolidated watcher */

    /* Task Queue per-row expand: each job row is fixed at 110px so
       the card grows with job count not subtask churn. A chevron in
       the bottom-right of rows that have subtasks toggles a
       `refract-job-expanded` class to reveal the full subtask list.

       Expanded state lives in a closure Set keyed by the job's
       DESCRIPTION TEXT (Stash exposes no stable job id). Index keys
       were wrong: when a job completes and drops out, every later job
       shifts down one index, so the next job at that index would
       inherit the expanded state. Description text is stable across
       that shift. (Two jobs with identical descriptions share state —
       a rare, harmless edge vs. the index-bleed it replaces.) */
    /* Use the same chevron path as st-plugin-chevron (refract.js:5969)
       for visual consistency. CSS rotates it 90° to point down in the
       collapsed state, 270° when expanded. */
    var REFRACT_JOB_CHEVRON_SVG =
        "<svg viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg' aria-hidden='true'>" +
        "<path d='M10 7L15 12L10 17' stroke='currentColor' stroke-width='1.5' " +
        "stroke-linecap='round' stroke-linejoin='round'/></svg>";
    var refractExpandedJobKeys = new Set();
    function refractJobKey(job) {
        var d = job.querySelector(".job-description");
        var t = d ? (d.textContent || "").replace(/\s+/g, " ").trim() : "";
        return t || null;
    }
    function setupTaskJobChevrons() {
        var card = document.querySelector("#tasks-panel .tasks-panel-queue .job-table.card");
        if (!card) { return; }
        /* Clean up any stale top-of-card toggle from the earlier
           collapse experiment, in case its CSS leaks. */
        var staleToggle = card.querySelector(":scope > .refract-task-queue-toggle");
        if (staleToggle) { staleToggle.remove(); }

        var jobs = card.querySelectorAll(":scope > ul > li.job");
        jobs.forEach(function (job) {
            var hasSubtasks = !!job.querySelector(".job-subtask");
            var existingChevron = job.querySelector(":scope > .refract-job-chevron");
            var key = refractJobKey(job);

            if (key && refractExpandedJobKeys.has(key)) {
                job.classList.add("refract-job-expanded");
            } else {
                job.classList.remove("refract-job-expanded");
            }

            if (!hasSubtasks) {
                if (existingChevron) { existingChevron.remove(); }
                return;
            }

            if (!existingChevron) {
                var btn = document.createElement("button");
                btn.type = "button";
                btn.className = "refract-job-chevron";
                if (key) { btn.setAttribute("data-refract-job-key", key); }
                btn.setAttribute("aria-label", "Toggle subtask list");
                btn.innerHTML = REFRACT_JOB_CHEVRON_SVG;
                job.appendChild(btn);
            } else if (key) {
                existingChevron.setAttribute("data-refract-job-key", key);
            }
        });
    }

    if (!window.__refractJobChevronClickBound) {
        window.__refractJobChevronClickBound = true;
        document.addEventListener("click", function (e) {
            var t = e.target;
            if (!t || !t.closest) { return; }
            var btn = t.closest(".refract-job-chevron");
            if (!btn) { return; }
            var key = btn.getAttribute("data-refract-job-key");
            if (!key) { return; }
            if (refractExpandedJobKeys.has(key)) {
                refractExpandedJobKeys.delete(key);
            } else {
                refractExpandedJobKeys.add(key);
            }
            setupTaskJobChevrons();
        }, true);
    }

    setupTaskJobChevrons();

    /* Inject a sun/moon light-mode toggle into the navbar utility cluster
       (right side, next to the burger / settings cog). Idempotent —
       skip if already injected. Visibility is gated by CSS via the
       refract-show-light-nav body class (see applyLightToggleNavbarClass). */
    function injectNavLightToggle() {
        var buttons = document.querySelector("nav.top-nav .navbar-buttons");
        if (!buttons) return;
        if (buttons.querySelector(":scope > .st-light-toggle-nav")) {
            /* Already injected — keep the glyph in sync with current state */
            var existing = buttons.querySelector(":scope > .st-light-toggle-nav");
            var nowLight = isLightModeEnabled();
            /* Only mutate when the state actually changed. The global
               mutation watcher calls this every pass; re-parsing the SVG
               subtree each time can drop a click whose mousedown/mouseup
               straddles the innerHTML swap. */
            var wasLight = existing.classList.contains("is-active");
            if (wasLight === nowLight && existing.querySelector("svg")) return;
            existing.classList.toggle("is-active", nowLight);
            existing.setAttribute("aria-label", nowLight ? "Switch to dark mode" : "Switch to light mode");
            existing.setAttribute("title", nowLight ? "Switch to dark mode" : "Switch to light mode");
            existing.innerHTML = nowLight ? SUN_ICON_SVG : MOON_ICON_SVG;
            return;
        }
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn btn-primary minimal nav-utility st-light-toggle-nav";
        var on = isLightModeEnabled();
        if (on) btn.classList.add("is-active");
        btn.setAttribute("aria-label", on ? "Switch to dark mode" : "Switch to light mode");
        btn.setAttribute("title", on ? "Switch to dark mode" : "Switch to light mode");
        btn.innerHTML = on ? SUN_ICON_SVG : MOON_ICON_SVG;
        btn.addEventListener("click", function (e) {
            e.preventDefault();
            e.stopPropagation();
            var next = !isLightModeEnabled();
            function commit() {
                try { localStorage.setItem(LIGHT_MODE_STORAGE_KEY, next ? "1" : "0"); } catch (err) { /* ignore */ }
                scheduleServerSync();
                applyLightModeClass(next);
                /* Re-sync this button glyph immediately (watcher would
                   also catch it but feels snappier). */
                injectNavLightToggle();
            }
            if (typeof document.startViewTransition === "function") {
                document.startViewTransition(commit);
            } else {
                commit();
            }
        });
        buttons.appendChild(btn);
    }
    injectNavLightToggle();

    /* Inject a "Show light-mode toggle in navbar" switch row into Stash's
       Interface tab, alongside the other menu-item visibility toggles.
       The setting persists to LIGHT_TOGGLE_NAVBAR_KEY and re-applies the
       body class so the navbar button shows/hides immediately. */
    function injectInterfaceLightToggleSetting() {
        var pane = document.querySelector("[id$='-tabpane-interface']");
        if (!pane) return;
        if (pane.querySelector(".st-light-nav-setting-row")) return;

        /* Look for the Stash "Menu items" section by heading text; if
           we can't find it, fall back to the first .setting-section in
           the pane so we still get visible placement. */
        var target = null;
        var sections = pane.querySelectorAll(".setting-section");
        for (var i = 0; i < sections.length; i++) {
            var h = sections[i].querySelector("h1, h2, h3, h4, h5, h6");
            if (h && /menu|navigation/i.test(h.textContent || "")) {
                target = sections[i].querySelector(".setting-group") || sections[i];
                break;
            }
        }
        if (!target && sections.length) {
            target = sections[0].querySelector(".setting-group") || sections[0];
        }
        if (!target) return;

        var row = document.createElement("div");
        row.className = "setting st-light-nav-setting-row";
        row.innerHTML =
            '<div>' +
                '<h3>Light-mode toggle</h3>' +
                '<div class="sub-heading">Show a sun/moon button in the navbar for quick light-mode switching. ' +
                'Refract plugin must be enabled.</div>' +
            '</div>' +
            '<div>' +
                '<div class="custom-control custom-switch">' +
                    '<input type="checkbox" class="custom-control-input" id="st-light-nav-toggle">' +
                    '<label class="custom-control-label" for="st-light-nav-toggle"></label>' +
                '</div>' +
            '</div>';

        var input = row.querySelector("#st-light-nav-toggle");
        input.checked = isLightToggleNavbarVisible();
        input.addEventListener("change", function () {
            var on = !!this.checked;
            try { localStorage.setItem(LIGHT_TOGGLE_NAVBAR_KEY, on ? "1" : "0"); } catch (e) { /* ignore */ }
            scheduleServerSync();
            applyLightToggleNavbarClass(on);
        });

        target.appendChild(row);
    }
    injectInterfaceLightToggleSetting();

    /* Inject a "Help button" switch row into Stash's Interface tab Menu
       Items section, alongside the other menu-item visibility toggles.
       Refract hides Stash's navbar Help (?) button by default; this row
       lets the user bring it back. Persists to HELP_BUTTON_STORAGE_KEY
       and re-applies the body class so the button shows/hides live. */
    function injectInterfaceHelpToggleSetting() {
        var pane = document.querySelector("[id$='-tabpane-interface']");
        if (!pane) return;
        if (pane.querySelector(".st-help-btn-setting-row")) return;

        /* Find the Stash "Menu items" section by heading text; fall back
           to the first .setting-section so we still get visible placement. */
        var target = null;
        var sections = pane.querySelectorAll(".setting-section");
        for (var i = 0; i < sections.length; i++) {
            var h = sections[i].querySelector("h1, h2, h3, h4, h5, h6");
            if (h && /menu|navigation/i.test(h.textContent || "")) {
                target = sections[i].querySelector(".setting-group") || sections[i];
                break;
            }
        }
        if (!target && sections.length) {
            target = sections[0].querySelector(".setting-group") || sections[0];
        }
        if (!target) return;

        var row = document.createElement("div");
        row.className = "setting st-help-btn-setting-row";
        row.innerHTML =
            '<div>' +
                '<h3>Help button</h3>' +
                '<div class="sub-heading">Show Stash\'s Help (?) button in the navbar. ' +
                'Refract hides it by default; enable to bring it back.</div>' +
            '</div>' +
            '<div>' +
                '<div class="custom-control custom-switch">' +
                    '<input type="checkbox" class="custom-control-input" id="st-help-btn-toggle">' +
                    '<label class="custom-control-label" for="st-help-btn-toggle"></label>' +
                '</div>' +
            '</div>';

        var input = row.querySelector("#st-help-btn-toggle");
        input.checked = isHelpButtonVisible();
        input.addEventListener("change", function () {
            var on = !!this.checked;
            try { localStorage.setItem(HELP_BUTTON_STORAGE_KEY, on ? "1" : "0"); } catch (e) { /* ignore */ }
            scheduleServerSync();
            applyHelpButtonClass(on);
        });

        target.appendChild(row);
    }
    injectInterfaceHelpToggleSetting();

    /* Relocated Refract settings: a full "Refract" section appended to
       Settings -> Interface, so theme settings live with the rest of the
       UI options instead of buried behind the Plugins list (user request
       2026-07-26). Mirrors the native section shape exactly
       (.setting-section > h1 + .card). The old plugin panel renders a
       pointer note instead (see the PluginSettings patch). The settings
       component is built once and mounted with PluginApi.ReactDOM.render;
       if the SPA rebuilds the pane, the consolidated watcher re-injects. */
    function injectInterfaceRefractSection() {
        if (typeof PluginApi === "undefined" || !PluginApi.React || !PluginApi.ReactDOM) { return; }
        var pane = document.querySelector("[id$='-tabpane-interface']");
        if (!pane) { return; }
        if (pane.querySelector("#refract-settings-section")) { return; }
        /* Wait for Stash's own sections so we append after them (an empty
           pane means the tab hasn't finished rendering yet). */
        if (!pane.querySelector(".setting-section")) { return; }

        var section = document.createElement("div");
        section.className = "setting-section refract-interface-section";
        section.id = "refract-settings-section";
        var h1 = document.createElement("h1");
        h1.textContent = "Refract";
        section.appendChild(h1);
        var card = document.createElement("div");
        card.className = "card";
        section.appendChild(card);
        /* TOP of the Interface tab (user request 2026-07-26): theme
           settings are the most-touched thing on this page. */
        pane.insertBefore(section, pane.firstChild);

        /* The panel itself is mounted into this .card by the portal host
           registered in registerAccentPatch — NOT a standalone
           ReactDOM.render root. The portal keeps the panel inside
           Stash's React tree so the real-card preview can render the
           app's SceneCard/PerformerCard (they need ConfigurationProvider
           / IntlProvider / Router context, which a standalone root
           lacks — verified by crash 2026-07-26). */

        /* Deep link from the old plugin-panel note. */
        if (location.hash === "#refract") {
            setTimeout(function () { section.scrollIntoView({ block: "start" }); }, 60);
        }
    }
    injectInterfaceRefractSection();

    /* ── Navbar drag-to-reorder (iOS-style) ─────────────────────────────
       Pointer-events + FLIP animation so icons slide out of the way live.
       Saved order persisted to localStorage; re-applied via CSS `order`
       with !important so React re-renders cannot undo the arrangement.

       Technique: remove dragged item from flex flow (display:none) so
       remaining items occupy their natural positions, then use
       translateX transforms + transitions to animate them around a
       moving gap. FLIP (First-Last-Invert-Play) on both start and drop
       keeps every transition smooth with no positional jumps. */
    function setupNavbarReorder() {
        var NAV_ORDER_KEY = "refract-nav-order-v1";
        var DRAG_THRESHOLD_SQ = 25; /* 5 px squared */
        var EASING = "cubic-bezier(.25,.46,.45,.94)";

        var navRow = document.querySelector(
            "body.stash-liquid-glass nav.top-nav .navbar-collapse > .navbar-nav:first-of-type"
        );
        if (!navRow) return;

        /* ── helpers ─────────────────────────────────────────────────── */
        function itemKey(el) {
            var k = el.getAttribute("data-rb-event-key");
            if (k) return "k:" + k;
            if (el.id) return "i:" + el.id;
            return null;
        }

        function loadSaved() {
            try { return JSON.parse(localStorage.getItem(NAV_ORDER_KEY)) || []; }
            catch (e) { return []; }
        }

        /* Write order as a CSS rule block rather than inline styles.
           Inline styles are removed by React on every re-render; a <style>
           tag in <head> is invisible to React and survives navigation. */
        var NAV_ORDER_STYLE_ID = "st-nav-order-style";
        function getOrderSheet() {
            var el = document.getElementById(NAV_ORDER_STYLE_ID);
            if (!el) {
                el = document.createElement("style");
                el.id = NAV_ORDER_STYLE_ID;
                document.head.appendChild(el);
            }
            return el;
        }

        function applyOrder() {
            /* Also strip any legacy inline order styles so they don't win
               over the !important rules in our style sheet. */
            Array.from(navRow.children).forEach(function (x) {
                x.style.removeProperty("order");
            });

            var saved = loadSaved();
            var sheet = getOrderSheet();
            if (!saved.length) { sheet.textContent = ""; return; }

            var navSel = "body.stash-liquid-glass nav.top-nav .navbar-nav";
            var css = "";
            saved.forEach(function (key, i) {
                /* Skip non-string entries — a legacy/corrupted numeric entry
                   would throw on .slice and, caught by the outer try, drop
                   the entire saved nav order. */
                if (typeof key !== "string") { return; }
                var sel;
                if (key.slice(0, 2) === "k:") {
                    sel = navSel + ' > [data-rb-event-key="' + key.slice(2) + '"]';
                } else if (key.slice(0, 2) === "i:") {
                    sel = navSel + " > #" + key.slice(2);
                } else {
                    return;
                }
                css += sel + " { order: " + (i + 1) + " !important; }\n";
            });
            sheet.textContent = css;
        }

        function getVisualOrder() {
            return Array.from(navRow.children).sort(function (a, b) {
                return (parseInt(window.getComputedStyle(a).order, 10) || 0) -
                       (parseInt(window.getComputedStyle(b).order, 10) || 0);
            });
        }

        applyOrder();

        /* ── active drag state ───────────────────────────────────────── */
        var drag = null;

        function insertIdxFor(cursorX) {
            var centers = drag.origCenters;
            for (var i = 0; i < centers.length; i++) {
                if (cursorX < centers[i]) return i;
            }
            return centers.length;
        }

        function applyShifts(insertIdx) {
            var shift = drag.shiftAmount;
            drag.otherItems.forEach(function (x, i) {
                x.style.transform = i >= insertIdx
                    ? "translateX(" + shift + "px)"
                    : "translateX(0)";
            });
            drag.curInsert = insertIdx;
        }

        /* ── drag start ──────────────────────────────────────────────── */
        function startDrag(el, downX, currentX) {
            var sorted   = getVisualOrder();
            var dragRect = el.getBoundingClientRect();

            /* Capture inner-element metrics NOW — before display:none makes
               getBoundingClientRect() return zeros on all descendants. */
            var innerSvgs    = Array.from(el.querySelectorAll("svg"));
            var svgRects     = innerSvgs.map(function (s) { return s.getBoundingClientRect(); });
            var innerSpans   = Array.from(el.querySelectorAll("span"));
            var spanDisplays = innerSpans.map(function (s) {
                return window.getComputedStyle(s).display;
            });

            /* 1. Capture positions WITH el in flow (beforeRects). */
            var beforeLeft = {};
            sorted.forEach(function (x) {
                var k = itemKey(x) || String(sorted.indexOf(x));
                beforeLeft[k] = x.getBoundingClientRect().left;
            });

            /* 2. Remove el from flex flow. */
            el.style.setProperty("display", "none", "important");
            void navRow.offsetWidth; /* force reflow */

            /* 3. Capture positions WITHOUT el (afterRects) + measure gap. */
            var otherItems = sorted.filter(function (x) { return x !== el; });
            var afterLeft  = {};
            var shiftAmount = dragRect.width;
            otherItems.forEach(function (x, i) {
                var r = x.getBoundingClientRect();
                afterLeft[itemKey(x) || String(sorted.indexOf(x))] = r.left;
                /* gap = space between item 0 and item 1 in natural layout */
                if (i === 1) {
                    var prev = otherItems[0].getBoundingClientRect();
                    shiftAmount = dragRect.width + Math.max(0, r.left - prev.right);
                }
            });

            /* 4. Compute item centres (stable reference for insertion calc). */
            var origCenters = otherItems.map(function (x) {
                var k = itemKey(x) || String(sorted.indexOf(x));
                var w = x.getBoundingClientRect().width;
                return (afterLeft[k] || 0) + w / 2;
            });

            /* 5. FLIP open: apply inverse transforms so items look unmoved,
                  then animate them to their natural positions (gap closing). */
            otherItems.forEach(function (x) {
                var k = itemKey(x) || String(sorted.indexOf(x));
                var delta = (beforeLeft[k] || 0) - (afterLeft[k] || 0);
                x.style.transition = "none";
                x.style.transform  = delta !== 0 ? "translateX(" + delta + "px)" : "";
            });
            void navRow.offsetWidth;
            otherItems.forEach(function (x) {
                x.style.transition = "transform 0.18s " + EASING;
                x.style.transform  = "translateX(0)";
            });

            /* 6. Floating clone — the "lifted" icon following the cursor.
               Lives in <body>, so nav-scoped CSS doesn't apply; we fix each
               inner element using metrics captured before display:none.
               Initial left uses currentX (where cursor is NOW) not dragRect.left
               so there's no positional jump on the first pointermove. */
            var clone = el.cloneNode(true);
            clone.removeAttribute("data-st-nav-drag-done");
            var initCloneLeft = (currentX !== undefined)
                ? currentX - (downX - dragRect.left)
                : dragRect.left;
            clone.style.cssText =
                "position:fixed !important; z-index:9999 !important;" +
                "pointer-events:none !important; margin:0 !important;" +
                "display:flex !important; align-items:center !important;" +
                "justify-content:center !important; overflow:hidden !important;" +
                "left:" + initCloneLeft + "px; top:" + dragRect.top + "px;" +
                "width:" + dragRect.width + "px; height:" + dragRect.height + "px;" +
                "opacity:0.92; transition:none !important;" +
                "transform:scale(1.12) !important;" +
                "transform-origin:center center !important;" +
                "border-radius:var(--radius-sm);" +
                "box-shadow:0 8px 28px rgba(0,0,0,0.5),0 0 0 1px rgba(255,255,255,0.1);";

            /* Inner <a>: add only the centering/sizing props we need — don't
               wipe cssText so React-managed inline styles are preserved. */
            var cloneA = clone.querySelector("a");
            if (cloneA) {
                cloneA.style.setProperty("display",          "flex",        "important");
                cloneA.style.setProperty("align-items",      "center",      "important");
                cloneA.style.setProperty("justify-content",  "center",      "important");
                cloneA.style.setProperty("width",            "100%",        "important");
                cloneA.style.setProperty("height",           "100%",        "important");
                cloneA.style.setProperty("padding",          "0",           "important");
                cloneA.style.setProperty("margin",           "0",           "important");
                cloneA.style.setProperty("box-sizing",       "border-box",  "important");
                cloneA.style.setProperty("text-decoration",  "none",        "important");
            }
            /* Spans: mirror computed display from original (hide labels, keep Binge text). */
            var cloneSpans = clone.querySelectorAll("span");
            for (var si = 0; si < cloneSpans.length; si++) {
                if (spanDisplays[si] === "none") {
                    cloneSpans[si].style.setProperty("display", "none", "important");
                }
            }
            /* SVGs: pin to pre-captured rendered size so they don't balloon outside nav CSS. */
            var cloneSvgs = clone.querySelectorAll("svg");
            for (var vi = 0; vi < cloneSvgs.length; vi++) {
                if (svgRects[vi] && svgRects[vi].width) {
                    cloneSvgs[vi].style.width  = svgRects[vi].width  + "px";
                    cloneSvgs[vi].style.height = svgRects[vi].height + "px";
                    cloneSvgs[vi].style.flexShrink = "0";
                }
            }

            document.body.appendChild(clone);

            /* Compute initial insert index BEFORE assigning drag (insertIdxFor
               reads drag.origCenters, which doesn't exist yet). */
            var initInsert = 0;
            for (var ii = 0; ii < origCenters.length; ii++) {
                if (downX < origCenters[ii]) { initInsert = ii; break; }
                initInsert = origCenters.length;
            }

            drag = {
                el:          el,
                clone:       clone,
                otherItems:  otherItems,
                origCenters: origCenters,
                shiftAmount: shiftAmount,
                offsetX:     downX - dragRect.left,
                cloneTop:    dragRect.top,
                curInsert:   initInsert,
            };

            /* Initial gap position based on where finger went down. */
            applyShifts(initInsert);

            document.addEventListener("pointermove",   onPointerMove);
            document.addEventListener("pointerup",     onPointerUp);
            document.addEventListener("pointercancel", onPointerUp);
        }

        /* ── during drag ─────────────────────────────────────────────── */
        function onPointerMove(e) {
            if (!drag) return;
            drag.clone.style.left = (e.clientX - drag.offsetX) + "px";
            var idx = insertIdxFor(e.clientX);
            if (idx !== drag.curInsert) applyShifts(idx);
        }

        /* ── drop ────────────────────────────────────────────────────── */
        function onPointerUp() {
            if (!drag) return;

            var el         = drag.el;
            var insertIdx  = drag.curInsert;
            var otherItems = drag.otherItems;

            /* 1. Capture visual positions while transforms are applied. */
            var firstLeft = otherItems.map(function (x) {
                return x.getBoundingClientRect().left;
            });

            /* 2. Snap transforms off instantly — no transition. */
            otherItems.forEach(function (x) {
                x.style.transition = "none";
                x.style.transform  = "";
            });

            /* 3. Restore el (invisible for now during FLIP). */
            el.style.removeProperty("display");
            el.style.opacity = "0";
            void navRow.offsetWidth;

            /* 4. Assign final order via CSS stylesheet (React-safe). */
            var newOrder = otherItems.slice();
            newOrder.splice(insertIdx, 0, el);
            var saved = [];
            newOrder.forEach(function (item) {
                var k = itemKey(item);
                if (k) saved.push(k);
            });
            localStorage.setItem(NAV_ORDER_KEY, JSON.stringify(saved));
            applyOrder();
            void navRow.offsetWidth;

            /* 5. Capture new flex positions (LAST). */
            var lastLeft = otherItems.map(function (x) {
                return x.getBoundingClientRect().left;
            });

            /* 6. FLIP close: invert so items appear at their old positions. */
            otherItems.forEach(function (x, i) {
                var delta = firstLeft[i] - lastLeft[i];
                x.style.transform = delta !== 0 ? "translateX(" + delta + "px)" : "";
            });
            void navRow.offsetWidth;

            /* 7. Animate everything to its final position. */
            otherItems.forEach(function (x) {
                x.style.transition = "transform 0.22s " + EASING;
                x.style.transform  = "";
            });
            el.style.opacity = "";

            /* 8. Cleanup. Guard the removeChild: if the floating clone was
               already detached (a pointercancel/pointerup race, or React
               reconciled <body>), an unguarded removeChild throws and skips
               the listener teardown + `drag = null` below — permanently
               jamming drag-reorder (the next pointerdown is rejected by
               `|| drag`). */
            if (drag.clone && drag.clone.parentNode) {
                drag.clone.parentNode.removeChild(drag.clone);
            }
            var capturedItems = otherItems;
            setTimeout(function () {
                capturedItems.forEach(function (x) { x.style.transition = ""; });
            }, 240);

            document.removeEventListener("pointermove",   onPointerMove);
            document.removeEventListener("pointerup",     onPointerUp);
            document.removeEventListener("pointercancel", onPointerUp);
            drag = null;
        }

        /* ── per-item wiring ─────────────────────────────────────────── */
        function attachDrag(el) {
            if (el.dataset.stNavDragDone) return;
            el.dataset.stNavDragDone = "1";
            el.classList.add("st-nav-draggable");

            /* Native browser drag on <a> / <svg> children captures the pointer
               and stops pointermove from firing, breaking our threshold detection.
               Prevent it here so pointer events flow through normally. */
            el.addEventListener("dragstart", function (e) { e.preventDefault(); });

            el.addEventListener("pointerdown", function (e) {
                if (e.button !== 0 || drag) return;

                var downX = e.clientX;
                var downY = e.clientY;

                function onMove(me) {
                    var dx = me.clientX - downX;
                    var dy = me.clientY - downY;
                    if (dx * dx + dy * dy > DRAG_THRESHOLD_SQ) {
                        cleanup();
                        me.preventDefault();
                        startDrag(el, downX, me.clientX);
                    }
                }
                function onUp() { cleanup(); }
                function cleanup() {
                    document.removeEventListener("pointermove",   onMove);
                    document.removeEventListener("pointerup",     onUp);
                    document.removeEventListener("pointercancel", onUp);
                }
                document.addEventListener("pointermove",   onMove);
                document.addEventListener("pointerup",     onUp);
                document.addEventListener("pointercancel", onUp);
            });
        }

        Array.from(navRow.children).forEach(attachDrag);

        /* One observer per navRow lifetime — catches late-injected plugin items. */
        if (!navRow.dataset.stNavReorderInit) {
            navRow.dataset.stNavReorderInit = "1";
            new MutationObserver(function () {
                Array.from(navRow.children).forEach(attachDrag);
                applyOrder();
            }).observe(navRow, { childList: true });
        }
    }
    setupNavbarReorder(); /* initial pass; re-runs via consolidated watcher */

    /* ── Scene video-filter swatches ─────────────────────────────────────
       Replace the numeric read-out at the end of each colour/tonal filter
       slider (Brightness/Contrast/Gamma/Saturation/Hue/Warmth/R/G/B/Blur)
       with a round chip whose colour is that slider's OWN spectrum sampled
       at the current value — the same gradients Stash paints on the vanilla
       slider tracks (see stash-fork Scenes/styles.scss). So the Hue chip
       shows the current hue, Saturation goes grey→red, Brightness dark→light,
       Warmth cool→warm, R/G/B dark→channel, etc. Pure colour maths, updated
       live on input. Transforms (rotate/scale/aspect) are left blank. */
    function fsLerp(a, b, t) { return Math.round(a + (b - a) * t); }
    function fsRgb(r, g, b) { return "rgb(" + r + "," + g + "," + b + ")"; }
    function fsMix(c1, c2, t) {
        return fsRgb(fsLerp(c1[0], c2[0], t), fsLerp(c1[1], c2[1], t), fsLerp(c1[2], c2[2], t));
    }
    function fsTypeOf(input) {
        var c = input.classList;
        if (c.contains("brightness-slider")) { return "brightness"; }
        if (c.contains("contrast-slider")) { return "contrast"; }
        if (c.contains("gamma-slider")) { return "gamma"; }
        if (c.contains("saturation-slider")) { return "saturation"; }
        if (c.contains("hue-rotate-slider")) { return "hue"; }
        if (c.contains("white-balance-slider")) { return "warmth"; }
        if (c.contains("red-slider")) { return "red"; }
        if (c.contains("green-slider")) { return "green"; }
        if (c.contains("blue-slider")) { return "blue"; }
        /* Blur is the only unclassed colour slider (rotate/scale/aspect are
           transforms, left blank). It's uniquely max=250. */
        if (input.getAttribute("max") === "250") { return "blur"; }
        return null;
    }
    function filterSwatchColor(type, v) {
        var t;
        switch (type) {
            /* 0-200, default 100 */
            case "brightness": return fsMix([38, 38, 38], [255, 255, 255], v / 200);
            case "contrast":   return fsMix([70, 70, 70], [232, 232, 232], v / 200);
            case "gamma":      return fsMix([40, 40, 40], [240, 240, 240], v / 200);
            case "saturation": return fsMix([198, 198, 199], [255, 71, 71], v / 200);
            /* Hue-rotate 0-360 → the hue itself */
            case "hue":        return "hsl(" + v + ", 80%, 55%)";
            /* Warmth 0-200: cool blue → neutral → warm amber (vanilla stops) */
            case "warmth":
                t = v / 200;
                return t <= 0.5
                    ? fsMix([90, 138, 210], [83, 72, 72], t / 0.5)
                    : fsMix([83, 72, 72], [252, 186, 8], (t - 0.5) / 0.5);
            /* R/G/B channel gain 0-200% → dark → full channel */
            case "red":   return fsRgb(fsLerp(0, 255, v / 200), 0, 0);
            case "green": return fsRgb(0, fsLerp(0, 255, v / 200), 0);
            case "blue":  return fsRgb(0, 0, fsLerp(0, 255, v / 200));
            /* Blur 0-250: sharp slate → soft light (no vanilla gradient) */
            case "blur":  return fsMix([72, 82, 98], [200, 214, 235], v / 250);
        }
        return "rgb(128,128,128)";
    }
    /* WIP — held back from public release (user call 2026-07-28): the
       swatch treatment isn't finished. Flip to true to resume; all the
       code below and the .refract-has-swatch CSS stay in place. */
    var REFRACT_FILTER_SWATCHES_ENABLED = false;
    function setupVideoFilterSwatches() {
        if (!REFRACT_FILTER_SWATCHES_ENABLED) { return; }
        var panels = document.querySelectorAll(".scene-video-filter");
        if (!panels.length) { return; }
        for (var p = 0; p < panels.length; p++) {
            var sliders = panels[p].querySelectorAll("input[type=\"range\"].filter-slider");
            for (var i = 0; i < sliders.length; i++) {
                (function (input) {
                    var type = fsTypeOf(input);
                    if (!type) { return; }
                    var row = input.closest(".form-group");
                    if (!row) { return; }
                    var cell = row.querySelector(".filter-slider-value");
                    if (!cell) { return; }
                    cell.classList.add("refract-has-swatch");
                    var chip = cell.querySelector(".refract-swatch-chip");
                    if (!chip) {
                        chip = document.createElement("span");
                        chip.className = "refract-swatch-chip";
                        cell.appendChild(chip);
                    }
                    var paint = function () {
                        /* Re-query the chip each time: if React ever rebuilt the
                           cell, the captured node would be detached. */
                        var cur = cell.querySelector(".refract-swatch-chip");
                        if (cur) { cur.style.backgroundColor = filterSwatchColor(type, Number(input.value)); }
                        var tt = cell.querySelector(".TruncatedText");
                        if (cur && tt) { cur.title = tt.textContent; }
                    };
                    if (!input.dataset.refractSwatch) {
                        input.dataset.refractSwatch = "1";
                        input.addEventListener("input", paint);
                        input.addEventListener("change", paint);
                    }
                    paint();
                })(sliders[i]);
            }
        }
    }

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
            try { reformatSceneStats(); } catch (e) {}
            try { injectStudioName(); } catch (e) {}
            try { applyStudioTextPrefix(); } catch (e) {}
            try { applyPerformerBackControl(); } catch (e) {}
            try { applyBackClasses(); } catch (e) {}
            try { fixSceneTaggerDetails(); } catch (e) {}
            try { relocateTaggerBatchButtons(); } catch (e) {}
            try { injectTaggerSearchClose(); } catch (e) {}
            try { applyScenePlayerFixes(); } catch (e) {}
            try { refractEnhanceSourceMenu(); } catch (e) {}
            try { injectPluginToggles(); } catch (e) {}
            try { sortPluginList(); } catch (e) {}
            try { makePluginSettingsCollapsible(); } catch (e) {}
            try { injectPluginSearch(); } catch (e) {}
            try { setupTaskPluginGroups(); } catch (e) {}
            try { setupNativeTaskGroups(); } catch (e) {}
            try { setupTaskQueuePercent(); } catch (e) {}
            try { setupTaskJobChevrons(); } catch (e) {}
            try { injectNavLightToggle(); } catch (e) {}
            try { injectInterfaceLightToggleSetting(); } catch (e) {}
            try { injectInterfaceHelpToggleSetting(); } catch (e) {}
            try { injectInterfaceRefractSection(); } catch (e) {}
            try { setupNavbarReorder(); } catch (e) {}
            try { collapseDetailsTagsOverhaul(); } catch (e) {}
            try { setupOCounterLongPress(); } catch (e) {}
            try { injectMarkerSeeAllButton(); } catch (e) {}
            try { injectPerformerCardFlip(); } catch (e) {}
            try { tagBulkDateInputGroups(); } catch (e) {}
            try { setupVideoFilterSwatches(); } catch (e) {}
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

    // ── Card-control hover markers (":has(:hover)" perf replacement) ──
    // Chrome re-evaluates `:has(...:hover)` rule subjects across the whole
    // grid as elements pass under the cursor during scroll — profiled as the
    // playing-card home-page jank (style recalc, not paint; see CLAUDE.md).
    // Instead, delegated pointer events toggle plain marker classes on the
    // owning card: `.refract-check-hover` while its .card-check select
    // circle is hovered, `.refract-fav-hover` while its favourite heart is.
    // CSS consumers: 03_cards.css (rating-banner fade), 16_playing_card.css
    // (name-banner + tier-ribbon fades). The `:has(...:checked)` variants
    // stay in CSS — they only invalidate on click, not on scroll.
    (function () {
        var HOVER_SEL = ".card-check, .favorite-button";
        function classFor(hit) {
            return hit.classList.contains("favorite-button") ? "refract-fav-hover" : "refract-check-hover";
        }
        document.addEventListener("mouseover", function (e) {
            var hit = e.target.closest && e.target.closest(HOVER_SEL);
            if (!hit) return;
            var card = hit.closest(".scene-card, .performer-card");
            if (card) card.classList.add(classFor(hit));
        }, true);
        document.addEventListener("mouseout", function (e) {
            var hit = e.target.closest && e.target.closest(HOVER_SEL);
            if (!hit) return;
            // Moves between descendants of the same control are not a leave.
            if (e.relatedTarget && e.relatedTarget.closest &&
                e.relatedTarget.closest(HOVER_SEL) === hit) return;
            var card = hit.closest(".scene-card, .performer-card");
            if (card) card.classList.remove(classFor(hit));
        }, true);
    })();

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot);
    } else {
        boot();
    }
})();
