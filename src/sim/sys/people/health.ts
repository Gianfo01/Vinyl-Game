// Saúde do músico: voz (desgaste, calos, repouso, cirurgia), audição (zumbido acumulado, nunca
// regride), lesões por esforço e dependência com reabilitação em clínica. Equipe médica própria
// (médico, fonoaudiólogo, psicólogo) guardada em s.x4.people.medics. Tratamentos ocupam a agenda
// (ação "Afastamento médico") e problemas sem tratamento derrubam bilheteria e gravações.

import type { Rng } from '../../../core/rng';
import { EXTRA_ACTIONS } from '../../../data/actions';
import { l, type L } from '../../../data/world';
import { monthIndex, planSlots } from '../../capacity';
import { registerMod, registerSimHook } from '../../ext4';
import { songQ } from '../../production';
import type { GameState, Person } from '../../types';
import type { Plan } from '../../xtypes';
import { fmtL, money, nextId, playerActs, post, remember } from '../../util';
import { P, actOf, addMsg, clamp01, healthOf, trackedPersons, type Health, type MedStaff } from './state';
import { addThought } from './thoughts';

// ação de agenda nova: descanso total de uma pessoa (também usada pelos tratamentos)
if (!EXTRA_ACTIONS.some((x) => x.id === 'med_leave')) {
  EXTRA_ACTIONS.push({ id: 'med_leave', name: l('Afastamento médico', 'Medical leave'), desc: l('Descanso total: voz, corpo e cabeça se recuperam.', 'Full rest: voice, body and mind recover.'), cost: 0, load: 75, scope: 'person', months: 1 });
}

export const MED_ROLES: Record<MedStaff['role'], { name: L; desc: L; salary: number }> = {
  doctor: { name: l('Médico', 'Doctor'), desc: l('Cirurgias mais seguras, lesões curam mais rápido, clínica com mais sucesso.', 'Safer surgery, faster injury recovery, better rehab odds.'), salary: 3400 },
  voice_coach: { name: l('Fonoaudiólogo', 'Voice therapist'), desc: l('A voz cansa menos e se recupera mais rápido.', 'Voices tire less and recover faster.'), salary: 2300 },
  therapist: { name: l('Psicólogo', 'Therapist'), desc: l('Menos dependência, menos estresse e menos colapsos.', 'Less dependency, less stress, fewer breakdowns.'), salary: 2600 },
};

export function medSkill(s: GameState, role: MedStaff['role']): number {
  return Math.max(0, ...P(s).medics.filter((m) => m.role === role).map((m) => m.skill));
}

export function medCandidates(s: GameState): Omit<MedStaff, 'hiredWeek'>[] {
  // candidatos determinísticos por trimestre (sem consumir a semente do jogo)
  const q = Math.floor(s.week / 13);
  const out: Omit<MedStaff, 'hiredWeek'>[] = [];
  const roles: MedStaff['role'][] = ['doctor', 'voice_coach', 'therapist'];
  roles.forEach((role, i) => {
    let h = (q * 2654435761 + i * 40503 + s.config.seed.length * 97) >>> 0;
    const nx = () => (h = (Math.imul(h ^ (h >>> 13), 1274126177) + 1) >>> 0) / 4294967296;
    const skill = Math.round(35 + nx() * 55);
    const first = ['Ana', 'Rui', 'Lia', 'Max', 'Eva', 'Ivo', 'Nina', 'Otto', 'Bia', 'Leo'][Math.floor(nx() * 10)];
    const last = ['Morais', 'Klein', 'Duarte', 'Hale', 'Reyes', 'Costa', 'Weber', 'Lima', 'Shaw', 'Prado'][Math.floor(nx() * 10)];
    if (s.year < 1945 && role === 'therapist') return;
    out.push({ id: `md${q}${i}`, name: `${first} ${last}`, role, skill, salary: money(s, MED_ROLES[role].salary * (0.7 + skill / 160)) });
  });
  return out.filter((c) => !P(s).medics.some((m) => m.id === c.id));
}

export function hireMedic(s: GameState, id: string): L | null {
  const c = medCandidates(s).find((x) => x.id === id);
  if (!c) return l('Profissional indisponível.', 'Professional unavailable.');
  if (P(s).medics.length >= 4) return l('Equipe médica completa (máx. 4).', 'Medical team is full (max 4).');
  const sign = Math.round(c.salary * 0.5);
  if (s.player.cash < sign) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `medhire:${c.id}`, -sign, 'salaries', `Contratação ${c.name}`);
  P(s).medics.push({ ...c, hiredWeek: s.week });
  return null;
}

export function fireMedic(s: GameState, id: string): void {
  const st = P(s);
  const m = st.medics.find((x) => x.id === id);
  if (!m) return;
  post(s, `medfire:${m.id}`, -m.salary, 'salaries', `Rescisão ${m.name}`);
  st.medics = st.medics.filter((x) => x !== m);
}

const singer = (p: Person) => p.role === 'vocal' || p.role === 'mc';
const loud = (p: Person) => p.role === 'drums' || p.role === 'guitar' || p.role === 'dj';
const hands = (p: Person) => p.role === 'drums' || p.role === 'guitar' || p.role === 'keys' || p.role === 'bass' || p.role === 'strings' || p.role === 'horns';

export function inEarsAvailable(s: GameState): boolean {
  return s.year >= 1987;
}

/** Protetores (antes de 1987) ou monitores intraauriculares para o elenco todo. */
export function buyEarProtection(s: GameState): L | null {
  const ps = trackedPersons(s).filter((p) => !healthOf(s, p.id).inEars);
  if (!ps.length) return l('Todo o elenco já tem proteção.', 'Everyone is already protected.');
  const cost = money(s, (inEarsAvailable(s) ? 900 : 120) * ps.length);
  if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `ears:${s.week}`, -cost, 'equipment', inEarsAvailable(s) ? 'Monitores intraauriculares' : 'Protetores auriculares');
  for (const p of ps) healthOf(s, p.id).inEars = true;
  return null;
}

export type Treatment = NonNullable<Health['treatment']>['kind'];

export const TREATMENT: Record<Treatment, { name: L; cost: number; weeks: number; load: number }> = {
  rest: { name: l('Repouso vocal', 'Vocal rest'), cost: 300, weeks: 4, load: 50 },
  surgery: { name: l('Cirurgia', 'Surgery'), cost: 6000, weeks: 8, load: 75 },
  rehab: { name: l('Clínica de reabilitação', 'Rehab clinic'), cost: 9000, weeks: 9, load: 100 },
};

export function treatmentCost(s: GameState, kind: Treatment): number {
  return money(s, TREATMENT[kind].cost);
}

/** Inicia um tratamento: paga, afasta a pessoa da agenda e marca a data de alta. */
export function startTreatment(s: GameState, pid: string, kind: Treatment): L | null {
  const p = s.persons[pid];
  const act = actOf(s, pid);
  if (!p?.alive || !act) return l('Pessoa fora do elenco.', 'Person not on the roster.');
  const h = healthOf(s, pid);
  if (h.treatment) return l('Já está em tratamento.', 'Already in treatment.');
  if (kind === 'surgery' && !h.nodes) return l('Cirurgia só para calos nas cordas vocais.', 'Surgery only for vocal nodes.');
  if (kind === 'rehab' && h.dependency < 35 && p.health !== 'addiction') return l('Não há dependência para tratar.', 'No dependency to treat.');
  if (kind === 'surgery' && s.year < 1935) return l('Cirurgia vocal ainda não é segura nesta época.', 'Vocal surgery is not safe yet in this era.');
  const cost = treatmentCost(s, kind);
  if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `treat:${pid}:${kind}`, -cost, 'artist_dev', kind === 'surgery' ? `Cirurgia ${p.name}` : kind === 'rehab' ? `Tratamento ${p.name}` : `Terapia vocal ${p.name}`);
  const def = TREATMENT[kind];
  const months = Math.ceil(def.weeks / 4.35);
  const plan: Plan = { id: nextId(s, 'pl'), actId: act.id, personIds: [pid], action: 'med_leave', startMonth: monthIndex(s), months, load: def.load, status: 'planned', costEst: 0 };
  s.plans.push(plan);
  h.treatment = { kind, untilWeek: s.week + def.weeks, planId: plan.id };
  p.health = 'recovering';
  remember(s, 'treatment', fmtL(l('{p} ({a}) começa: {t}.', '{p} ({a}) starts: {t}.'), { p: p.name, a: act.name, t: def.name }), { actId: act.id });
  return null;
}

function finishTreatment(s: GameState, r: Rng, p: Person, h: Health): void {
  const kind = h.treatment!.kind;
  const doc = medSkill(s, 'doctor');
  const act = actOf(s, p.id);
  let text: L;
  if (kind === 'rest') {
    h.voice = Math.max(0, h.voice - 45);
    const ok = r.chance(0.55 + medSkill(s, 'voice_coach') / 250);
    if (h.nodes && ok) h.nodes = false;
    text = h.nodes ? l('o repouso aliviou, mas os calos continuam', 'rest helped, but the nodes remain') : l('a voz voltou inteira', 'the voice is back in full');
  } else if (kind === 'surgery') {
    h.nodes = false;
    h.voice = 5;
    if (r.chance(Math.max(0.02, 0.12 - doc / 900))) {
      p.skills.voice = Math.max(5, p.skills.voice - 7);
      text = l('a cirurgia deixou a voz um pouco diferente', 'surgery left the voice slightly changed');
    } else text = l('cirurgia bem-sucedida', 'surgery went well');
  } else {
    const ok = r.chance(0.55 + doc / 300 + medSkill(s, 'therapist') / 300);
    h.dependency = ok ? 12 : 45;
    h.history = true;
    text = ok ? l('saiu limpo da clínica', 'left the clinic clean') : l('saiu da clínica, mas a luta continua', 'left the clinic, but the fight goes on');
  }
  h.treatment = undefined;
  p.health = 'ok';
  p.fatigue = clamp01(p.fatigue - 30);
  p.stress = clamp01(p.stress - 20);
  addThought(s, p.id, 'treated');
  remember(s, 'treatment_done', fmtL(l('{p}: {t}.', '{p}: {t}.'), { p: p.name, t: text }), { actId: act?.id });
  addMsg(s, { from: p.name, kind: 'health', subject: l('Alta do tratamento', 'Discharged from treatment'), body: fmtL(l('{p} voltou: {t}.', '{p} is back: {t}.'), { p: p.name, t: text }), tone: 'good' });
}

/** Mensagem de saúde com respostas diretas pela caixa de entrada. */
function healthMsg(s: GameState, p: Person, subject: L, body: L, opts: Treatment[]): void {
  const st = P(s);
  if (st.inbox.some((m) => m.kind === 'health' && m.ref?.person === p.id && !m.resolved && m.ref?.opts === opts.join(','))) return;
  addMsg(s, {
    from: p.name, kind: 'health', subject, body, tone: 'bad', expires: s.week + 8,
    ref: { person: p.id, opts: opts.join(',') },
    actions: [...opts.map((k) => ({ id: k, label: fmtL(l('{t} ({c})', '{t} ({c})'), { t: TREATMENT[k].name, c: `$${TREATMENT[k].cost}` }) })), { id: 'ignore', label: l('Seguir trabalhando', 'Keep working') }],
  });
}

// ---------------------------------------------------------------- ganchos

registerSimHook('show', 'people-health', (s, _r, arg) => {
  const sh = arg.show;
  const act = sh ? s.acts[sh.actId] : undefined;
  if (!act || act.owner !== 'player') return;
  const coach = medSkill(s, 'voice_coach');
  for (const id of act.members) {
    const p = s.persons[id];
    if (!p?.alive) continue;
    const h = healthOf(s, id);
    if (singer(p)) h.voice = clamp01(h.voice + 2.4 + (p.fatigue > 60 ? 1.2 : 0) - coach / 80);
    h.hearing = clamp01(h.hearing + (h.inEars ? 0.08 : 0.28) * (loud(p) ? 1.5 : 1) * (s.year >= 1965 ? 1.3 : 0.8));
    if (hands(p)) h.strain += p.role === 'drums' ? 1.3 : 0.9;
  }
});

registerSimHook('record', 'people-health', (s, _r, arg) => {
  const song = arg.song;
  const act = song ? s.acts[song.actId] : undefined;
  if (!song || !act || act.owner !== 'player') return;
  for (const id of act.members) {
    const p = s.persons[id];
    if (!p?.alive) continue;
    const h = healthOf(s, id);
    if (singer(p)) {
      h.voice = clamp01(h.voice + 0.8);
      if (h.nodes && !h.treatment) {
        // gravou com a voz machucada
        song.performance = Math.max(5, song.performance - 6);
        song.q = songQ(song);
      }
    }
    if (h.injuryWeeks > 0 && hands(p)) {
      song.performance = Math.max(5, song.performance - 3);
      song.q = songQ(song);
    }
  }
});

registerSimHook('week', 'people-health', (s) => {
  const coach = medSkill(s, 'voice_coach');
  const doc = medSkill(s, 'doctor');
  for (const p of trackedPersons(s)) {
    const h = healthOf(s, p.id);
    h.voice = clamp01(h.voice - 1.1 - coach / 60 - (h.treatment?.kind === 'rest' ? 3 : 0));
    h.strain = Math.max(0, h.strain - 0.5);
    if (h.injuryWeeks > 0) h.injuryWeeks = Math.max(0, h.injuryWeeks - 1 - (doc > 60 ? 1 : 0));
  }
});

export function healthMonth(s: GameState, r: Rng): void {
  const st = P(s);
  const therapist = medSkill(s, 'therapist');
  const tracked = trackedPersons(s);
  const ids = new Set(tracked.map((p) => p.id));
  // ação de agenda "Afastamento médico" escolhida à mão também cura
  for (const actId of playerActs(s)) {
    const slots = [...(s.agenda[actId] ?? []), ...planSlots(s, actId)].filter((x) => x.action === 'med_leave');
    for (const sl of slots) {
      const who = sl.params?.person ? [String(sl.params.person)] : s.acts[actId].members;
      for (const id of who) {
        const p = s.persons[id];
        if (!p?.alive) continue;
        const h = healthOf(s, id);
        h.voice = Math.max(0, h.voice - 20);
        h.strain = Math.max(0, h.strain - 8);
        h.dependency = Math.max(0, h.dependency - 4);
        p.fatigue = clamp01(p.fatigue - 25);
        p.stress = clamp01(p.stress - 15);
      }
    }
  }
  for (const p of tracked) {
    const h = healthOf(s, p.id);
    const act = actOf(s, p.id)!;
    if (h.treatment && h.treatment.untilWeek <= s.week) finishTreatment(s, r, p, h);
    if (h.treatment) {
      p.health = 'recovering';
      continue;
    }
    // voz
    if (h.voice > 70 && !h.nodes && r.chance(0.35)) {
      h.nodes = true;
      remember(s, 'voice_nodes', fmtL(l('{p} ({a}) desenvolve calos nas cordas vocais.', '{p} ({a}) develops vocal nodes.'), { p: p.name, a: act.name }), { actId: act.id });
      healthMsg(s, p, l('Calos nas cordas vocais', 'Vocal nodes'), fmtL(l('{p} está rouco(a) há semanas. O médico fala em repouso ou cirurgia.', '{p} has been hoarse for weeks. The doctor suggests rest or surgery.'), { p: p.name }), s.year >= 1935 ? ['rest', 'surgery'] : ['rest']);
    }
    if (h.nodes) {
      p.skills.voice = Math.max(5, p.skills.voice - 0.4);
      addThought(s, p.id, 'sick_voice');
    }
    // audição (acumula e não volta)
    if (h.hearing > 55) {
      addThought(s, p.id, 'tinnitus');
      p.skills.instr = Math.max(5, p.skills.instr - 0.08);
      p.skills.prod = Math.max(5, p.skills.prod - 0.08);
    }
    // lesões por esforço
    if (h.strain > 22 && h.injuryWeeks === 0 && r.chance(0.25)) {
      h.injuryWeeks = r.int(3, 9);
      h.strain = 6;
      const what = p.role === 'drums' ? l('tendinite no pulso', 'wrist tendinitis') : p.role === 'guitar' || p.role === 'bass' ? l('lesão nos dedos', 'finger injury') : l('dor nas costas', 'back injury');
      addThought(s, p.id, 'injured', { p: what.pt });
      remember(s, 'injury', fmtL(l('{p} ({a}): {w}, {n} semanas parado(a).', '{p} ({a}): {w}, out for {n} weeks.'), { p: p.name, a: act.name, w: what, n: h.injuryWeeks }), { actId: act.id });
      healthMsg(s, p, fmtL(l('Lesão: {w}', 'Injury: {w}'), { w: what }), fmtL(l('{p} precisa de {n} semanas. Tocar machucado piora tudo.', '{p} needs {n} weeks. Playing hurt makes it worse.'), { p: p.name, n: h.injuryWeeks }), ['rest']);
    }
    if (h.injuryWeeks > 0) {
      p.skills.instr = Math.max(5, p.skills.instr - 0.3);
      addThought(s, p.id, 'injured', { p: '' });
    }
    // dependência
    const fame = act.fame;
    let dep = 0;
    if (p.stress > 70) dep += 2;
    if (p.traits.includes('spendthrift') || p.traits.includes('impulsive')) dep += 0.8;
    if (fame > 40) dep += 0.6;
    if (s.year >= 1960 && s.year < 1990) dep += 0.6; // décadas de excesso
    dep -= 1.2 + therapist / 40;
    if (p.stress < 40) dep -= 0.8;
    h.dependency = clamp01(h.dependency + dep);
    if (h.dependency > 60 && p.health !== 'addiction') {
      p.health = 'addiction';
      h.history = true;
      remember(s, 'addiction', fmtL(l('{p} ({a}) enfrenta dependência química.', '{p} ({a}) struggles with addiction.'), { p: p.name, a: act.name }), { actId: act.id });
      healthMsg(s, p, l('Dependência', 'Addiction'), fmtL(l('A equipe está preocupada com {p}. Faltas, atrasos, brigas. Uma clínica pode ajudar.', 'The crew is worried about {p}. No-shows, lateness, fights. A clinic could help.'), { p: p.name }), ['rehab']);
    }
    if (p.health === 'addiction') {
      addThought(s, p.id, 'craving');
      p.fatigue = clamp01(p.fatigue + 6);
      if (h.dependency < 40) p.health = 'ok';
    } else if (h.nodes) p.health = 'voice_strain';
    else if (h.injuryWeeks > 0) p.health = 'ill';
    else if (p.health !== 'burnout') p.health = 'ok';
  }
  for (const id of Object.keys(st.health)) if (!ids.has(id)) delete st.health[id];
  // equipe médica: salários
  for (const m of st.medics) post(s, `med:${m.id}`, -m.salary, 'salaries', `Salários equipe médica ${m.name}`);
}

/** Problemas de saúde visíveis no palco: risco por pessoa que se apresenta mal. */
export function healthPenalty(s: GameState, actId: string): { f: number; why: L[] } {
  const act = s.acts[actId];
  if (!act) return { f: 1, why: [] };
  let f = 1;
  const why: L[] = [];
  for (const id of act.members) {
    const p = s.persons[id];
    if (!p?.alive) continue;
    const h = P(s).health[id];
    if (!h) continue;
    if (h.treatment) {
      f *= 0.85;
      why.push(fmtL(l('{p} afastado(a)', '{p} on leave'), { p: p.name }));
    } else {
      if (h.nodes && singer(p)) {
        f *= 0.85;
        why.push(fmtL(l('{p} sem voz', '{p} losing voice'), { p: p.name }));
      }
      if (h.injuryWeeks > 0) f *= 0.93;
      if (p.health === 'addiction') f *= 0.9;
    }
  }
  return { f: Math.max(0.6, f), why };
}

registerMod('cityDemand', 'people-health', (s, value, ctx) => {
  if (!ctx.act || ctx.act.owner !== 'player') return null;
  const { f } = healthPenalty(s, ctx.act.id);
  if (f >= 0.999) return null;
  return { value: value * f, label: l('Saúde da banda', 'Band health') };
});

