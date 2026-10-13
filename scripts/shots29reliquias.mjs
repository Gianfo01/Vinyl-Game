// R29 (relíquias procedurais) — capturas: Lendas → Relíquias com peças procedurais, a ficha de uma delas (história,
// estado, procedência), o Acervo vivo, o mercado negro (com uma falsificação à venda) e o museu do selo.
// Partida rápida pela tela inicial (NOVA RUN → COMEÇAR MINHA HISTÓRIA, pt-BR). Saída em docs/shots29reliquias/.
// As peças nascem pelo caminho de sempre (fila do relics29 → flush29), com o teto anual aberto só para a captura.
// Uso (servidor de desenvolvimento rodando):  npx vite --port 5347 &   node scripts/shots29reliquias.mjs [pasta] [porta]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright');
const out = process.argv[2] ?? 'docs/shots29reliquias';
const port = process.argv[3] ?? '5347';
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

const ctx = await b.newContext({ locale: 'pt-BR', viewport: { width: 1440, height: 920 } });
const p = await ctx.newPage();
p.on('pageerror', (e) => console.error('PAGEERR', e.message));
await p.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle', timeout: 180000 });
await p.waitForTimeout(1500);
const click = async (re) => { await p.getByRole('button', { name: re }).first().click({ timeout: 60000 }); await p.waitForTimeout(800); };
await click(/NOVA RUN|NEW RUN/i);
await click(/COMEÇAR MINHA HISTÓRIA|START MY STORY/i);
await p.waitForTimeout(2500);
// máquina ocupada: espera a partida existir de verdade
for (let i = 0; i < 120 && !(await p.evaluate(async () => !!(await import('/src/ui/store.ts')).store.game)); i++) await p.waitForTimeout(1000);
if (!(await p.evaluate(async () => !!(await import('/src/ui/store.ts')).store.game))) { await p.screenshot({ path: `${out}/_debug.png` }); throw new Error('a partida não começou'); }
for (let i = 0; i < 6; i++) { if (!(await p.$('.overlay, .scene-overlay'))) break; await p.keyboard.press('Escape'); await p.waitForTimeout(300); }

const info = await p.evaluate(async () => {
  document.querySelectorAll('.overlay, .scene-overlay').forEach((e) => e.remove());
  const st = await import('/src/ui/store.ts');
  const off = await import('/src/ui/tutoff19.ts').catch(() => null);
  if (off) off.setTutorials19(st.store.prefs, false);
  const R = await import('/src/sim/sys/relics29.ts');
  const R9 = await import('/src/sim/sys/relics9.ts');
  const { Rng } = await import('/src/core/rng.ts');
  const g = st.store.game;
  g.player.cash = Math.max(g.player.cash, 2e8);
  const ok = (a) => a.members.length && a.members.every((m) => g.persons[m]);
  const acts = Object.values(g.acts).filter(ok).sort((a, b) => b.fame - a.fame);
  const mine = Object.values(g.acts).filter((a) => ok(a) && (a.owner === 'player' || a.playerBand));
  const plan = [['smashed', 'show'], ['named_guitar', 'show'], ['napkin_lyrics', 'hit'], ['stage_outfit', 'show'], ['hit_piano', 'hit'], ['ceremony_outfit', 'award'],
    ['tour_van', 'split'], ['drum_head', 'split'], ['infamous', 'scandal'], ['signed', 'charity'], ['personal', 'death'], ['charred', 'fire'], ['show_poster', 'farewell']];
  R.CAPS29.year = 99; // só para a captura: várias peças no mesmo mês
  const q = R.rel29(g).q;
  plan.forEach(([arch, o], i) => { const a = acts[i * 2 + 1]; if (a) q.push([R.ARCH29.indexOf(arch), a.id, a.members[0], a.city, 70, o, 'Noite de Neon', `shot:${i}`, '']); });
  for (const [i, arch] of ['first_contract', 'master_tape', 'tour_pass', 'console'].entries()) { const a = mine[i % Math.max(1, mine.length)] ?? acts[40 + i]; if (a) q.push([R.ARCH29.indexOf(arch), a.id, a.members[0], a.city, 60, 'sign', 'Primeiro Disco', `shotm:${i}`, '']); }
  q.push([R.ARCH29.indexOf('fixture'), '', '', g.config.homeCity, 60, 'closing', 'Estúdio Aurora', 'shot:fx', '']);
  const born = R.flush29(g);
  R.CAPS29.year = 4;
  // valor de partida mais alto nas peças da captura (as lendas da partida já são lendas)
  for (const rl of born) rl.v = Math.round(rl.v * 3);
  // uma falsificação da peça mais valiosa vai ao mercado negro (o de sempre, no Submundo)
  const top = born.filter((x) => x.st !== 'auction').sort((a, b) => b.v - a.v)[0];
  const fake = top ? R.forge29(g, top, Rng.fromSeed('shot-forge')) : null;
  // arremata os lotes em leilão (autografado beneficente, letreiro do estúdio) pelo fluxo de sempre
  for (const rl of born) if (rl.st === 'auction') R9.buyRelic(g, rl.id);
  // expõe as peças do seu acervo (rendem prestígio e entram no museu)
  for (const rl of R9.relics(g).list) if (rl.st === 'player') rl.ex = 1;
  const cm = await import('/src/ui/common.ts');
  cm.rerender();
  const smashed = born.find((x) => R.meta29(g, x.id)?.arch === 'smashed') ?? born[0];
  return { year: g.year, born: born.map((x) => `${x.n.pt} [${R.meta29(g, x.id)?.arch}] ${x.st}`), fake: fake?.n.pt, open: smashed?.id };
});
console.log(JSON.stringify(info, null, 1));

const go = async (area, tabKey, tab) => {
  await p.evaluate(async ([area, tabKey, tab]) => {
    document.querySelectorAll('.overlay, .scene-overlay, .modal-back').forEach((e) => e.remove());
    const st = await import('/src/ui/store.ts');
    const vis = await import('/src/ui/vis.ts');
    if (tabKey) vis.setTab(tabKey, tab);
    st.store.area = area;
    const cm = await import('/src/ui/common.ts');
    cm.rerender();
  }, [area, tabKey, tab]);
  await p.waitForTimeout(1200);
};
const snap = async (name) => { await p.mouse.move(1435, 900); await p.waitForTimeout(250); await p.screenshot({ path: `${out}/${name}.png` }); console.log('ok', name); };
/** Rola a página até o texto (a área rola num contêiner interno, então fullPage não ajuda). */
const scrollTo = async (re) => { const el = p.getByText(re).first(); if (await el.count()) { await el.evaluate((e) => e.scrollIntoView({ block: 'start' })); await p.waitForTimeout(500); } };

await go('lendas', 'lendas9', 'relics');
await scrollTo(/^Seu acervo vale/);
await snap('01-lendas-reliquias');
await p.evaluate(async (id) => { const m = await import('/src/ui/sys/lendas9.ts'); const st = await import('/src/ui/store.ts'); m.openRelic(st.store.game, id); }, info.open);
await p.waitForTimeout(1200);
await snap('02-ficha-reliquia-procedural');
await go('lendas', 'lendas9', 'relics18');
await scrollTo(/^Seu acervo$/i);
await snap('03-acervo-vivo');
await scrollTo(/^Nascidas nesta partida$/i);
await snap('03b-acervo-vivo-nascidas');
await go('crime', 'crime17', 'market');
await scrollTo(/^Seu esconderijo$/i);
await snap('04-mercado-negro-falsificacao');
await go('goals', 'lv-goals', 'museum');
await scrollTo(/^Instrumentos de lendas$/i);
await snap('05-museu-do-selo');
await b.close();
