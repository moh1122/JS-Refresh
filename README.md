# 🔁 LMS Section Navigation Hard Reload Snippet

This snippet forces a **full page reload** on section/lesson navigation inside Matrix LMS (or any similar SPA-based LMS). It ensures that all embedded scripts, video players, and custom HTML snippets initialize cleanly.

---

## 💡 Problem

In LMS platforms using single-page app (SPA) routing (like Matrix LMS), navigating between lessons or sections happens via `history.pushState()` and AJAX — not full page reloads. This breaks:

- YouTube or Vimeo players (`ci_youtube_player.init()` fails)
- Custom scripts in `<script>` tags that run only on full load
- jQuery plugins (e.g. those expecting `$.browser`)
- Scripts depending on `DOMContentLoaded` or fixed DOM structure

---

## ✅ What This Fix Does

### 1. Forces page reload on all clicks to:

- Sidebar links (`.module_sections a`, `.module_link`)
- Header "Previous" / "Continue" buttons (`.sectionLink`, `.header-nav`)
- SPA-routed links using `excalibur-click="Excalibur.Router.load_toc"` or similar

```js
location.href = link.href
```

### 2. Detects programmatic navigation (like first section auto-loaded via pushState)

- Hooks into `history.pushState()` and `replaceState()`
- Reloads if navigating to `lesson_id` or `section_id`
- Prevents loops using `sessionStorage` flag

---

## 🧩 Where to Add This in Matrix LMS

**Go to:**
```
Admin → Settings → Appearance → Custom HTML
```

**Then:**

✅ Paste the following script in the **`Body Top`** section:

```html
<script>
(function(){
  if (window.__ciHooksBound) return;
  window.__ciHooksBound = true;

  function debounce(fn, ms){ var t; return function(){ clearTimeout(t); t=setTimeout(fn,ms); }; }

  // Unified signal
  window.__ciRequestReinit = debounce(function(){
    document.dispatchEvent(new Event('ci:reinit', { bubbles:true }));
  }, 150);

  // Intercept clicks on sidebar + header nav links
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    const selector = [
      'a.module_link',
      '.module_sections a[href*="/show/"]',
      'a.sectionLink',
      'a.header-nav.sectionLink',
      'a[excalibur-click*="Router.load_toc"]',
      'a[excalibur-click*="load_toc"]',
      'a[rel="next"]', 'a[rel="prev"]',
      '.pager a[href*="/show/"]'
    ].join(',');

    const link = e.target.closest(selector);
    if (!link) return;

    if (!link.href || new URL(link.href, location.href).origin !== location.origin) return;

    e.preventDefault();
    location.href = link.href;
  }, true);

  // Intercept history API programmatic navigations (e.g. first-section auto-load)
  (function interceptHistory() {
    if (window.__ciHistoryHardReloadBound) return;
    window.__ciHistoryHardReloadBound = true;

    function shouldHardReload(url) {
      try {
        const u = new URL(url, location.href);
        if (u.origin !== location.origin) return false;
        if (!/\/instructor_module\/show\//.test(u.pathname)) return false;
        return u.searchParams.has('lesson_id') || u.searchParams.has('section_id');
      } catch { return false; }
    }

    function markOnce(url) {
      try {
        const key = 'ci_hard_reload_' + new URL(url, location.href).href;
        if (sessionStorage.getItem(key)) return false;
        sessionStorage.setItem(key, '1');
        return true;
      } catch { return true; }
    }

    function hardNavigate(url) {
      if (markOnce(url)) location.href = url;
    }

    function wrap(method) {
      const orig = history[method];
      if (!orig || history['__ci_wrapped_' + method]) return;
      history['__ci_wrapped_' + method] = true;
      history[method] = function (state, title, url) {
        if (url && shouldHardReload(url)) {
          hardNavigate(url);
          return;
        }
        return orig.apply(this, arguments);
      };
    }

    wrap('pushState');
    wrap('replaceState');

    window.addEventListener('popstate', function () {
      const url = location.href;
      if (shouldHardReload(url) && markOnce(url)) {
        location.reload();
      }
    });
  })();
})();
</script>
```

---

## 🧪 Why This Works

SPA navigation breaks most script behaviors that rely on:

- `DOMContentLoaded` or page load
- DOM being in a fresh state
- Script tags re-executing

By forcing `location.href = ...`, we reset the full page lifecycle.

---

## 🧼 Optional

Once this is in place, you can **remove** most:
- MutationObserver hacks
- Custom `ci_youtube_player.init()` rebinds
- Manual video.js reloads

---

## ✅ Outcome

- All lessons and sections load cleanly
- Video players always work
- Custom scripts re-run reliably
- No duplicate logs or errors

---
