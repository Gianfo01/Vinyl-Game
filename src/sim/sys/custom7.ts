// Início personalizado (rodada 7): estágio da carreira do artista do jogador com discografia já lançada,
// fãs e fama correspondentes, e patrimônio pessoal escolhido na criação da run.

import { clamp, type Rng } from '../../core/rng';
import { registerSimHook } from '../ext4';
import { langForCity, songTitle } from '../people';
import type { GameState, Release } from '../types';
import { ownerOf } from './people/owner';
import { seedRelease } from './realworld';

export const LEVELS = {
  garage: { fame: 1, releases: 0, years: 0, skill: 0, tier: 3 },
  local: { fame: 7, releases: 1, years: 1, skill: 4, tier: 3 },
  rising: { fame: 18, releases: 2, years: 3, skill: 8, tier: 3 },
  established: { fame: 36, releases: 4, years: 7, skill: 14, tier: 2 },
  star: { fame: 58, releases: 6, years: 12, skill: 20, tier: 1 },
} as const;

function playerLevel(s: GameState, r: Rng): void {
  const lv = s.config.custom?.level;
  const band = s.player.bandActId ? s.acts[s.player.bandActId] : undefined;
  if (!lv || lv === 'garage' || !band) return;
  const d = LEVELS[lv];
  band.formed = s.year - d.years - 1;
  band.debutYear = s.year - d.years;
  band.status = 'active';
  band.fame = d.fame;
  const f = Math.pow(10, 2 + band.fame / 22);
  band.fans = { casual: Math.round(f), active: Math.round(f * 0.2), core: Math.round(f * 0.05) };
  band.momentum = 40;
  for (const id of band.members) {
    const p = s.persons[id];
    if (!p) continue;
    for (const k of Object.keys(p.skills) as (keyof typeof p.skills)[]) p.skills[k] = clamp(p.skills[k] + d.skill, 3, 99);
    p.born = Math.min(p.born, s.year - 18 - d.years);
  }
  const lang = langForCity(band.city, r);
  for (let i = 0; i < d.releases; i++) {
    const year = band.debutYear + Math.round((d.years * i) / Math.max(1, d.releases));
    const type: Release['type'] = year < 1958 ? 'single' : i === 0 ? 'single' : i === 1 && d.releases <= 2 ? 'ep' : 'lp';
    const rel = seedRelease(s, r, band, { title: songTitle(r, lang), year: Math.min(year, s.year - 1), type, tier: d.tier, owner: 'player' });
    // a do jogador nunca é tão grande quanto a de uma lenda: reduz as vendas históricas
    rel.totalUnits = Math.round(rel.totalUnits * (lv === 'star' ? 0.6 : lv === 'established' ? 0.35 : 0.15));
  }
}

registerSimHook('newgame', 'custom7', (s, r) => {
  playerLevel(s, r);
  const pc = s.config.custom?.personalCash;
  if (pc !== undefined) ownerOf(s, r).wealth = Math.round(Math.max(0, pc) * 100);
});
