// Rodada 29 — NÍVEL DOS RIVAIS na Nova run (dados puros, seguros de importar pela interface). Mesma escada de porte da
// situação inicial (start29data.ts), agora para os OUTROS: do zero → emergentes → médios → (hipsters, o desvio artístico)
// → estabelecidos → gigantes (top 5) → um líder dominante, mais a "mistura realista" (o mundo de sempre, padrão).
// O gancho 'newgame' de src/sim/sys/rivals29start.ts aplica a escolha aos selos rivais (caixa, reputação artística ×
// comercial, porte, elenco e fama, mercados, agressividade) e aos negócios rivais da sua carreira (estúdios, festivais,
// agências, editoras, mídia, plataformas). Sem `rivals29` na configuração (testes, bot, saves antigos) nada muda.

import { l, type L } from '../data/world';
import type { Label, RunConfig } from './types';
import { statusLabel29, careerOf29, sitOf29 } from './start29data';

export type Riv29 = 'zero' | 'emerging' | 'mid' | 'hipster' | 'established' | 'giants' | 'leader' | 'mix';

/** Perfil aplicado a um grupo de selos rivais (todos, ou só os "grandes" de gigantes / líder). */
export interface RivProf29 {
  /** multiplicador do caixa que a era e o porte já deram ao selo (escala relativa à economia da época) */
  cash: number;
  /** faixas da reputação artística e comercial (0–100); a reputação única do selo vira a média das duas */
  art: [number, number];
  com: [number, number];
  /** máximo de atos no elenco (corte no começo; sem corte = undefined) e quem fica: os menos famosos, sorteados ou os de
   *  talento ainda sem alcance (potencial − fama: o faro do hipster) */
  cap?: number;
  keep?: 'low' | 'rand' | 'pot';
  /** atos livres que cada selo assina a mais no começo (os mais famosos primeiro) */
  extra: number;
  /** alcance do elenco que fica (multiplicador da fama; os fãs acompanham): o selo de garagem não tem rádio, a major tem
   *  a máquina de divulgação */
  fame?: number;
  /** porte forçado (B = independente pequeno, A = major); 'down' = major vira médio (A → C) */
  fam?: Label['family'] | 'down';
  /** mercados: só a casa; a região (casa + América do Norte + Europa); os de sempre mais a região; os de sempre; ou o
   *  mundo (até onde a era deixa) */
  terr: 'home' | 'region' | 'grow' | 'keep' | 'world';
  /** multiplicador da agressividade (leilões, aliciamento, ofensivas; rivalmind18/rivals27) */
  agg: number;
  /** perfil de jogo (arquétipo do rivals2 → temperamento do rivals27 quando não há líder; estratégia de A&R) */
  arch?: NonNullable<Label['archetype']>[];
  strat?: Label['strategy'][];
}

export interface RivDef29 {
  id: Riv29;
  /** nome curto da opção */
  name: L;
  /** como entra no status ("Selo emergente · rivais gigantes") */
  tag: L;
  /** o que muda, em uma frase */
  fx: L;
  /** perfil de todos os rivais (no líder dominante e nos gigantes: dos que NÃO são os grandes) */
  all?: RivProf29;
  /** os grandes: quantos (limitado pela era) e o perfil deles */
  big?: { n: number; p: RivProf29 };
  /** negócios rivais da sua carreira (estúdio, festival, agência…): quantos e a faixa de reputação; [n do grande, rep do grande] no líder */
  ven: { n: number; rep: [number, number]; top?: [number, number] };
}

const N = (pt: string, en: string): L => l(pt, en);

/** A escada, em ordem de exibição ("mistura realista" por último: é o padrão). */
export const RIVS29: RivDef29[] = [
  { id: 'zero', name: N('Do zero', 'From zero'), tag: N('rivais do zero', 'rivals from zero'),
    fx: N('Ninguém tem nome ainda: selos de garagem, caixa curto, um artista cada — os famosos estão livres no mercado.', 'Nobody has a name yet: garage labels, short cash, one act each — the famous ones are free on the market.'),
    all: { cash: 0.06, art: [5, 20], com: [5, 18], cap: 1, keep: 'low', extra: 0, fame: 0.6, fam: 'B', terr: 'home', agg: 0.55, strat: ['develop', 'niche'] },
    ven: { n: 0, rep: [0, 0] } },
  { id: 'emerging', name: N('Emergentes', 'Emerging'), tag: N('rivais emergentes', 'emerging rivals'),
    fx: N('Selos pequenos e locais, poucos nomes, pouco dinheiro para leilão.', 'Small local labels, few names, little money to bid with.'),
    all: { cash: 0.22, art: [20, 40], com: [18, 38], cap: 3, keep: 'low', extra: 0, fame: 0.8, fam: 'B', terr: 'home', agg: 0.75 },
    ven: { n: 1, rep: [15, 30] } },
  { id: 'mid', name: N('Médios', 'Mid-size'), tag: N('rivais médios', 'mid-size rivals'),
    fx: N('Ninguém domina: as majors viram selos médios, elencos enxutos e duas ou três praças cada.', 'Nobody dominates: majors become mid-size labels, lean rosters and two or three markets each.'),
    all: { cash: 0.55, art: [35, 55], com: [35, 55], cap: 6, keep: 'rand', extra: 0, fam: 'down', terr: 'region', agg: 0.88 },
    ven: { n: 1, rep: [30, 45] } },
  { id: 'hipster', name: N('Hipsters / indie de prestígio', 'Hipsters / prestige indies'), tag: N('rivais hipsters', 'hipster rivals'),
    fx: N('Indies de prestígio: a crítica e os músicos os adoram, o rádio não; pouco caixa, elenco pequeno e talentoso.', 'Prestige indies: critics and musicians love them, radio does not; little cash, small and gifted rosters.'),
    all: { cash: 0.35, art: [72, 90], com: [12, 28], cap: 4, keep: 'pot', extra: 0, fame: 0.85, fam: 'B', terr: 'home', agg: 0.65, arch: ['boutique', 'scene_hunter'], strat: ['develop', 'niche'] },
    ven: { n: 1, rep: [45, 60] } },
  { id: 'established', name: N('Estabelecidos', 'Established'), tag: N('rivais estabelecidos', 'established rivals'),
    fx: N('Todos já têm catálogo, caixa e presença na região — e assinam primeiro os nomes livres.', 'Everyone already has a catalog, cash and a regional presence — and signs the free names first.'),
    all: { cash: 1.6, art: [45, 68], com: [52, 75], extra: 2, terr: 'grow', agg: 1.08 },
    ven: { n: 2, rep: [50, 65] } },
  { id: 'giants', name: N('Gigantes (top 5)', 'Giants (top 5)'), tag: N('rivais gigantes', 'giant rivals'),
    fx: N('Cinco majors (menos nas eras antigas) com o mundo inteiro, cofres cheios e fome de estrelas; os demais também crescem.', 'Five majors (fewer in early eras) with the whole world, full coffers and a hunger for stars; the rest grow too.'),
    all: { cash: 1.3, art: [45, 65], com: [55, 75], extra: 2, terr: 'grow', agg: 1.08 },
    big: { n: 5, p: { cash: 3.2, art: [55, 75], com: [80, 94], extra: 15, fame: 1.12, fam: 'A', terr: 'world', agg: 1.25, arch: ['empire', 'hitmaker'], strat: ['stars', 'buy_catalog'] } },
    ven: { n: 3, rep: [70, 85] } },
  { id: 'leader', name: N('Um líder dominante', 'One dominant leader'), tag: N('um rival dominante', 'one dominant rival'),
    fx: N('Um gigante absorveu as estrelas e o mercado; os outros são selos pequenos vivendo das sobras.', 'One giant has absorbed the stars and the market; the others are small labels living off the scraps.'),
    all: { cash: 0.35, art: [25, 48], com: [20, 40], cap: 4, keep: 'low', extra: 0, fame: 0.8, fam: 'B', terr: 'home', agg: 0.7 },
    big: { n: 1, p: { cash: 10, art: [70, 85], com: [92, 98], extra: 45, fame: 1.15, fam: 'A', terr: 'world', agg: 1.4, arch: ['empire'], strat: ['stars'] } },
    ven: { n: 1, rep: [18, 32], top: [1, 90] } },
  { id: 'mix', name: N('Mistura realista (padrão)', 'Realistic mix (default)'), tag: N('rivais em mistura realista', 'realistic mix of rivals'),
    fx: N('O mundo de sempre: majors, médios e indies como a época e a história os deixaram.', 'The usual world: majors, mid-size and indies as the era and history left them.'),
    ven: { n: 0, rep: [0, 0] } },
];
export const RIV29_IDS = RIVS29.map((x) => x.id);
export const riv29ById = (id?: string): RivDef29 | undefined => RIVS29.find((x) => x.id === id);
const isRiv29 = (x: unknown): x is Riv29 => typeof x === 'string' && (RIV29_IDS as string[]).includes(x);
/** Nível dos rivais de uma configuração (ausente ou inválido = mistura realista). */
export const rivOf29 = (cfg: { rivals29?: string }): Riv29 => (isRiv29(cfg.rivals29) ? cfg.rivals29 : 'mix');

/** Escolha do nível (o MESMO handler na Nova run rápida e na configuração completa). "Mistura realista" apaga o campo
 *  (a configuração fica idêntica à de quem nunca escolheu); um nível explícito desliga o "Como começam" das gravadoras
 *  que o contradiria (gigantes/novatas/aleatório/virado/todos iguais), que volta a "pela história". */
export function setRivals29(cfg: RunConfig, id: Riv29 | string): RunConfig {
  const d = riv29ById(id);
  if (!d || d.id === 'mix') { delete cfg.rivals29; return cfg; }
  cfg.rivals29 = d.id;
  if (cfg.labels?.start && cfg.labels.start !== 'history') delete cfg.labels.start;
  return cfg;
}

/** "rivais gigantes", "um rival dominante"… */
export const rivalsTag29 = (cfg: { rivals29?: string }): L => riv29ById(rivOf29(cfg))!.tag;
/** Status completo da Nova run: "Selo emergente · rivais gigantes" (carreira × situação × rivais). */
export function statusLine29(career: string | undefined, sit: string | undefined, riv: Riv29 | string | undefined): L {
  const a = statusLabel29(career, sit);
  const b = riv29ById(isRiv29(riv) ? riv : 'mix')!.tag;
  return l(`${a.pt} · ${b.pt}`, `${a.en} · ${b.en}`);
}
export const statusLineOf29 = (cfg: RunConfig): L => statusLine29(careerOf29(cfg), sitOf29(cfg), rivOf29(cfg));
