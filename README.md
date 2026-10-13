# FORGE — Visual Universe

A cinematic portfolio for AI filmmaking and digital art, built on a restrained dark design system. Portfolio records drive a responsive gallery, category filters, featured homepage projects, and individual project pages with video, stills, and a fullscreen image viewer.

## Stack

- Astro with strict TypeScript and static site generation
- Tailwind CSS 4 through `@tailwindcss/vite`
- Self-hosted Cormorant Garamond and Manrope fonts
- An obsidian, graphite, ivory, and muted bronze design system

The site renders static HTML to `dist/` and deploys as static assets to the existing `forge-portfolio` Cloudflare Worker. No API keys, backend services, Cloudflare adapter, or runtime rendering are required to develop and build the site. Deployment configuration lives in `wrangler.jsonc`; Cloudflare authentication is supplied separately by the connected build platform or your authenticated Wrangler session.

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
| `npm run test:unit` | Validate project schemas, media metadata, and portfolio content |
| `npm run test:e2e` | Check the built site and media interactions with Playwright |
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

GitHub Actions runs type checks, unit tests, the production build, Wrangler deployment validation, and Chromium browser tests for pull requests and pushes to `main`. Failed browser runs upload their traces for investigation.

## Pages and customization

| Route | Content |
| --- | --- |
| `/` | Cinematic showreel hero, featured portfolio projects, and studio introduction |
| `/work/` | Responsive portfolio grid with eight category filter options |
| `/work/[slug]/` | Static project viewer with cover, video, synopsis, direction, credits, stills, and adjacent projects |
| `/about/` | Studio identity and creative approach |
| `/contact/` | Contact page prepared for real contact details |

Shared page structure lives in `src/layouts/` and reusable interface elements in `src/components/`. Update the studio identity, site metadata, and contact configuration in `src/data/site.ts`. The global stylesheet defines the design tokens and shared visual treatments.

The five demonstration records are **The Long Night**, **The Last Rune Engine**, **Dragon Resonance**, **Isekai Live-Action**, and **Surreal Universe**. These are explicitly labeled sample records with placeholder media; their text and categories demonstrate the content model and do not claim original artwork or completed productions. Gallery filters work in the browser, while all projects and detail links remain available without JavaScript.

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

Use local image paths under `public/placeholders/`, `public/images/`, or `public/art/` and reference them as `/placeholders/...`, `/images/...`, or `/art/...`. Set the actual positive integer dimensions: landscape images must be wider than tall, and portrait images taller than wide. The included portrait placeholder is `/placeholders/portrait.svg` at `1000 × 1400`; set `orientation` to `portrait` when using it. Project cards and stills preserve both media formats. Images may also have an optional nonempty `caption`.

Keep `sample: true` while a record contains demonstration text or unverified project details. Keep `cover.placeholder: true` for placeholder images and use alternative text that identifies them. Only change these flags after replacing their content with approved project information and supplied artwork. Never invent images, credits, clients, or production claims.

Run the validation and test commands after editing content. A successful build generates the corresponding `/work/my-sample-project/` page automatically; no route file per project is needed.

## Cinematic media

The hero's media and optional autoplay flag live in `src/data/showreel.ts`. The default is `autoplay: false`: visitors choose when to play. Opt-in autoplay remains muted and is gated by reduced-motion, data-saving, and desktop pointer preferences. An accessible play/pause control and mute control accompany the hero; the committed demonstration clip has no audio. The existing high-resolution `/art/horizon.svg` is explicitly labeled as a poster placeholder until supplied showreel artwork is available.

Project records may add the following fields without changing their route:

| Field | Content |
| --- | --- |
| `video` | Main project video using the media metadata shown below |
| `previewVideo` | Short muted card preview using the same metadata |
| `synopsis` | Nonempty synopsis; existing description content remains available |
| `creativeDirection` | Array of nonempty direction paragraphs |
| `credits` | Array of `{ "role": "…", "name": "…" }` entries with verified information |
| `stills` | Array using the same image metadata as `cover`, with optional captions |

The schema defaults direction, credits, and stills to empty arrays. The sample credits remain empty because no verified production credits have been supplied. Missing video and still fields remain valid, so projects can be image-only.

For example, merge this optional `video` field into a sample record:

```json
{
  "video": {
    "src": "/media/placeholder-landscape.mp4",
    "type": "video/mp4",
    "width": 1280,
    "height": 800,
    "orientation": "landscape",
    "placeholder": true,
    "hasAudio": false,
    "captions": [
      { "src": "/media/placeholder-en.vtt", "srclang": "en", "label": "English" }
    ],
    "transcript": "A silent test pattern labeled PLACEHOLDER CLIP and NO ORIGINAL FOOTAGE."
  }
}
```

Videos must be local `.mp4` or `.webm` files under `public/media/`; the MIME type must match the extension. Dimensions and orientation are validated as they are for images. Set `hasAudio: true` for audio-bearing footage and supply at least one caption track, stored as a local `.vtt` file under `public/media/`. Include accurate alternative text, captions, and a transcript describing meaningful visual content. Keep `placeholder: true` for demonstration footage.

The committed five-second clips are generated neutral test patterns with burned-in **PLACEHOLDER CLIP / NO ORIGINAL FOOTAGE** labels. They contain no original artwork or audio. The landscape clip is `1280 × 800`; the portrait clip is `640 × 896`. Their shared English WebVTT track describes the test pattern. Builds need no FFmpeg because the assets are committed. To regenerate the clips during asset authoring, install FFmpeg with `libx264` and `drawtext`, then run:

```sh
bash scripts/generate-placeholder-media.sh
```

The helper uses a supported local sans-serif font. If none is available, set `FORGE_PLACEHOLDER_FONT` to the path of a local TrueType font before running it. Review regenerated assets before committing them.

Card previews attach and load footage only on eligible desktop mouse hover. Touch users, reduced-motion users, and data-saving users keep static poster cards. Only one card preview plays at a time; leaving a card or hiding it stops, resets, and releases its clip. Videos never preload across the entire grid. Project players use native controls and wait for visitor interaction; portrait footage retains its aspect ratio. Loading or playback failures keep a useful poster and provide a retry path.

Still images open a native-dialog fullscreen viewer with touch-friendly controls, arrow-key navigation, Escape to close, focus trapping, and focus restoration to the triggering image. Images keep their original aspect ratios. Without JavaScript, image links remain usable and project videos retain native controls; the hero keeps its poster fallback. No client framework or server rendering is required.

After replacing media, run the full check, unit-test, build, and browser-test sequence above. The browser suite covers media controls, lazy preview loading, pointer and preference fallbacks, playback failures, lightbox keyboard/focus behavior, and responsive presentation alongside the existing gallery checks.

## Deployment compatibility

Keep the existing Cloudflare Workers build integration using `npm run build` and `dist/`. The repository pins Wrangler 4.149.0 and defines the existing Worker name `forge-portfolio`, compatibility date `2026-10-06`, and static assets directory `./dist` in `wrangler.jsonc`. The date matches Wrangler's bundled runtime. There is no Worker JavaScript entry point or Astro adapter because every page is statically generated.

The top-level `previews: {}` enables the connected Cloudflare build's `npx wrangler preview` command. Preview deployments use the same static assets configuration; production remains compatible with `npx wrangler deploy`. Keep account credentials, custom domains, and platform build settings in Cloudflare rather than committing them.

After `npm run build`, validate production deployment packaging without publishing:

```sh
npx wrangler deploy --dry-run
```

With Cloudflare authentication, deploy using `npx wrangler deploy` for production or `npx wrangler preview` for a preview. Wrangler preview has no dry-run option and creates a preview deployment. The Astro `npm run preview` command is a local server and does not deploy to Cloudflare.

Cloudflare Pages is also a supported optional target with the following settings:

| Setting | Value |
| --- | --- |
| Framework preset | Astro |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | Repository root |
| Environment variable | `NODE_VERSION=22.23.3` |

Once the public domain is confirmed, add Astro's `site` option in `astro.config.mjs` before introducing canonical URLs or a sitemap.
