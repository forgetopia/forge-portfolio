# Repository development instructions

## Purpose and scope

FORGE — Visual Universe is a premium cinematic portfolio for AI filmmaking and digital art. The site includes a shared design system, responsive navigation, validated portfolio content, category filtering, featured homepage projects, and static project detail routes.

Keep work scoped to the requested change. Do not introduce video hover previews, fullscreen lightboxes, backend services, or invented artwork, credits, and contact information without an explicit request.

## Environment and commands

- Work in the existing checkout. Cloud tasks already have an isolated environment; do not create a Git worktree unless the user explicitly requests one.
- Use the Node 22 version pinned in `.node-version` and npm with the committed `package-lock.json`.
- Install dependencies with `npm ci` for repeatable setup. Change dependency declarations and the lockfile together only when the task requires a dependency change.
- Start development with `npm run dev -- --host 0.0.0.0`; the default port is `4321`.
- Run `npm run check` and `npm run build` before completing a change or opening a pull request. Resolve new diagnostics and build failures.
- Run `npm run test:unit` for content and schema changes. After a production build, run `npm run test:e2e` for gallery, route, navigation, or visual changes. See the README for browser installation and the optional local Chromium executable override.
- Preview production output with `npm run preview -- --host 0.0.0.0` after a successful build.

No credentials or environment secrets are required for the current site. Do not commit credentials or generated output such as `dist/`, `.astro/`, or `node_modules/`.

## Architecture

- Use Astro and strict TypeScript. Keep `output: 'static'` and the existing Cloudflare Workers deployment compatible. The build output remains `dist/`; an adapter is unnecessary for static assets. Do not change or add deployment configuration unless the requested task requires it.
- Use Tailwind CSS 4 through `@tailwindcss/vite`. Define shared visual tokens in the global stylesheet rather than scattering unrelated color values throughout components.
- Keep page routes in `src/pages/`, shared page layouts in `src/layouts/`, and reusable interface elements in `src/components/`.
- Keep shared site metadata and contact configuration in `src/data/site.ts`. Never invent an email address, social account, client, award, or project credit.
- Author portfolio records as JSON in `src/content/projects/`. Keep the Astro collection in `src/content.config.ts`, its shared TypeScript schema in `src/lib/project-schema.ts`, and content queries in `src/lib/projects.ts`. Validate new records against the schema and keep each file name equal to its unique kebab-case slug.
- Use the defined category IDs. Preserve accurate `sample` and `cover.placeholder` values until the user supplies real project content and artwork. Label demonstration projects and placeholder media in cards and detail pages; do not imply they are completed original work.
- Keep featured selection and project order in content metadata. Use the reusable project card for both landscape and portrait media, and generate `/work/[slug]/` routes through Astro static paths.
- Prefer local assets and self-hosted fonts. Preserve the Cormorant Garamond and Manrope typography and the obsidian, graphite, ivory, and muted bronze palette unless the task changes the design direction.
- Prefer semantic HTML and Astro components. Add client JavaScript only when a requested interaction requires it.

## Interface quality

- Preserve the restrained cinematic identity: generous spacing, clear hierarchy, quiet accents, and deliberate typography.
- Build responsive layouts that work on narrow mobile screens and wide displays without horizontal overflow.
- Maintain keyboard navigation, visible focus indicators, meaningful link labels, accessible form controls, and adequate text contrast.
- Respect `prefers-reduced-motion`; decorative motion must remain optional. Do not add autoplay media.
- Keep the portfolio grid useful without client JavaScript. Filters must use accessible buttons, indicate the selected category, announce result changes, and provide a useful empty state.
- Label placeholder content accurately and provide appropriate alternative text for meaningful images. Mark purely decorative artwork as decorative.
- Check the relevant routes and navigation at desktop and mobile widths after visual changes.

## Git and pull requests

Preserve existing user changes. Inspect the working tree before editing and review the final diff for accidental modifications. Use a separate branch and target `main` for requested pull requests. Include a concise description of the resulting behavior and the checks performed. Do not commit temporary files, build output, or local configuration containing secrets.
