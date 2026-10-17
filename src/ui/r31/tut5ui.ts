// R31 · onda 5 (TUT, EXP-12) — A CAMADA do tutorial guiado por cima da casca (só com exp5.nav e um tutorial nesta partida):
//  - FOCO: a tela escurece e só o alvo fica recortado, com o contorno "aceso" (o mesmo dourado dos objetos acesos);
//  - o MENTOR DA ÉPOCA fala num balão em pixel art (tut5px.ts); clique ou tecla fora do alvo não faz nada (mostra
//    "primeiro aqui" e um tremor leve no alvo, sem tremor com movimento reduzido); Esc abre "Pular este capítulo / Sair";
//  - acessível: o balão é um diálogo com texto vivo para leitor de tela, o foco vai para o alvo, tudo por teclado;
//  - MODO DICA (veteranos): o alvo acende sem escurecer nem bloquear;
//  - fim: DIPLOMA em pixel art; o mentor fica no telefone para dicas até ser dispensado.
// A camada não muda o mundo: só lê, conclui passos (progresso no save) e repassa os cliques permitidos.

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import type { GameState } from '../../sim/types';
import { pendingList } from '../../sim/r31/pending';
import { dismissMentor5, startTut5, tut5Of, tutHint5, type Tut5 } from '../../sim/r31/tut5';
import { h } from '../dom';
import { store } from '../store';
import { chordLabel5, chordOf5 } from './keys5';
import { goto5, type GotoIn5 } from './nav5';
import { object5 } from './objects5';
import { SH5 } from './shell5';
import { bubbleCanvas5, diplomaCanvas5, mentor5, mentorCanvas5, phoneCanvas5 } from './tut5px';
import './tut5data';
import { VIEW0, ack5, cur5, exit5, keyAllows5, keyOf5, say5, skipChapter5, tick5, type Tgt5, type View5 } from './tut5model';
import './tut5.css';

/** Estado só de interface (não vai para o save). */
const UI5: { menu: boolean; nudge: number; phone: boolean; lastKey: string } = { menu: false, nudge: 0, phone: false, lastKey: '' };
let RERENDER: () => void = () => undefined;
const game = (): GameState | null => store.game ?? null;

/** O que a casca mostra agora (cartão de ações do EXP-13 lido do DOM, quando existir). */
export function view5(): View5 {
  const card = typeof document !== 'undefined' ? document.querySelector<HTMLElement>('.ac5[data-card]')?.dataset.card : undefined; // cartão de ações (ACOES5)
  return { ...VIEW0, region: SH5.region, paper: SH5.paper?.obj, marker: SH5.paper?.marker.area, card, pause: SH5.pause, help: SH5.help };
}

// ---------------------------------------------------------------- alvo → elemento da tela

const SHELL_SEL: Record<string, string> = {
  advance: '.t5-go', date: '[data-t5="date"]', cash: '[data-t5="cash"]', fame: '[data-t5="fame"]', help: '[data-t5="help"]', helpbox: '.hk5',
  pause: '[data-t5="pause"]', pin: '.b5-pin', recados: '.rc5', pocket: '.b5-pocket',
};
export function selOf5(x: Tgt5): string {
  if ('obj' in x) return `[data-obj="${x.obj}"]`;
  if ('travel' in x) return `.b5-tr[data-travel="${x.travel}"]`;
  if ('shell' in x) return SHELL_SEL[x.shell] ?? '.t5';
  if ('paper' in x) return '.ac5, .p5';
  if ('region' in x) return `.reg5-${x.region}`;
  return '.t5';
}
/** Elementos do alvo na tela. Objeto guardado na lista de uma sala (menu fechado) = o botão da sala com a lista. */
const elsOf = (x: Tgt5): HTMLElement[] => [...document.querySelectorAll<HTMLElement>(selOf5(x))]
  .filter((e) => !e.closest('.tu5'))
  .map((e) => (e.closest('.s5-pop[hidden]') ? e.closest<HTMLElement>('.s5-roomw') ?? e : e))
  .filter((e, i, a) => a.indexOf(e) === i)
  // objeto da cena coberto por um papel aberto: conta como fora da tela (vale a tecla dele)
  .filter((e) => !('obj' in x) || !document.querySelector('.p5') || !!e.closest('.p5'));
/** Elementos liberados agora (alvo + o que o passo libera). Vazio = alvo ainda não está na tela. */
function allowedEls(s: GameState): { target: HTMLElement | null; all: HTMLElement[] } {
  const c = cur5(s);
  if (!c) return { target: null, all: [] };
  const target = elsOf(c.step.target)[0] ?? null;
  const all = [c.step.target, ...(c.step.free ?? [])].flatMap(elsOf);
  return { target, all };
}
/** Diálogos do próprio jogo (contrato, confirmação) e avisos: sempre liberados — são o meio de fazer a ação. */
const ALWAYS = '.tu5-ui, .overlay, .modal, #toasts, .toast, .scene-overlay, .tour18, [aria-modal="true"]:not(.pz5)';

const guided = (s: GameState | null): s is GameState => {
  const tt = s ? tut5Of(s) : undefined;
  return !!s && !!tt && !tt.end && tt.mode === 'guided' && !!document.querySelector('.app5');
};

// ---------------------------------------------------------------- bloqueio de clique e tecla (uma vez)

let installed = false;
function install(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  const block = (e: Event) => {
    const s = game();
    if (!guided(s) || UI5.menu) return;
    const el = e.target as HTMLElement | null;
    if (!el || el.closest(ALWAYS)) return;
    const { all } = allowedEls(s);
    if (all.some((a) => a.contains(el))) return; // alvo fora da tela (outro lugar): a tecla dele e o que o passo libera
    e.preventDefault(); e.stopImmediatePropagation();
    if (e.type === 'click') nudge();
  };
  for (const ev of ['pointerdown', 'mousedown', 'click', 'dblclick', 'contextmenu']) window.addEventListener(ev, block, true);
  window.addEventListener('keydown', (e) => {
    const s = game();
    if (!guided(s)) return;
    if (e.key === 'Escape') {
      if (document.querySelector('.overlay, .scene-overlay, .tour18')) return; // diálogo ou cena do jogo aberto: Esc é dele
      e.preventDefault(); e.stopImmediatePropagation();
      UI5.menu = !UI5.menu; RERENDER();
      return;
    }
    if (UI5.menu) return;
    const tgt = e.target as HTMLElement | null;
    if (tgt?.closest(ALWAYS)) return;
    const typing = !!tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA' || tgt.tagName === 'SELECT');
    const { all } = allowedEls(s);
    const inside = !!tgt && all.some((a) => a.contains(tgt));
    if (typing && inside) return;
    if (['Tab', 'Enter', ' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Shift', 'Alt'].includes(e.key) && (inside || e.key === 'Tab' || e.key === 'Shift' || e.key === 'Alt')) return;
    if (keyAllows5(s, chordOf5(e))) return;
    e.preventDefault(); e.stopImmediatePropagation();
    nudge();
  }, true);
}

function nudge(): void {
  UI5.nudge = Date.now();
  const ring = document.querySelector<HTMLElement>('.tu5-ring');
  const tag = document.querySelector<HTMLElement>('.tu5-here');
  if (ring) { ring.classList.remove('shake'); void ring.offsetWidth; ring.classList.add('shake'); }
  if (tag) { tag.hidden = false; setTimeout(() => { tag.hidden = true; }, 1600); }
  const live = document.getElementById('sr-live');
  if (live) live.textContent = t(l('Primeiro aqui: siga o que o mentor pediu.', 'First here: do what the mentor asked.'));
}

// ---------------------------------------------------------------- posição do recorte (rAF enquanto montado)

function follow(root: HTMLElement): void {
  const dims = [...root.querySelectorAll<HTMLElement>('.tu5-dim')];
  /** Escurece tudo menos o retângulo (4 painéis em volta do alvo; sem alvo, a tela toda). */
  const cut = (x: number, y: number, w: number, hh: number) => {
    if (dims.length !== 4) return;
    const W = window.innerWidth, H = window.innerHeight;
    const [t, b, l, r] = dims;
    const px = (n: number) => `${Math.max(0, n)}px`;
    Object.assign(t.style, { left: '0px', top: '0px', width: px(W), height: px(y) });
    Object.assign(b.style, { left: '0px', top: px(y + hh), width: px(W), height: px(H - y - hh) });
    Object.assign(l.style, { left: '0px', top: px(y), width: px(x), height: px(hh) });
    Object.assign(r.style, { left: px(x + w), top: px(y), width: px(W - x - w), height: px(hh) });
  };
  const ring = root.querySelector<HTMLElement>('.tu5-ring');
  const here = root.querySelector<HTMLElement>('.tu5-here');
  const box = root.querySelector<HTMLElement>('.tu5-box');
  let lastFocus = '';
  const step = () => {
    if (!root.isConnected) return;
    const s = game();
    const c = s ? cur5(s) : undefined;
    // alvo fora da tela: acende o que o passo libera (ex.: o cartão de ações já aberto)
    const el = c ? elsOf(c.step.target)[0] ?? (c.step.free ?? []).flatMap(elsOf)[0] : undefined;
    if (el && ring) {
      const r = el.getBoundingClientRect();
      const pad = 4;
      ring.hidden = false; ring.style.left = `${r.left - pad}px`; ring.style.top = `${r.top - pad}px`; ring.style.width = `${r.width + pad * 2}px`; ring.style.height = `${r.height + pad * 2}px`;
      cut(r.left - pad, r.top - pad, r.width + pad * 2, r.height + pad * 2);
      if (here) { here.style.left = `${r.left}px`; here.style.top = `${Math.max(4, r.top - 26)}px`; }
      // balão longe do alvo: canto de baixo à esquerda, ou em cima à direita se o alvo estiver lá embaixo à esquerda;
      // alvo grande (papel, cena inteira): o balão desce para cima da barra de viagem (que fica bloqueada mesmo)
      const big = r.width * r.height > window.innerWidth * window.innerHeight * 0.35;
      if (box) { box.classList.toggle('low', big); box.classList.toggle('top', !big && r.left < window.innerWidth * 0.45 && r.bottom > window.innerHeight * 0.55); }
      const k = `${c!.ch.id}/${c!.step.id}`;
      if (k !== lastFocus) { lastFocus = k; if (!el.contains(document.activeElement) && !document.activeElement?.closest('.tu5-ui')) { (el.matches('button, a, input, [tabindex]') ? el : el.querySelector<HTMLElement>('button, a, input, [tabindex]'))?.focus({ preventScroll: false }); } }
    } else {
      // alvo fora da tela (objeto de outro lugar): tudo escuro e a tecla dele no balão
      cut(0, window.innerHeight, 0, 0);
      if (ring) ring.hidden = true;
      if (box) { box.classList.remove('top'); box.classList.remove('low'); }
    }
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// ---------------------------------------------------------------- balão do mentor

/** Nome do mentor como nó de texto cru: o filtro "Nomes e obras reais" não troca personagem do tutorial (ex.: "Celeste"
 *  também é nome de artista real). Devolve as partes do texto com cada ocorrência de `names` protegida. */
function nm(text: string, ...names: string[]): (string | Text)[] {
  const ns = names.filter(Boolean).sort((a, b) => b.length - a.length);
  const out: (string | Text)[] = [];
  let rest = text;
  for (let guard = 0; guard < 20 && rest; guard++) {
    let at = -1, hit = '';
    for (const n of ns) { const i = rest.indexOf(n); if (i >= 0 && (at < 0 || i < at)) { at = i; hit = n; } }
    if (at < 0) break;
    if (at > 0) out.push(rest.slice(0, at));
    out.push(document.createTextNode(hit));
    rest = rest.slice(at + hit.length);
  }
  if (rest) out.push(rest);
  return out;
}
const short5 = (name: string): string => { const w = name.split(' '); return w[0] === 'Seu' || w[0] === 'Dona' ? w.slice(0, 2).join(' ') : w[0]; };

function mentorBox(s: GameState, title: string, body: L, kids: (HTMLElement | null)[], o: { live?: boolean; cls?: string } = {}): HTMLElement {
  const m = mentor5(s.year);
  const face = mentorCanvas5(s.year, 3); face.className = 'tu5-mentor px'; face.setAttribute('aria-hidden', 'true');
  const bub = h('div', { class: 'tu5-bub' },
    h('canvas', { class: 'tu5-bubcv px', 'aria-hidden': 'true' }),
    h('p', { class: 'tu5-who' }, h('b', null, ...nm(m.name, m.name)), ` · ${t(m.role)}`),
    title ? h('h2', { class: 'tu5-t' }, title) : null,
    h('p', { class: 'tu5-say', 'aria-live': o.live === false ? undefined : 'polite' }, ...nm(t(body), m.name, short5(m.name))),
    h('div', { class: 'tu5-acts' }, ...kids));
  const el = h('div', { class: `tu5-box tu5-ui ${o.cls ?? ''}`, role: 'dialog' }, face, bub);
  el.setAttribute('aria-label', `${m.name}: ${t(l('tutorial', 'tutorial'))}`);
  // moldura do balão em pixel (redesenha no tamanho do texto, também quando ele muda)
  let last = '';
  const paint = () => {
    const cv = bub.querySelector<HTMLCanvasElement>('.tu5-bubcv');
    if (!cv || !bub.isConnected) return;
    const r = bub.getBoundingClientRect();
    const k = `${Math.round(r.width)}x${Math.round(r.height)}`;
    if (k === last || r.width < 20) return;
    last = k;
    // a ficha ocupa a altura toda menos o rabicho (9 px × 2); a largura menos a sombra (3 px × 2)
    const src = bubbleCanvas5(Math.round(r.width / 2) - 3, Math.round(r.height / 2) - 9, s.year, 'left', 2);
    cv.width = src.width; cv.height = src.height;
    const g = cv.getContext('2d'); if (g) { g.imageSmoothingEnabled = false; g.clearRect(0, 0, cv.width, cv.height); g.drawImage(src, 0, 0); }
  };
  queueMicrotask(paint);
  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(() => { if (!bub.isConnected) { ro.disconnect(); return; } paint(); });
    queueMicrotask(() => ro.observe(bub));
  }
  return el;
}
const btn = (label: L, on: () => void, cls = ''): HTMLElement => h('button', { type: 'button', class: `tu5-b ${cls}`, onclick: on }, t(label));

// ---------------------------------------------------------------- diploma e telefone

function diploma(s: GameState, tt: Tut5): HTMLElement {
  const m = mentor5(s.year);
  const cv = diplomaCanvas5(s.year, 3); cv.className = 'tu5-dipcv px'; cv.setAttribute('aria-hidden', 'true');
  const close = () => { (tt as Tut5 & { dip?: 1 }).dip = 1; RERENDER(); };
  return h('div', { class: 'tu5-dipback tu5-ui' },
    h('div', { class: 'tu5-dip', role: 'dialog', 'aria-modal': 'true', 'aria-label': t(l('Diploma', 'Diploma')) },
      cv,
      h('div', { class: 'tu5-diptx' },
        h('h1', null, t(l('DIPLOMA', 'DIPLOMA'))),
        h('p', null, t(l('Certifico que', 'This certifies that')), ' ', h('b', null, s.config.companyName || t(l('o seu selo', 'your label'))), ' ',
          t(l('aprendeu o ofício: sede, contratos, gravação, lançamento, cidade, mundo e casa.', 'has learned the trade: HQ, contracts, recording, release, city, world and home.'))),
        h('p', { class: 'tu5-dipsm' }, t(l('{n} capítulos concluídos · {y}', '{n} chapters completed · {y}'), { n: tt.done.length, y: s.year })),
        h('p', { class: 'tu5-sign' }, h('span', null, ...nm(m.name, m.name)), h('small', null, t(m.role)))),
      h('p', { class: 'tu5-dipnote' }, ...nm(t(l('A partida segue livre neste mesmo save. {m} fica no {p} para dicas.', 'The run continues freely in this same save. {m} stays on the {p} for tips.'), { m: m.name, p: t(m.phone) }), m.name)),
      h('button', { type: 'button', class: 'tu5-b main', onclick: close }, t(l('Continuar jogando', 'Keep playing')))));
}

function phone(s: GameState): HTMLElement {
  const m = mentor5(s.year);
  const chip = h('button', { type: 'button', class: 'tu5-phone tu5-ui', 'aria-expanded': UI5.phone ? 'true' : 'false',
    onclick: () => { UI5.phone = !UI5.phone; RERENDER(); } }, (() => { const c = phoneCanvas5(s.year, 2); c.className = 'px tu5-phi'; c.setAttribute('aria-hidden', 'true'); return c; })(), ...nm(t(l('Ligar para {m}', 'Call {m}'), { m: short5(m.name) }), short5(m.name)));
  chip.setAttribute('title', t(l('Ligar para {m}', 'Call {m}'), { m: m.name }));
  if (!UI5.phone) return chip;
  let tip: L = l('Tudo em dia. Experimente outro país no mapa-múndi, ou um disco cheio quando tiver músicas.', 'All caught up. Try another country on the world map, or a full album once you have songs.');
  let go: (() => void) | null = null;
  try {
    const p = [...pendingList(s)].sort((a, b) => (b.prio ?? 1) - (a.prio ?? 1))[0];
    if (p) { tip = l(`Se eu fosse você, cuidava disto agora: ${p.title.pt}`, `If I were you, I'd handle this now: ${p.title.en}`); go = () => { UI5.phone = false; goto5(s, p as GotoIn5); }; }
  } catch { /* sem pendências */ }
  return h('div', { class: 'tu5-phwrap' }, chip,
    mentorBox(s, '', tip, [go ? btn(l('ir até lá', 'go there'), go, 'main') : null, btn(l('Desligar', 'Hang up'), () => { UI5.phone = false; RERENDER(); }),
      btn(l('Dispensar o mentor', 'Dismiss the mentor'), () => { dismissMentor5(s); UI5.phone = false; RERENDER(); }, 'ghost')], { cls: 'phone' }));
}

// ---------------------------------------------------------------- a camada

/** Camada do tutorial (a casca chama a cada desenho via `host.extra`). null = nada a mostrar. */
export function tutLayer5(s: GameState, rerender: () => void): HTMLElement | null {
  RERENDER = rerender;
  const tt = tut5Of(s);
  if (!tt) return null;
  install();
  if (tt.end === 'diploma' && !(tt as Tut5 & { dip?: 1 }).dip) return diploma(s, tt);
  if (tt.end) return tt.phone ? phone(s) : null;
  const v = view5();
  tick5(s, v);
  const c = cur5(s);
  if (!c) return tt.end === 'diploma' ? diploma(s, tt) : null;
  const hint = tt.mode === 'hint';
  const m = mentor5(s.year);
  const band = tt.band ? s.acts[tt.band]?.name ?? '' : '';
  const k = keyOf5(c.step.target);
  const text = say5(c.step, { m: m.name, b: band, k: k ? chordLabel5(k) : '' });
  const head = `${t(c.ch.title)} · ${c.ci + 1}/${c.of}`;
  const menu = UI5.menu ? h('div', { class: 'tu5-menu', role: 'group', 'aria-label': t(l('Tutorial', 'Tutorial')) },
    btn(l('Continuar', 'Continue'), () => { UI5.menu = false; rerender(); }, 'main'),
    btn(l('Pular este capítulo', 'Skip this chapter'), () => { UI5.menu = false; skipChapter5(s, view5()); rerender(); }),
    btn(hint ? l('Voltar ao modo guiado', 'Back to guided mode') : l('Modo dica (sem bloquear)', 'Hint mode (no blocking)'), () => { tt.mode = hint ? 'guided' : 'hint'; UI5.menu = false; rerender(); }),
    btn(l('Sair do tutorial', 'Leave the tutorial'), () => { UI5.menu = false; exit5(s); rerender(); }, 'ghost')) : null;
  const acts: (HTMLElement | null)[] = UI5.menu ? [menu] : [
    c.step.ack ? btn(l('Entendi ▸', 'Got it ▸'), () => { ack5(s, view5()); rerender(); }, 'main') : (k ? h('span', { class: 'tu5-k' }, t(l('tecla', 'key')), ' ', h('kbd', null, chordLabel5(k))) : null),
    h('button', { type: 'button', class: 'tu5-b ghost', onclick: () => { UI5.menu = true; rerender(); } }, h('kbd', null, 'Esc'), ' ', t(l('pular / sair', 'skip / leave'))),
  ];
  const box = mentorBox(s, head, text, acts);
  const root = h('div', { class: `tu5${hint ? ' hint' : ' dim'}`, 'data-step': `${c.ch.id}/${c.step.id}` },
    ...(hint ? [] : ['t', 'b', 'l', 'r'].map((k) => h('div', { class: `tu5-dim tu5-dim-${k}`, 'aria-hidden': 'true' }))),
    h('div', { class: 'tu5-ring', 'aria-hidden': 'true', hidden: true }),
    h('div', { class: 'tu5-here tu5-ui', hidden: true, role: 'status' }, t(l('primeiro aqui ↓', 'first here ↓'))),
    h('div', { class: 'tu5-prog tu5-ui', 'aria-hidden': 'true' }, ...Array.from({ length: c.of }, (_, i) => h('i', { class: i < c.ci ? 'ok' : i === c.ci ? 'on' : '' }))),
    box);
  queueMicrotask(() => follow(root));
  watch(s);
  return root;
}

/** Condições sobre o estado podem virar sem novo desenho (ex.: contrato fechado num diálogo): confere de tempos em tempos. */
let timer: ReturnType<typeof setInterval> | null = null;
function watch(s: GameState): void {
  if (timer || typeof window === 'undefined') return;
  timer = setInterval(() => {
    const g = game();
    const tt = g ? tut5Of(g) : undefined;
    if (!g || !tt || tt.end || g !== s && !document.querySelector('.tu5')) { if (timer) clearInterval(timer); timer = null; return; }
    if (tick5(g, view5())) RERENDER();
  }, 400);
}

// ---------------------------------------------------------------- Opções: modo dica e começar nesta partida

/** Linhas para as Opções (só com exp5.nav ligado): modo dica (perfil) e "começar o tutorial nesta partida". */
export function tutOptions5(s: GameState | null, toggleHint: (on: boolean) => void, done: () => void): HTMLElement[] {
  const on = tutHint5();
  const out: (HTMLElement | null)[] = [
    h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: on, onchange: (e: Event) => { const v = (e.target as HTMLInputElement).checked; toggleHint(v); const tt = s ? tut5Of(s) : undefined; if (tt && !tt.end) tt.mode = v ? 'hint' : 'guided'; } }),
      ' ', t(l('Modo dica do tutorial: acende o próximo alvo sem bloquear a tela', 'Tutorial hint mode: lights the next target without blocking the screen'))),
    s ? h('button', { type: 'button', class: 'btn small ghost', onclick: () => { startTut5(s, tutHint5() ? 'hint' : 'guided'); done(); } }, t(l('Começar o tutorial guiado nesta partida', 'Start the guided tutorial in this run'))) : null,
  ];
  return out.filter((x): x is HTMLElement => !!x);
}

/** Para as capturas/robô de tela: o objeto do alvo atual (rótulo). */
export function tutTargetLabel5(s: GameState): string {
  const c = cur5(s);
  if (!c) return '';
  return 'obj' in c.step.target ? t(object5(c.step.target.obj)?.label ?? l('', '')) : '';
}
