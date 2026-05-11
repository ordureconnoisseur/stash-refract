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
        var stale = [];
        document.body.classList.forEach(function (c) {
            if (c.indexOf("refract-") === 0) { stale.push(c); }
        });
        stale.forEach(function (c) { document.body.classList.remove(c); });
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
                )
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
    var GRAPHQL_URL = "/graphql";

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
        document.querySelectorAll(".rating-banner").forEach(function (el) {
            var raw = (el.textContent || "").replace(/\s+/g, " ").trim();
            if (!raw) { return; }
            var m = raw.match(/(\d+(?:\.\d+)?)/);
            if (!m) { return; }
            var num = m[1];
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
                safeRun(initSlickCarousels);
                safeRun(initFilterBar);
                safeRun(initFilterButtonBadge);
                safeRun(initViewModeDropdown);
                safeRun(initTabScrollChevrons);
                safeRun(initFloatingPager);
                safeRun(disableTableOverflowable);
                safeRun(markFilledStars);
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
            card.style.animation = "none"; /* kill fill-mode that overrides tilt transform */
            card.style.willChange = "transform";
            /* Brief enter transition so the lift (scale + tilt) eases in from
               rest instead of snapping instantly. After it lands we switch
               to no-transition for snappy mouse tracking. */
            card.style.transition = "transform 0.22s " + TILT_EASING;
            card.style.zIndex = "10";
            if (enterTimer) { clearTimeout(enterTimer); }
            enterTimer = setTimeout(function () {
                /* Only drop the transition if the cursor is still on the card. */
                if (card.style.zIndex === "10") {
                    card.style.transition = "none";
                }
                enterTimer = null;
            }, 220);
        }

        function onMove(e) {
            if (raf) { cancelAnimationFrame(raf); }
            raf = requestAnimationFrame(function () { applyTilt(e); });
        }

        function onLeave() {
            if (raf) { cancelAnimationFrame(raf); raf = null; }
            if (enterTimer) { clearTimeout(enterTimer); enterTimer = null; }
            card.style.willChange = "auto";
            card.style.zIndex = "";
            card.style.transition = "transform " + TILT_RESET_MS + "ms " + TILT_EASING + ", box-shadow 0.22s ease";
            card.style.transform =
                "perspective(" + TILT_PERSPECTIVE + "px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)";
            if (glareInner) { glareInner.style.opacity = "0"; }
        }

        card.addEventListener("mouseenter", onEnter);
        card.addEventListener("mousemove", onMove);
        card.addEventListener("mouseleave", onLeave);
    }

    function initCardTilts() {
        if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) { return; }
        document.querySelectorAll(".grid-card").forEach(function (card) {
            cardTiltBind(card);
        });
        document.querySelectorAll(".wall-item").forEach(function (card) {
            cardTiltBind(card);
        });
    }

    /* ── Scene card performer circles ───────────────────────────────── */

    var QUERY_SCENE_CARDS =
        'query SceneCards($ids: [Int]) { findScenes(scene_ids: $ids) {' +
        '  scenes { id performers { id name } tags { id } }' +
        '} }';

    var MAX_PERFORMER_CIRCLES = 5;

    var TAG_ICON_SVG =
        '<svg class="stash-tag-icon" viewBox="0 0 512 512" aria-hidden="true">' +
        '<path fill="currentColor" d="M32.5 96l0 149.5c0 17 6.7 33.3 18.7 45.3l192 192c25 25 65.5 25 90.5 0L483.2 333.3c25-25 25-65.5 0-90.5l-192-192C279.2 38.7 263 32 246 32L96.5 32c-35.3 0-64 28.7-64 64zm112 16a32 32 0 1 1 0 64 32 32 0 1 1 0-64z"/>' +
        '</svg>';

    function extractSceneId(card) {
        var a = card.querySelector('a[href^="/scenes/"]');
        if (!a) { return null; }
        var m = (a.getAttribute("href") || "").match(/\/scenes\/(\d+)/);
        return m ? parseInt(m[1], 10) : null;
    }

    function stopProp(e) { e.stopPropagation(); }

    function injectPerformerCircles(card, performers, tagCount, sceneId) {
        if (card.querySelector(".stash-performer-circles")) { return; }
        var section = card.querySelector(".card-section");
        if (!section) { return; }

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

        if (tagCount > 0) {
            var badge = document.createElement("a");
            badge.className = "stash-tag-count";
            badge.href = sceneId ? "/scenes/" + sceneId : "/tags";
            badge.addEventListener("click", stopProp);
            badge.innerHTML = TAG_ICON_SVG + String(tagCount);
            row.appendChild(badge);
        }

        section.appendChild(row);
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
                ids.push(id);
                cardMap[id] = card;         /* int key */
                cardMap[String(id)] = card; /* string key — GQL returns id as string */
            }
        });

        if (!ids.length) { return; }

        var q = 'query { findScenes(scene_ids: [' + ids.join(',') + ']) {' +
                '  scenes { id performers { id name } tags { id } }' +
                '} }';
        gql(q)
            .then(function (res) {
                var scenes = res.data && res.data.findScenes && res.data.findScenes.scenes || [];
                scenes.forEach(function (scene) {
                    var card = cardMap[String(scene.id)] || cardMap[parseInt(scene.id, 10)];
                    if (!card) { return; }
                    injectPerformerCircles(card, scene.performers || [], (scene.tags || []).length, scene.id);
                });
            })
            .catch(function () { /* ignore */ });
    }

    /* ── Performer card redesign ─────────────────────────────────────── */

    var PLAY_SVG =
        '<svg viewBox="0 0 512 512" width="10" height="10" fill="currentColor" aria-hidden="true">' +
        '<path d="M188.3 147.1c-7.6 4.2-12.3 12.3-12.3 20.9l0 176c0 8.7 4.7 16.7 12.3 20.9' +
        's16.8 4.1 24.3-.5l144-88c7.1-4.4 11.5-12.1 11.5-20.5s-4.4-16.1-11.5-20.5l-144-88' +
        'c-7.4-4.5-16.7-4.7-24.3-.5z"/></svg>';

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
            if (!section) { return; }

            var row = document.createElement("div");
            row.className = "stash-perf-stats";

            /* Age */
            if (ageEl) {
                var ageText = ageEl.textContent.replace(/\s*years?\s+old/gi, "").trim();
                if (ageText) {
                    var ageSpan = document.createElement("span");
                    ageSpan.className = "stash-perf-age";
                    ageSpan.textContent = ageText;
                    row.appendChild(ageSpan);
                }
                ageEl.style.display = "none";
            }

            /* Scene count */
            if (sceneLink) {
                var countEl = sceneLink.querySelector("span");
                var countText = countEl ? countEl.textContent.trim() : "";
                var scenesA = document.createElement("a");
                scenesA.className = "stash-perf-scenes";
                scenesA.href = sceneLink.getAttribute("href") || "#";
                scenesA.addEventListener("click", stopProp);
                scenesA.innerHTML = PLAY_SVG + escapeHtml(countText);
                row.appendChild(scenesA);
            }

            section.appendChild(row);

            if (hr) { hr.style.display = "none"; }
            if (popovers) { popovers.style.display = "none"; }
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

    /* Lift .scene-performers out of its parent .col-12 (where it sits next
       to description/tags) into a new sibling .row, so it visually breaks
       out of the description-tags card on the Details tab. Idempotent. */
    function fixSceneDetailsLayout() {
        document.querySelectorAll(".tab-pane .col-12 > .scene-performers").forEach(function (el) {
            if (el.dataset.sthMoved === "1") return;
            /* `.scene-performers` is itself a `.row`, so .closest(".row") would
               return the element itself. Walk up to the outer row that wraps the
               .col-12 instead. */
            var col = el.parentElement;
            if (!col || !col.classList.contains("col-12")) return;
            var outerRow = col.parentElement;
            if (!outerRow || !outerRow.classList.contains("row") || !outerRow.parentElement) return;
            var newRow = document.createElement("div");
            newRow.className = "row scene-performers-row";
            newRow.appendChild(el);
            outerRow.insertAdjacentElement("afterend", newRow);
            el.dataset.sthMoved = "1";
        });
    }

    /* Wrap the run of `.tag-item` pills that follows the "Tags" <h6> on the
       scene-details panel into a single `.st-tag-list` container, so we
       can constrain it to a 5-row column-wrap strip with horizontal
       overflow scroll (mirrors the performer-card strip below it). */
    function wrapSceneTagList() {
        document.querySelectorAll(".scene-tabs .tab-pane .col-12").forEach(function (col) {
            if (col.dataset.sthTagList === "1") return;
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
            var wrapper = document.createElement("div");
            wrapper.className = "st-tag-list";
            tagsHeading.insertAdjacentElement("afterend", wrapper);
            tagNodes.forEach(function (t) { wrapper.appendChild(t); });
            col.dataset.sthTagList = "1";
        });
    }

    /* ── Gallery image card: click image → open lightbox ─────────────
       Stash's native hover-revealed lightbox-trigger icon is hidden by
       theme card styling on these builds. Route the image click to
       whichever underlying trigger Stash renders for that card. */
    function findImageLightboxTrigger(card) {
        return card.querySelector(
            ".preview-button button, .preview-button, .image-card-preview .btn-primary, " +
            ".image-card-preview, .zoom-link, .preview-link, " +
            ".card-popovers button, .card-popovers a, " +
            "button[title*='preview' i], button[aria-label*='preview' i], button[title*='zoom' i], " +
            "a[title*='preview' i]"
        );
    }

    /* Delegated handler — one body-level click listener catches every
       .image-card image click regardless of when React re-renders the
       cards. Replaces the previous per-card binding which relied on the
       MutationObserver scheduler firing in time after every re-render. */
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

    /* Image lists (standalone /images, gallery → Images tab): the global
       sticky-centered toolbar design (top:5rem, margin:0 auto, fit-content
       pill) detaches visually from image-list content. Force inline
       static + full-width on these toolbars; the CSS sibling rule
       hides the ::before pill. */
    function unstickyGalleryToolbar() {
        document.querySelectorAll(".image-list .filtered-list-toolbar").forEach(function (el) {
            el.style.setProperty("position", "static", "important");
            el.style.setProperty("top", "auto", "important");
            el.style.setProperty("bottom", "auto", "important");
            el.style.setProperty("margin-left", "0", "important");
            el.style.setProperty("margin-right", "0", "important");
            el.style.setProperty("width", "100%", "important");
            el.style.setProperty("max-width", "none", "important");
        });
        /* Clean up any sidebars accidentally tagged by older versions
           of initFilterBar — the inline-style override we used to apply
           visually broke the sidebar layout. */
        document.querySelectorAll(".sidebar[data-stash-filter]").forEach(function (el) {
            el.removeAttribute("data-stash-filter");
            ["position", "top", "bottom", "margin-left", "margin-right", "width", "max-width"].forEach(function (p) {
                el.style.removeProperty(p);
            });
        });
    }

    function applyScenePlayerFixes() {
        injectScenePlayerOverlay();
        fixSceneDetailsLayout();
        wrapSceneTagList();
        initImageCardLightbox();
        unstickyGalleryToolbar();
    }

    applyScenePlayerFixes(); /* initial pass; re-runs via consolidated watcher */

    // Replace home-page "View All" anchor text with an empty content so CSS can
    // overlay a chevron via ::after without fighting other rules' specificity.
    // Re-runs on mutation so React rehydration doesn't restore the text.
    function tagViewAllLinks() {
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
        var lightbox = document.querySelector(".Lightbox");
        if (!lightbox || lightbox.dataset.stConsolidated === "1") return;
        var header = lightbox.querySelector(".Lightbox-header");
        var footer = lightbox.querySelector(".Lightbox-footer");
        if (!header || !footer) return;
        var footerLeft = footer.querySelector(".Lightbox-footer-left");
        var footerRight = footer.querySelector(".Lightbox-footer-right");
        var indicator = header.querySelector(".Lightbox-header-indicator");
        var headerRight = header.querySelector(".Lightbox-header-right");
        if (indicator && footerLeft) {
            safeInsertBefore(footerLeft, indicator, footerLeft.firstChild);
        }
        if (headerRight && footerRight) {
            while (headerRight.firstChild) {
                footerRight.appendChild(headerRight.firstChild);
            }
        }
        lightbox.dataset.stConsolidated = "1";
    }
    consolidateLightbox(); /* initial pass; re-runs via consolidated watcher */

    // Scene header studio name: Stash renders only the studio logo as an
    // <img> inside <h1.studio-logo><a><img alt="…"></a></h1>; the visible
    // studio name lives only in the alt attribute. Theme CSS hides the
    // image, so without intervention nothing shows. Inject a sibling
    // <span class="st-studio-name"> alongside the image carrying the alt
    // text, so it becomes visible (CSS styles it like a label).
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

    /* ── Consolidated mutation watcher ──────────────────────────────────
       Single global MutationObserver feeding all body-wide DOM watchers.
       Replaces 7 separate body-subtree observers — each used to fire on
       every DOM mutation, triggering 7 separate setTimeouts and 7 separate
       full-document scans. Now one observer, one debounce, one pass. */
    (function consolidatedMutationWatcher() {
        var _t = null;
        function runAll() {
            _t = null;
            try { tagViewAllLinks(); } catch (e) {}
            try { consolidateLightbox(); } catch (e) {}
            try { injectStudioName(); } catch (e) {}
            try { fixSceneTaggerDetails(); } catch (e) {}
            try { applyScenePlayerFixes(); } catch (e) {}
            try { injectPluginToggles(); } catch (e) {}
            try { makePluginSettingsCollapsible(); } catch (e) {}
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
