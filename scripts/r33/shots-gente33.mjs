// R33 · GENTE33 parte A — capturas dos cartões de ação (ACOES5) com as pessoas contratadas: mesa da sala de reunião
// (CEO e conselho), mapa da parede da sede (filial com diretor) e porta da casa (segurança pessoal; trainer e médico já contratados).
// O estado é mexido SÓ para montar o exemplo (filial, sócio, contratações); a interface em si só lê.
// Uso: npx vite --host 127.0.0.1 --port 5893 --config scripts/vite5nw.config.mjs &   node scripts/r33/shots-gente33.mjs [pasta] [porta]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright');
const out = process.argv[2] ?? 'docs/r33/gente';
const port = process.argv[3] ?? '5893';
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, locale: 'pt-BR' });
p.on('pageerror', (e) => console.error('PAGEERR', e.message));
p.on('console', (m) => { if (m.type() === 'error') console.error('CONSOLE', m.text().slice(0, 300)); });
await p.goto(`http://127.0.0.1:${port}/`); await p.waitForTimeout(3500);
p.setDefaultTimeout(20000);
await p.getByText('NOVA RUN', { exact: false }).first().click(); await p.waitForTimeout(1500);
await p.getByText('COMEÇAR MINHA HISTÓRIA', { exact: false }).first().click(); await p.waitForTimeout(4000);
for (let i = 0; i < 60 && !(await p.evaluate(async () => !!(await import('/src/ui/store.ts')).store.game)); i++) await p.waitForTimeout(1000);
const made = await p.evaluate(async () => {
  const st = await import('/src/ui/store.ts');
  const off = await import('/src/ui/tutoff19.ts');
  const sw = await import('/src/sim/r31/switches.ts');
  const c = await import('/src/ui/common.ts');
  const g = await import('/src/sim/r33/gente33.ts');
  const cap = await import('/src/sim/sys/capital.ts');
  const own = await import('/src/sim/sys/people/owner.ts');
  const s = st.store.game;
  s.tutorial = { step: 99, done: true, seen: [] };
  off.setTutorials19(st.store.prefs, false);
  sw.setSw(s, 'exp5.nav', true);
  for (const k of ['casa31', 'sede25', 'campus18', 'world']) localStorage.setItem(`vtn31-seen:${k}`, '1');
  s.player.cash += 80_000_000_00; s.player.hq = 3; own.ownerOf(s).wealth += 5_000_000_00;
  const city = Object.values(s.acts).map((a) => a.city).find((x) => x !== s.config.homeCity);
  s.branches.push({ id: 'brShot', city, level: 1, name: `${s.config.companyName} filial`, opened: s.week });
  s.branches.push({ id: 'brShot2', city: Object.values(s.acts).map((a) => a.city).find((x) => x !== s.config.homeCity && x !== city), level: 0, name: `${s.config.companyName} filial 2`, opened: s.week });
  const r = [g.hireBranchDir33(s, 'brShot', undefined, { line: 'bold', cap: 5000 })];
  cap.capital(s).investors.push({ id: 'iShot', name: 'Banco Meridional', share: 0.22 });
  r.push(g.seatBoard33(s), g.hireCeo33(s), g.hireCrew33(s, 'trainer'), g.hireCrew33(s, 'doctor'));
  c.rerender();
  return r.map((x) => (x ? x.pt : 'ok'));
});
console.log('montagem', made);
const clean = () => p.evaluate(() => {
  document.querySelectorAll('.overlay').forEach((e) => e.remove());
  for (const e of document.querySelectorAll('body *')) if (/^Nova época/.test(e.textContent ?? '') && getComputedStyle(e).position === 'fixed') e.remove();
});
const shot = async (name) => { await p.waitForTimeout(900); await clean(); await p.screenshot({ path: `${out}/gente33-${name}.png` }); console.log('captura', name); };
const go = (o) => p.evaluate(async (o) => {
  const sh = await import('/src/ui/r31/shell5.ts');
  const ac = await import('/src/ui/r31/acoes5.ts');
  ac.close5();
  sh.SH5.paper = null; sh.SH5.pause = false;
  sh.travel5go(o.region);
}, o);
const card = async (id) => {
  await p.waitForTimeout(700); await clean();
  const el = p.locator(`[data-obj="${id}"]`).first();
  if (await el.count() && await el.isVisible()) { await el.click({ force: true }); }
  else await p.evaluate(async (id) => { (await import('/src/ui/r31/nav5.ts')).open5(id); }, id);
  await p.waitForSelector('.ac5', { timeout: 5000 }).catch(() => console.error('sem cartão', id));
};
for (const [name, region, id] of [['sede-mesareuniao', 'sede', 'mesareuniao'], ['sede-mapaparede', 'sede', 'mapaparede'], ['casa-porta', 'casa', 'porta']]) {
  await go({ region });
  await card(id);
  await shot(name);
}
await b.close();
