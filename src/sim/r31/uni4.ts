// R31 · UNI-4 — interruptor das LIGAÇÕES novas criadas pelas fusões da onda 4 (registro em uni4sw.ts, carregado por
// r31/index no fim de sys/index; aqui só a leitura, para os sistemas importarem sem ciclo de carga).
// As fusões (cidade, segredos, festival, casa de shows, turnê, empresário, rivais) trocam depósitos duplicados por
// uma fonte só; isso não tem "desligado" (os módulos antigos foram apagados). O que é REGRA nova e econômica fica atrás
// do interruptor 'uni4.links', para medir ligado/desligado:
//   • estilo em alta do estúdio (studio12.hotStyle) puxado pelas paradas (trends17) — desligado: sorteio a cada 3 anos;
//   • sua rádio é uma estação do mercado (radio18) e toca seus discos — desligado: a rádio própria não dá execução;
//   • sua plataforma é fonte de descoberta (stream18) — desligado: só rende assinatura;
//   • segredos da Intriga e trunfos do livro vazam pela camada única (secrets23) — desligado: ficam com quem os descobriu.
import { switchDef, sw } from './switches';
import type { GameState } from '../types';

export const uni4On = (s: GameState): boolean => (switchDef('uni4.links') ? sw<boolean>(s, 'uni4.links') : true);
