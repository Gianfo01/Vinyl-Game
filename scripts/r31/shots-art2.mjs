// R31 · onda 4 (ART2) — capturas dos assets novos: galeria com todas as variações por época e os interiores com o
// painel do asset aberto (jukebox, parada, vitrine, quadro de audiência, rack, mural de recados, fliperama e carro na
// porta, som do palco, telefone da delegacia, cartaz de procurado, carro do chefe, rádio da sala, telefone da redação).
// Uso: npx vite --host 127.0.0.1 --port 5870 &   node scripts/r31/shots-art2.mjs [pasta] [porta]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright');
const out = process.argv[2] ?? 'docs/r31/shots';
const port = process.argv[3] ?? '5870';
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 1360, height: 900 }, locale: 'pt-BR' });
const errs = [];
p.on('pageerror', (e) => { errs.push(e.message); console.error('PAGEERR', e.message); });
await p.goto(`http://127.0.0.1:${port}/`); await p.waitForTimeout(3500);
p.setDefaultTimeout(30000);
const info = await p.evaluate(async () => {
  const st = await import('/src/ui/store.ts');
  const bot = await import('/src/sim/bot.ts');
  const wg = await import('/src/sim/worldgen.ts');
  const tick = await import('/src/sim/tick.ts');
  const pb = await import('/src/sim/playbot16.ts');
  const g = wg.createGame(bot.defaultConfig('shots-art2', { scenario: 'established', startYear: 1985, dbSize: 'small', homeCity: 'rio' }));
  g.tutorial = { step: 99, done: true, seen: [] };
  const off = await import('/src/ui/tutoff19.ts');
  off.setTutorials19(st.store.prefs, false);
  for (let i = 0; i < 4; i++) { pb.playMonth(g, 'balanced'); tick.advanceMonth(g); }
  st.store.game = g;
  window.__g = g;
  const cr = await import('/src/sim/sys/crime17.ts');
  const un = await import('/src/sim/sys/under31.ts');
  const util = await import('/src/sim/util.ts');
  const mine = util.playerActs(g);
  if (mine[0]) cr.jailPerson(g, g.acts[mine[0]].members[0], 'BRA', 3, { pt: 'Briga num bar', en: 'Bar fight' });
  // uma relíquia em leilão para a vitrine
  const rl = await import('/src/sim/sys/relics9.ts');
  const any = Object.values(g.acts).find((a) => a.owner !== 'player' && a.members.length);
  const r = rl.addRelic(g, 'guitar', { pt: 'Guitarra do primeiro show', en: 'Guitar from the first gig' }, any?.id, any?.members[0], 9000);
  r.st = 'auction'; r.au = g.week + 6;
  const o = un.underOrgs31(g).here[0];
  try { for (const k of ['records', 'bar', 'radio', 'studio', 'rehearsal', 'hotel', 'venue', 'police', 'facade', 'market', 'instruments', 'apartments', 'press']) localStorage.setItem(`vtn31-seen:in31-${k}`, '1'); } catch { /* */ }
  return { year: g.year, org: o?.id };
});
console.log('jogo', JSON.stringify(info));
const shot = async (name) => { await p.waitForTimeout(700); await p.screenshot({ path: `${out}/onda4-art2-${name}.png` }); console.log('captura', name); };

// 1) galeria: cada asset em cada época (mesma camada e contorno dos interiores)
await p.evaluate(async () => {
  const i27 = await import('/src/ui/pixel/interior27.ts');
  const pr = await import('/src/ui/pixel/props31.ts');
  document.querySelectorAll('.shot31').forEach((e) => e.remove());
  const box = document.createElement('div');
  box.className = 'shot31';
  box.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#12141c;overflow:auto;padding:8px;color:#e8e0c8;font:12px sans-serif';
  const years = [1915, 1935, 1955, 1975, 1995, 2012, 2035];
  const types = ['jukebox', 'charts', 'phone', 'relic', 'ratings', 'rack', 'flyers', 'arcade', 'wanted', 'pa', 'radio'];
  for (const y of years) {
    const room = i27.interior27('office', y, 0); room.props = [];
    const items = types.map((t, i) => ({ t, x: 0.01 + i * 0.09, w: 0.08, n: 3, lit: true }));
    items.push({ t: 'car', x: 0.05, car: 'tour' }, { t: 'car', x: 0.3, car: 'boss' }, { t: 'car', x: 0.5, car: 'police' }, { t: 'car', x: 0.7, car: 'cab' });
    const cv = document.createElement('canvas');
    i27.drawInterior27(cv, room, [], { minW: 360, name: `${y}`, seed: 'gal', extra: (g, sd) => pr.drawProps31(g, items, i27.geom27(360), sd) });
    cv.style.cssText = 'width:1080px;image-rendering:pixelated;display:block;margin:0 0 4px';
    const cap = document.createElement('div');
    cap.textContent = `${y}: ${types.map((t) => `${t}=${pr.variant31(t, y)}`).join(' · ')} · car=${pr.variant31('car', y)}`;
    box.append(cap, cv);
  }
  document.body.append(box);
});
await shot('galeria');
await p.evaluate(() => { const b = document.querySelector('.shot31'); if (b) b.scrollTop = 99999; });
await shot('galeria-2');

// 2) interiores com o painel do asset aberto
const inside = async (k, name, spot, year, org) => {
  await p.evaluate(async ([k, year, org]) => {
    const pl = await import('/src/sim/sys/place27.ts');
    const ins = await import('/src/ui/r31/inside31.ts');
    const gen = await import('/src/sim/sys/gente31.ts');
    const un = await import('/src/sim/sys/under31.ts');
    const g = window.__g;
    const lots = Array.from({ length: 18 }, (_, i) => 40 + i);
    const ps = pl.places27(g, lots);
    const pc = ps.find((x) => x.k === k && (!org || x.org === org)) ?? ps.find((x) => x.k === k);
    const x = pc ? { id: `shot:${pc.id}:${year}`, k: pc.k, name: pc.name.pt, what: pc.what.pt, people: pc.people, year: year ?? g.year, city: g.config.homeCity, seed: g.config.seed, place: pc, org: pc.org }
      : { id: `shot:${k}:${year}`, k, name: k, people: gen.crew31(g, k) ?? [], year: year ?? g.year, city: g.config.homeCity, seed: g.config.seed, org };
    document.querySelectorAll('.shot31').forEach((e) => e.remove());
    const box = document.createElement('div');
    box.className = 'shot31';
    box.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#12141c;overflow:auto';
    box.append(ins.insideView31(g, x, () => {}));
    document.body.append(box);
  }, [k, year, org]);
  if (spot) await p.locator(`.shot31 .sc31-spot[data-spot="${spot}"]`).first().click({ force: true }).catch(() => console.error('sem ponto', spot));
  await p.evaluate(() => document.querySelector('.shot31 .in31-pane')?.scrollIntoView({ block: 'end' }));
  await shot(name);
};
await inside('records', 'loja-parada', 'art:charts');
await inside('records', 'loja-vitrine', 'art:relic', 1962);
await inside('bar', 'bar-jukebox', 'art:jukebox', 1958);
await inside('bar', 'bar-jukebox-1930', 'art:jukebox', 1931);
await inside('radio', 'radio-audiencia', 'art:ratings');
await inside('studio', 'estudio-rack', 'art:rack', 1972);
await inside('rehearsal', 'ensaio-recados', 'art:flyers');
await inside('hotel', 'hotel-fliperama', 'art:arcade');
await inside('hotel', 'hotel-carro', 'art:car', 2010);
await inside('venue', 'casa-som', 'art:pa', 1995);
await inside('instruments', 'instrumentos-vitrine', 'art:relic');
await inside('apartments', 'apartamento-radio', 'art:radio', 1990);
await inside('press', 'redacao-telefone', 'art:phone', 1950);
await inside('police', 'delegacia-telefone', 'art:phone');
await inside('police', 'delegacia-procurado', 'art:wanted', 2025);
await inside('market', 'beco-procurado', 'art:wanted');
await inside('facade', 'fachada-carro', 'art:car', undefined, info.org);
// 3) salas da sede: o objeto novo de cada uma, com o painel aberto
await p.evaluate(() => document.querySelectorAll('.shot31').forEach((e) => e.remove()));
const sala = async (id, name) => {
  await p.evaluate(async (id) => {
    const s31 = await import('/src/ui/r31/salas31.ts');
    document.querySelectorAll('.overlay').forEach((e) => e.remove());
    s31.openSala31(id);
  }, id);
  await p.waitForTimeout(1200);
  await p.locator('.s31-hot[data-hot^="art:"]').first().click({ force: true }).catch(() => console.error('sem objeto novo', id));
  await p.waitForTimeout(500);
  const el = await p.$('.s31-page');
  if (el) await el.screenshot({ path: `${out}/onda4-art2-sede-${name}.png` }); else await p.screenshot({ path: `${out}/onda4-art2-sede-${name}.png` });
  console.log('captura sede', name);
};
await sala('roster', 'elenco-jukebox');
await sala('catalog', 'catalogo-parada');
await sala('team', 'equipe-telefone');
await sala('trophy', 'trofeus-vitrine');
await sala('talent', 'talentos-recados');
await sala('studio', 'estudio-rack');
console.log('erros', errs.length);
await b.close();
