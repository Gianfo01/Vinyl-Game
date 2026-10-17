// R31 · onda 5 (TUT, EXP-12) — TUTORIAL GUIADO OPCIONAL, lado da simulação (sem DOM):
//  - interruptores: `exp5.tut` (entradas do tutorial na tela inicial, nos Cenários e na nova run; vale fora da partida,
//    mora no navegador) e `exp5.tutHint` (modo dica para veteranos: acende o alvo sem bloquear, pelas Opções);
//  - o cenário "Primeiro selo" (sistema de cenários da rodada 17, um por época do mentor) com semente fixa;
//  - o acontecimento roteirizado: uma banda sem contrato aparece na recepção no 1º mês (com aviso na correspondência).
// O roteiro dos passos é dado de interface (src/ui/r31/tut5data.ts); aqui só fica o que precisa existir no mundo.
// Regras: nada aqui roda numa partida sem `config.tut5` (o gancho sai na primeira linha), a banda sai de um fluxo de
// sorteio próprio (`tut5:<semente>`, não toca no RNG da partida) e o progresso do tutorial só é criado quando ele começa
// (sem `registerExt4`: partidas sem tutorial não ganham chave nova no save).

import { Rng } from '../../core/rng';
import { l, type L } from '../../data/world';
import { registerSimHook } from '../ext4';
import { emitFact } from '../facts17';
import { makeAct } from '../people';
import { composeSongs } from '../production';
import type { GameState } from '../types';
import { fmtL } from '../util';
import { SCENARIOS17, type Scenario17 } from '../sys/scenarios17';
import { adjustCash, insolvent, scenarioById } from '../sys/live';
import { registerEditable } from './editor';
import { SW_NAV5 } from './exp5';
import { registerSwitch, setSw, setSwUi, swUi } from './switches';

// ---------------------------------------------------------------- interruptores (fora da partida)

const ENV_ON = (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_EXP5NAV === '1';
export const SW_TUT5 = 'exp5.tut';
export const SW_TUTHINT5 = 'exp5.tutHint';
registerSwitch({
  // mesma regra do exp5.nav: desligado no código; a build de teste do dono (VITE_EXP5NAV=1) liga
  id: SW_TUT5, def: ENV_ON, scope: 'prod',
  desc: l('Onda 5 · tutorial guiado (mentor da época): "Aprender a jogar" na tela inicial, cenário "Primeiro selo" e chave na nova run. Só com a navegação nova.',
    'Wave 5 · guided tutorial (era mentor): "Learn to play" on the title screen, "First label" scenario and a switch in the new run. New navigation only.'),
  read: () => swUi<boolean>(SW_TUT5), write: (_s, v) => setSwUi(SW_TUT5, !!v),
});
registerSwitch({
  id: SW_TUTHINT5, def: false, scope: 'game',
  desc: l('Onda 5 · modo dica do tutorial: acende o próximo alvo sem escurecer nem bloquear a tela (para quem já joga).',
    'Wave 5 · tutorial hint mode: lights up the next target without dimming or blocking the screen (for current players).'),
  read: () => swUi<boolean>(SW_TUTHINT5), write: (_s, v) => setSwUi(SW_TUTHINT5, !!v),
});
export const tut5Enabled = (): boolean => swUi<boolean>(SW_TUT5);
export const tutHint5 = (): boolean => swUi<boolean>(SW_TUTHINT5);
registerEditable({ id: `sw.${SW_TUT5}`, area: 'tools', label: l('Onda 5 · tutorial guiado (entradas)', 'Wave 5 · guided tutorial (entries)'), kind: 'bool',
  get: () => tut5Enabled(), set: (_s, v) => setSwUi(SW_TUT5, !!v) });
registerEditable({ id: `sw.${SW_TUTHINT5}`, area: 'tools', label: l('Onda 5 · modo dica do tutorial', 'Wave 5 · tutorial hint mode'), kind: 'bool',
  get: () => tutHint5(), set: (_s, v) => setSwUi(SW_TUTHINT5, !!v) });

// ---------------------------------------------------------------- configuração da partida

/** Marca da nova run: partida com tutorial (só existe quando o jogador pediu). */
export interface TutCfg5 { /** 'scenario' = "Aprender a jogar"/"Primeiro selo" (semente fixa); 'quick' = chave da nova run */ from: 'scenario' | 'quick' }
declare module '../types' { interface RunConfig { tut5?: TutCfg5 } }

/** Épocas do "Primeiro selo" (uma por mentor; a tela pede a época). */
export const TUT_ERAS5 = [1925, 1958, 1975, 1995, 2018] as const;
export const TUT_SEED5 = 'primeiro-selo';
const TUT_CITY5: Record<number, string> = { 1925: 'new_york', 1958: 'memphis', 1975: 'london', 1995: 'rio', 2018: 'sao_paulo' };
const BAND_GENRE5: Record<number, string> = { 1925: 'hot_jazz', 1958: 'rockabilly', 1975: 'punk', 1995: 'mangue', 2018: 'funk_carioca' };
export const tutScenarioId5 = (year: number): string => `tut5_first_${year}`;

// ---------------------------------------------------------------- progresso (no save, só depois de começar)

export type TutMode5 = 'guided' | 'hint';
export interface Tut5 {
  v: 1;
  mode: TutMode5;
  /** capítulo e passo atuais (índices do roteiro) */
  ch: number;
  st: number;
  /** capítulos concluídos / pulados (ids) */
  done: string[];
  skip: string[];
  /** retrato do mundo no começo do passo (condições "fez algo desde então") */
  base?: Record<string, number>;
  /** fim: diploma (roteiro todo), saiu, ou ainda correndo */
  end?: 'diploma' | 'exit';
  /** o mentor continua no telefone para dicas (até ser dispensado) */
  phone: boolean;
  /** banda roteirizada (id do ato) */
  band?: string;
  /** capítulo extra da carreira principal já entrou */
  extra?: string;
}
type X4 = { x4?: { tut5?: Tut5 } };
/** Progresso do tutorial nesta partida (undefined = partida sem tutorial; não cria nada). */
export const tut5Of = (s: GameState): Tut5 | undefined => (s as unknown as X4).x4?.tut5;
export const tutRunning5 = (s: GameState): boolean => { const t = tut5Of(s); return !!t && !t.end; };

/** Começa (ou recomeça) o tutorial nesta partida. Liga a navegação nova (o tutorial só existe nela). */
export function startTut5(s: GameState, mode: TutMode5 = 'guided'): Tut5 {
  const x = ((s as unknown as { x4?: Record<string, unknown> }).x4 ??= {});
  const old = x.tut5 as Tut5 | undefined;
  const t: Tut5 = { v: 1, mode, ch: 0, st: 0, done: [], skip: [], phone: false, band: old?.band ?? bandOf5(s) };
  x.tut5 = t;
  setSw(s, SW_NAV5, true);
  return t;
}
/** Sai do tutorial (o mentor fica no telefone se chegou ao diploma). */
export function endTut5(s: GameState, how: 'diploma' | 'exit'): void {
  const t = tut5Of(s);
  if (!t) return;
  t.end = how; t.phone = how === 'diploma'; t.base = undefined;
}
export function dismissMentor5(s: GameState): void { const t = tut5Of(s); if (t) t.phone = false; }

// ---------------------------------------------------------------- acontecimento roteirizado: a banda na recepção

const BAND_NAME5: Record<number, string> = { 1925: 'Os Batutas do Cais', 1958: 'Johnny Ray & The Sparks', 1975: 'The Lead Pipes', 1995: 'Mangue de Lata', 2018: 'Baile da Laje' };
const nearEra = (y: number): number => [...TUT_ERAS5].reduce((a, b) => (Math.abs(b - y) < Math.abs(a - y) ? b : a), TUT_ERAS5[0]);
/** Ato roteirizado já criado nesta partida (pela marca no ato). */
function bandOf5(s: GameState): string | undefined {
  return Object.values(s.acts).find((a) => (a as unknown as { tut5?: 1 }).tut5 === 1)?.id;
}

/** Cria a banda sem contrato na cidade do jogador e avisa na correspondência. Só em partida com `config.tut5`. */
export function tutBand5(s: GameState): string | undefined {
  if (!s.config.tut5) return undefined;
  const have = bandOf5(s);
  if (have) return have;
  const r = Rng.fromSeed(`tut5:${s.config.seed}`);
  const era = nearEra(s.year);
  const genre = BAND_GENRE5[era];
  let a;
  try { a = makeAct(s, r, { name: BAND_NAME5[era], genre, city: s.config.homeCity, members: 4, potential: 78, formed: s.year - 1, debutYear: s.year, fame: 8 }); }
  catch { a = makeAct(s, r, { name: BAND_NAME5[era], genre: 'pop', city: s.config.homeCity, members: 4, potential: 78, formed: s.year - 1, debutYear: s.year, fame: 8 }); }
  a.name = BAND_NAME5[era];
  a.owner = null;
  a.status = 'active';
  (a as unknown as { tut5?: 1 }).tut5 = 1;
  // chega com repertório (3 músicas prontas para gravar) e já conhecida pelo olheiro (aparece no fichário)
  composeSongs(s, r, a, 3);
  s.knowledge[a.id] = { actId: a.id, degree: 3, stage: 'investigating', bias: 0, updatedWeek: s.week, source: 'tut5' };
  emitFact(s, { kind: 'scenario', actors: [a.id], place: s.config.homeCity, severity: 30, visibility: 'public', tags: ['good'], src: 'tut5',
    text: fmtL(l('Tem uma banda na recepção: {n}. Querem gravar e ainda não têm gravadora.', 'There is a band at reception: {n}. They want to record and have no label yet.'), { n: a.name }) });
  return a.id;
}

registerSimHook('newgame', 'tut5', (s) => {
  if (!s.config.tut5) return; // partida sem tutorial: nada roteirizado
  const id = tutBand5(s);
  const t = startTut5(s, 'guided');
  t.band = id;
});

// ---------------------------------------------------------------- cenário "Primeiro selo" (um por época)

const ERA_L5: Record<number, L> = {
  1925: l('Nova York, 1925: o jazz toca nos rádios novos e os discos de 78 rotações vendem como nunca.', 'New York, 1925: jazz plays on the new radios and 78 rpm records sell like never before.'),
  1958: l('Memphis, 1958: o rock and roll mal nasceu e qualquer garagem pode virar estúdio.', 'Memphis, 1958: rock and roll is barely born and any garage can become a studio.'),
  1975: l('Londres, 1975: estúdios de 24 pistas, revistas de paradas e garotos com guitarras baratas.', 'London, 1975: 24-track studios, chart magazines and kids with cheap guitars.'),
  1995: l('Rio de Janeiro, 1995: CD no auge, rádio e TV mandam nas paradas.', 'Rio de Janeiro, 1995: the CD at its peak, radio and TV rule the charts.'),
  2018: l('São Paulo, 2018: streaming, redes sociais e bailes que viram sucesso da noite para o dia.', 'São Paulo, 2018: streaming, social media and street parties that become hits overnight.'),
};
export const TUT_SCENARIOS5: Scenario17[] = TUT_ERAS5.map((y) => ({
  id: tutScenarioId5(y), name: fmtL(l('Primeiro selo ({y})', 'First label ({y})'), { y }), startYear: y, endYear: y + 2, homeCity: TUT_CITY5[y], scenario: 'from_zero',
  desc: fmtL(l('{e} Um selo pequeno, um mentor experiente e uma banda batendo na porta. Aprenda a jogar fazendo.', '{e} A small label, an experienced mentor and a band knocking at the door. Learn to play by doing.'), { e: ERA_L5[y] }),
  goal: l('Termine o tutorial e lance o primeiro disco.', 'Finish the tutorial and release your first record.'), unit: l('discos lançados', 'records released'), tiers: [1, 2, 4],
  rules17: [l('Tutorial guiado: o mentor da época mostra cada parte da sede, da cidade e do mundo. Cada capítulo pode ser pulado.', 'Guided tutorial: the era mentor shows every part of the HQ, the city and the world. Every chapter can be skipped.'),
    l('No primeiro mês uma banda sem gravadora aparece na recepção.', 'In the first month a band with no label shows up at reception.'),
    l('Semente fixa: todo mundo que joga este cenário vê o mesmo começo.', 'Fixed seed: everyone who plays this scenario sees the same start.')],
  setup: (s) => { adjustCash(s, 1.2); },
  metric: (s) => Object.values(s.releases).filter((r) => r.owner === 'player').length, fail: insolvent,
}));
for (const d of TUT_SCENARIOS5) {
  if (!SCENARIOS17.some((x) => x.id === d.id)) SCENARIOS17.push(d);
  if (!scenarioById[d.id]) scenarioById[d.id] = d; // fora da lista geral SCENARIOS: a tela de Cenários mostra o cartão próprio (só com exp5.tut)
}
