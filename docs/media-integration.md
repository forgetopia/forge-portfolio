# Media integration

Keep the existing posters, lazy loading, reduced-motion behavior, native project controls, and accessible image viewer. Project main films may also use the click-to-load YouTube player described below. Supply owner-approved assets and metadata; do not substitute unrelated internet imagery, invent URLs, or select an unrelated YouTube video.

## Local assets

Put approved images in `public/images/`, small web-ready videos and captions in `public/media/`, and reference them without the `public` prefix. Existing `/placeholders/` and `/art/` paths remain valid. Local filenames and directory segments use letters, digits, underscores, or hyphens.

Images accept `.avif`, `.gif`, `.jpg`, `.jpeg`, `.png`, `.svg`, and `.webp`; videos accept `.mp4` or `.webm`; captions accept `.vtt`. Preserve accurate positive integer width/height and `orientation: "landscape"` or `"portrait"`. Landscape media must be wider than tall; portrait media must be taller than wide. The schema currently excludes square media.

All image metadata uses this shape; this example references an actual existing placeholder:

```json
{
  "src": "/placeholders/landscape.svg",
  "alt": "Labeled landscape image placeholder; approved artwork has not been supplied.",
  "width": 1600,
  "height": 1000,
  "orientation": "landscape",
  "placeholder": true,
  "caption": "Placeholder — awaiting approved imagery."
}
```

`caption` is optional. The portrait placeholder is `/placeholders/portrait.svg` at `1000 × 1400`. `cover`, each `stills` item, an optional `video.poster`, and `site.profileImage` use the same image shape. Covers and posters reserve layout space; preserve the actual aspect ratio rather than stretching imagery. Supply appropriately sized, compressed web images instead of master exports.

Project covers supply social sharing image metadata. The current SVG placeholders remain explicitly labeled, but some social platforms do not render SVG thumbnails. Supply approved JPEG, PNG, or WebP covers/posters for real sharing previews and verify the target platform after publication.

## Approved remote media

No external media host is trusted by default. `src/data/media.ts` exports `mediaPolicy` with `trustedOrigins: []`. Once the owner approves a CDN, add its exact HTTPS origin to this array. An origin has no trailing slash, path, query, fragment, embedded credentials, or wildcard. Approval is exact: a different subdomain, scheme, or port does not inherit trust. The production site origin is not implicitly a trusted media origin.

Then use the supplied direct HTTPS asset URL in `src`, with the same metadata as local media. The path must end in a supported extension. Query parameters may be used for legitimate asset delivery, but fragments, non-HTTPS URLs, and embedded credentials are rejected. Use stable public asset URLs, not expiring authenticated links or secrets. A social profile/page URL is not a playable video asset.

Approve the host before adding its URLs; do not relax validation to accept an unverified URL. Keep large master videos outside GitHub and supply web delivery exports through the approved host. This PR does not upload assets or select a CDN provider.

Verify the host in a real browser before publishing:

- Direct asset GET requests succeed over HTTPS without login; HEAD should return usable metadata when supported.
- Videos return the actual `video/mp4` or `video/webm` MIME type. Captions return `text/vtt`; images use the correct image MIME type.
- Video byte-range requests return `206 Partial Content` with a correct `Content-Range`, allowing practical seeking. Test startup, seek, pause/resume, and mobile playback.
- Cross-origin videos and WebVTT tracks permit anonymous access from the production origin via `Access-Control-Allow-Origin` (the verified origin or `*`). The players set anonymous CORS for remote main/showreel sources or captions; the CDN must satisfy it. Check caption loading as well as playback.
- Encoding works in target browsers and the transfer cost is reasonable on slower/mobile connections. Schema validation does not test URL availability, CORS, codecs, or remote performance.

## Main films, card previews, and captions

`video` is a native main project film. `previewVideo` is a separate short muted clip for desktop card hover. Both use this shape, shown with the committed test-pattern asset:

```json
{
  "src": "/media/placeholder-landscape.mp4",
  "type": "video/mp4",
  "width": 1280,
  "height": 800,
  "orientation": "landscape",
  "placeholder": true,
  "hasAudio": false,
  "captions": [
    { "src": "/media/placeholder-en.vtt", "srclang": "en", "label": "English" }
  ],
  "transcript": "A silent graphite test pattern labeled PLACEHOLDER CLIP and NO ORIGINAL FOOTAGE."
}
```

The MIME type must match the URL pathname's extension. `poster` is optional image metadata; without a project-specific poster the player uses the cover. Main films remain optional, so image-only projects are valid. Project playback starts after visitor interaction and uses native controls; errors retain a poster and retry path.

Set `hasAudio` accurately. Audio-bearing videos require at least one caption track. Supply WebVTT timed dialogue, speaker identification, and meaningful sound information; set the correct `srclang` language tag and useful track label. Use `transcript` for an accurate text alternative, including relevant visual information. Review synchronization and completeness against the supplied film rather than treating a successful schema check as accessibility review.

For real projects, export a short muted preview separately from the main film. Do not point card hover at a large feature export. Touch, reduced-motion, and data-saving visitors keep static posters; only one eligible desktop hover preview loads at a time, and inactive previews release their sources. Test both landscape and portrait cards with the intended assets.

## YouTube main films

Use the optional `youtube` object for an owner-approved YouTube upload. Do not put YouTube watch or embed URLs in `video.src` or `previewVideo.src`: those fields accept direct MP4/WebM assets only. Choose exactly one main-film source, `video` or `youtube`; the schema rejects both together. Omit both for an image-only project. A native `previewVideo` may accompany either choice and keeps the existing desktop hover behavior.

The following is an authoring illustration, not a valid record. **`OWNER_VIDEO_ID` is deliberately invalid**: replace it with the approved 11-character ID before adding the object to a project. No real ID is configured in the current records or template.

```json
{
  "youtube": {
    "videoId": "OWNER_VIDEO_ID",
    "startSeconds": 0,
    "orientation": "landscape"
  }
}
```

- `videoId` must contain exactly 11 ASCII letters, digits, underscores, or hyphens. Paste only the ID, never a URL or extra query parameters.
- `startSeconds` is optional; when set, it must be a nonnegative safe integer. The embed and watch link use the same requested starting position.
- `orientation` is required. Landscape uses a responsive 16:9 frame; portrait uses 9:16. The existing project cover supplies the poster and preserves its original image proportions within the video frame.

`YouTubePlayer.astro` builds the iframe URL from validated metadata using `https://www.youtube-nocookie.com/embed/VIDEO_ID`. The page initially renders a local or approved cover and an accessible Play button; it creates no YouTube iframe and requests no YouTube thumbnail before the visitor activates Play. Explicit playback may request autoplay as part of that action, with standard YouTube controls and inline/fullscreen support. If browser policy prevents immediate playback, the embedded controls remain available. Reduced motion does not trigger playback; manual Play remains available under that preference.

The player supplies a project-specific iframe title and `strict-origin-when-cross-origin` referrer policy compatible with YouTube playback. Load errors or timeouts restore the poster and expose Retry. Opening the still-image lightbox or hiding/leaving the page removes the iframe to stop playback; returning does not automatically resume it. Loading it again restarts from the configured `startSeconds` rather than retaining the previous playhead. A permanent **Watch on YouTube** link works without JavaScript and remains available when the embed is blocked, unavailable, age/region restricted, private, deleted, or disabled by its owner. Cross-origin iframe contents cannot be inspected reliably: a successful iframe load is not proof that the film plays, and not every restriction can be detected automatically. Check the real owner-supplied upload in a browser and use the watch link when the embed cannot play. Privacy-enhanced embedding still contacts YouTube after the visitor activates Play.

YouTube iframe trust is separate from `src/data/media.ts`: its direct-media `trustedOrigins` stays empty until a CDN is explicitly approved. Do not add YouTube hosts to that allowlist, relax MP4/WebM validation, or load an API script. This integration needs no API key, backend, database, or media provider account. It does not replace the native homepage hero and never uses YouTube for hover previews.

To switch an existing project, remove its main `video` field and add approved `youtube` metadata; keep its cover, independent native `previewVideo`, stills, and editorial fields. To switch back, remove `youtube` and restore approved native `video` metadata, including accurate audio/captions/transcript fields. YouTube captions are managed on the upload, not through native WebVTT metadata. Review caption accuracy, available languages, visual description and text alternatives, upload rights, embedding settings, and keyboard/mobile playback before publishing. Schema validation cannot confirm these qualities.

## Homepage showreel

Edit `src/data/showreel.ts`. Replace the `video` metadata and separate `poster` metadata with approved showreel footage/artwork; the same validation and remote-origin rules apply. Supply captions and a transcript when applicable.

Keep `autoplay: false` unless the owner explicitly chooses opt-in autoplay. Opt-in remains muted and is gated by reduced motion, data-saving, and a suitable desktop pointer. Play/pause and mute controls remain available. Never enable automatic audio or discard the high-quality poster fallback.

## Replace placeholders safely

1. Obtain approved web-ready exports, factual project copy, credits, and permission to publish.
2. Add local assets or approve the supplied remote origin, then update URLs and actual dimensions/orientation.
3. Write meaningful alt text describing each image; review still captions, film captions, and transcripts.
4. Set an asset's `placeholder: false` only after replacing that asset. Keep any remaining demonstration asset labeled. Set project `sample: false` only when the whole record is approved factual content.
5. Check all media controls, hover fallbacks, error handling, still-image keyboard navigation, aspect ratios, mobile layout, and slow-network behavior. Run the validation sequence in the [Content authoring guide](content-authoring.md) before publication.

The committed five-second MP4s are silent generated test patterns with burned-in **PLACEHOLDER CLIP / NO ORIGINAL FOOTAGE** labels: landscape `1280 × 800`, portrait `640 × 896`. Only these tiny placeholders share main and preview URLs. Their WebVTT track describes the test pattern. They do not establish production-film quality or performance.

Builds need no FFmpeg. To regenerate the test patterns during asset authoring, install FFmpeg with `libx264` and `drawtext`, then run `bash scripts/generate-placeholder-media.sh`. If a supported local font is unavailable, set `FORGE_PLACEHOLDER_FONT` to a local TrueType font path. Review the resulting files before committing.
