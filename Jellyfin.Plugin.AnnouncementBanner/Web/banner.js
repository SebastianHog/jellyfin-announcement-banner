/* Announcement Banner for Jellyfin. Loaded into the web client by the plugin. */
(function () {
    'use strict';

    if (window.AnnouncementBanner) {
        return;
    }

    var BANNER_ID = 'announcementBanner';
    var STORAGE_KEY = 'announcementBanner.dismissed';
    var HEIGHT_VAR = '--announcement-banner-height';

    var script = document.currentScript;
    var configUrl = script && script.src
        ? script.src.replace(/banner\.js(?:\?.*)?$/, 'config')
        : '../AnnouncementBanner/config';

    var resizeObserver = null;

    var CSS = [
        '.announcementBanner{position:relative;box-sizing:border-box;display:flex;align-items:center;width:100%;',
        'padding:.35em 2.6em;line-height:1.3;overflow-wrap:anywhere;font-family:inherit;}',
        '.announcementBanner-text{flex:1 1 auto;min-width:0;}',
        '.announcementBanner a{color:var(--announcement-banner-link,inherit);text-decoration:underline;font-weight:600;}',
        '.announcementBanner-close{position:absolute;right:.35em;top:50%;transform:translateY(-50%);',
        'background:none;border:0;color:inherit;font:inherit;font-size:1.4em;line-height:1;padding:.15em .35em;',
        'cursor:pointer;opacity:.75;}',
        '.announcementBanner-close:hover,.announcementBanner-close:focus-visible{opacity:1;}',
        '#announcementBanner{position:fixed;top:0;left:0;right:0;z-index:1101;}',
        // Make room for the banner: push page content and the fixed headers down.
        // margin-top (not top) so bars pinned to the bottom (top:auto; bottom:0), e.g. mobile tab bars
        // added by plugins/themes, stay where they are instead of being stretched over the page.
        'body.announcementBanner-active{padding-top:var(' + HEIGHT_VAR + ',0px)!important;}',
        'body.announcementBanner-active .skinHeader,',
        'body.announcementBanner-active .MuiAppBar-positionFixed{margin-top:var(' + HEIGHT_VAR + ',0px)!important;}',
        // Only side drawers (the dashboard menu); bottom-anchored drawers, e.g. mobile tab bars, are left alone.
        'body.announcementBanner-active .MuiDrawer-paperAnchorDockedLeft,',
        'body.announcementBanner-active .MuiDrawer-paperAnchorDockedRight{top:var(' + HEIGHT_VAR + ',0px);',
        'height:calc(100% - var(' + HEIGHT_VAR + ',0px));}',
        // Get out of the way during video playback.
        'body:has(>.videoPlayerContainer) #announcementBanner{display:none;}'
    ].join('');

    function toInt(value, min, max, fallback) {
        var n = parseInt(value, 10);
        return isNaN(n) ? fallback : Math.min(max, Math.max(min, n));
    }

    // Only allow http(s) and mailto links; relative links (e.g. #/details?id=...) resolve against the page.
    function safeUrl(value) {
        try {
            var url = new URL(String(value || '').trim(), window.location.href);
            return /^(https?|mailto):$/.test(url.protocol) ? url : null;
        } catch (e) {
            return null;
        }
    }

    function escapeRegExp(s) {
        return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // Appends the message to `parent` as text, turning configured words into links.
    function appendMessage(parent, message, links) {
        var urls = {};
        var words = [];
        (links || []).forEach(function (link) {
            var word = String((link && link.Word) || '').trim();
            var url = link && safeUrl(link.Url);
            if (word && url && !urls[word.toLowerCase()]) {
                urls[word.toLowerCase()] = url;
                words.push(word);
            }
        });

        if (!words.length) {
            parent.appendChild(document.createTextNode(message));
            return;
        }

        // Longest first, so "Discord server" wins over "Discord". Whole words only.
        var alternatives = words.sort(function (a, b) { return b.length - a.length; }).map(escapeRegExp).join('|');
        var pattern;
        try {
            pattern = new RegExp('(^|[^\\p{L}\\p{N}_])(' + alternatives + ')(?=$|[^\\p{L}\\p{N}_])', 'giu');
        } catch (e) {
            pattern = new RegExp('(^|\\W)(' + alternatives + ')(?=$|\\W)', 'gi');
        }

        var last = 0;
        var match;
        while ((match = pattern.exec(message)) !== null) {
            var start = match.index + match[1].length;
            var url = urls[match[2].toLowerCase()];
            if (!url) {
                continue;
            }

            parent.appendChild(document.createTextNode(message.slice(last, start)));
            var a = document.createElement('a');
            a.href = url.href;
            a.textContent = match[2];
            if (url.origin !== window.location.origin) {
                a.target = '_blank';
                a.rel = 'noopener noreferrer';
            }

            parent.appendChild(a);
            last = start + match[2].length;
        }

        parent.appendChild(document.createTextNode(message.slice(last)));
    }

    function createBanner(cfg) {
        var align = ['left', 'center', 'right'].indexOf(cfg.TextAlign) >= 0 ? cfg.TextAlign : 'center';

        var el = document.createElement('div');
        el.className = 'announcementBanner';
        el.setAttribute('role', 'region');
        el.setAttribute('aria-label', 'Announcement');
        el.style.backgroundColor = cfg.BackgroundColor || '#00a4dc';
        el.style.color = cfg.TextColor || '#ffffff';
        el.style.fontSize = toInt(cfg.FontSize, 8, 72, 15) + 'px';
        el.style.minHeight = toInt(cfg.Height, 16, 400, 40) + 'px';
        el.style.fontWeight = cfg.Bold ? '600' : '';
        el.style.textAlign = align;
        if (cfg.LinkColor) {
            el.style.setProperty('--announcement-banner-link', cfg.LinkColor);
        }

        var text = document.createElement('div');
        text.className = 'announcementBanner-text';
        appendMessage(text, String(cfg.Message || ''), cfg.Links);
        el.appendChild(text);

        if (cfg.Dismissible) {
            var close = document.createElement('button');
            close.type = 'button';
            close.className = 'announcementBanner-close';
            close.setAttribute('aria-label', 'Close announcement');
            close.textContent = '×';
            el.appendChild(close);
        }

        return el;
    }

    // Changes whenever the message or links change, so a dismissed banner comes back for new announcements.
    function signature(cfg) {
        var s = JSON.stringify([cfg.Message || '', cfg.Links || []]);
        var hash = 5381;
        for (var i = 0; i < s.length; i++) {
            hash = ((hash << 5) + hash + s.charCodeAt(i)) | 0;
        }

        return String(hash);
    }

    function storage(key, value) {
        try {
            if (value === undefined) {
                return window.localStorage.getItem(key);
            }

            window.localStorage.setItem(key, value);
        } catch (e) {
            // Storage can be unavailable (private mode, some TV clients); the banner just won't stay dismissed.
        }

        return null;
    }

    function unmount() {
        var existing = document.getElementById(BANNER_ID);
        if (existing) {
            existing.parentNode.removeChild(existing);
        }

        if (resizeObserver) {
            resizeObserver.disconnect();
            resizeObserver = null;
        }

        document.body.classList.remove('announcementBanner-active');
        document.documentElement.style.removeProperty(HEIGHT_VAR);
    }

    function mount(cfg) {
        unmount();
        if (!cfg || !cfg.Enabled || !String(cfg.Message || '').trim()) {
            return;
        }

        var sig = signature(cfg);
        if (cfg.Dismissible && storage(STORAGE_KEY) === sig) {
            return;
        }

        var el = createBanner(cfg);
        el.id = BANNER_ID;

        var close = el.querySelector('.announcementBanner-close');
        if (close) {
            close.addEventListener('click', function () {
                storage(STORAGE_KEY, sig);
                unmount();
            });
        }

        document.body.insertBefore(el, document.body.firstChild);
        document.body.classList.add('announcementBanner-active');

        // Keep the page offset equal to the real banner height (text can wrap on small screens,
        // and the banner is hidden during video playback).
        var update = function () {
            document.documentElement.style.setProperty(HEIGHT_VAR, el.offsetHeight + 'px');
        };
        update();
        if (window.ResizeObserver) {
            resizeObserver = new ResizeObserver(update);
            resizeObserver.observe(el);
        }
    }

    function refresh() {
        return fetch(configUrl, { cache: 'no-store', headers: { Accept: 'application/json' } })
            .then(function (response) {
                return response.ok ? response.json() : null;
            })
            .then(mount)
            .catch(function (err) {
                console.warn('[AnnouncementBanner] could not load settings', err);
            });
    }

    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    // Used by the plugin's settings page for the live preview and to apply changes right after saving.
    window.AnnouncementBanner = { createBanner: createBanner, refresh: refresh };

    refresh();
})();
