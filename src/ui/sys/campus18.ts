import { hqFloors27 } from '../../sim/sys/hqrooms27';
// Rodada 18 (campus18) + Rodada 19 (world19) + Rodada 27 (D2): página "Nosso mundo" — o BAIRRO da sede em pixel
// art isométrica. R27: painel lateral FIXO (no celular, folha no rodapé): clicar num prédio mostra o que é, custo
// do mês, receita, quem está lá e 2–3 ações (ir para a tela, ampliar, vender) + "Mais opções" (reformar, estilo,
// mudar de lote, renomear…). Sem nada escolhido, o painel é a visão geral do bairro (seus prédios com o que está
// acontecendo, vizinhos e rivais com o que estão fazendo, lotes à venda que cabem no caixa). Ícone próprio por
// tipo, com contador de alertas e prazo de obra. Clicar na SEDE entra nela (Sede → Sua sede). O mapa cabe na tela.
// Lotes vazios "À venda": sempre pelo menos 3 (a cidade abre bairros novos quando falta terreno — DIST18); os que não
// cabem no caixa aparecem com a compra bloqueada e o motivo; os outros lotes livres viram cidade comum.
// Anima com requestAnimationFrame (~8 quadros/s) só enquanto visível; com "reduzir movimento", desenha parado.

import { cityById, l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import type { GameState } from '../../sim/types';
import {
  CONTRACTORS18, KIND18, LOTS18, STATE18, type Style18, ambient18, buildings18, campus18, decode18, dist18, layout18, lotsOpen18, styleName18, styleOf18, type Bld18,
} from '../../sim/sys/campus18';
import { act19, bldPop19, lotPop19, syn19, upkeep19, type Pop19, type PopAct19 } from '../../sim/sys/world19';
import { EV19, STAGE19, actEv19, buyNb19, evPop19, hoodStats19, live19ev, lmPop19, nb19, nbPop19 } from '../../sim/sys/hood19';
import { $, pill, rerender, section, toast } from '../common';
import { h } from '../dom';
import { why18 } from '../explain18';
import { COSTK20, NATURE20, priceBasis20, type CostKind20 } from '../../sim/sys/price20';
import { price20 } from '../price20';
import { buildScene18, drawFrame18, env18, iso, nightOf, signAt27, stylePreview19, type Scene18 } from '../pixel/campus18px';
import { ICON27, bldVis27, fillerLots27, forSale27, life27, lmPop27, mapLms27, nbInfo27, panel27, type BVis27, type NbInfo27, type Sale27 } from '../pixel/city27';
import { SEDE25 } from '../ps/nav25';
import { sedeNav25 } from '../ps/slot25';
import { registerArea } from '../registry';
import { store } from '../store';
import { go18 } from './inbox18';
import { endTour18 } from '../tutorial18';
import { chips, ic, stat } from '../vis';
import { cityEggs27, cityShake27, type CityEgg27 } from './eggs27';
import './campus18.css';
import { places27, type Place27 } from '../../sim/sys/place27';
import { PINNED27, PLACE_IC27, insideView27, ownPlace27, placePanel27, type InsideT27 } from './place27ui';
import { placeTabs27, zoom27 } from '../ps/zoom27';
import { askConfirm, askText } from '../ask31';
import { FEST_ID31, cityOv31, cityX31, festLine31, type CityOv31 } from '../r31/city31model';
import { drawCity31 } from '../r31/city31px';
import { coverPx } from '../art';
import { openRelease } from '../ficha';

/** r27 INT: sprite de ovo desenhado no quadro e sua caixa (coordenadas do mapa). */
interface Egg27Box { box: [number, number, number, number]; e: CityEgg27 }

const reduced = () => document.documentElement.classList.contains('reduced-motion') || !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const latOf = (s: GameState) => cityById[s.config.homeCity]?.lat ?? 40;
const tx = (x: L | string | undefined) => (x === undefined ? '' : typeof x === 'string' ? x : t(x));
const mobile = () => !!window.matchMedia?.('(max-width: 860px)').matches;

/** UI efêmera (por sessão; não vai para o save). */
const ui: { sty?: Style18; styFor?: string; pop?: string; year?: number; mode: 'cycle' | 'day' | 'night'; q: number; moving?: string; f: { mine: boolean; nb: boolean; lm: boolean }; legend?: boolean; z: number; px: number; py: number; /** r27 (CITY2): lugar aberto por dentro */ inside?: string; /** r27 (LOTS): largura do mapa já enquadrado no celular */ zFor?: number } =
  { mode: 'cycle', q: 1, f: { mine: true, nb: true, lm: true }, z: 1, px: 0, py: 0 };

interface View { s: GameState; bs: Bld18[]; scene: Scene18; year: number; live: boolean; vis: Map<string, BVis27>; sale: Sale27[]; nbs: NbInfo27[]; /** r27 (CITY2) */ places: Place27[]; /** R31 (H): camada da cidade da época */ ov?: CityOv31; festName?: string; bbHits?: { relId: string; box: [number, number, number, number] }[] }
/** r27: o que a vida na rua (fãs, imprensa) e o estado dos prédios (fila de show) já mostram sai do ambiente antigo. */
const AMB_DONE27 = new Set(['fans', 'press', 'show']);
function makeView(s: GameState, year?: number): View {
  const snap = year !== undefined ? campus18(s).snaps.find((x) => x.y === year) : undefined;
  const lms = mapLms27(s.config.homeCity, snap ? snap.y : s.year); // r27 (I2): marcos isométricos (os mais icônicos do ano)
  if (snap) {
    const bs = decode18(snap.b);
    const lots = new Map(bs.filter((b) => b.lot !== undefined).map((b) => [b.id, b.lot!] as [string, number]));
    return { s, bs, year: snap.y, live: false, vis: new Map(), sale: [], nbs: [], places: [], scene: buildScene18(bs, lots, env18(snap.y, 6, latOf(s), s.config.homeCity), [], hashSeed(s), brand18(s), [], lms) };
  }
  const bs = buildings18(s);
  const vis = bldVis27(s, bs);
  const sale = ui.moving ? [] : forSale27(s);
  const filler = ui.moving ? [] : fillerLots27(s, sale);
  const life = life27(s, bs);
  const nbs = nbInfo27(s);
  // r27 (CITY2): todo prédio que não é seu vira um lugar (vizinhos + cidade comum, com os básicos da música da época)
  // R31 (H): lugares reais nos terrenos reservados, festival do mês num terreno, lojas da época (place27 → city31)
  const cx = cityX31(s, filler);
  const places = [...places27(s, cx.filler, nb19(s), (n) => LOTS18[n]?.vis ?? 1), ...cx.places];
  const amb = [...ambient18(s).filter((a) => !AMB_DONE27.has(a.k)), ...live19ev(s).map((e) => ({ k: e.k as string, at: e.at, why: EV19[e.k].n })), ...cx.amb];
  const scene = buildScene18(bs, layout18(s, bs), env18(s.year, s.month, latOf(s), s.config.homeCity), amb, hashSeed(s), brand18(s), nb19(s).map((x) => ({ ...x, name: t(x.name) })), lms.filter((m) => !cx.lmOut.has(m.id)),
    { dist: dist18(s, bs), vis, sale, filler: cx.filler, life, saleTxt: t(l('À VENDA', 'FOR SALE')), hqFloors: hqFloors27(s), fillKind: new Map(places.filter((p) => p.src === 'fill' && p.lot >= 0).map((p) => [p.lot, p.draw])), extra31: cx.extra, minGw: cx.minGw });
  const ov = cityOv31(s, cx, places, scene.sprites.map((x) => ({ id: x.id, kind: x.kind, top: x.box[1] })), t(l('a', 'b')) === 'a');
  for (const b of ov.boards) { const r = s.releases[b.relId], a = r ? s.acts[r.actId] : undefined; if (r) b.cover = coverPx(r.coverSeed, r.title, a?.name ?? '', a?.genre ?? 'pop', r.year, 0.5, r.coverChoice).canvas(); }
  return { s, bs, year: s.year, live: true, vis, sale, nbs, places, scene, ov, festName: cx.festName };
}
/** Iniciais do selo (placa da sede e letreiro). */
export const brand18 = (s: GameState): string => (s.config.companyName.split(/\s+/).filter((w) => w.length > 2 || /^[A-Z]/.test(w)).map((w) => w[0]).join('').toUpperCase().slice(0, 3) || 'REC');
const hashSeed = (s: GameState) => { let x = 7; for (const c of s.config.seed) x = (x * 31 + c.charCodeAt(0)) >>> 0; return x % 9973; };

/** Canvas animado: ~8 quadros/s via requestAnimationFrame, só enquanto visível; parado com "reduzir movimento". */
function mapCanvas(v: View): HTMLCanvasElement {
  const { mw: MW, mh: MH } = v.scene.geo; // r27 (LOTS): o canvas cresce com a cidade
  const cv = h('canvas', { class: 'c18-cv px', width: MW, height: MH, style: `aspect-ratio:${MW} / ${MH}`, role: 'img', 'aria-label': t(l('Mapa do bairro com os seus prédios', 'Map of the neighbourhood with your buildings')) }) as HTMLCanvasElement;
  const ctx = cv.getContext('2d');
  if (!ctx) return cv;
  const nightFor = (tm: number) => (ui.mode === 'day' ? 0 : ui.mode === 'night' ? 1 : reduced() ? 0 : nightOf(tm));
  let tm0 = 0;
  // r27 INT: ovos do mapa — chão tremendo (cityShake27) e sprites (músico das 3h) com caixa clicável
  const eggs = ((cv as HTMLCanvasElement & { eggs27?: Egg27Box[] }).eggs27 = [] as Egg27Box[]);
  const city = v.s.config.homeCity;
  const hqSp = v.live ? v.scene.sprites.find((x) => v.bs.some((b) => b.id === x.id && b.kind === 'hq')) : undefined;
  const draw = (tm: number) => {
    tm0 = tm;
    const night = nightFor(tm);
    const [dx, dy] = v.live ? cityShake27(v.s, city, tm) : [0, 0];
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (dx || dy) { ctx.clearRect(0, 0, MW, MH); ctx.translate(dx, dy); }
    drawFrame18(ctx, v.scene, tm, night);
    if (v.ov) v.bbHits = drawCity31(ctx, v.scene, v.ov, tm, night); // R31 (H): lojas da época, letreiros, outdoors, festival, neon
    eggs.length = 0;
    if (v.live && hqSp) for (const f of cityEggs27) {
      const e = f(v.s, { t: tm, night, city });
      if (!e) continue;
      const x = Math.round(hqSp.door[0] + 12), y = Math.round(hqSp.door[1] - e.h + 3);
      e.draw(ctx, x, y, tm);
      eggs.push({ box: [x + dx, y + dy, e.w, e.h], e });
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  };
  draw(reduced() ? 3 : 0);
  (cv as HTMLCanvasElement & { redraw27?: () => void }).redraw27 = () => draw(tm0); // seleção mudou: redesenha uma vez
  if (reduced() || typeof requestAnimationFrame !== 'function') return cv;
  let visible = false, running = false, start = 0, last = 0;
  const loop = (now: number) => {
    if (!cv.isConnected && start) { running = false; io?.disconnect(); return; }
    if (!visible || document.hidden) { running = false; return; }
    if (!start) start = now;
    if (now - last >= 125) { last = now; draw((now - start) / 1000); }
    requestAnimationFrame(loop);
  };
  const kick = () => { if (!running && visible) { running = true; requestAnimationFrame(loop); } };
  const io = typeof IntersectionObserver === 'function' ? new IntersectionObserver((es) => { visible = es.some((x) => x.isIntersecting); kick(); }) : null;
  if (io) io.observe(cv); else { visible = true; kick(); }
  const onVis = () => { if (!cv.isConnected) { document.removeEventListener('visibilitychange', onVis); return; } kick(); };
  document.addEventListener('visibilitychange', onVis);
  return cv;
}

// ---------------------------------------------------------------- popup

/** Modelo do popup para um alvo (prédio, lote, vizinho, marco ou evento). */
function popFor(v: View, id: string): Pop19 | null {
  const s = v.s;
  if (!v.live) {
    if (id.startsWith('lm:')) return lmPop19(s, id.slice(3), v.year) ?? lmPop27(s.config.homeCity, id.slice(3), v.year);
    const b = v.bs.find((x) => x.id === id);
    return b ? { kind: 'bld', id, title: b.name, icon: KIND18[b.kind].icon, tags: [KIND18[b.kind].name, STATE18[b.st], styleName18(b.style ?? styleOf18(b.sy))], rows: [{ k: l('Estágio', 'Stage'), v: String(b.lvl) }], notes: [{ t: { pt: `Retrato de ${v.year}.`, en: `Snapshot from ${v.year}.` } }], acts: [], opts: [] } : null;
  }
  if (ui.styFor !== id) { ui.sty = undefined; ui.styFor = id; }
  if (id.startsWith('lot:')) return lotPop19(s, +id.slice(4), ui.q, ui.moving, ui.sty);
  if (id.startsWith('nb:')) return nbPop19(s, +id.slice(3));
  if (id.startsWith('lm:')) return lmPop19(s, id.slice(3)) ?? lmPop27(s.config.homeCity, id.slice(3), s.year);
  if (id.startsWith('ev:')) return evPop19(s, id.slice(3));
  return bldPop19(s, id, ui.q, ui.sty);
}

/** r19: seletor de estilo com miniatura, custo e efeito (só estilos que já existem no ano). */
function stylePick(p: Pop19, year: number, rerun: () => void): HTMLElement | null {
  if (!p.sty) return null;
  const cur = ui.sty ?? p.sty.cur, sel = p.sty.list.find((x) => x.id === cur) ?? p.sty.list[0];
  return h('div', { class: 'w19-sty' },
    h('b', { class: 'small' }, t(l('Estilo da fachada', 'Façade style'))),
    styRow(h('div', { class: 'w19-styl', role: 'radiogroup', 'aria-label': t(l('Estilo da fachada', 'Façade style')) }, p.sty.list.map((x) => {
      const c = stylePreview19(x.id, year); c.classList.add('px');
      return h('button', { type: 'button', role: 'radio', 'aria-checked': String(x.id === cur), class: x.id === cur ? 'on' : '', title: `${t(x.name)} — ${t(x.desc)}`, onclick: () => { ui.sty = x.id; rerun(); } },
        c, h('small', null, t(x.name)), h('small', { class: x.cost > 1 ? 'bad' : x.cost < 1 ? 'good' : 'muted' }, `×${x.cost}`));
    }))),
    sel ? h('small', { class: 'muted' }, `${t(sel.name)}: ${t(sel.eff)}`) : null);
}
/** Rola a fileira até o estilo marcado (sem mexer na página). */
function styRow(row: HTMLElement): HTMLElement {
  requestAnimationFrame?.(() => { const on = row.querySelector('.on') as HTMLElement | null; if (on) row.scrollLeft = Math.max(0, on.offsetLeft - row.offsetLeft - 8); });
  return row;
}

function contractorPick(rerun: () => void): HTMLElement {
  return h('div', { class: 'w19-seg', role: 'radiogroup', 'aria-label': t(l('Empreiteiro', 'Contractor')) },
    CONTRACTORS18.map((c, i) => h('button', { type: 'button', role: 'radio', 'aria-checked': String(ui.q === i), class: ui.q === i ? 'on' : '', title: t(c.desc), onclick: () => { ui.q = i; rerun(); } }, t(c.name))));
}

async function runAct(v: View, id: string, a: PopAct19, close: () => void, sty?: Style18): Promise<void> {
  const s = v.s;
  if (a.dis) { toast(t(a.dis), 'bad'); return; }
  if (a.go) { close(); go18(a.go); return; }
  if (a.confirm && !await askConfirm(t(a.confirm))) return;
  let e: L | null = null, ok: L = l('Feito.', 'Done.');
  if (a.ask === 'lot') { ui.moving = id; ui.pop = undefined; toast(t(l('Escolha um lote livre no mapa (marcado com +).', 'Pick a free lot on the map (marked with +).')), 'info'); rerender(); return; }
  if (a.ask === 'name') { const n = await askText({ title: l('Renomear prédio', 'Rename building'), label: l('Novo nome do prédio (vazio = nome original):', 'New building name (empty = original):'), default: v.bs.find((b) => b.id === id)?.name ?? '', allowEmpty: true }); if (n === null) return; e = act19(s, id, 'rename', { name: n }); ok = l('Nome trocado.', 'Renamed.'); }
  else if (a.id.startsWith('ev:')) { e = actEv19(s, id.slice(3), a.id.slice(3)); ok = l('Decidido.', 'Decided.'); ui.pop = undefined; }
  else if (a.id === 'buy') { e = buyNb19(s, +id.slice(3)); ok = l('Imóvel comprado: o lote é seu.', 'Property bought: the lot is yours.'); if (!e) ui.pop = `lot:${id.slice(3)}`; }
  else {
    e = act19(s, id, a.id, { q: ui.q, moving: ui.moving, sty: a.id === 'up' || a.id === 'reno' || a.id.startsWith('p:') || a.id.startsWith('v:') ? sty : undefined });
    ok = a.id === 'moveHere' ? l('Mudança contratada.', 'Move contracted.') : a.id === 'sell' ? l('Vendido.', 'Sold.') : a.id === 'up' ? l('Ampliação contratada.', 'Expansion contracted.') : a.id === 'reno' ? l('Reforma contratada.', 'Renovation contracted.') : a.id.startsWith('p:') || a.id.startsWith('v:') ? l('Obra contratada: a cerca já subiu no lote.', 'Works contracted: the fence is up on the lot.') : ok;
    if (!e && a.id === 'moveHere') { ui.pop = ui.moving; ui.moving = undefined; }
    if (!e && (a.id.startsWith('p:') || a.id.startsWith('v:'))) ui.pop = undefined;
    if (!e && a.id === 'sell') ui.pop = undefined;
  }
  toast(t(e ?? ok), e ? 'bad' : 'good');
  rerender();
}

/** r20c (N2): tipo de custo de cada ação do popup (reformar × ampliar × mudar × construir × comprar). */
function kind20(p: Pop19, a: PopAct19): CostKind20 | null {
  if (a.id === 'up') return p.id === 'hq' ? 'move' : 'expand';
  if (a.id === 'reno') return 'refit';
  if (a.id === 'move' || a.id === 'moveHere') return 'move';
  if (a.id === 'rush') return 'build';
  if (a.id === 'buy') return 'buy';
  return null;
}
const kindTag20 = (k: CostKind20 | null) => (k ? h('small', { class: 'muted', title: t(COSTK20[k].desc) }, ` [${t(COSTK20[k].name)} · ${t(NATURE20[COSTK20[k].nature])}]`) : null);
function costTxt(c?: number): string { return c === undefined ? '' : c < 0 ? `+${$(-c)}` : $(c); }

/** Corpo do popup (sem posição). */
function popBody(v: View, p: Pop19, close: () => void, rerun: () => void, bare = false): HTMLElement {
  const s = v.s;
  const anyQ = p.opts.some((o) => o.q) || p.acts.some((a) => a.ask === 'q');
  return h('div', { class: 'w19-pop-in' },
    bare ? null : h('header', null, h('b', null, ic(p.icon), ' ', tx(p.title)), h('button', { type: 'button', class: 'icon w19-x', 'aria-label': t(l('Fechar', 'Close')), onclick: close }, '✕')),
    h('div', { class: 'row wrap w19-tags' }, p.tags.map((x) => pill(tx(x)))),
    p.prog !== undefined ? h('div', { class: 'c18-bar', role: 'progressbar', 'aria-valuenow': Math.round(p.prog * 100), 'aria-valuemin': 0, 'aria-valuemax': 100 }, h('i', { style: `width:${Math.round(p.prog * 100)}%` })) : null,
    p.rows.length ? h('table', { class: 'c18-kpi small' }, p.rows.map((r) => h('tr', { class: r.tone ?? '' }, h('td', null, t(r.k)), h('td', null, r.why ? why18(s, r.why[0], r.why[1], tx(r.v)) : r.go ? h('button', { type: 'button', class: 'linklike', onclick: () => { close(); go18(r.go!); } }, tx(r.v), ' ↗') : tx(r.v))))) : null,
    p.notes.length ? h('ul', { class: 'w19-notes small' }, p.notes.map((n) => h('li', { class: n.tone ?? '' }, tx(n.t)))) : null,
    anyQ ? contractorPick(rerun) : null,
    stylePick(p, v.year, rerun),
    p.opts.length ? h('div', { class: 'w19-opts' }, h('b', { class: 'small' }, t(l('Construir aqui', 'Build here'))), p.opts.map((o) => h('div', { class: `w19-opt ${o.dis ? 'dis' : ''}` },
      h('div', { class: 'row' }, h('b', null, ic(o.icon), ' ', t(o.name)), h('span', { class: 'w19-cost' }, price20(s, o.cost, 'build'), ` · ${o.months} ${t(l('m', 'mo'))}`)), kindTag20('build'),
      h('small', { class: 'muted' }, t(o.effect)),
      o.syn.length ? h('small', { class: 'good' }, o.syn.map((x) => tx(x)).join(' · ')) : null,
      o.dis ? h('small', { class: 'bad' }, t(o.dis)) : null,
      h('button', { type: 'button', class: 'btn small primary', disabled: !!o.dis, 'aria-disabled': o.dis ? 'true' : undefined, onclick: () => runAct(v, p.id, { id: o.id, label: o.name, cost: o.cost }, close, ui.sty ?? p.sty?.cur) }, ic('building'), ' ', t(l('Construir', 'Build')))))) : null,
    // r27 (I2): rótulo e custo na 1ª linha, tipo de custo numa 2ª linha pequena; desabilitado = botão neutro legível
    p.acts.length ? h('div', { class: 'w19-acts' }, p.acts.map((a) => h('button', { type: 'button', class: `btn small c27-act ${a.dis ? 'ghost c27-dis' : a.tone === 'primary' ? 'primary' : a.tone === 'danger' ? 'danger ghost' : 'ghost'}`, disabled: !!a.dis, 'aria-disabled': a.dis ? 'true' : undefined, title: a.dis ? t(a.dis) : undefined,
      onclick: () => runAct(v, p.id, a, close, ui.sty ?? p.sty?.cur) },
      h('span', { class: 'c27-al' }, t(a.label), a.go ? ' ↗' : null),
      a.cost !== undefined ? h('span', { class: 'c27-ac', title: t(priceBasis20(s, Math.abs(a.cost))) }, costTxt(a.cost)) : null,
      kind20(p, a) ? h('span', { class: 'c27-ak' }, kindTag20(kind20(p, a))) : null))) : null,
    p.acts.some((a) => a.dis) ? h('ul', { class: 'w19-notes small muted' }, p.acts.filter((a) => a.dis).map((a) => h('li', null, `${t(a.label)}: ${t(a.dis!)}`))) : null);
}


// ---------------------------------------------------------------- r27: painel lateral

const chip27 = (icon: string, col: string, cls = '') => h('span', { class: `c27-chip ${cls}`, style: `--k:${col}`, 'aria-hidden': 'true' }, ic(icon));
/** Uma linha de status curta para o prédio (lista da visão geral e dica do mapa). */
function status27(v: View, b: Bld18): string {
  const x = v.vis.get(b.id);
  if (!x) return t(STATE18[b.st]);
  if (x.scaffold) return `${t(l('Obra', 'Works'))}${x.eta !== undefined ? ` · ${x.eta} ${t(l('m', 'mo'))}` : ''}`;
  if (x.marquee) return t(l('Noite de show', 'Show night'));
  if (x.smoke) return t(l('Prensando discos', 'Pressing records'));
  if (x.queueK === 'musicians') return t(l('Gravando agora', 'Recording now'));
  if (b.st === 'damaged') return t(STATE18.damaged);
  return t(STATE18[b.st]);
}
/** Entrar na sede: Sede → Sua sede (interior). */
function enterHq27(): void { sedeNav25.go(SEDE25); }

const kv = (k: L, v: string | HTMLElement, cls = '') => [h('dt', null, t(k)), h('dd', { class: cls }, v)];

/** Painel de um prédio seu: o que é, custo, receita, quem está lá, 2–3 ações + "Mais opções". */
function bldPanel(v: View, id: string, close: () => void, rerun: () => void, inside?: () => void): HTMLElement | null {
  const s = v.s;
  const pn = panel27(s, id, v.bs);
  const p = popFor(v, id);
  if (!pn || !p) return null;
  const x = v.vis.get(id);
  const b = v.bs.find((y) => y.id === id)!;
  const notes = [...(x?.why ?? []), ...pn.now.filter((n) => !(x?.why ?? []).some((w) => w.pt === n.pt))];
  const mainBtn = (a: PopAct19, i: number) => h('button', { type: 'button', class: `btn small ${i === 0 && !pn.enter ? 'primary' : a.tone === 'danger' ? 'danger ghost' : 'ghost'}`, disabled: !!a.dis, title: a.dis ? t(a.dis) : undefined,
    onclick: () => runAct(v, id, a, close, ui.sty ?? p.sty?.cur) }, t(a.id === 'go' ? l('Ir para a tela', 'Go to screen') : a.label), a.cost !== undefined ? h('small', null, ` ${costTxt(a.cost)}`) : null, a.go ? ' ↗' : null);
  return h('div', { class: 'c27-pn' },
    h('header', { class: 'c27-ph' }, chip27(pn.icon, pn.col), h('div', null, h('b', null, pn.title), h('small', { class: 'muted' }, `${t(pn.what)} · ${status27(v, b)}`)),
      h('button', { type: 'button', class: 'icon w19-x', 'aria-label': t(l('Fechar', 'Close')), onclick: close }, '✕')),
    p.prog !== undefined ? h('div', { class: 'c18-bar', role: 'progressbar', 'aria-valuenow': Math.round(p.prog * 100), 'aria-valuemin': 0, 'aria-valuemax': 100 }, h('i', { style: `width:${Math.round(p.prog * 100)}%` })) : null,
    h('dl', { class: 'c27-kv' },
      ...kv(l('Custo/mês', 'Cost/mo'), pn.cost !== undefined ? (pn.cost ? `−${$(pn.cost)}` : '$0') : '—', pn.cost ? 'bad' : ''),
      ...kv(l('Receita/mês', 'Income/mo'), pn.income !== undefined ? $(pn.income) : '—', pn.income ? 'good' : ''),
      ...kv(l('Quem está lá', 'Who\'s there'), pn.who.length ? pn.who.join(', ') : t(l('ninguém agora', 'nobody right now')))),
    notes.length ? h('ul', { class: 'w19-notes small' }, notes.map((n) => h('li', null, tx(n)))) : null,
    h('div', { class: 'c27-main-acts' },
      pn.enter ? h('button', { type: 'button', class: 'btn small primary', onclick: () => { close(); enterHq27(); } }, ic('house'), ' ', t(l('Entrar na sede', 'Enter the HQ'))) : null,
      b.kind === 'home' && v.live ? h('button', { type: 'button', class: 'btn small primary', onclick: () => { close(); go18({ area: 'casa31' }); } }, ic('door'), ' ', t(l('Entrar na casa', 'Enter your home'))) : null, // R31 (H)
      inside && v.live && ownPlace27(s, b) ? h('button', { type: 'button', class: 'btn small c2-enter', onclick: inside }, ic('door'), ' ', t(l('Ver por dentro', 'Look inside'))) : null, // r27 (CITY2)
      pn.main.map(mainBtn)),
    h('details', { class: 'c27-more' }, h('summary', null, t(l('Mais opções e números', 'More options and numbers'))), popBody(v, p, close, rerun, true)));
}

function nbPanel(v: View, id: string, close: () => void, rerun: () => void): HTMLElement | null {
  const lot = +id.slice(3), info = v.nbs.find((x) => x.lot === lot), p = popFor(v, id);
  if (!info || !p) return null;
  return h('div', { class: 'c27-pn' },
    h('header', { class: 'c27-ph' }, chip27(info.icon, info.k === 'rival' ? '#8a3a3a' : '#6a6a72', 'nb'), h('div', null, h('b', null, t(info.name)), h('small', { class: 'muted' }, info.k === 'rival' ? t(l('Gravadora rival', 'Rival label')) : t(l('Vizinho', 'Neighbour')))),
      h('button', { type: 'button', class: 'icon w19-x', 'aria-label': t(l('Fechar', 'Close')), onclick: close }, '✕')),
    h('dl', { class: 'c27-kv' }, ...kv(l('Quem é', 'Who'), t(info.who)), ...kv(l('Agora', 'Now'), t(info.doing))),
    popBody(v, p, close, rerun, true));
}

function lotPanel(v: View, id: string, close: () => void, rerun: () => void): HTMLElement | null {
  const lot = +id.slice(4), sl = v.sale.find((x) => x.lot === lot), p = popFor(v, id);
  if (!p) return null;
  return h('div', { class: 'c27-pn' },
    h('header', { class: 'c27-ph' }, chip27('building', '#c8302c', 'sale'), h('div', null, h('b', null, tx(p.title)), h('small', { class: 'muted' }, ui.moving ? t(l('Destino da mudança', 'Move destination')) : t(l('À venda', 'For sale')))),
      h('button', { type: 'button', class: 'icon w19-x', 'aria-label': t(l('Fechar', 'Close')), onclick: close }, '✕')),
    sl ? h('p', { class: 'small c27-sug' }, t(l('Sugestão: ', 'Suggestion: ')), ic(ICON27[sl.kind]?.ic ?? 'building'), ' ', h('b', null, t(sl.name)), ` · ${$(sl.price)}`) : null,
    sl?.dis ? h('p', { class: 'small bad c27-sug' }, t(l('Ainda não dá para comprar: ', 'Not buyable yet: ')), t(sl.dis)) : null,
    popBody(v, p, close, rerun, true));
}

/** Visão geral (nada escolhido): seus prédios com o que está acontecendo, vizinhos, lotes à venda. */
function overview27(v: View, open: (id: string) => void): HTMLElement {
  const s = v.s;
  const env = v.scene.env;
  const mine = v.bs.filter((b) => b.zone === 'campus' && b.st !== 'sold' && b.st !== 'closed');
  const sea = t(env.snow ? l('neve', 'snow') : env.rain ? l('chuva', 'rain') : env.season === 'winter' ? (env.climate === 'tropical' ? l('tempo seco', 'dry season') : l('inverno', 'winter')) : env.season === 'spring' ? l('primavera', 'spring') : env.season === 'summer' ? l('verão', 'summer') : l('outono', 'autumn'));
  const life = v.scene.life;
  const happen: string[] = [];
  if (life?.bus) happen.push(t(fmt27(l('Ônibus da turnê "{t}" saindo da sede', 'Tour bus "{t}" leaving the HQ'), { t: life.bus.tour })));
  if (life?.fansWhy) happen.push(t(life.fansWhy));
  if (life?.pressWhy) happen.push(t(life.pressWhy));
  return h('div', { class: 'c27-pn c27-ov' },
    h('header', { class: 'c27-ph' }, chip27('globe', '#3a7a9a'), h('div', null, h('b', null, t(cityById[s.config.homeCity]?.name ?? l('Sua cidade', 'Your city'))), h('small', { class: 'muted' }, `${v.year} · ${sea}`))),
    happen.length ? h('ul', { class: 'w19-notes small c27-happen' }, happen.map((x) => h('li', null, x))) : null,
    h('h4', null, t(l('Seus prédios', 'Your buildings'))),
    h('ul', { class: 'c27-list' }, mine.map((b) => {
      const x = v.vis.get(b.id), k = ICON27[b.kind];
      return h('li', null, h('button', { type: 'button', onclick: () => open(b.id) }, chip27(k.ic, k.col), h('span', { class: 'c27-tx' }, h('b', null, b.name), h('small', { class: 'muted' }, status27(v, b))),
        x?.alerts ? h('i', { class: 'c27-n', title: x.why.map((w) => t(w)).join(' · ') }, String(x.alerts)) : null));
    })),
    v.nbs.length ? [h('h4', null, t(l('Vizinhos e rivais', 'Neighbours and rivals'))), h('ul', { class: 'c27-list' }, v.nbs.map((n) => h('li', null, h('button', { type: 'button', onclick: () => open(`nb:${n.lot}`) }, chip27(n.icon, n.k === 'rival' ? '#8a3a3a' : '#6a6a72', 'nb'), h('span', { class: 'c27-tx' }, h('b', null, t(n.name)), h('small', { class: 'muted' }, t(n.doing)))))))] : null,
    // r27 (LOTS): sempre há lotes à venda (antes dos lugares da cidade, que cresceram com o mapa); os que não cabem no
    // caixa aparecem com o motivo (compra bloqueada)
    v.sale.length ? [h('h4', null, t(l('À venda', 'For sale'))), h('ul', { class: 'c27-list' }, v.sale.map((x) => h('li', null, h('button', { type: 'button', onclick: () => open(`lot:${x.lot}`) }, chip27(ICON27[x.kind]?.ic ?? 'building', x.dis ? '#8a8490' : '#c8302c', 'sale'), h('span', { class: 'c27-tx' }, h('b', null, t(LOTS18[x.lot].name)), h('small', { class: 'muted' }, `${t(x.name)} · ${$(x.price)}`), x.dis ? h('small', { class: 'bad' }, t(x.dis)) : null)))))]
      : v.live ? h('p', { class: 'small muted' }, t(l('A cidade não tem mais terreno livre: todos os bairros estão ocupados.', 'The city has no free land left: every district is taken.'))) : null,
    // r27 (CITY2): os lugares da cidade (loja, casa de shows, rádio, estúdio, jornal, prédios) — todos clicáveis
    v.places.some((p) => p.src === 'fill') ? [h('h4', null, t(l('Lugares da cidade', 'Places in town'))), h('ul', { class: 'c27-list' }, v.places.filter((p) => p.src === 'fill').map((p) => h('li', null, h('button', { type: 'button', onclick: () => open(p.id) },
      chip27(PLACE_IC27[p.k].ic, PLACE_IC27[p.k].col), h('span', { class: 'c27-tx' }, h('b', null, t(p.name)), h('small', { class: 'muted' }, `${t(p.what)}${p.also.length ? ' +' : ''} · ${t(p.now)}`))))))] : null,
    h('p', { class: 'small muted' }, t(l('Clique na sede para entrar nela. Toque num prédio, vizinho, placa "À venda" ou marco para ver detalhes e agir.', 'Click the HQ to step inside. Tap a building, neighbour, "For sale" sign or landmark to see details and act.'))));
}
const fmt27 = (x: L, o: Record<string, string | number>): L => ({ pt: x.pt.replace(/\{(\w+)\}/g, (_, k) => String(o[k] ?? '')), en: x.en.replace(/\{(\w+)\}/g, (_, k) => String(o[k] ?? '')) });

// ---------------------------------------------------------------- mapa com pontos clicáveis + painel

function mapFrame(v: View, side: HTMLElement): HTMLElement {
  const s = v.s;
  for (const old of document.querySelectorAll('body > .c27-sheet')) old.remove(); // folha antiga (celular) de um render anterior
  const { mw: MW, mh: MH } = v.scene.geo;
  const frame = h('div', { class: 'w19-frame c27-frame' });
  const vp = h('div', { class: 'w19-vp', style: `--ar:${(MW / MH).toFixed(4)}` });
  const zoom = h('div', { class: 'w19-zoom' });
  const layer = h('div', { class: 'w19-hot' });
  const tip = h('div', { class: 'c18-tip', hidden: true, role: 'tooltip' });
  const sheet = h('div', { class: 'c27-sheet', role: 'dialog', 'aria-modal': 'false', hidden: true });
  const pct = (x: number, w: number) => `${((x / w) * 100).toFixed(2)}%`;
  const cv = mapCanvas(v) as HTMLCanvasElement & { redraw27?: () => void };
  let lastHs: HTMLElement | null = null;
  const showOverview = () => { side.replaceChildren(overview27(v, (id) => open(id, layer.querySelector(`[data-id="${CSS.escape(id)}"]`) as HTMLElement | null))); };
  const close = () => {
    ui.pop = undefined; v.scene.sel = undefined; v.scene.selLot = undefined; cv.redraw27?.();
    sheet.hidden = true; sheet.replaceChildren(); document.body.classList.remove('w19-open');
    for (const x of layer.querySelectorAll('.w19-hs.on')) x.classList.remove('on');
    showOverview(); lastHs?.focus({ preventScroll: true });
  };
  const open = (id: string, hs: HTMLElement | null) => {
    const rerun = () => open(id, hs);
    const plc = v.places.find((x) => x.id === id); // r27 (CITY2): vizinho ou cidade comum = lugar com dono, gente e ações
    const body = !v.live || id.startsWith('lm:') || id.startsWith('ev:') ? null : plc ? placePanel27(s, plc, { close, openLot: (lot) => open(`lot:${lot}`, null), inside: () => goInside(id, hs),
        now: plc.k === 'label' ? v.nbs.find((x) => `nb:${x.lot}` === id)?.doing : undefined, more: id.startsWith('nb:') ? (() => { const p0 = popFor(v, id); return p0 && (p0.acts.length || p0.opts.length) ? popBody(v, p0, close, rerun, true) : null; })() : null })
      : id.startsWith('nb:') ? nbPanel(v, id, close, rerun) : id.startsWith('lot:') ? lotPanel(v, id, close, rerun) : v.bs.some((b) => b.id === id) ? bldPanel(v, id, close, rerun, () => goInside(id, hs)) : null;
    const p = body ? null : popFor(v, id);
    if (!body && !p) { close(); return; }
    ui.pop = id; lastHs = hs; tip.hidden = true;
    v.scene.sel = id.startsWith('pl:') ? `fl:${id.slice(3)}` : id; v.scene.selLot = id.startsWith('lot:') ? +id.slice(4) : undefined; cv.redraw27?.();
    for (const x of layer.querySelectorAll('.w19-hs.on')) x.classList.remove('on');
    hs?.classList.add('on');
    const content = body ?? h('div', { class: 'c27-pn' }, popBody(v, p!, close, rerun));
    endTour18();
    if (mobile()) { // celular: folha presa ao rodapé da tela; o mapa continua visível acima
      if (sheet.parentElement !== document.body) document.body.appendChild(sheet);
      sheet.replaceChildren(content); sheet.hidden = false; sheet.setAttribute('aria-label', tx(p?.title ?? ''));
      document.body.classList.add('w19-open');
      if (hs) { const r = hs.getBoundingClientRect(); if (r.top < 70 || r.bottom > window.innerHeight * 0.42) hs.scrollIntoView({ block: 'center' }); }
      (sheet.querySelector('button:not(.w19-x):not([disabled]), .w19-x') as HTMLElement | null)?.focus({ preventScroll: true });
    } else {
      side.replaceChildren(content);
      (side.querySelector('.c27-pn button:not([disabled])') as HTMLElement | null)?.focus({ preventScroll: true });
    }
  };
  /** Clique na sede: aproxima e entra (Sede → Sua sede). */
  const enter = (hs: HTMLElement) => {
    if (reduced()) { enterHq27(); return; }
    const r = hs.getBoundingClientRect(), vr = vp.getBoundingClientRect();
    zoom.style.transition = 'transform 280ms ease-in';
    const cx = r.left + r.width / 2 - vr.left, cy = r.top + r.height / 2 - vr.top;
    zoom.style.transformOrigin = `${cx - ui.px}px ${cy - ui.py}px`;
    zoom.style.transform = `translate(${ui.px}px, ${ui.py}px) scale(${ui.z * 2.6})`;
    setTimeout(() => { ui.z = 1; ui.px = 0; ui.py = 0; enterHq27(); }, 300);
  };
  // r27 (CITY2): entrar num lugar — aproxima no prédio e abre o corte por dentro; "Voltar à cidade" afasta
  const insideOf = (id: string): InsideT27 | null => {
    const plc = v.places.find((x) => x.id === id);
    if (plc) return { id, k: plc.k, name: t(plc.name), what: t(plc.what), people: plc.people, year: v.year, city: s.config.homeCity, seed: s.config.seed };
    const b = v.bs.find((x) => x.id === id), o = b ? ownPlace27(s, b) : null;
    return b && o ? { id, k: o.k, name: o.name, what: t(KIND18[b.kind].name), people: o.people, year: v.year, city: s.config.homeCity, seed: s.config.seed } : null;
  };
  let inBox: HTMLElement | null = null;
  const leaveInside = () => { ui.inside = undefined; inBox?.remove(); inBox = null; (layer.querySelector(`[data-id="${CSS.escape(ui.pop ?? '')}"]`) as HTMLElement | null)?.focus({ preventScroll: true }); };
  const showInside = (id: string, anim: boolean) => {
    const x = insideOf(id);
    if (!x) { ui.inside = undefined; return; }
    ui.inside = id; inBox?.remove();
    // celular: a folha de ações desce para o interior aparecer; "Ações" a traz de volta
    const mob = mobile();
    if (mob) { sheet.hidden = true; document.body.classList.remove('w19-open'); }
    inBox = insideView27(s, x, leaveInside, mob ? () => { if (ui.pop) open(ui.pop, lastHs); } : undefined);
    if (anim) inBox.classList.add('enter');
    vp.append(inBox);
    if (mob && anim) frame.scrollIntoView({ block: 'start' });
    if (anim) (inBox.querySelector('.c2-back') as HTMLElement | null)?.focus({ preventScroll: true });
  };
  const goInside = (id: string, hs: HTMLElement | null) => {
    if (!hs || reduced()) { showInside(id, false); return; }
    const r = hs.getBoundingClientRect(), vr = vp.getBoundingClientRect();
    zoom.style.transition = 'transform 240ms ease-in';
    zoom.style.transformOrigin = `${r.left + r.width / 2 - vr.left - ui.px}px ${r.top + r.height / 2 - vr.top - ui.py}px`;
    zoom.style.transform = `translate(${ui.px}px, ${ui.py}px) scale(${ui.z * 2.4})`;
    setTimeout(() => { zoom.style.transition = 'none'; zoom.style.transformOrigin = ''; apply(); showInside(id, true); }, 250);
  };
  const hot = (id: string, cls: string, box: [number, number, number, number], label: string, kids: (HTMLElement | string | null)[] = [], onClick?: (hs: HTMLElement) => void) => {
    const [x0, y0, x1, y1] = box;
    const b = h('button', { type: 'button', class: `w19-hs ${cls}`, 'data-id': id, 'aria-label': label, 'aria-haspopup': onClick ? undefined : 'dialog',
      style: `left:${pct(x0, MW)};top:${pct(y0, MH)};width:${pct(Math.max(6, x1 - x0), MW)};height:${pct(Math.max(6, y1 - y0), MH)}`,
      onclick: (e: Event) => { e.stopPropagation(); if (moved) return; const hs = e.currentTarget as HTMLElement; if (onClick) onClick(hs); else open(id, hs); },
      onmouseenter: (e: MouseEvent) => { const fr = frame.getBoundingClientRect(); tip.textContent = label; tip.hidden = false; tip.style.left = `${e.clientX - fr.left + 12}px`; tip.style.top = `${e.clientY - fr.top + 10}px`; },
      onmouseleave: () => { tip.hidden = true; } }, ...kids);
    layer.appendChild(b);
    return b;
  };
  const sc = v.scene;
  // prédios (seus e vizinhos), em ordem de profundidade; ícone próprio por tipo com alertas e prazo de obra
  for (const sp of sc.sprites) {
    if (sp.id === `fl:${FEST_ID31}` && v.festName) { hot(sp.id, 'fill', sp.box, `${t(festLine31(v.festName))} — ${t(l('abrir festivais', 'open festivals'))}`, [h('span', { class: 'c27-pin pl', style: '--k:#d07018', 'aria-hidden': 'true' }, ic('ticket'))], () => go18({ area: 'festivals' })); continue; }
    if (sp.filler) { // r27 (CITY2): a cidade comum também é lugar (loja, rádio, jornal, prédio, hotel…) — clicável
      const plc = ui.f.nb ? v.places.find((x) => x.id === `pl:${sp.id.slice(3)}`) : undefined;
      if (plc) hot(plc.id, 'fill', sp.box, `${t(plc.name)} · ${t(plc.what)} — ${t(plc.now)}`,
        [PINNED27.has(plc.k) ? h('span', { class: 'c27-pin pl', style: `--k:${PLACE_IC27[plc.k].col}`, 'aria-hidden': 'true' }, ic(PLACE_IC27[plc.k].ic)) : null]);
      continue;
    }
    if (sp.nb ? !ui.f.nb : !ui.f.mine) continue;
    const b = v.bs.find((x) => x.id === sp.id);
    const nb = sp.nb ? v.nbs.find((x) => `nb:${x.lot}` === sp.id) : undefined;
    const x = v.vis.get(sp.id);
    const label = b ? `${b.name} · ${t(KIND18[b.kind].name)} · ${status27(v, b)}${b.kind === 'hq' && v.live ? ` — ${t(l('clique para entrar', 'click to enter'))}` : ''}` : nb ? `${t(nb.name)} — ${t(nb.doing)}` : sp.id;
    const k = b ? ICON27[b.kind] : undefined;
    const pin = b && k ? h('span', { class: `c27-pin ${b.kind === 'hq' ? 'hq' : ''} ${x?.scaffold ? 'works' : ''} ${b.st === 'damaged' ? 'dmg' : ''}`, style: `--k:${k.col}`, 'aria-hidden': 'true' },
      ic(k.ic), x?.alerts ? h('b', { class: 'c27-n' }, String(x.alerts)) : null, x?.scaffold && x.eta !== undefined ? h('i', { class: 'c27-eta' }, `${x.eta}${t(l('m', 'mo'))}`) : null)
      : nb ? h('span', { class: `c27-pin nb ${nb.k === 'rival' ? 'rival' : ''}`, 'aria-hidden': 'true' }, ic(nb.icon), h('i', { class: 'c27-nm' }, t(nb.name).replace(/ \((escritório|office)\)$/, '').slice(0, 16))) : null;
    hot(sp.id, sp.nb ? 'nb' : 'mine', sp.box, label, [pin], b?.kind === 'hq' && v.live ? enter : undefined);
  }
  // R31 (H): outdoors das paradas — clicar abre a ficha da obra
  for (const b of v.bbHits ?? []) { const r = s.releases[b.relId]; if (r) hot(`bb:${b.relId}`, 'lm', b.box, `${t(l('Outdoor', 'Billboard'))}: "${r.title}" — ${s.acts[r.actId]?.name ?? ''}`, [], () => openRelease(b.relId)); }
  // marcos da cidade
  if (ui.f.lm) for (const m of sc.marks) { const lm = mapLms27(s.config.homeCity, v.year).find((x) => x.id === m.id); if (lm) hot(`lm:${m.id}`, 'lm', m.box, `${t(lm.n)} · ${lm.from > 0 ? lm.from : ''}`); }
  if (v.live && ui.f.mine) {
    if (ui.moving) { // mudança: todo lote livre é destino
      const used = new Set(layout18(s, v.bs).values()), nbl = new Set(nb19(s).map((x) => x.lot)), busy = new Set(campus18(s).proj.map((p) => p.lot)), open = lotsOpen18(s, v.bs);
      LOTS18.forEach((L0, i) => {
        if (i >= open || used.has(i) || nbl.has(i) || busy.has(i)) return;
        const [cx, cy] = iso(L0.gx + L0.w / 2, L0.gy + L0.d / 2);
        hot(`lot:${i}`, 'lot mv', [cx - 7, cy - 7, cx + 7, cy + 7], `${t(L0.name)} · ${t(l('mudar para cá', 'move here'))}`, ['→']);
      });
    } else for (const x of v.sale) { // r27: placas "À venda" (r27 LOTS: as que não cabem no caixa vêm apagadas, com o motivo)
      const L0 = LOTS18[x.lot];
      const [bx, by] = signAt27(x.lot), sg = sc.signs?.find((g) => g.lot === x.lot); // r27 (I2): placa erguida leva o ponto clicável junto
      hot(`lot:${x.lot}`, x.dis ? 'sale dis' : 'sale', sg ? [sg.x, sg.y, sg.x + sg.c.width, sg.y + 10] : [bx - 14, by - 19, bx + 14, by + 1], `${t(L0.name)} · ${t(l('à venda', 'for sale'))} · ${t(l('sugestão', 'suggestion'))}: ${t(x.name)} ${$(x.price)}${x.dis ? ` — ${t(x.dis)}` : ''}`,
        [h('span', { class: `c27-pin sale ${x.dis ? 'dis' : ''}`, 'aria-hidden': 'true' }, ic(ICON27[x.kind]?.ic ?? 'building'), h('i', { class: 'c27-nm' }, $(x.price)))]);
    }
    // eventos do bairro
    for (const e of live19ev(s)) { const sp = sc.sprites.find((x) => x.id === e.at); if (sp) hot(`ev:${e.id}`, 'ev', [sp.door[0] - 6, sp.door[1] - 2, sp.door[0] + 6, sp.door[1] + 10], `${t(EV19[e.k].n)} — ${t(l('decidir', 'decide'))}`, ['!']); }
  }
  // zoom e arraste (pinça no celular)
  const apply = () => { zoom.style.transform = `translate(${ui.px}px, ${ui.py}px) scale(${ui.z})`; };
  const clampPan = () => { const w = vp.clientWidth, hh = vp.clientHeight; ui.px = Math.min(0, Math.max(w - w * ui.z, ui.px)); ui.py = Math.min(0, Math.max(hh - hh * ui.z, ui.py)); };
  const setZ = (z: number, cx = vp.clientWidth / 2, cy = vp.clientHeight / 2) => { const nz = Math.max(1, Math.min(3, z)); ui.px = cx - ((cx - ui.px) * nz) / ui.z; ui.py = cy - ((cy - ui.py) * nz) / ui.z; ui.z = nz; clampPan(); apply(); };
  const pts = new Map<number, [number, number]>();
  let moved = false, d0 = 0, z0 = 1, start: [number, number, number, number] = [0, 0, 0, 0];
  vp.addEventListener('pointerdown', (e) => { pts.set(e.pointerId, [e.clientX, e.clientY]); moved = false; start = [e.clientX, e.clientY, ui.px, ui.py]; if (pts.size === 2) { const [a, b] = [...pts.values()]; d0 = Math.hypot(a[0] - b[0], a[1] - b[1]); z0 = ui.z; } });
  vp.addEventListener('pointermove', (e) => {
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (pts.size === 2) { const [a, b] = [...pts.values()]; const r = vp.getBoundingClientRect(); setZ(z0 * Math.hypot(a[0] - b[0], a[1] - b[1]) / Math.max(1, d0), (a[0] + b[0]) / 2 - r.left, (a[1] + b[1]) / 2 - r.top); moved = true; return; }
    if (ui.z > 1 && Math.hypot(e.clientX - start[0], e.clientY - start[1]) > 6) { moved = true; ui.px = start[2] + e.clientX - start[0]; ui.py = start[3] + e.clientY - start[1]; clampPan(); apply(); }
  });
  const up = (e: PointerEvent) => { pts.delete(e.pointerId); if (!pts.size) setTimeout(() => { moved = false; }, 0); };
  vp.addEventListener('pointerup', up); vp.addEventListener('pointercancel', up);
  vp.addEventListener('wheel', (e) => { if (!e.ctrlKey && ui.z === 1 && e.deltaY > 0) return; e.preventDefault(); const r = vp.getBoundingClientRect(); setZ(ui.z * (e.deltaY < 0 ? 1.2 : 1 / 1.2), e.clientX - r.left, e.clientY - r.top); }, { passive: false });
  // r27 INT: clique num ovo do mapa (o músico das 3h) — caixas guardadas pelo desenho do quadro
  const eggAt = (e: MouseEvent): Egg27Box | undefined => {
    const r = layer.getBoundingClientRect(); if (!r.width) return undefined;
    const mx = ((e.clientX - r.left) / r.width) * MW, my = ((e.clientY - r.top) / r.height) * MH;
    return ((cv as HTMLCanvasElement & { eggs27?: Egg27Box[] }).eggs27 ?? []).find((q) => mx >= q.box[0] - 2 && mx <= q.box[0] + q.box[2] + 2 && my >= q.box[1] - 2 && my <= q.box[1] + q.box[3] + 2);
  };
  // fase de captura: o sprite fica perto da porta da sede, e o clique nele não deve entrar na sede
  layer.addEventListener('click', (e) => { if (moved) return; const q = eggAt(e); if (!q?.e.onClick) return; e.stopPropagation(); e.preventDefault(); const r = q.e.onClick(s); if (r) { toast(t(r), 'good'); rerender(); } }, true);
  layer.addEventListener('mousemove', (e) => { const q = eggAt(e); layer.style.cursor = q ? 'pointer' : ''; if (q) layer.title = t(q.e.title); else if (layer.title) layer.title = ''; });
  zoom.append(cv, layer);
  vp.append(zoom);
  // r27 (LOTS): no celular, uma cidade maior que o centro abre aproximada na sede (pixel ~1:1, como o mapa de sempre);
  // a pinça ou o "−" mostram a cidade inteira. Só na 1ª vez para cada tamanho de mapa (depois vale o zoom do jogador).
  const autoZ = () => (mobile() ? Math.min(2.2, Math.max(1, MW / 300)) : 1);
  const centerHq = (z: number) => { const hq = layer.querySelector('[data-id="hq"]') as HTMLElement | null; if (!hq) return; ui.z = z; ui.px = vp.clientWidth / 2 - (hq.offsetLeft + hq.offsetWidth / 2) * z; ui.py = vp.clientHeight / 2 - (hq.offsetTop + hq.offsetHeight / 2) * z; clampPan(); };
  const arriving = zoom27.arrive;
  requestAnimationFrame?.(() => { if (!arriving && v.live && ui.zFor !== MW) { ui.zFor = MW; if (autoZ() > 1) centerHq(autoZ()); } clampPan(); apply(); });
  // barra sobre o mapa
  const modes: [typeof ui.mode, L][] = [['cycle', l('Dia e noite', 'Day & night')], ['day', l('Dia', 'Day')], ['night', l('Noite', 'Night')]];
  const tog = (k: keyof typeof ui.f, n: L) => h('button', { type: 'button', class: `btn small ${ui.f[k] ? '' : 'ghost'}`, 'aria-pressed': String(ui.f[k]), onclick: () => { ui.f[k] = !ui.f[k]; rerender(); } }, t(n));
  const bar = h('div', { class: 'w19-bar' },
    h('div', { class: 'w19-grp', role: 'group', 'aria-label': t(l('Filtro', 'Filter')) }, tog('mine', l('Meus', 'Mine')), tog('nb', l('Vizinhos', 'Neighbours')), tog('lm', l('Marcos', 'Landmarks'))),
    h('div', { class: 'w19-grp', role: 'group', 'aria-label': t(l('Luz', 'Light')) }, modes.map(([m, n]) => h('button', { type: 'button', class: `btn small ${ui.mode === m ? '' : 'ghost'}`, 'aria-pressed': String(ui.mode === m), onclick: () => { ui.mode = m; rerender(); } }, t(n)))),
    h('div', { class: 'w19-grp' },
      h('button', { type: 'button', class: 'btn small ghost', 'aria-label': t(l('Aproximar', 'Zoom in')), onclick: () => setZ(ui.z * 1.4) }, '+'),
      h('button', { type: 'button', class: 'btn small ghost', 'aria-label': t(l('Afastar', 'Zoom out')), onclick: () => setZ(ui.z / 1.4) }, '−'),
      h('button', { type: 'button', class: `btn small ${ui.legend ? '' : 'ghost'}`, 'aria-pressed': String(!!ui.legend), onclick: () => { ui.legend = !ui.legend; rerender(); } }, t(l('Legenda', 'Legend')))));
  const mv = ui.moving ? h('div', { class: 'w19-moving' }, ic('building'), ' ', t(l('Escolha um lote livre (→) para a mudança.', 'Pick a free lot (→) for the move.')), ' ',
    h('button', { type: 'button', class: 'btn small ghost', onclick: () => { ui.moving = undefined; rerender(); } }, t(l('Cancelar', 'Cancel')))) : null;
  frame.append(bar, mv ?? '', vp, tip);
  if (ui.legend) frame.append(legend());
  // fechar: Esc ou clique fora (folha do celular)
  const esc = (e: KeyboardEvent) => { if (!frame.isConnected) { document.removeEventListener('keydown', esc, true); return; } if (e.key === 'Escape' && ui.inside) { e.stopPropagation(); leaveInside(); return; } if (e.key === 'Escape' && ui.pop) { e.stopPropagation(); close(); } };
  document.addEventListener('keydown', esc, true);
  const outside = (e: Event) => {
    if (!frame.isConnected) { document.removeEventListener('pointerdown', outside, true); sheet.remove(); document.body.classList.remove('w19-open'); return; }
    if (!sheet.hidden && !sheet.contains(e.target as Node) && !(e.target as HTMLElement).closest?.('.w19-hs, .c2-in')) close();
  };
  document.addEventListener('pointerdown', outside, true);
  showOverview();
  if (ui.inside && v.live) showInside(ui.inside, false); // r27 (CITY2): continua por dentro depois de uma ação
  // r27 (CITY2): chegando da sede ("Ver a cidade"): o mapa abre aproximado na sede e se afasta até o bairro
  if (zoom27.arrive) {
    zoom27.arrive = false;
    ui.z = 1; ui.px = 0; ui.py = 0; ui.inside = undefined;
    const hq = layer.querySelector('[data-id="hq"]') as HTMLElement | null;
    if (hq && v.live && !reduced() && typeof requestAnimationFrame === 'function') requestAnimationFrame(() => {
      const r = hq.getBoundingClientRect(), vr = vp.getBoundingClientRect();
      zoom.style.transition = 'none';
      zoom.style.transformOrigin = `${r.left + r.width / 2 - vr.left}px ${r.top + r.height / 2 - vr.top}px`;
      zoom.style.transform = 'scale(2.6)';
      void zoom.offsetWidth;
      // r27 (LOTS): no celular com cidade grande, o afastamento para na sede enquadrada (mesma conta com a origem na sede)
      const ox = r.left + r.width / 2 - vr.left, oy = r.top + r.height / 2 - vr.top, z = autoZ();
      ui.zFor = MW;
      if (z > 1) centerHq(z);
      requestAnimationFrame(() => {
        zoom.style.transition = 'transform 560ms cubic-bezier(.2,.7,.2,1)';
        zoom.style.transform = `translate(${ui.px - ox * (1 - ui.z)}px, ${ui.py - oy * (1 - ui.z)}px) scale(${ui.z})`;
        setTimeout(() => { zoom.style.transition = ''; zoom.style.transformOrigin = ''; apply(); }, 600);
      });
    });
  }
  if (ui.pop) requestAnimationFrame?.(() => { const hs = layer.querySelector(`[data-id="${CSS.escape(ui.pop!)}"]`) as HTMLElement | null; if (ui.pop) open(ui.pop, hs); });
  return frame;
}

function legend(): HTMLElement {
  const ks = ['hq', 'studio', 'venue', 'fest', 'publisher', 'media', 'platform', 'booking', 'plant', 'school', 'museum', 'store', 'sign', 'dorm', 'park', 'home'] as const;
  return h('div', { class: 'w19-legend small' },
    h('b', null, t(l('Legenda', 'Legend'))),
    h('ul', null, ks.map((k) => h('li', null, chip27(ICON27[k].ic, ICON27[k].col), ' ', t(KIND18[k].name)))),
    h('p', { class: 'muted' }, t(l('Número vermelho = alertas; "3m" = meses de obra; placa "À venda" = lote livre (o tipo sugerido no ícone; letra cinza = ainda não cabe no caixa); cinza = vizinho, vinho = gravadora rival. Janelas acesas = gente trabalhando; fila na porta = sessão ou show; fumaça = fábrica prensando. Marcos da cidade ficam no horizonte.',
      'Red number = alerts; "3mo" = months of works; "For sale" sign = a free lot (suggested type on the icon; grey letters = not affordable yet); grey = neighbour, wine = rival label. Lit windows = people at work; queue at the door = session or show; smoke = plant pressing. City landmarks sit on the skyline.'))));
}

// ---------------------------------------------------------------- página

function campusArea(s: GameState): HTMLElement {
  const st = campus18(s);
  if (ui.year !== undefined && !st.snaps.some((x) => x.y === ui.year)) ui.year = undefined;
  if (ui.year !== undefined) ui.moving = undefined;
  const v = makeView(s, ui.year);
  const hs = hoodStats19(s);
  const campus = v.bs.filter((b) => b.zone === 'campus' && b.st !== 'sold' && b.st !== 'closed');
  const sy = v.live ? syn19(s, v.bs) : [];
  const upk = v.live ? campus.reduce((t0, b) => t0 + (upkeep19(s, b)?.v ?? 0), 0) : 0;
  const env = v.scene.env;
  const sum = chips(
    stat('building', campus.length, l('Seus prédios', 'Your buildings')),
    stat('sparkle', sy.filter((x) => !x.rule.neg).length, l('Vizinhanças boas', 'Good neighbours')),
    stat('hourglass', v.bs.filter((b) => b.st === 'building' || b.st === 'planned' || b.st === 'renovating').length, l('Em obras', 'Under works')),
    stat('coin', $(upk), l('Custo mensal', 'Monthly cost')),
    stat('calendar', t(env.snow ? l('Neve', 'Snow') : env.rain ? l('Chuva', 'Rain') : env.season === 'winter' ? (env.climate === 'tropical' ? l('Seco', 'Dry') : l('Inverno', 'Winter')) : env.season === 'spring' ? l('Primavera', 'Spring') : env.season === 'summer' ? l('Verão', 'Summer') : l('Outono', 'Autumn')), l('Tempo', 'Weather')));
  const snaps = st.snaps;
  const tl = snaps.length > 1 ? h('div', { class: 'c18-tl' },
    h('span', null, ic('hourglass'), ' ', t(l('Ver em', 'See in'))),
    h('input', { type: 'range', min: 0, max: snaps.length, value: ui.year === undefined ? snaps.length : snaps.findIndex((x) => x.y === ui.year), 'aria-label': t(l('Ano do mapa', 'Map year')),
      oninput: (e: Event) => { const i = +(e.target as HTMLInputElement).value; ui.year = i >= snaps.length ? undefined : snaps[i].y; ui.pop = undefined; rerender(); } }),
    h('b', null, ui.year === undefined ? `${s.year} (${t(l('agora', 'now'))})` : String(ui.year)),
    ui.year !== undefined ? h('button', { type: 'button', class: 'btn small ghost', onclick: () => { ui.year = undefined; rerender(); } }, t(l('Ao vivo', 'Live'))) : null)
    : h('p', { class: 'small muted' }, t(l('A linha do tempo ganha um retrato do quarteirão a cada virada de ano.', 'The timeline gets a snapshot of the block at every new year.')));
  const evs = v.live ? live19ev(s) : [];
  const side = h('aside', { class: 'c27-side', 'aria-label': t(l('Painel do bairro', 'Neighbourhood panel')), 'aria-live': 'polite' });
  return h('div', { class: 'c18 w19 c27' },
    section(`${t(l('Nosso mundo', 'Our world'))} — ${s.config.companyName}`,
      placeTabs27('city'), // r27 (CITY2): Sua sede | Nosso mundo — o mesmo lugar, por dentro e por fora
      h('p', { class: 'w19-hood' }, ic('house'), ' ', why18(s, 'h19.hood', {}, h('b', null, t(hs.h.n)), ` · ${t(STAGE19[hs.stage])}`), h('span', { class: 'muted small' }, ` — ${t(hs.h.d)}${hs.note ? ` ${t(hs.note)}` : ''}`)),
      sum,
      h('div', { class: 'c27-main' }, h('div', { class: 'c27-mapcol' }, mapFrame(v, side), tl), side)),
    v.live && (sy.length || evs.length) ? section(t(l('Vizinhança', 'Neighbourhood')),
      h('ul', { class: 'small w19-list' },
        sy.map((x) => h('li', { class: x.rule.neg ? 'bad' : 'good' }, h('b', null, t(x.rule.name)), ` — ${t(x.rule.eff)}`)),
        evs.map((e) => h('li', { class: 'warn' }, ic('warning'), ' ', h('button', { type: 'button', class: 'linklike', onclick: () => { ui.pop = `ev:${e.id}`; rerender(); } }, t(EV19[e.k].n)), ` — ${t(EV19[e.k].d)}`)))) : null,
    st.log.length ? h('details', { class: 'card w19-log' }, h('summary', null, t(l('Diário de obras e do bairro', 'Works and neighbourhood log'))),
      h('ul', { class: 'small' }, st.log.slice(-10).reverse().map((x) => h('li', null, `${x.y}/${x.m + 1} — ${t(x.t)}`)))) : null);
}

/** Miniatura (sem animação) para o Cockpit: clique abre a página. */
export function campusThumb18(s: GameState): HTMLElement {
  const v = makeView(s);
  const { mw: MW, mh: MH } = v.scene.geo;
  const cv = h('canvas', { class: 'c18-thumb px', width: MW, height: MH, style: `aspect-ratio:${MW} / ${MH}`, role: 'img', 'aria-label': t(l('Nosso mundo (miniatura)', 'Our world (thumbnail)')) }) as HTMLCanvasElement;
  const ctx = cv.getContext('2d');
  if (ctx) drawFrame18(ctx, v.scene, 3, 0);
  const hs = hoodStats19(s), ev = live19ev(s).length;
  return h('button', { type: 'button', class: 'c18-thumbbtn', title: t(l('Abrir Nosso mundo', 'Open Our world')), onclick: () => { store.area = 'campus18' as typeof store.area; rerender(); } }, cv,
    h('small', { class: 'muted' }, `${t(hs.h.n)} · ${t(STAGE19[hs.stage])}${ev ? ` · ${ev} ${t(l('evento(s) no bairro', 'neighbourhood event(s)'))}` : ''}`));
}

registerArea({ id: 'campus18', label: l('Nosso mundo', 'Our world'), icon: 'skyline', key: '', render: campusArea,
  badge: (s) => campus18(s).proj.filter((p) => p.left <= 1).length + live19ev(s).length || Object.keys(campus18(s).dmg).length || undefined });
