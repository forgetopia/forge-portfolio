import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { projectSchema } from '../../src/lib/project-schema';
import { filterPublicProjects, getFeaturedProjects, isPublicProject, validateProjectEntries } from '../../src/lib/project-utils';

const records = readdirSync(resolve('src/content/projects'))
  .filter((filename) => filename.endsWith('.json'))
  .map((filename) => JSON.parse(readFileSync(resolve('src/content/projects', filename), 'utf8')));
const sample = records.find((record) => record.slug === 'the-long-night');

test('legacy sample projects remain public and accurately labeled without changing their source records', () => {
  assert.equal(records.length, 5);
  for (const record of records) {
    const data = projectSchema.parse(record);
    assert.equal(data.sample, true);
    assert.equal(data.status, undefined);
    assert.equal(isPublicProject({ data }), true);
    assert.equal(data.cover.placeholder, true);
    assert.deepEqual(data.credits, []);
  }
});

test('explicit publication status controls visibility and never converts a sample into verified work', () => {
  for (const sampleFlag of [false, true]) {
    const published = projectSchema.parse({ ...sample, sample: sampleFlag, status: 'published' });
    const draft = projectSchema.parse({ ...sample, sample: sampleFlag, status: 'draft' });
    const omitted = projectSchema.parse({ ...sample, sample: sampleFlag });
    assert.equal(isPublicProject({ data: published }), true);
    assert.equal(isPublicProject({ data: draft }), false);
    assert.equal(isPublicProject({ data: omitted }), sampleFlag);
    assert.equal(published.sample, sampleFlag);
    assert.equal(draft.sample, sampleFlag);
  }
  const { sample: sampleFlag, ...unverified } = sample;
  assert.equal(isPublicProject({ data: projectSchema.parse(unverified) }), false);
  for (const status of ['', 'scheduled', true, null]) {
    assert.equal(projectSchema.safeParse({ ...sample, status }).success, false);
  }
});

test('public and featured selections exclude private records even when called independently', () => {
  const entries = [
    { data: { slug: 'draft-sample', order: 0, featured: true, sample: true, status: 'draft' as const } },
    { data: { slug: 'private-new', order: 1, featured: true, sample: false } },
    { data: { slug: 'released', order: 3, featured: true, sample: false, status: 'published' as const } },
    { data: { slug: 'legacy-sample', order: 2, featured: true, sample: true } },
    { data: { slug: 'unfeatured', order: 1, featured: false, sample: false, status: 'published' as const } },
  ];
  const original = structuredClone(entries);
  assert.deepEqual(filterPublicProjects(entries).map(({ data }) => data.slug), ['released', 'legacy-sample', 'unfeatured']);
  assert.deepEqual(getFeaturedProjects(entries).map(({ data }) => data.slug), ['legacy-sample', 'released']);
  assert.deepEqual(entries, original);
});

test('private records still participate in identity and duplicate validation', () => {
  const draft = { id: 'secret-film', data: { ...projectSchema.parse(sample), slug: 'secret-film', status: 'draft' as const } };
  assert.throws(() => validateProjectEntries([draft, { ...draft }]), /Duplicate portfolio slug: secret-film/);
  assert.throws(() => validateProjectEntries([{ ...draft, id: 'different-file' }]), /must match slug secret-film/);
  assert.deepEqual(filterPublicProjects([draft]), []);
});

test('optional production metadata accepts useful authoring formats without requiring invented defaults', () => {
  const metadata = {
    subtitle: 'Optional fixture subtitle',
    year: 2026,
    format: 'Short film',
    duration: '2 min 30 sec',
    aspectRatio: '2.39:1',
    tools: ['Approved image tool', 'Compositing software'],
    productionRole: 'Creative direction',
    overview: 'Fixture overview for validation only.',
    productionWorkflow: ['Develop a visual concept.', 'Review approved shots.'],
  };
  const parsed = projectSchema.parse({ ...sample, ...metadata });
  for (const [key, value] of Object.entries(metadata)) {
    assert.deepEqual(parsed[key as keyof typeof parsed], value);
    assert.equal(projectSchema.parse(sample)[key as keyof typeof parsed], undefined);
  }
  for (const aspectRatio of ['16:9', '9:16', '1:1']) {
    assert.equal(projectSchema.safeParse({ ...sample, aspectRatio }).success, true);
  }
  for (const change of [
    { subtitle: '' }, { year: 1899 }, { year: 2101 }, { year: 2026.5 }, { year: '2026' },
    { format: '' }, { duration: '' }, { aspectRatio: '0:9' }, { aspectRatio: '-1:1' },
    { aspectRatio: '16/9' }, { aspectRatio: '16:0' }, { aspectRatio: 'wide' },
    { tools: [''] }, { productionRole: '' }, { overview: '' }, { productionWorkflow: [''] },
  ]) {
    assert.equal(projectSchema.safeParse({ ...sample, ...change }).success, false, JSON.stringify(change));
  }
});
