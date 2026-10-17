// R33 · INTRO33 — a rua que atravessa as épocas no navegador: canvas de pixels com escala inteira, laço leve que para
// quando a aba some ou a tela sai, "movimento reduzido" = um quadro parado. Dois usos do mesmo motor (`intro33px`):
//   · `mountHome33`: rua em loop (~40 s); hoje fora da tela inicial (o dono preferiu o vídeo de show), reaproveitável;
//   · `playIntro33`: INTRO curta da partida (~12–15 s) ao apertar "Começar minha história": o personagem criado na ficha
//     anda pela rua enquanto as épocas passam, para na época escolhida, o resumo da ficha aparece digitado e a imagem
//     escurece. Pulável com qualquer tecla ou clique. Nada aqui lê ou muda a partida.
import { Px } from '../pixel/px';
import { h } from '../dom';
import { store } from '../store';
import { intro33On } from '../../sim/r33/intro33sw';
import '../r31/ini5sw'; // guarda dos interruptores de interface (o valor mora no navegador)
import { randomLook } from '../pixel/avatar';
import type { Appearance } from '../../sim/types';
import { ROOFLINE33, Y_WALK, YB33, L33, buildSky33, buildWorld33, frame33, homeState33, intro33Plan, introState33, stillHome33, yearAt33, type Hero33, type Intro33Plan, type Sky33, type State33, type World33 } from './intro33px';
import './intro33.css';

export { intro33On };
export const HOME_MS33 = 40000;
const FRAME_MS = 33; // ~30 quadros por segundo: o suficiente para o passo de pixel e leve para o menu

export const reducedMotion33 = (): boolean => {
  try { return !!store.prefs.reducedMotion || document.documentElement.classList.contains('reduced-motion') || matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
};

/** Gancho de teste: com `?i33dev` na URL a página ganha `__i33` (saltar no tempo do fundo) e `__i33play` (tocar a intro). */
const dev33 = (): boolean => { try { return /[?&]i33dev\b/.test(location.search); } catch { return false; } };
const worlds = new Map<string, World33>();
let sky: Sky33 | null = null;
/** O mundo é desenhado uma vez por língua (fica na memória: voltar à tela inicial não redesenha). */
function worldOf(lang: 'pt' | 'en'): { w: World33; sky: Sky33 } {
  let w = worlds.get(lang);
  if (!w) { w = buildWorld33(lang); worlds.set(lang, w); }
  return { w, sky: (sky ??= buildSky33()) };
}

interface Street33Opts {
  mode: 'home' | 'intro';
  lang: 'pt' | 'en';
  /** intro: ano da partida, aparência do personagem */
  year?: number;
  look?: Appearance;
  /** intro: cada quadro (ms desde o início), para o texto digitado e o fim */
  onTick?: (ms: number, plan: Intro33Plan) => void;
  logo?: Px | null;
}

/** Canvas + laço. `still` = um quadro só (movimento reduzido). */
class Street33 {
  readonly el = document.createElement('canvas');
  private ctx = this.el.getContext('2d', { alpha: false })!;
  private out = new Px(1, 1);
  private img: ImageData = new ImageData(1, 1);
  private d32 = new Uint32Array(1);
  W = 0; H = 0; k = 1;
  private raf = 0; private last = 0; elapsed = 0;
  private still = false;
  private io: IntersectionObserver | null = null;
  private world: World33; private sky: Sky33;
  readonly plan: Intro33Plan | null;
  private onVis = () => { if (document.hidden) this.pause(); else this.resume(); };
  private onSize = () => { this.layout(); this.draw(); };

  constructor(private o: Street33Opts, cls: string) {
    this.el.className = cls;
    this.el.setAttribute('aria-hidden', 'true');
    const ws = worldOf(o.lang);
    this.world = ws.w; this.sky = ws.sky;
    this.plan = o.mode === 'intro' ? intro33Plan(o.year ?? 1962) : null;
    this.still = reducedMotion33();
    this.layout();
    this.draw();
  }
  /** Escala inteira: cada pixel lógico vira k×k pixels da tela (nunca fração). */
  layout(): void {
    const vw = Math.max(320, window.innerWidth), vh = Math.max(240, window.innerHeight);
    this.k = Math.max(2, Math.round(vh / 270));
    this.W = Math.min(1600, Math.ceil(vw / this.k)); this.H = Math.ceil(vh / this.k);
    this.el.width = this.W; this.el.height = this.H;
    this.el.style.width = `${this.W * this.k}px`; this.el.style.height = `${this.H * this.k}px`;
    this.el.style.left = `${Math.round((vw - this.W * this.k) / 2)}px`;
    this.out = new Px(this.W, this.H);
    this.img = this.ctx.createImageData(this.W, this.H);
    this.d32 = new Uint32Array(this.img.data.buffer);
  }
  /** onde está a linha 0 do mundo na tela (linhas lógicas) */
  get y0(): number { return this.o.mode === 'home' ? Math.round(0.34 * this.H) - ROOFLINE33 : Math.round(0.56 * this.H) - Y_WALK; }
  /** topo do que importa (placas e torres acima dos telhados), em linhas lógicas — o título não passa daqui */
  signTop = (): number => this.y0 + ROOFLINE33 - 20; // as placas de telhado e o topo das torres de vidro ficam abaixo do título
  floorY = (): number => this.y0 + YB33 + L33;
  stateAt(ms: number): State33 & { hero?: number; walking?: boolean } {
    if (this.o.mode === 'home') {
      if (this.still) return stillHome33(this.W); // quadro parado: a rua acesa até o palco de 1975
      return homeState33((ms % HOME_MS33) / HOME_MS33, this.W);
    }
    const p = this.plan!;
    if (this.still) return introState33(p.walkMs + 3000, this.W, p);
    return introState33(ms, this.W, p);
  }
  draw(): void {
    const ms = this.elapsed, st = this.stateAt(ms), t = this.still ? 0 : ms / 1000;
    let hero: Hero33 | null = null, yearTag: number | null = null;
    if (this.o.mode === 'intro' && this.o.look && this.plan) {
      const s = st as State33 & { hero: number; walking: boolean }, p = this.plan, Y = this.o.year ?? 1962;
      const endYear = yearAt33(p.end), near = Math.max(0, Math.min(1, (s.hero - (p.end - 130)) / 130));
      yearTag = Math.round(yearAt33(s.hero) + (Y - endYear) * near * near * (3 - 2 * near));
      if (s.hero >= p.end - 0.5) yearTag = Y;
      hero = { x: s.hero, look: this.o.look, year: yearTag, walking: s.walking, stride: s.hero / 6.5 };
    }
    frame33(this.world, this.sky, this.out, { W: this.W, H: this.H, cam: st.cam, y0: this.y0 }, { t, state: st, hero, yearTag, logo: this.o.logo ?? null });
    this.d32.set(this.out.d);
    this.ctx.putImageData(this.img, 0, 0);
  }
  private tick = (now: number): void => {
    this.raf = requestAnimationFrame(this.tick);
    if (!this.el.isConnected) { this.stop(); return; }
    if (this.last === 0) this.last = now;
    if (now - this.last < FRAME_MS) return;
    this.elapsed += Math.min(100, now - this.last);
    this.last = now;
    this.draw();
    if (this.plan && this.o.onTick) this.o.onTick(this.elapsed, this.plan);
  };
  start(): void {
    window.addEventListener('resize', this.onSize);
    document.addEventListener('visibilitychange', this.onVis);
    // vale o último aviso do observador (o primeiro pode vir antes de o canvas entrar na página)
    try { this.io = new IntersectionObserver((e) => { if (e[e.length - 1]?.isIntersecting) this.resume(); else this.pause(); }); this.io.observe(this.el); } catch { /* sem observador */ }
    if (!this.still) this.resume();
  }
  /** salta para o instante `ms` (só para prints e testes) */
  seek(ms: number): void { this.elapsed = ms; this.draw(); if (this.plan && this.o.onTick) this.o.onTick(ms, this.plan); }
  resume(): void { if (this.raf || this.still || document.hidden) return; this.last = 0; this.raf = requestAnimationFrame(this.tick); }
  pause(): void { if (this.raf) cancelAnimationFrame(this.raf); this.raf = 0; }
  stop(): void {
    this.pause();
    window.removeEventListener('resize', this.onSize);
    document.removeEventListener('visibilitychange', this.onVis);
    this.io?.disconnect(); this.io = null;
  }
}

/** Fundo animado da tela inicial (interface igual à do palco, para o título se ajustar: `signTop` e `floorY` em linhas lógicas). */
export function mountHome33(lang: 'pt' | 'en', cls = 'h5-live-cv'): { el: HTMLCanvasElement; signTop: () => number; floorY: () => number; stop: () => void } {
  const s = new Street33({ mode: 'home', lang }, cls);
  s.start();
  if (dev33()) { const g = window as unknown as { __i33?: { seek: (ms: number) => void; pause: () => void } }; g.__i33 = { seek: (ms) => { s.pause(); s.seek(ms); }, pause: () => s.pause() }; }
  return { el: s.el, signTop: s.signTop, floorY: s.floorY, stop: () => s.stop() };
}

export interface IntroInfo33 {
  /** nome do personagem (pode estar vazio) */
  name: string;
  /** resumo da ficha, já na língua certa */
  line: string;
  year: number;
  look: Appearance;
  lang: 'pt' | 'en';
  /** logo MASTERS em Px (opcional: aparece no fim, antes de escurecer) */
  logo?: Px | null;
}

/** Intro da partida em tela cheia. `done` é chamado uma vez (fim, tecla, clique ou "Continuar"). */
export function playIntro33(info: IntroInfo33, done: () => void): void {
  let finished = false;
  const root = h('div', { class: 'i33', role: 'dialog', 'aria-label': info.lang === 'en' ? 'Your story begins' : 'Sua história começa' });
  const name = h('b', { class: 'i33-name' }, info.name || '');
  const txt = h('p', { class: 'i33-txt' }, '');
  const go = h('button', { type: 'button', class: 'i33-go', hidden: true }, info.lang === 'en' ? 'CONTINUE' : 'CONTINUAR') as HTMLButtonElement;
  const panel = h('div', { class: 'i33-panel' }, info.name ? name : null, txt, go);
  panel.style.opacity = '0';
  let street: Street33 | null = null, rk: ((e: KeyboardEvent) => void) | null = null;
  const finish = (): void => {
    if (finished) return;
    finished = true;
    street?.stop();
    window.removeEventListener('keydown', skip, true);
    if (rk) window.removeEventListener('keydown', rk, true);
    root.removeEventListener('pointerdown', skip);
    root.classList.add('out');
    window.setTimeout(() => { root.remove(); done(); }, 220);
  };
  function skip(e: Event): void {
    if (e.type === 'keydown') { const k = e as KeyboardEvent; if (k.key === 'Tab' || k.ctrlKey || k.metaKey || k.altKey || /^F\d+$/.test(k.key)) return; } // atalhos do navegador seguem funcionando
    e.preventDefault(); e.stopPropagation(); finish();
  }
  const cps = Math.max(34, info.line.length / 3.6); // o texto inteiro aparece em ~3,6 s
  street = new Street33({
    mode: 'intro', lang: info.lang, year: info.year, look: info.look, logo: info.logo ?? null,
    onTick: (ms, plan) => {
      const tt = (ms - plan.walkMs - 500) / 1000;
      if (tt > 0) { panel.style.opacity = '1'; txt.textContent = info.line.slice(0, Math.min(info.line.length, Math.floor(tt * cps))); }
      if (ms >= plan.totalMs) finish();
    },
  }, 'i33-cv');
  if (dev33()) (window as unknown as { __i33s?: Street33 }).__i33s = street;
  root.append(street.el, panel);
  document.body.append(root);
  street.start();
  if (reducedMotion33()) { // quadro final parado, resumo inteiro e um botão
    panel.style.opacity = '1'; txt.textContent = info.line; go.hidden = false; go.onclick = finish;
    window.setTimeout(() => go.focus(), 0);
    rk = (e) => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') skip(e); };
    window.addEventListener('keydown', rk, true);
    return;
  }
  window.addEventListener('keydown', skip, true);
  root.addEventListener('pointerdown', skip);
}

if (dev33()) {
  (window as unknown as { __i33play: (year: number, name: string, line: string, hold?: number) => void }).__i33play = (year, name, line, hold) => {
    const info: IntroInfo33 = { name, line, year, look: randomLook('i33dev'), lang: store.prefs.lang === 'en' ? 'en' : 'pt' };
    playIntro33(info, () => undefined);
    if (hold !== undefined) { const st = (window as unknown as { __i33s?: Street33 }).__i33s; st?.pause(); st?.seek(hold); }
  };
}
