// Rodada 29 (REORG) — vistas das telas do ciclo, montadas com os componentes ui27 (sem arte nova, sem tokens novos).
//   - S03 "Antes de avançar" (no Calendário): o que o próximo avanço afeta, com estado textual (atendido/pendente/
//     bloqueado/desconhecido) e caminho para a origem. NÃO avança: o botão de avançar continua sendo o de sempre (M10).
//   - Cockpit: "Onde eu estava?" (M17, só ao retomar uma partida carregada, dispensável) e "Acompanhando" (M04:
//     artistas no radar, projetos e páginas fixadas — três objetos distintos, nunca misturados).
// Fontes: screens29model.ts (puro). Ligação: cockpit14 (uma linha) e calendar19 (uma linha).

import { l, type L } from '../../data/world';
import { locale, t } from '../../i18n/strings';
import { formatMoney } from '../../core/money';
import type { GameState } from '../../sim/types';
import { h } from '../dom';
import { inspect } from '../common';
import { card27, list27, listRow27 } from './ui27';
import { layout29 } from './shell29';
import { grid29View } from './grid29';
import { ic } from '../vis';
import { intentCtx29, label29, openTarget29 } from './route29';
import { INTENTS29, intentTarget29 } from './route29model';
import { follow29, money29, resume29, review29, type Gate29 } from './screens29model';
import { KNOWN_L29, show29, type Val29 } from './state29model';
import './screens29.css';

const tx = (x: L | string): string => (typeof x === 'string' ? x : t(x));
const lang = (): 'pt' | 'en' => (locale().startsWith('en') ? 'en' : 'pt');
const GATE_L: Record<Gate29, L> = { met: l('atendido', 'met'), pending: l('pendente', 'pending'), blocked: l('bloqueado', 'blocked'), unknown: l('desconhecido', 'unknown') };
const GATE_IC: Record<Gate29, string> = { met: '✓', pending: '•', blocked: '■', unknown: '?' };
const money = (v: Val29): string => show29(v, (n) => formatMoney(n, locale()), lang());

/** S03 · "Revisar período" (coluna do Atlas): grupos Bloqueios · Decisões pendentes · Promessas · Prazos · Caixa, cada um
 *  com contagem e linhas que abrem a origem. Consulta: não processa turno. */
export function review29View(s: GameState): HTMLElement {
  const R = review29(s);
  const committed = money29(s).filter((m) => m.kind === 'committed' && m.v.kind !== 'zero');
  const order: Gate29[] = ['blocked', 'pending', 'unknown', 'met'];
  const groups: { id: string; title: L; icon: string; pick: (id: string) => boolean }[] = [
    { id: 'dec', title: l('Decisões pendentes', 'Pending decisions'), icon: 'scroll', pick: (id) => id.startsWith('dec:') },
    { id: 'prom', title: l('Promessas', 'Promises'), icon: 'quill', pick: (id) => id.startsWith('prom:') },
    { id: 'cal', title: l('Prazos que pedem ação', 'Deadlines needing action'), icon: 'datebook', pick: (id) => id.startsWith('cal:') },
    { id: 'cash', title: l('Caixa', 'Cash'), icon: 'money', pick: (id) => id === 'cash' },
  ];
  const row = (c: (typeof R.checks)[number]) => listRow27({
    lead: h('span', { class: `rv29-st st-${c.state}` }, h('span', { 'aria-hidden': 'true' }, GATE_IC[c.state]), ' ', t(GATE_L[c.state])),
    title: tx(c.title), meta: c.detail ? tx(c.detail) : undefined,
    tone: c.state === 'blocked' ? 'bad' : c.state === 'pending' ? 'warn' : undefined,
    onClick: c.go ? () => openTarget29(c.go!) : undefined,
  });
  const box = (g: (typeof groups)[number]) => {
    const xs = R.checks.filter((c) => g.pick(c.id)).sort((a, b) => order.indexOf(a.state) - order.indexOf(b.state));
    if (!xs.length) return null;
    const worst = xs[0].state;
    return h('details', { class: `rv29-g st-${worst}`, open: worst === 'blocked' || worst === 'pending' ? true : undefined },
      h('summary', null, h('span', { class: 'rv29-gic', 'aria-hidden': 'true' }, ic(g.icon)), h('b', null, t(g.title)), h('small', { class: 'muted' }, ` · ${xs.length} ${t(l('itens', 'items'))}`)),
      list27(g.title, xs.map(row)));
  };
  return h('section', { class: 'rv29 card', 'aria-labelledby': 'rv29-h' },
    h('h2', { id: 'rv29-h', class: 'rv29-title' }, t(l('Revisar período', 'Review the period'))),
    h('p', { class: 'small muted' }, t(l('Antes de avançar: conflitos, compromissos e decisões das próximas {n} semanas.', 'Before advancing: conflicts, commitments and decisions for the next {n} weeks.'), { n: R.horizonWeeks })),
    h('p', { class: 'rv29-counts', role: 'list' }, order.map((k) => h('span', { role: 'listitem', class: `chip27 st-${k}` }, `${GATE_IC[k]} ${t(GATE_L[k])}: ${R.counts[k]}`))),
    h('p', { class: 'small rv29-sum' }, t(R.summary)),
    groups.map(box),
    committed.length ? h('div', { class: 'rv29-money small' }, h('b', null, t(l('Já comprometido:', 'Already committed:'))), ' ',
      committed.map((m, i) => h('span', null, i ? ' · ' : '', t(m.label), ' ', h('b', null, money(m.v))))) : null,
    h('p', { class: 'small muted rv29-foot' }, 'ⓘ ', t(l('Esta tela organiza a próxima etapa. Nenhuma ação aqui faz o tempo avançar: o avanço segue no botão de sempre.', 'This screen organizes the next step. Nothing here moves time forward: advancing stays on the usual button.'))));
}

/** S03 no formato do Atlas: o calendário existente à esquerda, "Revisar período" na coluna da direita. */
export function calendarLayout29(page: HTMLElement, s: GameState): HTMLElement {
  const kids = [...page.childNodes];
  const head = kids.slice(0, 2); // título e apresentação ficam no topo
  page.replaceChildren(...head, layout29([grid29View(s), ...kids.slice(2)], [review29View(s)]));
  return page;
}

// ---------------------------------------------------------------- Cockpit: retomada e acompanhamento

const RES_KEY = 'vtn29.resume';
const resumeOn = (): boolean => { try { return localStorage.getItem(RES_KEY) !== 'off'; } catch { return true; } };
/** partidas já "retomadas" nesta sessão (o painel aparece uma vez por carregamento, não a cada render) */
const seen = new WeakSet<GameState>();
const pinsNow = (): string[] => { try { return (JSON.parse(localStorage.getItem('vtn17.nav') ?? '{}') as { pins?: string[] }).pins ?? []; } catch { return []; } };

function resumeView(s: GameState, done: () => void): HTMLElement {
  const R = resume29(s);
  const sec = (title: L, rows: HTMLElement[]): HTMLElement | null => (rows.length ? h('div', { class: 'rs29-sec' }, h('h4', { class: 'rs29-h' }, t(title)), list27(title, rows)) : null);
  const secs = [
    sec(l('Projetos em curso', 'Projects in progress'), R.projects.map((p) => listRow27({ title: p.title, meta: t(p.stage), onClick: () => openTarget29({ area: 'project' }) }))),
    sec(l('Próximas datas', 'Coming up'), R.next.map((x) => listRow27({ title: tx(x.title), aside: t(x.when), onClick: x.go ? () => openTarget29(x.go!) : undefined }))),
    sec(l('Suas últimas escolhas', 'Your latest choices'), R.choices.map((c) => listRow27({ title: tx(c.title), meta: `→ ${tx(c.pick)}`, aside: t(c.when) }))),
  ].filter((x): x is HTMLElement => !!x);
  return card27({ title: l('Onde eu estava?', 'Where was I?'), icon: 'book', cls: 'rs29', variant: 'hero',
    actions: [h('button', { type: 'button', class: 'btn small', onclick: done }, t(l('Continuar', 'Continue'))),
      h('button', { type: 'button', class: 'btn small ghost', title: t(l('Religue em Opções › Central da campanha', 'Turn back on in the Campaign hub')), onclick: () => { try { localStorage.setItem(RES_KEY, 'off'); } catch { /* ignora */ } done(); } }, t(l('Não mostrar mais', 'Do not show again')))] },
  h('p', { class: 'small' }, h('b', null, t(R.date)), ' · ', t(R.span), ' · ', h('span', { class: 'muted' }, t(l('do save carregado — nada foi simulado enquanto você esteve fora.', 'from the loaded save — nothing was simulated while you were away.')))),
  secs.length ? h('div', { class: 'rs29-grid' }, secs) : h('p', { class: 'small muted' }, t(l('Nenhum projeto, prazo ou escolha recente registrados.', 'No project, deadline or recent choice recorded.'))));
}

function followView(s: GameState): HTMLElement | null {
  const F = follow29(s, pinsNow());
  if (!F.acts.length && !F.pages.length) return null; // projetos já têm o cartão próprio do Cockpit
  return card27({ title: l('Acompanhando', 'Following'), icon: 'eye', cls: 'fl29', variant: 'flat' },
    F.acts.length ? h('p', { class: 'fl29-row' }, h('small', { class: 'muted' }, t(l('Artistas no radar:', 'Acts on your radar:')), ' '),
      F.acts.map((a) => h('button', { type: 'button', class: 'link', 'data-ent': 'act', 'data-id': a.id, onclick: () => inspect.act(a.id) }, a.name, h('small', { class: 'muted' }, ` ${t(l('fama', 'fame'))} ${a.fame}`)))) : null,
    F.pages.length ? h('p', { class: 'fl29-row' }, h('small', { class: 'muted' }, t(l('Páginas fixadas:', 'Pinned pages:')), ' '),
      F.pages.map((p) => h('button', { type: 'button', class: 'link', onclick: () => openTarget29({ area: p }) }, label29(p)))) : null);
}

/** M02: "O que quero fazer?" — atalhos para etapas EXISTENTES (o passo muda com o contexto); nunca um assistente obrigatório. */
function intentsView(s: GameState): HTMLElement {
  const ctx = intentCtx29(s);
  return h('nav', { class: 'in29', 'aria-label': t(l('O que quero fazer?', 'What do I want to do?')) },
    h('span', { class: 'in29-l small muted' }, t(l('O que quero fazer?', 'What do I want to do?'))),
    INTENTS29.map((it) => h('button', { type: 'button', class: 'chip27 in29-b', onclick: () => openTarget29(intentTarget29(it.id, ctx)) }, t(it.label).replace(/^Quero |^I want to /, ''))));
}

/** Liga/desliga a retomada ao carregar (Central da campanha). */
export const resumeToggle29 = (): HTMLElement => h('label', { class: 'check small' },
  h('input', { type: 'checkbox', checked: resumeOn(), onchange: (e: Event) => { try { localStorage.setItem(RES_KEY, (e.target as HTMLInputElement).checked ? 'on' : 'off'); } catch { /* ignora */ } } }),
  ' ', t(l('Mostrar "Onde eu estava?" ao carregar uma partida', 'Show "Where was I?" when loading a run')));

/** Acrescenta ao painel do Cockpit (sem mexer no modelo r27): retomada no topo e acompanhamento antes do "Ver mais". */
export function cockpit29Into(el: HTMLElement, s: GameState): HTMLElement {
  const host = el.querySelector('.ck27') ?? el;
  const f = followView(s);
  const more = host.querySelector('.ck27-more');
  for (const x of [f, intentsView(s)]) if (x) { if (more) more.before(x); else host.append(x); }
  if (s.week > 0 && resumeOn() && !seen.has(s)) {
    const box = h('div', { class: 'rs29-host' });
    const done = () => { seen.add(s); box.remove(); };
    box.append(resumeView(s, done));
    host.prepend(box);
  } else seen.add(s);
  return el;
}

/** Rótulo de estado (glossário) — reexportado para outras telas. */
export const knownLabel29 = (k: keyof typeof KNOWN_L29): string => t(KNOWN_L29[k]);
