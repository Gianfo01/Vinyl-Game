// R31 · onda 3 (SOC) — telas de SÓCIOS E COMPRAS. Aba "Sócios e compras" em Negócios, aba "Negócios e sócios" na ficha
// da empresa (sua: participações; rival: o que ela tem para vender), ação no painel rápido da cidade e ficha de cada
// negócio (valor por parte, sócios, acordo, votos, pedidos do sócio, resultado do mês, comprar mais e vender).
// Toda ação mostra o motivo do bloqueio antes do clique (lockBtn31). Abrir, filtrar e cotar só leem (sim/sys/socio31).
import { cityById, CITIES, l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { opinionOf } from '../../sim/opinion';
import {
  accept31, answer31, bizValue31, buy31, buyLock31, createJoint31, EXIT31, foundCost31, holdings31, jvAccept31, jvLock31, monthL, ownedBy31,
  PARTNERK31, pct31, propose31, quote31, renegotiate31, sell31, sellLock31, SKIND31, soc31On, socio31, target31, targets31, TOPIC31, TOTAL31,
  voteLock31, WHO31, type Biz31, type Exit31, type JvOpts31, type PartnerK31, type SKind31, type Target31, type Topic31, type Who31,
} from '../../sim/sys/socio31';
import type { Holder } from '../../sim/sys/ventures9';
import type { GameState } from '../../sim/types';
import { $, modal, pill, rerender, section, toast } from '../common';
import { h, select } from '../dom';
import { registerPageTab, registerTab } from '../registry';
import { ic } from '../vis';
import { basisTag31, lockBtn31 } from './lock31';
import { registerQuick31 } from './quick31core';

const SLICES = [1000, 2500, 4900, 5100, TOTAL31];
/** filtros da tela (estado de interface, não do jogo) */
const UI = { kind: 'all' as SKind31 | 'all', city: 'all', slice: 2500, h: 'label' as Holder, q: '' };
const JV: JvOpts31 & { city: string } = { kind: 'fest', name: '', city: '', pk: 'city', me: 5000, h: 'label', rules: {}, exit: 'first' };

const res = (x: L | null | string, ok: L): void => {
  if (x && typeof x === 'object') toast(t(x), 'bad');
  else toast(t(ok), 'good');
  rerender();
};
const holderL = (hh: Holder): L => (hh === 'label' ? l('pelo selo', 'via the label') : l('no seu nome', 'in your name'));
const kindPill = (k: SKind31) => h('span', { class: 'pill' }, ic(SKIND31[k].icon), ' ', t(SKIND31[k].name));
const cityN = (id: string) => (cityById[id] ? t(cityById[id].name) : '—');

// ---------------------------------------------------------------- lista de participações e mercado

function holdingsBlock(s: GameState, onOpen: (id: string) => void): HTMLElement {
  const hs = holdings31(s);
  if (!hs.length) return h('p', { class: 'muted' }, t(l('Você ainda não é sócio de nada. Compre parte de um negócio abaixo ou crie um com um parceiro.', 'You are not a partner in anything yet. Buy into a business below or start one with a partner.')));
  return h('table', { class: 'tbl compact' },
    h('thead', null, h('tr', null, ...[l('Negócio', 'Business'), l('Sua parte', 'Your stake'), l('Sócios', 'Partners'), l('Seu resultado (12 meses)', 'Your result (12 months)'), l('Valor da sua parte', 'Value of your stake'), l('', '')].map((x) => h('th', null, t(x))))),
    h('tbody', null, hs.map((x) => h('tr', { class: 'click', onclick: () => onOpen(x.b.id) },
      h('td', null, h('b', null, x.b.name), ' ', kindPill(x.b.kind), h('div', { class: 'muted small' }, `${cityN(x.b.city)}${x.b.jv ? ` · ${t(l('criado em conjunto', 'co-founded'))}` : ''}`),
        x.b.ask ? pill(t(x.b.ask.k === 'exit' ? l('sócio quer sair', 'partner wants out') : l('votação esperando você', 'vote awaiting you')), 'warn') : null),
      h('td', null, t(pct31(x.b.me)), h('div', { class: 'muted small' }, t(holderL(x.b.h)))),
      h('td', { class: 'small' }, x.b.p.map((p) => `${p.n} ${t(pct31(p.sh))}`).join(' · ') || '—'),
      h('td', { class: x.last12 >= 0 ? 'good' : 'bad' }, $(x.last12)),
      h('td', null, $(x.mine)),
      h('td', null, h('button', { class: 'btn small', onclick: (e: Event) => { e.stopPropagation(); onOpen(x.b.id); } }, t(l('Abrir', 'Open'))))))));
}

function targetRow(s: GameState, tg: Target31): HTMLElement {
  const bp = Math.min(UI.slice, tg.legend ? 4900 : TOTAL31);
  const a = accept31(s, tg.id, tg.owner, bp, 0, tg);
  const v = bizValue31(s, tg.id)!;
  const price = quote31(s, tg.id, bp);
  const lock = buyLock31(s, tg.id, bp, UI.h);
  return h('tr', null,
    h('td', null, h('b', null, tg.name), ' ', kindPill(tg.kind), tg.legend ? ' ' : null, tg.never ? pill(t(l('não está à venda', 'not for sale')), 'bad') : tg.legend ? pill(t(l('lendário: só parte', 'legendary: part only')), 'gold') : null,
      h('div', { class: 'muted small' }, `${cityN(tg.city)} · ${t(l('prestígio', 'prestige'))} ${tg.prestige} · ${t(l('desde', 'since'))} ${tg.since}`),
      h('div', { class: 'small' }, t(l('Dono: {n}', 'Owner: {n}'), { n: tg.owner.n }), ' ', h('span', { class: 'muted' }, t(l('(opinião sobre você: {v})', '(opinion of you: {v})'), { v: opinionOf(s, tg.owner.k) }))),
      h('details', { class: 'small' }, h('summary', null, t(a.ok ? l('Aceita negociar — por quê', 'Willing to deal — why') : l('Não quer vender — por quê', 'Not willing to sell — why'))),
        h('ul', null, a.why.map((w) => h('li', null, t(w)))))),
    h('td', null, $(v.total), h('div', { class: 'muted small' }, t(l('rende {r}/ano', 'earns {r}/yr'), { r: $(v.annual) }))),
    h('td', null, h('b', null, $(price)), h('div', { class: 'muted small' }, t(pct31(bp)))),
    h('td', null, lockBtn31(t(bp >= TOTAL31 ? l('Comprar inteiro', 'Buy outright') : l('Comprar {p}', 'Buy {p}'), { p: pct31(bp) }), lock, () => res(buy31(s, tg.id, bp, UI.h), l('Negócio fechado.', 'Deal closed.')), { cls: 'btn small primary' })));
}

function marketBlock(s: GameState, cityLock?: string): HTMLElement {
  const all = targets31(s);
  const city = cityLock ?? UI.city;
  const fold = (x: string) => x.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const list = all.filter((x) => (UI.kind === 'all' || x.kind === UI.kind) && (city === 'all' || x.city === city) && (!UI.q || fold(x.name).includes(fold(UI.q))))
    .sort((a, b) => b.prestige - a.prestige || (a.id < b.id ? -1 : 1));
  const cities = [...new Set(all.map((x) => x.city))].filter((c) => cityById[c]).sort((a, b) => cityN(a).localeCompare(cityN(b)));
  return h('div', null,
    h('div', { class: 'row wrap', style: 'gap:0.5rem;align-items:center' },
      select(UI.kind, [{ value: 'all' as SKind31 | 'all', label: t(l('Todos os tipos', 'All types')) }, ...(Object.keys(SKIND31) as SKind31[]).map((k) => ({ value: k as SKind31 | 'all', label: t(SKIND31[k].plural) }))], (v) => { UI.kind = v; rerender(); }),
      cityLock ? pill(cityN(cityLock)) : select(UI.city, [{ value: 'all', label: t(l('Todas as cidades', 'All cities')) }, ...cities.map((c) => ({ value: c, label: cityN(c) }))], (v) => { UI.city = v; rerender(); }),
      select(UI.slice, SLICES.map((v) => ({ value: v, label: t(v >= TOTAL31 ? l('Inteiro (100%)', 'Whole (100%)') : l('Fatia de {p}', 'Slice of {p}'), { p: pct31(v) }) })), (v) => { UI.slice = v; rerender(); }),
      select(UI.h, [{ value: 'label' as Holder, label: t(l('Pagar pelo selo', 'Pay with the label')) }, { value: 'personal' as Holder, label: t(l('Pagar com dinheiro pessoal', 'Pay with personal money')) }], (v) => { UI.h = v; rerender(); }),
      h('input', { type: 'search', placeholder: t(l('Buscar pelo nome', 'Search by name')), value: UI.q, oninput: (e: Event) => { UI.q = (e.target as HTMLInputElement).value; }, onchange: () => rerender() })),
    h('p', { class: 'muted small' }, t(l('Preço pelo mesmo modelo de valor da bolsa (o que rende, prestígio e público, histórico, dívidas). Acima de 25% e de 50% entra o prêmio de controle. O dono decide pela relação com você.', 'Price by the same value model as the stock exchange (earnings, prestige and audience, history, debts). Above 25% and 50% a control premium applies. The owner decides by their relationship with you.'))),
    list.length ? h('table', { class: 'tbl compact' },
      h('thead', null, h('tr', null, ...[l('Negócio', 'Business'), l('Valor', 'Value'), l('Preço da fatia', 'Slice price'), l('', '')].map((x) => h('th', null, t(x))))),
      h('tbody', null, list.slice(0, 40).map((x) => targetRow(s, x))))
      : h('p', { class: 'muted' }, t(l('Nada com esses filtros.', 'Nothing with these filters.'))),
    list.length > 40 ? h('p', { class: 'muted small' }, t(l('Mostrando 40 de {n}: use os filtros.', 'Showing 40 of {n}: use the filters.'), { n: list.length })) : null);
}

// ---------------------------------------------------------------- criar em conjunto

function rulesSel(cur: Partial<Record<Topic31, Who31>>, topics: Topic31[], on: (tp: Topic31, w: Who31) => void): HTMLElement {
  return h('div', { class: 'small' }, topics.map((tp) => h('div', { class: 'row', style: 'gap:0.4rem;align-items:center' },
    h('span', { style: 'min-width:14em' }, t(TOPIC31[tp].name)),
    select(cur[tp] ?? 'vote', (Object.keys(WHO31) as Who31[]).map((w) => ({ value: w, label: t(WHO31[w]) })), (w) => on(tp, w)))));
}

function jointBlock(s: GameState): HTMLElement {
  JV.city ||= s.config.homeCity;
  if (!JV.name) JV.name = `${t(SKIND31[JV.kind].name)} ${cityN(JV.city)}`;
  const labs = Object.values(s.labels).filter((x) => x.active && x.leaderId).sort((a, b) => b.reputation - a.reputation).slice(0, 30);
  if (JV.pk === 'label' && !labs.some((x) => x.id === JV.lb)) JV.lb = labs[0]?.id;
  const opts: { value: string; label: string }[] = [
    ...(Object.keys(PARTNERK31) as Exclude<PartnerK31, 'label' | 'indep'>[]).map((k) => ({ value: k, label: t(PARTNERK31[k].name) })),
    ...labs.map((x) => ({ value: `lb:${x.id}`, label: `${t(l('Selo rival', 'Rival label'))}: ${x.name}` })),
  ];
  const cur = JV.pk === 'label' ? `lb:${JV.lb}` : JV.pk;
  const a = jvAccept31(s, JV);
  const lock = jvLock31(s, JV);
  const cost = foundCost31(s, JV.kind);
  return h('div', null,
    h('p', { class: 'muted small' }, t(l('Funde com um parceiro, dividindo custo, risco e decisões. O acordo diz a parte de cada um, quem decide cada assunto e como se sai; dá para renegociar depois na ficha do negócio.', 'Found with a partner, sharing cost, risk and decisions. The agreement sets each side\'s share, who decides each matter and how to exit; you can renegotiate later on the business sheet.'))),
    h('div', { class: 'row wrap', style: 'gap:0.5rem;align-items:center' },
      select(JV.kind, (Object.keys(SKIND31) as SKind31[]).map((k) => ({ value: k, label: t(SKIND31[k].name) })), (v) => { JV.kind = v; JV.name = ''; rerender(); }),
      h('input', { type: 'text', value: JV.name, maxlength: 40, 'aria-label': t(l('Nome', 'Name')), onchange: (e: Event) => { JV.name = (e.target as HTMLInputElement).value; rerender(); } }),
      select(JV.city, CITIES.map((c) => ({ value: c.id, label: t(c.name) })), (v) => { JV.city = v; JV.name = ''; rerender(); }),
      select(cur, opts, (v) => { if (v.startsWith('lb:')) { JV.pk = 'label'; JV.lb = v.slice(3); } else { JV.pk = v as PartnerK31; JV.lb = undefined; } rerender(); }),
      select(JV.me, [2000, 3000, 4000, 5000, 6000, 7000, 8000].map((v) => ({ value: v, label: t(l('Sua parte {p}', 'Your share {p}'), { p: pct31(v) }) })), (v) => { JV.me = v; rerender(); }),
      select(JV.h ?? 'label', [{ value: 'label' as Holder, label: t(l('Pelo selo', 'Via the label')) }, { value: 'personal' as Holder, label: t(l('No seu nome', 'In your name')) }], (v) => { JV.h = v; rerender(); })),
    JV.pk !== 'label' && JV.pk !== 'indep' ? h('p', { class: 'small muted' }, t(PARTNERK31[JV.pk].brings)) : null,
    h('h4', null, t(l('Quem decide o quê', 'Who decides what'))),
    rulesSel(JV.rules ?? {}, SKIND31[JV.kind].topics, (tp, w) => { JV.rules = { ...(JV.rules ?? {}), [tp]: w }; rerender(); }),
    h('div', { class: 'row', style: 'gap:0.4rem;align-items:center' }, h('span', { style: 'min-width:14em' }, t(l('Saída', 'Exit'))),
      select(JV.exit ?? 'first', (Object.keys(EXIT31) as Exit31[]).map((k) => ({ value: k, label: t(EXIT31[k].name) })), (v) => { JV.exit = v; rerender(); })),
    h('p', { class: 'small' }, t(l('Custo de abertura {c}; você paga {m} (sua parte).', 'Opening cost {c}; you pay {m} (your share).'), { c: $(cost), m: $(Math.round(cost * JV.me / TOTAL31)) })),
    h('details', { class: 'small', open: true }, h('summary', null, t(a.ok ? l('O parceiro topa — por quê', 'The partner agrees — why') : l('O parceiro recusa — por quê', 'The partner refuses — why'))), h('ul', null, a.why.map((w) => h('li', null, t(w))))),
    lockBtn31(t(l('Fechar o acordo e criar', 'Sign the agreement and found')), lock, () => {
      const r = createJoint31(s, { ...JV, city: JV.city });
      if (typeof r === 'string') { JV.name = ''; toast(t(l('Negócio criado.', 'Business founded.')), 'good'); rerender(); openBiz31(s, r); } else res(r, l('', ''));
    }, { cls: 'btn primary' }));
}

/** Aba "Sócios e compras" (Negócios). */
export function socView31(s: GameState): HTMLElement {
  return h('div', { class: 'panel soc31' },
    soc31On(s) ? null : h('p', { class: 'lk31-why' }, '🔒 ', t(l('Sócios e compras está desligado nesta partida (editor › interruptores).', 'Partners and buyouts is off in this game (editor › switches).'))),
    section(t(l('Suas participações', 'Your stakes')), holdingsBlock(s, (id) => openBiz31(s, id))),
    section(t(l('Comprar parte ou tudo: festivais, casas, rádios e estúdios', 'Buy part or all: festivals, venues, radio stations and studios')), marketBlock(s)),
    section(t(l('Criar em conjunto', 'Found together')), jointBlock(s)));
}

/** Modal da cidade (painel rápido): o que existe para comprar ali e o que você já tem. */
export function openCitySoc31(s: GameState, city: string): void {
  let close = () => {};
  const draw = () => h('div', { class: 'soc31' },
    holdings31(s).some((x) => x.b.city === city) ? section(t(l('Seus negócios aqui', 'Your businesses here')), holdingsBlock(s, (id) => { close(); openBiz31(s, id); })) : null,
    marketBlock(s, city));
  close = modal(t(l('Sócios e compras · {c}', 'Partners and buyouts · {c}'), { c: cityN(city) }), draw(), { wide: true });
}

// ---------------------------------------------------------------- ficha do negócio

function bizBody(s: GameState, b: Biz31, redraw: () => void): HTMLElement {
  const v = bizValue31(s, b.id)!;
  const done = (x: L | null, ok: L) => { if (x) toast(t(x), 'bad'); else toast(t(ok), 'good'); redraw(); };
  const ask = b.ask;
  const asker = ask ? b.p.find((p) => p.k === ask.from) : undefined;
  const others = TOTAL31 - b.me;
  const more = Math.min(others, UI.slice);
  const topics = SKIND31[b.kind].topics;
  const cur = (tp: Topic31) => (tp === 'price' ? b.set.price : tp === 'prog' ? b.set.prog : tp === 'date' ? b.set.month : 0);
  const optList = (tp: Topic31) => (tp === 'date' ? Array.from({ length: 12 }, (_, m) => ({ value: m, label: t(monthL(m)) })) : TOPIC31[tp].opts.map((o, i) => ({ value: i, label: t(o) })));
  const pick: Partial<Record<Topic31, number>> = {};
  const reneg: Partial<Record<Topic31, Who31>> = { ...b.rules };
  let exit = b.exit;
  return h('div', { class: 'soc31' },
    h('div', { class: 'row wrap', style: 'gap:0.5rem' }, kindPill(b.kind), pill(cityN(b.city)), pill(`${t(l('prestígio', 'prestige'))} ${Math.round(b.set.pr)}`),
      pill(`${t(l('sua parte', 'your stake'))} ${t(pct31(b.me))} · ${t(holderL(b.h))}`, 'gold'), b.jv ? pill(t(l('criado em conjunto', 'co-founded'))) : null),
    ask && asker ? h('div', { class: 'card warn', style: 'margin:0.5rem 0;padding:0.5rem' },
      h('b', null, ask.k === 'exit'
        ? t(l('{n} quer sair e oferece a parte dele ({p}) por {v}.', '{n} wants out and offers their stake ({p}) for {v}.'), { n: asker.n, p: pct31(ask.sh ?? asker.sh), v: $(ask.price ?? 0) })
        : t(l('{n} propõe — {t}: {o}. Seu voto?', '{n} proposes — {t}: {o}. Your vote?'), { n: asker.n, t: TOPIC31[ask.topic!].name, o: ask.topic === 'date' ? monthL(ask.v!) : TOPIC31[ask.topic!].opts[ask.v!] })),
      h('div', { class: 'muted small' }, t(l('Prazo: {w} semana(s). Sem resposta, a votação conta sem você; a saída vira venda a um terceiro.', 'Deadline: {w} week(s). Without an answer the vote counts without you; the exit becomes a sale to a third party.'), { w: Math.max(0, ask.due - s.week) })),
      h('div', { class: 'row', style: 'gap:0.4rem' },
        h('button', { class: 'btn small primary', onclick: () => done(answer31(s, b.id, true), ask.k === 'exit' ? l('Você comprou a parte do sócio.', 'You bought the partner out.') : l('Voto registrado.', 'Vote recorded.')) }, t(ask.k === 'exit' ? l('Comprar a parte dele', 'Buy their stake') : l('Votar a favor', 'Vote for'))),
        h('button', { class: 'btn small', onclick: () => done(answer31(s, b.id, false), ask.k === 'exit' ? l('Ele vai vender a outra pessoa.', 'They will sell to someone else.') : l('Voto registrado.', 'Vote recorded.')) }, t(ask.k === 'exit' ? l('Recusar', 'Decline') : l('Votar contra', 'Vote against'))))) : null,
    h('h4', null, t(l('Sócios', 'Partners'))),
    h('table', { class: 'tbl compact' }, h('tbody', null,
      h('tr', null, h('td', null, h('b', null, t(l('Você', 'You')))), h('td', null, t(pct31(b.me))), h('td', null, '')),
      b.p.map((p) => h('tr', null, h('td', null, p.n, p.lb ? h('span', { class: 'muted small' }, ` · ${t(l('selo rival', 'rival label'))}`) : null), h('td', null, t(pct31(p.sh))),
        h('td', { class: 'small muted' }, t(l('opinião sobre você {v}', 'opinion of you {v}'), { v: opinionOf(s, p.k) })))))),
    b.p.length ? h('p', { class: 'small' }, t(l('Tensão entre os sócios: {v}/100 (acima de 55 o sócio pode pedir para sair; acima de 75 pode haver briga).', 'Tension between partners: {v}/100 (above 55 the partner may ask to leave; above 75 a fight can break out).'), { v: Math.round(b.ten) })) : null,
    h('h4', null, t(l('Decisões', 'Decisions'))),
    h('table', { class: 'tbl compact' }, h('tbody', null, topics.map((tp) => {
      const opts = optList(tp);
      pick[tp] = tp === 'invest' ? 1 : opts.find((o) => o.value !== cur(tp))?.value ?? 0;
      const btnBox = h('span', null);
      const draw = () => { btnBox.replaceChildren(lockBtn31(t(l('Propor', 'Propose')), voteLock31(s, b.id, tp, pick[tp]!), () => { const r = propose31(s, b.id, tp, pick[tp]!); toast(t(r.text), r.passed ? 'good' : 'bad'); redraw(); })); };
      draw();
      return h('tr', null,
        h('td', null, h('b', null, t(TOPIC31[tp].name)), h('div', { class: 'muted small' }, `${t(l('agora', 'now'))}: ${tp === 'invest' ? '—' : tp === 'date' ? t(monthL(cur(tp))) : t(TOPIC31[tp].opts[cur(tp)])} · ${t(WHO31[b.rules[tp]])}`)),
        h('td', null, tp === 'invest' ? t(TOPIC31.invest.opts[1]) : select(pick[tp]!, opts, (v) => { pick[tp] = v; draw(); })),
        h('td', null, btnBox));
    }))),
    h('h4', null, t(l('Acordo', 'Agreement'))),
    rulesSel(reneg, topics, (tp, w) => { reneg[tp] = w; }),
    h('div', { class: 'row', style: 'gap:0.4rem;align-items:center' }, h('span', { style: 'min-width:14em' }, t(l('Saída', 'Exit'))),
      select(b.exit, (Object.keys(EXIT31) as Exit31[]).map((k) => ({ value: k, label: t(EXIT31[k].name) })), (v) => { exit = v; })),
    b.p.length ? lockBtn31(t(l('Propor o novo acordo', 'Propose the new agreement')), soc31On(s) ? null : l('Sócios e compras está desligado.', 'Partners and buyouts is off.'), () => {
      const r = renegotiate31(s, b.id, reneg, exit);
      toast(t(r.text), r.ok ? 'good' : 'bad');
      redraw();
    }) : h('p', { class: 'muted small' }, t(l('Sem sócios: você decide tudo.', 'No partners: you decide everything.'))),
    h('h4', null, t(l('Resultado por mês', 'Result by month'))),
    b.months.length ? h('table', { class: 'tbl compact' },
      h('thead', null, h('tr', null, ...[l('Mês', 'Month'), l('Receita', 'Revenue'), l('Custo', 'Cost'), l('Resultado', 'Result'), l('Sua parte', 'Your share')].map((x) => h('th', null, t(x))))),
      h('tbody', null, b.months.slice(-12).reverse().map((m) => h('tr', null, h('td', null, `${t(monthL(m.m))} ${m.y}`), h('td', null, $(m.rev)), h('td', null, $(m.cost)),
        h('td', { class: m.res >= 0 ? 'good' : 'bad' }, $(m.res)), h('td', { class: m.mine >= 0 ? 'good' : 'bad' }, $(m.mine))))))
      : h('p', { class: 'muted small' }, t(l('O primeiro mês fecha na virada: lucro vira dividendo, prejuízo vira aporte, na proporção de cada parte.', 'The first month closes at the turn: profit becomes a dividend, loss a capital call, in proportion to each stake.'))),
    h('p', { class: 'small' }, t(l('Você pagou {p} no total; recebeu {g} de resultados.', 'You paid {p} in total; received {g} in results.'), { p: $(b.paid), g: $(b.got) })),
    h('details', { class: 'small' }, h('summary', null, t(l('Por que vale isso: {v}', 'Why it is worth this: {v}'), { v: $(v.total) })),
      h('table', { class: 'tbl compact' }, h('tbody', null, v.parts.map((p) => h('tr', null, h('td', null, h('b', null, t(p.name)), h('div', { class: 'muted' }, t(p.why))), h('td', { class: p.v >= 0 ? 'good' : 'bad' }, `${p.v >= 0 ? '+' : '−'}${$(Math.abs(p.v))}`), h('td', null, basisTag31(p.basis === 'hyp' ? 'guess' : p.basis))))))),
    h('h4', null, t(l('Comprar mais ou vender', 'Buy more or sell'))),
    h('div', { class: 'row wrap', style: 'gap:0.4rem;align-items:flex-start' },
      select(UI.slice, SLICES.map((x) => ({ value: x, label: t(pct31(x)) })), (x) => { UI.slice = x; redraw(); }),
      others > 0 ? lockBtn31(t(l('Comprar {p} por {v}', 'Buy {p} for {v}'), { p: pct31(more), v: $(quote31(s, b.id, more, b.me)) }), buyLock31(s, b.id, more, b.h), () => done(buy31(s, b.id, more, b.h), l('Comprado.', 'Bought.'))) : null,
      b.p.length ? lockBtn31(t(l('Vender {p} ao sócio', 'Sell {p} to the partner'), { p: pct31(Math.min(b.me, UI.slice)) }), sellLock31(s, b.id, Math.min(b.me, UI.slice), 'partner'), () => done(sell31(s, b.id, Math.min(b.me, UI.slice), 'partner'), l('Vendido.', 'Sold.'))) : null,
      lockBtn31(t(l('Vender {p} no mercado (−10%)', 'Sell {p} on the market (−10%)'), { p: pct31(Math.min(b.me, UI.slice)) }), sellLock31(s, b.id, Math.min(b.me, UI.slice), 'market'), () => done(sell31(s, b.id, Math.min(b.me, UI.slice), 'market'), l('Vendido.', 'Sold.')))),
    b.log.length ? h('details', { class: 'small' }, h('summary', null, t(l('Acontecimentos', 'Events'))), h('ul', null, b.log.slice().reverse().map((x) => h('li', null, t(x.t))))) : null);
}

/** Ficha de um negócio seu (ou de um alvo, que abre o mercado filtrado). */
export function openBiz31(s: GameState, id: string): void {
  const b = socio31(s).b[id];
  if (!b) { const tg = target31(s, id); if (tg) openCitySoc31(s, tg.city); return; }
  const box = h('div', null);
  const redraw = () => { const nb = socio31(s).b[id]; if (!nb) { close(); rerender(); return; } box.replaceChildren(bizBody(s, nb, redraw)); };
  box.appendChild(bizBody(s, b, redraw));
  const close = modal(b.name, box, { wide: true, onClose: () => rerender() });
}

// ---------------------------------------------------------------- registro: Negócios, ficha da empresa, painel rápido

registerTab('business', {
  id: 'soc31', label: l('Sócios e compras', 'Partners and buyouts'), icon: 'handshake', render: socView31,
  badge: (s) => Object.values(socio31(s).b).filter((b) => b.ask).length || undefined,
});

registerPageTab('label', {
  id: 'soc31', label: l('Negócios e sócios', 'Businesses and partners'), icon: 'handshake', order: 70,
  when: (s, id) => id === 'player' || ownedBy31(s, id).length > 0,
  render: (s, id) => {
    if (id === 'player') return h('div', null, holdingsBlock(s, (x) => openBiz31(s, x)), h('button', { class: 'btn small', onclick: () => modal(t(l('Sócios e compras', 'Partners and buyouts')), socView31(s), { wide: true }) }, t(l('Comprar ou criar em conjunto…', 'Buy or found together…'))));
    const list = ownedBy31(s, id);
    return h('div', null, h('p', { class: 'muted small' }, t(l('Negócios deste selo. O líder decide pela relação com você.', 'This label\'s businesses. The leader decides by their relationship with you.'))),
      h('table', { class: 'tbl compact' }, h('tbody', null, list.map((x) => targetRow(s, x)))));
  },
});

registerQuick31({
  id: 'q.soc31', verb: 'buy', icon: 'handshake', kinds: ['city'], label: l('Comprar parte de festival, casa, rádio ou estúdio', 'Buy into a festival, venue, radio or studio'),
  applies: (s, tg) => !!cityById[tg.id] && (targets31(s).some((x) => x.city === tg.id) || Object.values(socio31(s).b).some((b) => b.city === tg.id)),
  lock: (s) => (soc31On(s) ? null : { why: l('Sócios e compras está desligado nesta partida.', 'Partners and buyouts is off in this game.'), unlock: l('Ligue o interruptor no editor.', 'Turn the switch on in the editor.') }),
  dest: () => ({ area: 'business', tab: 'business-business/soc31' }),
  run: (s, tg) => openCitySoc31(s, tg.id),
});
