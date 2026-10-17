// R33 · FICHAS33-B — CARTÃO DE AÇÕES das páginas antigas dentro do papel da casca (.p5-old, papéis do elenco com miolo
// antigo). Os botões de ação que estavam espalhados pela página vão para o cartão numerado (o mesmo .ac5 do Mural/Mesa
// e das janelas paperSheet33): a linha do cartão clica o MESMO botão, travado mostra o motivo e "→ Libera quando…".
// Na página fica só leitura e seleção: filtros, abas (marcadores), nomes (links), campos. Botões que se repetem por
// linha (tabela, lista, fileira de cartões) viram SELEÇÃO: clicar na linha escolhe; o cartão mostra as ações dela.
// Só apresentação: nada aqui escreve no jogo.

import { l } from '../../data/world';
import { t } from '../../i18n/strings';
import { h } from '../dom';
import { card33, rowOfBtn33, txt33, type Row33 } from './paper33';
import './cartao33.css';

/** Largura que o cartão ocupa ao lado do papel (px de tela; a casca tira do papel). */
export const CARD_W33 = 276;

/** Onde um botão NÃO é ação (leitura/seleção): abas, marcadores, cabeçalho de tabela, controles de mapa, o próprio cartão. */
const SKIP33 = '.tabs, .cats17, [role=tablist], [role=toolbar], th, summary, .wmap-ctl, .w19-ctl, .ac5, .p5-tabs, [data-keep33], .lk31-why, [hidden], .ob33-col, .el5-tabs, .help18-index';
const hasWord = (s: string): boolean => /[\p{L}\p{N}]{2,}/u.test(s);
/** "Calendário →", "Ir ↗": ir para outra página é navegação (como os nomes sublinhados), fica na página. */
const isNav33 = (s: string): boolean => /[→↗▸]\s*$/u.test(s);

/** Fileira de filtro: 3+ botões irmãos com um só aceso (os outros "ghost"), ou com estado marcado. */
function filterRow33(b: HTMLButtonElement): boolean {
  const host = b.parentElement?.classList.contains('lk31') ? b.parentElement.parentElement : b.parentElement;
  if (!host) return false;
  const sib = [...host.children].map((c) => (c.classList.contains('lk31') ? c.firstElementChild : c)).filter((c): c is HTMLButtonElement => c instanceof HTMLButtonElement && c.classList.contains('btn'));
  if (sib.some((x) => x.classList.contains('on') || x.hasAttribute('aria-pressed') || x.hasAttribute('aria-selected'))) return true;
  return sib.length >= 3 && sib.filter((x) => !x.classList.contains('ghost')).length === 1 && !sib.some((x) => /\$|€|£/.test(txt33(x)));
}

/** Botões de ação de uma página antiga. */
export function actionBtns33(root: HTMLElement, nav = false): HTMLButtonElement[] {
  return [...root.querySelectorAll<HTMLButtonElement>('button.btn')].filter((b) => !b.closest(SKIP33) && !b.hasAttribute('aria-pressed') && !b.getAttribute('role') && hasWord(txt33(b)) && (nav || !isNav33(txt33(b))) && !filterRow33(b));
}

/** Texto de leitura de um elemento sem os botões (nome da linha). */
function itemName33(it: Element): string {
  const cut = (x: string): string => (x.length > 44 ? `${x.slice(0, 42).trimEnd()}…` : x);
  for (const q of ['h3, h4, h5', 'a, .link', 'td', 'b, strong']) {
    const pick = [...it.querySelectorAll(q)].find((x) => !x.closest('button, .lk31-why') && hasWord(txt33(x)));
    if (pick) return cut(txt33(pick));
  }
  const c = it.cloneNode(true) as Element;
  c.querySelectorAll('button, .lk31-why, input, select').forEach((x) => x.remove());
  return cut(txt33(c));
}

/** Linha (item que se repete) de um botão: tr/li ou um irmão de mesmo tipo entre 3+ que também têm ações. */
function itemOf33(b: HTMLElement, root: HTMLElement, acts: HTMLButtonElement[]): HTMLElement | null {
  let a = b.parentElement;
  for (let d = 0; a && a !== root && d < 6; d++, a = a.parentElement) {
    const p = a.parentElement;
    if (!p || a.classList.contains('lk31')) continue;
    const mine = acts.filter((x) => a!.contains(x)).length;
    if (mine > 3) return null;
    const like = [...p.children].filter((c) => c.tagName === a!.tagName && acts.some((x) => c.contains(x))).length;
    const listy = a.tagName === 'TR' || a.tagName === 'LI';
    if ((listy && like >= 2) || like >= 3) {
      const c = a.cloneNode(true) as Element;
      c.querySelectorAll('button, .lk31-why').forEach((x) => x.remove());
      return hasWord(txt33(c)) ? a : null;
    }
  }
  return null;
}

/** Escolha da linha por página (sobrevive ao redesenho da casca). */
const SEL33 = new Map<string, string>();

export interface OldCard33 { el: HTMLElement; refresh: () => void }

/** Monta o cartão de ações de uma página antiga já desenhada em `root`. Sem ação nenhuma: null (o papel fica inteiro). */
export function oldCard33(root: HTMLElement, key: string, title: string, o: { nav?: boolean } = {}): OldCard33 | null {
  if (!actionBtns33(root, o.nav).length) return null;
  const col = h('div', { class: 'ob33-col' });
  const refresh = (): void => {
    const acts = actionBtns33(root, o.nav);
    const items = new Map<HTMLElement, HTMLButtonElement[]>();
    const loose: HTMLButtonElement[] = [];
    for (const b of acts) {
      const it = itemOf33(b, root, acts);
      if (it) items.set(it, [...(items.get(it) ?? []), b]); else loose.push(b);
      const wrap = b.parentElement?.classList.contains('lk31') ? b.parentElement : b;
      wrap.classList.add('ob33-moved');
    }
    // seleção: a escolhida (pelo nome) ou a primeira
    const names = new Map([...items.keys()].map((it) => [it, itemName33(it)]));
    const want = SEL33.get(key);
    const sel = [...items.keys()].find((it) => names.get(it) === want) ?? [...items.keys()][0];
    for (const it of items.keys()) {
      it.classList.add('ob33-it');
      it.classList.toggle('ob33-sel', it === sel);
      it.setAttribute('aria-selected', it === sel ? 'true' : 'false');
      if (!it.hasAttribute('tabindex')) it.tabIndex = 0;
      if (!(it as HTMLElement & { ob33?: boolean }).ob33) {
        (it as HTMLElement & { ob33?: boolean }).ob33 = true;
        const pick = (e: Event) => { if ((e.target as HTMLElement).closest('a, button, input, select, textarea, label, .link')) return; SEL33.set(key, names.get(it) ?? itemName33(it)); refresh(); };
        it.addEventListener('click', pick);
        it.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target === it) { e.preventDefault(); pick(e); } });
      }
    }
    // rótulo de botão solto repetido na página: + o título do bloco
    const dup = (b: HTMLButtonElement) => loose.filter((x) => txt33(x) === txt33(b)).length > 1;
    const ctx = (b: HTMLButtonElement) => { const hd = b.closest('section, .card, .row')?.querySelector('h2, h3, h4, b'); return hd && !hd.closest('button') ? ` · ${txt33(hd).slice(0, 32)}` : ''; };
    const selRows: Row33[] = sel ? (items.get(sel) ?? []).map((b, i) => rowOfBtn33(b, `s${i}`)) : [];
    const pageRows: Row33[] = loose.map((b, i) => rowOfBtn33(b, `p${i}`, dup(b) ? `${txt33(b)}${ctx(b)}` : undefined));
    const card = card33({
      title,
      nums: sel ? [{ label: t(l('Escolhido', 'Selected')), value: names.get(sel) ?? '' }] : undefined,
      rows: [...selRows, ...pageRows],
      note: items.size > 1 ? t(l('Clique numa linha da página para escolher; as ações dela vêm para cá.', 'Click a row on the page to pick it; its actions come here.')) : undefined,
    });
    if (selRows.length && pageRows.length) card.querySelector(`[data-row33="p0"]`)?.closest('.ac5-acts > *')?.before(h('p', { class: 'ob33-sep' }, t(l('Na página', 'On the page'))));
    col.replaceChildren(card);
  };
  refresh();
  // a página muda sozinha (campo liberou um botão, aviso abriu): o cartão acompanha
  if (typeof MutationObserver !== 'undefined') {
    let q = false;
    const mo = new MutationObserver((ms) => {
      if (q || ms.every((m) => col.contains(m.target) || (m.type === 'attributes' && m.attributeName !== 'disabled'))) return;
      q = true;
      queueMicrotask(() => { q = false; if (!root.isConnected) { mo.disconnect(); return; } refresh(); });
    });
    queueMicrotask(() => mo.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled'] }));
  }
  return { el: col, refresh };
}

// ---------------------------------------------------------------- painéis da casca (cidade, interiores)
// O painel lateral do bairro (.c27-pn; no celular a folha .c27-sheet) e o painel do interior (.in31-pn) já são o
// "cartão" do lugar: as ações espalhadas viram a lista numerada no pé do painel (ir para a cidade/entrar conta como
// ação aqui). Ligado por observação do DOM, sem mexer nas telas (POL33-A cuida da escala dos interiores).
const PANELS33 = '.c27-pn, .in31-pn';
function panel33(el: HTMLElement): void {
  if (el.dataset.ob33) return;
  el.dataset.ob33 = '1';
  const hd = el.querySelector('.c27-ph b, h3, h4, b');
  const name = hd ? txt33(hd) : '';
  const ob = oldCard33(el, `pn|${name}`, t(l('Ações', 'Actions')), { nav: true });
  if (!ob) return;
  ob.el.classList.add('ob33-pcol');
  el.classList.add('ob33-pn');
  el.append(ob.el);
}
/** Botão de fechar dos painéis: "Esc fechar" escrito (como no papel), no lugar do × solto. */
function closer33(b: HTMLButtonElement): void {
  if (b.dataset.ob33) return;
  b.dataset.ob33 = '1';
  b.classList.add('ob33-x');
  b.replaceChildren(h('kbd', null, 'Esc'), ' ', t(l('fechar', 'close')));
}
function scan33(root: ParentNode): void {
  root.querySelectorAll<HTMLButtonElement>('.navsheet27-x').forEach(closer33);
  if (!document.querySelector('.app5')) return;
  root.querySelectorAll<HTMLElement>(PANELS33).forEach(panel33);
  root.querySelectorAll<HTMLButtonElement>('.c27-pn .w19-x, .c27-sheet .w19-x, .in31-ph > button.icon, .deco5-x').forEach(closer33);
}
if (typeof document !== 'undefined' && typeof MutationObserver !== 'undefined') {
  let q = false;
  const mo = new MutationObserver(() => {
    if (q) return;
    q = true;
    queueMicrotask(() => { q = false; scan33(document); });
  });
  const go = () => mo.observe(document.body, { childList: true, subtree: true });
  if (document.body) go(); else document.addEventListener('DOMContentLoaded', go);
}

/** Linhas numeradas à vista, por ordem de prioridade: papel aberto, painel do lugar, cartão da cidade no mapa. */
function digitRows33(): HTMLElement[] {
  const deco = document.querySelector('.deco5 .deco5-side');
  if (deco) return [...deco.querySelectorAll<HTMLElement>('.deco5-it')].filter((x) => x.offsetParent);
  const menu = document.querySelector('.am20, .cx27');
  if (menu) return [...menu.querySelectorAll<HTMLElement>('.am20-item, .cx27-item')].filter((x) => x.offsetParent);
  const col = document.querySelector('.p5 .ob33-col') ?? [...document.querySelectorAll<HTMLElement>('.ob33-pcol')].find((x) => x.offsetParent);
  if (col) return [...col.querySelectorAll<HTMLButtonElement>('.ac5-a')];
  const cc = document.querySelector<HTMLButtonElement>('.m5-ccard .m5-cc-go');
  return cc ? [cc] : [];
}
// teclas 1–9: a linha do cartão à vista (antes dos atalhos de objeto da casca)
if (typeof window !== 'undefined') window.addEventListener('keydown', (e) => {
  if (!/^[1-9]$/.test(e.key) || e.ctrlKey || e.metaKey || e.altKey) return;
  const tg = e.target as HTMLElement | null;
  if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.tagName === 'SELECT' || tg.isContentEditable)) return;
  const pick = [...document.querySelectorAll('.overlay')].pop()?.querySelector('.tu5-picks'); // escolha da época do tutorial (tela inicial)
  if (pick) {
    const r = pick.querySelectorAll<HTMLElement>('.tu5-pick')[Number(e.key) - 1];
    if (r) { e.preventDefault(); e.stopImmediatePropagation(); r.click(); }
    return;
  }
  if (!document.querySelector('.app5') || document.querySelector('.pz5-back, .ac5[data-card]')) return;
  if (document.querySelector('.overlay') && !document.querySelector('.am20, .cx27')) return;
  const b = digitRows33()[Number(e.key) - 1];
  if (!b) return;
  e.preventDefault(); e.stopImmediatePropagation();
  if (!(b as HTMLButtonElement).disabled) b.click();
}, true);
