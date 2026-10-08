// Efeitos das ações extras de agenda (GDD §42 tabela de ações; §46.5 recuperação).

import { clamp, type Rng } from '../core/rng';
import { l } from '../data/world';
import { actState, actTalent, growPerson } from './people';
import { composeSongs } from './production';
import type { Act, AgendaSlot, GameState } from './types';
import { fmtL, money, notify, post, remember } from './util';
import { fandomOf } from './fandom';
import { ensureFamily } from './dynasty';

function members(s: GameState, act: Act) {
  return act.members.map((id) => s.persons[id]).filter((p) => p && p.alive);
}

function target(s: GameState, act: Act, slot: AgendaSlot) {
  const id = slot.params?.person ? String(slot.params.person) : act.members[0];
  return s.persons[id] && s.persons[id].alive ? s.persons[id] : members(s, act)[0];
}

/** Receita ou custo que pertence ao ato ou ao caixa do jogador (banda própria). */
function credit(s: GameState, act: Act, key: string, cents: number, memo: string): void {
  if (act.playerBand) post(s, key, cents, cents >= 0 ? 'artist_income' : 'artist_dev', memo);
  else act.cash += cents;
}

export function runExtraAction(s: GameState, r: Rng, act: Act, slot: AgendaSlot, dim: number): void {
  const ms = members(s, act);
  const t = actTalent(s, act);
  const st = actState(s, act);
  const mood = (k: 'fatigue' | 'stress' | 'morale' | 'inspiration', v: number) => {
    for (const p of ms) p[k] = clamp(p[k] + v, 0, 100);
  };
  switch (slot.action) {
    case 'demo_test': {
      const song = act.songs.map((id) => s.songs[id]).filter((x) => x && !x.releaseId).sort((a, b) => b.createdWeek - a.createdWeek)[0];
      if (!song) break;
      const heard = clamp(song.q + r.normal(0, 12), 0, 100);
      act.fans.casual += Math.round(30 + heard * 2);
      remember(s, 'demo', fmtL(l('Demo de "{s}" ({a}) testada: o público reagiu {v}.', 'Demo of "{s}" ({a}) tested: the crowd was {v}.'), { s: song.title, a: act.name, v: heard > 65 ? l('com entusiasmo', 'enthusiastic') : heard > 45 ? l('com interesse', 'interested') : l('com frieza', 'cold') }), { actId: act.id });
      break;
    }
    case 'community':
      act.fans.casual += Math.round(60 * dim + t.stage);
      act.fans.active += Math.round(8 * dim);
      s.scenes[`${act.city}:${act.genre}`] = (s.scenes[`${act.city}:${act.genre}`] ?? 0) + 0.4;
      mood('morale', 2);
      break;
    case 'contest': {
      const score = t.stage * 0.5 + t.voice * 0.3 + t.instr * 0.2 + act.rehearsed + r.normal(0, 12);
      if (score > 52) {
        const prize = money(s, 800 + score * 10);
        credit(s, act, `contest:${act.id}`, prize, `Prêmio de concurso ${act.name}`);
        act.fame = clamp(act.fame + 1.5, 0, 100);
        act.fans.casual += 400;
        remember(s, 'contest_win', fmtL(l('{a} vence o concurso de bandas da cidade.', '{a} wins the local battle of the bands.'), { a: act.name }), { actId: act.id, important: act.owner === 'player' });
      } else {
        act.fans.casual += 120;
        mood('morale', -3);
      }
      mood('fatigue', 6);
      break;
    }
    case 'fan_club': {
      const f = fandomOf(s, act.id);
      f.clubOrganized = true;
      f.superfans += Math.round(act.fans.core * 0.05 + 5);
      act.fans.core += Math.round(act.fans.active * 0.03);
      break;
    }
    case 'crowdfund': {
      if (s.flags[`crowd:${act.id}`] && s.week - s.flags[`crowd:${act.id}`] < 52) break;
      const raised = Math.round((act.fans.core * 18 + act.fans.active * 1.2) * dim);
      credit(s, act, `crowd:${act.id}`, money(s, raised), `Financiamento coletivo ${act.name}`);
      s.flags[`crowd:${act.id}`] = s.week;
      s.flags[`crowdDue:${act.id}`] = s.week + 40;
      notify(s, fmtL(l('{a} arrecadou com fãs. Promessa: lançar algo em até 40 semanas.', '{a} raised money from fans. Promise: release something within 40 weeks.'), { a: act.name }), 'good');
      break;
    }
    case 'score_commission': {
      const songs = composeSongs(s, r, act, 1);
      const q = songs[0]?.q ?? 40;
      credit(s, act, `score:${act.id}`, money(s, 900 + q * 25), `Trilha encomendada ${act.name}`);
      act.image!.professionalism = clamp(act.image!.professionalism + 2, 0, 100);
      break;
    }
    case 'session_work': {
      const p = target(s, act, slot);
      if (!p) break;
      credit(s, act, `session:${p.id}`, money(s, 120 + p.skills.instr * 6), `Sessão: ${p.name}`);
      growPerson(p, 'instr', 0.6);
      p.fatigue = clamp(p.fatigue + 5, 0, 100);
      break;
    }
    case 'mediation': {
      for (const p of ms) {
        p.resentment = clamp(p.resentment - 25, 0, 100);
        p.stress = clamp(p.stress - 10, 0, 100);
        for (const q of ms) if (q.id !== p.id) p.rel[q.id] = clamp((p.rel[q.id] ?? 0) + 10, -100, 100);
      }
      const f = s.factions[act.id];
      if (f) f.tension = Math.max(0, f.tension - 30);
      remember(s, 'mediation', fmtL(l('{a} faz um retiro de mediação. As feridas não somem, mas param de sangrar.', '{a} goes on a mediation retreat. Wounds remain, but stop bleeding.'), { a: act.name }), { actId: act.id });
      break;
    }
    case 'mentoring': {
      const p = target(s, act, slot);
      const mentorId = s.mentors[p?.id ?? ''];
      const mentor = mentorId ? s.persons[mentorId] : undefined;
      if (!p) break;
      const best = mentor ?? Object.values(s.persons).filter((x) => x.alive && s.year - x.born > 45 && x.id !== p.id).sort((a, b) => b.skills.comp + b.skills.stage - (a.skills.comp + a.skills.stage))[0];
      if (best) {
        s.mentors[p.id] = best.id;
        for (const k of ['comp', 'stage', 'voice'] as const) if (best.skills[k] > p.skills[k]) growPerson(p, k, 1.4 * dim);
        p.rel[best.id] = clamp((p.rel[best.id] ?? 0) + 6, -100, 100);
        best.rel[p.id] = clamp((best.rel[p.id] ?? 0) + 4, -100, 100);
      }
      break;
    }
    case 'family_time': {
      const p = target(s, act, slot);
      if (!p) break;
      const fam = ensureFamily(s, p.id);
      for (const k of fam.kids) k.bond = clamp(k.bond + 8, 0, 100);
      if (fam.partner) {
        fam.partner.trust = clamp(fam.partner.trust + 6, 0, 100);
        fam.partner.wellbeing = clamp(fam.partner.wellbeing + 4, 0, 100);
      }
      p.stress = clamp(p.stress - 8, 0, 100);
      p.morale = clamp(p.morale + 4, 0, 100);
      break;
    }
    case 'recovery':
      mood('fatigue', -22 * dim);
      mood('stress', -16 * dim);
      mood('inspiration', 10 * dim);
      break;
    case 'therapy': {
      const p = target(s, act, slot);
      if (!p) break;
      p.stress = clamp(p.stress - 12, 0, 100);
      p.morale = clamp(p.morale + 3, 0, 100);
      if (p.health === 'burnout' && r.chance(0.4)) p.health = 'recovering';
      break;
    }
    case 'collab_prep': {
      const partner = Object.values(s.acts).filter((x) => x.id !== act.id && x.status === 'active' && x.genre === act.genre && Math.abs(x.fame - act.fame) < 25).sort((a, b) => b.fame - a.fame)[0];
      if (!partner) break;
      const songs = composeSongs(s, r, act, 1);
      const song = songs[0];
      if (song) {
        const pm = partner.members[0];
        if (pm) song.splits = [...(song.writers.map((w) => ({ personId: w, share: 0.5 / Math.max(1, song.writers.length) }))), { personId: pm, share: 0.5 }];
        song.originality = clamp(song.originality + 6, 0, 100);
      }
      act.fans.casual += Math.round(partner.fans.casual * 0.02);
      act.feats += 1;
      remember(s, 'collab', fmtL(l('{a} e {b} escrevem juntos (créditos 50/50).', '{a} and {b} write together (50/50 credits).'), { a: act.name, b: partner.name }), { actId: act.id });
      break;
    }
    case 'solo_project': {
      const p = target(s, act, slot);
      if (!p) break;
      p.inspiration = clamp(p.inspiration + 15, 0, 100);
      p.morale = clamp(p.morale + 6, 0, 100);
      for (const q of ms) if (q.id !== p.id) q.rel[p.id] = clamp((q.rel[p.id] ?? 0) - 3, -100, 100);
      if (p.goal === 'solo') p.morale = clamp(p.morale + 6, 0, 100);
      break;
    }
    case 'documentary': {
      const plan = slot.params?.plan ? s.plans.find((x) => x.id === slot.params!.plan) : undefined;
      const lastMonth = !plan || s.year * 12 + s.month >= plan.startMonth + plan.months - 1;
      if (!lastMonth) break;
      const q = clamp(30 + act.history.length + act.hits * 4 + act.scandals * 3 + r.normal(0, 10), 5, 100);
      const views = Math.round((act.fans.casual + act.fans.active * 3) * (q / 60));
      s.documentaries.push({ id: `doc${s.idSeq++}`, actId: act.id, title: `${act.name}: ${r.pick(['Sem Filtro', 'Por Trás do Som', 'A História', 'Ao Vivo e a Cores'])}`, week: s.week, quality: Math.round(q), views });
      act.momentum = clamp(act.momentum + q / 4, 0, 100);
      act.fans.casual += Math.round(views * 0.05);
      for (const rid of act.releases) {
        const rel = s.releases[rid];
        if (rel && !rel.live && s.week - rel.week > 52) {
          rel.live = true;
          rel.appeal *= 0.25;
          rel.week = s.week - 53;
        }
      }
      remember(s, 'documentary', fmtL(l('Documentário sobre {a} estreia ({v} visualizações).', 'Documentary about {a} premieres ({v} views).'), { a: act.name, v: views }), { actId: act.id, important: true });
      break;
    }
    case 'reunion_prep':
      s.flags[`reunionPrep:${act.id}`] = s.week;
      break;
    case 'songcamp': {
      const n = 3 + (r.chance(0.5) ? 1 : 0);
      const songs = composeSongs(s, r, act, n);
      for (const song of songs) {
        song.melody = clamp(song.melody + 4, 0, 100);
        song.originality = clamp(song.originality - 3, 0, 100);
      }
      mood('fatigue', 8);
      break;
    }
    case 'new_era':
      for (const id of act.songs) {
        const song = s.songs[id];
        if (song && !song.recorded) song.originality = clamp(song.originality + 6, 0, 100);
      }
      mood('inspiration', 12);
      act.momentum = clamp(act.momentum + 4, 0, 100);
      remember(s, 'new_era', fmtL(l('{a} anuncia uma nova era artística.', '{a} announces a new artistic era.'), { a: act.name }), { actId: act.id });
      break;
    case 'stage_prep':
      for (const p of ms) growPerson(p, 'stage', 1.6 * dim);
      break;
    case 'vocal_prep': {
      const p = target(s, act, slot);
      if (p) growPerson(p, 'voice', 1.8 * dim);
      break;
    }
    case 'party': {
      act.networking = clamp(act.networking + 5, 0, 40);
      mood('stress', -3);
      const wild = ms.some((p) => p.traits.includes('impulsive'));
      if (wild && r.chance(0.15 + st.stress / 400)) {
        act.image!.publicImage = clamp(act.image!.publicImage - 6, 0, 100);
        remember(s, 'party_incident', fmtL(l('Noite agitada de {a} vira fofoca.', '{a}\'s wild night becomes gossip.'), { a: act.name }), { actId: act.id });
      }
      break;
    }
  }
}
