// Rodada 19 (Onda 5, A) — interface: pacote inicial e custo de fundação no Novo Jogo, terreno e qualidade da edição
// no cartão do festival, e a aba "Grupo e consolidado" em Finanças (DRE por negócio × consolidada, transferências
// internas, desconto da casa e conflitos de interesse).
import { l } from '../../data/world';
import { t } from '../../i18n/strings';
import { nominal } from '../../core/money';
import type { GameState, RunConfig } from '../../sim/types';
import { consolOp18, fin18, opProfit18, sumP18 } from '../../sim/ledger18';
import { STARTER19, GROUND19, car19, festQ19, groundOf19, growGround19 } from '../../sim/sys/careers19';
import { HOUSE_DESC, HOUSE_NAME, conflicts19, intra19, intraTotal19, intraYear19, setHouse19, type HouseK, type HouseP } from '../../sim/sys/intra19';
import { f12, muOf } from '../../sim/sys/fest12';
import { festCap19 } from '../../sim/sys/live/festival';
import { VKINDS, ventures, type VKind } from '../../sim/sys/ventures9';
import { prod } from '../../sim/sys/studio12';
import { $, pill, rerender, section, toast } from '../common';
import { h, select } from '../dom';
import { registerTab } from '../registry';
import { why18 } from '../explain18';
import { FEST_EXTRA12 } from './fest12';
import type { Act } from '../../sim/types';

const usd = (real: number, y: number) => $(nominal(real, y));

/** Novo Jogo: o que cada carreira principal recebe para começar e quanto custaria fundar do zero. */
export function ngStarter19(cfg: RunConfig, main: string[]): HTMLElement | null {
  const rows = main.filter((id) => STARTER19[id]);
  if (!rows.length) return null;
  const y = cfg.startYear;
  const full = (id: string) => (VKINDS[id as VKind] ? VKINDS[id as VKind].cost : id === 'venue' ? 60000 : 0);
  return h('div', { class: 'car19-ng small' },
    h('h4', null, t(l('Pacote inicial (pago do caixa da empresa)', 'Starter package (paid from company cash)'))),
    h('ul', null, rows.map((id) => {
      const p = STARTER19[id];
      const k = p.kind ? VKINDS[p.kind] : undefined;
      const off = k && k.from > y;
      return h('li', { class: off ? 'muted' : '' }, h('b', null, t(p.name)), ' — ', t(p.desc), ' ',
        p.cost ? pill(t(l('custa {c}', 'costs {c}'), { c: usd(p.cost, y) }), '') : null, ' ',
        full(id) ? pill(t(l('fundar do zero: {c}', 'founding from scratch: {c}'), { c: usd(full(id), y) }), 'warn') : null,
        off ? ` (${t(l('só a partir de {y}', 'only from {y}'), { y: k!.from })})` : null);
    })),
    !main.includes('label') ? h('p', { class: 'muted' }, t(l('Sem a carreira de selo você trabalha de casa: não paga aluguel de sede. Se o caixa não cobrir o pacote, o resto vira crédito de fundação (empréstimo de 36 parcelas).', 'Without the label career you work from home: no HQ rent. If cash does not cover the package, the rest becomes a founding credit (36-instalment loan).'))) : null);
}

// ---------------------------------------------------------------- festival: terreno e qualidade

FEST_EXTRA12.push((s, f) => {
  const g = groundOf19(s, f.id);
  const nx = GROUND19[g + 1];
  const acts = f.lineup.map((y) => s.acts[y.actId]).filter((a): a is Act => !!a);
  const q = festQ19(s, f, acts);
  const cap = festCap19.f(s, f);
  const mu = muOf(s, f);
  const x = f12(s, f);
  return h('div', { class: 'card car19-fest small' },
    h('div', { class: 'row wrap' },
      h('b', null, t(l('Terreno', 'Grounds')), ': '), t(GROUND19[g]?.name ?? l('—', '—')), ' ',
      pill(Number.isFinite(cap) ? t(l('até {n} pessoas', 'up to {n} people'), { n: cap.toLocaleString() }) : t(l('capacidade pelos portões', 'capacity by gates'))),
      nx ? h('button', { class: 'btn tiny', title: t(l('Precisa de: {n}', 'Needs: {n}'), { n: t(nx.need) }), onclick: () => { const e = growGround19(s, f.id); toast(t(e ?? l('Terreno ampliado.', 'Grounds expanded.')), e ? 'bad' : 'good'); rerender(); } },
        t(l('Passar para {g} ({c})', 'Move to {g} ({c})'), { g: t(nx.name), c: $(Math.round(nominal(nx.cost, s.year))) })) : null),
    acts.length ? h('p', null, why18(s, 'fest19.demand', { fx: f.id }, t(l('Qualidade da edição para o público: ×{k}', 'Edition quality for the crowd: ×{k}'), { k: q.k.toFixed(2) })),
      q.k < 0.7 ? h('span', { class: 'warn' }, ' — ', t(l('line-up fraco: não espere lotar.', 'weak bill: don\'t expect a sell-out.'))) : null) : null,
    mu > 0 && mu <= 4 && !f.lineup.length ? h('p', { class: 'bad' }, t(l('Faltam {m} meses e não há atração: sem line-up a edição é cancelada.', '{m} months left and no acts: with no bill the edition is cancelled.'), { m: mu })) : null,
    x.hist.length && mu > 4 ? h('p', { class: 'muted' }, t(l('Entre edições: decisões do ramo (olheiro, patrocinador, alvará, vizinhos, tiqueteira) chegam na Central de decisões.', 'Between editions: branch decisions (scouting, sponsors, permits, neighbours, ticketing) arrive in the decision hub.'))) : null);
});

// ---------------------------------------------------------------- Finanças: grupo e consolidado

interface Row19 { name: string; rev: number; cost: number; inn: number; out: number }
function rows19(s: GameState): Row19[] {
  const Y = intraYear19(s);
  const f = fin18(s).y[s.year];
  const out: Row19[] = [];
  const lab = Y.label ?? { inn: 0, out: 0 };
  out.push({ name: t(l('Selo / empresa (DRE do ano)', 'Label / company (P&L this year)')), rev: sumP18(f, 'rev:'), cost: -sumP18(f, 'cost:'), inn: lab.inn, out: lab.out });
  for (const v of ventures(s).list) {
    const pl = v.pl.filter((e) => e.y === s.year);
    if (v.owner === 'label') continue; // já está na DRE do selo
    const tl = Y[v.id] ?? { inn: 0, out: 0 };
    out.push({ name: `${v.name} (${t(l('pessoal', 'personal'))})`, rev: pl.reduce((a, e) => a + e.rev, 0), cost: pl.reduce((a, e) => a + e.cost, 0), inn: tl.inn, out: tl.out });
  }
  const P = Y.producer;
  if (P || prod(s).on) out.push({ name: t(l('Produtor (você, patrimônio pessoal)', 'Producer (you, personal wealth)')), rev: P?.inn ?? 0, cost: 0, inn: P?.inn ?? 0, out: P?.out ?? 0 });
  const M = Y.manager;
  if (M) out.push({ name: t(l('Empresário', 'Manager')), rev: M.inn, cost: M.out, inn: M.inn, out: M.out });
  return out;
}

function grupoTab(s: GameState): HTMLElement {
  const st = intra19(s);
  const f = fin18(s).y[s.year];
  const rows = rows19(s);
  const tot = rows.reduce((a, r) => ({ rev: a.rev + r.rev, cost: a.cost + r.cost, inn: a.inn + r.inn, out: a.out + r.out }), { rev: 0, cost: 0, inn: 0, out: 0 });
  const conf = conflicts19(s);
  const pol = (k: HouseK) => h('div', { class: 'row wrap small' }, h('b', null, t(HOUSE_NAME[k])), ' ',
    select<HouseP>(st.house[k], [{ value: 'market', label: t(l('Preço de mercado', 'Market price')) }, { value: 'discount', label: t(l('Desconto da casa', 'House discount')) }], (v) => { setHouse19(s, k, v); rerender(); }),
    h('span', { class: 'muted' }, ' ', t(HOUSE_DESC[k][st.house[k]])));
  return h('div', null,
    section(t(l('DRE por negócio × consolidada ({y})', 'P&L by business × consolidated ({y})'), { y: s.year }),
      h('table', { class: 'tbl compact' },
        h('thead', null, h('tr', null, ...[l('Negócio', 'Business'), l('Receita', 'Revenue'), l('Custos', 'Costs'), l('Recebido de negócios seus', 'Received from your businesses'), l('Pago a negócios seus', 'Paid to your businesses'), l('Resultado', 'Result')].map((x) => h('th', null, t(x))))),
        h('tbody', null, ...rows.map((r) => h('tr', null, h('td', null, r.name), h('td', null, $(r.rev)), h('td', null, $(-r.cost)), h('td', { class: 'muted' }, $(r.inn)), h('td', { class: 'muted' }, $(-r.out)), h('td', { class: r.rev - r.cost < 0 ? 'bad' : 'good' }, $(r.rev - r.cost)))),
          h('tr', null, h('td', null, h('b', null, t(l('= Consolidado (sem transferências internas)', '= Consolidated (internal transfers removed)')))), h('td', null, $(tot.rev - tot.inn)), h('td', null, $(-(tot.cost - tot.out))), h('td', null, '—'), h('td', null, '—'), h('td', null, h('b', null, $(tot.rev - tot.inn - (tot.cost - tot.out))))))),
      h('p', { class: 'small' }, why18(s, 'intra19.house', {}, t(l('Transferências internas no ano: {v}', 'Internal transfers this year: {v}'), { v: $(intraTotal19(s)) })), ' · ',
        t(l('Lucro operacional do selo: {a} · consolidado: {b}', 'Label operating profit: {a} · consolidated: {b}'), { a: $(opProfit18(f)), b: $(consolOp18(f)) })),
      h('p', { class: 'muted small' }, t(l('Serviço entre dois negócios seus (o seu ato no seu festival, você produzindo o seu selo, o seu estúdio gravando o seu selo, o seu veículo tocando o seu ato, a sua editora nos discos do seu selo) é débito num e crédito no outro, a preço de mercado. A DRE de cada negócio mostra; a consolidada elimina — dinheiro trocando de bolso não é lucro.', 'A service between two of your businesses (your act at your festival, you producing your label, your studio recording your label, your outlet playing your act, your publisher on your label\'s records) is a debit in one and a credit in the other, at market price. Each business\'s P&L shows it; the consolidated one removes it — money changing pockets is not profit.')))),
    section(t(l('Preço entre os seus negócios', 'Pricing between your businesses')), ...(Object.keys(st.house) as HouseK[]).map(pol),
      h('p', { class: 'muted small' }, t(l('Desconto da casa: quem paga economiza, mas o artista sente — favor quando ele ganha, mágoa quando ele perde (obrigações em Relações).', 'House discount: the payer saves, but the act feels it — a favor when they gain, a grievance when they lose (obligations under Relations).')))),
    section(t(l('Conflitos de interesse', 'Conflicts of interest')),
      conf.length ? h('ul', { class: 'small' }, conf.map((c) => h('li', { class: 'warn' }, t(c.t)))) : h('p', { class: 'muted small' }, t(l('Nenhum agora.', 'None right now.'))),
      st.log.length ? h('details', { class: 'small' }, h('summary', null, t(l('Histórico', 'History'))), h('ul', null, st.log.slice(-10).reverse().map((x) => h('li', null, t(x.t))))) : null),
    car19(s).credit ? h('p', { class: 'small muted' }, t(l('Crédito de fundação tomado no começo: {v} (parcelas em Empréstimos).', 'Founding credit taken at the start: {v} (instalments under Loans).'), { v: $(car19(s).credit) })) : null,
  );
}
registerTab('business', { id: 'grupo19', label: l('Grupo e consolidado', 'Group and consolidated'), icon: 'chart-up', order: 1, render: grupoTab });

