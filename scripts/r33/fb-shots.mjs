// R33 · FICHAS33-B — capturas antes/depois. Uso: node scripts/r33/fb-shots.mjs <pasta> [cenas,…]  (env W,H,LANG,TS,Y)
import { browser, page, start, openOld, closeAll } from './fb-harness.mjs';
import { mkdirSync } from 'node:fs';
const out = process.argv[2] ?? 'docs/r33/fichas/b'; const only = process.argv[3]?.split(',');
mkdirSync(out, { recursive: true });
const W = Number(process.env.W ?? 1366), H = Number(process.env.H ?? 768), LANG = process.env.LANG2 ?? 'pt';
const tag = process.env.TAG ?? `${W}${LANG === 'en' ? '-en' : ''}${process.env.TS ? '-t' + process.env.TS : ''}`;
const b = await browser(); const p = await page(b, { w: W, h: H, lang: LANG, textScale: process.env.TS ? Number(process.env.TS) : undefined });
const Y = Number(process.env.Y ?? 1985);
await start(p, Y);
const shot = async (name, wait = 700) => { await p.waitForTimeout(wait); await p.mouse.move(2, H - 2); await p.screenshot({ path: `${out}/${tag}-${name}.png` }); console.log('captura', name); };
const ev = (fn, a) => p.evaluate(fn, a);
const travel = (r) => ev(async (r) => { (await import('/src/ui/r31/shell5.ts')).travel5go(r); }, r);
const S = {
  'antiga-patrimonio': async () => { await openOld(p, 'wealth'); },
  'antiga-noite': async () => { await openOld(p, 'night14'); },
  'antiga-identidade': async () => { await openOld(p, 'identity'); },
  'antiga-cockpit': async () => { await openOld(p, 'cockpit'); },
  'antiga-regioes': async () => { await openOld(p, 'regions19'); },
  'antiga-projeto': async () => { await openOld(p, 'project'); },
  'elenco-mural': async () => { await openOld(p, 'people'); },
  'elenco-agenda': async () => { await openOld(p, 'agenda17'); },
  'elenco-fichario': async () => { await openOld(p, 'directory'); },
  'elenco-chefe': async () => { await openOld(p, 'deleg31'); },
  'menu-artista': async () => { await openOld(p, 'people'); await p.waitForTimeout(700); const r = await ev(() => { const e = document.querySelector('.el5-pol, [data-act], .el5-card'); const q = e?.getBoundingClientRect(); return q ? [q.x + q.width / 2, q.y + q.height / 3] : null; }); if (r) await p.mouse.click(r[0], r[1], { button: 'right' }); },
  'menu-sede': async () => { await p.waitForTimeout(500); const r = await ev(() => { const e = document.querySelector('.s5-person, [data-person], .s5-obj[data-obj^="car:"], .s5-act'); const q = e?.getBoundingClientRect(); return q ? [q.x + q.width / 2, q.y + q.height / 2] : null; }); if (r) await p.mouse.click(r[0], r[1], { button: 'right' }); },
  'menu-contexto': async () => { await openOld(p, 'contracts19'); await p.waitForTimeout(700); const r = await ev(() => { const e = document.querySelector('.p5-body [data-ent]'); const q = e?.getBoundingClientRect(); return q ? [q.x + 4, q.y + q.height / 2] : null; }); if (r) await p.mouse.click(r[0], r[1], { button: 'right' }); },
  'pausa': async () => { await p.keyboard.press('Escape'); },
  'teclas': async () => { await ev(async () => (await import('/src/ui/r31/shell5.ts')).help5()); },
  'cidade': async () => { await travel('cidade'); },
  'cidade-predio': async () => { await travel('cidade'); await p.waitForTimeout(900); await ev(() => { const x = [...document.querySelectorAll('.w19-hs')].find((e) => !e.classList.contains('mine')); x?.click(); }); },
  'interior': async () => { await S['cidade-predio'](); await p.waitForTimeout(500); await p.keyboard.press('1'); await p.waitForTimeout(1500); await ev(() => document.querySelector('.sc31-spot[data-spot="hire"], .sc31-spot:not(.sc31-person)')?.click()); },
  'interior-pessoa': async () => { await S['cidade-predio'](); await p.waitForTimeout(500); await p.keyboard.press('1'); await p.waitForTimeout(1500); await ev(() => document.querySelectorAll('.sc31-spot.sc31-person')[1]?.click()); },
  'mundo-cartao-cidade': async () => { await travel('mundo'); await p.waitForTimeout(1000); await ev(async () => { const m = await import('/src/ui/r31/map5ui.ts'); const st = await import('/src/ui/store.ts'); const g = st.store.game; const c = Object.keys((await import('/src/data/world.ts')).cityById ?? {}).find((x) => x !== g.config.homeCity) ?? g.config.homeCity; m.cityCard5(g, c); }); },
  'mundo-cidade': async () => { await travel('mundo'); await p.waitForTimeout(1200); await ev(() => document.querySelector('[data-m5="city"], .m5-city, .wm5-city')?.click()); },
  'celular': async () => { await ev(() => document.querySelector('[data-travel="celular"]')?.click()); },
  'casa': async () => { await travel('casa'); },
  'arrumar': async () => { await travel('casa'); await p.waitForTimeout(900); await ev(() => [...document.querySelectorAll('button')].find((b) => /^Arrumar|^Arrange|^Decorate/.test(b.textContent.trim()))?.click()); },
  'arrumar-gaveta': async () => { await S.arrumar(); await p.waitForTimeout(800); await ev(() => document.querySelector('.deco5-spot:not(.full)')?.click()); },
};
for (const [k, fn] of Object.entries(S)) {
  if (only && !only.includes(k)) continue;
  await closeAll(p); await p.evaluate(() => document.querySelectorAll('.am20, .cx27, .deco5, .ap33').forEach((x) => x.remove())); await p.keyboard.press('Escape'); await closeAll(p); await p.waitForTimeout(300);
  try { await fn(); await shot(k); } catch (e) { console.error('falhou', k, e.message); }
}
await b.close();
