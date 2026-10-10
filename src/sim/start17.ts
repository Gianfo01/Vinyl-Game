// Rodada 17 — Novo Jogo simplificado: um só seletor de "Mundo" (junta modo, nomes reais, mortes reais e modo de
// história, que se sobrepunham), predefinições (Recomendado/Historiador/Sandbox/Desafio), dificuldade detalhada em
// 4 eixos com efeito explicado, prazo da partida com pontuação final, avisos de combinações e código de partida.
// Puro (sem DOM): a interface fica em src/ui/newgame17.ts; os efeitos na simulação em src/sim/sys/start17.ts.

import { l, type L } from '../data/world';
import type { RunConfig } from './types';

// ---------------------------------------------------------------- modos de mundo

export interface World17 { id: string; name: L; desc: L; fx: L; apply: (c: RunConfig) => void; isNew?: boolean }

const base = (c: RunConfig, o: Partial<RunConfig>) => { delete c.snap17; Object.assign(c, o); };

export const WORLDS17: World17[] = [
  { id: 'real', name: l('Vida real com variações (recomendado)', 'Real life with variations (recommended)'),
    desc: l('Artistas, selos, festivais e prêmios reais; discos e formações reais nos anos reais, mas a simulação improvisa (discos, brigas, separações).', 'Real artists, labels, festivals and awards; real albums and lineups in their real years, but the sim improvises (albums, feuds, splits).'),
    fx: l('Nomes reais ✓ · roteiro real como base · mortes reais só se você ligar · tecnologia em janelas de anos', 'Real names ✓ · real script as a base · real deaths only if you turn it on · technology within year windows'),
    apply: (c) => base(c, { realNames: true, history: 'loose', mode: 'free', realFates: false }) },
  { id: 'exact', name: l('Vida real exata', 'Exact real life'),
    desc: l('Tudo como aconteceu: discos nas datas reais, mortes, separações e voltas — até você interferir (contratar um artista muda a história dele).', 'Everything as it happened: albums on real dates, deaths, splits and reunions — until you interfere (signing an act changes their story).'),
    fx: l('Nomes reais ✓ · mortes reais ✓ · formatos e tecnologias nas datas fixas · nada inventado para artistas reais', 'Real names ✓ · real deaths ✓ · formats and tech on fixed dates · nothing invented for real acts'),
    apply: (c) => base(c, { realNames: true, history: 'strict', mode: 'historic', realFates: true }) },
  { id: 'snap', isNew: true, name: l('Real até o início, imprevisível depois', 'Real until the start, unpredictable after'),
    desc: l('O mundo no ano inicial é o real (quem já estreou, com a carreira real até ali). Daí em diante nada está escrito: os artistas reais seguem carreiras simuladas e quem estrearia depois do seu início nunca aparece — no lugar, surgem artistas novos inventados.', 'The world in the start year is the real one (who already debuted, with their real career so far). From then on nothing is written: real acts follow simulated careers and anyone who would debut after your start never appears — invented newcomers take their place.'),
    fx: l('Nomes reais até o início · sem estreias reais futuras · sem mortes reais programadas · você não sabe quem será o próximo ídolo', 'Real names up to the start · no future real debuts · no scheduled real deaths · you never know who the next idol is'),
    apply: (c) => base(c, { realNames: true, history: 'free', mode: 'free', realFates: false, snap17: true }) },
  { id: 'random', name: l('Personagens reais, história aleatória', 'Real characters, random history'),
    desc: l('As pessoas reais existem e estreiam perto do ano real, com talento real; mas discos, formações, separações e mortes são sorteados.', 'Real people exist and debut near their real year with real talent; but albums, lineups, splits and deaths are rolled.'),
    fx: l('Nomes reais ✓ · estreias reais ✓ · carreiras sorteadas · mortes reais ignoradas', 'Real names ✓ · real debuts ✓ · rolled careers · real deaths ignored'),
    apply: (c) => base(c, { realNames: true, history: 'free', mode: 'free', realFates: false }) },
  { id: 'fiction', name: l('Universo ficcional', 'Fictional universe'),
    desc: l('Mesmas mecânicas e épocas, mas artistas, selos, festivais e prêmios com nomes inventados.', 'Same mechanics and eras, but acts, labels, festivals and awards with invented names.'),
    fx: l('Nomes reais ✗ · ninguém sabe o futuro, nem você', 'Real names ✗ · nobody knows the future, not even you'),
    apply: (c) => base(c, { realNames: false, history: 'loose', mode: 'free', realFates: false }) },
  { id: 'chaos', name: l('Caos histórico', 'Historical chaos'),
    desc: l('Tecnologias e formatos chegam em datas sorteadas (o streaming pode vir antes do CD), um quarto dos artistas reais nunca surge e a história é aleatória.', 'Technologies and formats arrive on rolled dates (streaming may come before the CD), a quarter of real acts never show up and history is random.'),
    fx: l('Nomes reais ✓ · datas de tecnologia sorteadas · carreiras sorteadas · muito imprevisível', 'Real names ✓ · rolled tech dates · rolled careers · very unpredictable'),
    apply: (c) => base(c, { realNames: true, history: 'free', mode: 'chaos', realFates: false }) },
];
export const world17ById = Object.fromEntries(WORLDS17.map((w) => [w.id, w])) as Record<string, World17>;

/** Modo de mundo de uma configuração (lê os campos antigos quando world17 não existe). */
export function worldOf17(c: RunConfig): string {
  if (c.world17 && world17ById[c.world17]) return c.world17;
  if (c.realNames === false) return 'fiction';
  if (c.mode === 'chaos') return 'chaos';
  if (c.history === 'strict') return 'exact';
  if (c.snap17) return 'snap';
  if (c.history === 'free') return 'random';
  return 'real';
}

export function applyWorld17(c: RunConfig, id: string): void {
  const w = world17ById[id] ?? world17ById.real;
  w.apply(c);
  c.world17 = w.id;
}

// ---------------------------------------------------------------- dificuldade detalhada

export type DiffAxis = 'market' | 'costs' | 'rivals' | 'talent';
export const DIFF17: { id: DiffAxis; name: L; help: L; step: (v: number) => L }[] = [
  { id: 'market', name: l('Público e mercado', 'Audience and market'), help: l('Quanto o público compra e ouve: muda o apelo de todos os seus lançamentos e shows.', 'How much the audience buys and listens: changes the appeal of all your releases and shows.'),
    step: (v) => ({ pt: `Apelo dos seus lançamentos ${v >= 0 ? '+' : ''}${v * 8}%`, en: `Your releases' appeal ${v >= 0 ? '+' : ''}${v * 8}%` }) },
  { id: 'costs', name: l('Custos', 'Costs'), help: l('Fabricação de discos e salários da equipe. Positivo = mais barato (mais fácil).', 'Record manufacturing and staff salaries. Positive = cheaper (easier).'),
    step: (v) => ({ pt: `Fabricação e salários ${v > 0 ? '−' : v < 0 ? '+' : '±'}${Math.abs(v) * 8}%`, en: `Manufacturing and salaries ${v > 0 ? '−' : v < 0 ? '+' : '±'}${Math.abs(v) * 8}%` }) },
  { id: 'rivals', name: l('Rivais', 'Rivals'), help: l('Agressividade das gravadoras rivais em leilões, aliciamento e propostas. Positivo = rivais mansos (mais fácil).', 'How aggressive rival labels are in auctions, poaching and bids. Positive = tame rivals (easier).'),
    step: (v) => ({ pt: `Agressividade dos rivais ×${(1 - v * 0.2).toFixed(1)} · suas propostas ${v >= 0 ? '+' : ''}${v * 2} pts`, en: `Rival aggression ×${(1 - v * 0.2).toFixed(1)} · your offers ${v >= 0 ? '+' : ''}${v * 2} pts` }) },
  { id: 'talent', name: l('Talento disponível', 'Available talent'), help: l('Quantos sinais de talento (artistas para descobrir) chegam por mês aos seus olheiros.', 'How many talent signals (acts to discover) reach your scouts each month.'),
    step: (v) => ({ pt: `Sinais de talento ${v >= 0 ? '+' : ''}${v * 0.5}/mês`, en: `Talent signals ${v >= 0 ? '+' : ''}${v * 0.5}/month` }) },
];

/** Valores de perk que cada eixo de dificuldade vale (0 = neutro). */
export function diffPerks17(d: RunConfig['diff17']): Record<string, number> {
  const v = (k: DiffAxis) => Math.max(-2, Math.min(2, Math.round(d?.[k] ?? 0)));
  const out: Record<string, number> = {};
  if (v('market')) { out.appeal = v('market') * 0.08; out.showRevenue = v('market') * 0.05; }
  if (v('costs')) { out.pressingCost = -v('costs') * 0.08; out.staffCost = -v('costs') * 0.08; }
  if (v('rivals')) out.offer = v('rivals') * 0.02;
  if (v('talent')) out.signals = v('talent') * 0.5;
  return out;
}
export const rivalAggr17 = (d: RunConfig['diff17']): number => 1 - Math.max(-2, Math.min(2, d?.rivals ?? 0)) * 0.2;

// ---------------------------------------------------------------- prazo e pontuação

export const RUN_YEARS17 = [0, 10, 20, 30];
/** Patentes da pontuação final (por ano jogado: compara partidas de prazos diferentes). */
export const RANKS17: { min: number; name: L }[] = [
  { min: 0, name: l('Selo de garagem', 'Garage label') },
  { min: 60, name: l('Selo independente respeitado', 'Respected indie') },
  { min: 160, name: l('Potência regional', 'Regional powerhouse') },
  { min: 350, name: l('Gravadora major', 'Major label') },
  { min: 700, name: l('Império da música', 'Music empire') },
  { min: 1300, name: l('Lenda da indústria', 'Industry legend') },
];
export const rank17 = (score: number, years: number): L => {
  const per = score / Math.max(1, years);
  return [...RANKS17].reverse().find((r) => per >= r.min)!.name;
};

// ---------------------------------------------------------------- predefinições

export interface Preset17 { id: string; name: L; desc: L; apply: (c: RunConfig) => void }
export const PRESETS17: Preset17[] = [
  { id: 'rec', name: l('Recomendado', 'Recommended'), desc: l('Primeira partida: mundo real com variações, dificuldade normal, sem prazo, tudo explicado.', 'First run: real world with variations, normal difficulty, no deadline, everything explained.'),
    apply: (c) => { applyWorld17(c, 'real'); Object.assign(c, { difficulty: 'normal', ironman: false, mutators: [], card: 'none', storyteller: 'maestro', freedom17: 'normal', dbSize: 'medium', runYears17: 0, diff17: {}, scenario: 'from_zero', custom: {} }); c.realFates = false; } },
  { id: 'hist', name: l('Historiador', 'Historian'), desc: l('A história exata, com mortes e discos nas datas reais, base de dados grande e NPCs contidos. Para reviver as épocas.', 'Exact history, deaths and albums on real dates, a large database and restrained NPCs. To relive the eras.'),
    apply: (c) => { applyWorld17(c, 'exact'); Object.assign(c, { difficulty: 'normal', ironman: false, mutators: [], storyteller: 'maestro', freedom17: 'tight', dbSize: 'large', runYears17: 0, diff17: {} }); } },
  { id: 'sandbox', name: l('Sandbox', 'Sandbox'), desc: l('Para experimentar: empresa estabelecida, caixa alto, custos menores, público generoso e mundo solto.', 'To experiment: established company, big cash, lower costs, a generous audience and an unleashed world.'),
    apply: (c) => { applyWorld17(c, 'random'); Object.assign(c, { difficulty: 'easy', ironman: false, scenario: 'established', freedom17: 'wild', runYears17: 0, diff17: { market: 1, costs: 2, rivals: 1, talent: 2 }, custom: { ...(c.custom ?? {}), cash: 400000, personalCash: 50000 } }); } },
  { id: 'challenge', name: l('Desafio', 'Challenge'), desc: l('Ironman (sem desfazer, um save só), difícil, rivais agressivos, real até o início e 20 anos para a maior pontuação.', 'Ironman (no undo, one save), hard, aggressive rivals, real until the start and 20 years for the best score.'),
    apply: (c) => { applyWorld17(c, 'snap'); Object.assign(c, { difficulty: 'hard', ironman: true, scenario: 'from_zero', freedom17: 'wild', runYears17: 20, diff17: { market: -1, costs: -1, rivals: -1, talent: 0 }, custom: {} }); } },
];
export const preset17ById = Object.fromEntries(PRESETS17.map((p) => [p.id, p])) as Record<string, Preset17>;
export function applyPreset17(c: RunConfig, id: string): void {
  const p = preset17ById[id];
  if (!p) return;
  p.apply(c);
  c.preset17 = id;
}

// ---------------------------------------------------------------- avisos (combinações que se anulam ou surpreendem)

export function notes17(c: RunConfig): { level: 'warn' | 'info'; text: L }[] {
  const out: { level: 'warn' | 'info'; text: L }[] = [];
  const w = worldOf17(c);
  if (c.realFates && w !== 'exact' && c.mode !== 'historic') out.push({ level: 'warn', text: l('"Mortes nos anos reais" só vale com a tecnologia em datas fixas (mundo "Vida real exata"). Aqui não terá efeito.', '"Deaths in their real years" only works with fixed tech dates ("Exact real life" world). It has no effect here.') });
  if (c.takeover && c.scenario !== 'from_zero') out.push({ level: 'info', text: l('Assumindo uma gravadora, o ponto de partida (do zero/emergente/estabelecido) é ignorado: vale o que a gravadora tem.', 'Taking over a label ignores the starting point (zero/emerging/established): what the label has is what you get.') });
  if (c.scenario17 && c.takeover) out.push({ level: 'warn', text: l('Cenário histórico + assumir gravadora: a meta do cenário conta a partir do que a gravadora já tem.', 'Historical scenario + takeover: the scenario goal counts from what the label already has.') });
  if (c.ironman && (c.runYears17 ?? 0) === 0) out.push({ level: 'info', text: l('Ironman sem prazo: um único save, sem desfazer, até o fim da sua dinastia.', 'Ironman with no deadline: a single save, no undo, until your dynasty ends.') });
  if (c.difficulty === 'hard' && (c.custom?.cash ?? 0) > 200000) out.push({ level: 'info', text: l('Difícil com caixa inicial alto: o caixa personalizado substitui o corte de 30% da dificuldade.', 'Hard with high starting cash: the custom cash replaces the difficulty\'s 30% cut.') });
  if (w === 'snap' && c.startYear >= 2030) out.push({ level: 'info', text: l('Começando em 2030+, quase não há estreias reais futuras: "Real até o início" fica parecido com "Vida real com variações".', 'Starting in 2030+, there are hardly any future real debuts: "Real until the start" feels like "Real life with variations".') });
  if (w === 'fiction' && c.scenario17) out.push({ level: 'info', text: l('Cenário histórico em universo ficcional: datas e cidades reais, nomes inventados.', 'Historical scenario in a fictional universe: real dates and cities, invented names.') });
  return out;
}

// ---------------------------------------------------------------- código de partida (compartilhar a mesma configuração)

export const CODE17 = 'MST17:';
export function setupCode17(c: RunConfig): string {
  const json = JSON.stringify(c, (_k, v) => (v === undefined ? undefined : v));
  return CODE17 + btoa(unescape(encodeURIComponent(json)));
}
export function readSetupCode17(code: string): RunConfig | null {
  const t = code.replace(/\s+/g, '');
  const i = t.indexOf(CODE17);
  if (i < 0) return null;
  try {
    const c = JSON.parse(decodeURIComponent(escape(atob(t.slice(i + CODE17.length))))) as RunConfig;
    if (!c || typeof c.seed !== 'string' || typeof c.startYear !== 'number' || !c.homeCity) return null;
    c.startYear = Math.max(1920, Math.min(2039, Math.round(c.startYear)));
    c.contentFilters ??= [];
    c.mutators ??= [];
    return c;
  } catch {
    return null;
  }
}
