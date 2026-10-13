import { imageMediaSchema, videoMediaSchema } from '../lib/project-schema';

/** Replace these explicitly labeled samples with approved footage and metadata. */
export const showreel = {
  video: videoMediaSchema.parse({
    src: '/media/placeholder-landscape.mp4',
    type: 'video/mp4',
    width: 1280,
    height: 800,
    orientation: 'landscape',
    placeholder: true,
    hasAudio: false,
    captions: [{ src: '/media/placeholder-en.vtt', srclang: 'en', label: 'English' }],
    transcript: 'A silent graphite test pattern labeled PLACEHOLDER CLIP and NO ORIGINAL FOOTAGE. A small bronze marker moves along the bottom. No original showreel footage has been supplied.',
  }),
  poster: imageMediaSchema.parse({
    src: '/art/horizon.svg',
    alt: 'Existing atmospheric horizon layout placeholder. Original showreel artwork has not been supplied.',
    width: 1600,
    height: 1100,
    orientation: 'landscape',
    placeholder: true,
    caption: 'Showreel poster placeholder',
  }),
  // Explicitly opt in only when appropriate; the player also checks user preferences.
  autoplay: false,
};
