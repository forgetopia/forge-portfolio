# FORGE — Visual Universe

A cinematic portfolio for AI filmmaking and digital art, built on a restrained dark design system. Editable data drives the creative identity, collaboration page, responsive gallery, and project viewers with native or click-to-load YouTube films, stills, and a fullscreen image lightbox.

## Stack

- Astro 7 with strict TypeScript and static site generation
- Tailwind CSS 4 through `@tailwindcss/vite`
- Self-hosted Cormorant Garamond and Manrope fonts
- An obsidian, graphite, ivory, and muted bronze design system

The site renders static HTML to `dist/` and deploys as assets to the existing `forge-portfolio` Cloudflare Worker. The same source can produce a separate root-hosted GitHub Pages build. Development and builds need no API keys, backend services, adapter, or runtime rendering. Deployment authentication is supplied by the connected Cloudflare build platform or an authenticated Wrangler session.

## Local development

Use Node.js 22.23.3, pinned in `.node-version`, and npm 9.6.5 or newer. Astro requires at least Node.js 22.12.

```sh
npm ci
npm run dev -- --host 0.0.0.0
```

Open `http://localhost:4321`. In a cloud workspace, open or forward port `4321` using the workspace's preview controls.

Local servers normally run in the foreground; stop them with Ctrl+C. Astro 7 may background servers in cloud agent sessions. Check or stop those sessions with `npm run dev -- status`, `npm run dev -- stop`, `npm run preview -- status`, and `npm run preview -- stop`. Stop a production preview before rebuilding `dist/`. If a port is occupied, use the port Astro reports or specify another with `--port`.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Astro development server |
| `npm run check` | Run Astro and TypeScript diagnostics |
| `npm run build` | Generate the production site in `dist/` |
| `npm run test:unit` | Validate content, identity, media policy, and metadata |
| `npm run test:e2e` | Check the built site with Playwright |
| `npm run preview -- --host 0.0.0.0` | Preview the production build locally |

Before opening a pull request, run:

```sh
npm ci
npm run check
npm run test:unit
npm run build
npm run test:e2e
npx wrangler deploy --dry-run
```

To inspect production output locally, build first, then run `npm run preview -- --host 0.0.0.0`.

Install Chromium for browser checks once per environment:

```sh
npx playwright install chromium
```

On Linux, use `npx playwright install --with-deps chromium` when system libraries are missing and the environment permits installation. An existing compatible browser can be selected with `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e`. The suite serves the current `dist/` on port `4173`, so build first; set `PORTFOLIO_TEST_PORT` if occupied. `npm run test` aliases the unit suite.

Chromium is the default and the only browser required by CI. Optional local engines require their own binaries and system libraries:

```sh
npx playwright install firefox
PORTFOLIO_TEST_BROWSER=firefox npm run test:e2e
npx playwright install webkit
PORTFOLIO_TEST_BROWSER=webkit npm run test:e2e
```

The executable override applies only to Chromium. Report unsupported engines as untested. GitHub Actions runs diagnostics, unit tests, the production build, Wrangler packaging validation, and Chromium browser tests. Failed browser runs upload traces.

## Content and customization

| Route | Content |
| --- | --- |
| `/` | Cinematic showreel, featured public projects, and studio introduction |
| `/work/` | Public portfolio with eight category filter options |
| `/work/[slug]/` | Published or legacy sample project viewer |
| `/about/` | Editable creative identity, philosophy, disciplines, and workflow |
| `/contact/` | Collaboration introduction, approved services, and configured contact links |
| `/sitemap.xml` | Core routes and public projects using the configured production origin |

Routine updates belong in data files:

- [Content authoring guide](docs/content-authoring.md): projects, publication, identity, About, Contact, and review checklist.
- [Media integration guide](docs/media-integration.md): native and YouTube films, local assets, approved CDN origins, previews, showreel, accessibility, and playback requirements.
- [Reusable draft project template](docs/templates/project.json): copy into the collection and edit before publishing.

The five existing demonstration records remain **The Long Night**, **The Last Rune Engine**, **Dragon Resonance**, **Isekai Live-Action**, and **Surreal Universe**. Their sample labels and media placeholders do not claim completed original work. Explicit drafts are excluded from public grids, featured selection, adjacent navigation, detail routes, and the sitemap. New non-sample records without a publication status also stay draft; legacy samples without a status remain visible for compatibility.

`src/data/site.ts` holds the identity, About and Contact content. The build-time `FORGE_SITE_ORIGIN` setting selects the canonical origin, defaulting to the verified Cloudflare production origin: `https://forge-portfolio.digivism9.workers.dev`. Personal identity, email, social profiles, services, capabilities, and availability remain unconfigured until approved details are supplied. `src/data/media.ts` trusts no external media origins by default; selecting a site origin does not approve a CDN.

Portfolio schema and queries live in `src/lib/project-schema.ts` and `src/lib/projects.ts`; records live in `src/content/projects/`. The collection validates metadata during sync/build. Invalid fields, duplicate slugs, and filename/slug mismatches fail validation.

Each project may supply one main film: native MP4/WebM `video` metadata or a `youtube` object containing an owner-supplied 11-character `videoId`, `orientation`, and optional nonnegative integer `startSeconds`. Supplying both is rejected; omitting both keeps an image-only project. YouTube films show the existing cover until Play is activated, then load the privacy-enhanced `www.youtube-nocookie.com` player with standard controls. A normal watch link remains available. No real YouTube IDs are configured yet. YouTube iframe trust is separate from the still-empty direct-media CDN allowlist; native hover previews and the homepage hero remain unchanged. See [YouTube main films](docs/media-integration.md#youtube-main-films) for authoring and playback limitations.

Typography remains self-hosted. The current Latin subsets cover English content; add the matching subsets and Unicode ranges before publishing other scripts and check glyph coverage. Preserve the existing font families and visual tokens. The historical [PR 04 QA report](docs/pr04-qa.md) records the responsive, accessibility, and performance baseline and its limitations.

## Release review

The [final QA report](docs/final-qa-report.md) records the PR 06 environment, measured accessibility/performance results, hosted verification, and remaining media limitations. Use the [launch checklist](docs/launch-checklist.md), [deployment runbook](docs/deployment-runbook.md), and [content launch handoff](docs/content-launch-handoff.md) for release review and approved content replacement. Technical validation does not complete the missing creator identity, contact details, or original portfolio media.

## Dual-host deployments

Build once for each destination. `FORGE_SITE_ORIGIN` is a public, build-time setting, not a secret or runtime variable. Without it, the build retains the existing Cloudflare canonical origin. Set it to `https://forgetopia.github.io` for the approved GitHub Pages user-site origin:

| Destination | `FORGE_SITE_ORIGIN` | Canonical, Open Graph, sitemap, and absolute social image origin |
| --- | --- | --- |
| Existing Cloudflare Worker | Absent | `https://forge-portfolio.digivism9.workers.dev` |
| GitHub Pages user site | `https://forgetopia.github.io` | `https://forgetopia.github.io` |

```sh
# Cloudflare: ensure no origin override is inherited from the shell or a local .env file.
env -u FORGE_SITE_ORIGIN npm run build
npx wrangler deploy --dry-run

# GitHub Pages: generate a separate artifact with its own SEO URLs.
FORGE_SITE_ORIGIN=https://forgetopia.github.io npm run build
```

Each build replaces `dist/`. Rebuild with the Cloudflare default before packaging or publishing to Workers; do not deploy the Pages artifact to Cloudflare or reuse a Cloudflare artifact on Pages. Changing an environment setting after building does not update generated HTML or the sitemap. An optional trailing slash is normalized; malformed URLs, HTTP, credentials, paths, queries, fragments, and empty overrides fail validation. Keep the override absent in the connected Cloudflare build; no change to its working configuration is needed.

Routes and local assets remain root-relative, including `/work/`, `/images/`, `/media/`, and `/_astro/`. Keep hosting at `/` and do not set an Astro `/forge-portfolio/` base path. The `forgetopia/forge-portfolio` project repository alone would normally publish Pages under `/forge-portfolio/`, which is incompatible with this target. To serve `https://forgetopia.github.io/`, an authorized owner must publish the Pages build through the `forgetopia/forgetopia.github.io` user-site repository or another approved setup that serves that origin at its root. This change prepares the build; it does not create a repository, provision Pages, or deploy it.

When publishing, upload the contents of `dist/` as a GitHub Actions Pages artifact and deploy that artifact. If using branch-based publishing instead, include a `.nojekyll` file at the published root so Jekyll does not omit the generated `/_astro/` assets. See the [deployment runbook](docs/deployment-runbook.md#github-pages-user-site) for separate-artifact validation and hosting checks. Neither host selection changes content, the direct-media allowlist, native media, or YouTube configuration.

### Existing Cloudflare deployment

Keep the connected Cloudflare Workers build using `npm run build` and `dist/`. `wrangler.jsonc` retains Worker name `forge-portfolio`, compatibility date `2026-10-06`, static assets directory `./dist`, and top-level `previews: {}`. Wrangler remains pinned to 4.149.0. An Astro adapter or Worker JavaScript entry point is unnecessary for the static site.

After building, `npx wrangler deploy --dry-run` validates packaging without publishing. The existing GitHub integration deploys the branch preview and, after an authorized merge to `main`, production. Verify both checks against their actual commit. With Cloudflare authentication, `npx wrangler deploy` publishes production and `npx wrangler preview` creates a preview deployment; do not run a manual production deployment without explicit approval. Wrangler preview has no dry-run option. Astro's `npm run preview` starts a local server and does not deploy.

The effective origin supplies canonical URLs, Open Graph URLs, absolute social image URLs for local covers, and sitemap locations. It stays on the Cloudflare production origin for branch previews unless explicitly overridden. Never use a guessed host or temporary preview origin. No credentials or secrets belong in source control.

Cloudflare Pages remains an optional static target:

| Setting | Value |
| --- | --- |
| Framework preset | Astro |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | Repository root |
| Environment variable | `NODE_VERSION=22.23.3` |
