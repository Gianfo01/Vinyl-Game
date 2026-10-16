// R31 · onda 4 (W) — O PADRÃO NOVO NAS CENAS QUE JÁ EXISTEM (gravar, compor, show, entrevista, crise, diretoria,
// golpe, rede de favores, olheiro): uma faixa de elenco no topo da cena com as PESSOAS REAIS envolvidas — cada uma com
// o gesto (humor sobre você, de opinion.ts) lido conforme você a conhece (know.ts: clara ou "difícil de ler") e um
// clique para a ficha — e o botão "Pular cena", que fecha a cena e deixa o jogo resolver do jeito de sempre (o mesmo
// caminho de quando a cena não é jogada). Só lê o estado; nada aqui decide.

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { actOf } from '../../sim/sys/people/state';
import type { GameState } from '../../sim/types';
import { h } from '../dom';
import { openPerson } from '../ficha';
import { mood31, personMood31, staffMood31, type Mood31 } from './scene31core';
import './mech31.css';

export interface Who31 { id: string; name: string; part?: string; mood: Mood31; person: boolean }

/** Resolve ids misturados (pessoa, 'p:pessoa', ato → integrantes, funcionário, selo → líder) em gente com humor. Só leitura. */
export function cast31(s: GameState, ids: (string | undefined | null)[], max = 6): Who31[] {
  const out: Who31[] = [];
  const seen = new Set<string>();
  const add = (w: Who31) => { if (!seen.has(w.id) && out.length < max) { seen.add(w.id); out.push(w); } };
  const person = (pid: string, part?: string) => {
    const p = s.persons[pid];
    if (!p || !p.alive || p.isPlayer) return;
    add({ id: pid, name: p.name, part: part ?? actOf(s, pid)?.name, mood: personMood31(s, pid), person: true });
  };
  for (const raw of ids) {
    if (!raw) continue;
    const id = raw.startsWith('p:') || raw.startsWith('l:') ? raw.slice(2) : raw;
    if (s.persons[id]) { person(id); continue; }
    const a = s.acts[id];
    if (a) { for (const m of a.members) person(m, a.name); continue; }
    const st = s.player.staff.find((x) => x.id === id);
    if (st) { add({ id: st.id, name: st.name, part: st.role, mood: staffMood31(s, st.id), person: false }); continue; }
    const lb = s.labels[id];
    if (lb?.leaderId) person(lb.leaderId, lb.name);
  }
  return out;
}

const SKIP_TIP: L = l('Fecha a cena; o que não foi jogado segue o caminho de sempre (o mesmo resultado do modo rápido).',
  'Closes the scene; whatever was not played follows the usual path (the same result as quick mode).');

/** Faixa de elenco + "Pular cena". `ids` pode ser função (lida a cada abertura). */
export function castBar31(s: GameState, ids: (string | undefined | null)[], skip?: () => void): HTMLElement | null {
  const ws = cast31(s, ids);
  if (!ws.length && !skip) return null;
  return h('div', { class: 'mc31-cast', role: 'group', 'aria-label': t(l('Quem está na cena', 'Who is in the scene')) },
    ...ws.map((w) => h('button', {
      type: 'button', class: `mc31-who31 tone-${w.mood.tone}`, 'data-cast31': w.id,
      title: `${w.name} · ${w.mood.icon} ${t(w.mood.label)}${w.mood.clear ? '' : ` — ${t(l('leitura ambígua: você conhece pouco esta pessoa', 'ambiguous read: you know this person little'))}`}`,
      onclick: () => { if (w.person) openPerson(w.id); },
    }, h('span', { 'aria-hidden': 'true' }, w.mood.icon), ' ', h('b', null, w.name), w.part ? h('small', { class: 'muted' }, ` · ${w.part}`) : null,
      h('small', null, ` · ${t(w.mood.label)}`), w.mood.clear ? null : h('small', { class: 'muted' }, ' (?)'))),
    skip ? h('button', { type: 'button', class: 'btn small ghost mc31-skip31', 'data-skip31': '', title: t(SKIP_TIP), onclick: skip }, '⏭ ', t(l('Pular cena', 'Skip scene'))) : null);
}

/** Embrulha a raiz de uma cena antiga com a faixa de elenco por cima (a raiz continua sendo redesenhada pela cena). */
export function withCast31(s: GameState, ids: (string | undefined | null)[], root: HTMLElement, skip?: () => void): HTMLElement {
  const bar = castBar31(s, ids, skip);
  return bar ? h('div', { class: 'mc31-castwrap' }, bar, root) : root;
}
export { mood31 };
