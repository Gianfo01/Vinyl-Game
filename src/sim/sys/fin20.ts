// Rodada 20 (G2): explicações ("por quê") da posição financeira consolidada e dos DOIS legados.
//  B21 "Legado" eram dois números diferentes com o mesmo nome no fim de partida:
//      • Legado do selo  = soma das 7 dimensões (comercial, cultural, artistas, inovação, indústria, catálogo, reputação; 0–100 cada).
//      • Legado por caminhos = melhor caminho + 30% do segundo + pontos de caminho (paths18).
//  Agora cada um tem nome próprio e composição que reconcilia.
import { l, type L } from '../../data/world';
import { LEGACY_DIMS } from '../../data/rules';
import { registerExplain, type WhyPart } from '../explain18';
import { legacyTotal } from '../legacy';
import { KIND_NAME20, obligations20, position20, recon20, type OblKind20 } from '../oblig20';
import type { GameState } from '../types';
import { legacy18, pa18, pathDef18 } from './paths18';

export const LABEL_LEGACY20: L = l('Legado do selo', 'Label legacy');
export const PATH_LEGACY20: L = l('Legado por caminhos', 'Path legacy');

export interface LegacyCompo20 { label: { total: number; parts: { name: L; v: number }[] }; path: { total: number; best?: { name: L; v: number }; second?: { name: L; v: number; w: number }; pts: number } }
export function legacyCompo20(s: GameState): LegacyCompo20 {
  const L18 = legacy18(s);
  const sc = L18.parts, best = L18.best ? sc.find((x) => x.id === L18.best) : undefined, second = sc.find((x) => x !== best);
  const nm = (id: string): L => pathDef18(id)?.name ?? l(id);
  return {
    label: { total: legacyTotal(s), parts: LEGACY_DIMS.map((d) => ({ name: d.name, v: Math.round(s.player.legacy[d.id] ?? 0) })) },
    path: { total: L18.total, best: best ? { name: nm(best.id), v: Math.round(best.score) } : undefined, second: second ? { name: nm(second.id), v: Math.round(second.score), w: Math.round(second.score * 0.3) } : undefined, pts: Math.round(pa18(s).pts) },
  };
}

registerExplain('legacy.label20', (s) => {
  const c = legacyCompo20(s).label;
  return { title: LABEL_LEGACY20, value: c.total, fmt: 'num', parts: c.parts.map((p) => ({ label: p.name, value: p.v, fmt: 'num' as const })),
    note: l('Soma das 7 dimensões (0–100 cada, máximo 700). Não é o "Legado por caminhos".', 'Sum of the 7 dimensions (0–100 each, max 700). Not the "Path legacy".') };
});
registerExplain('legacy.path20', (s) => {
  const c = legacyCompo20(s).path;
  const parts: WhyPart[] = [];
  if (c.best) parts.push({ label: c.best.name, value: c.best.v, fmt: 'num' });
  if (c.second) parts.push({ label: { pt: `${c.second.name.pt} × 30%`, en: `${c.second.name.en} × 30%` }, value: c.second.w, fmt: 'num' });
  parts.push({ label: l('Pontos de caminho', 'Path points'), value: c.pts, fmt: 'num' });
  return { title: PATH_LEGACY20, value: c.total, fmt: 'num', parts, note: l('Melhor caminho + 30% do segundo + pontos de caminho. Não é a soma das dimensões do selo.', 'Best path + 30% of the second + path points. Not the sum of label dimensions.') };
});

registerExplain('fin.position20', (s) => {
  const p = position20(s);
  return { title: l('Patrimônio líquido (agora)', 'Equity (now)'), value: p.equity, fmt: 'money', parts: [
    { label: l('Caixa', 'Cash'), value: p.cash, fmt: 'money' },
    { label: l('Ativos (valor contábil)', 'Assets (book value)'), value: p.assets, fmt: 'money' },
    { label: l('A receber (subledger, ao vivo)', 'Receivables (subledger, live)'), value: p.ar, fmt: 'money' },
    { label: l('Dívida (empréstimos, credores, títulos)', 'Debt (loans, creditors, bonds)'), value: -p.debt, fmt: 'money', tone: p.debt ? 'bad' : '' },
    { label: l('A pagar (subledger, ao vivo)', 'Payables (subledger, live)'), value: -p.ap, fmt: 'money', tone: p.ap ? 'bad' : '' },
  ], note: l('Reservas de ofertas e planos agendados comprometem caixa, mas não são passivo.', 'Offer reserves and scheduled plans commit cash but are not liabilities.') };
});
registerExplain('fin.recon20', (s) => {
  const r = recon20(s);
  if (!r) return null;
  return { title: l('Reconciliação do caixa', 'Cash reconciliation'), value: r.now, fmt: 'money', parts: [
    { label: l('Caixa no último fechamento', 'Cash at last close'), value: r.open, fmt: 'money' },
    { label: l('Operacional', 'Operating'), value: r.op, fmt: 'money' },
    { label: l('Investimento', 'Investing'), value: r.inv, fmt: 'money' },
    { label: l('Financiamento', 'Financing'), value: r.fin, fmt: 'money' },
    { label: l('Outros ajustes', 'Other adjustments'), value: r.other, fmt: 'money' },
  ], note: l('Saldo inicial + entradas − saídas = saldo final. O resultado contábil não precisa ser igual à variação de caixa.', 'Opening balance + inflows − outflows = closing balance. Accounting profit need not equal the cash change.') };
});

export function oblGroups20(s: GameState): { kind: OblKind20; name: L; total: number; liability: boolean; items: ReturnType<typeof obligations20> }[] {
  const all = obligations20(s);
  return (Object.keys(KIND_NAME20) as OblKind20[]).map((k) => { const items = all.filter((o) => o.kind === k); return { kind: k, name: KIND_NAME20[k], total: items.reduce((t, o) => t + o.amt, 0), liability: items.some((o) => o.liability), items }; }).filter((g) => g.items.length);
}
