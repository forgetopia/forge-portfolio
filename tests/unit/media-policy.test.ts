import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { mediaPolicy } from '../../src/data/media';
import { createMediaPolicy, isAllowedMediaSource } from '../../src/lib/media-policy';
import { createImageMediaSchema, createProjectSchema, createVideoMediaSchema, imageMediaSchema, videoMediaSchema } from '../../src/lib/project-schema';

const sample = JSON.parse(readFileSync(resolve('src/content/projects/the-long-night.json'), 'utf8'));
const fixtureOrigin = 'https://media.example.test';
const fixturePolicy = createMediaPolicy({ trustedOrigins: [fixtureOrigin] });
const remoteImages = createImageMediaSchema(fixturePolicy);
const remoteVideos = createVideoMediaSchema(fixturePolicy);

test('production media policy trusts no remote hosts until an owner approves an exact HTTPS origin', () => {
  assert.deepEqual(mediaPolicy.trustedOrigins, []);
  assert.equal(imageMediaSchema.safeParse({ ...sample.cover, src: `${fixtureOrigin}/cover.webp` }).success, false);
  assert.equal(videoMediaSchema.safeParse({ ...sample.video, src: `${fixtureOrigin}/film.mp4` }).success, false);
  assert.equal(imageMediaSchema.safeParse(sample.cover).success, true);
  assert.equal(videoMediaSchema.safeParse(sample.video).success, true);
});

test('trusted media configuration rejects paths, credentials, fragments, and protocols other than HTTPS', () => {
  for (const origin of [
    'http://media.example.test', '//media.example.test', 'javascript:alert(1)', '',
    `${fixtureOrigin}/`, `${fixtureOrigin}/assets`, `${fixtureOrigin}?token=fixture`,
    `${fixtureOrigin}#film`, 'https://user:password@media.example.test',
    'https://@media.example.test', 'https://*.example.test',
  ]) {
    assert.throws(() => createMediaPolicy({ trustedOrigins: [origin] }), /trusted media origin|Trusted media origins/i, origin);
  }
  const origins = [fixtureOrigin, fixtureOrigin];
  const policy = createMediaPolicy({ trustedOrigins: origins });
  origins.push('https://unapproved.example.test');
  assert.deepEqual(policy.trustedOrigins, [fixtureOrigin]);
  assert.equal(Object.isFrozen(policy), true);
  assert.equal(Object.isFrozen(policy.trustedOrigins), true);
});

test('approved media sources allow CDN query strings while determining MIME type from the URL pathname', () => {
  for (const src of [`${fixtureOrigin}/approved/cover.webp`, `${fixtureOrigin}/approved/cover.webp?width=1600&version=fixture`]) {
    assert.equal(remoteImages.safeParse({ ...sample.cover, src }).success, true);
  }
  for (const src of [`${fixtureOrigin}/approved/film.mp4`, `${fixtureOrigin}/approved/film.mp4?token=fixture&format=webm`]) {
    assert.equal(remoteVideos.safeParse({ ...sample.video, src }).success, true);
    assert.equal(remoteVideos.safeParse({ ...sample.video, src, type: 'video/webm' }).success, false);
  }
  assert.equal(remoteVideos.safeParse({ ...sample.video, src: `${fixtureOrigin}/film.webm?token=fixture`, type: 'video/webm' }).success, true);
  assert.equal(remoteVideos.safeParse({ ...sample.video, src: `${fixtureOrigin}/film.mov?file=.mp4` }).success, false);
  assert.equal(remoteVideos.safeParse({ ...sample.video, src: `${fixtureOrigin}/film?file=.mp4` }).success, false);
});

test('media source validation rejects credentials, protocol tricks, fragments, and lookalike hosts', () => {
  for (const src of [
    'http://media.example.test/film.mp4', '//media.example.test/film.mp4', 'javascript:alert(1)',
    'data:video/mp4;base64,AA==', 'https://user:password@media.example.test/film.mp4',
    'https://@media.example.test/film.mp4', 'https://media.example.test@unapproved.example.test/film.mp4',
    'https://unapproved.example.test@media.example.test/film.mp4',
    'https://media.example.test.unapproved.test/film.mp4', 'https://sub.media.example.test/film.mp4',
    'https://unapproved.example.test/media.example.test/film.mp4',
    'https://media.example.test./film.mp4', 'https://media.example.test:8443/film.mp4',
    `${fixtureOrigin}/film.mp4#chapter`, `${fixtureOrigin}/film.mp4#`,
    ` ${fixtureOrigin}/film.mp4`, `${fixtureOrigin}/film.mp4 `,
    'https://media.example.test\\unapproved.example.test/film.mp4',
    `${fixtureOrigin}/film\n.mp4`,
  ]) {
    assert.equal(isAllowedMediaSource(src, 'video', fixturePolicy), false, src);
    assert.equal(remoteVideos.safeParse({ ...sample.video, src }).success, false, src);
  }
});

test('local media retains strict asset directories and rejects unsafe or encoded paths', () => {
  for (const src of [
    '/media/../secret.mp4', '/media/./film.mp4', '/media//film.mp4', '/media/%2e%2e/film.mp4',
    '/media/film.mp4?token=fixture', '/media/film.mp4#chapter', '/images/film.mp4',
    '/media\\film.mp4', '/media/film name.mp4', '/media/film%20name.mp4',
  ]) assert.equal(remoteVideos.safeParse({ ...sample.video, src }).success, false, src);
  for (const src of ['/images/../secret.webp', '/images/%2e%2e/secret.webp', '/images/cover.webp?width=400', '/media/cover.webp']) {
    assert.equal(remoteImages.safeParse({ ...sample.cover, src }).success, false, src);
  }
  for (const src of ['/art/approved/cover.webp', '/images/approved/cover.jpg', '/placeholders/approved/cover.svg']) {
    assert.equal(remoteImages.safeParse({ ...sample.cover, src }).success, true);
  }
  assert.equal(remoteVideos.safeParse({ ...sample.video, src: '/media/approved/film.mp4' }).success, true);
});

test('approved remote captions and optional video posters use the same media policy and dimensions', () => {
  const poster = { ...sample.cover, src: `${fixtureOrigin}/poster.webp?version=fixture` };
  const captions = [{ src: `${fixtureOrigin}/captions/en.vtt?version=fixture`, srclang: 'en', label: 'English' }];
  const film = { ...sample.video, src: `${fixtureOrigin}/film.mp4`, hasAudio: true, captions, poster };
  assert.equal(remoteVideos.safeParse(film).success, true);
  assert.equal(videoMediaSchema.safeParse(film).success, false);
  assert.equal(remoteVideos.safeParse({ ...film, captions: [] }).success, false);
  assert.equal(remoteVideos.safeParse({ ...film, captions: [{ ...captions[0], src: 'https://unapproved.example.test/en.vtt' }] }).success, false);
  assert.equal(remoteVideos.safeParse({ ...film, poster: { ...poster, width: 0 } }).success, false);
  assert.equal(remoteVideos.safeParse({ ...film, poster: { ...poster, src: 'https://unapproved.example.test/poster.webp' } }).success, false);
  const remoteProject = createProjectSchema(fixturePolicy).parse({
    ...sample, cover: poster, video: film,
    previewVideo: { ...sample.previewVideo, src: `${fixtureOrigin}/preview.mp4` },
    stills: [{ ...poster, src: `${fixtureOrigin}/still.webp` }],
  });
  assert.equal(remoteProject.video?.poster?.src, poster.src);
  assert.equal(remoteProject.cover.src, poster.src);
  assert.equal(remoteProject.stills[0].src, `${fixtureOrigin}/still.webp`);
});
