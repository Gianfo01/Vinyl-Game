// R29 (relíquias procedurais): medição numa run de bot. Conta os fatos-gatilho que passam pelo barramento e as
// relíquias por arquétipo, e mede o peso no save.
// Uso: npx tsx scripts/measure29relics.ts [anos=20] [semente=r29rel] [anoInicial=1970] [fic]
import { defaultConfig } from '../src/sim/bot';
import { simulatePlayer } from '../src/sim/playbot16';
import { onFact } from '../src/sim/facts17';
import { relics } from '../src/sim/sys/relics9';
import '../src/sim/sys/index';

const K = new Set(['show', 'chart', 'masterwork', 'award', 'death', 'split', 'signing', 'session_star', 'scandal', 'tour_done', 'crowd_incident', 'disaster', 'legend', 'comeback', 'revival_hit', 'charity_show', 'theft', 'breakup', 'catalog_rerelease', 'relic']);
const cnt: Record<string, number> = {};
onFact('*', (_s, f) => {
  if (!K.has(f.kind)) return;
  const tg = f.tags.filter((t) => t.startsWith('chron:') || ['tour', 'live', 'good', 'homecoming', 'reunion', 'first', 'fire', 'tragedy', 'born'].includes(t)).join(',');
  const k = `${f.kind}|${tg}|${f.severity >= 60 ? 'hi' : f.severity >= 40 ? 'mid' : 'lo'}`;
  cnt[k] = (cnt[k] ?? 0) + 1;
}, 'measure29relics');
const t0 = Date.now();
const years = +(process.argv[2] ?? 20);
const r = simulatePlayer(defaultConfig(process.argv[3] ?? 'r29rel', { startYear: +(process.argv[4] ?? 1970), realNames: process.argv[5] !== 'fic' }), years);
const s = r.state;
const x4 = (s as unknown as { x4: Record<string, unknown> }).x4;
console.log('ms', Date.now() - t0, 'year', s.year, 'relics', relics(s).list.length);
console.log(Object.entries(cnt).sort((a, b) => b[1] - a[1]).map((x) => x.join(' ')).join('\n'));
const p29 = x4.relics29 as { m?: Record<string, unknown> } | undefined;
if (p29) {
  const ids = new Set(Object.keys(p29.m ?? {}));
  const list = relics(s).list.filter((x) => ids.has(x.id));
  const by: Record<string, number> = {};
  for (const id of ids) { const a = String((p29.m as Record<string, string>)[id]).split('|')[0]; by[a] = (by[a] ?? 0) + 1; }
  console.log('r29 vivos', list.length, 'total nascidos', JSON.stringify((p29 as { n?: unknown }).n));
  console.log('por arquétipo (vivos)', JSON.stringify(by));
  const bytes = JSON.stringify(p29).length + JSON.stringify(list).length;
  console.log('bytes r29 (estado + peças vivas)', bytes);
  for (const rl of list.slice(-12)) console.log(' ·', rl.y, rl.k, rl.n.pt, '|', rl.st, rl.v, rl.own.at(-1)?.[0]);
}
