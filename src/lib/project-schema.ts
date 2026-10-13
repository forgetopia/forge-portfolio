import { z } from 'astro/zod';

export const projectCategories = [
  { id: 'ai-films', label: 'AI Films' },
  { id: 'fantasy-live-action', label: 'Fantasy Live-Action' },
  { id: 'action-combat', label: 'Action & Combat' },
  { id: 'fashion-editorial', label: 'Fashion Editorial' },
  { id: 'ai-photography', label: 'AI Photography' },
  { id: 'surreal-experimental', label: 'Surreal & Experimental' },
  { id: 'commercial', label: 'Commercial' },
] as const;

export type ProjectCategory = (typeof projectCategories)[number]['id'];

const categoryIds = projectCategories.map(({ id }) => id) as [
  ProjectCategory,
  ...ProjectCategory[],
];
const nonemptyText = z.string().trim().min(1);

export const imageMediaSchema = z
  .object({
    src: z.string().regex(
      /^\/(?:placeholders|images|art)\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.(?:avif|gif|jpe?g|png|svg|webp)$/,
      'Use a local image in /placeholders/, /images/, or /art/.',
    ),
    alt: nonemptyText,
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    orientation: z.enum(['landscape', 'portrait']),
    placeholder: z.boolean(),
    caption: nonemptyText.optional(),
  })
  .strict()
  .superRefine((cover, context) => {
    const matchesOrientation = cover.orientation === 'landscape'
      ? cover.width > cover.height
      : cover.height > cover.width;

    if (!matchesOrientation) {
      context.addIssue({
        code: 'custom',
        path: ['orientation'],
        message: 'Landscape covers must be wider than tall; portrait covers must be taller than wide.',
      });
    }
  });

export type ImageData = z.infer<typeof imageMediaSchema>;

/** Local, explicit media metadata keeps lazy playback and accessible fallback predictable. */
export const videoMediaSchema = z
  .object({
    src: z.string().regex(
      /^\/media\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.(?:mp4|webm)$/,
      'Use a local MP4 or WebM video in /media/.',
    ),
    type: z.enum(['video/mp4', 'video/webm']),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    orientation: z.enum(['landscape', 'portrait']),
    placeholder: z.boolean(),
    hasAudio: z.boolean().default(false),
    captions: z.array(z.object({
      src: z.string().regex(
        /^\/media\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.vtt$/,
        'Use a local WebVTT caption file in /media/.',
      ),
      srclang: z.string().regex(/^[a-zA-Z]{2,3}(?:-[a-zA-Z0-9]{2,8})*$/, 'Use a language tag, such as en or en-US.'),
      label: nonemptyText,
    }).strict()).default([]),
    transcript: nonemptyText.optional(),
  })
  .strict()
  .superRefine((video, context) => {
    const matchesOrientation = video.orientation === 'landscape'
      ? video.width > video.height
      : video.height > video.width;

    if (!matchesOrientation) {
      context.addIssue({
        code: 'custom',
        path: ['orientation'],
        message: 'Landscape videos must be wider than tall; portrait videos must be taller than wide.',
      });
    }

    if (!video.src.endsWith(video.type === 'video/mp4' ? '.mp4' : '.webm')) {
      context.addIssue({
        code: 'custom',
        path: ['type'],
        message: 'Video MIME type must match its file extension.',
      });
    }

    if (video.hasAudio && video.captions.length === 0) {
      context.addIssue({
        code: 'custom',
        path: ['captions'],
        message: 'Provide captions for videos with audio.',
      });
    }
  });

export type VideoData = z.infer<typeof videoMediaSchema>;

/** Portfolio metadata is validated during Astro sync and every production build. */
export const projectSchema = z
  .object({
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use a lowercase kebab-case slug.'),
    title: nonemptyText,
    summary: nonemptyText,
    description: z.array(nonemptyText).min(1),
    categories: z.array(z.enum(categoryIds)).min(1).refine(
      (categories) => new Set(categories).size === categories.length,
      'Project categories must be unique.',
    ),
    cover: imageMediaSchema,
    video: videoMediaSchema.optional(),
    previewVideo: videoMediaSchema.optional(),
    synopsis: nonemptyText.optional(),
    creativeDirection: z.array(nonemptyText).default([]),
    credits: z.array(z.object({ role: nonemptyText, name: nonemptyText }).strict()).default([]),
    stills: z.array(imageMediaSchema).default([]),
    featured: z.boolean().default(false),
    order: z.number().int().nonnegative().default(0),
    sample: z.boolean().default(false),
  })
  .strict();

export type ProjectData = z.infer<typeof projectSchema>;
