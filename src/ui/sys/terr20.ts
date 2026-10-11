// Rodada 20 (G7): Fãs por região (aba do artista) e Preço por mercado (Mercado › seção). Ver sim/sys/terr20.ts.
import { MARKETS, l, type MarketId } from '../../data/world';
import { t } from '../../i18n/strings';
import { PRICE_TIERS } from '../../sim/sys/industry/retail';
import type { PriceTier } from '../../sim/sys/industry/state';
import { MK20, conf20, fansIn20, salesSplit20, setOv20, share20, target20, terr20, tierOf20 } from '../../sim/sys/terr20';
import type { GameState } from '../../sim/types';
import { playerActs } from '../../sim/util';
import { N, actLink, pill, rerender, section } from '../common';
import { h, select } from '../dom';
import { why18 } from '../explain18';
import { T } from '../help18';
import { registerPageTab, registerSection } from '../registry';

const mkName = (m: MarketId) => t(MARKETS.find((x) => x.id === m)!.name);
const pc = (v: number) => `${Math.round(v * 100)}%`;
const CONF_CLS = ['warn', '', 'good'];
const tbl = (head: string[], rows: HTMLElement[]) => h('div', { style: 'overflow-x:auto' }, h('table', { class: 'tbl compact num' }, h('thead', null, h('tr', null, head.map((x) => h('th', null, x)))), h('tbody', null, rows)));

function fansTab(s: GameState, id: string): HTMLElement | null {
  const a = s.acts[id];
  if (!a) return null;
  const led = terr20(s).a[id], sh = share20(s, a), tg = target20(s, a);
  const rows = MK20.filter((m) => (led?.[m] ? led[m]!.some((x) => x > 0) : tg[m] >= 0.01)).sort((x, y) => sh[y] - sh[x]).map((m) => {
    const c = fansIn20(s, a, m), cf = conf20(s, a, m);
    return h('tr', null, h('td', null, mkName(m)), h('td', null, N(c[0])), h('td', null, N(c[1])), h('td', null, N(c[2])),
      h('td', null, why18(s, 'terr20.demand', { act: id, mk: m }, pc(sh[m]))), h('td', null, pc(tg[m])),
      h('td', null, pill(`${t(cf.name)} ±${Math.round(cf.pm * 100)}%`, CONF_CLS[cf.lv])));
  });
  return h('div', null,
    h('p', { class: 'small' }, t(l('Onde estão os fãs deste ato. Cada região guarda casuais, ativos e núcleo; a soma das regiões é sempre o total global. Shows convertem fãs na praça onde acontecem e aumentam a procura ali na próxima turnê; sem atividade, a distribuição volta aos poucos para o que a fama regional explica.', 'Where this act\'s fans are. Each region keeps casual, active and core fans; regions always add up to the global total. Shows convert fans where they happen and raise demand there on the next tour; without activity, the split drifts back to what regional fame explains.'))),
    led ? null : h('p', { class: 'small muted' }, t(l('Primeira estimativa: o livro começa na próxima virada de mês.', 'First estimate: the ledger starts at the next month turn.'))),
    tbl([t(l('Região', 'Region')), t(l('Casuais', 'Casual')), t(l('Ativos', 'Active')), t(l('Núcleo', 'Core')), t(l('Fatia', 'Share')), t(l('Pela fama', 'By fame')), t(l('Confiança', 'Confidence'))], rows),
    h('p', { class: 'small muted' }, t(l('Confiança: alta = show lá nos últimos 12 meses; média = sinal local de fama, território aberto ou cidade natal; baixa = só a fama global distribuída.', 'Confidence: high = show there in the last 12 months; medium = local fame signal, open territory or home city; low = global fame spread only.'))));
}

function priceSection(s: GameState): HTMLElement {
  const st = terr20(s), g = s.x4.industry.pricing, sp = salesSplit20(s);
  const tiers = Object.keys(PRICE_TIERS) as PriceTier[];
  const acts = playerActs(s).map((x) => s.acts[x]).filter((a) => a && a.status !== 'retired' && a.status !== 'split');
  return section(t(l('Fãs e preço por mercado', 'Fans and pricing by market')),
    h('p', { class: 'small' }, t(l('A política de preço da Indústria vale para todos os mercados. Aqui você pode sobrepor só um mercado: as unidades mudam nos lançamentos que saem lá e a margem extra (ou o desconto) entra uma vez, sobre a fatia estimada das vendas desse mercado — a fatia vem do livro regional de fãs do elenco.', 'Industry pricing applies to every market. Here you can override a single market: units change on releases out there and the extra margin (or discount) is booked once, on that market\'s estimated share of sales — the share comes from the roster\'s regional fan ledger.'))),
    tbl([t(l('Mercado', 'Market')), t(l('Fatia estimada das vendas', 'Estimated share of sales')), t(l('Preço', 'Price')), t(l('Cópias × / receita por cópia', 'Copies × / revenue per copy'))], MK20.filter((m) => s.player.territories.includes(m)).map((m) => {
      const tr = tierOf20(s, m), pt = PRICE_TIERS[tr];
      return h('tr', null, h('td', null, mkName(m), st.ov[m] ? ' •' : ''), h('td', null, pc(sp[m])),
        h('td', null, select(st.ov[m] ?? '', [{ value: '', label: `${t(l('Global', 'Global'))}: ${t(PRICE_TIERS[g].name)}` }, ...tiers.filter((x) => x !== g).map((x) => ({ value: x, label: t(PRICE_TIERS[x].name) }))], (v) => { setOv20(s, m, (v || null) as PriceTier | null); rerender(); }, { 'aria-label': `${t(l('Preço em', 'Price in'))} ${mkName(m)}` })),
        h('td', null, `×${(pt.units / PRICE_TIERS[g].units).toFixed(2)} · ${pt.revenue - PRICE_TIERS[g].revenue >= 0 ? '+' : ''}${Math.round((pt.revenue - PRICE_TIERS[g].revenue) * 100)} p.p.`));
    })),
    acts.length ? h('details', null, h('summary', null, t(l('Maior praça de cada ato', 'Each act\'s biggest market'))),
      h('ul', { class: 'small' }, acts.map((a) => { const sh = share20(s, a); const m = [...MK20].sort((x, y) => sh[y] - sh[x])[0]; const cf = conf20(s, a, m); return h('li', null, actLink(s, a.id), ` — ${mkName(m)} ${pc(sh[m])} (${t(l('confiança', 'confidence'))} ${t(cf.name)})`); }))) : null,
    st.log.length ? h('ul', { class: 'small muted' }, st.log.slice(0, 5).map(([y, mo, x]) => h('li', null, `${mo + 1}/${y} · ${t(x)}`))) : null);
}

registerPageTab('act', { id: 'terr20', label: l('Fãs por região', 'Fans by region'), icon: 'globe', order: 59, when: (s, id) => s.acts[id]?.owner === 'player' || !!s.acts[id]?.playerBand, render: fansTab });
registerSection('world', { id: 'terr20', order: 80, render: priceSection, title: l('Fãs e preço por mercado', 'Fans and pricing by market') });
T('*', 'terr20', ['Fãs por região', 'Fans by region'],
  ['Coortes casual/ativo/núcleo por região, somando sempre o total global, com confiança da estimativa.', 'Casual/active/core cohorts per region, always adding up to the global total, with estimate confidence.'],
  ['Faça shows onde quer crescer: os fãs convertidos ficam naquela praça e a procura da próxima turnê lá sobe (até +12%). Ex.: três datas no Brasil levam a fatia BR acima do que a fama explica.', 'Play where you want to grow: converted fans stay in that market and the next tour\'s demand there rises (up to +12%). E.g. three dates in Brazil push the BR share above what fame explains.']);
