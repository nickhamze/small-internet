import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import assert from 'node:assert/strict';
// Official vector supplied by Spacefast; brand geometry is not generated art.
const expected =
  'f88ca285b34f2c28e73ac5481b8d2fd8980c3c451808851c74f13613017b7945';
const root = resolve(process.env.BUILD_DIR || 'dist');
assert.equal(
  createHash('sha256')
    .update(readFileSync(join(root, 'assets/spacefast-wordmark.svg')))
    .digest('hex'),
  expected,
  'Official wordmark must remain unmodified',
);
const files = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? files(join(dir, e.name)) : [join(dir, e.name)],
  );
let n = 0;
for (const path of files(root).filter((f) => f.endsWith('.html'))) {
  const html = readFileSync(path, 'utf8');
  const footer = html.match(/<footer\b[\s\S]*?<\/footer>/)?.[0] || '';
  const credit =
    footer.match(/<a\b[^>]*class="theme-credit"[\s\S]*?<\/a>/)?.[0] || '';
  assert.match(
    credit,
    /href="https:\/\/spacefast\.com\/"/,
    path + ': footer brand link',
  );
  assert.match(
    credit,
    /src="\/assets\/spacefast-wordmark\.svg"/,
    path + ': footer official asset',
  );
  n++;
}
console.log(
  `PASS: official vector and permanent spacefast.com footer credit on ${n} HTML pages.`,
);
