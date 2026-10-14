import { expect, test } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { projectSchema } from '../../src/lib/project-schema';
import { isPublicProject } from '../../src/lib/project-utils';

const projects = readdirSync(resolve('src/content/projects'))
  .filter((filename) => filename.endsWith('.json'))
  .map((filename) => projectSchema.parse(JSON.parse(readFileSync(resolve('src/content/projects', filename), 'utf8'))))
  .filter((data) => isPublicProject({ data }));
const films = ['landscape', 'portrait'].map((orientation) => projects.find((project) => project.video?.orientation === orientation)!);

test('the native film keyboard focus ring remains visible inside its clipping frame', async ({ page }) => {
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const project of films) {
      await page.goto(`/work/${project.slug}/`);
      // The video host is the first Tab stop after this link, before native controls.
      await page.getByRole('link', { name: 'All works', exact: true }).focus();
      await page.keyboard.press('Tab');
      const video = page.locator('[data-project-video]');
      await expect(video).toBeFocused();
      const indicator = await video.evaluate((element) => {
        const style = getComputedStyle(element);
        const frame = element.parentElement!;
        const frameStyle = getComputedStyle(frame);
        const mediaBox = element.getBoundingClientRect();
        const frameBox = frame.getBoundingClientRect();
        const expansion = parseFloat(style.outlineOffset) + parseFloat(style.outlineWidth);
        return {
          visible: element.matches(':focus-visible'),
          outlineStyle: style.outlineStyle,
          outlineWidth: parseFloat(style.outlineWidth),
          outlineColor: style.outlineColor,
          left: mediaBox.left - expansion,
          top: mediaBox.top - expansion,
          right: mediaBox.right + expansion,
          bottom: mediaBox.bottom + expansion,
          clipLeft: frameBox.left + parseFloat(frameStyle.borderLeftWidth),
          clipTop: frameBox.top + parseFloat(frameStyle.borderTopWidth),
          clipRight: frameBox.right - parseFloat(frameStyle.borderRightWidth),
          clipBottom: frameBox.bottom - parseFloat(frameStyle.borderBottomWidth),
        };
      });
      expect(indicator.visible, `${project.title} at ${width}px`).toBe(true);
      expect(indicator.outlineStyle).not.toBe('none');
      expect(indicator.outlineWidth).toBeGreaterThanOrEqual(2);
      expect(indicator.outlineColor).not.toBe('rgba(0, 0, 0, 0)');
      expect(indicator.left).toBeGreaterThanOrEqual(indicator.clipLeft);
      expect(indicator.top).toBeGreaterThanOrEqual(indicator.clipTop);
      expect(indicator.right).toBeLessThanOrEqual(indicator.clipRight);
      expect(indicator.bottom).toBeLessThanOrEqual(indicator.clipBottom);
    }
  }
});
