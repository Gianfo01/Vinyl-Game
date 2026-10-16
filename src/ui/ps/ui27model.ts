// Rodada 27 (J) — sistema visual compartilhado: a parte SEM DOM (testável).
// Tons de estado, contraste WCAG, propósito de cada página (subtítulo do cabeçalho) e os números-chave (KPIs)
// que abrem as páginas mais usadas. Só lê o estado do jogo: nenhuma regra muda, nenhum sorteio.
// A parte com DOM fica em ui27.ts; o guia em docs/ui27.md.

import { tourList } from '../../sim/tours';
import { l, type L } from '../../data/world';
import { formatMoney, formatNumber } from '../../core/money';
import type { GameState } from '../../sim/types';

/** Tons semânticos — os mesmos em chips, KPIs, bordas de cartão e estados vazios. */
export type Tone27 = 'good' | 'bad' | 'warn' | 'info' | 'accent' | 'neutral';
export const TONES27: Tone27[] = ['good', 'bad', 'warn', 'info', 'accent', 'neutral'];

/** Tom de um valor por faixas: `good`/`bad` são os limites; `low` = quanto menor melhor (fadiga, dívida). */
export function toneOf27(v: number, lim: { good: number; bad: number; low?: boolean }): Tone27 {
  if (!Number.isFinite(v)) return 'neutral';
  if (lim.low) return v <= lim.good ? 'good' : v >= lim.bad ? 'bad' : 'warn';
  return v >= lim.good ? 'good' : v <= lim.bad ? 'bad' : 'warn';
}
/** Tom de uma variação (sinal): positivo bom, negativo ruim, zero neutro (`invert` para custos). */
export const deltaTone27 = (d: number, invert = false): Tone27 => (!d || !Number.isFinite(d) ? 'neutral' : (d > 0) !== invert ? 'good' : 'bad');

// ---------------------------------------------------------------- contraste (WCAG 2.x)
export function hexRgb27(hex: string): [number, number, number] {
  let x = hex.trim().replace('#', '');
  if (x.length === 3) x = x.split('').map((c) => c + c).join('');
  const n = parseInt(x.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const lin = (c: number): number => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
export const luminance27 = ([r, g, b]: [number, number, number]): number => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
/** Razão de contraste entre duas cores #hex (1..21). */
export function contrast27(a: string, b: string): number {
  const la = luminance27(hexRgb27(a)), lb = luminance27(hexRgb27(b));
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
/** Mistura `a` sobre `b` (p = 0..1 de `a`), como color-mix(in srgb, a p%, b). */
export function mix27(a: string, b: string, p: number): string {
  const x = hexRgb27(a), y = hexRgb27(b);
  return '#' + x.map((v, i) => Math.round(v * p + y[i] * (1 - p)).toString(16).padStart(2, '0')).join('');
}

// ---------------------------------------------------------------- propósito de cada página (subtítulo)
/** Uma linha sob o título: para que serve a página. Páginas da jornada do disco usam PURPOSE23 (journey23). */
export const PURPOSE27: Record<string, L> = {
  songmkt27: l('Comprar, ganhar, vender e licenciar canções — a gravação segue pela agenda e pelo estúdio.', 'Buy, receive, sell and license songs — recording goes through the schedule and the studio.'),
  cockpit: l('O mês num relance: o que pede decisão, o dinheiro e o próximo passo de cada artista.', 'The month at a glance: what needs a decision, the money and each act\'s next step.'),
  hq: l('Sua sede: salas, equipe e o que acontece hoje no prédio.', 'Your HQ: rooms, staff and what is happening in the building today.'),
  plan: l('Central de planos: metas do mês e o que fazer primeiro.', 'Planning hub: this month\'s goals and what to do first.'),
  goals: l('Metas da run e o quanto falta para cada uma.', 'Run goals and how far each one is.'),
  diary: l('Tudo o que aconteceu nesta run, em ordem.', 'Everything that happened in this run, in order.'),
  artists: l('Seu elenco: estado, agenda, carreira e público de cada artista.', 'Your roster: each act\'s state, schedule, career and audience.'),
  people: l('As pessoas por trás das bandas: músicos, relações e talentos.', 'The people behind the bands: musicians, relations and talent.'),
  dyn18: l('Clima dentro das bandas: brigas, alianças e quem pode sair.', 'Band chemistry: fights, alliances and who might leave.'),
  contracts19: l('Contratos em jogo: cláusulas, empresários e masters.', 'Contracts in play: clauses, managers and masters.'),
  // market (Talentos): a própria tela já abre com o fluxo "Procurar → Funil → Decidir"; sem subtítulo repetido
  knownacts27: l('Quem a sua empresa conhece e por quê: elenco, estrelas, cena local, radar, contatos, paradas, rivais e imprensa.', 'Who your company knows and why: roster, stars, local scene, radar, contacts, charts, rivals and press.'),
  directory: l('Todos os artistas do mundo, com filtros e ficha completa.', 'Every act in the world, with filters and full sheet.'),
  talent18: l('Formação de talentos: escolas, oficinas e quem está surgindo.', 'Talent development: schools, workshops and who is rising.'),
  management: l('Gestão das carreiras: agenda, imagem e conflitos do elenco.', 'Career management: roster schedule, image and conflicts.'),
  managers14: l('Empresários do mercado e com quem seus artistas trabalham.', 'Managers in the market and who your acts work with.'),
  producers15: l('Produtores disponíveis, agenda e estilo de cada um.', 'Available producers, their schedule and style.'),
  catalog: l('Tudo o que você lançou: vendas, sync e reedições.', 'Everything you released: sales, sync and reissues.'),
  shows: l('Shows e turnês: planejar paradas, vender ingressos e merch.', 'Shows and tours: plan stops, sell tickets and merch.'),
  cal17: l('Agenda de shows do elenco, mês a mês.', 'Your roster\'s show calendar, month by month.'),
  festivals: l('Festivais: escalações, convites e seus próprios eventos.', 'Festivals: line-ups, invitations and your own events.'),
  awards: l('Premiações do ano, indicações e histórico.', 'This year\'s awards, nominations and history.'),
  business: l('Estratégia da empresa: grupo, era, catálogo, jurídico e direitos.', 'Company strategy: group, era, catalog, legal and rights.'),
  finance: l('Dinheiro: caixa, resultado do mês, dívidas e de onde vem cada centavo.', 'Money: cash, monthly result, debt and where every cent comes from.'),
  company: l('Empresa: equipe, sede, legado e um resumo financeiro.', 'Company: staff, HQ, legacy and a financial summary.'),
  team: l('Equipe e ritmo de trabalho: quem faz o quê e quanto custa.', 'Team and pace: who does what and what it costs.'),
  agenda17: l('Sua agenda e contratações: equipe, freelancers e músicos de estúdio.', 'Your schedule and hiring: staff, freelancers and session players.'),
  rights18: l('Direitos: masters, edição e quem recebe o quê.', 'Rights: masters, publishing and who gets paid what.'),
  careers: l('Suas carreiras simultâneas e como elas se cruzam.', 'Your simultaneous careers and how they cross.'),
  you: l('Você: saúde, dinheiro pessoal, reputação e vida fora do trabalho.', 'You: health, personal money, reputation and life outside work.'),
};

// ---------------------------------------------------------------- números-chave (KPIs) do cabeçalho
export interface Kpi27 { label: L; value: string; tone?: Tone27; hint?: L; go?: string }

const money = (c: number, loc: string): string => formatMoney(c, loc);
const num = (n: number, loc: string): string => formatNumber(n, loc);
const mine = (s: GameState): string[] => Object.keys(s.acts).filter((id) => s.acts[id].owner === 'player' && !s.acts[id].deceased);
const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);
const lastMonth = (s: GameState): number => sum(Object.values(s.lastMonthLedger ?? {}).filter((x) => Number.isFinite(x)));

const KP: Record<string, (s: GameState, loc: string) => Kpi27[]> = {
  money: (s, loc) => {
    const res = lastMonth(s), debt = sum((s.player.loans ?? []).map((x) => x.balance ?? 0));
    const rev = s.player.revenueByYear?.[s.year] ?? 0;
    return [
      { label: l('Caixa', 'Cash'), value: money(s.player.cash, loc), tone: s.player.cash < 0 ? 'bad' : 'neutral', go: 'finance' },
      { label: l('Resultado do mês passado', 'Last month\'s result'), value: money(res, loc), tone: deltaTone27(res) },
      { label: l('Receita no ano', 'Revenue this year'), value: money(rev, loc) },
      { label: l('Dívidas', 'Debt'), value: money(debt, loc), tone: debt > Math.max(0, s.player.cash) ? 'warn' : 'neutral' },
    ];
  },
  roster: (s, loc) => {
    const ids = mine(s), acts = ids.map((id) => s.acts[id]);
    const fans = sum(acts.map((a) => (a.fans?.casual ?? 0) + (a.fans?.active ?? 0) + (a.fans?.core ?? 0)));
    const fame = acts.length ? Math.round(sum(acts.map((a) => a.fame)) / acts.length) : 0;
    const paused = acts.filter((a) => a.status === 'hiatus').length;
    return [
      { label: l('Elenco', 'Roster'), value: num(ids.length, loc), tone: ids.length ? 'neutral' : 'warn' },
      { label: l('Fãs somados', 'Total fans'), value: num(fans, loc) },
      { label: l('Alcance médio', 'Average reach'), value: String(fame), tone: toneOf27(fame, { good: 50, bad: 8 }) },
      { label: l('Hits (top 10)', 'Hits (top 10)'), value: num(sum(acts.map((a) => a.hits ?? 0)), loc) },
      ...(paused ? [{ label: l('Em pausa', 'On hiatus'), value: String(paused), tone: 'warn' as Tone27 }] : []),
    ];
  },
  music: (s, loc) => {
    const rel = Object.values(s.releases).filter((r) => r.owner === 'player');
    const year = rel.filter((r) => r.year === s.year).length;
    const charting = rel.filter((r) => r.lastPos > 0 && s.week - r.week < 52).length;
    const ses = (s.sessions ?? []).filter((x) => !x.done).length;
    const queued = (s.pendingReleases ?? []).length;
    return [
      { label: l('Gravações em curso', 'Sessions running'), value: String(ses), go: 'studio' },
      { label: l('Lançamentos na fila', 'Releases queued'), value: String(queued), go: 'releases' },
      { label: l('Lançados no ano', 'Released this year'), value: String(year) },
      { label: l('Nas paradas', 'Charting'), value: String(charting), tone: charting ? 'good' : 'neutral' },
      { label: l('Receita do catálogo', 'Catalog revenue'), value: money(sum(rel.map((r) => r.revenue ?? 0)), loc), go: 'catalog' },
    ];
  },
  live: (s, loc) => {
    const ids = new Set(mine(s));
    const tours = tourList(s).filter((x) => ids.has(x.actId));
    const run = tours.filter((x) => x.status === 'running').length, plan = tours.filter((x) => x.status === 'planned').length;
    const next = tours.flatMap((x) => x.stops ?? []).filter((x) => x.status === 'scheduled').length;
    const net = sum(tours.filter((x) => x.status === 'done' || x.status === 'running').map((x) => (x.revenue ?? 0) - (x.costs ?? 0)));
    return [
      { label: l('Turnês na estrada', 'Tours on the road'), value: String(run), tone: run ? 'good' : 'neutral' },
      { label: l('Turnês planejadas', 'Tours planned'), value: String(plan) },
      { label: l('Datas marcadas', 'Dates booked'), value: num(next, loc) },
      { label: l('Saldo das turnês', 'Tour balance'), value: money(net, loc), tone: deltaTone27(net) },
    ];
  },
  staff: (s, loc) => {
    const st = s.player.staff ?? [];
    const pay = sum(st.map((x) => x.salary ?? 0));
    const skill = st.length ? Math.round(sum(st.map((x) => x.skill ?? 0)) / st.length) : 0;
    return [
      { label: l('Equipe', 'Staff'), value: String(st.length) },
      { label: l('Folha mensal', 'Monthly payroll'), value: money(pay, loc) },
      { label: l('Habilidade média', 'Average skill'), value: String(skill), tone: toneOf27(skill, { good: 65, bad: 35 }) },
      { label: l('Caixa', 'Cash'), value: money(s.player.cash, loc), tone: s.player.cash < 0 ? 'bad' : 'neutral', go: 'finance' },
    ];
  },
  desk: (s, loc) => {
    const res = lastMonth(s), dec = (s.decisions ?? []).length;
    return [
      { label: l('Caixa', 'Cash'), value: money(s.player.cash, loc), tone: s.player.cash < 0 ? 'bad' : 'neutral', go: 'finance' },
      { label: l('Resultado do mês passado', 'Last month\'s result'), value: money(res, loc), tone: deltaTone27(res), go: 'finance' },
      { label: l('Decisões pendentes', 'Pending decisions'), value: String(dec), tone: dec ? 'accent' : 'good' },
      { label: l('Elenco', 'Roster'), value: String(mine(s).length), go: 'artists' },
    ];
  },
  talent: (s, loc) => {
    const free = Object.values(s.acts).filter((a) => !a.owner && a.status === 'active').length;
    return [
      { label: l('Artistas sem contrato', 'Unsigned acts'), value: num(free, loc) },
      { label: l('Olheiros', 'Scouts'), value: String((s.scouts ?? []).length) },
      { label: l('Propostas abertas', 'Open offers'), value: String((s.offers ?? []).length), tone: (s.offers ?? []).length ? 'accent' : 'neutral' },
      { label: l('Leilões', 'Auctions'), value: String((s.auctions ?? []).length) },
    ];
  },
};
/** Qual conjunto de KPIs abre cada página (Mundo fica de fora: as telas de lá têm os próprios números). */
export const KPI_OF27: Record<string, keyof typeof KP> = {
  artists: 'roster', people: 'roster', management: 'roster', dyn18: 'roster',
  cockpit: 'desk',
  market: 'talent', directory: 'talent',
  project: 'music', creation: 'music', studio: 'music', releases: 'music', catalog: 'music',
  shows: 'live', cal17: 'live', tour12: 'live',
  business: 'money', company: 'money', // Finanças abre com os próprios números (Posição: quatro conceitos)
  team: 'staff', agenda17: 'staff',
};
/** KPIs da página (lista vazia = página sem faixa de números). Nunca lança: estado parcial vira lista vazia. */
export function kpis27(area: string, s: GameState, loc = 'pt-BR'): Kpi27[] {
  const k = KPI_OF27[area];
  if (!k) return [];
  try { return KP[k](s, loc); } catch { return []; }
}
