// Rodada 17 — Novo Jogo simplificado: um só seletor de "Mundo" (junta modo, nomes reais, mortes reais e modo de
// história, que se sobrepunham), predefinições (Recomendado/Historiador/Sandbox/Desafio), dificuldade detalhada em
// 4 eixos com efeito explicado, prazo da partida com pontuação final, avisos de combinações e código de partida.
// Puro (sem DOM): a interface fica em src/ui/newgame17.ts; os efeitos na simulação em src/sim/sys/start17.ts.

import { l, type L } from '../data/world';
import type { RunConfig } from './types';
import { CONFIG_SCHEMA_V20, YEAR_MAX20, YEAR_MIN20, legacyConfig20, stampPolicy20 } from './worldpolicy20';
import { lineup29Of } from './lineup29';

// ---------------------------------------------------------------- modos de mundo

export interface World17 { id: string; name: L; desc: L; fx: L; apply: (c: RunConfig) => void; isNew?: boolean; /** r20: frase curta da lista */ short?: L }

const base = (c: RunConfig, o: Partial<RunConfig>, id: string) => { delete c.snap17; Object.assign(c, o); stampPolicy20(c, id); };

// r20 (G8): `random` é o padrão das novas runs (estado inicial simulado, política v2) e vem primeiro; Fidelidade
// histórica logo em seguida, para não virar opção escondida. Os seis modos continuam; ids preservados.
export const WORLDS17: World17[] = [
  { id: 'random', name: l('Reais em mundo aleatório', 'Real names, random world'),
    // R29 (formação): nomes reais e formações iniciais reais (a mais famosa por padrão); o resto é inventado
    short: l('Nomes e formações iniciais reais (a mais famosa, por padrão). Músicas, contratos, trocas de formação e carreiras inventados a cada mundo.', 'Real names and starting lineups (the most famous, by default). Songs, contracts, lineup changes and careers invented in every world.'),
    desc: l('Artistas e gravadoras reais vivem outra história. Repertórios, contratos, vínculos e trajetórias são simulados desde o estado inicial. A época continua coerente; o futuro não é uma lista de hits garantidos.', 'Real acts and labels live another story. Repertoire, contracts, ties and careers are simulated from the starting state. The era stays coherent; the future is not a list of guaranteed hits.'),
    fx: l('Real: nomes, referências de identidade e formações iniciais (a mais famosa, por padrão) · Inventado: catálogo, contratos, vínculos, trocas de formação, sucesso e trajetória · Época coerente: não é Caos; tecnologia e disponibilidade seguem o período', 'Real: names, identity references and starting lineups (the most famous, by default) · Invented: catalog, contracts, ties, lineup changes, success and career · Coherent era: not Chaos; tech and availability follow the period'),
    apply: (c) => base(c, { realNames: true, history: 'free', mode: 'free', realFates: false }, 'random') },
  { id: 'exact', name: l('Fidelidade histórica', 'Historical fidelity'),
    short: l('Reviva o roteiro documentado; suas intervenções podem mudar carreiras.', 'Relive the documented script; your interventions can change careers.'),
    desc: l('O único modo que segue o roteiro real: discos nas datas reais, mortes, separações e voltas; pessoas reais só vivem fatos documentados — até você interferir (contratar um artista muda a história dele). Conforme a cobertura da base histórica (fatos documentados até 2025; datas conhecidas só pelo ano não são dia exato).', 'The only mode that follows the real script: albums on real dates, deaths, splits and reunions; real people only live documented facts — until you interfere (signing an act changes their story). As far as the historical database covers (documented facts up to 2025; dates known only by year are not exact days).'),
    fx: l('Eventos documentados seguem o roteiro. Intervenções suas podem alterar carreiras · nomes reais ✓ · mortes reais ✓ · tecnologia nas datas fixas', 'Documented events follow the script. Your interventions can change careers · real names ✓ · real deaths ✓ · tech on fixed dates'),
    apply: (c) => base(c, { realNames: true, history: 'strict', mode: 'historic', realFates: true }, 'exact') },
  { id: 'real', name: l('Real até o início, história alternativa depois', 'Real until the start, alternate history after'),
    short: l('Comece do mundo conhecido e mude o que vem depois.', 'Start from the known world and change what comes next.'),
    desc: l('História alternativa: o mundo real (artistas, selos, festivais, prêmios e a carreira de cada um até o ano inicial) é a base; dali em diante tudo é sorteado — discos, formações, separações, voltas, mortes, casos, crimes e mudanças de carreira, para gente real ou inventada. Estreias reais ainda acontecem perto do ano real.', 'Alternate history: the real world (acts, labels, festivals, awards and everyone\'s career up to the start year) is the base; from then on everything is rolled — albums, lineups, splits, comebacks, deaths, affairs, crimes and career changes, for real or invented people. Real debuts still happen near their real year.'),
    fx: l('A história é real até o começo. Depois, a simulação assume · estreias reais ✓ · sexualidade só a documentada para quem é publicamente assumido', 'History is real until the start. Then the simulation takes over · real debuts ✓ · sexuality only as documented for publicly out people'),
    apply: (c) => base(c, { realNames: true, history: 'loose', mode: 'free', realFates: false }, 'real') },
  { id: 'snap', name: l('Real até o início, sem estreias reais depois', 'Real until the start, no real debuts after'),
    short: l('A base é conhecida; os próximos ídolos serão novos.', 'The base is known; the next idols will be new.'),
    desc: l('O mundo no ano inicial é o real (quem já estreou, com a carreira real até ali). Daí em diante nada está escrito: os artistas reais seguem carreiras simuladas e quem estrearia depois do seu início nunca aparece — no lugar, surgem artistas novos inventados.', 'The world in the start year is the real one (who already debuted, with their real career so far). From then on nothing is written: real acts follow simulated careers and anyone who would debut after your start never appears — invented newcomers take their place.'),
    fx: l('História alternativa · nomes reais até o início · sem estreias, discos, mortes, voltas, covers ou relíquias reais futuras · você não sabe quem será o próximo ídolo', 'Alternate history · real names up to the start · no future real debuts, albums, deaths, reunions, covers or relics · you never know who the next idol is'),
    apply: (c) => base(c, { realNames: true, history: 'free', mode: 'free', realFates: false, snap17: true }, 'snap') },
  { id: 'fiction', name: l('Universo ficcional', 'Fictional universe'),
    short: l('Artistas e empresas inventados, com a mesma profundidade.', 'Invented acts and companies, with the same depth.'),
    desc: l('Mesmas mecânicas e épocas, mas artistas, selos, festivais e prêmios com nomes inventados.', 'Same mechanics and eras, but acts, labels, festivals and awards with invented names.'),
    fx: l('Nomes reais ✗ · ninguém sabe o futuro, nem você', 'Real names ✗ · nobody knows the future, not even you'),
    apply: (c) => base(c, { realNames: false, history: 'loose', mode: 'free', realFates: false }, 'fiction') },
  { id: 'chaos', name: l('Caos histórico', 'Historical chaos'),
    short: l('A história e a tecnologia podem seguir outra ordem.', 'History and technology may follow another order.'),
    desc: l('Tecnologias e formatos chegam em datas sorteadas (o streaming pode vir antes do CD), um quarto dos artistas reais nunca surge e a história é aleatória.', 'Technologies and formats arrive on rolled dates (streaming may come before the CD), a quarter of real acts never show up and history is random.'),
    fx: l('História alternativa · nomes reais ✓ · datas de tecnologia sorteadas · carreiras sorteadas · muito imprevisível', 'Alternate history · real names ✓ · rolled tech dates · rolled careers · very unpredictable'),
    apply: (c) => base(c, { realNames: true, history: 'free', mode: 'chaos', realFates: false }, 'chaos') },
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
  const w = world17ById[id] ?? world17ById.random;
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
/** Patentes da pontuação final (por ano jogado: compara partidas de prazos diferentes). Calibrado com o playbot
 * equilibrado (≈ 390–540 pontos/ano em 10 anos, sem falência): o bot fica entre "Potência regional" e "Major". */
export const RANKS17: { min: number; name: L }[] = [
  { min: 0, name: l('Selo de garagem', 'Garage label') },
  { min: 120, name: l('Selo independente respeitado', 'Respected indie') },
  { min: 250, name: l('Potência regional', 'Regional powerhouse') },
  { min: 400, name: l('Gravadora major', 'Major label') },
  { min: 600, name: l('Império da música', 'Music empire') },
  { min: 900, name: l('Lenda da indústria', 'Industry legend') },
];
export const rank17 = (score: number, years: number): L => {
  const per = score / Math.max(1, years);
  return [...RANKS17].reverse().find((r) => per >= r.min)!.name;
};

// ---------------------------------------------------------------- predefinições

export interface Preset17 { id: string; name: L; desc: L; apply: (c: RunConfig) => void }
export const PRESETS17: Preset17[] = [
  // r28 (F4, decisão do autor): o Recomendado sugere um fim (25 anos), editável; ao chegar lá dá para continuar em sandbox
  { id: 'rec', name: l('Recomendado', 'Recommended'), desc: l('Entidades reais, mundo simulado, dificuldade normal e ajuda disponível. Sugere um fim em 25 anos (editável; depois dá para continuar em sandbox).', 'Real entities, a simulated world, normal difficulty and help available. Suggests an end in 25 years (editable; you can keep playing in sandbox afterwards).'),
    apply: (c) => { applyWorld17(c, 'random'); Object.assign(c, { difficulty: 'normal', ironman: false, mutators: [], storyteller: 'maestro', freedom17: 'normal', dbSize: 'medium', runYears17: 25, diff17: {}, scenario: 'from_zero', custom: {} }); c.realFates = false; } },
  { id: 'hist', name: l('Historiador', 'Historian'), desc: l('Fidelidade ao roteiro documentado e acesso à referência histórica: mortes e discos nas datas reais, base grande e NPCs contidos.', 'Fidelity to the documented script and access to the historical reference: deaths and albums on real dates, a large database and restrained NPCs.'),
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
  if (c.realFates && w !== 'exact' && c.mode !== 'historic') out.push({ level: 'warn', text: l('"Mortes nos anos reais" só vale com a tecnologia em datas fixas (mundo "Fidelidade histórica"). Aqui não terá efeito.', '"Deaths in their real years" only works with fixed tech dates ("Historical fidelity" world). It has no effect here.') });
  if (c.takeover && c.scenario !== 'from_zero') out.push({ level: 'info', text: l('Assumindo uma gravadora, o ponto de partida (do zero/emergente/estabelecido) é ignorado: vale o que a gravadora tem.', 'Taking over a label ignores the starting point (zero/emerging/established): what the label has is what you get.') });
  // r29: nível dos rivais × escolhas que têm precedência sobre ele
  if (c.rivals29 && c.labels?.start && c.labels.start !== 'history') out.push({ level: 'warn', text: l('Nível dos rivais ignorado: o "Como começam" das gravadoras está definido e manda no mercado inicial.', 'Rival level ignored: the labels\' "How they start" is set and rules the starting market.') });
  if (c.rivals29 && c.takeover && !c.scenario17) out.push({ level: 'info', text: l('Assumindo uma gravadora, o nível dos rivais é ignorado: o mercado fica como a história o deixou.', 'Taking over a label ignores the rival level: the market stays as history left it.') });
  if (c.scenario17 && c.takeover) out.push({ level: 'warn', text: l('Cenário histórico + assumir gravadora: a meta do cenário conta a partir do que a gravadora já tem.', 'Historical scenario + takeover: the scenario goal counts from what the label already has.') });
  if (c.ironman && (c.runYears17 ?? 0) === 0) out.push({ level: 'info', text: l('Ironman sem prazo: um único save, sem desfazer, até o fim da sua dinastia.', 'Ironman with no deadline: a single save, no undo, until your dynasty ends.') });
  if (c.difficulty === 'hard' && (c.custom?.cash ?? 0) > 200000) out.push({ level: 'info', text: l('Difícil com caixa inicial alto: o caixa personalizado substitui o corte de 30% da dificuldade.', 'Hard with high starting cash: the custom cash replaces the difficulty\'s 30% cut.') });
  if (w === 'snap' && c.startYear >= 2030) out.push({ level: 'info', text: l('Começando em 2030+, quase não há estreias reais futuras: "Real até o início" fica parecido com "Real até o início, história alternativa depois".', 'Starting in 2030+, there are hardly any future real debuts: "Real until the start" feels like "Real until the start, alternate history after".') });
  if (w === 'fiction' && c.scenario17) out.push({ level: 'info', text: l('Cenário histórico em universo ficcional: datas e cidades reais, nomes inventados.', 'Historical scenario in a fictional universe: real dates and cities, invented names.') });
  // r20 (G8): contrato efetivo do mundo, configuração legada e cobertura documental
  const rs = resolveWorld20(c);
  if (rs.custom) { const d = rs.diffs.join(', '); out.push({ level: 'warn', text: l(`Mundo personalizado: os ajustes avançados (${d}) não batem mais com o modo escolhido. O resumo mostra o que o motor vai executar.`, `Custom world: the advanced tweaks (${d}) no longer match the chosen mode. The summary shows what the engine will run.`) }); }
  if (w === 'random' && legacyConfig20(c)) out.push({ level: 'info', text: l('Configuração legada (código/save antigo): "Personagens reais, história alternativa" com a geração antiga — o começo usa a base histórica. Use "Adaptar ao novo padrão" para simular também o estado inicial.', 'Legacy configuration (old code/save): "Real characters, alternate history" with the old generation — the start uses the historical base. Use "Adapt to the new default" to simulate the starting state too.') });
  if (w === 'random' && !legacyConfig20(c)) out.push({ level: 'info', text: lineup29Of(c)
    // R29 (formação): a formação inicial é a real escolhida; as trocas depois são da simulação
    ? (lineup29Of(c) === 'original'
      ? l('Cada banda real começa com a formação original (da estreia); quem não está nela existe sem banda. Repertórios, contratos, vínculos e trocas de formação são simulados pela semente; identidade e época continuam reais.', 'Each real band starts with its original lineup (at debut); everyone else exists without a band. Repertoire, contracts, ties and lineup changes are simulated from the seed; identity and era stay real.')
      : l('Cada banda real começa com a formação mais famosa; quem não está nela existe sem banda. Repertórios, contratos, vínculos e trocas de formação são simulados pela semente; identidade e época continuam reais.', 'Each real band starts with its most famous lineup; everyone else exists without a band. Repertoire, contracts, ties and lineup changes are simulated from the seed; identity and era stay real.'))
    : l('Repertórios, formações, contratos e vínculos iniciais são simulados pela semente; identidade e época continuam reais.', 'Starting repertoire, lineups, contracts and ties are simulated from the seed; identity and era stay real.') });
  if (w === 'exact' && c.startYear >= 2026) out.push({ level: 'info', text: l('Fidelidade histórica conforme a cobertura da base: depois de 2025 não há fatos documentados — o roteiro real acaba e a simulação assume.', 'Historical fidelity as far as the database covers: after 2025 there are no documented facts — the real script ends and the simulation takes over.') });
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
    if ((c.configSchemaVersion ?? 1) > CONFIG_SCHEMA_V20) return null; // r20: código de versão futura: recusa sem tocar no rascunho
    c.startYear = Math.max(YEAR_MIN20, Math.min(YEAR_MAX20, Math.round(c.startYear)));
    c.contentFilters ??= [];
    c.mutators ??= [];
    return c;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- r20 (G8): fábrica única + configuração resolvida

/** Fábrica ÚNICA de configurações novas (Novo Jogo, "Restaurar padrão", rota de cenários). `kind: 'free'` = nova run
 * livre com o padrão atual (Reais em mundo aleatório, política v2); `kind: 'scenario'` = rota rápida de cenários
 * históricos, que mantém o contrato próprio (tecnologia nas datas fixas, sem nomes reais forçados) explicitamente.
 * Os outros defaults não mudam: 1962, Londres, selo do zero, dificuldade normal. */
export function newRunConfig20(o: { seed: string; companyName: string; kind?: 'free' | 'scenario' }): RunConfig {
  const c: RunConfig = {
    seed: o.seed, role: 'label', scenario: 'from_zero', startYear: 1962, mode: 'free', storyteller: 'maestro', mutators: [],
    difficulty: 'normal', ironman: false, homeCity: 'london', companyName: o.companyName, bandName: '', bandGenre: 'rnr', contentFilters: [], custom: {},
  };
  if (o.kind === 'scenario') {
    // contrato histórico dos cenários rápidos (igual ao de sempre), agora declarado e versionado
    Object.assign(c, { mode: 'historic' });
    delete c.custom;
    c.configSchemaVersion = CONFIG_SCHEMA_V20;
    c.worldPolicyVersion = 2;
    c.initialWorldPolicy = 'historical';
    return c;
  }
  applyPreset17(c, 'rec');
  c.genre29 = 0; // r29: rascunho novo — gênero da banda sugerido pela cidade e pelo ano (genre29data; draftDefaults27)
  return c;
}

const WKEYS20 = ['realNames', 'history', 'mode', 'realFates', 'snap17'] as const;
const WNAME20: Record<(typeof WKEYS20)[number], L> = {
  realNames: l('nomes reais', 'real names'), history: l('história', 'history'), mode: l('linha do tempo da tecnologia', 'technology timeline'),
  realFates: l('mortes nos anos reais', 'deaths in real years'), snap17: l('estreias reais futuras', 'future real debuts'),
};
const norm20 = (k: string, v: unknown) => (k === 'realFates' || k === 'snap17' ? !!v : k === 'history' ? v ?? 'loose' : k === 'realNames' ? !!v : v);

/** Configuração RESOLVIDA do mundo: o modo + se os campos efetivos ainda batem com ele (senão "Personalizado"). */
export function resolveWorld20(c: RunConfig): { id: string; custom: boolean; diffs: string[]; diffL: L[] } {
  const id = worldOf17(c);
  const ref = { ...c } as RunConfig;
  world17ById[id].apply(ref);
  const bad = WKEYS20.filter((k) => norm20(k, ref[k]) !== norm20(k, c[k]));
  return { id, custom: bad.length > 0, diffs: bad.map((k) => WNAME20[k].pt), diffL: bad.map((k) => WNAME20[k]) };
}

/** Campos que uma predefinição mudaria agora (vazio = a configuração ainda é a da predefinição). */
export function presetDiff20(c: RunConfig, id: string): string[] {
  const ref = JSON.parse(JSON.stringify(c)) as RunConfig;
  applyPreset17(ref, id);
  const keys = new Set([...Object.keys(ref), ...Object.keys(c)]);
  return [...keys].filter((k) => k !== 'preset17' && JSON.stringify((ref as unknown as Record<string, unknown>)[k] ?? null) !== JSON.stringify((c as unknown as Record<string, unknown>)[k] ?? null));
}

/** Política explícita de um código/save: 'legacy' (sem versão), 'current' ou 'future' (recusado). */
export function codeStatus20(c: RunConfig): 'legacy' | 'current' | 'future' {
  if ((c.configSchemaVersion ?? 1) > CONFIG_SCHEMA_V20) return 'future';
  return legacyConfig20(c) ? 'legacy' : 'current';
}

/** Por que um código não foi aceito: 'future' (versão mais nova) ou 'invalid'. */
export function setupCodeError20(code: string): 'future' | 'invalid' {
  try {
    const t = code.replace(/\s+/g, '');
    const i = t.indexOf(CODE17);
    if (i < 0) return 'invalid';
    const c = JSON.parse(decodeURIComponent(escape(atob(t.slice(i + CODE17.length))))) as RunConfig;
    return (c?.configSchemaVersion ?? 1) > CONFIG_SCHEMA_V20 ? 'future' : 'invalid';
  } catch { return 'invalid'; }
}
