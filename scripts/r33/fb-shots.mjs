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
  'pausa': async () => { await p.keyboard.press('Escape'); },
  'teclas': async () => { await ev(async () => (await import('/src/ui/r31/shell5.ts')).help5()); },
  'cidade': async () => { await travel('cidade'); },
  'cidade-predio': async () => { await travel('cidade'); await p.waitForTimeout(900); await ev(() => { const x = [...document.querySelectorAll('.w19-hs')].find((e) => !e.classList.contains('mine')); x?.click(); }); },
  'mundo-cidade': async () => { await travel('mundo'); await p.waitForTimeout(1200); await ev(() => document.querySelector('[data-m5="city"], .m5-city, .wm5-city')?.click()); },
  'celular': async () => { await ev(() => document.querySelector('[data-travel="celular"]')?.click()); },
  'casa': async () => { await travel('casa'); },
  'arrumar': async () => { await travel('casa'); await p.waitForTimeout(900); await ev(() => [...document.querySelectorAll('button')].find((b) => /^Arrumar|^Arrange|^Decorate/.test(b.textContent.trim()))?.click()); },
};
for (const [k, fn] of Object.entries(S)) {
  if (only && !only.includes(k)) continue;
  await closeAll(p); await p.waitForTimeout(300);
  try { await fn(); await shot(k); } catch (e) { console.error('falhou', k, e.message); }
}
await b.close();
