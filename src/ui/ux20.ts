// Rodada 20 (G6) — núcleo SEM DOM (testável) do cockpit em primeiro plano, do pós-turno "3 destaques + N outros",
// da ajuda mínima por área, do resumo acessível de gráficos, do vocabulário de estado e da oferta de contrato em
// camadas (resumo do que cada lado concede, diferença do preset, comparação com até 2 alternativas e revisão de caixa).
// A interface (ui/sys/ui20.ts, offer20.ts, review20.ts) só desenha o que sai daqui.

import { notes } from '../sim/attention';
import { commissionOf29, shareOf29, targetOf29 } from '../sim/terms29';
import { formatMoney } from '../core/money';
import { l, type L } from '../data/world';
import { getLang, t } from '../i18n/strings';
import { MASTER_NAME, SCOPE_NAME, defaultRights, splitPreview } from '../sim/rights';
import type { GameState, Notification, Offer, RightsTerms } from '../sim/types';
import { fmtL } from '../sim/util';
import { reservedAdvances20 } from '../sim/oblig20';
import type { Help18 } from './help18';
import { NAV17, CAREER_PAGE17, ORDER17 } from './nav17';

// ---------------------------------------------------------------- B23: destaques do pós-turno

/** Severidade de um aviso (maior = mais importante). */
export const SEV20: Record<Notification['kind'], number> = { bad: 3, event: 2, good: 1, info: 0 };
/**
 * Três destaques por severidade (empate: o mais recente) + o resto, na ordem original. Nada some:
 * top + rest == entrada (mesmos objetos).
 */
export function highlights20<T extends { kind: Notification['kind']; week: number }>(xs: T[], n = 3): { top: T[]; rest: T[] } {
  const idx = xs.map((x, i) => ({ x, i }));
  idx.sort((a, b) => (SEV20[b.x.kind] ?? 0) - (SEV20[a.x.kind] ?? 0) || b.x.week - a.x.week || b.i - a.i);
  const top = idx.slice(0, n).map((o) => o.x);
  const keep = new Set(top);
  return { top, rest: xs.filter((x) => !keep.has(x)) };
}
/** Texto do contador ("+N outros avisos"). */
export const moreLabel20 = (n: number): L => (n === 1 ? l('+1 outro aviso', '+1 other notice') : fmtL(l('+{n} outros avisos', '+{n} other notices'), { n }));

// ---------------------------------------------------------------- §4.4: cockpit em primeiro plano

export interface Change20 { text: L; kind: Notification['kind']; week: number }
/** Mudanças do último mês (avisos não agrupados), já em destaques + resto. */
export function changes20(s: GameState, weeks = 5): { top: Change20[]; rest: Change20[]; folded: number } {
  const xs = notes(s, { since: s.week - weeks + 1 });
  return { ...highlights20(xs.filter((n) => !n.fold)), folded: xs.filter((n) => n.fold).length };
}
export interface DecRow20 { id: string; title: L; left: number | null; def: L | null; why: L }
/** Decisões obrigatórias ordenadas pelo prazo (sem prazo vão ao fim, as mais antigas primeiro). */
export function decisions20(s: GameState): DecRow20[] {
  return s.decisions.map((d) => {
    const dl = Number(d.ctx?.dl18 ?? 0);
    const def = d.options.find((o) => o.id === d.defaultOption);
    return { id: d.id, title: d.title, left: dl ? Math.max(0, dl - s.week) : null, def: def ? def.label : null, why: d.text, w: d.week };
  }).sort((a, b) => (a.left ?? 999) - (b.left ?? 999) || a.w - b.w).map(({ w: _w, ...r }) => r);
}

// ---------------------------------------------------------------- §5: unidades e estados

/** Diferença entre duas frações (0–1) em pontos percentuais: "+2 p.p." (nunca "+2%"). */
export function pp20(a: number, b: number, digits = 1): string {
  const d = Math.round((b - a) * 100 * 10 ** digits) / 10 ** digits;
  return `${d > 0 ? '+' : d < 0 ? '−' : '±'}${Math.abs(d).toLocaleString('pt-BR', { maximumFractionDigits: digits })} p.p.`;
}
/** Variação relativa em %: "+12%". */
export function rel20(a: number, b: number): string {
  if (!a) return '—';
  const d = Math.round(((b - a) / Math.abs(a)) * 100);
  return `${d > 0 ? '+' : d < 0 ? '−' : '±'}${Math.abs(d)}%`;
}
export type Status20 = 'active' | 'planned' | 'pending' | 'blocked' | 'done' | 'expired';
/** Vocabulário único de estado: ícone + texto (nunca só cor). */
export const STATUS20: Record<Status20, { icon: string; name: L; cls: string }> = {
  active: { icon: '●', name: l('ativo', 'active'), cls: 'good' },
  planned: { icon: '◷', name: l('planejado', 'planned'), cls: '' },
  pending: { icon: '…', name: l('pendente', 'pending'), cls: 'warn' },
  blocked: { icon: '⛔', name: l('bloqueado', 'blocked'), cls: 'bad' },
  done: { icon: '✓', name: l('concluído', 'done'), cls: 'good' },
  expired: { icon: '⌛', name: l('expirado', 'expired'), cls: 'muted' },
};

// ---------------------------------------------------------------- B24: resumo textual de gráficos

/** Resumo para o nome acessível: "Nome: 12 pontos, de 3 a 9 (mín 2, máx 11)". */
export function chartSummary20(name: string, values: number[], fmt: (n: number) => string = (n) => String(Math.round(n)), en = false): string {
  const v = values.filter((x) => Number.isFinite(x));
  if (!v.length) return `${name}: ${en ? 'no data' : 'sem dados'}`;
  const lo = Math.min(...v), hi = Math.max(...v);
  const trend = v.length < 2 ? '' : v[v.length - 1] > v[0] ? (en ? ', rising' : ', em alta') : v[v.length - 1] < v[0] ? (en ? ', falling' : ', em queda') : (en ? ', flat' : ', estável');
  return en
    ? `${name}: ${v.length} points, from ${fmt(v[0])} to ${fmt(v[v.length - 1])} (min ${fmt(lo)}, max ${fmt(hi)})${trend}`
    : `${name}: ${v.length} pontos, de ${fmt(v[0])} a ${fmt(v[v.length - 1])} (mín ${fmt(lo)}, máx ${fmt(hi)})${trend}`;
}

/** Nome acessível + <title> num SVG de gráfico (chamado na hora de desenhar; não toca no DOM ao importar). */
export function nameSvg20<T extends Element>(svg: T, name: string, values: number[], fmt?: (n: number) => string): T {
  const sum = chartSummary20(name, values, fmt, getLang() === 'en');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', sum);
  const tt = svg.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'title');
  tt.textContent = sum;
  svg.insertBefore(tt, svg.firstChild);
  return svg;
}

// ---------------------------------------------------------------- B22: ajuda mínima por área

type P2 = [string, string];
const L2 = (x: P2): L => l(x[0], x[1]);
/** Objetivo, ações, custo/risco e dependências por seção do menu (NAV17). */
const SEC20: Record<string, [P2, P2, P2, P2]> = {
  today: [['Ver o que pede você agora: decisões com prazo, compromissos próximos, projetos e o que mudou.', 'See what needs you now: deadline decisions, upcoming commitments, projects and what changed.'], ['Responda decisões, abra o item pelo "›" e avance o tempo quando nada urgente restar.', 'Answer decisions, open items with "›" and advance time once nothing urgent remains.'], ['Decisão ignorada vale a opção padrão ao avançar.', 'An ignored decision takes the default option when you advance.'], ['Depende de todas as outras áreas: aqui só aparece o resumo delas.', 'Depends on every other area: this only shows their summary.']],
  base: [['Cuidar da sede, da equipe e da estrutura que sustenta a operação.', 'Look after the HQ, staff and the structure that keeps operations running.'], ['Contrate, amplie salas e compare investimento com custo mensal.', 'Hire, expand rooms and compare investment with monthly cost.'], ['Ampliar é investimento único; salário e aluguel são custo recorrente.', 'Expanding is a one-off investment; salary and rent are recurring costs.'], ['Capacidade limita estúdio, shows e quantos artistas você atende.', 'Capacity limits studio, shows and how many acts you can handle.']],
  money: [['Ler caixa, resultado e obrigações; decidir crédito e riscos.', 'Read cash, results and obligations; decide on credit and risks.'], ['Compare caixa com competência, veja contas a receber/pagar e dívidas.', 'Compare cash with accrual, see receivables/payables and debt.'], ['Empréstimo resolve caixa hoje e cobra juros depois.', 'A loan fixes cash today and charges interest later.'], ['Recebe de vendas, shows, direitos e contratos.', 'Fed by sales, shows, rights and contracts.']],
  course: [['Planejar prazos, direitos e fornecimento a longo prazo.', 'Plan deadlines, rights and supply for the long run.'], ['Veja o calendário único e resolva o que vence primeiro.', 'Check the single calendar and handle what is due first.'], ['Prazo perdido aplica a consequência descrita no item.', 'A missed deadline applies the consequence described on the item.'], ['Liga contratos, cadeia de suprimento e catálogo.', 'Links contracts, supply chain and catalogue.']],
  roster: [['Gerir os artistas que você já tem.', 'Manage the acts you already have.'], ['Escolha um artista, veja agenda, contrato, público e integrantes.', 'Pick an act, see agenda, contract, audience and members.'], ['Agenda cheia cansa; promessas quebradas custam confiança.', 'A full agenda tires people; broken promises cost trust.'], ['Contratos, projetos musicais e shows saem daqui.', 'Contracts, music projects and shows start here.']],
  find: [['Descobrir e contratar talentos.', 'Discover and sign talent.'], ['Faça scouting, leia a chance da oferta e proponha.', 'Scout, read the offer odds and propose.'], ['Adiantamento sai do caixa ao assinar e só volta pelo recoupment.', 'The advance leaves cash at signing and only returns through recoupment.'], ['Depende de reputação, caixa e capacidade da equipe.', 'Depends on reputation, cash and staff capacity.']],
  pros: [['Gerir profissionais de bastidor (empresários, produtores).', 'Manage behind-the-scenes pros (managers, producers).'], ['Contrate, compare custo e efeito no artista.', 'Hire and compare cost against effect on the act.'], ['Profissional caro sem projeto é custo parado.', 'An expensive pro without a project is idle cost.'], ['Afeta gravação, negociação e carreira dos artistas.', 'Affects recording, negotiation and act careers.']],
  make: [['Levar um disco da ideia à gravação.', 'Take a record from idea to recording.'], ['Defina intenção e compromissos, componha, grave e revise a fase atual.', 'Set intent and commitments, write, record and review the current phase.'], ['Estúdio e produtor custam por sessão; atraso custa momento.', 'Studio and producer cost per session; delay costs momentum.'], ['Usa a agenda do artista, o estúdio e o caixa.', 'Uses the act agenda, the studio and cash.']],
  release: [['Lançar, promover e reaproveitar o catálogo.', 'Release, promote and reuse the catalogue.'], ['Escolha data, formatos e verba; acompanhe paradas e reedições.', 'Pick date, formats and budget; follow charts and reissues.'], ['Prensagem e marketing saem do caixa antes da receita.', 'Pressing and marketing leave cash before revenue arrives.'], ['Depende do projeto gravado e dos direitos do contrato.', 'Depends on the recorded project and contract rights.']],
  live: [['Planejar e operar shows e turnês.', 'Plan and run shows and tours.'], ['Monte rota, datas e ingressos; revise a próxima data antes de acontecer.', 'Build route, dates and tickets; review the next date before it happens.'], ['Transporte, equipe e segurança custam mesmo com casa vazia.', 'Transport, crew and security cost even with an empty house.'], ['Usa a agenda e o público por região do artista.', 'Uses the act agenda and regional audience.']],
  press: [['Acompanhar imprensa, críticas e boatos.', 'Follow press, reviews and rumours.'], ['Responda à imprensa, leia críticas e use veículos a seu favor.', 'Answer the press, read reviews and use outlets in your favour.'], ['Escândalo derruba confiança e vendas.', 'A scandal knocks trust and sales.'], ['Liga lançamentos, artistas e reputação.', 'Links releases, acts and reputation.']],
  map: [['Ver onde está o público, o risco e a oportunidade no mapa.', 'See where audience, risk and opportunity are on the map.'], ['Escolha uma pergunta/camada e clique num lugar para detalhes.', 'Pick a question/layer and click a place for details.'], ['Leitura estimada: confira a data e a confiança da camada.', 'An estimated reading: check the layer\'s date and confidence.'], ['Alimenta turnês, territórios de contrato e lançamentos.', 'Feeds tours, contract territories and releases.']],
  market: [['Ler paradas, rivais e o mercado.', 'Read charts, rivals and the market.'], ['Compare formatos, países e selos rivais.', 'Compare formats, countries and rival labels.'], ['Rival forte disputa artistas e espaço nas paradas.', 'A strong rival competes for acts and chart space.'], ['Depende dos lançamentos de todos os selos.', 'Depends on every label\'s releases.']],
  culture: [['Acompanhar movimentos, lendas e histórias do mundo.', 'Follow movements, legends and world stories.'], ['Leia cenas e movimentos para antecipar gêneros.', 'Read scenes and movements to anticipate genres.'], ['Chegar cedo demais a um gênero também custa.', 'Arriving too early to a genre also costs.'], ['Influencia gosto, contratação e prêmios.', 'Shapes taste, signings and awards.']],
  events: [['Festivais, prêmios e hall da fama.', 'Festivals, awards and hall of fame.'], ['Inscreva artistas, acompanhe indicações e cerimônias.', 'Enter acts, follow nominations and ceremonies.'], ['Campanha custa; derrota não devolve a verba.', 'Campaigns cost; losing does not refund the budget.'], ['Depende de lançamentos e reputação.', 'Depends on releases and reputation.']],
  crime: [['Lado escuro da indústria: riscos e escolhas morais.', 'The industry\'s dark side: risks and moral choices.'], ['Leia cada proposta e o risco antes de aceitar.', 'Read each proposal and the risk before accepting.'], ['Ganho rápido com chance de processo e escândalo.', 'Quick gain with a chance of lawsuit and scandal.'], ['Liga finanças, imprensa e justiça.', 'Links finances, press and courts.']],
  life: [['Sua vida pessoal, patrimônio e saúde.', 'Your personal life, wealth and health.'], ['Equilibre tempo, relações e dinheiro pessoal.', 'Balance time, relationships and personal money.'], ['Excesso de trabalho cobra saúde e família.', 'Overwork costs health and family.'], ['Afeta energia e decisões no selo.', 'Affects energy and decisions at the label.']],
  careers: [['Escolher e equilibrar carreiras paralelas.', 'Choose and balance parallel careers.'], ['Ative carreiras e veja a carga de tempo de cada uma.', 'Activate careers and see each one\'s time load.'], ['Cada carreira consome tempo da semana.', 'Each career takes weekly time.'], ['Abre páginas próprias em "Suas carreiras".', 'Opens its own pages under "Your careers".']],
  cpages: [['Página exclusiva de uma carreira.', 'A career\'s own page.'], ['Use as abas da carreira para operar e ler resultados.', 'Use the career tabs to operate and read results.'], ['Custos próprios da carreira saem do mesmo caixa.', 'The career\'s own costs leave the same cash.'], ['Divide tempo e caixa com as outras carreiras.', 'Shares time and cash with other careers.']],
};
const GENERAL20: [P2, P2, P2, P2] = [['Uma área do jogo.', 'An area of the game.'], ['Use os botões principais da página; o "?" de cada aba explica mais.', 'Use the page\'s main buttons; each tab\'s "?" explains more.'], ['Toda ação que custa mostra o valor antes de confirmar.', 'Every action that costs shows the amount before confirming.'], ['Veja as páginas ligadas no glossário.', 'See related pages in the glossary.']];

/** Seção do menu (NAV17) onde mora a área; páginas de carreira ficam em 'cpages'. */
export function navSection20(area: string): { id: string; areas: string[]; label: L } | null {
  for (const g of NAV17) for (const sc of g.secs) if (sc.areas.includes(area)) return { id: sc.id, areas: sc.areas, label: sc.label };
  const c = ORDER17.find((id) => CAREER_PAGE17[id].area === area || CAREER_PAGE17[id].absorbs.includes(area));
  if (c) return { id: 'cpages', areas: [], label: CAREER_PAGE17[c].label };
  return null;
}
/** Ajuda mínima quando a área não tem ajuda própria: objetivo, ações, custo/risco e dependências (rotulada como resumo da seção). */
export function minimalHelp20(area: string, title?: L): Help18 & { general: true; section: L | null } {
  const sec = navSection20(area);
  const [what, how, cost, dep] = (sec && SEC20[sec.id]) || GENERAL20;
  return {
    general: true, section: sec?.label ?? null,
    title: title ?? sec?.label ?? l('Ajuda geral', 'General help'),
    what: L2(what), how: L2(how),
    tips: [fmtL(l('Custo e risco: {x}', 'Cost and risk: {x}'), { x: L2(cost) }), fmtL(l('Depende de: {x}', 'Depends on: {x}'), { x: L2(dep) })],
    links: (sec?.areas ?? []).filter((a) => a !== area).slice(0, 4),
  };
}

// ---------------------------------------------------------------- §4.5: oferta de contrato em camadas

export type Draft20 = Omit<Offer, 'id' | 'week' | 'status'> & { pk12?: { ar: string; tour: number; mkt: number } };
const $$ = (c: number) => formatMoney(c);
const pc = (x: number) => `${Math.round(x * 1000) / 10}%`;

/** Diferença entre a ficha de direitos aplicada e o padrão do modelo (o "resumo do preset"). */
export function rightsDiff20(base: RightsTerms, cur: RightsTerms): L[] {
  const out: L[] = [];
  if (base.master !== cur.master) out.push(fmtL(l('Master: {a} → {b}', 'Master: {a} → {b}'), { a: MASTER_NAME[base.master], b: MASTER_NAME[cur.master] }));
  if (base.pubShare !== cur.pubShare) out.push(fmtL(l('Edição do selo: {a} → {b}', 'Label publishing: {a} → {b}'), { a: pc(base.pubShare), b: pc(cur.pubShare) }));
  if (base.scope !== cur.scope) out.push(fmtL(l('Territórios: {a} → {b}', 'Territories: {a} → {b}'), { a: SCOPE_NAME[base.scope], b: SCOPE_NAME[cur.scope] }));
  if (base.options !== cur.options) out.push(fmtL(l('Opções de discos: {a} → {b}', 'Record options: {a} → {b}'), { a: base.options, b: cur.options }));
  if (base.reversionYears !== cur.reversionYears) out.push(fmtL(l('Reversão do master: {a} → {b} anos', 'Master reversion: {a} → {b} years'), { a: base.reversionYears, b: cur.reversionYears }));
  if (base.producerPts !== cur.producerPts || base.guestPts !== cur.guestPts) out.push(fmtL(l('Pontos (produtor+convidados): {a} → {b}', 'Points (producer+guests): {a} → {b}'), { a: pc(base.producerPts + base.guestPts), b: pc(cur.producerPts + cur.guestPts) }));
  for (const k of ['pointsFromLabel', 'exclusive', 'sync', 'reissue', 'remaster', 'license', 'reversionNeedsRecoup'] as const)
    if (base[k] !== cur[k]) out.push(fmtL(l('{k}: {a} → {b}', '{k}: {a} → {b}'), { k: KEY20[k], a: cur[k] ? l('não', 'no') : l('sim', 'yes'), b: cur[k] ? l('sim', 'yes') : l('não', 'no') }));
  return out;
}
const KEY20: Record<string, L> = {
  pointsFromLabel: l('Selo paga os pontos', 'Label pays points'), exclusive: l('Exclusividade', 'Exclusivity'), sync: l('Sync com o selo', 'Sync with label'),
  reissue: l('Reedição com o selo', 'Reissue with label'), remaster: l('Remaster com o selo', 'Remaster with label'), license: l('Licença com o selo', 'Licence with label'),
  reversionNeedsRecoup: l('Reversão só após recoupment', 'Reversion only once recouped'),
};

export interface Concede20 { side: 'label' | 'artist'; t: L }
/** O que cada lado concede nesta proposta (resumo do topo do formulário). */
export function concessions20(o: Draft20): Concede20[] {
  const r = o.rights ?? defaultRights(o.model, o.publishing);
  const out: Concede20[] = [];
  // R29 (contratos+): o que cada lado concede nos modelos novos
  if (o.model === 'management') {
    if (o.advance > 0) out.push({ side: 'label', t: fmtL(l('Luvas de {v}', 'Signing bonus of {v}'), { v: $$(o.advance) }) });
    out.push({ side: 'label', t: l('Gestão da carreira (turnês, negociar com o selo, crises)', 'Career management (tours, label negotiations, crises)') });
    out.push({ side: 'artist', t: fmtL(l('{p} de comissão sobre o que ganhar', '{p} commission on what they earn'), { p: pc(commissionOf29(o)) }) });
    out.push({ side: 'artist', t: fmtL(l('{n} meses de exclusividade de gestão', '{n} months of exclusive management'), { n: o.termMonths }) });
    return out;
  }
  if (o.model === 'jv') {
    if (o.advance > 0) out.push({ side: 'label', t: fmtL(l('Capital de {v} no selo da sociedade', '{v} of capital in the partnership label'), { v: $$(o.advance) }) });
    out.push({ side: 'label', t: fmtL(l('{p} do selo ao artista (lucro dividido todo ano)', '{p} of the label to the act (profit split every year)'), { p: pc(shareOf29(o)) }) });
    out.push({ side: 'artist', t: fmtL(l('Meta de {n} lançamento(s) em {m} meses', 'Target of {n} release(s) in {m} months'), { n: targetOf29(o), m: o.termMonths }) });
  } else {
    if (o.advance > 0) out.push({ side: 'label', t: fmtL(l('Adiantamento de {v} (recuperável pelas vendas)', 'Advance of {v} (recoupable from sales)'), { v: $$(o.advance) }) });
    out.push({ side: 'label', t: o.model === 'production' ? fmtL(l('{r} de tudo o que a produtora receber, ao artista', '{r} of everything the company receives, to the act'), { r: pc(o.royalty) }) : fmtL(l('Royalty de {r} ao artista', '{r} royalty to the artist'), { r: pc(o.royalty) }) });
  }
  if (o.creativeControl) out.push({ side: 'label', t: l('Controle criativo ao artista', 'Creative control to the artist') });
  if (o.pk12?.tour) out.push({ side: 'label', t: fmtL(l('Apoio de turnê prometido: {v} (12 parcelas)', 'Pledged tour support: {v} (12 instalments)'), { v: $$(o.pk12.tour) }) });
  if (o.pk12?.mkt) out.push({ side: 'label', t: fmtL(l('Verba de marketing prometida: {v} (12 parcelas)', 'Pledged marketing: {v} (12 instalments)'), { v: $$(o.pk12.mkt) }) });
  for (const p of o.promises) out.push({ side: 'label', t: fmtL(l('Promessa: {p}', 'Promise: {p}'), { p: PROMISE20[p] ?? l(p, p) }) });
  out.push({ side: 'artist', t: fmtL(l('Master: {m}', 'Master: {m}'), { m: MASTER_NAME[r.master] }) });
  out.push({ side: 'artist', t: fmtL(l('{n} meses e {d} disco(s) devido(s)', '{n} months and {d} record(s) owed'), { n: o.termMonths, d: o.releasesOwed }) });
  if (r.pubShare) out.push({ side: 'artist', t: fmtL(l('{p} da edição ao selo', '{p} of publishing to the label'), { p: pc(r.pubShare) }) });
  if (o.model === '360' && o.share360) out.push({ side: 'artist', t: fmtL(l('{p} de shows/merch (360)', '{p} of shows/merch (360)'), { p: pc(o.share360) }) });
  if (r.options) out.push({ side: 'artist', t: fmtL(l('{n} opção(ões) de discos futuros', '{n} option(s) on future records'), { n: r.options }) });
  if (r.exclusive) out.push({ side: 'artist', t: l('Exclusividade', 'Exclusivity') });
  if (!r.reversionYears && r.master !== 'artist') out.push({ side: 'artist', t: l('Master perpétuo com o selo', 'Master kept by the label forever') });
  return out;
}
const PROMISE20: Record<string, L> = { priority: l('prioridade de lançamento', 'release priority'), tour: l('turnê', 'tour'), freedom: l('liberdade criativa', 'creative freedom') };

/** Linhas da comparação entre a proposta atual e até 2 alternativas (hipótese de receita, não previsão). */
export interface CmpRow20 { k: L; v: string[] }
export function compareOffers20(xs: Draft20[], distFee: number, gross = 10_000_000): CmpRow20[] {
  const sp = xs.map((o) => splitPreview({ model: o.model, royalty: o.royalty, distributionFee: o.distributionFee, publishing: o.publishing, rights: o.rights }, o.distributionFee ?? distFee));
  const base = xs[0];
  return [
    { k: l('Adiantamento', 'Advance'), v: xs.map((o) => $$(o.advance) + (o === base ? '' : ` (${rel20(base.advance, o.advance)})`)) },
    { k: l('Royalty do artista', 'Artist royalty'), v: xs.map((o) => pc(o.royalty) + (o === base ? '' : ` (${pp20(base.royalty, o.royalty)})`)) },
    { k: l('Master', 'Master'), v: xs.map((o) => t(MASTER_NAME[(o.rights ?? defaultRights(o.model, o.publishing)).master])) },
    { k: l('Prazo', 'Term'), v: xs.map((o) => `${o.termMonths}m · ${o.releasesOwed}×`) },
    { k: l('Fatia do selo na receita bruta', 'Label share of gross'), v: sp.map((x, i) => pc(x.label) + (i ? ` (${pp20(sp[0].label, x.label)})` : '')) },
    { k: fmtL(l('Hipótese: a cada {g} brutos, selo/artista', 'Hypothesis: per {g} gross, label/artist'), { g: $$(gross) }), v: sp.map((x) => `${$$(Math.round(gross * x.label))} / ${$$(Math.round(gross * x.artist))}`) },
  ];
}

export interface Review20 { cash: number; reserved: number; free: number; after: number; ok: boolean; debts: L[]; promises: L[]; reqs: L[] }
/** Revisão antes de enviar: caixa livre × reservado, termos que geram dívida/obrigação e requisitos. */
export function review20(s: GameState, o: Draft20): Review20 {
  const reserved = reservedAdvances20(s); // r20: mesma reserva do motor (B4)
  const cash = s.player.cash, free = cash - reserved, after = free - o.advance;
  const debts: L[] = [];
  if (o.advance > 0) debts.push(fmtL(l('Sai {v} do caixa ao assinar; volta só pelo recoupment das vendas.', '{v} leaves cash at signing; it only returns via sales recoupment.'), { v: $$(o.advance) }));
  const pk = (o.pk12?.tour ?? 0) + (o.pk12?.mkt ?? 0);
  if (pk) debts.push(fmtL(l('Verbas prometidas: {v} em 12 parcelas mensais (parcela sem caixa = promessa quebrada).', 'Pledged budgets: {v} over 12 monthly instalments (a missed one = broken promise).'), { v: $$(pk) }));
  if (o.releasesOwed > 0) debts.push(fmtL(l('Obrigação de entregar {n} disco(s) em {m} meses.', 'Obligation to deliver {n} record(s) in {m} months.'), { n: o.releasesOwed, m: o.termMonths }));
  const promises = o.promises.map((p) => PROMISE20[p] ?? l(p, p));
  const reqs: L[] = [];
  if (after < 0) reqs.push(fmtL(l('Caixa livre insuficiente: faltam {v}.', 'Not enough free cash: {v} short.'), { v: $$(-after) }));
  if (s.offers.some((x) => x.actId === o.actId && (x.status === 'pending' || x.status === 'counter'))) reqs.push(l('Já existe uma oferta em aberto para este artista.', 'There is already an open offer for this act.'));
  return { cash, reserved, free, after, ok: cash >= o.advance && after >= 0, debts, promises, reqs };
}
