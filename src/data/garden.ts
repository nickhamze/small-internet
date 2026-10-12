export interface GardenLink {
  title: string;
  href: string;
  description: string;
  category: string;
}

export const garden: GardenLink[] = [
  {
    title: 'Meet Spacefast',
    href: 'https://spacefast.com/',
    description:
      'Websites, games, and little apps deserve to leave the chat. Here is their next stop.',
    category: 'Start here',
  },
  {
    title: 'Open your dashboard',
    href: 'https://my.spacefast.com/',
    description:
      'Give your creations a place to live, then keep working on the next version.',
    category: 'Your spaces',
  },
  {
    title: 'Read the docs',
    href: 'https://spacefast.com/docs',
    description:
      'Find the publishing path that fits your agent and your project.',
    category: 'Making',
  },
];

for (const link of garden) {
  if (new URL(link.href).protocol !== 'https:')
    throw new Error('Garden links must use HTTPS.');
}
