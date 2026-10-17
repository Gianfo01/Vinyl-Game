// R33 · CATÁLOGO — base comum das cinco mecânicas da frente (docs/r33/catalogo.md). Cada mecânica tem o seu interruptor
// `exp33.*` (padrão DESLIGADO). O estado só nasce quando alguma delas roda ligada (nada de registerExt4: o save de uma
// partida com tudo desligado fica idêntico ao de hoje) e os sorteios usam fluxos próprios por chave, sem tocar no rng
// do mês — desligado = mesmo jogo, mesmos goldens.

import { Rng } from '../../core/rng';
import { l, type L } from '../../data/world';
import { registerEditable } from '../r31/editor';
import { registerSwitch, setSw, sw } from '../r31/switches';
import type { GameState } from '../types';

export type Sw33 = 'exp33.relics' | 'exp33.sampling' | 'exp33.resurface' | 'exp33.chain' | 'exp33.formats';

const DEFS33: [Sw33, L, L][] = [
  ['exp33.relics', l('Relíquias com efeito musical pequeno (estúdio), notícia na imprensa e uso como garantia de empréstimo.', 'Relics with a small musical effect (studio), press coverage and use as loan collateral.'),
    l('V33 · relíquias: efeito no estúdio, imprensa e garantia', 'V33 · relics: studio effect, press and collateral')],
  ['exp33.sampling', l('Pedidos de sample e regravação do seu catálogo: liberar rende; negar pode virar processo.', 'Sample and cover requests for your catalog: clearing pays; refusing may become a lawsuit.'),
    l('V33 · pedidos de sample e regravação', 'V33 · sample and cover requests')],
  ['exp33.resurface', l('Catálogo que reaparece em filme, novela, comercial e vídeo curto: cachê de sincronização e calor de sucesso tardio.', 'Catalog resurfacing in films, soap operas, ads and short videos: sync fee and late-hit heat.'),
    l('V33 · catálogo que reaparece', 'V33 · catalog resurfacing')],
  ['exp33.chain', l('Royalties em cadeia: versões de outros selos das suas composições pagam a sua editora; extrato por elo (compositor, editora, intérprete, produtor).', 'Chain royalties: other labels\' versions of your songs pay your publisher; statement by link (writer, publisher, performer, producer).'),
    l('V33 · royalties em cadeia', 'V33 · chain royalties')],
  ['exp33.formats', l('Ciclos de formato: o vinil morre e volta, o cassete e o CD morrem; disco no formato errado vende menos.', 'Format cycles: vinyl dies and returns, cassette and CD die; a record in the wrong format sells less.'),
    l('V33 · ciclos de formato', 'V33 · format cycles')],
];
for (const [id, desc, label] of DEFS33) {
  registerSwitch({ id, def: true, scope: 'game', desc });
  registerEditable({ id: `sw.${id}`, area: 'tools', label, kind: 'bool', get: (s) => sw<boolean>(s, id), set: (s, v) => { setSw(s, id, !!v); } });
}
export const on33 = (s: GameState, id: Sw33): boolean => sw<boolean>(s, id);

/** Estado da frente (nasce na primeira escrita). */
export interface Cat33 {
  /** relíquias: já saíram na imprensa · empenhadas (garantia) */
  press: Record<string, 1>;
  pledge: Record<string, { to: string; w: number; v: number }>;
  /** sampling: pedidos, processos, revivals curtos de master sampleado */
  req: Req33[];
  cases: Case33[];
  boost: Record<string, number>;
  /** catálogo que reaparece: usos recentes (vitrine) */
  rs: Resurf33[];
  /** cadeia: receita já vista por lançamento de terceiro (delta mensal) e total recebido por ano */
  seen: Record<string, number>;
  chainY: Record<number, number>;
  /** cadeia: versões liberadas (sample/regravação) que pagam a sua editora até a semana `until` */
  lic: { song: string; by: string; kind: 'sample' | 'cover'; share: number; until: number }[];
  /** formatos: viradas já noticiadas */
  fmt: Record<string, number>;
  seq: number;
  log: [number, L][];
}
export interface Req33 { id: string; kind: 'sample' | 'cover'; song: string; rel: string; by: string; fee: number; until: number; st: 'open' | 'ok' | 'denied' }
export interface Case33 { id: string; kind: 'sample' | 'cover'; song: string; vs: string; stake: number; since: number; st: 'open' | 'settled' | 'won' | 'lost' | 'dropped'; res?: L }
export interface Resurf33 { rel: string; k: 'film' | 'novela' | 'tv_ad' | 'short' | 'series' | 'tribute'; name: L; w: number; fee: number }

const fresh33 = (): Cat33 => ({ press: {}, pledge: {}, req: [], cases: [], boost: {}, rs: [], seen: {}, chainY: {}, lic: [], fmt: {}, seq: 0, log: [] });
export function cat33(s: GameState): Cat33 {
  const x = ((s as unknown as { x4?: Record<string, unknown> }).x4 ??= {});
  const st = (x.cat33 ??= fresh33()) as Cat33;
  for (const [k, v] of Object.entries(fresh33())) (st as unknown as Record<string, unknown>)[k] ??= v;
  return st;
}
/** Leitura sem criar (interface, ganchos de outras frentes). */
export const peek33 = (s: GameState): Cat33 | undefined => (s as unknown as { x4?: { cat33?: Cat33 } }).x4?.cat33;
export const rng33 = (s: GameState, tag: string): Rng => Rng.fromSeed(`${s.config.seed}|exp33|${tag}|${s.year}|${s.month}`);
export const id33 = (st: Cat33, p: string): string => `${p}${(++st.seq).toString(36)}`;
export function log33(s: GameState, t: L): void { const st = cat33(s); st.log.unshift([s.week, t]); if (st.log.length > 30) st.log.length = 30; }
