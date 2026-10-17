// R31 · onda 5 (POL5) — TESTE de navegador: com exp5.nav ligado, a casca não pode ter rolagem horizontal (nem a página,
// nem nenhum pedaço dela) em 1280×720, 1366×768, 1440×900, 1600×700, 1920×1080 e 2560×1440; regiões sede, casa
// (inclusive a moradia mais larga), cidade e mundo; topo e barra de viagem sempre à vista; recados nunca por cima da sede.
// Sai com código 1 se algo falhar. Uso: (vite com exp5 no ar) node scripts/r31/check-pol5-janela.mjs [porta] [pasta-capturas]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright');
const port = process.argv[2] ?? '5891', out = process.argv[3];
const SIZES = [[1280, 720], [1366, 768], [1440, 900], [1600, 700], [1920, 1080], [2560, 1440]];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
let bad = 0;
for (const [W, H] of SIZES) {
  const p = await b.newPage({ viewport: { width: W, height: H }, locale: 'pt-BR' });
  await p.goto(`http://127.0.0.1:${port}/`); await p.waitForTimeout(2500); p.setDefaultTimeout(120000);
  for (const [year, house] of [[1985, 0], [2025, 99]]) {
    await p.evaluate(async ([year, house]) => {
      const wg = await import('/src/sim/worldgen.ts'); const botc = await import('/src/sim/bot.ts');
      const st = await import('/src/ui/store.ts'); const sw = await import('/src/sim/r31/switches.ts'); const c = await import('/src/ui/common.ts');
      const tick = await import('/src/sim/tick.ts'); const bot = await import('/src/sim/playbot16.ts'); const off = await import('/src/ui/tutoff19.ts');
      const sh = await import('/src/ui/r31/shell5.ts'); const ow = await import('/src/sim/sys/people/owner.ts');
      const g = wg.createGame(botc.defaultConfig(`jan-${year}`, { startYear: year, scenario: 'established' }));
      off.setTutorials19(st.store.prefs, false);
      for (let i = 0; i < 2; i++) { bot.playMonth(g, 'balanced'); tick.advanceMonth(g); }
      g.tutorial = { step: 99, done: true, seen: [] }; g.player.hq = year < 2000 ? 3 : 4;
      if (house) ow.ownerOf(g).house = ow.HOUSES.findIndex((x) => x.id === 'ranch'); // uma das moradias mais largas
      sw.setSw(g, 'exp5.nav', true);
      Object.assign(sh.SH5, { region: 'sede', paper: null, pause: false, help: false, rcOpen: undefined });
      st.store.game = g; c.rerender();
      document.querySelectorAll('.overlay').forEach((e) => e.remove());
    }, [year, house]);
    for (const [k, name] of [[null, 'sede'], ['Shift+Digit2', 'casa'], ['Shift+Digit3', 'cidade'], ['Shift+Digit4', 'mundo']]) {
      await p.evaluate(() => document.querySelectorAll('.overlay').forEach((e) => e.remove()));
      if (k) await p.keyboard.press(k);
      await p.waitForTimeout(1500);
      const r = await p.evaluate(() => {
        const hscroll = [...document.querySelectorAll('.app5, .app5 *')].filter((e) => { const c = getComputedStyle(e); return e.clientWidth > 40 && /(auto|scroll)/.test(c.overflowX) && e.scrollWidth > e.clientWidth + 1; }).map((e) => String(e.className).slice(0, 40));
        if (document.documentElement.scrollWidth > innerWidth + 1) hscroll.push('documento');
        const vis = (sel) => { const e = document.querySelector(sel); const q = e?.getBoundingClientRect(); return !!q && q.top >= 0 && q.bottom <= innerHeight + 1 && q.height > 0; };
        const rc = document.querySelector('.rc5:not(.min)')?.getBoundingClientRect();
        const cover = rc ? [...document.querySelectorAll('.s5-roomw, .s5-obj, .s5-lock')].some((x) => { const q = x.getBoundingClientRect(); return q.width > 0 && q.left < rc.right && q.right > rc.left && q.top < rc.bottom && q.bottom > rc.top; }) : false;
        return { hscroll, top: vis('.t5'), bottom: vis('.b5'), cover };
      });
      const fail = r.hscroll.length || !r.top || !r.bottom || r.cover;
      if (fail) bad++;
      console.log(`${fail ? 'FALHA' : 'ok   '} ${W}x${H} ${year} ${name}`, fail ? JSON.stringify(r) : '');
      if (out) await p.screenshot({ path: `${out}/janela-${W}x${H}-${year}-${name}.png` });
    }
  }
  await p.close();
}
await b.close();
console.log(bad ? `${bad} falha(s)` : 'tudo cabe: sem rolagem horizontal, topo e barra à vista, recados sem cobrir a sede');
process.exit(bad ? 1 : 0);
