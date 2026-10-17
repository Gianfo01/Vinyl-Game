// R33 · VIDA — evento de vida "escândalo pessoal" (entra no sorteio mensal de lifeevents10 só com exp33.reppessoal).
// Nasce de fama alta + estresse/paparazzi recente; as respostas mexem na reputação pessoal (vida33), não na da empresa.

import { l } from '../../data/world';
import { EVENTS } from '../sys/lifeevents10/data';
import { C, T } from '../sys/lifeevents10/data';
import type { Def } from '../sys/lifeevents10';
import { SW33, addRep33, vida33 } from './vida33';
import { sw } from '../r31/switches';

const on = (e: { s: Parameters<typeof sw>[0] }): boolean => !!sw<boolean>(e.s, SW33.rep);

export const SCANDAL33: Def = {
  id: 'r33_scandal', name: l('Escândalo na imprensa', 'Press scandal'), cool: 18,
  w: (e) => (on(e) && e.fame > 25 ? 0.3 + (e.stress > 65 ? 0.4 : 0) + (vida33(e.s).papWeek !== undefined && e.s.week - (vida33(e.s).papWeek ?? 0) < 8 ? 0.6 : 0) : 0),
  text: T('Uma foto sua em má hora vaza para os jornais. Todo mundo no setor comenta.', 'A bad-timing photo of you leaks to the papers. Everyone in the business is talking.'),
  def: 'silence', ch: [
    C('apologize', 'Pedir desculpas em público', 'Apologize in public', { st: 2, ins: 1 }, 'O pedido de desculpas amansa a imprensa; a história morre em uma semana.', 'The apology calms the press; the story dies in a week.',
      { dyn: (s) => { addRep33(s, -3); return {}; } }),
    C('donate', 'Doar para uma causa e deixar passar', 'Donate to a cause and let it pass', { w: -3000, st: -1 }, 'A doação vira notícia melhor que o escândalo.', 'The donation makes better news than the scandal.',
      { dyn: (s) => { addRep33(s, -1); return {}; } }),
    C('deny', 'Negar tudo e processar o jornal', 'Deny it all and sue the paper', { cash: -2000, ins: -2, st: 3 }, 'A briga rende mais manchetes; a imagem pessoal sofre.', 'The fight earns more headlines; your public image suffers.',
      { dyn: (s) => { addRep33(s, -9); return {}; } }),
    C('silence', 'Ficar quieto', 'Stay quiet', { st: 3 }, 'O silêncio deixa o boato crescer um pouco.', 'Silence lets the rumor grow a little.',
      { dyn: (s) => { addRep33(s, -6); return {}; } }),
  ],
};
if (!EVENTS.some((x) => x.id === SCANDAL33.id)) EVENTS.push(SCANDAL33);
