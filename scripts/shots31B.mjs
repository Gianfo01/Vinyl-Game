// R31 (B) — captura do painel de perguntas do jogo (no lugar de confirm/prompt) e conferência do teclado.
// Uso: npx vite --port 5331 &   node scripts/shots31B.mjs [pasta] [porta]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright');
const out = process.argv[2] ?? 'docs/r31/shots';
const port = process.argv[3] ?? '5331';
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1360, height: 900 }, locale: 'pt-BR' });
p.on('pageerror', (e) => console.error('PAGEERR', e.message));
await p.goto(`http://localhost:${port}/`); await p.waitForTimeout(3500);
p.setDefaultTimeout(20000);
await p.getByText('NOVA RUN', { exact: false }).first().click(); await p.waitForTimeout(1500);
await p.getByText('COMEÇAR MINHA HISTÓRIA', { exact: false }).first().click(); await p.waitForTimeout(4000);
for (let i = 0; i < 60 && !(await p.evaluate(async () => !!(await import('/src/ui/store.ts')).store.game)); i++) await p.waitForTimeout(1000);
await p.evaluate(async () => {
  const st = await import('/src/ui/store.ts');
  const off = await import('/src/ui/tutoff19.ts');
  st.store.game.tutorial = { step: 99, done: true, seen: [] };
  off.setTutorials19(st.store.prefs, false);
  document.querySelectorAll('aside.tutorial, .tip18, .tour18').forEach((x) => x.remove());
});
// 1) confirmação: Esc cancela, Tab fica preso, Enter confirma
const r1 = await p.evaluate(async () => {
  const a = await import('/src/ui/ask31.ts');
  window.__r = a.askConfirm('Vender a casa de shows por 60% do preço? Não tem volta.', { title: 'Vender a casa', ok: 'Vender', danger: true });
  return document.querySelectorAll('.overlay.ask31').length;
});
await p.waitForTimeout(400);
await p.screenshot({ path: `${out}/onda1-B.png` });
const inside = [];
for (let i = 0; i < 4; i++) { await p.keyboard.press('Tab'); inside.push(await p.evaluate(() => !!document.activeElement?.closest('.ask31-panel'))); }
await p.keyboard.press('Escape');
const esc = await p.evaluate(async () => [await window.__r, document.querySelectorAll('.overlay.ask31').length]);
await p.evaluate(async () => { const a = await import('/src/ui/ask31.ts'); window.__r = a.askConfirm('Confirmar?'); });
await p.waitForTimeout(200);
await p.keyboard.press('Enter');
const ent = await p.evaluate(async () => await window.__r);
// 2) texto (Salvar como novo…) e 3) arrastar arquivo
await p.evaluate(async () => { const a = await import('/src/ui/ask31.ts'); window.__r = a.askText({ title: 'Salvar como novo', label: 'Nome do save:', default: 'Selo Agulha 1890' }); });
await p.waitForTimeout(300);
await p.screenshot({ path: `${out}/onda1-B-texto.png` });
await p.keyboard.type('X');
await p.keyboard.press('Enter');
const txt = await p.evaluate(async () => await window.__r);
await p.evaluate(async () => { const a = await import('/src/ui/ask31.ts'); window.__r = a.askFile({ title: 'Importar save', body: 'Arraste o arquivo do save (.json) para cá ou escolha no computador.' }); });
await p.waitForTimeout(300);
await p.screenshot({ path: `${out}/onda1-B-arquivo.png` });
await p.keyboard.press('Escape');
const file = await p.evaluate(async () => await window.__r);
console.log(JSON.stringify({ aberto: r1, tabDentro: inside, esc, enter: ent, texto: txt, arquivo: file }));
await b.close();
