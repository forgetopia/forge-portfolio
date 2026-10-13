import type { ImageData } from './project-schema';

interface SiteMetadata {
  name: string;
  tagline: string;
  productionOrigin: string | null;
}

/** Always use the owner's production origin, never a preview/request host. */
export function canonicalURL(origin: string | null, path: string): string | undefined {
  if (!origin) return undefined;
  const url = new URL(origin);
  const pathname = path.split(/[?#]/, 1)[0] || '/';
  url.pathname = `/${pathname.replace(/^\/+/, '')}`;
  url.search = '';
  url.hash = '';
  return url.href;
}

export function pageMetadata(options: {
  site: SiteMetadata;
  title?: string;
  description: string;
  path: string;
  shareImage?: ImageData;
}) {
  const { site, title, description, path, shareImage } = options;
  const imageURL = shareImage?.src.startsWith('https://')
    ? shareImage.src
    : shareImage ? canonicalURL(site.productionOrigin, shareImage.src) : undefined;
  return {
    title: title ? `${title} — ${site.name}` : `${site.name} — ${site.tagline}`,
    description,
    siteName: `${site.name} — ${site.tagline}`,
    canonical: canonicalURL(site.productionOrigin, path),
    imageURL,
    shareImage,
  };
}

export function sitemapXML(origin: string | null, publicPaths: readonly string[]): string {
  const escapeXML = (value: string) => value.replace(/[<>&"']/g, (character) => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;',
  })[character]!);
  const urls = origin ? [...new Set(publicPaths)]
    .map((path) => `<url><loc>${escapeXML(canonicalURL(origin, path)!)}</loc></url>`).join('') : '';
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
}
