// R31 F (ferramenta de auditoria): acha quem lê/escreve Person.rel[pessoa do jogador] direto (deveria ir por opinion.ts).
// Uso: npx tsx scripts/r31/probe-rel.ts [semente] [ano] [meses] [papel]
import { defaultConfig } from '../../src/sim/bot';
import { createGame } from '../../src/sim/worldgen';
import { playMonth } from '../../src/sim/playbot16';
import { advanceMonth } from '../../src/sim/tick';
import { meId } from '../../src/sim/opinion';
import type { GameState } from '../../src/sim/types';

const [seed = 'probe-a', start = '1975', months = '60', role = 'label'] = process.argv.slice(2);
const s: GameState = createGame(defaultConfig(seed, { startYear: Number(start), role: role as 'label', bandGenre: 'rnr', bandName: 'Banda Teste' }));
const hits = new Map<string, number>();
const site = (op: string): void => {
  const st = (new Error().stack ?? '').split('\n').slice(3, 5).map((x) => x.trim().replace(/^at /, '').replace(/\(.*\/src\//, '(src/')).join(' <- ');
  const k = `${op} ${st}`;
  hits.set(k, (hits.get(k) ?? 0) + 1);
};
const WR = new WeakSet<object>();
function wrap(): void {
  const me = meId(s);
  if (!me) return;
  for (const p of Object.values(s.persons)) {
    if (WR.has(p.rel)) continue;
    const px = new Proxy(p.rel, {
      get(t, k) { if (k === me && p.id !== me) site('GET'); return Reflect.get(t, k); },
      set(t, k, v) { if (k === me && p.id !== me) site('SET'); return Reflect.set(t, k, v); },
      has(t, k) { if (k === me && p.id !== me) site('HAS'); return Reflect.has(t, k); },
    });
    WR.add(px);
    p.rel = px;
  }
}
for (let i = 0; i < Number(months); i++) {
  wrap();
  playMonth(s, 'balanced');
  wrap();
  advanceMonth(s);
}
const me = meId(s);
const stored = me ? Object.values(s.persons).filter((p) => p.id !== me && Object.prototype.hasOwnProperty.call(p.rel, me)).length : -1;
console.log(JSON.stringify({ seed, start, months, me, stored, hits: [...hits.entries()].sort((a, b) => b[1] - a[1]) }, null, 1));
