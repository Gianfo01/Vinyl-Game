// R33 · POL33-A — polimento da 33 (parte A). Interruptores `exp33.pol.*`:
//  · `exp33.pol.crop` (ligado): interiores antigos com o mesmo enquadramento dos novos (sem o céu e a rua em volta) — só pintura;
//  · `exp33.pol.outdoors` (ligado): outdoors espalhados, aluguel e compra, rádio e TV (ver outdoor33.ts);
//  · `exp33.pol.merch` (ligado): merch e itens exclusivos pelas relíquias e as ideias da lista (ver merch33.ts).
import { l } from '../../data/world';
import type { GameState } from '../types';
import { registerSwitch, sw } from '../r31/switches';

registerSwitch({
  id: 'exp33.pol.crop', def: true, scope: 'game',
  desc: l('R33 POL · interiores antigos com o enquadramento dos novos (sem céu e rua em volta). Só pintura.',
    'R33 POL · old interiors framed like the new ones (no sky and street around). Painting only.'),
});
export const polCropOn = (s: GameState): boolean => sw<boolean>(s, 'exp33.pol.crop');
