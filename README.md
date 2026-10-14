# FORGE — Visual Universe

A cinematic portfolio for AI filmmaking and digital art, built on a restrained dark design system. Editable data drives the creative identity, collaboration page, responsive gallery, and project viewers with video, stills, and a fullscreen image lightbox.

## Stack

- Astro 7 with strict TypeScript and static site generation
- Tailwind CSS 4 through `@tailwindcss/vite`
- Self-hosted Cormorant Garamond and Manrope fonts
- An obsidian, graphite, ivory, and muted bronze design system

The site renders static HTML to `dist/` and deploys as assets to the existing `forge-portfolio` Cloudflare Worker. Development and builds need no API keys, backend services, adapter, or runtime rendering. Deployment authentication is supplied by the connected Cloudflare build platform or an authenticated Wrangler session.

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
- [Media integration guide](docs/media-integration.md): local assets, approved CDN origins, films, previews, showreel, accessibility, and playback requirements.
- [Reusable draft project template](docs/templates/project.json): copy into the collection and edit before publishing.

The five existing demonstration records remain **The Long Night**, **The Last Rune Engine**, **Dragon Resonance**, **Isekai Live-Action**, and **Surreal Universe**. Their sample labels and media placeholders do not claim completed original work. Explicit drafts are excluded from public grids, featured selection, adjacent navigation, detail routes, and the sitemap. New non-sample records without a publication status also stay draft; legacy samples without a status remain visible for compatibility.

`src/data/site.ts` holds the identity, About and Contact content, and verified production origin: `https://forge-portfolio.digivism9.workers.dev`. Personal identity, email, social profiles, services, capabilities, and availability remain unconfigured until approved details are supplied. `src/data/media.ts` trusts no external media origins by default; the production site origin does not automatically approve a CDN.

Portfolio schema and queries live in `src/lib/project-schema.ts` and `src/lib/projects.ts`; records live in `src/content/projects/`. The collection validates metadata during sync/build. Invalid fields, duplicate slugs, and filename/slug mismatches fail validation.

Typography remains self-hosted. The current Latin subsets cover English content; add the matching subsets and Unicode ranges before publishing other scripts and check glyph coverage. Preserve the existing font families and visual tokens. The historical [PR 04 QA report](docs/pr04-qa.md) records the responsive, accessibility, and performance baseline and its limitations.

## Release review

The [final QA report](docs/final-qa-report.md) records the PR 06 environment, measured accessibility/performance results, and hosted checks that still need verification. Use the [launch checklist](docs/launch-checklist.md), [deployment runbook](docs/deployment-runbook.md), and [content launch handoff](docs/content-launch-handoff.md) for release review and approved content replacement. Technical validation does not complete the missing creator identity, contact details, or original portfolio media.

## Deployment compatibility

Keep the connected Cloudflare Workers build using `npm run build` and `dist/`. `wrangler.jsonc` retains Worker name `forge-portfolio`, compatibility date `2026-10-06`, static assets directory `./dist`, and top-level `previews: {}`. Wrangler remains pinned to 4.149.0. An Astro adapter or Worker JavaScript entry point is unnecessary for the static site.

After building, `npx wrangler deploy --dry-run` validates packaging without publishing. The existing GitHub integration deploys the branch preview and, after an authorized merge to `main`, production. Verify both checks against their actual commit. With Cloudflare authentication, `npx wrangler deploy` publishes production and `npx wrangler preview` creates a preview deployment; do not run a manual production deployment without explicit approval. Wrangler preview has no dry-run option. Astro's `npm run preview` starts a local server and does not deploy.

The configured production origin supplies canonical URLs, social sharing URLs, and absolute sitemap locations. Update `site.productionOrigin` only to an owner-verified HTTPS origin after a domain change. Setting it to `null` omits origin-dependent metadata and produces an empty valid sitemap; do not guess a replacement hostname. No credentials or secrets belong in source control.

Cloudflare Pages remains an optional static target:

| Setting | Value |
| --- | --- |
| Framework preset | Astro |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | Repository root |
| Environment variable | `NODE_VERSION=22.23.3` |
