// Sistema "music" da rodada 4: composição com mini-jogos (acordes, melodia, letra, arranjo,
// batida, garimpo), estúdio (take no tempo, foco por etapa, pistas e equipamentos lendários,
// mixagem e masterização), audição às cegas e jam da banda. Os dados de composição ficam em
// s.x4.music.songs e alimentam o motor de áudio (src/audio/).

import { clamp } from '../../core/rng';
import { l } from '../../data/world';
import { registerMod, registerSimHook } from '../ext4';
import type { GameState } from '../types';
import { fmtL, notify, remember } from '../util';
import { activeCensorship } from '../media';
import { BEAT_FAMILIES, loudnessNormalized } from './music/data';
import { earCorrectDemos, gearOffersMonth, onRecorded } from './music/games';
import { isPlayerSong, ms, pruneSongs } from './music/state';
import { familyOf } from '../../data/world';

export * from './music/state';
export * from './music/games';
export * from './music/data';

registerSimHook('record', 'music', (s, _r, arg) => {
  if (arg.song && isPlayerSong(s, arg.song)) onRecorded(s, arg.song);
});

/** Sessões de estúdio fecham faixas dia a dia; aplica foco/equipamento/bônus pendentes nelas. */
function sweepSessions(s: GameState): void {
  for (const sess of s.sessions) {
    if (s.day - sess.startDay > 120) continue;
    for (const id of sess.songIds) {
      const so = s.songs[id];
      if (!so?.recorded || !isPlayerSong(s, so)) continue;
      const rec = ms(s).songs[id];
      if (rec?.recSeen) continue;
      onRecorded(s, so);
    }
  }
}

registerSimHook('day', 'music', (s) => sweepSessions(s));

registerSimHook('week', 'music', (s) => {
  sweepSessions(s);
  earCorrectDemos(s);
});

registerSimHook('month', 'music', (s, r) => {
  gearOffersMonth(s, r);
});

registerSimHook('year', 'music', (s) => pruneSongs(s));

// Lançamento: a guerra do volume cansa a crítica; letras arriscadas enfrentam a censura.
registerSimHook('launch', 'music', (s, r, arg) => {
  const rel = arg.release;
  if (!rel || (rel.owner !== 'player' && !s.acts[rel.actId]?.playerBand)) return;
  const m = ms(s);
  const recs = rel.songs.map((id) => m.songs[id]).filter(Boolean);
  if (!recs.length) return;
  const loud = recs.filter((x) => x.master).map((x) => x.master!.loud);
  if (loud.length) {
    const avg = loud.reduce((a, b) => a + b, 0) / loud.length;
    if (avg > 60) {
      const hit = (avg - 60) * 0.08;
      s.player.reputation.artistic = clamp(s.player.reputation.artistic - hit, 0, 100);
      const act = s.acts[rel.actId];
      if (act?.image) act.image.artistic = clamp(act.image.artistic - hit * 1.5, 0, 100);
      if (avg > 80) notify(s, fmtL(l('Críticos reclamam do volume esmagado de "{t}".', 'Critics complain about the crushed loudness of "{t}".'), { t: rel.title }), 'info');
    }
  }
  const risk = Math.max(0, ...recs.map((x) => x.lyrics?.risk ?? 0));
  if (risk > 0) {
    for (const rule of activeCensorship(s)) {
      for (const mk of rule.markets) {
        if (!rel.territories.includes(mk)) continue;
        if (!r.chance(clamp(risk * rule.level, 0, 0.9))) continue;
        rel.territories = rel.territories.filter((x) => x !== mk);
        s.bans.push({ releaseId: rel.id, market: mk, reason: rule.name, week: s.week });
        notify(s, fmtL(l('A letra de "{t}" foi censurada: {r}.', 'The lyrics of "{t}" were censored: {r}.'), { t: rel.title, r: rule.name }), 'bad');
        remember(s, 'censored', fmtL(l('Letra de "{t}" proibida — {r}.', 'Lyrics of "{t}" banned — {r}.'), { t: rel.title, r: rule.name }), { actId: rel.actId });
      }
    }
  }
});

// Apelo: volume na rádio antes da normalização; batida-assinatura nos gêneros de pista.
registerMod('appeal', 'music-loudness', (s, value, ctx) => {
  const rel = ctx.release;
  if (!rel) return null;
  const m = ms(s);
  const loud = rel.songs.map((id) => m.songs[id]?.master?.loud).filter((x): x is number => x !== undefined);
  if (!loud.length) return null;
  const avg = loud.reduce((a, b) => a + b, 0) / loud.length;
  if (!loudnessNormalized(s)) return { value: value * (1 + (avg / 100) * 0.06), label: l('Volume na rádio (guerra do volume)', 'Radio loudness (loudness war)') };
  if (avg > 70) return { value: value * (1 - ((avg - 70) / 100) * 0.1), label: l('Dinâmica esmagada (plataformas normalizam o volume)', 'Crushed dynamics (platforms normalize loudness)') };
  return null;
});

registerMod('appeal', 'music-beat', (s, value, ctx) => {
  const rel = ctx.release;
  const act = rel ? s.acts[rel.actId] : undefined;
  if (!rel || !act || !BEAT_FAMILIES.includes(familyOf(act.genre))) return null;
  const m = ms(s);
  if (!rel.songs.some((id) => m.songs[id]?.beat?.sig)) return null;
  return { value: value * 1.03, label: l('Batida-assinatura do produtor', "Producer's signature beat") };
});
