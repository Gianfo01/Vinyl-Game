// R31 · onda 5 (TRN) — o relógio das transições, sem DOM (a tela é um `TrnView31`; o ambiente dá hora, modo e
// "movimento reduzido"). Regras: nunca bloqueia nem atrasa a simulação (a transição só cobre a tela e, no máximo, adia
// o desenho da página nova até a cortina fechar); qualquer tecla ou clique pula; nada no estado do jogo muda.

import type { TrnMode31 } from '../../sim/r31/exp5trn';
import { phaseAt31, swapMs31, totalMs31, trnPlan31, type TrnInfo31, type TrnKind31, type TrnPhase31 } from './trn31model';

export interface TrnRun31 {
  kind: TrnKind31;
  info: TrnInfo31;
  scale: number;
  t0: number;
  swapped: boolean;
  swap?: () => void;
}
export interface TrnView31 {
  begin(r: TrnRun31): void;
  frame(r: TrnRun31, phase: TrnPhase31, p: number, ms: number): void;
  end(r: TrnRun31, skipped: boolean): void;
}
export interface TrnEnv31 {
  on(): boolean;
  mode(): TrnMode31;
  reduced(): boolean;
  /** há tela para animar (navegador de verdade) */
  live(): boolean;
  now(): number;
  /** próximo quadro */
  frame(cb: () => void): void;
  /** vigia: garante o fim mesmo sem quadros (aba escondida) */
  later(cb: () => void, ms: number): void;
}

export class TrnCtl31 {
  run: TrnRun31 | null = null;
  /** dentro da troca (a página nova está sendo desenhada): o portão deixa passar */
  inSwap = false;
  /** quantas transições animaram / foram puladas (diagnóstico e testes) */
  stats = { started: 0, skipped: 0, finished: 0 };
  constructor(private env: TrnEnv31, private view: TrnView31) {}

  /** Começa uma transição. Devolve false quando não anima (desligada, movimento reduzido, sem tela): quem chamou
   *  segue o caminho normal, e a `swap` NÃO é chamada. Com true, a `swap` roda exatamente uma vez (no meio, ou já
   *  ao pular). */
  start(kind: TrnKind31, info: TrnInfo31, swap?: () => void): boolean {
    if (this.run) this.skip();
    const plan = trnPlan31({ on: this.env.on(), mode: this.env.mode(), reduced: this.env.reduced(), live: this.env.live() });
    if (!plan.anim) return false;
    const r: TrnRun31 = { kind, info, scale: plan.scale, t0: this.env.now(), swapped: false, swap };
    this.run = r;
    this.stats.started++;
    try { this.view.begin(r); } catch { this.finish(r, true); return true; }
    this.env.frame(() => this.tick(r));
    this.watch(r, totalMs31(kind, plan.scale) + 400, totalMs31(kind, plan.scale) + 400);
    return true;
  }

  /** Vigia: sem quadros (aba escondida), termina quando o tempo da transição já passou. */
  private watch(r: TrnRun31, total: number, wait: number): void {
    this.env.later(() => {
      if (this.run !== r) return;
      if (this.env.now() - r.t0 >= total) this.skip(); else this.watch(r, total, 250);
    }, wait);
  }

  /** Avança um quadro (só a transição corrente). */
  tick(r: TrnRun31 | null = this.run): void {
    if (!r || this.run !== r) return;
    const ms = this.env.now() - r.t0;
    if (!r.swapped && ms >= swapMs31(r.kind, r.scale)) this.doSwap(r);
    if (this.run !== r) return;
    const at = phaseAt31(r.kind, ms, r.scale);
    if (at.done) { this.finish(r, false); return; }
    try { this.view.frame(r, at.phase, at.p, ms); } catch { this.skip(); return; }
    this.env.frame(() => this.tick(r));
  }

  /** Pula: troca a tela já (se faltava) e tira a transição. */
  skip(): void {
    const r = this.run;
    if (!r) return;
    this.stats.skipped++;
    this.finish(r, true);
  }

  busy(): boolean { return !!this.run; }
  /** A página nova ainda espera a cortina fechar? */
  pending(): boolean { return !!this.run && !this.run.swapped; }

  private doSwap(r: TrnRun31): void {
    if (r.swapped) return;
    r.swapped = true;
    if (!r.swap) return;
    this.inSwap = true;
    try { r.swap(); } finally { this.inSwap = false; }
  }

  private finish(r: TrnRun31, skipped: boolean): void {
    if (this.run !== r) return;
    this.doSwap(r);
    this.run = null;
    if (!skipped) this.stats.finished++;
    try { this.view.end(r, skipped); } catch { /* a tela some de qualquer jeito */ }
  }
}
