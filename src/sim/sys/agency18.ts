// Rodada 18 (item 2) — QUALQUER UM CONTRA QUALQUER UM. O menu de ações (personact18) é do jogador; aqui os NPCs
// também agem: artistas, integrantes, chefes de selo, empresários, produtores — inclusive SEUS artistas (contra você
// ou contra outro chefe). Todo mês alguns personagens tomam a iniciativa pelos TRAÇOS (persona13), MÁGOAS e
// TRUNFOS (holds17), RELAÇÕES (rel/opinião) e RIVALIDADES (rixas feud18, s.rivalries): elogiam, provocam com diss,
// espalham boato, aliciam, processam, chantageiam, expõem segredos, intimidam (crime17), sabotam, fazem as pazes,
// fazem favores, têm casos. Contra você vira mensagem da Caixa 2.0 com respostas; entre NPCs vira Fato (boato/
// notícia) que o Mestre (dm18) usa como gancho. Modo "Vida real exata": ninguém real age nem sofre (shield18).
// Do lado do jogador: três ações novas no menu de pessoa — encomendar uma diss (rixa), mediar a rixa de alguém,
// instigar alguém contra um rival.

import { clamp, Rng } from '../../core/rng';
import { l, type L } from '../../data/world';
import { dir17 } from '../director17';
import { registerExt4, registerSimHook } from '../ext4';
import { emitFact, onFact, recentFacts, raiseVisibility, type Fact } from '../facts17';
import { allHolds, grantHold, holds17, useHold, voidHolds, type Hold } from '../holds17';
import { actsOfPerson17 } from '../actidx17';
import { pushInbox18, registerInboxKind } from '../inbox18';
import { registerPersonAction } from '../personact18';
import { scandal } from '../scandal17';
import { addStress } from '../stress17';
import type { Act, GameState } from '../types';
import { fmtL, money, notify, playerActs, post } from '../util';
import { commitCrime, crimeOdds } from './crime17';
import { activeFeuds18, feudOf18, feudsOf18, heatFeud18, leadOf18, setFeudMine18, shield18, startFeud18, STAGE18, temper18, tryCool18, cool18, type Feud18 } from './feud18';
import { addHype } from './hype12';
import { leaders } from './leaders10';
import { opine, opinionOf, per13 } from './persona13';

// ---------------------------------------------------------------- chaves

const live = (a?: Act): a is Act => !!a && a.status !== 'retired' && a.status !== 'split';
const isMineAct = (s: GameState, a?: Act): boolean => !!a && (a.owner === 'player' || !!a.playerBand || playerActs(s).includes(a.id));
export const isPlayerKey = (s: GameState, k: string): boolean => k === 'player' || (k.startsWith('p:') && !!s.persons[k.slice(2)]?.isPlayer);
/** id usado em fatos/holds (pessoa: id puro). */
export const hid18 = (k: string): string => (k.startsWith('p:') ? k.slice(2) : k);
/** id de executor para crime17 (pessoa: id; chefe de selo: o selo). */
const crimeId = (s: GameState, k: string): string => (isPlayerKey(s, k) ? 'player' : k.startsWith('l:') ? leaders(s).L[k.slice(2)]?.label ?? k : hid18(k));
export function nameOfKey18(s: GameState, k: string): string {
  if (isPlayerKey(s, k)) return s.config.companyName;
  if (s.acts[k]) return s.acts[k].name;
  return per13(s, k)?.name ?? s.persons[hid18(k)]?.name ?? k;
}
const fac = (s: GameState, k: string, f: string): number => ((per13(s, k)?.facets as Record<string, number> | undefined)?.[f] ?? 50);
/** Ato principal de uma chave (pessoa → banda dela; chefe → maior ato do selo; você → seu maior ato). */
export function actOfKey18(s: GameState, k: string): Act | undefined {
  if (isPlayerKey(s, k)) return playerActs(s).map((id) => s.acts[id]).filter(live).sort((a, b) => b.fame - a.fame)[0];
  if (k.startsWith('p:')) return actsOfPerson17(s, k.slice(2)).find(live);
  // chefe de selo: o maior ato do selo que não seja protegido (modo exato: atos reais ficam de fora)
  if (k.startsWith('l:')) { const lb = leaders(s).L[k.slice(2)]?.label; return lb ? (s.labels[lb]?.roster ?? []).map((id) => s.acts[id]).filter((a): a is Act => live(a) && !shield18(s, a.id)).sort((a, b) => b.fame - a.fame)[0] : undefined; }
  return undefined;
}
const shielded = (s: GameState, k: string): boolean => !isPlayerKey(s, k) && (shield18(s, k) || shield18(s, hid18(k)) || (k.startsWith('p:') && !!actOfKey18(s, k) && shield18(s, actOfKey18(s, k)!.id)));
const alive = (s: GameState, k: string): boolean => (k.startsWith('p:') ? !!s.persons[k.slice(2)]?.alive : k.startsWith('l:') ? leaders(s).L[k.slice(2)]?.st === 'active' : true);
/** Alguém do lado do jogador (você, seus artistas e integrantes). */
export function playerSide18(s: GameState, k: string): boolean {
  if (isPlayerKey(s, k)) return true;
  return k.startsWith('p:') && isMineAct(s, actOfKey18(s, k));
}

/** Trunfos/mágoas que alguém tem (cache por partida e semana; o livro muda pouco dentro do mês). */
const HC = new WeakMap<GameState, { w: number; n: number; by: Map<string, Hold[]> }>();
export function hasOf(s: GameState, id: string): Hold[] {
  const n = holds17(s).h.length;
  let c = HC.get(s);
  if (!c || c.w !== s.week || c.n !== n) {
    const by = new Map<string, Hold[]>();
    for (const h of allHolds(s)) { const xs = by.get(h.holder); if (xs) xs.push(h); else by.set(h.holder, [h]); }
    c = { w: s.week, n, by };
    HC.set(s, c);
  }
  return (c.by.get(id.startsWith('p:') ? id.slice(2) : id) ?? []).filter((h) => h.status === 'open');
}

// ---------------------------------------------------------------- relações genéricas

export interface Ag18State { rel: Record<string, number>; log: Ag18Log[]; cd: Record<string, number>; inc: Record<string, { t: string; until: number }>; n: number;
  /** pressão A>T: [mágoa, gratidão, ambição, inveja, afeto] 0..100 + porquê */
  mot: Record<string, Mot18>;
  /** cooldown por ator (semana) */
  ca: Record<string, number>;
  /** cartas para você neste mês */
  pc: { m: number; n: number };
  /** contagem por tom */
  nt: Partial<Record<Tone18, number>> }
export interface Ag18Log { w: number; y: number; m: number; a: string; t: string; v: string; ok: boolean; txt: L; mine?: 1; tone?: Tone18; why?: L; pend?: 1 }
declare module '../ext4' { interface Ext4 { ag18: Ag18State } }
const fresh = (): Ag18State => ({ rel: {}, log: [], cd: {}, inc: {}, n: 0, mot: {}, ca: {}, pc: { m: 0, n: 0 }, nt: {} });
registerExt4('ag18', fresh);
export function ag18(s: GameState): Ag18State {
  const x = s.x4 as unknown as { ag18?: Ag18State };
  const st = (x.ag18 ??= fresh());
  st.rel ??= {}; st.log ??= []; st.cd ??= {}; st.inc ??= {}; st.mot ??= {}; st.ca ??= {}; st.pc ??= { m: 0, n: 0 }; st.nt ??= {};
  return st;
}
/** Relação A→T (−100..100) lida da melhor fonte disponível. */
export function relOf18(s: GameState, A: string, T: string): number {
  if (isPlayerKey(s, T) && !isPlayerKey(s, A)) return opinionOf(s, A);
  if (A.startsWith('p:') && T.startsWith('p:')) return s.persons[A.slice(2)]?.rel[T.slice(2)] ?? 0;
  if (A.startsWith('l:') && T.startsWith('l:')) return leaders(s).L[A.slice(2)]?.rel[T.slice(2)] ?? 0;
  return ag18(s).rel[`${A}>${T}`] ?? 0;
}
export function adjRel18(s: GameState, A: string, T: string, d: number, why: L): void {
  if (isPlayerKey(s, A)) return;
  if (isPlayerKey(s, T)) { opine(s, A, d, why); return; }
  if (A.startsWith('p:') && T.startsWith('p:') && s.persons[A.slice(2)]) { const p = s.persons[A.slice(2)]; p.rel[T.slice(2)] = clamp((p.rel[T.slice(2)] ?? 0) + d, -100, 100); return; }
  if (A.startsWith('l:') && T.startsWith('l:') && leaders(s).L[A.slice(2)]) { const L0 = leaders(s).L[A.slice(2)]; L0.rel[T.slice(2)] = clamp((L0.rel[T.slice(2)] ?? 0) + d, -100, 100); return; }
  const st = ag18(s);
  const k = `${A}>${T}`;
  st.rel[k] = clamp((st.rel[k] ?? 0) + d, -100, 100);
  if (Object.keys(st.rel).length > 1500) for (const x of Object.keys(st.rel)) if (Math.abs(st.rel[x]) < 10) delete st.rel[x];
}
/** Rancor de A por T, 0..1+ (relação ruim, mágoas guardadas, rixa, rivalidade de selo, instigação). */
export function grudge18(s: GameState, A: string, T: string): number {
  let g = Math.max(0, -relOf18(s, A, T)) / 100;
  const tid = isPlayerKey(s, T) ? 'player' : hid18(T);
  g += hasOf(s, hid18(A)).filter((h) => h.kind === 'grievance' && h.status === 'open' && h.target === tid).length * 0.25;
  const a = actOfKey18(s, A), b = actOfKey18(s, T);
  if (a && b) { const f = feudOf18(s, a.id, b.id); if (f) g += f.h / 100; }
  if (isPlayerKey(s, T) && A.startsWith('l:')) { const lb = leaders(s).L[A.slice(2)]?.label; if (lb) g += (s.rivalries[lb] ?? 0) / 150; }
  const inc = ag18(s).inc[A];
  if (inc && inc.t === T && inc.until > s.week) g += 0.5;
  return g;
}

// ---------------------------------------------------------------- verbos

export type Tone18 = 'good' | 'neutral' | 'bad';
/** Motivos (pressão acumulada de A por T): mágoa, gratidão, ambição, inveja, afeto/preocupação. */
export type Motive18 = 'g' | 'gr' | 'am' | 'en' | 'care';
export type MV18 = Record<Motive18, number>;
export type Resp18 = 'accept' | 'decline' | 'negotiate' | 'retaliate' | 'ignore';
export interface Verb18 {
  id: string;
  name: L;
  /** prejudica o alvo (vira "ataque" na Caixa) */
  harm: boolean;
  tone?: Tone18;
  /** afinidade com cada motivo (0..1+) */
  m?: Partial<MV18>;
  /** fator de personalidade do ator (0..2); recebe os motivos 0..1 */
  pf?: (s: GameState, A: string, T: string, mv: MV18) => number;
  /** legado: peso pela personalidade e pelo rancor/afeto */
  w?: (s: GameState, A: string, T: string, g: number, aff: number) => number;
  ok?: (s: GameState, A: string, T: string) => boolean;
  run: (s: GameState, A: string, T: string, r: Rng) => { ok: boolean; t: L };
  /** proposta: contra você vira pedido (o efeito só acontece se aceitar); entre NPCs o alvo decide */
  ask?: boolean;
  /** texto da proposta ({a} → {t}) */
  pitch?: L;
  /** chance de um NPC aceitar a proposta (além da relação) */
  accP?: (s: GameState, A: string, T: string) => number;
  /** respostas específicas quando o alvo é você */
  resp?: Partial<Record<Resp18, (s: GameState, A: string, T: string, r: Rng) => L>>;
  /** secreto: só aparece no diário se envolver você */
  hidden?: boolean;
}
export const toneOf18 = (v?: Verb18): Tone18 => v?.tone ?? (v?.harm ? 'bad' : 'good');
export const VERBS18: Verb18[] = [];
export const registerVerb18 = (v: Verb18): void => { const i = VERBS18.findIndex((x) => x.id === v.id); if (i >= 0) VERBS18[i] = v; else VERBS18.push(v); };

const F = fac;
const fact = (s: GameState, kind: string, A: string, T: string, sev: number, vis: 'secret' | 'rumor' | 'public', tags: string[], text: L) => {
  const a = actOfKey18(s, T);
  return emitFact(s, { kind, actors: [hid18(A), hid18(T), ...(a ? [a.id] : [])], place: a?.city ?? per13(s, T)?.city ?? s.config.homeCity, severity: sev, visibility: vis, tags: [...tags, 'ag18'], text, src: 'agency18' });
};
const N = nameOfKey18;

registerVerb18({
  id: 'praise', name: l('Elogia / dá um alô', 'Praises / shout-out'), harm: false,
  tone: 'good', m: { care: 1, gr: 0.8 }, pf: (s, A, _T, mv) => (F(s, A, 'empatia') + F(s, A, 'sociabilidade')) / 100 * (mv.g > 0.3 ? 0.1 : 1),
  run: (s, A, T) => {
    const a = actOfKey18(s, T);
    if (a) a.momentum = clamp(a.momentum + 3, 0, 100);
    adjRel18(s, T, A, 8, l('Elogio público', 'Public praise'));
    const t = fmtL(l('{a} elogia {t} numa entrevista.', '{a} praises {t} in an interview.'), { a: N(s, A), t: N(s, T) });
    fact(s, 'statement', A, T, 20, 'public', ['good', 'praise'], t);
    return { ok: true, t };
  },
});
registerVerb18({
  id: 'diss', name: l('Provoca (diss)', 'Disses'), harm: true,
  tone: 'bad', m: { g: 1, en: 0.8 }, pf: (s, A) => (F(s, A, 'ego') + F(s, A, 'impulsividade') + F(s, A, 'vaidade')) / 120,
  run: (s, A, T) => {
    adjRel18(s, T, A, -15, l('Provocação pública', 'Public jab'));
    if (T.startsWith('p:') && !isPlayerKey(s, T)) addStress(s, T.slice(2), 6, fmtL(l('Provocado(a) por {a}', 'Called out by {a}'), { a: N(s, A) }));
    const a = actOfKey18(s, A), b = actOfKey18(s, T);
    let extra: L | string = '';
    // rixa entre atos só quando os dois lados são artistas (chefe de selo não arrasta os atos para a briga)
    if (a && b && a.id !== b.id && (A.startsWith('p:') || isPlayerKey(s, A)) && (T.startsWith('p:') || isPlayerKey(s, T))) {
      const f = startFeud18(s, a.id, b.id, fmtL(l('{a} provocou {t}', '{a} called out {t}'), { a: N(s, A), t: N(s, T) }), 12);
      if (f) { heatFeud18(s, f, 4); extra = fmtL(l(' Rixa {x}: {st}.', ' Feud {x}: {st}.'), { x: `${a.name} × ${b.name}`, st: STAGE18[f.st].name }); }
      addHype(s, `a:${a.id}`, 'ag18diss', l('Provocação', 'Provocation'), 4);
    }
    const t = fmtL(l('{a} provoca {t} em público.{x}', '{a} calls out {t} in public.{x}'), { a: N(s, A), t: N(s, T), x: extra });
    fact(s, 'statement', A, T, 35, 'public', ['beef', 'bad'], t);
    return { ok: true, t };
  },
});
registerVerb18({
  id: 'rumor', name: l('Espalha boato', 'Spreads a rumor'), harm: true,
  tone: 'bad', hidden: true, m: { g: 0.7, en: 1 }, pf: (s, A) => ((100 - F(s, A, 'empatia')) + F(s, A, 'ambicao')) / 140,
  ok: (s, _A, T) => !!actOfKey18(s, T),
  run: (s, A, T, r) => {
    const a = actOfKey18(s, T)!;
    const traced = r.chance(0.3 + (100 - F(s, A, 'disciplina')) / 400);
    const t = fmtL(l('Boato sobre {t} corre nos bastidores{x}.', 'A rumor about {t} runs backstage{x}.'), { t: N(s, T), x: traced ? fmtL(l(' — e todo mundo sabe que veio de {a}', ' — and everyone knows it came from {a}'), { a: N(s, A) }) : '' });
    scandal(s, a.id, 'conduct', 22, t, { person: T.startsWith('p:') ? T.slice(2) : undefined, tags: ['ag18', 'rumor'], quiet: !playerSide18(s, T) });
    if (traced) { grantHold(s, { holder: isPlayerKey(s, T) ? 'player' : hid18(T), target: hid18(A), kind: 'grievance', strength: 45, months: 60, src: 'agency18', text: l('Espalhou boato sobre mim', 'Spread a rumor about me'), quiet: true }); adjRel18(s, T, A, -20, l('Boato', 'Rumor')); }
    return { ok: true, t };
  },
});
registerVerb18({
  id: 'poach', name: l('Tenta aliciar', 'Tries to poach'), harm: true,
  tone: 'bad', m: { am: 1, en: 0.4, g: 0.3 }, pf: (s, A) => (A.startsWith('l:') || A.startsWith('e:') ? F(s, A, 'ambicao') / 60 : 0),
  ok: (s, A, T) => { const a = actOfKey18(s, T); return !!a && a.fame >= 20 && (A.startsWith('l:') || A.startsWith('e:')); },
  run: (s, A, T, r) => {
    const a = actOfKey18(s, T)!;
    const lead = leadOf18(s, a);
    const t = fmtL(l('{a} tenta tirar {x} de {t}: jantares, promessas, um adiantamento maior.', '{a} tries to lure {x} away from {t}: dinners, promises, a bigger advance.'), { a: N(s, A), x: a.name, t: N(s, T) });
    if (lead && !isPlayerKey(s, T)) { lead.rel[hid18(A)] = clamp((lead.rel[hid18(A)] ?? 0) + 10, -100, 100); }
    const ok = r.chance(0.25 + (per13(s, A)?.attrs.cha ?? 50) / 400);
    if (ok && isMineAct(s, a) && lead) opine(s, `p:${lead.id}`, -6, fmtL(l('Seduzido(a) por {a}', 'Courted by {a}'), { a: N(s, A) }));
    adjRel18(s, T, A, -18, l('Aliciamento', 'Poaching'));
    fact(s, 'poach', A, T, 30 + a.fame / 5, 'rumor', ['bad'], t);
    return { ok, t };
  },
});
registerVerb18({
  id: 'sue', name: l('Processa', 'Sues'), harm: true,
  tone: 'bad', m: { g: 0.8, am: 0.3 }, pf: (s, A) => (F(s, A, 'teimosia') + F(s, A, 'ambicao')) / 200 * (A.startsWith('l:') || A.startsWith('e:') ? 1.2 : 0.5),
  run: (s, A, T, r) => {
    const amt = money(s, 8000 + r.int(0, 20) * 1000);
    const t = fmtL(l('{a} processa {t} (plágio, royalties ou contrato) pedindo {v}.', '{a} sues {t} (plagiarism, royalties or contract) asking for {v}.'), { a: N(s, A), t: N(s, T), v: `$${Math.round(amt / 100).toLocaleString()}` });
    if (!isPlayerKey(s, T)) {
      const lbT = T.startsWith('l:') ? leaders(s).L[T.slice(2)]?.label : actOfKey18(s, T)?.owner;
      const lbA = A.startsWith('l:') ? leaders(s).L[A.slice(2)]?.label : actOfKey18(s, A)?.owner;
      const win = r.chance(0.45);
      if (win && lbT && s.labels[lbT]) { s.labels[lbT].cash -= amt; if (lbA && s.labels[lbA]) s.labels[lbA].cash += amt; }
      adjRel18(s, T, A, -25, l('Processo', 'Lawsuit'));
      fact(s, 'law', A, T, 35, 'public', ['law', win ? 'ok' : 'fail'], t);
      return { ok: win, t };
    }
    fact(s, 'law', A, T, 35, 'public', ['law'], t);
    return { ok: true, t };
  },
});
registerVerb18({
  id: 'blackmail', name: l('Chantageia', 'Blackmails'), harm: true,
  tone: 'bad', hidden: true, m: { g: 0.6, am: 0.6, en: 0.3 }, pf: (s, A) => ((100 - F(s, A, 'empatia')) + F(s, A, 'ambicao')) / 120,
  ok: (s, A, T) => hasOf(s, hid18(A)).some((h) => h.kind === 'secret' && h.status === 'open' && h.target === (isPlayerKey(s, T) ? 'player' : hid18(T))),
  run: (s, A, T) => {
    const h = hasOf(s, hid18(A)).find((x) => x.kind === 'secret' && x.status === 'open' && x.target === (isPlayerKey(s, T) ? 'player' : hid18(T)))!;
    if (isPlayerKey(s, T)) return { ok: true, t: fmtL(l('{a} sabe de algo ("{h}") e quer conversar.', '{a} knows something ("{h}") and wants to talk.'), { a: N(s, A), h: h.text }) };
    const u = useHold(s, h.id, 'blackmail');
    adjRel18(s, T, A, -30, l('Chantagem', 'Blackmail'));
    return { ok: u.ok, t: fmtL(l('{a} chantageia {t}: {x}', '{a} blackmails {t}: {x}'), { a: N(s, A), t: N(s, T), x: u.text }) };
  },
});
registerVerb18({
  id: 'expose', name: l('Expõe um segredo', 'Exposes a secret'), harm: true,
  tone: 'bad', m: { g: 0.9, en: 0.5 }, pf: (s, A) => (F(s, A, 'impulsividade') + (100 - F(s, A, 'lealdade'))) / 140,
  ok: (s, A, T) => hasOf(s, hid18(A)).some((h) => h.kind === 'secret' && h.status === 'open' && h.target === (isPlayerKey(s, T) ? 'player' : hid18(T))),
  run: (s, A, T) => {
    const h = hasOf(s, hid18(A)).find((x) => x.kind === 'secret' && x.status === 'open' && x.target === (isPlayerKey(s, T) ? 'player' : hid18(T)))!;
    const u = useHold(s, h.id, 'expose');
    const a = actOfKey18(s, T);
    if (a) scandal(s, a.id, 'conduct', 30 + h.strength / 3, u.text, { person: T.startsWith('p:') ? T.slice(2) : undefined, tags: ['ag18', 'exposed'] });
    return { ok: u.ok, t: fmtL(l('{a} conta tudo sobre {t}: {x}', '{a} tells all about {t}: {x}'), { a: N(s, A), t: N(s, T), x: h.text }) };
  },
});
registerVerb18({
  id: 'intimidate', name: l('Manda intimidar', 'Has them intimidated'), harm: true,
  tone: 'bad', hidden: true, m: { g: 1 }, pf: (s, A, _T, mv) => (mv.g > 0.6 ? (F(s, A, 'coragem') + F(s, A, 'impulsividade') + (100 - F(s, A, 'empatia'))) / 260 : 0),
  ok: (s, A, T) => T.startsWith('p:') && !isPlayerKey(s, T) && !crimeOdds(s, { actor: crimeId(s, A), target: T.slice(2), partners: [] }, 'assault').block,
  run: (s, A, T, r) => {
    const o = commitCrime(s, 'assault', { actor: crimeId(s, A), target: T.slice(2), partners: [] }, r);
    const ok = typeof o === 'object' && 'ok' in o ? !!(o as { ok: boolean }).ok : false;
    return { ok, t: fmtL(l('{a} manda dar um susto em {t}.', '{a} has {t} roughed up.'), { a: N(s, A), t: N(s, T) }) };
  },
});
registerVerb18({
  id: 'sabotage', name: l('Sabota', 'Sabotages'), harm: true,
  tone: 'bad', hidden: true, m: { g: 0.7, en: 0.7 }, pf: (s, A, _T, mv) => (mv.g + mv.en > 0.5 && (A.startsWith('l:') || A.startsWith('e:') || A.startsWith('pd:')) ? (F(s, A, 'ambicao') + (100 - F(s, A, 'empatia'))) / 200 : 0),
  ok: (s, A, T) => { const a = actOfKey18(s, T); return !!a && !crimeOdds(s, { actor: crimeId(s, A), target: a.id, partners: [] }, 'sabotage').block; },
  run: (s, A, T, r) => {
    const a = actOfKey18(s, T)!;
    const o = commitCrime(s, 'sabotage', { actor: crimeId(s, A), target: a.id, partners: [] }, r);
    const ok = typeof o === 'object' && 'ok' in o ? !!(o as { ok: boolean }).ok : false;
    return { ok, t: fmtL(l('{a} sabota {x}.', '{a} sabotages {x}.'), { a: N(s, A), x: a.name }) };
  },
});
registerVerb18({
  id: 'reconcile', name: l('Faz as pazes', 'Makes peace'), harm: false,
  tone: 'good', m: { g: 0.5, gr: 0.4, care: 0.3 }, pf: (s, A, _T, mv) => (mv.g > 0.2 || mv.care > 0.3 ? (F(s, A, 'empatia') + F(s, A, 'generosidade')) / 160 : 0),
  run: (s, A, T) => {
    adjRel18(s, A, T, 20, l('Reconciliação', 'Reconciliation')); adjRel18(s, T, A, 15, l('Reconciliação', 'Reconciliation'));
    voidHolds(s, (h) => h.kind === 'grievance' && h.holder === hid18(A) && h.target === (isPlayerKey(s, T) ? 'player' : hid18(T)));
    const a = actOfKey18(s, A), b = actOfKey18(s, T);
    const f = a && b ? feudOf18(s, a.id, b.id) : undefined;
    if (f) heatFeud18(s, f, -20, l('Um dos lados pediu desculpas.', 'One side apologized.'));
    const t = fmtL(l('{a} procura {t} e pede desculpas.', '{a} reaches out to {t} and apologizes.'), { a: N(s, A), t: N(s, T) });
    fact(s, 'forgiven', A, T, 20, 'rumor', ['good'], t);
    return { ok: true, t };
  },
});
registerVerb18({
  id: 'favor', name: l('Faz um favor', 'Does a favor'), harm: false,
  tone: 'good', m: { gr: 1, care: 0.6 }, pf: (s, A, _T, mv) => (mv.g < 0.2 ? (F(s, A, 'generosidade') + F(s, A, 'ambicao')) / 150 : 0),
  run: (s, A, T) => {
    grantHold(s, { holder: hid18(A), target: isPlayerKey(s, T) ? 'player' : hid18(T), kind: 'favor', strength: 40, months: 48, src: 'agency18', text: fmtL(l('Favor de {a}', 'A favor from {a}'), { a: N(s, A) }), quiet: !playerSide18(s, T) });
    const a = actOfKey18(s, T);
    if (a) a.momentum = clamp(a.momentum + 2, 0, 100);
    adjRel18(s, T, A, 10, l('Favor', 'Favor'));
    return { ok: true, t: fmtL(l('{a} abre uma porta para {t} — e um dia vai cobrar.', '{a} opens a door for {t} — and will collect one day.'), { a: N(s, A), t: N(s, T) }) };
  },
});
registerVerb18({
  id: 'affair', name: l('Caso secreto', 'Secret affair'), harm: false,
  tone: 'bad', hidden: true, m: { care: 0.5 }, pf: (s, A, T) => (A.startsWith('p:') && T.startsWith('p:') && !isPlayerKey(s, T) ? (F(s, A, 'impulsividade') + F(s, A, 'sociabilidade')) / 400 : 0),
  ok: (s, A, T) => A.startsWith('p:') && T.startsWith('p:') && !isPlayerKey(s, A) && !isPlayerKey(s, T) && s.persons[A.slice(2)]?.alive && s.persons[T.slice(2)]?.alive && (s.year - (s.persons[A.slice(2)]?.born ?? 0)) >= 18 && (s.year - (s.persons[T.slice(2)]?.born ?? 0)) >= 18,
  run: (s, A, T, r) => {
    const t = fmtL(l('{a} e {t} têm um caso às escondidas.', '{a} and {t} are having a secret affair.'), { a: N(s, A), t: N(s, T) });
    const f = fact(s, 'affair', A, T, 40, 'secret', ['sex', 'secret'], t);
    // alguém vê: um integrante da banda de um deles guarda o segredo
    const a = actOfKey18(s, A);
    const w = a?.members.find((m) => m !== A.slice(2) && s.persons[m]?.alive && !s.persons[m].isPlayer);
    if (w && r.chance(0.6)) grantHold(s, { holder: w, target: A.slice(2), kind: 'secret', strength: 55, proof: 1, months: 120, src: 'agency18', factId: f.id, text: t, quiet: true });
    adjRel18(s, A, T, 15, l('Caso', 'Affair')); adjRel18(s, T, A, 15, l('Caso', 'Affair'));
    return { ok: true, t };
  },
});

// ---------------------------------------------------------------- motivos: POR QUE alguém age
// Ninguém age "porque é o mês". Fatos (facts17) acumulam pressão de A por T — mágoa, gratidão, ambição, inveja,
// afeto — que decai com o tempo. Quando passa do limiar da pessoa, ela age: os impulsivos na hora; os
// calculistas esperam o momento certo (mesma cidade, mesmo selo, rixa aberta, alvo fragilizado) ou até a pressão
// transbordar. Cada iniciativa guarda o porquê (o fato de origem) e aparece no diário e na Caixa.

export const MOT18: Record<Motive18, L> = { g: l('Mágoa', 'Grudge'), gr: l('Gratidão', 'Gratitude'), am: l('Ambição', 'Ambition'), en: l('Inveja', 'Envy'), care: l('Afeto', 'Affection') };
export const MK18: Motive18[] = ['g', 'gr', 'am', 'en', 'care'];
export interface Mot18 { v: number[]; why: L; w: number; t0?: number; f?: string }
const mvOf = (m: Mot18): MV18 => ({ g: m.v[0] / 100, gr: m.v[1] / 100, am: m.v[2] / 100, en: m.v[3] / 100, care: m.v[4] / 100 });

/** Soma pressão de A por T (só gente de fora do modo exato, viva, e nunca o jogador como ator). */
export function pushMotive18(s: GameState, A: string, T: string, k: Motive18, amt: number, why: L, fid?: string): void {
  if (!A || !T || A === T || amt <= 0 || isPlayerKey(s, A)) return;
  if (!alive(s, A) || !alive(s, T) || shielded(s, A) || shielded(s, T)) return;
  const st = ag18(s);
  const key = `${A}>${T}`;
  const m = (st.mot[key] ??= { v: [0, 0, 0, 0, 0], why, w: s.week });
  const i = MK18.indexOf(k);
  const add = amt * (1 - m.v[i] / 150);
  m.v[i] = Math.min(100, m.v[i] + add);
  if (add >= 8 || m.v[i] >= Math.max(...m.v)) { m.why = fmtL(l('{m}: {x}', '{m}: {x}'), { m: MOT18[k], x: why }); if (fid) m.f = fid; }
  m.w = s.week;
}

/** Chave persona13 de um id de fato (pessoa, ato → líder, selo → chefe, 'player'). */
export function keyOf18(s: GameState, id: string): string | undefined {
  if (!id) return undefined;
  if (id === 'player') return 'player';
  if (id.includes(':')) return id;
  const p = s.persons[id];
  if (p) return p.isPlayer ? 'player' : `p:${id}`;
  const a = s.acts[id];
  if (a) { const ld = leadOf18(s, a); return ld ? (ld.isPlayer ? 'player' : `p:${ld.id}`) : undefined; }
  const lb = s.labels[id];
  return lb?.leaderId ? `l:${lb.leaderId}` : undefined;
}
/** Amigos (sign 1) ou desafetos (−1) de alguém, pelas relações dele (sem varrer o mundo). */
function circle(s: GameState, k: string, sign: 1 | -1, min = 35, n = 5): string[] {
  const rel = k.startsWith('p:') ? s.persons[k.slice(2)]?.rel : k.startsWith('l:') ? leaders(s).L[k.slice(2)]?.rel : undefined;
  if (!rel) return [];
  const out: [string, number][] = [];
  for (const id in rel) { const v = rel[id] * sign; if (v >= min) out.push([id, v]); }
  out.sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
  return out.slice(0, n).map(([id]) => (k.startsWith('l:') ? (id === 'player' ? 'player' : `l:${id}`) : s.persons[id]?.isPlayer ? 'player' : `p:${id}`)).filter((x) => x !== 'player');
}
/** Quem cobiça um ato em alta: seu maior rival (se o ato é seu) ou o chefe que mais detesta o dono. */
function rivalBoss(s: GameState, a: Act): string | undefined {
  if (isMineAct(s, a)) return topRival(s);
  const ld = a.owner ? s.labels[a.owner]?.leaderId : undefined;
  return ld ? circle(s, `l:${ld}`, -1, 30, 1)[0] : undefined;
}
function topActOf(s: GameState, lb: string, not: string): Act | undefined {
  let best: Act | undefined;
  for (const id of s.labels[lb]?.roster ?? []) { const a = s.acts[id]; if (live(a) && id !== not && (!best || a.fame > best.fame)) best = a; }
  return best;
}

const SUCC = new Set(['chart', 'award', 'signing', 'release', 'show', 'festival']);
const TROUBLE = new Set(['scandal', 'arrest', 'health', 'breakdown', 'rehab', 'addiction', 'stress', 'tour_cancel', 'case_ruling']);
const HURT = new Set(['poach', 'law', 'secret_exposed', 'blackmail', 'plagiarism', 'hold_used', 'leak']);
const KIND = new Set(['favor', 'forgiven']);
const MUTUAL = new Set(['breakup', 'split', 'feud']);
const JOY = new Set(['marriage', 'birth', 'romance']);

/** Fato → pressão. Barato: só olha os atores do fato e as relações deles. */
export function motiveFromFact18(s: GameState, f: Fact): void {
  if (f.severity < 15) return;
  const ks: string[] = [];
  for (const id of f.actors) { const k = keyOf18(s, id); if (k && !ks.includes(k)) ks.push(k); }
  if (!ks.length) return;
  const [S, ...O] = ks;
  const sev = f.severity, why = f.text, fid = f.id, tg = f.tags, k = f.kind;
  if (HURT.has(k) || (k === 'statement' && (tg.includes('beef') || tg.includes('diss') || tg.includes('bad'))) || (tg.includes('ag18') && tg.includes('bad'))) {
    for (const o of O) pushMotive18(s, o, S, 'g', sev * 0.9, why, fid);
    return;
  }
  if (KIND.has(k) || (tg.includes('ag18') && tg.includes('good'))) { for (const o of O) pushMotive18(s, o, S, 'gr', sev, why, fid); return; }
  if (MUTUAL.has(k)) {
    const ps = ks.slice(0, 4);
    for (const a of ps) for (const b of ps) if (a !== b) pushMotive18(s, a, b, 'g', sev * 0.5, why, fid);
    if (k !== 'feud') for (const fr of circle(s, S, 1)) pushMotive18(s, fr, S, 'care', sev * 0.6, why, fid);
    return;
  }
  if (f.visibility === 'secret' || tg.includes('ag18')) return;
  if (k === 'exit') {
    const lb = f.actors.map((id) => s.labels[id]).find(Boolean);
    if (lb?.leaderId) pushMotive18(s, S, `l:${lb.leaderId}`, 'g', sev * 0.8, why, fid);
    for (const fr of circle(s, S, 1)) pushMotive18(s, fr, S, 'care', sev * 0.7, why, fid);
    return;
  }
  if (k === 'death') {
    const dead = f.actors.map((id) => s.persons[id]).find(Boolean);
    if (!dead) return;
    const mates = actsOfPerson17(s, dead.id).flatMap((a) => a.members).filter((m) => m !== dead.id && s.persons[m]?.alive).slice(0, 3).map((m) => keyOf18(s, m)).filter((x): x is string => !!x);
    for (const a of circle(s, `p:${dead.id}`, 1, 40, 4)) for (const b of mates) pushMotive18(s, a, b, 'care', sev * 0.6, why, fid);
    return;
  }
  if (TROUBLE.has(k)) {
    for (const fr of circle(s, S, 1)) pushMotive18(s, fr, S, 'care', sev * 0.8, why, fid);
    for (const en of circle(s, S, -1)) pushMotive18(s, en, S, 'en', sev * 0.5, why, fid);
    return;
  }
  if (JOY.has(k)) { for (const fr of circle(s, S, 1, 45, 3)) pushMotive18(s, fr, S, 'care', sev * 0.4, why, fid); return; }
  if (SUCC.has(k) && (k === 'chart' || k === 'award' || k === 'signing' || tg.includes('good'))) {
    for (const en of circle(s, S, -1)) pushMotive18(s, en, S, 'en', sev * 0.7, why, fid);
    for (const fr of circle(s, S, 1, 45, 3)) pushMotive18(s, fr, S, 'care', sev * 0.35, why, fid);
    for (const o of O) { pushMotive18(s, S, o, 'gr', sev * 0.4, why, fid); pushMotive18(s, o, S, 'gr', sev * 0.4, why, fid); } // sucesso a dois (feat, turnê)
    const a = s.acts[f.actors.find((id) => s.acts[id]) ?? ''];
    if (a && a.fame >= 35 && sev >= 40) { const boss = rivalBoss(s, a); if (boss) pushMotive18(s, boss, S, 'am', sev * 0.6, why, fid); }
    if (k === 'signing' && a?.owner && s.labels[a.owner]) {
      const top = topActOf(s, a.owner, a.id); const tk = top ? keyOf18(s, top.id) : undefined;
      if (tk && tk !== S) { pushMotive18(s, tk, S, 'care', 25, why, fid); pushMotive18(s, S, tk, 'am', 30, why, fid); }
    }
  }
}
onFact('*', motiveFromFact18, 'agency18:motive');

// ---------------------------------------------------------------- escolha e execução

export interface Plan18 { A: string; T: string; v: Verb18; g: number; aff: number; why?: L }

/** Fase do Mestre (dm18 registra): clímax = limiar menor e mais iniciativas; o tom acompanha a fase. */
let phaseMult: (s: GameState) => number = () => 1;
let moodFn: (s: GameState) => string = () => 'rising';
export const setAgencyPhase18 = (fn: (s: GameState) => number, mood?: (s: GameState) => string): void => { phaseMult = fn; if (mood) moodFn = mood; };
const TONE_BIAS: Record<string, Record<Tone18, number>> = {
  calm: { good: 1.1, neutral: 1.3, bad: 0.7 }, rising: { good: 1, neutral: 1, bad: 1 },
  climax: { good: 0.8, neutral: 0.8, bad: 1.4 }, resolution: { good: 1.5, neutral: 1, bad: 0.6 },
};

function wOf(s: GameState, A: string, T: string, v: Verb18, mv: MV18): number {
  if (v.harm && mv.g + mv.en + mv.am < 0.15) return 0;
  if (v.ok && !v.ok(s, A, T)) return 0;
  if (v.m) {
    let x = 0;
    for (const k of Object.keys(v.m) as Motive18[]) x += mv[k] * (v.m[k] ?? 0);
    return x > 0 ? x * Math.max(0, v.pf ? v.pf(s, A, T, mv) : 1) : 0;
  }
  return v.w ? Math.max(0, v.w(s, A, T, mv.g, mv.care)) : 0;
}
export function chooseM18(s: GameState, A: string, T: string, mv: MV18, r: Rng, mood = 'rising'): Plan18 | null {
  const bias = TONE_BIAS[mood] ?? TONE_BIAS.rising;
  const opts = VERBS18.map((v) => [v, wOf(s, A, T, v, mv) * bias[toneOf18(v)]] as [Verb18, number]).filter((x) => x[1] > 0.02);
  if (!opts.length) return null;
  const v = r.weighted(opts, (x) => x[1])![0];
  return { A, T, v, g: mv.g, aff: mv.care };
}
/** Escolha pura (dado um Rng): o que A faria com T agora (rancor e afeto atuais). */
export function choose18(s: GameState, A: string, T: string, r: Rng): Plan18 | null {
  const g = grudge18(s, A, T);
  const aff = Math.max(0, relOf18(s, A, T)) / 100;
  const m = ag18(s).mot[`${A}>${T}`];
  const mv = m ? mvOf(m) : { g, gr: aff * 0.5, am: 0.2, en: g * 0.5, care: aff };
  mv.g = Math.max(mv.g, g); mv.care = Math.max(mv.care, aff);
  return chooseM18(s, A, T, mv, r);
}

/** Dinheiro entre chaves: você (livro-caixa), chefe de selo (caixa do selo), artista (caixa do ato). */
export function pay18(s: GameState, from: string, to: string, c: number, memo: string): number {
  const box = (k: string): { get: () => number; add: (d: number) => void } | null => {
    if (isPlayerKey(s, k)) return { get: () => s.player.cash, add: (d) => { post(s, `ag18:${memo}:${hid18(k === from ? to : from)}`, d, d < 0 ? 'misc' : 'other_income', memo); } };
    if (k.startsWith('l:')) { const lb = s.labels[leaders(s).L[k.slice(2)]?.label ?? '']; if (lb) return { get: () => lb.cash, add: (d) => { lb.cash += d; } }; }
    const a = actOfKey18(s, k);
    return a ? { get: () => a.cash ?? 0, add: (d) => { a.cash = (a.cash ?? 0) + d; } } : null;
  };
  const f = box(from), t = box(to);
  if (!f || !t) return 0;
  const v = Math.round(isPlayerKey(s, from) ? c : Math.min(c, Math.max(0, f.get())));
  if (v <= 0) return 0;
  f.add(-v); t.add(v);
  return v;
}
export const usd18 = (c: number): string => `$${Math.round(c / 100).toLocaleString()}`;

/** Executa uma iniciativa (de qualquer um contra qualquer um). Contra você: mensagem com respostas. */
export function act18(s: GameState, p: Plan18, r: Rng): Ag18Log | null {
  const { A, T, v } = p;
  if (shielded(s, A) || shielded(s, T) || !alive(s, A) || !alive(s, T)) return null;
  if (v.ok && !v.ok(s, A, T)) return null;
  const st = ag18(s);
  const toMe = playerSide18(s, T);
  const tone = toneOf18(v);
  const nm = { a: N(s, A), t: N(s, T) };
  let res: { ok: boolean; t: L };
  let pend = false;
  if (v.ask && toMe) { pend = true; res = { ok: true, t: fmtL(v.pitch ?? l('{a} faz uma proposta a {t}.', '{a} makes {t} an offer.'), nm) }; }
  else if (v.ask) {
    const pa = clamp(0.35 + relOf18(s, T, A) / 200 + (v.accP?.(s, A, T) ?? 0), 0.05, 0.92);
    if (r.chance(pa)) res = v.run(s, A, T, r);
    else { adjRel18(s, A, T, -4, l('Proposta recusada', 'Offer turned down')); res = { ok: false, t: fmtL(l('{t} recusa a proposta de {a}: {x}', '{t} turns down {a}: {x}'), { ...nm, x: fmtL(v.pitch ?? v.name, nm) }) }; }
  } else res = v.run(s, A, T, r);
  const mine = toMe || playerSide18(s, A);
  const row: Ag18Log = { w: s.week, y: s.year, m: s.month, a: A, t: T, v: v.id, ok: res.ok, txt: res.t, tone, ...(p.why ? { why: p.why } : {}), ...(pend ? { pend: 1 as const } : {}), ...(mine ? { mine: 1 as const } : {}) };
  st.log.unshift(row);
  if (st.log.length > 120) st.log.length = 120;
  st.cd[`${A}>${T}`] = s.week + (tone === 'bad' ? 26 : 13);
  st.n++;
  st.nt[tone] = (st.nt[tone] ?? 0) + 1;
  if (toMe) {
    const mk = s.year * 12 + s.month;
    if (st.pc.m !== mk) st.pc = { m: mk, n: 0 };
    if (st.pc.n < 3 || (v.harm && st.pc.n < 4)) {
      st.pc.n++;
      const body = p.why ? fmtL(l('{t}\n\nPor quê: {w}', '{t}\n\nWhy: {w}'), { t: res.t, w: p.why }) : res.t;
      pushInbox18(s, 'agency18', { from: N(s, A), subject: fmtL(l('{a}: {v}', '{a}: {v}'), { a: N(s, A), v: v.name }), body, tone: tone === 'good' ? 'good' : tone === 'bad' ? 'bad' : 'info', ref: { A, T, v: v.id, ...(pend ? { pend: 1 } : {}) }, actions: respOpts(s, v, A, pend) });
    } else if (!pend) notify(s, res.t, 'event');
  } else if (playerSide18(s, A)) notify(s, fmtL(l('Por conta própria: {t}', 'On their own: {t}'), { t: res.t }), 'event');
  return row;
}

const isCalc18 = (s: GameState, A: string): boolean => F(s, A, 'disciplina') - F(s, A, 'impulsividade') > 8 || (F(s, A, 'ambicao') > 70 && F(s, A, 'impulsividade') < 45);
/** Limiar de pressão para agir (impulsivos agem antes; o clímax do Mestre baixa o limiar). */
export const th18 = (s: GameState, A: string): number => clamp(52 + (F(s, A, 'disciplina') - F(s, A, 'impulsividade')) / 5, 36, 72) / Math.sqrt(Math.max(0.3, phaseMult(s)));
/** O momento certo (para quem calcula): mesma cidade, mesmo selo, rixa aberta ou alvo fragilizado. */
export function moment18(s: GameState, A: string, T: string): L | null {
  const a = actOfKey18(s, A), b = actOfKey18(s, T);
  const cA = per13(s, A)?.city ?? a?.city, cT = isPlayerKey(s, T) ? s.config.homeCity : per13(s, T)?.city ?? b?.city;
  if (cA && cA === cT) return l('na mesma cidade, na hora certa', 'same city, right time');
  if (a && b && a.id !== b.id && a.owner && a.owner === b.owner) return l('no mesmo selo', 'on the same label');
  if (A.startsWith('l:') && b && b.owner && b.owner === leaders(s).L[A.slice(2)]?.label) return l('artista do próprio selo', 'an act on their own label');
  if (b && b.momentum < 25) return l('com o alvo fragilizado', 'with the target down');
  if (a && b && feudOf18(s, a.id, b.id)) return l('com a rixa aberta', 'with the feud open');
  return null;
}
const bmonth = (k: string): number => { let h = 7; for (let i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) >>> 0; return h % 12; };

/** O mês das iniciativas: só age quem tem motivo acima do limiar (a maioria das pessoas, na maioria dos meses, não faz nada). */
export function agencyMonth18(s: GameState, r: Rng): Ag18Log[] {
  const st = ag18(s);
  const pm = phaseMult(s);
  const out: Ag18Log[] = [];
  for (const [k, x] of Object.entries(st.inc)) { if (x.until < s.week) delete st.inc[k]; else pushMotive18(s, k, x.t, 'g', 22, l('instigado(a) por você', 'incited by you')); }
  const cands: { key: string; A: string; T: string; m: Mot18; mx: number; th: number }[] = [];
  const keys = Object.keys(st.mot);
  for (const key of keys) {
    const m = st.mot[key];
    m.v[0] *= 0.92; m.v[1] *= 0.9; m.v[2] *= 0.82; m.v[3] *= 0.85; m.v[4] *= 0.85; // mágoa e gratidão duram mais
    const i = key.indexOf('>');
    const A = key.slice(0, i), T = key.slice(i + 1);
    if ((m.v[1] > 15 || m.v[4] > 15) && T.startsWith('p:') && bmonth(T) === s.month) { m.v[4] = Math.min(100, m.v[4] + 25); m.why = fmtL(l('Aniversário de {t}', '{t}\'s birthday'), { t: N(s, T) }); }
    const mx = Math.max(m.v[0], m.v[1], m.v[2], m.v[3], m.v[4]);
    if (mx < 4) { delete st.mot[key]; continue; }
    if ((st.cd[key] ?? 0) > s.week || (st.ca[A] ?? 0) > s.week) continue;
    const th = th18(s, A);
    if (mx < th) { delete m.t0; continue; }
    m.t0 ??= s.week;
    cands.push({ key, A, T, m, mx, th });
  }
  if (keys.length > 700) {
    const weak = Object.entries(st.mot).sort((a, b) => Math.max(...a[1].v) - Math.max(...b[1].v) || (a[0] < b[0] ? -1 : 1)).slice(0, keys.length - 600);
    for (const [k] of weak) delete st.mot[k];
  }
  cands.sort((a, b) => b.mx - a.mx || (a.key < b.key ? -1 : 1));
  const cap = Math.max(1, Math.min(8, Math.round(4 * pm * dir17(s).world)));
  const mood = moodFn(s);
  let hostileMine = false;
  for (const c of cands) {
    if (out.length >= cap) break;
    if ((st.ca[c.A] ?? 0) > s.week || !st.mot[c.key]) continue;
    if (!alive(s, c.A) || !alive(s, c.T) || shielded(s, c.A) || shielded(s, c.T)) { delete st.mot[c.key]; continue; }
    const calc = isCalc18(s, c.A);
    let how: L;
    if (calc) {
      const mo = moment18(s, c.A, c.T);
      if (!mo && c.mx < 90 && s.week - (c.m.t0 ?? s.week) < 26) continue;
      how = mo ?? (c.mx >= 90 ? l('não aguentou mais esperar', 'couldn\'t wait any longer') : l('esperou meses pela hora certa', 'waited months for the right moment'));
    } else how = l('por impulso', 'on impulse');
    if (!r.chance(clamp(0.3 + (c.mx - c.th) / 45, 0.2, 0.95))) continue;
    const p = chooseM18(s, c.A, c.T, mvOf(c.m), r, mood);
    if (!p) continue;
    if (p.v.harm && playerSide18(s, c.T) && hostileMine) continue;
    p.why = fmtL(l('{w} — {x}', '{w} — {x}'), { w: c.m.why, x: how });
    const row = act18(s, p, r);
    if (!row) continue;
    if (p.v.harm && playerSide18(s, c.T)) hostileMine = true;
    out.push(row);
    for (const k of Object.keys(p.v.m ?? { g: 1 }) as Motive18[]) c.m.v[MK18.indexOf(k)] *= 0.3; // a pressão usada se desfaz
    st.ca[c.A] = s.week + (calc ? 13 : 6);
  }
  for (const box of [st.cd, st.ca]) { const ks = Object.keys(box); if (ks.length > 800) for (const k of ks) if (box[k] <= s.week) delete box[k]; }
  return out;
}

registerSimHook('month', 'agency18', (s) => { agencyMonth18(s, Rng.fromSeed(`${s.config.seed}:ag18:${s.week}`)); });

// ---------------------------------------------------------------- respostas do jogador

const negP = (s: GameState, A: string): number => clamp(0.3 + ((per13(s, 'player')?.attrs.neg ?? 50) - 50) / 150 + relOf18(s, A, 'player') / 250, 0.1, 0.85);
function respOpts(s: GameState, v: Verb18, A: string, pend: boolean): { id: string; label: L }[] {
  const tone = toneOf18(v);
  const ign = { id: 'ignore', label: l('Ignorar', 'Ignore') };
  const np = `${Math.round(negP(s, A) * 100)}%`;
  if (tone === 'bad') return [
    { id: 'negotiate', label: v.id === 'sue' || v.id === 'plagiarism' ? fmtL(l('Fazer acordo ({v})', 'Settle ({v})'), { v: usd18(money(s, 12000)) }) : v.id === 'blackmail' ? fmtL(l('Pagar para calar ({v})', 'Pay for silence ({v})'), { v: usd18(money(s, 15000)) }) : fmtL(l('Chamar para conversar ({p})', 'Invite for a talk ({p})'), { p: np }) },
    { id: 'retaliate', label: l('Revidar em público', 'Retaliate in public') }, ign];
  if (pend) return [{ id: 'accept', label: l('Aceitar', 'Accept') }, ...(tone === 'neutral' ? [{ id: 'negotiate', label: fmtL(l('Negociar ({p})', 'Negotiate ({p})'), { p: np }) }] : []), { id: 'decline', label: l('Recusar', 'Decline') }, ign];
  return [{ id: 'accept', label: l('Agradecer em público', 'Thank them in public') }, { id: 'decline', label: l('Recusar o gesto', 'Turn the gesture down') }, ign];
}

function badResp(s: GameState, A: string, T: string, v: string, act: Resp18, r: Rng): L {
  const nm = N(s, A);
  if (act === 'retaliate') {
    adjRel18(s, A, 'player', -10, l('Resposta pública', 'Public answer'));
    const a = actOfKey18(s, T), b = actOfKey18(s, A);
    if (a) addHype(s, `a:${a.id}`, 'ag18ret', l('Resposta à altura', 'A fitting reply'), 6);
    if (a && b) startFeud18(s, b.id, a.id, fmtL(l('Você respondeu {a} em público', 'You answered {a} in public'), { a: nm }), 14);
    emitFact(s, { kind: 'statement', actors: ['player', hid18(A)], severity: 30, visibility: 'public', tags: ['ag18', 'reply'], text: fmtL(l('{c} responde {a} à altura.', '{c} hits back at {a}.'), { c: s.config.companyName, a: nm }), src: 'agency18' });
    return fmtL(l('Você revidou {a}: hype para o seu lado, mas a briga esquenta (e {a} guarda mais mágoa).', 'You hit back at {a}: hype for your side, but the fight heats up (and {a} holds a bigger grudge).'), { a: nm });
  }
  if (act === 'negotiate') {
    if (v === 'sue' || v === 'plagiarism') { const c = money(s, 12000); post(s, `ag18settle:${A}`, -c, 'legal', 'Acordo judicial'); adjRel18(s, A, 'player', 10, l('Acordo', 'Settlement')); return l('Acordo fechado: caro, mas silencioso.', 'Settled: expensive, but quiet.'); }
    if (v === 'blackmail') { const c = money(s, 15000); post(s, `ag18pay:${A}`, -c, 'legal', 'Silêncio comprado'); grantHold(s, { holder: hid18(A), target: 'player', kind: 'blackmail', strength: 50, months: 60, src: 'agency18', text: l('Já pagou uma vez — pode pagar de novo', 'Paid once — may pay again'), quiet: true }); return l('Pago. O segredo fica guardado… por enquanto.', 'Paid. The secret stays buried… for now.'); }
    const p = clamp(0.35 + (F(s, A, 'empatia') - 50) / 150 + (opinionOf(s, A) + 50) / 300, 0.08, 0.85);
    if (r.chance(p)) { adjRel18(s, A, 'player', 25, l('Conversa franca', 'Frank talk')); voidHolds(s, (h) => h.kind === 'grievance' && h.holder === hid18(A) && h.target === 'player'); delete ag18(s).mot[`${A}>player`]; return fmtL(l('{a} aceita conversar: mágoa encerrada ({p}% de chance).', '{a} agrees to talk: grudge settled ({p}% chance).'), { a: nm, p: Math.round(p * 100) }); }
    adjRel18(s, A, 'player', -5, l('Recusou conversar', 'Refused to talk'));
    return fmtL(l('{a} não atende ({p}% de chance).', '{a} won\'t pick up ({p}% chance).'), { a: nm, p: Math.round(p * 100) });
  }
  if (v === 'blackmail') {
    const h = hasOf(s, hid18(A)).find((x) => x.kind === 'secret' && x.status === 'open' && x.target === 'player');
    if (h) { const u = useHold(s, h.id, 'expose'); const a = actOfKey18(s, T); if (a) scandal(s, a.id, 'conduct', 35, u.text, { tags: ['ag18'] }); return fmtL(l('Você ignorou — {a} cumpriu a ameaça: {x}', 'You ignored it — {a} followed through: {x}'), { a: nm, x: u.text }); }
  }
  if (v === 'sue' || v === 'plagiarism') { const lose = r.chance(0.45); if (lose) { const c = money(s, 20000); post(s, `ag18lost:${A}`, -c, 'legal', 'Processo perdido'); return l('Você ignorou o processo e perdeu à revelia.', 'You ignored the suit and lost by default.'); } return l('O processo morreu na justiça.', 'The suit died in court.'); }
  return l('Você deixou passar. Às vezes o silêncio vence; às vezes parece fraqueza.', 'You let it go. Sometimes silence wins; sometimes it looks weak.');
}

registerInboxKind('agency18', {
  label: l('Iniciativa', 'Initiative'), cat: 'people', icon: 'warning', prio: 2,
  goto: (_s, m) => (m.ref?.A ? { person: String(m.ref.A) } : null),
  handle: (s, m, action, r) => {
    const A = String(m.ref?.A ?? ''), T = String(m.ref?.T ?? 'player'), vid = String(m.ref?.v ?? '');
    const v = VERBS18.find((x) => x.id === vid);
    const act = (({ retort: 'retaliate', peace: 'negotiate', settle: 'negotiate', pay: 'negotiate' } as Record<string, Resp18>)[action] ?? action) as Resp18;
    const nm = N(s, A);
    if (!alive(s, A)) return l('Não há mais com quem tratar.', 'There is no one left to deal with.');
    const sp = v?.resp?.[act];
    if (sp) return sp(s, A, T, r);
    if (!v || toneOf18(v) === 'bad') return badResp(s, A, T, vid, act, r);
    const ego = F(s, A, 'ego');
    if (m.ref?.pend) {
      if (act === 'accept') { const res = v.run(s, A, T, r); adjRel18(s, A, T, 6, l('Proposta aceita', 'Offer accepted')); return res.t; }
      if (act === 'negotiate') {
        const p = negP(s, A);
        if (r.chance(p)) { const res = v.run(s, A, T, r); adjRel18(s, A, T, 3, l('Bom acordo', 'Good deal')); const a = actOfKey18(s, T); if (a) a.momentum = clamp(a.momentum + 2, 0, 100); return fmtL(l('Você negociou termos melhores ({p}%): {t}', 'You got better terms ({p}%): {t}'), { p: Math.round(p * 100), t: res.t }); }
        adjRel18(s, A, T, -6, l('Contraproposta', 'Counteroffer'));
        return fmtL(l('{a} não gostou da contraproposta ({p}% de chance) e desistiu.', '{a} didn\'t like the counteroffer ({p}% chance) and walked away.'), { a: nm, p: Math.round(p * 100) });
      }
      if (act === 'decline') { const d = 3 + Math.round(ego / 25); adjRel18(s, A, T, -d, l('Recusou a proposta', 'Declined the offer')); return fmtL(l('Você recusou. {a} anota (relação −{d}; quanto mais ego, mais dói).', 'You declined. {a} takes note (relation −{d}; the bigger the ego, the more it stings).'), { a: nm, d }); }
      adjRel18(s, A, T, -3, l('Sem resposta', 'No answer'));
      return fmtL(l('Sem resposta. {a} entende o recado (relação −3).', 'No answer. {a} gets the message (relation −3).'), { a: nm });
    }
    if (act === 'accept') { adjRel18(s, A, T, 8, l('Agradeceu em público', 'Thanked in public')); const a = actOfKey18(s, T); if (a) addHype(s, `a:${a.id}`, 'ag18thx', l('Gratidão pública', 'Public gratitude'), 2); return fmtL(l('Você agradeceu {a} em público: relação +8, hype +2.', 'You thanked {a} in public: relation +8, hype +2.'), { a: nm }); }
    if (act === 'decline') { adjRel18(s, A, T, -8, l('Gesto recusado', 'Gesture refused')); return fmtL(l('Você recusou o gesto de {a}: orgulho ferido (relação −8).', 'You turned down {a}\'s gesture: wounded pride (relation −8).'), { a: nm }); }
    adjRel18(s, A, T, -2, l('Nem agradeceu', 'No thanks'));
    return fmtL(l('Você não respondeu a {a} (relação −2).', 'You didn\'t answer {a} (relation −2).'), { a: nm });
  },
});

registerInboxKind('feud18', {
  label: l('Rixa', 'Feud'), cat: 'people', icon: 'warning', prio: 2,
  goto: (_s, m) => (m.ref?.act ? { act: String(m.ref.act) } : null),
  handle: (s, m, action, r) => {
    const f = activeFeuds18(s).find((x) => x.id === m.ref?.feud);
    if (!f) return l('A rixa já acabou.', 'The feud is already over.');
    if (action === 'answer') {
      heatFeud18(s, f, 10, l('Você mandou responder com outra faixa.', 'You had them answer with another track.'));
      const a = s.acts[String(m.ref?.act)];
      if (a) { a.momentum = clamp(a.momentum + 5, 0, 100); addHype(s, `a:${a.id}`, 'feud18ans', l('Resposta na rixa', 'Feud answer'), 8); }
      return l('Resposta lançada: hype e vendas sobem — e o calor também (+10).', 'Answer released: hype and sales rise — and so does the heat (+10).');
    }
    if (action === 'mediate' || action === 'truce' || action === 'collab') return tryCool18(s, f, action, 'player', r).text;
    heatFeud18(s, f, -4);
    const a = s.acts[String(m.ref?.act)];
    if (a) a.momentum = clamp(a.momentum - 2, 0, 100);
    return l('Silêncio: o calor cai um pouco (−4), mas parte do público acha que vocês amarelaram.', 'Silence: heat drops a bit (−4), but part of the public thinks you chickened out.');
  },
});
setFeudMine18((s, f, t) => {
  const mineId = isMineAct(s, s.acts[f.a]) ? f.a : f.b;
  const c = (k: 'mediate' | 'truce' | 'collab') => { const o = cool18(s, f, k); return `${Math.round(o.p * 100)}%, $${Math.round(o.cost / 100).toLocaleString()}`; };
  pushInbox18(s, 'feud18', {
    from: s.acts[mineId]?.name ?? '?', subject: fmtL(l('Rixa: {n}', 'Feud: {n}'), { n: STAGE18[f.st].name }), body: t, tone: 'bad', ref: { feud: f.id, act: mineId },
    actions: [
      { id: 'answer', label: l('Responder (mais hype, mais calor)', 'Answer back (more hype, more heat)') },
      { id: 'mediate', label: fmtL(l('Mediação ({c})', 'Mediation ({c})'), { c: c('mediate') }) },
      { id: 'truce', label: fmtL(l('Trégua ({c})', 'Truce ({c})'), { c: c('truce') }) },
      { id: 'collab', label: fmtL(l('Feat da paz ({c})', 'Peace feat ({c})'), { c: c('collab') }) },
      { id: 'ignore', label: l('Ignorar', 'Ignore') },
    ],
  });
});

// ---------------------------------------------------------------- ações do jogador (menu de pessoa)

const npcActKey = (s: GameState, k: string): Act | undefined => (k.startsWith('p:') && !isPlayerKey(s, k) ? actOfKey18(s, k) : k.startsWith('l:') ? actOfKey18(s, k) : undefined);
const exactBlock = (s: GameState, k: string): L | null => (shielded(s, k) ? l('Vida real exata: pessoa real só vive fatos documentados.', 'Exact real life: a real person only lives documented facts.') : null);

registerPersonAction({
  id: 'feud18_diss', label: l('Encomendar uma diss (começar rixa)', 'Commission a diss (start a feud)'), group: 'dark', icon: 'mic', cooldown: 26,
  desc: l('Seu artista de maior fama ataca o ato desta pessoa numa faixa: hype e vendas para os dois — e uma escada que pode chegar à violência.', 'Your most famous act attacks this person\'s act on a track: hype and sales for both — and a ladder that can end in violence.'),
  cost: (s) => ({ usd: 3000, balls: 1 }),
  visible: (s, k) => !!npcActKey(s, k) && !isMineAct(s, npcActKey(s, k)),
  available: (s, k) => exactBlock(s, k) ?? (actOfKey18(s, 'player') ? null : l('Você precisa de um artista ativo.', 'You need an active act.')),
  chance: (s, k) => { const mine = actOfKey18(s, 'player'), t = npcActKey(s, k); const lead = leadOf18(s, mine); const p = clamp(0.55 + (temper18(s, lead) - 0.5) * 0.6, 0.15, 0.9); return { p, why: [fmtL(l('Temperamento de {n}', '{n}\'s temper'), { n: lead?.name ?? '?' }), fmtL(l('Fama: {a} × {b}', 'Fame: {a} × {b}'), { a: Math.round(mine?.fame ?? 0), b: Math.round(t?.fame ?? 0) })] }; },
  run: (s, k, _r, ok) => {
    const mine = actOfKey18(s, 'player')!, t = npcActKey(s, k)!;
    if (!ok) return { ok, text: fmtL(l('{a} se recusou a gravar a diss ("não é minha briga").', '{a} refused to record the diss ("not my fight").'), { a: mine.name }) };
    const f = startFeud18(s, mine.id, t.id, fmtL(l('Diss encomendada por você contra {t}', 'A diss you commissioned against {t}'), { t: t.name }), 20);
    addHype(s, `a:${mine.id}`, 'feud18diss', l('Diss track', 'Diss track'), 10);
    mine.momentum = clamp(mine.momentum + 6, 0, 100);
    emitFact(s, { kind: 'feud', actors: [mine.id, t.id, 'player'], place: mine.city, severity: 45, visibility: 'public', tags: ['feud', 'feud18', 'diss'], text: fmtL(l('{a} ataca {t} numa diss track.', '{a} attacks {t} on a diss track.'), { a: mine.name, t: t.name }), src: 'feud18' });
    return { ok: true, text: fmtL(l('{a} solta a diss contra {t}: hype +10. Rixa {st} — acompanhe em Mundo › Diário do Mestre.', '{a} drops the diss on {t}: hype +10. Feud {st} — follow it in World › DM Journal.'), { a: mine.name, t: t.name, st: f ? STAGE18[f.st].name : '' }) };
  },
});
registerPersonAction({
  id: 'feud18_peace', label: l('Mediar a rixa desta pessoa', 'Mediate this person\'s feud'), group: 'social', icon: 'handshake', cooldown: 13,
  desc: l('Você se oferece para sentar os dois lados à mesa. Se der certo, ganha a gratidão dos dois.', 'You offer to sit both sides at the table. If it works, both are grateful.'),
  cost: (s, k) => { const a = npcActKey(s, k); const f = a ? feudsOf18(s, a.id)[0] : undefined; return { cents: f ? cool18(s, f, 'mediate').cost : 0, balls: 1, shown: true }; },
  visible: (s, k) => { const a = npcActKey(s, k); return !!a && feudsOf18(s, a.id).length > 0; },
  chance: (s, k) => { const a = npcActKey(s, k)!; const f = feudsOf18(s, a.id)[0]; const o = cool18(s, f, 'mediate'); return { p: o.p, why: o.why }; },
  selfRoll: true,
  run: (s, k, r) => {
    const a = npcActKey(s, k)!; const f = feudsOf18(s, a.id)[0];
    const o = tryCool18(s, f, 'mediate', 'player', r);
    if (o.ok) for (const id of [f.a, f.b]) { const p = leadOf18(s, s.acts[id]); if (p && !p.isPlayer) opine(s, `p:${p.id}`, 10, l('Mediou a paz', 'Brokered peace')); }
    return { ok: o.ok, text: o.text };
  },
});
registerPersonAction({
  id: 'ag18_incite', label: l('Instigar contra um rival seu', 'Incite against a rival of yours'), group: 'dark', icon: 'fire', cooldown: 26,
  desc: l('Você alimenta a mágoa desta pessoa contra o seu maior rival (o chefe do selo com maior rivalidade). Nos próximos meses ela tende a agir contra ele — do jeito dela.', 'You feed this person\'s grudge against your biggest rival (the label boss you clash with most). Over the next months they tend to act against them — their own way.'),
  cost: () => ({ usd: 2000 }),
  visible: (s, k) => !isPlayerKey(s, k) && !playerSide18(s, k) && (k.startsWith('p:') || k.startsWith('l:') || k.startsWith('e:') || k.startsWith('pd:')),
  available: (s, k) => exactBlock(s, k) ?? (topRival(s) ? null : l('Você ainda não tem um rival declarado.', 'You have no declared rival yet.')),
  chance: (s, k) => { const p = clamp(0.4 + opinionOf(s, k) / 200 + (F(s, k, 'impulsividade') - 50) / 200, 0.08, 0.9); return { p, why: [fmtL(l('Opinião sobre você ({o})', 'Opinion of you ({o})'), { o: opinionOf(s, k) }), fmtL(l('Impulsividade ({v})', 'Impulsiveness ({v})'), { v: Math.round(F(s, k, 'impulsividade')) })] }; },
  run: (s, k, _r, ok) => {
    const t = topRival(s)!;
    if (!ok) { opine(s, k, -6, l('Tentou me usar', 'Tried to use me')); return { ok, text: fmtL(l('{a} percebe a jogada e não morde a isca.', '{a} sees through it and won\'t take the bait.'), { a: N(s, k) }) }; }
    ag18(s).inc[k] = { t, until: s.week + 26 };
    adjRel18(s, k, t, -25, l('Instigado(a)', 'Incited'));
    return { ok, text: fmtL(l('{a} agora tem {t} na mira. O que vai fazer depende do temperamento dele(a).', '{a} now has {t} in their sights. What they do depends on their temper.'), { a: N(s, k), t: N(s, t) }) };
  },
});
function topRival(s: GameState): string | undefined {
  const lb = Object.entries(s.rivalries).filter(([id]) => s.labels[id]?.active && s.labels[id].leaderId).sort((a, b) => b[1] - a[1])[0]?.[0];
  return lb ? `l:${s.labels[lb].leaderId}` : undefined;
}

export const _ag18 = { recentFacts, raiseVisibility, circle, keyOf18 };
export type { Feud18 };
export const H18 = { fac, fact, isMineAct, live };
