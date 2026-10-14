import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { cp, mkdtemp, readFile, readdir, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';

const run = promisify(execFile);
const repository = resolve('.');
const cloudflareOrigin = 'https://forge-portfolio.digivism9.workers.dev';
const githubOrigin = 'https://forgetopia.github.io';
const projectSlugs = ['the-long-night', 'the-last-rune-engine', 'dragon-resonance', 'isekai-live-action', 'surreal-universe'];
const routes = ['/', '/work/', '/about/', '/contact/', ...projectSlugs.map((slug) => `/work/${slug}/`)];

/** Build unchanged owner content in an isolated directory, with a deliberate hosting environment. */
async function withHostingBuild(
  override: string | undefined,
  verify: (directory: string, output: string, succeeded: boolean) => Promise<void>,
) {
  const directory = await mkdtemp(join(tmpdir(), 'forge-hosting-build-'));
  try {
    await Promise.all([
      ...['src', 'public', 'astro.config.mjs', 'tsconfig.json', 'package.json'].map((entry) => (
        cp(join(repository, entry), join(directory, entry), { recursive: true })
      )),
      symlink(join(repository, 'node_modules'), join(directory, 'node_modules'), 'dir'),
    ]);
    const baseConfig = await readFile(join(directory, 'astro.config.mjs'), 'utf8');
    await writeFile(join(directory, 'astro.fixture-base.config.mjs'), baseConfig);
    await writeFile(join(directory, 'astro.config.mjs'), `
      import configuration from './astro.fixture-base.config.mjs';
      export default {
        ...configuration,
        cacheDir: './.fixture-astro-cache',
        vite: { ...configuration.vite, cacheDir: './.fixture-vite-cache' },
      };
    `);
    const env: NodeJS.ProcessEnv = { ...process.env, ASTRO_TELEMETRY_DISABLED: '1', NO_COLOR: '1' };
    delete env.FORGE_SITE_ORIGIN;
    if (override !== undefined) env.FORGE_SITE_ORIGIN = override;
    let succeeded = false;
    let output = '';
    try {
      const result = await run(process.execPath, [join(repository, 'node_modules/astro/bin/astro.mjs'), 'build'], {
        cwd: directory, env, timeout: 60_000, maxBuffer: 1024 * 1024,
      });
      succeeded = true;
      output = `${result.stdout}\n${result.stderr}`;
    } catch (error) {
      const failure = error as Error & { code?: number | string; stdout?: string; stderr?: string };
      assert.equal(typeof failure.code, 'number', `Build did not execute: ${failure.message}`);
      output = `${failure.stdout ?? ''}\n${failure.stderr ?? ''}`;
    }
    await verify(directory, output, succeeded);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

function attribute(tag: string, name: string) {
  return tag.match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`))?.[1];
}

function metadata(html: string, name: string) {
  const tag = [...html.matchAll(/<meta\b[^>]*>/g)].map(([match]) => match)
    .find((tag) => attribute(tag, 'property') === name || attribute(tag, 'name') === name);
  return tag && attribute(tag, 'content');
}

async function emittedHTML(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? emittedHTML(path) : entry.name.endsWith('.html') ? [path] : [];
  }));
  return nested.flat();
}

async function verifyPublicOutput(directory: string, origin: string) {
  const dist = join(directory, 'dist');
  const pages = await emittedHTML(dist);
  assert.equal(pages.length, 9, 'Both hosts must retain every existing static route');
  assert.deepEqual(new Set(pages.map((path) => {
    const directory = relative(dist, dirname(path));
    return directory ? `/${directory}/` : '/';
  })), new Set(routes));
  const allLinks = new Set<string>();
  for (const route of routes) {
    const html = await readFile(join(dist, route, 'index.html'), 'utf8');
    const canonicalTags = [...html.matchAll(/<link\b[^>]*rel="canonical"[^>]*>/g)];
    assert.equal(canonicalTags.length, 1, `${route}: one canonical URL is required`);
    assert.equal(attribute(canonicalTags[0][0], 'href'), `${origin}${route}`, route);
    assert.equal(metadata(html, 'og:url'), `${origin}${route}`, route);
    const slug = route.match(/^\/work\/([^/]+)\/$/)?.[1];
    const record = slug ? JSON.parse(await readFile(join(directory, 'src/content/projects', `${slug}.json`), 'utf8')) : null;
    const imagePath = record?.cover.src ?? '/art/horizon.svg';
    const expectedImage = `${origin}${imagePath}`;
    assert.equal(metadata(html, 'og:image'), expectedImage, `${route}: Open Graph image must use the selected host`);
    assert.equal(metadata(html, 'twitter:image'), expectedImage, `${route}: Twitter image must use the selected host`);
    assert.doesNotMatch(html, /\/forge-portfolio\//, 'A user site must not gain a repository base path');
    assert.ok(!html.includes(origin === githubOrigin ? cloudflareOrigin : githubOrigin), 'Metadata must not mix deployment origins');
    for (const [tag] of html.matchAll(/<(?:a|link|script|img|video|source|track)\b[^>]*>/g)) {
      const href = attribute(tag, 'href');
      if (tag.startsWith('<a') && href?.startsWith('/')) allLinks.add(href);
      for (const name of ['href', 'src', 'poster']) {
        const value = attribute(tag, name);
        if (!value || !value.startsWith('/')) continue;
        assert.ok(!value.startsWith('//'), `Protocol-relative resource is not an origin-safe local path: ${value}`);
        const localPath = value.split(/[?#]/)[0];
        const path = join(dist, localPath, localPath.endsWith('/') ? 'index.html' : '');
        assert.equal((await stat(path)).isFile(), true, `${route}: root-relative ${name} must resolve to a built file: ${value}`);
      }
    }
    if (record) {
      assert.ok(html.includes(record.title), 'Owner project titles must be preserved');
      assert.ok(html.includes(`src="${record.video.src}"`), 'Existing native main-film paths must remain root-relative');
      assert.ok(html.includes('Sample project'), 'Existing sample labels must be preserved');
    }
  }
  for (const route of routes) assert.ok(allLinks.has(route), `Existing navigation route is missing: ${route}`);
  const sitemap = await readFile(join(dist, 'sitemap.xml'), 'utf8');
  const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  assert.equal(locations.length, routes.length);
  assert.deepEqual(new Set(locations), new Set(routes.map((route) => `${origin}${route}`)));
}

test('an unchanged default build retains Cloudflare SEO, all routes, and local assets at the site root', { timeout: 90_000 }, async () => {
  await withHostingBuild(undefined, async (directory, output, succeeded) => {
    assert.ok(succeeded, output);
    await verifyPublicOutput(directory, cloudflareOrigin);
  });
});

test('a GitHub Pages user-site build changes every SEO origin while retaining root-relative routes and media', { timeout: 90_000 }, async () => {
  await withHostingBuild(githubOrigin, async (directory, output, succeeded) => {
    assert.ok(succeeded, output);
    await verifyPublicOutput(directory, githubOrigin);
  });
});

test('invalid hosting overrides stop actual static builds instead of emitting misleading default metadata', { timeout: 90_000 }, async () => {
  for (const override of ['', 'http://forgetopia.github.io', 'https://forgetopia.github.io/forge-portfolio/']) {
    await withHostingBuild(override, async (directory, output, succeeded) => {
      assert.equal(succeeded, false, `Invalid override ${JSON.stringify(override)} built successfully:\n${output}`);
      assert.match(output, /FORGE_SITE_ORIGIN|HTTPS.*origin|origin.*HTTPS/i);
      let files: string[] = [];
      try { files = await emittedHTML(join(directory, 'dist')); } catch (error) {
        assert.equal((error as NodeJS.ErrnoException).code, 'ENOENT');
      }
      assert.deepEqual(files, [], 'An invalid origin must not emit public pages with fallback metadata');
    });
  }
});
