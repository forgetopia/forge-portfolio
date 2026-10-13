import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { cp, mkdtemp, readFile, rename, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';

const run = promisify(execFile);
const repository = resolve('.');
const astroCLI = resolve('node_modules/astro/bin/astro.mjs');

/** Exercise the real Astro loader/configuration without changing the working checkout. */
async function buildInvalidFixture(
  changeContent: (directory: string) => Promise<void>,
  expectedDiagnostic: RegExp,
): Promise<void> {
  const directory = await mkdtemp(join(tmpdir(), 'forge-content-regression-'));
  try {
    await Promise.all([
      ...['src', 'public', 'astro.config.mjs', 'tsconfig.json', 'package.json'].map((entry) => (
        cp(join(repository, entry), join(directory, entry), { recursive: true })
      )),
      symlink(join(repository, 'node_modules'), join(directory, 'node_modules'), 'dir'),
    ]);
    await changeContent(join(directory, 'src/content/projects'));

    let failedBuild = false;
    let output = '';
    try {
      const result = await run(process.execPath, [astroCLI, 'build'], {
        cwd: directory,
        env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1', NO_COLOR: '1' },
        timeout: 60_000,
        maxBuffer: 1024 * 1024,
      });
      output = `${result.stdout}\n${result.stderr}`;
    } catch (error) {
      const failure = error as Error & { code?: number | string; stdout?: string; stderr?: string };
      assert.equal(typeof failure.code, 'number', `Build failed to execute: ${failure.message}`);
      assert.notEqual(failure.code, 0);
      failedBuild = true;
      output = `${failure.stdout ?? ''}\n${failure.stderr ?? ''}`;
    }

    assert.ok(failedBuild, `Invalid content unexpectedly produced a successful static build:\n${output}`);
    assert.match(output, expectedDiagnostic, `Build failed for an unrelated reason:\n${output}`);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test('actual Astro loader rejects a filename/slug mismatch instead of using metadata as identity', { timeout: 90_000 }, async () => {
  await buildInvalidFixture(async (directory) => {
    await rename(join(directory, 'the-long-night.json'), join(directory, 'renamed-file.json'));
  }, /Project filename renamed-file\.json must match slug the-long-night/);
});

test('actual Astro loader retains distinct files with duplicate slugs so conflicting routes fail the build', { timeout: 90_000 }, async () => {
  await buildInvalidFixture(async (directory) => {
    await cp(join(directory, 'the-long-night.json'), join(directory, 'z-duplicate-night.json'));
  }, /Duplicate portfolio slug: the-long-night|Project filename z-duplicate-night\.json must match slug the-long-night/);
});

test('actual Astro content collection rejects malformed categories during production builds', { timeout: 90_000 }, async () => {
  await buildInvalidFixture(async (directory) => {
    const file = join(directory, 'the-long-night.json');
    const record = JSON.parse(await readFile(file, 'utf8'));
    record.categories = ['unknown-category'];
    await writeFile(file, JSON.stringify(record));
  }, /InvalidContentEntryDataError[\s\S]*categories\.0/);
});
