// Notas do show, curva do setlist, ingressos/cambistas e o show ao vivo (mini-jogo) — GDD §9.

import { clamp } from '../../../core/rng';
import { hashString } from '../../../core/rng';
import { cityById, familyOf, l, type L } from '../../../data/world';
import { applyMods, queueCutscene, registerMod, registerSimHook } from '../../ext4';
import { actTalent } from '../../people';
import { cityDemand } from '../../tours';
import type { GameState, Song } from '../../types';
import { fmtL, notify, remember, staffSkill } from '../../util';
import { bump, isMine, liveOf, type CurveResult, type ShowNote } from './state';

// ---------------------------------------------------------------- curva do setlist

const FAMILY_ENERGY: Record<string, number> = {
  rock: 70, hiphop: 68, electronic: 74, rnb: 58, pop: 62, caribbean: 60, latin: 56, brazil: 56, blues_jazz: 46, country_folk: 44, sacred: 32, europe: 46,
};

/** Energia de palco de uma música (0–100), determinística. */
export function songEnergy(song: Song): number {
  const fam = familyOf(song.genre);
  const base = FAMILY_ENERGY[fam] ?? 52;
  const jitter = (hashString(song.id) % 31) - 15;
  return Math.round(clamp(base + (song.performance - 50) * 0.35 + (song.production - 50) * 0.15 + jitter, 5, 98));
}

/** Curva ideal: abre forte, cai para um respiro, sobe ao clímax e fecha no bis. */
export function idealEnergy(i: number, n: number): number {
  if (n <= 1) return 80;
  const p = i / (n - 1);
  if (p < 0.12) return 82;
  if (p < 0.45) return 72 - (p - 0.12) * 45;
  if (p < 0.62) return 48;
  if (p < 0.92) return 55 + ((p - 0.62) / 0.3) * 40;
  return 88;
}

export function scoreCurve(energies: number[]): CurveResult {
  const n = energies.length;
  const why: L[] = [];
  if (!n) return { score: 0, bonus: 0, why: [l('Sem músicas próprias no setlist.', 'No own songs in the setlist.')], energies };
  let dev = 0;
  energies.forEach((e, i) => (dev += Math.abs(e - idealEnergy(i, n))));
  let score = 100 - (dev / n) * 1.5;
  const sorted = [...energies].sort((a, b) => b - a);
  if (energies[0] >= 70) {
    score += 6;
    why.push(l('Abertura forte: o público entra no show.', 'Strong opener: the crowd is in from the start.'));
  } else why.push(l('Abertura morna: os primeiros minutos se perdem.', 'Lukewarm opener: the first minutes are wasted.'));
  const last = energies[n - 1];
  if (n >= 3 && last >= sorted[Math.min(2, n - 1)]) {
    score += 6;
    why.push(l('O bis guarda uma das mais fortes.', 'The encore keeps one of the strongest songs.'));
  } else if (n >= 3) why.push(l('O bis é fraco: o público sai frio.', 'Weak encore: people leave cold.'));
  let lowRun = 0;
  let worst = 0;
  for (const e of energies) {
    lowRun = e < 45 ? lowRun + 1 : 0;
    worst = Math.max(worst, lowRun);
  }
  if (worst >= 3) {
    score -= 10;
    why.push(l('Três lentas seguidas: a plateia dispersa.', 'Three slow songs in a row: the crowd drifts away.'));
  }
  const mid = energies.slice(Math.floor(n * 0.35), Math.ceil(n * 0.7));
  if (n >= 5 && mid.some((e) => e < 55)) why.push(l('Há um respiro no meio — bom para o clímax.', 'There is a breather in the middle — good for the climax.'));
  else if (n >= 5) {
    score -= 5;
    why.push(l('Sem respiro: intensidade demais cansa.', 'No breather: nonstop intensity wears people out.'));
  }
  score = Math.round(clamp(score, 0, 100));
  return { score, bonus: Math.round(clamp((score - 50) / 500, 0, 0.1) * 1000) / 1000, why, energies };
}

/** Ordem automática (boa, não perfeita): 2ª mais forte abre, a mais forte fecha, respiro no meio. */
export function autoOrder(s: GameState, songIds: string[]): string[] {
  const list = songIds.filter((id) => s.songs[id]).sort((a, b) => songEnergy(s.songs[b]) - songEnergy(s.songs[a]));
  if (list.length < 3) return list;
  const [top, second, ...rest] = list;
  const a = rest.filter((_, i) => i % 2 === 0);
  const b = rest.filter((_, i) => i % 2 === 1).reverse();
  return [second, ...a, ...b, top];
}

export function curveFor(s: GameState, order: string[]): CurveResult {
  return scoreCurve(order.filter((id) => s.songs[id]).map((id) => songEnergy(s.songs[id])));
}

/** Aplica a ordem escolhida ao setlist da turnê e guarda a nota (bônus nos próximos shows). */
export function applySetlistOrder(s: GameState, tourId: string, order: string[]): CurveResult | L {
  const t = s.tours.find((x) => x.id === tourId);
  if (!t || (t.status !== 'planned' && t.status !== 'running')) return l('Turnê inválida.', 'Invalid tour.');
  const set = new Set(t.setlist);
  if (order.length !== t.setlist.length || order.some((id) => !set.has(id))) return l('A ordem precisa usar as mesmas músicas.', 'The order must use the same songs.');
  t.setlist = [...order];
  const res = curveFor(s, order);
  liveOf(s).curves[tourId] = res;
  return res;
}

function tourCurveBonus(s: GameState, actId: string): number {
  const lv = liveOf(s);
  const t = s.tours.find((x) => x.actId === actId && (x.status === 'planned' || x.status === 'running'));
  return t ? (lv.curves[t.id]?.bonus ?? 0) : 0;
}

registerMod('cityDemand', 'live-setlist', (s, value, ctx) => {
  if (!ctx.act) return null;
  let m = 1;
  const b = tourCurveBonus(s, ctx.act.id);
  if (b > 0) m *= 1 + b * 0.6;
  const v = liveOf(s).venue;
  if (v && ctx.cityId === v.cityId && isMine(s, ctx.act.id)) m *= 1 + v.acoustics * 0.03;
  return m === 1 ? null : { value: value * m, label: l('Boca a boca do show', 'Show word of mouth') };
});

// ---------------------------------------------------------------- ingressos e cambistas

export function dynamicPricingAvailable(s: GameState): boolean {
  return s.year >= 2009;
}

registerMod('showRevenue', 'live-tickets', (s, value, ctx) => {
  const lv = liveOf(s);
  const cur = lv.cur;
  if (!ctx.act || !cur || cur.actId !== ctx.act.id) return null;
  let m = 1;
  if (lv.tickets.vip && cur.tier >= 2) m *= 1.06;
  if (lv.tickets.dynamic && dynamicPricingAvailable(s)) m *= 1 + clamp((cur.ratio - 1) * 0.25, 0, 0.3);
  if (cityById[cur.cityId]?.market === 'br' && s.year >= 1940) m *= 0.85;
  return m === 1 ? null : { value: value * m, label: l('Política de ingressos', 'Ticket policy') };
});

// ---------------------------------------------------------------- notas do show

/** Calcula empolgação, intensidade e cansaço de um show. */
export function showNoteFor(s: GameState, input: { actId: string; tier: number; sold: number; cap: number; production: number; minutes: number; crew: number; travelDays: number; setlist: string[]; bonus: number; cityId: string }): Pick<ShowNote, 'ex' | 'int' | 'fat'> {
  const act = s.acts[input.actId];
  const tal = act ? actTalent(s, act) : { stage: 30 } as Record<string, number>;
  const songs = input.setlist.map((id) => s.songs[id]).filter((x) => x?.recorded);
  const q = songs.length ? songs.reduce((t, x) => t + x.q, 0) / songs.length : 35;
  const fill = input.cap ? input.sold / input.cap : 0;
  const fatigue = act ? act.members.reduce((t, id) => t + (s.persons[id]?.fatigue ?? 0), 0) / Math.max(1, act.members.length) : 0;
  const v = liveOf(s).venue;
  const acoustic = v && v.cityId === input.cityId ? v.acoustics * 3 : 0;
  const ex = clamp(22 + input.production * 9 + (q - 50) * 0.4 + tal.stage * 0.2 + fill * 18 + input.bonus * 100 + acoustic - fatigue * 0.12, 0, 100);
  const int = clamp(18 + input.tier * 11 + input.production * 8 + (input.minutes - 30) * 0.3 + (fill > 0.9 ? 8 : 0), 0, 100);
  const fat = clamp((input.minutes / 90) * 38 + fatigue * 0.45 + input.travelDays * 5 - input.crew * 1.2 + input.production * 2, 0, 100);
  return { ex: Math.round(ex), int: Math.round(int), fat: Math.round(fat) };
}

export const LIVE_TIER_MIN = 3;

registerSimHook('show', 'live-notes', (s, _r, arg) => {
  const sh = arg.show;
  if (!sh) return;
  const lv = liveOf(s);
  const t = s.tours.find((x) => x.id === sh.tourId);
  const act = s.acts[sh.actId];
  if (!t || !act) return;
  const today = s.day + s.clock.dayInMonth;
  const st = t.stops.find((x) => x.day === today && x.cityId === sh.cityId) ?? t.stops.find((x) => x.cityId === sh.cityId && x.status === 'played');
  if (!st) return;
  // ingressos: demanda × capacidade
  const demand = cityDemand(s, act, sh.cityId);
  const ratio = sh.capacity ? demand / sh.capacity : 0;
  lv.cur = { actId: act.id, cityId: sh.cityId, tier: st.tier, ratio };
  const bonus = lv.curves[t.id]?.bonus ?? 0;
  const n = showNoteFor(s, { actId: act.id, tier: st.tier, sold: sh.sold, cap: sh.capacity, production: t.production, minutes: t.minutes, crew: t.crew, travelDays: st.travelDays, setlist: t.setlist, bonus, cityId: sh.cityId });
  const note: ShowNote = { day: today, cityId: sh.cityId, tier: st.tier, sold: sh.sold, cap: sh.capacity, ...n };
  const mine = isMine(s, act.id);
  const cityL = cityById[sh.cityId]?.name ?? l(sh.cityId);
  if (sh.sold >= sh.capacity * 0.97 && ratio >= 1.5 && st.tier >= 1) {
    const minutes = Math.max(1, Math.round(90 / ratio));
    note.soldOutMin = minutes;
    if (minutes <= 30 && mine) {
      act.momentum = clamp(act.momentum + 2, 0, 100);
      bump(s, 'sellouts');
      notify(s, fmtL(l('Ingressos de {a} em {c} esgotam em {m} minutos!', '{a} tickets in {c} sell out in {m} minutes!'), { a: act.name, c: cityL, m: minutes }), 'good');
      remember(s, 'sellout', fmtL(l('Notícia: {a} esgota {c} em {m} minutos.', 'News: {a} sells out {c} in {m} minutes.'), { a: act.name, c: cityL, m: minutes }), { actId: act.id, important: st.tier >= 3 });
    }
    if (mine && !(lv.tickets.dynamic && dynamicPricingAvailable(s)) && ratio >= 1.4) {
      if (act.image) act.image.publicImage = clamp(act.image.publicImage - 0.3, 0, 100);
      s.daily.push({ day: today, kind: 'tour', actId: act.id, tone: 'bad', text: fmtL(l('Cambistas revendem ingressos de {a} em {c} pelo triplo.', 'Scalpers resell {a} tickets in {c} at triple price.'), { a: act.name, c: cityL }) });
    }
  }
  if (mine && lv.tickets.dynamic && dynamicPricingAvailable(s) && ratio > 1.3 && act.image) act.image.publicImage = clamp(act.image.publicImage - 0.4, 0, 100);
  if (mine && lv.tickets.vip && st.tier >= 2) act.fans.core += Math.round(sh.sold * 0.001);
  // efeitos das notas: empolgação vira fãs e reputação; cansaço pesa nos músicos
  if (mine) {
    if (note.ex >= 75) {
      act.fans.core += Math.round(sh.sold * 0.004);
      act.momentum = clamp(act.momentum + 1, 0, 100);
      s.player.reputation.artists = clamp(s.player.reputation.artists + 0.15, 0, 100);
      bump(s, 'greatShows');
    } else if (note.ex < 35) act.momentum = clamp(act.momentum - 1, 0, 100);
    if (note.fat >= 60) for (const id of act.members) if (s.persons[id]) s.persons[id].fatigue = clamp(s.persons[id].fatigue + note.fat / 40, 0, 100);
    bump(s, 'shows');
    bump(s, 'showPeople', sh.sold);
  }
  const list = (lv.notes[t.id] ??= []);
  list.push(note);
  if (list.length > 40) list.splice(0, list.length - 40);
  // só guarda notas de turnês recentes
  const keep = new Set(s.tours.map((x) => x.id));
  for (const k of Object.keys(lv.notes)) if (!keep.has(k)) delete lv.notes[k];
  for (const k of Object.keys(lv.curves)) if (!keep.has(k)) delete lv.curves[k];
  for (const k of Object.keys(lv.liveQueued)) if (!keep.has(k)) delete lv.liveQueued[k];
  // show ao vivo (mini-jogo) nas noites grandes do jogador
  if (mine && st.tier >= LIVE_TIER_MIN && (lv.liveQueued[t.id] ?? 0) < 2) {
    lv.liveQueued[t.id] = (lv.liveQueued[t.id] ?? 0) + 1;
    queueCutscene(s, 'liveShow', {
      title: fmtL(l('Ao vivo: {a} em {c}', 'Live: {a} in {c}'), { a: act.name, c: cityL }),
      key: `${t.id}:${today}`, actId: act.id, cityId: sh.cityId, tier: st.tier, sold: sh.sold, cap: sh.capacity, ex: note.ex,
    });
  }
});

// ---------------------------------------------------------------- show ao vivo (mini-jogo)

export interface IncidentCard {
  label: L;
  hint: L;
  stat: 'stage' | 'crew' | 'calm' | 'safe';
  gain: number;
  risk: number;
}

export interface Incident {
  id: string;
  text: L;
  cards: IncidentCard[];
}

export const INCIDENTS: Incident[] = [
  { id: 'mic', text: l('O microfone principal falha no meio do refrão!', 'The main mic dies in the middle of the chorus!'), cards: [
    { label: l('Cantar sem microfone com o público', 'Sing unplugged with the crowd'), hint: l('Depende do carisma de palco.', 'Depends on stage presence.'), stat: 'stage', gain: 14, risk: 0.15 },
    { label: l('Equipe troca o microfone em segundos', 'Crew swaps the mic in seconds'), hint: l('Depende da equipe técnica.', 'Depends on the road crew.'), stat: 'crew', gain: 8, risk: 0 },
    { label: l('Solo de guitarra para ganhar tempo', 'Guitar solo to buy time'), hint: l('Seguro, sem brilho.', 'Safe, not brilliant.'), stat: 'safe', gain: 3, risk: 0 },
  ] },
  { id: 'rain', text: l('Começa a chover forte sobre a plateia.', 'Heavy rain starts pouring on the crowd.'), cards: [
    { label: l('Tocar a balada da chuva', 'Play the rain ballad'), hint: l('Momento mágico se a banda segurar.', 'Magic moment if the band holds it.'), stat: 'stage', gain: 15, risk: 0.2 },
    { label: l('Pausa técnica de dez minutos', 'Ten-minute technical pause'), hint: l('Protege o equipamento.', 'Protects the gear.'), stat: 'safe', gain: -2, risk: 0 },
    { label: l('Distribuir capas na frente do palco', 'Hand out ponchos up front'), hint: l('Depende da produção.', 'Depends on the crew.'), stat: 'crew', gain: 7, risk: 0.05 },
  ] },
  { id: 'fight', text: l('Uma briga começa perto da grade.', 'A fight breaks out near the barrier.'), cards: [
    { label: l('Parar a música e pedir calma', 'Stop the song and ask for calm'), hint: l('Líder sereno acalma; nervoso piora.', 'A calm leader soothes it; a tense one makes it worse.'), stat: 'calm', gain: 9, risk: 0.1 },
    { label: l('Chamar a segurança e seguir', 'Call security and keep going'), hint: l('Depende da equipe.', 'Depends on the crew.'), stat: 'crew', gain: 5, risk: 0 },
    { label: l('Aumentar o volume', 'Turn it up'), hint: l('Arriscado.', 'Risky.'), stat: 'stage', gain: 6, risk: 0.35 },
  ] },
  { id: 'invasion', text: l('Um fã invade o palco e abraça o vocalista!', 'A fan rushes the stage and hugs the singer!'), cards: [
    { label: l('Cantar um trecho com o fã', 'Sing a bit with the fan'), hint: l('Vira lenda — ou vira caos.', 'Becomes legend — or chaos.'), stat: 'stage', gain: 16, risk: 0.25 },
    { label: l('Segurança retira com gentileza', 'Security removes them gently'), hint: l('Depende da equipe.', 'Depends on the crew.'), stat: 'crew', gain: 4, risk: 0 },
    { label: l('Ignorar e seguir tocando', 'Ignore it and keep playing'), hint: l('Depende do sangue-frio.', 'Depends on composure.'), stat: 'calm', gain: 3, risk: 0.05 },
  ] },
  { id: 'power', text: l('Cai a luz de metade do palco.', 'Half the stage loses power.'), cards: [
    { label: l('Acústico à luz dos celulares/isqueiros', 'Acoustic set under lighters and phones'), hint: l('Depende do talento.', 'Depends on talent.'), stat: 'stage', gain: 13, risk: 0.15 },
    { label: l('Gerador reserva', 'Backup generator'), hint: l('Depende da equipe.', 'Depends on the crew.'), stat: 'crew', gain: 7, risk: 0.05 },
    { label: l('Esperar a luz voltar', 'Wait for power'), hint: l('Perde energia.', 'Loses energy.'), stat: 'safe', gain: -4, risk: 0 },
  ] },
  { id: 'request', text: l('A plateia inteira pede uma música antiga fora do setlist.', 'The whole crowd chants for an old song not on the setlist.'), cards: [
    { label: l('Tocar de improviso', 'Play it on the spot'), hint: l('Depende do ensaio e do palco.', 'Depends on rehearsal and stage skill.'), stat: 'stage', gain: 12, risk: 0.2 },
    { label: l('Prometer para o bis', 'Promise it for the encore'), hint: l('Seguro.', 'Safe.'), stat: 'calm', gain: 6, risk: 0 },
    { label: l('Seguir o roteiro', 'Stick to the plan'), hint: l('A plateia esfria um pouco.', 'The crowd cools a little.'), stat: 'safe', gain: -3, risk: 0 },
  ] },
];

function statSkill(s: GameState, actId: string, stat: IncidentCard['stat']): number {
  const act = s.acts[actId];
  if (!act) return 0.3;
  if (stat === 'stage') return actTalent(s, act).stage / 100;
  if (stat === 'crew') {
    const t = s.tours.find((x) => x.actId === actId && (x.status === 'running' || x.status === 'done'));
    return clamp((t?.crew ?? 2) / 16 + staffSkill(s, 'tour_manager') / 150, 0, 1);
  }
  if (stat === 'calm') {
    const ms = act.members.map((id) => s.persons[id]).filter(Boolean);
    return ms.length ? ms.reduce((t, p) => t + (100 - p.stress), 0) / ms.length / 100 : 0.5;
  }
  return 1;
}

/** Resolve uma carta de resposta. `roll` (0..1) vem da interface; o resultado depende dos atributos. */
export function resolveCard(s: GameState, actId: string, card: IncidentCard, roll: number): { delta: number; ok: boolean; chance: number } {
  const chance = card.stat === 'safe' ? 1 : clamp(0.35 + statSkill(s, actId, card.stat) * 0.6 - card.risk, 0.05, 0.95);
  const ok = roll < chance;
  return { delta: ok ? card.gain : -Math.round(Math.abs(card.gain) * 0.6), ok, chance };
}

/** Energia esperada sem jogar (resolver automático). */
export function autoLiveEnergy(s: GameState, actId: string, ex: number): number {
  const act = s.acts[actId];
  const stage = act ? actTalent(s, act).stage : 30;
  return Math.round(clamp(30 + stage * 0.3 + ex * 0.3, 20, 85));
}

/** Aplica o resultado do show ao vivo (bônus limitado a +10%). */
export function finishLiveShow(s: GameState, key: string, actId: string, sold: number, energy: number): { bonus: number } | null {
  const lv = liveOf(s);
  if (lv.liveDone[key] !== undefined) return null;
  const act = s.acts[actId];
  if (!act) return null;
  energy = clamp(Math.round(energy), 0, 100);
  lv.liveDone[key] = energy;
  const keys = Object.keys(lv.liveDone);
  if (keys.length > 60) for (const k of keys.slice(0, keys.length - 60)) delete lv.liveDone[k];
  const bonus = clamp(((energy - 50) / 50) * 0.1, -0.05, 0.1);
  act.fans.casual = Math.max(0, act.fans.casual + Math.round(sold * bonus * 1.5));
  act.fans.active = Math.max(0, act.fans.active + Math.round(sold * bonus * 0.3));
  act.momentum = clamp(act.momentum + bonus * 40, 0, 100);
  act.fame = clamp(act.fame + bonus * 8, 0, 100);
  s.player.reputation.artists = clamp(s.player.reputation.artists + bonus * 10, 0, 100);
  bump(s, 'liveShows');
  if (energy >= 85) {
    bump(s, 'legendaryShows');
    remember(s, 'legendary_show', fmtL(l('Show lendário de {a}: o público não esquece.', 'A legendary {a} show: the crowd won\'t forget it.'), { a: act.name }), { actId, important: true });
  }
  return { bonus };
}

export function avgNotes(list: ShowNote[]): { ex: number; int: number; fat: number } {
  if (!list.length) return { ex: 0, int: 0, fat: 0 };
  const a = (k: 'ex' | 'int' | 'fat') => Math.round(list.reduce((t, x) => t + x[k], 0) / list.length);
  return { ex: a('ex'), int: a('int'), fat: a('fat') };
}

/** Chamado pela simulação de tours (gancho 'show') — e exportado para testes do modificador. */
export function previewShowRevenue(s: GameState, actId: string, cityId: string, tier: number, ratio: number, gross: number): number {
  const lv = liveOf(s);
  const prev = lv.cur;
  lv.cur = { actId, cityId, tier, ratio };
  const v = applyMods(s, 'showRevenue', gross, { act: s.acts[actId], cityId }).value;
  lv.cur = prev;
  return Math.round(v);
}
