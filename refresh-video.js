<script>
(function(){
  if (window.__ciFirstVideoFixV3) return;
  window.__ciFirstVideoFixV3 = true;

  try { history.scrollRestoration = 'manual'; } catch {}

  const POLL_MS   = 60;   
  const MAX_TRIES = 12;   
  const MIN_OK_H  = 140;  

  function firstVideoEl() {
    return document.querySelector(
      '#player-container-1 .video-js,' +
      '.ci-youtube-player .video-js,' +
      '#centreColumn .video-js,' +
      '.materialStyle .video-js,' +
      '.course-content .video-js,' +
      '.max_user_content_width .video-js'
    );
  }

  function refreshLayout(v) {
    if (!v) return;
    v.classList.add('vjs-fluid');
    v.style.width = '100%';
    v.style.maxWidth = '100%';
    v.removeAttribute('height');

    const wrap = v.closest('.player-wrapper, .ci-youtube-player, #player-container-1');
    if (wrap) wrap.style.removeProperty('height');

    if (window.videojs && videojs.getAllPlayers) {
      try {
        videojs.getAllPlayers().forEach(p => {
          try { p.resize && p.resize(); } catch {}
          try { p.trigger && p.trigger('playerresize'); } catch {}
        });
      } catch {}
    }
    setTimeout(() => window.dispatchEvent(new Event('resize')), 40);
    setTimeout(() => window.dispatchEvent(new Event('resize')), 200);
  }

  function needsRebuild(v) {
    if (!v) return false;
    const noIframe = !v.querySelector('iframe');
    const tooSmall = v.clientHeight && v.clientHeight < MIN_OK_H;
    return noIframe || tooSmall;
  }

  function rebuildOnce(v){
    if (!v || !window.videojs) return;

    const vid = v.getAttribute('data-video-id') || v.dataset.videoId;
    if (!vid) return;

    if (!v.id) v.id = 'ci_vjs_' + Date.now();

    try {
      const existing = (videojs.getPlayer ? videojs.getPlayer(v.id) : (videojs.players && videojs.players[v.id]));
      if (existing) existing.dispose();
    } catch {}

    const clone = v.cloneNode(true);
    v.parentNode.replaceChild(clone, v);

    clone.classList.add('video-js','vjs-default-skin','vjs-fluid');
    clone.style.width = '100%';
    clone.style.maxWidth = '100%';
    clone.removeAttribute('height');
    clone.setAttribute('data-video-id', vid);

    try {
      videojs(clone, {
        techOrder: ['youtube'],
        sources: [{ type: 'video/youtube', src: 'https://www.youtube.com/watch?v=' + vid }]
      });
    } catch {}

    setTimeout(() => refreshLayout(clone), 80);
  }

  function whenPlayerReadyThenHeal() {
    let tries = 0;
    (function tick() {
      const v = firstVideoEl();
      const attached = v && (
        v.querySelector('iframe, .vjs-tech, video') ||
        (window.videojs && videojs.getAllPlayers && videojs.getAllPlayers().length)
      );

      if (attached || tries >= MAX_TRIES) {
        const node = v || firstVideoEl();
        refreshLayout(node);
        // Only rebuild if clearly bad after a short settle
        setTimeout(() => { if (needsRebuild(node)) rebuildOnce(node); }, 120);
      } else {
        tries++; setTimeout(tick, POLL_MS);
      }
    })();
  }

  function firstBlockLooksLikeVideo() {
    const content = document.querySelector('.materialStyle, .course-content, .max_user_content_width');
    if (!content) return false;
    const fc = content.firstElementChild;
    return !!(fc && (fc.matches('.video-js, .ci-youtube-player, .player-wrapper') || fc.querySelector('.video-js')));
  }

  function onArrival() {
    const flagged = sessionStorage.getItem('ci_fix_first_video') === '1';
    if (flagged || firstBlockLooksLikeVideo()) {
      try { sessionStorage.removeItem('ci_fix_first_video'); } catch {}
      window.scrollTo(0, 0);
      whenPlayerReadyThenHeal();
    }
  }

  if (document.readyState === 'complete') onArrival();
  else window.addEventListener('load', onArrival, { once:true });
  window.addEventListener('pageshow', e => { if (e.persisted) setTimeout(onArrival, 40); });
})();
</script>
