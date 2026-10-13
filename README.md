# FORGE — Visual Universe

A cinematic portfolio for AI filmmaking and digital art, built on a restrained dark design system. Portfolio records drive a responsive gallery, category filters, featured homepage projects, and individual project pages.

## Stack

- Astro with strict TypeScript and static site generation
- Tailwind CSS 4 through `@tailwindcss/vite`
- Self-hosted Cormorant Garamond and Manrope fonts
- An obsidian, graphite, ivory, and muted bronze design system

The site renders static HTML to `dist/` and preserves the existing Cloudflare Workers deployment integration. No API keys, backend services, Cloudflare adapter, or runtime rendering are required. The live deployment configuration is managed outside this checkout; this change does not introduce or alter it.

## Local development

Use Node.js 22.23.3, pinned in `.node-version`, and npm 9.6.5 or newer. Astro requires at least Node.js 22.12.

```sh
npm ci
npm run dev -- --host 0.0.0.0
```

Open `http://localhost:4321`. In a cloud workspace, open or forward port `4321` using the workspace's preview controls.

Local development and preview servers normally run in the foreground; stop them with Ctrl+C. Astro 7 may automatically run servers in the background in cloud agent sessions. For those sessions, check or stop them with `npm run dev -- status`, `npm run dev -- stop`, `npm run preview -- status`, and `npm run preview -- stop`. Stop the preview before rebuilding `dist/`. If a port is occupied, use the port Astro reports or specify another with `--port`.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Astro development server |
| `npm run check` | Run Astro and TypeScript diagnostics |
| `npm run build` | Generate the production site in `dist/` |
| `npm run test:unit` | Validate project schemas and portfolio content |
| `npm run test:e2e` | Check the built site with Playwright |
| `npm run preview -- --host 0.0.0.0` | Preview the production build on port `4321` |

Before opening a pull request, run:

```sh
npm run check
npm run test:unit
npm run build
npm run test:e2e
```

To preview the generated production site, run `npm run build` followed by `npm run preview -- --host 0.0.0.0`.

Install Chromium for the browser checks once per environment:

```sh
npx playwright install chromium
```

On Linux, use `npx playwright install --with-deps chromium` if system browser libraries are missing and your environment permits installing them. An existing compatible Chromium can be used with `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e`. The browser suite serves the existing `dist/` output with its own local static server on port `4173`, so build first. Set `PORTFOLIO_TEST_PORT` if that port is occupied. `npm run test` is an alias for the unit suite.

GitHub Actions runs type checks, unit tests, the production build, and Chromium browser tests for pull requests and pushes to `main`. Failed browser runs upload their traces for investigation.

## Pages and customization

| Route | Content |
| --- | --- |
| `/` | Cinematic hero, featured portfolio projects, and studio introduction |
| `/work/` | Responsive portfolio grid with eight category filter options |
| `/work/[slug]/` | Statically generated project detail pages |
| `/about/` | Studio identity and creative approach |
| `/contact/` | Contact page prepared for real contact details |

Shared page structure lives in `src/layouts/` and reusable interface elements in `src/components/`. Update the studio identity, site metadata, and contact configuration in `src/data/site.ts`. The global stylesheet defines the design tokens and shared visual treatments.

The five demonstration records are **The Long Night**, **The Last Rune Engine**, **Dragon Resonance**, **Isekai Live-Action**, and **Surreal Universe**. These are explicitly labeled sample records with placeholder media; their text and categories demonstrate the content model and do not claim original artwork or completed productions. Gallery filters work in the browser, while all projects and detail links remain available without JavaScript. Video hover previews and fullscreen lightboxes are deferred to PR 03.

Contact information is deliberately unconfigured; supply real details before publishing a live contact channel.

## Portfolio content

Astro's `projects` Content Collection is defined in `src/content.config.ts`. JSON records live in `src/content/projects/`, the shared TypeScript/Zod schema lives in `src/lib/project-schema.ts`, and queries and route helpers live in `src/lib/projects.ts`. Invalid metadata fails validation rather than silently publishing malformed projects.

Add a file whose name matches its unique lowercase kebab-case `slug`. For example, `src/content/projects/my-sample-project.json`:

```json
{
  "slug": "my-sample-project",
  "title": "My Sample Project",
  "summary": "A sample record demonstrating the portfolio structure.",
  "description": [
    "Demonstration content. Original artwork and verified project details have not been supplied."
  ],
  "categories": ["ai-films"],
  "cover": {
    "src": "/placeholders/landscape.svg",
    "alt": "Labeled landscape image placeholder; no artwork supplied.",
    "width": 1600,
    "height": 1000,
    "orientation": "landscape",
    "placeholder": true
  },
  "featured": false,
  "order": 6,
  "sample": true
}
```

Titles, summaries, image alternative text, and every description paragraph must be nonempty. Choose at least one category; duplicate or unknown category IDs are rejected:

| Category ID | Filter label |
| --- | --- |
| `ai-films` | AI Films |
| `fantasy-live-action` | Fantasy Live-Action |
| `action-combat` | Action & Combat |
| `fashion-editorial` | Fashion Editorial |
| `ai-photography` | AI Photography |
| `surreal-experimental` | Surreal & Experimental |
| `commercial` | Commercial |

**All Works** displays the complete collection and is not a project category. Multiple categories let a project appear in multiple filters. An empty category displays an explanatory empty state.

`featured: true` includes a project on the homepage. Projects are sorted by ascending nonnegative integer `order`, then by slug for consistent ordering. These fields default to `false` and `0` respectively when omitted.

Use local cover paths under `public/placeholders/` or `public/images/` and reference them as `/placeholders/...` or `/images/...`. Set the actual positive integer dimensions: landscape covers must be wider than tall, and portrait covers taller than wide. The included portrait placeholder is `/placeholders/portrait.svg` at `1000 × 1400`; set `orientation` to `portrait` when using it. Project cards preserve both media formats.

Keep `sample: true` while a record contains demonstration text or unverified project details. Keep `cover.placeholder: true` for placeholder images and use alternative text that identifies them. Only change these flags after replacing their content with approved project information and supplied artwork. Never invent images, credits, clients, or production claims.

Run the validation and test commands after editing content. A successful build generates the corresponding `/work/my-sample-project/` page automatically; no route file per project is needed.

## Deployment compatibility

Keep the existing Cloudflare Workers build integration using `npm run build` and `dist/`. There is no deployment configuration file to edit in this checkout. Continue managing the live deployment through its current Cloudflare settings.

Cloudflare Pages is also a supported optional target with the following settings:

| Setting | Value |
| --- | --- |
| Framework preset | Astro |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | Repository root |
| Environment variable | `NODE_VERSION=22.23.3` |

Once the public domain is confirmed, add Astro's `site` option in `astro.config.mjs` before introducing canonical URLs or a sitemap.
