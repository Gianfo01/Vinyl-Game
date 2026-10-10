// Rodada 17 — Lendas → Épocas (artistas que definiram cada década, cenas locais reais, covers e samples famosos,
// exposições abertas) e a "história real" na ficha de cada relíquia (com empréstimo a exposições).

import { COVERS17, ERAS17, SCENES17 } from '../../data/heritage17';
import { OHW17 } from '../../data/more17';
import { cityById, l } from '../../data/world';
import { t } from '../../i18n/strings';
import { EXPOS17, lendToExpo17, openExpos17, pastSteps17, relicDef17, whereNow17 } from '../../sim/relics17';
import { activeScenes17, pastCovers17 } from '../../sim/sys/heritage17';
import { realAct17, shownName17 } from '../../sim/sys/realidx17';
import type { Relic } from '../../sim/sys/relics9';
import type { GameState } from '../../sim/types';
import { actLink, pill, section, toast } from '../common';
import { h } from '../dom';

const who = (s: GameState, name: string, cur: boolean): HTMLElement | null => {
  const a = realAct17(s, name);
  if (a) return h('span', null, actLink(s, a.id), OHW17.has(name) ? pill('one-hit wonder', 'warn') : null);
  return cur ? null : h('span', { class: 'muted' }, shownName17(s, name));
};

export function erasTab17(s: GameState): HTMLElement {
  const dec = Math.floor(s.year / 10) * 10;
  const eras = ERAS17.filter((e) => e[0] <= dec).reverse();
  const scenes = SCENES17.filter((x) => x[3] <= s.year).reverse();
  const act = new Set(activeScenes17(s).map((x) => x[0]));
  const covers = s.config.realNames ? pastCovers17(s).slice().reverse() : [];
  const expos = EXPOS17.filter((e) => e[2] <= s.year);
  return h('div', null,
    section(t(l('Artistas que definiram a época', 'Artists who defined the era')),
      h('p', { class: 'muted small' }, t(l('Os nomes que mudaram o som de cada década. Na década atual, só aparece quem já surgiu.', 'The names that changed the sound of each decade. In the current decade, only those who have already appeared are shown.'))),
      ...eras.map((e) => h('div', { class: 'era17' }, h('h4', null, t(l('Anos {d}', 'The {d}s'), { d: e[0] })), h('p', { class: 'small' }, t(l(e[2], e[3]))),
        h('div', { class: 'row wrap', style: 'gap:6px' }, ...e[1].map((n) => who(s, n, e[0] === dec)).filter(Boolean) as HTMLElement[])))),
    section(t(l('Cenas locais', 'Local scenes')),
      h('p', { class: 'muted small' }, t(l('Enquanto a cena ferve, artistas da cidade e do estilo ganham apelo (+8%; família do gênero +4%).', 'While a scene is on fire, acts from that city and style gain appeal (+8%; same genre family +4%).'))),
      scenes.length ? h('ul', null, scenes.map((x) => h('li', null, act.has(x[0]) ? pill(t(l('fervendo', 'on fire')), 'good') : pill(`${x[3]}–${x[4]}`), ' ', h('b', null, t(l(x[5], x[6]))), ` (${t(cityById[x[1]]?.name ?? l(x[1]))}) — `, h('small', null, t(l(x[7], x[8]))), ' ',
        ...x[9].map((n) => who(s, n, true)).filter(Boolean) as HTMLElement[]))) : h('p', { class: 'muted small' }, '—')),
    covers.length ? section(t(l('Covers e samples que fizeram história', 'Covers and samples that made history')),
      h('p', { class: 'muted small' }, t(l('Quem tem a edição da música original recebe quando ela vira hit na voz de outro; sample sem liberação dá processo (principalmente depois de 1991).', 'Whoever owns the original song\'s publishing gets paid when someone else turns it into a hit; an uncleared sample means a lawsuit (especially after 1991).'))),
      h('ul', null, covers.map((c) => h('li', null, pill(`${c[0]}`), ' ', pill(c[2] === 'cover' ? 'cover' : c[2] === 'sample' ? 'sample' : t(l('autoria', 'credit')), c[6] === 'lawsuit' ? 'bad' : c[6] === 'unpaid' ? 'warn' : ''), ' ', h('b', null, `"${c[3]}"`), ' — ', h('small', null, t(l(c[7], c[8]))))))) : null,
    expos.length ? section(t(l('Museus e exposições', 'Museums and exhibitions')),
      h('ul', null, expos.map((e) => h('li', null, h('b', null, e[0]), ` · ${t(cityById[e[1]]?.name ?? l(e[1]))} · ${e[2]}${e[3] ? `–${e[3]}` : ''}`, e[3] && e[3] < s.year ? pill(t(l('encerrada', 'closed'))) : pill(t(l('aberta', 'open')), 'good'))))) : null,
  );
}

/** Bloco extra na ficha da relíquia: história real e empréstimo a exposição aberta. */
export function relicStory17(s: GameState, rl: Relic, redraw: () => void): HTMLElement | null {
  const d = rl.rr ? relicDef17(rl.rr) : undefined;
  const expos = rl.st === 'player' && !rl.ln ? openExpos17(s, rl.k) : [];
  if (!d && !expos.length) return null;
  return h('div', null,
    d ? section(t(l('História real', 'Real history')),
      h('p', null, t(d.story)),
      h('p', { class: 'small' }, t(l('Onde está', 'Where it is')), ': ', h('b', null, t(whereNow17(s, d, rl)))),
      ...pastSteps17(s, d).map((x) => h('p', { class: 'small' }, pill(String(x[0])), ' ', t(l(x[5], x[6]))))) : null,
    expos.length ? section(t(l('Emprestar para exposição', 'Lend to an exhibition')),
      h('p', { class: 'muted small' }, t(l('Cachê de 8% do valor, prestígio e fama para o artista da peça; fica fora do cofre por até um ano.', 'Fee of 8% of the value, prestige and fame for the piece\'s artist; out of the vault for up to a year.'))),
      ...expos.map((e) => h('button', { class: 'btn small', onclick: () => { const r = lendToExpo17(s, rl.id, e[0]); toast(t(r ?? l('Emprestada à exposição.', 'Lent to the exhibition.')), r ? 'bad' : 'good'); redraw(); } }, e[0]))) : null,
  );
}

export const coversCount17 = (): number => COVERS17.length;
