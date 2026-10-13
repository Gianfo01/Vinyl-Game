// Rodada 29 (WIKI) — capturas da wiki (docs/shots29wiki/), computador 1440×900 e celular 390×844, pt-BR.
// Uso: npx vite --port 5332 &  node scripts/shots29wiki.mjs http://localhost:5332 docs/shots29wiki
// 1) sem partida (tela de título): #/wiki abre o catálogo real; 2) partida rápida pela tela inicial ("NOVA RUN" →
// "COMEÇAR MINHA HISTÓRIA"): wiki pelo botão da barra, páginas da partida, busca, spoiler e o menu "Ver na wiki".
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright');
const base = process.argv[2] ?? 'http://localhost:5332';
const out = process.argv[3] ?? 'docs/shots29wiki';
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

const VIEWS = [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]];
for (const [tag, viewport] of VIEWS) {
  const p = await b.newPage({ viewport, locale: 'pt-BR' });
  p.setDefaultTimeout(30000);
  p.on('pageerror', (e) => console.error('PAGEERR', tag, e.message));
  const shot = async (name) => { await p.waitForTimeout(700); await p.screenshot({ path: `${out}/${name}-${tag}.png` }); console.log('ok', name, tag); };
  const wiki = async (id, q = '') => { await p.evaluate(async ([id, q]) => { const m = await import('/src/ui/wiki29/wiki29open.ts'); m.openWiki29(id, q); }, [id, q]); await p.waitForSelector('.wk29-page, .wk29-res'); };

  // 1) sem partida
  await p.goto(`${base}/#/wiki`); await p.waitForSelector('.wk29-page', { timeout: 60000 });
  await shot('01-inicio-sem-partida');
  await wiki('ract:the-beatles'); await shot('02-banda-real-sem-partida');
  await wiki('rp:john-lennon'); await shot('03-pessoa-real-sem-partida');
  await wiki('idx:persons'); await shot('04-lista-virtualizada-pessoas');
  await wiki('mech:connections'); await shot('05-mecanica-conexoes-diagrama');
  await p.keyboard.press('Escape');

  // 2) partida rápida pela tela inicial
  await p.goto(`${base}/`); await p.waitForTimeout(1500);
  await p.getByText('NOVA RUN', { exact: false }).first().click();
  await p.getByText('COMEÇAR MINHA HISTÓRIA', { exact: false }).first().click();
  await p.waitForFunction(async () => { const st = await import('/src/ui/store.ts'); return !!st.store.game; }, null, { timeout: 90000 });
  await p.waitForTimeout(2500);
  await p.evaluate(async () => { const st = await import('/src/ui/store.ts'); const off = await import('/src/ui/tutoff19.ts'); off.setTutorials19(st.store.prefs, false); document.querySelectorAll('.overlay').forEach((e) => e.remove()); });
  if (tag === 'desktop') { const btn = p.locator('.nav-util25', { hasText: 'Wiki' }); if (await btn.count()) { await btn.first().click(); await p.waitForSelector('.wk29-page'); await shot('06-inicio-com-partida'); await p.keyboard.press('Escape'); } }
  else { await wiki('home'); await shot('06-inicio-com-partida'); await p.keyboard.press('Escape'); }
  // ids da partida: um ato real com ex-integrantes, uma pessoa dele, cidade, gênero
  const ids = await p.evaluate(async () => {
    const st = await import('/src/ui/store.ts'); const c = await import('/src/sim/sys/connect29.ts'); const fut = await import('/src/sim/future.ts');
    const g = st.store.game;
    const acts = Object.values(g.acts).filter((a) => fut.visibleAct(g, a) && a.members.length > 1).sort((x, y) => y.fame - x.fame);
    const a = acts.find((x) => c.exMembers29(g, x).length) ?? acts[0];
    const pid = a.members.find((m) => c.careerActs29(g, m).length > 1) ?? a.members[0];
    return { act: a.id, pid, city: g.config.homeCity, genre: a.genre, name: g.persons[pid].name.split(' ')[0] };
  });
  await wiki(`person:${ids.pid}`); await shot('07-pessoa-da-partida');
  await wiki(`act:${ids.act}`); await shot('08-ato-da-partida');
  await wiki('mech:money'); await shot('09-mecanica-dinheiro');
  await wiki(`city:${ids.city}`); await shot('10-cidade');
  await wiki(`genre:${ids.genre}`); await shot('11-genero');
  await wiki('relic:carmen_baiana'); await shot('12-reliquia');
  await wiki('ract:nirvana'); await shot('13-spoiler-escondido');
  await p.locator('.wk29-spoil button').first().click(); await shot('14-spoiler-revelado');
  await wiki('home', 'joao'); await shot('15-busca-sem-acento');
  await wiki('idx:objetos'); await shot('16-objetos');
  await p.keyboard.press('Escape');
  // menu de contexto "Ver na wiki" (clique direito num nome de artista)
  if (tag === 'desktop') {
    // nome marcado (data-ent/data-id), como os das telas do jogo, para abrir o menu de contexto do ato
    await p.evaluate((id) => { const b = document.createElement('button'); b.id = 'shotent'; b.className = 'link'; b.textContent = 'Nome do artista'; b.dataset.ent = 'act'; b.dataset.id = id; b.style.cssText = 'position:fixed;left:420px;top:180px;z-index:40;font-size:20px'; document.body.append(b); }, ids.act);
    const el = p.locator('#shotent');
    if (await el.count()) { await el.click({ button: 'right' }); await p.waitForTimeout(600); await shot('17-menu-contexto-ver-na-wiki'); await p.keyboard.press('Escape'); }
  }
  await p.close();
}
await b.close();
