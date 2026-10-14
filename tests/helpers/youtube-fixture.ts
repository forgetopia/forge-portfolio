import { test as base, expect } from '@playwright/test';
import { execFile, spawn, type ChildProcess } from 'node:child_process';
import { cp, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);
const repository = resolve('.');

// This synthetic ID exists only in disposable, intercepted browser fixtures.
// It is never added to the owner's collection or the deployable dist directory.
export const syntheticVideoId = 'FORGE_TEST1';
export const youtubeProjects = [
  { slug: 'the-long-night', title: 'The Long Night', orientation: 'landscape', poster: '/placeholders/landscape.svg' },
  { slug: 'the-last-rune-engine', title: 'The Last Rune Engine', orientation: 'portrait', poster: '/placeholders/portrait.svg' },
] as const;

interface YouTubeSite { origin: string }

async function stopServer(server?: ChildProcess) {
  if (!server || server.exitCode !== null) return;
  await new Promise<void>((resolveStop) => {
    const timeout = setTimeout(() => { server.kill('SIGKILL'); resolveStop(); }, 5_000);
    server.once('exit', () => { clearTimeout(timeout); resolveStop(); });
    server.kill('SIGTERM');
  });
}

/** Exercise the actual Astro collection, route, styles, and scripts without publishing a test film. */
export const test = base.extend<{}, { youtubeSite: YouTubeSite }>({
  youtubeSite: [async ({}, use) => {
    const directory = await mkdtemp(join(tmpdir(), 'forge-youtube-browser-'));
    let server: ChildProcess | undefined;
    try {
      await Promise.all([
        ...['src', 'public', 'astro.config.mjs', 'tsconfig.json', 'package.json'].map((entry) => (
          cp(join(repository, entry), join(directory, entry), { recursive: true })
        )),
        symlink(join(repository, 'node_modules'), join(directory, 'node_modules'), 'dir'),
      ]);
      const baseConfig = await readFile(join(directory, 'astro.config.mjs'), 'utf8');
      await writeFile(join(directory, 'astro.fixture-base.config.mjs'), baseConfig);
      await writeFile(join(directory, 'astro.config.mjs'), `
        import configuration from './astro.fixture-base.config.mjs';
        export default {
          ...configuration,
          cacheDir: './.fixture-astro-cache',
          vite: { ...configuration.vite, cacheDir: './.fixture-vite-cache' },
        };
      `);
      for (const project of youtubeProjects) {
        const path = join(directory, 'src/content/projects', `${project.slug}.json`);
        const record = JSON.parse(await readFile(path, 'utf8'));
        delete record.video;
        record.youtube = { videoId: syntheticVideoId, startSeconds: 17, orientation: project.orientation };
        await writeFile(path, JSON.stringify(record));
      }
      const noFilmPath = join(directory, 'src/content/projects/dragon-resonance.json');
      const noFilm = JSON.parse(await readFile(noFilmPath, 'utf8'));
      delete noFilm.video;
      delete noFilm.youtube;
      await writeFile(noFilmPath, JSON.stringify(noFilm));
      await run(process.execPath, [join(repository, 'node_modules/astro/bin/astro.mjs'), 'build'], {
        cwd: directory,
        env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1', NO_COLOR: '1' },
        timeout: 90_000,
        maxBuffer: 1024 * 1024,
      });
      server = spawn(process.execPath, [join(repository, 'tests/static-server.mjs')], {
        cwd: repository,
        env: { ...process.env, PORTFOLIO_TEST_ROOT: join(directory, 'dist'), PORTFOLIO_TEST_PORT: '0' },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      const origin = await new Promise<string>((resolveOrigin, reject) => {
        let output = '';
        const timeout = setTimeout(() => reject(new Error(`Fixture server did not start: ${output}`)), 15_000);
        server!.stdout!.on('data', (chunk: Buffer) => {
          output += chunk.toString();
          const match = output.match(/http:\/\/127\.0\.0\.1:\d+/);
          if (match) { clearTimeout(timeout); resolveOrigin(match[0]); }
        });
        server!.stderr!.on('data', (chunk: Buffer) => { output += chunk.toString(); });
        server!.once('error', (error) => { clearTimeout(timeout); reject(error); });
        server!.once('exit', (code) => { clearTimeout(timeout); reject(new Error(`Fixture server exited ${code}: ${output}`)); });
      });
      await use({ origin });
    } finally {
      await stopServer(server);
      await rm(directory, { recursive: true, force: true });
    }
  }, { scope: 'worker', timeout: 120_000 }],
});

export { expect };
