// R29 (família): medição numa run do bot realista (playbot16) — casamentos, filhos, estreias da família, divórcios,
// estrelas mirins, casais célebres, carreiras da indústria e escândalos de exploração por década; custo do gancho
// (ms/mês, pelo perfil de ganchos) e peso no save. Também roda numa árvore sem o family29 (só ms/mês e save).
// Uso: npx tsx scripts/measure29familia.ts [anos=20] [semente=fam29probe] [anoInicial=1960] [base=medium] [real]
import { defaultConfig } from '../src/sim/bot';
import { simulatePlayer } from '../src/sim/playbot16';
import '../src/sim/sys/index';

const years = Number(process.argv[2] ?? 20), seed = process.argv[3] ?? 'fam29probe', start = Number(process.argv[4] ?? 1960);
const db = (process.argv[5] ?? 'medium') as 'small' | 'medium' | 'large' | 'huge';
const P = ((globalThis as { __hookProf?: Record<string, number> }).__hookProf = {});
const t0 = Date.now(), c0 = process.cpuUsage();
const { state: s } = simulatePlayer(defaultConfig(seed, { startYear: start, dbSize: db, realNames: process.argv[6] === 'real' }), years);
const months = Math.max(1, (s.year - start) * 12 + s.month);
const cpu = process.cpuUsage(c0);
type St = { k: unknown[]; f: Record<string, unknown>; min: Record<string, unknown>; ex: Record<string, unknown>; ip: Record<string, unknown>; sim: string[]; n: Record<string, number[]>; log: [number, number, { pt: string }][] };
const st = (s.x4 as unknown as { family29?: St }).family29;
const size = (x: unknown) => JSON.stringify(x ?? null).length;
const hook = (k: string) => +((P[k] ?? 0) / months).toFixed(2);
const cols = ['casamentos', 'filhos', 'estreias', 'divórcios', 'mirins', 'casais célebres', 'carreiras indústria', 'exploração'];
console.log(JSON.stringify({
  seed, start, years, db, months, ended: s.ended?.reason ?? null, msPerMonth: Math.round((Date.now() - t0) / months), cpuMsPerMonth: Math.round((cpu.user + cpu.system) / 1000 / months),
  hookMsPerMonth: { family29: hook('month:family29'), family29year: hook('year:family29'), kin15: hook('month:kin15'), people16: hook('month:people16') },
  saveBytes: size(s), family29Bytes: size(st), kin15Bytes: size((s.x4 as unknown as { kin15?: unknown }).kin15), familiesBytes: size(s.families),
  kids: st?.k.length, families: Object.keys(st?.f ?? {}).length, minors: Object.keys(st?.min ?? {}).length, exChild: Object.keys(st?.ex ?? {}).length, industryKids: Object.keys(st?.ip ?? {}).length, simulated: st?.sim.length,
  acts: Object.keys(s.acts).length, persons: Object.keys(s.persons).length,
}));
if (st) for (const [d, v] of Object.entries(st.n).sort()) console.log(`${d}: ${cols.map((c, i) => `${c} ${v[i] ?? 0}`).join(' · ')}`);
if (st) console.log(st.log.slice(0, 10).map((x) => `${x[0]}/${x[1] + 1} ${x[2].pt}`).join('\n'));
