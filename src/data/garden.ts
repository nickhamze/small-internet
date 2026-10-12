export interface GardenLink {
  title: string;
  href: string;
  description: string;
  category: string;
}

export const garden: GardenLink[] = [
  {
    title: 'Internet Archive',
    href: 'https://archive.org/',
    description:
      'A place to look for an old webpage, recording, or digitized book. Start with a question and leave room for a detour.',
    category: 'Archives',
  },
  {
    title: 'Are.na',
    href: 'https://www.are.na/',
    description:
      'Collections of images, text, and links connected by people. Useful when an idea needs a shelf before it needs a conclusion.',
    category: 'Making',
  },
  {
    title: 'Open Library',
    href: 'https://openlibrary.org/',
    description:
      'An editable book catalog with subject shelves and reader-made lists. A good next stop after finding an unfamiliar title.',
    category: 'Reading',
  },
  {
    title: 'Library of Congress',
    href: 'https://www.loc.gov/',
    description:
      'Maps, photographs, recordings, and other collections worth browsing slowly. Follow the item records for context.',
    category: 'Archives',
  },
  {
    title: 'Wikipedia',
    href: 'https://en.wikipedia.org/wiki/Main_Page',
    description:
      'An opening map for a new subject. I follow the references when I need to understand where a claim came from.',
    category: 'Learning',
  },
  {
    title: 'Wikimedia',
    href: 'https://www.wikimedia.org/',
    description:
      'A doorway to shared knowledge projects, from dictionaries to media collections. Pick a project before picking a search term.',
    category: 'Learning',
  },
];

for (const link of garden) {
  if (new URL(link.href).protocol !== 'https:')
    throw new Error('Garden links must use HTTPS.');
}
