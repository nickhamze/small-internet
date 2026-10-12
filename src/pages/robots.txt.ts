import type { APIContext } from 'astro';
export function GET({ site }: APIContext) {
  const publicIndex = process.env.PUBLIC_INDEXING === '1' && !!site;
  return new Response(
    publicIndex
      ? `User-agent: *\nAllow: /\nSitemap: ${new URL('/sitemap.xml', site)}\n`
      : 'User-agent: *\nDisallow: /\n',
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
}
