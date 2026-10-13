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

const coverSchema = z
  .object({
    src: z.string().regex(
      /^\/(?:placeholders|images)\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.(?:avif|gif|jpe?g|png|svg|webp)$/,
      'Use a local image in /placeholders/ or /images/.',
    ),
    alt: nonemptyText,
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    orientation: z.enum(['landscape', 'portrait']),
    placeholder: z.boolean(),
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
    cover: coverSchema,
    featured: z.boolean().default(false),
    order: z.number().int().nonnegative().default(0),
    sample: z.boolean().default(false),
  })
  .strict();

export type ProjectData = z.infer<typeof projectSchema>;
