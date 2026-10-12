#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  cp,
  mkdir,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
  access,
} from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fixture = join(root, 'output/authoring-fixture');
const origin = 'https://authoring-fixture.invalid';
const env = {
  ...process.env,
  SITE_URL: origin,
  PUBLIC_INDEXING: '1',
  SPACEFAST_HOSTED: '0',
  HOSTING_PREVIEW: '0',
  BUILD_DIR: './dist',
};
await rm(fixture, { recursive: true, force: true });
await mkdir(fixture, { recursive: true });
for (const path of [
  'src',
  'public',
  'astro.config.mjs',
  'tsconfig.json',
  'package.json',
  'package-lock.json',
]) {
  await cp(join(root, path), join(fixture, path), { recursive: true });
}
await mkdir(join(fixture, 'scripts'), { recursive: true });
await cp(
  join(root, 'scripts/generate-assets.ts'),
  join(fixture, 'scripts/generate-assets.ts'),
);
await symlink(join(root, 'node_modules'), join(fixture, 'node_modules'), 'dir');
const contentRoot = join(fixture, 'src/content');
const results = [];
async function content(collection, path, title, { draft = false, slug } = {}) {
  const destination = join(contentRoot, collection, path);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(
    destination,
    `---\ntitle: "${title}"\ndescription: "Isolated authoring fixture"\ndate: 2026-10-08\ncategory: "Fixture"\ndraft: ${draft}\n${slug ? `slug: "${slug}"\n` : ''}---\n\n## Fixture body\n\n${title} body marker.\n`,
  );
}
async function build(label) {
  await rm(join(fixture, 'dist'), { recursive: true, force: true });
  await rm(join(fixture, '.astro'), { recursive: true, force: true });
  try {
    const output = execFileSync('npm', ['run', 'build'], {
      cwd: fixture,
      env,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    await writeFile(join(fixture, `${label}-build.log`), output);
  } catch (error) {
    console.error(error.stdout?.toString(), error.stderr?.toString());
    throw error;
  }
}
async function built(path) {
  return readFile(join(fixture, 'dist', path), 'utf8');
}
async function absent(path) {
  await assert.rejects(access(join(fixture, 'dist', path)), { code: 'ENOENT' });
}
async function publicText(dir = join(fixture, 'dist')) {
  let text = '';
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) text += await publicText(path);
    else if (/\.(html|xml)$/.test(entry.name))
      text += await readFile(path, 'utf8');
  }
  return text;
}
async function emptyArchives(label) {
  const cases = [
    ['notes', 'No published notes yet.'],
    ['projects', 'No published projects yet.'],
    ['collections', 'No published collection items yet.'],
  ];
  for (const [route, copy] of cases) {
    const html = await built(`${route}/index.html`);
    assert(html.includes(copy), `${label}: missing ${route} empty copy`);
    assert(
      !html.includes('data-filter-group'),
      `${label}: empty ${route} has a pointless filter`,
    );
  }
  assert(
    !(await built('rss.xml')).includes('<item>'),
    `${label}: RSS should have no entries`,
  );
}

await content('notes', 'walks/nested-note.md', 'AUTHORING_NESTED_PUBLIC');
await content('notes', 'custom-source.md', 'AUTHORING_CUSTOM_PUBLIC', {
  slug: 'custom/path-note',
});
for (const collection of ['notes', 'projects', 'items'])
  await content(
    collection,
    'private-draft.md',
    `AUTHORING_PRIVATE_${collection}`,
    { draft: true },
  );
await build('nested-drafts');
assert(
  (await built('notes/walks/nested-note/index.html')).includes(
    'AUTHORING_NESTED_PUBLIC',
  ),
);
assert(
  (await built('notes/custom/path-note/index.html')).includes(
    'AUTHORING_CUSTOM_PUBLIC',
  ),
);
for (const path of ['notes/walks/nested-note/', 'notes/custom/path-note/']) {
  assert((await built('notes/index.html')).includes(`href="/${path}"`));
  assert((await built('rss.xml')).includes(`${origin}/${path}`));
  assert((await built('sitemap.xml')).includes(`${origin}/${path}`));
}
assert(
  !(await publicText()).includes('AUTHORING_PRIVATE_'),
  'Draft content leaked into HTML/XML',
);
assert(
  !(await built('rss.xml')).includes('private-draft'),
  'Draft path leaked into RSS',
);
assert(
  !(await built('sitemap.xml')).includes('private-draft'),
  'Draft path leaked into sitemap',
);
for (const route of ['notes', 'projects', 'collections'])
  await absent(`${route}/private-draft/index.html`);
results.push(
  'Nested and custom-slug note routes, archives, RSS and sitemap passed; drafts omitted from all HTML/XML and all three detail route groups.',
);

await rm(contentRoot, { recursive: true, force: true });
for (const collection of ['notes', 'projects', 'items'])
  await content(
    collection,
    'only-draft.md',
    `AUTHORING_ALL_DRAFT_${collection}`,
    { draft: true },
  );
await build('all-drafts');
await emptyArchives('all-drafts');
assert(!(await publicText()).includes('AUTHORING_ALL_DRAFT_'));
for (const route of ['notes', 'projects', 'collections'])
  await absent(`${route}/only-draft/index.html`);
assert(!(await built('sitemap.xml')).includes('only-draft'));
results.push(
  'All-draft collections built with explicit empty archive copy, no filters/feed entries, and no draft detail/map output.',
);

await rm(contentRoot, { recursive: true, force: true });
for (const collection of ['notes', 'projects', 'items'])
  await mkdir(join(contentRoot, collection), { recursive: true });
await build('empty');
await emptyArchives('empty');
const sitemap = await built('sitemap.xml');
for (const route of ['notes', 'projects', 'collections'])
  assert(
    !new RegExp(`<loc>${origin}/${route}/[^<]+</loc>`).test(sitemap),
    'Empty collection produced detail sitemap URL',
  );
results.push(
  'Physically empty collection folders built with explicit empty archive copy and no entry feed/map output.',
);
await writeFile(
  join(fixture, 'results.json'),
  JSON.stringify(
    {
      astro: '7.3.8',
      mode: 'isolated synthetic public candidate',
      origin,
      results,
    },
    null,
    2,
  ),
);
for (const result of results) console.log(`PASS ${result}`);
console.log(
  'Only output/authoring-fixture was mutated. No publication or external account actions.',
);
