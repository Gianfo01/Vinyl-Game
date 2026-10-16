// R31 · onda 5 (TRN, EXP-11) — capturas quadro a quadro das transições em 3 épocas (1925, 1985, 2025) e o quadro das
// quatro cortinas. O relógio da página é congelado (performance.now) e avançado à mão: cada quadro é o instante exato.
// Uso: npx vite --host 127.0.0.1 --port 5871 &   node scripts/shots31trn.mjs [pasta] [porta]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright');
const out = process.argv[2] ?? 'docs/r31/shots';
const port = process.argv[3] ?? '5871';
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const W = 1440, H = 900;
const p = await b.newPage({ viewport: { width: W, height: H }, locale: 'pt-BR' });
p.on('pageerror', (e) => console.error('PAGEERR', e.message));
p.setDefaultTimeout(0);
await p.goto(`http://127.0.0.1:${port}/`); await p.waitForTimeout(3000);

// relógio congelado
await p.evaluate(() => {
  const orig = performance.now.bind(performance);
  window.__T = null;
  performance.now = () => (window.__T === null ? orig() : window.__T);
});
const freeze = () => p.evaluate(() => { window.__T = performance.now(); return window.__T; });
const unfreeze = () => p.evaluate(() => { window.__T = null; });
const setT = (t) => p.evaluate((t) => { window.__T = t; }, t);

async function newGame(year, city) {
  await unfreeze();
  return p.evaluate(async ([year, city]) => {
    const st = await import('/src/ui/store.ts');
    const wg = await import('/src/sim/worldgen.ts');
    const bot = await import('/src/sim/bot.ts');
    const tick = await import('/src/sim/tick.ts');
    const off = await import('/src/ui/tutoff19.ts');
    const c = await import('/src/ui/common.ts');
    const trn = await import('/src/ui/r31/trn31.ts');
    trn.skipTrn31();
    document.querySelectorAll('.overlay').forEach((e) => e.remove());
    const g = wg.createGame(bot.defaultConfig(`trn-${year}`, { scenario: 'established', startYear: year, dbSize: 'small', homeCity: city }));
    g.tutorial = { step: 99, done: true, seen: [] };
    off.setTutorials19(st.store.prefs, false);
    st.store.prefs.cutscenes = false;
    for (let i = 0; i < 2; i++) { bot.playMonth?.(g, 'balanced'); tick.advanceMonth(g); }
    st.store.game = g;
    window.__g = g;
    st.store.area = 'sede25';
    c.rerender();
    return { year: g.year, month: g.month, city: g.config.homeCity };
  }, [year, city]);
}
const go = (area, tab) => p.evaluate(async ([area, tab]) => {
  const st = await import('/src/ui/store.ts');
  const c = await import('/src/ui/common.ts');
  const vis = await import('/src/ui/vis.ts');
  document.querySelectorAll('.overlay').forEach((e) => e.remove());
  if (tab) vis.setTab(tab[0], tab[1]);
  st.store.area = area;
  c.rerender();
}, [area, tab]);
const settle = async () => { await unfreeze(); await p.evaluate(async () => (await import('/src/ui/r31/trn31.ts')).skipTrn31()); await p.waitForTimeout(500); };

/** Captura os instantes `ts` (ms desde t0) da transição já começada; devolve os PNGs. */
async function frames(t0, ts) {
  const imgs = [];
  for (const t of ts) {
    await setT(t0 + t);
    await p.waitForTimeout(140);
    imgs.push({ t, png: (await p.screenshot()).toString('base64') });
  }
  return imgs;
}
/** Folha 2×2 (ou 3×2) com legenda, como os mocks aprovados. */
async function sheet(name, title, desc, imgs, caps) {
  const cols = 2, rows = Math.ceil(imgs.length / 2);
  const cw = 704, ch = 440, top = 84;
  const data = await p.evaluate(async ([imgs, caps, title, desc, cols, rows, cw, ch, top]) => {
    const cv = document.createElement('canvas');
    cv.width = 16 + cols * (cw + 16); cv.height = top + rows * (ch + 40) + 10;
    const g = cv.getContext('2d');
    g.fillStyle = '#06080e'; g.fillRect(0, 0, cv.width, cv.height);
    g.textBaseline = 'top';
    g.fillStyle = '#f0c060'; g.font = '20px "Press Start 2P", monospace'; g.fillText(title, 16, 16);
    g.fillStyle = '#c8d0dc'; g.font = '20px sans-serif'; g.fillText(desc, 16, 48);
    for (let i = 0; i < imgs.length; i++) {
      const im = new Image();
      await new Promise((r) => { im.onload = r; im.src = `data:image/png;base64,${imgs[i].png}`; });
      const x = 16 + (i % cols) * (cw + 16), y = top + Math.floor(i / cols) * (ch + 40);
      g.fillStyle = '#f0c060'; g.font = '600 19px sans-serif'; g.fillText(`${i + 1} · ${caps[i]}`, x, y);
      g.imageSmoothingEnabled = true; g.drawImage(im, x, y + 26, cw, ch);
      g.strokeStyle = '#2b4260'; g.lineWidth = 2; g.strokeRect(x, y + 26, cw, ch);
    }
    return cv.toDataURL('image/png').split(',')[1];
  }, [imgs, caps, title, desc, cols, rows, cw, ch, top]);
  const fs = await import('node:fs');
  fs.writeFileSync(`${out}/onda5-trn-${name}.png`, Buffer.from(data, 'base64'));
  console.log('folha', name);
}

const ERAS = [[1925, 'rio'], [1985, 'london'], [2025, 'sao_paulo']];
const VEH = { ship: 'navio', train: 'trem', bus: 'ônibus', plane: 'avião' };
const fmt = (t) => `${(t / 1000).toFixed(2).replace('.', ',')} s`;
for (const [year, city] of ERAS) {
  const gi = await newGame(year, city);
  console.log('jogo', JSON.stringify(gi));
  await p.waitForTimeout(1500);

  // 1) viagem Sede → Cidade (a navegação de hoje: Shift+3 / menu Cidade)
  await go('sede25'); await settle();
  let t0 = await freeze();
  await p.keyboard.press('Shift+Digit3');
  let fr = await frames(t0, [0, 120, 250, 330, 420]);
  await settle();
  await sheet(`${year}-viagem`, `VIAGEM: SEDE → CIDADE · ${year}`, 'Cortina da época fecha, cartão do destino com o que espera lá, cortina abre (0,5 s; tecla ou clique pula).',
    [fr[0], fr[1], fr[2], fr[4]], [`${fmt(0)} · na sede, Shift+3 (Cidade)`, `${fmt(120)} · a cortina fecha`, `${fmt(250)} · fechada: cartão do destino`, `${fmt(420)} · abre já na cidade`]);

  // 2) objeto da sede: clique numa sala (zoom em pixel + papel sobe) e Esc (papel desce)
  await go('sede25'); await p.waitForTimeout(1200); await settle();
  const room = p.locator('.sede25 .hq25-room[data-room]').first();
  const box = await room.boundingBox().catch(() => null);
  if (box) {
    t0 = await freeze();
    await p.mouse.click(box.x + 24, box.y + 12); // no rótulo da sala (o meio pode ser uma pessoa)
    fr = await frames(t0, [0, 80, 150, 230]);
    await setT(t0 + 2000); await p.waitForTimeout(200);
    const after = await p.evaluate(async () => (await import('/src/ui/store.ts')).store.area);
    await sheet(`${year}-objeto`, `ABRIR UMA SALA DA SEDE · ${year}`, `Sem cortina: zoom em pixel no objeto clicado e o papel sobe (0,3 s). Abriu: ${after}.`,
      fr, [`${fmt(0)} · clique na sala`, `${fmt(80)} · zoom em pixel`, `${fmt(150)} · zoom cheio`, `${fmt(230)} · o papel sobe`]);
    // Esc: o papel desce e volta à sede
    t0 = await freeze();
    await p.keyboard.press('Escape');
    fr = await frames(t0, [0, 60, 120]);
    await setT(t0 + 1000); await p.waitForTimeout(250);
    fr.push({ t: 1000, png: (await p.screenshot()).toString('base64') });
    await settle();
    await sheet(`${year}-fechar`, `ESC: O PAPEL DESCE · ${year}`, 'Esc (ou voltar) numa página aberta pelo zoom: o papel desce em 0,15 s e a sede volta. Atalhos de teclado abrem direto, sem zoom.',
      fr, [`${fmt(0)} · Esc`, `${fmt(60)} · desce`, `${fmt(120)} · quase fora`, `${fmt(1000)} · sede de volta`]);
  } else console.error('sem sala clicável na sede', year);

  // 3) Mundo → viajar até outra cidade (passagem com a cotação real)
  await go('world', ['worldHub', 'map27']); await p.waitForTimeout(2500); await settle();
  const dest = { 1925: 'paris', 1985: 'new_york', 2025: 'tokyo' }[year];
  t0 = await freeze();
  const tk = await p.evaluate(async ([dest]) => {
    const g = window.__g;
    const m = await import('/src/sim/sys/mapx8.ts');
    const w = await import('/src/data/world.ts');
    const c = await import('/src/ui/common.ts');
    const map = await import('/src/ui/map.ts');
    const mo = await import('/src/ui/r31/trn31model.ts');
    const trn = await import('/src/ui/r31/trn31.ts');
    const i18 = await import('/src/i18n/strings.ts');
    const from = m.ownerCity(g);
    const q = m.travelQuote(g, dest);
    const k = mo.ticketInfo31({ from: i18.t(w.cityById[from].name), to: i18.t(w.cityById[dest].name), fromId: from, toId: dest, month: g.month, year: g.year, mode: q.mode, modeName: map.MODE_L31[q.mode], days: q.days, cost: c.$(q.cost) });
    document.querySelector('.wmap, .map27-map')?.scrollIntoView({ block: 'center' });
    trn.transition31('trip', { year: g.year, ticket: k });
    return { ...k, line: i18.t(mo.ticketLine31(k)) };
  }, [dest]);
  console.log('passagem', JSON.stringify(tk));
  fr = await frames(t0, [120, 300, 480, 750, 1100]);
  await settle();
  await sheet(`${year}-mundo`, `MUNDO: VIAJAR PARA ${tk.to.toUpperCase()} · ${year}`, `A rota anda no mapa com o transporte da época (${VEH[tk.vehicle]}); cortina com a passagem: ${tk.line}.`,
    [fr[0], fr[1], fr[3], fr[4]], [`${fmt(120)} · a rota começa`, `${fmt(300)} · ${VEH[tk.vehicle]} chegando`, `${fmt(750)} · cortina fechada: a passagem`, `${fmt(1100)} · a cortina abre`]);

  // 4) virada do mês (Ctrl+Enter = Avançar mês, o caminho de sempre)
  await go('sede25'); await p.waitForTimeout(800); await settle();
  t0 = await freeze();
  await p.keyboard.press('Control+Enter');
  await p.waitForTimeout(300);
  let has = await p.evaluate(() => !!document.querySelector('.trn31.k-month'));
  for (let i = 0; i < 4 && !has; i++) {
    // um diálogo do avanço apareceu antes (atividade jogável, cartões): "Resolver rápido" / confirmar, como o jogador
    const clicked = await p.evaluate(() => {
      const bs = [...document.querySelectorAll('.overlay button')];
      const b = bs.find((x) => /Resolver rápido|Avançar|Continuar|Confirmar/i.test(x.textContent ?? ''));
      b?.click();
      return b?.textContent ?? null;
    });
    console.log('diálogo antes da virada:', clicked);
    await p.waitForTimeout(400);
    has = await p.evaluate(() => !!document.querySelector('.trn31.k-month'));
    if (!clicked) break;
  }
  if (!has) {
    // ainda não: avança direto pela simulação e mostra a transição com as pendências reais
    await p.evaluate(async () => {
      const g = window.__g;
      const tick = await import('/src/sim/tick.ts');
      const pend = await import('/src/sim/r31/pending.ts');
      const mo = await import('/src/ui/r31/trn31model.ts');
      const trn = await import('/src/ui/r31/trn31.ts');
      const c = await import('/src/ui/common.ts');
      document.querySelectorAll('.overlay').forEach((e) => e.remove());
      const m0 = [g.month, g.year];
      tick.advanceMonth(g); c.rerender();
      trn.transition31('month', { year: g.year, month: mo.monthInfo31({ old: m0, now: [g.month, g.year], pend: pend.pendingList(g).map((x) => ({ title: x.title, prio: x.prio, due: x.due })) }) });
    });
    console.log('virada pelo caminho direto', year);
  }
  t0 = await p.evaluate(async () => { const trn = await import('/src/ui/r31/trn31.ts'); return trn.ctl.run?.t0 ?? window.__T; });
  fr = await frames(t0, [0, 120, 240, 700, 1290]);
  await settle();
  await p.evaluate(() => document.querySelectorAll('.overlay').forEach((e) => e.remove()));
  await sheet(`${year}-mes`, `VIRADA DO MÊS · ${year}`, 'A folha do calendário da época cai, o mês novo mostra só 1–3 pendências reais e a tela volta.',
    [fr[0], fr[2], fr[3], fr[4]], [`${fmt(0)} · Avançar mês (Ctrl+Enter)`, `${fmt(240)} · a folha cai`, `${fmt(700)} · o que pede você`, `${fmt(1290)} · a tela volta`]);
}

// 5) as quatro cortinas (mesmo tempo e cartão; muda o material)
const cur = [];
for (const [year, city] of [[1905, 'rio'], [1962, 'london'], [1985, 'stockholm'], [2025, 'sao_paulo']]) {
  await newGame(year, city);
  await p.waitForTimeout(1200);
  await go('sede25'); await settle();
  const t0 = await freeze();
  await p.keyboard.press('Shift+Digit3');
  cur.push((await frames(t0, [250]))[0]);
  await settle();
}
await sheet('cortinas', 'CADA ÉPOCA TEM A SUA CORTINA', 'Veludo vermelho (1889–1949), vinho (1950–79), lâminas de metal e neon (1980–2009), painel de LED (2010–40).',
  cur, ['1905 · veludo vermelho com franja', '1962 · veludo vinho', '1985 · lâminas de metal e neon', '2025 · painel de LED']);
await b.close();
