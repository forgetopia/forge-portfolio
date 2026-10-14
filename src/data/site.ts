import { siteConfigSchema } from '../lib/site-schema';
import { resolveSiteOrigin } from '../lib/site-origin';

// Routine identity, About, and Contact updates belong here. Add only owner-approved details.
export const site = siteConfigSchema.parse({
  name: 'FORGE',
  tagline: 'Visual Universe',
  description:
    'An independent visual universe exploring cinematic AI filmmaking, imagined worlds, and digital art.',
  // Add a verified public contact address before enabling the email link.
  contactEmail: null,
  creatorDisplayName: null,
  // Suggested positioning: AI Filmmaker · AI Visual Artist · Creative Director.
  // Keep null until the owner approves a title that accurately describes their practice.
  professionalTitle: null,
  studioName: null,
  shortBio: null,
  // Focus territories describe the brand direction, not personal credentials or completed work.
  creativeDisciplines: [
    'Cinematic AI Filmmaking',
    'Fantasy & Science Fiction',
    'Action & Combat Choreography',
    'AI Photography',
    'Fashion Editorial',
    'Surreal & Experimental Art',
    'Commercial & Branded Visual Content',
  ],
  // Add accurate, approved { title, description } entries before advertising services or skills.
  creativeServices: [],
  capabilities: [],
  profileImage: null,
  // Add approved { label, url } entries; public HTTPS profile links only.
  socialLinks: [],
  collaborationAvailability: 'unspecified',
  collaborationIntroduction: null,
  contactSubject: 'FORGE — Creative collaboration',
  // SSG resolves this per build; direct Node tooling uses the same environment override.
  productionOrigin: resolveSiteOrigin(import.meta.env?.FORGE_SITE_ORIGIN ?? process.env.FORGE_SITE_ORIGIN),
  about: {
    introductionHeading: 'Human imagination. New possibilities.',
    introductionDescription: 'FORGE is an independent visual universe. Built on curiosity. Shaped by imagination.',
    philosophyHeading: 'The tools evolve. The impulse to create stays.',
    philosophyParagraphs: [
      'FORGE explores what happens when cinematic thinking meets emerging creative tools. Film, digital art, fantasy worlds, fashion, and surreal imagery are all part of the same conversation.',
      'AI is part of the process. The intention is human: to find an atmosphere, evoke a feeling, and bring something unexpected into view.',
    ],
    principles: [
      { title: 'Feeling first.', description: 'Every image begins with the atmosphere it should create.' },
      { title: 'Beyond the familiar.', description: "Follow an idea into places that don't exist yet." },
      { title: 'Consider every detail.', description: 'From the first frame to the smallest texture, make it matter.' },
    ],
    workflowIntroduction: 'A typical AI-assisted production process connects creative intention with image-making, motion, and finishing. This editable outline describes an approach, not a record of completed productions.',
    productionWorkflow: [
      { title: 'Creative direction & storytelling', description: 'Define the idea, narrative intention, visual references, and the feeling each sequence should carry.' },
      { title: 'AI image generation & visual development', description: 'Explore characters, environments, composition, and lighting; curate frames against the creative direction.' },
      { title: 'Video generation & sequence building', description: 'Translate selected imagery into motion studies and shape shots around timing, continuity, and cinematic storytelling.' },
      { title: 'Compositing & post-production', description: 'Bring selected elements together, refine the edit, and review color, sound, captions, and final delivery.' },
    ],
    capabilitiesIntroduction: 'Selected skills and capabilities will be listed here once accurate details have been supplied and approved. The workflow above outlines creative stages rather than verified professional credentials.',
    collaborationHeading: 'A new universe begins with an idea.',
    collaborationDescription: 'Discover the creative direction behind FORGE, or visit the collaboration page for public contact details when they are available.',
  },
});

export const navigation = [
  { label: 'Work', href: '/work/' },
  { label: 'About', href: '/about/' },
  { label: 'Contact', href: '/contact/' },
] as const;

export const disciplines = [
  {
    number: '01',
    name: 'Cinematic films',
    category: 'Motion & narrative',
    description: 'Atmosphere, emotion, and stories that stay with you.',
    image: '/art/horizon.svg',
    imageClass: 'study-horizon',
  },
  {
    number: '02',
    name: 'Imagined worlds',
    category: 'Worldbuilding & fantasy',
    description: 'Unfamiliar places. Impossible landscapes. New perspectives.',
    image: '/art/terrain.svg',
    imageClass: 'study-terrain',
  },
  {
    number: '03',
    name: 'Digital expression',
    category: 'Art & visual exploration',
    description: 'An exploration of form, texture, fashion, and the surreal.',
    image: '/art/form.svg',
    imageClass: 'study-form',
  },
] as const;
