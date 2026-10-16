// R31 onda 3 (bal): reputação comercial do jogador mês a mês (o investidor só aparece acima de 30).
// Uso: MEAS=1 R31_SW="id=v,..." npx tsx scripts/r31/probe-rep.ts <meses> semente@ano ...
import { defaultConfig } from '../../src/sim/bot';
import { playMonth } from '../../src/sim/playbot16';
import { advanceMonth } from '../../src/sim/tick';
import { createGame } from '../../src/sim/worldgen';
import { setSw, switchDef } from '../../src/sim/r31/switches';

const months = Number(process.argv[2] ?? 18);
for (const p of process.argv.slice(3)) {
  const [seed, ys] = p.split('@');
  const s = createGame(defaultConfig(seed, process.env.MEAS ? { startYear: Number(ys), role: 'label', bandGenre: 'rnr', bandName: 'Banda Teste' } : { startYear: Number(ys), realNames: true }));
  if (process.env.R31_SW) for (const kv of process.env.R31_SW.split(',')) {
    const [id, raw] = kv.split('='); const d = switchDef(id); if (!d) throw new Error(id);
    setSw(s, id, typeof d.def === 'boolean' ? raw === 'true' : typeof d.def === 'number' ? Number(raw) : raw);
  }
  const rep: string[] = [`${s.player.reputation.commercial.toFixed(0)}/${s.player.reputation.artistic.toFixed(0)}`];
  for (let m = 0; m < months && !s.ended; m++) {
    playMonth(s, 'balanced'); advanceMonth(s);
    if (m % 3 === 2) rep.push(`${s.player.reputation.commercial.toFixed(0)}/${s.player.reputation.artistic.toFixed(0)}`);
  }
  console.log(p, rep.join(' '), 'inv', s.economy.investorUntil > 0 ? 'sim' : 'não');
}
