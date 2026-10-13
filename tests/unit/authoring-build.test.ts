import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { cp, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';

const run = promisify(execFile);
const repository = resolve('.');
const astroCLI = resolve('node_modules/astro/bin/astro.mjs');
const productionOrigin = 'https://forge-portfolio.digivism9.workers.dev';

/** Build the actual collection and pages in a disposable copy, never changing owner content. */
async function withBuiltFixture(
  change: (directory: string) => Promise<void>,
  verify: (directory: string, output: string) => Promise<void>,
  expectedDiagnostic?: RegExp,
): Promise<void> {
  const directory = await mkdtemp(join(tmpdir(), 'forge-authoring-regression-'));
  try {
    await Promise.all([
      ...['src', 'public', 'astro.config.mjs', 'tsconfig.json', 'package.json'].map((entry) => (
        cp(join(repository, entry), join(directory, entry), { recursive: true })
      )),
      symlink(join(repository, 'node_modules'), join(directory, 'node_modules'), 'dir'),
    ]);
    // node_modules is shared, so isolate Astro's content store and Vite's caches.
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
    await change(directory);
    let failed = false;
    let output = '';
    try {
      const result = await run(process.execPath, [astroCLI, 'build'], {
        cwd: directory,
        env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1', NO_COLOR: '1' },
        timeout: 60_000,
        maxBuffer: 1024 * 1024,
      });
      output = `${result.stdout}\n${result.stderr}`;
    } catch (error) {
      const failure = error as Error & { code?: number | string; stdout?: string; stderr?: string };
      assert.equal(typeof failure.code, 'number', `Build did not execute: ${failure.message}`);
      failed = true;
      output = `${failure.stdout ?? ''}\n${failure.stderr ?? ''}`;
    }
    if (expectedDiagnostic) {
      assert.ok(failed, `Invalid fixture unexpectedly built successfully:\n${output}`);
      assert.match(output, expectedDiagnostic, `Fixture failed for an unrelated reason:\n${output}`);
    } else {
      assert.equal(failed, false, `Valid authoring fixture failed to build:\n${output}`);
    }
    await verify(directory, output);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

async function fixtureRecord(directory: string, slug = 'the-long-night') {
  return JSON.parse(await readFile(join(directory, 'src/content/projects', `${slug}.json`), 'utf8'));
}

async function writeProject(directory: string, record: Record<string, unknown>, filename = `${record.slug}.json`) {
  await writeFile(join(directory, 'src/content/projects', filename), JSON.stringify(record));
}

async function publicText(directory: string): Promise<string> {
  const entries = await readdir(directory, { withFileTypes: true });
  const parts = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return publicText(path);
    return /\.(?:html|xml|json|js|mjs|css|txt|vtt)$/.test(entry.name) ? readFile(path, 'utf8') : '';
  }));
  return parts.join('\n');
}

test('production output publishes approved content and legacy samples without leaking either kind of draft', { timeout: 90_000 }, async () => {
  const explicitSecret = 'PRIVATE_EXPLICIT_DRAFT_METADATA_7204';
  const implicitSecret = 'PRIVATE_IMPLICIT_DRAFT_METADATA_9502';
  const publicSlug = 'published-authoring-fixture';
  await withBuiltFixture(async (directory) => {
    const original = await fixtureRecord(directory);
    await writeProject(directory, {
      ...original, status: 'draft', featured: true, title: explicitSecret,
      summary: explicitSecret, synopsis: explicitSecret, overview: explicitSecret,
      tools: [explicitSecret], credits: [{ role: explicitSecret, name: explicitSecret }],
    });
    const implicitDraft = {
      ...original, slug: 'unpublished-authoring-fixture', sample: false, featured: true,
      title: implicitSecret, summary: implicitSecret,
    };
    delete implicitDraft.status;
    await writeProject(directory, implicitDraft);
    await writeProject(directory, {
      ...original, slug: publicSlug, status: 'published', sample: false, featured: true, order: 0,
      title: 'Published authoring fixture', subtitle: 'A subtitle supplied in the build fixture',
      summary: 'A unique approved-fixture synopsis for metadata verification.',
      year: 2026, format: 'Test fixture short film', duration: '00:05', aspectRatio: '16:10',
      tools: ['Fixture image tool', 'Fixture editing tool'], productionRole: 'Fixture creative direction',
      overview: 'An overview supplied only by the test fixture.',
      productionWorkflow: ['Fixture visual development', 'Fixture finishing and review'],
      credits: [{ role: 'Fixture role', name: 'Fixture collaborator' }],
      video: {
        ...original.video,
        poster: {
          ...original.cover, src: '/art/horizon.svg', width: 1600, height: 1100,
          alt: 'Placeholder poster chosen by the authoring test fixture',
        },
      },
    });
  }, async (directory) => {
    const dist = join(directory, 'dist');
    const emitted = await publicText(dist);
    assert.ok(!emitted.includes(explicitSecret), 'Explicit draft metadata leaked into public assets');
    assert.ok(!emitted.includes(implicitSecret), 'Unpublished real-content metadata leaked into public assets');
    assert.ok(!emitted.includes('/work/the-long-night/'), 'Explicit draft was linked publicly');
    assert.ok(!emitted.includes('/work/unpublished-authoring-fixture/'), 'Implicit draft was linked publicly');
    await assert.rejects(readFile(join(dist, 'work/the-long-night/index.html')), { code: 'ENOENT' });
    await assert.rejects(readFile(join(dist, 'work/unpublished-authoring-fixture/index.html')), { code: 'ENOENT' });

    const home = await readFile(join(dist, 'index.html'), 'utf8');
    const work = await readFile(join(dist, 'work/index.html'), 'utf8');
    for (const html of [home, work]) assert.ok(html.includes(`/work/${publicSlug}/`));
    const published = await readFile(join(dist, `work/${publicSlug}/index.html`), 'utf8');
    for (const text of [
      'A subtitle supplied in the build fixture', 'A unique approved-fixture synopsis for metadata verification.',
      '2026', 'Test fixture short film', '00:05', '16:10', 'Fixture creative direction',
      'Fixture image tool', 'Fixture editing tool', 'An overview supplied only by the test fixture.',
      'Fixture visual development', 'Fixture finishing and review', 'Fixture role', 'Fixture collaborator',
    ]) assert.ok(published.includes(text), `Published metadata did not render: ${text}`);
    assert.match(published, /<video[^>]*poster="\/art\/horizon\.svg"/);
    assert.match(published, /<link[^>]*rel="canonical"[^>]*href="https:\/\/forge-portfolio\.digivism9\.workers\.dev\/work\/published-authoring-fixture\/"/);
    assert.ok(!published.includes('Sample project ·'), 'Published nonsample was incorrectly described as a sample');
    assert.ok(published.includes('Placeholder image'), 'Unreplaced media must retain its placeholder disclosure');

    const retainedSamples = ['the-last-rune-engine', 'dragon-resonance', 'isekai-live-action', 'surreal-universe'];
    for (const slug of retainedSamples) {
      const html = await readFile(join(dist, `work/${slug}/index.html`), 'utf8');
      assert.ok(html.includes('Sample project ·'), `Legacy sample ${slug} lost its disclosure`);
    }
    const sitemap = await readFile(join(dist, 'sitemap.xml'), 'utf8');
    const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
    assert.deepEqual(new Set(locations), new Set([
      '/', '/work/', '/about/', '/contact/', ...retainedSamples.map((slug) => `/work/${slug}/`), `/work/${publicSlug}/`,
    ].map((path) => `${productionOrigin}${path}`)));
    assert.equal(locations.length, 9, 'Sitemap entries must be unique and public');
  });
});

test('an invalid draft still fails collection validation before publication filtering', { timeout: 90_000 }, async () => {
  await withBuiltFixture(async (directory) => {
    const original = await fixtureRecord(directory);
    await writeProject(directory, { ...original, status: 'draft', categories: ['unrecognized-private-category'] });
  }, async () => {}, /InvalidContentEntryDataError[\s\S]*categories\.0/);
});

test('a conflicting draft slug still fails identity validation before publication filtering', { timeout: 90_000 }, async () => {
  await withBuiltFixture(async (directory) => {
    const original = await fixtureRecord(directory);
    await writeProject(directory, { ...original, status: 'draft' }, 'z-duplicate-draft.json');
  }, async () => {}, /Duplicate portfolio slug: the-long-night|Project filename z-duplicate-draft\.json must match slug the-long-night/);
});

test('configured creator and collaboration details render in actual static pages without a form backend', { timeout: 90_000 }, async () => {
  const subject = 'FORGE collaboration & editorial / motion?';
  const email = 'creator+collaboration@forge-profile.test';
  const profileURL = 'https://portfolio.forge-profile.test/artist';
  await withBuiltFixture(async (directory) => {
    const portrait = (await fixtureRecord(directory, 'isekai-live-action')).cover;
    const configuration = {
      creatorDisplayName: 'Fixture Creator', professionalTitle: 'Fixture Visual Director',
      studioName: 'Fixture Studio', shortBio: 'Biography supplied only in this automated fixture.',
      contactEmail: email, contactSubject: subject,
      creativeServices: [{ title: 'Fixture visual development', description: 'An owner-configured service description.' }],
      capabilities: [{ title: 'Fixture finishing', description: 'An owner-configured capability description.' }],
      profileImage: { ...portrait, alt: 'Placeholder profile image for the configured build fixture' },
      socialLinks: [{ label: 'Fixture portfolio', url: profileURL }],
      collaborationAvailability: 'open',
      collaborationIntroduction: 'A configured invitation to discuss a creative brief.',
    };
    const file = join(directory, 'src/data/site.ts');
    const original = await readFile(file, 'utf8');
    await writeFile(file, `${original}\nObject.assign(site, ${JSON.stringify(configuration)});\nsiteConfigSchema.parse(site);\n`);
  }, async (directory) => {
    const about = await readFile(join(directory, 'dist/about/index.html'), 'utf8');
    const contact = await readFile(join(directory, 'dist/contact/index.html'), 'utf8');
    for (const text of ['Fixture Creator', 'Fixture Visual Director', 'Fixture Studio',
      'Biography supplied only in this automated fixture.', 'Fixture finishing', 'An owner-configured capability description.']) {
      assert.ok(about.includes(text), `Configured About content missing: ${text}`);
    }
    assert.ok(about.includes('Placeholder profile image for the configured build fixture'));
    for (const text of ['Open to collaboration', 'A configured invitation to discuss a creative brief.',
      'Fixture visual development', 'An owner-configured service description.', 'Fixture portfolio']) {
      assert.ok(contact.includes(text), `Configured Contact content missing: ${text}`);
    }
    const expectedMailto = `mailto:creator%2Bcollaboration@forge-profile.test?subject=${encodeURIComponent(subject)}`;
    assert.ok(contact.includes(`href="${expectedMailto}"`), 'Contact link must encode the address and subject');
    const socialAnchor = contact.match(/<a\b[^>]*href="https:\/\/portfolio\.forge-profile\.test\/artist"[^>]*>/)?.[0];
    assert.ok(socialAnchor, 'Configured public profile was not linked');
    if (/target="_blank"/.test(socialAnchor)) {
      assert.match(socialAnchor, /rel="[^"]*noopener/);
      assert.match(socialAnchor, /rel="[^"]*noreferrer/);
    }
    assert.doesNotMatch(contact, /<form\b/i, 'Collaboration must remain a static mailto flow');
    assert.ok(!contact.includes('Contact details will be shared here soon'), 'Configured address must replace the missing-contact fallback');
  });
});
