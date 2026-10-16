// R31 onda 3 (bal): partidas longas do robô (padrão 20 anos) para taxa de falência por época de início.
// Uso: R31_SW="id=v,..." npx tsx scripts/r31/long20.ts [meses=240] [perfil=balanced] semente@ano ...
//   (sem pares: 6 sementes bal20-0..5 em 1960, 1963, 1966, 1969, 1972, 1975; nomes reais ligados, como o r29-relics)
// Imprime uma linha por partida: semente, início, meses jogados, fim (insolvência/…), caixa e patrimônio em US$ 2020,
// o caixa mínimo e o mês em que o caixa ficou abaixo de zero pela primeira vez.
import { defaultConfig } from '../../src/sim/bot';
import { playMonth, type Profile } from '../../src/sim/playbot16';
import { advanceMonth } from '../../src/sim/tick';
import { createGame } from '../../src/sim/worldgen';
import { setSw, switchDef } from '../../src/sim/r31/switches';
import { toReal } from '../../src/core/money';
import { worth19 } from '../../src/sim/balance19';
import { ownerOf } from '../../src/sim/sys/people/owner';

const months = Number(process.argv[2] ?? 240);
const prof = (process.argv[3] ?? 'balanced') as Profile;
const pairs = process.argv.slice(4).length ? process.argv.slice(4) : [1960, 1963, 1966, 1969, 1972, 1975].map((y, i) => `bal20-${i}@${y}`);
for (const p of pairs) {
  const [seed, ys] = p.split('@');
  const s = createGame(defaultConfig(seed, { startYear: Number(ys), realNames: true }));
  if (process.env.R31_SW) for (const kv of process.env.R31_SW.split(',')) {
    const [id, raw] = kv.split('='); const d = switchDef(id); if (!d) throw new Error(id);
    setSw(s, id, typeof d.def === 'boolean' ? raw === 'true' : typeof d.def === 'number' ? Number(raw) : raw);
  }
  const w0 = ownerOf(s).wealth;
  let m = 0, minC = Infinity, firstNeg = -1;
  for (; m < months && !s.ended; m++) {
    playMonth(s, prof); advanceMonth(s);
    const c = toReal(s.player.cash, s.year);
    if (c < minC) minC = c;
    if (c < 0 && firstNeg < 0) firstNeg = m;
  }
  const end = (s.ended as unknown as { reason?: string } | undefined)?.reason ?? '';
  console.log(`${seed}@${ys}\tmeses ${m}\t${s.ended ? `FIM ${s.year} (${end})` : 'vivo'}\tcaixa ${Math.round(toReal(s.player.cash, s.year) / 1000)}k\tpatrim ${Math.round(toReal(worth19(s, w0), s.year) / 1000)}k\tmin ${Math.round(minC / 1000)}k\t1º<0 ${firstNeg}`);
}
