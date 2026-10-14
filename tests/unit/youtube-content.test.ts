import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { mediaPolicy } from '../../src/data/media';
import { createProjectSchema, projectSchema, videoMediaSchema, youtubeMediaSchema } from '../../src/lib/project-schema';
import {
  buildYouTubeEmbedURL,
  buildYouTubeWatchURL,
  isYouTubeStartSeconds,
  isYouTubeVideoId,
  type YouTubeVideo,
} from '../../src/lib/youtube';

const sample = JSON.parse(readFileSync(resolve('src/content/projects/the-long-night.json'), 'utf8'));
const { video: nativeVideo, ...withoutMainFilm } = sample;
// Syntax-only test identifier. It is never written to portfolio content or requested over the network.
const youtube: YouTubeVideo = { videoId: 'abcdefghijk', orientation: 'landscape' };

test('YouTube metadata accepts both orientations and optional nonnegative safe integer offsets', () => {
  for (const orientation of ['landscape', 'portrait'] as const) {
    const metadata = { ...youtube, orientation };
    assert.deepEqual(youtubeMediaSchema.parse(metadata), metadata);
    for (const startSeconds of [0, 1, 90, Number.MAX_SAFE_INTEGER]) {
      assert.equal(isYouTubeStartSeconds(startSeconds), true);
      assert.deepEqual(youtubeMediaSchema.parse({ ...metadata, startSeconds }), { ...metadata, startSeconds });
    }
  }
  for (const videoId of ['ABCDEFGHIJK', '01234567890', 'abc_DEF-123']) {
    assert.equal(isYouTubeVideoId(videoId), true);
    assert.equal(youtubeMediaSchema.safeParse({ ...youtube, videoId }).success, true);
  }
});

test('YouTube metadata rejects malformed IDs, URL injection, unsafe offsets, and unknown fields', () => {
  for (const videoId of [
    undefined, null, 12345678901, '', 'abcdefghij', 'abcdefghijkl',
    'abcdefghij ', ' abcdefghij', 'abcdefghijk\n', 'abcdefghijk\r',
    'abcdefghij/', 'abcdefghij?', 'abcdefghij#', 'abcdefghij&', 'abcdefghij%',
    'abcdefghijé', 'https://www.youtube.com/watch?v=abcdefghijk',
    'https://www.youtube-nocookie.com/embed/abcdefghijk', 'javascript:alert(1)',
    '../abcdefghijk', 'abcdefghijk?autoplay=1',
  ]) {
    assert.equal(isYouTubeVideoId(videoId), false, String(videoId));
    assert.equal(youtubeMediaSchema.safeParse({ ...youtube, videoId }).success, false, String(videoId));
    const unsafe = { ...youtube, videoId } as unknown as YouTubeVideo;
    assert.throws(() => buildYouTubeEmbedURL(unsafe), TypeError);
    assert.throws(() => buildYouTubeWatchURL(unsafe), TypeError);
  }
  for (const startSeconds of [-1, -0.5, 1.5, Infinity, -Infinity, NaN, Number.MAX_SAFE_INTEGER + 1, '30', null]) {
    assert.equal(isYouTubeStartSeconds(startSeconds), false, String(startSeconds));
    assert.equal(youtubeMediaSchema.safeParse({ ...youtube, startSeconds }).success, false, String(startSeconds));
    const unsafe = { ...youtube, startSeconds } as unknown as YouTubeVideo;
    assert.throws(() => buildYouTubeEmbedURL(unsafe), TypeError);
    assert.throws(() => buildYouTubeWatchURL(unsafe), TypeError);
  }
  for (const orientation of [undefined, null, 'square', 'LANDSCAPE', '']) {
    assert.equal(youtubeMediaSchema.safeParse({ ...youtube, orientation }).success, false);
    assert.throws(() => buildYouTubeEmbedURL({ ...youtube, orientation } as unknown as YouTubeVideo), TypeError);
  }
  assert.equal(youtubeMediaSchema.safeParse({ ...youtube, url: 'https://unapproved.example.test/embed' }).success, false);
  assert.equal(youtubeMediaSchema.safeParse({ ...youtube, autoplay: true }).success, false);
});

test('main-film selection accepts native, YouTube, or absent films while rejecting ambiguous content', () => {
  const legacy = projectSchema.parse(sample);
  assert.equal(legacy.video?.src, nativeVideo.src);
  assert.equal(legacy.youtube, undefined);
  const noFilm = projectSchema.parse(withoutMainFilm);
  assert.equal(noFilm.video, undefined);
  assert.equal(noFilm.youtube, undefined);
  assert.equal(noFilm.previewVideo?.src, sample.previewVideo.src);
  const hosted = projectSchema.parse({ ...withoutMainFilm, youtube });
  assert.deepEqual(hosted.youtube, youtube);
  assert.equal(hosted.video, undefined);
  assert.equal(hosted.previewVideo?.src, sample.previewVideo.src, 'Native gallery hover preview remains independent.');
  assert.equal(projectSchema.safeParse({ ...sample, youtube }).success, false);
  assert.equal(projectSchema.safeParse({ ...withoutMainFilm, youtube: null }).success, false);
  assert.equal(projectSchema.safeParse({ ...withoutMainFilm, youtube: {} }).success, false);
  assert.equal(createProjectSchema().safeParse({ ...sample, youtube }).success, false);
  assert.equal(videoMediaSchema.safeParse({ ...nativeVideo, src: '/media/test-film.webm', type: 'video/webm' }).success, true);
});

test('embed URL builders use only the fixed privacy-enhanced origin and standard inline controls', () => {
  const url = new URL(buildYouTubeEmbedURL(youtube));
  assert.equal(url.origin, 'https://www.youtube-nocookie.com');
  assert.equal(url.pathname, '/embed/abcdefghijk');
  assert.equal(url.username, '');
  assert.equal(url.password, '');
  assert.equal(url.hash, '');
  assert.deepEqual(Object.fromEntries(url.searchParams), { controls: '1', playsinline: '1' });
  const withStart = new URL(buildYouTubeEmbedURL({ ...youtube, startSeconds: 32 }));
  assert.equal(withStart.searchParams.get('start'), '32');
  assert.equal(withStart.searchParams.has('autoplay'), false);
  assert.equal(new URL(buildYouTubeEmbedURL({ ...youtube, startSeconds: 0 })).searchParams.get('start'), '0');
  assert.equal(new URL(buildYouTubeEmbedURL(youtube, { autoplay: false })).searchParams.has('autoplay'), false);
  assert.equal(new URL(buildYouTubeEmbedURL(youtube, { autoplay: true })).searchParams.get('autoplay'), '1');
});

test('normal YouTube fallback links preserve validated IDs and requested starting positions', () => {
  const url = new URL(buildYouTubeWatchURL(youtube));
  assert.equal(url.origin, 'https://www.youtube.com');
  assert.equal(url.pathname, '/watch');
  assert.deepEqual(Object.fromEntries(url.searchParams), { v: 'abcdefghijk' });
  const withStart = new URL(buildYouTubeWatchURL({ ...youtube, startSeconds: 32, orientation: 'portrait' }));
  assert.deepEqual(Object.fromEntries(withStart.searchParams), { v: 'abcdefghijk', t: '32s' });
  assert.equal(new URL(buildYouTubeWatchURL({ ...youtube, startSeconds: 0 })).searchParams.get('t'), '0s');
});

test('YouTube iframe trust never permits watch or embed URLs as direct MP4/WebM media', () => {
  assert.deepEqual(mediaPolicy.trustedOrigins, []);
  for (const src of [
    buildYouTubeEmbedURL(youtube), buildYouTubeWatchURL(youtube),
    'https://www.youtube-nocookie.com/film.mp4', 'https://www.youtube.com/film.mp4',
    'https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg',
  ]) {
    assert.equal(videoMediaSchema.safeParse({ ...nativeVideo, src }).success, false, src);
    assert.equal(projectSchema.safeParse({ ...sample, previewVideo: { ...sample.previewVideo, src } }).success, false, src);
  }
});

test('existing portfolio records remain unchanged and contain no owner-unapproved YouTube IDs', () => {
  const contentDirectory = resolve('src/content/projects');
  for (const filename of readdirSync(contentDirectory).filter((entry) => entry.endsWith('.json'))) {
    const record = JSON.parse(readFileSync(resolve(contentDirectory, filename), 'utf8'));
    assert.equal(record.youtube, undefined, `${filename} has no owner-approved YouTube video yet.`);
    assert.equal(projectSchema.safeParse(record).success, true, filename);
  }
});
