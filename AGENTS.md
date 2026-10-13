# Repository development instructions

## Purpose and scope

FORGE — Visual Universe is a premium cinematic portfolio for AI filmmaking and digital art. The current foundation covers the design system, responsive navigation, shared layouts, and the Home, Work, About, and Contact routes.

Keep work scoped to the requested change. Do not introduce video functionality, advanced gallery interactions, backend services, or invented project and contact information without an explicit request.

## Environment and commands

- Work in the existing checkout. Cloud tasks already have an isolated environment; do not create a Git worktree unless the user explicitly requests one.
- Use the Node 22 version pinned in `.node-version` and npm with the committed `package-lock.json`.
- Install dependencies with `npm ci` for repeatable setup. Change dependency declarations and the lockfile together only when the task requires a dependency change.
- Start development with `npm run dev -- --host 0.0.0.0`; the default port is `4321`.
- Run `npm run check` and `npm run build` before completing a change or opening a pull request. Resolve new diagnostics and build failures.
- Preview production output with `npm run preview -- --host 0.0.0.0` after a successful build.

No credentials or environment secrets are required for the current site. Do not commit credentials or generated output such as `dist/`, `.astro/`, or `node_modules/`.

## Architecture

- Use Astro and strict TypeScript. Keep the default output static and Cloudflare Pages compatible; an adapter is unnecessary for static rendering.
- Use Tailwind CSS 4 through `@tailwindcss/vite`. Define shared visual tokens in the global stylesheet rather than scattering unrelated color values throughout components.
- Keep page routes in `src/pages/`, shared page layouts in `src/layouts/`, and reusable interface elements in `src/components/`.
- Keep shared site metadata and contact configuration in `src/data/site.ts`. Never invent an email address, social account, client, award, or project credit.
- Prefer local assets and self-hosted fonts. Preserve the Cormorant Garamond and Manrope typography and the obsidian, graphite, ivory, and muted bronze palette unless the task changes the design direction.
- Prefer semantic HTML and Astro components. Add client JavaScript only when a requested interaction requires it.

## Interface quality

- Preserve the restrained cinematic identity: generous spacing, clear hierarchy, quiet accents, and deliberate typography.
- Build responsive layouts that work on narrow mobile screens and wide displays without horizontal overflow.
- Maintain keyboard navigation, visible focus indicators, meaningful link labels, accessible form controls, and adequate text contrast.
- Respect `prefers-reduced-motion`; decorative motion must remain optional. Do not add autoplay media.
- Label placeholder content accurately and provide appropriate alternative text for meaningful images. Mark purely decorative artwork as decorative.
- Check the relevant routes and navigation at desktop and mobile widths after visual changes.

## Git and pull requests

Preserve existing user changes. Inspect the working tree before editing and review the final diff for accidental modifications. Include a concise description of the resulting behavior and the checks performed in pull requests. Do not commit temporary files, build output, or local configuration containing secrets.
