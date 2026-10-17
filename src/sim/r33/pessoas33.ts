// R33 · PESSOAS — ego e química na banda, mentor e aprendiz, turnê de abertura e ciclo de vida do artista.
// Quatro interruptores próprios, todos DESLIGADOS no código (como os exp5.*): desligado = nenhum sorteio, nenhum estado
// novo, nenhum efeito (os ganchos saem na primeira linha). Ver docs/r33/pessoas.md.
//   · exp33.ego      química da banda (0..100) a partir das relações, ressentimento e do ego de cada um; crise de ego
//                    com banda baixa: o jogador decide (dar um tempo, deixar sair em solo, conversar); NPC resolve sozinho.
//   · exp33.mentor   veterano ensina novato (pessoas dos atos do jogador): habilidade sobe, moral do mentor também.
//   · exp33.opening  abertura de turnê: o novato ganha fãs do público do veterano; o veterano ganha frescor (momento).
//   · exp33.life     fases da carreira (subida, auge, declínio, volta, despedida, homenagem póstuma com o catálogo
//                    disparando pelo gancho da CATÁLOGO — `setCatalogSurge33`; sem gancho, o fallback daqui).
// Vida real exata (`config.history === 'strict'`): ato real travado (`histLocked`) não rompe, não sai em solo, não
// pausa nem se despede por estas regras; a homenagem a quem morreu pelo roteiro real vale (o catálogo real disparou).
// Família Fossati (pessoas `fam:*`) nunca entra em nenhuma regra daqui.

import { clamp, type Rng } from '../../core/rng';
import { l, type L } from '../../data/world';
import { histLocked } from '../history15';
import { rw } from '../sys/realworld';
import { exitMember20 } from '../members20';
import { makeAct } from '../people';
import { actsTouched17 } from '../actidx17';
import { registerMod, registerSimHook, deferEvents } from '../ext4';
import type { Act, GameState, Person } from '../types';
import { fmtL, money, notify, post, remember } from '../util';
import { registerEditable } from '../r31/editor';
import { registerSwitch, setSw, sw } from '../r31/switches';

// ---------------------------------------------------------------- interruptores

export const SW33 = { ego: 'exp33.ego', mentor: 'exp33.mentor', opening: 'exp33.opening', life: 'exp33.life' } as const;
type Sw33 = keyof typeof SW33;
const SW_TXT: Record<Sw33, [L, L]> = {
  ego: [l('R33 · ego e química na banda', 'R33 · ego and band chemistry'),
    l('Química da banda pelas relações e pelo ego; crise de ego pode virar carreira solo ou rompimento, e dá para negociar "dar um tempo". Desligado: nada muda.',
      'Band chemistry from relationships and ego; an ego crisis can turn into a solo career or a split, and a "break" can be negotiated. Off: nothing changes.')],
  mentor: [l('R33 · mentor e aprendiz', 'R33 · mentor and apprentice'),
    l('Um veterano dos seus atos ensina um novato: a habilidade do aprendiz sobe e o mentor fica mais animado. Desligado: nada muda.',
      'A veteran from your acts teaches a newcomer: the apprentice improves and the mentor is in better spirits. Off: nothing changes.')],
  opening: [l('R33 · turnê de abertura', 'R33 · opening-act tour'),
    l('Abrir para um nome maior: o novato ganha fãs do público do veterano; o veterano ganha frescor. Desligado: nada muda.',
      'Opening for a bigger name: the newcomer wins fans from the veteran\'s crowd; the veteran gets a fresh boost. Off: nothing changes.')],
  life: [l('R33 · ciclo de vida do artista', 'R33 · artist life cycle'),
    l('Fases da carreira (subida, auge, declínio, volta, despedida) e homenagem póstuma com o catálogo disparando. Desligado: nada muda.',
      'Career phases (rise, peak, decline, comeback, farewell) and posthumous tribute with the catalog surging. Off: nothing changes.')],
};
for (const k of Object.keys(SW33) as Sw33[]) {
  registerSwitch({ id: SW33[k], def: false, scope: 'game', desc: SW_TXT[k][1] });
  registerEditable({ id: `sw.${SW33[k]}`, area: 'tools', label: SW_TXT[k][0], kind: 'bool', get: (s) => sw<boolean>(s, SW33[k]), set: (s, v) => { setSw(s, SW33[k], !!v); } });
}
export const on33 = (s: GameState, k: Sw33): boolean => sw<boolean>(s, SW33[k]);

// ---------------------------------------------------------------- estado

export type Phase33 = 'rise' | 'peak' | 'decline' | 'comeback' | 'farewell' | 'gone';
export interface Mentor33 { m: string; since: number }
export interface Pes33 {
  /** química por ato (0..100), só bandas acompanhadas */
  chem: Record<string, number>;
  /** semana da última crise de ego por ato (pausa entre crises) */
  crisis: Record<string, number>;
  /** aprendiz → mentor */
  mentor: Record<string, Mentor33>;
  /** fase da carreira por ato e há quantos meses o momento está baixo */
  phase: Record<string, Phase33>;
  low: Record<string, number>;
  /** despedida: ato → semana em que encerra */
  farewell: Record<string, number>;
  /** catálogo disparando (fallback sem a CATÁLOGO): ato → { até a semana, multiplicador inicial } */
  surge: Record<string, { until: number; mult: number; from: number }>;
  /** pessoas já homenageadas */
  tributed: Record<string, 1>;
}
declare module '../ext4' { interface Ext4 { pes33: Pes33 } }
const fresh = (): Pes33 => ({ chem: {}, crisis: {}, mentor: {}, phase: {}, low: {}, farewell: {}, surge: {}, tributed: {} });
// sem registerExt4: o estado só nasce quando um interruptor liga (desligado, o save fica igual)

export function pes33(s: GameState): Pes33 {
  const x = ((s as unknown as { x4?: Record<string, unknown> }).x4 ??= {});
  const p = (x.pes33 ??= fresh()) as Pes33;
  for (const k of Object.keys(fresh()) as (keyof Pes33)[]) (p as unknown as Record<string, unknown>)[k] ??= {};
  return p;
}

// ---------------------------------------------------------------- regras comuns

const isFam = (id: string): boolean => id.startsWith('fam:');
const live = (s: GameState, a: Act): Person[] => a.members.map((id) => s.persons[id]).filter((p): p is Person => !!p?.alive && !isFam(p.id));
const mine = (a: Act): boolean => a.owner === 'player' || !!a.playerBand;
const tracked = (a: Act): boolean => mine(a) || a.fame > 25 || !!a.catalogNo || a.legend;
/** ato que estas regras não podem mexer (vida real exata ou Fossati no meio) */
const locked = (s: GameState, a: Act): boolean => histLocked(s, a) || a.members.some(isFam);

/** Ego 0..100: ambição da personalidade, objetivo solo, sede de fama e quanto a pessoa carrega a banda. */
export function ego33(s: GameState, p: Person, a?: Act): number {
  let v = (p.persona?.ambition ?? 50) * 0.55 + (p.goal === 'solo' ? 18 : 0) + (p.ambition === 'fame' ? 10 : 0);
  if (a) v += (a.leaderId === p.id || p.role === 'vocal' ? 8 : 0) + a.fame * 0.12;
  v -= (p.persona?.sociability ?? 50) * 0.12;
  return clamp(Math.round(v), 0, 100);
}

/** Química que a banda tende a ter agora (relações entre os integrantes, ressentimento, ego do maior). */
export function chemTarget33(s: GameState, a: Act): number {
  const ps = live(s, a);
  if (ps.length < 2) return 70;
  let rel = 0, n = 0;
  for (const p of ps) for (const q of ps) if (p !== q) { rel += p.rel?.[q.id] ?? 0; n += 1; }
  const avgRel = n ? rel / n : 0;
  const res = ps.reduce((x, p) => x + (p.resentment ?? 0), 0) / ps.length;
  const egos = ps.map((p) => ego33(s, p, a)).sort((x, y) => y - x);
  const clash = Math.max(0, egos[0] - 62) * 0.7 + Math.max(0, egos[1] - 62) * 0.5; // dois egos grandes brigam mais
  return clamp(Math.round(58 + avgRel * 0.3 - res * 0.35 - clash + (a.momentum > 60 ? 6 : 0)), 0, 100);
}
export const chem33 = (s: GameState, actId: string): number | undefined => pes33(s).chem[actId];

// ---------------------------------------------------------------- 1. ego e química

function egoMonth(s: GameState, r: Rng): void {
  const st = pes33(s);
  for (const a of Object.values(s.acts)) {
    if (a.status === 'retired' || a.status === 'split' || !tracked(a)) { delete st.chem[a.id]; continue; }
    const ps = live(s, a);
    if (ps.length < 2) { delete st.chem[a.id]; continue; }
    const cur = st.chem[a.id] ?? chemTarget33(s, a);
    let next = cur + (chemTarget33(s, a) - cur) * 0.25;
    if (a.status === 'hiatus') next += 4; // o tempo longe cura
    st.chem[a.id] = clamp(Math.round(next), 0, 100);
    if (a.status !== 'active' || locked(s, a)) continue;
    const top = ps.reduce((x, p) => (ego33(s, p, a) > ego33(s, x, a) ? p : x));
    const last = st.crisis[a.id] ?? -999;
    if (st.chem[a.id] >= 28 || ego33(s, top, a) < 65 || s.week - last < 52) continue;
    if (!r.chance(0.18)) continue;
    st.crisis[a.id] = s.week;
    if (mine(a)) emitCrisis(s, a, top);
    else npcCrisis(s, r, a, top);
  }
}

/** Integrante sai para carreira solo própria (sem contrato: o jogador pode assinar depois). */
export function goSolo33(s: GameState, r: Rng, a: Act, p: Person, leaves: boolean): Act {
  const solo = makeAct(s, r, { name: p.name, genre: a.genre, city: a.city, members: 1, potential: p.potential, formed: s.year, debutYear: s.year, fame: a.fame * 0.5 });
  delete s.persons[solo.members[0]];
  solo.members = [p.id];
  solo.leaderId = p.id;
  solo.status = 'active';
  solo.owner = null;
  solo.fans = { casual: Math.round(a.fans.casual * 0.2), active: Math.round(a.fans.active * 0.15), core: Math.round(a.fans.core * 0.1) };
  if (leaves) exitMember20(s, a, p.id);
  actsTouched17(s);
  remember(s, 'solo', fmtL(leaves ? l('{p} deixa {a}: o ego falou mais alto e a carreira solo começa.', '{p} leaves {a}: ego won and the solo career begins.')
    : l('{p} ({a}) lança carreira solo paralela.', '{p} ({a}) launches a parallel solo career.'), { p: p.name, a: a.name }), { actId: a.id, pid: p.id, important: a.fame > 40 || mine(a) });
  return solo;
}

/** Dar um tempo: pausa combinada; a química volta mais alta. */
export function takeBreak33(s: GameState, a: Act, weeks = 26): void {
  a.status = 'hiatus';
  a.hiatusUntil = Math.max(a.hiatusUntil ?? 0, s.week + weeks);
  const st = pes33(s);
  st.chem[a.id] = clamp((st.chem[a.id] ?? 40) + 20, 0, 100);
  for (const p of live(s, a)) p.resentment = clamp((p.resentment ?? 0) - 15, 0, 100);
  remember(s, 'hiatus', fmtL(l('{a} decide dar um tempo para salvar a banda.', '{a} decides to take a break to save the band.'), { a: a.name }), { actId: a.id, important: a.fame > 40 || mine(a) });
}

function npcCrisis(s: GameState, r: Rng, a: Act, p: Person): void {
  const chem = pes33(s).chem[a.id] ?? 30;
  const roll = r.next();
  if (chem < 12 && roll < 0.3) {
    a.status = 'split';
    a.careerEnd = s.year;
    a.legend = a.legend || a.fame > 50;
    remember(s, 'split', fmtL(l('Brigas de ego acabam com {a}.', 'Ego clashes break up {a}.'), { a: a.name }), { actId: a.id, important: a.fame > 30 || !!a.catalogNo });
  } else if (roll < 0.65) takeBreak33(s, a, 26 + r.int(0, 26));
  else goSolo33(s, r, a, p, r.chance(0.6));
}

function emitCrisis(s: GameState, a: Act, p: Person): void {
  s.decisions.push({
    id: `ego33:${a.id}:${s.week}`, eventId: 'ego33_crisis', cat: 'band', week: s.week, tags: [], defaultOption: 'break',
    title: fmtL(l('Crise de ego em {a}', 'Ego crisis in {a}'), { a: a.name }),
    text: fmtL(l('{p} quer mais espaço e a banda mal se fala. Dá para negociar uma pausa, deixar {p} seguir solo ou tentar uma conversa.',
      '{p} wants more room and the band is barely speaking. You can negotiate a break, let {p} go solo or try a talk.'), { p: p.name }),
    options: [
      { id: 'break', label: l('Dar um tempo (6 meses)', 'Take a break (6 months)'), hint: l('A química volta mais alta.', 'Chemistry comes back higher.') },
      { id: 'solo', label: l('Deixar seguir carreira solo', 'Let them go solo'), hint: l('Sai da banda; o solo fica livre para assinar.', 'Leaves the band; the solo act is free to sign.') },
      { id: 'side', label: l('Solo paralelo, banda segue', 'Side solo, band carries on'), hint: l('Ninguém sai; o ego se acalma um pouco.', 'Nobody leaves; the ego calms down a bit.') },
      { id: 'talk', label: l('Conversa com mediador ($3.000)', 'Mediated talk ($3,000)'), hint: l('Pode não dar certo.', 'It may not work.') },
    ],
    ctx: { act: a.id, person: p.id },
  });
}

type Ctx = Record<string, string | number>;
const ctxAct = (s: GameState, c: Ctx): Act | undefined => s.acts[String(c.act)];
const ctxPerson = (s: GameState, c: Ctx): Person | undefined => s.persons[String(c.person)];
deferEvents([{
  id: 'ego33_crisis', cat: 'band', tone: 'bad', tags: [], cooldown: 0, forcedOnly: true,
  title: l('Crise de ego em {act}', 'Ego crisis in {act}'),
  text: l('A banda precisa decidir como seguir.', 'The band must decide how to go on.'),
  options: [
    { id: 'break', label: l('Dar um tempo', 'Take a break'), apply: (s: GameState, _r: Rng, c: Ctx) => { const a = ctxAct(s, c); if (a) takeBreak33(s, a); } },
    { id: 'solo', label: l('Deixar seguir solo', 'Let them go solo'), apply: (s: GameState, r: Rng, c: Ctx) => { const a = ctxAct(s, c), p = ctxPerson(s, c); if (a && p?.alive && a.members.includes(p.id)) goSolo33(s, r, a, p, true); } },
    { id: 'side', label: l('Solo paralelo', 'Side solo'), apply: (s: GameState, r: Rng, c: Ctx) => { const a = ctxAct(s, c), p = ctxPerson(s, c); if (!a || !p?.alive) return; goSolo33(s, r, a, p, false); const st = pes33(s); st.chem[a.id] = clamp((st.chem[a.id] ?? 30) + 8, 0, 100); } },
    { id: 'talk', label: l('Conversa com mediador', 'Mediated talk'), apply: (s: GameState, r: Rng, c: Ctx) => {
      const a = ctxAct(s, c), p = ctxPerson(s, c); if (!a) return;
      post(s, `ego33talk:${a.id}`, -money(s, 3000), 'artist_dev', 'Mediador');
      const st = pes33(s);
      if (r.chance(0.55)) { st.chem[a.id] = clamp((st.chem[a.id] ?? 30) + 18, 0, 100); if (p) p.resentment = clamp((p.resentment ?? 0) - 10, 0, 100); notify(s, fmtL(l('A conversa funcionou: {a} volta a se entender.', 'The talk worked: {a} is getting along again.'), { a: a.name }), 'good'); }
      else { if (p) p.morale = clamp(p.morale - 6, 0, 100); notify(s, fmtL(l('A conversa em {a} não resolveu.', 'The talk in {a} solved nothing.'), { a: a.name }), 'bad'); }
    } },
  ],
}]);

// banda com química boa grava melhor; banda em guerra, pior (no máximo ±5%)
registerMod('songQ', 'pes33chem', (s, v, c) => {
  if (!c.act || !on33(s, 'ego')) return null;
  const ch = pes33(s).chem[c.act.id];
  if (ch === undefined) return null;
  const f = 1 + clamp((ch - 50) / 1000, -0.05, 0.05);
  return { value: v * f, label: l('Química da banda', 'Band chemistry') };
});

// ---------------------------------------------------------------- 2. mentor e aprendiz

export const MENTOR_WEEKS33 = 104;
const actOfPerson = (s: GameState, pid: string): Act | undefined => Object.values(s.acts).find((a) => a.members.includes(pid) && a.status !== 'split');
const skillSum = (p: Person): number => Object.values(p.skills).reduce((x, y) => x + y, 0);

/** Motivo pelo qual o par não pode ser feito (undefined = pode). */
export function mentorLock33(s: GameState, mentorId: string, apprenticeId: string): L | undefined {
  if (!on33(s, 'mentor')) return l('Mentoria desligada nesta partida.', 'Mentoring is off in this game.');
  const m = s.persons[mentorId], a = s.persons[apprenticeId];
  if (!m?.alive || !a?.alive || m.id === a.id || isFam(m.id) || isFam(a.id)) return l('Escolha duas pessoas vivas e diferentes.', 'Pick two different living people.');
  const am = actOfPerson(s, m.id), aa = actOfPerson(s, a.id);
  if (!am || !aa || !mine(am) || !mine(aa)) return l('Mentor e aprendiz precisam ser dos seus atos.', 'Mentor and apprentice must be from your acts.');
  if (s.year - m.born < s.year - a.born + 8 && skillSum(m) < skillSum(a) + 40) return l('O mentor precisa ser mais velho ou bem mais experiente.', 'The mentor must be older or much more experienced.');
  const st = pes33(s);
  if (st.mentor[a.id]) return l('Essa pessoa já tem mentor.', 'This person already has a mentor.');
  if (Object.values(st.mentor).filter((x) => x.m === m.id).length >= 2) return l('Esse mentor já tem dois aprendizes.', 'This mentor already has two apprentices.');
  return undefined;
}
export function mentorPair33(s: GameState, mentorId: string, apprenticeId: string): L | undefined {
  const why = mentorLock33(s, mentorId, apprenticeId);
  if (why) return why;
  pes33(s).mentor[apprenticeId] = { m: mentorId, since: s.week };
  remember(s, 'mentor', fmtL(l('{m} passa a orientar {a}.', '{m} starts mentoring {a}.'), { m: s.persons[mentorId].name, a: s.persons[apprenticeId].name }), { pid: apprenticeId });
  return undefined;
}
export function mentorEnd33(s: GameState, apprenticeId: string): void { delete pes33(s).mentor[apprenticeId]; }
export const mentorOf33 = (s: GameState, pid: string): string | undefined => pes33(s).mentor[pid]?.m;
export const apprenticesOf33 = (s: GameState, pid: string): string[] => Object.entries(pes33(s).mentor).filter(([, v]) => v.m === pid).map(([k]) => k);

function mentorMonth(s: GameState): void {
  const st = pes33(s);
  for (const [aid, v] of Object.entries(st.mentor)) {
    const a = s.persons[aid], m = s.persons[v.m];
    if (!a?.alive) { delete st.mentor[aid]; continue; }
    if (!m?.alive) {
      delete st.mentor[aid];
      a.inspiration = clamp(a.inspiration + 20, 0, 100);
      remember(s, 'mentor', fmtL(l('{a} homenageia {m}, o mentor que se foi.', '{a} pays tribute to {m}, the mentor who passed.'), { a: a.name, m: m?.name ?? '?' }), { pid: aid, important: true });
      continue;
    }
    if (s.week - v.since >= MENTOR_WEEKS33) {
      delete st.mentor[aid];
      remember(s, 'mentor', fmtL(l('{a} conclui a mentoria com {m}.', '{a} completes the mentorship with {m}.'), { a: a.name, m: m.name }), { pid: aid });
      continue;
    }
    // o aprendiz aproxima as habilidades das do mentor (até o próprio potencial)
    for (const k of Object.keys(a.skills) as (keyof Person['skills'])[]) {
      const gap = (m.skills[k] ?? 0) - a.skills[k];
      if (gap > 0) a.skills[k] = Math.min(a.potential + 2, a.skills[k] + Math.min(0.6, gap * 0.04));
    }
    a.inspiration = clamp(a.inspiration + 1, 0, 100);
    m.morale = clamp(m.morale + 1, 0, 100);
    m.fatigue = clamp(m.fatigue + 0.5, 0, 100);
    m.rel[a.id] = clamp((m.rel[a.id] ?? 0) + 1, -100, 100);
    a.rel[m.id] = clamp((a.rel[m.id] ?? 0) + 1.5, -100, 100);
  }
}

// ---------------------------------------------------------------- 3. turnê de abertura

/** Um show tocado (gancho 'show' do motor de turnês). */
export function openingShow33(s: GameState, show: { tourId: string; sold: number }): void {
  if (!on33(s, 'opening')) return;
  const t = s.tours.find((x) => x.id === show.tourId);
  if (!t || t.role !== 'opening' || !t.partnerActId) return;
  const nov = s.acts[t.actId], vet = s.acts[t.partnerActId];
  if (!nov || !vet) return;
  const sold = show.sold;
  const gap = clamp((vet.fame - nov.fame) / 50, 0, 1); // quanto maior o veterano, mais público novo
  nov.fans.casual += Math.round(sold * 0.04 * gap);
  nov.fans.active += Math.round(sold * 0.012 * gap);
  nov.fame = clamp(nov.fame + 0.08 * gap, 0, 100);
  // frescor: o veterano aparece ao lado de quem está chegando
  if (nov.formed > vet.formed) vet.momentum = clamp(vet.momentum + 0.35 * (vet.momentum < 50 ? 1.5 : 1), 0, 100);
}
registerSimHook('show', 'pes33open', (s, _r, arg) => { if (arg.show) openingShow33(s, arg.show); });

// ---------------------------------------------------------------- 4. ciclo de vida

/** Gancho da CATÁLOGO: dispara o catálogo do ato (multiplicador inicial, semanas). Devolve true se tratou. */
type Surge33 = (s: GameState, actId: string, mult: number, weeks: number) => boolean;
let SURGE: Surge33 | null = null;
export function setCatalogSurge33(fn: Surge33 | null): void { SURGE = fn; }

export const phase33 = (s: GameState, actId: string): Phase33 | undefined => pes33(s).phase[actId];
export const PHASE_NAME33: Record<Phase33, L> = {
  rise: l('subida', 'rise'), peak: l('auge', 'peak'), decline: l('declínio', 'decline'), comeback: l('volta', 'comeback'),
  farewell: l('despedida', 'farewell'), gone: l('lenda', 'legend'),
};

/** Despedida: um ano de turnê e lançamentos com demanda maior; depois o ato se aposenta como lenda. */
export function farewellLock33(s: GameState, a: Act): L | undefined {
  if (!on33(s, 'life')) return l('Ciclo de vida desligado nesta partida.', 'Life cycle is off in this game.');
  if (!mine(a)) return l('Só para atos seus.', 'Only for your acts.');
  if (locked(s, a)) return l('Na vida real exata, o roteiro real decide.', 'In exact real-life mode, the real script decides.');
  if (a.status !== 'active') return l('O ato precisa estar na ativa.', 'The act must be active.');
  if (pes33(s).farewell[a.id]) return l('A despedida já foi anunciada.', 'The farewell is already announced.');
  if (s.year - a.debutYear < 8) return l('Cedo demais para se despedir.', 'Too early to say goodbye.');
  return undefined;
}
export function farewell33(s: GameState, a: Act): L | undefined {
  const why = farewellLock33(s, a);
  if (why) return why;
  startFarewell(s, a);
  return undefined;
}
function startFarewell(s: GameState, a: Act): void {
  const st = pes33(s);
  st.farewell[a.id] = s.week + 52;
  st.phase[a.id] = 'farewell';
  a.momentum = clamp(a.momentum + 15, 0, 100);
  remember(s, 'farewell', fmtL(l('{a} anuncia a turnê de despedida.', '{a} announces a farewell tour.'), { a: a.name }), { actId: a.id, important: true });
}

registerMod('cityDemand', 'pes33farewell', (s, v, c) => {
  if (!c.act || !on33(s, 'life')) return null;
  const ph = pes33(s).phase[c.act.id];
  if (ph === 'farewell') return { value: v * 1.6, label: l('Turnê de despedida', 'Farewell tour') };
  if (ph === 'comeback') return { value: v * 1.15, label: l('Volta aos palcos', 'Comeback') };
  return null;
});
registerMod('chartUnits', 'pes33surge', (s, v, c) => {
  if (!c.release || !on33(s, 'life')) return null;
  const g = pes33(s).surge[c.release.actId];
  if (!g || s.week >= g.until) return null;
  const left = (g.until - s.week) / Math.max(1, g.until - g.from);
  return { value: v * (1 + (g.mult - 1) * left), label: l('Homenagem póstuma', 'Posthumous tribute') };
});

function tribute(s: GameState, a: Act, p: Person): void {
  const st = pes33(s);
  st.tributed[p.id] = 1;
  const big = a.fame > 45 || a.legend || !!a.catalogNo;
  const mult = big ? 3 : 1.8, weeks = big ? 26 : 13;
  if (!SURGE?.(s, a.id, mult, weeks)) st.surge[a.id] = { until: s.week + weeks, mult, from: s.week }; // fallback sem a CATÁLOGO
  a.momentum = clamp(a.momentum + (big ? 30 : 15), 0, 100);
  a.fans.casual += Math.round(a.fans.casual * 0.15 + a.fans.core * 0.5);
  if (big) a.legend = true;
  if (!live(s, a).length) st.phase[a.id] = 'gone';
  remember(s, 'tribute', fmtL(l('Homenagens a {p} levam o catálogo de {a} de volta às paradas.', 'Tributes to {p} send {a}\'s catalog back up the charts.'), { p: p.name, a: a.name }), { actId: a.id, pid: p.id, important: big || mine(a) });
}

function lifeMonth(s: GameState, r: Rng): void {
  const st = pes33(s);
  for (const [id, g] of Object.entries(st.surge)) if (s.week >= g.until) delete st.surge[id];
  for (const a of Object.values(s.acts)) {
    if (!tracked(a) || a.members.some(isFam)) continue;
    // homenagem póstuma: integrante que morreu neste ano (vale também para real no modo exato)
    // quem morreu e já saiu da formação (substituído pelo ciclo da r7) também entra
    const gone = (rw(s)?.former?.[a.id] ?? []).filter((f) => f.reason === 'died').map((f) => f.personId);
    for (const id of new Set([...a.members, ...gone])) {
      const p = s.persons[id];
      if (p && !p.alive && !st.tributed[p.id] && (p.died ?? 0) >= s.year - 1 && (a.fame > 25 || mine(a) || !!a.catalogNo)) tribute(s, a, p);
    }
    if (a.status === 'split' || (a.status === 'retired' && st.phase[a.id] !== 'farewell')) continue;
    const prev = st.phase[a.id];
    // fim da despedida
    if (prev === 'farewell') {
      if (s.week >= (st.farewell[a.id] ?? 0)) {
        delete st.farewell[a.id];
        st.phase[a.id] = 'gone';
        a.status = 'retired';
        a.careerEnd = s.year;
        a.legend = a.legend || a.fame > 35;
        remember(s, 'retire', fmtL(l('{a} faz o último show e se despede dos palcos.', '{a} plays the last show and leaves the stage.'), { a: a.name }), { actId: a.id, important: true });
      }
      continue;
    }
    if (a.status !== 'active') continue;
    st.low[a.id] = a.momentum < 28 ? (st.low[a.id] ?? 0) + 1 : 0;
    if (!st.low[a.id]) delete st.low[a.id];
    const years = s.year - a.debutYear;
    let next: Phase33 = prev ?? 'rise';
    if (a.fame >= 60 && a.momentum >= 55) next = prev === 'decline' ? 'comeback' : prev === 'comeback' ? 'comeback' : 'peak';
    else if ((prev === 'peak' || prev === 'comeback' || (years > 6 && prev === 'rise')) && (st.low[a.id] ?? 0) >= 6) next = 'decline';
    else if (prev === 'decline' && a.momentum >= 50) next = 'comeback';
    else if (prev === 'comeback' && a.momentum < 35) next = 'decline';
    if (next !== prev) {
      st.phase[a.id] = next;
      if (prev && (next === 'peak' || next === 'decline' || next === 'comeback') && (a.fame > 35 || mine(a))) {
        const txt = next === 'peak' ? l('{a} vive o auge da carreira.', '{a} is at the peak of their career.')
          : next === 'decline' ? l('A estrela de {a} começa a apagar.', '{a}\'s star begins to fade.')
            : l('{a} está de volta: a volta por cima vira notícia.', '{a} is back: the comeback makes the news.');
        remember(s, 'phase33', fmtL(txt, { a: a.name }), { actId: a.id, important: next !== 'decline' && a.fame > 50 });
      }
      if (next === 'comeback') a.fans.core += Math.round(a.fans.core * 0.05); // os antigos fãs voltam
    }
    // NPC veterano em declínio pode anunciar a despedida (nunca real travado)
    if (!mine(a) && !locked(s, a) && next === 'decline' && years >= 15 && a.fame > 40) {
      const old = live(s, a).some((p) => s.year - p.born >= 62);
      if (old && r.chance(0.02)) startFarewell(s, a);
    }
  }
}

// ---------------------------------------------------------------- tick

/** Mês das regras de PESSOAS (o gancho mensal chama; exportado para o teste). */
export function pes33Month(s: GameState, r: Rng): void {
  const e = on33(s, 'ego'), m = on33(s, 'mentor'), lf = on33(s, 'life');
  if (!e && !m && !lf) return;
  if (e) egoMonth(s, r);
  if (m) mentorMonth(s);
  if (lf) lifeMonth(s, r);
}
registerSimHook('month', 'pes33', pes33Month);
