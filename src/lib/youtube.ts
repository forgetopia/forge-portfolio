/** YouTube embeds are separate from the direct image/video media allowlist. */
export interface YouTubeVideo {
  videoId: string;
  startSeconds?: number;
  orientation: 'landscape' | 'portrait';
}

export function isYouTubeVideoId(value: unknown): value is string {
  // The length check also excludes the final newline that JavaScript's $ can accept.
  return typeof value === 'string' && value.length === 11 && /^[A-Za-z0-9_-]{11}$/.test(value);
}

export function isYouTubeStartSeconds(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function assertYouTubeVideo(video: YouTubeVideo): void {
  if (!video || typeof video !== 'object' || !isYouTubeVideoId(video.videoId)) {
    throw new TypeError('Use an 11-character YouTube video ID containing only letters, numbers, underscores, or hyphens.');
  }
  if (video.startSeconds !== undefined && !isYouTubeStartSeconds(video.startSeconds)) {
    throw new TypeError('YouTube startSeconds must be a nonnegative safe integer.');
  }
  if (video.orientation !== 'landscape' && video.orientation !== 'portrait') {
    throw new TypeError('YouTube orientation must be landscape or portrait.');
  }
}

/** Only explicit visitor playback may request autoplay; the default never does. */
export function buildYouTubeEmbedURL(video: YouTubeVideo, options: { autoplay?: boolean } = {}): string {
  assertYouTubeVideo(video);
  const url = new URL(`https://www.youtube-nocookie.com/embed/${video.videoId}`);
  url.searchParams.set('controls', '1');
  url.searchParams.set('playsinline', '1');
  if (video.startSeconds !== undefined) url.searchParams.set('start', String(video.startSeconds));
  if (options.autoplay === true) url.searchParams.set('autoplay', '1');
  return url.href;
}

/** A normal link remains usable when embeds are blocked or JavaScript is unavailable. */
export function buildYouTubeWatchURL(video: YouTubeVideo): string {
  assertYouTubeVideo(video);
  const url = new URL('https://www.youtube.com/watch');
  url.searchParams.set('v', video.videoId);
  if (video.startSeconds !== undefined) url.searchParams.set('t', `${video.startSeconds}s`);
  return url.href;
}
