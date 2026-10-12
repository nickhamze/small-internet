#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve, relative, extname, join } from 'node:path';

const root = resolve(process.env.BUILD_DIR || 'dist');
const publicIndexing = process.env.PUBLIC_INDEXING === '1';
let siteUrl = null;
const errors = [];
if (process.env.SITE_URL) {
  try {
    siteUrl = new URL(process.env.SITE_URL);
  } catch {
    errors.push('SITE_URL must be a valid absolute URL');
  }
}
if (
  publicIndexing &&
  (!siteUrl || siteUrl.protocol !== 'https:' || siteUrl.pathname !== '/')
) {
  errors.push(
    'PUBLIC_INDEXING=1 requires an HTTPS SITE_URL origin without a path',
  );
}

function filesUnder(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    return entry.isDirectory() ? filesUnder(full) : [full];
  });
}

function routeFor(file) {
  const rel = relative(root, file).split('\\').join('/');
  if (rel === 'index.html') return '/';
  if (rel.endsWith('/index.html'))
    return `/${rel.slice(0, -'index.html'.length)}`;
  return `/${rel}`;
}

const htmlFiles = filesUnder(root).filter(
  (file) => extname(file).toLowerCase() === '.html',
);
if (!htmlFiles.length) errors.push(`No HTML pages found under ${root}`);
if (!existsSync(root)) errors.push(`Build directory does not exist: ${root}`);

const allHtml = htmlFiles.map((file) => ({
  file,
  route: routeFor(file),
  html: readFileSync(file, 'utf8'),
}));
const publicPages = allHtml.filter(
  (page) => page.route !== '/404.html' && !page.route.endsWith('/404/'),
);
const knownFiles = new Set(
  filesUnder(root).map((file) => relative(root, file).split('\\').join('/')),
);

function attr(tag, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = tag.match(
    new RegExp(`\\b${escaped}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'),
  );
  return match ? (match[1] ?? match[2] ?? match[3] ?? '') : '';
}

function findMeta(html, key, value) {
  return [...html.matchAll(/<meta\b[^>]*>/gi)].find((match) => {
    const tag = match[0];
    return attr(tag, key).toLowerCase() === value.toLowerCase();
  })?.[0];
}

function targetExists(pathname) {
  let path;
  try {
    path = decodeURIComponent(pathname);
  } catch {
    return false;
  }
  path = path.replace(/^\/+/, '');
  if (!path || pathname.endsWith('/'))
    return knownFiles.has(`${path}index.html`);
  if (knownFiles.has(path)) return true;
  if (knownFiles.has(`${path}/index.html`)) return true;
  if (!extname(path) && knownFiles.has(`${path}.html`)) return true;
  return false;
}

for (const page of allHtml) {
  const label = relative(root, page.file).split('\\').join('/');
  if (!/<title\b[^>]*>\s*[^<\s][\s\S]*?<\/title>/i.test(page.html))
    errors.push(`${label}: missing or empty <title>`);
  const description = findMeta(page.html, 'name', 'description');
  if (!description || !attr(description, 'content').trim())
    errors.push(`${label}: missing meta description`);
  const main = page.html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] || '';
  const h1 = main.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || '';
  const headingText = h1
    .replace(/<[^>]*>/g, '')
    .replace(/&(?:nbsp|amp|lt|gt|quot|#39);/g, ' ')
    .trim();
  const mainText = main
    .replace(/<(?:script|style)\b[^>]*>[\s\S]*?<\/(?:script|style)>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!headingText || !mainText)
    errors.push(`${label}: missing crawlable main content or h1`);

  const robots = findMeta(page.html, 'name', 'robots');
  if (page.route === '/404.html') {
    if (!robots || !/noindex/i.test(attr(robots, 'content')))
      errors.push(`${label}: 404 page must be noindex`);
  } else if (publicIndexing) {
    if (!robots || !/index\s*,\s*follow/i.test(attr(robots, 'content')))
      errors.push(`${label}: expected robots index, follow`);
    const canonical = [...page.html.matchAll(/<link\b[^>]*>/gi)].find(
      (match) => attr(match[0], 'rel').toLowerCase() === 'canonical',
    );
    const expectedCanonical = siteUrl
      ? new URL(page.route, siteUrl).href
      : null;
    if (
      !canonical ||
      !expectedCanonical ||
      attr(canonical[0], 'href') !== expectedCanonical
    )
      errors.push(`${label}: missing or incorrect canonical URL`);
    const ogImage = findMeta(page.html, 'property', 'og:image');
    const twitterImage = findMeta(page.html, 'name', 'twitter:image');
    if (!ogImage || !attr(ogImage, 'content').trim())
      errors.push(`${label}: missing og:image`);
    if (!twitterImage || !attr(twitterImage, 'content').trim())
      errors.push(`${label}: missing twitter:image`);
  } else if (
    !robots ||
    !/noindex\s*,\s*nofollow/i.test(attr(robots, 'content'))
  ) {
    errors.push(`${label}: preview build must be noindex, nofollow`);
  }

  if (
    /\bdata-draft\s*=\s*["']?true\b/i.test(page.html) ||
    /\b(?:DRAFT_ONLY|PRIVATE_DRAFT|draft-only)\b/i.test(page.html)
  ) {
    errors.push(`${label}: draft-only marker leaked into built HTML`);
  }

  const tags = [
    ...page.html.matchAll(
      /<(?:a|area|link|script|img|source|video|audio|iframe)\b[^>]*>/gi,
    ),
  ].map((match) => match[0]);
  for (const tag of tags) {
    const tagName = tag.match(/^<([\w-]+)/)?.[1]?.toLowerCase();
    if (tagName === 'link' && attr(tag, 'rel').toLowerCase() === 'canonical')
      continue;
    const attrName = ['a', 'area', 'link'].includes(tagName) ? 'href' : 'src';
    const value = attr(tag, attrName).trim();
    if (
      !value ||
      value.startsWith('#') ||
      /^(?:mailto:|tel:|data:|javascript:|blob:)/i.test(value)
    )
      continue;
    let url;
    try {
      url = new URL(value, siteUrl || 'https://local.invalid/');
    } catch {
      errors.push(`${label}: invalid ${attrName} URL ${value}`);
      continue;
    }
    if (siteUrl && url.origin !== siteUrl.origin) continue;
    if (!siteUrl && /^https?:/i.test(value)) continue;
    if (!targetExists(url.pathname))
      errors.push(`${label}: broken internal ${attrName} ${value}`);
  }
}

const favicon = join(root, 'favicon.svg');
if (!existsSync(favicon)) errors.push('Missing root favicon.svg');
const social = join(root, 'social.png');
if (!existsSync(social)) errors.push('Missing root social.png');
if (!existsSync(join(root, 'rss.xml'))) errors.push('Missing rss.xml');

const robotsPath = join(root, 'robots.txt');
if (!existsSync(robotsPath)) errors.push('Missing robots.txt');
else {
  const robotsText = readFileSync(robotsPath, 'utf8');
  if (publicIndexing) {
    if (!/^User-agent: \*\s*\nAllow: \/\s*\n/m.test(robotsText))
      errors.push('Public robots.txt must allow crawling');
    if (
      !siteUrl ||
      !robotsText.includes(
        new URL('/sitemap.xml', siteUrl || 'https://invalid.example').href,
      )
    )
      errors.push('Public robots.txt must point to the SITE_URL sitemap');
  } else if (!/^User-agent: \*\s*\nDisallow: \/\s*$/m.test(robotsText.trim())) {
    errors.push('Preview robots.txt must disallow crawling');
  }
}

const sitemapPath = join(root, 'sitemap.xml');
if (!existsSync(sitemapPath)) errors.push('Missing sitemap.xml');
else {
  const sitemap = readFileSync(sitemapPath, 'utf8');
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/gi)].map((match) =>
    match[1].replaceAll('&amp;', '&'),
  );
  if (!publicIndexing && urls.length !== 0)
    errors.push(`Preview sitemap must be empty; found ${urls.length} URLs`);
  if (publicIndexing && siteUrl) {
    const expected = publicPages
      .map((page) => new URL(page.route, siteUrl).href)
      .sort();
    const actual = [...urls].sort();
    if (
      actual.length !== expected.length ||
      actual.some((url, index) => url !== expected[index])
    ) {
      errors.push(
        `Public sitemap should contain exactly ${expected.length} built public routes (excluding 404); found ${actual.length}`,
      );
    }
    for (const url of urls) {
      const parsed = new URL(url);
      if (
        parsed.origin !== siteUrl.origin ||
        parsed.pathname === '/404.html' ||
        parsed.pathname.endsWith('/404/')
      )
        errors.push(`Invalid sitemap URL: ${url}`);
    }
  }
}

for (const error of errors) console.error(`FAIL ${error}`);
console.log(
  `Checked ${allHtml.length} HTML pages (${publicPages.length} public routes; ${publicIndexing ? 'public indexing' : 'preview'} mode) in ${root}`,
);
if (errors.length) {
  console.error(`${errors.length} check(s) failed.`);
  process.exitCode = 1;
} else {
  console.log(
    'Static metadata, crawl controls, local assets, routes, internal links, and draft markers passed.',
  );
}
