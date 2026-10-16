// Vite para capturas em contêiner com poucos watchers: polling em vez de inotify, sem HMR.
import { defineConfig } from 'vite';
export default defineConfig({ base: './', server: { watch: { usePolling: true, interval: 800, ignored: ['**/node_modules/**', '**/docs/**', '**/dist/**', '**/tests/**'] }, hmr: false } });
