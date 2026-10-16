// R31 · onda 5 (TRN, EXP-11) — TRANSIÇÕES ENTRE TELAS: modelo puro (sem DOM; testes em tests/r31-trn.test.ts).
// Mocks aprovados: docs/r31/mocks/onda5/onda5-mock-transicao-{1..5}.png (fonte trans.html).
//
// Cinco tipos, todos só de apresentação — nada aqui escreve no estado do jogo:
//  - travel: Sede, Casa, Cidade e Mundo — cortina fecha, cartão do destino (local, data, o que espera lá), cortina abre;
//  - open:   objeto/sala da sede — zoom em pixel no objeto clicado e o papel sobe (atalho de teclado abre direto);
//  - close:  Esc/voltar de um objeto aberto pelo zoom — o papel desce;
//  - trip:   Mundo → viajar até outra cidade — a rota anda no mapa com o transporte da época, cortina com a passagem;
//  - month:  virada do mês — a folha do calendário cai, o mês novo mostra 1–3 pendências reais.
// O material muda com a época (cortina e calendário). Modo: completas / rápidas (metade do tempo) / desligadas;
// "movimento reduzido" vira corte simples (sem animação).

import { l, type L } from '../../data/world';
import type { TrnMode31 } from '../../sim/r31/exp5trn';

export type TrnKind31 = 'travel' | 'open' | 'close' | 'trip' | 'month';
export type TrnPlace31 = 'sede' | 'casa' | 'cidade' | 'mundo';
export type Curtain31 = 'velvet' | 'wine' | 'lamina' | 'led';
export type Cal31 = 'wall' | 'flip' | 'phone';
export type Vehicle31 = 'ship' | 'train' | 'bus' | 'plane';

/** Cortina por época: veludo vermelho (1889–1949), vinho (1950–79), lâminas de metal e neon (1980–2009), LED (2010–40). */
export function curtainOf31(year: number): Curtain31 {
  return year < 1950 ? 'velvet' : year < 1980 ? 'wine' : year < 2010 ? 'lamina' : 'led';
}
/** Calendário da virada: folha de parede (até 1969), relógio de virar (1970–2009), tela do celular (2010+). */
export function calendarOf31(year: number): Cal31 {
  return year < 1970 ? 'wall' : year < 2010 ? 'flip' : 'phone';
}
/** Transporte desenhado na rota: o meio real da viagem quando há; sem ele, navio/trem até 1949 e avião depois. */
export function vehicleOf31(year: number, mode?: string): Vehicle31 {
  if (mode === 'ship') return 'ship';
  if (mode === 'train') return 'train';
  if (mode === 'bus') return 'bus';
  if (mode === 'prop_plane' || mode === 'jet' || mode === 'hyperloop') return 'plane';
  return year < 1950 ? 'ship' : 'plane';
}
/** Cor da borda do cartão/painel por material (a mesma do mock). */
export const EDGE31: Record<Curtain31, string> = { velvet: '#f0c060', wine: '#f0c860', lamina: '#ff4fa0', led: '#4ff0ff' };

// ---------------------------------------------------------------- tempos

export type TrnPhase31 = 'close' | 'card' | 'open' | 'zoom' | 'rise' | 'drop' | 'route' | 'ticket' | 'fall' | 'show' | 'fade';
/** Fases e milissegundos no modo "completas". A viagem soma 0,5 s; o objeto 0,3 s; fechar o papel 0,15 s. */
export const TIMELINE31: Record<TrnKind31, readonly (readonly [TrnPhase31, number])[]> = {
  travel: [['close', 200], ['card', 100], ['open', 200]],
  open: [['zoom', 150], ['rise', 150]],
  close: [['drop', 150]],
  trip: [['route', 400], ['close', 150], ['ticket', 450], ['open', 200]],
  month: [['fall', 300], ['show', 900], ['fade', 150]],
};
/** Fase ao fim da qual a tela de baixo troca (a troca de página acontece com a cortina fechada / o zoom cheio). */
export const SWAP_AT31: Record<TrnKind31, TrnPhase31> = { travel: 'close', open: 'zoom', close: 'drop', trip: 'close', month: 'fall' };

/** Escala de tempo do modo (rápidas = metade). */
export const modeScale31 = (m: TrnMode31): number => (m === 'fast' ? 0.5 : 1);

export interface TrnPlan31 { anim: boolean; scale: number; why?: 'off' | 'reduced' | 'env' }
/** Vai animar? Interruptor desligado ou modo "desligadas" = nenhuma transição; movimento reduzido = corte simples. */
export function trnPlan31(o: { on: boolean; mode: TrnMode31; reduced: boolean; live?: boolean }): TrnPlan31 {
  if (!o.on || o.mode === 'off') return { anim: false, scale: 0, why: 'off' };
  if (o.reduced) return { anim: false, scale: 0, why: 'reduced' };
  if (o.live === false) return { anim: false, scale: 0, why: 'env' };
  return { anim: true, scale: modeScale31(o.mode) };
}

export const totalMs31 = (k: TrnKind31, scale = 1): number => TIMELINE31[k].reduce((a, [, ms]) => a + ms, 0) * scale;
/** Momento (ms desde o início) em que a tela de baixo troca. */
export function swapMs31(k: TrnKind31, scale = 1): number {
  let t = 0;
  for (const [ph, ms] of TIMELINE31[k]) { t += ms * scale; if (ph === SWAP_AT31[k]) return t; }
  return t;
}
export interface TrnAt31 { phase: TrnPhase31; p: number; done: boolean }
/** Fase e progresso (0–1) num instante. */
export function phaseAt31(k: TrnKind31, ms: number, scale = 1): TrnAt31 {
  const tl = TIMELINE31[k];
  let t = 0;
  for (const [ph, d0] of tl) {
    const d = d0 * scale;
    if (ms < t + d) return { phase: ph, p: d > 0 ? Math.max(0, (ms - t) / d) : 1, done: false };
    t += d;
  }
  return { phase: tl[tl.length - 1][0], p: 1, done: true };
}

// ---------------------------------------------------------------- o que a transição mostra (lido do jogo)

export interface Card31 { place: TrnPlace31; title: L; where: L; line: L }
export interface Ticket31 { from: string; to: string; fromId: string; toId: string; date: L; vehicle: Vehicle31; mode: L; days: number; cost?: string }
export interface Month31 { old: [number, number]; now: [number, number]; items: L[] }
export interface TrnInfo31 {
  year: number;
  card?: Card31;
  ticket?: Ticket31;
  month?: Month31;
  /** retângulo (tela) do objeto clicado, para o zoom */
  rect?: { x: number; y: number; w: number; h: number };
}

/** Pendência vista pela transição (a fila única de src/sim/r31/pending.ts, já com o lugar dono). */
export interface TrnPend31 { title: L; prio?: number; due?: number; place?: TrnPlace31 | null }

export const PLACE_NAME31: Record<TrnPlace31, L> = { sede: l('Sede', 'HQ'), casa: l('Casa', 'Home'), cidade: l('Cidade', 'City'), mundo: l('Mundo', 'World') };
export const MONTHS31: L[] = [
  l('Jan', 'Jan'), l('Fev', 'Feb'), l('Mar', 'Mar'), l('Abr', 'Apr'), l('Mai', 'May'), l('Jun', 'Jun'),
  l('Jul', 'Jul'), l('Ago', 'Aug'), l('Set', 'Sep'), l('Out', 'Oct'), l('Nov', 'Nov'), l('Dez', 'Dec')];
const mon = (m: number): L => MONTHS31[((m % 12) + 12) % 12];
const dateL = (m: number, y: number): L => ({ pt: `${mon(m).pt} ${y}`, en: `${mon(m).en} ${y}` });

/** Ordem de urgência: prioridade maior primeiro, depois prazo mais perto (estável). */
export function byUrgency31<T extends TrnPend31>(xs: readonly T[]): T[] {
  return xs.map((x, i) => [x, i] as const).sort((a, b) => (b[0].prio ?? 0) - (a[0].prio ?? 0) || (a[0].due ?? 1e9) - (b[0].due ?? 1e9) || a[1] - b[1]).map(([x]) => x);
}

/** Cartão da viagem: destino, local e data, e 1 linha com o que espera lá (as pendências reais daquele lugar). */
export function cardInfo31(o: { to: TrnPlace31; city: string; month: number; year: number; pend: readonly TrnPend31[] }): Card31 {
  const here = byUrgency31(o.pend.filter((p) => p.place === o.to));
  const where: L = o.to === 'mundo'
    ? { pt: `mapa-múndi · ${o.year}`, en: `world map · ${o.year}` }
    : { pt: `${o.city} · ${dateL(o.month, o.year).pt}`, en: `${o.city} · ${dateL(o.month, o.year).en}` };
  const n = here.length;
  const line: L = n === 0 ? l('Nada pede você aqui agora', 'Nothing needs you here right now')
    : n === 1 ? here[0].title
      : { pt: `${n} pendências · ${here[0].title.pt}`, en: `${n} pending · ${here[0].title.en}` };
  return { place: o.to, title: PLACE_NAME31[o.to], where, line };
}

/** Passagem: origem, destino, data, meio, tempo e preço reais da cotação do jogo. */
export function ticketInfo31(o: { from: string; to: string; fromId: string; toId: string; month: number; year: number; mode?: string; modeName?: L; days?: number; cost?: string }): Ticket31 {
  const vehicle = vehicleOf31(o.year, o.mode);
  const mode = o.modeName ?? (vehicle === 'ship' ? l('navio', 'ship') : vehicle === 'train' ? l('trem', 'train') : vehicle === 'bus' ? l('ônibus', 'bus') : l('avião', 'plane'));
  return { from: o.from, to: o.to, fromId: o.fromId, toId: o.toId, date: dateL(o.month, o.year), vehicle, mode, days: o.days ?? 0, cost: o.cost };
}
/** Linha de baixo da passagem ("Set 1962 · avião · 1 dia · $ 480"). */
export function ticketLine31(k: Ticket31): L {
  const d = k.days > 0 ? { pt: ` · ${fmtDays(k.days, 'pt')}`, en: ` · ${fmtDays(k.days, 'en')}` } : { pt: '', en: '' };
  const c = k.cost ? ` · ${k.cost}` : '';
  return { pt: `${k.date.pt} · ${k.mode.pt}${d.pt}${c}`, en: `${k.date.en} · ${k.mode.en}${d.en}${c}` };
}
function fmtDays(n: number, lang: 'pt' | 'en'): string {
  const v = Math.round(n * 2) / 2;
  const s = String(v).replace('.', lang === 'pt' ? ',' : '.');
  return lang === 'pt' ? `${s} ${v === 1 ? 'dia' : 'dias'}` : `${s} ${v === 1 ? 'day' : 'days'}`;
}

/** Virada do mês: o mês que sai, o que entra e só 1–3 pendências que pedem o jogador (as mais urgentes). */
export function monthInfo31(o: { old: [number, number]; now: [number, number]; pend: readonly TrnPend31[] }): Month31 {
  return { old: o.old, now: o.now, items: byUrgency31(o.pend).slice(0, 3).map((p) => p.title) };
}

/** Rótulo curto do mês (para o calendário em pixel). */
export const monthShort31 = (m: number, lang: 'pt' | 'en'): string => MONTHS31[((m % 12) + 12) % 12][lang].toUpperCase();
