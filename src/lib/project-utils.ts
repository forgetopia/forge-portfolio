import { projectCategories, type ProjectCategory, type ProjectData } from './project-schema';

type SortableProject = { data: Pick<ProjectData, 'order' | 'slug'> };

/** Derive collection identity from the file, independently of its editable slug. */
export function projectIdFromFilename(filename: string): string {
  return filename.replace(/\.json$/, '');
}

/** Make editorial order deterministic without mutating the collection array. */
export function sortProjects<Project extends SortableProject>(projects: readonly Project[]): Project[] {
  return [...projects].sort((first, second) => (
    first.data.order - second.data.order || first.data.slug.localeCompare(second.data.slug)
  ));
}

/** Keep filenames and generated routes in agreement before rendering any page. */
export function validateProjectEntries(
  projects: readonly { id: string; data: Pick<ProjectData, 'slug'> }[],
): void {
  const slugs = new Set<string>();

  for (const project of projects) {
    if (slugs.has(project.data.slug)) {
      throw new Error(`Duplicate portfolio slug: ${project.data.slug}`);
    }

    if (project.id !== project.data.slug) {
      throw new Error(`Project filename ${project.id}.json must match slug ${project.data.slug}.`);
    }

    slugs.add(project.data.slug);
  }
}

export function getFeaturedProjects<Project extends SortableProject & {
  data: Pick<ProjectData, 'order' | 'slug' | 'featured'>;
}>(projects: readonly Project[]): Project[] {
  return sortProjects(projects).filter(({ data }) => data.featured);
}

export function projectHref(slug: string): string {
  return `/work/${slug}/`;
}

export function categoryLabel(id: ProjectCategory): string {
  return projectCategories.find((category) => category.id === id)!.label;
}
