// Rodada 18 (item 3) — RIXAS DE RUA PARA QUALQUER UM. Uma escada de rivalidade entre dois atos (qualquer gênero,
// qualquer selo, reais ou fictícios) que sobe de farpas → diss track → guerra de faixas (fãs em guerra) →
// confronto → briga → tiros, com chances de esfriar a cada degrau (mediação de um amigo em comum, trégua, feat da
// paz, cansaço). Sobe com ego/impulsividade/coragem dos líderes, laço com gangue (crime17), fama e a fase de tensão
// do Mestre (dm18); desce com empatia/disciplina, idade e mediação. Consequências usam os sistemas existentes:
// embalo/hype e vendas, imprensa (Fatos → boatos), fãs (núcleo × casual), estresse, escândalo, prisão (crime17:
// assault/feedCase) e morte (dynasty.personDies). HISTÓRIA ALTERNATIVA: em todos os modos menos "Vida real exata",
// pessoas reais entram na escada; no modo exato, ninguém real é tocado (shield18).

import { clamp, Rng } from '../../core/rng';
import { familyOf, l, type L } from '../../data/world';
import { personDies } from '../dynasty';
import { registerExt4, registerSimHook } from '../ext4';
import { emitFact, onFact, type Fact } from '../facts17';
import { histMode } from '../history15';
import { scandal } from '../scandal17';
import { addStress } from '../stress17';
import type { Act, GameState, Person } from '../types';
import { fmtL, money, notify, playerActs, post } from '../util';
import { a3Of, commitCrime, crime17, feedCase, isReal } from './crime17';
import { addHype } from './hype12';
import { leaders } from './leaders10';
import { per13 } from './persona13';

// ---------------------------------------------------------------- regras de história

/** História alternativa: todos os modos menos "Vida real exata". */
export const altHist18 = (s: GameState): boolean => histMode(s) !== 'strict';
/** Protegido: no modo exato, nada inventado/violento acontece com gente real (pessoa, ato, selo, empresário…). */
export function shield18(s: GameState, id: string): boolean {
  if (altHist18(s) || !id || id === 'player') return false;
  const k = id.startsWith('p:') ? id.slice(2) : id;
  if (s.acts[k]) return !!s.acts[k].catalogNo || s.acts[k].members.some((m) => isReal(s, m));
  if (id.startsWith('l:')) return !!leaders(s).L[id.slice(2)]?.real;
  return isReal(s, k);
}
export const ALT_NOTE18 = l('História alternativa: fora do modo "Vida real exata", qualquer personagem — real ou fictício — pode viver o que os sistemas permitem.', 'Alternate history: outside "Exact real life" mode, any character — real or fictional — can live whatever the systems allow.');

// ---------------------------------------------------------------- estado

export interface FeudStep { w: number; y: number; st: number; t: L }
export interface Feud18 {
  id: string;
  /** atos (a = quem começou) */
  a: string; b: string;
  /** calor 0..100 */
  h: number;
  /** degrau atual 0..5 */
  st: number;
  since: number; last: number;
  why: L;
  hist: FeudStep[];
  /** trégua até (semana) */
  truce?: number;
  /** encerrada (motivo) */
  end?: L;
  /** mortes / feridos / prisões */
  dead?: string[]; hurt?: number; jail?: number;
  /** o jogador já foi avisado do degrau */
  told?: number;
}
export interface Feud18State { f: Feud18[]; seq: number }
declare module '../ext4' { interface Ext4 { feud18: Feud18State } }
const fresh = (): Feud18State => ({ f: [], seq: 0 });
registerExt4('feud18', fresh);
export function feud18(s: GameState): Feud18State {
  const x = s.x4 as unknown as { feud18?: Feud18State };
  const st = (x.feud18 ??= fresh());
  st.f ??= [];
  return st;
}

export const STAGE18: { name: L; desc: L; at: number }[] = [
  { name: l('Farpas', 'Shade'), desc: l('Indiretas em entrevistas e redes.', 'Subtweets and interview jabs.'), at: 0 },
  { name: l('Diss track', 'Diss track'), desc: l('Faixa de ataque: hype e vendas para os dois.', 'An attack track: hype and sales for both.'), at: 18 },
  { name: l('Guerra de faixas', 'Track war'), desc: l('Respostas em série; os fãs entram em guerra.', 'Answer tracks; the fans go to war.'), at: 34 },
  { name: l('Confronto', 'Confrontation'), desc: l('Bate-boca em público, seguranças, escândalo.', 'A public face-off, security, scandal.'), at: 52 },
  { name: l('Briga', 'Fight'), desc: l('Agressão: feridos, polícia, processo.', 'Assault: injuries, police, charges.'), at: 68 },
  { name: l('Tiros', 'Shots fired'), desc: l('Tiroteio: feridos ou mortos, prisões, luto.', 'A shooting: wounded or dead, arrests, mourning.'), at: 84 },
];
const STAGE_AT = STAGE18.map((x) => x.at);
export const stageOfHeat = (h: number): number => STAGE_AT.reduce((k, at, i) => (h >= at ? i : k), 0);

const live = (a?: Act): a is Act => !!a && a.status !== 'retired' && a.status !== 'split';
const isMineAct = (s: GameState, a?: Act): boolean => !!a && (a.owner === 'player' || !!a.playerBand || playerActs(s).includes(a.id));
export const STREET18 = (g: string): boolean => familyOf(g) === 'hiphop' || ['funk_carioca', 'corridos_tumbados', 'norteno', 'dancehall', 'reggaeton', 'gfunk', 'drill', 'trap'].includes(g);
export const leadOf18 = (s: GameState, a?: Act): Person | undefined => {
  if (!a) return undefined;
  const ms = a.members.map((m) => s.persons[m]).filter((p): p is Person => !!p?.alive);
  return ms.find((p) => p.id === a.leaderId && !p.isPlayer) ?? ms.find((p) => !p.isPlayer) ?? ms[0];
};
const fct = (s: GameState, p: Person | undefined, f: string): number => (p ? ((per13(s, `p:${p.id}`)?.facets as Record<string, number> | undefined)?.[f] ?? 50) : 50);
/** Temperamento 0..1 (ego, impulsividade, coragem, vaidade contra empatia, disciplina). */
export function temper18(s: GameState, p?: Person): number {
  return clamp((fct(s, p, 'ego') + fct(s, p, 'impulsividade') + fct(s, p, 'coragem') + fct(s, p, 'vaidade') + (100 - fct(s, p, 'empatia')) + (100 - fct(s, p, 'disciplina'))) / 600, 0, 1);
}
const age = (s: GameState, p?: Person): number => (p?.born ? s.year - p.born : 30);
export const feudKey18 = (a: string, b: string): string => (a < b ? `${a}|${b}` : `${b}|${a}`);
export const feudOf18 = (s: GameState, a: string, b: string): Feud18 | undefined => feud18(s).f.find((f) => !f.end && feudKey18(f.a, f.b) === feudKey18(a, b));
export const feudsOf18 = (s: GameState, actId: string): Feud18[] => feud18(s).f.filter((f) => !f.end && (f.a === actId || f.b === actId));
export const activeFeuds18 = (s: GameState): Feud18[] => feud18(s).f.filter((f) => !f.end);
const both = (s: GameState, f: Feud18): string => `${s.acts[f.a]?.name ?? '?'} × ${s.acts[f.b]?.name ?? '?'}`;
/** Pode haver violência (degraus 3+)? Nunca com gente protegida (modo exato). */
export function violentOk18(s: GameState, f: Feud18): boolean {
  return ![f.a, f.b].some((id) => shield18(s, id));
}
/** Teto da escada: atos fora da rua só chegam a tiros com laço de gangue; protegidos não entram. */
export function cap18(s: GameState, f: Feud18): number {
  const A = s.acts[f.a], B = s.acts[f.b];
  if (!A || !B || !violentOk18(s, f)) return 0;
  const tied = !!crime17(s).ties[f.a] || !!crime17(s).ties[f.b];
  const street = STREET18(A.genre) || STREET18(B.genre);
  return tied || street ? 5 : 4;
}

/** Ganho de tensão por fase do Mestre (dm18 registra; padrão neutro). */
let dmMult: (s: GameState) => number = () => 1;
export const setFeudPhase18 = (fn: (s: GameState) => number): void => { dmMult = fn; };

// ---------------------------------------------------------------- começar / mexer

/** Abre (ou esquenta) uma rixa entre dois atos. Respeita o modo exato. */
export function startFeud18(s: GameState, aId: string, bId: string, why: L, heat = 10): Feud18 | null {
  const A = s.acts[aId], B = s.acts[bId];
  if (!live(A) || !live(B) || aId === bId || shield18(s, aId) || shield18(s, bId)) return null;
  const cur = feudOf18(s, aId, bId);
  if (cur) { heatFeud18(s, cur, heat * 0.6, why); return cur; }
  const st = feud18(s);
  if (activeFeuds18(s).length >= 14) return null;
  const f: Feud18 = { id: `fd${++st.seq}`, a: aId, b: bId, h: clamp(heat, 0, 40), st: 0, since: s.week, last: s.week, why, hist: [] };
  f.st = stageOfHeat(f.h);
  f.hist.push({ w: s.week, y: s.year, st: f.st, t: why });
  st.f.push(f);
  if (st.f.length > 60) st.f.splice(0, st.f.length - 60);
  return f;
}
export function heatFeud18(s: GameState, f: Feud18, d: number, why?: L): void {
  f.h = clamp(f.h + d, 0, 100);
  f.last = s.week;
  if (why && f.hist.length < 40) f.hist.push({ w: s.week, y: s.year, st: f.st, t: why });
}
export function endFeud18(s: GameState, f: Feud18, why: L): void {
  f.end = why;
  f.hist.push({ w: s.week, y: s.year, st: f.st, t: why });
  emitFact(s, { kind: 'feud_end', actors: [f.a, f.b], place: s.acts[f.a]?.city, severity: 30, visibility: 'public', tags: ['feud', 'feud18', 'good'], text: fmtL(l('Fim da rixa {x}: {w}', 'The {x} feud is over: {w}'), { x: both(s, f), w: why }), src: 'feud18' });
}

// ---------------------------------------------------------------- degraus

function fx(s: GameState, f: Feud18, st: number, r: Rng): L {
  const A = s.acts[f.a]!, B = s.acts[f.b]!;
  const [atk, vic] = r.chance(0.5 + (temper18(s, leadOf18(s, A)) - temper18(s, leadOf18(s, B))) * 0.6) ? [A, B] : [B, A];
  const pa = leadOf18(s, atk), pv = leadOf18(s, vic);
  const x = both(s, f);
  const place = vic.city;
  const fact = (kind: string, sev: number, tags: string[], text: L): Fact => emitFact(s, { kind, actors: [atk.id, vic.id, ...(pa ? [pa.id] : []), ...(pv ? [pv.id] : [])], place, severity: sev, visibility: 'public', tags: ['feud', 'feud18', ...tags], text, src: 'feud18', data: { feud: f.id, st } });
  if (pa && pv) { pa.rel[pv.id] = clamp((pa.rel[pv.id] ?? 0) - 12 - st * 4, -100, 100); pv.rel[pa.id] = clamp((pv.rel[pa.id] ?? 0) - 12 - st * 4, -100, 100); }
  switch (st) {
    case 1: {
      for (const a of [atk, vic]) { a.momentum = clamp(a.momentum + (a === atk ? 7 : 5), 0, 100); addHype(s, `a:${a.id}`, 'feud18', l('Rixa: diss track', 'Feud: diss track'), a === atk ? 10 : 7); }
      const t = fmtL(l('{a} solta uma diss track contra {b}. Todo mundo ouve: embalo e hype para os dois.', '{a} drops a diss track on {b}. Everyone listens: momentum and hype for both.'), { a: atk.name, b: vic.name });
      fact('feud', 45, ['diss'], t);
      return t;
    }
    case 2: {
      for (const a of [atk, vic]) {
        const mv = Math.round(a.fans.casual * 0.04);
        a.fans.casual -= mv; a.fans.core += Math.round(mv * 0.5);
        addHype(s, `a:${a.id}`, 'feud18w', l('Guerra de fãs', 'Fan war'), 6);
      }
      if (pa) addStress(s, pa.id, 8, l('Guerra de faixas', 'Track war')); if (pv) addStress(s, pv.id, 10, l('Guerra de faixas', 'Track war'));
      const t = fmtL(l('Guerra de faixas {x}: respostas em série, fãs brigando nas ruas e nas redes — o núcleo de fãs cresce, o público casual cansa.', 'Track war {x}: answer after answer, fans fighting in the streets and online — core fans grow, casual listeners tire.'), { x });
      fact('fan_war', 50, ['fans'], t);
      return t;
    }
    case 3: {
      const t = fmtL(l('{a} e {b} se encontram num evento: empurra-empurra, seguranças, manchetes.', '{a} and {b} meet at an event: shoving, security, headlines.'), { a: atk.name, b: vic.name });
      scandal(s, atk.id, 'conduct', 40, t, { person: pa?.id, place, tags: ['feud18'] });
      if (pa) addStress(s, pa.id, 10, l('Confronto público', 'Public confrontation')); if (pv) addStress(s, pv.id, 12, l('Confronto público', 'Public confrontation'));
      return t;
    }
    case 4: {
      if (!pa || !pv) return l('A briga não chega a acontecer.', 'The fight never happens.');
      const out = commitCrime(s, 'assault', { actor: pa.id, target: pv.id, partners: [], org: crime17(s).ties[atk.id] }, r);
      const ok = typeof out === 'object' && 'ok' in out ? (out as { ok: boolean }).ok : true;
      f.hurt = (f.hurt ?? 0) + 1;
      if (pv.health === 'ok') pv.health = 'recovering';
      addStress(s, pv.id, 18, l('Agredido(a) numa rixa', 'Assaulted in a feud'));
      const t = fmtL(l('Briga de verdade: o grupo de {a} cerca {p} na saída de um show. {p} vai ao hospital; a polícia abre inquérito{j}.', 'A real fight: {a}\'s crew corners {p} outside a show. {p} goes to hospital; police open an inquiry{j}.'), { a: atk.name, p: pv.name, j: ok ? '' : l(' — e o agressor apanhou também', ' — and the attacker got hurt too') });
      scandal(s, atk.id, 'violence', 55, t, { person: pa.id, place, tags: ['feud18'] });
      if (r.chance(0.45)) { feedCase(s, pa.id, a3Of(s, place), 45, 55, false); f.jail = (f.jail ?? 0) + 1; }
      for (const a of [atk, vic]) a.momentum = clamp(a.momentum + 4, 0, 100);
      return t;
    }
    case 5: {
      if (!pa || !pv) return l('O tiroteio não acontece.', 'The shooting never happens.');
      const roll = r.float();
      const fame = (atk.fame + vic.fame) / 2;
      const killP = 0.18 + (crime17(s).ties[atk.id] ? 0.12 : 0) + (temper18(s, pa) - 0.5) * 0.2;
      let t: L;
      feedCase(s, pa.id, a3Of(s, place), 60, 85, !!crime17(s).ties[atk.id]);
      f.jail = (f.jail ?? 0) + 1;
      if (roll < killP) {
        const died = fmtL(l('baleado(a) na rixa com {a}', 'shot in the feud with {a}'), { a: atk.name });
        personDies(s, pv, died);
        (f.dead ??= []).push(pv.id);
        vic.momentum = clamp(vic.momentum + 20, 0, 100);
        addHype(s, `a:${vic.id}`, 'feud18d', l('Comoção: vendas disparam', 'Grief: sales spike'), 25);
        t = fmtL(l('Tiros: {p} ({v}) morre baleado(a). {a} é apontado(a); o país chora, e os discos de {v} voltam às paradas.', 'Shots fired: {p} ({v}) is shot dead. {a} is blamed; the country mourns, and {v}\'s records return to the charts.'), { p: pv.name, v: vic.name, a: atk.name });
        fact('death', 95, ['crime', 'bad', 'violence', 'murder'], t);
        scandal(s, atk.id, 'crime', 80, t, { person: pa.id, place, tags: ['feud18'] });
        atk.momentum = clamp(atk.momentum - 15 + fame / 10, 0, 100);
      } else {
        f.hurt = (f.hurt ?? 0) + 1;
        pv.health = 'recovering';
        addStress(s, pv.id, 30, l('Sobreviveu a um tiroteio', 'Survived a shooting'));
        vic.hiatusUntil = Math.max(vic.hiatusUntil ?? 0, s.week + 8);
        t = fmtL(l('Tiros contra o carro de {p} ({v}). Sobrevive ferido(a); {a} é suspeito(a). Shows cancelados por dois meses.', 'Shots at {p}\'s car ({v}). Survives wounded; {a} is a suspect. Shows cancelled for two months.'), { p: pv.name, v: vic.name, a: atk.name });
        fact('shooting', 85, ['crime', 'bad', 'violence'], t);
        scandal(s, atk.id, 'violence', 70, t, { person: pa.id, place, tags: ['feud18'] });
      }
      f.h = 40; // depois do sangue, o choque esfria
      return t;
    }
    default: return l('Farpas em entrevistas.', 'Jabs in interviews.');
  }
}

/** Mediador natural: alguém (vivo, fora da rixa) com boa relação com os dois líderes. */
export function mediator18(s: GameState, f: Feud18): Person | undefined {
  const pa = leadOf18(s, s.acts[f.a]), pb = leadOf18(s, s.acts[f.b]);
  if (!pa || !pb) return undefined;
  let best: Person | undefined, bv = 25;
  for (const [id, v] of Object.entries(pa.rel)) {
    const p = s.persons[id];
    if (!p?.alive || p.isPlayer || id === pb.id || shield18(s, id)) continue;
    const w = Math.min(v, pb.rel[id] ?? p.rel[pb.id] ?? 0);
    if (w > bv) { bv = w; best = p; }
  }
  return best;
}

/** Tentativas de esfriar: chance com o porquê (mostrada ao jogador quando o ato é dele). */
export function cool18(s: GameState, f: Feud18, how: 'mediate' | 'truce' | 'collab'): { p: number; why: L[]; cost: number } {
  const pa = leadOf18(s, s.acts[f.a]), pb = leadOf18(s, s.acts[f.b]);
  const emp = (fct(s, pa, 'empatia') + fct(s, pb, 'empatia')) / 200;
  const tmp = (temper18(s, pa) + temper18(s, pb)) / 2;
  const why: L[] = [];
  let p = how === 'mediate' ? 0.45 : how === 'truce' ? 0.35 : 0.3;
  why.push(fmtL(l('Base {v}%', 'Base {v}%'), { v: Math.round(p * 100) }));
  const de = (emp - 0.5) * 0.6; p += de; why.push(fmtL(l('Empatia dos líderes {v}', 'Leaders\' empathy {v}'), { v: `${de >= 0 ? '+' : ''}${Math.round(de * 100)}%` }));
  const dt = -(tmp - 0.5) * 0.5; p += dt; why.push(fmtL(l('Temperamento {v}', 'Temper {v}'), { v: `${dt >= 0 ? '+' : ''}${Math.round(dt * 100)}%` }));
  const dh = -f.st * 0.05; p += dh; if (dh) why.push(fmtL(l('Degrau {n}: {v}', 'Stage {n}: {v}'), { n: f.st, v: `${Math.round(dh * 100)}%` }));
  if (f.dead?.length) { p -= 0.2; why.push(l('Houve morte: −20%', 'Someone died: −20%')); }
  if (how === 'mediate' && mediator18(s, f)) { p += 0.15; why.push(fmtL(l('Amigo em comum ({n}) +15%', 'Mutual friend ({n}) +15%'), { n: mediator18(s, f)!.name })); }
  if (how === 'collab') { const fa = s.acts[f.a]?.fame ?? 0, fb = s.acts[f.b]?.fame ?? 0; const d = -Math.abs(fa - fb) / 200; p += d; why.push(fmtL(l('Diferença de fama {v}', 'Fame gap {v}'), { v: `${Math.round(d * 100)}%` })); }
  const cost = money(s, how === 'mediate' ? 6000 : how === 'truce' ? 12000 : 20000);
  return { p: clamp(p, 0.05, 0.9), why, cost };
}

/** Jogador (ou NPC) tenta esfriar. */
export function tryCool18(s: GameState, f: Feud18, how: 'mediate' | 'truce' | 'collab', payer: 'player' | 'npc', r: Rng): { ok: boolean; text: L } {
  const o = cool18(s, f, how);
  if (payer === 'player') {
    if (s.player.cash < o.cost) return { ok: false, text: l('Caixa insuficiente.', 'Not enough cash.') };
    post(s, `feud18:${how}:${f.id}`, -o.cost, how === 'collab' ? 'recording' : 'legal', `Rixa: ${how}`);
  }
  const ok = r.chance(o.p);
  const x = both(s, f);
  if (!ok) { heatFeud18(s, f, 6, l('Tentativa de paz fracassou — e virou piada.', 'A peace attempt failed — and became a joke.')); return { ok, text: fmtL(l('Não deu: {x} seguem em guerra (+6 de calor).', 'No luck: {x} remain at war (+6 heat).'), { x }) }; }
  if (how === 'collab') {
    for (const id of [f.a, f.b]) { const a = s.acts[id]; if (a) { a.momentum = clamp(a.momentum + 10, 0, 100); addHype(s, `a:${a.id}`, 'feud18c', l('Feat da paz', 'Peace feat'), 14); } }
    endFeud18(s, f, l('feat da paz — a faixa juntos vira evento.', 'a peace feat — the track together becomes an event.'));
    return { ok, text: fmtL(l('{x} gravam juntos: fim da rixa e hype enorme para os dois.', '{x} record together: feud over and huge hype for both.'), { x }) };
  }
  if (how === 'truce') { f.truce = s.week + 52; heatFeud18(s, f, -45, l('Trégua num território neutro.', 'A truce on neutral ground.')); f.st = Math.min(f.st, stageOfHeat(f.h)); return { ok, text: fmtL(l('Trégua: {x} param por um ano (−45 de calor).', 'Truce: {x} stand down for a year (−45 heat).'), { x }) }; }
  heatFeud18(s, f, -30, l('Mediação: conversa a portas fechadas.', 'Mediation: a talk behind closed doors.'));
  f.st = Math.min(f.st, stageOfHeat(f.h));
  if (f.h < 8) endFeud18(s, f, l('mediação bem-sucedida.', 'successful mediation.'));
  return { ok, text: fmtL(l('Mediação: {x} baixam o tom (−30 de calor).', 'Mediation: {x} tone it down (−30 heat).'), { x }) };
}

// ---------------------------------------------------------------- mês

export function feudMonth18(s: GameState, r: Rng): void {
  const st = feud18(s);
  const M = dmMult(s);
  for (const f of activeFeuds18(s)) {
    const A = s.acts[f.a], B = s.acts[f.b];
    if (!live(A) || !live(B)) { endFeud18(s, f, l('um dos lados saiu de cena.', 'one side left the scene.')); continue; }
    if (shield18(s, f.a) || shield18(s, f.b)) { endFeud18(s, f, l('a vida real seguiu outro roteiro.', 'real life followed another script.')); continue; }
    const pa = leadOf18(s, A), pb = leadOf18(s, B);
    const tmp = (temper18(s, pa) + temper18(s, pb)) / 2;
    const tie = (crime17(s).ties[f.a] ? 3 : 0) + (crime17(s).ties[f.b] ? 3 : 0);
    const old = Math.max(0, (age(s, pa) + age(s, pb)) / 2 - 35) * 0.12;
    const fame = (A.fame + B.fame) / 80;
    let d = (r.float(-3, 5) + (tmp - 0.5) * 12 + tie + fame - old) * M;
    if (f.truce && f.truce > s.week) d = Math.min(d, -1.5);
    if (s.week - f.last > 26) d -= 3; // esquecimento
    const before = f.h;
    f.h = clamp(f.h + d, 0, 100);
    // NPCs tentam esfriar sozinhos (empatia, amigo em comum)
    if (!isMineAct(s, A) && !isMineAct(s, B) && f.st >= 2 && r.chance(0.08 + (1 - tmp) * 0.12)) {
      const how = mediator18(s, f) ? 'mediate' : r.chance(0.3) ? 'collab' : 'truce';
      tryCool18(s, f, how, 'npc', r);
      if (f.end) continue;
    }
    if (f.h < 4 && before < 4 && s.week - f.since > 26) { endFeud18(s, f, l('o assunto morreu.', 'the subject died out.')); continue; }
    const cap = cap18(s, f);
    const want = Math.min(stageOfHeat(f.h), cap > 0 ? cap : 2);
    if (want > f.st) {
      f.st++; // um degrau por mês
      const t = fx(s, f, f.st, r);
      f.hist.push({ w: s.week, y: s.year, st: f.st, t });
      if ((isMineAct(s, A) || isMineAct(s, B)) && (f.told ?? -1) < f.st) {
        f.told = f.st;
        notify(s, fmtL(l('Rixa {x} subiu para "{n}": {t}', 'Feud {x} rose to "{n}": {t}'), { x: both(s, f), n: STAGE18[f.st].name, t }), 'event');
        onMine?.(s, f, t);
      }
    } else if (stageOfHeat(f.h) < f.st - 1) f.st--;
  }
  // arquivo enxuto
  if (st.f.length > 60) st.f = st.f.filter((f) => !f.end || s.week - f.last < 520).slice(-60);
}

/** Gancho para o Mestre/inbox quando a rixa é sua (registrado por agency18). */
let onMine: ((s: GameState, f: Feud18, t: L) => void) | undefined;
export const setFeudMine18 = (fn: (s: GameState, f: Feud18, t: L) => void): void => { onMine = fn; };

// ---------------------------------------------------------------- semeadura

/** Rixas nascem de faíscas do mundo: provocações (npc17), rixas de rua (crime17), aliciamento e paradas. */
function seed(s: GameState, f: Fact): void {
  const acts = f.actors.filter((id) => live(s.acts[id]));
  if (acts.length < 2) return;
  const [a, b] = acts;
  const beef = f.tags.includes('beef') || f.tags.includes('feud') || f.kind === 'feud';
  if (!beef || f.src === 'feud18') return;
  startFeud18(s, a, b, f.text, f.kind === 'feud' ? 20 : 12);
}
onFact('statement', seed, 'feud18:statement');
onFact('feud', seed, 'feud18:feud');

/** O mundo gera faíscas: atos da mesma cena (família de gênero, cidade/país), fama parecida, temperamentos quentes. */
function spark(s: GameState, r: Rng): void {
  if (activeFeuds18(s).length >= 8 || !r.chance(0.22 * dmMult(s))) return;
  const pool = Object.values(s.acts).filter((a) => live(a) && a.fame >= 15 && !shield18(s, a.id)).sort((x, y) => y.fame - x.fame).slice(0, 80);
  const hot = pool.filter((a) => temper18(s, leadOf18(s, a)) > 0.56 && !feudsOf18(s, a.id).length);
  if (!hot.length) return;
  const A = r.pick(hot);
  const fam = familyOf(A.genre);
  const B = pool.filter((b) => b !== A && b.owner !== A.owner && familyOf(b.genre) === fam && Math.abs(b.fame - A.fame) < 25 && !feudOf18(s, A.id, b.id))
    .sort((x, y) => (x.city === A.city ? -1 : 0) - (y.city === A.city ? -1 : 0) || y.fame - x.fame)[0];
  if (!B) return;
  const why = fmtL(l('{a} provoca {b}: mesma cena, mesmo trono.', '{a} provokes {b}: same scene, same throne.'), { a: A.name, b: B.name });
  const f = startFeud18(s, A.id, B.id, why, 8 + temper18(s, leadOf18(s, A)) * 10);
  if (f) emitFact(s, { kind: 'feud_start', actors: [A.id, B.id], place: A.city, severity: 30, visibility: 'public', tags: ['feud', 'feud18'], text: why, src: 'feud18' });
}

registerSimHook('month', 'feud18', (s) => {
  const r = Rng.fromSeed(`${s.config.seed}:feud18:${s.week}`);
  spark(s, r);
  feudMonth18(s, r);
});
