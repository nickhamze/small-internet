import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const child = spawn(
  process.execPath,
  [
    fileURLToPath(new URL('../node_modules/astro/astro.js', import.meta.url)),
    'dev',
    '--host',
    '127.0.0.1',
  ],
  { env: { ...process.env, HOSTING_PREVIEW: '1' }, stdio: 'inherit' },
);
child.on('error', (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
