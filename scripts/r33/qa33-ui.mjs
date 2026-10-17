// R33 · QA33 — abre cada prédio e interior novo da 33 no navegador (VITE_EXP5NAV=1, todos os exp33.* ligados) em 1889,
// 1962, 2025 e 2035: INT-2 (14 prédios no mapa + terreno do festival pelo cartão), INT-1 (escola, fábrica, museu,
// plataforma, agência, filial — fundados pelo próprio jogo antes de abrir a cidade) e os lugares com ações da INT-1
// (hotel, escritório, apartamentos, sede rival). Em cada um: entra, tira print, abre o primeiro ponto de ação, clica a
// ação (se liberada), confere rolagem horizontal e volta com Esc para a cidade.
// Uso: node scripts/r33/qa33-ui.mjs [anos=1889,1962,2025,2035] [--shots docs/r33/mocks/qa33]
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import net from 'node:net';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const YEARS = (args.find((a) => /^\d{4}(,\d{4})*$/.test(a)) ?? '1889,1962,2025,2035').split(',').map(Number);
const SHOTS = args.includes('--shots') ? args[args.indexOf('--shots') + 1] : resolve(root, 'docs/r33/mocks/qa33');
mkdirSync(SHOTS, { recursive: true });
const require = createRequire(import.meta.url);
let pw; for (const m of ['playwright', '/opt/node-tools/node_modules/playwright']) { try { pw = require(m); break; } catch { /* */ } }
const exe = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'].find((x) => existsSync(x));
const freePort = async () => { for (let p = 5900; p < 6100; p++) { const ok = await new Promise((r) => { const s = net.createServer().once('error', () => r(false)).once('listening', () => s.close(() => r(true))).listen(p, '127.0.0.1'); }); if (ok) return p; } throw new Error('porta'); };
process.env.VITE_EXP5NAV = '1';
const { createServer } = await import('vite');
const port = await freePort();
const server = await createServer({ root, configFile: false, base: './', logLevel: 'error', server: { host: '127.0.0.1', port, strictPort: true, watch: null, hmr: false }, optimizeDeps: { entries: ['index.html'] } });
await server.listen();
const URL0 = `http://127.0.0.1:${port}/?debug19`;
const browser = await pw.chromium.launch(exe ? { executablePath: exe } : {});
const p = await browser.newPage({ viewport: { width: 1366, height: 768 }, locale: 'pt-BR' });
const errs = []; p.on('pageerror', (e) => errs.push(`pageerror ${e.message}`)); p.on('console', (m) => { if (m.type() === 'error') errs.push(`console ${m.text().slice(0, 200)}`); });
const wait = (ms) => p.waitForTimeout(ms);
const rows = [];
const row = (y, what, st, note = '') => { rows.push({ y, what, st, note }); console.log(`${y}\t${what}\t${st}\t${note}`); };
const region = () => p.evaluate(() => document.querySelector('.b5-tr.on')?.getAttribute('data-travel') ?? null);
const OPEN = '.p5, .pz5, .overlay, .slip5, .hk5, .ac5, .c2-in';
const anyOpen = () => p.evaluate((sel) => [...document.querySelectorAll(sel)].some((e) => e.isConnected && (e.offsetParent !== null || getComputedStyle(e).position === 'fixed')), OPEN);
const esc = async () => { for (let k = 0; k < 5 && (await anyOpen()); k++) { await p.keyboard.press('Escape'); await wait(400); } };
const hscroll = () => p.evaluate(() => { const de = document.scrollingElement; const a = document.querySelector('.app5'); return de.scrollWidth > innerWidth + 1 || (!!a && a.scrollWidth > a.clientWidth + 1); });
/** Textos cortados dentro da cena aberta: elemento com texto cuja caixa passa da caixa do interior. */
const clipped = () => p.evaluate(() => { const box = document.querySelector('.c2-in')?.getBoundingClientRect(); if (!box) return []; return [...document.querySelectorAll('.c2-in button, .c2-in b, .c2-in p, .c2-in h4')].filter((e) => e.offsetParent && e.textContent.trim()).filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.right > box.right + 2 || r.left < box.left - 2) ; }).map((e) => e.textContent.trim().slice(0, 40)).slice(0, 4); });

const INT2N = ['Banco', 'Cartório e tribunal', 'Hospital e reabilitação', 'Estádio', 'Clube de jazz', 'Boate', 'Igreja e coral', 'Estúdio de TV e cinema', 'Agência de publicidade', 'Escola de samba', 'Gráfica e estúdio de arte', 'Rádio pirata e garagem', 'Estação de trem', 'Porto'];

async function newGame(year) {
  await p.goto(URL0); try { await p.waitForSelector('text=NOVA RUN', { timeout: 120000 }); } catch (e) { console.log([...new Set(errs)].join('\n')); throw e; } await wait(500);
  await p.getByText('NOVA RUN').click(); await wait(1000);
  await p.locator('button', { hasText: 'Gravadora' }).first().click(); await wait(200);
  await p.evaluate((y) => { const i = [...document.querySelectorAll('input')].find((x) => /^\d{4}$/.test(x.value)); if (i) { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(i, String(y)); i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); } }, year);
  await wait(200);
  await p.getByText('COMEÇAR MINHA HISTÓRIA').click();
  await p.waitForSelector('.app5', { timeout: 90000 }); await wait(1500);
  for (let i = 0; i < 4; i++) { const c = p.getByRole('button', { name: /^\[?\s*Começar\s*\]?$/i }); if (await c.count()) { await c.first().click(); await wait(500); } else break; }
  await esc();
}
/** Liga todos os exp33.*, dá caixa e funda os prédios próprios da INT-1 pelas funções do jogo. */
async function prep() {
  return p.evaluate(async () => {
    const sw = await import('/src/sim/r31/switches.ts');
    const s = window.__vtn19.store.game;
    for (const d of sw.switchDefs()) if (d.id.startsWith('exp33.') && typeof d.def === 'boolean') sw.setSw(s, d.id, true);
    s.player.cash += 5e9; const own = await import('/src/sim/sys/people/owner.ts'); own.ownerOf(s).wealth += 5e9;
    const out = {};
    const tryF = async (k, f) => { try { const r = await f(); out[k] = r ? (r.pt ?? String(r)) : 'ok'; } catch (e) { out[k] = `erro ${e.message}`; } };
    await tryF('escola', async () => (await import('/src/sim/sys/school18.ts')).foundSchool18(s));
    await tryF('museu', async () => (await import('/src/sim/sys/relics18.ts')).buildWing18(s));
    await tryF('fabrica', async () => (await import('/src/sim/sys/industry/supply.ts')).buildPlant(s, s.config.homeCity));
    const v = await import('/src/sim/sys/ventures9.ts');
    await tryF('plataforma', async () => v.foundVenture(s, 'platform', 'player'));
    await tryF('agencia', async () => v.foundVenture(s, 'booking', 'player'));
    await tryF('filial', async () => (await import('/src/sim/branches.ts')).openBranch(s, s.config.homeCity === 'london' ? 'manchester' : 'london'));
    return out;
  });
}
async function enterBy(year, label, tag) {
  await esc();
  if ((await region()) !== 'cidade') { await p.keyboard.press('Shift+Digit3'); await wait(1300); await esc(); }
  const ok = await p.evaluate((lab) => { document.querySelectorAll('[data-qa33]').forEach((e) => e.removeAttribute('data-qa33')); const e = [...document.querySelectorAll('.w19-hs')].find((x) => (x.getAttribute('aria-label') ?? '').startsWith(lab)); e?.setAttribute('data-qa33', '1'); return e?.getAttribute('aria-label') ?? null; }, label);
  if (!ok) { row(year, tag, 'AUSENTE', 'sem prédio no mapa'); return; }
  try { await p.locator('[data-qa33="1"]').click({ force: true, timeout: 3000 }); } catch (e) { row(year, tag, 'ERRO', `clique: ${e.message.slice(0, 60)}`); return; }
  await wait(700);
  if (await p.locator('.overlay').count()) { row(year, tag, 'OK', 'abre a ficha (janela), sem interior'); await esc(); return; }
  const enter = p.getByRole('button', { name: /Entrar \(ver por dentro\)|^Entrar$|Ver por dentro/ }).first();
  if (!(await enter.count()) || !(await enter.isVisible().catch(() => false))) { if (!(await p.locator('.c2-in').count())) { await p.screenshot({ path: `${SHOTS}/${year}-${tag}-semEntrar.png` }); row(year, tag, 'SEM ENTRAR', ok.slice(0, 60)); await esc(); return; } }
  else { await enter.click(); await wait(1300); }
  await inside(year, tag);
}
async function inside(year, tag) {
  if (!(await p.locator('.c2-in').count())) { row(year, tag, 'NÃO ABRIU'); await esc(); return; }
  await p.screenshot({ path: `${SHOTS}/${year}-${tag}.png` });
  const notes = [];
  // pontos de ação da cena (botões dos pontos clicáveis do sceneView31)
  const spots = await p.evaluate(() => [...document.querySelectorAll('.c2-in [data-spot], .c2-in .s31-spot, .c2-in .sc31-hs, .c2-in button.sp31')].filter((e) => e.offsetParent).map((e) => e.getAttribute('aria-label') || e.textContent.trim()).slice(0, 20));
  notes.push(`${spots.length} pontos`);
  const act = await p.evaluate(() => { const all = [...document.querySelectorAll('.c2-in [data-spot]')].filter((e) => e.offsetParent); const id = (e) => e.getAttribute('data-spot') ?? ''; const b = all.find((e) => id(e).startsWith('i2:')) ?? all.find((e) => !/^(who:|you|vit)/.test(id(e))); if (b) { b.setAttribute('data-qa33b', '1'); return b.getAttribute('aria-label') ?? '?'; } return null; });
  if (act) {
    await p.locator('[data-qa33b="1"]').click({ force: true }).catch(() => {}); await wait(600);
    const btn = p.locator('.in31-pane .in31-act button:not([disabled])').first();
    if (await btn.count()) { const t0 = await p.evaluate(() => document.querySelector('#toasts')?.textContent ?? ''); await btn.click({ force: true }).catch(() => {}); await wait(700); const t1 = await p.evaluate(() => document.querySelector('#toasts')?.textContent ?? ''); notes.push(t1 !== t0 ? `ação ok: ${t1.slice(-60).replace(/\s+/g, ' ')}` : 'ação sem aviso'); }
    else notes.push('ação bloqueada');
    await p.screenshot({ path: `${SHOTS}/${year}-${tag}-acao.png` });
  } else notes.push('sem ponto de ação');
  if (await hscroll()) notes.push('ROLAGEM-H');
  const cl = await clipped(); if (cl.length) notes.push(`CORTADO ${cl.join(' | ')}`);
  await p.keyboard.press('Escape'); await wait(500);
  if (await p.locator('.in31-pane .in31-pn').count()) { await p.keyboard.press('Escape'); await wait(500); }
  for (let k = 0; k < 3 && (await p.locator('.c2-in').count()); k++) { await p.keyboard.press('Escape'); await wait(600); }
  const back = !(await p.locator('.c2-in').count()) && (await region()) === 'cidade' && !(await p.locator('.pz5').count());
  row(year, tag, back ? 'OK' : 'SEM VOLTA', notes.join(' · '));
  await esc();
}

for (const y of YEARS) {
  await newGame(y);
  const made = await prep();
  row(y, 'prep', 'OK', JSON.stringify(made));
  await p.keyboard.press('Shift+Digit3'); await wait(1600); await esc();
  await p.screenshot({ path: `${SHOTS}/${y}-cidade.png` });
  if (await hscroll()) row(y, 'cidade', 'ROLAGEM-H');
  const labels = await p.evaluate(() => [...document.querySelectorAll('.w19-hs')].map((e) => e.getAttribute('aria-label') ?? ''));
  
  for (const n of INT2N) if (labels.some((x) => x.startsWith(`${n} · `))) await enterBy(y, `${n} · `, `int2-${n.split(' ')[0].toLowerCase()}`);
  else row(y, `int2-${n.split(' ')[0].toLowerCase()}`, 'fora da época/cidade');
  // terreno do festival pelo cartão (tecla J na cidade)
  await esc(); await p.keyboard.press('j'); await wait(900);
  const fb = p.locator('.ac5 button', { hasText: 'Entrar no terreno do festival' }).first();
  if (await fb.count()) { await fb.click(); await wait(1500); await inside(y, 'int2-festival'); } else { row(y, 'int2-festival', 'SEM BOTÃO', 'cartão do festival'); await esc(); }
  // INT-1: prédios próprios (rótulo começa pelo nome do prédio) e lugares com ações (hotel, escritório, apartamentos, rival)
  const own = labels.filter((x) => / · (Escola|Fábrica|Museu|Plataforma|Agência|Filial)[^·]* · /.test(x));
  for (const x of own) await enterBy(y, x.split(' · ')[0] + ' · ', `int1-${x.split(' · ')[1].split(' ')[0].toLowerCase()}`);
  for (const [re, tag] of [[/ · Hotel/, 'int1-hotel'], [/ · Escritórios/, 'int1-escritorio'], [/ · (Prédio de apartamentos|Casa de cômodos)/, 'int1-apartamentos'], [/ · Sede de gravadora| \(escritório\) — /, 'int1-rival']]) {
    const x = labels.find((l) => re.test(l)); if (x) await enterBy(y, x.split(' — ')[0], tag); else row(y, tag, 'AUSENTE');
  }
}
writeFileSync(resolve(SHOTS, 'qa33-ui.json'), JSON.stringify({ rows, errs }, null, 1));
console.log(`erros de página: ${errs.length}`); for (const e of [...new Set(errs)].slice(0, 20)) console.log(e);
await browser.close(); await server.close();
