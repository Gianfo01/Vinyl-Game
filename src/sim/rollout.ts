// Planner de rollout (GDD §34, §46.4 + pedido do criador): teaser → pré-save → single(s) →
// clipe → álbum → deluxe; edições limitadas e reedição de aniversário.

import type { Rng } from '../core/rng';
import { l, type L } from '../data/world';
import { availableChannels } from './market';
import { availableFormats, scheduleRelease, suggestedPress } from './production';
import type { GameState, Release } from './types';
import type { Rollout, RolloutPhase } from './xtypes';
import { fmtL, hasTech, money, nextId, notify, post, remember } from './util';

export interface RolloutOpts {
  actId: string;
  title: string;
  albumSongs: string[];
  singles: string[]; // até 3 extrações
  teaser: boolean;
  presave: boolean;
  video: boolean;
  deluxeSongs: string[];
  limitedUnits: number;
  budget: number; // centavos por fase paga
  startInWeeks?: number;
}

export function canVideo(s: GameState): boolean {
  return hasTech(s, 'tv_music');
}

export function canPresave(s: GameState): boolean {
  return hasTech(s, 'streaming');
}

export function planRollout(s: GameState, o: RolloutOpts): Rollout | L {
  const act = s.acts[o.actId];
  if (!act || (act.owner !== 'player' && !act.playerBand)) return l('Ato não é seu.', 'Not your act.');
  if (o.albumSongs.length < 6) return l('O álbum precisa de ao menos 6 faixas gravadas.', 'The album needs at least 6 recorded tracks.');
  if (o.singles.length > 3) return l('Até três singles de trabalho por álbum.', 'At most three lead singles per album.');
  if (o.singles.some((id) => !o.albumSongs.includes(id))) return l('Singles precisam estar no álbum.', 'Singles must be on the album.');
  if (o.albumSongs.some((id) => !s.songs[id]?.recorded || s.songs[id].releaseId)) return l('Use faixas gravadas e inéditas.', 'Use recorded, unreleased tracks.');
  if (o.presave && !canPresave(s)) return l('Pré-save só existe na era do streaming.', 'Pre-save only exists in the streaming era.');
  if (o.video && !canVideo(s)) return l('Clipe exige TV musical.', 'Music videos need music TV.');
  let w = s.week + (o.startInWeeks ?? 2);
  const phases: RolloutPhase[] = [];
  if (o.teaser) phases.push({ kind: 'teaser', week: w, done: false, budget: Math.round(o.budget * 0.3) });
  if (o.presave) phases.push({ kind: 'presave', week: w, done: false, budget: Math.round(o.budget * 0.2) });
  w += 2;
  o.singles.forEach((sid, i) => {
    phases.push({ kind: 'single', week: w, done: false, budget: o.budget, refId: sid });
    if (i === 0 && o.video) phases.push({ kind: 'video', week: w + 2, done: false, budget: o.budget * 2, refId: sid });
    w += 6;
  });
  phases.push({ kind: 'album', week: w, done: false, budget: o.budget * 2 });
  if (o.limitedUnits > 0) phases.push({ kind: 'limited', week: w + 2, done: false, budget: 0 });
  if (o.deluxeSongs.length) phases.push({ kind: 'deluxe', week: w + 30, done: false, budget: o.budget });
  const totalBudget = phases.reduce((t, p) => t + p.budget, 0);
  if (s.player.cash < totalBudget * 0.3) return l('Caixa insuficiente para sustentar o plano.', 'Not enough cash to support the plan.');
  const ro: Rollout = { id: nextId(s, 'ro'), actId: o.actId, title: o.title || 'Álbum', songIds: o.albumSongs, singles: o.singles, phases, presaves: 0, hype: 0, status: 'active' };
  (ro as Rollout & { deluxe?: string[]; limited?: number }).deluxe = o.deluxeSongs;
  (ro as Rollout & { deluxe?: string[]; limited?: number }).limited = o.limitedUnits;
  // reserva as faixas para não serem lançadas por fora
  for (const id of o.albumSongs) s.flags[`ro:${id}`] = 1;
  s.rollouts.push(ro);
  remember(s, 'rollout', fmtL(l('{a} anuncia o ciclo de "{t}".', '{a} announces the "{t}" cycle.'), { a: act.name, t: ro.title }), { actId: act.id });
  return ro;
}

function mainChannel(s: GameState, kind: RolloutPhase['kind']): string {
  const ch = availableChannels(s);
  if (kind === 'video') return ch.find((c) => c.id === 'music_video')?.id ?? ch.find((c) => c.id === 'tv_show')?.id ?? ch[0].id;
  if (kind === 'teaser') return ch.find((c) => c.id === 'short_clips')?.id ?? ch.find((c) => c.id === 'social')?.id ?? ch.find((c) => c.id === 'press')?.id ?? ch[0].id;
  return ch.find((c) => c.id === 'playlists')?.id ?? ch.find((c) => c.id === 'radio_plug')?.id ?? ch[0].id;
}

function runPhase(s: GameState, r: Rng, ro: Rollout, ph: RolloutPhase): void {
  const act = s.acts[ro.actId];
  if (!act) {
    ro.status = 'cancelled';
    return;
  }
  const extra = ro as Rollout & { deluxe?: string[]; limited?: number };
  const pay = (key: string, memo: string): boolean => {
    if (!ph.budget) return true;
    if (s.player.cash < ph.budget) {
      notify(s, fmtL(l('Fase "{k}" de "{t}" sem verba: pulada.', 'Phase "{k}" of "{t}" lacked budget: skipped.'), { k: ph.kind, t: ro.title }), 'bad');
      return false;
    }
    post(s, key, -ph.budget, 'marketing', memo);
    return true;
  };
  const formats = availableFormats(s);
  switch (ph.kind) {
    case 'teaser':
      if (pay(`ro_teaser:${ro.id}`, `Teaser ${ro.title}`)) ro.hype += 0.08 + Math.min(0.08, ph.budget / money(s, 20000) * 0.05);
      break;
    case 'presave': {
      if (!pay(`ro_presave:${ro.id}`, `Pré-save ${ro.title}`)) break;
      ro.presaves = Math.round(act.fans.core * 0.6 + act.fans.active * 0.15 + (s.fandoms[act.id]?.superfans ?? 0));
      ro.hype += Math.min(0.15, ro.presaves / Math.max(2000, act.fans.casual + 2000));
      break;
    }
    case 'single': {
      const sid = ph.refId!;
      if (!s.songs[sid] || s.songs[sid].releaseId) break;
      const res = scheduleRelease(s, r, { actId: act.id, type: 'single', songs: [sid], formats, press: Math.max(300, Math.round(suggestedPress(s, act, 'single') * 0.6)), marketing: ph.budget ? [{ channel: mainChannel(s, 'single'), budget: ph.budget }] : [], territories: s.player.territories, weeksAhead: 1, rolloutId: ro.id, hype: ro.hype * 0.5 });
      if ('pt' in res) notify(s, fmtL(l('Single do rollout não saiu: {e}', 'Rollout single failed: {e}'), { e: res }), 'bad');
      else {
        ro.hype += 0.06;
        // a faixa extraída continua no álbum (edição separada; não duplica receita)
        s.songs[sid].releaseId = undefined;
        s.flags[`extracted:${sid}`] = 1;
      }
      break;
    }
    case 'video': {
      const rel = Object.values(s.releases).find((x) => x.actId === act.id && x.songs.includes(ph.refId ?? '') && x.type === 'single');
      if (!rel || !pay(`ro_video:${ro.id}`, `Clipe ${rel.title}`)) break;
      rel.marketing.push({ channel: mainChannel(s, 'video'), budget: ph.budget });
      rel.marketingE = Math.min(0.95, rel.marketingE + 0.15);
      ro.hype += 0.1;
      if (act.image) act.image.popularity += 2;
      break;
    }
    case 'album': {
      const songs = ro.songIds.filter((id) => s.songs[id]?.recorded);
      for (const id of songs) delete s.flags[`ro:${id}`];
      const res = scheduleRelease(s, r, { actId: act.id, type: 'lp', songs, title: ro.title, formats, press: suggestedPress(s, act, 'lp', 60), marketing: ph.budget ? [{ channel: mainChannel(s, 'album'), budget: ph.budget }] : [], territories: s.player.territories, weeksAhead: 1, hype: ro.hype, rolloutId: ro.id, kind: 'standard' });
      if ('pt' in res) notify(s, fmtL(l('O álbum do rollout não saiu: {e}', 'Rollout album failed: {e}'), { e: res }), 'bad');
      break;
    }
    case 'limited': {
      const units = extra.limited ?? 0;
      const album = Object.values(s.releases).find((x) => x.rolloutId === ro.id && x.type === 'lp' && x.kind === 'standard');
      const phys = formats.filter((f) => f !== 'download' && f !== 'streaming');
      if (!units || !album || !phys.length) break;
      scheduleRelease(s, r, { actId: act.id, type: 'lp', songs: album.songs, title: `${ro.title} (Edição limitada)`, formats: [phys.includes('lp') ? 'lp' : phys[0]], press: units, marketing: [], territories: s.player.territories, weeksAhead: 1, reissueOf: album.id, kind: 'limited' });
      break;
    }
    case 'deluxe': {
      const album = Object.values(s.releases).find((x) => x.rolloutId === ro.id && x.type === 'lp' && x.kind === 'standard');
      const extraSongs = (extra.deluxe ?? []).filter((id) => s.songs[id]?.recorded && !s.songs[id].releaseId);
      if (!album || !extraSongs.length) break;
      if (!pay(`ro_deluxe:${ro.id}`, `Deluxe ${ro.title}`)) break;
      const res = scheduleRelease(s, r, { actId: act.id, type: 'lp', songs: extraSongs, title: `${ro.title} (Deluxe)`, formats, press: Math.round(suggestedPress(s, act, 'lp') * 0.4), marketing: [{ channel: mainChannel(s, 'album'), budget: ph.budget }], territories: s.player.territories, weeksAhead: 1, kind: 'deluxe' });
      if (!('pt' in res)) album.appeal *= 1.15;
      break;
    }
  }
  ph.done = true;
}

export function rolloutsWeek(s: GameState, r: Rng): void {
  for (const ro of s.rollouts) {
    if (ro.status !== 'active') continue;
    for (const ph of ro.phases) if (!ph.done && ph.week <= s.week) runPhase(s, r, ro, ph);
    if (ro.phases.every((p) => p.done)) ro.status = 'done';
  }
  s.rollouts = s.rollouts.filter((x) => x.status === 'active' || s.week - (x.phases.at(-1)?.week ?? 0) < 52).slice(-20);
}

export function cancelRollout(s: GameState, id: string): void {
  const ro = s.rollouts.find((x) => x.id === id);
  if (!ro || ro.status !== 'active') return;
  ro.status = 'cancelled';
  for (const sid of ro.songIds) delete s.flags[`ro:${sid}`];
}

// ---------- Reedição de aniversário ----------
const ANNIV = [10, 20, 25, 30, 40, 50];

export function anniversaryCandidates(s: GameState): Release[] {
  return Object.values(s.releases).filter((x) => x.owner === 'player' && x.type === 'lp' && !x.reissueOf && ANNIV.includes(s.year - x.year) && !s.flags[`anniv:${x.id}:${s.year - x.year}`]);
}

export function scheduleAnniversary(s: GameState, r: Rng, relId: string, budget: number): L | null {
  const rel = s.releases[relId];
  if (!rel) return l('Inválido.', 'Invalid.');
  const years = s.year - rel.year;
  if (!ANNIV.includes(years)) return l('Só em aniversários redondos (10, 20, 25, 30, 40, 50).', 'Only on round anniversaries (10, 20, 25, 30, 40, 50).');
  const act = s.acts[rel.actId];
  const res = scheduleRelease(s, r, { actId: rel.actId, type: 'lp', songs: rel.songs, title: `${rel.title} (${years}º aniversário)`, formats: availableFormats(s), press: Math.round(suggestedPress(s, act, 'lp') * 0.5), marketing: budget ? [{ channel: mainChannel(s, 'album'), budget }] : [], territories: s.player.territories, weeksAhead: 2, reissueOf: rel.id, kind: 'anniversary', hype: 0.2 + years / 200 });
  if ('pt' in res) return res;
  s.flags[`anniv:${rel.id}:${years}`] = 1;
  return null;
}
