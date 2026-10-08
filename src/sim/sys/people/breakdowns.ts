// Colapsos (RimWorld): abaixo de um limiar de moral, chance de a pessoa surtar. O tipo depende dos
// traços — sumir antes do show, quebrar equipamento, bebedeira, sair da banda no palco, declaração
// ofensiva, recaída. Efeitos reais (data cancelada, multa, reputação, crise) e memória no diário.

import type { Rng } from '../../../core/rng';
import { l, type L } from '../../../data/world';
import { emitEvent, registerEvents, type EventDef } from '../../events';
import { openCrisis } from '../../media';
import type { Act, GameState, Person } from '../../types';
import { fmtL, money, notify, post, remember } from '../../util';
import { P, actOf, addMsg, addPost, clamp01, healthOf, socialEra, today, trackedPersons } from './state';
import { addThought, moodOf } from './thoughts';
import { medSkill } from './health';

export type BreakKind = 'vanish' | 'smash' | 'binge' | 'quit_stage' | 'post' | 'relapse';

export const BREAK_NAME: Record<BreakKind, L> = {
  vanish: l('Sumiu antes do show', 'Vanished before the show'),
  smash: l('Quebrou o equipamento', 'Smashed the gear'),
  binge: l('Bebedeira', 'Bender'),
  quit_stage: l('Saiu da banda no palco', 'Quit the band on stage'),
  post: l('Declaração ofensiva', 'Offensive remark'),
  relapse: l('Recaída', 'Relapse'),
};

const W: Record<BreakKind, string[]> = {
  vanish: ['anxious', 'insecure', 'shy', 'loner'],
  smash: ['quarrelsome', 'competitive', 'big_ego', 'impulsive'],
  binge: ['spendthrift', 'melancholic', 'impulsive'],
  quit_stage: ['big_ego', 'quarrelsome', 'resentful', 'opportunist'],
  post: ['controversial', 'media_savvy', 'impulsive', 'big_ego'],
  relapse: [],
};

export function breakThreshold(p: Person): number {
  const res = p.persona?.resilience ?? 50;
  return 30 - (res - 50) / 5 + (p.traits.includes('resilient') ? -5 : 0) + (p.traits.includes('anxious') ? 4 : 0);
}

/** Risco mensal de colapso (0..1) — mostrado na interface. */
export function breakRisk(s: GameState, p: Person): number {
  const th = breakThreshold(p);
  const mood = moodOf(s, p.id);
  if (p.morale >= th && p.stress < 85) return 0;
  let c = 0.06 + Math.max(0, th - p.morale) / 110 + (p.stress > 85 ? 0.05 : 0) + (mood < -10 ? 0.04 : 0);
  c -= medSkill(s, 'therapist') / 450;
  if (healthOf(s, p.id).treatment) c = 0;
  return Math.max(0, Math.min(0.5, c));
}

function sensitiveOff(s: GameState, act: Act): boolean {
  return !!act.rs || s.config.contentFilters.some((t) => t === 'drugs' || t === 'health');
}

function nextStop(s: GameState, act: Act): { tour: (typeof s.tours)[number]; stop: (typeof s.tours)[number]['stops'][number] } | null {
  const now = today(s);
  for (const t of s.tours) {
    if (t.actId !== act.id || (t.status !== 'planned' && t.status !== 'running')) continue;
    const st = t.stops.find((x) => x.status === 'scheduled' && x.day >= now && x.day <= now + 30);
    if (st) return { tour: t, stop: st };
  }
  return null;
}

function pickKind(s: GameState, r: Rng, p: Person, act: Act): BreakKind {
  const h = healthOf(s, p.id);
  const opts: [BreakKind, number][] = (Object.keys(W) as BreakKind[]).map((k) => [k, 1 + W[k].filter((t) => p.traits.includes(t)).length * 2.5]);
  const off = sensitiveOff(s, act);
  const ok = opts.filter(([k]) => {
    if (k === 'relapse') return !off && !!h.history;
    if (k === 'binge') return !off;
    if (k === 'quit_stage') return act.members.length > 1;
    if (k === 'vanish') return !!nextStop(s, act);
    return true;
  }).map(([k, w]) => [k, k === 'relapse' ? 4 : w] as [BreakKind, number]);
  return r.weighted(ok, (x) => x[1])?.[0] ?? 'smash';
}

/** Executa um colapso (exportado para testes e para a interface de depuração). */
export function triggerBreakdown(s: GameState, r: Rng, p: Person, act: Act, kind?: BreakKind): BreakKind {
  const k = kind ?? pickKind(s, r, p, act);
  const img = act.image;
  let text: L;
  switch (k) {
    case 'vanish': {
      const ns = nextStop(s, act);
      if (ns) {
        ns.stop.status = 'cancelled';
        ns.stop.note = l('integrante sumiu', 'a member vanished');
        const fine = money(s, 300 + ns.stop.capacity * 0.6);
        post(s, `bd:vanish:${p.id}`, -fine, 'live_costs', `Multa por cancelamento (${act.name})`);
      }
      if (img) img.professionalism = clamp01(img.professionalism - 6);
      act.fans.casual = Math.round(act.fans.casual * 0.97);
      text = fmtL(l('{p} sumiu antes do show de {a}; a data foi cancelada e a casa cobrou multa.', '{p} vanished before {a}\'s show; the date was cancelled and the venue fined us.'), { p: p.name, a: act.name });
      break;
    }
    case 'smash': {
      post(s, `bd:smash:${p.id}`, -money(s, 700 + act.fame * 35), 'equipment', `Equipamento destruído (${act.name})`);
      if (img) img.professionalism = clamp01(img.professionalism - 3);
      act.momentum = clamp01(act.momentum + 2);
      text = fmtL(l('{p} ({a}) quebrou instrumentos e o estúdio no meio de uma briga.', '{p} ({a}) smashed instruments and the studio mid-fight.'), { p: p.name, a: act.name });
      break;
    }
    case 'binge': {
      p.fatigue = clamp01(p.fatigue + 30);
      healthOf(s, p.id).dependency = clamp01(healthOf(s, p.id).dependency + 15);
      if (img) img.publicImage = clamp01(img.publicImage - 3);
      text = fmtL(l('{p} ({a}) sumiu numa bebedeira de três dias.', '{p} ({a}) disappeared on a three-day bender.'), { p: p.name, a: act.name });
      break;
    }
    case 'quit_stage': {
      text = fmtL(l('{p} anunciou no meio do show que está saindo de {a}.', '{p} announced mid-show they are quitting {a}.'), { p: p.name, a: act.name });
      emitEvent(s, r, 'people_quit_stage', { act: act.id, person: p.id });
      break;
    }
    case 'post': {
      const sev = 25 + r.int(0, 40) + (p.traits.includes('controversial') ? 10 : 0);
      text = s.year >= 2004
        ? fmtL(l('{p} ({a}) publicou algo ofensivo e apagou tarde demais.', '{p} ({a}) posted something offensive and deleted it too late.'), { p: p.name, a: act.name })
        : fmtL(l('{p} ({a}) deu uma declaração ofensiva a um jornalista.', '{p} ({a}) made an offensive remark to a journalist.'), { p: p.name, a: act.name });
      openCrisis(s, act, 'remark', Math.min(90, sev), text);
      break;
    }
    case 'relapse': {
      const h = healthOf(s, p.id);
      h.dependency = Math.max(h.dependency, 70);
      p.health = 'addiction';
      text = fmtL(l('{p} ({a}) teve uma recaída.', '{p} ({a}) relapsed.'), { p: p.name, a: act.name });
      addMsg(s, { from: p.name, kind: 'health', subject: l('Recaída', 'Relapse'), body: text, tone: 'bad', ref: { person: p.id, opts: 'rehab' }, expires: s.week + 8, actions: [{ id: 'rehab', label: l('Clínica de reabilitação', 'Rehab clinic') }, { id: 'ignore', label: l('Seguir trabalhando', 'Keep working') }] });
      break;
    }
  }
  p.stress = clamp01(p.stress - 20);
  addThought(s, p.id, 'catharsis');
  addThought(s, p.id, 'breakdown_shame');
  for (const id of act.members) if (id !== p.id) addThought(s, id, 'bandmate_breakdown', { p: p.name });
  const st = P(s);
  st.breakdowns.push({ week: s.week, year: s.year, personId: p.id, actId: act.id, kind: k, text });
  if (st.breakdowns.length > 30) st.breakdowns.splice(0, st.breakdowns.length - 30);
  remember(s, 'breakdown', text, { actId: act.id, important: true });
  notify(s, fmtL(l('Colapso: {t}', 'Breakdown: {t}'), { t: text }), 'bad');
  addPost(s, socialEra(s.year)
    ? { author: '@' + act.name.replace(/\s+/g, '').toLowerCase() + '_news', role: 'journalist', text, sentiment: -0.6, actId: act.id, likes: 200 + Math.round(act.fame * 80) }
    : { author: l('Coluna social', 'Society column').pt, role: 'gossip', text, sentiment: -0.5, actId: act.id, likes: 0 });
  return k;
}

export function breakdownsMonth(s: GameState, r: Rng): void {
  const hit = new Set<string>();
  for (const p of trackedPersons(s)) {
    const act = actOf(s, p.id);
    if (!act || hit.has(act.id)) continue;
    const c = breakRisk(s, p);
    if (c > 0 && r.chance(c)) {
      triggerBreakdown(s, r, p, act);
      hit.add(act.id);
    }
  }
}

const QUIT: EventDef[] = [
  {
    id: 'people_quit_stage', cat: 'band', tone: 'bad', tags: [], cooldown: 2, forcedOnly: true,
    title: l('{person} quer sair de {act}', '{person} wants out of {act}'),
    text: l('No meio do show, {person} anunciou que está deixando {act}. A banda está em choque e a imprensa já ligou.', 'Mid-show, {person} announced they are leaving {act}. The band is in shock and the press already called.'),
    options: [
      { id: 'bonus', label: l('Oferecer bônus para ficar', 'Offer a bonus to stay'), hint: l('Custa caro; costuma funcionar.', 'Expensive; usually works.'), apply: (s, _r, c) => {
        const p = s.persons[String(c.person)];
        const a = s.acts[String(c.act)];
        if (!p || !a) return;
        post(s, `quitbonus:${p.id}`, -money(s, 2500 + a.fame * 120), 'artist_dev', `Bônus ${p.name}`);
        P(s).wealth[p.id] = (P(s).wealth[p.id] ?? 0) + money(s, 2500 + a.fame * 120);
        p.morale = clamp01(p.morale + 18);
        addThought(s, p.id, 'raise');
      } },
      { id: 'let_go', label: l('Deixar sair', 'Let them go'), hint: l('A formação muda.', 'The line-up changes.'), apply: (s, _r, c) => {
        const p = s.persons[String(c.person)];
        const a = s.acts[String(c.act)];
        if (!p || !a || a.members.length < 2) return;
        a.members = a.members.filter((x) => x !== p.id);
        if (a.leaderId === p.id) a.leaderId = a.members[0];
        a.momentum = clamp01(a.momentum - 8);
        remember(s, 'member_quits', fmtL(l('{p} deixa {a} depois do show.', '{p} leaves {a} after the show.'), { p: p.name, a: a.name }), { actId: a.id, important: true });
      } },
      { id: 'mediate', label: l('Mediar uma conversa', 'Mediate a talk'), hint: l('Grátis; depende do clima da banda.', 'Free; depends on the band mood.'), apply: (s, r, c) => {
        const p = s.persons[String(c.person)];
        const a = s.acts[String(c.act)];
        if (!p || !a) return;
        const leader = a.leaderId ? s.persons[a.leaderId] : undefined;
        const chance = 0.5 + (leader && leader.id !== p.id ? (leader.rel[p.id] ?? 0) / 200 : 0) + (p.rel[a.leaderId ?? ''] ?? 0) / 300;
        if (r.chance(Math.max(0.2, Math.min(0.85, chance))) || a.members.length < 2) {
          p.morale = clamp01(p.morale + 10);
          remember(s, 'mediation', fmtL(l('{p} aceita ficar em {a} depois de uma conversa longa.', '{p} agrees to stay in {a} after a long talk.'), { p: p.name, a: a.name }), { actId: a.id });
        } else {
          a.members = a.members.filter((x) => x !== p.id);
          if (a.leaderId === p.id) a.leaderId = a.members[0];
          remember(s, 'member_quits', fmtL(l('A mediação falhou: {p} deixa {a}.', 'Mediation failed: {p} leaves {a}.'), { p: p.name, a: a.name }), { actId: a.id, important: true });
        }
      } },
    ],
  },
];
registerEvents(QUIT);

