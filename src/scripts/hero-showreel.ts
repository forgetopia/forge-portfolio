interface ConnectionPreference extends EventTarget {
  readonly saveData?: boolean;
}

/** Load the background clip only when explicitly requested or eligible autoplay is enabled. */
export function initHeroShowreels() {
  document.querySelectorAll<HTMLElement>('[data-hero-showreel]').forEach((hero) => {
    if (hero.dataset.initialized === 'true') return;

    const video = hero.querySelector<HTMLVideoElement>('[data-hero-video]');
    const controls = hero.querySelector<HTMLElement>('[data-hero-controls]');
    const play = hero.querySelector<HTMLButtonElement>('[data-hero-play]');
    const mute = hero.querySelector<HTMLButtonElement>('[data-hero-mute]');
    const playLabel = hero.querySelector<HTMLElement>('[data-hero-play-label]');
    const playIcon = hero.querySelector<HTMLElement>('[data-hero-play-icon]');
    const muteLabel = hero.querySelector<HTMLElement>('[data-hero-mute-label]');
    const status = hero.querySelector<HTMLElement>('[data-hero-status]');
    if (!video || !controls || !play || !mute || !playLabel || !playIcon || !muteLabel || !status || !video.dataset.src) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const desktopPointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    const connection = (navigator as Navigator & { connection?: ConnectionPreference }).connection;
    let wantsPlayback = false;
    let requestId = 0;
    let loadingTimeout: ReturnType<typeof setTimeout> | undefined;
    let visible = true;
    let autoplayAttempted = false;

    video.defaultMuted = true;
    video.muted = true;

    const clearLoadingTimeout = () => {
      if (loadingTimeout !== undefined) clearTimeout(loadingTimeout);
      loadingTimeout = undefined;
    };

    const updatePlayControl = (retry = false) => {
      play.setAttribute('aria-label', wantsPlayback ? 'Pause showreel' : retry ? 'Retry showreel' : 'Play showreel');
      playLabel.textContent = wantsPlayback ? 'Pause' : retry ? 'Retry' : 'Play';
      playIcon.classList.toggle('is-playing', wantsPlayback);
    };

    const updateMuteControl = () => {
      mute.setAttribute('aria-label', video.muted ? 'Unmute showreel' : 'Mute showreel');
      muteLabel.textContent = video.muted ? 'Unmute' : 'Mute';
    };

    const pause = (message = 'Showreel paused.') => {
      requestId += 1;
      wantsPlayback = false;
      clearLoadingTimeout();
      video.pause();
      hero.dataset.playback = 'paused';
      updatePlayControl();
      status.textContent = message;
    };

    const fail = (message = 'Playback is unavailable. The poster is shown. Try again.') => {
      requestId += 1;
      wantsPlayback = false;
      clearLoadingTimeout();
      video.pause();
      if (video.hasAttribute('src')) {
        video.removeAttribute('src');
        video.load();
      }
      hero.dataset.playback = 'error';
      hero.dataset.videoVisible = 'false';
      updatePlayControl(true);
      status.textContent = message;
    };

    const armLoadingTimeout = () => {
      clearLoadingTimeout();
      loadingTimeout = setTimeout(() => {
        if (wantsPlayback) fail('The clip is taking too long to load. The poster is shown. Try again.');
      }, 12_000);
    };

    const start = async (automatic = false) => {
      if (wantsPlayback || document.hidden || !visible) return;
      if (automatic && (reducedMotion.matches || !desktopPointer.matches || connection?.saveData)) return;

      if (automatic) {
        video.muted = true;
        updateMuteControl();
      }

      const thisRequest = ++requestId;
      wantsPlayback = true;
      hero.dataset.playback = 'loading';
      status.textContent = 'Loading showreel…';
      updatePlayControl();
      armLoadingTimeout();
      if (!video.hasAttribute('src')) {
        video.src = video.dataset.src!;
        video.querySelectorAll<HTMLTrackElement>('track[data-src]').forEach((track) => {
          if (track.dataset.src) track.src = track.dataset.src;
        });
      } else if (video.error) {
        // A failed request may be retried without modifying or eagerly loading the source.
        video.load();
      }

      try {
        await video.play();
        // A queued play promise must not revive media after pause, visibility, or preference changes.
        if (!wantsPlayback || document.hidden || !visible) video.pause();
      } catch {
        if (thisRequest !== requestId) return;
        if (automatic) fail('Automatic playback is unavailable. Play the showreel when ready.');
        else fail();
      }
    };

    video.addEventListener('playing', () => {
      if (!wantsPlayback || document.hidden || !visible) {
        video.pause();
        return;
      }
      clearLoadingTimeout();
      hero.dataset.playback = 'playing';
      hero.dataset.videoVisible = 'true';
      status.textContent = 'Showreel playing.';
    });

    video.addEventListener('waiting', () => {
      if (!wantsPlayback) return;
      hero.dataset.playback = 'loading';
      status.textContent = 'Buffering showreel…';
      armLoadingTimeout();
    });
    video.addEventListener('error', () => { if (wantsPlayback) fail(); });
    video.addEventListener('volumechange', updateMuteControl);
    play.addEventListener('click', () => { if (wantsPlayback) pause(); else void start(); });
    mute.addEventListener('click', () => { video.muted = !video.muted; updateMuteControl(); });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && wantsPlayback) pause('Showreel paused while the page is hidden.');
    });
    window.addEventListener('pagehide', () => {
      if (wantsPlayback) pause('Showreel paused while the page is hidden.');
    });
    document.addEventListener('forge:lightbox-open', () => {
      if (wantsPlayback) pause('Showreel paused while the image viewer is open.');
    });
    desktopPointer.addEventListener('change', () => {
      if (!desktopPointer.matches && wantsPlayback) pause('Showreel paused. Play to resume.');
    });
    reducedMotion.addEventListener('change', () => {
      if (reducedMotion.matches && wantsPlayback) pause('Showreel paused for reduced motion. Play to resume.');
    });
    connection?.addEventListener('change', () => {
      if (connection?.saveData && wantsPlayback) pause('Showreel paused to save data. Play to resume.');
    });

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        visible = entries.some((entry) => entry.isIntersecting);
        if (!visible && wantsPlayback) pause('Showreel paused outside the viewport.');
        if (visible && hero.dataset.autoplay === 'true' && !autoplayAttempted) {
          autoplayAttempted = true;
          void start(true);
        }
      });
      observer.observe(hero);
    } else if (hero.dataset.autoplay === 'true') {
      autoplayAttempted = true;
      void start(true);
    }

    hero.dataset.initialized = 'true';
    controls.hidden = false;
    updateMuteControl();
  });
}
