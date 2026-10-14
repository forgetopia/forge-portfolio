# PR 06 — Production-build performance evidence

Initial audit date: 2026-10-13 UTC. Audited the PR 06 implementation build, based on merged PR 05 (`65019a0`), after the inset native-player focus-ring fix and before the final QA documentation. The tables below preserve those 36 runs. Two bounded checks of the later documentation build are recorded separately below. These are local laboratory audits of the generated static site, not live Cloudflare or real-user performance measurements.

## Environment and method

- Node 22.23.3; Astro 7.3.8; Lighthouse 13.0.1 installed outside the repository; Chromium 154.0.8037.57 on Linux.
- Served `dist/` using `tests/static-server.mjs` on `http://127.0.0.1:4190`. Responses were uncompressed with `Cache-Control: no-store`; the server supports media byte ranges. These headers describe the test server, not the production Worker.
- Three independent cold-navigation runs per route and device mode: 36 completed runs, all without runtime errors, run warnings, failed resource requests, or failed scored accessibility audits. Runs were sequential after the browser regression suite stopped, with no concurrent builds or other browser workloads. Each table entry is the median of its three runs, not the best run.
- Mobile: default Lighthouse simulated Slow 4G, 412×823 CSS pixels, device scale factor 1.75, 150ms RTT, 1,638.4Kbps throughput, 4× CPU slowdown. Configured request latency/download/upload values were 562.5ms / 1,474.56Kbps / 675Kbps.
- Desktop: `--preset=desktop`, simulated Dense 4G, 1350×940 CSS pixels, device scale factor 1, 40ms RTT, 10,240Kbps throughput, 1× CPU slowdown.
- Categories: Performance and Accessibility. Chromium flags: `--headless --no-sandbox --disable-dev-shm-usage`. Screen and network throttling are Lighthouse emulation settings; they do not represent a tested physical phone or connection.

## Route medians

Scores are reported as Performance / Accessibility out of 100.

| Route | Mobile scores | Mobile LCP | Mobile CLS | Desktop scores | Desktop LCP | Desktop CLS |
| --- | --- | --- | --- | --- | --- | --- |
| `/` | 99 / 100 | 1.734s | 0.04642 | 100 / 100 | 0.455s | 0.00109 |
| `/work/` | 99 / 100 | 1.879s | 0.00076 | 100 / 100 | 0.448s | 0.00059 |
| `/work/the-long-night/` | 99 / 100 | 2.033s | 0.00010 | 100 / 100 | 0.446s | 0.00009 |
| `/work/the-last-rune-engine/` | 99 / 100 | 2.034s | 0.00010 | 100 / 100 | 0.445s | 0.00009 |
| `/about/` | 100 / 100 | 1.505s | 0.00010 | 100 / 100 | 0.365s | 0.00009 |
| `/contact/` | 100 / 100 | 1.354s | 0.00026 | 100 / 100 | 0.364s | 0.00143 |

All mobile performance medians meet the 90 target; all accessibility medians meet 95; all LCP medians are ≤2.5 seconds and CLS medians are ≤0.1. Desktop performance is 100 on all six representative routes. Individual mobile performance scores were 98–100, LCP 1.353–2.035 seconds, and CLS at most 0.04642; no target failure was hidden by the medians. Total Blocking Time was 0ms in all 36 navigation runs.

INP was **not measured**. These synthetic navigation audits do not provide valid field INP or representative end-to-end interaction latency. TBT and Lighthouse's other synthetic responsiveness estimates are not evidence that field INP meets 200ms. Obtain representative real-user interaction data when available and reassess after original media/content are supplied.

## Initial payload and loading

The following transfer totals are from each route's first mobile run; repeated runs and desktop totals were identical. Bytes include the local HTTP transfer overhead reported by Lighthouse and are not gzip/Brotli estimates.

| Route | Total requests | Transferred bytes | CSS requests / bytes | Font requests / bytes |
| --- | --- | --- | --- | --- |
| `/` | 10 | 132,279 | 2 / 31,641 | 3 / 71,969 |
| `/work/` | 9 | 125,616 | 2 / 31,641 | 3 / 71,969 |
| `/work/the-long-night/` | 11 | 138,729 | 3 / 42,035 | 3 / 71,969 |
| `/work/the-last-rune-engine/` | 11 | 138,929 | 3 / 42,035 | 3 / 71,969 |
| `/about/` | 6 | 89,723 | 1 / 24,925 | 2 / 48,110 |
| `/contact/` | 6 | 107,863 | 1 / 24,925 | 3 / 71,969 |

- Initial navigation fetched **zero MP4s**, zero external JavaScript resources, and zero third-party resources on every audit. Existing HTML includes executable inline modules; zero script requests does not mean zero JavaScript.
- Inline JavaScript source in built HTML is 6,975 bytes on Home, 4,699 on Work, 7,552 on each representative project detail, and 1,300 on About/Contact. These bytes are already part of the document transfer totals above.
- The implementation build used for the 36 runs emitted three CSS files totaling 41,400 bytes and five font files totaling 135,240 bytes. Emitted files are not all fetched on each page: actual font transfers were two requests / 48,110 bytes on About and three requests / 71,969 bytes elsewhere. Cormorant Garamond and Manrope remain self-hosted; fonts use `font-display: swap`, with the normal display face preloaded.
- Hero and detail cover images retain `fetchpriority="high"`, intrinsic dimensions, and reserved aspect ratios. Card, still-gallery, and noncritical editorial images are lazy loaded. Current placeholders are small scalable SVGs; no raster source variants are available. Approved future raster assets still need appropriate export sizes and loading validation.
- Hero autoplay remains explicitly disabled. Hero, project film, and card preview video elements use `preload="none"`; card sources are assigned only for eligible pointer interactions. Captions can load independently of the film. The existing two labeled placeholder clips total only 36,709 bytes, so these results cannot predict real-film transfer costs.
- Poster/video/image frames preserve aspect ratios and reserve layout space. The largest observed CLS was the mobile homepage's 0.04642, within the target. No measured performance defect required changing the existing design or adding an optimization dependency.

## Final documentation-build spot checks

On 2026-10-14 UTC, the build including the new QA and launch documents emitted three CSS files totaling **41,490 bytes**, 90 bytes above the implementation build. Tailwind's automatic source detection picked up additional unused utility tokens from the documentation; the application stylesheet source had no further change after the native-player focus fix. The earlier median and transfer tables describe their original build rather than silently substituting the later payload.

Exactly one additional cold-navigation run per device mode checked `/work/surreal-universe/`, which has both a portrait cover and a portrait main film, against that later `dist/` on isolated local port 4290. Lighthouse/browser versions, throttling, screen emulation, flags, and test-server behavior matched the settings above. These are **individual results, not medians**, and do not replace the earlier six-route medians.

| Route | Mode | Performance | Accessibility | LCP | CLS | TBT |
| --- | --- | --- | --- | --- | --- | --- |
| `/work/surreal-universe/` | Mobile | 99 | 100 | 2.036s | 0.00010 | 0ms |
| `/work/surreal-universe/` | Desktop | 100 | 100 | 0.450s | 0.00009 | 0ms |

Both runs met the targets, with no runtime errors, run warnings, failed requests, or failed scored accessibility audits. Each transferred 138,974 bytes in 11 requests, including three CSS requests / 42,125 bytes and three font requests / 71,969 bytes. Neither fetched video, external JavaScript, or third-party resources. INP remains unmeasured. Raw reports are `final-mobile-surreal.json` and `final-desktop-surreal.json` in the temporary evidence directory below.

## Reproducing the audit

Use the pinned project Node version and a separately installed Lighthouse 13.0.1; do not add Lighthouse to production dependencies.

```bash
npm ci
npm run build
PORTFOLIO_TEST_PORT=4190 node tests/static-server.mjs
```

From a second terminal, substitute the installed browser path and one of the routes listed above. Repeat three times with distinct report paths; add `--preset=desktop` for the desktop runs.

```bash
CHROME_PATH=/usr/bin/chromium lighthouse http://127.0.0.1:4190/ \
  --chrome-flags='--headless --no-sandbox --disable-dev-shm-usage' \
  --only-categories=performance,accessibility \
  --output=json --output-path=home-mobile-1.json
```

The cloud audit's raw reports, logs, run script, medians, and source-payload summary remain under `/tmp/forge-pr06-performance/`; they are temporary environment evidence and are not committed generated artifacts. This report preserves the measurements and settings needed for review and a repeatable audit.

## Limits and release implications

- Scores are laboratory results on one Linux host using placeholder assets; they do not guarantee scores for every device, network, deployment cache state, or future content change.
- Production HTTPS, status codes, cache/range behavior, and Worker preview checks are assessed separately in [the final QA report](final-qa-report.md). Local `no-store` responses establish cold-navigation behavior, not Cloudflare cache effectiveness or production TTL policy.
- Automated Accessibility 100 supports the accessibility target, but does not establish complete WCAG 2.2 AA conformance. Keyboard, touch, reflow, media alternatives, and browser coverage are documented separately in the final QA report.
- Re-run these audits after replacing SVG placeholders with approved raster artwork, supplying original showreel/main films, configuring an approved remote origin, or expanding the font subsets for another script. Validate real playback start time, range delivery, caption timing, and interaction latency as well as navigation metrics.
