// R31 · onda 1 (EDT) — capturas dos editores: tela inicial (link), editor de base (lista, edição, código, base inválida)
// e editor dentro da partida (dinheiro, pessoas, cenas, registro, selo de partida editada).
// Uso: npx vite --port 5331 &   node scripts/r31/shotsEDT.mjs [pasta] [porta]
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
p.setDefaultTimeout(20000);
const shot = async (name) => { await p.waitForTimeout(700); await p.screenshot({ path: `${out}/onda1-EDT-${name}.png` }); console.log('captura', name); };
await p.goto(`http://localhost:${port}/`); await p.waitForTimeout(3500);

// editor de base
await p.locator('[data-link=base31]').first().scrollIntoViewIfNeeded();
await shot('inicio');
await p.locator('[data-link=base31]').first().click();
await p.getByPlaceholder(/Nome da base/).fill('Brasil anos 80 turbinado');
await p.getByRole('button', { name: 'Criar e editar' }).click();
await p.waitForTimeout(600);
const first = p.locator('.b31-rec').first();
await first.locator('input[type=text]').first().fill('Ida Cipreste');
await first.getByRole('button', { name: 'Guardar mudança' }).click();
await p.getByRole('button', { name: /Novo artista ou banda/ }).click();
await shot('base-edicao');
await p.getByRole('button', { name: 'Salvar base' }).click();
await p.waitForTimeout(600);
await p.getByRole('button', { name: 'Copiar código' }).first().click();
await shot('base-lista');
await p.locator('.b31 textarea').last().fill('{"v":1,"game":"31.1","name":"Ruim","acts":{"5002":{"name":"X","genre":"nada","debut":3020,"city":"atlantida","members":0}},"labels":{},"cities":{},"relics":{}}');
await p.getByRole('button', { name: 'Ler código colado' }).click();
await p.locator('.b31-preview').scrollIntoViewIfNeeded();
await shot('base-invalida');
await p.getByRole('button', { name: 'Usar na próxima partida' }).first().click();
await p.getByRole('button', { name: /Voltar/ }).first().click();
await p.waitForTimeout(800);

// nova partida (com a base escolhida) e editor dentro da partida
await p.getByText('NOVA RUN', { exact: false }).first().click(); await p.waitForTimeout(1500);
await p.getByText('COMEÇAR MINHA HISTÓRIA', { exact: false }).first().click(); await p.waitForTimeout(4000);
for (let i = 0; i < 150 && !(await p.evaluate(async () => !!(await import('/src/ui/store.ts')).store.game)); i++) await p.waitForTimeout(1000);
await p.evaluate(async () => {
  const st = await import('/src/ui/store.ts');
  const off = await import('/src/ui/tutoff19.ts');
  st.store.game.tutorial = { step: 99, done: true, seen: [] };
  off.setTutorials19(st.store.prefs, false);
  document.querySelectorAll('.overlay').forEach((e) => e.remove());
});
await p.keyboard.press('Control+Shift+E');
await p.waitForTimeout(1200);
await p.evaluate(() => document.querySelectorAll('.overlay').forEach((e) => e.remove()));
const moneyIn = p.locator('.ed31-row input[type=number]').first();
await moneyIn.fill('5000000');
await p.locator('.ed31-row').first().getByRole('button', { name: 'Aplicar' }).click();
await shot('partida-dinheiro');
await p.getByRole('tab', { name: 'Pessoas' }).click();
const nm = await p.evaluate(async () => { const st = await import('/src/ui/store.ts'); const g = st.store.game; return Object.values(g.persons).find((x) => !x.isPlayer && x.alive)?.name.slice(0, 5) ?? 'a'; });
await p.getByPlaceholder(/Buscar pessoa/).fill(nm);
await p.waitForTimeout(400);
await p.locator('.ed31-list button').first().click();
await shot('partida-pessoa');
await p.getByRole('tab', { name: 'Cenas e eventos' }).click();
await shot('partida-cenas');
await p.getByRole('tab', { name: 'Registro de edições' }).click();
await shot('partida-registro');
await b.close();
