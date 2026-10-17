// R31 (DBTAM): estimativa da Nova run (cast25) × mundo gerado — por tamanho, ano de início e país desligado.
import { defaultConfig } from '../../src/sim/bot';
import { createGame } from '../../src/sim/worldgen';
import { REAL_BASE } from '../../src/sim/sys/realworld';
import { cast31 } from '../../src/sim/dbcast31';
const sizes = (process.env.SIZES ?? 'small,medium,large,huge').split(',') as never[];
const years = (process.env.YEARS ?? '1925,1975,2012,2030').split(',').map(Number);
const offs = (process.env.OFFS ?? '-,BRA,ITA,USA,GBR').split(',');
for (const size of sizes) for (const y of years) for (const o of offs) {
  const off = o === '-' ? undefined : [o];
  const s = createGame(defaultConfig('dbtam', { startYear: y, realNames: true, dbSize: size, ...(off ? { realOff31: off } : {}) }));
  const acts = Object.values(s.acts);
  const real = acts.filter((a) => (a.catalogNo ?? 0) >= REAL_BASE).length, classic = acts.filter((a) => a.catalogNo && a.catalogNo < REAL_BASE).length;
  const e = cast31({ realNames: true, mode: 'free', dbSize: size, realOff31: off }, y);
  console.log(`${size} ${y} ${o}: est real ${e.real} acts ${e.acts} | mundo real ${real} clássico ${classic} total ${acts.length} | erro ${(((e.acts - acts.length) / acts.length) * 100).toFixed(1)}%`);
}
