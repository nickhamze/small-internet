import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';
import { site } from '../src/data/site.ts';
const escape = (s: string) =>
  s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
const palettes = {
  personal: ['#cdc3f4', '#fff7df', '#ee654c'],
  notebook: ['#f2f077', '#fff7df', '#bba0ea'],
  garden: ['#c3ecd0', '#fff7df', '#d5482c'],
};
const [canvas, paper, hot] = palettes[site.defaultLook];
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="${canvas}"/><path d="M35 30 1165 36 1160 594 39 600Z" fill="none" stroke="#19181b" stroke-width="4"/><text x="75" y="115" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="34" fill="#19181b">${escape(site.name.toUpperCase().slice(0, 32))}</text><path d="m62 171 723-9 13 332-729 8Z" fill="${paper}"/><text x="90" y="287" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="89" fill="#19181b">HELLO,</text><text x="90" y="381" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="89" fill="#19181b">INTERNET!</text><path d="m95 407 590-6" stroke="${hot}" stroke-width="12" stroke-linecap="round"/><text x="90" y="462" font-family="Arial,sans-serif" font-size="25" fill="#19181b">I’m ${escape(site.owner.slice(0, 28))}. Welcome to my little corner.</text><text x="75" y="557" font-family="Arial,sans-serif" font-size="21" fill="#19181b">NOTES / PROJECTS / GOOD LINKS</text></svg>`;
const mascot = await sharp(`public/assets/oddball-${site.defaultLook}.webp`)
  .resize(365, 365, { fit: 'contain' })
  .png()
  .toBuffer();
await sharp(Buffer.from(svg))
  .composite([{ input: mascot, left: 798, top: 160 }])
  .png()
  .toFile('public/social.png');
await writeFile(
  'public/favicon.svg',
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="${canvas}"/><path d="m10 9 45 2-2 40-42 1Z" fill="${paper}" stroke="#19181b" stroke-width="3"/><rect x="16" y="16" width="32" height="25" rx="4" fill="#19181b"/><ellipse cx="25" cy="28" rx="5" ry="8" fill="white"/><ellipse cx="39" cy="27" rx="5" ry="8" fill="white"/><circle cx="24" cy="29" r="2.5" fill="#19181b"/><circle cx="38" cy="28" r="2.5" fill="#19181b"/><path d="M18 53v5m27-6v5" stroke="#19181b" stroke-width="4" stroke-linecap="round"/></svg>`,
);
