# Launch checklist

FORGE already runs at **https://forge-portfolio.digivism9.workers.dev** through the existing Cloudflare Workers GitHub integration. This checklist covers a reviewed update to that site, not a new hosting project.

**Content readiness: INCOMPLETE.** The five demonstration projects, labeled images, and generated test-pattern clips remain intentionally visible. Creator details, public contact information, and original portfolio media have not been supplied. A technically sound release does not establish a complete professional portfolio.

Use the [final QA report](final-qa-report.md) for measured results, browser coverage, defects, and the final technical readiness decision. Mark a validation gate complete only when the report or the current pull request provides evidence for the exact commit being reviewed.

## Technical release readiness

**Technical readiness: PASS for the current placeholder site.** Local checks, production smoke, and all 70 applicable hosted-preview application browser tests pass. Current-head CI/Workers Preview results belong in the pull request checks; require them to remain green before owner-approved merge. The observed Range limitation keeps larger-film delivery readiness incomplete.

- [x] Existing architecture remains Astro 7 static output, strict TypeScript, and Tailwind CSS 4.
- [x] The verified production origin is configured in `src/data/site.ts`; no preview hostname is configured as canonical.
- [x] `wrangler.jsonc` identifies `forge-portfolio`, `./dist`, compatibility date `2026-10-06`, and top-level `previews: {}`.
- [x] External media origins remain unconfigured; local media and explicit placeholder labels are supported.
- [x] Clean dependency installation succeeds with the committed lockfile and pinned Node version.
- [x] `npm run check`, `npm run test:unit`, `npm run build`, and `npm run test:e2e` pass without weakening existing assertions.
- [x] `npx wrangler deploy --dry-run` packages the generated static assets successfully.
- [x] All public routes, direct project links, internal navigation, public assets, and missing-route behavior pass the local production-build/runtime functional audit. Hosted HTTP verification is a separate gate below.
- [x] Publication tests confirm drafts stay out of generated routes, grids, featured works, adjacent navigation, metadata, and sitemap.
- [x] Hero controls, lazy hover previews, project playback, captions/transcripts when configured, and lightbox interactions pass their targeted checks.
- [x] Reduced motion, data saving, touch devices, media failure, and supported no-JavaScript fallbacks remain usable.
- [x] Responsive and accessibility checks cover the requested seven widths, portrait/landscape, keyboard navigation, focus management, text spacing, and zoom/reflow equivalents.
- [x] Chromium and mobile emulation pass; Firefox/WebKit results or installation limitations are recorded accurately.
- [x] Mobile and desktop Lighthouse measurements cover the six representative routes. Any unmet targets are explained; synthetic audits do not claim field INP.
- [x] Security review covers dependency advisories, accidental secrets, safe links/media protocols, HTML escaping, and the exact-origin media policy.

## Content readiness

- [ ] Owner approves creator name, professional title, studio name if used, biography, and optional profile image.
- [ ] Owner approves actual services, capabilities, creative focus areas, collaboration introduction, and current availability.
- [ ] Every real project has factual descriptions, categories, production details, creative direction, workflow, and verified credits.
- [ ] Owner confirms rights and permission to publish the supplied artwork, films, likenesses, soundtrack, and credited work.
- [ ] New projects remain explicit drafts until content and media review is complete. Publication status is changed through a reviewed content pull request.
- [x] Existing demonstration projects remain honestly labeled; missing facts are not replaced with invented details.

Draft status controls generated pages. Files committed under `public/` remain publicly deliverable; do not use draft status to protect confidential assets or personal information.

## Contact readiness

- [ ] A verified public email address is approved and tested with the encoded `mailto:` subject.
- [ ] Any public social/profile links are approved, correct HTTPS URLs, and verified on the intended destination.
- [ ] Availability and services match the owner's current practice.
- [x] Unconfigured email and social links stay absent; the fallback remains visible instead of publishing fabricated contact details.

An intentionally omitted contact method is valid technically. It remains an outstanding owner decision for a professional launch.

## Media readiness

- [ ] Approved cover images, project stills, and optional creator image replace the relevant labeled placeholders.
- [ ] Approved showreel, poster, and main project films are supplied as web-ready exports with actual dimensions and orientation.
- [ ] Each real video card has a separate short muted hover clip; it does not download a full film on hover.
- [ ] Audio metadata is accurate, caption tracks are synchronized, and meaningful transcripts/visual descriptions are reviewed.
- [ ] Image alt text and still captions describe the supplied assets; portrait/landscape aspect ratios remain intact.
- [ ] Actual media startup, seeking, captions, error recovery, and mobile transfer cost are tested after replacement.
- [ ] Suitable partial video delivery is verified before larger films are published. Current production MP4s return full `200` responses to Range requests; the small placeholder clips play/seek in Chromium, but this does not establish large-film delivery readiness.
- [x] No CDN provider or external media URL is assumed. The allowlist stays empty until approval.
- [ ] If remote media is chosen, owner approves the exact HTTPS origins and direct asset URLs; MIME types, anonymous CORS, and video byte-range responses are verified.

## SEO readiness

- [x] Titles, descriptions, canonicals, Open Graph metadata, and sitemap locations are verified against the production origin on every public route.
- [x] Public indexing behavior and any robots directives match the owner's intent; changes are identified for review.
- [x] Sitemap contains only core routes and public projects, with no drafts or branch-preview URLs.
- [ ] Approved raster sharing images are supplied and checked on intended social platforms. Current SVG placeholders may not produce thumbnails there.
- [ ] A future domain change is owner-approved before canonical origin, DNS, or domain configuration changes.

## Deployment verification and release gate

- [x] Implementation commit `0b0bcf3` passed GitHub CI. Require the latest head to remain green in [PR #6 checks](https://github.com/forgetopia/forge-portfolio/pull/6/checks), including documentation updates.
- [x] The same implementation commit passed the existing Workers Preview build/deployment. Require the latest head's check to remain green; its generated preview HTTP smoke is separate below.
- [x] Actual generated-preview HTTP checks and all 70 applicable application browser regressions pass, including the new focus ring, routes/media, accessibility, responsive behavior, and production-origin metadata. The local fixture-server Range-handler test remains passing in the full local/CI suite; real Workers Range limitations are recorded separately.
- [ ] Reviewer inspects the final diff and QA limitations; the repository, production branch, integration, credentials, DNS, and domains are unchanged.
- [ ] Owner/reviewer chooses whether to merge the technical update while content remains incomplete.
- [ ] After an authorized merge to `main`, the existing automatic production build is verified against the merged commit and the live HTTPS site is smoke tested.
- [x] Merged main commit `65019a0` and its successful CI/production build are recorded in the QA report as the pre-PR-06 baseline; identify the actual serving deployment again before any rollback.

PR 06 must remain unmerged until reviewed. Do not manually deploy production, publish new portfolio content, change DNS, or invent approvals to complete this checklist. Follow the [deployment runbook](deployment-runbook.md) and [content launch handoff](content-launch-handoff.md).
