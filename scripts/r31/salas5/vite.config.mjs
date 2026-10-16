// Harness das capturas antes/depois (onda 5 SALAS): sem watch (evita ENOSPC). Uso: npx vite --config scripts/r31/salas5/vite.config.mjs --host 127.0.0.1 --port 5871
export default { base: './', server: { watch: null, hmr: false } };
