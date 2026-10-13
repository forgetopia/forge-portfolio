import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { projectSchema } from '../../src/lib/project-schema';

const projects = readdirSync(resolve('src/content/projects'))
  .filter((filename) => filename.endsWith('.json'))
  .map((filename) => projectSchema.parse(JSON.parse(readFileSync(resolve('src/content/projects', filename), 'utf8'))));
const landscape = projects.find((project) => project.video?.orientation === 'landscape')!;
const portrait = projects.find((project) => project.video?.orientation === 'portrait')!;
const previewProjects = projects.filter((project) => project.previewVideo);
const hero = (page: Page) => page.locator('[data-hero-showreel]');
const heroVideo = (page: Page) => page.locator('video[data-hero-video]');
const card = (page: Page, slug: string) => page.locator(`[data-project-card]:has(a[href="/work/${slug}/"])`);
const cardVideo = (page: Page, slug: string) => card(page, slug).locator('video[data-card-preview]');
const dialog = (page: Page) => page.locator('dialog[data-image-lightbox]');
const triggers = (page: Page) => page.locator('[data-still-gallery] [data-lightbox-trigger]');

async function expectPlaying(video: Locator) {
  // Exercise real decoding and playback rather than replacing play() with a success stub.
  await expect.poll(() => video.evaluate((element) => {
    const media = element as HTMLVideoElement;
    return !media.paused && media.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && media.currentTime > 0;
  })).toBe(true);
}

async function expectPreviewReset(video: Locator) {
  await expect.poll(() => video.evaluate((element) => {
    const media = element as HTMLVideoElement;
    return media.paused && media.currentTime === 0 && !media.getAttribute('src');
  })).toBe(true);
}

async function enableAutoplay(page: Page) {
  await page.route('**/*', async (route) => {
    if (!route.request().isNavigationRequest() || new URL(route.request().url()).pathname !== '/') {
      await route.continue();
      return;
    }
    const response = await route.fetch();
    const body = await response.text();
    expect(body).toContain('data-autoplay="false"');
    await route.fulfill({ response, body: body.replace('data-autoplay="false"', 'data-autoplay="true"') });
  });
}

test('hero remains a labeled poster until requested, then supports real play, pause, and mute controls', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (request) => { if (/\.(mp4|webm)(?:\?|$)/.test(request.url())) requests.push(request.url()); });
  await page.goto('/');
  await expect(hero(page)).toHaveAttribute('data-autoplay', 'false');
  await expect(heroVideo(page)).toHaveAttribute('preload', 'none');
  expect(await heroVideo(page).getAttribute('src')).toBeNull();
  expect(requests).toEqual([]);
  await expect(hero(page)).toContainText(/placeholder/i);
  await expect(page.locator('[data-hero-status]')).toHaveAttribute('aria-live', 'polite');

  const play = page.getByRole('button', { name: 'Play showreel', exact: true });
  await play.focus();
  await page.keyboard.press('Enter');
  await expectPlaying(heroVideo(page));
  await expect(hero(page)).toHaveAttribute('data-video-visible', 'true');
  await expect.poll(() => heroVideo(page).evaluate((video) => (video as HTMLVideoElement).muted)).toBe(true);
  await page.getByRole('button', { name: 'Unmute showreel', exact: true }).click();
  await expect.poll(() => heroVideo(page).evaluate((video) => (video as HTMLVideoElement).muted)).toBe(false);
  await page.getByRole('button', { name: 'Mute showreel', exact: true }).click();
  await page.getByRole('button', { name: 'Pause showreel', exact: true }).click();
  await expect.poll(() => heroVideo(page).evaluate((video) => (video as HTMLVideoElement).paused)).toBe(true);
  await expect(page.getByRole('button', { name: 'Play showreel', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Play showreel', exact: true }).click();
  await expectPlaying(heroVideo(page));
  expect(requests.length).toBeGreaterThan(0);
});

test('hero rejects blocked playback gracefully and leaves an accessible retry with the poster', async ({ page }) => {
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = () => Promise.reject(new DOMException('Playback blocked in failure test', 'NotAllowedError'));
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Play showreel', exact: true }).click();
  await expect(hero(page)).toHaveAttribute('data-playback', 'error');
  await expect(hero(page)).toHaveAttribute('data-video-visible', 'false');
  await expect(page.locator('[data-hero-status]')).toContainText(/unavailable.*poster/i);
  await expect(page.getByRole('button', { name: 'Retry showreel', exact: true })).toBeVisible();
  await expect(page.locator('[data-hero-play]')).toBeFocused();
});

test('hero reports a failed media request and can recover on retry', async ({ page }) => {
  await page.route('**/media/*.mp4', (route) => route.abort('failed'));
  await page.goto('/');
  await page.getByRole('button', { name: 'Play showreel', exact: true }).click();
  await expect(hero(page)).toHaveAttribute('data-playback', 'error');
  await expect(page.locator('[data-hero-status]')).toContainText(/unavailable/i);
  await expect(hero(page)).toHaveAttribute('data-video-visible', 'false');
  await page.unroute('**/media/*.mp4');
  await page.getByRole('button', { name: 'Retry showreel', exact: true }).click();
  await expectPlaying(heroVideo(page));
});

test('a stalled hero load times out to its poster without leaving an indefinite loading state', async ({ page }) => {
  await page.clock.install();
  await page.addInitScript(() => { HTMLMediaElement.prototype.play = () => new Promise<void>(() => {}); });
  await page.goto('/');
  await page.getByRole('button', { name: 'Play showreel', exact: true }).click();
  await expect(hero(page)).toHaveAttribute('data-playback', 'loading');
  await page.clock.fastForward(12_001);
  await expect(hero(page)).toHaveAttribute('data-playback', 'error');
  await expect(hero(page)).toHaveAttribute('data-video-visible', 'false');
  await expect(page.locator('[data-hero-status]')).toContainText(/too long/i);
});

test('optional autoplay is muted and recovers gracefully when the browser blocks it', async ({ page }) => {
  await page.addInitScript(() => {
    const play = HTMLMediaElement.prototype.play;
    let rejected = false;
    HTMLMediaElement.prototype.play = function () {
      if (!rejected) {
        rejected = true;
        return Promise.reject(new DOMException('Autoplay blocked in failure test', 'NotAllowedError'));
      }
      return play.call(this);
    };
  });
  await enableAutoplay(page);
  await page.goto('/');
  await expect(page.locator('[data-hero-status]')).toContainText(/automatic playback is unavailable/i);
  await expect(hero(page)).toHaveAttribute('data-video-visible', 'false');
  await page.getByRole('button', { name: /(?:Play|Retry) showreel/, exact: true }).click();
  await expectPlaying(heroVideo(page));
  await expect.poll(() => heroVideo(page).evaluate((video) => (video as HTMLVideoElement).muted)).toBe(true);
});

test('explicitly enabled desktop autoplay plays a real muted clip', async ({ page }) => {
  await enableAutoplay(page);
  await page.goto('/');
  await expectPlaying(heroVideo(page));
  await expect.poll(() => heroVideo(page).evaluate((video) => (video as HTMLVideoElement).muted)).toBe(true);
  await expect(page.getByRole('button', { name: 'Pause showreel', exact: true })).toBeVisible();
});

test('hero pauses automatic motion outside the viewport and while the page is hidden', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Play showreel', exact: true }).click();
  await expectPlaying(heroVideo(page));
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect.poll(() => heroVideo(page).evaluate((video) => (video as HTMLVideoElement).paused)).toBe(true);
  await page.getByRole('button', { name: 'Play showreel', exact: true }).scrollIntoViewIfNeeded();
  await page.getByRole('button', { name: 'Play showreel', exact: true }).click();
  await expectPlaying(heroVideo(page));
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect.poll(() => heroVideo(page).evaluate((video) => (video as HTMLVideoElement).paused)).toBe(true);
});

for (const preference of ['reduced motion', 'data saver', 'touch device'] as const) {
  test(`optional autoplay is suppressed for a ${preference}`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({
      baseURL,
      reducedMotion: preference === 'reduced motion' ? 'reduce' : 'no-preference',
      ...(preference === 'touch device' ? { isMobile: true, hasTouch: true, viewport: { width: 390, height: 844 } } : {}),
    });
    try {
      if (preference === 'data saver') await context.addInitScript(() => {
        Object.defineProperty(navigator, 'connection', { configurable: true, value: Object.assign(new EventTarget(), { saveData: true }) });
      });
      const page = await context.newPage();
      await enableAutoplay(page);
      await page.goto('/');
      await expect(page.getByRole('button', { name: 'Play showreel', exact: true })).toBeVisible();
      expect(await heroVideo(page).getAttribute('src')).toBeNull();
      await expect.poll(() => heroVideo(page).evaluate((video) => (video as HTMLVideoElement).paused)).toBe(true);
      // User-initiated playback remains available even when automatic motion is disabled.
      await page.getByRole('button', { name: 'Play showreel', exact: true }).click();
      await expectPlaying(heroVideo(page));
    } finally {
      await context.close();
    }
  });
}

test('hover lazily loads one muted clip, resets on leave, and transfers playback between cards', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const requests: string[] = [];
  page.on('request', (request) => { if (/\.(mp4|webm)(?:\?|$)/.test(request.url())) requests.push(request.url()); });
  await page.goto('/work/');
  const videos = page.locator('video[data-card-preview]');
  await expect(videos).toHaveCount(previewProjects.length);
  expect(await videos.evaluateAll((elements) => elements.some((element) => element.hasAttribute('src')))).toBe(false);
  expect(requests).toEqual([]);
  const first = previewProjects[0]!;
  const second = previewProjects[1]!;
  await card(page, first.slug).hover();
  await expectPlaying(cardVideo(page, first.slug));
  expect(await cardVideo(page, first.slug).evaluate((video) => (video as HTMLVideoElement).muted)).toBe(true);
  await expect(page.locator('video[data-card-preview][src]')).toHaveCount(1);
  await page.mouse.move(0, 0);
  await expectPreviewReset(cardVideo(page, first.slug));
  await card(page, first.slug).hover();
  await expectPlaying(cardVideo(page, first.slug));
  await card(page, second.slug).hover();
  await expectPlaying(cardVideo(page, second.slug));
  await expectPreviewReset(cardVideo(page, first.slug));
  await expect(page.locator('video[data-card-preview][src]')).toHaveCount(1);
  await page.mouse.move(0, 0);
  await expectPreviewReset(cardVideo(page, second.slug));
});

test('hover previews stop when filtered out, scrolled away, or the page becomes hidden', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/work/');
  const first = landscape;
  const video = cardVideo(page, first.slug);
  await card(page, first.slug).hover();
  await expectPlaying(video);
  await page.locator('[data-category-filter="commercial"]').dispatchEvent('click');
  await expect(card(page, first.slug)).toBeHidden();
  await expectPreviewReset(video);
  await page.locator('[data-category-filter="all"]').dispatchEvent('click');
  await card(page, first.slug).hover();
  await expectPlaying(video);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expectPreviewReset(video);
  await card(page, first.slug).hover();
  await expectPlaying(video);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expectPreviewReset(video);
});

test('leaving during a pending preview play promise does not resurrect playback or its visible state', async ({ page }) => {
  await page.addInitScript(() => {
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = async function () {
      await play.call(this);
      await new Promise<void>((resolve) => {
        (window as Window & { releasePreview?: () => void }).releasePreview = resolve;
      });
    };
  });
  await page.goto('/work/');
  const project = previewProjects[0]!;
  await card(page, project.slug).hover();
  await expect.poll(() => page.evaluate(() => typeof (window as Window & { releasePreview?: () => void }).releasePreview)).toBe('function');
  await page.mouse.move(0, 0);
  await expectPreviewReset(cardVideo(page, project.slug));
  await page.evaluate(() => (window as Window & { releasePreview?: () => void }).releasePreview?.());
  await expect(card(page, project.slug)).toHaveAttribute('data-preview-state', 'idle');
  await expectPreviewReset(cardVideo(page, project.slug));
});

for (const preference of ['reduced motion', 'data saver', 'touch device'] as const) {
  test(`cards keep static posters for a ${preference}`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({
      baseURL,
      reducedMotion: preference === 'reduced motion' ? 'reduce' : 'no-preference',
      ...(preference === 'touch device' ? { isMobile: true, hasTouch: true, viewport: { width: 390, height: 844 } } : {}),
    });
    try {
      if (preference === 'data saver') await context.addInitScript(() => {
        Object.defineProperty(navigator, 'connection', { configurable: true, value: Object.assign(new EventTarget(), { saveData: true }) });
      });
      const page = await context.newPage();
      await page.goto('/work/');
      const project = previewProjects[0]!;
      await card(page, project.slug).hover();
      expect(await cardVideo(page, project.slug).getAttribute('src')).toBeNull();
      await expect(card(page, project.slug).getByRole('img', { name: project.cover.alt })).toBeVisible();
      await card(page, project.slug).getByRole('link', { name: `View project: ${project.title}`, exact: true }).click();
      await expect(page).toHaveURL(`/work/${project.slug}/`);
    } finally {
      await context.close();
    }
  });
}

test('failed hover media keeps the poster and link usable without repeated automatic retries', async ({ page }) => {
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = () => Promise.reject(new DOMException('Playback rejected in failure test', 'NotSupportedError'));
  });
  await page.goto('/work/');
  const project = previewProjects[0]!;
  await card(page, project.slug).hover();
  await expect(card(page, project.slug)).toHaveAttribute('data-preview-state', 'error');
  await expect(card(page, project.slug).getByRole('img', { name: project.cover.alt })).toBeVisible();
  expect(await cardVideo(page, project.slug).evaluate((video) => (video as HTMLVideoElement).paused)).toBe(true);
  await card(page, project.slug).getByRole('link', { name: `View project: ${project.title}`, exact: true }).click();
  await expect(page).toHaveURL(`/work/${project.slug}/`);
});

test('project viewer includes editorial context, captions, stills, and adjacent navigation with real native playback', async ({ page }) => {
  await page.goto(`/work/${landscape.slug}/`);
  for (const name of ['Synopsis', 'Creative direction', 'Credits', 'Still frames']) {
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  }
  const player = page.locator('video[data-project-video]');
  await expect(player).toHaveAttribute('controls', '');
  await expect(player).toHaveAttribute('preload', 'none');
  await expect(player).toHaveAttribute('poster', landscape.cover.src);
  expect(await player.evaluate((video) => (video as HTMLVideoElement).paused)).toBe(true);
  const caption = landscape.video!.captions[0]!;
  await expect(player.locator('track')).toHaveAttribute('src', caption.src);
  await expect(player.locator('track')).toHaveAttribute('srclang', caption.srclang);
  await page.getByRole('button', { name: `Play film: ${landscape.title}`, exact: true }).click();
  await expectPlaying(player);
  await expect(player).toBeFocused();
  await expect(triggers(page)).toHaveCount(landscape.stills.length);
  // Open without scrolling the film away: the viewer itself must pause background playback.
  await triggers(page).first().dispatchEvent('click');
  await expect(dialog(page)).toBeVisible();
  await expect.poll(() => player.evaluate((video) => (video as HTMLVideoElement).paused)).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toBeHidden();
  await expect(page.locator('main')).toContainText(/credits.*not.*supplied|verified.*credits|no.*credits/i);
  const navigation = page.getByRole('navigation', { name: /project/i });
  await expect(navigation).toBeVisible();
  await expect(navigation.locator('[data-previous-project]')).toBeVisible();
  await expect(navigation.locator('[data-next-project]')).toBeVisible();
  await navigation.locator('[data-next-project]').click();
  await expect(page.locator('main h1')).not.toHaveText(landscape.title);
});

test('project playback failure restores its poster, announces the failure, and permits retry', async ({ page }) => {
  await page.route('**/media/*.mp4', (route) => route.abort('failed'));
  await page.goto(`/work/${landscape.slug}/`);
  await page.getByRole('button', { name: `Play film: ${landscape.title}`, exact: true }).click();
  await expect(page.locator('[data-player-status]')).toContainText(/unavailable|could not|unable/i);
  await expect(page.locator('[data-player-poster]')).toBeVisible();
  await expect(page.locator('[data-player-retry]')).toBeVisible();
  await expect(page.locator('[data-player-retry]')).toBeFocused();
  await page.unroute('**/media/*.mp4');
  await page.locator('[data-player-retry]').click();
  await expectPlaying(page.locator('video[data-project-video]'));
});

test('blocked project playback keeps the user-initiated play action usable', async ({ page }) => {
  await page.addInitScript(() => {
    const play = HTMLMediaElement.prototype.play;
    let rejected = false;
    HTMLMediaElement.prototype.play = function () {
      if (!rejected) {
        rejected = true;
        return Promise.reject(new DOMException('Playback blocked in failure test', 'NotAllowedError'));
      }
      return play.call(this);
    };
  });
  await page.goto(`/work/${landscape.slug}/`);
  const play = page.getByRole('button', { name: `Play film: ${landscape.title}`, exact: true });
  await play.click();
  await expect(page.locator('[data-player-status]')).toContainText(/playback was blocked/i);
  await expect(play).toBeVisible();
  await expect(play).toBeFocused();
  await play.click();
  await expectPlaying(page.locator('video[data-project-video]'));
});

test('lightbox opens the clicked frame, wraps navigation, traps focus, and restores its exact opener', async ({ page }) => {
  await page.goto(`/work/${landscape.slug}/`);
  const opener = triggers(page).nth(1);
  await opener.click();
  await expect(dialog(page)).toBeVisible();
  await expect(page.locator('[data-lightbox-image]')).toHaveAttribute('src', landscape.stills[1]!.src);
  await expect(page.locator('[data-lightbox-count]')).toHaveText(`Image 2 of ${landscape.stills.length}`);
  await expect(page.locator('[data-lightbox-caption]')).toContainText(landscape.stills[1]!.caption!);
  await expect(page.getByRole('button', { name: 'Close image viewer', exact: true })).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('[data-lightbox-count]')).toHaveText(`Image 3 of ${landscape.stills.length}`);
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('[data-lightbox-count]')).toHaveText(`Image 1 of ${landscape.stills.length}`);
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('[data-lightbox-count]')).toHaveText(`Image ${landscape.stills.length} of ${landscape.stills.length}`);
  for (const key of ['Tab', 'Tab', 'Tab', 'Tab', 'Shift+Tab', 'Shift+Tab', 'Shift+Tab', 'Shift+Tab']) {
    await page.keyboard.press(key);
    expect(await dialog(page).evaluate((element) => element.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toBeHidden();
  await expect(opener).toBeFocused();
  await expect(page.getByRole('button', { name: `Play film: ${landscape.title}`, exact: true })).toBeVisible();
  await opener.click();
  await page.getByRole('button', { name: 'Close image viewer', exact: true }).click();
  await expect(opener).toBeFocused();
});

test('lightbox image failures retain navigation and close controls', async ({ page }) => {
  await page.goto(`/work/${landscape.slug}/`);
  await page.route('**/placeholders/landscape.svg', (route) => route.abort('failed'));
  await triggers(page).first().click();
  await expect(dialog(page)).toBeVisible();
  await expect(page.locator('[data-lightbox-status]')).toContainText(/could not be loaded/i);
  await page.getByRole('button', { name: 'Next image', exact: true }).click();
  await expect(page.locator('[data-lightbox-count]')).toHaveText(`Image 2 of ${landscape.stills.length}`);
  await expect.poll(() => page.locator('[data-lightbox-image]').evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Close image viewer', exact: true }).click();
  await expect(dialog(page)).toBeHidden();
  await expect(triggers(page).first()).toBeFocused();
});

for (const width of [320, 390, 768, 1440]) {
  test(`portrait player and fullscreen viewer fit a ${width}px viewport and preserve original image proportions`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`/work/${portrait.slug}/`);
    const player = page.locator('video[data-project-video]');
    const ratio = await player.evaluate((video) => {
      const box = video.getBoundingClientRect();
      return box.width / box.height;
    });
    expect(ratio).toBeLessThan(1);
    await triggers(page).first().click();
    await expect(dialog(page)).toBeVisible();
    await expect.poll(() => page.locator('[data-lightbox-image]').evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    const image = await page.locator('[data-lightbox-image]').evaluate((element) => {
      const image = element as HTMLImageElement;
      const box = image.getBoundingClientRect();
      return {
        naturalRatio: image.naturalWidth / image.naturalHeight,
        fit: getComputedStyle(image).objectFit,
        width: box.width,
        height: box.height,
      };
    });
    expect(image.fit).toBe('contain');
    expect(image.naturalRatio).toBeLessThan(1);
    expect(image.width).toBeLessThanOrEqual(width);
    expect(image.height).toBeLessThanOrEqual(900);
    const dimensions = await page.evaluate(() => ({ width: window.innerWidth, document: document.documentElement.scrollWidth }));
    expect(dimensions.document).toBeLessThanOrEqual(dimensions.width + 1);
    const overlay = await dialog(page).boundingBox();
    expect(overlay!.width).toBeCloseTo(width, 0);
    expect(overlay!.height).toBeCloseTo(900, 0);
    await page.getByRole('button', { name: 'Next image', exact: true }).click();
    await expect(page.locator('[data-lightbox-count]')).toHaveText(`Image 2 of ${portrait.stills.length}`);
    await page.getByRole('button', { name: 'Previous image', exact: true }).click();
    await page.getByRole('button', { name: 'Close image viewer', exact: true }).click();
  });
}

test('touch lightbox controls can navigate and close without a keyboard', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, isMobile: true, hasTouch: true, viewport: { width: 390, height: 844 } });
  try {
    const page = await context.newPage();
    await page.goto(`/work/${portrait.slug}/`);
    await triggers(page).first().tap();
    await page.getByRole('button', { name: 'Next image', exact: true }).tap();
    await expect(page.locator('[data-lightbox-count]')).toHaveText(`Image 2 of ${portrait.stills.length}`);
    await page.getByRole('button', { name: 'Previous image', exact: true }).tap();
    await expect(page.locator('[data-lightbox-count]')).toHaveText(`Image 1 of ${portrait.stills.length}`);
    await page.getByRole('button', { name: 'Close image viewer', exact: true }).tap();
    await expect(dialog(page)).toBeHidden();
  } finally {
    await context.close();
  }
});

test('without JavaScript stills link to their original images and main video retains native controls', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto(`/work/${landscape.slug}/`);
    const player = page.locator('video[data-project-video]');
    await expect(player).toHaveAttribute('controls', '');
    expect(await player.getAttribute('src') ?? await player.locator('source').getAttribute('src')).toBe(landscape.video!.src);
    await expect(page.locator('[data-player-start]')).toBeHidden();
    for (const [index, still] of landscape.stills.entries()) {
      await expect(triggers(page).nth(index)).toHaveAttribute('href', still.src);
    }
    await triggers(page).first().click();
    await expect(page).toHaveURL(landscape.stills[0]!.src);
  } finally {
    await context.close();
  }
});

test('hero, enhanced project player, and open image viewer pass automated accessibility checks', async ({ page }) => {
  await page.goto('/');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.goto(`/work/${portrait.slug}/`);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await triggers(page).first().click();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('production test server supports native media MIME types and byte-range requests', async ({ request }) => {
  const clip = landscape.video!.src;
  const response = await request.get(clip, { headers: { Range: 'bytes=0-99' } });
  expect(response.status()).toBe(206);
  expect(response.headers()['content-type']).toBe('video/mp4');
  expect(response.headers()['content-range']).toMatch(/^bytes 0-99\/\d+$/);
  expect((await response.body()).byteLength).toBe(100);
  const unsatisfiable = await request.get(clip, { headers: { Range: 'bytes=999999999-' } });
  expect(unsatisfiable.status()).toBe(416);
  const captions = await request.get(landscape.video!.captions[0]!.src);
  expect(captions.headers()['content-type']).toContain('text/vtt');
});
