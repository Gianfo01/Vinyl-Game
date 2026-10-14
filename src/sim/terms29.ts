// R29 (contratos+) — termos PUROS dos três modelos que estavam "para fase posterior": empresariamento (management),
// produção (production deal) e joint venture (jv). Sem estado e sem import de contracts.ts (evita ciclo): contracts.ts,
// nego27, offers12, rights e as telas leem daqui; o sistema que faz o dinheiro andar é sys/contracts29.ts.
//
//  • Empresariamento: o ato FICA no selo dele (ou sem selo); você vira o empresário dele por uma comissão (10–25%)
//    sobre o que ele ganha, pela máquina de comissão da carreira de empresário (ventures9 mg.clients). O contrato
//    fica guardado em s.contracts (party 'player', model 'management'), mas NÃO é o act.contractId.
//  • Produção: a sua produtora assina o ato (act.owner = 'player') e é dona dos masters; você entrega os masters a um
//    selo (o seu — lançamento normal — ou um rival: licença com adiantamento por master + pontos, ou venda).
//  • Joint venture: um subselo (sublabels.ts) co-propriedade sua e do artista, com meta de lançamentos no prazo,
//    divisão anual do lucro pela participação e cláusulas de compra/saída.
// Campos novos são todos opcionais (saves antigos seguem iguais).

import { l, type L } from '../data/world';
import type { ContractModel } from '../data/rules';
import type { Contract, GameState, Offer } from './types';

/** Termos extras da proposta (só os modelos novos usam). */
export interface OfferX29 {
  /** empresariamento: comissão (0,10–0,25) sobre o que o ato ganha */
  commission?: number;
  /** joint venture: participação do artista no subselo (0,2–0,6) */
  artistShare?: number;
  /** joint venture: meta de lançamentos do subselo/ato no prazo */
  target?: number;
}

/** Uma entrega de masters da produtora a um selo. */
export interface Delivery29 {
  relId: string;
  /** selo que recebeu ('player' = o seu selo, lançamento normal) */
  lb: string;
  /** licença (adiantamento + pontos) ou venda (preço único, sem pontos) */
  kind: 'license' | 'sale';
  /** adiantamento/preço pago pelo selo à produtora (centavos) */
  adv: number;
  /** pontos da produtora sobre a receita do disco (fração) */
  pts: number;
  /** pontos acumulados (recuperam o adiantamento antes de pagar) e quanto já foi pago à produtora */
  earned: number;
  paid: number;
  week: number;
}

/** Estado do contrato especial (dentro do próprio Contract — sem slot novo no x4). */
export interface ContractX29 extends OfferX29 {
  /** produção: entregas de masters */
  deliveries?: Delivery29[];
  /** joint venture: id do subselo criado */
  subId?: string;
  /** dinheiro que já andou por este acordo: comissões (empresário), recebimentos da produtora, lucros da JV (centavos) */
  paid?: number;
  /** parte do artista já paga (produção: split; JV: lucro) */
  artistPaid?: number;
  /** contrato NPC (empresário, produtora, selo): nome de quem assinou, para as telas */
  co?: string;
  /** JV de selo NPC: nome do selo-vaidade da estrela (deals18 dá o mesmo +4% de apelo) */
  imprint?: string;
  /** joint venture: semana em que você comprou a parte do artista (o selo virou 100% seu; o contrato segue) */
  bought?: number;
  /** conflito de interesse avisado (empresário de ato do próprio selo) */
  conflict?: boolean;
  /** encerrado e por quê */
  ended?: End29;
  endWeek29?: number;
}
export type End29 = 'expired' | 'quit' | 'fired' | 'released' | 'buyout' | 'dissolved' | 'partner_exit' | 'gone' | 'sold' | 'replaced';

declare module './types' {
  interface Offer { /** R29 (contratos+): termos dos modelos novos */ x29?: OfferX29 }
  interface Contract { /** R29 (contratos+): estado dos modelos novos */ x29?: ContractX29 }
}

/** Modelos que este módulo trata. */
export const SPECIAL29: readonly ContractModel[] = ['management', 'production', 'jv'];
export const isSpecial29 = (m: ContractModel | undefined): boolean => !!m && SPECIAL29.includes(m);
/** Acordo "ao lado": não tira o ato do selo atual (empresariamento). */
export const isSide29 = (c: { model: ContractModel } | undefined): boolean => c?.model === 'management';

export const COMMISSION29 = { min: 0.1, max: 0.25, def: 0.15 } as const;
export const SHARE29 = { min: 0.2, max: 0.6, def: 0.35 } as const;
export const TARGET29 = { min: 1, max: 12, def: 3 } as const;
/** produção: pontos padrão que um selo paga à produtora numa licença */
export const PROD_PTS29 = 0.16;
/** produção: parte do artista nos recebimentos da produtora (padrão do mercado: ~metade) */
export const PROD_SPLIT29 = 0.45;

const clamp01 = (v: number, a: number, b: number) => Math.max(a, Math.min(b, Number.isFinite(v) ? v : a));
export const commissionOf29 = (o: { x29?: OfferX29 }): number => Math.round(clamp01(o.x29?.commission ?? COMMISSION29.def, COMMISSION29.min, COMMISSION29.max) * 100) / 100;
export const shareOf29 = (o: { x29?: OfferX29 }): number => Math.round(clamp01(o.x29?.artistShare ?? SHARE29.def, SHARE29.min, SHARE29.max) * 100) / 100;
export const targetOf29 = (o: { x29?: OfferX29 }): number => Math.round(clamp01(o.x29?.target ?? TARGET29.def, TARGET29.min, TARGET29.max));

/** Ajusta a proposta ao trocar de modelo (padrões de cada um; o resto fica como estava). */
export function applyModel29(o: Omit<Offer, 'id' | 'week' | 'status'>, model: ContractModel): void {
  const prev = o.model;
  // luvas do empresário são pequenas e a produtora adianta menos que um selo (mesma régua de advFactor29)
  if (prev !== model) o.advance = Math.round(o.advance * advFactor29(model) / advFactor29(prev) / 100) * 100;
  o.model = model;
  if (model === 'management') { o.x29 = { commission: o.x29?.commission ?? COMMISSION29.def }; o.publishing = false; o.share360 = 0; o.creativeControl = true; o.releasesOwed = 1; }
  else if (model === 'production') { o.x29 = undefined; o.royalty = Math.max(o.royalty, PROD_SPLIT29); o.publishing = false; o.share360 = 0; }
  else if (model === 'jv') { o.x29 = { artistShare: o.x29?.artistShare ?? SHARE29.def, target: o.x29?.target ?? TARGET29.def }; o.publishing = false; o.share360 = 0; }
  else o.x29 = undefined;
}

/** O que o artista espera do termo principal em cada modelo (classic etc.: a mesma conta de sempre). */
export function expRoy29(model: ContractModel, fame: number): number {
  if (model === 'distribution') return 0.8;
  if (model === 'management') return 1 - COMMISSION29.def + fame / 2000; // o que sobra depois da comissão (~15%)
  if (model === 'production') return PROD_SPLIT29 + fame / 1000; // parte dos recebimentos da produtora (~45%)
  if (model === 'jv') return SHARE29.def + fame / 800; // participação no subselo (~35%)
  return 0.14 + fame / 600;
}
/** O "royalty" que o artista enxerga em cada modelo e o que ele espera. */
export function royTerms29(o: { model: ContractModel; royalty: number; distributionFee?: number; x29?: OfferX29 }, fame: number): { roy: number; exp: number } {
  const roy = o.model === 'distribution' ? 1 - (o.distributionFee ?? 0.2) : o.model === 'management' ? 1 - commissionOf29(o) : o.model === 'jv' ? shareOf29(o) : o.royalty;
  return { roy, exp: expRoy29(o.model, fame) };
}

/** Expectativa de adiantamento relativa (o empresário não paga luvas grandes; a JV põe capital no selo). */
export const advFactor29 = (m: ContractModel): number => (m === 'management' ? 0.15 : m === 'production' ? 0.6 : m === 'jv' ? 0.7 : 1);

/** Linha curta do termo principal (log da mesa, tabelas). Para os modelos antigos, o texto de sempre. */
export function termTxt29(o: { model: ContractModel; royalty: number; distributionFee?: number; x29?: OfferX29 }): L {
  const p = (v: number) => Math.round(v * 100);
  if (o.model === 'management') return l(`${p(commissionOf29(o))}% de comissão`, `${p(commissionOf29(o))}% commission`);
  if (o.model === 'jv') return l(`${p(shareOf29(o))}% do selo para o artista, meta de ${targetOf29(o)} lançamento(s)`, `${p(shareOf29(o))}% of the label to the act, target ${targetOf29(o)} release(s)`);
  if (o.model === 'production') return l(`${p(o.royalty)}% dos recebimentos da produtora`, `${p(o.royalty)}% of the production company's receipts`);
  const r = o.model === 'distribution' ? 1 - (o.distributionFee ?? 0.2) : o.royalty;
  return l(`${p(r)}% de royalty`, `${p(r)}% royalty`);
}

/** Nome do campo principal no formulário/mesa. */
export const termLabel29 = (m: ContractModel): L =>
  m === 'management' ? l('Comissão do empresário (%)', 'Manager commission (%)')
    : m === 'production' ? l('Parte do artista nos recebimentos (%)', 'Artist share of receipts (%)')
      : m === 'jv' ? l('Participação do artista no selo (%)', 'Artist stake in the label (%)')
        : l('Royalty (%)', 'Royalty (%)');

/** O acordo especial está valendo? (o empresariamento não é o act.contractId do ato) */
export function active29(s: GameState, c: Contract): boolean {
  if (c.x29?.ended) return false;
  if (isSide29(c) || c.party.includes(':')) return c.endWeek > s.week; // empresariamento e produtora NPC não são o act.contractId
  return s.acts[c.actId]?.contractId === c.id && c.endWeek >= s.week;
}

export const END29_NAME: Record<End29, L> = {
  expired: l('fim do prazo', 'term ended'), quit: l('você deixou a gestão', 'you stepped down'), fired: l('o artista demitiu você', 'the act fired you'),
  released: l('ato liberado', 'act released'), buyout: l('você comprou a parte do artista', 'you bought out the act'), dissolved: l('JV dissolvida', 'JV dissolved'),
  partner_exit: l('o artista saiu da sociedade', 'the act left the partnership'), gone: l('o ato encerrou a carreira', 'the act ended its career'),
  sold: l('um selo comprou o contrato', 'a label bought the contract'), replaced: l('trocou de empresário', 'switched managers'),
};

// ---------------------------------------------------------------- NPC (sys/npc29): época e nomes
/** Empresariamento NPC: existe desde sempre, ganha corpo nos anos 1950 e vira regra na era do rock (1960–89). */
export const mgrEra29 = (y: number): number => (y < 1950 ? 0.4 : y < 1960 ? 0.9 : y < 1990 ? 1.5 : 1);
/** Produção NPC (chance por mês de uma produtora assinar alguém): forte nos anos 1960–80 (Spector, Motown, indies dos 80). */
export const prodEra29 = (y: number): number => (y < 1950 ? 0 : y < 1960 ? 0.06 : y < 1990 ? 0.3 : y < 2005 ? 0.12 : 0.05);
/** JV/selo-vaidade de estrela com selo NPC (chance quando um selo assina um ato famoso): a partir dos anos 1970. */
export const jvEra29 = (y: number): number => (y < 1970 ? 0 : y < 1990 ? 0.12 : 0.2);
/** Parte NPC (empresário 'e:', produtor 'pd:', estúdio NPC 'vs:') — selos e o jogador não têm ':' no id. */
export const npcParty29 = (party: string): boolean => party.includes(':');
/** Nome de quem assinou o contrato (selo, você, empresário ou produtora NPC). */
export function partyName29(s: GameState, c: Contract): string {
  if (c.party === 'player') return s.config.companyName;
  return s.labels[c.party]?.name ?? c.x29?.co ?? c.party;
}

/** Descrição de cada modelo novo para a interface (o que acontece ao assinar). */
export const HOW29: Partial<Record<ContractModel, L>> = {
  management: l('O ato continua no selo dele (ou sem selo). Você vira o empresário: comissão mensal sobre o que ele ganha (shows, royalties, sync), age pela carreira dele (turnês, negociar com o selo, crises) na Gestão de artistas. Se você ainda não é empresário, a carreira começa agora.',
    'The act stays on its own label (or none). You become its manager: a monthly commission on what it earns (shows, royalties, sync) and you act on its career (tours, negotiating with the label, crises) in Artist management. If you are not a manager yet, the career starts now.'),
  production: l('Sua produtora assina o ato e fica com os masters. Grave como sempre; depois lance pelo seu selo (royalty = a parte do artista) ou entregue os masters a um selo rival: licença (adiantamento por master + pontos) ou venda. O artista recebe a parte combinada de tudo o que a produtora recebe.',
    'Your production company signs the act and owns the masters. Record as usual; then release on your label (royalty = the act\'s share) or deliver the masters to a rival label: license (advance per master + points) or sale. The act gets the agreed share of everything the company receives.'),
  jv: l('Um selo novo (subselo) com o artista de sócio: o adiantamento vira o capital do selo, o lucro do ano é dividido pela participação, a meta de lançamentos vale no prazo. Você pode comprar a parte do artista ou dissolver (com multa se a meta não estiver cumprida).',
    'A new label (sub-label) with the act as partner: the advance becomes the label\'s capital, the yearly profit is split by stake, the release target counts over the term. You may buy out the act\'s stake or dissolve (with a penalty if the target is not met).'),
};

/** O contrato de empresariamento vigente do jogador com este ato (ou undefined). */
export function mgmtOf29(s: GameState, actId: string): Contract | undefined {
  for (const id in s.contracts) { const c = s.contracts[id]; if (c.actId === actId && c.model === 'management' && c.party === 'player' && active29(s, c)) return c; }
  return undefined;
}
