# PR 04 — Responsive, Accessibility & Performance QA

Baseline: merged PR 03 at `b4347df`. This pass refines the existing Astro static site and retains its palette, typography, media placeholders, content architecture, CI workflow, and Wrangler configuration.

## Before and after

| Area | Baseline finding | Change |
| --- | --- | --- |
| Responsive layout | All nine routes already fit all seven requested widths; wide hero controls used different alignment, and custom text spacing/fallback fonts could cause overlapping mobile controls. | Align controls with the shell, put mobile copy/controls/metadata in normal flow, and use fluid headings and spacing. |
| Touch targets | The footer brand was about 22px high; the narrowest footer navigation label was about 23px wide. | Give footer links at least 44px targets and preserve spacing. |
| Short landscape screens | The lightbox image stage could collapse; the portrait player's viewport-based limit could become too small for native controls. | Reserve a usable lightbox stage and a minimum portrait-player width while preserving media ratios. |
| Mobile navigation | The native disclosure had no coordinated Escape, outside-click, focus-leave, or breakpoint handling. | Add lightweight close behavior and appropriate focus restoration without trapping navigation focus. |
| Accessible names | Experimental axe/Lighthouse checks found visible labels missing from ARIA names on branding, project cards, and still links, despite scored Lighthouse Accessibility of 100. | Include visible labels in accessible names and remove misleading overrides. |
| Dynamic focus and playback | Filtering could hide a focused card; a queued native play event could arrive after the lightbox opened. | Recover filter focus and prevent background playback while the modal is open. |
| Fonts | The build emitted 25 font files totaling 434,308 bytes across unused subsets and fallback formats. | Keep the existing families, emit five font files totaling 135,240 bytes, and preload the normal display face. |

Modified components include Header, Footer, HeroShowreel, ProjectCard, StillGallery, BaseLayout, and the homepage hero slot; shared, hero, player, and lightbox styles; navigation, filters, and media scripts; browser configuration; and targeted regression tests.

## Motion and media

The established reduced-motion policy remains: no decorative autoplay or hover previews when reduction is requested, no unnecessary smooth scrolling/transitions, and manual video playback remains available. Preference changes are handled while the page is open. Touch/data-saving users keep posters, previews load on eligible hover only, inactive previews release their sources, and opening a lightbox pauses background media. The additional player guard also covers a play event queued during modal opening.

Original media ratios and explicit dimensions remain intact; posters reserve video space. Real projects should use separate short preview clips. The small labeled placeholder clips are not representative of production footage or its transfer cost.

## Measured performance

Lighthouse 13.0.1 with Chromium 154 audited both production builds three times per route (18 runs total), reported as medians. Default mobile emulation was 412×823 CSS pixels with simulated 150ms RTT, approximately 1.6Mbps throughput, and 4× CPU slowdown. These are local lab measurements, not field Core Web Vitals or Cloudflare CDN measurements.

| Route | Performance before → after | Accessibility before → after | LCP before → after | CLS before → after |
| --- | --- | --- | --- | --- |
| `/` | 98 → 99 | 100 → 100 | 2.032s → 1.731s | 0.05842 → 0.04642 |
| `/work/` | 98 → 99 | 100 → 100 | 2.030s → 1.879s | 0.00076 → 0.00076 |
| `/work/the-last-rune-engine/` | 97 → 99 | 100 → 100 | 2.104s → 1.883s | 0.00010 → 0.00010 |

Generated CSS declined from 46,191 to 39,065 bytes (15.4%). Actual font transfers remain three requests totaling 71,969 bytes per audited page; emitted-font savings are not per-page transfer savings. Inline module source grew by approximately 1.3KB per page for navigation and focus/playback guards; no dependencies or frameworks were added. Lighthouse's zero external script requests do not mean zero JavaScript.

Measured total page transfer declined from 135,921 to 130,715 bytes on home, 129,879 to 124,048 on Work, and 141,026 to 135,433 on the portrait detail. Responses were local and uncompressed; real supplied media and CDN conditions will change results. Initial navigation fetched no MP4s before or after. TBT remained 0ms; INP requires representative interaction/field data and cannot be inferred from TBT. Three runs reduce host noise but do not establish guaranteed visitor scores.

## Validation and limitations

- Before/after overflow audits: all nine routes fit all seven widths (320, 360, 390, 768, 1024, 1440, and 1920px). All routes also pass 640×400 and 320×200 CSS reflow equivalents for a 1280×800 window at 200%/400% zoom; browser chrome zoom and OS magnification still need manual device QA.
- `npm ci`, `npm run check` (39 files; zero diagnostics), `npm run build` (nine static pages), `npm run test:unit` (16 passed), `npm run test:e2e` (58 passed, including all 42 existing tests), and `npx wrangler deploy --dry-run` (38 assets) passed.
- Chromium desktop/mobile, keyboard/touch, runtime reduced motion, filters, routes, real native video playback, failure recovery, no-JavaScript navigation/media, and lightbox controls pass. All routes pass mobile/desktop axe WCAG AA checks plus the explicit experimental label-in-name rule.
- Visual review covered mobile/tablet/wide desktop, no-JavaScript hero, and a 320×180 lightbox: 44px navigation stays usable, the caption scrolls into view, and Escape restores focus. Chromium's native accessibility tree confirms Menu is focusable with expanded false/true; no redundant expanded-state override is needed.
- Optional Firefox and WebKit binaries could not be downloaded in this environment (HTTP 403); those engines remain untested. Local opt-in commands are documented; CI still requires only Chromium.
- Automated accessibility checks and keyboard/visual QA support the WCAG 2.2 AA target; they do not establish complete conformance. Placeholder media cannot validate real film captions, audio, image quality, or production-media performance.
- Remote GitHub CI and Cloudflare Workers Preview results are recorded in the pull request checks. The existing workflow, static output, Wrangler asset directory, compatibility date, and `previews` block are unchanged.
