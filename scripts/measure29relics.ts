// R29 (relíquias procedurais): medição numa run de bot. Conta os fatos-gatilho que passam pelo barramento, as
// relíquias por arquétipo e por ano, o peso no save (aos 10 e aos 20 anos) e o custo por mês dos ganchos de relíquia.
// Uso: npx tsx scripts/measure29relics.ts [anos=20] [semente=r29rel] [anoInicial=1970] [real|fic] [few|normal|many|all]
import { defaultConfig } from '../src/sim/bot';
import { playMonth } from '../src/sim/playbot16';
import { advanceMonth } from '../src/sim/tick';
import { createGame } from '../src/sim/worldgen';
import { onFact } from '../src/sim/facts17';
import { relics } from '../src/sim/sys/relics9';
import { rel18 } from '../src/sim/sys/relics18';
import { ARCH29, arc29, rel29 } from '../src/sim/sys/relics29';
import type { GameState } from '../src/sim/types';
import '../src/sim/sys/index';

const K = new Set(['show', 'chart', 'masterwork', 'award', 'death', 'split', 'signing', 'session_star', 'scandal', 'tour_done', 'crowd_incident', 'disaster', 'legend', 'comeback', 'revival_hit', 'charity_show', 'theft', 'breakup', 'catalog_rerelease', 'retired', 'label_sold', 'relic']);
const cnt: Record<string, number> = {};
const born: Record<string, number> = {}, perYear: Record<number, number> = {};
onFact('relic', (_s, f) => { if (f.tags.includes('r29') && f.tags.includes('born')) { born[f.tags[3]] = (born[f.tags[3]] ?? 0) + 1; perYear[f.y] = (perYear[f.y] ?? 0) + 1; } }, 'measure29relics:born');
onFact('*', (_s, f) => {
  if (!K.has(f.kind)) return;
  const tg = f.tags.filter((t) => t.startsWith('chron:') || ['tour', 'live', 'good', 'homecoming', 'reunion', 'first', 'fire', 'tragedy', 'born', 'famous'].includes(t)).join(',');
  const k = `${f.kind}|${tg}|${f.severity >= 60 ? 'hi' : f.severity >= 40 ? 'mid' : 'lo'}`;
  cnt[k] = (cnt[k] ?? 0) + 1;
}, 'measure29relics');

const prof: Record<string, number> = {};
(globalThis as { __hookProf?: Record<string, number> }).__hookProf = prof;
const years = +(process.argv[2] ?? 20);
const dens = (process.argv[6] ?? 'many') as 'few' | 'normal' | 'many' | 'all';
const s = createGame(defaultConfig(process.argv[3] ?? 'r29rel', { startYear: +(process.argv[4] ?? 1970), realNames: process.argv[5] !== 'fic', relicDensity: dens }));
/** bytes do relics29 no save: estado compacto + peças procedurais (na lista do relics9) + meta delas no relics18 */
const bytes = (g: GameState) => {
  const st = rel29(g);
  const list = relics(g).list.filter((x) => st.m[x.id]);
  const m18 = Object.fromEntries(list.map((x) => [x.id, rel18(g).m[x.id]]));
  return { r29: JSON.stringify(st).length + JSON.stringify(list).length + JSON.stringify(m18).length, all: JSON.stringify(g).length, alive: list.filter((x) => x.st !== 'lost').length };
};
const t0 = Date.now();
let months = 0;
for (let m = 0; m < years * 12 && !s.ended; m++) {
  playMonth(s, 'balanced');
  advanceMonth(s);
  months++;
  if (months % 120 === 0) { const b = bytes(s); console.log(`ano ${months / 12}: r29 ${b.r29} bytes · save inteiro ${b.all} bytes · vivas ${b.alive} · acervo histórico ${JSON.stringify(arc29(s))}`); }
}
const ms = Date.now() - t0;
console.log('densidade', dens, 'ms', ms, 'meses', months, 'ano', s.year, 'relics9.list', relics(s).list.length);
console.log(Object.entries(cnt).sort((a, b) => b[1] - a[1]).map((x) => x.join(' ')).join('\n'));
const relHooks = Object.entries(prof).filter(([k]) => /relic|crime17|hype12/.test(k)).sort((a, b) => b[1] - a[1]);
const relMs = relHooks.filter(([k]) => /relic/.test(k)).reduce((t, [, v]) => t + v, 0);
const allMs = Object.values(prof).reduce((t, v) => t + v, 0);
console.log(`custo: ganchos de relíquia ${(relMs / months).toFixed(2)} ms/mês (${relMs.toFixed(0)} ms em ${months} meses; ${(100 * relMs / Math.max(1, allMs)).toFixed(1)}% dos ganchos medidos; run inteira ${(ms / months).toFixed(0)} ms/mês)`);
console.log(relHooks.map(([k, v]) => `${k} ${(v / months).toFixed(3)}`).join(' · '));
const st = rel29(s);
const list = relics(s).list.filter((x) => st.m[x.id]);
const by: Record<string, number> = {};
for (const x of list) { const a = ARCH29[+String(st.m[x.id]).split('|')[0]]; by[a] = (by[a] ?? 0) + 1; }
console.log('r29 vivas', list.filter((x) => x.st !== 'lost').length, 'nascidas', Object.values(born).reduce((a, b) => a + b, 0), 'por arquétipo', JSON.stringify(born));
console.log('por ano', JSON.stringify(perYear));
const sts: Record<string, number> = {};
for (const x of list) sts[x.st] = (sts[x.st] ?? 0) + 1;
const perAct: Record<string, number> = {};
for (const x of list) if (x.a && x.st !== 'lost') perAct[x.a] = (perAct[x.a] ?? 0) + 1;
console.log('estado das vivas', JSON.stringify(sts), 'falsas', list.filter((x) => String(st.m[x.id]).endsWith('F')).length, 'máx por ato', Math.max(0, ...Object.values(perAct)), 'atos com peça', Object.keys(perAct).length);
console.log('por arquétipo (vivas)', JSON.stringify(by), 'acervo histórico', JSON.stringify(arc29(s)));
console.log('bytes', JSON.stringify(bytes(s)));
for (const rl of list.slice(-12)) console.log(' ·', rl.y, rl.k, rl.n.pt, '|', rl.st, rl.v, rl.own.at(-1)?.[0]);
