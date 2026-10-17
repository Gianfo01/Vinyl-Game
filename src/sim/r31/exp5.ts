// R31 · onda 5 (TEC) — interruptor da navegação nova (`exp5.nav`, DESLIGADO) e o BOLSO (`pocket5`).
// O bolso é a barrinha fixa com até 8 objetos fixados pelo jogador (substitui os "Fixados" do menu, que hoje ficam no
// navegador). Fica no save porque é escolha da partida; não mexe no mundo (nada de sorteio, dinheiro ou pessoas).
// Os ids são de objetos da onda 5 (src/ui/r31/objects5.ts); a simulação não conhece a interface, então quem valida o
// id é a camada de navegação (src/ui/r31/nav5.ts). Aqui só a regra: sem repetir, no máximo 8, mais novo no fim.

import { l, type L } from '../../data/world';
import { registerExt4 } from '../ext4';
import type { GameState } from '../types';
import { registerEditable } from './editor';
import { registerSwitch, setSw, sw } from './switches';

export const SW_NAV5 = 'exp5.nav';
registerSwitch({
  // build de teste do dono: VITE_EXP5NAV=1 liga por padrão nas partidas novas (o padrão do código continua desligado)
  id: SW_NAV5, def: (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_EXP5NAV === '1', scope: 'game',
  desc: l('Onda 5 · navegação nova (em construção): teclas por objeto (E caixa de entrada, G agenda, H sede, Shift+1…4 viagem), "ir até lá" e bolso. Desligado: tudo como antes.',
    'Wave 5 · new navigation (in progress): one key per object (E inbox, G planner, H HQ, Shift+1…4 travel), "go there" and pocket. Off: everything as before.'),
});
export const nav5On = (s: GameState): boolean => sw<boolean>(s, SW_NAV5);
registerEditable({ id: `sw.${SW_NAV5}`, area: 'tools', label: l('Onda 5 · navegação nova (teclas, ir até lá, bolso)', 'Wave 5 · new navigation (keys, go there, pocket)'), kind: 'bool',
  get: (s) => nav5On(s), set: (s, v) => { setSw(s, SW_NAV5, !!v); } });

// ---------------------------------------------------------------- bolso

export const POCKET_MAX5 = 8;
export interface Pocket5 { ids: string[] }
declare module '../ext4' { interface Ext4 { pocket5: Pocket5 } }
registerExt4('pocket5', () => ({ ids: [] }));

export function pocket5(s: GameState): Pocket5 {
  const x = ((s as unknown as { x4?: Record<string, unknown> }).x4 ??= {});
  const p = (x.pocket5 ??= { ids: [] }) as Pocket5;
  if (!Array.isArray(p.ids)) p.ids = [];
  return p;
}
export const pocketIds5 = (s: GameState): string[] => [...pocket5(s).ids];

/** Fixa um objeto no bolso. Recusa (com o motivo) repetido ou bolso cheio. */
export function pocketAdd5(s: GameState, id: string): L | undefined {
  const p = pocket5(s);
  if (!id) return l('Objeto desconhecido.', 'Unknown object.');
  if (p.ids.includes(id)) return l('Esse objeto já está no bolso.', 'That object is already in the pocket.');
  if (p.ids.length >= POCKET_MAX5) return l('O bolso está cheio (8). Tire um objeto antes.', 'The pocket is full (8). Remove an object first.');
  p.ids.push(id);
  return undefined;
}
export function pocketRemove5(s: GameState, id: string): void {
  const p = pocket5(s);
  p.ids = p.ids.filter((x) => x !== id);
}
/** Fixa ou tira (o botão "+ fixar" / "tirar do bolso"). Devolve o motivo quando não deu para fixar. */
export function pocketToggle5(s: GameState, id: string): L | undefined {
  if (pocket5(s).ids.includes(id)) { pocketRemove5(s, id); return undefined; }
  return pocketAdd5(s, id);
}
/** Muda a posição de um objeto no bolso (arrastar). */
export function pocketMove5(s: GameState, id: string, to: number): void {
  const p = pocket5(s);
  const i = p.ids.indexOf(id);
  if (i < 0) return;
  p.ids.splice(i, 1);
  p.ids.splice(Math.max(0, Math.min(to, p.ids.length)), 0, id);
}
/** Tira ids que não existem mais (objeto removido numa versão nova). Quem chama passa o teste de existência. */
export function pocketClean5(s: GameState, exists: (id: string) => boolean): void {
  const p = pocket5(s);
  p.ids = p.ids.filter(exists).slice(0, POCKET_MAX5);
}
