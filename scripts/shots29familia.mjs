// R29 (FAMÍLIA) — capturas da vida familiar: aba Família da ficha (par, filhos, pais, árvore em retratos), casal célebre,
// estrela mirim (responsável, fundo Coogan, escola/limite de horas), filho de gente da indústria (página única), filtros
// "Família" no diretório, "Ver família" no clique direito e a busca Ctrl+K achando um filho. Partida rápida pela tela
// inicial (NOVA RUN → COMEÇAR MINHA HISTÓRIA, pt-BR). Saída em docs/shots29familia/.
// Uso (servidor de desenvolvimento rodando):  npx vite --port 5343 &   node scripts/shots29familia.mjs [pasta] [porta]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright');
const out = process.argv[2] ?? 'docs/shots29familia';
const port = process.argv[3] ?? '5343';
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

async function start(vw, vh) {
  const ctx = await b.newContext({ locale: 'pt-BR', viewport: { width: vw, height: vh } });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.error('PAGEERR', e.message));
  await p.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle', timeout: 240000 });
  await p.waitForTimeout(1500);
  const click = async (re) => { await p.getByRole('button', { name: re }).first().click({ timeout: 90000 }); await p.waitForTimeout(800); };
  await click(/NOVA RUN|NEW RUN/i);
  await click(/COMEÇAR MINHA HISTÓRIA|START MY STORY/i);
  await p.waitForTimeout(2500);
  for (let i = 0; i < 6; i++) { if (!(await p.$('.overlay, .scene-overlay'))) break; await p.keyboard.press('Escape'); await p.waitForTimeout(300); }
  return p;
}
/** Monta a cena pelo motor (mesmas funções do jogo): casal célebre com filho que estreia, estrela mirim no seu elenco,
 *  filho de empresário que vira produtor. */
async function setup(p) {
  return p.evaluate(async () => {
    document.querySelectorAll('.overlay, .scene-overlay').forEach((e) => e.remove());
    const st = await import('/src/ui/store.ts');
    const off = await import('/src/ui/tutoff19.ts').catch(() => null);
    if (off) off.setTutorials19(st.store.prefs, false);
    const F = await import('/src/sim/sys/family29.ts');
    const D = await import('/src/sim/dynasty.ts');
    const P16 = await import('/src/sim/sys/people16.ts');
    const R = await import('/src/core/rng.ts');
    const g = st.store.game;
    g.player.cash = Math.max(g.player.cash, 2e8);
    F.familyMonth29(g); // semeia as famílias do mundo inicial
    const live = (a) => (a.status === 'active' || a.status === 'emerging') && !a.catalogNo && a.owner !== 'player' && a.members.every((m) => g.persons[m]?.alive && !g.persons[m].isPlayer);
    const acts = Object.values(g.acts).filter(live).sort((a, b) => b.fame - a.fame);
    const a1 = acts[0], a2 = acts.find((x) => x !== a1 && x.members.length === 1) ?? acts[1];
    const x = a1.members[0], y = a2.members[0];
    F.marry29(g, x, y);
    const k1 = F.birth29(g, x);
    g.persons[x].born = Math.min(g.persons[x].born, g.year - 38);
    if (k1) k1[4] = g.year - 19; // o filho já cresceu: estreia agora (herança de fama e fãs)
    const kid = k1 ? F.debutNow29(g, k1[0]) : undefined;
    const k2 = F.birth29(g, x);
    // estrela mirim no seu elenco
    const cs = F.spawnChildStar29(g, R.Rng.fromSeed('shots29fam'), 'kidgroup');
    if (cs) { cs.owner = 'player'; cs.city = g.config.homeCity; }
    // filho de empresário da praça que vira produtor
    const m = P16.genMgrs16(g).find((z) => z.from <= g.year && z.to >= g.year);
    const key = `e:${m.id}`;
    const fam = D.ensureFamily(g, key);
    fam.kids.push({ id: 'shot-k1', name: 'Dora Albuquerque', born: g.year - 24, bond: 60, musical: 70 }, { id: 'shot-k2', name: 'Teo Albuquerque', born: g.year - 21, bond: 60, musical: 30 });
    const prod = F.careerOf(g, key, fam.kids[0], 'producer');
    F.careerOf(g, key, fam.kids[1], 'manager');
    const cm = await import('/src/ui/common.ts');
    cm.rerender();
    return { year: g.year, x, y, xn: g.persons[x].name, yn: g.persons[y].name, kid: kid?.id, kidName: kid?.name, k2: k2?.[3], minor: cs?.members[0], minorAct: cs?.id, key, prod: prod?.id };
  });
}
const snap = async (p, name, keep = false) => { if (!keep) await p.mouse.move(1435, 900); await p.waitForTimeout(300); await p.screenshot({ path: `${out}/${name}.png` }); console.log('ok', name); };
const openFam = (p, pid) => p.evaluate(async (pid) => { document.querySelectorAll('.overlay, .scene-overlay, [data-ctx27]').forEach((e) => e.remove()); const m = await import('/src/ui/sys/family29.ts'); m.openFamily29(pid); }, pid);
const scrollTo = async (p, re) => { const el = p.getByText(re).first(); if (await el.count()) await el.scrollIntoViewIfNeeded().catch(() => {}); };

// ---------------------------------------------------------------- desktop
const p = await start(1440, 920);
const info = await setup(p);
console.log(JSON.stringify(info));
await openFam(p, `p:${info.x}`);
await p.waitForTimeout(1300);
await snap(p, '01-ficha-familia-casal-celebre');
await scrollTo(p, /Árvore da família/);
await snap(p, '02-arvore-da-familia');
if (info.kid) { await openFam(p, `p:${info.kid}`); await p.waitForTimeout(1300); await scrollTo(p, /Família \(R29\)/); await snap(p, '03-filho-que-estreou'); }
if (info.minor) { await openFam(p, `p:${info.minor}`); await p.waitForTimeout(1300); await scrollTo(p, /Menor de idade/); await snap(p, '04-estrela-mirim-responsavel-fundo'); }
await openFam(p, info.key);
await p.waitForTimeout(1300);
await scrollTo(p, /Filhos e carreiras/);
await snap(p, '05-empresario-filhos-e-carreiras');
// diretório com filtro Família
await p.evaluate(async () => { document.querySelectorAll('.modal, .overlay, [data-ctx27]').forEach((e) => e.remove()); const st = await import('/src/ui/store.ts'); st.store.area = 'directory'; (await import('/src/ui/common.ts')).rerender(); });
await p.waitForTimeout(1200);
const tabP = p.getByRole('tab', { name: /Pessoas/ }).first();
if (await tabP.count()) { await tabP.click(); await p.waitForTimeout(900); }
const sel = p.locator('.dir-filters select').filter({ hasText: /Família: todos/ }).first();
if (await sel.count()) { await sel.selectOption('couple'); await p.waitForTimeout(1500); }
await snap(p, '06-diretorio-filtro-familia');
// clique direito: "Ver família"
await openFam(p, `p:${info.y}`);
await p.waitForTimeout(1200);
await p.evaluate(async (pid) => { const st = await import('/src/ui/store.ts'); const c = await import('/src/ui/ps/ctx27.ts'); c.openCtx27(st.store.game, 'person', `p:${pid}`, document.querySelector('.modal h2, main h2, main h1') ?? document.body, { x: 520, y: 160 }); }, info.y);
await p.waitForTimeout(800);
const vf = p.locator('.cx27 [data-act="pa:family29.view"]').first();
if (await vf.count()) { await vf.scrollIntoViewIfNeeded().catch(() => {}); await vf.hover(); }
await snap(p, '07-clique-direito-ver-familia', true);
// Ctrl+K acha o filho ainda criança
await p.keyboard.press('Escape');
await p.evaluate(() => document.querySelectorAll('.modal, .overlay, [data-ctx27]').forEach((e) => e.remove()));
await p.keyboard.press('Control+k');
await p.waitForTimeout(700);
if (info.k2) { await p.keyboard.type(info.k2.split(' ')[0].slice(0, 5), { delay: 60 }); await p.waitForTimeout(1500); }
await snap(p, '08-ctrl-k-acha-filho', true);
await p.context().close();

// ---------------------------------------------------------------- celular
const m = await start(390, 844);
const i2 = await setup(m);
await openFam(m, `p:${i2.x}`);
await m.waitForTimeout(1300);
await scrollTo(m, /Árvore da família/);
await snap(m, '09-arvore-celular-390');
await b.close();
