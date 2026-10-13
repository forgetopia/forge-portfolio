# Repository development instructions

## Purpose and scope

FORGE — Visual Universe is a premium cinematic portfolio for AI filmmaking and digital art. The site includes a shared design system, responsive navigation, validated portfolio content, category filtering, featured homepage projects, a cinematic hero, lazy card previews, and static project viewers with video and fullscreen still galleries.

Keep work scoped to the requested change. Do not introduce backend services or invent artwork, footage, credits, and contact information. The demonstration media must remain clearly identified as placeholders until approved assets are supplied.

## Environment and commands

- Work in the existing checkout. Cloud tasks already have an isolated environment; do not create a Git worktree unless the user explicitly requests one.
- Use the Node 22 version pinned in `.node-version` and npm with the committed `package-lock.json`.
- Install dependencies with `npm ci` for repeatable setup. Change dependency declarations and the lockfile together only when the task requires a dependency change.
- Start development with `npm run dev -- --host 0.0.0.0`; the default port is `4321`.
- Run `npm run check` and `npm run build` before completing a change or opening a pull request. Resolve new diagnostics and build failures.
- Run `npm run test:unit` for content and schema changes. After a production build, run `npm run test:e2e` for gallery, media, route, navigation, or visual changes. See the README for browser installation and the optional local Chromium executable override.
- Preview production output with `npm run preview -- --host 0.0.0.0` after a successful build.

No credentials or environment secrets are required for the current site. Do not commit credentials or generated output such as `dist/`, `.astro/`, or `node_modules/`.

## Architecture

- Use Astro and strict TypeScript. Keep `output: 'static'` and the existing Cloudflare Workers deployment compatible. The build output remains `dist/`; an adapter is unnecessary for static assets. Preserve `wrangler.jsonc`, including the `forge-portfolio` name, static asset directory, compatibility date, and top-level `previews: {}`. Do not change deployment configuration or the pinned Wrangler version unless the requested task requires it.
- Use Tailwind CSS 4 through `@tailwindcss/vite`. Define shared visual tokens in the global stylesheet rather than scattering unrelated color values throughout components.
- Keep page routes in `src/pages/`, shared page layouts in `src/layouts/`, and reusable interface elements in `src/components/`.
- Keep shared site metadata and contact configuration in `src/data/site.ts`. Never invent an email address, social account, client, award, or project credit.
- Author portfolio records as JSON in `src/content/projects/`. Keep the Astro collection in `src/content.config.ts`, its shared TypeScript schema in `src/lib/project-schema.ts`, and content queries in `src/lib/projects.ts`. Validate new records against the schema and keep each file name equal to its unique kebab-case slug.
- Use the defined category IDs. Preserve accurate `sample` and media `placeholder` values until the user supplies real project content and artwork. Label demonstration projects and placeholder media in cards and detail pages; do not imply they are completed original work.
- Keep featured selection and project order in content metadata. Use the reusable project card for both landscape and portrait media, and generate `/work/[slug]/` routes through Astro static paths.
- Configure the hero in `src/data/showreel.ts`. Keep project `video`, `previewVideo`, `synopsis`, `creativeDirection`, `credits`, and `stills` in collection records; preserve records without those optional media fields.
- Use local video assets in `public/media/` with accurate MIME type, positive dimensions, orientation, placeholder status, and audio metadata. Audio-bearing videos require local WebVTT caption tracks; provide meaningful visual descriptions and transcripts where applicable. Never put unverified credits in sample records.
- The committed placeholder MP4s are explicitly labeled generated test patterns. Regenerate them only when needed using `bash scripts/generate-placeholder-media.sh` with FFmpeg and a supported local font. FFmpeg is an optional authoring tool, not a dependency of installation or production builds.
- Prefer local assets and self-hosted fonts. Preserve the Cormorant Garamond and Manrope typography and the obsidian, graphite, ivory, and muted bronze palette unless the task changes the design direction.
- Prefer semantic HTML and Astro components. Add client JavaScript only when a requested interaction requires it.

## Interface quality

- Preserve the restrained cinematic identity: generous spacing, clear hierarchy, quiet accents, and deliberate typography.
- Build responsive layouts that work on narrow mobile screens and wide displays without horizontal overflow.
- Maintain keyboard navigation, visible focus indicators, meaningful link labels, accessible form controls, and adequate text contrast.
- Respect `prefers-reduced-motion` and data-saving preferences. Keep hero autoplay disabled by default. An explicit configuration opt-in may autoplay only while muted and after checking reduced motion, data saving, and an eligible desktop pointer; never automatically enable audio. Always preserve manual playback and accessible controls.
- Load card previews only on eligible desktop mouse hover. Keep posters on touch devices and for reduced-motion or data-saving users; allow only one active preview. Pause, reset, and release sources when a preview ends, its card becomes hidden, it leaves the viewport, or the page becomes hidden. Never preload all gallery videos.
- Preserve posters and graceful loading/playback error handling. Project videos use native controls and visitor-initiated playback. Keep useful native or link fallbacks when JavaScript is unavailable.
- Preserve landscape and portrait media aspect ratios. Still-image dialogs must support previous/next controls, keyboard arrows, Escape, focus trapping, focus restoration, touch-friendly controls, and accessible captions. Pause background media when opening an immersive viewer.
- Keep the portfolio grid useful without client JavaScript. Filters must use accessible buttons, indicate the selected category, announce result changes, and provide a useful empty state.
- Label placeholder content accurately and provide appropriate alternative text for meaningful images. Mark purely decorative artwork as decorative.
- Check the relevant routes and navigation at desktop and mobile widths after visual changes.

## Git and pull requests

Preserve existing user changes. Inspect the working tree before editing and review the final diff for accidental modifications. Use a separate branch and target `main` for requested pull requests. Include a concise description of the resulting behavior and the checks performed. Do not commit temporary files, build output, or local configuration containing secrets.
