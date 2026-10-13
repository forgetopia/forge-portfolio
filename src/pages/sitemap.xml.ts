import type { APIRoute } from 'astro';
import { site } from '../data/site';
import { getProjects, projectHref } from '../lib/projects';
import { sitemapXML } from '../lib/seo';

export const prerender = true;

export const GET: APIRoute = async () => {
  const projects = await getProjects();
  const paths = ['/', '/work/', '/about/', '/contact/', ...projects.map(({ data }) => projectHref(data.slug))];
  return new Response(sitemapXML(site.productionOrigin, paths), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
