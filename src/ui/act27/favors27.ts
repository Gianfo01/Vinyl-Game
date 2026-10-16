// r27 (P2A) — REDE DE FAVORES (interface): quadro de cortiça em pixel art com fichas presas por alfinete e barbantes
// coloridos (verde = te devem, azul = você deve, vermelho = mágoa, preto = segredo/chantagem). Clicar numa ficha abre
// o livro daquela pessoa e as jogadas: dar (almoço/jantar/presente + conversa), pedir sem crédito, cobrar, retribuir,
// queimar o contato, chantagear/expor. Motor: src/sim/sys/favors27.ts (holds17 + persona13 + secrets23).

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import type { HoldKind } from '../../sim/holds17';
import {
  ASK27, askBlock27, askNow27, burn27, call27, contact27, contacts27, give27, giveBlock27, repay27, repayCost27, strings27, talkFit27, useDirt27,
  type Ask27, type Contact27, type Gesture27, type Talk27,
} from '../../sim/sys/favors27';
import { GIFT_COST } from '../../sim/sys/persona13';
import { LUNCH_COST } from '../../sim/sys/managers14';
import { DINNER_COST } from '../../sim/sys/producers15';
import { canUse } from '../../sim/holds17';
import type { GameState } from '../../sim/types';
import { money } from '../../sim/util';
import { $, modal, rerender, toast } from '../common';
import { h } from '../dom';
import { store } from '../store';
import { cutscene27, playBtn27 } from './mode27';
import { paintCork27 } from './p2apx27';
import './p2a27.css';
import { askConfirm } from '../ask31';

const T = (x: L | string): string => (typeof x === 'string' ? x : t(x));
const SVG = 'http://www.w3.org/2000/svg';
const KIND_NAME: Record<string, L> = {
  manager: l('Empresário', 'Manager'), producer: l('Produtor', 'Producer'), critic: l('Crítico', 'Critic'), leader: l('Executivo', 'Executive'),
  staff: l('Equipe', 'Staff'), person: l('Pessoa', 'Person'), act: l('Artista', 'Act'), label: l('Selo', 'Label'), other: l('Contato', 'Contact'),
};
const STR_COL: Partial<Record<HoldKind, string>> = { favor: '#3fa34d', loyalty: '#3fa34d', promise: '#7fd18a', debt: '#3a6fd8', grievance: '#d83a3a', secret: '#111111', blackmail: '#111111' };
const GEST: Record<Gesture27, { n: L; cost: number }> = { lunch: { n: l('Almoço', 'Lunch'), cost: LUNCH_COST }, dinner: { n: l('Jantar', 'Dinner'), cost: DINNER_COST }, gift: { n: l('Presente', 'Gift'), cost: GIFT_COST } };
const TALK: Record<Talk27, L> = { flatter: l('Elogiar', 'Flatter'), business: l('Falar de negócios', 'Talk business'), help: l('Oferecer ajuda', 'Offer help') };

/** @deprecated r27 FLOW2: não use — almoço/jantar/presente/pedir favor abrem a conversa (flow27p2.ts: favorAct27). */
export function favorsBtn27(focus?: string, label?: L): HTMLElement | null {
  return playBtn27(label ?? l('Rede de favores', 'Favor network'), () => openFavors27(focus), false,
    l('Quem deve a quem e quem sabe o quê: dar cria crédito, pedir cria dívida, cobrar gasta, queimar tem preço.', 'Who owes whom and who knows what: giving builds credit, asking builds debt, calling in spends it, burning has a price.'));
}

const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase();

/** r27 (FLOW2): `o.gesture` = a ação que abriu a conversa (almoço, jantar, presente, pedir favor); `o.classic` = o
 *  caminho rápido dentro dela (a mesma ação de sempre, sem conversa). */
export function openFavors27(focus?: string, o: { gesture?: Gesture27 | 'ask'; classic?: () => void } = {}): void {
  const s = store.game;
  if (!s) return;
  let sel = focus;
  let closeFn = (): void => {};
  let talk: Talk27 = 'help';
  let ask: Ask27 = 'word';
  const root = h('div', { class: 'p2a fv27' });
  const say = (ok: boolean, x: L) => { toast(t(x), ok ? 'info' : 'bad'); draw(); };
  const draw = () => {
    let cs = contacts27(s, 12);
    if (focus && !cs.some((c) => c.key === focus)) { const extra = contacts27(s, 40).find((c) => c.key === focus) ?? contact27(s, focus); if (extra) cs = [...cs.slice(0, 11), extra]; }
    const cur = cs.find((c) => c.key === sel) ?? cs[0];
    sel = cur?.key;
    // posições: você no centro, contatos numa elipse
    const pos = new Map<string, [number, number]>([['player', [50, 52]]]);
    cs.forEach((c, i) => { const a = (i / Math.max(1, cs.length)) * Math.PI * 2 - Math.PI / 2; pos.set(c.key, [50 + Math.cos(a) * 38, 52 + Math.sin(a) * 36]); });
    const board = h('div', { class: 'fv27-board', role: 'group', 'aria-label': t(l('Quadro de favores', 'Favor board')) });
    try { const cv = paintCork27().canvas(); cv.setAttribute('aria-hidden', 'true'); board.append(cv); } catch { /* sem canvas */ }
    const svg = document.createElementNS(SVG, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100'); svg.setAttribute('preserveAspectRatio', 'none'); svg.setAttribute('aria-hidden', 'true');
    const strs = strings27(s, cs);
    strs.forEach((x, i) => {
      const a = pos.get(x.from), b = pos.get(x.to);
      if (!a || !b) return;
      const ln = document.createElementNS(SVG, 'path');
      const mx = (a[0] + b[0]) / 2 + ((i % 3) - 1) * 2, my = (a[1] + b[1]) / 2 + 4; // barbante cede no meio
      ln.setAttribute('d', `M${a[0]},${a[1]} Q${mx},${my} ${b[0]},${b[1]}`);
      ln.setAttribute('fill', 'none'); ln.setAttribute('stroke', STR_COL[x.kind] ?? '#c8a165');
      ln.setAttribute('stroke-width', String(0.4 + x.strength / 120)); ln.setAttribute('vector-effect', 'non-scaling-stroke');
      ln.setAttribute('style', `stroke-width:${1.5 + x.strength / 40}px;opacity:${x.from === sel || x.to === sel ? 1 : 0.75}`);
      svg.append(ln);
    });
    board.append(svg);
    const pin = (key: string, name: string, sub: string, tags: HTMLElement[], cls: string, rot: number, pinCol: string) => {
      const [x, y] = pos.get(key)!;
      return h('button', { type: 'button', class: `fv27-pin ${cls} ${key === sel ? 'sel' : ''}`, style: `left:${x}%;top:${y}%;--rot:${rot}deg;--pin:${pinCol}`, 'aria-pressed': key === sel ? 'true' : 'false', onclick: key === 'player' ? undefined : () => { sel = key; draw(); } },
        h('span', { class: 'fv27-mono', 'aria-hidden': 'true' }, initials(name)), h('b', null, name), h('small', null, sub), tags.length ? h('span', { class: 'fv27-tags' }, tags) : null);
    };
    board.append(pin('player', s.config.companyName, t(l('você', 'you')), [], 'me', 0, '#e8b04a'));
    cs.forEach((c, i) => {
      const tags: HTMLElement[] = [];
      if (c.owesMe.length) tags.push(h('i', { class: 'owe', title: t(l('te deve', 'owes you')) }, `+${c.owesMe.length}`));
      if (c.iOwe.length) tags.push(h('i', { class: 'debt', title: t(l('você deve', 'you owe')) }, `−${c.iOwe.length}`));
      if (c.grudges.length) tags.push(h('i', { class: 'grudge', title: t(l('mágoa', 'grudge')) }, '✕'));
      if (c.dirt.length || c.know) tags.push(h('i', { class: 'dirt', title: t(l('você sabe segredos', 'you know secrets')) }, '?'));
      if (c.leak) tags.push(h('i', { class: 'leak', title: t(l('insatisfeito: pode vazar segredos', 'unhappy: may leak secrets')) }, '!'));
      board.append(pin(c.key, c.name, `${T(KIND_NAME[c.kind])} · ${c.op >= 0 ? '+' : ''}${Math.round(c.op)}`, tags, '', ((i * 37) % 9) - 4, c.op >= 15 ? '#3fa34d' : c.op <= -15 ? '#d83a3a' : '#d8a83a'));
    });
    const legend = h('div', { class: 'fv27-legend' },
      h('span', { style: '--c:#3fa34d' }, t(l('te devem', 'owe you'))), h('span', { style: '--c:#3a6fd8' }, t(l('você deve', 'you owe'))),
      h('span', { style: '--c:#d83a3a' }, t(l('mágoa', 'grudge'))), h('span', { style: '--c:#111' }, t(l('segredo/chantagem', 'secret/blackmail'))));
    root.replaceChildren(h('div', { class: 'p2a-cols' }, h('div', null, board, legend), cur ? side(s, cur) : h('p', { class: 'muted' }, t(l('Ninguém no quadro ainda: almoce, jante, presenteie — ou cobre.', 'Nobody on the board yet: lunch, dine, give gifts — or call in.')))));
  };
  const side = (s2: GameState, c: Contact27): HTMLElement => {
    const blockG = (g: Gesture27) => giveBlock27(s2, c.key, g);
    const fit = (x: Talk27) => talkFit27(c, x);
    const holdRow = (cls: string, text: L, btns: (HTMLElement | null)[]) => h('div', { class: `fv27-hold ${cls}` }, h('span', null, T(text)), h('span', { class: 'fv27-acts' }, btns));
    return h('div', { class: 'fv27-side' },
      h('div', null, h('b', null, c.name), ' ', h('span', { class: 'muted small' }, `${T(KIND_NAME[c.kind])} · ${t(l('opinião', 'opinion'))} ${c.op >= 0 ? '+' : ''}${Math.round(c.op)}`)),
      c.vanity !== undefined ? h('p', { class: 'small muted' }, t(l('Vaidade {v} · generosidade {g} · ambição {a} — escolha a conversa pela personalidade.', 'Vanity {v} · generosity {g} · ambition {a} — pick the talk to fit the personality.'), { v: Math.round(c.vanity), g: Math.round(c.generosity ?? 50), a: Math.round(c.ambition ?? 50) })) : null,
      c.leak ? h('p', { class: 'small warn' }, t(l('Insatisfeito com o selo: equipe assim vaza segredos para a imprensa.', 'Unhappy with the label: staff like this leak secrets to the press.'))) : null,
      c.know ? h('p', { class: 'small' }, t(l('Você conhece {n} segredo(s) sobre {p} (veja Segredos).', 'You know {n} secret(s) about {p} (see Secrets).'), { n: c.know, p: c.name })) : null,
      h('h4', null, t(l('Livro', 'Ledger'))),
      ...c.owesMe.map((x) => holdRow('owe', x.text, [
        h('button', { class: 'btn small', disabled: !!canUse(s2, x, 'call'), title: T(canUse(s2, x, 'call') ?? ASK27[ask].hint), onclick: () => { const r = call27(s2, x.id, ask); say(r.ok, r.text); } }, t(l('Cobrar: {a}', 'Call in: {a}'), { a: T(ASK27[ask].name) }))])),
      ...c.iOwe.map((x) => holdRow('debt', x.text, [h('button', { class: 'btn small', title: t(l('Quita a dívida (e melhora a relação).', 'Settles the debt (and improves the relationship).')), onclick: () => { const r = repay27(s2, x.id); say(r.ok, r.text); } }, `${t(l('Retribuir', 'Repay'))} · ${$(repayCost27(s2))}`)])),
      ...c.grudges.map((x) => holdRow('grudge', x.text, [])),
      ...c.dirt.map((x) => holdRow('dirt', x.text, [
        h('button', { class: 'btn small', disabled: !!canUse(s2, x, 'blackmail'), onclick: () => { const r = useDirt27(s2, x.id, 'blackmail'); say(r.ok, r.text); } }, t(l('Chantagear', 'Blackmail'))),
        h('button', { class: 'btn small danger', disabled: !!canUse(s2, x, 'expose'), onclick: () => { const r = useDirt27(s2, x.id, 'expose'); say(r.ok, r.text); } }, t(l('Expor', 'Expose')))])),
      !c.owesMe.length && !c.iOwe.length && !c.grudges.length && !c.dirt.length ? h('p', { class: 'small muted' }, t(l('Nada no livro entre vocês.', 'Nothing on the ledger between you.'))) : null,
      c.gestures.length ? h('div', null,
        h('h4', null, t(l('Dar (cria crédito)', 'Give (builds credit)'))),
        h('div', { class: 'p2a-chips', role: 'radiogroup', 'aria-label': t(l('Conversa', 'Talk')) }, (Object.keys(TALK) as Talk27[]).map((x) => h('button', { type: 'button', role: 'radio', 'aria-checked': talk === x ? 'true' : 'false', class: `btn small ${talk === x ? 'primary' : 'ghost'}`, title: c.vanity === undefined ? '' : t(l('Combina: {f}', 'Fit: {f}'), { f: `${fit(x) >= 0 ? '+' : ''}${Math.round(fit(x) * 100)}%` }), onclick: () => { talk = x; draw(); } }, T(TALK[x])))),
        h('div', { class: 'fv27-acts' }, c.gestures.map((g) => h('button', { class: 'btn small', disabled: !!blockG(g), title: T(blockG(g) ?? l('A gentileza de sempre + a conversa: a pessoa passa a te dever.', 'The usual kindness + the talk: they now owe you.')), onclick: () => { const r = give27(s2, c.key, g, talk); say(r.ok, r.text); } }, `${T(GEST[g].n)} · ${$(money(s2, GEST[g].cost))}`)))) : null,
      h('h4', null, t(l('Pedir e cobrar', 'Ask and call in'))),
      h('div', { class: 'p2a-chips', role: 'radiogroup', 'aria-label': t(l('Pedido', 'Request')) }, (Object.keys(ASK27) as Ask27[]).map((x) => h('button', { type: 'button', role: 'radio', 'aria-checked': ask === x ? 'true' : 'false', class: `btn small ${ask === x ? 'primary' : 'ghost'}`, title: T(ASK27[x].hint) + (ASK27[x].best.includes(c.kind) ? ` ${t(l('(rende mais com este contato)', '(works best with this contact)'))}` : ''), onclick: () => { ask = x; draw(); } }, T(ASK27[x].name), ASK27[x].best.includes(c.kind) ? ' ★' : ''))),
      h('div', { class: 'fv27-acts' },
        c.gestures.includes('gift') ? h('button', { class: 'btn small', disabled: !!askBlock27(s2, c.key), title: T(askBlock27(s2, c.key) ?? l('O favor de sempre, na hora — mas agora você deve.', 'The usual favor, right now — but now you owe.')), onclick: () => { const r = askNow27(s2, c.key); say(r.ok, r.text); } }, t(l('Pedir sem crédito', 'Ask without credit'))) : null,
        h('button', { class: 'btn small danger', title: t(l('Cobra tudo agora (efeito dobrado), mas vira mágoa, os pares ficam sabendo e ele fala mal — ou expõe o que sabe.', 'Calls in everything now (double effect), but it becomes a grudge, peers hear about it and they badmouth you — or expose what they know.')),
          onclick: async () => { if (!await askConfirm(t(l('Queimar {n}? Não tem volta.', 'Burn {n}? There is no going back.'), { n: c.name }))) return; const r = burn27(s2, c.key, ask); cutscene27('favors27:burn', { key: c.key }); toast([t(r.text), ...r.gains.map((x) => t(x)), ...r.costs.map((x) => t(x))].join(' '), 'warn'); draw(); } }, t(l('Queimar o contato', 'Burn the contact')))),
      h('p', { class: 'small muted' }, t(l('Favores fracos (<60) valem uma vez; fortes voltam a cada 2 anos. O almoço/jantar/presente custam e têm a recarga de sempre.', 'Weak favors (<60) work once; strong ones come back every 2 years. Lunch/dinner/gifts cost and cool down as usual.'))),
    );
  };
  draw();
  const g = o.gesture;
  const who = focus ? contact27(s, focus)?.name ?? '' : '';
  const lead = g && focus ? h('div', { class: 'p2a-chips fv27-lead', role: 'note' },
    h('span', { class: 'p2a-chip' }, g === 'ask'
      ? t(l('Pedir favor a {n}: cobre um crédito do livro ou peça sem crédito (aí você passa a dever).', 'Ask {n} a favor: call in a credit from the ledger or ask without credit (then you owe).'), { n: who })
      : t(l('{g} com {n}: escolha a conversa (pela personalidade) e clique em {g} ao lado — a gentileza vira crédito: a pessoa passa a te dever.', '{g} with {n}: pick the talk (by personality) and click {g} on the side — the kindness becomes credit: they now owe you.'), { g: T(GEST[g].n), n: who })),
    o.classic ? h('button', { class: 'btn small ghost', 'data-fl27': 'quick', onclick: () => { closeFn(); o.classic?.(); } },
      g === 'ask' ? t(l('Resolver rápido: pedir o favor de sempre', 'Resolve quickly: ask the usual favor')) : t(l('Resolver rápido: o {g} de sempre', 'Resolve quickly: the usual {g}'), { g: T(GEST[g].n).toLowerCase() })) : null) : null;
  closeFn = modal(t(l('Rede de favores', 'Favor network')), lead ? h('div', null, lead, root) : root, { wide: true, onClose: () => rerender() });
}
