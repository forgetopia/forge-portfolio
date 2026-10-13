import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { projectCategories, projectSchema } from '../../src/lib/project-schema';
import { getFeaturedProjects, sortProjects, validateProjectEntries } from '../../src/lib/project-utils';

const contentDirectory = resolve('src/content/projects');
const records = readdirSync(contentDirectory)
  .filter((filename) => filename.endsWith('.json'))
  .map((filename) => ({
    filename,
    data: JSON.parse(readFileSync(resolve(contentDirectory, filename), 'utf8')),
  }));
const sample = records.find(({ data }) => data.slug === 'the-long-night')!.data;
const requiredSamples = new Map([
  ['the-long-night', 'The Long Night'],
  ['the-last-rune-engine', 'The Last Rune Engine'],
  ['dragon-resonance', 'Dragon Resonance'],
  ['isekai-live-action', 'Isekai Live-Action'],
  ['surreal-universe', 'Surreal Universe'],
]);

test('sample content validates, has unique routes, and references real local placeholder images', () => {
  const slugs = new Set<string>();
  for (const { filename, data } of records) {
    const project = projectSchema.parse(data);
    assert.equal(filename, `${project.slug}.json`);
    assert.equal(slugs.has(project.slug), false, `Duplicate project route: ${project.slug}`);
    slugs.add(project.slug);
    if (requiredSamples.has(project.slug)) {
      assert.equal(project.title, requiredSamples.get(project.slug));
      assert.equal(project.sample, true, `${project.title} must be identified as sample content`);
      assert.equal(project.cover.placeholder, true, `${project.title} must identify its placeholder image`);
    }
    assert.ok(existsSync(resolve('public', `.${project.cover.src}`)), `Missing image for ${project.title}`);
    if (project.cover.placeholder) {
      assert.match(project.cover.alt, /placeholder/i, 'Placeholder alternative text must be accurate');
    }
  }
  for (const slug of requiredSamples.keys()) assert.ok(slugs.has(slug), `Missing required sample: ${slug}`);
});

test('categories match the requested taxonomy and invalid or ambiguous categories are rejected', () => {
  assert.deepEqual(projectCategories.map(({ id }) => id), [
    'ai-films',
    'fantasy-live-action',
    'action-combat',
    'fashion-editorial',
    'ai-photography',
    'surreal-experimental',
    'commercial',
  ]);
  for (const categories of [undefined, [], ['unknown'], ['ai-films', 'ai-films']]) {
    assert.equal(projectSchema.safeParse({ ...sample, categories }).success, false);
  }
});

test('slugs reject empty, unsafe, uppercase, or nested routes', () => {
  for (const slug of [undefined, '', '../escape', '/work/title', 'Mixed-Case', 'two words', 'a/b', '-start', 'end-']) {
    assert.equal(projectSchema.safeParse({ ...sample, slug }).success, false, `Accepted unsafe slug ${String(slug)}`);
  }
});

test('media requires local paths, meaningful text, and valid dimensions and orientation', () => {
  for (const change of [
    { src: 'https://example.com/image.jpg' },
    { src: '/../private.svg' },
    { alt: '' },
    { width: 0 },
    { height: -1 },
    { width: 100.5 },
    { height: undefined },
    { orientation: 'square' },
    { orientation: 'portrait', width: 1600, height: 1000 },
    { orientation: 'landscape', width: 1000, height: 1600 },
    { width: 1000, height: 1000 },
  ]) {
    assert.equal(projectSchema.safeParse({ ...sample, cover: { ...sample.cover, ...change } }).success, false);
  }
  assert.equal(projectSchema.safeParse({ ...sample, cover: undefined }).success, false);
});

test('required editorial fields and content types fail validation rather than silently rendering', () => {
  for (const change of [
    { title: '' },
    { summary: undefined },
    { description: [] },
    { description: [''] },
    { featured: 'true' },
    { order: 1.5 },
  ]) {
    assert.equal(projectSchema.safeParse({ ...sample, ...change }).success, false);
  }
});

test('optional metadata has predictable defaults for new unfeatured project records', () => {
  const { featured, order, sample: sampleFlag, ...required } = sample;
  const project = projectSchema.parse(required);
  assert.equal(project.featured, false);
  assert.equal(project.order, 0);
  assert.equal(project.sample, false);
});

test('collection ordering is deterministic and featured selection preserves editorial order without mutation', () => {
  const entries = [
    { data: { slug: 'second', order: 2, featured: true, status: 'published' as const } },
    { data: { slug: 'unfeatured', order: 0, featured: false, status: 'published' as const } },
    { data: { slug: 'beta', order: 1, featured: true, status: 'published' as const } },
    { data: { slug: 'alpha', order: 1, featured: true, status: 'published' as const } },
  ];
  const original = structuredClone(entries);
  assert.deepEqual(sortProjects(entries).map(({ data }) => data.slug), ['unfeatured', 'alpha', 'beta', 'second']);
  assert.deepEqual(getFeaturedProjects(entries).map(({ data }) => data.slug), ['alpha', 'beta', 'second']);
  assert.deepEqual(entries, original);
});

test('duplicate slugs and filename mismatches cannot produce conflicting static routes', () => {
  assert.doesNotThrow(() => validateProjectEntries([{ id: 'one', data: { slug: 'one' } }]));
  assert.throws(() => validateProjectEntries([
    { id: 'one', data: { slug: 'one' } },
    { id: 'one', data: { slug: 'one' } },
  ]), /Duplicate portfolio slug/);
  assert.throws(() => validateProjectEntries([
    { id: 'different-filename', data: { slug: 'one' } },
  ]), /must match slug/);
});
