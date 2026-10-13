# FORGE — Visual Universe

A cinematic portfolio foundation for AI filmmaking and digital art. PR 01 establishes the visual identity, page structure, and development workflow; featured projects and contact details are placeholders for future content.

## Stack

- Astro with strict TypeScript and static site generation
- Tailwind CSS 4 through `@tailwindcss/vite`
- Self-hosted Cormorant Garamond and Manrope fonts
- An obsidian, graphite, ivory, and muted bronze design system

The site renders static HTML and is compatible with Cloudflare Pages. No API keys, backend services, or credentials are required.

## Local development

Use Node.js 22.23.3, pinned in `.node-version`, and npm 9.6.5 or newer. Astro requires at least Node.js 22.12.

```sh
npm ci
npm run dev -- --host 0.0.0.0
```

Open `http://localhost:4321`. In a cloud workspace, open or forward port `4321` using the workspace's preview controls.

Astro 7 starts development and preview servers in the background by default. Check or stop them with `npm run dev -- status`, `npm run dev -- stop`, `npm run preview -- status`, and `npm run preview -- stop`. Stop the preview before rebuilding `dist/`. If a port is occupied, use the port Astro reports or specify another with `--port`.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Astro development server |
| `npm run check` | Run Astro and TypeScript diagnostics |
| `npm run build` | Generate the production site in `dist/` |
| `npm run preview -- --host 0.0.0.0` | Preview the production build on port `4321` |

Before opening a pull request, run:

```sh
npm run check
npm run build
```

To preview the generated production site, run `npm run build` followed by `npm run preview -- --host 0.0.0.0`.

GitHub Actions runs the type check and production build for pull requests and pushes to `main`.

## Pages and customization

| Route | Content |
| --- | --- |
| `/` | Cinematic hero, selected-work placeholders, and studio introduction |
| `/work/` | A static overview of the visual practice |
| `/about/` | Studio identity and creative approach |
| `/contact/` | Contact page prepared for real contact details |

Shared page structure lives in `src/layouts/` and reusable interface elements in `src/components/`. Update the studio identity, site metadata, and contact configuration in `src/data/site.ts`. The global stylesheet defines the design tokens and shared visual treatments.

The hero and project artwork use local static SVG placeholders. This foundation does not include video playback or advanced gallery interactions. Contact information is deliberately unconfigured; supply real details before publishing a live contact channel.

## Cloudflare Pages

Connect this repository to Cloudflare Pages with these settings:

| Setting | Value |
| --- | --- |
| Framework preset | Astro |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | Repository root |
| Environment variable | `NODE_VERSION=22.23.3` |

No Cloudflare adapter is needed for this static site. Once the public domain is known, add Astro's `site` option in `astro.config.mjs` before introducing canonical URLs or a sitemap.
