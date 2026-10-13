/** Native controls remain usable without JavaScript; enhancement adds feedback and recovery. */
export function initProjectPlayers() {
  document.querySelectorAll<HTMLElement>('[data-project-player]').forEach((player) => {
    if (player.dataset.initialized === 'true') return;

    const video = player.querySelector<HTMLVideoElement>('[data-project-video]');
    const poster = player.querySelector<HTMLImageElement>('[data-player-poster]');
    const overlay = player.querySelector<HTMLElement>('[data-player-overlay]');
    const start = player.querySelector<HTMLButtonElement>('[data-player-start]');
    const action = player.querySelector<HTMLElement>('[data-player-action]');
    const retry = player.querySelector<HTMLButtonElement>('[data-player-retry]');
    const status = player.querySelector<HTMLElement>('[data-player-status]');
    if (!video || !poster || !overlay || !start || !action || !retry || !status) return;

    let intendedPlayback = false;
    let hasStarted = false;
    let request = 0;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const source = video.getAttribute('src') ?? '';
    const title = start.dataset.filmTitle ?? 'project film';
    const canRestorePlayerFocus = () => player.contains(document.activeElement)
      && !document.querySelector('dialog[open]') && !document.hidden;

    const clearTimeoutForLoad = () => {
      if (timeout !== undefined) clearTimeout(timeout);
      timeout = undefined;
    };

    const setAction = (label: 'Play' | 'Resume' | 'Replay') => {
      action.textContent = `${label} film`;
      start.setAttribute('aria-label', `${label} film: ${title}`);
    };

    const fail = () => {
      const restoreFocus = canRestorePlayerFocus();
      request += 1;
      intendedPlayback = false;
      clearTimeoutForLoad();
      player.dataset.playerState = 'error';
      video.pause();
      video.removeAttribute('src');
      video.load();
      video.hidden = true;
      poster.hidden = false;
      overlay.hidden = true;
      retry.hidden = false;
      status.textContent = 'Video unavailable. The poster is shown instead. You can retry playback.';
      if (restoreFocus) retry.focus({ preventScroll: true });
    };

    const loading = () => {
      if (!intendedPlayback || player.dataset.playerState === 'error') return;
      player.dataset.playerState = 'loading';
      status.textContent = 'Loading film…';
      clearTimeoutForLoad();
      timeout = setTimeout(fail, 12_000);
    };

    const pauseForContext = () => {
      if (!intendedPlayback && video.paused) return;
      request += 1;
      intendedPlayback = false;
      clearTimeoutForLoad();
      video.pause();
      if (player.dataset.playerState === 'error') return;
      player.dataset.playerState = video.ended ? 'ended' : 'paused';
      overlay.hidden = false;
      setAction(video.ended ? 'Replay' : hasStarted ? 'Resume' : 'Play');
      status.textContent = '';
    };

    const play = async () => {
      const currentRequest = ++request;
      intendedPlayback = true;
      video.hidden = false;
      if (!document.querySelector('dialog[open]') && !document.hidden) video.focus({ preventScroll: true });
      poster.hidden = true;
      retry.hidden = true;
      overlay.hidden = true;
      player.dataset.playerState = 'loading';
      loading();
      try {
        await video.play();
        // A play promise can complete after a visibility change or an overlay opened.
        if (currentRequest !== request && !intendedPlayback) video.pause();
      } catch (error) {
        if (currentRequest !== request || !intendedPlayback) return;
        if (error instanceof DOMException && error.name === 'NotAllowedError') {
          const restoreFocus = canRestorePlayerFocus();
          intendedPlayback = false;
          clearTimeoutForLoad();
          player.dataset.playerState = 'paused';
          overlay.hidden = false;
          setAction('Play');
          status.textContent = 'Playback was blocked. Use Play film to try again.';
          if (restoreFocus) start.focus({ preventScroll: true });
        } else {
          fail();
        }
      }
    };

    start.addEventListener('click', () => { void play(); });
    retry.addEventListener('click', () => {
      request += 1;
      clearTimeoutForLoad();
      intendedPlayback = false;
      hasStarted = false;
      player.dataset.playerState = 'idle';
      video.src = source;
      video.hidden = false;
      poster.hidden = true;
      retry.hidden = true;
      video.load();
      void play();
    });
    video.addEventListener('play', () => {
      if (document.hidden || player.dataset.playerState === 'error') {
        video.pause();
        return;
      }
      intendedPlayback = true;
      overlay.hidden = true;
      loading();
    });
    video.addEventListener('playing', () => {
      if (!intendedPlayback || document.hidden || player.dataset.playerState === 'error') {
        video.pause();
        return;
      }
      clearTimeoutForLoad();
      hasStarted = true;
      player.dataset.playerState = 'playing';
      status.textContent = '';
      overlay.hidden = true;
      poster.hidden = true;
    });
    video.addEventListener('waiting', loading);
    video.addEventListener('stalled', loading);
    video.addEventListener('error', () => { if (player.dataset.playerState !== 'error') fail(); });
    video.addEventListener('pause', () => {
      if (player.dataset.playerState === 'error') return;
      intendedPlayback = false;
      clearTimeoutForLoad();
      player.dataset.playerState = video.ended ? 'ended' : 'paused';
      overlay.hidden = false;
      setAction(video.ended ? 'Replay' : hasStarted ? 'Resume' : 'Play');
      status.textContent = '';
    });
    video.addEventListener('ended', () => {
      intendedPlayback = false;
      clearTimeoutForLoad();
      player.dataset.playerState = 'ended';
      overlay.hidden = false;
      setAction('Replay');
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden) pauseForContext(); });
    document.addEventListener('forge:lightbox-open', pauseForContext);
    window.addEventListener('pagehide', pauseForContext);
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting && intendedPlayback) pauseForContext();
    }, { threshold: 0.05 });
    observer.observe(video);

    player.dataset.initialized = 'true';
    overlay.hidden = false;
  });
}
