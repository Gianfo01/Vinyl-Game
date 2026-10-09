// Eras de negócio (rodada 8): cada virada tecnológica muda o que é "tocar bem um selo". Na chegada do
// LP, da TV de clipes, do CD, da pirataria, do streaming e das vozes sintéticas, o selo escolhe uma
// postura estratégica com efeitos duradouros na economia (apelo por tipo de disco, catálogo, shows,
// prensagem, fãs, custos mensais). Os selos rivais também escolhem — cada um segundo o seu arquétipo.
// Posturas antigas continuam valendo, mas pesam menos a cada era nova.

import { clamp, type Rng } from '../../core/rng';
import { l, type L } from '../../data/world';
import { emitEvent, type EventDef } from '../events';
import { deferEvents, registerExt4, registerMod, registerSimHook } from '../ext4';
import type { Act, GameState, Label, Release } from '../types';
import { fmtL, money, notify, playerActs, post, remember } from '../util';

export type EraId = 'radio' | 'albums' | 'video' | 'cd' | 'piracy' | 'streaming' | 'synthetic';
type NpcTag = 'hits' | 'catalog' | 'indie' | 'empire';

/** Efeitos de uma postura (multiplicadores; 1 = neutro). */
export interface StanceFx {
  appeal?: number;
  single?: number;
  ep?: number;
  lp?: number;
  /** lançamentos novos (não reedição) */
  fresh?: number;
  /** reedições, coletâneas e ao vivo */
  reissue?: number;
  /** vendas semanais de tudo */
  units?: number;
  /** vendas de discos com 12–52 semanas */
  tail?: number;
  /** vendas de catálogo (mais de 52 semanas) */
  catalog?: number;
  show?: number;
  press?: number;
  /** apelo de atos/faixas sintéticos e humanos */
  synth?: number;
  human?: number;
}

export interface StanceDef {
  id: string;
  name: L;
  desc: L;
  fx: StanceFx;
  /** efeitos mensais no elenco do jogador */
  monthly?: { costPerAct?: number; fixed?: number; casual?: number; core?: number; fame?: number; fatigue?: number; trust?: number; scandal?: number };
  onPick?: (s: GameState) => void;
  npc: NpcTag[];
}

export interface EraShift {
  id: EraId;
  name: L;
  /** modelo de negócio da era (o que dá dinheiro) */
  model: L;
  question: L;
  tech?: string;
  stances: StanceDef[];
}

const rep = (s: GameState, k: keyof GameState['player']['reputation'], v: number) => { s.player.reputation[k] = clamp(s.player.reputation[k] + v, 0, 100); };

export const ERA_SHIFTS: EraShift[] = [
  {
    id: 'radio', name: l('Rádio e 78 rotações', 'Radio and 78s'),
    model: l('O disco é uma faixa só; a rádio e as partituras fazem o nome. Quem acerta um sucesso vive dele por meses.', 'A record is a single track; radio and sheet music make names. A hit feeds you for months.'),
    question: l('', ''), stances: [],
  },
  {
    id: 'albums', name: l('Do single ao álbum', 'From singles to albums'), tech: 'lp',
    model: l('O LP vira obra: o disco inteiro vende e vira assunto; o single passa a anunciar o álbum.', 'The LP becomes a work: the whole record sells and gets talked about; the single now announces the album.'),
    question: l('O LP chegou. O selo investe numa faixa forte ou numa obra completa?', 'The LP has arrived. Does the label invest in one strong track or a complete work?'),
    stances: [
      { id: 'hits', name: l('Apostar na faixa forte', 'Bet on the strong track'), desc: l('Singles +15% de apelo; LPs −8%.', 'Singles +15% appeal; LPs −8%.'), fx: { single: 1.15, lp: 0.92 }, npc: ['hits', 'empire'] },
      { id: 'works', name: l('Apostar na obra completa', 'Bet on the complete work'), desc: l('LPs +18%, EPs +5%; singles −10%. Reputação artística.', 'LPs +18%, EPs +5%; singles −10%. Artistic reputation.'), fx: { lp: 1.18, ep: 1.05, single: 0.9 }, onPick: (s) => rep(s, 'artistic', 3), npc: ['indie', 'catalog'] },
      { id: 'both', name: l('Equilibrar: o single anuncia, o LP fecha', 'Balance: the single announces, the LP closes'), desc: l('+4% para singles e LPs. Sem riscos, sem grandes saltos.', '+4% for singles and LPs. No risk, no big leaps.'), fx: { single: 1.04, lp: 1.04 }, npc: [] },
    ],
  },
  {
    id: 'video', name: l('A música vira imagem', 'Music becomes image'), tech: 'clipnet',
    model: l('A TV de clipes manda nas paradas: figurino, coreografia e um vídeo caro valem tanto quanto a canção.', 'Music-video TV rules the charts: styling, choreography and an expensive video are worth as much as the song.'),
    question: l('A TV de clipes explodiu. Quanto investir em imagem e performance visual?', 'Music-video TV exploded. How much to invest in image and visual performance?'),
    stances: [
      { id: 'image', name: l('Imagem é tudo', 'Image is everything'), desc: l('+14% de apelo, +6% nos shows e fama mensal; custa por artista todo mês.', '+14% appeal, +6% at shows and monthly fame; costs per artist every month.'), fx: { appeal: 1.14, show: 1.06 }, monthly: { costPerAct: 350, fame: 0.15 }, npc: ['hits', 'empire'] },
      { id: 'music', name: l('A música fala por si', 'The music speaks for itself'), desc: l('−5% de apelo; fãs fiéis crescem todo mês. Reputação artística.', '−5% appeal; core fans grow every month. Artistic reputation.'), fx: { appeal: 0.95 }, monthly: { core: 0.006 }, onPick: (s) => rep(s, 'artistic', 4), npc: ['indie'] },
      { id: 'selective', name: l('Clipes só para os singles fortes', 'Videos only for strong singles'), desc: l('Singles +6%; custo mensal pequeno.', 'Singles +6%; small monthly cost.'), fx: { single: 1.06 }, monthly: { costPerAct: 110 }, npc: ['catalog'] },
    ],
  },
  {
    id: 'cd', name: l('A febre do CD', 'The CD boom'), tech: 'cd',
    model: l('Todo mundo recompra a coleção em CD. Margens altas: lançar muito e reeditar o catálogo dão dinheiro.', 'Everyone rebuys their collection on CD. Fat margins: releasing a lot and reissuing the catalog both pay.'),
    question: l('O CD dispara. Financiar lançamentos novos ou explorar o catálogo?', 'The CD takes off. Fund new releases or exploit the catalog?'),
    stances: [
      { id: 'fresh', name: l('Financiar lançamentos novos', 'Fund new releases'), desc: l('Discos novos +10% de apelo; prensagem 8% mais barata.', 'New records +10% appeal; pressing 8% cheaper.'), fx: { fresh: 1.1, press: 0.92 }, npc: ['hits', 'indie'] },
      { id: 'catalog', name: l('Explorar o catálogo', 'Exploit the catalog'), desc: l('Catálogo vende +50%, reedições e coletâneas +35%; discos novos −5%.', 'Catalog sells +50%, reissues and compilations +35%; new records −5%.'), fx: { catalog: 1.5, reissue: 1.35, fresh: 0.95 }, npc: ['catalog', 'empire'] },
      { id: 'mixed', name: l('Um pouco de cada', 'A bit of both'), desc: l('Catálogo +15%, novos +3%.', 'Catalog +15%, new +3%.'), fx: { catalog: 1.15, fresh: 1.03 }, npc: [] },
    ],
  },
  {
    id: 'piracy', name: l('Pirataria e downloads', 'Piracy and downloads'), tech: 'p2p',
    model: l('A música vira arquivo e escapa: a venda física desaba e quem é ouvido de graça pode lotar os shows.', 'Music becomes a file and leaks: physical sales collapse, and whoever gets heard for free can fill venues.'),
    question: l('A troca de arquivos se espalha. Proteger a receita imediata ou ampliar o alcance?', 'File sharing spreads. Protect immediate revenue or widen reach?'),
    stances: [
      { id: 'protect', name: l('Proteger a receita', 'Protect revenue'), desc: l('Vendas +8% (processos e travas); custo mensal; o público casual encolhe e os artistas torcem o nariz.', 'Sales +8% (lawsuits and locks); monthly cost; the casual audience shrinks and artists frown.'), fx: { units: 1.08 }, monthly: { fixed: 250, costPerAct: 40, casual: -0.004 }, onPick: (s) => { rep(s, 'artists', -2); rep(s, 'institutional', 2); }, npc: ['empire', 'catalog'] },
      { id: 'reach', name: l('Ampliar o alcance', 'Widen the reach'), desc: l('Vendas −7%; público casual e fama crescem todo mês; shows +8%.', 'Sales −7%; casual audience and fame grow every month; shows +8%.'), fx: { units: 0.93, show: 1.08 }, monthly: { casual: 0.012, fame: 0.1 }, npc: ['indie', 'hits'] },
      { id: 'wait', name: l('Esperar a poeira baixar', 'Wait for the dust to settle'), desc: l('Nada muda — e os rivais podem sair na frente.', 'Nothing changes — and rivals may pull ahead.'), fx: {}, npc: [] },
    ],
  },
  {
    id: 'streaming', name: l('A era do streaming', 'The streaming era'), tech: 'streaming',
    model: l('Ninguém compra disco: cada execução paga centavos. Ganha quem lança sempre, quem segura o ouvinte e quem tem superfãs.', 'Nobody buys records: every play pays cents. Winners release often, keep listeners, or own superfans.'),
    question: l('O streaming virou o mercado. Priorizar frequência, retenção ou comunidade?', 'Streaming became the market. Prioritise frequency, retention or community?'),
    stances: [
      { id: 'frequency', name: l('Frequência', 'Frequency'), desc: l('Singles +15%, LPs −12%; o elenco cansa mais.', 'Singles +15%, LPs −12%; the roster tires faster.'), fx: { single: 1.15, lp: 0.88 }, monthly: { fatigue: 1.5 }, npc: ['hits'] },
      { id: 'community', name: l('Comunidade', 'Community'), desc: l('Superfãs crescem todo mês, shows +12%; vendas −3%; custo mensal pequeno.', 'Superfans grow every month, shows +12%; sales −3%; small monthly cost.'), fx: { show: 1.12, units: 0.97 }, monthly: { core: 0.01, costPerAct: 80 }, npc: ['indie'] },
      { id: 'retention', name: l('Retenção', 'Retention'), desc: l('Discos com mais de 3 meses vendem +20%; lançamento −3%.', 'Records older than 3 months sell +20%; launch −3%.'), fx: { tail: 1.2, catalog: 1.2, appeal: 0.97 }, npc: ['catalog', 'empire'] },
    ],
  },
  {
    id: 'synthetic', name: l('Vozes sintéticas', 'Synthetic voices'), tech: 'synthetic_voice',
    model: l('Qualquer voz pode ser clonada e qualquer catálogo treinado. O valor passa a estar em autoria, consentimento e identidade.', 'Any voice can be cloned and any catalog trained on. Value shifts to authorship, consent and identity.'),
    question: l('Vozes sintéticas chegaram. Como negociar autoria, consentimento e identidade?', 'Synthetic voices are here. How do you negotiate authorship, consent and identity?'),
    stances: [
      { id: 'open', name: l('Vozes livres', 'Open voices'), desc: l('Faixas e atos sintéticos +25%; humanos −3%; artistas desconfiam e há risco de escândalo todo mês.', 'Synthetic tracks and acts +25%; human −3%; artists grow wary and there is a monthly scandal risk.'), fx: { synth: 1.25, human: 0.97 }, monthly: { scandal: 0.02 }, onPick: (s) => { s.flags.consentAsked = 1; s.player.neural.consentPolicy = 'no_consent'; rep(s, 'artists', -8); }, npc: ['hits', 'empire'] },
      { id: 'human', name: l('Selo 100% humano', '100% human label'), desc: l('Humanos +8%, sintéticos −25%. Reputação artística.', 'Humans +8%, synthetic −25%. Artistic reputation.'), fx: { human: 1.08, synth: 0.75 }, onPick: (s) => { s.flags.consentAsked = 1; s.player.neural.consentPolicy = 'consent'; s.player.neural.humanFocus += 3; rep(s, 'artistic', 3); }, npc: ['indie'] },
      { id: 'consent', name: l('Consentimento, crédito e partilha', 'Consent, credit and revenue share'), desc: l('Humanos +3%; licenças custam pouco por mês; a confiança dos artistas sobe.', 'Humans +3%; licences cost a little each month; artist trust rises.'), fx: { human: 1.03 }, monthly: { costPerAct: 60, trust: 0.3 }, onPick: (s) => { s.flags.consentAsked = 1; s.player.neural.consentPolicy = 'consent'; rep(s, 'artists', 5); }, npc: ['catalog'] },
    ],
  },
];
export const eraById = Object.fromEntries(ERA_SHIFTS.map((e) => [e.id, e])) as Record<EraId, EraShift>;

export interface Era8State {
  /** postura escolhida pelo jogador por era (auto = escolhida pelo padrão) */
  chosen: Partial<Record<EraId, { s: string; w: number; auto?: boolean }>>;
  asked: Partial<Record<EraId, number>>;
  /** semana da última troca de postura (pivô) */
  pivot: number;
}
declare module '../ext4' { interface Ext4 { era8: Era8State } }
registerExt4('era8', () => ({ chosen: {}, asked: {}, pivot: -99 }));
export const era8 = (s: GameState): Era8State => {
  const x = s.x4 as unknown as { era8?: Era8State };
  x.era8 ??= { chosen: {}, asked: {}, pivot: -99 };
  return x.era8;
};

/** Ano em que a era começa nesta história (ou undefined se a tecnologia não existe). */
export function eraYear(s: GameState, id: EraId): number | undefined {
  const e = eraById[id];
  if (!e.tech) return -Infinity;
  const y = s.techDates[e.tech];
  if (y !== undefined) return y;
  // sem a rede de clipes nesta história, a TV musical cresce junto com o CD
  if (id === 'video' && s.techDates.cd !== undefined) return s.techDates.cd + 1;
  return undefined;
}

export function eraStarted(s: GameState, id: EraId, year = s.year): boolean {
  const y = eraYear(s, id);
  return y !== undefined && y <= year;
}

/** Eras já iniciadas, em ordem. */
export function erasSoFar(s: GameState): EraShift[] {
  return ERA_SHIFTS.filter((e) => eraStarted(s, e.id));
}

export function currentEra(s: GameState): EraShift {
  const list = erasSoFar(s);
  return list[list.length - 1] ?? ERA_SHIFTS[0];
}

const defaultStance = (e: EraShift) => e.stances[e.stances.length - 1];

/** hash estável (selos rivais escolhem sem guardar estado) */
function hash01(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10007) / 10007;
}

export function npcProfile(lb: Label): NpcTag {
  const a = lb.archetype ?? (lb.family === 'A' ? 'empire' : lb.family === 'C' ? 'hitmaker' : lb.family === 'D' ? 'catalog' : 'scene_hunter');
  if (a === 'empire') return 'empire';
  if (a === 'hitmaker' || lb.strategy === 'stars') return 'hits';
  if (a === 'catalog' || lb.strategy === 'buy_catalog') return 'catalog';
  return 'indie';
}

/** Postura de um dono ('player' ou id de selo) numa era; undefined se a era ainda não chegou. */
export function stanceOf(s: GameState, owner: string, id: EraId): StanceDef | undefined {
  const e = eraById[id];
  if (!e.stances.length || !eraStarted(s, id)) return undefined;
  if (owner === 'player') {
    const c = era8(s).chosen[id];
    return e.stances.find((x) => x.id === c?.s) ?? defaultStance(e);
  }
  const lb = s.labels[owner];
  if (!lb) return undefined;
  const tag = npcProfile(lb);
  const w = e.stances.map((x) => (x.npc.includes(tag) ? 3 : 1));
  let u = hash01(`${owner}|${id}`) * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < w.length; i++) { u -= w[i]; if (u < 0) return e.stances[i]; }
  return e.stances[0];
}

/** Peso da postura: a era atual vale inteira, a anterior metade, as mais velhas um quarto. */
function eraWeight(s: GameState, id: EraId): number {
  const list = erasSoFar(s).map((e) => e.id);
  const back = list.length - 1 - list.indexOf(id);
  return back <= 0 ? 1 : back === 1 ? 0.5 : 0.25;
}

type Active = { era: EraShift; stance: StanceDef; weight: number }[];
// cache por semana (o mercado consulta isto para cada disco, toda semana)
const cache = new WeakMap<GameState, { key: string; byOwner: Map<string, Active> }>();
let version = 0;

/** Posturas ativas de um dono, com peso. */
export function activeStances(s: GameState, owner: string): Active {
  const key = `${s.week}|${s.year}|${version}`;
  let c = cache.get(s);
  if (!c || c.key !== key) { c = { key, byOwner: new Map() }; cache.set(s, c); }
  let v = c.byOwner.get(owner);
  if (!v) { v = computeActive(s, owner); c.byOwner.set(owner, v); }
  return v;
}

function computeActive(s: GameState, owner: string): Active {
  const out: Active = [];
  for (const e of erasSoFar(s)) {
    const st = stanceOf(s, owner, e.id);
    if (st) out.push({ era: e, stance: st, weight: eraWeight(s, e.id) });
  }
  return out;
}

const ownerKey = (s: GameState, rel: Release | undefined, act: Act | undefined): string | null => {
  const a = act ?? (rel ? s.acts[rel.actId] : undefined);
  if (a?.playerBand || rel?.owner === 'player' || (!rel && a?.owner === 'player')) return 'player';
  return rel?.owner ?? a?.owner ?? null;
};

const isSynthetic = (s: GameState, rel: Release | undefined, act: Act | undefined): boolean => {
  if (act?.archetype === 'synthetic') return true;
  const lead = rel ? s.songs[rel.songs[0]] : undefined;
  return !!lead?.synthetic;
};

/** Multiplicador combinado de um conjunto de chaves para um dono. */
function mult(s: GameState, owner: string | null, pick: (fx: StanceFx) => number | undefined): number {
  if (!owner) return 1;
  let m = 1;
  for (const { stance, weight } of activeStances(s, owner)) {
    const v = pick(stance.fx);
    if (v !== undefined && v !== 1) m *= 1 + (v - 1) * weight;
  }
  return m;
}

const LBL = l('Postura da era', 'Era stance');

registerMod('appeal', 'era8', (s, v, c) => {
  const rel = c.release;
  const owner = ownerKey(s, rel, c.act);
  if (!rel || !owner) return null;
  const synth = isSynthetic(s, rel, c.act);
  const re = !!rel.reissueOf || rel.kind === 'compilation' || rel.kind === 'live';
  const m = mult(s, owner, (fx) => (fx.appeal ?? 1) * (fx[rel.type] ?? 1) * (re ? fx.reissue ?? 1 : fx.fresh ?? 1) * (synth ? fx.synth ?? 1 : fx.human ?? 1));
  return m === 1 ? null : { value: v * m, label: LBL };
});

registerMod('chartUnits', 'era8', (s, v, c) => {
  const rel = c.release;
  if (!rel) return null;
  const owner = ownerKey(s, rel, undefined);
  const age = s.week - rel.week;
  const m = mult(s, owner, (fx) => (fx.units ?? 1) * (age > 52 ? fx.catalog ?? 1 : age >= 12 ? fx.tail ?? 1 : 1));
  return m === 1 ? null : { value: v * m, label: LBL };
});

registerMod('showRevenue', 'era8', (s, v, c) => {
  const owner = ownerKey(s, undefined, c.act);
  const m = mult(s, owner, (fx) => fx.show);
  return m === 1 ? null : { value: v * m, label: LBL };
});

registerMod('pressingCost', 'era8', (s, v) => {
  const m = mult(s, 'player', (fx) => fx.press);
  return m === 1 ? null : { value: v * m, label: LBL };
});

/** Escolhe (ou troca) a postura do jogador numa era. */
export function chooseStance(s: GameState, id: EraId, stanceId: string, auto = false): L | null {
  const e = eraById[id];
  const st = e?.stances.find((x) => x.id === stanceId);
  if (!e || !st) return l('Postura desconhecida.', 'Unknown stance.');
  era8(s).chosen[id] = { s: st.id, w: s.week, auto: auto || undefined };
  version += 1;
  if (!auto) {
    st.onPick?.(s);
    remember(s, 'era_stance', fmtL(l('{e}: o selo escolhe "{st}".', '{e}: the label chooses "{st}".'), { e: e.name, st: st.name }), { important: true });
  }
  return null;
}

export const PIVOT_COST = 6000;
export const PIVOT_WEEKS = 26;

/** Pivô: trocar a postura da era atual custa dinheiro, reputação comercial e tem carência. */
export function pivotStance(s: GameState, stanceId: string): L | null {
  const e = currentEra(s);
  const st = era8(s);
  if (!e.stances.length) return l('Esta era não pede postura.', 'This era asks for no stance.');
  if ((st.chosen[e.id]?.s ?? defaultStance(e).id) === stanceId) return l('Essa já é a postura atual.', 'That is already the current stance.');
  if (s.week - st.pivot < PIVOT_WEEKS) return fmtL(l('Mudou de rumo há pouco: espere {n} semanas.', 'You changed course recently: wait {n} weeks.'), { n: PIVOT_WEEKS - (s.week - st.pivot) });
  const cost = money(s, PIVOT_COST);
  if (s.player.cash < cost) return l('Caixa insuficiente para reorganizar a empresa.', 'Not enough cash to reorganise the company.');
  post(s, `era8:pivot:${e.id}`, -cost, 'admin', `Mudança de estratégia ${e.name.pt}`);
  rep(s, 'commercial', -2);
  st.pivot = s.week;
  return chooseStance(s, e.id, stanceId);
}

// ---------------------------------------------------------------- decisões de era

const EVENTS: EventDef[] = ERA_SHIFTS.filter((e) => e.stances.length).map((e) => ({
  id: `era8_${e.id}`, cat: 'business', tone: 'neutral', tags: [], cooldown: 0, forcedOnly: true,
  title: fmtL(l('Nova era: {e}', 'New era: {e}'), { e: e.name }),
  text: { pt: `${e.model.pt} ${e.question.pt}`, en: `${e.model.en} ${e.question.en}` },
  options: e.stances.map((st) => ({ id: st.id, label: st.name, hint: st.desc, apply: (s: GameState) => { chooseStance(s, e.id, st.id); } })),
}));
deferEvents(EVENTS);

/** Pergunta pela era mais recente; eras que já passaram sem pergunta ficam com a postura padrão. */
export function checkEras(s: GameState, r: Rng): void {
  const st = era8(s);
  const list = erasSoFar(s).filter((e) => e.stances.length);
  list.forEach((e, i) => {
    if (st.chosen[e.id] || st.asked[e.id] !== undefined) return;
    if (i < list.length - 1) { chooseStance(s, e.id, defaultStance(e).id, true); return; }
    st.asked[e.id] = s.week;
    emitEvent(s, r, `era8_${e.id}`, {});
    // os rivais anunciam suas apostas
    const rivals = Object.values(s.labels).filter((x) => x.active).sort((a, b) => b.reputation - a.reputation).slice(0, 3);
    if (rivals.length) notify(s, fmtL(l('{e}: {list}.', '{e}: {list}.'), { e: e.name, list: { pt: rivals.map((x) => `${x.name} → ${stanceOf(s, x.id, e.id)?.name.pt}`).join('; '), en: rivals.map((x) => `${x.name} → ${stanceOf(s, x.id, e.id)?.name.en}`).join('; ') } }), 'event');
  });
}

function monthlyFx(s: GameState, r: Rng): void {
  const acts = playerActs(s).map((id) => s.acts[id]).filter((a) => a && a.status !== 'hiatus');
  for (const { era, stance, weight } of activeStances(s, 'player')) {
    const m = stance.monthly;
    if (!m) continue;
    const cost = Math.round(money(s, (m.fixed ?? 0) + (m.costPerAct ?? 0) * acts.length) * weight);
    if (cost > 0) post(s, `era8:${era.id}`, -cost, 'marketing', `${stance.name.pt} (${era.name.pt})`);
    for (const a of acts) {
      if (m.casual) a.fans.casual = Math.max(0, Math.round(a.fans.casual * (1 + m.casual * weight)));
      if (m.core) a.fans.core = Math.max(0, Math.round(a.fans.core * (1 + m.core * weight) + (m.core > 0 ? 1 : 0)));
      if (m.fame) a.fame = clamp(a.fame + m.fame * weight, 0, 100);
      if (m.trust) a.trust = clamp(a.trust + m.trust * weight, 0, 100);
      if (m.fatigue) for (const id of a.members) { const p = s.persons[id]; if (p?.alive) p.fatigue = clamp(p.fatigue + m.fatigue * weight, 0, 100); }
    }
    if (m.scandal && acts.length && r.chance(m.scandal * weight)) {
      rep(s, 'institutional', -4);
      rep(s, 'artists', -2);
      notify(s, l('Escândalo: uma voz foi clonada sem autorização num lançamento do selo.', 'Scandal: a voice was cloned without permission on one of the label\'s releases.'), 'bad');
      remember(s, 'era_scandal', l('Voz clonada sem autorização vira escândalo.', 'Voice cloned without permission becomes a scandal.'), { important: true });
    }
  }
}

registerSimHook('month', 'era8', (s, r) => {
  checkEras(s, r);
  monthlyFx(s, r);
});

/** Contagem de posturas entre os selos rivais ativos numa era. */
export function rivalStances(s: GameState, id: EraId): { stance: StanceDef; labels: string[] }[] {
  const e = eraById[id];
  return e.stances.map((st) => ({ stance: st, labels: Object.values(s.labels).filter((x) => x.active && stanceOf(s, x.id, id)?.id === st.id).map((x) => x.id) }));
}
