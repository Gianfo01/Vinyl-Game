// Masters 31 — build de arquivo único: vite build com tudo embutido + inline de JS/CSS no HTML.
// Uso: node scripts/r31/build-single.mjs Masters_31_ondaN.html
import { build } from 'vite';
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { statSync } from 'node:fs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const out = resolve(root, process.argv[2] ?? 'Masters_31.html');
const outDir = resolve(root, 'dist-single');
await build({ root, base: './', logLevel: 'warn', build: { target: 'es2022', outDir, emptyOutDir: true, cssCodeSplit: false,
  assetsInlineLimit: 100000000, rollupOptions: { output: { inlineDynamicImports: true } } } });
execFileSync('python3', [resolve(root, 'scripts/r31/inline.py'), out, outDir], { stdio: 'inherit' });
console.log('build', out, (statSync(out).size / 1e6).toFixed(1) + ' MB');
