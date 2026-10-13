// Rodada 29 (WIKI) — porta de entrada leve (vai no pacote principal). A wiki em si (textos, catálogo, interface) é
// carregada sob demanda por import() na primeira abertura, para o pacote principal quase não crescer.
// Abre por: botão "Wiki" na barra de utilidades (ao lado de Índice e Campanha), Ctrl+K, "Ver na wiki" no menu de contexto
// e pelo endereço #/wiki ou #/wiki/<tipo>/<id> (também na tela de título, sem partida: catálogo real).

import type { GameState } from '../../sim/types';
import type { Target29 } from '../ps/route29model';

export interface WikiApi29 {
  game: () => GameState | null;
  /** abre uma página do jogo pelo mesmo caminho do menu (fecha a wiki antes) */
  open?: (x: Target29) => void;
}
export const WIKI29: { api: WikiApi29 } = { api: { game: () => null } };
export function bindWiki29(a: WikiApi29): void { WIKI29.api = a; }

let loading: Promise<typeof import('./wiki29')> | null = null;
/** Abre a wiki num artigo (id "tipo:id"; vazio = início) ou já com uma busca. */
export function openWiki29(id = 'home', q = ''): void {
  loading ??= import('./wiki29');
  void loading.then((m) => m.showWiki29(id, q));
}

/** Id da wiki para uma entidade do menu de contexto (ent27). */
export function wikiIdOfEnt29(ent: string, id: string): string {
  if (ent === 'act') return `act:${id}`;
  if (ent === 'label') return `label:${id}`;
  if (ent === 'city') return `city:${id}`;
  if (ent === 'org') return `org:${id}`;
  if (ent === 'genre') return `genre:${id}`;
  if (ent === 'relic') return `relic:${id}`;
  if (ent === 'venue') return `venue:${id}`;
  if (ent === 'person') {
    if (id.startsWith('p:')) return `person:${id.slice(2)}`;
    if (id.startsWith('pd:')) return `prod:${id.slice(3)}`;
    if (id.startsWith('e:')) return `mgr:${id.slice(2)}`;
    if (id === 'player') { const g = WIKI29.api.game(); const me = g && Object.values(g.persons).find((p) => p.isPlayer); return me ? `person:${me.id}` : 'home'; }
    return `person:${id}`;
  }
  return 'home';
}

/** Liga o endereço #/wiki… (chamado uma vez no boot). */
export function initWikiHash29(): void {
  if (typeof window === 'undefined') return;
  const check = () => { if (/^#\/wiki(\/|$)/.test(location.hash)) openWiki29(location.hash); };
  window.addEventListener('hashchange', check);
  setTimeout(check, 400);
}
