// R31 · onda 5 · QA5 — robô de navegação com `exp5.nav` ligado (o jogo como o dono joga).
// Sobe o vite com VITE_EXP5NAV=1, começa partidas pela tela de Nova run (começo rápido) e percorre: cada objeto da sede e
// da casa (cartão de ações, cada ação, "ver tudo", Esc), a cidade (prédio de cada tipo, entrar e voltar), o mundo
// (país → cidade → voltar), o modo Arrumar (⇧O: cômodo, sede, gaveta, Esc), a viagem (⇧1–4, H), a pausa e o índice, a ajuda (?), a busca (Ctrl+K), o bolso e avançar mês.
// Falha (código 1) se aparecer, fora da lista de conhecidos (scripts/r31/qa5-known.json):
//   erro         erro de página / console
//   sem-volta    tela aberta que o Esc não fecha até voltar à cena da região (ou que cai na pausa)
//   antiga       página antiga inteira aberta direto por um clique (sem "ver tudo ▸"/"▸" nem índice da pausa)
//   moldura      moldura antiga dentro de um lugar (Cena / Ver como lista / Rótulos)
//   rolagem-h    rolagem horizontal na casca
//   sem-efeito   botão visível e habilitado que, clicado, não muda nada (DOM, toast, região)
// Uso: node scripts/r31/qa5.mjs [--quick] [--out arquivo.json] [--shots pasta]
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import net from 'node:net';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const QUICK = args.includes('--quick');
const OUT = opt('--out', null);
const SHOTS = opt('--shots', null);
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

const require = createRequire(import.meta.url);
let pw;
for (const m of [process.env.PLAYWRIGHT_PATH, 'playwright', '/opt/node-tools/node_modules/playwright'].filter(Boolean)) { try { pw = require(m); break; } catch { /* próximo */ } }
if (!pw) { console.error('qa5: playwright não encontrado'); process.exit(2); }
const exe = [process.env.CHROMIUM_PATH, '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'].find((x) => x && existsSync(x));

const freePort = async () => { for (let p = 5800; p < 6000; p++) { const ok = await new Promise((r) => { const s = net.createServer().once('error', () => r(false)).once('listening', () => s.close(() => r(true))).listen(p, '127.0.0.1'); }); if (ok) return p; } throw new Error('sem porta livre'); };

process.env.VITE_EXP5NAV = '1';
const { createServer } = await import('vite');
const port = await freePort();
const server = await createServer({ root, configFile: false, base: './', logLevel: 'error', server: { host: '127.0.0.1', port, strictPort: true, watch: null, hmr: false }, optimizeDeps: { entries: ['index.html'] } });
await server.listen();
const URL0 = `http://127.0.0.1:${port}/`;

const known = (() => { try { return JSON.parse(readFileSync(resolve(root, 'scripts/r31/qa5-known.json'), 'utf8')); } catch { return {}; } })();
const found = new Map(); // chave → { kind, where, detail, runs }
let runTag = '';
let step = ''; // último passo do robô (para o achado dizer onde travou)
const flag = (kind, where, detail = '') => {
  const key = `${kind}:${where}`;
  const f = found.get(key) ?? { kind, where, detail, runs: [] };
  if (!f.runs.includes(runTag)) f.runs.push(runTag);
  found.set(key, f);
};

const RUNS = QUICK
  ? [{ year: 1962, career: 'Gravadora', w: 1280, h: 720 }]
  : [
    { year: 1925, career: 'Artista', w: 1366, h: 768 },
    { year: 1962, career: 'Gravadora', w: 1280, h: 720 },
    { year: 1985, career: 'Festival', w: 1600, h: 700 },
    { year: 2015, career: 'Gravadora', w: 1920, h: 1080 },
  ];

const browser = await pw.chromium.launch(exe ? { executablePath: exe } : {});
let p;
const OPEN = '.p5, .pz5, .overlay, .scene-overlay, .slip5, .hk5, .ac5, .c2-in';
const wait = (ms) => p.waitForTimeout(ms);
const region = () => p.evaluate(() => document.querySelector('.b5-tr.on')?.getAttribute('data-travel') ?? null);
const anyOpen = () => p.evaluate((sel) => [...document.querySelectorAll(sel)].some((e) => e.isConnected && (e.offsetParent !== null || getComputedStyle(e).position === 'fixed')), OPEN);
const sig = () => p.evaluate(() => [document.body.innerHTML.length, document.querySelector('#toasts')?.textContent ?? '', document.querySelector('.b5-tr.on')?.getAttribute('data-travel') ?? '', document.querySelector('.t5-chip')?.textContent ?? ''].join('|'));
const shot = async (name) => { if (SHOTS) await p.screenshot({ path: `${SHOTS}/${runTag}-${name}.png` }).catch(() => {}); };
const checkScroll = async (where) => {
  const r = await p.evaluate(() => { const de = document.scrollingElement; const a = document.querySelector('.app5'); return { doc: de.scrollWidth > innerWidth + 1, app: !!a && a.scrollWidth > a.clientWidth + 1 }; });
  if (r.doc || r.app) flag('rolagem-h', where, JSON.stringify(r));
};
/** Fecha tudo com Esc (até 5 vezes). Devolve true se voltou à cena sem nada aberto e sem cair na pausa. */
const escBack = async (where, { pauseOk = false } = {}) => {
  for (let k = 0; k < 5; k++) {
    if (!(await anyOpen())) return true;
    if (!pauseOk && k > 0 && (await p.locator('.pz5').count()) && !(await p.locator('.p5, .ac5, .overlay, .c2-in').count())) { flag('sem-volta', where, 'Esc caiu na pausa'); await p.keyboard.press('Escape'); await wait(300); return false; }
    await p.keyboard.press('Escape'); await wait(450);
  }
  if (await anyOpen()) { flag('sem-volta', where, 'Esc não fecha'); await shot(`semvolta-${where}`); return false; }
  return true;
};
const goRegion = async (key, r) => { await escBack(`viagem>${r}`, { pauseOk: true }); await p.keyboard.press(key); await wait(1100); await escBack(`viagem>${r}`, { pauseOk: true }); if ((await region()) !== r) flag('sem-efeito', `tecla ${key}`, `região ${await region()}`); };

async function newGame({ year, career, w, h }) {
  await p.setViewportSize({ width: w, height: h });
  await p.goto(URL0); await p.waitForSelector('text=NOVA RUN', { timeout: 60000 }); await wait(500);
  await p.getByText('NOVA RUN').click(); await wait(1000);
  await p.locator('button', { hasText: career }).first().click(); await wait(200);
  await p.evaluate((y) => { const i = [...document.querySelectorAll('input')].find((x) => /^\d{4}$/.test(x.value)); if (i) { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(i, String(y)); i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); } }, year);
  await wait(200);
  await p.getByText('COMEÇAR MINHA HISTÓRIA').click();
  await p.waitForSelector('.app5', { timeout: 60000 }); await wait(1500);
  for (let i = 0; i < 4; i++) { const c = p.getByRole('button', { name: /^\[?\s*Começar\s*\]?$/i }); if (await c.count()) { await c.first().click(); await wait(500); } else break; }
  await escBack('inicio', { pauseOk: true });
}

/** Objetos de uma cena (sede: .s5-obj; casa: .r5-spot): cartão, cada ação, ver tudo, voltar. */
async function sweepObjects(regionName, key, sel, idOf, limitActs = 99) {
  await goRegion(key, regionName);
  const ids = await p.evaluate(([sel, at]) => [...document.querySelectorAll(sel)].filter((e) => e.offsetParent).map((e) => e.getAttribute(at) || e.getAttribute('aria-label') || ''), [sel, idOf]);
  const loc = (id) => p.locator(`${sel}[${idOf}="${id.replace(/"/g, '\\"')}"]`).first();
  for (const id of ids) {
    const where = `${regionName}.${id.split(':')[0]}`;
    const open = async () => { await escBack(where, { pauseOk: true }); if ((await region()) !== regionName) { await p.keyboard.press(key); await wait(1000); await escBack(where, { pauseOk: true }); } await loc(id).click({ timeout: 4000 }); await wait(650); };
    try { await open(); } catch { flag('sem-efeito', where, 'clique bloqueado'); continue; }
    await checkScroll(where);
    if (await p.locator('.p5-old').count()) flag('antiga', where, 'clique abre página antiga inteira');
    const hasCard = await p.locator('.ac5').count();
    const opened = hasCard || (await anyOpen()) || (await region()) !== regionName;
    if (!opened) flag('sem-efeito', where, 'clique no objeto não abre nada');
    if (!hasCard) { await shot(`obj-${where}`); await escBack(where); continue; }
    const acts = await p.evaluate(() => [...document.querySelectorAll('.ac5 button')].map((b, j) => ({ j, t: b.textContent.trim().replace(/\s+/g, ' '), dis: b.disabled || b.getAttribute('aria-disabled') === 'true' || b.classList.contains('locked') })));
    for (const a of acts.slice(0, limitActs + 2)) {
      if (a.t === '×' || a.dis) continue;
      try { await open(); } catch { continue; }
      const b = p.locator('.ac5 button').nth(a.j);
      if (!(await b.count())) continue;
      const before = await sig();
      try { await b.click({ timeout: 2500 }); } catch { flag('sem-efeito', `${where}>${a.t}`, 'clique bloqueado'); continue; }
      await wait(800);
      const after = await sig();
      const w2 = `${where}>${a.t.replace(/^\d/, '').slice(0, 30)}`;
      if (before === after) { flag('sem-efeito', w2); await shot(`noop-${where}-${a.j}`); }
      const explicit = /▸|ver tudo|abrir/i.test(a.t);
      if (!explicit && (await p.locator('.p5-old').count())) flag('antiga', w2, 'ação sem ▸ abre página antiga inteira');
      await checkScroll(w2);
      await escBack(w2);
    }
  }
}

async function sweepCity() {
  await goRegion('Shift+Digit3', 'cidade');
  await checkScroll('cidade');
  const labs = await p.evaluate(() => [...document.querySelectorAll('.w19-hs')].filter((e) => !e.classList.contains('mine')).map((e) => e.getAttribute('aria-label') || ''));
  const kinds = new Set();
  for (const lab of labs) {
    const kind = (lab.includes(' · ') ? lab.split(' · ')[1].split(' — ')[0] : lab.split(' — ')[0]).trim().slice(0, 28);
    if (kinds.has(kind)) continue;
    kinds.add(kind);
    if (QUICK && kinds.size > 6) break;
    const where = `cidade.${kind}`;
    await escBack(where, { pauseOk: true });
    if ((await region()) !== 'cidade') { await p.keyboard.press('Shift+Digit3'); await wait(1100); await escBack(where, { pauseOk: true }); }
    const ok = await p.evaluate((lab) => { document.querySelectorAll('[data-qa5]').forEach((e) => e.removeAttribute('data-qa5')); const e = [...document.querySelectorAll('.w19-hs')].find((x) => x.getAttribute('aria-label') === lab); e?.setAttribute('data-qa5', '1'); return !!e; }, lab);
    if (!ok) continue;
    const before = await sig();
    try { await p.locator('[data-qa5="1"]').click({ force: true, timeout: 2500 }); } catch { continue; }
    await wait(700);
    if (before === (await sig())) flag('sem-efeito', where, 'clique no prédio');
    await checkScroll(where);
    if (await p.locator('.overlay').count()) { await escBack(where); continue; } // outdoor/marco abre a ficha (janela) e o Esc a fecha
    const enter = p.getByText(/Entrar \(ver por dentro\)|^Entrar$/).first();
    if (await enter.count() && await enter.isVisible().catch(() => false)) {
      await enter.click(); await wait(1200);
      if (await p.locator('.c2-in').count()) {
        const frame = await p.evaluate(() => [...document.querySelectorAll('.c2-in button, .c2-in label')].some((b) => /^(Ver como lista|Rótulos)$/.test(b.textContent.trim()) && b.offsetParent));
        if (frame) { flag('moldura', 'lugar', 'Cena / Ver como lista / Rótulos'); const f = found.get('moldura:lugar'); if (!f.detail.includes(kind)) f.detail += ` · ${kind}`; }
        await shot(`lugar-${kind}`);
        await checkScroll(`lugar.${kind}`);
        await p.keyboard.press('Escape'); await wait(900);
        if (await p.locator('.c2-in').count()) flag('sem-volta', `lugar.${kind}`, 'Esc não sai do lugar');
        else if ((await region()) !== 'cidade' || (await p.locator('.pz5').count())) flag('sem-volta', `lugar.${kind}`, `Esc foi para ${await region()}${(await p.locator('.pz5').count()) ? ' + pausa' : ''}`);
      }
    }
    await escBack(where, { pauseOk: true });
  }
}

async function sweepWorld() {
  await goRegion('Shift+Digit4', 'mundo');
  await checkScroll('mundo');
  // país: o botão do país de casa no painel ou Enter no teclado do mapa
  const home = p.locator('.app5 main button', { hasText: /Reino Unido|Brasil|Estados Unidos|França/ }).first();
  if (await home.count()) { await home.click({ force: true }); await wait(1000); }
  await shot('mundo-pais');
  const city = p.locator('.app5 main button', { hasText: /^(Liverpool|Manchester|Rio de Janeiro|Nova York|Paris)$/ }).first();
  if (!(await city.count())) { flag('sem-efeito', 'mundo.pais', 'sem lista de cidades depois de escolher o país'); return; }
  await city.click({ force: true }); await wait(1500);
  await shot('mundo-cidade');
  await checkScroll('mundo.cidade');
  const backVis = await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /Voltar ao mundo/.test(x.textContent)); if (!b) return null; const r = b.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; });
  if (backVis === false) flag('sem-volta', 'mundo.cidade', '"Voltar ao mundo" fora da vista');
  await p.keyboard.press('Escape'); await wait(1000);
  const still = await p.evaluate(() => !![...document.querySelectorAll('button')].find((x) => /Voltar ao mundo/.test(x.textContent) && x.offsetParent));
  if (still || (await p.locator('.pz5').count())) flag('sem-volta', 'mundo.cidade', `Esc ${still ? 'não volta ao mundo' : ''}${(await p.locator('.pz5').count()) ? ' abre a pausa' : ''}`);
  await escBack('mundo', { pauseOk: true });
}

async function sweepSystem() {
  // viagem por tecla e por clique, H
  step = 'viagem';
  for (const [k, r] of [['Shift+Digit2', 'casa'], ['Shift+Digit3', 'cidade'], ['Shift+Digit4', 'mundo'], ['Shift+Digit1', 'sede']]) await goRegion(k, r);
  for (const r of ['casa', 'mundo', 'sede']) { await p.locator(`.b5-tr[data-travel="${r}"]`).click(); await wait(1100); await escBack(`clique>${r}`, { pauseOk: true }); if ((await region()) !== r) flag('sem-efeito', `viagem.clique.${r}`); }
  await p.keyboard.press('Shift+Digit3'); await wait(1000); await p.keyboard.press('h'); await wait(1100); if ((await region()) !== 'sede') flag('sem-efeito', 'tecla H');
  // ajuda
  step = 'ajuda';
  await escBack('ajuda', { pauseOk: true });
  await p.keyboard.press('Shift+Slash'); await wait(600);
  if (!(await p.locator('.hk5').count())) flag('sem-efeito', 'tecla ?');
  await escBack('ajuda');
  // busca: Esc fecha a busca e não abre a pausa
  step = 'busca';
  await p.keyboard.press('Control+k'); await wait(600);
  if (!(await p.locator('.overlay').count())) flag('sem-efeito', 'Ctrl+K');
  await p.keyboard.press('Escape'); await wait(500);
  if (await p.locator('.pz5').count()) flag('sem-volta', 'busca', 'Esc da busca abre a pausa');
  await escBack('busca', { pauseOk: true });
  // pausa: Salvar, Carregar e o índice
  step = 'pausa';
  await p.keyboard.press('Escape'); await wait(500);
  if (!(await p.locator('.pz5').count())) flag('sem-efeito', 'Esc (pausa)');
  const before = await sig();
  await p.locator('.pz5-i', { hasText: 'Salvar' }).click(); await wait(800);
  if (before === (await sig())) flag('sem-efeito', 'pausa>Salvar');
  await p.locator('.pz5-i', { hasText: 'Carregar' }).click(); await wait(900);
  if (!(await p.locator('.overlay').count())) flag('sem-efeito', 'pausa>Carregar');
  await escBack('carregar');
  await p.keyboard.press('Escape'); await wait(500);
  const areas = await p.locator('.pz5-row').evaluateAll((es) => es.map((e) => e.getAttribute('data-area')));
  const every = QUICK ? Math.max(1, Math.floor(areas.length / 12)) : 1;
  for (let i = 0; i < areas.length; i += every) {
    const area = areas[i];
    if (!(await p.locator('.pz5').count())) { await escBack('indice', { pauseOk: true }); await p.keyboard.press('Escape'); await wait(450); }
    if (!(await p.locator('.pz5').count())) { flag('sem-efeito', `indice.depois-de.${areas[i - every] ?? ''}`, 'Esc não abre a pausa'); await p.keyboard.press('Shift+Digit1'); await wait(900); await escBack('indice', { pauseOk: true }); await p.keyboard.press('Escape'); await wait(450); }
    const row = p.locator(`.pz5-row[data-area="${area}"]`).first();
    if (!(await row.count())) continue;
    try { await row.click({ timeout: 2500 }); } catch { flag('sem-efeito', `indice.${area}`, 'clique bloqueado'); continue; }
    await wait(700);
    if (await p.locator('.pz5').count()) flag('sem-efeito', `indice.${area}`);
    await checkScroll(`indice.${area}`);
    await escBack(`indice.${area}`, { pauseOk: true });
  }
  await escBack('indice', { pauseOk: true });
  step = 'bolso';
  // bolso: abrir um papel pelo índice (sem cartão), fixar, abrir pelo bolso, tirar
  await p.keyboard.press('Escape'); await wait(450);
  const fin = p.locator('.pz5-row[data-area="finance"]').first();
  if (await fin.count()) {
    await fin.click(); await wait(800);
    const pin = p.locator('.p5-pin').first();
    if (await pin.count()) {
      const had = await p.locator('.b5-pb').count();
      await pin.click(); await wait(500);
      if ((await p.locator('.b5-pb').count()) <= had && !(await p.locator('.p5-pin.on').count())) flag('sem-efeito', 'bolso>fixar');
      await escBack('bolso');
      const pb = p.locator('.b5-pb').first();
      if (await pb.count()) { await pb.click(); await wait(800); if (!(await anyOpen())) flag('sem-efeito', 'bolso>abrir'); await escBack('bolso'); }
      const px = p.locator('.b5-px').first();
      if (await px.count()) { const n = await p.locator('.b5-pb').count(); await px.click(); await wait(400); if ((await p.locator('.b5-pb').count()) >= n) flag('sem-efeito', 'bolso>tirar'); }
    }
  }
  await escBack('bolso', { pauseOk: true });
  // barra de baixo: "+ fixar" sem papel aberto tem de dizer o que fazer (desabilitado com dica ou fazer algo)
  const pinBar = p.locator('.b5-pin').first();
  if (await pinBar.count() && await pinBar.isEnabled()) { const b0 = await sig(); await pinBar.click(); await wait(400); if (b0 === (await sig())) flag('sem-efeito', 'barra>+ fixar'); await escBack('fixar', { pauseOk: true }); }
}

/** Modo Arrumar (DECO-M, ⇧O): abrir na casa, trocar cômodo, trocar para a sede, abrir a gaveta de um lugar, Esc fecha. */
async function sweepArrumar() {
  step = 'arrumar';
  await goRegion('Shift+Digit2', 'casa');
  await p.keyboard.press('Shift+KeyO'); await wait(900);
  if (!(await p.locator('.deco5-x').count())) { flag('sem-efeito', 'arrumar.tecla ⇧O'); return; }
  await checkScroll('arrumar');
  await shot('arrumar');
  const click = async (sel, where) => { const b = p.locator(sel).first(); if (!(await b.count())) return; const b0 = await sig(); await b.click({ timeout: 2500 }); await wait(500); if (b0 === (await sig())) flag('sem-efeito', where); };
  await click('.deco5-room:not(.on)', 'arrumar.cômodo');
  await click('.deco5-tab:not(.on)', 'arrumar.casa/sede');
  await click('.deco5-spot', 'arrumar.gaveta');
  await p.keyboard.press('Escape'); await wait(500);
  if (await p.locator('.deco5-x').count()) { await p.keyboard.press('Escape'); await wait(500); }
  if (await p.locator('.deco5-x').count()) flag('sem-volta', 'arrumar', 'Esc não fecha');
  if (await p.locator('.pz5').count()) flag('sem-volta', 'arrumar', 'Esc caiu na pausa');
  await escBack('arrumar', { pauseOk: true });
}

async function advance(n) {
  for (let i = 0; i < n; i++) {
    const d0 = await p.locator('.t5-chip').first().textContent();
    await p.locator('.t5-go').click(); await wait(1500);
    for (let k = 0; k < 4; k++) {
      const acc = p.getByRole('button', { name: /Aceitar padrões e avançar/ });
      if (await acc.count()) { await acc.first().click(); await wait(1500); continue; }
      if (await p.locator('.overlay').count()) { await p.keyboard.press('Escape'); await wait(500); continue; }
      break;
    }
    await escBack('mes', { pauseOk: true });
    let d1 = await p.locator('.t5-chip').first().textContent();
    if (d0 === d1) { // uma janela (decisão, aviso) segurou a virada: o jogador fecha e aperta de novo
      await p.locator('.t5-go').click(); await wait(1500);
      const acc = p.getByRole('button', { name: /Aceitar padrões e avançar/ });
      if (await acc.count()) { await acc.first().click(); await wait(1500); }
      await escBack('mes', { pauseOk: true });
      d1 = await p.locator('.t5-chip').first().textContent();
    }
    if (d0 === d1) flag('sem-efeito', 'Avançar mês', d0);
    await checkScroll('mes');
  }
}

const t0 = Date.now();
for (const run of RUNS) {
  runTag = `${run.year}-${run.career.slice(0, 4).toLowerCase()}-${run.w}x${run.h}`;
  const ctx = await browser.newContext({ viewport: { width: run.w, height: run.h }, locale: 'pt-BR' });
  p = await ctx.newPage();
  p.on('pageerror', (e) => flag('erro', 'pagina', e.message.slice(0, 160)));
  p.on('console', (m) => { if (m.type() === 'error' && !/WebSocket|favicon/.test(m.text())) flag('erro', 'console', m.text().slice(0, 160)); });
  try {
    await newGame(run);
    await checkScroll('sede');
    await shot('sede');
    const parts = [
      ['sede', () => sweepObjects('sede', 'Shift+Digit1', '.s5-obj', 'data-obj', QUICK ? 3 : 99)],
      ['casa', () => sweepObjects('casa', 'Shift+Digit2', '.app5 main .r5-spot', 'aria-label', QUICK ? 3 : 99)],
      ['arrumar', sweepArrumar], ['cidade', sweepCity], ['mundo', sweepWorld], ['sistema', sweepSystem],
      ['mes', () => advance(QUICK ? 1 : 3)],
      ['sede-depois', () => sweepObjects('sede', 'Shift+Digit1', '.s5-obj', 'data-obj', 0)],
    ];
    // cada parte isolada: um passo do robô que trava (clique coberto) vira achado daquela parte, e o resto continua
    for (const [name, fn] of parts) {
      try { await fn(); } catch (e) {
        flag('erro', `robo.${name}`, `${step} · ${String(e.message ?? e).split('\n')[0].slice(0, 120)}`);
        await shot(`robo-erro-${name}`);
        await escBack(`robo.${name}`, { pauseOk: true }).catch(() => {});
      }
    }
  } catch (e) {
    flag('erro', 'robo', String(e.message ?? e).split('\n')[0].slice(0, 160));
    await shot('robo-erro');
  }
  console.log(`qa5: ${runTag} ok (${Math.round((Date.now() - t0) / 1000)} s)`);
  await ctx.close();
}
await browser.close();
await server.close();

const rows = [...found.entries()].map(([key, f]) => ({ key, ...f, known: known[key] ?? null }));
const fresh = rows.filter((r) => !r.known);
for (const r of rows) console.log(`${r.known ? `conhecido (${r.known})` : 'NOVO'} · ${r.key} · ${r.detail} · ${r.runs.join(', ')}`);
console.log(`qa5: ${rows.length} achados, ${fresh.length} novos, ${Math.round((Date.now() - t0) / 1000)} s`);
if (OUT) writeFileSync(OUT, JSON.stringify({ quick: QUICK, runs: RUNS, rows }, null, 1));
process.exit(fresh.length ? 1 : 0);
