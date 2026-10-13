// r27 (SONG) — MERCADO DE CANÇÕES. Uma página (Projetos › Mercado de canções) para comprar, ganhar, vender/dar e
// licenciar canções, montada sobre o que já existe — sem sistema paralelo:
//  • Comprar: uma vitrine que se renova todo mês com canções de compositores de fora — pluggers da Tin Pan Alley
//    (partitura), Brill Building, Nashville, casas de soul, compositores contratados, fábricas de hits, camps de topline
//    e inéditas de outros artistas (editoras da época: writers19.pubName19). A QUALIDADE É UMA FAIXA estimada (A&R e
//    produtor estreitam). Dois contratos: DIREITO DE GRAVAR (o autor e a editora dele ficam com a obra: você paga a
//    licença mecânica por cópia vendida, mês a mês) ou COMPRAR A OBRA (você vira a editora: a edição fica com o selo,
//    o autor continua recebendo a parte de autor — finance.payAuthors). A canção cai no repertório do ato e segue o
//    caminho normal (agenda/estúdio).
//  • Ganhar: amigos do seu ato (social8 actBond), parceiros de faixa e ídolos em fim de carreira dão ou oferecem
//    canções — sempre ao custo de um favor (holds17 / rede de favores r27 P2A): quem dá passa a ter crédito com você;
//    pedir sem laço não dá.
//  • Vender/dar: songsale.offerSong / closeSale e os pedidos de estrelas do camps18 (pitchSong18); dar de presente
//    fecha a venda sem cachê, aproxima os atos e deixa o outro te devendo.
//  • Licenças (covers): studio.makeCover (licença mecânica) + royalties mecânicos mensais aos autores originais; nos
//    EUA a licença é compulsória desde 1909 (Copyright Act), fora dela a editora precisa autorizar (rights18 já cobra
//    a autorização na gravação). Um cover pode superar o original (vira fato).
//  • Riscos: canção comprada parecida com outra (processo de plágio do writers19), compositor que vende a mesma canção
//    a dois atos (corrida para lançar) e a canção que você recusou virando hit na voz de outro (fato + manchete).
// Determinístico: só Rng.fromSeed(semente|songmkt27|…); nada sorteia nos fluxos compartilhados. Sem ato do jogador,
// o gancho mensal não faz nada. Os NPCs só gravam o que o jogador recusou/disputou (o mundo não muda sem ele).

import { clamp, Rng } from '../../core/rng';
import { cityById, familyOf, l, type FamilyId, type L, type NameGroup } from '../../data/world';
import { workOf27 } from '../../data/model27';
import { registerExt4, registerSimHook } from '../ext4';
import { emitFact } from '../facts17';
import { allHolds, grantHold, registerHoldEffect, useHold } from '../holds17';
import { pushInbox18, registerInboxKind } from '../inbox18';
import { launchNpcRelease } from '../market';
import { cashWhy20, freeCash20 } from '../oblig20';
import { actLang, makePerson, personName, songTitle } from '../people';
import { songQ } from '../production';
import { songStatus } from '../repertoire';
import { makeCover } from '../studio';
import type { Act, GameState, Release, Song } from '../types';
import { fmtL, money, nextId, playerActs, post, remember, staffSkill } from '../util';
import { standards } from './creation/core';
import { headline19 } from './factlink19';
import { homeMk18 } from './rights18';
import { actBond, social } from './social8';
import { canSell, closeSale, fairTerms } from './songsale';
import { settleVocals } from './vocals10';
import { ventures } from './ventures9';
import { openPlagSuit19, pubName19 } from './writers19';

export const SONGMKT27 = 'songmkt27';

// ---------------------------------------------------------------- tipos e estado

export type Src27 = 'tinpan' | 'brill' | 'nashville' | 'motown' | 'staff' | 'factory' | 'topline' | 'npc';
export type Deal27Kind = 'right' | 'work' | 'gift' | 'cover';
/** Uma canção à venda. `q` é a verdade (escondida: a página mostra a faixa estimada). */
export interface Lot27 {
  id: string; t: string; g: string; src: Src27; wn: string; wid?: string; pub: string; act?: string;
  q: number; mel: number; lyr: number; org: number;
  /** posição da verdade dentro da faixa estimada (0..1) e semente de pistas */
  u: number; h: number;
  fee: number; buy: number; until: number;
  /** riscos escondidos: parecida com outra canção (plágio), vendida também a outro ato */
  sim?: 1; dup?: string;
}
export interface Deal27 {
  id: string; k: Deal27Kind; song: string; act: string; t: string; wn: string; pub: string; fee: number; w: number;
  /** royalties mecânicos já pagos e unidades já cobradas (do lançamento `rel`) */
  paid: number; units: number; rel?: string;
  src?: string; from?: string;
  sim?: 1; plag?: 1; pd?: 1;
  dup?: { act: string; due: number; done?: 1 };
  beat?: 1;
}
export interface Gift27 { id: string; from: string; pid: string; to: string; t: string; q: number; why: Why27; until: number; asked?: 1 }
export interface Pass27 { t: string; q: number; wn: string; g: string; w: number; due: number; act?: string; rel?: string; told?: 1 }
export interface Mkt27 { lots: Lot27[]; m: number; deals: Deal27[]; gifts: Gift27[]; passed: Pass27[]; asked: Record<string, number>; seq: number; log: { w: number; t: L }[] }
export type Why27 = 'friend' | 'collab' | 'idol' | 'mentor';

declare module '../ext4' { interface Ext4 { songmkt27: Mkt27 } }
const fresh = (): Mkt27 => ({ lots: [], m: -1, deals: [], gifts: [], passed: [], asked: {}, seq: 0, log: [] });
registerExt4('songmkt27', fresh);
export function mkt27(s: GameState): Mkt27 {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.songmkt27 ??= fresh()) as Mkt27;
  for (const [k, v] of Object.entries(fresh())) (st as unknown as Record<string, unknown>)[k] ??= v;
  return st;
}
const rng = (s: GameState, ...k: (string | number)[]) => Rng.fromSeed(`${s.config.seed}|songmkt27|${k.join('|')}`);
const log = (s: GameState, t: L) => { const st = mkt27(s); st.log.push({ w: s.week, t }); if (st.log.length > 30) st.log.shift(); };
const monthKey = (s: GameState) => s.year * 12 + s.month;
const live = (a: Act | undefined): a is Act => !!a && a.status !== 'retired' && a.status !== 'split' && !a.deceased;
const npc = (a: Act | undefined): a is Act => live(a) && a.owner !== 'player' && !a.playerBand;
const lead = (s: GameState, a: Act) => s.persons[a.leaderId ?? a.members[0]];

// ---------------------------------------------------------------- fontes por época

export const SRC27: Record<Src27, { name: L; from: number; to: number; fam: FamilyId[] | null; mult: number; base: number; en: boolean; blurb: L }> = {
  tinpan: { name: l('Tin Pan Alley (partitura)', 'Tin Pan Alley (sheet music)'), from: 1885, to: 1955, fam: ['pop', 'blues_jazz', 'country_folk'], mult: 0.75, base: 56, en: true,
    blurb: l('O "plugger" toca a canção ao piano na loja da editora; quem grava primeiro ajuda a vender a partitura.', 'The plugger plays the song on the publisher\'s piano; whoever records it first helps sell the sheet music.') },
  brill: { name: l('Brill Building', 'Brill Building'), from: 1955, to: 1972, fam: ['pop', 'rock', 'rnb'], mult: 1, base: 60, en: true,
    blurb: l('Cubículos com piano em Nova York: duplas de compositores escrevendo sob encomenda para os grupos da vez.', 'Piano cubicles in New York: songwriting teams writing to order for the groups of the moment.') },
  nashville: { name: l('Nashville (Music Row)', 'Nashville (Music Row)'), from: 1950, to: 9999, fam: ['country_folk'], mult: 0.9, base: 58, en: true,
    blurb: l('Editoras do Music Row: a canção vem com demo e "plugger" que conhece cada produtor da cidade.', 'Music Row publishers: the song comes with a demo and a plugger who knows every producer in town.') },
  motown: { name: l('Casa de compositores do soul', 'Soul songwriting house'), from: 1959, to: 1976, fam: ['rnb', 'pop'], mult: 1.1, base: 62, en: true,
    blurb: l('Equipes da casa disputam quem emplaca o próximo single; controle de qualidade toda sexta.', 'In-house teams compete to land the next single; quality control every Friday.') },
  staff: { name: l('Compositor contratado de editora', 'Publisher staff writer'), from: 1900, to: 9999, fam: null, mult: 1, base: 55, en: false,
    blurb: l('A editora tem compositores fixos e manda pacotes de demos aos selos.', 'The publisher keeps staff writers and sends demo packs to labels.') },
  factory: { name: l('Fábrica de hits', 'Hit factory'), from: 1993, to: 2016, fam: ['pop', 'rnb', 'hiphop', 'electronic'], mult: 2.1, base: 63, en: true,
    blurb: l('Estúdios de Estocolmo e Los Angeles que escrevem refrões em série para as maiores vozes do pop.', 'Stockholm and Los Angeles studios writing choruses in series for pop\'s biggest voices.') },
  topline: { name: l('Camp de topline', 'Topline writing camp'), from: 2008, to: 9999, fam: null, mult: 1.5, base: 58, en: false,
    blurb: l('Produtores mandam a base, toplineres escrevem melodia e letra em um dia; muitas mãos em cada faixa.', 'Producers send the beat, topliners write melody and lyrics in a day; many hands on each track.') },
  npc: { name: l('Inédita de outro artista', 'Another artist\'s unreleased song'), from: 1920, to: 9999, fam: null, mult: 1.2, base: 0, en: false,
    blurb: l('Canção que um artista de outro selo escreveu e não vai gravar.', 'A song an artist on another label wrote and will not record.') },
};
export const srcsOf27 = (y: number): Src27[] => (Object.keys(SRC27) as Src27[]).filter((k) => y >= SRC27[k].from && y <= SRC27[k].to);

// ---------------------------------------------------------------- estimativa (A&R e produtor estreitam)

/** Habilidade de ouvido da casa: o melhor entre A&R e produtor da equipe. */
export const ear27 = (s: GameState): number => Math.max(staffSkill(s, 'anr'), staffSkill(s, 'producer') * 0.9, 0);
/** Largura da faixa estimada de qualidade (pontos). */
export const width27 = (s: GameState): number => Math.round(clamp(36 - ear27(s) * 0.3, 6, 36));
/** Faixa estimada — sempre contém a qualidade verdadeira. */
export function estimate27(s: GameState, lot: Pick<Lot27, 'q' | 'u'>): { lo: number; hi: number; w: number } {
  const w = width27(s);
  let lo = Math.round(lot.q - lot.u * w);
  lo = clamp(lo, 1, 100 - w);
  if (lo > lot.q) lo = Math.max(1, Math.floor(lot.q));
  return { lo, hi: Math.min(100, lo + w), w };
}
/** Pistas de risco que o seu ouvido pega (quanto melhor o A&R, mais aparece). */
export function hints27(s: GameState, lot: Lot27): L[] {
  const e = ear27(s), out: L[] = [];
  if (lot.sim && e >= 35 + (lot.h % 45)) out.push(l('O refrão lembra muito outra canção (risco de plágio).', 'The chorus sounds a lot like another song (plagiarism risk).'));
  if (lot.dup && e >= 45 + ((lot.h >> 3) % 45)) out.push(l('Boato: o compositor mostrou esta canção a outro ato.', 'Rumor: the writer showed this song to another act.'));
  return out;
}

// ---------------------------------------------------------------- vitrine (renova todo mês)

function myFams(s: GameState): FamilyId[] {
  return playerActs(s).map((id) => s.acts[id]).filter(live).map((a) => familyOf(a.genre));
}
function genreFor(s: GameState, r: Rng, fam: FamilyId): string {
  const mine = playerActs(s).map((id) => s.acts[id]).filter((a) => live(a) && familyOf(a.genre) === fam);
  if (mine.length) return r.pick(mine).genre;
  const any = Object.values(s.acts).filter((a) => live(a) && familyOf(a.genre) === fam);
  return any.length ? r.pick(any.slice(0, 200)).genre : (playerActs(s).map((id) => s.acts[id]).find(live)?.genre ?? 'pop');
}

export function priceOf27(s: GameState, src: Src27, q: number, fame = 0): { fee: number; buy: number } {
  const fee = money(s, (500 + q * q * 0.3 + fame * 25) * SRC27[src].mult);
  return { fee, buy: Math.round(fee * (2.5 + q / 50)) };
}

function genLots(s: GameState): Lot27[] {
  const r = rng(s, 'lots', monthKey(s));
  const st = mkt27(s);
  const fams = myFams(s);
  const srcs = srcsOf27(s.year);
  const home = (cityById[s.config.homeCity]?.lang ?? 'en') as NameGroup;
  const out: Lot27[] = [];
  const n = r.int(6, 9);
  const writers = Object.values(s.acts).filter((a) => npc(a) && a.fame >= 8 && a.debutYear <= s.year).slice(0, 600);
  for (let i = 0; i < n && srcs.length; i++) {
    const fam: FamilyId = fams.length && r.chance(0.75) ? r.pick(fams) : r.pick(['pop', 'rock', 'rnb', 'country_folk', 'blues_jazz', 'hiphop', 'electronic', 'latin', 'brazil'] as FamilyId[]);
    const okSrc = srcs.filter((k) => !SRC27[k].fam || SRC27[k].fam!.includes(fam));
    let src = okSrc.length ? r.pick(okSrc) : r.pick(srcs);
    // inédita de outro artista: só de quem compõe bem (comp 45+) no gênero; senão, compositor de editora
    const pool = src === 'npc' ? writers.filter((a) => familyOf(a.genre) === fam && (lead(s, a)?.skills.comp ?? 0) >= 45) : [];
    const a = pool.length ? r.pick(pool) : undefined;
    const p = a && lead(s, a);
    if (src === 'npc' && (!a || !p?.alive)) src = 'staff';
    let wn = '', wid: string | undefined, act: string | undefined, pub = '', q = 0, fame = 0, lang: NameGroup = SRC27[src].en ? 'en' : home;
    if (src === 'npc' && a && p) {
      wn = p.name; wid = p.id; act = a.id; fame = a.fame; lang = actLang(a);
      pub = (a.owner && s.labels[a.owner]?.name) || l('Edição própria', 'Self-published').pt;
      q = clamp(28 + p.skills.comp * 0.6 + r.normal(0, 8), 25, 95);
    } else {
      wn = personName(r, lang);
      pub = pubName19(s, r);
      q = clamp(SRC27[src].base + r.normal(0, 12), 25, 95);
    }
    q = Math.round(q);
    const mel = clamp(q + r.normal(0, 5), 5, 100), lyr = clamp(q - 2 + r.normal(0, 6), 5, 100);
    const org = clamp((src === 'factory' || src === 'topline' ? 38 : 50) + r.normal(0, 14), 5, 95);
    const pr = priceOf27(s, src, q, fame);
    const sim = r.chance(src === 'topline' || src === 'factory' ? 0.1 : 0.06) ? 1 : undefined;
    const dupPool = r.chance(0.08) ? Object.values(s.acts).filter((a) => npc(a) && a.fame >= 20 && familyOf(a.genre) === fam).slice(0, 80) : [];
    out.push({
      id: `ml${++st.seq}`, t: songTitle(r, lang), g: genreFor(s, r, fam), src, wn, ...(wid ? { wid } : {}), pub, ...(act ? { act } : {}),
      q, mel: Math.round(mel), lyr: Math.round(lyr), org: Math.round(org), u: Math.round(r.next() * 100) / 100, h: r.int(0, 9999),
      fee: pr.fee, buy: pr.buy, until: s.week + 5, ...(sim ? { sim } : {}), ...(dupPool.length ? { dup: r.pick(dupPool).id } : {}),
    });
  }
  return out.sort((a, b) => a.fee - b.fee);
}

/** A vitrine do mês (gerada na primeira vez que alguém olha ou no gancho mensal). */
export function lots27(s: GameState): Lot27[] {
  const st = mkt27(s);
  if (st.m !== monthKey(s)) { st.m = monthKey(s); st.lots = playerActs(s).length ? genLots(s) : []; }
  return st.lots;
}

// ---------------------------------------------------------------- comprar

/** Cria a canção no repertório do ato (sem gastar inspiração nem ideias do ato). */
function newSong(s: GameState, act: Act, x: { t: string; mel: number; lyr: number; org: number; wid: string }): Song {
  const so: Song = {
    id: nextId(s, 's'), actId: act.id, title: x.t, genre: act.genre, writers: [x.wid], splits: [{ personId: x.wid, share: 1 }],
    melody: clamp(x.mel, 5, 100), lyrics: clamp(x.lyr, 5, 100), performance: 0, production: 0, originality: clamp(x.org, 5, 100),
    q: 0, recorded: false, createdWeek: s.week,
  };
  s.songs[so.id] = so;
  settleVocals(s, so);
  so.q = songQ({ ...so, performance: so.melody * 0.6, production: 30 });
  act.songs.push(so.id);
  return so;
}
function writerOf(s: GameState, r: Rng, lot: Lot27): string {
  if (lot.wid && s.persons[lot.wid]) return lot.wid;
  const p = makePerson(s, r, { lang: SRC27[lot.src].en ? 'en' : ((cityById[s.config.homeCity]?.lang ?? 'en') as NameGroup), role: 'keys', potential: clamp(lot.q + 8, 30, 99), born: s.year - r.int(24, 48), startFrac: 0.85, name: lot.wn });
  p.skills.comp = Math.max(p.skills.comp, Math.round(lot.mel)); p.skills.lyr = Math.max(p.skills.lyr, Math.round(lot.lyr));
  s.persons[p.id] = p;
  lot.wid = p.id;
  return p.id;
}
export function buyBlock27(s: GameState, lotId: string, actId: string, kind: 'right' | 'work'): L | null {
  const lot = mkt27(s).lots.find((x) => x.id === lotId), a = s.acts[actId];
  if (!lot || lot.until < s.week) return l('Essa canção saiu da vitrine.', 'That song is no longer on offer.');
  if (!a || !playerActs(s).includes(actId) || !live(a)) return l('Escolha um ato do seu elenco.', 'Pick an act from your roster.');
  const fee = kind === 'right' ? lot.fee : lot.buy;
  if (freeCash20(s) < fee) return cashWhy20(s, fee, l('Caixa insuficiente.', 'Not enough cash.'));
  return null;
}
/** Compra: direito de gravar (o autor fica com a obra) ou a obra inteira (você vira a editora). */
export function buyLot27(s: GameState, lotId: string, actId: string, kind: 'right' | 'work'): { ok: boolean; text: L; song?: string } {
  const b = buyBlock27(s, lotId, actId, kind);
  if (b) return { ok: false, text: b };
  const st = mkt27(s), lot = st.lots.find((x) => x.id === lotId)!, a = s.acts[actId];
  const r = rng(s, 'buy', lot.id);
  const fee = kind === 'right' ? lot.fee : lot.buy;
  post(s, `mkt27b:${lot.id}`, -fee, kind === 'work' ? 'publishing' : 'recording', kind === 'work' ? `Compra da obra "${lot.t}" (${lot.wn})` : `Licença para gravar "${lot.t}" (${lot.wn})`);
  const wid = writerOf(s, r, lot);
  const so = newSong(s, a, { t: lot.t, mel: lot.mel, lyr: lot.lyr, org: lot.org, wid });
  const w = s.persons[wid];
  if (w) w.rel.player = clamp((w.rel.player ?? 0) + 4, -100, 100);
  const d: Deal27 = { id: `md${++st.seq}`, k: kind, song: so.id, act: a.id, t: so.title, wn: lot.wn, pub: kind === 'work' ? s.config.companyName : lot.pub, fee, w: s.week, paid: 0, units: 0,
    ...(lot.sim ? { sim: 1 as const } : {}), ...(lot.dup && s.acts[lot.dup] ? { dup: { act: lot.dup, due: s.week + r.int(6, 14) } } : {}) };
  st.deals.push(d);
  st.lots = st.lots.filter((x) => x !== lot);
  if (kind === 'work') {
    // a editora do jogador (ventures9), se houver, passa a ter a obra no catálogo (sync, colocações)
    const v = ventures(s).list.find((x) => x.kind === 'publisher' && x.cat);
    if (v) v.cat!.push({ title: so.title, actId: a.id, y: s.year, v: money(s, 30 + lot.q * 3), wp: wid });
  }
  const t = fmtL(kind === 'work'
    ? l('{a}: "{t}", de {w}, é sua — a obra e a edição ficam com o selo; o autor recebe a parte de autor. Qualidade real: {q}.', '{a}: "{t}" by {w} is yours — the work and the publishing stay with the label; the writer keeps the writer share. Real quality: {q}.')
    : l('{a} vai gravar "{t}", de {w} ({p}). A obra fica com o autor: você paga a licença mecânica por cópia. Qualidade real: {q}.', '{a} will record "{t}" by {w} ({p}). The work stays with the writer: you pay the mechanical license per copy. Real quality: {q}.'),
  { a: a.name, t: so.title, w: lot.wn, p: lot.pub, q: Math.round(so.q) });
  emitFact(s, { kind: 'deal', actors: [a.id, wid, 'player'], severity: 10 + lot.q / 10, visibility: 'rumor', tags: ['songwriting', 'outside', 'songmkt', kind], text: t, src: 'songmkt27' });
  log(s, t);
  return { ok: true, text: t, song: so.id };
}

/** Passar: a canção sai da vitrine — e às vezes vira hit na voz de outro. */
export function passLot27(s: GameState, lotId: string): L {
  const st = mkt27(s), lot = st.lots.find((x) => x.id === lotId);
  if (!lot) return l('Essa canção saiu da vitrine.', 'That song is no longer on offer.');
  st.lots = st.lots.filter((x) => x !== lot);
  pass(s, { t: lot.t, q: lot.q, wn: lot.wn, g: lot.g }, `lot:${lot.id}`);
  return fmtL(l('Você passou "{t}".', 'You passed on "{t}".'), { t: lot.t });
}
function pass(s: GameState, x: { t: string; q: number; wn: string; g: string }, key: string): void {
  const r = rng(s, 'pass', key);
  if (!r.chance(clamp((x.q - 35) / 70, 0.05, 0.75))) return;
  const st = mkt27(s);
  st.passed.push({ ...x, w: s.week, due: s.week + r.int(4, 16) });
  if (st.passed.length > 20) st.passed.shift();
}

// ---------------------------------------------------------------- ganhar de outros artistas (presentes e pedidos)

export interface Friend27 { act: string; mine: string; bond: number; why: Why27; pid: string }
/** Atos de fora com laço com o seu: amizade (social8), parceria em faixa, mentoria ou ídolo em fim de carreira. */
export function friends27(s: GameState): Friend27[] {
  const mine = playerActs(s).map((id) => s.acts[id]).filter(live);
  const best = new Map<string, Friend27>();
  const add = (o: Act | undefined, m: Act, why: Why27, extra = 0) => {
    if (!npc(o)) return;
    const p = lead(s, o);
    if (!p?.alive) return;
    const bond = Math.round(clamp(actBond(s, m, o).v + extra, -100, 100));
    const k = `${o.id}|${m.id}`, prev = best.get(k);
    if (!prev || bond > prev.bond) best.set(k, { act: o.id, mine: m.id, bond, why, pid: p.id });
  };
  const byPerson = new Map<string, Act>();
  for (const a of Object.values(s.acts)) if (npc(a)) for (const pid of a.members) if (!byPerson.has(pid)) byPerson.set(pid, a);
  for (const m of mine) {
    const ms = new Set(m.members);
    for (const t of social(s).ties) {
      const me = ms.has(t.a) ? t.a : ms.has(t.b) ? t.b : '';
      if (!me || t.v < 10) continue;
      const o = byPerson.get(t.a === me ? t.b : t.a);
      if (o) add(o, m, t.k === 'mentor' ? 'mentor' : t.k === 'collab' ? 'collab' : o.fame >= 45 && s.year - o.debutYear >= 20 ? 'idol' : 'friend');
    }
    // parceria em faixa: autor ou produtor de fora nas faixas do seu ato
    for (const rid of m.releases.slice(-20)) for (const sid of s.releases[rid]?.songs ?? []) {
      const so = s.songs[sid];
      if (!so) continue;
      for (const pid of [...so.writers, ...(so.producerId ? [so.producerId] : [])]) if (!ms.has(pid)) add(byPerson.get(pid), m, 'collab', 25);
    }
  }
  return [...best.values()].sort((a, b) => b.bond - a.bond).slice(0, 24);
}
export const GIFT_MIN27 = 25;
/** Pedir uma canção: precisa de laço (amizade ≥25, parceria, mentoria) e de 6 meses entre pedidos. */
export function askBlock27(s: GameState, f: Friend27 | undefined): L | null {
  if (!f) return l('Sem relação com esse artista: ninguém dá canção a estranho.', 'No relationship with that artist: nobody gives a song to a stranger.');
  if (f.bond < (f.why === 'collab' || f.why === 'mentor' ? 5 : GIFT_MIN27)) return fmtL(l('O laço ainda é fraco ({b}); precisa de {m}+.', 'The bond is still weak ({b}); needs {m}+.'), { b: f.bond, m: GIFT_MIN27 });
  const last = mkt27(s).asked[f.act];
  if (last !== undefined && s.week - last < 26) return l('Você já pediu a esse artista há pouco tempo.', 'You asked this artist recently.');
  return null;
}
const favorOf = (s: GameState, pid: string) => allHolds(s).find((h) => h.status === 'open' && h.holder === 'player' && h.target === pid && (h.kind === 'favor' || h.kind === 'loyalty'));
/** Pede uma canção a um amigo: gasta um favor que ele te deve, ou passa a dever um. A canção chega em Ofertas. */
export function askSong27(s: GameState, npcActId: string, myActId: string): { ok: boolean; text: L } {
  const f = friends27(s).find((x) => x.act === npcActId && x.mine === myActId);
  const b = askBlock27(s, f);
  if (b || !f) return { ok: false, text: b ?? l('Inválido.', 'Invalid.') };
  const st = mkt27(s), o = s.acts[f.act], p = s.persons[f.pid];
  st.asked[f.act] = s.week;
  const fav = favorOf(s, f.pid);
  const r = rng(s, 'ask', f.act, s.week);
  const odds = clamp(0.35 + f.bond / 120 + (fav ? 0.3 : 0) + (f.why === 'mentor' ? 0.15 : 0), 0.1, 0.95);
  if (fav) {
    const u = useHold(s, fav.id, 'call');
    // favor nascido de uma canção que você deu: o efeito dele já manda a canção de volta
    if (fav.src === 'songmkt27' && u.ok) return { ok: true, text: u.text };
  } else grantHold(s, { holder: f.pid, target: 'player', kind: 'debt', strength: 30, months: 36, src: 'songmkt27', ref: `ask:${f.act}`, quiet: true, text: fmtL(l('Você pediu uma canção a {n}: agora deve um favor.', 'You asked {n} for a song: now you owe a favor.'), { n: p?.name ?? o.name }) });
  if (!r.chance(odds)) return { ok: false, text: fmtL(l('{a} não tem nada pronto agora ({p}% de chance){f}.', '{a} has nothing ready right now ({p}% chance){f}.'), { a: o.name, p: Math.round(odds * 100), f: fav ? l(' — e o favor foi gasto', ' — and the favor was spent') : '' }) };
  const g = newGift(s, r, f, true);
  return { ok: true, text: fmtL(l('{a} manda "{t}" para {m}. Está em Ofertas recebidas.', '{a} sends "{t}" to {m}. It is in Offers received.'), { a: o.name, t: g.t, m: s.acts[f.mine]?.name ?? '' }) };
}
function newGift(s: GameState, r: Rng, f: Friend27, asked: boolean): Gift27 {
  const st = mkt27(s), o = s.acts[f.act], p = s.persons[f.pid];
  const q = Math.round(clamp((p?.skills.comp ?? 50) * 0.9 + f.bond / 10 + r.normal(0, 6), 25, 95));
  const g: Gift27 = { id: `mg${++st.seq}`, from: f.act, pid: f.pid, to: f.mine, t: songTitle(r, actLang(o)), q, why: f.why, until: s.week + 8, ...(asked ? { asked: 1 as const } : {}) };
  st.gifts.push(g);
  if (st.gifts.length > 12) st.gifts.shift();
  pushInbox18(s, 'songmkt27_gift', { from: `${p?.name ?? o.name} (${o.name})`, subject: fmtL(l('{a} tem uma canção para {m}', '{a} has a song for {m}'), { a: o.name, m: s.acts[f.mine]?.name ?? '' }),
    body: fmtL(l('"{t}" (qualidade ~{q}). Presente: sem cachê, mas a obra fica com {w} e você passa a dever um favor. Recusar esfria a amizade.', '"{t}" (quality ~{q}). A gift: no fee, but the work stays with {w} and you will owe a favor. Declining cools the friendship.'), { t: g.t, q, w: p?.name ?? o.name }),
    ref: { g: g.id }, weeks: 8, actions: [{ id: 'take', label: l('Aceitar', 'Accept') }, { id: 'no', label: l('Recusar', 'Decline') }] });
  return g;
}
export function acceptGift27(s: GameState, giftId: string): { ok: boolean; text: L; song?: string } {
  const st = mkt27(s), g = st.gifts.find((x) => x.id === giftId), o = g && s.acts[g.from], a = g && s.acts[g.to], p = g && s.persons[g.pid];
  if (!g || !o || !a || !p || g.until < s.week || !live(a)) { if (g) st.gifts = st.gifts.filter((x) => x !== g); return { ok: false, text: l('Oferta encerrada.', 'Offer closed.') }; }
  st.gifts = st.gifts.filter((x) => x !== g);
  const r = rng(s, 'gift', g.id);
  const so = newSong(s, a, { t: g.t, mel: g.q + r.normal(0, 4), lyr: g.q - 2 + r.normal(0, 4), org: 45 + r.normal(0, 12), wid: p.id });
  st.deals.push({ id: `md${++st.seq}`, k: 'gift', song: so.id, act: a.id, t: so.title, wn: p.name, pub: (o.owner && s.labels[o.owner]?.name) || o.name, fee: 0, w: s.week, paid: 0, units: 0, from: o.id });
  if (!g.asked) grantHold(s, { holder: p.id, target: 'player', kind: 'debt', strength: 35, months: 48, src: 'songmkt27', ref: `gift:${g.id}`, quiet: true, text: fmtL(l('{n} deu "{t}" a {a}: você deve um favor.', '{n} gave "{t}" to {a}: you owe a favor.'), { n: p.name, t: so.title, a: a.name }) });
  for (const x of a.members) for (const y of o.members) if (x !== y && s.persons[x]?.alive) { const pp = s.persons[x]; pp.rel[y] = clamp((pp.rel[y] ?? 0) + 3, -100, 100); }
  const t = fmtL(l('{a} recebe "{t}" de {o}. Qualidade real: {q}. Grave pela agenda/estúdio.', '{a} receives "{t}" from {o}. Real quality: {q}. Record it via the schedule/studio.'), { a: a.name, t: so.title, o: o.name, q: Math.round(so.q) });
  emitFact(s, { kind: 'deal', actors: [o.id, a.id, 'player'], severity: 12 + o.fame / 6, visibility: 'rumor', tags: ['good', 'songwriting', 'gift', 'songmkt'], text: t, src: 'songmkt27' });
  log(s, t);
  return { ok: true, text: t, song: so.id };
}
export function declineGift27(s: GameState, giftId: string): L {
  const st = mkt27(s), g = st.gifts.find((x) => x.id === giftId), o = g && s.acts[g.from];
  if (!g) return l('Oferta encerrada.', 'Offer closed.');
  st.gifts = st.gifts.filter((x) => x !== g);
  const p = s.persons[g.pid];
  if (p) p.rel.player = clamp((p.rel.player ?? 0) - 6, -100, 100);
  pass(s, { t: g.t, q: g.q, wn: p?.name ?? '', g: o?.genre ?? 'pop' }, `gift:${g.id}`);
  return fmtL(l('Você recusou a canção de {o}.', 'You declined {o}\'s song.'), { o: o?.name ?? '?' });
}

// ---------------------------------------------------------------- vender / dar

const OWNED: Deal27Kind[] = ['right', 'gift', 'cover'];
/** Canção que o seu ato só tem o direito de gravar (a obra é de outro): não pode ser vendida adiante. */
export const licensed27 = (s: GameState, songId: string): Deal27 | undefined => mkt27(s).deals.find((d) => d.song === songId && OWNED.includes(d.k));
export function sellBlock27(s: GameState, songId: string): L | null {
  if (licensed27(s, songId)) return l('A obra não é sua (só o direito de gravar): não dá para vender.', 'The work is not yours (only the right to record): you cannot sell it.');
  const so = s.songs[songId];
  if (so?.coverOf) return l('Cover: a obra é de outro autor.', 'Cover: the work belongs to another writer.');
  return canSell(s, songId);
}
/** Inéditas do seu elenco que você pode vender ou dar. */
export function sellable27(s: GameState): Song[] {
  const out: Song[] = [];
  for (const id of playerActs(s)) for (const sid of s.acts[id]?.songs ?? []) { const so = s.songs[sid]; if (so && !sellBlock27(s, sid)) out.push(so); }
  return out.sort((a, b) => b.q - a.q).slice(0, 40);
}
/** Dar de presente: sem cachê (royalties seguem), aproxima os atos e o outro passa a te dever um favor. */
export function giveSong27(s: GameState, songId: string, targetId: string): { ok: boolean; text: L } {
  const b = sellBlock27(s, songId), so = s.songs[songId], o = s.acts[targetId];
  if (b) return { ok: false, text: b };
  if (!so || !npc(o)) return { ok: false, text: l('Artista inválido.', 'Invalid artist.') };
  const r = rng(s, 'give', songId, targetId);
  const fair = fairTerms(s, so, o.id);
  const sale = closeSale(s, r, songId, o.id, { fee: 0, royalty: fair.royalty, labelShare: 0.5 });
  if (!sale) return { ok: false, text: l('Algo deu errado.', 'Something went wrong.') };
  const mine = s.acts[so.actId], p = lead(s, o);
  if (mine) for (const x of mine.members) for (const y of o.members) if (x !== y && s.persons[y]?.alive) { const py = s.persons[y]; py.rel[x] = clamp((py.rel[x] ?? 0) + 8, -100, 100); }
  if (p) grantHold(s, { holder: 'player', target: p.id, kind: 'favor', strength: clamp(30 + so.q / 3, 20, 70), months: 60, src: 'songmkt27', ref: `give:${sale.id}`, quiet: true, text: fmtL(l('{n} te deve um favor: você deu "{t}" a {a}.', '{n} owes you a favor: you gave "{t}" to {a}.'), { n: p.name, t: so.title, a: o.name }) });
  const t = fmtL(l('Presente: {a} grava "{t}". Sem cachê, royalties de {r}% seguem — e {a} fica te devendo.', 'A gift: {a} records "{t}". No fee, {r}% royalties keep flowing — and {a} owes you.'), { a: o.name, t: so.title, r: (fair.royalty * 100).toFixed(1) });
  emitFact(s, { kind: 'deal', actors: [o.id, so.actId, 'player'], severity: 15 + o.fame / 5, visibility: 'public', tags: ['good', 'songwriting', 'gift', 'songmkt'], text: t, src: 'songmkt27' });
  log(s, t);
  return { ok: true, text: t };
}

// ---------------------------------------------------------------- licenças (covers) e royalties mecânicos

/** Taxa mecânica compulsória dos EUA (centavos nominais por canção por cópia) — Copyright Act de 1909 em diante. */
const US_MECH27: [number, number][] = [[1909, 2], [1978, 2.75], [1981, 4], [1986, 5], [1988, 5.25], [1990, 5.7], [1992, 6.25], [1994, 6.6], [1996, 6.95], [1998, 7.1], [2000, 7.55], [2002, 8], [2004, 8.5], [2006, 9.1], [2022, 12], [2023, 12.4]];
export function mechRate27(s: GameState): { cents: number; compulsory: boolean; why: L } {
  let c = 2;
  for (const [y, v] of US_MECH27) if (s.year >= y) c = v;
  const us = homeMk18(s) === 'na';
  if (us && s.year >= 1909) return { cents: c, compulsory: true, why: fmtL(l('EUA: licença compulsória desde 1909 — qualquer um pode gravar uma canção já lançada pagando {c}¢ por cópia.', 'US: compulsory license since 1909 — anyone may record a released song paying {c}¢ per copy.'), { c }) };
  return { cents: Math.round(c * 1.1 * 10) / 10, compulsory: false, why: l('Fora dos EUA: a editora da obra precisa autorizar (o pedido sai quando você grava); a taxa segue a tabela da sociedade (≈8% do preço ao lojista).', 'Outside the US: the work\'s publisher must authorize (the request goes out when you record); the rate follows the society\'s table (≈8% of dealer price).') };
}
export interface Coverable27 { song: Song; rel: Release; act?: Act; writers: string[]; oy: number; pd: boolean; covers: number; why: 'standard' | 'hit' }
let cvMemo: { k: string; v: Coverable27[] } | null = null;
/** Canções já lançadas que seu ato pode regravar: standards (20+ anos) e sucessos recentes de outros selos. */
export function coverables27(s: GameState): Coverable27[] {
  const k = `${s.config.seed}|${s.week}|${Object.keys(s.releases).length}`;
  if (cvMemo?.k === k) return cvMemo.v;
  const mine = new Set(playerActs(s));
  const seen = new Set<string>();
  const out: Coverable27[] = [];
  const add = (so: Song | undefined, rel: Release | undefined, why: Coverable27['why'], pd = false, covers = 0) => {
    if (!so || !rel || seen.has(so.id) || mine.has(so.actId) || so.coverOf) return;
    const act = s.acts[so.actId];
    if (act?.owner === 'player' || act?.playerBand) return;
    seen.add(so.id);
    const w = workOf27(so.title, act?.name);
    const writers = w?.w ?? so.writers.map((id) => s.persons[id]?.name).filter((x): x is string => !!x);
    out.push({ song: so, rel, act, writers, oy: w?.oy ?? rel.year, pd, covers, why });
  };
  for (const x of standards(s, 14)) add(x.song, x.rel, 'standard', x.pd, x.covers);
  for (const ce of s.charts.singles.slice(0, 25)) { const rel = s.releases[ce.releaseId]; add(s.songs[rel?.songs[0] ?? ''], rel, 'hit'); }
  cvMemo = { k, v: out.slice(0, 30) };
  return cvMemo.v;
}
export function coverQuote27(s: GameState, srcId: string): { fee: number; cents: number; compulsory: boolean; pd: boolean; why: L } {
  const m = mechRate27(s);
  const pd = coverables27(s).find((x) => x.song.id === srcId)?.pd ?? false;
  return { fee: money(s, 300), cents: pd ? 0 : m.cents, compulsory: m.compulsory, pd, why: pd ? l('Domínio público: sem royalties mecânicos.', 'Public domain: no mechanical royalties.') : m.why };
}
/** Licença de cover (studio.makeCover) + royalties mecânicos mensais aos autores originais. */
export function licenseCover27(s: GameState, srcId: string, actId: string): { ok: boolean; text: L; song?: string } {
  const a = s.acts[actId], src = s.songs[srcId];
  if (!a || !playerActs(s).includes(actId) || !live(a)) return { ok: false, text: l('Escolha um ato do seu elenco.', 'Pick an act from your roster.') };
  if (!src?.releaseId) return { ok: false, text: l('Só canções já lançadas podem ser licenciadas.', 'Only released songs can be licensed.') };
  if (Object.values(s.songs).some((x) => x.coverOf === srcId && x.actId === actId && !x.releaseId)) return { ok: false, text: l('Esse cover já está no repertório.', 'That cover is already in the repertoire.') };
  const q = coverQuote27(s, srcId);
  const res = makeCover(s, actId, srcId);
  if (!('id' in res)) return { ok: false, text: res };
  const st = mkt27(s), o = s.acts[src.actId];
  const wn = src.writers.map((id) => s.persons[id]?.name).filter(Boolean).join(', ') || (o?.name ?? '?');
  st.deals.push({ id: `md${++st.seq}`, k: 'cover', song: res.id, act: actId, t: res.title, wn, pub: (o?.owner && s.labels[o.owner]?.name) || o?.name || '?', fee: q.fee, w: s.week, paid: 0, units: 0, src: srcId, ...(q.pd ? { pd: 1 as const } : {}) });
  const t = fmtL(l('{a} vai regravar "{t}" ({o}). Licença paga; {c}.', '{a} will re-record "{t}" ({o}). License paid; {c}.'), { a: a.name, t: src.title, o: o?.name ?? '?', c: q.pd ? l('domínio público', 'public domain') : fmtL(l('{c}¢ por cópia aos autores', '{c}¢ per copy to the writers'), { c: q.cents }) });
  log(s, t);
  return { ok: true, text: t, song: res.id };
}

/** Royalties mecânicos do mês: canções cuja obra é de outro (direito de gravar, presente, cover). */
export function settle27(s: GameState): void {
  const st = mkt27(s);
  for (const d of st.deals) {
    if (!OWNED.includes(d.k)) continue;
    const so = s.songs[d.song], rel = so?.releaseId ? s.releases[so.releaseId] : undefined;
    if (!so || !rel) continue;
    if (d.rel !== rel.id) { d.rel = rel.id; d.units = 0; }
    const du = Math.max(0, rel.totalUnits - d.units);
    d.units = rel.totalUnits;
    const src = d.src ? s.songs[d.src] : undefined;
    const cents = d.pd ? 0 : mechRate27(s).cents;
    const owed = Math.round(du * cents);
    if (owed <= 0) continue;
    post(s, `mkt27m:${d.id}:${s.year}:${s.month}`, -owed, 'rights', `Royalties mecânicos: "${d.t}" (${d.pub})`);
    d.paid += owed;
    // metade vai para o(s) autor(es) — a outra metade fica com a editora deles
    const sp = (src ?? so).splits?.length ? (src ?? so).splits! : (src ?? so).writers.map((w) => ({ personId: w, share: 1 / Math.max(1, (src ?? so).writers.length) }));
    for (const x of sp) if (s.persons[x.personId] && !s.persons[x.personId].isPlayer) s.personalCash[x.personId] = (s.personalCash[x.personId] ?? 0) + Math.round(owed * 0.5 * x.share);
  }
}

// ---------------------------------------------------------------- riscos (plágio, venda dupla, a que você recusou)

function risks(s: GameState, r: Rng): void {
  const st = mkt27(s);
  for (const d of st.deals) {
    const so = s.songs[d.song];
    if (!so) continue;
    const rel = so.releaseId ? s.releases[so.releaseId] : undefined;
    // parecida com outra canção: o processo chega quando sai
    if (d.sim && !d.plag && rel) { d.plag = 1; if (openPlagSuit19(s, r, so)) log(s, fmtL(l('"{t}" lembrava outra canção — processo de plágio aberto.', '"{t}" sounded like another song — plagiarism suit filed.'), { t: so.title })); }
    // o compositor vendeu a mesma canção a outro ato: quem lançar primeiro leva
    if (d.dup && !d.dup.done) {
      const o = s.acts[d.dup.act];
      if (!npc(o)) { d.dup.done = 1; continue; }
      if (rel) {
        d.dup.done = 1;
        const t = fmtL(l('{a} lançou "{t}" antes de {o}, que tinha comprado a mesma canção do mesmo compositor.', '{a} released "{t}" before {o}, who had bought the same song from the same writer.'), { a: s.acts[so.actId]?.name ?? '', t: so.title, o: o.name });
        emitFact(s, { kind: 'deal', actors: [so.actId, o.id, 'player'], severity: 25, visibility: 'public', tags: ['good', 'songwriting', 'race', 'songmkt'], text: t, src: 'songmkt27' });
        log(s, t);
      } else if (s.week >= d.dup.due) {
        d.dup.done = 1;
        const cp: Song = { ...so, id: nextId(s, 's'), actId: o.id, genre: o.genre, recorded: true, releaseId: undefined, vault: false, createdWeek: s.week,
          performance: clamp(45 + o.fame / 2 + r.normal(0, 6), 5, 100), production: clamp(55 + r.normal(0, 8), 5, 100) };
        cp.q = songQ(cp);
        s.songs[cp.id] = cp; o.songs.push(cp.id);
        launchNpcRelease(s, r, o, o.owner ?? 'indie', [cp.id], 'single', 3000 + o.fame * 80);
        so.originality = clamp(so.originality - 20, 5, 100);
        so.q = songQ(so.recorded ? so : { ...so, performance: so.melody * 0.6, production: 30 });
        const t = fmtL(l('{o} lançou "{t}" primeiro — o compositor tinha vendido a mesma canção aos dois. A sua versão chega como "a outra".', '{o} released "{t}" first — the writer had sold the same song to both. Your version arrives as "the other one".'), { o: o.name, t: so.title });
        emitFact(s, { kind: 'deal', actors: [o.id, so.actId, 'player'], severity: 30, visibility: 'public', tags: ['bad', 'songwriting', 'race', 'songmkt'], text: t, src: 'songmkt27' });
        headline19(s, t, 2);
        remember(s, 'songmkt27_race', t, { actId: so.actId, important: true });
        log(s, t);
      }
    }
    // cover que supera o original
    if (d.k === 'cover' && rel && !d.beat && rel.peak > 0) {
      const src = s.songs[d.src ?? ''], orel = src?.releaseId ? s.releases[src.releaseId] : undefined;
      if (orel && (orel.peak <= 0 || rel.peak < orel.peak) && rel.peak <= 20) {
        d.beat = 1;
        const t = fmtL(l('O cover de "{t}" por {a} chegou ao #{p} — mais alto que o original ({o}).', '{a}\'s cover of "{t}" reached #{p} — higher than the original ({o}).'), { t: src!.title, a: s.acts[so.actId]?.name ?? '', p: rel.peak, o: orel.peak > 0 ? `#${orel.peak}` : l('fora das paradas', 'never charted') });
        emitFact(s, { kind: 'deal', actors: [so.actId, src!.actId, 'player'], severity: 25, visibility: 'public', tags: ['good', 'cover', 'songmkt'], text: t, src: 'songmkt27' });
        remember(s, 'songmkt27_cover', t, { actId: so.actId, important: true });
        log(s, t);
      }
    }
  }
  // a canção que você recusou: outro grava; se virar hit, todo mundo fica sabendo
  for (const p of st.passed) {
    if (!p.act && s.week >= p.due) {
      const pool = Object.values(s.acts).filter((a) => npc(a) && a.fame >= 15 && familyOf(a.genre) === familyOf(p.g)).slice(0, 120);
      const o = pool.length ? r.pick(pool) : undefined;
      if (!o) { p.told = 1; p.act = ''; continue; }
      const so: Song = { id: nextId(s, 's'), actId: o.id, title: p.t, genre: o.genre, writers: [], melody: p.q, lyrics: p.q, performance: clamp(45 + o.fame / 2 + r.normal(0, 6), 5, 100), production: clamp(55 + r.normal(0, 8), 5, 100), originality: 50, q: 0, recorded: true, createdWeek: s.week };
      so.q = songQ(so);
      s.songs[so.id] = so; o.songs.push(so.id);
      const rel = launchNpcRelease(s, r, o, o.owner ?? 'indie', [so.id], 'single', 3000 + o.fame * 80);
      p.act = o.id; p.rel = rel.id;
    }
    const rel = p.rel ? s.releases[p.rel] : undefined;
    if (rel && !p.told && rel.peak > 0 && rel.peak <= 10) {
      p.told = 1;
      const t = fmtL(l('"{t}", a canção que você recusou, virou hit na voz de {a} (#{p}).', '"{t}", the song you passed on, became a hit for {a} (#{p}).'), { t: p.t, a: s.acts[p.act ?? '']?.name ?? '?', p: rel.peak });
      emitFact(s, { kind: 'deal', actors: [p.act ?? '', 'player'], severity: 25, visibility: 'public', tags: ['songwriting', 'missed', 'songmkt'], text: t, src: 'songmkt27' });
      headline19(s, t, 2);
      remember(s, 'songmkt27_missed', t, { important: true });
      log(s, t);
    }
  }
  st.passed = st.passed.filter((p) => !p.told || s.week - p.w < 104);
}

// ---------------------------------------------------------------- mês

function giftsMonth(s: GameState, r: Rng): void {
  const st = mkt27(s);
  st.gifts = st.gifts.filter((g) => g.until >= s.week);
  if (st.gifts.length >= 2 || !r.chance(0.07)) return;
  const fs = friends27(s).filter((f) => !askBlock27(s, f) && !st.gifts.some((g) => g.from === f.act));
  const f = r.weighted(fs, (x) => x.bond);
  if (f) { st.asked[f.act] = s.week; newGift(s, r, f, false); }
}
/** Etapa mensal (exportada para testes). */
export function month27(s: GameState): void {
  if (!playerActs(s).length) return;
  const r = rng(s, 'month', s.week);
  settle27(s);
  risks(s, r);
  giftsMonth(s, r);
  lots27(s);
  const st = mkt27(s);
  st.lots = st.lots.filter((x) => x.until >= s.week || st.m === monthKey(s));
  st.deals = st.deals.slice(-80);
}
registerSimHook('month', 'songmkt27', (s) => month27(s));

// ---------------------------------------------------------------- caixa de entrada e favores

registerInboxKind('songmkt27_gift', { label: l('Canção de presente', 'Song gift'), cat: 'deals', icon: 'pen', prio: 1,
  goto: () => ({ area: SONGMKT27, tab: [SONGMKT27, 'offers'] }),
  handle: (s, m, act) => (act === 'take' ? acceptGift27(s, String(m.ref?.g ?? '')).text : declineGift27(s, String(m.ref?.g ?? ''))) });
// cobrar o favor de quem recebeu uma canção sua (quadro de favores): ele manda uma canção de volta
registerHoldEffect('songmkt27', (s, h, verb, r) => {
  if (verb !== 'call' || h.holder !== 'player') return null;
  const o = Object.values(s.acts).find((a) => npc(a) && a.members.includes(h.target));
  const mine = playerActs(s).map((id) => s.acts[id]).find(live);
  if (!o || !mine) return null;
  const g = newGift(s, r, { act: o.id, mine: mine.id, bond: 30, why: 'friend', pid: h.target }, true);
  return fmtL(l('{a} retribui com uma canção: "{t}" está em Ofertas recebidas.', '{a} pays back with a song: "{t}" is in Offers received.'), { a: o.name, t: g.t });
});

// ---------------------------------------------------------------- resumo para a página

export function summary27(s: GameState): { lots: number; deals: number; paid: number; gifts: number } {
  const st = mkt27(s);
  return { lots: st.lots.filter((x) => x.until >= s.week).length, deals: st.deals.length, paid: st.deals.reduce((t, d) => t + d.paid, 0), gifts: st.gifts.filter((g) => g.until >= s.week).length };
}
export const dealKind27: Record<Deal27Kind, L> = {
  right: l('Direito de gravar', 'Right to record'), work: l('Obra comprada', 'Work bought'), gift: l('Presente', 'Gift'), cover: l('Cover licenciado', 'Licensed cover'),
};
export const whyName27: Record<Why27, L> = { friend: l('Amizade', 'Friendship'), collab: l('Parceria', 'Collaboration'), idol: l('Ídolo', 'Idol'), mentor: l('Mentoria', 'Mentorship') };
export const statusOf27 = (s: GameState, d: Deal27): string => { const so = s.songs[d.song]; return so ? songStatus(s, so) : 'discarded'; };
