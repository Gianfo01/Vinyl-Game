// R31 · onda 4 (VIT) — A VITRINE DO MÊS DENTRO DA CENA (modelo PURO, sem DOM). Lê o motor (sim/r31/vitrine31) e diz:
//   vitScene31(s, x)     — o que entra no interior: itens na prateleira do mês e pessoas (encontros) na cena;
//   vitSpots31(s, x, W)  — os pontos clicáveis (a mesma caixa da pintura), com o motivo do bloqueio na dica;
//   vitPeople31(s, x)    — os encontros como gente desenhada (clique abre o painel do item);
//   vitPanel31(s, id)    — o painel rápido: o que é, por que está aqui, quanto tempo fica, botões com o motivo.
// Montar tudo isso só LÊ: nada é criado, nenhum sorteio, nenhuma transação (os testes conferem).

import { l, type L } from '../../data/world';
import type { GameState } from '../../sim/types';
import { fmtL, playerActs } from '../../sim/util';
import type { Person27 } from '../../sim/sys/place27';
import { nameOfKey18 } from '../../sim/sys/agency18';
import { fairName31, vitItem31, vitItems31, vitView31, type VitBtn31, type VitItem31, type VitPlace31 } from '../../sim/r31/vitrine31';
import { geom27 } from '../pixel/interior27';
import { vitBox31, type VitPx31 } from '../pixel/vit31px';
import type { G31 } from '../pixel/props31';
import type { Spot31 } from './scene31model';
import type { InsideT31 } from './inside31model';

/** Quais vitrines um interior mostra (a feira é um lugar próprio dentro da loja de discos). */
export function vitPlacesOf31(x: Pick<InsideT31, 'k' | 'vit'>): VitPlace31[] {
  if (x.vit) return [x.vit as VitPlace31];
  const k = x.k as string;
  return k === 'records' || k === 'instruments' || k === 'venue' || k === 'bar' || k === 'studio' || k === 'radio' || k === 'hotel' || k === 'label' || k === 'market' ? [k as VitPlace31] : [];
}

export const VIT_SHELF_MAX31 = 7, VIT_PEOPLE_MAX31 = 3;

/** Itens do mês deste interior: prateleira (objetos) e encontros (gente). */
export function vitScene31(s: GameState, x: Pick<InsideT31, 'k' | 'vit'>): { shelf: VitItem31[]; people: VitItem31[]; all: VitItem31[] } {
  const all = vitPlacesOf31(x).flatMap((p) => vitItems31(s, p));
  const art = (it: VitItem31) => vitView31(s, it).art;
  return { shelf: all.filter((it) => art(it) !== 'person').slice(0, VIT_SHELF_MAX31), people: all.filter((it) => art(it) === 'person').slice(0, VIT_PEOPLE_MAX31), all };
}

/** O item é "seu" (seu disco, seu artista). */
export function vitMine31(s: GameState, it: VitItem31): boolean {
  const mine = new Set(playerActs(s));
  return (!!it.ref.rel && s.releases[it.ref.rel]?.owner === 'player') || (!!it.ref.act && mine.has(it.ref.act));
}

/** O que a pintura recebe. */
export function vitPx31(s: GameState, x: Pick<InsideT31, 'k' | 'vit'>): VitPx31[] {
  return vitScene31(s, x).shelf.map((it) => ({ art: vitView31(s, it).art, rare: !!it.rare, mine: vitMine31(s, it) }));
}

/** Motivo de bloqueio da ação principal (antes do clique). */
const mainLock = (bs: VitBtn31[]): L | null => { const m = bs.find((b) => b.main) ?? bs[0]; return m?.lock ?? null; };

/** Pontos da prateleira + a porta da feira (na loja de discos). */
export function vitSpots31(s: GameState, x: Pick<InsideT31, 'k' | 'vit' | 'year'>, W: number): Spot31[] {
  const G = geom27(W) as G31;
  const sc = vitScene31(s, x);
  const out: Spot31[] = sc.shelf.map((it, i) => {
    const v = vitView31(s, it);
    const b = vitBox31(i, sc.shelf.length, G);
    const lk = mainLock(v.btns);
    return { id: `vit:${it.id}`, x: b.x - 1, y: b.y - 1, w: b.w + 2, h: b.h + 3, label: v.name,
      tip: lk ? fmtL(l('{t} 🔒 {w}', '{t} 🔒 {w}'), { t: v.note, w: lk }) : v.note, go: { panel: `vit:${it.id}` }, quiet: true,
      badge: vitMine31(s, it) ? { text: l('seu', 'yours'), level: 'info', sym: '★' } : it.rare ? { text: l('raro · só este mês', 'rare · this month only'), level: 'soon', sym: '✦' } : undefined };
  });
  if (x.k === 'records' && !x.vit) {
    const n = vitItems31(s, 'fair').length;
    out.push({ id: 'vit:fair', x: G.X(0.9) - 9, y: G.fy - 30, w: 18, h: 30, label: l('Feira dos fundos', 'Fair out back'),
      tip: fmtL(l('A {f} do mês nos fundos da loja ({n} banca(s)).', 'This month\'s {f} behind the shop ({n} stall(s)).'), { f: fairName31(x.year), n }), go: { panel: 'room:fair' }, badge: n ? { text: fmtL(l('{n} no mês', '{n} this month'), { n }), level: 'info' } : undefined });
  }
  if (x.vit === 'fair') out.push({ id: 'vit:back', x: G.X(0.04), y: G.fy - 30, w: 18, h: 30, label: l('Voltar à loja', 'Back to the shop'), tip: l('Sair da feira e voltar para a loja de discos.', 'Leave the fair and go back to the record shop.'), go: { panel: 'room:leave' } });
  if (sc.all.length) out.push({ id: 'vit:list', x: G.X(0.5) - 20, y: G.y0 + 2, w: 40, h: 10, label: l('Vitrine do mês', 'Showcase of the month'),
    tip: fmtL(l('Tudo o que o lugar tem neste mês ({n}), como lista.', 'Everything the place has this month ({n}), as a list.'), { n: sc.all.length }), go: { panel: 'vitlist' } });
  return out;
}

/** Encontros como gente na cena (pessoa real da agenda; clique abre o painel do item). */
export function vitPeople31(s: GameState, x: Pick<InsideT31, 'k' | 'vit'>): Person27[] {
  return vitScene31(s, x).people.map((it) => {
    const v = vitView31(s, it);
    const pid = it.ref.pid ?? (it.ref.act ? s.acts[it.ref.act]?.members.find((m) => s.persons[m]?.alive) : undefined);
    const name = pid && s.persons[pid] ? s.persons[pid].name : it.ref.key ? (it.ref.key.startsWith('c:') ? it.ref.key.slice(2) : nameOfKey18(s, it.ref.key)) : v.name.pt;
    return { name, role: v.name, pid, key: it.ref.key, actId: it.ref.act, vit: it.id, mine: vitMine31(s, it) };
  });
}

export interface VitPanel31 { id: string; title: L; note: L; meta: L[]; btns: VitBtn31[] }
/** Painel rápido do item. */
export function vitPanel31(s: GameState, id: string): VitPanel31 | null {
  const it = vitItem31(s, id);
  if (!it) return null;
  const v = vitView31(s, it);
  const meta: L[] = [];
  meta.push(v.src === 'stock' ? l('Estoque do mês (troca inteiro na virada).', 'This month\'s stock (fully replaced at the month turn).')
    : v.rare ? l('✦ Raro: só neste mês — no mês que vem pode ter sumido.', '✦ Rare: this month only — next month it may be gone.')
      : v.left > 0 ? fmtL(l('Fica mais {n} mês(es).', 'Stays {n} more month(s).'), { n: v.left }) : l('Só neste mês.', 'This month only.'));
  meta.push(v.src === 'people' ? l('Encontro: gente de verdade da agenda da cidade.', 'Encounter: real people from the city\'s agenda.')
    : v.src === 'world' ? l('Reflexo do mundo: paradas, falências, mortes e modas.', 'Mirror of the world: charts, bankruptcies, deaths and crazes.')
      : v.src === 'rare' ? l('Raridade da época e do porte do lugar.', 'A rarity of the era and of the place\'s size.') : l('Da loja/beco/leilão (mesma fonte de sempre).', 'From the shop/alley/auction (the same source as ever).'));
  return { id, title: v.name, note: v.note, meta, btns: v.btns };
}

/** Linhas da lista ("Ver como lista"): todos os itens do mês dos lugares deste interior. */
export function vitList31(s: GameState, x: Pick<InsideT31, 'k' | 'vit'>): VitPanel31[] {
  return vitScene31(s, x).all.map((it) => vitPanel31(s, it.id)).filter((p): p is VitPanel31 => !!p);
}
