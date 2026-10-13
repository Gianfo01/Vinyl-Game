// Rodada 18 (econ18, ponto 15): retornos decrescentes para bônus pequenos empilhados.
// Regra (documentada também em docs/econ18.md):
//  • Modificadores em cadeia (applyMods): os BÔNUS de uma categoria se multiplicam (B = Π r>1) e o total efetivo é
//    1 + teto·tanh((B−1)/teto). Pequenos bônus quase não mudam (+10% vira +9,9%); pilhas grandes encostam no teto.
//    Penalidades continuam inteiras. Para custo e risco (menor é melhor) a mesma regra vale para as reduções.
//  • Vantagens somadas (perk): a parte positiva de cada chave passa pelo mesmo teto suave; a negativa fica inteira.
// Sem imports de runtime (ext4/perks importam este módulo).
import type { L } from '../data/world';

/** bônus PEQUENOS empilhados por categoria: até `knee` passa inteiro; acima, cresce no máximo mais `room`
 *  (ex.: appeal — até +30% intacto, depois no máximo ~+90%). Efeitos grandes isolados (r > 1,25) não entram na pilha. */
export const MOD_CAP18: Record<string, { knee: number; room: number; lower?: boolean }> = {
  appeal: { knee: 0.3, room: 0.6 }, chartUnits: { knee: 0.3, room: 0.5 }, cityDemand: { knee: 0.3, room: 0.5 }, showRevenue: { knee: 0.3, room: 0.5 }, songQ: { knee: 0.15, room: 0.2 },
  pressingCost: { knee: 0.25, room: 0.25, lower: true }, tourRisk: { knee: 0.3, room: 0.3, lower: true },
};
/** só multiplicadores pequenos (até +25%) contam como "pilha" */
export const SMALL18 = 1.25;
/** joelho da soma positiva por chave de vantagem (na unidade da chave): até ele passa inteiro; acima, retorno
 *  decrescente que acrescenta no máximo outro tanto */
export const PERK_CAP18: Record<string, number> = {
  offer: 0.25, critics: 6, songQ: 8, trust: 12, morale: 12, appeal: 0.4, showRevenue: 0.4, chartUnits: 0.4, pressingCost: 0.35,
  advance: 0.4, valuation: 0.5, reputation: 10, xp: 0.6, staffCost: 0.4, scoutAccuracy: 0.4, signals: 3, demos: 3, scoutActions: 3, energy: 1.5, wealth: 0.5, scheme: 0.4, stress: 0.4, metadata: 0.4,
};

/** chaves de vantagem em que menor é melhor (o bônus é a soma negativa) */
export const LOWER_PERK18 = new Set(['staffCost', 'pressingCost', 'stress']);

/** joelho suave: até `knee` igual; acima, knee + room·tanh((x−knee)/room) */
export const soft18 = (x: number, knee: number, room = knee): number => (x <= knee ? x : knee + room * Math.tanh((x - knee) / room));

/** fator de ajuste para a pilha de bônus B (produto dos multiplicadores favoráveis) */
export function modAdj18(name: string, boost: number): number {
  const c = MOD_CAP18[name];
  if (!c || boost <= 1.0001) return 1;
  const eff = 1 + soft18(boost - 1, c.knee, c.room);
  return c.lower ? boost / eff : eff / boost;
}
export const DIMINISH18: L = { pt: 'Retornos decrescentes (bônus empilhados)', en: 'Diminishing returns (stacked bonuses)' };

/** estatística opcional (balanço): globalThis.__caps18 = {} liga a coleta */
export function capStat18(key: string, raw: number, eff: number): void {
  const g = (globalThis as { __caps18?: Record<string, { n: number; raw: number; max: number; cut: number }> }).__caps18;
  if (!g) return;
  const x = (g[key] ??= { n: 0, raw: 0, max: 0, cut: 0 });
  x.n++; x.raw += raw; x.max = Math.max(x.max, raw); x.cut += raw - eff;
}

// ---------------------------------------------------------------- r19 (0.4): teto por FAMÍLIA do apelo
// Auditoria das 63 fontes de registerMod('appeal') (lista em APPEAL_CAT19; teste em tests/r19-infra.test.ts): cada
// fonte pertence a uma família de causa. Bônus da MESMA família se multiplicam e passam pelo joelho da família
// (até +20% inteiro, depois no máximo +30% a mais) antes do teto geral acima — cinco fontes de "imagem" não somam
// como cinco causas independentes. Efeitos grandes isolados (r > CAT_BIG19) seguem fora da pilha, como no teto geral.
export const APPEAL_CAT19: Record<string, string[]> = {
  /** obra: produção, som, qualidade, receita do estúdio */
  craft: ['fakes19', 'studio12:recipe', 'proj12:intent', 'proj12:dir', 'proj13', 'sound', 'q18', 'creation', 'links16:prod', 'supply13:grade', 'crew8'],
  /** imagem e pessoa: identidade, aparência, persona, vida e fama do dono, relevância */
  image: ['identity', 'persona13img', 'persona13race', 'persona13sex', 'looks17div', 'looks17age', 'life-fame', 'traj18', 'relevance8', 'standing9', 'sex17',
    'people-feed', 'people-romance', 'people-owner', 'people-mood', 'scandal29', 'awards29a'], // R29: escândalo recente pesa no lançamento seguinte (mech29)
  /** público e cena: fãs, cenas locais/históricas, regiões e circuitos, fandoms de idol */
  fans: ['fans18', 'scene12', 'scenes17', 'scenes-radio', 'w4scene', 'w4trainee', 'audience8', 'kpop18mil', 'idols18enka', 'regions18', 'circuits18', 'w4relation', 'scenes27', 'demo29'], // R29 demo29: idade do público × formato
  /** alcance: canais, veículos, imprensa, vitrines, hype de feira, selo/imprint, IA de recomendação */
  media: ['zines19', 'industry:channels', 'industry:outlets', 'ventures9:media', 'press18', 'goods8-spotlight', 'w4hype', 'deals18:imprint', 'ai18', 'ai8', 'perks29'], // R29: departamentos da sede (perks29)
  /** mundo: era, sociedade, leis, greves, marcos, crime, guerra de NPCs e rivais */
  world: ['era8', 'org12', 'world18', 'soc18', 'w4society', 'w4laws', 'w4cheap', 'w4strike', 'w4ms:*', 'w4backlash', 'crime17', 'crime17tie', 'crimemem23', 'npc17:war',
    'rivals12push', 'rivals8', 'rivals8profile', 'rivalmind18:pact', 'regions19', 'rivals27copy', 'hist27', 'demo29reg'], // R29 demo29reg: tendência regional do gênero
};
export const CAT_CAP19: Record<string, { knee: number; room: number }> = { appeal: { knee: 0.2, room: 0.3 } };
/** só multiplicadores até aqui entram na pilha da família */
export const CAT_BIG19 = 1.6;
const CAT_IDX19: Record<string, string> = {};
for (const [c, ids] of Object.entries(APPEAL_CAT19)) for (const id of ids) CAT_IDX19[id] = c;
/** família de uma fonte de modificador ('appeal' apenas; prefixo `w4ms:*` cobre os marcos) */
export function modCat19(name: string, id: string): string | undefined {
  if (name !== 'appeal') return undefined;
  return CAT_IDX19[id] ?? (id.startsWith('w4ms:') ? CAT_IDX19['w4ms:*'] : undefined);
}
/** fator da família com pilha B (produto dos bônus da família) */
export function catAdj19(name: string, boost: number): number {
  const c = CAT_CAP19[name];
  if (!c || boost <= 1.0001) return 1;
  return (1 + soft18(boost - 1, c.knee, c.room)) / boost;
}
export const DIMINISH19: L = { pt: 'Mesma causa repetida (teto por família)', en: 'Same cause stacked (per-family cap)' };
