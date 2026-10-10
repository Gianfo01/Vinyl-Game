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
import { familyOf, l, type L } from '../../data/world';
import { dir17 } from '../director17';
import { registerExt4, registerSimHook } from '../ext4';
import { emitFact, recentFacts, raiseVisibility } from '../facts17';
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

export interface Ag18State { rel: Record<string, number>; log: Ag18Log[]; cd: Record<string, number>; inc: Record<string, { t: string; until: number }>; n: number }
export interface Ag18Log { w: number; y: number; m: number; a: string; t: string; v: string; ok: boolean; txt: L; mine?: 1 }
declare module '../ext4' { interface Ext4 { ag18: Ag18State } }
const fresh = (): Ag18State => ({ rel: {}, log: [], cd: {}, inc: {}, n: 0 });
registerExt4('ag18', fresh);
export function ag18(s: GameState): Ag18State {
  const x = s.x4 as unknown as { ag18?: Ag18State };
  const st = (x.ag18 ??= fresh());
  st.rel ??= {}; st.log ??= []; st.cd ??= {}; st.inc ??= {};
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

export interface Verb18 {
  id: string;
  name: L;
  /** prejudica o alvo */
  harm: boolean;
  /** peso pela personalidade do ator e pelo rancor/afeto */
  w: (s: GameState, A: string, T: string, g: number, aff: number) => number;
  ok?: (s: GameState, A: string, T: string) => boolean;
  run: (s: GameState, A: string, T: string, r: Rng) => { ok: boolean; t: L };
}
export const VERBS18: Verb18[] = [];
export const registerVerb18 = (v: Verb18): void => { const i = VERBS18.findIndex((x) => x.id === v.id); if (i >= 0) VERBS18[i] = v; else VERBS18.push(v); };

const F = fac;
const fact = (s: GameState, kind: string, A: string, T: string, sev: number, vis: 'secret' | 'rumor' | 'public', tags: string[], text: L) => {
  const a = actOfKey18(s, T);
  return emitFact(s, { kind, actors: [hid18(A), hid18(T), ...(a ? [a.id] : [])], place: a?.city ?? per13(s, T)?.city ?? s.config.homeCity, severity: sev, visibility: vis, tags: [...tags, 'ag18'], text, src: 'agency18' });
};
const N = nameOfKey18;

registerVerb18({
  id: 'praise', name: l('Elogia em público', 'Praises in public'), harm: false,
  w: (s, A, _T, g, aff) => (aff > 0.2 ? aff * (F(s, A, 'empatia') + F(s, A, 'sociabilidade')) / 100 : 0) * (g > 0.3 ? 0.1 : 1),
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
  w: (s, A, _T, g) => g * (F(s, A, 'ego') + F(s, A, 'impulsividade') + F(s, A, 'vaidade')) / 120,
  run: (s, A, T) => {
    adjRel18(s, T, A, -15, l('Provocação pública', 'Public jab'));
    if (T.startsWith('p:') && !isPlayerKey(s, T)) addStress(s, T.slice(2), 6, fmtL(l('Provocado(a) por {a}', 'Called out by {a}'), { a: N(s, A) }));
    const a = actOfKey18(s, A), b = actOfKey18(s, T);
    let extra: L | string = '';
    if (a && b && a.id !== b.id) {
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
  w: (s, A, _T, g) => g * ((100 - F(s, A, 'empatia')) + F(s, A, 'ambicao')) / 140,
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
  w: (s, A, _T, g) => (A.startsWith('l:') || A.startsWith('e:') ? (0.3 + g) * F(s, A, 'ambicao') / 70 : 0),
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
  w: (s, A, _T, g) => g * (F(s, A, 'teimosia') + F(s, A, 'ambicao')) / 200 * (A.startsWith('l:') || A.startsWith('e:') ? 1.2 : 0.5),
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
  w: (s, A, _T, g) => (0.4 + g) * ((100 - F(s, A, 'empatia')) + F(s, A, 'ambicao')) / 120,
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
  w: (s, A, _T, g) => g * (F(s, A, 'impulsividade') + (100 - F(s, A, 'lealdade'))) / 140,
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
  w: (s, A, _T, g) => (g > 0.6 ? g * (F(s, A, 'coragem') + F(s, A, 'impulsividade') + (100 - F(s, A, 'empatia'))) / 260 : 0),
  ok: (s, A, T) => T.startsWith('p:') && !isPlayerKey(s, T) && !crimeOdds(s, { actor: crimeId(s, A), target: T.slice(2), partners: [] }, 'assault').block,
  run: (s, A, T, r) => {
    const o = commitCrime(s, 'assault', { actor: crimeId(s, A), target: T.slice(2), partners: [] }, r);
    const ok = typeof o === 'object' && 'ok' in o ? !!(o as { ok: boolean }).ok : false;
    return { ok, t: fmtL(l('{a} manda dar um susto em {t}.', '{a} has {t} roughed up.'), { a: N(s, A), t: N(s, T) }) };
  },
});
registerVerb18({
  id: 'sabotage', name: l('Sabota', 'Sabotages'), harm: true,
  w: (s, A, _T, g) => (g > 0.5 && (A.startsWith('l:') || A.startsWith('e:') || A.startsWith('pd:')) ? g * (F(s, A, 'ambicao') + (100 - F(s, A, 'empatia'))) / 200 : 0),
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
  w: (s, A, _T, g) => (g > 0.2 ? g * (F(s, A, 'empatia') + F(s, A, 'generosidade')) / 160 : 0),
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
  w: (s, A, _T, g, aff) => (aff > 0.3 && g < 0.2 ? aff * (F(s, A, 'generosidade') + F(s, A, 'ambicao')) / 150 : 0),
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
  w: (s, A, T, _g, aff) => (A.startsWith('p:') && T.startsWith('p:') && !isPlayerKey(s, T) && aff > 0.2 ? aff * (F(s, A, 'impulsividade') + F(s, A, 'sociabilidade')) / 400 : 0),
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

// ---------------------------------------------------------------- quem age, contra quem

/** Atores possíveis do mês (amostra): líderes de atos notáveis, chefes de selo, seus artistas, quem guarda mágoa. */
function actors(s: GameState): string[] {
  const out = new Set<string>();
  const acts = Object.values(s.acts).filter((a) => live(a) && a.fame >= 20).sort((a, b) => b.fame - a.fame).slice(0, 40);
  for (const a of acts) { const p = leadOf18(s, a); if (p && !p.isPlayer) out.add(`p:${p.id}`); }
  for (const id of playerActs(s)) for (const m of s.acts[id]?.members ?? []) if (s.persons[m]?.alive && !s.persons[m].isPlayer) out.add(`p:${m}`);
  for (const lb of Object.values(s.labels)) if (lb.active && lb.leaderId) out.add(`l:${lb.leaderId}`);
  for (const k of Object.keys(ag18(s).inc)) out.add(k);
  return [...out].filter((k) => alive(s, k) && !shielded(s, k));
}
/** Alvos que importam para A: quem ele odeia, ama, inveja; você; os rivais da rixa. */
function targets(s: GameState, A: string, r: Rng): string[] {
  const out = new Set<string>();
  const id = hid18(A);
  for (const h of hasOf(s, id)) if (h.status === 'open' && (h.kind === 'grievance' || h.kind === 'secret')) out.add(h.target === 'player' ? 'player' : s.persons[h.target] ? `p:${h.target}` : h.target);
  if (A.startsWith('p:')) for (const [k, v] of Object.entries(s.persons[id]?.rel ?? {})) if (Math.abs(v) > 30 && s.persons[k]?.alive) out.add(s.persons[k].isPlayer ? 'player' : `p:${k}`);
  if (A.startsWith('l:')) for (const [k, v] of Object.entries(leaders(s).L[A.slice(2)]?.rel ?? {})) if (Math.abs(v) > 30) out.add(k === 'player' ? 'player' : `l:${k}`);
  const a = actOfKey18(s, A);
  if (a) for (const f of feudsOf18(s, a.id)) { const o = s.acts[f.a === a.id ? f.b : f.a]; const p = leadOf18(s, o); if (p) out.add(p.isPlayer ? 'player' : `p:${p.id}`); }
  if (opinionOf(s, A) < -25 || (A.startsWith('l:') && (s.rivalries[leaders(s).L[A.slice(2)]?.label ?? ''] ?? 0) > 30)) out.add('player');
  // inveja: alguém da mesma cena um pouco acima
  if (a && r.chance(0.5)) {
    const up = Object.values(s.acts).filter((b) => live(b) && b.id !== a.id && familyOf(b.genre) === familyOf(a.genre) && b.fame > a.fame && b.fame < a.fame + 25).slice(0, 12);
    const b = up.length ? r.pick(up) : undefined; const p = leadOf18(s, b);
    if (p) out.add(p.isPlayer ? 'player' : `p:${p.id}`);
  }
  const inc = ag18(s).inc[A];
  if (inc && inc.until > s.week) out.add(inc.t);
  out.delete(A);
  return [...out].filter((k) => alive(s, k) && !shielded(s, k) && !(A.startsWith('p:') && k === A));
}

export interface Plan18 { A: string; T: string; v: Verb18; g: number; aff: number }
/** Escolha pura (dado um Rng): o que A faria com T. */
export function choose18(s: GameState, A: string, T: string, r: Rng): Plan18 | null {
  const g = grudge18(s, A, T);
  const aff = Math.max(0, relOf18(s, A, T)) / 100;
  const opts = VERBS18.filter((v) => !(v.harm && g < 0.15)).map((v) => [v, (v.ok && !v.ok(s, A, T)) ? 0 : Math.max(0, v.w(s, A, T, g, aff))] as [Verb18, number]).filter((x) => x[1] > 0.02);
  if (!opts.length) return null;
  const v = r.weighted(opts, (x) => x[1])![0];
  return { A, T, v, g, aff };
}

/** Executa uma iniciativa (de qualquer um contra qualquer um). Contra você: vira mensagem com respostas. */
export function act18(s: GameState, p: Plan18, r: Rng): Ag18Log | null {
  const { A, T, v } = p;
  if (shielded(s, A) || shielded(s, T) || !alive(s, A) || !alive(s, T)) return null;
  if (v.ok && !v.ok(s, A, T)) return null;
  const st = ag18(s);
  const res = v.run(s, A, T, r);
  const mine = playerSide18(s, T) || playerSide18(s, A);
  const row: Ag18Log = { w: s.week, y: s.year, m: s.month, a: A, t: T, v: v.id, ok: res.ok, txt: res.t, ...(mine ? { mine: 1 as const } : {}) };
  st.log.unshift(row);
  if (st.log.length > 80) st.log.length = 80;
  st.cd[`${A}>${T}`] = s.week + 26;
  st.n++;
  if (playerSide18(s, T) && v.harm) {
    pushInbox18(s, 'agency18', {
      from: N(s, A), subject: fmtL(l('{a}: {v}', '{a}: {v}'), { a: N(s, A), v: v.name }), body: res.t, tone: 'bad', ref: { A, T, v: v.id },
      actions: [
        { id: 'retort', label: l('Responder em público', 'Answer in public') },
        ...(v.id === 'sue' ? [{ id: 'settle', label: l('Fazer acordo', 'Settle') }] : []),
        ...(v.id === 'blackmail' ? [{ id: 'pay', label: l('Pagar para calar', 'Pay for silence') }] : []),
        { id: 'peace', label: l('Chamar para conversar', 'Invite for a talk') },
        { id: 'ignore', label: l('Ignorar', 'Ignore') },
      ],
    });
  } else if (playerSide18(s, A)) notify(s, fmtL(l('Por conta própria: {t}', 'On their own: {t}'), { t: res.t }), 'event');
  else if (playerSide18(s, T)) notify(s, res.t, 'event');
  return row;
}

export function agencyMonth18(s: GameState, r: Rng): Ag18Log[] {
  const st = ag18(s);
  const D = dir17(s);
  const n = Math.min(6, Math.round((1.6 + r.float(0, 1.6)) * D.world * phaseMult(s)));
  const pool = actors(s);
  const out: Ag18Log[] = [];
  const w = (k: string) => 0.2 + (temper18(s, k.startsWith('p:') ? s.persons[k.slice(2)] : undefined) || (F(s, k, 'ambicao') + F(s, k, 'impulsividade')) / 200) + hasOf(s, hid18(k)).filter((h) => h.kind === 'grievance' && h.status === 'open').length * 0.4 + ((st.inc[k]?.until ?? 0) > s.week ? 1 : 0);
  const ws = new Map(pool.map((k) => [k, w(k)] as const));
  for (let i = 0; i < n && pool.length; i++) {
    const A = r.weighted(pool, (k) => ws.get(k) ?? 0.2)!;
    const ts = targets(s, A, r).filter((T) => (st.cd[`${A}>${T}`] ?? 0) <= s.week);
    if (!ts.length) continue;
    const T = r.weighted(ts, (T) => 0.3 + grudge18(s, A, T) + Math.max(0, relOf18(s, A, T)) / 150)!;
    const p = choose18(s, A, T, r);
    if (!p) continue;
    // contra você: no máximo 1 iniciativa hostil por mês (machuca, mas não mata)
    if (p.v.harm && playerSide18(s, T) && out.some((x) => x.mine && VERBS18.find((v) => v.id === x.v)?.harm)) continue;
    const row = act18(s, p, r);
    if (row) out.push(row);
  }
  for (const [k, x] of Object.entries(st.inc)) if (x.until < s.week) delete st.inc[k];
  const ks = Object.keys(st.cd);
  if (ks.length > 800) for (const k of ks) if (st.cd[k] <= s.week) delete st.cd[k];
  return out;
}

/** Fase do Mestre (dm18 registra): clímax = mais iniciativas. */
let phaseMult: (s: GameState) => number = () => 1;
export const setAgencyPhase18 = (fn: (s: GameState) => number): void => { phaseMult = fn; };

registerSimHook('month', 'agency18', (s) => { agencyMonth18(s, Rng.fromSeed(`${s.config.seed}:ag18:${s.week}`)); });

// ---------------------------------------------------------------- respostas do jogador

registerInboxKind('agency18', {
  label: l('Ataque', 'Attack'), cat: 'people', icon: 'warning', prio: 2,
  goto: (_s, m) => (m.ref?.A ? { person: String(m.ref.A) } : null),
  handle: (s, m, action, r) => {
    const A = String(m.ref?.A ?? ''), T = String(m.ref?.T ?? 'player'), v = String(m.ref?.v ?? '');
    const nm = N(s, A);
    if (action === 'retort') {
      adjRel18(s, A, 'player', -10, l('Resposta pública', 'Public answer'));
      const a = actOfKey18(s, T), b = actOfKey18(s, A);
      if (a) addHype(s, `a:${a.id}`, 'ag18ret', l('Resposta à altura', 'A fitting reply'), 6);
      if (a && b) startFeud18(s, b.id, a.id, fmtL(l('Você respondeu {a} em público', 'You answered {a} in public'), { a: nm }), 14);
      emitFact(s, { kind: 'statement', actors: ['player', hid18(A)], severity: 30, visibility: 'public', tags: ['ag18', 'reply'], text: fmtL(l('{c} responde {a} à altura.', '{c} hits back at {a}.'), { c: s.config.companyName, a: nm }), src: 'agency18' });
      return fmtL(l('Você respondeu {a}: hype para o seu lado, mas a briga esquenta.', 'You answered {a}: hype for your side, but the fight heats up.'), { a: nm });
    }
    if (action === 'settle') { const c = money(s, 12000); post(s, `ag18settle:${A}`, -c, 'legal', 'Acordo judicial'); adjRel18(s, A, 'player', 10, l('Acordo', 'Settlement')); return l('Acordo fechado: caro, mas silencioso.', 'Settled: expensive, but quiet.'); }
    if (action === 'pay') { const c = money(s, 15000); post(s, `ag18pay:${A}`, -c, 'legal', 'Silêncio comprado'); grantHold(s, { holder: hid18(A), target: 'player', kind: 'blackmail', strength: 50, months: 60, src: 'agency18', text: l('Já pagou uma vez — pode pagar de novo', 'Paid once — may pay again'), quiet: true }); return l('Pago. O segredo fica guardado… por enquanto.', 'Paid. The secret stays buried… for now.'); }
    if (action === 'peace') {
      const p = clamp(0.35 + (F(s, A, 'empatia') - 50) / 150 + (opinionOf(s, A) + 50) / 300, 0.08, 0.85);
      if (r.chance(p)) { adjRel18(s, A, 'player', 25, l('Conversa franca', 'Frank talk')); voidHolds(s, (h) => h.kind === 'grievance' && h.holder === hid18(A) && h.target === 'player'); return fmtL(l('{a} aceita conversar: mágoa encerrada ({p}% de chance).', '{a} agrees to talk: grudge settled ({p}% chance).'), { a: nm, p: Math.round(p * 100) }); }
      adjRel18(s, A, 'player', -5, l('Recusou conversar', 'Refused to talk'));
      return fmtL(l('{a} não atende ({p}% de chance).', '{a} won\'t pick up ({p}% chance).'), { a: nm, p: Math.round(p * 100) });
    }
    if (v === 'blackmail') {
      const h = hasOf(s, hid18(A)).find((x) => x.kind === 'secret' && x.status === 'open' && x.target === 'player');
      if (h) { const u = useHold(s, h.id, 'expose'); const a = actOfKey18(s, T); if (a) scandal(s, a.id, 'conduct', 35, u.text, { tags: ['ag18'] }); return fmtL(l('Você ignorou — {a} cumpriu a ameaça: {x}', 'You ignored it — {a} followed through: {x}'), { a: nm, x: u.text }); }
    }
    if (v === 'sue') { const lose = r.chance(0.45); if (lose) { const c = money(s, 20000); post(s, `ag18lost:${A}`, -c, 'legal', 'Processo perdido'); return l('Você ignorou o processo e perdeu à revelia.', 'You ignored the suit and lost by default.'); } return l('O processo morreu na justiça.', 'The suit died in court.'); }
    return l('Você deixou passar. Às vezes o silêncio vence; às vezes parece fraqueza.', 'You let it go. Sometimes silence wins; sometimes it looks weak.');
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

export const _ag18 = { recentFacts, raiseVisibility, actors, targets };
export type { Feud18 };
