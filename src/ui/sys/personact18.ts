// Rodada 18 (item 11) — o MESMO menu de ações em toda página/popup de pessoa: artista e integrante (página de
// pessoa), quem não é artista (página única r16: empresário, produtor, chefe de selo, crítico, jornalista, equipe,
// família…) e, na página do artista, um atalho por integrante. Cada linha: custo, chance (com tooltip do porquê),
// motivo do bloqueio e o resultado logo abaixo. Bolinhas aparecem como ⏱ (a confirmação do agenda17 vale).

import { l, type L } from '../../data/world';
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
import { openFamily29 } from './family29';
import { CTXHOOK27, NO_ACTIONS29, ctxMenu27, liveCount29, menuSections27, secOf27, type CtxItem27, type CtxMenu27 } from '../ps/ctx27model';
import './core18.css';

const ORDER: PAGroup[] = ['social', 'career', 'press', 'care', 'love', 'dark'];
const pct = (p: number) => `${Math.round(p * 100)}%`;

/** r29: executa uma ação do menu de pessoa — o MESMO caminho do botão da ficha e do item `pa:<id>` do clique direito
 *  (confirmação no jogo sujo; "oferecer contrato" abre a proposta). `done` recebe o texto do resultado. */
export function runPA18(s: GameState, key: string, id: string, done: (txt: string, ok: boolean) => void): void {
  const r = personActions18(s, key).find((x) => x.def.id === id);
  if (!r) { done(t(l('Ação indisponível.', 'Action unavailable.')), false); return; }
  if (r.block) { done(t(r.block), false); return; }
  const go = () => {
    const o = doPersonAction18(s, r.def.id, key);
    if (o.ui === 'offer' && o.uiArg) { openOffer(o.uiArg); return; }
    if (o.ui === 'family' && o.uiArg) { openFamily29(o.uiArg); return; } // R29 (família): "Ver família" abre a aba Família
    done(t(o.text), o.ok);
  };
  // confirmação só no que não tem volta (jogo sujo)
  if (r.def.group === 'dark') confirm18(r.def.label, fmtL(l('{d} Chance: {p}. Pode vazar e virar fato público.', '{d} Odds: {p}. It may leak and become public.'), { d: r.def.desc ?? '', p: r.chance ? pct(r.chance.p) : '—' }), l('Fazer mesmo assim', 'Do it anyway'), go);
  else go();
}

function row(s: GameState, key: string, r: PARow, done: (txt: string, ok: boolean) => void): HTMLElement {
  const balls = r.cost.balls ?? 0;
  const money = costMoney18(s, r.cost);
  const lbl = `${t(r.def.label)}${balls ? ` ${'⏱'.repeat(balls)}` : ''}`;
  return h('div', { class: `pa18-row ${r.block ? 'off' : ''}` },
    h('span', null, r.def.icon ? ic(r.def.icon) : null, ' ', h('b', null, t(r.def.label)),
      money ? h('span', { class: 'muted' }, ` · ${$(money)}`) : null,
      r.chance ? h('span', null, ' · ', h('span', { ...whyAttrs('pa.chance', { id: r.def.id, key }), class: `pill why18 ${r.chance.p >= 0.6 ? 'good' : r.chance.p < 0.35 ? 'bad' : 'warn'}` }, pct(r.chance.p))) : null),
    h('button', { class: `btn small ${r.def.group === 'dark' ? 'ghost' : ''}`, disabled: !!r.block, 'aria-label': lbl, title: r.block ? t(r.block) : null,
      onclick: () => runPA18(s, key, r.def.id, done) }, lbl),
    r.block ? h('small', null, t(r.block)) : r.def.desc ? h('small', null, t(r.def.desc)) : null);
}

/** r29: linha de um item do menu de ações que não é do registro de pessoa (contratar, almoço de negócios, presente pela
 *  conversa de favor, planos do Submundo, atalhos…) — executa pelo MESMO caminho do clique direito (CTXHOOK27.run). */
function ctxRow29(s: GameState, m: CtxMenu27, x: CtxItem27): HTMLElement {
  const run = CTXHOOK27.run;
  const block = x.block ?? (run ? null : l('Indisponível nesta tela.', 'Unavailable on this screen.'));
  return h('div', { class: `pa18-row ${block ? 'off' : ''}`, 'data-act': x.id },
    h('span', null, x.icon ? ic(x.icon) : null, ' ', h('b', null, t(x.label)),
      x.cost ? h('span', { class: 'muted' }, ` · ${$(x.cost)}`) : null,
      x.chance !== undefined ? h('span', null, ' · ', h('span', { class: `pill ${x.chance >= 0.6 ? 'good' : x.chance < 0.35 ? 'bad' : 'warn'}` }, pct(x.chance))) : null),
    h('button', { class: `btn small ${x.sec === 'dark' ? 'ghost' : ''}`, disabled: !!block, title: block ? t(block) : null, 'aria-label': t(x.label),
      onclick: (e: Event) => { if (run) run(s, m, x, e.currentTarget as HTMLElement); } }, t(x.label)),
    block ? h('small', null, t(block)) : x.note ? h('small', null, t(x.note)) : null);
}

/** Menu completo de ações sobre a pessoa `key` (redesenha a si mesmo depois de cada ação).
 *  r29: as seções e os itens vêm do MESMO modelo do clique direito (ctxMenu27 + menuSections27): Carreira e contrato,
 *  Música e projetos, Ao vivo, Relação e vida pessoal, Imprensa e imagem, Submundo, Atalhos. */
export function actionMenu18(s: GameState, key: string): HTMLElement {
  const box = h('div', { class: 'pa18' });
  let last: { txt: string; ok: boolean } | null = null;
  const draw = () => {
    const rows = personActions18(s, key);
    const log = paLog18(s, key).slice(0, 3);
    const done = (txt: string, ok: boolean) => { last = { txt, ok }; toast(txt, ok ? 'good' : 'bad'); draw(); };
    let m: CtxMenu27 | null = null;
    try { m = ctxMenu27(s, 'person', key, CTXHOOK27.env?.(s) ?? {}); } catch { m = null; }
    const secs = m ? menuSections27(m).map((x) => ({ ...x, items: x.items.filter((i) => i.id !== 'copy' && i.id !== 'person.open') })).filter((x) => x.sec !== 'open' && x.items.length) : [];
    const grouped = m ? secs.map((x) => h('div', { class: 'pa18-grp', 'data-sec': x.sec }, h('b', null, t(x.label)), x.items.map((i) => {
      if (i.id.startsWith('pa:')) { const r = rows.find((y) => y.def.id === i.id.slice(3)); return r ? row(s, key, i.block && !r.block ? { ...r, block: i.block } : r, done) : null; } // r29: o bloqueio do menu vale aqui também
      return ctxRow29(s, m!, i);
    }))) : ORDER.map((g) => { const rs = rows.filter((r) => r.def.group === g); return rs.length ? h('div', { class: 'pa18-grp' }, h('b', null, t(PA_GROUP[g])), rs.map((r) => row(s, key, r, done))) : null; });
    box.replaceChildren(...([
      last ? h('div', { class: `pa18-out ${last.ok ? 'good' : 'bad'}`, role: 'status' }, last.txt) : null,
      ...grouped,
      rows.length ? null : h('p', { class: 'empty18' }, t(l('Nenhuma ação possível com esta pessoa agora.', 'No possible action with this person right now.'))),
      log.length ? h('details', { class: 'small' }, h('summary', { class: 'muted' }, t(l('Últimas ações com esta pessoa', 'Last actions with this person'))), h('ul', null, log.map((x) => h('li', { class: x.ok ? 'good' : 'bad' }, `${x.y}: `, t(x.t))))) : null,
      h('p', { class: 'muted small' }, t(l('Chances levam em conta a opinião sobre você, a fama dos dois e a personalidade. Passe o mouse na porcentagem para ver o porquê.', 'Odds account for their opinion of you, both your fame and their personality. Hover the percentage to see why.'))),
    ] as (HTMLElement | null)[]).filter((x): x is HTMLElement => !!x));
  };
  draw();
  return box;
}

/** r29 (menus): a pessoa tem alguma ação possível agora? (o mesmo modelo do clique direito, sem "Abrir ficha"/"Copiar") */
export function hasActions29(s: GameState, key: string): boolean {
  let m: CtxMenu27 | null = null;
  try { m = ctxMenu27(s, 'person', key, CTXHOOK27.env?.(s) ?? {}); } catch { m = null; }
  if (m) return liveCount29(m, (x) => secOf27(x) === 'open') > 0; // o painel não mostra "Ver / Abrir" (já está na ficha)
  try { return personActions18(s, key).some((r) => !r.block); } catch { return false; }
}
/** r29 (menus): botão "Ações…" desabilitado, com o motivo no tooltip e para leitores de tela. */
export function offBtn29(label: L, why: L = NO_ACTIONS29): HTMLElement {
  return h('button', { type: 'button', class: 'btn small pa18-off', disabled: true, 'aria-disabled': 'true', title: t(why), 'aria-label': `${t(label)} — ${t(why)}`, 'data-noacts29': '' },
    ic('handshake'), ' ', t(label));
}

/** Bloco recolhível "Ações" para cabeçalhos de página. */
export function actionDetails18(s: GameState, key: string, open = false): HTMLElement {
  // r29 (menus): sem nenhuma ação possível agora, o botão aparece desabilitado com o motivo (nada de painel vazio)
  if (!hasActions29(s, key)) return offBtn29(l('Ações com esta pessoa', 'Actions with this person'));
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
  if (!ms.some((m) => hasActions29(s, `p:${m}`))) return offBtn29(l('Ações', 'Actions')); // r29 (menus)
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
