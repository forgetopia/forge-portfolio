import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { projectSchema } from './lib/project-schema';
import { projectIdFromFilename } from './lib/project-utils';

const projects = defineCollection({
  loader: glob({
    pattern: '*.json',
    base: './src/content/projects',
    // Astro otherwise prefers data.slug, hiding filename mismatches and duplicate slugs.
    generateId: ({ entry }) => projectIdFromFilename(entry),
  }),
  schema: projectSchema,
});

export const collections = { projects };
