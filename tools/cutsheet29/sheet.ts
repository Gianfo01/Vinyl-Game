// Folha de contato das cenas animadas (r29): toda cena em 4 épocas, num instante da animação, com os bonecos.
// Dev: `npx vite tools/cutsheet29` e abra ?part=new | old | all (&before=1 usa só a pintura antiga do r27/r28,
// para comparar num checkout anterior). As PNG de docs/shots29scenes saem daqui (scripts/shots29scenes.mjs).
import { defaultConfig } from '../../src/sim/bot';
import { rng19 } from '../../src/sim/rng19';
import { createGame, spawnProceduralAct } from '../../src/sim/worldgen';
import { drawFigs27, paintArt27 } from '../../src/ui/ps/art27';
import * as M from '../../src/ui/ps/cut27model';

const q = new URLSearchParams(location.search);
const part = q.get('part') ?? 'new';
const before = q.get('before') === '1';
const tm = Number(q.get('t') ?? 2.6);
const root = document.getElementById('root')!;
const cfg = defaultConfig('cutsheet29', { scenario: 'established', startYear: 1990 } as Parameters<typeof defaultConfig>[1]);
(cfg as { dbSize?: string }).dbSize = 'small';
const s = createGame(cfg);
const a = spawnProceduralAct(s, rng19(s, 'act'), { city: s.config.homeCity, fame: 60 }); a.owner = 'player';
const OLD = ['press1', 'chart1', 'no1', 'star', 'show1', 'sold', 'flop', 'tour', 'award', 'scandal', 'raid', 'leave', 'death', 'broke', 'era', 'fest', 'magic', 'betray', 'coup', 'holo', 'heirs'];
const keys = (M.CUT_KEYS27 as string[]).filter((k) => (part === 'old' ? OLD.includes(k) : part === 'new' ? !OLD.includes(k) : true));
const P29 = '../../src/ui/ps/cutpaint29.ts';
const paint29 = before ? null : ((await import(/* @vite-ignore */ P29)) as typeof import('../../src/ui/ps/cutpaint29')).paintCut29;
const h1 = document.createElement('h1'); h1.textContent = `Cenas animadas — ${part === 'new' ? 'novas (r29)' : part === 'old' ? 'antigas (r27/r28)' : 'todas'}${before ? ' · ANTES (pintura r28)' : ''} · t=${tm}s`; root.append(h1);
const Y = [1932, 1966, 1988, 2016];
const T: Record<string, string> = { tech: 'Rádio', verdict: 'Sentença: plágio — vitória do selo.', gold: 'Hino da Rua', plat: 'Hino da Rua' };
for (const k of keys) {
  const def = (M.CUT27 as Record<string, { title: { pt: string } }>)[k];
  const h2 = document.createElement('h2'); h2.textContent = `${k} — ${def.title.pt}`; root.append(h2);
  const row = document.createElement('div'); row.className = 'row'; root.append(row);
  for (const y of Y) {
    const d = { key: k, ref: `sheet:${k}:${y}`, actId: a.id, pid: a.members[0], p: s.persons[a.members[0]]?.name, a: a.name, year: y, week: s.week, t: T[k] ?? 'Noite histórica em São Paulo', city: 'tokyo' } as M.CutData27;
    const m = M.cutModel27(s, d);
    const c = document.createElement('canvas'); c.width = m.W; c.height = m.H; c.style.width = `${m.W}px`;
    const ctx = c.getContext('2d')!;
    let px;
    if (paint29) px = paint29(s, d, m, tm);
    else { px = paintArt27(m, tm); M.paintFx27(px, m, (M.CUT27 as Record<string, { fx: M.CutFx27[] }>)[k].fx, tm); }
    const img = ctx.createImageData(m.W, m.H); new Uint32Array(img.data.buffer).set(px.d); ctx.putImageData(img, 0, 0);
    drawFigs27(ctx, s, m, tm, false);
    const cell = document.createElement('div'); cell.className = 'cell';
    const lab = document.createElement('span');
    const bo = (M as unknown as { beatsOf27?: (d: M.CutData27) => { pt: string }[] }).beatsOf27;
    const beats = bo ? bo(d) : (M.CUT27 as Record<string, { beats: { pt: string }[] }>)[k].beats;
    lab.textContent = `${y} · ${M.beat27(s, d, beats[Math.min(1, beats.length - 1)] as never).pt}`.slice(0, 70);
    cell.append(c, lab); row.append(cell);
  }
}
(window as unknown as { __done: boolean }).__done = true;
