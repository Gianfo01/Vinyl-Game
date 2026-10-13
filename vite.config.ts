import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    target: 'es2022', outDir: 'dist',
    // r29 WIKI: a wiki é um arquivo separado do jogo (wiki.html), com pacote próprio
    rollupOptions: { input: { main: resolve(__dirname, 'index.html'), wiki: resolve(__dirname, 'wiki.html') } },
  },
});
