// Rodada 19 (hood19) — o BAIRRO da sede em volta do "Nosso mundo": (1) identidade por cidade/época (Tin Pan
// Alley, Lapa, Soho, Shimokitazawa…) com aluguel, clima da cena, segurança e gentrificação ao longo das
// décadas (barato e artístico → da moda → caro), que mexem no aluguel da sede e no estresse do elenco local;
// (2) vizinhos em lotes livres (escritório de rival, loja de discos, bar, sala de ensaio, rádio) com atalho para
// os sistemas existentes e compra quando o imóvel está à venda; (3) eventos do bairro com decisão (reclamação de
// barulho, festa de rua, filmagem, mural do seu astro, romaria de fãs, enchente); (4) marcos da cidade no
// horizonte (data/landmarks19) com atalho para marcar show e prestígio para as suas casas. Determinístico
// (Rng com semente própria por mês); sem DOM.

import { clamp, Rng } from '../../core/rng';
import { HQ_LEVELS } from '../../data/rules';
import { hoodAt19, histAge19, histNote19, CLIMATE19, type Hood19 } from '../../data/hood19';
import { histMode } from '../history15';
import { landmarksAt19, type Landmark19 } from '../../data/landmarks19';
import { l, type L } from '../../data/world';
import { registerExplain, type WhyPart } from '../explain18';
import { registerExt4, registerSimHook } from '../ext4';
import { emitFact } from '../facts17';
import type { Goto18 } from '../inbox18';
import { addStress } from '../stress17';
import type { GameState } from '../types';
import { fmtL, hasTech, money, playerActs, post } from '../util';
import { LOTS18, buildings18, campus18, freeLots18, log18, lotMult18, styleDef18 } from './campus18';
import { hq6 } from './hq6';
import { liveOf } from './live/state';
import { v17, vdef } from './venues17';
import { LOTGATE19, world19, type Pop19, type PopAct19, type PopRow19 } from './world19';

// ---------------------------------------------------------------- estado

export type NbK = 'rival' | 'records' | 'bar' | 'rehearsal' | 'radio';
export type EvK = 'noise' | 'party' | 'shoot' | 'mural' | 'pilgrim' | 'flood';
export interface Ev19 { id: string; k: EvK; at: string; s: number; done?: string }
export interface HoodSt19 { bought: Record<string, number>; evs: Ev19[]; seq: number }
declare module '../ext4' { interface Ext4 { hood19: HoodSt19 } }
const fresh = (): HoodSt19 => ({ bought: {}, evs: [], seq: 0 });
registerExt4('hood19', fresh);
export function hood19(s: GameState): HoodSt19 {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.hood19 ??= fresh()) as HoodSt19;
  st.bought ??= {}; st.evs ??= []; st.seq ??= 0;
  return st;
}
const mIdx = (s: GameState) => s.year * 12 + s.month;
const $k = (c: number) => { const v = c / 100; return v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `$${Math.round(v / 1e3)}k` : `$${Math.round(v)}`; };
const hash = (str: string) => { let x = 2166136261; for (let i = 0; i < str.length; i++) x = Math.imul(x ^ str.charCodeAt(i), 16777619) >>> 0; return x / 4294967296; };

// ---------------------------------------------------------------- bairro: identidade e números

export interface HoodStats19 { h: Hood19; age: number; hist: number; note: L | null; stage: 'artsy' | 'hip' | 'pricey'; rent: number; vibe: number; safety: number; parts: [L, number][] }
export const STAGE19: Record<HoodStats19['stage'], L> = { artsy: l('Barato e artístico', 'Cheap and artsy'), hip: l('Na moda', 'Hip'), pricey: l('Caro e arrumado', 'Pricey and polished') };
export function hoodStats19(s: GameState, year = s.year): HoodStats19 {
  const h = hoodAt19(s.config.homeCity, year);
  // r19: o estágio segue a linha do tempo documentada do bairro (década a década), não uma curva genérica
  const base = clamp(histAge19(h, year), 0, 1);
  // modo exato: só a história; nos outros, seus prédios e estilos desviam o bairro do roteiro real
  const alt = histMode(s) !== 'strict';
  const own = alt ? Math.min(0.25, buildings18(s).filter((b) => b.zone === 'campus' && b.st === 'open').length * 0.025) : 0;
  // estilos escolhidos empurram (vidro, loft) ou seguram (brutalista, tijolo) a gentrificação
  const sg = alt ? clamp(Object.values(world19(s).sty).reduce((t, x) => t + styleDef18(x).gent, 0), -0.15, 0.15) : 0;
  const age = clamp(base + own + sg, 0, 1);
  const lm = landmarksAt19(s.config.homeCity, year).filter((x) => x.music === 'venue' || x.music === 'studio').length;
  const vibe = Math.round(clamp(88 - 48 * age + lm * 4, 10, 100)), safety = Math.round(clamp(35 + 50 * age, 0, 100));
  const rent = Math.round((0.85 + 0.45 * age) * 100) / 100; // ±30% no máximo: efeito sentido sem quebrar o equilíbrio
  const parts: [L, number][] = [[fmtL(l('História de "{n}" em {y}', 'History of "{n}" in {y}'), { n: h.n, y: String(year) }), Math.round(base * 100)], [l('Seus prédios valorizam a área', 'Your buildings lift the area'), Math.round(own * 100)], [l('Estilos das fachadas', 'Façade styles'), Math.round(sg * 100)]];
  return { h, age, hist: base, note: histNote19(h, year), stage: age < 0.4 ? 'artsy' : age < 0.75 ? 'hip' : 'pricey', rent, vibe, safety, parts };
}
/** Ajuste mensal do aluguel da sede pelo bairro (positivo = desconto). */
export const rentAdj19 = (s: GameState): number => (hq6(s).ownBuilding ? 0 : Math.round(money(s, HQ_LEVELS[s.player.hq].rent) * (1 - hoodStats19(s).rent)));

registerExplain('h19.hood', (s) => {
  const x = hoodStats19(s);
  const parts: WhyPart[] = [
    ...x.parts.map(([label, value]) => ({ label, value, fmt: 'num' as const })),
    { label: l('Gentrificação (0–100)', 'Gentrification (0–100)'), value: Math.round(x.age * 100), fmt: 'num', note: fmtL(l('{s} — barato e artístico → na moda → caro: o ciclo de toda cena.', '{s} — cheap and artsy → hip → pricey: every scene\'s cycle.'), { s: STAGE19[x.stage] }) },
    { label: l('Aluguel (× da média)', 'Rent (× average)'), value: x.rent, fmt: 'mult', tone: x.rent > 1 ? 'bad' : 'good', note: fmtL(l('Ajuste mensal no aluguel da sede: {v}.', 'Monthly HQ rent adjustment: {v}.'), { v: hq6(s).ownBuilding ? l('nenhum (prédio próprio)', 'none (owned building)').pt : $k(rentAdj19(s)) }) },
    { label: l('Clima da cena', 'Scene vibe'), value: x.vibe, fmt: 'num', tone: x.vibe >= 65 ? 'good' : '', note: l('65+: o elenco da cidade perde 1 de estresse por mês.', '65+: the local roster sheds 1 stress a month.') },
    { label: l('Segurança', 'Safety'), value: x.safety, fmt: 'num', tone: x.safety < 45 ? 'bad' : '', note: l('Abaixo de 45: mais chance de reclamações e de enchente sem manutenção.', 'Below 45: more complaints and floods without upkeep.') },
  ];
  return { title: x.h.n, value: Math.round(x.age * 100), fmt: 'num', parts, note: x.note ? fmtL(l('{d} Nesta época: {e}', '{d} At this time: {e}'), { d: x.h.d, e: x.note }) : x.h.d };
});

// ---------------------------------------------------------------- vizinhos

export const NB19: Record<NbK, { n: L; icon: string; from: number; go: Goto18 }> = {
  rival: { n: l('Escritório de gravadora rival', 'Rival label office'), icon: 'building', from: 0, go: { area: 'labels', label: l('Ver gravadoras', 'See labels') } },
  records: { n: l('Loja de discos', 'Record store'), icon: 'cd', from: 0, go: { area: 'supply18', label: l('Varejo e distribuição', 'Retail and distribution') } },
  bar: { n: l('Bar com palco', 'Bar with a stage'), icon: 'stage', from: 0, go: { area: 'cp17-label', tab: ['cp17-label', 'venues'], label: l('Casas de shows', 'Venues') } },
  rehearsal: { n: l('Sala de ensaio', 'Rehearsal space'), icon: 'drums', from: 1955, go: { area: 'talent18', label: l('Talentos', 'Talent') } },
  radio: { n: l('Estação de rádio', 'Radio station'), icon: 'radio', from: 1922, go: { area: 'media', tab: ['mediaHub', 'radio18'], label: l('Rádio', 'Radio') } },
};
// r19 smoke: nomes bilíngues e de época — nada de "Vinil & Cia" antes do LP nem rádio antes do rádio
type NbName = [L, number?, string?]; // [nome, a partir do ano, tecnologia exigida]
const NBNAMES: Record<Exclude<NbK, 'rival'>, NbName[]> = {
  records: [[l('Partituras & Pianos', 'Sheet Music & Pianos')], [l('Salão Fonográfico', 'Phonograph Parlour')], [l('Casa de Gramofones', 'Gramophone House'), 1895],
    [l('Discos & Vitrolas', 'Records & Victrolas'), 1906], [l('Casa do Disco', 'The Record House'), 1910], [l('Vinil & Cia', 'Vinyl & Co.'), 0, 'lp'], [l('Bolacha Preta', 'Black Platter'), 0, 'lp'],
    [l('Groove Shop', 'Groove Shop'), 1965], [l('Disco Bar', 'Disco Bar'), 1975]],
  bar: [[l('Bar do Zé', 'Joe\'s Bar')], [l('Café-Concerto', 'Café-Concert')], [l('Taverna do Porto', 'Harbour Tavern')], [l('Café Elétrico', 'Electric Café'), 1900],
    [l('Blue Note Corner', 'Blue Note Corner'), 1940], [l('The Anchor', 'The Anchor'), 1950], [l('Porão 77', 'Cellar 77'), 1977]],
  rehearsal: [[l('Garagem Sonora', 'Sound Garage')], [l('Sala 3', 'Room 3')], [l('Ensaio Central', 'Central Rehearsals')]],
  radio: [[l('Rádio Cidade', 'City Radio')], [l('Rádio Bairro', 'Neighbourhood Radio')], [l('Onda Local', 'Local Wave')], [l('Onda Local FM', 'Local Wave FM'), 0, 'fm']],
};
/** Nomes possíveis de um vizinho no ano (só o que já existe; partituras e fonógrafos saem quando o disco domina). */
export function nbNames19(s: GameState, k: Exclude<NbK, 'rival'>): L[] {
  const ok = NBNAMES[k].filter(([, y, tech]) => s.year >= (y ?? 0) && (!tech || hasTech(s, tech))).map(([n]) => n);
  return k === 'records' && s.year >= 1910 ? ok.filter((n) => n.en !== 'Sheet Music & Pianos' && n.en !== 'Phonograph Parlour') : ok;
}
/** Gravadoras rivais que já existem neste ano (fundadas, ativas, não fechadas). */
export const nbRivals19 = (s: GameState) => Object.values(s.labels ?? {}).filter((x) => x && x.id !== 'player' && x.active !== false && !x.closedYear && (x.founded ?? 0) <= s.year).sort((a, b) => (a.id < b.id ? -1 : 1));
const RIVAL0 = (y: number): L => (y < 1920 ? l('Companhia Fonográfica Central', 'Central Phonograph Company') : y < 1960 ? l('Discos Metrópole', 'Metropole Records') : l('Selo do Bairro', 'Neighbourhood Label'));
export interface Nb19 { lot: number; k: NbK; name: L; sale: boolean; price: number; who?: string }
/** Vizinhos agora: ocupam lotes livres (deixando pelo menos 3 livres para você); somem quando você usa o lote. */
export function nb19(s: GameState): Nb19[] {
  const st = hood19(s), free = freeLots18(s).filter((n) => st.bought[n] === undefined);
  const order = [...free].sort((a, b) => hash(`${s.config.seed}|nb|${a}`) - hash(`${s.config.seed}|nb|${b}`));
  const rivals = nbRivals19(s);
  const kinds = (Object.keys(NB19) as NbK[]).filter((k) => s.year >= NB19[k].from && (k !== 'radio' || hasTech(s, 'radio')));
  const n = Math.max(0, Math.min(kinds.length, free.length - 3, 4));
  const hs = hoodStats19(s);
  return order.slice(0, n).map((lot, i) => {
    const k = kinds[i];
    const rv = k === 'rival' && rivals.length ? rivals[Math.floor(hash(`${s.config.seed}|rv`) * rivals.length)] : undefined;
    const names = k === 'rival' ? [] : nbNames19(s, k);
    const name: L = k === 'rival' ? fmtL(l('{n} (escritório)', '{n} (office)'), { n: rv ? rv.name : RIVAL0(s.year) }) : names[Math.floor(hash(`${s.config.seed}|${k}|${lot}`) * names.length)] ?? NB19[k].n;
    const L0 = LOTS18[lot];
    const price = Math.round(money(s, 9000 + 2200 * L0.w * L0.d) * lotMult18(lot) * hs.rent);
    return { lot, k, name, sale: k !== 'rival' && hash(`${s.config.seed}|sale|${lot}|${s.year}`) < 0.4, price, who: rv?.id };
  });
}
export function buyNb19(s: GameState, lot: number): L | null {
  const x = nb19(s).find((v) => v.lot === lot);
  if (!x) return l('Não há vizinho nesse lote.', 'No neighbour on that lot.');
  if (!x.sale) return l('O imóvel não está à venda.', 'The property is not for sale.');
  if (s.player.cash < x.price) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `hood19:buy:${lot}:${mIdx(s)}`, -x.price, 'capex', `Compra de imóvel vizinho: ${x.name.pt}`);
  hood19(s).bought[lot] = s.year;
  log18(s, fmtL(l('Você comprou o imóvel de "{n}": o lote "{l}" agora é seu.', 'You bought "{n}"\'s property: lot "{l}" is now yours.'), { n: x.name, l: LOTS18[lot].name }));
  return null;
}
// lote de vizinho só aceita obra depois da compra
LOTGATE19.push((s, lot) => (nb19(s).some((x) => x.lot === lot) ? l('Esse lote é de um vizinho. Compre o imóvel quando estiver à venda.', 'That lot belongs to a neighbour. Buy it when it is for sale.') : null));

export function nbPop19(s: GameState, lot: number): Pop19 | null {
  const x = nb19(s).find((v) => v.lot === lot);
  if (!x) return null;
  const d = NB19[x.k];
  const rows: PopRow19[] = [{ k: l('Lote', 'Lot'), v: LOTS18[lot].name, why: ['w19.lot', { lot }] }, { k: l('Bairro', 'Area'), v: hoodStats19(s).h.n, why: ['h19.hood', {}] }];
  if (x.sale) rows.push({ k: l('Preço pedido', 'Asking price'), v: $k(x.price), why: ['h19.hood', {}] });
  const acts: PopAct19[] = [];
  acts.push({ id: 'go', label: d.go.label ?? l('Abrir', 'Open'), go: x.who ? { area: 'labels', label: d.go.label } : d.go, tone: 'ghost' });
  acts.push({ id: 'buy', label: l('Comprar o imóvel', 'Buy the property'), cost: x.price, tone: 'primary', dis: !x.sale ? (x.k === 'rival' ? l('A rival não vende o escritório.', 'The rival won\'t sell its office.') : l('Não está à venda este ano.', 'Not for sale this year.')) : s.player.cash < x.price ? l('Caixa insuficiente.', 'Not enough cash.') : undefined, confirm: l('Comprar? O vizinho sai e o lote fica livre para você construir.', 'Buy? The neighbour moves out and the lot is free for you to build on.') });
  return { kind: 'lot', id: `nb:${lot}`, title: x.name, icon: d.icon, tags: [l('Vizinho', 'Neighbour'), x.k === 'records' && s.year < 1910 ? l('Loja de partituras e fonógrafos', 'Sheet-music and phonograph shop') : d.n, x.sale ? l('À venda', 'For sale') : l('Não está à venda', 'Not for sale')], rows, notes: [{ t: l('Vizinhos dão vida à rua. Comprar o imóvel libera o lote para você.', 'Neighbours bring the street to life. Buying frees the lot for you.') }], acts, opts: [] };
}

// ---------------------------------------------------------------- marcos da cidade

export const lmNow19 = (s: GameState, year = s.year): Landmark19[] => landmarksAt19(s.config.homeCity, year);
export function lmPop19(s: GameState, id: string, year = s.year): Pop19 | null {
  const x = lmNow19(s, year).find((v) => v.id === id);
  if (!x) return null;
  const rows: PopRow19[] = [{ k: l('Desde', 'Since'), v: x.from < 0 ? `${-x.from} a.C.` : String(x.from) }];
  if (x.to) rows.push({ k: l('Até', 'Until'), v: String(x.to) });
  const notes: Pop19['notes'] = [{ t: x.fact }];
  const acts: PopAct19[] = [];
  if (x.music === 'venue' || x.music === 'stadium') {
    notes.push({ t: l('Casa lendária da cidade: suas casas de shows aqui ganham +0,5 de prestígio por ano (a cena gira em volta dela).', 'A legendary city venue: your venues here gain +0.5 prestige a year (the scene orbits it).'), tone: 'good' });
    acts.push({ id: 'go', label: l('Marcar show aqui', 'Book a show here'), go: { area: 'tour12', label: l('Shows e turnês', 'Shows and tours') }, tone: 'primary' });
  }
  if (x.music === 'studio') notes.push({ t: l('Estúdio lendário: o bairro atrai músicos de sessão (clima da cena +4).', 'Legendary studio: the area draws session players (scene vibe +4).'), tone: 'good' });
  return { kind: 'lot', id: `lm:${x.id}`, title: x.n, icon: 'star', tags: [l('Marco da cidade', 'City landmark')], rows, notes, acts, opts: [] };
}

// ---------------------------------------------------------------- eventos do bairro

export const EV19: Record<EvK, { n: L; d: L; ch: [string, L, L][] }> = {
  noise: { n: l('Reclamação de barulho', 'Noise complaint'), d: l('Os vizinhos reclamam do som até tarde.', 'The neighbours complain about late-night sound.'),
    ch: [['fix', l('Isolamento acústico', 'Soundproofing'), l('Paga a obra; ninguém mais reclama.', 'Pay for it; no more complaints.')], ['ignore', l('Ignorar', 'Ignore'), l('−1 reputação institucional.', '−1 institutional reputation.')]] },
  party: { n: l('Festa de rua', 'Block party'), d: l('O bairro fecha a rua para uma festa.', 'The block closes the street for a party.'),
    ch: [['sponsor', l('Patrocinar o palco', 'Sponsor the stage'), l('+1 reputação comercial; o elenco local relaxa (−2 estresse).', '+1 commercial reputation; the local roster relaxes (−2 stress).')], ['skip', l('Só assistir', 'Just watch'), l('Nada muda.', 'Nothing changes.')]] },
  shoot: { n: l('Filmagem na rua', 'Film shoot'), d: l('Uma produção quer filmar a sua fachada.', 'A production wants to film your façade.'),
    ch: [['allow', l('Liberar a fachada', 'Allow it'), l('Recebe um cachê de locação.', 'You get a location fee.')], ['refuse', l('Recusar', 'Refuse'), l('Nada muda.', 'Nothing changes.')]] },
  mural: { n: l('Mural do seu astro', 'Mural of your star'), d: l('Um grafiteiro quer pintar o seu maior artista numa empena.', 'A street artist wants to paint your biggest act on a wall.'),
    ch: [['pay', l('Pagar o artista', 'Pay the artist'), l('+1 reputação com artistas; fãs passam a visitar.', '+1 artist reputation; fans start to visit.')], ['paint', l('Deixar apagar', 'Let it be painted over'), l('Nada muda.', 'Nothing changes.')]] },
  pilgrim: { n: l('Romaria de fãs', 'Fan pilgrimage'), d: l('Fãs fazem fila na porta da sede para tirar foto.', 'Fans queue at the HQ door for photos.'),
    ch: [['open', l('Abrir as portas por um dia', 'Open the doors for a day'), l('+1 reputação comercial.', '+1 commercial reputation.')], ['guard', l('Contratar segurança', 'Hire security'), l('Paga a segurança; sem efeito na fama.', 'Pay for security; no effect on fame.')]] },
  flood: { n: l('Enchente', 'Flood'), d: l('A chuva forte alaga a rua da sede.', 'Heavy rain floods the HQ street.'),
    ch: [['pump', l('Bombas e sacos de areia', 'Pumps and sandbags'), l('Paga agora; o prédio escapa.', 'Pay now; the building is spared.')], ['wait', l('Esperar baixar', 'Wait it out'), l('O prédio é danificado (reforma depois).', 'The building gets damaged (renovate later).')]] },
};
const evCost19 = (s: GameState, k: EvK, c: string): number => (k === 'noise' && c === 'fix' ? money(s, 4000) : k === 'party' && c === 'sponsor' ? money(s, 1500) : k === 'pilgrim' && c === 'guard' ? money(s, 800) : k === 'flood' && c === 'pump' ? money(s, 2500) : 0);
export const live19ev = (s: GameState): Ev19[] => hood19(s).evs.filter((e) => !e.done && mIdx(s) - e.s < 2);

function topAct(s: GameState) { return playerActs(s).map((id) => s.acts[id]).filter(Boolean).sort((a, b) => b.fame - a.fame)[0]; }
/** Sorteia (no máximo) um evento por mês, com semente própria. */
export function rollEv19(s: GameState): Ev19 | null {
  const st = hood19(s), m = mIdx(s);
  if (live19ev(s).length >= 2) return null;
  const r = Rng.fromSeed(`${s.config.seed}|hood19|${m}`);
  if (!r.chance(0.14)) return null;
  const bs = buildings18(s).filter((b) => b.zone === 'campus' && b.st === 'open');
  const loud = bs.find((b) => b.kind === 'venue' || b.kind === 'rehearsal' || b.kind === 'studio');
  const hs = hoodStats19(s), cl = CLIMATE19[s.config.homeCity];
  const top = topAct(s);
  const ok: [EvK, string, number][] = [];
  if (loud) ok.push(['noise', loud.id, hs.safety > 55 ? 3 : 2]);
  if ([5, 6, 7].includes(s.month) || [11, 0, 1].includes(s.month)) ok.push(['party', 'hq', 2]);
  if (s.year >= 1910) ok.push(['shoot', 'hq', 1]);
  if (top && top.fame >= 55 && s.year >= 1960) ok.push(['mural', 'hq', 2]);
  if ((top && top.fame >= 70) || s.player.reputation.commercial >= 65) ok.push(['pilgrim', 'hq', 2]);
  if ((cl?.rain ?? 0.25) >= 0.3 || hs.safety < 45) ok.push(['flood', 'hq', 1]);
  const fresh = ok.filter(([k]) => !st.evs.some((e) => e.k === k && m - e.s < 24));
  if (!fresh.length) return null;
  const tot = fresh.reduce((t, x) => t + x[2], 0);
  let u = r.float(0, tot), pick = fresh[0];
  for (const x of fresh) { if (u < x[2]) { pick = x; break; } u -= x[2]; }
  const e: Ev19 = { id: `ev${++st.seq}`, k: pick[0], at: pick[1], s: m };
  st.evs.push(e);
  if (st.evs.length > 30) st.evs.splice(0, st.evs.length - 30);
  log18(s, fmtL(l('No bairro: {n}.', 'In the area: {n}.'), { n: EV19[e.k].n }));
  return e;
}
export function evPop19(s: GameState, id: string): Pop19 | null {
  const e = live19ev(s).find((x) => x.id === id);
  if (!e) return null;
  const d = EV19[e.k];
  const acts: PopAct19[] = d.ch.map(([c, label]) => { const cost = evCost19(s, e.k, c); return { id: `ev:${c}`, label, cost: e.k === 'shoot' && c === 'allow' ? -money(s, 3000) : cost || undefined, tone: c === d.ch[0][0] ? 'primary' : 'ghost', dis: cost && s.player.cash < cost ? l('Caixa insuficiente.', 'Not enough cash.') : undefined }; });
  return { kind: 'lot', id: `ev:${e.id}`, title: d.n, icon: 'warning', tags: [l('Evento do bairro', 'Neighbourhood event')], rows: [], notes: [{ t: d.d }, ...d.ch.map(([, n, eff]) => ({ t: fmtL(l('{n}: {e}', '{n}: {e}'), { n, e: eff }) }))], acts, opts: [] };
}
export function actEv19(s: GameState, id: string, c: string): L | null {
  const e = live19ev(s).find((x) => x.id === id);
  if (!e) return l('Evento já passou.', 'The event is over.');
  const cost = evCost19(s, e.k, c);
  if (cost && s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
  if (cost) post(s, `hood19:${e.id}:${c}`, -cost, 'hq', `Bairro: ${EV19[e.k].n.pt}`);
  const rep = s.player.reputation;
  const local = () => playerActs(s).map((a) => s.acts[a]).filter((a) => a && a.city === s.config.homeCity).flatMap((a) => a.members);
  if (e.k === 'noise' && c === 'ignore') rep.institutional = clamp(rep.institutional - 1, 0, 100);
  if (e.k === 'party' && c === 'sponsor') { rep.commercial = clamp(rep.commercial + 1, 0, 100); for (const p of local()) addStress(s, p, -2, l('Festa de rua', 'Block party')); }
  if (e.k === 'shoot' && c === 'allow') post(s, `hood19:${e.id}:fee`, money(s, 3000), 'licensing', 'Cachê de locação (filmagem)');
  if (e.k === 'mural' && c === 'pay') {
    rep.artists = clamp(rep.artists + 1, 0, 100);
    const a = topAct(s);
    emitFact(s, { kind: 'campus_invest', actors: ['player', ...(a ? [a.id] : [])], place: s.config.homeCity, severity: 14, visibility: 'public', tags: ['good', 'campus', 'mural'], src: 'hood19', text: fmtL(l('Mural de {a} pintado no bairro de {c}.', 'A mural of {a} painted in {c}\'s neighbourhood.'), { a: a?.name ?? '?', c: s.config.companyName }) });
  }
  if (e.k === 'pilgrim' && c === 'open') rep.commercial = clamp(rep.commercial + 1, 0, 100);
  if (e.k === 'flood' && c === 'wait')
    emitFact(s, { kind: 'disaster', actors: ['player'], place: s.config.homeCity, severity: 35, visibility: 'public', tags: ['bad', 'flood', 'campus'], src: 'hood19', text: fmtL(l('Enchente alaga o térreo de {c}.', 'Flood swamps {c}\'s ground floor.'), { c: s.config.companyName }) });
  e.done = c;
  log18(s, fmtL(l('{n}: {c}.', '{n}: {c}.'), { n: EV19[e.k].n, c: EV19[e.k].ch.find((x) => x[0] === c)?.[1] ?? l('—', '—') }));
  return null;
}

// ---------------------------------------------------------------- mês e ano

registerSimHook('month', 'hood19', (s) => {
  const st = hood19(s), m = mIdx(s);
  // eventos não decididos em 2 meses: vale a segunda opção (a omissa)
  for (const e of st.evs) if (!e.done && m - e.s >= 2) { const c = EV19[e.k].ch[1][0]; actEv19Late(s, e, c); }
  rollEv19(s);
  const adj = rentAdj19(s);
  if (adj) post(s, `hood19:rent:${m}`, adj, 'hq', adj > 0 ? 'Bairro: aluguel abaixo da média' : 'Bairro: aluguel acima da média');
  if (hoodStats19(s).vibe >= 65) for (const a of playerActs(s).map((x) => s.acts[x]).filter((a) => a && a.city === s.config.homeCity)) for (const p of a.members) addStress(s, p, -1, l('Clima da cena no bairro', 'The area\'s scene vibe'));
});
function actEv19Late(s: GameState, e: Ev19, c: string): void { const keep = e.s; e.s = mIdx(s); actEv19(s, e.id, c); e.s = keep; }
registerSimHook('year', 'hood19y', (s) => {
  if (!lmNow19(s).some((x) => x.music === 'venue' || x.music === 'stadium')) return;
  for (const o of v17(s).own) if (vdef(o.id)?.city === s.config.homeCity) o.rep = clamp(o.rep + 0.5, 0, 100);
  const lv = liveOf(s).venue as { cityId?: string; rep?: number } | null;
  if (lv && lv.cityId === s.config.homeCity && typeof lv.rep === 'number') lv.rep = clamp(lv.rep + 0.5, 0, 100);
});
void campus18;
