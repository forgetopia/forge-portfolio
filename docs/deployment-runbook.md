# Deployment runbook

FORGE uses the existing **Cloudflare Worker `forge-portfolio`**, connected to `forgetopia/forge-portfolio` through GitHub. `main` is the production branch. The verified production URL is **https://forge-portfolio.digivism9.workers.dev**. The same source supports a separate GitHub Pages user-site build for the approved root origin **https://forgetopia.github.io**; Pages provisioning and publication are not configured by this change.

The application is an Astro 7 static site. `npm run build` creates `dist/`; no Astro adapter, database, server rendering, or Worker JavaScript entry point is needed. Keep `wrangler.jsonc` unchanged: Worker name `forge-portfolio`, compatibility date `2026-10-06`, assets directory `./dist`, and `previews: {}`. Do not create another Worker or Cloudflare Pages project.

## Branch and pull request workflow

1. Fetch the latest `main`, inspect `AGENTS.md`, and check for uncommitted user changes before starting a focused branch.
2. Make only reviewed code, documentation, or approved content changes. Do not commit `dist/`, caches, dependencies, credentials, private draft assets, or local configuration.
3. Use the Node version pinned in `.node-version` and run the release validation sequence:

   ```sh
   npm ci
   npm run check
   npm run test:unit
   npm run build
   npm run test:e2e
   npx wrangler deploy --dry-run
   ```

   Chromium setup and optional browser selection are documented in the [README](../README.md). A dry run validates packaging without publishing.

4. Review the full diff, push the branch, and open a pull request targeting `main`. Include test evidence, discovered/fixed defects, remaining limitations, and content readiness. Keep owner approvals separate from technical validation.
5. Wait for GitHub CI and the connected Cloudflare Workers Preview build for the **latest head commit**, including any fixes pushed after an earlier successful run. A passing check on an older commit does not approve a newer one.
6. Obtain repository/owner review. Do not automatically merge or manually publish production as part of QA.

## Build for the intended host

`FORGE_SITE_ORIGIN` is an optional build-time environment variable. It is public configuration, not a credential. An absent variable defaults to `https://forge-portfolio.digivism9.workers.dev`; use `https://forgetopia.github.io` for the separate GitHub Pages artifact. The override must be a safe HTTPS origin without credentials, a path, query, or fragment. A trailing slash is normalized. An empty override or an invalid URL fails validation instead of silently changing the canonical site.

The selected origin is written into canonical URLs, Open Graph URLs, absolute social image URLs for local covers, and sitemap entries. It does not rewrite local media, routes, fonts, or generated asset paths. Both deployments require root hosting at `/`; do not add an Astro `/forge-portfolio/` base. Host selection does not modify content, the media CDN allowlist, or YouTube iframe trust.

```sh
# Ensure there is no local .env origin override, then build the Cloudflare artifact.
env -u FORGE_SITE_ORIGIN npm run build
npx wrangler deploy --dry-run

# Build a separate artifact for the GitHub Pages user site.
FORGE_SITE_ORIGIN=https://forgetopia.github.io npm run build
```

Every build replaces `dist/`. Archive or publish a reviewed artifact before building for the other host, and label artifacts with their origin and source commit. A runtime setting cannot correct SEO URLs in an already-generated artifact. Rebuild with the Cloudflare default before running any Workers publishing command after a Pages build. Keep `FORGE_SITE_ORIGIN` absent in the connected Cloudflare build; its default behavior and working deployment settings do not need to change.

Run `npm run check`, `npm run test:unit`, `npm run build`, and `npm run test:e2e` as part of the normal validation. For host-specific changes, inspect both generated artifacts and run browser regressions against each with the matching origin setting, for example:

```sh
FORGE_SITE_ORIGIN=https://forgetopia.github.io npm run build
FORGE_SITE_ORIGIN=https://forgetopia.github.io npm run test:e2e

# Restore and verify the Cloudflare artifact before packaging.
env -u FORGE_SITE_ORIGIN npm run build
env -u FORGE_SITE_ORIGIN npm run test:e2e
npx wrangler deploy --dry-run
```

Compare homepage and project canonical/Open Graph URLs, sitemap entries, and local social image URLs with the intended origin. Confirm only public projects are present. Inspect root-relative navigation and image/video/font/script requests, including a direct `/work/<slug>/` request.

## GitHub Pages user site

The approved URL is **https://forgetopia.github.io/**. Enabling ordinary project Pages for `forgetopia/forge-portfolio` would normally serve `/forge-portfolio/`, which does not match the required root URL. An authorized owner must publish the prepared `dist/` through the **`forgetopia/forgetopia.github.io` user-site repository** or another approved Pages configuration serving this exact root origin. Do not compensate by changing this site's base path. This preparation does not create that repository, select Pages settings, add a publishing workflow, or trigger a deployment.

For an approved Pages release:

1. Build the reviewed source commit with `FORGE_SITE_ORIGIN=https://forgetopia.github.io` and the pinned Node/npm dependencies. Retain the commit and build origin with the artifact.
2. Publish the **contents of `dist/`** as the website root. With GitHub Actions Pages publishing, upload `dist/` using `actions/upload-pages-artifact` and deploy that artifact using the Pages deployment action in the authorized user-site repository. This serves the generated output directly without Jekyll processing.
3. If branch-based publishing is selected instead, add an empty `.nojekyll` file to the published root alongside `index.html`. Jekyll can otherwise omit the generated `/_astro/` directory. Do not copy build output or add deployment credentials to this source repository.
4. After deployment, verify `https://forgetopia.github.io/`, core routes, project deep links, `/sitemap.xml`, `/_astro/` CSS/JavaScript/fonts, posters, MP4/WebM and caption files. Test keyboard/touch navigation, filters, native playback, and the still-image lightbox. When an owner-approved YouTube film is configured, test click-to-load playback and its persistent watch fallback as well.
5. Inspect HTML and sitemap SEO URLs for the GitHub Pages origin, and confirm no `/forge-portfolio/` prefix appears in routes or asset requests. Test unknown routes for a genuine `404`; Pages may provide its own error body rather than Cloudflare's current response.
6. Smoke test the existing Cloudflare production site separately. The Pages publication must not change or replace the existing Worker, its integration, Wrangler configuration, or canonical origin in its own artifact.

GitHub Pages has its own authenticated deployment and hosting behavior; a local build and Wrangler dry run do not verify a Pages deployment. Record hosted results only after the authorized Pages setup is actually published. Keep the two deployment artifacts and their rollback procedures separate; the existing Cloudflare process below remains in place.

## Verify the Workers Preview

Open the Cloudflare Workers check attached to the pull request. Its details link identifies the branch preview build in the existing Worker service; use that generated preview address rather than guessing a hostname. Inspect both the build and deployment phases.

The connected platform performs the build and authenticated preview deployment. `npx wrangler preview` requires the existing top-level `previews` block and Cloudflare authentication; it is a remote deployment command, not a dry run. Use the connected build rather than setting up credentials or a second preview project in a QA environment. `npm run preview -- --host 0.0.0.0` is an unrelated **local** Astro server for the already-built `dist/`.

Check the preview for:

- Homepage, `/work/`, `/about/`, `/contact/`, all public `/work/<slug>/` pages, and `/sitemap.xml`.
- Direct deep links, internal navigation, filters, featured selection, and previous/next project links.
- Missing-route behavior with a genuine HTTP `404`, rather than an unrelated successful fallback page.
- Local poster images, fonts, stills, video and caption files; appropriate response MIME types and video seeking/range behavior where supported.
- Hero play/pause and mute, one eligible desktop hover preview at a time, touch/reduced-motion/data-saving posters, project playback, and lightbox keyboard/focus behavior.
- Correct sample/placeholder labeling and absent unconfigured contact links.
- Canonical/Open Graph/absolute local social image/sitemap URLs that retain the verified **Cloudflare production** origin rather than the preview or GitHub Pages origin.

Record the tested commit, check/build link, generated preview address, outcome, and any failures in the PR or [final QA report](final-qa-report.md). A successful packaging dry run is not proof that the authenticated preview deployed or that its pages function.

The PR 06 production follow-up confirms the current MP4s return full `200` bodies to Range requests. Small placeholder playback/seek works in Chromium; do not record `206` partial delivery as passed. Validate suitable range delivery before publishing larger films, using approved hosting and the existing secure media policy. Default missing routes return a genuine `404` with an empty body; a branded recovery page would need a separate reviewed asset-handling configuration change.

## Merge and automatic production deployment

An authorized reviewer may merge only after the current commit passes required checks and documented limitations are accepted. An approved merge to `main` lets the **existing GitHub integration** build and deploy production automatically; do not run a separate manual production command.

After that merge:

1. Identify the resulting commit on `main`; a squash/merge commit may differ from the branch head.
2. Verify GitHub CI and the Cloudflare production build/deployment for that exact main commit. A successful branch preview does not verify production.
3. Open the existing Worker in Cloudflare and confirm the successful production build is the one serving the live site. Record its commit/build identifier and time, without copying credentials.
4. Perform the production smoke tests below over the verified HTTPS origin.
5. Keep the previously successful production build and Git commit identifiable for rollback.

`npx wrangler deploy` is an authenticated production publishing action. It remains compatible with this repository, but **do not execute it without explicit approval**. QA does not authorize credential, integration, DNS, custom-domain, or indexing-policy changes.

## Cloudflare build-log troubleshooting

Start from the failing GitHub Cloudflare check's details link, or the existing `forge-portfolio` service in Cloudflare's Workers dashboard. Select the relevant build for the branch and commit. Distinguish **branch Preview** from **production on `main`** before acting. Open the full build/deployment log; GitHub may show only a failed check without the underlying error text.

| Symptom | Investigation and targeted action |
| --- | --- |
| Dependency installation fails | Check the pinned Node version, lockfile consistency, registry/network error, and exact failing install command. Reproduce with `npm ci`; do not regenerate the lockfile without a necessary dependency change. |
| Astro sync/check/build fails | Inspect the first diagnostic and file/record it names. Validate project slug/filename identity, publication schema, media metadata, site configuration, and supported Node version. Invalid drafts still require valid metadata. |
| Astro succeeds but deployment cannot find assets | Confirm the connected build ran `npm run build` in the repository root and emitted `dist/` before deployment. Preserve `assets.directory: "./dist"`; do not add an adapter or another service. |
| Preview says the Wrangler configuration lacks `previews` | Confirm the correct repository/commit/configuration was used and `wrangler.jsonc` still has top-level `"previews": {}`. Keep the pinned compatible Wrangler version; do not remove the block for production. |
| Authentication or permission failure | Inspect the existing GitHub/Cloudflare integration permissions in the dashboard with an authorized owner. Do not commit tokens, recreate the Worker, or expose log secrets. |
| Build passes but route/media behavior fails | Inspect the actual deployed response, status, MIME type, URL, browser console/network request, and build commit. Compare the same production build locally and add a targeted regression test for the verified defect. |
| Approved remote video/captions fail | Check exact allowlisted origin, direct URL, anonymous CORS, MIME type, codec support, and range responses. Do not weaken URL validation or silently select another provider. |

If local checks pass and Cloudflare still fails, obtain the exact failing command and sanitized error from the Cloudflare log before changing deployment configuration. Avoid repeated speculative production deployments. Never paste access tokens, secrets, or private account data into an issue or committed QA report.

## Restore a known-good deployment

The safest repository-consistent rollback is a **reviewed revert pull request** through the same GitHub integration:

1. Identify the first bad production commit and the last known-good production build/commit. Confirm the issue actually affects production; a failing preview alone does not require production rollback.
2. Create a rollback branch from current `main`. Preserve newer unrelated changes; do not reset/force-push `main` or edit Cloudflare configuration to point at a different project.
3. Revert the offending commit(s). A normal or squash commit uses `git revert <commit>`; an actual merge commit requires an explicitly reviewed mainline selection, usually `git revert -m 1 <merge-commit>`. Inspect history before choosing. For multiple commits, review the resulting diff so dependent changes are handled correctly.
4. Run the required checks, open a clearly described rollback PR, and verify its CI and Workers Preview.
5. Have an authorized reviewer merge that PR. The existing automatic production integration deploys the revert; verify its main commit, build, and live smoke tests.

If an urgent incident requires restoring a previous successful Worker deployment directly, an **explicitly authorized owner** may use the existing Worker's dashboard deployment/history controls when available. Confirm the target deployment, preserve assets/configuration, record what was restored, and smoke test afterward. Do not perform a dashboard restoration during routine QA or invent a deployment ID. Reconcile the restoration with a reviewed repository revert so a later automatic merge does not redeploy the defect.

Rollback must never introduce guessed contact details, unapproved artwork, a different canonical origin, or unapproved CDN hosts.

## Post-deployment smoke test

Use the actual deployed site, not a workspace development server:

1. Load `https://forge-portfolio.digivism9.workers.dev/` over HTTPS and confirm certificate/browser security and the expected release content.
2. Open `/work/`, `/about/`, `/contact/`, `/sitemap.xml`, and each public project directly. Check any intentional redirects end at the correct route and unexpected paths return `404`.
3. Check visible navigation, mobile menu, filters, featured works, project adjacency, and missing contact fallbacks. Keep samples and placeholders labeled.
4. Test hero/manual project playback, posters, controls, still-image lightbox, keyboard focus/restoration, and reduced motion/mobile behavior. Verify media errors retain a useful fallback.
5. Confirm fonts/images/stills/videos/captions load, response MIME types are correct, and seeking works. Observe cache headers/transfer behavior rather than assuming a cache policy.
6. Inspect page source for unique titles/descriptions and production-origin canonical/social metadata. Confirm sitemap contains no drafts or preview URLs.
7. Record build/commit and result. Escalate verified regressions with the sanitized failure and use the rollback procedure where appropriate.

Real-media delivery and field performance need fresh validation once original assets are supplied. The placeholder audit does not certify future footage, CDN availability, or real-user Core Web Vitals.
