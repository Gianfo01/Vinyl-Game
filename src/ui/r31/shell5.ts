// R31 · onda 5 (NAV, EXP-1/EXP-2) — A CASCA DO JOGO EXPLORÁVEL, atrás de `exp5.nav` (DESLIGADO por padrão).
// Topo fixo (selo, data, caixa, fama, buscar, teclas, sede, pausa, avançar), barra de baixo (4 botões de viagem em pixel
// + bolso), a cena da região (sede: sede5.ts; casa/cidade/mundo: quem registrou em nav5 ou a página de hoje), o PAPEL do
// objeto por cima da cena (moldura exp5paper, marcadores = páginas e abas do objeto; conteúdo registrado ou a página
// antiga), o menu de pausa (Esc) com o índice completo e a ajuda de teclas (?) com troca de teclas.
// Estado da casca = só interface (região, papel aberto, sobreposições): nada aqui muda o mundo. O bolso é a única escrita
// e é escolha do jogador (sim/r31/exp5.ts).

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { careers } from '../../sim/sys/careers12';
import { nav5On, POCKET_MAX5, pocketIds5 } from '../../sim/r31/exp5';
import { pendingList, type Pending } from '../../sim/r31/pending';
import type { GameState } from '../../sim/types';
import { $, dateLabel, toast } from '../common';
import { h } from '../dom';
import { portraitCanvas } from '../pixel/avatar';
import { travel5Canvas } from '../pixel/exp5px';
import { rgba, type Px } from '../pixel/px';
import { inbox5Layout, inbox5Look, inbox5Px, paper5Canvas, paper5Layout, paper5Px, type Paper5, type Rect5 } from '../pixel/exp5paper';
import { TABS_REG27 } from '../ps/tabsreg27';
import { REDIRECT29 } from '../ps/route29model';
import { store } from '../store';
import { setTab } from '../vis';
import { CAREER_PAGE17 } from '../nav17';
import { openCredits31 } from './credits31';
import { KEY_CHANGES5, chordLabel5, chordOf5, defaultChord5, key5, keys5, rebind5, resetKeys5, type Bind5, type Region5 } from './keys5';
import { CARD5, NAV5, REGIONS5, TRANS5, bangs5, goto5, index5, open5, paperOf5, pin5, pocketView5, regionOfR5, resolveGoto5, travel5, travelTarget5, type GotoIn5 } from './nav5';
import { FRAME_L5, PLACES5, REGION_L5, movedInto5, object5, objectFor5, objects5, regionOf5, type Obj5, type Open5 } from './objects5';
import { declutter5, kbd5, raw5, sedeScene5, tl5, txt5 } from './sede5';
import { helpHere5 } from './cenas5'; // R31 onda 5 (CENAS5): ajuda do lugar no "?"
import './shell5.css';

/** O que app.ts entrega à casca (as funções de hoje: página antiga, avançar, busca, opções, salvar…). */
export interface Shell5Host {
  /** desenha a página antiga `area` (o mesmo `panel()` de hoje) */
  page: (area: string) => HTMLElement;
  label: (area: string) => string;
  has: (area: string) => boolean;
  advance: () => void;
  advMore: () => HTMLElement | null;
  search: () => void;
  options: () => void;
  files: () => void;
  save: () => void;
  mainMenu: () => void;
  rerender: () => void;
  saveChip: () => HTMLElement | null;
  /** cartões que já existem por cima da tela (tutorial…) */
  extra: () => HTMLElement | null;
}

interface Paper5State { obj: string; marker: Open5 }
/** Estado da casca (só interface; não vai para o save). */
export const SH5: { region: Region5; paper: Paper5State | null; pause: boolean; help: boolean; flash?: string; house: number; rebind?: string } = {
  region: 'sede', paper: null, pause: false, help: false, house: 0,
};

let HOST: Shell5Host | null = null;
const game = (): GameState | null => store.game ?? null;
const redraw = (): void => HOST?.rerender();

// ---------------------------------------------------------------- navegação da casca

/** Objeto-lugar (a própria região: Sede, Casa, Cidade, Mundo). */
const isPlace5 = (o: Obj5): boolean => o.place.endsWith('.lugar') && !o.career;

/** Abre a página `area` (+ aba) do jeito novo: objeto-lugar = viagem; senão o papel do objeto dono, por cima da cena. */
export function show5(area: string, tab?: [string, string], objId?: string): void {
  const s = game();
  if (!s) return;
  const o = (objId ? object5(objId) : undefined) ?? objectFor5(area, tab);
  if (o && isPlace5(o) && !objId) { travel5go(regionOf5(o.place)); return; }
  if (o && !SH5.paper && CARD5.take?.(o.id, { area, tab })) return; // ACOES5 (EXP-13): cartão de ações ao lado do objeto; papel só por "ver tudo ▸"/pausa
  const id = o?.id ?? `page:${area}`;
  const rect = clickRect5; clickRect5 = undefined;
  const swap = () => {
    SH5.paper = { obj: id, marker: { area, tab } };
    SH5.pause = false; SH5.help = false;
    if (tab) setTab(tab[0], tab[1]);
    store.area = area as typeof store.area;
    redraw();
  };
  // clique num objeto da cena: zoom no objeto e o papel sobe; tecla, bolso e "ir até lá" abrem direto (EXP-11)
  if (rect) TRANS5.run({ kind: 'open', obj: id, year: s.year, rect }, swap); else swap();
}
let clickRect5: TransRect | undefined;
/** Clique num objeto desenhado: guarda o retângulo para o zoom da transição. */
export function clickOpen5(id: string): void { clickRect5 = rectOf5(id); open5(id); }
const rectOf5 = (id: string): TransRect | undefined => {
  const el = typeof document !== 'undefined' ? document.querySelector<HTMLElement>(`.s5-obj[data-obj="${id}"]`) : null;
  if (!el) return undefined;
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height };
};
type TransRect = { x: number; y: number; w: number; h: number };

/** Viagem (botões de baixo, ⇧1…4, H). */
export function travel5go(r: Region5): void {
  const s = game();
  if (!s) return;
  TRANS5.run({ kind: 'travel', from: SH5.region, to: r, year: s.year }, () => {
    SH5.region = r; SH5.paper = null; SH5.pause = false; SH5.help = false; SH5.flash = undefined;
    const to = travelTarget5(s, r);
    if (to.tab) setTab(to.tab[0], to.tab[1]); // POL5: Mundo volta sempre ao mapa (não à última aba aberta da página)
    store.area = to.area as typeof store.area;
    redraw();
  });
}

/** Esc: fecha a ajuda, a pausa ou o papel; sem nada aberto, abre a pausa. */
export function esc5(): void {
  if (SH5.rebind) { SH5.rebind = undefined; redraw(); return; }
  const pops = typeof document !== 'undefined' ? [...document.querySelectorAll<HTMLElement>('.s5-pop:not([hidden])')] : [];
  if (pops.length) { for (const x of pops) x.hidden = true; return; } // lista da sala aberta: Esc só fecha a lista
  if (SH5.help) { SH5.help = false; redraw(); return; }
  if (SH5.pause) { SH5.pause = false; redraw(); return; }
  if (SH5.paper) { closePaper5(); return; }
  SH5.pause = true; redraw();
}
export function closePaper5(): void {
  const s = game();
  if (!s || !SH5.paper) return;
  const obj = SH5.paper.obj;
  TRANS5.run({ kind: 'close', obj, year: s.year }, () => { SH5.paper = null; redraw(); });
}
export const help5 = (): void => { SH5.help = true; SH5.pause = false; redraw(); };
export const paperId5 = (): string | undefined => SH5.paper?.obj;

/** Marcadores de um objeto: páginas donas + abas que vieram para ele (MOVES5). */
export function markers5(id: string, cur?: Open5): Open5[] {
  const o = object5(id);
  const out: Open5[] = o ? [...o.opens, ...movedInto5(id).map((m) => ({ area: m.area, tab: m.tab ? [m.key, m.tab] as [string, string] : undefined }))] : [];
  if (!o?.opens.length && o?.links?.length) out.unshift(...o.links);
  if (cur && !out.some((m) => sameMark(m, cur))) out.unshift(cur);
  // mesma página/aba por dois caminhos (ex.: 'inbox' e cockpit › Caixa de entrada): um marcador só
  const seen = new Set<string>();
  return out.map(norm5).filter((m) => { const k = `${m.area}|${m.tab?.join('/') ?? ''}`; if (seen.has(k)) return false; seen.add(k); return true; });
}
/** Nome antigo (REDIRECT29: 'inbox', 'desk'…) → a página e a aba de verdade. */
const norm5 = (m: Open5): Open5 => { const r = REDIRECT29[m.area]; return r?.area ? { area: r.area, tab: r.tab ?? m.tab } : m; };
const sameMark = (a0: Open5, b0: Open5): boolean => { const a = norm5(a0), b = norm5(b0); return a.area === b.area && (!a.tab || !b.tab || (a.tab[0] === b.tab[0] && a.tab[1] === b.tab[1])); };

/** { e }: marcador anterior/seguinte do papel aberto. */
export function markerStep5(d: number): boolean {
  if (!SH5.paper) return false;
  const ms = markers5(SH5.paper.obj, SH5.paper.marker);
  if (ms.length < 2) return false;
  const i = Math.max(0, ms.findIndex((m) => sameMark(m, SH5.paper!.marker)));
  const m = ms[(i + d + ms.length) % ms.length];
  show5(m.area, m.tab, SH5.paper.obj);
  return true;
}

/** Tab = chaveiro: troca de casa (carreiras ativas). Casa 0 = a sede; as outras = papel do prédio da carreira. */
export function house5(): boolean {
  const s = game();
  if (!s) return false;
  const act = careers(s).active;
  if (act.length < 2) return false;
  SH5.house = (SH5.house + 1) % act.length;
  if (SH5.house === 0) travel5go('sede');
  else { const id = `car:${act[SH5.house]}`; if (object5(id)) open5(id); else { const cp = CAREER_PAGE17[act[SH5.house]]; if (cp) show5(cp.area); } }
  return true;
}

/** Teclas da casca que o mapa (keyNav5) não trata. Devolve true quando tratou. */
export function shellKey5(e: KeyboardEvent): boolean {
  const s = game();
  if (!s || !nav5On(s)) return false;
  const c = chordOf5(e);
  if (e.key === 'Escape') { esc5(); return true; }
  if (SH5.pause || SH5.help) return false;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { HOST?.save(); return true; }
  if (c === '{' || c === '}') return markerStep5(c === '}' ? 1 : -1);
  if (c === 'tab') return !e.defaultPrevented && house5(); // na casa, o chaveiro da CASA (casa5) já tratou o Tab
  return false;
}

// ---------------------------------------------------------------- ganchos e teclado (uma vez)

let installed = false;
/** Liga a casca aos ganchos de nav5 (só agem com exp5.nav ligado) e o Alt (mostrar nomes) e a troca de teclas. */
export function install5(host: Shell5Host): void {
  HOST = host;
  if (installed || typeof window === 'undefined') return;
  installed = true;
  NAV5.open = (id, x) => show5(x.area, x.tab, id);
  NAV5.travel = (r) => travel5go(r);
  NAV5.pause = () => esc5();
  NAV5.help = () => help5();
  NAV5.paper = () => SH5.paper?.obj ?? (document.querySelector('main .m27-keys') ? 'correspondencia' : undefined);
  const alt = (on: boolean) => { const was = document.body.classList.contains('alt5'); document.body.classList.toggle('alt5', on && !!document.querySelector('.app5')); if (on && !was) declutter5(); };
  window.addEventListener('keydown', (e) => {
    if (SH5.rebind && document.querySelector('.app5')) { e.preventDefault(); e.stopImmediatePropagation(); doRebind(e); return; }
    if (e.key === 'Alt') { alt(true); if (document.querySelector('.app5')) e.preventDefault(); }
  }, true);
  window.addEventListener('keyup', (e) => { if (e.key === 'Alt') alt(false); });
  window.addEventListener('blur', () => alt(false));
}

function doRebind(e: KeyboardEvent): void {
  const id = SH5.rebind!;
  if (e.key === 'Escape') { SH5.rebind = undefined; redraw(); return; }
  const c = chordOf5(e);
  if (!c || c === 'alt') return;
  const why = rebind5(id, c);
  if (why) toast(t(why), 'bad'); else toast(t(l('Tecla trocada: {k}.', 'Key changed: {k}.'), { k: chordLabel5(c) }), 'good');
  SH5.rebind = undefined;
  redraw();
}

// ---------------------------------------------------------------- topo

function topBar5(s: GameState, host: Shell5Host): HTMLElement {
  const rep = s.player.reputation;
  const fame = Math.round((rep.artistic + rep.commercial + rep.artists + rep.institutional) / 4);
  const hint = (k: string, label: L, on: () => void) => h('button', { type: 'button', class: 't5-k', onclick: on }, kbd5(k), h('span', null, t(label)));
  return h('header', { class: 't5' },
    h('b', { class: 't5-brand' }, s.config.companyName || t(l('Seu selo', 'Your label'))),
    h('span', { class: 't5-chip' }, dateLabel(s)),
    h('span', { class: 't5-chip' }, `${t(l('Caixa', 'Cash'))} `, h('b', { class: s.player.cash < 0 ? 'bad' : 'gold' }, $(s.player.cash))),
    h('span', { class: 't5-chip', title: t(l('Fama', 'Fame')) }, `★ ${fame}`),
    host.saveChip(),
    h('span', { class: 't5-sp' }),
    hint('Ctrl K', l('buscar', 'search'), host.search),
    hint('?', l('teclas', 'keys'), help5),
    hint(chordLabel5(key5('sys:home')?.chord ?? 'h'), l('sede', 'HQ'), () => travel5go('sede')),
    hint('Esc', l('pausa', 'pause'), esc5),
    h('div', { class: 't5-adv' },
      h('button', { type: 'button', class: 't5-go', title: 'Ctrl+Enter', onclick: () => { SH5.paper = null; host.advance(); } }, '▶ ', t(l('Avançar mês', 'Advance month')), s.decisions.length ? raw5('i', 'bg5', String(s.decisions.length)) : null),
      host.advMore()));
}

// ---------------------------------------------------------------- barra de baixo: viagem + bolso

function bottom5(s: GameState): HTMLElement {
  const tr = travel5(s);
  const cur = SH5.region;
  const pocket = pocketView5(s);
  const pinned = new Set(pocketIds5(s));
  const canPin = SH5.paper && object5(SH5.paper.obj) && !pinned.has(SH5.paper.obj);
  const pinBtn = h('button', { type: 'button', class: 'b5-pin', disabled: canPin ? undefined : true,
    title: canPin ? t(l('Fixar o papel aberto no bolso', 'Pin the open paper to the pocket')) : t(l('Abra um objeto para fixá-lo aqui', 'Open an object to pin it here')),
    onclick: () => { if (!SH5.paper) return; const why = pin5(s, SH5.paper.obj); if (why) toast(t(why), 'bad'); redraw(); } }, `+ ${t(l('fixar', 'pin'))}`);
  return h('footer', { class: 'b5' },
    h('nav', { class: 'b5-travel', 'aria-label': t(l('Viagem', 'Travel')) }, ...tr.map((x, i) => {
      const on = x.id === cur && !SH5.paper;
      const ic = travel5Canvas(x.id, on ? 'lit' : 'idle', 3); ic.className = 'px';
      return h('button', { type: 'button', class: `b5-tr${x.id === cur ? ' on' : ''}`, 'data-travel': x.id, 'aria-current': x.id === cur ? 'page' : undefined,
        title: `${tl5(x.label)} (${chordLabel5(x.key)})`, onclick: () => travel5go(x.id) },
        raw5('small', 'b5-k', x.key ? chordLabel5(x.key) : `⇧${i + 1}`), ic, h('span', null, txt5(tl5(x.label))), x.bang ? raw5('i', 'bg5', x.bang > 9 ? '9+' : String(x.bang)) : null);
    })),
    h('div', { class: 'b5-pocket', role: 'group', 'aria-label': t(l('Bolso', 'Pocket')) },
      h('b', { class: 'b5-pl' }, t(l('Bolso', 'Pocket'))),
      ...pocket.map((p) => h('span', { class: `b5-pi${SH5.paper?.obj === p.id ? ' on' : ''}` },
        h('button', { type: 'button', class: 'b5-pb', 'data-pocket': p.id, onclick: () => open5(p.id) }, kbd5(p.key ? chordLabel5(p.key) : ''), txt5(tl5(p.label)), p.bang ? raw5('i', 'bg5', String(p.bang)) : null),
        h('button', { type: 'button', class: 'b5-px', title: t(l('Tirar do bolso', 'Remove from pocket')), 'aria-label': `${t(l('Tirar do bolso', 'Remove from pocket'))}: ${tl5(p.label)}`, onclick: () => { pin5(s, p.id); redraw(); } }, '×'))),
      pocket.length < POCKET_MAX5 ? pinBtn : null));
}

// ---------------------------------------------------------------- recados (secretária eletrônica)

const prioOf = (p: Pending) => p.prio ?? 1;
function recados5(s: GameState): HTMLElement {
  let xs: Pending[] = [];
  try { xs = [...pendingList(s)].sort((a, b) => prioOf(b) - prioOf(a) || (a.due ?? 1e9) - (b.due ?? 1e9)).slice(0, 4); } catch { xs = []; }
  const sec = object5('secretaria');
  const form = sec?.forms?.find((f) => s.year >= f.era[0] && s.year <= f.era[1]);
  const head = form ? tl5(form.label) : t(l('Recados', 'Messages'));
  return h('aside', { class: 'rc5', 'aria-label': head },
    h('button', { type: 'button', class: 'rc5-h', onclick: () => open5('secretaria'), title: `${head} (${chordLabel5(key5('obj:secretaria')?.chord ?? '')})` }, t(l('Recados', 'Messages')), h('small', null, ` · ${head}`)),
    xs.length ? h('ul', null, ...xs.map((p) => {
      const g = resolveGoto5(s, p);
      const who = p.personId ? s.persons[p.personId] : undefined;
      const act = p.actId ? s.acts[p.actId] : undefined;
      const face = who ? portraitCanvas(who, s, 1) : act ? portraitCanvas({ id: p.actId! }, s, 1) : null;
      if (face) face.className = 'px rc5-face';
      const name = who?.name ?? act?.name;
      const dest = g?.obj ? tl5(object5(g.obj)!.label) : g ? HOST?.label(g.open.area) ?? '' : '';
      return h('li', null, h('button', { type: 'button', class: 'rc5-i', onclick: () => { SH5.flash = g?.obj; goto5(s, p as GotoIn5); } },
        face, h('span', null, name ? h('b', null, `${name}: `) : null, t(p.title), h('small', null, h('em', null, t(l('ir até lá', 'go there'))), txt5(` → ${dest}`)))));
    })) : h('p', { class: 'rc5-none' }, t(l('Nenhum recado. O mês está em dia.', 'No messages. The month is up to date.'))));
}

// ---------------------------------------------------------------- cena da região

function region5(s: GameState, host: Shell5Host, bangs: Record<string, number>): HTMLElement {
  const r = SH5.region;
  if (r === 'sede') {
    return h('div', { class: 'reg5 reg5-sede' },
      sedeScene5({ s, bangs, open: clickOpen5, flash: SH5.flash }),
      recados5(s));
  }
  const old = () => host.page(travelTarget5(s, r).area);
  const reg = regionOfR5(r);
  let el: HTMLElement | null = null;
  if (reg) {
    try { el = reg({ s, region: r, open: (id, m) => open5(id, m), goto: (x) => goto5(s, x), travel: travel5go, rerender: redraw, bangs, old }); } catch (e) { console.error('[nav5] região', r, e); el = null; }
  }
  return h('div', { class: `reg5 reg5-${r}` }, el ?? h('div', { class: 'reg5-old page21-host' },
    h('div', { class: 's5-where' }, h('b', null, tl5(REGION_L5[r])), ` · ${s.year}`),
    old()));
}

// ---------------------------------------------------------------- papel

const FRAME_PAPER5: Record<string, Paper5> = {
  livro: 'ledger', caderno: 'scout', quadro: 'whiteboard', revista: 'charts', cortica: 'cork', agenda: 'agenda', fichario: 'rolodex',
};
const paperKind5 = (o?: Obj5): Paper5 | 'inbox' => (!o ? 'form' : o.id === 'quadroplan' ? 'planning' : o.frame === 'caixa' ? 'inbox' : FRAME_PAPER5[o.frame] ?? 'form');

/** Rótulo de um marcador: aba (TABS_REG27) ou página. */
function markLabel5(m: Open5, host: Shell5Host): string {
  if (m.tab) {
    const row = TABS_REG27.find((x) => x[0] === m.area && x[1] === m.tab![0] && x[2] === m.tab![1]);
    if (row) return t(l(row[3], row[4]));
  }
  return host.label(m.area);
}

function paper5(s: GameState, host: Shell5Host): HTMLElement {
  const p = SH5.paper!;
  const o = object5(p.obj);
  const kind = paperKind5(o);
  const ms0 = markers5(p.obj, p.marker);
  const seenL = new Set<string>();
  const ms = ms0.filter((m) => { const k = markLabel5(m, host); if (seenL.has(k) && !sameMark(m, p.marker)) return false; seenL.add(k); return true; });
  const old = () => host.page(p.marker.area);
  const est = size5(null);
  const g0 = geo5(kind, s.year, est.w, est.h);
  const box = { w: g0.br.w, h: g0.br.h, pages: g0.pages };
  let body: HTMLElement | null = null;
  const reg = o ? paperOf5(o.id) : undefined;
  if (reg && o) {
    try { body = reg({ s, obj: o, marker: p.marker, markers: ms, mark: (m) => show5(m.area, m.tab, o.id), open: (id, m) => open5(id, m), goto: (x) => goto5(s, x), close: closePaper5, rerender: redraw, old, box }); } catch (e) { console.error('[nav5] papel', o.id, e); body = null; }
  }
  const content = body ?? h('div', { class: 'p5-old page21-host' }, old());
  const title = o ? tl5(o.label) : host.label(p.marker.area);
  const key = o ? key5(`obj:${o.id}`)?.chord ?? (o.keyRef ? key5(o.keyRef)?.chord : undefined) : undefined;
  const sub = [o ? tl5(PLACES5[o.place] ?? l('', '')) : '', key ? `${t(l('tecla', 'key'))} ${chordLabel5(key)}` : '', o ? tl5(FRAME_L5[o.frame]) : ''].filter(Boolean).join(' · ');
  const pinned = o ? pocketIds5(s).includes(o.id) : false;
  const cv = h('canvas', { class: 'p5-cv px', 'aria-hidden': 'true' }) as HTMLCanvasElement;
  const head = h('div', { class: 'p5-head' },
    h('span', { class: 'p5-ttl' }, h('h1', { class: 'p5-t' }, txt5(title)), h('small', { class: 'p5-sub' }, txt5(sub))),
    h('span', { class: 't5-sp' }),
    o ? h('button', { type: 'button', class: `p5-pin${pinned ? ' on' : ''}`, onclick: () => { pin5(s, o.id); redraw(); } }, pinned ? t(l('no bolso ✓', 'in pocket ✓')) : `+ ${t(l('fixar no bolso', 'pin to pocket'))}`) : null,
    h('button', { type: 'button', class: 'p5-x', onclick: closePaper5 }, kbd5('Esc'), t(l('fechar', 'close'))));
  const tabs = h('nav', { class: 'p5-tabs', role: 'tablist', 'aria-label': t(l('Marcadores', 'Markers')) }, ...ms.map((m) => {
    const on = sameMark(m, p.marker);
    return h('button', { type: 'button', role: 'tab', class: `p5-tab${on ? ' on' : ''}`, 'aria-selected': on ? 'true' : 'false', onclick: () => show5(m.area, m.tab, o?.id) }, txt5(markLabel5(m, host)));
  }), ms.length > 1 ? h('small', { class: 'p5-tk' }, '{ }') : null);
  const bodyEl = h('div', { class: 'p5-body', tabindex: '-1' }, content);
  const sheet = h('section', { class: `p5 p5-${kind}`, 'data-paper': p.obj, role: 'dialog', 'aria-label': title }, cv, head, tabs, bodyEl);
  const put = (el: HTMLElement, r: Rect5, W: number, H: number) => { el.style.left = `${(r.x / W) * 100}%`; el.style.top = `${(r.y / H) * 100}%`; el.style.width = `${(r.w / W) * 100}%`; el.style.height = `${(r.h / H) * 100}%`; };
  let last = '';
  const fit = (cw: number, ch: number): void => {
    const key2 = `${Math.max(200, Math.floor(cw / 2))}x${Math.max(120, Math.floor(ch / 2))}`;
    if (key2 === last) return;
    last = key2;
    const g = geo5(kind, s.year, cw, ch);
    const c2 = paper5Canvas(g.px, 2);
    cv.width = c2.width; cv.height = c2.height;
    cv.getContext('2d')?.drawImage(c2, 0, 0);
    const PW = g.px.w, PH = g.px.h;
    const ink = headInk5(g.px, g.hr);
    sheet.dataset.ink = ink.ink; if (ink.plate) sheet.dataset.plate = '1'; else delete sheet.dataset.plate;
    put(head, { ...g.hr, h: Math.max(g.hr.h, 12) }, PW, PH); put(tabs, g.tr, PW, PH); put(bodyEl, g.br, PW, PH);
  };
  const size = () => size5(sheet.parentElement);
  queueMicrotask(() => { const z = size(); fit(z.w, z.h); });
  { const z = size(); fit(z.w, z.h); }
  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(() => { if (!sheet.isConnected) { ro.disconnect(); return; } const z = size(); fit(z.w, z.h); });
    queueMicrotask(() => { if (sheet.parentElement) ro.observe(sheet.parentElement); });
  }
  return sheet;
}

/** Contraste do cabeçalho pela própria moldura (POL5): mede o pixel por baixo do título (60% da esquerda da faixa).
 *  Fundo escuro → letra clara; claro → escura; textura ou tom médio (cortiça, capa com trama) → etiqueta própria. */
export function headInk5(p: Px, r: Rect5): { ink: 'dark' | 'light'; plate: boolean } {
  let n = 0, s = 0, s2 = 0;
  for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + Math.round(r.w * 0.6); x++) {
    const [R, G, B, A] = rgba(p.get(x, y));
    const v = A ? (0.2126 * R + 0.7152 * G + 0.0722 * B) / 255 : 0;
    n++; s += v; s2 += v * v;
  }
  const m = n ? s / n : 0, sd = n ? Math.sqrt(Math.max(0, s2 / n - m * m)) : 0;
  const plate = sd > 0.075 || (m > 0.42 && m < 0.66);
  return { ink: plate || m >= 0.66 ? 'dark' : 'light', plate };
}

/** Tamanho do papel na tela (o espaço da cena menos a margem); antes de entrar no DOM, a conta pela janela. */
function size5(parent: HTMLElement | null): { w: number; h: number } {
  const r = parent?.getBoundingClientRect();
  if (r && r.width > 50) return { w: r.width - 24, h: r.height - 20 };
  const W = typeof window !== 'undefined' ? window.innerWidth || 1280 : 1280, H = typeof window !== 'undefined' ? window.innerHeight || 800 : 800;
  return { w: Math.max(640, W - 24), h: Math.max(360, H - 56 - 92 - 20) };
}
/** Moldura e áreas do papel (px lógicos = px de tela / 2): título, marcadores, miolo e as páginas do miolo. */
function geo5(kind: Paper5 | 'inbox', year: number, cw: number, ch: number): { px: Px; hr: Rect5; tr: Rect5; br: Rect5; pages: Rect5[] } {
  const W = Math.max(200, Math.floor(cw / 2)), H = Math.max(120, Math.floor(ch / 2));
  if (kind === 'inbox') {
    const look = inbox5Look(year);
    const L = inbox5Layout(look, W, H);
    const br = { x: L.screen.x + 3, y: L.tabs.y + L.tabs.h + 2, w: L.screen.w - 6, h: L.screen.y + L.screen.h - (L.tabs.y + L.tabs.h + 2) - 3 };
    return { px: inbox5Px(look, W, H), hr: L.head, tr: L.tabs, br, pages: [{ x: 0, y: 0, w: br.w, h: br.h }] };
  }
  const L = paper5Layout(kind, W, H);
  const b0 = L.body[0], b1 = L.body[L.body.length - 1];
  const br = { x: b0.x, y: b0.y, w: b1.x + b1.w - b0.x, h: b0.h };
  return { px: paper5Px(kind, W, H, { seed: 5 }), hr: L.head, tr: L.tabs, br, pages: L.body.map((r) => ({ x: r.x - br.x, y: r.y - br.y, w: r.w, h: r.h })) };
}

// ---------------------------------------------------------------- pausa e índice

function pause5(s: GameState, host: Shell5Host): HTMLElement {
  const item = (label: L, hint: string | HTMLElement | null, on: () => void, primary = false) =>
    h('button', { type: 'button', class: `pz5-i${primary ? ' on' : ''}`, onclick: on }, h('span', null, t(label)), typeof hint === 'string' ? h('small', null, hint) : hint);
  const ix = index5();
  const groups = [...REGIONS5, 'pausa' as const].map((r) => ({ r, rows: ix.filter((x) => x.region === r) })).filter((g) => g.rows.length);
  const filter = h('input', { type: 'search', class: 'pz5-f', placeholder: t(l('filtrar páginas…', 'filter pages…')), 'aria-label': t(l('Filtrar o índice', 'Filter the index')),
    oninput: (e: Event) => { const q = (e.target as HTMLInputElement).value.trim().toLowerCase(); idx.querySelectorAll<HTMLElement>('li').forEach((li) => { li.hidden = !!q && !(li.textContent ?? '').toLowerCase().includes(q); }); } });
  const idx = h('div', { class: 'pz5-ix', id: 'pz5-ix' },
    h('h2', null, t(l('Índice completo', 'Full index')), h('small', null, ` · ${t(l('consulta (opcional)', 'reference (optional)'))}`)), filter,
    ...groups.map((g) => h('section', null, h('h3', null, g.r === 'pausa' ? t(l('Fora do mundo', 'Outside the world')) : tl5(REGION_L5[g.r])),
      h('ul', null, ...g.rows.filter((x) => host.has(x.open.area) || g.r === 'pausa').map((x) => h('li', null,
        h('button', { type: 'button', class: 'pz5-row', 'data-area': x.open.area, onclick: () => { SH5.pause = false; show5(x.open.area, x.open.tab, x.obj); } },
          h('span', null, txt5(host.label(x.open.area))), x.obj ? h('small', null, txt5(tl5(object5(x.obj)!.label))) : null)))))));
  const editor = host.has('editor31');
  return h('div', { class: 'pz5-back', onclick: (e: Event) => { if (e.target === e.currentTarget) { SH5.pause = false; redraw(); } } },
    h('div', { class: 'pz5', role: 'dialog', 'aria-modal': 'true', 'aria-label': t(l('Pausa', 'Pause')) },
      h('div', { class: 'pz5-menu' },
        h('h1', null, t(l('Pausa', 'Pause'))),
        item(l('Continuar', 'Continue'), kbd5('Esc'), () => { SH5.pause = false; redraw(); }, true),
        item(l('Salvar', 'Save'), 'Ctrl S', () => { host.save(); }),
        item(l('Carregar', 'Load'), null, () => { SH5.pause = false; redraw(); host.files(); }),
        item(l('Opções', 'Options'), t(l('nomes reais, som, teclas', 'real names, sound, keys')), () => { SH5.pause = false; redraw(); host.options(); }),
        item(l('Teclas de atalho', 'Shortcut keys'), kbd5('?'), help5),
        item(l('Ajuda e tutorial', 'Help and tutorial'), null, () => show5('tut18')),
        item(l('Créditos', 'Credits'), null, () => openCredits31()),
        editor ? item(l('Editor', 'Editor'), t(l('modo editor', 'editor mode')), () => show5('editor31')) : null,
        item(l('Índice completo', 'Full index'), t(l('consulta (opcional)', 'reference (optional)')), () => filter.focus()),
        item(l('Menu principal', 'Main menu'), null, () => { SH5.pause = false; host.mainMenu(); })),
      idx));
}

// ---------------------------------------------------------------- ajuda de teclas (? ) e troca de teclas

function help5el(s: GameState): HTMLElement {
  const all = keys5();
  const row = (b: Bind5) => {
    const can = !b.fixed && b.scope === 'global';
    const waiting = SH5.rebind === b.id;
    const def = defaultChord5(b.id);
    return h('li', { class: waiting ? 'wait' : '' }, kbd5(chordLabel5(b.chord)), h('span', null, txt5(tl5(b.label))),
      def && def !== b.chord ? h('small', { class: 'muted' }, `${t(l('padrão', 'default'))} ${chordLabel5(def)}`) : null,
      can ? h('button', { type: 'button', class: 'hk5-re', onclick: () => { SH5.rebind = b.id; redraw(); } }, waiting ? t(l('aperte a nova tecla… (Esc cancela)', 'press the new key… (Esc cancels)')) : t(l('trocar', 'change'))) : null);
  };
  const here: Bind5[] = [];
  let where: string;
  if (SH5.paper) {
    const o = object5(SH5.paper.obj);
    where = o ? tl5(o.label) : t(l('Papel', 'Paper'));
    here.push(...all.filter((b) => b.scope === SH5.paper!.obj));
    for (const id of ['sys:prevTab', 'sys:nextTab', 'sys:pause']) { const b = key5(id); if (b) here.push(b); }
  } else {
    where = tl5(REGION_L5[SH5.region]);
    const ids = new Set(objects5().filter((o) => !o.career && regionOf5(o.place) === SH5.region).map((o) => `obj:${o.id}`));
    here.push(...all.filter((b) => ids.has(b.id)));
  }
  const travel = all.filter((b) => b.act.kind === 'travel');
  const sys = all.filter((b) => b.act.kind === 'sys' && b.scope === 'global');
  const others = all.filter((b) => b.scope === 'global' && (b.act.kind === 'object' || b.act.kind === 'marker') && !here.includes(b));
  return h('div', { class: 'pz5-back', onclick: (e: Event) => { if (e.target === e.currentTarget) { SH5.help = false; SH5.rebind = undefined; redraw(); } } },
    h('div', { class: 'hk5', role: 'dialog', 'aria-modal': 'true', 'aria-label': t(l('Teclas', 'Keys')) },
      h('header', null, h('h1', null, t(l('Teclas', 'Keys')), h('small', null, ` · ${where}`)),
        h('button', { type: 'button', class: 'hk5-reset', onclick: () => { resetKeys5(); toast(t(l('Teclas de volta ao padrão.', 'Keys back to default.')), 'info'); redraw(); } }, t(l('voltar ao padrão', 'reset to default'))),
        h('button', { type: 'button', class: 'p5-x', onclick: () => { SH5.help = false; SH5.rebind = undefined; redraw(); } }, kbd5('Esc'), t(l('fechar', 'close')))),
      h('div', { class: 'hk5-cols' },
        h('section', null, helpHere5(SH5.paper ? '.p5' : undefined), // R31 onda 5 (CENAS5): a ajuda do lugar à vista (interior, sala…)
          h('h2', null, t(l('Nesta tela', 'On this screen'))), h('ul', null, ...here.map(row)),
          h('h2', null, t(l('Viagem', 'Travel'))), h('ul', null, ...travel.map(row)),
          h('h2', null, t(l('Sistema', 'System'))), h('ul', null, ...sys.map(row)),
          h('p', { class: 'muted small' }, t(l('Segure Alt para ver o nome e a tecla de todos os objetos da cena.', 'Hold Alt to see every object\'s name and key.')))),
        h('section', null, h('h2', null, t(l('Todos os objetos', 'All objects'))), h('ul', null, ...others.map(row)),
          h('details', null, h('summary', null, t(l('O que mudou (para quem já joga)', 'What changed (for current players)'))),
            h('ul', { class: 'hk5-ch' }, ...KEY_CHANGES5.map((c) => h('li', null, kbd5(chordLabel5(c.chord)), h('span', null, `${t(c.before)} → `, h('b', null, t(c.after))), h('small', { class: 'muted' }, t(c.why))))))))));
}

// ---------------------------------------------------------------- a casca inteira

/** A tela inteira com `exp5.nav` ligado (substitui topo + menu lateral + página de hoje). */
export function shell5(s: GameState, host: Shell5Host): HTMLElement {
  install5(host);
  const bangs = bangs5(s);
  const reg = region5(s, host, bangs);
  const paper = SH5.paper ? paper5(s, host) : null;
  const main = h('main', { id: 'main', class: `m5${paper ? ' has-paper' : ''}`, tabindex: '-1' }, reg, paper ? h('div', { class: 'p5-dim' }) : null, paper);
  return h('div', { class: `app5 era5-${Math.floor(s.year / 10) * 10}` },
    topBar5(s, host),
    main,
    bottom5(s),
    SH5.pause ? pause5(s, host) : null,
    SH5.help ? help5el(s) : null,
    host.extra(),
    h('div', { id: 'sr-live', class: 'sr-only', 'aria-live': 'polite' }));
}

/** Vale a casca nova nesta partida? (o app.ts pergunta antes de desenhar). */
export const shell5On = (s: GameState | null | undefined): boolean => !!s && nav5On(s);
