// Rodada 17 — catálogo único de veículos de imprensa por ano (módulo puro: só dados). Junta os veículos de
// content.ts (revistas, TV, rádio, web), os regionais da rodada 8 (critics8) e os novos de data/media17
// (tabloides, TV de massa, rádio, fanzines e redes sociais por era), com linha editorial, alcance,
// credibilidade, posição política e dono. Os veículos do jogador (media12) entram em sys/media17.

import { hashString } from '../core/rng';
import { OUTLETS, type OutletDef } from '../data/content';
import { REGIONAL_CRITICS } from '../data/critics8';
import { OUTLETS17, type OKind, type OLine } from '../data/media17';
import { l, type L, type MarketId } from '../data/world';
import type { GameState } from './types';
import { fmtL } from './util';

export interface O17 { id: string; name: string; real?: string; kind: OKind; market: MarketId | 'global'; line: OLine; reach: number; cred: number; stance: number; fav: string[]; owner?: string; desc?: L; mine?: 1 }

export const KIND17: Record<OKind, L> = {
  tabloid: l('Tabloide', 'Tabloid'), magazine: l('Revista', 'Magazine'), newspaper: l('Jornal', 'Newspaper'), trade: l('Revista do setor', 'Trade paper'),
  radio: l('Rádio', 'Radio'), tv: l('TV', 'TV'), blog: l('Site/blog', 'Website/blog'), social: l('Rede social', 'Social network'), fanzine: l('Fanzine', 'Fanzine'),
};
export const LINE17: Record<OLine, [L, L]> = {
  tabloid: [l('Fofoca e escândalo', 'Gossip and scandal'), l('Publica quase qualquer coisa; boato pesa pouco por veículo, mas corre rápido.', 'Prints almost anything; each rumor weighs little but runs fast.')],
  serious: [l('Jornalismo sério', 'Serious journalism'), l('Checa antes; o que sai aqui vira "fato" e pesa muito.', 'Checks first; what it prints becomes "fact" and weighs a lot.')],
  trade: [l('Mercado e números', 'Business and numbers'), l('Paradas, contratos e bastidores do setor.', 'Charts, deals and industry backstage.')],
  mainstream: [l('Grande público', 'Mass audience'), l('Alcance enorme, crítica branda.', 'Huge reach, soft criticism.')],
  underground: [l('Cena e vanguarda', 'Scene and avant-garde'), l('Pequeno, mas quem lê forma opinião.', 'Small, but its readers are tastemakers.')],
  fan: [l('Fãs e redes', 'Fans and networks'), l('Ninguém checa nada; tudo vira tendência.', 'Nobody checks anything; everything trends.')],
};

const kindOf = (k: OutletDef['kind']): OKind => k === 'tv_show' ? 'tv' : k === 'radio_show' || k === 'podcast' ? 'radio' : k === 'web' || k === 'newsletter' ? 'blog' : k === 'neural_feed' ? 'social' : k === 'newspaper' ? 'newspaper' : 'magazine';
function fromContent(x: OutletDef): O17 {
  const b = x.bias;
  const line: OLine = x.id === 'worldsound_weekly' ? 'trade' : x.id === 'ondas_astros' || x.id === 'stan_feed' ? (x.id === 'stan_feed' ? 'fan' : 'tabloid') : b.mainstream <= -0.5 ? 'underground' : b.mainstream >= 0.7 ? 'mainstream' : 'serious';
  return { id: x.id, name: x.name, real: x.realRef, kind: x.id === 'worldsound_weekly' ? 'trade' : kindOf(x.kind), market: x.market, line, reach: Math.round(Math.max(10, Math.min(95, (x.market === 'global' ? 60 : 45) + b.mainstream * 25))), cred: b.prestige, stance: b.mainstream > 0.6 ? 0.2 : -0.2, fav: b.favored, desc: x.desc };
}

let memo: { y: number; list: O17[] } | null = null;
/** Veículos ativos no ano (sem os do jogador). */
export function outletsIn(year: number): O17[] {
  if (memo?.y === year) return memo.list;
  const out: O17[] = [];
  const names = new Set<string>();
  for (const x of OUTLETS17) if (x.from <= year && x.to >= year) { out.push({ id: x.id, name: x.name, real: x.real, kind: x.kind, market: x.market, line: x.line, reach: x.reach, cred: x.cred, stance: x.stance, fav: x.fav, owner: x.owner, desc: x.desc }); names.add(x.name); }
  for (const x of OUTLETS) if (x.start <= year && (x.end ?? 2100) >= year && !names.has(x.name)) { out.push(fromContent(x)); names.add(x.name); }
  for (const c of REGIONAL_CRITICS) if (c.from <= year && c.to >= year && !names.has(c.outlet)) {
    names.add(c.outlet);
    out.push({ id: `rg:${c.outlet}`, name: c.outlet, real: c.realRef, kind: 'magazine', market: c.region, line: c.mainstream <= -0.4 ? 'underground' : c.mainstream >= 0.6 ? 'mainstream' : 'serious', reach: Math.round(30 + c.mainstream * 15), cred: c.prestige, stance: 0, fav: c.favors });
  }
  memo = { y: year, list: out };
  return out;
}
export const outletName = (x: O17): string => x.real ? `${x.name} (≈ ${x.real})` : x.name;

/** Escolha determinística de um veículo que combine com o assunto (boato → tabloide/rede; fato sério → jornal). */
export function pickOutlet(list: O17[], seed: string, want: OLine[], market?: MarketId, fam?: string): O17 | undefined {
  const pool = list.filter((o) => want.includes(o.line) && (!market || o.market === market || o.market === 'global'));
  const p = pool.length ? pool : list.filter((o) => !market || o.market === market || o.market === 'global');
  const q = p.length ? p : list;
  if (!q.length) return undefined;
  // pesa por alcance, pela ordem da linha pedida e pelo gosto do veículo (revista de jazz não noticia o hit de rock)
  const w = (o: O17) => o.reach * (1 + Math.max(0, want.length - want.indexOf(o.line) - 1) * 0.6) * (!fam ? 1 : o.fav.includes(fam) ? 2.5 : o.fav.length ? 0.35 : 1);
  const tot = q.reduce((t, o) => t + w(o), 0);
  let x = (hashString(seed) % 10000) / 10000 * tot;
  for (const o of q) { x -= w(o); if (x <= 0) return o; }
  return q[q.length - 1];
}

/** Texto curto de cobertura de imprensa (para o hype "imprensa cobrindo"), variando por veículo e era. */
export function pressLine17(s: GameState, actName: string, market: MarketId | undefined, seed: string): L {
  const o = pickOutlet(outletsIn(s.year), seed, ['mainstream', 'serious', 'tabloid', 'fan'], market);
  if (!o) return l('Imprensa cobrindo', 'Press coverage');
  const T: Record<OKind, L[]> = {
    tabloid: [l('Fofoca sobre {a} no {o}', 'Gossip about {a} in {o}'), l('Paparazzi do {o} atrás de {a}', '{o} paparazzi chasing {a}')],
    magazine: [l('Capa da {o}', 'Cover of {o}'), l('Perfil de {a} na {o}', 'Profile of {a} in {o}')],
    newspaper: [l('Matéria no {o}', 'Feature in {o}'), l('{a} no caderno de cultura do {o}', '{a} in the {o} arts section')],
    trade: [l('Números de {a} na {o}', '{a}\'s numbers in {o}'), l('{o} aposta em {a}', '{o} bets on {a}')],
    radio: [l('Entrevista na {o}', 'Interview on {o}'), l('{a} tocando sem parar na {o}', '{a} on heavy rotation on {o}')],
    tv: [l('{a} na {o}', '{a} on {o}'), l('Apresentação ao vivo na {o}', 'Live performance on {o}')],
    blog: [l('Post viral sobre {a} no {o}', 'Viral post about {a} on {o}'), l('{o} destrincha {a}', '{o} breaks down {a}')],
    social: [l('{a} nos assuntos do momento no {o}', '{a} trending on {o}'), l('Memes de {a} no {o}', '{a} memes on {o}')],
    fanzine: [l('Fanzine dedica edição a {a}', 'Fanzine devotes an issue to {a}'), l('{a} no {o}', '{a} in {o}')],
  };
  const arr = T[o.kind];
  return fmtL(arr[hashString(seed + 'x') % arr.length], { a: actName, o: o.name });
}
