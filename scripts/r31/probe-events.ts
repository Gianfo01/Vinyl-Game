// R31 onda 3 (bal): que eventos do narrador ficam válidos e quais saem, nos primeiros N meses do robô.
// Uso: MEAS=1 R31_SW="id=v,..." npx tsx scripts/r31/probe-events.ts <meses> semente@ano ...
import { defaultConfig } from '../../src/sim/bot';
import { playMonth } from '../../src/sim/playbot16';
import { advanceMonth } from '../../src/sim/tick';
import { createGame } from '../../src/sim/worldgen';
import { EVENTS, EV28 } from '../../src/sim/events';
import { setSw, switchDef } from '../../src/sim/r31/switches';

const months = Number(process.argv[2] ?? 18);
const valid: Record<string, number> = {}, picked: Record<string, number> = {};
let sweeps = 0, nValid = 0;
const first = EVENTS.find((d) => d.find && !d.forcedOnly)!;
for (const d of EVENTS) {
  const f = d.find;
  if (!f) continue;
  d.find = (s, r) => { if (d === first) sweeps++; const c = f(s, r); if (c) { valid[d.id] = (valid[d.id] ?? 0) + 1; nValid++; } return c; };
}
const prev = EV28.on;
EV28.on = (s, d, c) => { picked[d.id] = (picked[d.id] ?? 0) + 1; prev?.(s, d, c); };
let scans = 0;
for (const p of process.argv.slice(3)) {
  const [seed, ys] = p.split('@');
  const s = createGame(defaultConfig(seed, process.env.MEAS ? { startYear: Number(ys), role: 'label', bandGenre: 'rnr', bandName: 'Banda Teste' } : { startYear: Number(ys), realNames: true }));
  if (process.env.R31_SW) for (const kv of process.env.R31_SW.split(',')) {
    const [id, raw] = kv.split('='); const d = switchDef(id); if (!d) throw new Error(id);
    setSw(s, id, typeof d.def === 'boolean' ? raw === 'true' : typeof d.def === 'number' ? Number(raw) : raw);
  }
  for (let m = 0; m < months && !s.ended; m++) { playMonth(s, 'balanced'); advanceMonth(s); scans++; }
}
const top = (o: Record<string, number>) => Object.entries(o).sort((a, b) => b[1] - a[1]);
console.log('meses', scans, 'eventos', EVENTS.length, 'varreduras', sweeps, 'válidos por varredura', (nValid / Math.max(1, sweeps)).toFixed(1));
console.log('SAÍRAM', JSON.stringify(top(picked)));
console.log('VÁLIDOS', JSON.stringify(top(valid).slice(0, 60)));
console.log('investor_offer válido', valid.investor_offer ?? 0, 'saiu', picked.investor_offer ?? 0);
