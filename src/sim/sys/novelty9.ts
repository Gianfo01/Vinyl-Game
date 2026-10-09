// Novidades do ano (rodada 9): as telas não mostram nada do futuro, então o que passa a existir precisa
// chegar pelo noticiário. Na virada do ano, junta tudo o que nasceu desde a última checagem — festivais,
// gêneros, veículos e críticos, premiações nacionais, o Hall da Fama, negócios, instrumentos, divisões,
// bens à venda e artistas reais estreando — e publica: poucos itens viram avisos separados; muitos viram
// um único briefing "Novidades de {ano}". Não usa sorteio (o resultado não depende do passo da simulação).

import { FESTIVALS, MEDIA, MEDIA_REFS } from '../../data/catalog';
import { COUNTRY_INFO } from '../../data/countries';
import { GENRES, cityById, l, type L } from '../../data/world';
import { allCritics } from '../media';
import { registerExt4, registerSimHook } from '../ext4';
import type { GameState } from '../types';
import { fmtL, notify, remember } from '../util';
import { awardName } from './charts7';
import { DIVISIONS } from './creation/core';
import { GOODS } from './goods8';
import { INSTRUMENTS } from './instruments';
import { press } from './press9';
import { HALL_FOUNDED, hallName } from './rockhall9';
import { VKINDS } from './ventures9';

export interface Novelty9State { y: number }
declare module '../ext4' { interface Ext4 { nov9: Novelty9State } }
registerExt4('nov9', () => ({ y: -1 }));
const nov = (s: GameState): Novelty9State => {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  return (x.nov9 ??= { y: -1 }) as Novelty9State;
};

const inRange = (y: number | undefined, a: number, b: number) => y !== undefined && y > a && y <= b;
const city = (id: string): L => cityById[id]?.name ?? l(id, id);
const names = (xs: string[], max = 6): string => xs.length <= max ? xs.join(', ') : `${xs.slice(0, max).join(', ')} +${xs.length - max}`;

/** Tudo o que passou a existir em (from, to]. */
export function noveltiesBetween(s: GameState, from: number, to: number): L[] {
  const out: L[] = [];
  for (const f of FESTIVALS) if (inRange(f.start, from, to)) out.push(fmtL(l('Novo festival: {f} ({c}).', 'New festival: {f} ({c}).'), { f: f.name, c: city(f.city) }));
  for (const g of GENRES) if (!g.id.startsWith('mv_') && inRange(g.born, from, to)) out.push(fmtL(l('Nasce um gênero: {g}.', 'A genre is born: {g}.'), { g: g.name }));
  const media = MEDIA.filter((m) => inRange(m.start, from, to)).map((m) => (s.config.realNames && MEDIA_REFS[m.name]) || m.name);
  if (media.length) out.push(fmtL(l('Novos veículos: {n}.', 'New outlets: {n}.'), { n: names(media) }));
  const critics = allCritics().filter((c) => inRange(c.from, from, to)).map((c) => c.name);
  if (critics.length) out.push(fmtL(l('Novas vozes da crítica: {n}.', 'New critical voices: {n}.'), { n: names(critics, 4) }));
  for (const c of COUNTRY_INFO) if (c.award && inRange(c.award[2], from, to)) out.push(fmtL(l('Criada a premiação {a}.', 'The {a} award is created.'), { a: awardName(s, c) }));
  if (inRange(HALL_FOUNDED, from, to)) out.push(fmtL(l('Fundado o {h}: em breve, a primeira turma.', 'The {h} is founded: its first class is coming soon.'), { h: hallName(s) }));
  for (const k of Object.values(VKINDS)) if (inRange(k.from, from, to)) out.push(fmtL(l('Novo tipo de negócio possível: {n}.', 'A new kind of business is possible: {n}.'), { n: k.name }));
  for (const d of DIVISIONS) if (inRange(d.from, from, to)) out.push(fmtL(l('Nova divisão possível: {n}.', 'A new division is possible: {n}.'), { n: d.name }));
  const inst = INSTRUMENTS.filter((d) => inRange(d.from, from, to));
  if (inst.length) out.push(fmtL(l('Novo instrumento: {n}.', 'New instrument: {n}.'), { n: { pt: inst.map((d) => d.name.pt).join(', '), en: inst.map((d) => d.name.en).join(', ') } }));
  const goods = GOODS.filter((d) => inRange(d.from, from, to));
  if (goods.length) out.push(fmtL(l('Nas lojas: {n}.', 'In the shops: {n}.'), { n: { pt: names(goods.map((d) => d.name.pt), 4), en: names(goods.map((d) => d.name.en), 4) } }));
  const debuts = Object.values(s.acts).filter((a) => a.catalogNo && inRange(a.debutYear, from, to) && a.owner !== 'player').sort((a, b) => b.fame - a.fame).map((a) => a.name);
  if (debuts.length) out.push(fmtL(l('Estreiam: {n}.', 'Debuting: {n}.'), { n: names(debuts) }));
  return out;
}

function publish(s: GameState, items: L[]): void {
  if (!items.length) return;
  const p = press(s);
  for (const t of items.slice(0, 6)) p.hl.push({ y: s.year, m: s.month, t, i: 3 });
  if (p.hl.length > 48) p.hl.splice(0, p.hl.length - 48);
  if (items.length <= 2) {
    for (const t of items) notify(s, t, 'event');
  } else {
    const max = 8;
    const shown = items.slice(0, max);
    const more = items.length - shown.length;
    notify(s, {
      pt: `Novidades de ${s.year}: ${shown.map((x) => x.pt).join(' ')}${more > 0 ? ` (e mais ${more})` : ''}`,
      en: `What's new in ${s.year}: ${shown.map((x) => x.en).join(' ')}${more > 0 ? ` (and ${more} more)` : ''}`,
    }, 'event');
  }
  remember(s, 'novelty', { pt: `Novidades de ${s.year}: ${items.map((x) => x.pt).join(' ')}`, en: `New in ${s.year}: ${items.map((x) => x.en).join(' ')}` });
}

registerSimHook('month', 'novelty9', (s) => {
  const st = nov(s);
  // partidas novas e saves antigos começam daqui: o que já existe não é novidade
  if (st.y < 0) { st.y = s.year; return; }
  if (s.year <= st.y) return;
  publish(s, noveltiesBetween(s, st.y, s.year));
  st.y = s.year;
});
