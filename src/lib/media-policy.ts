export type MediaKind = 'image' | 'video' | 'captions';

export interface MediaPolicy {
  readonly trustedOrigins: readonly string[];
}

const extensions: Record<MediaKind, RegExp> = {
  image: /\.(?:avif|gif|jpe?g|png|svg|webp)$/i,
  video: /\.(?:mp4|webm)$/i,
  captions: /\.vtt$/i,
};

const localPaths: Record<MediaKind, RegExp> = {
  image: /^\/(?:placeholders|images|art)\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.(?:avif|gif|jpe?g|png|svg|webp)$/,
  video: /^\/media\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.(?:mp4|webm)$/,
  captions: /^\/media\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.vtt$/,
};

/** Approve exact HTTPS origins, without paths, credentials, wildcards, or URL suffixes. */
export function createMediaPolicy(input: MediaPolicy): MediaPolicy {
  const origins = input.trustedOrigins.map((origin) => {
    let url: URL;
    try {
      url = new URL(origin);
    } catch {
      throw new Error(`Invalid trusted media origin: ${origin}`);
    }

    if (url.protocol !== 'https:' || url.username || url.password || url.hostname.includes('*') || origin !== url.origin) {
      throw new Error('Trusted media origins must be exact HTTPS origins without paths, credentials, queries, or fragments.');
    }

    return origin;
  });

  return Object.freeze({ trustedOrigins: Object.freeze([...new Set(origins)]) });
}

/** The pathname, rather than query parameters, determines a media file's format. */
export function mediaSourcePathname(source: string): string | null {
  if (source.startsWith('/')) return source;
  try {
    return new URL(source).pathname;
  } catch {
    return null;
  }
}

/** Local paths stay strict; remote assets require an explicitly approved exact origin. */
export function isAllowedMediaSource(source: string, kind: MediaKind, policy: MediaPolicy): boolean {
  if (localPaths[kind].test(source)) return true;
  if (!source.startsWith('https://') || /[\s\\\u0000-\u001f\u007f]/.test(source) || source.includes('#') || /^https:\/\/[^/?#]*@/.test(source)) {
    return false;
  }

  let url: URL;
  try {
    url = new URL(source);
  } catch {
    return false;
  }

  return url.protocol === 'https:'
    && !url.username
    && !url.password
    && policy.trustedOrigins.includes(url.origin)
    && extensions[kind].test(url.pathname);
}
