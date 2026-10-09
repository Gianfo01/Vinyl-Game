// Rodada 13 — peças do Novo Jogo: ajuda "(?)" com balão explicando o efeito de cada seção, seletor de
// traços em grupos (contador, efeito em jogo e motivo do bloqueio) e efeitos dos traços em texto.

import { FAMILIES, l, type L } from '../data/world';
import { SKILLS } from '../data/people';
import { t } from '../i18n/strings';
import { MAX_PLAYER_TRAITS, PLAYER_TRAITS, playerTraitById } from '../sim/sys/persona/data';
import type { CharacterSpec } from '../sim/types';
import { h } from './dom';
import { fxText } from './sys/persona';
import { HELP, TRAIT_GROUPS } from './ngdata13';
import './newgame13.css';

let wired = false;
const closeAll = () => document.querySelectorAll<HTMLElement>('.ng-pop').forEach((p) => { p.hidden = true; p.previousElementSibling?.setAttribute('aria-expanded', 'false'); });

/** Botão "(?)" que abre um balão com o efeito da opção na partida. */
export function helpTip(text: L | string): HTMLElement {
  if (!wired && typeof document !== 'undefined') {
    wired = true;
    document.addEventListener('click', closeAll);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAll(); });
  }
  const body = typeof text === 'string' ? HELP[text] ?? l(text, text) : text;
  const pop = h('span', { class: 'ng-pop', role: 'note' }, t(body));
  pop.hidden = true;
  const btn = h('button', { type: 'button', class: 'ng-help', 'aria-label': t(l('O que isto faz?', 'What does this do?')), 'aria-expanded': 'false',
    onclick: (e: Event) => { e.preventDefault(); e.stopPropagation(); const open = pop.hidden; closeAll(); pop.hidden = !open; btn.setAttribute('aria-expanded', String(open)); } }, '(?)');
  pop.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); });
  return h('span', { class: 'ng-hw' }, btn, pop);
}
/** Rótulo com ajuda: [texto, (?)] para usar dentro de label/h3/legend. */
export const hl = (text: L, help: L | string): HTMLElement[] => [h('span', { class: 'ng-lt' }, t(text), ' ', helpTip(help))];
/** Põe a ajuda no primeiro título de um cartão já pronto (cartões de outros módulos). */
export function addHelp(el: HTMLElement, help: L | string): HTMLElement {
  const hd = el.querySelector('h3, legend');
  if (hd && !hd.querySelector('.ng-hw')) hd.append(' ', helpTip(help));
  return el;
}

/** Texto de efeitos de um traço (atributos, perks, habilidades musicais e famílias). */
export function traitFx(id: string): string {
  const d = playerTraitById[id];
  if (!d) return '';
  const parts = [fxText(d.perks, d.attrs)];
  if (d.skills) parts.push(Object.entries(d.skills).map(([k, v]) => `${t(SKILLS.find((x) => x.id === k)?.name)} +${v}`).join(' · '));
  if (d.families) parts.push(`${t(l('com', 'with'))} ${d.families.ids.map((f) => t(FAMILIES.find((x) => x.id === f)?.name) || f).join('/')}: ${fxText(d.families.perks)}`);
  return parts.filter(Boolean).join(' · ');
}

/** Por que um traço não pode ser escolhido agora (null = pode). */
export function traitBlock(ch: CharacterSpec, id: string): L | null {
  const cur = ch.traits ?? [];
  if (cur.includes(id)) return null;
  const clash = cur.find((x) => x === playerTraitById[id]?.opposite || playerTraitById[x]?.opposite === id);
  if (clash) return { pt: `Conflita com ${playerTraitById[clash].name.pt} (já escolhido)`, en: `Clashes with ${playerTraitById[clash].name.en} (already picked)` };
  if (cur.length >= MAX_PLAYER_TRAITS) return l('Limite atingido: remova um traço para trocar', 'Limit reached: remove a trait to swap');
  return null;
}

/** Seletor de traços em grupos, com contador, chips dos escolhidos e motivo de cada bloqueio. */
export function traitPicker(ch: CharacterSpec, onChange: () => void): HTMLElement {
  const box = h('div', { class: 'tr13' });
  const pool = PLAYER_TRAITS.filter((x) => !x.earned);
  const grouped = new Set(TRAIT_GROUPS.flatMap((g) => g.ids));
  const groups = [...TRAIT_GROUPS, { id: 'other', name: l('Outros', 'Others'), desc: l('', ''), ids: pool.filter((x) => !grouped.has(x.id)).map((x) => x.id) }].filter((g) => g.ids.some((id) => playerTraitById[id] && !playerTraitById[id].earned));
  const toggle = (id: string) => { const cur = ch.traits ?? []; ch.traits = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]; draw(); onChange(); };
  const draw = () => {
    const cur = ch.traits ?? [];
    const left = MAX_PLAYER_TRAITS - cur.length;
    box.replaceChildren(
      h('div', { class: 'tr13-head' },
        h('b', { class: `tr13-count ${left ? '' : 'full'}` }, t(l('Escolhidos: {n}/{m}', 'Picked: {n}/{m}'), { n: cur.length, m: MAX_PLAYER_TRAITS })),
        ...cur.map((id) => h('button', { type: 'button', class: 'tr13-chip', title: t(l('Remover', 'Remove')), onclick: () => toggle(id) }, `${t(playerTraitById[id]?.name)} ✕`)),
        h('small', { class: 'muted' }, left ? t(l('Você ainda pode escolher {n}.', 'You can still pick {n}.'), { n: left }) : t(l('Limite atingido — clique num escolhido para trocar.', 'Limit reached — click a picked one to swap.')))),
      ...groups.map((g) => h('div', { class: 'tr13-group' },
        h('h5', null, t(g.name), g.desc.pt ? h('small', { class: 'muted' }, ` — ${t(g.desc)}`) : null),
        h('div', { class: 'tr13-grid' }, ...g.ids.filter((id) => playerTraitById[id] && !playerTraitById[id].earned).map((id) => {
          const d = playerTraitById[id];
          const on = cur.includes(id);
          const why = traitBlock(ch, id);
          const fx = traitFx(id);
          return h('button', { type: 'button', class: `pick tr13-card ${on ? 'on' : ''} ${why ? 'blocked' : ''}`, disabled: !!why, 'aria-pressed': on ? 'true' : 'false', title: why ? t(why) : t(d.desc), onclick: () => toggle(id) },
            h('b', null, t(d.name), d.congenital ? ' ✦' : '', on ? h('span', { class: 'tr13-on' }, ' ✓') : null),
            h('small', null, t(d.desc)),
            fx ? h('small', { class: 'tr13-fx' }, fx) : null,
            why ? h('small', { class: 'tr13-why' }, `⛔ ${t(why)}`) : d.opposite ? h('small', { class: 'muted' }, `${t(l('Oposto', 'Opposite'))}: ${t(playerTraitById[d.opposite]?.name)}`) : null);
        })))),
    );
  };
  draw();
  return box;
}
