import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
export async function GET({ site }: APIContext) {
  const enabled = process.env.PUBLIC_INDEXING === '1' && !!site;
  const routes = [
    '/',
    '/notes/',
    '/projects/',
    '/now/',
    '/collections/',
    '/garden/',
    '/guestbook/',
    '/theme/',
  ];
  for (const [collection, path] of [
    ['notes', 'notes'],
    ['projects', 'projects'],
    ['items', 'collections'],
  ] as const) {
    for (const entry of await getCollection(collection, (e) => !e.data.draft)) {
      routes.push(`/${path}/${entry.id}/`);
    }
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${enabled ? routes.map((path) => `<url><loc>${new URL(path, site).href.replaceAll('&', '&amp;')}</loc></url>`).join('') : ''}</urlset>`;
  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
