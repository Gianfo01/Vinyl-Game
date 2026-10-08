// Feiras do setor (licenças internacionais e anúncios de lançamento), hype que sobe e cai,
// e fã-clubes oficiais (mensalidade, revista, encontros; convertem fãs ativos em núcleo).

import { clamp, type Rng } from '../../../core/rng';
import { familyOf, l, type L } from '../../../data/world';
import { registerMod } from '../../ext4';
import { fandomOf } from '../../fandom';
import type { GameState } from '../../types';
import { fmtL, money, notify, post, remember } from '../../util';
import { liveMine, mineAct, mineRel } from './common';
import { w4 } from './state';

export interface FairDef {
  id: string;
  name: L;
  city: string;
  realRef: string;
  from: number;
  to?: number;
  month: number;
  real: number; // custo de estande (dólares reais)
  focus: 'licenses' | 'showcase' | 'world' | 'tech';
  desc: L;
}

export const FAIRS: FairDef[] = [
  { id: 'intl', name: l('Feira Internacional de Música', 'International Music Market'), city: 'Cannes', realRef: 'MIDEM (1967–2019)', from: 1967, to: 2019, month: 0, real: 4000, focus: 'licenses', desc: l('Editores do mundo todo compram e vendem licenças de catálogo.', 'Publishers from everywhere buy and sell catalog licenses.') },
  { id: 'showcase', name: l('Festival de Vitrines', 'Showcase Festival'), city: 'Austin', realRef: 'SXSW (1987)', from: 1987, month: 2, real: 2500, focus: 'showcase', desc: l('Centenas de bandas novas tocam para olheiros e imprensa.', 'Hundreds of new bands play for scouts and press.') },
  { id: 'cologne', name: l('Feira de Colônia', 'Cologne Fair'), city: 'Colônia', realRef: 'Popkomm (1989–2011)', from: 1989, to: 2011, month: 7, real: 3000, focus: 'licenses', desc: l('Porta de entrada para o mercado europeu.', 'The gateway to the European market.') },
  { id: 'world', name: l('Expo Mundial de Música', 'World Music Expo'), city: 'Sevilha', realRef: 'WOMEX (1994)', from: 1994, month: 9, real: 2800, focus: 'world', desc: l('Músicas da África, América Latina, Ásia e periferias da Europa.', 'Music from Africa, Latin America, Asia and Europe\'s edges.') },
  { id: 'immersive', name: l('Cúpula de Áudio Imersivo', 'Immersive Audio Summit'), city: 'Seul', realRef: '—', from: 2028, month: 5, real: 6000, focus: 'tech', desc: l('Plataformas neurais e holográficas fecham acordos de catálogo.', 'Neural and holographic platforms sign catalog deals.') },
];

const WORLD_FAMS = ['africa', 'latin', 'brazil', 'asia_me', 'caribbean', 'europe'];

export function fairOpen(s: GameState, f: FairDef): boolean {
  if (w4(s).ms.midem === undefined) return false;
  return s.year >= f.from && (f.to === undefined || s.year <= f.to);
}

export function fairCost(s: GameState, f: FairDef): number {
  return money(s, f.real);
}

export function bookFair(s: GameState, fairId: string): L | null {
  const f = FAIRS.find((x) => x.id === fairId);
  const w = w4(s);
  if (!f || !fairOpen(s, f)) return l('Feira indisponível.', 'Fair unavailable.');
  if (s.month > f.month) return l('A feira deste ano já passou.', 'This year\'s fair is over.');
  if (w.fairs.booked[f.id] === s.year) return l('Estande já reservado.', 'Booth already booked.');
  const cost = fairCost(s, f);
  if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `w4fairbook:${f.id}`, -cost, 'w4_fairs', `Estande em feira ${f.id}`);
  w.fairs.booked[f.id] = s.year;
  return null;
}

function resolveFair(s: GameState, r: Rng, f: FairDef): void {
  const w = w4(s);
  let income = 0;
  let deals = 0;
  for (const a of liveMine(s)) {
    if (a.fame < 3) continue;
    const isWorld = WORLD_FAMS.includes(familyOf(a.genre));
    let p = 0.25 + a.fame / 150 + w.hype / 400;
    if (f.focus === 'world') p *= isWorld ? 1.6 : 0.4;
    if (!r.chance(clamp(p, 0, 0.9))) continue;
    deals += 1;
    let v = 300 + a.fame * a.fame * 3.5;
    if (f.focus === 'world' && isWorld) v *= 1.5;
    if (f.focus === 'tech') v *= 1.4;
    if (f.focus === 'showcase') v *= 0.5;
    income += money(s, v);
    if (f.focus === 'showcase' && a.fame < 30) {
      a.fame = clamp(a.fame + 3, 0, 100);
      a.momentum = clamp(a.momentum + 10, 0, 100);
    }
  }
  if (income > 0) post(s, `w4fair:${f.id}`, income, 'w4_fairs', `Licenças internacionais (${f.id})`);
  // anúncios: lançamentos agendados chegam com mais expectativa
  let announced = 0;
  for (const pr of s.pendingReleases) {
    if (!mineAct(s, s.acts[pr.actId]) || pr.week - s.week > 30) continue;
    pr.hype = Math.min(0.6, (pr.hype ?? 0) + 0.08);
    announced += 1;
  }
  const gain = 8 + deals * 2 + announced * 3;
  w.hype = clamp(w.hype + gain, 0, 100);
  w.fairs.log.push({ fair: f.id, year: s.year, income, deals, hype: gain });
  if (w.fairs.log.length > 20) w.fairs.log.splice(0, w.fairs.log.length - 20);
  const text = fmtL(l('{f}: {d} acordos de licença e {a} lançamentos anunciados.', '{f}: {d} license deals and {a} releases announced.'), { f: f.name, d: deals, a: announced });
  remember(s, 'fair', text);
  notify(s, text, deals ? 'good' : 'info');
}

export function fairsMonth(s: GameState, r: Rng): void {
  const w = w4(s);
  for (const f of FAIRS) if (f.month === s.month && w.fairs.booked[f.id] === s.year && fairOpen(s, f)) resolveFair(s, r, f);
  // hype: sobe com feiras e #1, cai sozinho
  const n1 = s.player.stats.number1s;
  const prev = s.flags.w4n1 ?? n1;
  if (n1 > prev) w.hype = clamp(w.hype + (n1 - prev) * 10, 0, 100);
  s.flags.w4n1 = n1;
  w.hype = clamp(w.hype * 0.9, 0, 100);
}

registerMod('appeal', 'w4hype', (s, value, ctx) => {
  if (!ctx.release || !mineRel(s, ctx.release)) return null;
  const k = 1 + w4(s).hype / 400;
  return k > 1.01 ? { value: value * k, label: l('Hype do selo', 'Label hype') } : null;
});

// ======================================================================= fã-clubes

export const CLUB_TIERS: { fee: number; rate: number; name: L }[] = [
  { fee: 0.4, rate: 0.1, name: l('Mensalidade simbólica', 'Token dues') },
  { fee: 1, rate: 0.06, name: l('Mensalidade padrão', 'Standard dues') },
  { fee: 2.2, rate: 0.03, name: l('Clube premium', 'Premium club') },
];

export function clubMedium(s: GameState): L {
  if (s.year >= 2005) return l('comunidade online com conteúdo exclusivo', 'online community with exclusive content');
  if (s.year >= 1995) return l('site oficial e lista de e-mails', 'official website and mailing list');
  return l('revista impressa pelo correio', 'printed magazine by mail');
}

export function createFanClub(s: GameState, actId: string, tier: 0 | 1 | 2): L | null {
  const a = s.acts[actId];
  const w = w4(s);
  if (!mineAct(s, a)) return l('Ato não é seu.', 'Not your act.');
  if (w.clubs[actId]) return l('Já existe um fã-clube oficial.', 'An official fan club already exists.');
  if (a.fans.active < 300) return l('Poucos fãs ativos (mín. 300).', 'Too few active fans (min. 300).');
  const cost = money(s, 800);
  if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `w4clubnew:${actId}`, -cost, 'w4_fanclub', `Fã-clube oficial ${a.name}`);
  w.clubs[actId] = { since: s.week, tier, members: 0, magazine: false, income: 0 };
  fandomOf(s, actId).clubOrganized = true;
  remember(s, 'fanclub', fmtL(l('{a} ganha um fã-clube oficial.', '{a} gets an official fan club.'), { a: a.name }), { actId });
  return null;
}

export function setClubTier(s: GameState, actId: string, tier: 0 | 1 | 2): void {
  const c = w4(s).clubs[actId];
  if (c) c.tier = tier;
}

export function toggleMagazine(s: GameState, actId: string): void {
  const c = w4(s).clubs[actId];
  if (c) c.magazine = !c.magazine;
}

export function closeFanClub(s: GameState, actId: string): void {
  const w = w4(s);
  if (!w.clubs[actId]) return;
  delete w.clubs[actId];
  const a = s.acts[actId];
  if (a) a.trust = clamp(a.trust - 3, 0, 100);
}

/** Encontro do fã-clube: converte sócios em núcleo (a cada 6 meses). */
export function clubMeetup(s: GameState, actId: string): L | null {
  const c = w4(s).clubs[actId];
  const a = s.acts[actId];
  if (!c || !a) return l('Sem fã-clube.', 'No fan club.');
  const key = `w4meet:${actId}`;
  if (s.week - (s.flags[key] ?? -999) < 26) return l('O último encontro foi há pouco.', 'The last meetup was recent.');
  const cost = money(s, 1000 + c.members * 0.2);
  if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, key, -cost, 'w4_fanclub', `Encontro do fã-clube ${a.name}`);
  s.flags[key] = s.week;
  const conv = Math.min(a.fans.active, Math.round(c.members * 0.05) + 20);
  a.fans.active -= conv;
  a.fans.core += conv;
  a.trust = clamp(a.trust + 3, 0, 100);
  fandomOf(s, actId).superfans += Math.round(conv * 0.3);
  return null;
}

export function fanClubsMonth(s: GameState): void {
  const w = w4(s);
  for (const [actId, c] of Object.entries(w.clubs)) {
    const a = s.acts[actId];
    if (!a || !mineAct(s, a) || a.status === 'retired' || a.status === 'split') { delete w.clubs[actId]; continue; }
    const t = CLUB_TIERS[c.tier] ?? CLUB_TIERS[1];
    const target = a.fans.active * t.rate * (c.magazine ? 1.3 : 1) * (0.6 + a.trust / 250);
    c.members = Math.max(0, Math.round(c.members + (target - c.members) * 0.2));
    const dues = money(s, c.members * t.fee);
    const cost = money(s, 150) + (c.magazine ? money(s, 100 + c.members * 0.15) : 0);
    c.income = dues - cost;
    post(s, `w4club:${actId}`, c.income, 'w4_fanclub', `Fã-clube ${a.name}`);
    const conv = Math.min(Math.round(a.fans.active * 0.05), Math.round(c.members * 0.015 * (c.magazine ? 1.5 : 1)));
    a.fans.active -= conv;
    a.fans.core += conv;
    fandomOf(s, actId).clubOrganized = true;
  }
}
