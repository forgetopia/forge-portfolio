import { expect, test } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { site } from '../../src/data/site';
import { showreel } from '../../src/data/showreel';
import { projectSchema } from '../../src/lib/project-schema';
import { filterPublicProjects } from '../../src/lib/project-utils';
import { buildMailtoLink } from '../../src/lib/site-schema';

const productionOrigin = 'https://forge-portfolio.digivism9.workers.dev';
const projects = filterPublicProjects(readdirSync(resolve('src/content/projects'))
  .filter((filename) => filename.endsWith('.json'))
  .map((filename) => ({ data: projectSchema.parse(JSON.parse(readFileSync(resolve('src/content/projects', filename), 'utf8'))) })))
  .map(({ data }) => data);
const routes = ['/', '/work/', '/about/', '/contact/', ...projects.map((project) => `/work/${project.slug}/`)];

test('About keeps an editable creative introduction, disciplines, workflow, capabilities, and collaboration CTA', async ({ page }) => {
  await page.goto('/about/');
  await expect(page.locator('main h1')).toHaveCount(1);
  await expect(page.locator('main')).toContainText(site.about.introductionDescription);
  await expect(page.locator('#philosophy-heading')).toBeVisible();
  for (const discipline of site.creativeDisciplines) await expect(page.locator('main')).toContainText(discipline);
  await expect(page.locator('main')).toContainText(site.about.workflowIntroduction);
  for (const step of site.about.productionWorkflow) {
    await expect(page.locator('main')).toContainText(step.title);
    await expect(page.locator('main')).toContainText(step.description);
  }
  if (!site.capabilities.length) await expect(page.locator('main')).toContainText(site.about.capabilitiesIntroduction);
  const contact = page.locator('main a[href="/contact/"]').first();
  await expect(contact).toBeVisible();
  await contact.focus();
  await expect(contact).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL('/contact/');
});

test('Contact provides an honest missing-contact fallback and enables only configured email and social links', async ({ page }) => {
  await page.goto('/contact/');
  await expect(page.locator('main h1')).toHaveCount(1);
  await expect(page.locator('main form')).toHaveCount(0);
  const email = page.locator('main a[href^="mailto:"]');
  if (site.contactEmail) {
    await expect(email).toHaveCount(1);
    await expect(email).toHaveAttribute('href', buildMailtoLink(site.contactEmail, site.contactSubject)!);
    await expect(email).toHaveAccessibleName(new RegExp(site.contactEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  } else {
    await expect(email).toHaveCount(0);
    await expect(page.locator('main')).toContainText(/contact details.*soon|contact.*not.*supplied|public contact.*available/i);
  }
  const socialLinks = page.locator('main a[href^="https://"]');
  await expect(socialLinks).toHaveCount(site.socialLinks.length);
  for (const profile of site.socialLinks) {
    const link = socialLinks.filter({ hasText: profile.label });
    await expect(link).toHaveAttribute('href', profile.url);
    const target = await link.getAttribute('target');
    if (target === '_blank') {
      await expect(link).toHaveAttribute('rel', /\bnoopener\b/);
      await expect(link).toHaveAttribute('rel', /\bnoreferrer\b/);
    }
  }
  if (site.collaborationAvailability === 'unspecified') {
    await expect(page.locator('main')).not.toContainText('Open to collaboration');
    await expect(page.locator('main')).not.toContainText('Limited collaboration availability');
  }
});

test('Contact aside actions retain separate touch targets on mobile and desktop', async ({ page }) => {
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/contact/');
    await page.evaluate(() => document.fonts.ready);
    const links = page.locator('.contact-aside .text-link');
    await expect(links).toHaveCount(2);
    const first = await links.nth(0).boundingBox();
    const second = await links.nth(1).boundingBox();
    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    if (!first || !second) continue;
    const horizontalGap = Math.max(first.x - second.x - second.width, second.x - first.x - first.width);
    const verticalGap = Math.max(first.y - second.y - second.height, second.y - first.y - first.height);
    expect(Math.max(horizontalGap, verticalGap), `Contact links need spacing at ${width}px`).toBeGreaterThanOrEqual(8);
    for (const box of [first, second]) expect(box.height).toBeGreaterThanOrEqual(44);
  }
});

test('public routes share unique metadata and canonical production URLs without tracking query strings', async ({ page }) => {
  const titles: string[] = [];
  const descriptions: string[] = [];
  for (const route of routes) {
    await page.goto(`${route}?utm_source=regression&preview=untrusted`);
    const title = await page.title();
    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(title).toContain('FORGE');
    expect(description).toBeTruthy();
    titles.push(title);
    descriptions.push(description!);
    const canonical = `${productionOrigin}${route}`;
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', canonical);
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', canonical);
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', title);
    await expect(page.locator('meta[property="og:description"]')).toHaveAttribute('content', description!);
    await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute('content', 'FORGE — Visual Universe');
    const cover = projects.find((project) => route === `/work/${project.slug}/`)?.cover ?? site.profileImage ?? showreel.poster;
    const imageURL = cover.src.startsWith('https://') ? cover.src : `${productionOrigin}${cover.src}`;
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', imageURL);
    await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute('content', cover.alt);
    await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute('content', String(cover.width));
    await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute('content', String(cover.height));
    await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute('content', imageURL);
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
    await expect(page.locator('main h1')).toHaveCount(1);
  }
  expect(new Set(titles).size, 'Page titles must identify their own public route').toBe(routes.length);
  expect(new Set(descriptions).size, 'Page descriptions must identify their own public route').toBe(routes.length);
});

test('sitemap lists exactly the public routes with canonical production origins', async ({ request, page }) => {
  const response = await request.get('/sitemap.xml');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('xml');
  const xml = await response.text();
  const locations = await page.evaluate((value) => {
    const document = new DOMParser().parseFromString(value, 'application/xml');
    if (document.querySelector('parsererror')) throw new Error('The production sitemap is not valid XML');
    return [...document.querySelectorAll('url > loc')].map((node) => node.textContent);
  }, xml);
  expect(locations).toHaveLength(routes.length);
  expect(new Set(locations)).toEqual(new Set(routes.map((route) => `${productionOrigin}${route}`)));
});

test('existing sample records stay public and truthfully labeled alongside local placeholder media', async ({ page }) => {
  await page.goto('/work/');
  await expect(page.locator('[data-project-card]')).toHaveCount(projects.length);
  for (const project of projects.filter((record) => record.sample)) {
    const card = page.locator('[data-project-card]').filter({ has: page.locator(`a[href="/work/${project.slug}/"]`) });
    await expect(card).toContainText(/sample/i);
    if (project.cover.placeholder) await expect(card).toContainText('Placeholder image');
    await page.goto(`/work/${project.slug}/`);
    await expect(page.locator('main')).toContainText('Sample project');
    if (project.video?.placeholder) await expect(page.locator('main')).toContainText('Placeholder clip');
    if (project.cover.placeholder) await expect(page.locator('main')).toContainText('Placeholder image');
    await expect(page.locator('[data-project-video]')).toHaveAttribute('src', project.video!.src);
    await page.goto('/work/');
  }
});
