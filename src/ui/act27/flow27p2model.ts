// r27 (FLOW2) — as atividades da FASE 2 no caminho único (ver flow27model.ts e docs/act27.md). Antes, cada uma
// tinha um botão "▶ Jogar" ao lado da ação de sempre (campanha no lançamento/hype/mídia, entrevista em cenas,
// matérias, escândalo e perfil, favores no almoço/jantar/presente, crise e reunião no Cockpit, turnê no mapa ao
// lado do formulário). Agora:
//   • AVANÇO (um cartão por vez, "Jogar / Resolver rápido"): campanha de um lançamento que estreia em até
//     CAMP_LEAD27 semanas, o imprevisto da semana de uma campanha em andamento, coletiva/entrevista (matéria,
//     escândalo, convite da campanha e um pedido de imprensa por mês), crise na mesa ou em andamento, reunião de
//     diretoria do mês e os eventos de estrada das próximas datas.
//   • TELA (a atividade É a tela da ação, com o rápido dentro): almoço/jantar/presente abrem a conversa de favor;
//     "Confirmar turnê" abre a turnê no mapa; "Renegociar" abre a mesa; programar um lançamento abre o quadro da
//     campanha (o marketing daquele lançamento).
// Este arquivo é PURO (sem DOM): fontes de ocasiões e o registro. As telas são ligadas em flow27p2.ts.

import { l, type L } from '../../data/world';
import { negBlocked } from '../../sim/sys/people/negotiation';
import { agenda27, monthKey27 } from '../../sim/sys/board27';
import { campGate27, liveCamps27, openEv27, targets27 } from '../../sim/sys/camp27';
import { CRISIS_NAME27, crisisCands27, dismissCrisis27, openCrises27 } from '../../sim/sys/crisis27';
import { contact27, giveBlock27, type Gesture27 } from '../../sim/sys/favors27';
import { ivGate27, opps27, type Opp27 } from '../../sim/sys/press27';
import { pendingRoad27 } from '../../sim/sys/road27';
import type { GameState } from '../../sim/types';
import { fmtL } from '../../sim/util';
import { registerActivity27, registerOccasions27, viaUi27, type Occ27 } from './flow27model';

/** A campanha é oferecida quando o lançamento programado estreia em até tantas semanas (o quadro dura ≤ 8). */
export const CAMP_LEAD27 = 6;

// ---------------------------------------------------------------- recusas ("Resolver rápido" não pergunta de novo)

const DECL = new WeakMap<GameState, Set<string>>();
/** "Resolver rápido" num cartão que voltaria nos próximos avanços (campanha, coletiva, reunião desligada). */
export function decline27(s: GameState, key: string): void {
  let x = DECL.get(s);
  if (!x) { x = new Set(); DECL.set(s, x); }
  x.add(key);
}
export const declined27 = (s: GameState, key: string): boolean => !!DECL.get(s)?.has(key);

const actName = (s: GameState, id?: string): string => (id && s.acts[id]?.name) || '?';
const classic = (o: Occ27) => (o.data?.classic as (() => void) | undefined)?.();
const nothing = (): void => {};

// ---------------------------------------------------------------- campanha de lançamento

/** Chave da oferta de campanha de um lançamento programado. */
export const campKey27 = (prId: string): string => `camp:${prId}`;
/** O lançamento programado aceita campanha agora (estreia em até CAMP_LEAD27 semanas, sem campanha, não recusada)? */
export function campReady27(s: GameState, prId: string): boolean {
  const tg = targets27(s).find((x) => x.prId === prId);
  return !!tg && !campGate27(s, tg) && tg.launchW - s.week <= CAMP_LEAD27 && !declined27(s, campKey27(prId));
}

registerOccasions27('release', (s, w) => {
  const out: Occ27[] = [];
  for (const tg of targets27(s)) if (tg.prId && campReady27(s, tg.prId)) out.push({ src: 'release', key: campKey27(tg.prId), actId: tg.actId, day: w.from, data: { prId: tg.prId, title: tg.title } });
  for (const c of liveCamps27(s)) {
    const e = openEv27(c);
    if (e) out.push({ src: 'release', key: `campev:${c.id}:${e.w}`, actId: c.actId, day: w.from, data: { campId: c.id, title: c.title, ev: e.t, tone: e.tone } });
  }
  return out;
});

registerActivity27({
  id: 'campaign', kind: 'release', label: l('Campanha de lançamento', 'Release campaign'),
  when: (s, o) => typeof o.data?.prId === 'string' && campReady27(s, o.data.prId),
  important: (s, o) => !!s.acts[o.actId ?? '']?.playerBand || (s.acts[o.actId ?? '']?.fame ?? 0) >= 40,
  title: (s, o) => fmtL(l('Campanha de lançamento: "{t}" ({a})', 'Release campaign: "{t}" ({a})'), { t: String(o.data?.title ?? '?'), a: actName(s, o.actId) }),
  preview: () => l('Jogar: o quadro de semanas — verba por canal da época, imprevistos com escolhas, jogadas e o pós-morte. Rápido: só o marketing do plano, como sempre.', 'Play: the week board — budget per era channel, surprises with choices, moves and the post-mortem. Quick: just the planned marketing, as always.'),
  short: l('Antes da estreia: o quadro da campanha — ou só o marketing do plano.', 'Before launch: the campaign board — or just the planned marketing.'),
  play: viaUi27('campaign'),
  quick: (s, o) => { if (typeof o.data?.prId === 'string') decline27(s, campKey27(o.data.prId)); classic(o); },
});

registerActivity27({
  id: 'campEvent', kind: 'release', label: l('Imprevisto da campanha', 'Campaign surprise'),
  when: (s, o) => typeof o.data?.campId === 'string' && liveCamps27(s).some((c) => c.id === o.data!.campId && !!openEv27(c)),
  important: (_s, o) => o.data?.tone === 'bad',
  title: (_s, o) => fmtL(l('Campanha de "{t}": {e}', '"{t}" campaign: {e}'), { t: String(o.data?.title ?? '?'), e: (o.data?.ev as L | undefined) ?? l('imprevisto', 'surprise') }),
  preview: () => l('Jogar: abre o quadro e você escolhe a resposta (e ajusta a verba). Rápido: vale a opção prudente, a primeira.', 'Play: opens the board and you pick the answer (and adjust the budget). Quick: the prudent option, the first one, applies.'),
  play: viaUi27('campEvent'), quick: nothing,
});

// ---------------------------------------------------------------- entrevista / coletiva

/** Chave estável de uma oportunidade de microfone. */
export function ivKey27(s: GameState, o: Opp27): string {
  if (o.ctx === 'story') return `iv:story:${o.storyId}`;
  if (o.ctx === 'scandal') return `iv:scandal:${o.actId}:${o.why.pt}`;
  if (o.ctx === 'camp') return `iv:camp:${o.campId}`;
  return `iv:press:${o.who === 'player' ? 'player' : o.actId}:${s.year}-${s.month}`;
}
/** Microfones da janela: matérias, escândalos e convites da campanha; pedido de imprensa só um por mês (o mais famoso). */
export function ivOccs27(s: GameState, opensMonth: boolean): Occ27[] {
  const ops = opps27(s).filter((o) => !ivGate27(s, o) && !declined27(s, ivKey27(s, o)));
  const out: Occ27[] = ops.filter((o) => o.ctx !== 'press').map((o) => ({ src: 'press', key: ivKey27(s, o), actId: o.actId, data: { opp: o } }));
  if (opensMonth) {
    const press = ops.filter((o) => o.ctx === 'press');
    const pick = press.filter((o) => o.who === 'act').sort((a, b) => (s.acts[b.actId ?? '']?.fame ?? 0) - (s.acts[a.actId ?? '']?.fame ?? 0) || ((a.actId ?? '') < (b.actId ?? '') ? -1 : 1))[0] ?? press.find((o) => o.who === 'player');
    if (pick) out.push({ src: 'press', key: ivKey27(s, pick), actId: pick.actId, data: { opp: pick } });
  }
  return out;
}
registerOccasions27('press', (s, w) => ivOccs27(s, w.opensMonth).map((o) => ({ ...o, day: w.from })));

registerActivity27({
  id: 'interview', kind: 'press', label: l('Entrevista', 'Interview'),
  when: (s, o) => !!o.data?.opp && !ivGate27(s, o.data.opp as Opp27),
  important: (_s, o) => (o.data?.opp as Opp27 | undefined)?.ctx !== 'press',
  title: (_s, o) => (o.data?.opp as Opp27).title,
  preview: (_s, o) => (o.data?.opp as Opp27).ctx === 'story'
    ? l('Jogar: a coletiva — a postura de cada resposta (polêmica, charmosa, misteriosa, esquiva) decide hype, imagem e o calor da imprensa. Rápido: você responde a matéria pelos botões de sempre (ou deixa passar).', 'Play: the press conference — the stance of each answer (controversial, charming, mysterious, deflecting) decides hype, image and press heat. Quick: you answer the story with the usual buttons (or let it pass).')
    : l('Jogar: a entrevista — a postura de cada resposta decide hype, imagem e o calor da imprensa. Rápido: o pedido fica para outra vez; nada muda.', 'Play: the interview — the stance of each answer decides hype, image and press heat. Quick: the request waits for another time; nothing changes.'),
  short: l('No próximo avanço: a coletiva — ou deixar passar.', 'On the next advance: the press conference — or let it pass.'),
  play: viaUi27('interview'),
  quick: (s, o) => { if (o.data?.opp) decline27(s, ivKey27(s, o.data.opp as Opp27)); },
});

// ---------------------------------------------------------------- favores (tela: almoço, jantar, presente, pedir favor)

export type FavorGesture27 = Gesture27 | 'ask';
registerActivity27({
  id: 'favors', kind: 'screen', label: l('Conversa de favor', 'Favor talk'),
  when: (s, o) => {
    const k = o.data?.key, g = o.data?.gesture as FavorGesture27 | undefined;
    if (typeof k !== 'string') return false;
    const c = contact27(s, k);
    return !!c && (!g || g === 'ask' || (c.gestures.includes(g) && !giveBlock27(s, k, g)));
  },
  // só importantes: quando já há algo no livro entre vocês (dívida, crédito, mágoa ou segredo)
  important: (s, o) => { const c = contact27(s, String(o.data?.key)); return !!c && c.owesMe.length + c.iOwe.length + c.grudges.length + c.dirt.length > 0; },
  play: viaUi27('favors'), quick: (_s, o) => classic(o),
});

// ---------------------------------------------------------------- crises

registerOccasions27('crisis', (s, w) => [
  ...crisisCands27(s).map((c): Occ27 => ({ src: 'crisis', key: `cr:${c.id}`, actId: c.ref.act, day: w.from, data: { cand: c.id, k: c.k, text: c.text } })),
  ...openCrises27(s).filter((c) => c.used === 0).map((c): Occ27 => ({ src: 'crisis', key: `crw:${c.id}:${s.week}`, actId: c.ref.act, day: w.from, data: { crisis: c.id, k: c.k, threat: Math.round(c.threat), left: c.left } })),
]);

registerActivity27({
  id: 'crisis', kind: 'crisis', label: l('Crise', 'Crisis'),
  when: (s, o) => (typeof o.data?.cand === 'string' && crisisCands27(s).some((c) => c.id === o.data!.cand)) || (typeof o.data?.crisis === 'string' && openCrises27(s).some((c) => c.id === o.data!.crisis)),
  important: () => true,
  title: (_s, o) => o.data?.cand
    ? fmtL(l('Crise na mesa: {k}', 'Crisis on the table: {k}'), { k: CRISIS_NAME27[o.data.k as keyof typeof CRISIS_NAME27] ?? l('crise', 'crisis') })
    : fmtL(l('Crise em andamento: {k} — ameaça {v}, {n} semana(s)', 'Crisis under way: {k} — threat {v}, {n} week(s)'), { k: CRISIS_NAME27[o.data?.k as keyof typeof CRISIS_NAME27] ?? l('crise', 'crisis'), v: Number(o.data?.threat ?? 0), n: Number(o.data?.left ?? 0) }),
  preview: (_s, o) => o.data?.cand
    ? l('Jogar: a sala de crise com relógio — a cada semana você escolhe as ações (advogado, acordo, imprensa…). Rápido: deixar correr; o jogo segue como sempre.', 'Play: the crisis room with a clock — each week you pick the moves (lawyer, settlement, press…). Quick: let it run; the game goes on as always.')
    : l('Jogar: as ações desta semana na sala de crise. Rápido: a equipe age sozinha (ou ninguém, se não houver gente da área).', 'Play: this week\'s moves in the crisis room. Quick: the staff acts on its own (or nobody, if there is no one for it).'),
  play: viaUi27('crisis'),
  quick: (s, o) => { if (typeof o.data?.cand === 'string') dismissCrisis27(s, o.data.cand); },
});

// ---------------------------------------------------------------- reunião de diretoria

type BoardPeek = { on: boolean; held: Record<string, { dec: Record<string, string> }> };
const boardPeek = (s: GameState): BoardPeek | undefined => (s.x4 as unknown as { board27?: BoardPeek }).board27;
/** Propostas do mês ainda sem decisão (vale também para a diretoria desligada: a 1ª reunião é oferecida uma vez). */
export function boardDue27(s: GameState, opensMonth = false): number {
  const B = boardPeek(s);
  if (!B?.on && declined27(s, 'board:off')) return 0;
  if ((s.clock?.dayInMonth ?? 0) >= 14 && !opensMonth) return 0;
  const props = agenda27(s);
  const dec = B?.held[monthKey27(s)]?.dec ?? {};
  return props.filter((p) => !dec[p.id]).length;
}
registerOccasions27('board', (s, w) => (boardDue27(s, w.opensMonth) ? [{ src: 'board', key: `board:${monthKey27(s)}`, day: w.from, data: { n: boardDue27(s, w.opensMonth), on: !!boardPeek(s)?.on } }] : []));

registerActivity27({
  id: 'board', kind: 'board', label: l('Reunião de diretoria', 'Board meeting'),
  when: (_s, o) => Number(o.data?.n ?? 0) > 0,
  important: () => true,
  title: (_s, o) => fmtL(l('Reunião de diretoria: {n} proposta(s) na pauta', 'Board meeting: {n} proposal(s) on the agenda'), { n: Number(o.data?.n ?? 0) }),
  preview: (_s, o) => o.data?.on
    ? l('Jogar: sentar à mesa — cada diretor defende a proposta dele; você aprova ou veta. Rápido: a pauta é decidida pelas regras de delegação.', 'Play: take a seat — each director pitches; you approve or veto. Quick: the agenda is decided by the delegation rules.')
    : l('Jogar: a primeira reunião mensal (liga a diretoria). Rápido: tudo segue como sempre, sem reunião (não pergunta de novo).', 'Play: the first monthly meeting (turns the board on). Quick: everything goes on as always, no meeting (won\'t ask again).'),
  play: viaUi27('board'),
  quick: (s, o) => { if (!o.data?.on) decline27(s, 'board:off'); },
});

// ---------------------------------------------------------------- estrada (eventos das próximas datas)

registerOccasions27('road', (s, w) => {
  const by = new Map<string, Occ27>();
  for (const x of pendingRoad27(s, Math.max(7, w.to - w.from + 7))) {
    const o = by.get(x.t.id);
    if (o) o.data!.n = Number(o.data!.n) + 1;
    else by.set(x.t.id, { src: 'road', key: `road:${x.t.id}:${x.st.day}`, actId: x.t.actId, day: x.st.day, data: { tourId: x.t.id, tour: x.t.name, n: 1 } });
  }
  return [...by.values()];
});

registerActivity27({
  id: 'road', kind: 'road', label: l('Diário de estrada', 'Road journal'),
  when: (s, o) => typeof o.data?.tourId === 'string' && s.tours.some((t) => t.id === o.data!.tourId),
  important: () => true,
  title: (_s, o) => fmtL(l('Estrada: {t} — {n} evento(s) nas próximas datas', 'Road: {t} — {n} event(s) on the next dates'), { t: String(o.data?.tour ?? '?'), n: Number(o.data?.n ?? 1) }),
  preview: () => l('Jogar: o diário — cartas "mais segura × mais lucrativa" para a van, a fronteira, o promotor, a festa… Rápido: a equipe decide no dia.', 'Play: the journal — "safer × more profitable" cards for the van, the border, the promoter, the party… Quick: the crew decides on the day.'),
  play: viaUi27('road'), quick: nothing,
});

// ---------------------------------------------------------------- turnê (tela: "Confirmar turnê" abre o mapa)

registerActivity27({
  id: 'route', kind: 'screen', label: l('Turnê no mapa', 'Tour on the map'),
  when: (s, o) => !!o.actId && !!s.acts[o.actId] && Array.isArray(o.data?.cities) && (o.data.cities as string[]).length > 0,
  important: (s, o) => ((o.data?.cities as string[] | undefined)?.length ?? 0) >= 3 || (s.acts[o.actId ?? '']?.fame ?? 0) >= 30,
  play: viaUi27('route'), quick: (_s, o) => classic(o),
});

// ---------------------------------------------------------------- renovação de contrato (tela: "Renegociar")

registerActivity27({
  id: 'renew', kind: 'screen', label: l('Renovação na mesa', 'Renewal at the table'),
  when: (s, o) => !!o.actId && !!s.acts[o.actId] && !negBlocked(s, o.actId, 'renew'),
  important: (s, o) => (s.acts[o.actId ?? '']?.fame ?? 0) >= 30,
  play: viaUi27('renew'), quick: (_s, o) => classic(o),
});
