#!/usr/bin/env node
import { cp, mkdir, readdir, rm, stat } from 'node:fs/promises';
import { dirname, resolve, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const stage = join(root, 'output/clean-source');
const allow = [
  'src',
  'public',
  'licenses',
  'package.json',
  'package-lock.json',
  'astro.config.mjs',
  'tsconfig.json',
  '.gitignore',
  'README.md',
  'preview.png',
  'preview-notebook.png',
  'preview-garden.png',
  'LICENSE',
  'THIRD-PARTY-NOTICES.md',
  'scripts/generate-assets.ts',
  'scripts/package.mjs',
  'scripts/verify-static.mjs',
  'scripts/verify-behavior.mjs',
  'scripts/verify-authoring.mjs',
  'scripts/verify-brand.mjs',
  'scripts/demo.mjs',
  '.prettierrc.mjs',
  '.prettierignore',
  '.github/workflows/ci.yml',
];
const forbidden =
  /^(?:node_modules|dist|\.astro|\.spacefast|design|screens|history|output)$|^\.env/;
async function copySafe(source, target) {
  const info = await stat(source);
  if (info.isDirectory()) {
    await mkdir(target, { recursive: true });
    for (const entry of await readdir(source, { withFileTypes: true })) {
      if (entry.isSymbolicLink() || forbidden.test(entry.name)) continue;
      await copySafe(join(source, entry.name), join(target, entry.name));
    }
  } else {
    await mkdir(dirname(target), { recursive: true });
    await cp(source, target);
  }
}
await rm(stage, { recursive: true, force: true });
await mkdir(stage, { recursive: true });
for (const path of allow) await copySafe(join(root, path), join(stage, path));
console.log(`Clean source staged: ${relative(root, stage)}`);
if (process.argv.includes('--zip')) {
  // Run only after completing and recording the independent final review.
  const zip = join(root, 'output/small-internet-1.0.0.zip');
  await rm(zip, { force: true });
  execFileSync('zip', ['-q', '-r', zip, '.'], { cwd: stage });
  console.log(`ZIP created: ${relative(root, zip)}`);
}
