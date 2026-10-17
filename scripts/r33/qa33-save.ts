// R33 · QA33 — salvar/carregar no meio da partida e continuar: o jogo carregado tem de seguir igual ao original.
// Uso: npx tsx scripts/r33/qa33-save.ts [ano=1985] [meses=24] [depois=4] [interruptores: all | none | id,id]
import { defaultConfig } from '../../src/sim/bot';
import { playMonth } from '../../src/sim/playbot16';
import { advanceMonth } from '../../src/sim/tick';
import { createGame } from '../../src/sim/worldgen';
import { setSw, switchDefs } from '../../src/sim/r31/switches';
import { decodeSave20, encodeSave20 } from '../../src/core/save20';
import { migrate } from '../../src/ui/store';
import { newRunConfig20 } from '../../src/sim/start17';
import type { GameState } from '../../src/sim/types';

const [y = '1985', n = '24', k = '4', which = 'all'] = process.argv.slice(2);
const ids = which === 'none' ? [] : which === 'all' ? switchDefs().filter((d) => d.id.startsWith('exp33.') && typeof d.def === 'boolean').map((d) => d.id) : which.split(',');
const s = process.env.CFG20 ? createGame(Object.assign(newRunConfig20({ seed: 'qa33-teste', companyName: 'Selo Teste' }), { startYear: Number(y), sw31: Object.fromEntries(switchDefs().filter((d) => d.id.startsWith('exp33.')).map((d) => [d.id, false])) })) : createGame(defaultConfig('qa33-save', { startYear: Number(y), realNames: true, dbSize: 'small' }));
for (const id of ids) setSw(s, id, true);
for (let m = 0; m < Number(n); m++) { playMonth(s, 'aggressive'); advanceMonth(s); }
const back = decodeSave20(encodeSave20(s), migrate);
const diff = (a: unknown, b: unknown, path: string, out: string[]): void => {
  if (out.length > 30) return;
  if (!process.env.ALL && /txn31|ledger|\.cls\.|totals/.test(path)) return;
  if (JSON.stringify(a) === JSON.stringify(b)) return;
  if (a && b && typeof a === 'object' && typeof b === 'object') { for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) diff((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key], `${path}.${key}`, out); return; }
  out.push(`${path}: ${JSON.stringify(a)?.slice(0, 80)} × ${JSON.stringify(b)?.slice(0, 80)}`);
};
const d0: string[] = []; diff(JSON.parse(JSON.stringify(s)), JSON.parse(JSON.stringify(back)), 's', d0);
console.log(`logo após carregar: ${d0.length ? d0.join('\n') : 'igual'}`);
for (let m = 0; m < Number(k); m++) {
  // depois de carregar, só o tempo anda (o robô guarda memória fora do save — playbot16 MEM —, então ele mesmo divergiria)
  if (process.env.BOT) { playMonth(s, 'aggressive'); playMonth(back, 'aggressive'); }
  advanceMonth(s); advanceMonth(back);
  const d: string[] = []; diff(JSON.parse(JSON.stringify(s as GameState)), JSON.parse(JSON.stringify(back)), 's', d);
  console.log(`mês +${m + 1}: ${d.length ? `DIFERENTE\n  ${d.join('\n  ')}` : 'igual'}`);
  if (d.length) { const ta = (s.x4 as any).txn31?.last ?? [], tb = (back.x4 as any).txn31?.last ?? []; for (let i = 0; i < Math.max(ta.length, tb.length); i++) if (JSON.stringify(ta[i]) !== JSON.stringify(tb[i])) console.log('  txn', i, JSON.stringify(ta[i]), '×', JSON.stringify(tb[i])); break; }
}
