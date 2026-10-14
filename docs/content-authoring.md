# Content authoring

Edit data files for routine content changes. The site builds static pages; committed changes appear on the deployed site after a successful build and deployment.

## Add or edit a project

1. Copy `docs/templates/project.json` to `src/content/projects/<slug>.json`.
2. Set a unique lowercase kebab-case `slug` equal to the filename without `.json`.
3. Update the title, summary, description paragraphs, categories, and cover metadata. Keep `status: "draft"` during review.
4. Add approved project facts and media where available. Remove optional fields you cannot verify.
5. Run the checks below, review the content, then explicitly set `status: "published"` when approved.

The template uses actual committed, labeled placeholders. It lives outside the collection and creates no public route until copied; its explicit draft status keeps the copied record out of public pages.

| Field | Authoring rule |
| --- | --- |
| `title`, `summary` | Nonempty text; the summary also supplies project sharing metadata |
| `description` | One or more nonempty paragraphs |
| `subtitle`, `format`, `duration`, `productionRole` | Optional nonempty text describing verified project facts; duration is human-readable text |
| `year` | Optional release/completion year, an integer from 1900–2100 |
| `aspectRatio` | Optional positive ratio such as `16:9`, `9:16`, or `2.39:1`; keep it consistent with media |
| `tools` | Optional array of tools actually used; do not infer a tool from the type of artwork |
| `overview`, `synopsis` | Optional nonempty editorial text |
| `creativeDirection`, `productionWorkflow` | Arrays of nonempty paragraphs describing the actual creative intent and process |
| `credits` | Verified `{ "role": "…", "name": "…" }` entries; use `[]` until supplied |
| `cover`, `stills`, `video`, `youtube`, `previewVideo` | Media metadata documented in [Media integration](media-integration.md); configure `video` or `youtube` as the main film, never both |
| `featured`, `order` | Homepage selection and ascending nonnegative integer ordering; defaults are `false` and `0` |
| `sample`, `status` | Demonstration labeling and publication control, described below |

Projects with equal `order` sort by slug. `featured: true` includes only public projects on the homepage. No route file per project is needed.

### Choose a main film

Keep `video` for an approved direct MP4/WebM film, or remove that field and add `youtube` for an owner-approved YouTube upload. The `youtube` object requires `videoId` (exactly 11 ASCII letters, digits, `_`, or `-`) and `orientation` (`landscape` or `portrait`); optional `startSeconds` must be a nonnegative safe integer. Supply the ID alone, not a watch URL, embed URL, channel URL, or Shorts URL. See [YouTube main films](media-integration.md#youtube-main-films) for the metadata example and player behavior.

Supplying both `video` and `youtube` fails validation. Omit both for image-only work. `previewVideo` remains an independent native short clip: retain it when switching the main film to YouTube, provided the clip is approved and suitable for hover. The existing cover becomes the YouTube poster, so review its artwork, alternative text, placeholder label, and fit at the selected video ratio. Choosing YouTube does not change the cover, credits, still gallery, project navigation, or homepage hero.

No real YouTube IDs have been supplied. Keep current project records and the reusable native template unchanged until the owner approves an upload. A structurally valid ID does not establish ownership, public availability, embeddability, or caption quality. Review the actual upload, rights, captions/transcript, playback restrictions, keyboard controls, and mobile layout before publishing.

Choose one or more unique category IDs:

| ID | Label |
| --- | --- |
| `ai-films` | AI Films |
| `fantasy-live-action` | Fantasy Live-Action |
| `action-combat` | Action & Combat |
| `fashion-editorial` | Fashion Editorial |
| `ai-photography` | AI Photography |
| `surreal-experimental` | Surreal & Experimental |
| `commercial` | Commercial |

`All Works` is a filter, not a category ID. Multiple categories place a project in multiple filters. Unknown or duplicate categories, duplicate slugs, and filename/slug mismatches are rejected.

## Publication and samples

| Record | Public behavior |
| --- | --- |
| `status: "draft"` | Excluded from grids, homepage, adjacent navigation, detail routes, and sitemap, even when `sample: true` |
| `status: "published"` | Included publicly; `sample: true` still shows demonstration labels |
| No status, `sample: true` | Public for backward compatibility with the five existing samples |
| No status, `sample: false` or omitted | Treated as draft |

Use explicit statuses for new records. `sample` is a truthfulness label, not a publication switch. Keep it true when text, facts, or project attribution are demonstration content. Only set `sample: false` after the record contains owner-approved information. Media `placeholder` flags are separate: each asset must stay labeled until replaced with approved media.

Draft filtering controls generated pages, not access to files. Anything placed in `public/` is a public static asset. Do not commit confidential drafts, private contact information, unreleased assets, or secrets expecting the draft flag to protect them.

## Identity, About, and collaboration

Edit `src/data/site.ts`; its schema is in `src/lib/site-schema.ts`. Optional personal strings accept `null` for an unconfigured state, not an empty string. Configure only details the owner has approved for public display.

| Configuration | Purpose |
| --- | --- |
| `creatorDisplayName`, `professionalTitle`, `studioName`, `shortBio` | Creator identity and short biography; the FORGE brand remains available without them |
| `creativeDisciplines` | Array of creative focus areas; current suggestions describe brand direction, not verified credentials |
| `creativeServices`, `capabilities` | Arrays of `{ title, description }`; list only accurate services and skills |
| `profileImage` | Optional approved image using the same full metadata as a project cover |
| `contactEmail`, `contactSubject` | Approved public address and a useful single-line subject, up to 200 characters; the email CTA uses an encoded `mailto:` URL |
| `socialLinks` | `{ label, url }` entries for approved public HTTPS profiles without embedded credentials |
| `collaborationIntroduction` | Optional collaboration copy |
| `collaborationAvailability` | `unspecified`, `open`, `limited`, or `unavailable`; leave unspecified until confirmed |
| `productionOrigin` | Verified HTTPS origin for canonical/social URLs and the sitemap, without a path, query, or fragment |

Unconfigured email and social links remain absent; Contact displays a useful fallback. Services and capabilities start empty rather than advertising unverified skills. Validation checks field structure and safe URLs; it cannot verify a person's identity or experience.

The `about` object edits the page's editorial content: `introductionHeading`, `introductionDescription`, `philosophyHeading`, `philosophyParagraphs`, `principles`, `workflowIntroduction`, `productionWorkflow`, `capabilitiesIntroduction`, `collaborationHeading`, and `collaborationDescription`. Principles and workflow steps use `{ title, description }` entries. Keep required paragraphs and steps nonempty. Describe AI-assisted stages accurately and distinguish an approach from completed production history.

The owner-confirmed production origin is currently `https://forge-portfolio.digivism9.workers.dev`. Keep it pointed at the production site, not a branch preview. If changing domains, verify the replacement with the owner and inspect canonical, Open Graph, and sitemap URLs after building. Setting it to `null` intentionally omits origin-based metadata and produces an empty valid sitemap.

## Review, test, and deploy

Before publication, verify wording, project dates and roles, credits, asset rights/approval, image alt text, captions/transcripts, sample labels, and placeholder flags. Ensure headings and descriptions accurately describe the project; do not add invented clients, awards, testimonials, or credentials.

```sh
npm ci
npm run check
npm run test:unit
npm run build
npm run test:e2e
npx wrangler deploy --dry-run
```

Install Chromium as described in the README before browser tests. Inspect the generated site using `npm run preview -- --host 0.0.0.0`: check homepage selection, filters, draft exclusion, project navigation, mobile layout, keyboard interaction, and media. Inspect project-specific sharing metadata and `/sitemap.xml`; only public records should appear.

Commit focused data and approved asset changes on a separate branch and open a pull request targeting `main`. Verify GitHub CI and the connected Cloudflare Workers Preview before merging through the repository's normal review process. Keep `wrangler.jsonc` and its `previews` block unchanged. See the README for authenticated deployment commands; builds and authoring need no credentials.

## Details still needed from the owner

- Approved public creator name, title, studio name, biography, and optional profile image.
- Actual capabilities and services, collaboration introduction and availability, verified public email, and approved social profiles.
- For each real project: approved title/copy, categories, year/format/duration/ratio, tools, role, workflow, verified credits, and publication decision.
- Approved cover, showreel/poster, main film, separate short muted preview, stills, accurate dimensions, alt text, captions, and transcripts.
- Exact approved CDN origins and direct asset URLs if using remote media; no external media host is currently trusted. For YouTube films, an approved video ID, orientation, optional start position, and review of public embedding and accessibility are needed separately.
