// R31 onda 3 (U · Facções por país) — capturas do menu Crime: aba Organizações só com as facções do país da sede e
// aba Intermediário (facções de fora por país, cotação aberta, contrato em andamento).
// Uso: npx vite --host 127.0.0.1 --port 5894 &   node scripts/r31/shots-onda3-u.mjs [pasta] [porta]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright');
const out = process.argv[2] ?? 'docs/r31/shots';
const port = process.argv[3] ?? '5894';
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1360, height: 900 }, locale: 'pt-BR' });
p.on('pageerror', (e) => console.error('PAGEERR', e.message));
await p.goto(`http://127.0.0.1:${port}/`); await p.waitForTimeout(3500);
p.setDefaultTimeout(20000);
await p.getByText('NOVA RUN', { exact: false }).first().click(); await p.waitForTimeout(1500);
await p.getByText('COMEÇAR MINHA HISTÓRIA', { exact: false }).first().click(); await p.waitForTimeout(4000);
for (let i = 0; i < 60 && !(await p.evaluate(async () => !!(await import('/src/ui/store.ts')).store.game)); i++) await p.waitForTimeout(1000);
p.setDefaultTimeout(120000);
const info = await p.evaluate(async () => {
  const st = await import('/src/ui/store.ts');
  const off = await import('/src/ui/tutoff19.ts');
  const g = st.store.game;
  g.tutorial = { step: 99, done: true, seen: [] };
  off.setTutorials19(st.store.prefs, false);
  g.player.cash += 5e8;
  window.__g = g;
  return { year: g.year, home: g.config.homeCity };
});
console.log('jogo', JSON.stringify(info));
const show = async (mode) => p.evaluate(async (mode) => {
  const ui = await import('/src/ui/sys/broker31ui.ts');
  const reg = await import('/src/ui/registry.ts');
  const br = await import('/src/sim/sys/broker31.ts');
  const g = window.__g;
  document.querySelectorAll('.overlay, #u31').forEach((e) => e.remove());
  const box = document.createElement('div');
  box.id = 'u31';
  box.setAttribute('style', 'position:fixed;inset:0;overflow:auto;z-index:9999;background:var(--bg,#111);padding:18px');
  document.body.appendChild(box);
  if (mode === 'orgs') {
    const a = reg.EXTRA_AREAS.find((x) => x.id === 'crime');
    if (a) box.appendChild(a.render(g)); else return false;
    return true;
  }
  if (mode === 'deal') {
    const lb = Object.values(g.labels).find((x) => x.id !== 'player');
    const fo = (await import('/src/sim/sys/fac31.ts')).foreignOrgs31(g).find((o) => o.kind !== 'cyber' && !br.brokerQuote31(g, o.id, 'wiretap', lb.id).block);
    br.brokerHire31(g, fo.id, 'wiretap', lb.id);
  }
  box.appendChild(ui.brokerTab31(g));
  const d = box.querySelector('details'); if (d) d.open = true;
  const btn = [...box.querySelectorAll('button')].find((x) => /Cotar/.test(x.textContent ?? ''));
  if (btn && mode === 'quote') btn.click();
  return true;
}, mode);
const shot = async (name) => { await p.waitForTimeout(900); await p.screenshot({ path: `${out}/onda3-u-${name}.png` }); console.log('captura', name); };
if (await show('orgs')) await shot('organizacoes');
if (await show('list')) await shot('intermediario');
if (await show('quote')) {
  // o clique re-renderiza a tela do jogo, não a caixa: refaz a caixa com o formulário aberto
  await p.evaluate(async () => { const ui = await import('/src/ui/sys/broker31ui.ts'); const box = document.getElementById('u31'); box.innerHTML = ''; box.appendChild(ui.brokerTab31(window.__g)); box.querySelectorAll('details').forEach((d) => { if (d.querySelector('.card .card')) d.open = true; }); const c = box.querySelector('.card .card'); c?.scrollIntoView(); });
  await shot('cotacao');
}
if (await show('deal')) await shot('contrato');
await b.close();
