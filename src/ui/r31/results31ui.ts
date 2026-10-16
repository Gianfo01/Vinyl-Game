// R31 · onda 3 (P) — TELAS: resultado por projeto e por artista (RN-07) e extrato pessoal (B.17).
//   Finanças › "Resultados": artista ou projeto · receita, custo direto, custo rateado (regra declarada), margem; linha
//     "não alocado" sempre visível e a conferência direto + rateado + não alocado = total; diário de lançamentos com
//     contexto (o lançamento/turnê e o artista que geraram cada valor; quem pagou e quem recebeu).
//   Finanças › "Seu bolso": extrato pessoal (pagador, dono, beneficiário), por categoria no ano e desde o início.
//   Acessos: painel rápido (artista/projeto → "Ver resultado"), aba "Resultados" na ficha do artista, bloco na ficha do
//   lançamento e na tela do projeto musical (results31mini).
// Só lê o estado; a única ação é trocar a regra de rateio (decisão do jogador, vale do mês seguinte).

import { l } from '../../data/world';
import { t } from '../../i18n/strings';
import { RULES31, artistResult31, journal31, projectResult31, projectsOfArtist31, res31, resultsReport31, setRule31, type Report31, type Row31, type Rule31 } from '../../sim/r31/results31';
import { PCATS, partyLabel31, purse31, purseSummary, type PCat } from '../../sim/r31/purse31';
import { openProjects } from '../../sim/sys/project8';
import type { Act, GameState } from '../../sim/types';
import { $, actLink, pill, rerender, section } from '../common';
import { h } from '../dom';
import { RELEASE_EXTRAS } from '../ficha';
import { ACT_TABS } from '../pages';
import { registerTab } from '../registry';
import { registerQuick31 } from './quick31core';
import './res31.css';
import { KIND31, RES31, RES_DEST31, goResults31, miniRow31, money31 } from './results31mini';

function who(s: GameState, w: string): string {
  if (w === 'player' || w === 'label') return t(l('sua empresa', 'your company'));
  if (w === 'me') return t(l('você', 'you'));
  if (w.startsWith('p:')) return s.persons[w.slice(2)]?.name ?? t(l('uma pessoa', 'someone'));
  return t(l('terceiros', 'third parties'));
}

function rowName(s: GameState, r: Row31): HTMLElement {
  if (RES31.dim === 'artist') return h('span', null, s.acts[r.id] ? actLink(s, r.id) : r.name || t(l('artista que saiu', 'departed act')));
  return h('span', null, h('b', null, r.name || t(l('sem título', 'untitled'))), ' ', pill(t(KIND31[r.kind ?? 'x'])),
    r.actId && s.acts[r.actId] ? h('span', { class: 'muted small' }, ' · ', s.acts[r.actId].name) : null, r.year ? h('span', { class: 'muted small' }, ` · ${r.year}`) : null);
}

function table(s: GameState, rep: Report31): HTMLElement {
  const T = rep.totals;
  const f = RES31.focus;
  const hit = (r: Row31) => !!f && (r.id === f || r.actId === f);
  const rows = f ? [...rep.rows.filter(hit), ...rep.rows.filter((r) => !hit(r))] : rep.rows;
  const shown = rows.slice(0, 40);
  return h('table', { class: 'tbl compact res31' },
    h('thead', null, h('tr', null,
      h('th', null, t(RES31.dim === 'artist' ? l('Artista', 'Act') : l('Projeto', 'Project'))),
      h('th', null, t(l('Receita', 'Revenue'))), h('th', null, t(l('Custo direto', 'Direct cost'))),
      h('th', { title: t(RULES31[rep.rule].desc) }, t(l('Rateado', 'Allocated'))), h('th', null, t(l('Margem', 'Margin'))))),
    h('tbody', null,
      shown.map((r) => h('tr', { class: hit(r) ? 'on31' : '' },
        h('td', null, rowName(s, r)), h('td', null, money31(r.rev)), h('td', null, money31(r.cost)), h('td', null, money31(r.shared)),
        h('td', null, h('b', null, money31(r.margin)), r.rev > 0 ? h('small', { class: 'muted' }, ` ${Math.round((100 * r.margin) / r.rev)}%`) : null))),
      rows.length > shown.length ? h('tr', null, h('td', { colspan: '5', class: 'muted small' }, t(l('… e mais {n} (somados no total).', '… and {n} more (included in the total).'), { n: rows.length - shown.length }))) : null,
      h('tr', { class: 'un31' },
        h('td', null, h('b', null, t(l('Não alocado', 'Unallocated'))), h('div', { class: 'muted small' },
          t(l('receita sem marca {r} · custo sem marca {c} · menos o rateado {x}', 'untagged revenue {r} · untagged cost {c} · minus allocated {x}'), { r: $(T.unRev), c: $(T.unCost), x: $(T.shared) }))),
        h('td', { colspan: '3', class: 'muted small' }, t(RES31.dim === 'artist'
          ? l('Impostos, juros, câmbio, outras receitas e o custo comum de mês sem base de rateio.', 'Taxes, interest, FX, other income and common cost from a month with no allocation base.')
          : l('Além disso, o que é do artista mas de nenhum projeto (adiantamento, salário do ato, divulgação geral).', 'Plus what belongs to an act but to no project (advance, act salary, general promotion).'))),
        h('td', null, h('b', null, money31(T.unallocated)))),
      h('tr', { class: 'tot31' },
        h('td', null, h('b', null, t(l('Total do resultado', 'Total result')))),
        h('td', { colspan: '3', class: 'small' }, t(l('direto {d} + rateado {r} + não alocado {u}', 'direct {d} + allocated {r} + unallocated {u}'), { d: $(T.direct), r: $(T.shared), u: $(T.unallocated) }),
          ' ', T.direct + T.shared + T.unallocated === T.total ? pill(t(l('fecha', 'balances')), 'good') : pill(t(l('não fecha', 'does not balance')), 'bad')),
        h('td', null, h('b', null, money31(T.total))))));
}

function journal(s: GameState): HTMLElement {
  const f = RES31.focus ? (RES31.dim === 'artist' ? { a: RES31.focus } : { p: RES31.focus }) : {};
  const list = journal31(s, f).slice(0, 25);
  const st = res31(s);
  if (!list.length) return h('p', { class: 'muted small' }, t(l('Nenhum lançamento recente com essa marca.', 'No recent entry with that tag.')));
  return h('table', { class: 'tbl compact' },
    h('thead', null, h('tr', null, h('th', null, t(l('Semana', 'Week'))), h('th', null, t(l('Lançamento', 'Entry'))), h('th', null, t(l('Valor', 'Amount'))), h('th', null, t(l('De onde veio', 'Where it came from'))), h('th', null, t(l('Quem pagou → quem recebeu', 'Who paid → who got it'))))),
    h('tbody', null, list.map((j) => h('tr', null,
      h('td', { class: 'muted small' }, String(j.w)),
      h('td', null, j.memo || t(l('lançamento', 'entry')), j.cls !== 'res' ? h('span', null, ' ', pill(t(j.cls === 'inv' ? l('compra de bem', 'asset purchase') : l('financiamento', 'financing')))) : null),
      h('td', null, money31(j.amt)),
      h('td', { class: 'small' }, j.a && s.acts[j.a] ? actLink(s, j.a) : j.a ? (st.A[j.a]?.n || '—') : h('span', { class: 'muted' }, t(l('sem artista', 'no act'))), j.p ? h('span', null, ' · ', st.P[j.p]?.n || '—') : null),
      h('td', { class: 'small muted' }, `${who(s, j.payer)} → ${who(s, j.ben)}`)))));
}

export function resultsView31(s: GameState): HTMLElement {
  const st = res31(s);
  const years = Object.keys(st.Y).map(Number).sort((a, b) => b - a);
  const dim = RES31.dim;
  const rep = resultsReport31(s, dim, dim === 'artist' ? RES31.period : 'all');
  const f = RES31.focus;
  const fname = f ? (s.acts[f]?.name ?? st.P[f]?.n ?? st.A[f]?.n) : undefined;
  return h('div', { class: 'res31-view' },
    section(t(l('Resultado por artista e por projeto', 'Results by act and by project')),
      h('div', { class: 'row wrap' },
        h('div', { class: 'layer-bar', role: 'group' },
          (['artist', 'project'] as const).map((d) => h('button', { type: 'button', class: `chip-btn ${dim === d ? 'on' : ''}`, 'aria-pressed': dim === d ? 'true' : 'false', onclick: () => { RES31.dim = d; rerender(); } }, t(d === 'artist' ? l('Por artista', 'By act') : l('Por projeto', 'By project'))))),
        dim === 'artist' ? h('select', { 'aria-label': t(l('Período', 'Period')), onchange: (e: Event) => { const v = (e.target as HTMLSelectElement).value; RES31.period = v === 'all' ? 'all' : Number(v); rerender(); } },
          h('option', { value: 'all', selected: RES31.period === 'all' }, t(l('Desde o início', 'All time'))),
          years.map((y) => h('option', { value: String(y), selected: RES31.period === y }, String(y))))
          : h('span', { class: 'muted small' }, t(l('Projeto: desde o início (lançamento, turnê ou projeto em andamento).', 'Project: all time (release, tour or project in progress).'))),
        fname ? h('span', null, pill(t(l('em foco: {n}', 'in focus: {n}'), { n: fname }), 'info'), ' ', h('button', { class: 'btn small ghost', onclick: () => { RES31.focus = undefined; rerender(); } }, t(l('tirar foco', 'clear focus')))) : null),
      h('p', { class: 'muted small' }, t(l('Cada valor leva, no ato, o artista, o lançamento ou a turnê que o gerou; os totais não somem quando o livro-caixa corta linhas antigas. Compra de bem e financiamento ficam fora do resultado.', 'Each amount carries, when it happens, the act, release or tour behind it; totals do not vanish when the ledger trims old lines. Asset purchases and financing stay outside the result.'))),
      table(s, rep)),
    section(t(l('Regra de rateio do custo comum', 'Common cost allocation rule')),
      h('p', { class: 'small' }, h('b', null, t(RULES31[st.rule].label)), ' — ', t(RULES31[st.rule].desc)),
      h('div', { class: 'row wrap' }, (Object.keys(RULES31) as Rule31[]).map((k) => h('button', { type: 'button', class: `btn small ${st.rule === k ? 'primary' : ''}`, disabled: st.rule === k, onclick: () => { setRule31(s, k); rerender(); } }, t(RULES31[k].label)))),
      h('p', { class: 'muted small' }, t(l('A troca vale do mês seguinte em diante; meses já fechados ficam como foram.', 'The change applies from next month on; closed months stay as they were.')))),
    section(t(l('Diário de lançamentos (com contexto)', 'Entry journal (with context)')), journal(s)),
  );
}

// ---------------------------------------------------------------- extrato pessoal

export function purseView31(s: GameState): HTMLElement {
  const st = purse31(s);
  const yr = purseSummary(s, s.year);
  const all = purseSummary(s);
  const list = st.last.slice(-25).reverse();
  const sumList = (x: { cat: PCat; amt: number }[]) => h('ul', { class: 'attr-list small' }, x.map((r) => h('li', null, h('span', null, t(PCATS[r.cat])), money31(r.amt))));
  const benName = (b: string) => (b.startsWith('p:') ? s.persons[b.slice(2)]?.name ?? t(partyLabel31('x')) : s.acts[b] ? s.acts[b].name : t(partyLabel31(b)));
  return h('div', null,
    section(t(l('Seu bolso: extrato pessoal', 'Your pocket: personal statement')),
      h('p', { class: 'muted small' }, t(l('Todo dinheiro seu passa por aqui, separado do caixa da empresa: quem pagou, de quem é e quem se beneficiou. Bem pago pela empresa que fica com você aparece como retirada (pró-labore ou dividendo).', 'All of your own money goes through here, apart from the company cash: who paid, whose it is and who benefited. An item paid by the company that stays with you shows as a draw (salary or dividend).'))),
      h('div', { class: 'grid2' },
        h('div', null, h('h4', null, t(l('Neste ano', 'This year'))), yr.length ? sumList(yr) : h('p', { class: 'muted small' }, '—')),
        h('div', null, h('h4', null, t(l('Desde o início', 'All time'))), all.length ? sumList(all) : h('p', { class: 'muted small' }, '—'),
          st.drawn ? h('p', { class: 'small' }, t(l('Bens e gastos seus pagos pela empresa (retiradas): {v}', 'Your items and expenses paid by the company (draws): {v}'), { v: $(st.drawn) })) : null))),
    section(t(l('Últimos movimentos', 'Latest movements')),
      list.length ? h('table', { class: 'tbl compact' },
        h('thead', null, h('tr', null, h('th', null, t(l('Ano', 'Year'))), h('th', null, t(l('O quê', 'What'))), h('th', null, t(l('Valor', 'Amount'))), h('th', null, t(l('Pagou', 'Paid'))), h('th', null, t(l('Dono', 'Owner'))), h('th', null, t(l('Beneficiário', 'Beneficiary'))))),
        h('tbody', null, list.map((x) => h('tr', null, h('td', { class: 'muted small' }, String(x.y)), h('td', null, t(x.memo ?? PCATS[x.cat])), h('td', null, money31(x.amt)),
          h('td', { class: 'small' }, t(partyLabel31(x.payer))), h('td', { class: 'small' }, t(partyLabel31(x.owner))), h('td', { class: 'small' }, benName(x.ben))))))
        : h('p', { class: 'muted small' }, t(l('Nenhum movimento ainda.', 'No movement yet.')))));
}

// ---------------------------------------------------------------- fichas

ACT_TABS.push((s: GameState, a: Act, close: () => void) => {
  if (a.owner !== 'player' && !a.playerBand) return null;
  return {
    id: 'results31', label: l('Resultados', 'Results'), icon: 'money',
    render: () => {
      const yrs = Object.keys(res31(s).Y).map(Number).sort((x, y) => y - x).slice(0, 4);
      const projs = projectsOfArtist31(s, a.id).slice(0, 12);
      return h('div', null,
        h('h4', null, t(l('Desde o início', 'All time'))), miniRow31(artistResult31(s, a.id), 'artist', a.id, close),
        h('ul', { class: 'small' }, yrs.map((y) => { const r = artistResult31(s, a.id, y); return r ? h('li', null, `${y}: `, t(l('margem', 'margin')), ' ', money31(r.margin)) : null; })),
        projs.length ? h('div', null, h('h4', null, t(l('Projetos', 'Projects'))), h('ul', { class: 'small' }, projs.map((p) => h('li', null, h('b', null, p.name || '—'), ' ', pill(t(KIND31[p.kind ?? 'x'])), ' · ', t(l('margem', 'margin')), ' ', money31(p.margin))))) : null);
    },
  };
});

RELEASE_EXTRAS.push((s, r) => {
  if (r.owner !== 'player' && !s.acts[r.actId]?.playerBand) return null;
  return h('div', null, h('h4', null, t(l('Resultado do lançamento', 'Release result'))), miniRow31(projectResult31(s, r.id), 'project', r.id));
});

// ---------------------------------------------------------------- abas e painel rápido

registerTab('business', { id: 'results31', label: l('Resultados', 'Results'), icon: 'chart-up', render: resultsView31 });
registerTab('business', { id: 'purse31', label: l('Seu bolso', 'Your pocket'), icon: 'money', render: purseView31 });

registerQuick31({
  id: 'q.results', verb: 'open', icon: 'chart-up', kinds: ['act', 'project'], passive: true, label: l('Ver resultado (receita, custo, margem)', 'See result (revenue, cost, margin)'),
  applies: (s, tg) => (tg.kind === 'act' ? s.acts[tg.id]?.owner === 'player' || !!s.acts[tg.id]?.playerBand : openProjects(s).some((x) => x.id === tg.id)),
  dest: () => RES_DEST31,
  run: (s, tg) => {
    if (tg.kind === 'act') goResults31('artist', tg.id);
    else { const p = openProjects(s).find((x) => x.id === tg.id); goResults31('project', p?.releaseId ?? p?.pendingId ?? tg.id); }
  },
});
