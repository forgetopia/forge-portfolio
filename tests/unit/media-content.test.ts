import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { showreel } from '../../src/data/showreel';
import { imageMediaSchema, projectSchema, videoMediaSchema } from '../../src/lib/project-schema';

const records = readdirSync(resolve('src/content/projects'))
  .filter((filename) => filename.endsWith('.json'))
  .map((filename) => JSON.parse(readFileSync(resolve('src/content/projects', filename), 'utf8')));
const sample = records.find((record) => record.slug === 'the-long-night');
const video = sample.video;

test('project media is explicitly labeled, locally available, and represents both orientations without invented credits', () => {
  const orientations = new Set<string>();
  for (const record of records) {
    const project = projectSchema.parse(record);
    assert.ok(project.video, `${project.title} requires a sample film`);
    assert.ok(project.previewVideo, `${project.title} requires a sample preview`);
    assert.ok(project.stills.length >= 2, `${project.title} requires navigable stills`);
    assert.deepEqual(project.credits, [], 'Sample records cannot invent names or credits');
    assert.match(project.synopsis ?? '', /sample|placeholder|not.*supplied/i);
    for (const film of [project.video, project.previewVideo]) {
      assert.equal(film.placeholder, true);
      assert.equal(film.hasAudio, false, 'The supplied placeholder clips are silent');
      assert.ok(existsSync(resolve('public', `.${film.src}`)), `Missing ${film.src}`);
      assert.match(film.transcript ?? '', /placeholder/i);
      orientations.add(film.orientation);
      for (const caption of film.captions) {
        const text = readFileSync(resolve('public', `.${caption.src}`), 'utf8');
        assert.match(text, /^WEBVTT\b/);
        assert.match(text, /placeholder/i);
      }
    }
    for (const still of project.stills) {
      assert.equal(still.placeholder, true);
      assert.match(still.alt, /placeholder/i);
      assert.match(still.caption ?? '', /placeholder/i);
      assert.ok(existsSync(resolve('public', `.${still.src}`)), `Missing ${still.src}`);
    }
  }
  assert.deepEqual([...orientations].sort(), ['landscape', 'portrait']);
});

test('showreel defaults to user-initiated playback with validated local video and poster fallbacks', () => {
  assert.equal(showreel.autoplay, false);
  assert.equal(videoMediaSchema.safeParse(showreel.video).success, true);
  assert.equal(imageMediaSchema.safeParse(showreel.poster).success, true);
  assert.equal(showreel.video.placeholder, true);
  assert.equal(showreel.poster.placeholder, true);
  for (const asset of [showreel.video.src, showreel.poster.src]) {
    assert.ok(existsSync(resolve('public', `.${asset}`)), `Missing ${asset}`);
  }
});

test('video metadata rejects unsafe sources, mismatched formats, invalid dimensions, and unexpected fields', () => {
  for (const change of [
    { src: 'https://example.com/film.mp4' },
    { src: '//example.com/film.mp4' },
    { src: '/media/../private.mp4' },
    { src: '/media/film.mp4?token=example' },
    { src: '/media/film.mov' },
    { src: '/images/film.mp4' },
    { type: 'video/quicktime' },
    { type: 'video/webm' },
    { width: 0 },
    { width: 10.5 },
    { height: -2 },
    { height: undefined },
    { orientation: 'square' },
    { orientation: 'portrait' },
    { width: 1000, height: 1000 },
    { placeholder: 'true' },
    { hasAudio: 'false' },
    { unexpected: true },
  ]) {
    assert.equal(videoMediaSchema.safeParse({ ...video, ...change }).success, false, JSON.stringify(change));
  }
  assert.equal(videoMediaSchema.safeParse({ ...video, src: '/media/film.webm', type: 'video/webm' }).success, true);
});

test('audible films require usable local captions, while silent media receives safe defaults', () => {
  assert.equal(videoMediaSchema.safeParse({ ...video, hasAudio: true, captions: [] }).success, false);
  assert.equal(videoMediaSchema.safeParse({ ...video, hasAudio: true }).success, true);
  for (const caption of [
    { src: 'https://example.com/en.vtt', srclang: 'en', label: 'English' },
    { src: '/media/../en.vtt', srclang: 'en', label: 'English' },
    { src: '/media/en.txt', srclang: 'en', label: 'English' },
    { src: '/media/en.vtt', srclang: 'English language', label: 'English' },
    { src: '/media/en.vtt', srclang: 'en', label: '' },
    { src: '/media/en.vtt', srclang: 'en', label: 'English', unexpected: true },
  ]) {
    assert.equal(videoMediaSchema.safeParse({ ...video, captions: [caption] }).success, false);
  }
  const { hasAudio, captions, transcript, ...minimal } = video;
  const parsed = videoMediaSchema.parse(minimal);
  assert.equal(parsed.hasAudio, false);
  assert.deepEqual(parsed.captions, []);
  assert.equal(parsed.transcript, undefined);
});

test('legacy project records retain predictable optional media and editorial defaults', () => {
  const { video, previewVideo, synopsis, creativeDirection, credits, stills, ...legacy } = sample;
  const parsed = projectSchema.parse(legacy);
  assert.equal(parsed.video, undefined);
  assert.equal(parsed.previewVideo, undefined);
  assert.equal(parsed.synopsis, undefined);
  assert.deepEqual(parsed.creativeDirection, []);
  assert.deepEqual(parsed.credits, []);
  assert.deepEqual(parsed.stills, []);
  for (const change of [
    { synopsis: '' },
    { creativeDirection: [''] },
    { credits: [{ role: 'Director', name: '' }] },
    { credits: [{ role: '', name: 'Example' }] },
    { stills: [{ ...sample.cover, src: '/../private.svg' }] },
    { stills: [{ ...sample.cover, caption: '' }] },
    { video: { ...video, width: 0 } },
    { previewVideo: { ...video, src: '/media/../private.mp4' } },
  ]) {
    assert.equal(projectSchema.safeParse({ ...legacy, ...change }).success, false, JSON.stringify(change));
  }
});
