// Rodada 13 — DESPESAS ESCALAM com o tamanho da operação e a época. Selo pequeno quase não paga nada;
// conforme cresce (elenco, lançamentos/ano, países, equipe, faturamento) entram burocracia, jurídico,
// contabilidade, benefícios e equipes de época (TV/clipes, dados/playlists). Faixas: indie → pequeno → médio → major.
// Também há uma promoção mínima por lançamento (rádio/TV/playlists) que depende da época e do tamanho do mercado-alvo.
// Integra com o que existe: salários (economy.ts), aluguel/filiais (branches), departamentos (hq6) e o marketing que o jogador escolhe.

import { clamp } from '../../core/rng';
import { toReal } from '../../core/money';
import { MARKETS, l, type L } from '../../data/world';
import { registerExt4, registerSimHook } from '../ext4';
import { labelFunded } from '../production';
import type { GameState, Release } from '../types';
import { money, post } from '../util';
import { allReleases17 } from '../relidx17';

export interface OhLine { id: string; label: L; amount: number; why: L }
export interface Oh13 { ema: number; last: { w: number; lines: OhLine[]; capped: boolean; rate: number } | null; promo: number; promoN: number }
declare module '../ext4' { interface Ext4 { oh13: Oh13 } }
const empty = (): Oh13 => ({ ema: 0, last: null, promo: 0, promoN: 0 });
registerExt4('oh13', empty);
export function oh(s: GameState): Oh13 {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const o = (x.oh13 ??= empty()) as Oh13;
  o.ema ??= 0; o.promo ??= 0; o.promoN ??= 0;
  return o;
}

const NOT_INCOME = new Set(['financing', 'loans', 'asset_sales', 'owner_draw', 'dividends', 'acquisitions', 'advances']);
/** Receita bruta do mês (centavos): só entradas operacionais. */
export function grossMonth(s: GameState): number {
  let t = 0;
  for (const [k, v] of Object.entries(s.monthLedger)) if (v > 0 && !NOT_INCOME.has(k)) t += v;
  return t;
}
/** Receita anual em dólares reais de 2020 (média móvel), base das faixas. */
export function realAnnual(s: GameState): number { return toReal(oh(s).ema * 12, s.year); }

export interface Tier { id: string; name: L; mult: number }
export function tierOf(R: number): Tier {
  if (R < 0.6e6) return { id: 'indie', name: l('Indie', 'Indie'), mult: 0.5 };
  if (R < 3e6) return { id: 'small', name: l('Selo pequeno', 'Small label'), mult: 1 };
  if (R < 15e6) return { id: 'mid', name: l('Selo médio', 'Mid-size label'), mult: 2.5 };
  return { id: 'major', name: l('Major', 'Major'), mult: 6 };
}
/** Carência: quem fatura quase nada não paga estrutura (rampa suave de 120 mil a 600 mil reais/ano). */
const grace = (R: number) => clamp((R - 120e3) / 480e3, 0, 1);
/** Teto de despesas gerais como fatia da receita: 4% (indie) a 25% (major). */
export const capRate = (R: number, y = 2000) => 0.05 + (0.2 + (y >= 2008 ? 0.08 : 0)) * clamp((R - 0.6e6) / 4e6, 0, 1);

/** Intensidade regulatória/administrativa por época. */
const eraBur = (y: number) => (y < 1980 ? 0.6 : y < 2000 ? 1 : 1.25);
export function eraName(y: number): L {
  return y < 1981 ? l('rádio e imprensa', 'radio and press') : y < 2000 ? l('era TV/MTV', 'TV/MTV era') : y < 2008 ? l('era internet', 'internet era') : l('era streaming', 'streaming era');
}
const promoEra = (y: number) => (y < 1981 ? 1 : y < 2000 ? 1.6 : y < 2008 ? 1.3 : 2);

const pRel = (s: GameState) => allReleases17(s).filter((r) => r.owner === 'player');

/** Linhas de despesa mensal (centavos nominais, positivas) com o porquê. Puro: não mexe no estado. */
export function overheadPlan(s: GameState, R = realAnnual(s)): { lines: OhLine[]; tier: Tier; cap: number; raw: number; total: number } {
  const tier = tierOf(R);
  const g = grace(R);
  const lines: OhLine[] = [];
  const add = (id: string, pt: string, en: string, real: number, whyPt: string, whyEn: string) => {
    const amount = Math.round(money(s, real * g));
    if (amount > 0) lines.push({ id, label: l(pt, en), amount, why: l(whyPt, whyEn) });
  };
  const acts = Object.values(s.acts).filter((a) => a.owner === 'player' && !a.playerBand).length;
  const rels = pRel(s);
  const rel12 = rels.filter((r) => r.week > s.week - 52).length;
  const mk = Math.max(1, s.player.territories.length);
  const br = (s.branches ?? []).length;
  const staff = s.player.staff.length;
  const sal = toReal(s.player.staff.reduce((t, x) => t + x.salary, 0), s.year); // dólares reais/mês
  const admins = s.player.staff.filter((x) => x.role === 'admin').length;
  const eb = eraBur(s.year);

  add('roster', 'Gestão do elenco', 'Roster management', Math.max(0, acts - 3) ** 1.15 * 600,
    `${acts} artistas no casting: agenda, adiantamentos, contabilidade de royalties e atendimento (3 primeiros incluídos).`,
    `${acts} acts on the roster: schedules, advances, royalty accounting and care (first 3 included).`);
  add('releases', 'Operação de lançamentos', 'Release operations', Math.max(0, rel12 - 4) * 220 + Math.max(0, rels.length - 25) * 6,
    `${rel12} lançamentos em 12 meses e ${rels.length} no catálogo: logística, metadados, distribuição, direitos.`,
    `${rel12} releases in 12 months and ${rels.length} in the catalog: logistics, metadata, distribution, rights.`);
  add('offices', 'Escritórios e países', 'Offices and countries', Math.max(0, mk - 1) * 700 + br * 900,
    `${mk} mercado(s) e ${br} filial(is): representantes locais, impostos e câmbio em cada país.`,
    `${mk} market(s) and ${br} branch(es): local reps, taxes and FX in every country.`);
  const pct = staff <= 2 ? 0 : Math.min(0.25, 0.08 + 0.015 * staff);
  add('benefits', 'Encargos e RH da equipe', 'Staff payroll costs and HR', sal * pct,
    `${staff} funcionário(s): encargos, benefícios, folha e recrutamento (${Math.round(pct * 100)}% dos salários).`,
    `${staff} employee(s): payroll taxes, benefits and recruiting (${Math.round(pct * 100)}% of salaries).`);
  // faixas progressivas (como imposto): burocracia/compliance sobre a receita anual
  const brk = Math.max(0, Math.min(R, 3e6) - 0.5e6) * 0.07 + Math.max(0, Math.min(R, 15e6) - 3e6) * 0.19 + Math.max(0, R - 15e6) * 0.25;
  const slack = 1 - Math.min(5, admins) * 0.04;
  add('compliance', 'Burocracia e compliance', 'Bureaucracy and compliance', (brk / 12) * eb * slack,
    `Faixa ${tier.name.pt}: licenças, relatórios, auditorias de direitos${admins ? `; ${admins} administrador(es) aliviam ${Math.round((1 - slack) * 100)}%` : '; contratar administradores alivia'}.`,
    `${tier.name.en} band: licences, reports, rights audits${admins ? `; ${admins} admin(s) cut ${Math.round((1 - slack) * 100)}%` : '; hiring admins eases it'}.`);
  const legalFixed = R >= 20e6 ? 25000 : R >= 5e6 ? 8000 : R >= 1e6 ? 1500 : 0;
  add('legal', 'Jurídico', 'Legal', (legalFixed + (Math.max(0, R - 5e6) * 0.025) / 12) * eb,
    'Contratos, disputas, marcas e processos crescem com o porte (escritório externo a partir de 1 mi/ano).',
    'Contracts, disputes, trademarks and lawsuits grow with size (outside counsel from 1M/yr).');
  const accFixed = R >= 20e6 ? 14000 : R >= 5e6 ? 4000 : R >= 1e6 ? 700 : 0;
  add('accounting', 'Contabilidade e auditoria', 'Accounting and audit', accFixed,
    'Contador, balanço, auditoria externa e planejamento tributário por faixa.', 'Accountant, statements, external audit and tax planning by band.');
  const tm = R >= 0.5e6 ? tier.mult : 0;
  // rodada 16: no streaming a disputa por playlists e anúncios pagos come uma fatia da receita (antes era fixa e o fim de jogo tardio ficava fácil demais)
  if (s.year >= 2008) add('era', 'Equipe de dados e playlists', 'Data and playlist team', 3000 * tm + (Math.max(0, R - 0.6e6) * 0.06) / 12,
    'Era streaming: analistas de dados, relações com curadores, anúncios pagos e redes sociais (cresce com a receita).', 'Streaming era: data analysts, curator relations, paid ads and social media (grows with revenue).');
  else if (s.year >= 1981) add('era', 'Departamento de clipes e TV', 'Video and TV department', rel12 > 0 ? 1400 * tm : 0,
    'Era TV/MTV: produção de vídeos, imprensa de TV e programas.', 'TV/MTV era: video production, TV press and shows.');
  const raw = lines.reduce((t, x) => t + x.amount, 0);
  const cap = Math.round(oh(s).ema * capRate(R, s.year));
  return { lines, tier, cap, raw, total: Math.min(raw, cap) };
}

/** Promoção mínima de um lançamento: depende da época, do tipo e do tamanho do mercado-alvo (centavos). */
export function launchPromo(s: GameState, rel: Pick<Release, 'type' | 'territories'>, R = realAnnual(s)): { amount: number; why: L } {
  const reach = rel.territories.reduce((t, id) => t + (MARKETS.find((m) => m.id === id)?.size(s.year) ?? 0), 0);
  const reachM = 0.6 + 0.4 * Math.min(3, reach);
  const tm = 1 + Math.min(7, R / 2e6);
  const type = rel.type === 'single' ? 1 : rel.type === 'ep' ? 1.6 : 2.6;
  const real = 1600 * type * promoEra(s.year) * reachM * tm * grace(R);
  return {
    amount: Math.round(money(s, real)),
    why: l(`Promoção mínima (${eraName(s.year).pt}): ${rel.type.toUpperCase()} em mercado de alcance ${reach.toFixed(1)}.`, `Baseline promo (${eraName(s.year).en}): ${rel.type.toUpperCase()} in a market reach of ${reach.toFixed(1)}.`),
  };
}

registerSimHook('launch', 'promo13', (s, _r, a) => {
  const rel = a.release;
  if (!rel || rel.owner !== 'player' || labelFunded(s, rel.actId)) return;
  const p = launchPromo(s, rel);
  if (p.amount <= 0) return;
  post(s, `promo13:${rel.id}`, -p.amount, 'promo', `Promoção mínima: ${rel.title}`);
  const o = oh(s); o.promo += p.amount; o.promoN += 1;
});

registerSimHook('month', 'overhead13', (s) => {
  const o = oh(s);
  const g = grossMonth(s);
  o.ema = o.ema === 0 ? g : o.ema * 0.85 + g * 0.15;
  const R = realAnnual(s);
  const p = overheadPlan(s, R);
  const k = p.raw > 0 ? p.total / p.raw : 1;
  let capped = false;
  const lines = p.lines.map((x) => ({ ...x, amount: Math.round(x.amount * k) }));
  if (k < 1) capped = true;
  for (const x of lines) post(s, `oh13:${x.id}`, -x.amount, 'overhead', x.label.pt);
  o.last = { w: s.week, lines, capped, rate: g > 0 ? lines.reduce((t, x) => t + x.amount, 0) / g : 0 };
});
