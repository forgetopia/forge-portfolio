interface ConnectionPreference extends EventTarget {
  readonly saveData?: boolean;
}

/** Desktop previews are decorative: a single hovered clip loads, then unloads on exit. */
export function initCardPreviews() {
  const desktopPointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const connection = (navigator as Navigator & { connection?: ConnectionPreference }).connection;
  let stopActive: (() => void) | undefined;
  const cancelHoverIntents: Array<() => void> = [];

  const stopPreviews = () => {
    cancelHoverIntents.forEach((cancel) => cancel());
    stopActive?.();
  };

  const allowed = () => desktopPointer.matches && !reducedMotion.matches && !connection?.saveData && !document.hidden;

  document.querySelectorAll<HTMLElement>('[data-project-card]').forEach((card) => {
    if (card.dataset.previewInitialized === 'true') return;
    const video = card.querySelector<HTMLVideoElement>('[data-card-preview]');
    const status = card.querySelector<HTMLElement>('[data-card-preview-status]');
    if (!video || !status || !video.dataset.src) return;

    let requestId = 0;
    let wantsPlayback = false;
    let hoverIntent = false;
    let visible = true;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    video.defaultMuted = true;
    video.muted = true;

    const clearTimeoutIfNeeded = () => {
      if (timeout !== undefined) clearTimeout(timeout);
      timeout = undefined;
    };

    const stop = () => {
      requestId += 1;
      wantsPlayback = false;
      hoverIntent = false;
      clearTimeoutIfNeeded();
      video.pause();
      try { video.currentTime = 0; } catch { /* Unloaded media may not expose a seekable timeline. */ }
      if (video.hasAttribute('src')) {
        video.removeAttribute('src');
        video.load();
      }
      card.dataset.previewState = 'idle';
      status.textContent = '';
      status.hidden = true;
      if (stopActive === stop) stopActive = undefined;
    };

    const fail = () => {
      stop();
      card.dataset.previewState = 'error';
      status.textContent = 'Preview unavailable · Poster shown';
      status.hidden = false;
    };

    const start = async () => {
      if (!allowed() || card.hidden || !visible || wantsPlayback) return;
      stopActive?.();
      stopActive = stop;
      const thisRequest = ++requestId;
      wantsPlayback = true;
      card.dataset.previewState = 'loading';
      status.textContent = 'Loading preview…';
      status.hidden = false;
      video.muted = true;
      video.src = video.dataset.src!;
      timeout = setTimeout(() => { if (wantsPlayback) fail(); }, 8_000);

      try {
        await video.play();
        // Late resolutions must not resume a card after exit, filtering, or preference changes.
        if (!wantsPlayback || !allowed() || card.hidden || !visible) video.pause();
      } catch {
        if (thisRequest === requestId && wantsPlayback) fail();
      }
    };

    video.addEventListener('playing', () => {
      if (!wantsPlayback || !allowed() || card.hidden || !visible) {
        video.pause();
        return;
      }
      clearTimeoutIfNeeded();
      card.dataset.previewState = 'playing';
      status.textContent = video.dataset.placeholder === 'true' ? 'Placeholder preview · Muted' : 'Preview · Muted';
      status.hidden = false;
    });
    video.addEventListener('error', () => { if (wantsPlayback) fail(); });
    video.addEventListener('waiting', () => {
      if (!wantsPlayback) return;
      card.dataset.previewState = 'loading';
      status.textContent = 'Loading preview…';
      clearTimeoutIfNeeded();
      timeout = setTimeout(() => { if (wantsPlayback) fail(); }, 8_000);
    });
    card.addEventListener('pointerenter', (event) => {
      hoverIntent = event.pointerType === 'mouse' && allowed() && !card.hidden;
      if (hoverIntent) void start();
    });
    card.addEventListener('pointerleave', stop);
    cancelHoverIntents.push(() => { hoverIntent = false; });

    // Filters hide articles without replacing the grid; release any clip immediately.
    new MutationObserver(() => { if (card.hidden && (wantsPlayback || hoverIntent)) stop(); }).observe(card, { attributes: true, attributeFilter: ['hidden'] });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        visible = entries.some((entry) => entry.isIntersecting);
        if (!visible && wantsPlayback) stop();
        // Scrolling can dispatch pointerenter before the observer updates its cached visibility.
        // Retry only the same eligible mouse hover; leaving or pausing clears its intent.
        if (visible && hoverIntent && card.matches(':hover')) void start();
      }).observe(card);
    }
    card.dataset.previewInitialized = 'true';
  });

  document.addEventListener('visibilitychange', () => { if (document.hidden) stopPreviews(); });
  window.addEventListener('pagehide', stopPreviews);
  document.addEventListener('forge:lightbox-open', stopPreviews);
  desktopPointer.addEventListener('change', () => { if (!allowed()) stopPreviews(); });
  reducedMotion.addEventListener('change', () => { if (!allowed()) stopPreviews(); });
  connection?.addEventListener('change', () => { if (!allowed()) stopPreviews(); });
}
