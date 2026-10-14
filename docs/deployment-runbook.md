# Deployment runbook

FORGE uses the existing **Cloudflare Worker `forge-portfolio`**, connected to `forgetopia/forge-portfolio` through GitHub. `main` is the production branch. The verified production URL is **https://forge-portfolio.digivism9.workers.dev**.

The application is an Astro 7 static site. `npm run build` creates `dist/`; no Astro adapter, database, server rendering, or Worker JavaScript entry point is needed. Keep `wrangler.jsonc` unchanged: Worker name `forge-portfolio`, compatibility date `2026-10-06`, assets directory `./dist`, and `previews: {}`. Do not create another Worker or Cloudflare Pages project.

## Branch and pull request workflow

1. Fetch the latest `main`, inspect `AGENTS.md`, and check for uncommitted user changes before starting a focused branch. PR 06 uses `pr06-final-qa-launch`.
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
- Canonical/Open Graph/sitemap URLs that retain the verified **production** origin rather than the preview origin.

Record the tested commit, check/build link, generated preview address, outcome, and any failures in the PR or [final QA report](final-qa-report.md). A successful packaging dry run is not proof that the authenticated preview deployed or that its pages function.

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
