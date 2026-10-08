// Público: superfãs, haters, comunidades tóxicas e rituais de fandom (GDD §15, §46.6).
// Fandom existe antes da internet: cartas e clubes nas eras antigas, fóruns e redes depois.

import { clamp, type Rng } from '../core/rng';
import { l, type L } from '../data/world';
import type { Act, GameState } from './types';
import type { Fandom } from './xtypes';
import { fmtL, hasTech, money, notify, playerActs, post, remember } from './util';

export function fandomOf(s: GameState, actId: string): Fandom {
  return (s.fandoms[actId] ??= { superfans: 0, haters: 0, toxicity: 0 });
}

const SUFFIX = ['ers', 'ianos', 'heads', 'nation', 'family', 'crew', 'army', 'lovers'];

/** Ritual de fandom típico da era (o mesmo fandom muda de forma com a tecnologia). */
export function ritualFor(s: GameState): L {
  if (hasTech(s, 'neural')) return l('sessões de escuta compartilhada no feed neural', 'shared listening sessions on the neural feed');
  if (hasTech(s, 'short_video')) return l('desafios de dança em vídeo curto', 'short-video dance challenges');
  if (hasTech(s, 'streaming')) return l('maratonas de streaming na estreia', 'release-day streaming marathons');
  if (hasTech(s, 'internet')) return l('fóruns, fanzines online e votação em massa', 'forums, online fanzines and mass voting');
  if (hasTech(s, 'cassette')) return l('troca de fitas piratas de shows', 'trading bootleg show tapes');
  if (hasTech(s, 'tv_music')) return l('plateias que acampam na porta da TV', 'crowds camping outside the TV studio');
  if (hasTech(s, 'radio')) return l('pedidos em massa às rádios e cartas', 'mass radio requests and fan letters');
  return l('cartas e encontros de fã-clube', 'fan letters and fan club meetings');
}

export function fandomMonth(s: GameState, r: Rng): void {
  for (const act of Object.values(s.acts)) {
    if (act.status === 'retired' || act.status === 'split') continue;
    const total = act.fans.core + act.fans.active;
    if (total < 200 && !s.fandoms[act.id]) continue;
    const f = fandomOf(s, act.id);
    if (!f.name && act.fans.core > 400) {
      const base = act.name.split(' ')[0].replace(/[^A-Za-zÀ-ú]/g, '');
      f.name = base + r.pick(SUFFIX);
      f.ritual = ritualFor(s);
      if (act.owner === 'player') remember(s, 'fandom', fmtL(l('Os fãs de {a} passam a se chamar "{n}".', '{a} fans start calling themselves "{n}".'), { a: act.name, n: f.name }), { actId: act.id });
    }
    if (f.name && r.chance(0.04)) f.ritual = ritualFor(s);
    // superfãs: parte do núcleo; fã-clube organizado cresce devagar (não é renda infinita)
    const targetSuper = act.fans.core * (f.clubOrganized ? 0.12 : 0.06) * (0.5 + act.trust / 100);
    f.superfans = Math.round(f.superfans + (targetSuper - f.superfans) * 0.1);
    // haters crescem com fama, escândalos e superexposição
    const recent = act.releases.filter((id) => s.releases[id] && s.week - s.releases[id].week < 26).length;
    const targetHaters = (act.fans.casual * 0.01 + act.fame * 30) * (1 + act.scandals * 0.3 + Math.max(0, recent - 2) * 0.2);
    f.haters = Math.round(f.haters + (targetHaters - f.haters) * 0.08);
    const rivalry = Object.values(s.fandoms).length > 1 ? 0 : 0;
    const toxTarget = clamp((f.haters / Math.max(1, f.superfans + f.haters)) * 40 + act.scandals * 4 + (f.superfans > 5000 ? 15 : 0) + rivalry, 0, 100);
    f.toxicity = clamp(f.toxicity + (toxTarget - f.toxicity) * 0.1 + r.normal(0, 1.5), 0, 100);
    // efeitos
    if (act.image) act.image.publicImage = clamp(act.image.publicImage - (f.toxicity > 60 ? 0.6 : 0) + (f.superfans > 1000 ? 0.1 : 0), 0, 100);
    if (f.toxicity > 70) {
      for (const id of act.members) {
        const p = s.persons[id];
        if (p) p.stress = clamp(p.stress + 2, 0, 100);
      }
      if (act.owner === 'player' && r.chance(0.05)) {
        notify(s, fmtL(l('A comunidade de {a} está tóxica: ataques a críticos e a outros fandoms.', '{a}\'s community has turned toxic: attacks on critics and rival fandoms.'), { a: act.name }), 'bad');
      }
    }
  }
}

/** Ações do jogador sobre o fandom. */
export function fanMeetup(s: GameState, actId: string): L | null {
  const act = s.acts[actId];
  if (!act || act.owner !== 'player') return l('Ato não é seu.', 'Not your act.');
  const cost = money(s, 1500);
  if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `meetup:${actId}`, -cost, 'marketing', `Encontro de fãs ${act.name}`);
  const f = fandomOf(s, actId);
  f.superfans += Math.round(act.fans.core * 0.03 + 10);
  act.trust = clamp(act.trust + 2, 0, 100);
  act.fans.core += Math.round(act.fans.active * 0.02);
  remember(s, 'meetup', fmtL(l('{a} recebe os superfãs num encontro.', '{a} hosts superfans at a meetup.'), { a: act.name }), { actId });
  return null;
}

export function moderateCommunity(s: GameState, actId: string): L | null {
  const act = s.acts[actId];
  if (!act || act.owner !== 'player') return l('Ato não é seu.', 'Not your act.');
  const cost = money(s, 2500);
  if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `moderate:${actId}`, -cost, 'marketing', `Moderação de comunidade ${act.name}`);
  const f = fandomOf(s, actId);
  f.toxicity = Math.max(0, f.toxicity - 25);
  f.superfans = Math.round(f.superfans * 0.95);
  return null;
}

export function callOutToxic(s: GameState, r: Rng, actId: string): L {
  const act = s.acts[actId];
  const f = fandomOf(s, actId);
  if (r.chance(0.6)) {
    f.toxicity = Math.max(0, f.toxicity - 35);
    if (act.image) act.image.publicImage = clamp(act.image.publicImage + 5, 0, 100);
    return l('O pedido público funcionou: a comunidade se acalmou.', 'The public appeal worked: the community calmed down.');
  }
  f.superfans = Math.round(f.superfans * 0.8);
  f.haters += 500;
  return l('Parte dos superfãs se sentiu traída e abandonou o fandom.', 'Some superfans felt betrayed and left the fandom.');
}

/** Bônus de estreia vindo de superfãs (compra coordenada, limitada). */
export function superfanDebut(s: GameState, act: Act): number {
  const f = s.fandoms[act.id];
  if (!f) return 1;
  return 1 + Math.min(0.35, f.superfans / Math.max(1000, act.fans.core * 4 + 1000));
}

export function playerFandomSummary(s: GameState): { actId: string; f: Fandom }[] {
  return playerActs(s).map((id) => ({ actId: id, f: fandomOf(s, id) }));
}
