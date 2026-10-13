// r29 WIKI: build da wiki como UM arquivo HTML autocontido (JS, CSS e fontes embutidos) — para mandar/abrir sem servidor.
// Uso: npx vite build -c vite.wiki.config.ts && node scripts/inline-wiki29.mjs  → dist-wiki/Masters-Wiki.html
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    target: 'es2022', outDir: 'dist-wiki', emptyOutDir: true, assetsInlineLimit: 100_000_000, cssCodeSplit: false,
    rollupOptions: { input: resolve(__dirname, 'wiki.html'), output: { inlineDynamicImports: true } },
  },
});
