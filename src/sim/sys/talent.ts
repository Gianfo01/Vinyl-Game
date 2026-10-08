// Sistema "talent" (rodada 5): atributos detalhados entram no jogo.
//   compor: melodia/letra/criatividade do compositor principal mexem nas notas da música;
//   gravar: técnica de cada integrante e regularidade mexem na performance;
//   shows: presença e interação com o público mexem na receita;
//   evolução: aulas pagas, shows e gravações treinam; a idade pesa no físico.

import { clamp } from '../../core/rng';
import { l, type L } from '../../data/world';
import { registerMod, registerSimHook } from '../ext4';
import { songQ } from '../production';
import type { GameState, Person } from '../types';
import { fmtL, money, playerActs, post } from '../util';
import { GROUP_NAMES, actAttr, attrById, grow, groupAvg, tal, techAvg, type AttrGroup, type Role } from './talent/attrs';

export * from './talent/attrs';

const isMine = (s: GameState, actId: string): boolean => {
  const a = s.acts[actId];
  return !!a && (a.owner === 'player' || !!a.playerBand);
};

registerSimHook('compose', 'talent', (s, _r, arg) => {
  const so = arg.song;
  if (!so || !isMine(s, so.actId)) return;
  const writers = so.writers.map((id) => s.persons[id]).filter((p): p is Person => !!p);
  const lead = writers[0];
  if (!lead) return;
  const mel = attrById(s, lead, 'melody') ?? lead.skills.comp;
  const lyr = Math.max(...writers.map((p) => attrById(s, p, 'lyrics') ?? p.skills.lyr));
  const cre = attrById(s, lead, 'creativity') ?? 50;
  so.melody = clamp(so.melody + clamp((mel - lead.skills.comp) * 0.3, -4, 4), 5, 100);
  so.lyrics = clamp(so.lyrics + clamp((lyr - Math.max(...writers.map((p) => p.skills.lyr))) * 0.3, -4, 4), 5, 100);
  so.originality = clamp(so.originality + clamp((cre - 50) * 0.08, -3, 4), 5, 100);
  so.q = songQ({ ...so, performance: so.melody * 0.6, production: 30 });
  for (const p of writers) grow(s, p, 'create', 0.06);
});

registerSimHook('record', 'talent', (s, _r, arg) => {
  const so = arg.song;
  if (!so || !isMine(s, so.actId)) return;
  const act = s.acts[so.actId];
  const ms = act.members.map((id) => s.persons[id]).filter((p): p is Person => !!p && p.alive);
  if (!ms.length) return;
  // técnica acima/abaixo das habilidades-base, e a regularidade do grupo
  let d = 0;
  for (const p of ms) {
    const base = p.role === 'vocal' || p.role === 'mc' || p.role === 'synthetic' ? p.skills.voice : p.role === 'producer' || p.role === 'dj' ? p.skills.prod : p.skills.instr;
    d += (techAvg(s, p) - base) * (p.role === 'vocal' ? 0.35 : 0.2);
  }
  d /= Math.max(1, ms.length / 1.5);
  const cons = actAttr(s, act.members, (p) => attrById(s, p, 'consistency')) ?? 50;
  d += (cons - 50) * 0.04;
  so.performance = clamp(so.performance + clamp(d, -6, 6), 5, 100);
  so.q = songQ(so);
  for (const p of ms) grow(s, p, 'tech', 0.08);
});

registerSimHook('show', 'talent', (s, _r, arg) => {
  const sh = arg.show;
  if (!sh || !isMine(s, sh.actId)) return;
  for (const id of s.acts[sh.actId].members) {
    const p = s.persons[id];
    if (p?.alive) { grow(s, p, 'presence', 0.04); grow(s, p, 'crowd', 0.04); grow(s, p, 'stamina', 0.01); }
  }
});

registerMod('showRevenue', 'talent', (s, value, ctx) => {
  const act = ctx.act;
  if (!act || !isMine(s, act.id)) return null;
  const pres = actAttr(s, act.members, (p) => attrById(s, p, 'presence')) ?? 50;
  const crowd = actAttr(s, act.members, (p) => attrById(s, p, 'crowd')) ?? 50;
  const stage = actAttr(s, act.members, (p) => p.skills.stage) ?? 50;
  const f = clamp((pres - stage) * 0.004 + (crowd - 50) * 0.002, -0.08, 0.1);
  if (Math.abs(f) < 0.005) return null;
  return { value: value * (1 + f), label: l('Presença de palco e público', 'Stage presence and crowd work') };
});

// ---------------------------------------------------------------- aulas e evolução mensal

export const LESSON_COST: Record<AttrGroup, number> = { tech: 300, create: 260, stage: 240, mind: 200, body: 160 };
export const LESSON_NAMES: Record<AttrGroup, L> = {
  tech: l('Aulas do instrumento', 'Instrument lessons'),
  create: l('Oficina de composição', 'Songwriting workshop'),
  stage: l('Preparação de palco e mídia', 'Stage and media coaching'),
  mind: l('Terapia e coaching', 'Therapy and coaching'),
  body: l('Preparador físico e fonoaudiólogo', 'Fitness coach and voice therapist'),
};

export function lessonFor(s: GameState, personId: string) {
  return tal(s).lessons.find((x) => x.personId === personId && x.until > s.week);
}

/** Matricula a pessoa em 3 meses de aulas (pago mês a mês pela empresa). */
export function startLessons(s: GameState, personId: string, group: AttrGroup): L | null {
  const p = s.persons[personId];
  if (!p?.alive) return l('Pessoa indisponível.', 'Person unavailable.');
  if (lessonFor(s, personId)) return l('Já está fazendo aulas.', 'Already taking lessons.');
  const cost = money(s, LESSON_COST[group]);
  if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
  tal(s).lessons.push({ personId, group, until: s.week + 14, cost });
  return null;
}

export function stopLessons(s: GameState, personId: string): void {
  const t = tal(s);
  t.lessons = t.lessons.filter((x) => x.personId !== personId);
}

/** Aprende um instrumento novo/secundário (só nível; não muda a função principal). */
export function learnInstrument(s: GameState, personId: string, role: Role, amount: number): void {
  const e = (tal(s).extra[personId] ??= {});
  e[role] = Math.min(80, (e[role] ?? 0) + amount);
}

registerSimHook('month', 'talent', (s) => {
  const t = tal(s);
  // aulas
  for (const ls of t.lessons) {
    if (ls.until <= s.week) continue;
    const p = s.persons[ls.personId];
    if (!p?.alive) { ls.until = 0; continue; }
    if (s.player.cash < ls.cost) { ls.until = 0; continue; }
    post(s, `lesson:${ls.personId}`, -ls.cost, 'artist_dev', `Aulas: ${p.name}`);
    const age = s.year - p.born;
    const learn = (age < 25 ? 1.3 : age < 35 ? 1 : age < 50 ? 0.75 : 0.5) * (0.7 + (attrById(s, p, 'workrate') ?? 50) / 170);
    grow(s, p, ls.group, 1.1 * learn);
    if (ls.group === 'mind') p.stress = clamp(p.stress - 6, 0, 100);
    if (ls.group === 'body') p.fatigue = clamp(p.fatigue - 4, 0, 100);
    else p.fatigue = clamp(p.fatigue + 2, 0, 100);
  }
  t.lessons = t.lessons.filter((x) => x.until > s.week);
  // evolução natural dos jovens e desgaste da idade (só quem o jogador acompanha)
  for (const aid of playerActs(s)) {
    for (const id of s.acts[aid].members) {
      const p = s.persons[id];
      if (!p?.alive) continue;
      const age = s.year - p.born;
      if (age < 26 && groupAvg(s, p, 'tech') < p.potential) grow(s, p, 'tech', 0.12);
      if (age > 34) grow(s, p, 'body', -0.06 - Math.max(0, age - 45) * 0.01);
      if ((p.role === 'vocal' || p.role === 'mc') && age > 50) grow(s, p, 'range', -0.05);
    }
  }
  // limpa evolução de quem morreu ou sumiu
  if (s.month === 0) for (const id of Object.keys(t.g)) if (!s.persons[id]) delete t.g[id];
});

/** Texto curto do progresso das aulas (para avisos). */
export function lessonLabel(s: GameState, personId: string): L | null {
  const ls = lessonFor(s, personId);
  if (!ls) return null;
  return fmtL(l('{g} — mais {n} semanas', '{g} — {n} more weeks'), { g: LESSON_NAMES[ls.group], n: Math.max(0, ls.until - s.week) });
}

export { GROUP_NAMES };
