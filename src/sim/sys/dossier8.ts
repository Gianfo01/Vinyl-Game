// Sistema "dossier8" (rodada 8, §3.4): A&R como aposta informada. Cada ato no radar tem um dossiê
// de descoberta com sete sinais separados (palco, originalidade, base de fãs, cena local, potencial
// comercial, risco e disputa de rivais). As fontes são enviesadas — o produtor enxerga técnica, o
// promotor enxerga palco, o crítico enxerga novidade, o agente local enxerga relacionamento — e
// ninguém revela o "valor verdadeiro": consultar de novo a mesma fonte estreita o intervalo, mas não
// tira o viés dela. O jogador pode contratar cedo, pagar mais pesquisa, financiar uma demo, bancar uma
// residência de shows ou deixar o rival arriscar; o histórico das apostas mostra se ele acertou antes
// do mercado ou se apaixonou por uma aposta ruim.

import { clamp, hashString } from '../../core/rng';
import { MARKETS, MARKET_PREF, cityById, familyOf, l, type L, type MarketId } from '../../data/world';
import { registerExt4, registerSimHook } from '../ext4';
import { estimate, scoutActionsPerMonth } from '../scouting';
import type { Act, GameState } from '../types';
import { fmtL, money, notify, post, remember, rngOf, staffSkill } from '../util';
import { actAttr, attrById } from './talent/attrs';

export type Dim = 'live' | 'orig' | 'fans' | 'scene' | 'comm' | 'risk' | 'rival';
export type Src = 'producer' | 'promoter' | 'critic' | 'local' | 'demo' | 'residency';

export const DIMS: { id: Dim; name: L; desc: L }[] = [
  { id: 'live', name: l('Palco e consistência', 'Live quality and consistency'), desc: l('Rende ao vivo noite após noite?', 'Do they deliver live, night after night?') },
  { id: 'orig', name: l('Originalidade e influência', 'Originality and influence'), desc: l('Tem algo que ninguém tem? Pode puxar uma cena?', 'Something nobody else has? Could they lead a scene?') },
  { id: 'fans', name: l('Base de fãs e lealdade', 'Fan base and loyalty'), desc: l('Quantos são e quantos ficam.', 'How many, and how many stay.') },
  { id: 'scene', name: l('Encaixe na cena local', 'Local scene fit'), desc: l('A cidade e o gênero estão a favor?', 'Are the city and the genre on their side?') },
  { id: 'comm', name: l('Potencial comercial', 'Commercial potential'), desc: l('Vende em que formato e em que mercado?', 'Sells in which format and market?') },
  { id: 'risk', name: l('Risco (conflito, burnout, saída)', 'Risk (conflict, burnout, early exit)'), desc: l('Alto = mais chance de dar problema.', 'High = more likely to cause trouble.') },
  { id: 'rival', name: l('Interesse de rivais', 'Rival interest'), desc: l('Chance de outro selo disputar a assinatura.', 'Chance another label bids for the signing.') },
];

interface SrcDef {
  name: L;
  sees: L;
  cost: number; // dólares reais
  weeks: number; // 0 = na hora
  action: boolean; // usa ação de scouting
  /** por sinal: [ruído, viés estrutural] */
  prof: Partial<Record<Dim, [number, number]>>;
}

export const SOURCES8: Record<Src, SrcDef> = {
  producer: { name: l('Produtor', 'Producer'), sees: l('enxerga técnica: valoriza quem toca bem e soa original no estúdio', 'sees technique: rates players and studio originality highly'), cost: 400, weeks: 0, action: true, prof: { live: [6, 2], orig: [7, 6], comm: [12, -2], risk: [14, 0] } },
  promoter: { name: l('Promotor de shows', 'Show promoter'), sees: l('enxerga palco: superestima quem levanta a casa', 'sees stage power: overrates whoever lifts the room'), cost: 300, weeks: 0, action: true, prof: { live: [5, 8], fans: [6, 6], comm: [9, 4], rival: [12, 0] } },
  critic: { name: l('Crítico', 'Critic'), sees: l('enxerga novidade: ama o original, desconfia do comercial', 'sees novelty: loves the original, distrusts the commercial'), cost: 250, weeks: 0, action: true, prof: { orig: [5, 9], comm: [14, -8], scene: [10, 4], fans: [15, -4] } },
  local: { name: l('Agente local', 'Local agent'), sees: l('enxerga relacionamento: conhece a cena e minimiza os problemas dos amigos', 'sees relationships: knows the scene and downplays friends\' problems'), cost: 200, weeks: 0, action: true, prof: { scene: [5, 7], risk: [7, -7], rival: [6, -3], fans: [9, 3], live: [12, 3] } },
  demo: { name: l('Demo financiada', 'Funded demo'), sees: l('ouve o material de verdade, mas uma gravação é só uma amostra', 'hears the real material, but one recording is just a sample'), cost: 1500, weeks: 4, action: false, prof: { orig: [6, 0], comm: [7, 0] } },
  residency: { name: l('Residência de shows', 'Show residency'), sees: l('semanas de palco mostram o ato sob pressão — e chamam atenção', 'weeks on stage show the act under pressure — and draw attention'), cost: 2500, weeks: 8, action: false, prof: { live: [4, 0], fans: [5, 0], risk: [6, 0], scene: [6, 0] } },
};

export const SRC_IDS = Object.keys(SOURCES8) as Src[];
const DIM_IDS = DIMS.map((d) => d.id);

/** Leitura: [fonte, sinal, centro, meia-largura, semana]. */
export type Read = [number, number, number, number, number];

export interface Dossier {
  reads: Read[];
  n: Partial<Record<Src, number>>;
  pending?: { src: Src; ready: number }[];
  spent: number;
}

export interface AnrCall {
  actId: string;
  kind: 'sign' | 'pass';
  week: number;
  fame0: number;
  hits0: number;
  /** leitura do jogador no momento (0–100) e quantas fontes ele ouviu */
  read: number;
  info: number;
  judged?: 'early' | 'right' | 'wrong' | 'missed' | 'dodged';
}

export interface DossierState {
  d: Record<string, Dossier>;
  calls: AnrCall[];
}

declare module '../ext4' {
  interface Ext4 {
    dossier8: DossierState;
  }
}

registerExt4('dossier8', () => ({ d: {}, calls: [] }));

export function dos(s: GameState): DossierState {
  const x = s as unknown as { x4: Record<string, unknown> };
  x.x4 ??= {};
  return (x.x4.dossier8 ??= { d: {}, calls: [] }) as DossierState;
}

// ---------------------------------------------------------------- valores verdadeiros (nunca mostrados)

const RISKY = ['quarrelsome', 'big_ego', 'impulsive', 'controversial', 'opportunist', 'anxious', 'manipulative', 'resentful'];

export function trueSignal(s: GameState, act: Act, dim: Dim): number {
  const ms = act.members.map((id) => s.persons[id]).filter((p) => p?.alive);
  const avg = (f: (p: (typeof ms)[number]) => number) => (ms.length ? ms.reduce((t, p) => t + f(p), 0) / ms.length : 50);
  switch (dim) {
    case 'live': {
      const pres = actAttr(s, act.members, (p) => attrById(s, p, 'presence')) ?? avg((p) => p.skills.stage);
      const crowd = actAttr(s, act.members, (p) => attrById(s, p, 'crowd')) ?? pres;
      const cons = actAttr(s, act.members, (p) => attrById(s, p, 'consistency')) ?? 50;
      return clamp(pres * 0.4 + crowd * 0.3 + cons * 0.3, 0, 100);
    }
    case 'orig': {
      const cre = actAttr(s, act.members, (p) => attrById(s, p, 'creativity')) ?? 50;
      return clamp(cre * 0.5 + act.potential * 0.5, 0, 100);
    }
    case 'fans': {
      const tot = act.fans.casual + act.fans.active + act.fans.core;
      const size = clamp(Math.log10(1 + tot) * 16, 0, 100);
      const loyal = clamp(((act.fans.active + act.fans.core * 3) / (tot + 1)) * 400, 0, 100);
      return clamp(size * 0.55 + loyal * 0.45, 0, 100);
    }
    case 'scene': {
      const sc = s.scenes[`${act.city}:${act.genre}`] ?? 0;
      const home = cityById[act.city]?.market === cityById[s.config.homeCity]?.market;
      return clamp(20 + Math.min(40, sc * 1.5) + (home ? 15 : 0) + ((s.genrePop[act.genre] ?? 0.6) - 0.6) * 40, 0, 100);
    }
    case 'comm':
      return clamp(act.positioning * 0.35 + (s.genrePop[act.genre] ?? 0.6) * 45 + act.potential * 0.25, 0, 100);
    case 'risk': {
      const traits = ms.reduce((t, p) => t + p.traits.filter((x) => RISKY.includes(x)).length, 0) / Math.max(1, ms.length);
      const health = ms.some((p) => p.health === 'addiction' || p.health === 'burnout') ? 20 : 0;
      const end = act.careerEnd - s.year < 3 ? 20 : 0;
      return clamp(avg((p) => p.stress) * 0.4 + avg((p) => p.fatigue) * 0.2 + traits * 18 + health + end + (act.members.length >= 5 ? 8 : 0), 0, 100);
    }
    case 'rival': {
      const aggr = Math.max(0, ...Object.values(s.labels).filter((x) => x.active).map((x) => x.aggression));
      const auction = s.auctions.some((a) => a.actId === act.id && a.status === 'open') ? 20 : 0;
      return clamp(act.fame * 2.2 + act.momentum * 0.35 + (act.catalogNo ? 15 : 0) + aggr * 25 + auction - 12, 0, 100);
    }
  }
}

// ---------------------------------------------------------------- leituras

/** Viés próprio de cada fonte com cada ato (constante: repetir a fonte não o elimina). */
function quirk(actId: string, src: Src): number {
  return ((hashString(`${actId}:${src}`) % 1000) / 1000 - 0.5) * 8;
}

function record(s: GameState, actId: string, src: Src): void {
  const act = s.acts[actId];
  if (!act) return;
  const d = (dos(s).d[actId] ??= { reads: [], n: {}, spent: 0 });
  const n = (d.n[src] = (d.n[src] ?? 0) + 1);
  const r = rngOf(s);
  const si = SRC_IDS.indexOf(src);
  const skill = 1 - staffSkill(s, 'anr') / 300;
  const single = src === 'demo' || src === 'residency' ? 5 : 0; // uma amostra só
  for (const [dim, prof] of Object.entries(SOURCES8[src].prof) as [Dim, [number, number]][]) {
    const di = DIM_IDS.indexOf(dim);
    const sd = (prof[0] / Math.sqrt(n)) * skill;
    const mid = clamp(trueSignal(s, act, dim) + prof[1] + quirk(actId, src) + r.normal(0, sd + single), 0, 100);
    d.reads = d.reads.filter((x) => !(x[0] === si && x[1] === di));
    d.reads.push([si, di, Math.round(mid), Math.max(2, Math.round(sd * 1.6 + single)), s.week]);
  }
  const k = s.knowledge[actId];
  if (k) {
    k.degree = Math.max(k.degree, src === 'demo' || src === 'residency' ? 3 : 2);
    k.updatedWeek = s.week;
    if (k.stage === 'signal') k.stage = 'monitoring';
    if (k.degree >= 3 && k.stage === 'monitoring') k.stage = 'investigating';
  }
}

export function researchCost(s: GameState, src: Src): number {
  return money(s, SOURCES8[src].cost);
}

/** Pode pesquisar? (null = pode) */
export function researchBlock(s: GameState, actId: string, src: Src): L | null {
  const act = s.acts[actId];
  if (!act || act.owner === 'player') return l('Ato inválido.', 'Invalid act.');
  if (act.status === 'retired' || act.status === 'split') return l('Carreira encerrada.', 'Career over.');
  const def = SOURCES8[src];
  if (def.action && s.scoutActionsUsed >= scoutActionsPerMonth(s)) return l('Sem ações de scouting neste mês.', 'No scouting actions left this month.');
  if (def.weeks && act.owner) return l('Demo e residência só com quem ainda não tem contrato.', 'Demos and residencies only with unsigned acts.');
  if (dos(s).d[actId]?.pending?.some((p) => p.src === src)) return l('Já em andamento.', 'Already in progress.');
  if (s.player.cash < researchCost(s, src)) return l('Caixa insuficiente.', 'Not enough cash.');
  return null;
}

/** Paga uma fonte: consultores respondem na hora; demo e residência levam semanas. */
export function research(s: GameState, actId: string, src: Src): L | null {
  const err = researchBlock(s, actId, src);
  if (err) return err;
  const def = SOURCES8[src];
  const act = s.acts[actId];
  const cost = researchCost(s, src);
  post(s, `dossier:${actId}:${src}`, -cost, 'scouting', `${def.name.pt}: ${act.name}`);
  if (!s.knowledge[actId]) s.knowledge[actId] = { actId, degree: 1, stage: 'monitoring', bias: 0, updatedWeek: s.week, source: 'watch' };
  const d = (dos(s).d[actId] ??= { reads: [], n: {}, spent: 0 });
  d.spent += cost;
  if (def.action) s.scoutActionsUsed += 1;
  if (def.weeks) {
    (d.pending ??= []).push({ src, ready: s.week + def.weeks });
    if (src === 'demo') act.trust = clamp(act.trust + 5, 0, 100);
    return null;
  }
  record(s, actId, src);
  return null;
}

/** Síntese do jogador por sinal: média ponderada das leituras (com os vieses que vierem junto). */
export function synthesis(s: GameState, actId: string, dim: Dim): { mid: number; w: number; spread: number; n: number } | null {
  const d = dos(s).d[actId];
  const di = DIM_IDS.indexOf(dim);
  const rs = d?.reads.filter((x) => x[1] === di) ?? [];
  if (!rs.length) return null;
  let sw = 0;
  let sm = 0;
  for (const x of rs) {
    const wt = 1 / (x[3] * x[3]);
    sw += wt;
    sm += x[2] * wt;
  }
  const mid = sm / sw;
  const spread = rs.length > 1 ? Math.sqrt(rs.reduce((t, x) => t + (x[2] - mid) ** 2, 0) / rs.length) : 0;
  return { mid: Math.round(mid), w: Math.round(1 / Math.sqrt(sw) + spread), spread: Math.round(spread), n: rs.length };
}

export function readsFor(s: GameState, actId: string, dim: Dim): { src: Src; mid: number; w: number; week: number }[] {
  const di = DIM_IDS.indexOf(dim);
  return (dos(s).d[actId]?.reads ?? []).filter((x) => x[1] === di).map((x) => ({ src: SRC_IDS[x[0]], mid: x[2], w: x[3], week: x[4] }));
}

/** Convicção do jogador sobre o ato (0–100): o que ele acha, não o que é. */
export function playerRead(s: GameState, actId: string): { read: number; info: number } {
  const d = dos(s).d[actId];
  const parts = (['orig', 'comm', 'live', 'fans'] as Dim[]).map((x) => synthesis(s, actId, x)?.mid).filter((x): x is number => x !== undefined);
  const info = d ? Object.keys(d.n).length : 0;
  if (parts.length) return { read: Math.round(parts.reduce((a, b) => a + b, 0) / parts.length), info };
  const pot = estimate(s, actId, 'potential') ?? estimate(s, actId, 'talent');
  return { read: pot?.mid ?? 50, info };
}

/** Mercados mais receptivos ao gênero (informação pública) e o formato forte da era. */
export function commercialHints(s: GameState, act: Act): { markets: MarketId[]; format: L } {
  const fam = familyOf(act.genre);
  const markets = [...MARKETS].sort((a, b) => (MARKET_PREF[b.id][fam] ?? 0.6) * b.size(s.year) - (MARKET_PREF[a.id][fam] ?? 0.6) * a.size(s.year)).slice(0, 2).map((m) => m.id);
  const format = s.year < 1965 || s.year >= 2008 ? l('singles', 'singles') : l('álbuns', 'albums');
  return { markets, format };
}

// ---------------------------------------------------------------- decisões

/** Deixar o rival arriscar: registra a aposta e tira do radar. */
export function passOnAct(s: GameState, actId: string): void {
  const act = s.acts[actId];
  if (!act || act.owner === 'player') return;
  logCall(s, act, 'pass');
  delete s.knowledge[actId];
  delete dos(s).d[actId];
}

function logCall(s: GameState, act: Act, kind: AnrCall['kind']): void {
  const st = dos(s);
  const { read, info } = playerRead(s, act.id);
  st.calls.push({ actId: act.id, kind, week: s.week, fame0: Math.round(act.fame * 10) / 10, hits0: act.hits, read, info });
  if (st.calls.length > 60) st.calls.splice(0, st.calls.length - 60);
}

export const CALL_NAME: Record<NonNullable<AnrCall['judged']>, L> = {
  early: l('acertou antes do mercado', 'right before the market'),
  right: l('acerto', 'good call'),
  wrong: l('aposta ruim', 'bad bet'),
  missed: l('deixou passar', 'let it slip'),
  dodged: l('boa recusa', 'good pass'),
};

export function anrRecord(s: GameState): { calls: number; judged: number; right: number; early: number; wrong: number; missed: number; dodged: number; bold: number; overconf: number } {
  const cs = dos(s).calls;
  const j = cs.filter((c) => c.judged);
  const n = (k: AnrCall['judged']) => j.filter((c) => c.judged === k).length;
  const bold = j.filter((c) => c.kind === 'sign' && c.read >= 65);
  return { calls: cs.length, judged: j.length, right: n('right') + n('early'), early: n('early'), wrong: n('wrong'), missed: n('missed'), dodged: n('dodged'), bold: bold.length, overconf: bold.length ? bold.filter((c) => c.judged === 'wrong').length / bold.length : 0 };
}

// ---------------------------------------------------------------- tick

registerSimHook('week', 'dossier8', (s) => {
  const st = dos(s);
  for (const [actId, d] of Object.entries(st.d)) {
    if (!d.pending?.length) continue;
    const act = s.acts[actId];
    for (const p of d.pending.filter((x) => x.ready <= s.week)) {
      if (act && !act.owner) {
        record(s, actId, p.src);
        if (p.src === 'residency') {
          // a residência expõe o ato: cresce o público — e o interesse dos rivais
          act.fans.casual += 600 + Math.round(act.fame * 40);
          act.fans.active += 60;
          act.fame = clamp(act.fame + 1.5, 0, 100);
          act.momentum = clamp(act.momentum + 8, 0, 100);
          act.trust = clamp(act.trust + 8, 0, 100);
        }
        notify(s, fmtL(l('{src} de {a} concluída: o dossiê foi atualizado.', '{src} for {a} finished: the dossier was updated.'), { src: SOURCES8[p.src].name, a: act.name }), 'info');
      } else if (act) {
        notify(s, fmtL(l('{a} assinou com outro selo antes de concluir a {src}.', '{a} signed elsewhere before the {src} finished.'), { a: act.name, src: SOURCES8[p.src].name }), 'bad');
      }
    }
    d.pending = d.pending.filter((x) => x.ready > s.week);
    if (!d.pending.length) delete d.pending;
  }
});

registerSimHook('month', 'dossier8', (s) => {
  if (s.config.role === 'artist') return;
  const st = dos(s);
  // assinaturas novas viram apostas registradas
  for (const c of Object.values(s.contracts)) {
    if (c.party !== 'player' || c.startWeek < s.week - 5) continue;
    const act = s.acts[c.actId];
    if (!act || act.playerBand || st.calls.some((x) => x.actId === act.id && x.kind === 'sign' && x.week >= c.startWeek - 5)) continue;
    logCall(s, act, 'sign');
    const call = st.calls[st.calls.length - 1];
    call.fame0 = c.fameAtSign ?? call.fame0;
  }
  // dois anos depois, o mercado dá o veredito
  for (const call of st.calls) {
    if (call.judged || s.week - call.week < 104) continue;
    const act = s.acts[call.actId];
    const gone = !act || ((act.status === 'retired' || act.status === 'split') && s.week - call.week < 156);
    const made = !!act && !gone && (act.fame >= call.fame0 + 12 || act.hits > call.hits0);
    if (call.kind === 'sign') {
      call.judged = made ? (call.fame0 < 12 ? 'early' : 'right') : 'wrong';
      if (call.judged === 'early' && act) {
        s.player.reputation.artists = clamp(s.player.reputation.artists + 2, 0, 100);
        notify(s, fmtL(l('Faro de A&R: você apostou em {a} antes do mercado — e acertou.', 'A&R instinct: you bet on {a} before the market did — and were right.'), { a: act.name }), 'good');
        remember(s, 'anr_early', fmtL(l('{c} acreditou em {a} quando ninguém acreditava.', '{c} believed in {a} when nobody else did.'), { c: s.config.companyName, a: act.name }), { actId: act.id, important: true });
      } else if (call.judged === 'wrong' && act && call.read >= 65) {
        notify(s, fmtL(l('Excesso de confiança: você estava convicto sobre {a}, mas a aposta não pagou.', 'Overconfidence: you were sure about {a}, but the bet did not pay off.'), { a: act.name }), 'bad');
      }
    } else {
      call.judged = made ? 'missed' : 'dodged';
      if (made && act) notify(s, fmtL(l('{a}, que você deixou passar, estourou{o}.', '{a}, whom you passed on, broke through{o}.'), { a: act.name, o: act.owner && s.labels[act.owner] ? fmtL(l(' com {b}', ' with {b}'), { b: s.labels[act.owner].name }) : '' }), 'event');
    }
  }
  // limpeza: dossiês de quem saiu do radar há tempo
  for (const id of Object.keys(st.d)) {
    const a = s.acts[id];
    if (!a || a.status === 'retired' || a.status === 'split' || (!s.knowledge[id] && !st.d[id].pending?.length)) delete st.d[id];
  }
});
