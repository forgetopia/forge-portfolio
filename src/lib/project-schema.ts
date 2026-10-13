import { z } from 'astro/zod';
import { mediaPolicy } from '../data/media';
import { createMediaPolicy, isAllowedMediaSource, mediaSourcePathname, type MediaPolicy } from './media-policy';

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

export function createImageMediaSchema(policy: MediaPolicy = mediaPolicy) {
  const approvedPolicy = createMediaPolicy(policy);
  return z
    .object({
      src: z.string().refine(
        (source) => isAllowedMediaSource(source, 'image', approvedPolicy),
        'Use a safe local image in /placeholders/, /images/, or /art/, or an image on an approved HTTPS media origin.',
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
}

export const imageMediaSchema = createImageMediaSchema();

export type ImageData = z.infer<typeof imageMediaSchema>;

/** Explicit metadata keeps local and approved remote media loading predictable. */
export function createVideoMediaSchema(policy: MediaPolicy = mediaPolicy) {
  const approvedPolicy = createMediaPolicy(policy);
  return z
    .object({
      src: z.string().refine(
        (source) => isAllowedMediaSource(source, 'video', approvedPolicy),
        'Use a safe local MP4 or WebM video in /media/, or a video on an approved HTTPS media origin.',
      ),
      type: z.enum(['video/mp4', 'video/webm']),
      width: z.number().int().positive(),
      height: z.number().int().positive(),
      orientation: z.enum(['landscape', 'portrait']),
      placeholder: z.boolean(),
      poster: createImageMediaSchema(approvedPolicy).optional(),
      hasAudio: z.boolean().default(false),
      captions: z.array(z.object({
        src: z.string().refine(
          (source) => isAllowedMediaSource(source, 'captions', approvedPolicy),
          'Use a safe local WebVTT caption file in /media/, or captions on an approved HTTPS media origin.',
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

      if (!mediaSourcePathname(video.src)?.toLowerCase().endsWith(video.type === 'video/mp4' ? '.mp4' : '.webm')) {
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
}

export const videoMediaSchema = createVideoMediaSchema();

export type VideoData = z.infer<typeof videoMediaSchema>;

/** Portfolio metadata is validated during Astro sync and every production build. */
export function createProjectSchema(policy: MediaPolicy = mediaPolicy) {
  const images = createImageMediaSchema(policy);
  const videos = createVideoMediaSchema(policy);
  return z
    .object({
      slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use a lowercase kebab-case slug.'),
      title: nonemptyText,
      subtitle: nonemptyText.optional(),
      year: z.number().int().min(1900).max(2100).optional(),
      format: nonemptyText.optional(),
      duration: nonemptyText.optional(),
      aspectRatio: z.string().trim().regex(
        /^[1-9]\d{0,3}(?:\.\d{1,3})?:[1-9]\d{0,3}(?:\.\d{1,3})?$/,
        'Use a positive aspect ratio, such as 16:9, 9:16, or 2.39:1.',
      ).optional(),
      tools: z.array(nonemptyText).optional(),
      productionRole: nonemptyText.optional(),
      overview: nonemptyText.optional(),
      productionWorkflow: z.array(nonemptyText).optional(),
      summary: nonemptyText,
      description: z.array(nonemptyText).min(1),
      categories: z.array(z.enum(categoryIds)).min(1).refine(
        (categories) => new Set(categories).size === categories.length,
        'Project categories must be unique.',
      ),
      cover: images,
      video: videos.optional(),
      previewVideo: videos.optional(),
      synopsis: nonemptyText.optional(),
      creativeDirection: z.array(nonemptyText).default([]),
      credits: z.array(z.object({ role: nonemptyText, name: nonemptyText }).strict()).default([]),
      stills: z.array(images).default([]),
      featured: z.boolean().default(false),
      order: z.number().int().nonnegative().default(0),
      sample: z.boolean().default(false),
      // Omission preserves legacy samples; other new records remain private until published.
      status: z.enum(['draft', 'published']).optional(),
    })
    .strict();
}

export const projectSchema = createProjectSchema();

export type ProjectData = z.infer<typeof projectSchema>;
