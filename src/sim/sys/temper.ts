// Temperamento × gênero (rodada 6): traços como Rebelde, Cria da rua, Espiritual ou Festeiro têm
// afinidade com famílias de gênero (GENRE_AFFINITY). Quem toca o que combina com o próprio
// temperamento compõe e grava melhor; quem toca contra a natureza perde moral aos poucos e pode
// pedir para mudar de som. O jogador vê a afinidade na ficha e na página do ato.
// Também aplica aqui os perks de qualidade (songQ) nas músicas do jogador.

import { clamp } from '../../core/rng';
import { traitAffinity, GENRE_AFFINITY } from '../../data/people';
import { FAMILIES, familyOf, genreById, l, type L } from '../../data/world';
import { registerSimHook } from '../ext4';
import { perk } from '../perks';
import { songQ } from '../production';
import type { Act, GameState, Person } from '../types';
import { fmtL, notify, playerActs } from '../util';

/** Afinidade média dos integrantes com o gênero do ato (≈ −1..+1). */
export function actAffinity(s: GameState, a: Act, genre = a.genre): number {
  const ms = a.members.map((id) => s.persons[id]).filter((p): p is Person => !!p && p.alive);
  if (!ms.length) return 0;
  const fam = familyOf(genre);
  return ms.reduce((t, p) => t + traitAffinity(p.traits, fam), 0) / ms.length;
}

/** Famílias que mais combinam com uma pessoa (para a ficha). */
export function bestFamilies(p: Person, n = 3): { id: string; name: L; v: number }[] {
  return FAMILIES.map((f) => ({ id: f.id, name: f.name, v: traitAffinity(p.traits, f.id) })).filter((x) => x.v > 0.05).sort((a, b) => b.v - a.v).slice(0, n);
}

export function worstFamily(p: Person): { id: string; name: L; v: number } | null {
  const w = FAMILIES.map((f) => ({ id: f.id, name: f.name, v: traitAffinity(p.traits, f.id) })).sort((a, b) => a.v - b.v)[0];
  return w && w.v < -0.2 ? w : null;
}

export function hasTemper(p: Person): boolean {
  return p.traits.some((t) => !!GENRE_AFFINITY[t]);
}

const mine = (s: GameState, actId: string) => s.acts[actId]?.owner === 'player';

registerSimHook('compose', 'temper', (s, _r, arg) => {
  const so = arg.song;
  if (!so) return;
  const act = s.acts[so.actId];
  if (!act) return;
  const aff = actAffinity(s, act, so.genre);
  so.lyrics = clamp(so.lyrics + clamp(aff * 3, -3, 4), 5, 100);
  so.originality = clamp(so.originality + clamp(aff * 2, -2, 3), 5, 100);
  if (mine(s, act.id)) so.melody = clamp(so.melody + perk(s, 'songQ', act) * 0.5, 5, 100);
  so.q = songQ({ ...so, performance: so.performance || so.melody * 0.6, production: so.production || 30 });
});

registerSimHook('record', 'temper', (s, _r, arg) => {
  const so = arg.song;
  if (!so) return;
  const act = s.acts[so.actId];
  if (!act) return;
  const aff = actAffinity(s, act, so.genre);
  so.performance = clamp(so.performance + clamp(aff * 3.5, -3, 5) + (mine(s, act.id) ? perk(s, 'songQ', act) : 0), 5, 100);
  so.q = songQ(so);
});

registerSimHook('month', 'temper', (s, r) => {
  for (const id of playerActs(s)) {
    const a = s.acts[id];
    if (!a || a.status === 'retired' || a.status === 'split') continue;
    const fam = familyOf(a.genre);
    for (const pid of a.members) {
      const p = s.persons[pid];
      if (!p?.alive || p.isPlayer) continue;
      const v = traitAffinity(p.traits, fam);
      if (v < -0.3) p.morale = clamp(p.morale - 0.6, 0, 100);
      else if (v > 0.6) p.morale = clamp(p.morale + 0.3, 0, 100);
      // de vez em quando, quem está no gênero errado pede para mudar de som
      if (v < -0.4 && r.chance(0.02)) {
        const best = FAMILIES.map((f) => ({ f, v: traitAffinity(p.traits, f.id) })).sort((x, y) => y.v - x.v)[0];
        if (best && best.v > 0.3) notify(s, fmtL(l('{p} ({a}) diz que o som da banda não combina com ele(a) e sonha com {f}. Considere mudar o gênero ou trocar a formação.', '{p} ({a}) says the band\'s sound does not suit them and dreams of {f}. Consider changing genre or the line-up.'), { p: p.name, a: a.name, f: best.f.name }), 'event');
      }
    }
  }
});

/** Rótulo curto da afinidade, para as fichas. */
export function affinityLabel(v: number): L {
  return v > 0.6 ? l('combina muito', 'a great fit') : v > 0.2 ? l('combina', 'a good fit') : v > -0.2 ? l('neutro', 'neutral') : v > -0.5 ? l('pouco à vontade', 'uneasy') : l('contra a natureza', 'against their nature');
}

export function genreFamilyName(genre: string): L {
  const fam = familyOf(genre);
  return FAMILIES.find((f) => f.id === fam)?.name ?? genreById[genre]?.name ?? l(genre, genre);
}
