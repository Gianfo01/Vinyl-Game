// R31 (DBTAM): reproduz o golden do r27-p2a/p2b (semente r16pb-5, 1975, nomes reais, 8 meses do robô) com
// configuração extra: R31_CFG="base31br=false,base31it=false,base31hits=false,dbSize=large".
import { defaultConfig } from '../../src/sim/bot';
import { createGame } from '../../src/sim/worldgen';
import { playMonth } from '../../src/sim/playbot16';
import { advanceMonth } from '../../src/sim/tick';
import { hashString } from '../../src/core/rng';
import { rngSnapshot19 } from '../../src/sim/rng19';
const over: Record<string, unknown> = {};
for (const kv of (process.env.R31_CFG ?? '').split(',').filter(Boolean)) { const [k, v] = kv.split('='); over[k] = v === 'true' ? true : v === 'false' ? false : v; }
const s = createGame(defaultConfig('r16pb-5', { startYear: 1975, realNames: true, ...over }));
for (let m = 0; m < 8 && !s.ended; m++) { playMonth(s, 'balanced'); advanceMonth(s); }
console.log(JSON.stringify(over), 'caixa', s.player.cash, 'turnês', hashString(JSON.stringify(s.tours)), 'acts', hashString(JSON.stringify(s.acts)), 'rng', hashString(rngSnapshot19(s)));
