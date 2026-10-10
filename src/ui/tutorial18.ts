// Rodada 18 (tutorial18) — interface do tutorial expandido:
//  · botão "?" no cabeçalho de toda página → ajuda da página + da aba aberta (+ glossário, ligações, rever tour);
//  · tour de 1ª visita por página (2–4 destaques, pular, "não mostrar de novo", religar nas configurações);
//  · dicas de 1ª vez quando uma mecânica aparece (fatos17 via onFact + caixa 2.0), sem tocar na simulação;
//  · trilhas guiadas por carreira, glossário pesquisável (também no Ctrl+K) e a página "Ajuda e tutorial".
// Progresso em store.prefs.tut18 (localStorage, vale para todas as partidas).

import { l, type L } from '../data/world';
import { t } from '../i18n/strings';
import { onFact } from '../sim/facts17';
import type { GameState } from '../sim/types';
import { careers } from '../sim/sys/careers12';
import { modal, pill, section, toast } from './common';
import { h } from './dom';
import { help18, helpFor18, helpIds18, tabHelp18, type Help18 } from './help18';
import './help18data';
import './help18tabs';
import { GLOSS18, gloss18, searchGloss18, type Gloss18 } from './gloss18';
import { CAREER_PAGE17, ORDER17 } from './nav17';
import { registerArea } from './registry';
import { savePrefs, store } from './store';
import { COMMON18, TIPS18, TRACKS18, dueTips18, trackState18, type Tip18 } from './tracks18';
import { ic } from './vis';
import './tutorial18.css';

type Go = (area: string) => void;
let goFn: Go = (a) => { store.area = a; store.rerender(); };

// ---------------------------------------------------------------- preferências

export function tp18(): NonNullable<typeof store.prefs.tut18> {
  const p = (store.prefs.tut18 ??= { tours: {}, tips: {}, visits: {}, done: {} });
  p.tours ??= {}; p.tips ??= {}; p.visits ??= {}; p.done ??= {};
  return p;
}
export function resetTut18(what: 'all' | 'tours' | 'tips' | 'tracks' = 'all'): void {
  const p = tp18();
  if (what === 'all' || what === 'tours') p.tours = {};
  if (what === 'all' || what === 'tips') p.tips = {};
  if (what === 'all' || what === 'tracks') { p.done = {}; p.visits = {}; }
  if (what === 'all') { p.noTours = false; p.noTips = false; }
  savePrefs();
}

// ---------------------------------------------------------------- abas abertas na página

const openTabs = (): [string, string][] => [...document.querySelectorAll<HTMLElement>('main [data-tabs]')]
  .map((e) => [e.dataset.tabs ?? '', e.dataset.cur ?? ''] as [string, string]).filter((x) => x[0] && x[1]);

// ---------------------------------------------------------------- janela de ajuda

const glossChip = (id: string): HTMLElement | null => { const x = gloss18(id); return x ? h('button', { class: 'pill gloss18-chip', onclick: () => openGloss18(id) }, t(x.term)) : null; };

function helpBlock(x: Help18, lvl: 'h3' | 'h4' = 'h4'): HTMLElement {
  return h('div', { class: 'help18-block' },
    h(lvl, null, t(x.title)),
    h('p', null, h('b', null, t(l('O que é: ', 'What: '))), t(x.what)),
    h('p', null, h('b', null, t(l('Como usar: ', 'How: '))), t(x.how)),
    x.tips?.length ? h('ul', { class: 'small help18-tips' }, x.tips.map((y) => h('li', null, t(y)))) : null,
    x.gloss?.length ? h('div', { class: 'help18-gloss' }, h('small', { class: 'muted' }, t(l('Termos: ', 'Terms: '))), ...x.gloss.map(glossChip)) : null);
}

/** Abre a ajuda da página (e das abas abertas). */
export function openHelp18(area: string): void {
  const hf = helpFor18(area, openTabs());
  const a = hf.area;
  let close = () => {};
  const sub = area === 'artists' || area === 'people' || area === 'directory' ? ['act', 'person'] : area === 'labels' ? ['label'] : [];
  const extra = helpIds18().filter((id) => sub.some((p) => id.startsWith(`tab:${p}:`))).map((id) => help18(id)!).filter(Boolean);
  const body = h('div', { class: 'help18' },
    a ? helpBlock(a, 'h3') : h('p', { class: 'muted' }, t(l('Esta página ainda não tem ajuda própria — veja o glossário abaixo.', 'This page has no help of its own yet — see the glossary below.'))),
    hf.tabs.length ? h('div', { class: 'help18-tabs' }, h('h4', { class: 'muted' }, t(l('Aba aberta', 'Open tab'))), ...hf.tabs.map((x) => helpBlock(x))) : null,
    extra.length ? h('details', { class: 'help18-more' }, h('summary', null, t(sub[0] === 'label' ? l('Na ficha do selo', 'On the label sheet') : l('Na ficha do artista/pessoa', 'On the act/person sheet'))), ...extra.map((x) => helpBlock(x))) : null,
    a?.links?.length ? h('div', { class: 'row wrap help18-links' }, h('small', { class: 'muted' }, t(l('Veja também: ', 'See also: '))),
      ...a.links.map((id) => { const x = help18(id); return x ? h('button', { class: 'btn small ghost', onclick: () => { close(); goFn(id); } }, t(x.title), ' ↗') : null; })) : null,
    h('div', { class: 'row wrap' },
      h('button', { class: 'btn small', onclick: () => { close(); startTour18(area, true); } }, '▶ ', t(l('Rever o tour desta página', 'Replay this page\'s tour'))),
      h('button', { class: 'btn small ghost', onclick: () => { close(); openGloss18(); } }, t(l('Glossário', 'Glossary'))),
      h('button', { class: 'btn small ghost', onclick: () => { close(); goFn('tut18'); } }, t(l('Ajuda e tutorial', 'Help and tutorial')))),
  );
  close = modal(`? ${a ? t(a.title) : area}`, body);
}

/** Botão "?" do cabeçalho de cada página. */
export function helpButton18(area: string): HTMLElement {
  return h('button', { class: 'icon help18-btn', title: t(l('Ajuda desta página', 'Help for this page')), 'aria-label': t(l('Ajuda desta página', 'Help for this page')), onclick: () => openHelp18(area) }, '?');
}

// ---------------------------------------------------------------- glossário

function glossList(q: string, box: HTMLElement): void {
  const xs = searchGloss18(q);
  box.replaceChildren(...(xs.length ? xs.map((x) => glossItem(x)) : [h('p', { class: 'muted' }, t(l('Nenhum termo encontrado.', 'No term found.')))]));
}
const glossItem = (x: Gloss18): HTMLElement => h('div', { class: 'gloss18-item', id: `g18-${x.id}` },
  h('b', null, t(x.term)), h('p', { class: 'small' }, t(x.def)), x.ex ? h('p', { class: 'small muted' }, t(l('Ex.: ', 'E.g. ')), t(x.ex)) : null);

/** Glossário pesquisável (abre num termo quando `id` é dado). */
export function openGloss18(id?: string): void {
  const box = h('div', { class: 'gloss18-list' });
  const one = id ? gloss18(id) : undefined;
  const inp = h('input', { type: 'search', class: 'gloss18-q', placeholder: t(l('Buscar termo (ex.: recoup, ECAD, 360)…', 'Search a term (e.g. recoup, ECAD, 360)…')), 'aria-label': t(l('Buscar no glossário', 'Search the glossary')), value: one ? t(one.term) : '',
    oninput: (e: Event) => glossList((e.target as HTMLInputElement).value, box) }) as HTMLInputElement;
  glossList(one ? one.id : '', box);
  modal(t(l('Glossário da indústria', 'Industry glossary')), h('div', { class: 'gloss18' }, inp, box), { wide: true });
}

/** Comandos do Ctrl+K: termos do glossário e ajuda de cada página. */
export function paletteCmds18(go: Go): { label: string; kind: string; icon?: string; hint?: string; weight?: number; run: () => void }[] {
  goFn = go;
  const gk = t(l('Glossário', 'Glossary')), hk = t(l('Ajuda', 'Help'));
  return [
    ...GLOSS18.map((x) => ({ label: `${t(x.term)}${x.alt?.length ? ` (${x.alt.join(', ')})` : ''}`, kind: gk, icon: 'book', hint: t(x.def).slice(0, 60), weight: 1, run: () => openGloss18(x.id) })),
    ...helpIds18().filter((id) => !id.startsWith('tab:')).map((id) => ({ label: `? ${t(help18(id)!.title)}`, kind: hk, icon: 'bulb', weight: 1, run: () => { go(id); setTimeout(() => openHelp18(id), 60); } })),
    { label: t(l('Ajuda e tutorial (progresso)', 'Help and tutorial (progress)')), kind: hk, icon: 'bulb', weight: 2, run: () => go('tut18') },
  ];
}

// ---------------------------------------------------------------- tour da 1ª visita

interface Step18 { sel: string; title: L; text: L }
/** Destaques extras por página (seletores estáveis; os que não existirem são pulados). */
const TOUR_EXTRA18: Record<string, Step18[]> = {
  cockpit: [{ sel: '.topbar .advance .btn.primary', title: l('Avançar o mês', 'Advance the month'), text: l('Quando terminar as decisões, avance. Ctrl+Enter faz o mesmo; "Até…" para no que importar.', 'When done deciding, advance. Ctrl+Enter does the same; "Until…" stops on what matters.') }],
  finance: [{ sel: '.topbar .money', title: l('Caixa e mês', 'Cash and month'), text: l('O número entre parênteses é o resultado do último mês: passe o mouse para ver de onde veio.', 'The number in brackets is last month\'s result: hover it to see where it came from.') }],
};
function steps18(area: string): Step18[] {
  const a = help18(area);
  if (!a) return [];
  const xs: Step18[] = [{ sel: 'main .crumbs15', title: a.title, text: a.what }];
  const tw = document.querySelector<HTMLElement>('main [data-tabs] > .tabs');
  if (tw) {
    const names = [...tw.querySelectorAll('button')].map((b) => b.textContent?.trim()).filter(Boolean).slice(0, 6).join(' · ');
    const k = tw.parentElement?.dataset.tabs ?? '', cur = tw.parentElement?.dataset.cur ?? '';
    const th = tabHelp18(k, cur);
    xs.push({ sel: 'main [data-tabs] > .tabs', title: l('Abas', 'Tabs'), text: l(`${names}.${th ? ` Aberta: ${th.what.pt}` : ''}`, `${names}.${th ? ` Open: ${th.what.en}` : ''}`) });
  }
  xs.push({ sel: 'main h3, main .section h3, main section', title: l('Como usar', 'How to use'), text: a.how });
  xs.push(...(TOUR_EXTRA18[area] ?? []));
  xs.push({ sel: '.help18-btn', title: l('Ajuda a qualquer hora', 'Help any time'), text: l('O "?" reabre esta explicação, a ajuda da aba aberta e o glossário. Ctrl+K também busca termos.', 'The "?" reopens this explanation, the open tab\'s help and the glossary. Ctrl+K also searches terms.') });
  return xs.filter((x) => document.querySelector(x.sel)).slice(0, 4);
}

let tourEl: HTMLElement | null = null;
function endTour(): void { tourEl?.remove(); tourEl = null; document.removeEventListener('keydown', tourKey); }
const tourKey = (e: KeyboardEvent): void => { if (e.key === 'Escape' && tourEl) { e.stopPropagation(); endTour(); } };

/** Mostra o tour da página (força = mesmo já visto ou desligado). */
export function startTour18(area: string, force = false): boolean {
  const p = tp18();
  if (!force && (p.noTours || p.tours[area])) return false;
  const xs = steps18(area);
  if (xs.length < 2) return false;
  p.tours[area] = 1; savePrefs();
  endTour();
  let i = 0;
  const hl = h('div', { class: 'tour18-hl', 'aria-hidden': 'true' });
  const bub = h('div', { class: 'tour18-bub', role: 'dialog', 'aria-live': 'polite' });
  tourEl = h('div', { class: 'tour18' }, hl, bub);
  const show = () => {
    const st = xs[i];
    const el = document.querySelector<HTMLElement>(st.sel);
    const r = el?.getBoundingClientRect();
    if (r) Object.assign(hl.style, { left: `${r.left - 4}px`, top: `${r.top - 4}px`, width: `${r.width + 8}px`, height: `${Math.min(r.height, 260) + 8}px` });
    const below = !r || r.top < window.innerHeight * 0.55;
    const left = Math.max(8, Math.min((r?.left ?? 16), window.innerWidth - 348));
    Object.assign(bub.style, { left: `${left}px`, top: below ? `${Math.min(window.innerHeight - 200, (r?.top ?? 0) + Math.min(r?.height ?? 0, 260) + 12)}px` : '', bottom: below ? '' : `${window.innerHeight - (r?.top ?? 0) + 12}px` });
    bub.replaceChildren(
      h('small', { class: 'muted' }, `${i + 1}/${xs.length} · ${t(l('Tour da página', 'Page tour'))}`),
      h('b', null, t(st.title)),
      h('p', null, t(st.text)),
      h('div', { class: 'row wrap' },
        i > 0 ? h('button', { class: 'btn small ghost', onclick: () => { i--; show(); } }, '←') : null,
        h('button', { class: 'btn small primary', onclick: () => { if (++i >= xs.length) endTour(); else show(); } }, i === xs.length - 1 ? t(l('Entendi', 'Got it')) : t(l('Próximo', 'Next'))),
        h('button', { class: 'btn small ghost tour18-skip', onclick: endTour }, t(l('Pular', 'Skip'))),
        h('button', { class: 'btn small ghost tour18-off', onclick: () => { tp18().noTours = true; savePrefs(); endTour(); toast(t(l('Tours desligados. Religue em Configurações ou em Ajuda e tutorial.', 'Tours off. Turn them back on in Settings or Help and tutorial.')), 'info'); } }, t(l('Não mostrar de novo', 'Don\'t show again')))));
    el?.scrollIntoView?.({ block: 'nearest' });
  };
  document.body.appendChild(tourEl);
  document.addEventListener('keydown', tourKey);
  show();
  return true;
}

// ---------------------------------------------------------------- dicas de 1ª vez (fatos + caixa)

/** Tipos de fato que podem disparar dicas: o ouvinte só marca "verificar" (nunca mexe no estado). */
const HOT_KINDS = new Set(['scandal', 'rumor', 'feud', 'feud_start', 'relic', 'arc', 'release_review', 'chart', 'payola', 'viral', 'credit_dispute', 'audit', 'stress', 'breakdown', 'poach', 'award', 'arrest', 'crime', 'theft', 'split', 'exit', 'show', 'tour_done']);
const hot: Record<string, number> = {};
onFact('*', (s, f) => { if (HOT_KINDS.has(f.kind) || f.visibility === 'rumor') hot[s.signature] = 1; }, 'tutorial18');
let lastWeek = -1, lastSig = '';

function showTip(tp: Tip18): void {
  document.querySelector('.tip18')?.remove();
  const p = tp18();
  p.tips[tp.id] = 1; savePrefs();
  const el: HTMLElement = h('aside', { class: 'tip18', role: 'status', 'aria-live': 'polite' },
    h('div', { class: 'tip18-ic' }, ic('bulb', 2)),
    h('div', null,
      h('small', { class: 'muted' }, t(l('Primeira vez', 'First time'))),
      h('b', null, t(tp.title)),
      h('p', null, t(tp.text)),
      h('div', { class: 'row wrap' },
        tp.area ? h('button', { class: 'btn small primary', onclick: () => { el.remove(); goFn(tp.area!); } }, t(l('Ver página', 'Open page'))) : null,
        tp.gloss ? h('button', { class: 'btn small ghost', onclick: () => openGloss18(tp.gloss) }, t(l('Termo', 'Term'))) : null,
        h('button', { class: 'btn small ghost', onclick: () => el.remove() }, t(l('Entendi', 'Got it'))),
        h('button', { class: 'btn small ghost', onclick: () => { tp18().noTips = true; savePrefs(); el.remove(); } }, t(l('Sem dicas', 'No tips'))))));
  document.body.appendChild(el);
}

function checkTips(g: GameState): void {
  const p = tp18();
  if (p.noTips) return;
  if (g.signature === lastSig && g.week === lastWeek && !hot[g.signature]) return;
  lastSig = g.signature; lastWeek = g.week; delete hot[g.signature];
  const [tp] = dueTips18(g, p.tips, 1);
  if (tp) showTip(tp);
}

// ---------------------------------------------------------------- trilhas: aviso ao concluir

function checkTracks(g: GameState): void {
  const p = tp18();
  let changed = false;
  for (const id of careers(g).active) for (const x of trackState18(g, id, p.visits, p.done)) {
    const k = `${id}:${x.obj.id}`;
    if (x.ok && !p.done[k]) { p.done[k] = 1; changed = true; toast(`✓ ${t(l('Objetivo', 'Goal'))}: ${t(x.obj.label)}`, 'good'); }
  }
  if (changed) savePrefs();
}

/** Chamado pelo app depois de cada render. */
export function afterRender18(g: GameState, area: string, go: Go): void {
  goFn = go;
  const p = tp18();
  if (!p.visits[area]) { p.visits[area] = 1; savePrefs(); }
  try { checkTracks(g); } catch { /* trilha nunca derruba a tela */ }
  if (tourEl && !tourEl.isConnected) tourEl = null;
  const busy = !!document.querySelector('.overlay, .scene-overlay') || !g.tutorial?.done;
  if (!busy && !tourEl) {
    if (!startTour18(area)) { try { checkTips(g); } catch { /* idem */ } }
  } else if (tourEl) endTour();
}

/** Linhas para o modal de configurações. */
export function settings18(openPage: () => void): HTMLElement[] {
  const p = tp18();
  return [
    h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !p.noTours, onchange: (e: Event) => { tp18().noTours = !(e.target as HTMLInputElement).checked; savePrefs(); } }), t(l('Tour de cada página na primeira visita', 'Tour of each page on first visit'))),
    h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !p.noTips, onchange: (e: Event) => { tp18().noTips = !(e.target as HTMLInputElement).checked; savePrefs(); } }), t(l('Dicas quando uma mecânica aparece pela primeira vez', 'Tips when a mechanic first appears'))),
    h('button', { class: 'btn small ghost', onclick: openPage }, t(l('Ajuda, trilhas e glossário', 'Help, tracks and glossary'))),
  ];
}

// ---------------------------------------------------------------- página "Ajuda e tutorial"

function trackBox(g: GameState, id: string, open: boolean): HTMLElement {
  const tr = TRACKS18.find((x) => x.id === id)!;
  const rows = trackState18(g, id, tp18().visits, tp18().done);
  const n = rows.filter((x) => x.ok).length;
  const next = rows.find((x) => !x.ok);
  return h('details', { class: 'track18', open },
    h('summary', null, ic(CAREER_PAGE17[id]?.icon ?? 'compass'), ' ', h('b', null, t(tr.name)), ' ', pill(`${n}/${rows.length}`, n === rows.length ? 'good' : ''), ' ', h('small', { class: 'muted' }, t(tr.intro))),
    h('div', { class: 'bar18' }, h('span', { style: `width:${Math.round((n / rows.length) * 100)}%` })),
    h('ol', { class: 'track18-list' }, rows.map((x) => h('li', { class: x.ok ? 'ok' : x === next ? 'next' : '' },
      h('span', { class: 'track18-mk', 'aria-hidden': 'true' }, x.ok ? '✓' : x === next ? '▶' : '○'), ' ', t(x.obj.label), ' ',
      x.ok ? null : h('button', { class: 'btn small ghost', onclick: () => goFn(x.obj.area) }, t(l('Ir', 'Go')), ' ↗')))));
}

function tutPage(g: GameState): HTMLElement {
  const p = tp18();
  const act = careers(g).active.filter((id) => TRACKS18.some((x) => x.id === id));
  const others = ORDER17.filter((id) => !act.includes(id) && TRACKS18.some((x) => x.id === id));
  const areas = helpIds18().filter((id) => !id.startsWith('tab:'));
  const toursSeen = areas.filter((a) => p.tours[a]).length;
  const tipsSeen = TIPS18.filter((x) => p.tips[x.id]);
  const gbox = h('div', { class: 'gloss18-list' });
  glossList('', gbox);
  const rr = () => store.rerender();
  return h('div', { class: 'panel tut18' },
    section(t(l('Sua trilha', 'Your track')),
      h('p', { class: 'small muted' }, t(l('Objetivos guiados por carreira. Cada um leva à página certa e é marcado sozinho quando acontece no jogo. Passos comuns: ', 'Guided goals per career. Each leads to the right page and ticks itself when it happens in the game. Common steps: ')), COMMON18.map((x) => t(x.label)).join(' · ')),
      ...(act.length ? act : ['label']).map((id) => trackBox(g, id, true)),
      others.length ? h('details', null, h('summary', null, t(l('Trilhas das outras carreiras', 'Other careers\' tracks'))), ...others.map((id) => trackBox(g, id, false))) : null),
    section(t(l('Tours e dicas', 'Tours and tips')),
      h('p', null, t(l('Tours de página vistos: ', 'Page tours seen: ')), h('b', null, `${toursSeen}/${areas.length}`), ' · ', t(l('Dicas de primeira vez: ', 'First-time tips: ')), h('b', null, `${tipsSeen.length}/${TIPS18.length}`)),
      h('div', { class: 'row wrap' }, ...TIPS18.map((x) => h('button', { class: `pill ${p.tips[x.id] ? 'good' : ''}`, title: t(x.text), onclick: () => showTip(x) }, p.tips[x.id] ? '✓ ' : '○ ', t(x.title)))),
      h('div', { class: 'row wrap' },
        h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !p.noTours, onchange: (e: Event) => { tp18().noTours = !(e.target as HTMLInputElement).checked; savePrefs(); } }), t(l('Tours na 1ª visita', 'Tours on first visit'))),
        h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !p.noTips, onchange: (e: Event) => { tp18().noTips = !(e.target as HTMLInputElement).checked; savePrefs(); } }), t(l('Dicas de 1ª vez', 'First-time tips'))))),
    section(t(l('Ajuda por página', 'Help by page')),
      h('div', { class: 'help18-index' }, ...areas.map((id) => h('button', { class: `btn small ghost ${p.tours[id] ? 'seen' : ''}`, onclick: () => { goFn(id); setTimeout(() => openHelp18(id), 60); } }, t(help18(id)!.title))))),
    section(t(l('Glossário', 'Glossary')),
      h('input', { type: 'search', class: 'gloss18-q', placeholder: t(l('Buscar termo…', 'Search a term…')), 'aria-label': t(l('Buscar no glossário', 'Search the glossary')), oninput: (e: Event) => glossList((e.target as HTMLInputElement).value, gbox) }),
      gbox),
    section(t(l('Reiniciar', 'Reset')),
      h('div', { class: 'row wrap' },
        h('button', { class: 'btn small', onclick: () => { resetTut18('tours'); toast(t(l('Tours reativados.', 'Tours re-enabled.')), 'good'); rr(); } }, t(l('Rever todos os tours', 'Replay all tours'))),
        h('button', { class: 'btn small', onclick: () => { resetTut18('tips'); rr(); } }, t(l('Rever as dicas', 'Replay tips'))),
        h('button', { class: 'btn small', onclick: () => { resetTut18('tracks'); rr(); } }, t(l('Zerar trilhas', 'Reset tracks'))),
        h('button', { class: 'btn small ghost', onclick: () => { resetTut18('all'); if (g.tutorial) g.tutorial = { step: 0, done: false, seen: [] }; rr(); } }, t(l('Reiniciar tudo (inclui o tutorial inicial)', 'Reset everything (includes the intro tutorial)'))))),
  );
}

registerArea({ id: 'tut18', label: l('Ajuda e tutorial', 'Help and tutorial'), icon: 'bulb', key: '', render: tutPage });
