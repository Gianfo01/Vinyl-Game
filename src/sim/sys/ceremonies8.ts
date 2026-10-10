// Premiações com página própria (rodada 8). Os Gramófonos de Ouro (≈ Grammy) passam a ter indicados
// anunciados em outubro, campanhas "para sua consideração" que o selo pode pagar (com risco de
// reação da imprensa quando exageradas) e convite para os indicados tocarem na cerimônia, em
// dezembro. As outras premiações (crítica, regionais, indústria e nacionais por país) ganham página
// com data, como se decide e histórico de vencedores.

import { clamp, type Rng } from '../../core/rng';
import { l, type L } from '../../data/world';
import { registerExt4, registerSimHook } from '../ext4';
import type { GameState, Release } from '../types';
import { fmtL, money, nextId, notify, playerActs, post, remember } from '../util';

export type GramoCat = 'record' | 'album' | 'newcomer' | 'performance';
export const GRAMO_CATS: { id: GramoCat; name: L; rule: L }[] = [
  { id: 'record', name: l('Gravação do Ano', 'Record of the Year'), rule: l('Singles do ano: qualidade e vendas.', 'Singles of the year: quality and sales.') },
  { id: 'album', name: l('Álbum do Ano', 'Album of the Year'), rule: l('LPs do ano: qualidade pesa mais que vendas.', 'LPs of the year: quality weighs more than sales.') },
  { id: 'newcomer', name: l('Artista Revelação', 'Best New Artist'), rule: l('Quem estreou no ano ou no anterior: fama e qualidade.', 'Debuted this or last year: fame and quality.') },
  { id: 'performance', name: l('Melhor Performance', 'Best Performance'), rule: l('A melhor interpretação gravada no ano.', 'The best recorded performance of the year.') },
];

export interface Campaign8 { id: string; relId: string; cat: GramoCat; level: number; year: number }
export interface Cer8State {
  noms: { year: number; cats: Partial<Record<GramoCat, string[]>> } | null;
  campaigns: Campaign8[];
  perform: { actId: string; year: number; accepted?: boolean }[];
}

declare module '../ext4' { interface Ext4 { cer8: Cer8State } }
registerExt4('cer8', () => ({ noms: null, campaigns: [], perform: [] }));
export const cer8 = (s: GameState): Cer8State => (s as unknown as { x4: { cer8: Cer8State } }).x4.cer8;

export const NOMS_MONTH = 9; // outubro
export const CEREMONY_MONTH = 11; // dezembro
export const CAMPAIGN_COST = [3000, 8000, 18000];
const CAMPAIGN_BONUS = [4, 8, 13];

/** Pontuação de um lançamento numa categoria (sem sorte; a sorte entra só na noite da cerimônia). */
export function gramoScore(s: GameState, cat: GramoCat, x: Release): number {
  const act = s.acts[x.actId];
  const base = cat === 'record' ? x.q * 1.2 + Math.log10(1 + x.totalUnits) * 8
    : cat === 'album' ? x.q * 1.4 + Math.log10(1 + x.totalUnits) * 6
    : cat === 'newcomer' ? (act?.fame ?? 0) + x.q * 0.5
    : Math.max(0, ...x.songs.map((id) => s.songs[id]?.performance ?? 0));
  return base + campaignBonus(s, x.id, cat);
}

export function eligible(s: GameState, cat: GramoCat, x: Release): boolean {
  if (x.year !== s.year || x.totalUnits <= 0 || x.hist) return false;
  if (cat === 'record') return x.type === 'single';
  if (cat === 'album') return x.type === 'lp';
  if (cat === 'newcomer') return (s.acts[x.actId]?.debutYear ?? 0) >= s.year - 1;
  return true;
}

export function campaignBonus(s: GameState, relId: string, cat: string): number {
  const c = cer8(s).campaigns.find((x) => x.relId === relId && x.cat === cat && x.year === s.year);
  return (c ? CAMPAIGN_BONUS[c.level - 1] ?? 0 : 0) + GRAMO_ADJ.reduce((t, f) => t + f(s, relId, cat), 0);
}
/** Rodada 18 (awards18): ajustes extras de indicação/vitória (corpo de votantes, campanhas, elegibilidade de IA). */
export const GRAMO_ADJ: ((s: GameState, relId: string, cat: string) => number)[] = [];

/** Indicados anunciados (se já saíram neste ano) para a categoria. */
export function nominees(s: GameState, cat: GramoCat): string[] | undefined {
  const n = cer8(s).noms;
  return n && n.year === s.year ? n.cats[cat] : undefined;
}

/** Filtro usado pela cerimônia (legacy.yearlyAwards): só concorre quem foi indicado. */
export function restrictToNominees(s: GameState, cat: string, list: Release[]): Release[] {
  const ids = nominees(s, cat as GramoCat);
  if (!ids?.length) return list;
  const set = new Set(ids);
  const out = list.filter((x) => set.has(x.id));
  return out.length ? out : list;
}

function announce(s: GameState): void {
  const st = cer8(s);
  const rels = Object.values(s.releases).filter((x) => x.year === s.year && x.totalUnits > 0 && !x.hist);
  const cats: Partial<Record<GramoCat, string[]>> = {};
  const mine = new Set(playerActs(s));
  const mineNoms: string[] = [];
  for (const c of GRAMO_CATS) {
    const list = rels.filter((x) => eligible(s, c.id, x)).map((x) => ({ x, v: gramoScore(s, c.id, x) })).sort((a, b) => b.v - a.v);
    // um indicado por ato em cada categoria
    const seen = new Set<string>();
    const picks: string[] = [];
    for (const { x } of list) {
      if (seen.has(x.actId)) continue;
      seen.add(x.actId);
      picks.push(x.id);
      if (picks.length >= 5) break;
    }
    cats[c.id] = picks;
    for (const id of picks) {
      const rel = s.releases[id];
      if (rel && (rel.owner === 'player' || mine.has(rel.actId))) mineNoms.push(`${s.acts[rel.actId]?.name ?? '?'} (${c.name.pt})`);
    }
  }
  st.noms = { year: s.year, cats };
  if (mineNoms.length) {
    notify(s, fmtL(l('Indicações aos Gramófonos de Ouro: {n}!', 'Golden Gramophone nominations: {n}!'), { n: mineNoms.join(', ') }), 'good');
    remember(s, 'nominated', fmtL(l('Indicados aos Gramófonos de Ouro {y}: {n}.', 'Golden Gramophone {y} nominees: {n}.'), { y: s.year, n: mineNoms.join(', ') }), { important: true });
    // convite para tocar na cerimônia: o indicado mais famoso do selo
    const acts = [...new Set(Object.values(cats).flat().map((id) => s.releases[id!]?.actId).filter((id): id is string => !!id && mine.has(id)))];
    const best = acts.map((id) => s.acts[id]).filter(Boolean).sort((a, b) => b.fame - a.fame)[0];
    if (best && best.fame >= 18 && !st.perform.some((p) => p.actId === best.id && p.year === s.year)) {
      st.perform.push({ actId: best.id, year: s.year });
      notify(s, fmtL(l('A produção da cerimônia convida {a} para tocar ao vivo em dezembro.', 'The ceremony producers invite {a} to play live in December.'), { a: best.name }), 'event');
    }
  }
}

/** Campanha "para sua consideração": anúncios, audições para votantes, jantares. */
export function runCampaign(s: GameState, r: Rng, relId: string, cat: GramoCat, level: number): L | null {
  const rel = s.releases[relId];
  if (!rel || !(rel.owner === 'player' || s.acts[rel.actId]?.playerBand)) return l('Só lançamentos seus.', 'Only your releases.');
  if (!eligible(s, cat, rel)) return l('Esse lançamento não concorre nessa categoria este ano.', 'This release is not eligible in this category this year.');
  if (s.month >= CEREMONY_MONTH) return l('A votação já fechou.', 'Voting has closed.');
  const st = cer8(s);
  const cur = st.campaigns.find((x) => x.relId === relId && x.cat === cat && x.year === s.year);
  const lv = clamp(Math.round(level), 1, 3);
  if (cur && cur.level >= lv) return l('Já existe uma campanha desse tamanho.', 'A campaign of that size already exists.');
  const cost = money(s, CAMPAIGN_COST[lv - 1]) - (cur ? money(s, CAMPAIGN_COST[cur.level - 1]) : 0);
  if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `fyc:${relId}:${cat}:${lv}`, -cost, 'marketing', `Campanha de premiação: ${rel.title}`);
  if (cur) cur.level = lv;
  else st.campaigns.push({ id: nextId(s, 'fyc'), relId, cat, level: lv, year: s.year });
  if (st.campaigns.length > 30) st.campaigns.splice(0, st.campaigns.length - 30);
  // campanha agressiva demais vira notícia de "compra de prêmio"
  if (lv === 3 && r.chance(0.15)) {
    s.player.reputation.artistic = clamp(s.player.reputation.artistic - 3, 0, 100);
    notify(s, fmtL(l('A imprensa chama a campanha de "{t}" de compra de prêmio.', 'The press calls the "{t}" campaign award-buying.'), { t: rel.title }), 'bad');
  }
  return null;
}

export function answerPerform(s: GameState, actId: string, yes: boolean): void {
  const p = cer8(s).perform.find((x) => x.actId === actId && x.year === s.year);
  if (p) p.accepted = yes;
}

function ceremonyNight(s: GameState): void {
  const st = cer8(s);
  for (const p of st.perform) {
    if (p.year !== s.year || !p.accepted) continue;
    const act = s.acts[p.actId];
    if (!act) continue;
    act.fame = clamp(act.fame + 2.5 * (1 - act.fame / 120), 0, 100);
    act.fans.casual += Math.round(2000 + act.fame * 300);
    act.momentum = clamp(act.momentum + 10, 0, 100);
    for (const id of act.members) { const x = s.persons[id]; if (x?.alive) x.fatigue = clamp(x.fatigue + 6, 0, 100); }
    remember(s, 'ceremony_show', fmtL(l('{a} tocou ao vivo na cerimônia dos Gramófonos de Ouro {y}.', '{a} played live at the {y} Golden Gramophones.'), { a: act.name, y: s.year }), { actId: act.id, important: true });
  }
  st.perform = st.perform.filter((x) => x.year >= s.year);
}

registerSimHook('month', 'cer8', (s) => {
  if (s.month === NOMS_MONTH) announce(s);
});
registerSimHook('year', 'cer8', (s) => ceremonyNight(s));
