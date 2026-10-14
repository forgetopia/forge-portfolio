/** The verified Cloudflare production origin remains the default for every build. */
export const defaultSiteOrigin = 'https://forge-portfolio.digivism9.workers.dev';

/** Validate the raw input before URL parsing can normalize away unsafe components. */
export function isSafeSiteOrigin(value: unknown): value is string {
  if (typeof value !== 'string' || /[\s\u0000-\u001f\u007f\\@]/.test(value)
    || !/^https:\/\/[^/?#]+\/?$/i.test(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && Boolean(url.hostname)
      && !url.username && !url.password && url.pathname === '/' && !url.search && !url.hash;
  } catch {
    return false;
  }
}

/** Resolve once during SSG; an invalid explicit override must fail the build. */
export function resolveSiteOrigin(override?: string): string {
  if (override === undefined) return defaultSiteOrigin;
  if (!isSafeSiteOrigin(override)) {
    throw new TypeError('FORGE_SITE_ORIGIN must be an HTTPS origin without credentials, a path, query, fragment, whitespace, or backslashes. Omit it to use the Cloudflare default.');
  }
  return new URL(override).origin;
}
