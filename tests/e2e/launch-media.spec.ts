import { expect, test, type Locator } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { projectSchema } from '../../src/lib/project-schema';
import { isPublicProject } from '../../src/lib/project-utils';

const projects = readdirSync(resolve('src/content/projects'))
  .filter((filename) => filename.endsWith('.json'))
  .map((filename) => projectSchema.parse(JSON.parse(readFileSync(resolve('src/content/projects', filename), 'utf8'))))
  .filter((project) => isPublicProject({ data: project }));
const film = projects.find((project) => project.video?.orientation === 'landscape' && project.video.captions.length)!;
const previewProject = projects.find((project) => project.previewVideo)!;

async function expectPlaying(video: Locator) {
  await expect.poll(() => video.evaluate((element) => {
    const media = element as HTMLVideoElement;
    return !media.paused && media.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && media.currentTime > 0;
  })).toBe(true);
}

test('enabling data saving at runtime stops active media and keeps new hover previews unloaded', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'connection', {
      configurable: true,
      value: Object.assign(new EventTarget(), { saveData: false }),
    });
  });
  await page.goto('/');
  const hero = page.locator('[data-hero-video]');
  await page.getByRole('button', { name: 'Play showreel', exact: true }).click();
  await expectPlaying(hero);
  await page.evaluate(() => {
    const connection = (navigator as Navigator & { connection: EventTarget & { saveData: boolean } }).connection;
    connection.saveData = true;
    connection.dispatchEvent(new Event('change'));
  });
  await expect.poll(() => hero.evaluate((element) => (element as HTMLVideoElement).paused)).toBe(true);
  await expect(page.locator('[data-hero-status]')).toContainText('save data');
  // Explicit playback remains available even after automatic motion has been stopped.
  await page.getByRole('button', { name: 'Play showreel', exact: true }).click();
  await expectPlaying(hero);

  await page.goto('/work/');
  const card = page.locator(`[data-project-card]:has(a[href="/work/${previewProject.slug}/"])`);
  const preview = card.locator('[data-card-preview]');
  await card.hover();
  await expectPlaying(preview);
  await page.evaluate(() => {
    const connection = (navigator as Navigator & { connection: EventTarget & { saveData: boolean } }).connection;
    connection.saveData = true;
    connection.dispatchEvent(new Event('change'));
  });
  await expect.poll(() => preview.evaluate((element) => {
    const media = element as HTMLVideoElement;
    return media.paused && media.currentTime === 0 && !media.hasAttribute('src');
  })).toBe(true);
  await page.mouse.move(0, 0);
  await card.hover();
  await expect(preview).not.toHaveAttribute('src');
  await expect(card).toHaveAttribute('data-preview-state', 'idle');
});

test('configured film captions decode as WebVTT cues and the transcript remains keyboard accessible', async ({ page }) => {
  await page.goto(`/work/${film.slug}/`);
  const video = page.locator('[data-project-video]');
  const track = video.locator('track').first();
  await video.evaluate((element) => {
    const media = element as HTMLVideoElement;
    media.textTracks[0]!.mode = 'showing';
  });
  await page.getByRole('button', { name: `Play film: ${film.title}`, exact: true }).click();
  await expectPlaying(video);
  await expect.poll(() => track.evaluate((element) => (element as HTMLTrackElement).readyState)).toBe(2);
  const cueText = await track.evaluate((element) => {
    const cues = (element as HTMLTrackElement).track.cues;
    return Array.from(cues ?? [], (cue) => (cue as VTTCue).text).join(' ');
  });
  expect(cueText).toContain('NO ORIGINAL FOOTAGE');
  await video.evaluate((element) => (element as HTMLVideoElement).pause());
  const transcript = page.locator('.media-transcript');
  await transcript.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(transcript).toHaveAttribute('open', '');
  await expect(transcript.locator('p')).toHaveText(film.video!.transcript!);
});

test('a stalled project film returns to its poster and a keyboard retry plays the real clip', async ({ page }) => {
  await page.clock.install();
  await page.addInitScript(() => {
    const originalPlay = HTMLMediaElement.prototype.play;
    let firstAttempt = true;
    HTMLMediaElement.prototype.play = function () {
      if (firstAttempt) {
        firstAttempt = false;
        return new Promise<void>(() => {});
      }
      return originalPlay.call(this);
    };
  });
  await page.goto(`/work/${film.slug}/`);
  await page.getByRole('button', { name: `Play film: ${film.title}`, exact: true }).click();
  await expect(page.locator('[data-project-player]')).toHaveAttribute('data-player-state', 'loading');
  await page.clock.fastForward(12_001);
  await expect(page.locator('[data-project-player]')).toHaveAttribute('data-player-state', 'error');
  await expect(page.locator('[data-player-poster]')).toBeVisible();
  await expect(page.locator('[data-player-status]')).toContainText('Video unavailable');
  await expect(page.locator('[data-player-retry]')).toBeFocused();
  await page.keyboard.press('Enter');
  await expectPlaying(page.locator('[data-project-video]'));
});

test('closing a still viewer restores focus without automatically resuming its background film', async ({ page }) => {
  await page.goto(`/work/${film.slug}/`);
  const video = page.locator('[data-project-video]');
  await page.getByRole('button', { name: `Play film: ${film.title}`, exact: true }).click();
  await expectPlaying(video);
  const opener = page.locator('[data-lightbox-trigger]').first();
  // Avoid scrolling the film away so the modal itself must stop playback.
  await opener.dispatchEvent('click');
  await expect(page.locator('[data-image-lightbox]')).toBeVisible();
  await expect.poll(() => video.evaluate((element) => (element as HTMLVideoElement).paused)).toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-image-lightbox]')).toBeHidden();
  await expect(opener).toBeFocused();
  await expect(page.locator('[data-project-player]')).toHaveAttribute('data-player-state', 'paused');
  await expect.poll(() => video.evaluate((element) => (element as HTMLVideoElement).paused)).toBe(true);
  const resume = page.getByRole('button', { name: `Resume film: ${film.title}`, exact: true });
  await expect(resume).toBeVisible();
  await resume.click();
  await expectPlaying(video);
});
