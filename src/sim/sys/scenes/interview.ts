// Talk show, entrevista e coletiva (mini-jogo): perguntas com tempo e quatro tons de resposta.
// Cada resposta move imagem pública, popularidade, fãs, haters e a relação com o veículo.
// O cenário muda com a era: rádio, variedades em P&B, auditório, parada na TV, canal de clipes,
// talk show, podcast em vídeo e live.

import type { Rng } from '../../../core/rng';
import { l, type L } from '../../../data/world';
import { activeMembers, checkCapacity, monthIndex } from '../../capacity';
import { fandomOf } from '../../fandom';
import { activeCensorship, respondCrisis } from '../../media';
import type { Act, GameState } from '../../types';
import { fmtL, hasTech, remember } from '../../util';
import type { Cutscene } from '../../ext4';
import { clampN, cooled, findScene, patchScene, queueScene, sc, setCool, type PlaceKind } from './state';

export type Tone = 'sincere' | 'evasive' | 'provoke' | 'funny';
export const TONES: Tone[] = ['sincere', 'evasive', 'provoke', 'funny'];
export const TONE_NAMES: Record<Tone, L> = {
  sincere: l('Sincero', 'Sincere'),
  evasive: l('Evasivo', 'Evasive'),
  provoke: l('Provocador', 'Provocative'),
  funny: l('Engraçado', 'Funny'),
};

export type Topic = 'release' | 'rival' | 'scandal' | 'private' | 'politics' | 'fans' | 'money' | 'future';

export interface Question {
  topic: Topic;
  text: L;
  ideal: Tone;
  risky: Tone;
}

export interface Venue {
  id: string;
  place: PlaceKind;
  show: L;
  host: string;
}

export type InterviewCtx = 'action' | 'number1' | 'crisis';

const HOSTS = ['Alda Vieira', 'Bob Castelo', 'Celina Reis', 'Duda Monteiro', 'Edu Faria', 'Flora Nunes', 'Gil Prado', 'Hebe Arantes', 'Ivo Lacerda', 'Jô Martins'];

/** Formato da entrevista conforme a era (e o contexto). */
export function interviewVenue(s: GameState, ctx: InterviewCtx = 'action'): Venue {
  const y = s.year;
  const host = HOSTS[(y + s.month) % HOSTS.length];
  if (ctx === 'crisis') {
    if (hasTech(s, 'streaming')) return { id: 'live', place: 'livestream', show: l('Coletiva transmitida ao vivo', 'Live-streamed press conference'), host };
    if (hasTech(s, 'tv_music')) return { id: 'press_tv', place: 'tv_talk', show: l('Coletiva de imprensa', 'Press conference'), host };
    return { id: 'press_radio', place: 'radio_am', show: l('Coletiva para jornais e rádio', 'Press conference for papers and radio'), host };
  }
  if (!hasTech(s, 'tv_music')) return { id: 'radio', place: 'radio_am', show: l('Entrevista no rádio — Hora do Artista', 'Radio interview — The Artist Hour'), host };
  if (ctx === 'number1' && y >= 1958 && y < 2005) return { id: 'chart_tv', place: 'tv_chart', show: l('Parada Musical da Semana (TV)', 'Weekly TV Chart Show'), host };
  if (y < 1962) return { id: 'variety', place: 'tv_variety', show: l('Show de Variedades (ao vivo, P&B)', 'Variety Hour (live, B&W)'), host };
  if (y < 1982) return { id: 'auditorium', place: 'tv_auditorium', show: l('Programa de Auditório — com calouros e buzina', 'Studio-audience show — talent spot and horn'), host };
  if (y < 1996 && hasTech(s, 'clipnet')) return { id: 'clips', place: 'tv_clips', show: l('Canal de Clipes — entrevista do VJ', 'Music Video Channel — VJ interview'), host };
  if (y < 2010) return { id: 'talk', place: 'tv_talk', show: l('Talk show do fim da noite', 'Late-night talk show'), host };
  if (y < 2022) return { id: 'podcast', place: 'podcast', show: l('Podcast em vídeo', 'Video podcast'), host };
  return { id: 'live', place: 'livestream', show: l('Live com chat aberto', 'Livestream with open chat'), host };
}

const Q: Record<Topic, L[]> = {
  release: [
    l('O que tem de diferente neste disco novo?', 'What is different about this new record?'),
    l('Dizem que a faixa principal foi gravada em uma noite. É verdade?', 'They say the lead track was cut in one night. True?'),
  ],
  rival: [
    l('O que você acha do sucesso de {rival}?', 'What do you make of {rival}\'s success?'),
    l('É verdade que vocês não se falam com {rival}?', 'Is it true you are not on speaking terms with {rival}?'),
  ],
  scandal: [
    l('Vamos falar do assunto da semana: {crisis}', 'Let\'s talk about this week\'s story: {crisis}'),
    l('Você deve desculpas a alguém?', 'Do you owe anyone an apology?'),
  ],
  private: [
    l('E a vida amorosa, como vai?', 'How is your love life?'),
    l('É verdade que você pensa em largar tudo?', 'Is it true you are thinking of quitting?'),
  ],
  politics: [
    l('Música deve falar de política?', 'Should music talk politics?'),
    l('O que você diria ao governo hoje?', 'What would you tell the government today?'),
  ],
  fans: [
    l('Uma mensagem para quem acampou na porta?', 'A message for the fans who camped outside?'),
    l('Os fãs chamam vocês de "{fandom}". Gosta do apelido?', 'Fans call themselves "{fandom}". Like the nickname?'),
  ],
  money: [
    l('Quanto você ganhou com esse sucesso?', 'How much did you make from this hit?'),
    l('A gravadora fica com a maior parte, não é?', 'The label keeps most of it, right?'),
  ],
  future: [
    l('Qual o próximo passo?', 'What is the next step?'),
    l('Onde você se vê daqui a dez anos?', 'Where do you see yourself in ten years?'),
  ],
};

const IDEAL: Record<Topic, [Tone, Tone]> = {
  release: ['sincere', 'evasive'],
  rival: ['funny', 'provoke'],
  scandal: ['sincere', 'funny'],
  private: ['evasive', 'sincere'],
  politics: ['sincere', 'provoke'],
  fans: ['funny', 'evasive'],
  money: ['evasive', 'provoke'],
  future: ['sincere', 'evasive'],
};

function buildQuestions(s: GameState, r: Rng, act: Act, ctx: InterviewCtx, crisisText?: L): Question[] {
  const rival = Object.values(s.acts).filter((a) => a.owner && a.owner !== 'player' && a.status !== 'retired' && a.genre === act.genre).sort((a, b) => b.fame - a.fame)[0]
    ?? Object.values(s.acts).filter((a) => a.owner && a.owner !== 'player' && a.status === 'active').sort((a, b) => b.fame - a.fame)[0];
  const fandom = s.fandoms[act.id]?.name ?? `${act.name.split(' ')[0]}${['ers', 'ianos', 'nation'][act.name.length % 3]}`;
  const params = { rival: rival?.name ?? 'a concorrência', crisis: crisisText ?? l('a polêmica', 'the controversy'), fandom };
  const pool: Topic[] = ctx === 'crisis' ? ['scandal', 'scandal', 'private', 'fans', 'future'] : ['release', 'rival', 'private', 'politics', 'fans', 'money', 'future'];
  if (ctx === 'number1') pool.unshift('release');
  const topics: Topic[] = [];
  if (ctx === 'crisis') topics.push('scandal');
  if (ctx === 'number1') topics.push('release');
  const rest = pool.filter((t) => !topics.includes(t) || t === 'scandal');
  r.shuffle(rest);
  for (const t of rest) {
    if (topics.length >= 4) break;
    if (topics.filter((x) => x === t).length >= (t === 'scandal' ? 2 : 1)) continue;
    topics.push(t);
  }
  const censors = activeCensorship(s).some((c) => c.markets.includes(s.player.territories[0] ?? 'na'));
  return topics.map((topic, i) => {
    const variants = Q[topic];
    const text = fmtL(variants[(i + r.int(0, variants.length - 1)) % variants.length], params);
    let [ideal, risky] = IDEAL[topic];
    if (topic === 'politics' && censors) [ideal, risky] = ['evasive', 'provoke'];
    return { topic, text, ideal, risky };
  });
}

export interface InterviewEffect {
  img: number;
  pop: number;
  core: number;
  haters: number;
  outlet: number;
}

/** Efeito de um tom para uma pergunta (o tom ideal rende mais; o arriscado custa caro). */
export function toneEffect(q: Question, tone: Tone | null): InterviewEffect {
  if (!tone) return { img: -1, pop: -2, core: 0, haters: 0, outlet: -4 }; // ficou mudo: tempo esgotado
  const base: Record<Tone, InterviewEffect> = {
    sincere: { img: 2, pop: 1, core: 1, haters: 0, outlet: 3 },
    evasive: { img: 0, pop: -1, core: 0, haters: 0, outlet: -2 },
    provoke: { img: -2, pop: 3, core: 2, haters: 3, outlet: 2 },
    funny: { img: 1, pop: 2, core: 1, haters: 0, outlet: 1 },
  };
  const e = { ...base[tone] };
  if (tone === q.ideal) { e.img += 3; e.pop += 2; e.outlet += 2; }
  if (tone === q.risky) { e.img -= 4; e.haters += 3; e.outlet -= 1; }
  return e;
}

export function canInterview(s: GameState, actId: string): L | null {
  const act = s.acts[actId];
  if (!act || (act.owner !== 'player' && !act.playerBand)) return l('Ato não é seu.', 'Not your act.');
  if (act.status === 'retired' || act.status === 'split') return l('Ato inativo.', 'Inactive act.');
  if (act.fame < 5) return l('Ninguém chama um ato desconhecido (fama 5+).', 'Nobody books an unknown act (fame 5+).');
  if (!cooled(s, `iv:${actId}`, 6)) return l('Uma entrevista a cada 6 semanas por ato.', 'One interview every 6 weeks per act.');
  const conflict = checkCapacity(s, activeMembers(s, act), monthIndex(s), 1, 10);
  if (conflict) return conflict.text;
  return null;
}

/** Monta a cena da entrevista. `queue` = enfileira para abrir depois (cena de evento). */
export function startInterview(s: GameState, r: Rng, actId: string, ctx: InterviewCtx = 'action', crisisId?: string): Cutscene | L {
  const act = s.acts[actId];
  if (ctx === 'action') {
    const why = canInterview(s, actId);
    if (why) return why;
  }
  if (!act) return l('Ato não encontrado.', 'Act not found.');
  act.image ??= { artistic: 40, popularity: Math.round(act.fame), professionalism: 50, publicImage: 50 };
  const crisis = crisisId ? s.crises.find((c) => c.id === crisisId) : undefined;
  const venue = interviewVenue(s, ctx);
  const questions = buildQuestions(s, r, act, ctx, crisis?.text);
  setCool(s, `iv:${actId}`);
  // tempo: a agenda de mídia cansa os músicos
  for (const id of activeMembers(s, act)) {
    const p = s.persons[id];
    if (p) p.fatigue = clampN(p.fatigue + 5, 0, 100);
  }
  const title = ctx === 'crisis'
    ? fmtL(l('Coletiva: {a}', 'Press conference: {a}'), { a: act.name })
    : fmtL(l('{s}: {a}', '{s}: {a}'), { s: venue.show, a: act.name });
  const cs = queueScene(s, 'interview', venue.place, { title, actId, ctx, crisisId: crisisId ?? null, venue, questions });
  if (!cs) return l('Agenda cheia.', 'Schedule full.');
  if (ctx === 'action') cs.seen = true; // a interface abre na hora
  return cs;
}

/** Respostas automáticas pelos atributos (sociabilidade do líder, assessoria). */
export function autoAnswers(s: GameState, r: Rng, csId: string): Tone[] {
  const cs = findScene(s, csId);
  if (!cs) return [];
  const act = s.acts[String(cs.data.actId)];
  const leader = act ? s.persons[act.leaderId ?? act.members[0]] : undefined;
  const social = leader?.persona?.sociability ?? 50;
  const pr = (s.prAgency?.tier ?? 0) * 10 + (s.player.staff.some((x) => x.role === 'publicist') ? 12 : 0);
  const p = clampN(0.35 + social / 250 + pr / 200, 0.3, 0.85);
  return (cs.data.questions as Question[]).map((q) => (r.chance(p) ? q.ideal : r.chance(0.5) ? 'sincere' : 'evasive'));
}

export interface InterviewResult {
  total: InterviewEffect;
  lines: L[];
  grade: number; // 0..100
}

/** Aplica as respostas (uma única vez). `null` = tempo esgotado. */
export function resolveInterview(s: GameState, r: Rng, csId: string, answers: (Tone | null)[]): InterviewResult | L {
  const cs = findScene(s, csId);
  if (!cs || cs.kind !== 'interview') return l('Entrevista não encontrada.', 'Interview not found.');
  if (cs.data.done) return cs.data.outcome as InterviewResult;
  const act = s.acts[String(cs.data.actId)];
  if (!act) return l('Ato não encontrado.', 'Act not found.');
  const qs = cs.data.questions as Question[];
  const total: InterviewEffect = { img: 0, pop: 0, core: 0, haters: 0, outlet: 0 };
  let good = 0;
  qs.forEach((q, i) => {
    const e = toneEffect(q, answers[i] ?? null);
    if (answers[i] === q.ideal) good += 1;
    total.img += e.img; total.pop += e.pop; total.core += e.core; total.haters += e.haters; total.outlet += e.outlet;
  });
  // bônus limitado: jogar bem nunca vale mais que ~10 pontos de imagem/popularidade
  total.img = clampN(total.img, -12, 10);
  total.pop = clampN(total.pop, -8, 10);
  const lines: L[] = [];
  act.image ??= { artistic: 40, popularity: Math.round(act.fame), professionalism: 50, publicImage: 50 };
  const img = act.image;
  if (img) {
    img.publicImage = clampN(img.publicImage + total.img, 0, 100);
    img.popularity = clampN(img.popularity + total.pop, 0, 100);
  }
  act.momentum = clampN(act.momentum + clampN((total.img + total.pop) / 2, -8, 8), 0, 100);
  if (total.pop > 0) act.fans.casual += Math.round(total.pop * (300 + act.fame * 60));
  const fd = fandomOf(s, act.id);
  if (total.core > 0) fd.superfans += Math.round(total.core * (20 + act.fame * 2));
  if (total.haters > 0) fd.haters += Math.round(total.haters * (40 + act.fame * 8));
  const venue = cs.data.venue as Venue;
  const st = sc(s);
  st.outlets[venue.id] = clampN((st.outlets[venue.id] ?? 0) + total.outlet, -100, 100);
  st.stats.interviews += 1;
  lines.push(fmtL(l('Imagem pública {a}, popularidade {b}.', 'Public image {a}, popularity {b}.'), { a: signed(total.img), b: signed(total.pop) }));
  if (total.haters > 0) lines.push(l('Os haters encontraram munição.', 'The haters found ammunition.'));
  if (total.core > 0) lines.push(l('Os fãs mais fiéis compartilharam os melhores momentos.', 'Core fans shared the best moments.'));
  lines.push(fmtL(l('Relação com {v}: {o}.', 'Relationship with {v}: {o}.'), { v: venue.show, o: signed(st.outlets[venue.id]) }));
  // coletiva de crise: o tom dominante vira a resposta oficial
  if (cs.data.ctx === 'crisis' && cs.data.crisisId) {
    const c = s.crises.find((x) => x.id === cs.data.crisisId);
    if (c && !c.resolved) {
      const count: Record<Tone, number> = { sincere: 0, evasive: 0, provoke: 0, funny: 0 };
      for (const a of answers) if (a) count[a] += 1;
      const dom = (Object.entries(count) as [Tone, number][]).sort((a, b) => b[1] - a[1])[0][0];
      const resp = ({ sincere: 'apologize', evasive: 'silence', provoke: 'counter', funny: 'deny' } as const)[dom];
      lines.push(respondCrisis(s, r, c.id, resp));
    }
  }
  const grade = Math.round((good / Math.max(1, qs.length)) * 70 + clampN(total.img + total.pop, -10, 20) * 1.5);
  const outcome: InterviewResult = { total, lines, grade: clampN(grade, 0, 100) };
  patchScene(s, csId, { done: true, outcome, answers });
  remember(s, 'interview', fmtL(l('{a} em "{v}": imagem {i}, popularidade {p}.', '{a} on "{v}": image {i}, popularity {p}.'), { a: act.name, v: venue.show, i: signed(total.img), p: signed(total.pop) }), { actId: act.id });
  return outcome;
}

function signed(n: number): string {
  return n > 0 ? `+${Math.round(n)}` : String(Math.round(n));
}

/** Detecção de crises novas dos seus atos → coletiva enfileirada. */
export function crisisPressers(s: GameState, r: Rng): void {
  for (const c of s.crises) {
    if (c.resolved) continue;
    const key = `crisis:${c.id}`;
    const st = sc(s);
    if (st.seen.includes(key)) continue;
    const act = s.acts[c.actId];
    if (!act || (act.owner !== 'player' && !act.playerBand)) continue;
    st.seen.push(key);
    if (st.seen.length > 160) st.seen.splice(0, st.seen.length - 160);
    if (c.severity < 25) continue;
    startInterview(s, r, act.id, 'crisis', c.id);
  }
}
