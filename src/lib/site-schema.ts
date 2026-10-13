import { z } from 'astro/zod';
import { imageMediaSchema } from './project-schema';

const text = z.string().trim().min(1);
const optionalText = text.nullable().default(null);
const publicEmail = z.string().trim().pipe(z.email('Use a verified public email address.'));
const contentItem = z.object({ title: text, description: text }).strict();

/** Profile links are public HTTPS URLs, without embedded authentication. */
export const socialLinkSchema = z.object({
  label: text,
  url: z.string().trim().pipe(z.url()).superRefine((value, context) => {
    let url: URL;
    try { url = new URL(value); } catch { return; }
    if (url.protocol !== 'https:' || url.username || url.password) {
      context.addIssue({ code: 'custom', message: 'Use an HTTPS profile URL without credentials.' });
    }
  }),
}).strict();

export const productionOriginSchema = z.string().trim().pipe(z.url()).superRefine((value, context) => {
  let url: URL;
  try { url = new URL(value); } catch { return; }
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    context.addIssue({ code: 'custom', message: 'Use the verified HTTPS production origin without a path, query, or credentials.' });
  }
});

export const collaborationAvailabilityValues = ['unspecified', 'open', 'limited', 'unavailable'] as const;
export type CollaborationAvailability = (typeof collaborationAvailabilityValues)[number];

/** Optional personal fields stay absent until the owner supplies verified details. */
export const siteConfigSchema = z.object({
  name: text,
  tagline: text,
  description: text,
  contactEmail: publicEmail.nullable().default(null),
  creatorDisplayName: optionalText,
  professionalTitle: optionalText,
  studioName: optionalText,
  shortBio: optionalText,
  creativeDisciplines: z.array(text).default([]),
  creativeServices: z.array(contentItem).default([]),
  capabilities: z.array(contentItem).default([]),
  profileImage: imageMediaSchema.nullable().default(null),
  socialLinks: z.array(socialLinkSchema).default([]),
  collaborationAvailability: z.enum(collaborationAvailabilityValues).default('unspecified'),
  collaborationIntroduction: optionalText,
  contactSubject: text.max(200).regex(/^[^\u0000-\u001f\u007f]+$/, 'The email subject must be a single line.').default('FORGE — Creative collaboration'),
  productionOrigin: productionOriginSchema.nullable().default(null),
  about: z.object({
    introductionHeading: text,
    introductionDescription: text,
    philosophyHeading: text,
    philosophyParagraphs: z.array(text).min(1),
    principles: z.array(contentItem).min(1),
    workflowIntroduction: text,
    productionWorkflow: z.array(contentItem).min(1),
    capabilitiesIntroduction: text,
    collaborationHeading: text,
    collaborationDescription: text,
  }).strict(),
}).strict();

export type SiteConfig = z.infer<typeof siteConfigSchema>;

/** Percent-encode the address parts and subject so author content cannot add headers. */
export function buildMailtoLink(email: string | null, subject: string): string | null {
  if (email === null) return null;
  const address = publicEmail.parse(email).split('@').map(encodeURIComponent).join('@');
  const safeSubject = siteConfigSchema.shape.contactSubject.parse(subject);
  return `mailto:${address}?subject=${encodeURIComponent(safeSubject)}`;
}

export function collaborationAvailabilityLabel(status: CollaborationAvailability): string | null {
  switch (status) {
    case 'open': return 'Open to collaboration';
    case 'limited': return 'Limited collaboration availability';
    case 'unavailable': return 'Currently unavailable for new collaborations';
    case 'unspecified': return null;
  }
}
