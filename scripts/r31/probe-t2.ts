// R31 T2 — sonda: quais editais de proposta fechada aparecem numa partida do robô (causa, vencedor, semana).
import { defaultConfig } from '../../src/sim/bot';
import { createGame } from '../../src/sim/worldgen';
import { playMonth } from '../../src/sim/playbot16';
import { advanceMonth } from '../../src/sim/tick';
import '../../src/sim/sys';
const [seed = 'r31-base-2', start = '1990', months = '36'] = process.argv.slice(2);
const s = createGame(defaultConfig(seed, { startYear: Number(start), role: 'label', bandGenre: 'rnr', bandName: 'Banda Teste' }));
for (let m = 0; m < Number(months) && !s.ended; m++) { playMonth(s, 'balanced'); advanceMonth(s); }
const st = (s.x4 as unknown as { sealed31?: { done: { id: string; cause: string; src: string; winName?: string; price?: number; env?: unknown[] }[]; own: unknown[]; log: [number, { pt: string }][] } }).sealed31;
console.log(JSON.stringify({ done: st?.done.map((x) => [x.id, x.src, x.cause, x.winName, x.price, x.env?.length]), open: st?.own.length, log: st?.log.map((x) => x[1].pt) }, null, 1));
