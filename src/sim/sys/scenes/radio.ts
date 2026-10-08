// Visita à rádio + mini-jogo "Programa de rádio": escolher o disco certo para o perfil do DJ.
// Acerto vira um impulso de apelo por algumas semanas (modificador 'appeal', aparece na autópsia).
// Jabá: aqui é só um sinal (envelope na mesa). O sistema de jabá em si é de outro módulo, que pode
// se registrar com registerPayolaHandler.

import type { Rng } from '../../../core/rng';
import { FAMILIES, familyOf, l, type FamilyId, type L } from '../../../data/world';
import { activeMembers, checkCapacity, monthIndex } from '../../capacity';
import type { Cutscene } from '../../ext4';
import type { GameState, Release } from '../../types';
import { fmtL, hasTech, remember } from '../../util';
import { clampN, cooled, findScene, patchScene, queueScene, sc, setCool, type PlaceKind } from './state';

export type DjMood = 'hits' | 'deep' | 'novelty';

export interface DjProfile {
  name: string;
  family: FamilyId;
  mood: DjMood;
  audience: L;
  seed: string;
}

export interface Station {
  name: string;
  band: 'AM' | 'FM' | 'playlist';
  place: PlaceKind;
}

const DJS = ['Big Joe Sales', 'Marta "Agulha" Lins', 'Tony Ventura', 'Lia Frequência', 'Zé do Dial', 'Kiki Moraes', 'Dr. Groove', 'Nina Onda', 'Rex Antena', 'Sol Mendes'];
const AUDIENCES: L[] = [
  l('donas de casa na hora do almoço', 'homemakers at lunchtime'),
  l('estudantes na madrugada', 'students after midnight'),
  l('motoristas no trânsito', 'commuters in traffic'),
  l('colecionadores exigentes', 'picky collectors'),
  l('adolescentes depois da escola', 'teens after school'),
  l('clubes e DJs de festa', 'clubs and party DJs'),
];
export const MOOD_NAMES: Record<DjMood, L> = {
  hits: l('quer o que já está estourando', 'wants what is already blowing up'),
  deep: l('quer qualidade, não importa a parada', 'wants quality, charts be damned'),
  novelty: l('quer a novidade fresquinha', 'wants the freshest thing out'),
};

/** Payola: outro módulo pode tratar o envelope. Devolve um texto para a cena. */
type PayolaHandler = (s: GameState, r: Rng, ctx: { actId: string; releaseId: string; station: Station }) => L | null;
let payolaHandler: PayolaHandler | null = null;
export function registerPayolaHandler(fn: PayolaHandler): void {
  payolaHandler = fn;
}
export function hasPayolaHandler(): boolean {
  return !!payolaHandler;
}

export function stationFor(s: GameState, seed: number): Station {
  const city = s.config.homeCity;
  if (hasTech(s, 'streaming')) return { name: ['Playlist Descobertas', 'Hits do Momento', 'Radar Novo'][seed % 3], band: 'playlist', place: 'curators' };
  if (hasTech(s, 'fm')) return { name: `FM ${88 + (seed % 20)}.${seed % 10} ${['Hits', 'Rock', 'Groove', 'Cidade'][seed % 4]}`, band: 'FM', place: 'radio_fm' };
  return { name: `Rádio ${['Nacional', 'Metrópole', 'Continental', 'Tupi', 'Mayrink'][seed % 5]} AM (${city})`, band: 'AM', place: 'radio_am' };
}

export function radioOptions(s: GameState, actId: string): Release[] {
  const act = s.acts[actId];
  if (!act) return [];
  return act.releases.map((id) => s.releases[id]).filter((x): x is Release => !!x && x.live && x.owner === 'player' && s.week - x.week < 60 && s.week >= x.week).sort((a, b) => b.week - a.week).slice(0, 4);
}

export function canVisitRadio(s: GameState, actId: string): L | null {
  const act = s.acts[actId];
  if (!act || (act.owner !== 'player' && !act.playerBand)) return l('Ato não é seu.', 'Not your act.');
  if (!hasTech(s, 'radio')) return l('Ainda não há rádio.', 'No radio yet.');
  if (!radioOptions(s, actId).length) return l('Precisa de um lançamento recente nas lojas.', 'Needs a recent release in stores.');
  if (!cooled(s, `radio:${actId}`, 8)) return l('Uma visita à rádio a cada 8 semanas por ato.', 'One radio visit every 8 weeks per act.');
  const conflict = checkCapacity(s, activeMembers(s, act), monthIndex(s), 1, 5);
  if (conflict) return conflict.text;
  return null;
}

export function startRadioVisit(s: GameState, r: Rng, actId: string): Cutscene | L {
  const why = canVisitRadio(s, actId);
  if (why) return why;
  const act = s.acts[actId];
  const seed = r.int(0, 9999);
  const station = stationFor(s, seed);
  const fams = FAMILIES.map((f) => f.id);
  const dj: DjProfile = {
    name: station.band === 'playlist' ? `${DJS[seed % DJS.length].split(' ')[0]} (curadoria)` : DJS[seed % DJS.length],
    family: r.chance(0.55) ? familyOf(act.genre) : r.pick(fams),
    mood: r.pick(['hits', 'deep', 'novelty'] as DjMood[]),
    audience: r.pick(AUDIENCES),
    seed: `dj${seed}`,
  };
  setCool(s, `radio:${actId}`);
  const options = radioOptions(s, actId).map((x) => x.id);
  const cs = queueScene(s, 'radio', station.place, {
    title: fmtL(l('Visita à rádio: {s}', 'Radio visit: {s}'), { s: station.name }),
    actId, station, dj, options,
  });
  if (!cs) return l('Agenda cheia.', 'Schedule full.');
  cs.seen = true;
  return cs;
}

/** Nota da escolha (0..1) para o perfil do DJ. */
export function radioFit(s: GameState, dj: DjProfile, rel: Release): number {
  const act = s.acts[rel.actId];
  let v = 0;
  if (act && familyOf(act.genre) === dj.family) v += 0.45;
  else if (act && familyOf(act.genre) === 'pop') v += 0.15;
  const age = s.week - rel.week;
  if (dj.mood === 'hits') v += clampN((60 - Math.min(60, rel.lastPos || rel.peak || 100)) / 100, 0, 0.45) + clampN(rel.appeal / 400, 0, 0.1);
  if (dj.mood === 'deep') v += clampN((rel.q - 40) / 110, 0, 0.55);
  if (dj.mood === 'novelty') v += clampN((10 - age) / 20, 0, 0.5);
  return clampN(v, 0, 1);
}

export function autoRadioPick(s: GameState, csId: string): string | null {
  const cs = findScene(s, csId);
  if (!cs) return null;
  const dj = cs.data.dj as DjProfile;
  const opts = (cs.data.options as string[]).map((id) => s.releases[id]).filter(Boolean);
  // automático: escolhe pelo gênero e pelo mais recente, sem ler o humor do DJ
  return opts.sort((a, b) => Number(familyOf(s.acts[b.actId]?.genre ?? '') === dj.family) - Number(familyOf(s.acts[a.actId]?.genre ?? '') === dj.family) || b.week - a.week)[0]?.id ?? null;
}

export function resolveRadio(s: GameState, r: Rng, csId: string, releaseId: string, payola = false): L {
  const cs = findScene(s, csId);
  if (!cs || cs.kind !== 'radio') return l('Visita não encontrada.', 'Visit not found.');
  if (cs.data.done) return cs.data.result as L;
  const rel = s.releases[releaseId];
  if (!rel || !(cs.data.options as string[]).includes(releaseId)) return l('Disco inválido.', 'Invalid record.');
  const dj = cs.data.dj as DjProfile;
  const station = cs.data.station as Station;
  const st = sc(s);
  const fit = radioFit(s, dj, rel);
  const key = `radio:${station.name}`;
  const rel0 = st.outlets[key] ?? 0;
  const roll = fit + rel0 / 400 + r.float(-0.1, 0.1);
  let result: L;
  if (roll >= 0.5) {
    const mult = 1 + clampN(0.04 + fit * 0.06, 0, 0.1); // até +10%
    st.radioBoost[rel.id] = { mult, until: s.week + 6, dj: dj.name };
    st.outlets[key] = clampN(rel0 + 6, -100, 100);
    result = fmtL(l('{d} toca "{t}" duas vezes seguidas e pede ao ouvinte que ligue. Apelo +{p}% por 6 semanas.', '{d} spins "{t}" twice in a row and asks listeners to call in. Appeal +{p}% for 6 weeks.'), { d: dj.name, t: rel.title, p: Math.round((mult - 1) * 100) });
  } else if (roll >= 0.25) {
    st.radioBoost[rel.id] = { mult: 1.02, until: s.week + 3, dj: dj.name };
    st.outlets[key] = clampN(rel0 + 2, -100, 100);
    result = fmtL(l('{d} toca "{t}" uma vez, sem muito entusiasmo. Apelo +2% por 3 semanas.', '{d} plays "{t}" once, without much enthusiasm. Appeal +2% for 3 weeks.'), { d: dj.name, t: rel.title });
  } else {
    st.outlets[key] = clampN(rel0 - 3, -100, 100);
    result = fmtL(l('{d} ouve 20 segundos de "{t}" e troca de disco. "Não é para o meu público."', '{d} listens to 20 seconds of "{t}" and swaps records. "Not for my audience."'), { d: dj.name, t: rel.title });
  }
  let payolaNote: L | null = null;
  if (payola) {
    st.stats.payolaSignals += 1;
    payolaNote = payolaHandler
      ? payolaHandler(s, r, { actId: rel.actId, releaseId: rel.id, station })
      : l('Você deixa um envelope sobre a mesa. O DJ finge não ver — por enquanto não há esquema de jabá montado.', 'You leave an envelope on the desk. The DJ pretends not to see it — there is no payola scheme in place yet.');
  }
  st.stats.radio += 1;
  patchScene(s, csId, { done: true, result, pick: rel.id, payola, payolaNote, fit });
  remember(s, 'radio_visit', fmtL(l('Visita à {s}: {r}', 'Visit to {s}: {r}'), { s: station.name, r: result }), { actId: rel.actId });
  return result;
}

/** Modificador de apelo dos lançamentos que tocaram na rádio. */
export function radioAppeal(s: GameState, value: number, relId?: string): { value: number; label?: L } | null {
  if (!relId) return null;
  const b = sc(s).radioBoost[relId];
  if (!b || b.until < s.week) return null;
  return { value: value * b.mult, label: fmtL(l('Rádio ({d})', 'Radio ({d})'), { d: b.dj }) };
}

export function radioCleanup(s: GameState): void {
  const b = sc(s).radioBoost;
  for (const k of Object.keys(b)) if (b[k].until < s.week) delete b[k];
}
