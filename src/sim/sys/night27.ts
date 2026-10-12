// r27 (AUD1) — NOITE DE OLHEIRO (modo Jogável da busca de talento na sua cidade). Em vez de mandar um olheiro à cena
// e esperar semanas (o modo Rápido de sempre: startSceneTrip23), você mesmo sai uma noite pelas casas da cidade.
// O mapa mostra quem toca onde, com informação PARCIAL: gênero, quanta gente na porta (fama), um comentário do
// balcão (que acerta mais do que erra sobre o potencial) e, às vezes, o olheiro de um selo rival no bar.
// São três horários (20h, 22h, meia-noite). Em cada um você escolhe um ato para prestar atenção:
//  - ver o show: o nome entra no funil como Observado (grau 2), com a SUA leitura (ouvido do dono);
//  - ficar o show inteiro (o mesmo ato em dois horários seguidos): +1 grau (o potencial aparece);
//  - puxar conversa depois (carisma): +1 grau se a banda topa; se não, nada;
//  - rival no bar: ele pode anotar o mesmo nome (o aviso de disputa de sempre, discover18).
// Resultado só em estruturas que já existem: conhecimento (s.knowledge), tempo livre (1 bolinha), caixa (entrada,
// táxi e bebida) e a disputa com rival (disc18.hot + inbox). Uma noite por mês. Aleatoriedade própria
// (semente + cidade + mês; e por escolha), nunca o fluxo compartilhado. Bots e autoplay seguem no modo Rápido.

import { Rng, clamp } from '../../core/rng';
import { cityById, familyOf, genreById, l, type L } from '../../data/world';
import { registerExt4 } from '../ext4';
import { monthIndex } from '../capacity';
import { pushInbox18 } from '../inbox18';
import { cashWhy20, freeCash20 } from '../oblig20';
import { scoutEligible20 } from '../scout20';
import type { Act, GameState } from '../types';
import { fmtL, money, post } from '../util';
import { addSignal, spawnProceduralAct } from '../worldgen';
import { disc18 } from './discover18';
import { energyLeft, spendEnergy } from './life';
import { ownerOf } from './people/owner';
import { VENUES17 } from './venues17';

export type VenueK27 = 'bar' | 'club' | 'basement' | 'theater' | 'square';
export const VENUE_K27: Record<VenueK27, { name: L; fee: number; big: number }> = {
  bar: { name: l('Bar', 'Bar'), fee: 4, big: 0 },
  basement: { name: l('Porão', 'Basement'), fee: 6, big: 0 },
  square: { name: l('Praça', 'Square'), fee: 0, big: 1 },
  club: { name: l('Clube', 'Club'), fee: 12, big: 1 },
  theater: { name: l('Teatro', 'Theatre'), fee: 25, big: 2 },
};
export const SLOTS27: L[] = [l('20h', '8 pm'), l('22h', '10 pm'), l('Meia-noite', 'Midnight')];

export interface NightAct27 {
  actId: string;
  /** grau que você já tem (0 = nome novo) */
  known: number;
  /** gente na porta: 1 vazio · 2 meia casa · 3 cheio (vem da fama) */
  buzz: 1 | 2 | 3;
  /** o comentário do balcão (acerta mais do que erra sobre o potencial) */
  tip: L;
  tipGood: boolean;
  /** contratado por outro selo: dá para ver, não para assinar */
  signedTo?: string;
  /** abertura de uma banda que ninguém conhece ainda (o ato nasce quando você assiste; o nome só aparece aí) */
  spawn?: { genre: string; potential: number; members: number; fame: number };
}
export interface NightVenue27 { id: string; name: L; kind: VenueK27; x: number; y: number; fee: number; acts: NightAct27[]; rival?: { id: string; name: string }; real?: boolean }
export interface NightPlan27 { city: string; month: number; venues: NightVenue27[] }
export interface NightPick27 { venue: string; act: string; talk?: boolean }
export interface NightLine27 { slot: number; actId: string; venue: string; before: number; after: number; why: L; tone: 'good' | 'bad' | 'info'; rival?: string }
export interface NightResult27 { lines: NightLine27[]; cost: number; newNames: number; deeper: number }

interface Night27State { m: number; last?: { m: number; city: string; n: number } }
declare module '../ext4' { interface Ext4 { night27: Night27State } }
registerExt4('night27', () => ({ m: -1 }));
export const night27 = (s: GameState): Night27State => { const x = s.x4 as unknown as { night27?: Night27State }; return (x.night27 ??= { m: -1 }); };

/** Custo fixo da saída (táxi e bebida) — além das entradas das casas visitadas. */
export const nightBase27 = (s: GameState): number => money(s, 60);
export const talkCost27 = (s: GameState): number => money(s, 25);

/** Pode sair hoje? null = pode; senão o motivo. */
export function nightBlock27(s: GameState): L | null {
  if (s.config.role === 'artist') return l('Noite de olheiro é coisa de selo.', 'Scouting nights are a label thing.');
  if (night27(s).m === monthIndex(s)) return l('Você já fez a sua noite de olheiro este mês.', 'You already did your scouting night this month.');
  if (energyLeft(s) < 1) return l('Sem tempo livre (bolinhas) neste mês.', 'No free time (energy) left this month.');
  if (freeCash20(s) < nightBase27(s)) return cashWhy20(s, nightBase27(s), l('Caixa insuficiente.', 'Not enough cash.'));
  return null;
}

const GOOD_TIPS: L[] = [
  l('"Esses aí escrevem tudo sozinhos. Fica de olho."', '"They write everything themselves. Keep an eye out."'),
  l('"A cantora tem uma voz que cala o bar."', '"The singer has a voice that shuts the bar up."'),
  l('"Ensaiam todo dia na garagem do tio."', '"They rehearse every day in an uncle\'s garage."'),
  l('"Semana passada um produtor saiu daqui falando sozinho."', '"Last week a producer left here talking to himself."'),
];
const BAD_TIPS: L[] = [
  l('"Tocam os mesmos covers há três anos."', '"Same covers for three years now."'),
  l('"O baterista nem sempre aparece."', '"The drummer doesn\'t always show up."'),
  l('"Bom de festa, mas não sai disso."', '"Good for a party, but that\'s it."'),
  l('"Dizem que estão pensando em largar."', '"Word is they\'re thinking of quitting."'),
];
const WORDS = ['Estrela', 'Farol', 'Esquina', 'Lua', 'Sótão', 'Garagem', 'Maré', 'Coreto', 'Vitrola', 'Aurora'];

const live = (a: Act | undefined): a is Act => !!a && (a.status === 'active' || a.status === 'emerging') && a.members.length > 0;

/** O mapa da noite (puro: não muda o estado do jogo; o mesmo mês e cidade dão o mesmo mapa). */
export function nightPlan27(s: GameState, city = s.config.homeCity): NightPlan27 {
  const m = monthIndex(s);
  const r = Rng.fromSeed(`${s.config.seed}|night27|${city}|${m}`);
  // casas reais da cidade abertas na época (clubes e teatros; estádios não), depois as de bairro
  const real = VENUES17.filter((d) => d.city === city && d.buyable !== false && d.cap <= 3000 && s.year >= d.from && (!d.to || s.year <= d.to)).slice(0, 2);
  const kinds: VenueK27[] = r.shuffle(['bar', 'basement', 'square', 'club', 'bar'] as VenueK27[]);
  const words = r.shuffle([...WORDS]);
  const venues: NightVenue27[] = real.map((d) => ({ id: `rv:${d.id}`, name: l(d.name, d.name), kind: d.cap >= 1200 ? 'theater' : 'club', x: 0, y: 0, fee: 0, acts: [], real: true }));
  for (let i = 0; venues.length < 5; i++) {
    const k = kinds[i % kinds.length], w = words[i % words.length];
    venues.push({ id: `nv:${k}:${i}`, name: k === 'bar' ? l(`Bar ${w}`, `${w} Bar`) : k === 'square' ? l(`Praça do ${w}`, `${w} Square`) : fmtL(l('{k} {w}', '{w} {k}'), { k: VENUE_K27[k].name, w }), kind: k, x: 0, y: 0, fee: 0, acts: [] });
  }
  // posições no mapa (grade 3×2 com folga) e entradas
  venues.forEach((v, i) => { v.x = 12 + (i % 3) * 36 + r.int(-6, 6); v.y = 22 + Math.floor(i / 3) * 46 + r.int(-8, 8); v.fee = money(s, VENUE_K27[v.kind].fee); });
  // quem toca: atos livres da cidade nas casas pequenas; contratados de rivais como atração nas grandes; e, onde
  // falta gente, uma abertura de banda nova (nasce quando você assiste — como o freelancer que acha alguém novo)
  const cityActs = Object.values(s.acts).filter((a) => live(a) && a.city === city && a.owner !== 'player' && (s.knowledge[a.id]?.degree ?? 0) < 4);
  const free = r.shuffle(cityActs.filter((a) => !a.owner)).slice(0, 8);
  const signed = cityActs.filter((a) => a.owner).sort((a, b) => b.fame - a.fame).slice(0, 3);
  const genres = (cityById[city]?.scenes ?? []).filter((g) => genreById[g] && genreById[g].born <= s.year);
  const fallbackG = Object.keys(s.genrePop).filter((g) => (s.genrePop[g] ?? 0) > 0.4 && genreById[g] && genreById[g].born <= s.year).sort();
  const mkAct = (a: Act): NightAct27 => {
    const tipGood = r.chance(a.potential >= 60 ? 0.72 : 0.28);
    return { actId: a.id, known: s.knowledge[a.id]?.degree ?? 0, buzz: a.fame < 5 ? 1 : a.fame < 15 ? 2 : 3, tip: r.pick(tipGood ? GOOD_TIPS : BAD_TIPS), tipGood, signedTo: a.owner ? s.labels[a.owner]?.name ?? '?' : undefined };
  };
  venues.forEach((v, i) => {
    const big = VENUE_K27[v.kind].big >= 1;
    if (big && signed.length && r.chance(0.7)) v.acts.push(mkAct(signed.shift()!));
    const want = v.kind === 'square' ? 1 : big ? 2 : r.int(1, 2);
    while (v.acts.length < want) {
      const a = free.shift();
      if (a) { v.acts.push(mkAct(a)); continue; }
      const g = genres.length && r.chance(0.7) ? r.pick(genres) : fallbackG.length ? r.pick(fallbackG) : undefined;
      if (!g) break;
      const potential = Math.round(clamp(r.normal(52, 14), 15, 92));
      const tipGood = r.chance(potential >= 60 ? 0.72 : 0.28);
      v.acts.push({ actId: `new:${v.id}:${i}:${v.acts.length}`, known: 0, buzz: 1, tip: r.pick(tipGood ? GOOD_TIPS : BAD_TIPS), tipGood, spawn: { genre: g, potential, members: r.chance(0.4) ? 1 : r.int(2, 5), fame: Math.round(r.float(0, 3) * 10) / 10 } });
    }
    // o olheiro de um selo rival no bar (mais provável onde a casa está cheia)
    const lbs = Object.values(s.labels).filter((lb) => lb.active).sort((a, b) => b.revenueLastYear - a.revenueLastYear).slice(0, 12);
    const hot = v.acts.reduce((t, x) => t + x.buzz, 0);
    if (lbs.length && v.acts.length && r.chance(0.12 + hot * 0.06)) { const lb = r.pick(lbs); v.rival = { id: lb.id, name: lb.name }; }
  });
  return { city, month: m, venues: venues.filter((v) => v.acts.length) };
}

/** Custo da noite com estas escolhas (entrada de cada casa visitada + saída + conversas). */
export function nightCost27(s: GameState, plan: NightPlan27, picks: NightPick27[]): number {
  const seen = new Set(picks.map((p) => p.venue));
  return nightBase27(s) + plan.venues.filter((v) => seen.has(v.id)).reduce((t, v) => t + v.fee, 0) + picks.filter((p) => p.talk).length * talkCost27(s);
}

/** Vive a noite: aplica as escolhas (até 3 horários) e explica cada resultado. */
export function playNight27(s: GameState, plan: NightPlan27, picks: NightPick27[]): NightResult27 | L {
  const block = nightBlock27(s);
  if (block) return block;
  if (plan.month !== monthIndex(s)) return l('Esse mapa é de outro mês.', 'That map is from another month.');
  const ps = picks.slice(0, SLOTS27.length);
  for (const p of ps) if (!plan.venues.find((v) => v.id === p.venue)?.acts.some((x) => x.actId === p.act)) return l('Escolha inválida.', 'Invalid pick.');
  const cost = nightCost27(s, plan, ps);
  if (freeCash20(s) < cost) return cashWhy20(s, cost, l('Caixa insuficiente.', 'Not enough cash.'));
  const e = spendEnergy(s, 1);
  if (e) return e;
  const m = monthIndex(s);
  night27(s).m = m;
  post(s, `night27:${m}`, -cost, 'scouting', `Noite de olheiro (${cityById[plan.city]?.name.pt ?? plan.city})`);
  const o = ownerOf(s);
  const me = o.name;
  const lines: NightLine27[] = [];
  let newNames = 0, deeper = 0;
  const spawned: Record<string, string> = {};
  const orig = ps.map((x) => x.act);
  ps.forEach((p0, i) => {
    let p = p0;
    const v = plan.venues.find((x) => x.id === p.venue)!;
    const na = v.acts.find((x) => x.actId === p.act)!;
    const r = Rng.fromSeed(`${s.config.seed}|night27r|${m}|${i}|${p.act}`);
    // abertura nova: o ato nasce na primeira vez que você presta atenção nele
    if (na.spawn && !spawned[p.act]) spawned[p.act] = spawnProceduralAct(s, Rng.fromSeed(`${s.config.seed}|night27s|${m}|${p.act}`), { city: plan.city, genre: na.spawn.genre, potential: na.spawn.potential, members: na.spawn.members, fame: na.spawn.fame }).id;
    const a = s.acts[spawned[p.act] ?? p.act];
    p = { ...p, act: a?.id ?? p.act };
    const before = s.knowledge[p.act]?.degree ?? 0;
    const line: NightLine27 = { slot: i, actId: p.act, venue: v.id, before, after: before, why: l('', ''), tone: 'info' };
    lines.push(line);
    if (!a || !scoutEligible20(s, a).ok) {
      line.why = na.signedTo ? fmtL(l('Bom show — mas {a} já tem contrato com {l}. Valeu pela noite.', 'Good show — but {a} is already signed to {l}. It was a nice night out.'), { a: a?.name ?? '?', l: na.signedTo }) : l('Não dá para contratar esse ato agora.', 'This act cannot be signed now.');
      return;
    }
    const why: L[] = [];
    // ver o show (com a SUA leitura: o ouvido do dono afina o viés)
    if (!s.knowledge[a.id]) {
      addSignal(s, r, a.id, 'night27', { by: me, at: v.name, city: a.city });
      const k = s.knowledge[a.id];
      k.degree = 2; k.stage = 'monitoring';
      k.bias = r.normal(0, Math.max(2, 11 - o.attrs.ear / 10));
      newNames++;
      why.push(fmtL(l('Você viu {a} de perto no {v}: entra no funil como Observado.', 'You saw {a} up close at {v}: they enter the funnel as Observed.'), { a: a.name, v: v.name }));
    } else {
      const k = s.knowledge[a.id];
      if (k.degree < 3) { k.degree += 1; k.bias *= 0.6; k.updatedWeek = s.week; why.push(fmtL(l('Rever {a} ao vivo tira dúvidas: +1 grau.', 'Seeing {a} live again clears doubts: +1 degree.'), { a: a.name })); }
      else why.push(fmtL(l('{a} você já conhecia bem; a noite só confirmou.', 'You already knew {a} well; the night only confirmed it.'), { a: a.name }));
    }
    const k = s.knowledge[a.id];
    // ficou o show inteiro (o mesmo ato no horário anterior)
    const prev = ps[i - 1];
    if (prev && orig[i - 1] === orig[i] && prev.venue === p.venue && k.degree < 3) {
      k.degree = 3; k.bias *= 0.6;
      why.push(l('Você ficou o show inteiro: dá para ver até onde chegam (potencial à vista).', 'You stayed for the whole set: you can see how far they can go (potential visible).'));
    }
    // puxar conversa depois
    if (p.talk) {
      const pTalk = clamp(0.35 + o.attrs.charisma / 150, 0.3, 0.9);
      if (r.chance(pTalk) && k.degree < 3) { k.degree = 3; k.bias *= 0.7; why.push(l('Papo no camarim: ambição e planos na mesa (+1 grau).', 'A backstage chat: ambition and plans on the table (+1 degree).')); }
      else if (k.degree >= 3) why.push(l('Conversa boa, mas você já sabia o que eles contaram.', 'A good chat, but you already knew what they told you.'));
      else why.push(fmtL(l('A banda saiu correndo para outro show — sem conversa (carisma {c}).', 'The band rushed off to another gig — no chat (charisma {c}).'), { c: Math.round(o.attrs.charisma) }));
    }
    k.updatedWeek = s.week;
    if (k.degree >= 3 && (k.stage === 'signal' || k.stage === 'monitoring')) k.stage = 'investigating';
    // o comentário do balcão estava certo?
    if (k.degree >= 3) why.push(na.tipGood === a.potential >= 60 ? l('O comentário do balcão estava certo.', 'The bar talk was right.') : l('O comentário do balcão errou desta vez.', 'The bar talk was wrong this time.'));
    // rival no bar
    if (v.rival && s.labels[v.rival.id]?.active && !disc18(s).hot[a.id] && r.chance(0.35)) {
      disc18(s).hot[a.id] = { lb: v.rival.id, w: s.week + r.int(4, 8) };
      line.rival = v.rival.name;
      pushInbox18(s, 'disc18_hot', { from: v.rival.name, subject: fmtL(l('{l} também está de olho em {a}', '{l} is also circling {a}'), { l: v.rival.name, a: a.name }),
        body: fmtL(l('O olheiro da {l} estava no {v} e anotou o mesmo nome. Se você não fizer proposta em poucas semanas, eles assinam.', 'The {l} scout was at {v} and wrote down the same name. If you do not make an offer within a few weeks, they sign.'), { l: v.rival.name, v: v.name }),
        ref: { act: a.id }, tone: 'bad', actions: [{ id: 'go', label: l('Fazer proposta', 'Make an offer') }, { id: 'no', label: l('Deixar ir', 'Let it go') }], weeks: 6 });
      why.push(fmtL(l('O olheiro da {l} também anotou o nome: corra.', 'The {l} scout wrote the name down too: hurry.'), { l: v.rival.name }));
    } else if (v.rival) why.push(fmtL(l('O olheiro da {l} estava no bar, mas olhava para outro lado.', 'The {l} scout was at the bar, but looking the other way.'), { l: v.rival.name }));
    line.after = k.degree;
    if (line.after > line.before && line.before > 0) deeper++;
    line.tone = line.rival ? 'bad' : line.after > line.before ? 'good' : 'info';
    line.why = { pt: why.map((x) => x.pt).join(' '), en: why.map((x) => x.en).join(' ') };
  });
  night27(s).last = { m, city: plan.city, n: newNames };
  return { lines, cost, newNames, deeper };
}

/** Rótulo do gênero (a única coisa que se sabe de cara). */
export const actGenre27 = (s: GameState, x: NightAct27): L => { const g = x.spawn?.genre ?? s.acts[x.actId]?.genre ?? ''; return genreById[g]?.name ?? l(familyOf(g)); };
/** Nome no cartaz (abertura nova: ainda sem nome). */
export const actName27 = (s: GameState, x: NightAct27): L => (x.spawn ? l('Banda de abertura (nome fora do cartaz)', 'Opening act (not on the bill)') : l(s.acts[x.actId]?.name ?? '?', s.acts[x.actId]?.name ?? '?'));
/** Integrantes à vista. */
export const actSize27 = (s: GameState, x: NightAct27): number => x.spawn?.members ?? s.acts[x.actId]?.members.length ?? 0;
