import { getCollection, type CollectionEntry } from 'astro:content';
import { sortProjects, validateProjectEntries } from './project-utils';

export { projectCategories } from './project-schema';
export type { ProjectCategory, ProjectData } from './project-schema';
export { categoryLabel, getFeaturedProjects, projectHref, sortProjects } from './project-utils';

export type ProjectEntry = CollectionEntry<'projects'>;

export async function getProjects(): Promise<ProjectEntry[]> {
  const projects = await getCollection('projects');
  validateProjectEntries(projects);
  return sortProjects(projects);
}
