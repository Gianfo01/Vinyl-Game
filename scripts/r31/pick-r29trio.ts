// R31 onda 3 (bal): com as sondas por semente (probe-r29seeds.ts), testa cada trio como o tests/r29-connect-all.
import '../../src/sim/sys/index';
import { readFileSync } from 'node:fs';
import { EDGES29, matrix29, median29, strength29, type Run29 } from '../../src/sim/probe29all';

const all: Record<string, Run29> = {};
for (const f of process.argv.slice(2)) Object.assign(all, JSON.parse(readFileSync(f, 'utf8')));
const ids = Object.keys(all);
const bad = (trio: string[]) => {
  const RUN = median29(trio.map((x) => all[x]));
  const CELLS = new Map(matrix29(RUN).map((c) => [`${c.a}>${c.b}`, c]));
  const miss = EDGES29.filter((e) => !CELLS.get(`${e.a}>${e.b}`)?.str).map((e) => `${e.a}→${e.b}`);
  const wrong: string[] = [];
  for (const e of EDGES29) {
    if (!e.check) continue;
    const [n, m, sign] = e.check;
    const r = RUN.rows.find((x) => x.nudge === n && x.metric === m);
    if (!r || !strength29(r.d) || Math.sign(r.d) !== sign) wrong.push(`${e.a}→${e.b}`);
  }
  return [...miss, ...wrong];
};
for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) for (let k = j + 1; k < ids.length; k++) {
  const t = [ids[i], ids[j], ids[k]]; const b = bad(t);
  console.log(b.length ? 'X' : 'OK', t.join(','), b.join(' '));
}
