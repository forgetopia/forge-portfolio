import { expect, test } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { projectSchema } from '../../src/lib/project-schema';
import { filterPublicProjects } from '../../src/lib/project-utils';

const projects = filterPublicProjects(readdirSync(resolve('src/content/projects'))
  .filter((filename) => filename.endsWith('.json'))
  .map((filename) => ({ data: projectSchema.parse(JSON.parse(readFileSync(resolve('src/content/projects', filename), 'utf8'))) })));
const routes = ['/', '/work/', '/about/', '/contact/', ...projects.map(({ data }) => `/work/${data.slug}/`)];

test('every public page loads without script errors and its internal links, fragments, and media resolve', async ({ page, request, baseURL }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const destinations = new Map<string, Set<string>>();

  for (const route of routes) {
    const response = await page.goto(route);
    expect(response?.status(), route).toBe(200);
    await page.evaluate(() => document.fonts.ready);
    // The closed lightbox intentionally has an unloaded, hidden image until opened.
    for (const image of await page.locator('main img:visible').all()) {
      await image.scrollIntoViewIfNeeded();
      await expect.poll(() => image.evaluate((element) => (element as HTMLImageElement).naturalWidth), {
        message: `An image did not load on ${route}`,
      }).toBeGreaterThan(0);
    }

    const urls = await page.evaluate(() => {
      const navigation = [...document.querySelectorAll<HTMLAnchorElement>('a[href]')].map((link) => link.href);
      const assets = [...document.querySelectorAll<HTMLElement>('img[src], video[src], source[src], track[src], video[poster], link[rel="stylesheet"], link[rel="icon"]')]
        .flatMap((element) => ['src', 'poster', 'href'].map((name) => element.getAttribute(name)).filter((value): value is string => Boolean(value)))
        .map((value) => new URL(value, location.href).href);
      return [...navigation, ...assets];
    });
    for (const value of urls) {
      const url = new URL(value);
      if (url.origin !== new URL(baseURL!).origin) continue;
      const path = `${url.pathname}${url.search}`;
      if (!destinations.has(path)) destinations.set(path, new Set());
      if (url.hash) destinations.get(path)!.add(decodeURIComponent(url.hash.slice(1)));
    }
  }

  expect(destinations.size).toBeGreaterThan(routes.length);
  for (const [path, fragments] of destinations) {
    const response = await request.get(path);
    expect(response.status(), `Broken internal destination: ${path}`).toBe(200);
    if (fragments.size && response.headers()['content-type']?.includes('text/html')) {
      await page.goto(path);
      for (const fragment of fragments) {
        expect(await page.evaluate((id) => Boolean(document.getElementById(id)), fragment), `Missing ${path}#${fragment}`).toBe(true);
      }
    }
  }
  expect(errors, 'Public routes must not throw client script errors').toEqual([]);
});

test('committed public assets are delivered intact with usable media types and unknown URLs return real 404s', async ({ request }) => {
  const files = readdirSync(resolve('public'), { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => resolve(entry.parentPath, entry.name));
  expect(files.length).toBeGreaterThan(0);
  for (const file of files) {
    const path = `/${file.slice(resolve('public').length + 1).replaceAll('\\', '/')}`;
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
    expect(await response.body(), `Asset bytes differ at ${path}`).toEqual(readFileSync(file));
    const expectedType = path.endsWith('.mp4') ? 'video/mp4' : path.endsWith('.vtt') ? 'text/vtt' : path.endsWith('.svg') ? 'image/svg+xml' : null;
    if (expectedType) expect(response.headers()['content-type'], path).toContain(expectedType);
    const head = await request.head(path);
    expect(head.status(), `HEAD ${path}`).toBe(200);
    expect((await head.body()).length).toBe(0);
  }
  for (const path of ['/launch-audit-missing-route/', '/work/unpublished-launch-fixture/', '/media/missing-launch-fixture.mp4']) {
    const response = await request.get(path);
    expect(response.status(), `${path} must not become a soft 404 or homepage fallback`).toBe(404);
    expect(await response.text()).not.toContain('FORGE — Visual Universe');
  }
});
