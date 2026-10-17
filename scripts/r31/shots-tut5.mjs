// R31 · onda 5 (TUT, EXP-12) — capturas do tutorial guiado em 2 épocas (docs/r31/shots/onda5-tut-*.png).
// Começa pela tela inicial como o jogador: APRENDER A JOGAR → época → a partida com o mentor. Em cada passo faz o que o
// passo pede: clica no alvo de verdade (objeto, viagem, botão da casca, "Entendi"); as ações dentro das páginas
// (contratar, marcar, gravar, lançar, show, viagem, descanso) usam as mesmas funções dos botões. Captura o 1º passo de
// cada capítulo, um clique bloqueado ("primeiro aqui"), o menu do Esc, o diploma e o mentor no telefone.
// Uso: npx vite --host 127.0.0.1 --port 5871 &   node scripts/r31/shots-tut5.mjs [porta]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright');
const port = process.argv[2] ?? '5871';
const out = 'docs/r31/shots';
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium' });

for (const year of [1925, 1975]) {
  const p = await b.newPage({ viewport: { width: 1360, height: 860 }, locale: 'pt-BR' });
  p.on('pageerror', (e) => console.error('PAGEERR', e.message));
  await p.addInitScript(() => { try { localStorage.setItem('vtn:sw31ui', JSON.stringify({ 'exp5.tut': true })); } catch { /* */ } });
  await p.goto(`http://127.0.0.1:${port}/`); await p.waitForTimeout(3000);
  p.setDefaultTimeout(20000);
  await p.locator('[data-h5="tut"]').click(); await p.waitForTimeout(600);
  if (year === 1925) await p.screenshot({ path: `${out}/onda5-tut-entrada.png` });
  await p.locator(`[data-tut5="${year}"]`).click();
  for (let i = 0; i < 60 && !(await p.evaluate(() => !!document.querySelector('.tu5'))); i++) await p.waitForTimeout(1000);
  await p.evaluate(async () => { const st = await import('/src/ui/store.ts'); st.store.prefs.ask19 = false; });
  const shot = async (name) => { await p.waitForTimeout(700); await p.screenshot({ path: `${out}/onda5-tut-${year}-${name}.png` }); console.log('captura', year, name); };
  const cur = () => p.evaluate(async () => {
    const m = await import('/src/ui/r31/tut5model.ts');
    const st = await import('/src/ui/store.ts');
    const c = m.cur5(st.store.game);
    return c ? { ch: c.ch.id, st: c.step.id, si: c.si, do: c.step.do } : null;
  });
  /** Fecha janelas e cenas do próprio jogo (atividade da virada, cenas, avisos) como um jogador apressado. */
  const clear = async (quick) => {
    for (let i = 0; i < 10; i++) {
      await p.waitForTimeout(900);
      const pop = p.locator('.overlay .modal, .scene-overlay').last();
      if (!(await pop.count())) return;
      const b = pop.locator('button').filter({ hasText: quick ? /RESOLVER RÁPIDO|Resolver rápido/ : /RESOLVER RÁPIDO|Resolver rápido|Continuar|Fechar|Seguir|OK|Pular|Começar|COMEÇAR/ }).first();
      const x = pop.locator('.scene-head button.icon');
      if (await b.count()) await b.click({ timeout: 5000 }).catch(() => undefined);
      else if (await x.count()) await x.first().click({ timeout: 5000 }).catch(() => undefined);
      else await p.keyboard.press('Escape');
      if (quick && i > 1) quick = false;
    }
  };
  let last = '';
  let blocked = false;
  for (let guard = 0; guard < 80; guard++) {
    const c = await cur();
    if (!c) break;
    const k = `${c.ch}/${c.st}`;
    if (k === last) { console.error('passo travado', k); break; }
    last = k;
    if (c.si === 0) await shot(`${String(guard).padStart(2, '0')}-${c.ch}`);
    if (!blocked && c.ch === 'contratar' && c.st === 'fichario') {
      // clique fora do alvo: nada acontece, "primeiro aqui" e o tremor
      await p.locator('.s5-obj[data-obj="trofeus"], .s5-obj[data-obj="revista"]').first().click({ force: true }).catch(() => undefined);
      await p.waitForTimeout(250); await shot('bloqueado');
      await p.keyboard.press('Escape'); await shot('esc');
      await p.keyboard.press('Escape'); await p.waitForTimeout(300);
      blocked = true;
    }
    const d = c.do;
    if (d.ack) { await clear(false); await p.locator('.tu5-b.main').first().click(); }
    else if (d.open) {
      const el = p.locator(`.s5-obj[data-obj="${d.open}"]`);
      if (await el.count() && !(await p.locator('.p5').count())) await el.first().click(); else await p.evaluate(async (id) => (await import('/src/ui/r31/nav5.ts')).open5(id), d.open);
    } else if (d.travel) await p.locator(`.b5-tr[data-travel="${d.travel}"]`).click();
    else if (d.shell === 'advance') { await p.locator('.t5-go').click(); await p.waitForTimeout(1200); await shot('virada-atividade'); await clear(true); await shot('virada-transicao'); await clear(false); }
    else if (d.shell === 'pin') await p.locator('.b5-pin').click();
    else if (d.shell === 'help') await p.locator('[data-t5="help"]').click();
    else if (d.shell === 'helpbox') await p.locator('.hk5 .p5-x').click();
    else if (d.bot === 'close') await p.locator('.p5 .p5-x').first().click();
    else if (d.bot) {
      if (d.bot === 'sign' || d.bot === 'record' || d.bot === 'release' || d.bot === 'show' || d.bot === 'trip' || d.bot === 'rest') await shot(`${String(guard).padStart(2, '0')}-${c.ch}-${c.st}`);
      const err = await p.evaluate(async (what) => {
        const st = await import('/src/ui/store.ts');
        const s = st.store.game;
        const band = s.acts[s.x4.tut5.band];
        const rng = (await import('/src/sim/rng19.ts')).rng19;
        try {
          if (what === 'sign') { const ct = await import('/src/sim/contracts.ts'); const r = ct.offerNow(s, rng(s, 'act'), ct.defaultOffer(s, band)); if (r.result === 'counter' && r.offer) ct.acceptCounter(s, r.offer.id); }
          if (what === 'plan') { const cp = await import('/src/sim/capacity.ts'); cp.reservePlan(s, band.id, 'record', cp.monthIndex(s) + 1); }
          if (what === 'record') (await import('/src/sim/studio.ts')).startSession(s, band.id, band.songs.slice(0, 2), 0, 'live');
          if (what === 'release') {
            const pr = await import('/src/sim/production.ts'); const w = await import('/src/data/world.ts');
            const song = band.songs.find((id) => s.songs[id]?.recorded && !s.songs[id].releaseId);
            pr.scheduleRelease(s, rng(s, 'act'), { actId: band.id, type: 'single', songs: [song], formats: pr.availableFormats(s).slice(0, 1), press: 500, marketing: [{ channel: 'press', budget: 500 }], territories: [w.cityById[s.config.homeCity].market], weeksAhead: 2 });
          }
          if (what === 'show') { const to = await import('/src/sim/tours.ts'); const rd = await import('/src/sim/sys/road27.ts'); to.planTour(s, { actId: band.id, cities: [s.config.homeCity], startInDays: 14, priceMult: 1, setlist: band.songs.filter((id) => s.songs[id]?.recorded), role: 'headline', pay: 'door', ...rd.sizedDraft16(s, band.id) }); }
          if (what === 'trip') { const mx = await import('/src/sim/sys/mapx8.ts'); const w = await import('/src/data/world.ts'); const home = w.cityById[s.config.homeCity]; for (const ci of w.CITIES.filter((x) => x.id !== home.id && x.market === home.market)) { const r = mx.travelTo(s, rng(s, 'act'), ci.id); if (!('pt' in r)) break; } }
          if (what === 'rest') (await import('/src/sim/sys/agenda17.ts')).restDay(s);
          (await import('/src/ui/common.ts')).rerender();
          return '';
        } catch (e) { return String(e); }
      }, d.bot);
      if (err) console.error('ação', d.bot, err);
    }
    await p.waitForTimeout(500);
    if (!d.ack) await clear(false);
  }
  await p.waitForTimeout(800);
  if (await p.locator('.tu5-dip').count()) { await shot('diploma'); await p.locator('.tu5-dip .tu5-b.main').click(); await p.waitForTimeout(500); }
  await p.waitForTimeout(1500);
  if (await p.locator('.overlay .modal').count()) { await shot('metas-depois'); await clear(false); }
  if (await p.locator('.tu5-phone').count()) { await p.locator('.tu5-phone').click({ force: true, timeout: 5000 }).catch(() => undefined); await shot('telefone'); }
  await p.close();
}
await b.close();
