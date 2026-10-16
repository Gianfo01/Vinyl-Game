// R31 · onda 5 (TRN, EXP-11) — interruptores das transições entre telas. Como o 'exp5.ini', o valor mora no navegador
// (preferência de interface, fora do save): ligar/desligar ou trocar o modo nunca mexe no mundo. O editor lista os dois;
// a tela de Opções mostra só o modo (completas / rápidas / desligadas).
import { l } from '../../data/world';
import { registerEditable } from './editor';
import { registerSwitch, setSw, setSwUi, sw, swUi } from './switches';

/** Modos que o jogador escolhe nas Opções. */
export const TRN_MODES31 = ['full', 'fast', 'off'] as const;
export type TrnMode31 = (typeof TRN_MODES31)[number];

registerSwitch({
  id: 'exp5.trn', def: true, scope: 'prod',
  desc: l('Onda 5 · transições entre telas (cortina de viagem, zoom nos objetos da sede, passagem, virada do mês). Desligado: troca direta.',
    'Wave 5 · screen transitions (travel curtain, HQ object zoom, ticket, month turn). Off: direct switch.'),
  read: () => swUi<boolean>('exp5.trn'),
  write: (_s, v) => setSwUi('exp5.trn', !!v),
});
registerSwitch({
  id: 'exp5.trn.mode', def: 'full', scope: 'game',
  desc: l('Transições: completas, rápidas (metade do tempo) ou desligadas.', 'Transitions: full, fast (half the time) or off.'),
  read: () => trnMode31(),
  write: (_s, v) => setSwUi('exp5.trn.mode', (TRN_MODES31 as readonly string[]).includes(String(v)) ? String(v) : 'full'),
});

/** Modo pedido pelo jogador (valor desconhecido vale 'full'). */
export function trnMode31(): TrnMode31 {
  const v = swUi<string>('exp5.trn.mode');
  return (TRN_MODES31 as readonly string[]).includes(v) ? (v as TrnMode31) : 'full';
}
/** Transições ligadas no interruptor da onda 5? */
export const trnOn31 = (): boolean => swUi<boolean>('exp5.trn');

registerEditable({
  id: 'sw.exp5.trn', area: 'tools', kind: 'bool', label: l('Onda 5 · transições entre telas', 'Wave 5 · screen transitions'), raw: true,
  get: (s) => sw<boolean>(s, 'exp5.trn'),
  set: (s, v) => { setSw(s, 'exp5.trn', !!v); },
});
registerEditable({
  id: 'sw.exp5.trn.mode', area: 'tools', kind: 'select', label: l('Transições (modo)', 'Transitions (mode)'), raw: true,
  options: () => [
    { value: 'full', label: l('Completas', 'Full') }, { value: 'fast', label: l('Rápidas', 'Fast') }, { value: 'off', label: l('Desligadas', 'Off') }],
  get: (s) => sw<string>(s, 'exp5.trn.mode'),
  set: (s, v) => { setSw(s, 'exp5.trn.mode', String(v)); },
});
