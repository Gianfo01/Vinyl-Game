// R33 · FICHAS33-B — varredura: cada página antiga no papel → nº de linhas no cartão, linhas de seleção e .btn que sobraram à vista.
import { browser, page, start, openOld, closeAll } from './fb-harness.mjs';
const AREAS = 'after18 agenda17 airport31 auction31 awards bauc31 biz17 cal17 calendar19 campus18 careers cockpit contracts19 crime critics customs31 deleg31 directory dm18 dyn18 editor31 fakes19 festivals firm19 identity inbox industry known31 labels lendas live19 long18 management managers14 market19a media19 movements news17 night14 outlets16 people personal platform16 producers15 project publishing16 regions18 regions19 rights18 rockhall scenes17 sealed31 society18 studio12 supply18 talent18 team tour12 tribute19 tut18 ventures wealth world17 you zines19'.split(' ');
const b = await browser(); const p = await page(b, { w: Number(process.env.W ?? 1366), h: Number(process.env.H ?? 768), lang: process.env.LANG2 ?? 'pt' });
await start(p, Number(process.env.Y ?? 1985));
for (const a of (process.env.ONLY?.split(',') ?? AREAS)) {
  await closeAll(p); await openOld(p, a); await p.waitForTimeout(200);
  const r = await p.evaluate(() => {
    const col = document.querySelector('.p5 .ob33-col');
    const vis = [...document.querySelectorAll('.p5-body button.btn')].filter((b) => b.offsetParent && !b.closest('.ob33-col')).map((b) => (b.textContent || '').trim().slice(0, 18));
    const sel = document.querySelector('.ob33-sel');
    const over = (() => { const pb = document.querySelector('.p5-body'); return pb ? pb.scrollWidth - pb.clientWidth : 0; })();
    return { rows: col ? col.querySelectorAll('.ac5-a').length : 0, items: document.querySelectorAll('.ob33-it').length, sel: sel ? 1 : 0, left: vis.slice(0, 8), over };
  });
  console.log(a.padEnd(12), `cartão ${String(r.rows).padStart(3)} · linhas ${String(r.items).padStart(3)} · estouro-x ${r.over} · à vista: ${r.left.join(' | ')}`);
}
await b.close();
