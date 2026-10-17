// R33 · APARELHOS33 — capturas do celular (1983, 1997, 2008, 2025, 2035), do computador (1982, 1995, 2003, 2025, 2035) e
// da cobrinha rodando. Build de teste: VITE_EXP5NAV=1 node scripts/r31/build-single.mjs /tmp/ap.html
// Uso: node scripts/r33/shots-aparelhos.mjs [/tmp/ap.html] [saída]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright');
const file = process.argv[2] ?? '/tmp/ap.html';
const out = process.argv[3] ?? 'docs/r33/aparelhos';
const only = process.env.ONLY ?? '';
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

async function run(year) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, locale: 'pt-BR' });
  await ctx.addInitScript(() => { localStorage.setItem('vtn:prefs', JSON.stringify({ reducedMotion: true, lang: 'pt' })); });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.error('PAGEERR', year, e.message));
  await p.goto(`file://${file}`); await p.waitForTimeout(2500);
  await p.click('[data-h5="new"]'); await p.waitForTimeout(900);
  await p.evaluate((y) => { const r = document.querySelector('input[data-n5=year]'); r.value = String(y); r.dispatchEvent(new Event('input', { bubbles: true })); }, year);
  await p.waitForTimeout(400);
  await p.click('[data-n5="start"]'); await p.waitForTimeout(3500);
  // fecha cartões de boas-vindas que existirem
  for (let i = 0; i < 4; i++) { await p.keyboard.press('Escape'); await p.waitForTimeout(150); }
  await p.evaluate(() => document.querySelectorAll('.pz5-back').forEach((x) => x.click()));
  await p.waitForTimeout(300);
  return p;
}
const shot = async (p, name) => { await p.waitForTimeout(500); await p.screenshot({ path: `${out}/${name}.png` }); console.log('captura', name); };
const app = async (p, id) => { await p.click(`.ap33 [data-app33="${id}"]`); await p.waitForTimeout(400); };

// ---------------------------------------------------------------- celular
for (const [y, a] of [[1983, 'ligar'], [1997, 'jogo'], [2008, 'videos'], [2025, 'videos'], [2035, 'encontros']]) {
  if (only && !only.includes(`c${y}`)) continue;
  const p = await run(y);
  await p.click('[data-travel="celular"]'); await p.waitForTimeout(600);
  await shot(p, `celular-${y}-inicio`);
  await app(p, a);
  if (a === 'videos') { await p.evaluate(() => document.querySelector('.ap33 [data-act33="vid.alta"]')?.click()); await p.waitForTimeout(500); }
  await shot(p, `celular-${y}-${a}`);
  if (y === 1997) { // cobrinha rodando
    await p.click('[data-game33="snake"]'); await p.waitForTimeout(300);
    for (const [k, w] of [['ArrowUp', 1080], ['ArrowLeft', 360], ['ArrowDown', 900], ['ArrowRight', 360]]) { await p.waitForTimeout(w); await p.keyboard.press(k); }
    await p.waitForTimeout(500);
    await shot(p, 'cobrinha-1997');
  }
  if (y === 2025) { await p.keyboard.press('Escape'); await app(p, 'compras'); await shot(p, 'celular-2025-compras'); }
  await p.context().close();
}
// ---------------------------------------------------------------- computador
for (const [y, a] of [[1982, 'planilha'], [1995, 'editor'], [2003, 'forum'], [2025, 'painel'], [2035, 'ia']]) {
  if (only && !only.includes(`p${y}`)) continue;
  const p = await run(y);
  // instala o computador pelo cartão do livro-caixa (o mesmo upgrade da DECO-M) e liga
  await p.evaluate(() => { const b = document.querySelector('[data-obj="livrocaixa"]'); b?.click(); });
  await p.waitForTimeout(500);
  await p.evaluate(() => document.querySelector('.ac5 [data-act="ap33.instalar"]')?.click());
  await p.waitForTimeout(800);
  await p.keyboard.press('Escape');
  await p.evaluate(() => document.querySelector('[data-obj="computador"]')?.click());
  await p.waitForTimeout(500);
  await shot(p, `computador-${y}-cartao`);
  await p.evaluate(() => document.querySelector('.ac5 [data-act="ap33.pc"]')?.click());
  await p.waitForTimeout(700);
  await shot(p, `computador-${y}-inicio`);
  await app(p, a);
  await shot(p, `computador-${y}-${a}`);
  await p.context().close();
}
await b.close();
