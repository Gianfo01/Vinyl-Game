// Rodada 18 (campus18): página "Nosso mundo" (Empresa › Sede e equipe, a primeira da seção). Mapa isométrico
// em pixel art dos quarteirões da cidade-sede com tudo o que o jogador possui, faixa "pelo mundo", linha do
// tempo (retratos anuais), inspetor do prédio (KPIs, equipe, atividade, atalho para a página de gestão — sem
// duplicar lógica), obras próprias (lote, empreiteiro, prazo, risco) e reforma. O Cockpit mostra uma miniatura.
// Desenha só quando a página está aberta; anima só enquanto o mapa está visível (≈10 qps), e para sozinho.

import { cityById, l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import type { GameState } from '../../sim/types';
import {
  CONTRACTORS18, KIND18, LOTS18, PROJ18, STATE18, STYLES18, ambient18, buildings18, campus18, cancelProj18, decode18, freeLots18, layout18, projCost18,
  renoMonths18, rushProj18, startProj18, styleName18, styleOf18, type Bld18, type PKind,
} from '../../sim/sys/campus18';
import { subName18 } from '../../sim/sys/regions18';
import { $, pill, rerender, section, toast } from '../common';
import { h, select } from '../dom';
import { MH, MW, buildScene18, drawFrame18, env18, nightOf, worldCanvas18, type Scene18 } from '../pixel/campus18px';
import { registerArea } from '../registry';
import { store } from '../store';
import { go18 } from './inbox18';
import { chips, ic, stat } from '../vis';
import './campus18.css';

const reduced = () => document.documentElement.classList.contains('reduced-motion') || !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const latOf = (s: GameState) => cityById[s.config.homeCity]?.lat ?? 40;
const say = (e: L | null, ok: L) => { toast(t(e ?? ok), e ? 'bad' : 'good'); rerender(); };
const cityLabel = (c: string) => (c.startsWith('@') ? t(subName18(c.slice(1))) : t(cityById[c]?.name ?? l(c)));

/** UI efêmera (por sessão de página; não vai para o save). */
const ui: { hl?: boolean; sel?: string; year?: number; mode: 'cycle' | 'day' | 'night'; pk: Exclude<PKind, 'reno'>; lot: number; q: number; rq: number } = { mode: 'cycle', pk: 'store', lot: -1, q: 1, rq: 1 };

interface View { s: GameState; bs: Bld18[]; scene: Scene18; year: number; live: boolean }
function makeView(s: GameState, year?: number): View {
  const snap = year !== undefined ? campus18(s).snaps.find((x) => x.y === year) : undefined;
  if (snap) {
    const bs = decode18(snap.b);
    const lots = new Map(bs.filter((b) => b.lot !== undefined).map((b) => [b.id, b.lot!] as [string, number]));
    return { s, bs, year: snap.y, live: false, scene: buildScene18(bs, lots, env18(snap.y, 6, latOf(s)), [], hashSeed(s), brand18(s)) };
  }
  const bs = buildings18(s);
  const amb = ambient18(s);
  return { s, bs, year: s.year, live: true, scene: buildScene18(bs, layout18(s, bs), env18(s.year, s.month, latOf(s)), amb, hashSeed(s), brand18(s)) };
}
/** Iniciais do selo (placa da sede e letreiro). */
export const brand18 = (s: GameState): string => (s.config.companyName.split(/\s+/).filter((w) => w.length > 2 || /^[A-Z]/.test(w)).map((w) => w[0]).join('').toUpperCase().slice(0, 3) || 'REC');
const hashSeed = (s: GameState) => { let x = 7; for (const c of s.config.seed) x = (x * 31 + c.charCodeAt(0)) >>> 0; return x % 9973; };

/** Canvas animado (para enquanto visível; para sozinho quando sai do DOM). */
function mapCanvas(v: View, onPick: (id: string | null) => void, onHover: (id: string | null, x: number, y: number) => void): HTMLCanvasElement {
  const cv = h('canvas', { class: 'c18-cv px', width: MW, height: MH, role: 'img', 'aria-label': t(l('Mapa dos seus prédios', 'Map of your buildings')) }) as HTMLCanvasElement;
  const ctx = cv.getContext('2d');
  if (!ctx) return cv;
  const nightFor = (tm: number) => (ui.mode === 'day' ? 0 : ui.mode === 'night' ? 1 : reduced() ? 0 : nightOf(tm));
  const draw = (tm: number) => drawFrame18(ctx, v.scene, tm, nightFor(tm));
  draw(0);
  const pick = (e: MouseEvent): string | null => {
    const r = cv.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * MW, y = ((e.clientY - r.top) / r.height) * MH;
    for (let i = v.scene.sprites.length - 1; i >= 0; i--) {
      const sp = v.scene.sprites[i], [x0, y0, x1, y1] = sp.box;
      if (x >= x0 && x <= x1 && y >= y0 && y <= y1) {
        // pixel opaco do sprite (clique preciso)
        const c2 = sp.c.getContext('2d')?.getImageData(Math.floor(x - sp.x), Math.floor(y - sp.y), 1, 1).data;
        if (!c2 || c2[3] > 20) return sp.id;
      }
    }
    return null;
  };
  cv.addEventListener('click', (e) => onPick(pick(e)));
  cv.addEventListener('mousemove', (e) => { const r = cv.getBoundingClientRect(); onHover(pick(e), e.clientX - r.left, e.clientY - r.top); });
  cv.addEventListener('mouseleave', () => onHover(null, 0, 0));
  if (reduced() || typeof requestAnimationFrame !== 'function') return cv;
  let visible = false, running = false, start = 0, last = 0;
  const loop = (now: number) => {
    if (!cv.isConnected && start) { running = false; io?.disconnect(); return; }
    if (!visible || document.hidden) { running = false; return; }
    if (!start) start = now;
    if (now - last >= 100) { last = now; draw((now - start) / 1000); }
    requestAnimationFrame(loop);
  };
  const kick = () => { if (!running && visible) { running = true; requestAnimationFrame(loop); } };
  const io = typeof IntersectionObserver === 'function' ? new IntersectionObserver((es) => { visible = es.some((x) => x.isIntersecting); kick(); }) : null;
  if (io) io.observe(cv); else { visible = true; kick(); }
  return cv;
}

// ---------------------------------------------------------------- inspetor

function inspector(v: View, id: string | undefined): HTMLElement {
  const s = v.s;
  const b = v.bs.find((x) => x.id === id);
  if (!b) return h('div', { class: 'c18-insp muted' },
    h('p', null, t(l('Clique num prédio para ver números, equipe, o que está acontecendo e ir para a página de gestão.', 'Click a building to see figures, staff, what is going on, and jump to its management page.'))),
    h('p', { class: 'small' }, t(l('O estilo de cada prédio é o da época em que foi construído ou reformado: um selo antigo vira um bairro de várias épocas.', 'Each building wears the style of the year it was built or renovated: an old label becomes a neighbourhood of many eras.'))));
  const st = styleOf18(b.sy);
  const amb = v.live ? ambient18(s).filter((a) => a.at === b.id) : [];
  const stCls = b.st === 'open' ? 'good' : b.st === 'damaged' || b.st === 'sold' || b.st === 'closed' ? 'bad' : 'warn';
  const reno = v.live && (b.st === 'open' || b.st === 'damaged') && !b.id.startsWith('c:') ? renoBox(s, b) : null;
  return h('div', { class: 'c18-insp' },
    h('h4', null, ic(KIND18[b.kind].icon), ' ', b.name),
    h('div', { class: 'row wrap' }, pill(t(KIND18[b.kind].name)), pill(t(STATE18[b.st]), stCls), pill(`${t(l('tamanho', 'size'))} ${b.lvl}`), pill(t(styleName18(st))), b.zone === 'world' ? pill(cityLabel(b.city)) : null),
    h('p', { class: 'small muted' }, `${t(l('Desde', 'Since'))} ${b.since}${b.sy !== b.since ? ` · ${t(l('estilo de', 'style from'))} ${b.sy}` : ''} · ${t(STYLES18.find((x) => x.id === st)!.desc)}`),
    b.prog !== undefined && (b.st === 'building' || b.st === 'renovating' || b.st === 'planned') ? h('div', { class: 'c18-bar' }, h('i', { style: `width:${Math.round(b.prog * 100)}%` })) : null,
    b.kpi?.length ? h('table', { class: 'c18-kpi small' }, b.kpi.map(([k, x]) => h('tr', null, h('td', null, t(k)), h('td', null, x)))) : null,
    b.staff !== undefined ? h('p', { class: 'small' }, ic('people'), ` ${t(l('Equipe', 'Staff'))}: ${b.staff}`) : null,
    b.now ? h('p', { class: 'small' }, ic('clock'), ' ', t(b.now)) : null,
    b.note ? h('p', { class: 'small bad' }, ic('warning'), ' ', t(b.note)) : null,
    amb.map((a) => h('p', { class: 'small' }, ic(a.k === 'fans' ? 'fans' : a.k === 'protest' ? 'megaphone' : a.k === 'police' ? 'warning' : a.k === 'press' ? 'camera' : a.k === 'smoke' ? 'fire' : 'ticket'), ' ', t(a.why))),
    v.live && b.goto && b.goto.area !== 'campus18' ? h('button', { class: 'btn small primary', onclick: () => go18(b.goto!) }, t(l('Abrir gestão', 'Open management')), ' ↗') : null,
    reno);
}

function renoBox(s: GameState, b: Bld18): HTMLElement {
  const c = projCost18(s, 'reno', -1, ui.rq, b), m = Math.max(1, renoMonths18(b) - (ui.rq === 0 ? 1 : 0));
  const dmg = !!campus18(s).dmg[b.id];
  return h('div', { class: 'c18-reno' },
    h('b', null, t(dmg ? l('Reconstruir', 'Rebuild') : l('Reformar e modernizar', 'Renovate and modernize'))),
    h('p', { class: 'small muted' }, t(fmt(l('Fachada passa a ser {s}. {d}', 'The façade becomes {s}. {d}'), { s: t(styleName18(styleOf18(s.year))), d: t(dmg ? l('Acaba o aluguel provisório.', 'Ends the temporary rent.') : l('+1 reputação institucional.', '+1 institutional reputation.')) }))),
    select(ui.rq, CONTRACTORS18.map((x, i) => ({ value: i, label: t(x.name) })), (v) => { ui.rq = v; rerender(); }),
    h('p', { class: 'small' }, `${$(c)} · ${m} ${t(l('meses', 'months'))} · ${t(l('entrada', 'down'))} ${$(Math.round(c * 0.3))}`),
    h('button', { class: 'btn small', onclick: () => say(startProj18(s, 'reno', -1, ui.rq, b.id), l('Reforma contratada.', 'Renovation contracted.')) }, t(l('Contratar reforma', 'Hire renovation'))));
}
const fmt = (x: L, p: Record<string, string>): L => ({ pt: x.pt.replace(/\{(\w+)\}/g, (_, k) => p[k] ?? ''), en: x.en.replace(/\{(\w+)\}/g, (_, k) => p[k] ?? '') });

// ---------------------------------------------------------------- obras

function works(s: GameState, v: View, setHl: (n?: number) => void): HTMLElement {
  const st = campus18(s);
  const kinds = (Object.keys(PROJ18) as Exclude<PKind, 'reno'>[]).filter((k) => !st.built[k] && !st.proj.some((p) => p.kind === k));
  const lots = freeLots18(s);
  if (!kinds.includes(ui.pk)) ui.pk = kinds[0] ?? 'store';
  if (!lots.includes(ui.lot)) ui.lot = lots[0] ?? -1;
  const cur = st.proj.map((p) => {
    const name = p.kind === 'reno' ? `${t(l('Reforma', 'Renovation'))}: ${v.bs.find((b) => b.id === p.target)?.name ?? p.target}` : t(PROJ18[p.kind].name);
    const prog = 1 - p.left / Math.max(1, p.months);
    return h('div', { class: 'c18-proj' },
      h('b', null, name), ' ', pill(t(CONTRACTORS18[p.q].name)), p.delays ? pill(`${t(l('atrasos', 'delays'))} ${p.delays}`, 'warn') : null, p.over ? pill(`${t(l('estouro', 'overrun'))} ${$(p.over)}`, 'bad') : null,
      h('div', { class: 'c18-bar' }, h('i', { style: `width:${Math.round(prog * 100)}%` })),
      h('small', { class: 'muted' }, `${p.left} ${t(l('meses restantes', 'months left'))} · ${t(l('pago', 'paid'))} ${$(p.paid)} / ${$(p.cost + p.over)}`), ' ',
      p.left > 1 ? h('button', { class: 'btn small ghost', onclick: () => say(rushProj18(s, p.id), l('Hora extra: um mês a menos.', 'Overtime: one month less.')) }, `${t(l('Hora extra', 'Overtime'))} (${$(Math.round(p.cost * 0.12))})`) : null,
      h('button', { class: 'btn small ghost', onclick: () => { if (confirm(t(l('Cancelar a obra? O que foi pago não volta.', 'Cancel the works? What was paid is lost.')))) say(cancelProj18(s, p.id), l('Obra cancelada.', 'Works cancelled.')); } }, t(l('Cancelar', 'Cancel'))));
  });
  let form: HTMLElement;
  if (!kinds.length) form = h('p', { class: 'muted small' }, t(l('Todas as obras do campus já foram feitas. Reformas: clique num prédio.', 'All campus works are done. Renovations: click a building.')));
  else if (!lots.length) form = h('p', { class: 'muted small' }, t(l('Não há lote livre no campus. Venda algo ou amplie a sede (ela ocupa a esquina principal).', 'No free lot on campus. Sell something or grow the HQ (it holds the main corner).')));
  else {
    const def = PROJ18[ui.pk], c = CONTRACTORS18[ui.q], lot = LOTS18[ui.lot];
    const cost = projCost18(s, ui.pk, ui.lot, ui.q), months = Math.max(1, def.months - (ui.q === 0 ? 1 : 0));
    const pDelay = Math.round((1 - Math.pow(1 - c.delay / Math.max(2, months / 2), months)) * 100);
    form = h('div', { class: 'c18-form' },
      h('label', null, t(l('Obra', 'Project')), ' ', select(ui.pk, kinds.map((k) => ({ value: k, label: t(PROJ18[k].name) })), (x) => { ui.pk = x; rerender(); })),
      h('label', null, t(l('Lote', 'Lot')), ' ', select(ui.lot, lots.map((n) => ({ value: n, label: `${t(LOTS18[n].name)} · ×${LOTS18[n].pm} ${t(l('preço', 'price'))} · ${t(l('visibilidade', 'visibility'))} ${LOTS18[n].vis}` })), (x) => { ui.lot = x; ui.hl = true; setHl(x); rerender(); })),
      h('label', null, t(l('Empreiteiro', 'Contractor')), ' ', select(ui.q, CONTRACTORS18.map((x, i) => ({ value: i, label: t(x.name) })), (x) => { ui.q = x; rerender(); })),
      h('p', { class: 'small' }, t(def.desc)),
      h('p', { class: 'small' }, ic('sparkle'), ' ', t(def.effect)),
      h('p', { class: 'small muted' }, t(c.desc)),
      chips(stat('money', $(cost), l('Contrato', 'Contract')), stat('calendar', `${months} m`, l('Prazo', 'Time')), stat('warning', `${pDelay}%`, l('Chance de atraso', 'Delay chance')), stat('coin', $(Math.round(cost * 0.3)), l('Entrada (30%)', 'Down payment (30%)'))),
      h('p', { class: 'small muted' }, t(fmt(l('Lote "{n}": preço ×{p}, visibilidade {v} (loja e letreiro rendem mais em lote visível). Pagamentos entram como investimento (capex) no extrato; atrasos chegam na caixa de entrada com a opção de pagar hora extra.', 'Lot "{n}": price ×{p}, visibility {v} (store and sign yield more on a visible lot). Payments are booked as investing (capex); delays arrive in your inbox with an overtime option.'), { n: t(lot.name), p: String(lot.pm), v: String(lot.vis) }))),
      h('button', { class: 'btn primary', onclick: () => say(startProj18(s, ui.pk, ui.lot, ui.q), l('Obra contratada: a cerca já subiu no lote.', 'Works contracted: the fence is up on the lot.')) }, ic('building'), ' ', t(l('Contratar obra', 'Hire the works'))));
  }
  return section(t(l('Obras', 'Construction')), cur.length ? h('div', null, cur) : null, form);
}

// ---------------------------------------------------------------- página

function campusArea(s: GameState): HTMLElement {
  const st = campus18(s);
  if (ui.year !== undefined && !st.snaps.some((x) => x.y === ui.year)) ui.year = undefined;
  const v = makeView(s, ui.year);
  const host = h('div', { class: 'c18-mapwrap' });
  const tip = h('div', { class: 'c18-tip', hidden: true });
  const insp = h('div', { class: 'c18-side' }, inspector(v, ui.sel));
  const setHl = (n?: number) => { v.scene.hl = n; };
  if (v.live && ui.hl && ui.lot >= 0) v.scene.hl = ui.lot;
  const mount = () => host.replaceChildren(mapCanvas(v, (id) => { ui.sel = id ?? undefined; insp.replaceChildren(inspector(v, ui.sel)); }, (id, x, y) => {
    const b = v.bs.find((z) => z.id === id);
    if (!b) { tip.hidden = true; return; }
    tip.textContent = `${b.name} · ${t(STATE18[b.st])}`; tip.hidden = false; tip.style.left = `${x + 12}px`; tip.style.top = `${y + 8}px`;
  }), tip);
  mount();
  // linha do tempo
  const snaps = st.snaps;
  const tl = snaps.length ? h('div', { class: 'c18-tl' },
    h('span', null, ic('hourglass'), ' ', t(l('Linha do tempo', 'Timeline'))),
    h('input', { type: 'range', min: 0, max: snaps.length, value: ui.year === undefined ? snaps.length : snaps.findIndex((x) => x.y === ui.year), 'aria-label': t(l('Ano do mapa', 'Map year')),
      oninput: (e: Event) => { const i = +(e.target as HTMLInputElement).value; ui.year = i >= snaps.length ? undefined : snaps[i].y; rerender(); } }),
    h('b', null, ui.year === undefined ? `${s.year} (${t(l('agora', 'now'))})` : String(ui.year)),
    ui.year !== undefined ? h('button', { class: 'btn small ghost', onclick: () => { ui.year = undefined; rerender(); } }, t(l('Ao vivo', 'Live'))) : null)
    : h('p', { class: 'small muted' }, t(l('A linha do tempo ganha um retrato a cada virada de ano.', 'The timeline gets a snapshot at every new year.')));
  const modes: [typeof ui.mode, L][] = [['cycle', l('Dia e noite', 'Day & night')], ['day', l('Dia', 'Day')], ['night', l('Noite', 'Night')]];
  const bar = h('div', { class: 'row wrap c18-modes' }, modes.map(([m, n]) => h('button', { class: `btn small ${ui.mode === m ? '' : 'ghost'}`, onclick: () => { ui.mode = m; mount(); } }, t(n))));
  // resumo
  const campus = v.bs.filter((b) => b.zone === 'campus'), world = v.bs.filter((b) => b.zone === 'world');
  const env = v.scene.env;
  const sum = chips(
    stat('building', campus.length, l('Prédios no campus', 'Campus buildings')),
    stat('globe', world.length, l('Pelo mundo', 'Around the world')),
    stat('hourglass', v.bs.filter((b) => b.st === 'building' || b.st === 'planned' || b.st === 'renovating').length, l('Em obras', 'Under works')),
    stat('people', s.player.staff.length, l('Equipe da sede', 'HQ staff')),
    stat('star', t(styleName18(styleOf18(v.year))), l('Arquitetura da época', 'Architecture of the era')),
    stat('calendar', t(env.snow ? l('Neve', 'Snow') : env.rain ? l('Chuva', 'Rain') : env.season === 'winter' ? l('Inverno', 'Winter') : env.season === 'spring' ? l('Primavera', 'Spring') : env.season === 'summer' ? l('Verão', 'Summer') : l('Outono', 'Autumn')), l('Tempo', 'Weather')));
  const amb = v.live ? ambient18(s) : [];
  const worldStrip = world.length ? section(t(l('Pelo mundo', 'Around the world')),
    h('div', { class: 'c18-world' }, world.map((b) => {
      const c = worldCanvas18(b, v.year, b.id.length * 13, brand18(s));
      c.classList.add('px');
      return h('button', { class: `c18-wb ${ui.sel === b.id ? 'on' : ''}`, title: b.name, onclick: () => { ui.sel = b.id; insp.replaceChildren(inspector(v, b.id)); } }, c, h('small', null, b.name), h('small', { class: 'muted' }, cityLabel(b.city)));
    }))) : null;
  return h('div', { class: 'c18' },
    section(`${t(l('Nosso mundo', 'Our world'))} — ${s.config.companyName}`,
      h('p', { class: 'muted small' }, t(l('Tudo o que você possui, em quarteirões da sua cidade: sede, estúdios, casas de shows, festivais, escola, museu, fábricas, subselos e a sua casa. O tamanho segue o nível; o estilo, a época da construção; obras, incêndios e vendas aparecem no mapa.', 'Everything you own, on the blocks of your city: HQ, studios, venues, festivals, school, museum, plants, sub-labels and your home. Size follows level; style follows the year it was built; works, fires and sales show on the map.'))),
      sum,
      amb.length ? h('ul', { class: 'small c18-amb' }, amb.slice(0, 5).map((a) => h('li', null, t(a.why)))) : null,
      h('div', { class: 'c18-main' }, h('div', { class: 'c18-left' }, host, h('div', { class: 'row wrap c18-ctl' }, tl, bar)), insp)),
    worldStrip,
    v.live ? works(s, v, setHl) : null,
    st.log.length ? section(t(l('Diário de obras', 'Works log')), h('ul', { class: 'small' }, st.log.slice(-8).reverse().map((x) => h('li', null, `${x.y}/${x.m + 1} — ${t(x.t)}`)))) : null);
}

/** Miniatura (sem animação) para o Cockpit: clique abre a página. */
export function campusThumb18(s: GameState): HTMLElement {
  const v = makeView(s);
  const cv = h('canvas', { class: 'c18-thumb px', width: MW, height: MH, role: 'img', 'aria-label': t(l('Nosso mundo (miniatura)', 'Our world (thumbnail)')) }) as HTMLCanvasElement;
  const ctx = cv.getContext('2d');
  if (ctx) drawFrame18(ctx, v.scene, 3, 0);
  return h('button', { class: 'c18-thumbbtn', title: t(l('Abrir Nosso mundo', 'Open Our world')), onclick: () => { store.area = 'campus18' as typeof store.area; rerender(); } }, cv);
}

registerArea({ id: 'campus18', label: l('Nosso mundo', 'Our world'), icon: 'skyline', key: '', render: campusArea,
  badge: (s) => campus18(s).proj.filter((p) => p.left <= 1).length || Object.keys(campus18(s).dmg).length || undefined });
