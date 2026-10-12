import { defineConfig } from 'astro/config';
const site = process.env.SITE_URL;
if (
  site &&
  (!/^https?:\/\//.test(site) ||
    new URL(site).pathname !== '/' ||
    new URL(site).username ||
    new URL(site).password ||
    new URL(site).search ||
    new URL(site).hash)
)
  throw new Error('SITE_URL must be an absolute origin without a path.');
if (
  process.env.PUBLIC_INDEXING === '1' &&
  (!site || !site.startsWith('https://'))
)
  throw new Error('Public indexing requires your verified HTTPS SITE_URL.');
export default defineConfig({
  site,
  output: 'static',
  trailingSlash: 'always',
  devToolbar: { enabled: false },
  outDir: process.env.BUILD_DIR || './dist',
});
