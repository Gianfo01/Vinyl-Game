// Árvore de habilidades do dono (rodada 9): substitui os "estilos de vida com 6 perks em sequência".
// Pontos vêm da criação, de cada ano vivido e de marcos da carreira; cada habilidade custa 1–3 pontos,
// pede as anteriores do mesmo ramo e devolve bônus pelo registro de perks. O ESTILO DE VIDA não é mais
// escolhido: ele é derivado de onde os pontos foram investidos (10 estilos, cada um com prós e contras).

import { l, type L } from '../../../data/world';
import type { Act, GameState } from '../../types';
import type { PerkValues } from '../../perks';
import type { OwnerAttrId } from './data';

export type BranchId = 'biz' | 'craft' | 'net' | 'stage' | 'health' | 'media' | 'mgmt' | 'digital';

export const BRANCHES: { id: BranchId; name: L; icon: string; desc: L }[] = [
  { id: 'biz', name: l('Negócios', 'Business'), icon: 'bank', desc: l('Custos, contratos, investidores e escala.', 'Costs, contracts, investors and scale.') },
  { id: 'craft', name: l('Criação', 'Craft'), icon: 'pen', desc: l('Ouvido, arranjo e qualidade das músicas.', 'Ear, arrangement and song quality.') },
  { id: 'net', name: l('Rede e social', 'Network'), icon: 'fans', desc: l('Contatos, scouting, confiança e tramas.', 'Contacts, scouting, trust and schemes.') },
  { id: 'stage', name: l('Palco', 'Stage'), icon: 'mic', desc: l('Shows, turnês e espetáculo.', 'Shows, tours and spectacle.') },
  { id: 'health', name: l('Bem-estar', 'Wellbeing'), icon: 'heart', desc: l('Estresse, saúde, família e elenco feliz.', 'Stress, health, family and a happy roster.') },
  { id: 'media', name: l('Mídia', 'Media'), icon: 'newspaper', desc: l('Imprensa, imagem, lançamentos e vendas.', 'Press, image, launches and sales.') },
  { id: 'mgmt', name: l('Gestão de artistas', 'Artist management'), icon: 'handshake', desc: l('Confiança, carreira, moral e contratos justos.', 'Trust, career plans, morale and fair deals.') },
  { id: 'digital', name: l('Digital e plataformas', 'Digital & platforms'), icon: 'globe', desc: l('Streaming, redes, playlists e dados de audiência.', 'Streaming, social, playlists and audience data.') },
];
export const branchById = Object.fromEntries(BRANCHES.map((b) => [b.id, b])) as Record<BranchId, (typeof BRANCHES)[number]>;

export interface SkillDef {
  id: string;
  branch: BranchId;
  tier: number;
  cost: number;
  req: string[];
  name: L;
  values: PerkValues;
  attrs?: Partial<Record<OwnerAttrId, number>>;
  /** saúde do dono por mês */
  health?: number;
}

const sk = (id: string, branch: BranchId, tier: number, req: string[], pt: string, en: string, values: PerkValues, extra: Partial<SkillDef> = {}): SkillDef =>
  ({ id, branch, tier, cost: tier <= 2 ? 1 : tier <= 4 ? 2 : 3, req, name: l(pt, en), values, ...extra });

export const SKILL_TREE: SkillDef[] = [
  sk('biz_sheet', 'biz', 1, [], 'Planilha afiada', 'Sharp spreadsheet', { staffCost: -0.04 }),
  sk('biz_table', 'biz', 2, ['biz_sheet'], 'Mesa de negociação', 'Negotiating table', { advance: -0.05 }, { attrs: { negotiation: 2 } }),
  sk('biz_investor', 'biz', 2, ['biz_sheet'], 'Conversa de investidor', 'Investor talk', { valuation: 0.08 }),
  sk('biz_scale', 'biz', 3, ['biz_table'], 'Escala industrial', 'Industrial scale', { pressingCost: -0.07 }),
  sk('biz_dividends', 'biz', 4, ['biz_investor'], 'Dividendos', 'Dividends', { wealth: 150 }),
  sk('biz_empire', 'biz', 5, ['biz_scale', 'biz_dividends'], 'Império', 'Empire', { chartUnits: 0.04, valuation: 0.1 }),

  sk('cr_ear', 'craft', 1, [], 'Ouvido treinado', 'Trained ear', { songQ: 0.5 }, { attrs: { ear: 2 } }),
  sk('cr_hook', 'craft', 2, ['cr_ear'], 'Gancho certo', 'The right hook', { songQ: 1 }),
  sk('cr_arr', 'craft', 2, ['cr_ear'], 'Arranjador', 'Arranger', { critics: 0.15 }),
  sk('cr_polish', 'craft', 3, ['cr_hook'], 'Lapidador', 'Polisher', { songQ: 1 }),
  sk('cr_radio', 'craft', 4, ['cr_hook'], 'Ouvido de rádio', 'Radio ear', { appeal: 0.04 }),
  sk('cr_master', 'craft', 5, ['cr_polish', 'cr_arr'], 'Casa de mestres', 'House of masters', { songQ: 1, critics: 0.2 }),

  sk('net_book', 'net', 1, [], 'Caderninho', 'Little black book', { signals: 1 }),
  sk('net_door', 'net', 2, ['net_book'], 'Porta aberta', 'Open door', { trust: 4 }),
  sk('net_eye', 'net', 2, ['net_book'], 'Olho clínico', 'Clinical eye', { scoutAccuracy: 0.06 }),
  sk('net_scouts', 'net', 3, ['net_eye'], 'Exército de olheiros', 'Scout army', { scoutActions: 1 }),
  sk('net_boss', 'net', 4, ['net_door'], 'Fama de bom patrão', 'Good-boss reputation', { offer: 0.04 }, { attrs: { charisma: 2 } }),
  sk('net_shadow', 'net', 5, ['net_scouts', 'net_boss'], 'Mestre das sombras', 'Shadow master', { scheme: 0.15, offer: 0.02, scoutAccuracy: 0.06 }),

  sk('st_house', 'stage', 1, [], 'Casa cheia', 'Full house', { showRevenue: 0.05 }),
  sk('st_lights', 'stage', 2, ['st_house'], 'Fogos e luzes', 'Lights and fireworks', { appeal: 0.03 }),
  sk('st_road', 'stage', 2, ['st_house'], 'Pique de estrada', 'Road stamina', { energy: 1 }),
  sk('st_fest', 'stage', 3, ['st_lights'], 'Rei dos festivais', 'Festival king', { showRevenue: 0.06 }),
  sk('st_legend', 'stage', 4, ['st_road'], 'Lenda ao vivo', 'Live legend', { critics: 0.1, trust: 2 }, { attrs: { charisma: 2 } }),
  sk('st_show', 'stage', 5, ['st_fest', 'st_legend'], 'O maior espetáculo', 'The greatest show', { showRevenue: 0.08, trust: 2 }),

  sk('he_sleep', 'health', 1, [], 'Rotina de sono', 'Sleep routine', { stress: -0.08 }),
  sk('he_sport', 'health', 2, ['he_sleep'], 'Corpo em dia', 'Fit body', {}, { health: 0.5 }),
  sk('he_family', 'health', 2, ['he_sleep'], 'Tempo para os seus', 'Time for your people', { morale: 0.3, stress: -0.05 }),
  sk('he_cold', 'health', 3, ['he_sport'], 'Sangue frio', 'Cold blood', { stress: -0.1 }),
  sk('he_shoulder', 'health', 4, ['he_family'], 'Ombro amigo', 'Shoulder to lean on', { morale: 0.7 }),
  sk('he_zen', 'health', 5, ['he_cold', 'he_shoulder'], 'Equilíbrio', 'Balance', { energy: 1, stress: -0.1 }),

  sk('me_press', 'media', 1, [], 'Boa imprensa', 'Good press', { critics: 0.1 }),
  sk('me_contacts', 'media', 2, ['me_press'], 'Lista de contatos', 'Contact list', { chartUnits: 0.03 }),
  sk('me_image', 'media', 2, ['me_press'], 'Imagem pública', 'Public image', { reputation: 1 }, { attrs: { charisma: 1 } }),
  sk('me_launch', 'media', 3, ['me_contacts'], 'Lançamento cirúrgico', 'Surgical release', { appeal: 0.04 }),
  sk('me_ears', 'media', 4, ['me_image'], 'Ouvidos nas paredes', 'Ears in the walls', { scheme: 0.1, scoutAccuracy: 0.04 }),
  sk('me_midas', 'media', 5, ['me_launch', 'me_ears'], 'Toque de Midas', 'Midas touch', { appeal: 0.05, chartUnits: 0.03 }),

  sk('mg_notes', 'mgmt', 1, [], 'Fichas de artista', 'Artist files', { trust: 2 }),
  sk('mg_contract', 'mgmt', 2, ['mg_notes'], 'Contrato justo', 'Fair contract', { advance: -0.04 }, { attrs: { negotiation: 1 } }),
  sk('mg_care', 'mgmt', 2, ['mg_notes'], 'Cuidado de carreira', 'Career care', { morale: 0.3, stress: -0.04 }),
  sk('mg_plan', 'mgmt', 3, ['mg_contract'], 'Plano de carreira', 'Career plan', { offer: 0.03, reputation: 0.5 }),
  sk('mg_mediator', 'mgmt', 4, ['mg_care'], 'Mediador de bandas', 'Band mediator', { morale: 0.5, scheme: -0.1 }),
  sk('mg_dynasty', 'mgmt', 5, ['mg_plan', 'mg_mediator'], 'Casa de lendas', 'House of legends', { trust: 3, offer: 0.03, reputation: 1 }),

  sk('dg_meta', 'digital', 1, [], 'Metadados limpos', 'Clean metadata', { metadata: 0.3 }), // r18: menos caixa preta, conflitos e atrasos (não vende discos)
  sk('dg_social', 'digital', 2, ['dg_meta'], 'Redes sociais', 'Social media', { appeal: 0.03 }),
  sk('dg_playlist', 'digital', 2, ['dg_meta'], 'Curadoria de playlists', 'Playlist curation', { chartUnits: 0.03 }),
  sk('dg_data', 'digital', 3, ['dg_social'], 'Dados de audiência', 'Audience data', { scoutAccuracy: 0.05, signals: 1 }),
  sk('dg_viral', 'digital', 4, ['dg_playlist'], 'Faro viral', 'Viral nose', { appeal: 0.04, chartUnits: 0.02 }),
  sk('dg_platform', 'digital', 5, ['dg_data', 'dg_viral'], 'Sócio das plataformas', 'Platform partner', { valuation: 0.08, chartUnits: 0.03, wealth: 100 }),
];
export const skillById = Object.fromEntries(SKILL_TREE.map((x) => [x.id, x])) as Record<string, SkillDef>;

// Balanço (rodada 13): 8 ramos x 6 habilidades, custo 1/1/1/2/2/3 = 10 pts por ramo, 80 no total.
// Fontes numa partida média de 8 anos: criação 3 (rodada 16; era 5) + anos 2x8=16 + marcos ~6 + conquistas (prêmios, nº 1,
// hits, certificações, turnês esgotadas; ver skillpts13.ts) ~10 = ~35 pts, ou seja ~44% da árvore.
// Quem joga muito bem chega a ~55% (tetos por fonte somam 28 de conquistas); ninguém zera os 80.
/** Pontos para distribuir na criação. */
export const START_SKILL_POINTS = 3;
/** Pontos por ano completo. */
export const YEARLY_SKILL_POINTS = 2;

// ---------------------------------------------------------------- estilos de vida derivados

export type LifestyleId = 'magnata' | 'asceta' | 'intelectual' | 'jetsetter' | 'festeiro' | 'underground' | 'mecenas' | 'workaholic' | 'familia' | 'boemio';

export interface LifestyleDef {
  id: LifestyleId;
  name: L;
  desc: L;
  /** peso de cada ramo (o estilo é o perfil mais parecido com onde você investiu) */
  w: Partial<Record<BranchId, number>>;
  values: PerkValues;
  act?: (s: GameState, a: Act) => boolean;
  health?: number;
}

export const LIFESTYLES: LifestyleDef[] = [
  { id: 'magnata', name: l('Magnata', 'Tycoon'), desc: l('Vive para o balanço: valor de mercado +6%, salários −2%; estresse +5%.', 'Lives for the balance sheet: market value +6%, salaries −2%; stress +5%.'), w: { biz: 1 }, values: { valuation: 0.06, staffCost: -0.02, stress: 0.05 } },
  { id: 'asceta', name: l('Asceta', 'Ascetic'), desc: l('Pouco gasto, muita calma: estresse −12%, +$60/mês; artistas te acham distante (−2 de confiança).', 'Little spending, lots of calm: stress −12%, +$60/month; artists find you distant (−2 trust).'), w: { health: 1 }, values: { stress: -0.12, wealth: 60, trust: -2 } },
  { id: 'intelectual', name: l('Intelectual', 'Intellectual'), desc: l('Livros, críticas e conservatório: crítica +0,25, scouting 4% mais preciso; apelo popular −2%.', 'Books, reviews and conservatory: critics +0.25, scouting 4% sharper; popular appeal −2%.'), w: { craft: 0.6, media: 0.4, health: 0.4 }, values: { critics: 0.25, scoutAccuracy: 0.04, appeal: -0.02 } },
  { id: 'jetsetter', name: l('Jet-setter', 'Jet-setter'), desc: l('Festas em três continentes: +1 sinal/mês e ofertas +2; a vida custa $120/mês.', 'Parties on three continents: +1 signal/month and offers +2; costs $120/month.'), w: { net: 0.7, media: 0.7, digital: 0.5 }, values: { signals: 1, offer: 0.02, wealth: -120 } },
  { id: 'festeiro', name: l('Festeiro', 'Party animal'), desc: l('A festa é o escritório: confiança +3 e elenco animado; a saúde cai um pouco todo mês.', 'The party is the office: trust +3 and a cheerful roster; health slips a little every month.'), w: { stage: 0.7, net: 0.7 }, values: { trust: 3, morale: 0.3 }, health: -0.4 },
  { id: 'underground', name: l('Underground', 'Underground'), desc: l('Porões e cenas: ofertas +5 para atos de nicho; investidores torcem o nariz (−5% de valor).', 'Basements and scenes: offers +5 for niche acts; investors frown (−5% value).'), w: { craft: 0.7, stage: 0.7 }, values: { offer: 0.05 }, act: (_s, a) => a.positioning < 50 },
  { id: 'mecenas', name: l('Mecenas', 'Patron'), desc: l('Financia artistas: moral +0,5/mês e confiança +3; custa $100/mês do seu bolso.', 'Funds artists: morale +0.5/month and trust +3; costs $100/month from your pocket.'), w: { craft: 0.7, net: 0.7, mgmt: 0.5 }, values: { morale: 0.5, trust: 3, wealth: -100 } },
  { id: 'workaholic', name: l('Workaholic', 'Workaholic'), desc: l('Sem fim de semana: +1 tempo livre por mês, estresse +15%.', 'No weekends: +1 free time a month, stress +15%.'), w: { biz: 0.7, media: 0.7, digital: 0.5 }, values: { energy: 1, stress: 0.15 } },
  { id: 'familia', name: l('Família', 'Family person'), desc: l('Jantar em casa: estresse −10%, saúde +0,2/mês e elenco tratado como família; tramas −10%.', 'Dinner at home: stress −10%, health +0.2/month and a family-like roster; schemes −10%.'), w: { health: 0.7, net: 0.7, mgmt: 0.4 }, values: { stress: -0.1, morale: 0.2, scheme: -0.1 }, health: 0.2 },
  { id: 'boemio', name: l('Boêmio', 'Bohemian'), desc: l('Noite, bar e violão: +1 sinal/mês e +0,5 de qualidade; a saúde cobra (−0,3/mês).', 'Night, bars and guitars: +1 signal/month and +0.5 quality; health pays (−0.3/month).'), w: { craft: 0.5, net: 0.5, stage: 0.5 }, values: { signals: 1, songQ: 0.5 }, health: -0.3 },
];
export const lifestyleById = Object.fromEntries(LIFESTYLES.map((x) => [x.id, x])) as Record<LifestyleId, LifestyleDef>;

/** Pontos investidos por ramo. */
export function branchPoints(owned: string[]): Record<BranchId, number> {
  const out = Object.fromEntries(BRANCHES.map((b) => [b.id, 0])) as Record<BranchId, number>;
  for (const id of owned) { const d = skillById[id]; if (d) out[d.branch] += d.cost; }
  return out;
}

/** Estilo de vida = perfil mais parecido (cosseno) com a distribuição de pontos; empate segue a ordem da lista. */
export function lifestyleOf(owned: string[]): LifestyleId | null {
  const p = branchPoints(owned);
  const np = Math.hypot(...Object.values(p));
  if (!np) return null;
  let best: LifestyleId | null = null;
  let bestV = -1;
  for (const ls of LIFESTYLES) {
    const ws = Object.entries(ls.w) as [BranchId, number][];
    const nw = Math.hypot(...ws.map(([, v]) => v));
    const v = ws.reduce((t, [k, x]) => t + p[k] * x, 0) / (np * nw);
    if (v > bestV + 1e-9) { bestV = v; best = ls.id; }
  }
  return best;
}

/** Pode comprar? (pré-requisitos e pontos) */
export function canBuySkill(owned: string[], points: number, id: string): boolean {
  const d = skillById[id];
  return !!d && !owned.includes(id) && points >= d.cost && d.req.every((x) => owned.includes(x));
}

/** Valida uma escolha inicial (ordem livre): devolve só o que respeita pré-requisitos e o orçamento. */
export function validStartSkills(ids: string[], budget = START_SKILL_POINTS): string[] {
  const out: string[] = [];
  let left = budget;
  let changed = true;
  while (changed) {
    changed = false;
    for (const id of ids) if (canBuySkill(out, left, id)) { out.push(id); left -= skillById[id].cost; changed = true; }
  }
  return out;
}

/** Compra automática num ramo (bots, partidas sem ficha e migração do estilo antigo). */
export function autoSkills(branch: BranchId, budget: number): string[] {
  const out: string[] = [];
  let left = budget;
  for (const d of SKILL_TREE.filter((x) => x.branch === branch).sort((a, b) => a.tier - b.tier)) if (canBuySkill(out, left, d.id)) { out.push(d.id); left -= d.cost; }
  return out;
}

/** Estilo antigo (rodada 6) → ramo. */
export const BRANCH_OF_STYLE: Record<string, BranchId> = { mentor: 'health', mogul: 'biz', hitmaker: 'craft', curator: 'net', showman: 'stage', schemer: 'media' };
