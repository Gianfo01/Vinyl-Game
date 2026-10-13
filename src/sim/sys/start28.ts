// Rodada 28 (F4) — primeiro sucesso perto: (1) começo diferente por semente e (2) o cenário de entrada "Primeiro hit".
//
// (1) Situação inicial sorteada: a Nova run (rápida e completa, via buildRun27) grava em `config.start28` o id sorteado
//     pela semente (fluxo próprio `Rng.fromSeed('start28:'+seed)`, não toca no RNG da partida). No gancho 'newgame' o
//     começo ajusta caixa e reputação — o mesmo para as 12 carreiras (decisão do autor: todas em pé de igualdade).
//     Sem `start28` (testes, headless, saves antigos) nada muda: os valores-ouro continuam valendo.
// (2) "Primeiro hit": cenário curto com um artista já pronto para estourar e uma meta de top 10 alcançável no 1º ano.

import { l } from '../../data/world';
import { start28ById, type Start28 } from '../start28data';
import { start28Fits29 } from '../start29data';
export { REC_YEARS28, STARTS28, pickStart28, start28ById, yearsFor28, type Start28 } from '../start28data';
import { registerSimHook } from '../ext4';
import { emitFact } from '../facts17';
import type { GameState } from '../types';
import { fmtL, remember } from '../util';
import { SCENARIOS, adjustCash, insolvent, scenarioById, signAct } from './live';

/** Cenário em curso, lido cru (sem criar o estado do sistema `live` em partidas sem cenário). */
const scenarioId28 = (s: GameState): string | undefined => ((s as unknown as { x4?: { live?: { scenario?: { id: string } } } }).x4?.live?.scenario?.id);
import { SCENARIOS17, type Scenario17 } from './scenarios17';

const clamp100 = (x: number): number => Math.max(0, Math.min(100, x));

/** Aplica o começo ao estado novo (chamado só no gancho 'newgame'). */
export function applyStart28(s: GameState, st: Start28): void {
  if (st.cash !== 1) adjustCash(s, st.cash);
  const rep = s.player.reputation as unknown as Record<string, number>;
  for (const [k, v] of Object.entries(st.rep)) if (typeof rep[k] === 'number') rep[k] = clamp100(rep[k] + (v ?? 0));
  remember(s, 'start28', fmtL(l('Seu começo: {n}. {t}', 'Your start: {n}. {t}'), { n: st.name, t: st.text }), { important: true });
}

registerSimHook('newgame', 'start28', (s) => {
  const st = start28ById(s.config.start28);
  if (!st || s.config.scenario17 || scenarioId28(s)) return; // cenário histórico tem seu próprio começo
  if (!start28Fits29(st.id, s.config.start29)) return; // r29: não contradiz a situação escolhida (uma major não começa "devendo o equipamento")
  applyStart28(s, st);
});

// ---------------------------------------------------------------- (2) cenário de entrada "Primeiro hit"

/** Lançamentos seus que chegaram ao top 40 (pico 1–40). */
export const top40Hits28 = (s: GameState): number => Object.values(s.releases).filter((r) => (r.owner === 'player' || s.acts[r.actId]?.playerBand) && r.peak > 0 && r.peak <= 40).length;

export const FIRST_HIT28: Scenario17 = {
  id: 'first_hit_28', name: l('Primeiro hit: Nova York, 1964', 'First hit: New York, 1964'), startYear: 1964, endYear: 1966, homeCity: 'new_york', scenario: 'emerging',
  desc: l('Para começar: um selo pequeno com um grupo de soul que já toca nas rádios do bairro. O primeiro sucesso está a um lançamento de distância — o resto é com você.',
    'To start with: a small label with a soul group already playing on neighborhood radio. The first hit is one release away — the rest is up to you.'),
  goal: l('Emplaque singles no top 40 (WorldSound 100) até o fim de 1966.', 'Land singles in the top 40 (WorldSound 100) by the end of 1966.'), unit: l('hits no top 40', 'top-40 hits'), tiers: [1, 3, 6],
  rules17: [l('Entrada: o grupo principal já tem fãs e fama no bairro; grave e lance logo — o top 40 está a um single de distância.', 'Entry: the main group already has local fans and fame; record and release soon — the top 40 is one single away.'),
    l('Um segundo artista, cru, para você descobrir com calma.', 'A second, raw act for you to develop at your own pace.'),
    l('O top 10 mundial de 1964 é das lendas: chegar lá é a medalha de ouro.', 'The 1964 world top 10 belongs to legends: getting there is the gold medal.')],
  setup: (s, r) => {
    adjustCash(s, 1.1);
    const a = signAct(s, r, 'soul', 'new_york', 24, 4);
    a.potential = Math.max(a.potential, 80);
    signAct(s, r, 'girl_group', 'new_york', 6, 3);
  },
  metric: (s) => top40Hits28(s), fail: insolvent,
};
if (!scenarioById[FIRST_HIT28.id]) { SCENARIOS17.push(FIRST_HIT28); SCENARIOS.push(FIRST_HIT28); scenarioById[FIRST_HIT28.id] = FIRST_HIT28; }

/** Aviso de início do cenário de entrada: diz o próximo passo concreto (o tutorial se conclui fazendo). */
registerSimHook('newgame', 'start28-firsthit', (s) => {
  if (scenarioId28(s) !== FIRST_HIT28.id) return;
  emitFact(s, { kind: 'scenario', actors: ['player'], place: s.config.homeCity, severity: 20, visibility: 'public', tags: ['good'], src: 'start28',
    text: l('Primeiro hit: grave com o seu grupo de soul e lance um single — a rádio já conhece o nome.', 'First hit: record with your soul group and release a single — radio already knows the name.') });
});
