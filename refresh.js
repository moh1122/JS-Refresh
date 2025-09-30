<script>
document.addEventListener('click', function (e) {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

  const selector = [
    'a.module_link',
    '.module_sections a[href*="/show/"]',
    'a.sectionLink',
    'a.header-nav.sectionLink',
    'a[excalibur-click*="Router.load_toc"]',
    'a[excalibur-click*="load_toc"]',
    'a[rel="next"]','a[rel="prev"]',
    '.pager a[href*="/show/"]'
  ].join(',');

  const link = e.target.closest(selector);
  if (!link) return;
  if (!link.href || new URL(link.href, location.href).origin !== location.origin) return;

  const isPrevNext = link.matches(
    'a.sectionLink, .section_header_wrap a.sectionLink, a.align_right.sectionLink,' +
    'a.header-nav.sectionLink, a[rel="next"], a[rel="prev"]'
  );
  if (isPrevNext) {
    try { sessionStorage.setItem('ci_fix_first_video', '1'); } catch {}
  }

  e.preventDefault();
  location.href = link.href; // full page reload
}, true);
</script>

<script>
(function () {
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
    try { sessionStorage.setItem('ci_fix_first_video', '1'); } catch {}
    if (markOnce(url)) location.href = url; // full load
  }

  function wrap(method) {
    const orig = history[method];
    if (!orig || history['__ci_wrapped_' + method]) return;
    history['__ci_wrapped_' + method] = true;
    history[method] = function (state, title, url) {
      if (url && shouldHardReload(url)) { hardNavigate(url); return; }
      return orig.apply(this, arguments);
    };
  }

  wrap('pushState');
  wrap('replaceState');

  window.addEventListener('popstate', function () {
    const url = location.href;
    if (shouldHardReload(url) && markOnce(url)) location.reload();
  });
})();
</script>
