// Rodada 29 — SITUAÇÃO INICIAL da Nova run (dados puros, seguros de importar pela interface). Uma escada de porte que vale
// igual para as 12 carreiras: do zero → emergente → médio → (hipster, o desvio artístico) → estabelecido → top 5 → líder
// do mercado, mais "em crise" (gigante caído: nome grande, dívida grande). Cada situação aponta para o `scenario` de
// sempre (from_zero / emerging / established) — é ele que o worldgen já entende — e o gancho 'newgame' de
// src/sim/sys/start29.ts soma só o que falta (caixa, reputação artística × comercial, elenco/fama da banda, sede, equipe,
// mercados, atenção dos rivais e dívida). Sem `start29` na configuração (testes, bot, saves antigos) nada muda.
//
// O rótulo do status segue a carreira: "Artista hipster", "Produtor top 5", "Empresário líder do mercado", "Selo
// emergente"… (statusLabel29). O começo sorteado do r28 (herança da tia, começa devendo…) continua, mas é pulado quando
// contradiz a situação escolhida (start28Fits29): uma major não "comprou o equipamento fiado".

import { l, type L } from '../data/world';
import type { RunConfig, ScenarioId } from './types';

export type Sit29 = 'zero' | 'emerging' | 'mid' | 'hipster' | 'established' | 'top5' | 'leader' | 'fallen';

export interface SitDef29 {
  id: Sit29;
  /** scenario de sempre que o worldgen aplica antes do gancho */
  base: ScenarioId;
  /** nome curto da situação (sem a carreira) */
  name: L;
  /** o que muda, em uma frase */
  fx: L;
  /** caixa relativo ao começo "emergente" da mesma carreira (1 = igual) */
  cash: number;
  /** pontos somados à reputação (0–100): artística, comercial, entre artistas, institucional */
  rep: Partial<Record<'artistic' | 'commercial' | 'artists' | 'institutional', number>>;
  /** nível da sede de quem tem sede (artista usa um a menos) */
  hq: number;
  /** atos no elenco (carreiras de negócio) */
  roster: number;
  /** fama dos atos novos do elenco / fama da banda (carreira de artista) */
  fame: number;
  /** equipe contratada no começo */
  staff: number;
  /** mercados onde já atua (1 = só a casa) */
  markets: number;
  /** mágoa inicial dos maiores rivais (0 = ninguém liga para você ainda) e quantos rivais */
  rivals: [number, number];
  /** dívida herdada, em múltiplos do caixa inicial (0 = nenhuma) */
  debt: number;
  /** potencial extra do elenco/banda (o hipster aposta em talento) */
  pot: number;
}

const N = (pt: string, en: string): L => l(pt, en);

/** A escada, em ordem de exibição. */
export const SITS29: SitDef29[] = [
  { id: 'zero', base: 'from_zero', name: N('Do zero (garagem)', 'From zero (garage)'), cash: 0.34, rep: {}, hq: 1, roster: 0, fame: 1, staff: 0, markets: 1, rivals: [0, 0], debt: 0, pot: 0,
    fx: N('Caixa curto, ninguém no elenco, nenhum nome: você monta tudo.', 'Short cash, nobody signed, no name: you build everything.') },
  { id: 'emerging', base: 'emerging', name: N('Emergente', 'Emerging'), cash: 1, rep: {}, hq: 1, roster: 1, fame: 12, staff: 0, markets: 1, rivals: [0, 0], debt: 0, pot: 0,
    fx: N('Caixa médio e um primeiro nome no elenco (ou uma banda que já toca na cidade).', 'Mid cash and a first name signed (or a band already playing around town).') },
  { id: 'mid', base: 'emerging', name: N('De porte médio', 'Mid-size'), cash: 2, rep: { artistic: 6, commercial: 8, artists: 4, institutional: 6 }, hq: 1, roster: 2, fame: 16, staff: 1, markets: 2, rivals: [0, 0], debt: 0, pot: 0,
    fx: N('Dois nomes, uma pessoa na equipe e um segundo mercado: já dá para errar uma vez.', 'Two names, one staffer and a second market: you can afford one mistake.') },
  { id: 'hipster', base: 'emerging', name: N('Hipster (cult)', 'Hipster (cult)'), cash: 0.8, rep: { artistic: 22, commercial: -8, artists: 12, institutional: 4 }, hq: 1, roster: 1, fame: 7, staff: 1, markets: 1, rivals: [0, 0], debt: 0, pot: 10,
    fx: N('Pequeno e respeitado: crítica e músicos te adoram, as rádios nem sabem quem você é.', 'Small and respected: critics and musicians love you, radio has no idea who you are.') },
  { id: 'established', base: 'established', name: N('Estabelecido', 'Established'), cash: 6.5, rep: { artistic: 8, commercial: 12, artists: 8, institutional: 10 }, hq: 2, roster: 3, fame: 18, staff: 3, markets: 3, rivals: [0, 0], debt: 0, pot: 0,
    fx: N('Três nomes, catálogo, equipe, três mercados e custos fixos maiores: mais a perder.', 'Three names, a catalog, staff, three markets and higher fixed costs: more to lose.') },
  { id: 'top5', base: 'established', name: N('Top 5', 'Top 5'), cash: 14, rep: { artistic: 14, commercial: 22, artists: 12, institutional: 18 }, hq: 3, roster: 5, fame: 28, staff: 5, markets: 5, rivals: [18, 3], debt: 0, pot: 0,
    fx: N('Um dos cinco maiores: elenco grande, sede cheia, folha pesada — e três rivais de olho em você.', 'One of the five biggest: a big roster, a full HQ, a heavy payroll — and three rivals watching you.') },
  { id: 'leader', base: 'established', name: N('Líder do mercado', 'Market leader'), cash: 28, rep: { artistic: 18, commercial: 32, artists: 14, institutional: 26 }, hq: 3, roster: 7, fame: 36, staff: 7, markets: 7, rivals: [30, 5], debt: 0, pot: 0,
    fx: N('O maior de todos: o mundo inteiro, a maior folha do mercado e todos os rivais querendo o seu trono.', 'The biggest of all: the whole world, the biggest payroll in the business and every rival after your throne.') },
  { id: 'fallen', base: 'established', name: N('Em crise (gigante caído)', 'In crisis (fallen giant)'), cash: 2.2, rep: { artistic: 6, commercial: 16, artists: -6, institutional: -12 }, hq: 2, roster: 3, fame: 22, staff: 2, markets: 3, rivals: [10, 2], debt: 1.6, pot: 0,
    fx: N('Nome grande, dívida grande: o banco cobra todo mês, os artistas desconfiam e os rivais sentem cheiro de sangue.', 'Big name, big debt: the bank collects every month, artists are wary and rivals smell blood.') },
];
export const SIT29_IDS = SITS29.map((x) => x.id);
export const sit29ById = (id?: string): SitDef29 | undefined => SITS29.find((x) => x.id === id);
const isSit29 = (x: unknown): x is Sit29 => typeof x === 'string' && (SIT29_IDS as string[]).includes(x);

/** Situação equivalente a um `scenario` antigo (quem não escolheu situação). */
export const sitOfScenario29 = (sc: ScenarioId | string | undefined): Sit29 => (sc === 'from_zero' ? 'zero' : sc === 'established' ? 'established' : 'emerging');
/** Situação de uma configuração: a escolhida ou a equivalente ao `scenario`. */
export const sitOf29 = (cfg: Pick<RunConfig, 'scenario'> & { start29?: string }): Sit29 => (isSit29(cfg.start29) ? cfg.start29 : sitOfScenario29(cfg.scenario));

/** Escolha da situação (o MESMO handler na Nova run rápida e na configuração completa): grava a situação e o scenario base. */
export function setStart29(cfg: RunConfig, id: Sit29): RunConfig {
  const d = sit29ById(id) ?? SITS29[1];
  cfg.start29 = d.id;
  cfg.scenario = d.base;
  return cfg;
}
/** Mantém situação e scenario coerentes (alguém trocou o scenario por outro caminho: predefinição, código de run…).
 *  Idempotente; é o "padrão do cartão" que a configuração completa aplica ao ser desenhada. */
export function syncStart29(cfg: RunConfig): RunConfig {
  const d = sit29ById(cfg.start29);
  if (!d || d.base !== cfg.scenario) cfg.start29 = sitOfScenario29(cfg.scenario);
  return cfg;
}

// ---------------------------------------------------------------- rótulo do status (carreira × situação)

/** Como a carreira se chama no status ('m'/'f' = concordância do adjetivo em português). */
const NOUN29: Record<string, [string, 'm' | 'f', string]> = {
  label: ['Selo', 'm', 'label'], musician: ['Artista', 'm', 'artist'], manager: ['Empresário', 'm', 'manager'], studio: ['Produtor', 'm', 'producer'],
  festival: ['Festival', 'm', 'festival'], booking: ['Agente de shows', 'm', 'booking agent'], venue: ['Casa de shows', 'f', 'venue'],
  publisher: ['Editora', 'f', 'publisher'], media: ['Veículo de mídia', 'm', 'media outlet'], platform: ['Plataforma', 'f', 'platform'],
  screen: ['Compositor de trilhas', 'm', 'screen composer'], critic: ['Crítico', 'm', 'critic'],
};
export const CAREERS29 = Object.keys(NOUN29);
/** Adjetivo da situação: [pt masculino, pt feminino, en (antes do nome) ou en com {n}]. */
const ADJ29: Record<Sit29, [string, string, string]> = {
  zero: ['iniciante', 'iniciante', 'Up-and-coming {n}'], emerging: ['emergente', 'emergente', 'Emerging {n}'], mid: ['de porte médio', 'de porte médio', 'Mid-size {n}'],
  hipster: ['hipster', 'hipster', 'Hipster {n}'], established: ['estabelecido', 'estabelecida', 'Established {n}'], top5: ['top 5', 'top 5', 'Top-5 {n}'],
  leader: ['líder do mercado', 'líder do mercado', 'Market-leading {n}'], fallen: ['em crise', 'em crise', '{N} in crisis'],
};
const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);

/** "Artista iniciante", "Produtor top 5", "Empresário líder do mercado", "Casa de shows estabelecida"… */
export function statusLabel29(career: string | undefined, sit: Sit29 | string | undefined): L {
  const [pt, g, en] = NOUN29[career ?? 'label'] ?? NOUN29.label;
  const s = isSit29(sit) ? sit : 'emerging';
  const [m, f, e] = ADJ29[s];
  return l(`${pt} ${g === 'f' ? f : m}`, e.replace('{n}', en).replace('{N}', cap(en)));
}
/** Carreira que dá nome ao status (a primeira principal; sem nenhuma, selo). */
export const careerOf29 = (cfg: Pick<RunConfig, 'careers' | 'role'>): string => cfg.careers?.main?.[0] ?? (cfg.role === 'artist' ? 'musician' : 'label');
/** Status da configuração inteira. */
export const statusOf29 = (cfg: RunConfig): L => statusLabel29(careerOf29(cfg), sitOf29(cfg));

// ---------------------------------------------------------------- convivência com o começo sorteado (r28 F4)

/** Começos sorteados que só fazem sentido para quem ainda é pequeno (o texto fala de "primeiro projeto", "fiado"…). */
const SMALL_ONLY28 = new Set(['calm', 'inherit', 'debt', 'critic']);
/** O começo sorteado do r28 combina com a situação escolhida? (não combina → é pulado, não contradiz o status) */
export function start28Fits29(start28: string | undefined, sit: Sit29 | string | undefined): boolean {
  if (!start28) return true;
  const d = sit29ById(sit);
  if (!d) return true;
  const big = d.id === 'established' || d.id === 'top5' || d.id === 'leader' || d.id === 'fallen';
  return !(big && SMALL_ONLY28.has(start28));
}
