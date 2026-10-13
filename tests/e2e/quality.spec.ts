import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { projectSchema } from '../../src/lib/project-schema';

const projects = readdirSync(resolve('src/content/projects'))
  .filter((filename) => filename.endsWith('.json'))
  .map((filename) => projectSchema.parse(JSON.parse(readFileSync(resolve('src/content/projects', filename), 'utf8'))));
const routes = ['/', '/work/', '/about/', '/contact/', ...projects.map((project) => `/work/${project.slug}/`)];
const portrait = projects.find((project) => project.video?.orientation === 'portrait')!;
const landscape = projects.find((project) => project.video?.orientation === 'landscape')!;
const lightbox = (page: Page) => page.locator('[data-image-lightbox]');

async function expectNoOverflow(page: Page, description: string) {
  const dimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(dimensions.document, `${description}: document width`).toBeLessThanOrEqual(dimensions.viewport + 1);
  expect(dimensions.body, `${description}: body width`).toBeLessThanOrEqual(dimensions.viewport + 1);
}

async function expectDistinct(first: Locator, second: Locator, description: string) {
  const a = await first.boundingBox();
  const b = await second.boundingBox();
  expect(a, `${description}: first control exists`).not.toBeNull();
  expect(b, `${description}: second control exists`).not.toBeNull();
  if (!a || !b) return;
  const intersectionWidth = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const intersectionHeight = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  expect(intersectionWidth > 1 && intersectionHeight > 1, `${description}: boxes overlap`).toBe(false);
}

async function expectContained(control: Locator, container: Locator, description: string) {
  const button = await control.boundingBox();
  const frame = await container.boundingBox();
  expect(button, `${description}: control exists`).not.toBeNull();
  expect(frame, `${description}: container exists`).not.toBeNull();
  if (!button || !frame) return;
  expect(button.x, `${description}: left edge`).toBeGreaterThanOrEqual(frame.x - 1);
  expect(button.y, `${description}: top edge`).toBeGreaterThanOrEqual(frame.y - 1);
  expect(button.x + button.width, `${description}: right edge`).toBeLessThanOrEqual(frame.x + frame.width + 1);
  expect(button.y + button.height, `${description}: bottom edge`).toBeLessThanOrEqual(frame.y + frame.height + 1);
}

async function expectHeroLayout(page: Page) {
  const groups = [page.locator('#hero-heading'), page.locator('.hero-description'),
    page.locator('.hero .button-link'), page.locator('[data-hero-controls]'), page.locator('.hero-bottom')];
  for (let index = 0; index < groups.length; index += 1) {
    for (let next = index + 1; next < groups.length; next += 1) {
      await expectDistinct(groups[index]!, groups[next]!, `hero groups ${index} and ${next}`);
    }
  }
  await expectDistinct(page.locator('[data-hero-play]'), page.locator('[data-hero-mute]'), 'hero media controls');
}

for (const width of [320, 360, 390, 768, 1024, 1440, 1920]) {
  test(`all static routes retain usable controls and no horizontal overflow at ${width}px`, async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width, height: 900 });
    await page.mouse.move(0, 0);
    const videoRequests: string[] = [];
    page.on('request', (request) => {
      if (/\.(mp4|webm)(?:\?|$)/.test(request.url())) videoRequests.push(request.url());
    });
    for (const route of routes) {
      await page.goto(route);
      await page.evaluate(() => document.fonts.ready);
      await expectNoOverflow(page, `${route} at ${width}px`);
      const targets = await page.locator('button, .mobile-menu summary, .desktop-navigation a, .footer-bottom nav a, .button-link, .text-link, .scroll-link').evaluateAll((elements) => elements
        .filter((element) => element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden')
        .map((element) => {
          const box = element.getBoundingClientRect();
          return { name: element.getAttribute('aria-label') ?? element.textContent?.trim(), width: box.width,
            height: box.height, minimum: element.matches('button, .mobile-menu summary, .button-link') ? 44 : 24 };
        }));
      for (const target of targets) {
        expect(target.width, `${route}: ${target.name} target width`).toBeGreaterThanOrEqual(target.minimum - 1);
        expect(target.height, `${route}: ${target.name} target height`).toBeGreaterThanOrEqual(target.minimum - 1);
      }
      if (route === '/') await expectHeroLayout(page);
    }
    expect(videoRequests, 'idle browsing must not fetch card clips, the showreel, or main films').toEqual([]);
  });
}

for (const width of [390, 1440]) {
  test(`all static routes pass WCAG AA automated checks at ${width}px`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width, height: 900 });
    for (const route of routes) {
      await page.goto(route);
      await page.evaluate(() => document.fonts.ready);
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      expect(results.violations, `${route} at ${width}px`).toEqual([]);
      // Keep label-in-name coverage explicit; axe marks this rule experimental in some versions.
      const names = await new AxeBuilder({ page }).withRules(['label-content-name-mismatch']).analyze();
      expect(names.violations, `${route}: visible labels must occur in accessible names`).toEqual([]);
    }
    if (width === 390) {
      await page.goto('/work/');
      await page.locator('[data-mobile-menu] summary').click();
      expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
    }
  });
}

test('200% and 400% reflow equivalents keep all routes and short-viewport image controls usable', async ({ page }) => {
  test.setTimeout(60_000);
  // These CSS viewports simulate the reflow area of a 1280×800 window at zoom.
  // Browser chrome zoom and operating-system magnification still need manual QA.
  for (const viewport of [{ width: 640, height: 400 }, { width: 320, height: 200 }]) {
    await page.setViewportSize(viewport);
    for (const route of routes) {
      await page.goto(route);
      await page.evaluate(() => document.fonts.ready);
      await expectNoOverflow(page, `${route} reflow ${viewport.width}×${viewport.height}`);
      if (route === '/') await expectHeroLayout(page);
      if (route.startsWith('/work/') && route !== '/work/') {
        await expectContained(page.locator('[data-player-start]'), page.locator('.project-player-frame'), `${route}: reflow Play control`);
      }
    }
    await page.goto(`/work/${portrait.slug}/`);
    const opener = page.locator('[data-lightbox-trigger]').first();
    await opener.click();
    await expect(lightbox(page)).toBeVisible();
    const controls = ['close', 'prev', 'next'].map((name) => page.locator(`[data-lightbox-${name}]`));
    await expect(controls[0]!).toBeFocused();
    for (const control of controls) {
      const box = await control.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 1);
      expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height + 1);
    }
    for (let index = 0; index < controls.length; index += 1) {
      for (let next = index + 1; next < controls.length; next += 1) {
        await expectDistinct(controls[index]!, controls[next]!, 'short-viewport lightbox controls');
      }
    }
    await expectNoOverflow(page, 'short-viewport open image viewer');
    await controls[2]!.click();
    await expect(page.locator('[data-lightbox-count]')).toHaveText(`Image 2 of ${portrait.stills.length}`);
    await page.keyboard.press('Escape');
    await expect(lightbox(page)).toBeHidden();
    await expect(opener).toBeFocused();
  }
});

test('user text spacing and fallback fonts preserve reflow and hero control separation', async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of routes) {
    await page.goto(route);
    await page.evaluate(() => document.fonts.ready);
    await page.addStyleTag({ content: `
      h1, h2, h3 { font-family: Georgia, serif !important; }
      p, a, button, summary { font-family: Arial, sans-serif !important; }
      h1, h2, h3, p, a, button, summary { line-height: 1.5 !important; letter-spacing: .12em !important; word-spacing: .16em !important; }
      p { margin-bottom: 2em !important; }
    ` });
    await expectNoOverflow(page, `${route} with user text spacing and fallback fonts`);
    if (route === '/') await expectHeroLayout(page);
  }
});

test('keyboard navigation exposes native menu state and preserves focus on close and resize', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/work/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main-content')).toBeFocused();
  const menu = page.locator('[data-mobile-menu]');
  const summary = menu.locator('summary');
  await summary.focus();
  await page.keyboard.press('Enter');
  await expect(summary).toHaveAccessibleName('Menu');
  await expect(menu).toHaveAttribute('open', '');
  await menu.locator('a[href="/work/"]').focus();
  await page.keyboard.press('Escape');
  await expect(menu).not.toHaveAttribute('open');
  await expect(summary).toBeFocused();
  await expect(summary).toHaveAccessibleName('Menu');

  await summary.click();
  await menu.locator('a[href="/work/"]').focus();
  const filter = page.locator('[data-category-filter="all"]');
  await filter.focus();
  await expect(menu).not.toHaveAttribute('open');
  await expect(filter).toBeFocused();

  await summary.click();
  await filter.dispatchEvent('pointerdown', { pointerType: 'mouse', bubbles: true });
  await filter.focus();
  await expect(menu).not.toHaveAttribute('open');
  await expect(filter).toBeFocused();

  await summary.click();
  await menu.locator('a[href="/work/"]').focus();
  await page.setViewportSize({ width: 768, height: 844 });
  await expect(menu).not.toHaveAttribute('open');
  await expect(page.locator('.desktop-navigation a[href="/work/"]')).toBeFocused();
});

test('native mobile navigation remains keyboard-operable without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width: 360, height: 800 } });
  try {
    const page = await context.newPage();
    await page.goto('/');
    const menu = page.locator('[data-mobile-menu]');
    await menu.locator('summary').focus();
    await page.keyboard.press('Enter');
    await expect(menu).toHaveAttribute('open', '');
    await expect(menu.locator('summary')).toHaveAccessibleName('Menu');
    await expect(menu.getByRole('link', { name: 'About', exact: true })).toBeVisible();
    await menu.getByRole('link', { name: 'About', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL('/about/');
    await expect(page.locator('main h1')).toBeVisible();
    await expectNoOverflow(page, 'native mobile navigation');
  } finally {
    await context.close();
  }
});

test('filter announcements identify category changes and recover focus before hiding content', async ({ page }) => {
  await page.goto('/work/');
  const firstCardLink = page.locator('[data-project-card] a').first();
  await firstCardLink.focus();
  const commercial = page.locator('[data-category-filter="commercial"]');
  // Dispatch while card focus remains in place: pointer activation need not focus buttons in Safari.
  await commercial.dispatchEvent('click');
  await expect(commercial).toBeFocused();
  await expect(commercial).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-gallery-count]')).toHaveAttribute('role', 'status');
  await expect(page.locator('[data-gallery-count]')).toHaveAttribute('aria-atomic', 'true');
  await expect(page.locator('[data-gallery-count]')).toHaveText('Showing 0 works in Commercial');
  const reset = page.locator('[data-gallery-reset]');
  await reset.focus();
  const all = page.locator('[data-category-filter="all"]');
  await all.dispatchEvent('click');
  await expect(all).toBeFocused();
  await expect(reset).toBeHidden();
  await expect(page.locator('[data-gallery-count]')).toHaveText(`Showing ${projects.length} works`);
});

test('runtime reduced motion cancels pending automatic previews while manual showreel remains available', async ({ page }) => {
  // Intentionally stall play, exercising preference cancellation without relying on a browser codec.
  await page.addInitScript(() => { HTMLMediaElement.prototype.play = () => new Promise<void>(() => {}); });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/work/');
  const preview = page.locator('[data-card-preview]').first();
  await preview.locator('xpath=ancestor::*[@data-project-card]').hover();
  await expect(preview).toHaveAttribute('src');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(preview).not.toHaveAttribute('src');
  await expect.poll(() => preview.evaluate((element) => (element as HTMLVideoElement).paused)).toBe(true);
  const motion = await page.locator('[data-project-card] img, [data-category-filter]').evaluateAll((elements) =>
    elements.every((element) => getComputedStyle(element).transitionDuration.split(',').every((value) => parseFloat(value) === 0)));
  expect(motion).toBe(true);
  await page.goto('/');
  await expect(page.locator('[data-hero-video]')).not.toHaveAttribute('src');
  await page.getByRole('button', { name: 'Play showreel', exact: true }).click();
  await expect(page.locator('[data-hero-video]')).toHaveAttribute('src');
  await expect(page.locator('[data-hero-status]')).toContainText(/loading|unavailable/i);
});

test('queued player events cannot restart the main film behind an open image viewer', async ({ page }) => {
  // A pending play promise models slow loading; synthetic late events exercise the race guard.
  await page.addInitScript(() => { HTMLMediaElement.prototype.play = () => new Promise<void>(() => {}); });
  await page.goto(`/work/${landscape.slug}/`);
  const player = page.locator('[data-project-player]');
  const video = page.locator('[data-project-video]');
  await page.locator('[data-player-start]').click();
  await expect(player).toHaveAttribute('data-player-state', 'loading');
  await page.locator('[data-lightbox-trigger]').first().dispatchEvent('click');
  await expect(lightbox(page)).toBeVisible();
  await video.dispatchEvent('play');
  await video.dispatchEvent('playing');
  await expect(player).not.toHaveAttribute('data-player-state', 'playing');
  await expect(page.locator('[data-lightbox-close]')).toBeFocused();
  await expect.poll(() => video.evaluate((element) => (element as HTMLVideoElement).paused)).toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-player-start]')).toBeVisible();
});
