// R31 · onda 2 · K + L — SALAS DA SEDE EM CENA (tela). O modelo é salas31model.ts (puro) e a pintura salas31px.ts.
//
// Uma cena = o desenho da sala + uma camada de botões por cima de cada pessoa e objeto (foco de teclado, dica, selo
// com símbolo e texto), um painel curto de ação (1 clique depois de entrar: o mesmo caminho do formulário — painel
// rápido, sessões do estúdio, ficha) e a lista completa embaixo. "Pular" está sempre à mão: "Ver detalhes" abre a
// tela de texto, e a preferência "abrir direto as telas" faz a sede ir para as páginas sem passar pela cena.
//
// Onde aparece: (1) clicando numa sala da sede (área 'sala31'); (2) no topo das páginas Elenco, Equipe, Catálogo,
// Estúdio, Talentos e Lendas (cabeçalho em cena); (3) pela faixa "Salas em cena" da sede e pelo painel rápido.

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { registerEditable, registerRunnable } from '../../sim/r31/editor';
import { rng19 } from '../../sim/rng19';
import { resolveTake } from '../../sim/studio';
import { careerDef } from '../../sim/sys/careers12';
import { playerPerson } from '../../sim/sys/life';
import type { GameState } from '../../sim/types';
import { HQ_LEVELS } from '../../data/rules';
import { modal, rerender, toast } from '../common';
import { h } from '../dom';
import { placeLabels31 } from './scene31model';
import { openPerson, openRelease } from '../ficha';
import { registerArea } from '../registry';
import { store } from '../store';
import { getTab, ic, setTab } from '../vis';
import { lookOf } from '../pixel/avatar';
import { openSessions } from '../sys/hq8';
import { openRelic } from '../sys/lendas9';
import { lockBtn31 } from './lock31';
import { goDest31, openQuick31, runQuick31 } from './quick31';
import { quickRows31, registerQuick31 } from './quick31core';
import { salaHook31 } from './salahook31';
import { AREA_SALA31, CAREERS31, ROOMS31, ROOM_SALA31, RUN31, SALA_NAME31, activeCareers31, auditSala31, salaModel31, SALAS31, type Btn31, type Chip31, type Do31, type Hot31, type SalaId31, type SalaM31 } from './salas31model';
import { drawSala31, youSprite31, type Rect31 } from './salas31px';
import './salaart31'; // r31 ART2: objetos novos das salas (registra pontos, área e pintura)
import { nav5On } from '../../sim/r31/exp5';
import { NAV5 } from './nav5';
import { help5Of } from './cenas5model';
import { arrows5, bindBack5, placeStrip5, setHelp5 } from './cenas5';
import './salas31.css';

export const SALA_AREA31 = 'sala31';

// ---------------------------------------------------------------- preferências (só conforto de quem vê; nada do jogo)

const PREF = 'r31.salas';
type Pref31 = { skip?: boolean; all?: boolean; seen?: string[]; fold?: boolean };
function pref(): Pref31 { try { return JSON.parse(localStorage.getItem(PREF) ?? '{}') as Pref31; } catch { return {}; } }
function setPref(p: Partial<Pref31>): void { try { localStorage.setItem(PREF, JSON.stringify({ ...pref(), ...p })); } catch { /* sem armazenamento */ } }

// ---------------------------------------------------------------- ações

const isSala = (id: string | undefined): id is SalaId31 => !!id && (SALAS31 as string[]).includes(id);

export function openSala31(id: SalaId31): void {
  setTab(SALA_AREA31, id);
  goDest31({ area: SALA_AREA31 });
}

/** O que o clique faz — sempre por uma função que já existe (mesmo resultado do formulário). */
export function run31(s: GameState, d: Do31, m?: SalaM31): void {
  switch (d.k) {
    case 'go': if (d.tab) setTab(d.tab[0], d.tab[1]); if (d.market) store.marketTab = d.market as typeof store.marketTab; goDest31({ area: d.area }); return;
    case 'act': openQuick31(s, { kind: 'act', id: d.id }); return;
    case 'person': openPerson(d.id); return;
    case 'sessions': openSessions(s); return;
    case 'take': {
      const e = resolveTake(s, rng19(s, 'act'), d.session, d.choice);
      toast(t(e ?? (d.choice === 'another' ? l('Mais um take no próximo dia de estúdio.', 'One more take on the next studio day.') : l('Take resolvido.', 'Take settled.'))), e ? 'bad' : 'good');
      rerender();
      return;
    }
    case 'sala': openSala31(d.id); return;
    case 'relic': openRelic(s, d.id); return;
    case 'release': openRelease(d.id); return;
    case 'you': goDest31({ area: 'you' }); return;
    case 'agg': aggregate(s, m ?? salaModel31(s, 'team')); return;
    case 'run': { const e = RUN31[d.id]?.(s, d.arg) ?? null; toast(t(e ?? l('Feito.', 'Done.')), e ? 'bad' : 'good'); rerender(); return; }
  }
}

/** Visão agregada dos andares de cima: só as exceções. */
function aggregate(s: GameState, m: SalaM31): void {
  let close = () => {};
  const body = h('div', { class: 's31-agg' },
    m.alerts.length ? h('ul', { class: 's31-agg-list' }, m.alerts.map((a) => h('li', { class: `s31-tone-${a.tone}` }, chipEl(a)))) : h('p', { class: 'muted' }, t(l('Nenhuma exceção: todos os andares dentro da capacidade.', 'No exceptions: every floor within capacity.'))),
    h('div', { class: 'row wrap' }, h('button', { type: 'button', class: 'btn small', onclick: () => { close(); run31(s, m.details); } }, t(l('Ver a equipe inteira', 'See the whole team')))));
  close = modal(t(l('Andares de cima: exceções', 'Upper floors: exceptions')), body);
}

// ---------------------------------------------------------------- peças

function chipEl(c: Chip31): HTMLElement {
  return h('span', { class: `s31-chip s31-tone-${c.tone}` },
    h('b', { class: 's31-sym', 'aria-hidden': 'true' }, c.sym), h('span', null, t(c.text)),
    c.bar !== undefined ? h('i', { class: 's31-bar', 'aria-hidden': 'true' }, h('i', { style: `width:${Math.max(0, Math.min(100, c.bar))}%` })) : null);
}

const pct = (v: number, of: number): string => `${((v / of) * 100).toFixed(3)}%`;
const at = (r: Rect31, W: number, H: number): string => `left:${pct(r.x, W)};top:${pct(r.y, H)};width:${pct(r.w, W)};height:${pct(r.h, H)}`;

/** Painel curto do ponto clicado: situação, ações de 1 clique (com o motivo do bloqueio antes do clique) e "ver detalhes". */
function panelFor(s: GameState, m: SalaM31, hot: Hot31, box: HTMLElement): void {
  const btn = (b: Btn31) => lockBtn31(t(b.label), b.lock ?? null, () => run31(s, b.do, m), { cls: `btn small${b.main ? ' primary' : ''}` });
  const quick = hot.actId && hot.kind === 'person' ? quickRows31(s, { kind: 'act', id: hot.actId }).filter((r) => r.def.id !== 'q.pin') : [];
  box.replaceChildren(
    h('div', { class: 's31-panel-h' }, h('b', null, t(hot.label)), hot.chip ? chipEl(hot.chip) : null,
      h('button', { type: 'button', class: 'btn small ghost s31-x', 'aria-label': t(l('Fechar', 'Close')), onclick: () => { box.hidden = true; } }, '✕')),
    h('p', { class: 'small' }, t(hot.tip)),
    h('div', { class: 'row wrap s31-acts' },
      ...(hot.acts ?? []).map(btn),
      ...quick.map((r) => lockBtn31(h('span', null, ic(r.def.icon), ' ', t(r.def.label)), r.lock, () => runQuick31(s, r, { kind: 'act', id: hot.actId! }), { cls: 'btn small' })),
      h('button', { type: 'button', class: 'btn small ghost', onclick: () => run31(s, hot.do, m) }, t(hot.kind === 'empty' ? l('Ir', 'Go') : l('Abrir', 'Open')), ' ›')));
  box.hidden = false;
  box.querySelector<HTMLButtonElement>('.s31-acts button:not([disabled])')?.focus();
}

/** Escala inteira: 2× no mínimo (o celular rola de lado), 3× em telas largas. */
function scaleFor(W: number, compact: boolean): number {
  const cw = typeof window !== 'undefined' ? Math.min(compact ? 900 : 1200, (window.innerWidth || 960) - (compact ? 380 : 320)) : 960;
  return Math.max(2, Math.min(3, Math.floor(cw / W)));
}

/** O palco da cena (desenho + botões + você + painel). Também usado no topo das páginas (`compact`). */
export function salaStage31(s: GameState, m: SalaM31, o: { compact?: boolean } = {}): HTMLElement {
  const p0 = pref();
  const showAll = !nav5On(s) && (!!p0.all || s.week < 52); // rótulos sempre no começo da partida; depois, opcionais (exp5.nav: com Alt)
  const cv = h('canvas', { class: 's31-cv px', 'aria-hidden': 'true' }) as HTMLCanvasElement;
  const look = (pid: string | undefined, seed: string) => lookOf((pid ? s.persons[pid] : undefined) ?? { id: seed });
  const d = drawSala31(cv, m, { look });
  const { W, H } = d.lay;
  const k = scaleFor(W, !!o.compact);
  const panel = h('div', { class: 's31-panel', role: 'region', 'aria-live': 'polite', 'aria-label': t(l('Ação da cena', 'Scene action')), hidden: true });
  const layer = h('div', { class: 's31-layer' });
  const stage = h('div', { class: `s31-stage${showAll ? ' show-all' : ''}`, style: `width:${W * k}px;height:${H * k}px`, role: 'group', 'aria-label': t(m.title) }, cv, layer);
  for (const hot of m.hots) {
    const r = d.lay.hits[hot.id];
    if (!r) continue;
    const say = `${t(hot.label)}. ${t(hot.tip)}${hot.chip ? `. ${hot.chip.sym} ${t(hot.chip.text)}` : ''}`;
    const b = h('button', {
      type: 'button', class: `s31-hot k-${hot.kind}${hot.chip?.tone === 'crit' ? ' crit' : ''}`, style: at(r, W, H), 'data-hot': hot.id, title: say, 'aria-label': say,
      onclick: () => panelFor(s, m, hot, panel),
      oncontextmenu: (e: Event) => { e.preventDefault(); if (hot.actId) openQuick31(s, { kind: 'act', id: hot.actId }); else run31(s, hot.do, m); },
    }, h('span', { class: 's31-lbl' }, t(hot.label)));
    layer.append(b);
    if (hot.chip) {
      const c = chipEl(hot.chip);
      c.classList.add('s31-onmap');
      c.setAttribute('style', `left:${pct(r.x + r.w / 2, W)};top:${pct(Math.max(0, r.y - 2), H)}`);
      c.setAttribute('aria-hidden', 'true');
      layer.append(c);
    }
  }
  // R31 (POL): com "mostrar tudo", os rótulos saem do posicionador comum (sem colisão, abreviados sem cortar palavra);
  // o que não couber aparece só ao passar o mouse/foco
  if (showAll) {
    const sp = m.hots.filter((x) => d.lay.hits[x.id]).map((x) => ({ id: x.id, ...d.lay.hits[x.id], label: x.label, tip: x.tip, go: { panel: x.id } }));
    for (const b of placeLabels31(sp, W, H, k, (x) => t(x.label))) layer.append(h('span', { class: 's31-plbl', 'aria-hidden': 'true', title: b.text !== b.full ? b.full : undefined, style: `left:${pct(b.x, W)};top:${pct(b.y, H)};width:${pct(b.w, W)}` }, b.text));
  }
  // você: entra pela porta e anda até o lugar (sem animação se o sistema pedir menos movimento)
  const me = playerPerson(s);
  if (m.you.here && me && d.lay.you) {
    const yl = lookOf(me);
    const end = d.lay.you;
    const startX = Math.round(W * 0.96);
    const el = h('button', { type: 'button', class: 's31-you', title: t(l('Você — agenda, energia e dinheiro pessoal', 'You — agenda, energy and personal money')), 'aria-label': t(l('Você: abrir o seu painel', 'You: open your panel')), onclick: () => run31(s, { k: 'you' }) });
    const c = youSprite31(yl, m.art.year, 0, false, 'SW');
    const place = (x: number) => { el.style.left = pct(x - 12, W); };
    el.style.top = pct(end.y - 30, H); el.style.width = pct(24, W); el.style.height = pct(34, H); // quadro do boneco: 24×34, pé na linha 31
    el.append(c);
    layer.append(el, h('span', { class: 's31-you-tag', style: `left:${pct(end.x, W)};top:${pct(end.y - 40, H)}`, 'aria-hidden': 'true' }, t(l('você', 'you'))));
    const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || typeof window === 'undefined') place(end.x);
    else {
      let x = startX, f = 0;
      place(x);
      const dir: 'SE' | 'SW' = end.x < startX ? 'SW' : 'SE';
      const tick = window.setInterval(() => {
        if (!el.isConnected && f > 2) { window.clearInterval(tick); return; }
        const step = Math.sign(end.x - x) * Math.min(Math.max(3, Math.ceil(Math.abs(startX - end.x) / 12)), Math.abs(end.x - x)); // ~1 s até o lugar
        x += step; f++;
        const walking = Math.abs(end.x - x) > 0;
        el.replaceChildren(youSprite31(yl, m.art.year, f, walking, dir));
        place(x);
        if (!walking) window.clearInterval(tick);
      }, 90);
    }
  }
  // R31 onda 5 (CENAS5): com exp5.nav, só o cenário — sem "mostrar tudo", sem a caixa de ajuda e sem a lista de pontos;
  // nomes com Alt (e no passar do mouse/foco), setas e Tab percorrem os pontos, ajuda da sala no "?" da casca
  if (nav5On(s)) {
    const pts = m.hots.filter((x) => d.lay.hits[x.id]).map((x) => ({ id: x.id, ...d.lay.hits[x.id], label: x.label, tip: x.tip }));
    arrows5(layer, pts, 'data-hot');
    setHelp5(`sala:${m.id}`, help5Of(m.title, m.intro, pts));
    return h('div', { class: `s31 cn5-sala${o.compact ? ' compact' : ''}`, 'data-sala': m.id, 'data-help5': `sala:${m.id}` },
      m.alerts.length ? h('ul', { class: 's31-alerts', 'aria-label': t(l('Exceções', 'Exceptions')) }, m.alerts.map((a) => h('li', null, chipEl(a)))) : null,
      !m.you.here ? h('p', { class: 's31-away small', role: 'note' }, ic('plane'), ' ', t(m.you.where)) : null,
      h('div', { class: 's31-scroll' }, stage), panel);
  }
  const scroll = h('div', { class: 's31-scroll' }, stage);
  const toggle = h('button', { type: 'button', class: 'btn small ghost', 'aria-pressed': showAll ? 'true' : 'false', onclick: () => {
    const on = !stage.classList.contains('show-all');
    stage.classList.toggle('show-all', on); toggle.setAttribute('aria-pressed', on ? 'true' : 'false'); setPref({ all: on });
  } }, ic('eye'), ' ', t(l('Mostrar tudo que é clicável', 'Show everything clickable')));
  // lista acessível dos pontos (o mesmo registro que desenha a cena)
  const pts = h('details', { class: 's31-points' }, h('summary', { class: 'small' }, t(l('Pontos desta cena ({n})', 'Points in this scene ({n})'), { n: m.hots.length })),
    h('ul', null, m.hots.map((hot) => h('li', null, h('button', { type: 'button', class: 'btn small ghost', onclick: () => panelFor(s, m, hot, panel) }, t(hot.label)), hot.chip ? chipEl(hot.chip) : null))));
  const seen = (p0.seen ?? []).includes(m.id);
  const intro = seen ? null : h('p', { class: 's31-intro small', role: 'note' }, ic('bulb'), ' ', t(m.intro), ' ',
    h('button', { type: 'button', class: 'btn small ghost', onclick: (e: Event) => { setPref({ seen: [...(pref().seen ?? []), m.id] }); (e.currentTarget as HTMLElement).parentElement?.remove(); } }, t(l('Entendi', 'Got it'))));
  return h('div', { class: `s31${o.compact ? ' compact' : ''}`, 'data-sala': m.id },
    m.alerts.length ? h('ul', { class: 's31-alerts', 'aria-label': t(l('Exceções', 'Exceptions')) }, m.alerts.map((a) => h('li', null, chipEl(a)))) : null,
    !m.you.here ? h('p', { class: 's31-away small', role: 'note' }, ic('plane'), ' ', t(m.you.where)) : null,
    intro, scroll, panel,
    h('div', { class: 'row wrap s31-tools' }, toggle, pts));
}

// ---------------------------------------------------------------- página da sala (área 'sala31')

function rowsEl(s: GameState, m: SalaM31, rows: SalaM31['list'], title: L): HTMLElement {
  return h('section', { class: 's31-list card' }, h('h3', null, t(title)),
    rows.length ? h('ul', null, rows.map((r) => h('li', null,
      h('button', { type: 'button', class: 'btn small ghost', onclick: () => run31(s, r.do, m) }, h('b', null, t(r.t))), ' ', h('small', { class: 'muted' }, t(r.d)), r.chip ? chipEl(r.chip) : null)))
      : h('p', { class: 'muted small' }, t(l('Nada aqui agora.', 'Nothing here right now.'))));
}

function strip(s: GameState, cur?: SalaId31): HTMLElement {
  const sigs = activeCareers31(s).map((c) => `sig:${c}` as SalaId31);
  return h('nav', { class: 's31-strip', 'aria-label': t(l('Salas em cena', 'Rooms as scenes')) },
    h('b', { class: 'small' }, ic('house'), ' ', t(l('Salas em cena', 'Rooms as scenes'))),
    ...[...ROOMS31, ...sigs].map((id) => h('button', { type: 'button', class: `btn small${id === cur ? ' primary' : ' ghost'}`, 'aria-current': id === cur ? 'page' : undefined, onclick: () => openSala31(id) }, t(SALA_NAME31[id]))),
    h('details', { class: 's31-more' }, h('summary', { class: 'small' }, t(l('Outras carreiras', 'Other careers'))),
      h('div', { class: 'row wrap' }, CAREERS31.filter((c) => !sigs.includes(`sig:${c}` as SalaId31)).map((c) => h('button', { type: 'button', class: 'btn small ghost', onclick: () => openSala31(`sig:${c}` as SalaId31) }, t(careerDef(c)?.name ?? SALA_NAME31[`sig:${c}` as SalaId31]))))));
}

function salaPage(s: GameState): HTMLElement {
  const id0 = getTab(SALA_AREA31);
  const id: SalaId31 = isSala(id0) ? id0 : 'studio';
  const m = salaModel31(s, id);
  const p0 = pref();
  const skip = h('label', { class: 'small s31-skip' }, h('input', { type: 'checkbox', checked: p0.skip ? true : undefined, onchange: (e: Event) => setPref({ skip: (e.target as HTMLInputElement).checked }) }),
    ' ', t(l('Na sede, abrir direto as telas (pular as cenas)', 'At HQ, open the screens directly (skip the scenes)')));
  // R31 onda 5 (CENAS5): faixa de lugar ("◂ Sede"), Esc/Backspace volta; as listas e a tira de salas ficam no "Ver detalhes"
  if (nav5On(s)) {
    const el = h('div', { class: 's31-page cn5-salapage', 'data-tabs': SALA_AREA31, 'data-cur': id },
      placeStrip5({ title: t(m.title), sub: [t(m.sub)], back: { label: l('Sede', 'HQ'), go: () => NAV5.travel ? NAV5.travel('sede') : goDest31({ area: 'sede25' }) },
        extra: [h('button', { type: 'button', class: 'btn small', onclick: () => run31(s, m.details, m) }, ic('note'), ' ', t(l('Ver detalhes', 'See details')))] }),
      salaStage31(s, m));
    bindBack5(el, () => NAV5.travel ? NAV5.travel('sede') : goDest31({ area: 'sede25' }));
    return el;
  }
  return h('div', { class: 's31-page', 'data-tabs': SALA_AREA31, 'data-cur': id },
    h('header', { class: 's31-head' },
      h('div', null, h('h1', { class: 'page21' }, t(m.title)), h('small', { class: 'muted' }, t(m.sub))),
      h('div', { class: 'row wrap' },
        h('button', { type: 'button', class: 'btn small', onclick: () => goDest31({ area: 'sede25' }) }, '← ', t(l('Voltar à sede', 'Back to HQ'))),
        h('button', { type: 'button', class: 'btn small', onclick: () => run31(s, m.details, m) }, ic('note'), ' ', t(l('Ver detalhes (tabela)', 'See details (table)'))))),
    salaStage31(s, m),
    h('div', { class: 's31-lists' },
      m.away ? rowsEl(s, m, m.away, l('Quadro: quem está fora', 'Board: who is away')) : null,
      m.list.length || m.listTitle ? rowsEl(s, m, m.list, m.listTitle ?? l('Lista completa', 'Full list')) : null),
    strip(s, id), skip);
}

registerArea({ id: SALA_AREA31, label: l('Sala da sede', 'HQ room'), icon: 'house', key: '', render: salaPage, visible: () => false });

// ---------------------------------------------------------------- cena no topo das páginas

function topScene(area: string, s: GameState): HTMLElement | null {
  const id = AREA_SALA31[area];
  if (!id) return null;
  const m = salaModel31(s, id);
  const folded = !!pref().fold;
  const body = h('div', { class: 's31-topbody', hidden: folded ? true : undefined }, salaStage31(s, m, { compact: true }));
  const fold = h('button', { type: 'button', class: 'btn small ghost', 'aria-expanded': folded ? 'false' : 'true', onclick: () => { const f = !body.hidden; body.hidden = f; fold.setAttribute('aria-expanded', f ? 'false' : 'true'); setPref({ fold: f }); } }, t(l('Cena', 'Scene')), ' ▾');
  return h('section', { class: 's31-top', 'aria-label': t(m.title) },
    h('div', { class: 's31-top-h' }, h('b', null, ic('house'), ' ', t(m.title)), h('small', { class: 'muted' }, t(m.sub)),
      h('span', { class: 'grow' }), fold,
      h('button', { type: 'button', class: 'btn small ghost', onclick: () => openSala31(id) }, t(l('Abrir a sala', 'Open the room')), ' ›')),
    body);
}

salaHook31.open = (id) => { if (isSala(id)) openSala31(id); };
salaHook31.roomScene = (room) => (pref().skip ? null : ROOM_SALA31[room as keyof typeof ROOM_SALA31] ?? null);
salaHook31.strip = (s) => strip(s);
salaHook31.top = topScene;
salaHook31.owns = (area) => area in AREA_SALA31;

// ---------------------------------------------------------------- painel rápido: "ver na sala"

registerQuick31({
  id: 'q.scene31', verb: 'open', label: l('Ver na sede (cena)', 'See at HQ (scene)'), icon: 'house', kinds: ['act'], passive: true,
  applies: (s, tg) => s.acts[tg.id]?.owner === 'player',
  dest: (s, tg) => ({ area: SALA_AREA31, tab: `${SALA_AREA31}/${(s.sessions ?? []).some((x) => !x.done && x.actId === tg.id) ? 'studio' : 'roster'}` }),
});

// ---------------------------------------------------------------- editor (o que é editável e rodável)

registerEditable({
  id: 'sede.level', area: 'world', label: l('Nível da sede (muda a arte das salas)', 'HQ level (changes the room art)'), kind: 'select', raw: true,
  options: () => HQ_LEVELS.map((x, i) => ({ value: String(i), label: x.name })),
  get: (s) => String(s.player.hq ?? 0),
  set: (s, v) => { const n = Math.round(Number(v)); if (!(n >= 0 && n < HQ_LEVELS.length)) return l('Nível inválido', 'Invalid level'); s.player.hq = n; },
  help: l('Edição crua: troca a casca da sede sem obra nem custo, para ver as salas em outro tamanho.', 'Raw edit: swaps the HQ shell without works or cost, to see the rooms at another size.'),
});
registerRunnable({
  id: 'salas.audit', area: 'tools', label: l('Conferir as salas em cena', 'Check the rooms as scenes'),
  help: l('Monta todas as salas e cenas de carreira sem mudar nada e lista pontos sem destino.', 'Builds every room and career scene without changing anything and lists points with no destination.'),
  run: (s) => {
    const bad = SALAS31.flatMap((id) => auditSala31(salaModel31(s, id)));
    const n = SALAS31.reduce((tt, id) => tt + salaModel31(s, id).hots.length, 0);
    return bad.length ? { ok: false, text: l(`Pontos sem destino: ${bad.join(', ')}`, `Points with no destination: ${bad.join(', ')}`) } : { ok: true, text: l(`${SALAS31.length} cenas, ${n} pontos clicáveis, todos com destino.`, `${SALAS31.length} scenes, ${n} clickable points, all with a destination.`) };
  },
});
registerRunnable({
  id: 'salas.open', area: 'tools', label: l('Abrir uma sala em cena', 'Open a room as a scene'),
  arg: { kind: 'select', label: l('Sala', 'Room'), def: 'studio', options: () => SALAS31.map((id) => ({ value: id, label: SALA_NAME31[id] })) },
  run: (_s, _t, arg) => { const id = String(arg ?? 'studio'); if (isSala(id)) setTimeout(() => openSala31(id), 0); return l('Abrindo a sala.', 'Opening the room.'); },
});
