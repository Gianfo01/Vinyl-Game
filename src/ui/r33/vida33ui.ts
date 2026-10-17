// R33 · VIDA — ações e números nos cartões de ação (EXP-13): sem tela nova. Entram nos cartões da casa e do mapa só
// quando o interruptor da regra está ligado (`when`); desligado, o cartão fica como era. Cada ação chama a função de
// src/sim/r33/vida33.ts (fonte única, `src` + `fn` como pede o teste r31-acoes5).

import { l, type L } from '../../data/world';
import { sw } from '../../sim/r31/switches';
import {
  SW33, buildWall33, donate33, foundFoundation33, setGuard33, setRoutine33, takeTrip33, treatOwner33, tripOptions33, vida33, repLevel33,
  type Routine33,
} from '../../sim/r33/vida33';
import { fmtL, money } from '../../sim/util';
import type { GameState } from '../../sim/types';
import { ownerOf } from '../../sim/sys/people/owner';
import { CARDS5 } from '../r31/acoes5data';
import { ACTS_CAT5, NUMS_CAT5 } from '../r31/acoes5cat';
import type { ActDef5, ActRes5, NumDef5 } from '../r31/acoes5model';

const on = (s: GameState, id: string): boolean => !!sw<boolean>(s, id);
const done = (err: L | null, ok: L): ActRes5 => (err ? { text: err, bad: true } : { text: ok });

function A(label: L, fn: (...a: never[]) => unknown, name: string, when: (s: GameState) => boolean, call: (s: GameState) => L | null, ok: L, home: string): ActDef5 {
  return { label, kind: 'do', src: ['sim/r33/vida33', name], fn, when, home, run: (s) => done(call(s), ok), same: (s) => { call(s); } };
}
const routine = (r: Routine33, label: L, ok: L): ActDef5 =>
  A(label, setRoutine33, 'setRoutine33', (s) => on(s, SW33.rotina) && vida33(s).routine !== r, (s) => { setRoutine33(s, r); return null; }, ok, 'casa.sofa');

const ADD: Record<string, ActDef5> = {
  'v33.sono': routine('sleep', l('Rotina: dormir bem', 'Routine: sleep well'), l('Rotina: sono em dia.', 'Routine: sleep on track.')),
  'v33.hobby': routine('hobby', l('Rotina: hobby', 'Routine: hobby'), l('Rotina: hobby toda semana.', 'Routine: a weekly hobby.')),
  'v33.checkup': A(l('Check-up médico (US$ 700)', 'Medical check-up (US$ 700)'), treatOwner33, 'treatOwner33', (s) => on(s, SW33.saude), (s) => treatOwner33(s, 'checkup'), l('Check-up feito.', 'Check-up done.'), 'casa.voce'),
  'v33.rehab': A(l('Retiro de recuperação (US$ 6 mil)', 'Recovery retreat (US$ 6k)'), treatOwner33, 'treatOwner33', (s) => on(s, SW33.saude) && ownerOf(s).stress >= 60, (s) => treatOwner33(s, 'rehab'), l('Você voltou renovado.', 'You came back renewed.'), 'casa.voce'),
  'v33.muro': A(l('Construir muro (US$ 12 mil)', 'Build a wall (US$ 12k)'), buildWall33, 'buildWall33', (s) => on(s, SW33.paparazzi) && !vida33(s).wall, buildWall33, l('Muro erguido.', 'Wall built.'), 'casa.porta'),
  'v33.guarda': A(l('Contratar segurança', 'Hire security'), setGuard33, 'setGuard33', (s) => on(s, SW33.paparazzi) && vida33(s).guard < 2, (s) => { setGuard33(s, vida33(s).guard + 1); return null; }, l('Segurança reforçada.', 'Security stepped up.'), 'casa.porta'),
  'v33.doar': A(l('Doar US$ 4 mil', 'Donate US$ 4k'), donate33, 'donate33', (s) => on(s, SW33.rep), (s) => donate33(s, 4000), l('Doação feita.', 'Donation made.'), 'cofrecasa'),
  'v33.fundacao': A(l('Criar fundação (US$ 20 mil)', 'Found a foundation (US$ 20k)'), foundFoundation33, 'foundFoundation33', (s) => on(s, SW33.rep) && !vida33(s).foundation, foundFoundation33, l('Fundação criada.', 'Foundation founded.'), 'cofrecasa'),
  'v33.viagem': A(l('Viagem de lazer', 'Leisure trip'), takeTrip33, 'takeTrip33', (s) => on(s, SW33.rotina) && tripOptions33(s).length > 0,
    (s) => { const o = tripOptions33(s)[0]; return o ? takeTrip33(s, o.city) : null; }, l('Boa viagem!', 'Have a good trip!'), 'mapaparede'),
};
Object.assign(ACTS_CAT5, ADD);

const bar = (v: number): number => Math.max(0, Math.min(1, v / 100));
const NUM: Record<string, NumDef5> = {
  'v33.rep': { label: l('Imagem pessoal', 'Personal image'), val: (s) => (on(s, SW33.rep) ? { value: `${Math.round(repLevel33(s))}`, bar: bar(50 + repLevel33(s) / 2), tone: repLevel33(s) < -20 ? 'bad' : repLevel33(s) > 20 ? 'good' : undefined } : null) },
  'v33.viagem': { label: l('Próximo destino', 'Next destination'), val: (s) => { const o = on(s, SW33.rotina) ? tripOptions33(s)[0] : undefined; return o ? { value: fmtL(l('{c} · US$ {p}', '{c} · US$ {p}'), { c: o.name, p: String(Math.round(o.cost / (money(s, 1) || 1))) }).pt } : null; } },
};
Object.assign(NUMS_CAT5, NUM);

function put(card: string, acts: string[], nums: string[]): void {
  const c = CARDS5[card];
  if (!c) return;
  for (const a of acts) if (!c.acts.includes(a)) c.acts.push(a);
  for (const n of nums) if (!c.nums.includes(n)) c.nums.push(n);
}
put('casa.sofa', ['v33.sono', 'v33.hobby'], []);
put('casa.voce', ['v33.checkup', 'v33.rehab'], []);
put('casa.porta', ['v33.muro', 'v33.guarda'], []);
put('cofrecasa', ['v33.doar', 'v33.fundacao'], []);
put('casa.sofa', [], ['v33.rep']);
put('mapaparede', ['v33.viagem'], ['v33.viagem']);
