// R29 (CONECTAR TUDO): sonda de influência entre os 13 sistemas do jogo. Mesma semente, estado A × estado B (B = A com
// UMA entrada mexida num sistema) e mede as saídas de todos os outros sistemas:
//  - "pura": função determinística lida logo depois do empurrão (apelo, oferta, risco de crime, nota da gravação…);
//  - "mês": o estado A e o B avançam 6 semanas (mesma semente, mesmos fluxos de RNG por sistema) e compara-se o resultado
//    (6 semanas; caixa, reputação, fama, calor policial, estresse…) — pega as arestas que só existem nos ganchos.
// Só leitura sobre clones; não registra gancho nenhum. Usado por scripts/probe29all.ts (matriz 13×13 → connmap29.ts)
// e por tests/r29-connect-all.test.ts (cada aresta esperada medida na direção certa).
import { Rng } from '../core/rng';
import { defaultConfig } from './bot';
import { acceptOffer, defaultOffer, evaluateOffer } from './contracts';
import { applyMods } from './ext4';
import { factsAbout } from './facts17';
import { gigEstimate, playGigs } from './live';
import { computeAppeal, weeklyPool } from './market';
import { bumpPerks } from './perks';
import { availableFormats, composeSongs, recordingCost, recordSongs, scheduleRelease } from './production';
import { freeCash20 } from './oblig20';
import { payDJs } from './sys/world4/charts';
import { scandal, scandalReaction } from './scandal17';
import { addStress, stressOf } from './stress17';
import { advanceWeek } from './tick';
import { cityDemand } from './tours';
import type { Act, GameState, Release } from './types';
import { money, rngOf, staffSkill } from './util';
import { monthlyCosts } from './economy';
import { createGame, spawnProceduralAct } from './worldgen';
import { criticScore } from './relinfo';
import { CAMPAIGN_COST, gramoScore } from './sys/ceremonies8';
import { crime17, crimeOdds, a3Of } from './sys/crime17';
import { renewChance } from './sys/explain12';
import { personFame } from './sys/fame15';
import { hallScore } from './sys/rockhall9';
import { hq6 } from './sys/hq6';
import { pr18 } from './sys/press18';
import { influence } from './sys/world4/laws';
import { ageMix29, demo29, regionMix29, taste29, youth29 } from './sys/demo29';
import { countryOfCity } from '../data/geo';

export const SYS29 = ['dinheiro', 'reputacao', 'imprensa', 'projetos', 'aovivo', 'sede', 'fama', 'mundo', 'vida', 'contratos', 'premios', 'submundo', 'publico'] as const;
export type Sys29 = (typeof SYS29)[number];
export const SYS29_NAME: Record<Sys29, string> = {
  dinheiro: 'Dinheiro e livro-caixa', reputacao: 'Reputação', imprensa: 'Imprensa, críticos e escândalos', projetos: 'Projetos, composição, estúdio, lançamento',
  aovivo: 'Ao vivo, turnês e festivais', sede: 'Sede, equipe e departamentos', fama: 'Fama, fãs e facções', mundo: 'Mundo, eras, tecnologia',
  vida: 'Vida pessoal e saúde', contratos: 'Contratos, promessas, rivais', premios: 'Prêmios e legado', submundo: 'Submundo', publico: 'Público por idade e região (demo29)',
};

/** Estado-base: um ato seu com um single lançado (1985, nomes reais) e um ato livre de NPC para ofertas. */
export interface Base29 { s: GameState; act: string; rel: string; npc: string; spare: string[]; next: string; seed: string }
export function base29(seed = 'r29all', year = 1985): Base29 {
  const s = createGame(defaultConfig(seed, { startYear: year, realNames: true }));
  const r = rngOf(s);
  const act = spawnProceduralAct(s, r, { city: s.config.homeCity });
  acceptOffer(s, act, { ...defaultOffer(s, act), model: '360', id: 'o1', week: 0, status: 'pending', advance: 0 }); // 360: o ao vivo passa pelo livro-caixa do selo
  for (const role of ['publicist', 'booking', 'producer', 'legal']) s.player.staff.push({ id: `st29b-${role}`, name: 'Base', role, skill: 45, salary: money(s, 2000), hiredWeek: 0 });
  s.player.cash += money(s, 500_000);
  const songs = composeSongs(s, r, act, 2);
  recordSongs(s, r, act, songs.map((x) => x.id), 1, 'balanced');
  scheduleRelease(s, r, { actId: act.id, type: 'single', songs: [songs[0].id], title: 'Sonda', formats: availableFormats(s).slice(0, 1), press: 2000, marketing: [], territories: [...s.player.territories], weeksAhead: 1 });
  for (let i = 0; i < 3; i++) advanceWeek(s);
  act.fame = Math.max(act.fame, 30);
  act.fans.core = Math.max(act.fans.core, 2000); act.fans.active = Math.max(act.fans.active, 8000); act.fans.casual = Math.max(act.fans.casual, 40000);
  const spare = composeSongs(s, r, act, 3).map((x) => x.id);
  // 2º single estreia DENTRO do mês sondado: o apelo (calculado na estreia) e as vendas dele refletem o empurrão
  const nx = composeSongs(s, r, act, 1);
  recordSongs(s, r, act, nx.map((x) => x.id), 1, 'balanced');
  scheduleRelease(s, r, { actId: act.id, type: 'single', songs: [nx[0].id], title: 'Sonda 2', formats: availableFormats(s).slice(0, 1), press: 2000, marketing: [{ channel: 'radio_plug', budget: money(s, 15000) }], territories: [...s.player.territories], weeksAhead: 2 });
  const npc = Object.values(s.acts).filter((a) => a.owner !== 'player' && !a.owner && !a.contractId && a.status === 'active').sort((a, b) => b.fame - a.fame || (a.id < b.id ? -1 : 1))[3]
    ?? Object.values(s.acts).find((a) => a.owner !== 'player')!;
  return { s, act: act.id, rel: act.releases[act.releases.length - 1], npc: npc.id, spare, next: nx[0].id, seed };
}

type Ctx = { s: GameState; a: Act; rel: Release; b: Base29 };
export interface Metric29 { id: string; sys: Sys29; kind: 'pura' | 'mes'; name: string; f: (c: Ctx) => number }
const a3home = (s: GameState) => a3Of(s, s.config.homeCity);
const cap1 = (x: number) => Math.max(0, Math.min(1, x));
const members = (c: Ctx) => c.a.members.filter((id) => c.s.persons[id]?.alive);
/** Saídas de cada sistema (lidas depois do empurrão; as "mes" depois de um mês nos dois braços). */
export const METRICS29: Metric29[] = [
  { id: 'caixa', sys: 'dinheiro', kind: 'mes', name: 'caixa do selo', f: (c) => c.s.player.cash },
  { id: 'receita', sys: 'dinheiro', kind: 'mes', name: 'receita do período (vendas, shows, edição)', f: (c) => c.s.ledger.filter((x) => x.week >= c.b.s.week && x.amount > 0 && /sales|live|publishing|rights|merch|sync/.test(x.cat)).reduce((t, x) => t + x.amount, 0) },
  { id: 'despesas', sys: 'dinheiro', kind: 'mes', name: 'despesas do período', f: (c) => -c.s.ledger.filter((x) => x.week >= c.b.s.week && x.amount < 0).reduce((t, x) => t + x.amount, 0) },
  { id: 'custos', sys: 'dinheiro', kind: 'pura', name: 'custos mensais', f: (c) => { const m = monthlyCosts(c.s); return m.rent + m.salaries + m.outsourcing + m.loans + m.equipment; } },
  { id: 'mercado', sys: 'projetos', kind: 'pura', name: 'tamanho do mercado', f: (c) => weeklyPool(c.s) },
  { id: 'cabe_gravar', sys: 'projetos', kind: 'pura', name: 'caixa livre para gravar', f: (c) => cap1(freeCash20(c.s) / recordingCost(c.s, 2, 'balanced', 10)) },
  { id: 'cabe_shows', sys: 'aovivo', kind: 'pura', name: 'caixa livre para uma turnê', f: (c) => cap1(freeCash20(c.s) / Math.max(1, gigEstimate(c.s, c.a, 3, 12).cost)) },
  { id: 'cabe_depto', sys: 'sede', kind: 'pura', name: 'caixa livre para um departamento', f: (c) => cap1(freeCash20(c.s) / money(c.s, 35000)) },
  { id: 'cabe_adiant', sys: 'contratos', kind: 'pura', name: 'caixa livre para um adiantamento', f: (c) => cap1(freeCash20(c.s) / Math.max(1, defaultOffer(c.s, c.s.acts[c.b.npc]).advance * 3)) },
  { id: 'cabe_crime', sys: 'submundo', kind: 'pura', name: 'caixa para um suborno', f: (c) => cap1(c.s.player.cash / Math.max(1, crimeOdds(c.s, { actor: 'player', target: c.a.id, partners: [] }, 'chart_rig').cost * 4)) },
  { id: 'rep', sys: 'reputacao', kind: 'mes', name: 'reputação (soma)', f: (c) => { const r = c.s.player.reputation; return r.artistic + r.commercial + r.institutional + r.artists; } },
  { id: 'reacao', sys: 'imprensa', kind: 'pura', name: 'força de um escândalo', f: (c) => scandalReaction(c.s, c.a, 'drugs', 60).eff },
  { id: 'critica', sys: 'imprensa', kind: 'pura', name: 'nota da crítica', f: (c) => criticScore(c.s, c.rel).score },
  { id: 'critica2', sys: 'imprensa', kind: 'mes', name: 'crítica do single que estreia no período', f: (c) => { const r = Object.values(c.s.releases).find((x) => x.songs.includes(c.b.next)); return r ? criticScore(c.s, r).score : 0; } },
  { id: 'atencao', sys: 'imprensa', kind: 'pura', name: 'atenção da imprensa logo depois', f: (c) => factsAbout(c.s, c.a.id, { limit: 300 }).filter((f) => f.w >= c.b.s.week && f.visibility !== 'secret').reduce((t, f) => t + f.severity, 0) },
  { id: 'fatos', sys: 'imprensa', kind: 'mes', name: 'atenção da imprensa (gravidade dos fatos públicos no período)', f: (c) => factsAbout(c.s, c.a.id, { limit: 300 }).filter((f) => f.w >= c.b.s.week && f.visibility !== 'secret').reduce((t, f) => t + f.severity, 0) },
  { id: 'apelo', sys: 'projetos', kind: 'pura', name: 'apelo do disco', f: (c) => computeAppeal(c.s, Rng.fromSeed(`${c.b.seed}|ap`), c.rel, c.a).appeal },
  { id: 'vendas', sys: 'projetos', kind: 'pura', name: 'vendas semanais', f: (c) => applyMods(c.s, 'chartUnits', 1000, { release: c.rel }).value },
  { id: 'gravacao', sys: 'projetos', kind: 'pura', name: 'nota da gravação', f: (c) => { const t = structuredClone(c.s); const xs = recordSongs(t, Rng.fromSeed(`${c.b.seed}|rec`), t.acts[c.a.id], c.b.spare, 1, 'balanced').songs; return xs.reduce((x, y) => x + y.q, 0) / Math.max(1, xs.length); } },
  { id: 'show', sys: 'aovivo', kind: 'pura', name: 'bilheteria na cidade', f: (c) => applyMods(c.s, 'showRevenue', 1000, { act: c.a, cityId: c.a.city }).value * Math.max(1, cityDemand(c.s, c.a, c.a.city)) },
  { id: 'gig', sys: 'aovivo', kind: 'pura', name: 'receita de shows simples', f: (c) => gigEstimate(c.s, c.a, 3, 4).revenue },
  { id: 'equipe', sys: 'sede', kind: 'pura', name: 'eficácia da equipe', f: (c) => ['publicist', 'booking', 'tour_manager', 'engineer', 'producer', 'legal'].reduce((t, r) => t + staffSkill(c.s, r), 0) },
  { id: 'fama', sys: 'fama', kind: 'mes', name: 'fama do ato', f: (c) => c.a.fame },
  { id: 'fas', sys: 'fama', kind: 'mes', name: 'fãs núcleo', f: (c) => c.a.fans.core },
  { id: 'embalo', sys: 'fama', kind: 'mes', name: 'embalo do ato', f: (c) => c.a.momentum },
  { id: 'famap', sys: 'fama', kind: 'pura', name: 'fama da pessoa', f: (c) => personFame(c.s, c.a.members[0]).v },
  { id: 'influencia', sys: 'mundo', kind: 'pura', name: 'influência nas leis', f: (c) => influence(c.s) },
  { id: 'gosto', sys: 'mundo', kind: 'mes', name: 'popularidade do gênero', f: (c) => c.s.genrePop[c.a.genre] ?? 0 },
  { id: 'cena', sys: 'mundo', kind: 'mes', name: 'cena local', f: (c) => c.s.scenes[`${c.a.city}:${c.a.genre}`] ?? 0 },
  { id: 'estresse', sys: 'vida', kind: 'pura', name: 'estresse do elenco', f: (c) => members(c).reduce((t, id) => t + stressOf(c.s, id).short, 0) / Math.max(1, members(c).length) },
  { id: 'estresse_mes', sys: 'vida', kind: 'mes', name: 'estresse depois de um mês', f: (c) => members(c).reduce((t, id) => t + stressOf(c.s, id).short, 0) / Math.max(1, members(c).length) },
  { id: 'oferta', sys: 'contratos', kind: 'pura', name: 'aceite de oferta', f: (c) => evaluateOffer(c.s, c.s.acts[c.b.npc], defaultOffer(c.s, c.s.acts[c.b.npc])).score },
  { id: 'renova', sys: 'contratos', kind: 'pura', name: 'chance de renovar', f: (c) => renewChance(c.s, c.a, 0) },
  { id: 'confianca', sys: 'contratos', kind: 'mes', name: 'confiança do ato no selo', f: (c) => c.a.trust },
  { id: 'rivais', sys: 'contratos', kind: 'mes', name: 'calor dos rivais', f: (c) => Object.values(c.s.rivalries ?? {}).reduce((t, v) => t + v, 0) },
  { id: 'gramofone', sys: 'premios', kind: 'pura', name: 'nota no Gramofone', f: (c) => gramoScore(c.s, 'record', c.rel) },
  { id: 'cabe_campanha', sys: 'premios', kind: 'pura', name: 'caixa livre para campanha do Gramofone', f: (c) => cap1(freeCash20(c.s) / money(c.s, CAMPAIGN_COST[1])) },
  { id: 'hall', sys: 'premios', kind: 'pura', name: 'nota no Hall da Fama', f: (c) => hallScore(c.s, c.a) },
  { id: 'crime_p', sys: 'submundo', kind: 'pura', name: 'chance de fraudar a parada', f: (c) => crimeOdds(c.s, { actor: 'player', target: c.a.id, partners: [] }, 'chart_rig').p },
  { id: 'crime_q', sys: 'submundo', kind: 'pura', name: 'exposição de um crime', f: (c) => crimeOdds(c.s, { actor: 'player', target: c.a.id, partners: [] }, 'chart_rig').q },
  { id: 'crime_pirata', sys: 'submundo', kind: 'pura', name: 'chance de piratear o ato', f: (c) => crimeOdds(c.s, { actor: 'player', target: c.a.id, partners: [] }, 'bootleg').p },
  { id: 'calor', sys: 'submundo', kind: 'mes', name: 'calor policial', f: (c) => crime17(c.s).heat[a3home(c.s)] ?? 0 },
  // R29 DEMO: o público por idade e região (demo29) como 13º sistema
  { id: 'jovens', sys: 'publico', kind: 'mes', name: 'fatia do público até 24 anos', f: (c) => youth29(ageMix29(c.s, c.a)) },
  { id: 'fora', sys: 'publico', kind: 'mes', name: 'fatia do público fora do país natal', f: (c) => { const h = countryOfCity(c.a.city); return regionMix29(c.s, c.a).top.filter((x) => x.a3 !== h).reduce((t, x) => t + x.v, 0); } },
  { id: 'gosto_jovem', sys: 'publico', kind: 'pura', name: 'gosto de quem tem 20 anos pelo gênero do ato', f: (c) => taste29(c.s, 20, c.s.config.homeCity ? countryOfCity(c.s.config.homeCity) ?? undefined : undefined, c.a.genre) },
];

export interface Nudge29 { id: string; sys: Sys29; name: string; f: (c: Ctx) => void }
/** Um empurrão por "entrada" de cada sistema (o sinal esperado de cada aresta fica em EDGES29). */
export const NUDGES29: Nudge29[] = [
  { id: 'rico', sys: 'dinheiro', name: '+US$ 1 mi em caixa', f: (c) => { c.s.player.cash += money(c.s, 1_000_000); } },
  { id: 'pobre', sys: 'dinheiro', name: 'caixa quase zero', f: (c) => { c.s.player.cash = money(c.s, 2_000); } },
  { id: 'rep', sys: 'reputacao', name: '+25 em toda reputação', f: (c) => { const r = c.s.player.reputation; r.artistic += 25; r.commercial += 25; r.institutional += 25; r.artists += 25; } },
  { id: 'escandalo', sys: 'imprensa', name: 'escândalo pesado', f: (c) => { scandal(c.s, c.a.id, 'drugs', 85); } },
  { id: 'resenha', sys: 'imprensa', name: 'resenha boa', f: (c) => { pr18(c.s).infl[c.rel.id] = 0.12; } },
  { id: 'qualidade', sys: 'projetos', name: 'próximo single +20 de qualidade', f: (c) => { const so = c.s.songs[c.b.next]; if (so) { so.q += 20; so.melody += 15; so.lyrics += 15; so.performance += 15; so.production += 15; } c.rel.q += 20; for (const id of c.rel.songs) if (c.s.songs[id]) c.s.songs[id].q += 20; } },
  { id: 'shows', sys: 'aovivo', name: 'série de 6 shows', f: (c) => { playGigs(c.s, Rng.fromSeed(`${c.b.seed}|gig`), c.a, 1, 6); } },
  { id: 'sede', sys: 'sede', name: 'departamentos nível 2 + equipe 90', f: (c) => { const h = hq6(c.s); for (const d of ['marketing', 'booking', 'digital', 'studio', 'legal', 'wellbeing', 'anr', 'finance'] as const) h.depts[d] = 2; for (const role of ['publicist', 'booking', 'tour_manager', 'engineer', 'producer', 'legal']) c.s.player.staff.push({ id: `st29-${role}`, name: 'Sonda', role, skill: 90, salary: money(c.s, 3000), hiredWeek: c.s.week }); bumpPerks(); } },
  { id: 'fama', sys: 'fama', name: '+25 de fama e 3× fãs', f: (c) => { c.a.fame = Math.min(100, c.a.fame + 25); c.a.fans.core *= 3; c.a.fans.active *= 3; c.a.fans.casual *= 3; } },
  { id: 'crise', sys: 'mundo', name: 'guerra/crise (demanda 0,7)', f: (c) => { c.s.flags.geoDemand = 0.7; } },
  { id: 'decada', sys: 'mundo', name: 'dez anos depois (era, tecnologia, leis, preços)', f: (c) => { c.s.year += 10; } },
  { id: 'moda', sys: 'mundo', name: 'gênero do ato na moda (×1,6)', f: (c) => { c.s.genrePop[c.a.genre] = (c.s.genrePop[c.a.genre] ?? 0.6) * 1.6; } },
  { id: 'estresse', sys: 'vida', name: 'elenco estressado', f: (c) => { for (const id of c.a.members) addStress(c.s, id, 90); } },
  { id: 'confianca', sys: 'contratos', name: 'ato confia no selo (90)', f: (c) => { c.a.trust = 90; } },
  { id: 'desconfianca', sys: 'contratos', name: 'ato desconfia do selo (20)', f: (c) => { c.a.trust = 20; } },
  { id: 'rival', sys: 'contratos', name: 'rival em guerra (+60 de calor)', f: (c) => { const lb = Object.values(c.s.labels).filter((l) => l.active).sort((x, y) => y.reputation - x.reputation)[0]; if (lb) c.s.rivalries[lb.id] = (c.s.rivalries[lb.id] ?? 0) + 60; } },
  { id: 'premios', sys: 'premios', name: '4 prêmios do selo e do ato', f: (c) => { for (let i = 0; i < 4; i++) c.s.awards.push({ year: c.s.year, category: 'sonda', name: 'Sonda', byPlayer: true, actId: c.a.id, releaseId: c.rel.id }); c.a.awards += 4; c.s.player.stats.awards += 4; } },
  { id: 'jaba', sys: 'submundo', name: 'jabá nas rádios', f: (c) => { payDJs(c.s, 1); } },
  { id: 'jovem', sys: 'publico', name: 'público jovem (70% até 24 anos)', f: (c) => { const d = demo29(c.s).a[c.a.id]; if (d) d.b = [250, 450, 220, 60, 20]; else demo29(c.s).a[c.a.id] = { b: [250, 450, 220, 60, 20], n: c.a.fans.casual + c.a.fans.active + c.a.fans.core }; } },
  { id: 'velho', sys: 'publico', name: 'público maduro (70% com 35+)', f: (c) => { const d = demo29(c.s).a[c.a.id]; if (d) d.b = [20, 80, 200, 400, 300]; else demo29(c.s).a[c.a.id] = { b: [20, 80, 200, 400, 300], n: c.a.fans.casual + c.a.fans.active + c.a.fans.core }; } },
  { id: 'calor', sys: 'submundo', name: 'polícia de olho (+60 de calor)', f: (c) => { const k = a3home(c.s); crime17(c.s).heat[k] = (crime17(c.s).heat[k] ?? 0) + 60; } },
];

export interface Cell29 { a: Sys29; b: Sys29; d: number; via: string; str: Str29 }
export interface Run29 { rows: { nudge: string; metric: string; a: number; b: number; d: number }[] }

/** semanas do braço dinâmico (advanceMonth para no fechamento do mês — da semana 3 seria 1 semana só) */
export const WEEKS29 = 6;
const rel = (a: number, b: number) => (a === b ? 0 : Math.abs(a) > 1e-9 ? (b - a) / Math.abs(a) : b > a ? 1 : -1);

/** Roda todos os empurrões × todas as métricas (A e B a partir do mesmo estado-base). */
export function run29(b: Base29, only?: (n: Nudge29) => boolean): Run29 {
  const ctx = (s: GameState): Ctx => ({ s, a: s.acts[b.act], rel: s.releases[b.rel], b });
  const pure = METRICS29.filter((m) => m.kind === 'pura'), mes = METRICS29.filter((m) => m.kind === 'mes');
  /** um braço: clona, aplica (ou não) o empurrão, lê as puras, avança WEEKS29 semanas, lê as do período */
  const arm = (f?: (c: Ctx) => void): Record<string, number> => {
    const S = structuredClone(b.s);
    f?.(ctx(S));
    bumpPerks();
    const out: Record<string, number> = {};
    for (const m of pure) out[m.id] = m.f(ctx(S));
    for (let i = 0; i < WEEKS29; i++) advanceWeek(S);
    bumpPerks();
    for (const m of mes) out[m.id] = m.f(ctx(S));
    return out;
  };
  const rows: Run29['rows'] = [];
  for (const n of NUDGES29.filter((x) => !only || only(x))) {
    const A = arm(); // braço de controle rodado do MESMO jeito, logo antes (caches de módulo idênticos)
    const B = arm(n.f);
    for (const m of METRICS29) rows.push({ nudge: n.id, metric: m.id, a: A[m.id], b: B[m.id], d: rel(A[m.id], B[m.id]) });
  }
  return { rows };
}

/** Ruído do método: dois braços de controle seguidos devem dar 0 em tudo. */
export function noise29(b: Base29): number {
  const one = run29({ ...b }, () => false);
  void one;
  const ctxA = (s: GameState): Ctx => ({ s, a: s.acts[b.act], rel: s.releases[b.rel], b });
  const go = () => { const S = structuredClone(b.s); bumpPerks(); for (let i = 0; i < WEEKS29; i++) advanceWeek(S); return METRICS29.filter((m) => m.kind === 'mes').map((m) => m.f(ctxA(S))); };
  const x = go(), y = go();
  return Math.max(0, ...x.map((v, i) => Math.abs(rel(v, y[i]))));
}

/** Força de uma variação: forte ≥ 10%, média ≥ 3%, fraca ≥ 0,5% (puras: ≥ 0,2%). */
export type Str29 = 'forte' | 'media' | 'fraca' | '';
export function strength29(d: number, kind: 'pura' | 'mes' = 'pura'): Str29 {
  const x = Math.abs(d);
  return x >= 0.1 ? 'forte' : x >= 0.03 ? 'media' : x >= (kind === 'pura' ? 0.002 : 0.005) ? 'fraca' : '';
}

/** Mediana por (empurrão, saída) entre sementes — robusto à deriva caótica de uma semente só. */
export function median29(runs: Run29[]): Run29 {
  const by = new Map<string, Run29['rows']>();
  for (const r of runs) for (const x of r.rows) { const k = `${x.nudge}|${x.metric}`; (by.get(k) ?? by.set(k, []).get(k)!).push(x); }
  const rows: Run29['rows'] = [];
  for (const xs of by.values()) { const ys = [...xs].sort((p, q) => p.d - q.d); const m = ys[Math.floor(ys.length / 2)]; rows.push({ ...m, d: ys.length % 2 ? m.d : (ys[ys.length / 2 - 1].d + m.d) / 2 }); }
  return { rows };
}

/** Matriz sistema × sistema: maior |Δ| de qualquer empurrão de A sobre qualquer saída de B. */
export function matrix29(run: Run29): Cell29[] {
  const nSys = Object.fromEntries(NUDGES29.map((n) => [n.id, n.sys])), mm = Object.fromEntries(METRICS29.map((m) => [m.id, m]));
  const rank: Record<Str29, number> = { forte: 3, media: 2, fraca: 1, '': 0 };
  const best = new Map<string, Cell29>();
  for (const r of run.rows) {
    const a = nSys[r.nudge] as Sys29, b = mm[r.metric].sys;
    const k = `${a}>${b}`, cur = best.get(k), str = strength29(r.d, mm[r.metric].kind);
    if (!cur || rank[str] > rank[cur.str] || (rank[str] === rank[cur.str] && Math.abs(r.d) > Math.abs(cur.d))) best.set(k, { a, b, d: r.d, via: `${r.nudge}→${r.metric}`, str });
  }
  return [...best.values()];
}

/** Arestas que o jogo DEVE ter (pedido do autor, R29 "Conectar tudo"): A influencia B. Algumas com o sinal esperado
 *  de um empurrão sobre uma saída (sign 1 = sobe, -1 = desce). tests/r29-connect-all.test.ts exige todas medidas. */
export const EDGES29: { a: Sys29; b: Sys29; check?: [nudge: string, metric: string, sign: 1 | -1] }[] = [
  { a: 'dinheiro', b: 'projetos', check: ['pobre', 'cabe_gravar', -1] }, { a: 'dinheiro', b: 'aovivo', check: ['pobre', 'cabe_shows', -1] },
  { a: 'dinheiro', b: 'sede', check: ['pobre', 'cabe_depto', -1] }, { a: 'dinheiro', b: 'contratos', check: ['pobre', 'cabe_adiant', -1] },
  { a: 'dinheiro', b: 'submundo', check: ['pobre', 'cabe_crime', -1] }, { a: 'dinheiro', b: 'vida', check: ['pobre', 'estresse', 1] },
  { a: 'reputacao', b: 'contratos', check: ['rep', 'oferta', 1] }, { a: 'reputacao', b: 'imprensa', check: ['rep', 'reacao', -1] },
  { a: 'reputacao', b: 'premios', check: ['rep', 'gramofone', 1] }, { a: 'reputacao', b: 'fama', check: ['rep', 'fama', 1] },
  { a: 'reputacao', b: 'dinheiro' }, { a: 'reputacao', b: 'sede', check: ['rep', 'equipe', 1] },
  { a: 'imprensa', b: 'fama' }, { a: 'imprensa', b: 'reputacao', check: ['escandalo', 'rep', -1] }, { a: 'imprensa', b: 'projetos', check: ['resenha', 'vendas', 1] },
  { a: 'imprensa', b: 'premios', check: ['escandalo', 'gramofone', -1] }, { a: 'imprensa', b: 'vida', check: ['escandalo', 'estresse', 1] }, { a: 'imprensa', b: 'dinheiro' },
  { a: 'projetos', b: 'dinheiro', check: ['qualidade', 'receita', 1] }, { a: 'projetos', b: 'fama', check: ['qualidade', 'fama', 1] },
  { a: 'projetos', b: 'premios', check: ['qualidade', 'gramofone', 1] }, { a: 'projetos', b: 'imprensa', check: ['qualidade', 'critica2', 1] },
  { a: 'aovivo', b: 'fama', check: ['shows', 'fama', 1] }, { a: 'aovivo', b: 'dinheiro' }, { a: 'aovivo', b: 'vida', check: ['shows', 'estresse', 1] },
  { a: 'aovivo', b: 'imprensa', check: ['shows', 'atencao', 1] },
  { a: 'sede', b: 'projetos', check: ['sede', 'vendas', 1] }, { a: 'sede', b: 'aovivo', check: ['sede', 'show', 1] }, { a: 'sede', b: 'imprensa', check: ['sede', 'reacao', -1] },
  { a: 'sede', b: 'contratos', check: ['sede', 'oferta', 1] }, { a: 'sede', b: 'dinheiro', check: ['sede', 'custos', 1] },
  { a: 'fama', b: 'projetos', check: ['fama', 'apelo', 1] }, { a: 'fama', b: 'aovivo', check: ['fama', 'show', 1] }, { a: 'fama', b: 'contratos' },
  { a: 'fama', b: 'premios', check: ['fama', 'hall', 1] }, { a: 'fama', b: 'imprensa', check: ['fama', 'fatos', 1] }, { a: 'fama', b: 'submundo', check: ['fama', 'crime_q', 1] },
  { a: 'fama', b: 'dinheiro', check: ['fama', 'receita', 1] },
  { a: 'mundo', b: 'projetos', check: ['moda', 'apelo', 1] }, { a: 'mundo', b: 'aovivo', check: ['crise', 'show', -1] }, { a: 'mundo', b: 'dinheiro' },
  { a: 'mundo', b: 'imprensa' }, { a: 'mundo', b: 'submundo' }, { a: 'mundo', b: 'sede' },
  { a: 'vida', b: 'aovivo', check: ['estresse', 'show', -1] }, { a: 'vida', b: 'projetos', check: ['estresse', 'gravacao', -1] }, { a: 'vida', b: 'imprensa' },
  { a: 'vida', b: 'dinheiro', check: ['estresse', 'despesas', 1] },
  { a: 'contratos', b: 'dinheiro' }, { a: 'contratos', b: 'projetos', check: ['desconfianca', 'gravacao', -1] }, { a: 'contratos', b: 'aovivo', check: ['desconfianca', 'show', -1] },
  { a: 'contratos', b: 'imprensa', check: ['desconfianca', 'fatos', 1] }, { a: 'contratos', b: 'vida', check: ['desconfianca', 'estresse', 1] },
  { a: 'premios', b: 'fama', check: ['premios', 'fama', 1] }, { a: 'premios', b: 'reputacao', check: ['premios', 'rep', 1] }, { a: 'premios', b: 'contratos', check: ['premios', 'oferta', 1] },
  { a: 'premios', b: 'projetos', check: ['premios', 'apelo', 1] }, { a: 'premios', b: 'dinheiro' },
  { a: 'submundo', b: 'dinheiro', check: ['jaba', 'despesas', 1] }, { a: 'submundo', b: 'imprensa', check: ['calor', 'reacao', 1] }, { a: 'submundo', b: 'projetos', check: ['jaba', 'vendas', 1] },
  { a: 'submundo', b: 'vida', check: ['calor', 'estresse', 1] }, { a: 'submundo', b: 'reputacao', check: ['calor', 'rep', -1] }, { a: 'submundo', b: 'contratos', check: ['calor', 'oferta', -1] },
  // R29 DEMO (13º sistema): público por idade e região
  { a: 'publico', b: 'projetos', check: ['velho', 'apelo', -1] }, { a: 'publico', b: 'aovivo', check: ['velho', 'show', -1] }, { a: 'publico', b: 'premios', check: ['velho', 'gramofone', 1] },
  { a: 'publico', b: 'contratos' }, { a: 'publico', b: 'dinheiro' },
  { a: 'mundo', b: 'publico', check: ['decada', 'jovens', -1] }, { a: 'fama', b: 'publico', check: ['fama', 'fora', 1] },
  { a: 'premios', b: 'imprensa', check: ['premios', 'fatos', 1] },
];
