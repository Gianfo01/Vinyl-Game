// R31 · onda 5 (ELENCO) — MODELO PURO das telas do elenco no jogo explorável (EXP-7), sem DOM:
//  - mural de cortiça (polaroids do seu elenco com os selos de estado do mês);
//  - quadro de planejamento (linhas = artistas, colunas = meses ou semanas; cartões = gravação, lançamento, turnê,
//    divulgação, descanso; conflito em vermelho);
//  - agenda de couro (bolinhas do mês como horários, compromissos do calendário único com "ir até lá", carreiras e
//    delegação);
//  - fichário de contatos (todos os artistas que você conhece, gavetas por letra/gênero/país, filtros e comparar);
//  - contratação (classificados, recepção, telefone) e chefe de gabinete.
// Fonte única: nada é calculado de novo. Cada número vem da função de hoje (actStatus/alerts20, calendar19, s.plans,
// agenda do mês, pendingReleases, knownArtists27, agenda17). Explorar não muda o mundo: tudo aqui só lê (teste em
// tests/r31-elenco5.test.ts compara o estado antes e depois).

import { l, type L } from '../../data/world';
import { agendaById } from '../../data/people';
import { calendar19, weekOfMonth19, type CalKind19, type Deadline19 } from '../../sim/calendar19';
import { monthIndex, monthLabel } from '../../sim/capacity';
import { slotWeek } from '../../sim/agenda';
import { actStatus } from '../../sim/sys/hq8';
import { knownArtists27, type KnownAct27 } from '../../sim/sys/knownacts27';
import { INV_NAME, ag17, balls, careerBalls, chiefCands, crewsNow, freelancers, FL, headCands, invOf, overbooked, staffCands, type FlKind, type Inv } from '../../sim/sys/agenda17';
import { careerDef, careers } from '../../sim/sys/careers12';
import type { Act, GameState } from '../../sim/types';
import { fmtL, playerActs } from '../../sim/util';
import { alerts20, baseAgenda20 } from '../actions20';
import { goalNow19, goalText19, type Ux19State } from '../../sim/sys/ux19';
import { goalProgress31, type My31 } from '../../sim/r31/mine';
import type { Story } from '../../sim/sys/media17';
import { monthOfWeek31 } from '../../sim/sys/auction31';

const N = (pt: string, en: string): L => l(pt, en);

// ================================================================ mural de cortiça

/** Selos de estado (os mesmos do mock aprovado). */
export type Stamp5 = 'rec' | 'tour' | 'rest' | 'crisis' | 'expiring' | 'release' | 'new' | 'health';
export const STAMP5: Record<Stamp5, { label: L; tone: 'blue' | 'orange' | 'green' | 'red' | 'gold' | 'teal' | 'purple' }> = {
  rec: { label: N('Gravando', 'Recording'), tone: 'blue' },
  tour: { label: N('Turnê', 'Touring'), tone: 'orange' },
  rest: { label: N('Descanso', 'Resting'), tone: 'green' },
  crisis: { label: N('Em crise', 'In crisis'), tone: 'red' },
  expiring: { label: N('Contrato vencendo', 'Contract ending'), tone: 'red' },
  release: { label: N('Lançamento', 'Release'), tone: 'gold' },
  new: { label: N('Nova', 'New'), tone: 'teal' },
  health: { label: N('Saúde ruim', 'Poor health'), tone: 'purple' },
};
/** Onde o artista aparece na sede neste mês (o que se vê na cena segue a agenda). */
export type Where5 = 'studio' | 'away' | 'lounge' | 'ar';
export const WHERE5: Record<Where5, L> = { studio: N('no estúdio', 'in the studio'), away: N('fora (turnê)', 'away (touring)'), lounge: N('no lounge', 'in the lounge'), ar: N('no A&R', 'at A&R') };

export interface Polaroid5 {
  id: string;
  name: string;
  genre: string;
  fame: number;
  /** moral (confiança no selo) 0..100 — barra verde */
  moral: number;
  /** energia (100 − cansaço do integrante mais cansado) — barra amarela */
  energy: number;
  stamps: Stamp5[];
  /** texto do selo de contrato ("vence em N sem.") */
  contractLeft?: number;
  where: Where5;
  /** líder (retrato) */
  face?: string;
  /** alerta mais grave (dica) */
  alert?: L;
}

const weeksLeft = (s: GameState, a: Act): number | undefined => {
  const c = a.contractId ? s.contracts[a.contractId] : undefined;
  return c && !a.playerBand && c.endWeek >= s.week ? c.endWeek - s.week : undefined;
};
/** Agenda deste mês (a mesma que a tela de artistas edita; delegada = a sugestão da equipe). */
function monthSlots(s: GameState, a: Act): string[] {
  try { return baseAgenda20(s, a).map((x) => x.action); } catch { return []; }
}
/** Turnê/festa com data agora (calendário único). */
function onTour(s: GameState, a: Act, cal: Deadline19[]): boolean {
  return cal.some((d) => d.goto?.act === a.id && (d.kind === 'tour' || d.kind === 'festival') && (d.w0 ?? d.w) <= s.week + 1);
}

/** Polaroids do seu elenco (ordem de hoje: a do elenco). */
export function mural5(s: GameState): Polaroid5[] {
  let cal: Deadline19[] = [];
  try { cal = calendar19(s, { weeks: 6 }); } catch { cal = []; }
  return playerActs(s).map((id) => s.acts[id]).filter((a): a is Act => !!a && a.status !== 'retired' && a.status !== 'split').map((a) => {
    const st = actStatus(s, a);
    const slots = monthSlots(s, a);
    const ms = a.members.map((m) => s.persons[m]).filter((p) => p?.alive);
    const fat = ms.length ? Math.max(...ms.map((p) => p.fatigue ?? 0)) : 0;
    const sick = ms.some((p) => p.health && p.health !== 'ok' && p.health !== 'recovering');
    const sess = s.sessions.some((x) => x.actId === a.id && !x.done);
    const left = weeksLeft(s, a);
    const c = a.contractId ? s.contracts[a.contractId] : undefined;
    const pr = s.pendingReleases.find((p) => p.actId === a.id);
    const stamps: Stamp5[] = [];
    if (sess || slots.includes('record')) stamps.push('rec');
    if (onTour(s, a, cal) || slots.includes('gigs')) stamps.push('tour');
    if (a.status === 'hiatus' || slots.includes('rest')) stamps.push('rest');
    if (st.attention.includes('crisis') || st.attention.includes('tired')) stamps.push('crisis');
    if (sick) stamps.push('health');
    if (st.attention.includes('contract')) stamps.push('expiring');
    if (pr && pr.week - s.week <= 4) stamps.push('release');
    if (c && s.week - (c.startWeek ?? -99) <= 8 && !a.playerBand) stamps.push('new');
    const where: Where5 = stamps.includes('tour') ? 'away' : stamps.includes('rec') ? 'studio' : stamps.includes('rest') || stamps.includes('health') ? 'lounge' : 'ar';
    let alert: L | undefined;
    try { alert = alerts20(s, a)[0]?.text; } catch { alert = undefined; }
    return { id: a.id, name: a.name, genre: a.genre, fame: Math.round(a.fame), moral: Math.round(a.trust), energy: Math.max(0, Math.round(100 - fat)), stamps, contractLeft: stamps.includes('expiring') ? left : undefined, where, face: a.members[0], alert };
  });
}

/** O que enche o mural além das polaroids (POL5, pedido do dono: "nada de área morta"): metas abertas, próximos passos
 *  do elenco e da empresa (calendário único) e recortes de jornal sobre o selo. Só leitura: lê o estado sem criar gavetas. */
export interface MuralExtra5 {
  goals: { t: L; pct: number }[];
  next: { t: L; d?: L; w: number; deadline: Deadline19 }[];
  clips: { t: L; y: number; m: number }[];
  /** recorte de fundação (quando a imprensa ainda não falou do selo) */
  founded: { name: string; city: string; year: number };
}
export function muralExtra5(s: GameState): MuralExtra5 {
  const x4 = s.x4 as unknown as { ux19?: Ux19State; my31?: My31; media17?: { st?: Story[] } };
  const goals: MuralExtra5['goals'] = [];
  for (const g of x4.ux19?.goals ?? []) {
    if (g.done || g.fail) continue;
    let pct = 0;
    try { pct = Math.max(0, Math.min(100, Math.round((goalNow19(s, g) / Math.max(1, g.spec.n)) * 100))); } catch { pct = 0; }
    goals.push({ t: goalText19(g), pct });
  }
  for (const g of x4.my31?.goals ?? []) { if (g.done || g.missed) continue; const p = goalProgress31(s, g); goals.push({ t: p.label, pct: p.pct }); }
  const mine = new Set(playerActs(s));
  let cal: Deadline19[] = [];
  try { cal = calendar19(s, { weeks: 8 }); } catch { cal = []; }
  const next = cal.filter((d) => d.w >= s.week && (!d.goto?.act || mine.has(d.goto.act)) && d.kind !== 'echo' && d.kind !== 'msg')
    .sort((a, b) => a.w - b.w).slice(0, 4).map((d) => ({ t: d.t, d: d.d, w: d.w, deadline: d }));
  const clips: (MuralExtra5['clips'][number] & { w: number })[] = (x4.media17?.st ?? []).filter((x) => (x.a && mine.has(x.a)) || x.mine)
    .map((x) => ({ t: x.t, y: x.y, m: x.m, w: x.w }));
  // contratos assinados também viram recorte ("X assina com o selo"), com a data da assinatura
  const label = s.config.companyName || '';
  for (const id of mine) {
    const a = s.acts[id];
    const c = a?.contractId ? s.contracts[a.contractId] : undefined;
    if (!a || !c || a.playerBand || c.startWeek === undefined || c.startWeek > s.week) continue;
    const mi = monthOfWeek31(s, c.startWeek);
    clips.push({ t: l(`${a.name} assina com ${label || 'o selo'}`, `${a.name} signs with ${label || 'the label'}`), y: Math.floor(mi / 12), m: ((mi % 12) + 12) % 12, w: c.startWeek });
  }
  clips.sort((a, b) => b.w - a.w);
  return { goals: goals.slice(0, 3), next, clips: clips.slice(0, 4).map(({ t, y, m }) => ({ t, y, m })), founded: { name: s.config.companyName || '', city: s.config.homeCity ?? '', year: s.config.startYear } };
}

/** Abas do mural = abas de hoje da página Pessoas (Elenco é o mural; as outras mostram a página de hoje no papel). */
export const MURAL_TABS5: { id: string; label: L }[] = [
  { id: 'roster', label: N('Elenco', 'Roster') }, { id: 'health', label: N('Saúde', 'Health') }, { id: 'relations', label: N('Relações', 'Relations') },
  { id: 'secrets', label: N('Segredos', 'Secrets') }, { id: 'staff', label: N('Equipe', 'Staff') }, { id: 'feed', label: N('Cartas', 'Letters') },
];

// ================================================================ quadro de planejamento

export type Card5Kind = 'rec' | 'rel' | 'tour' | 'pro' | 'rest' | 'other';
export const CARD5: Record<Card5Kind, L> = {
  rec: N('Gravação', 'Recording'), rel: N('Lançamento', 'Release'), tour: N('Turnê', 'Tour'), pro: N('Divulgação', 'Promotion'), rest: N('Férias / descanso', 'Holiday / rest'), other: N('Outro', 'Other'),
};
export interface BoardCard5 {
  id: string;
  act: string;
  kind: Card5Kind;
  /** coluna inicial e final (índices, inclusive) */
  c0: number;
  c1: number;
  title: L;
  sub?: L;
  /** origem: um plano reservável (arrasta = movePlan), agenda do mês (arrasta = semana do slot), lançamento, prazo */
  src: 'plan' | 'slot' | 'release' | 'session' | 'cal';
  /** id do plano (src 'plan') ou índice do slot (src 'slot') */
  ref?: string | number;
  /** arrastável com as funções de hoje */
  movable: boolean;
  conflict?: boolean;
  /** resumo da agenda do mês (vista por mês): não entra na conta de conflito */
  summary?: boolean;
}
export interface Board5 {
  mode: 'months' | 'weeks';
  cols: { label: L; now: boolean; key: number }[];
  rows: { id: string; name: string; genre: string; face?: string }[];
  cards: BoardCard5[];
  conflicts: { act: string; col: number; text: L }[];
  /** semana absoluta em que começa o mês corrente (agenda do mês: semanas 1..4) */
  week0: number;
  /** linha da empresa e da equipe (POL5): prazos do calendário único sem artista (obras, dívidas, contratos, prêmios…) */
  firm: BoardCard5[];
}

const AG_KIND: Record<string, Card5Kind> = { record: 'rec', gigs: 'tour', opening: 'tour', interview: 'pro', feat: 'pro', networking: 'pro', reposition: 'pro', social: 'pro', rest: 'rest' };
const CAL_KIND: Partial<Record<CalKind19, Card5Kind>> = { release: 'rel', tour: 'tour', festival: 'tour', supply: 'rel' };
const agL = (id: string): L => agendaById[id]?.name ?? l(id, id);
const MONTHS = 12, WEEKS = 12;

/** Semana absoluta do começo do mês absoluto `mi` (ano*12+mês). */
const weekOfMi = (s: GameState, mi: number): number => weekOfMonth19(s, Math.floor(mi / 12), mi % 12);

/** O quadro: mesmos dados de hoje (planos reservados, agenda do mês, sessões, lançamentos programados e prazos com artista). */
export function board5(s: GameState, mode: 'months' | 'weeks' = 'months', onlyConflicts = false): Board5 {
  const m0 = monthIndex(s);
  const cols = mode === 'months'
    ? Array.from({ length: MONTHS }, (_, i) => ({ label: monthLabel(m0 + i), now: i === 0, key: m0 + i }))
    : Array.from({ length: WEEKS }, (_, i) => ({ label: fmtL(N('sem {n}', 'wk {n}'), { n: i + 1 }), now: i === 0, key: s.week + i }));
  const colOfWeek = (w: number): number => {
    if (mode === 'weeks') return w - s.week;
    for (let i = MONTHS - 1; i >= 0; i--) if (w >= weekOfMi(s, m0 + i)) return i;
    return -1;
  };
  const colOfMonth = (mi: number): number => (mode === 'months' ? mi - m0 : weekOfMi(s, mi) - s.week);
  const span = mode === 'months' ? MONTHS : WEEKS;
  const clip = (c: number) => Math.max(0, Math.min(span - 1, c));
  const inside = (c0: number, c1: number) => c1 >= 0 && c0 < span;
  const rows = playerActs(s).map((id) => s.acts[id]).filter((a): a is Act => !!a && a.status !== 'retired' && a.status !== 'split')
    .map((a) => ({ id: a.id, name: a.name, genre: a.genre, face: a.members[0] }));
  const ids = new Set(rows.map((r) => r.id));
  const cards: BoardCard5[] = [];
  const push = (c: BoardCard5) => { if (inside(c.c0, c.c1)) cards.push({ ...c, c0: clip(c.c0), c1: clip(c.c1) }); };
  // planos reservados (página de hoje: Planejamento › Planos; arrastar = movePlan, igual ao botão "→")
  for (const p of s.plans ?? []) {
    if (!ids.has(p.actId) || p.status === 'done' || p.status === 'cancelled') continue;
    const c0 = colOfMonth(p.startMonth), c1 = mode === 'months' ? c0 + Math.max(1, p.months) - 1 : colOfMonth(p.startMonth + Math.max(1, p.months)) - 1;
    push({ id: `plan:${p.id}`, act: p.actId, kind: AG_KIND[p.action] ?? 'other', c0, c1: Math.max(c0, c1), title: agL(p.action), sub: p.status === 'blocked' ? (p.reason ?? N('bloqueado', 'blocked')) : fmtL(N('{p}% da agenda', '{p}% of schedule'), { p: p.load }), src: 'plan', ref: p.id, movable: p.status === 'planned' || p.status === 'blocked' });
  }
  // agenda do mês (a mesma das ações de artista); semana = slotWeek. Na vista por mês vira UM cartão "agenda do mês".
  const wm = weekOfMi(s, m0);
  for (const r of rows) {
    const a = s.acts[r.id];
    let slots: ReturnType<typeof baseAgenda20> = [];
    try { slots = baseAgenda20(s, a); } catch { slots = []; }
    if (!slots.length) continue;
    const manual = s.delegated[a.id] === false;
    const who = manual ? N('você', 'you') : N('equipe', 'staff');
    if (mode === 'months') {
      const kinds = slots.map((x) => AG_KIND[x.action] ?? 'other');
      const kind = (['rec', 'tour', 'pro', 'rest'] as Card5Kind[]).find((k) => kinds.includes(k)) ?? 'other';
      push({ id: `slot:${a.id}`, act: a.id, kind, c0: 0, c1: 0, title: N('Agenda', 'Agenda'), sub: l(`${slots.map((x) => agL(x.action).pt).join(', ')} (${who.pt})`, `${slots.map((x) => agL(x.action).en).join(', ')} (${who.en})`), src: 'slot', movable: false, summary: true });
      continue;
    }
    slots.forEach((x, i) => {
      const w = wm + slotWeek(x, i) - 1;
      const c = colOfWeek(w);
      push({ id: `slot:${a.id}:${i}`, act: a.id, kind: AG_KIND[x.action] ?? 'other', c0: c, c1: c, title: agL(x.action), sub: l(`sem ${slotWeek(x, i)} · ${who.pt}`, `wk ${slotWeek(x, i)} · ${who.en}`), src: 'slot', ref: i, movable: manual });
    });
  }
  // sessões de estúdio em andamento
  for (const ss of s.sessions) {
    if (!ids.has(ss.actId) || ss.done) continue;
    const left = Math.max(1, Math.ceil((ss.days - ss.dayDone) / 7));
    push({ id: `sess:${ss.id}`, act: ss.actId, kind: 'rec', c0: 0, c1: mode === 'months' ? 0 : left - 1, title: N('Gravação', 'Recording'), sub: fmtL(N('dia {d}/{n}', 'day {d}/{n}'), { d: ss.dayDone, n: ss.days }), src: 'session', movable: false });
  }
  // lançamentos programados
  for (const pr of s.pendingReleases) {
    if (!ids.has(pr.actId)) continue;
    const c = colOfWeek(pr.week);
    push({ id: `rel:${pr.id}`, act: pr.actId, kind: 'rel', c0: c, c1: c, title: N('Lançamento', 'Release'), sub: l(`${pr.type.toUpperCase()} "${pr.title}"`, `${pr.type.toUpperCase()} "${pr.title}"`), src: 'release', movable: false });
  }
  // prazos do calendário único que apontam para um artista do elenco (turnê, festival, contrato…)
  let cal: Deadline19[] = [];
  try { cal = calendar19(s, { weeks: mode === 'months' ? 56 : WEEKS }); } catch { cal = []; }
  for (const d of cal) {
    const act = d.goto?.act;
    if (!act || !ids.has(act)) continue;
    if (d.id.startsWith('release')) continue; // o lançamento já está acima
    const c0 = colOfWeek(d.w0 ?? d.w), c1 = colOfWeek(d.w);
    push({ id: `cal:${d.id}`, act, kind: CAL_KIND[d.kind] ?? 'other', c0, c1: Math.max(c0, c1), title: d.t, sub: d.d, src: 'cal', movable: false });
  }
  const firm: BoardCard5[] = [];
  for (const d of cal) {
    if (d.goto?.act || d.kind === 'echo' || d.kind === 'msg' || d.kind === 'decision') continue;
    const c0 = colOfWeek(d.w0 ?? d.w), c1 = colOfWeek(d.w);
    if (!inside(c0, Math.max(c0, c1))) continue;
    firm.push({ id: `firm:${d.id}`, act: '', kind: CAL_KIND[d.kind] ?? 'other', c0: clip(c0), c1: clip(Math.max(c0, c1)), title: d.t, sub: d.d, src: 'cal', movable: false });
  }
  // conflito = o mesmo artista gravando e em turnê na mesma coluna
  const conflicts: Board5['conflicts'] = [];
  for (const r of rows) for (let c = 0; c < span; c++) {
    const here = cards.filter((x) => x.act === r.id && !x.summary && x.c0 <= c && x.c1 >= c);
    if (here.some((x) => x.kind === 'rec') && here.some((x) => x.kind === 'tour')) {
      for (const x of here) if (x.kind === 'rec' || x.kind === 'tour') x.conflict = true;
      conflicts.push({ act: r.id, col: c, text: fmtL(N('{a} gravando e em turnê em {c}.', '{a} recording and touring in {c}.'), { a: r.name, c: cols[c].label.pt }) });
    }
  }
  const keep = onlyConflicts ? new Set(conflicts.map((x) => x.act)) : null;
  return { mode, week0: wm, firm: keep ? [] : firm.slice(0, 24), cols, rows: keep ? rows.filter((r) => keep.has(r.id)) : rows, cards: keep ? cards.filter((c) => keep.has(c.act)) : cards, conflicts };
}

/** As próximas `n` semanas, uma coluna cada (marcos do quadro de planejamento: lançamentos, shows e prazos do calendário
 *  único, com "ir até lá"). Só leitura. */
export interface WeekAhead5 { off: number; mi: number; items: { t: L; d?: L; tone: 'bad' | 'good' | 'info'; deadline?: Deadline19; act?: string; kind?: Card5Kind }[] }
export function weeksAhead5(s: GameState, n = 4): WeekAhead5[] {
  let cal: Deadline19[] = [];
  try { cal = calendar19(s, { weeks: n }); } catch { cal = []; }
  const out: WeekAhead5[] = Array.from({ length: n }, (_, i) => ({ off: i, mi: monthOfWeek31(s, s.week + i), items: [] }));
  for (const d of cal) {
    if (d.kind === 'echo' || d.kind === 'msg') continue;
    const i = Math.max(0, (d.w0 ?? d.w) - s.week);
    if (i < n) out[i].items.push({ t: d.t, d: d.d, tone: d.tone ?? 'info', deadline: d });
  }
  // a agenda deste mês do elenco (a mesma das ações de artista), na semana de cada horário
  const wm = weekOfMi(s, monthIndex(s));
  for (const id of playerActs(s)) {
    const a = s.acts[id];
    if (!a || a.status === 'retired' || a.status === 'split') continue;
    let slots: ReturnType<typeof baseAgenda20> = [];
    try { slots = baseAgenda20(s, a); } catch { slots = []; }
    slots.forEach((x, k) => {
      const i = wm + slotWeek(x, k) - 1 - s.week;
      if (i >= 0 && i < n) out[i].items.push({ t: l(`${a.name}: ${agL(x.action).pt}`, `${a.name}: ${agL(x.action).en}`), tone: 'info', act: a.id, kind: AG_KIND[x.action] ?? 'other' });
    });
  }
  return out;
}

/** Mês absoluto de uma coluna do quadro (para reservar/mover com as funções de hoje). */
export const boardMonth5 = (b: Board5, col: number): number => (b.mode === 'months' ? b.cols[col]?.key ?? 0 : 0);

// ================================================================ agenda de couro

export interface AgendaItem5 { id: string; w: number; week: number; t: L; d?: L; kind: CalKind19; tone: 'bad' | 'good' | 'info'; act: boolean; deadline: Deadline19 }
export interface Agenda5 {
  month: number;
  year: number;
  /** bolinhas: expediente, pessoais, sobrecarga (agenda17.balls) */
  office: { k: string; tip: L }[];
  personal: { k: string; tip: L }[];
  over: { k: string; tip: L }[];
  overbooked: number;
  /** compromissos do mês por semana (1..5), do calendário único (prazos, lançamentos, turnês, AMOR…) */
  weeks: AgendaItem5[][];
  careers: { id: string; name: L; inv: Inv; invName: L; balls: number; head?: string }[];
  chief?: { name: string; skill: number; salary: number };
  reports: { mk: number; t: L; tone?: string }[];
}

export function agenda5(s: GameState): Agenda5 {
  const b = balls(s);
  const w0 = weekOfMonth19(s, s.year, s.month);
  const w1 = s.month === 11 ? weekOfMonth19(s, s.year + 1, 0) : weekOfMonth19(s, s.year, s.month + 1);
  let cal: Deadline19[] = [];
  try { cal = calendar19(s, { from: Math.min(s.week, w0), weeks: Math.max(1, w1 - Math.min(s.week, w0)) }); } catch { cal = []; }
  const nw = Math.max(4, Math.min(5, w1 - w0));
  const weeks: AgendaItem5[][] = Array.from({ length: nw }, () => []);
  for (const d of cal) {
    const start = Math.max(d.w0 ?? d.w, s.week);
    if (start >= w1) continue; // fica para o mês que vem
    const wk = Math.max(0, Math.min(nw - 1, start - w0));
    weeks[wk].push({ id: d.id, w: d.w, week: wk + 1, t: d.t, d: d.d, kind: d.kind, tone: d.tone ?? 'info', act: !!d.act, deadline: d });
  }
  const a = ag17(s);
  const cb = careerBalls(s);
  const cs = careers(s).active.map((id) => {
    const inv = invOf(s, id);
    return { id, name: careerDef(id)?.name ?? l(id, id), inv, invName: INV_NAME[inv], balls: cb.find((x) => x.id === id)?.n ?? 0, head: a.heads[id]?.name };
  });
  return {
    month: s.month, year: s.year, office: b.office, personal: b.personal, over: b.over, overbooked: overbooked(s),
    weeks, careers: cs,
    chief: a.chief ? { name: a.chief.name, skill: a.chief.skill, salary: a.chief.salary } : undefined,
    reports: a.rep.slice(0, 8).map((x) => ({ mk: x.mk, t: x.t, tone: x.tone })),
  };
}

// ================================================================ fichário de contatos

export type Drawer5 = 'letter' | 'genre' | 'country';
export type Sort5 = 'fame' | 'name' | 'know';
export interface Fich5Filter { drawer: Drawer5; key: string; genre: string; country: string; noLabel: boolean; sort: Sort5; q: string; page: number; /** cartões por página (o papel cabe quantos couberem; padrão FICH5_PAGE) */ per?: number }
export const FICH5_0: Fich5Filter = { drawer: 'letter', key: '', genre: '', country: '', noLabel: false, sort: 'fame', q: '', page: 0 };
export const FICH5_PAGE = 12;
export type Owner5 = 'mine' | 'rival' | 'free';
export interface FichCard5 { id: string; name: string; genre: string; city: string; country: string | null; fame: number; know: number; owner: Owner5; labelId?: string; face?: string; why: KnownAct27['why'] }
export interface Fich5 { total: number; drawers: { key: string; n: number }[]; cards: FichCard5[]; shown: number; pages: number; page: number; genres: string[]; countries: string[] }

const keyOf = (c: FichCard5, d: Drawer5): string => (d === 'letter' ? (c.name.normalize('NFD').replace(/[^A-Za-z]/g, '')[0] ?? '#').toUpperCase() : d === 'genre' ? c.genre : c.country ?? '—');

/** Todos os artistas que você conhece (a lista de hoje: knownArtists27), em gavetas. */
export function fichario5(s: GameState, f: Fich5Filter = FICH5_0): Fich5 {
  const all: FichCard5[] = knownArtists27(s).map((k) => {
    const a = s.acts[k.id];
    const owner: Owner5 = a.owner === 'player' || a.playerBand ? 'mine' : a.owner ? 'rival' : 'free';
    return { id: a.id, name: a.name, genre: a.genre, city: a.city, country: k.a3, fame: Math.round(k.here), know: k.know, owner, labelId: owner === 'rival' ? a.owner ?? undefined : undefined, face: a.members[0], why: k.why };
  });
  const q = f.q.trim().toLowerCase();
  const base = all.filter((c) => (!f.genre || c.genre === f.genre) && (!f.country || c.country === f.country) && (!f.noLabel || c.owner === 'free') && (!q || c.name.toLowerCase().includes(q)));
  const counts = new Map<string, number>();
  for (const c of base) { const k = keyOf(c, f.drawer); counts.set(k, (counts.get(k) ?? 0) + 1); }
  const drawers = (f.drawer === 'letter' ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').concat(counts.has('#') ? ['#'] : []) : [...counts.keys()].sort()).map((key) => ({ key, n: counts.get(key) ?? 0 }));
  const key = f.key && counts.has(f.key) ? f.key : q ? '' : drawers.find((d) => d.n)?.key ?? '';
  const inDrawer = key ? base.filter((c) => keyOf(c, f.drawer) === key) : base;
  const sorted = [...inDrawer].sort((x, y) => (f.sort === 'name' ? x.name.localeCompare(y.name) : f.sort === 'know' ? y.know - x.know || y.fame - x.fame : y.fame - x.fame || x.name.localeCompare(y.name)));
  const per = Math.max(1, f.per ?? FICH5_PAGE);
  const pages = Math.max(1, Math.ceil(sorted.length / per));
  const page = Math.max(0, Math.min(pages - 1, f.page));
  return {
    total: all.length, drawers, cards: sorted.slice(page * per, (page + 1) * per), shown: sorted.length, pages, page,
    genres: [...new Set(all.map((c) => c.genre))].sort(), countries: [...new Set(all.map((c) => c.country).filter((x): x is string => !!x))].sort(),
  };
}
/** Gaveta efetiva (a primeira com cartões quando nenhuma foi escolhida). */
export function fichKey5(s: GameState, f: Fich5Filter): string {
  const r = fichario5(s, { ...f, page: 0 });
  return f.key && r.drawers.some((d) => d.key === f.key && d.n) ? f.key : f.q.trim() ? '' : r.drawers.find((d) => d.n)?.key ?? '';
}

export interface Compare5Row { label: L; v: (string | number)[] }
/** Comparar 2–4 cartões marcados (números que a ficha de hoje já mostra). */
export function compare5(s: GameState, ids: string[]): { names: string[]; rows: Compare5Row[] } {
  const as = ids.map((id) => s.acts[id]).filter((a): a is Act => !!a).slice(0, 4);
  return {
    names: as.map((a) => a.name),
    rows: [
      { label: N('Fama', 'Fame'), v: as.map((a) => Math.round(a.fame)) },
      { label: N('Momento', 'Momentum'), v: as.map((a) => Math.round(a.momentum)) },
      { label: N('Fãs', 'Fans'), v: as.map((a) => a.fans.casual + a.fans.active + a.fans.core) },
      { label: N('Integrantes', 'Members'), v: as.map((a) => a.members.length) },
      { label: N('Hits (top 10)', 'Hits (top 10)'), v: as.map((a) => a.hits) },
      { label: N('Lançamentos', 'Releases'), v: as.map((a) => a.releases.length) },
      { label: N('Estreia', 'Debut'), v: as.map((a) => a.debutYear) },
    ],
  };
}

// ================================================================ contratação e chefe de gabinete

/** Os três jeitos de contratar (mesmas listas de hoje: agenda17). */
export type Hire5 = 'jornal' | 'recepcao' | 'telefone';
export const HIRE5: Record<Hire5, { label: L; hint: L; tab: string }> = {
  jornal: { label: N('Classificados', 'Classifieds'), hint: N('Anúncio no jornal abre a vaga: candidatos do trimestre por função.', 'A newspaper ad opens the post: this quarter\'s candidates by role.'), tab: 'hire' },
  recepcao: { label: N('Recepção', 'Reception'), hint: N('Quem apareceu para entrevista: diretores de carreira e chefe de gabinete.', 'Who showed up for an interview: career directors and chief of staff.'), tab: 'agenda' },
  telefone: { label: N('Telefone', 'Telephone'), hint: N('Freelancers por ação e músicos de estúdio atendem no telefone.', 'Per-action freelancers and session players answer the phone.'), tab: 'free' },
};
export interface HireView5 { staff: number; directors: { career: string; n: number }[]; chief: number; freelancers: number; crews: number }
/** Quantos esperam em cada lugar (só contagem; as listas e ofertas são as de hoje). */
export function hire5(s: GameState): HireView5 {
  const a = ag17(s);
  const st = careers(s).active.filter((c) => !a.heads[c]).map((c) => ({ career: c, n: headCands(s, c).length }));
  let fl = 0;
  for (const k of Object.keys(FL) as FlKind[]) if (s.year >= FL[k].from) fl += freelancers(s, k).filter((x) => !x.busy).length;
  return { staff: staffCands(s).length, directors: st, chief: a.chief ? 0 : chiefCands(s).length, freelancers: fl, crews: crewsNow(s).length };
}

/** Os papéis e as páginas de hoje que cada um cobre (o teste garante que nada das telas de artistas fica de fora). */
export const PAPERS5: Record<string, { obj: string; areas: string[]; label: L }> = {
  mural: { obj: 'mural', areas: ['artists', 'people'], label: N('Mural do elenco', 'Roster corkboard') },
  quadro: { obj: 'quadroplan', areas: ['plan'], label: N('Quadro de planejamento', 'Planning board') },
  agenda: { obj: 'agenda', areas: ['agenda17', 'calendar19', 'cal17'], label: N('Sua agenda', 'Your planner') },
  fichario: { obj: 'fichario', areas: ['directory', 'knownacts27'], label: N('Fichário de contatos', 'Contact card file') },
  chefe: { obj: 'chefe', areas: ['deleg31'], label: N('Chefe de gabinete', 'Chief of staff') },
  contratar: { obj: 'contratar', areas: [], label: N('Contratação', 'Hiring') },
};

/** Semana 1..4 da agenda do mês que cai na coluna `col` (vista por semana); fora do mês = 0. */
export function boardSlotWeek5(b: Board5, col: number): number {
  if (b.mode !== 'weeks') return 0;
  const wk = (b.cols[col]?.key ?? -1) - b.week0 + 1;
  return wk >= 1 && wk <= 4 ? wk : 0;
}

/** Onde cada coisa das telas de artistas de hoje fica no jogo explorável (página/aba antiga → papel/marcador ou caminho).
 *  'ficha' = a ficha do artista (clique na polaroid, no cartão do fichário ou no nome do quadro); 'acoes' = o menu de ações
 *  de sempre (botão direito / "Ações ▾" na polaroid, clique no quadro). Travado por teste: nada fica de fora. */
export const REACH5: Record<string, { paper: string; tab?: string; via?: 'ficha' | 'acoes' | 'marcador' | 'pagina' }> = {
  // Artistas (lista do elenco e subabas do artista)
  'artists': { paper: 'mural', tab: 'roster' },
  'artists20/overview': { paper: 'mural', via: 'ficha' }, 'artists20/agenda': { paper: 'mural', via: 'acoes' }, 'artists20/career': { paper: 'mural', via: 'acoes' },
  'artists20/audience': { paper: 'mural', via: 'ficha' }, 'artists20/members': { paper: 'mural', via: 'acoes' }, 'artists20/full': { paper: 'mural', via: 'ficha' },
  // Pessoas (as 6 abas viram marcadores do mural)
  'people/roster': { paper: 'mural', tab: 'roster' }, 'people/health': { paper: 'mural', tab: 'health' }, 'people/relations': { paper: 'mural', tab: 'relations' },
  'people/secrets': { paper: 'mural', tab: 'secrets' }, 'people/staff': { paper: 'mural', tab: 'staff' }, 'people/feed': { paper: 'mural', tab: 'feed' },
  // Planejamento (Central): planos e reservas viram o quadro; o resto da Central continua na página de hoje
  'plan': { paper: 'quadro', tab: 'all' },
  // Agenda e contratações
  'agenda17/agenda': { paper: 'agenda', tab: 'month' }, 'agenda17/you': { paper: 'agenda', tab: 'you' }, 'agenda17/hire': { paper: 'contratar', tab: 'jornal' },
  'agenda17/free': { paper: 'contratar', tab: 'telefone' }, 'agenda17/session': { paper: 'contratar', tab: 'telefone' },
  'calendar19': { paper: 'agenda', tab: 'month' }, 'cal17': { paper: 'agenda', via: 'pagina' },
  // Todos os artistas / conhecidos
  'directory': { paper: 'fichario' }, 'knownacts27': { paper: 'fichario' },
  // Delegação
  'deleg31': { paper: 'chefe' },
};
/** Subabas da página do artista hoje (actions20.SUB20), para o teste de alcance. */
export const SUB_IDS5 = ['overview', 'agenda', 'career', 'audience', 'members', 'full'] as const;
