# Content launch handoff

**Content readiness: INCOMPLETE.** FORGE's routes and authoring workflow exist, but the site currently presents five labeled sample projects and placeholder artwork/test-pattern clips. Creator identity, public contact details, and original portfolio assets remain unconfigured. Technical approval of PR 06 does not approve or complete those materials.

The production origin is already owner-verified as **https://forge-portfolio.digivism9.workers.dev**. No external media CDN origin or provider has been approved. Preserve this origin, the empty media allowlist, existing local assets, and truthful placeholder labels while collecting the following information.

## Creator identity and public biography

Provide owner-approved public values for:

- Display name, accurate professional title, and optional studio name.
- Short biography and any longer About copy that should replace the current brand/process outline.
- Creative disciplines that accurately describe the practice; current focus territories are suggestions, not verified credentials.
- Optional approved profile image, with actual dimensions, orientation, meaningful alt text, and permission to publish.
- Verified services and capabilities, each with a title and concise description.

These fields belong in `src/data/site.ts`. Leave unknown optional values `null` and unverified service/capability arrays empty. Do not add invented qualifications, clients, awards, tools, completed productions, or testimonials. Current editable workflow copy describes an approach; approve factual production claims separately.

## Collaboration and contact

Provide a verified email address intended for public display, approved public HTTPS social/profile URLs with their labels, and a current availability decision: `open`, `limited`, `unavailable`, or intentionally `unspecified`. Approve collaboration introduction and services wording together so the page makes accurate commitments.

Contact configuration is in `src/data/site.ts`. The email button uses an encoded `mailto:` subject; it does not send messages or store form submissions. Social links open safely in a new tab. Missing contact fields deliberately produce a useful fallback and no fabricated links. Confirm addresses/profiles and test their real destinations before publication. If omitting contact details is intentional, record that decision instead of marking them supplied.

## Project facts, copy, and credits

For each project intended as real portfolio work, supply:

- Approved title, subtitle if needed, summary, description paragraphs, and category selection.
- Verified year, format, duration, aspect ratio, tools actually used, and the creator's production role where applicable.
- Synopsis/overview, creative direction, and accurate production workflow.
- Credits with approved names and roles; permission to list collaborators, clients, or brands.
- Homepage featured/order preference and an explicit publication decision.

Author records in `src/content/projects/` using the [draft template](templates/project.json) and [content authoring guide](content-authoring.md). Keep new records `status: "draft"` until approved. An explicit draft stays out of generated grids, featured selection, detail routes, adjacent navigation, and sitemap. New non-sample records without a status also remain draft; the five legacy samples stay visible for compatibility.

`sample` is a truthfulness label, not a publication switch. Set `sample: false` only after the complete record accurately describes approved work. Each media asset's `placeholder` flag is separate and stays true until that specific asset is replaced. Do not simply remove labels from demonstration records to make them appear complete.

## Original artwork, covers, and stills

Supply approved web-ready project covers, still frames, and any applicable profile/share images. Include:

- The supplied file or an approved stable direct URL; confirm publication rights, relevant likeness permissions, and credits.
- Actual positive width/height and landscape or portrait orientation. The current schema does not accept square media.
- Meaningful alt text and useful still captions; avoid copying generic placeholder text onto original imagery.
- Compressed delivery exports, with approved JPEG/PNG/WebP sharing images where needed. Current SVG placeholders may not render as thumbnails on social platforms.

Keep large master exports outside Git. Local delivery files belong in supported `public/images/` or `public/media/` paths; existing `/art/` and `/placeholders/` assets remain valid. Draft flags do not protect files placed in `public/`, and Git history is not private asset storage.

## Showreel, main films, and short previews

Provide the approved homepage showreel and high-quality poster, plus each project's main film/poster where applicable. Image-only projects remain valid and need no invented video. Supply supported MP4/WebM delivery exports, accurate MIME type, dimensions, orientation, audio metadata, and useful descriptions.

For each real video card, provide a **separate short muted hover-preview clip** with modest transfer cost. Do not use a large main-film export as a card preview. Only the tiny committed test-pattern clips currently share their main/preview URL.

Showreel configuration belongs in `src/data/showreel.ts`; project `video`, optional `video.poster`, `previewVideo`, and `stills` belong in the project record. Keep hero `autoplay: false` unless the owner explicitly chooses muted opt-in autoplay. Existing reduced-motion, data-saving, pointer, poster, playback-control, and error handling must continue to work with the replacement files.

## Captions, transcripts, and accessible descriptions

Provide synchronized WebVTT tracks with correct language and track labels for audio-bearing films, covering dialogue, speaker changes, and meaningful sounds. Supply an accurate text transcript and relevant visual descriptions. Silent work may still need a meaningful descriptive alternative; assess the actual content rather than copying the current test-pattern description.

Check timing, completeness, readability, caption loading, and player selection against the supplied film in a real browser. Passing schema validation confirms structure; it does not establish caption quality or complete WCAG conformance. Review descriptive alternatives where visuals carry information not expressed in audio.

## Remote media approval

No CDN origin is currently trusted: `src/data/media.ts` contains `trustedOrigins: []`. Local media remains supported. No Cloudinary or other hosting provider is selected or implied.

If the owner chooses external hosting, provide the **exact approved HTTPS origins** and stable, public, direct asset URLs. Approve each distinct hostname/port explicitly. An origin contains no path, trailing slash, query, fragment, credentials, or wildcard; the production site origin does not automatically approve a media host. Do not submit expiring authenticated URLs or secrets.

Before publication, verify remote image/video/caption MIME types, HTTPS availability, anonymous CORS for the production origin, video byte-range requests/seek behavior, codec/browser compatibility, and mobile transfer cost. Follow the [media integration guide](media-integration.md). Add an origin only after owner approval; do not relax validation to make an unapproved URL build.

## Safe content completion workflow

1. Collect the approved facts, publication rights, asset exports, descriptive text, and optional CDN decision above. Record intentional omissions.
2. Create a focused content branch from current `main`; add only public, approved materials. Keep unreleased or confidential assets out of Git and `public/`.
3. Update identity/media configuration and project records. Keep draft/sample/placeholder states truthful during review.
4. Run the [release validation sequence](deployment-runbook.md), then inspect the built site on mobile/desktop and with keyboard/reduced motion. Re-test actual media loading, audio, captions, portrait/landscape sizing, sharing metadata, and performance; placeholder measurements do not certify replacement media.
5. Open a content PR targeting `main`, explain what is original versus still placeholder, and obtain owner/reviewer approval. Change publication status and labels only for approved material.
6. Verify GitHub CI and the existing Workers Preview for the latest commit. An authorized merge uses the established automatic production integration; smoke test the live release afterward.

PR 06 supplies audit evidence and launch procedures. It does not supply original creative work, approve creator/contact claims, merge automatically, change domains, or manually deploy production. Use the [launch checklist](launch-checklist.md) to track outstanding decisions separately from technical readiness.
