// R33 · INTRO33 — interruptor 'exp33.intro' (ligado por padrão): a rua que atravessa as épocas no fundo da tela inicial
// e a intro curta ao começar uma partida. Desligado, a tela inicial é a de antes (palco com vitrine de épocas) e a
// partida começa direto. Como o 'exp5.ini', o valor mora no navegador (a tela inicial vem antes da partida).
import { l } from '../../data/world';
import { registerEditable } from '../r31/editor';
import { registerSwitch, setSw, setSwUi, sw, swUi } from '../r31/switches';

registerSwitch({
  id: 'exp33.intro', def: true, scope: 'prod',
  desc: l('R33 · intro ao começar a partida (desligado: início direto).',
    'R33 · an intro when a run starts (off: a direct start).'),
  read: () => swUi<boolean>('exp33.intro'),
  write: (_s, v) => setSwUi('exp33.intro', !!v),
});
/** Rua animada e intro ligadas? (interruptor `exp33.intro`, padrão ligado) */
export const intro33On = (): boolean => swUi<boolean>('exp33.intro');
export const setIntro33 = (v: boolean): void => setSwUi('exp33.intro', v);

registerEditable({
  id: 'sw.exp33.intro', area: 'tools', kind: 'bool', label: l('R33 · intro da partida', 'R33 · run intro'), raw: true,
  get: (s) => sw<boolean>(s, 'exp33.intro'),
  set: (s, v) => { setSw(s, 'exp33.intro', !!v); },
});
