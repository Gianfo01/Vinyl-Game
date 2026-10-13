// Rodada 29 (WIKI, bíblia) — FICHA DE JOGO de referência dos personagens reais: atributos (habilidades), talento inicial,
// potencial, traços, ambição, origem, personalidade (20 facetas e 12 valores da alma) e, no ato, potencial e fama.
// No jogo esses números são sorteados em cada partida (com faixas fixas pelo porte do artista). A wiki mostra a FICHA DE
// REFERÊNCIA: uma partida gerada com a semente fixa "wiki29", nomes reais, base enorme e "Vida real exata", começando no
// ano de estreia do artista — é exatamente o que o jogo sortearia nessa partida (mesmo código, nada copiado).
// Custo: ~0,5 s por ano de início, gerado só quando a página pede (cache dos últimos anos).

import { SKILLS, ambitionName, traitById, ORIGINS } from '../../data/people';
import { l } from '../../data/world';
import { defaultConfig } from '../../sim/bot';
import { createGame } from '../../sim/worldgen';
import { FACETS, FACET_TXT, VALUES, VALUE_TXT, soul } from '../../sim/sys/soul9';
import { ATTR13, ATTR13_IDS, per13 } from '../../sim/sys/persona13';
import { canonKey } from '../../sim/sys/realworld';
import type { GameState, Person } from '../../sim/types';
import { H, P, T, tx } from './wiki29core';
import type { Block29, Inline29 } from './wiki29types';

export const REF_SEED29 = 'wiki29';
const WORLDS = new Map<number, GameState>();
const MAX = 4;

/** Partida de referência que começa no ano `y` (semente fixa, nomes reais, base enorme, história exata). */
export function refWorld29(y: number): GameState {
  const year = Math.max(1889, Math.min(2026, Math.round(y)));
  const hit = WORLDS.get(year);
  if (hit) return hit;
  const cfg = defaultConfig(REF_SEED29, { startYear: year, realNames: true });
  (cfg as { dbSize?: string }).dbSize = 'huge';
  (cfg as { history?: string }).history = 'strict';
  const s = createGame(cfg);
  if (WORLDS.size >= MAX) WORLDS.delete(WORLDS.keys().next().value as number);
  WORLDS.set(year, s);
  return s;
}

/** Pessoa da partida de referência pelo nome real canônico. */
export function refPerson29(name: string, y: number): { s: GameState; p: Person } | null {
  const s = refWorld29(y);
  const k = canonKey(name);
  const p = Object.values(s.persons).find((x) => canonKey(x.name) === k);
  return p ? { s, p } : null;
}

const bar = (v: number): string => `${Math.round(v)} ${'▮'.repeat(Math.round(v / 10))}${'▯'.repeat(10 - Math.round(v / 10))}`;
const facetTxt = (k: (typeof FACETS)[number], v: number): string => `${Math.round(v)} — ${tx(v >= 60 ? FACET_TXT[k][2] : v <= 40 ? FACET_TXT[k][1] : l('equilibrado', 'balanced'))}`;

/** Faixas do sorteio (o que vale em QUALQUER partida), do código de realworld/makePerson. */
export function refRanges29(): Block29[] {
  return [H(T('Como o jogo sorteia (vale para toda partida)', 'How the game rolls it (any run)')), { k: 'ul', items: [
    [T('Potencial do ato real pelo porte: estrela global 90–99, grande nome 80–93, regional/cult 68–84. Cada integrante herda o potencial do ato.', 'Real act potential by stature: global star 90–99, big name 80–93, regional/cult 68–84. Each member inherits the act\'s potential.')],
    [T('Talento inicial: as habilidades nascem em torno de 66% do potencial (fração inicial 0,66), puxadas para a função (quem canta tem voz mais alta, quem toca tem instrumento mais alto).', 'Starting talent: skills start around 66% of potential (starting fraction 0.66), pulled toward the role (singers get higher voice, players higher instrument).')],
    [T('Quem entra numa partida anos depois da estreia já chega mais experiente: +2 por ano de carreira em cada habilidade (até +20), sem passar do potencial.', 'Whoever enters a run years after their debut arrives more experienced: +2 per career year in each skill (up to +20), never above potential.')],
    [T('Traços, ambição, origem e personalidade são sorteados pela semente; a alma (20 facetas e 12 valores) sai dos traços, da ambição, do objetivo e da persona.', 'Traits, ambition, origin and personality are rolled by the seed; the soul (20 facets and 12 values) comes from traits, ambition, goal and persona.')],
    [T('O potencial é OCULTO dentro do jogo: lá você só vê faixas que encolhem com o scouting (veja ', 'Potential is HIDDEN inside the game: there you only see ranges that shrink with scouting (see '), { link: 'mech:scouting', text: T('Descobrir talentos', 'Scouting') }, ').'],
  ] }];
}

/** Blocos da ficha de referência de uma pessoa real (ou aviso, se ela não entra nessa partida). */
export function refBlocks29(name: string, year: number): Block29[] {
  let r: { s: GameState; p: Person } | null = null;
  try { r = refPerson29(name, year); } catch { r = null; }
  if (!r) return [{ k: 'note', hue: 'muted', t: T('Sem ficha de referência', 'No reference sheet'), x: [T(`Esta pessoa não entra na partida de referência que começa em ${year} (base enorme). Ela pode entrar como substituta ou em outra base.`, `This person is not in the reference run starting in ${year} (huge database). They may enter as a replacement or in another database.`)] }];
  const { s, p } = r;
  const out: Block29[] = [];
  out.push({ k: 'note', hue: 'info', t: T('Ficha de jogo (referência)', 'Game sheet (reference)'), x: [T(`Partida de referência: semente "${REF_SEED29}", começando em ${s.config.startYear}, nomes reais, base enorme, Vida real exata. Em outra partida os números mudam dentro das faixas abaixo.`, `Reference run: seed "${REF_SEED29}", starting in ${s.config.startYear}, real names, huge database, exact real life. In another run the numbers change within the ranges below.`)] });
  const kv: [string, Inline29[]][] = [
    [T('Potencial (pico)', 'Potential (peak)'), [bar(p.potential)]],
    [T('Idade na partida', 'Age in the run'), [String(s.year - p.born)]],
    [T('Ambição', 'Ambition'), [tx(ambitionName[p.ambition] ?? l(p.ambition))]],
    [T('Origem', 'Origin'), [tx(ORIGINS.find((o) => o.id === p.origin)?.name ?? l(p.origin))]],
    [T('Traços', 'Traits'), [p.traits.map((x) => tx(traitById[x]?.name ?? l(x))).join(' · ') || '—']],
  ];
  if (p.goal) kv.push([T('Objetivo pessoal', 'Personal goal'), [p.goal]]);
  out.push({ k: 'kv', rows: kv });
  out.push(H(T('Talento inicial (habilidades 0–100)', 'Starting talent (skills 0–100)')), { k: 'kv', rows: SKILLS.map((k) => [tx(k.name), [bar(p.skills[k.id] ?? 0)]] as [string, Inline29[]]) });
  if (p.persona) out.push(H(T('Persona', 'Persona')), { k: 'kv', rows: Object.entries(p.persona).map(([k, v]) => [k, [bar(v)]] as [string, Inline29[]]) });
  try {
    const P13 = per13(s, `p:${p.id}`);
    if (P13) out.push(H(T('Atributos de ofício', 'Craft attributes')), { k: 'kv', rows: ATTR13_IDS.map((k) => [tx(ATTR13[k][0]), [bar(P13.attrs[k])]] as [string, Inline29[]]) });
  } catch { /* sem ficha unificada */ }
  try {
    const so = soul(s, p);
    out.push(H(T('Alma: personalidade (20 facetas)', 'Soul: personality (20 facets)')), { k: 'kv', rows: FACETS.map((k) => [tx(FACET_TXT[k][0]), [facetTxt(k, so.f[k])]] as [string, Inline29[]]) });
    out.push(H(T('Alma: valores', 'Soul: values')), { k: 'kv', rows: [...VALUES].sort((a, b) => so.v[b] - so.v[a]).map((k) => [tx(VALUE_TXT[k][0]), [bar(so.v[k])]] as [string, Inline29[]]) });
  } catch { /* sem alma */ }
  out.push(...refRanges29());
  return out;
}

/** Ficha de referência de um ato real: potencial, fama na estreia, fãs e integrantes nessa partida. */
export function refActBlocks29(name: string, year: number): Block29[] {
  let s: GameState;
  try { s = refWorld29(year); } catch { return []; }
  const k = canonKey(name);
  const a = Object.values(s.acts).find((x) => canonKey(x.name) === k);
  if (!a) return [{ k: 'note', hue: 'muted', t: T('Sem ficha de referência', 'No reference sheet'), x: [T(`Este artista não entra na partida de referência que começa em ${year} (base enorme).`, `This act is not in the reference run starting in ${year} (huge database).`)] }];
  const fans = a.fans.casual + a.fans.active + a.fans.core;
  return [
    { k: 'note', hue: 'info', t: T('Ficha de jogo (referência)', 'Game sheet (reference)'), x: [T(`Partida de referência: semente "${REF_SEED29}", começando em ${s.config.startYear}. Em outra partida os números mudam.`, `Reference run: seed "${REF_SEED29}", starting in ${s.config.startYear}. In another run the numbers change.`)] },
    { k: 'kv', rows: [
      [T('Potencial do ato (oculto no jogo)', 'Act potential (hidden in game)'), [bar(a.potential)]],
      [T('Fama no início', 'Fame at start'), [bar(a.fame)]], [T('Momento', 'Momentum'), [bar(a.momentum)]], [T('Posicionamento (underground → crossover)', 'Positioning (underground → crossover)'), [bar(a.positioning)]],
      [T('Fãs (casuais · ativos · núcleo)', 'Fans (casual · active · core)'), [`${Math.round(fans).toLocaleString()} (${Math.round(a.fans.casual).toLocaleString()} · ${Math.round(a.fans.active).toLocaleString()} · ${Math.round(a.fans.core).toLocaleString()})`]],
      [T('Fim de carreira previsto (oculto no jogo)', 'Planned career end (hidden in game)'), [String(a.careerEnd)]],
      [T('Contrato no início', 'Signed at start'), [a.owner && s.labels[a.owner] ? s.labels[a.owner].name : T('independente', 'independent')]],
      ...(a.image ? [[T('Imagem (artística · popularidade · profissionalismo · pública)', 'Image (artistic · popularity · professionalism · public)'), [`${Math.round(a.image.artistic)} · ${Math.round(a.image.popularity)} · ${Math.round(a.image.professionalism)} · ${Math.round(a.image.publicImage)}`]] as [string, Inline29[]]] : []),
    ] },
    ...(a.members.length ? [P(T('Formação nessa partida: ', 'Lineup in that run: '), a.members.map((m) => s.persons[m]?.name).filter(Boolean).join(', '))] : []),
  ];
}
