// Rodada 15 — fama (interface): aba "Fama" no artista e na pessoa (degrau, de onde vem, efeitos, gráfico
// histórico e linha do tempo), escolha de segurança para atos do seu elenco e o quadro "O que se sabe"
// (exposição pública × olheiros × relacionamento) usado pelas fichas para esconder dados com "?".

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import {
  FTIERS, HINT15, HINT15S, SEC15, canSee, comebackPot, fameHistory, fameLog, fameText, fameTier, feeMult, f15, knownLevel, mobChance, papStress,
  personFame, scandalAmp, secCost, setSecurity, wantRoyalty, whyHidden, type Field15,
} from '../../sim/sys/fame15';
import type { Act, GameState, Person } from '../../sim/types';
import { $, pill, rerender, section } from '../common';
import { h } from '../dom';
import { ACT_TABS, PERSON_TABS } from '../pages';
import { chips, stat } from '../vis';
import { regionFameBlock } from './fame16';

/** Marcador de dado oculto, com dica de como descobrir. */
export const hid = (f?: Field15): HTMLElement => h('span', { class: 'muted', title: t(f ? whyHidden(f) : HINT15) }, '?');
/** Mostra `v` se o campo estiver visível; senão "?" com a dica. */
export const gate = (s: GameState, id: string, f: Field15, v: () => Node | string | number | null): Node | string | number | null => (canSee(s, id, f) ? v() : hid(f));
export const hiddenNote = (f: Field15): HTMLElement => h('p', { class: 'muted small' }, '? ', t(whyHidden(f)), ' — ', t(HINT15S));

const pct = (v: number) => `${Math.round(v * 100)}%`;
const tierPill = (v: number) => { const i = fameTier(v); return pill(t(FTIERS[i].name), i >= 4 ? 'gold' : i >= 2 ? 'good' : ''); };

/** Gráfico histórico (trimestral) com faixas dos degraus. */
export function fameGraph(s: GameState, id: string): HTMLElement {
  const pts = fameHistory(s, id);
  if (pts.length < 2) return h('p', { class: 'muted small' }, t(l('Histórico começa a ser registrado a cada trimestre (atos e pessoas com alguma fama ou do seu elenco).', 'History is recorded every quarter (acts and people with some fame, or on your roster).')));
  const W = 600, H = 170, P = 26;
  const x0 = pts[0].x, x1 = pts[pts.length - 1].x;
  const X = (x: number) => P + ((x - x0) / Math.max(0.25, x1 - x0)) * (W - P - 6);
  const Y = (v: number) => H - 16 - (v / 100) * (H - 26);
  const bands = FTIERS.slice(1).map((tr) => `<line x1="${P}" x2="${W - 6}" y1="${Y(tr.min)}" y2="${Y(tr.min)}" stroke="var(--line)" stroke-dasharray="3 4"/><text x="${W - 8}" y="${Y(tr.min) - 3}" text-anchor="end" font-size="10" fill="var(--muted)">${t(tr.name)}</text>`).join('');
  const line = pts.map((p) => `${X(p.x).toFixed(1)},${Y(p.v).toFixed(1)}`).join(' ');
  const area = `${X(x0)},${Y(0)} ${line} ${X(x1)},${Y(0)}`;
  const years = [Math.ceil(x0), Math.floor(x1)].filter((y, i, a) => a.indexOf(y) === i && y >= x0 && y <= x1);
  const mid = x1 - x0 >= 6 ? [Math.round((x0 + x1) / 2)] : [];
  const ticks = [...years, ...mid].map((y) => `<text x="${X(y)}" y="${H - 2}" text-anchor="middle" font-size="10" fill="var(--muted)">${y}</text>`).join('');
  const peak = pts.reduce((m, p) => (p.v > m.v ? p : m), pts[0]);
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('class', 'fame15-graph');
  svg.setAttribute('style', 'width:100%;height:auto;max-width:640px;color:var(--accent)');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', t(l('Fama ao longo do tempo', 'Fame over time')));
  svg.innerHTML = `${bands}<polygon points="${area}" fill="currentColor" opacity="0.12"/><polyline points="${line}" fill="none" stroke="currentColor" stroke-width="2"/>`
    + `<circle cx="${X(peak.x)}" cy="${Y(peak.v)}" r="3.5" fill="var(--gold)"/><text x="${X(peak.x)}" y="${Y(peak.v) - 6}" text-anchor="middle" font-size="10" fill="var(--ink)">${peak.v}</text>${ticks}`;
  return h('div', null, svg as unknown as HTMLElement);
}

/** "O que se sabe": exposição pública, olheiros e relação — e o que continua escondido. */
export function knowBox(s: GameState, id: string): HTMLElement | null {
  const k = knownLevel(s, id);
  if (k.mine) return null;
  const fields: [Field15, L][] = [[ 'bio', l('biografia', 'bio')], ['fans', l('fãs e reputação', 'fans and reputation')], ['life', l('vida pública', 'public life')], ['attrs', l('atributos', 'attributes')], ['potential', l('potencial', 'potential')], ['traits', l('personalidade', 'personality')], ['mood', l('humor e saúde', 'mood and health')], ['contract', l('termos de contrato', 'contract terms')]];
  return h('div', { class: 'small fame15-know' },
    h('b', null, t(l('O que se sabe: ', 'What is known: '))),
    pill(`${t(l('exposição', 'exposure'))} ${t(FTIERS[k.exp].name)}`, k.exp >= 3 ? 'good' : ''), ' ',
    pill(`${t(l('olheiros', 'scouts'))} ${k.deg}/5`), ' ',
    k.rel ? pill(`${t(l('relação', 'relationship'))} ${k.rel}/4`, 'good') : null, ' ',
    ...fields.map(([f, n]) => h('span', { class: canSee(s, id, f) ? 'good' : 'muted', title: t(whyHidden(f)) }, `${canSee(s, id, f) ? '✓' : '?'} ${t(n)}  `)),
    h('div', { class: 'muted' }, t(l('Paradas, discos lançados, prêmios e selo são sempre públicos. Quanto mais famoso, mais da vida está nas revistas; atributos, potencial, humor e contrato só com olheiros ou relação próxima.', 'Charts, released records, awards and label are always public. The more famous, the more of their life is in the magazines; attributes, potential, mood and contract need scouts or a close relationship.'))),
  );
}

function logList(s: GameState, ids: string[]): HTMLElement | null {
  const xs = fameLog(s, ids).slice(-10).reverse();
  return xs.length ? h('ul', { class: 'memory small' }, xs.map(([y, m, , tx, d]) => h('li', { class: d > 0 ? 'good' : d < 0 ? 'bad' : '' }, h('span', { class: 'muted' }, `${m + 1}/${y} · `), t(tx)))) : null;
}

function actFame(s: GameState, a: Act, redraw: () => void): HTMLElement {
  const k = knownLevel(s, a.id);
  const ti = fameTier(a.fame);
  const sec = f15(s).sec[a.id] ?? 0;
  const ms = a.members.map((x) => s.persons[x]).filter((p): p is Person => !!p);
  const pub = k.mine || k.pub >= 2;
  return h('div', null,
    knowBox(s, a.id),
    chips(stat('star', fameText(s, a.id), l('Fama (alcance)', 'Fame (reach)')), pub ? stat('chart-up', Math.round(f15(s).pk[a.id] ?? a.fame), l('Pico', 'Peak')) : null, pub ? stat('fire', `+${comebackPot(s, a)}`, l('Potencial de retorno', 'Comeback potential')) : null),
    h('p', null, pub || k.pub >= 1 ? tierPill(a.fame) : hid('fame'), ' ', h('span', { class: 'small muted' }, pub || k.pub >= 1 ? t(FTIERS[ti].desc) : t(HINT15))),
    pub ? section(t(l('Efeitos da fama agora', 'Fame effects right now')), h('ul', { class: 'small' },
      h('li', null, t(l('Cachê de shows: ×{m}', 'Show fees: ×{m}'), { m: feeMult(a).toFixed(2) })),
      h('li', null, t(l('Royalty que considera justo: {w}', 'Royalty they consider fair: {w}'), { w: pct(wantRoyalty(a)) }), ti >= 2 ? h('span', { class: 'muted' }, ` · ${t(l('pesa nas propostas', 'weighs on offers'))}`) : null),
      h('li', null, t(l('Imprensa: {c}', 'Press: {c}'), { c: ti >= 2 ? t(l('~{p}% de chance por mês de virar pauta (momento e hype)', '~{p}% chance a month to make the news (momentum and hype)'), { p: 3 * ti }) : t(l('quase ninguém cobre', 'hardly anyone covers them')) })),
      h('li', null, t(l('Escândalos: impacto ×{k}', 'Scandals: impact ×{k}'), { k: scandalAmp(a).toFixed(1) })),
      ti >= 3 ? h('li', null, t(l('Paparazzi: +{p} de estresse/mês nos integrantes · tumulto de fãs {m}/mês', 'Paparazzi: +{p} stress/month on members · fan mob {m}/month'), { p: papStress(s, a).toFixed(1), m: pct(mobChance(s, a)) })) : null,
      h('li', { class: 'muted' }, t(l('Sem lançar por 3+ anos a fama esfria mais rápido; um retorno devolve parte do pico. Morte e lendas: a fama póstuma segura o nome.', 'Without a release for 3+ years fame cools faster; a comeback returns part of the peak. Death and legends: posthumous fame holds the name.'))),
    )) : null,
    k.mine && ti >= 2 ? section(t(l('Segurança', 'Security')),
      h('div', { class: 'row wrap' }, SEC15.map((x, i) => h('button', { class: `btn small ${i === sec ? 'primary' : 'ghost'}`, title: t(x.desc), onclick: () => { setSecurity(s, a.id, i); redraw(); rerender(); } }, `${t(x.name)} · ${$(secCost(s, a, i))}/${t(l('mês', 'mo'))}`))),
      h('p', { class: 'small muted' }, t(SEC15[sec].desc))) : null,
    regionFameBlock(s, a.id),
    ms.length > 1 && (k.mine || k.pub >= 2) ? section(t(l('Quem é mais famoso', 'Who is most famous')), h('ul', { class: 'small' }, ms.map((p) => ({ p, v: personFame(s, p.id).v })).sort((x, y) => y.v - x.v).map(({ p, v }) => h('li', null, h('b', null, p.name), ` · ${Math.round(v)} `, tierPill(v), v - a.fame >= 8 ? pill(t(l('maior que a banda (ego)', 'bigger than the band (ego)')), 'warn') : null)))) : null,
    section(t(l('Fama ao longo do tempo', 'Fame over time')), k.mine || k.pub >= 1 ? fameGraph(s, a.id) : hiddenNote('bio')),
    k.mine || k.pub >= 1 ? logList(s, [a.id]) : null,
  );
}

function personFameView(s: GameState, p: Person): HTMLElement {
  const k = knownLevel(s, p.id);
  const pf = personFame(s, p.id);
  const pub = k.mine || k.pub >= 2;
  return h('div', null,
    knowBox(s, p.id),
    h('p', null, k.pub >= 1 || k.mine ? tierPill(pf.v) : hid('fame'), ' ', h('b', null, pub ? String(Math.round(pf.v)) : k.pub >= 1 ? `${Math.max(0, Math.round(pf.v - 12))}–${Math.min(100, Math.round(pf.v + 12))}` : ''), ' ',
      h('span', { class: 'small muted' }, t(FTIERS[fameTier(pf.v)].desc))),
    pub && pf.parts.length ? h('ul', { class: 'small' }, pf.parts.map((x) => h('li', null, `${x.v > 0 ? '+' : ''}${x.v} · `, t(x.t)))) : null,
    h('p', { class: 'small muted' }, t(l('A fama de cada pessoa sai da banda (líder e voz levam mais), do carisma de palco e de um saldo pessoal: escândalos, morte e ego. Quem é mais famoso que a banda leva a fama para a carreira solo.', 'Each person\'s fame comes from the band (leader and voice get more), stage charisma and a personal balance: scandals, death and ego. Whoever is bigger than the band takes that fame into a solo career.'))),
    regionFameBlock(s, p.id),
    section(t(l('Fama ao longo do tempo', 'Fame over time')), k.mine || k.pub >= 1 ? fameGraph(s, p.id) : hiddenNote('bio')),
    k.mine || k.pub >= 1 ? logList(s, [p.id]) : null,
  );
}

ACT_TABS.push((s, a) => ({ id: 'fame15', label: l('Fama', 'Fame'), icon: 'star', render: () => { const box = h('div'); const draw = () => box.replaceChildren(actFame(s, a, draw)); draw(); return box; } }));
PERSON_TABS.push((s, p) => ({ id: 'fame15p', label: l('Fama', 'Fame'), icon: 'star', render: () => personFameView(s, p) }));
