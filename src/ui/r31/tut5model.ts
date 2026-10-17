// R31 · onda 5 (TUT, EXP-12) — MOTOR do tutorial guiado, sem DOM (testes em tests/r31-tut5.test.ts).
// O roteiro é dado (tut5data.ts): capítulos de passos, cada passo com ALVO (objeto de objects5, botão de viagem,
// botão da casca, papel aberto, cena da região ou tecla de keys5), FALA bilíngue do mentor, o que fica LIBERADO além do
// alvo e a condição de CONCLUÍDO (sobre o estado ou a navegação). "Fazer, não ler": só passos puramente explicativos
// têm "Entendi" (`ack`). O motor só lê o mundo; escreve apenas o progresso do tutorial (sim/r31/tut5.ts, no save).

import { l, type L } from '../../data/world';
import type { Act, GameState } from '../../sim/types';
import { monthIndex } from '../../sim/capacity';
import { energyLeft } from '../../sim/sys/life';
import { ownerCity } from '../../sim/sys/mapx8';
import { careers } from '../../sim/sys/careers12';
import { endTut5, tut5Of, type Tut5 } from '../../sim/r31/tut5';
import { pocketIds5 } from '../../sim/r31/exp5';
import { key5, type Region5 } from './keys5';
import { REGIONS5 } from './nav5';
import { object5, regionOf5 } from './objects5';

/** Botões e áreas fixas da casca (shell5.ts) que podem ser alvo. */
export const SHELL5 = ['advance', 'date', 'cash', 'fame', 'help', 'helpbox', 'pause', 'pin', 'recados', 'pocket'] as const;
export type Shell5Id = typeof SHELL5[number];

export type Tgt5 =
  | { obj: string }
  | { travel: Region5 }
  | { shell: Shell5Id }
  | { paper: true }
  | { region: Region5 }
  | { key: string };

/** O que a casca está mostrando (só interface). `card` = cartão de ações ao lado do objeto (EXP-13, acoes5.ts); `paper` = o papel
 *  inteiro ("ver tudo ▸"). O alvo `{ paper: true }` vale para os dois: "o que o objeto abriu". */
export interface View5 { region: Region5; paper?: string; card?: string; marker?: string; pause: boolean; help: boolean }
/** O objeto `id` está aberto (cartão de ações ou papel)? */
export const opened5 = (v: View5, id: string): boolean => v.paper === id || v.card === id;
/** Nada aberto por cima da cena. */
export const bare5 = (v: View5): boolean => !v.paper && !v.card;
export const VIEW0: View5 = { region: 'sede', pause: false, help: false };

/** Contexto das condições: o mundo, a tela, o retrato do começo do passo e a banda roteirizada. */
export interface Cx5 { s: GameState; v: View5; b: Record<string, number>; band?: Act; t: Tut5 }

/** Ação que o passo pede (o robô do teste faz exatamente isto; a interface só usa para a dica de tecla). */
export type Do5 = { open: string } | { travel: Region5 } | { shell: Shell5Id } | { key: string } | { bot: string } | { ack: true };

export interface Step5 {
  id: string;
  say: L;
  target: Tgt5;
  /** liberado além do alvo (ex.: o papel inteiro enquanto o alvo é um botão dele) */
  free?: Tgt5[];
  /** concluído quando… (passos `ack` concluem no "Entendi") */
  done?: (c: Cx5) => boolean;
  ack?: true;
  do: Do5;
}
export interface Chapter5 { id: string; title: L; mins: number; steps: Step5[]; career?: string }

// ---------------------------------------------------------------- retrato do começo do passo

export function snap5(s: GameState): Record<string, number> {
  const band = bandOf(s);
  return {
    t: monthIndex(s),
    cash: s.player.cash,
    pocket: pocketIds5(s).length,
    energy: energyLeft(s),
    tours: s.tours?.length ?? 0,
    plans: s.plans.length,
    sessions: s.sessions.length,
    rel: Object.keys(s.releases).length + s.pendingReleases.length,
    city: hashCity(ownerCity(s)),
    signed: band?.owner === 'player' ? 1 : 0,
  };
}
const hashCity = (c: string): number => [...c].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) | 0, 7);
export const cityHash5 = hashCity;
const bandOf = (s: GameState): Act | undefined => { const id = tut5Of(s)?.band; return id ? s.acts[id] : undefined; };

// ---------------------------------------------------------------- roteiro

let SCRIPT: Chapter5[] = [];
let EXTRA: Record<string, Chapter5> = {};
/** O arquivo de dados registra o roteiro (12 capítulos) e os capítulos extras por carreira. */
export function setScript5(main: Chapter5[], extra: Record<string, Chapter5>): void { SCRIPT = main; EXTRA = extra; }
export const extraOf5 = (career: string): Chapter5 | undefined => EXTRA[career];
export const extras5 = (): Chapter5[] => Object.values(EXTRA);
export const mainCareer5 = (s: GameState): string => careers(s).active[0] ?? 'label';
/** Capítulos desta partida: os 12 + o extra da carreira principal (quando existe). */
export function script5(s: GameState): Chapter5[] {
  const t = tut5Of(s);
  const c = t?.extra ?? mainCareer5(s);
  const x = EXTRA[c];
  return x ? [...SCRIPT, x] : [...SCRIPT];
}
export const chapters5 = (): Chapter5[] => [...SCRIPT];

export interface Cur5 { ch: Chapter5; step: Step5; ci: number; si: number; of: number }
/** Capítulo e passo atuais (undefined = sem tutorial ou terminado). */
export function cur5(s: GameState): Cur5 | undefined {
  const t = tut5Of(s);
  if (!t || t.end) return undefined;
  const sc = script5(s);
  const ch = sc[t.ch];
  const step = ch?.steps[t.st];
  return ch && step ? { ch, step, ci: t.ch, si: t.st, of: sc.length } : undefined;
}

function enter(s: GameState, t: Tut5): void {
  t.base = snap5(s);
  if (!t.extra) t.extra = mainCareer5(s);
}
function nextStep(s: GameState, t: Tut5): void {
  const sc = script5(s);
  const ch = sc[t.ch];
  if (ch && t.st + 1 < ch.steps.length) { t.st++; enter(s, t); return; }
  if (ch && !t.done.includes(ch.id) && !t.skip.includes(ch.id)) t.done.push(ch.id);
  t.ch++; t.st = 0;
  if (t.ch >= sc.length) { endTut5(s, 'diploma'); return; }
  enter(s, t);
}

/** Confere o passo atual contra o estado e a tela; conclui quantos passos já estiverem feitos. Devolve se mudou. */
export function tick5(s: GameState, v: View5): boolean {
  const t = tut5Of(s);
  if (!t || t.end) return false;
  if (!t.base) enter(s, t);
  let changed = false;
  for (let i = 0; i < 64; i++) {
    const c = cur5(s);
    if (!c) break;
    if (c.step.ack || !c.step.done) break;
    let ok = false;
    try { ok = c.step.done({ s, v, b: t.base ?? snap5(s), band: bandOf(s), t }); } catch { ok = false; }
    if (!ok) break;
    nextStep(s, t);
    changed = true;
  }
  return changed;
}
/** "Entendi" num passo explicativo. */
export function ack5(s: GameState, v: View5): boolean {
  const c = cur5(s);
  const t = tut5Of(s);
  if (!c || !t || !c.step.ack) return false;
  nextStep(s, t);
  tick5(s, v);
  return true;
}
/** Esc › "Pular este capítulo". */
export function skipChapter5(s: GameState, v: View5): boolean {
  const c = cur5(s);
  const t = tut5Of(s);
  if (!c || !t) return false;
  if (!t.skip.includes(c.ch.id)) t.skip.push(c.ch.id);
  t.st = c.ch.steps.length - 1;
  nextStep(s, t);
  tick5(s, v);
  return true;
}
/** Esc › "Sair do tutorial". */
export function exit5(s: GameState): void { endTut5(s, 'exit'); }

// ---------------------------------------------------------------- o que fica liberado

/** O que o jogador tentou: clicar num objeto, botão de viagem/casca, dentro do papel, na cena, ou fora de tudo. */
export type Hit5 = Tgt5 | { other: string };

const same = (a: Tgt5, h: Hit5): boolean => {
  if ('obj' in a) return 'obj' in h && h.obj === a.obj;
  if ('travel' in a) return 'travel' in h && h.travel === a.travel;
  if ('shell' in a) return 'shell' in h && h.shell === a.shell;
  if ('paper' in a) return 'paper' in h;
  if ('region' in a) return ('region' in h && h.region === a.region) || ('obj' in h && !!object5(h.obj) && regionOf5(object5(h.obj)!.place) === a.region && !object5(h.obj)!.career);
  if ('key' in a) return 'key' in h && h.key === a.key;
  return false;
};
/** Pode? Modo dica libera tudo; guiado só o alvo e o que o passo libera. Sem passo (terminado): tudo. */
export function allows5(s: GameState, h: Hit5): boolean {
  const t = tut5Of(s);
  const c = cur5(s);
  if (!t || !c || t.mode === 'hint') return true;
  return [c.step.target, ...(c.step.free ?? [])].some((x) => same(x, h));
}

/** Tecla (formato de keys5) que leva ao alvo, quando o alvo tem uma. */
export function keyOf5(t: Tgt5): string | undefined {
  if ('obj' in t) { const o = object5(t.obj); return key5(`obj:${t.obj}`)?.chord ?? (o?.keyRef ? key5(o.keyRef)?.chord : undefined); }
  if ('travel' in t) return key5(`travel:${t.travel}`)?.chord;
  if ('key' in t) return key5(t.key)?.chord;
  if ('shell' in t) return t.shell === 'advance' ? key5('sys:advance')?.chord : t.shell === 'help' ? key5('sys:keys')?.chord : undefined;
  return undefined;
}
/** A tecla `chord` é permitida agora? (a do alvo ou a de algo liberado; modo dica: todas) */
export function keyAllows5(s: GameState, chord: string): boolean {
  const t = tut5Of(s);
  const c = cur5(s);
  if (!t || !c || t.mode === 'hint') return true;
  return [c.step.target, ...(c.step.free ?? [])].some((x) => keyOf5(x) === chord);
}

// ---------------------------------------------------------------- todo alvo existe

/** O alvo aponta para algo que existe (objeto registrado, região, botão da casca, tecla do mapa). */
export function validTarget5(t: Tgt5): boolean {
  if ('obj' in t) return !!object5(t.obj);
  if ('travel' in t) return REGIONS5.includes(t.travel);
  if ('region' in t) return REGIONS5.includes(t.region);
  if ('shell' in t) return (SHELL5 as readonly string[]).includes(t.shell);
  if ('key' in t) return !!key5(t.key);
  return 'paper' in t;
}

/** Texto do passo com os nomes do mentor e da banda. */
export function say5(step: Step5, vars: { m: string; b: string; k: string }): L {
  const f = (x: string) => x.replace(/\{m\}/g, vars.m).replace(/\{b\}/g, vars.b).replace(/\{k\}/g, vars.k);
  return l(f(step.say.pt), f(step.say.en));
}
