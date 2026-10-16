// R31 · onda 5 (ELENCO) — capturas dos papéis do elenco com exp5.nav LIGADO, em 3 épocas: mural de cortiça (tecla 4,
// com o menu de ações aberto), quadro de planejamento (C), agenda de couro (G), fichário (A), contratação e chefe (Shift+D).
// Abre tudo pelas TECLAS da navegação nova (como o jogador), não por chamada direta.
// Uso: npx vite --host 127.0.0.1 --port 5871 &   node scripts/shots31elenco5.mjs [pasta] [porta]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright');
const out = process.argv[2] ?? 'docs/r31/shots';
const port = process.argv[3] ?? '5871';
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, locale: 'pt-BR' });
p.on('pageerror', (e) => console.error('PAGEERR', e.message));
await p.goto(`http://127.0.0.1:${port}/`); await p.waitForTimeout(3500);
p.setDefaultTimeout(0);

const shot = async (name) => { await p.waitForTimeout(700); await p.screenshot({ path: `${out}/onda5-elenco-${name}.png` }); console.log('captura', name); };
const key = async (k) => {
  await p.evaluate(async () => { document.querySelectorAll('.overlay, .am20').forEach((e) => e.remove()); (document.activeElement)?.blur?.(); (await import('/src/ui/r31/elenco5.ts')).closePaper5(); });
  await p.waitForTimeout(150); await p.keyboard.press(k); await p.waitForTimeout(600);
};

for (const [year, months] of [[1962, 10], [1987, 10], [2016, 10]]) {
  const info = await p.evaluate(async ([year, months]) => {
    const st = await import('/src/ui/store.ts');
    const wg = await import('/src/sim/worldgen.ts');
    const bot = await import('/src/sim/bot.ts');
    const pb = await import('/src/sim/playbot16.ts');
    const tick = await import('/src/sim/tick.ts');
    const off = await import('/src/ui/tutoff19.ts');
    const sw = await import('/src/sim/r31/switches.ts');
    const c = await import('/src/ui/common.ts');
    const util = await import('/src/sim/util.ts');
    const g = wg.createGame(bot.defaultConfig(`el5-${year}`, { startYear: year }));
    g.tutorial = { step: 99, done: true, seen: [] };
    off.setTutorials19(st.store.prefs, false);
    for (let i = 0; i < months; i++) { pb.playMonth(g, 'balanced'); tick.advanceMonth(g); }
    // um plano reservado e um lançamento programado para o quadro ter o que mostrar (as funções de hoje)
    const cap = await import('/src/sim/capacity.ts');
    const mine = util.playerActs(g);
    if (mine[0]) cap.reservePlan(g, mine[0], 'record', cap.monthIndex(g) + 2, { months: 2 });
    if (mine[1]) cap.reservePlan(g, mine[1], 'rest', cap.monthIndex(g) + 1);
    sw.setSw(g, 'exp5.nav', true);
    st.store.game = g;
    st.store.area = 'desk';
    window.__g = g;
    c.rerender();
    return { year: g.year, month: g.month, roster: mine.length };
  }, [year, months]);
  console.log('jogo', JSON.stringify(info));
  await p.waitForTimeout(1500);
  const y = String(year);
  await key('4'); await shot(`mural-${y}`);
  const pol = await p.$('.el5-pol .el5-act');
  if (pol) { const box = await p.$eval('.el5-pol', (e) => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }); await p.mouse.click(box.x, box.y, { button: 'right' }); await shot(`mural-acoes-${y}`); }
  await key('c'); await shot(`quadro-${y}`);
  await key('g'); await shot(`agenda-${y}`);
  await key('a'); await shot(`fichario-${y}`);
  await key('Shift+D'); await shot(`chefe-${y}`);
  await p.evaluate(async () => { const e = await import('/src/ui/r31/elenco5.ts'); e.openHire5('jornal'); }); await shot(`contratar-${y}`);
  await p.evaluate(async () => { const e = await import('/src/ui/r31/elenco5.ts'); e.closePaper5(); });
}
await b.close();
