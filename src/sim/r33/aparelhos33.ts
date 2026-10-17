// R33 · APARELHOS33 — CELULAR E COMPUTADOR (docs/r33/CELULAR_PC.md). Interruptor `exp33.aparelhos` (LIGADO por padrão).
// Aqui fica só a SIMULAÇÃO (sem DOM): as 5 versões de cada aparelho, o estado próprio (nasce na primeira escrita, nada
// de registerExt4: quem nunca usa um aparelho tem o save de hoje) e as mecânicas novas aprovadas pelo dono, cada uma
// pequena e ligada ao que já existe:
//   • minijogos: alívio de estresse do dono com teto por mês (`stress` do dono, o mesmo campo do stress17/vida33) e
//     recorde que vira fato do diário;
//   • toque de celular como formato (1997–2009): o hit vira toque e rende por mês pela curva própria do formato;
//   • demo caseira: a mesma sessão do compose27 tocada no automático, 1 bolinha, qualidade baixa;
//   • ligação por época: minuto caro de 1983 a 1996; vídeo (2012+) e holograma (2032+) valem mais na relação (shiftTie31);
//   • assistente de IA (2032+): responde a caixa por você (answerMsg); às vezes erra e vira processo (sala de crise);
//   • denúncia de pirataria (1999–2010): a perda do pirateLoss31 vira processo no cartório (gancho registerLegalCase33);
//   • assinatura de fãs (2013+): renda pequena por mês pela lealdade (fans18);
//   • vazamento do álbum (1999+): o evento de vazamento vira escolha — lançar às pressas, processar ou usar a favor;
//   • cambistas e preço dinâmico (2012+) e deepfake de voz (2023+) usam as regras que já existem (clash17 e ai18).
// Sorteios: fluxos próprios por chave (Rng.fromSeed), nunca o rng do mês.

import { clamp, Rng } from '../../core/rng';
import { l, type L } from '../../data/world';
import { registerSimHook } from '../ext4';
import { emitFact, factSeedKey17 } from '../facts17';
import { registerEvents, eventById, type EventDef } from '../events';
import { registerEditable } from '../r31/editor';
import { registerSwitch, setSw, sw } from '../r31/switches';
import { peekVit31 } from '../r31/vitrine31';
import { freeCash20, cashWhy20 } from '../oblig20';
import { ownerOf } from '../sys/people/owner';
import { spendEnergy } from '../sys/life';
import { startCompose27, playRound27, finishCompose27 } from '../sys/compose27';
import { meNode31, meet31, node31, shiftTie31 } from '../social31';
import { answerMsg, inboxItems } from '../sys/people/inbox';
import { crisisCands27, openCrisis27 } from '../sys/crisis27';
import { fans18 } from '../sys/fans18';
import { addHype } from '../sys/hype12';
import { registerLegalCase33 } from './dir33';
import type { GameState, Song } from '../types';
import { fmtL, money, playerActs, post } from '../util';

// ---------------------------------------------------------------- interruptor

export const SW_AP33 = 'exp33.aparelhos';
registerSwitch({
  id: SW_AP33, def: true, scope: 'game',
  desc: l('Celular (botão no menu de baixo, 1983+) e computador da mesa (1982+), com 5 versões cada e os apps ligados ao que já existe; minijogos, toques, demo caseira, assistente de IA, denúncia de pirataria, assinatura de fãs e vazamento do álbum.',
    'Phone (bottom-menu button, 1983+) and the desk computer (1982+), 5 versions each, with apps wired to what already exists; mini-games, ringtones, home demo, AI assistant, piracy reports, fan subscriptions and album leaks.'),
});
registerEditable({ id: `sw.${SW_AP33}`, area: 'tools', label: l('V33 · celular e computador', 'V33 · phone and computer'), kind: 'bool',
  get: (s) => sw<boolean>(s, SW_AP33), set: (s, v) => { setSw(s, SW_AP33, !!v); } });
export const ap33On = (s: GameState): boolean => sw<boolean>(s, SW_AP33);

// ---------------------------------------------------------------- as 5 versões

export const PHONE33 = [1983, 1997, 2007, 2012, 2032] as const;
export const PC33 = [1982, 1995, 2003, 2012, 2032] as const;
export type PhoneV33 = (typeof PHONE33)[number];
export type PcV33 = (typeof PC33)[number];
export type Dev33 = 'phone' | 'pc';

const verOf = <T extends number>(xs: readonly T[], y: number): T | undefined => { let v: T | undefined; for (const x of xs) if (y >= x) v = x; return v; };
/** Versão do celular no ano (undefined antes de 1983). */
export const phoneV33 = (y: number): PhoneV33 | undefined => verOf(PHONE33, y);
/** Versão do computador no ano (undefined antes de 1982). */
export const pcV33 = (y: number): PcV33 | undefined => verOf(PC33, y);
export const devV33 = (d: Dev33, y: number): number | undefined => (d === 'phone' ? phoneV33(y) : pcV33(y));

export const PHONE_NAME33: Record<PhoneV33, L> = {
  1983: l('Tijolão de antena', 'Brick phone'), 1997: l('Celular de flip', 'Flip phone'), 2007: l('Primeiro smartphone', 'First smartphone'),
  2012: l('Smartphone', 'Smartphone'), 2032: l('Holograma no pulso', 'Wrist hologram'),
};
export const PC_NAME33: Record<PcV33, L> = {
  1982: l('Computador de tela verde e disquete', 'Green-screen computer with floppy'), 1995: l('Computador de janelas com modem', 'Windowed computer with modem'),
  2003: l('Computador de banda larga', 'Broadband computer'), 2012: l('Computador de tela plana', 'Flat-screen computer'), 2032: l('Mesa de vidro com holograma', 'Glass desk with hologram'),
};

// ---------------------------------------------------------------- estado (nasce na primeira escrita)

export interface PirCase33 { id: string; w: number; loss: number; done?: 'won' | 'lost' }
export interface Ap33 {
  /** recorde por minijogo */
  rec: Record<string, number>;
  /** alívio de estresse dado pelos minijogos no mês: [índice do mês, total] */
  calm: [number, number];
  /** toques à venda: id do lançamento → semana em que virou toque */
  ring: Record<string, number>;
  /** assinatura de fãs: id do ato → semana */
  sub: Record<string, number>;
  /** Encontros: chave da pessoa → [l curtiu · s super curtida · x passou, semana] */
  swipe: Record<string, [string, number]>;
  /** denúncias de pirataria abertas no cartório */
  pir: PirCase33[];
  /** semana do último dia de respostas do assistente */
  ai?: number;
  seq: number;
}
const fresh = (): Ap33 => ({ rec: {}, calm: [0, 0], ring: {}, sub: {}, swipe: {}, pir: [], seq: 0 });
export function ap33(s: GameState): Ap33 {
  const x = ((s as unknown as { x4?: Record<string, unknown> }).x4 ??= {});
  const st = (x.ap33 ??= fresh()) as Ap33;
  st.rec ??= {}; st.ring ??= {}; st.sub ??= {}; st.swipe ??= {}; st.pir ??= []; st.calm ??= [0, 0];
  return st;
}
/** Leitura sem criar o estado (montar telas não muda o mundo). */
export const peekAp33 = (s: GameState): Ap33 | undefined => (s as unknown as { x4?: { ap33?: Ap33 } }).x4?.ap33;
const rngOf = (s: GameState, k: string): Rng => Rng.fromSeed(`${s.config.seed}|ap33|${k}|${s.week}`);
const ym = (s: GameState): number => s.year * 12 + s.month;

// ---------------------------------------------------------------- (1) minijogos: alívio de estresse e recorde

export const CALM33 = { per: 3, cap: 8 } as const;
/** Quanto de estresse ainda dá para tirar jogando neste mês. */
export function calmLeft33(s: GameState): number {
  const c = peekAp33(s)?.calm;
  return Math.max(0, CALM33.cap - (c && c[0] === ym(s) ? c[1] : 0));
}
export interface Play33 { calm: number; record: boolean; text: L }
/** Fim de uma partida: baixa o estresse do dono (até o teto do mês) e guarda o recorde (fato do diário). */
export function endGame33(s: GameState, game: string, name: L, score: number): Play33 {
  const st = ap33(s);
  if (st.calm[0] !== ym(s)) st.calm = [ym(s), 0];
  const o = ownerOf(s);
  const calm = Math.min(calmLeft33(s), score > 0 ? CALM33.per : 1, Math.max(0, Math.round(o.stress)));
  if (calm > 0) { o.stress = clamp(o.stress - calm, 0, 100); st.calm[1] += calm; }
  const record = score > (st.rec[game] ?? 0);
  if (record) {
    st.rec[game] = score;
    emitFact(s, { kind: 'hobby33', actors: ['player'], severity: 6, visibility: 'secret', tags: ['ap33', 'game', game], src: 'aparelhos33',
      text: fmtL(l('Novo recorde em {g}: {n} pontos.', 'New record at {g}: {n} points.'), { g: name, n: score }), diary: true });
  }
  const text = record ? fmtL(l('Recorde: {n} pontos! Estresse −{c}.', 'Record: {n} points! Stress −{c}.'), { n: score, c: calm })
    : calm > 0 ? fmtL(l('{n} pontos. Estresse −{c}.', '{n} points. Stress −{c}.'), { n: score, c: calm })
      : fmtL(l('{n} pontos. O jogo já não tira mais estresse este mês.', '{n} points. Games will not lower stress any further this month.'), { n: score });
  return { calm, record, text };
}

// ---------------------------------------------------------------- (2) toque de celular como formato (1997–2009)

export const RING33 = { from: 1997, to: 2009 } as const;
/** Vida do formato "toque" no ano (0..1): sobe até 2003, cheio até 2006, morre em 2009 com o smartphone. */
export function ringLife33(y: number): number {
  if (y < RING33.from || y > RING33.to) return 0;
  if (y <= 2003) return 0.25 + (0.75 * (y - RING33.from)) / (2003 - RING33.from);
  if (y <= 2006) return 1;
  return Math.max(0.1, 1 - (0.9 * (y - 2006)) / 3);
}
/** Motivo para não virar toque (ou null). */
export function ringLock33(s: GameState, relId: string): L | null {
  if (!ap33On(s)) return l('Celular e computador estão desligados nesta partida.', 'Phone and computer are switched off in this game.');
  if (s.year < RING33.from) return fmtL(l('Toque de celular só existe a partir de {y}.', 'Ringtones only exist from {y}.'), { y: RING33.from });
  if (s.year > RING33.to) return l('O mercado de toques acabou com os smartphones.', 'The ringtone market ended with smartphones.');
  const r = s.releases[relId];
  if (!r || r.owner !== 'player') return l('Escolha um disco seu.', 'Pick a record of yours.');
  if (peekAp33(s)?.ring[relId] !== undefined) return l('Esse disco já virou toque.', 'That record is already a ringtone.');
  if (r.peak <= 0 || r.peak > 40) return l('Só hit vira toque (precisa ter entrado no top 40).', 'Only a hit becomes a ringtone (it needs a top-40 entry).');
  return null;
}
export function makeRingtone33(s: GameState, relId: string): L | null {
  const why = ringLock33(s, relId);
  if (why) return why;
  const r = s.releases[relId];
  ap33(s).ring[relId] = s.week;
  emitFact(s, { kind: 'deal', actors: ['player', r.actId], severity: 12, visibility: 'public', tags: ['ap33', 'ringtone', 'formats33'], src: 'aparelhos33',
    text: fmtL(l('"{t}" vira toque de celular.', '"{t}" becomes a ringtone.'), { t: r.title }) });
  return null;
}
/** Renda do mês de um toque: pelo tamanho do hit e pela vida do formato (pequena; some com o formato). */
export function ringIncome33(s: GameState, relId: string): number {
  const r = s.releases[relId];
  if (!r) return 0;
  const hit = clamp((41 - r.peak) / 40, 0.05, 1);
  const age = Math.max(0, s.week - (peekAp33(s)?.ring[relId] ?? s.week));
  return Math.round(money(s, 900 * hit * ringLife33(s.year) * Math.max(0.2, 1 - age / 156)));
}

// ---------------------------------------------------------------- (3) demo caseira

export const DEMO33 = { q: 0.72 } as const;
/** Grava uma demo sem estúdio: 1 bolinha pessoal, a sessão do compose27 no automático, qualidade baixa. */
export function homeDemo33(s: GameState, actId: string): { ok: boolean; text: L; songs: Song[] } {
  if (!ap33On(s)) return { ok: false, text: l('Celular e computador estão desligados nesta partida.', 'Phone and computer are switched off in this game.'), songs: [] };
  const c = startCompose27(s, actId);
  if (!('v' in c)) return { ok: false, text: c, songs: [] };
  const e = spendEnergy(s, 1);
  if (e) return { ok: false, text: e, songs: [] };
  for (let i = 0; i < 6 && !c.done; i++) {
    const rd = c.log[c.log.length - 1];
    const pick = rd?.hand.filter((x) => !(x.fx.cost ?? 0)).slice(0, 1).map((x) => x.id) ?? [];
    if (playRound27(s, c, pick)) playRound27(s, c, []);
  }
  const res = finishCompose27(s, c);
  if (!('songs' in res)) return { ok: false, text: res, songs: [] };
  for (const so of res.songs) { so.q = Math.round(so.q * DEMO33.q); so.originality = clamp(so.originality - 4, 5, 100); }
  const a = s.acts[actId];
  return { ok: true, songs: res.songs, text: fmtL(l('Demo caseira de {a}: {n} faixa(s) na gaveta, som cru (qualidade {q}).', 'Home demo by {a}: {n} track(s) in the drawer, raw sound (quality {q}).'), { a: a?.name ?? '', n: res.songs.length, q: res.songs[0]?.q ?? 0 }) };
}

// ---------------------------------------------------------------- (4) ligação por época

/** Custo de uma ligação de 10 minutos (1983–1996: minuto caro, cai com os anos; depois, nada). */
export function callCost33(s: GameState): number {
  if (s.year >= 1997) return 0;
  const perMin = 3 - (2.4 * (s.year - 1983)) / 13;
  return Math.round(money(s, perMin * 10));
}
export type Call33 = 'voice' | 'video' | 'holo';
export const callKind33 = (y: number): Call33 => (y >= 2032 ? 'holo' : y >= 2012 ? 'video' : 'voice');
/** Peso da conversa na relação: vídeo vale mais que voz, holograma mais ainda. */
export const CALL_K33: Record<Call33, number> = { voice: 1, video: 1.6, holo: 2.2 };
export const CALL_L33: Record<Call33, L> = { voice: l('Ligação', 'Call'), video: l('Chamada de vídeo', 'Video call'), holo: l('Ligação em holograma', 'Hologram call') };
export function callLock33(s: GameState, pid: string): L | null {
  if (!s.persons[pid]?.alive) return l('Pessoa indisponível.', 'Person unavailable.');
  const c = callCost33(s);
  if (c && freeCash20(s) < c) return cashWhy20(s, c, l('Caixa insuficiente para o interurbano.', 'Not enough cash for the long-distance call.'));
  return null;
}
/** Liga para a pessoa: conta como encontro (meet31) e mexe na relação pelo peso da época (shiftTie31). */
export function phoneCall33(s: GameState, pid: string): L {
  const why = callLock33(s, pid);
  if (why) return why;
  const c = callCost33(s);
  if (c) post(s, `ap33call:${pid}:${s.week}`, -c, 'misc', `Interurbano: ${s.persons[pid].name}`);
  const k = CALL_K33[callKind33(s.year)];
  const me = meNode31(s), them = node31(s, `p:${pid}`);
  meet31(s, me, them, 'other', { i: Math.round(2 * k) });
  shiftTie31(s, me, them, { i: Math.round(2 * k), r: Math.round(k), rBack: Math.round(k) });
  return fmtL(l('{k} com {n}: a relação esquentou.', '{k} with {n}: the relationship warmed up.'), { k: CALL_L33[callKind33(s.year)], n: s.persons[pid].name });
}

// ---------------------------------------------------------------- (5) assistente de IA (2032+)

export const AI33 = { from: 2032, err: 0.08, max: 4 } as const;
/** Mensagens que o assistente pode responder agora (pedem resposta e ainda não foram respondidas). */
export function aiQueue33(s: GameState): { id: string; subject: L; act: string }[] {
  const out: { id: string; subject: L; act: string }[] = [];
  for (const it of inboxItems(s)) {
    const m = it.msg;
    if (!m || m.resolved || !m.actions?.length) continue;
    const pref = ['ok', 'accept', 'yes', 'go', 'thanks'];
    const act = m.actions.find((a) => pref.includes(a.id))?.id ?? m.actions[0].id;
    out.push({ id: m.id, subject: m.subject as L, act });
  }
  return out.slice(0, AI33.max);
}
export function aiLock33(s: GameState): L | null {
  if (s.year < AI33.from) return fmtL(l('O assistente que responde por você chega em {y}.', 'The assistant that answers for you arrives in {y}.'), { y: AI33.from });
  if ((peekAp33(s)?.ai ?? -99) > s.week - 4) return l('O assistente já respondeu este mês.', 'The assistant already answered this month.');
  if (!aiQueue33(s).length) return l('Nada esperando resposta.', 'Nothing waiting for a reply.');
  return null;
}
/** Responde até 4 mensagens com a resposta padrão. Com 8% de chance erra: a outra parte processa (sala de crise). */
export function aiAnswer33(s: GameState): { text: L; n: number; crisis?: string } {
  const why = aiLock33(s);
  if (why) return { text: why, n: 0 };
  const q = aiQueue33(s);
  const st = ap33(s);
  st.ai = s.week;
  let n = 0;
  for (const m of q) { answerMsg(s, m.id, m.act); n++; }
  const r = rngOf(s, 'ai');
  if (r.chance(AI33.err)) {
    const f = emitFact(s, { kind: 'industry_suit', actors: ['ap33:ai', 'player'], severity: 40, visibility: 'public', tags: ['ap33', 'ai', 'lawsuit'], src: 'aparelhos33',
      text: l('O assistente respondeu sozinho aceitando um acordo que o selo não podia cumprir; a outra parte processa.', 'The assistant replied on its own, accepting a deal the label could not honour; the other party sues.'), notify: 'bad' });
    const id = `law:${factSeedKey17(f)}`;
    const ok = crisisCands27(s).some((c) => c.id === id) ? openCrisis27(s, id) : null;
    return { text: fmtL(l('O assistente respondeu {n} mensagem(ns) — e errou numa: virou processo.', 'The assistant answered {n} message(s) — and got one wrong: it became a lawsuit.'), { n }), n, crisis: ok && 'id' in ok ? ok.id : undefined };
  }
  return { text: fmtL(l('O assistente respondeu {n} mensagem(ns) com a resposta padrão.', 'The assistant answered {n} message(s) with the default reply.'), { n }), n };
}

// ---------------------------------------------------------------- (6) denúncia de pirataria (1999–2010)

export const PIR33 = { from: 1999, to: 2010, fee: 800, win: 0.55 } as const;
/** Prejuízo acumulado com pirataria do seu disco (o mesmo total que o pirateLoss31 soma na virada). */
export const pirTotal33 = (s: GameState): number => peekVit31(s)?.pir ?? 0;
/** Fitas/arquivos piratas dos seus discos à venda agora. */
export const pirItems33 = (s: GameState): string[] => (peekVit31(s)?.items ?? []).filter((x) => x.c === 'bm_pirate' && !!x.ref.rel).map((x) => x.id);
export function pirLock33(s: GameState): L | null {
  if (s.year < PIR33.from || s.year > PIR33.to) return fmtL(l('Denúncia de fórum e P2P só entre {a} e {b}.', 'Forum and P2P reports only between {a} and {b}.'), { a: PIR33.from, b: PIR33.to });
  if (!pirItems33(s).length) return l('Nenhuma cópia pirata sua circulando agora.', 'No pirate copy of yours circulating now.');
  if ((peekAp33(s)?.pir ?? []).some((c) => !c.done)) return l('Já há uma denúncia correndo no cartório.', 'A report is already running at the registry.');
  const fee = money(s, PIR33.fee);
  if (freeCash20(s) < fee) return cashWhy20(s, fee, l('Caixa insuficiente para as custas.', 'Not enough cash for the costs.'));
  return null;
}
/** Denuncia no cartório: paga as custas e abre o processo (o jurídico ou você decide brigar). */
export function reportPiracy33(s: GameState): L {
  const why = pirLock33(s);
  if (why) return why;
  const st = ap33(s);
  post(s, `ap33pir:${s.week}`, -money(s, PIR33.fee), 'legal', 'Denúncia de pirataria');
  st.pir.push({ id: `pir${++st.seq}`, w: s.week, loss: pirTotal33(s) });
  return l('Denúncia registrada no cartório: o processo está aberto.', 'Report filed at the registry: the case is open.');
}
/** Brigar no processo: ganhando, as cópias piratas saem da rua e parte do prejuízo volta. */
export function resolvePiracy33(s: GameState, id: string, win: number = PIR33.win): L {
  const c = (peekAp33(s)?.pir ?? []).find((x) => x.id === id && !x.done);
  if (!c) return l('Processo não encontrado.', 'Case not found.');
  const ok = rngOf(s, `pir:${id}`).chance(win);
  c.done = ok ? 'won' : 'lost';
  if (ok) {
    const v = peekVit31(s);
    if (v) v.items = v.items.filter((x) => x.c !== 'bm_pirate');
    const back = Math.round(c.loss * 0.3);
    if (back > 0) post(s, `ap33pirw:${id}`, back, 'legal', 'Indenização por pirataria');
    emitFact(s, { kind: 'case_ruling', actors: ['player'], severity: 25, visibility: 'public', tags: ['ap33', 'piracy', 'won'], src: 'aparelhos33',
      text: l('O cartório manda tirar do ar as cópias piratas do selo.', 'The court orders the label\'s pirate copies taken down.'), diary: true });
    return l('Ganhou: as cópias piratas saem da rua e parte do prejuízo volta.', 'Won: the pirate copies come off the street and part of the loss comes back.');
  }
  post(s, `ap33pirl:${id}`, -money(s, 600), 'legal', 'Custas: pirataria');
  return l('Perdeu: o juiz não viu prova suficiente; as custas ficam com você.', 'Lost: the judge saw too little evidence; you pay the costs.');
}
registerLegalCase33({
  id: 'ap33pir',
  list: (s) => (peekAp33(s)?.pir ?? []).filter((c) => !c.done).map((c) => ({ id: c.id, t: l('Denúncia de pirataria', 'Piracy report'), settle: 0, win: PIR33.win })),
  decide: (s, id) => { resolvePiracy33(s, id); return null; },
});

// ---------------------------------------------------------------- (7) assinatura de fãs (2013+)

export const SUB33 = { from: 2013, rate: 0.03, max: 4000 } as const;
export function subLock33(s: GameState, actId: string): L | null {
  if (s.year < SUB33.from) return fmtL(l('Assinatura de fãs só a partir de {y}.', 'Fan subscriptions only from {y}.'), { y: SUB33.from });
  const a = s.acts[actId];
  if (!a || (a.owner !== 'player' && !a.playerBand)) return l('Só para artistas do seu elenco.', 'Only for your roster.');
  if (a.fans.core < 500) return l('Base fiel pequena demais (menos de 500 fãs de núcleo).', 'Core fan base too small (fewer than 500 core fans).');
  return null;
}
export function setFanSub33(s: GameState, actId: string, on: boolean): L | null {
  if (on) { const why = subLock33(s, actId); if (why) return why; ap33(s).sub[actId] = s.week; return null; }
  const st = peekAp33(s);
  if (st) delete st.sub[actId];
  return null;
}
/** Renda do mês: fãs de núcleo × lealdade (fans18), pequena e com teto. */
export function subIncome33(s: GameState, actId: string): number {
  const a = s.acts[actId];
  if (!a) return 0;
  const loy = fans18(s).a[actId]?.loy ?? 50;
  return Math.round(money(s, Math.min(SUB33.max, a.fans.core * SUB33.rate * (loy / 100))));
}

registerSimHook('month', 'aparelhos33', (s) => {
  const st = peekAp33(s);
  if (!st || !ap33On(s)) return;
  for (const id of Object.keys(st.ring)) {
    if (!s.releases[id] || s.year > RING33.to) { delete st.ring[id]; continue; }
    const v = ringIncome33(s, id);
    if (v > 0) post(s, `ap33ring:${id}:${s.week}`, v, 'licensing', `Toques: ${s.releases[id].title}`);
  }
  const mine = new Set(playerActs(s));
  for (const id of Object.keys(st.sub)) {
    if (!mine.has(id)) { delete st.sub[id]; continue; }
    const v = subIncome33(s, id);
    if (v > 0) post(s, `ap33sub:${id}:${s.week}`, v, 'merch', `Assinatura de fãs: ${s.acts[id].name}`);
  }
});

// ---------------------------------------------------------------- (8) vazamento do álbum (1999+): escolha

export const LEAK33 = { from: 1999 } as const;
/** As três saídas do vazamento (puras sobre o lançamento marcado). */
export function leakChoice33(s: GameState, prId: string, how: 'rush' | 'sue' | 'use'): L {
  const pr = s.pendingReleases.find((p) => p.id === prId);
  if (!pr) return l('O disco já saiu.', 'The record is already out.');
  if (how === 'rush') { pr.week = Math.min(pr.week, s.week + 1); addHype(s, pr.actId, 'ap33leak', l('Estreia às pressas', 'Rushed release'), 4); return l('O disco sai na semana que vem: menos tempo para a cópia circular.', 'The record comes out next week: less time for the copy to spread.'); }
  if (how === 'sue') { post(s, `ap33leak:${prId}`, -money(s, 2500), 'legal', 'Processo: vazamento'); addHype(s, pr.actId, 'ap33leak', l('Vazamento contido', 'Leak contained'), -2); return l('Os advogados derrubam os links; a estreia fica intacta, mas sem barulho.', 'The lawyers take the links down; the debut stays intact but quiet.'); }
  addHype(s, pr.actId, 'ap33leak', l('Vazamento usado a favor', 'Leak turned into buzz'), 10);
  return l('O selo assume o vazamento como divulgação: todo mundo comenta o disco antes de sair.', 'The label owns the leak as promotion: everyone talks about the record before release.');
}
const LEAK_EV33: EventDef = {
  id: 'ap33_leak', cat: 'scandal', tone: 'bad', tags: [], cooldown: 18,
  find: (s) => {
    if (!ap33On(s) || s.year < LEAK33.from) return null;
    const mine = new Set(playerActs(s));
    const pr = s.pendingReleases.find((p) => mine.has(p.actId) && p.type !== 'single' && p.week - s.week >= 2 && p.week - s.week <= 8);
    if (!pr || !Rng.fromSeed(`${s.config.seed}|ap33leak|${pr.id}`).chance(0.18)) return null;
    return { act: pr.actId, pr: pr.id, title: pr.title };
  },
  title: l('"{title}" vazou na internet', '"{title}" leaked online'),
  text: l('O álbum de {act} aparece inteiro no P2P e nos fóruns semanas antes da data.', '{act}\'s album shows up in full on P2P and forums weeks before the date.'),
  options: [
    { id: 'rush', label: l('Lançar às pressas', 'Rush the release'), hint: l('Sai na semana que vem.', 'Out next week.'), apply: (s, _r, c) => { leakChoice33(s, String(c.pr), 'rush'); } },
    { id: 'sue', label: l('Processar', 'Sue'), hint: l('Custa advogados; a estreia fica intacta.', 'Costs lawyers; the debut stays intact.'), apply: (s, _r, c) => { leakChoice33(s, String(c.pr), 'sue'); } },
    { id: 'use', label: l('Usar a favor', 'Turn it into buzz'), hint: l('Muito barulho antes da estreia.', 'Lots of buzz before release.'), apply: (s, _r, c) => { leakChoice33(s, String(c.pr), 'use'); } },
  ],
};
registerEvents([LEAK_EV33]);
// o vazamento antigo (faixas soltas) segue até 1998; de 1999 em diante, com o interruptor, é a escolha nova
{
  const old = eventById.leak;
  const f0 = old?.find;
  if (old && f0) old.find = (s, r) => (ap33On(s) && s.year >= LEAK33.from ? null : f0(s, r));
}
