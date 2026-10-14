// R29 demo: ablação — qual ligação mexe no caixa do playbot (semente do golden r27-p2a/p2b)
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { advanceMonth } from '../src/sim/tick';
import { playMonth } from '../src/sim/playbot16';
import { registerMod, registerOfferMod } from '../src/sim/ext4';
import { DEMO29 } from '../src/sim/demo29hook';
import { MEDIA18 } from '../src/sim/media18hook';
import { REL_ADJ19 } from '../src/sim/sys/awards18';
import '../src/sim/sys/demo29';
const off = process.argv[2] ?? '';
const keep = { ...DEMO29 };
const eff = MEDIA18.eff;
for (const k of off.split(',').filter(Boolean)) {
  if (k.startsWith('mod:')) { const [, name, id] = k.split(':'); registerMod(name as never, id, () => null); }
  else if (k === 'offer') registerOfferMod('demo29', () => null);
  else if (k === 'eff') MEDIA18.eff = (s, a, c) => (eff as never as { (s: unknown, a: string, c: string): number }) ? 1 : 1;
  else if (k === 'awards') REL_ADJ19.length = Math.max(0, REL_ADJ19.length - 1);
  else delete (DEMO29 as Record<string, unknown>)[k];
}
void keep;
const s = createGame(defaultConfig(process.argv[3] ?? 'r16pb-5', { startYear: Number(process.argv[4] ?? 1975), realNames: true }));
for (let m = 0; m < Number(process.argv[5] ?? 8) && !s.ended; m++) { playMonth(s, 'balanced'); advanceMonth(s); }
console.log(off || 'tudo', 'caixa', s.player.cash, 'fama', Object.values(s.acts).filter((a) => a.owner === 'player').map((a) => Math.round(a.fame)).join(','));
