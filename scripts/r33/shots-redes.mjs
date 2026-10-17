// R33 · REDES — prints do Jornal (1962, 1995) e do feed de redes (2008, 2025, 2035) na arte do jogo.
// Uso: npx vite --port 5893 --host 127.0.0.1 &  node scripts/r33/shots-redes.mjs [porta] [pasta]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright');
const port = process.argv[2] ?? '5893', out = process.argv[3] ?? 'docs/r33/redes';
const b = await chromium.launch({ executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1280, height: 900 }, locale: 'pt-BR' });
p.on('pageerror', (e) => console.error('PAGEERR', e.message));
p.on('console', (m) => { if (m.type() === 'error') console.error('CONSOLE', m.text().slice(0, 200)); });
await p.goto(`http://127.0.0.1:${port}/`); await p.waitForTimeout(3000); p.setDefaultTimeout(180000);

async function scene(year, weeks) {
  await p.evaluate(async ({ year, weeks }) => {
    document.querySelectorAll('.r33-ov,.ac5,.overlay').forEach((e) => e.remove());
    const wg = await import('/src/sim/worldgen.ts'); const botc = await import('/src/sim/bot.ts'); const tick = await import('/src/sim/tick.ts');
    const st = await import('/src/ui/store.ts'); const sw = await import('/src/sim/r31/switches.ts'); const c = await import('/src/ui/common.ts'); const off = await import('/src/ui/tutoff19.ts');
    const sh = await import('/src/ui/r31/shell5.ts'); const fx = await import('/src/sim/facts17.ts');
    const g = wg.createGame(botc.defaultConfig('redes', { startYear: year, scenario: 'established' }));
    off.setTutorials19(st.store.prefs, false); g.tutorial = { step: 99, done: true, seen: [] }; sw.setSw(g, 'exp5.nav', true);
    for (let i = 0; i < weeks; i++) tick.advanceWeek(g);
    // garante matéria para a tela (o mundo do teste curto pode estar quieto): um boato e fatos de cada seção
    const mine = Object.values(g.acts).filter((a) => a.owner === 'player' && a.status !== 'retired');
    const any = Object.values(g.acts).filter((a) => a.status !== 'retired' && a.members.length).slice(0, 6);
    const a0 = mine[0] ?? any[0], a1 = any[1], a2 = any[2];
    const t = (pt, en) => ({ pt, en });
    if (!mine.length) a0.owner = 'player';
    fx.emitFact(g, { kind: 'award', actors: [a1.id], place: a1.city, severity: 70, visibility: 'public', text: t(`${a1.name} leva o prêmio do ano.`, `${a1.name} takes the award of the year.`) });
    fx.emitFact(g, { kind: 'show', actors: [a2.id], place: a2.city, severity: 40, visibility: 'public', text: t(`${a2.name} esgota o teatro da cidade.`, `${a2.name} sells out the city theatre.`) });
    fx.emitFact(g, { kind: 'affair', actors: [a0.id], severity: 45, visibility: 'rumor', text: t(`Dizem que ${a0.name} anda em segredo com alguém do meio.`, `They say ${a0.name} is secretly seeing someone in the business.`) });
    fx.emitFact(g, { kind: 'release', actors: [a0.id], place: a0.city, severity: 35, visibility: 'public', text: t(`${a0.name} lança disco novo.`, `${a0.name} releases a new record.`) });
    fx.emitFact(g, { kind: 'scandal', actors: [a2.id], severity: 55, visibility: 'public', text: t(`${a2.name} é flagrado numa confusão na saída do clube.`, `${a2.name} caught in a scuffle outside the club.`) });
    fx.emitFact(g, { kind: 'birth', actors: [a1.id], severity: 20, visibility: 'public', text: t(`Nasce o primeiro filho de ${a1.name}.`, `${a1.name} welcomes a first child.`) });
    fx.emitFact(g, { kind: 'law', actors: [], severity: 55, visibility: 'public', text: t('Nova lei muda o direito autoral e as rádios reagem.', 'A new law changes copyright and radio stations react.') });
    st.store.game = g; st.store.selectedAct = a0.id; c.rerender(); document.querySelectorAll('.overlay').forEach((e) => e.remove());
  }, { year, weeks });
  await p.waitForTimeout(800);
}
const shot = async (name, full = false) => { await p.waitForTimeout(600); if (full && await p.locator('.r33-sheet').count()) await p.locator('.r33-sheet').screenshot({ path: `${out}/${name}.png` }); else await p.screenshot({ path: `${out}/${name}.png` }); console.log('ok', name); };
async function viaCard(open) {
  // entrada real: tecla do Jornal na mesa abre o cartão; o botão abre a tela
  await p.keyboard.press("'"); await p.waitForTimeout(700);
  const btn = p.locator(`.ac5 .ac5-a`, { hasText: open });
  if (await btn.count()) { await btn.first().click(); await p.waitForTimeout(900); return true; }
  return false;
}
const ev = (fn) => p.evaluate(fn);
const ONLY = process.env.ONLY;

if (!ONLY || ONLY === 'jornal') {
await scene(1962, 20);
console.log("game?", await p.evaluate(async () => !!(await import("/src/ui/store.ts")).store.game), await p.evaluate(() => document.body.innerText.slice(0, 80)));
const ok1 = await viaCard('Ler o jornal');
console.log('entrada pelo cartão do Jornal:', ok1);
if (!ok1) await ev(async () => (await import('/src/ui/r33/redes33ui.ts')).openJornal33());
await p.waitForTimeout(500);
await shot('jornal-1962');
// cartão de uma matéria (coluna social) por cima
const item = p.locator('.r33-sec .r33-it').nth(2);
if (await item.count()) { await item.click(); await p.waitForTimeout(500); await shot('jornal-1962-cartao'); }
await p.keyboard.press('Escape');
await p.locator('.r33-tab').nth(1).click().catch(() => {}); await p.waitForTimeout(300); await shot('jornal-1962-fofoca');

await scene(1995, 20);
await ev(async () => (await import('/src/ui/r33/redes33ui.ts')).openJornal33());
await shot('jornal-1995');
await p.locator('.r33-tab').nth(1).click().catch(() => {}); await p.waitForTimeout(300); await shot('jornal-1995-portal');

}
if (!ONLY || ONLY === 'jornal') {
}
for (const [y, name] of [[2008, 'redes-2008'], [2025, 'redes-2025'], [2035, 'redes-2035']]) {
  if (ONLY === 'jornal') break;
  await scene(y, 20);
  const ok = y === 2025 ? await viaCard('Abrir as redes') : false;
  if (!ok) await ev(async () => (await import('/src/ui/r33/redes33ui.ts')).openRedes33());
  await shot(name, true);
  if (y === 2025) { const post = p.locator('.r33-post').first(); if (await post.count()) { await post.click(); await p.waitForTimeout(500); await shot('redes-2025-cartao'); } }
}
await b.close();
