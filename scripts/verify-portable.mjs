import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import assert from 'node:assert/strict';
const root = resolve(process.env.BUILD_DIR || 'dist');
const files = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? files(join(dir, e.name)) : [join(dir, e.name)],
  );
let count = 0;
for (const path of files(root).filter((f) => f.endsWith('.html'))) {
  const html = readFileSync(path, 'utf8');
  assert.doesNotMatch(
    html,
    /__spacefast|hosting-banner|theme-credit|sf publish|Zero capsule/i,
    path + ': proprietary platform content',
  );
  assert.match(
    html,
    /<meta name="generator" content="Astro v/,
    path + ': native Astro output',
  );
  count++;
}
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
assert.ok(
  !Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).some((n) =>
    /spacefast|zero-runtime/i.test(n),
  ),
  'No proprietary runtime dependencies',
);
assert.match(
  readFileSync('astro.config.mjs', 'utf8'),
  /output: 'static'/,
  'Standard static Astro output',
);
console.log(
  `PASS: ${count} native Astro pages with editable promotional copy and no proprietary banners or runtime dependencies.`,
);
