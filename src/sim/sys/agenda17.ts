// Rodada 17 (H) — agenda de verdade e contratação.
// • Bolinhas: 5 pessoais por mês (a banda não come mais uma) + 2 de EXPEDIENTE que só as carreiras usam.
//   Cada carreira ativa ocupa bolinhas conforme o envolvimento: à frente (2, melhor resultado), normal (1) ou
//   delegada (0: um diretor contratado toca, com salário e qualidade pela habilidade). O que passa do expediente
//   come as pessoais; o que passa das pessoais é sobrecarga (estresse via stress17 e queda em todas as frentes).
// • Negócio sem a carreira (ex.: festival sem ser "dono de festival") roda com um diretor contratado ou fica
//   ao deus-dará (reputação cai todo mês). Picos de calendário (semana do festival, mês de lançamento da sua
//   banda) custam +1 bolinha; os dois no mesmo mês = conflito de agenda.
// • Contratação: candidatos por função (busca, filtro, negociação de salário, recusa), empresários e produtores
//   reais disponíveis na época, freelancers por ação (promotor independente/jabá, assessoria de crise, booker de
//   uma noite, consultor de imagem), músicos de estúdio (Wrecking Crew, Funk Brothers, Swampers…), orquestra e
//   banda de apoio de turnê. Chefe de gabinete (+1 expediente), rede de contatos pessoal e ações do "Você".
// Aleatoriedade: geradores próprios (semente + mês/trimestre). Publica Fatos 'hire', 'fire', 'agenda'.

import { Rng, clamp } from '../../core/rng';
import { STAFF_ROLES } from '../../data/rules';
import { REAL_MGRS } from '../../data/managers14';
import { REAL_PRODS } from '../../data/producers15';
import { familyOf, l, type FamilyId, type L } from '../../data/world';
import { hqCaps } from '../branches';
import { registerExt4, registerSimHook } from '../ext4';
import { emitFact } from '../facts17';
import { personName } from '../people';
import { bumpPerks, registerPerkSource, type PerkEntry } from '../perks';
import { scandal } from '../scandal17';
import { addStress, relieveLong } from '../stress17';
import type { Act, GameState, StaffMember } from '../types';
import { fmtL, money, nextId, notify, playerActs, post } from '../util';
import { careerDef, careers, registerLoad } from './careers12';
import { addHype } from './hype12';
import { bindAgenda17, energyLeft, maxEnergy, playerAct, playerPerson, spendEnergy } from './life';
import { ownerOf } from './people/owner';
import { ventures, type VKind } from './ventures9';
import { mgrActive, mgrCap, mgrName, rosterOf } from './managers14';
import { prodActive, prodName } from './producers15';
import { liveOf } from './live/state';

export type Inv = 'lead' | 'normal' | 'deleg';
export interface Head { id: string; name: string; skill: number; salary: number; since: number; trait: string }
export interface Sess17 { crew: string; actId: string; start: number; until: number; q: number; kind: 'studio' | 'orch' | 'backing'; monthly: number; fam: FamilyId[] }
export interface Ag17 {
  inv: Record<string, Inv>;
  heads: Record<string, Head>;
  chief?: Head;
  sp: { mk: number; it: [L, number][] };
  net: Record<string, number>;
  used: Record<string, number>;
  sess: Sess17[];
  img: { actId: string; until: number; v: number }[];
  rep: { mk: number; t: L; tone: 'good' | 'bad' | 'info' }[];
  over: number;
}
declare module '../ext4' { interface Ext4 { agenda17: Ag17 } }
const fresh = (): Ag17 => ({ inv: {}, heads: {}, sp: { mk: -1, it: [] }, net: {}, used: {}, sess: [], img: [], rep: [], over: 0 });
registerExt4('agenda17', fresh);
export function ag17(s: GameState): Ag17 {
  const x = s.x4 as unknown as { agenda17?: Ag17 };
  const a = (x.agenda17 ??= fresh());
  a.inv ??= {}; a.heads ??= {}; a.net ??= {}; a.used ??= {}; a.sess ??= []; a.img ??= []; a.rep ??= []; a.sp ??= { mk: -1, it: [] };
  return a;
}
const mk = (s: GameState) => s.year * 12 + s.month;
const quarter = (s: GameState) => s.year * 4 + Math.floor(s.month / 3);
const report = (s: GameState, t: L, tone: 'good' | 'bad' | 'info' = 'info') => { const a = ag17(s); a.rep.unshift({ mk: mk(s), t, tone }); if (a.rep.length > 40) a.rep.length = 40; };

// ================================================================ bolinhas

export const OFFICE = 2;
export const INV_NAME: Record<Inv, L> = { lead: l('À frente', 'Hands-on'), normal: l('Normal', 'Normal'), deleg: l('Delegada', 'Delegated') };
export const INV_DESC: Record<Inv, L> = {
  lead: l('2 bolinhas: você cuida de tudo pessoalmente. Resultado +12% (reputação, qualidade, satisfação).', '2 balls: you handle everything personally. Results +12% (reputation, quality, satisfaction).'),
  normal: l('1 bolinha: acompanha o essencial. Resultado normal.', '1 ball: you keep up with the essentials. Normal results.'),
  deleg: l('0 bolinha: um diretor contratado toca. Custa salário; o resultado vai de −25% (fraco) a +3% (excelente) pela habilidade dele.', '0 balls: a hired director runs it. Costs a salary; results range from −25% (weak) to +3% (excellent) by their skill.'),
};
const BALLS: Record<Inv, number> = { lead: 2, normal: 1, deleg: 0 };
/** Carreira → negócios que ela comanda. */
export const CAREER_KIND: Partial<Record<string, VKind>> = { festival: 'festival', booking: 'booking', studio: 'studio', publisher: 'publisher', media: 'media', platform: 'platform' };

export const invOf = (s: GameState, id: string): Inv => {
  const v = ag17(s).inv[id] ?? 'normal';
  return v === 'deleg' && !ag17(s).heads[id] ? 'normal' : v;
};
export const officeCap = (s: GameState): number => OFFICE + (ag17(s).chief ? 1 : 0);

/** Pico de calendário da carreira neste mês (+1 bolinha se você não delegou). */
export function crunch(s: GameState, id: string): L | null {
  if (id === 'festival' && ventures(s).list.some((v) => v.kind === 'festival' && v.month === s.month && v.lineup?.length)) return l('semana do seu festival', 'your festival week');
  if (id === 'musician') { const b = playerAct(s); if (b && s.pendingReleases.some((p) => p.actId === b.id && p.week >= s.week - 1 && p.week < s.week + 5)) return l('lançamento da sua banda', 'your band\'s release'); }
  return null;
}
export interface CareerBall { id: string; n: number; why: L }
export function careerBalls(s: GameState): CareerBall[] {
  const out: CareerBall[] = [];
  for (const id of careers(s).active) {
    const d = careerDef(id); if (!d) continue;
    const inv = invOf(s, id);
    let n = BALLS[inv];
    const c = inv !== 'deleg' ? crunch(s, id) : null;
    if (c) n += 1;
    out.push({ id, n, why: fmtL(c ? l('{c} ({i}) + pico: {p}', '{c} ({i}) + peak: {p}') : l('{c} ({i})', '{c} ({i})'), { c: d.name, i: INV_NAME[inv], p: c ?? l('', '') }) });
  }
  return out;
}
export const reserved = (s: GameState): number => careerBalls(s).reduce((t, x) => t + x.n, 0);
/** Bolinhas de carreira que passam do expediente e comem o tempo pessoal. */
export const overflow = (s: GameState): number => Math.max(0, reserved(s) - officeCap(s));
/** Quanto a agenda estoura até as bolinhas pessoais (sobrecarga). */
export const overbooked = (s: GameState): number => Math.max(0, overflow(s) - maxEnergy(s));

bindAgenda17({
  reserve: (s) => overflow(s),
  spent: (s, n) => { const a = ag17(s); if (a.sp.mk !== mk(s)) a.sp = { mk: mk(s), it: [] }; a.sp.it.push([tag ?? l('Decisão pessoal', 'Personal decision'), n]); },
});
let tag: L | null = null;
/** A interface diz em que a próxima bolinha vai ser gasta (rótulo do botão); some depois do clique. */
export function setSpendTag(t: L | null): void { tag = t; }

export interface Ball { k: 'office' | 'career' | 'spent' | 'free' | 'over' | 'spare'; tip: L }
/** As bolinhas do mês, na ordem: expediente (carreiras) e pessoais (carreiras que transbordam, gastos, livres). */
export function balls(s: GameState): { office: Ball[]; personal: Ball[]; over: Ball[] } {
  const cb = careerBalls(s).flatMap((c) => Array.from({ length: c.n }, () => c.why));
  const oc = officeCap(s);
  const office: Ball[] = Array.from({ length: oc }, (_, i) => (cb[i] ? { k: 'career', tip: cb[i] } : { k: 'spare', tip: l('Expediente livre: só carreiras usam (comece uma ou fique à frente de uma).', 'Free office slot: only careers use it (start one or go hands-on).') }));
  const spill = cb.slice(oc);
  const max = maxEnergy(s);
  const personal: Ball[] = [];
  for (const w of spill.slice(0, max)) personal.push({ k: 'career', tip: fmtL(l('Carreira fora do expediente: {w}', 'Career beyond office hours: {w}'), { w }) });
  const a = ag17(s);
  const items = a.sp.mk === mk(s) ? a.sp.it.flatMap(([t, n]) => Array.from({ length: n }, () => t)) : [];
  const used = Math.max(0, max - personal.length - energyLeft(s));
  for (let i = 0; i < used && personal.length < max; i++) personal.push({ k: 'spent', tip: items[i] ?? l('Gasta (decisão pessoal)', 'Spent (personal decision)') });
  while (personal.length < max) personal.push({ k: 'free', tip: l('Livre: use em Você, vida, viagens, reuniões e scouting em pessoa.', 'Free: use it on You, life, travel, in-person meetings and scouting.') });
  const over: Ball[] = spill.slice(max).map((w) => ({ k: 'over', tip: fmtL(l('SOBRECARGA: {w} — estresse e queda de resultado', 'OVERBOOKED: {w} — stress and weaker results'), { w }) }));
  return { office, personal, over };
}

// ================================================================ qualidade por carreira

export function careerQ(s: GameState, id: string): { f: number; why: L } {
  const a = ag17(s), on = careers(s).active.includes(id), hd = a.heads[id];
  let f: number, why: L;
  if (on && invOf(s, id) === 'lead') { f = 1.12; why = l('você à frente', 'you hands-on'); }
  else if (on && invOf(s, id) === 'normal') { f = 1; why = l('você acompanha', 'you keep up'); }
  else if (hd) { f = 0.75 + 0.28 * hd.skill / 100; why = fmtL(l('{n} dirige (hab. {k})', '{n} runs it (skill {k})'), { n: hd.name, k: hd.skill }); }
  else { f = 0.72; why = l('ninguém no comando (sem a carreira e sem diretor)', 'nobody in charge (no career, no director)'); }
  if (overbooked(s) > 0) { f *= 0.9; why = l(why.pt + ' · sobrecarga −10%', why.en + ' · overbooked −10%'); }
  return { f, why };
}

// carga de agenda dos careers12: à frente pesa mais, delegada quase nada
registerLoad('agenda17', (s) => careers(s).active.reduce((t, id) => { const d = careerDef(id); const i = invOf(s, id); return t + (d ? (i === 'lead' ? d.load * 0.5 : i === 'deleg' ? -d.load * 0.8 : 0) : 0); }, 0));

const playerBandId = (s: GameState) => playerAct(s)?.id;
registerPerkSource('agenda17', (s) => {
  const a = ag17(s), out: PerkEntry[] = [];
  if (careers(s).active.includes('label')) {
    const q = careerQ(s, 'label');
    if (Math.abs(q.f - 1) > 0.01) out.push({ label: fmtL(l('Selo: {w}', 'Label: {w}'), { w: q.why }), values: { songQ: (q.f - 1) * 3.5, appeal: (q.f - 1) * 0.25 } });
  }
  if (careers(s).active.includes('musician')) {
    const q = careerQ(s, 'musician'), b = playerBandId(s);
    if (b && Math.abs(q.f - 1) > 0.01) out.push({ label: fmtL(l('Sua banda: {w}', 'Your band: {w}'), { w: q.why }), values: { appeal: (q.f - 1) * 0.3 }, act: (_s, x) => x.id === b });
  }
  if (overbooked(s) > 0) out.push({ label: l('Agenda estourada', 'Overbooked schedule'), values: { stress: 0.15 } });
  const m = mk(s);
  for (const x of a.sess) if (x.until >= m) {
    const crew = crewById(x.crew);
    const nm = crew ? crewName(s, crew) : l(x.crew, x.crew);
    if (x.kind === 'backing') out.push({ label: fmtL(l('Banda de apoio: {n}', 'Backing band: {n}'), { n: nm }), values: { showRevenue: 0.04 + 0.1 * x.q }, act: (_s, y) => y.id === x.actId });
    else out.push({ label: fmtL(l('Músicos de estúdio: {n}', 'Session players: {n}'), { n: nm }), values: { songQ: 0.4 + 1.6 * x.q, appeal: crew?.snd && x.q >= crew.q ? 0.015 : 0 }, act: (_s, y) => y.id === x.actId });
  }
  for (const x of a.img) if (x.until >= m) out.push({ label: l('Consultor de imagem', 'Image consultant'), values: { appeal: x.v }, act: (_s, y) => y.id === x.actId });
  return out;
});

// ================================================================ candidatos (equipe, diretores, chefe)

export interface Cand { id: string; name: string; role: string; skill: number; ask: number; trait: string; real?: string; note?: L }
const TRAITS = ['disciplined', 'workaholic', 'diplomatic', 'perfectionist', 'lazy', 'ambitious', 'loyal', 'opportunist'];
const LANGS = ['en', 'pt', 'es', 'fr', 'de', 'it'] as const;
const repAvg = (s: GameState) => { const R = s.player.reputation; return (R.artistic + R.commercial + R.artists + R.institutional) / 4; };
export const netOf = (s: GameState, k: string): number => Math.round(ag17(s).net[k] ?? 0);
/** Setor da rede de contatos que ajuda cada função. */
export const SECTOR: Record<string, string> = { producer: 'studio', engineer: 'studio', anr: 'label', publicist: 'media', tour_manager: 'live', analyst: 'label', rights: 'label', admin: 'label', booking: 'live', manufacturing: 'label', legal: 'label', designer: 'media', manager: 'artists', agent: 'live', sync: 'media', booking_agent: 'live', promoter: 'media' };
export const SECTORS: { id: string; name: L }[] = [
  { id: 'label', name: l('Gravadoras e escritórios', 'Labels and offices') }, { id: 'studio', name: l('Estúdios e produtores', 'Studios and producers') },
  { id: 'live', name: l('Shows e estrada', 'Live and touring') }, { id: 'media', name: l('Imprensa e rádio', 'Press and radio') }, { id: 'artists', name: l('Artistas e empresários', 'Artists and managers') },
];
const salaryFor = (s: GameState, base: number, skill: number) => money(s, base * (0.5 + skill / 100));

/** Candidatos do trimestre (qualidade puxada pela reputação do selo e pela sua rede no setor). */
export function staffCands(s: GameState, role?: string): Cand[] {
  const a = ag17(s), q = quarter(s), out: Cand[] = [];
  for (const def of STAFF_ROLES) {
    if (role && def.id !== role) continue;
    const r = Rng.fromSeed(`${s.config.seed}:ag17:c:${q}:${def.id}`);
    const mean = 34 + repAvg(s) / 4 + netOf(s, SECTOR[def.id] ?? 'label') / 4;
    for (let i = 0; i < 2; i++) {
      const skill = clamp(Math.round(r.normal(mean, 13)), 15, 95);
      const id = `c17:${q}:${def.id}:${i}`;
      const nm = personName(r, r.pick(LANGS)), tr = r.pick(TRAITS);
      if (a.used[id]) continue;
      out.push({ id, name: nm, role: def.id, skill, ask: salaryFor(s, def.salary, skill), trait: tr });
    }
  }
  // gente real disponível na época (empresários com vaga na agenda, produtores em atividade)
  if (!role || role === 'manager') for (const m of REAL_MGRS) if (mgrActive(s, m) && rosterOf(s, m.id).length < mgrCap(m)) {
    const id = `c17:e:${m.id}`; if (a.used[id] && a.used[id] > mk(s) - 12) continue;
    const skill = Math.round((m.a[0] + m.a[1] + m.a[2] + m.a[3] + m.a[4]) / 5);
    out.push({ id, name: mgrName(s, m), role: 'manager', skill, ask: Math.round(salaryFor(s, 3000, skill) * 1.6), trait: 'ambitious', real: `e:${m.id}`, note: fmtL(l('Empresário(a) real em atividade · {n} clientes próprios', 'Real manager, active · {n} own clients'), { n: rosterOf(s, m.id).length }) });
  }
  if (!role || role === 'producer') for (const p of REAL_PRODS) if (prodActive(s, p)) {
    const id = `c17:pd:${p.id}`; if (a.used[id] && a.used[id] > mk(s) - 12) continue;
    out.push({ id, name: prodName(s, p), role: 'producer', skill: clamp(p.skill, 20, 98), ask: Math.round(salaryFor(s, 3200, p.skill) * (1 + p.tier * 0.35)), trait: p.ego > 70 ? 'perfectionist' : 'disciplined', real: `pd:${p.id}`, note: fmtL(l('Produtor(a) real · {snd} · ego {e}', 'Real producer · {snd} · ego {e}'), { snd: p.snd, e: p.ego }) });
  }
  return out;
}

/** Diretores para uma carreira/negócio (sem a carreira, é assim que o negócio anda). */
export function headCands(s: GameState, career: string): Cand[] {
  const a = ag17(s), q = quarter(s), r = Rng.fromSeed(`${s.config.seed}:ag17:h:${q}:${career}`), out: Cand[] = [];
  const mean = 40 + repAvg(s) / 4 + netOf(s, career === 'festival' || career === 'booking' || career === 'venue' ? 'live' : career === 'media' ? 'media' : career === 'studio' ? 'studio' : career === 'manager' ? 'artists' : 'label') / 4;
  for (let i = 0; i < 3; i++) {
    const skill = clamp(Math.round(r.normal(mean, 14)), 20, 95), id = `h17:${q}:${career}:${i}`, nm = personName(r, r.pick(LANGS)), tr = r.pick(TRAITS);
    if (!a.used[id]) out.push({ id, name: nm, role: `head:${career}`, skill, ask: salaryFor(s, 4200, skill), trait: tr });
  }
  return out;
}
export function chiefCands(s: GameState): Cand[] {
  const a = ag17(s), q = quarter(s), r = Rng.fromSeed(`${s.config.seed}:ag17:chief:${q}`), out: Cand[] = [];
  for (let i = 0; i < 3; i++) {
    const skill = clamp(Math.round(r.normal(45 + repAvg(s) / 5, 14)), 20, 95), id = `k17:${q}:${i}`, nm = personName(r, r.pick(LANGS)), tr = r.pick(TRAITS);
    if (!a.used[id]) out.push({ id, name: nm, role: 'chief', skill, ask: salaryFor(s, 3600, skill), trait: tr });
  }
  return out;
}

/** Chance de aceitar uma proposta de salário (pct = fração do pedido). Pura, para a interface mostrar. */
export function acceptChance(s: GameState, c: Cand, pct: number): number {
  const sec = c.role.startsWith('head:') ? 'label' : SECTOR[c.role] ?? 'label';
  return clamp((c.real ? 0.35 : 0.6) + (pct - 1) * 1.8 + netOf(s, sec) / 250 + (repAvg(s) - 50) / 200 + (c.trait === 'opportunist' ? (pct - 1) * 1.2 : c.trait === 'loyal' ? 0.05 : 0), 0.02, 0.98);
}

export interface Res17 { ok: boolean; text: L }
function pickCand(s: GameState, id: string): Cand | undefined {
  if (id.startsWith('h17:')) return headCands(s, id.split(':')[2]).find((c) => c.id === id);
  if (id.startsWith('k17:')) return chiefCands(s).find((c) => c.id === id);
  return staffCands(s).find((c) => c.id === id);
}
/** Proposta de salário: aceita (contrata) ou recusa (a pessoa some da lista neste trimestre). */
export function negotiate(s: GameState, candId: string, pct: number): Res17 {
  const a = ag17(s), c = pickCand(s, candId);
  if (!c) return { ok: false, text: l('Candidato indisponível.', 'Candidate unavailable.') };
  const isStaff = !c.role.startsWith('head:') && c.role !== 'chief';
  if (isStaff && s.player.staff.length >= hqCaps(s).staff) return { ok: false, text: l('Sede sem vagas para equipe. Amplie a sede (diretores e chefe de gabinete não ocupam vaga).', 'No staff room in the HQ. Upgrade it (directors and chief of staff take no seat).') };
  const salary = Math.round(c.ask * pct), signOn = Math.round(salary * 0.5);
  if (s.player.cash < signOn) return { ok: false, text: l('Caixa insuficiente para as luvas (meio salário).', 'Not enough cash for the signing fee (half a salary).') };
  const r = Rng.fromSeed(`${s.config.seed}:ag17:neg:${candId}:${s.week}:${Math.round(pct * 100)}`);
  const p = acceptChance(s, c, pct);
  a.used[candId] = mk(s);
  if (!r.chance(p)) return { ok: false, text: fmtL(l('{n} recusou {v}/mês ({p}% de chance). Não volta a conversar neste trimestre.', '{n} turned down {v}/month ({p}% chance). Won\'t talk again this quarter.'), { n: c.name, v: usd(salary), p: Math.round(p * 100) }) };
  post(s, `ag17:hire:${candId}`, -signOn, 'salaries', `Contratação ${c.name}`);
  const head: Head = { id: nextId(s, 'st'), name: c.name, skill: c.skill, salary, since: mk(s), trait: c.trait };
  let what: L;
  if (c.role === 'chief') { a.chief = head; what = l('chefe de gabinete', 'chief of staff'); }
  else if (c.role.startsWith('head:')) { const k = c.role.slice(5); a.heads[k] = head; what = fmtL(l('diretor(a) de {c}', '{c} director'), { c: careerDef(k)?.name ?? l(k, k) }); }
  else { s.player.staff.push({ id: head.id, name: c.name, role: c.role, skill: c.skill, salary, hiredWeek: s.week, trait: c.trait } as StaffMember); what = STAFF_ROLES.find((x) => x.id === c.role)?.name ?? l(c.role, c.role); }
  bumpPerks();
  emitFact(s, { kind: 'hire', actors: ['player', ...(c.real ? [c.real] : [])], severity: c.real ? 35 : 15, visibility: c.real ? 'public' : 'rumor', tags: ['good', 'hire'], text: fmtL(l('{n} contratado(a) como {w}.', '{n} hired as {w}.'), { n: c.name, w: what }), src: 'agenda17' });
  return { ok: true, text: fmtL(l('{n} aceitou: {w} por {v}/mês.', '{n} accepted: {w} for {v}/month.'), { n: c.name, w: what, v: usd(salary) }) };
}
export function fireHead(s: GameState, career: string | 'chief'): Res17 {
  const a = ag17(s), hd = career === 'chief' ? a.chief : a.heads[career];
  if (!hd) return { ok: false, text: l('Ninguém no cargo.', 'Nobody in the role.') };
  post(s, `ag17:fire:${hd.id}`, -hd.salary, 'salaries', `Rescisão ${hd.name}`);
  if (career === 'chief') a.chief = undefined; else { delete a.heads[career]; if (a.inv[career] === 'deleg') a.inv[career] = 'normal'; }
  emitFact(s, { kind: 'fire', actors: ['player'], severity: 10, visibility: 'rumor', tags: ['fire'], text: fmtL(l('{n} foi desligado(a).', '{n} was let go.'), { n: hd.name }), src: 'agenda17' });
  bumpPerks();
  return { ok: true, text: fmtL(l('{n} saiu (rescisão de um salário).', '{n} left (one salary severance).'), { n: hd.name }) };
}
export function setInv(s: GameState, career: string, v: Inv): Res17 {
  const a = ag17(s);
  if (v === 'deleg' && !a.heads[career]) return { ok: false, text: l('Para delegar, contrate antes um diretor para essa carreira.', 'To delegate, hire a director for that career first.') };
  a.inv[career] = v;
  bumpPerks();
  const d = careerDef(career);
  return { ok: true, text: fmtL(l('{c}: envolvimento {i}. {d}', '{c}: involvement {i}. {d}'), { c: d?.name ?? l(career, career), i: INV_NAME[v], d: INV_DESC[v] }) };
}
const usd = (c: number): string => `$${Math.round(c / 100).toLocaleString('en-US')}`;

// ================================================================ freelancers (por ação)

export type FlKind = 'promo' | 'pr' | 'booker' | 'image';
export const FL: Record<FlKind, { name: L; desc: L; base: number; from: number }> = {
  promo: { name: l('Promotor independente', 'Independent promoter'), desc: l('Uma campanha em rádios e clubes para um ato: hype sobe na hora. Em épocas de jabá (1950–60, 1975–90) o atalho é tentador — e arriscado.', 'One radio/club push for an act: hype rises at once. In payola eras (1950–60, 1975–90) the shortcut is tempting — and risky.'), base: 1500, from: 1920 },
  pr: { name: l('Assessoria de crise', 'Crisis publicist'), desc: l('Uma semana de assessoria para um ato: alivia o estresse da banda e limpa a imagem (melhor se houve escândalo).', 'A week of PR for an act: eases the band\'s stress and cleans the image (better after a scandal).'), base: 1200, from: 1920 },
  booker: { name: l('Booker de uma noite', 'One-night booker'), desc: l('Arruma um show avulso bem pago para o ato. Os fracos às vezes furam.', 'Lands a well-paid one-off gig for the act. Weak ones sometimes fall through.'), base: 600, from: 1900 },
  image: { name: l('Consultor de imagem', 'Image consultant'), desc: l('Figurino, fotos e postura: apelo maior por 6 meses.', 'Styling, photos and posture: more appeal for 6 months.'), base: 1000, from: 1950 },
};
export interface Fl { id: string; kind: FlKind; name: string; q: number; fee: number; busy?: L }
/** Freelancers do mês: disponibilidade (alguns já estão com rivais) e qualidade pela sua reputação. */
export function freelancers(s: GameState, kind: FlKind): Fl[] {
  const a = ag17(s), r = Rng.fromSeed(`${s.config.seed}:ag17:fl:${mk(s)}:${kind}`), out: Fl[] = [];
  const rivals = Object.values(s.labels).filter((x) => x.active).slice(0, 12);
  for (let i = 0; i < 3; i++) {
    const q = clamp(r.normal(0.35 + repAvg(s) / 250 + netOf(s, kind === 'booker' ? 'live' : 'media') / 300, 0.17), 0.1, 0.97);
    const id = `f17:${mk(s)}:${kind}:${i}`, nm = personName(r, r.pick(LANGS));
    const busyR = r.chance(0.3) && rivals.length ? r.pick(rivals) : null;
    out.push({ id, kind, name: nm, q, fee: money(s, FL[kind].base * (0.6 + q * 1.6)), busy: a.used[id] ? l('já trabalhou para você este mês', 'already worked for you this month') : busyR ? fmtL(l('ocupado com {b}', 'busy with {b}'), { b: busyR.name }) : undefined });
  }
  return out;
}
export const PAYOLA_ERA = (y: number) => (y >= 1950 && y <= 1960) || (y >= 1975 && y <= 1990);
export function hireFreelancer(s: GameState, flId: string, actId: string): Res17 {
  const kind = flId.split(':')[2] as FlKind, f = freelancers(s, kind).find((x) => x.id === flId), act = s.acts[actId];
  if (!f || !act) return { ok: false, text: l('Indisponível.', 'Unavailable.') };
  if (f.busy) return { ok: false, text: f.busy };
  if (s.player.cash < f.fee) return { ok: false, text: l('Caixa insuficiente.', 'Not enough cash.') };
  const a = ag17(s), r = Rng.fromSeed(`${s.config.seed}:ag17:flr:${flId}:${actId}`);
  a.used[flId] = mk(s);
  post(s, `ag17:fl:${flId}`, -f.fee, 'marketing', `${FL[kind].name.pt} ${f.name}`);
  let t: L, tone: 'good' | 'bad' = 'good';
  if (kind === 'promo') {
    addHype(s, `a:${act.id}`, 'fl17', l('Promotor independente', 'Independent promoter'), Math.round(6 + 14 * f.q));
    const risk = PAYOLA_ERA(s.year) ? 0.06 + 0.22 * (1 - f.q) : 0.02;
    if (r.chance(risk)) {
      scandal(s, act.id, 'money', 40, fmtL(l('Jabá: o promotor de {a} pagou rádios por fora', 'Payola: {a}\'s promoter paid stations under the table'), { a: act.name }), { place: act.city });
      t = fmtL(l('{n} levantou o hype de {a}… comprando execução. Estourou: escândalo de jabá.', '{n} lifted {a}\'s hype… by buying airplay. It blew up: payola scandal.'), { n: f.name, a: act.name }); tone = 'bad';
    } else t = fmtL(l('{n} trabalhou {a} em rádios e clubes: hype +{h}.', '{n} worked {a} at radio and clubs: hype +{h}.'), { n: f.name, a: act.name, h: Math.round(6 + 14 * f.q) });
  } else if (kind === 'pr') {
    const sc = (act.scandals ?? 0) > 0 ? 1.5 : 1;
    for (const pid of act.members) addStress(s, pid, -Math.round(6 * sc * (0.5 + f.q)), l('Assessoria segurou a imprensa', 'PR held the press back'));
    addHype(s, `a:${act.id}`, 'pr17', l('Assessoria de crise', 'Crisis PR'), Math.round(3 * sc * (0.5 + f.q)));
    t = fmtL(l('{n} cuidou da imagem de {a}: estresse da banda caiu{x}.', '{n} handled {a}\'s image: band stress went down{x}.'), { n: f.name, a: act.name, x: sc > 1 ? l(' (o escândalo esfriou)', ' (the scandal cooled)') : l('', '') });
  } else if (kind === 'booker') {
    if (r.chance(0.25 * (1 - f.q))) { t = fmtL(l('O show que {n} arrumou para {a} furou: o contratante sumiu. Cachê do booker perdido.', 'The gig {n} landed for {a} fell through: the promoter vanished. Booker fee lost.'), { n: f.name, a: act.name }); tone = 'bad'; }
    else {
      const gross = money(s, (250 + act.fame * act.fame * 1.5) * (0.6 + 0.8 * f.q));
      post(s, `ag17:gig:${flId}`, gross, 'live', `Show avulso ${act.name}`);
      act.fame = clamp(act.fame + 0.4, 0, 100);
      t = fmtL(l('{n} fechou um show avulso para {a}: {v} de cachê.', '{n} booked a one-off gig for {a}: {v} fee.'), { n: f.name, a: act.name, v: usd(gross) });
    }
  } else {
    const v = 0.02 + 0.05 * f.q;
    a.img = a.img.filter((x) => x.actId !== act.id); a.img.push({ actId: act.id, until: mk(s) + 6, v });
    bumpPerks();
    t = fmtL(l('{n} reformulou a imagem de {a}: apelo +{p}% por 6 meses.', '{n} reworked {a}\'s image: appeal +{p}% for 6 months.'), { n: f.name, a: act.name, p: Math.round(v * 100) });
  }
  emitFact(s, { kind: 'hire', actors: ['player', act.id], severity: tone === 'bad' ? 40 : 12, visibility: 'rumor', tags: [tone, 'hire', 'freelance'], text: t, src: 'agenda17' });
  report(s, t, tone);
  return { ok: tone === 'good', text: t };
}

// ================================================================ músicos de estúdio, orquestra, banda de apoio

export interface Crew { id: string; name: string; alt: L; city: string; from: number; to: number; fam: FamilyId[]; q: number; fee: number; kind: 'studio' | 'orch' | 'backing'; snd?: L; note: L }
// Fontes: The Wrecking Crew (LA, c.1960–75), Funk Brothers (Motown, 1959–72), Muscle Shoals Rhythm Section "Swampers"
// (estúdio próprio 1969–85), Nashville A-Team (1955–75), Booker T. & the M.G.'s (Stax, 1962–71), Hi Rhythm Section
// (Hi Records/Al Green, 1968–79), MFSB (Sigma Sound, Filadélfia, 1971–80), The Section (LA, 1970–82).
export const CREWS: Crew[] = [
  { id: 'wrecking', name: 'The Wrecking Crew', alt: l('Turma de estúdio de Los Angeles', 'Los Angeles studio crew'), city: 'los_angeles', from: 1960, to: 1975, fam: ['pop', 'rock'], q: 0.9, fee: 9000, kind: 'studio', snd: l('Wall of Sound, Pet Sounds', 'Wall of Sound, Pet Sounds'), note: l('Tocaram sem crédito em centenas de sucessos (Spector, Beach Boys, Byrds).', 'Played uncredited on hundreds of hits (Spector, Beach Boys, Byrds).') },
  { id: 'funk', name: 'The Funk Brothers', alt: l('Banda da casa de Detroit', 'Detroit house band'), city: 'detroit', from: 1959, to: 1972, fam: ['rnb', 'pop'], q: 0.92, fee: 8000, kind: 'studio', snd: l('o som Motown', 'the Motown sound'), note: l('O groove do "Snakepit": mais nº1 que Beatles, Elvis e Stones somados.', 'The "Snakepit" groove: more #1s than the Beatles, Elvis and the Stones combined.') },
  { id: 'swampers', name: 'Muscle Shoals Rhythm Section (The Swampers)', alt: l('Seção rítmica do Alabama', 'Alabama rhythm section'), city: 'nashville', from: 1969, to: 1985, fam: ['rnb', 'rock', 'country_folk'], q: 0.88, fee: 7000, kind: 'studio', snd: l('soul sulista cru', 'raw Southern soul'), note: l('Aretha, Stones, Staples Singers, Paul Simon: viajavam até o Alabama por esse som.', 'Aretha, the Stones, the Staple Singers, Paul Simon travelled to Alabama for this sound.') },
  { id: 'ateam', name: 'Nashville A-Team', alt: l('Time A de Nashville', 'Nashville A-team'), city: 'nashville', from: 1955, to: 1975, fam: ['country_folk', 'pop'], q: 0.86, fee: 6000, kind: 'studio', snd: l('Nashville Sound', 'Nashville Sound'), note: l('Sessões de 3 horas, 4 músicas: Patsy Cline, Elvis, Roy Orbison.', '3-hour sessions, 4 songs: Patsy Cline, Elvis, Roy Orbison.') },
  { id: 'mgs', name: 'Booker T. & the M.G.\'s', alt: l('Banda da casa de Memphis', 'Memphis house band'), city: 'memphis', from: 1962, to: 1971, fam: ['rnb', 'blues_jazz'], q: 0.88, fee: 6500, kind: 'studio', snd: l('o som Stax', 'the Stax sound'), note: l('Otis Redding, Sam & Dave, Wilson Pickett: groove enxuto e integrado.', 'Otis Redding, Sam & Dave, Wilson Pickett: lean, integrated groove.') },
  { id: 'hi', name: 'Hi Rhythm Section', alt: l('Seção rítmica da Hi Records', 'Hi Records rhythm section'), city: 'memphis', from: 1968, to: 1979, fam: ['rnb'], q: 0.84, fee: 5000, kind: 'studio', snd: l('soul aveludado de Memphis', 'silky Memphis soul'), note: l('A base dos discos de Al Green.', 'The backbone of Al Green\'s records.') },
  { id: 'mfsb', name: 'MFSB', alt: l('Orquestra da casa da Filadélfia', 'Philadelphia house orchestra'), city: 'philadelphia', from: 1971, to: 1980, fam: ['rnb', 'pop', 'electronic'], q: 0.87, fee: 9000, kind: 'studio', snd: l('Philly soul, proto-disco', 'Philly soul, proto-disco'), note: l('Cordas e metais do Sigma Sound (Gamble & Huff).', 'Strings and horns of Sigma Sound (Gamble & Huff).') },
  { id: 'section', name: 'The Section', alt: l('Seção de LA dos cantautores', 'LA singer-songwriter section'), city: 'los_angeles', from: 1970, to: 1982, fam: ['rock', 'pop', 'country_folk'], q: 0.85, fee: 7000, kind: 'studio', snd: l('soft rock da Califórnia', 'California soft rock'), note: l('James Taylor, Jackson Browne, Carole King.', 'James Taylor, Jackson Browne, Carole King.') },
  { id: 'pros', name: '', alt: l('Músicos de estúdio profissionais (cachê de tabela)', 'Professional session players (union scale)'), city: '', from: 1920, to: 9999, fam: [], q: 0.55, fee: 2200, kind: 'studio', note: l('Tocam qualquer coisa no tempo, sem assinatura de som. Cachê tabelado pelo sindicato (desde os anos 1940).', 'Play anything on time, no signature sound. Union-scale fees (since the 1940s).') },
  { id: 'locals', name: '', alt: l('Músicos locais de aluguel', 'Local hired players'), city: '', from: 1900, to: 9999, fam: [], q: 0.3, fee: 700, kind: 'studio', note: l('Baratos e irregulares.', 'Cheap and uneven.') },
  { id: 'orch', name: '', alt: l('Orquestra de estúdio (cordas e metais, com arranjador)', 'Studio orchestra (strings and horns, with arranger)'), city: '', from: 1920, to: 9999, fam: ['pop', 'rnb', 'blues_jazz', 'europe', 'sacred', 'latin', 'brazil'], q: 0.8, fee: 14000, kind: 'orch', note: l('Cara, mas transforma baladas (Nelson Riddle com Sinatra, as cordas da Motown e da Philly).', 'Expensive, but transforms ballads (Nelson Riddle with Sinatra, Motown and Philly strings).') },
  { id: 'choir', name: '', alt: l('Coral gospel de apoio', 'Gospel backing choir'), city: '', from: 1930, to: 9999, fam: ['rnb', 'sacred', 'pop', 'rock'], q: 0.65, fee: 3000, kind: 'studio', note: l('Vozes de igreja para refrões que sobem.', 'Church voices for soaring choruses.') },
  { id: 'backing', name: '', alt: l('Banda de apoio para turnê (mensal)', 'Touring backing band (monthly)'), city: '', from: 1930, to: 9999, fam: [], q: 0.6, fee: 3500, kind: 'backing', note: l('Músicos contratados que seguram o show ao vivo: mais receita por show enquanto durar o contrato.', 'Hired players who hold the live show together: more revenue per show while the deal lasts.') },
];
export const crewById = (id: string) => CREWS.find((c) => c.id === id);
export const crewName = (s: GameState, c: Crew): L => (c.name && s.config.realNames ? l(c.name, c.name) : c.alt);
export const crewsNow = (s: GameState): Crew[] => CREWS.filter((c) => s.year >= c.from && s.year <= c.to);
export const crewFee = (s: GameState, c: Crew): number => money(s, c.fee);
/** Quanto o grupo soma para o ato (puro): gênero que não casa rende metade. */
export function crewFit(s: GameState, c: Crew, act: Act): { q: number; why: L } {
  const fit = !c.fam.length || c.fam.includes(familyOf(act.genre));
  return { q: c.q * (fit ? 1 : 0.5), why: fit ? l('o gênero casa com o som deles', 'the genre fits their sound') : l('gênero fora da praia deles (metade do efeito)', 'genre outside their turf (half the effect)') };
}
export function bookCrew(s: GameState, crewId: string, actId: string): Res17 {
  const c = crewById(crewId), act = s.acts[actId], a = ag17(s);
  if (!c || !act || s.year < c.from || s.year > c.to) return { ok: false, text: l('Indisponível nesta época.', 'Not available in this era.') };
  const fee = crewFee(s, c);
  if (s.player.cash < fee) return { ok: false, text: l('Caixa insuficiente.', 'Not enough cash.') };
  if (a.sess.some((x) => x.actId === actId && x.kind === c.kind && x.until >= mk(s))) return { ok: false, text: l('Esse ato já tem um contrato desse tipo em andamento.', 'That act already has a deal of this kind running.') };
  const fit = crewFit(s, c, act);
  post(s, `ag17:crew:${crewId}:${actId}:${mk(s)}`, -fee, 'recording', `${crewName(s, c).pt} · ${act.name}`);
  a.sess.push({ crew: c.id, actId, start: mk(s), until: mk(s) + (c.kind === 'backing' ? 2 : 5), q: fit.q, kind: c.kind, monthly: c.kind === 'backing' ? fee : 0, fam: c.fam });
  bumpPerks();
  const t = c.kind === 'backing'
    ? fmtL(l('{c} acompanha {a} na estrada por 3 meses ({v}/mês): receita por show +{p}%.', '{c} backs {a} on the road for 3 months ({v}/month): revenue per show +{p}%.'), { c: crewName(s, c), a: act.name, v: usd(fee), p: Math.round((0.04 + 0.1 * fit.q) * 100) })
    : fmtL(l('{c} grava com {a} pelos próximos 6 meses: qualidade das faixas +{q} ({w}).', '{c} records with {a} for the next 6 months: track quality +{q} ({w}).'), { c: crewName(s, c), a: act.name, q: (0.4 + 1.6 * fit.q).toFixed(1), w: fit.why });
  emitFact(s, { kind: 'hire', actors: ['player', act.id], severity: c.name ? 25 : 10, visibility: c.name ? 'public' : 'rumor', tags: ['good', 'hire', 'session'], text: t, src: 'agenda17' });
  report(s, t, 'good');
  return { ok: true, text: t };
}

// ================================================================ "Você": ações pessoais com bolinha

export function network(s: GameState, sector: string): Res17 {
  const e = spendEnergy(s, 1); if (e) return { ok: false, text: e };
  const a = ag17(s), o = ownerOf(s), g = Math.round(6 + o.attrs.charisma / 12);
  a.net[sector] = clamp((a.net[sector] ?? 0) + g, 0, 100);
  const sec = SECTORS.find((x) => x.id === sector)?.name ?? l(sector, sector);
  return { ok: true, text: fmtL(l('Noite de networking ({s}): rede +{g}. Candidatos e freelancers melhores e mais dispostos a aceitar.', 'Networking night ({s}): network +{g}. Better candidates and freelancers, more willing to say yes.'), { s: sec, g }) };
}
export function restDay(s: GameState): Res17 {
  const e = spendEnergy(s, 1); if (e) return { ok: false, text: e };
  const p = playerPerson(s), o = ownerOf(s);
  if (p) addStress(s, p.id, -10, l('Dia de folga', 'Day off'));
  o.stress = clamp(o.stress - 6, 0, 100);
  return { ok: true, text: l('Um dia sem telefone: estresse −10.', 'A day without the phone: stress −10.') };
}
export function vacation(s: GameState): Res17 {
  const left = energyLeft(s);
  if (left < 3) return { ok: false, text: l('Férias pedem pelo menos 3 bolinhas livres.', 'A holiday needs at least 3 free balls.') };
  spendEnergy(s, left);
  const p = playerPerson(s), o = ownerOf(s);
  if (p) { addStress(s, p.id, -20, l('Férias de verdade', 'A real holiday')); relieveLong(s, p.id, 15); }
  o.stress = clamp(o.stress - 12, 0, 100);
  const lead = careers(s).active.filter((id) => invOf(s, id) === 'lead');
  for (const id of lead) report(s, fmtL(l('{c} ficou sem você no mês das férias.', '{c} went without you during the holiday.'), { c: careerDef(id)?.name ?? l(id, id) }), 'info');
  return { ok: true, text: fmtL(l('Férias: estresse −20 e desgaste de longo prazo −15 ({n} bolinhas).', 'Holiday: stress −20 and long-term wear −15 ({n} balls).'), { n: left }) };
}
export function mentorStaff(s: GameState, staffId: string): Res17 {
  const st = s.player.staff.find((x) => x.id === staffId);
  if (!st) return { ok: false, text: l('Inválido.', 'Invalid.') };
  if (st.skill >= 90) return { ok: false, text: l('Já está no topo: não há o que ensinar.', 'Already at the top: nothing left to teach.') };
  const e = spendEnergy(s, 1); if (e) return { ok: false, text: e };
  const g = Math.round(2 + ownerOf(s).attrs.management / 30);
  st.skill = Math.min(95, st.skill + g);
  return { ok: true, text: fmtL(l('Você passou o dia ensinando {n}: habilidade +{g}.', 'You spent the day coaching {n}: skill +{g}.'), { n: st.name, g }) };
}

// ================================================================ mês

function agendaMonth(s: GameState): void {
  const a = ag17(s), m = mk(s), r = Rng.fromSeed(`${s.config.seed}:ag17:m:${m}`);
  const o = ownerOf(s), p = playerPerson(s);
  // salários dos diretores e do chefe de gabinete
  for (const [k, hd] of Object.entries(a.heads)) post(s, `ag17:sal:${hd.id}:${m}`, -hd.salary, 'salaries', `Diretor ${careerDef(k)?.name.pt ?? k}: ${hd.name}`);
  if (a.chief) post(s, `ag17:sal:${a.chief.id}:${m}`, -a.chief.salary, 'salaries', `Chefe de gabinete ${a.chief.name}`);
  // resultado por frente: reputação dos negócios, satisfação de clientes, frequentadores da casa
  const vs = ventures(s);
  const touched = new Set<string>([...careers(s).active, ...Object.keys(a.heads)]);
  for (const v of vs.list) for (const [c, k] of Object.entries(CAREER_KIND)) if (k === v.kind) touched.add(c);
  if (vs.mg.clients.length) touched.add('manager');
  if (liveOf(s).venue) touched.add('venue');
  for (const id of touched) {
    if (id === 'label' || id === 'musician') continue;
    const q = careerQ(s, id), d = q.f - 1;
    const hd = a.heads[id], delegated = !careers(s).active.includes(id) || invOf(s, id) === 'deleg';
    let slip = false, coup = false;
    if (hd && delegated) { slip = r.chance((1 - hd.skill / 100) * 0.07); coup = !slip && r.chance(hd.skill / 100 * 0.04); }
    const k = CAREER_KIND[id];
    const mine = k ? vs.list.filter((v) => v.kind === k) : [];
    for (const v of mine) v.rep = clamp(v.rep + d * 4 + (slip ? -3 : coup ? 2 : 0), 0, 100);
    if (id === 'manager') for (const c of vs.mg.clients) c.sat = clamp(c.sat + d * 5 + (slip ? -4 : 0), 0, 100);
    if (id === 'venue') { const x = (s.x4 as unknown as { venue12?: { v?: { regulars: number } } }).venue12?.v; if (x) x.regulars = clamp(x.regulars + d * 3, 0, 200); }
    const name = careerDef(id)?.name ?? l(id, id);
    if (!careers(s).active.includes(id) && !hd && (mine.length || id === 'manager' || id === 'venue') && s.month % 3 === 0)
      report(s, fmtL(l('{c}: sem a carreira e sem diretor, ninguém cuida — reputação caindo. Contrate um diretor (Agenda) ou assuma a carreira.', '{c}: no career and no director, nobody minds it — reputation slipping. Hire a director (Agenda) or take up the career.'), { c: name }), 'bad');
    if (slip) report(s, fmtL(l('{c}: {n} errou feio este mês (agenda dupla/fornecedor furado). Reputação −3.', '{c}: {n} messed up this month (double booking/supplier no-show). Reputation −3.'), { c: name, n: hd!.name }), 'bad');
    else if (coup) report(s, fmtL(l('{c}: {n} fechou um bom acordo sozinho(a). Reputação +2.', '{c}: {n} closed a good deal alone. Reputation +2.'), { c: name, n: hd!.name }), 'good');
    else if (hd && delegated && s.month % 3 === 0) report(s, fmtL(l('{c}: relatório trimestral de {n} — ritmo {f}% do seu.', '{c}: quarterly report from {n} — pace {f}% of yours.'), { c: name, n: hd.name, f: Math.round(q.f * 100) }), 'info');
  }
  // sobrecarga: estresse (stress17) e aviso
  const ob = overbooked(s);
  if (ob > 0) {
    a.over += 1;
    if (p) addStress(s, p.id, 4 * ob, l('Agenda estourada', 'Overbooked schedule'));
    o.stress = clamp(o.stress + 3 * ob, 0, 100);
    if (a.over === 1 || a.over % 4 === 0) {
      notify(s, fmtL(l('Agenda estourada em {n} bolinha(s): estresse sobe e todas as frentes rendem −10%. Delegue ou largue uma carreira.', 'Schedule overbooked by {n} ball(s): stress rises and every front yields −10%. Delegate or drop a career.'), { n: ob }), 'bad');
      emitFact(s, { kind: 'stress', actors: ['player'], severity: 25 + ob * 10, visibility: 'rumor', tags: ['bad', 'agenda'], text: l('O dono do selo está sobrecarregado: carreiras demais ao mesmo tempo.', 'The label owner is overbooked: too many careers at once.'), src: 'agenda17' });
    }
  } else a.over = 0;
  // conflito de calendário: festival e lançamento da banda no mesmo mês, você à frente dos dois
  const fc = careers(s).active.includes('festival') && invOf(s, 'festival') !== 'deleg' && crunch(s, 'festival');
  const bc = careers(s).active.includes('musician') && invOf(s, 'musician') !== 'deleg' && crunch(s, 'musician');
  if (fc && bc) {
    if (p) addStress(s, p.id, 6, l('Festival e lançamento no mesmo mês', 'Festival and release in the same month'));
    const t = l('Conflito de agenda: seu festival e o lançamento da sua banda caíram no mesmo mês. Uma das duas coisas vai ficar sem você.', 'Calendar conflict: your festival and your band\'s release fell in the same month. One of them will go without you.');
    report(s, t, 'bad');
    emitFact(s, { kind: 'agenda', actors: ['player'], severity: 20, visibility: 'secret', tags: ['bad', 'agenda'], text: t, src: 'agenda17' });
  }
  // rede de contatos esfria devagar; contratos de músicos e banda de apoio
  for (const k of Object.keys(a.net)) a.net[k] = Math.max(0, a.net[k] * 0.985);
  for (const x of a.sess) if (x.kind === 'backing' && x.until >= m && m > x.start && x.monthly) post(s, `ag17:backing:${x.actId}:${m}`, -x.monthly, 'live_costs', 'Banda de apoio');
  const before = a.sess.length + a.img.length;
  a.sess = a.sess.filter((x) => x.until >= m && s.acts[x.actId]);
  a.img = a.img.filter((x) => x.until >= m);
  if (a.sess.length + a.img.length !== before) bumpPerks();
  for (const [k, v] of Object.entries(a.used)) if (v < m - 15) delete a.used[k];
  if (a.chief && careers(s).active.length) relieveChief(s, a.chief, r);
}
/** O chefe de gabinete também segura a rotina: chance de evitar 1 de estresse por mês e às vezes erra. */
function relieveChief(s: GameState, c: Head, r: Rng): void {
  const p = playerPerson(s);
  if (p && r.chance(c.skill / 100)) addStress(s, p.id, -2);
  if (r.chance((1 - c.skill / 100) * 0.04)) report(s, fmtL(l('{n} (chefe de gabinete) esqueceu uma reunião importante.', '{n} (chief of staff) forgot an important meeting.'), { n: c.name }), 'bad');
}

registerSimHook('month', 'agenda17', (s) => agendaMonth(s));

/** Para o playbot e testes: atos do jogador elegíveis para freelancers/músicos. */
export const hireableActs = (s: GameState): Act[] => playerActs(s).map((id) => s.acts[id]).filter((a) => a && a.status !== 'retired' && a.status !== 'split');
