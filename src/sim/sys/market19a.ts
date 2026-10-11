// Rodada 19 (Frente 7, onda 3, T6 "market-a") — MERCADO A. Seis mecânicas ligadas à malha (fatos com ouvinte, porquê,
// calendário, ecos nas decisões, ligações do mês):
//  M8  Certificações por país e época (`cert_award`): entidade nacional por mercado com patamares da época e a fórmula
//      de streams (EUA: singles 9/5/2013, álbuns 1/2/2016 — limiares iguais). O jogador PEDE a auditoria (custa; real:
//      a gravadora paga a auditoria) ou "conta pacotes" (sobe um degrau; pode ser revogado). Alimenta imprensa, júri
//      (GRAMO_ADJ), valor do selo (prestígio do sale17), sucesso tardio (revival19) e a vitrine (hype do lançamento).
//  M7  Pesquisa de mercado (`track_test`): painel/focus group (1935+), teste regional (1950+), callout de rádio (1975+),
//      A/B no streaming (2012+). Custa, tem erro e viés (painel gosta do familiar), pode vazar; o single escolhido
//      ganha em paradas se a escolha for boa.
//  N12 "Perfeita para a playlist" (`ghost_tracks`, 2015+; plataforma fictícia, alegações tratadas como ficção):
//      faixas sem rosto em playlists de humor diluem gêneros calmos; proposta de compra fechada (buyout) ao selo.
//  N15 Contrato 360 de promotora (`star_360`, 2007+): estrela com contrato acabando recebe oferta da "Arena Nação";
//      cobrir (360 do selo), dividir (promotora fica com a estrada) ou deixar sair.
//  N21 Remédio antitruste em fusões (`antitrust_remedy`): fusão grande → regulador exige vender parte do catálogo;
//      leilão (lance baixo/justo/alto), contestar ou ficar de fora.
//  N23+E7 Ciclo de vida da cena (`scene_boom`/`scene_bust`): nasce → hype → corrida das majors → saturação → ressaca
//      → (anos depois) renascimento. Na corrida os adiantamentos inflam; na ressaca a cena vira turismo.
// Rng próprio `rng19(s, 'mka19')`; desligável para A/B de equilíbrio com `globalThis.__mka19Off`.

import { Rng, clamp } from '../../core/rng';
import { HIST_SCENES } from './world4/scenes';
import { SCENES17 } from '../../data/heritage17';
import { MARKETS, MARKET_PREF, cityById, familyOf, genreById, l, type L, type MarketId } from '../../data/world';
import { registerDeadline, type Deadline19 } from '../calendar19';
import { acceptOffer, defaultOffer, endContract, expectedAdvance, signWithRival } from '../contracts';
import { registerConseq18 } from '../decide18';
import { registerDecisionListener, registerExt4, registerMod, registerOfferMod, registerSimHook } from '../ext4';
import { registerExplain, type WhyPart } from '../explain18';
import { emitFact, onFact } from '../facts17';
import { pushInbox18, registerAdvisorTip, registerInboxKind } from '../inbox18';
import { rng19 } from '../rng19';
import type { Act, GameState, Label, Offer, Release } from '../types';
import { fmtL, money, playerActs, post, remember, staffSkill } from '../util';
import { spawnProceduralAct } from '../worldgen';
import { careers } from './careers12';
import { GRAMO_ADJ } from './ceremonies8';
import { headline19 } from './factlink19';
import { LINK18_PARTS, LINKS18, lk18 } from './links18';
import { realAct17 } from './realidx17';
import { REP_NOTES19, mix18 } from './report18';
import { stage19 } from './revival19';

const F = fmtL;
const usd = (c: number): string => `$${Math.round(c / 100).toLocaleString('en-US')}`;
const off = (): boolean => !!(globalThis as { __mka19Off?: boolean }).__mka19Off;
const mineRel = (s: GameState, r?: Release): boolean => !!r && (r.owner === 'player' || !!s.acts[r.actId]?.playerBand);
const mineAct = (a?: Act): boolean => !!a && (a.owner === 'player' || !!a.playerBand);
const isLabel = (s: GameState): boolean => s.config.role !== 'artist' && careers(s).active.includes('label');
const rng = (s: GameState): Rng => rng19(s, 'mka19', () => Rng.fromSeed(`${s.config.seed}|mka19|${s.week}`));
const log = (s: GameState, id: string, t: L): void => { const st = lk18(s); st.log.unshift([s.week, id, t]); if (st.log.length > 40) st.log.length = 40; };

// ================================================================ estado

export interface Test19 { id: string; act: string; w: number; m: TestM19; res: [string, number][]; best: string; pick?: string; how?: 'follow' | 'gut'; leak?: 1 }
export type ScPh19 = 0 | 1 | 2 | 3 | 4 | 5;
export interface Sc19 { k: string; ph: ScPh19; w: number; h: number; pk: number; sg: number; bust?: number; first: number }
export interface P36019 { act: string; w: number; end: number; k?: 'match' | 'partner' | 'let'; done?: 1 }
export interface Anti19 { id: string; b: string; rels: string[]; price: number; w: number; st: 'open' | 'won' | 'lost' | 'fund' | 'rival'; bid?: number; to?: string; y: number; why: L }
export interface MkA19 {
  /** certificações dadas: lançamento → mercado → nível (1 ouro, 2 platina, 1+n n× platina, 99 diamante) */
  c: Record<string, Partial<Record<MarketId, number>>>;
  /** do jogador, esperando auditoria: `rel|mk` → nível */
  pend: Record<string, number>;
  /** certificações "infladas" (pacotes contados): `rel|mk` → semana */
  inf: Record<string, number>;
  t: Test19[];
  sc: Record<string, Sc19>;
  /** acordo de faixas sem rosto do selo com a plataforma */
  gh?: { from: number; tracks: number; out?: number };
  /** fatia das playlists de humor tomada por faixas sem rosto (0–0,4) */
  ghN: number;
  ghCold?: number;
  p360: Record<string, P36019>;
  anti: Anti19[];
  seq: number;
  log: [number, number, L][];
  n: Record<string, number>;
  cd: Record<string, number>;
}
declare module '../ext4' { interface Ext4 { mka19: MkA19 } }
const fresh = (): MkA19 => ({ c: {}, pend: {}, inf: {}, t: [], sc: {}, ghN: 0, p360: {}, anti: [], seq: 0, log: [], n: {}, cd: {} });
registerExt4('mka19', fresh);
export function mka19(s: GameState): MkA19 {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.mka19 ??= fresh()) as MkA19;
  const f = fresh() as unknown as Record<string, unknown>, o = st as unknown as Record<string, unknown>;
  for (const k of Object.keys(f)) o[k] ??= f[k];
  return st;
}
const cnt = (s: GameState, k: string, d = 1) => { const n = mka19(s).n; n[k] = (n[k] ?? 0) + d; };
const logM = (s: GameState, t: L) => { const st = mka19(s); st.log.unshift([s.year, s.month, t]); if (st.log.length > 50) st.log.length = 50; };

export const LINKS19MA = [
  { id: 'cert', a: l('Vendas por país', 'Sales by country'), b: l('Imprensa, júri e valor do selo', 'Press, jury and label value'), how: l('Certificação nacional vira manchete, conta para o júri e para o prestígio no valor de venda; disco antigo certificado volta a esquentar.', 'A national certification makes headlines, counts for the jury and for prestige in the sale value; an old certified record heats up again.') },
  { id: 'research', a: l('Pesquisa de mercado', 'Market research'), b: l('Paradas', 'Charts'), how: l('Single escolhido por teste bem feito vende mais; o teste custa, erra e pode vazar.', 'A single picked by a good test sells more; testing costs, errs and may leak.') },
  { id: 'goldrush', a: l('Ciclo da cena', 'Scene life cycle'), b: l('Propostas e paradas', 'Offers and charts'), how: l('Na corrida das majors os adiantamentos inflam e a cena vende; na ressaca a cena cai nas paradas e vira turismo.', 'In the majors\' rush advances inflate and the scene sells; in the hangover it falls on the charts and becomes tourism.') },
  { id: 'ghost', a: l('Faixas sem rosto', 'Faceless tracks'), b: l('Streaming de gêneros calmos', 'Calm-genre streaming'), how: l('Playlists de humor cheias de faixas de produtora diluem quem faz ambient, lo-fi, clássico e trip hop.', 'Mood playlists packed with production-house tracks dilute ambient, lo-fi, classical and trip-hop artists.') },
  { id: 'star360', a: l('Promotora 360', '360 promoter'), b: l('Elenco e catálogo', 'Roster and catalog'), how: l('Estrela que sai para a promotora leva a âncora do catálogo; cobrir custa caro, dividir mantém os discos.', 'A star leaving for the promoter takes the catalog anchor; matching is pricey, splitting keeps the records.') },
  { id: 'antitrust', a: l('Fusões e regulador', 'Mergers and regulator'), b: l('Catálogo à venda', 'Catalog for sale'), how: l('Fusão grande obriga a vender parte do catálogo: leilão aberto ao seu selo, a fundos e a rivais.', 'A big merger forces part of the catalog onto the block: an auction open to your label, funds and rivals.') },
];
for (const d of LINKS19MA) if (!LINKS18.some((x) => x.id === d.id)) LINKS18.push(d);

// ================================================================ M8 certificações por país e época

/** Patamares por época: [desde, álbum [ouro, platina, diamante], single [ouro, platina, diamante]] (0 = não existe). */
type Th19 = [number, [number, number, number], [number, number, number]];
export interface Body19 { id: string; mk: MarketId; name: L; ref: string; from: number; part: number; th: Th19[]; sS: number; aS: number; ok?: 1 }
export const CB19: Body19[] = [
  { id: 'na', mk: 'na', name: l('Associação Fonográfica Americana', 'American Phonographic Association'), ref: 'RIAA (EUA): ouro 1958; platina 1976; singles 1M→500 mil em 1989; diamante 1999; streams em singles 9/5/2013 e em álbuns 1/2/2016, limiares iguais', from: 1958, part: 0.88, ok: 1,
    th: [[1958, [5e5, 0, 0], [1e6, 0, 0]], [1976, [5e5, 1e6, 0], [1e6, 2e6, 0]], [1989, [5e5, 1e6, 0], [5e5, 1e6, 0]], [1999, [5e5, 1e6, 1e7], [5e5, 1e6, 1e7]]], sS: 2013, aS: 2016 },
  { id: 'uk', mk: 'eu', name: l('Indústria Fonográfica Britânica', 'British Phonographic Industry'), ref: 'BPI (Reino Unido, 1973); singles 400/600 mil desde 1989; streams em singles 2014 e em álbuns 2015', from: 1973, part: 0.2, ok: 1,
    th: [[1973, [1e5, 3e5, 0], [5e5, 1e6, 0]], [1989, [1e5, 3e5, 0], [4e5, 6e5, 0]]], sS: 2014, aS: 2015 },
  { id: 'br', mk: 'br', name: l('Associação Brasileira de Produtores de Discos', 'Brazilian Record Producers Association'), ref: 'ABPD → Pro-Música Brasil (patamares aproximados, reduzidos com a pirataria dos anos 2000; streams 2016)', from: 1975, part: 0.95,
    th: [[1975, [1e5, 2.5e5, 1e6], [1e5, 2.5e5, 1e6]], [2004, [5e4, 1e5, 3e5], [5e4, 1e5, 3e5]], [2016, [4e4, 8e4, 3e5], [2e4, 4e4, 1.6e5]]], sS: 2016, aS: 2016 },
  { id: 'mx', mk: 'latam', name: l('Associação Mexicana de Produtores', 'Mexican Producers Association'), ref: 'AMPROFON (México; patamares aproximados; streams 2015)', from: 1980, part: 0.35,
    th: [[1980, [1e5, 2.5e5, 1e6], [1e5, 2.5e5, 1e6]], [2004, [5e4, 1e5, 5e5], [5e4, 1e5, 5e5]], [2016, [3e4, 6e4, 3e5], [3e4, 6e4, 3e5]]], sS: 2015, aS: 2015 },
  { id: 'jp', mk: 'asia', name: l('Associação da Indústria Fonográfica do Japão', 'Japan Record Industry Association'), ref: 'RIAJ (Japão, 1989; certificação de streaming separada desde 2020; aproximado)', from: 1989, part: 0.45,
    th: [[1989, [1e5, 2.5e5, 1e6], [1e5, 2.5e5, 1e6]]], sS: 2020, aS: 2020 },
  { id: 'au', mk: 'oceania', name: l('Associação da Indústria Fonográfica Australiana', 'Australian Recording Industry Association'), ref: 'ARIA (Austrália; ouro 35 mil, platina 70 mil; streams 2014–2016, aproximado)', from: 1983, part: 0.8,
    th: [[1983, [3.5e4, 7e4, 5e5], [3.5e4, 7e4, 5e5]]], sS: 2014, aS: 2016 },
  { id: 'za', mk: 'africa', name: l('Indústria Fonográfica Sul-Africana', 'South African Recording Industry'), ref: 'RiSA (África do Sul; patamares aproximados, reduzidos em 2006; streams 2018)', from: 1990, part: 0.3,
    th: [[1990, [2.5e4, 5e4, 0], [2.5e4, 5e4, 0]], [2006, [1e4, 2e4, 0], [1e4, 2e4, 0]]], sS: 2018, aS: 2018 },
];
export const bodyOf19 = (mk: MarketId): Body19 | undefined => CB19.find((b) => b.mk === mk);
export const bodies19 = (s: GameState): Body19[] => CB19.filter((b) => s.year >= b.from);
/** Patamares vigentes (ano) para o tipo do lançamento. */
export function thOf19(b: Body19, y: number, type: Release['type']): [number, number, number] {
  const t = [...b.th].reverse().find((x) => y >= x[0]) ?? b.th[0];
  return type === 'single' ? t[2] : t[1];
}
/** Ano em que a entidade passa a contar streams para o tipo. */
export const streamYear19 = (b: Body19, type: Release['type']): number => (type === 'single' ? b.sS : b.aS);
/** Nível pelo total: 0 nada, 1 ouro, 1+n = n× platina, 99 diamante. */
export function tierOf19(u: number, [g, p, d]: [number, number, number]): number {
  if (d && u >= d) return 99;
  if (p && u >= p) return 1 + Math.min(20, Math.floor(u / p));
  return g && u >= g ? 1 : 0;
}
export function tierName19(n: number): L {
  if (n >= 99) return l('diamante', 'diamond');
  if (n >= 3) return F(l('{n}× platina', '{n}× platinum'), { n: n - 1 });
  return n === 2 ? l('platina', 'platinum') : l('ouro', 'gold');
}
/** Unidades do lançamento que contam na entidade: fatia do mercado (gosto × territórios, como as paradas regionais) ×
 *  parte do país no mercado × (sem streams antes da fórmula). */
/** Pesos por mercado (gosto × territórios, como charts2), somando 1. */
export function mkW19(s: GameState, rel: Release): Partial<Record<MarketId, number>> {
  const fam = familyOf(s.acts[rel.actId]?.genre ?? 'pop'), o: Partial<Record<MarketId, number>> = {};
  let den = 0;
  for (const m of MARKETS) { const v = m.size(s.year) * (MARKET_PREF[m.id][fam] ?? 0.6) * (rel.territories.includes(m.id) ? 1 : 0.08); o[m.id] = v; den += v; }
  for (const m of MARKETS) o[m.id] = den > 0 ? (o[m.id] ?? 0) / den : 0;
  return o;
}
export function certUnits19(s: GameState, rel: Release, b: Body19, ws = mkW19(s, rel), sfm?: Partial<Record<MarketId, number>>): { u: number; w: number; sf: number; counts: boolean } {
  const w = ws[b.mk] ?? 0;
  const counts = s.year >= streamYear19(b, rel.type);
  const st = s.techDates.streaming;
  const sf = counts ? 0 : st !== undefined && rel.year >= st ? (sfm ? (sfm[b.mk] ??= mix18(s, b.mk).stream) : mix18(s, b.mk).stream) : 0;
  return { u: Math.round(rel.totalUnits * w * b.part * (1 - sf)), w, sf, counts };
}
export const auditFee19 = (s: GameState, n: number): number => money(s, n >= 99 ? 1500 : n >= 2 ? 900 : 600);

export function certMonth19(s: GameState): void {
  const st = mka19(s), bs = bodies19(s);
  if (!bs.length) return;
  let npcF = 0, newP = 0;
  const sfm: Partial<Record<MarketId, number>> = {};
  for (const rel of Object.values(s.releases)) {
    if (rel.totalUnits < 1e4) continue;
    const mine = mineRel(s, rel), a = s.acts[rel.actId];
    if (!mine && (rel.hist || !a || (a.fame < 50 && !(rel.peak && rel.peak <= 10)))) continue;
    if (!mine && s.week - rel.week > 156 && !(rel.weekly[rel.weekly.length - 1] > 0)) continue;
    const ws = mkW19(s, rel);
    for (const b of bs) {
      const n = tierOf19(certUnits19(s, rel, b, ws, sfm).u, thOf19(b, s.year, rel.type));
      const have = st.c[rel.id]?.[b.mk] ?? 0;
      if (n <= have) continue;
      if (mine) { const k = `${rel.id}|${b.mk}`; if ((st.pend[k] ?? 0) < n) { if (!st.pend[k]) newP++; st.pend[k] = n; } continue; }
      (st.c[rel.id] ??= {})[b.mk] = n;
      cnt(s, 'npc_cert');
      if (npcF < 3 && (n >= 99 || (have < 2 && n >= 2 && a!.fame >= 60))) { npcF++; certFact(s, rel, b, n, false); }
    }
  }
  if (newP && isLabel(s)) {
    const ks = Object.keys(st.pend);
    const fee = ks.reduce((t, k) => t + auditFee19(s, st.pend[k]), 0);
    pushInbox18(s, 'mka19_cert', { from: l('Departamento comercial', 'Sales department').pt, tone: 'good', weeks: 8, ref: { n: ks.length },
      subject: F(l('{n} certificação(ões) esperando auditoria', '{n} certification(s) awaiting audit'), { n: ks.length }),
      body: F(l('As vendas já passaram dos patamares nacionais ({x}). A entidade só certifica com auditoria paga pelo selo: {v}. "Contar pacotes" sobe um degrau a mais (ingressos e camisetas com o disco), mas pode ser revogado.', 'Sales have passed the national thresholds ({x}). The body only certifies after an audit paid by the label: {v}. "Count bundles" claims one tier more (tickets and shirts with the record), but may be revoked.'),
        { x: ks.slice(0, 3).map((k) => { const [r, m] = k.split('|'); return `"${s.releases[r]?.title ?? '?'}" ${bodyOf19(m as MarketId)?.id.toUpperCase()} ${tierName19(st.pend[k]).pt}`; }).join('; '), v: usd(fee) }),
      actions: [{ id: 'audit', label: F(l('Pagar auditoria ({v})', 'Pay the audit ({v})'), { v: usd(fee) }) }, { id: 'inflate', label: l('Contar pacotes (+1 degrau)', 'Count bundles (+1 tier)') }, { id: 'skip', label: l('Agora não', 'Not now') }] });
  }
}
function certFact(s: GameState, rel: Release, b: Body19, n: number, mine: boolean, inflated = false): void {
  const a = s.acts[rel.actId];
  const tx = F(l('"{t}" de {a} recebe {c} da {b}.', '"{t}" by {a} is certified {c} by the {b}.'), { t: rel.title, a: a?.name ?? '?', c: tierName19(n), b: b.name });
  logM(s, tx);
  emitFact(s, { kind: 'cert_award', actors: [rel.actId, ...(mine ? ['player'] : [])], place: a?.city, severity: n >= 99 ? 55 : n >= 2 ? 40 : 30, visibility: 'public', tags: ['market19a', b.mk, n >= 99 ? 'diamond' : n >= 2 ? 'platinum' : 'gold', ...(inflated ? ['inflated'] : []), 'good'], text: tx, src: 'market19a', data: { rel: rel.id, mk: b.mk, n } });
}
/** Audita (paga) uma pendência do jogador; `inflate` sobe um degrau e marca o risco. */
export function audit19(s: GameState, key: string, inflate = false): L | null {
  const st = mka19(s), n0 = st.pend[key];
  if (!n0) return l('Nada a certificar.', 'Nothing to certify.');
  const [rid, mk] = key.split('|') as [string, MarketId];
  const rel = s.releases[rid], b = bodyOf19(mk);
  if (!rel || !b) { delete st.pend[key]; return l('Lançamento sumiu.', 'Release is gone.'); }
  const n = inflate ? (n0 >= 99 ? 99 : n0 + 1) : n0;
  const fee = auditFee19(s, n);
  if (s.player.cash < fee) return l('Caixa insuficiente para a auditoria.', 'Not enough cash for the audit.');
  post(s, `mka19aud:${key}:${s.week}`, -fee, 'misc', `Auditoria de certificação ${rel.title}`);
  delete st.pend[key];
  (st.c[rid] ??= {})[mk] = n;
  if (inflate) st.inf[key] = s.week;
  cnt(s, inflate ? 'inflate' : 'audit');
  certFact(s, rel, b, n, true, inflate);
  return null;
}
export function auditAll19(s: GameState, inflate = false): L {
  let k = 0;
  for (const key of Object.keys(mka19(s).pend)) if (!audit19(s, key, inflate)) k++;
  return F(l('{n} certificação(ões) entregue(s).', '{n} certification(s) delivered.'), { n: k });
}
registerInboxKind('mka19_cert', { label: l('Certificação', 'Certification'), cat: 'deals', icon: 'disc', prio: 1, goto: () => ({ area: 'market19a' }),
  handle: (s, _m, a) => (a === 'audit' ? auditAll19(s) : a === 'inflate' ? auditAll19(s, true) : l('As certificações esperam; dá para pedir depois em Mercado.', 'The certifications wait; you can ask later in Market.')) });
registerConseq18('ib:mka19_cert:audit', { now: l('Placas na parede e na capa.', 'Plaques on the wall and on the sleeve.'), later: [{ in: [1, 3], p: 0.5, tone: 'good', hint: l('Varejo gosta de selo dourado na capa.', 'Retail loves a gold sticker on the sleeve.'),
  fx: (f) => { f.rep('commercial', 1); return l('Lojas põem seus discos certificados na vitrine.', 'Stores put your certified records in the window.'); } }] });
registerConseq18('ib:mka19_cert:inflate', { now: l('Um degrau a mais, sem custo extra.', 'One tier more, at no extra cost.'), later: [{ in: [4, 14], p: 0.35, tone: 'bad', hint: l('Auditor de outra entidade pode recontar.', 'Another body\'s auditor may recount.'),
  fx: (f) => { revoke19(f.s); f.rep('institutional', -3).rep('commercial', -1); return l('Recontagem: a certificação inflada é revogada e vira notícia.', 'Recount: the inflated certification is revoked and makes the news.'); } }] });
registerConseq18('ib:mka19_cert:skip', { later: [{ in: [2, 6], p: 0.2, tone: 'mixed', hint: l('Disco sem placa vende sem vitrine.', 'A record without a plaque sells without a showcase.'), fx: (f) => { f.momentum(-1); return l('Concorrente certificado ganha a vitrine que seria sua.', 'A certified rival takes the shop window that could have been yours.'); } }] });
/** Revoga a certificação inflada mais recente. */
export function revoke19(s: GameState): L | null {
  const st = mka19(s), k = Object.entries(st.inf).sort((a, b) => b[1] - a[1])[0]?.[0];
  if (!k) return null;
  const [rid, mk] = k.split('|') as [string, MarketId];
  delete st.inf[k];
  const c = st.c[rid]; if (c?.[mk]) c[mk] = Math.max(0, (c[mk] ?? 1) - 1);
  const rel = s.releases[rid];
  const tx = F(l('Certificação de "{t}" revogada: pacotes contados como venda.', '"{t}" certification revoked: bundles counted as sales.'), { t: rel?.title ?? '?' });
  logM(s, tx); headline19(s, tx, 2); cnt(s, 'revoked');
  return tx;
}

// ouvintes: imprensa e fama; valor do selo (prestígio) e vitrine; disco antigo esquenta (revival19); júri (GRAMO_ADJ)
onFact('cert_award', (s, f) => {
  if (f.actors.includes('player') || f.severity >= 50) headline19(s, f.text, f.severity >= 50 ? 2 : 1);
  const a = s.acts[f.actors[0]]; if (a) a.fame = clamp(a.fame + (Number(f.data?.n) >= 99 ? 1.5 : 0.5), 0, 100);
  log(s, 'cert', f.text);
}, 'market19a:cert:press');
onFact('cert_award', (s, f) => {
  const rel = s.releases[String(f.data?.rel ?? '')]; if (!rel) return;
  rel.hypeBoost = Math.min(0.5, (rel.hypeBoost ?? 0) + 0.05);
  if (f.actors.includes('player') && Number(f.data?.n) >= 2 && f.data?.mk !== 'na') s.player.stats.platinum += 1; // a AMIF mundial já conta a América do Norte
}, 'market19a:cert:value');
onFact('cert_award', (s, f) => { const rel = s.releases[String(f.data?.rel ?? '')]; if (rel && s.year - rel.year >= 10) stage19(s, rel.id, 'viral', -28); }, 'market19a:cert:revival');
GRAMO_ADJ.push((s, relId, cat) => {
  if (cat !== 'album' && cat !== 'record') return 0;
  const c = mka19(s).c[relId];
  return c ? Math.min(3, Object.values(c).filter((n) => (n ?? 0) >= 2).length) : 0;
});
registerExplain('mka19.cert', (s, c) => {
  const rel = s.releases[String(c.rel ?? '')], b = bodyOf19(String(c.mk ?? '') as MarketId);
  if (!rel || !b) return null;
  const x = certUnits19(s, rel, b), th = thOf19(b, s.year, rel.type);
  const parts: WhyPart[] = [
    { label: l('Unidades no mundo', 'Units worldwide'), value: rel.totalUnits, fmt: 'num' },
    { label: F(l('Fatia do mercado {m} (gosto × territórios)', 'Share of market {m} (taste × territories)'), { m: b.mk }), value: Math.round(x.w * 1000) / 1000, fmt: 'mult' },
    { label: l('Parte do país no mercado', 'Country share of the market'), value: b.part, fmt: 'mult' },
    x.counts ? { label: F(l('Streams contam desde {y}', 'Streams count since {y}'), { y: streamYear19(b, rel.type) }), value: 1, fmt: 'mult', tone: 'good' } : { label: F(l('Streams ainda não contam (até {y})', 'Streams do not count yet (until {y})'), { y: streamYear19(b, rel.type) }), value: Math.round((1 - x.sf) * 100) / 100, fmt: 'mult', tone: 'bad' },
    { label: l('Patamares: ouro / platina / diamante', 'Thresholds: gold / platinum / diamond'), value: 0, fmt: 'text', note: th.map((v) => (v ? v.toLocaleString('en-US') : '—')).join(' / ') },
  ];
  return { title: F(l('Certificação {b}', '{b} certification'), { b: b.name }), value: x.u, fmt: 'num', parts, note: l(b.ref, b.ref) };
});
registerAdvisorTip('mka19-cert', (s) => {
  const n = Object.keys(mka19(s).pend).length;
  return n && isLabel(s) ? [{ id: 'mka19-cert', level: 'good', cat: 'opportunity', score: 40, text: F(l('{n} certificação(ões) nacional(is) esperando auditoria.', '{n} national certification(s) awaiting audit.'), { n }),
    why: [l('A entidade só entrega a placa depois da auditoria paga pelo selo.', 'The body only hands out the plaque after an audit paid by the label.')], effect: l('Manchete, fama, vitrine e prestígio no valor do selo.', 'Headline, fame, shop window and prestige in label value.'),
    goto: { area: 'market19a' }, run: { label: l('Pagar auditorias', 'Pay audits'), fn: (x) => auditAll19(x) } }] : [];
});

// ================================================================ M7 pesquisa de mercado / teste de faixa

export type TestM19 = 'panel' | 'regional' | 'callout' | 'ab';
export const TEST19: Record<TestM19, { name: L; from: number; cost: number; sd: number; bias: number; leak: number; desc: L }> = {
  panel: { name: l('Painel de ouvintes (focus group)', 'Listening panel (focus group)'), from: 1935, cost: 1500, sd: 12, bias: 0.25, leak: 0.08, desc: l('Uma sala com 20 pessoas: barato, mas o painel prefere o que soa familiar.', 'A room with 20 people: cheap, but the panel prefers what sounds familiar.') },
  regional: { name: l('Lançamento de teste regional', 'Regional test release'), from: 1950, cost: 3000, sd: 7, bias: 0, leak: 0.3, desc: l('Prensar o single numa cidade e medir as lojas: acerta mais, mas queima um pouco do embalo.', 'Press the single in one city and read the shops: more accurate, but burns some momentum.') },
  callout: { name: l('Pesquisa de rádio (callout)', 'Radio callout research'), from: 1975, cost: 2500, sd: 7, bias: 0.12, leak: 0.05, desc: l('Ganchos de 10 segundos por telefone: bom para rádio, cansa rápido com o familiar.', '10-second hooks over the phone: good for radio, burns out on the familiar.') },
  ab: { name: l('A/B no streaming', 'Streaming A/B'), from: 2012, cost: 1000, sd: 4, bias: 0, leak: 0.02, desc: l('Duas faixas em perfis de teste: rápido, barato e quase sem viés.', 'Two tracks on test profiles: fast, cheap and nearly unbiased.') },
};
export const testMethods19 = (s: GameState): TestM19[] => (Object.keys(TEST19) as TestM19[]).filter((k) => s.year >= TEST19[k].from);
export const testCost19 = (s: GameState, m: TestM19): number => money(s, TEST19[m].cost);
const songTrue = (q: number, mel: number) => q * 0.6 + mel * 0.4;
/** Erro do teste (desvio): método, menos 30% com analista bom. */
export const testSd19 = (s: GameState, m: TestM19): number => Math.round(TEST19[m].sd * (1 - 0.3 * clamp(staffSkill(s, 'analyst') / 100, 0, 1)) * 10) / 10;
export const testCands19 = (s: GameState, actId: string): string[] => Object.values(s.songs).filter((x) => x.actId === actId && !x.releaseId).sort((a, b) => b.createdWeek - a.createdWeek).slice(0, 6).map((x) => x.id);
/** Testa as canções ainda não lançadas do ato. */
export function test19(s: GameState, actId: string, m: TestM19): { ok: boolean; text: L; t?: Test19 } {
  const a = s.acts[actId], ids = testCands19(s, actId);
  if (!a || !mineAct(a)) return { ok: false, text: l('Só para atos seus.', 'Only for your acts.') };
  if (s.year < TEST19[m].from) return { ok: false, text: l('Esse método ainda não existe.', 'That method does not exist yet.') };
  if (ids.length < 2) return { ok: false, text: l('Precisa de 2+ canções inéditas.', 'Needs 2+ unreleased songs.') };
  const cost = testCost19(s, m);
  if (s.player.cash < cost) return { ok: false, text: l('Caixa insuficiente.', 'Not enough cash.') };
  post(s, `mka19test:${actId}:${s.week}`, -cost, 'marketing', `Pesquisa de mercado ${a.name}`);
  const r = rng(s), sd = testSd19(s, m), b = TEST19[m].bias;
  const res: [string, number][] = ids.map((id) => { const x = s.songs[id]; return [id, Math.round(songTrue(x.q, x.melody) + (50 - x.originality) * b + r.normal(0, sd))] as [string, number]; }).sort((p, q) => q[1] - p[1]);
  const best = [...ids].sort((p, q) => songTrue(s.songs[q].q, s.songs[q].melody) - songTrue(s.songs[p].q, s.songs[p].melody))[0];
  const t: Test19 = { id: `tt${++mka19(s).seq}`, act: actId, w: s.week, m, res, best, ...(r.chance(TEST19[m].leak) ? { leak: 1 as const } : {}) };
  const st = mka19(s); st.t.unshift(t); if (st.t.length > 20) st.t.length = 20;
  cnt(s, `test_${m}`);
  if (m === 'regional') a.momentum = clamp(a.momentum - 2, 0, 100);
  const top = s.songs[res[0][0]], fav = [...ids].sort((p, q) => s.songs[q].originality - s.songs[p].originality)[0];
  emitFact(s, { kind: 'track_test', actors: [actId, 'player'], severity: 15, visibility: t.leak ? 'public' : 'secret', tags: ['market19a', m, ...(t.leak ? ['leak'] : [])], src: 'market19a', data: { t: t.id },
    text: F(l('{a}: {m} aponta "{s}" como single.', '{a}: {m} points to "{s}" as the single.'), { a: a.name, m: TEST19[m].name, s: top.title }) });
  pushInbox18(s, 'mka19_test', { from: TEST19[m].name.pt, tone: 'info', weeks: 6, ref: { act: actId, t: t.id },
    subject: F(l('Resultado: "{s}" na frente', 'Result: "{s}" in front'), { s: top.title }),
    body: F(l('{r}. Erro típico ±{e} pontos{b}. A banda prefere "{f}".', '{r}. Typical error ±{e} points{b}. The band prefers "{f}".'), { r: res.map(([id, v]) => `"${s.songs[id].title}" ${v}`).join(' · '), e: sd, b: b ? l(' (painel puxa para o familiar)', ' (panel leans to the familiar)') : '', f: s.songs[fav].title }),
    actions: [{ id: 'follow', label: l('Seguir a pesquisa', 'Follow the research') }, { id: 'gut', label: l('Ir com a banda (instinto)', 'Go with the band (gut)') }] });
  return { ok: true, text: F(l('Teste feito: "{s}" na frente.', 'Test done: "{s}" in front.'), { s: top.title }), t };
}
export function pickTest19(s: GameState, tid: string, how: 'follow' | 'gut'): L {
  const t = mka19(s).t.find((x) => x.id === tid);
  if (!t) return l('Teste expirado.', 'Test expired.');
  t.how = how;
  t.pick = how === 'follow' ? t.res[0][0] : [...t.res.map(([id]) => id)].sort((p, q) => (s.songs[q]?.originality ?? 0) - (s.songs[p]?.originality ?? 0))[0];
  const a = s.acts[t.act];
  if (a && how === 'gut') a.trust = clamp(a.trust + 2, 0, 100);
  return F(l('Single escolhido: "{s}".', 'Single picked: "{s}".'), { s: s.songs[t.pick ?? '']?.title ?? '?' });
}
registerInboxKind('mka19_test', { label: l('Pesquisa de mercado', 'Market research'), cat: 'analyst', icon: 'chart', prio: 1, goto: () => ({ area: 'market19a' }),
  handle: (s, m, a) => pickTest19(s, String(m.ref?.t), a === 'gut' ? 'gut' : 'follow') });
const testOf = (s: GameState, c: Record<string, unknown>) => mka19(s).t.find((x) => x.id === String(c.t));
registerConseq18('ib:mka19_test:follow', { now: l('O single sai do teste.', 'The single comes from the test.'), later: [{ in: [2, 8], p: 0.3, tone: 'bad', hint: l('Artista não gosta de virar produto de pesquisa.', 'Artists dislike becoming a research product.'),
  fx: (f) => { f.trust(-3); return l('A banda reclama em entrevista que "o single foi escolhido por uma planilha".', 'The band complains in an interview that "a spreadsheet picked the single".'); } }] });
registerConseq18('ib:mka19_test:gut', { now: l('A banda escolhe; confiança +2.', 'The band picks; trust +2.'), later: [{ in: [2, 8], p: 0.5, tone: 'mixed', hint: l('O instinto às vezes acerta onde a pesquisa erra.', 'Gut sometimes wins where research fails.'),
  fx: (f) => { const t = testOf(f.s, f.c); if (t && t.pick === t.best) { f.momentum(4); return l('O instinto acertou: a faixa que o teste desprezou é a que pega.', 'The gut was right: the track the test dismissed is the one that catches on.'); } f.momentum(-2); return l('A escolha da banda não pegou como a do teste prometia.', 'The band\'s pick did not catch on the way the test promised.'); } }] });
/** Bônus de paradas do lançamento com a faixa escolhida em teste (até 52 semanas depois). */
export function testBonus19(s: GameState, rel: Release): { k: number; t?: Test19 } {
  const t = mka19(s).t.find((x) => x.pick && x.act === rel.actId && rel.songs.includes(x.pick) && rel.week >= x.w && rel.week - x.w <= 52);
  if (!t) return { k: 1 };
  const tr = (id: string) => songTrue(s.songs[id]?.q ?? 0, s.songs[id]?.melody ?? 0);
  return { k: tr(t.pick!) >= tr(t.best) - 3 ? 1.07 : 1.02, t };
}
registerMod('chartUnits', 'mka19:test', (s, v, ctx) => {
  const rel = ctx.release; if (!rel || off()) return null;
  const b = testBonus19(s, rel); return b.k > 1 ? { value: v * b.k, label: l('Single escolhido com pesquisa', 'Single picked with research') } : null;
});
onFact('track_test', (s, f) => {
  const a = s.acts[f.actors[0]]; if (!a) return;
  if (f.tags.includes('panel')) a.trust = clamp(a.trust - 1, 0, 100);
  if (f.tags.includes('leak')) { a.momentum = clamp(a.momentum - 3, 0, 100); log(s, 'research', F(l('O teste de {a} vazou: o refrão circula antes da hora (embalo −3).', '{a}\'s test leaked: the hook circulates too early (momentum −3).'), { a: a.name })); }
}, 'market19a:test');
registerExplain('mka19.test', (s, c) => {
  const t = mka19(s).t.find((x) => x.id === String(c.t ?? '')); const m = (t?.m ?? String(c.m ?? 'panel')) as TestM19;
  if (!TEST19[m]) return null;
  return { title: TEST19[m].name, value: testSd19(s, m), fmt: 'num', parts: [
    { label: l('Erro típico do método', 'Method typical error'), value: TEST19[m].sd, fmt: 'num' },
    { label: l('Analista na equipe (até −30%)', 'Analyst on staff (up to −30%)'), value: Math.round((1 - 0.3 * clamp(staffSkill(s, 'analyst') / 100, 0, 1)) * 100) / 100, fmt: 'mult', tone: 'good' },
    { label: l('Viés para o familiar (originalidade baixa ganha pontos)', 'Bias to the familiar (low originality gains points)'), value: TEST19[m].bias, fmt: 'num', tone: TEST19[m].bias ? 'bad' : 'good' },
    { label: l('Chance de vazar', 'Leak chance'), value: TEST19[m].leak, fmt: 'pct', tone: 'bad' },
    ...(t ? [{ label: l('Escolha certa? (só se sabe depois)', 'Right pick? (known only later)'), value: 0, fmt: 'text' as const, note: t.pick ? (t.pick === t.best ? l('sim', 'yes') : l('outra era melhor', 'another was better')) : l('pendente', 'pending') }] : []),
  ], note: l('O single escolhido ganha +7% nas paradas se for (quase) a melhor faixa; +2% se não for (marketing mais focado).', 'The picked single gains +7% on the charts if it is (nearly) the best track; +2% if not (more focused marketing).') };
});

// ================================================================ N12 faixas sem rosto nas playlists de humor (2015+)

export const MOOD19 = ['ambient', 'lofi_hiphop', 'classical', 'trip_hop', 'vaporwave', 'new_age', 'smooth_jazz', 'chillout', 'downtempo'];
export const PLAT19 = l('Loopit (plataforma fictícia)', 'Loopit (fictional platform)');
export const ghostFee19 = (s: GameState): number => money(s, 12000);
export function ghostYear19(s: GameState): void {
  const st = mka19(s);
  if (s.year < 2015) return;
  const r = rng(s);
  const before = st.ghN;
  st.ghN = clamp(st.ghN + (s.year >= 2017 ? 0.06 : 0.02) * r.float(0.5, 1.5), 0, 0.4);
  if (before < 0.1 && st.ghN >= 0.1) emitFact(s, { kind: 'ghost_tracks', actors: [], severity: 35, visibility: 'public', tags: ['market19a', 'npc', 'mood'], src: 'market19a', data: { n: st.ghN },
    text: F(l('Reportagem: playlists de humor da {p} estariam cheias de faixas de produtoras sob nomes inventados (a plataforma nega).', 'Report: {p} mood playlists are said to be full of production-house tracks under invented names (the platform denies it).'), { p: PLAT19 }) });
  if (st.gh || !isLabel(s) || (st.cd.gh ?? 0) > s.year || !r.chance(0.35)) return;
  st.cd.gh = s.year + 3;
  pushInbox18(s, 'mka19_ghost', { from: PLAT19.pt, tone: 'info', weeks: 6,
    subject: l('Proposta: faixas "perfeitas para a playlist"', 'Offer: "perfect for the playlist" tracks'),
    body: F(l('A plataforma paga {v} por ano por 40 faixas instrumentais do seu estúdio, compra fechada (sem royalties), publicadas sob nomes inventados nas playlists de humor. Dinheiro agora; se vazar, artistas e imprensa caem em cima.', 'The platform pays {v} a year for 40 instrumental tracks from your studio, flat buyout (no royalties), released under invented names on mood playlists. Cash now; if it leaks, artists and press pile on.'), { v: usd(ghostFee19(s)) }),
    actions: [{ id: 'accept', label: l('Aceitar a compra fechada', 'Accept the buyout') }, { id: 'expose', label: l('Denunciar à imprensa', 'Expose it to the press') }, { id: 'refuse', label: l('Recusar', 'Refuse') }] });
}
export function ghost19(s: GameState, how: 'accept' | 'expose' | 'refuse'): L {
  const st = mka19(s);
  if (how === 'accept') {
    st.gh = { from: s.year, tracks: 40 };
    post(s, `mka19gh:${s.year}`, ghostFee19(s), 'licensing', 'Faixas sem rosto (compra fechada)');
    emitFact(s, { kind: 'ghost_tracks', actors: ['player'], severity: 20, visibility: 'secret', tags: ['market19a', 'deal', 'mood'], src: 'market19a', text: l('O selo vende 40 faixas sem rosto para as playlists de humor.', 'The label sells 40 faceless tracks to the mood playlists.') });
    return l('Contrato fechado: dinheiro todo ano enquanto durar.', 'Deal signed: cash every year while it lasts.');
  }
  if (how === 'expose') {
    st.ghCold = s.week + 26;
    emitFact(s, { kind: 'ghost_tracks', actors: ['player'], severity: 45, visibility: 'public', tags: ['market19a', 'exposed', 'whistle'], src: 'market19a', text: F(l('O selo denuncia a {p}: playlists de humor com artistas que não existem.', 'The label exposes {p}: mood playlists with artists who do not exist.'), { p: PLAT19 }) });
    return l('Denúncia publicada: artistas aplaudem; a plataforma esfria com seus lançamentos por 6 meses.', 'Exposé published: artists applaud; the platform cools on your releases for 6 months.');
  }
  return l('Recusado.', 'Refused.');
}
export function ghostMonth19(s: GameState): void {
  const st = mka19(s);
  if (!st.gh || st.gh.out) return;
  if (s.month === 0 && st.gh.from < s.year) post(s, `mka19gh:${s.year}`, ghostFee19(s), 'licensing', 'Faixas sem rosto (compra fechada)');
  if (!rng(s).chance(0.03)) return;
  st.gh.out = s.year;
  emitFact(s, { kind: 'ghost_tracks', actors: ['player'], severity: 50, visibility: 'public', tags: ['market19a', 'exposed', 'bad'], src: 'market19a',
    text: F(l('Vazou: o selo produzia faixas sem rosto para a {p}.', 'Leaked: the label made faceless tracks for {p}.'), { p: PLAT19 }) });
}
registerInboxKind('mka19_ghost', { label: l('Plataforma', 'Platform'), cat: 'deals', icon: 'disc', prio: 1, goto: () => ({ area: 'market19a' }),
  handle: (s, _m, a) => ghost19(s, a === 'accept' ? 'accept' : a === 'expose' ? 'expose' : 'refuse') });
registerConseq18('ib:mka19_ghost:accept', { now: l('Dinheiro todo ano, sem royalties.', 'Cash every year, no royalties.'), later: [{ in: [6, 24], p: 0.3, tone: 'bad', hint: l('Segredo de playlist não dura para sempre.', 'Playlist secrets do not last forever.'),
  fx: (f) => { f.rep('artists', -3).rep('artistic', -2); return l('Músicos descobrem que o selo alimenta as faixas sem rosto e boicotam o estúdio.', 'Musicians find out the label feeds the faceless tracks and boycott the studio.'); } }] });
registerConseq18('ib:mka19_ghost:expose', { now: l('Imprensa e artistas do seu lado.', 'Press and artists on your side.'), later: [{ in: [3, 9], p: 0.45, tone: 'mixed', hint: l('A plataforma lembra quem a expôs.', 'The platform remembers who exposed it.'),
  fx: (f) => { f.rep('institutional', 2).momentum(-2); return l('Audiência pública sobre playlists; seus lançamentos somem das editoriais por um tempo.', 'A public hearing on playlists; your releases vanish from editorial lists for a while.'); } }] });
registerConseq18('ib:mka19_ghost:refuse', { later: [{ in: [6, 18], p: 0.25, tone: 'good', hint: l('Quem recusa vira referência entre artistas.', 'Those who refuse become a reference among artists.'), fx: (f) => { f.rep('artists', 2); return l('Artistas de gêneros calmos procuram o selo que "não vendeu a playlist".', 'Calm-genre artists seek the label that "did not sell the playlist".'); } }] });
onFact('ghost_tracks', (s, f) => { if (f.visibility === 'public') headline19(s, f.text, f.severity >= 45 ? 2 : 1); log(s, 'ghost', f.text); }, 'market19a:ghost:press');
onFact('ghost_tracks', (s, f) => {
  if (!f.actors.includes('player') || !f.tags.includes('exposed')) return;
  const rp = s.player.reputation;
  if (f.tags.includes('whistle')) { rp.artists = clamp(rp.artists + 3, 0, 100); rp.institutional = clamp(rp.institutional + 2, 0, 100); return; }
  rp.artistic = clamp(rp.artistic - 4, 0, 100); rp.artists = clamp(rp.artists - 3, 0, 100);
  for (const id of playerActs(s)) { const a = s.acts[id]; if (a) a.trust = clamp(a.trust - 2, 0, 100); }
}, 'market19a:ghost:artists');
registerMod('chartUnits', 'mka19:ghost', (s, v, ctx) => {
  const rel = ctx.release; if (!rel || off() || s.year < 2015) return null;
  const st = mka19(s), a = s.acts[rel.actId];
  if (st.ghCold && st.ghCold > s.week && mineRel(s, rel)) return { value: v * 0.97, label: l('Plataforma esfriou com o selo (denúncia)', 'Platform cooled on the label (exposé)') };
  if (!a || !MOOD19.includes(a.genre) || st.ghN < 0.02) return null;
  return { value: v * (1 - st.ghN * 0.25), label: l('Playlists de humor diluídas por faixas sem rosto', 'Mood playlists diluted by faceless tracks') };
});

// ================================================================ N15 promotora 360 (2007+)

export const PROMO19 = l('Arena Nação (promotora)', 'Arena Nation (promoter)');
export const matchCost19 = (s: GameState, a: Act): number => money(s, Math.round(expectedAdvance(s, a) * 1.6));
export function star360Month19(s: GameState): void {
  if (s.year < 2007) return;
  const st = mka19(s), r = rng(s);
  for (const id of playerActs(s)) {
    const a = s.acts[id], c = a?.contractId ? s.contracts[a.contractId] : undefined;
    if (!a || a.playerBand || !c || c.party !== 'player' || a.fame < 70 || st.p360[id] || c.endWeek - s.week > 52 || c.endWeek <= s.week) continue;
    st.p360[id] = { act: id, w: s.week, end: c.endWeek };
    pushInbox18(s, 'mka19_360', { from: PROMO19.pt, tone: 'bad', weeks: 6, ref: { act: id },
      subject: F(l('{a} tem oferta 360 de uma promotora', '{a} has a 360 offer from a promoter'), { a: a.name }),
      body: F(l('A {p} oferece a {a} um pacote de discos, turnês, merch e marca. Cobrir custa {v} (o selo vira sócio de shows e merch); dividir deixa a estrada com a promotora e os discos com você; ou deixá-lo(a) sair no fim do contrato.', '{p} offers {a} a records, tours, merch and brand package. Matching costs {v} (the label becomes a partner in live and merch); splitting leaves the road to the promoter and the records with you; or let them go at contract end.'), { p: PROMO19, a: a.name, v: usd(matchCost19(s, a)) }),
      actions: [{ id: 'match', label: F(l('Cobrir ({v})', 'Match ({v})'), { v: usd(matchCost19(s, a)) }) }, { id: 'partner', label: l('Dividir com a promotora', 'Split with the promoter') }, { id: 'let', label: l('Deixar sair', 'Let them go') }] });
  }
  // saídas combinadas chegam ao fim do contrato
  for (const p of Object.values(st.p360)) {
    if (p.done || p.k !== 'let' || s.week < p.end) continue;
    const a = s.acts[p.act]; p.done = 1;
    if (a && a.owner === 'player') { endContract(s, a, 'expired'); s.flags[`mka19:p360:${a.id}`] = s.year + 10; star360Fact(s, a, 'player'); }
  }
  // estrelas de selos rivais
  if (s.month !== 9 || !r.chance(0.5)) return;
  const strict = s.config.history === 'strict' && s.config.realNames;
  const real = strict && s.year === 2007 ? realAct17(s, 'Madonna') : undefined;
  const pool = real ? [real] : strict ? [] : Object.values(s.acts).filter((a) => a.owner && a.owner !== 'player' && s.labels[a.owner] && a.fame >= 75 && a.status === 'active' && !s.flags[`mka19:p360:${a.id}`]);
  const a = pool.sort((x, y) => y.fame - x.fame)[0];
  if (!a || !a.owner || a.owner === 'player' || !s.labels[a.owner]) return;
  const lb = a.owner;
  endContract(s, a, 'left'); s.flags[`mka19:p360:${a.id}`] = s.year + 10;
  star360Fact(s, a, lb);
}
function star360Fact(s: GameState, a: Act, from: string): void {
  const lbN = from === 'player' ? l('seu selo', 'your label') : l(s.labels[from]?.name ?? '?', s.labels[from]?.name ?? '?');
  const tx = F(l('{a} deixa {b} e assina um pacote 360 com a {p}: discos, turnês e marca na mesma casa.', '{a} leaves {b} and signs a 360 package with {p}: records, tours and brand under one roof.'), { a: a.name, b: lbN, p: PROMO19 });
  logM(s, tx); cnt(s, 'p360');
  emitFact(s, { kind: 'star_360', actors: [a.id, from], place: a.city, severity: Math.round(40 + a.fame / 5), visibility: 'public', tags: ['market19a', '360', from === 'player' ? 'mine' : 'npc'], src: 'market19a', text: tx, data: { lb: from } });
}
export function answer360(s: GameState, actId: string, k: 'match' | 'partner' | 'let'): L {
  const st = mka19(s), p = st.p360[actId], a = s.acts[actId], c = a?.contractId ? s.contracts[a.contractId] : undefined;
  if (!p || !a || !c || p.k) return l('Já decidido.', 'Already decided.');
  if (k === 'match') {
    const v = matchCost19(s, a);
    if (s.player.cash < v) return l('Caixa insuficiente para cobrir.', 'Not enough cash to match.');
    post(s, `mka19m:${actId}`, -v, 'advances', `360 de ${a.name}`);
    c.advance += v; c.recoupBalance += v; c.model = '360'; c.share360 = Math.max(c.share360, 0.25); c.endWeek += 52 * 4; c.termMonths += 48;
    p.k = 'match'; a.trust = clamp(a.trust + 4, 0, 100);
    return F(l('Você cobre a oferta: {a} fica mais 4 anos, agora com 360.', 'You match: {a} stays 4 more years, now on a 360.'), { a: a.name });
  }
  if (k === 'partner') { c.royalty = Math.min(0.5, c.royalty + 0.05); c.share360 = 0; c.endWeek += 52 * 3; c.termMonths += 36; p.k = 'partner'; return l('Acordo dividido: a promotora fica com a estrada, você com os discos (royalty +5 p.p.).', 'Split deal: the promoter takes the road, you keep the records (royalty +5 pts).'); }
  p.k = 'let'; return F(l('{a} sai quando o contrato acabar.', '{a} leaves when the contract ends.'), { a: a.name });
}
registerInboxKind('mka19_360', { label: l('Promotora 360', '360 promoter'), cat: 'deals', icon: 'star', prio: 2, goto: (_s, m) => ({ act: String(m.ref?.act) }),
  handle: (s, m, a) => answer360(s, String(m.ref?.act), a === 'match' ? 'match' : a === 'partner' ? 'partner' : 'let') });
registerConseq18('ib:mka19_360:match', { now: l('Estrela fica; 360 do selo.', 'Star stays; label 360.'), later: [{ in: [6, 18], p: 0.35, tone: 'mixed', hint: l('Estrela com 360 cobra presença em tudo.', 'A star on a 360 expects you everywhere.'), fx: (f) => { f.trust(-2).momentum(3); return l('O empresário audita a turnê e briga pela sua fatia; a estrada lota mesmo assim.', 'The manager audits the tour and fights over your cut; the road sells out anyway.'); } }] });
registerConseq18('ib:mka19_360:partner', { later: [{ in: [4, 12], p: 0.4, tone: 'good', hint: l('Promotora e selo juntos rendem turnê grande.', 'Promoter and label together make a big tour.'), fx: (f) => { f.fame(2).momentum(3); return l('A turnê da promotora empurra o disco novo nas paradas.', 'The promoter\'s tour pushes the new record up the charts.'); } }] });
registerConseq18('ib:mka19_360:let', { now: l('Sem custo agora; a âncora sai.', 'No cost now; the anchor leaves.'), later: [{ in: [6, 18], p: 0.4, tone: 'bad', hint: l('Catálogo sem âncora vale menos.', 'A catalog without an anchor is worth less.'), fx: (f) => { f.rep('commercial', -2); return l('Analistas rebaixam o selo: perdeu a estrela para uma promotora.', 'Analysts downgrade the label: it lost its star to a promoter.'); } }] });
onFact('star_360', (s, f) => {
  headline19(s, f.text, 2); log(s, 'star360', f.text);
  const lb = String(f.data?.lb ?? '');
  if (lb === 'player') s.player.reputation.commercial = clamp(s.player.reputation.commercial - 2, 0, 100);
  else if (s.labels[lb]) s.labels[lb].reputation = clamp(s.labels[lb].reputation - 2, 0, 100);
}, 'market19a:360');

// ================================================================ N21 remédio antitruste em fusões

/** Fatia do elenco (proxy de participação de mercado) de um selo. */
export function share19(s: GameState, lb: string): number {
  const tot = Object.values(s.labels).reduce((t, x) => t + (x.active ? x.roster.length : 0), 0) + playerActs(s).length;
  return tot ? (s.labels[lb]?.roster.length ?? 0) / tot : 0;
}
/** Limiar do regulador por época (1998–2013: mais duro; EMI 2012). */
export const antiTh19 = (y: number): number => (y < 1998 ? 0.3 : y <= 2013 ? 0.12 : 0.2);
const relPrice = (s: GameState, rels: Release[]) => money(s, Math.round(rels.reduce((t, x) => t + Math.sqrt(x.totalUnits) * 40, 0)));
export function review19(s: GameState, buyer: string, why: L): Anti19 | null {
  const lb = s.labels[buyer];
  if (!lb || off()) return null;
  const sh = share19(s, buyer);
  if (sh < antiTh19(s.year) || mka19(s).anti.some((x) => x.b === buyer && x.y === s.year)) return null;
  const rels = Object.values(s.releases).filter((x) => x.owner === buyer && x.totalUnits > 5000).sort((a, b) => b.totalUnits - a.totalUnits).slice(2, 10);
  if (rels.length < 3) return null;
  const st = mka19(s);
  const x: Anti19 = { id: `an${++st.seq}`, b: buyer, rels: rels.map((r) => r.id), price: relPrice(s, rels), w: s.week + 6, st: 'open', y: s.year, why };
  st.anti.unshift(x); if (st.anti.length > 12) st.anti.length = 12;
  cnt(s, 'review');
  const tx = F(l('Regulador aprova a fusão de {b} ({p}% do mercado) com remédio: {n} masters vão a leilão.', 'Regulator clears {b}\'s merger ({p}% of the market) with a remedy: {n} masters go to auction.'), { b: lb.name, p: Math.round(sh * 100), n: rels.length });
  logM(s, tx);
  emitFact(s, { kind: 'antitrust_remedy', actors: [buyer], severity: 40, visibility: 'public', tags: ['market19a', 'merger', 'remedy'], src: 'market19a', text: tx, data: { an: x.id } });
  if (isLabel(s)) pushInbox18(s, 'mka19_divest', { from: l('Órgão antitruste', 'Antitrust authority').pt, tone: 'good', weeks: 6, ref: { an: x.id, lb: buyer },
    subject: F(l('Leilão de desinvestimento: {n} masters de {b}', 'Divestiture auction: {n} masters from {b}'), { n: rels.length, b: lb.name }),
    body: F(l('Avaliação {v}. Fundos de catálogo e rivais também dão lance. Lance alto ganha quase sempre; contestar a fusão custa advogados e pode aumentar o lote.', 'Valued at {v}. Catalog funds and rivals bid too. A high bid almost always wins; contesting the merger costs lawyers and may enlarge the lot.'), { v: usd(x.price) }),
    actions: [{ id: 'high', label: F(l('Lance alto ({v})', 'High bid ({v})'), { v: usd(x.price * 1.25) }) }, { id: 'fair', label: F(l('Lance justo ({v})', 'Fair bid ({v})'), { v: usd(x.price) }) }, { id: 'low', label: F(l('Lance baixo ({v})', 'Low bid ({v})'), { v: usd(x.price * 0.8) }) }, { id: 'contest', label: l('Contestar a fusão', 'Contest the merger') }, { id: 'pass', label: l('Ficar de fora', 'Stay out') }] });
  return x;
}
export const BID19 = { high: [1.25, 0.85], fair: [1, 0.55], low: [0.8, 0.25] } as const;
export function bid19(s: GameState, id: string, k: keyof typeof BID19 | 'contest' | 'pass'): L {
  const x = mka19(s).anti.find((y) => y.id === id);
  if (!x || x.st !== 'open') return l('Leilão encerrado.', 'Auction closed.');
  if (k === 'pass') return l('Você fica de fora.', 'You stay out.');
  if (k === 'contest') {
    post(s, `mka19ct:${x.id}`, -money(s, 6000), 'legal', 'Contestação de fusão');
    const ok = rng(s).chance(0.4);
    if (ok) {
      const more = Object.values(s.releases).filter((r) => r.owner === x.b && r.totalUnits > 5000 && !x.rels.includes(r.id)).sort((a, b) => b.totalUnits - a.totalUnits).slice(0, 4);
      x.rels.push(...more.map((r) => r.id)); x.price = Math.round(relPrice(s, x.rels.map((r) => s.releases[r]).filter((r): r is Release => !!r)) * 0.85);
      s.player.reputation.institutional = clamp(s.player.reputation.institutional + 2, 0, 100);
      return F(l('O regulador ouve você: o lote cresce para {n} masters e o preço cai 15%. Dê o lance na página Mercado.', 'The regulator listens: the lot grows to {n} masters and the price falls 15%. Bid on the Market page.'), { n: x.rels.length });
    }
    return l('Contestação rejeitada: custas pagas, a fusão segue como estava.', 'Contest rejected: costs paid, the merger goes ahead as it was.');
  }
  const v = Math.round(x.price * BID19[k][0]);
  if (s.player.cash < v) return l('Caixa insuficiente para o lance.', 'Not enough cash for the bid.');
  x.bid = v;
  return F(l('Lance de {v} registrado; resultado em {w} semanas.', 'Bid of {v} filed; result in {w} weeks.'), { v: usd(v), w: Math.max(0, x.w - s.week) });
}
export function antiMonth19(s: GameState): void {
  const st = mka19(s), r = rng(s);
  for (const x of st.anti) {
    if (x.st !== 'open' || s.week < x.w) continue;
    const rivals = Object.values(s.labels).filter((lb) => lb.active && lb.id !== x.b && lb.cash > x.price * 1.2);
    const k = !x.bid ? 0 : x.bid >= x.price * 1.2 ? BID19.high[1] : x.bid >= x.price ? BID19.fair[1] : BID19.low[1];
    const p = k * (rivals.length ? 0.85 : 1);
    if (x.bid && s.player.cash >= x.bid && r.chance(p)) {
      post(s, `divest:mka19:${x.id}`, -x.bid, 'acquisitions', `Leilão de desinvestimento (${x.rels.length} masters)`);
      for (const id of x.rels) { const rel = s.releases[id]; if (rel && rel.owner === x.b) rel.owner = 'player'; }
      x.st = 'won';
    } else {
      const rv = rivals.sort((a, b) => b.cash - a.cash)[0];
      const to = rv && r.chance(0.5) ? rv : undefined;
      for (const id of x.rels) { const rel = s.releases[id]; if (rel && rel.owner === x.b) rel.owner = to ? to.id : 'indie'; }
      if (to) { to.cash -= x.price; x.st = 'rival'; x.to = to.id; } else x.st = 'fund';
      if (s.labels[x.b]) s.labels[x.b].cash += x.price;
    }
    const tx = F(x.st === 'won' ? l('Você vence o leilão de desinvestimento: {n} masters de {b} são seus.', 'You win the divestiture auction: {n} masters from {b} are yours.')
      : x.st === 'rival' ? l('{r} leva os {n} masters que {b} teve de vender.', '{r} takes the {n} masters {b} had to sell.') : l('Um fundo de catálogo leva os {n} masters que {b} teve de vender.', 'A catalog fund takes the {n} masters {b} had to sell.'),
    { n: x.rels.length, b: s.labels[x.b]?.name ?? '?', r: x.to ? s.labels[x.to]?.name ?? '?' : '' });
    logM(s, tx); log(s, 'antitrust', tx);
    if (x.bid || x.st === 'won') remember(s, 'divest', tx, { important: x.st === 'won' });
  }
}
registerInboxKind('mka19_divest', { label: l('Leilão antitruste', 'Antitrust auction'), cat: 'deals', icon: 'bank', prio: 2, goto: () => ({ area: 'market19a' }),
  handle: (s, m, a) => bid19(s, String(m.ref?.an), (['high', 'fair', 'low', 'contest'] as const).find((x) => x === a) ?? 'pass') });
registerConseq18('ib:mka19_divest:high', { now: l('Lance que quase sempre vence.', 'A bid that nearly always wins.'), later: [{ in: [6, 18], p: 0.35, tone: 'mixed', hint: l('Quem paga caro precisa explorar o catálogo.', 'Paying top dollar means you must work the catalog.'), fx: (f) => { f.rep('commercial', 1); return l('Analistas dizem que você pagou caro — até a primeira reedição render.', 'Analysts say you overpaid — until the first reissue pays off.'); } }] });
registerConseq18('ib:mka19_divest:contest', { now: l('Advogados na fusão.', 'Lawyers on the merger.'), later: [{ in: [3, 9], p: 0.4, tone: 'mixed', hint: l('A major não esquece quem a enfrentou.', 'The major does not forget who stood up to it.'), fx: (f) => { f.rep('institutional', 1).rep('commercial', -1); return l('A major fusionada corta sua distribuição em lojas grandes por um tempo.', 'The merged major cuts your distribution in big stores for a while.'); } }] });
registerDecisionListener('market19a:merger', (s, ev, opt, ctx) => { if (ev === 'rival_merger' && opt === 'ok' && ctx?.buyer) review19(s, String(ctx.buyer), l('fusão anunciada no mercado', 'merger announced on the market')); });
onFact('deal', (s, f) => { if (f.tags.includes('merger') && f.actors[0] && s.labels[f.actors[0]]) review19(s, f.actors[0], l('fusão de selos', 'label merger')); }, 'market19a:merger');
onFact('antitrust_remedy', (s, f) => { headline19(s, f.text, 2); log(s, 'antitrust', f.text); const lb = s.labels[f.actors[0]]; if (lb) lb.reputation = clamp(lb.reputation - 1, 0, 100); }, 'market19a:anti');

// ================================================================ N23+E7 ciclo de vida da cena

export const PH19: L[] = [l('nascendo', 'being born'), l('hype', 'hype'), l('corrida das majors', 'majors\' gold rush'), l('saturação', 'saturation'), l('ressaca', 'backlash'), l('renascimento', 'revival')];
const scName = (k: string): L => {
  const [c, g] = k.split(':');
  const h = HIST_SCENES.find((x) => x.city === c && x.genres.includes(g)); if (h) return h.name;
  const r = SCENES17.find((x) => x[1] === c && x[2] === g); if (r) return l(r[5], r[6]);
  return F(l('{g} de {c}', '{c} {g}'), { g: genreById[g]?.name ?? l(g, g), c: cityById[c]?.name ?? c });
};
export const sceneName19 = scName;
export const inScene19 = (a: Act, k: string): boolean => { const [c, g] = k.split(':'); return a.city === c && (a.genre === g || familyOf(a.genre) === familyOf(g)); };
export const sceneOf19 = (s: GameState, a: Act | undefined): Sc19 | undefined => (a ? Object.values(mka19(s).sc).find((x) => x.ph >= 1 && x.ph <= 4 && inScene19(a, x.k)) : undefined);
function setPh(s: GameState, x: Sc19, ph: ScPh19): void {
  x.ph = ph; x.w = s.week;
  const [city, g] = x.k.split(':');
  const nm = scName(x.k);
  logM(s, F(l('{n}: {p}.', '{n}: {p}.'), { n: nm, p: PH19[ph] }));
  if (ph === 2) {
    cnt(s, 'boom');
    emitFact(s, { kind: 'scene_boom', actors: [], place: city, severity: 45, visibility: 'public', tags: ['market19a', g, 'good'], src: 'market19a', data: { k: x.k, g, city },
      text: F(l('Corrida do ouro: as majors descem em {c} atrás do som de "{n}" — adiantamentos sobem.', 'Gold rush: the majors descend on {c} chasing the "{n}" sound — advances climb.'), { c: cityById[city]?.name ?? city, n: nm }) });
    playerRush(s, x);
  } else if (ph === 4) {
    x.bust = s.year; cnt(s, 'bust');
    emitFact(s, { kind: 'scene_bust', actors: [], place: city, severity: 40, visibility: 'public', tags: ['market19a', g, 'bad'], src: 'market19a', data: { k: x.k, g, city },
      text: F(l('A ressaca de "{n}": todo mundo assinou, o som cansou e a imprensa decreta o fim da cena. Sobra o turismo.', 'The "{n}" hangover: everyone signed, the sound got tired and the press declares the scene over. Tourism remains.'), { n: nm }) });
  } else if (ph === 5) headline19(s, F(l('"{n}" renasce: uma geração nova redescobre a cena.', '"{n}" is reborn: a new generation rediscovers the scene.'), { n: nm }), 1);
}
export function scenesMonth19(s: GameState): void {
  const st = mka19(s), r = rng(s);
  const top = Object.entries(s.scenes).filter(([k, v]) => v >= 20 && genreById[k.split(':')[1]]).sort((a, b) => b[1] - a[1]).slice(0, 10);
  for (const [k, v] of top) if (!st.sc[k] && Object.keys(st.sc).length < 24) st.sc[k] = { k, ph: v >= 35 ? 1 : 0, w: s.week, h: v, pk: v, sg: 0, first: s.year };
  for (const x of Object.values(st.sc)) {
    const v = s.scenes[x.k] ?? 0, up = v > x.h * 1.04, age = (s.week - x.w) / 4.35;
    x.h = v; x.pk = Math.max(x.pk, v);
    switch (x.ph) {
      case 0: if (v >= 35 || (up && v >= 28)) setPh(s, x, 1); else if (v < 8 && age > 12) delete st.sc[x.k]; break;
      case 1: rush(s, x, r, 0.3); if (age >= 3 && x.sg >= 2) setPh(s, x, 2); else if (v < 12 && age > 12) delete st.sc[x.k]; break;
      case 2: rush(s, x, r, 0.5); if (age >= 12 && (x.sg >= 6 || age >= 24)) setPh(s, x, 3); break;
      case 3: s.scenes[x.k] = v * 0.96; if (age >= 6 && (r.chance(0.12) || age >= 12)) setPh(s, x, 4); break;
      case 4: if (age >= 24) { const g = x.k.split(':')[1]; s.genrePop[g] = clamp((s.genrePop[g] ?? 1) * 1.02, 0.15, 2.2); }
        if (s.year - (x.bust ?? s.year) >= 6 && v >= 25 && r.chance(0.2)) setPh(s, x, 5); else if (s.year - (x.bust ?? s.year) >= 12) delete st.sc[x.k]; break;
      case 5: if (age >= 12) { x.sg = 0; setPh(s, x, 1); } break;
    }
  }
}
/** Majors assinam atos locais livres (corrida). */
function rush(s: GameState, x: Sc19, r: Rng, p: number): void {
  if (!r.chance(p)) return;
  const a = Object.values(s.acts).find((y) => !y.owner && inScene19(y, x.k) && (y.status === 'active' || y.status === 'emerging') && y.fame < 55 && !y.playerBand && !s.flags[`mka19:p360:${y.id}`]);
  const lb = Object.values(s.labels).filter((y) => y.active && y.family === 'A' && y.cash > money(s, 40000)).sort((m, n) => n.cash - m.cash)[0] ?? Object.values(s.labels).filter((y: Label) => y.active && y.cash > money(s, 20000))[0];
  if (!a || !lb) return;
  signWithRival(s, a, lb.id, r, true);
  const c = a.contractId ? s.contracts[a.contractId] : undefined;
  const inflate = 1 + 0.15 * Math.min(5, x.sg);
  if (c) { const add = Math.round(c.advance * (inflate - 1)); c.advance += add; c.recoupBalance += add; lb.cash -= add; }
  x.sg++; cnt(s, 'rush_sign');
}
function playerRush(s: GameState, x: Sc19): void {
  if (!isLabel(s)) return;
  const [city] = x.k.split(':');
  const mine = playerActs(s).some((id) => { const a = s.acts[id]; return a && inScene19(a, x.k); });
  if (!mine && s.config.homeCity !== city) return;
  pushInbox18(s, 'mka19_rush', { from: l('Seu A&R', 'Your A&R').pt, tone: 'info', weeks: 6, ref: { sc: x.k },
    subject: F(l('Corrida do ouro em "{n}"', 'Gold rush in "{n}"'), { n: scName(x.k) }),
    body: l('As majors chegaram com talão de cheques. Assinar barato agora (antes de os adiantamentos dispararem), vender uma fatia do seu braço local para uma major (dinheiro agora, cara de vendido) ou ficar independente (a cena respeita, a ressaca dói menos).', 'The majors arrived with chequebooks. Sign cheap now (before advances explode), sell a stake of your local arm to a major (cash now, sell-out image) or stay independent (the scene respects it, the hangover hurts less).'),
    actions: [{ id: 'cheap', label: l('Assinar barato agora', 'Sign cheap now') }, { id: 'stake', label: l('Vender fatia para uma major', 'Sell a stake to a major') }, { id: 'indie', label: l('Ficar independente', 'Stay independent') }] });
}
export const stakeValue19 = (s: GameState): number => money(s, 20000);
export function rushAnswer19(s: GameState, k: string, how: 'cheap' | 'stake' | 'indie'): L {
  const x = mka19(s).sc[k];
  if (!x) return l('A cena já passou.', 'The scene is gone.');
  const [city, g] = k.split(':');
  if (how === 'cheap') {
    const a = spawnProceduralAct(s, rng(s), { city, genre: genreById[g] && genreById[g].born <= s.year ? g : undefined, fame: 12 });
    const o = defaultOffer(s, a);
    const offer: Offer = { ...o, advance: Math.round(o.advance * 0.7), id: `mka19o${++mka19(s).seq}`, week: s.week, status: 'pending' };
    if (s.player.cash < offer.advance) return l('Caixa insuficiente.', 'Not enough cash.');
    acceptOffer(s, a, offer);
    return F(l('{a} assina com você antes da inflação (adiantamento −30%).', '{a} signs with you before the inflation (advance −30%).'), { a: a.name });
  }
  if (how === 'stake') {
    post(s, `mka19st:${k}`, stakeValue19(s), 'financing', `Fatia do braço local (${city})`);
    const rp = s.player.reputation; rp.artistic = clamp(rp.artistic - 3, 0, 100); rp.commercial = clamp(rp.commercial + 2, 0, 100);
    s.flags[`mka19:stake:${k}`] = s.year;
    return F(l('Fatia vendida: {v} em caixa; a cena torce o nariz.', 'Stake sold: {v} in cash; the scene sneers.'), { v: usd(stakeValue19(s)) });
  }
  s.flags[`mka19:indie:${k}`] = s.year;
  s.player.reputation.artistic = clamp(s.player.reputation.artistic + 2, 0, 100);
  return l('Você fica independente: a cena respeita.', 'You stay independent: the scene respects it.');
}
registerInboxKind('mka19_rush', { label: l('Corrida do ouro', 'Gold rush'), cat: 'decision', icon: 'chart', prio: 2, goto: () => ({ area: 'market19a' }),
  handle: (s, m, a) => rushAnswer19(s, String(m.ref?.sc), a === 'cheap' ? 'cheap' : a === 'stake' ? 'stake' : 'indie') });
registerConseq18('ib:mka19_rush:cheap', { now: l('Um talento local, adiantamento −30%.', 'A local talent, advance −30%.'), later: [{ in: [6, 18], p: 0.4, tone: 'good', hint: l('Quem chega cedo colhe quando a cena explode.', 'Early arrivals reap when the scene explodes.'), fx: (f) => { f.rep('commercial', 1).momentum(3); return l('Seu contratado barato vira o nome da cena.', 'Your cheap signing becomes the scene\'s name.'); } }] });
registerConseq18('ib:mka19_rush:stake', { now: l('Dinheiro agora; reputação artística −3.', 'Cash now; artistic reputation −3.'), later: [{ in: [8, 24], p: 0.45, tone: 'bad', hint: l('Sócio grande quer mandar.', 'A big partner wants to call the shots.'), fx: (f) => { f.rep('artists', -2).trust(-2); return l('A major sócia impõe singles de rádio; os artistas locais reclamam.', 'The partner major imposes radio singles; local artists complain.'); } }] });
registerConseq18('ib:mka19_rush:indie', { later: [{ in: [12, 30], p: 0.4, tone: 'good', hint: l('Na ressaca, quem ficou independente vira referência.', 'In the hangover, those who stayed indie become the reference.'), fx: (f) => { f.rep('artistic', 2).fans(4); return l('Na ressaca da cena, o selo independente é o que sobra de verdadeiro: os fãs ficam.', 'In the scene\'s hangover, the indie label is what remains authentic: the fans stay.'); } }] });
// efeitos: paradas e propostas (inflação de adiantamento) por fase; turismo depois da ressaca
registerMod('chartUnits', 'mka19:scene', (s, v, ctx) => {
  const rel = ctx.release; if (!rel || off()) return null;
  const x = sceneOf19(s, s.acts[rel.actId]); if (!x) return null;
  const k = x.ph === 2 ? 1.06 : x.ph === 1 ? 1.03 : x.ph === 4 && s.year - (x.bust ?? 0) <= 2 ? (s.flags[`mka19:indie:${x.k}`] && mineRel(s, rel) ? 0.95 : 0.9) : 1;
  return k !== 1 ? { value: v * k, label: F(l('Cena: {p}', 'Scene: {p}'), { p: PH19[x.ph] }) } : null;
});
registerOfferMod('mka19:rush', (s, act, o) => {
  if (off()) return null;
  const x = sceneOf19(s, act); if (!x || (x.ph !== 2 && x.ph !== 3)) return null;
  return o.advance < money(s, expectedAdvance(s, act)) * 1.4 ? { delta: -0.06, reason: F(l('Corrida do ouro em "{n}": as majors pagam mais', 'Gold rush in "{n}": the majors pay more'), { n: scName(x.k) }) } : null;
});
registerMod('cityDemand', 'mka19:tourism', (s, v, ctx) => {
  if (!ctx.cityId || off()) return null;
  const x = Object.values(mka19(s).sc).find((y) => y.ph === 4 && y.k.startsWith(`${ctx.cityId}:`) && s.year - (y.bust ?? 0) <= 4);
  return x ? { value: v * 1.08, label: F(l('Turismo da cena "{n}"', '"{n}" scene tourism'), { n: scName(x.k) }) } : null;
});
onFact('scene_boom', (s, f) => {
  headline19(s, f.text, 2); log(s, 'goldrush', f.text);
  const g = String(f.data?.g ?? ''); if (g) s.genrePop[g] = clamp((s.genrePop[g] ?? 1) + 0.05, 0.15, 2.2);
}, 'market19a:boom');
onFact('scene_bust', (s, f) => {
  headline19(s, f.text, 2); log(s, 'goldrush', f.text);
  const g = String(f.data?.g ?? ''), k = String(f.data?.k ?? '');
  if (g) s.genrePop[g] = clamp((s.genrePop[g] ?? 1) * 0.92, 0.15, 2.2);
  if (k) s.scenes[k] = (s.scenes[k] ?? 0) * 0.5;
}, 'market19a:bust');
REP_NOTES19.push((s) => Object.values(mka19(s).sc).filter((x) => x.ph === 2 || x.ph === 3).slice(0, 2).map((x) => F(l('Corrida do ouro em "{n}" ({p}): {k} assinaturas das majors; adiantamentos ali estão inflados.', 'Gold rush in "{n}" ({p}): {k} majors\' signings; advances there are inflated.'), { n: scName(x.k), p: PH19[x.ph], k: x.sg })));
REP_NOTES19.push((s) => { const n = mka19(s).ghN; return n >= 0.1 ? [F(l('Playlists de humor: ~{p}% são faixas sem rosto; gêneros calmos rendem menos.', 'Mood playlists: ~{p}% are faceless tracks; calm genres earn less.'), { p: Math.round(n * 100) })] : []; });
registerExplain('mka19.scene', (s, c) => {
  const x = mka19(s).sc[String(c.k ?? '')]; if (!x) return null;
  return { title: scName(x.k), value: Math.round(x.h), fmt: 'num', parts: [
    { label: l('Fase', 'Phase'), value: 0, fmt: 'text', note: PH19[x.ph] },
    { label: l('Calor da cena (cai 3%/semana)', 'Scene heat (falls 3%/week)'), value: Math.round(x.h), fmt: 'num' },
    { label: l('Pico', 'Peak'), value: Math.round(x.pk), fmt: 'num' },
    { label: l('Assinaturas das majors (adiantamento +15% cada)', 'Majors\' signings (advance +15% each)'), value: x.sg, fmt: 'num', tone: x.sg >= 4 ? 'bad' : undefined },
    { label: l('Paradas dos atos da cena', 'Charts for the scene\'s acts'), value: x.ph === 2 ? 1.06 : x.ph === 1 ? 1.03 : x.ph === 4 ? 0.9 : 1, fmt: 'mult' },
  ], note: l('Nasce (calor 20+) → hype (35+) → corrida (2+ assinaturas) → saturação (6 assinaturas ou 2 anos) → ressaca (turismo +8% nos shows) → renascimento anos depois.', 'Born (heat 20+) → hype (35+) → rush (2+ signings) → saturation (6 signings or 2 years) → backlash (show tourism +8%) → revival years later.') };
});
for (const id of ['goldrush', 'cert', 'research', 'ghost', 'star360', 'antitrust']) LINK18_PARTS[id] ??= (s) => [{ label: l('Registros deste sistema', 'Entries of this system'), value: Object.values(mka19(s).n).reduce((t, v) => t + v, 0), fmt: 'num' }];

// ================================================================ calendário, mês

registerDeadline('market19a', (s, from, to) => {
  const st = mka19(s), out: Deadline19[] = [];
  for (const x of st.anti) if (x.st === 'open' && x.w >= from && x.w <= to) out.push({ id: `market19a-an-${x.id}`, w: x.w, kind: 'money', t: F(l('Leilão antitruste: {n} masters de {b}', 'Antitrust auction: {n} masters from {b}'), { n: x.rels.length, b: s.labels[x.b]?.name ?? '?' }), tone: 'info', goto: { area: 'market19a' }, act: !x.bid });
  for (const p of Object.values(st.p360)) if (!p.done && p.end >= from && p.end <= to) out.push({ id: `market19a-360-${p.act}`, w: p.end, kind: 'contract', t: F(l('Fim do contrato de {a} (oferta 360)', '{a} contract ends (360 offer)'), { a: s.acts[p.act]?.name ?? '?' }), tone: p.k === 'let' ? 'bad' : 'info', goto: { act: p.act }, act: !p.k });
  return out;
});
registerSimHook('month', 'market19a', (s) => {
  if (off()) return;
  certMonth19(s);
  ghostMonth19(s);
  if (s.month === 0) ghostYear19(s);
  star360Month19(s);
  antiMonth19(s);
  scenesMonth19(s);
});
