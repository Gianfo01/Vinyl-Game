// R31 · onda 4 (FOS) — A CASA DA FAMÍLIA FOSSATI e a PRAÇA EFRO E LUCIA FOSSATI em cena (DOM).
// Mesmas regras dos interiores (inside31): a cena da onda 2 (scene31) com pessoas e objetos clicáveis, rótulos, "mostrar
// tudo que é clicável", "Ver como lista", painel rápido no clique direito — e o SEU personagem lá. A ação se resolve no
// painel curto embaixo da cena, com o motivo do bloqueio antes do clique (lockBtn31). As ações são as que já existem
// (sim/sys/fossati31.ts); explorar não muda o mundo. Entradas: a aba Mundo › Família Fossati ("Ir à casa" / "Ir à
// praça"), a placa da praça no mapa da cidade e o painel rápido da cidade (⚡ / Ctrl+K).

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { FAMILY31, FAM_ORIGIN31, type FamId31 } from '../../data/fossati31';
import { cityById } from '../../data/world';
import {
  ANTONELLA_SCHOOL31, SCHOOL_LANGS31, famCity31, famLock31, famMeet31, famRoleLabel31, peekFam31, antonellaPress31, efroFlight31, langSchool31, lasagna31, luciaLunch31,
  metalmac31, soniaPromo31, tennisClub31, type FamRes31,
} from '../../sim/sys/fossati31';
import { DEDICATION31, PLAQUE31 } from '../../sim/sys/extras31';
import { meetHere31 } from '../../sim/sys/gente31';
import { registerRunnable } from '../../sim/r31/editor';
import type { GameState } from '../../sim/types';
import { fmtL, playerActs } from '../../sim/util';
import { inspect, rerender, toast } from '../common';
import { h } from '../dom';
import { lookOf } from '../pixel/avatar';
import { drawFosHome31, drawFosSquare31 } from '../pixel/fos31px';
import { go18 } from '../sys/inbox18';
import { openInside18 } from '../sys/campus18';
import { store } from '../store';
import { bindZoomOut27 } from '../ps/zoom27';
import '../sys/extras31';
import { cityEggs27 } from '../sys/eggs27';
import { openFicha13 } from '../sys/persona13';
import { lockBtn31, quickBtn31 } from './lock31';
import { registerQuick31 } from './quick31core';
import { sceneView31 } from './scene31';
import { homeModel31, squareModel31, type FosM31, type FosWho31 } from './fos31model';
import './inside31.css';
import '../sys/place27ui.css';
import './fos31.css';

/** O que está aberto (só na sessão: explorar não muda o mundo). */
export const fosUi31: { view: 'list' | 'home' | 'square'; panel?: string; act?: string; lang: string } = { view: 'list', lang: 'en' };
const FAM_TAB31: [string, string] = ['worldHub', 'fossati31'];

/** Abre a casa ou a praça NO MAPA da cidade ("Nosso mundo"): a casa é um prédio de moradia da cidade de início e a
 *  praça fica ao lado da sede. Só quando o editor de base fixou a família noutra cidade a casa abre na própria aba. */
export function openFos31(view: 'home' | 'square', panel?: string, s: GameState | null = store.game): void {
  fosUi31.panel = panel;
  if (view === 'home' && s && famCity31(s) !== s.config.homeCity) { fosUi31.view = 'home'; go18({ area: 'world', tab: FAM_TAB31 }); return; }
  fosUi31.view = 'list';
  openInside18(`fos31:${view}`);
}

const result = (r: FamRes31 | { ok: boolean; text: L }): void => { toast(t(r.text), r.ok ? 'good' : 'bad'); rerender(); };
const btn = (label: L, lock: L | null, on: () => void, primary = true): HTMLElement => h('div', { class: 'row wrap fos31-b' }, lockBtn31(t(label), lock, on, { cls: `btn small${primary ? ' primary' : ''}` }));
const li = (xs: L[]): HTMLElement => h('ul', { class: 'in31-lines' }, xs.map((x) => h('li', null, t(x))));

function mineActs(s: GameState) { return playerActs(s).map((id) => s.acts[id]).filter((a) => a && a.status !== 'retired' && a.status !== 'split'); }
/** Seletor do artista (para as ações com artista). */
function actPick(s: GameState): HTMLElement | null {
  const acts = mineActs(s);
  if (!acts.length) return h('p', { class: 'small muted' }, t(l('Contrate um artista para as ações com artista.', 'Sign an artist for the artist actions.')));
  if (!acts.some((a) => a.id === fosUi31.act)) fosUi31.act = acts[0].id;
  if (acts.length === 1) return h('p', { class: 'small' }, t(l('Artista:', 'Artist:')), ' ', h('b', null, acts[0].name));
  return h('label', { class: 'small fos31-f' }, t(l('Artista:', 'Artist:')), ' ', h('select', { 'aria-label': t(l('Artista', 'Artist')), onchange: (e: Event) => { fosUi31.act = (e.target as HTMLSelectElement).value; rerender(); } },
    acts.map((a) => h('option', { value: a.id, selected: a.id === fosUi31.act ? true : undefined }, a.name))));
}
const curAct = (s: GameState): string => { const acts = mineActs(s); return acts.some((a) => a.id === fosUi31.act) ? fosUi31.act! : acts[0]?.id ?? ''; };

// ---------------------------------------------------------------- painéis da casa

function objPanel(s: GameState, m: FosM31, id: string): HTMLElement {
  const box = h('div', { class: 'in31-pn' });
  const add = (...xs: (HTMLElement | null)[]) => { for (const e of xs) if (e) box.append(e); };
  const act = curAct(s);
  switch (id) {
    case 'kitchen': {
      const a = s.acts[act];
      add(h('p', { class: 'small' }, t(l('A lasanha da Lucia sai do forno. Quem leva um pedaço para casa?', 'Lucia\'s lasagna comes out of the oven. Who takes a slice home?'))), actPick(s),
        btn(fmtL(l('Lasanha para {p}', 'Lasagna for {p}'), { p: l(a ? s.persons[a.members[0]]?.name ?? a.name : '—', a ? s.persons[a.members[0]]?.name ?? a.name : '—') }), famLock31(s, 'lasagna') ?? (a ? null : l('Escolha um artista seu.', 'Pick one of your artists.')),
          () => result(lasagna31(s, `p:${a?.members[0] ?? ''}`))));
      break;
    }
    case 'lunch': add(h('p', { class: 'small' }, t(l('A mesa do domingo: macarrão, vinho e ninguém fala de trabalho.', 'The Sunday table: pasta, wine and no talk of work.'))),
      btn(l('Almoço de domingo na Lucia', 'Sunday lunch at Lucia\'s'), famLock31(s, 'lunch'), () => result(luciaLunch31(s)))); break;
    case 'tennis': add(h('p', { class: 'small' }, t(l('Troféus do clube de tênis do Efro — duplas mistas com a Lucia, 1º lugar.', 'Trophies from Efro\'s tennis club — mixed doubles with Lucia, 1st place.'))),
      btn(l('Tênis com o Efro', 'Tennis with Efro'), famLock31(s, 'tennis'), () => result(tennisClub31(s)))); break;
    case 'violin': add(li([
      m.violin === 'stolen' ? l('A vitrine está vazia: o violino do Efro sumiu. Ele sempre volta.', 'The cabinet is empty: Efro\'s violin is missing. It always comes back.')
        : m.violin === 'none' ? l('O violino chega no primeiro mês.', 'The violin arrives in the first month.') : l('O violino do Efro: relíquia Mítica, nunca à venda.', 'Efro\'s violin: a Mythic relic, never for sale.'),
      l('Ele toca no Natal e no aniversário da Lucia.', 'He plays it at Christmas and on Lucia\'s birthday.')])); break;
    case 'flight': add(h('p', { class: 'small' }, t(l('A foto do avião do aeroclube e a maquete que o Efro montou.', 'The photo of the aeroclub plane and the model Efro built.'))), actPick(s),
      btn(l('Voo panorâmico com o Efro', 'Scenic flight with Efro'), famLock31(s, 'flight', act), () => result(efroFlight31(s, act)))); break;
    case 'promo': add(h('p', { class: 'small' }, t(fmtL(l('Sonia: {r}.', 'Sonia: {r}.'), { r: famRoleLabel31(s, 'sonia') }))), actPick(s),
      btn(l('Evento com a Sonia', 'Event with Sonia'), famLock31(s, 'promo', act), () => result(soniaPromo31(s, act)))); break;
    case 'antonella': {
      if (s.year < ANTONELLA_SCHOOL31) { add(h('p', { class: 'small' }, t(fmtL(l('Antonella: {r}.', 'Antonella: {r}.'), { r: famRoleLabel31(s, 'antonella') }))), actPick(s),
        btn(l('Entrevista e teatro com a Antonella', 'Interview and theatre with Antonella'), famLock31(s, 'press', act), () => result(antonellaPress31(s, act)))); break; }
      const learned = act ? (peekFam31(s).langs?.[act] ?? []).map((id) => t(SCHOOL_LANGS31.find((x) => x.id === id)?.name ?? l(id, id))) : [];
      add(h('p', { class: 'small' }, t(l('A escola de idiomas da Antonella.', 'Antonella\'s language school.'))), actPick(s),
        h('label', { class: 'small fos31-f' }, t(l('Língua:', 'Language:')), ' ', h('select', { 'aria-label': t(l('Língua', 'Language')), onchange: (e: Event) => { fosUi31.lang = (e.target as HTMLSelectElement).value; rerender(); } },
          SCHOOL_LANGS31.map((x) => h('option', { value: x.id, selected: x.id === fosUi31.lang ? true : undefined }, t(x.name))))),
        btn(l('Matricular', 'Enrol'), famLock31(s, 'lang', act, fosUi31.lang), () => result(langSchool31(s, act, fosUi31.lang))),
        learned.length ? h('p', { class: 'small muted' }, `${t(l('Já fala', 'Already speaks'))}: ${learned.join(', ')}`) : null);
      break;
    }
    case 'metalmac': {
      const mm = (peekFam31(s).mm ?? 0) - s.week;
      add(h('p', { class: 'small' }, t(fmtL(l('Efro: {r}.', 'Efro: {r}.'), { r: famRoleLabel31(s, 'efro') }))),
        mm > 0 ? h('p', { class: 'small good' }, t(fmtL(l('Contrato em vigor: mais {w} semanas.', 'Contract running: {w} more weeks.'), { w: mm }))) : null,
        btn(l('Contrato com a Metalmac (1 ano)', 'Metalmac contract (1 year)'), famLock31(s, 'metalmac'), () => result(metalmac31(s))));
      break;
    }
  }
  return box;
}

function famPanel(s: GameState, p: FosWho31, inSquare: boolean): HTMLElement {
  const id = p.fam as FamId31;
  const m = FAMILY31.find((x) => x.id === id)!;
  const met = (peekFam31(s).met ?? []).includes(id);
  return h('div', { class: 'in31-pn' },
    h('p', { class: 'small muted' }, `${t(m.kin)} · ${m.age} ${t(l('anos', 'yrs'))} · ${t(l('de', 'from'))} ${FAM_ORIGIN31}`),
    h('p', { class: 'small' }, h('b', null, t(l('Hoje', 'Now'))), ': ', t(p.role)),
    p.talk ? h('p', { class: 'small fos31-talk' }, t(p.talk)) : null,
    h('div', { class: 'row wrap' },
      btn(l('Conhecer', 'Meet'), met ? l('Vocês já se conhecem.', 'You already know each other.') : null, () => result(famMeet31(s, id))),
      inSquare ? h('button', { type: 'button', class: 'btn small', onclick: () => openFos31('home') }, t(l('Ir à casa da família', 'Go to the family home'))) : null));
}

function passerPanel(s: GameState, p: FosWho31): HTMLElement {
  return h('div', { class: 'in31-pn' }, h('p', { class: 'small' }, t(p.role)),
    h('div', { class: 'row wrap' },
      btn(l('Ver a ficha', 'See the card'), null, () => { if (p.key) openFicha13(p.key); else if (p.pid) inspect.person(p.pid); }),
      p.key ? btn(l('Conhecer', 'Meet'), null, () => result(meetHere31(s, p.key!)), false) : null,
      p.pid ? quickBtn31({ kind: 'person', id: p.pid }, p.name) : null));
}

function squarePanel(s: GameState, id: string): HTMLElement {
  switch (id) {
    case 'plaque': return h('div', { class: 'in31-pn' }, h('p', { class: 'fos31-plaque' }, t(PLAQUE31)), h('p', { class: 'small muted' }, t(DEDICATION31)));
    case 'bench': return h('div', { class: 'in31-pn' }, h('p', { class: 'small' }, t(l('Você se senta um pouco. Passa um ônibus, um vendedor de pipoca, alguém assobiando um sucesso da rádio.', 'You sit for a while. A bus goes by, a popcorn seller, someone whistling a radio hit.'))));
    case 'tree': return h('div', { class: 'in31-pn' }, h('p', { class: 'small' }, t(l('A árvore mais antiga da praça; Efro e Lucia se conheceram à sombra dela, conta a família.', 'The oldest tree in the square; Efro and Lucia met in its shade, the family says.'))));
    case 'kiosk': return h('div', { class: 'in31-pn' }, h('p', { class: 'small' }, t(s.year < 1960 ? l('O coreto: banda de música aos domingos.', 'The bandstand: a brass band on Sundays.') : l('O coreto: aos domingos ainda toca alguém — às vezes um artista da cidade.', 'The bandstand: someone still plays on Sundays — sometimes a local act.'))));
    case 'statue': return h('div', { class: 'in31-pn' }, h('p', { class: 'small' }, t(l('Um violino de bronze, pequeno, no canteiro de flores. Sem nome: quem sabe, sabe.', 'A small bronze violin in the flowerbed. No name: those who know, know.'))));
  }
  return h('div', { class: 'in31-pn' });
}

// ---------------------------------------------------------------- a cena

function fosScene(s: GameState, m: FosM31, back: () => void, overlay = false): HTMLElement {
  const pane = h('div', { class: 'in31-pane', 'aria-live': 'polite' });
  const square = m.kind === 'square';
  const show = (panel?: string) => {
    fosUi31.panel = panel;
    if (!panel) { pane.replaceChildren(h('p', { class: 'small muted' }, t(l('Clique numa pessoa ou num objeto.', 'Click a person or an object.')))); return; }
    const [k, arg = ''] = panel.split(':');
    let el: HTMLElement | null = null;
    let head = '';
    if (k === 'who') { const p = m.people[+arg]; if (p) { el = p.fam ? famPanel(s, p, square) : passerPanel(s, p); head = p.name; } }
    else if (k === 'you') { el = h('div', { class: 'in31-pn' }, h('p', null, t(m.you.where))); head = t(l('Você', 'You')); }
    else if (k === 'obj') { el = square ? squarePanel(s, arg) : objPanel(s, m, arg); head = t(m.spots.find((y) => y.id === arg)?.label ?? l('', '')); }
    if (el) pane.replaceChildren(h('div', { class: 'row in31-ph' }, h('b', { class: 'small' }, head),
      h('button', { type: 'button', class: 'icon', 'aria-label': t(l('Fechar', 'Close')), onclick: () => show() }, '✕')), el);
    else show();
  };
  const panels: Record<string, (arg?: string) => void> = {};
  for (const k of ['who', 'you', 'obj']) panels[k] = (arg?: string) => show(arg === undefined ? k : `${k}:${arg}`);
  const name = t(square ? l('Praça Efro e Lucia Fossati', 'Efro and Lucia Fossati Sq.') : l('Casa Fossati', 'Fossati home'));
  const real = (id: string) => (s.persons[id] ? lookOf(s.persons[id]) : undefined);
  const scene = sceneView31(s, {
    id: square ? 'fos31-square' : 'fos31-home', title: m.title, W: m.W, H: m.H, spots: m.spots, panels,
    paint: (cv) => (square ? drawFosSquare31 : drawFosHome31)(cv, m, { name, real, role: (p) => (p.pid ? s.persons[p.pid]?.role : null) ?? null }),
    list: () => h('ul', { class: 'in31-list' }, m.spots.map((sp) => h('li', null, h('button', { type: 'button', class: 'link', onclick: () => show(sp.go.panel) }, t(sp.label)), ' ', h('small', { class: 'muted' }, t(sp.tip))))),
    intro: square ? l('A praça da homenagem, ao lado da sua sede: a placa, o banco, o coreto — e quem estiver passando.', 'The tribute square next to your HQ: the plaque, the bench, the bandstand — and whoever is passing by.')
      : l('A casa da família: cada um no canto do papel da época. Os objetos levam às ações da família (o motivo do bloqueio aparece antes do clique).', 'The family home: everyone in the corner of their current role. Objects lead to the family actions (the lock reason shows before you click).'),
    note: m.note,
    legend: h('p', { class: 'small in31-trail' }, t(m.what)),
  });
  const box = h('div', { class: `c2-in in31${overlay ? '' : ' in31-inline'} fos31`, role: overlay ? 'dialog' : 'region', 'aria-label': t(m.title) },
    h('div', { class: 'c2-in-bar' },
      h('button', { type: 'button', class: 'btn small c2-back', onclick: back }, '← ', t(overlay ? l('Voltar à cidade', 'Back to the city') : l('Família Fossati (lista)', 'Fossati family (list)'))),
      h('b', null, t(m.title)), h('small', { class: 'muted' }, ` · ${t(m.what)}`),
      square ? h('button', { type: 'button', class: 'btn small', onclick: () => openFos31('home') }, t(l('Ir à casa', 'Go to the house')))
        : h('button', { type: 'button', class: 'btn small', onclick: () => openFos31('square') }, t(l('Ir à praça', 'Go to the square'))),
      quickBtn31({ kind: 'city', id: square ? s.config.homeCity : famCity31(s) }, t(cityById[square ? s.config.homeCity : famCity31(s)]?.name ?? l('', '')))),
    h('div', { class: 'in31-body' }, scene, pane));
  show(fosUi31.panel);
  if (overlay) bindZoomOut27(box, back);
  return box;
}

/** A casa da família em cena. */
const toList = (): void => { fosUi31.view = 'list'; fosUi31.panel = undefined; rerender(); };
export function fosHomeView31(s: GameState, back: () => void = toList, overlay = false): HTMLElement { return fosScene(s, homeModel31(s), back, overlay); }
/** A praça em cena. */
export function fosSquareView31(s: GameState, back: () => void = toList, overlay = false): HTMLElement { return fosScene(s, squareModel31(s), back, overlay); }

// ---------------------------------------------------------------- painel rápido (⚡ da cidade) e editor (regra 10)

registerQuick31({
  id: 'q.fos31home', verb: 'open', icon: 'house', kinds: ['city'], label: l('Ir à casa da família Fossati', 'Go to the Fossati family home'), passive: true,
  applies: (s, tg) => tg.id === famCity31(s),
  dest: () => ({ area: 'world', tab: 'worldHub/fossati31', intent: 'fos31:home' }),
  run: (s) => openFos31('home', undefined, s),
});
registerQuick31({
  id: 'q.fos31square', verb: 'open', icon: 'heart', kinds: ['city'], label: l('Ir à praça Efro e Lucia Fossati', 'Go to Efro and Lucia Fossati Square'), passive: true,
  applies: (s, tg) => tg.id === s.config.homeCity,
  dest: () => ({ area: 'world', tab: 'worldHub/fossati31', intent: 'fos31:square' }),
  run: (s) => openFos31('square', undefined, s),
});
registerQuick31({
  id: 'q.fos31lunch', verb: 'more', icon: 'heart', kinds: ['city'], label: l('Almoço de domingo na Lucia', 'Sunday lunch at Lucia\'s'),
  applies: (s, tg) => tg.id === famCity31(s),
  lock: (s) => { const why = famLock31(s, 'lunch'); return why ? { why, unlock: l('Volte depois do prazo ou quando tiver artistas.', 'Come back after the wait or when you have artists.') } : null; },
  dest: () => ({ area: 'world', tab: 'worldHub/fossati31', intent: 'fos31:lunch' }),
  run: (s) => openFos31('home', 'obj:lunch', s),
});
for (const [id, view, label] of [['home', 'home', l('Abrir cena: Casa da família Fossati', 'Open scene: Fossati family home')], ['square', 'square', l('Abrir cena: Praça Efro e Lucia Fossati', 'Open scene: Efro and Lucia Fossati Square')]] as const) {
  registerRunnable({
    id: `fos31.${id}`, area: 'scenes', label,
    help: l('Abre a cena em pixel art (não decide nada; explorar não muda o mundo).', 'Opens the pixel-art scene (decides nothing; exploring does not change the world).'),
    run: (s) => { setTimeout(() => openFos31(view, undefined, s), 0); return l('Cena aberta.', 'Scene opened.'); },
  });
}

// ---------------------------------------------------------------- mapa da cidade: a placa da praça leva à cena
// A placa (frente N, ui/sys/extras31.ts) continua desenhada ao lado da sede; o clique agora abre a praça em cena.
for (let i = 0; i < cityEggs27.length; i++) {
  const f = cityEggs27[i];
  cityEggs27[i] = (g, o) => {
    const e = f(g, o);
    return e && e.id === 'fossati_plaque31' ? { ...e, title: l('Praça Efro e Lucia Fossati (entrar)', 'Efro and Lucia Fossati Square (enter)'), onClick: () => { openFos31('square', 'obj:plaque'); return null; } } : e;
  };
}
