// Rodada 28 (Fase 8, D2) — MODO HISTÓRIA (ASSISTIDO). Uma rampa para quem está começando num jogo enorme, ligada na
// Nova run (junto da dificuldade, puxa o "Fácil") ou a qualquer momento nas Opções (s.config.assist28).
//  • Narrador que alivia: eventos ruins pesam metade (um quinto no aperto de caixa) e os bons pesam mais quando o selo
//    aperta (events.storyteller via ASSIST_EV28) — vale para qualquer narrador, inclusive o Cínico (que não tem piedade).
//  • Socorro no aperto: no primeiro mês de insolvência, um mecenas da cena adianta 3 meses de despesas (uma vez a cada
//    3 anos), lançado no livro-razão como receita não operacional, com a fala do narrador. Não apaga o problema: dá tempo.
//  • Dicas: o conselheiro ganha dicas concretas do modo história (o que fazer agora e por quê, com "ir para").
// Sem efeito com o modo desligado (o multiplicador devolve 1 e nenhum gancho age). Determinístico (sem sorteio).

import { clamp } from '../../core/rng';
import { l, type L } from '../../data/world';
import { ASSIST_EV28, estimateMonthlyBurn } from '../events';
import { registerExt4, registerSimHook } from '../ext4';
import { pushInbox18, registerAdvisorTip, registerInboxKind, type AdvTip18 } from '../inbox18';
import type { GameState } from '../types';
import { fmtL, notify, playerActs, post } from '../util';

export interface Assist28State { aid: number[]; n: number }
declare module '../ext4' { interface Ext4 { as28: Assist28State } }
const fresh = (): Assist28State => ({ aid: [], n: 0 });
registerExt4('as28', fresh);
export function as28(s: GameState): Assist28State { const x = s.x4 as unknown as { as28?: Assist28State }; const st = (x.as28 ??= fresh()); st.aid ??= []; return st; }
export const assistOn28 = (s: GameState): boolean => !!s.config.assist28;
/** Ligar/desligar no meio da partida (Opções). */
export function setAssist28(s: GameState, on: boolean): void { s.config.assist28 = on || undefined; }

ASSIST_EV28.f = (s, struggling) => (assistOn28(s) ? { bad: struggling ? 0.2 : 0.5, good: struggling ? 1.6 : 1.15 } : { bad: 1, good: 1 });

registerInboxKind('as28', { label: l('Narrador', 'Narrator'), cat: 'money', icon: 'money', prio: 2, goto: () => ({ area: 'finance' }) });

/** Valor do socorro (3 meses de despesas, no mínimo um piso da época). */
export const aidAmount28 = (s: GameState): number => Math.max(Math.round(estimateMonthlyBurn(s) * 3), Math.round(Math.abs(Math.min(0, s.player.cash)) * 1.1));
/** Pode receber socorro agora? */
export function aidReady28(s: GameState): boolean {
  if (!assistOn28(s) || s.ended) return false;
  if (!(s.player.cash < 0 && s.player.insolvencyMonths >= 1)) return false;
  const last = as28(s).aid[as28(s).aid.length - 1];
  return last === undefined || s.week - last >= 156;
}
export function aid28(s: GameState): number {
  if (!aidReady28(s)) return 0;
  const v = aidAmount28(s);
  if (!post(s, `as28:aid:${s.week}`, v, 'misc', 'Mecenas da cena (modo história)')) return 0;
  const st = as28(s); st.aid.push(s.week); st.n++;
  const txt = fmtL(l('O narrador puxa uma cadeira: "Ainda não é o fim desta história." Um mecenas da cena adianta {v} — três meses de fôlego. Use para cortar custos e lançar o que já está pronto.', 'The narrator pulls up a chair: "This story isn\'t over yet." A scene patron advances {v} — three months of breathing room. Use it to cut costs and release what is ready.'), { v: `$${Math.round(v / 100).toLocaleString('en-US')}` });
  notify(s, txt, 'good');
  pushInbox18(s, 'as28', { from: l('Narrador', 'Narrator').pt, tone: 'good', subject: l('Fôlego para continuar', 'Room to keep going'), body: txt });
  return v;
}
registerSimHook('month', 'as28', (s) => { aid28(s); });

// ---------------------------------------------------------------- dicas do modo história

/** Dicas concretas (puras) — o conselheiro mostra com prioridade alta quando o modo está ligado. */
export function assistTips28(s: GameState): AdvTip18[] {
  if (!assistOn28(s)) return [];
  const out: AdvTip18[] = [];
  const burn = Math.max(1, estimateMonthlyBurn(s));
  const run = s.player.cash / burn;
  const tip = (id: string, level: AdvTip18['level'], text: L, why: L[], area: string, effect?: L) => out.push({ id: `as28:${id}`, level, text, why, effect, score: 95 - out.length, goto: { area } } as AdvTip18);
  if (run < 3) tip('cash', run < 1 ? 'bad' : 'warn', fmtL(l('Caixa para {m} mês(es): corte custos fixos antes de gastar em marketing.', 'Cash for {m} month(s): cut fixed costs before spending on marketing.'), { m: Math.max(0, Math.round(run * 10) / 10) }),
    [l('No modo história, o narrador socorre uma vez a cada 3 anos — não conte com isso duas vezes.', 'In story mode the narrator bails you out once every 3 years — don\'t count on it twice.')], 'finance');
  const acts = playerActs(s).map((id) => s.acts[id]).filter(Boolean);
  if (!acts.length) tip('sign', 'warn', l('Você não tem artistas: procure alguém na aba de Talentos e faça uma oferta justa.', 'You have no artists: look for someone in the Talent tab and make a fair offer.'), [l('Sem artista não há disco, show nem receita.', 'No artist means no record, no show, no revenue.')], 'market');
  for (const a of acts.slice(0, 4)) {
    const idle = s.week - (a.lastRelease ?? 0);
    if (a.releases.length === 0 || idle > 26) tip(`rel:${a.id}`, 'info', fmtL(l('{a} está há {m} meses sem lançar: grave e lance um single.', '{a} hasn\'t released in {m} months: record and release a single.'), { a: a.name, m: Math.round(idle / 4.33) }),
      [l('Lançar mantém fãs e momento; o single é barato e testa a música.', 'Releasing keeps fans and momentum; a single is cheap and tests the song.')], 'studio');
    const tired = a.members.map((id) => s.persons[id]).filter((p) => p?.alive && p.fatigue >= 70);
    if (tired.length) tip(`rest:${a.id}`, 'warn', fmtL(l('{a} está esgotado: marque um mês de descanso antes da próxima turnê.', '{a} is exhausted: schedule a month of rest before the next tour.'), { a: a.name }),
      [l('Cansaço alto vira briga, show ruim e saída da banda.', 'High fatigue turns into fights, bad shows and members quitting.')], 'artists');
    if (a.trust < 35) tip(`trust:${a.id}`, 'warn', fmtL(l('A confiança de {a} está baixa ({t}): cumpra promessas e evite cortes de verba.', '{a}\'s trust is low ({t}): keep promises and avoid budget cuts.'), { a: a.name, t: Math.round(clamp(a.trust, 0, 100)) }),
      [l('Confiança baixa faz o artista recusar renovação e falar mal do selo.', 'Low trust makes the artist refuse renewal and badmouth the label.')], 'artists');
  }
  return out.slice(0, 5);
}
registerAdvisorTip('assist28', assistTips28);
