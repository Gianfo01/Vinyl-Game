// Rodada 29 (REORG) — interface do catálogo único (M01/M02) e da Central da campanha (S17/M30).
// Utilidades GLOBAIS (Parte VIII): não são macromenus. Abrem por botão na barra de utilidades, pelo Ctrl+K e pelo Cockpit.
//   - Índice completo: todos os destinos por grupo, com a tela canônica (S01–S17), o hub e o MOTIVO de quem está fora
//     do alcance agora (aba de carreira, era/papel, nome antigo). Nada é escondido; nada é executado sem clique.
//   - Central da campanha: passaporte (regras × identidade × apresentação), atalhos para Arquivo, Opções e Índice.
// Integração com app.ts por uma API pequena (Api29), para não duplicar o roteamento de lá.

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { openProjects } from '../../sim/sys/project8';
import type { GameState } from '../../sim/types';
import { playerActs } from '../../sim/util';
import { modal } from '../common';
import { h } from '../dom';
import { PASS_KIND_L29, passport29, type PassKind29, type ViewPrefs29 } from './campaign29model';
import { AVAIL_L29, DESTS29, GROUPS29, INTENTS29, SCREENS29, avail29, intentTarget29, terms29, type Group29, type IntentCtx29, type Target29 } from './route29model';
import { SECTIONS25 } from './nav25';
import './route29.css';

export interface Api29 {
  game: () => GameState;
  /** abre um alvo pelo mesmo caminho do menu (go/setTab do app) */
  open: (x: Target29) => void;
  inMenu: (area: string) => boolean;
  registered: (area: string) => boolean;
  label: (area: string) => string;
  files: () => void;
  options: () => void;
  view: () => ViewPrefs29;
}
let api: Api29 | null = null;
/** Liga a API (app.ts chama uma vez no boot). */
export function bindRoute29(a: Api29): void { api = a; }

/** Contexto das intenções lido do estado (só leitura). */
export function intentCtx29(g: GameState): IntentCtx29 {
  const mine = new Set(playerActs(g));
  let open = 0;
  try { open = openProjects(g).filter((p) => mine.has(p.actId)).length; } catch { open = 0; }
  const songsReady = Object.values(g.songs).filter((x) => mine.has(x.actId) && !x.recorded).length;
  const label = !g.config.careers?.main?.length || g.config.careers.main.includes('label');
  return { roster: mine.size, songsReady, openProjects: open, label };
}

const groupL = (g: Group29): L => SECTIONS25.find((x) => x.id === g)?.label ?? l(g, g);

/** Ctrl+K: as 17 telas (com todos os termos como nome alternativo) e as intenções "Quero…". */
export function paletteCmds29(): { label: string; alt?: string; kind: string; icon?: string; hint?: string; weight?: number; run: () => void }[] {
  if (!api) return [];
  const A = api;
  return [
    ...SCREENS29.map((s) => ({ label: `${t(s.label)}`, alt: s.terms.join(' · '), kind: t(l('Tela', 'Screen')), icon: 'compass', hint: `${s.id} · ${t(groupL(s.group))}`, weight: 6, run: () => A.open(s.home) })),
    ...INTENTS29.map((it) => ({ label: t(it.label), alt: it.terms.join(' · '), kind: t(l('Intenção', 'Intent')), icon: 'target', hint: t(l('atalho para uma etapa existente', 'shortcut to an existing step')), weight: 5,
      run: () => A.open(intentTarget29(it.id, intentCtx29(A.game()))) })),
    { label: t(l('Índice completo (todas as páginas)', 'Full index (every page)')), alt: 'indice mapa do jogo sitemap index', kind: t(l('Ação', 'Action')), icon: 'book', weight: 4, run: openIndex29 },
    { label: t(l('Central da campanha (passaporte)', 'Campaign hub (passport)')), alt: 'campanha passaporte save versao semente regras campaign passport seed rules', kind: t(l('Ação', 'Action')), icon: 'flag', weight: 4, run: openCampaign29 },
  ];
}

/** Índice completo: grupo → páginas (nome, tela, hub, disponibilidade com motivo). Filtro por texto. */
export function openIndex29(): void {
  if (!api) return;
  const A = api;
  let close = () => {};
  const q = h('input', { type: 'search', class: 'ix29-q', placeholder: t(l('Filtrar por nome ou termo (ex.: fraudes, contrato)…', 'Filter by name or term (e.g. fraud, contract)…')), 'aria-label': t(l('Filtrar o índice', 'Filter the index')) }) as HTMLInputElement;
  const body = h('div', { class: 'ix29-body' });
  const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const draw = () => {
    const f = fold(q.value.trim());
    body.replaceChildren();
    let shown = 0;
    for (const g of GROUPS29) {
      const rows = DESTS29.filter((d) => d.group === g).map((d) => ({ d, name: A.label(d.id), av: avail29(d.id, A) }))
        .filter((x) => !f || fold(`${x.name} ${x.d.id} ${terms29(x.d.id).join(' ')} ${x.d.screens.join(' ')}`).includes(f));
      const scr = SCREENS29.filter((s) => s.group === g && (!f || fold(`${t(s.label)} ${s.terms.join(' ')} ${s.id}`).includes(f)));
      if (!rows.length && !scr.length) continue;
      shown += rows.length;
      body.append(h('section', { class: 'ix29-g' },
        h('h3', null, t(groupL(g))),
        scr.length ? h('p', { class: 'ix29-scr' }, scr.map((s) => h('button', { type: 'button', class: 'chip27 ix29-s', title: s.note ? t(s.note) : t(l('Abrir a tela', 'Open the screen')), onclick: () => { close(); A.open(s.home); } }, `${s.id} · ${t(s.label)}`))) : null,
        h('ul', { class: 'ix29-list' }, rows.map(({ d, name, av }) => h('li', { class: `ix29-row av-${av}` },
          av === 'menu' || av === 'tab' || av === 'redirect'
            ? h('button', { type: 'button', class: 'link', onclick: () => { close(); A.open({ area: d.id }); } }, name)
            : h('span', { class: 'ix29-off' }, name),
          h('small', { class: 'muted' }, ` ${d.id}`, d.screens.length ? ` · ${d.screens.join('/')}` : ''),
          h('span', { class: 'ix29-av' }, t(AVAIL_L29[av])))))));
    }
    if (!shown) body.append(h('p', { class: 'muted' }, t(l('Nada com esse nome. Limpe o filtro para ver o índice inteiro.', 'Nothing by that name. Clear the filter to see the whole index.'))));
  };
  q.addEventListener('input', draw);
  draw();
  close = modal(t(l('Índice completo', 'Full index')), h('div', { class: 'ix29' },
    h('p', { class: 'small muted' }, t(l('Toda página do jogo, por grupo. O que não está ao alcance agora continua aqui com o motivo — nada some do índice.', 'Every page in the game, by group. What is out of reach right now stays here with the reason — nothing disappears from the index.'))),
    q, body), { wide: true });
  setTimeout(() => q.focus(), 30);
}

/** Central da campanha (S17): passaporte + atalhos (Arquivo, Opções, Índice). Só leitura. */
export function openCampaign29(): void {
  if (!api) return;
  const A = api;
  let close = () => {};
  const rows = passport29(A.game(), A.view());
  const kinds: PassKind29[] = ['save', 'rules', 'self', 'view'];
  const tv = (v: L | string) => (typeof v === 'string' ? v : t(v));
  close = modal(t(l('Central da campanha', 'Campaign hub')), h('div', { class: 'cp29' },
    h('p', { class: 'small muted' }, t(l('Passaporte desta partida: o que está gravado nela e o que é só preferência deste navegador. Consultar não altera nada.', 'This run\'s passport: what is stored in it and what is only a preference of this browser. Viewing changes nothing.'))),
    kinds.map((k) => h('section', { class: `cp29-sec cp29-${k}` }, h('h3', null, t(PASS_KIND_L29[k])),
      h('dl', { class: 'cp29-dl' }, rows.filter((r) => r.kind === k).flatMap((r) => [h('dt', null, t(r.label)), h('dd', null, tv(r.value), r.note ? h('small', { class: 'muted cp29-note' }, t(r.note)) : null)])))),
    h('div', { class: 'cp29-acts' },
      h('button', { type: 'button', class: 'btn', onclick: () => { close(); A.files(); } }, t(l('Arquivo: salvar, carregar, exportar', 'Files: save, load, export'))),
      h('button', { type: 'button', class: 'btn ghost', onclick: () => { close(); A.options(); } }, t(l('Opções de apresentação', 'Presentation options'))),
      h('button', { type: 'button', class: 'btn ghost', onclick: () => { close(); openIndex29(); } }, t(l('Índice completo', 'Full index'))))), { wide: true });
}

/** Abre um alvo do catálogo de qualquer tela (mesmo caminho do menu). */
export function openTarget29(x: Target29): void { api?.open(x); }
/** Rótulo de uma página como no menu (ou o id, sem app ligado — testes). */
export const label29 = (area: string): string => api?.label(area) ?? area;

/** M43/M05: "↩ Voltar a <origem>" — reabre a página de onde você veio com aba e rolagem lembradas (scroll15/abas),
 *  em vez de um "voltar" anônimo. Só aparece quando a origem é outra página ainda no menu. */
export function backChip29(bar: HTMLElement, prev: string | undefined, cur: string, labelOf: (a: string) => string, inMenu: (a: string) => boolean, go: (a: string) => void): void {
  if (!prev || prev === cur || !inMenu(prev)) return;
  const back = bar.querySelector('.back15');
  const name = labelOf(prev);
  const chip = h('button', { type: 'button', class: 'link back29', title: t(l('Voltar a {p} (com a aba e a rolagem de antes)', 'Back to {p} (same tab and scroll as before)'), { p: name }), onclick: () => go(prev) }, '↩ ', name);
  if (back) back.after(chip); else bar.prepend(chip);
}
