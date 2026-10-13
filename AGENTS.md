# Repository development instructions

## Purpose and scope

FORGE — Visual Universe is a premium cinematic portfolio for AI filmmaking and digital art. The site includes a shared design system, responsive navigation, validated portfolio content and creative identity, category filtering, featured homepage projects, a cinematic hero, lazy card previews, static project viewers, and data-driven About and collaboration pages.

Keep work scoped to the requested change. Do not introduce backend services or invent artwork, footage, credits, and contact information. The demonstration media must remain clearly identified as placeholders until approved assets are supplied.

## Environment and commands

- Work in the existing checkout. Cloud tasks already have an isolated environment; do not create a Git worktree unless the user explicitly requests one.
- Use the Node 22 version pinned in `.node-version` and npm with the committed `package-lock.json`.
- Install dependencies with `npm ci` for repeatable setup. Change dependency declarations and the lockfile together only when the task requires a dependency change.
- Start development with `npm run dev -- --host 0.0.0.0`; the default port is `4321`.
- Run `npm run check` and `npm run build` before completing a change or opening a pull request. Resolve new diagnostics and build failures.
- Run `npm run test:unit` for content and schema changes. After a production build, run `npm run test:e2e` for gallery, media, route, navigation, or visual changes. Chromium remains the default and the only CI browser requirement. Use `PORTFOLIO_TEST_BROWSER=firefox` or `webkit` for optional local checks when supported; report untested engines. See the README for installation and the Chromium-only executable override.
- Preview production output with `npm run preview -- --host 0.0.0.0` after a successful build.

No credentials or environment secrets are required for the current site. Do not commit credentials or generated output such as `dist/`, `.astro/`, or `node_modules/`.

## Architecture

- Use Astro and strict TypeScript. Keep `output: 'static'` and the existing Cloudflare Workers deployment compatible. The build output remains `dist/`; an adapter is unnecessary for static assets. Preserve `wrangler.jsonc`, including the `forge-portfolio` name, static asset directory, compatibility date, and top-level `previews: {}`. Do not change deployment configuration or the pinned Wrangler version unless the requested task requires it.
- Use Tailwind CSS 4 through `@tailwindcss/vite`. Define shared visual tokens in the global stylesheet rather than scattering unrelated color values throughout components.
- Keep page routes in `src/pages/`, shared page layouts in `src/layouts/`, and reusable interface elements in `src/components/`.
- Keep identity, shared metadata, editable About content, services/capabilities, and collaboration configuration in `src/data/site.ts`, validated by `src/lib/site-schema.ts`. Personal fields remain optional until owner-approved. Never invent an email address, social account, creator identity, client, award, or project credit. Schema validation does not establish factual accuracy.
- Author portfolio records as JSON in `src/content/projects/`. Keep the Astro collection in `src/content.config.ts`, its shared TypeScript schema in `src/lib/project-schema.ts`, and content queries in `src/lib/projects.ts`. Validate new records against the schema and keep each file name equal to its unique kebab-case slug.
- Use the defined category IDs. Preserve accurate `sample` and media `placeholder` values until the user supplies real project content and artwork. Label demonstration projects and placeholder media in cards and detail pages; do not imply they are completed original work.
- Use explicit `status: 'draft'` or `'published'` for new projects. Explicit drafts must be absent from public grids, featured selection, previous/next navigation, generated detail routes, and sitemap. Preserve legacy samples without status as public; a non-sample record without status defaults to draft. Draft filtering does not protect files in `public/` or confidential content in Git.
- Keep featured selection and project order in content metadata. Use the reusable project card for both landscape and portrait media, and generate `/work/[slug]/` routes through Astro static paths.
- Configure the hero in `src/data/showreel.ts`. Keep project editorial metadata, `video`, `previewVideo`, `synopsis`, `creativeDirection`, `productionWorkflow`, `credits`, and `stills` in collection records; preserve records without optional fields. Keep the reusable template in `docs/templates/` outside the collection and explicitly draft.
- Prefer local web-ready assets in `public/images/` and `public/media/`. Approved remote media uses exact HTTPS origins in `src/data/media.ts`; keep the default allowlist empty until the owner approves a host. Never invent asset URLs, widen trust to wildcards, add credentials, or commit large master video files. The production origin does not implicitly approve a media host.
- Supply accurate MIME type, positive dimensions, orientation, placeholder status, and audio metadata. Audio-bearing videos require WebVTT caption tracks; provide meaningful visual descriptions and transcripts where applicable. Remote playback must work with anonymous CORS where used, appropriate response MIME types, and video range requests. Never put unverified credits in sample records.
- Keep production origin configuration in `site.productionOrigin`; use the verified production origin for canonical/social URLs and sitemap entries, never a guessed host or branch preview. The sitemap must include only public projects. When unset, omit origin-dependent metadata and keep a valid empty sitemap.
- Keep routine authoring instructions in `docs/content-authoring.md` and media host/asset requirements in `docs/media-integration.md`. Preserve the historical `docs/pr04-qa.md` report rather than replacing measured results with assumptions.
- The committed placeholder MP4s are explicitly labeled generated test patterns. Regenerate them only when needed using `bash scripts/generate-placeholder-media.sh` with FFmpeg and a supported local font. FFmpeg is an optional authoring tool, not a dependency of installation or production builds.
- Prefer local assets and self-hosted fonts. Preserve the Cormorant Garamond and Manrope typography and the obsidian, graphite, ivory, and muted bronze palette unless the task changes the design direction. Current font subsets cover English/Latin content. Expand the self-hosted subsets and Unicode ranges when adding other scripts; check glyph coverage rather than importing all subsets by default.
- Prefer semantic HTML and Astro components. Add client JavaScript only when a requested interaction requires it.

## Interface quality

- Preserve the restrained cinematic identity: generous spacing, clear hierarchy, quiet accents, and deliberate typography.
- Build responsive layouts that work on narrow mobile screens and wide displays without horizontal overflow.
- Maintain keyboard navigation, visible focus indicators, meaningful link labels, accessible form controls, and adequate text contrast.
- Respect `prefers-reduced-motion` and data-saving preferences. Keep hero autoplay disabled by default. An explicit configuration opt-in may autoplay only while muted and after checking reduced motion, data saving, and an eligible desktop pointer; never automatically enable audio. Always preserve manual playback and accessible controls.
- Load card previews only on eligible desktop mouse hover. Keep posters on touch devices and for reduced-motion or data-saving users; allow only one active preview. Pause, reset, and release sources when a preview ends, its card becomes hidden, it leaves the viewport, or the page becomes hidden. Never preload all gallery videos.
- Supply a separate short muted preview clip for real media instead of using the full project video as `previewVideo`. Only the tiny committed placeholder clips may share their main/preview URL.
- Preserve posters and graceful loading/playback error handling. Project videos use native controls and visitor-initiated playback. Keep useful native or link fallbacks when JavaScript is unavailable.
- Preserve landscape and portrait media aspect ratios. Still-image dialogs must support previous/next controls, keyboard arrows, Escape, focus trapping, focus restoration, touch-friendly controls, and accessible captions. Pause background media when opening an immersive viewer.
- Keep the portfolio grid useful without client JavaScript. Filters must use accessible buttons, indicate the selected category, announce result changes, and provide a useful empty state.
- Label placeholder content accurately and provide appropriate alternative text for meaningful images. Mark purely decorative artwork as decorative.
- Check the relevant routes and navigation at desktop and mobile widths after visual changes.
- For responsive changes, inspect all routes at 320, 360, 390, 768, 1024, 1440, and 1920 CSS pixels, including short landscape viewports and 200%/400% reflow. Supplement axe checks with keyboard and touch interactions. Record measured performance and browser limitations accurately; automated checks do not establish complete WCAG conformance.

## Git and pull requests

Preserve existing user changes. Inspect the working tree before editing and review the final diff for accidental modifications. Use a separate branch and target `main` for requested pull requests. Include a concise description of the resulting behavior and the checks performed. Do not commit temporary files, build output, or local configuration containing secrets.
