import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ProjectData } from '../../src/lib/project-schema';

const projects: ProjectData[] = readdirSync(resolve('src/content/projects'))
  .filter((filename) => filename.endsWith('.json'))
  .map((filename) => JSON.parse(readFileSync(resolve('src/content/projects', filename), 'utf8')));
const filters = [
  { id: 'all', label: 'All Works' },
  { id: 'ai-films', label: 'AI Films' },
  { id: 'fantasy-live-action', label: 'Fantasy Live-Action' },
  { id: 'action-combat', label: 'Action & Combat' },
  { id: 'fashion-editorial', label: 'Fashion Editorial' },
  { id: 'ai-photography', label: 'AI Photography' },
  { id: 'surreal-experimental', label: 'Surreal & Experimental' },
  { id: 'commercial', label: 'Commercial' },
];

const cards = (page: Page) => page.locator('[data-portfolio-gallery] [data-project-card]');
const visibleCards = (page: Page) => page.locator('[data-portfolio-gallery] [data-project-card]:visible');
const filterButton = (page: Page, id: string) => page.locator(`[data-category-filter="${id}"]`);

test('every category filters multi-category projects accurately and All Works resets the grid', async ({ page }) => {
  await page.goto('/work/');
  await expect(cards(page)).toHaveCount(projects.length);
  await expect(page.locator('[data-category-filter]')).toHaveCount(filters.length);
  await expect(page.locator('[data-gallery-count]')).toHaveAttribute('aria-live', 'polite');

  for (const { id, label } of filters) {
    const button = filterButton(page, id);
    await expect(button).toHaveAccessibleName(label);
    await expect(button).toBeVisible();
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-category-filter][aria-pressed="true"]')).toHaveCount(1);

    const expected = projects.filter((project) => id === 'all' || project.categories.includes(id as ProjectData['categories'][number]));
    await expect(visibleCards(page)).toHaveCount(expected.length);
    for (const project of expected) {
      await expect(visibleCards(page).getByRole('link', { name: `View project: ${project.title}`, exact: true })).toBeVisible();
    }
    await expect(page.locator('[data-gallery-count]')).toContainText(String(expected.length));
    if (expected.length === 0) {
      await expect(page.locator('[data-gallery-empty]')).toBeVisible();
      await page.locator('[data-gallery-reset]').click();
      await expect(filterButton(page, 'all')).toBeFocused();
      await expect(filterButton(page, 'all')).toHaveAttribute('aria-pressed', 'true');
      await expect(visibleCards(page)).toHaveCount(projects.length);
      await expect(page.locator('[data-gallery-empty]')).toBeHidden();
    } else {
      await expect(page.locator('[data-gallery-empty]')).toBeHidden();
    }
  }

  await filterButton(page, 'ai-films').click();
  await filterButton(page, 'all').click();
  await expect(visibleCards(page)).toHaveCount(projects.length);
});

test('category filters work with the keyboard and preserve focus', async ({ page }) => {
  await page.goto('/work/');
  const button = filterButton(page, 'ai-photography');
  await button.focus();
  await page.keyboard.press('Space');
  await expect(button).toBeFocused();
  await expect(button).toHaveAttribute('aria-pressed', 'true');
  await expect(visibleCards(page)).toHaveCount(projects.filter((project) => project.categories.includes('ai-photography')).length);
  await filterButton(page, 'all').focus();
  await page.keyboard.press('Enter');
  await expect(visibleCards(page)).toHaveCount(projects.length);
});

test('cards use labeled local landscape and portrait media and navigate to their own details', async ({ page }) => {
  await page.goto('/work/');
  for (const project of projects) {
    const card = cards(page).filter({ has: page.locator(`a[href="/work/${project.slug}/"]`) });
    await expect(card).toHaveCount(1);
    if (project.cover.placeholder) {
      await expect(card.getByText('Placeholder image', { exact: true })).toBeVisible();
    } else {
      await expect(card.getByText('Placeholder image', { exact: true })).toHaveCount(0);
    }
    const image = card.getByRole('img', { name: project.cover.alt });
    await expect(image).toHaveAttribute('src', project.cover.src);
    await expect(image).toHaveAttribute('width', String(project.cover.width));
    await expect(image).toHaveAttribute('height', String(project.cover.height));
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    const ratio = await image.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return rect.width / rect.height;
    });
    if (project.cover.orientation === 'portrait') expect(ratio).toBeLessThan(1);
    else expect(ratio).toBeGreaterThan(1);
  }
  expect(projects.some((project) => project.cover.orientation === 'portrait')).toBe(true);
  expect(projects.some((project) => project.cover.orientation === 'landscape')).toBe(true);
  const project = projects[0]!;
  await page.locator(`a[href="/work/${project.slug}/"]`).first().click();
  await expect(page).toHaveURL(`/work/${project.slug}/`);
  await expect(page.locator('main h1')).toHaveText(project.title);
  await page.goBack();
  await expect(page).toHaveURL('/work/');
  await expect(visibleCards(page)).toHaveCount(projects.length);
});

test('every detail route is generated as a static page with accurate sample labels and active Work navigation', async ({ page, request }) => {
  for (const project of projects) {
    const response = await request.get(`/work/${project.slug}/`);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('text/html');
    await page.goto(`/work/${project.slug}/`);
    await expect(page.locator('main h1')).toHaveText(project.title);
    if (project.sample) await expect(page.locator('main')).toContainText(/sample/i);
    if (project.cover.placeholder) await expect(page.locator('main')).toContainText(/placeholder/i);
    expect(await page.locator('header a[href="/work/"][aria-current]').count()).toBeGreaterThan(0);
    // Project films are progressively enhanced; their presence must match collection metadata.
    await expect(page.locator('[data-project-video]')).toHaveCount(project.video ? 1 : 0);
  }
});

test('homepage featured works reflect collection flags and link to generated detail routes', async ({ page }) => {
  await page.goto('/');
  const section = page.locator('[data-featured-projects]');
  const featured = projects.filter((project) => project.featured);
  await expect(section.locator('[data-project-card]')).toHaveCount(featured.length);
  for (const project of featured) {
    await expect(section.locator(`a[href="/work/${project.slug}/"]`)).toBeVisible();
    await expect(section).toContainText(project.title);
  }
});

test('without JavaScript all project cards and detail routes remain accessible', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  try {
    await page.goto('/work/');
    await expect(visibleCards(page)).toHaveCount(projects.length);
    for (const button of await page.locator('[data-category-filter]').all()) {
      await expect(button).toBeHidden();
    }
    const project = projects[0]!;
    await page.locator(`a[href="/work/${project.slug}/"]`).first().click();
    await expect(page.locator('main h1')).toHaveText(project.title);
  } finally {
    await context.close();
  }
});

for (const width of [320, 390, 768, 1440]) {
  test(`homepage, grid, filters, and portrait detail fit a ${width}px viewport`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const portrait = projects.find((project) => project.cover.orientation === 'portrait')!;
    for (const route of ['/', '/work/', `/work/${portrait.slug}/`]) {
      await page.goto(route);
      await page.evaluate(() => document.fonts.ready);
      const dimensions = await page.evaluate(() => ({
        viewport: window.innerWidth,
        document: document.documentElement.scrollWidth,
        body: document.body.scrollWidth,
      }));
      expect(dimensions.document, `${route} overflows at ${width}px`).toBeLessThanOrEqual(dimensions.viewport + 1);
      expect(dimensions.body, `${route} body overflows at ${width}px`).toBeLessThanOrEqual(dimensions.viewport + 1);
    }
    await page.goto('/work/');
    await filterButton(page, 'surreal-experimental').click();
    await expect(visibleCards(page)).toHaveCount(projects.filter((project) => project.categories.includes('surreal-experimental')).length);
  });
}

test('reduced-motion preferences suppress card and filter transitions', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/work/');
  const durations = await page.locator('[data-project-card], [data-project-card] img, [data-category-filter]').evaluateAll((elements) => {
    const seconds = (value: string) => value.endsWith('ms') ? parseFloat(value) / 1000 : parseFloat(value);
    return elements.flatMap((element) => {
      const style = getComputedStyle(element);
      return `${style.transitionDuration},${style.animationDuration}`.split(',').map((duration) => seconds(duration.trim()));
    });
  });
  expect(durations.length).toBeGreaterThan(0);
  expect(durations.every((duration) => duration <= 0.0001)).toBe(true);
});

test('production gallery and portrait detail pass automated accessibility checks', async ({ page }) => {
  const portrait = projects.find((project) => project.cover.orientation === 'portrait')!;
  for (const route of ['/work/', `/work/${portrait.slug}/`]) {
    await page.goto(route);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations, `Accessibility violations at ${route}`).toEqual([]);
  }
});
