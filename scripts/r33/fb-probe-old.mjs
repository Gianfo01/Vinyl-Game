// R33 · FICHAS33-B — sonda: abre cada página antiga dentro do papel e lista os botões (classe, texto, contexto).
import { browser, page, start, openOld, closeAll } from './fb-harness.mjs';
import { writeFileSync } from 'node:fs';
const AREAS = 'after18 agenda17 airport31 auction31 awards bauc31 biz17 cal17 calendar19 campus18 careers cockpit contracts19 crime critics customs31 deleg31 directory dm18 dyn18 editor31 fakes19 festivals firm19 identity inbox industry known31 labels lendas live19 long18 management managers14 market19a media19 movements news17 night14 outlets16 people personal platform16 producers15 project publishing16 regions18 regions19 rights18 rockhall scenes17 sealed31 society18 studio12 supply18 talent18 team tour12 tribute19 tut18 ventures wealth world17 you zines19'.split(' ');
const b = await browser(); const p = await page(b, { w: 1366, h: 768 });
await start(p, Number(process.env.Y ?? 1985));
const out = {};
for (const a of (process.env.ONLY?.split(',') ?? AREAS)) {
  await closeAll(p); await openOld(p, a); await p.waitForTimeout(250);
  out[a] = await p.evaluate(() => {
    const root = document.querySelector('.p5-old');
    if (!root) return { none: true, cls: document.querySelector('.p5-body > *')?.className };
    const bs = [...root.querySelectorAll('button')];
    const ctx = (b) => { const r = b.closest('tr, li, .row, .card, section, details, .tabs, .cats17, th, form, .wmap-ctl'); return r ? `${r.tagName.toLowerCase()}.${(r.className || '').toString().split(' ')[0]}` : '-'; };
    return bs.map((b) => `${b.className || '(none)'} | ${ctx(b)} | ${(b.textContent || '').trim().slice(0, 30)}${b.disabled ? ' [off]' : ''}${b.getAttribute('aria-pressed') ? ' [press]' : ''}${b.getAttribute('role') ? ' [' + b.getAttribute('role') + ']' : ''}`);
  });
}
writeFileSync(process.env.OUT ?? '/tmp/claude-0/fb-probe.json', JSON.stringify(out, null, 1));
await b.close();
