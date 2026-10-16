// R31 · onda 5 (INI) — interruptor 'exp5.ini' no editor dentro da partida (regra 10). O valor vale para o navegador
// (tela inicial e nova run acontecem antes da partida): o editor só liga/desliga a preferência, sem tocar no mundo.
import { registerEditable } from './editor';
import { switchDef, sw, setSw } from './switches';

const d = switchDef('exp5.ini')!;
registerEditable({
  id: 'sw.exp5.ini', area: 'tools', kind: 'bool', label: d.desc, raw: true,
  get: (s) => sw<boolean>(s, 'exp5.ini'),
  set: (s, v) => { setSw(s, 'exp5.ini', !!v); },
});
