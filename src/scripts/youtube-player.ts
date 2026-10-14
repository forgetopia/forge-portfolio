import { buildYouTubeEmbedURL, type YouTubeVideo } from '../lib/youtube';

/** An iframe is created only by an explicit Play/Retry action, never on hover or page load. */
export function initYouTubePlayers() {
  document.querySelectorAll<HTMLElement>('[data-youtube-player]').forEach((player) => {
    if (player.dataset.initialized === 'true') return;

    const frame = player.querySelector<HTMLElement>('[data-youtube-frame]');
    const poster = player.querySelector<HTMLImageElement>('[data-youtube-poster]');
    const overlay = player.querySelector<HTMLElement>('[data-youtube-overlay]');
    const start = player.querySelector<HTMLButtonElement>('[data-youtube-start]');
    const action = player.querySelector<HTMLElement>('[data-youtube-action]');
    const retry = player.querySelector<HTMLButtonElement>('[data-youtube-retry]');
    const status = player.querySelector<HTMLElement>('[data-youtube-status]');
    if (!frame || !poster || !overlay || !start || !action || !retry || !status) return;

    let iframe: HTMLIFrameElement | undefined;
    let request = 0;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const contextBlocksPlayback = () => document.hidden || Boolean(document.querySelector('dialog[open]'));
    const canRestorePlayerFocus = () => player.contains(document.activeElement) && !contextBlocksPlayback();

    const releaseIframe = () => {
      request += 1;
      if (timeout !== undefined) clearTimeout(timeout);
      timeout = undefined;
      // Removing the frame stops cross-origin playback without an API, messages, or an API key.
      iframe?.remove();
      iframe = undefined;
      frame.setAttribute('aria-busy', 'false');
    };

    const showPoster = () => {
      poster.hidden = false;
      start.removeAttribute('aria-disabled');
      action.textContent = 'Play film';
    };

    const fail = () => {
      const restoreFocus = canRestorePlayerFocus();
      releaseIframe();
      player.dataset.youtubeState = 'error';
      showPoster();
      overlay.hidden = true;
      retry.hidden = false;
      status.textContent = 'Unable to load the embedded player. Try again or watch on YouTube.';
      if (restoreFocus) retry.focus({ preventScroll: true });
    };

    const play = () => {
      if (contextBlocksPlayback() || player.dataset.youtubeState === 'loading') return;
      const retryHadFocus = document.activeElement === retry;
      let source: string;
      try {
        const youtube: YouTubeVideo = {
          videoId: player.dataset.youtubeVideoId ?? '',
          orientation: player.dataset.youtubeOrientation as YouTubeVideo['orientation'],
          ...(player.dataset.youtubeStartSeconds !== undefined
            ? { startSeconds: Number(player.dataset.youtubeStartSeconds) }
            : {}),
        };
        // Runtime validation also protects this URL boundary if page metadata is malformed.
        // Autoplay is requested only for this deliberate Play action, including reduced-motion users.
        source = buildYouTubeEmbedURL(youtube, { autoplay: true });
      } catch {
        fail();
        return;
      }

      releaseIframe();
      const currentRequest = request;
      const nextIframe = document.createElement('iframe');
      nextIframe.title = `${player.dataset.youtubeTitle ?? 'Project'} — YouTube film`;
      nextIframe.allow = 'autoplay; encrypted-media; fullscreen; picture-in-picture';
      nextIframe.allowFullscreen = true;
      nextIframe.referrerPolicy = 'strict-origin-when-cross-origin';
      nextIframe.hidden = true;
      nextIframe.addEventListener('load', () => {
        if (request !== currentRequest || iframe !== nextIframe) return;
        if (contextBlocksPlayback()) {
          suspend();
          return;
        }
        const restoreFocus = canRestorePlayerFocus();
        if (timeout !== undefined) clearTimeout(timeout);
        timeout = undefined;
        frame.setAttribute('aria-busy', 'false');
        player.dataset.youtubeState = 'loaded';
        poster.hidden = true;
        overlay.hidden = true;
        nextIframe.hidden = false;
        // A cross-origin load event does not establish that this particular film can play.
        status.textContent = 'YouTube player loaded. If playback is unavailable, use Watch on YouTube.';
        if (restoreFocus) nextIframe.focus({ preventScroll: true });
      });
      nextIframe.addEventListener('error', () => {
        if (request === currentRequest && iframe === nextIframe) fail();
      });
      iframe = nextIframe;
      player.dataset.youtubeState = 'loading';
      frame.setAttribute('aria-busy', 'true');
      poster.hidden = false;
      overlay.hidden = false;
      retry.hidden = true;
      start.setAttribute('aria-disabled', 'true');
      action.textContent = 'Loading YouTube…';
      status.textContent = 'Loading the YouTube player…';
      // Keep keyboard focus in the player while the Retry control is replaced by Play.
      if (retryHadFocus) start.focus({ preventScroll: true });
      timeout = setTimeout(() => {
        if (request === currentRequest && iframe === nextIframe) fail();
      }, 12_000);
      nextIframe.src = source;
      frame.append(nextIframe);
    };

    const suspend = () => {
      if (!iframe) return;
      releaseIframe();
      player.dataset.youtubeState = 'suspended';
      showPoster();
      overlay.hidden = false;
      retry.hidden = true;
      status.textContent = 'Embedded film stopped. Select Play film to load it again.';
      // Opening a lightbox or hiding the page must never steal focus or resume a film.
    };

    start.addEventListener('click', play);
    retry.addEventListener('click', play);
    document.addEventListener('forge:lightbox-open', suspend);
    document.addEventListener('visibilitychange', () => { if (document.hidden) suspend(); });
    window.addEventListener('pagehide', suspend);
    player.dataset.initialized = 'true';
    overlay.hidden = false;
  });
}
