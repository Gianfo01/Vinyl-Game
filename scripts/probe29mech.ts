// R29 (CONNECT): sonda de mecanismos — mesma semente, estado A × estado B (B = A com UMA entrada mexida), e mede se a
// saída esperada se move na direção certa. Cada aresta vira conectada / fraca / morta na matriz.
// Uso: npx tsx scripts/probe29mech.ts [--seed r29m] [--year 1985] [--json saida.json]
// Mede funções puras (computeAppeal, applyMods, cityDemand, evaluateOffer, renewChance, marketingE, weeklyPool) em
// clones; nada aqui avança o tempo depois da preparação. Limiares: |Δ| < 0,2% = morta; < 3% = fraca.
import { writeFileSync } from 'node:fs';
import { Rng } from '../src/core/rng';
import { defaultConfig } from '../src/sim/bot';
import { acceptOffer, defaultOffer, evaluateOffer } from '../src/sim/contracts';
import { applyMods } from '../src/sim/ext4';
import { computeAppeal, marketingE, weeklyPool } from '../src/sim/market';
import { bumpPerks } from '../src/sim/perks';
import { availableFormats, composeSongs, recordSongs, scheduleRelease } from '../src/sim/production';
import { scandal } from '../src/sim/scandal17';
import { addStress } from '../src/sim/stress17';
import { advanceWeek } from '../src/sim/tick';
import { cityDemand } from '../src/sim/tours';
import type { Act, GameState, Release } from '../src/sim/types';
import { money } from '../src/sim/util';
import { rng19 } from '../src/sim/rng19';
import { createGame, spawnProceduralAct } from '../src/sim/worldgen';
import { renewChance } from '../src/sim/sys/explain12';
import { hq6 } from '../src/sim/sys/hq6';
import { pr18 } from '../src/sim/sys/press18';
import { payDJs } from '../src/sim/sys/world4/charts';
import '../src/sim/sys/index';

const args = process.argv.slice(2);
const arg = (k: string, d: string): string => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const seed = arg('seed', 'r29m'), year = +arg('year', '1985');

// ---- base: um ato seu com um single lançado; um ato de NPC para ofertas
const s0 = createGame(defaultConfig(seed, { startYear: year, realNames: true }));
const r = rng19(s0, 'act');
const act = spawnProceduralAct(s0, r, { city: s0.config.homeCity });
acceptOffer(s0, act, { ...defaultOffer(s0, act), id: 'o1', week: 0, status: 'pending', advance: 0 });
s0.player.cash += 50_000_000_00; s0.player.initialCash += 50_000_000_00;
const songs = composeSongs(s0, r, act, 2);
recordSongs(s0, r, act, songs.map((x) => x.id), 1, 'balanced');
const res = scheduleRelease(s0, r, { actId: act.id, type: 'single', songs: [songs[0].id], title: 'Sonda', formats: availableFormats(s0).slice(0, 1), press: 2000, marketing: [], territories: [...s0.player.territories], weeksAhead: 1 });
if (!('id' in res)) throw new Error('lançamento falhou');
for (let i = 0; i < 3; i++) advanceWeek(s0);
act.fame = Math.max(act.fame, 30);
const spare = composeSongs(s0, r, act, 3).map((x) => x.id); // gravadas só nos clones (métrica rec)
const relId = act.releases[act.releases.length - 1];
if (!relId) throw new Error('sem lançamento');
const npc = Object.values(s0.acts).filter((a) => a.owner !== 'player' && !a.contractId && a.status === 'active').sort((a, b) => b.fame - a.fame)[5] ?? Object.values(s0.acts).find((a) => a.owner !== 'player')!;

type M = (s: GameState, a: Act, rel: Release) => number;
const M: Record<string, M> = {
  appeal: (s, a, rel) => computeAppeal(s, Rng.fromSeed(`${seed}|probe`), rel, a).appeal,
  units: (s, _a, rel) => applyMods(s, 'chartUnits', 1000, { release: rel }).value,
  show: (s, a) => applyMods(s, 'showRevenue', 1000, { act: a, cityId: a.city }).value * Math.max(1, cityDemand(s, a, a.city)),
  demand: (s, a) => cityDemand(s, a, a.city),
  songQ: (s, a, rel) => applyMods(s, 'songQ', 50, { act: a, song: s.songs[rel.songs[0]] }).value,
  offer: (s) => evaluateOffer(s, s.acts[npc.id], defaultOffer(s, s.acts[npc.id])).score,
  renew: (s, a) => renewChance(s, a, 0),
  mkt: (s, a) => marketingE(s, [{ channel: 'radio_plug', budget: money(s, 20000) }], 'player', a.id),
  pool: (s) => weeklyPool(s),
  rec: (s, a) => { const xs = recordSongs(s, Rng.fromSeed(`${seed}|rec`), a, spare, 1, 'balanced').songs; return xs.reduce((t, x) => t + x.q, 0) / Math.max(1, xs.length); },
};

interface Edge { id: string; de: string; para: string; m: keyof typeof M; sign: 1 | -1; nudge: (s: GameState, a: Act, rel: Release) => void; prep?: (s: GameState, a: Act) => void }
const E: Edge[] = [
  { id: 'E1a', de: 'escândalo (gênero rebelde: efeito Streisand, intencional)', para: 'vendas semanais', m: 'units', sign: 1, nudge: (s, a) => { scandal(s, a.id, 'drugs', 80); } },
  { id: 'E1b', de: 'escândalo', para: 'público/bilheteria', m: 'show', sign: -1, nudge: (s, a) => { scandal(s, a.id, 'drugs', 80); } },
  { id: 'E1c', de: 'escândalo (gênero rebelde, efeito ≤ 55: fama regional esquenta)', para: 'apelo do próximo disco', m: 'appeal', sign: 1, nudge: (s, a) => { scandal(s, a.id, 'drugs', 80); } },
  { id: 'E1d', de: 'escândalo (gênero não rebelde)', para: 'vendas semanais', m: 'units', sign: -1, prep: (_s, a) => { a.genre = 'pop'; }, nudge: (s, a) => { scandal(s, a.id, 'drugs', 80); } },
  { id: 'E1e', de: 'escândalo (gênero não rebelde)', para: 'apelo do próximo disco', m: 'appeal', sign: -1, prep: (_s, a) => { a.genre = 'pop'; }, nudge: (s, a) => { scandal(s, a.id, 'drugs', 80); } },
  { id: 'E2', de: 'jabá (payola)', para: 'vendas semanais', m: 'units', sign: 1, nudge: (s) => { payDJs(s, 2); } },
  { id: 'E3', de: 'qualidade do publicitário', para: 'alcance do marketing', m: 'mkt', sign: 1, nudge: (s) => { s.player.staff.push({ id: 'st-probe', name: 'Sonda', role: 'publicist', skill: 95, salary: 0, hiredWeek: s.week }); } },
  { id: 'E4a', de: 'sede: Marketing e promoção', para: 'apelo', m: 'appeal', sign: 1, nudge: (s) => { hq6(s).depts.marketing = 3; bumpPerks(); } },
  { id: 'E4b', de: 'sede: Agência de shows', para: 'bilheteria', m: 'show', sign: 1, nudge: (s) => { hq6(s).depts.booking = 3; bumpPerks(); } },
  { id: 'E4c', de: 'sede: Digital e dados', para: 'vendas semanais', m: 'units', sign: 1, nudge: (s) => { hq6(s).depts.digital = 3; bumpPerks(); } },
  { id: 'E4d', de: 'sede: Estúdio interno', para: 'qualidade da gravação', m: 'rec', sign: 1, nudge: (s) => { hq6(s).depts.studio = 3; bumpPerks(); } },
  { id: 'E5', de: 'fãs núcleo', para: 'demanda na cidade', m: 'demand', sign: 1, nudge: (_s, a) => { a.fans.core *= 2; } },
  { id: 'E6', de: 'prêmios do selo', para: 'aceite de oferta', m: 'offer', sign: 1, nudge: (s) => { for (let i = 0; i < 4; i++) s.awards.push({ year: s.year, category: 'probe', name: 'Sonda', byPlayer: true, actId: act.id }); s.player.stats.awards += 4; } },
  { id: 'E3b', de: 'qualidade do produtor', para: 'qualidade da gravação', m: 'rec', sign: 1, nudge: (s) => { s.player.staff.push({ id: 'st-probe2', name: 'Sonda', role: 'producer', skill: 95, salary: 0, hiredWeek: s.week }); } },
  { id: 'E7b', de: 'estresse do elenco', para: 'qualidade da gravação', m: 'rec', sign: -1, nudge: (s, a) => { for (const id of a.members) addStress(s, id, 90); } },
  { id: 'E7', de: 'estresse do elenco', para: 'qualidade da gravação (songQ)', m: 'songQ', sign: -1, nudge: (s, a) => { for (const id of a.members) addStress(s, id, 90); } },
  { id: 'E8', de: 'guerra/crise (geoDemand)', para: 'tamanho do mercado', m: 'pool', sign: -1, nudge: (s) => { s.flags.geoDemand = 0.7; } },
  { id: 'E10', de: 'confiança do artista', para: 'chance de renovar', m: 'renew', sign: 1, nudge: (_s, a) => { a.trust = Math.min(100, a.trust + 30); } },
  { id: 'E11a', de: 'reputação comercial', para: 'aceite de oferta', m: 'offer', sign: 1, nudge: (s) => { s.player.reputation.commercial += 30; } },
  { id: 'E11b', de: 'reputação artística', para: 'aceite de oferta', m: 'offer', sign: 1, nudge: (s) => { s.player.reputation.artistic += 30; } },
  { id: 'E12', de: 'momento (momentum)', para: 'apelo', m: 'appeal', sign: 1, nudge: (_s, a) => { a.momentum = Math.min(100, a.momentum + 40); } },
  { id: 'E14', de: 'cena da cidade', para: 'demanda na cidade', m: 'demand', sign: 1, nudge: (s, a) => { s.scenes[`${a.city}:${a.genre}`] = 20; } },
  { id: 'E16', de: 'sua resenha (crítico)', para: 'vendas semanais', m: 'units', sign: 1, nudge: (s, _a, rel) => { pr18(s).infl[rel.id] = 0.1; } },
];

const rows: { id: string; de: string; para: string; a: number; b: number; d: number; v: string }[] = [];
for (const e of E) {
  const A = structuredClone(s0), B = structuredClone(s0);
  e.prep?.(A, A.acts[act.id]); e.prep?.(B, B.acts[act.id]);
  bumpPerks();
  e.nudge(B, B.acts[act.id], B.releases[relId]);
  const a = M[e.m](A, A.acts[act.id], A.releases[relId]);
  bumpPerks();
  const b = M[e.m](B, B.acts[act.id], B.releases[relId]);
  const d = a ? (b - a) / Math.abs(a) : b ? 1 : 0;
  const v = Math.abs(d) < 0.002 ? 'MORTA' : Math.sign(d) !== e.sign ? 'INVERTIDA' : Math.abs(d) < 0.03 ? 'fraca' : 'conectada';
  rows.push({ id: e.id, de: e.de, para: e.para, a, b, d, v });
}
console.log('| aresta | de | para | A | B | Δ | veredito |\n|---|---|---|---|---|---|---|');
for (const x of rows) console.log(`| ${x.id} | ${x.de} | ${x.para} | ${x.a.toFixed(3)} | ${x.b.toFixed(3)} | ${(x.d * 100).toFixed(1)}% | ${x.v} |`);
const out = arg('json', '');
if (out) writeFileSync(out, JSON.stringify(rows, null, 1));
