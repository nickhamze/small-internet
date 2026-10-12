import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { site } from '../data/site';
import type { APIContext } from 'astro';
export async function GET(context: APIContext) {
  const notes = (await getCollection('notes', (e) => !e.data.draft)).sort(
    (a, b) => b.data.date.getTime() - a.data.date.getTime(),
  );
  return rss({
    title: `${site.name} — notes by ${site.owner}`,
    description: site.description,
    site: context.site || 'http://localhost:4321',
    items: notes.map((note) => ({
      title: note.data.title,
      pubDate: note.data.date,
      description: note.data.description,
      link: `/notes/${note.id}/`,
    })),
    customData: '<language>en-us</language>',
  });
}
