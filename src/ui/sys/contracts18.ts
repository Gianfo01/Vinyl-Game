// Rodada 18 (econ18): cláusulas na ficha de proposta + o raciocínio do artista, linha por linha.
import { l } from '../../data/world';
import { t } from '../../i18n/strings';
import { LEGACY18, PKG18, applyPkg18, advisor18, labelEdge18, reason18, type Clauses18 } from '../../sim/sys/contracts18';
import type { Act, GameState, Offer } from '../../sim/types';
import { h, select } from '../dom';

type O = Omit<Offer, 'id' | 'week' | 'status'>;

export function clauses18Fields(s: GameState, a: Act, o: O, update: () => void): HTMLElement {
  if (!o.clauses18) applyPkg18(o, 'major');
  const box = h('fieldset', { class: 'clauses18' });
  const why = h('div', { class: 'why18' });
  const k = (): Clauses18 => (o.clauses18 ??= { ...LEGACY18 });
  const drawWhy = () => {
    const w = reason18(s, a, o);
    const edge = labelEdge18(k(), s.year);
    const adv = advisor18(s, a);
    why.replaceChildren(
      h('h5', null, t(l('Como {a} lê as letras miúdas', 'How {a} reads the fine print'), { a: a.name })),
      h('ul', { class: 'small' }, w.map((x) => h('li', { class: x.d > 0.004 ? 'good' : x.d < -0.004 ? 'bad' : 'muted' }, x.d > 0.004 ? '▲ ' : x.d < -0.004 ? '▼ ' : '· ', t(x.f)))),
      h('p', { class: 'muted small' }, t(adv === 2 ? l('Com empresário, cada cláusula pesa por inteiro.', 'With a manager, every clause counts in full.') : adv === 1 ? l('Com advogado, a maior parte das cláusulas é percebida.', 'With a lawyer, most clauses are noticed.') : l('Sem assessoria: cláusulas duras passam quase despercebidas agora, mas cobram confiança depois.', 'No advisors: harsh clauses barely register now, but cost trust later.')),
        ' · ', t(l('Vantagem para o selo: {v}', 'Edge for the label: {v}'), { v: t(edge > 2 ? l('alta', 'high') : edge > 0.8 ? l('média', 'medium') : l('baixa', 'low')) })),
    );
  };
  const ch = (fn: () => void) => () => { fn(); draw(); update(); };
  const draw = () => {
    const c = k();
    box.replaceChildren(
      h('legend', null, t(l('Cláusulas (recuperável, royalties, contas, compromissos)', 'Clauses (recoupable, royalties, statements, commitments)'))),
      h('label', null, t(l('Pacote', 'Package')), select(c.pkg, [{ value: 'custom', label: t(l('Personalizado', 'Custom')) }, ...PKG18.map((p) => ({ value: p.id, label: t(p.name) }))], (v: string) => { if (v !== 'custom') applyPkg18(o, v); else k().pkg = 'custom'; draw(); update(); })),
      h('p', { class: 'muted small' }, t(PKG18.find((p) => p.id === c.pkg)?.desc ?? l('Cláusulas negociadas uma a uma.', 'Clauses negotiated one by one.'))),
      h('label', null, t(l('Gravação recuperável', 'Recording recoupable')), select(String(c.rec), ['0', '0.5', '1'].map((v) => ({ value: v, label: `${Number(v) * 100}%` })), (v: string) => ch(() => { k().rec = Number(v) as Clauses18['rec']; k().pkg = 'custom'; })())),
      h('label', null, t(l('Marketing recuperável', 'Marketing recoupable')), select(String(c.mkt), ['0', '0.25', '0.5'].map((v) => ({ value: v, label: `${Number(v) * 100}%` })), (v: string) => ch(() => { k().mkt = Number(v) as Clauses18['mkt']; k().pkg = 'custom'; })())),
      ...(['video', 'tour', 'cross', 'audit'] as const).map((f) => h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: c[f], onchange: (e: Event) => ch(() => { k()[f] = (e.target as HTMLInputElement).checked; k().pkg = 'custom'; })() }),
        t({ video: l('Clipes recuperáveis', 'Videos recoupable'), tour: l('Apoio de turnê recuperável', 'Tour support recoupable'), cross: l('Recuperação cruzada (senão, por projeto)', 'Cross-collateralized (else per project)'), audit: l('Direito de auditoria', 'Audit right') }[f]))),
      h('label', null, t(l('Teto por projeto (aprovação do artista)', 'Per-project cap (artist approval)')), select(String(c.cap), ['0', '10000', '25000', '50000'].map((v) => ({ value: v, label: v === '0' ? t(l('sem teto', 'no cap')) : `US$ ${Number(v) / 1000}k` })), (v: string) => ch(() => { k().cap = Number(v); k().pkg = 'custom'; })())),
      h('label', null, t(l('Base do royalty', 'Royalty base')), select(c.base, [{ value: 'retail', label: t(l('Preço de varejo (− embalagem)', 'Retail price (− packaging)')) }, { value: 'wholesale', label: t(l('Preço de atacado (− embalagem)', 'Wholesale (− packaging)')) }, { value: 'net', label: t(l('Receita líquida', 'Net receipts')) }], (v: Clauses18['base']) => ch(() => { k().base = v; k().pkg = 'custom'; })())),
      h('label', null, t(l('Prestação de contas', 'Statements')), select(c.stmt, [{ value: 'q', label: t(l('Trimestral', 'Quarterly')) }, { value: 's', label: t(l('Semestral', 'Semiannual')) }, { value: 'a', label: t(l('Anual', 'Annual')) }], (v: Clauses18['stmt']) => ch(() => { k().stmt = v; k().pkg = 'custom'; })()),
        select(String(c.lag), ['1', '2', '3', '4', '6'].map((v) => ({ value: v, label: t(l('{n} meses depois', '{n} months after'), { n: v }) })), (v: string) => ch(() => { k().lag = Number(v); k().pkg = 'custom'; })())),
      h('label', null, t(l('Lançamentos garantidos', 'Guaranteed releases')), select(String(c.minRel), ['0', '1', '2', '3'].map((v) => ({ value: v, label: v })), (v: string) => ch(() => { k().minRel = Number(v); k().pkg = 'custom'; })())),
      h('label', null, t(l('Verba mínima por lançamento', 'Promo floor per release')), select(String(c.promo), ['0', '5000', '10000', '20000'].map((v) => ({ value: v, label: v === '0' ? '—' : `US$ ${Number(v) / 1000}k` })), (v: string) => ch(() => { k().promo = Number(v); k().pkg = 'custom'; })())),
      h('p', { class: 'muted small' }, t(l('Engavetar um artista (2 anos sem lançar) derruba a confiança, vira manchete e pode acabar em pedido de liberação ou processo se houver lançamento garantido. Prestações atrasadas chamam auditoria.', 'Shelving an act (2 years without a release) drops trust, makes headlines and can end in a release demand or a lawsuit if releases were guaranteed. Late statements invite audits.'))),
      why,
    );
    drawWhy();
  };
  draw();
  return box;
}
