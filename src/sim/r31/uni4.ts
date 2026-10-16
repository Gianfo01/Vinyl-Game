// R31 · UNI-4 — interruptor das LIGAÇÕES novas criadas pelas fusões da onda 4.
// As fusões (cidade, segredos, festival, casa de shows, turnê, empresário, rivais) trocam depósitos duplicados por
// uma fonte só; isso não tem "desligado" (os módulos antigos foram apagados). O que é REGRA nova e econômica fica atrás
// deste interruptor, para medir ligado/desligado:
//   • estilo em alta do estúdio (studio12.hotStyle) puxado pelas paradas (trends17) — desligado: sorteio a cada 3 anos;
//   • sua rádio é uma estação do mercado (radio18) e toca seus discos — desligado: a rádio própria não dá execução;
//   • sua plataforma é fonte de descoberta (stream18) — desligado: só rende assinatura;
//   • segredos da Intriga vazam pela camada única (secrets23) — desligado: ficam só com quem os descobriu.
import { l } from '../../data/world';
import { registerSwitch, sw } from './switches';
import type { GameState } from '../types';

registerSwitch({
  id: 'uni4.links', def: true, scope: 'game',
  desc: l('Ligações da onda 4: estilo em alta pelas paradas, sua rádio e sua plataforma no mercado, segredos da intriga podem vazar.',
    'Wave 4 links: hot style from the charts, your radio and platform in the market, intrigue secrets can leak.'),
});

export const uni4On = (s: GameState): boolean => sw<boolean>(s, 'uni4.links');
