// Direitos como economia jogável (rodada 8, §3.3): cada acordo tem uma ficha transparente —
// propriedade do master e da edição, divisão entre selo, artista, produtor e convidados,
// adiantamento e recoupment, prazo e territórios, opções e exclusividade, direitos de sync,
// reedição, remasterização e licenciamento, e a cláusula de reversão.
//
// Regra de equilíbrio: a ficha padrão de cada modelo vale zero na avaliação do artista. Só o que o
// jogador muda em relação ao padrão pesa a favor (termos generosos) ou contra (termos duros).

import { clamp } from '../core/rng';
import { MARKETS, cityById, l, type L, type MarketId } from '../data/world';
import type { ContractModel } from '../data/rules';
import type { Act, Contract, GameState, Release, RightsTerms } from './types';
import type { Rng } from '../core/rng';
import { fmtL, money, notify, post, remember } from './util';

// ---------------------------------------------------------------- estado

export interface RenegDemand {
  id: string;
  actId: string;
  contractId: string;
  week: number;
  /** novo royalty pedido, bônus (centavos) e reversão pedida (anos; 0 = não pede) */
  royalty: number;
  bonus: number;
  reversionYears: number;
}

export interface RightsState {
  demands: RenegDemand[];
  /** autorizações compradas do artista: `${releaseId}:${tipo}` */
  perms: string[];
  /** masters que voltaram ao artista (histórico curto para a interface) */
  reversions: { week: number; actId: string; contractId: string; n: number }[];
}

declare module './ext4' {
  interface Ext4 {
    rights8: RightsState;
  }
}

export function rst(s: GameState): RightsState {
  const x = s as unknown as { x4: Record<string, unknown> };
  x.x4 ??= {};
  const st = (x.x4.rights8 ??= { demands: [], perms: [], reversions: [] }) as RightsState;
  st.reversions ??= [];
  return st;
}

// ---------------------------------------------------------------- padrões por modelo

export function defaultRights(model: ContractModel, publishing = false): RightsTerms {
  const base: RightsTerms = {
    master: 'label', pubShare: publishing ? 0.5 : 0, producerPts: 0.03, guestPts: 0.02, pointsFromLabel: false,
    scope: 'world', options: 0, exclusive: true, sync: true, reissue: true, remaster: true, license: true,
    reversionYears: 0, reversionNeedsRecoup: true,
  };
  if (model === '360' || model === 'publishing') base.pubShare = 0.5;
  if (model === 'licensing') return { ...base, master: 'artist', reissue: false, remaster: false, license: false, reversionYears: 2 };
  if (model === 'distribution') return { ...base, master: 'artist', producerPts: 0, guestPts: 0, exclusive: false, sync: false, reissue: false, remaster: false, license: false, reversionYears: 0, reversionNeedsRecoup: false };
  return base;
}

/** Ficha efetiva de um contrato (contratos antigos usam o padrão do modelo). */
export function rightsOf(c: Contract): RightsTerms {
  if (c.rights) return c.rights;
  const d = defaultRights(c.model, c.publishing);
  return { ...d, options: c.options ?? 0, scope: c.territories?.length ? 'region' : 'world' };
}

export const MASTER_NAME: Record<RightsTerms['master'], L> = {
  label: l('do selo', 'label-owned'),
  shared: l('dividido 50/50', 'shared 50/50'),
  artist: l('do artista (selo licencia)', 'artist-owned (label licenses)'),
};

export const SCOPE_NAME: Record<RightsTerms['scope'], L> = {
  home: l('só o mercado da sede', 'home market only'),
  region: l('mercados onde o selo atua', 'markets the label operates in'),
  world: l('mundo', 'worldwide'),
};

/** Territórios cobertos pelo escopo (undefined = mundo). */
export function scopeTerritories(s: GameState, scope: RightsTerms['scope']): MarketId[] | undefined {
  if (scope === 'world') return undefined;
  const home = cityById[s.config.homeCity]?.market ?? 'na';
  if (scope === 'home') return [home];
  return [...new Set([home, ...s.player.territories])];
}

// ---------------------------------------------------------------- avaliação pelo artista

/** Utilidade da ficha do ponto de vista do artista (maior = melhor para ele). */
export function rightsUtility(t: RightsTerms, amb: string): number {
  const free = amb === 'freedom' || amb === 'art' || amb === 'legacy';
  let u = 0;
  if (t.master === 'shared') u += free ? 0.16 : 0.1;
  if (t.master === 'artist') u += free ? 0.24 : 0.14;
  u -= t.pubShare * (amb === 'money' || amb === 'legacy' ? 0.4 : 0.28);
  if (t.pointsFromLabel) u += 0.03 + (t.producerPts + t.guestPts) * 0.8;
  else u -= (t.producerPts + t.guestPts - 0.05) * 0.8;
  const reach = amb === 'fame' || amb === 'status';
  if (t.scope === 'home') u += reach ? -0.06 : 0.03;
  if (t.scope === 'world') u += reach ? 0.04 : -0.02;
  u -= t.options * (amb === 'security' ? -0.01 : 0.035);
  if (!t.exclusive) u += amb === 'freedom' ? 0.07 : 0.04;
  const keep = (b: boolean, w: number) => (b ? 0 : w);
  u += keep(t.sync, amb === 'art' || amb === 'critics' ? 0.04 : 0.02) + keep(t.reissue, 0.015) + keep(t.remaster, 0.01) + keep(t.license, 0.02);
  if (t.master !== 'shared') {
    const yrs = t.reversionYears;
    const rev = t.master === 'artist' ? clamp((10 - yrs) / 10, 0, 1) * 0.08 : yrs > 0 ? clamp((30 - yrs) / 25, 0, 1) * (free ? 0.18 : 0.11) : 0;
    u += rev;
    if (!t.reversionNeedsRecoup && (yrs > 0 || t.master === 'artist')) u += 0.02;
  }
  return u;
}

export function rightsScore(t: RightsTerms | undefined, model: ContractModel, amb: string, publishing = false): { delta: number; reasons: L[] } {
  if (!t) return { delta: 0, reasons: [] };
  const d = defaultRights(model, publishing || model === '360' || model === 'publishing');
  const delta = rightsUtility(t, amb) - rightsUtility(d, amb);
  const reasons: L[] = [];
  const free = amb === 'freedom' || amb === 'art' || amb === 'legacy';
  if (free && t.master === 'label' && t.reversionYears === 0) reasons.push(l('Querem que os masters voltem um dia.', 'They want their masters back someday.'));
  if (t.master !== 'label' && d.master === 'label') reasons.push(l('Propriedade do master pesa muito a favor.', 'Master ownership weighs heavily in favor.'));
  if (t.reversionYears > 0 && d.reversionYears === 0) reasons.push(l('A cláusula de reversão agrada.', 'The reversion clause pleases them.'));
  if (t.pubShare > d.pubShare) reasons.push(l('Não gostam de ceder a edição das músicas.', 'They dislike giving up publishing.'));
  if (t.options > 0) reasons.push(l('Opções de discos futuros prendem a carreira.', 'Options on future records tie up the career.'));
  if (!t.exclusive) reasons.push(l('Sem exclusividade: liberdade para projetos paralelos.', 'Non-exclusive: freedom for side projects.'));
  if (t.pointsFromLabel) reasons.push(l('O selo pagar os pontos do produtor alivia o royalty.', 'The label paying producer points relieves the royalty.'));
  return { delta, reasons };
}

/** Confiança inicial que a ficha gera (generosa = artista assina mais tranquilo). */
export function signingTrust(t: RightsTerms | undefined, model: ContractModel, amb: string): number {
  return clamp(rightsScore(t, model, amb).delta * 40, -6, 8);
}

/** Taxa efetiva do artista sobre o bruto (master compartilhado = metade do líquido). */
export function artistRate(c: Contract, distFee: number): number {
  const t = rightsOf(c);
  if (c.model === 'distribution') return 1 - (c.distributionFee ?? 0.2);
  if (t.master === 'shared') return Math.max(c.royalty, 0.5 * (1 - distFee));
  return c.royalty;
}

/** Divisão da receita bruta de um disco (para a ficha): frações de 0 a 1. */
export function splitPreview(c: Pick<Contract, 'model' | 'royalty' | 'distributionFee' | 'publishing'> & { rights?: RightsTerms }, distFee: number, guest = true): { label: number; artist: number; producer: number; guests: number; distributor: number } {
  const t = c.rights ?? defaultRights(c.model, c.publishing);
  const rate = artistRate({ ...(c as Contract), rights: t }, distFee);
  const pts = t.producerPts + (guest ? t.guestPts : 0);
  const artist = t.pointsFromLabel ? rate : Math.max(0, rate - pts);
  const label = 1 - distFee - rate - (t.pointsFromLabel ? pts : 0);
  return { label, artist, producer: t.producerPts, guests: guest ? t.guestPts : 0, distributor: distFee };
}

// ---------------------------------------------------------------- qual acordo cobre cada disco

let cache: { s: GameState | null; key: string; idx: Map<string, Contract[]> } = { s: null, key: '', idx: new Map() };

function playerDeals(s: GameState, actId: string): Contract[] {
  const key = `${s.week}:${s.idSeq}`;
  if (cache.s !== s || cache.key !== key) {
    const idx = new Map<string, Contract[]>();
    for (const c of Object.values(s.contracts)) if (c.party === 'player') {
      const list = idx.get(c.actId) ?? [];
      list.push(c);
      idx.set(c.actId, list);
    }
    cache = { s, key, idx };
  }
  return cache.idx.get(actId) ?? [];
}

/** Contrato do selo que cobre o master do disco (reedições usam o acordo do original). */
export function dealOfRelease(s: GameState, rel: Release): Contract | undefined {
  const base = rel.reissueOf && s.releases[rel.reissueOf] ? s.releases[rel.reissueOf] : rel;
  if (base.owner !== 'player' && rel.owner !== 'player') return undefined;
  const deals = playerDeals(s, base.actId);
  let best: Contract | undefined;
  for (const c of deals) if (c.startWeek <= base.week && base.week <= c.endWeek + 1) if (!best || c.startWeek > best.startWeek) best = c;
  return best;
}

export function hasGuest(s: GameState, rel: Release): boolean {
  const cr = (s.x4 as unknown as { creation?: { songs: Record<string, { featuring?: string }> } }).creation;
  return !!rel.songs.some((id) => cr?.songs[id]?.featuring);
}

// ---------------------------------------------------------------- reversão

/** Semana em que os masters do contrato voltam ao artista (Infinity = nunca). */
export function revertWeek(c: Contract): number {
  const t = rightsOf(c);
  if (t.master === 'shared') return Infinity;
  if (t.master === 'label' && t.reversionYears <= 0) return Infinity;
  return c.endWeek + Math.round(t.reversionYears * 52);
}

export function releasesOfDeal(s: GameState, c: Contract): Release[] {
  const act = s.acts[c.actId];
  if (!act) return [];
  return act.releases.map((id) => s.releases[id]).filter((r): r is Release => !!r && r.owner === 'player' && dealOfRelease(s, r)?.id === c.id);
}

// ---------------------------------------------------------------- exploração (sync, reedição, remaster, licença)

export type ExploitKind = 'sync' | 'reissue' | 'remaster' | 'license';

export const EXPLOIT_NAME: Record<ExploitKind, L> = {
  sync: l('sincronização', 'sync'),
  reissue: l('reedição', 'reissue'),
  remaster: l('remasterização', 'remaster'),
  license: l('licenciamento a terceiros', 'third-party licensing'),
};

export function hasExploit(s: GameState, rel: Release, kind: ExploitKind): boolean {
  const c = dealOfRelease(s, rel);
  if (!c) return true; // catálogo comprado ou sem ficha: o selo administra
  if (rightsOf(c)[kind]) return true;
  return rst(s).perms.includes(`${rel.reissueOf ?? rel.id}:${kind}`);
}

/** Bloqueio por contrato (null = pode). */
export function exploitBlock(s: GameState, rel: Release, kind: ExploitKind): L | null {
  if (hasExploit(s, rel, kind)) return null;
  return l(`O contrato não cede ao selo o direito de ${EXPLOIT_NAME[kind].pt}. Peça autorização ao artista na ficha de Direitos.`, `The contract does not grant the label ${EXPLOIT_NAME[kind].en} rights. Ask the artist for permission in the Rights sheet.`);
}

export function permissionPrice(s: GameState, rel: Release, kind: ExploitKind): number {
  const act = s.acts[rel.actId];
  const base = { sync: 1200, reissue: 2500, remaster: 1800, license: 3000 }[kind];
  return money(s, base + (act?.fame ?? 0) * 60);
}

/** Compra a autorização do artista para explorar um master. Confiança baixa = recusa. */
export function buyPermission(s: GameState, relId: string, kind: ExploitKind, post: (amount: number) => void): L | null {
  const rel = s.releases[relId];
  if (!rel || rel.owner !== 'player') return l('Só masters do seu catálogo.', 'Only masters in your catalog.');
  if (hasExploit(s, rel, kind)) return l('Já autorizado.', 'Already allowed.');
  const act = s.acts[rel.actId];
  if (act && act.trust < 30) return l('O artista não confia no selo para autorizar isso agora.', 'The artist does not trust the label enough to allow it now.');
  const price = permissionPrice(s, rel, kind);
  if (s.player.cash < price) return l('Caixa insuficiente.', 'Not enough cash.');
  post(price);
  if (act) {
    act.cash += price;
    act.trust = clamp(act.trust + 2, 0, 100);
  }
  rst(s).perms.push(`${rel.reissueOf ?? rel.id}:${kind}`);
  return null;
}

/** Fatia do selo no lado master de um sync (0..0.75). */
export function syncMasterShare(s: GameState, act: Act, songId: string | undefined, fallback: number): number {
  const rel = songId ? s.releases[s.songs[songId]?.releaseId ?? ''] : undefined;
  if (!rel) return fallback;
  if (rel.owner !== 'player') return 0;
  const c = dealOfRelease(s, rel);
  if (!c) return fallback || 0.75;
  const t = rightsOf(c);
  if (!hasExploit(s, rel, 'sync')) return 0.15; // só taxa de administração; o artista decide
  void act;
  return t.master === 'label' ? 0.75 : t.master === 'shared' ? 0.375 : 0.25;
}

// ---------------------------------------------------------------- valor de catálogo

export function annualRevenue(rel: Release): number {
  if (!rel.totalUnits) return 0;
  const last = rel.weekly.slice(-52).reduce((a, b) => a + b, 0);
  return Math.round(rel.revenue * Math.min(1, last / rel.totalUnits));
}

export interface CatalogRow { rel: Release; deal?: Contract; annual: number; years: number; value: number }

/** Valor estimado do catálogo: receita anual × anos de direito restantes (com desconto). */
export function catalogValue(s: GameState): { value: number; perpetual: number; reverting: number; rows: CatalogRow[] } {
  const rows: CatalogRow[] = [];
  let perpetual = 0;
  let reverting = 0;
  for (const rel of Object.values(s.releases)) {
    if (rel.owner !== 'player' || s.acts[rel.actId]?.playerBand) continue;
    const deal = dealOfRelease(s, rel);
    const annual = annualRevenue(rel);
    const rw = deal ? revertWeek(deal) : Infinity;
    const years = rw === Infinity ? Infinity : Math.max(0, (rw - s.week) / 52);
    const share = deal && rightsOf(deal).master === 'shared' ? 0.5 : 1;
    const mult = years === Infinity ? 8 : Math.min(8, years * 0.85);
    const value = Math.round(annual * mult * share);
    if (years === Infinity) perpetual += value;
    else reverting += value;
    rows.push({ rel, deal, annual, years, value });
  }
  rows.sort((a, b) => b.value - a.value);
  return { value: perpetual + reverting, perpetual, reverting, rows };
}

// ---------------------------------------------------------------- poder de barganha

/** Quanto o artista cresceu desde a assinatura (0 = igual; 1 = muito). */
export function artistPower(s: GameState, c: Contract): number {
  const act = s.acts[c.actId];
  if (!act) return 0;
  const f0 = c.fameAtSign ?? act.fame;
  return clamp((act.fame - f0) / 40 + act.number1s * 0.05, 0, 1.2);
}

/** Ajuste na chance de renovação: ficha justa ajuda; artista que cresceu cobra mais. */
export function renewalAdj(s: GameState, c: Contract): number {
  const act = s.acts[c.actId];
  if (!act) return 0;
  const amb = mainAmbitionLite(s, act);
  const fair = rightsScore(c.rights, c.model, amb, c.publishing).delta;
  return clamp(fair * 0.6, -0.12, 0.15) - artistPower(s, c) * 0.25;
}

function mainAmbitionLite(s: GameState, act: Act): string {
  const counts: Record<string, number> = {};
  for (const id of act.members) {
    const p = s.persons[id];
    if (p) counts[p.ambition] = (counts[p.ambition] ?? 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'art';
}

export function marketsName(ms: MarketId[] | undefined): string {
  if (!ms) return '—';
  return ms.map((m) => MARKETS.find((x) => x.id === m)?.id.toUpperCase() ?? m).join(', ');
}

// ---------------------------------------------------------------- ações do jogador

/** Paga ao artista para estender os masters por mais 10 anos antes da reversão. */
export function extendPrice(s: GameState, c: Contract): number {
  const rels = releasesOfDeal(s, c);
  return Math.max(money(s, 5000), Math.round(rels.reduce((t, r) => t + annualRevenue(r), 0) * 3));
}

export function extendMasters(s: GameState, contractId: string): L | null {
  const c = s.contracts[contractId];
  if (!c || c.party !== 'player' || c.reverted) return l('Contrato inválido.', 'Invalid contract.');
  if (revertWeek(c) === Infinity) return l('Estes masters não revertem.', 'These masters do not revert.');
  const act = s.acts[c.actId];
  if (!act) return l('Artista indisponível.', 'Artist unavailable.');
  if (act.trust < 30) return l('O artista não quer negociar os masters com o selo.', 'The artist will not negotiate the masters with the label.');
  const price = extendPrice(s, c);
  if (s.player.cash < price) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `extend:${c.id}`, -price, 'acquisitions', `Extensão dos masters de ${act.name}`);
  act.cash += price;
  c.rights = { ...rightsOf(c), reversionYears: rightsOf(c).reversionYears + 10 };
  c.revertWarned = false;
  remember(s, 'masters_extended', fmtL(l('{c} paga a {a} para manter os masters por mais 10 anos.', '{c} pays {a} to keep the masters 10 more years.'), { c: s.config.companyName, a: act.name }), { actId: act.id });
  return null;
}

export function buyExploitPermission(s: GameState, relId: string, kind: ExploitKind): L | null {
  return buyPermission(s, relId, kind, (price) => post(s, `perm:${relId}:${kind}`, -price, 'royalties', `Autorização de ${EXPLOIT_NAME[kind].pt}`));
}

/** Resposta a um artista que cresceu e pede renegociação. */
export function respondDemand(s: GameState, r: Rng, demandId: string, answer: 'accept' | 'counter' | 'refuse'): L | null {
  const st = rst(s);
  const d = st.demands.find((x) => x.id === demandId);
  if (!d) return l('Pedido expirado.', 'Request expired.');
  const c = s.contracts[d.contractId];
  const act = s.acts[d.actId];
  if (!c || !act || c.party !== 'player') {
    st.demands = st.demands.filter((x) => x !== d);
    return l('Contrato inválido.', 'Invalid contract.');
  }
  const apply = (royalty: number, bonus: number, rev: number, trust: number) => {
    if (bonus > 0) post(s, `reneg:${act.id}`, -bonus, 'advances', `Renegociação ${act.name}`);
    act.cash += bonus;
    c.recoupBalance += bonus;
    c.royalty = Math.max(c.royalty, royalty);
    if (rev > 0) c.rights = { ...rightsOf(c), reversionYears: rightsOf(c).reversionYears > 0 ? Math.min(rightsOf(c).reversionYears, rev) : rev };
    c.fameAtSign = Math.round(act.fame * 10) / 10;
    c.lastRenegWeek = s.week;
    act.trust = clamp(act.trust + trust, 0, 100);
  };
  if (answer === 'accept') {
    if (s.player.cash < d.bonus) return l('Caixa insuficiente para o bônus.', 'Not enough cash for the bonus.');
    apply(d.royalty, d.bonus, d.reversionYears, 12);
    remember(s, 'renegotiation', fmtL(l('{a} renegocia com força: royalty de {r}% e bônus.', '{a} renegotiates from strength: {r}% royalty and a bonus.'), { a: act.name, r: Math.round(d.royalty * 100) }), { actId: act.id });
  } else if (answer === 'counter') {
    const bonus = Math.round(d.bonus / 2);
    if (s.player.cash < bonus) return l('Caixa insuficiente.', 'Not enough cash.');
    const royalty = Math.round(((c.royalty + d.royalty) / 2) * 100) / 100;
    if (r.chance(clamp(0.3 + act.trust / 200, 0.1, 0.8))) {
      apply(royalty, bonus, d.reversionYears ? d.reversionYears + 10 : 0, 4);
      notify(s, fmtL(l('{a} aceitou o meio-termo.', '{a} accepted the middle ground.'), { a: act.name }), 'good');
    } else {
      act.trust = clamp(act.trust - 8, 0, 100);
      c.lastRenegWeek = s.week - 52;
      st.demands = st.demands.filter((x) => x !== d);
      return l('Recusaram o meio-termo e voltam a pedir daqui a um ano.', 'They refused the middle ground and will ask again in a year.');
    }
  } else {
    act.trust = clamp(act.trust - 15, 0, 100);
    c.lastRenegWeek = s.week;
    if (act.trust < 35) s.flags[`leaving:${act.id}`] = 1;
    remember(s, 'renegotiation_refused', fmtL(l('{c} recusa renegociar com {a}.', '{c} refuses to renegotiate with {a}.'), { c: s.config.companyName, a: act.name }), { actId: act.id });
  }
  st.demands = st.demands.filter((x) => x !== d);
  return null;
}
