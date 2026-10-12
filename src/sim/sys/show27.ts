// r27 (M2) — SHOW JOGÁVEL. Um show marcado na turnê vira uma atividade curta:
//   antes  — montar o setlist com o repertório real do ato (sucessos × inéditas × covers, abertura, fecho, ritmo);
//   durante — corrida comprimida música a música com o medidor de energia do público e 2–3 momentos de decisão
//             tirados de situações (falar com a plateia, estrear inédita, briga no palco, queda de energia,
//             invasão de palco, chuva a céu aberto, bis);
//   depois  — o resultado vira o MESMO desfecho do show de sempre (tours.playStop: bilheteria, merch, fãs, fama,
//             cansaço, moral) com ajustes limitados, mais fama no país da cidade, fatos de imprensa e uma resenha.
// Tudo puro e determinístico: a sorte vem de Rng.fromSeed(semente|show27v1|show|parte) — nunca de s.rng.
// O modo rápido (tourDay) não passa por aqui: a simulação de sempre continua idêntica para bots e testes.

import { Rng, clamp, hashString } from '../../core/rng';
import { VENUE_TIERS } from '../../data/rules';
import { countryOfCity } from '../../data/geo';
import { cityById, l, type L } from '../../data/world';
import { emitFact } from '../facts17';
import { actTalent } from '../people';
import { cityDemand, playStop, tourEnd, type StopMods27 } from '../tours';
import { climateInfo } from '../travelAdapter';
import { liveBlocked } from '../culture';
import type { Act, GameState, Song } from '../types';
import type { Tour, TourStop } from '../xtypes';
import { dateOfDay, fmtL, money, remember, staffSkill } from '../util';
import { songStatus } from '../repertoire';
import { nudge16 } from './fame16';
import { idealEnergy, scoreCurve, songEnergy } from './live/notes';
import { liveOf } from './live/state';

export const SHOW27_RNG = 'show27v1';
const rng27 = (s: GameState, key: string, part: string) => Rng.fromSeed(`${s.config.seed}|${SHOW27_RNG}|${key}|${part}`);
const today27 = (s: GameState) => s.day + s.clock.dayInMonth;
const mine27 = (a?: Act): a is Act => !!a && (a.owner === 'player' || !!a.playerBand);

// ---------------------------------------------------------------- repertório

export type Kind27 = 'hit' | 'deep' | 'new' | 'cover';
export interface Song27 { id: string; kind: Kind27; title: string; q: number; energy: number; appeal: number; hit: number }
export const KIND27: Record<Kind27, L> = {
  hit: l('Sucesso', 'Hit'), deep: l('Lado B', 'Deep cut'), new: l('Inédita', 'New song'), cover: l('Cover', 'Cover'),
};

const COVERS27: { id: string; t: L }[] = [
  { id: 'cover:1', t: l('Clássico do gênero', 'Genre classic') },
  { id: 'cover:2', t: l('Hino que todo mundo canta', 'Singalong anthem') },
  { id: 'cover:3', t: l('Sucesso do momento (versão)', 'Current hit (cover)') },
];

/** Repertório tocável do ato: lançadas (sucesso ou lado B, pelo desempenho do disco), inéditas e covers. */
export function repertoire27(s: GameState, act: Act): Song27[] {
  const best = new Map<string, number>();
  for (const id in s.releases) {
    const r = s.releases[id];
    if (r.actId !== act.id) continue;
    const sc = clamp((r.peak > 0 ? (101 - r.peak) * 0.7 : 0) + Math.log10(1 + r.totalUnits) * 7 + (r.type === 'single' ? 8 : 0), 0, 100);
    for (const sid of r.songs) best.set(sid, Math.max(best.get(sid) ?? 0, sc));
  }
  const out: Song27[] = [];
  for (const sid of act.songs) {
    const so: Song | undefined = s.songs[sid];
    if (!so || so.coverOf || so.remixOf) continue;
    const st = songStatus(s, so);
    if (st === 'discarded') continue;
    const released = st === 'released';
    if (!released && !so.recorded && so.q < 30) continue; // rascunho fraco não sobe ao palco
    const hit = released ? Math.round(best.get(sid) ?? 0) : 0;
    const e = songEnergy(so);
    const kind: Kind27 = !released ? 'new' : hit >= 45 ? 'hit' : 'deep';
    const appeal = kind === 'hit' ? 58 + hit * 0.4 : kind === 'deep' ? 34 + so.q * 0.3 : 26 + so.q * 0.32;
    out.push({ id: sid, kind, title: so.title, q: so.q, energy: e, appeal: Math.round(clamp(appeal, 10, 99)), hit });
  }
  // sem nenhum sucesso, os 2 discos mais fortes viram "os conhecidos" do ato
  if (!out.some((x) => x.kind === 'hit')) {
    const top = out.filter((x) => x.kind === 'deep').sort((a, b) => b.hit - a.hit || b.q - a.q).slice(0, 2);
    for (const x of top) { x.kind = 'hit'; x.appeal = Math.round(clamp(x.appeal + 12, 10, 99)); }
  }
  // covers: a plateia conhece; ato famoso tocando cover demais soa como falta de repertório
  const fam = (hashString(act.genre) % 20) - 10;
  COVERS27.forEach((c, i) => out.push({ id: c.id, kind: 'cover', title: c.t.pt, q: 50, energy: clamp(62 + fam + i * 6, 20, 95), appeal: Math.round(clamp(60 - act.fame * 0.25, 30, 70)), hit: 0 }));
  return out.sort((a, b) => order27(a.kind) - order27(b.kind) || b.appeal - a.appeal || (a.id < b.id ? -1 : 1));
}
const order27 = (k: Kind27) => ({ hit: 0, deep: 1, new: 2, cover: 3 })[k];

export const coverTitle27 = (id: string): L | undefined => COVERS27.find((c) => c.id === id)?.t;

// ---------------------------------------------------------------- contexto do show

export interface Show27 {
  key: string; tourId: string; day: number; actId: string; cityId: string; tier: number; cap: number;
  /** público esperado (previsão de bilheteria) */
  exp: number; year: number; month: number; openAir: boolean; rainy: boolean;
  members: number; stage: number; crew: number; sec: number; calm: number; tension: number; fame: number;
  production: number; minutes: number; n: number; pool: Song27[];
}

export const showKey27 = (tourId: string, day: number) => `${tourId}:${day}`;

/** Próximos shows jogáveis (atos do jogador, data marcada nos próximos `days` dias, sem bloqueio na região). */
export function playableShows27(s: GameState, days = 21): { t: Tour; st: TourStop }[] {
  const d0 = today27(s);
  const out: { t: Tour; st: TourStop }[] = [];
  for (const t of s.tours) {
    if (t.status !== 'planned' && t.status !== 'running') continue;
    if (!mine27(s.acts[t.actId])) continue;
    const st = t.stops.find((x) => x.status === 'scheduled');
    if (st && st.day >= d0 && st.day < d0 + days && !liveBlocked(s, st.cityId)) out.push({ t, st });
  }
  return out.sort((a, b) => a.st.day - b.st.day);
}

/** Por que este show não pode ser jogado agora (ou null). */
export function showGate27(s: GameState, key: string): L | null {
  const i = key.lastIndexOf(':');
  const t = s.tours.find((x) => x.id === key.slice(0, i));
  const st = t?.stops.find((x) => x.day === Number(key.slice(i + 1)));
  if (!t || !st) return l('Show não encontrado.', 'Show not found.');
  if (st.status !== 'scheduled') return l('Este show já aconteceu ou foi cancelado.', 'This show already happened or was cancelled.');
  const act = s.acts[t.actId];
  if (!mine27(act) || act.status === 'retired' || act.status === 'split') return l('Só shows dos seus artistas.', 'Only your own acts\' shows.');
  if (t.stops.some((x) => x.status === 'scheduled' && x.day < st.day)) return l('Jogue antes as datas anteriores da turnê.', 'Play the earlier tour dates first.');
  if (st.day < today27(s)) return l('A data já passou.', 'The date has passed.');
  const b = liveBlocked(s, st.cityId);
  if (b) return fmtL(l('Shows suspensos na região ({w}).', 'Shows suspended in the region ({w}).'), { w: b.name });
  return null;
}

export function showCtx27(s: GameState, key: string): Show27 | null {
  if (showGate27(s, key)) return null;
  const i = key.lastIndexOf(':');
  const t = s.tours.find((x) => x.id === key.slice(0, i))!;
  const st = t.stops.find((x) => x.day === Number(key.slice(i + 1)))!;
  const act = s.acts[t.actId];
  const month = dateOfDay(s.config.startYear, st.day).month;
  const clim = climateInfo(s, st.cityId, month);
  const ms = act.members.map((id) => s.persons[id]).filter((p) => p && p.alive);
  const calm = ms.length ? ms.reduce((x, p) => x + (100 - p.stress), 0) / ms.length / 100 : 0.5;
  const b18 = (s.x4 as unknown as { live18?: { band?: Record<string, { chem: number; fights: number }> } }).live18?.band?.[act.id];
  const tension = clamp((b18?.fights ?? 0) * 0.15 + (1 - calm) * 0.6 - (b18?.chem ?? 0) / 200, 0, 1);
  const demand = cityDemand(s, act, st.cityId) * (t.role === 'opening' ? 0.3 : 1);
  const priceMult = st.price / Math.max(1, money(s, [12, 25, 45, 70, 95][st.tier] ?? 25));
  const exp = Math.round(Math.min(st.capacity, demand / Math.pow(Math.max(0.2, priceMult), 1.2)));
  const n = clamp(Math.round(t.minutes / 5) + 1, 5, 14);
  return {
    key, tourId: t.id, day: st.day, actId: act.id, cityId: st.cityId, tier: st.tier, cap: st.capacity, exp, year: s.year, month,
    openAir: st.tier >= 4, rainy: clim.outdoorFactor < 0.97 || clim.cancelRisk > 0.004,
    members: ms.length, stage: actTalent(s, act).stage / 100,
    crew: clamp(t.crew / 16 + staffSkill(s, 'tour_manager') / 150, 0, 1),
    sec: clamp([0.3, 0.6, 0.85][t.kit18?.sec ?? 0] + Math.min(4, t.crew) / 40, 0, 1),
    calm, tension, fame: act.fame, production: t.production, minutes: t.minutes, n, pool: repertoire27(s, act),
  };
}

// ---------------------------------------------------------------- setlist

/** Setlist automático (bom, não perfeito): os sucessos e as melhores, abre com a 2ª mais forte, fecha com a mais forte. */
export function autoSet27(c: Show27): string[] {
  const own = c.pool.filter((x) => x.kind !== 'cover');
  const pick = [...own].sort((a, b) => b.appeal - a.appeal).slice(0, c.n);
  let i = 0;
  while (pick.length < Math.min(c.n, own.length + 3) && i < 3) { const cv = c.pool.find((x) => x.id === `cover:${i + 1}`); if (cv) pick.push(cv); i++; }
  if (pick.length < 3) return pick.map((x) => x.id);
  const byE = [...pick].sort((a, b) => b.energy - a.energy || b.appeal - a.appeal);
  const closer = byE[0];
  const opener = byE[1];
  const mid = pick.filter((x) => x !== closer && x !== opener).sort((a, b) => b.energy - a.energy);
  // respiro no meio: alterna forte/fraca
  const hi = mid.slice(0, Math.ceil(mid.length / 2));
  const lo = mid.slice(Math.ceil(mid.length / 2)).reverse();
  const body: Song27[] = [];
  while (hi.length || lo.length) { if (hi.length) body.push(hi.shift()!); if (lo.length) body.push(lo.shift()!); }
  return [opener, ...body, closer].map((x) => x.id);
}

export interface Plan27 {
  /** 0–100: ritmo (curva), sucessos na medida da fama, inéditas e covers */
  score: number;
  q: number; cover: number; energies: number[];
  hits: number; news: number; covers: number; why: L[];
}

/** Nota do setlist e o que ele leva para o show (qualidade média e penalidade de covers — como no tourDay). */
export function planScore27(c: Show27, ids: string[]): Plan27 {
  const items = ids.map((id) => c.pool.find((x) => x.id === id)).filter((x): x is Song27 => !!x);
  const why: L[] = [];
  if (!items.length) return { score: 0, q: 35, cover: 0.75, energies: [], hits: 0, news: 0, covers: 0, why: [l('Setlist vazio.', 'Empty setlist.')] };
  const energies = items.map((x) => x.energy);
  const curve = scoreCurve(energies);
  let score = clamp(curve.score, 0, 100) * 0.55;
  why.push(...curve.why.slice(0, 2));
  const hits = items.filter((x) => x.kind === 'hit').length;
  const news = items.filter((x) => x.kind === 'new').length;
  const covers = items.filter((x) => x.kind === 'cover').length;
  const hitAvail = c.pool.filter((x) => x.kind === 'hit').length;
  // sucessos: público de ato famoso quer ouvir os conhecidos
  const wantHits = Math.min(hitAvail, Math.max(1, Math.round(items.length * clamp(0.15 + c.fame / 160, 0.15, 0.6))));
  if (!hitAvail) { score += 12; why.push(l('Ainda sem sucessos: o público vem pela novidade.', 'No hits yet: people come for something new.')); }
  else if (hits >= wantHits) { score += 20; why.push(l('Os sucessos estão lá: a plateia canta junto.', 'The hits are there: the crowd sings along.')); }
  else { score += 20 * hits / Math.max(1, wantHits); why.push(fmtL(l('Faltam sucessos: o público esperava {n}.', 'Missing hits: the crowd expected {n}.'), { n: wantHits })); }
  // inéditas: 1–2 dão assunto; mais que isso esfria a noite
  if (news === 1 || news === 2) { score += 8; why.push(l('Inéditas na medida: dá assunto sem esfriar.', 'Just enough new songs: buzz without cooling the room.')); }
  else if (news > 2) { score += 8 - (news - 2) * 6; why.push(l('Inéditas demais: a plateia não conhece e esfria.', 'Too many new songs: the crowd does not know them and cools.')); }
  // covers: ajudam quem começa, pegam mal para quem já é grande
  if (covers) {
    if (c.fame < 25) { score += Math.min(2, covers) * 4; why.push(l('Covers seguram a plateia de quem ainda está começando.', 'Covers hold the crowd while you are still starting out.')); }
    else if (c.fame > 45) { score -= covers * 5; why.push(l('Covers demais para um ato desse tamanho.', 'Too many covers for an act this size.')); }
  }
  // duração: curto demais decepciona; longo demais cansa
  const dn = items.length - c.n;
  if (dn < -2) { score -= (-dn - 2) * 4; why.push(l('Show curto para o ingresso.', 'Short show for the ticket price.')); }
  if (dn > 2) { score -= (dn - 2) * 2; why.push(l('Show longo: a banda chega cansada ao fim.', 'Long show: the band reaches the end tired.')); }
  const own = items.filter((x) => x.kind !== 'cover');
  const q = own.length ? own.reduce((x, y) => x + y.q, 0) / own.length : 35;
  const need = Math.ceil(c.minutes / 4);
  const cover = own.length >= need ? 1 : 0.75 + 0.25 * (own.length / need);
  return { score: Math.round(clamp(score + 17, 0, 100)), q, cover, energies, hits, news, covers, why };
}

// ---------------------------------------------------------------- momentos de decisão

export type Sit27 = 'talk' | 'debut' | 'fight' | 'power' | 'invasion' | 'rain' | 'encore';
export type Stat27 = 'stage' | 'crew' | 'calm' | 'security' | 'safe';
export interface Eff27 { e: number; fame?: number; fat?: number; morale?: number; fans?: number; news?: L; bad?: boolean }
export interface Opt27 { label: L; hint: L; stat: Stat27; risk: number; ok: Eff27; ko: Eff27 }
export interface Moment27 { sit: Sit27; at: number; text: L; opts: Opt27[] }

const SIT27: Record<Exclude<Sit27, 'encore'>, { text: L; opts: Opt27[] }> = {
  talk: { text: l('Pausa entre músicas: a plateia espera você dizer alguma coisa.', 'Gap between songs: the crowd waits for you to say something.'), opts: [
    { label: l('Discurso sobre a cidade', 'Speech about the city'), hint: l('Carisma de palco. Vira manchete local se pegar.', 'Stage charisma. Local headline if it lands.'), stat: 'stage', risk: 0.1, ok: { e: 8, fame: 0.3, news: l('discurso sobre a cidade emocionou a plateia', 'a speech about the city moved the crowd') }, ko: { e: -5 } },
    { label: l('Contar a história da próxima música', 'Tell the story behind the next song'), hint: l('Seguro, aproxima.', 'Safe, builds connection.'), stat: 'safe', risk: 0, ok: { e: 3 }, ko: { e: 3 } },
    { label: l('Chamar um fã ao palco', 'Invite a fan on stage'), hint: l('Momento viral — ou constrangedor.', 'Viral moment — or awkward.'), stat: 'stage', risk: 0.28, ok: { e: 12, fans: 0.06, news: l('fã chamado ao palco virou o momento da noite', 'a fan invited on stage became the moment of the night') }, ko: { e: -7, bad: true } },
  ] },
  debut: { text: l('A banda olha para você: estrear agora a música nova?', 'The band looks at you: debut the new song now?'), opts: [
    { label: l('Estrear a inédita', 'Debut the new song'), hint: l('Depende do palco. Dá assunto na imprensa.', 'Depends on stage skill. Gets press talking.'), stat: 'stage', risk: 0.2, ok: { e: 5, fame: 0.25, news: l('estreou uma música nova ao vivo', 'debuted a new song live') }, ko: { e: -8, news: l('estreia de música nova não pegou', 'new song debut fell flat'), bad: true } },
    { label: l('Ficar no roteiro', 'Stick to the plan'), hint: l('Nada muda.', 'Nothing changes.'), stat: 'safe', risk: 0, ok: { e: 0 }, ko: { e: 0 } },
  ] },
  fight: { text: l('Dois integrantes discutem no palco, à vista de todos.', 'Two members argue on stage, in plain sight.'), opts: [
    { label: l('Parar e resolver ali mesmo', 'Stop and sort it out right there'), hint: l('Sangue-frio do grupo.', 'The group\'s composure.'), stat: 'calm', risk: 0.15, ok: { e: 2, morale: 2 }, ko: { e: -12, morale: -5, news: l('briga no palco interrompeu o show', 'an onstage fight stopped the show'), bad: true } },
    { label: l('Seguir tocando como se nada fosse', 'Keep playing as if nothing happened'), hint: l('A tensão fica para depois.', 'The tension is left for later.'), stat: 'safe', risk: 0, ok: { e: -3, morale: -3 }, ko: { e: -3, morale: -3 } },
    { label: l('Sair do palco por cinco minutos', 'Leave the stage for five minutes'), hint: l('Esfria a plateia, acalma a banda.', 'Cools the crowd, calms the band.'), stat: 'safe', risk: 0, ok: { e: -7, morale: 2 }, ko: { e: -7, morale: 2 } },
  ] },
  power: { text: l('Cai a energia: metade do palco apaga.', 'Power failure: half the stage goes dark.'), opts: [
    { label: l('Seguir no acústico, à luz da plateia', 'Go acoustic under the crowd\'s lights'), hint: l('Depende do talento de palco.', 'Depends on stage talent.'), stat: 'stage', risk: 0.15, ok: { e: 13, fame: 0.25, news: l('virou acústico no escuro e a plateia cantou tudo', 'went acoustic in the dark and the crowd sang every word') }, ko: { e: -10, bad: true } },
    { label: l('Gerador reserva', 'Backup generator'), hint: l('Depende da equipe técnica.', 'Depends on the road crew.'), stat: 'crew', risk: 0.05, ok: { e: 4 }, ko: { e: -9, news: l('apagão longo no meio do show', 'a long blackout mid-show'), bad: true } },
    { label: l('Esperar a luz voltar', 'Wait for the power'), hint: l('Perde energia, sem risco.', 'Loses energy, no risk.'), stat: 'safe', risk: 0, ok: { e: -6 }, ko: { e: -6 } },
  ] },
  invasion: { text: l('Um fã pula a grade e invade o palco!', 'A fan jumps the barrier and rushes the stage!'), opts: [
    { label: l('Cantar um trecho com o fã', 'Sing a bit with the fan'), hint: l('Vira lenda — ou vira caos.', 'Becomes legend — or chaos.'), stat: 'stage', risk: 0.25, ok: { e: 14, fame: 0.3, fans: 0.05, news: l('cantou com um fã que invadiu o palco', 'sang with a fan who rushed the stage') }, ko: { e: -10, news: l('invasão de palco virou confusão', 'a stage invasion turned into chaos'), bad: true } },
    { label: l('Segurança retira com gentileza', 'Security removes them gently'), hint: l('Depende da segurança da turnê.', 'Depends on the tour\'s security.'), stat: 'security', risk: 0, ok: { e: 3 }, ko: { e: -8, bad: true } },
    { label: l('Ignorar e seguir tocando', 'Ignore it and keep playing'), hint: l('Sangue-frio.', 'Composure.'), stat: 'calm', risk: 0.05, ok: { e: 1 }, ko: { e: -5 } },
  ] },
  rain: { text: l('Começa a chover forte sobre o estádio aberto.', 'Heavy rain starts over the open-air stadium.'), opts: [
    { label: l('Tocar na chuva, sem parar', 'Play on in the rain'), hint: l('Noite épica se a banda aguentar. Cansa mais.', 'Epic night if the band holds up. More tiring.'), stat: 'stage', risk: 0.2, ok: { e: 15, fame: 0.35, fat: 3, news: l('show épico debaixo de chuva', 'an epic show in the pouring rain') }, ko: { e: -10, fat: 4, news: l('chuva e som ruim estragaram a noite', 'rain and bad sound ruined the night'), bad: true } },
    { label: l('Pausa técnica de dez minutos', 'Ten-minute technical pause'), hint: l('Protege o equipamento.', 'Protects the gear.'), stat: 'safe', risk: 0, ok: { e: -5 }, ko: { e: -5 } },
    { label: l('Capas para a plateia', 'Ponchos for the crowd'), hint: l('Depende da produção.', 'Depends on the crew.'), stat: 'crew', risk: 0.05, ok: { e: 7 }, ko: { e: -4 } },
  ] },
};

function encore27(c: Show27, ids: string[]): Moment27 {
  const hasNew = c.pool.some((x) => x.kind === 'new' && !ids.includes(x.id));
  const opts: Opt27[] = [
    { label: l('Bis com mais duas', 'Encore: two more songs'), hint: l('A plateia pede. Cansa um pouco.', 'The crowd wants it. A bit tiring.'), stat: 'stage', risk: 0.1, ok: { e: 9, fat: 1.5 }, ko: { e: -3, fat: 1.5 } },
  ];
  if (hasNew) opts.push({ label: l('Bis com uma inédita', 'Encore with a new song'), hint: l('Fecha com notícia. Arriscado.', 'Ends with news. Risky.'), stat: 'stage', risk: 0.25, ok: { e: 6, fame: 0.25, fat: 1, news: l('fechou o bis com uma música inédita', 'closed the encore with a brand-new song') }, ko: { e: -6, fat: 1 } });
  opts.push({ label: l('Agradecer e sair', 'Say thanks and leave'), hint: l('Sem bis: descansa, mas quem queria mais sai frustrado.', 'No encore: rest, but those who wanted more leave frustrated.'), stat: 'safe', risk: 0, ok: { e: -4, fat: -1.5 }, ko: { e: -4, fat: -1.5 } });
  return { sit: 'encore', at: ids.length - 1, text: l('Fim do setlist. A plateia grita pedindo bis.', 'End of the setlist. The crowd screams for an encore.'), opts };
}

/** Os momentos da noite (fixos para o show e o tamanho do setlist): 1–2 situações sorteadas + o bis. */
export function moments27(s: GameState, c: Show27, ids: string[]): Moment27[] {
  const n = ids.length;
  if (n < 2) return [];
  const r = rng27(s, c.key, 'sit');
  const w: [Exclude<Sit27, 'encore'>, number][] = [
    ['talk', 2],
    ['debut', c.pool.some((x) => x.kind === 'new' && !ids.includes(x.id)) ? 2 : 0],
    ['fight', c.members >= 2 ? 0.5 + c.tension * 2.5 : 0],
    ['power', 0.7 + (3 - c.production) * 0.3 + (c.year < 1970 ? 0.5 : 0) + (c.tier <= 1 ? 0.4 : 0)],
    ['invasion', c.fame >= 25 ? c.fame / 45 : 0],
    ['rain', c.openAir ? (c.rainy ? 3.5 : 1.2) : 0],
  ];
  const k = n <= 7 ? 1 : 2;
  const out: Moment27[] = [];
  const pool = w.filter((x) => x[1] > 0);
  for (let i = 0; i < k && pool.length; i++) {
    const tot = pool.reduce((a, b) => a + b[1], 0);
    let x = r.next() * tot;
    let j = 0;
    while (j < pool.length - 1 && x >= pool[j][1]) { x -= pool[j][1]; j++; }
    const [sit] = pool.splice(j, 1)[0];
    const at = clamp(Math.floor(n * (k === 1 ? 0.5 : i === 0 ? 0.35 : 0.65)) - 1, 0, n - 2);
    out.push({ sit, at, text: SIT27[sit].text, opts: SIT27[sit].opts });
  }
  out.sort((a, b) => a.at - b.at);
  out.push(encore27(c, ids));
  return out;
}

/** Chance (0..1) de uma resposta dar certo, pelos atributos de quem está no palco. */
export function chance27(c: Show27, o: Opt27): number {
  if (o.stat === 'safe') return 1;
  const sk = o.stat === 'stage' ? c.stage : o.stat === 'crew' ? c.crew : o.stat === 'security' ? c.sec : c.calm;
  return clamp(0.35 + sk * 0.6 - o.risk, 0.05, 0.95);
}
/** Sorteio (0..1) do momento `step` — o mesmo para qualquer resposta (comparar chances é justo). */
export const roll27 = (s: GameState, key: string, step: number): number => rng27(s, key, `d${step}`).next();

// ---------------------------------------------------------------- a corrida

export interface Log27 { sit: Sit27; opt: number; ok: boolean; d: number; news?: L; bad?: boolean }
export interface Run27 {
  /** energia depois de cada música (mais o bis, se houve) */
  energy: number[];
  e0: number; final: number; avg: number;
  /** próximo momento sem resposta (a corrida parou ali); -1 = show terminado */
  pending: number;
  /** índice da última música tocada */
  at: number;
  log: Log27[];
  fame: number; fat: number; morale: number; fans: number;
}

export function startEnergy27(c: Show27, p: Plan27): number {
  return Math.round(clamp(28 + c.fame * 0.22 + Math.min(1, c.exp / Math.max(1, c.cap)) * 12 + p.score * 0.08, 15, 75));
}

/** Energia depois de uma música: puxa para o apelo/energia da música, premia o ritmo certo, cansa no fim. */
export function songStep27(c: Show27, e: number, so: Song27, i: number, n: number): number {
  const target = so.appeal * 0.55 + so.energy * 0.45 + (c.stage - 0.5) * 14;
  const pace = -Math.abs(so.energy - idealEnergy(i, n)) * 0.08;
  const long = i >= 12 ? -1.5 : 0;
  return clamp(e + (target - e) * 0.38 + pace + long, 0, 100);
}

/** Roda o show com as respostas dadas até agora (pura). Para no primeiro momento ainda sem resposta. */
export function simulate27(s: GameState, c: Show27, ids: string[], choices: number[]): Run27 {
  const plan = planScore27(c, ids);
  const ms = moments27(s, c, ids);
  const items = ids.map((id) => c.pool.find((x) => x.id === id)).filter((x): x is Song27 => !!x);
  const run: Run27 = { energy: [], e0: startEnergy27(c, plan), final: 0, avg: 0, pending: -1, at: -1, log: [], fame: 0, fat: 0, morale: 0, fans: 0 };
  let e = run.e0;
  let step = 0;
  const apply = (m: Moment27): boolean => {
    const ci = choices[step];
    if (ci === undefined || !m.opts[ci]) { run.pending = step; return false; }
    const o = m.opts[ci];
    const ok = roll27(s, c.key, step) < chance27(c, o);
    const fx = ok ? o.ok : o.ko;
    e = clamp(e + fx.e, 0, 100);
    run.fame += fx.fame ?? 0; run.fat += fx.fat ?? 0; run.morale += fx.morale ?? 0; run.fans += fx.fans ?? 0;
    run.log.push({ sit: m.sit, opt: ci, ok, d: fx.e, news: fx.news, bad: fx.bad });
    step += 1;
    return true;
  };
  for (let i = 0; i < items.length; i++) {
    e = songStep27(c, e, items[i], i, items.length);
    run.energy.push(Math.round(e));
    run.at = i;
    for (const m of ms) if (m.at === i && m.sit !== 'encore' && run.log.length === ms.indexOf(m) && !apply(m)) return finish(run, e);
  }
  const enc = ms.find((m) => m.sit === 'encore');
  if (enc && !apply(enc)) return finish(run, e);
  if (enc && run.log.at(-1)?.opt !== enc.opts.length - 1) run.energy.push(Math.round(e)); // o bis tocado entra na curva
  return finish(run, e, true);
}
function finish(run: Run27, e: number, done = false): Run27 {
  run.final = Math.round(e);
  run.avg = run.energy.length ? Math.round(run.energy.reduce((a, b) => a + b, 0) / run.energy.length) : run.final;
  if (done) run.pending = -1;
  return run;
}

// ---------------------------------------------------------------- resultado → desfecho do show

export interface Out27 {
  /** desempenho −1..+1 (0 = noite comum) */
  perf: number;
  mods: StopMods27;
  /** desvio de fama no país da cidade */
  local: number;
  /** nota da resenha (0–100) */
  review: number;
  why: L[];
}

/** Traduz a noite em ajustes LIMITADOS do desfecho de sempre. Noite comum ≈ show rápido; ótima ≈ +10–20%; ruim, menos. */
export function outcome27(c: Show27, plan: Plan27, run: Run27): Out27 {
  const raw = (run.avg * 0.5 + run.final * 0.5 - 55) / 35;
  const perf = clamp(raw, -1, 1);
  const why: L[] = [fmtL(l('Energia média {a} e final {f} (uma noite comum fica perto de 55): fãs {x}, merch {m}.', 'Average energy {a}, final {f} (an ordinary night sits near 55): fans {x}, merch {m}.'), {
    a: run.avg, f: run.final, x: `${perf >= 0 ? '+' : '−'}${Math.round(Math.abs(perf) * 30)}%`, m: `${perf >= 0 ? '+' : '−'}${Math.round(Math.abs(perf) * 15)}%`,
  }), fmtL(l('Setlist {s}/100.', 'Setlist {s}/100.'), { s: plan.score })];
  if (run.final >= 80) why.push(l('A plateia saiu em êxtase: boca a boca forte.', 'The crowd left ecstatic: strong word of mouth.'));
  else if (run.final < 40) why.push(l('A plateia saiu fria: pouca gente vai falar bem.', 'The crowd left cold: few will talk it up.'));
  if (plan.score >= 75) why.push(l('O setlist foi bem montado.', 'The setlist was well built.'));
  else if (plan.score < 50) why.push(l('O setlist não ajudou.', 'The setlist did not help.'));
  for (const x of run.log) if (x.news) why.push(x.news);
  const longFat = Math.max(0, plan.energies.length - c.n) * 0.4;
  const mods: StopMods27 = {
    noRisk: true,
    q: plan.q, cover: plan.cover,
    qMult: 1 + perf * 0.04,
    fans: clamp(1 + perf * 0.3 + run.fans, 0.6, 1.5),
    merch: clamp(1 + perf * 0.15, 0.8, 1.2),
    fame: perf * 0.1 + run.fame * 0.4,
    fatigue: run.fat + longFat,
    morale: perf * 2 + run.morale,
  };
  const review = Math.round(clamp(30 + plan.score * 0.3 + run.final * 0.3 + run.avg * 0.1 + (run.log.some((x) => x.bad) ? -6 : 0), 5, 99));
  return { perf, mods, local: Math.round((perf * 2 + run.fame) * 10) / 10, review, why };
}

export interface Result27 {
  key: string; sold: number; cap: number; pay: number; merch: number; fans: number; fame: number;
  review: number; perf: number; final: number; why: L[]; soldOut: boolean; disaster: boolean; country?: string;
}

/** Joga o show: resolve a data agora pelo MESMO caminho do tourDay (playStop) com os ajustes da noite. */
export function playShow27(s: GameState, key: string, ids: string[], choices: number[]): Result27 | L {
  const gate = showGate27(s, key);
  if (gate) return gate;
  const c = showCtx27(s, key)!;
  const plan = planScore27(c, ids);
  if (!plan.energies.length) return l('Monte o setlist antes.', 'Build the setlist first.');
  const run = simulate27(s, c, ids, choices);
  if (run.pending >= 0) return l('Faltam decisões no show.', 'Decisions still pending in the show.');
  const out = outcome27(c, plan, run);
  const t = s.tours.find((x) => x.id === c.tourId)!;
  const st = t.stops.find((x) => x.day === c.day)!;
  const act = s.acts[c.actId];
  const lv = liveOf(s);
  // o mini-jogo antigo (pós-show, r4/r20) não roda de novo para esta noite
  lv.liveDone[key] = run.final;
  const q0 = lv.liveQueued[t.id];
  lv.liveQueued[t.id] = 99;
  const fans0 = act.fans.casual + act.fans.active + act.fans.core;
  const fame0 = act.fame;
  const rev0 = t.revenue;
  playStop(s, rng27(s, key, 'stop'), t, st, st.day, act, out.mods);
  if (q0 === undefined) delete lv.liveQueued[t.id]; else lv.liveQueued[t.id] = q0;
  tourEnd(s);
  const cityL = cityById[c.cityId]?.name ?? l(c.cityId, c.cityId);
  const a3 = countryOfCity(c.cityId) ?? undefined;
  if (a3 && out.local) nudge16(s, act.id, a3, out.local);
  const sev = run.final >= 85 ? 45 : run.final < 35 ? 35 : 15;
  emitFact(s, {
    kind: 'show', actors: [act.id], place: c.cityId, severity: sev, src: 'show27', tags: ['tour', 'live', ...(out.perf >= 0.5 ? ['good'] : out.perf <= -0.5 ? ['bad'] : [])],
    text: fmtL(out.perf >= 0.5 ? l('{a} em {c}: noite memorável ({r}/100 na crítica).', '{a} in {c}: a memorable night ({r}/100 from critics).') : out.perf <= -0.5 ? l('{a} em {c}: show fraco ({r}/100 na crítica).', '{a} in {c}: a weak show ({r}/100 from critics).') : l('{a} em {c}: show correto ({r}/100 na crítica).', '{a} in {c}: a solid show ({r}/100 from critics).'), { a: act.name, c: cityL, r: out.review }),
    data: { show: key, energy: run.final, review: out.review, played: 1 },
  });
  for (const x of run.log) if (x.news) emitFact(s, { kind: 'show', actors: [act.id], place: c.cityId, severity: x.bad ? 25 : 20, visibility: 'public', src: 'show27', tags: ['tour', 'live', x.bad ? 'bad' : 'good'], text: fmtL(l('{a} em {c}: {x}.', '{a} in {c}: {x}.'), { a: act.name, c: cityL, x: x.news }), data: { show: key, sit: x.sit } });
  if (run.final >= 85) remember(s, 'legendary_show', fmtL(l('Show lendário de {a} em {c}: o público não esquece.', 'A legendary {a} show in {c}: the crowd won\'t forget it.'), { a: act.name, c: cityL }), { actId: act.id, important: true });
  const res: Result27 = {
    key, sold: st.sold, cap: st.capacity, pay: t.revenue - rev0 - st.merch, merch: st.merch,
    fans: act.fans.casual + act.fans.active + act.fans.core - fans0, fame: Math.round((act.fame - fame0) * 100) / 100,
    review: out.review, perf: out.perf, final: run.final, why: out.why,
    soldOut: st.status === 'played' && st.sold >= st.capacity * 0.98, disaster: run.final < 30 && run.log.some((x) => x.bad), country: a3,
  };
  const x = s.x4 as unknown as { show27?: Record<string, Omit<Result27, 'why'>> };
  const log = (x.show27 ??= {});
  const { why: _w, ...keep } = res;
  log[key] = keep;
  const ks = Object.keys(log);
  if (ks.length > 40) for (const k of ks.slice(0, ks.length - 40)) delete log[k];
  return res;
}

export const show27Log = (s: GameState): Record<string, Omit<Result27, 'why'>> => (s.x4 as unknown as { show27?: Record<string, Omit<Result27, 'why'>> }).show27 ?? {};
export const venueName27 = (tier: number): L => VENUE_TIERS[tier]?.name ?? l('Casa', 'Venue');
