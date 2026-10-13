// r29 WIKI: junta o build de vite.wiki.config.ts num arquivo só (dist-wiki/Masters-Wiki.html): o <script> e o <link> de
// CSS viram conteúdo embutido. Abre com dois cliques, sem servidor e sem internet.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const dir = 'dist-wiki';
let html = readFileSync(join(dir, 'wiki.html'), 'utf8');
html = html.replace(/<link rel="stylesheet"[^>]*href="\.\/([^"]+)"[^>]*>/g, (_, f) => `<style>${readFileSync(join(dir, f), 'utf8')}</style>`);
html = html.replace(/<link rel="modulepreload"[^>]*>/g, '');
html = html.replace(/<script type="module"[^>]*src="\.\/([^"]+)"[^>]*><\/script>/g, (_, f) => `<script type="module">${readFileSync(join(dir, f), 'utf8').replace(/<\/script/gi, '<\\/script')}</script>`);
writeFileSync(join(dir, 'Masters-Wiki.html'), html);
console.log('ok', (html.length / 1e6).toFixed(1), 'MB');
