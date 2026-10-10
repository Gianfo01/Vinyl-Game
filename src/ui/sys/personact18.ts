// Rodada 18 (item 11) — o MESMO menu de ações em toda página/popup de pessoa: artista e integrante (página de
// pessoa), quem não é artista (página única r16: empresário, produtor, chefe de selo, crítico, jornalista, equipe,
// família…) e, na página do artista, um atalho por integrante. Cada linha: custo, chance (com tooltip do porquê),
// motivo do bloqueio e o resultado logo abaixo. Bolinhas aparecem como ⏱ (a confirmação do agenda17 vale).

import { l } from '../../data/world';
import { t } from '../../i18n/strings';
import { costMoney18, doPersonAction18, PA_GROUP, paLog18, personActions18, type PAGroup, type PARow } from '../../sim/personact18';
import type { Act, GameState } from '../../sim/types';
import { $, rerender, toast } from '../common';
import { h } from '../dom';
import { whyAttrs } from '../explain18';
import { openOffer } from '../ficha';
import { confirm18 } from '../quick18';
import { fmtL } from '../../sim/util';
import { ACT_HEAD_EXTRAS, PERSON_HEAD_EXTRAS } from '../pages';
import { ic } from '../vis';
import { PAGE16_HEAD } from './people16';
import './core18.css';

const ORDER: PAGroup[] = ['social', 'career', 'press', 'care', 'love', 'dark'];
const pct = (p: number) => `${Math.round(p * 100)}%`;

function row(s: GameState, key: string, r: PARow, done: (txt: string, ok: boolean) => void): HTMLElement {
  const balls = r.cost.balls ?? 0;
  const money = costMoney18(s, r.cost);
  const lbl = `${t(r.def.label)}${balls ? ` ${'⏱'.repeat(balls)}` : ''}`;
  return h('div', { class: `pa18-row ${r.block ? 'off' : ''}` },
    h('span', null, r.def.icon ? ic(r.def.icon) : null, ' ', h('b', null, t(r.def.label)),
      money ? h('span', { class: 'muted' }, ` · ${$(money)}`) : null,
      r.chance ? h('span', null, ' · ', h('span', { ...whyAttrs('pa.chance', { id: r.def.id, key }), class: `pill why18 ${r.chance.p >= 0.6 ? 'good' : r.chance.p < 0.35 ? 'bad' : 'warn'}` }, pct(r.chance.p))) : null),
    h('button', { class: `btn small ${r.def.group === 'dark' ? 'ghost' : ''}`, disabled: !!r.block, 'aria-label': lbl,
      onclick: () => {
        const go = () => {
          const o = doPersonAction18(s, r.def.id, key);
          if (o.ui === 'offer' && o.uiArg) { openOffer(o.uiArg); return; }
          done(t(o.text), o.ok);
        };
        // confirmação só no que não tem volta (jogo sujo)
        if (r.def.group === 'dark') confirm18(r.def.label, fmtL(l('{d} Chance: {p}. Pode vazar e virar fato público.', '{d} Odds: {p}. It may leak and become public.'), { d: r.def.desc ?? '', p: r.chance ? pct(r.chance.p) : '—' }), l('Fazer mesmo assim', 'Do it anyway'), go);
        else go();
      } }, lbl),
    r.block ? h('small', null, t(r.block)) : r.def.desc ? h('small', null, t(r.def.desc)) : null);
}

/** Menu completo de ações sobre a pessoa `key` (redesenha a si mesmo depois de cada ação). */
export function actionMenu18(s: GameState, key: string): HTMLElement {
  const box = h('div', { class: 'pa18' });
  let last: { txt: string; ok: boolean } | null = null;
  const draw = () => {
    const rows = personActions18(s, key);
    const log = paLog18(s, key).slice(0, 3);
    box.replaceChildren(...([
      last ? h('div', { class: `pa18-out ${last.ok ? 'good' : 'bad'}`, role: 'status' }, last.txt) : null,
      ...ORDER.map((g) => { const rs = rows.filter((r) => r.def.group === g); return rs.length ? h('div', { class: 'pa18-grp' }, h('b', null, t(PA_GROUP[g])), rs.map((r) => row(s, key, r, (txt, ok) => { last = { txt, ok }; toast(txt, ok ? 'good' : 'bad'); draw(); }))) : null; }),
      rows.length ? null : h('p', { class: 'empty18' }, t(l('Nenhuma ação possível com esta pessoa agora.', 'No possible action with this person right now.'))),
      log.length ? h('details', { class: 'small' }, h('summary', { class: 'muted' }, t(l('Últimas ações com esta pessoa', 'Last actions with this person'))), h('ul', null, log.map((x) => h('li', { class: x.ok ? 'good' : 'bad' }, `${x.y}: `, t(x.t))))) : null,
      h('p', { class: 'muted small' }, t(l('Chances levam em conta a opinião sobre você, a fama dos dois e a personalidade. Passe o mouse na porcentagem para ver o porquê.', 'Odds account for their opinion of you, both your fame and their personality. Hover the percentage to see why.'))),
    ] as (HTMLElement | null)[]).filter((x): x is HTMLElement => !!x));
  };
  draw();
  return box;
}

/** Bloco recolhível "Ações" para cabeçalhos de página. */
export function actionDetails18(s: GameState, key: string, open = false): HTMLElement {
  const d = h('details', { class: 'pa18-d', open }, h('summary', { class: 'btn small' }, ic('handshake'), ' ', t(l('Ações com esta pessoa', 'Actions with this person'))));
  let filled = false;
  const fill = () => { if (!filled && d.open) { filled = true; d.appendChild(actionMenu18(s, key)); } };
  d.addEventListener('toggle', fill);
  if (open) fill();
  return d;
}

/** Página do artista: escolha o integrante e veja o menu dele. */
function actActions(s: GameState, a: Act): HTMLElement | null {
  const ms = a.members.filter((m) => s.persons[m] && !s.persons[m].isPlayer);
  if (!ms.length) return null;
  const d = h('details', { class: 'pa18-d' }, h('summary', { class: 'btn small' }, ic('handshake'), ' ', t(l('Ações', 'Actions'))));
  const body = h('div');
  const pick = (id: string) => body.replaceChildren(h('p', { class: 'small' }, h('b', null, s.persons[id].name)), actionMenu18(s, `p:${id}`));
  d.appendChild(h('div', { class: 'row wrap' }, ms.map((m) => h('button', { class: 'btn small ghost', onclick: () => pick(m) }, s.persons[m].name))));
  d.appendChild(body);
  d.addEventListener('toggle', () => { if (d.open && !body.childNodes.length) pick(a.leaderId && ms.includes(a.leaderId) ? a.leaderId : ms[0]); });
  return d;
}

export function installPersonActions18(): void {
  PERSON_HEAD_EXTRAS.push((s, p) => (p.isPlayer ? null : actionDetails18(s, `p:${p.id}`)));
  PAGE16_HEAD.push((s, key) => (key === 'player' ? null : actionDetails18(s, key)));
  ACT_HEAD_EXTRAS.push((s, a) => actActions(s, a));
}
export const _pa18ui = { rerender };
