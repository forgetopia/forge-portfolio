export const site = {
  name: 'FORGE',
  tagline: 'Visual Universe',
  description:
    'An independent visual universe exploring cinematic AI filmmaking, imagined worlds, and digital art.',
  // Add a verified public contact address before enabling the email link.
  contactEmail: null as string | null,
};

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
