// Rodada 29 (WIKI) — capturas da wiki, que é um arquivo separado do jogo (wiki.html). Computador 1440×900 e celular
// 390×844, pt-BR. Uso: npx vite --port 5332 &  node scripts/shots29wiki.mjs http://localhost:5332 docs/shots29wiki
// ou direto no arquivo único: node scripts/shots29wiki.mjs file:///…/dist-wiki/Masters-Wiki.html docs/shots29wiki
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright');
const base = process.argv[2] ?? 'http://localhost:5332';
const out = process.argv[3] ?? 'docs/shots29wiki';
const prod = process.argv[4] ?? 'martin';
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

const PAGES = [
  ['01-inicio', '#/'], ['02-personagens', '#/idx/pessoas'], ['03-lista-virtualizada-pessoas', '#/idx/persons'],
  ['04-banda-real', '#/ract/the-beatles'], ['05-pessoa-real', '#/rp/john-lennon'], ['06-produtor', `#/prod/${prod}`],
  ['07-mecanicas', '#/idx/mech'], ['08-mecanica-dinheiro', '#/mech/money'], ['09-mecanica-conexoes-diagrama', '#/mech/connections'],
  ['10-cidade', '#/city/rio'], ['11-genero', '#/genre/rnr'], ['12-era', '#/era/streaming'], ['13-reliquia', '#/relic/carmen_baiana'],
  ['14-objetos', '#/idx/objetos'], ['15-glossario', '#/idx/glossario'],
];
for (const [tag, viewport] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
  const p = await b.newPage({ viewport, locale: 'pt-BR' });
  p.on('pageerror', (e) => console.error('PAGEERR', tag, e.message));
  p.on('console', (m) => { if (m.type() === 'error') console.error('CONSOLE', tag, m.text()); });
  await p.goto(base.endsWith('.html') ? `${base}#/` : `${base}/wiki.html#/`); await p.waitForSelector('.wk29-page, .wk29-home', { timeout: 120000 });
  for (const [name, hash] of PAGES) {
    await p.evaluate((h) => { location.hash = h; }, hash);
    await p.waitForTimeout(700);
    if (name.includes('diagrama')) await p.locator('.wk29-mx').scrollIntoViewIfNeeded();
    await p.screenshot({ path: `${out}/${name}-${tag}.png` });
    console.log('ok', name, tag);
  }
  await p.fill('.wk29-q', 'joao'); await p.waitForTimeout(600);
  await p.screenshot({ path: `${out}/16-busca-sem-acento-${tag}.png` }); console.log('ok busca', tag);
  await p.close();
}
await b.close();
