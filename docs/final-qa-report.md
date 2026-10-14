# Final QA report — PR 06

Audit date: **2026-10-13**. Baseline: merged PR 05 on `main`, commit `65019a02334a8a5bfbccc348f2ef5057a797a8ed`. Branch: `pr06-final-qa-launch`.

**Repository validation: PASS. Content readiness: INCOMPLETE. Hosted release verification: BLOCKED by environment network access.** Local validation supports review of the technical update. Complete the hosted preview smoke test in the [deployment runbook](deployment-runbook.md) before declaring every technical release gate passed. A successful Workers build establishes deployment success, not its HTTP or interactive behavior.

The existing production site is **https://forge-portfolio.digivism9.workers.dev**. Its URL remains canonical; no media CDN origins are approved. PR 06 does not merge, publish new portfolio content, deploy production manually, change DNS, or create another hosting project.

## Environment and reproducibility

- Linux cloud workspace; pinned Node **22.23.3**, npm **11.9.0**.
- Astro **7.3.8**, strict TypeScript **5.9.3**, Tailwind **4.3.3**, Wrangler **4.149.0**; dependency declarations and lockfile unchanged.
- Playwright **1.64.0**, axe **4.13.0**, system Chromium **154.0.8037.57** with real H.264 decoding.
- Browser tests run against `dist/` through `tests/static-server.mjs`, two workers, no local retries. That server supplies no-store, uncompressed responses and supports byte ranges; it is not Cloudflare's edge server.
- Separate local Wrangler asset-runtime checks used the existing `wrangler.jsonc`. HTTPS production requests encountered proxy `CONNECT 403` before reaching the Worker.
- Lighthouse **13.0.1** is an external audit tool, not a new application dependency. See [performance evidence](pr06-performance.md) for exact throttling, route measurements, transfer sizes, and reproduction commands.

Required commands executed with the pinned runtime:

```sh
npm ci
npm run check
npm run test:unit
npm run build
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e
npx wrangler deploy --dry-run
```

The Chromium path selects the installed compatible browser for this workspace. CI uses Playwright's downloaded Chromium instead. Neither setting changes application code or deployment configuration.

## Automated validation

| Check | Final local result |
| --- | --- |
| Frozen-lockfile installation | PASS; 327 packages installed with `npm ci` |
| Astro/TypeScript diagnostics | PASS; 55 files, zero errors, warnings, or hints |
| Unit/content integration tests | PASS; **42/42**, no skips or disabled checks |
| Production build | PASS; nine HTML routes plus `/sitemap.xml` |
| Browser regressions | PASS; **71/71** in 60.0 seconds, including all 64 existing checks |
| Wrangler packaging | PASS; dry run reads 39 asset-directory entries; no remote publication |
| Dependency vulnerability review | PASS; `npm audit --json` reports zero known vulnerabilities in all severities |

Seven added browser regressions cover a visible native-video focus ring, runtime data saving, actual WebVTT cue decoding and keyboard transcript access, stalled-film retry, lightbox focus restoration without automatic playback, public-page/internal-link/media crawling, and intact public asset delivery with genuine missing-route status codes. Existing assertions remain intact.

Content-build fixtures verify that explicit drafts and unpublished nonsample records never reach public text assets, routes, featured works, adjacent navigation, metadata, or the sitemap. Invalid or conflicting draft records still fail validation. Configured identity/contact fixtures stay isolated in temporary builds; no test identity or account is published.

## Routes and functional audit

All nine public HTML routes were audited:

| Route | Role |
| --- | --- |
| `/` | Homepage, showreel, featured selection |
| `/work/` | Gallery, all eight filters, empty-category reset |
| `/work/the-long-night/` | Landscape project |
| `/work/the-last-rune-engine/` | Portrait-cover project with landscape film |
| `/work/dragon-resonance/` | Landscape project |
| `/work/isekai-live-action/` | Portrait-cover project with landscape film |
| `/work/surreal-universe/` | Portrait cover and portrait film |
| `/about/` | Optional identity and editorial workflow |
| `/contact/` | Unconfigured contact/availability fallback |

`/sitemap.xml` is well-formed XML with exactly these nine production-origin locations. Unknown page URLs, a nonexistent project slug, and a missing asset return HTTP `404`; they do not become successful homepage fallbacks. Published/sample direct links resolve. Header/footer/mobile navigation, featured ordering, previous/next projects, internal fragment targets, loaded images, and public asset bytes pass the final local regressions. No client-script errors were encountered during the route crawl.

The five sample records, local images, MP4s, and placeholder labels are unchanged. No contact email, social account, availability claim, creator credential, client, or original asset was invented. Optional profile and project fields remain covered by schema and actual static-build tests.

## Cinematic media

- Hero remains a poster until visitor playback by default. Play/pause, mute, blocked/failed/stalled playback recovery, and opted-in muted autoplay pass. Automatic motion stays off for reduced motion, touch, and data saving; preference changes pause active media. No unexpected audio occurs.
- Hover previews load only for eligible desktop pointers, one at a time. Pointer leave, filtering, viewport exit, hidden pages, preference changes, and failed/pending playback release or suppress them. Touch devices retain static posters.
- Project films retain native controls, correct sources, portrait/landscape containment, loading timeout/retry, and keyboard controls. WebVTT cues decode in Chromium; the configured transcript is keyboard accessible. The two five-second H.264 placeholder clips have no audio streams, matching their metadata.
- Lightbox open/close, wrapping previous/next, arrows/Escape, focus trap/restoration, touch controls, failure recovery, original image ratios, and background-video pause pass. Closing it does not resume a film automatically.
- Without JavaScript, native navigation/media and original still links remain useful. Real-film captions, audio, descriptive alternatives, codec coverage, and remote delivery still require supplied assets.

## Accessibility and responsiveness

WCAG **2.2 AA** is the target. All nine routes pass the existing axe mobile/desktop audits, including label-in-name checking, and the seven-width controls/overflow suite at **320, 360, 390, 768, 1024, 1440, and 1920 CSS pixels**. Media/lightbox audits also check enhanced and open-modal states.

Supplementary keyboard/semantic review covered every route at 390×900 portrait, 844×390 landscape, and 1440×900 desktop, plus every route with JavaScript disabled. Each page has one main landmark and one H1, no heading-level jumps, functioning skip navigation, usable native mobile disclosure, meaningful visible labels, and no horizontal overflow. Keyboard checks cover menu dismissal, filter focus recovery, native player focus, and modal focus trapping/restoration.

The existing reflow suite covers 640×400 and 320×200 CSS equivalents of a 1280×800 window at 200%/400%, short landscape lightboxes, custom text spacing, and fallback fonts. Actual browser chrome zoom, OS magnification, assistive-technology workflows, and physical devices remain manual coverage limitations.

Measured text token pairs exceed AA: ivory/obsidian **15.59:1**, bronze/obsidian **7.43:1**, muted/graphite **6.87:1**. Existing focus colors and visual tokens remain intact.

**Defect fixed:** the native video host is a keyboard stop before its shadow controls. Its global 2px outline with a +6px offset was clipped by the player's `overflow: hidden` frame. `src/styles/project-media.css` now gives only that host an inset `outline-offset: -4px`. Rebuilt visual review confirms the bronze ring is visible; the new regression checks keyboard focus and unclipped ring geometry for both film orientations at mobile and desktop sizes. Native control indicators and layout remain unchanged.

Chromium desktop/mobile emulation is tested. Separate official Playwright download attempts for Firefox 157.0 and WebKit 27.2 failed across their mirrors with HTTP `403 Domain forbidden`; **Firefox and WebKit are untested**. No browser or test assertion was substituted to claim coverage. Axe, synthetic keyboard checks, and token measurements do not establish complete WCAG conformance.

## Laboratory performance

Lighthouse ran three times per route and mode, **36 final audits**, after the focus fix and with the browser suite stopped. All runs completed without runtime errors; the table reports medians. Mobile uses 412×823 CSS pixels, DPR 1.75, simulated Slow 4G (150ms RTT, approximately 1.6Mbps), and 4× CPU slowdown. Desktop uses 1350×940, DPR 1, simulated Dense 4G (40ms RTT, 10Mbps), and 1× CPU. Responses are local and uncompressed, with no-store caching.

| Route | Mobile performance / accessibility | Mobile LCP | Mobile CLS | Desktop performance / accessibility | Desktop LCP | Desktop CLS |
| --- | --- | --- | --- | --- | --- | --- |
| `/` | 99 / 100 | 1.734s | 0.04642 | 100 / 100 | 0.455s | 0.00109 |
| `/work/` | 99 / 100 | 1.879s | 0.00076 | 100 / 100 | 0.448s | 0.00059 |
| `/work/the-long-night/` | 99 / 100 | 2.033s | 0.00010 | 100 / 100 | 0.446s | 0.00009 |
| `/work/the-last-rune-engine/` | 99 / 100 | 2.034s | 0.00010 | 100 / 100 | 0.445s | 0.00009 |
| `/about/` | 100 / 100 | 1.505s | 0.00010 | 100 / 100 | 0.365s | 0.00009 |
| `/contact/` | 100 / 100 | 1.354s | 0.00026 | 100 / 100 | 0.364s | 0.00143 |

All six routes meet the stated mobile performance ≥90, accessibility ≥95, LCP ≤2.5s, and CLS ≤0.1 targets. Initial navigation fetched no videos. Noncritical images remain lazy; covers/posters reserve their aspect ratios; videos retain `preload="none"`; the five emitted font files are self-hosted. Generated CSS totals 41,400 bytes, emitted fonts total 135,240 bytes, and there are no external JavaScript files. Inline JavaScript remains present; actual per-page transfers are detailed in the performance report. TBT is 0ms throughout.

Navigation Lighthouse measurements are laboratory observations, not field Core Web Vitals. TBT and responsiveness during navigation are not INP. No representative real-user interaction dataset is available; **field INP is unmeasured**. The small SVG/test-pattern media and local server do not predict performance after original assets or external delivery are introduced.

## SEO, security, and reliability

- Unique titles/descriptions, production-origin canonicals without tracking queries, Open Graph/Twitter metadata, project cover alt/dimensions, semantic headings, and the filtered sitemap pass. Preview URLs never become canonicals.
- Existing indexing is unchanged: no robots file or restrictive meta directive is introduced. Default crawl/index behavior remains. Choosing noindex for samples or a future custom domain is an owner decision.
- Current sharing assets remain truthful SVG placeholders. Some social platforms will require approved raster sharing images; their production thumbnail rendering is not certified.
- The exact HTTPS media-origin allowlist stays empty. Unsafe protocols, credentials, encoded local-path tricks, lookalike hosts, and unapproved origins fail existing tests. Safe external links and Astro-escaped author text remain intact; no untrusted HTML sink or third-party script was found.
- Dependency audit reports zero known advisories. A current tracked-file credential heuristic found no secrets; this is a scoped review, not a guarantee about all history or future content.
- No backend, contact endpoint, new runtime/framework dependency, secret requirement, or credential was added. Draft filtering protects generated portfolio exposure, not files intentionally committed in `public/` or Git history.

Local Wrangler runtime separately served all **27 built files** with byte-identical content, correct HTML/XML/SVG/MP4/VTT MIME types, trailing-slash `307` redirects for tested deep links, and ETag conditional `304` responses. Chromium played landscape and portrait films, filtered the gallery, and opened the modal with background playback paused. These runtime observations used the unchanged asset configuration; final browser/build/packaging checks were repeated after the focus fix.

Two platform limitations are deliberately recorded:

1. Unconfigured Workers missing-route handling returns a true `404` with an empty body and no recovery navigation. Serving a branded recovery page would require a separate reviewed asset-handling configuration change. PR 06 preserves Wrangler as requested.
2. The local Workers emulator returned full `200` responses to byte-range requests. Cold landscape seeking was unavailable, while repeat cached seeking worked. The separate browser-test server supports `206`, but that does not certify Cloudflare's edge range/seek behavior. Verify actual hosted media delivery before declaring that gate passed or replacing clips with larger films.

## Deployment evidence and release decision

The existing merged-main commit `65019a0` has successful [GitHub CI](https://github.com/forgetopia/forge-portfolio/actions/runs/38371173262/job/115208248834) and [Workers production build](https://dash.cloudflare.com/06c187d29117437abe90cdd7265325e3/workers/services/view/forge-portfolio/production/builds/11d27315-28b5-469c-a6db-ae1882b9e3cd) checks. PR 06's current-head CI and authenticated Workers Preview results are recorded in its pull request checks and description; require both to pass on the latest head.

Worker name `forge-portfolio`, assets `./dist`, static generation, compatibility date `2026-10-06`, `previews: {}`, pinned Wrangler, and GitHub workflow remain unchanged. No production deployment was manually triggered. An authorized future merge continues to use the existing `main` integration.

Direct production HTTPS checks are blocked by this environment's egress proxy before the request reaches the site. Hosted TLS, redirect/status/cache behavior, asset byte ranges/seeking, and preview interaction smoke therefore remain **unverified**, rather than failed site checks. Use the actual generated preview address from the connected build and run the [runbook smoke test](deployment-runbook.md) in an environment with access. A cloud setup draft adds only the owner-verified production hostname to existing custom network permissions; saving a draft does not apply it or approve any media CDN.

**Safe merge recommendation:** review the small focus fix, regression coverage, and handoff documents; require green current-head CI/Workers Preview and complete the hosted preview smoke test before marking the full technical release gate PASS. Keep original-media performance/delivery and professional content launch pending owner approval. Do not automatically merge.

Content still needed includes creator identity/biography, actual services/capabilities/availability, public email/socials, original covers/stills/showreel/films/separate previews, factual descriptions/credits, accurate alt text/captions/transcripts, and exact approved CDN origins if external hosting is chosen. Track these in the [launch checklist](launch-checklist.md) and [content launch handoff](content-launch-handoff.md).
