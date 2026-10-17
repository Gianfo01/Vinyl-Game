// R33 · APARELHOS33 — A CASCA DO CELULAR E DO COMPUTADOR (docs/r33/CELULAR_PC.md). Só com a casca da onda 5 (exp5.nav)
// e o interruptor `exp33.aparelhos` (ligado por padrão).
//  • CELULAR: 5º botão do menu de baixo (depois de Sede, Casa, Cidade, Mundo), ⇧5, só de 1983 em diante; o "!" é a soma
//    dos "!" dos apps (as mesmas pendências de hoje). Abre o aparelho POR CIMA da cena, sem trocar de lugar (EXP-13).
//  • COMPUTADOR: o PC da mesa do escritório (upgrade "Computador com planilha" do livro-caixa, 1982+), objeto clicável
//    com o cartão de ações (ACOES5): "Ligar o PC" abre a tela do monitor. Sem atalho no menu de baixo.
//  • CATÁLOGO PELO CORREIO: na mesa desde 1889 (a mesma compra a distância do decoshop31), até a internet.
// Arte: aparelhos e ícones desenhados em Px (aparelhos33px.ts); o conteúdo da tela usa os componentes de sempre (botão do
// cartão de ações, trava com o motivo `lockBtn31`, retrato do jogo `portraitCanvas`, fontes do jogo). Abrir e navegar só
// lê; só a ação escolhida escreve, pela função de hoje (catálogo em aparelhos33model.ts).

import './aparelhos33.css';
import { l, type L } from '../../data/world';
import { getLang, t } from '../../i18n/strings';
import type { GameState } from '../../sim/types';
import { nav5On } from '../../sim/r31/exp5';
import { pendingList } from '../../sim/r31/pending';
import { lock31, UNLOCK31 } from '../../sim/r31/lock';
import { buyDeco31, decoPrice31, reqKey31, reqLevel31, setReq31, decoOn31 } from '../../sim/r31/deco31';
import { upgDef31 } from '../../data/deco31';
import { freeCash20, cashWhy20 } from '../../sim/oblig20';
import { energyLeft } from '../../sim/sys/life';
import { ap33On, endGame33, homeDemo33, pcV33, phoneV33, PC_NAME33, PHONE_NAME33, type Dev33 } from '../../sim/r33/aparelhos33';
import { GAME_KEYS33, GAME_L33, PC_GAME33, PHONE_GAME33, TICK33, newGame33, overOf33, scoreOf33, stepGame33, type AnyGame33, type Game33, type Key33 } from '../../sim/r33/jogos33';
import { $, rerender, toast } from '../common';
import { h } from '../dom';
import { store } from '../store';
import { portraitCanvas } from '../pixel/avatar';
import { upscale } from '../pixel/px';
import { lockBtn31 } from '../r31/lock31';
import { chordLabel5, key5 } from '../r31/keys5';
import { CARD5, DOCK5, NAV5, bangs5, goto5, open5, travelGo5 } from '../r31/nav5';
import { registerObject5, object5 } from '../r31/objects5';
import { ACTS5 } from '../r31/acoes5model';
import { CARDS5 } from '../r31/acoes5data';
import { passThrough5, close5 as closeCard5 } from '../r31/acoes5';
import { openArrumar5 } from '../r31/deco5';
import { SEDE_ART5, SEDE_HAS5 } from '../r31/sede5';
import { raw5, tl5, txt5 } from '../r31/sede5';
import {
  ACTS33, BANGS33, shopLine33, actsOf33, appName33, appBang33, appOf33, apps33, devBang33, lock33, setShopTo33, shopTo33, type Ctx33, type Item33, type Res33,
} from './aparelhos33model';
import { CATALOG_SIZE33, DESKPC_SIZE33, catalog33, deskPc33, dock33Canvas, gamePx33, icon33, pcPx33, phonePx33, type Dev33Art, type Look33 } from './aparelhos33px';

// ---------------------------------------------------------------- estado (só interface; não vai para o save)

type Open33 = Dev33 | 'cat';
const UI33: { dev?: Open33; app?: string; sel: number; game?: AnyGame33; gk?: Game33; timer?: ReturnType<typeof setInterval>; held?: Key33; next?: Key33; n: number; last?: L } = { sel: 0, n: 0 };
const game = (): GameState | undefined => store.game ?? undefined;

/** Há celular agora? (casca da onda 5, interruptor, 1983+) */
export const phoneOk33 = (s: GameState | undefined): boolean => !!s && nav5On(s) && ap33On(s) && phoneV33(s.year) !== undefined;
/** O computador da mesa está instalado? (upgrade do livro-caixa: computador com planilha 1982+ ou o painel de 2010+) */
const LEDGER_KEY33 = reqKey31('sede', 'office', 'livrocaixa');
export function pcInstalled33(s: GameState): boolean {
  const u = reqLevel31(s, LEDGER_KEY33).upg;
  return !!u && u.req === 'livrocaixa' && (u.id === 'u_livrocaixa_2_1982' || u.lv >= 3);
}
export const pcOk33 = (s: GameState | undefined): boolean => !!s && ap33On(s) && pcV33(s.year) !== undefined && pcInstalled33(s);
/** O modelo de computador à venda neste ano (o upgrade da linha do livro-caixa). */
const pcUpg33 = (s: GameState): string => (s.year >= 2010 ? 'u_livrocaixa_3_2010' : 'u_livrocaixa_2_1982');
export function pcInstallLock33(s: GameState): L | null {
  if (!decoOn31(s)) return l('Decoração e upgrades estão desligados nesta partida.', 'Decoration and upgrades are off in this game.');
  if (s.year < 1982) return l('O computador de mesa chega em 1982.', 'The desktop computer arrives in 1982.');
  const u = upgDef31(pcUpg33(s));
  const v = u ? decoPrice31(s, u) : 0;
  return freeCash20(s) < v ? cashWhy20(s, v, l('Caixa da empresa insuficiente.', 'Not enough company cash.')) : null;
}
/** Instala o computador na mesa: compra o upgrade do livro-caixa e põe no lugar (o mesmo caminho do "Arrumar"). */
export function installPc33(s: GameState): Res33 {
  const why = pcInstallLock33(s);
  if (why) return { text: why, bad: true };
  const r = buyDeco31(s, `upg:${pcUpg33(s)}`, 'co');
  if (!r.ok) return { text: r.why, bad: true };
  const x = setReq31(s, LEDGER_KEY33, r.obj.id);
  return x.ok ? { text: l('O computador está na mesa do escritório.', 'The computer is on the office desk.') } : { text: l('Não deu para instalar.', 'Could not install it.'), bad: true };
}

// ---------------------------------------------------------------- abrir e fechar

function stopGame(): void { if (UI33.timer) clearInterval(UI33.timer); UI33.timer = undefined; UI33.game = undefined; UI33.held = undefined; UI33.next = undefined; }
export function open33(dev: Open33, app?: string): void { stopGame(); UI33.dev = dev; UI33.app = app; UI33.sel = 0; closeCard5(); rerender(); }
export const openPhone33 = (): void => open33('phone');
export const openPc33 = (app?: string): void => open33('pc', app);
export const openCatalog33 = (): void => open33('cat');
export function close33(): void { stopGame(); UI33.dev = undefined; UI33.app = undefined; rerender(); }
/** Esc / ◂: sai do jogo, volta à tela inicial do aparelho; na tela inicial fecha. */
export function back33(): boolean {
  if (!UI33.dev) return false;
  if (UI33.game || UI33.gk) { stopGame(); UI33.gk = undefined; rerender(); return true; }
  if (UI33.app && UI33.dev !== 'cat') { UI33.app = undefined; UI33.sel = 0; rerender(); return true; }
  close33();
  return true;
}
const ctx33 = (): Ctx33 => ({
  go: (obj, mark) => { close33(); if (mark) passThrough5(() => { open5(obj, mark); }); else open5(obj); },
  travel: (r) => { close33(); const s = game(); if (s) travelGo5(s, r); },
  app: (id) => { UI33.app = id; rerender(); },
  close: close33,
  say: (x, kind = 'good') => toast(t(x), kind),
  refresh: () => rerender(),
});
function run33(s: GameState, id: string, arg?: string): void {
  const a = ACTS33[id];
  if (!a) return;
  const c = ctx33();
  let r: Res33 | void;
  try { r = a.run(s, c, arg); } catch (e) { console.error('[aparelhos33]', id, e); r = { text: l('Não deu agora.', 'Not possible right now.'), bad: true }; }
  if (r) { UI33.last = r.text; toast(t(r.text), r.bad ? 'bad' : 'good'); }
  if (UI33.dev) rerender();
}

// ---------------------------------------------------------------- pedaços da tela

const tx = (x: L | string): string => (typeof x === 'string' ? x : tl5(x));
const MON = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
const MON_EN = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const monthTxt = (s: GameState): string => `${(getLang() === 'en' ? MON_EN : MON)[Math.max(0, Math.min(11, s.month - 1))]} ${s.year}`;
const clock = (s: GameState): string => `${String(8 + (s.week % 11)).padStart(2, '0')}:${String((s.week * 7) % 60).padStart(2, '0')}`;
const pxImg = (p: { canvas: () => HTMLCanvasElement; w: number; h: number }, k: number, cls = ''): HTMLCanvasElement => { const c = upscale(p.canvas(), p.w * k, p.h * k); c.className = `px ${cls}`; return c; };

/** Botão de uma ação (rótulo, linha curta embaixo, trava com o motivo antes do clique). */
function actBtn33(s: GameState, id: string, n: number, arg?: string, label?: L): HTMLElement {
  const a = ACTS33[id];
  let hint: L | null = null;
  try { hint = a.hint?.(s, arg) ?? null; } catch { hint = null; }
  const lab = h('span', { class: 'ap33-al' }, n > 0 && n < 10 ? raw5('kbd', 'ap33-n', String(n)) : null,
    h('span', null, h('b', null, t(label ?? a.label)), hint ? h('small', null, t(hint)) : null), a.kind === 'go' || a.kind === 'ui' ? raw5('i', 'ap33-go', '▸') : null);
  return lockBtn31(lab, lock33(s, id, arg), () => run33(s, id, arg), { cls: `ap33-a k-${a.kind}`, attrs: { 'data-act33': id, ...(arg ? { 'data-arg': arg } : {}) } });
}
function mini33(p: { canvas: () => HTMLCanvasElement; w: number; h: number }, max = 44): HTMLCanvasElement { const k = Math.max(1, Math.min(3, Math.floor(max / Math.max(p.w, p.h)) || 1)); return pxImg(p, k, 'ap33-pic'); }
function face33(s: GameState, it: Item33, k = 2): HTMLElement | null {
  const p = it.face ? s.persons[it.face] : undefined;
  if (!p) return null;
  const c = portraitCanvas(p, s, k); c.className = 'px ap33-face';
  return c;
}

/** O miolo de um app: ações soltas, leituras e cartões de item (contato, perfil, peça, lote). */
function appBody33(s: GameState, d: Dev33, app: string): HTMLElement {
  const ids = actsOf33(s, d, app);
  const out: HTMLElement[] = [];
  const done = new Set<string>();
  let n = 0;
  if (app === 'compras') out.push(shopTabs33(s));
  for (const id of ids) {
    if (done.has(id)) continue;
    const a = ACTS33[id];
    if (a.kind === 'read') {
      let ls: L[] = [];
      try { ls = a.lines?.(s) ?? []; } catch { ls = []; }
      out.push(h('div', { class: 'ap33-read' }, h('b', { class: 'ap33-rh' }, t(a.label)), ls.length ? h('ul', null, ...ls.map((x) => h('li', null, t(x)))) : h('p', null, t(l('Nada agora.', 'Nothing right now.')))));
      continue;
    }
    if (a.kind === 'game') { out.push(gamePick33(s, d)); continue; }
    if (a.items && a.group) {
      const grp = ids.filter((x) => ACTS33[x].group === a.group);
      grp.forEach((x) => done.add(x));
      let its: Item33[] = [];
      try { its = a.items(s); } catch { its = []; }
      if (a.one) its = its.slice(0, 1);
      if (!its.length) { out.push(h('p', { class: 'ap33-none' }, t(emptyOf(a.group)))); continue; }
      out.push(h('div', { class: `ap33-items${a.one ? ' one' : ''}` }, ...its.map((it) => h('article', { class: 'ap33-it' },
        it.pic ? mini33(it.pic()) : face33(s, it, a.one ? 4 : 2),
        h('div', { class: 'ap33-itx' }, h('b', null, tx(it.title)), it.sub ? h('small', null, tx(it.sub)) : null, it.price !== undefined ? h('em', null, $(it.price)) : null),
        h('div', { class: 'ap33-ita' }, ...grp.map((x) => actBtn33(s, x, a.one ? 0 : ++n, it.arg)))))));
      continue;
    }
    out.push(actBtn33(s, id, ++n));
    let ls: L[] = [];
    try { ls = a.lines?.(s) ?? []; } catch { ls = []; }
    if (ls.length) out.push(h('ul', { class: 'ap33-sub' }, ...ls.map((x) => h('li', null, t(x)))));
  }
  if (!out.length) out.push(h('p', { class: 'ap33-none' }, t(l('Nada para fazer aqui neste ano.', 'Nothing to do here this year.'))));
  return h('div', { class: 'ap33-body' }, ...out);
}
const emptyOf = (g?: string): L => g === 'contato' ? l('Ninguém do elenco para ligar ainda.', 'Nobody on the roster to call yet.') : g === 'peca' ? l('O catálogo deste ano ainda não chegou.', 'This year\'s catalogue has not arrived yet.') : g === 'perfil' ? l('Ninguém novo perto de você agora.', 'Nobody new near you right now.') : g === 'match' ? l('Nenhum match ainda.', 'No match yet.')
  : g === 'lead' ? l('Veja vídeos em alta para achar alguém.', 'Watch trending videos to find someone.') : g === 'lote' ? l('Nada à venda agora.', 'Nothing for sale right now.') : g === 'msg' ? l('Nenhuma mensagem nova.', 'No new messages.') : l('Nada agora.', 'Nothing right now.');
function shopTabs33(s: GameState): HTMLElement {
  const tab = (k: 'co' | 'me', lb: L) => h('button', { type: 'button', class: `ap33-tab${shopTo33() === k ? ' on' : ''}`, onclick: () => { setShopTo33(k); rerender(); } }, t(lb));
  return h('div', { class: 'ap33-tabs' }, tab('co', l('Sede', 'HQ')), tab('me', l('Casa', 'Home')),
    h('small', null, t(shopLine33(s)), ' · ', t(shopTo33() === 'co' ? l('caixa da empresa, chega pela porta da rua e vai para "Arrumar"', 'company cash, arrives at the front door and goes to "Arrange"') : l('do seu bolso, vai para a sua casa', 'from your pocket, goes to your home'))));
}

// ---------------------------------------------------------------- minijogos

function games33(s: GameState, d: Dev33): Game33[] { const v = d === 'phone' ? phoneV33(s.year) : pcV33(s.year); return v ? (d === 'phone' ? PHONE_GAME33[v] : PC_GAME33[v]) ?? [] : []; }
function gamePick33(s: GameState, d: Dev33): HTMLElement {
  if (UI33.gk) return gameView33(s, d);
  return h('div', { class: 'ap33-body' }, ...games33(s, d).map((k, i) => lockBtn31(h('span', { class: 'ap33-al' }, raw5('kbd', 'ap33-n', String(i + 1)), h('span', null, h('b', null, t(GAME_L33[k])), h('small', null, t(GAME_KEYS33[k])))), null,
    () => startGame33(s, k), { cls: 'ap33-a k-game', attrs: { 'data-game33': k } })),
  h('p', { class: 'ap33-none' }, t(l('Cada partida baixa um pouco o estresse (até um limite por mês); o recorde vai para o diário.', 'Each game lowers stress a little (up to a monthly cap); the record goes into the diary.'))));
}
function startGame33(s: GameState, k: Game33): void {
  stopGame();
  UI33.gk = k; UI33.n++;
  const cw = Math.max(10, Math.min(20, Math.floor((GAME_BOX.w - 2) / 3))), ch = Math.max(7, Math.min(14, Math.floor((GAME_BOX.h - 9) / 3)));
  UI33.game = newGame33(k, `${s.config.seed}|${s.week}|${UI33.n}`, { w: cw, h: ch });
  if (TICK33[k]) UI33.timer = setInterval(tick33, TICK33[k]);
  rerender();
}
function tick33(): void {
  const g = UI33.game, s = game();
  if (!g || !s) { stopGame(); return; }
  const key = g.k === 'tennis' ? UI33.held : UI33.next;
  UI33.next = undefined;
  stepGame33(g, key);
  paintGame33();
  if (overOf33(g)) finish33(s, g);
}
function finish33(s: GameState, g: AnyGame33): void {
  if (UI33.timer) clearInterval(UI33.timer);
  UI33.timer = undefined;
  const r = endGame33(s, UI33.gk!, GAME_L33[UI33.gk!], scoreOf33(g));
  UI33.last = r.text;
  toast(t(r.text), r.record ? 'good' : 'info');
  rerender();
}
function gameKey33(k: Key33): void {
  const g = UI33.game, s = game();
  if (!g || !s || overOf33(g)) return;
  if (g.k === 'snake' || g.k === 'holo') { if (k === 'act' && g.k === 'holo') stepGame33(g, 'act'); else UI33.next = k; return; }
  if (g.k === 'tennis') { UI33.held = k; return; }
  stepGame33(g, k);
  paintGame33();
  if (overOf33(g)) finish33(s, g);
}
let GAME_CV: HTMLCanvasElement | null = null;
let GAME_BOX: { w: number; h: number; k: number; look: Look33 } = { w: 64, h: 48, k: 3, look: 'flat' };
function paintGame33(): void {
  const g = UI33.game;
  if (!g || !GAME_CV?.isConnected) return;
  const p = gamePx33(g, GAME_BOX.look, GAME_BOX.w, GAME_BOX.h);
  const c = upscale(p.canvas(), p.w * GAME_BOX.k, p.h * GAME_BOX.k);
  GAME_CV.width = c.width; GAME_CV.height = c.height;
  GAME_CV.getContext('2d')?.drawImage(c, 0, 0);
}
function gameView33(s: GameState, d: Dev33): HTMLElement {
  const cv = h('canvas', { class: 'px ap33-gcv', tabindex: '0', 'aria-label': t(GAME_L33[UI33.gk!]) }) as HTMLCanvasElement;
  GAME_CV = cv;
  const g = UI33.game;
  const over = !g || overOf33(g);
  const tap = UI33.gk === 'tap' ? h('div', { class: 'ap33-pad' }, ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => h('button', { type: 'button', onclick: () => gameKey33(`n${i}` as Key33) }, String(i)))) : null;
  const arrows = UI33.gk !== 'tap' ? h('div', { class: 'ap33-pad arrows' }, ...([['up', '▲'], ['left', '◀'], ['act', '●'], ['right', '▶'], ['down', '▼']] as [Key33, string][]).map(([k, c]) =>
    h('button', { type: 'button', class: `k-${k}`, 'aria-label': k, onpointerdown: () => gameKey33(k), onpointerup: () => { if (UI33.held === k) UI33.held = undefined; } }, c))) : null;
  queueMicrotask(paintGame33);
  return h('div', { class: 'ap33-game' }, cv,
    over ? h('div', { class: 'ap33-gover' }, UI33.last ? h('p', null, t(UI33.last)) : null,
      lockBtn31(h('span', { class: 'ap33-al' }, h('b', null, t(l('Jogar de novo', 'Play again')))), null, () => startGame33(s, UI33.gk!), { cls: 'ap33-a k-game' })) : null,
    d === 'phone' ? tap ?? arrows : tap, h('small', { class: 'ap33-gk' }, t(GAME_KEYS33[UI33.gk!])));
}

// ---------------------------------------------------------------- telas por tipo de aparelho

const LCD33 = new Set<Look33>(['lcd1', 'lcd', 'crt']);
function home33(s: GameState, d: Dev33, look: Look33): HTMLElement {
  const xs = apps33(s, d);
  if (LCD33.has(look)) {
    UI33.sel = Math.max(0, Math.min(xs.length - 1, UI33.sel));
    return h('div', { class: 'ap33-menu', role: 'menu' },
      h('div', { class: 'ap33-bar' }, raw5('span', '', look === 'crt' ? 'C:\\>' : '▮▮▮'), raw5('span', '', monthTxt(s)), raw5('span', '', look === 'crt' ? '' : '▮▮')),
      ...xs.map((id, i) => { const b = appBang33(s, d, id); return h('button', { type: 'button', role: 'menuitem', class: `ap33-row${i === UI33.sel ? ' on' : ''}`, 'data-app33': id, onclick: () => { UI33.app = id; UI33.sel = 0; rerender(); } },
        raw5('span', 'ap33-cur', i === UI33.sel ? '>' : ' '), raw5('span', 'ap33-rl', `${look === 'crt' ? `${i + 1} ` : ''}${tl5(appName33(s, d, id)).toUpperCase()}`), b ? raw5('span', 'ap33-cnt', ` (${b})`) : null); }));
  }
  const top = pendingList(s)[0];
  const grid = h('div', { class: 'ap33-grid' }, ...xs.map((id) => {
    const b = appBang33(s, d, id);
    const ext = appOf33(d, id);
    const ic = pxImg(icon33(ext?.icon ?? id, look, b), d === 'pc' ? 2 : 3, 'ap33-ic');
    return h('button', { type: 'button', class: 'ap33-app', 'data-app33': id, title: tl5(appName33(s, d, id)), onclick: () => { UI33.app = id; rerender(); } }, ic, h('span', null, txt5(tl5(appName33(s, d, id)))));
  }));
  if (d === 'pc') return h('div', { class: 'ap33-desk' }, grid, taskbar33(s));
  return h('div', { class: 'ap33-home' }, statusBar33(s, look),
    top && look !== 'holo' ? h('button', { type: 'button', class: 'ap33-note', onclick: () => { close33(); goto5(s, top); } }, h('b', null, t(top.title)), h('small', null, t(l('ir até lá', 'go there')))) : null,
    grid);
}
function statusBar33(s: GameState, look: Look33): HTMLElement {
  return h('div', { class: 'ap33-bar' }, raw5('span', '', clock(s)), raw5('span', '', UI33.app ? tl5(appName33(s, 'phone', UI33.app)).toUpperCase() : monthTxt(s)), raw5('span', '', look === 'holo' ? '◇' : '▮▮▮ 82%'));
}
function taskbar33(s: GameState): HTMLElement {
  return h('div', { class: 'ap33-task' }, h('button', { type: 'button', class: 'ap33-start', onclick: () => { UI33.app = undefined; rerender(); } }, t(l('Início', 'Start'))),
    UI33.app ? h('span', { class: 'ap33-win' }, txt5(tl5(appName33(s, 'pc', UI33.app)))) : null, h('span', { class: 't5-sp' }), raw5('span', 'ap33-clock', `${monthTxt(s)} · ${clock(s)}`));
}
function appScreen33(s: GameState, d: Dev33, look: Look33): HTMLElement {
  const id = UI33.app!;
  const ext = appOf33(d, id);
  const name = tl5(appName33(s, d, id));
  let body: HTMLElement;
  if (ext?.open) {
    let el: unknown = null;
    try { el = ext.open({ s, dev: d, ver: (d === 'phone' ? phoneV33(s.year) : pcV33(s.year)) ?? 0, ctx: ctx33(), box: { w: 0, h: 0 } }); } catch (e) { console.error('[aparelhos33] app', id, e); }
    body = el instanceof HTMLElement ? el : appBody33(s, d, id);
  } else body = appBody33(s, d, id);
  const head = h('div', { class: 'ap33-head' }, h('button', { type: 'button', class: 'ap33-back', title: t(l('Voltar (Esc)', 'Back (Esc)')), onclick: () => back33() }, '◂'), h('b', null, txt5(LCD33.has(look) ? name.toUpperCase() : name)));
  if (d === 'pc' && !LCD33.has(look)) return h('div', { class: 'ap33-desk' }, h('div', { class: 'ap33-grid dim' }), h('section', { class: 'ap33-window', 'data-app': id }, head, body), taskbar33(s));
  return h('div', { class: 'ap33-appv', 'data-app': id }, LCD33.has(look) ? null : statusBar33(s, look), head, body);
}

// ---------------------------------------------------------------- o aparelho inteiro, por cima da cena

function fitK(w: number, hh: number): number {
  const W = typeof window !== 'undefined' ? window.innerWidth || 1280 : 1280, H = typeof window !== 'undefined' ? window.innerHeight || 800 : 800;
  return Math.max(2, Math.min(5, Math.floor(Math.min((H - 56 - 92 - 60) / hh, (W - 80) / w))));
}
function device33(s: GameState, d: Dev33): HTMLElement {
  const v = (d === 'phone' ? phoneV33(s.year) : pcV33(s.year))!;
  const art: Dev33Art = d === 'phone' ? phonePx33(v) : pcPx33(v);
  const k = fitK(art.p.w, art.p.h);
  const cv = pxImg(art.p, k, 'ap33-cv');
  const r = art.scr;
  GAME_BOX = { w: r.w, h: Math.max(30, r.h - (LCD33.has(art.look) ? 12 : 40)), k, look: art.look };
  const scr = h('div', { class: `ap33-scr look-${art.look} dev-${d} v${v}`, style: `left:${r.x * k}px;top:${r.y * k}px;width:${r.w * k}px;height:${r.h * k}px;--k:${k}` },
    UI33.app ? appScreen33(s, d, art.look) : home33(s, d, art.look));
  const name = d === 'phone' ? PHONE_NAME33[v as keyof typeof PHONE_NAME33] : PC_NAME33[v as keyof typeof PC_NAME33];
  return h('div', { class: 'ap33-wrap' },
    h('div', { class: 'ap33-cap' }, h('b', null, t(d === 'phone' ? l('Celular', 'Phone') : l('Computador', 'Computer'))), txt5(` · ${tl5(name)} · ${s.year}`),
      h('button', { type: 'button', class: 'ap33-x', onclick: close33 }, raw5('kbd', 'kb5', 'Esc'), t(l('fechar', 'close')))),
    h('div', { class: `ap33-dev dev-${d}`, style: `width:${art.p.w * k}px;height:${art.p.h * k}px` }, cv, scr));
}
/** O catálogo pelo correio aberto: folha de papel com as peças (a mesma compra a distância). */
function catalogSheet33(s: GameState): HTMLElement {
  const name = s.year < 1950 ? l('Catálogo pelo correio', 'Mail-order catalogue') : l('Catálogo de vendas pelo correio', 'Mail-order sales catalogue');
  return h('div', { class: 'ap33-wrap' },
    h('div', { class: 'ap33-cap' }, h('b', null, t(name)), txt5(` · ${s.year}`), h('button', { type: 'button', class: 'ap33-x', onclick: close33 }, raw5('kbd', 'kb5', 'Esc'), t(l('fechar', 'close')))),
    h('section', { class: 'ap33-cat', role: 'dialog', 'aria-label': t(name) }, h('header', null, h('b', null, t(name)), h('small', null, t(l('Encomende pelo correio: o pacote chega em semanas, pela porta da rua.', 'Order by post: the parcel arrives in weeks, at the front door.')))), appBody33(s, 'pc', 'compras')));
}
/** A camada inteira (o gancho DOCK5.over da casca chama a cada desenho). */
function over33(s: GameState): HTMLElement | null {
  const d = UI33.dev;
  if (!d) return null;
  if ((d === 'phone' && !phoneOk33(s)) || (d === 'pc' && !pcOk33(s))) { UI33.dev = undefined; stopGame(); return null; }
  const inner = d === 'cat' ? catalogSheet33(s) : device33(s, d);
  return h('div', { class: 'ap33', role: 'dialog', 'aria-modal': 'false', 'aria-label': t(d === 'phone' ? l('Celular', 'Phone') : d === 'pc' ? l('Computador', 'Computer') : l('Catálogo', 'Catalogue')),
    onclick: (e: Event) => { if (e.target === e.currentTarget) close33(); } }, inner);
}

// ---------------------------------------------------------------- botão CELULAR no menu de baixo

function dockBtn33(s: GameState): HTMLElement | null {
  if (!phoneOk33(s)) return null;
  const v = phoneV33(s.year)!;
  const on = UI33.dev === 'phone';
  const bang = devBang33(s, 'phone');
  const chord = key5('sys:phone')?.chord ?? 'shift+5';
  const ic = dock33Canvas(v, on ? 'lit' : 'idle', 3); ic.className = 'px';
  return h('button', { type: 'button', class: `b5-tr ap33-dock${on ? ' on' : ''}`, 'data-travel': 'celular', 'aria-pressed': on ? 'true' : 'false',
    title: `${t(l('Celular', 'Phone'))} (${chordLabel5(chord)})`, onclick: () => (on ? close33() : openPhone33()) },
    raw5('small', 'b5-k', chordLabel5(chord)), ic, h('span', null, t(l('Celular', 'Phone'))), bang ? raw5('i', 'bg5', bang > 9 ? '9+' : String(bang)) : null);
}

// ---------------------------------------------------------------- teclado (só com o aparelho aberto)

const KEYMAP33: Record<string, Key33> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', ' ': 'act', w: 'up', s: 'down', a: 'left', d: 'right' };
function onKey33(e: KeyboardEvent): void {
  if (!UI33.dev || !game()) return;
  const tg = e.target as HTMLElement | null;
  if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.isContentEditable)) return;
  const stop = () => { e.preventDefault(); e.stopImmediatePropagation(); };
  if (e.key === 'Escape') { stop(); back33(); return; }
  if (e.shiftKey && (e.key === '%' || e.code === 'Digit5')) return; // ⇧5 segue para a casca (abre/fecha o celular)
  if (UI33.game && !overOf33(UI33.game)) {
    const dig: Record<string, Key33> = { '2': 'up', '4': 'left', '6': 'right', '8': 'down', '5': 'act' }; // teclado do celular
    const k = KEYMAP33[e.key] ?? (UI33.game.k !== 'tap' && dig[e.key] ? dig[e.key] : /^[1-9]$/.test(e.key) ? (`n${e.key}` as Key33) : undefined);
    if (k) { stop(); gameKey33(k); }
    return;
  }
  const root = document.querySelector('.ap33');
  if (!root) return;
  const rows = [...root.querySelectorAll<HTMLButtonElement>('.ap33-row')];
  if (rows.length && !UI33.app && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { stop(); UI33.sel = (UI33.sel + (e.key === 'ArrowDown' ? 1 : -1) + rows.length) % rows.length; rerender(); return; }
  if (rows.length && !UI33.app && e.key === 'Enter') { stop(); rows[UI33.sel]?.click(); return; }
  if (/^[1-9]$/.test(e.key) && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
    const bs = [...root.querySelectorAll<HTMLButtonElement>(UI33.app ? '.ap33-a' : '.ap33-row, .ap33-app')].filter((b) => !b.disabled);
    const b = UI33.app ? [...root.querySelectorAll<HTMLButtonElement>('.ap33-a')][Number(e.key) - 1] : bs[Number(e.key) - 1];
    if (b) { stop(); if (!b.disabled) b.click(); }
  }
}
function onKeyUp33(e: KeyboardEvent): void { if (UI33.game?.k === 'tennis' && KEYMAP33[e.key] === UI33.held) UI33.held = undefined; }
if (typeof window !== 'undefined') { window.addEventListener('keydown', onKey33, true); window.addEventListener('keyup', onKeyUp33, true); }

// ---------------------------------------------------------------- objetos da mesa, cartões de ação e ganchos

registerObject5({ id: 'computador', label: l('Computador', 'Computer'), place: 'sede.sala', frame: 'tela', opens: [], links: [{ area: 'finance' }], era: [1982, 2040],
  note: l('Upgrade "Computador com planilha" do livro-caixa (1982+); "Ligar o PC" abre a tela do monitor (5 versões).', 'The ledger\'s "Computer with spreadsheet" upgrade (1982+); "Turn on the PC" opens the monitor screen (5 versions).') });
registerObject5({ id: 'catalogo', label: l('Catálogo pelo correio', 'Mail-order catalogue'), place: 'sede.sala', frame: 'revista', opens: [], links: [{ area: 'deco31' }], era: [1889, 1999],
  note: l('Compra a distância das lojas de decoração (decoshop31), com prazo de semanas.', 'Remote purchase from the decoration shops (decoshop31), with weeks of delivery.') });
SEDE_HAS5.computador = (s) => pcOk33(s);
SEDE_HAS5.catalogo = (s) => ap33On(s) && s.year <= 1999;
SEDE_ART5.set('pc33', { ...DESKPC_SIZE33, canvas: (y, st, k) => { const p = deskPc33(pcV33(y) ?? 1982, st); return upscale(p.canvas(), p.w * k, p.h * k); } });
SEDE_ART5.set('catalog33', { ...CATALOG_SIZE33, canvas: (y, st, k) => { const p = catalog33(y, st); return upscale(p.canvas(), p.w * k, p.h * k); } });

const U5 = (label: L, src: [string, string], fn: (...a: never[]) => unknown, call: (s: GameState) => void, o: Partial<typeof ACTS5[string]> = {}) => ({ label, kind: 'ui' as const, src, fn, run: (s: GameState, c: { close: () => void }) => { c.close(); call(s); }, ...o });
ACTS5['ap33.pc'] = U5(l('Ligar o PC', 'Turn on the PC'), ['ui/r33/aparelhos33', 'openPc33'], openPc33, () => openPc33());
ACTS5['ap33.email'] = U5(l('E-mails (caixa de entrada)', 'E-mail (inbox)'), ['ui/r33/aparelhos33', 'openPc33'], openPc33, () => openPc33('email'), { when: (s) => s.year >= 1995 });
ACTS5['ap33.planilha'] = U5(l('Planilha de vendas', 'Sales spreadsheet'), ['ui/r33/aparelhos33', 'openPc33'], openPc33, () => openPc33('planilha'));
ACTS5['ap33.demo'] = { label: l('Gravar demo caseira (1 ●)', 'Record a home demo (1 ●)'), kind: 'do', src: ['sim/r33/aparelhos33', 'homeDemo33'], fn: homeDemo33,
  when: (s) => s.year >= 1995, run: (s) => { const id = Object.keys(s.acts).find((x) => s.acts[x].owner === 'player'); const r = id ? homeDemo33(s, id) : { ok: false, text: l('Você ainda não tem artista no elenco.', 'You have no act on the roster yet.') }; return { text: r.text, bad: !r.ok }; },
  lock: (s) => (energyLeft(s) < 1 ? lock31(l('Sem tempo livre este mês.', 'No free time this month.'), UNLOCK31.time) : null) };
ACTS5['ap33.trocar'] = U5(l('Trocar de computador (loja)', 'Change computer (shop)'), ['ui/r31/deco5', 'openArrumar5'], openArrumar5, () => openArrumar5('sede'));
ACTS5['ap33.instalar'] = { label: l('Instalar computador na mesa', 'Install a computer on the desk'), kind: 'do', src: ['sim/r31/deco31', 'buyDeco31'], fn: buyDeco31,
  when: (s) => ap33On(s) && s.year >= 1982 && !pcInstalled33(s), lock: (s) => pcInstallLock33(s), run: (s) => installPc33(s) };
ACTS5['ap33.catalogo'] = U5(l('Folhear o catálogo', 'Leaf through the catalogue'), ['ui/r33/aparelhos33', 'openCatalog33'], openCatalog33, () => openCatalog33());
ACTS5['ap33.arrumar'] = U5(l('Arrumar o que chegou', 'Place what arrived'), ['ui/r31/deco5', 'openArrumar5'], openArrumar5, () => openArrumar5('sede'));
CARDS5.computador = { acts: ['ap33.pc', 'ap33.email', 'ap33.planilha', 'ap33.demo', 'ap33.trocar'], nums: ['caixa'],
  tip: l('Escritório · upgrade do livro-caixa (desde 1982)', 'Office · ledger upgrade (since 1982)') };
CARDS5.catalogo = { acts: ['ap33.catalogo', 'ap33.arrumar'], nums: ['caixa', 'pessoal'], tip: l('Compra a distância: chega pela porta da rua.', 'Remote purchase: it arrives at the front door.') };
if (CARDS5.livrocaixa && !CARDS5.livrocaixa.acts.includes('ap33.instalar')) CARDS5.livrocaixa.acts.push('ap33.instalar');

DOCK5.btns.push(dockBtn33);
DOCK5.over = over33;
DOCK5.esc = () => back33();
NAV5.phone = () => { const s = game(); if (!phoneOk33(s)) return false; if (UI33.dev === 'phone') close33(); else openPhone33(); return true; };
BANGS33.of = (s) => bangs5(s);
void CARD5; void object5; void $;
