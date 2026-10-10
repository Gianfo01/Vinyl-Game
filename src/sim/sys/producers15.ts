// Rodada 15 — produtores musicais reais. Entram no catálogo de produtores já usado no projeto/estúdio (PRODUCERS),
// com som próprio (efeito em produção/performance/originalidade), cachê por faixa que sobe com a demanda dos selos
// rivais e cai com a boa relação, e agenda: um grande projeto por vez (produtorBusy). Cada um é uma pessoa completa na
// ficha unificada (chave 'pd:<id>'). Com nomes reais desligados entra o mesmo arquétipo com nome gerado e sem obras
// citadas. Selos rivais também os contratam (demanda NPC), o que os deixa ocupados e mais caros. Gerador próprio.

import { Rng } from '../../core/rng';
import { FEE_TIER, REAL_PRODS, prodById, type RealProd } from '../../data/producers15';
import { familyOf, l, type L } from '../../data/world';
import { langForCity, personName } from '../people';
import { PRODUCERS, prodHooks, type ProducerDef } from '../studio';
import type { GameState } from '../types';
import { fmtL, money, notify, post, remember } from '../util';
import { registerExt4, registerSimHook } from '../ext4';
import { opine, opinionOf, registerPer13 } from './persona13';
import { ownerOf } from './people/owner';
import { gone16 } from './gone16';

export interface C15 { y: number; m: number; who: string; title: string; q?: number; you?: 1 }
export interface P15 {
  done: Record<string, 1>;
  credits: Record<string, C15[]>;
  /** produtor → [selo, semana em que fica livre] */
  book: Record<string, [string, number]>;
  cd: Record<string, number>;
}
declare module '../ext4' { interface Ext4 { producers15: P15 } }
const fresh = (): P15 => ({ done: {}, credits: {}, book: {}, cd: {} });
registerExt4('producers15', fresh);
export function p15(s: GameState): P15 {
  const x = s.x4 as unknown as { producers15?: P15 };
  const st = (x.producers15 ??= fresh());
  st.done ??= {}; st.credits ??= {}; st.book ??= {}; st.cd ??= {};
  return st;
}

// ---------------------------------------------------------------- catálogo

export const prodDefId = (id: string): string => `rp_${id}`;
export const prodKey = (id: string): string => `pd:${id}`;
const last = (p: RealProd): number => Math.min(p.to, p.died ?? 9999);
export const prodActive = (s: GameState, p: RealProd): boolean => s.year >= p.from && s.year <= last(p) && !gone16(s, `pd:${p.id}`);
/** Já existiu (nunca mostra quem ainda não começou). */
export const prodKnown = (s: GameState, p: RealProd): boolean => s.year >= p.from;
export const realProdOf = (defId: string): RealProd | undefined => (defId.startsWith('rp_') ? prodById[defId.slice(3)] : undefined);

const defOf = (p: RealProd): ProducerDef => ({
  id: prodDefId(p.id), name: p.name, signature: p.sig, from: p.from, to: last(p), families: p.fam, skill: p.skill, fee: FEE_TIER[p.tier], ego: p.ego, real: p.id,
  sound: { name: p.snd, prod: p.fx[0], perf: p.fx[1], orig: p.fx[2] },
});
for (const p of REAL_PRODS) if (!PRODUCERS.some((x) => x.id === prodDefId(p.id))) PRODUCERS.push(defOf(p));

const NAMES = new Map<string, string>();
/** Nome real (modo nomes reais) ou um equivalente gerado, estável pela semente. */
export function prodName(s: GameState, p: RealProd): string {
  if (s.config.realNames || p.id.startsWith('x18') || p.id.startsWith('g18')) return p.name; // r18: ex-artistas e gerados já têm nome do mundo
  const k = `${s.config.seed}|${p.id}`;
  let n = NAMES.get(k);
  if (!n) { const r = Rng.fromSeed(`${s.config.seed}|p15name|${p.id}`); n = personName(r, langForCity(p.city, r)); NAMES.set(k, n); }
  return n;
}
/** Obras citadas só com nomes reais e só até o ano atual. */
export const worksOf = (s: GameState, p: RealProd): [string, string, number][] => (s.config.realNames ? p.w.filter((x) => x[2] <= s.year) : []);
export const activeProds = (s: GameState): RealProd[] => REAL_PRODS.filter((p) => prodActive(s, p));

registerPer13('pd', (s, id) => {
  const p = prodById[id];
  if (!p) return null;
  const [ear, neg, cha, mgmt, img] = p.a;
  return {
    kind: 'npc', name: prodName(s, p), born: p.born, city: p.city, job: 'producer',
    attrs: { ear, neg, cha, mgmt, img }, facets: { teimosia: p.ego, ambicao: 40 + p.ego / 2 }, native: [p.snd],
    prof: { producer: p.skill, engineer: p.skill * 0.8, anr: ear * 0.8, arranger: p.skill * 0.7 },
  };
});

// ---------------------------------------------------------------- relação, cachê e agenda

export const opOf = (s: GameState, p: RealProd): number => opinionOf(s, prodKey(p.id));
/** Quantos projetos de selos rivais ele fez no último ano (demanda). */
export function demand(s: GameState, p: RealProd): number {
  return (p15(s).credits[p.id] ?? []).filter((c) => !c.you && s.year * 12 + s.month - (c.y * 12 + c.m) <= 12).length;
}
export function feeMult(s: GameState, p: RealProd): { v: number; why: L[] } {
  const why: L[] = [];
  let v = 1;
  const d = demand(s, p);
  if (d >= 2) { v *= 1 + Math.min(0.25, d * 0.05); why.push(l('agenda disputada por selos rivais', 'schedule fought over by rival labels')); }
  const o = opOf(s, p);
  if (o >= 40) { v *= 0.85; why.push(l('desconto de quem confia em você', 'a discount from someone who trusts you')); } else if (o >= 20) { v *= 0.93; why.push(l('desconto de amigo', 'friend discount')); } else if (o <= -15) { v *= 1.15; why.push(l('cobra mais de quem não gosta de você', 'charges more to someone who dislikes you')); }
  return { v, why };
}
export const feeOf = (s: GameState, p: RealProd): number => Math.round(FEE_TIER[p.tier] * feeMult(s, p).v);
export const refuses = (s: GameState, p: RealProd): boolean => opOf(s, p) <= -35;
export const bookedBy = (s: GameState, p: RealProd): [string, number] | null => { const b = p15(s).book[p.id]; return b && b[1] > s.week && s.labels[b[0]] ? b : null; };

prodHooks.name = (s, d) => { const p = d.real ? prodById[d.real] : undefined; return p ? prodName(s, p) : d.name; };
prodHooks.fee = (s, d) => { const p = d.real ? prodById[d.real] : undefined; return p ? feeOf(s, p) : d.fee; };
prodHooks.ok = (s, d) => { const p = d.real ? prodById[d.real] : undefined; return !p || !refuses(s, p); };
prodHooks.started = (s, d, sess) => {
  const p = d.real ? prodById[d.real] : undefined;
  if (!p || p.tier < 4) return;
  s.producerBusy[d.id] = (s.producerBusy[d.id] ?? 0) + 3;
  notify(s, fmtL(l('{p} só trabalha em um grande projeto por vez: agenda fechada por mais 3 semanas depois da sessão.', '{p} takes one big project at a time: the diary is shut for 3 more weeks after the session.'), { p: prodName(s, p) }), 'info');
  void sess;
};

export interface Res15 { ok: boolean; text: L }
export const DINNER_COST = 900;
export function dinnerBlock(s: GameState, id: string): L | null {
  if (!prodActive(s, prodById[id])) return l('Fora de atividade.', 'Not active.');
  if (s.week < (p15(s).cd[`dinner|${id}`] ?? 0)) return l('Já jantaram há pouco (a cada 6 meses).', 'You dined recently (every 6 months).');
  if (s.player.cash < money(s, DINNER_COST)) return l('Caixa insuficiente.', 'Not enough cash.');
  return null;
}
/** Jantar no estúdio dele: aproxima conforme o seu ouvido e o carisma. */
export function dinner(s: GameState, id: string): Res15 {
  const e = dinnerBlock(s, id);
  const p = prodById[id];
  if (e) return { ok: false, text: e };
  post(s, `p15dinner:${id}`, -money(s, DINNER_COST), 'marketing', `Jantar com ${prodName(s, p)}`);
  p15(s).cd[`dinner|${id}`] = s.week + 26;
  const o = ownerOf(s).attrs;
  const v = opine(s, prodKey(id), 4 + (o.charisma - 50) / 12 + (o.ear - 50) / 15, l('jantamos e falamos de som.', 'we had dinner and talked about sound.'));
  return { ok: true, text: fmtL(l('Jantar com {n}: opinião {v}.', 'Dinner with {n}: opinion {v}.'), { n: prodName(s, p), v: `${v >= 0 ? '+' : ''}${v}` }) };
}

// ---------------------------------------------------------------- mensal

function credit(s: GameState, id: string, c: Omit<C15, 'y' | 'm'>): void {
  const st = p15(s);
  const a = (st.credits[id] ??= []);
  a.push({ y: s.year, m: s.month, ...c });
  if (a.length > 40) a.shift();
}

export function producersMonth(s: GameState, r: Rng): void {
  const st = p15(s);
  // 1) o que saiu das suas sessões: qualidade vira crédito e opinião
  for (const song of Object.values(s.songs)) {
    const p = song.producerId ? realProdOf(song.producerId) : undefined;
    if (!p || !song.recorded || st.done[song.id]) continue;
    const act = s.acts[song.actId];
    if (!act || (act.owner !== 'player' && !act.playerBand)) continue;
    st.done[song.id] = 1;
    credit(s, p.id, { who: act.name, title: song.title, q: Math.round(song.q), you: 1 });
    const q = song.q;
    const d = q >= 75 ? 4 : q >= 58 ? 1.5 : q < 45 ? -5 : -1;
    opine(s, prodKey(p.id), d, d > 0 ? l(`"${song.title}" saiu do jeito que ele sonhava.`, `"${song.title}" came out the way they dreamed.`) : l(`"${song.title}" ficou abaixo do nome dele nos créditos.`, `"${song.title}" fell short of their name in the credits.`));
    if (q >= 75 && r.chance(0.35)) remember(s, 'session', fmtL(l('{p} diz que {a} é "a melhor sessão do ano".', '{p} calls {a} "the best session of the year".'), { p: prodName(s, p), a: act.name }), { actId: act.id });
  }
  // 2) selos rivais contratam os grandes nomes (demanda NPC)
  const booked = Object.entries(st.book).filter(([, b]) => b[1] > s.week).length;
  if (booked < 4) {
    const labels = Object.values(s.labels).filter((x) => x.active && x.cash > money(s, 40000));
    for (const lb of labels) {
      if (!r.chance(0.012 + lb.reputation / 6000)) continue;
      const free = activeProds(s).filter((p) => (s.producerBusy[prodDefId(p.id)] ?? 0) <= s.week && lb.cash > money(s, FEE_TIER[p.tier] * 16));
      if (!free.length) continue;
      const w = free.map((p) => 1 + p.fam.filter((f) => lb.focus.some((g) => familyOf(g) === f)).length * 2 + p.tier * 0.2);
      let x = r.next() * w.reduce((a, b) => a + b, 0), i = 0;
      while (i < free.length - 1 && (x -= w[i]) > 0) i++;
      const p = free[i];
      const weeks = r.int(6, 12);
      s.producerBusy[prodDefId(p.id)] = s.week + weeks;
      lb.cash -= money(s, FEE_TIER[p.tier] * 12);
      st.book[p.id] = [lb.id, s.week + weeks];
      const a = lb.roster.map((id) => s.acts[id]).filter(Boolean).sort((u, v) => v.fame - u.fame)[0];
      credit(s, p.id, { who: a?.name ?? lb.name, title: lb.name });
      if ((st.credits[p.id] ?? []).some((c) => c.you) || p.tier >= 5) notify(s, fmtL(l('{l} fechou {p} por {w} semanas: a agenda dele está tomada.', '{l} booked {p} for {w} weeks: their diary is taken.'), { l: lb.name, p: prodName(s, p), w: weeks }), 'info');
      break;
    }
  }
  // 3) quem morreu ou saiu de cena some da agenda
  for (const [id, b] of Object.entries(st.book)) if (b[1] <= s.week) delete st.book[id];
}
registerSimHook('month', 'producers15', (s) => producersMonth(s, Rng.fromSeed(`${s.config.seed}:producers15:${s.year}:${s.month}`)));
