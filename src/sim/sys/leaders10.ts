// Rodada 10 — líderes das gravadoras. Cada selo rival tem um líder (fundador ou CEO) com nome, idade,
// origem, personalidade (facetas da rodada 9), estilo de liderança, estratégia preferida, ambição, apetite
// a risco, relações (com o jogador e com outros líderes) e carreira (selos que já comandou). Líderes
// envelhecem, se aposentam, morrem, são demitidos depois de anos ruins, são aliciados por outros selos e
// têm sucessores — e um sucessor pode mudar a estratégia do selo. No modo nomes reais, alguns executivos
// famosos assumem seus selos nos anos plausíveis (só quando o selo já existe).
//
// Determinismo: todos os sorteios usam um Rng próprio (semente + semana), nunca o fluxo compartilhado.

import { clamp, hashString, Rng } from '../../core/rng';
import { REAL_EXECS } from '../../data/labels10';
import { cityById, l, type L } from '../../data/world';
import { registerExt4, registerSimHook } from '../ext4';
import { langForCity, personName } from '../people';
import type { GameState, Label } from '../types';
import { fmtL, notify, remember } from '../util';
import { KIND_IMP } from './chron9';
import { logMove, PLAYBOOKS, playbookOf, type PlaybookId } from './rivals8';
import { FACETS, FACET_TXT, type Facet } from './soul9';

export type LeaderBg = 'artist' | 'lawyer' | 'promoter' | 'heir' | 'banker' | 'engineer' | 'producer' | 'dj' | 'journalist' | 'accountant';
export type LeaderStyle = 'autocrat' | 'mentor' | 'dealmaker' | 'visionary' | 'numbers' | 'showman' | 'consensus';
export type JobEnd = 'retired' | 'fired' | 'died' | 'poached' | 'left' | 'closed';

export interface LeaderJob { lb: string; n: string; from: number; to?: number; end?: JobEnd }

export interface Leader {
  id: string;
  name: string;
  born: number;
  city: string;
  bg: LeaderBg;
  style: LeaderStyle;
  pref: PlaybookId;
  /** ambição e apetite a risco 0..100 */
  amb: number;
  risk: number;
  label?: string;
  since?: number;
  jobs: LeaderJob[];
  st: 'active' | 'free' | 'retired' | 'dead';
  died?: number;
  retireAge: number;
  /** anos ruins seguidos (receita em queda ou caixa negativo) */
  bad: number;
  prevRev?: number;
  founder?: boolean;
  /** executivo real (id) e biografia curta */
  real?: string;
  realDied?: number;
  note?: L;
  /** relações −100..100 com outros líderes (id) e com o jogador ('player') */
  rel: Record<string, number>;
}

export interface Leaders10State { L: Record<string, Leader>; seq: number; done: string[] }

declare module '../ext4' { interface Ext4 { leaders10: Leaders10State } }
registerExt4('leaders10', () => ({ L: {}, seq: 0, done: [] }));
export const leaders = (s: GameState): Leaders10State => (s as unknown as { x4: { leaders10: Leaders10State } }).x4.leaders10;

KIND_IMP.leader10 = 2;

export const BG_TXT: Record<LeaderBg, L> = {
  artist: l('ex-artista', 'former artist'), lawyer: l('advogado de contratos', 'contracts lawyer'), promoter: l('promotor de shows', 'concert promoter'),
  heir: l('herdeiro de família rica', 'heir to a wealthy family'), banker: l('banqueiro', 'banker'), engineer: l('engenheiro de som', 'sound engineer'),
  producer: l('produtor musical', 'record producer'), dj: l('DJ e radialista', 'DJ and broadcaster'), journalist: l('jornalista musical', 'music journalist'),
  accountant: l('contador', 'accountant'),
};

export const STYLE_TXT: Record<LeaderStyle, [L, L]> = {
  autocrat: [l('Autocrata', 'Autocrat'), l('Decide tudo sozinho; o elenco obedece ou sai.', 'Decides everything alone; the roster obeys or leaves.')],
  mentor: [l('Mentor', 'Mentor'), l('Cuida dos artistas como filhos; perde dinheiro por lealdade.', 'Looks after artists like family; loses money out of loyalty.')],
  dealmaker: [l('Negociador', 'Dealmaker'), l('Vive de fechar contratos e comprar o que está subindo.', 'Lives for closing deals and buying what is rising.')],
  visionary: [l('Visionário', 'Visionary'), l('Aposta no que ninguém entende ainda.', 'Bets on what nobody understands yet.')],
  numbers: [l('Homem dos números', 'Numbers person'), l('Planilha acima de tudo; corta quem não dá lucro.', 'Spreadsheet above all; cuts whoever does not pay.')],
  showman: [l('Showman', 'Showman'), l('Festa, imprensa e escândalo: o selo é ele.', 'Parties, press and scandal: he is the label.')],
  consensus: [l('Conciliador', 'Consensus builder'), l('Ouve todo mundo; decide devagar, erra pouco.', 'Listens to everyone; decides slowly, errs rarely.')],
};

const END_TXT: Record<JobEnd, L> = {
  retired: l('aposentou-se', 'retired'), fired: l('demissão', 'fired'), died: l('morreu no cargo', 'died in office'),
  poached: l('levado por outro selo', 'poached by another label'), left: l('deixou o cargo', 'stepped down'), closed: l('o selo fechou', 'the label closed'),
};
export const jobEndText = (e?: JobEnd): L | undefined => (e ? END_TXT[e] : undefined);

/** Estratégias que cada porte de selo costuma seguir (sucessores escolhem daqui). */
const FAMILY_PREF: Record<Label['family'], PlaybookId[]> = {
  A: ['vulture', 'fund', 'conglomerate', 'tech', 'royalty', 'importer', 'visionary'],
  B: ['scene', 'purist', 'agitator', 'prestige', 'regional', 'viral', 'school', 'live'],
  C: ['tech', 'idol', 'copycat', 'viral', 'sync', 'school', 'importer'],
  D: ['catalog', 'royalty', 'budget', 'sync', 'fund'],
};
const BG_BY_FAMILY: Record<Label['family'], LeaderBg[]> = {
  A: ['lawyer', 'banker', 'heir', 'accountant', 'promoter'],
  B: ['artist', 'dj', 'journalist', 'engineer', 'promoter'],
  C: ['producer', 'promoter', 'lawyer', 'artist', 'dj'],
  D: ['accountant', 'lawyer', 'banker', 'heir'],
};
const STYLES: LeaderStyle[] = ['autocrat', 'mentor', 'dealmaker', 'visionary', 'numbers', 'showman', 'consensus'];

const rngFor = (s: GameState, k: string): Rng => Rng.fromSeed(`${s.config.seed}|lead10|${k}|${s.week}`);

export const leaderOf = (s: GameState, lbId: string): Leader | undefined => {
  const id = s.labels[lbId]?.leaderId;
  return id ? leaders(s).L[id] : undefined;
};
export const ageOf = (s: GameState, L0: Leader): number => (L0.died ?? s.year) - L0.born;

/** Personalidade determinística (facetas da rodada 9, puxadas pelo estilo e pela ambição/risco). */
export function leaderFacets(s: GameState, L0: Leader): Record<Facet, number> {
  const out = {} as Record<Facet, number>;
  for (const k of FACETS) {
    const h = hashString(`${s.config.seed}|ldf|${L0.id}|${k}`) / 4294967296;
    out[k] = 25 + h * 50;
  }
  const add = (k: Facet, d: number) => (out[k] += d);
  add('ambicao', (L0.amb - 50) * 0.6);
  add('coragem', (L0.risk - 50) * 0.5);
  add('impulsividade', (L0.risk - 50) * 0.3);
  const S: Record<LeaderStyle, [Facet, number][]> = {
    autocrat: [['teimosia', 25], ['empatia', -20], ['ego', 15]], mentor: [['empatia', 25], ['paciencia', 20], ['lealdade', 15]],
    dealmaker: [['sociabilidade', 20], ['lealdade', -15], ['ambicao', 10]], visionary: [['curiosidade', 25], ['rebeldia', 15], ['teimosia', 10]],
    numbers: [['disciplina', 25], ['generosidade', -20], ['romantismo', -15]], showman: [['vaidade', 25], ['sociabilidade', 20], ['humor', 15]],
    consensus: [['paciencia', 20], ['empatia', 15], ['ego', -20]],
  };
  for (const [k, d] of S[L0.style]) add(k, d);
  for (const k of FACETS) out[k] = Math.round(clamp(out[k], 0, 100));
  return out;
}

export function describeLeader(s: GameState, L0: Leader): L[] {
  const f = leaderFacets(s, L0);
  return FACETS.map((k) => ({ k, d: f[k] - 50 })).filter((x) => Math.abs(x.d) >= 15).sort((a, b) => Math.abs(b.d) - Math.abs(a.d)).slice(0, 4)
    .map((x) => FACET_TXT[x.k][x.d > 0 ? 2 : 1]);
}

// ---------------------------------------------------------------- criação e cargos

export function newLeader(s: GameState, r: Rng, lb: Label, o: { founder?: boolean; name?: string; born?: number } = {}): Leader {
  const st = leaders(s);
  const id = `ldr${++st.seq}`;
  const city = r.chance(0.75) ? lb.city : r.pick(Object.keys(cityById));
  const founder = !!o.founder;
  const born = o.born ?? (founder ? Math.min(s.year, lb.founded) - r.int(24, 42) : s.year - r.int(36, 58));
  const cur = playbookOf(lb);
  const pool = FAMILY_PREF[lb.family];
  const L0: Leader = {
    id, name: o.name ?? personName(r, langForCity(city, r)), born, city,
    bg: r.pick(BG_BY_FAMILY[lb.family]), style: r.pick(STYLES),
    pref: founder || r.chance(0.45) ? cur : r.pick(pool),
    amb: r.int(15, 95), risk: r.int(10, 95), jobs: [], st: 'free', retireAge: r.int(62, 80), bad: 0, founder, rel: {},
  };
  L0.rel.player = r.int(-15, 25);
  st.L[id] = L0;
  return L0;
}

function appoint(s: GameState, r: Rng, lb: Label, L0: Leader, since = s.year, quiet = false): void {
  const prevPb = playbookOf(lb);
  L0.label = lb.id;
  L0.since = since;
  L0.st = 'active';
  L0.bad = 0;
  L0.prevRev = undefined;
  L0.jobs.push({ lb: lb.id, n: lb.name, from: since });
  lb.leaderId = L0.id;
  lb.ceo = L0.name;
  if (quiet) return;
  // o novo líder imprime o próprio jeito: risco puxa a agressividade e a estratégia pode mudar
  lb.aggression = clamp(lb.aggression * 0.6 + (L0.risk / 100) * 0.4, 0, 1);
  if (L0.pref !== prevPb && r.chance(0.3 + L0.risk / 250)) {
    lb.playbook = L0.pref;
    logMove(s, lb, { k: 'strategy_change', a: L0.name, x: L0.pref });
    remember(s, 'leader10', fmtL(l('{b} muda de estratégia com {n}: de "{a}" para "{c}".', '{b} changes strategy under {n}: from "{a}" to "{c}".'), { b: lb.name, n: L0.name, a: PLAYBOOKS[prevPb].name, c: PLAYBOOKS[L0.pref].name }));
  }
}

export function depart(s: GameState, lb: Label | undefined, L0: Leader, end: JobEnd): void {
  const job = [...L0.jobs].reverse().find((j) => j.lb === L0.label && j.to === undefined);
  if (job) { job.to = s.year; job.end = end; }
  if (lb && lb.leaderId === L0.id) { delete lb.leaderId; }
  L0.label = undefined;
  L0.since = undefined;
  L0.st = end === 'died' ? 'dead' : end === 'retired' ? 'retired' : 'free';
  if (end === 'died') L0.died = s.year;
}

/** Rodada 16: quem escolhe o sucessor (herdeiro, executivo da casa, contratação de fora) e quem registra a troca. */
export const SUCC10: { pick?: (s: GameState, lb: Label, why: L) => { L: Leader; how: string } | undefined; done?: (s: GameState, lb: Label, L0: Leader, why: L, how: string) => void } = {};

/** Escolhe e empossa o sucessor (um líder livre experiente ou alguém novo). */
export function succeed(s: GameState, r: Rng, lb: Label, why: L): Leader {
  const pre = SUCC10.pick?.(s, lb, why);
  const free = pre ? [] : Object.values(leaders(s).L).filter((x) => x.st === 'free' && s.year - x.born < x.retireAge - 2 && x.jobs.length > 0 && !x.jobs.some((j) => j.lb === lb.id));
  const vet = free.length && r.chance(0.4);
  const L0 = pre?.L ?? (vet ? free.sort((a, b) => b.amb - a.amb)[0] : newLeader(s, r, lb));
  appoint(s, r, lb, L0);
  SUCC10.done?.(s, lb, L0, why, pre?.how ?? (vet ? 'veteran' : 'outside'));
  remember(s, 'leader10', fmtL(l('{n} assume {b} ({w}).', '{n} takes over {b} ({w}).'), { n: L0.name, b: lb.name, w: why }));
  if (lb.roster.length >= 5 || lb.family === 'A') notify(s, fmtL(l('Novo comando em {b}: {n}, {st}, prefere "{p}".', 'New leadership at {b}: {n}, {st}, prefers "{p}".'), { b: lb.name, n: L0.name, st: STYLE_TXT[L0.style][0], p: PLAYBOOKS[L0.pref].name }), 'info');
  return L0;
}

// ---------------------------------------------------------------- executivos reais

function realExecLeader(s: GameState, r: Rng, lb: Label, ex: (typeof REAL_EXECS)[number]): Leader {
  const st = leaders(s);
  const found = Object.values(st.L).find((x) => x.real === ex.rid);
  if (found) { found.note = l(ex.pt, ex.en); return found; }
  const L0 = newLeader(s, r, lb, { name: ex.name, born: ex.born });
  L0.real = ex.rid;
  L0.realDied = ex.died;
  L0.bg = ex.bg as LeaderBg;
  L0.style = ex.style as LeaderStyle;
  L0.pref = playbookOf(lb);
  L0.amb = Math.max(L0.amb, 70);
  L0.retireAge = Math.max(L0.retireAge, 78);
  L0.note = l(ex.pt, ex.en);
  return L0;
}

function applyRealExecs(s: GameState, r: Rng, init: boolean): void {
  if (!s.config.realNames) return;
  const st = leaders(s);
  for (const ex of REAL_EXECS) {
    const key = `${ex.rid}:${ex.label}`;
    if (st.done.includes(key) || ex.y > s.year) continue;
    const lb = s.labels[ex.label];
    if (!lb || !lb.active) continue; // só quando o selo já existe
    st.done.push(key);
    if (ex.died !== undefined && ex.died <= s.year) continue;
    if (s.year - ex.born >= 85) continue;
    // no começo, só vale a nomeação mais recente de cada selo
    if (init && REAL_EXECS.some((o) => o.label === ex.label && o.y > ex.y && o.y <= s.year && (o.died === undefined || o.died > s.year))) continue;
    const L0 = realExecLeader(s, r, lb, ex);
    if (L0.st === 'dead' || L0.label === lb.id) continue;
    const prev = leaderOf(s, lb.id);
    if (prev) depart(s, lb, prev, 'left');
    if (L0.label && s.labels[L0.label]) {
      const old = s.labels[L0.label];
      depart(s, old, L0, 'left');
      if (!init) succeed(s, r, old, l('saída do antigo líder', 'former leader left'));
    }
    if (init && lb.ceo === undefined) lb.ceoSeed10 = 1;
    appoint(s, r, lb, L0, init ? Math.max(lb.founded, ex.y) : s.year, init);
    L0.founder = ex.y <= lb.founded + 1;
    if (!init) remember(s, 'leader10', fmtL(l('{n} assume o comando de {b}.', '{n} takes charge of {b}.'), { n: L0.name, b: lb.name }), { important: true });
  }
}

// ---------------------------------------------------------------- começo da partida

function seedLeaders(s: GameState): void {
  const r = rngFor(s, 'init');
  applyRealExecs(s, r, true);
  const labels = Object.values(s.labels).filter((lb) => lb.active);
  for (const lb of labels) {
    if (lb.leaderId && leaders(s).L[lb.leaderId]) continue;
    const age = s.year - lb.founded;
    const founder = age < 25 && r.chance(0.8);
    const L0 = newLeader(s, r, lb, { founder, name: lb.ceo });
    if (founder && s.year - L0.born >= L0.retireAge) L0.retireAge = s.year - L0.born + r.int(2, 10);
    let since = founder ? lb.founded : Math.max(lb.founded, s.year - r.int(0, 12));
    // carreira prévia: quem foi contratado já comandou (ou trabalhou em) outro selo
    if (!founder && r.chance(0.55)) {
      const other = r.pick(labels);
      if (other && other.id !== lb.id) {
        const from = Math.max(other.founded, since - r.int(3, 10));
        if (from < since) L0.jobs.push({ lb: other.id, n: other.name, from, to: since, end: r.pick(['poached', 'left', 'fired'] as JobEnd[]) });
      }
    }
    since = Math.min(since, s.year);
    if (lb.ceo === undefined) lb.ceoSeed10 = 1;
    appoint(s, r, lb, L0, since, true);
  }
  // laços entre líderes: alguns amigos, alguns desafetos
  const all = Object.values(leaders(s).L).filter((x) => x.st === 'active');
  for (const a of all) for (let i = 0; i < 2 && all.length > 1; i++) {
    const b = r.pick(all);
    if (b === a) continue;
    const v = r.chance(0.5) ? r.int(20, 60) : -r.int(20, 60);
    a.rel[b.id] = v;
    b.rel[a.id] = v;
  }
}

registerSimHook('newgame', 'leaders10', (s) => seedLeaders(s));

// ---------------------------------------------------------------- tick

registerSimHook('month', 'leaders10', (s) => {
  const r = rngFor(s, 'm');
  const st = leaders(s);
  // saves antigos (ou partida criada sem o gancho): semeia em silêncio
  if (!st.seq) { seedLeaders(s); return; }
  applyRealExecs(s, r, false);
  for (const lb of Object.values(s.labels)) {
    if (!lb.active) continue;
    const cur = lb.leaderId ? st.L[lb.leaderId] : undefined;
    if (cur && cur.st === 'active' && cur.label === lb.id) continue;
    if (cur) delete lb.leaderId;
    // selo sem líder: recém-fundado (ou criado por outro sistema) ganha fundador; os demais, um sucessor
    const fresh = s.year - lb.founded <= 1;
    if (fresh) {
      const L0 = newLeader(s, r, lb, { founder: true, name: lb.ceo });
      appoint(s, r, lb, L0, Math.min(s.year, Math.max(lb.founded, s.year - 1)), true);
      remember(s, 'leader10', fmtL(l('{n} funda {b} em {c}.', '{n} founds {b} in {c}.'), { n: L0.name, b: lb.name, c: cityById[lb.city]?.name ?? lb.city }));
      notify(s, fmtL(l('Nova gravadora: {b}, fundada por {n} em {c}. Estratégia: "{p}".', 'New label: {b}, founded by {n} in {c}. Strategy: "{p}".'), { b: lb.name, n: L0.name, c: cityById[lb.city]?.name ?? lb.city, p: PLAYBOOKS[playbookOf(lb)].name }), 'info');
    } else succeed(s, r, lb, l('cargo vago', 'vacant post'));
  }
  // morte nos anos reais (modo histórico com "mortes nos anos reais")
  if (s.config.history === 'strict') for (const L0 of Object.values(st.L)) {
    if (!L0.real || L0.realDied !== s.year || L0.st === 'dead') continue;
    const lb = L0.label ? s.labels[L0.label] : undefined;
    depart(s, lb, L0, 'died');
    remember(s, 'leader10', fmtL(l('Morre {n}, {a} anos{b}.', '{n} dies, aged {a}{b}.'), { n: L0.name, a: ageOf(s, L0), b: lb ? fmtL(l(', líder de {x}', ', head of {x}'), { x: lb.name }) : '' }), { important: true });
    if (lb && lb.active) succeed(s, r, lb, l('morte do líder', 'death of the leader'));
  }
});

registerSimHook('year', 'leaders10', (s) => {
  const r = rngFor(s, 'y');
  const st = leaders(s);
  for (const L0 of Object.values(st.L)) {
    if (L0.st === 'dead' || L0.st === 'retired') continue;
    const lb = L0.label ? s.labels[L0.label] : undefined;
    const age = s.year - L0.born;
    if (L0.st === 'active' && (!lb || !lb.active || lb.leaderId !== L0.id)) { depart(s, lb, L0, 'closed'); continue; }
    // morte (genérica; reais com data conhecida só morrem nela se "mortes nos anos reais" estiver ligado)
    const pDie = age >= 70 ? (age - 68) * 0.012 : 0.002;
    const realFixed = L0.real && s.config.history === 'strict' && L0.realDied !== undefined;
    if (!realFixed && r.chance(pDie)) {
      depart(s, lb, L0, 'died');
      if (lb) {
        remember(s, 'leader10', fmtL(l('Morre {n}, {a} anos, líder de {b}.', '{n}, head of {b}, dies aged {a}.'), { n: L0.name, a: age, b: lb.name }), { important: lb.family === 'A' });
        succeed(s, r, lb, l('morte do líder', 'death of the leader'));
      }
      continue;
    }
    if (age >= L0.retireAge) {
      depart(s, lb, L0, 'retired');
      if (lb) {
        remember(s, 'leader10', fmtL(l('{n} se aposenta aos {a} anos, depois de {y} anos à frente de {b}.', '{n} retires at {a} after {y} years at the head of {b}.'), { n: L0.name, a: age, y: s.year - (L0.jobs[L0.jobs.length - 1]?.from ?? s.year), b: lb.name }));
        succeed(s, r, lb, l('aposentadoria', 'retirement'));
      }
      continue;
    }
    if (!lb) continue;
    // desempenho: receita em queda forte ou caixa negativo = ano ruim
    const rev = lb.revenueLastYear;
    const badYear = lb.cash < 0 || (L0.prevRev !== undefined && L0.prevRev > 0 && rev < L0.prevRev * 0.75);
    L0.bad = badYear ? L0.bad + 1 : Math.max(0, L0.bad - 1);
    L0.prevRev = rev;
    if (L0.bad >= 2 && r.chance(L0.founder ? 0.2 : 0.45)) {
      depart(s, lb, L0, 'fired');
      remember(s, 'leader10', fmtL(l('{b} demite {n} depois de {k} anos ruins.', '{b} fires {n} after {k} bad years.'), { n: L0.name, b: lb.name, k: L0.bad }));
      L0.bad = 0;
      succeed(s, r, lb, l('demissão do antecessor', 'predecessor fired'));
    }
  }
  // aliciamento: um selo rico tira o líder ambicioso de um selo menor
  if (r.chance(0.3)) {
    const act = Object.values(s.labels).filter((lb) => lb.active && lb.leaderId);
    const rich = act.filter((lb) => lb.cash > 0).sort((a, b) => b.revenueLastYear - a.revenueLastYear).slice(0, 5);
    const buyer = rich.length ? r.pick(rich) : undefined;
    const bossOld = buyer ? leaderOf(s, buyer.id) : undefined;
    const targets = act.filter((lb) => buyer && lb.id !== buyer.id && lb.revenueLastYear < buyer.revenueLastYear)
      .map((lb) => ({ lb, L0: leaderOf(s, lb.id)! })).filter((x) => x.L0 && x.L0.amb >= 60 && !x.L0.founder && s.year - x.L0.born < x.L0.retireAge - 4);
    const pick = targets.length ? r.pick(targets) : undefined;
    if (buyer && bossOld && pick && (bossOld.bad >= 1 || r.chance(0.25))) {
      depart(s, buyer, bossOld, 'fired');
      depart(s, pick.lb, pick.L0, 'poached');
      appoint(s, r, buyer, pick.L0);
      pick.L0.rel[bossOld.id] = -40;
      bossOld.rel[pick.L0.id] = -40;
      remember(s, 'leader10', fmtL(l('{b} tira {n} de {c} e o põe no lugar de {o}.', '{b} lures {n} away from {c} to replace {o}.'), { b: buyer.name, n: pick.L0.name, c: pick.lb.name, o: bossOld.name }), { important: buyer.family === 'A' });
      succeed(s, r, pick.lb, l('líder aliciado', 'leader poached'));
    }
  }
  // relação com o jogador: rivalidade azeda, o tempo cura um pouco
  for (const L0 of Object.values(st.L)) {
    if (L0.st !== 'active' || !L0.label) continue;
    const rv = s.rivalries[L0.label] ?? 0;
    L0.rel.player = Math.round(clamp((L0.rel.player ?? 0) * 0.92 - rv * 0.08 + (rv < 5 ? 1 : 0), -100, 100));
  }
  // livres velhos demais se aposentam
  for (const L0 of Object.values(st.L)) if (L0.st === 'free' && s.year - L0.born >= L0.retireAge) L0.st = 'retired';
});

