// Especialistas com química (rodada 8, §3.5): a equipe deixa de ser uma escada de habilidade e vira um
// grupo de colaboradores com estilo, ambição e relações. Cada função-chave tem duas especializações
// com trade-offs — e a habilidade amplia os DOIS lados (o produtor autoral muito bom melhora mais o
// gênero dele e briga mais com quem quer controle criativo). Quem trabalha junto há anos ganha química;
// a saída de uma pessoa-chave derruba a química e abre um período de choque.
//
// O perfil (especialização, família de gênero do produtor autoral, ambição) é derivado do id/nome por
// hash — não consome o RNG nem ocupa o save; só redirecionamentos pagos ficam guardados.

import { clamp, type Rng } from '../../core/rng';
import { familyOf, l, type FamilyId, type L } from '../../data/world';
import { registerExt4, registerMod, registerSimHook } from '../ext4';
import { songQ } from '../production';
import type { Act, GameState, Song, StaffMember } from '../types';
import { fmtL, money, notify, playerActs, post, remember } from '../util';
import { careerOf } from './people/staff';

export type SpecId = 'auteur' | 'facilitator' | 'signature' | 'technician' | 'safety' | 'lean' | 'hardball' | 'mediator' | 'independent' | 'company' | 'local' | 'global';
export type Ambition = 'stable' | 'star' | 'mentor' | 'founder';

export interface SpecDef { role: string; name: L; up: L; down: L }

export const SPECS: Record<SpecId, SpecDef> = {
  auteur: { role: 'producer', name: l('Produtor autoral', 'Auteur producer'), up: l('Eleva muito a produção no gênero dele.', 'Greatly lifts production in their genre.'), down: l('Piora fora do gênero e briga com quem quer controle criativo.', 'Worse outside their genre; clashes with artists who want creative control.') },
  facilitator: { role: 'producer', name: l('Produtor facilitador', 'Facilitator producer'), up: l('Extrai a melhor performance de qualquer artista, sem atrito.', 'Draws the best performance from any artist, no friction.'), down: l('Ganho de produção pequeno: não deixa marca.', 'Small production gain: leaves no mark.') },
  signature: { role: 'engineer', name: l('Engenheiro de assinatura', 'Signature engineer'), up: l('Cria a assinatura sonora do selo (apelo maior a cada mês).', 'Builds the label\'s sound signature (appeal grows monthly).'), down: l('Tudo soa parecido (menos originalidade); se sai, a assinatura se desfaz.', 'Everything sounds alike (less originality); if they leave, the signature fades.') },
  technician: { role: 'engineer', name: l('Engenheiro técnico', 'Technical engineer'), up: l('Sessões limpas e previsíveis.', 'Clean, predictable sessions.'), down: l('Sem identidade sonora.', 'No sonic identity.') },
  safety: { role: 'tour_manager', name: l('Chefe de estrada cauteloso', 'Safety-first road chief'), up: l('Acidentes caem quase pela metade; equipe maior.', 'Accidents nearly halved; bigger crew.'), down: l('Custo fixo mensal de seguro e equipe.', 'Monthly fixed cost for insurance and crew.') },
  lean: { role: 'tour_manager', name: l('Produtor de estrada enxuto', 'Lean road producer'), up: l('Logística 12% mais barata nas turnês roteadas.', 'Logistics 12% cheaper on routed tours.'), down: l('Equipe mínima: mais risco físico.', 'Skeleton crew: more physical risk.') },
  hardball: { role: 'legal', name: l('Advogado linha-dura', 'Hardball lawyer'), up: l('Contratos e acordos melhores; processos com mais chance.', 'Better contracts and deals; better odds in court.'), down: l('Promotores e artistas ficam na defensiva: relações pioram.', 'Promoters and artists get defensive: relationships suffer.') },
  mediator: { role: 'legal', name: l('Advogado mediador', 'Mediating lawyer'), up: l('Acordos que preservam relações e confiança.', 'Deals that preserve relationships and trust.'), down: l('Ganhos menores na mesa.', 'Smaller gains at the table.') },
  independent: { role: 'manager', name: l('Empresário independente', 'Independent manager'), up: l('Os artistas confiam mais e ficam mais tempo.', 'Artists trust you more and stay longer.'), down: l('Defende o artista: a influência do selo nas decisões cai.', 'Defends the artist: the label\'s say in decisions drops.') },
  company: { role: 'manager', name: l('Empresário da casa', 'In-house manager'), up: l('O selo manda mais nas decisões das carreiras.', 'The label has more say in career decisions.'), down: l('Artistas desconfiam aos poucos.', 'Artists slowly grow wary.') },
  local: { role: 'booking', name: l('Booker da cena local', 'Local-scene booker'), up: l('Força com promotores do mercado de origem.', 'Leverage with home-market promoters.'), down: l('Fraco fora de casa.', 'Weak away from home.') },
  global: { role: 'booking', name: l('Booker internacional', 'International booker'), up: l('Abre portas em mercados novos.', 'Opens doors in new markets.'), down: l('Menos atenção aos promotores de casa.', 'Less attention to home promoters.') },
};

export const ROLE_SPECS: Record<string, [SpecId, SpecId]> = {
  producer: ['auteur', 'facilitator'],
  engineer: ['signature', 'technician'],
  tour_manager: ['safety', 'lean'],
  legal: ['hardball', 'mediator'],
  manager: ['independent', 'company'],
  booking: ['local', 'global'],
};

export const AMBITIONS: Record<Ambition, { name: L; desc: L }> = {
  stable: { name: l('Estável', 'Steady'), desc: l('Quer um bom lugar para trabalhar por anos.', 'Wants a good place to work for years.') },
  star: { name: l('Estrela', 'Star'), desc: l('Quer crédito e fama: rivais tentam contratar quando brilha.', 'Wants credit and fame: rivals try to poach when they shine.') },
  mentor: { name: l('Mentor', 'Mentor'), desc: l('Gosta de ensinar: a química da equipe cresce mais rápido.', 'Likes teaching: team chemistry grows faster.') },
  founder: { name: l('Fundador', 'Founder'), desc: l('Sonha com o próprio selo: pode sair levando o know-how.', 'Dreams of their own label: may leave with the know-how.') },
};

const AMB_LIST: Ambition[] = ['stable', 'star', 'mentor', 'founder', 'stable', 'mentor'];
const AUTEUR_FAMS: FamilyId[] = ['rock', 'pop', 'hiphop', 'electronic', 'rnb', 'blues_jazz', 'country_folk', 'latin', 'brazil', 'caribbean'];

export interface CrewState {
  /** especialização redirecionada (paga) por id de funcionário */
  over: Record<string, SpecId>;
  /** química da equipe 0..100 */
  chem: number;
  /** assinatura sonora 0..100 */
  sig: number;
  /** influência do selo nas decisões das carreiras 0..100 */
  infl: number;
  /** meses de choque depois da saída de alguém-chave */
  shock: number;
  key?: string;
  poach?: { id: string; until: number; rival: string };
  /** equipe do mês passado (para detectar saídas) */
  roster: { id: string; n: string; sig?: 1 }[];
  log: { week: number; text: L; tone?: 'good' | 'bad' }[];
}

declare module '../ext4' { interface Ext4 { crew8: CrewState } }
registerExt4('crew8', () => ({ over: {}, chem: 0, sig: 0, infl: 55, shock: 0, roster: [], log: [] }));
export const crew = (s: GameState): CrewState => (s as unknown as { x4: { crew8: CrewState } }).x4.crew8;

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}

export interface Profile { spec?: SpecId; fam?: FamilyId; amb: Ambition }

/** Perfil de qualquer profissional (da equipe ou do mercado). */
export function profileOf(s: GameState, st: StaffMember): Profile {
  const hv = hash(`${st.id}|${st.name}`);
  const pair = ROLE_SPECS[st.role];
  const spec = pair ? (crew(s).over[st.id] ?? pair[hv % 2]) : undefined;
  return { spec, fam: spec === 'auteur' ? AUTEUR_FAMS[(hv >>> 3) % AUTEUR_FAMS.length] : undefined, amb: AMB_LIST[(hv >>> 9) % AMB_LIST.length] };
}

/** Pessoa líder de uma função (maior habilidade). */
export function leadOf(s: GameState, role: string): StaffMember | undefined {
  let best: StaffMember | undefined;
  for (const x of s.player.staff) if (x.role === role && (!best || x.skill > best.skill)) best = x;
  return best;
}

/** Especialização da pessoa líder da função (e a habilidade dela), se houver. */
export function leadSpec(s: GameState, role: string): { spec: SpecId; skill: number; st: StaffMember; fam?: FamilyId } | null {
  const st = leadOf(s, role);
  if (!st) return null;
  const p = profileOf(s, st);
  return p.spec ? { spec: p.spec, skill: st.skill, st, fam: p.fam } : null;
}

export const hasSpec = (s: GameState, spec: SpecId): number => {
  const ls = leadSpec(s, SPECS[spec].role);
  return ls && ls.spec === spec ? ls.skill : 0;
};

export function chemistry(s: GameState): number {
  return crew(s).chem;
}

export function influence(s: GameState): number {
  return crew(s).infl;
}

const tenureYears = (s: GameState, st: StaffMember) => Math.max(0, (s.week - st.hiredWeek) / 52);

/** Pessoa-chave: a mais antiga e influente (≥ 1 ano de casa). */
export function keyPerson(s: GameState): StaffMember | undefined {
  let best: StaffMember | undefined;
  let score = 0;
  for (const st of s.player.staff) {
    const y = tenureYears(s, st);
    if (y < 1) continue;
    const v = y * st.skill;
    if (v > score) { score = v; best = st; }
  }
  return best;
}

/** Alvo de química: anos juntos de quem tem mais de seis meses de casa; mentores aceleram, estrelas atrapalham. */
export function chemistryTarget(s: GameState): number {
  const team = s.player.staff.filter((x) => tenureYears(s, x) >= 0.5);
  if (team.length < 2) return 0;
  const avg = team.reduce((t, x) => t + Math.min(8, tenureYears(s, x)), 0) / team.length;
  let v = avg * 20 + Math.min(6, team.length) * 3;
  for (const x of team) {
    const a = profileOf(s, x).amb;
    if (a === 'mentor') v += 5;
    if (a === 'star') v -= 4;
  }
  if (hasSpec(s, 'mediator')) v += 4;
  return clamp(v, 0, 100);
}

function log(s: GameState, text: L, tone?: 'good' | 'bad'): void {
  const c = crew(s);
  c.log.unshift({ week: s.week, text, tone });
  if (c.log.length > 8) c.log.length = 8;
}

/** Redirecionar a especialização de alguém: custa treinamento e um pouco de lealdade. */
export function respecCost(s: GameState, st: StaffMember): number {
  return money(s, 1500 + st.skill * 30);
}

export function respec(s: GameState, staffId: string): L | null {
  const st = s.player.staff.find((x) => x.id === staffId);
  if (!st) return l('Funcionário inválido.', 'Invalid staff member.');
  const pair = ROLE_SPECS[st.role];
  if (!pair) return l('Essa função não tem especializações.', 'This role has no specializations.');
  const cur = profileOf(s, st).spec!;
  const cost = respecCost(s, st);
  if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `respec:${st.id}`, -cost, 'staff_training', `Reorientação ${st.name}`);
  crew(s).over[st.id] = pair[0] === cur ? pair[1] : pair[0];
  const c = careerOf(s, st);
  c.loyalty = clamp(c.loyalty - 8, 0, 100);
  st.skill = Math.max(15, st.skill - 4); // recomeça um pouco no estilo novo
  log(s, fmtL(l('{n} muda de estilo: agora {x}.', '{n} switches style: now {x}.'), { n: st.name, x: SPECS[crew(s).over[st.id]].name }));
  return null;
}

/** Cobrir a proposta de um rival para a pessoa-chave. */
export function matchPoach(s: GameState): L | null {
  const c = crew(s);
  const st = c.poach && s.player.staff.find((x) => x.id === c.poach!.id);
  if (!st) return l('Não há proposta em aberto.', 'No open offer.');
  st.salary = Math.round(st.salary * 1.25);
  const car = careerOf(s, st);
  car.loyalty = clamp(car.loyalty + 15, 0, 100);
  c.poach = undefined;
  log(s, fmtL(l('{n} fica: salário +25%.', '{n} stays: salary +25%.'), { n: st.name }), 'good');
  return null;
}

function departure(s: GameState, st: { id: string; name: string }, wasSig: boolean, wasKey: boolean): void {
  const c = crew(s);
  if (wasKey) {
    c.chem = Math.round(c.chem * 0.45);
    c.shock = 6;
    const text = fmtL(l('Saída de pessoa-chave: {n} deixa a equipe e a química desaba.', 'Key person gone: {n} leaves and team chemistry collapses.'), { n: st.name });
    log(s, text, 'bad');
    remember(s, 'crew_key_leaves', text, { important: true });
  } else {
    c.chem = Math.round(c.chem * 0.85);
  }
  if (wasSig) c.sig = Math.round(c.sig * 0.35);
  delete c.over[st.id];
}

export function crewMonth(s: GameState, r: Rng): void {
  const c = crew(s);
  const ids = s.player.staff.map((x) => x.id);
  // saídas desde o mês passado (demissão, rival, aposentadoria)
  for (const x of c.roster) if (!ids.includes(x.id)) departure(s, { id: x.id, name: x.n }, !!x.sig, x.id === c.key);
  // proposta de rival para a pessoa-chave
  if (c.poach && c.poach.until <= s.week) {
    const st = s.player.staff.find((x) => x.id === c.poach!.id);
    const rival = c.poach.rival;
    c.poach = undefined;
    if (st) {
      s.player.staff = s.player.staff.filter((x) => x !== st);
      const text = fmtL(l('{n} aceita a proposta de {b} e sai.', '{n} takes {b}\'s offer and leaves.'), { n: st.name, b: rival });
      notify(s, text, 'bad');
      departure(s, st, profileOf(s, st).spec === 'signature', true);
    }
  }
  const key = keyPerson(s);
  c.key = key?.id;
  if (key && !c.poach && c.chem > 35) {
    const amb = profileOf(s, key).amb;
    const p = (amb === 'star' ? 0.05 : amb === 'founder' ? 0.035 : 0.01) * (0.5 + key.skill / 100);
    if (r.chance(p)) {
      const rivals = Object.values(s.labels).filter((x) => x.active);
      const rival = rivals.length ? r.pick(rivals).name : 'Rival';
      c.poach = { id: key.id, until: s.week + 6, rival };
      const text = fmtL(l('{b} quer levar {n}, a pessoa-chave da equipe. Cubra a proposta em até 6 semanas.', '{b} wants to hire {n}, the team\'s key person. Match within 6 weeks.'), { b: rival, n: key.name });
      notify(s, text, 'bad');
      log(s, text, 'bad');
    }
  }
  // química
  const target = chemistryTarget(s) * (c.shock > 0 ? 0.6 : 1);
  c.chem = clamp(c.chem + (target - c.chem) * 0.12, 0, 100);
  if (c.shock > 0) c.shock -= 1;
  // assinatura sonora: cresce com o engenheiro de assinatura, desbota sem ele
  const sig = hasSpec(s, 'signature');
  c.sig = sig ? clamp(c.sig + 1 + sig / 40, 0, 100) : c.sig * 0.92;
  // custo fixo do chefe de estrada cauteloso
  const safe = hasSpec(s, 'safety');
  if (safe) post(s, 'crew8:safety', -money(s, 250 + safe * 6), 'live_costs', 'Seguro e equipe de estrada fixa');
  // empresário: confiança do artista x influência do selo
  const ind = hasSpec(s, 'independent');
  const comp = hasSpec(s, 'company');
  const inflTarget = ind ? 30 - ind / 10 : comp ? 75 + comp / 10 : 55;
  c.infl = clamp(c.infl + (inflTarget - c.infl) * 0.15, 0, 100);
  if (ind || comp) {
    for (const id of playerActs(s)) {
      const a = s.acts[id];
      if (a.playerBand) continue;
      a.trust = clamp(a.trust + (ind ? 0.4 + ind / 200 : -0.25), 0, ind ? 95 : 100);
    }
  }
  c.roster = s.player.staff.map((x) => (profileOf(s, x).spec === 'signature' ? { id: x.id, n: x.name, sig: 1 as const } : { id: x.id, n: x.name }));
}

registerSimHook('month', 'crew8', (s, r) => crewMonth(s, r));

// ---------------------------------------------------------------- efeitos na gravação

/** Quem quer controle criativo: contrato com controle, ego grande ou pouca influência do selo. */
export function wantsControl(s: GameState, act: Act): boolean {
  const c = act.contractId ? s.contracts[act.contractId] : undefined;
  if (c?.creativeControl) return true;
  if (act.members.some((id) => s.persons[id]?.traits.includes('big_ego'))) return true;
  return influence(s) < 35;
}

/** Ajustes da equipe numa faixa gravada com a equipe da casa (sem produtor contratado de fora). */
export function crewSongDelta(s: GameState, song: Song, act: Act): { prod: number; perf: number; orig: number; clash: boolean } {
  let prod = 0;
  let perf = 0;
  let orig = 0;
  let clash = false;
  const pr = leadSpec(s, 'producer');
  if (pr?.spec === 'auteur') {
    const fit = pr.fam === familyOf(song.genre);
    let d = fit ? 2 + pr.skill * 0.09 : -1 - pr.skill * 0.03;
    if (wantsControl(s, act)) {
      clash = true;
      if (d > 0) d *= 0.5;
      perf -= 1 + pr.skill * 0.03;
    }
    prod += d;
  } else if (pr?.spec === 'facilitator') {
    perf += 1 + pr.skill * 0.03;
    prod += 0.5;
  }
  const en = leadSpec(s, 'engineer');
  if (en?.spec === 'signature') {
    prod += 1 + en.skill * 0.03 + crew(s).sig / 50;
    orig -= 1 + en.skill * 0.04;
  } else if (en?.spec === 'technician') prod += 0.5;
  const c = crew(s);
  prod += c.chem / 35 - (c.shock > 0 ? 2 : 0);
  return { prod, perf, orig, clash };
}

registerMod('songQ', 'crew8', (s, value, ctx) => {
  const song = ctx.song;
  const act = ctx.act;
  if (!song || !act || song.producerId || !s.player.staff.length) return null;
  if (act.owner !== 'player' && !act.playerBand) return null;
  const d = crewSongDelta(s, song, act);
  if (!d.prod && !d.perf && !d.orig) return null;
  const before = songQ(song);
  song.production = clamp(song.production + d.prod, 5, 100);
  song.performance = clamp(song.performance + d.perf, 5, 100);
  song.originality = clamp(song.originality + d.orig, 0, 100);
  if (d.clash) {
    act.trust = clamp(act.trust - 1, 0, 100);
    for (const id of act.members) if (s.persons[id]) s.persons[id].stress = clamp(s.persons[id].stress + 3, 0, 100);
  }
  return { value: value + songQ(song) - before, label: l('Equipe da casa', 'In-house team') };
});

registerMod('appeal', 'crew8', (s, value, ctx) => {
  const sig = crew(s).sig;
  if (sig < 1 || ctx.release?.owner !== 'player') return null;
  return { value: value * (1 + sig / 2000), label: l('Assinatura sonora do selo', 'Label sound signature') };
});

registerMod('tourRisk', 'crew8', (s, value) => {
  const safe = hasSpec(s, 'safety');
  const lean = hasSpec(s, 'lean');
  const chem = crew(s).chem;
  const m = (safe ? 0.55 - safe / 1000 : lean ? 1.2 + lean / 1000 : 1) * (1 - chem / 500);
  return m === 1 ? null : { value: value * m };
});

