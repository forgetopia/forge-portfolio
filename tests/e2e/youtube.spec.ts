import AxeBuilder from '@axe-core/playwright';
import type { Page, Route } from '@playwright/test';
import { test, expect, syntheticVideoId, youtubeProjects } from '../helpers/youtube-fixture';

const [landscape, portrait] = youtubeProjects;
const youtubeDomains = ['youtube-nocookie.com', 'youtube.com', 'youtu.be', 'ytimg.com', 'googlevideo.com'];
const fakeEmbed = '<!doctype html><html lang="en"><head><title>Intercepted YouTube test frame</title></head><body><main><button type="button">Simulated YouTube control</button></main></body></html>';

/** Never request an arbitrary real film: all YouTube responses are controlled fixtures. */
async function interceptExternalMedia(page: Page, origin: string, options: { status?: number; stalled?: boolean; stalledFrom?: number } = {}) {
  const requests: string[] = [];
  const pending: Route[] = [];
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === origin) return route.continue();
    if (youtubeDomains.some((domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`))) {
      requests.push(url.href);
      if (options.stalled || (options.stalledFrom !== undefined && requests.length >= options.stalledFrom)) { pending.push(route); return; }
      return route.fulfill({ status: options.status ?? 200, contentType: 'text/html', body: fakeEmbed });
    }
    // The fixture needs no third-party network; protect against future accidental embeds or thumbnails.
    return route.abort('blockedbyclient');
  });
  return { requests, pending };
}

function player(page: Page) { return page.locator('[data-youtube-player]'); }
function play(page: Page, title: string = landscape.title) { return page.getByRole('button', { name: `Play film: ${title}`, exact: true }); }
function watch(page: Page) { return page.locator('[data-youtube-watch]'); }

test('YouTube project stays poster-first with no third-party resources until explicit interaction', async ({ page, youtubeSite }) => {
  const intercepted = await interceptExternalMedia(page, youtubeSite.origin);
  await page.goto(`${youtubeSite.origin}/work/${landscape.slug}/`);
  await expect(player(page)).toHaveAttribute('data-youtube-state', 'idle');
  await expect(page.locator('[data-youtube-poster]')).toHaveAttribute('src', landscape.poster);
  await expect(page.locator('[data-youtube-poster]')).toBeVisible();
  await expect(page.locator('iframe')).toHaveCount(0);
  await play(page).hover();
  await play(page).focus();
  await page.waitForTimeout(150);
  expect(intercepted.requests).toEqual([]);
  expect(await page.evaluate(() => performance.getEntriesByType('resource').filter((entry) => /youtube|ytimg|googlevideo/.test(entry.name)).length)).toBe(0);
  await expect(page.locator('link[rel="preconnect"][href*="youtube"], link[rel="dns-prefetch"][href*="youtube"]')).toHaveCount(0);
  for (const heading of ['Synopsis', 'Creative direction', 'Credits', 'Still frames']) {
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
  }
  await expect(page.getByRole('navigation', { name: 'Project navigation' })).toBeVisible();
  await expect(page.locator('[data-lightbox-trigger]')).toHaveCount(3);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

for (const key of ['Enter', 'Space']) {
  test(`${key} creates one safe inline YouTube frame and transfers keyboard focus`, async ({ page, youtubeSite }) => {
    const intercepted = await interceptExternalMedia(page, youtubeSite.origin);
    await page.goto(`${youtubeSite.origin}/work/${landscape.slug}/`);
    await play(page).focus();
    await page.keyboard.press(key);
    const iframe = page.locator('iframe');
    await expect(iframe).toHaveCount(1);
    await expect(player(page)).toHaveAttribute('data-youtube-state', 'loaded');
    await expect(iframe).toBeFocused();
    await expect(iframe).toHaveAttribute('title', `${landscape.title} — YouTube film`);
    await expect(iframe).toHaveAttribute('allowfullscreen', '');
    await expect(iframe).toHaveAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    const source = new URL((await iframe.getAttribute('src'))!);
    expect(source.origin).toBe('https://www.youtube-nocookie.com');
    expect(source.pathname).toBe(`/embed/${syntheticVideoId}`);
    expect(source.searchParams.get('start')).toBe('17');
    expect(source.searchParams.get('controls')).toBe('1');
    expect(source.searchParams.get('playsinline')).toBe('1');
    expect(source.searchParams.get('autoplay')).toBe('1');
    expect(source.searchParams.has('enablejsapi')).toBe(false);
    expect(intercepted.requests).toEqual([source.href]);
    await expect(watch(page)).toHaveAttribute('href', `https://www.youtube.com/watch?v=${syntheticVideoId}&t=17s`);
    await expect(watch(page)).toHaveAttribute('target', '_blank');
    await expect(watch(page)).toHaveAttribute('rel', /noopener/);
    // The iframe stays in the keyboard order, including its standard embedded controls.
    await page.frameLocator('iframe').getByRole('button', { name: 'Simulated YouTube control' }).focus();
    await expect(page.frameLocator('iframe').getByRole('button', { name: 'Simulated YouTube control' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(watch(page)).toBeFocused();
  });
}

for (const project of youtubeProjects) {
  test(`${project.orientation} YouTube frame preserves its ratio at all seven supported widths`, async ({ page, youtubeSite }) => {
    await interceptExternalMedia(page, youtubeSite.origin);
    await page.goto(`${youtubeSite.origin}/work/${project.slug}/`);
    for (const width of [320, 360, 390, 768, 1024, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      const frame = page.locator('[data-youtube-frame]');
      const box = await frame.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width / box!.height).toBeCloseTo(project.orientation === 'portrait' ? 9 / 16 : 16 / 9, 2);
      expect(box!.width).toBeLessThanOrEqual(width);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
    }
    await play(page, project.title).click();
    await expect(player(page)).toHaveAttribute('data-youtube-state', 'loaded');
    const frameBox = (await page.locator('[data-youtube-frame]').boundingBox())!;
    const iframeBox = (await page.locator('iframe').boundingBox())!;
    expect(frameBox.width - iframeBox.width).toBeGreaterThanOrEqual(0);
    expect(frameBox.width - iframeBox.width).toBeLessThanOrEqual(2.1);
    expect(frameBox.height - iframeBox.height).toBeGreaterThanOrEqual(0);
    expect(frameBox.height - iframeBox.height).toBeLessThanOrEqual(2.1);
  });
}

test('reduced motion keeps YouTube unloaded while preserving visitor-initiated playback', async ({ page, youtubeSite }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const intercepted = await interceptExternalMedia(page, youtubeSite.origin);
  await page.goto(`${youtubeSite.origin}/work/${portrait.slug}/`);
  await expect(page.locator('iframe')).toHaveCount(0);
  await play(page, portrait.title).hover();
  expect(intercepted.requests).toEqual([]);
  expect(await play(page, portrait.title).evaluate((button) => getComputedStyle(button).transitionDuration)).toBe('0s');
  await play(page, portrait.title).click();
  await expect(player(page)).toHaveAttribute('data-youtube-state', 'loaded');
  await expect(page.locator('iframe')).toHaveCount(1);
  expect(new URL((await page.locator('iframe').getAttribute('src'))!).searchParams.get('autoplay')).toBe('1');
});

test('missing or restricted embedded films retain an independently usable YouTube fallback', async ({ page, youtubeSite }) => {
  for (const status of [404, 403]) {
    await page.unrouteAll({ behavior: 'ignoreErrors' });
    await interceptExternalMedia(page, youtubeSite.origin, { status });
    await page.goto(`${youtubeSite.origin}/work/${landscape.slug}/`);
    await play(page).click();
    await expect(page.locator('iframe')).toHaveCount(1);
    await expect(watch(page)).toBeVisible();
    await expect(watch(page)).toHaveAttribute('href', `https://www.youtube.com/watch?v=${syntheticVideoId}&t=17s`);
    await watch(page).focus();
    await expect(watch(page)).toBeFocused();
    await expect(player(page)).toContainText(/unavailable|restricted|does not|cannot|won.t/i);
  }
});

test('a failed frame restores the poster and an accessible retry creates a fresh frame', async ({ page, youtubeSite }) => {
  const intercepted = await interceptExternalMedia(page, youtubeSite.origin, { stalledFrom: 2 });
  await page.goto(`${youtubeSite.origin}/work/${landscape.slug}/`);
  await play(page).click();
  await expect(player(page)).toHaveAttribute('data-youtube-state', 'loaded');
  await page.locator('iframe').dispatchEvent('error');
  await expect(player(page)).toHaveAttribute('data-youtube-state', 'error');
  await expect(page.locator('iframe')).toHaveCount(0);
  await expect(page.locator('[data-youtube-poster]')).toBeVisible();
  await expect(page.locator('[data-youtube-status]')).toContainText(/unavailable|could not|unable/i);
  await expect(page.locator('[data-youtube-retry]')).toBeFocused();
  await expect(watch(page)).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(player(page)).toHaveAttribute('data-youtube-state', 'loading');
  await expect(play(page)).toBeFocused();
  await expect.poll(() => intercepted.pending.length).toBe(1);
  await intercepted.pending[0]!.fulfill({ status: 200, contentType: 'text/html', body: fakeEmbed });
  await expect(player(page)).toHaveAttribute('data-youtube-state', 'loaded');
  await expect(page.locator('iframe')).toHaveCount(1);
  await expect(page.locator('iframe')).toBeFocused();
  expect(intercepted.requests).toHaveLength(2);
});

test('malformed runtime metadata cannot produce an iframe URL or an external request', async ({ page, youtubeSite }) => {
  const intercepted = await interceptExternalMedia(page, youtubeSite.origin);
  for (const videoId of ['https://www.youtube.com/watch?v=FORGE_TEST1', 'FORGE_TEST1\n']) {
    await page.goto(`${youtubeSite.origin}/work/${landscape.slug}/`);
    await player(page).evaluate((element, id) => { (element as HTMLElement).dataset.youtubeVideoId = id; }, videoId);
    await play(page).click();
    await expect(player(page)).toHaveAttribute('data-youtube-state', 'error');
    await expect(page.locator('iframe')).toHaveCount(0);
    await expect(page.locator('[data-youtube-retry]')).toBeFocused();
    await expect(watch(page)).toBeVisible();
  }
  expect(intercepted.requests).toEqual([]);
});

test('a stalled frame times out without trapping focus or losing the fallback', async ({ page, youtubeSite }) => {
  await page.clock.install();
  const intercepted = await interceptExternalMedia(page, youtubeSite.origin, { stalled: true });
  await page.goto(`${youtubeSite.origin}/work/${landscape.slug}/`);
  await play(page).click();
  await expect(player(page)).toHaveAttribute('data-youtube-state', 'loading');
  await expect.poll(() => intercepted.pending.length).toBe(1);
  await page.clock.fastForward(12_001);
  await expect(player(page)).toHaveAttribute('data-youtube-state', 'error');
  await expect(page.locator('iframe')).toHaveCount(0);
  await expect(page.locator('[data-youtube-poster]')).toBeVisible();
  await expect(page.locator('[data-youtube-retry]')).toBeFocused();
  await expect(watch(page)).toBeVisible();
  await Promise.all(intercepted.pending.map((route) => route.abort('timedout').catch(() => {})));
});

test('opening the still lightbox unloads background YouTube and closing never resumes it', async ({ page, youtubeSite }) => {
  const intercepted = await interceptExternalMedia(page, youtubeSite.origin);
  await page.goto(`${youtubeSite.origin}/work/${landscape.slug}/`);
  await play(page).click();
  await expect(player(page)).toHaveAttribute('data-youtube-state', 'loaded');
  const opener = page.locator('[data-lightbox-trigger]').first();
  await opener.dispatchEvent('click');
  await expect(page.locator('[data-image-lightbox]')).toBeVisible();
  await expect(player(page)).toHaveAttribute('data-youtube-state', 'suspended');
  await expect(page.locator('iframe')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-image-lightbox]')).toBeHidden();
  await expect(opener).toBeFocused();
  await expect(play(page)).toBeVisible();
  expect(intercepted.requests).toHaveLength(1);
  await play(page).click();
  await expect(player(page)).toHaveAttribute('data-youtube-state', 'loaded');
  expect(intercepted.requests).toHaveLength(2);
});

test('hiding or leaving the page releases the frame without restarting it on return', async ({ page, youtubeSite }) => {
  const intercepted = await interceptExternalMedia(page, youtubeSite.origin);
  await page.goto(`${youtubeSite.origin}/work/${landscape.slug}/`);
  await play(page).click();
  await expect(player(page)).toHaveAttribute('data-youtube-state', 'loaded');
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.locator('iframe')).toHaveCount(0);
  await expect(player(page)).toHaveAttribute('data-youtube-state', 'suspended');
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.locator('iframe')).toHaveCount(0);
  expect(intercepted.requests).toHaveLength(1);
  await play(page).click();
  await expect(player(page)).toHaveAttribute('data-youtube-state', 'loaded');
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  await expect(page.locator('iframe')).toHaveCount(0);
  await expect(play(page)).toBeVisible();
  await expect(watch(page)).toBeVisible();
  expect(intercepted.requests).toHaveLength(2);
});

test('late iframe events cannot restart a pending embed behind an open lightbox', async ({ page, youtubeSite }) => {
  const intercepted = await interceptExternalMedia(page, youtubeSite.origin, { stalled: true });
  await page.goto(`${youtubeSite.origin}/work/${landscape.slug}/`);
  await play(page).click();
  await expect(player(page)).toHaveAttribute('data-youtube-state', 'loading');
  await expect.poll(() => intercepted.pending.length).toBe(1);
  const pendingFrame = await page.locator('iframe').elementHandle();
  expect(pendingFrame).not.toBeNull();
  const opener = page.locator('[data-lightbox-trigger]').first();
  await opener.dispatchEvent('click');
  await expect(page.locator('[data-image-lightbox]')).toBeVisible();
  await expect(page.locator('iframe')).toHaveCount(0);
  await pendingFrame!.evaluate((frame) => {
    frame.dispatchEvent(new Event('load'));
    frame.dispatchEvent(new Event('error'));
  });
  await expect(player(page)).toHaveAttribute('data-youtube-state', 'suspended');
  await expect(page.locator('iframe')).toHaveCount(0);
  await expect(page.locator('[data-lightbox-close]')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(opener).toBeFocused();
  await expect(play(page)).toBeVisible();
  expect(intercepted.requests).toHaveLength(1);
  await Promise.all(intercepted.pending.map((route) => route.abort('timedout').catch(() => {})));
});

test('without JavaScript the project keeps a normal YouTube watch link and its editorial content', async ({ browser, youtubeSite }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    const intercepted = await interceptExternalMedia(page, youtubeSite.origin);
    await page.goto(`${youtubeSite.origin}/work/${landscape.slug}/`);
    await expect(page.locator('iframe')).toHaveCount(0);
    await expect(play(page)).toBeHidden();
    await expect(page.locator('[data-youtube-poster]')).toBeVisible();
    await expect(watch(page)).toBeVisible();
    await expect(watch(page)).toHaveAttribute('href', `https://www.youtube.com/watch?v=${syntheticVideoId}&t=17s`);
    await expect(page.getByRole('heading', { name: 'Synopsis', exact: true })).toBeVisible();
    expect(intercepted.requests).toEqual([]);
  } finally {
    await context.close();
  }
});

test('the same generated route keeps native films and image-only projects backward compatible', async ({ page, youtubeSite }) => {
  const intercepted = await interceptExternalMedia(page, youtubeSite.origin);
  await page.goto(`${youtubeSite.origin}/work/isekai-live-action/`);
  await expect(page.locator('[data-project-player]')).toHaveCount(1);
  await expect(player(page)).toHaveCount(0);
  await expect(page.locator('[data-project-video]')).toHaveAttribute('controls', '');
  await page.goto(`${youtubeSite.origin}/work/dragon-resonance/`);
  await expect(page.locator('[data-project-player], [data-youtube-player], iframe')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Synopsis', exact: true })).toBeVisible();
  await expect(page.locator('[data-lightbox-trigger]')).toHaveCount(3);
  expect(intercepted.requests).toEqual([]);
});
