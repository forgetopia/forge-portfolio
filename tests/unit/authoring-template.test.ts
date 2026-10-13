import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { projectSchema } from '../../src/lib/project-schema';
import { isPublicProject } from '../../src/lib/project-utils';

test('the reusable authoring template validates, stays private, and references existing labeled placeholders', () => {
  const data = projectSchema.parse(JSON.parse(readFileSync('docs/templates/project.json', 'utf8')));
  assert.equal(data.status, 'draft');
  assert.equal(data.sample, true);
  assert.equal(isPublicProject({ data }), false);
  assert.deepEqual(data.credits, []);
  const media = [data.cover, data.video, data.previewVideo, ...(data.stills ?? [])].filter((item) => item !== undefined);
  for (const item of media) {
    assert.equal(item.placeholder, true);
    assert.ok(item.src.startsWith('/'), 'The starter must not invent remote asset URLs');
    assert.ok(existsSync(resolve('public', item.src.slice(1))), `Template asset is missing: ${item.src}`);
  }
});
