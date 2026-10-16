// R31 · onda 2 (J) — MESA DO CHEFE (Hoje em cena), modelo PURO.
// A mesa responde às mesmas três perguntas do Hoje (ps/hoje31model.ts), lendo as mesmas fontes:
//   telefone tocando  = decidir agora (pendências únicas, src/sim/r31/pending.ts) — o número bate com o do menu;
//   mural com alfinetes = projetos em andamento: verde ok, amarelo atrasado, vermelho travado (com texto e símbolo);
//   jornal            = o que mudou (o resumo do último avanço);
//   calendário        = compromissos do mês (calendário único) → agenda;
//   bandeja de cartas = cartas não lidas da caixa de entrada → caixa;
//   janela            = a cidade (Nosso mundo); você = o seu painel (ou "você está em turnê em …").
// Nada aqui grava estado nem consome sorteio.

import { tourList } from '../../sim/tours';
import { cityById, l, type L } from '../../data/world';
import { calendar19 } from '../../sim/calendar19';
import { acceptCounter, counterWhy, withdrawOffer } from '../../sim/contracts';
import { resolveDecision } from '../../sim/events';
import { ACT27 } from '../sys/inbox27';
import { pendingList, type Pending } from '../../sim/r31/pending';
import { items18 } from '../../sim/sys/inbox18';
import { playerAct, playerPerson } from '../../sim/sys/life';
import { openProjects, projectStage, STAGE_NAMES } from '../../sim/sys/project8';
import { planOf12, PROBLEM_NAME, slack } from '../../sim/sys/project12';
import type { GameState } from '../../sim/types';
import { dateOfDay, fmtL } from '../../sim/util';
import { hoje31, type Row31 } from '../ps/hoje31model';
import { alertOf31, maxAlert31, plural31, type Alert31, type Spot31 } from './scene31model';

export const DESK_W31 = 320;
export const DESK_H31 = 170;
/** Chão da sala (pé da mesa). */
export const DESK_FY31 = 146;

export type DeskShell31 = 'kitchen' | 'office' | 'top';
export type PinStatus31 = 'ok' | 'late' | 'stuck';
export const PIN31: Record<PinStatus31, { sym: string; name: L }> = {
  ok: { sym: '✓', name: l('no prazo', 'on schedule') },
  late: { sym: '⏱', name: l('atrasado', 'behind') },
  stuck: { sym: '✕', name: l('travado', 'stuck') },
};

export interface DeskCall31 { id: string; kind: 'decision' | 'offer' | 'inbox' | 'other'; ref: string; title: L; word: L; due?: number; level: Alert31; owner: string; actId?: string }
export interface DeskPin31 { pid: string; actId: string; title: string; stage: L; status: PinStatus31; why: L }
export interface Desk31 {
  W: number; H: number; year: number; hq: number; shell: DeskShell31; month: number;
  calls: DeskCall31[];
  /** "3 decisões: contrato, atraso, dívida" */
  callsLine: L;
  level?: Alert31;
  letters: number;
  cal: { n: number; days: number[] };
  news: Row31[];
  pins: DeskPin31[];
  me: { personId?: string; away?: L };
  spots: Spot31[];
}

/** Palavra curta por tipo de pendência (o telefone diz o assunto, não só o número). */
const CAT_WORD: Record<string, L> = {
  career: l('carreira', 'career'), people: l('equipe', 'staff'), band: l('banda', 'band'), contract: l('contrato', 'contract'),
  market: l('mercado', 'market'), tech: l('tecnologia', 'tech'), culture: l('cultura', 'culture'), scandal: l('escândalo', 'scandal'),
  health: l('saúde', 'health'), stage: l('palco', 'stage'), manufacturing: l('fábrica', 'factory'), world: l('mundo', 'world'),
  neural: l('tecnologia', 'tech'), scouting: l('talentos', 'talent'), business: l('negócio', 'business'),
};

function callOf(s: GameState, p: Pending): DeskCall31 {
  const level = alertOf31(p.due, s.week, p.prio);
  if (p.id.startsWith('dec:')) {
    const ref = p.id.slice(4);
    const d = s.decisions.find((x) => x.id === ref);
    return { id: p.id, kind: 'decision', ref, title: p.title, word: CAT_WORD[d?.cat ?? ''] ?? l('decisão', 'decision'), due: p.due, level, owner: p.owner.area, actId: p.actId };
  }
  if (p.id.startsWith('offer:')) return { id: p.id, kind: 'offer', ref: p.id.slice(6), title: p.title, word: l('contraproposta', 'counter-offer'), due: p.due, level, owner: p.owner.area, actId: p.actId };
  if (p.id.startsWith('ib:')) return { id: p.id, kind: 'inbox', ref: p.id.slice(3), title: p.title, word: l('resposta', 'reply'), due: p.due, level, owner: p.owner.area, actId: p.actId };
  return { id: p.id, kind: 'other', ref: p.id, title: p.title, word: l('pendência', 'pending'), due: p.due, level, owner: p.owner.area, actId: p.actId };
}

const joinL = (xs: L[]): L => ({ pt: xs.map((x) => x.pt).join(', '), en: xs.map((x) => x.en).join(', ') });

/** O status de cada projeto: travado (problema aberto) > atrasado (folga negativa) > no prazo. */
export function pinOf31(s: GameState, p: ReturnType<typeof openProjects>[number]): DeskPin31 {
  let sl: number | null = null;
  try { sl = slack(s, p); } catch { sl = null; }
  const pb = planOf12(s, p)?.problem;
  const status: PinStatus31 = pb ? 'stuck' : sl !== null && sl < 0 ? 'late' : 'ok';
  const why: L = pb ? PROBLEM_NAME[pb.kind] : sl !== null && sl < 0 ? fmtL(l('atrasado {n} sem.', '{n} wk behind'), { n: -sl }) : sl !== null ? fmtL(l('folga de {n} sem.', '{n} wk slack'), { n: sl }) : l('sem prazo assumido', 'no deadline set');
  const a = s.acts[p.actId];
  return { pid: p.id, actId: p.actId, title: `${a?.name ?? '—'}: ${p.title || p.type.toUpperCase()}`, stage: STAGE_NAMES[projectStage(s, p)], status, why };
}

/** As ações do telefone = as MESMAS funções da Mesa do mês e da Caixa (o teste compara o estado depois de cada uma). */
export const DESK_ACTS31 = {
  /** decisão: igual ao botão da Mesa do mês / Caixa */
  decide: (s: GameState, decisionId: string, optionId: string): boolean => resolveDecision(s, decisionId, optionId),
  /** mensagem que pede resposta: igual ao botão da Caixa (ACT27.reply) */
  reply: (s: GameState, msgId: string, action: string): L => ACT27.answer(s, msgId, action),
  /** contraproposta: iguais aos botões da Mesa do mês */
  /** W2-REV: devolve o motivo quando não fecha (null = fechado) */
  acceptCounter: (s: GameState, offerId: string): L | null => {
    const why = counterWhy(s, offerId);
    return acceptCounter(s, offerId) ? null : why ?? l('A contraproposta não pôde ser aceita.', 'The counter-offer could not be accepted.');
  },
  withdraw: (s: GameState, offerId: string): void => { withdrawOffer(s, offerId); s.offers = s.offers.filter((x) => x.id !== offerId); },
};

export function deskShell31(hq: number): DeskShell31 { return hq <= 0 ? 'kitchen' : hq >= 4 ? 'top' : 'office'; }

/** Posição dos alfinetes no mural (até 8 bilhetes, 4 por linha). */
export const PIN_MAX31 = 8;
export function pinBox31(i: number): { x: number; y: number; w: number; h: number } {
  return { x: 20 + (i % 4) * 17, y: 30 + Math.floor(i / 4) * 21, w: 14, h: 17 };
}

export function desk31(s: GameState): Desk31 {
  // 1. telefone — as mesmas pendências únicas do Hoje e do menu
  let pend: Pending[] = [];
  try { pend = pendingList(s); } catch { pend = []; }
  const calls = pend.map((p) => callOf(s, p));
  const words = [...new Map(calls.map((c) => [c.word.pt, c.word])).values()].slice(0, 3);
  const callsLine: L = calls.length
    ? fmtL(l('{n}: {w}', '{n}: {w}'), { n: plural31(calls.length, l('1 decisão', '1 decision'), l('{n} decisões', '{n} decisions')), w: joinL(words) })
    : l('Telefone quieto: nada pede decisão agora.', 'Phone is quiet: nothing needs a decision now.');
  const level = maxAlert31(calls.map((c) => c.level));

  // 2. bandeja — cartas não lidas (sem as decisões, que tocam no telefone)
  let letters = 0;
  try { letters = items18(s).filter((x) => x.cat !== 'decision' && x.unread).length; } catch { letters = 0; }

  // 3. calendário — compromissos deste mês (calendário único)
  const days: number[] = [];
  let n = 0;
  try {
    for (const d of calendar19(s, { weeks: 6 })) {
      const dt = dateOfDay(s.config.startYear, d.w * 7);
      if (dt.month !== s.month || dt.year !== s.year) continue;
      n++;
      if (!days.includes(dt.dom)) days.push(dt.dom);
    }
  } catch { /* calendário vazio */ }

  // 4. jornal e mural — o mesmo "o que mudou" e os mesmos projetos do Hoje
  let news: Row31[] = [];
  try { news = hoje31(s).changed; } catch { news = []; }
  let pins: DeskPin31[] = [];
  try {
    pins = openProjects(s).filter((p) => { const a = s.acts[p.actId]; return !!a && (a.owner === 'player' || !!a.playerBand); }).map((p) => pinOf31(s, p));
  } catch { pins = []; }

  // 5. você — na mesa, ou fora (turnê da sua banda)
  const me: Desk31['me'] = {};
  try {
    const p = playerPerson(s);
    if (p) me.personId = p.id;
    const a = playerAct(s);
    const tr = a ? tourList(s).find((x) => x.actId === a.id && x.status === 'running') : undefined;
    if (tr) {
      const st = tr.stops.find((x) => x.status === 'scheduled' && x.day >= s.day) ?? tr.stops[tr.stops.length - 1];
      me.away = fmtL(l('Você está em turnê ({t}){c}.', 'You are on tour ({t}){c}.'), { t: tr.name, c: st ? fmtL(l(', a caminho de {c}', ', heading to {c}'), { c: cityById[st.cityId]?.name ?? l('outra cidade', 'another city') }) : l('', '') });
    }
  } catch { /* sem personagem */ }

  const hq = Math.max(0, Math.min(5, Math.floor(s.player.hq)));
  const shell = deskShell31(hq);
  const spots: Spot31[] = [];
  const nCalls = calls.length;
  spots.push({ id: 'phone', x: 96, y: 98, w: 24, h: 18, label: l('Telefone', 'Phone'),
    tip: nCalls ? fmtL(l('Tocando — {c}. Clique para decidir aqui.', 'Ringing — {c}. Click to decide here.'), { c: callsLine }) : callsLine,
    badge: nCalls ? { text: String(nCalls), level: level ?? 'normal' } : undefined, go: { panel: 'phone' } });
  spots.push({ id: 'tray', x: 124, y: 100, w: 26, h: 16, label: l('Cartas', 'Letters'),
    tip: letters ? plural31(letters, l('1 carta não lida', '1 unread letter'), l('{n} cartas não lidas', '{n} unread letters')) : l('Nenhuma carta nova.', 'No new letters.'),
    badge: letters ? { text: String(letters), level: 'info' } : undefined, go: { area: 'cockpit', tab: ['ck20', 'inbox'] } });
  spots.push({ id: 'calendar', x: 104, y: 18, w: 46, h: 58, label: l('Calendário', 'Calendar'),
    tip: n ? plural31(n, l('1 compromisso este mês. Abre a agenda.', '1 commitment this month. Opens the agenda.'), l('{n} compromissos este mês. Abre a agenda.', '{n} commitments this month. Opens the agenda.')) : l('Mês livre. Abre a agenda.', 'Free month. Opens the agenda.'),
    badge: n ? { text: String(n), level: 'info' } : undefined, go: { area: 'calendar19' } });
  const st = { ok: pins.filter((x) => x.status === 'ok').length, late: pins.filter((x) => x.status === 'late').length, stuck: pins.filter((x) => x.status === 'stuck').length };
  spots.push({ id: 'board', x: 12, y: 20, w: 82, h: 58, label: l('Mural', 'Board'),
    tip: pins.length ? fmtL(l('Projetos: {o} no prazo, {a} atrasados, {t} travados.', 'Projects: {o} on schedule, {a} behind, {t} stuck.'), { o: st.ok, a: st.late, t: st.stuck }) : l('Nenhum projeto no mural. Clique para começar um disco.', 'No project on the board. Click to start a record.'),
    badge: pins.length ? { text: `${PIN31.ok.sym}${st.ok} ${PIN31.late.sym}${st.late} ${PIN31.stuck.sym}${st.stuck}`, level: st.stuck ? 'crit' : st.late ? 'soon' : 'info' } : undefined,
    go: pins.length ? { panel: 'board' } : { area: 'project' } });
  pins.slice(0, PIN_MAX31).forEach((p, i) => {
    const b = pinBox31(i);
    spots.push({ id: `pin:${p.pid}`, ...b, label: l(p.title, p.title), tip: fmtL(l('{t} — {s}: {w}.', '{t} — {s}: {w}.'), { t: p.title, s: p.stage, w: p.why }),
      badge: { text: '', sym: PIN31[p.status].sym, level: p.status === 'stuck' ? 'crit' : p.status === 'late' ? 'soon' : 'info' }, go: { quick: { kind: 'project', id: p.pid } }, quick: { kind: 'project', id: p.pid }, quiet: true });
  });
  spots.push({ id: 'news', x: 180, y: 98, w: 36, h: 18, label: l('Jornal', 'Paper'),
    tip: news.length ? plural31(news.length, l('1 novidade desde o último avanço.', '1 change since the last advance.'), l('{n} novidades desde o último avanço.', '{n} changes since the last advance.')) : l('Nada mudou ainda: avance o tempo.', 'Nothing changed yet: advance time.'),
    badge: news.length ? { text: fmtL(l('NOVO {n}', 'NEW {n}'), { n: news.length }), level: 'info' } : undefined, go: { panel: 'news' } });
  spots.push({ id: 'window', x: 228, y: 16, w: 76, h: 66, label: l('Janela', 'Window'), tip: l('A cidade lá fora: abre o Nosso mundo.', 'The city outside: opens Our world.'), go: { area: 'campus18' } });
  spots.push({ id: 'me', x: 150, y: me.away ? 92 : 80, w: 26, h: me.away ? 22 : 34, label: l('Você', 'You'),
    tip: me.away ?? l('Você, na sua mesa: abre o seu painel (agenda, energia, dinheiro pessoal).', 'You, at your desk: opens your panel (agenda, energy, personal money).'),
    badge: me.away ? { text: '✈', level: 'info' } : undefined, go: { area: 'you' } });

  return { W: DESK_W31, H: DESK_H31, year: s.year, hq, shell, month: s.month, calls, callsLine, level, letters, cal: { n, days }, news, pins, me, spots };
}
