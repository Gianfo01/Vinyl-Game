// R31 · onda 5 (POL5) — varredura de acabamento com exp5.nav ligado: abre cada papel da sede e da casa, as regiões,
// a pausa e a ajuda em várias épocas e mede no navegador: contraste do cabeçalho do papel (letra × moldura por baixo),
// texto cortado sem reticências, filho vazando do papel, botão habilitado com cara de apagado e ícone fora do círculo.
// Uso: npx vite --config scripts/vite5nw.config.mjs --host 127.0.0.1 --port 5891 &
//      node scripts/r31/audit-pol5.mjs <pasta-capturas> [porta] [anos=1912,1962,1985,2005,2025] [só-objetos]
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright');
const out = process.argv[2] ?? 'docs/r31/shots/pol5-audit';
const port = process.argv[3] ?? '5891';
const years = (process.argv[4] ?? '1912,1962,1985,2005,2025').split(',').map(Number);
const only = process.argv[5]?.split(',');
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, locale: 'pt-BR' });
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
await p.goto(`http://127.0.0.1:${port}/`); await p.waitForTimeout(3000);
p.setDefaultTimeout(120000);
const start = (y, hq) => p.evaluate(async ([y, hq]) => {
  const wg = await import('/src/sim/worldgen.ts'); const botc = await import('/src/sim/bot.ts');
  const st = await import('/src/ui/store.ts'); const tick = await import('/src/sim/tick.ts');
  const bot = await import('/src/sim/playbot16.ts'); const sw = await import('/src/sim/r31/switches.ts');
  const off = await import('/src/ui/tutoff19.ts'); const c = await import('/src/ui/common.ts');
  const sh = await import('/src/ui/r31/shell5.ts');
  const g = wg.createGame(botc.defaultConfig(`pol5a-${y}`, { startYear: y, scenario: 'established' }));
  g.tutorial = { step: 99, done: true, seen: [] };
  off.setTutorials19(st.store.prefs, false);
  for (let i = 0; i < 2; i++) { bot.playMonth(g, 'balanced'); tick.advanceMonth(g); }
  g.player.hq = hq;
  sw.setSw(g, 'exp5.nav', true);
  Object.assign(sh.SH5, { region: 'sede', paper: null, pause: false, help: false });
  st.store.game = g; c.rerender();
  document.querySelectorAll('.overlay').forEach((e) => e.remove());
  const o5 = await import('/src/ui/r31/objects5.ts');
  return o5.objects5().filter((o) => !o.career && !o.place.endsWith('.lugar') && (o.place.startsWith('sede.') || o.place.startsWith('casa.') || o.place.startsWith('mundo.'))).map((o) => o.id);
}, [y, hq]);
const audit = () => p.evaluate(() => {
  const L = (r, g, b) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const ratio = (a, b) => { const [x, y] = [L(...a), L(...b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
  const rgb = (s) => (s.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
  const issues = [];
  const sheet = document.querySelector('.p5');
  if (sheet) {
    const cv = sheet.querySelector('.p5-cv');
    const cx = cv.getContext('2d');
    const cr = cv.getBoundingClientRect();
    for (const sel of ['.p5-t', '.p5-sub']) {
      const el = sheet.querySelector(sel);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 2) { issues.push({ k: 'cabeçalho', sel, why: 'sem largura (cortado)' }); continue; }
      let bg;
      const plate = sheet.dataset.plate ? sheet.querySelector('.p5-ttl') : null;
      if (plate) bg = rgb(getComputedStyle(plate).backgroundColor);
      else {
        const sx = cv.width / cr.width, sy = cv.height / cr.height;
        const d = cx.getImageData(Math.max(0, (r.left - cr.left) * sx), Math.max(0, (r.top - cr.top) * sy), Math.max(1, r.width * sx), Math.max(1, r.height * sy)).data;
        let R = 0, G = 0, B = 0, n = 0; for (let i = 0; i < d.length; i += 4) { R += d[i]; G += d[i + 1]; B += d[i + 2]; n++; }
        bg = [R / n, G / n, B / n];
      }
      const fg = rgb(getComputedStyle(el).color);
      const cRatio = ratio(fg, bg);
      if (cRatio < (sel === '.p5-t' ? 4.5 : 4.5)) issues.push({ k: 'contraste', sel, ratio: +cRatio.toFixed(2), fg, bg: bg.map(Math.round) });
      if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).textOverflow !== 'ellipsis') issues.push({ k: 'cortado', sel });
    }
    const pr = sheet.getBoundingClientRect();
    for (const el of sheet.querySelectorAll('.p5-head *, .p5-tabs > *')) {
      const r = el.getBoundingClientRect();
      if (r.width && (r.right > pr.right + 1 || r.left < pr.left - 1)) issues.push({ k: 'vaza do papel', sel: el.className || el.tagName });
    }
  }
  // botões habilitados com cara de apagados; texto cortado sem reticências (na tela inteira, só visíveis)
  const seen = new Set();
  for (const el of document.querySelectorAll('.app5 button:not([disabled])')) {
    const r = el.getBoundingClientRect(); if (!r.width || r.bottom < 0 || r.top > innerHeight) continue;
    const op = +getComputedStyle(el).opacity; if (op < 0.55 && !el.closest('.el5-act')) issues.push({ k: 'botão apagado', t: (el.textContent || '').trim().slice(0, 30), op });
  }
  for (const el of document.querySelectorAll('.app5 b, .app5 span, .app5 small, .app5 h1, .app5 h2, .app5 h3, .app5 h4, .app5 button, .app5 a, .app5 td, .app5 th, .app5 label, .app5 p')) {
    const r = el.getBoundingClientRect(); if (!r.width || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;
    const cs = getComputedStyle(el);
    if (cs.overflow === 'visible' && cs.overflowX === 'visible') continue;
    if (el.scrollWidth > el.clientWidth + 2 && cs.textOverflow !== 'ellipsis' && cs.whiteSpace === 'nowrap' && !el.querySelector('*')) {
      const k = (el.textContent || '').trim().slice(0, 40); if (!seen.has(k)) { seen.add(k); issues.push({ k: 'texto cortado', t: k }); }
    }
  }
  return issues;
});
const report = [];
const snap = async (name) => { await p.evaluate(() => document.querySelectorAll('.overlay, .toast').forEach((e) => e.remove())); await p.screenshot({ path: `${out}/${name}.png` }); };
for (const y of years) {
  const hq = y < 1950 ? 1 : y < 1980 ? 2 : y < 2010 ? 3 : 4;
  const ids = await start(y, hq);
  await p.waitForTimeout(800);
  report.push({ y, screen: 'sede', issues: await audit() }); await snap(`${y}-sede`);
  for (const id of ids) {
    if (only && !only.includes(id)) continue;
    await p.evaluate(async (id) => { const sh = await import('/src/ui/r31/shell5.ts'); sh.SH5.paper = null; const n = await import('/src/ui/r31/nav5.ts'); n.open5(id); }, id);
    await p.waitForTimeout(700);
    report.push({ y, screen: id, issues: await audit() }); await snap(`${y}-${id}`);
  }
  if (!only) for (const [k, name] of [['Shift+Digit2', 'casa'], ['Shift+Digit3', 'cidade'], ['Shift+Digit4', 'mundo']]) {
    await p.evaluate(async () => { const sh = await import('/src/ui/r31/shell5.ts'); sh.SH5.paper = null; });
    await p.keyboard.press('Escape'); await p.keyboard.press('Escape');
    await p.keyboard.press(k); await p.waitForTimeout(1500);
    report.push({ y, screen: name, issues: await audit() }); await snap(`${y}-${name}`);
  }
  if (!only) {
    await p.keyboard.press('h'); await p.waitForTimeout(1200);
    await p.keyboard.press('Escape'); await p.waitForTimeout(600); report.push({ y, screen: 'pausa', issues: await audit() }); await snap(`${y}-pausa`);
    await p.keyboard.press('Escape'); await p.keyboard.press('?'); await p.waitForTimeout(600); report.push({ y, screen: 'ajuda', issues: await audit() }); await snap(`${y}-ajuda`);
    await p.keyboard.press('Escape');
  }
  console.log('ano', y, 'telas', report.filter((r) => r.y === y).length, 'com achados', report.filter((r) => r.y === y && r.issues.length).length);
}
writeFileSync(`${out}/audit.json`, JSON.stringify({ errs, report }, null, 1));
await b.close();
